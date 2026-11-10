"""
feedback_rules.py - Quy tắc phản hồi luyện tập tiếng sáo bằng tiếng Việt
==========================================================================
Hệ thống phản hồi thông minh dựa trên dữ liệu cao độ và hơi thổi,
đưa ra hướng dẫn cụ thể và khuyến khích bằng tiếng Việt.

Tác giả: HocSao Team
"""

import logging
import math
from enum import Enum
from typing import Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Mức độ nghiêm trọng của phản hồi
# ---------------------------------------------------------------------------
class Severity(str, Enum):
    """Mức độ nghiêm trọng của thông báo phản hồi."""
    ERROR   = "ERROR"    # Sai nghiêm trọng, cần sửa ngay
    WARNING = "WARNING"  # Hơi lệch, cần chú ý
    SUCCESS = "SUCCESS"  # Đúng, khen ngợi
    INFO    = "INFO"     # Thông tin / hướng dẫn chung


# ---------------------------------------------------------------------------
# Dataclass phản hồi
# ---------------------------------------------------------------------------
class FeedbackItem:
    """Một mục phản hồi với nội dung và mức độ nghiêm trọng."""

    def __init__(self, message: str, severity: Severity):
        self.message  = message
        self.severity = severity

    def to_dict(self) -> dict:
        return {"message": self.message, "severity": self.severity.value}

    def __repr__(self) -> str:
        return f"[{self.severity.value}] {self.message}"


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
# Ngưỡng các quy tắc phản hồi
# ---------------------------------------------------------------------------

# --- Cao độ ---
CENT_ERROR_HIGH   = 30    # Cent: cao quá → ERROR
CENT_ERROR_LOW    = -30   # Cent: thấp quá → ERROR
CENT_WARN_HIGH    = 20    # Cent: hơi cao → WARNING
CENT_WARN_LOW     = -20   # Cent: hơi thấp → WARNING
CENT_PERFECT      = 10    # Cent: trong khoảng này → PERFECT

# --- Hơi thổi ---
RMS_LOW_THRESHOLD  = 0.015   # RMS quá thấp → chưa đủ hơi
RMS_HIGH_THRESHOLD = 0.40    # RMS quá cao → hơi mạnh quá

# --- Tin cậy ---
CONFIDENCE_MIN = 0.4   # Độ tin cậy tối thiểu để đưa ra phản hồi về cao độ


# ---------------------------------------------------------------------------
# Lớp FeedbackEngine chính
# ---------------------------------------------------------------------------
class FeedbackEngine:
    """
    Động cơ phản hồi luyện tập tiếng sáo.

    Nhận dữ liệu cao độ và hơi thổi, áp dụng bảng quy tắc để
    tạo ra danh sách phản hồi tiếng Việt phù hợp với tình huống.

    Ví dụ:
        engine  = FeedbackEngine()
        items   = engine.get_feedback(pitch_data, breath_data, target_note="Sol")
        for item in items:
            print(item['message'])
    """

    def __init__(self):
        """Khởi tạo FeedbackEngine với bảng quy tắc mặc định."""
        # Đếm số khung liên tiếp đúng để khen ngợi chính xác
        self._perfect_streak  = 0
        self._last_target     = None
        logger.debug("FeedbackEngine đã khởi tạo.")

    # ------------------------------------------------------------------
    # API công khai
    # ------------------------------------------------------------------

    def get_feedback(
        self,
        pitch_data:  dict,
        breath_data: dict,
        target_note: Optional[str] = None,
        flute_type:  str = "C",
    ) -> list[dict]:
        """
        Phân tích dữ liệu và trả về danh sách phản hồi.

        Args:
            pitch_data:  Dict từ PitchResult.to_dict() hoặc tương đương.
                         Cần các trường: hz, note_viet, cent_offset, confidence
            breath_data: Dict từ BreathAnalyzer.analyze()
                         Cần: rms, is_breathing, breath_steady, vibrato_detected
            target_note: Tên nốt mục tiêu (tiếng Việt, vd: "Sol"), None = tự do

        Returns:
            Danh sách dict {"message": str, "severity": str}
            Thứ tự: ERROR → WARNING → SUCCESS → INFO
        """
        items: list[FeedbackItem] = []

        # === Tình huống 1: Im lặng (chưa thổi) ===
        if not breath_data.get("is_breathing", False):
            # Kiểm tra thêm bằng pitch data
            if pitch_data.get("hz") is None:
                items.append(FeedbackItem(
                    "Hãy bắt đầu thổi...",
                    Severity.INFO,
                ))
                self._perfect_streak = 0
                return self._sort_and_convert(items)

        # === Lấy giá trị từ dữ liệu ===
        rms             = float(breath_data.get("rms", 0.0))
        is_breathing    = bool(breath_data.get("is_breathing", False))
        breath_steady   = bool(breath_data.get("breath_steady", True))
        vibrato_det     = bool(breath_data.get("vibrato_detected", False))

        pitch_hz        = pitch_data.get("hz")
        note_viet       = pitch_data.get("note_viet")
        cent_offset     = float(pitch_data.get("cent_offset", 0.0))
        confidence      = float(pitch_data.get("confidence", 0.0))

        # === Tình huống 2: Đang thổi nhưng không có nốt rõ ===
        if is_breathing and (pitch_hz is None or confidence < CONFIDENCE_MIN):
            items.append(FeedbackItem(
                "Âm chưa rõ. Kiểm tra embouchure (hình miệng) và góc thổi.",
                Severity.WARNING,
            ))
            self._perfect_streak = 0
            return self._sort_and_convert(items)

        # === Quy tắc hơi thổi ===
        items.extend(self._check_breath_rules(rms, breath_steady, vibrato_det, target_note))

        # === Quy tắc cao độ (chỉ khi có nốt rõ) ===
        if pitch_hz is not None and confidence >= CONFIDENCE_MIN:
            pitch_items, is_perfect = self._check_pitch_rules(
                cent_offset, note_viet, target_note, octave=pitch_data.get("octave"), hz=pitch_hz, flute_type=flute_type
            )
            items.extend(pitch_items)

            # === Phản hồi tổng hợp: Tất cả đều đúng ===
            if is_perfect and breath_steady and not vibrato_det and rms >= RMS_LOW_THRESHOLD:
                self._perfect_streak += 1
                items.append(self._get_success_message(self._perfect_streak))
            else:
                self._perfect_streak = 0
        else:
            self._perfect_streak = 0

        # Nếu không có phản hồi nào, đưa ra hướng dẫn chung
        if not items and is_breathing:
            items.append(FeedbackItem(
                "Tiếp tục duy trì hơi thổi đều.",
                Severity.INFO,
            ))

        return self._sort_and_convert(items)

    def reset(self):
        """Đặt lại trạng thái (khi bắt đầu bài luyện mới)."""
        self._perfect_streak = 0
        self._last_target    = None

    # ------------------------------------------------------------------
    # Các kiểm tra quy tắc nội bộ
    # ------------------------------------------------------------------

    def _check_breath_rules(
        self,
        rms:          float,
        breath_steady: bool,
        vibrato_det:  bool,
        target_note:  Optional[str],
    ) -> list[FeedbackItem]:
        """
        Kiểm tra các quy tắc liên quan đến hơi thổi.

        Returns:
            Danh sách FeedbackItem về hơi thổi
        """
        items = []

        # Quy tắc 1: Hơi quá yếu
        if rms < RMS_LOW_THRESHOLD:
            items.append(FeedbackItem(
                "Hơi chưa đủ mạnh. Hít sâu và thổi từ bụng.",
                Severity.WARNING,
            ))

        # Quy tắc 2: Hơi quá mạnh
        elif rms > RMS_HIGH_THRESHOLD:
            items.append(FeedbackItem(
                "Hơi quá mạnh, có thể vọt lên quãng 8. Giảm lực hơi.",
                Severity.ERROR,
            ))

        # Quy tắc 3: Hơi không đều
        if not breath_steady:
            items.append(FeedbackItem(
                "Hơi chưa đều. Cố giữ luồng hơi liên tục như thổi nến.",
                Severity.WARNING,
            ))

        # Quy tắc 4: Rung hơi không mong muốn
        # (khi đang tập nốt cơ bản, vibrato là không tốt)
        if vibrato_det and target_note is not None:
            items.append(FeedbackItem(
                "Đang có run hơi. Thư giãn môi và cơ cổ.",
                Severity.WARNING,
            ))

        return items

    def _check_pitch_rules(
        self,
        cent_offset: float,
        note_viet:   Optional[str],
        target_note: Optional[str],
        octave:      Optional[int] = None,
        hz:          Optional[float] = None,
        flute_type:  str = "C",
    ) -> tuple[list[FeedbackItem], bool]:
        """
        Kiểm tra các quy tắc liên quan đến cao độ.
        Hỗ trợ 7 tone sáo trúc (C, A, G, D, B, Bb, F).
        """
        items     = []
        is_perfect = False

        abs_cent = abs(cent_offset)

        # === Nếu có nốt mục tiêu, kiểm tra xem có đúng nốt & đúng quãng không ===
        if target_note is not None:
            t_key = target_note.split("(")[0].strip().lower()

            if flute_type and flute_type != "C" and flute_type in FLUTE_TONE_TARGET_SPECS:
                tone_map = FLUTE_TONE_TARGET_SPECS[flute_type]
                expected_hz = tone_map.get(t_key) or tone_map.get("sol", 659.25)
                if hz and expected_hz:
                    cent_diff = abs(1200.0 * math.log2(hz / expected_hz))
                    if cent_diff <= 48.0:
                        is_perfect = (cent_diff <= CENT_PERFECT)
                        if is_perfect:
                            items.append(FeedbackItem(f"✨ Chuẩn nốt {target_note} trên Sáo {flute_type}!", Severity.SUCCESS))
                        elif cent_diff <= 25.0:
                            direction = "hơi cao (giảm bớt hơi)" if (hz > expected_hz) else "hơi thấp (thổi thêm hơi)"
                            items.append(FeedbackItem(f"Đúng nốt {target_note} ({direction}).", Severity.WARNING))
                        return items, is_perfect
                    else:
                        items.append(FeedbackItem(
                            f"Đang nghe âm ~{hz:.0f}Hz. Cần âm ~{expected_hz:.0f}Hz cho nốt {target_note} trên Sáo {flute_type}.",
                            Severity.ERROR
                        ))
                        return items, False

            elif note_viet is not None:
                spec = TARGET_SPECS.get(t_key)
                if not spec:
                    base_guess = normalize_flute_note(t_key)
                    spec = TARGET_SPECS.get(base_guess, {"base": base_guess, "target_hz": None, "octave": 4})

                expected_base   = spec["base"]
                expected_octave = spec.get("octave")
                expected_hz     = spec.get("target_hz")
                note_norm       = normalize_flute_note(note_viet)

                # 1. Sai tên nốt
                if note_norm != expected_base:
                    items.append(FeedbackItem(
                        f"Đang thổi nốt {note_viet}, cần thổi nốt {target_note}. "
                        f"Kiểm tra lại vị trí bấm ngón trên thân sáo.",
                        Severity.ERROR,
                    ))
                    return items, False

                # 2. Đúng tên nốt nhưng sai quãng tám (Octave)
                octave_mismatch = False
                if expected_octave is not None and octave is not None:
                    if octave != expected_octave:
                        octave_mismatch = True
                elif expected_hz and hz:
                    ratio = hz / expected_hz
                    if ratio > 1.45 or ratio < 0.68:
                        octave_mismatch = True

                if octave_mismatch:
                    is_overblowing = (octave is not None and expected_octave is not None and octave > expected_octave) or (hz and expected_hz and hz > expected_hz)
                    if is_overblowing:
                        items.append(FeedbackItem(
                            f"Đang thổi {note_viet} ở quãng cao (~{hz:.0f}Hz). "
                            f"Bài yêu cầu quãng {expected_octave - 3 if expected_octave else 1}. Hãy thả lỏng môi và giảm nhẹ tốc độ hơi.",
                            Severity.WARNING,
                        ))
                    else:
                        items.append(FeedbackItem(
                            f"Đang thổi {note_viet} ở quãng trầm (~{hz:.0f}Hz). "
                            f"Bài yêu cầu quãng {expected_octave - 3 if expected_octave else 2}. Hãy siết mép môi và tăng tốc luồng hơi.",
                            Severity.WARNING,
                        ))
                    return items, False

        # === Kiểm tra độ lệch cent ===
        if cent_offset > CENT_ERROR_HIGH:
            # Âm cao quá nhiều → lỗi nghiêm trọng
            items.append(FeedbackItem(
                f"Âm đang cao quá {abs_cent:.0f} cent. "
                f"Thử giảm lực hơi hoặc xoay sáo vào trong một chút.",
                Severity.ERROR,
            ))

        elif cent_offset < CENT_ERROR_LOW:
            # Âm thấp quá nhiều → lỗi nghiêm trọng
            items.append(FeedbackItem(
                f"Âm đang thấp quá {abs_cent:.0f} cent. "
                f"Thổi mạnh hơn hoặc xoay sáo ra ngoài một chút.",
                Severity.ERROR,
            ))

        elif cent_offset > CENT_WARN_HIGH:
            # Âm hơi cao → cảnh báo
            items.append(FeedbackItem(
                f"Âm hơi cao ({abs_cent:.0f} cent). Điều chỉnh nhẹ hơi.",
                Severity.WARNING,
            ))

        elif cent_offset < CENT_WARN_LOW:
            # Âm hơi thấp → cảnh báo
            items.append(FeedbackItem(
                f"Âm hơi thấp ({abs_cent:.0f} cent). Thổi thêm chút lực.",
                Severity.WARNING,
            ))

        else:
            # Âm trong vùng chấp nhận được (< ±20 cent)
            is_perfect = abs_cent <= CENT_PERFECT  # Hoàn hảo nếu < ±10 cent

        return items, is_perfect

    def _get_success_message(self, streak: int) -> FeedbackItem:
        """
        Tạo thông báo khen ngợi dựa trên số khung liên tiếp đúng.

        Streak càng dài → lời khen càng nhiệt tình.

        Args:
            streak: Số khung liên tiếp đạt chuẩn

        Returns:
            FeedbackItem với thông điệp khen ngợi phù hợp
        """
        if streak >= 50:
            msg = "🌟 Xuất sắc! Bạn đang thổi rất chuẩn và đều. Tiếp tục phong độ này!"
        elif streak >= 20:
            msg = "🎵 Tuyệt vời! Âm thanh rất chuẩn và hơi đều."
        elif streak >= 10:
            msg = "✅ Rất tốt! Giữ nguyên."
        elif streak >= 5:
            msg = "👍 Tốt! Âm đúng vị trí, tiếp tục duy trì."
        else:
            msg = "Đúng rồi! Tiếp tục."

        return FeedbackItem(msg, Severity.SUCCESS)

    # ------------------------------------------------------------------
    # Tiện ích
    # ------------------------------------------------------------------

    @staticmethod
    def _sort_and_convert(items: list[FeedbackItem]) -> list[dict]:
        """
        Sắp xếp theo mức độ nghiêm trọng và chuyển sang dict.

        Thứ tự ưu tiên: ERROR > WARNING > SUCCESS > INFO
        """
        severity_order = {
            Severity.ERROR:   0,
            Severity.WARNING: 1,
            Severity.SUCCESS: 2,
            Severity.INFO:    3,
        }
        sorted_items = sorted(items, key=lambda x: severity_order[x.severity])
        return [item.to_dict() for item in sorted_items]
