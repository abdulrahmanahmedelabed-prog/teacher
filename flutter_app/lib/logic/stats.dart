/// الإحصاءات: السلسلة المتسامحة، العودة بعد انقطاع، الحِمل، المرحلة.
library;

import 'dart:math' as math;

import '../data/app_text.dart';
import '../data/content.dart';
import '../models/app_data.dart';
import '../models/content_models.dart';
import 'dates.dart';

class Stats {
  const Stats({
    required this.streak,
    required this.bestStreak,
    required this.freezes,
    required this.activeDays,
    required this.stage,
    required this.stageObj,
    required this.totalChallenges,
    required this.gapDays,
    required this.reentry,
    required this.struggling,
    required this.weekDays,
  });

  final int streak;
  final int bestStreak;

  /// «أيام السماح» 🧊 المتاحة الآن (بحد أقصى 2).
  final int freezes;
  final int activeDays;

  /// رقم المرحلة 1..5.
  final int stage;
  final Stage stageObj;
  final int totalChallenges;
  final int gapDays;
  final bool reentry;
  final bool struggling;
  final int weekDays;
}

Stats computeStats(AppData s, DateTime now) {
  final keys = s.history.keys.where(s.isActive).toList()..sort();
  final tKey = dateKey(now), tNum = dayNumber(tKey);
  final set = keys.toSet();

  // سلسلة متسامحة: كل 7 أيام دراسة تمنحك «يوم سماح» 🧊 (بحد أقصى 2) يغطّي يوم غياب تلقائياً
  var run = 0, best = 0, freezes = 0, count = 0;
  if (keys.isNotEmpty) {
    var d = parseKey(keys.first);
    for (;;) {
      final k = dateKey(d);
      if (k.compareTo(tKey) > 0) break;
      if (set.contains(k)) {
        run++;
        count++;
        if (count % 7 == 0) freezes = math.min(2, freezes + 1);
      } else if (k != tKey) {
        if (freezes > 0) {
          freezes--;
        } else {
          run = 0;
        }
      }
      best = math.max(best, run);
      d = addDays(d, 1);
    }
  }

  // العودة بعد انقطاع
  final prevKeys = keys.where((k) => k.compareTo(tKey) < 0).toList();
  final gapDays = prevKeys.isEmpty ? 0 : tNum - dayNumber(prevKeys.last);
  var bigGapIdx = -1;
  for (var i = 1; i < keys.length; i++) {
    if (dayNumber(keys[i]) - dayNumber(keys[i - 1]) >= 5) bigGapIdx = i;
  }
  final reentry = (!set.contains(tKey) && gapDays >= 5) || (bigGapIdx >= 0 && keys.length - bigGapIdx <= 3);

  // الحِمل أكبر من طاقته؟ (أنجز أقل من نصف التحديات في آخر 7 أيام)
  var given = 0, done = 0;
  for (var i = 1; i <= 7; i++) {
    final h = s.history[dateKey(addDays(now, -i))];
    if (h != null && (h.given ?? 0) > 0) {
      given += h.given!;
      done += math.min(h.ch, h.given!);
    }
  }
  final struggling = given >= 6 && done / given < 0.5;

  final ws = weekStart(now);
  var weekDays = 0;
  for (var i = 0; i < 7; i++) {
    if (set.contains(dateKey(addDays(ws, i)))) weekDays++;
  }

  final activeDays = keys.length;
  var stageIdx = 0;
  for (var i = 0; i < kStages.length; i++) {
    if (activeDays >= kStages[i].minDays) stageIdx = i;
  }
  final total = s.history.values.fold<int>(0, (a, h) => a + h.ch);
  return Stats(
    streak: run,
    bestStreak: best,
    freezes: freezes,
    activeDays: activeDays,
    stage: stageIdx + 1,
    stageObj: kStages[stageIdx],
    totalChallenges: total,
    gapDays: gapDays,
    reentry: reentry,
    struggling: struggling,
    weekDays: weekDays,
  );
}

/// الصف الحالي (للملفات القديمة: تقدير من المرحلة).
int studentClass(AppData s) {
  final p = s.profile;
  if (p == null) return 10;
  return p.cls ?? kGradeDefaultClass[p.grade] ?? 10;
}

/// عدد الأيام المتتالية (حتى اليوم) بمزاج متعب أو قلق.
int lowStreak(AppData s, DateTime now) {
  var n = 0;
  for (var i = 0; i < 7; i++) {
    final h = s.history[dateKey(addDays(now, -i))];
    if (h != null && h.mood != null && kLowMoods.contains(h.mood)) {
      n++;
    } else if (i > 0 || (h != null && h.mood != null)) {
      break;
    }
  }
  return n;
}

List<StudyCard> dueCards(AppData s, DateTime now) {
  final t = dateKey(now);
  return s.cards.where((c) => c.due.compareTo(t) <= 0).toList();
}

class WeeklyChallenge {
  const WeeklyChallenge(this.key, this.text, this.target, this.val, this.claimed);
  final String key;
  final String text;
  final int target;
  final int val;
  final bool claimed;
  bool get ready => val >= target && !claimed;
}

WeeklyChallenge weeklyChallenge(AppData s, DateTime now) {
  final ws = weekStart(now);
  final wkey = dateKey(ws);
  const kinds = [
    ('sessions', 'أنجز 5 جلسات تركيز هذا الأسبوع', 5),
    ('days', 'ادرس 5 أيام من 7 هذا الأسبوع', 5),
    ('ch', 'أنجز 15 تحدياً هذا الأسبوع', 15),
    ('reviews', 'راجع 30 بطاقة هذا الأسبوع', 30),
  ];
  final w = kinds[dayNumber(wkey) % kinds.length];
  var val = 0;
  for (var i = 0; i < 7; i++) {
    final h = s.history[dateKey(addDays(ws, i))];
    if (h == null) continue;
    switch (w.$1) {
      case 'sessions':
        val += h.sessions;
      case 'days':
        val += h.active ? 1 : 0;
      case 'ch':
        val += h.ch;
      case 'reviews':
        val += h.reviews;
    }
  }
  return WeeklyChallenge(wkey, w.$2, w.$3, math.min(val, w.$3), s.weeklyClaimed[wkey] == true);
}
