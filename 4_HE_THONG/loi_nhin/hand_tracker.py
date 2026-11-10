"""
Module hand_tracker.py — Theo dõi tọa độ bàn tay, ước lượng độ che phủ 6 lỗ sáo và kiểm tra góc cầm sáo.
Hỗ trợ cả chế độ nhận landmarks từ Trình duyệt (MediaPipe) và xử lý OpenCV thuần.
"""

import math
import logging
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("loi_nhin.hand_tracker")


class HandTracker:
    """
    Theo dõi bàn tay và khớp ngón tay đối chiếu với 6 lỗ sáo trúc.
    """

    def __init__(self, hole_distance_threshold: float = 0.08):
        """
        :param hole_distance_threshold: Ngưỡng khoảng cách chuẩn hóa (0.0 - 1.0)
               giữa đầu ngón tay và tâm lỗ sáo để tính là bịt kín.
        """
        self.threshold = hole_distance_threshold

    def estimate_holes_from_landmarks(
        self,
        landmarks_left: Optional[List[Dict[str, float]]] = None,
        landmarks_right: Optional[List[Dict[str, float]]] = None,
        flute_axis: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Ước lượng trạng thái 6 lỗ sáo từ 21 điểm landmarks của 2 bàn tay.
        landmarks_left: Bàn tay trái (phụ trách Lỗ 1, 2, 3)
        landmarks_right: Bàn tay phải (phụ trách Lỗ 4, 5, 6)
        """
        # Trạng thái mặc định: Cả 6 lỗ mở (False) nếu chưa thấy tay
        holes = [False, False, False, False, False, False]
        hole_confidences = [0.0] * 6
        tilt_angle_deg = 0.0
        pose_feedback = []

        # 1. Xử lý cụm tay trái (Lỗ 1: Trỏ, Lỗ 2: Giữa, Lỗ 3: Áp út)
        # MediaPipe Landmark IDs:
        # Index tip: 8, Middle tip: 12, Ring tip: 16
        # Index pip: 6, Middle pip: 10, Ring pip: 14
        if landmarks_left and len(landmarks_left) >= 21:
            # Kiểm tra ngón gập hay duỗi (ngón co vào chạm lỗ sáo)
            # Ngón trỏ tay trái -> Lỗ 1
            idx_tip = landmarks_left[8]
            idx_pip = landmarks_left[6]
            idx_mcp = landmarks_left[5]
            # Độ cong hoặc khoảng cách ngón: khi ngón bịt lỗ sáo, đầu ngón tay thường hơi gập hoặc nằm gần thân sáo
            is_l1_closed = idx_tip.get("y", 0) > idx_pip.get("y", 0) - 0.02 or idx_tip.get("is_touching", False)
            holes[0] = bool(is_l1_closed)
            hole_confidences[0] = 0.9 if is_l1_closed else 0.85

            # Ngón giữa tay trái -> Lỗ 2
            mid_tip = landmarks_left[12]
            mid_pip = landmarks_left[10]
            is_l2_closed = mid_tip.get("y", 0) > mid_pip.get("y", 0) - 0.02 or mid_tip.get("is_touching", False)
            holes[1] = bool(is_l2_closed)
            hole_confidences[1] = 0.9 if is_l2_closed else 0.85

            # Ngón áp út tay trái -> Lỗ 3
            ring_tip = landmarks_left[16]
            ring_pip = landmarks_left[14]
            is_l3_closed = ring_tip.get("y", 0) > ring_pip.get("y", 0) - 0.02 or ring_tip.get("is_touching", False)
            holes[2] = bool(is_l3_closed)
            hole_confidences[2] = 0.88 if is_l3_closed else 0.85

        # 2. Xử lý cụm tay phải (Lỗ 4: Trỏ, Lỗ 5: Giữa, Lỗ 6: Áp út)
        if landmarks_right and len(landmarks_right) >= 21:
            # Ngón trỏ tay phải -> Lỗ 4
            idx_tip_r = landmarks_right[8]
            idx_pip_r = landmarks_right[6]
            is_l4_closed = idx_tip_r.get("y", 0) > idx_pip_r.get("y", 0) - 0.02 or idx_tip_r.get("is_touching", False)
            holes[3] = bool(is_l4_closed)
            hole_confidences[3] = 0.9 if is_l4_closed else 0.85

            # Ngón giữa tay phải -> Lỗ 5
            mid_tip_r = landmarks_right[12]
            mid_pip_r = landmarks_right[10]
            is_l5_closed = mid_tip_r.get("y", 0) > mid_pip_r.get("y", 0) - 0.02 or mid_tip_r.get("is_touching", False)
            holes[4] = bool(is_l5_closed)
            hole_confidences[4] = 0.9 if is_l5_closed else 0.85

            # Ngón áp út tay phải -> Lỗ 6
            ring_tip_r = landmarks_right[16]
            ring_pip_r = landmarks_right[14]
            is_l6_closed = ring_tip_r.get("y", 0) > ring_pip_r.get("y", 0) - 0.02 or ring_tip_r.get("is_touching", False)
            holes[5] = bool(is_l6_closed)
            hole_confidences[5] = 0.88 if is_l6_closed else 0.85

        # 3. Ước tính góc nghiêng ống sáo (nếu có vị trí cổ tay 2 bên: 0 = Wrist)
        if landmarks_left and landmarks_right and len(landmarks_left) >= 1 and len(landmarks_right) >= 1:
            wrist_l = landmarks_left[0]
            wrist_r = landmarks_right[0]
            dx = wrist_r.get("x", 0) - wrist_l.get("x", 0)
            dy = wrist_r.get("y", 0) - wrist_l.get("y", 0)
            if abs(dx) > 0.05:
                angle_rad = math.atan2(dy, dx)
                tilt_angle_deg = round(math.degrees(angle_rad), 1)

                # Góc cầm sáo tự nhiên của sáo ngang thường chúc nhẹ sang bên phải khoảng 10° - 35°
                if tilt_angle_deg > 45:
                    pose_feedback.append("Đuôi sáo đang chúc xuống hơi quá thấp (>45°), hãy nâng cánh tay phải lên cho tự nhiên.")
                elif tilt_angle_deg < -10:
                    pose_feedback.append("Đuôi sáo đang bị hếch lên cao, hãy hạ thấp khuỷu tay phải để đỡ mỏi cổ.")
                else:
                    pose_feedback.append("Góc nghiêng cầm sáo chuẩn (thoải mái, khoảng 15° - 30°).")

        avg_conf = sum(hole_confidences) / 6.0 if hole_confidences else 0.0

        return {
            "holes": holes,
            "hole_confidences": [round(c, 2) for c in hole_confidences],
            "average_confidence": round(avg_conf, 2),
            "tilt_angle_deg": tilt_angle_deg,
            "pose_feedback": pose_feedback,
            "has_left_hand": landmarks_left is not None and len(landmarks_left) > 0,
            "has_right_hand": landmarks_right is not None and len(landmarks_right) > 0
        }

    def process_direct_hole_states(self, hole_states: List[bool]) -> Dict[str, Any]:
        """Xử lý trực tiếp mảng 6 trạng thái nhận từ Web Client."""
        if len(hole_states) != 6:
            return {"holes": [False] * 6, "valid": False}
        return {
            "holes": [bool(h) for h in hole_states],
            "valid": True,
            "average_confidence": 0.95
        }
