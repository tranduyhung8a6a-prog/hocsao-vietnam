"""
Module sheet_exporter.py — Xuất kết quả bóc tách bài hát thành bài tập JSON tương thích với Game SoundCheck và Cảm âm sáo trúc.
"""

import re
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger("loi_bai_hat.sheet_exporter")

HOLE_MAP = {
    "đô 1": 6, "rê 1": 5, "mi 1": 4, "fa 1": 3, "fa# 1": 3,
    "sol 1": 2, "la 1": 1, "sib 1": 2, "si 1": 0,
    "đô 2": 2, "đố 2": 2, "rê 2": 5, "mi 2": 4, "fa 2": 3,
    "sol 2": 2, "la 2": 1, "si 2": 0, "đô 3": 2
}


class SheetExporter:
    """Xuất bản nhạc sáo trúc thành bài tập JSON cho hệ thống HọcSáo."""

    @staticmethod
    def export_to_game_format(
        song_id: str,
        song_title: str,
        detected_notes: List[Dict[str, Any]],
        tempo_bpm: float = 90.0,
        time_signature: str = "2/4",
        output_dir: Optional[Path] = None
    ) -> Dict[str, Any]:
        """
        Chuyển danh sách nốt nhận diện được thành cấu trúc bài tập JSON chuẩn của game.
        """
        formatted_notes = []
        for idx, n in enumerate(detected_notes):
            n_name = n.get("note", "Sol 1")
            clean_k = n_name.strip().lower()
            hole_num = HOLE_MAP.get(clean_k, 2)

            # Lấy chữ cái Tây
            western = n.get("western", "G4")
            tone = re.sub(r"[0-9]", "", western)

            formatted_notes.append({
                "note": n_name,
                "tone": tone if tone else "G",
                "octave": n.get("octave", 4),
                "time": round(float(n.get("start_time", idx * 0.8)), 2),
                "duration": round(float(n.get("duration", 0.6)), 2),
                "hole": hole_num,
                "viet": n_name,
                "solfege": n.get("solfege", "5")
            })

        difficulty = "Cơ bản"
        if len(formatted_notes) > 40 or tempo_bpm > 110:
            difficulty = "Nâng cao"
        elif len(formatted_notes) > 20:
            difficulty = "Trung bình"

        cam_am_lines = []
        current_chunk = []
        for fn in formatted_notes:
            current_chunk.append(fn["solfege"])
            if len(current_chunk) >= 8:
                cam_am_lines.append("  ".join(current_chunk))
                current_chunk = []
        if current_chunk:
            cam_am_lines.append("  ".join(current_chunk))
        cam_am_text = "\n".join(cam_am_lines)

        exercise_data = {
            "id": song_id,
            "ten_bai": song_title,
            "do_kho": difficulty,
            "tempo_bpm": round(tempo_bpm, 1),
            "nhip": time_signature,
            "tong_so_not": len(formatted_notes),
            "mo_ta": f"Bài sáo '{song_title}' được trích xuất tự động bằng AI, nhịp {time_signature}, tốc độ {round(tempo_bpm)} BPM.",
            "cam_am": cam_am_text,
            "danh_sach_not": formatted_notes
        }

        # Lưu file JSON nếu có output_dir
        if output_dir:
            try:
                out_path = Path(output_dir) / f"{song_id}.json"
                with open(out_path, "w", encoding="utf-8") as f:
                    json.dump(exercise_data, f, ensure_ascii=False, indent=2)
                logger.info(f"Đã lưu bài tập mới tại {out_path}")
            except Exception as e:
                logger.warning(f"Lỗi khi lưu bài tập JSON: {e}")

        return exercise_data
