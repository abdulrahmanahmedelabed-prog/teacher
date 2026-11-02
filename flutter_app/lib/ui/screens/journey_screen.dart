import 'package:flutter/material.dart';

import '../../data/app_text.dart';
import '../../data/content.dart';
import '../../logic/arabic.dart';
import '../../models/content_models.dart';
import '../../state/app_scope.dart';
import '../../theme/app_theme.dart';
import '../widgets/common.dart';
import 'assess_screen.dart';
import 'settings_screen.dart';

class JourneyScreen extends StatelessWidget {
  const JourneyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final st = s.stats;
    final next = st.stage < kStages.length ? kStages[st.stage] : null;
    final earned = kBadgeInfo.where((b) => s.data.badges.contains(b.id)).toList();
    final sorted = [...earned, ...kBadgeInfo.where((b) => !s.data.badges.contains(b.id))];
    final shownN = (s.data.badges.length + 3).clamp(6, sorted.length);
    final journal = s.data.journal.reversed.take(10).toList();
    final p = Theme.of(context).colorScheme.primary;

    Widget badge(BadgeInfo b) {
      final has = s.data.badges.contains(b.id);
      return Opacity(
        opacity: has ? 1 : 0.5,
        child: Container(
          padding: const EdgeInsets.all(Spacing.sm),
          decoration: BoxDecoration(
            color: has ? p.withValues(alpha: 0.08) : context.rc.bg,
            borderRadius: BorderRadius.circular(Spacing.rMd),
            border: Border.all(color: has ? p.withValues(alpha: 0.4) : context.rc.line),
          ),
          child: Semantics(
            label: '${b.name}${has ? ' — مكتسب' : ' — لم يُكتسب بعد'}: ${b.desc}',
            child: ExcludeSemantics(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(has ? b.icon : '🔒', style: const TextStyle(fontSize: 28)),
                  Text(
                    '${b.name}${has ? ' ✔' : ''}',
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12.5),
                  ),
                  Text(
                    b.desc,
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 11, color: context.rc.muted),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    Widget grid(List<BadgeInfo> list) => GridView.count(
      crossAxisCount: 3,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: Spacing.sm,
      crossAxisSpacing: Spacing.sm,
      childAspectRatio: 0.92,
      children: list.map(badge).toList(),
    );

    final levels = s.data.assess.isEmpty ? <String, int>{} : s.data.assess.first.levels;
    final last = s.data.latestLevels;

    return PageBody(
      children: [
        SectionCard(
          title: '🗺️ رحلة العودة',
          children: [
            Muted('درست حتى الآن ${arDays(st.activeDays)} · أفضل سلسلة: ${arDays(st.bestStreak)}', small: false),
            const Gap(),
            if (next != null) ...[
              Bar(
                value: (st.activeDays - st.stageObj.minDays) / (next.minDays - st.stageObj.minDays),
                label: 'التقدّم نحو المرحلة التالية',
              ),
              const Gap(6),
              Muted('باقي ${arDays(next.minDays - st.activeDays)} للوصول إلى «${next.name}»'),
            ] else
              const Text('🏆 وصلت لأعلى مرحلة!'),
            const Gap(Spacing.lg),
            for (final stg in kStages)
              _StageRow(stage: stg, current: st.stage, activeDays: st.activeDays, hasNext: next != null),
          ],
        ),
        SectionCard(
          title: '🏅 الأوسمة (${s.data.badges.length} / ${kBadgeInfo.length})',
          children: [
            grid(sorted.take(shownN).toList()),
            if (sorted.length > shownN)
              ExpansionTile(
                shape: const Border(),
                tilePadding: EdgeInsets.zero,
                title: const Text('عرض كل الأوسمة', style: TextStyle(fontWeight: FontWeight.w700)),
                children: [grid(sorted.skip(shownN).toList())],
              ),
          ],
        ),
        SectionCard(
          title: '📓 يومياتي',
          children: [
            if (journal.isEmpty)
              const Muted('لم تكتب أي تأمّل بعد. اكتب أول تأمّل من صفحة التحديات.')
            else
              for (final j in journal)
                Padding(
                  padding: const EdgeInsets.only(bottom: Spacing.md),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Muted(j.date),
                      Text(j.text, style: const TextStyle(height: 1.6)),
                    ],
                  ),
                ),
          ],
        ),
        if (s.data.assess.isNotEmpty)
          SectionCard(
            title: '📊 مستواي في المواد',
            children: [
              Muted(
                'حسب تقييمك الذاتي. آخر تقييم: ${s.data.assess.last.date}'
                '${s.data.assess.length > 1 ? ' · عدد التقييمات: ${s.data.assess.length}' : ''}',
              ),
              const Gap(),
              for (final sb in s.profile.subjects)
                if (last[sb] != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: Spacing.sm),
                    child: Row(
                      children: [
                        SizedBox(width: 110, child: Text(sb, style: const TextStyle(fontSize: 13.5))),
                        Expanded(
                          child: Bar(value: last[sb]! / 5, label: sb),
                        ),
                        const SizedBox(width: Spacing.sm),
                        Text(kLevels[last[sb]! - 1].e),
                        if (levels[sb] != null && last[sb]! > levels[sb]!)
                          Text(
                            ' ↑${last[sb]! - levels[sb]!}',
                            style: TextStyle(color: context.rc.good, fontWeight: FontWeight.w800),
                          ),
                      ],
                    ),
                  ),
              const Gap(),
              OutlinedButton(
                onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const AssessScreen())),
                child: const Text('🩺 أعد تقييم مستواك'),
              ),
            ],
          ),
        FilledButton(onPressed: s.shareProgress, child: const Text('📸 شارك إنجازك')),
        const Gap(),
        OutlinedButton(
          onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const SettingsScreen())),
          child: const Text('⚙️ الإعدادات · 💬 رأيك · 🤝 تواصل'),
        ),
        const Gap(Spacing.xl),
      ],
    );
  }
}

class _StageRow extends StatelessWidget {
  const _StageRow({required this.stage, required this.current, required this.activeDays, required this.hasNext});
  final Stage stage;
  final int current;
  final int activeDays;
  final bool hasNext;

  @override
  Widget build(BuildContext context) {
    final state = stage.id < current
        ? 'passed'
        : stage.id == current
        ? 'current'
        : 'locked';
    final p = Theme.of(context).colorScheme.primary;
    final nextStage = current < kStages.length ? kStages[current] : null;
    final sub = state == 'passed'
        ? '✔ أنجزتها'
        : state == 'current'
        ? (nextStage != null ? 'باقي ${arDays(nextStage.minDays - activeDays)} للمرحلة التالية' : 'أعلى مرحلة 🏆')
        : '🔒 بعد ${arDays(stage.minDays - activeDays)}';
    return Opacity(
      opacity: state == 'locked' ? 0.6 : 1,
      child: Container(
        margin: const EdgeInsets.only(bottom: Spacing.sm),
        padding: const EdgeInsets.all(Spacing.md),
        decoration: BoxDecoration(
          color: state == 'current' ? p.withValues(alpha: 0.08) : null,
          borderRadius: BorderRadius.circular(Spacing.rMd),
          border: Border.all(color: state == 'current' ? p : context.rc.line, width: state == 'current' ? 2 : 1),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(
              radius: 20,
              backgroundColor: state == 'passed'
                  ? context.rc.good
                  : state == 'current'
                  ? p
                  : context.rc.line,
              child: Text(
                state == 'passed'
                    ? '✔'
                    : state == 'current'
                    ? stage.icon
                    : '🔒',
                style: const TextStyle(fontSize: 18, color: Colors.white),
              ),
            ),
            const SizedBox(width: Spacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(stage.name, style: const TextStyle(fontWeight: FontWeight.w800)),
                      ),
                      if (state == 'current') ...[
                        const SizedBox(width: Spacing.sm),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(color: p, borderRadius: BorderRadius.circular(99)),
                          child: const Text(
                            'أنت هنا',
                            style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
                          ),
                        ),
                      ],
                    ],
                  ),
                  if (state == 'current') Muted(stage.desc),
                  Muted(sub),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
