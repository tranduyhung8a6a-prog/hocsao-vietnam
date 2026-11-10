"""
Module loi_nhin — Xử lý thị giác máy tính qua Camera: nhận diện tư thế và thế bấm ngón sáo 6 lỗ.
Phiên bản Giai đoạn 3: Tích hợp HandTracker & FingerMapper với đối chiếu đa phương thức (Hình ảnh vs Âm thanh).
"""

from .finger_mapper import FingerMapper, STANDARD_FINGERINGS_C
from .hand_tracker import HandTracker

__all__ = ["FingerMapper", "HandTracker", "STANDARD_FINGERINGS_C"]
