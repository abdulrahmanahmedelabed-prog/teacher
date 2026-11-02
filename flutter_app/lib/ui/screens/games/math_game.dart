import 'dart:async';

import 'package:flutter/material.dart';

import '../../../logic/games.dart';
import '../../../state/app_scope.dart';
import '../../../state/app_state.dart';
import '../../../theme/app_theme.dart';
import '../../widgets/common.dart';

/// ⚡ سباق الأرقام: أكبر عدد من العمليات في 60 ثانية.
class MathGame extends StatefulWidget {
  const MathGame({super.key});

  @override
  State<MathGame> createState() => _MathGameState();
}

class _MathGameState extends State<MathGame> {
  static const _secs = 60;
  late AppState s;
  late MathQuestion q;
  int score = 0, wrong = 0, combo = 0;
  late DateTime end;
  bool over = false;
  Timer? _t;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    s = AppScope.read(context);
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _start());
  }

  MathQuestion _q() => mathQuestion(level: s.level.level, best: s.data.best['math'] ?? 0, cls: s.studentCls);

  void _start() {
    setState(() {
      score = 0;
      wrong = 0;
      combo = 0;
      over = false;
      q = _q();
      end = DateTime.now().add(const Duration(seconds: _secs));
      _started = true;
    });
    _t?.cancel();
    _t = Timer.periodic(const Duration(milliseconds: 250), (_) {
      if (!mounted) return;
      if (DateTime.now().isAfter(end)) {
        _t?.cancel();
        setState(() => over = true);
        s.mathOver(score);
      } else {
        setState(() {});
      }
    });
  }

  bool _started = false;

  @override
  void dispose() {
    _t?.cancel();
    super.dispose();
  }

  void _answer(int v) {
    if (over) return;
    setState(() {
      if (v == q.ans) {
        score++;
        combo++;
        s.fx('tick', combo: combo - 1);
      } else {
        wrong++;
        combo = 0;
        s.sound.buzz(const [25]);
      }
      q = _q();
    });
  }

  @override
  Widget build(BuildContext context) {
    final left = !_started
        ? _secs.toDouble()
        : (end.difference(DateTime.now()).inMilliseconds / 1000).clamp(0, _secs).toDouble();
    return Scaffold(
      appBar: AppBar(title: const Text('⚡ سباق الأرقام')),
      body: !_started
          ? const SizedBox.shrink()
          : PageBody(
              children: [
                if (over)
                  SectionCard(
                    center: true,
                    children: [
                      const Emoji('⚡', size: 50),
                      Text('انتهى الوقت!', style: Theme.of(context).textTheme.titleLarge),
                      const Gap(),
                      Text('إجابات صحيحة: $score · خاطئة: $wrong', style: const TextStyle(fontSize: 18)),
                      Muted('أفضل نتيجة: ${s.data.best['math'] ?? 0}'),
                      const Gap(Spacing.lg),
                      FilledButton(onPressed: _start, child: const Text('مرة أخرى')),
                      const Gap(Spacing.sm),
                      OutlinedButton(onPressed: () => Navigator.pop(context), child: const Text('رجوع')),
                    ],
                  )
                else
                  SectionCard(
                    center: true,
                    children: [
                      Row(
                        children: [
                          Text(
                            '✔ $score',
                            style: TextStyle(fontWeight: FontWeight.w800, color: context.rc.good, fontSize: 18),
                          ),
                          const Spacer(),
                          Semantics(
                            label: 'الوقت المتبقي ${left.ceil()} ثانية',
                            child: ExcludeSemantics(
                              child: Text('${left.ceil()} ث', style: const TextStyle(fontWeight: FontWeight.w800)),
                            ),
                          ),
                        ],
                      ),
                      const Gap(6),
                      Bar(value: left / _secs, color: context.rc.warn, height: 8),
                      const Gap(Spacing.xl),
                      Text(
                        '${q.text} = ?',
                        textDirection: TextDirection.ltr,
                        style: const TextStyle(fontSize: 40, fontWeight: FontWeight.w800),
                      ),
                      const Gap(Spacing.xl),
                      GridView.count(
                        crossAxisCount: 2,
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        mainAxisSpacing: Spacing.sm,
                        crossAxisSpacing: Spacing.sm,
                        childAspectRatio: 2.4,
                        children: [
                          for (final o in q.opts)
                            FilledButton.tonal(
                              onPressed: () => _answer(o),
                              child: Text('$o', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
                            ),
                        ],
                      ),
                    ],
                  ),
              ],
            ),
    );
  }
}
