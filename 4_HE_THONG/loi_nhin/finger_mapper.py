"""
Module finger_mapper.py — Nhận diện thế bấm sáo trúc 6 lỗ và đối chiếu đa phương thức (Thế tay vs Âm thanh).
Hỗ trợ sáo 6 lỗ Việt Nam chuẩn hệ Đô (C5), La (A4), Sol (G4)...
"""

import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger("loi_nhin.finger_mapper")

# Bảng thế bấm chuẩn cho Sáo Trúc 6 Lỗ (Hệ Đô C5 tiêu chuẩn)
# holes: [Lỗ 1, Lỗ 2, Lỗ 3, Lỗ 4, Lỗ 5, Lỗ 6]
# True = Bịt kín (Đóng), False = Mở
# Quy ước:
# - Cụm tay trái (gần miệng thổi): Lỗ 1 (Trỏ T), Lỗ 2 (Giữa T), Lỗ 3 (Áp út T)
# - Cụm tay phải (gần đuôi sáo): Lỗ 4 (Trỏ P), Lỗ 5 (Giữa P), Lỗ 6 (Áp út P)
STANDARD_FINGERINGS_C = [
    {
        "note_viet": "Đô 1",
        "note_western": "C4",
        "octave": 4,
        "holes": [True, True, True, True, True, True],
        "desc": "Bịt kín cả 6 lỗ, thổi nhẹ và ấm"
    },
    {
        "note_viet": "Rê 1",
        "note_western": "D4",
        "octave": 4,
        "holes": [True, True, True, True, True, False],
        "desc": "Mở lỗ 6 (áp út tay phải), bịt 5 lỗ còn lại"
    },
    {
        "note_viet": "Mi 1",
        "note_western": "E4",
        "octave": 4,
        "holes": [True, True, True, True, False, False],
        "desc": "Mở lỗ 5, 6 (hai ngón tay phải), bịt 4 lỗ trên"
    },
    {
        "note_viet": "Fa 1",
        "note_western": "F4",
        "octave": 4,
        "holes": [True, True, True, False, False, False],
        "desc": "Mở 3 lỗ dưới (4, 5, 6), bịt 3 lỗ trên (1, 2, 3)"
    },
    {
        "note_viet": "Fa# 1",
        "note_western": "F#4",
        "octave": 4,
        "holes": [True, True, False, True, False, False],
        "desc": "Mở lỗ 3 và 5, 6; bịt lỗ 1, 2 và 4"
    },
    {
        "note_viet": "Sol 1",
        "note_western": "G4",
        "octave": 4,
        "holes": [True, True, False, False, False, False],
        "desc": "Bịt lỗ 1, 2 (tay trái), mở các lỗ 3, 4, 5, 6"
    },
    {
        "note_viet": "La 1",
        "note_western": "A4",
        "octave": 4,
        "holes": [True, False, False, False, False, False],
        "desc": "Chỉ bịt duy nhất lỗ 1 (trỏ trái), mở 5 lỗ còn lại"
    },
    {
        "note_viet": "Sib 1",
        "note_western": "Bb4",
        "octave": 4,
        "holes": [False, True, True, False, False, False],
        "desc": "Bịt lỗ 2, 3; mở lỗ 1 và các lỗ dưới"
    },
    {
        "note_viet": "Si 1",
        "note_western": "B4",
        "octave": 4,
        "holes": [False, False, False, False, False, False],
        "desc": "Mở cả 6 lỗ hoặc bịt hờ đuôi sáo"
    },
    {
        "note_viet": "Đô 2",
        "note_western": "C5",
        "octave": 5,
        "holes": [False, True, False, False, False, False],
        "desc": "Bịt duy nhất lỗ 2 (giữa trái), mở lỗ 1 và các lỗ dưới"
    },
    {
        "note_viet": "Rê 2",
        "note_western": "D5",
        "octave": 5,
        "holes": [True, True, True, True, True, False],
        "desc": "Thế tay như Rê 1, gom môi thổi luồng hơi nhanh"
    },
    {
        "note_viet": "Mi 2",
        "note_western": "E5",
        "octave": 5,
        "holes": [True, True, True, True, False, False],
        "desc": "Thế tay như Mi 1, luồng hơi nhanh và tập trung"
    },
    {
        "note_viet": "Fa 2",
        "note_western": "F5",
        "octave": 5,
        "holes": [True, True, True, False, False, False],
        "desc": "Thế tay như Fa 1, luồng hơi nhanh và tập trung"
    },
    {
        "note_viet": "Sol 2",
        "note_western": "G5",
        "octave": 5,
        "holes": [True, True, False, False, False, False],
        "desc": "Thế tay như Sol 1, siết khóe môi thổi hơi mạnh"
    },
    {
        "note_viet": "La 2",
        "note_western": "A5",
        "octave": 5,
        "holes": [True, False, False, False, False, False],
        "desc": "Thế tay như La 1, siết khóe môi thổi hơi mạnh"
    },
    {
        "note_viet": "Đố 2",
        "note_western": "C5",
        "octave": 5,
        "holes": [False, True, False, False, False, False],
        "desc": "Bịt duy nhất lỗ 2, mở lỗ 1"
    }
]


class FingerMapper:
    """Quản lý thế bấm sáo trúc và nhận diện nốt từ trạng thái 6 lỗ."""

    def __init__(self, tone: str = "C", config_dir: Optional[Path] = None):
        self.tone = tone.upper()
        self.fingerings = self._load_fingerings(tone, config_dir)

    def _load_fingerings(self, tone: str, config_dir: Optional[Path]) -> List[Dict[str, Any]]:
        """Nạp cấu hình thế bấm từ file JSON nếu có, hoặc dùng bảng mặc định."""
        if config_dir:
            json_path = Path(config_dir) / f"sao_{tone}.json"
            if json_path.exists():
                try:
                    with open(json_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    res = []
                    for quang in data.get("bang_bam", []):
                        for n in quang.get("cac_not", []):
                            res.append({
                                "note_viet": n.get("note_viet", ""),
                                "note_western": f"{n.get('note_western', '')}{n.get('octave', 4)}",
                                "octave": n.get("octave", 4),
                                "holes": n.get("holes", [False] * 6),
                                "desc": n.get("fingering_desc", "")
                            })
                    if res:
                        return res
                except Exception as e:
                    logger.warning(f"Không thể đọc {json_path}: {e}")
        return STANDARD_FINGERINGS_C

    def identify_fingering(self, holes: List[bool]) -> Dict[str, Any]:
        """
        Nhận diện nốt bấm từ mảng trạng thái 6 lỗ [h1, h2, h3, h4, h5, h6].
        Trả về nốt khớp nhất cùng độ tin cậy.
        """
        if len(holes) != 6:
            return {"note_viet": "Chưa rõ", "confidence": 0.0, "matched": False, "holes_actual": holes}

        best_match = None
        best_score = -1.0

        for f in self.fingerings:
            target_holes = f["holes"]
            matches = sum(1 for a, b in zip(holes, target_holes) if a == b)
            score = matches / 6.0
            if score > best_score:
                best_score = score
                best_match = f

        if best_match and best_score >= 0.83:  # Khớp ít nhất 5/6 lỗ
            return {
                "note_viet": best_match["note_viet"],
                "note_western": best_match["note_western"],
                "octave": best_match["octave"],
                "confidence": round(best_score, 2),
                "matched": best_score == 1.0,
                "holes_expected": best_match["holes"],
                "holes_actual": holes,
                "desc": best_match["desc"]
            }

        return {
            "note_viet": "Chưa rõ",
            "confidence": round(best_score, 2) if best_score >= 0 else 0.0,
            "matched": False,
            "holes_actual": holes,
            "desc": "Thế bấm chưa trùng khớp với nốt tiêu chuẩn"
        }

    def get_holes_for_note(self, note_name: str) -> Optional[List[bool]]:
        """Lấy thế bấm chuẩn (6 lỗ) cho một nốt theo tên tiếng Việt hoặc Tây."""
        norm_name = note_name.strip().lower().replace(" ", "").replace("1", "").replace("2", "")
        for f in self.fingerings:
            f_norm = f["note_viet"].strip().lower().replace(" ", "").replace("1", "").replace("2", "")
            if norm_name == f_norm or note_name.lower() in f["note_viet"].lower():
                return f["holes"]
        return None

    def diagnose_multimodal(
        self,
        detected_fingering: Dict[str, Any],
        detected_audio: Dict[str, Any],
        target_note: str = ""
    ) -> Dict[str, Any]:
        """
        Chẩn đoán đa phương thức kết hợp Camera (Thế tay) và Microphone (Âm thanh thực tế).
        Sinh ra lời nhận xét sư phạm chính xác như một người thầy dạy trực tiếp.
        """
        hand_note = detected_fingering.get("note_viet", "Chưa rõ")
        hand_matched = detected_fingering.get("matched", False)
        holes_actual = detected_fingering.get("holes_actual", [])

        audio_note = detected_audio.get("note", "---")
        audio_octave = detected_audio.get("octave", 0)
        audio_freq = detected_audio.get("frequency", 0.0)
        cents_offset = detected_audio.get("cents_offset", 0.0)
        rms = detected_audio.get("rms", 0.0)
        is_breathing = detected_audio.get("is_breathing", False) or rms > 0.015

        target_clean = target_note.strip()

        def clean_n(n: str) -> str:
            return n.lower().replace(" ", "").replace("1", "").replace("2", "").replace("đố", "đô")

        c_target = clean_n(target_clean) if target_clean else ""
        c_hand = clean_n(hand_note)
        c_audio = clean_n(audio_note)

        status_type = "info"
        diagnostic_text = ""
        tips: List[str] = []

        # 1. Chưa có luồng âm thanh (chưa thổi)
        if not is_breathing or audio_freq <= 100:
            if hand_matched and c_target and c_hand == c_target:
                status_type = "info"
                diagnostic_text = f"Thế tay đã bấm chuẩn nốt {target_clean}! Hãy bắt đầu thổi một luồng hơi đều vào sáo."
            elif hand_matched and hand_note != "Chưa rõ":
                status_type = "info"
                diagnostic_text = f"Thế tay đang bấm nốt {hand_note}. Hãy đưa sáo lên môi và thổi để kiểm tra âm thanh."
            else:
                status_type = "warning"
                diagnostic_text = "Đặt các ngón tay lên 6 lỗ sáo để hệ thống nhận diện thế bấm của bạn."
            return {
                "hand_match": c_hand == c_target if c_target else hand_matched,
                "sound_match": False,
                "overall_status": status_type,
                "diagnostic": diagnostic_text,
                "tips": tips,
                "hand_note": hand_note,
                "audio_note": "Chưa có âm"
            }

        # 2. Đã có âm thanh và thế tay
        # A. Cả tay và âm thanh đều đúng nốt mục tiêu
        if c_target and c_hand == c_target and c_audio == c_target:
            is_q2_target = "2" in target_clean or "đố" in target_clean.lower()
            is_q2_audio = audio_octave >= 5 or "2" in audio_note

            if is_q2_target != is_q2_audio:
                status_type = "warning"
                if is_q2_target and not is_q2_audio:
                    diagnostic_text = f"Tay bấm chuẩn {target_clean}, nhưng âm thanh mới ở Quãng 1 ({audio_note}). Hãy siết môi và tăng lực hơi để vọt lên Quãng 2!"
                    tips.append("Mím nhẹ khóe môi, gom luồng hơi nhỏ và thổi với tốc độ nhanh hơn.")
                else:
                    diagnostic_text = f"Tay bấm chuẩn {target_clean}, nhưng luồng hơi quá mạnh khiến âm bị vọt lên Quãng 2 ({audio_note})."
                    tips.append("Thả lỏng môi, thổi êm và ấm, hướng luồng hơi chúc xuống đáy lỗ thổi.")
            else:
                if abs(cents_offset) <= 12:
                    status_type = "success"
                    diagnostic_text = f"Tuyệt vời! Cả thế bấm tay và âm thanh đều cực chuẩn nốt {target_clean} (lệch chỉ {cents_offset:+.1f} cent)."
                elif cents_offset < -12:
                    status_type = "warning"
                    diagnostic_text = f"Đúng nốt {target_clean} nhưng đang bị non hơi ({cents_offset:+.1f} cent)."
                    tips.append("Ngẩng sáo lên một chút hoặc tăng nhẹ tốc độ luồng hơi để đưa cao độ lên chuẩn.")
                else:
                    status_type = "warning"
                    diagnostic_text = f"Đúng nốt {target_clean} nhưng đang bị già hơi ({cents_offset:+.1f} cent)."
                    tips.append("Xoay sáo vào trong lòng môi một chút hoặc thả lỏng lực thổi.")

        # B. Tay bấm đúng nốt mục tiêu, nhưng âm thanh ra sai nốt
        elif c_target and c_hand == c_target and c_audio != c_target:
            status_type = "danger"
            diagnostic_text = f"Tay bạn đã bấm đúng thế nốt {target_clean}, nhưng âm phát ra lại là {audio_note}!"
            tips.append("Kiểm tra các ngón tay có bịt kín hoàn toàn mép lỗ sáo không (ngón áp út rất dễ bị hở mép).")
            tips.append("Miết phẳng phần thịt đầu ngón tay phủ kín diện tích từng lỗ sáo.")

        # C. Tay bấm sai thế nốt mục tiêu
        elif c_target and c_hand != c_target:
            status_type = "danger"
            expected_holes = self.get_holes_for_note(target_clean)
            diagnostic_text = f"Thế tay chưa đúng: Bạn đang bấm thế nốt {hand_note}, trong khi bài yêu cầu nốt {target_clean}."
            if expected_holes and len(holes_actual) == 6:
                diffs = []
                for i, (act, exp) in enumerate(zip(holes_actual, expected_holes)):
                    if act != exp:
                        action = "bịt kín" if exp else "mở"
                        diffs.append(f"Lỗ {i+1} cần {action}")
                if diffs:
                    tips.append("Chỉnh sửa ngón tay: " + ", ".join(diffs))

        # D. Không có target note cụ thể (chế độ tự do)
        else:
            if c_hand == c_audio and c_hand != "":
                status_type = "success"
                diagnostic_text = f"Thế tay và âm thanh đồng bộ: Nốt {hand_note} ({audio_freq:.1f}Hz)."
            else:
                status_type = "info"
                diagnostic_text = f"Tay bấm: {hand_note} | Âm thanh đo được: {audio_note} ({audio_freq:.1f}Hz)."

        return {
            "hand_match": c_hand == c_target if c_target else hand_matched,
            "sound_match": c_audio == c_target if c_target else (c_audio != ""),
            "overall_status": status_type,
            "diagnostic": diagnostic_text,
            "tips": tips,
            "hand_note": hand_note,
            "audio_note": audio_note,
            "cents_offset": cents_offset
        }
