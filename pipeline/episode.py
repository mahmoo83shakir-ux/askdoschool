"""Builds the episode for a given date from content/terms and content/episodes."""
import datetime as dt
import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ORDINALS = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس"]


def load_config():
    return json.loads((ROOT / "config" / "channel.json").read_text(encoding="utf-8"))


def load_terms():
    """All terms in booklet order, each tagged with its unit."""
    terms = []
    for path in sorted((ROOT / "content" / "terms").glob("unit-*.json")):
        unit = json.loads(path.read_text(encoding="utf-8"))
        for term in unit["terms"]:
            terms.append({**term, "unit_title": unit["title_ar"], "unit": unit["unit"]})
    if not terms:
        raise SystemExit("content/terms is empty")
    return terms


def episode_number(config, date):
    start = dt.date.fromisoformat(config["start_date"])
    return (date - start).days + 1


def auto_quiz(picked, all_terms, rng):
    target = rng.choice(picked)
    others = [t for t in all_terms if t["id"] != target["id"]]
    choices = rng.sample(others, k=min(2, len(others))) + [target]
    rng.shuffle(choices)
    return {
        "question": f"ما المصطلح الذي يعني: {target['def_ar']}",
        "choices": [c["en"] for c in choices],
        "answer": choices.index(target),
    }


def auto_start(config, date, episodes_dir, all_terms, k):
    """Index of the first term for a day without an episode file: continue after the
    latest earlier (non-review) episode file, k terms per day since then."""
    order = {t["id"]: i for i, t in enumerate(all_terms)}
    last_date, last_index = dt.date.fromisoformat(config["start_date"]) - dt.timedelta(days=1), -1
    for path in sorted(episodes_dir.glob("*.json")):
        day = dt.date.fromisoformat(path.stem)
        if day >= date:
            break
        data = json.loads(path.read_text(encoding="utf-8"))
        ids = [i for i in data.get("terms", []) if i in order]
        if ids and not data.get("review"):
            last_date, last_index = day, max(order[i] for i in ids)
    return last_index + 1 + k * ((date - last_date).days - 1)


def build(date):
    config = load_config()
    all_terms = load_terms()
    by_id = {t["id"]: t for t in all_terms}
    number = episode_number(config, date)
    if number < 1:
        raise SystemExit(f"{date} is before start_date {config['start_date']}")

    episodes_dir = ROOT / "content" / "episodes"
    override_path = episodes_dir / f"{date.isoformat()}.json"
    override = json.loads(override_path.read_text(encoding="utf-8")) if override_path.exists() else {}

    review = False
    if override.get("terms"):
        missing = [i for i in override["terms"] if i not in by_id]
        if missing:
            raise SystemExit(f"{override_path.name}: unknown term ids {missing}")
        picked = [by_id[i] for i in override["terms"]]
        review = bool(override.get("review"))
    else:
        k = config["terms_per_episode"]
        first = auto_start(config, date, episodes_dir, all_terms, k)
        review = first >= len(all_terms)
        picked = [all_terms[(first + i) % len(all_terms)] for i in range(k)]

    rng = random.Random(date.isoformat())
    quiz = override.get("quiz") or auto_quiz(picked, all_terms, rng)
    names_en = " · ".join(t["en"] for t in picked)
    names_ar = "، ".join(t["ar"] for t in picked)
    title = override.get("title") or ("مراجعة: " if review else "") + names_ar
    tags = " ".join(config["hashtags"])

    hook = override.get("hook") or (
        f"أهلاً بكم في الحلقة {number} من سلسلة {config['series_title_ar']}. "
        + ("اليوم نراجع معاً ثلاثة مصطلحات." if review else f"اليوم نتعلم {len(picked)} مصطلحات جديدة.")
    )
    youtube_title = override.get("youtube_title") or f"{names_en} | {title} — {config['series_title_ar']} {number}"
    description = override.get("description") or "\n".join([
        f"الحلقة {number} من سلسلة {config['series_title_ar']} — {config['series_subtitle_ar']}.",
        "",
        *[f"• {t['en']} = {t['ar']}: {t['def_ar']}" for t in picked],
        "",
        "حلقة جديدة كل يوم. اكتب المصطلحات في دفترك وحل سؤال الحلقة في التعليقات.",
        *( [f"منصة الألعاب: {config['platform_url']}"] if config.get("platform_url") else [] ),
        "",
        tags,
    ])
    caption = override.get("caption") or "\n".join([
        f"📘 {config['series_title_ar']} | الحلقة {number}",
        *[f"{t.get('emoji', '•')} {t['en']} = {t['ar']}" for t in picked],
        "",
        "✍️ اكتبها في دفترك، وحل سؤال الحلقة!",
        tags,
    ])

    return {
        "date": date.isoformat(),
        "number": number,
        "review": review,
        "title": title,
        "hook": hook,
        "terms": picked,
        "ordinals": ORDINALS,
        "quiz": quiz,
        "youtube_title": youtube_title[:100],
        "description": description[:4900],
        "caption": caption,
        "tags": override.get("tags") or [t.lstrip("#").replace("_", " ") for t in config["hashtags"]],
        "config": config,
    }
