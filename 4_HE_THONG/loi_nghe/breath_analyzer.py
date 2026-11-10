"""
breath_analyzer.py - Module phân tích hơi thổi tiếng sáo
==========================================================
Đánh giá chất lượng hơi thổi: mức độ, sự đều đặn, và phát hiện
kỹ thuật rung hơi (vibrato) dựa trên biến điệu biên độ theo chu kỳ.

Tác giả: HocSao Team
"""

import logging
from collections import deque
from typing import Optional

import numpy as np
try:
    from scipy import signal as scipy_signal
except ImportError:
    scipy_signal = None

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Hằng số phân tích hơi thổi
# ---------------------------------------------------------------------------

# Số khung lưu lịch sử để tính sự đều đặn
HISTORY_FRAMES = 10

# Ngưỡng RMS: dưới ngưỡng này coi như không thổi (hạ thấp để nhạy bén)
BREATH_RMS_THRESHOLD = 0.003

# RMS tối đa tham chiếu để chuẩn hóa về [0, 1]
RMS_REFERENCE_MAX = 0.5

# Tần số lấy mẫu (phải khớp với PitchDetector)
SAMPLE_RATE = 16000

# Phạm vi tần số rung hơi (vibrato): 4-7 Hz là tự nhiên
VIBRATO_FREQ_MIN = 4.0   # Hz
VIBRATO_FREQ_MAX = 7.0   # Hz

# Ngưỡng biên độ vibrato để xác nhận có rung (tương đối so với mean RMS)
VIBRATO_AMPLITUDE_THRESHOLD = 0.05

# Hệ số làm mượt cho RMS (exponential moving average)
EMA_ALPHA = 0.3


# ---------------------------------------------------------------------------
# Lớp BreathAnalyzer
# ---------------------------------------------------------------------------
class BreathAnalyzer:
    """
    Phân tích hơi thổi từng khung âm thanh.

    Theo dõi:
    - Mức độ hơi (RMS energy)
    - Sự đều đặn của hơi (variance qua nhiều khung)
    - Phát hiện kỹ thuật rung hơi (vibrato)
    - Thời gian thổi liên tục

    Ví dụ:
        analyzer = BreathAnalyzer(sample_rate=16000)
        result   = analyzer.analyze(audio_chunk)
        print(result['is_breathing'], result['vibrato_detected'])
    """

    def __init__(self, sample_rate: int = SAMPLE_RATE):
        """
        Khởi tạo BreathAnalyzer.

        Args:
            sample_rate: Tần số lấy mẫu (Hz), phải khớp với nguồn audio
        """
        self.sample_rate = sample_rate

        # Hàng đợi lưu lịch sử RMS để tính sự đều đặn
        self._rms_history: deque = deque(maxlen=HISTORY_FRAMES)

        # Lịch sử RMS theo thời gian để phân tích vibrato
        # Cần đủ điểm để FFT có độ phân giải tần số tốt
        # Với 100ms/khung, 50 khung = 5 giây → độ phân giải 0.2 Hz
        self._rms_time_series: deque = deque(maxlen=50)

        # Thời gian bắt đầu thổi hơi (để đo thời lượng)
        self._breath_start_time: Optional[float] = None
        self._breath_duration: float = 0.0

        # EMA của RMS để theo dõi trạng thái thổi/không thổi mượt hơn
        self._ema_rms: float = 0.0

        # Chunk duration (giây)
        self._chunk_duration: float = 1024.0 / sample_rate  # Mặc định, cập nhật khi analyze()

        logger.debug("BreathAnalyzer khởi tạo, sample_rate=%d", sample_rate)

    # ------------------------------------------------------------------
    # API công khai
    # ------------------------------------------------------------------

    def analyze(self, audio_chunk: np.ndarray) -> dict:
        """
        Phân tích một khung âm thanh để đánh giá hơi thổi.

        Args:
            audio_chunk: Mảng numpy (int16 hoặc float32) chứa âm thanh

        Returns:
            dict với các trường:
            - rms (float):              Mức RMS thô [0.0, ~0.5]
            - rms_normalized (float):   RMS chuẩn hóa [0.0, 1.0]
            - is_breathing (bool):      Có đang thổi không
            - breath_steady (bool):     Hơi có đều không
            - breath_duration (float):  Thời gian thổi liên tục (giây)
            - vibrato_detected (bool):  Có rung hơi không
            - vibrato_rate_hz (float):  Tần số rung hơi (Hz), 0.0 nếu không có
        """
        # Cập nhật độ dài chunk
        self._chunk_duration = len(audio_chunk) / self.sample_rate

        # Bước 1: Tính RMS của khung hiện tại
        rms = self._compute_rms(audio_chunk)

        # Bước 2: Cập nhật EMA để làm mượt quyết định thổi/không thổi
        self._ema_rms = EMA_ALPHA * rms + (1.0 - EMA_ALPHA) * self._ema_rms

        # Bước 3: Xác định có đang thổi không
        is_breathing = self._ema_rms >= BREATH_RMS_THRESHOLD

        # Bước 4: Cập nhật thời gian thổi liên tục
        breath_duration = self._update_breath_duration(is_breathing)

        # Bước 5: Lưu vào lịch sử
        self._rms_history.append(rms)
        self._rms_time_series.append(rms)

        # Bước 6: Tính sự đều đặn của hơi
        breath_steady = self._check_breath_steady()

        # Bước 7: Phát hiện vibrato (rung hơi)
        vibrato_detected, vibrato_rate = self._detect_vibrato()

        # Bước 8: Chuẩn hóa RMS về [0, 1]
        rms_normalized = min(1.0, rms / RMS_REFERENCE_MAX)

        return {
            "rms":              round(float(rms), 5),
            "rms_normalized":   round(float(rms_normalized), 4),
            "is_breathing":     bool(is_breathing),
            "breath_steady":    bool(breath_steady),
            "breath_duration":  round(float(breath_duration), 2),
            "vibrato_detected": bool(vibrato_detected),
            "vibrato_rate_hz":  round(float(vibrato_rate), 2),
        }

    def reset(self):
        """Đặt lại trạng thái phân tích (ví dụ: bắt đầu bài luyện mới)."""
        self._rms_history.clear()
        self._rms_time_series.clear()
        self._breath_start_time = None
        self._breath_duration   = 0.0
        self._ema_rms           = 0.0
        logger.debug("BreathAnalyzer đã reset.")

    # ------------------------------------------------------------------
    # Phương thức nội bộ
    # ------------------------------------------------------------------

    @staticmethod
    def _compute_rms(audio_chunk: np.ndarray) -> float:
        """
        Tính Root Mean Square (RMS) của tín hiệu âm thanh.

        RMS đại diện cho mức năng lượng trung bình – tỷ lệ thuận
        với "độ mạnh" của hơi thổi.
        """
        if audio_chunk.dtype == np.int16:
            samples = audio_chunk.astype(np.float32) / 32768.0
        else:
            samples = audio_chunk.astype(np.float32)

        return float(np.sqrt(np.mean(samples ** 2)))

    def _update_breath_duration(self, is_breathing: bool) -> float:
        """
        Cập nhật và trả về thời gian thổi hơi liên tục hiện tại.

        Args:
            is_breathing: Có đang thổi không (ở khung hiện tại)

        Returns:
            Số giây đã thổi liên tục (0.0 nếu dừng thổi)
        """
        import time  # Import nội bộ để tránh circular import

        if is_breathing:
            if self._breath_start_time is None:
                # Bắt đầu đếm thời gian thổi mới
                self._breath_start_time = time.monotonic()
            self._breath_duration = time.monotonic() - self._breath_start_time
        else:
            # Dừng thổi: đặt lại bộ đếm
            self._breath_start_time = None
            self._breath_duration   = 0.0

        return self._breath_duration

    def _check_breath_steady(self) -> bool:
        """
        Kiểm tra hơi thổi có đều đặn không dựa trên variance của RMS.

        Hơi đều: coefficient of variation (CV) thấp.
        CV = std / mean < ngưỡng

        Returns:
            True nếu hơi đều, False nếu hơi run hay không đều.
        """
        if len(self._rms_history) < 3:
            # Chưa đủ dữ liệu để đánh giá
            return True

        rms_arr = np.array(list(self._rms_history), dtype=np.float32)

        # Chỉ đánh giá khi đang thổi
        if np.mean(rms_arr) < BREATH_RMS_THRESHOLD:
            return True  # Không thổi thì coi như ổn

        mean_rms = np.mean(rms_arr)
        std_rms  = np.std(rms_arr)

        # Coefficient of variation: tỷ lệ độ lệch chuẩn / trung bình
        cv = std_rms / mean_rms if mean_rms > 0 else 0.0

        # CV < 0.3 (30%) → hơi tương đối đều
        return cv < 0.3

    def _detect_vibrato(self) -> tuple[bool, float]:
        """
        Phát hiện kỹ thuật rung hơi (vibrato) bằng phân tích phổ tần số
        của chuỗi thời gian RMS.

        Vibrato là sự biến điệu biên độ có chu kỳ ở tần số 4-7 Hz.
        Chúng ta phân tích FFT của chuỗi RMS theo thời gian.

        Returns:
            (vibrato_detected, vibrato_rate_hz)
            vibrato_rate_hz = 0.0 nếu không phát hiện
        """
        # Cần đủ điểm dữ liệu để phân tích có ý nghĩa
        min_points = max(16, int(VIBRATO_FREQ_MAX * 2 / (1.0 / self._chunk_duration)))
        if len(self._rms_time_series) < min_points:
            return False, 0.0

        rms_series = np.array(list(self._rms_time_series), dtype=np.float32)

        # Chỉ phân tích khi đang thổi (loại bỏ im lặng)
        if np.mean(rms_series) < BREATH_RMS_THRESHOLD:
            return False, 0.0

        # Trừ đường trung bình (DC component) để chỉ xem biến động
        rms_detrended = rms_series - np.mean(rms_series)

        # Tần số lấy mẫu của chuỗi RMS (mỗi khung = 1 điểm)
        fps = 1.0 / self._chunk_duration  # Frames per second (~15.6 fps cho chunk=1024, sr=16000)

        # Tính FFT
        n       = len(rms_detrended)
        freqs   = np.fft.rfftfreq(n, d=1.0 / fps)
        magnitudes = np.abs(np.fft.rfft(rms_detrended * np.hanning(n)))

        # Tìm đỉnh trong dải vibrato (4-7 Hz)
        vibrato_mask = (freqs >= VIBRATO_FREQ_MIN) & (freqs <= VIBRATO_FREQ_MAX)

        if not np.any(vibrato_mask):
            return False, 0.0

        vibrato_mags = magnitudes[vibrato_mask]
        vibrato_freqs = freqs[vibrato_mask]

        # Tìm tần số có biên độ lớn nhất trong dải vibrato
        peak_idx        = int(np.argmax(vibrato_mags))
        peak_magnitude  = vibrato_mags[peak_idx]
        peak_freq       = vibrato_freqs[peak_idx]

        # Tổng biên độ nền (ngoài dải vibrato)
        noise_mask      = ~vibrato_mask
        noise_mean      = np.mean(magnitudes[noise_mask]) if np.any(noise_mask) else 1e-10
        noise_mean      = max(noise_mean, 1e-10)

        # Tỷ lệ SNR: đỉnh vibrato so với nền
        snr = peak_magnitude / noise_mean

        # Biên độ vibrato tương đối so với mean RMS
        mean_rms = np.mean(rms_series)
        relative_amplitude = peak_magnitude / (n / 2) / mean_rms if mean_rms > 0 else 0

        # Xác nhận vibrato khi: SNR > 3 VÀ biên độ tương đối đủ lớn
        vibrato_detected = (snr > 3.0) and (relative_amplitude > VIBRATO_AMPLITUDE_THRESHOLD)

        return vibrato_detected, float(peak_freq) if vibrato_detected else 0.0
