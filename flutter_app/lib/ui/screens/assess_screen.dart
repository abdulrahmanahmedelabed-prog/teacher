import 'package:flutter/material.dart';

import '../../data/app_text.dart';
import '../../state/app_scope.dart';
import '../../theme/app_theme.dart';
import '../widgets/common.dart';

/// التقييم الذاتي (أول مرة بعد الاستيراد، أو إعادة التقييم من «رحلتي»).
class AssessScreen extends StatefulWidget {
  const AssessScreen({super.key, this.first = false});
  final bool first;

  @override
  State<AssessScreen> createState() => _AssessScreenState();
}

class _AssessScreenState extends State<AssessScreen> {
  int? away;
  final Map<String, int> levels = {};
  final Map<String, TextEditingController> lessons = {};
  bool _init = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_init) return;
    _init = true;
    final s = AppScope.read(context);
    if (s.data.assess.isNotEmpty) {
      final last = s.data.assess.last;
      away = last.away;
      levels.addAll(last.levels);
    }
    for (final sb in s.profile.subjects) {
      lessons[sb] = TextEditingController(text: s.profile.lastLesson[sb] ?? '');
    }
  }

  @override
  void dispose() {
    for (final c in lessons.values) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final subs = s.profile.subjects;
    final rated = subs.where((x) => levels[x] != null).length;
    final done = rated == subs.length && away != null;
    return Scaffold(
      appBar: widget.first ? null : AppBar(title: const Text('أعد تقييم مستواك')),
      body: SafeArea(
        child: PageBody(
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(Spacing.lg),
                child: Column(
                  children: [
                    const Emoji('🩺', size: 44),
                    Text(
                      widget.first ? 'تقييم سريع لنقطة البداية' : 'أعد تقييم مستواك',
                      style: Theme.of(context).textTheme.titleLarge,
                      textAlign: TextAlign.center,
                    ),
                    const Gap(6),
                    Muted(
                      'ليس امتحاناً ولا توجد إجابة خاطئة! فقط كن صادقاً مع نفسك، لنبني خطتك على مقاسك.${widget.first ? ' (دقيقة واحدة)' : ''}',
                      center: true,
                    ),
                  ],
                ),
              ),
            ),
            SectionCard(
              title: '⏳ كم صار لك بعيد عن الدراسة؟',
              children: [
                Wrap(
                  spacing: Spacing.sm,
                  runSpacing: Spacing.sm,
                  children: [
                    for (var i = 0; i < kAway.length; i++)
                      ChoiceChipX(label: kAway[i], selected: away == i, onTap: () => setState(() => away = i)),
                  ],
                ),
              ],
            ),
            SectionCard(
              title: '📊 كيف تشعر بمستواك في كل مادة الآن؟',
              children: [
                for (final sb in subs) ...[
                  Text(sb, style: const TextStyle(fontWeight: FontWeight.w800)),
                  const Gap(6),
                  Row(
                    children: [
                      for (var i = 0; i < kLevels.length; i++)
                        Expanded(
                          child: Semantics(
                            selected: levels[sb] == i + 1,
                            button: true,
                            label: '${kLevels[i].t} في $sb',
                            child: InkWell(
                              borderRadius: BorderRadius.circular(Spacing.rSm),
                              onTap: () => setState(() => levels[sb] = i + 1),
                              child: AnimatedContainer(
                                duration: context.reduceMotion ? Duration.zero : const Duration(milliseconds: 180),
                                margin: const EdgeInsets.all(2),
                                padding: const EdgeInsets.symmetric(vertical: 6),
                                constraints: const BoxConstraints(minHeight: 56),
                                decoration: BoxDecoration(
                                  color: levels[sb] == i + 1
                                      ? Theme.of(context).colorScheme.primary.withValues(alpha: 0.14)
                                      : null,
                                  borderRadius: BorderRadius.circular(Spacing.rSm),
                                  border: Border.all(
                                    color: levels[sb] == i + 1
                                        ? Theme.of(context).colorScheme.primary
                                        : context.rc.line,
                                  ),
                                ),
                                child: ExcludeSemantics(
                                  child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(kLevels[i].e, style: const TextStyle(fontSize: 22)),
                                      Text(
                                        kLevels[i].t,
                                        style: const TextStyle(fontSize: 10.5),
                                        textAlign: TextAlign.center,
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                  const Gap(6),
                  TextField(
                    controller: lessons[sb],
                    maxLength: 60,
                    decoration: const InputDecoration(
                      labelText: 'آخر درس تتذكره (اختياري)',
                      hintText: 'مثلاً: الكسور',
                      isDense: true,
                    ),
                  ),
                  const Gap(),
                ],
              ],
            ),
            FilledButton(
              onPressed: done
                  ? () {
                      s.saveAssess(away!, levels, {for (final e in lessons.entries) e.key: e.value.text});
                      if (!widget.first) Navigator.pop(context);
                    }
                  : null,
              style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(56)),
              child: Text(
                done
                    ? (widget.first ? 'احفظ وابدأ الرحلة ✨' : 'احفظ التقييم ✔')
                    : 'قيّم كل المواد ($rated/${subs.length})${away == null ? ' وحدّد مدة الغياب' : ''}',
              ),
            ),
            if (!widget.first) ...[
              const Gap(),
              OutlinedButton(onPressed: () => Navigator.pop(context), child: const Text('إلغاء')),
            ],
          ],
        ),
      ),
    );
  }
}
