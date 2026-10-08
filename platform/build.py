#!/usr/bin/env python3
"""Bundle the platform into one page: platform/dist/index.html.

Inlines src/style.css, the game scripts and app.js, and every content/terms/unit-*.json
(in unit order), so the published Artifact always carries the current terms.
Run after any change to src/ or to content/terms/, then republish dist/index.html.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
SRC = ROOT / "src"
# games first (app.js registers them), then the shell
SCRIPTS = ["games/term-lab.js", "app.js"]


def load_units():
    units = []
    for path in sorted((REPO / "content" / "terms").glob("unit-*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        if data.get("terms"):
            units.append(data)
    units.sort(key=lambda u: u.get("unit", 0))
    return units


def main():
    page = (SRC / "page.html").read_text(encoding="utf-8")
    css = (SRC / "style.css").read_text(encoding="utf-8")
    js = "\n".join((SRC / s).read_text(encoding="utf-8") for s in SCRIPTS)
    data = json.dumps(load_units(), ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    for marker, value in (("/*@CSS*/", css), ("/*@DATA*/", data), ("/*@JS*/", js)):
        assert page.count(marker) == 1, marker
        page = page.replace(marker, value)
    out = ROOT / "dist" / "index.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(page, encoding="utf-8")
    print(f"wrote {out.relative_to(REPO)} ({out.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
