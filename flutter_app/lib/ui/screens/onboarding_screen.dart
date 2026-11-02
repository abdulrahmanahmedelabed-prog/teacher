import 'package:flutter/material.dart';

import '../../data/app_text.dart';
import '../../data/content.dart';
import '../../state/app_scope.dart';
import '../../state/app_state.dart';
import '../../theme/app_theme.dart';
import '../widgets/common.dart';

/// البداية: سؤال واحد في كل شاشة مع نقاط التقدّم.
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final OnboardingDraft ob = OnboardingDraft();
  final TextEditingController _name = TextEditingController();
  int step = 0;

  List<String> get steps => [
    'name',
    'grade',
    if (ob.grade.isNotEmpty && kGradeInfo[ob.grade]!.classes.length > 1) 'class',
    'subjects',
    'time',
    'away',
    for (var i = 0; i < ob.subjects.length; i++) 'lvl:$i',
  ];

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  void _toast(String m) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(m)));
  }

  void next() {
    final st = steps;
    final k = st[step];
    if (k == 'name') {
      ob.name = _name.text.trim();
      if (ob.name.isEmpty) {
        _toast('اكتب اسمك أولاً 🙂');
        return;
      }
    }
    if (k == 'subjects' && ob.subjects.isEmpty) {
      _toast('اختر مادة واحدة على الأقل');
      return;
    }
    if (step >= st.length - 1) {
      AppScope.read(context).finishOnboarding(ob);
      return;
    }
    setState(() => step++);
  }

  void back() => setState(() => step = (step - 1).clamp(0, 999));

  /// اختيار يتقدّم تلقائياً بعد لحظة قصيرة.
  void autoNext() {
    final d = context.reduceMotion ? Duration.zero : const Duration(milliseconds: 220);
    Future.delayed(d, () {
      if (mounted) next();
    });
  }

  @override
  Widget build(BuildContext context) {
    final st = steps;
    if (step >= st.length) step = st.length - 1;
    final k = st[step];
    var showNext = true;
    var nextLabel = 'التالي';
    late final Widget body;
    final h = Theme.of(context).textTheme.titleLarge;

    Widget head(String emoji, String title, [String? sub]) => Column(
      children: [
        Emoji(emoji, size: 54),
        const Gap(),
        Semantics(
          header: true,
          child: Text(title, style: h, textAlign: TextAlign.center),
        ),
        if (sub != null) ...[const Gap(6), Muted(sub, small: false, center: true)],
        const Gap(Spacing.xl),
      ],
    );

    switch (k) {
      case 'name':
        nextLabel = 'لنبدأ';
        body = Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            head(
              '🚀',
              'أهلاً بك في رحلة العودة',
              'ابتعدت عن الدراسة فترة؟ لا مشكلة. نبدأ معك بخطوات صغيرة جداً، ونكبر معاً كل يوم.',
            ),
            TextField(
              controller: _name,
              autofocus: true,
              maxLength: 30,
              textInputAction: TextInputAction.next,
              onSubmitted: (_) => next(),
              decoration: const InputDecoration(labelText: 'ما اسمك؟', hintText: 'اكتب اسمك'),
            ),
          ],
        );
      case 'grade':
        showNext = ob.grade.isNotEmpty;
        body = Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            head('🎓', 'في أي مرحلة دراسية أنت؟'),
            for (final g in kGrades)
              BigChoice(
                selected: ob.grade == g,
                onTap: () {
                  setState(() {
                    if (ob.grade != g) ob.cls = 0;
                    ob.grade = g;
                    final cl = kGradeInfo[g]!.classes;
                    if (cl.length == 1) ob.cls = cl.first;
                  });
                  autoNext();
                },
                child: Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(
                        text: kGradeInfo[g]!.label,
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                      ),
                      if (kGradeInfo[g]!.range.isNotEmpty)
                        TextSpan(
                          text: '  ${kGradeInfo[g]!.range}',
                          style: TextStyle(color: context.rc.muted, fontSize: 13),
                        ),
                    ],
                  ),
                ),
              ),
          ],
        );
      case 'class':
        showNext = ob.cls > 0;
        body = Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            head('🏫', 'في أي صف أنت؟', 'لنختار لك أسئلة وتحديات تناسب عمرك.'),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              childAspectRatio: 3,
              crossAxisSpacing: Spacing.sm,
              children: [
                for (final c in kGradeInfo[ob.grade]!.classes)
                  BigChoice(
                    selected: ob.cls == c,
                    onTap: () {
                      setState(() => ob.cls = c);
                      autoNext();
                    },
                    child: Center(
                      child: Text(classLabel(c), style: const TextStyle(fontWeight: FontWeight.w700)),
                    ),
                  ),
              ],
            ),
          ],
        );
      case 'subjects':
        body = Column(
          children: [
            head('📚', 'ما المواد التي تريد العودة إليها؟', 'اختر مادة أو أكثر — يمكنك تغييرها لاحقاً.'),
            Wrap(
              spacing: Spacing.sm,
              runSpacing: Spacing.sm,
              alignment: WrapAlignment.center,
              children: [
                for (final x in kSubjects)
                  FilterChip(
                    label: Text(x),
                    selected: ob.subjects.contains(x),
                    materialTapTargetSize: MaterialTapTargetSize.padded,
                    onSelected: (v) => setState(() => v ? ob.subjects.add(x) : ob.subjects.remove(x)),
                  ),
              ],
            ),
          ],
        );
      case 'time':
        body = Column(
          children: [
            head('⏰', 'كم دقيقة تستطيع أن تدرس يومياً؟', 'في الوضع الطبيعي. لا تقلق: نبدأ بربع هذا الوقت فقط.'),
            Wrap(
              spacing: Spacing.sm,
              runSpacing: Spacing.sm,
              alignment: WrapAlignment.center,
              children: [
                for (final m in kDailyMinutes)
                  ChoiceChipX(label: '$m د', selected: ob.minutes == m, onTap: () => setState(() => ob.minutes = m)),
              ],
            ),
            const Gap(Spacing.xl),
            Text('ومتى ستدرس عادةً؟', style: Theme.of(context).textTheme.titleMedium),
            const Muted('(وقت ثابت يبني العادة)'),
            const Gap(),
            Wrap(
              spacing: Spacing.sm,
              runSpacing: Spacing.sm,
              alignment: WrapAlignment.center,
              children: [
                for (final w in kWhens)
                  ChoiceChipX(
                    label: w,
                    selected: ob.when == w,
                    onTap: () => setState(() => ob.when = ob.when == w ? '' : w),
                  ),
              ],
            ),
          ],
        );
      case 'away':
        showNext = ob.away != null;
        body = Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            head('⏳', 'كم صار لك بعيد عن الدراسة؟', 'ليس امتحاناً ولا توجد إجابة خاطئة — فقط لنبني خطتك على مقاسك.'),
            for (var i = 0; i < kAway.length; i++)
              BigChoice(
                selected: ob.away == i,
                onTap: () {
                  setState(() => ob.away = i);
                  autoNext();
                },
                child: Text(kAway[i], style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              ),
          ],
        );
      default:
        final i = int.parse(k.split(':')[1]);
        final sb = ob.subjects[i];
        showNext = ob.levels[sb] != null;
        final last = i == ob.subjects.length - 1;
        if (last) nextLabel = 'ابدأ الرحلة ✨';
        final s = AppScope.of(context);
        body = Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Muted('مادة ${i + 1} من ${ob.subjects.length}', center: true),
            const Gap(),
            Text.rich(
              TextSpan(
                children: [
                  const TextSpan(text: 'كيف تشعر بمستواك في\n'),
                  TextSpan(
                    text: sb,
                    style: TextStyle(color: context.rc.primaryText),
                  ),
                  const TextSpan(text: '؟'),
                ],
              ),
              style: h,
              textAlign: TextAlign.center,
            ),
            const Gap(Spacing.xl),
            for (var j = 0; j < kLevels.length; j++)
              BigChoice(
                selected: ob.levels[sb] == j + 1,
                semantics: kLevels[j].t,
                onTap: () {
                  setState(() => ob.levels[sb] = j + 1);
                  autoNext();
                },
                child: Row(
                  children: [
                    Emoji(kLevels[j].e, size: 28),
                    const SizedBox(width: Spacing.md),
                    Text(kLevels[j].t, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                  ],
                ),
              ),
            if (last)
              TextButton(
                onPressed: () => s.toggleSetting('sound'),
                child: Text(
                  s.data.settings.sound
                      ? '🔊 أصوات تشجيع خفيفة: مفعّلة — يمكنك تغييرها من الإعدادات'
                      : '🔕 الأصوات: متوقفة',
                  textAlign: TextAlign.center,
                ),
              ),
          ],
        );
    }

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(Spacing.lg, Spacing.lg, Spacing.lg, 0),
              child: Center(
                child: Dots(total: st.length, done: step, current: step, label: 'الخطوة ${step + 1} من ${st.length}'),
              ),
            ),
            Expanded(
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 560),
                  child: AnimatedSwitcher(
                    duration: context.reduceMotion ? Duration.zero : const Duration(milliseconds: 260),
                    transitionBuilder: (c, a) => FadeTransition(
                      opacity: a,
                      child: SlideTransition(
                        position: Tween(begin: const Offset(0.04, 0), end: Offset.zero).animate(a),
                        child: c,
                      ),
                    ),
                    child: SingleChildScrollView(
                      key: ValueKey(k),
                      padding: const EdgeInsets.all(Spacing.xl),
                      child: body,
                    ),
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(Spacing.lg),
              child: Row(
                children: [
                  if (step > 0)
                    TextButton(
                      onPressed: () {
                        if (k == 'name') ob.name = _name.text.trim();
                        back();
                      },
                      child: const Text('→ رجوع'),
                    ),
                  if (step > 0) const SizedBox(width: Spacing.sm),
                  if (showNext)
                    Expanded(
                      child: FilledButton(
                        onPressed: next,
                        style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(56)),
                        child: Text(nextLabel),
                      ),
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
