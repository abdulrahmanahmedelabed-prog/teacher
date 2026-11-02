// اختبار الخادم بدون إنفاق: نعترض طلبات Claude API ونفحص ما يُرسل.
// التشغيل: node test/proxy.test.mjs
import assert from "node:assert/strict";
import worker from "../src/index.js";

const calls = [];
let nextReply = null;
globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === "string" ? input : input.url;
  const headers = new Headers(init.headers || (input.headers || {}));
  let body = init.body;
  if (body && typeof body !== "string") body = body instanceof FormData ? body : await new Response(body).text();
  calls.push({ url, headers, body });
  const reply = nextReply || { status: 200, json: {} };
  return new Response(JSON.stringify(reply.json), { status: reply.status, headers: { "content-type": "application/json", "request-id": "req_test" } });
};

const env = { ANTHROPIC_API_KEY: "sk-test", ALLOWED_ORIGINS: "https://abdulrahmanahmedelabed-prog.github.io" };
const ORIGIN = "https://abdulrahmanahmedelabed-prog.github.io";
const req = (path, body, headers = {}) => new Request("https://w.dev" + path, {
  method: "POST",
  headers: Object.assign({ Origin: ORIGIN, "X-Device-Id": "dev123", "Content-Type": "application/json" }, headers),
  body: typeof body === "string" || body instanceof FormData ? body : JSON.stringify(body)
});
const msg = (text, extra = {}) => ({ status: 200, json: Object.assign({ id: "msg_1", type: "message", role: "assistant", model: "claude-haiku-5-5", content: [{ type: "text", text }], stop_reason: "end_turn", usage: { input_tokens: 10, output_tokens: 5 } }, extra) });

// 1) أصل غير مسموح
let r = await worker.fetch(req("/chat", {}, { Origin: "https://evil.example" }), env);
assert.equal(r.status, 403);

// 2) سؤال عادي: Haiku 5.5 + جهد منخفض + الكتاب كمستند ملف مع تخزين مؤقت
nextReply = msg("الكسر هو جزء من كل.");
r = await worker.fetch(req("/chat", { fileId: "file_abc123", mime: "application/pdf", title: "رياضيات 5", grade: "الصف الخامس", subject: "الرياضيات", messages: [{ role: "user", text: "اشرح الكسور" }] }), env);
assert.equal(r.status, 200);
let out = await r.json();
assert.equal(out.text, "الكسر هو جزء من كل.");
let sent = JSON.parse(calls.at(-1).body);
assert.match(calls.at(-1).url, /\/v1\/messages/);
assert.equal(sent.model, "claude-haiku-5-5");
assert.deepEqual(sent.output_config, { effort: "low" });
assert.equal(sent.messages[0].content[0].type, "document");
assert.deepEqual(sent.messages[0].content[0].source, { type: "file", file_id: "file_abc123" });
assert.deepEqual(sent.messages[0].content[0].cache_control, { type: "ephemeral" });
assert.ok(sent.messages[0].content[1].text.includes("الصف الخامس"));
assert.equal(sent.system[0].cache_control.type, "ephemeral");
assert.ok((calls.at(-1).headers.get("x-api-key") || calls.at(-1).headers.get("authorization") || "").includes("sk-test"), "API key sent upstream");

// 3) «شرح أعمق»: Sonnet 5.5 + بديل تلقائي عند الرفض
nextReply = msg("شرح أعمق");
r = await worker.fetch(req("/chat", { url: "https://example.com/book.pdf", deep: true, messages: [{ role: "user", text: "سؤال" }, { role: "assistant", text: "جواب" }, { role: "user", text: "سؤال 2" }] }), env);
sent = JSON.parse(calls.at(-1).body);
assert.equal(sent.model, "claude-sonnet-5-5");
assert.equal(sent.fallbacks, "default");
assert.ok((calls.at(-1).headers.get("anthropic-beta") || "").includes("server-side-fallback-2026-07-01"));
assert.deepEqual(sent.messages[0].content[0].source, { type: "url", url: "https://example.com/book.pdf" });
assert.equal(sent.messages.length, 3);

// 4) بطاقات: مخرجات JSON منظمة
nextReply = msg(JSON.stringify({ cards: [{ q: "ما الكسر؟", a: "جزء من كل" }, { q: "", a: "x" }] }));
r = await worker.fetch(req("/cards", { fileId: "file_abc123", messages: [{ role: "user", text: "اصنع بطاقات" }] }), env);
out = await r.json();
sent = JSON.parse(calls.at(-1).body);
assert.equal(sent.output_config.format.type, "json_schema");
assert.deepEqual(out.cards, [{ q: "ما الكسر؟", a: "جزء من كل" }]);

// 5) رفض: رسالة لطيفة
nextReply = msg("", { stop_reason: "refusal", content: [] });
r = await worker.fetch(req("/chat", { fileId: "file_abc123", messages: [{ role: "user", text: "x" }] }), env);
out = await r.json();
assert.equal(out.stopReason, "refusal");

// 6) محادثة غير صالحة (لا تنتهي بسؤال الطالب) ومصدر غير صالح
r = await worker.fetch(req("/chat", { fileId: "file_abc123", messages: [{ role: "user", text: "a" }, { role: "assistant", text: "b" }] }), env);
assert.equal(r.status, 400);
r = await worker.fetch(req("/chat", { url: "http://insecure.example/a.pdf", messages: [{ role: "user", text: "a" }] }), env);
assert.equal(r.status, 400);

// 7) رفع ملف: نوع مسموح → files API
nextReply = { status: 200, json: { id: "file_new1", type: "file", filename: "b.pdf", mime_type: "application/pdf", size_bytes: 4, created_at: "2026-11-02T00:00:00Z", downloadable: false } };
const fd = new FormData();
fd.append("file", new File([new Uint8Array([37, 80, 68, 70])], "b.pdf", { type: "application/pdf" }));
r = await worker.fetch(new Request("https://w.dev/upload", { method: "POST", headers: { Origin: ORIGIN, "X-Device-Id": "dev123" }, body: fd }), env);
out = await r.json();
assert.equal(out.fileId, "file_new1");
assert.match(calls.at(-1).url, /\/v1\/files/);

// 8) نوع ملف مرفوض
const fd2 = new FormData();
fd2.append("file", new File(["x"], "a.exe", { type: "application/x-msdownload" }));
r = await worker.fetch(new Request("https://w.dev/upload", { method: "POST", headers: { Origin: ORIGIN, "X-Device-Id": "dev123" }, body: fd2 }), env);
assert.equal(r.status, 415);

// 9) ضغط على الخادم من Anthropic → 429 مفهومة
nextReply = { status: 429, json: { type: "error", error: { type: "rate_limit_error", message: "slow down" } } };
r = await worker.fetch(req("/chat", { fileId: "file_abc123", messages: [{ role: "user", text: "x" }] }), Object.assign({}, env));
assert.equal(r.status, 429);

console.log("✔ كل اختبارات الخادم نجحت (" + calls.length + " طلباً مُعترَضاً، بدون أي إنفاق)");
