#!/usr/bin/env python3
"""يبني مناطق المحتوى في صفحات المداخل من ملفات content/.

الاستخدام:
    python3 tools/render.py

القالب (الترويسة والتذييل والتنقل والوسوم) يبقى في ملفات HTML ويُدار في
البناء؛ ما يُبنى هنا هو ما يُحرَّر: المقدّمة والأقسام والتنقل داخل الصفحة.
هذا يبقي التغيير محصورًا فيما يكتبه المحرر، فلا يمسّ ما جرى التحقق منه.

التنقل داخل الصفحة كان مكتوبًا يدويًا بجانب العناوين، فيفترقان عند التعديل.
صار يُشتق من الأقسام نفسها.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"

HERO = re.compile(r'<section class="page-hero">.*?</section>', re.S)
ARTICLE = re.compile(r'<article class="article">.*?</article>', re.S)
SIDE = re.compile(r'<aside class="side">.*?</aside>', re.S)

TITLE = re.compile(r"<title>.*?</title>", re.S)
DESC = re.compile(r'<meta name="description" content="[^"]*">')
OG_TITLE = re.compile(r'<meta property="og:title" content="[^"]*">')
OG_DESC = re.compile(r'<meta property="og:description" content="[^"]*">')

# عمود ثالث فارغ في شبكة التخطيط، بقي من موضع إدراج قديم لقسم «اقرأ أيضًا»
EMPTY_REL = re.compile(r'<section class="section tight-rel">\s*</section>')


def up_from(path: str) -> str:
    return "../" * (path.count("/") + 1)


def hero_html(data: dict) -> str:
    crumbs = "<span>←</span>".join(
        f"""<a href='{c["href"]}'>{c["label"]}</a>""" for c in data["crumbs"]
    )
    current = data.get("crumb_current") or data["title"]
    crumbs += f"<span>←</span><b>{current}</b>" if data["crumbs"] else f"<b>{current}</b>"

    status = ""
    if data.get("status"):
        up = up_from(data["path"])
        status = (
            f'<a class="status {data["status"]["kind"]} status-link" '
            f'href="{up}methodology/#states" '
            f'title="ما معنى حالات التوثيق؟">{data["status"]["label"]}</a>'
        )

    return (
        '<section class="page-hero"><div class="container">'
        f'<div class="crumbs">{crumbs}</div>{status}'
        f'<h1>{data["title"]}</h1><p>{data["lead"]}</p>'
        "</div></section>"
    )


def article_html(data: dict) -> str:
    body = data.get("lede_before_sections", "")
    for section in data["sections"]:
        body += f'<h2 id="{section["id"]}">{section["heading"]}</h2>{section["body"]}'
    return f'<article class="article">{body}</article>'


def side_html(data: dict) -> str:
    links = "".join(
        f'<a href="#{s["id"]}">{s["nav"]}</a>' for s in data["sections"]
    )
    return f'<aside class="side"><strong>في هذه الصفحة</strong>{links}</aside>'


def escape(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace('"', "&quot;")


def head_html(data: dict, html: str) -> str:
    """عنوان الصفحة ووصفها من ملف المحتوى نفسه.

    كانا مكتوبين في HTML يدويًا، وصفحة جديدة تُنسخ من قالب تورث عنوانه؛ فحملت
    ثماني عشرة صفحة عنوان «منهج قطرة» في تبويب المتصفح وفي بطاقة المشاركة.
    صار المصدر واحدًا: ما يُحرَّر في content/ هو ما يظهر.
    """
    title = escape(f"{data['title']} | قطرة")
    desc = escape(data.get("description") or data.get("lead", ""))
    html = TITLE.sub(f"<title>{title}</title>", html, count=1)
    html = DESC.sub(f'<meta name="description" content="{desc}">', html, count=1)
    html = OG_TITLE.sub(f'<meta property="og:title" content="{title}">', html, count=1)
    html = OG_DESC.sub(
        f'<meta property="og:description" content="{desc}">', html, count=1
    )
    return html


def render(data: dict, html: str) -> str:
    """يستبدل مناطق المحتوى في صفحة قائمة، ويترك القالب كما هو."""
    html = head_html(data, html)
    html = HERO.sub(lambda _: hero_html(data), html, count=1)
    html = ARTICLE.sub(lambda _: article_html(data), html, count=1)
    html = SIDE.sub(lambda _: side_html(data), html, count=1)
    html = EMPTY_REL.sub("", html)
    return html


def main() -> int:
    if not CONTENT.exists():
        print("لا يوجد مجلد content/. شغّل tools/extract.py أولًا.", file=sys.stderr)
        return 0

    count = 0
    for file in sorted(CONTENT.glob("*.json")):
        data = json.loads(file.read_text(encoding="utf-8"))
        page = ROOT / data["path"] / "index.html"
        if not page.exists():
            print(f"تخطٍّ: {data['path']} غير موجودة", file=sys.stderr)
            continue
        html = page.read_text(encoding="utf-8")
        built = render(data, html)
        if built != html:
            page.write_text(built, encoding="utf-8")
        count += 1

    print(f"بُني محتوى {count} صفحة من content/.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
