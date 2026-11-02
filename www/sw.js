/* Service Worker: يعمل بدون إنترنت ومع النت الضعيف.
   كل ملفات الإصدار الواحد تُخزَّن معاً (لا خلط بين إصدارين)،
   والإصدار الجديد يُفعَّل عندما يضغط المستخدم «حدّث الآن». */
const CACHE = "rehla-v7";
const ASSETS = ["./", "index.html", "styles.css", "theme.js", "data.js", "sound.js", "app.js", "manifest.json",
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
