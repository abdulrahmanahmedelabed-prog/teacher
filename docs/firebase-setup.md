# تشغيل «المعلم الذكي» بـ Gemini عبر Firebase — مجاناً وبدون أي مفتاح داخل التطبيق

المدة: حوالي 15 دقيقة، مرة واحدة فقط. كل الخطوات من حسابك في Google.

## لماذا Firebase؟
- هي الطريقة الرسمية من Google لاستخدام Gemini **داخل تطبيقات الموبايل والويب**.
- **مفتاح Gemini لا يوضع في التطبيق أبداً**: يبقى محفوظاً عند Google.
- **App Check** يتأكد أن كل طلب قادم من تطبيقنا الحقيقي، فلا يستطيع أحد استهلاك حصتك. وهو إلزامي لـ Firebase AI Logic منذ 2 نوفمبر 2026.
- خطة **Spark** المجانية تدعم Gemini Developer API. **لا تُضف بطاقة دفع ولا تنتقل لخطة Blaze**، فعندها لا يمكن أن تُحاسَب على شيء. عند انتهاء الحصة المجانية لليوم يرفض Google الطلب، ويعرض التطبيق للطالب رسالة تربوية حتى الغد.

## الخطوة 1: إنشاء مشروع Firebase
1. افتح <https://console.firebase.google.com> وسجّل الدخول بحساب Google.
2. **Create a project** واكتب الاسم `rehla-alawda`. يمكنك إيقاف Google Analytics.
3. تأكد أن الخطة **Spark (No-cost)**.

## الخطوة 2: تفعيل Gemini (Firebase AI Logic)
1. من القائمة الجانبية: **AI Logic** ثم **Get started**.
2. اختر **Gemini Developer API**، فيُنشئ Firebase مفتاح Gemini خاصاً بالمشروع ويحفظه عنده تلقائياً.

> المفتاح الذي أنشأته سابقاً في AI Studio لم نعد نحتاجه. لأنك شاركته في المحادثة، **احذفه** من <https://aistudio.google.com/apikey> احتياطاً.

## الخطوة 3: تسجيل التطبيق (Web app)
1. من **Project settings** (رمز الترس) ثم **Your apps** اختر رمز الويب `</>`.
2. اكتب الاسم `rehla-app` ثم **Register app**.
3. سيظهر كائن `firebaseConfig`. انسخه كاملاً، وهو يشبه هذا:
```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "rehla-alawda.firebaseapp.com",
  projectId: "rehla-alawda",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "1:...:web:..."
};
```
هذه القيم **عامة بطبيعتها** (مصممة لتوضع في التطبيقات)، والحماية تأتي من App Check في الخطوة التالية.

## الخطوة 4: حماية App Check بـ reCAPTCHA v3
1. افتح <https://www.google.com/recaptcha/admin/create>:
   - **Label**: `rehla`
   - **reCAPTCHA type**: **Score based (v3)**
   - **Domains**: أضف كلّاً من:
     - `abdulrahmanahmedelabed-prog.github.io` (الموقع)
     - `localhost` (تطبيق Android يعمل على `https://localhost`)
   - **Submit**: سيظهر لك **Site key** و**Secret key**.
2. في Firebase افتح **App Check** ثم **Apps**، واختر تطبيق الويب ثم **reCAPTCHA**. الصق **Secret key** ثم **Save**.
3. في **App Check** ثم **APIs**، اختر **Firebase AI Logic** ثم **Enforce**.

## الخطوة 5: أرسل لي (أو ضع في `www/data.js`)
- كائن `firebaseConfig` كاملاً.
- **Site key** فقط من reCAPTCHA. **لا ترسلي Secret key لأحد.**

```js
const FIREBASE_CONFIG = { apiKey: "...", authDomain: "...", projectId: "...", storageBucket: "...", messagingSenderId: "...", appId: "..." };
const AI_CONFIG = { proxyUrl: "", recaptchaSiteKey: "SITE_KEY_HERE", model: "gemini-3.5-flash-lite", deepModel: "gemini-3.8-flash" };
```

## كيف يعمل داخل التطبيق
1. يضيف الطالب كتابه (PDF أو صورة صفحة)، فيُحفظ على هاتفه.
2. عند أول سؤال على درس ما، يُرسل الكتاب **مرة واحدة** فيستخرج Gemini نص الدرس، ويُحفظ النص على الهاتف.
3. كل الأسئلة بعدها ترسل **نص الدرس فقط**، فتكون خفيفة جداً على الإنترنت الضعيف.
4. لكل طالب 20 سؤالاً يومياً حتى تتوزع الحصة المجانية بعدل. عند انتهائها، أو عند انتهاء حصة Google المجانية، تظهر رسالة تربوية:
   > «المعلم الذكي أخذ استراحته حتى الغد… وهذه فرصتك لتكون أنت المعلّم! 💪»

   ومعها أنشطة بديلة: مراجعة البطاقات، شرح الدرس بصوت عالٍ، التأمل، وتحدي المعلومات.

## تنبيهات
- حصص الخطة المجانية يحددها Google وقد تتغير. تجدها في Google AI Studio وفي Firebase.
- راجعي شروط Gemini API وFirebase الخاصة باستخدام القُصّر، وبكيفية استخدام بيانات الخطة المجانية، قبل النشر الواسع للطلاب.
