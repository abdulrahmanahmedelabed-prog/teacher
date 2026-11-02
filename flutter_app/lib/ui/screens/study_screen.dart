import 'package:flutter/material.dart';

import '../../logic/arabic.dart';
import '../../logic/leitner.dart';
import '../../models/app_data.dart';
import '../../state/app_scope.dart';
import '../../state/app_state.dart';
import '../../theme/app_theme.dart';
import '../widgets/common.dart';
import 'books_screen.dart';

/// «مذاكرة»: كتبي + بطاقاتي.
class StudyScreen extends StatefulWidget {
  const StudyScreen({super.key});

  @override
  State<StudyScreen> createState() => _StudyScreenState();
}

class _StudyScreenState extends State<StudyScreen> {
  String tab = 'books';
  ReviewSession? review;

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    if (review != null) {
      return _Review(state: s, session: review!, onEnd: () => setState(() => review = null));
    }
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(Spacing.lg, Spacing.lg, Spacing.lg, 0),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 720),
            child: SizedBox(
              width: double.infinity,
              child: SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'books', label: Text('📖 كتبي')),
                  ButtonSegment(value: 'cards', label: Text('🗂️ بطاقاتي')),
                ],
                selected: {tab},
                showSelectedIcon: false,
                onSelectionChanged: (v) => setState(() => tab = v.first),
              ),
            ),
          ),
        ),
        Expanded(
          child: tab == 'books'
              ? const BooksList()
              : _Cards(state: s, onReview: () => setState(() => review = s.startReview())),
        ),
      ],
    );
  }
}

const _boxColors = [
  Color(0xFFFF8A3D),
  Color(0xFFFFB020),
  Color(0xFFC9C23A),
  Color(0xFF7CC96B),
  Color(0xFF1FBF75),
  Color(0xFF0F8A52),
];

class _Cards extends StatefulWidget {
  const _Cards({required this.state, required this.onReview});
  final AppState state;
  final VoidCallback onReview;

  @override
  State<_Cards> createState() => _CardsState();
}

class _CardsState extends State<_Cards> {
  bool formOpen = false;
  String filter = 'all';
  String? sub;
  final _q = TextEditingController();
  final _a = TextEditingController();
  final _qFocus = FocusNode();

  @override
  void dispose() {
    _q.dispose();
    _a.dispose();
    _qFocus.dispose();
    super.dispose();
  }

  void _add() {
    final s = widget.state;
    final q = _q.text.trim(), a = _a.text.trim();
    if (q.isEmpty || a.isEmpty) {
      s.toast('اكتب السؤال والجواب 🙂');
      return;
    }
    s.addCard(sub ?? s.subjects.first, q, a);
    _q.clear();
    _a.clear();
    _qFocus.requestFocus();
  }

  Future<void> _delete(StudyCard c) async {
    final ok = await confirmDialog(
      context,
      emoji: '🗑️',
      title: 'حذف هذه البطاقة؟',
      body: 'لا يمكن التراجع عن الحذف.',
      yes: 'احذف',
      danger: true,
    );
    if (ok) widget.state.deleteCard(c.id);
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.state;
    final subs = s.subjects;
    if (sub == null || !subs.contains(sub)) sub = subs.first;
    final cards = s.data.cards;
    final due = s.due;
    final howTo = const ExpansionTile(
      shape: Border(),
      tilePadding: EdgeInsets.zero,
      title: Text('كيف تعمل البطاقات؟', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
      children: [
        Muted(
          'كل ما عرفت البطاقة تنتقل لصندوق أعلى وتتأخر مراجعتها (من يوم حتى 30 يوماً)، وإذا نسيتها ترجع للبداية. '
          'هكذا تثبت المعلومة لمدة طويلة. كن صادقاً: النقاط على المراجعة نفسها، لا على الإجابة.',
        ),
      ],
    );
    final form = SectionCard(
      title: '➕ بطاقة جديدة',
      children: [
        DropdownButtonFormField<String>(
          isExpanded: true,
          initialValue: sub,
          decoration: const InputDecoration(labelText: 'المادة'),
          items: [for (final x in subs) DropdownMenuItem(value: x, child: Text(x))],
          onChanged: (v) => setState(() => sub = v),
        ),
        const Gap(),
        TextField(
          controller: _q,
          focusNode: _qFocus,
          maxLength: 300,
          minLines: 2,
          maxLines: 4,
          decoration: const InputDecoration(labelText: 'السؤال', hintText: 'مثلاً: ما قانون نيوتن الثاني؟'),
        ),
        TextField(
          controller: _a,
          maxLength: 500,
          minLines: 2,
          maxLines: 4,
          decoration: const InputDecoration(labelText: 'الجواب', hintText: 'القوة = الكتلة × التسارع'),
        ),
        FilledButton(onPressed: _add, child: const Text('أضف البطاقة (+5 ⭐)')),
        if (cards.isNotEmpty) TextButton(onPressed: () => setState(() => formOpen = false), child: const Text('إغلاق')),
      ],
    );

    if (cards.isEmpty) {
      return PageBody(
        children: [
          SectionCard(
            center: true,
            children: [
              const Emoji('🗂️', size: 46),
              Text('بطاقاتي', style: Theme.of(context).textTheme.titleLarge),
              const Gap(6),
              const Muted(
                'اكتب سؤالاً من درسك وجوابه، والتطبيق يذكّرك بمراجعته في الوقت المناسب حتى يثبت في ذاكرتك.',
                small: false,
                center: true,
              ),
              const Gap(),
              if (!formOpen)
                FilledButton(onPressed: () => setState(() => formOpen = true), child: const Text('➕ اصنع أول بطاقة')),
              howTo,
            ],
          ),
          if (formOpen) form,
        ],
      );
    }

    final counts = [for (var b = 1; b <= 6; b++) cards.where((c) => c.box == b).length];
    final mastered = counts[4] + counts[5];
    final nextDue = (cards.map((c) => c.due).toList()..sort()).first;
    final usedSubs = subs.where((x) => cards.any((c) => c.subject == x)).toList();
    if (filter != 'all' && !usedSubs.contains(filter)) filter = 'all';
    final list = cards.where((c) => filter == 'all' || c.subject == filter).toList().reversed.toList();

    return PageBody(
      children: [
        SectionCard(
          title: '🗂️ بطاقاتي',
          children: [
            Semantics(
              label: '${cards.length} بطاقة، منها $mastered متقنة',
              child: ExcludeSemantics(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(99),
                  child: SizedBox(
                    height: 14,
                    child: Row(
                      children: [
                        for (var i = 0; i < 6; i++)
                          if (counts[i] > 0)
                            Expanded(
                              flex: counts[i],
                              child: Container(margin: const EdgeInsets.symmetric(horizontal: 1), color: _boxColors[i]),
                            ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            const Gap(6),
            Row(
              children: [
                const Expanded(child: Muted('🌱 جديدة')),
                Muted('$mastered / ${cards.length} متقنة 🎓'),
              ],
            ),
            const Gap(),
            if (due.isNotEmpty)
              ColorButton(
                label: '🔁 راجع الآن · ${due.length} بطاقة',
                big: true,
                color: context.rc.good,
                onPressed: widget.onReview,
              )
            else
              Muted('✔ لا مراجعة اليوم — القادمة ${relDay(nextDue, s.today)}', small: false, center: true),
          ],
        ),
        if (formOpen)
          form
        else
          Padding(
            padding: const EdgeInsets.only(bottom: Spacing.lg),
            child: OutlinedButton(onPressed: () => setState(() => formOpen = true), child: const Text('➕ بطاقة جديدة')),
          ),
        SectionCard(
          title: 'كل البطاقات (${cards.length})',
          children: [
            if (usedSubs.length > 1)
              Wrap(
                spacing: Spacing.sm,
                runSpacing: Spacing.sm,
                children: [
                  ChoiceChipX(label: 'الكل', selected: filter == 'all', onTap: () => setState(() => filter = 'all')),
                  for (final x in usedSubs)
                    ChoiceChipX(label: x, selected: filter == x, onTap: () => setState(() => filter = x)),
                ],
              ),
            for (final c in list) ...[
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(c.q, style: const TextStyle(fontWeight: FontWeight.w700)),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(c.a),
                    Text(
                      '${c.subject} · 📦 ${c.box} · ${c.due.compareTo(s.today) <= 0 ? 'للمراجعة اليوم' : 'المراجعة ${relDay(c.due, s.today)}'}',
                      style: TextStyle(color: context.rc.muted, fontSize: 12.5),
                    ),
                  ],
                ),
                trailing: IconButton(
                  tooltip: 'حذف البطاقة',
                  icon: const Icon(Icons.delete_outline),
                  onPressed: () => _delete(c),
                ),
              ),
              const Divider(height: 1),
            ],
            howTo,
          ],
        ),
      ],
    );
  }
}

/// مراجعة البطاقات: اقلب البطاقة ثم ✔ عرفتها / ✖ ما عرفتها.
class _Review extends StatelessWidget {
  const _Review({required this.state, required this.session, required this.onEnd});
  final AppState state;
  final ReviewSession session;
  final VoidCallback onEnd;

  @override
  Widget build(BuildContext context) {
    final r = session;
    final c = r.queue.isEmpty ? null : state.data.cards.where((x) => x.id == r.queue.first).firstOrNull;
    if (c == null) {
      return PageBody(
        children: [
          SectionCard(
            center: true,
            children: [
              const Emoji('🎉', size: 50),
              Text('انتهت المراجعة!', style: Theme.of(context).textTheme.titleLarge),
              const Gap(),
              Text('راجعت ${r.done} · ⭐+${r.xp}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
              const Gap(6),
              Muted('عرفت ${r.right} من أول مرة. البطاقات التي نسيتها ستعود غداً.', center: true),
              const Gap(),
              FilledButton(onPressed: onEnd, child: const Text('تمام')),
            ],
          ),
        ],
      );
    }
    final total = r.total;
    return PageBody(
      children: [
        Row(
          children: [
            IconButton(tooltip: 'إنهاء المراجعة', onPressed: onEnd, icon: const Icon(Icons.close)),
            Expanded(
              child: Bar(value: total == 0 ? 0 : r.done / total, label: 'تقدّم المراجعة'),
            ),
            const SizedBox(width: Spacing.sm),
            Muted('${r.queue.length}'),
          ],
        ),
        const Gap(),
        Center(child: Chip(label: Text(c.subject))),
        const Gap(),
        _FlipCard(
          key: ValueKey('${c.id}-${r.done}-${r.queue.length}'),
          front: c.q,
          back: c.a,
          show: r.show,
          onFlip: () => state.showAnswer(r),
        ),
        const Gap(Spacing.lg),
        if (r.show) ...[
          Row(
            children: [
              Expanded(
                child: ColorButton(
                  label: '✔ عرفتها',
                  big: true,
                  color: context.rc.good,
                  onPressed: () => state.gradeCard(r, true),
                ),
              ),
              const SizedBox(width: Spacing.sm),
              Expanded(
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(56)),
                  onPressed: () => state.gradeCard(r, false),
                  child: const Text('✖ ما عرفتها', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                ),
              ),
            ],
          ),
          const Gap(6),
          const Muted('كن صادقاً — النقاط على المراجعة نفسها 😉', center: true),
        ] else ...[
          FilledButton(
            style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(56)),
            onPressed: () => state.showAnswer(r),
            child: const Text('👀 أظهر الجواب'),
          ),
          const Gap(6),
          const Muted('حاول تتذكّر الجواب أولاً…', center: true),
        ],
      ],
    );
  }
}

/// بطاقة تنقلب (أو تتبدّل فوراً مع «تقليل الحركة»).
class _FlipCard extends StatelessWidget {
  const _FlipCard({super.key, required this.front, required this.back, required this.show, required this.onFlip});
  final String front;
  final String back;
  final bool show;
  final VoidCallback onFlip;

  @override
  Widget build(BuildContext context) {
    Widget face(String text, bool answer) => Container(
      constraints: const BoxConstraints(minHeight: 180),
      padding: const EdgeInsets.all(Spacing.xl),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: answer ? context.rc.good.withValues(alpha: 0.10) : context.rc.card,
        borderRadius: BorderRadius.circular(Spacing.rLg),
        border: Border.all(color: answer ? context.rc.good : context.rc.line, width: 1.5),
      ),
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, height: 1.6),
      ),
    );
    return Semantics(
      button: !show,
      label: show ? 'الجواب: $back' : 'السؤال: $front. اضغط لإظهار الجواب',
      child: ExcludeSemantics(
        child: GestureDetector(
          onTap: show ? null : onFlip,
          child: TweenAnimationBuilder<double>(
            tween: Tween(end: show ? 1 : 0),
            duration: context.reduceMotion ? Duration.zero : const Duration(milliseconds: 380),
            curve: Curves.easeInOut,
            builder: (context, v, _) {
              final angle = v * 3.14159;
              final showBack = v >= 0.5;
              return Transform(
                alignment: Alignment.center,
                transform: Matrix4.identity()
                  ..setEntry(3, 2, 0.0012)
                  ..rotateY(angle),
                child: showBack
                    ? Transform(
                        alignment: Alignment.center,
                        transform: Matrix4.identity()..rotateY(3.14159),
                        child: Column(children: [Muted(front, center: true), const Gap(6), face(back, true)]),
                      )
                    : face(front, false),
              );
            },
          ),
        ),
      ),
    );
  }
}
