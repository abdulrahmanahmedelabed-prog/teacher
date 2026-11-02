import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import '../models/app_data.dart';
import 'sound_synth.dart';

/// صوت + اهتزاز (كلاهما اختياري، والمعلومة دائماً مرئية أيضاً).
class SoundService {
  SoundService(this._settings);

  final Settings Function() _settings;
  final Map<String, Uint8List> _cache = {};
  final List<AudioPlayer> _pool = [];
  int _next = 0;
  AudioPlayer? _ambient;
  final Map<String, int> _last = {};
  int _lastHighTier = 0;
  int _lastHighAt = 0;
  bool reducedMotion = false;

  static const Map<String, int> _gap = {'tick': 120, 'coin': 1000};

  /// أنماط الاهتزاز (بالمللي ثانية) من نسخة الويب.
  static const Map<String, List<int>> _haptic = {
    'complete': [15],
    'perfect': [20, 40, 20, 40, 60],
    'levelup': [30, 50, 30, 50, 80],
    'badge': [20, 60, 40],
    'focusStart': [20],
    'focusEnd': [120, 80, 120],
    'right': [10],
    'softNo': [30],
    'record': [20, 40, 60],
  };

  static bool quietNow([DateTime? now]) {
    final h = (now ?? DateTime.now()).hour;
    return h >= 22 || h < 7;
  }

  double get _gain {
    final p = _settings();
    if (!p.sound) return 0;
    return p.volume * (p.quiet && quietNow() ? 0.35 : 1);
  }

  Future<void> init() async {
    try {
      final ctx = AudioContext(
        android: const AudioContextAndroid(
          contentType: AndroidContentType.sonification,
          usageType: AndroidUsageType.assistanceSonification,
          audioFocus: AndroidAudioFocus.none,
        ),
      );
      await AudioPlayer.global.setAudioContext(ctx);
      for (var i = 0; i < 3; i++) {
        final p = AudioPlayer();
        await p.setReleaseMode(ReleaseMode.stop);
        _pool.add(p);
      }
    } catch (e) {
      debugPrint('sound init failed: $e');
    }
  }

  Uint8List _wav(String id, int combo) {
    final key = id == 'tick' ? 'tick$combo' : id;
    return _cache.putIfAbsent(key, () => encodeWav(renderVoices(soundRecipe(id, combo: combo))));
  }

  /// يعزف الحدث ويهتزّ إن كان مفعّلاً.
  void fx(String id, {int combo = 0}) {
    play(id, combo: combo);
    final h = _haptic[id];
    if (h != null) buzz(h);
  }

  void play(String id, {int combo = 0}) {
    final g = _gain;
    if (g <= 0 || _pool.isEmpty) return;
    final now = DateTime.now().millisecondsSinceEpoch;
    final tier = kSoundTier[id] ?? 1;
    if (now - (_last[id] ?? 0) < (_gap[id] ?? 80)) return;
    // صوت أقل أولوية بعد صوت أعلى بأقل من 400ms: نتجاهله
    if (tier < _lastHighTier && now - _lastHighAt < 400) return;
    _last[id] = now;
    if (tier >= _lastHighTier || now - _lastHighAt >= 400) {
      _lastHighTier = tier;
      _lastHighAt = now;
    }
    final bytes = _wav(id, combo);
    if (bytes.length <= 44) return;
    final p = _pool[_next++ % _pool.length];
    () async {
      try {
        await p.stop();
        await p.play(BytesSource(bytes, mimeType: 'audio/wav'), volume: g);
      } catch (e) {
        debugPrint('sound play failed: $e');
      }
    }();
  }

  /// اهتزاز خفيف؛ مع «تقليل الحركة» أو الساعات الهادئة نكتفي بلمسة قصيرة.
  void buzz(List<int> pattern) {
    final s = _settings();
    if (!s.haptics) return;
    final total = pattern.fold<int>(0, (a, b) => a + b);
    if ((reducedMotion && total > 40) || (s.quiet && quietNow())) {
      HapticFeedback.selectionClick();
      return;
    }
    if (total <= 15) {
      HapticFeedback.lightImpact();
    } else if (total <= 60) {
      HapticFeedback.mediumImpact();
    } else {
      HapticFeedback.heavyImpact();
      if (pattern.length > 1) {
        Future.delayed(Duration(milliseconds: pattern[0] + pattern[1]), HapticFeedback.mediumImpact);
      }
    }
  }

  Future<void> startAmbient() async {
    final p = _settings();
    if (!p.sound || !p.ambient || (p.quiet && quietNow()) || _ambient != null) return;
    try {
      final bytes = _cache.putIfAbsent('ambient', () => encodeWav(renderAmbient()));
      final a = AudioPlayer();
      _ambient = a;
      await a.setReleaseMode(ReleaseMode.loop);
      await a.play(BytesSource(bytes, mimeType: 'audio/wav'), volume: 0.5 * p.volume);
    } catch (e) {
      debugPrint('ambient failed: $e');
    }
  }

  Future<void> stopAmbient() async {
    final a = _ambient;
    _ambient = null;
    if (a == null) return;
    try {
      await a.stop();
      await a.dispose();
    } catch (_) {}
  }
}
