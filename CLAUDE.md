# askdoschool

Science-terms project for Iraqi First Intermediate (grade 7), distinguished schools. Arabic is the working language with the teacher; code and commit messages are in English.

- `content/terms/*.json` is the single source of truth (schema in `content/README.md`). The booklet, the 3D platform and the daily episodes all read it.
- Each agent owns its folders and stays inside them; briefs are in `agents/`:
  booklet agent → `content/terms/`, `booklet/` · platform agent → `platform/` (+ `platform_url` in `config/channel.json`) · media agent → `content/episodes/`, `pipeline/`, `.github/workflows/`.
- Several agents push to the default branch: always `git pull --rebase` before `git push`.
- Questions for the teacher go in `docs/questions.md`; the morning brief surfaces them.
- Never commit tokens or keys. Publishing credentials live only in GitHub Actions secrets.
- Local render test: `pip install -r pipeline/requirements.txt` then
  `CHROMIUM_PATH=/opt/pw-browsers/chromium SSL_CERT_FILE=/root/.ccr/ca-bundle.crt python3 pipeline/run_daily.py --date YYYY-MM-DD --dry-run`
