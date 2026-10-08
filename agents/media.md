# وكيل الإعلام — الحلقات اليومية والنشر

## الهدف
حلقة قصيرة كل يوم (فيديو عمودي 1080×1920، أقل من 3 دقائق) تُنتج وتُنشر آلياً على يوتيوب وفيسبوك وإنستغرام وتليغرام، من دون تدخل المعلم.

## كيف يعمل النظام
- `.github/workflows/daily-episode.yml` يعمل يومياً 18:07 بتوقيت بغداد.
- `pipeline/run_daily.py` يبني حلقة اليوم: إن وُجد `content/episodes/YYYY-MM-DD.json` استعمله، وإلا أخذ المصطلحات التالية بالترتيب من `content/terms`.
- `pipeline/render.py`: شرائح HTML ← صور، وصوت عراقي (Edge TTS) ← فيديو بـ ffmpeg.
- `pipeline/publish.py`: النشر لكل منصة وُضعت أسرارها (راجع `docs/setup-publishing.md`).
- `state/published.json`: سجل ما نُشر.

## مهمة السبت الأسبوعية
1. افحص آخر 7 تشغيلات للـ workflow (أدوات GitHub: `actions_list`) و `state/published.json`. أي فشل: اقرأ السجل وأصلح السبب في `pipeline/` واختبره محلياً:
   `CHROMIUM_PATH=/opt/pw-browsers/chromium SSL_CERT_FILE=/root/.ccr/ca-bundle.crt python3 pipeline/run_daily.py --date <date> --dry-run`
   (ثبّت المتطلبات أولاً: `pip install -r pipeline/requirements.txt`).
2. اكتب حلقات الأيام السبعة القادمة (الأحد إلى السبت) في `content/episodes/` بالمخطط الموجود في `content/README.md`:
   - المصطلحات بالترتيب الذي وصل إليه آخر ملف حلقة أو آخر تاريخ في `state/published.json`، ولا تتجاوز ما كتبه وكيل الملزمة.
   - الجمعة: حلقة مراجعة لمصطلحات الأسبوع.
   - افتتاحية جذابة بلغة قريبة من طالب عراقي عمره 12 سنة، وسؤال اختبار ذكي، وعنوان يوتيوب أقل من 100 حرف، ووصف، ونص منشور.
3. تحقق أن كل ملف يُبنى: `python3 -c "import sys,datetime;sys.path.insert(0,'pipeline');import episode;episode.build(datetime.date.fromisoformat('<date>'))"`، ثم أنتج حلقة واحدة منها بـ `--dry-run` وانظر إلى الشرائح.
4. سطر واحد في `docs/weekly-media.md`: عدد الحلقات المنشورة، وأي عطل وإصلاحه.

## حدود
- لا تعدّل `content/terms` (ملك وكيل الملزمة)؛ أي خطأ علمي تلاحظه اكتبه في `docs/questions.md`.
- لا تضع أي مفتاح أو token في المستودع أبداً.

## Git
- الفرع الافتراضي للمستودع مباشرة. قبل كل دفع: `git pull --rebase`.
