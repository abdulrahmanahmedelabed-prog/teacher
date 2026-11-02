/// التكرار المتباعد (نظام لايتنر).
library;

import '../models/app_data.dart';
import 'dates.dart';

/// أيام الانتظار لكل صندوق (الفهرس = رقم الصندوق).
const List<int> kBoxDays = [0, 1, 2, 4, 8, 16, 30];

/// جلسة مراجعة: طابور، ومن نسيها مرة تعود في آخر الجلسة.
class ReviewSession {
  ReviewSession(this.queue);

  final List<String> queue;
  final List<String> retried = [];
  int done = 0;
  int right = 0;
  int xp = 0;
  bool show = false;

  int get total => done + queue.length;

  /// يقيّم البطاقة الأولى في الطابور ويعدّل صندوقها وموعدها.
  /// يعيد true إذا كانت هذه مراجعة تُحسب لها نقاط (مراجعة صادقة).
  bool grade(StudyCard c, bool ok, DateTime now) {
    if (queue.isNotEmpty && queue.first == c.id) queue.removeAt(0);
    show = false;
    if (ok && retried.contains(c.id)) {
      // نسيتها ثم تذكرتها في نفس الجلسة: تبقى في الصندوق 1 وتعود غداً
      return false;
    } else if (ok) {
      c.box = (c.box + 1).clamp(1, 6);
      c.due = dateKey(addDays(now, kBoxDays[c.box]));
      right++;
      done++;
      return true;
    } else {
      c.box = 1;
      c.due = dateKey(addDays(now, 1));
      if (!retried.contains(c.id)) {
        done++;
        retried.add(c.id);
        queue.add(c.id);
        return true;
      }
      return false;
    }
  }
}
