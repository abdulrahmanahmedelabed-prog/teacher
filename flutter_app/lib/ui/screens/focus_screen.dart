import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../data/app_text.dart';
import '../../logic/arabic.dart';
import '../../state/app_scope.dart';
import '../../state/app_state.dart';
import '../../theme/app_theme.dart';
import '../widgets/common.dart';

class FocusScreen extends StatefulWidget {
  const FocusScreen({super.key});

  @override
  State<FocusScreen> createState() => _FocusScreenState();
}

class _FocusScreenState extends State<FocusScreen> {
  int minutes = 15;
  String? subject;

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    if (s.timerRunning) return _Running(state: s);
    final subs = s.subjects;
    if (subject == null || !subs.contains(subject)) subject = subs.first;
    return PageBody(
      children: [
        SectionCard(
          center: true,
          children: [
            Text('⏱️ جلسة تركيز', style: Theme.of(context).textTheme.titleLarge),
            const Muted('اختر المادة والمدة. كل دقيقة = 2 ⭐'),
            const Gap(Spacing.lg),
            _Ring(progress: 0, label: fmtClock(minutes * 60.0), size: 220),
            const Gap(Spacing.lg),
            const Align(
              alignment: AlignmentDirectional.centerStart,
              child: Text('المدة', style: TextStyle(fontWeight: FontWeight.w700)),
            ),
            const Gap(6),
            Wrap(
              spacing: Spacing.sm,
              runSpacing: Spacing.sm,
              alignment: WrapAlignment.center,
              children: [
                for (final m in kFocusDurations)
                  ChoiceChipX(label: '$m د', selected: minutes == m, onTap: () => setState(() => minutes = m)),
              ],
            ),
            const Gap(),
            const Align(
              alignment: AlignmentDirectional.centerStart,
              child: Text('المادة', style: TextStyle(fontWeight: FontWeight.w700)),
            ),
            const Gap(6),
            Wrap(
              spacing: Spacing.sm,
              runSpacing: Spacing.sm,
              alignment: WrapAlignment.center,
              children: [
                for (final x in subs)
                  ChoiceChipX(label: x, selected: subject == x, onTap: () => setState(() => subject = x)),
              ],
            ),
            if (s.data.settings.sound) ...[
              const Gap(),
              FilterChip(
                label: Text(s.data.settings.ambient ? '🌧️ خلفية هادئة: تعمل' : '🌧️ خلفية هادئة'),
                selected: s.data.settings.ambient,
                onSelected: (_) => s.toggleSetting('ambient'),
              ),
            ],
            const Gap(Spacing.lg),
            ColorButton(
              label: '▶ ابدأ',
              big: true,
              color: context.rc.good,
              onPressed: () => s.startTimer(minutes, subject!),
            ),
          ],
        ),
        const Card(
          clipBehavior: Clip.antiAlias,
          child: ExpansionTile(
            shape: Border(),
            title: Text('💡 نصائح للتركيز', style: TextStyle(fontWeight: FontWeight.w800)),
            childrenPadding: EdgeInsets.fromLTRB(Spacing.lg, 0, Spacing.lg, Spacing.lg),
            expandedCrossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Muted('• ابدأ بـ 5 أو 10 دقائق إذا كنت بعيداً عن الدراسة — هذا طبيعي جداً.'),
              Muted('• بعد كل جلسة خذ استراحة 5 دقائق: قم، تحرّك، وتنفّس.'),
              Muted('• اكتب أي فكرة مشتّتة على ورقة جانبية وارجع لها لاحقاً.'),
              Muted('• إذا أُغلق التطبيق أو انطفأت الشاشة، المؤقت يكمل ونذكّرك عند الانتهاء.'),
            ],
          ),
        ),
      ],
    );
  }
}

/// وضع التركيز الكامل: نخفي كل ما يشتّت أثناء الجلسة.
class _Running extends StatelessWidget {
  const _Running({required this.state});
  final AppState state;

  Future<void> _stop(BuildContext context) async {
    final m = state.timerDoneMinutes;
    final ok = await confirmDialog(
      context,
      emoji: '⏸️',
      title: 'إنهاء الجلسة الآن؟',
      body: m >= 3
          ? 'سنحسب لك الدقائق التي درستها ($m). أحسنت على ما أنجزته!'
          : 'درست أقل من 3 دقائق، لذلك لن تُحسب نقاط هذه المرة. لا بأس، جرّب جلسة أقصر.',
      yes: 'إنهاء',
    );
    if (ok) state.stopTimerEarly();
  }

  @override
  Widget build(BuildContext context) {
    final t = state.data.timer!;
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(Spacing.xl),
        child: ValueListenableBuilder<int>(
          valueListenable: state.timerTick,
          builder: (context, _, _) {
            final nowMs = state.now.millisecondsSinceEpoch;
            final left = (t.end - nowMs) / 1000;
            final total = t.minutes * 60.0;
            final line = kFocusLines[((nowMs - t.startMs) / 120000).floor().clamp(0, 1 << 30) % kFocusLines.length];
            return Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Muted('تدرس الآن', small: false),
                Semantics(
                  header: true,
                  child: Text(
                    t.subject,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
                  ),
                ),
                const Gap(Spacing.xl),
                Semantics(
                  label: 'الوقت المتبقي',
                  value: arMins((left / 60).ceil()),
                  child: ExcludeSemantics(
                    child: _Ring(progress: 1 - left / total, label: fmtClock(left), size: 260),
                  ),
                ),
                const Gap(Spacing.xl),
                AnimatedSwitcher(
                  duration: context.reduceMotion ? Duration.zero : const Duration(milliseconds: 400),
                  child: Text(
                    line,
                    key: ValueKey(line),
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                    textAlign: TextAlign.center,
                  ),
                ),
                const Gap(),
                const Muted('أبعِد الهاتف قليلاً — سننبّهك عند الانتهاء.', center: true),
                const Gap(Spacing.xl),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    IconButton.outlined(
                      tooltip: 'صوت الجلسة',
                      isSelected: t.muted,
                      onPressed: state.toggleSessionMute,
                      icon: const Icon(Icons.notifications_active_outlined),
                      selectedIcon: const Icon(Icons.notifications_off_outlined),
                      iconSize: 26,
                    ),
                    const SizedBox(width: Spacing.lg),
                    TextButton(onPressed: () => _stop(context), child: const Text('إنهاء مبكر')),
                  ],
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _Ring extends StatelessWidget {
  const _Ring({required this.progress, required this.label, required this.size});
  final double progress;
  final String label;
  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _RingPainter(progress.clamp(0.0, 1.0), context.rc.line, Theme.of(context).colorScheme.primary),
        child: Center(
          child: Text(
            label,
            textDirection: TextDirection.ltr,
            style: TextStyle(
              fontSize: size * 0.2,
              fontWeight: FontWeight.w800,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
        ),
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter(this.p, this.track, this.color);
  final double p;
  final Color track;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    const stroke = 14.0;
    final r = (size.shortestSide - stroke) / 2;
    final c = size.center(Offset.zero);
    canvas.drawCircle(
      c,
      r,
      Paint()
        ..color = track
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke,
    );
    // الحلقة تنقص مع مرور الوقت (مثل الويب)
    final remain = 1 - p;
    if (remain <= 0) return;
    canvas.drawArc(
      Rect.fromCircle(center: c, radius: r),
      -math.pi / 2,
      2 * math.pi * remain,
      false,
      Paint()
        ..color = color
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round
        ..strokeWidth = stroke,
    );
  }

  @override
  bool shouldRepaint(_RingPainter old) => old.p != p || old.color != color || old.track != track;
}
