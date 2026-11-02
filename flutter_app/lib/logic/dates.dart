/// أدوات التاريخ بنفس دلالات نسخة الويب (مفاتيح YYYY-MM-DD بالتوقيت المحلي).
library;

String _two(int n) => n.toString().padLeft(2, '0');

/// مفتاح اليوم المحلي "YYYY-MM-DD".
String dateKey(DateTime d) => '${d.year}-${_two(d.month)}-${_two(d.day)}';

/// يضيف [n] يوماً تقويمياً مع الحفاظ على الساعة المحلية (مثل setDate في JS).
DateTime addDays(DateTime d, int n) => DateTime(d.year, d.month, d.day + n, d.hour, d.minute, d.second, d.millisecond);

/// يحوّل المفتاح إلى منتصف نهار ذلك اليوم محلياً.
DateTime parseKey(String key) {
  final p = key.split('-');
  return DateTime(int.parse(p[0]), int.parse(p[1]), int.parse(p[2]), 12);
}

/// رقم اليوم منذ 1970 (مستقل عن المنطقة الزمنية، يطابق dayNumber في الويب).
int dayNumber(String key) {
  final p = key.split('-');
  return DateTime.utc(int.parse(p[0]), int.parse(p[1]), int.parse(p[2])).millisecondsSinceEpoch ~/ 86400000;
}

/// يوم الأسبوع بترقيم JS: 0 = الأحد … 6 = السبت.
int jsDay(DateTime d) => d.weekday % 7;

/// بداية الأسبوع (السبت).
DateTime weekStart(DateTime d) => addDays(d, -((jsDay(d) + 1) % 7));
