"""
content_loader.py - Tải và quản lý nội dung bài học Markdown
=============================================================
Quét thư mục lý thuyết, đọc frontmatter YAML, chuyển Markdown → HTML,
và cung cấp API tra cứu bài học có cache thông minh.

Tác giả: HocSao Team
"""

import logging
import os
import re
from pathlib import Path
from typing import Optional

try:
    import markdown
    MARKDOWN_AVAILABLE = True
except ImportError:
    MARKDOWN_AVAILABLE = False
    markdown = None

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Cấu hình Markdown
# ---------------------------------------------------------------------------

# Các extension Markdown được bật
MD_EXTENSIONS = [
    "tables",           # Bảng GFM
    "fenced_code",      # Code block ```
    "toc",              # Mục lục tự động
    "attr_list",        # Thuộc tính HTML trong Markdown
    "def_list",         # Definition lists
]

# Thư mục nội dung lý thuyết (tương đối so với gốc dự án)
CONTENT_SUBPATH = Path("4_HE_THONG") / "noi_dung" / "ly_thuyet"


# ---------------------------------------------------------------------------
# Hàm tiện ích
# ---------------------------------------------------------------------------

def _slug_from_path(path: Path) -> str:
    """
    Tạo slug URL từ tên file Markdown.

    Ví dụ: "01_bai_mo_dau.md" → "bai-mo-dau"
    """
    stem = path.stem  # Tên file không có extension
    # Loại bỏ tiền tố số (ví dụ: "01_", "02_")
    stem = re.sub(r"^\d+[_\-]?", "", stem)
    # Thay dấu gạch dưới → gạch ngang
    return stem.replace("_", "-").lower()


def _title_from_stem(stem: str) -> str:
    """
    Tạo tiêu đề từ tên file (khi không có frontmatter).

    Ví dụ: "bai_mo_dau" → "Bai Mo Dau"
    """
    # Loại bỏ tiền tố số
    clean = re.sub(r"^\d+[_\-]?", "", stem)
    # Thay gạch dưới/gạch ngang → khoảng trắng và title case
    return clean.replace("_", " ").replace("-", " ").title()


# ---------------------------------------------------------------------------
# Lớp ContentLoader chính
# ---------------------------------------------------------------------------
class ContentLoader:
    """
    Tải và quản lý nội dung bài học từ các file Markdown.

    Tự động quét thư mục lý thuyết, đọc frontmatter YAML,
    chuyển Markdown → HTML và cung cấp API tra cứu.

    Cache được tự động làm mới khi file thay đổi (kiểm tra modification time).

    Ví dụ:
        loader = ContentLoader(project_root=Path("/path/to/project"))
        lessons = loader.get_lesson_list()
        lesson  = loader.get_lesson("bai-mo-dau")
    """

    def __init__(self, project_root: Path):
        """
        Khởi tạo ContentLoader.

        Args:
            project_root: Đường dẫn thư mục gốc của dự án
        """
        self.project_root   = Path(project_root)
        self.content_dir    = self.project_root / CONTENT_SUBPATH

        # Cache nội dung bài học: {slug → lesson_dict}
        self._lesson_cache:   dict[str, dict] = {}

        # Cache danh sách bài học đã sắp xếp
        self._lesson_list:    list[dict]      = []

        # Thời gian sửa đổi mới nhất đã quét
        self._last_scan_mtime: float = 0.0

        # Parser Markdown
        if MARKDOWN_AVAILABLE and markdown is not None:
            self._md_parser = markdown.Markdown(
                extensions=MD_EXTENSIONS,
                extension_configs={
                    "toc": {
                        "title":    "Mục lục",
                        "toc_depth": 3,
                    }
                }
            )
        else:
            self._md_parser = None

        logger.info("ContentLoader khởi tạo, thư mục nội dung: %s", self.content_dir)

    # ------------------------------------------------------------------
    # API công khai
    # ------------------------------------------------------------------

    def get_lesson_list(self) -> list[dict]:
        """
        Lấy danh sách tất cả bài học đã sắp xếp theo thứ tự.

        Tự động làm mới cache nếu file có thay đổi.

        Returns:
            Danh sách dict, mỗi dict có:
            - slug (str):       Slug URL (ví dụ: "bai-mo-dau")
            - title (str):      Tiêu đề bài học
            - order (int):      Thứ tự sắp xếp
            - difficulty (str): Độ khó (vd: "cơ bản", "nâng cao")
            - tags (list):      Danh sách nhãn
        """
        self._refresh_if_needed()
        return self._lesson_list

    def get_lesson(self, slug: str) -> Optional[dict]:
        """
        Lấy nội dung chi tiết một bài học theo slug.

        Args:
            slug: Slug URL của bài học

        Returns:
            dict với các trường:
            - title (str):        Tiêu đề bài học
            - content_html (str): Nội dung HTML đã chuyển đổi
            - prev_slug (str|None): Slug bài trước
            - next_slug (str|None): Slug bài tiếp
            - difficulty (str):   Độ khó
            - tags (list):        Danh sách nhãn
            - toc (str):          HTML mục lục (nếu có)
            Trả về None nếu không tìm thấy.
        """
        self._refresh_if_needed()

        if slug not in self._lesson_cache:
            logger.warning("Không tìm thấy bài học slug='%s'", slug)
            return None

        lesson = self._lesson_cache[slug]

        # Tìm bài trước và bài tiếp
        slugs       = [l["slug"] for l in self._lesson_list]
        current_idx = slugs.index(slug) if slug in slugs else -1

        prev_slug = slugs[current_idx - 1] if current_idx > 0 else None
        next_slug = slugs[current_idx + 1] if 0 <= current_idx < len(slugs) - 1 else None

        return {
            **lesson,
            "prev_slug": prev_slug,
            "next_slug": next_slug,
        }

    def invalidate_cache(self):
        """Xóa cache để buộc quét lại lần sau."""
        self._lesson_cache.clear()
        self._lesson_list.clear()
        self._last_scan_mtime = 0.0
        logger.info("Cache nội dung đã được xóa.")

    # ------------------------------------------------------------------
    # Nội bộ: Làm mới cache
    # ------------------------------------------------------------------

    def _refresh_if_needed(self):
        """
        Kiểm tra xem có cần quét lại thư mục không.

        So sánh modification time của thư mục nội dung với lần quét cuối.
        Nếu có thay đổi (thêm/sửa/xóa file), tự động quét lại.
        """
        if not self.content_dir.exists():
            # Thư mục chưa tồn tại
            if not self._lesson_list:
                logger.warning("Thư mục nội dung không tồn tại: %s", self.content_dir)
            return

        # Tìm modification time mới nhất trong thư mục
        try:
            current_mtime = max(
                p.stat().st_mtime
                for p in self.content_dir.rglob("*.md")
            ) if list(self.content_dir.rglob("*.md")) else 0.0
        except Exception:
            current_mtime = 0.0

        # Nếu không có thay đổi, dùng cache cũ
        if abs(current_mtime - self._last_scan_mtime) < 0.1 and self._lesson_list:
            return

        # Quét lại thư mục
        logger.info("Phát hiện thay đổi nội dung, đang quét lại...")
        self._scan_and_build_index()
        self._last_scan_mtime = current_mtime

    def _scan_and_build_index(self):
        """
        Quét toàn bộ thư mục lý thuyết và xây dựng index bài học.

        Đọc frontmatter YAML từ mỗi file .md, tạo slug và metadata.
        Sắp xếp theo trường 'order' trong frontmatter (hoặc theo tên file).
        """
        if not self.content_dir.exists():
            self._lesson_list  = []
            self._lesson_cache = {}
            return

        # Quét thư mục lý thuyết ở chế độ an toàn (không tự ý xóa file)

        # Tìm tất cả file .md trong thư mục (và thư mục con)
        md_files = sorted(self.content_dir.rglob("*.md"))

        new_cache:    dict[str, dict] = {}
        lesson_metas: list[dict]      = []

        for md_path in md_files:
            try:
                meta = self._load_lesson_meta(md_path)
                if meta:
                    slug = meta["slug"]
                    new_cache[slug]  = meta
                    lesson_metas.append({
                        "slug":       slug,
                        "title":      meta["title"],
                        "order":      meta.get("order", 999),
                        "difficulty": meta.get("difficulty", ""),
                        "tags":       meta.get("tags", []),
                    })
            except Exception as exc:
                logger.error("Lỗi khi đọc file %s: %s", md_path, exc)

        # Sắp xếp theo order rồi theo title
        lesson_metas.sort(key=lambda x: (x["order"], x["title"]))

        self._lesson_cache = new_cache
        self._lesson_list  = lesson_metas

        logger.info(
            "Đã tải %d bài học từ %s",
            len(lesson_metas), self.content_dir
        )

    def _load_lesson_meta(self, md_path: Path) -> Optional[dict]:
        """
        Đọc một file Markdown và trích xuất metadata + nội dung.

        Args:
            md_path: Đường dẫn file .md

        Returns:
            dict với đầy đủ thông tin bài học, None nếu có lỗi.
        """
        # Đọc file và trích xuất frontmatter YAML bằng regex thuần túy
        raw_text = md_path.read_text(encoding="utf-8", errors="replace")

        metadata = {}
        content  = raw_text
        fm_match = re.match(r"^---\s*\r?\n(.*?)\r?\n---\s*\r?\n(.*)$", raw_text, re.DOTALL)
        if fm_match:
            content = fm_match.group(2)
            for line in fm_match.group(1).splitlines():
                if ":" in line:
                    k, v = line.split(":", 1)
                    k = k.strip()
                    v = v.strip().strip('"\'')
                    if v.startswith("[") and v.endswith("]"):
                        v = [item.strip().strip('"\'') for item in v[1:-1].split(",") if item.strip()]
                    metadata[k] = v

        # Tạo slug từ tên file
        slug = _slug_from_path(md_path)

        # Tiêu đề: ưu tiên frontmatter (hỗ trợ cả tiếng Anh và tiếng Việt), fallback từ tên file
        title = str(metadata.get("title", "") or metadata.get("tieu_de", "") or _title_from_stem(md_path.stem))

        # Thứ tự sắp xếp: frontmatter hoặc từ tiền tố số trong tên file
        order = int(metadata.get("order", 0) or metadata.get("thu_tu", 0) or 0)
        if order == 0:
            # Thử lấy từ tiền tố số tên file (vd: "03_bai..." → 3)
            match = re.match(r"^(\d+)", md_path.stem)
            if match:
                order = int(match.group(1))

        difficulty = str(metadata.get("difficulty", "") or metadata.get("do_kho", ""))
        tags = list(metadata.get("tags", []) or metadata.get("chu_de", []) or [])

        # Chuyển Markdown → HTML
        content_html, toc_html = self._render_markdown(content)

        return {
            "slug":         slug,
            "title":        title,
            "order":        order,
            "difficulty":   difficulty,
            "tags":         tags,
            "content_html": content_html,
            "toc":          toc_html,
            "source_path":  str(md_path),
        }

    def _render_markdown(self, content: str) -> tuple[str, str]:
        """
        Chuyển đổi Markdown sang HTML với các extension đã cấu hình.

        Args:
            content: Chuỗi Markdown

        Returns:
            (content_html, toc_html) - Nội dung HTML và mục lục HTML
        """
        # Tự động khởi tạo parser nếu chưa có
        if self._md_parser is None:
            try:
                import markdown as md_lib
                self._md_parser = md_lib.Markdown(
                    extensions=MD_EXTENSIONS,
                    extension_configs={
                        "toc": {
                            "title": "Mục lục",
                            "toc_depth": 3,
                        }
                    }
                )
            except Exception:
                self._md_parser = None

        if self._md_parser is not None:
            # Reset parser (cần thiết vì Markdown parser có trạng thái nội bộ)
            self._md_parser.reset()
            # Render Markdown → HTML
            html     = self._md_parser.convert(content)
            toc_html = getattr(self._md_parser, "toc", "")  # TOC HTML từ extension toc
            return html, toc_html
        else:
            # Fallback toàn diện khi không có thư viện markdown
            return self._fallback_render(content), ""

    def _fallback_render(self, content: str) -> str:
        """Bộ phân tích Markdown thuần Python không phụ thuộc thư viện ngoài."""
        lines = content.split("\n")
        out = []
        in_code = False
        in_table = False
        in_ul = False

        def inline_fmt(txt: str) -> str:
            # Images
            txt = re.sub(r'!\[(.*?)\]\((.*?)\)', r'<img src="\2" alt="\1" style="max-width:100%; border-radius:8px;">', txt)
            # Links
            txt = re.sub(r'\[(.*?)\]\((.*?)\)', r'<a href="\2">\1</a>', txt)
            # Bold
            txt = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', txt)
            # Italic
            txt = re.sub(r'\*(.*?)\*', r'<em>\1</em>', txt)
            # Inline code
            txt = re.sub(r'`(.*?)`', r'<code>\1</code>', txt)
            return txt

        for line in lines:
            s = line.strip()
            # Khối code
            if s.startswith("```"):
                if in_code:
                    out.append("</code></pre>")
                    in_code = False
                else:
                    out.append("<pre><code>")
                    in_code = True
                continue
            if in_code:
                out.append(line)
                continue

            # Bảng
            if s.startswith("|") and s.endswith("|"):
                if not in_table:
                    out.append('<div class="table-responsive"><table>')
                    in_table = True
                cells = [c.strip() for c in s[1:-1].split("|")]
                if re.match(r"^[\s\-:]+$", "".join(cells)):
                    continue
                tag = "td"
                out.append("<tr>" + "".join(f"<{tag}>{inline_fmt(c)}</{tag}>" for c in cells) + "</tr>")
                continue
            elif in_table:
                out.append("</table></div>")
                in_table = False

            # Danh sách
            if s.startswith("* ") or s.startswith("- "):
                if not in_ul:
                    out.append("<ul>")
                    in_ul = True
                out.append(f"<li>{inline_fmt(s[2:])}</li>")
                continue
            elif in_ul and not (s.startswith(" ") or s.startswith("\t")):
                out.append("</ul>")
                in_ul = False

            # Tiêu đề & thẻ khối
            if s.startswith("# "):
                out.append(f"<h1>{inline_fmt(s[2:])}</h1>")
            elif s.startswith("## "):
                out.append(f"<h2>{inline_fmt(s[3:])}</h2>")
            elif s.startswith("### "):
                out.append(f"<h3>{inline_fmt(s[4:])}</h3>")
            elif s.startswith("> "):
                out.append(f"<blockquote><p>{inline_fmt(s[2:])}</p></blockquote>")
            elif s == "---":
                out.append("<hr>")
            elif s == "":
                pass
            elif s.startswith("<"):
                out.append(line)
            else:
                out.append(f"<p>{inline_fmt(line)}</p>")

        if in_code: out.append("</code></pre>")
        if in_table: out.append("</table></div>")
        if in_ul: out.append("</ul>")
        return "\n".join(out)
