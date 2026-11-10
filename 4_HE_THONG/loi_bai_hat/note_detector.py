"""
Module note_detector.py — Bóc tách cao độ (pitch tracking), lượng tử hóa nốt nhạc và chuyển thành cảm âm sáo trúc.
Sử dụng librosa.yin / pyin và thuật toán tự tương quan trên tín hiệu âm thanh đơn âm (monophonic).
"""

import math
import logging
import numpy as np
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Union

logger = logging.getLogger("loi_bai_hat.note_detector")

try:
    import librosa
    HAS_LIBROSA = True
except ImportError:
    HAS_LIBROSA = False

# Bảng tần số chuẩn cho Sáo Đô (C5) — từ Đô 1 (C4 ~261.6Hz) đến Đô 3 (C6 ~1046.5Hz)
FLUTE_STANDARD_NOTES = [
    {"name": "Đô 1", "solfege": "1", "western": "C4", "octave": 4, "freq": 261.63, "hole": 6},
    {"name": "Rê 1", "solfege": "2", "western": "D4", "octave": 4, "freq": 293.66, "hole": 5},
    {"name": "Mi 1", "solfege": "3", "western": "E4", "octave": 4, "freq": 329.63, "hole": 4},
    {"name": "Fa 1", "solfege": "4", "western": "F4", "octave": 4, "freq": 349.23, "hole": 3},
    {"name": "Fa# 1", "solfege": "4#", "western": "F#4", "octave": 4, "freq": 369.99, "hole": 3},
    {"name": "Sol 1", "solfege": "5", "western": "G4", "octave": 4, "freq": 392.00, "hole": 2},
    {"name": "La 1", "solfege": "6", "western": "A4", "octave": 4, "freq": 440.00, "hole": 1},
    {"name": "Sib 1", "solfege": "6b", "western": "Bb4", "octave": 4, "freq": 466.16, "hole": 2},
    {"name": "Si 1", "solfege": "7", "western": "B4", "octave": 4, "freq": 493.88, "hole": 0},
    {"name": "Đô 2", "solfege": "1*", "western": "C5", "octave": 5, "freq": 523.25, "hole": 2},
    {"name": "Đố 2", "solfege": "1*", "western": "C5", "octave": 5, "freq": 523.25, "hole": 2},
    {"name": "Rê 2", "solfege": "2*", "western": "D5", "octave": 5, "freq": 587.33, "hole": 5},
    {"name": "Mi 2", "solfege": "3*", "western": "E5", "octave": 5, "freq": 659.25, "hole": 4},
    {"name": "Fa 2", "solfege": "4*", "western": "F5", "octave": 5, "freq": 698.46, "hole": 3},
    {"name": "Sol 2", "solfege": "5*", "western": "G5", "octave": 5, "freq": 783.99, "hole": 2},
    {"name": "La 2", "solfege": "6*", "western": "A5", "octave": 5, "freq": 880.00, "hole": 1},
    {"name": "Si 2", "solfege": "7*", "western": "B5", "octave": 5, "freq": 987.77, "hole": 0},
    {"name": "Đô 3", "solfege": "1**", "western": "C6", "octave": 6, "freq": 1046.50, "hole": 2}
]


def hz_to_cents(freq: float, ref_freq: float) -> float:
    """Tính độ lệch cent giữa tần số thực tế và tần số danh định."""
    if freq <= 0 or ref_freq <= 0:
        return 0.0
    return 1200.0 * math.log2(freq / ref_freq)


def map_hz_to_flute_note(freq_hz: float) -> Dict[str, Any]:
    """Tìm nốt sáo gần nhất với tần số cho trước."""
    if freq_hz < 180 or freq_hz > 2200:
        return {"matched": False, "note": "---", "freq": freq_hz, "cents": 0.0}

    best_note = None
    min_cents_abs = 99999.0

    for item in FLUTE_STANDARD_NOTES:
        c = hz_to_cents(freq_hz, item["freq"])
        if abs(c) < min_cents_abs:
            min_cents_abs = abs(c)
            best_note = {**item, "cents": round(c, 1), "matched": True}

    if best_note and min_cents_abs <= 60:
        return best_note

    return {"matched": False, "note": "Ngoài âm vực", "freq": freq_hz, "cents": 0.0}


class NoteDetector:
    """Bộ bóc tách cao độ và phân đoạn nốt từ tín hiệu âm thanh."""

    def __init__(self, sample_rate: int = 22050):
        self.sr = sample_rate

    def detect_notes(
        self,
        audio_input: Union[str, Path, np.ndarray],
        sr: Optional[int] = None,
        min_note_duration: float = 0.09
    ) -> Dict[str, Any]:
        """
        Dò toàn bộ dãy nốt từ file hoặc numpy array.
        Trả về danh sách nốt kèm thời điểm bắt đầu, thời lượng và cảm âm số.
        """
        target_sr = sr or self.sr
        y: np.ndarray

        if isinstance(audio_input, (str, Path)):
            file_path = str(audio_input)
            if HAS_LIBROSA:
                try:
                    y, target_sr = librosa.load(file_path, sr=target_sr, mono=True)
                except Exception as e:
                    logger.error(f"Lỗi đọc file âm thanh {file_path}: {e}")
                    return {"success": False, "notes": [], "cam_am": ""}
            else:
                return {"success": False, "notes": [], "cam_am": ""}
        else:
            y = np.asarray(audio_input, dtype=np.float32)

        if len(y) < target_sr * 0.2:
            return {"success": False, "notes": [], "cam_am": ""}

        # 1. Trích xuất đường cong cao độ (F0 tracking)
        hop_length = int(target_sr * 0.015)  # 15ms per frame
        f0: np.ndarray
        times: np.ndarray

        if HAS_LIBROSA:
            try:
                # Sử dụng YIN algorithm của Librosa (cực kỳ nhạy và chuẩn xác với tiếng sáo)
                f0 = librosa.yin(
                    y,
                    fmin=200,
                    fmax=1300,
                    sr=target_sr,
                    hop_length=hop_length
                )
                times = librosa.times_like(f0, sr=target_sr, hop_length=hop_length)
            except Exception as e:
                logger.warning(f"Librosa yin thất bại: {e}. Dùng thuật toán tự tương quan.")
                f0, times = self._fallback_pitch_track(y, target_sr, hop_length)
        else:
            f0, times = self._fallback_pitch_track(y, target_sr, hop_length)

        # 2. Tính RMS năng lượng để lọc đoạn nghỉ / im lặng
        frame_len = hop_length * 2
        rms = np.array([
            np.sqrt(np.mean(y[i:i + frame_len] ** 2))
            for i in range(0, len(y) - frame_len, hop_length)
        ])
        min_len = min(len(f0), len(rms), len(times))
        f0 = f0[:min_len]
        rms = rms[:min_len]
        times = times[:min_len]

        rms_thresh = max(float(np.mean(rms) * 0.35), 0.008)

        # 3. Phân đoạn thành các nốt liên tục (Segmentation)
        detected_events: List[Dict[str, Any]] = []
        cur_note_name: Optional[str] = None
        cur_start: float = 0.0
        cur_pitches: List[float] = []

        for t, pitch, energy in zip(times, f0, rms):
            if energy < rms_thresh or np.isnan(pitch) or pitch < 220 or pitch > 1250:
                # Đoạn lặng hoặc không có cao độ rõ
                if cur_note_name and len(cur_pitches) >= 3:
                    dur = float(t - cur_start)
                    if dur >= min_note_duration:
                        med_pitch = float(np.median(cur_pitches))
                        note_info = map_hz_to_flute_note(med_pitch)
                        if note_info.get("matched"):
                            detected_events.append({
                                "note": note_info["name"],
                                "western": note_info["western"],
                                "solfege": note_info["solfege"],
                                "octave": note_info["octave"],
                                "start_time": round(cur_start, 3),
                                "duration": round(dur, 3),
                                "end_time": round(float(t), 3),
                                "frequency": round(med_pitch, 1),
                                "cents_offset": note_info["cents"]
                            })
                cur_note_name = None
                cur_pitches = []
                continue

            info = map_hz_to_flute_note(float(pitch))
            n_name = info.get("name") if info.get("matched") else None

            if n_name is None:
                continue

            if cur_note_name is None:
                cur_note_name = n_name
                cur_start = float(t)
                cur_pitches = [float(pitch)]
            elif cur_note_name == n_name:
                cur_pitches.append(float(pitch))
            else:
                # Đổi nốt mới
                dur = float(t - cur_start)
                if dur >= min_note_duration:
                    med_pitch = float(np.median(cur_pitches))
                    note_info = map_hz_to_flute_note(med_pitch)
                    if note_info.get("matched"):
                        detected_events.append({
                            "note": note_info["name"],
                            "western": note_info["western"],
                            "solfege": note_info["solfege"],
                            "octave": note_info["octave"],
                            "start_time": round(cur_start, 3),
                            "duration": round(dur, 3),
                            "end_time": round(float(t), 3),
                            "frequency": round(med_pitch, 1),
                            "cents_offset": note_info["cents"]
                        })
                cur_note_name = n_name
                cur_start = float(t)
                cur_pitches = [float(pitch)]

        # Đóng nốt cuối cùng nếu còn
        if cur_note_name and len(cur_pitches) >= 3:
            dur = float(times[-1] - cur_start)
            if dur >= min_note_duration:
                med_pitch = float(np.median(cur_pitches))
                note_info = map_hz_to_flute_note(med_pitch)
                if note_info.get("matched"):
                    detected_events.append({
                        "note": note_info["name"],
                        "western": note_info["western"],
                        "solfege": note_info["solfege"],
                        "octave": note_info["octave"],
                        "start_time": round(cur_start, 3),
                        "duration": round(dur, 3),
                        "end_time": round(float(times[-1]), 3),
                        "frequency": round(med_pitch, 1),
                        "cents_offset": note_info["cents"]
                    })

        # Ghép chuỗi cảm âm truyền thống (1 2 3 4 5 6 7...)
        cam_am_str = " - ".join([n["solfege"] for n in detected_events])

        return {
            "success": True,
            "total_notes": len(detected_events),
            "notes": detected_events,
            "cam_am": cam_am_str,
            "f0_trajectory": [round(float(p), 1) if not np.isnan(p) else 0.0 for p in f0[::3]],
            "times_trajectory": [round(float(t), 2) for t in times[::3]]
        }

    def _fallback_pitch_track(self, y: np.ndarray, sr: int, hop: int) -> Tuple[np.ndarray, np.ndarray]:
        """Tự tương quan đơn giản cho từng khung hình."""
        n_frames = len(y) // hop
        f0 = []
        times = []
        frame_len = hop * 3

        for i in range(n_frames):
            start = i * hop
            frame = y[start:start + frame_len]
            if len(frame) < frame_len:
                break
            # Autocorrelation
            corr = np.correlate(frame, frame, mode="full")
            corr = corr[len(corr) // 2:]
            # Tìm đỉnh sau zero-crossing
            d = np.diff(corr)
            start_search = int(sr / 1200)
            end_search = int(sr / 200)
            if end_search < len(corr):
                peak_idx = start_search + np.argmax(corr[start_search:end_search])
                freq = sr / peak_idx if peak_idx > 0 else np.nan
            else:
                freq = np.nan
            f0.append(freq)
            times.append(start / sr)

        return np.array(f0), np.array(times)
