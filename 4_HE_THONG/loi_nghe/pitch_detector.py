"""
pitch_detector.py - Module phát hiện cao độ âm thanh thời gian thực
=======================================================================
Sử dụng PyAudio để thu âm từ microphone và phân tích cao độ bằng
phương pháp tự tương quan (autocorrelation). Hỗ trợ aubio nếu có.

Tác giả: HocSao Team
"""

import threading
import time
import math
import logging
from dataclasses import dataclass, field
from typing import Optional
from collections import deque

import numpy as np

# Thử import PyAudio - thư viện thu âm
try:
    import pyaudio
    PYAUDIO_AVAILABLE = True
except ImportError:
    PYAUDIO_AVAILABLE = False
    logging.warning("PyAudio không tìm thấy. Chạy: pip install pyaudio")

# Thử import aubio - thư viện phát hiện cao độ chuyên dụng
try:
    import aubio
    AUBIO_AVAILABLE = True
except ImportError:
    AUBIO_AVAILABLE = False
    logging.info("aubio không có, dùng autocorrelation thuần numpy.")

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Hằng số cấu hình âm thanh
# ---------------------------------------------------------------------------
SAMPLE_RATE = 16000          # Hz - tần số lấy mẫu
CHUNK_SIZE  = 1024           # Số mẫu mỗi lần đọc
CHANNELS    = 1              # Mono
FORMAT_PA   = None           # Sẽ gán khi PyAudio sẵn sàng

# Ngưỡng im lặng: RMS dưới giá trị này → không có âm (nhạy bén bắt được cả tiếng sáo thổi êm)
SILENCE_THRESHOLD = 0.0012

# Phạm vi tần số hợp lệ cho tiếng sáo trúc Việt Nam (Hz)
# Đô trầm (C4) ~ 261Hz, sáo trầm Tone G3 ~ 196Hz; nốt cao quãng 3 ~ 1500-2000Hz
PITCH_MIN_HZ = 180.0   # ~F3 / G3
PITCH_MAX_HZ = 2200.0  # ~C7

# ---------------------------------------------------------------------------
# Ánh xạ nốt nhạc: Tây → Việt
# ---------------------------------------------------------------------------
# Thứ tự nốt trong 1 quãng tám (12 bán cung) — chuẩn sáo trúc ưu tiên ký hiệu Bb (Si giáng)
NOTE_WESTERN = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "Bb", "B"]

# Tên nốt nhạc theo tiếng Việt (ký âm pháp Đô-Rê-Mi)
NOTE_VIET = {
    "C":  "Đô",
    "C#": "Đô#",
    "D":  "Rê",
    "D#": "Rê#",
    "E":  "Mi",
    "F":  "Fa",
    "F#": "Fa#",
    "G":  "Sol",
    "G#": "Sol#",
    "A":  "La",
    "Bb": "Si giáng",
    "A#": "Si giáng",
    "B":  "Si",
}


# ---------------------------------------------------------------------------
# Dataclass kết quả phát hiện cao độ
# ---------------------------------------------------------------------------
@dataclass
class PitchResult:
    """Kết quả phân tích cao độ cho một khung âm thanh."""
    pitch_hz: Optional[float]      # Tần số (Hz), None nếu im lặng
    note_viet: Optional[str]       # Tên nốt tiếng Việt (vd: "Sol")
    note_western: Optional[str]    # Tên nốt tiếng Anh (vd: "G")
    octave: Optional[int]          # Quãng tám (vd: 4)
    cent_offset: float             # Lệch cent so với nốt chuẩn (-50 đến +50)
    confidence: float              # Độ tin cậy (0.0 đến 1.0)
    rms: float                     # Mức năng lượng RMS của khung âm

    def to_dict(self) -> dict:
        """Chuyển sang dict để gửi qua WebSocket."""
        return {
            "hz":          self.pitch_hz,
            "note_viet":   self.note_viet,
            "note_western": self.note_western,
            "octave":      self.octave,
            "cent_offset": round(self.cent_offset, 1),
            "confidence":  round(self.confidence, 3),
            "rms":         round(self.rms, 4),
        }


# ---------------------------------------------------------------------------
# Hàm tiện ích: chuyển Hz → tên nốt
# ---------------------------------------------------------------------------
def hz_to_note(freq_hz: float) -> tuple[str, str, int, float]:
    """
    Chuyển tần số (Hz) thành tên nốt nhạc.

    Args:
        freq_hz: Tần số âm thanh (Hz)

    Returns:
        Tuple (note_western, note_viet, octave, cent_offset)
        cent_offset: số cent lệch so với nốt chuẩn gần nhất
    """
    if freq_hz <= 0:
        return "?", "?", 0, 0.0

    # MIDI note number: A4 = 440 Hz = MIDI 69
    midi_exact = 69.0 + 12.0 * math.log2(freq_hz / 440.0)
    midi_round = round(midi_exact)

    # Tính cent lệch: 100 cent = 1 bán cung
    cent_offset = (midi_exact - midi_round) * 100.0

    # Tính tên nốt và quãng tám
    # MIDI 0 = C-1, MIDI 60 = C4
    note_index = midi_round % 12          # 0=C, 1=C#, ..., 11=B
    octave     = (midi_round // 12) - 1   # Quãng tám theo chuẩn khoa học

    note_w = NOTE_WESTERN[note_index]
    note_v = NOTE_VIET.get(note_w, note_w)

    return note_w, note_v, octave, cent_offset


def compute_rms(audio: np.ndarray) -> float:
    """Tính RMS (Root Mean Square) - mức độ năng lượng âm thanh chuẩn hóa [0.0, 1.0]."""
    if audio.dtype == np.int16:
        samples = audio.astype(np.float32) / 32768.0
    else:
        samples = audio.astype(np.float32)
    return float(np.sqrt(np.mean(samples ** 2)))


# ---------------------------------------------------------------------------
# Thuật toán YIN (De Cheveigné & Kawahara, 2002) — Chuẩn vàng nhạc cụ hơi
# Loại bỏ triệt để hiện tượng nhảy quãng tám do họa âm bậc 2
# ---------------------------------------------------------------------------
def detect_pitch_yin(
    audio: np.ndarray,
    sample_rate: int,
    pitch_min_hz: float = PITCH_MIN_HZ,
    pitch_max_hz: float = PITCH_MAX_HZ,
    harmonic_threshold: float = 0.18,
) -> tuple[float, float]:
    """
    Phát hiện cao độ bằng phương pháp YIN tối ưu hóa cho sáo trúc Việt Nam.
    
    Các bước:
    1. Tính hàm sai khác (Difference function) qua FFT
    2. Chuẩn hóa trung bình tích lũy (Cumulative Mean Normalized Difference - CMNDF)
    3. Ngưỡng tuyệt đối: tìm cực tiểu đầu tiên dưới harmonic_threshold
    4. Nội suy Parabolic để đạt độ chuẩn xác từng cent
    """
    if audio.dtype == np.int16:
        x = audio.astype(np.float32) / 32768.0
    else:
        x = audio.astype(np.float32)

    n = len(x)
    if n < 256:
        return 0.0, 0.0

    # Phạm vi lag
    lag_min = max(2, int(sample_rate / pitch_max_hz))
    lag_max = min(n // 2, int(sample_rate / pitch_min_hz))
    if lag_min >= lag_max:
        return 0.0, 0.0

    w_len = n // 2
    x_w = x[:w_len]

    # Tính tương quan chéo qua FFT
    fft_size = 2 ** int(np.ceil(np.log2(n + w_len)))
    X = np.fft.rfft(x, n=fft_size)
    X_w = np.fft.rfft(x_w, n=fft_size)
    r = np.fft.irfft(X * np.conj(X_w), n=fft_size)[:lag_max + 1]

    # Năng lượng trượt (vectorized)
    energy = np.cumsum(x[:w_len + lag_max] ** 2)
    e0 = energy[w_len - 1]
    e_tau = np.zeros(lag_max + 1, dtype=np.float32)
    e_tau[0] = e0
    e_tau[1:lag_max + 1] = energy[w_len:w_len + lag_max] - energy[:lag_max]

    d = e0 + e_tau - 2.0 * r
    d[d < 0] = 0.0

    # CMNDF (Cumulative Mean Normalized Difference Function - vectorized)
    d_prime = np.ones(lag_max + 1, dtype=np.float32)
    d_slice = d[1:lag_max + 1]
    cum_sum = np.cumsum(d_slice)
    taus = np.arange(1, lag_max + 1, dtype=np.float32)
    running_mean = cum_sum / taus
    running_mean[running_mean == 0] = 1e-6
    d_prime[1:lag_max + 1] = d_slice / running_mean

    # Bước 3: Tìm cực tiểu đầu tiên dưới ngưỡng (chọn fundamental thay vì harmonic)
    best_tau = None
    for tau in range(lag_min, lag_max):
        if d_prime[tau] < harmonic_threshold:
            while tau + 1 < lag_max and d_prime[tau + 1] < d_prime[tau]:
                tau += 1
            best_tau = tau
            break

    # Nếu không có cực tiểu nào dưới ngưỡng 0.18, tìm cực tiểu toàn cục
    if best_tau is None:
        valid_range = d_prime[lag_min:lag_max]
        if len(valid_range) > 0:
            min_idx = int(np.argmin(valid_range))
            min_val = valid_range[min_idx]
            if min_val < 0.52:  # Ngưỡng chấp nhận được cho nốt sáo (hơi gió thổi)
                best_tau = lag_min + min_idx

    if best_tau is None or best_tau == 0:
        return 0.0, 0.0

    # Bước 4: Nội suy Parabolic
    tau_exact = float(best_tau)
    if 1 < best_tau < lag_max:
        s0 = d_prime[best_tau - 1]
        s1 = d_prime[best_tau]
        s2 = d_prime[best_tau + 1]
        denom = s0 - 2.0 * s1 + s2
        if denom != 0:
            delta = 0.5 * (s0 - s2) / denom
            if abs(delta) < 1.0:
                tau_exact += delta

    freq_hz = sample_rate / tau_exact
    confidence = max(0.0, min(1.0, 1.0 - float(d_prime[best_tau])))

    return freq_hz, confidence


def detect_pitch_autocorr(audio: np.ndarray, sample_rate: int) -> tuple[float, float]:
    """Sử dụng thuật toán YIN chuẩn xác thay cho autocorrelation đơn giản."""
    return detect_pitch_yin(audio, sample_rate)


# ---------------------------------------------------------------------------
# Lớp PitchDetector chính
# ---------------------------------------------------------------------------
class PitchDetector:
    """
    Phát hiện cao độ âm thanh thời gian thực từ microphone.

    Chạy trong background thread riêng để không chặn vòng lặp chính.
    Kết quả mới nhất có thể lấy bất kỳ lúc nào qua get_latest().

    Ví dụ:
        detector = PitchDetector()
        detector.start()
        # ... sau đó ...
        result = detector.get_latest()
        print(result.note_viet, result.cent_offset)
        detector.stop()
    """

    def __init__(
        self,
        device_index:       Optional[int] = None,
        sample_rate:        int           = SAMPLE_RATE,
        chunk_size:         int           = CHUNK_SIZE,
        silence_threshold:  float         = SILENCE_THRESHOLD,
        use_aubio:          bool          = True,
    ):
        """
        Khởi tạo PitchDetector.

        Args:
            device_index:      Index thiết bị âm thanh (None = mặc định)
            sample_rate:       Tần số lấy mẫu (Hz)
            chunk_size:        Kích thước mỗi khung âm (samples)
            silence_threshold: Ngưỡng RMS để phát hiện im lặng
            use_aubio:         Có dùng aubio không (nếu có cài đặt)
        """
        self.device_index      = device_index
        self.sample_rate       = sample_rate
        self.chunk_size        = chunk_size
        self.silence_threshold = silence_threshold

        # Quyết định dùng aubio hay autocorrelation
        self._use_aubio = use_aubio and AUBIO_AVAILABLE

        # Trạng thái nội bộ
        self._running      = False
        self._thread:      Optional[threading.Thread] = None
        self._pyaudio_inst = None
        self._stream       = None

        # Kết quả mới nhất (thread-safe qua Lock)
        self._lock         = threading.Lock()
        self._latest:      Optional[PitchResult] = None
        self._latest_chunk: Optional[np.ndarray] = None

        # Aubio objects (khởi tạo khi start)
        self._aubio_pitch  = None

        # Bộ đệm trượt 2048 mẫu (128ms tại 16kHz) để YIN luôn đủ chu kỳ phân tích ổn định
        self._sliding_buffer = np.zeros(2048, dtype=np.int16)

        # Lịch sử pitch để làm mượt (rolling buffer)
        self._history: deque = deque(maxlen=5)

        logger.info(
            "PitchDetector khởi tạo: sr=%d, chunk=%d, aubio=%s",
            sample_rate, chunk_size, self._use_aubio
        )

    # ------------------------------------------------------------------
    # API công khai
    # ------------------------------------------------------------------

    def start(self) -> bool:
        """
        Bắt đầu thu âm và phát hiện cao độ trong background thread.

        Returns:
            True nếu khởi động thành công, False nếu có lỗi.
        """
        if self._running:
            logger.warning("PitchDetector đã đang chạy.")
            return True

        if not PYAUDIO_AVAILABLE:
            logger.info("PyAudio không có sẵn, PitchDetector chuyển sang chế độ tiếp nhận âm thanh trực tiếp từ trình duyệt (Web Audio API).")
            self._running = True
            return True

        try:
            self._setup_audio()
            self._running = True
            self._thread  = threading.Thread(
                target=self._capture_loop,
                name="PitchDetector-Thread",
                daemon=True,  # Tự thoát khi main thread kết thúc
            )
            self._thread.start()
            logger.info("🎙️ PitchDetector đã khởi động.")
            return True
        except Exception as exc:
            logger.error("Lỗi khởi động PitchDetector: %s", exc)
            self._cleanup_audio()
            return False

    def stop(self):
        """Dừng thu âm và giải phóng tài nguyên."""
        self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=3.0)
        self._cleanup_audio()
        logger.info("🛑 PitchDetector đã dừng.")

    def get_latest(self) -> Optional[PitchResult]:
        """
        Lấy kết quả phân tích cao độ mới nhất.

        Returns:
            PitchResult hoặc None nếu chưa có dữ liệu.
        """
        with self._lock:
            return self._latest

    def get_latest_chunk(self) -> Optional[np.ndarray]:
        """
        Lấy audio chunk gần nhất dạng numpy array int16.

        Returns:
            np.ndarray hoặc None nếu chưa có dữ liệu.
        """
        with self._lock:
            return self._latest_chunk

    def process_chunk(self, audio_chunk: np.ndarray) -> PitchResult:
        """
        Phân tích trực tiếp một khung âm thanh (từ Web Audio API hoặc file).
        Tích lũy các gói âm thanh vào bộ đệm trượt 2048 mẫu (128ms) để YIN
        luôn có đầy đủ chu kỳ sóng và phân tích siêu ổn định.
        
        Args:
            audio_chunk: Mảng int16 chứa mẫu âm thanh
            
        Returns:
            PitchResult chứa kết quả phân tích
        """
        if len(audio_chunk) >= len(self._sliding_buffer):
            self._sliding_buffer = audio_chunk[-len(self._sliding_buffer):].copy()
        else:
            self._sliding_buffer = np.roll(self._sliding_buffer, -len(audio_chunk))
            self._sliding_buffer[-len(audio_chunk):] = audio_chunk

        chunk_rms = compute_rms(audio_chunk)
        result = self._analyze_chunk(self._sliding_buffer, current_chunk_rms=chunk_rms)
        with self._lock:
            self._latest = result
            self._latest_chunk = audio_chunk
        return result

    @property
    def is_running(self) -> bool:
        """Kiểm tra detector có đang chạy không."""
        return self._running

    # ------------------------------------------------------------------
    # Thiết lập âm thanh
    # ------------------------------------------------------------------

    def _setup_audio(self):
        """Khởi tạo PyAudio và mở stream âm thanh."""
        global FORMAT_PA
        self._pyaudio_inst = pyaudio.PyAudio()
        FORMAT_PA          = pyaudio.paInt16  # 16-bit integer

        self._stream = self._pyaudio_inst.open(
            format            = FORMAT_PA,
            channels          = CHANNELS,
            rate              = self.sample_rate,
            input             = True,
            input_device_index= self.device_index,
            frames_per_buffer = self.chunk_size,
        )

        # Khởi tạo aubio pitch tracker nếu dùng
        if self._use_aubio:
            self._aubio_pitch = aubio.pitch(
                method      = "yin",         # YIN algorithm - chính xác tốt
                buf_size    = self.chunk_size * 2,
                hop_size    = self.chunk_size,
                samplerate  = self.sample_rate,
            )
            self._aubio_pitch.set_unit("Hz")
            self._aubio_pitch.set_silence(-40)  # dB ngưỡng im lặng
            logger.info("aubio YIN pitch tracker đã khởi tạo.")

    def _cleanup_audio(self):
        """Đóng stream và giải phóng PyAudio."""
        try:
            if self._stream:
                self._stream.stop_stream()
                self._stream.close()
                self._stream = None
            if self._pyaudio_inst:
                self._pyaudio_inst.terminate()
                self._pyaudio_inst = None
        except Exception as exc:
            logger.error("Lỗi khi dọn dẹp audio: %s", exc)

    # ------------------------------------------------------------------
    # Vòng lặp thu âm (chạy trong thread riêng)
    # ------------------------------------------------------------------

    def _capture_loop(self):
        """
        Vòng lặp chính: liên tục đọc âm thanh từ microphone,
        phân tích cao độ và cập nhật kết quả mới nhất.
        """
        logger.debug("Bắt đầu vòng lặp thu âm...")

        while self._running:
            try:
                # Đọc khung âm thanh từ microphone
                raw_data = self._stream.read(
                    self.chunk_size,
                    exception_on_overflow=False,  # Bỏ qua tràn buffer
                )
                # Chuyển bytes → numpy array int16
                audio_chunk = np.frombuffer(raw_data, dtype=np.int16)

                # Phân tích và lưu kết quả
                result = self._analyze_chunk(audio_chunk)

                with self._lock:
                    self._latest = result
                    self._latest_chunk = audio_chunk

            except IOError as exc:
                # Stream bị ngắt tạm thời (ví dụ: thiết bị bị rút)
                logger.warning("IOError khi đọc audio: %s", exc)
                time.sleep(0.05)
            except Exception as exc:
                logger.error("Lỗi trong vòng lặp thu âm: %s", exc)
                time.sleep(0.1)

        logger.debug("Vòng lặp thu âm đã kết thúc.")

    def _analyze_chunk(self, audio_chunk: np.ndarray, current_chunk_rms: Optional[float] = None) -> PitchResult:
        """
        Phân tích một khung âm thanh để xác định cao độ bằng thuật toán YIN.

        Args:
            audio_chunk: Mảng int16 chứa dữ liệu âm thanh
            current_chunk_rms: RMS của gói âm thanh hiện tại (nếu có)

        Returns:
            PitchResult chứa thông tin cao độ
        """
        # Tính RMS để kiểm tra có tín hiệu không
        rms = current_chunk_rms if current_chunk_rms is not None else compute_rms(audio_chunk)

        # Im lặng: không phát hiện nốt
        if rms < self.silence_threshold:
            # Xóa nhẹ lịch sử khi im lặng để không bị vướng nốt cũ khi thổi nốt mới
            if len(self._history) > 0:
                self._history.popleft()
            return PitchResult(
                pitch_hz     = None,
                note_viet    = None,
                note_western = None,
                octave       = None,
                cent_offset  = 0.0,
                confidence   = 0.0,
                rms          = rms,
            )

        # Phát hiện cao độ bằng YIN hoặc aubio
        if self._use_aubio and self._aubio_pitch is not None:
            freq_hz, confidence = self._detect_aubio(audio_chunk)
        else:
            freq_hz, confidence = detect_pitch_yin(audio_chunk, self.sample_rate)

        # Kiểm tra tần số có hợp lệ cho sáo trúc không
        if freq_hz < PITCH_MIN_HZ or freq_hz > PITCH_MAX_HZ or confidence < 0.16:
            return PitchResult(
                pitch_hz     = None,
                note_viet    = None,
                note_western = None,
                octave       = None,
                cent_offset  = 0.0,
                confidence   = confidence,
                rms          = rms,
            )

        # Làm mượt tần số qua rolling median filter để loại bỏ gai nhiễu
        self._history.append(freq_hz)
        freq_smooth = float(np.median(list(self._history)))

        # Chuyển Hz → tên nốt
        note_w, note_v, octave, cent_offset = hz_to_note(freq_smooth)

        return PitchResult(
            pitch_hz     = round(freq_smooth, 2),
            note_viet    = note_v,
            note_western = note_w,
            octave       = octave,
            cent_offset  = round(cent_offset, 1),
            confidence   = round(confidence, 3),
            rms          = round(rms, 4),
        )

    def _detect_aubio(self, audio_chunk: np.ndarray) -> tuple[float, float]:
        """
        Phát hiện cao độ bằng thư viện aubio (YIN algorithm).

        Args:
            audio_chunk: Dữ liệu âm thanh int16

        Returns:
            (freq_hz, confidence)
        """
        # aubio cần float32 trong [-1.0, 1.0]
        samples  = audio_chunk.astype(np.float32) / 32768.0
        freq_hz  = float(self._aubio_pitch(samples)[0])
        confidence = float(self._aubio_pitch.get_confidence())

        return freq_hz, confidence
