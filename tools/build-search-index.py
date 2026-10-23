#!/usr/bin/env python3
"""يبني فهرس بحث من نص كل صفحات الموقع.

الاستخدام:
    python3 tools/build-search-index.py

يقرأ صفحات الموقع ويستخرج العنوان والوصف والعناوين الفرعية ونص المحتوى،
ويكتب assets/search-index.json. لا يُطبَّع النص هنا: التطبيع يجري في
assets/app.js وحده، فلا تتعارض قاعدتان للتطبيع.

يعتمد على المكتبة القياسية فقط، ليعمل في بيئة البناء دون تثبيت اعتماديات.
"""

import json
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# العناصر التي لا تدخل الفهرس: التنقل المتكرر في كل صفحة
SKIP_TAGS = {"script", "style", "noscript"}
SKIP_CLASSES = {"crumbs", "side", "skip", "revnote", "related", "log", "catalog", "spec-kicker"}


class PageText(HTMLParser):
    """يستخرج نص <main> مع فصل العنوان والعناوين الفرعية."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.in_main = 0
        self.depth_skip = 0
        self.tag_stack: list[str] = []
        self.h1: list[str] = []
        self.headings: list[str] = []
        self.body: list[str] = []
        self._current: list[str] | None = None

    def handle_starttag(self, tag, attrs) -> None:
        attr = dict(attrs)
        classes = set((attr.get("class") or "").split())

        if tag == "main":
            self.in_main += 1
            return
        if not self.in_main:
            return

        if tag in SKIP_TAGS or classes & SKIP_CLASSES:
            self.depth_skip += 1
            self.tag_stack.append("__skip__")
            return

        self.tag_stack.append(tag)
        if tag == "h1":
            self._current = self.h1
        elif tag in ("h2", "h3", "h4"):
            self._current = self.headings

    def handle_endtag(self, tag) -> None:
        if tag == "main":
            self.in_main = max(0, self.in_main - 1)
            return
        if not self.in_main:
            return
        if self.tag_stack:
            popped = self.tag_stack.pop()
            if popped == "__skip__":
                self.depth_skip = max(0, self.depth_skip - 1)
        if tag in ("h1", "h2", "h3", "h4"):
            self._current = None

    def handle_data(self, data) -> None:
        if not self.in_main or self.depth_skip:
            return
        text = data.strip()
        if not text:
            return
        (self._current if self._current is not None else self.body).append(text)


def meta(html: str, name: str) -> str:
    match = re.search(rf'<meta name="{name}" content="([^"]*)"', html)
    return match.group(1) if match else ""


def collapse(parts: list[str]) -> str:
    return re.sub(r"\s+", " ", " ".join(parts)).strip()


def main() -> int:
    pages = []
    for file in sorted(ROOT.rglob("index.html")):
        html = file.read_text(encoding="utf-8")
        parser = PageText()
        parser.feed(html)

        url = file.parent.relative_to(ROOT).as_posix()
        url = "" if url == "." else url + "/"

        title = collapse(parser.h1) or meta(html, "description")
        pages.append(
            {
                "url": url,
                "title": title,
                "desc": meta(html, "description"),
                "headings": [collapse([h]) for h in parser.headings],
                "text": collapse(parser.body),
            }
        )

    out = ROOT / "assets" / "search-index.json"
    out.write_text(
        json.dumps(pages, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )

    size = out.stat().st_size / 1024
    words = sum(len(p["text"].split()) for p in pages)
    print(f"فُهرست {len(pages)} صفحة، {words} كلمة، الحجم {size:.1f} كيلوبايت.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
