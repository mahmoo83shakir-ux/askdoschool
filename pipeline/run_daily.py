"""Daily job: build today's episode, render it, publish it to every configured channel.

    python pipeline/run_daily.py                 # today (Baghdad time), render + publish
    python pipeline/run_daily.py --date 2026-10-09 --dry-run   # render only

state/published.json records what went out, so a re-run only retries channels that failed.
"""
import argparse
import datetime as dt
import json
import os
import shutil
import sys
import traceback
from pathlib import Path
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).resolve().parent))
import episode as episode_mod  # noqa: E402
import publish  # noqa: E402
import render  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
STATE = ROOT / "state" / "published.json"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", default="", help="YYYY-MM-DD; defaults to today in the channel timezone")
    parser.add_argument("--dry-run", action="store_true", help="render the video but publish nothing")
    args = parser.parse_args()

    config = episode_mod.load_config()
    date = dt.date.fromisoformat(args.date) if args.date else dt.datetime.now(ZoneInfo(config["timezone"])).date()
    ep = episode_mod.build(date)
    print(f"Episode {ep['number']} for {ep['date']}: {', '.join(t['en'] for t in ep['terms'])}")

    out_dir = ROOT / "out" / ep["date"]
    shutil.rmtree(out_dir, ignore_errors=True)
    video, cover = render.render(ep, out_dir)
    (out_dir / "episode.json").write_text(
        json.dumps({k: v for k, v in ep.items() if k != "config"}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Rendered {video} ({video.stat().st_size / 1e6:.1f} MB)")

    if args.dry_run:
        print("Dry run: nothing published.")
        return 0
    if os.environ.get("PAUSE_PUBLISHING", "").lower() == "true":
        print("PAUSE_PUBLISHING=true: nothing published.")
        return 0

    state = json.loads(STATE.read_text(encoding="utf-8")) if STATE.exists() else {}
    done = state.setdefault(ep["date"], {"number": ep["number"], "title": ep["title"]})
    failures = []
    for name, (enabled, upload) in publish.CHANNELS.items():
        if not enabled():
            print(f"- {name}: not configured, skipped")
            continue
        if name in done:
            print(f"- {name}: already published ({done[name]}), skipped")
            continue
        try:
            done[name] = upload(ep, video)
            print(f"- {name}: published {done[name]}")
        except Exception:
            traceback.print_exc()
            failures.append(name)
    STATE.parent.mkdir(exist_ok=True)
    STATE.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if failures:
        print(f"FAILED: {', '.join(failures)}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
