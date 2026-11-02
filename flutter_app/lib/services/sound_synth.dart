/// مولّد الأصوات: نفس وصفات sound.js (سلّم «ري» الخماسي، نغمات ناعمة كالماريمبا والجرس)
/// تُحوَّل إلى ملفات WAV صغيرة في الذاكرة عند التشغيل — بلا أي ملفات صوت مرفقة.
library;

import 'dart:math' as math;
import 'dart:typed_data';

class _N {
  static const f4s = 369.99, d4 = 293.66, a4 = 440.0, d5 = 587.33, e5 = 659.25;
  static const f5s = 739.99, a5 = 880.0, b5 = 987.77, d6 = 1174.66;
}

const List<double> kTickSteps = [_N.d5, _N.e5, _N.f5s, _N.a5, _N.b5, _N.d6];

/// نغمة واحدة: ارتفاع ≥5ms ثم خفوت أسّي.
class SynthVoice {
  const SynthVoice(
    this.f,
    this.t, {
    this.a = 0.008,
    this.d = 0.18,
    this.g = 0.1,
    this.triangle = false,
    this.lp,
    this.bell = false,
    this.oct = false,
  });
  final double f;
  final double t;
  final double a;
  final double d;
  final double g;
  final bool triangle;
  final double? lp;
  final bool bell;
  final bool oct;
}

/// أولوية الأصوات: الاحتفالات > الإنجاز > الأصوات الصغيرة.
const Map<String, int> kSoundTier = {
  'perfect': 3,
  'levelup': 3,
  'badge': 3,
  'record': 3,
  'focusEnd': 3,
  'complete': 2,
  'welcome': 2,
  'focusStart': 2,
  'right': 1,
  'tick': 1,
  'coin': 1,
  'flip': 1,
  'softNo': 1,
  'gameEnd': 1,
};

/// وصفات الأحداث (مطابقة لـ R في sound.js).
List<SynthVoice> soundRecipe(String id, {int combo = 0}) {
  switch (id) {
    case 'complete':
      return const [SynthVoice(_N.a5, 0, d: 0.18, g: 0.14), SynthVoice(_N.d6, 0.07, d: 0.18, g: 0.14)];
    case 'coin':
      return const [SynthVoice(_N.b5, 0, triangle: true, a: 0.006, d: 0.09, g: 0.06)];
    case 'perfect':
      return [
        for (final (i, f) in const [_N.d5, _N.f5s, _N.a5, _N.d6].indexed)
          SynthVoice(f, i * 0.09, triangle: true, d: 0.3, g: 0.1),
        for (final f in const [_N.d5, _N.f5s, _N.a5]) SynthVoice(f, 0.4, a: 0.01, d: 0.9, g: 0.08, bell: true),
      ];
    case 'levelup':
      const notes = [_N.d5, _N.e5, _N.f5s, _N.a5, _N.b5, _N.d6];
      return [
        for (final (i, f) in notes.indexed)
          SynthVoice(f, i * 0.07, d: i == notes.length - 1 ? 1.2 : 0.2, g: 0.13, oct: true),
      ];
    case 'badge':
      return const [
        SynthVoice(_N.f5s, 0, d: 0.25, g: 0.12),
        SynthVoice(_N.a5, 0, d: 0.25, g: 0.12),
        SynthVoice(_N.d6, 0.18, d: 0.9, g: 0.12, bell: true),
      ];
    case 'focusStart':
      return const [SynthVoice(_N.d4, 0, a: 0.03, d: 0.7, g: 0.1), SynthVoice(_N.a4, 0, a: 0.03, d: 0.7, g: 0.05)];
    case 'focusEnd':
      return [
        for (final (i, f) in const [_N.d5, _N.f5s, _N.a5, _N.d6].indexed)
          SynthVoice(f, i * 0.18, d: 1.2, g: 0.16, bell: true),
      ];
    case 'right':
      return const [SynthVoice(_N.f5s, 0, d: 0.12, g: 0.08), SynthVoice(_N.a5, 0.06, d: 0.12, g: 0.08)];
    case 'softNo':
      return const [
        SynthVoice(_N.a4, 0, d: 0.11, g: 0.05, lp: 1200),
        SynthVoice(_N.f4s, 0.11, d: 0.11, g: 0.05, lp: 1200),
      ];
    case 'tick':
      return [SynthVoice(kTickSteps[combo.clamp(0, kTickSteps.length - 1)], 0, d: 0.07, g: 0.06)];
    case 'flip':
      return const [SynthVoice(_N.e5, 0, d: 0.04, g: 0.035)];
    case 'record':
      return [
        for (final (i, f) in const [_N.d5, _N.e5, _N.f5s, _N.a5].indexed)
          SynthVoice(f, i * 0.07, d: i == 3 ? 0.8 : 0.2, g: 0.13, oct: true),
      ];
    case 'gameEnd':
      return const [SynthVoice(_N.f5s, 0, d: 0.4, g: 0.07), SynthVoice(_N.a5, 0, d: 0.4, g: 0.07)];
    case 'welcome':
      return const [SynthVoice(_N.d5, 0, a: 0.08, d: 0.6, g: 0.07), SynthVoice(_N.a5, 0, a: 0.08, d: 0.6, g: 0.07)];
  }
  return const [];
}

/// يوسّع الجرس (bell) والأوكتاف (oct) إلى نغمات إضافية مثل voice() في الويب.
List<SynthVoice> _expand(List<SynthVoice> vs) {
  final out = <SynthVoice>[];
  for (final v in vs) {
    out.add(v);
    if (v.bell) out.add(SynthVoice(v.f * 2.76, v.t, a: v.a, d: v.d / 2, g: v.g * 0.12));
    if (v.oct) out.add(SynthVoice(v.f / 2, v.t, triangle: true, a: v.a, d: v.d, g: v.g * 0.3));
  }
  return out;
}

const int kSampleRate = 22050;

/// يرسم الموجة كعينات [-1, 1].
Float64List renderVoices(List<SynthVoice> voices0, {int sampleRate = kSampleRate}) {
  final voices = _expand(voices0);
  if (voices.isEmpty) return Float64List(0);
  var dur = 0.0;
  for (final v in voices) {
    dur = math.max(dur, v.t + math.max(0.005, v.a) + v.d + 0.03);
  }
  final n = (dur * sampleRate).ceil();
  final mix = Float64List(n);
  for (final v in voices) {
    final a = math.max(0.005, v.a);
    final start = (v.t * sampleRate).round();
    final len = ((a + v.d + 0.03) * sampleRate).ceil();
    final w = 2 * math.pi * v.f / sampleRate;
    final lpA = v.lp == null ? 1.0 : 1 - math.exp(-2 * math.pi * v.lp! / sampleRate);
    var y = 0.0;
    for (var i = 0; i < len && start + i < n; i++) {
      final time = i / sampleRate;
      double env;
      if (time < a) {
        env = 0.0001 + (v.g - 0.0001) * (time / a);
      } else if (time < a + v.d) {
        env = v.g * math.pow(0.0001 / v.g, (time - a) / v.d);
      } else {
        env = 0;
      }
      final ph = w * i;
      final x = v.triangle ? (2 / math.pi) * math.asin(math.sin(ph)) : math.sin(ph);
      y += lpA * (x - y);
      mix[start + i] += y * env;
    }
  }
  // المرشّح الرئيسي (4500Hz) + ضغط ناعم بدل الـ compressor
  final mA = 1 - math.exp(-2 * math.pi * 4500 / sampleRate);
  var m = 0.0;
  for (var i = 0; i < n; i++) {
    m += mA * (mix[i] - m);
    mix[i] = _tanh(m * 2.4);
  }
  return mix;
}

double _tanh(double x) {
  final e = math.exp(2 * x);
  return (e - 1) / (e + 1);
}

/// ضجيج بنّي ناعم كصوت المطر البعيد (خلفية التركيز) — ثانيتان قابلتان للتكرار.
Float64List renderAmbient({int sampleRate = kSampleRate, int seed = 7}) {
  final r = math.Random(seed);
  final n = sampleRate * 2;
  final out = Float64List(n);
  var last = 0.0;
  final lpA = 1 - math.exp(-2 * math.pi * 700 / sampleRate);
  var y = 0.0;
  for (var i = 0; i < n; i++) {
    final w = r.nextDouble() * 2 - 1;
    last = (last + 0.02 * w) / 1.02;
    y += lpA * (last * 3.5 - y);
    out[i] = y * 0.35;
  }
  // تلاشٍ قصير عند الطرفين لتجنّب الطقطقة عند التكرار
  const fade = 400;
  for (var i = 0; i < fade; i++) {
    final k = i / fade;
    out[i] *= k;
    out[n - 1 - i] *= k;
  }
  return out;
}

/// ملف WAV أحادي 16-بت.
Uint8List encodeWav(Float64List samples, {int sampleRate = kSampleRate}) {
  final dataLen = samples.length * 2;
  final b = ByteData(44 + dataLen);
  void str(int o, String s) {
    for (var i = 0; i < s.length; i++) {
      b.setUint8(o + i, s.codeUnitAt(i));
    }
  }

  str(0, 'RIFF');
  b.setUint32(4, 36 + dataLen, Endian.little);
  str(8, 'WAVE');
  str(12, 'fmt ');
  b.setUint32(16, 16, Endian.little);
  b.setUint16(20, 1, Endian.little); // PCM
  b.setUint16(22, 1, Endian.little); // mono
  b.setUint32(24, sampleRate, Endian.little);
  b.setUint32(28, sampleRate * 2, Endian.little);
  b.setUint16(32, 2, Endian.little);
  b.setUint16(34, 16, Endian.little);
  str(36, 'data');
  b.setUint32(40, dataLen, Endian.little);
  for (var i = 0; i < samples.length; i++) {
    final v = (samples[i].clamp(-1.0, 1.0) * 32767).round();
    b.setInt16(44 + i * 2, v, Endian.little);
  }
  return b.buffer.asUint8List();
}
