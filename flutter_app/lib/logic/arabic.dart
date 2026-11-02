/// تمييز العدد وصيغ المخاطبة بالعربية.
library;

import 'dates.dart';

/// 1 يوم واحد، 2 يومين، 3-10 أيام، 11+ يوماً.
String arDays(int n) => n == 1
    ? 'يوم واحد'
    : n == 2
    ? 'يومين'
    : '$n ${n <= 10 ? 'أيام' : 'يوماً'}';

String arMins(int n) => n == 1
    ? 'دقيقة واحدة'
    : n == 2
    ? 'دقيقتين'
    : '$n ${n <= 10 ? 'دقائق' : 'دقيقة'}';

/// تمييز العدد: 3-10 جمع، وغير ذلك مفرد.
String arCount(int n, String few, String many) => (n >= 3 && n <= 10) ? few : many;

/// العدد مع تمييزه.
String arCount2(int n, String few, String many) => '$n ${arCount(n, few, many)}';

/// تاريخ نسبي لمراجعة البطاقة.
String relDay(String key, String today) {
  final d = dayNumber(key) - dayNumber(today);
  if (d <= 0) return 'اليوم';
  if (d == 1) return 'غداً';
  if (d == 2) return 'بعد يومين';
  return 'بعد $d${d <= 10 ? ' أيام' : ' يوماً'}';
}

/// صيغة المخاطبة للأنثى (مثل gtext في الويب).
String gtext(String t, String? g) {
  if (g != 'f') return t;
  return t
      .replaceAll('يا صديقي', 'يا صديقتي')
      .replaceAll('مستعداً', 'مستعدة')
      .replaceAll('عُد متى', 'عودي متى')
      .replaceAll('ابدأ ', 'ابدئي ')
      .replaceAll('تظن', 'تظنين')
      .replaceAll('أنت على', 'أنتِ على')
      .replaceAll('حين تجد ', 'حين تجدين ')
      .replaceAll('متى عدت', 'متى عدتِ')
      .replaceAll('حين تريد', 'حين تريدين')
      .replaceAll('سمح وقتك', 'سمح وقتكِ');
}

/// mm:ss
String fmtClock(double sec) {
  final s = sec <= 0 ? 0 : sec.ceil();
  return '${(s ~/ 60).toString().padLeft(2, '0')}:${(s % 60).toString().padLeft(2, '0')}';
}
