/**
 * خادم المساعد الذكي لـ «رحلة العودة» — Cloudflare Worker صغير.
 * يحمي مفتاح Claude API (لا يوضع المفتاح أبداً داخل التطبيق)، ويحدّ عدد الطلبات لكل جهاز يومياً.
 *
 *   POST /upload   رفع كتاب (PDF أو صورة صفحة) مرة واحدة → { fileId }
 *   POST /chat     سؤال المعلم الذكي عن الكتاب          → { text, stopReason, model }
 *   POST /cards    توليد بطاقات مراجعة من الكتاب (JSON)  → { cards: [{q, a}] }
 *
 * الإعداد في wrangler.toml وREADME.md في هذا المجلد.
 */
import Anthropic from "@anthropic-ai/sdk";

const FAST_MODEL = "claude-haiku-5-5";   // الافتراضي: سريع ورخيص جداً
const DEEP_MODEL = "claude-sonnet-5-5";  // «شرح أعمق»
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const UPLOAD_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_TURNS = 20;
const MAX_TEXT = 4000;

/* تعليمات ثابتة (تُخزَّن مؤقتاً لتقليل التكلفة) — المتغيرات تأتي في رسالة الطالب لا هنا */
const TUTOR_SYSTEM = `أنت «المعلم الذكي» في تطبيق «رحلة العودة»: تطبيق يساعد طلاباً ابتعدوا عن الدراسة بسبب ظروف صعبة (حرب، نزوح، انقطاع) على العودة خطوة بخطوة.

كيف تعمل:
- تساعد الطالب على فهم الكتاب أو الصفحات المرفقة، لا على نسخ الإجابات. اشرح الفكرة، أعطِ مثالاً من الحياة اليومية، ثم اسأل سؤالاً قصيراً للتأكد من الفهم.
- اكتب بالعربية الفصحى البسيطة، وبجمل قصيرة تناسب صفّ الطالب المذكور في رسالته. استخدم المصطلح كما في الكتاب، وضع مقابله بين قوسين عند الحاجة.
- اعتمد على محتوى الكتاب المرفق، واذكر رقم الصفحة أو عنوان الدرس عندما تستطيع. إذا لم يكن الجواب في الكتاب فقل ذلك بوضوح ثم ساعد من معرفتك العامة.
- إذا طلب الطالب حلّ واجب: ابدأ بتلميح أو بخطوة أولى، واطلب منه محاولة الخطوة التالية، ولا تعطِ الحل الكامل إلا إذا طلبه بعد المحاولة.
- كن مشجّعاً وصبوراً، ولا تُشعر الطالب بالنقص بسبب انقطاعه. امدح الجهد لا الذكاء.
- اجعل الرد قصيراً (حتى 180 كلمة عادةً) ومنظّماً بنقاط أو خطوات مرقّمة. استخدم **عريض** للمصطلحات المهمة فقط.
- إذا ظهر أن الطالب في ضيق نفسي أو خطر، فكن لطيفاً وانصحه بالتحدث مع شخص بالغ يثق به، ولا تتجاهل ذلك.`;

const CARDS_SCHEMA = {
  type: "object",
  properties: {
    cards: {
      type: "array",
      items: {
        type: "object",
        properties: { q: { type: "string" }, a: { type: "string" } },
        required: ["q", "a"],
        additionalProperties: false
      }
    }
  },
  required: ["cards"],
  additionalProperties: false
};

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (!cors["Access-Control-Allow-Origin"]) return json({ error: "origin_not_allowed" }, 403, cors);
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, cors);
    if (!env.ANTHROPIC_API_KEY) return json({ error: "server_not_configured" }, 500, cors);

    const url = new URL(request.url);
    const device = (request.headers.get("X-Device-Id") || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40);
    if (!device) return json({ error: "missing_device" }, 400, cors);

    const limit = await checkLimit(env, device, url.pathname);
    if (!limit.ok) return json({ error: "daily_limit", limit: limit.max }, 429, cors);

    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 2 });
    try {
      if (url.pathname === "/upload") return await upload(request, client, cors);
      if (url.pathname === "/chat") return await chat(request, client, cors, false);
      if (url.pathname === "/cards") return await chat(request, client, cors, true);
      return json({ error: "not_found" }, 404, cors);
    } catch (err) {
      return apiError(err, cors);
    }
  }
};

async function upload(request, client, cors) {
  const form = await request.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") return json({ error: "no_file" }, 400, cors);
  if (!UPLOAD_TYPES.includes(file.type)) return json({ error: "bad_type" }, 415, cors);
  if (file.size > MAX_UPLOAD_BYTES) return json({ error: "too_large", max: MAX_UPLOAD_BYTES }, 413, cors);
  // يبقى الملف 90 يوماً ثم يُحذف تلقائياً
  const meta = await client.files.upload({ file, expires_in_seconds: 7776000 });
  return json({ fileId: meta.id }, 200, cors);
}

async function chat(request, client, cors, cardsMode) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ error: "bad_json" }, 400, cors);

  const source = bookSource(body);
  if (!source) return json({ error: "no_book" }, 400, cors);
  const history = cleanHistory(body.messages);
  if (!history) return json({ error: "bad_messages" }, 400, cors);

  const ctx = "صف الطالب: " + clip(body.grade, 40) + " · المادة: " + clip(body.subject, 40) + " · عنوان الكتاب: " + clip(body.title, 80) +
    (body.simple === true ? "\n(اكتب بجمل قصيرة جداً وكلمات سهلة، فقد يُقرأ ردّك بصوت لطالب صغير أو لطالب يستعيد مهارة القراءة)" : "");
  // الكتاب في أول رسالة (ثابت) مع نقطة تخزين مؤقت، فلا يُدفع ثمنه كاملاً في كل سؤال
  const bookBlock = source.kind === "image"
    ? { type: "image", source: source.src, cache_control: { type: "ephemeral" } }
    : { type: "document", source: source.src, title: clip(body.title, 80) || "الكتاب", cache_control: { type: "ephemeral" } };
  const messages = [{ role: "user", content: [bookBlock, { type: "text", text: ctx + "\n\n" + history[0].content }] }]
    .concat(history.slice(1));

  const deep = body.deep === true && !cardsMode;
  const params = {
    model: deep ? DEEP_MODEL : FAST_MODEL,
    max_tokens: cardsMode ? 3000 : 1500,
    system: [{ type: "text", text: TUTOR_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages,
    output_config: cardsMode
      ? { effort: "low", format: { type: "json_schema", schema: CARDS_SCHEMA } }
      : { effort: "low" }
  };
  if (deep) {
    // Sonnet: عند رفض لأسباب السلامة يعيد الخادم المحاولة تلقائياً بنموذج بديل مناسب
    params.betas = ["server-side-fallback-2026-07-01"];
    params.fallbacks = "default";
  }
  const res = deep ? await client.beta.messages.create(params) : await client.messages.create(params);

  if (res.stop_reason === "refusal") {
    return json({ text: "لا أستطيع المساعدة في هذا الطلب. جرّب أن تسأل عن جزء آخر من الدرس 🙂", stopReason: "refusal", model: res.model }, 200, cors);
  }
  const text = res.content.filter(b => b.type === "text").map(b => b.text).join("\n").trim();
  if (cardsMode) {
    let cards = [];
    try { cards = JSON.parse(text).cards || []; } catch (e) { cards = []; }
    cards = cards.filter(c => c && c.q && c.a).slice(0, 15).map(c => ({ q: clip(c.q, 300), a: clip(c.a, 500) }));
    return json({ cards, stopReason: res.stop_reason, model: res.model }, 200, cors);
  }
  return json({ text: text || "…", stopReason: res.stop_reason, model: res.model }, 200, cors);
}

/* مصدر الكتاب: ملف مرفوع سابقاً، أو رابط PDF مباشر */
function bookSource(body) {
  if (typeof body.fileId === "string" && /^file_[A-Za-z0-9]+$/.test(body.fileId)) {
    const isImage = typeof body.mime === "string" && body.mime.startsWith("image/");
    return { kind: isImage ? "image" : "pdf", src: { type: "file", file_id: body.fileId } };
  }
  if (typeof body.url === "string" && /^https:\/\/[^\s]+$/i.test(body.url) && body.url.length < 2000) {
    return { kind: "pdf", src: { type: "url", url: body.url } };
  }
  return null;
}

/* المحادثة: نصوص فقط، تتناوب بين الطالب والمعلم وتبدأ بالطالب */
function cleanHistory(list) {
  if (!Array.isArray(list) || !list.length || list.length > MAX_TURNS) return null;
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    const role = i % 2 === 0 ? "user" : "assistant";
    if (!m || m.role !== role || typeof m.text !== "string" || !m.text.trim()) return null;
    out.push({ role, content: clip(m.text, MAX_TEXT) });
  }
  return out[out.length - 1].role === "user" ? out : null;
}

/* حدّ يومي لكل جهاز (اختياري: يعمل إذا ربطت KV باسم LIMITS) */
async function checkLimit(env, device, path) {
  if (!env.LIMITS) return { ok: true };
  const max = path === "/upload" ? +(env.DAILY_UPLOADS || 10) : +(env.DAILY_LIMIT || 40);
  const day = new Date().toISOString().slice(0, 10);
  const key = day + ":" + (path === "/upload" ? "u" : "c") + ":" + device;
  const n = +(await env.LIMITS.get(key)) || 0;
  if (n >= max) return { ok: false, max };
  await env.LIMITS.put(key, String(n + 1), { expirationTtl: 60 * 60 * 26 });
  return { ok: true };
}

function corsHeaders(origin, env) {
  const allowed = String(env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  const ok = allowed.includes(origin);
  return ok ? {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Device-Id",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  } : { "Vary": "Origin" };
}

/* أخطاء مصنّفة: الأخص أولاً */
function apiError(err, cors) {
  if (err instanceof Anthropic.RateLimitError) return json({ error: "busy" }, 429, cors);
  if (err instanceof Anthropic.BadRequestError) return json({ error: "bad_request", detail: String(err.message).slice(0, 200) }, 400, cors);
  if (err instanceof Anthropic.AuthenticationError) return json({ error: "server_not_configured" }, 500, cors);
  if (err instanceof Anthropic.APIConnectionError) return json({ error: "network" }, 504, cors);
  if (err instanceof Anthropic.APIError) return json({ error: "upstream", status: err.status }, 502, cors);
  return json({ error: "internal" }, 500, cors);
}

const clip = (v, n) => String(v == null ? "" : v).slice(0, n);
const json = (obj, status, headers) => new Response(JSON.stringify(obj), {
  status, headers: Object.assign({ "Content-Type": "application/json; charset=utf-8" }, headers)
});
