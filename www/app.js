/* رحلة العودة — منطق التطبيق (بدون مكتبات، يعمل بدون إنترنت) */
(function () {
  "use strict";

  /* ================= التخزين ================= */
  const KEY = "rehla-state-v1";
  const DEFAULT_STATE = {
    v: 1,
    profile: null,          // {name, grade, subjects[], minutes, goal}
    xp: 0,
    history: {},            // "YYYY-MM-DD": {ch, focus, sessions, mood, gameXp, reflected}
    daily: null,            // {date, rerolls, list[], fullAwarded}
    totalFocus: 0,
    sessions: 0,
    lostDone: 0,
    fullDays: 0,
    best: {},               // {math, memory}
    journal: [],            // [{date, text}]
    badges: [],
    cards: [],              // [{id, subject, q, a, box, due}]
    assess: [],             // التقييم الأولي ومتابعته: [{date, away, levels:{مادة: 1..5}}]
    feedback: [],           // [{date, rating, kind, text}]
    feedbackAsked: false,
    reviews: 0,
    weeklyClaimed: {},
    timer: null             // {end, minutes, subject}
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return Object.assign({}, structuredCloneSafe(DEFAULT_STATE), JSON.parse(raw));
    } catch (e) { /* تخزين غير متاح */ }
    return structuredCloneSafe(DEFAULT_STATE);
  }
  function structuredCloneSafe(o) { return JSON.parse(JSON.stringify(o)); }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ }
  }
  /* تنظيف البيانات المستوردة/المحفوظة: أنواع صحيحة ومعرّفات آمنة */
  function sanitizeState(st) {
    const arr = v => Array.isArray(v) ? v : [];
    const num = v => (typeof v === "number" && isFinite(v)) ? v : (+v || 0);
    const str = v => (typeof v === "string" ? v : v == null ? "" : String(v));
    const safeId = v => str(v).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40) || Math.random().toString(36).slice(2, 10);
    const dateOk = v => /^\d{4}-\d{2}-\d{2}$/.test(v);
    ["journal", "badges", "cards", "assess", "feedback"].forEach(k => { st[k] = arr(st[k]); });
    if (!st.history || typeof st.history !== "object" || Array.isArray(st.history)) st.history = {};
    Object.keys(st.history).forEach(k => { if (!dateOk(k) || typeof st.history[k] !== "object" || !st.history[k]) delete st.history[k]; });
    if (!st.best || typeof st.best !== "object") st.best = {};
    Object.keys(st.best).forEach(k => { st.best[k] = num(st.best[k]); });
    if (!st.weeklyClaimed || typeof st.weeklyClaimed !== "object") st.weeklyClaimed = {};
    ["xp", "totalFocus", "sessions", "lostDone", "fullDays", "reviews"].forEach(k => { st[k] = Math.max(0, num(st[k])); });
    st.badges = st.badges.filter(b => typeof b === "string");
    st.cards = st.cards.filter(c => c && typeof c === "object").map(c => ({
      id: safeId(c.id), subject: str(c.subject), q: str(c.q), a: str(c.a),
      box: Math.min(6, Math.max(1, Math.round(num(c.box)) || 1)), due: dateOk(c.due) ? c.due : dateKey()
    }));
    st.assess = st.assess.filter(a => a && typeof a === "object" && dateOk(a.date) && a.levels && typeof a.levels === "object");
    st.assess.forEach(a => { Object.keys(a.levels).forEach(k => { a.levels[k] = Math.min(5, Math.max(1, Math.round(num(a.levels[k])) || 3)); }); a.away = num(a.away); });
    st.journal = st.journal.filter(j => j && typeof j === "object").map(j => ({ date: str(j.date).slice(0, 10), text: str(j.text) }));
    st.feedback = st.feedback.filter(f => f && typeof f === "object" && dateOk(f.date));
    if (st.profile !== null) {
      if (!st.profile || typeof st.profile !== "object" || !Array.isArray(st.profile.subjects)) throw new Error("bad profile");
      st.profile.subjects = st.profile.subjects.filter(x => typeof x === "string");
      if (!st.profile.subjects.length) st.profile.subjects = [SUBJECTS[0]];
      st.profile.name = str(st.profile.name).slice(0, 30) || "طالب";
      st.profile.minutes = Math.min(240, Math.max(10, num(st.profile.minutes) || 45));
    }
    st.daily = null; // يُعاد توليد تحديات اليوم
    if (st.timer && !(st.timer.end > 0 && st.timer.minutes > 0)) st.timer = null;
    return st;
  }
  let S = load();
  try { S = sanitizeState(S); } catch (e) { /* ابقِ البيانات كما هي */ }

  /* ================= أدوات ================= */
  const $ = sel => document.querySelector(sel);
  const app = $("#app");
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function dateKey(d) {
    d = d || new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }
  function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
  const today = () => dateKey();
  function dayNumber(key) { return Math.floor(new Date(key + "T12:00:00").getTime() / 86400000); }

  function hashStr(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (arr, r) => arr[Math.floor(r() * arr.length)];
  function shuffle(arr, r) {
    r = r || Math.random;
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  function dayRec(key) {
    key = key || today();
    if (!S.history[key]) S.history[key] = { ch: 0, focus: 0, sessions: 0, mood: null, gameXp: 0, reflected: false, active: false, reviews: 0, cardsAdded: 0 };
    return S.history[key];
  }
  function markActive() { dayRec().active = true; }

  /* تمييز العدد بالعربية */
  const arDays = n => n === 1 ? "يوم واحد" : n === 2 ? "يومين" : n + " " + (n <= 10 ? "أيام" : "يوماً");
  const arMins = n => n === 1 ? "دقيقة واحدة" : n === 2 ? "دقيقتين" : n + " " + (n <= 10 ? "دقائق" : "دقيقة");

  /* ================= الإحصاءات ================= */
  function isActive(key) { const h = S.history[key]; return !!(h && h.active); }

  function stats() {
    const keys = Object.keys(S.history).filter(isActive).sort();
    const tKey = today(), tNum = dayNumber(tKey);
    const set = new Set(keys);

    // سلسلة متسامحة: كل 7 أيام دراسة تمنحك «يوم سماح» 🧊 (بحد أقصى 2) يغطّي يوم غياب تلقائياً
    let run = 0, best = 0, freezes = 0, count = 0;
    if (keys.length) {
      let d = new Date(keys[0] + "T12:00:00");
      for (;;) {
        const k = dateKey(d);
        if (k > tKey) break;
        if (set.has(k)) { run++; count++; if (count % 7 === 0) freezes = Math.min(2, freezes + 1); }
        else if (k !== tKey) { if (freezes > 0) freezes--; else run = 0; }
        best = Math.max(best, run);
        d = addDays(d, 1);
      }
    }

    // العودة بعد انقطاع: آخر يوم دراسة قبل اليوم
    const prevKeys = keys.filter(k => k < tKey);
    const lastPrev = prevKeys[prevKeys.length - 1];
    const gapDays = lastPrev ? tNum - dayNumber(lastPrev) : 0;
    let bigGapIdx = -1;
    for (let i = 1; i < keys.length; i++) if (dayNumber(keys[i]) - dayNumber(keys[i - 1]) >= 5) bigGapIdx = i;
    const reentry = (!set.has(tKey) && gapDays >= 5) || (bigGapIdx >= 0 && keys.length - bigGapIdx <= 3);

    // هل الحِمل أكبر من طاقته؟ (أنجز أقل من نصف التحديات في آخر 7 أيام)
    let given = 0, done = 0;
    for (let i = 1; i <= 7; i++) {
      const h = S.history[dateKey(addDays(new Date(), -i))];
      if (h && h.given) { given += h.given; done += Math.min(h.ch || 0, h.given); }
    }
    const struggling = given >= 6 && done / given < 0.5;

    const ws = weekStart();
    let weekDays = 0;
    for (let i = 0; i < 7; i++) if (set.has(dateKey(addDays(ws, i)))) weekDays++;

    const activeDays = keys.length;
    let stageIdx = 0;
    STAGES.forEach((st, i) => { if (activeDays >= st.minDays) stageIdx = i; });

    const totalChallenges = Object.values(S.history).reduce((a, h) => a + (h.ch || 0), 0);
    return { streak: run, bestStreak: best, freezes, activeDays, stage: stageIdx + 1, stageObj: STAGES[stageIdx],
      totalChallenges, gapDays, reentry, struggling, weekDays };
  }

  const xpForLevel = L => 50 * L * (L - 1);  // المستوى 2 = 100، 3 = 300، 4 = 600 ...
  function levelInfo(xp) {
    let L = 1;
    while (xp >= xpForLevel(L + 1)) L++;
    const cur = xpForLevel(L), next = xpForLevel(L + 1);
    return {
      level: L,
      title: LEVEL_TITLES[Math.min(L - 1, LEVEL_TITLES.length - 1)],
      pct: Math.round(((xp - cur) / (next - cur)) * 100),
      toNext: next - xp
    };
  }

  /* ================= النقاط والمكافآت ================= */
  function addXP(n, reason) {
    const before = levelInfo(S.xp).level;
    S.xp = Math.max(0, S.xp + n);
    if (n > 0) markActive();
    const after = levelInfo(S.xp).level;
    save();
    updateTopbar();
    if (n > 0 && reason) toast("+" + n + "⭐ " + reason);
    if (after > before) {
      confetti();
      celebrate("🎉", "المستوى " + after + ": " + levelInfo(S.xp).title,
        "لقب جديد تستحقه! كل مستوى يقرّبك من هدفك" + (S.profile && S.profile.goal ? " «" + S.profile.goal + "»" : "") + ". استمر، أنت تتقدّم فعلاً.");
    }
    checkBadges();
  }

  function checkBadges() {
    const st = stats();
    const newly = BADGES.filter(b => !S.badges.includes(b.id) && b.check(S, st));
    if (!newly.length) return;
    newly.forEach(b => S.badges.push(b.id));
    save();
    const b = newly[0];
    setTimeout(() => {
      confetti();
      celebrate(b.icon, "وسام جديد: " + b.name, b.desc);
    }, 400);
  }

  /* ================= التحديات اليومية ================= */
  function buildDaily(rerolls) {
    const key = today();
    const st = stats();
    const p = S.profile;
    const r = rng(hashStr(key + ":" + rerolls + ":" + (p.name || "")));
    const mood = dayRec().mood;
    const low = LOW_MOODS.includes(mood);
    // الحِمل يتبع حال الطالب لا التقويم فقط
    let ratio = st.stageObj.ratio;
    if (st.reentry) ratio = STAGES[0].ratio;                                   // عائد بعد انقطاع: نبدأ بلطف من جديد
    else if (st.struggling && st.stage > 1) ratio = STAGES[st.stage - 2].ratio; // الحمل ثقيل: نخففه مرحلة
    let base = Math.max(10, Math.round(p.minutes * ratio));
    if (low) base = Math.max(8, Math.round(base * 0.5));

    const subs = subjectPlan(st.stage);
    const offset = dayNumber(key);
    const subjectAt = i => subs[(offset + i) % subs.length];
    const qCount = 3 + st.stage * 2;

    const list = [];
    // تمييز العدد: 3-10 جمع، 11 فما فوق مفرد منصوب
    const arCount = (n, few, many) => (n >= 3 && n <= 10) ? few : many;
    const lessons = (p.lastLesson || {});
    function make(type, tpl, subject, minutes) {
      const m = Math.max(3, Math.round(minutes));
      const text = tpl.t.replace(/\{s\}/g, subject).replace(/\{m\}/g, m).replace(/\{n\}/g, qCount)
        .replace(/\{mw\}/g, arCount(m, "دقائق", "دقيقة")).replace(/\{nw\}/g, arCount(qCount, "أسئلة أو مسائل", "سؤالاً أو مسألة"))
        .replace(/\{lesson\}/g, lessons[subject] || "");
      list.push({ id: type + list.length, type, text, subject, minutes: m, xp: 10 + m * 2, done: false });
    }
    const tplMinutes = (tpl, budget) => tpl.m > 1 ? tpl.m : budget * tpl.m;

    // يوم قلق: عناية بالنفس + مهمة دراسة صغيرة واحدة فقط
    if (mood === 5) {
      make("wellbeing", pick(CHALLENGE_TEMPLATES.wellbeing, r), subjectAt(0), 3);
      make("study", { t: "اقرأ صفحة واحدة فقط من {s} — بدون ضغط", m: 5 }, subjectAt(0), 5);
      S.daily = { date: key, rerolls, list, fullAwarded: false };
      dayRec().given = list.length;
      save();
      return;
    }

    // 1) إحماء أو عناية بالنفس
    const warmPool = r() < 0.5 ? CHALLENGE_TEMPLATES.warmup : CHALLENGE_TEMPLATES.wellbeing;
    const w = pick(warmPool, r);
    make(warmPool === CHALLENGE_TEMPLATES.warmup ? "warmup" : "wellbeing", w, subjectAt(0), tplMinutes(w, base));

    // 2) دراسة رئيسية
    const studyTpls = shuffle(CHALLENGE_TEMPLATES.study, r);
    const usePrereq = st.stage >= 3 && lessons[subjectAt(0)] && offset % 2 === 0;
    make("study", usePrereq ? PREREQ_TEMPLATE : studyTpls[0], subjectAt(0), base * 0.6);
    if (st.stage >= 2 && !low) make("study", studyTpls[1], subjectAt(1), base * 0.4);

    // 3) استرجاع (يقوّي الذاكرة)
    if (st.stage >= 2) {
      const t = pick(CHALLENGE_TEMPLATES.recall, r);
      make("recall", t, subjectAt(0), tplMinutes(t, base));
    }
    // 4) إبداع ومتعة
    const c = pick(CHALLENGE_TEMPLATES.creative, r);
    make("creative", c, subjectAt(st.stage >= 3 ? 2 : 0), tplMinutes(c, base));

    // 5) تحدٍ إضافي في المزاج العالي
    if (mood === 3 || mood === 4) {
      const t = studyTpls[2];
      const ch = { t: "⚡ إضافي: " + t.t, m: t.m };
      make("bonus", ch, subjectAt(1), base * 0.5);
      list[list.length - 1].xp += 15;
    }

    S.daily = { date: key, rerolls, list, fullAwarded: false };
    dayRec().given = list.length;
    save();
  }
  /* ترتيب المواد حسب التقييم الأولي:
     في المرحلتين 1-2 نبدأ بالمواد الأقوى لنكسب الحماس،
     ومن المرحلة 3 نعطي المواد الضعيفة وقتاً مضاعفاً */
  function latestLevels() { return S.assess.length ? S.assess[S.assess.length - 1].levels : {}; }
  function subjectPlan(stage) {
    const subs = S.profile.subjects.length ? S.profile.subjects : ["الرياضيات"];
    const lv = latestLevels();
    if (!Object.keys(lv).length) return subs;
    const sorted = subs.slice().sort((a, b) => (lv[b] || 3) - (lv[a] || 3));
    if (stage <= 2) return sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 2)));
    const plan = [];
    sorted.slice().reverse().forEach(s => { plan.push(s); if ((lv[s] || 3) <= 2) plan.push(s); });
    return plan;
  }

  function ensureDaily() {
    if (!S.profile) return;
    if (!S.daily || S.daily.date !== today()) buildDaily(0);
  }

  let justDone = null;
  // إنجاز تحدٍّ (بدون رسم) — يُستخدم من الزر ومن نهاية مؤقت التركيز
  function completeChallenge(ch) {
    const rec = dayRec();
    ch.done = true;
    rec.ch++;
    addXP(ch.xp);
    justDone = ch.id;
    if (S.daily.list.every(c => c.done) && !S.daily.fullAwarded && !rec.full) {
      S.daily.fullAwarded = true;
      rec.full = true;
      S.fullDays++;
      save();
      addXP(30, "يوم مثالي!");
      confetti();
    }
    save();
  }
  function toggleChallenge(id) {
    if (!S.daily || S.daily.date !== today()) { toast("بدأ يوم جديد ✨ إليك تحديات اليوم"); render(); return; }
    const ch = S.daily.list.find(c => c.id === id);
    if (!ch) return;
    if (!ch.done) {
      flyXP(ch.xp);
      completeChallenge(ch);
    } else {
      const rec = dayRec();
      ch.done = false;
      rec.ch = Math.max(0, rec.ch - 1);
      addXP(-ch.xp);
      save();
    }
    render();
  }

  /* ================= تحدي الأسبوع ================= */
  function weekStart(d) {
    d = new Date(d || new Date());
    const day = d.getDay(); // 6 = السبت
    const diff = (day + 1) % 7; // الأسبوع يبدأ السبت
    return addDays(d, -diff);
  }
  function weeklyChallenge() {
    const ws = weekStart();
    const wkey = dateKey(ws);
    const kinds = [
      { k: "sessions", text: "أنجز 5 جلسات تركيز هذا الأسبوع", target: 5 },
      { k: "days", text: "ادرس 5 أيام من 7 هذا الأسبوع", target: 5 },
      { k: "ch", text: "أنجز 15 تحدياً هذا الأسبوع", target: 15 },
      { k: "reviews", text: "راجع 30 بطاقة هذا الأسبوع", target: 30 }
    ];
    const w = kinds[dayNumber(wkey) % kinds.length];
    let val = 0;
    for (let i = 0; i < 7; i++) {
      const h = S.history[dateKey(addDays(ws, i))];
      if (!h) continue;
      if (w.k === "sessions") val += h.sessions || 0;
      if (w.k === "days") val += h.active ? 1 : 0;
      if (w.k === "ch") val += h.ch || 0;
      if (w.k === "reviews") val += h.reviews || 0;
    }
    return { key: wkey, text: w.text, target: w.target, val: Math.min(val, w.target), claimed: !!S.weeklyClaimed[wkey] };
  }

  /* ================= واجهة عامة ================= */
  function updateTopbar() {
    const st = stats();
    $("#streakPill").innerHTML = "🔥 " + st.streak + (st.freezes ? '<sup aria-hidden="true">🧊</sup>' : "");
    $("#streakPill").setAttribute("aria-label", "سلسلتك: " + st.streak + " أيام" + (st.freezes ? "، ولديك " + st.freezes + " يوم سماح" : "") + " — اضغط للتفاصيل");
    $("#xpPill").textContent = "⭐ " + S.xp;
  }
  let toastT;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove("show"), 2200);
  }
  let modalReturn = null;
  function showModal(emoji, title, body, buttons, cls) {
    $("#modalCard").className = "modal-card" + (cls ? " " + cls : "");
    $("#modalCard").innerHTML =
      '<div class="big-emoji" aria-hidden="true">' + emoji + '</div><h2 id="modalTitle">' + esc(title) + '</h2><p class="muted" id="modalBody">' + esc(body) + "</p>" +
      (buttons || '<button class="btn block" data-action="closeModal">رائع!</button>');
    const m = $("#modal");
    if (m.classList.contains("hidden")) modalReturn = document.activeElement;
    m.classList.remove("hidden");
    const b = m.querySelector("button");
    if (b) b.focus();
  }
  function closeModal() {
    $("#modal").classList.add("hidden");
    if (modalReturn && document.body.contains(modalReturn)) { try { modalReturn.focus({ preventScroll: true }); } catch (e) {} }
    modalReturn = null;
    if (celebrateQ.length) setTimeout(() => {
      if (!$("#modal").classList.contains("hidden") || !celebrateQ.length) return;
      const a = celebrateQ.shift();
      showModal(a[0], a[1], a[2], a[3], "celebrate");
    }, 260);
  }
  /* الاحتفالات تنتظر دورها حتى لا تتصادم النوافذ (مستوى + وسام + جلسة) */
  const celebrateQ = [];
  function celebrate(emoji, title, body, buttons) {
    if (!$("#modal").classList.contains("hidden")) { celebrateQ.push([emoji, title, body, buttons]); return; }
    showModal(emoji, title, body, buttons, "celebrate");
  }
  const reducedMotion = () => !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  function pulse(el) { if (!el) return; el.classList.remove("pulse"); void el.offsetWidth; el.classList.add("pulse"); }
  /* نقاط «تطير» من الزر إلى عدّاد النقاط */
  let tapEl = null;
  function flyXP(n) {
    const pill = $("#xpPill");
    if (!pill || !tapEl || !document.body.contains(tapEl) || reducedMotion()) { pulse(pill); return; }
    const a = tapEl.getBoundingClientRect(), b = pill.getBoundingClientRect();
    const f = document.createElement("span");
    f.className = "xp-fly";
    f.textContent = "+" + n + "⭐";
    f.style.left = (a.left + a.width / 2) + "px";
    f.style.top = (a.top + a.height / 2) + "px";
    document.body.appendChild(f);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      f.style.transform = "translate(calc(-50% + " + (b.left + b.width / 2 - a.left - a.width / 2) + "px), " + (b.top + b.height / 2 - a.top - a.height / 2) + "px) scale(.6)";
      f.style.opacity = "0.3";
    }));
    setTimeout(() => { f.remove(); pulse(pill); }, 700);
  }
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !$("#modal").classList.contains("hidden")) { pendingConfirm = null; closeModal(); }
  });
  let pendingConfirm = null;
  function askConfirm(emoji, title, body, yesLabel, onYes, danger) {
    pendingConfirm = onYes;
    showModal(emoji, title, body,
      '<div class="grid-2"><button class="btn secondary" data-action="closeModal">رجوع</button>' +
      '<button class="btn' + (danger ? " danger" : "") + '" data-action="confirmYes">' + esc(yesLabel) + "</button></div>");
  }
  function confetti() {
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const colors = ["#6c4cf5", "#ff8a3d", "#1fbf75", "#ffb020", "#ff4f8b", "#3dc3ff"];
    for (let i = 0; i < 40; i++) {
      const c = document.createElement("div");
      c.className = "confetti";
      c.style.left = Math.random() * 100 + "vw";
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = 1.6 + Math.random() * 1.6 + "s";
      c.style.animationDelay = Math.random() * 0.4 + "s";
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 3800);
    }
  }
  function beep() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      [0, 0.25, 0.5].forEach((t, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = 660 + i * 220;
        o.connect(g); g.connect(ctx.destination);
        g.gain.setValueAtTime(0.25, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.22);
        o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.23);
      });
    } catch (e) { /* لا صوت */ }
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  }

  /* ================= الشاشات ================= */
  let view = "home";
  let onboardSel = [];

  let lastView = null, firstRender = true;
  // نحافظ على موضع التمرير داخل نفس الشاشة، وننقل التركيز لعنوان الشاشة عند تغييرها (لقارئ الشاشة)
  function afterRender(sameView, y) {
    if (sameView) window.scrollTo(0, y);
    else {
      window.scrollTo(0, 0);
      if (!firstRender) {
        const h = app.querySelector("h2, h3");
        if (h) { h.setAttribute("tabindex", "-1"); try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); } }
      }
    }
    firstRender = false;
  }
  function render() {
    if (!S.profile) { document.body.classList.add("bare"); renderOnboarding(); lastView = "onboard"; return; }
    if (!S.assess.length && view !== "assess") view = "assess";
    if (view === "assess") {
      document.body.classList.add("bare");
      $("#nav").style.display = "none";
      const same = lastView === "assess", y = window.scrollY;
      app.innerHTML = viewAssess();
      afterRender(same, y);
      lastView = "assess";
      return;
    }
    document.body.classList.remove("bare");
    ensureDaily();
    updateTopbar();
    const navView = view === "games" ? "challenges" : view;
    document.querySelectorAll("#nav button").forEach(b => {
      const on = b.dataset.view === navView;
      b.classList.toggle("active", on);
      if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    $("#nav").style.display = "";
    const views = { home: viewHome, challenges: viewChallenges, focus: viewFocus, games: viewGames, journey: viewJourney, settings: viewSettings, cards: viewCards };
    // وضع التركيز الكامل: نخفي كل ما يشتّت أثناء الجلسة
    const running = view === "focus" && !!S.timer && S.timer.end > Date.now();
    document.body.classList.toggle("focus-run", running);
    const key = view + (running ? ":run" : "");
    const sameView = key === lastView, y = window.scrollY;
    app.innerHTML = (views[view] || viewHome)();
    if (view === "focus") tickTimer();
    afterRender(sameView, y);
    lastView = key;
    justDone = null;
    if (view === "home" && !maybeWelcomeBack()) maybeAskFeedback();
  }

  /* ---------- البداية: سؤال واحد في كل شاشة ---------- */
  const GRADES = ["ابتدائي", "إعدادي", "ثانوي", "توجيهي / ثانوية عامة", "جامعة"];
  const WHENS = ["بعد الفجر", "بعد الإفطار", "بعد العصر", "بعد المغرب", "قبل النوم"];
  const OB0 = () => ({ step: 0, name: "", grade: "", minutes: 45, when: "", away: null, levels: {} });
  let ob = OB0();
  const obSteps = () => ["name", "grade", "subjects", "time", "away"].concat(onboardSel.map((s, i) => "lvl:" + i));

  function renderOnboarding() {
    $("#nav").style.display = "none";
    const steps = obSteps();
    if (ob.step >= steps.length) ob.step = steps.length - 1;
    const k = steps[ob.step];
    const choice = (key, v, label, sel, auto) => '<button type="button" class="choice' + (sel ? " sel" : "") + '" data-action="obSet" data-k="' + key + '" data-v="' + esc(v) + '"' + (auto ? ' data-auto="1"' : "") + ' aria-pressed="' + !!sel + '">' + label + "</button>";
    let body = "", showNext = true, nextLabel = "التالي";
    if (k === "name") {
      body = '<div class="ob-emoji" aria-hidden="true">🚀</div><h2>أهلاً بك في رحلة العودة</h2>' +
        '<p class="muted">ابتعدت عن الدراسة فترة؟ لا مشكلة. نبدأ معك بخطوات صغيرة جداً، ونكبر معاً كل يوم.</p>' +
        '<label for="obName">ما اسمك؟</label><input type="text" id="obName" maxlength="30" autocomplete="given-name" placeholder="اكتب اسمك" value="' + esc(ob.name) + '">';
      nextLabel = "لنبدأ";
    } else if (k === "grade") {
      body = '<div class="ob-emoji" aria-hidden="true">🎓</div><h2>في أي مرحلة دراسية أنت؟</h2><div class="choices">' +
        GRADES.map(g => choice("grade", g, g, ob.grade === g, true)).join("") + "</div>";
      showNext = !!ob.grade;
    } else if (k === "subjects") {
      body = '<div class="ob-emoji" aria-hidden="true">📚</div><h2>ما المواد التي تريد العودة إليها؟</h2><p class="muted">اختر مادة أو أكثر — يمكنك تغييرها لاحقاً.</p><div class="chips">' +
        SUBJECTS.map(x => '<button type="button" class="chip' + (onboardSel.includes(x) ? " sel" : "") + '" data-action="obSubject" data-s="' + esc(x) + '" aria-pressed="' + onboardSel.includes(x) + '">' + esc(x) + "</button>").join("") + "</div>";
    } else if (k === "time") {
      body = '<div class="ob-emoji" aria-hidden="true">⏰</div><h2>كم دقيقة تستطيع أن تدرس يومياً؟</h2><p class="muted">في الوضع الطبيعي. لا تقلق: نبدأ بربع هذا الوقت فقط.</p><div class="chips">' +
        [20, 30, 45, 60, 90, 120].map(m => '<button type="button" class="chip' + (ob.minutes === m ? " sel" : "") + '" data-action="obSet" data-k="minutes" data-v="' + m + '">' + m + " د</button>").join("") + "</div>" +
        '<h3 class="ob-sub">ومتى ستدرس عادةً؟ <span class="muted small">(وقت ثابت يبني العادة)</span></h3><div class="chips">' +
        WHENS.map(w => '<button type="button" class="chip' + (ob.when === w ? " sel" : "") + '" data-action="obSet" data-k="when" data-v="' + w + '">' + w + "</button>").join("") + "</div>";
    } else if (k === "away") {
      body = '<div class="ob-emoji" aria-hidden="true">⏳</div><h2>كم صار لك بعيد عن الدراسة؟</h2><p class="muted">ليس امتحاناً ولا توجد إجابة خاطئة — فقط لنبني خطتك على مقاسك.</p><div class="choices">' +
        AWAY.map((a, i) => choice("away", i, a, ob.away === i, true)).join("") + "</div>";
      showNext = ob.away !== null;
    } else {
      const i = +k.split(":")[1], sb = onboardSel[i];
      body = '<p class="muted small center">مادة ' + (i + 1) + " من " + onboardSel.length + '</p><h2 class="center">كيف تشعر بمستواك في<br><span class="hl">' + esc(sb) + "</span>؟</h2>" +
        '<div class="choices faces">' + LEVELS.map((l, j) => choice("lvl", j + 1, '<span class="face" aria-hidden="true">' + l.e + "</span>" + l.t, ob.levels[sb] === j + 1, true)).join("") + "</div>";
      showNext = !!ob.levels[sb];
      if (i === onboardSel.length - 1) nextLabel = "ابدأ الرحلة ✨";
    }
    app.innerHTML =
      '<section class="onboard">' +
      '<div class="ob-top"><div class="dots" role="progressbar" aria-label="الخطوة ' + (ob.step + 1) + " من " + steps.length + '" aria-valuenow="' + (ob.step + 1) + '" aria-valuemin="1" aria-valuemax="' + steps.length + '">' +
      steps.map((_, i) => '<i class="' + (i < ob.step ? "done" : i === ob.step ? "on" : "") + '"></i>').join("") + "</div></div>" +
      '<div class="ob-body">' + body + "</div>" +
      '<div class="ob-foot">' +
      (ob.step > 0 ? '<button type="button" class="btn ghost back" data-action="obBack">→ رجوع</button>' : "") +
      (showNext ? '<button type="button" class="btn big grow" data-action="obNext">' + nextLabel + "</button>" : "") +
      "</div></section>";
    const nm = $("#obName");
    if (nm && !nm.value) setTimeout(() => nm.focus(), 50);
  }
  function obNext() {
    const steps = obSteps(), k = steps[ob.step];
    if (k === "name") {
      ob.name = ($("#obName").value || "").trim();
      if (!ob.name) { toast("اكتب اسمك أولاً 🙂"); $("#obName").focus(); return; }
    }
    if (k === "subjects" && !onboardSel.length) { toast("اختر مادة واحدة على الأقل"); return; }
    if (ob.step >= steps.length - 1) { finishOnboarding(); return; }
    ob.step++;
    renderOnboarding();
  }
  function finishOnboarding() {
    const levels = {};
    onboardSel.forEach(x => { levels[x] = ob.levels[x] || 3; });
    S.profile = { name: ob.name, grade: ob.grade || GRADES[2], subjects: onboardSel.slice(), minutes: ob.minutes, goal: "", when: ob.when, lastLesson: {} };
    S.assess.push({ date: today(), away: ob.away == null ? 0 : ob.away, levels });
    S.daily = null;
    const away = ob.away;
    ob = OB0();
    save();
    view = "home";
    render();
    addXP(20);
    showModal("✨", "مرحباً " + S.profile.name + "!", welcomePlan(levels, away));
  }
  function welcomePlan(levels, away) {
    const subs = Object.keys(levels).sort((a, b) => levels[b] - levels[a]);
    const strong = subs[0], weak = subs[subs.length - 1];
    return (away >= 3 ? "غبت فترة طويلة، وهذا لا يقلل منك أبداً. " : "") +
      "نبدأ بمادتك الأقوى «" + strong + "» لنكسب الحماس" +
      (weak !== strong ? "، ثم نعطي «" + weak + "» اهتماماً أكبر تدريجياً" : "") +
      ". ما عليك اليوم إلا أن تنجز خطوة واحدة!";
  }

  /* ---------- الرئيسية ---------- */
  let progressOpen = false;
  function weekStripHTML() {
    const ws = weekStart();
    const dayNames = ["سبت", "أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة"];
    let w = "";
    for (let i = 0; i < 7; i++) {
      const k = dateKey(addDays(ws, i));
      w += '<div class="' + (isActive(k) ? "active " : "") + (k === today() ? "today" : "") + '">' + dayNames[i] + "<b>" + (isActive(k) ? "✔" : "·") + "</b></div>";
    }
    return '<div class="week">' + w + "</div>";
  }
  const dotsHTML = list => '<span class="dots small-dots" aria-label="أنجزت ' + list.filter(c => c.done).length + " من " + list.length + '">' +
    list.map(c => '<i class="' + (c.done ? "done" : "") + '"></i>').join("") + "</span>";
  const metaHTML = c => '<div class="meta">' + TYPE_LABEL[c.type] + " · ⏳ " + c.minutes + ' د · <b class="xpc">+' + c.xp + "⭐</b></div>";

  function viewHome() {
    const st = stats();
    const lv = levelInfo(S.xp);
    const rec = dayRec();
    const list = S.daily.list;
    const quote = QUOTES[dayNumber(today()) % QUOTES.length];
    const greet = new Date().getHours() < 12 ? "صباح الخير" : "مساء الخير";
    const wk = weeklyChallenge();
    const low = LOW_MOODS.includes(rec.mood);
    const next = (low && list.find(c => !c.done && c.type === "wellbeing")) || list.find(c => !c.done);
    const due = dueCards().length;
    const bigLost = st.activeDays <= 3 || st.gapDays >= 2;

    let nextCard;
    if (next) {
      const study = next.type === "study" || next.type === "bonus";
      nextCard = '<section class="card next-step' + (justDone ? " enter" : "") + '" aria-labelledby="nextH"><div class="row"><h3 class="grow" id="nextH">👉 خطوتك التالية</h3>' + dotsHTML(list) + "</div>" +
        '<p class="next-text">' + esc(next.text) + "</p>" + metaHTML(next) +
        '<div class="stack">' +
        (study ?
          '<button class="btn big good block" data-action="focusFor" data-id="' + esc(next.id) + '" data-m="' + next.minutes + '" data-s="' + esc(next.subject) + '">▶ ابدأ الآن · ' + next.minutes + " د</button>" +
          '<button class="btn ghost block" data-action="toggle" data-id="' + esc(next.id) + '">✔ أنجزتها بدون مؤقت</button>' :
          '<button class="btn big block" data-action="toggle" data-id="' + esc(next.id) + '">✔ أنجزتها</button>') +
        (low && !rec.rest && !rec.active ? '<button class="btn ghost block" data-action="restDay">🌿 اجعل اليوم يوم راحة</button>' : "") +
        (!bigLost ? '<button class="linkbtn" data-action="lost">🧭 تايه؟ من وين أبدأ</button>' : "") +
        "</div></section>";
    } else {
      nextCard = '<section class="card next-step center' + (justDone ? " enter" : "") + '"><div class="empty-emoji" aria-hidden="true">🎉</div><h3>أنجزت كل خطوات اليوم!</h3>' +
        '<p class="muted small">' + (due ? "عندك " + due + " بطاقة للمراجعة — دقائق قليلة تثبّت ما تعلمته." : rec.reflected ? "يوم رائع. استرح، ونراك غداً 💜" : "اختم يومك بتأمّل قصير، أو خذ استراحة ممتعة.") + "</p>" +
        (due ? '<button class="btn good block" data-action="go" data-v="cards">🔁 راجع بطاقاتك</button>' :
          !rec.reflected ? '<button class="btn ghost block" data-action="writeReflect">✍️ اكتب تأمّل اليوم</button>' : "") + "</section>";
    }

    const weeklyReady = wk.val >= wk.target && !wk.claimed;
    return '<section class="card hero">' +
      "<h2>" + greet + "، " + esc(S.profile.name) + " 👋</h2>" +
      '<div class="hero-meta">المستوى ' + lv.level + " · " + lv.title + " · " + st.stageObj.icon + " " + st.stageObj.name + "</div>" +
      '<div class="progress" role="progressbar" aria-label="التقدم للمستوى التالي" aria-valuenow="' + lv.pct + '" aria-valuemin="0" aria-valuemax="100"><div style="width:' + lv.pct + '%"></div></div>' +
      '<div class="hero-meta small">باقي ' + lv.toNext + " ⭐ للمستوى التالي" + (S.profile.when ? " · ⏰ " + esc(S.profile.when) : "") + "</div></section>" +

      '<section class="mood-wrap" aria-label="كيف حالك اليوم؟"><span class="mood-q">كيف حالك اليوم؟</span><div class="mood-row">' +
      MOOD_ORDER.map(i => { const m = MOODS[i]; return '<button data-action="mood" data-i="' + i + '" class="' + (rec.mood === i ? "sel" : "") + '" title="' + m.label + '" aria-label="' + m.label + '" aria-pressed="' + (rec.mood === i) + '">' + m.e + "</button>"; }).join("") +
      "</div>" + (rec.mood !== null && MOODS[rec.mood] ? '<p class="mood-msg">' + MOODS[rec.mood].msg + "</p>" : "") +
      (rec.rest ? '<p class="mood-msg">🌿 اليوم يوم راحة — الراحة جزء من الرحلة. نراك غداً 💜</p>' : "") +
      (lowStreak() >= 3 ? '<p class="mood-msg care">💜 لاحظنا أن الأيام الأخيرة صعبة عليك. تحدّث مع شخص تثق به — أحد أفراد أسرتك أو معلم أو مرشد المدرسة. لست وحدك.</p>' : "") +
      "</section>" +

      nextCard +
      (bigLost ? '<button class="btn accent big block" data-action="lost">🧭 تايه؟ من وين أبدأ</button>' : "") +

      (weeklyReady ? '<section class="card weekly-ready center"><b>🏅 أكملت تحدي الأسبوع!</b><p class="small muted">' + wk.text + '</p><button class="btn good block" data-action="claimWeekly">استلم 150 ⭐</button></section>' : "") +

      '<details class="card progress-card" id="progressCard"' + (progressOpen ? " open" : "") + ">" +
      '<summary><b class="grow">📈 تقدّمك</b><span class="muted small">🔥' + st.streak + " · ⏱️" + S.totalFocus + " د · 🏅" + S.badges.length + "</span></summary>" +
      '<div class="stack">' + weekStripHTML() +
      '<div class="grid-3">' +
      '<div class="stat"><b>' + st.streak + (st.freezes ? ' <span class="small" title="أيام سماح">🧊' + st.freezes + "</span>" : "") + '</b><span class="small muted">أيام متتالية</span></div>' +
      '<div class="stat"><b>' + S.totalFocus + '</b><span class="small muted">دقيقة تركيز</span></div>' +
      '<div class="stat"><b>' + S.badges.length + '</b><span class="small muted">وسام</span></div></div>' +
      '<p class="small muted">🧊 كل 7 أيام دراسة تمنحك «يوم سماح» يحمي سلسلتك إذا غبت يوماً.</p>' +
      '<div><b>🏅 تحدي الأسبوع:</b> ' + wk.text +
      '<div class="progress" style="margin-top:6px"><div style="width:' + Math.round(wk.val / wk.target * 100) + '%"></div></div>' +
      '<div class="small muted" style="margin-top:4px">' + wk.val + " / " + wk.target + " · المكافأة 150 ⭐" + (wk.claimed ? " · تم الاستلام ✔" : "") + "</div></div>" +
      "</div></details>" +

      '<p class="quote-line">💬 ' + esc(quote) + (S.profile.goal ? '<br><span class="small muted">هدفك: ' + esc(S.profile.goal) + "</span>" : "") + "</p>";
  }
  function streakSheet() {
    const st = stats();
    showModal("🔥", st.streak + " " + (st.streak >= 3 && st.streak <= 10 ? "أيام" : "يوم") + " متتالية",
      "كل يوم تدرس فيه ولو 5 دقائق يُحسب. وكل 7 أيام دراسة تمنحك «يوم سماح» 🧊 يحمي سلسلتك تلقائياً إذا غبت يوماً." +
      (st.freezes ? " عندك الآن " + st.freezes + " يوم سماح." : "") + " أفضل سلسلة لك: " + st.bestStreak + ".",
      weekStripHTML() + '<br><button class="btn block" data-action="closeModal">تمام</button>');
  }

  // عدد الأيام المتتالية (حتى اليوم) بمزاج متعب أو قلق
  function lowStreak() {
    let n = 0;
    for (let i = 0; i < 7; i++) {
      const h = S.history[dateKey(addDays(new Date(), -i))];
      if (h && LOW_MOODS.includes(h.mood)) n++; else if (i > 0 || (h && h.mood !== null)) break;
    }
    return n;
  }
  function maybeWelcomeBack() {
    const st = stats();
    if (st.gapDays < 2 || S.welcomedOn === today() || !$("#modal").classList.contains("hidden")) return false;
    S.welcomedOn = today();
    save();
    showModal("💜", "أهلاً بعودتك يا " + S.profile.name + "!", "الغياب جزء من الرحلة، والمهم أنك هنا الآن. تقدّمك كله محفوظ" +
      (st.reentry ? "، وخففنا لك تحديات الأيام القادمة لتعود بهدوء." : "."));
    return true;
  }

  /* ---------- التحديات ---------- */
  const REFLECT_PROMPTS = [
    "ما أهم فكرة تعلّمتها اليوم؟",
    "ما الذي صعُب عليك اليوم، وما الذي ستجرّبه غداً بشكل مختلف؟",
    "ما الطريقة التي نفعتك اليوم في الدراسة؟",
    "ما خطوتك الأولى غداً؟ اكتبها بوضوح."
  ];
  const TYPE_LABEL = { warmup: "إحماء", wellbeing: "عناية بنفسك", study: "دراسة", recall: "استرجاع", creative: "إبداع", bonus: "إضافي" };
  let reflectOpen = false;
  function viewChallenges() {
    const rec = dayRec();
    const list = S.daily.list;
    const item = c => '<div class="challenge' + (c.done ? " done" : "") + '">' +
      '<button class="check' + (c.id === justDone ? " pop" : "") + '" data-action="toggle" data-id="' + esc(c.id) + '" aria-pressed="' + c.done + '" aria-label="' + (c.done ? "إلغاء الإنجاز: " : "إنجاز: ") + esc(c.text) + '">' + (c.done ? "✔" : "") + "</button>" +
      '<div class="grow"><div class="ch-text">' + esc(c.text) + "</div>" + metaHTML(c) +
      (!c.done && c.type === "recall" ? '<button class="btn ghost sm" data-action="go" data-v="cards">🗂️ افتح البطاقات</button>' : "") +
      (!c.done && (c.type === "study" || c.type === "bonus") ? '<button class="btn ghost sm" data-action="focusFor" data-id="' + esc(c.id) + '" data-m="' + c.minutes + '" data-s="' + esc(c.subject) + '">▶ ابدأ بمؤقت</button>' : "") +
      "</div></div>";
    const todo = list.filter(c => !c.done), done = list.filter(c => c.done);
    const prompt = REFLECT_PROMPTS[dayNumber(today()) % REFLECT_PROMPTS.length];
    return '<section class="card"><div class="row"><h2 class="grow">🎯 تحديات اليوم</h2>' + dotsHTML(list) + "</div>" +
      (todo.length ? todo.map(item).join("") : '<p class="center muted">🎉 أنجزت كل تحديات اليوم!</p>') +
      (done.length ? '<div class="done-group">' + done.map(item).join("") + "</div>" : "") +
      (S.daily.rerolls < 1 && !done.length ? '<button class="linkbtn" data-action="reroll">🎲 لا تناسبني؟ غيّرها (مرة يومياً)</button>' : "") +
      "</section>" +
      '<section class="card"><h3>🧠 استراحة ذهنية</h3><p class="small muted">لعبة قصيرة بين جلسات الدراسة (حتى ' + GAME_XP_CAP + ' ⭐ يومياً).</p>' +
      '<div class="grid-3"><button class="btn ghost" data-action="startMath">⚡ أرقام</button>' +
      '<button class="btn ghost" data-action="startQuiz">❓ معلومات</button>' +
      '<button class="btn ghost" data-action="startMemory">🃏 ذاكرة</button></div></section>' +
      '<section class="card" id="reflectCard"><h3>📓 تأمّل اليوم</h3>' +
      (rec.reflected ? '<p class="muted">كتبت تأمّل اليوم ✔ — الكتابة تثبّت ما تعلمته.</p>' :
        '<p class="small muted">' + prompt + "</p>" +
        (reflectOpen ? '<textarea id="reflectText" maxlength="600" placeholder="اكتب بحرية…" aria-label="' + prompt + '"></textarea><div class="stack"><button class="btn block" data-action="reflect">احفظ (+15 ⭐)</button></div>' :
          '<button class="btn ghost block" data-action="openReflect">✍️ اكتب تأمّلك (+15 ⭐)</button>')) + "</section>";
  }

  /* ---------- مؤقت التركيز ---------- */
  let focusChoice = { minutes: 15, subject: null };
  let timerInt = null;
  const FOCUS_LINES = ["ركّز على هذه الصفحة فقط 📖", "كل دقيقة الآن تبني مستقبلك 💪", "أنت تقوم بعمل رائع", "تنفّس… واستمر 🌿", "خطوة صغيرة، أثر كبير"];
  const ringHTML = (label) => '<div class="timer-ring"><svg viewBox="0 0 240 240" aria-hidden="true"><circle cx="120" cy="120" r="105" stroke="var(--line)" stroke-width="14" fill="none"/>' +
    '<circle id="ring" cx="120" cy="120" r="105" stroke="var(--primary)" stroke-width="14" fill="none" stroke-linecap="round" stroke-dasharray="' + (2 * Math.PI * 105) + '" stroke-dashoffset="0"/></svg>' +
    '<div class="time" id="timeText" role="timer" aria-live="off">' + label + "</div></div>";
  function viewFocus() {
    const t = S.timer;
    const subs = S.profile.subjects.length ? S.profile.subjects : ["عام"];
    if (!focusChoice.subject || !subs.includes(focusChoice.subject)) focusChoice.subject = subs[0];
    if (t && t.end > Date.now()) {
      const line = FOCUS_LINES[Math.floor((Date.now() - (t.end - t.minutes * 60000)) / 120000) % FOCUS_LINES.length];
      return '<section class="focus-full center"><p class="muted">تدرس الآن</p><h2>' + esc(t.subject) + "</h2>" +
        ringHTML(fmt(t.minutes * 60)) +
        '<p class="focus-line">' + line + "</p>" +
        '<p class="small muted">أبعِد الهاتف قليلاً — سننبّهك عند الانتهاء.</p>' +
        '<button class="linkbtn" data-action="stopTimer">إنهاء مبكر</button></section>';
    }
    return '<section class="card center"><h2>⏱️ جلسة تركيز</h2>' +
      '<p class="muted small">اختر المادة والمدة. كل دقيقة = 2 ⭐</p>' +
      ringHTML(fmt(focusChoice.minutes * 60)) +
      '<div class="stack"><div class="field-label">المدة</div><div class="chips">' + [5, 10, 15, 25, 40].map(m => '<button class="chip' + (m === focusChoice.minutes ? " sel" : "") + '" data-action="setMin" data-m="' + m + '" aria-pressed="' + (m === focusChoice.minutes) + '">' + m + " د</button>").join("") + "</div>" +
      '<div class="field-label">المادة</div><div class="chips">' + subs.map(x => '<button class="chip' + (x === focusChoice.subject ? " sel" : "") + '" data-action="setSub" data-s="' + esc(x) + '" aria-pressed="' + (x === focusChoice.subject) + '">' + esc(x) + "</button>").join("") + "</div>" +
      '<button class="btn big good block" data-action="startTimer">▶ ابدأ</button></div></section>' +
      '<details class="card tips"><summary><b>💡 نصائح للتركيز</b></summary><ul class="list-plain small">' +
      "<li>ابدأ بـ 5 أو 10 دقائق إذا كنت بعيداً عن الدراسة — هذا طبيعي جداً.</li>" +
      "<li>بعد كل جلسة خذ استراحة 5 دقائق: قم، تحرّك، وتنفّس.</li>" +
      "<li>اكتب أي فكرة مشتّتة على ورقة جانبية وارجع لها لاحقاً.</li>" +
      "<li>إذا انقطعت الكهرباء أو النت، المؤقت يكمل ويحفظ تقدّمك.</li></ul></details>";
  }
  function fmt(sec) {
    sec = Math.max(0, Math.ceil(sec));
    return String(Math.floor(sec / 60)).padStart(2, "0") + ":" + String(sec % 60).padStart(2, "0");
  }
  function startTimer(minutes, subject, force, chId) {
    if (!force && S.timer && S.timer.end > Date.now()) {
      askConfirm("⏱️", "لديك جلسة تركيز جارية", "هل تريد إلغاءها وبدء جلسة جديدة؟ (لن تُحسب الجلسة الحالية)", "ابدأ جلسة جديدة",
        () => startTimer(minutes, subject, true, chId));
      return;
    }
    S.timer = { end: Date.now() + minutes * 60000, minutes, subject, chId: chId || null };
    save();
    view = "focus";
    render();
    ensureTimerLoop();
  }
  function ensureTimerLoop() {
    clearInterval(timerInt);
    if (S.timer) timerInt = setInterval(tickTimer, 500);
  }
  function tickTimer() {
    const t = S.timer;
    if (!t) return;
    const left = (t.end - Date.now()) / 1000;
    if (left <= 0) { finishTimer(); return; }
    const tt = $("#timeText"), ring = $("#ring");
    if (tt) tt.textContent = fmt(left);
    if (ring) {
      const C = 2 * Math.PI * 105;
      ring.setAttribute("stroke-dashoffset", String(C * (1 - left / (t.minutes * 60))));
    }
    document.title = fmt(left) + " — رحلة العودة";
  }
  function finishTimer() {
    const t = S.timer;
    clearInterval(timerInt);
    S.timer = null;
    document.title = "رحلة العودة";
    document.body.classList.remove("focus-run");
    if (!t) return;
    const rec = dayRec();
    rec.focus += t.minutes;
    rec.sessions++;
    S.totalFocus += t.minutes;
    S.sessions++;
    save();
    beep();
    let earned = t.minutes * 2;
    addXP(earned);
    // الجلسة بدأت من تحدٍّ؟ نُنجزه تلقائياً
    let chDone = false;
    if (t.chId && S.daily && S.daily.date === today()) {
      const ch = S.daily.list.find(c => c.id === t.chId && !c.done);
      if (ch) { completeChallenge(ch); earned += ch.xp; chDone = true; }
    }
    const next = S.daily && S.daily.date === today() ? S.daily.list.find(c => !c.done) : null;
    if (view === "focus") render();
    celebrate("🧠", "أحسنت! " + arMins(t.minutes) + " تركيز",
      "+" + earned + " ⭐" + (chDone ? " · وأنجزت التحدي ✔" : "") + ". خذ استراحة 5 دقائق: قم، تحرّك، وتنفّس.",
      (next ? '<button class="btn block" data-action="goNext">👉 التالي: ' + esc(next.text.length > 38 ? next.text.slice(0, 38) + "…" : next.text) + "</button><br>" : "") +
      '<button class="btn ghost block" data-action="closeModal">🌿 استراحة</button>');
  }

  /* ---------- الألعاب ---------- */
  const GAME_XP_CAP = 60;
  function gameXP(n) {
    const rec = dayRec();
    const allowed = Math.max(0, Math.min(n, GAME_XP_CAP - (rec.gameXp || 0)));
    rec.gameXp = (rec.gameXp || 0) + allowed;
    if (allowed > 0) addXP(allowed, "من الألعاب");
    else { markActive(); save(); toast("وصلت لحد نقاط الألعاب اليوم — نقاط الدراسة أهم 😉"); }
  }
  let game = null;
  const gameHead = (title, right) => '<div class="game-head"><button class="icon-x" data-action="exitGame" aria-label="خروج من اللعبة">✕</button><b class="grow">' + title + "</b>" + (right || "") + "</div>";

  function viewGames() {
    if (game && game.type === "math") return viewMath();
    if (game && game.type === "memory") return viewMemory();
    if (game && game.type === "quiz") return viewQuiz();
    return '<div class="card"><h2>🧠 استراحة ذهنية</h2>' +
      '<p class="muted small">ألعاب قصيرة ممتعة بين جلسات الدراسة. (الحد الأقصى ' + GAME_XP_CAP + " ⭐ يومياً من الألعاب)</p>" +
      '<button class="btn secondary" data-action="go" data-v="challenges">→ رجوع للتحديات</button></div>' +
      '<div class="card"><h3>⚡ سباق الأرقام</h3><p class="small muted">أجب عن أكبر عدد من العمليات الحسابية في 60 ثانية. تصعب مع مستواك!</p>' +
      '<div class="row"><span class="grow small">أفضل نتيجة: <b>' + (S.best.math || 0) + "</b></span>" +
      '<button class="btn" data-action="startMath">العب ▶</button></div></div>' +
      '<div class="card"><h3>❓ تحدي المعلومات</h3><p class="small muted">10 أسئلة من موادك. كل إجابة صحيحة = 3 ⭐</p>' +
      '<div class="row"><span class="grow small">أفضل نتيجة: <b>' + (S.best.quiz != null ? S.best.quiz + " / 10" : "—") + "</b></span>" +
      '<button class="btn" data-action="startQuiz">العب ▶</button></div></div>' +
      '<div class="card"><h3>🃏 لعبة الذاكرة</h3><p class="small muted">اقلب البطاقات وطابق كل زوج بأقل عدد من المحاولات.</p>' +
      '<div class="row"><span class="grow small">أفضل نتيجة: <b>' + (S.best.memory ? S.best.memory + " محاولة" : "—") + "</b></span>" +
      '<button class="btn" data-action="startMemory">العب ▶</button></div></div>';
  }

  function mathQuestion() {
    // الصعوبة تتبع مستواك ورقمك القياسي
    const L = Math.max(levelInfo(S.xp).level, 1 + Math.floor((S.best.math || 0) / 4));
    const max = 10 + L * 5;
    const ops = L < 3 ? ["+", "-"] : L < 5 ? ["+", "-", "×"] : ["+", "-", "×", "÷"];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a, b, ans;
    const R = n => 1 + Math.floor(Math.random() * n);
    if (op === "+") { a = R(max); b = R(max); ans = a + b; }
    else if (op === "-") { a = R(max); b = R(a); ans = a - b; }
    else if (op === "×") { a = R(Math.min(12, 3 + L)); b = R(12); ans = a * b; }
    else { b = R(10); ans = R(10); a = b * ans; }
    const opts = new Set([ans]);
    while (opts.size < 4) { const d = ans + Math.floor(Math.random() * 11) - 5; if (d >= 0 && d !== ans) opts.add(d); }
    return { text: a + " " + op + " " + b, ans, opts: shuffle([...opts]) };
  }
  function viewMath() {
    const g = game;
    if (g.over) {
      return '<div class="card center"><div style="font-size:3rem">⚡</div><h2>انتهى الوقت!</h2>' +
        "<p>إجابات صحيحة: <b>" + g.score + "</b> · خاطئة: " + g.wrong + "</p>" +
        '<button class="btn" data-action="startMath">مرة أخرى</button> <button class="btn secondary" data-action="exitGame">رجوع</button></div>';
    }
    const left = Math.max(0, (g.end - Date.now()) / 1000);
    return '<div class="card center">' + gameHead("⚡ سباق الأرقام", '<span class="score">✔ ' + g.score + '</span><span class="muted"><b id="mathTime">' + Math.ceil(left) + "</b> ث</span>") +
      '<div class="tbar" aria-hidden="true"><i style="width:' + (left / 60 * 100) + "%;animation-duration:" + left + 's"></i></div>' +
      '<div class="game-q">' + g.q.text + " = ?</div>" +
      '<div class="answers">' + g.q.opts.map(o => '<button class="btn secondary" data-action="mathAns" data-v="' + o + '">' + o + "</button>").join("") + "</div></div>";
  }
  let mathInt = null;
  function startMath() {
    game = { type: "math", score: 0, wrong: 0, end: Date.now() + 60000, q: mathQuestion(), over: false };
    clearInterval(mathInt);
    mathInt = setInterval(() => {
      if (!game || game.type !== "math") { clearInterval(mathInt); return; }
      const left = Math.ceil((game.end - Date.now()) / 1000);
      const el = $("#mathTime");
      if (el) el.textContent = Math.max(0, left);
      if (left <= 0) {
        clearInterval(mathInt);
        game.over = true;
        if (game.score > (S.best.math || 0)) { S.best.math = game.score; toast("رقم قياسي جديد! 🏆"); }
        save();
        gameXP(game.score * 2);
        if (view === "games") render();
      }
    }, 250);
    render();
  }

  function startMemory() {
    const cards = shuffle(MEMORY_EMOJIS.concat(MEMORY_EMOJIS)).map((e, i) => ({ i, e, open: false, matched: false }));
    game = { type: "memory", cards, first: null, lock: false, tries: 0, over: false };
    render();
  }
  function viewMemory() {
    const g = game;
    if (g.over) {
      return '<div class="card center"><div style="font-size:3rem">🃏</div><h2>أحسنت!</h2><p>أنهيتها في <b>' + g.tries + "</b> محاولة</p>" +
        '<button class="btn" data-action="startMemory">مرة أخرى</button> <button class="btn secondary" data-action="exitGame">رجوع</button></div>';
    }
    const left = g.cards.filter(c => !c.matched).length / 2;
    return '<div class="card">' + gameHead("🃏 لعبة الذاكرة", '<span class="muted small">محاولات ' + g.tries + " · باقي " + left + " أزواج</span>") +
      '<div class="memory-grid">' + g.cards.map(c =>
        '<button class="mem-card' + (c.open ? " open" : "") + (c.matched ? " matched" : "") + '" data-action="memFlip" data-i="' + c.i + '" aria-label="' +
        (c.matched ? "مطابقة: " + c.e : c.open ? "مفتوحة: " + c.e : "بطاقة مغلقة") + '"><span aria-hidden="true">' + c.e + "</span></button>").join("") +
      "</div></div>";
  }
  function memFlip(i) {
    const g = game;
    if (!g || g.lock) return;
    const c = g.cards[i];
    if (c.open || c.matched) return;
    c.open = true;
    if (g.first === null) { g.first = i; render(); return; }
    const f = g.cards[g.first];
    g.tries++;
    g.first = null;
    if (f.e === c.e) {
      f.matched = c.matched = true;
      if (g.cards.every(x => x.matched)) {
        g.over = true;
        if (!S.best.memory || g.tries < S.best.memory) { S.best.memory = g.tries; toast("رقم قياسي جديد! 🏆"); }
        save();
        gameXP(Math.max(10, 40 - g.tries));
      }
      render();
    } else {
      g.lock = true;
      render();
      setTimeout(() => { f.open = c.open = false; g.lock = false; if (view === "games") render(); }, 750);
    }
  }

  /* ---------- رحلتي ---------- */
  function viewJourney() {
    const st = stats();
    const next = STAGES[st.stage] || null;
    const days = arDays;
    const stages = STAGES.map(s => {
      const state = s.id < st.stage ? "passed" : s.id === st.stage ? "current" : "locked";
      return '<div class="stage ' + state + '">' +
        '<div class="icon" aria-hidden="true">' + (state === "passed" ? "✔" : state === "current" ? s.icon : "🔒") + "</div>" +
        '<div class="grow"><b>' + s.name + "</b>" + (state === "current" ? ' <span class="tag">أنت هنا</span>' : "") +
        (state === "current" ? '<div class="small muted">' + s.desc + "</div>" : "") +
        '<div class="small muted">' + (state === "passed" ? "✔ أنجزتها" : state === "current" ? (next ? "باقي " + days(next.minDays - st.activeDays) + " للمرحلة التالية" : "أعلى مرحلة 🏆") : "🔒 بعد " + days(s.minDays - st.activeDays)) + "</div></div></div>";
    }).join("");

    // الأوسمة المكتسبة أولاً، ثم أقرب 3 غير مكتسبة، والباقي مطوي
    const sortedB = BADGES.filter(b => S.badges.includes(b.id)).concat(BADGES.filter(b => !S.badges.includes(b.id)));
    const shownN = Math.max(6, S.badges.length + 3);
    const badgeHtml = b => {
      const has = S.badges.includes(b.id);
      return '<div class="badge' + (has ? "" : " locked") + '"><span class="b-icon" aria-hidden="true">' + b.icon + "</span><b>" + b.name + (has ? " ✔" : "") + '</b><div class="muted">' + b.desc + "</div></div>";
    };
    const badgesShown = sortedB.slice(0, shownN).map(badgeHtml).join("");
    const badgesMore = sortedB.slice(shownN).map(badgeHtml).join("");

    const journal = S.journal.slice().reverse().slice(0, 10).map(j =>
      '<li><span class="small muted">' + esc(j.date) + "</span><br>" + esc(j.text) + "</li>").join("");

    return '<div class="card"><h2>🗺️ رحلة العودة</h2>' +
      '<p class="muted small">درست حتى الآن <b>' + arDays(st.activeDays) + "</b> · أفضل سلسلة: <b>" + arDays(st.bestStreak) + "</b></p>" +
      (next ? '<div class="progress"><div style="width:' + Math.round((st.activeDays - st.stageObj.minDays) / (next.minDays - st.stageObj.minDays) * 100) + '%"></div></div>' +
        '<p class="small muted">باقي ' + arDays(next.minDays - st.activeDays) + " للوصول إلى «" + next.name + "»</p>" : "<p>🏆 وصلت لأعلى مرحلة!</p>") +
      '<div class="journey">' + stages + "</div></div>" +
      '<div class="card"><h3>🏅 الأوسمة (' + S.badges.length + " / " + BADGES.length + ')</h3><div class="badges">' + badgesShown + "</div>" +
      (badgesMore ? '<details class="more"><summary>عرض كل الأوسمة</summary><div class="badges">' + badgesMore + "</div></details>" : "") + "</div>" +
      '<div class="card"><h3>📓 يومياتي</h3>' + (journal ? '<ul class="list-plain">' + journal + "</ul>" : '<p class="muted small">لم تكتب أي تأمّل بعد. اكتب أول تأمّل من صفحة التحديات.</p>') + "</div>" +
      levelsCard() +
      '<div class="stack"><button class="btn block" data-action="share">📸 شارك إنجازك</button>' +
      '<button class="btn ghost block" data-action="openSettings">⚙️ الإعدادات · 💬 رأيك · 🤝 تواصل</button></div>';
  }

  /* ---------- الإعدادات ---------- */
  function viewSettings() {
    const p = S.profile;
    return '<div class="card"><h2>⚙️ الإعدادات</h2>' +
      '<label for="obName">الاسم</label><input type="text" id="obName" maxlength="30" value="' + esc(p.name) + '">' +
      "<label>المواد</label><div class=\"chips\">" +
      SUBJECTS.map(s => '<button type="button" class="chip' + (onboardSel.includes(s) ? " sel" : "") + '" data-action="obSubject" data-s="' + esc(s) + '">' + esc(s) + "</button>").join("") + "</div>" +
      '<label for="obMinutes">الوقت اليومي (دقيقة)</label><select id="obMinutes">' +
      [20, 30, 45, 60, 90, 120].map(m => '<option value="' + m + '"' + (m === p.minutes ? " selected" : "") + ">" + m + "</option>").join("") + "</select>" +
      '<label for="obGoal">هدفي</label><input type="text" id="obGoal" maxlength="80" value="' + esc(p.goal) + '">' +
      "<label>موعد دراستي</label><div class=\"chips\">" +
      ["بعد الفجر", "بعد الإفطار", "بعد العصر", "بعد المغرب", "قبل النوم"].map(w => '<button type="button" class="chip' + (p.when === w ? " sel" : "") + '" data-action="obWhen" data-w="' + w + '">' + w + "</button>").join("") + "</div>" +
      '<div class="stack"><button class="btn block" data-action="saveSettings">حفظ</button></div></div>' +
      '<div class="card"><h3>🎨 المظهر</h3><p class="small muted">«تلقائي» يتبع إعدادات جهازك. الوضع الداكن مريح للعين ليلاً ويوفّر البطارية.</p>' +
      '<div class="seg" role="radiogroup" aria-label="المظهر">' +
      [["auto", "🌓 تلقائي"], ["light", "☀️ فاتح"], ["dark", "🌙 داكن"]].map(t =>
        '<button role="radio" aria-checked="' + (Theme.get() === t[0]) + '" class="' + (Theme.get() === t[0] ? "sel" : "") + '" data-action="setTheme" data-t="' + t[0] + '">' + t[1] + "</button>").join("") +
      "</div></div>" +
      '<div class="card"><h3>💾 نسخة احتياطية</h3><p class="small muted">بياناتك محفوظة على جهازك فقط. انسخها احتياطياً لتنقلها لجهاز آخر.</p>' +
      '<div class="grid-2"><button class="btn ghost" data-action="export">⬆️ تصدير</button>' +
      '<button class="btn ghost" data-action="import">⬇️ استيراد</button></div>' +
      '<input type="file" id="importFile" accept="application/json" hidden></div>' +
      feedbackCard() +
      contactCard() +
      '<details class="card danger-zone"><summary><b>⚠️ المنطقة الخطرة</b></summary><p class="small muted">مسح كل تقدّمك نهائياً. صدّر نسخة احتياطية أولاً.</p>' +
      '<button class="btn outline-danger block" data-action="reset">مسح كل البيانات</button></details>' +
      '<button class="btn ghost block" data-action="go" data-v="home">→ رجوع للرئيسية</button>';
  }

  /* ---------- مهمة «أنا تايه» ---------- */
  function showLost(step) {
    const last = step === LOST_STEPS.length - 1;
    showModal(["🫂", "📚", "📖", "⏳", "🎉"][step], "خطوة " + (step + 1) + " من " + LOST_STEPS.length, LOST_STEPS[step],
      last ? '<button class="btn good block" data-action="lostDone">أنجزتها! ✔</button>' :
        '<button class="btn block" data-action="lostNext" data-step="' + (step + 1) + '">التالي ←</button>' +
        (step === 3 ? '<br><br><button class="btn secondary block" data-action="lostTimer">شغّل مؤقت 5 دقائق</button>' : ""));
  }

  /* ---------- التقييم الأولي غير الرسمي ---------- */
  const LEVELS = [
    { e: "😟", t: "ضعيف جداً" }, { e: "😕", t: "ضعيف" }, { e: "😐", t: "متوسط" }, { e: "🙂", t: "جيد" }, { e: "🤩", t: "ممتاز" }
  ];
  const AWAY = ["أقل من شهر", "1-3 أشهر", "3-6 أشهر", "6-12 شهراً", "أكثر من سنة"];
  let assessDraft = { away: null, levels: {} };

  function viewAssess() {
    const subs = S.profile.subjects;
    const first = !S.assess.length;
    if (!first && !assessDraft.started) {
      const last = S.assess[S.assess.length - 1];
      assessDraft = { away: last.away, levels: Object.assign({}, last.levels), lessons: Object.assign({}, S.profile.lastLesson || {}), started: true };
    }
    const rated = subs.filter(s => assessDraft.levels[s]).length;
    const done = rated === subs.length && assessDraft.away !== null;
    return '<div class="card hero center"><div style="font-size:2.6rem">🩺</div><h2>' + (first ? "تقييم سريع لنقطة البداية" : "أعد تقييم مستواك") + "</h2>" +
      '<p class="muted">ليس امتحاناً ولا توجد إجابة خاطئة! فقط كن صادقاً مع نفسك، لنبني خطتك على مقاسك.' + (first ? " (دقيقة واحدة)" : "") + "</p></div>" +
      '<div class="card"><h3>⏳ كم صار لك بعيد عن الدراسة؟</h3><div class="chips" style="justify-content:flex-start">' +
      AWAY.map((a, i) => '<button class="chip' + (assessDraft.away === i ? " sel" : "") + '" data-action="setAway" data-i="' + i + '">' + a + "</button>").join("") + "</div></div>" +
      '<div class="card"><h3>📊 كيف تشعر بمستواك في كل مادة الآن؟</h3>' +
      subs.map(sb => '<div class="level-row"><b id="lv-' + hashStr(sb) + '">' + esc(sb) + '</b><div class="level-btns" role="radiogroup" aria-labelledby="lv-' + hashStr(sb) + '">' +
        LEVELS.map((l, i) => '<button role="radio" aria-checked="' + (assessDraft.levels[sb] === i + 1) + '" class="' + (assessDraft.levels[sb] === i + 1 ? "sel" : "") + '" data-action="setLevel" data-s="' + esc(sb) + '" data-v="' + (i + 1) + '" aria-label="' + l.t + '"><span aria-hidden="true">' + l.e + "</span><small>" + l.t + "</small></button>").join("") +
        "</div>" +
        '<label class="lesson-label" for="ls-' + hashStr(sb) + '">آخر درس تتذكره <span class="muted">(اختياري)</span></label>' +
        '<input type="text" id="ls-' + hashStr(sb) + '" class="lesson-input" data-s="' + esc(sb) + '" maxlength="60" placeholder="مثلاً: الكسور" value="' + esc((assessDraft.lessons || {})[sb] || "") + '">' +
        "</div>").join("") +
      "</div>" +
      '<button class="btn big block" data-action="saveAssess"' + (done ? "" : " disabled") + ">" + (done ? (first ? "احفظ وابدأ الرحلة ✨" : "احفظ التقييم ✔") : "قيّم كل المواد (" + rated + "/" + subs.length + ")" + (assessDraft.away === null ? " وحدّد مدة الغياب" : "")) + "</button>" +
      (first ? "" : '<div class="stack"><button class="btn ghost block" data-action="cancelAssess">إلغاء</button></div>');
  }
  function saveAssess() {
    const first = !S.assess.length;
    const subs = S.profile.subjects;
    const levels = {};
    subs.forEach(s => { levels[s] = assessDraft.levels[s]; });
    const lastDate = first ? null : S.assess[S.assess.length - 1].date;
    S.assess.push({ date: today(), away: assessDraft.away, levels });
    S.profile.lastLesson = Object.assign({}, S.profile.lastLesson || {});
    Object.entries(assessDraft.lessons || {}).forEach(([k, v]) => { if (v && v.trim()) S.profile.lastLesson[k] = v.trim(); });
    assessDraft = { away: null, levels: {} };
    if (S.daily && !S.daily.list.some(c => c.done)) S.daily = null; // أعد توليد تحديات اليوم بالخطة الجديدة
    save();
    view = "home";
    render();
    const sorted = subs.slice().sort((a, b) => levels[b] - levels[a]);
    const weak = sorted[sorted.length - 1];
    if (first) {
      addXP(20, "أكملت التقييم");
      const away = S.assess[0].away;
      showModal("✨", "مرحباً " + S.profile.name + "!", welcomePlan(levels, away));
    } else {
      if (!lastDate || dayNumber(today()) - dayNumber(lastDate) >= 7) addXP(15, "تقييم جديد");
      showModal("📊", "تم حفظ تقييمك", "شاهد تطوّرك في صفحة «رحلتي». المادة التي تحتاج تركيزاً أكثر الآن: «" + weak + "».");
    }
  }
  function levelsCard() {
    if (!S.assess.length) return "";
    const first = S.assess[0].levels, last = latestLevels();
    const rows = S.profile.subjects.map(sb => {
      const v = last[sb], f = first[sb];
      if (!v) return "";
      const diff = f ? v - f : 0;
      return '<div class="row small" style="margin-bottom:6px"><span style="width:110px">' + esc(sb) + "</span>" +
        '<div class="progress grow"><div style="width:' + v * 20 + '%"></div></div>' +
        "<span>" + LEVELS[v - 1].e + (diff > 0 ? ' <b style="color:var(--good)">↑' + diff + "</b>" : "") + "</span></div>";
    }).join("");
    return '<div class="card"><h3>📊 مستواي في المواد</h3>' +
      '<p class="small muted">حسب تقييمك الذاتي. آخر تقييم: ' + esc(S.assess[S.assess.length - 1].date) + (S.assess.length > 1 ? " · عدد التقييمات: " + S.assess.length : "") + "</p>" + rows +
      '<br><button class="btn secondary block" data-action="reassess">🩺 أعد تقييم مستواك</button></div>';
  }

  /* ---------- التغذية الراجعة والاقتراحات ---------- */
  let fbDraft = { rating: 0, kind: "اقتراح" };
  const FB_KINDS = ["اقتراح", "مشكلة", "أعجبني", "سؤال"];
  function feedbackCard() {
    const sent = S.feedback.length;
    return '<div class="card"><h3>💬 رأيك يهمنا</h3>' +
      '<p class="small muted">قيّم التطبيق واكتب أي اقتراح أو ملاحظة — رأيك يساعدنا نطوّره لك ولغيرك من الطلاب.' + (sent ? " (أرسلت " + sent + " ملاحظة، شكراً لك 💜)" : "") + "</p>" +
      '<div class="stars" role="radiogroup" aria-label="التقييم">' + [1, 2, 3, 4, 5].map(n =>
        '<button class="' + (n <= fbDraft.rating ? "on" : "") + '" data-action="fbStar" data-n="' + n + '" aria-label="' + n + ' نجوم">★</button>').join("") + "</div>" +
      '<div class="chips">' + FB_KINDS.map(k => '<button class="chip' + (fbDraft.kind === k ? " sel" : "") + '" data-action="fbKind" data-k="' + k + '">' + k + "</button>").join("") + "</div>" +
      '<label for="fbText">رسالتك</label><textarea id="fbText" maxlength="1000" placeholder="ما الذي أعجبك؟ ما الذي تتمنى أن نضيفه أو نغيّره؟"></textarea><br><br>' +
      '<button class="btn block" data-action="sendFeedback">أرسل رأيك ✉️</button></div>';
  }
  function sendFeedback(text) {
    const st = stats(), lv = levelInfo(S.xp);
    S.feedback.push({ date: today(), rating: fbDraft.rating, kind: fbDraft.kind, text });
    const firstThisWeek = !S.feedback.slice(0, -1).some(f => dayNumber(today()) - dayNumber(f.date) < 7);
    save();
    const body =
      "التقييم: " + (fbDraft.rating ? "★".repeat(fbDraft.rating) + "☆".repeat(5 - fbDraft.rating) + " (" + fbDraft.rating + "/5)" : "بدون") + "\n" +
      "النوع: " + fbDraft.kind + "\n\n" + text + "\n\n" +
      "— معلومات (بدون بيانات شخصية):\n" +
      "المرحلة الدراسية: " + S.profile.grade + "\nالمستوى في التطبيق: " + lv.level + "\nأيام الاستخدام: " + st.activeDays + "\nالمرحلة: " + st.stageObj.name;
    fbDraft = { rating: 0, kind: "اقتراح" };
    if (firstThisWeek) addXP(10, "شكراً على رأيك"); else { markActive(); save(); }
    render();
    if (CONTACT && CONTACT.email) {
      location.href = "mailto:" + CONTACT.email + "?subject=" + encodeURIComponent("رأي في رحلة العودة — " + S.feedback[S.feedback.length - 1].kind) + "&body=" + encodeURIComponent(body);
    }
    toast("شكراً لك! 💜 سيفتح تطبيق البريد لإرسال رسالتك");
  }
  /* سؤال لطيف عن الرأي بعد 3 أيام استخدام */
  function maybeAskFeedback() {
    if (S.feedbackAsked || !S.profile || stats().activeDays < 3) return;
    S.feedbackAsked = true;
    save();
    setTimeout(() => showModal("💬", "ما رأيك بالتطبيق حتى الآن؟", "مرّت 3 أيام على رحلتك! تقييمك واقتراحاتك تساعدنا نطوّر التطبيق.",
      '<button class="btn block" data-action="goFeedback">أعطِ رأيك</button><br><br><button class="btn secondary block" data-action="closeModal">لاحقاً</button>'), 1200);
  }

  /* ---------- التواصل ---------- */
  function contactLinks() {
    const c = typeof CONTACT !== "undefined" ? CONTACT : {};
    const out = [];
    if (c.whatsapp) out.push({ icon: "💬", label: "واتساب", href: "https://wa.me/" + String(c.whatsapp).replace(/\D/g, "") });
    if (c.instagram) out.push({ icon: "📷", label: "إنستغرام", href: /^https?:/.test(c.instagram) ? c.instagram : "https://instagram.com/" + c.instagram.replace(/^@/, "") });
    if (c.facebook) out.push({ icon: "👍", label: "فيسبوك", href: c.facebook });
    if (c.email) out.push({ icon: "✉️", label: c.email, href: "mailto:" + c.email + "?subject=" + encodeURIComponent("رحلة العودة") });
    return out;
  }
  function contactCard() {
    const links = contactLinks();
    if (!links.length) return "";
    return '<div class="card center"><div style="font-size:2rem">🤝</div><h3>تواصل معنا</h3>' +
      "<p class=\"muted small\">لديك سؤال أو اقتراح أو تحتاج مساعدة؟ تواصل مع <b>" + esc(CONTACT.name) + "</b>" +
      (CONTACT.role ? " — " + esc(CONTACT.role) : "") + "</p>" +
      '<div class="chips">' + links.map(l => '<a class="chip" style="text-decoration:none" target="_blank" rel="noopener" href="' + esc(l.href) + '">' + l.icon + " " + esc(l.label) + "</a>").join("") +
      "</div></div>";
  }

  /* ---------- البطاقات (التكرار المتباعد — نظام لايتنر) ---------- */
  const BOX_DAYS = [0, 1, 2, 4, 8, 16, 30];
  const CARD_XP_DAILY = 10; // عدد البطاقات الجديدة التي تعطي نقاطاً يومياً
  let review = null;
  let cardsFilter = "all";
  const dueCards = () => S.cards.filter(c => c.due <= today());

  let cardFormOpen = false;
  function relDay(key) {
    const d = dayNumber(key) - dayNumber(today());
    return d <= 0 ? "اليوم" : d === 1 ? "غداً" : d === 2 ? "بعد يومين" : "بعد " + d + (d <= 10 ? " أيام" : " يوماً");
  }
  const HOW_CARDS = '<details class="how"><summary>كيف تعمل البطاقات؟</summary><p class="small muted">كل ما عرفت البطاقة تنتقل لصندوق أعلى وتتأخر مراجعتها (من يوم حتى 30 يوماً)، وإذا نسيتها ترجع للبداية. هكذا تثبت المعلومة لمدة طويلة. كن صادقاً: النقاط على المراجعة نفسها، لا على الإجابة.</p></details>';
  function viewCards() {
    if (review) return viewReview();
    const due = dueCards();
    const subs = S.profile.subjects.length ? S.profile.subjects : ["عام"];
    const form = '<section class="card" id="cardForm"><h3>➕ بطاقة جديدة</h3>' +
      '<label for="cardSub">المادة</label><select id="cardSub">' + subs.map(x => "<option" + (x === lastCardSub ? " selected" : "") + ">" + esc(x) + "</option>").join("") + "</select>" +
      '<label for="cardQ">السؤال</label><textarea id="cardQ" dir="auto" maxlength="300" style="min-height:64px" placeholder="مثلاً: ما قانون نيوتن الثاني؟"></textarea>' +
      '<label for="cardA">الجواب</label><textarea id="cardA" dir="auto" maxlength="500" style="min-height:64px" placeholder="القوة = الكتلة × التسارع"></textarea>' +
      '<div class="stack"><button class="btn block" data-action="addCard">أضف البطاقة (+5 ⭐)</button>' +
      (S.cards.length ? '<button class="linkbtn" data-action="closeCardForm">إغلاق</button>' : "") + "</div></section>";
    if (!S.cards.length) {
      return '<section class="card center"><div class="empty-emoji" aria-hidden="true">🗂️</div><h2>بطاقاتي</h2>' +
        '<p class="muted">اكتب سؤالاً من درسك وجوابه، والتطبيق يذكّرك بمراجعته في الوقت المناسب حتى يثبت في ذاكرتك.</p>' +
        (cardFormOpen ? "" : '<button class="btn big block" data-action="openCardForm">➕ اصنع أول بطاقة</button>') + HOW_CARDS + "</section>" +
        (cardFormOpen ? form : "");
    }
    const counts = [1, 2, 3, 4, 5, 6].map(b => S.cards.filter(c => c.box === b).length);
    const mastered = counts[4] + counts[5];
    const nextDue = S.cards.map(c => c.due).sort()[0];
    const list = S.cards.filter(c => cardsFilter === "all" || c.subject === cardsFilter).slice().reverse();
    const usedSubs = subs.filter(x => S.cards.some(c => c.subject === x));
    return '<section class="card"><h2>🗂️ بطاقاتي</h2>' +
      '<div class="mastery" role="img" aria-label="' + S.cards.length + " بطاقة، منها " + mastered + ' متقنة">' +
      counts.map((n, i) => n ? '<i class="b' + (i + 1) + '" style="flex:' + n + '" title="صندوق ' + (i + 1) + ": " + n + '"></i>' : "").join("") + "</div>" +
      '<div class="row small muted mastery-legend"><span class="grow">🌱 جديدة</span><span>' + mastered + " / " + S.cards.length + " متقنة 🎓</span></div>" +
      '<div class="stack">' + (due.length ? '<button class="btn big good block" data-action="startReview">🔁 راجع الآن · ' + due.length + " بطاقة</button>" :
        '<p class="center muted">✔ لا مراجعة اليوم — القادمة ' + relDay(nextDue) + "</p>") + "</div></section>" +
      (cardFormOpen ? form : '<button class="btn ghost block" data-action="openCardForm">➕ بطاقة جديدة</button>') +
      '<section class="card"><h3>كل البطاقات (' + S.cards.length + ")</h3>" +
      (usedSubs.length > 1 ? '<div class="chips" style="justify-content:flex-start">' +
        ['<button class="chip' + (cardsFilter === "all" ? " sel" : "") + '" data-action="cardFilter" data-s="all">الكل</button>']
          .concat(usedSubs.map(x => '<button class="chip' + (cardsFilter === x ? " sel" : "") + '" data-action="cardFilter" data-s="' + esc(x) + '">' + esc(x) + "</button>")).join("") + "</div>" : "") +
      '<ul class="list-plain">' + list.map(c =>
        '<li><div class="row"><b class="grow" dir="auto">' + esc(c.q) + "</b>" +
        '<button class="icon-x" data-action="delCard" data-id="' + esc(c.id) + '" aria-label="حذف البطاقة">🗑️</button></div>' +
        '<div class="muted small" dir="auto">' + esc(c.a) + "</div>" +
        '<div class="meta">' + esc(c.subject) + " · 📦 " + (+c.box || 1) + " · " + (c.due <= today() ? "للمراجعة اليوم" : "المراجعة " + relDay(c.due)) + "</div></li>").join("") +
      "</ul>" + HOW_CARDS + "</section>";
  }
  let lastCardSub = null;

  function viewReview() {
    const r = review;
    const c = S.cards.find(x => x.id === r.queue[0]);
    if (!c) {
      return '<section class="card center"><div class="empty-emoji" aria-hidden="true">🎉</div><h2>انتهت المراجعة!</h2>' +
        '<p class="big-stat">راجعت ' + r.done + " · ⭐+" + (r.xp || 0) + "</p>" +
        '<p class="muted small">عرفت ' + r.right + " من أول مرة. البطاقات التي نسيتها ستعود غداً.</p>" +
        '<button class="btn block" data-action="endReview">تمام</button></section>';
    }
    const total = r.done + r.queue.length;
    return '<section class="card center review">' +
      '<div class="game-head"><button class="icon-x" data-action="endReview" aria-label="إنهاء المراجعة">✕</button>' +
      '<div class="progress grow"><div style="width:' + Math.round(r.done / total * 100) + '%"></div></div><span class="muted small">' + r.queue.length + "</span></div>" +
      '<span class="tag">' + esc(c.subject) + "</span>" +
      '<div class="flash" dir="auto">' + esc(c.q) + "</div>" +
      (r.show ?
        '<div class="flash answer" dir="auto">' + esc(c.a) + "</div>" +
        '<div class="grid-2"><button class="btn good big" data-action="grade" data-ok="1">✔ عرفتها</button>' +
        '<button class="btn outline big" data-action="grade" data-ok="0">✖ ما عرفتها</button></div>' +
        '<p class="small muted">كن صادقاً — النقاط على المراجعة نفسها 😉</p>' :
        '<button class="btn big block" data-action="showAnswer">👀 أظهر الجواب</button><p class="small muted">حاول تتذكّر الجواب أولاً…</p>') +
      "</section>";
  }
  function gradeCard(ok) {
    const r = review;
    const id = r.queue.shift();
    const c = S.cards.find(x => x.id === id);
    if (!c) { render(); return; }
    const rec = dayRec();
    rec.reviews = (rec.reviews || 0) + 1;
    S.reviews = (S.reviews || 0) + 1;
    r.show = false;
    // النقاط على المراجعة الصادقة (عرفتها أو لا) حتى لا نكافئ الضغط على «عرفتها» دون تذكّر
    // وبحد أقصى 60 نقطة مراجعة يومياً
    const reviewXP = () => { rec.reviewXp = (rec.reviewXp || 0) + 2; if (rec.reviewXp <= 60) { addXP(2); r.xp = (r.xp || 0) + 2; } else markActive(); };
    if (ok && r.retried.includes(id)) {
      // نسيتها ثم تذكرتها في نفس الجلسة: تبقى في الصندوق 1 وتعود غداً
      markActive();
    } else if (ok) {
      c.box = Math.min(6, c.box + 1);
      c.due = dateKey(addDays(new Date(), BOX_DAYS[c.box]));
      r.right++; r.done++; reviewXP();
    } else {
      c.box = 1;
      c.due = dateKey(addDays(new Date(), 1));
      if (!r.retried.includes(id)) { r.done++; r.retried.push(id); r.queue.push(id); reviewXP(); }
      markActive();
    }
    save();
    checkBadges();
    render();
  }

  /* ---------- تحدي المعلومات ---------- */
  function startQuiz() {
    const subs = S.profile.subjects;
    const primary = S.profile.grade === "ابتدائي";
    const bank = QUIZ.filter(q => !(primary && (q.lvl === 2 || q.s === "الفيزياء" || q.s === "الكيمياء")));
    const mine = shuffle(bank.filter(q => subs.includes(q.s)));
    const others = shuffle(bank.filter(q => !subs.includes(q.s)));
    const qs = mine.concat(others).slice(0, 10).map(q => Object.assign({}, q, { order: shuffle([0, 1, 2, 3]) }));
    game = { type: "quiz", qs: shuffle(qs), i: 0, score: 0, picked: null, over: false };
    render();
  }
  function viewQuiz() {
    const g = game;
    if (g.over) {
      const msg = g.score >= 9 ? "مجهود رائع! 🏆" : g.score >= 7 ? "ممتاز جداً! 🌟" : g.score >= 5 ? "جيد، استمر! 💪" : "كل محاولة تعلّمك شيئاً جديداً 🌱";
      return '<div class="card center"><div style="font-size:3rem">❓</div><h2>' + msg + "</h2><p>نتيجتك: <b>" + g.score + " / 10</b></p>" +
        '<button class="btn" data-action="startQuiz">مرة أخرى</button> <button class="btn secondary" data-action="exitGame">رجوع</button></div>';
    }
    const q = g.qs[g.i];
    return '<div class="card">' + gameHead("❓ " + esc(q.s), '<span class="muted small">' + (g.i + 1) + " / 10 · ✔ " + g.score + "</span>") +
      '<div class="progress" style="margin:4px 0 14px"><div style="width:' + (g.i / 10 * 100) + '%"></div></div>' +
      '<h3 style="margin-bottom:14px">' + esc(q.q) + "</h3>" +
      '<div class="opts">' + q.order.map(idx => {
        let cls = "opt";
        if (g.picked !== null) { if (idx === q.a) cls += " right"; else if (idx === g.picked) cls += " wrong"; }
        const mark = g.picked === null ? "" : idx === q.a ? "✔ " : idx === g.picked ? "✖ " : "";
        return '<button class="' + cls + '" data-action="quizAns" data-i="' + idx + '"' + (g.picked !== null ? " disabled" : "") + ">" + mark + esc(q.o[idx]) + "</button>";
      }).join("") + "</div>" +
      (g.picked !== null && g.picked !== q.a ? '<p class="small" style="margin:12px 0 0">✅ الإجابة الصحيحة: <b>' + esc(q.o[q.a]) + "</b></p>" +
        (g.added && g.added.includes(g.i) ? '<p class="small muted">أضيفت لبطاقاتك ✔</p>' : '<button class="chip small" style="margin-top:8px" data-action="quizToCard">➕ أضفها لبطاقاتي للمراجعة</button>') : "") +
      (g.picked !== null ? '<br><button class="btn block" data-action="quizNext">' + (g.i === 9 ? "النتيجة 🏁" : "التالي ←") + "</button>" : "") + "</div>";
  }

  /* ---------- مشاركة/حفظ الملفات داخل تطبيق Android ---------- */
  function isNative() { const C = window.Capacitor; return !!(C && C.isNativePlatform && C.isNativePlatform()); }
  function blobToBase64(blob) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(blob); });
  }
  // يرجع true إذا تمت المشاركة عبر التطبيق الأصلي
  async function nativeShareFile(name, data, base64, text) {
    if (!isNative()) return false;
    const P = window.Capacitor.Plugins || {};
    if (!P.Filesystem || !P.Share) return false;
    try {
      const opts = { path: name, data, directory: "CACHE" };
      if (!base64) opts.encoding = "utf8";
      const r = await P.Filesystem.writeFile(opts);
      await P.Share.share({ title: "رحلة العودة", text, files: [r.uri], dialogTitle: "مشاركة / حفظ" });
      return true;
    } catch (e) {
      if (/cancel/i.test(String((e && e.message) || e))) return true;
      toast("تعذّرت المشاركة");
      return true;
    }
  }

  /* ---------- مشاركة الإنجاز ---------- */
  async function shareProgress() {
    const st = stats(), lv = levelInfo(S.xp);
    const W = 1080, H = 1350;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const x = cv.getContext("2d");
    const g = x.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#6c4cf5"); g.addColorStop(0.6, "#b05cff"); g.addColorStop(1, "#ff8a3d");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    const F = (w, sz) => w + " " + sz + 'px system-ui, "Segoe UI", "Noto Sans Arabic", Tahoma, sans-serif';
    x.direction = "rtl"; x.textAlign = "center"; x.fillStyle = "#fff";
    x.font = F(800, 60); x.fillText("🚀 رحلة العودة", W / 2, 140);
    x.font = F(800, 96); x.fillText(S.profile.name, W / 2, 330);
    x.font = F(600, 54); x.fillText("المستوى " + lv.level + " — " + lv.title, W / 2, 425);
    x.font = F(600, 44); x.fillText("المرحلة: " + st.stageObj.icon + " " + st.stageObj.name, W / 2, 500);
    const boxes = [["🔥", st.streak, "أيام متتالية"], ["⭐", S.xp, "نقطة"], ["⏱️", S.totalFocus, "دقيقة تركيز"], ["🏅", S.badges.length, "وسام"]];
    boxes.forEach((b, i) => {
      const bx = 90 + (i % 2) * 470, by = 580 + Math.floor(i / 2) * 260, bw = 430, bh = 220;
      x.fillStyle = "rgba(255,255,255,0.18)";
      if (x.roundRect) { x.beginPath(); x.roundRect(bx, by, bw, bh, 36); x.fill(); } else x.fillRect(bx, by, bw, bh);
      x.fillStyle = "#fff";
      x.font = F(800, 84); x.fillText(b[0] + " " + b[1], bx + bw / 2, by + 115);
      x.font = F(600, 40); x.fillText(b[2], bx + bw / 2, by + 180);
    });
    x.font = F(700, 46); const qt = QUOTES[dayNumber(today()) % QUOTES.length];
    x.fillText(qt.startsWith("«") ? qt : "«" + qt + "»", W / 2, 1180, W - 120);
    x.font = F(600, 34); x.globalAlpha = 0.85; x.fillText("ابدأ رحلتك أنت أيضاً ✨", W / 2, 1270); x.globalAlpha = 1;

    const blob = await new Promise(r => cv.toBlob(r, "image/png"));
    if (!blob) { toast("تعذّر إنشاء الصورة"); return; }
    const file = new File([blob], "rehla-" + today() + ".png", { type: "image/png" });
    const text = "وصلت للمستوى " + lv.level + " في رحلة العودة 🚀 ودرست " + st.activeDays + " يوماً 📚";
    if (await nativeShareFile(file.name, await blobToBase64(blob), true, text)) return;
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], text }); return; }
      catch (e) { if (e && e.name === "AbortError") return; }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = file.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast("تم حفظ الصورة 📸 شاركها مع أصحابك!");
  }

  let keptText = null, keptScroll = 0;
  function keepText() { const f = $("#fbText"); keptText = f ? f.value : null; keptScroll = window.scrollY; }
  function restoreText() { const f = $("#fbText"); if (f && keptText !== null) f.value = keptText; window.scrollTo(0, keptScroll); keptText = null; }

  /* ================= الأحداث ================= */
  document.addEventListener("click", e => {
    const navBtn = e.target.closest("#nav button");
    if (navBtn) {
      if (game && game.type === "math" && !game.over) { clearInterval(mathInt); }
      game = null;
      review = null;
      view = navBtn.dataset.view;
      render();
      return;
    }
    if (e.target.id === "modal") { closeModal(); return; }
    const el = e.target.closest("[data-action]");
    if (!el) return;
    const a = el.dataset.action;
    tapEl = el;
    switch (a) {
      case "closeModal": closeModal(); break;
      case "go":
        game = null; review = null;
        if (el.dataset.v === "settings") onboardSel = S.profile.subjects.slice();
        view = el.dataset.v; render(); break;
      case "obSubject": {
        const s = el.dataset.s;
        const arr = onboardSel;
        const i = arr.indexOf(s);
        if (i >= 0) arr.splice(i, 1); else arr.push(s);
        el.classList.toggle("sel");
        el.setAttribute("aria-pressed", String(i < 0));
        break;
      }
      case "obStart": {
        const name = $("#obName").value.trim();
        if (!name) { toast("اكتب اسمك أولاً 🙂"); return; }
        if (!onboardSel.length) { toast("اختر مادة واحدة على الأقل"); return; }
        const whenEl = document.querySelector('[data-action="obWhen"].sel');
        S.profile = { name, grade: $("#obGrade").value, subjects: onboardSel.slice(), minutes: +$("#obMinutes").value, goal: $("#obGoal").value.trim(), when: whenEl ? whenEl.dataset.w : "", lastLesson: {} };
        save();
        assessDraft = { away: null, levels: {} };
        view = "assess";
        render();
        break;
      }
      case "saveSettings": {
        const name = $("#obName").value.trim();
        if (!name) { toast("الاسم مطلوب"); return; }
        if (!onboardSel.length) { toast("اختر مادة واحدة على الأقل"); return; }
        S.profile.subjects = onboardSel.slice();
        S.profile.name = name;
        S.profile.minutes = +$("#obMinutes").value;
        S.profile.goal = $("#obGoal").value.trim();
        { const w = document.querySelector('[data-action="obWhen"].sel'); S.profile.when = w ? w.dataset.w : ""; }
        if (S.daily && !S.daily.list.some(c => c.done)) buildDaily(S.daily.rerolls);
        save();
        toast("تم الحفظ ✔");
        render();
        break;
      }
      case "mood": {
        const rec = dayRec();
        const prev = rec.mood;
        rec.mood = +el.dataset.i;
        save();
        // أعد توليد التحديات حسب المزاج إذا لم يبدأ بعد
        if (prev !== rec.mood && !S.daily.list.some(c => c.done)) buildDaily(S.daily.rerolls);
        render();
        break;
      }
      case "toggle": toggleChallenge(el.dataset.id); break;
      case "reroll": buildDaily(S.daily.rerolls + 1); toast("تحديات جديدة 🎲"); render(); break;
      case "reflect": {
        const txt = ($("#reflectText").value || "").trim();
        if (txt.length < 5) { toast("اكتب جملة على الأقل 🙂"); return; }
        S.journal.push({ date: today(), text: txt });
        reflectOpen = false;
        dayRec().reflected = true;
        save();
        addXP(15, "تأمّل رائع");
        render();
        break;
      }
      case "claimWeekly": {
        const wk = weeklyChallenge();
        if (wk.val >= wk.target && !wk.claimed) {
          S.weeklyClaimed[wk.key] = true;
          save();
          confetti();
          addXP(150, "تحدي الأسبوع!");
          render();
        }
        break;
      }
      case "lost": showLost(0); break;
      case "lostNext": showLost(+el.dataset.step); break;
      case "lostTimer": closeModal(); startTimer(5, S.profile.subjects[0] || "عام"); break;
      case "lostDone": {
        closeModal();
        const r = dayRec();
        if (r.lost) { markActive(); save(); toast("أحسنت! 💪 استمر"); break; }
        r.lost = true;
        S.lostDone++;
        save();
        addXP(20, "بدأت فعلاً!");
        break;
      }
      case "setMin": focusChoice.minutes = +el.dataset.m; render(); break;
      case "setSub": focusChoice.subject = el.dataset.s; render(); break;
      case "startTimer": startTimer(focusChoice.minutes, focusChoice.subject); break;
      case "focusFor": focusChoice = { minutes: Math.min(60, +el.dataset.m), subject: el.dataset.s }; startTimer(focusChoice.minutes, focusChoice.subject, false, el.dataset.id); break;
      case "stopTimer": {
        if (!S.timer) return;
        const doneMin = Math.floor((S.timer.minutes * 60000 - (S.timer.end - Date.now())) / 60000);
        askConfirm("⏸️", "إنهاء الجلسة الآن؟",
          doneMin >= 3 ? "سنحسب لك الدقائق التي درستها (" + doneMin + "). أحسنت على ما أنجزته!" : "درست أقل من 3 دقائق، لذلك لن تُحسب نقاط هذه المرة. لا بأس، جرّب جلسة أقصر.",
          "إنهاء", () => {
            if (!S.timer) return;
            const m = Math.floor((S.timer.minutes * 60000 - (S.timer.end - Date.now())) / 60000);
            if (m >= 3) { S.timer.minutes = m; finishTimer(); }
            else { clearInterval(timerInt); S.timer = null; save(); document.title = "رحلة العودة"; render(); }
          });
        break;
      }
      case "startMath": view = "games"; startMath(); break;
      case "mathAns": {
        if (!game || game.over) return;
        if (+el.dataset.v === game.q.ans) game.score++; else { game.wrong++; if (navigator.vibrate) navigator.vibrate(60); }
        game.q = mathQuestion();
        render();
        break;
      }
      case "startMemory": view = "games"; startMemory(); break;
      case "memFlip": memFlip(+el.dataset.i); break;
      case "exitGame": game = null; render(); break;
      case "startQuiz": view = "games"; startQuiz(); break;
      case "quizAns": {
        if (!game || game.type !== "quiz" || game.picked !== null) return;
        game.picked = +el.dataset.i;
        const ok = game.picked === game.qs[game.i].a;
        if (ok) game.score++; else if (navigator.vibrate) navigator.vibrate(60);
        render();
        break;
      }
      case "quizNext": {
        if (!game || game.type !== "quiz") return;
        game.i++; game.picked = null;
        if (game.i >= game.qs.length) {
          game.over = true;
          if (S.best.quiz == null || game.score > S.best.quiz) S.best.quiz = game.score;
          save();
          gameXP(game.score * 3);
          if (game.score === 10) confetti();
        }
        render();
        break;
      }
      case "addCard": {
        const q = ($("#cardQ").value || "").trim(), ans = ($("#cardA").value || "").trim();
        if (!q || !ans) { toast("اكتب السؤال والجواب 🙂"); return; }
        lastCardSub = $("#cardSub").value;
        cardFormOpen = true;
        S.cards.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), subject: lastCardSub, q, a: ans, box: 1, due: today() });
        const rec = dayRec();
        rec.cardsAdded = (rec.cardsAdded || 0) + 1;
        save();
        if (rec.cardsAdded <= CARD_XP_DAILY) addXP(5, "بطاقة جديدة"); else { markActive(); save(); toast("أضيفت البطاقة ✔"); checkBadges(); }
        render();
        setTimeout(() => { const f = $("#cardQ"); if (f) f.focus(); }, 50);
        break;
      }
      case "delCard":
        { const id = el.dataset.id; askConfirm("🗑️", "حذف هذه البطاقة؟", "لا يمكن التراجع عن الحذف.", "احذف", () => { S.cards = S.cards.filter(c => c.id !== id); save(); render(); }, true); }
        break;
      case "cardFilter": cardsFilter = el.dataset.s; render(); break;
      case "startReview": review = { queue: shuffle(dueCards().map(c => c.id)), show: false, done: 0, right: 0, retried: [] }; render(); break;
      case "showAnswer": if (review) { review.show = true; render(); } break;
      case "grade": gradeCard(el.dataset.ok === "1"); break;
      case "endReview": review = null; render(); break;
      case "share": shareProgress(); break;
      case "obNext": obNext(); break;
      case "obBack": { const nm = $("#obName"); if (nm) ob.name = nm.value.trim(); ob.step = Math.max(0, ob.step - 1); renderOnboarding(); break; }
      case "obSet": {
        const k = el.dataset.k, v = el.dataset.v;
        if (k === "lvl") { const steps = obSteps(); ob.levels[onboardSel[+steps[ob.step].split(":")[1]]] = +v; }
        else if (k === "minutes" || k === "away") ob[k] = +v;
        else ob[k] = (ob[k] === v && k === "when") ? "" : v;
        renderOnboarding();
        if (el.dataset.auto) setTimeout(obNext, reducedMotion() ? 0 : 220);
        break;
      }
      case "streakSheet": streakSheet(); break;
      case "goNext": closeModal(); view = "home"; render(); break;
      case "openReflect": reflectOpen = true; render(); setTimeout(() => { const f = $("#reflectText"); if (f) f.focus(); }, 30); break;
      case "writeReflect": reflectOpen = true; view = "challenges"; render(); setTimeout(() => { const f = $("#reflectCard"); if (f) f.scrollIntoView({ block: "center" }); const t = $("#reflectText"); if (t) t.focus({ preventScroll: true }); }, 30); break;
      case "openCardForm": cardFormOpen = true; render(); setTimeout(() => { const f = $("#cardForm"); if (f) f.scrollIntoView({ block: "start", behavior: reducedMotion() ? "auto" : "smooth" }); const q = $("#cardQ"); if (q) q.focus({ preventScroll: true }); }, 30); break;
      case "closeCardForm": cardFormOpen = false; render(); break;
      case "restDay": {
        const rec = dayRec();
        rec.rest = true;
        markActive();
        save();
        toast("🌿 يوم راحة — تقدّمك وسلسلتك محفوظة");
        render();
        break;
      }
      case "quizToCard": {
        if (!game || game.type !== "quiz") return;
        const q = game.qs[game.i];
        S.cards.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), subject: q.s, q: q.q, a: q.o[q.a], box: 1, due: dateKey(addDays(new Date(), 1)) });
        (game.added = game.added || []).push(game.i);
        save();
        toast("أضيفت لبطاقاتك 🗂️");
        render();
        break;
      }
      case "obWhen":
        document.querySelectorAll('[data-action="obWhen"]').forEach(x => x.classList.toggle("sel", x === el && !el.classList.contains("sel")));
        break;
      case "confirmYes": { const f = pendingConfirm; pendingConfirm = null; closeModal(); if (f) f(); break; }
      case "setTheme": Theme.set(el.dataset.t); break;
      case "setAway": assessDraft.away = +el.dataset.i; render(); break;
      case "setLevel": assessDraft.levels[el.dataset.s] = +el.dataset.v; render(); break;
      case "saveAssess": saveAssess(); break;
      case "reassess": assessDraft = { away: null, levels: {} }; view = "assess"; render(); break;
      case "cancelAssess": assessDraft = { away: null, levels: {} }; view = "journey"; render(); break;
      case "openSettings": game = null; review = null; onboardSel = S.profile.subjects.slice(); view = "settings"; render(); break;
      case "fbStar": fbDraft.rating = +el.dataset.n; keepText(); render(); restoreText(); break;
      case "fbKind": fbDraft.kind = el.dataset.k; keepText(); render(); restoreText(); break;
      case "sendFeedback": {
        const t = ($("#fbText").value || "").trim();
        if (!t && !fbDraft.rating) { toast("اختر تقييماً أو اكتب رسالة 🙂"); return; }
        sendFeedback(t);
        break;
      }
      case "goFeedback":
        closeModal(); onboardSel = S.profile.subjects.slice(); view = "settings"; render();
        setTimeout(() => { const f = $("#fbText"); if (f) { f.scrollIntoView({ block: "center" }); f.focus(); } }, 100);
        break;
      case "export": {
        const json = JSON.stringify(S);
        const fname = "rehla-backup-" + today() + ".json";
        if (isNative()) { nativeShareFile(fname, json, false, "نسخة احتياطية من رحلة العودة"); break; }
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url; link.download = "rehla-backup-" + today() + ".json";
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        break;
      }
      case "import": $("#importFile").click(); break;
      case "reset":
        askConfirm("⚠️", "مسح كل البيانات؟", "سيتم حذف كل تقدّمك نهائياً. ننصحك بتصدير نسخة احتياطية أولاً.", "امسح كل شيء", () => {
          S = structuredCloneSafe(DEFAULT_STATE); onboardSel = []; save(); view = "home"; render();
        }, true);
        break;
    }
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Enter" && e.target && e.target.id === "obName") { e.preventDefault(); obNext(); }
  });
  document.addEventListener("toggle", e => { if (e.target && e.target.id === "progressCard") progressOpen = e.target.open; }, true);
  document.addEventListener("input", e => {
    if (e.target.classList && e.target.classList.contains("lesson-input")) {
      assessDraft.lessons = assessDraft.lessons || {};
      assessDraft.lessons[e.target.dataset.s] = e.target.value;
    }
  });

  document.addEventListener("change", e => {
    if (e.target.id !== "importFile" || !e.target.files[0]) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || typeof data !== "object" || !("xp" in data)) throw new Error("bad");
        const next = sanitizeState(Object.assign(structuredCloneSafe(DEFAULT_STATE), data));
        const old = S;
        S = next;
        try { view = "home"; render(); } catch (err2) { S = old; render(); throw err2; }
        save();
        toast("تم استيراد البيانات ✔");
      } catch (err) { toast("الملف غير صالح"); }
      e.target.value = "";
    };
    reader.readAsText(e.target.files[0]);
  });

  // عند العودة للتطبيق: حدّث اليوم والمؤقت
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    if (S.timer && S.timer.end <= Date.now()) finishTimer();
    else if (S.profile && S.daily && S.daily.date !== today()) render();
  });

  /* ---------- زر الوضع في الشريط العلوي ---------- */
  function syncThemeUI() {
    const dark = Theme.effective() === "dark";
    const b = $("#themeBtn");
    if (b) {
      b.querySelector(".ico").textContent = dark ? "☀️" : "🌙";
      b.setAttribute("aria-label", dark ? "التبديل إلى الوضع الفاتح" : "التبديل إلى الوضع الداكن");
      b.title = b.getAttribute("aria-label");
    }
    document.querySelectorAll('[data-action="setTheme"]').forEach(x => {
      const on = x.dataset.t === Theme.get();
      x.classList.toggle("sel", on);
      x.setAttribute("aria-checked", String(on));
    });
  }
  $("#themeBtn").addEventListener("click", () => {
    Theme.toggle();
    toast(Theme.effective() === "dark" ? "🌙 الوضع الداكن" : "☀️ الوضع الفاتح");
  });
  document.addEventListener("themechange", syncThemeUI);
  syncThemeUI();

  /* ================= التشغيل ================= */
  render();
  if (S.timer) {
    if (S.timer.end <= Date.now()) finishTimer(); else ensureTimerLoop();
  }
  // إذا بقي التطبيق مفتوحاً بعد منتصف الليل: حدّث تحديات اليوم
  setInterval(() => {
    if (S.profile && S.daily && S.daily.date !== today() && ["home", "challenges"].includes(view) && $("#modal").classList.contains("hidden")) render();
  }, 60000);

  // تحديثات التطبيق: نعرض شريط «تحديث جديد» بدل خلط الإصدارات
  function showUpdateBar(worker) {
    if ($("#updateBar")) return;
    const bar = document.createElement("div");
    bar.id = "updateBar";
    bar.className = "update-bar";
    bar.setAttribute("role", "status");
    bar.innerHTML = '<span>✨ نسخة جديدة من التطبيق جاهزة</span><button class="btn" type="button">حدّث الآن</button>';
    bar.querySelector("button").addEventListener("click", () => { worker.postMessage("SKIP_WAITING"); bar.remove(); });
    document.body.appendChild(bar);
  }
  if ("serviceWorker" in navigator && location.protocol.startsWith("http") && !isNative()) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").then(reg => {
        if (reg.waiting && navigator.serviceWorker.controller) showUpdateBar(reg.waiting);
        reg.addEventListener("updatefound", () => {
          const w = reg.installing;
          if (w) w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) showUpdateBar(w); });
        });
      }).catch(() => {});
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => { if (refreshing) return; refreshing = true; location.reload(); });
    });
  }
})();
