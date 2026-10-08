# إعداد النشر التلقائي (تفعله مرة واحدة)

حتى تُنشر الحلقات من دون تدخلك، يحتاج GitHub إلى مفاتيح حساباتك. كل مفتاح يوضع في:
**GitHub > المستودع askdoschool > Settings > Secrets and variables > Actions > New repository secret**.

أي منصة لا تضع مفاتيحها تُتجاوز تلقائياً، والباقي يعمل. يمكنك البدء بتليغرام لأنه أسهلها.

---

## 1) تليغرام (10 دقائق)

1. افتح [@BotFather](https://t.me/BotFather) واكتب `/newbot`، واحفظ الـ token.
2. أنشئ قناة (أو استعمل قناتك)، وأضف البوت **مشرفاً** بصلاحية النشر.
3. أضف السرين:
   - `TG_BOT_TOKEN` = الـ token
   - `TG_CHAT_ID` = اسم القناة مثل `@my_channel` (أو رقمها الذي يبدأ بـ `-100`)

## 2) يوتيوب (30 دقيقة)

1. ادخل [Google Cloud Console](https://console.cloud.google.com/) وأنشئ مشروعاً جديداً.
2. من **APIs & Services > Library** فعّل **YouTube Data API v3**.
3. من **OAuth consent screen**: اختر External، واملأ الاسم وبريدك، وأضف بريدك في Test users.
   ثم اضغط **Publish app** ليصبح In production. **هذه الخطوة ضرورية**، فبدونها ينتهي المفتاح بعد 7 أيام.
4. من **Credentials > Create credentials > OAuth client ID** اختر **Desktop app**، ونزّل ملف `client_secret.json`.
5. على حاسوبك (مرة واحدة):
   ```
   pip install google-auth-oauthlib
   python pipeline/get_youtube_token.py client_secret.json
   ```
   سيفتح المتصفح، فادخل بحساب القناة واضغط سماح. سيطبع ثلاث قيم.
6. أضف الأسرار الثلاثة: `YT_CLIENT_ID`، `YT_CLIENT_SECRET`، `YT_REFRESH_TOKEN`.

> **تنبيه مهم من يوتيوب:** المشاريع الجديدة غير المدققة تُرفع فيديوهاتها **خاصة (Private)** تلقائياً مهما كان الإعداد.
> لرفع هذا القيد قدّم طلب [YouTube API Services Audit](https://support.google.com/youtube/contact/yt_api_form) (مجاني، ويستغرق أياماً إلى أسابيع).
> إلى أن تتم الموافقة: الرفع يتم تلقائياً، وأنت تحوّل الفيديو إلى عام بضغطة من YouTube Studio.

## 3) فيسبوك وإنستغرام (45 دقيقة)

الشروط: صفحة فيسبوك تديرها، وحساب إنستغرام **احترافي** (Business أو Creator) مربوط بها.

1. من [Meta for Developers](https://developers.facebook.com/apps) أنشئ تطبيقاً من نوع **Business**.
2. أضف المنتجين: **Facebook Login for Business** و **Instagram Graph API**.
3. افتح [Graph API Explorer](https://developers.facebook.com/tools/explorer/)، واختر تطبيقك، واطلب الصلاحيات:
   `pages_show_list, pages_read_engagement, pages_manage_posts, publish_video, instagram_basic, instagram_content_publish, business_management`
   ثم اضغط Generate Access Token.
4. حوّل المفتاح إلى طويل الأمد من [Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/) (زر Extend Access Token).
5. في Graph API Explorer وبالمفتاح الطويل نفّذ: `me/accounts`. انسخ `id` صفحتك و `access_token` الخاص بها (مفتاح الصفحة المأخوذ من مفتاح طويل الأمد لا ينتهي).
6. نفّذ: `<page-id>?fields=instagram_business_account` وانسخ الرقم.
7. أضف الأسرار:
   - `FB_PAGE_ID` = رقم الصفحة
   - `FB_PAGE_TOKEN` = مفتاح الصفحة
   - `IG_USER_ID` = رقم حساب إنستغرام

يكفي أن يبقى التطبيق في وضع Development ما دمت أنت مدير التطبيق والصفحة.

## 4) تيك توك

واجهة النشر في تيك توك تشترط تدقيق التطبيق، وقبله تُنشر الفيديوهات خاصة فقط، لذلك لم تُفعَّل الآن.
البديل: نزّل الفيديو من تليغرام وارفعه يدوياً، أو اطلب من وكيل الإعلام إضافتها بعد حصولك على التدقيق.

---

## إعدادات اختيارية (Variables وليست Secrets)

من نفس الصفحة، تبويب **Variables**:

| المتغير | القيمة الافتراضية | المعنى |
|---|---|---|
| `YOUTUBE_PRIVACY` | `public` | أو `unlisted` أو `private` |
| `YOUTUBE_MADE_FOR_KIDS` | `true` | طلاب الأول المتوسط أعمارهم 12–13، وقانون حماية الأطفال (COPPA) يعدّ ما دون 13 أطفالاً. هذا يوقف التعليقات على يوتيوب. إن رأيت أن جمهورك الأساسي فوق 13 فاجعلها `false` |
| `PAUSE_PUBLISHING` | فارغ | ضع `true` لإيقاف النشر مؤقتاً |
| `GRAPH_API_VERSION` | `v26.0` | إصدار واجهة Meta |

## بيانات القناة

عدّل `config/channel.json`: اسمك (`teacher`)، ومعرّف قناتك (`handle`)، ورابط منصة الألعاب (`platform_url`). تظهر هذه في الفيديو والوصف.

## التجربة

1. GitHub > **Actions** > **الحلقة اليومية** > **Run workflow**، وفعّل `dry_run`.
2. بعد 5 دقائق تقريباً نزّل الفيديو من أسفل صفحة التشغيل (Artifacts) وشاهده.
3. شغّله مرة ثانية بدون `dry_run` لتنشر أول حلقة. بعدها يعمل وحده يومياً.

إذا فشل النشر تصلك رسالة من GitHub على بريدك، ويصلحه وكيل الإعلام في مراجعة السبت. إعادة التشغيل تكمل المنصات التي فشلت فقط ولا تكرر ما نُشر.
