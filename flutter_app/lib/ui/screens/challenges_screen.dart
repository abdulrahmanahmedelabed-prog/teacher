import 'package:flutter/material.dart';

import '../../data/app_text.dart';
import '../../logic/dates.dart';
import '../../models/app_data.dart';
import '../../state/app_scope.dart';
import '../../state/app_state.dart';
import '../../theme/app_theme.dart';
import '../widgets/common.dart';
import 'books_screen.dart';
import 'games/math_game.dart';
import 'games/memory_game.dart';
import 'games/quiz_game.dart';
import 'home_screen.dart';

class ChallengesScreen extends StatefulWidget {
  const ChallengesScreen({super.key});

  @override
  State<ChallengesScreen> createState() => _ChallengesScreenState();
}

class _ChallengesScreenState extends State<ChallengesScreen> {
  final _reflect = TextEditingController();
  bool _reflectOpen = false;

  @override
  void dispose() {
    _reflect.dispose();
    super.dispose();
  }

  void _push(Widget w) => Navigator.of(context).push(MaterialPageRoute(builder: (_) => w));

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final d = s.daily;
    final list = d.list;
    final todo = list.where((c) => !c.done).toList();
    final done = list.where((c) => c.done).toList();
    final prompt = kReflectPrompts[dayNumber(s.today) % kReflectPrompts.length];
    final rec = s.rec;

    return PageBody(
      children: [
        SectionCard(
          title: '🎯 تحديات اليوم',
          trailing: Dots(total: list.length, done: done.length),
          children: [
            if (todo.isEmpty)
              const Padding(
                padding: EdgeInsets.all(Spacing.md),
                child: Muted('🎉 أنجزت كل تحديات اليوم!', small: false, center: true),
              ),
            for (final c in todo) _ChallengeTile(state: s, c: c),
            if (done.isNotEmpty) ...[
              const Divider(height: Spacing.xl),
              for (final c in done) _ChallengeTile(state: s, c: c),
            ],
            if (d.rerolls < 1 && done.isEmpty)
              TextButton(onPressed: s.reroll, child: const Text('🎲 لا تناسبني؟ غيّرها (مرة يومياً)')),
          ],
        ),
        SectionCard(
          title: '🧠 استراحة ذهنية',
          children: [
            const Muted('لعبة قصيرة بين جلسات الدراسة (حتى $kGameXpCap ⭐ يومياً).'),
            const Gap(),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(onPressed: () => _push(const MathGame()), child: const Text('⚡ أرقام')),
                ),
                const SizedBox(width: Spacing.sm),
                Expanded(
                  child: OutlinedButton(onPressed: () => _push(const QuizGame()), child: const Text('❓ معلومات')),
                ),
                const SizedBox(width: Spacing.sm),
                Expanded(
                  child: OutlinedButton(onPressed: () => _push(const MemoryGame()), child: const Text('🃏 ذاكرة')),
                ),
              ],
            ),
            const Gap(6),
            Muted(
              'أفضل نتائجك: ⚡ ${s.data.best['math'] ?? 0} · ❓ ${s.data.best['quiz'] != null ? '${s.data.best['quiz']} / 10' : '—'}'
              ' · 🃏 ${(s.data.best['memory'] ?? 0) > 0 ? '${s.data.best['memory']} محاولة' : '—'}',
            ),
          ],
        ),
        SectionCard(
          title: '📓 تأمّل اليوم',
          children: [
            if (rec.reflected)
              const Muted('كتبت تأمّل اليوم ✔ — الكتابة تثبّت ما تعلمته.', small: false)
            else ...[
              Muted(prompt),
              const Gap(),
              if (_reflectOpen) ...[
                TextField(
                  controller: _reflect,
                  autofocus: true,
                  maxLength: 600,
                  minLines: 3,
                  maxLines: 6,
                  decoration: InputDecoration(hintText: 'اكتب بحرية…', labelText: prompt),
                ),
                FilledButton(
                  onPressed: () {
                    if (s.reflect(_reflect.text)) {
                      _reflect.clear();
                      setState(() => _reflectOpen = false);
                    }
                  },
                  child: const Text('احفظ (+15 ⭐)'),
                ),
              ] else
                OutlinedButton(
                  onPressed: () => setState(() => _reflectOpen = true),
                  child: const Text('✍️ اكتب تأمّلك (+15 ⭐)'),
                ),
            ],
          ],
        ),
      ],
    );
  }
}

class _ChallengeTile extends StatelessWidget {
  const _ChallengeTile({required this.state, required this.c});
  final AppState state;
  final Challenge c;

  @override
  Widget build(BuildContext context) {
    final good = context.rc.good;
    final hasBook = state.data.books.any((b) => b.subject == c.subject);
    return AnimatedOpacity(
      opacity: c.done ? 0.6 : 1,
      duration: context.reduceMotion ? Duration.zero : const Duration(milliseconds: 250),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: Spacing.sm),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Semantics(
              button: true,
              checked: c.done,
              label: '${c.done ? 'إلغاء الإنجاز: ' : 'إنجاز: '}${c.text}',
              child: InkResponse(
                onTap: () => state.toggleChallenge(c.id),
                radius: 28,
                child: SizedBox(
                  width: 48,
                  height: 48,
                  child: Center(
                    child: AnimatedContainer(
                      duration: context.reduceMotion ? Duration.zero : const Duration(milliseconds: 220),
                      curve: Curves.easeOutBack,
                      width: c.done ? 32 : 30,
                      height: c.done ? 32 : 30,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: c.done ? good : Colors.transparent,
                        border: Border.all(color: c.done ? good : context.rc.muted, width: 2),
                      ),
                      child: c.done ? const Icon(Icons.check, color: Colors.white, size: 20) : null,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: Spacing.sm),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    c.text,
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      height: 1.6,
                      decoration: c.done ? TextDecoration.lineThrough : null,
                    ),
                  ),
                  ChallengeMeta(c: c),
                  if (!c.done)
                    Wrap(
                      spacing: Spacing.sm,
                      children: [
                        if (c.type == 'recall')
                          TextButton(
                            onPressed: () => state.setTab(AppTab.study),
                            child: const Text('🗂️ افتح البطاقات'),
                          ),
                        if ((c.type == 'study' || c.type == 'recall') && hasBook)
                          TextButton(
                            onPressed: () {
                              final b = state.data.books.lastWhere((x) => x.subject == c.subject);
                              Navigator.of(context).push(MaterialPageRoute(builder: (_) => BookScreen(bookId: b.id)));
                            },
                            child: const Text('🤖 اسأل المعلم'),
                          ),
                        if (c.isStudy)
                          TextButton(onPressed: () => startFocusFor(context, c), child: const Text('▶ ابدأ بمؤقت')),
                      ],
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
