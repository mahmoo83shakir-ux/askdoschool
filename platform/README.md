# منصة العلوم ثلاثية الأبعاد

Browser platform of 3D science-term games (Three.js 0.160.0 from cdnjs), Arabic RTL, phone first.

- `src/page.html` page skeleton, `src/style.css`, `src/app.js` (home page, game registry, progress in localStorage), `src/games/*.js` (one file per game).
- `build.py` inlines everything plus every `content/terms/unit-*.json` into `dist/index.html`, the file published as the Artifact.
- New unit in `content/terms/` → run `python3 platform/build.py` and republish; the unit and its games appear on the home page automatically.

Games (each unit gets all of them):

| id | name | state |
|---|---|---|
| `term-lab` | مختبر المصطلحات: drag (or tap) English cubes onto the Arabic-definition pads, 3 terms per level plus one decoy definition, stars per level | working prototype |
| `atom-race` | سباق الذرات | planned |
| `term-bank` | بنك المصطلحات | planned |

To add a game: write `src/games/<id>.js` exposing `start(unit, levelIndex, ui, onExit)`, `stop()`, `levelsOf(terms)`, add it to `SCRIPTS` in `build.py` and to `GAMES` in `src/app.js`.

Published Artifact: see `platform_url` in `config/channel.json`.
- Units numbered 90+ (e.g. `unit-99`, terms waiting for their book chapter) show as «مصطلحات إضافية» instead of a chapter number.
