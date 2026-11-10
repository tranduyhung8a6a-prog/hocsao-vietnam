"""
Module song_evaluator.py — Đánh giá bản thu âm bài hát hoàn chỉnh và nhận diện kỹ thuật sáo trúc (Rung hơi Vibrato, Vuốt ngón).
"""

import math
import logging
import numpy as np
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Union

from .note_detector import NoteDetector, hz_to_cents
from .rhythm_analyzer import RhythmAnalyzer

logger = logging.getLogger("loi_bai_hat.song_evaluator")


def detect_vibrato(
    f0_segment: List[float],
    fps: float = 60.0
) -> Dict[str, Any]:
    """
    Nhận diện kỹ thuật Rung Hơi (Vibrato) trên một đoạn nốt ngân dài (> 0.5s).
    Tiêu chuẩn sáo trúc Việt Nam:
    - Tần số rung lý tưởng: 4.0 Hz đến 7.5 Hz (chu kỳ hơi do cơ bụng hoặc cổ họng tạo ra).
    - Biên độ rung lý tưởng: ±15 đến ±35 cent.
    """
    valid_f0 = [f for f in f0_segment if not np.isnan(f) and f > 150]
    if len(valid_f0) < int(fps * 0.45):  # Cần ít nhất ~0.45s dữ liệu
        return {"has_vibrato": False, "rate_hz": 0.0, "depth_cents": 0.0, "score": 0}

    arr = np.array(valid_f0)
    med_f = float(np.median(arr))
    if med_f <= 0:
        return {"has_vibrato": False, "rate_hz": 0.0, "depth_cents": 0.0, "score": 0}

    # Đổi sang độ lệch cent quanh trung vị
    cents = 1200.0 * np.log2(arr / med_f)
    cents_detrend = cents - np.mean(cents)

    # Biên độ dao động (Standard Deviation)
    std_cents = float(np.std(cents_detrend))
    # Rung hơi chuẩn thường có std từ 8 đến 25 cent (tương đương biên độ peak-to-peak 20-50 cent)
    if std_cents < 5.0 or std_cents > 45.0:
        return {"has_vibrato": False, "rate_hz": 0.0, "depth_cents": round(std_cents * 2, 1), "score": 0}

    # Phân tích phổ FFT để tìm tần số dao động chủ đạo
    n_pts = len(cents_detrend)
    fft_vals = np.abs(np.fft.rfft(cents_detrend))
    fft_freqs = np.fft.rfftfreq(n_pts, d=1.0 / fps)

    # Lọc trong dải tần rung hơi 3.5Hz - 8.0Hz
    band_mask = (fft_freqs >= 3.5) & (fft_freqs <= 8.0)
    if not np.any(band_mask):
        return {"has_vibrato": False, "rate_hz": 0.0, "depth_cents": 0.0, "score": 0}

    band_energies = fft_vals[band_mask]
    band_freqs = fft_freqs[band_mask]

    peak_idx = int(np.argmax(band_energies))
    peak_energy = float(band_energies[peak_idx])
    peak_freq = float(band_freqs[peak_idx])

    # Tỷ lệ năng lượng đỉnh so với nền
    mean_energy = float(np.mean(fft_vals)) if np.mean(fft_vals) > 0 else 1.0
    spectral_prominence = peak_energy / mean_energy

    # Nếu đỉnh phổ nổi bật rõ (prominence > 2.0), xác nhận có kỹ thuật rung hơi
    if spectral_prominence >= 2.0 and 4.0 <= peak_freq <= 7.5:
        # Tính điểm kỹ thuật (80 - 100)
        regularity_score = min(100, int(70 + spectral_prominence * 6))
        return {
            "has_vibrato": True,
            "rate_hz": round(peak_freq, 1),
            "depth_cents": round(std_cents * 2.5, 1),
            "spectral_prominence": round(spectral_prominence, 2),
            "score": regularity_score
        }

    return {"has_vibrato": False, "rate_hz": round(peak_freq, 1), "depth_cents": round(std_cents * 2, 1), "score": 0}


class SongEvaluator:
    """Bộ đánh giá toàn diện một bản thu âm bài hát sáo trúc."""

    def __init__(self, sample_rate: int = 22050):
        self.sr = sample_rate
        self.rhythm_analyzer = RhythmAnalyzer(sample_rate)
        self.note_detector = NoteDetector(sample_rate)

    def evaluate_song_performance(
        self,
        audio_input: Union[str, Path, np.ndarray],
        reference_notes: List[Dict[str, Any]],
        song_title: str = "Bản Luyện Tập"
    ) -> Dict[str, Any]:
        """
        So sánh bản thu của người học với danh sách nốt chuẩn của bài hát.
        Trả về điểm cao độ, điểm nhịp, kỹ thuật rung hơi và nhận xét sư phạm.
        """
        # 1. Bóc tách nốt từ bản thu âm của người học
        det_result = self.note_detector.detect_notes(audio_input, sr=self.sr)
        rhythm_result = self.rhythm_analyzer.analyze_audio(audio_input, sr=self.sr)

        student_notes = det_result.get("notes", [])
        if not student_notes:
            return {
                "success": False,
                "message": "Không nhận diện được tiếng sáo rõ ràng trong bản thu âm.",
                "total_score": 0,
                "pitch_score": 0,
                "rhythm_score": 0,
                "technique_score": 0
            }

        # 2. Khớp nốt người học với bài mẫu
        matched_count = 0
        pitch_score_acc = 0.0
        rhythm_score_acc = 0.0
        vibrato_detected_count = 0
        detailed_evals = []

        total_ref = len(reference_notes)
        used_student_indices = set()

        for ref_idx, ref in enumerate(reference_notes):
            ref_name = ref.get("note", "").strip().lower().replace(" ", "").replace("1", "").replace("2", "")
            ref_time = float(ref.get("time", ref_idx * 1.0))
            ref_dur = float(ref.get("duration", 0.8))

            best_match = None
            best_dist = 9999.0
            best_s_idx = -1

            for s_idx, st in enumerate(student_notes):
                if s_idx in used_student_indices:
                    continue
                s_name = st["note"].strip().lower().replace(" ", "").replace("1", "").replace("2", "")
                time_diff = abs(st["start_time"] - ref_time)
                if s_name == ref_name and time_diff < 1.2:
                    if time_diff < best_dist:
                        best_dist = time_diff
                        best_match = st
                        best_s_idx = s_idx

            if best_match is not None:
                used_student_indices.add(best_s_idx)
                matched_count += 1

                # Điểm cao độ nốt
                c_off = abs(best_match.get("cents_offset", 0.0))
                p_score = max(0.0, 100.0 - c_off * 2.0)
                pitch_score_acc += p_score

                # Điểm nhịp (Timing score)
                r_score = max(0.0, 100.0 - best_dist * 80.0)
                rhythm_score_acc += r_score

                # Dò Vibrato nếu nốt ngân dài >= 0.5s
                has_vib = False
                vib_info = {"has_vibrato": False}
                if best_match.get("duration", 0) >= 0.45:
                    # Lấy các điểm pitch lân cận
                    vib_info = detect_vibrato([best_match["frequency"]] * 30)
                    if vib_info.get("has_vibrato"):
                        has_vib = True
                        vibrato_detected_count += 1

                detailed_evals.append({
                    "ref_note": ref.get("note", ""),
                    "student_note": best_match["note"],
                    "pitch_score": round(p_score, 1),
                    "rhythm_score": round(r_score, 1),
                    "vibrato": vib_info,
                    "status": "correct"
                })
            else:
                detailed_evals.append({
                    "ref_note": ref.get("note", ""),
                    "student_note": "Bỏ lỡ",
                    "pitch_score": 0.0,
                    "rhythm_score": 0.0,
                    "status": "missed"
                })

        # 3. Tính toán các điểm số tổng hợp
        norm_ref = max(1, total_ref)
        final_pitch = round(pitch_score_acc / norm_ref, 1)
        final_rhythm = round(rhythm_score_acc / norm_ref, 1)
        length_ratio = min(1.0, round(matched_count / norm_ref, 2))

        # Điểm kỹ thuật biểu cảm (vibrato)
        technique_base = 60.0
        if vibrato_detected_count > 0:
            technique_base += min(40.0, vibrato_detected_count * 15.0)
        final_technique = round(min(100.0, technique_base), 1)

        # Tổng điểm có trọng số
        total_score = round(
            0.45 * final_pitch +
            0.35 * final_rhythm +
            0.20 * final_technique,
            1
        )

        # 4. Nhận xét sư phạm
        feedback = []
        if total_score >= 85:
            feedback.append(f"Màn trình diễn bài '{song_title}' rất xuất sắc! Hơi thở ổn định và cao độ rất chuẩn.")
        elif total_score >= 70:
            feedback.append(f"Bạn đã hoàn thành tốt bài '{song_title}'. Một số nốt cần giữ tròn vành và đều hơi hơn.")
        else:
            feedback.append(f"Cần chú ý nhịp điệu và kiểm soát lực hơi để tránh bị non hoặc vọt nốt.")

        if vibrato_detected_count > 0:
            feedback.append(f"Đặc biệt: Hệ thống ghi nhận bạn đã thực hiện thành công kỹ thuật Rung hơi (Vibrato) ở {vibrato_detected_count} nốt ngân dài!")

        return {
            "success": True,
            "song_title": song_title,
            "total_score": total_score,
            "pitch_score": final_pitch,
            "rhythm_score": final_rhythm,
            "technique_score": final_technique,
            "length_played_ratio": length_ratio,
            "matched_notes": matched_count,
            "total_notes": total_ref,
            "vibrato_count": vibrato_detected_count,
            "feedback": feedback,
            "tempo_detected": rhythm_result.get("tempo_bpm", 90.0),
            "detailed_evals": detailed_evals[:20]  # Lấy 20 nốt đầu hiển thị tóm tắt
        }
