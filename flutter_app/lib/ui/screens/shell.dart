import 'package:flutter/material.dart';

import '../../state/app_scope.dart';
import '../../state/app_state.dart';
import '../../theme/app_theme.dart';
import '../widgets/common.dart';
import '../widgets/week_strip.dart';
import 'challenges_screen.dart';
import 'focus_screen.dart';
import 'home_screen.dart';
import 'journey_screen.dart';
import 'settings_screen.dart';
import 'study_screen.dart';

/// الهيكل: شريط علوي (السلسلة والنقاط) + خمسة تبويبات.
class Shell extends StatelessWidget {
  const Shell({super.key});

  static const _tabs = [
    (AppTab.home, '🏠', 'الرئيسية'),
    (AppTab.challenges, '🎯', 'التحديات'),
    (AppTab.focus, '⏱️', 'تركيز'),
    (AppTab.study, '📚', 'مذاكرة'),
    (AppTab.journey, '🗺️', 'رحلتي'),
  ];

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final running = s.tab == AppTab.focus && s.timerRunning;
    final idx = _tabs.indexWhere((t) => t.$1 == s.tab);
    return PopScope(
      canPop: s.tab == AppTab.home,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) s.setTab(AppTab.home);
      },
      child: Scaffold(
        appBar: running ? null : _TopBar(state: s),
        body: SafeArea(
          top: running,
          child: IndexedStack(
            index: idx,
            children: const [HomeScreen(), ChallengesScreen(), FocusScreen(), StudyScreen(), JourneyScreen()],
          ),
        ),
        bottomNavigationBar: running
            ? null
            : NavigationBar(
                selectedIndex: idx,
                onDestinationSelected: (i) => s.setTab(_tabs[i].$1),
                destinations: [
                  for (final t in _tabs)
                    NavigationDestination(
                      icon: ExcludeSemantics(child: Text(t.$2, style: const TextStyle(fontSize: 22))),
                      label: t.$3,
                    ),
                ],
              ),
      ),
    );
  }
}

class _TopBar extends StatelessWidget implements PreferredSizeWidget {
  const _TopBar({required this.state});
  final AppState state;

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    final st = state.stats;
    final dark = Theme.of(context).brightness == Brightness.dark;
    Widget pill(String text, String label, VoidCallback? onTap) => Semantics(
      button: onTap != null,
      label: label,
      child: InkWell(
        borderRadius: BorderRadius.circular(99),
        onTap: onTap,
        child: Container(
          constraints: const BoxConstraints(minHeight: 36),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.2),
            borderRadius: BorderRadius.circular(99),
          ),
          child: ExcludeSemantics(
            child: Center(
              child: Text(
                text,
                style: const TextStyle(fontWeight: FontWeight.w800, color: Colors.white),
              ),
            ),
          ),
        ),
      ),
    );
    return AppBar(
      flexibleSpace: Container(
        decoration: const BoxDecoration(gradient: LinearGradient(colors: [RehlaColors.primary, RehlaColors.primary2])),
      ),
      title: const Text('🚀 رحلة العودة', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
      actions: [
        pill(
          '🔥 ${st.streak}${st.freezes > 0 ? ' 🧊' : ''}',
          'سلسلتك: ${st.streak} أيام${st.freezes > 0 ? '، ولديك ${st.freezes} يوم سماح' : ''} — اضغط للتفاصيل',
          () => showStreakSheet(context),
        ),
        const SizedBox(width: 6),
        pill('⭐ ${state.data.xp}', 'نقاطك: ${state.data.xp}', null),
        IconButton(
          tooltip: dark ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن',
          icon: Icon(dark ? Icons.light_mode_outlined : Icons.dark_mode_outlined),
          onPressed: () {
            state.setTheme(dark ? ThemeMode.light : ThemeMode.dark);
            state.toast(dark ? '☀️ الوضع الفاتح' : '🌙 الوضع الداكن');
          },
        ),
        IconButton(
          tooltip: 'الإعدادات',
          icon: const Icon(Icons.settings_outlined),
          onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const SettingsScreen())),
        ),
      ],
    );
  }
}

void showStreakSheet(BuildContext context) {
  final s = AppScope.read(context);
  final st = s.stats;
  showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    builder: (c) => SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(Spacing.xl, 0, Spacing.xl, Spacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Emoji('🔥', size: 44),
            Text(
              '${st.streak} ${st.streak >= 3 && st.streak <= 10 ? 'أيام' : 'يوم'} متتالية',
              style: Theme.of(c).textTheme.titleLarge,
            ),
            const Gap(),
            Muted(
              'كل يوم تدرس فيه ولو 5 دقائق يُحسب. وكل 7 أيام دراسة تمنحك «يوم سماح» 🧊 يحمي سلسلتك تلقائياً إذا غبت يوماً.'
              '${st.freezes > 0 ? ' عندك الآن ${st.freezes} يوم سماح.' : ''} أفضل سلسلة لك: ${st.bestStreak}.',
              small: false,
              center: true,
            ),
            const Gap(Spacing.lg),
            WeekStrip(state: s),
            const Gap(Spacing.lg),
            SizedBox(
              width: double.infinity,
              child: FilledButton(onPressed: () => Navigator.pop(c), child: const Text('تمام')),
            ),
          ],
        ),
      ),
    ),
  );
}
