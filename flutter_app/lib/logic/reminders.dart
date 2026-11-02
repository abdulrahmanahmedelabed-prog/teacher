/// خطة الإشعارات (مثل planNotifications في الويب).
/// تُعاد في كل فتح للتطبيق، فأي فتح يصفّر سلسلة «اشتقنا لك».
library;

import '../data/app_text.dart';
import '../data/content.dart';
import '../models/app_data.dart';
import 'arabic.dart';
import 'dates.dart';
import 'stats.dart';

const List<int> kMissOffsets = [2, 4, 7, 14, 30];
const List<int> kMissReduced = [2, 7, 30];

/// معرّفات الإشعارات: 7001 نهاية الجلسة، 7100–7299 التذكيرات.
const int kFocusNotifId = 7001;
const int kReminderIdMin = 7100;
const int kReminderIdMax = 7299;

class PlannedNotification {
  const PlannedNotification(this.id, this.at, this.title, this.body, this.kind);
  final int id;
  final DateTime at;
  final String title;
  final String body;

  /// remind | miss
  final String kind;
}

String remindTime(AppData s) =>
    s.reminders.time.isNotEmpty ? s.reminders.time : (kWhenTime[s.profile?.when] ?? '17:00');

String whenLabel(AppData s) {
  final w = s.profile?.when ?? '';
  return w.isNotEmpty ? w : remindTime(s);
}

/// لا إشعارات بين 21:30 و07:00.
DateTime clampQuiet(DateTime d) {
  final m = d.hour * 60 + d.minute;
  if (m > 21 * 60 + 30) return DateTime(d.year, d.month, d.day, 21, 30);
  if (m < 7 * 60) return DateTime(d.year, d.month, d.day, 7, 0);
  return d;
}

DateTime slotOn(AppData s, DateTime now, int dayOffset, int lead) {
  final parts = remindTime(s).split(':');
  final h = int.parse(parts[0]), mi = int.parse(parts[1]);
  final d = DateTime(now.year, now.month, now.day + dayOffset, h, mi - lead);
  return clampQuiet(d);
}

(String, String) reminderCopy(AppData s, DateTime now, int dayOffset) {
  final st = computeStats(s, now);
  final cls = studentClass(s);
  final due = dueCards(s, now).length;
  final next = st.stage < kStages.length ? kStages[st.stage] : null;
  final toStage = next != null ? next.minDays - st.activeDays : 99;
  final rec = s.history[dateKey(now)];
  final lowToday =
      (rec?.rest ?? false) || (rec?.mood != null && kLowMoods.contains(rec!.mood)) || lowStreak(s, now) >= 3;
  if (lowToday && dayOffset >= 1) {
    return ('💜 يوم جديد', 'كيف حالك اليوم؟ ابدأ بما تستطيع، ولو بنَفَس عميق وصفحة واحدة.');
  }
  if (cls <= 4) return ('🐣 وقت المرح', 'لعبة أرقام صغيرة ثم صفحة واحدة… خمس دقائق ممتعة!');
  if (due >= 3) {
    return ('🗂️ بطاقاتك جاهزة', '${arCount2(due, 'بطاقات', 'بطاقة')} تنتظر المراجعة، دقيقتان فقط لتثبيتها.');
  }
  if (s.bookChats.values.any((c) => c.isNotEmpty) && dayNumber(dateKey(now)) % 3 == 0) {
    return ('📖 نكمل القراءة؟', 'الكتاب الذي بدأته ينتظرك عند آخر صفحة وصلت إليها.');
  }
  if (next != null && toStage > 0 && toStage <= 3) {
    return ('🌟 اقتربت من «${next.name}»', 'باقي ${arDays(toStage)} دراسة فقط. جلسة قصيرة اليوم تقرّبك أكثر.');
  }
  if (st.freezes > 0 && dayOffset >= 1) {
    return ('🧊 يوم السماح معك', 'سلسلتك محفوظة. وإن سمح وقتك، خطوة صغيرة اليوم تكفي.');
  }
  return (dayNumber(dateKey(now)) + dayOffset) % 2 != 0
      ? ('⏰ قرب موعدك', 'بعد قليل وقت دراستك ${whenLabel(s)}. خمس دقائق تكفي للبداية 🌱')
      : ('رحلة العودة', 'تحدّي اليوم صغير وجاهز، والبداية أسهل مما تظن ✨');
}

(String, String) missCopy(AppData s, DateTime now, int off) {
  final st = computeStats(s, now);
  final next = st.stage < kStages.length ? kStages[st.stage] : null;
  final toStage = next != null ? next.minDays - st.activeDays : 99;
  if (off == 2) {
    if (st.freezes > 0) return ('🧊 يوم سماح لك', 'سلسلتك محفوظة بيوم سماح. عُد متى استطعت، نحن بانتظارك.');
    if (next != null && toStage <= 3) {
      return ('باقي القليل 🌟', 'أنت على بُعد ${arDays(toStage)} من «${next.name}». نكمل بخطوة صغيرة؟');
    }
    return ('وينك يا صديقي؟ 🌿', 'مكانك محفوظ وتقدّمك كله باقٍ. خمس دقائق تكفي لنكمل معاً.');
  }
  if (off == 4) return ('نفكّر فيك 💜', 'نعرف أن بعض الأيام ثقيلة. حين تجد لحظة هدوء، نحن هنا.');
  if (off == 7) return ('خطوة واحدة فقط', 'لا حاجة لتعويض ما فات. نبدأ من جديد بخطوة صغيرة، كأول يوم ✨');
  if (off == 14) return ('رحلتك بانتظارك', 'كل تقدّمك محفوظ، وسنبدأ معك بهدوء متى عدت 🌱');
  return ('سنبقى هنا 💜', 'لن نُكثر عليك التذكير. حين تريد العودة، افتح التطبيق وستجدنا.');
}

/// الخطة الكاملة للإشعارات القادمة.
List<PlannedNotification> planNotifications(AppData s, DateTime now) {
  final r = s.reminders;
  final p = s.profile;
  if (!r.on || p == null) return const [];
  final plan = <PlannedNotification>[];
  final nowMs = now.millisecondsSinceEpoch;
  bool paused(DateTime d) => r.pausedUntil.isNotEmpty && dateKey(d).compareTo(r.pausedUntil) <= 0;
  bool allowed(DateTime d) => r.days.contains(jsDay(d)) && !paused(d);
  String named(String t) => r.showName && !r.shared ? '${p.name}، $t' : t;
  void push(int id, DateTime at, (String, String) copy, String kind) {
    if (at.millisecondsSinceEpoch > nowMs + 60000) {
      plan.add(PlannedNotification(id, at, named(gtext(copy.$1, p.g)), gtext(copy.$2, p.g), kind));
    }
  }

  final today = dateKey(now);
  final activeToday = s.isActive(today);
  final t0 = slotOn(s, now, 0, r.lead);
  if (!activeToday && allowed(t0)) push(7100, t0, reminderCopy(s, now, 0), 'remind');
  final t1 = slotOn(s, now, 1, r.lead);
  if (allowed(t1)) {
    push(
      7101,
      t1,
      activeToday ? reminderCopy(s, now, 1) : ('رحلة العودة', 'اشتقنا لك! تحدّي اليوم صغير وجاهز متى كنت مستعداً 🌱'),
      'remind',
    );
  }
  if (r.miss) {
    final safety = lowStreak(s, now) >= 3; // أيام صعبة: لا رسائل اشتياق لأسبوع
    final offs = (r.reduced || s.notif.pauses >= 2 || s.notif.ignored >= 3) ? kMissReduced : kMissOffsets;
    for (final off in offs) {
      if (safety && off <= 7) continue;
      var d = slotOn(s, now, off, 0);
      var k = 0;
      while (!allowed(d) && k < 7) {
        k++;
        d = slotOn(s, now, off + k, 0);
      }
      if (allowed(d)) push(7100 + off, d, missCopy(s, now, off), 'miss');
    }
  }
  return plan;
}
