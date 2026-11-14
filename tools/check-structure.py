# -*- coding: utf-8 -*-
#!/usr/bin/env python3
"""فحص بنيوي للصفحات المبنيّة.

الاستخدام:
    python3 tools/check-structure.py

يرصد ما لا يراه القارئ المبصر ولا يقيسه فاحص التباين: معرّفات مكررة تُفسد
المراسي، ومراسيَ بلا هدف، وعناوين وروابط فارغة، ورسومًا بلا اسم متاح،
وخلايا ترويسة بلا نطاق، ونصًّا لاتينيًّا داخل صفحة عربية بلا lang — فينطقه
القارئ الآلي بصوتٍ عربي فيخرج هذيانًا.

وُجد به أول مرة: 92 نصًّا لاتينيًّا بلا lang، و17 جدولًا بلا نطاق.
"""
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
findings = Counter()
detail = []


def note(kind, page, msg):
    findings[kind] += 1
    if len(detail) < 60:
        detail.append(f"  [{kind}] {page}: {msg}")


for p in sorted(ROOT.rglob("*.html")):
    page = p.relative_to(ROOT).as_posix()
    h = p.read_text(encoding="utf-8")

    # ١) معرّفات مكررة — تُفسد المراسي وتُبطل الصفحة
    ids = re.findall(r'\sid="([^"]+)"', h)
    for i, c in Counter(ids).items():
        if c > 1:
            note("معرّف مكرر", page, f"«{i}» ×{c}")

    # ٢) مرساة داخل الصفحة لا هدف لها
    for a in set(re.findall(r'href="#([^"]+)"', h)):
        if a and a not in ids:
            note("مرساة معطَّلة", page, f"#{a}")

    # ٣) عنوان أو رابط فارغ
    for tag in ["h1", "h2", "h3"]:
        for m in re.finditer(rf"<{tag}[^>]*>(.*?)</{tag}>", h, re.S):
            if not re.sub(r"<[^>]+>", "", m.group(1)).strip():
                note("عنوان فارغ", page, tag)
    for m in re.finditer(r"<a\s[^>]*>(.*?)</a>", h, re.S):
        inner = m.group(1)
        if not re.sub(r"<[^>]+>", "", inner).strip() and "aria-label" not in m.group(0):
            note("رابط بلا نصّ", page, m.group(0)[:60])

    # ٤) صورة أو رسم بلا اسم متاح
    for m in re.finditer(r"<img\s[^>]*>", h):
        if "alt=" not in m.group(0):
            note("صورة بلا بديل", page, m.group(0)[:60])
    for m in re.finditer(r"<svg\s[^>]*>", h):
        tag = m.group(0)
        if "aria-label" not in tag and "aria-labelledby" not in tag and 'aria-hidden="true"' not in tag:
            note("رسم بلا اسم", page, tag[:70])

    # ٥) كل خلية ترويسة على حدة. وفحصُ الجدول جملةً يمرّر خليةً واحدة
    #    ناقصة بين أخواتها السليمة، وهي بالضبط حالة التعديل اليدوي.
    # حدّ الكلمة ضروري: «<thead>» يبدأ بـ<th فيُحسب خليةً ناقصة بدونه،
    # وهو ما أوقع سكربت الإصلاح في تشويه كل وسوم thead في الموقع.
    bare = len(re.findall(r"<th(?=[\s>])(?![^>]*scope=)", h))
    if bare:
        note("ترويسة بلا scope", page, f"{bare} خلية")

    # ٦) وسمٌ مشوَّه: اسم العنصر ملتصق بسمة. نشأ من استبدال بلا حدّ كلمة،
    #    ويمرّ من كل الفحوص الأخرى لأنه يبدو وسمًا سليمًا فيه سمات.
    for m in re.finditer(r'<[a-z]+ [a-z-]+="[^"]*"[a-z]+>', h):
        note("وسم مشوَّه", page, m.group(0)[:50])

    # ٧) نصّ لاتيني داخل صفحة عربية بلا lang
    for m in re.finditer(r'<span dir="ltr"[^>]*>', h):
        if "lang=" not in m.group(0):
            note("لاتيني بلا lang", page, m.group(0)[:50])

    # ٨) المعالم الأساسية
    for landmark, pat in [("main", r"<main\b"), ("header", r"<header\b"), ("footer", r"<footer\b")]:
        if not re.search(pat, h):
            note("معلَم ناقص", page, landmark)

# ٩) وعدُ البطاقة: كل مرادف في data-entity يجب أن يوجد في نصّ صفحته.
#
# بطاقة الفهرس تَعِد القارئ بكلمات. فإن بحث عن كلمةٍ وعدتْه بها البطاقة ثم
# فتح الصفحة فلم يجدها، فالبطاقة كذبت عليه. وُجد هذا باليد لا بفحص، فصار فحصًا.
#
# حدٌّ معلوم: هنا تُحاكى قاعدتان من assets/app.js — الطيّ وحدّ الكلمة — فهما
# مكتوبتان مرتين وقد تتفرّقان. وتُقرأ المكافِئات من app.js نفسه لا تُنسخ،
# لأنها هي المتغيّرة باستمرار. وأيُّ تعديل في fold() هناك يُنقل هنا.
DIAC = re.compile(r"[ً-ْـ]")
LATIN = str.maketrans("áàâäãåéèêëíìîïóòôöõúùûüñçý", "aaaaaaeeeeiiiiooooouuuuncy")
PREFIX = re.compile(r"^[وفبكل]{0,2}(ال)?$")
# المدى ؀-ۿ يشمل ترقيمَ العربية (، ؛ ؟ ۔)، فعدُّه حرفَ كلمةٍ يُفسد شرط
# اللاحقة: «476،» تصير كلمةً واحدة فتُرفض مطابقةُ «476». حروفٌ وأرقامٌ لا ترقيم.
WORDCH = re.compile(r"[0-9a-z\u0621-\u064a\u0660-\u0669\u0671-\u06d3]")


def fold(s: str) -> str:
    out = []
    for c in s.lower().translate(LATIN):
        if DIAC.match(c):
            continue
        if c in "أإآٱ":
            c = "ا"
        elif c == "ى":
            c = "ي"
        elif c == "ة":
            c = "ه"
        elif c in "ؤئ":
            c = "ء"
        elif c.isspace():
            if not out or out[-1] == " ":
                continue
            c = " "
        else:
            d = "٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹".find(c)
            if d >= 0:
                c = str(d % 10)
        out.append(c)
    return "".join(out).strip()


def aliases() -> list[list[str]]:
    js = (ROOT / "assets" / "app.js").read_text(encoding="utf-8")
    block = re.search(r"const ALIASES = \[(.*?)\n  \]", js, re.S)
    if not block:
        return []
    return [
        [fold(w) for w in re.findall(r'"([^"]+)"', line)]
        for line in block.group(1).splitlines()
        if '"' in line
    ]


# لاحقةُ الكلمة القصيرة — تُحاكي TAIL في assets/app.js حرفًا بحرف
TAIL = re.compile(r"^(ا|ه|ي|ن|ت|ات|ان|ين|ون|يه|يا|ها|هم|نا|s)?$")
# والكلمةُ من حرفين أضيقُ — تُحاكي TAIL2 في app.js: ألفُ التنوين وجمعُ اللاتينية فقط
TAIL2 = re.compile(r"^(ا|s)?$")


def at_word(hay: str, word: str) -> bool:
    """مطابقةٌ في بداية كلمة، والسوابق المتصلة (و/ف/ب/ك/ل وال) تُعدّ حدًّا.

    وللكلمة القصيرة شرطٌ ثانٍ: ألا يتبعها إلا لاحقةُ إعرابٍ أو نسبة، لا حروفُ
    جذرٍ جديد — فلا تُطابِق «جما» كلمةَ «جماعي». وهذا نصُّ القاعدة في app.js.
    """
    short = len(word) <= 3
    i = hay.find(word)
    while i >= 0:
        start = i
        while start > 0 and WORDCH.match(hay[start - 1]):
            start -= 1
        if PREFIX.match(hay[start:i]):
            if not short:
                return True
            end = i + len(word)
            while end < len(hay) and WORDCH.match(hay[end]):
                end += 1
            if (TAIL2 if len(word) <= 2 else TAIL).match(hay[i + len(word):end]):
                return True
        i = hay.find(word, i + 1)
    return False


def card_promises() -> None:
    index_file = ROOT / "assets" / "search-index.json"
    cards_file = ROOT / "encyclopedia" / "index.html"
    if not (index_file.exists() and cards_file.exists()):
        return
    import json

    haystack = {}
    for e in json.loads(index_file.read_text(encoding="utf-8")):
        haystack[e["url"].strip("/")] = fold(
            " ".join([e["title"], e["desc"], *e.get("headings", []), e.get("text", "")])
        )
    groups = aliases()
    cards = re.findall(
        r'<a class="entity" data-entity="([^"]*)"[^>]*href="\.\./([^"]*)"', cards_file.read_text(encoding="utf-8")
    )
    for promise, href in cards:
        hay = haystack.get(href.strip("/"))
        if hay is None:
            continue
        for word in {w for w in fold(promise).split(" ") if len(w) > 1}:
            forms = next((g for g in groups if word in g), [word])
            if not any(at_word(hay, f) for f in forms):
                note("وعدٌ لا يسنده نصّ", f"encyclopedia → {href}", f"«{word}»")


card_promises()


# ١٠) تعشيشُ الوسوم في متون المحتوى.
#
# فحصُ التوازن يَعدّ المفتوحَ والمغلق فيَتساويان — ويَمرّ منه «</p>» بلا «<p>»
# إذا كان في المتن «<p>» آخرُ يَسُدّ العدّ. وُجدت الحالةُ باليد في موضعين،
# فصارت فحصًا: الإغلاقُ يُطابق آخرَ مفتوحٍ لا أيَّ مفتوح.
#
# والفحصُ على content/*.json لا على الصفحة المبنيّة، لأن المتنَ هو ما يُكتَب
# باليد؛ وتُستثنى الوسومُ الفارغةُ والمغلقةُ على نفسها (رسومُ SVG فيها كثير).
def nesting():
    import json

    void = {"br", "img", "hr", "input", "meta", "source", "use", "stop"}
    for f in sorted((ROOT / "content").glob("*.json")):
        doc = json.loads(f.read_text(encoding="utf-8"))
        for s in doc.get("sections", []):
            stack = []
            for m in re.finditer(r"<(/?)([a-zA-Z0-9]+)([^>]*)>", s.get("body", "")):
                closing, tag, rest = m.group(1), m.group(2).lower(), m.group(3)
                if closing:
                    if not stack or stack[-1] != tag:
                        note(
                            "تعشيشٌ مكسور",
                            f"{f.name} → {s['id']}",
                            f"إغلاقُ «{tag}» وآخرُ مفتوحٍ «{stack[-1] if stack else 'لا شيء'}»",
                        )
                    if stack:
                        stack.pop()
                elif rest.rstrip().endswith("/") or tag in void:
                    continue
                else:
                    stack.append(tag)
            if stack:
                note("وسمٌ لم يُغلَق", f"{f.name} → {s['id']}", "، ".join(stack))


nesting()


# ١١) مجموعاتُ مرادفاتٍ تَتشارك كلمة.
#
# المحرِّكُ يأخذ أولَ مجموعةٍ تَحمل الكلمة ويُهمل ما بعدها، فمجموعةٌ ثانيةٌ
# فيها الكلمةُ نفسُها تُسقِط مرادفاتِها الزائدة صامتةً: «كوستاريكا» كانت
# تَجد مجموعةً فيها costa وحدَها، فلا تَبلغها rica من مجموعةٍ أخرى. وُجدت
# ثلاثَ عشرةَ مجموعةً مكرَّرةً باليد، فصارت فحصًا.
def alias_overlap():
    groups = aliases()
    seen = {}
    for i, g in enumerate(groups):
        for w in g:
            if seen.get(w) == i:
                # الكلمةُ مرّتين في مجموعتها: صيغتان تَنطبعان واحدة
                note("مرادفٌ مكرَّرٌ في مجموعته", "assets/app.js",
                     f"«{w}» في «{'، '.join(g)}»")
            elif w in seen:
                note(
                    "مرادفٌ في مجموعتين",
                    "assets/app.js",
                    f"«{w}» في «{'، '.join(groups[seen[w]])}» و«{'، '.join(g)}»",
                )
            else:
                seen[w] = i


alias_overlap()


# ١٢) شرطُ الرفع في كل صفحةٍ غيرِ موثقة.
#
# كانت الشروطُ مكتوبةً نثرًا في أقسامٍ شتّى، وصفحةُ محصولٍ بلا شرطٍ أصلًا،
# وبقي في صفحةٍ رقمٌ صُحّح في موضعٍ آخرَ منها. فصار لكل صفحةٍ غيرِ موثقةٍ قسمٌ
# معرّفه raise بجدولٍ تُوسَم كلُّ صفوفه بحالها. والصفحةُ الموثقة لا تحمله:
# شرطٌ مستوفًى لا يُعرض شرطًا.
def raise_sections():
    import json

    for f in sorted((ROOT / "content").glob("*.json")):
        doc = json.loads(f.read_text(encoding="utf-8"))
        kind = (doc.get("status") or {}).get("kind")
        sec = next((s for s in doc.get("sections", []) if s["id"] == "raise"), None)
        if kind in ("partial", "research") and sec is None:
            note("صفحةٌ غيرُ موثقة بلا شرط رفع", f.name, kind)
        if kind == "ok" and sec is not None:
            note("صفحةٌ موثقة تحمل شرط رفع", f.name, "يُحذف القسم بعد الرفع")
        if sec is not None:
            rows = re.findall(r"<tr>(?:(?!</tr>).)*</tr>", sec["body"], re.S)
            body_rows = [r for r in rows if 'scope="col"' not in r]
            if not body_rows:
                note("شرطُ رفعٍ بلا صفوف", f.name, "raise")
            for r in body_rows:
                if not re.search(r'<span class="status (ok|partial|research)">', r):
                    note("شرطٌ بلا حال", f.name, re.sub(r"<[^>]+>", "", r)[:50])


raise_sections()


# ٦) الصورُ في المتن: بديلٌ عربيّ، وأبعادٌ، وعزوٌ وترخيصٌ مكتوبان قبلها.
#
# الصورُ الفوتوغرافية يملكها صاحبُ المشروع، وتدخل الموسوعةَ بحقوقها. فلا تُقبل
# صورةٌ في content/*.json إلا بثلاثة:
#   ‏alt عربيّ      — القارئُ الآليُّ ينطق البديل، والصفحةُ عربية؛ والبديلُ الفارغ أو
#                     اللاتينيُّ يترك الكفيفَ بلا صورةٍ ولا وصف.
#   ‏width وheight  — رقمان، يحفظان مكانَ الصورة قبل تحميلها فلا تقفز الصفحة.
#   تعليقُ عزوٍ وترخيص — قبل الوسم مباشرةً، بهذه الصيغة:
#                     <!-- عزو: اسمُ المصوِّر أو الجهة | ترخيص: اسمُ الترخيص أو الإذن -->
#                     فلا تُنشر صورةٌ لا يُعرف صاحبُها ولا بأيّ حقٍّ نُشرت.
#   عزوٌ ظاهر      — التعليقُ لا يراه القارئ. فتكون الصورةُ داخل <figure>، وبعدها
#                     <figcaption> فيه «تصوير: الاسم» أو «المصدر: الاسم»؛ والاسمُ نفسُه
#                     واردٌ في تعليق العزو — كي لا يُنسب في الظاهر إلى غير مَن في التعليق.
# والمثالان في tools/fixtures/ يُفحصان مع كل بناء: الناجحُ يجب أن يمرّ، والفاشلُ يجب
# أن يُرفض بأسبابه كلِّها — كي لا يتعطّل الفحصُ صامتًا.
IMG = re.compile(r"<img\b[^>]*>", re.I)
ARABIC = re.compile(r"[\u0621-\u064a]")
CREDIT = re.compile(r"<!--(?P<c>(?:(?!-->).)*)-->\s*$", re.S)
# «تصوير: …» أو «المصدر: …» في النصّ الظاهر، والاسمُ إلى أول فاصلةٍ أو نقطة
SHOWN = re.compile(r"(?:تصوير|المصدر)\s*:\s*([^،.؛|—\n]+)")
MARKS = re.compile(r"[\u064b-\u0652\u0670\u0640]")  # التشكيلُ والتطويل


def bare(s: str) -> str:
    """نصٌّ بلا وسومٍ ولا تشكيل، للمقابلة بين الاسم في التعليق والاسم في الظاهر."""
    return re.sub(r"\s+", " ", MARKS.sub("", re.sub(r"<[^>]+>", " ", s))).strip()


def image_rules(files) -> list[tuple[str, str, str]]:
    import json

    out = []
    for f in files:
        doc = json.loads(f.read_text(encoding="utf-8"))
        for s in doc.get("sections", []):
            body = s.get("body", "")
            for m in IMG.finditer(body):
                tag, where = m.group(0), f"{f.name} → {s['id']}"
                src = re.search(r'\bsrc="([^"]*)"', tag)
                name = (src.group(1).rsplit("/", 1)[-1] if src else tag)[:50]
                alt = re.search(r'\balt="([^"]*)"', tag)
                if alt is None or not alt.group(1).strip():
                    out.append(("صورةٌ بلا alt", where, name))
                elif not ARABIC.search(alt.group(1)):
                    out.append(("صورةٌ بديلُها غيرُ عربيّ", where, f"{name}: «{alt.group(1)[:40]}»"))
                if not (re.search(r'\bwidth="\d+"', tag) and re.search(r'\bheight="\d+"', tag)):
                    out.append(("صورةٌ بلا أبعاد", where, name))
                c = CREDIT.search(body[: m.start()])
                text = c.group("c") if c else ""
                if not (re.search(r"عزو\s*:\s*[^\s|]", text) and re.search(r"ترخيص\s*:\s*[^\s|]", text)):
                    out.append(("صورةٌ بلا عزوٍ وترخيص", where, name))
                # العزوُ الظاهر: <figcaption> بعد الصورة في <figure> نفسِها
                opened = body.rfind("<figure", 0, m.start())
                inside = opened >= 0 and "</figure>" not in body[opened : m.start()]
                close = body.find("</figure>", m.end())
                cap = re.search(r"<figcaption\b[^>]*>(.*?)</figcaption>", body[m.end() : close], re.S) if inside and close >= 0 else None
                shown = SHOWN.search(bare(cap.group(1))) if cap else None
                if not shown:
                    out.append(("صورةٌ بلا عزوٍ ظاهر", where, name))
                else:
                    who = shown.group(1).strip()
                    said = re.search(r"عزو\s*:\s*([^|]+)", bare(text))
                    if said and who not in said.group(1):
                        out.append(("عزوٌ ظاهرٌ يخالف التعليق", where, f"{name}: «{who}»"))
    return out


for kind, where, msg in image_rules(sorted((ROOT / "content").glob("*.json"))):
    note(kind, where, msg)

# المثالان: الناجحُ بلا ملاحظة، والفاشلُ بأسبابه الستّة كلِّها
_fx = ROOT / "tools" / "fixtures"
_ok = image_rules([_fx / "img-ok.json"])
_bad = Counter(k for k, _, _ in image_rules([_fx / "img-bad.json"]))
_want = {"صورةٌ بلا alt": 1, "صورةٌ بديلُها غيرُ عربيّ": 1, "صورةٌ بلا أبعاد": 1, "صورةٌ بلا عزوٍ وترخيص": 2,
         "صورةٌ بلا عزوٍ ظاهر": 2, "عزوٌ ظاهرٌ يخالف التعليق": 1}
if _ok:
    note("فحصُ الصور معطَّل", "tools/fixtures/img-ok.json", f"المثالُ الناجح رُفض: {_ok[0][0]}")
if dict(_bad) != _want:
    note("فحصُ الصور معطَّل", "tools/fixtures/img-bad.json", f"المتوقَّع {_want}، والحاصل {dict(_bad)}")

print(f"فُحصت {len(list(ROOT.rglob('*.html')))} صفحة.\n")
for line in detail:
    print(line)
print("\nالحصيلة:", dict(findings) if findings else "لا شيء")
raise SystemExit(1 if findings else 0)
