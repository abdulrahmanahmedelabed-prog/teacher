/* المعلم الذكي داخل التطبيق: Google Gemini عبر Firebase AI Logic (خطة Spark المجانية).
   - لا يوجد أي مفتاح Gemini في التطبيق: Firebase يحفظه عند Google، وApp Check (reCAPTCHA v3)
     يضمن أن الطلبات تأتي من تطبيقنا فقط، فلا يستطيع أحد استهلاك الحصة المجانية.
   - بيانات FIREBASE_CONFIG في data.js عامة بطبيعتها (يمكن نشرها بأمان).
   - لتوفير الإنترنت: يُرسل الكتاب مرة واحدة لاستخراج نص الدرس، ثم تُرسل الأسئلة نصاً فقط.
   - عند انتهاء الحصة المجانية (429) يعرض التطبيق رسالة تربوية حتى الغد — بلا أي تكلفة. */
(function () {
  "use strict";
  const UPLOAD_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  const MAX_INLINE = 14 * 1024 * 1024; // حد الطلب 20MB، وbase64 يزيد الحجم ~33%

  const TUTOR_SYSTEM = "أنت «المعلم الذكي» في تطبيق «رحلة العودة»: تطبيق يساعد طلاباً ابتعدوا عن الدراسة بسبب ظروف صعبة (حرب، نزوح، انقطاع) على العودة خطوة بخطوة.\n\n" +
    "كيف تعمل:\n" +
    "- تساعد الطالب على فهم الدرس المرفق من كتابه، لا على نسخ الإجابات. اشرح الفكرة، أعطِ مثالاً من الحياة اليومية، ثم اسأل سؤالاً قصيراً للتأكد من الفهم.\n" +
    "- اكتب بالعربية الفصحى البسيطة، وبجمل قصيرة تناسب صفّ الطالب المذكور في رسالته. استخدم المصطلح كما في الكتاب، وضع مقابله بين قوسين عند الحاجة.\n" +
    "- إذا كان الكتاب بلغة أخرى (مثل الإنجليزية): اشرح ولخّص واسأل بلغة رسالة الطالب (العربية عادةً)، وضع المصطلح الإنجليزي المهم بين قوسين بجانب ترجمته، مثل: التمثيل الضوئي (Photosynthesis). وإذا طلب الطالب السؤال أو الجواب بالإنجليزية فاستخدمها.\n" +
    "- اعتمد على نص الدرس المرفق. إذا لم يكن الجواب فيه فقل ذلك بوضوح ثم ساعد من معرفتك العامة.\n" +
    "- إذا طلب الطالب حلّ واجب: ابدأ بتلميح أو بخطوة أولى، واطلب منه محاولة الخطوة التالية، ولا تعطِ الحل الكامل إلا إذا طلبه بعد المحاولة.\n" +
    "- كن مشجّعاً وصبوراً، ولا تُشعر الطالب بالنقص بسبب انقطاعه. امدح الجهد لا الذكاء.\n" +
    "- اجعل الرد قصيراً (حتى 180 كلمة عادةً) ومنظّماً بنقاط أو خطوات مرقّمة. استخدم **عريض** للمصطلحات المهمة فقط.\n" +
    "- لا تسأل الطالب عن تجارب مؤلمة، وإذا ظهر أنه في ضيق نفسي أو خطر فكن لطيفاً وانصحه بالتحدث مع شخص بالغ يثق به.";

  let ai = null, initErr = null, FA = null;
  const cfg = () => (typeof FIREBASE_CONFIG !== "undefined" && FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.appId ? FIREBASE_CONFIG : null);
  const opt = () => (typeof AI_CONFIG !== "undefined" && AI_CONFIG) || {};
  const fail = (code, status) => { throw { code, status }; };
  const clip = (v, n) => String(v == null ? "" : v).slice(0, n);

  function init() {
    if (ai || initErr) return ai;
    FA = window.FirebaseAI;
    if (!FA || !cfg()) return null;
    try {
      const app = FA.initializeApp(cfg());
      // App Check إلزامي لـ Firebase AI Logic: يمنع أي جهة أخرى من استخدام حصتنا
      if (opt().recaptchaSiteKey) FA.initializeAppCheck(app, { provider: opt().recaptchaEnterprise ? new FA.ReCaptchaEnterpriseProvider(opt().recaptchaSiteKey) : new FA.ReCaptchaV3Provider(opt().recaptchaSiteKey), isTokenAutoRefreshEnabled: true });
      ai = FA.getAI(app, { backend: new FA.GoogleAIBackend() });
    } catch (e) { initErr = e; ai = null; }
    return ai;
  }
  const available = () => !!(cfg() && window.FirebaseAI && opt().recaptchaSiteKey);

  function model(name, generationConfig) {
    if (!init()) fail("server_not_configured", 0);
    return FA.getGenerativeModel(ai, { model: name, systemInstruction: TUTOR_SYSTEM, generationConfig });
  }
  // ترجمة أخطاء Firebase إلى رموز يفهمها التطبيق
  function mapErr(e) {
    if (e && e.code && typeof e.code === "string" && !e.customErrorData && /^(ai_limit|busy|network|bad_type|too_large|missing|server_not_configured)$/.test(e.code)) return e;
    const st = e && e.customErrorData && e.customErrorData.status;
    const msg = String((e && e.message) || "");
    if (st === 429 || /RESOURCE_EXHAUSTED|quota/i.test(msg)) return { code: "ai_limit", status: 429 };
    if (st === 503 || /UNAVAILABLE|overloaded|high demand/i.test(msg)) return { code: "busy", status: 503 };
    if (st === 413) return { code: "too_large", status: 413 };
    if (st === 401 || st === 403 || /app.?check|appcheck|api-not-enabled|PERMISSION_DENIED/i.test(msg + " " + (e && e.code))) return { code: "server_not_configured", status: st || 403 };
    if (e && e.code === "fetch-error") return { code: "network", status: 0 };
    return { code: "upstream", status: st || 0 };
  }
  // onText: يعرض الجواب كلمة كلمة أثناء كتابته (البث) فيبدأ الطالب القراءة بعد ثانية بدل الانتظار
  async function once(name, request, generationConfig, onText) {
    const m = model(name, generationConfig);
    if (onText && m.generateContentStream) {
      const r = await m.generateContentStream(request);
      let acc = "";
      for await (const ch of r.stream) { const c0 = ch && ch.candidates && ch.candidates[0]; const t = ((c0 && c0.content && c0.content.parts) || []).filter(x => typeof x.text === "string" && !x.thought).map(x => x.text).join(""); if (t) { acc += t; try { onText(acc); } catch (e) {} } }
      return r.response;
    }
    return (await m.generateContent(request)).response;
  }
  async function run(names, request, generationConfig, onText) {
    let lastErr = null;
    for (const name of names) {
      try {
        try { return await once(name, request, generationConfig, onText); }
        catch (e) {
          // بعض النماذج لا تقبل مستوى التفكير المطلوب → نعيد مرة بدون إعداد التفكير
          const st = e && e.customErrorData && e.customErrorData.status;
          if (st !== 400 || !generationConfig.thinkingConfig) throw e;
          const g = Object.assign({}, generationConfig); delete g.thinkingConfig;
          return await once(name, request, g, onText);
        }
      } catch (e) {
        lastErr = mapErr(e);
        // «شرح أعمق» مشغول أو حصته انتهت → نكمل بالنموذج السريع بدل أن نترك الطالب
        if (lastErr.code !== "busy" && lastErr.code !== "ai_limit") break;
      }
    }
    throw lastErr || { code: "upstream" };
  }
  function textOf(resp) {
    const c = resp && resp.candidates && resp.candidates[0];
    const blocked = (resp && resp.promptFeedback && resp.promptFeedback.blockReason) || !c || ["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST"].includes(c.finishReason);
    if (blocked) return null;
    return ((c.content && c.content.parts) || []).filter(p => typeof p.text === "string" && !p.thought).map(p => p.text).join("\n").trim();
  }
  function blobToB64(blob) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(blob); });
  }
  const fastName = () => opt().model || "gemini-3.5-flash-lite";
  const deepName = () => opt().deepModel || "gemini-3.8-flash";
  const low = { thinkingConfig: { thinkingLevel: "LOW" } };
  // للأسئلة العادية واستخراج الدرس: أقل تفكير = أسرع رد. «شرح أعمق» فقط يفكّر أكثر.
  const quick = { thinkingConfig: { thinkingLevel: "MINIMAL" } };

  /* (1) مرة واحدة لكل درس: نرسل الكتاب ونستخرج نص الدرس، فتصبح كل الأسئلة بعدها نصاً خفيفاً */
  async function extractLesson(blob, mime, lesson) {
    if (!UPLOAD_TYPES.includes(mime)) fail("bad_type", 415);
    if (!blob || !blob.size) fail("missing", 400);
    if (blob.size > MAX_INLINE) fail("too_large", 413);
    const data = await blobToB64(blob);
    const ask = (lesson ? "من هذا الكتاب: انسخ نص «" + clip(lesson, 80) + "»" : "من هذا الكتاب أو هذه الصفحات: انسخ نص أول درس") +
      " كما هو قدر الإمكان (العناوين، الشرح، الأمثلة، التمارين)، حتى 4000 كلمة، دون تعليق منك. إذا كان صورة فانسخ ما تقرؤه فيها.";
    try {
      const resp = await run([fastName()], { contents: [{ role: "user", parts: [{ inlineData: { mimeType: mime, data } }, { text: ask }] }] },
        Object.assign({ maxOutputTokens: 8000 }, quick));
      const t = textOf(resp);
      if (!t) fail("bad_file", 422);
      return clip(t, 24000);
    } catch (e) { throw mapErr(e); }
  }

  /* (2) المحادثة والبطاقات — نص الدرس + الأسئلة فقط */
  function contentsOf(p) {
    const msgs = Array.isArray(p.messages) ? p.messages.slice(-20) : [];
    if (!msgs.length || msgs[msgs.length - 1].role !== "user") fail("bad_messages", 400);
    const ctx = "صف الطالب: " + clip(p.grade, 40) + " · المادة: " + clip(p.subject, 40) + " · الكتاب: " + clip(p.title, 80) +
      (p.simple ? "\n(اكتب بجمل قصيرة جداً وكلمات سهلة، فقد يُقرأ ردّك بصوت لطالب صغير أو لطالب يستعيد مهارة القراءة)" : "") +
      (p.lang === "en" ? "\n(IMPORTANT: The student uses the app in English. Reply only in simple, clear, warm English suited to the student's grade — short sentences and easy words. Keep important terms as they appear in the book, and add the English word in brackets when the book is in another language.)" : "") +
      "\n\nنص الدرس من كتاب الطالب:\n«««\n" + clip(p.notes, 24000) + "\n»»»";
    return msgs.map((m, i) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: (i === 0 ? ctx + "\n\n" : "") + clip(m.text, 4000) }] }));
  }
  async function chat(p) {
    const names = p.deep ? [deepName(), fastName()] : [fastName()];
    const resp = await run(names, { contents: contentsOf(p) }, Object.assign({ maxOutputTokens: 1500 }, p.deep ? low : quick), typeof p.onText === "function" ? p.onText : null);
    const t = textOf(resp);
    const refuse = p.lang === "en" ? "I can't help with this request. Try asking about another part of the lesson 🙂" : "لا أستطيع المساعدة في هذا الطلب. جرّب أن تسأل عن جزء آخر من الدرس 🙂";
    return { text: t === null ? refuse : (t || "…") };
  }
  async function cards(p) {
    const S = window.FirebaseAI.Schema;
    const schema = S.object({ properties: { cards: S.array({ items: S.object({ properties: { q: S.string(), a: S.string() } }) }) } });
    const resp = await run([fastName()], { contents: contentsOf(p) },
      Object.assign({ maxOutputTokens: 3000, responseMimeType: "application/json", responseSchema: schema }, quick));
    let list = [];
    try { list = JSON.parse(textOf(resp) || "{}").cards || []; } catch (e) { list = []; }
    return { cards: list.filter(c => c && c.q && c.a).slice(0, 15).map(c => ({ q: clip(c.q, 300), a: clip(c.a, 500) })) };
  }

  window.GeminiTutor = { available, extractLesson, chat, cards };
})();
