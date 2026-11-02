import 'package:flutter/material.dart';

import '../../../logic/games.dart';
import '../../../state/app_scope.dart';
import '../../../state/app_state.dart';
import '../../../theme/app_theme.dart';
import '../../widgets/common.dart';

/// ❓ تحدي المعلومات: 10 أسئلة من موادك.
class QuizGame extends StatefulWidget {
  const QuizGame({super.key});

  @override
  State<QuizGame> createState() => _QuizGameState();
}

class _QuizGameState extends State<QuizGame> {
  late AppState s;
  List<QuizItem> qs = [];
  int i = 0, score = 0;
  int? picked;
  bool over = false;
  final Set<int> added = {};

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    s = AppScope.read(context);
    if (qs.isEmpty) _start();
  }

  void _start() {
    setState(() {
      qs = buildQuiz(s.profile.subjects, s.studentCls);
      i = 0;
      score = 0;
      picked = null;
      over = false;
      added.clear();
    });
  }

  void _pick(int idx) {
    if (picked != null) return;
    setState(() => picked = idx);
    if (idx == qs[i].q.a) {
      score++;
      s.fx('right');
    } else {
      s.fx('softNo');
    }
  }

  void _next() {
    setState(() {
      i++;
      picked = null;
      if (i >= qs.length) {
        over = true;
        s.quizOver(score);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('❓ تحدي المعلومات')),
      body: PageBody(children: [if (over) _result(context) else _question(context)]),
    );
  }

  Widget _result(BuildContext context) {
    final msg = score >= 9
        ? 'مجهود رائع! 🏆'
        : score >= 7
        ? 'ممتاز جداً! 🌟'
        : score >= 5
        ? 'جيد، استمر! 💪'
        : 'كل محاولة تعلّمك شيئاً جديداً 🌱';
    return SectionCard(
      center: true,
      children: [
        const Emoji('❓', size: 50),
        Text(msg, style: Theme.of(context).textTheme.titleLarge, textAlign: TextAlign.center),
        const Gap(),
        Text('نتيجتك: $score / ${qs.length}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
        const Gap(Spacing.lg),
        FilledButton(onPressed: _start, child: const Text('مرة أخرى')),
        const Gap(Spacing.sm),
        OutlinedButton(onPressed: () => Navigator.pop(context), child: const Text('رجوع')),
      ],
    );
  }

  Widget _question(BuildContext context) {
    final item = qs[i];
    final q = item.q;
    final good = context.rc.good;
    final bad = Theme.of(context).colorScheme.error;
    return SectionCard(
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                q.s,
                style: TextStyle(color: context.rc.primaryText, fontWeight: FontWeight.w700),
              ),
            ),
            Muted('${i + 1} / ${qs.length} · ✔ $score'),
          ],
        ),
        const Gap(6),
        Bar(value: i / qs.length, height: 8),
        const Gap(Spacing.lg),
        Semantics(header: true, child: Text(q.q, style: Theme.of(context).textTheme.titleMedium)),
        const Gap(Spacing.lg),
        for (final idx in item.order)
          Padding(
            padding: const EdgeInsets.only(bottom: Spacing.sm),
            child: Builder(
              builder: (context) {
                final right = picked != null && idx == q.a;
                final wrongPick = picked != null && idx == picked && idx != q.a;
                final mark = right
                    ? '✔ '
                    : wrongPick
                    ? '✖ '
                    : '';
                return OutlinedButton(
                  onPressed: picked == null ? () => _pick(idx) : null,
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(52),
                    alignment: AlignmentDirectional.centerStart,
                    backgroundColor: right
                        ? good
                        : wrongPick
                        ? bad
                        : null,
                    disabledForegroundColor: right || wrongPick ? Colors.white : null,
                    side: BorderSide(
                      color: right
                          ? good
                          : wrongPick
                          ? bad
                          : context.rc.line,
                      width: 1.5,
                    ),
                  ),
                  child: Text('$mark${q.o[idx]}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                );
              },
            ),
          ),
        if (picked != null && picked != q.a) ...[
          Text.rich(
            TextSpan(
              children: [
                const TextSpan(text: '✅ الإجابة الصحيحة: '),
                TextSpan(
                  text: q.o[q.a],
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
              ],
            ),
          ),
          const Gap(6),
          if (added.contains(i))
            const Muted('أضيفت لبطاقاتك ✔')
          else
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: ActionChip(
                label: const Text('➕ أضفها لبطاقاتي للمراجعة'),
                onPressed: () {
                  s.quizToCard(q.s, q.q, q.o[q.a]);
                  setState(() => added.add(i));
                },
              ),
            ),
        ],
        if (picked != null) ...[
          const Gap(),
          FilledButton(onPressed: _next, child: Text(i == qs.length - 1 ? 'النتيجة 🏁' : 'التالي ←')),
        ],
      ],
    );
  }
}
