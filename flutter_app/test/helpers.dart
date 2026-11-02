import 'package:rehla_flutter/logic/dates.dart';
import 'package:rehla_flutter/models/app_data.dart';

/// الوقت الثابت للاختبارات: الاثنين 2 نوفمبر 2026، 10:00 صباحاً (محلي).
final DateTime kNow = DateTime(2026, 11, 2, 10);

/// نفس الحالة الأساسية في tool/gen_web_golden.js.
AppData baseState() {
  return AppData.fromJson({
    'xp': 0,
    'settings': <String, dynamic>{},
    'profile': {
      'name': 'سارة',
      'grade': 'إعدادي',
      'cls': 8,
      'subjects': ['الرياضيات', 'العلوم', 'اللغة العربية'],
      'minutes': 45,
      'goal': '',
      'when': 'بعد العصر',
      'lastLesson': <String, dynamic>{},
    },
    'assess': [
      {
        'date': '2026-10-01',
        'away': 2,
        'levels': {'الرياضيات': 4, 'العلوم': 2, 'اللغة العربية': 3},
      },
    ],
    'reminders': {
      'on': true,
      'time': '',
      'lead': 10,
      'days': [0, 1, 2, 3, 4, 6],
      'miss': true,
      'showName': true,
      'shared': false,
      'pausedUntil': '',
    },
  }, today: dateKey(kNow));
}

/// [n] يوماً تنتهي في [endKey] (مع استثناء [skip]).
List<String> daysBack(String endKey, int n, [List<String> skip = const []]) {
  final end = parseKey(endKey);
  return [
    for (var i = 0; i < n; i++)
      if (!skip.contains(dateKey(addDays(end, -i)))) dateKey(addDays(end, -i)),
  ];
}

void addActive(AppData s, List<String> keys) {
  for (final k in keys) {
    final r = s.dayRec(k);
    r.active = true;
    if (r.ch == 0) r.ch = 1;
  }
}
