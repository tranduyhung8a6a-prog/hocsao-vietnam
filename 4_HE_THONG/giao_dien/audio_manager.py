"""
audio_manager.py - Quản lý thiết bị âm thanh
===============================================
Liệt kê, chọn và lưu cấu hình thiết bị đầu vào (microphone)
cho ứng dụng HocSao.

Tác giả: HocSao Team
"""

import json
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Thử import PyAudio
try:
    import pyaudio
    PYAUDIO_AVAILABLE = True
except ImportError:
    PYAUDIO_AVAILABLE = False
    logger.warning("PyAudio không tìm thấy. AudioManager sẽ hoạt động ở chế độ giả lập.")

# Tên file cấu hình thiết bị âm thanh
DEVICE_CONFIG_FILENAME = "audio_device.json"

# Thư mục cấu hình (tương đối so với gốc dự án)
CONFIG_SUBPATH = Path("4_HE_THONG") / "cau_hinh"


# ---------------------------------------------------------------------------
# Lớp AudioManager
# ---------------------------------------------------------------------------
class AudioManager:
    """
    Quản lý thiết bị âm thanh đầu vào (microphone) cho HocSao.

    Chức năng:
    - Liệt kê tất cả microphone đang kết nối
    - Cho phép người dùng chọn thiết bị ưa thích
    - Lưu lựa chọn vào file cấu hình (tự động tải lại lần sau)

    Ví dụ:
        manager = AudioManager(project_root=Path("/path/to/project"))
        devices = manager.list_input_devices()
        manager.set_device(devices[0]["index"])
        current = manager.get_current_device()
    """

    def __init__(self, project_root: Path):
        """
        Khởi tạo AudioManager.

        Args:
            project_root: Đường dẫn thư mục gốc dự án (để tìm file cấu hình)
        """
        self.project_root   = Path(project_root)
        self._config_path   = self.project_root / CONFIG_SUBPATH / DEVICE_CONFIG_FILENAME

        # Index thiết bị hiện tại (None = dùng mặc định hệ thống)
        self._current_device_index: Optional[int] = None

        # Cache thông tin thiết bị
        self._devices_cache: list[dict] = []

        # PyAudio instance (tạo tạm để liệt kê thiết bị)
        self._pa_instance = None

        # Tải cài đặt thiết bị từ file (nếu có)
        self._load_config()

        logger.info("AudioManager khởi tạo, thiết bị hiện tại: index=%s", self._current_device_index)

    # ------------------------------------------------------------------
    # API công khai
    # ------------------------------------------------------------------

    def list_input_devices(self) -> list[dict]:
        """
        Liệt kê tất cả thiết bị đầu vào (microphone) đang có.

        Returns:
            Danh sách dict, mỗi dict có:
            - index (int):       Index thiết bị trong PyAudio
            - name (str):        Tên thiết bị
            - channels (int):    Số kênh đầu vào tối đa
            - sample_rate (int): Tần số lấy mẫu mặc định (Hz)
            - is_current (bool): Có phải thiết bị đang chọn không
        """
        if not PYAUDIO_AVAILABLE:
            # Chế độ giả lập khi không có PyAudio
            return self._get_mock_devices()

        devices = []
        try:
            pa = pyaudio.PyAudio()

            for i in range(pa.get_device_count()):
                try:
                    info = pa.get_device_info_by_index(i)

                    # Chỉ lấy thiết bị có kênh đầu vào (microphone)
                    max_input_channels = int(info.get("maxInputChannels", 0))
                    if max_input_channels <= 0:
                        continue

                    devices.append({
                        "index":       i,
                        "name":        str(info.get("name", f"Thiết bị {i}")),
                        "channels":    max_input_channels,
                        "sample_rate": int(info.get("defaultSampleRate", 44100)),
                        "is_current":  (i == self._current_device_index),
                    })
                except Exception as exc:
                    logger.debug("Bỏ qua thiết bị index=%d: %s", i, exc)
                    continue

            pa.terminate()

            self._devices_cache = devices
            logger.debug("Đã liệt kê %d thiết bị đầu vào.", len(devices))

        except Exception as exc:
            logger.error("Lỗi khi liệt kê thiết bị âm thanh: %s", exc)
            # Trả về cache cũ nếu có
            return self._devices_cache

        return devices

    def set_device(self, index: int) -> bool:
        """
        Đặt thiết bị âm thanh hoạt động.

        Args:
            index: Index thiết bị trong PyAudio (-1 = dùng mặc định hệ thống)

        Returns:
            True nếu thành công, False nếu index không hợp lệ.
        """
        # Cho phép -1 để reset về thiết bị mặc định
        if index == -1:
            self._current_device_index = None
            self._save_config()
            logger.info("Đặt lại thiết bị âm thanh về mặc định hệ thống.")
            return True

        # Kiểm tra index hợp lệ
        devices = self.list_input_devices()
        valid_indices = [d["index"] for d in devices]

        if index not in valid_indices:
            logger.warning("Index thiết bị %d không hợp lệ. Hợp lệ: %s", index, valid_indices)
            return False

        self._current_device_index = index
        self._save_config()
        logger.info("Đã chọn thiết bị âm thanh index=%d.", index)
        return True

    def get_current_device(self) -> Optional[dict]:
        """
        Lấy thông tin thiết bị âm thanh hiện đang chọn.

        Returns:
            dict thông tin thiết bị, hoặc None nếu dùng mặc định hệ thống.
        """
        if self._current_device_index is None:
            # Trả về thiết bị mặc định
            return self._get_default_device()

        # Tìm trong danh sách
        devices = self.list_input_devices()
        for device in devices:
            if device["index"] == self._current_device_index:
                return device

        # Thiết bị đã chọn không còn kết nối
        logger.warning(
            "Thiết bị index=%d không còn tồn tại. Reset về mặc định.",
            self._current_device_index
        )
        self._current_device_index = None
        return self._get_default_device()

    @property
    def current_device_index(self) -> Optional[int]:
        """Index thiết bị hiện tại (None = mặc định hệ thống)."""
        return self._current_device_index

    # ------------------------------------------------------------------
    # Lưu và tải cấu hình
    # ------------------------------------------------------------------

    def _save_config(self):
        """Lưu lựa chọn thiết bị vào file JSON."""
        try:
            self._config_path.parent.mkdir(parents=True, exist_ok=True)
            config = {"device_index": self._current_device_index}
            self._config_path.write_text(
                json.dumps(config, ensure_ascii=False, indent=2),
                encoding="utf-8"
            )
            logger.debug("Đã lưu cấu hình âm thanh: %s", config)
        except Exception as exc:
            logger.error("Không thể lưu cấu hình âm thanh: %s", exc)

    def _load_config(self):
        """Tải lựa chọn thiết bị từ file JSON (nếu có)."""
        if not self._config_path.exists():
            logger.debug("Chưa có file cấu hình âm thanh, dùng mặc định.")
            return

        try:
            config = json.loads(self._config_path.read_text(encoding="utf-8"))
            self._current_device_index = config.get("device_index")
            logger.info("Đã tải cấu hình thiết bị: index=%s", self._current_device_index)
        except Exception as exc:
            logger.warning("Không thể đọc cấu hình âm thanh: %s", exc)
            self._current_device_index = None

    # ------------------------------------------------------------------
    # Phương thức nội bộ
    # ------------------------------------------------------------------

    def _get_default_device(self) -> Optional[dict]:
        """
        Lấy thông tin thiết bị đầu vào mặc định của hệ thống.

        Returns:
            dict thông tin thiết bị hoặc None nếu không lấy được.
        """
        if not PYAUDIO_AVAILABLE:
            return {
                "index":       0,
                "name":        "Microphone (mặc định - giả lập)",
                "channels":    1,
                "sample_rate": 16000,
                "is_current":  True,
            }

        try:
            pa   = pyaudio.PyAudio()
            info = pa.get_default_input_device_info()
            pa.terminate()

            return {
                "index":       int(info.get("index", 0)),
                "name":        str(info.get("name", "Mặc định")) + " (mặc định)",
                "channels":    int(info.get("maxInputChannels", 1)),
                "sample_rate": int(info.get("defaultSampleRate", 16000)),
                "is_current":  True,
            }
        except Exception as exc:
            logger.warning("Không lấy được thiết bị mặc định: %s", exc)
            return None

    @staticmethod
    def _get_mock_devices() -> list[dict]:
        """
        Trả về danh sách thiết bị giả lập (khi không có PyAudio).

        Dùng cho testing hoặc môi trường không có phần cứng âm thanh.
        """
        return [
            {
                "index":       0,
                "name":        "Microphone (giả lập - PyAudio không có)",
                "channels":    1,
                "sample_rate": 16000,
                "is_current":  True,
            }
        ]
