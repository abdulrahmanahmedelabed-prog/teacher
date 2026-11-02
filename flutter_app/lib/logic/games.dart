/// منطق الألعاب (بدون واجهة).
library;

import 'dart:math' as math;

import '../data/content.dart';
import '../models/content_models.dart';
import 'rng.dart';

class MathQuestion {
  const MathQuestion(this.text, this.ans, this.opts);
  final String text;
  final int ans;
  final List<int> opts;
}

/// سؤال «سباق الأرقام»: الصعوبة تتبع المستوى والرقم القياسي والصف.
MathQuestion mathQuestion({required int level, required int best, required int cls, math.Random? rnd}) {
  final r = rnd ?? math.Random();
  final l = math.max(level, 1 + best ~/ 4);
  var max = 10 + l * 5;
  var ops = l < 3
      ? ['+', '-']
      : l < 5
      ? ['+', '-', '×']
      : ['+', '-', '×', '÷'];
  // الصفوف الصغيرة: أرقام وعمليات تناسب العمر
  if (cls <= 2) {
    ops = ['+', '-'];
    max = math.min(max, 20);
  } else if (cls <= 4) {
    ops = ops.where((o) => o != '÷').toList();
    max = math.min(max, 50);
  }
  final op = ops[r.nextInt(ops.length)];
  int rr(int n) => 1 + r.nextInt(n);
  late int a, b, ans;
  switch (op) {
    case '+':
      a = rr(max);
      b = rr(max);
      ans = a + b;
    case '-':
      a = rr(max);
      b = rr(a);
      ans = a - b;
    case '×':
      a = rr(math.min(12, 3 + l));
      b = rr(12);
      ans = a * b;
    default:
      b = rr(10);
      ans = rr(10);
      a = b * ans;
  }
  final opts = <int>{ans};
  while (opts.length < 4) {
    final d = ans + r.nextInt(11) - 5;
    if (d >= 0 && d != ans) opts.add(d);
  }
  return MathQuestion('$a $op $b', ans, shuffle(opts.toList(), r.nextDouble));
}

class QuizItem {
  QuizItem(this.q, this.order);
  final QuizQuestion q;
  final List<int> order;
}

/// 10 أسئلة تناسب الصف: من مواد الطالب أولاً ثم غيرها.
List<QuizItem> buildQuiz(List<String> subjects, int cls, {math.Random? rnd}) {
  final r = (rnd ?? math.Random()).nextDouble;
  final bank = kQuiz.where(
    (q) =>
        !(cls <= 6 && (q.lvl == 2 || q.s == 'الفيزياء' || q.s == 'الكيمياء')) &&
        !(cls <= 3 && (q.s == 'الأحياء' || q.s == 'الحاسوب' || q.s == 'اللغة الإنجليزية')),
  );
  final mine = shuffle(bank.where((q) => subjects.contains(q.s)).toList(), r);
  final others = shuffle(bank.where((q) => !subjects.contains(q.s)).toList(), r);
  final qs = [...mine, ...others].take(10).map((q) => QuizItem(q, shuffle([0, 1, 2, 3], r))).toList();
  return shuffle(qs, r);
}
