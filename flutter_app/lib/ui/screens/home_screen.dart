import 'package:flutter/material.dart';

import '../../data/app_text.dart';
import '../../data/content.dart';
import '../../logic/dates.dart';
import '../../logic/reminders.dart';
import '../../models/app_data.dart';
import '../../state/app_scope.dart';
import '../../state/app_state.dart';
import '../../theme/app_theme.dart';
import '../widgets/common.dart';
import '../widgets/lost_flow.dart';
import '../widgets/week_strip.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _shown = false;

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    if (s.tab == AppTab.home && !_shown) {
      _shown = true;
      WidgetsBinding.instance.addPostFrameCallback((_) => s.homeShown());
    } else if (s.tab != AppTab.home) {
      _shown = false;
    }
    final st = s.stats;
    final lv = s.level;
    final rec = s.rec;
    final list = s.daily.list;
    final low = rec.mood != null && kLowMoods.contains(rec.mood);
    final next =
        (low ? list.where((c) => !c.done && c.type == 'wellbeing').firstOrNull : null) ??
        list.where((c) => !c.done).firstOrNull;
    final bigLost = st.activeDays <= 3 || st.gapDays >= 2;
    final wk = s.weekly;
    final quote = kQuotes[dayNumber(s.today) % kQuotes.length];
    final greet = s.now.hour < 12 ? 'صباح الخير' : 'مساء الخير';
    final when = s.profile.when;

    return PageBody(
      children: [
        // ---------- البطاقة الترحيبية ----------
        Container(
          margin: const EdgeInsets.only(bottom: Spacing.lg),
          padding: const EdgeInsets.all(Spacing.lg + 4),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: context.rc.hero,
              stops: const [0, 0.6, 1],
              begin: Alignment.topRight,
              end: Alignment.bottomLeft,
            ),
            borderRadius: BorderRadius.circular(Spacing.rLg),
          ),
          child: DefaultTextStyle(
            style: const TextStyle(color: Colors.white),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Semantics(
                  header: true,
                  child: Text(
                    '$greet، ${s.profile.name} 👋',
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white),
                  ),
                ),
                const Gap(4),
                Text(
                  'المستوى ${lv.level} · ${lv.title} · ${st.stageObj.icon} ${st.stageObj.name}',
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.92)),
                ),
                const Gap(),
                Semantics(
                  label: 'التقدم للمستوى التالي',
                  value: '${lv.pct}٪',
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(99),
                    child: LinearProgressIndicator(
                      value: lv.pct / 100,
                      minHeight: 10,
                      color: Colors.white,
                      backgroundColor: Colors.white.withValues(alpha: 0.25),
                    ),
                  ),
                ),
                const Gap(6),
                Text(
                  'باقي ${lv.toNext} ⭐ للمستوى التالي${when.isNotEmpty ? ' · ⏰ $when' : ''}',
                  style: TextStyle(fontSize: 13, color: Colors.white.withValues(alpha: 0.9)),
                ),
              ],
            ),
          ),
        ),

        // ---------- المزاج ----------
        _MoodRow(state: s, low: low),
        const Gap(),

        // ---------- خطوتك التالية ----------
        AnimatedSwitcher(
          duration: context.reduceMotion ? Duration.zero : const Duration(milliseconds: 300),
          child: KeyedSubtree(
            key: ValueKey(next?.id ?? 'done'),
            child: next != null
                ? _NextCard(state: s, next: next, list: list, low: low, bigLost: bigLost)
                : _AllDone(state: s),
          ),
        ),
        if (bigLost) ...[
          ColorButton(
            label: '🧭 تايه؟ من وين أبدأ',
            color: context.rc.accent,
            big: true,
            onPressed: () => showLostFlow(context),
          ),
          const Gap(Spacing.lg),
        ],
        if (s.showReminderAsk) _ReminderAsk(state: s),
        if (s.showReminderHelpful)
          SectionCard(
            center: true,
            children: [
              const Text('هل التذكيرات مفيدة لك؟', style: TextStyle(fontWeight: FontWeight.w800)),
              const Gap(),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(onPressed: () => s.remindHelpful(true), child: const Text('👍 نعم')),
                  ),
                  const SizedBox(width: Spacing.sm),
                  Expanded(
                    child: OutlinedButton(onPressed: () => s.remindHelpful(false), child: const Text('👎 ليس كثيراً')),
                  ),
                ],
              ),
            ],
          ),
        if (wk.ready)
          SectionCard(
            center: true,
            children: [
              const Text('🏅 أكملت تحدي الأسبوع!', style: TextStyle(fontWeight: FontWeight.w800)),
              Muted(wk.text, center: true),
              const Gap(),
              ColorButton(label: 'استلم 150 ⭐', color: context.rc.good, onPressed: s.claimWeekly),
            ],
          ),

        // ---------- التقدّم ----------
        Card(
          clipBehavior: Clip.antiAlias,
          child: ExpansionTile(
            shape: const Border(),
            title: const Text('📈 تقدّمك', style: TextStyle(fontWeight: FontWeight.w800)),
            trailing: Text(
              '🔥${st.streak} · ⏱️${s.data.totalFocus} د · 🏅${s.data.badges.length}',
              style: TextStyle(color: context.rc.muted, fontSize: 13),
            ),
            childrenPadding: const EdgeInsets.fromLTRB(Spacing.lg, 0, Spacing.lg, Spacing.lg),
            expandedCrossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              WeekStrip(state: s),
              const Gap(),
              Row(
                children: [
                  _Stat(value: '${st.streak}${st.freezes > 0 ? ' 🧊${st.freezes}' : ''}', label: 'أيام متتالية'),
                  _Stat(value: '${s.data.totalFocus}', label: 'دقيقة تركيز'),
                  _Stat(value: '${s.data.badges.length}', label: 'وسام'),
                ],
              ),
              const Gap(),
              const Muted('🧊 كل 7 أيام دراسة تمنحك «يوم سماح» يحمي سلسلتك إذا غبت يوماً.'),
              const Gap(),
              Text.rich(
                TextSpan(
                  children: [
                    const TextSpan(
                      text: '🏅 تحدي الأسبوع: ',
                      style: TextStyle(fontWeight: FontWeight.w800),
                    ),
                    TextSpan(text: wk.text),
                  ],
                ),
              ),
              const Gap(6),
              Bar(value: wk.val / wk.target, label: 'تحدي الأسبوع'),
              const Gap(4),
              Muted('${wk.val} / ${wk.target} · المكافأة 150 ⭐${wk.claimed ? ' · تم الاستلام ✔' : ''}'),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(vertical: Spacing.sm, horizontal: Spacing.lg),
          child: Column(
            children: [
              Text(
                '💬 $quote',
                textAlign: TextAlign.center,
                style: TextStyle(color: context.rc.muted, fontStyle: FontStyle.italic),
              ),
              if (s.profile.goal.isNotEmpty) Muted('هدفك: ${s.profile.goal}', center: true),
            ],
          ),
        ),
      ],
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.value, required this.label});
  final String value;
  final String label;
  @override
  Widget build(BuildContext context) => Expanded(
    child: Container(
      margin: const EdgeInsets.symmetric(horizontal: 3),
      padding: const EdgeInsets.symmetric(vertical: Spacing.md),
      decoration: BoxDecoration(color: context.rc.bg, borderRadius: BorderRadius.circular(Spacing.rMd)),
      child: Column(
        children: [
          Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
          Muted(label),
        ],
      ),
    ),
  );
}

class _MoodRow extends StatelessWidget {
  const _MoodRow({required this.state, required this.low});
  final AppState state;
  final bool low;

  @override
  Widget build(BuildContext context) {
    final rec = state.rec;
    final p = Theme.of(context).colorScheme.primary;
    final care = state.lowStreakDays >= 3;
    return Semantics(
      container: true,
      label: 'كيف حالك اليوم؟',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'كيف حالك اليوم؟',
            style: TextStyle(fontWeight: FontWeight.w700),
            textAlign: TextAlign.center,
          ),
          const Gap(6),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              for (final i in kMoodOrder)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 2),
                  child: Tooltip(
                    message: kMoods[i].label,
                    child: Semantics(
                      button: true,
                      selected: rec.mood == i,
                      label: kMoods[i].label,
                      child: InkResponse(
                        onTap: () => state.setMood(i),
                        radius: 28,
                        child: AnimatedContainer(
                          duration: context.reduceMotion ? Duration.zero : const Duration(milliseconds: 200),
                          width: 50,
                          height: 50,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: rec.mood == i ? p.withValues(alpha: 0.16) : context.rc.card,
                            border: Border.all(
                              color: rec.mood == i ? p : context.rc.line,
                              width: rec.mood == i ? 2 : 1,
                            ),
                          ),
                          child: ExcludeSemantics(
                            child: AnimatedScale(
                              scale: rec.mood == i ? 1.15 : 1,
                              duration: context.reduceMotion ? Duration.zero : const Duration(milliseconds: 200),
                              child: Text(kMoods[i].e, style: const TextStyle(fontSize: 24)),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
          if (rec.mood != null) ...[const Gap(), _Note(kMoods[rec.mood!].msg)],
          if (rec.rest) ...[const Gap(6), const _Note('🌿 اليوم يوم راحة — الراحة جزء من الرحلة. نراك غداً 💜')],
          if (low && state.data.reminders.on && !state.remindersPaused)
            TextButton(onPressed: state.pauseReminders, child: const Text('⏸️ أوقف التذكيرات أسبوعاً')),
          if (care) ...[
            const Gap(6),
            const _Note(
              '💜 لاحظنا أن الأيام الأخيرة صعبة عليك. تحدّث مع شخص تثق به — أحد أفراد أسرتك أو معلم أو مرشد المدرسة. لست وحدك.',
              care: true,
            ),
          ],
        ],
      ),
    );
  }
}

class _Note extends StatelessWidget {
  const _Note(this.text, {this.care = false});
  final String text;
  final bool care;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(Spacing.md),
    decoration: BoxDecoration(
      color: care
          ? context.rc.accent.withValues(alpha: 0.10)
          : Theme.of(context).colorScheme.primary.withValues(alpha: 0.08),
      borderRadius: BorderRadius.circular(Spacing.rMd),
    ),
    child: Text(text, textAlign: TextAlign.center, style: const TextStyle(fontSize: 14, height: 1.6)),
  );
}

class _NextCard extends StatelessWidget {
  const _NextCard({
    required this.state,
    required this.next,
    required this.list,
    required this.low,
    required this.bigLost,
  });
  final AppState state;
  final Challenge next;
  final List<Challenge> list;
  final bool low;
  final bool bigLost;

  @override
  Widget build(BuildContext context) {
    final rec = state.rec;
    return SectionCard(
      title: '👉 خطوتك التالية',
      trailing: Dots(total: list.length, done: list.where((c) => c.done).length),
      children: [
        Text(next.text, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, height: 1.6)),
        const Gap(6),
        ChallengeMeta(c: next),
        const Gap(),
        if (next.isStudy) ...[
          ColorButton(
            label: '▶ ابدأ الآن · ${next.minutes} د',
            color: context.rc.good,
            big: true,
            onPressed: () => startFocusFor(context, next),
          ),
          const Gap(Spacing.sm),
          OutlinedButton(onPressed: () => state.toggleChallenge(next.id), child: const Text('✔ أنجزتها بدون مؤقت')),
        ] else
          ColorButton(label: '✔ أنجزتها', big: true, onPressed: () => state.toggleChallenge(next.id)),
        if (low && !rec.rest && !rec.active) ...[
          const Gap(Spacing.sm),
          OutlinedButton(onPressed: state.restDay, child: const Text('🌿 اجعل اليوم يوم راحة')),
        ],
        if (!bigLost) TextButton(onPressed: () => showLostFlow(context), child: const Text('🧭 تايه؟ من وين أبدأ')),
      ],
    );
  }
}

class _AllDone extends StatelessWidget {
  const _AllDone({required this.state});
  final AppState state;

  @override
  Widget build(BuildContext context) {
    final due = state.due.length;
    final rec = state.rec;
    return SectionCard(
      center: true,
      children: [
        const Emoji('🎉', size: 46),
        Text('أنجزت كل خطوات اليوم!', style: Theme.of(context).textTheme.titleMedium),
        const Gap(6),
        Muted(
          due > 0
              ? 'عندك $due بطاقة للمراجعة — دقائق قليلة تثبّت ما تعلمته.'
              : rec.reflected
              ? 'يوم رائع. استرح، ونراك غداً 💜'
              : 'اختم يومك بتأمّل قصير، أو خذ استراحة ممتعة.',
          center: true,
        ),
        const Gap(),
        if (due > 0)
          ColorButton(label: '🔁 راجع بطاقاتك', color: context.rc.good, onPressed: () => state.setTab(AppTab.study))
        else if (!rec.reflected)
          OutlinedButton(onPressed: () => state.setTab(AppTab.challenges), child: const Text('✍️ اكتب تأمّل اليوم')),
      ],
    );
  }
}

class _ReminderAsk extends StatelessWidget {
  const _ReminderAsk({required this.state});
  final AppState state;
  @override
  Widget build(BuildContext context) {
    final kid = state.studentCls <= 3;
    return SectionCard(
      children: [
        Text(
          '🔔 هل تريد أن نذكّرك قبل موعدك (${whenLabel(state.data)})؟',
          style: const TextStyle(fontWeight: FontWeight.w800),
        ),
        const Gap(4),
        Muted('تذكير لطيف واحد في اليوم فقط، ويمكنك إيقافه متى شئت.${kid ? ' يمكن لأحد والديك ضبط الوقت معك.' : ''}'),
        const Gap(),
        Row(
          children: [
            Expanded(
              child: FilledButton(onPressed: state.enableReminders, child: const Text('نعم، ذكّرني')),
            ),
            const SizedBox(width: Spacing.sm),
            Expanded(
              child: OutlinedButton(onPressed: state.remindNo, child: const Text('ليس الآن')),
            ),
          ],
        ),
      ],
    );
  }
}

/// سطر المعلومات: النوع · المدة · النقاط.
class ChallengeMeta extends StatelessWidget {
  const ChallengeMeta({super.key, required this.c});
  final Challenge c;
  @override
  Widget build(BuildContext context) => Text.rich(
    TextSpan(
      children: [
        TextSpan(text: '${kTypeLabel[c.type] ?? c.type} · ⏳ ${c.minutes} د · '),
        TextSpan(
          text: '+${c.xp}⭐',
          style: TextStyle(color: context.rc.xpFg, fontWeight: FontWeight.w800),
        ),
      ],
    ),
    style: TextStyle(color: context.rc.muted, fontSize: 13),
  );
}

/// يبدأ مؤقتاً مرتبطاً بتحدٍّ (مع تأكيد إذا كانت هناك جلسة جارية).
Future<void> startFocusFor(BuildContext context, Challenge c) async {
  final s = AppScope.read(context);
  if (s.timerRunning) {
    final ok = await confirmDialog(
      context,
      emoji: '⏱️',
      title: 'لديك جلسة تركيز جارية',
      body: 'هل تريد إلغاءها وبدء جلسة جديدة؟ (لن تُحسب الجلسة الحالية)',
      yes: 'ابدأ جلسة جديدة',
    );
    if (!ok) return;
    await s.notifications.cancelFocusEnd();
  }
  s.startTimer(c.minutes > 60 ? 60 : c.minutes, c.subject, chId: c.id);
}
