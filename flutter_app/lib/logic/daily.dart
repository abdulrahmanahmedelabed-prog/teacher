/// توليد تحديات اليوم (مطابق لـ buildDaily في الويب، بنفس البذرة والترتيب).
library;

import 'dart:math' as math;

import '../data/content.dart';
import '../models/app_data.dart';
import '../models/content_models.dart';
import 'arabic.dart';
import 'dates.dart';
import 'rng.dart';
import 'stats.dart';

/// ترتيب المواد حسب التقييم: في المرحلتين 1-2 نبدأ بالأقوى لنكسب الحماس،
/// ومن المرحلة 3 نعطي المواد الضعيفة وقتاً مضاعفاً.
List<String> subjectPlan(AppData s, int stage) {
  final subs = s.profile!.subjects.isNotEmpty ? s.profile!.subjects : const ['الرياضيات'];
  final lv = s.latestLevels;
  if (lv.isEmpty) return subs;
  final sorted = stableSorted<String>(subs, (a, b) => (lv[b] ?? 3) - (lv[a] ?? 3));
  if (stage <= 2) return sorted.sublist(0, math.max(1, (sorted.length / 2).ceil()));
  final plan = <String>[];
  for (final x in sorted.reversed) {
    plan.add(x);
    if ((lv[x] ?? 3) <= 2) plan.add(x);
  }
  return plan;
}

/// يبني قائمة اليوم. لا يغيّر الحالة: المستدعي يحفظ النتيجة ويضبط `given`.
Daily buildDaily(AppData s, DateTime now, int rerolls) {
  final key = dateKey(now);
  final st = computeStats(s, now);
  final p = s.profile!;
  final r = Mulberry32(hashStr('$key:$rerolls:${p.name}')).call;
  final mood = s.history[key]?.mood;
  final low = mood != null && kLowMoods.contains(mood);

  // الحِمل يتبع حال الطالب لا التقويم فقط
  var ratio = st.stageObj.ratio;
  if (st.reentry) {
    ratio = kStages[0].ratio; // عائد بعد انقطاع: نبدأ بلطف من جديد
  } else if (st.struggling && st.stage > 1) {
    ratio = kStages[st.stage - 2].ratio; // الحمل ثقيل: نخففه مرحلة
  }
  var base = math.max(10, (p.minutes * ratio).round());
  if (low) base = math.max(8, (base * 0.5).round());

  final subs = subjectPlan(s, st.stage);
  final offset = dayNumber(key);
  String subjectAt(int i) => subs[(offset + i) % subs.length];
  final qCount = studentClass(s) <= 3 ? math.min(5, 3 + st.stage) : 3 + st.stage * 2;
  final lessons = p.lastLesson;

  final list = <Challenge>[];
  void make(String type, ChallengeTemplate tpl, String subject, double minutes) {
    final m = math.max(3, minutes.round());
    final text = tpl.t
        .replaceAll('{s}', subject)
        .replaceAll('{m}', '$m')
        .replaceAll('{n}', '$qCount')
        .replaceAll('{mw}', arCount(m, 'دقائق', 'دقيقة'))
        .replaceAll('{nw}', arCount(qCount, 'أسئلة أو مسائل', 'سؤالاً أو مسألة'))
        .replaceAll('{lesson}', lessons[subject] ?? '');
    list.add(
      Challenge(id: '$type${list.length}', type: type, text: text, subject: subject, minutes: m, xp: 10 + m * 2),
    );
  }

  double tplMinutes(ChallengeTemplate t, num budget) => t.m > 1 ? t.m : budget * t.m;

  // يوم قلق: عناية بالنفس + مهمة دراسة صغيرة واحدة فقط
  if (mood == 5) {
    make('wellbeing', pick(kTplWellbeing, r), subjectAt(0), 3);
    make('study', const ChallengeTemplate('اقرأ صفحة واحدة فقط من {s} — بدون ضغط', 5), subjectAt(0), 5);
    return Daily(date: key, rerolls: rerolls, list: list);
  }

  // 1) إحماء أو عناية بالنفس
  final warm = r() < 0.5;
  final warmPool = warm ? kTplWarmup : kTplWellbeing;
  final w = pick(warmPool, r);
  make(warm ? 'warmup' : 'wellbeing', w, subjectAt(0), tplMinutes(w, base));

  // 2) دراسة رئيسية
  final studyTpls = shuffle(kTplStudy, r);
  final l0 = lessons[subjectAt(0)];
  final usePrereq = st.stage >= 3 && l0 != null && l0.isNotEmpty && offset % 2 == 0;
  make('study', usePrereq ? kPrereqTemplate : studyTpls[0], subjectAt(0), base * 0.6);
  if (st.stage >= 2 && !low) make('study', studyTpls[1], subjectAt(1), base * 0.4);

  // 3) استرجاع (يقوّي الذاكرة)
  if (st.stage >= 2) {
    final t = pick(kTplRecall, r);
    make('recall', t, subjectAt(0), tplMinutes(t, base));
  }
  // 4) إبداع ومتعة
  final c = pick(kTplCreative, r);
  make('creative', c, subjectAt(st.stage >= 3 ? 2 : 0), tplMinutes(c, base));

  // 5) تحدٍ إضافي في المزاج العالي
  if (mood == 3 || mood == 4) {
    final t = studyTpls[2];
    make('bonus', ChallengeTemplate('⚡ إضافي: ${t.t}', t.m), subjectAt(1), base * 0.5);
    list.last.xp += 15;
  }
  return Daily(date: key, rerolls: rerolls, list: list);
}
