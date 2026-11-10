"""
scorer.py - Module chấm điểm luyện tập tiếng sáo
==================================================
Tính điểm từng khung thời gian và tổng kết phiên luyện tập.
Thang điểm 0-100, xếp loại S/A/B/C/F.

Tác giả: HocSao Team
"""

import logging
import time
import math
from collections import deque
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Hằng số chấm điểm
# ---------------------------------------------------------------------------

# Trọng số tính điểm tổng (phiên bản MVP, chưa có camera tư thế)
WEIGHT_PITCH  = 0.6   # 60% điểm cao độ
WEIGHT_BREATH = 0.4   # 40% điểm hơi thổi

# Giới hạn số khung lưu trong lịch sử phiên
MAX_HISTORY = 300

# Ngưỡng cent để tính điểm cao độ
CENT_PERFECT = 10.0   # Dưới ngưỡng này: điểm tối đa
CENT_ZERO    = 50.0   # Trên ngưỡng này: điểm bằng 0

# Phân bổ điểm hơi thổi
BREATH_SCORE_IS_BREATHING  = 50   # Có thổi hơi
BREATH_SCORE_STEADY        = 30   # Hơi đều
BREATH_SCORE_RMS_IN_RANGE  = 20   # RMS trong vùng mục tiêu

# Ngưỡng RMS mặc định cho mục tiêu
DEFAULT_RMS_MIN = 0.02
DEFAULT_RMS_MAX = 0.40

# Bảng xếp loại
GRADE_TABLE = [
    (95, "S"),
    (80, "A"),
    (60, "B"),
    (40, "C"),
    (0,  "F"),
]


ENHARMONIC_EQUIVALENTS = {
    "sib": "la#",
    "si giáng": "la#",
    "si giang": "la#",
    "bb": "la#",
    "a#": "la#",
    "la thăng": "la#",
    "la thang": "la#",
    "đô2": "đô",
    "do2": "đô",
    "đô 2": "đô",
    "do 2": "đô",
    "đô1": "đô",
    "do1": "đô",
    "đô 1": "đô",
    "do 1": "đô",
    "rê1": "rê",
    "re1": "rê",
    "rê 1": "rê",
    "mi1": "mi",
    "mi 1": "mi",
    "fa1": "fa",
    "fa 1": "fa",
    "sol1": "sol",
    "sol 1": "sol",
    "la1": "la",
    "la 1": "la",
    "si1": "si",
    "si 1": "si",
}

def normalize_flute_note(note_str: Optional[str]) -> str:
    if not note_str:
        return ""
    base = note_str.split("(")[0].strip().lower()
    return ENHARMONIC_EQUIVALENTS.get(base, base)


TARGET_SPECS = {
    # --- Quãng 1 (Octave 4) ---
    "đô":       {"base": "đô", "target_hz": 261.63, "octave": 4},
    "đô 1":     {"base": "đô", "target_hz": 261.63, "octave": 4},
    "đô1":      {"base": "đô", "target_hz": 261.63, "octave": 4},
    "do":       {"base": "đô", "target_hz": 261.63, "octave": 4},
    "do 1":     {"base": "đô", "target_hz": 261.63, "octave": 4},
    "do1":      {"base": "đô", "target_hz": 261.63, "octave": 4},
    "c4":       {"base": "đô", "target_hz": 261.63, "octave": 4},

    "đô# 1":    {"base": "đô#", "target_hz": 277.18, "octave": 4},
    "do# 1":    {"base": "đô#", "target_hz": 277.18, "octave": 4},
    "c#4":      {"base": "đô#", "target_hz": 277.18, "octave": 4},

    "rê":       {"base": "rê", "target_hz": 293.66, "octave": 4},
    "rê 1":     {"base": "rê", "target_hz": 293.66, "octave": 4},
    "rê1":      {"base": "rê", "target_hz": 293.66, "octave": 4},
    "re":       {"base": "rê", "target_hz": 293.66, "octave": 4},
    "re 1":     {"base": "rê", "target_hz": 293.66, "octave": 4},
    "re1":      {"base": "rê", "target_hz": 293.66, "octave": 4},
    "d4":       {"base": "rê", "target_hz": 293.66, "octave": 4},

    "mi":       {"base": "mi", "target_hz": 329.63, "octave": 4},
    "mi 1":     {"base": "mi", "target_hz": 329.63, "octave": 4},
    "mi1":      {"base": "mi", "target_hz": 329.63, "octave": 4},
    "e4":       {"base": "mi", "target_hz": 329.63, "octave": 4},

    "fa":       {"base": "fa", "target_hz": 349.23, "octave": 4},
    "fa 1":     {"base": "fa", "target_hz": 349.23, "octave": 4},
    "fa1":      {"base": "fa", "target_hz": 349.23, "octave": 4},
    "f4":       {"base": "fa", "target_hz": 349.23, "octave": 4},

    "fa#":      {"base": "fa#", "target_hz": 369.99, "octave": 4},
    "fa# 1":    {"base": "fa#", "target_hz": 369.99, "octave": 4},
    "fa#1":     {"base": "fa#", "target_hz": 369.99, "octave": 4},
    "f#4":      {"base": "fa#", "target_hz": 369.99, "octave": 4},

    "sol":      {"base": "sol", "target_hz": 392.00, "octave": 4},
    "sol 1":    {"base": "sol", "target_hz": 392.00, "octave": 4},
    "sol1":     {"base": "sol", "target_hz": 392.00, "octave": 4},
    "g4":       {"base": "sol", "target_hz": 392.00, "octave": 4},

    "sol#":     {"base": "sol#", "target_hz": 415.30, "octave": 4},
    "sol# 1":   {"base": "sol#", "target_hz": 415.30, "octave": 4},
    "g#4":      {"base": "sol#", "target_hz": 415.30, "octave": 4},

    "la":       {"base": "la", "target_hz": 440.00, "octave": 4},
    "la 1":     {"base": "la", "target_hz": 440.00, "octave": 4},
    "la1":      {"base": "la", "target_hz": 440.00, "octave": 4},
    "a4":       {"base": "la", "target_hz": 440.00, "octave": 4},

    "sib":      {"base": "la#", "target_hz": 466.16, "octave": 4},
    "sib 1":    {"base": "la#", "target_hz": 466.16, "octave": 4},
    "sib1":     {"base": "la#", "target_hz": 466.16, "octave": 4},
    "si giáng": {"base": "la#", "target_hz": 466.16, "octave": 4},
    "si giáng 1":{"base": "la#", "target_hz": 466.16, "octave": 4},
    "si giang": {"base": "la#", "target_hz": 466.16, "octave": 4},
    "si giang 1":{"base": "la#", "target_hz": 466.16, "octave": 4},
    "la#":      {"base": "la#", "target_hz": 466.16, "octave": 4},
    "la# 1":    {"base": "la#", "target_hz": 466.16, "octave": 4},
    "bb4":      {"base": "la#", "target_hz": 466.16, "octave": 4},

    "si":       {"base": "si", "target_hz": 493.88, "octave": 4},
    "si 1":     {"base": "si", "target_hz": 493.88, "octave": 4},
    "si1":      {"base": "si", "target_hz": 493.88, "octave": 4},
    "b4":       {"base": "si", "target_hz": 493.88, "octave": 4},

    # --- Quãng 2 (Octave 5) ---
    "đô 2":     {"base": "đô", "target_hz": 523.25, "octave": 5},
    "đô2":      {"base": "đô", "target_hz": 523.25, "octave": 5},
    "do 2":     {"base": "đô", "target_hz": 523.25, "octave": 5},
    "do2":      {"base": "đô", "target_hz": 523.25, "octave": 5},
    "c5":       {"base": "đô", "target_hz": 523.25, "octave": 5},

    "đô# 2":    {"base": "đô#", "target_hz": 554.37, "octave": 5},
    "c#5":      {"base": "đô#", "target_hz": 554.37, "octave": 5},

    "rê 2":     {"base": "rê", "target_hz": 587.33, "octave": 5},
    "rê2":      {"base": "rê", "target_hz": 587.33, "octave": 5},
    "re 2":     {"base": "rê", "target_hz": 587.33, "octave": 5},
    "re2":      {"base": "rê", "target_hz": 587.33, "octave": 5},
    "d5":       {"base": "rê", "target_hz": 587.33, "octave": 5},

    "mi 2":     {"base": "mi", "target_hz": 659.25, "octave": 5},
    "mi2":      {"base": "mi", "target_hz": 659.25, "octave": 5},
    "e5":       {"base": "mi", "target_hz": 659.25, "octave": 5},

    "fa 2":     {"base": "fa", "target_hz": 698.46, "octave": 5},
    "fa2":      {"base": "fa", "target_hz": 698.46, "octave": 5},
    "f5":       {"base": "fa", "target_hz": 698.46, "octave": 5},

    "fa# 2":    {"base": "fa#", "target_hz": 739.99, "octave": 5},
    "fa#2":     {"base": "fa#", "target_hz": 739.99, "octave": 5},
    "f#5":      {"base": "fa#", "target_hz": 739.99, "octave": 5},

    "sol 2":    {"base": "sol", "target_hz": 783.99, "octave": 5},
    "sol2":     {"base": "sol", "target_hz": 783.99, "octave": 5},
    "g5":       {"base": "sol", "target_hz": 783.99, "octave": 5},

    "sol# 2":   {"base": "sol#", "target_hz": 830.61, "octave": 5},
    "g#5":      {"base": "sol#", "target_hz": 830.61, "octave": 5},

    "la 2":     {"base": "la", "target_hz": 880.00, "octave": 5},
    "la2":      {"base": "la", "target_hz": 880.00, "octave": 5},
    "a5":       {"base": "la", "target_hz": 880.00, "octave": 5},

    "sib 2":    {"base": "la#", "target_hz": 932.33, "octave": 5},
    "si giáng 2":{"base": "la#", "target_hz": 932.33, "octave": 5},
    "si giang 2":{"base": "la#", "target_hz": 932.33, "octave": 5},
    "la# 2":    {"base": "la#", "target_hz": 932.33, "octave": 5},
    "bb5":      {"base": "la#", "target_hz": 932.33, "octave": 5},

    "si 2":     {"base": "si", "target_hz": 987.77, "octave": 5},
    "si2":      {"base": "si", "target_hz": 987.77, "octave": 5},
    "b5":       {"base": "si", "target_hz": 987.77, "octave": 5},

    # --- Quãng 3 (Octave 6) ---
    "đô 3":     {"base": "đô", "target_hz": 1046.50, "octave": 6},
    "đô3":      {"base": "đô", "target_hz": 1046.50, "octave": 6},
    "do 3":     {"base": "đô", "target_hz": 1046.50, "octave": 6},
    "c6":       {"base": "đô", "target_hz": 1046.50, "octave": 6},
    "rê 3":     {"base": "rê", "target_hz": 1174.66, "octave": 6},
    "d6":       {"base": "rê", "target_hz": 1174.66, "octave": 6},
    "mi 3":     {"base": "mi", "target_hz": 1318.51, "octave": 6},
    "e6":       {"base": "mi", "target_hz": 1318.51, "octave": 6},
    "fa 3":     {"base": "fa", "target_hz": 1396.91, "octave": 6},
    "f6":       {"base": "fa", "target_hz": 1396.91, "octave": 6},
    "sol 3":    {"base": "sol", "target_hz": 1567.98, "octave": 6},
    "g6":       {"base": "sol", "target_hz": 1567.98, "octave": 6},
}

FLUTE_TONE_TARGET_SPECS = {
    "C": {
        "đô": 523.25, "đô 1": 523.25, "rê": 587.33, "rê 1": 587.33, "mi": 659.25, "mi 1": 659.25,
        "fa": 698.46, "fa 1": 698.46, "sol": 783.99, "sol 1": 783.99, "la": 880.00, "la 1": 880.00,
        "si": 987.77, "si 1": 987.77, "sib": 932.33, "si giáng": 932.33, "đô 2": 1046.50
    },
    "A": {
        "đô": 440.00, "đô 1": 440.00, "rê": 493.88, "rê 1": 493.88, "mi": 554.37, "mi 1": 554.37,
        "fa": 587.33, "fa 1": 587.33, "sol": 659.25, "sol 1": 659.25, "la": 739.99, "la 1": 739.99,
        "si": 830.61, "si 1": 830.61, "sib": 783.99, "si giáng": 783.99, "đô 2": 880.00
    },
    "G": {
        "đô": 392.00, "đô 1": 392.00, "rê": 440.00, "rê 1": 440.00, "mi": 493.88, "mi 1": 493.88,
        "fa": 523.25, "fa 1": 523.25, "sol": 587.33, "sol 1": 587.33, "la": 659.25, "la 1": 659.25,
        "si": 739.99, "si 1": 739.99, "sib": 698.46, "si giáng": 698.46, "đô 2": 783.99
    },
    "D": {
        "đô": 587.33, "đô 1": 587.33, "rê": 659.25, "rê 1": 659.25, "mi": 739.99, "mi 1": 739.99,
        "fa": 783.99, "fa 1": 783.99, "sol": 880.00, "sol 1": 880.00, "la": 987.77, "la 1": 987.77,
        "si": 1108.73, "si 1": 1108.73, "sib": 1046.50, "si giáng": 1046.50, "đô 2": 1174.66
    },
    "B": {
        "đô": 493.88, "đô 1": 493.88, "rê": 554.37, "rê 1": 554.37, "mi": 622.25, "mi 1": 622.25,
        "fa": 659.25, "fa 1": 659.25, "sol": 739.99, "sol 1": 739.99, "la": 830.61, "la 1": 830.61,
        "si": 932.33, "si 1": 932.33, "sib": 880.00, "si giáng": 880.00, "đô 2": 987.77
    },
    "Bb": {
        "đô": 466.16, "đô 1": 466.16, "rê": 523.25, "rê 1": 523.25, "mi": 587.33, "mi 1": 587.33,
        "fa": 622.25, "fa 1": 622.25, "sol": 698.46, "sol 1": 698.46, "la": 783.99, "la 1": 783.99,
        "si": 880.00, "si 1": 880.00, "sib": 830.61, "si giáng": 830.61, "đô 2": 932.33
    },
    "F": {
        "đô": 349.23, "đô 1": 349.23, "rê": 392.00, "rê 1": 392.00, "mi": 440.00, "mi 1": 440.00,
        "fa": 466.16, "fa 1": 466.16, "sol": 523.25, "sol 1": 523.25, "la": 587.33, "la 1": 587.33,
        "si": 659.25, "si 1": 659.25, "sib": 622.25, "si giáng": 622.25, "đô 2": 698.46
    }
}


# ---------------------------------------------------------------------------
# Lớp Scorer
# ---------------------------------------------------------------------------
class Scorer:
    """
    Chấm điểm phiên luyện tập tiếng sáo.

    Theo dõi từng khung thời gian (frame) và tổng kết phiên.
    Giữ lịch sử 300 frame gần nhất để tính thống kê.

    Ví dụ:
        scorer = Scorer()
        scorer.start_session()

        # Trong vòng lặp WebSocket (mỗi 100ms):
        frame_score = scorer.score_frame(pitch_data, breath_data, "Sol")

        # Khi kết thúc:
        summary = scorer.end_session()
    """

    def __init__(self, cent_perfect: float = 15.0, cent_zero: float = 45.0):
        """Khởi tạo Scorer với lịch sử trống và ngưỡng dung sai động."""
        self.cent_perfect = float(cent_perfect)
        self.cent_zero    = float(cent_zero)

        # Lịch sử điểm (rolling buffer cho biểu đồ)
        self._pitch_scores:  deque = deque(maxlen=MAX_HISTORY)
        self._breath_scores: deque = deque(maxlen=MAX_HISTORY)
        self._total_scores:  deque = deque(maxlen=MAX_HISTORY)

        # Thống kê tích lũy toàn phiên (không bị giới hạn 300 frame)
        self._session_pitch_sum  = 0.0
        self._session_breath_sum = 0.0
        self._session_total_sum  = 0.0
        self._session_valid_frames = 0

        # Lịch sử nốt nhạc để tìm nốt tốt nhất/tệ nhất
        self._note_scores: deque = deque(maxlen=MAX_HISTORY)

        # Thời gian phiên
        self._session_start: Optional[float] = None
        self._frame_count   = 0

        logger.debug("Scorer đã khởi tạo (cent_perfect=%.1f, cent_zero=%.1f).", self.cent_perfect, self.cent_zero)

    def set_tolerance(self, cent_perfect: float, cent_zero: float):
        """Cập nhật dung sai cao độ động từ cấu hình người dùng."""
        self.cent_perfect = float(cent_perfect)
        self.cent_zero    = float(cent_zero)

    # ------------------------------------------------------------------
    # Quản lý phiên luyện tập
    # ------------------------------------------------------------------

    def start_session(self):
        """Bắt đầu phiên luyện tập mới, đặt lại toàn bộ lịch sử."""
        self._pitch_scores.clear()
        self._breath_scores.clear()
        self._total_scores.clear()
        self._note_scores.clear()
        self._session_pitch_sum    = 0.0
        self._session_breath_sum   = 0.0
        self._session_total_sum    = 0.0
        self._session_valid_frames = 0
        self._session_start = time.monotonic()
        self._frame_count   = 0
        logger.info("🎯 Phiên luyện tập mới đã bắt đầu.")

    def end_session(self) -> dict:
        """
        Kết thúc phiên và trả về tổng kết chi tiết.

        Returns:
            dict với các trường:
            - duration_sec (float):    Thời gian phiên (giây)
            - total_frames (int):      Tổng số frame đã chấm
            - avg_pitch_score (float): Điểm cao độ trung bình
            - avg_breath_score (float): Điểm hơi trung bình
            - avg_total_score (float): Điểm tổng trung bình
            - final_grade (str):       Xếp loại cuối (S/A/B/C/F)
            - best_note (str|None):    Nốt thổi tốt nhất
            - worst_note (str|None):   Nốt thổi tệ nhất
            - score_trend (str):       Xu hướng điểm (tăng/giảm/ổn định)
        """
        # Tính thời gian phiên
        duration = 0.0
        if self._session_start is not None:
            duration = time.monotonic() - self._session_start

        # Tính điểm trung bình chuẩn xác trên toàn bộ phiên tập
        if self._session_valid_frames > 0:
            avg_pitch  = self._session_pitch_sum / self._session_valid_frames
            avg_breath = self._session_breath_sum / self._session_valid_frames
            avg_total  = self._session_total_sum / self._session_valid_frames
        else:
            avg_pitch  = self._safe_mean(self._pitch_scores)
            avg_breath = self._safe_mean(self._breath_scores)
            avg_total  = self._safe_mean(self._total_scores)

        # Xếp loại cuối
        final_grade = self._get_grade(avg_total)

        # Tìm nốt tốt nhất và tệ nhất
        best_note, worst_note = self._find_best_worst_notes()

        # Phân tích xu hướng điểm (so sánh nửa đầu và nửa sau)
        score_trend = self._analyze_trend()

        summary = {
            "duration_sec":    round(duration, 1),
            "total_frames":    self._frame_count,
            "avg_pitch_score": round(avg_pitch, 1),
            "avg_breath_score": round(avg_breath, 1),
            "avg_total_score": round(avg_total, 1),
            "final_grade":     final_grade,
            "best_note":       best_note,
            "worst_note":      worst_note,
            "score_trend":     score_trend,
        }

        logger.info(
            "📊 Kết thúc phiên: %.1f giây, %d frame, TB=%.1f, Xếp loại=%s",
            duration, self._frame_count, avg_total, final_grade
        )

        return summary

    # ------------------------------------------------------------------
    # Chấm điểm từng khung
    # ------------------------------------------------------------------

    def score_frame(
        self,
        pitch_data:       dict,
        breath_data:      dict,
        target_note:      Optional[str]        = None,
        target_rms_range: tuple[float, float]  = (DEFAULT_RMS_MIN, DEFAULT_RMS_MAX),
        flute_type:       str                  = "C",
    ) -> dict:
        """
        Chấm điểm cho một khung thời gian (frame).

        Args:
            pitch_data:       Dữ liệu cao độ từ PitchResult.to_dict()
            breath_data:      Dữ liệu hơi từ BreathAnalyzer.analyze()
            target_note:      Nốt mục tiêu (tiếng Việt), None = không có mục tiêu
            target_rms_range: (rms_min, rms_max) vùng RMS mục tiêu
            flute_type:       Tone sáo (C, A, G, D, B, Bb, F)

        Returns:
            dict với:
            - pitch_score (float):  Điểm cao độ [0-100]
            - breath_score (float): Điểm hơi [0-100]
            - total_score (float):  Điểm tổng [0-100]
            - grade (str):          Xếp loại (S/A/B/C/F)
            - session_avg (float):  Điểm trung bình cả phiên
        """
        self._frame_count += 1

        # === Tính điểm cao độ ===
        pitch_score = self._calc_pitch_score(pitch_data, target_note, flute_type=flute_type)

        # === Tính điểm hơi thổi ===
        breath_score = self._calc_breath_score(breath_data, target_rms_range)

        # === Điểm tổng (trọng số MVP) ===
        total_score = WEIGHT_PITCH * pitch_score + WEIGHT_BREATH * breath_score
        total_score = round(total_score, 1)

        # === Lưu lịch sử và tích lũy toàn phiên ===
        self._pitch_scores.append(pitch_score)
        self._breath_scores.append(breath_score)
        self._total_scores.append(total_score)
        self._session_pitch_sum    += pitch_score
        self._session_breath_sum   += breath_score
        self._session_total_sum    += total_score
        self._session_valid_frames += 1

        # Lưu (nốt, điểm) để phân tích sau
        note_viet = pitch_data.get("note_viet")
        if note_viet:
            self._note_scores.append((note_viet, total_score))

        # === Xếp loại ===
        grade = self._get_grade(total_score)

        # Điểm trung bình cả phiên
        session_avg = self._safe_mean(self._total_scores)

        return {
            "pitch_score":  round(pitch_score, 1),
            "breath_score": round(breath_score, 1),
            "total_score":  total_score,
            "grade":        grade,
            "session_avg":  round(session_avg, 1),
        }

    # ------------------------------------------------------------------
    # Phương thức tính điểm nội bộ
    # ------------------------------------------------------------------

    def _calc_pitch_score(self, pitch_data: dict, target_note: Optional[str], flute_type: str = "C") -> float:
        """
        Tính điểm cao độ dựa trên cent_offset, sự đúng tên nốt và đúng quãng tám (octave).
        Hỗ trợ dung sai động và chuẩn xác 7 tone sáo trúc Việt Nam.
        """
        pitch_hz    = pitch_data.get("hz")
        cent_offset = float(pitch_data.get("cent_offset", 0.0))
        confidence  = float(pitch_data.get("confidence", 0.0))
        note_viet   = pitch_data.get("note_viet")
        user_octave = pitch_data.get("octave")

        # Không có âm hoặc độ tin cậy thấp hoặc im lặng → điểm 0
        if pitch_hz is None or pitch_hz <= 0 or confidence < 0.3:
            return 0.0

        # Tính điểm ban đầu theo cent_offset với dung sai động
        abs_cent = abs(cent_offset)
        c_perf = getattr(self, "cent_perfect", CENT_PERFECT)
        c_zero = getattr(self, "cent_zero", CENT_ZERO)

        if abs_cent <= c_perf:
            cent_score = 100.0
        elif abs_cent >= c_zero:
            cent_score = 0.0
        else:
            cent_score = 100.0 * (c_zero - abs_cent) / (c_zero - c_perf)

        # So sánh nốt mục tiêu nếu có
        if target_note is not None:
            t_key = target_note.split("(")[0].strip().lower()

            # Nếu là sáo tone khác (A, G, D, B, Bb, F):
            if flute_type and flute_type != "C" and flute_type in FLUTE_TONE_TARGET_SPECS:
                tone_map = FLUTE_TONE_TARGET_SPECS[flute_type]
                expected_hz = tone_map.get(t_key) or tone_map.get("sol", 659.25)
                if pitch_hz and expected_hz:
                    cent_diff = abs(1200.0 * math.log2(pitch_hz / expected_hz))
                    if cent_diff <= c_zero:
                        cent_score = max(0.0, min(100.0, 100.0 * (c_zero - cent_diff) / (c_zero - c_perf)))
                    else:
                        cent_score = min(20.0, cent_score * 0.2)
            else:
                # Sáo tone C hoặc nốt theo hệ âm chuẩn sáo trúc
                spec = TARGET_SPECS.get(t_key)
                if not spec:
                    base_guess = normalize_flute_note(t_key)
                    spec = TARGET_SPECS.get(base_guess, {"base": base_guess, "target_hz": None, "octave": 4})

                expected_base   = spec["base"]
                expected_octave = spec.get("octave")
                expected_hz     = spec.get("target_hz")
                note_norm       = normalize_flute_note(note_viet)

                # 1. Kiểm tra tên nốt
                if note_norm != expected_base:
                    # Sai tên nốt hoàn toàn
                    cent_score = min(15.0, cent_score * 0.15)
                else:
                    # 2. Đúng tên nốt → BẮT BUỘC kiểm tra quãng tám (Octave)
                    octave_mismatch = False

                    if expected_octave is not None and user_octave is not None:
                        if user_octave != expected_octave:
                            octave_mismatch = True
                    elif expected_hz and pitch_hz:
                        ratio = pitch_hz / expected_hz
                        if ratio > 1.45 or ratio < 0.68:
                            octave_mismatch = True

                    if octave_mismatch:
                        # Thổi đúng nốt nhưng sai quãng (vd: yêu cầu Sol 1 ~392Hz nhưng thổi Sol 2 ~784Hz)
                        # Điểm phạt nặng, tối đa 25 điểm
                        cent_score = min(25.0, cent_score * 0.25)

        return round(cent_score, 1)

    def _calc_breath_score(
        self,
        breath_data:      dict,
        target_rms_range: tuple[float, float],
    ) -> float:
        """
        Tính điểm hơi thổi dựa trên 3 tiêu chí:
        1. Có thổi hơi không (50 điểm)
        2. Hơi có đều không (30 điểm)
        3. RMS có trong vùng mục tiêu không (20 điểm)

        Args:
            breath_data:      Dữ liệu hơi thổi
            target_rms_range: (rms_min, rms_max) vùng RMS mục tiêu

        Returns:
            Điểm hơi [0.0, 100.0]
        """
        is_breathing  = bool(breath_data.get("is_breathing", False))
        breath_steady = bool(breath_data.get("breath_steady", False))
        rms           = float(breath_data.get("rms", 0.0))

        score = 0.0

        # Tiêu chí 1: Đang thổi hơi (50 điểm)
        if is_breathing:
            score += BREATH_SCORE_IS_BREATHING

            # Tiêu chí 2: Hơi đều (30 điểm) - chỉ tính khi đang thổi
            if breath_steady:
                score += BREATH_SCORE_STEADY

            # Tiêu chí 3: RMS trong vùng mục tiêu (20 điểm)
            rms_min, rms_max = target_rms_range
            if rms_min <= rms <= rms_max:
                score += BREATH_SCORE_RMS_IN_RANGE
            elif rms > 0:
                # Cho điểm một phần nếu RMS gần vùng mục tiêu
                if rms < rms_min:
                    # Dưới ngưỡng → điểm theo tỷ lệ
                    partial = (rms / rms_min) * BREATH_SCORE_RMS_IN_RANGE
                    score += partial * 0.5  # Giảm bớt vì thiếu hơi
                elif rms > rms_max:
                    # Trên ngưỡng → điểm giảm theo khoảng cách
                    excess_ratio = rms_max / rms  # 1.0 → 0.0
                    partial = excess_ratio * BREATH_SCORE_RMS_IN_RANGE
                    score += partial * 0.5

        return round(min(100.0, score), 1)

    # ------------------------------------------------------------------
    # Phân tích lịch sử phiên
    # ------------------------------------------------------------------

    def _find_best_worst_notes(self) -> tuple[Optional[str], Optional[str]]:
        """
        Tìm nốt nhạc có điểm trung bình cao nhất và thấp nhất.

        Returns:
            (best_note, worst_note) - tên nốt tiếng Việt hoặc None
        """
        if not self._note_scores:
            return None, None

        # Nhóm điểm theo tên nốt
        note_score_map: dict[str, list[float]] = {}
        for note, score in self._note_scores:
            if note not in note_score_map:
                note_score_map[note] = []
            note_score_map[note].append(score)

        if not note_score_map:
            return None, None

        # Tính điểm trung bình từng nốt
        avg_by_note = {
            note: float(np.mean(scores))
            for note, scores in note_score_map.items()
        }

        best_note  = max(avg_by_note, key=avg_by_note.get)
        worst_note = min(avg_by_note, key=avg_by_note.get)

        # Nếu chỉ có 1 nốt, worst = None
        if len(avg_by_note) == 1:
            worst_note = None

        return best_note, worst_note

    def _analyze_trend(self) -> str:
        """
        Phân tích xu hướng điểm trong phiên.

        So sánh điểm trung bình nửa đầu với nửa sau phiên.

        Returns:
            "tăng" / "giảm" / "ổn định" / "chưa đủ dữ liệu"
        """
        scores = list(self._total_scores)
        if len(scores) < 10:
            return "chưa đủ dữ liệu"

        mid     = len(scores) // 2
        first_half  = scores[:mid]
        second_half = scores[mid:]

        avg_first  = float(np.mean(first_half))
        avg_second = float(np.mean(second_half))
        diff       = avg_second - avg_first

        if diff > 5:
            return "tăng"
        elif diff < -5:
            return "giảm"
        else:
            return "ổn định"

    # ------------------------------------------------------------------
    # Tiện ích
    # ------------------------------------------------------------------

    @staticmethod
    def _get_grade(score: float) -> str:
        """
        Xếp loại dựa trên điểm số.

        S: ≥95 | A: ≥80 | B: ≥60 | C: ≥40 | F: <40
        """
        for threshold, grade in GRADE_TABLE:
            if score >= threshold:
                return grade
        return "F"

    @staticmethod
    def _safe_mean(collection) -> float:
        """Tính trung bình an toàn, trả về 0.0 nếu collection rỗng."""
        arr = list(collection)
        if not arr:
            return 0.0
        return float(np.mean(arr))

    # ------------------------------------------------------------------
    # Thuộc tính đọc
    # ------------------------------------------------------------------

    @property
    def session_duration(self) -> float:
        """Thời gian phiên hiện tại (giây)."""
        if self._session_start is None:
            return 0.0
        return time.monotonic() - self._session_start

    @property
    def current_avg_score(self) -> float:
        """Điểm trung bình hiện tại trong phiên."""
        return self._safe_mean(self._total_scores)
