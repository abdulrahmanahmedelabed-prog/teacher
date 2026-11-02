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
    timer: null,            // {end, minutes, subject}
    settings: { sound: true, volume: 0.6, haptics: true, quiet: true, ambient: false,
      young: false, readAloud: false, voice: "woman", voiceIn: true, together: false, stt: "", simple: false },
    books: [],              // كتبي: [{id, title, subject, kind:"file"|"link", mime, size, url, fileId, added}]
    bookChats: {},          // محادثات المعلم الذكي لكل كتاب: {id: [{role, text}]}
    deviceId: "",
    // التذكيرات (مطفأة حتى يوافق الطالب) — حسب تصميم الوكيل التربوي
    reminders: { on: false, time: "", lead: 10, days: [0, 1, 2, 3, 4, 6], miss: true, showName: false, shared: false,
      pausedUntil: "", asks: 0, askedOn: "", onSince: "", reduced: false, helpfulAsked: false, lastPlan: [] },
    notif: { scheduled: 0, tapped: 0, ignored: 0, pauses: 0, disables: 0, helpful: null }
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
      box: Math.min(6, Math.max(1, Math.round(num(c.box)) || 1)), due: dateOk(c.due) ? c.due : dateKey(),
      deck: c.deck === "letters" ? "letters" : undefined
    }));
    st.assess = st.assess.filter(a => a && typeof a === "object" && dateOk(a.date) && a.levels && typeof a.levels === "object");
    st.assess.forEach(a => { Object.keys(a.levels).forEach(k => { a.levels[k] = Math.min(5, Math.max(1, Math.round(num(a.levels[k])) || 3)); }); a.away = num(a.away); });
    st.journal = st.journal.filter(j => j && typeof j === "object").map(j => {
      const o = { date: str(j.date).slice(0, 10), text: str(j.text) };
      if (/^vn[A-Za-z0-9]+$/.test(str(j.vn))) o.vn = j.vn;
      return o;
    });
    st.feedback = st.feedback.filter(f => f && typeof f === "object" && dateOk(f.date));
    if (st.profile !== null) {
      if (!st.profile || typeof st.profile !== "object" || !Array.isArray(st.profile.subjects)) throw new Error("bad profile");
      st.profile.subjects = st.profile.subjects.filter(x => typeof x === "string");
      if (!st.profile.subjects.length) st.profile.subjects = [SUBJECTS[0]];
      st.profile.name = str(st.profile.name).slice(0, 30) || "طالب";
      st.profile.minutes = Math.min(240, Math.max(10, num(st.profile.minutes) || 45));
    }
    const defSet = { sound: true, volume: 0.6, haptics: true, quiet: true, ambient: false };
    const set0 = st.settings && typeof st.settings === "object" ? st.settings : {};
    st.settings = {
      sound: set0.sound !== false, volume: Math.min(1, Math.max(0, typeof set0.volume === "number" ? set0.volume : defSet.volume)),
      haptics: set0.haptics !== false, quiet: set0.quiet !== false, ambient: set0.ambient === true,
      young: set0.young === true, readAloud: set0.readAloud === true, voice: ["woman", "man", "girl", "boy"].includes(set0.voice) ? set0.voice : "woman", voiceIn: set0.voiceIn !== false,
      together: set0.together === true, stt: set0.stt === "cloud" || set0.stt === "local" ? set0.stt : "", simple: set0.simple === true
    };
    if (st.profile && st.profile.cls != null) st.profile.cls = Math.min(13, Math.max(1, Math.round(num(st.profile.cls)) || 0)) || undefined;
    st.books = arr(st.books).filter(b => b && typeof b === "object").map(b => ({
      id: safeId(b.id), title: str(b.title).slice(0, 80) || "كتاب", subject: str(b.subject).slice(0, 40),
      kind: b.kind === "link" ? "link" : "file", mime: str(b.mime).slice(0, 40), size: Math.max(0, num(b.size)),
      url: /^https:\/\//i.test(str(b.url)) ? str(b.url).slice(0, 2000) : "",
      notes: b.notes && typeof b.notes === "object" ? Object.fromEntries(Object.entries(b.notes).slice(-6).map(([k, v]) => [str(k).slice(0, 80), str(v).slice(0, 24000)])) : {},
      fileId: "", added: dateOk(b.added) ? b.added : dateKey()
    }));
    if (!st.bookChats || typeof st.bookChats !== "object") st.bookChats = {};
    Object.keys(st.bookChats).forEach(k => {
      st.bookChats[k] = arr(st.bookChats[k]).filter(m => m && (m.role === "user" || m.role === "assistant")).map(m => ({ role: m.role, text: str(m.text).slice(0, 6000) })).slice(-30);
    });
    st.deviceId = /^[A-Za-z0-9]{8,40}$/.test(str(st.deviceId)) ? st.deviceId : "";
    const r0 = st.reminders && typeof st.reminders === "object" ? st.reminders : {};
    st.reminders = {
      on: r0.on === true, time: /^\d{2}:\d{2}$/.test(str(r0.time)) ? r0.time : "", lead: [0, 10, 15, 30].includes(r0.lead) ? r0.lead : 10,
      days: arr(r0.days).filter(d => Number.isInteger(d) && d >= 0 && d <= 6).length ? arr(r0.days).filter(d => Number.isInteger(d) && d >= 0 && d <= 6) : [0, 1, 2, 3, 4, 6],
      miss: r0.miss !== false, showName: r0.showName === true, shared: r0.shared === true,
      pausedUntil: dateOk(r0.pausedUntil) ? r0.pausedUntil : "", asks: Math.min(2, Math.max(0, num(r0.asks))), askedOn: dateOk(r0.askedOn) ? r0.askedOn : "",
      onSince: dateOk(r0.onSince) ? r0.onSince : "", reduced: r0.reduced === true, helpfulAsked: r0.helpfulAsked === true,
      lastPlan: arr(r0.lastPlan).filter(x => x && typeof x.at === "number").slice(0, 12)
    };
    const n0 = st.notif && typeof st.notif === "object" ? st.notif : {};
    st.notif = { scheduled: num(n0.scheduled), tapped: num(n0.tapped), ignored: num(n0.ignored), pauses: num(n0.pauses), disables: num(n0.disables), helpful: n0.helpful === true || n0.helpful === false ? n0.helpful : null };
    if (st.profile && st.profile.g !== "m" && st.profile.g !== "f") delete st.profile.g;
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
        "لقب جديد تستحقه! كل مستوى يقرّبك من هدفك" + (S.profile && S.profile.goal ? " «" + S.profile.goal + "»" : "") + ". استمر، أنت تتقدّم فعلاً.", null, "levelup");
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
      celebrate(b.icon, "وسام جديد: " + b.name, b.desc, null, "badge");
    }, 400);
  }

  /* ================= التحديات اليومية ================= */
  function buildDaily(rerolls) {
    const key = today();
    const st = stats();
    const p = S.profile;
    const r = rng(hashStr(key + ":" + rerolls + ":" + (p.name || "")));
    const mood = dayRec().mood;
    // الصغار: 3 أنشطة قصيرة بالصور (5 دقائق لكل نشاط، 15 دقيقة يومياً كحد أقصى)
    if (S.settings.young) {
      const pool = shuffle(CHALLENGE_YOUNG, r);
      const well = pool.find(x => x.cat === "well");
      const picks = (LOW_MOODS.includes(mood) ? [well] : []).concat(pool.filter(x => x.cat !== "well")).slice(0, LOW_MOODS.includes(mood) ? 2 : 3);
      const letter = LETTERS[dayNumber(key) % LETTERS.length];
      const subs0 = subjectPlan(st.stage);
      const list0 = picks.map((x, i) => ({
        id: "young" + i, type: "young", e: x.e, cat: x.cat,
        text: x.t.replace(/\{letter\}/g, letter[0]), say: x.say.replace(/\{letter\}/g, letter[0]),
        subject: subs0[i % subs0.length], minutes: 5, xp: 15, done: false
      }));
      S.daily = { date: key, rerolls, list: list0, fullAwarded: false };
      dayRec().given = list0.length;
      save();
      return;
    }
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
    const qCount = studentClass() <= 3 ? Math.min(5, 3 + st.stage) : 3 + st.stage * 2;

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
    if (st.stage >= 2 && !low) make("study", S.settings.readAloud && st.stage <= 3 ? pick(FLUENCY_TEMPLATES, r) : studyTpls[1], subjectAt(1), base * 0.4);

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
    fx("complete");
    addXP(ch.xp);
    justDone = ch.id;
    if (S.daily.list.every(c => c.done) && !S.daily.fullAwarded && !rec.full) {
      S.daily.fullAwarded = true;
      rec.full = true;
      S.fullDays++;
      save();
      addXP(30, "يوم مثالي!");
      fx("perfect");
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
      (body ? sayBtn(title + ". " + body) : "") +
      (buttons || '<button class="btn block" data-action="closeModal">رائع!</button>');
    const m = $("#modal");
    if (m.classList.contains("hidden")) modalReturn = document.activeElement;
    m.classList.remove("hidden");
    const b = m.querySelector("button:not(.say-btn)");
    if (b) b.focus();
    if (wantsRead() && S.settings.sound && body) setTimeout(() => sayNow(title + ". " + body), 300);
  }
  function closeModal() {
    $("#modal").classList.add("hidden");
    if (modalReturn && document.body.contains(modalReturn)) { try { modalReturn.focus({ preventScroll: true }); } catch (e) {} }
    modalReturn = null;
    if (celebrateQ.length) setTimeout(() => {
      if (!$("#modal").classList.contains("hidden") || !celebrateQ.length) return;
      const a = celebrateQ.shift();
      showModal(a[0], a[1], a[2], a[3], "celebrate");
      if (a[4]) fx(a[4]);
    }, 260);
  }
  /* صوت + اهتزاز معاً (كلاهما اختياري من الإعدادات، والمعلومة دائماً مرئية أيضاً) */
  const HAPTIC = { complete: 15, perfect: [20, 40, 20, 40, 60], levelup: [30, 50, 30, 50, 80], badge: [20, 60, 40], focusStart: 20,
    focusEnd: [120, 80, 120], right: 10, softNo: 30, record: [20, 40, 60] };
  function fx(id, opt) {
    if (window.Sound) Sound.play(id, opt);
    if (window.Haptics && HAPTIC[id]) Haptics.buzz(HAPTIC[id]);
  }
  /* ---------- القراءة بصوت والإملاء الصوتي (speech.js) ---------- */
  const SP = () => window.Speech;
  const wantsRead = () => !!(S.settings && S.settings.readAloud);
  // زر «اسمعني» يظهر فقط إذا وُجد صوت عربي على الجهاز (لا أزرار معطّلة)
  function sayBtn(text) {
    if (!SP() || !SP().canSpeak() || !text) return "";
    return '<button type="button" class="say-btn" data-action="say" data-t="' + esc(text) + '" aria-label="اسمعني" title="اسمعني">🔊</button>';
  }
  function micBtn(id) {
    if (!SP() || !SP().canListen() || !S.settings || S.settings.voiceIn === false) return "";
    return '<button type="button" class="mic-btn" data-action="mic" data-target="' + id + '" aria-label="تحدّث بدل الكتابة" title="تحدّث بدل الكتابة">🎤</button>';
  }
  function sayNow(text) {
    if (!SP()) return false;
    const vol = S.settings.quiet && (new Date().getHours() >= 22 || new Date().getHours() < 7) ? 0.5 : 1;
    SP().setVoice && SP().setVoice(S.settings.voice || "woman");
    return SP().speak(text, { volume: vol });
  }
  // قراءة تلقائية مرة واحدة لكل شاشة، فقط إذا اختار الطالب ذلك والصوت مفعّل
  let lastAuto = "";
  function autoRead(root) {
    if (!wantsRead() || !S.settings.sound || !SP() || !SP().canSpeak()) return;
    const el = (root || app).querySelector("[data-autoread]");
    if (!el) return;
    const txt = el.getAttribute("data-say") || el.textContent;
    const key = view + "|" + txt;
    if (key === lastAuto) return;
    lastAuto = key;
    setTimeout(() => sayNow(txt), 250);
  }
  // الإملاء: زر واحد للبدء والإيقاف، والنص يُكتب في الخانة ويمكن تعديله
  let micTarget = null;
  function startMic(id) {
    const f = document.getElementById(id);
    if (!f || !SP()) return;
    if (SP().isListening()) { SP().stopListening(); return; }
    if (!S.settings.stt) { askMicConsent(id); return; }
    if (S.settings.stt === "local") { toast("الإملاء يحتاج خدمة تحويل الكلام. يمكنك تسجيل صوتك في «تأمّل اليوم» 🎙️، أو تغيير ذلك من الإعدادات"); return; }
    const base = f.value ? f.value.replace(/\s+$/, "") + " " : "";
    const btn = document.querySelector('[data-action="mic"][data-target="' + id + '"]');
    micTarget = id;
    if (btn) { btn.classList.add("listening"); btn.textContent = "أستمع… 👂"; }
    SP().stop();
    SP().listen({
      onText: t => { const ff = document.getElementById(id); if (ff) { ff.value = base + t; ff.dispatchEvent(new Event("input", { bubbles: true })); } },
      onEnd: err => {
        micTarget = null;
        const b = document.querySelector('[data-action="mic"][data-target="' + id + '"]');
        if (b) { b.classList.remove("listening"); b.textContent = "🎤"; }
        if (err && !/no-speech|aborted/.test(String(err.message || err))) toast(/denied|not-allowed/.test(String(err.message || err)) ? "اسمح للتطبيق باستخدام الميكروفون من إعدادات الهاتف" : "لم نستطع سماعك الآن. جرّب مرة أخرى أو اكتب 🙂");
      }
    });
  }
  function askMicConsent(id) {
    const kid = studentClass() <= 6;
    pendingMic = id;
    showModal("🎤", kid ? "رسالة لأحد الوالدين" : "قبل أن تتحدث",
      "عند استخدام 🎤 قد يُرسل صوتك إلى خدمة Google لتحويله إلى كتابة. نحن لا نحفظه ولا نرسله لأحد. أما «التسجيل الصوتي» فيبقى على هذا الجهاز فقط.",
      '<div class="stack"><button class="btn block" data-action="micCloud">موافق</button><button class="btn ghost block" data-action="micLocal">التسجيل على الجهاز فقط</button></div>');
  }
  let pendingMic = null;

  /* الاحتفالات تنتظر دورها حتى لا تتصادم النوافذ (مستوى + وسام + جلسة)، وصوتها يُعزف عند ظهورها */
  const celebrateQ = [];
  function celebrate(emoji, title, body, buttons, snd) {
    if (!$("#modal").classList.contains("hidden")) { celebrateQ.push([emoji, title, body, buttons, snd]); return; }
    showModal(emoji, title, body, buttons, "celebrate");
    if (snd) fx(snd);
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
    setTimeout(() => { f.remove(); pulse(pill); if (window.Sound) Sound.play("coin"); }, 700);
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
  /* تنبيه نهاية الجلسة في تطبيق Android حتى لو كانت الشاشة مطفأة */
  function notifPlugin() { return isNative() && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications; }
  async function scheduleFocusNotif(end) {
    const L = notifPlugin();
    if (!L) return;
    try {
      const p = await L.checkPermissions();
      if (p.display !== "granted") return; // نطلب الإذن فقط من بطاقة التذكير اللطيفة
      await L.schedule({ notifications: [{ id: 7001, title: "رحلة العودة", body: "أحسنت! انتهت جلستك 🌟", schedule: { at: new Date(end), allowWhileIdle: true } }] });
    } catch (e) { /* بدون إشعار */ }
  }
  async function cancelFocusNotif() {
    const L = notifPlugin();
    if (!L) return;
    try { await L.cancel({ notifications: [{ id: 7001 }] }); } catch (e) {}
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
    document.body.classList.toggle("young", !!S.settings.young);
    ensureDaily();
    updateTopbar();
    const navView = view === "games" ? "challenges" : view === "books" ? "cards" : view;
    document.querySelectorAll("#nav button").forEach(b => {
      const on = b.dataset.view === navView;
      b.classList.toggle("active", on);
      if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    $("#nav").style.display = "";
    const views = { home: viewHome, challenges: viewChallenges, focus: viewFocus, games: viewGames, journey: viewJourney, settings: viewSettings, cards: viewCards, books: viewBooks };
    // وضع التركيز الكامل: نخفي كل ما يشتّت أثناء الجلسة
    const running = view === "focus" && !!S.timer && S.timer.end > Date.now();
    document.body.classList.toggle("focus-run", running);
    const key = view + (running ? ":run" : "");
    const sameView = key === lastView, y = window.scrollY;
    let html = (views[view] || viewHome)();
    if ((view === "cards" && !review) || (view === "books" && !openBookId)) html = studyTabs() + html;
    app.innerHTML = html;
    if (view === "focus") tickTimer();
    if (view === "books" && openBookId) { const log = $("#chatLog"); if (log) log.scrollTop = log.scrollHeight; }
    afterRender(sameView, y);
    lastView = key;
    justDone = null;
    autoRead();
    if (view === "home" && !maybeWelcomeBack()) maybeAskFeedback();
  }

  /* ---------- البداية: سؤال واحد في كل شاشة ---------- */
  const GRADES = ["ابتدائي", "إعدادي", "ثانوي", "توجيهي / ثانوية عامة", "جامعة"];
  const GRADE_INFO = {
    "ابتدائي": { label: "ابتدائي <span class=\"muted small\">(الصف 1 – 6)</span>", classes: [1, 2, 3, 4, 5, 6] },
    "إعدادي": { label: "إعدادي <span class=\"muted small\">(الصف 7 – 9)</span>", classes: [7, 8, 9] },
    "ثانوي": { label: "ثانوي <span class=\"muted small\">(الصف 10 – 11)</span>", classes: [10, 11] },
    "توجيهي / ثانوية عامة": { label: "توجيهي <span class=\"muted small\">(الصف 12)</span>", classes: [12] },
    "جامعة": { label: "جامعة", classes: [13] }
  };
  const CLASS_NAMES = ["", "الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن", "التاسع", "العاشر", "الحادي عشر", "الثاني عشر", "جامعة"];
  const gradeOfClass = c => GRADES.find(g => GRADE_INFO[g].classes.includes(c)) || GRADES[2];
  const classLabel = c => c === 13 ? "جامعة" : c ? "الصف " + CLASS_NAMES[c] : "";
  // الصف الحالي (للملفات القديمة: تقدير من المرحلة)
  const studentClass = () => (S.profile && S.profile.cls) || ({ "ابتدائي": 4, "إعدادي": 8, "ثانوي": 10, "توجيهي / ثانوية عامة": 12, "جامعة": 13 })[S.profile && S.profile.grade] || 10;
  const WHENS = ["بعد الفجر", "بعد الإفطار", "بعد العصر", "بعد المغرب", "قبل النوم"];
  const OB0 = () => ({ step: 0, name: "", who: "", read: null, grade: "", cls: 0, minutes: 45, when: "", away: null, levels: {} });
  let ob = OB0();
  const obSteps = () => ["name", "who", "grade"].concat(ob.grade && GRADE_INFO[ob.grade].classes.length > 1 ? ["class"] : [])
    .concat(["read", "subjects", "time", "away"]).concat(onboardSel.map((s, i) => "lvl:" + i));

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
        '<label for="obName">ما اسمك؟</label><input type="text" id="obName" maxlength="30" autocomplete="given-name" placeholder="اكتب اسمك" value="' + esc(ob.name) + '">' +
        '<p class="small muted">👨‍👩‍👧 صغير؟ اطلب من أحد أفراد عائلتك أن يكتب اسمك.</p>';
      nextLabel = "لنبدأ";
    } else if (k === "who") {
      body = '<div class="ob-emoji" aria-hidden="true">🤝</div><h2 data-autoread>من يستخدم التطبيق الآن؟</h2><div class="choices">' +
        choice("who", "me", '<span class="face" aria-hidden="true">🧒</span>أنا', ob.who === "me", true) +
        choice("who", "family", '<span class="face" aria-hidden="true">👨‍👧</span>أنا مع أحد من عائلتي', ob.who === "family", true) + "</div>";
      showNext = !!ob.who;
    } else if (k === "read") {
      body = '<div class="ob-emoji" aria-hidden="true">🔊</div><h2 data-autoread>هل تحب أن نقرأ لك التعليمات بصوت؟</h2>' +
        '<p class="muted">يمكنك تغيير ذلك في أي وقت من الإعدادات.</p><div class="choices">' +
        choice("read", "1", '<span class="face" aria-hidden="true">🔊</span>نعم، اقرأ لي', ob.read === true, true) +
        choice("read", "0", '<span class="face" aria-hidden="true">📖</span>سأقرأ بنفسي', ob.read === false, true) + "</div>" +
        (SP() && !SP().canSpeak() ? '<p class="small muted">لا يوجد صوت عربي على هذا الجهاز الآن. لتفعيله: الإعدادات ← اللغة ← تحويل النص إلى كلام ← نزّل العربية.</p>' : "");
      showNext = ob.read !== null;
    } else if (k === "grade") {
      body = '<div class="ob-emoji" aria-hidden="true">🎓</div><h2>في أي مرحلة دراسية أنت؟</h2><div class="choices">' +
        GRADES.map(g => choice("grade", g, GRADE_INFO[g].label, ob.grade === g, true)).join("") + "</div>";
      showNext = !!ob.grade;
    } else if (k === "class") {
      body = '<div class="ob-emoji" aria-hidden="true">🏫</div><h2>في أي صف أنت؟</h2><p class="muted">لنختار لك أسئلة وتحديات تناسب عمرك.</p><div class="class-grid">' +
        GRADE_INFO[ob.grade].classes.map(c => '<button type="button" class="choice center' + (ob.cls === c ? " sel" : "") + '" data-action="obSet" data-k="cls" data-v="' + c + '" data-auto="1" aria-pressed="' + (ob.cls === c) + '">' + classLabel(c) + "</button>").join("") + "</div>";
      showNext = !!ob.cls;
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
      body = '<p class="muted small center">مادة ' + (i + 1) + " من " + onboardSel.length + '</p><h2 class="center">كيف تشعر بمستواك في <br><span class="hl">' + esc(sb) + "</span>؟</h2>" +
        '<div class="choices faces">' + LEVELS.map((l, j) => choice("lvl", j + 1, '<span class="face" aria-hidden="true">' + l.e + "</span>" + l.t, ob.levels[sb] === j + 1, true)).join("") + "</div>";
      showNext = !!ob.levels[sb];
      if (i === onboardSel.length - 1) {
        nextLabel = "ابدأ الرحلة ✨";
        body += '<button type="button" class="snd-note" data-action="obSound" role="switch" aria-checked="' + S.settings.sound + '">' +
          (S.settings.sound ? "🔊 أصوات تشجيع خفيفة: مفعّلة" : "🔕 الأصوات: متوقفة") + ' <span class="muted">— يمكنك تغييرها من الإعدادات</span></button>';
      }
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
    const h = app.querySelector(".ob-body h2");
    if (h && !h.hasAttribute("data-autoread")) h.setAttribute("data-autoread", "");
    if (h && (ob.read === true || (ob.cls && ob.cls <= 3)) && S.settings.sound && SP() && SP().canSpeak() && lastAuto !== "ob|" + h.textContent) {
      lastAuto = "ob|" + h.textContent; setTimeout(() => sayNow(h.textContent), 250);
    }
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
    S.profile = { name: ob.name, grade: ob.grade || GRADES[2], cls: ob.cls || undefined, subjects: onboardSel.slice(), minutes: ob.minutes, goal: "", when: ob.when, lastLesson: {} };
    S.assess.push({ date: today(), away: ob.away == null ? 0 : ob.away, levels });
    // واجهة مبسطة تلقائياً للصفوف 1–3 (يمكن إيقافها)، والقراءة بصوت حسب اختيار الطالب
    S.settings.young = !!(ob.cls && ob.cls <= 3);
    S.settings.readAloud = ob.read === true || S.settings.young;
    S.settings.together = ob.who === "family";
    S.daily = null;
    const away = ob.away;
    ob = OB0();
    save();
    view = "home";
    render();
    addXP(20);
    fx("focusStart");
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
    if (next && S.settings.young) {
      nextCard = '<section class="card next-step young-card' + (justDone ? " enter" : "") + '"><div class="row"><span class="grow"></span>' + dotsHTML(list) + "</div>" +
        '<div class="young-emoji" aria-hidden="true">' + (next.e || "⭐") + "</div>" +
        '<p class="next-text center" data-autoread data-say="' + esc(next.say || next.text) + '">' + esc(next.text) + "</p>" +
        '<div class="center">' + sayBtn(next.say || next.text) + "</div>" +
        (S.settings.together && HELPER_TIPS[next.cat] ? '<p class="helper-note">👨‍👧 للمرافق: ' + esc(HELPER_TIPS[next.cat]) + "</p>" : "") +
        '<button class="btn big good block" data-action="toggle" data-id="' + esc(next.id) + '">✔ فعلتها!</button></section>';
    } else if (next) {
      const study = next.type === "study" || next.type === "bonus";
      nextCard = '<section class="card next-step' + (justDone ? " enter" : "") + '" aria-labelledby="nextH"><div class="row"><h3 class="grow" id="nextH">👉 خطوتك التالية</h3>' + dotsHTML(list) + "</div>" +
        '<p class="next-text" data-autoread>' + esc(next.text) + "</p>" + (wantsRead() ? sayBtn(next.text) : "") + metaHTML(next) +
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
      (low && S.reminders.on && !(S.reminders.pausedUntil >= today()) ? '<button class="linkbtn" data-action="remPause">⏸️ أوقف التذكيرات أسبوعاً</button>' : "") +
      (lowStreak() >= 3 ? '<p class="mood-msg care">💜 لاحظنا أن الأيام الأخيرة صعبة عليك. تحدّث مع شخص تثق به — أحد أفراد أسرتك أو معلم أو مرشد المدرسة. لست وحدك.</p>' : "") +
      "</section>" +

      nextCard +
      (bigLost ? '<button class="btn accent big block" data-action="lost">🧭 تايه؟ من وين أبدأ</button>' : "") +
      reminderAskCard(st) + reminderHelpfulCard() +

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
    fx("welcome");
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
  const TYPE_LABEL = { warmup: "إحماء", wellbeing: "عناية بنفسك", study: "دراسة", recall: "استرجاع", creative: "إبداع", bonus: "إضافي", young: "نشاط" };
  let reflectOpen = false;
  let yRef = { face: "", did: [] };
  // تأمّل الصغار: وجه + ماذا فعلت، أو تسجيل صوتي — أي واحد يكفي
  function youngReflect() {
    const faces = [["😄", "رائع"], ["🙂", "جيد"], ["😐", "عادي"], ["😴", "متعب"]];
    const did = [["🖍️", "رسمتُ"], ["📖", "قرأتُ"], ["🔢", "عددتُ"], ["🎮", "لعبتُ"]];
    return '<p class="small" data-autoread>كيف كان يومك؟ ' + sayBtn("كيف كان يومك؟") + "</p>" +
      '<div class="mood-row">' + faces.map(f => '<button data-action="yFace" data-v="' + f[0] + '" class="' + (yRef.face === f[0] ? "sel" : "") + '" aria-label="' + f[1] + '" aria-pressed="' + (yRef.face === f[0]) + '">' + f[0] + "</button>").join("") + "</div>" +
      '<p class="small" style="margin-top:12px">ماذا فعلت؟</p><div class="chips">' +
      did.map(x => '<button class="chip' + (yRef.did.includes(x[1]) ? " sel" : "") + '" data-action="yDid" data-v="' + x[1] + '" aria-pressed="' + yRef.did.includes(x[1]) + '">' + x[0] + " " + x[1] + "</button>").join("") + "</div>" +
      '<div class="stack"><button class="btn block" data-action="yReflect"' + (yRef.face || yRef.did.length ? "" : " disabled") + ">احفظ ⭐</button></div>" + voiceNoteBtn();
  }
  function voiceNoteBtn() {
    if (!SP() || !SP().canRecord()) return "";
    const rec = SP().isRecording();
    return '<button class="btn ' + (rec ? "accent" : "ghost") + ' block vn-btn" data-action="voiceNote">' + (rec ? "⏹️ أوقف التسجيل" : "🎙️ سجّل تأمّلك بصوتك") + "</button>" +
      '<p class="small muted center" style="margin:4px 0 0">يبقى التسجيل على جهازك فقط.</p>';
  }
  function saveReflection(text, vn) {
    const j = { date: today(), text };
    if (vn) j.vn = vn;
    S.journal.push(j);
    reflectOpen = false; yRef = { face: "", did: [] };
    dayRec().reflected = true;
    save();
    addXP(15, "تأمّل رائع");
    render();
  }
  function viewChallenges() {
    const rec = dayRec();
    const list = S.daily.list;
    const item = c => '<div class="challenge' + (c.done ? " done" : "") + '">' +
      '<button class="check' + (c.id === justDone ? " pop" : "") + '" data-action="toggle" data-id="' + esc(c.id) + '" aria-pressed="' + c.done + '" aria-label="' + (c.done ? "إلغاء الإنجاز: " : "إنجاز: ") + esc(c.text) + '">' + (c.done ? "✔" : "") + "</button>" +
      '<div class="grow"><div class="ch-text">' + (c.e ? '<span class="ch-emoji" aria-hidden="true">' + c.e + "</span> " : "") + esc(c.text) + (wantsRead() ? " " + sayBtn(c.say || c.text) : "") + "</div>" + (S.settings.young ? "" : metaHTML(c)) +
      (!c.done && c.type === "recall" ? '<button class="btn ghost sm" data-action="go" data-v="cards">🗂️ افتح البطاقات</button>' : "") +
      (!c.done && (c.type === "study" || c.type === "recall") && S.books.some(b => b.subject === c.subject) ? '<button class="btn ghost sm" data-action="tutorFor" data-s="' + esc(c.subject) + '">🤖 اسأل المعلم</button>' : "") +
      (!c.done && (c.type === "study" || c.type === "bonus") ? '<button class="btn ghost sm" data-action="focusFor" data-id="' + esc(c.id) + '" data-m="' + c.minutes + '" data-s="' + esc(c.subject) + '">▶ ابدأ بمؤقت</button>' : "") +
      "</div></div>";
    const todo = list.filter(c => !c.done), done = list.filter(c => c.done);
    const prompt = REFLECT_PROMPTS[dayNumber(today()) % REFLECT_PROMPTS.length];
    return '<section class="card"><div class="row"><h2 class="grow">🎯 تحديات اليوم</h2>' + dotsHTML(list) + "</div>" +
      (todo.length ? todo.map(item).join("") : '<p class="center muted">🎉 أنجزت كل تحديات اليوم!</p>') +
      (done.length ? '<div class="done-group">' + done.map(item).join("") + "</div>" : "") +
      (S.daily.rerolls < 1 && !done.length ? '<button class="linkbtn" data-action="reroll">🎲 لا تناسبني؟ غيّرها (مرة يومياً)</button>' : "") +
      "</section>" +
      '<section class="card"><h3>🧠 ' + (S.settings.young ? "ألعاب" : "استراحة ذهنية") + '</h3><p class="small muted">لعبة قصيرة بين جلسات الدراسة (حتى ' + GAME_XP_CAP + ' ⭐ يومياً).</p>' +
      (S.settings.young || studentClass() <= 3 ? '<div class="grid-2 young-games"><button class="btn ghost big" data-action="startCount">🔢 كم عددها؟</button>' +
        (SP() && SP().canSpeak() ? '<button class="btn ghost big" data-action="startLetters">🔤 اسمعْ واخترْ</button>' : '<button class="btn ghost big" data-action="startLetters">🔤 حروف وصور</button>') + "</div><br>" : "") +
      '<div class="grid-3"><button class="btn ghost" data-action="startMath">⚡ أرقام</button>' +
      '<button class="btn ghost" data-action="startQuiz">❓ معلومات</button>' +
      '<button class="btn ghost" data-action="startMemory">🃏 ذاكرة</button></div></section>' +
      '<section class="card" id="reflectCard"><h3>📓 تأمّل اليوم</h3>' +
      (rec.reflected ? '<p class="muted">كتبت تأمّل اليوم ✔ — الكتابة تثبّت ما تعلمته.</p>' :
        '<p class="small muted">' + prompt + "</p>" +
        (S.settings.young ? youngReflect() :
        (reflectOpen ? '<div class="field-mic"><textarea id="reflectText" maxlength="600" placeholder="اكتب أو تحدّث بحرية…" aria-label="' + prompt + '"></textarea>' + micBtn("reflectText") + '</div><div class="stack"><button class="btn block" data-action="reflect">احفظ (+15 ⭐)</button></div>' :
          '<button class="btn ghost block" data-action="openReflect">✍️ اكتب تأمّلك (+15 ⭐)</button>') + voiceNoteBtn())) + "</section>";
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
        '<div class="row" style="justify-content:center;gap:12px"><button class="icon-btn session-mute" data-action="sessionMute" aria-pressed="' + !!t.muted + '" aria-label="صوت الجلسة" title="صوت الجلسة">' + (t.muted ? "🔕" : "🔔") + "</button>" +
        '<button class="linkbtn" style="margin:0" data-action="stopTimer">إنهاء مبكر</button></div></section>';
    }
    return '<section class="card center"><h2>⏱️ جلسة تركيز</h2>' +
      '<p class="muted small">اختر المادة والمدة. كل دقيقة = 2 ⭐</p>' +
      ringHTML(fmt(focusChoice.minutes * 60)) +
      '<div class="stack"><div class="field-label">المدة</div><div class="chips">' + [5, 10, 15, 25, 40].map(m => '<button class="chip' + (m === focusChoice.minutes ? " sel" : "") + '" data-action="setMin" data-m="' + m + '" aria-pressed="' + (m === focusChoice.minutes) + '">' + m + " د</button>").join("") + "</div>" +
      '<div class="field-label">المادة</div><div class="chips">' + subs.map(x => '<button class="chip' + (x === focusChoice.subject ? " sel" : "") + '" data-action="setSub" data-s="' + esc(x) + '" aria-pressed="' + (x === focusChoice.subject) + '">' + esc(x) + "</button>").join("") + "</div>" +
      (S.settings.sound ? '<button class="chip" data-action="toggleAmbient" role="switch" aria-checked="' + S.settings.ambient + '">' + (S.settings.ambient ? "🌧️ خلفية هادئة: تعمل" : "🌧️ خلفية هادئة") + "</button>" : "") +
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
    S.timer = { end: Date.now() + minutes * 60000, minutes, subject, chId: chId || null, muted: false };
    save();
    fx("focusStart");
    if (window.Sound) Sound.startAmbient();
    scheduleFocusNotif(S.timer.end);
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
    if (window.Sound) Sound.stopAmbient();
    // نعزف نغمة النهاية فقط إذا انتهت الجلسة للتو (لا بعد ساعات)، وما لم يكتمها الطالب
    if (!t.muted && Date.now() - t.end < 600000) fx("focusEnd");
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
    if (game && game.type === "count") return viewCount();
    if (game && game.type === "letters") return viewLetters();
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
    let max = 10 + L * 5;
    let ops = L < 3 ? ["+", "-"] : L < 5 ? ["+", "-", "×"] : ["+", "-", "×", "÷"];
    // الصفوف الصغيرة: أرقام وعمليات تناسب العمر
    const cls = studentClass();
    if (cls <= 2) { ops = ["+", "-"]; max = Math.min(max, 20); }
    else if (cls <= 4) { ops = ops.filter(o => o !== "÷"); max = Math.min(max, 50); }
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
        if (game.score > (S.best.math || 0)) { S.best.math = game.score; toast("رقم قياسي جديد! 🏆"); fx("record"); } else fx("gameEnd");
        save();
        gameXP(game.score * 2);
        if (view === "games") render();
      }
    }, 250);
    render();
  }

  /* «كم عددها؟»: عدّ الصور واختر الرقم (بلا مؤقت، بلا ✖ أحمر) */
  const COUNT_EMOJI = ["🍎", "⭐", "🐟", "🌸", "🎈", "🐥", "🍋", "🚗", "⚽", "🦋"];
  function countRound() {
    const n = 1 + Math.floor(Math.random() * 10), e = COUNT_EMOJI[Math.floor(Math.random() * COUNT_EMOJI.length)];
    const opts = new Set([n]);
    while (opts.size < 3) { const d = Math.max(1, Math.min(10, n + Math.floor(Math.random() * 5) - 2)); opts.add(d); }
    return { n, e, opts: shuffle([...opts]) };
  }
  function startCount() { game = { type: "count", i: 0, score: 0, q: countRound(), tries: 0, over: false }; render(); }
  function viewCount() {
    const g = game;
    if (g.over) return '<div class="card center"><div class="empty-emoji">🌟</div><h2 data-autoread>أحسنت! عددت ' + g.score + " مرات صحيحة</h2>" +
      '<button class="btn" data-action="startCount">مرة أخرى</button> <button class="btn ghost" data-action="exitGame">رجوع</button></div>';
    const ar = ["", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩", "١٠"];
    return '<div class="card center">' + gameHead("🔢 كم عددها؟", '<span class="muted small">' + (g.i + 1) + " / 10</span>") +
      '<p data-autoread data-say="كَمْ عَدَدُهَا؟">كم عددها؟ ' + sayBtn("كَمْ عَدَدُهَا؟") + "</p>" +
      '<div class="count-pics" aria-label="' + g.q.n + ' صور">' + Array.from({ length: g.q.n }, () => '<span aria-hidden="true">' + g.q.e + "</span>").join("") + "</div>" +
      '<div class="grid-3 big-tiles">' + g.q.opts.map(o => '<button class="btn ghost" data-action="countAns" data-v="' + o + '" aria-label="' + o + '">' + ar[o] + "<small>" + o + "</small></button>").join("") + "</div>" +
      (g.tries ? '<p class="small muted">حاول مرة أخرى، عُدّ ببطء 👆</p>' : "") + "</div>";
  }
  /* «اسمعْ واخترْ»: يُنطق الحرف وكلمته، والطفل يختار من 3 بطاقات كبيرة */
  function lettersRound() {
    const pickL = shuffle(LETTERS).slice(0, 3);
    return { target: pickL[0], opts: shuffle(pickL) };
  }
  function startLetters() { game = { type: "letters", i: 0, score: 0, q: lettersRound(), tries: 0, over: false }; render(); setTimeout(() => sayLetter(), 300); }
  function sayLetter() { if (game && game.type === "letters" && !game.over) sayNow("أين حرف " + game.q.target[0] + "؟ " + game.q.target[0] + "، مثل " + game.q.target[1]); }
  function viewLetters() {
    const g = game;
    if (g.over) return '<div class="card center"><div class="empty-emoji">🌟</div><h2 data-autoread>أحسنت! عرفت ' + g.score + " حروف</h2>" +
      '<button class="btn" data-action="startLetters">مرة أخرى</button> <button class="btn ghost" data-action="exitGame">رجوع</button></div>';
    const canSay = SP() && SP().canSpeak();
    return '<div class="card center">' + gameHead("🔤 " + (canSay ? "اسمعْ واخترْ" : "حروف وصور"), '<span class="muted small">' + (g.i + 1) + " / 10</span>") +
      (canSay ? '<button class="btn big block" data-action="sayLetter">🔊 اسمعْ الحرف</button>' :
        '<p class="letter-prompt">أين حرف <b>' + esc(g.q.target[0]) + "</b>؟</p>") +
      '<div class="grid-3 big-tiles">' + g.q.opts.map(o => '<button class="btn ghost" data-action="letterAns" data-v="' + esc(o[0]) + '" aria-label="' + esc(o[0] + " " + o[1]) + '">' + esc(o[0]) + "<small>" + o[2] + " " + esc(o[1]) + "</small></button>").join("") + "</div>" +
      (g.tries ? '<p class="small muted">قريب! اسمع مرة أخرى 👂</p>' : "") + "</div>";
  }
  function youngAnswer(ok, nextRound) {
    const g = game;
    if (ok) {
      if (!g.tries) g.score++;
      fx("right");
      g.i++; g.tries = 0;
      if (g.i >= 10) { g.over = true; gameXP(g.score * 2); fx(g.score >= 8 ? "record" : "gameEnd"); }
      else g.q = nextRound();
    } else { g.tries++; Haptics.buzz(20); }
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
      if (!g.cards.every(x => x.matched)) fx("right");
      if (g.cards.every(x => x.matched)) {
        g.over = true;
        if (!S.best.memory || g.tries < S.best.memory) { S.best.memory = g.tries; toast("رقم قياسي جديد! 🏆"); fx("record"); } else fx("gameEnd");
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
      '<li><span class="small muted">' + esc(j.date) + "</span><br>" + esc(j.text) +
      (j.vn ? ' <button class="chip small" data-action="playVn" data-id="' + esc(j.vn) + '">▶️ استمع</button>' : "") + "</li>").join("");

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
      '<label for="obClass">الصف</label><select id="obClass">' + (p.cls ? "" : '<option value="">— اختر صفّك —</option>') +
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(c => '<option value="' + c + '"' + (p.cls === c ? " selected" : "") + ">" + classLabel(c) + (c <= 12 ? " (" + gradeOfClass(c).split(" /")[0] + ")" : "") + "</option>").join("") + "</select>" +
      "<label>المواد</label><div class=\"chips\">" +
      SUBJECTS.map(s => '<button type="button" class="chip' + (onboardSel.includes(s) ? " sel" : "") + '" data-action="obSubject" data-s="' + esc(s) + '">' + esc(s) + "</button>").join("") + "</div>" +
      '<label for="obMinutes">الوقت اليومي (دقيقة)</label><select id="obMinutes">' +
      [20, 30, 45, 60, 90, 120].map(m => '<option value="' + m + '"' + (m === p.minutes ? " selected" : "") + ">" + m + "</option>").join("") + "</select>" +
      "<label>أخاطبك بصيغة</label><div class=\"chips\" style=\"justify-content:flex-start\">" +
      [["m", "المذكّر (صديقي)"], ["f", "المؤنث (صديقتي)"]].map(g => '<button type="button" class="chip' + (p.g === g[0] ? " sel" : "") + '" data-action="setG" data-g="' + g[0] + '" aria-pressed="' + (p.g === g[0]) + '">' + g[1] + "</button>").join("") + "</div>" +
      '<label for="obGoal">هدفي</label><input type="text" id="obGoal" maxlength="80" value="' + esc(p.goal) + '">' +
      "<label>موعد دراستي</label><div class=\"chips\">" +
      ["بعد الفجر", "بعد الإفطار", "بعد العصر", "بعد المغرب", "قبل النوم"].map(w => '<button type="button" class="chip' + (p.when === w ? " sel" : "") + '" data-action="obWhen" data-w="' + w + '">' + w + "</button>").join("") + "</div>" +
      '<div class="stack"><button class="btn block" data-action="saveSettings">حفظ</button></div></div>' +
      '<div class="card"><h3>🎨 المظهر</h3><p class="small muted">«تلقائي» يتبع إعدادات جهازك. الوضع الداكن مريح للعين ليلاً ويوفّر البطارية.</p>' +
      '<div class="seg" role="radiogroup" aria-label="المظهر">' +
      [["auto", "🌓 تلقائي"], ["light", "☀️ فاتح"], ["dark", "🌙 داكن"]].map(t =>
        '<button role="radio" aria-checked="' + (Theme.get() === t[0]) + '" class="' + (Theme.get() === t[0] ? "sel" : "") + '" data-action="setTheme" data-t="' + t[0] + '">' + t[1] + "</button>").join("") +
      "</div></div>" +
      speechCard() +
      remindersCard() +
      soundCard() +
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

  /* ---------- القراءة والكلام وسهولة الاستخدام ---------- */
  function speechCard() {
    const st = S.settings;
    const sw = (k, label, hint) => '<button type="button" class="switch-row" data-action="spPref" data-k="' + k + '" role="switch" aria-checked="' + !!st[k] + '">' +
      '<span class="grow"><b>' + label + "</b>" + (hint ? '<span class="small muted">' + hint + "</span>" : "") + '</span><span class="switch" aria-hidden="true"></span></button>';
    const noVoice = SP() && !SP().canSpeak();
    return '<div class="card"><h3>🗣️ القراءة والكلام</h3>' +
      sw("readAloud", "🔊 اقرأ لي بصوت", st.readAloud ? "يقرأ التعليمات تلقائياً — اضغط هنا لإيقافه" : "مطفأ: يقرأ فقط عندما تضغط 🔊") +
      (!noVoice ? '<p class="small muted" style="margin:10px 0 6px">صوت القارئ</p><div class="voice-pick" role="radiogroup" aria-label="صوت القارئ">' +
        [["woman", "👩", "امرأة"], ["man", "👨", "رجل"], ["girl", "👧", "طفلة"], ["boy", "👦", "طفل"]].map(v =>
          '<button type="button" role="radio" aria-checked="' + ((st.voice || "woman") === v[0]) + '" class="' + ((st.voice || "woman") === v[0] ? "sel" : "") + '" data-action="setVoice" data-v="' + v[0] + '"><span aria-hidden="true">' + v[1] + "</span>" + v[2] + "</button>").join("") +
        '</div><p class="small muted">💡 لصوت أكثر طبيعية على Android: الإعدادات ← تحويل النص إلى كلام ← محرّك Google ← نزّل «العربية» بجودة عالية.</p>' : "") +
      (noVoice ? '<p class="small care-note">لا يوجد صوت عربي على هذا الجهاز. لتفعيله: الإعدادات ← اللغة ← تحويل النص إلى كلام ← نزّل العربية.</p>' : "") +
      sw("voiceIn", "🎤 تحدّث بدل الكتابة", st.stt === "local" ? "مضبوط على: التسجيل على الجهاز فقط" : "زر ميكروفون بجانب خانات الكتابة") +
      (st.stt ? '<button class="linkbtn" style="margin:0 0 8px" data-action="sttReset">تغيير موافقة الميكروفون</button>' : "") +
      sw("young", "🧒 واجهة مبسّطة", "صور أكبر، كلمات أقل، أنشطة قصيرة") +
      sw("together", "👨‍👧 أستخدم التطبيق مع أحد من عائلتي", "نصائح صغيرة للمرافق في كل نشاط") +
      sw("simple", "🪶 بسّط كلام المعلم الذكي", "جمل قصيرة وكلمات سهلة") +
      "</div>" +
      (st.together || st.young ? '<div class="card"><h3>👨‍👩‍👧 نصائح للمرافق (دقيقة واحدة)</h3><ul class="list-plain small">' +
        "<li>💜 امدحْ المحاولة، لا النتيجة.</li><li>🤲 صحّحْ بلطف، ودون استعجال.</li><li>⏱️ توقّفوا بعد 10 دقائق.</li><li>😴 إذا تعب الطفل، توقّفوا فوراً — غداً يوم جديد.</li></ul></div>" : "");
  }

  /* ---------- الصوت والاهتزاز ---------- */
  function soundCard() {
    const st = S.settings;
    const sw = (k, label, hint) => '<button type="button" class="switch-row" data-action="setPref" data-k="' + k + '" role="switch" aria-checked="' + !!st[k] + '">' +
      '<span class="grow"><b>' + label + "</b>" + (hint ? '<span class="small muted">' + hint + "</span>" : "") + '</span><span class="switch" aria-hidden="true"></span></button>';
    return '<div class="card"><h3>🔊 الصوت والاهتزاز</h3>' +
      sw("sound", "أصوات التشجيع", "نغمات قصيرة وهادئة عند الإنجاز") +
      (st.sound ? '<label for="volRange" class="vol-label">مستوى الصوت <span class="muted" id="volVal">' + Math.round(st.volume * 100) + "٪</span></label>" +
        '<input type="range" id="volRange" min="0" max="100" step="10" value="' + Math.round(st.volume * 100) + '">' : "") +
      sw("haptics", "الاهتزاز", "لمسات خفيفة مع الإنجاز") +
      sw("quiet", "الساعات الهادئة", "من 10 مساءً حتى 7 صباحاً: صوت أخفض واهتزاز أقصر") +
      "</div>";
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
      '<label for="fbText">رسالتك</label><div class="field-mic"><textarea id="fbText" maxlength="1000" placeholder="ما الذي أعجبك؟ ما الذي تتمنى أن نضيفه أو نغيّره؟"></textarea>' + micBtn("fbText") + '</div><br><br>' +
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
      "التذكيرات: " + (S.reminders.on ? "مفعّلة" : "مطفأة") + " · فُتحت من إشعار: " + S.notif.tapped + " · إيقاف مؤقت: " + S.notif.pauses + (S.notif.helpful === null ? "" : " · مفيدة: " + (S.notif.helpful ? "نعم" : "لا")) + "\n" +
      "المرحلة الدراسية: " + S.profile.grade + (S.profile.cls ? " — " + classLabel(S.profile.cls) : "") + "\nالمستوى في التطبيق: " + lv.level + "\nأيام الاستخدام: " + st.activeDays + "\nالمرحلة: " + st.stageObj.name;
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
      '<label for="cardQ">السؤال</label><div class="field-mic"><textarea id="cardQ" dir="auto" maxlength="300" style="min-height:64px" placeholder="مثلاً: ما قانون نيوتن الثاني؟"></textarea>' + micBtn("cardQ") + "</div>" +
      '<label for="cardA">الجواب</label><div class="field-mic"><textarea id="cardA" dir="auto" maxlength="500" style="min-height:64px" placeholder="القوة = الكتلة × التسارع"></textarea>' + micBtn("cardA") + "</div>" +
      '<div class="stack"><button class="btn block" data-action="addCard">أضف البطاقة (+5 ⭐)</button>' +
      (S.cards.length ? '<button class="linkbtn" data-action="closeCardForm">إغلاق</button>' : "") + "</div></section>";
    if (!S.cards.length) {
      return '<section class="card center"><div class="empty-emoji" aria-hidden="true">🗂️</div><h2>بطاقاتي</h2>' +
        '<p class="muted">اكتب سؤالاً من درسك وجوابه، والتطبيق يذكّرك بمراجعته في الوقت المناسب حتى يثبت في ذاكرتك.</p>' +
        (cardFormOpen ? "" : '<button class="btn big block" data-action="openCardForm">➕ اصنع أول بطاقة</button>') +
        (studentClass() <= 3 || S.settings.young ? '<div class="stack"><button class="btn ghost big block" data-action="addLetters">🔤 أضف بطاقات الحروف (28)</button></div>' : "") + HOW_CARDS + "</section>" +
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
      '<div class="flash" dir="auto" data-autoread>' + esc(c.q) + "</div>" + (wantsRead() ? sayBtn(c.q) : "") +
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

  /* ---------- التذكيرات ورسائل «اشتقنا لك» ---------- */
  const WHEN_TIME = { "بعد الفجر": "07:00", "بعد الإفطار": "09:00", "بعد العصر": "16:00", "بعد المغرب": "18:30", "قبل النوم": "20:30" };
  const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const MISS_OFFSETS = [2, 4, 7, 14, 30], MISS_REDUCED = [2, 7, 30];
  const remindTime = () => S.reminders.time || WHEN_TIME[S.profile && S.profile.when] || "17:00";
  const whenLabel = () => (S.profile && S.profile.when) || remindTime();
  // لا إشعارات بين 21:30 و07:00
  function clampQuiet(d) {
    const m = d.getHours() * 60 + d.getMinutes();
    if (m > 21 * 60 + 30) d.setHours(21, 30, 0, 0);
    if (m < 7 * 60) d.setHours(7, 0, 0, 0);
    return d;
  }
  function slotOn(dayOffset, lead) {
    const [h, mi] = remindTime().split(":").map(Number);
    const d = addDays(new Date(), dayOffset);
    d.setHours(h, mi, 0, 0);
    d.setMinutes(d.getMinutes() - (lead || 0));
    return clampQuiet(d);
  }
  // الأنثى/الذكر: صيغة المخاطبة
  function gtext(t) {
    if (!S.profile || S.profile.g !== "f") return t;
    return t.replace(/يا صديقي/g, "يا صديقتي").replace(/مستعداً/g, "مستعدة").replace(/عُد متى/g, "عودي متى")
      .replace(/ابدأ /g, "ابدئي ").replace(/تظن/g, "تظنين").replace(/أنت على/g, "أنتِ على")
      .replace(/حين تجد /g, "حين تجدين ").replace(/متى عدت/g, "متى عدتِ").replace(/حين تريد/g, "حين تريدين").replace(/سمح وقتك/g, "سمح وقتكِ");
  }
  function reminderCopy(dayOffset) {
    const st = stats(), cls = studentClass(), due = dueCards().length;
    const next = STAGES[st.stage];
    const toStage = next ? next.minDays - st.activeDays : 99;
    const rec = dayRec();
    const lowToday = rec.rest || LOW_MOODS.includes(rec.mood) || lowStreak() >= 3;
    if (lowToday && dayOffset >= 1) return ["💜 يوم جديد", "كيف حالك اليوم؟ ابدأ بما تستطيع، ولو بنَفَس عميق وصفحة واحدة."];
    if (cls <= 4) return ["🐣 وقت المرح", "لعبة أرقام صغيرة ثم صفحة واحدة… خمس دقائق ممتعة!"];
    if (due >= 3) return ["🗂️ بطاقاتك جاهزة", arCount2(due, "بطاقات", "بطاقة") + " تنتظر المراجعة، دقيقتان فقط لتثبيتها."];
    if (Object.values(S.bookChats || {}).some(c => c.length) && dayNumber(today()) % 3 === 0) return ["📖 نكمل القراءة؟", "الكتاب الذي بدأته ينتظرك عند آخر صفحة وصلت إليها."];
    if (next && toStage > 0 && toStage <= 3) return ["🌟 اقتربت من «" + next.name + "»", "باقي " + arDays(toStage) + " دراسة فقط. جلسة قصيرة اليوم تقرّبك أكثر."];
    if (st.freezes > 0 && dayOffset >= 1) return ["🧊 يوم السماح معك", "سلسلتك محفوظة. وإن سمح وقتك، خطوة صغيرة اليوم تكفي."];
    return (dayNumber(today()) + dayOffset) % 2 ? ["⏰ قرب موعدك", "بعد قليل وقت دراستك " + whenLabel() + ". خمس دقائق تكفي للبداية 🌱"]
      : ["رحلة العودة", "تحدّي اليوم صغير وجاهز، والبداية أسهل مما تظن ✨"];
  }
  const arCount2 = (n, few, many) => n + " " + (n >= 3 && n <= 10 ? few : many);
  function missCopy(off) {
    const st = stats(), next = STAGES[st.stage], toStage = next ? next.minDays - st.activeDays : 99;
    if (off === 2) {
      if (st.freezes > 0) return ["🧊 يوم سماح لك", "سلسلتك محفوظة بيوم سماح. عُد متى استطعت، نحن بانتظارك."];
      if (next && toStage <= 3) return ["باقي القليل 🌟", "أنت على بُعد " + arDays(toStage) + " من «" + next.name + "». نكمل بخطوة صغيرة؟"];
      return ["وينك يا صديقي؟ 🌿", "مكانك محفوظ وتقدّمك كله باقٍ. خمس دقائق تكفي لنكمل معاً."];
    }
    if (off === 4) return ["نفكّر فيك 💜", "نعرف أن بعض الأيام ثقيلة. حين تجد لحظة هدوء، نحن هنا."];
    if (off === 7) return ["خطوة واحدة فقط", "لا حاجة لتعويض ما فات. نبدأ من جديد بخطوة صغيرة، كأول يوم ✨"];
    if (off === 14) return ["رحلتك بانتظارك", "كل تقدّمك محفوظ، وسنبدأ معك بهدوء متى عدت 🌱"];
    return ["سنبقى هنا 💜", "لن نُكثر عليك التذكير. حين تريد العودة، افتح التطبيق وستجدنا."];
  }
  // خطة الإشعارات القادمة (تُعاد في كل فتح للتطبيق، فأي فتح يصفّر سلسلة «اشتقنا لك»)
  function planNotifications() {
    const R = S.reminders;
    if (!R.on || !S.profile) return [];
    const now = Date.now(), plan = [];
    const paused = d => R.pausedUntil && dateKey(d) <= R.pausedUntil;
    const allowed = d => R.days.includes(d.getDay()) && !paused(d);
    const named = t => R.showName && !R.shared ? S.profile.name + "، " + t : t;
    const push = (id, at, copy, kind) => { if (at.getTime() > now + 60000) plan.push({ id, at: at.getTime(), title: named(gtext(copy[0])), body: gtext(copy[1]), kind }); };
    const t0 = slotOn(0, R.lead);
    if (!isActive(today()) && allowed(t0)) push(7100, t0, reminderCopy(0), "remind");
    const t1 = slotOn(1, R.lead);
    if (allowed(t1)) push(7101, t1, isActive(today()) ? reminderCopy(1) : ["رحلة العودة", "اشتقنا لك! تحدّي اليوم صغير وجاهز متى كنت مستعداً 🌱"], "remind");
    if (R.miss) {
      const safety = lowStreak() >= 3; // أيام صعبة: لا رسائل اشتياق لأسبوع
      const offs = (R.reduced || S.notif.pauses >= 2 || S.notif.ignored >= 3) ? MISS_REDUCED : MISS_OFFSETS;
      offs.forEach(off => {
        if (safety && off <= 7) return;
        let d = slotOn(off, 0), k = 0;
        while (!allowed(d) && k++ < 7) d = slotOn(off + k, 0);
        if (allowed(d)) push(7100 + off, d, missCopy(off), "miss");
      });
    }
    return plan;
  }

  function notifPluginRaw() { return isNative() && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications; }
  let nativeNotifReady = false;
  async function nativeNotifSetup(L) {
    if (nativeNotifReady) return;
    nativeNotifReady = true;
    // قناة خاصة: شاشة القفل تُظهر «رحلة العودة» فقط
    try { await L.createChannel({ id: "reminders", name: "تذكيرات الدراسة", importance: 3, visibility: 0, vibration: true }); } catch (e) {}
    try { await L.registerActionTypes({ types: [{ id: "REMIND", actions: [{ id: "start5", title: "ابدأ 5 دقائق", foreground: true }, { id: "later", title: "ذكّرني بعد ساعة" }] }] }); } catch (e) {}
    try { L.addListener("localNotificationActionPerformed", a => onNotifAction(a && a.actionId)); } catch (e) {}
  }
  function onNotifAction(actionId) {
    S.notif.tapped++;
    S.notif.ignored = 0;
    S.notif.lastTap = Date.now();
    save();
    if (actionId === "start5") { closeModal(); startTimer(5, (S.profile && S.profile.subjects[0]) || "عام"); }
    else if (actionId === "later") {
      const at = new Date(Date.now() + 3600000);
      if (at.getHours() * 60 + at.getMinutes() <= 21 * 60 + 30) {
        const L = notifPluginRaw();
        if (L) L.schedule({ notifications: [{ id: 7299, title: "⏰ قرب موعدك", body: gtext("خمس دقائق تكفي للبداية 🌱"), schedule: { at, allowWhileIdle: true }, channelId: "reminders", actionTypeId: "REMIND" }] }).catch(() => {});
      }
    }
  }
  // يُستدعى عند كل فتح/عودة للتطبيق وبعد أي تغيير في الإعدادات
  async function syncReminders() {
    if (!S.profile) return;
    const R = S.reminders, now = Date.now();
    // قياس محلي بدون تتبّع: كم إشعاراً مرّ دون أن يُفتح التطبيق منه
    const fired = R.lastPlan.filter(p => p.at < now).length;
    if (fired && !(S.notif.lastTap && now - S.notif.lastTap < 600000)) S.notif.ignored += fired;
    const plan = planNotifications();
    R.lastPlan = plan.map(p => ({ id: p.id, at: p.at }));
    S.notif.scheduled += plan.length;
    save();
    const L = notifPluginRaw();
    if (L) {
      try {
        await nativeNotifSetup(L);
        const pend = await L.getPending();
        const old = (pend.notifications || []).filter(n => n.id >= 7100 && n.id < 7300).map(n => ({ id: n.id }));
        if (old.length) await L.cancel({ notifications: old });
        if (plan.length) await L.schedule({ notifications: plan.map(p => ({ id: p.id, title: p.title, body: p.body, schedule: { at: new Date(p.at), allowWhileIdle: true }, channelId: "reminders", actionTypeId: "REMIND", extra: { kind: p.kind } })) });
      } catch (e) { /* لا شيء */ }
      return;
    }
    // الويب: محاولة أفضل-جهد عبر Service Worker (قد لا تعمل دائماً)
    metaPut("plan", { items: plan, shown: [] }).catch(() => {});
    try {
      const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
      if (reg && reg.periodicSync && R.on) {
        const ps = await navigator.permissions.query({ name: "periodic-background-sync" }).catch(() => null);
        if (ps && ps.state === "granted") await reg.periodicSync.register("rehla-remind", { minInterval: 6 * 3600 * 1000 });
      }
    } catch (e) {}
  }
  function metaPut(k, v) {
    return new Promise((res, rej) => {
      if (!window.indexedDB) { rej(new Error("no-idb")); return; }
      const r = indexedDB.open("rehla-meta", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("kv");
      r.onerror = () => rej(r.error);
      r.onsuccess = () => { const t = r.result.transaction("kv", "readwrite"); t.objectStore("kv").put(v, k); t.oncomplete = () => res(); t.onerror = () => rej(t.error); };
    });
  }
  // الويب والتطبيق مفتوح في الخلفية: نُظهر الإشعار المستحق
  setInterval(async () => {
    if (isNative() || !S.reminders.on || !document.hidden || !("Notification" in window) || Notification.permission !== "granted") return;
    const due = S.reminders.lastPlan.find(p => p.at <= Date.now() && Date.now() - p.at < 3600000 && !p.shown);
    if (!due) return;
    const full = planNotifications().find(p => p.id === due.id) || { title: "رحلة العودة", body: gtext("خمس دقائق تكفي للبداية 🌱") };
    due.shown = true; save();
    try {
      const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
      if (reg) reg.showNotification(full.title, { body: full.body, tag: "rehla-remind", icon: "icon-192.png" });
      else new Notification(full.title, { body: full.body, tag: "rehla-remind", icon: "icon-192.png" });
    } catch (e) {}
  }, 60000);

  async function askNotifPermission() {
    const L = notifPluginRaw();
    if (L) {
      try { let p = await L.checkPermissions(); if (p.display !== "granted") p = await L.requestPermissions(); return p.display === "granted"; }
      catch (e) { return false; }
    }
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    try { return (await Notification.requestPermission()) === "granted"; } catch (e) { return false; }
  }
  async function enableReminders() {
    const ok = await askNotifPermission();
    const R = S.reminders;
    R.asks = Math.max(R.asks, 1); R.askedOn = today();
    if (!ok) {
      R.asks = 2; // لا نسأل مرة ثالثة بعد الرفض
      save(); render();
      toast(isNative() ? "حسناً، لن نرسل تذكيرات 💜" : "لم يُسمح بالإشعارات. يمكنك إضافة التذكير لتقويمك من الإعدادات 📅");
      return;
    }
    R.on = true; if (!R.onSince) R.onSince = today();
    save(); render();
    syncReminders();
    toast("🔔 سنذكّرك بلطف قبل موعدك");
  }
  // بطاقة السؤال اللطيف: بعد أول تحدٍّ، ومرة ثانية بعد 14 يوماً على الأكثر
  function reminderAskCard(st) {
    const R = S.reminders;
    if (R.on || R.asks >= 2 || st.totalChallenges < 1) return "";
    if (R.asks === 1 && R.askedOn && dayNumber(today()) - dayNumber(R.askedOn) < 14) return "";
    if (!isNative() && !("Notification" in window)) return "";
    const kid = studentClass() <= 3;
    return '<section class="card soft-ask"><b>🔔 هل تريد أن نذكّرك قبل موعدك (' + esc(whenLabel()) + ")؟</b>" +
      '<p class="small muted">تذكير لطيف واحد في اليوم فقط، ويمكنك إيقافه متى شئت.' + (kid ? " يمكن لأحد والديك ضبط الوقت معك." : "") + "</p>" +
      '<div class="grid-2"><button class="btn" data-action="remindYes">نعم، ذكّرني</button><button class="btn ghost" data-action="remindNo">ليس الآن</button></div></section>';
  }
  function reminderHelpfulCard() {
    const R = S.reminders;
    if (!R.on || R.helpfulAsked || !R.onSince || dayNumber(today()) - dayNumber(R.onSince) < 14) return "";
    return '<section class="card soft-ask center"><b>هل التذكيرات مفيدة لك؟</b><div class="grid-2" style="margin-top:10px">' +
      '<button class="btn ghost" data-action="remindHelpful" data-v="1">👍 نعم</button><button class="btn ghost" data-action="remindHelpful" data-v="0">👎 ليس كثيراً</button></div></section>';
  }
  function remindersCard() {
    const R = S.reminders, paused = R.pausedUntil && R.pausedUntil >= today();
    const sw = (k, label, hint) => '<button type="button" class="switch-row" data-action="remPref" data-k="' + k + '" role="switch" aria-checked="' + !!R[k] + '">' +
      '<span class="grow"><b>' + label + "</b>" + (hint ? '<span class="small muted">' + hint + "</span>" : "") + '</span><span class="switch" aria-hidden="true"></span></button>';
    let h = '<div class="card"><h3>🔔 التذكيرات</h3>' + sw("on", "تذكير بموعد الدراسة", "مرة واحدة في اليوم، لا إشعارات بعد 9:30 مساءً");
    if (R.on) {
      h += (paused ? '<p class="small care-note">⏸️ التذكيرات متوقفة حتى ' + esc(R.pausedUntil) + ' <button class="linkbtn" style="display:inline;margin:0" data-action="remResume">استئناف</button></p>' : "") +
        '<label for="remTime">وقت الدراسة</label><input type="time" id="remTime" value="' + remindTime() + '" min="07:00" max="21:30">' +
        '<div class="field-label" style="margin-top:10px">ذكّرني قبله بـ</div><div class="chips" style="justify-content:flex-start">' +
        [0, 10, 15, 30].map(m => '<button class="chip' + (R.lead === m ? " sel" : "") + '" data-action="remLead" data-m="' + m + '" aria-pressed="' + (R.lead === m) + '">' + (m ? m + " د" : "في الموعد") + "</button>").join("") + "</div>" +
        '<div class="field-label" style="margin-top:10px">الأيام</div><div class="chips" style="justify-content:flex-start">' +
        [6, 0, 1, 2, 3, 4, 5].map(d => '<button class="chip' + (R.days.includes(d) ? " sel" : "") + '" data-action="remDay" data-d="' + d + '" aria-pressed="' + R.days.includes(d) + '">' + DAY_NAMES[d] + "</button>").join("") + "</div>" +
        sw("miss", "رسائل «اشتقنا لك»", "إذا غبت: بعد يومين، 4، 7، 14، 30 يوماً ثم نتوقف") +
        sw("shared", "هاتف مشترك مع العائلة", "لا نُظهر اسمك في الإشعارات") +
        (R.shared ? "" : sw("showName", "أظهر اسمي في الإشعارات", "")) +
        (paused ? "" : '<button class="btn ghost block" data-action="remPause">⏸️ أوقف التذكيرات أسبوعاً</button>');
    }
    h += (!isNative() ? '<div class="stack"><button class="btn ghost block" data-action="remIcs">📅 أضف التذكير لتقويم هاتفك</button>' +
      '<p class="small muted">في المتصفح قد لا تصل الإشعارات دائماً. التقويم يذكّرك حتى بدون إنترنت، وتطبيق Android يذكّرك دائماً.</p></div>' : "") + "</div>";
    return h;
  }
  // ملف تقويم .ics: يعمل مع تطبيق التقويم بدون إنترنت
  function remindersIcs() {
    const R = S.reminders, [h, m] = remindTime().split(":");
    const byday = (R.days.length ? R.days : [0, 1, 2, 3, 4, 6]).map(d => ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][d]).join(",");
    const d = new Date(), ymd = d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
    return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//rehla//ar", "BEGIN:VEVENT",
      "UID:rehla-" + Date.now() + "@rehla", "DTSTAMP:" + ymd + "T000000", "DTSTART:" + ymd + "T" + h + m + "00",
      "DURATION:PT15M", "RRULE:FREQ=WEEKLY;BYDAY=" + byday, "SUMMARY:📚 وقت الدراسة — رحلة العودة",
      "DESCRIPTION:خمس دقائق تكفي للبداية 🌱", "BEGIN:VALARM", "TRIGGER:-PT" + (R.lead || 10) + "M", "ACTION:DISPLAY",
      "DESCRIPTION:قرب موعد دراستك", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  }

  /* ---------- كتبي + المعلم الذكي ---------- */
  const aiBase = () => (typeof AI_CONFIG !== "undefined" && AI_CONFIG && AI_CONFIG.proxyUrl ? String(AI_CONFIG.proxyUrl).replace(/\/+$/, "") : "");
  const MAX_AI_FILE = 14 * 1024 * 1024;
  const AI_DAILY = 20; // أسئلة المعلم لكل طالب يومياً (توزيع الحصة المجانية بعدل)
  const aiOn = () => !!(window.GeminiTutor && GeminiTutor.available());
  const aiLimitedToday = () => !!(dayRec().aiLimit || dayRec().aiQ >= AI_DAILY);
  let studyTab = "books", openBookId = null, bookForm = false;
  let aiBusy = false, aiStatus = "", tutorLesson = "", tutorDeep = false;

  // الملفات نفسها في IndexedDB (localStorage صغير جداً للكتب)
  function idb() {
    return new Promise((res, rej) => {
      if (!window.indexedDB) { rej(new Error("no-idb")); return; }
      const r = indexedDB.open("rehla-books", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("files");
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  async function idbDo(mode, fn) {
    const db = await idb();
    return new Promise((res, rej) => {
      const t = db.transaction("files", mode), st = t.objectStore("files");
      const r = fn(st);
      t.oncomplete = () => res(r && r.result);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    });
  }
  const idbPut = (k, v) => idbDo("readwrite", st => st.put(v, k));
  const idbGet = k => idbDo("readonly", st => st.get(k));
  const idbDel = k => idbDo("readwrite", st => st.delete(k));

  function deviceId() {
    if (!S.deviceId) { S.deviceId = (Date.now().toString(36) + Math.random().toString(36).slice(2, 12)).replace(/[^A-Za-z0-9]/g, ""); save(); }
    return S.deviceId;
  }
  const fmtSize = n => n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";
  const bookIcon = b => b.kind === "link" ? "🔗" : (b.mime || "").startsWith("image/") ? "🖼️" : "📕";
  const studyTabs = () => '<div class="seg study-tabs" role="tablist" aria-label="مذاكرة">' +
    [["books", "📖 كتبي"], ["cards", "🗂️ بطاقاتي"]].map(t => '<button role="tab" aria-selected="' + (view === t[0]) + '" class="' + (view === t[0] ? "sel" : "") + '" data-action="studyTab" data-t="' + t[0] + '">' + t[1] + "</button>").join("") + "</div>";

  // ردود المعلم: نص آمن مع عريض وقوائم بسيطة
  function mdLite(t) {
    const lines = esc(t).split(/\n/);
    let html = "", list = null;
    const close = () => { if (list) { html += "</" + list + ">"; list = null; } };
    lines.forEach(raw => {
      const l = raw.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
      let m;
      if ((m = l.match(/^\s*[-•*]\s+(.*)$/))) { if (list !== "ul") { close(); html += "<ul>"; list = "ul"; } html += "<li>" + m[1] + "</li>"; }
      else if ((m = l.match(/^\s*\d+[.)-]\s+(.*)$/))) { if (list !== "ol") { close(); html += "<ol>"; list = "ol"; } html += "<li>" + m[1] + "</li>"; }
      else if (!l.trim()) close();
      else { close(); html += "<p>" + l.replace(/^#+\s*/, "") + "</p>"; }
    });
    close();
    return html;
  }

  function viewBooks() {
    const b = openBookId && S.books.find(x => x.id === openBookId);
    if (b) return viewBook(b);
    openBookId = null;
    const subs = S.profile.subjects.length ? S.profile.subjects : ["عام"];
    const addRow = '<div class="grid-2"><button class="btn" data-action="addBookFile">📄 ملف أو صورة</button>' +
      '<button class="btn ghost" data-action="addBookLink">🔗 رابط</button></div>' +
      '<input type="file" id="bookFile" accept="application/pdf,image/*" hidden>' +
      '<p class="small muted center" style="margin:8px 0 0">PDF للكتاب أو لفصل منه، أو صوّر صفحات الدرس بالكاميرا 📷</p>';
    const linkForm = bookForm ? '<section class="card" id="linkForm"><h3>🔗 رابط كتاب</h3>' +
      '<label for="bkUrl">الرابط (PDF مباشر يبدأ بـ https)</label><input type="url" id="bkUrl" dir="ltr" placeholder="https://…/book.pdf">' +
      '<label for="bkTitle">اسم الكتاب</label><input type="text" id="bkTitle" maxlength="80" placeholder="مثلاً: رياضيات الصف السابع ج1">' +
      '<label for="bkSub">المادة</label><select id="bkSub">' + subs.map(x => "<option>" + esc(x) + "</option>").join("") + "</select>" +
      '<div class="stack"><button class="btn block" data-action="saveBookLink">أضف الكتاب</button><button class="linkbtn" data-action="cancelBookLink">إلغاء</button></div></section>' : "";
    if (!S.books.length) {
      return '<section class="card center"><div class="empty-emoji" aria-hidden="true">📖</div><h2>كتبي</h2>' +
        '<p class="muted">أضف كتابك أو صوّر صفحات الدرس، و<b>المعلم الذكي</b> يشرحه لك خطوة بخطوة، ويلخّصه، ويختبرك فيه، ويصنع لك بطاقات مراجعة.</p>' +
        addRow + "</section>" + linkForm + aiInfoCard();
    }
    return '<section class="card"><h2>📖 كتبي</h2>' + addRow + "</section>" + linkForm +
      '<section class="card"><ul class="list-plain book-list">' + S.books.slice().reverse().map(x =>
        '<li><button class="book-row" data-action="openBook" data-id="' + esc(x.id) + '"><span class="book-ic" aria-hidden="true">' + bookIcon(x) + "</span>" +
        '<span class="grow"><b dir="auto">' + esc(x.title) + '</b><span class="meta">' + esc(x.subject) + (x.size ? " · " + fmtSize(x.size) : "") +
        ((S.bookChats[x.id] || []).length ? " · 💬 " + Math.ceil(S.bookChats[x.id].length / 2) : "") + "</span></span><span aria-hidden=\"true\">←</span></button></li>").join("") +
      "</ul></section>" + aiInfoCard();
  }
  function aiInfoCard() {
    return aiOn() ? "" : '<details class="card how"><summary>🤖 أين المعلم الذكي؟</summary><p class="small muted">' +
      "المعلم الذكي (Gemini من Google) سيكون متاحاً قريباً. الآن يمكنك حفظ كتبك وقراءتها، وصنع بطاقاتك بنفسك." +
      "</p></details>";
  }

  function viewBook(b) {
    const chat = S.bookChats[b.id] || [];
    const online = navigator.onLine !== false;
    const ai = aiOn();
    const big = b.kind === "file" && b.size > MAX_AI_FILE;
    const head = '<section class="card"><button class="linkbtn back-link" data-action="closeBook">→ كل الكتب</button>' +
      '<div class="row"><span class="book-ic big" aria-hidden="true">' + bookIcon(b) + '</span><div class="grow"><h2 dir="auto" style="margin:0">' + esc(b.title) + "</h2>" +
      '<div class="meta">' + esc(b.subject) + (b.size ? " · " + fmtSize(b.size) : "") + (b.notes && Object.keys(b.notes).length ? " · جاهز للمعلم ✔" : "") + "</div></div></div>" +
      '<div class="grid-2" style="margin-top:12px"><button class="btn ghost" data-action="openBookFile">📖 افتح الكتاب</button>' +
      '<button class="btn outline" data-action="delBook">🗑️ حذف</button></div></section>';
    let tutor = '<section class="card tutor"><h3>🤖 المعلم الذكي</h3>';
    if (ai && !big && aiLimitedToday()) {
      tutor += aiRestCard();
    } else if (ai && !big) {
      tutor +=
        '<label for="tutorLesson">الدرس أو الصفحات <span class="muted">(اختياري)</span></label>' +
        '<input type="text" id="tutorLesson" maxlength="80" placeholder="مثلاً: درس الكسور، أو صفحات 20–25" value="' + esc(tutorLesson) + '">' +
        '<div class="grid-2 tutor-actions">' +
        '<button class="btn ghost" data-action="aiMode" data-m="explain"' + (aiBusy ? " disabled" : "") + ">📖 اشرح لي</button>" +
        '<button class="btn ghost" data-action="aiMode" data-m="summary"' + (aiBusy ? " disabled" : "") + ">📝 لخّص</button>" +
        '<button class="btn ghost" data-action="aiMode" data-m="quiz"' + (aiBusy ? " disabled" : "") + ">❓ اختبرني</button>" +
        '<button class="btn ghost" data-action="aiMode" data-m="cards"' + (aiBusy ? " disabled" : "") + ">🗂️ اصنع بطاقات</button></div>" +
        (chat.length || aiBusy ? '<div class="chat-log" id="chatLog" aria-live="polite">' + chat.map(m =>
          '<div class="bubble ' + (m.role === "user" ? "me" : "ai") + '" dir="auto">' + (m.role === "user" ? esc(m.text) : mdLite(m.text) + sayBtn(m.text)) + "</div>").join("") +
          (aiBusy ? '<div class="bubble ai typing">' + esc(aiStatus || "المعلم يكتب") + ' <span class="dots-anim" aria-hidden="true"><i></i><i></i><i></i></span></div>' : "") + "</div>" : "") +
        '<div class="chat-input">' + micBtn("aiInput") + '<textarea id="aiInput" dir="auto" rows="1" maxlength="1500" placeholder="اسأل عن أي شيء في الكتاب…" aria-label="سؤالك للمعلم"></textarea>' +
        '<button class="btn" data-action="aiSend" aria-label="إرسال"' + (aiBusy ? " disabled" : "") + ">➤</button></div>" +
        '<button type="button" class="switch-row" data-action="aiSimple" role="switch" aria-checked="' + !!S.settings.simple + '"><span class="grow"><b>🪶 بسّط الكلام</b><span class="small muted">جمل قصيرة وكلمات سهلة</span></span><span class="switch" aria-hidden="true"></span></button>' +
        '<button type="button" class="switch-row" data-action="aiDeep" role="switch" aria-checked="' + tutorDeep + '"><span class="grow"><b>🧠 شرح أعمق</b><span class="small muted">أبطأ قليلاً — للدروس الصعبة</span></span><span class="switch" aria-hidden="true"></span></button>' +
        (chat.length ? '<button class="linkbtn" data-action="aiClear">🧹 محادثة جديدة</button>' : "") +
        (!online ? '<p class="small care-note">📶 المعلم الذكي يحتاج إنترنت. الكتاب نفسه متاح لك دائماً.</p>' : "") +
        '<p class="small muted">يُرسَل الدرس إلى Gemini من Google ليشرحه لك فقط · باقي لك اليوم ' + Math.max(0, AI_DAILY - (dayRec().aiQ || 0)) + " سؤالاً" +
        (b.notes && b.notes[lessonKey()] ? " · ✔ الدرس محفوظ على جهازك" : "") + ".</p>";
    } else if (big) {
      tutor += '<p class="small muted">الملف أكبر من 14 ميغابايت. ليشرحه المعلم الذكي: أضف فصلاً واحداً أو صوّر صفحات الدرس 📷.</p>';
    } else {
      tutor += '<p class="small muted">المعلم الذكي غير مفعّل بعد. يمكنك الآن قراءة كتابك وصنع بطاقاتك بنفسك 🗂️.</p>';
    }
    tutor += "</section>";
    return head + tutor;
  }

  const aiTarget = () => tutorLesson.trim() ? "«" + tutorLesson.trim() + "»" : "أول درس في الكتاب";
  function aiPrompt(mode) {
    const t = aiTarget();
    if (mode === "explain") return "اشرح لي " + t + " خطوة بخطوة بأسلوب بسيط، مع مثال من الحياة، ثم اسألني سؤالاً واحداً لأتأكد أني فهمت.";
    if (mode === "summary") return "لخّص لي " + t + " في نقاط قصيرة: الأفكار الرئيسية، والمصطلحات المهمة، وما يجب أن أحفظه.";
    if (mode === "quiz") return "اختبرني في " + t + ": اسألني سؤالاً واحداً فقط في كل مرة، وانتظر إجابتي، ثم صحّحها بلطف وانتقل للسؤال التالي. ابدأ بالسؤال الأول.";
    return "اصنع 8 بطاقات مراجعة (سؤال قصير وجوابه من الكتاب) من " + t + ".";
  }

  async function aiFetch(path, payload) {
    if (navigator.onLine === false) throw { code: "offline" };
    if (!aiOn()) throw { code: "server_not_configured" };
    if (path === "/chat") return GeminiTutor.chat(payload);
    if (path === "/cards") return GeminiTutor.cards(payload);
    throw { code: "upstream" };
  }
  function aiErrorText(e) {
    const c = (e && e.code) || "";
    return ({
      offline: "📶 أنت غير متصل بالإنترنت الآن. جرّب لاحقاً — كتابك محفوظ عندك.",
      network: "تعذّر الاتصال. تأكد من الإنترنت وحاول مرة أخرى.",
      timeout: "الاتصال بطيء جداً. حاول مرة أخرى، أو اسأل عن جزء أصغر من الكتاب.",
      daily_limit: "وصلت للحد اليومي للمعلم الذكي" + (e.limit ? " (" + e.limit + ")" : "") + ". نكمل غداً 💜",
      busy: "المعلم مشغول الآن. حاول بعد دقيقة.",
      too_large: "الملف كبير جداً للمعلم. ارفع فصلاً واحداً أو صوّر صفحات الدرس.",
      missing: "لم نجد ملف الكتاب على جهازك. احذفه وأضفه من جديد.",
      server_not_configured: "المعلم الذكي غير جاهز بعد على هذا الجهاز.",
      origin_not_allowed: "المعلم الذكي غير جاهز بعد على هذا الجهاز.",
      url_fetch_failed: "لم نستطع تحميل الكتاب من الرابط. نزّله على جهازك ثم أضفه كملف 📄",
      bad_file: "لم يستطع المعلم قراءة هذا الملف. جرّب صورة واضحة للصفحة 📷",
      bad_type: "نوع الملف غير مدعوم. استخدم PDF أو صورة."
    })[c] || "حدث خطأ. حاول مرة أخرى.";
  }
  /* نص الدرس يُستخرج من الكتاب مرة واحدة ويُحفظ على الهاتف — بعدها الأسئلة نص خفيف فقط */
  const lessonKey = () => (tutorLesson.trim() || "_first").slice(0, 80);
  async function ensureNotes(b, force) {
    const k = lessonKey();
    b.notes = b.notes && typeof b.notes === "object" ? b.notes : {};
    if (b.notes[k] && !force) return b.notes[k];
    aiStatus = "المعلم يقرأ الدرس من كتابك (مرة واحدة فقط)";
    render();
    let blob, mime;
    if (b.kind === "link") {
      const res = await fetch(b.url).catch(() => null);
      if (!res || !res.ok) throw { code: "url_fetch_failed" };
      blob = await res.blob(); mime = (blob.type || "application/pdf").split(";")[0];
    } else {
      blob = await idbGet(b.id).catch(() => null);
      if (!blob) throw { code: "missing" };
      mime = b.mime || blob.type || "application/pdf";
    }
    const text = await GeminiTutor.extractLesson(blob, mime, tutorLesson.trim());
    // نحتفظ بآخر 6 دروس لكل كتاب حتى لا يمتلئ التخزين
    const keys = Object.keys(b.notes);
    if (keys.length >= 6) delete b.notes[keys[0]];
    b.notes[k] = text;
    save();
    aiStatus = "";
    return text;
  }
  function bookPayload(b, extra) {
    return Object.assign({
      notes: (b.notes || {})[lessonKey()] || "",
      title: b.title, subject: b.subject, grade: classLabel(studentClass()) || S.profile.grade, simple: !!S.settings.simple || !!S.settings.young
    }, extra);
  }
  async function aiCall(b, path, extra) {
    await ensureNotes(b);
    return aiFetch(path, bookPayload(b, extra));
  }
  function aiReward() {
    const rec = dayRec();
    rec.aiQ = (rec.aiQ || 0) + 1;
    if (rec.aiQ <= 10) addXP(3); else { markActive(); save(); }
  }
  // انتهت حصة اليوم (حدّنا العادل أو حصة Google المجانية) → رسالة تربوية بدل المعلم
  function aiLimitReached() { dayRec().aiLimit = true; save(); fx("welcome"); render(); const box = document.querySelector(".claude-rest"); if (box) box.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" }); }
  async function aiSend(b, text) {
    if (aiBusy || !text.trim()) return;
    if (aiLimitedToday()) { aiLimitReached(); return; }
    const chat = S.bookChats[b.id] = S.bookChats[b.id] || [];
    chat.push({ role: "user", text: text.trim() });
    aiBusy = true; aiStatus = "";
    save(); render();
    try {
      let hist = chat.slice(-11);
      while (hist.length && hist[0].role !== "user") hist = hist.slice(1);
      const r = await aiCall(b, "/chat", { deep: tutorDeep, messages: hist });
      chat.push({ role: "assistant", text: r.text || "…" });
      if (chat.length > 30) S.bookChats[b.id] = chat.slice(-30);
      fx("flip");
      aiReward();
    } catch (e) {
      chat.pop();
      if (e && (e.code === "ai_limit" || e.code === "daily_limit")) { aiBusy = false; aiLimitReached(); return; }
      toast(aiErrorText(e));
      setTimeout(() => { const f = $("#aiInput"); if (f && !f.value) f.value = text; }, 50);
    } finally {
      aiBusy = false; aiStatus = "";
      save(); render();
    }
  }
  async function aiCards(b) {
    if (aiBusy) return;
    if (aiLimitedToday()) { aiLimitReached(); return; }
    const prompt = aiPrompt("cards");
    aiBusy = true; aiStatus = "المعلم يصنع بطاقاتك"; render();
    try {
      const r = await aiCall(b, "/cards", { messages: [{ role: "user", text: prompt }] });
      const cards = (r.cards || []).filter(c => c.q && c.a);
      cards.forEach(c => S.cards.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), subject: b.subject || (S.profile.subjects[0] || "عام"), q: c.q, a: c.a, box: 1, due: today() }));
      const chat = S.bookChats[b.id] = S.bookChats[b.id] || [];
      chat.push({ role: "user", text: prompt }, { role: "assistant", text: cards.length ? "✔ أضفت **" + cards.length + " بطاقة** إلى «بطاقاتي». راجعها الآن لتثبت المعلومة 🗂️" : "لم أستطع صنع بطاقات من هذا الجزء. جرّب تحديد الدرس أو الصفحات." });
      if (cards.length) { fx("complete"); aiReward(); checkBadges(); }
    } catch (e) { if (e && (e.code === "ai_limit" || e.code === "daily_limit")) { aiBusy = false; aiLimitReached(); return; } toast(aiErrorText(e)); }
    finally { aiBusy = false; aiStatus = ""; save(); render(); }
  }

  async function addBookFromFile(file) {
    if (!file) return;
    const isImg = /^image\//.test(file.type), isPdf = file.type === "application/pdf";
    if (!isImg && !isPdf) { toast("ارفع ملف PDF أو صورة"); return; }
    let blob = file, mime = file.type;
    if (isImg) { try { blob = await compressImage(file); mime = "image/jpeg"; } catch (e) { /* نستخدم الأصل */ } }
    const id = "b" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    try { await idbPut(id, blob); }
    catch (e) { toast("لا توجد مساحة كافية على الجهاز لحفظ الكتاب"); return; }
    const title = (file.name || "كتاب").replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").slice(0, 80) || (isImg ? "صفحات الدرس" : "كتاب");
    S.books.push({ id, title, subject: S.profile.subjects[0] || "عام", kind: "file", mime, size: blob.size, url: "", fileId: "", added: today() });
    save();
    openBookId = id; tutorLesson = "";
    render();
    toast(blob.size > MAX_AI_FILE ? "أُضيف الكتاب ✔ (كبير على المعلم — ارفع فصلاً واحداً)" : "أُضيف الكتاب ✔");
    fx("complete");
  }
  // صور الصفحات: نصغّرها لتوفير الإنترنت والمساحة
  function compressImage(file) {
    return new Promise((res, rej) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const max = 1600, k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(b => b ? res(b) : rej(new Error("blob")), "image/jpeg", 0.82);
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("img")); };
      img.src = url;
    });
  }
  async function openBookFile(b) {
    if (b.kind === "link") { window.open(b.url, "_blank", "noopener"); return; }
    const blob = await idbGet(b.id).catch(() => null);
    if (!blob) { toast(aiErrorText({ code: "missing" })); return; }
    if (isNative()) { await nativeShareFile(b.title.replace(/[^\w؀-ۿ -]/g, "") + (b.mime === "application/pdf" ? ".pdf" : ".jpg"), await blobToBase64(blob), true, b.title); return; }
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  /* ---------- رسالة تربوية عند انتهاء حصة المعلم الذكي لليوم ---------- */
  function aiRestCard() {
    const young = S.settings.young;
    return '<div class="claude-rest">' +
      '<div class="empty-emoji" aria-hidden="true">🌙</div>' +
      '<p class="next-text center" data-autoread>' + (young ? "المعلم الذكي ينام الآن، ويعود غداً! تعال نلعب ونتعلّم معاً 🌟" :
        "المعلم الذكي أخذ استراحته حتى الغد… وهذه فرصتك لتكون أنت المعلّم! 💪") + "</p>" +
      (young ? "" : '<p class="small muted center">العلماء يقولون: ما تشرحه بنفسك تتذكّره أطول بكثير مما تقرؤه. جرّب واحدة من هذه الآن:</p>') +
      '<div class="stack">' +
      (dueCards().length ? '<button class="btn good block" data-action="go" data-v="cards">🗂️ راجع بطاقاتك (' + dueCards().length + ")</button>" : "") +
      (young ? '<button class="btn ghost block" data-action="startLetters">🔤 العب «اسمع واختر»</button>' :
        '<button class="btn ghost block" data-action="feynman">🗣️ اشرح الدرس بصوت عالٍ كأنك المعلّم</button>') +
      '<button class="btn ghost block" data-action="writeReflect">✍️ اكتب أو سجّل ما تعلّمته اليوم</button>' +
      '<button class="btn ghost block" data-action="startQuiz">❓ تحدّي المعلومات</button>' +
      "</div>" +
      '<p class="small muted center" style="margin-top:10px">' + (S.settings.together || young ? "👨‍👧 أو اطلب من أحد أفراد عائلتك أن يقرأ معك صفحة." : "يعود المعلم الذكي غداً، ونكمل معاً 🌱") + "</p></div>";
  }
  /* ---------- تحدي المعلومات ---------- */
  function startQuiz() {
    const subs = S.profile.subjects;
    // أسئلة تناسب الصف: لا أسئلة متقدمة للابتدائي، ولا فيزياء/كيمياء/حاسوب للصفوف 1-3
    const cls = studentClass();
    const bank = QUIZ.filter(q => !(cls <= 6 && (q.lvl === 2 || q.s === "الفيزياء" || q.s === "الكيمياء")) &&
      !(cls <= 3 && (q.s === "الأحياء" || q.s === "الحاسوب" || q.s === "اللغة الإنجليزية")));
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
      '<h3 style="margin-bottom:14px" data-autoread>' + esc(q.q) + "</h3>" + (wantsRead() ? sayBtn(q.q) : "") +
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
      if (SP()) { SP().stop(); if (SP().isListening()) SP().stopListening(); }
      view = navBtn.dataset.view === "cards" ? studyTab : navBtn.dataset.view;
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
        { const c = +($("#obClass") || {}).value; if (c) { S.profile.cls = c; S.profile.grade = gradeOfClass(c); } }
        S.profile.minutes = +$("#obMinutes").value;
        S.profile.goal = $("#obGoal").value.trim();
        { const w = document.querySelector('[data-action="obWhen"].sel'); S.profile.when = w ? w.dataset.w : ""; }
        syncReminders();
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
        if (txt.length < 2) { toast("اكتب أو تحدّث بكلمة على الأقل 🙂"); return; }
        if (SP() && SP().isListening()) SP().stopListening();
        saveReflection(txt);
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
            cancelFocusNotif();
            if (window.Sound) Sound.stopAmbient();
            if (m >= 3) { S.timer.minutes = m; S.timer.end = Date.now(); S.timer.muted = true; finishTimer(); }
            else { clearInterval(timerInt); S.timer = null; save(); document.title = "رحلة العودة"; render(); }
          });
        break;
      }
      case "startMath": view = "games"; startMath(); break;
      case "mathAns": {
        if (!game || game.over) return;
        if (+el.dataset.v === game.q.ans) { game.score++; game.combo = (game.combo || 0) + 1; fx("tick", { combo: game.combo - 1 }); }
        else { game.wrong++; game.combo = 0; Haptics.buzz(25); }
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
        if (ok) { game.score++; fx("right"); } else fx("softNo");
        render();
        break;
      }
      case "quizNext": {
        if (!game || game.type !== "quiz") return;
        game.i++; game.picked = null;
        if (game.i >= game.qs.length) {
          game.over = true;
          const rec0 = S.best.quiz;
          if (S.best.quiz == null || game.score > S.best.quiz) S.best.quiz = game.score;
          fx(rec0 != null && game.score > rec0 ? "record" : "gameEnd");
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
      case "showAnswer": if (review) { review.show = true; fx("flip"); render(); } break;
      case "grade": if (el.dataset.ok === "1") fx("right"); gradeCard(el.dataset.ok === "1"); break;
      case "endReview": review = null; render(); break;
      case "share": shareProgress(); break;
      case "feynman":
        showModal("🗣️", "كن أنت المعلّم", "اختر فكرة واحدة من درسك، واشرحها بصوت عالٍ لشخص تخيّله أمامك — أو لأحد من عائلتك. عندما تتوقف عند كلمة لا تفهمها، اكتبها في بطاقة جديدة لتسأل عنها غداً.",
          '<div class="stack"><button class="btn block" data-action="focusFor" data-m="10" data-s="' + esc((S.profile.subjects[0]) || "عام") + '">⏱️ ابدأ 10 دقائق</button><button class="btn ghost block" data-action="closeModal">لاحقاً</button></div>');
        break;
      case "say": if (SP()) { if (SP().isSpeaking && SP().isSpeaking()) { SP().stop(); break; } sayNow(el.dataset.t); } break;
      case "stopSpeak": if (SP()) SP().stop(); break;
      case "setVoice": S.settings.voice = el.dataset.v; save(); render(); if (SP()) { SP().stop(); sayNow({ woman: "مرحباً، أنا صوت القارئة", man: "مرحباً، أنا صوت القارئ", girl: "مرحباً! أنا صديقتك، سأقرأ معك", boy: "مرحباً! أنا صديقك، سأقرأ معك" }[el.dataset.v]); } break;
      case "mic": startMic(el.dataset.target); break;
      case "micCloud": case "micLocal": {
        S.settings.stt = a === "micCloud" ? "cloud" : "local"; save(); closeModal();
        const id = pendingMic; pendingMic = null;
        if (id && a === "micCloud") setTimeout(() => startMic(id), 150);
        else if (a === "micLocal") toast("حسناً 💜 يمكنك تسجيل صوتك في «تأمّل اليوم»، ويبقى على جهازك");
        break;
      }
      case "sttReset": S.settings.stt = ""; save(); render(); toast("سنسألك مرة أخرى عند استخدام 🎤"); break;
      case "spPref": {
        const k = el.dataset.k;
        S.settings[k] = !S.settings[k];
        if (k === "young") S.daily = S.daily && !S.daily.list.some(c => c.done) ? null : S.daily;
        save(); render();
        if (k === "readAloud" && S.settings.readAloud) setTimeout(() => sayNow("سنقرأ لك التعليمات بصوت"), 100);
        break;
      }
      case "aiSimple": { const l = $("#tutorLesson"); if (l) tutorLesson = l.value; S.settings.simple = !S.settings.simple; save(); render(); break; }
      case "yFace": yRef.face = el.dataset.v; render(); break;
      case "yDid": { const v = el.dataset.v, i2 = yRef.did.indexOf(v); if (i2 >= 0) yRef.did.splice(i2, 1); else yRef.did.push(v); render(); break; }
      case "yReflect": if (yRef.face || yRef.did.length) saveReflection([yRef.face].concat(yRef.did).filter(Boolean).join(" · ")); break;
      case "voiceNote": {
        if (!SP() || !SP().canRecord()) return;
        if (SP().isRecording()) { SP().stopRecording(); break; }
        SP().stop();
        SP().startRecording().then(async blob => {
          if (!blob || !blob.size) { render(); return; }
          const id = "vn" + Date.now().toString(36);
          try { await idbPut(id, blob); } catch (e) { toast("لا توجد مساحة كافية لحفظ التسجيل"); render(); return; }
          saveReflection("🎙️ تسجيل صوتي", id);
        }).catch(() => { toast("اسمح للتطبيق باستخدام الميكروفون من إعدادات الهاتف"); render(); });
        setTimeout(render, 150);
        break;
      }
      case "playVn": {
        idbGet(el.dataset.id).then(blob => {
          if (!blob) { toast("لم نجد التسجيل على هذا الجهاز"); return; }
          const url = URL.createObjectURL(blob), au = new Audio(url);
          au.onended = () => URL.revokeObjectURL(url);
          au.play().catch(() => toast("تعذّر تشغيل التسجيل"));
        }).catch(() => {});
        break;
      }
      case "startCount": view = "games"; startCount(); break;
      case "countAns": if (game && game.type === "count") youngAnswer(+el.dataset.v === game.q.n, countRound); break;
      case "startLetters": view = "games"; startLetters(); break;
      case "sayLetter": sayLetter(); break;
      case "letterAns":
        if (game && game.type === "letters") { const ok = el.dataset.v === game.q.target[0]; youngAnswer(ok, lettersRound); if (ok) setTimeout(sayLetter, 500); else setTimeout(sayLetter, 300); }
        break;
      case "addLetters": {
        if (S.cards.some(c => c.deck === "letters")) { toast("بطاقات الحروف موجودة ✔"); break; }
        LETTERS.forEach((l, i2) => S.cards.push({ id: "lt" + i2 + Date.now().toString(36), subject: "اللغة العربية", q: l[0], a: l[0] + " — " + l[1] + " " + l[2], box: 1, due: today(), deck: "letters" }));
        save(); fx("complete"); toast("أضفنا 28 بطاقة للحروف 🔤"); render();
        break;
      }
      case "remindYes": enableReminders(); break;
      case "remindNo": S.reminders.asks = Math.min(2, S.reminders.asks + 1); S.reminders.askedOn = today(); save(); render(); break;
      case "remindHelpful":
        S.reminders.helpfulAsked = true; S.notif.helpful = el.dataset.v === "1";
        if (!S.notif.helpful) { S.reminders.reduced = true; toast("خففنا التذكيرات. يمكنك إيقافها من الإعدادات"); } else toast("شكراً لك 💜");
        save(); render(); syncReminders(); break;
      case "remPref": {
        const k = el.dataset.k, R = S.reminders;
        if (k === "on" && !R.on) { enableReminders(); break; }
        R[k] = !R[k];
        if (k === "on" && !R.on) S.notif.disables++;
        if (k === "shared" && R.shared) R.showName = false;
        save(); render(); syncReminders(); break;
      }
      case "remLead": S.reminders.lead = +el.dataset.m; save(); render(); syncReminders(); break;
      case "remDay": {
        const d = +el.dataset.d, days = S.reminders.days, i = days.indexOf(d);
        if (i >= 0) { if (days.length > 1) days.splice(i, 1); } else days.push(d);
        save(); render(); syncReminders(); break;
      }
      case "remPause": S.reminders.pausedUntil = dateKey(addDays(new Date(), 7)); S.notif.pauses++; save(); render(); syncReminders(); toast("⏸️ أوقفنا التذكيرات أسبوعاً. خذ وقتك 💜"); break;
      case "remResume": S.reminders.pausedUntil = ""; save(); render(); syncReminders(); break;
      case "remIcs": {
        const ics = remindersIcs();
        if (isNative()) { nativeShareFile("rehla-reminder.ics", ics, false, "تذكير الدراسة"); break; }
        const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
        const a2 = document.createElement("a"); a2.href = url; a2.download = "rehla-reminder.ics";
        document.body.appendChild(a2); a2.click(); a2.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
        toast("📅 افتح الملف لإضافته لتقويمك");
        break;
      }
      case "setG": S.profile.g = S.profile.g === el.dataset.g ? undefined : el.dataset.g; save(); render(); break;
      case "studyTab": studyTab = el.dataset.t; openBookId = null; review = null; view = studyTab; render(); break;
      case "addBookFile": { const f = $("#bookFile"); if (f) f.click(); break; }
      case "addBookLink": bookForm = true; render(); setTimeout(() => { const u = $("#bkUrl"); if (u) u.focus(); }, 30); break;
      case "cancelBookLink": bookForm = false; render(); break;
      case "saveBookLink": {
        const url = ($("#bkUrl").value || "").trim(), title = ($("#bkTitle").value || "").trim();
        if (!/^https:\/\/\S+$/i.test(url)) { toast("اكتب رابطاً صحيحاً يبدأ بـ https://"); return; }
        const id = "b" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        S.books.push({ id, title: title || "كتاب من رابط", subject: $("#bkSub").value, kind: "link", mime: "application/pdf", size: 0, url, fileId: "", added: today() });
        bookForm = false; openBookId = id; tutorLesson = "";
        save(); render(); fx("complete");
        break;
      }
      case "openBook": openBookId = el.dataset.id; tutorLesson = ""; render(); break;
      case "closeBook": openBookId = null; render(); break;
      case "tutorFor": {
        const b = S.books.slice().reverse().find(x => x.subject === el.dataset.s);
        if (b) { studyTab = "books"; view = "books"; openBookId = b.id; tutorLesson = ""; render(); }
        break;
      }
      case "openBookFile": { const b = S.books.find(x => x.id === openBookId); if (b) openBookFile(b); break; }
      case "delBook": {
        const id = openBookId;
        askConfirm("🗑️", "حذف هذا الكتاب؟", "سيُحذف من جهازك مع محادثاته. بطاقاتك تبقى.", "احذف", () => {
          S.books = S.books.filter(x => x.id !== id); delete S.bookChats[id]; idbDel(id).catch(() => {});
          openBookId = null; save(); render();
        }, true);
        break;
      }
      case "aiMode": {
        const b = S.books.find(x => x.id === openBookId);
        if (!b) return;
        const l = $("#tutorLesson"); if (l) tutorLesson = l.value;
        if (el.dataset.m === "cards") aiCards(b); else aiSend(b, aiPrompt(el.dataset.m));
        break;
      }
      case "aiSend": {
        const b = S.books.find(x => x.id === openBookId), f = $("#aiInput");
        const l = $("#tutorLesson"); if (l) tutorLesson = l.value;
        if (b && f && f.value.trim()) aiSend(b, f.value);
        break;
      }
      case "aiDeep": { const l = $("#tutorLesson"); if (l) tutorLesson = l.value; tutorDeep = !tutorDeep; render(); break; }
      case "aiClear": { S.bookChats[openBookId] = []; save(); render(); break; }
      case "setPref": {
        const k = el.dataset.k;
        S.settings[k] = !S.settings[k];
        save();
        if (k === "sound" && S.settings.sound) setTimeout(() => fx("right"), 30);
        if (k === "haptics" && S.settings.haptics) Haptics.buzz(15);
        if (k === "sound" && !S.settings.sound && window.Sound) Sound.stopAmbient();
        render();
        break;
      }
      case "obSound": S.settings.sound = !S.settings.sound; save(); renderOnboarding(); if (S.settings.sound) fx("right"); break;
      case "toggleAmbient": S.settings.ambient = !S.settings.ambient; save(); render(); break;
      case "sessionMute": {
        if (!S.timer) return;
        S.timer.muted = !S.timer.muted;
        save();
        if (window.Sound) { if (S.timer.muted) Sound.stopAmbient(); else Sound.startAmbient(); }
        render();
        break;
      }
      case "obNext": obNext(); break;
      case "obBack": { const nm = $("#obName"); if (nm) ob.name = nm.value.trim(); ob.step = Math.max(0, ob.step - 1); renderOnboarding(); break; }
      case "obSet": {
        const k = el.dataset.k, v = el.dataset.v;
        if (k === "lvl") { const steps = obSteps(); ob.levels[onboardSel[+steps[ob.step].split(":")[1]]] = +v; }
        else if (k === "minutes" || k === "away" || k === "cls") ob[k] = +v;
        else if (k === "read") ob.read = v === "1";
        else if (k === "who") ob.who = v;
        else if (k === "grade") { if (ob.grade !== v) ob.cls = 0; ob.grade = v; const cl = GRADE_INFO[v].classes; if (cl.length === 1) ob.cls = cl[0]; }
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
    if (e.key === "Enter" && !e.shiftKey && e.target && e.target.id === "aiInput") { e.preventDefault(); const b = $('[data-action="aiSend"]'); if (b) b.click(); }
  });
  document.addEventListener("toggle", e => { if (e.target && e.target.id === "progressCard") progressOpen = e.target.open; }, true);
  document.addEventListener("input", e => {
    if (e.target.classList && e.target.classList.contains("lesson-input")) {
      assessDraft.lessons = assessDraft.lessons || {};
      assessDraft.lessons[e.target.dataset.s] = e.target.value;
    }
  });

  document.addEventListener("input", e => {
    if (e.target && e.target.id === "volRange") { const v = $("#volVal"); if (v) v.textContent = e.target.value + "٪"; }
  });
  document.addEventListener("change", e => {
    if (e.target && e.target.id === "remTime" && /^\d{2}:\d{2}$/.test(e.target.value)) {
      let v = e.target.value; if (v < "07:00") v = "07:00"; if (v > "21:30") v = "21:30";
      S.reminders.time = v; save(); syncReminders(); if (v !== e.target.value) { e.target.value = v; toast("لا تذكيرات قبل 7 صباحاً أو بعد 9:30 مساءً"); }
      return;
    }
    if (e.target && e.target.id === "bookFile") { const f = e.target.files && e.target.files[0]; e.target.value = ""; addBookFromFile(f); return; }
    if (e.target && e.target.id === "volRange") { S.settings.volume = (+e.target.value || 0) / 100; save(); fx("right"); return; }
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
    syncReminders();
    if (S.timer && S.timer.end <= Date.now()) finishTimer();
    else if (S.timer && !S.timer.muted && window.Sound) Sound.startAmbient();
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

  if (window.Sound) Sound.init(() => S.settings);
  if (SP()) {
    SP().init(); SP().onReady(() => { if (S.profile) render(); else renderOnboarding(); });
    // زر «أوقف القراءة» يظهر فقط أثناء الكلام
    if (SP().onSpeaking) {
      const stopB = document.createElement("button");
      stopB.type = "button"; stopB.className = "stop-speak hidden"; stopB.dataset.action = "stopSpeak";
      stopB.innerHTML = '<span aria-hidden="true">⏹</span> أوقف القراءة'; stopB.setAttribute("aria-label", "أوقف القراءة");
      document.body.appendChild(stopB);
      stopB.addEventListener("click", () => SP().stop());
      SP().onSpeaking(on => stopB.classList.toggle("hidden", !on));
    }
  }
  window.addEventListener("online", () => { if (view === "books") render(); });
  window.addEventListener("offline", () => { if (view === "books") render(); });

  /* ================= التشغيل ================= */
  render();
  setTimeout(syncReminders, 500);
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
