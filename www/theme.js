/* إدارة الوضع الفاتح/الداكن — يُحمَّل في <head> قبل الرسم لمنع الوميض.
   التفضيل: "auto" (حسب الجهاز) | "light" | "dark" — مشترك بين التطبيق وصفحة الهبوط */
(function () {
  var KEY = "rehla-theme";
  var root = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  var rm = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var animT;

  function get() {
    try { var v = localStorage.getItem(KEY); return v === "light" || v === "dark" ? v : "auto"; }
    catch (e) { return "auto"; }
  }
  function effective(p) { return p === "auto" ? (mq && mq.matches ? "dark" : "light") : p; }

  function apply(p, animate) {
    if (animate && !(rm && rm.matches)) {
      root.classList.add("theme-anim");
      clearTimeout(animT);
      animT = setTimeout(function () { root.classList.remove("theme-anim"); }, 450);
    }
    if (p === "auto") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", p);
    var eff = effective(p);
    root.style.colorScheme = eff;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta && meta.dataset[eff]) meta.setAttribute("content", meta.dataset[eff]);
    try { document.dispatchEvent(new CustomEvent("themechange", { detail: { pref: p, effective: eff } })); } catch (e) {}
  }
  function set(p) {
    try { if (p === "auto") localStorage.removeItem(KEY); else localStorage.setItem(KEY, p); } catch (e) {}
    apply(p, true);
  }
  function toggle() { set(effective(get()) === "dark" ? "light" : "dark"); }

  if (mq) {
    var onSys = function () { if (get() === "auto") apply("auto", true); };
    if (mq.addEventListener) mq.addEventListener("change", onSys); else if (mq.addListener) mq.addListener(onSys);
  }
  // مزامنة بين تبويبات/صفحات مفتوحة
  window.addEventListener("storage", function (e) { if (e.key === KEY) apply(get(), true); });

  window.Theme = { get: get, set: set, toggle: toggle, effective: function () { return effective(get()); } };
  apply(get(), false);
})();
