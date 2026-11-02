/* الصوت والكلام في «رحلة العودة»:
   - القراءة بصوت (TTS): speechSynthesis في المتصفح، وإضافة text-to-speech في تطبيق Android
   - الإملاء الصوتي (STT): Web Speech API في المتصفح، وإضافة speech-recognition في Android
   - التسجيل الصوتي: MediaRecorder — يبقى على الجهاز فقط
   تصميم الوكيل التربوي: الصوت إضافة لا شرط، ولا يُرسل صوت الطفل للمعلم الذكي أبداً (نصّ فقط). */
(function () {
  "use strict";
  const isNative = () => !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
  const plugin = n => isNative() && window.Capacitor.Plugins && window.Capacitor.Plugins[n];

  /* ---------- القراءة بصوت ----------
     أصوات: امرأة / رجل / طفلة / طفل. نفضّل الأصوات «الطبيعية» (Natural/Neural/Online/Google) لأنها أقرب للإنسان،
     ونقرأ جملة جملة مع وقفات قصيرة حتى لا يبدو الكلام آلياً. */
  const VOICE_STYLE = {
    woman: { g: "f", pitch: 1.0, rate: 0.95 },
    man: { g: "m", pitch: 0.92, rate: 0.93 },
    girl: { g: "f", pitch: 1.3, rate: 0.97 },
    boy: { g: "m", pitch: 1.22, rate: 0.97 }
  };
  const FEMALE = /female|woman|zariyah|salma|amina|hoda|laila|layla|mouna|rana|sana|fatima|noura|dalia|amany|zeina|reem|sara|hala|iman|\bf\d?\b|-a$|x-ard-|arc-|ar-xa-x-ard/i;
  const MALE = /\bmale\b|\bman\b|hamed|shakir|naayf|tarik|bassel|omar|hamdan|fahed|ali\b|moaz|rami|saleh|taim|\bm\d?\b|ar-xa-x-arz|x-are-/i;
  const NATURAL = /natural|neural|online|enhanced|premium|wavenet|google/i;
  let arVoices = [], ttsOk = false, speaking = false, queue = [], style = "woman", nativeVoices = [];
  const listeners = [], speakListeners = [];
  function clean(t) {
    return String(t || "").replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, " ")
      .replace(/[«»*_#•→←✔✖]/g, " ").replace(/\s+/g, " ").trim();
  }
  function setOk(v) { if (v !== ttsOk) { ttsOk = v; listeners.forEach(f => { try { f(); } catch (e) {} }); } }
  function setSpeaking(v) { if (v !== speaking) { speaking = v; speakListeners.forEach(f => { try { f(v); } catch (e) {} }); } }
  const genderOf = v => { const n = (v.name || "") + " " + (v.voiceURI || v.identifier || ""); return FEMALE.test(n) && !MALE.test(n) ? "f" : MALE.test(n) ? "m" : ""; };
  function score(v, g) {
    let sc = 0;
    if (NATURAL.test(v.name || "")) sc += 4;
    if (/^ar[-_]?(PS|JO|LB|SY)/i.test(v.lang)) sc += 2; else if (/^ar[-_]?(SA|EG|AE)/i.test(v.lang)) sc += 1;
    const vg = genderOf(v);
    if (vg === g) sc += 6; else if (vg && vg !== g) sc -= 3;
    if (v.localService === false) sc += 1; // أصوات الإنترنت عادة أكثر طبيعية
    return sc;
  }
  function pickVoice() {
    const g = (VOICE_STYLE[style] || VOICE_STYLE.woman).g;
    return arVoices.slice().sort((a, b) => score(b, g) - score(a, g))[0] || null;
  }
  // هل يوجد صوت حقيقي بهذا الجنس؟ (وإلا نغيّر طبقة الصوت فقط)
  const hasGender = g => arVoices.some(v => genderOf(v) === g);
  function initTTS() {
    const T = plugin("TextToSpeech");
    if (T) {
      T.getSupportedLanguages().then(r => setOk((r.languages || []).some(l => /^ar/i.test(l)))).catch(() => setOk(true));
      if (T.getSupportedVoices) T.getSupportedVoices().then(r => { nativeVoices = (r.voices || []).map((v, i) => Object.assign({ i }, v)).filter(v => /^ar/i.test(v.lang || "")); }).catch(() => {});
      return;
    }
    if (!("speechSynthesis" in window)) return;
    const pick = () => {
      const vs = speechSynthesis.getVoices() || [];
      arVoices = vs.filter(v => /^ar/i.test(v.lang));
      setOk(arVoices.length > 0);
    };
    pick();
    try { speechSynthesis.addEventListener("voiceschanged", pick); } catch (e) { speechSynthesis.onvoiceschanged = pick; }
  }
  // نقسم النص إلى جمل قصيرة: وقفات طبيعية بدل سيل متواصل من الكلمات
  function sentences(t) {
    return t.split(/(?<=[.!؟?،:\n])\s+/).map(x => x.trim()).filter(Boolean).reduce((acc, x) => {
      if (acc.length && (acc[acc.length - 1].length + x.length) < 60) acc[acc.length - 1] += " " + x; else acc.push(x);
      return acc;
    }, []);
  }
  function speak(text, opts) {
    opts = opts || {};
    const t = clean(text);
    if (!t || !ttsOk) return false;
    stopSpeak();
    const st = VOICE_STYLE[opts.voice || style] || VOICE_STYLE.woman;
    const volume = opts.volume == null ? 1 : opts.volume;
    const T = plugin("TextToSpeech");
    if (T) {
      const nv = nativeVoices.slice().sort((a, b) => score(b, st.g) - score(a, st.g))[0];
      const pitch = nv && genderOf(nv) === st.g ? st.pitch : st.pitch * (st.g === "m" ? 0.85 : 1.08);
      setSpeaking(true);
      T.speak(Object.assign({ text: t, lang: "ar", rate: st.rate, pitch, volume, category: "ambient" }, nv ? { voice: nv.i } : {}))
        .catch(() => {}).finally(() => setSpeaking(false));
      return true;
    }
    try {
      const v = pickVoice();
      // لا يوجد صوت رجل/امرأة حقيقي؟ نقرّب الطبقة قليلاً (باعتدال حتى لا يصبح الصوت مضحكاً)
      const pitch = v && genderOf(v) === st.g ? st.pitch : Math.max(0.6, Math.min(1.6, st.pitch * (st.g === "m" ? (hasGender("m") ? 1 : 0.8) : (hasGender("f") ? 1 : 1.12))));
      queue = sentences(t);
      const next = () => {
        if (!queue.length) { setSpeaking(false); return; }
        const u = new SpeechSynthesisUtterance(queue.shift());
        if (v) { u.voice = v; u.lang = v.lang; } else u.lang = "ar";
        u.rate = st.rate; u.pitch = pitch; u.volume = volume;
        u.onend = () => setTimeout(next, 180);
        u.onerror = () => { queue = []; setSpeaking(false); };
        speechSynthesis.speak(u);
      };
      setSpeaking(true);
      next();
      return true;
    } catch (e) { setSpeaking(false); return false; }
  }
  function stopSpeak() {
    queue = [];
    try { const T = plugin("TextToSpeech"); if (T) T.stop().catch(() => {}); else if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
    setSpeaking(false);
  }

  /* ---------- الإملاء الصوتي ---------- */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, active = null, silenceT = null, maxT = null;
  const canListen = () => !!(plugin("SpeechRecognition") || SR);
  function finish(err) {
    clearTimeout(silenceT); clearTimeout(maxT);
    const a = active; active = null;
    if (!a) return;
    try { if (rec) rec.stop(); } catch (e) {}
    const S = plugin("SpeechRecognition");
    if (S) { try { S.stop().catch(() => {}); S.removeAllListeners && S.removeAllListeners(); } catch (e) {} }
    a.onEnd && a.onEnd(err || null);
  }
  const quietReset = () => { clearTimeout(silenceT); silenceT = setTimeout(() => finish(), 2500); };
  /* اضغط للبدء، اضغط للإيقاف، أو يتوقف بعد 2.5 ثانية صمت أو 60 ثانية */
  async function listen(opts) {
    if (active) { finish(); return; }
    active = opts;
    const S = plugin("SpeechRecognition");
    if (S) {
      try {
        const av = await S.available().catch(() => ({ available: true }));
        if (av && av.available === false) throw new Error("unavailable");
        let p = await S.checkPermissions().catch(() => ({}));
        if (p.speechRecognition !== "granted") p = await S.requestPermissions().catch(() => ({}));
        if (p.speechRecognition && p.speechRecognition !== "granted") throw new Error("denied");
        const langs = ((await S.getSupportedLanguages().catch(() => ({}))).languages) || [];
        const lang = ["ar-PS", "ar-JO", "ar-SA", "ar-EG", "ar"].find(l => langs.includes(l)) || "ar-SA";
        await S.addListener("partialResults", d => { const m = d && d.matches && d.matches[0]; if (m && active) { active.onText(m); quietReset(); } });
        S.start({ language: lang, maxResults: 1, partialResults: true, popup: false }).then(r => {
          const m = r && r.matches && r.matches[0]; if (m && active) active.onText(m);
        }).catch(e => finish(e)).finally(() => { if (active) finish(); });
        quietReset(); maxT = setTimeout(() => finish(), 60000);
        return;
      } catch (e) { finish(e); return; }
    }
    if (!SR) { finish(new Error("unavailable")); return; }
    try {
      rec = new SR();
      rec.lang = "ar-PS"; rec.interimResults = true; rec.continuous = true; rec.maxAlternatives = 1;
      rec.onresult = ev => {
        let txt = "";
        for (let i = 0; i < ev.results.length; i++) txt += ev.results[i][0].transcript;
        if (active) active.onText(txt.trim());
        quietReset();
      };
      rec.onerror = ev => finish(new Error(ev.error || "error"));
      rec.onend = () => finish();
      rec.start();
      quietReset(); maxT = setTimeout(() => finish(), 60000);
    } catch (e) { finish(e); }
  }

  /* ---------- التسجيل الصوتي (يبقى على الجهاز) ---------- */
  let mr = null, chunks = [], recResolve = null, recTimer = null;
  const canRecord = () => !!(window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks = [];
    const type = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"].find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t));
    mr = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 16000 } : undefined);
    mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    const done = new Promise(res => { recResolve = res; });
    mr.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      clearTimeout(recTimer);
      const blob = new Blob(chunks, { type: (mr && mr.mimeType) || "audio/webm" });
      mr = null;
      if (recResolve) recResolve(blob);
    };
    mr.start();
    recTimer = setTimeout(stopRecording, 60000);
    return done;
  }
  function stopRecording() { try { if (mr && mr.state !== "inactive") mr.stop(); } catch (e) {} }
  const isRecording = () => !!(mr && mr.state === "recording");

  window.Speech = {
    init: initTTS, speak, stop: stopSpeak, canSpeak: () => ttsOk, onReady: f => listeners.push(f),
    setVoice: v => { if (VOICE_STYLE[v]) style = v; }, isSpeaking: () => speaking, onSpeaking: f => speakListeners.push(f),
    canListen, listen, stopListening: () => finish(), isListening: () => !!active,
    canRecord, startRecording, stopRecording, isRecording
  };
})();
