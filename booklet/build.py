"""Assemble the booklet artifact from shell.html, settings.json, pages/*.html and content/terms.

    python3 booklet/build.py      # writes booklet/malzama.html

In a page fragment, <!--terms:id1,id2--> becomes the term-table rows for those ids,
numbered continuously within each chapter (a table resets nothing; a new chapter page does).
"""
import html
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
TITLE = "ملزمة المصطلحات العلمية – الأول المتوسط (المتميزين)"


def load_terms():
    terms = {}
    for path in sorted((ROOT / "content" / "terms").glob("unit-*.json")):
        for t in json.loads(path.read_text(encoding="utf-8"))["terms"]:
            terms[t["id"]] = t
    return terms


def main():
    terms = load_terms()
    counter = {"n": 0, "chapter": None}

    def rows(match):
        out = []
        for tid in match.group(1).split(","):
            t = terms[tid.strip()]
            counter["n"] += 1
            out.append(
                f'<tr><td class="n">{counter["n"]}</td><td class="ar tm">{html.escape(t["ar"])}</td>'
                f'<td class="en tm">{html.escape(t["en"])}</td><td class="d blue">{html.escape(t["def_ar"])}</td></tr>'
            )
        return "\n".join(out)

    pages = []
    for frag in sorted((HERE / "pages").glob("*.html")):
        for section in re.split(r"(?=<section )", frag.read_text(encoding="utf-8")):
            if not section.strip():
                continue
            chapter = re.search(r'data-chapter="([^"]*)"', section)
            chapter = chapter.group(1) if chapter else None
            if chapter != counter["chapter"]:
                counter.update(n=0, chapter=chapter)
            pages.append(re.sub(r"<!--terms:([^>]*)-->", rows, section).strip())

    settings = json.loads((HERE / "settings.json").read_text(encoding="utf-8"))
    shell = (HERE / "shell.html").read_text(encoding="utf-8")
    out = (shell.replace("__TITLE__", html.escape(TITLE))
                .replace("__SETTINGS__", json.dumps(settings, ensure_ascii=False).replace("<", "\\u003c"))
                .replace("__PAGES__", "\n".join(pages)))
    (HERE / "malzama.html").write_text(out, encoding="utf-8")
    print(f"booklet/malzama.html: {len(pages)} pages, {len(out)} bytes")


if __name__ == "__main__":
    main()
