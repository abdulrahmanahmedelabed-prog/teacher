/// نصوص وقوائم الواجهة (منقولة من app.js).
library;

const List<String> kGrades = ['ابتدائي', 'إعدادي', 'ثانوي', 'توجيهي / ثانوية عامة', 'جامعة'];

class GradeInfo {
  const GradeInfo(this.label, this.range, this.classes);
  final String label;
  final String range;
  final List<int> classes;
}

const Map<String, GradeInfo> kGradeInfo = {
  'ابتدائي': GradeInfo('ابتدائي', '(الصف 1 – 6)', [1, 2, 3, 4, 5, 6]),
  'إعدادي': GradeInfo('إعدادي', '(الصف 7 – 9)', [7, 8, 9]),
  'ثانوي': GradeInfo('ثانوي', '(الصف 10 – 11)', [10, 11]),
  'توجيهي / ثانوية عامة': GradeInfo('توجيهي', '(الصف 12)', [12]),
  'جامعة': GradeInfo('جامعة', '', [13]),
};

const List<String> kClassNames = [
  '',
  'الأول',
  'الثاني',
  'الثالث',
  'الرابع',
  'الخامس',
  'السادس',
  'السابع',
  'الثامن',
  'التاسع',
  'العاشر',
  'الحادي عشر',
  'الثاني عشر',
  'جامعة',
];

String gradeOfClass(int c) => kGrades.firstWhere((g) => kGradeInfo[g]!.classes.contains(c), orElse: () => kGrades[2]);

String classLabel(int? c) => c == 13 ? 'جامعة' : (c != null && c > 0 ? 'الصف ${kClassNames[c]}' : '');

const Map<String, int> kGradeDefaultClass = {
  'ابتدائي': 4,
  'إعدادي': 8,
  'ثانوي': 10,
  'توجيهي / ثانوية عامة': 12,
  'جامعة': 13,
};

const List<String> kWhens = ['بعد الفجر', 'بعد الإفطار', 'بعد العصر', 'بعد المغرب', 'قبل النوم'];

const Map<String, String> kWhenTime = {
  'بعد الفجر': '07:00',
  'بعد الإفطار': '09:00',
  'بعد العصر': '16:00',
  'بعد المغرب': '18:30',
  'قبل النوم': '20:30',
};

class LevelFace {
  const LevelFace(this.e, this.t);
  final String e;
  final String t;
}

const List<LevelFace> kLevels = [
  LevelFace('😟', 'ضعيف جداً'),
  LevelFace('😕', 'ضعيف'),
  LevelFace('😐', 'متوسط'),
  LevelFace('🙂', 'جيد'),
  LevelFace('🤩', 'ممتاز'),
];

const List<String> kAway = ['أقل من شهر', '1-3 أشهر', '3-6 أشهر', '6-12 شهراً', 'أكثر من سنة'];

const List<String> kReflectPrompts = [
  'ما أهم فكرة تعلّمتها اليوم؟',
  'ما الذي صعُب عليك اليوم، وما الذي ستجرّبه غداً بشكل مختلف؟',
  'ما الطريقة التي نفعتك اليوم في الدراسة؟',
  'ما خطوتك الأولى غداً؟ اكتبها بوضوح.',
];

const Map<String, String> kTypeLabel = {
  'warmup': 'إحماء',
  'wellbeing': 'عناية بنفسك',
  'study': 'دراسة',
  'recall': 'استرجاع',
  'creative': 'إبداع',
  'bonus': 'إضافي',
};

const List<String> kFocusLines = [
  'ركّز على هذه الصفحة فقط 📖',
  'كل دقيقة الآن تبني مستقبلك 💪',
  'أنت تقوم بعمل رائع',
  'تنفّس… واستمر 🌿',
  'خطوة صغيرة، أثر كبير',
];

/// بترقيم JS: 0 = الأحد.
const List<String> kDayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

/// شريط الأسبوع يبدأ السبت.
const List<String> kWeekStrip = ['سبت', 'أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'];

const List<String> kFeedbackKinds = ['اقتراح', 'مشكلة', 'أعجبني', 'سؤال'];

const List<String> kLostEmoji = ['🫂', '📚', '📖', '⏳', '🎉'];

const List<int> kFocusDurations = [5, 10, 15, 25, 40];
const List<int> kDailyMinutes = [20, 30, 45, 60, 90, 120];

const int kGameXpCap = 60;
const int kReviewXpCap = 60;
const int kCardXpDaily = 10;
