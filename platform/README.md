# منصة العلوم ثلاثية الأبعاد

Browser platform of 3D science-term games (Three.js 0.160.0 from cdnjs), Arabic RTL, phone first.

- `src/page.html` page skeleton, `src/style.css`, `src/app.js` (home page, game registry, progress in localStorage), `src/games/*.js` (one file per game).
- `build.py` inlines everything plus every `content/terms/unit-*.json` into `dist/index.html`, the file published as the Artifact.
- New unit in `content/terms/` → run `python3 platform/build.py` and republish; the unit and its games appear on the home page automatically.

Games (each unit gets all of them):

| id | name | state |
|---|---|---|
| `term-lab` | مختبر المصطلحات: drag (or tap) English cubes onto the Arabic-definition pads, 3 terms per level plus one decoy definition, stars per level | working prototype |
| `atom-race` | سباق الذرات: an atom runs down a corridor; the Arabic definition is the question, three doors carry English terms; switch lanes with the buttons, a tap on a screen third, a swipe or the arrow keys; three hearts, gates speed up from 9 s to 6 s | working prototype |
| `term-bank` | بنك المصطلحات: 3D flip cards (English face, Arabic face), definition and example under the card, file as known or review later; stars from first-pass known cards | working prototype |

Games share one WebGL renderer (`src/stage.js`). To add a game: write `src/games/<id>.js` exposing `start(unit, levelIndex, ui, onExit)`, `stop()`, `levelsOf(terms)`, add it to `SCRIPTS` in `build.py` and to `GAMES` in `src/app.js`.

Published Artifact: see `platform_url` in `config/channel.json`.
- Home: each unit is collapsible; the newest book chapter opens first («الفصل الحالي»). Short tones for right, wrong and level done, with a mute button in the game bar (remembered per browser).
- Units numbered 90+ (e.g. `unit-99`, terms waiting for their book chapter) show as «مصطلحات إضافية» instead of a chapter number.
