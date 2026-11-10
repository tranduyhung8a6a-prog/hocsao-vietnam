"""
Module ai_tutor.py — Gia sư AI cá nhân hóa (Adaptive Learning).
Phân tích lịch sử luyện tập, chuẩn đoán lỗi kỹ thuật và tự động sinh bài tập phục hồi 5 phút.
"""

import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger("loi_cham.ai_tutor")

STANDARD_NOTES = ["Đô 1", "Rê 1", "Mi 1", "Fa 1", "Sol 1", "La 1", "Si 1", "Đô 2", "Rê 2"]

NOTE_ADVICE_MAP = {
    "Đô 1": {
        "weakness_reason": "Bịt kín cả 6 lỗ sáo đòi hỏi độ khít tuyệt đối, đặc biệt là ngón áp út (ngón nhẫn) tay phải rất dễ bị hở mép.",
        "correction_tip": "Hãy xòe rộng bàn tay một cách thả lỏng, dùng phần thịt đệm mềm nhất của đầu ngón tay miết phẳng lên lỗ sáo, thổi hơi ấm và nhẹ."
    },
    "Rê 1": {
        "weakness_reason": "Khi mở ngón áp út tay phải (Lỗ 6), tay dễ bị gồng làm lỏng các ngón còn lại.",
        "correction_tip": "Chỉ nhấc đầu ngón áp út tay phải lên khoảng 1cm, giữ 5 ngón còn lại ôm chắc và khít trên thân sáo."
    },
    "Mi 1": {
        "weakness_reason": "Dễ bị non hơi hoặc âm thanh bị nghẹt do mở 2 ngón tay phải chưa đều.",
        "correction_tip": "Mở dứt khoát lỗ 5 và 6, luồng hơi đưa đều đặn về phía trước."
    },
    "Fa 1": {
        "weakness_reason": "Là nốt hay bị chênh lệch cao độ nhất trên sáo 6 lỗ vì mở cả 3 lỗ dưới (4, 5, 6).",
        "correction_tip": "Ngẩng nhẹ sáo lên một chút để nâng cao độ nếu bị non hơi. Luồng hơi cần gom nhỏ và hướng thẳng vào cạnh lỗ thổi."
    },
    "Sol 1": {
        "weakness_reason": "Nốt bản lề quan trọng nhất. Nếu thổi quá mạnh dễ bị nhảy lên Sol 2.",
        "correction_tip": "Giữ khóe môi mở vừa phải, thổi một luồng hơi êm dịu, không giật cục."
    },
    "La 1": {
        "weakness_reason": "Chỉ bịt 1 lỗ (Lỗ 1), cây sáo dễ bị rung lắc nếu ngón cái và ngón út đỡ sáo không vững.",
        "correction_tip": "Dùng ngón cái hai tay và ngón út tay phải làm điểm tựa vững chắc để thân sáo không bị xê dịch khi nhấc các ngón."
    },
    "Si 1": {
        "weakness_reason": "Mở toàn bộ 6 lỗ khiến điểm tựa của cây sáo bị lỏng, sáo dễ trượt khỏi môi.",
        "correction_tip": "Áp nhẹ ngón út tay phải vào thân sáo phía dưới để cố định ống sáo chắc chắn trên môi dưới."
    },
    "Đô 2": {
        "weakness_reason": "Chuyển từ Quãng 1 lên Quãng 2 cần tốc độ luồng hơi nhanh hơn gấp đôi mà không làm gồng cơ mặt.",
        "correction_tip": "Mím nhẹ hai bên khóe môi, tạo khe môi nhỏ hơn và thổi luồng hơi sắc, nhanh."
    },
    "Rê 2": {
        "weakness_reason": "Nốt cao ở Quãng 2, người mới hay bị tiếng rè hoặc xịt hơi do cố thổi quá nhiều lượng hơi.",
        "correction_tip": "Không cần thổi nhiều lượng hơi (volume), mà cần tăng vận tốc (velocity) của luồng hơi bằng cách thu hẹp khẩu hình môi."
    }
}


class AITutor:
    """Gia sư AI cá nhân hóa theo dõi tiến độ và tối ưu lộ trình học."""

    def __init__(self, data_dir: Optional[Path] = None):
        self.data_dir = data_dir

    def analyze_student(self, data_dir: Optional[Path] = None) -> Dict[str, Any]:
        """
        Quét toàn bộ hồ sơ và lịch sử phiên tập để lập Ma trận năng lực nốt nhạc.
        """
        root_dir = data_dir or self.data_dir
        if not root_dir:
            return self._default_new_student_diagnosis()

        ho_so_path = Path(root_dir) / "ho_so.json"
        history_dir = Path(root_dir) / "lich_su_diem"

        profile_data = {}
        if ho_so_path.exists():
            try:
                with open(ho_so_path, "r", encoding="utf-8") as f:
                    profile_data = json.load(f)
            except Exception as e:
                logger.warning(f"Lỗi đọc ho_so.json: {e}")

        # Thống kê điểm theo từng nốt
        note_stats: Dict[str, Dict[str, Any]] = {
            n: {
                "count": 0,
                "total_score": 0.0,
                "cents_offsets": [],
                "unsteady_count": 0,
                "octave_error_count": 0
            }
            for n in STANDARD_NOTES
        }

        # 1. Đọc từ danh sách lịch sử trong ho_so.json
        sessions = profile_data.get("lich_su", [])
        for s in sessions:
            not_name = s.get("not_muc_tieu", "")
            sc = float(s.get("tong_diem", 0))
            for std in STANDARD_NOTES:
                if std.lower().replace(" ", "") in not_name.lower().replace(" ", ""):
                    note_stats[std]["count"] += 1
                    note_stats[std]["total_score"] += sc

        # 2. Đọc thêm từ các file lịch sử ngày
        if history_dir.exists():
            for f in history_dir.glob("*.json"):
                try:
                    with open(f, "r", encoding="utf-8") as hf:
                        day_records = json.load(hf)
                    for r in day_records:
                        not_name = r.get("not_muc_tieu", "")
                        sc = float(r.get("tong_diem", 0))
                        cents = float(r.get("do_lech_cent", 0.0))
                        for std in STANDARD_NOTES:
                            if std.lower().replace(" ", "") in not_name.lower().replace(" ", ""):
                                note_stats[std]["count"] += 1
                                note_stats[std]["total_score"] += sc
                                note_stats[std]["cents_offsets"].append(cents)
                except Exception:
                    pass

        # 3. Tính điểm trung bình và xác định nốt yếu
        matrix = []
        weak_spots = []

        for note_name in STANDARD_NOTES:
            st = note_stats[note_name]
            cnt = st["count"]
            avg_sc = round(st["total_score"] / cnt, 1) if cnt > 0 else 0.0
            avg_cents = round(sum(st["cents_offsets"]) / len(st["cents_offsets"]), 1) if st["cents_offsets"] else 0.0

            # Xác định trạng thái
            if cnt == 0:
                level_status = "Chưa luyện"
                status_color = "gray"
            elif avg_sc >= 85:
                level_status = "Thành thạo"
                status_color = "green"
            elif avg_sc >= 70:
                level_status = "Khá"
                status_color = "blue"
            else:
                level_status = "Cần cải thiện"
                status_color = "orange"
                weak_spots.append({
                    "note": note_name,
                    "avg_score": avg_sc,
                    "avg_cents": avg_cents,
                    "count": cnt,
                    "reason": NOTE_ADVICE_MAP.get(note_name, {}).get("weakness_reason", ""),
                    "tip": NOTE_ADVICE_MAP.get(note_name, {}).get("correction_tip", "")
                })

            matrix.append({
                "note": note_name,
                "practiced_count": cnt,
                "average_score": avg_sc,
                "average_cents": avg_cents,
                "status": level_status,
                "status_color": status_color
            })

        # Sắp xếp nốt yếu từ điểm thấp nhất lên
        weak_spots.sort(key=lambda x: (x["avg_score"], -x["count"]))

        # Nếu người mới chưa có lịch sử, gợi ý 2 nốt căn bản quan trọng nhất
        if not weak_spots:
            weak_spots = [
                {
                    "note": "Đô 1",
                    "avg_score": 0.0,
                    "avg_cents": 0.0,
                    "count": 0,
                    "reason": NOTE_ADVICE_MAP["Đô 1"]["weakness_reason"],
                    "tip": NOTE_ADVICE_MAP["Đô 1"]["correction_tip"]
                },
                {
                    "note": "Fa 1",
                    "avg_score": 0.0,
                    "avg_cents": 0.0,
                    "count": 0,
                    "reason": NOTE_ADVICE_MAP["Fa 1"]["weakness_reason"],
                    "tip": NOTE_ADVICE_MAP["Fa 1"]["correction_tip"]
                }
            ]

        # 4. Sinh bài tập phục hồi 5 phút (Adaptive 5-Min Routine)
        recovery_routine = self.generate_recovery_routine(weak_spots)

        total_sessions = profile_data.get("tong_phien_tich_luy", profile_data.get("tong_phien", 0))

        return {
            "success": True,
            "student_total_sessions": total_sessions,
            "overall_average_score": profile_data.get("diem_trung_binh", 0),
            "note_matrix": matrix,
            "weak_spots": weak_spots[:3],
            "top_weak_note": weak_spots[0]["note"] if weak_spots else "Đô 1",
            "recovery_routine": recovery_routine
        }

    def generate_recovery_routine(self, weak_spots: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Tự động thiết kế bài tập 5 phút thích ứng dựa trên các nốt yếu nhất.
        Gồm 3 phần: Khởi động hơi dài -> Chuyển ngón liền kề -> Thử thách nhịp điệu.
        """
        primary_weak = weak_spots[0]["note"] if weak_spots else "Đô 1"
        secondary_weak = weak_spots[1]["note"] if len(weak_spots) > 1 else "Sol 1"

        routine_id = f"routine_{primary_weak.lower().replace(' ', '')}"
        title = f"Bài Tập Củng Cố 5 Phút: Khắc Phục Nốt {primary_weak} & {secondary_weak}"

        steps = [
            {
                "step": 1,
                "title": f"Luyện Hơi Dài (Long Tone) Nốt {primary_weak}",
                "duration": "1.5 phút",
                "goal": "Thổi 3 hơi dài (mỗi hơi 4 giây), giữ kim đồng hồ Tuner dao động trong phạm vi ±10 cent.",
                "target_note": primary_weak
            },
            {
                "step": 2,
                "title": f"Luyện Chuyển Ngón Liền Kề: {secondary_weak} ➔ {primary_weak}",
                "duration": "1.5 phút",
                "goal": "Thổi luân phiên giữa 2 nốt, chú ý miết chặt mép ngón tay khi chuyển về nốt mục tiêu.",
                "target_notes": [secondary_weak, primary_weak]
            },
            {
                "step": 3,
                "title": f"Thử Thách Nhịp Điệu Game SoundCheck (90 BPM)",
                "duration": "2.0 phút",
                "goal": "Vào Game SoundCheck chơi đoạn nhạc mẫu chứa nốt này và đạt từ 80 điểm trở lên.",
                "exercise_id": "doremi"
            }
        ]

        return {
            "routine_id": routine_id,
            "title": title,
            "target_notes": [primary_weak, secondary_weak],
            "total_estimated_minutes": 5,
            "steps": steps,
            "teacher_encouragement": f"Chăm chỉ luyện 5 phút bài tập này mỗi ngày sẽ giúp ngón tay của bạn bịt kín nốt {primary_weak} một cách tự nhiên và hơi thổi tròn vành rõ tiếng!"
        }

    def _default_new_student_diagnosis(self) -> Dict[str, Any]:
        """Chẩn đoán mặc định dành cho học viên mới tinh."""
        weak = [
            {
                "note": "Đô 1",
                "avg_score": 0.0,
                "avg_cents": 0.0,
                "count": 0,
                "reason": NOTE_ADVICE_MAP["Đô 1"]["weakness_reason"],
                "tip": NOTE_ADVICE_MAP["Đô 1"]["correction_tip"]
            },
            {
                "note": "Fa 1",
                "avg_score": 0.0,
                "avg_cents": 0.0,
                "count": 0,
                "reason": NOTE_ADVICE_MAP["Fa 1"]["weakness_reason"],
                "tip": NOTE_ADVICE_MAP["Fa 1"]["correction_tip"]
            }
        ]
        return {
            "success": True,
            "student_total_sessions": 0,
            "overall_average_score": 0,
            "note_matrix": [
                {"note": n, "practiced_count": 0, "average_score": 0, "status": "Chưa luyện", "status_color": "gray"}
                for n in STANDARD_NOTES
            ],
            "weak_spots": weak,
            "top_weak_note": "Đô 1",
            "recovery_routine": self.generate_recovery_routine(weak)
        }
