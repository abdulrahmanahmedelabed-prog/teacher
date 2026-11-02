/* Service Worker: يعمل بدون إنترنت ومع النت الضعيف.
   كل ملفات الإصدار الواحد تُخزَّن معاً (لا خلط بين إصدارين)،
   والإصدار الجديد يُفعَّل عندما يضغط المستخدم «حدّث الآن». */
const CACHE = "rehla-v11";
const ASSETS = ["./", "index.html", "styles.css", "theme.js", "data.js", "sound.js", "speech.js", "vendor-firebase-ai.js", "gemini.js", "app.js", "manifest.json",
  "icon.svg", "icon-192.png"]; // الأيقونات الكبيرة تُخزَّن عند أول طلب لتخفيف أول تحميل

self.addEventListener("install", e => {
  // cache: "reload" يتجاوز كاش المتصفح حتى لا نخزّن ملفات قديمة
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: "reload" })))));
});
self.addEventListener("message", e => { if (e.data === "SKIP_WAITING") self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  if (req.mode === "navigate") {
    e.respondWith(caches.match("index.html").then(r => r || fetch(req)));
    return;
  }
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(cached => cached || fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(new URL(req.url).pathname, copy)); }
      return res;
    }))
  );
});

/* تذكيرات الويب (أفضل جهد): يقرأ الخطة التي كتبها التطبيق ويُظهر المستحق منها */
function metaDb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open("rehla-meta", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("kv");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function showDueReminder() {
  const db = await metaDb();
  const plan = await new Promise(res => { const g = db.transaction("kv").objectStore("kv").get("plan"); g.onsuccess = () => res(g.result); g.onerror = () => res(null); });
  if (!plan || !Array.isArray(plan.items)) return;
  const now = Date.now(), h = new Date().getHours() * 60 + new Date().getMinutes();
  if (h > 21 * 60 + 30 || h < 7 * 60) return;
  const due = plan.items.filter(p => p.at <= now && now - p.at < 12 * 3600000 && !(plan.shown || []).includes(p.id)).pop();
  if (!due) return;
  await self.registration.showNotification(due.title, { body: due.body, tag: "rehla-remind", icon: "icon-192.png" });
  plan.shown = (plan.shown || []).concat(plan.items.filter(p => p.at <= now).map(p => p.id));
  await new Promise(res => { const t = db.transaction("kv", "readwrite"); t.objectStore("kv").put(plan, "plan"); t.oncomplete = res; t.onerror = res; });
}
self.addEventListener("periodicsync", e => { if (e.tag === "rehla-remind") e.waitUntil(showDueReminder().catch(() => {})); });
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window" }).then(list => {
    const c = list.find(x => "focus" in x);
    return c ? c.focus() : self.clients.openWindow("./");
  }));
});
