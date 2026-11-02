/* الصوت والكلام في «رحلة العودة»:
   - القراءة بصوت (TTS): speechSynthesis في المتصفح، وإضافة text-to-speech في تطبيق Android
   - الإملاء الصوتي (STT): Web Speech API في المتصفح، وإضافة speech-recognition في Android
   - التسجيل الصوتي: MediaRecorder — يبقى على الجهاز فقط
   تصميم الوكيل التربوي: الصوت إضافة لا شرط، ولا يُرسل صوت الطفل للمعلم الذكي أبداً (نصّ فقط). */
(function () {
  "use strict";
  const isNative = () => !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
  const plugin = n => isNative() && window.Capacitor.Plugins && window.Capacitor.Plugins[n];

  /* ---------- القراءة بصوت ---------- */
  let arVoice = null, ttsOk = false;
  const listeners = [];
  // نحذف الرموز التعبيرية والعلامات قبل النطق
  function clean(t) {
    return String(t || "").replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, " ")
      .replace(/[«»*_#•→←✔✖]/g, " ").replace(/\s+/g, " ").trim();
  }
  function setOk(v) { if (v !== ttsOk) { ttsOk = v; listeners.forEach(f => { try { f(); } catch (e) {} }); } }
  function initTTS() {
    const T = plugin("TextToSpeech");
    if (T) {
      T.getSupportedLanguages().then(r => setOk((r.languages || []).some(l => /^ar/i.test(l)))).catch(() => setOk(true));
      return;
    }
    if (!("speechSynthesis" in window)) return;
    const pick = () => {
      const vs = speechSynthesis.getVoices() || [];
      arVoice = vs.find(v => /^ar[-_]?(PS|JO)/i.test(v.lang)) || vs.find(v => /^ar/i.test(v.lang)) || null;
      setOk(!!arVoice);
    };
    pick();
    try { speechSynthesis.addEventListener("voiceschanged", pick); } catch (e) { speechSynthesis.onvoiceschanged = pick; }
  }
  function speak(text, opts) {
    opts = opts || {};
    const t = clean(text);
    if (!t || !ttsOk) return false;
    stopSpeak();
    const rate = opts.young ? 0.85 : 0.95, pitch = opts.young ? 1.05 : 1, volume = opts.volume == null ? 1 : opts.volume;
    const T = plugin("TextToSpeech");
    if (T) { T.speak({ text: t, lang: "ar", rate, pitch, volume, category: "ambient" }).catch(() => {}); return true; }
    try {
      const u = new SpeechSynthesisUtterance(t);
      u.voice = arVoice; u.lang = arVoice.lang; u.rate = rate; u.pitch = pitch; u.volume = volume;
      speechSynthesis.speak(u);
      return true;
    } catch (e) { return false; }
  }
  function stopSpeak() {
    try { const T = plugin("TextToSpeech"); if (T) T.stop().catch(() => {}); else if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
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
    canListen, listen, stopListening: () => finish(), isListening: () => !!active,
    canRecord, startRecording, stopRecording, isRecording
  };
})();
