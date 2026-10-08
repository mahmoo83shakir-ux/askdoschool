# askdoschool — مصطلحات العلوم للأول المتوسط (المتميزين)

نظام عمل واحد يخدم ثلاثة منتجات من مصدر بيانات واحد:

```
content/terms/*.json  (المصطلحات: إنكليزي، عربي، تعريف، مثال)
        │
        ├── 📘 الملزمة            ← وكيل الملزمة        (booklet/)
        ├── 🎮 منصة الألعاب 3D    ← وكيل منصة الألعاب   (platform/)
        └── 🎬 حلقة يومية          ← GitHub Actions + وكيل الإعلام (pipeline/)
                  └── يوتيوب · فيسبوك · إنستغرام · تليغرام
```

## الوكلاء والتذكيرات

الجدول بصيغة صفحة تفتحها على الهاتف: https://claude.ai/artifact/9rUDWD5fZNhe6tUwkeCXvj

| الوكيل | متى يعمل | ماذا يفعل | التعليمات |
|---|---|---|---|
| [وكيل الملزمة](https://claude.ai/code/session_014Kb6zUmcN2sN9jNHo7znk3) | الأحد–الخميس 15:47 | درس جديد يومياً: مصطلحات + صفحات الملزمة | [agents/booklet.md](agents/booklet.md) |
| [وكيل منصة الألعاب](https://claude.ai/code/session_01CaG9DBVdLZtyrdsntrnfmx) | الأحد، الثلاثاء، الخميس 16:43 | لعبة ثلاثية الأبعاد لكل فصل | [agents/platform-3d.md](agents/platform-3d.md) |
| [وكيل الإعلام](https://claude.ai/code/session_018rNQXKsqSALEheLPtjPAUF) | السبت 09:47 | يكتب حلقات الأسبوع ويصلح أعطال النشر | [agents/media.md](agents/media.md) |
| تذكير الصباح والبحث | يومياً 06:52 عدا الجمعة | إشعار: مهامك، حالة الحلقة، فكرة بحثية | [agents/morning-brief.md](agents/morning-brief.md) |
| المراجعة الأسبوعية | السبت 10:47 | تقرير التقدم والقرارات المطلوبة | [agents/weekly-review.md](agents/weekly-review.md) |
| الحلقة اليومية (GitHub Actions) | يومياً 18:07 | إنتاج الفيديو ونشره | [docs/setup-publishing.md](docs/setup-publishing.md) |

الجدول الكامل: [docs/schedule.md](docs/schedule.md) · أسئلة تنتظرك: [docs/questions.md](docs/questions.md)

## ما يلزمك مرة واحدة
1. أضف مفاتيح المنصات في أسرار GitHub حسب [docs/setup-publishing.md](docs/setup-publishing.md) (ابدأ بتليغرام، 10 دقائق).
2. اكتب اسمك ومعرّف قناتك في [config/channel.json](config/channel.json).
3. أجب عن الأسئلة في [docs/questions.md](docs/questions.md)، وأهمها لصق محادثة فكرة منصة الألعاب في جلسة وكيلها.
