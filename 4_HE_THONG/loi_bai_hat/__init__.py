"""
Module loi_bai_hat — Phân tích file nhạc bất kỳ, bóc tách cao độ & nhịp phách, xuất bài tập và chấm điểm bản thu hoàn chỉnh.
Phiên bản Giai đoạn 3: Tích hợp RhythmAnalyzer, NoteDetector, SongEvaluator, SheetExporter.
"""

from .rhythm_analyzer import RhythmAnalyzer
from .note_detector import NoteDetector, map_hz_to_flute_note, FLUTE_STANDARD_NOTES
from .song_evaluator import SongEvaluator, detect_vibrato
from .sheet_exporter import SheetExporter

__all__ = [
    "RhythmAnalyzer",
    "NoteDetector",
    "SongEvaluator",
    "SheetExporter",
    "map_hz_to_flute_note",
    "FLUTE_STANDARD_NOTES",
    "detect_vibrato"
]
