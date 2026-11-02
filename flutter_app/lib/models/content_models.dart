/// أنواع المحتوى الثابت (المراحل، القوالب، المزاج، الأسئلة…).
library;

class Stage {
  const Stage({
    required this.id,
    required this.icon,
    required this.name,
    required this.minDays,
    required this.ratio,
    required this.desc,
  });

  final int id;
  final String icon;
  final String name;

  /// عدد أيام النشاط اللازمة لدخول المرحلة.
  final int minDays;

  /// نسبة من الوقت اليومي الذي حدده الطالب.
  final double ratio;
  final String desc;
}

/// قالب تحدٍّ: {s} المادة، {m} الدقائق، {n} عدد، {mw}/{nw} تمييز العدد.
/// إذا كان [m] أكبر من 1 فهو عدد دقائق ثابت، وإلا فهو نسبة من الميزانية.
class ChallengeTemplate {
  const ChallengeTemplate(this.t, this.m);
  final String t;
  final double m;
}

class BadgeInfo {
  const BadgeInfo(this.id, this.icon, this.name, this.desc);
  final String id;
  final String icon;
  final String name;
  final String desc;
}

class Mood {
  const Mood(this.e, this.label, this.msg);
  final String e;
  final String label;
  final String msg;
}

class ContactInfo {
  const ContactInfo({
    required this.name,
    required this.role,
    required this.whatsapp,
    required this.instagram,
    required this.facebook,
    required this.email,
  });
  final String name;
  final String role;
  final String whatsapp;
  final String instagram;
  final String facebook;
  final String email;
}

class QuizQuestion {
  const QuizQuestion(this.s, this.q, this.o, this.a, {this.lvl});

  /// المادة.
  final String s;
  final String q;
  final List<String> o;

  /// رقم الإجابة الصحيحة (يبدأ من 0).
  final int a;
  final int? lvl;
}
