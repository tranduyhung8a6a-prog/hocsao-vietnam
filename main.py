"""
HọcSáo — Điểm vào chính phục vụ Cloud Deployment (Render, Railway, Hugging Face, Docker)
"""
import sys
import os
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
HE_THONG_DIR = ROOT_DIR / "4_HE_THONG"

for p in [str(HE_THONG_DIR), str(ROOT_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from giao_dien.main import app

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
