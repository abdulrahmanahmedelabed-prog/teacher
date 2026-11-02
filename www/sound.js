/* أصوات رحلة العودة — كلها مُولَّدة بالكود (صفر ملفات، تعمل بدون إنترنت).
   عائلة واحدة: سلّم «ري» الخماسي (لا نشاز ولا صوت «فشل»)، نغمات ناعمة كالماريمبا والجرس،
   بلا صفارات أو انزلاقات حادة. التفضيلات من S.settings: {sound, volume, haptics, quiet, ambient} */
(function () {
  "use strict";
  const N = { F4s: 369.99, D4: 293.66, A4: 440, D5: 587.33, E5: 659.25, F5s: 739.99, A5: 880, B5: 987.77, D6: 1174.66 };
  const TICK_STEPS = [N.D5, N.E5, N.F5s, N.A5, N.B5, N.D6];
  const GAP = { tick: 120, coin: 1000 };
  // الأولوية: الاحتفالات > الإنجاز > الأصوات الصغيرة
  const TIER = { perfect: 3, levelup: 3, badge: 3, record: 3, focusEnd: 3, complete: 2, welcome: 2, focusStart: 2,
    right: 1, tick: 1, coin: 1, flip: 1, softNo: 1, gameEnd: 1 };

  let ctx = null, master = null, prefs = () => ({}), voices = [], amb = null;
  const last = {};
  let lastHigh = { tier: 0, at: 0 };

  function unlock() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      try {
        ctx = new C();
        master = ctx.createGain();
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass"; lp.frequency.value = 4500;
        const cp = ctx.createDynamicsCompressor();
        cp.threshold.value = -18; cp.ratio.value = 4;
        master.connect(lp); lp.connect(cp); cp.connect(ctx.destination);
      } catch (e) { ctx = null; return; }
    }
    if (ctx.state !== "running") ctx.resume().catch(() => {});
  }
  function quietNow() { const h = new Date().getHours(); return h >= 22 || h < 7; }
  function gainNow() {
    const p = prefs() || {};
    if (!p.sound) return 0;
    const v = typeof p.volume === "number" ? p.volume : 0.6;
    return v * (p.quiet && quietNow() ? 0.35 : 1);
  }

  // نغمة واحدة: ارتفاع ≥5ms (بلا طقطقة) ثم خفوت أسّي، بلا استمرار
  function voice(f, t, o) {
    o = o || {};
    const a = Math.max(0.005, o.a || 0.008), d = o.d || 0.18, g = o.g || 0.1;
    const osc = ctx.createOscillator(), v = ctx.createGain(), s = ctx.currentTime + (t || 0);
    osc.type = o.type || "sine";
    osc.frequency.value = f;
    let out = v;
    if (o.lp) { const f2 = ctx.createBiquadFilter(); f2.type = "lowpass"; f2.frequency.value = o.lp; v.connect(f2); out = f2; }
    v.gain.setValueAtTime(0.0001, s);
    v.gain.linearRampToValueAtTime(g, s + a);
    v.gain.exponentialRampToValueAtTime(0.0001, s + a + d);
    osc.connect(v); out.connect(master);
    osc.start(s); osc.stop(s + a + d + 0.03);
    v._tier = o.tier || 1;
    voices.push(v);
    osc.onended = () => { try { osc.disconnect(); v.disconnect(); out.disconnect(); } catch (e) {} voices = voices.filter(x => x !== v); };
    if (o.bell) voice(f * 2.76, t, { a, d: d / 2, g: g * 0.12, tier: o.tier });
    if (o.oct) voice(f / 2, t, { type: "triangle", a, d, g: g * 0.3, tier: o.tier });
  }

  let combo = 0;
  const R = {
    complete: T => { voice(N.A5, 0, { d: 0.18, g: 0.14, tier: T }); voice(N.D6, 0.07, { d: 0.18, g: 0.14, tier: T }); },
    coin: T => voice(N.B5, 0, { type: "triangle", a: 0.006, d: 0.09, g: 0.06, tier: T }),
    perfect: T => {
      [N.D5, N.F5s, N.A5, N.D6].forEach((f, i) => voice(f, i * 0.09, { type: "triangle", d: 0.3, g: 0.1, tier: T }));
      [N.D5, N.F5s, N.A5].forEach(f => voice(f, 0.4, { a: 0.01, d: 0.9, g: 0.08, bell: 1, tier: T }));
    },
    levelup: T => {
      const notes = [N.D5, N.E5, N.F5s, N.A5, N.B5, N.D6];
      notes.forEach((f, i) => voice(f, i * 0.07, { d: i === notes.length - 1 ? 1.2 : 0.2, g: 0.13, oct: 1, tier: T }));
    },
    badge: T => {
      voice(N.F5s, 0, { d: 0.25, g: 0.12, tier: T }); voice(N.A5, 0, { d: 0.25, g: 0.12, tier: T });
      voice(N.D6, 0.18, { d: 0.9, g: 0.12, bell: 1, tier: T });
    },
    focusStart: T => { voice(N.D4, 0, { a: 0.03, d: 0.7, g: 0.1, tier: T }); voice(N.A4, 0, { a: 0.03, d: 0.7, g: 0.05, tier: T }); },
    focusEnd: T => [N.D5, N.F5s, N.A5, N.D6].forEach((f, i) => voice(f, i * 0.18, { d: 1.2, g: 0.16, bell: 1, tier: T })),
    right: T => { voice(N.F5s, 0, { d: 0.12, g: 0.08, tier: T }); voice(N.A5, 0.06, { d: 0.12, g: 0.08, tier: T }); },
    softNo: T => { voice(N.A4, 0, { d: 0.11, g: 0.05, lp: 1200, tier: T }); voice(N.F4s, 0.11, { d: 0.11, g: 0.05, lp: 1200, tier: T }); },
    tick: T => { voice(TICK_STEPS[Math.min(combo, TICK_STEPS.length - 1)], 0, { d: 0.07, g: 0.06, tier: T }); },
    flip: T => voice(N.E5, 0, { d: 0.04, g: 0.035, tier: T }),
    record: T => [N.D5, N.E5, N.F5s, N.A5].forEach((f, i) => voice(f, i * 0.07, { d: i === 3 ? 0.8 : 0.2, g: 0.13, oct: 1, tier: T })),
    gameEnd: T => { voice(N.F5s, 0, { d: 0.4, g: 0.07, tier: T }); voice(N.A5, 0, { d: 0.4, g: 0.07, tier: T }); },
    welcome: T => { voice(N.D5, 0, { a: 0.08, d: 0.6, g: 0.07, tier: T }); voice(N.A5, 0, { a: 0.08, d: 0.6, g: 0.07, tier: T }); }
  };

  function play(id, opt) {
    if (opt && typeof opt.combo === "number") combo = opt.combo;
    const g = gainNow();
    if (!g || !R[id]) return;
    unlock();
    if (!ctx || ctx.state !== "running" || voices.length >= 8) return;
    const now = performance.now(), tier = TIER[id] || 1;
    if (now - (last[id] || 0) < (GAP[id] || 80)) return;
    // صوت أقل أولوية بعد صوت أعلى بأقل من 400ms: نتجاهله
    if (tier < lastHigh.tier && now - lastHigh.at < 400) return;
    // صوت أعلى أولوية: نخفّت الأصوات الأدنى الجارية
    if (tier >= 2) voices.forEach(v => { if (v._tier < tier) try { v.gain.cancelScheduledValues(ctx.currentTime); v.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.015); } catch (e) {} });
    last[id] = now;
    if (tier >= lastHigh.tier || now - lastHigh.at >= 400) lastHigh = { tier, at: now };
    master.gain.setValueAtTime(g, ctx.currentTime);
    try { R[id](tier); } catch (e) { /* لا شيء */ }
  }

  // خلفية هادئة للتركيز: ضجيج بنّي ناعم كصوت المطر البعيد (بلا تكتكة)
  function startAmbient() {
    const p = prefs() || {};
    if (!p.sound || !p.ambient || (p.quiet && quietNow())) return;
    unlock();
    if (!ctx || amb) return;
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), data = buf.getChannelData(0);
    let lastS = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; lastS = (lastS + 0.02 * w) / 1.02; data[i] = lastS * 3.5; }
    const src = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = buf; src.loop = true;
    lp.type = "lowpass"; lp.frequency.value = 700;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.setTargetAtTime(0.05 * (typeof p.volume === "number" ? p.volume : 0.6), ctx.currentTime, 0.6);
    src.connect(lp); lp.connect(g); g.connect(ctx.destination);
    src.start();
    amb = { src, g };
  }
  function stopAmbient() {
    if (!amb || !ctx) return;
    const a = amb; amb = null;
    try { a.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4); a.src.stop(ctx.currentTime + 1.5); } catch (e) {}
  }

  window.Sound = {
    init(p) {
      prefs = p;
      window.addEventListener("pointerdown", unlock, { capture: true, passive: true });
      window.addEventListener("keydown", unlock, { capture: true });
      document.addEventListener("visibilitychange", () => {
        if (document.hidden && ctx) { stopAmbient(); ctx.suspend().catch(() => {}); }
      });
    },
    play, unlock, startAmbient, stopAmbient,
    ambientOn: () => !!amb
  };

  // الاهتزاز: له إعداد مستقل، ومع «تقليل الحركة» أو الساعات الهادئة نكتفي بلمسات قصيرة
  window.Haptics = {
    buzz(p) {
      const s = prefs() || {};
      if (!s.haptics || !navigator.vibrate) return;
      const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
      const total = Array.isArray(p) ? p.reduce((a, b) => a + b, 0) : p;
      if ((reduce && total > 40) || (s.quiet && quietNow())) p = Math.min(20, Array.isArray(p) ? p[0] : p);
      try { navigator.vibrate(p); } catch (e) {}
    }
  };
})();
