import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../data/content.dart';
import '../../../logic/rng.dart';
import '../../../state/app_scope.dart';
import '../../../state/app_state.dart';
import '../../../theme/app_theme.dart';
import '../../widgets/common.dart';

class _MemCard {
  _MemCard(this.e);
  final String e;
  bool open = false;
  bool matched = false;
}

/// 🃏 لعبة الذاكرة: 8 أزواج.
class MemoryGame extends StatefulWidget {
  const MemoryGame({super.key});

  @override
  State<MemoryGame> createState() => _MemoryGameState();
}

class _MemoryGameState extends State<MemoryGame> {
  late AppState s;
  List<_MemCard> cards = [];
  int? first;
  bool lock = false, over = false;
  int tries = 0;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    s = AppScope.read(context);
    if (cards.isEmpty) _start();
  }

  void _start() {
    setState(() {
      cards = shuffle([...kMemoryEmojis, ...kMemoryEmojis], math.Random().nextDouble).map(_MemCard.new).toList();
      first = null;
      lock = false;
      over = false;
      tries = 0;
    });
  }

  void _flip(int i) {
    final c = cards[i];
    if (lock || c.open || c.matched) return;
    setState(() => c.open = true);
    if (first == null) {
      first = i;
      return;
    }
    final f = cards[first!];
    tries++;
    first = null;
    if (f.e == c.e) {
      setState(() {
        f.matched = c.matched = true;
      });
      if (cards.every((x) => x.matched)) {
        setState(() => over = true);
        s.memoryOver(tries);
      } else {
        s.fx('right');
      }
    } else {
      lock = true;
      Future.delayed(const Duration(milliseconds: 750), () {
        if (!mounted) return;
        setState(() {
          f.open = c.open = false;
          lock = false;
        });
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final left = cards.where((c) => !c.matched).length ~/ 2;
    final p = Theme.of(context).colorScheme.primary;
    return Scaffold(
      appBar: AppBar(title: const Text('🃏 لعبة الذاكرة')),
      body: PageBody(
        children: [
          if (over)
            SectionCard(
              center: true,
              children: [
                const Emoji('🃏', size: 50),
                Text('أحسنت!', style: Theme.of(context).textTheme.titleLarge),
                const Gap(),
                Text('أنهيتها في $tries محاولة', style: const TextStyle(fontSize: 18)),
                const Gap(Spacing.lg),
                FilledButton(onPressed: _start, child: const Text('مرة أخرى')),
                const Gap(Spacing.sm),
                OutlinedButton(onPressed: () => Navigator.pop(context), child: const Text('رجوع')),
              ],
            )
          else
            SectionCard(
              children: [
                Muted('محاولات $tries · باقي $left أزواج', center: true),
                const Gap(),
                GridView.count(
                  crossAxisCount: 4,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: Spacing.sm,
                  crossAxisSpacing: Spacing.sm,
                  children: [
                    for (var i = 0; i < cards.length; i++)
                      Semantics(
                        button: true,
                        label: cards[i].matched
                            ? 'مطابقة: ${cards[i].e}'
                            : cards[i].open
                            ? 'مفتوحة: ${cards[i].e}'
                            : 'بطاقة مغلقة',
                        child: ExcludeSemantics(
                          child: InkWell(
                            borderRadius: BorderRadius.circular(Spacing.rMd),
                            onTap: () => _flip(i),
                            child: AnimatedContainer(
                              duration: context.reduceMotion ? Duration.zero : const Duration(milliseconds: 220),
                              decoration: BoxDecoration(
                                color: cards[i].matched
                                    ? context.rc.good.withValues(alpha: 0.18)
                                    : cards[i].open
                                    ? context.rc.card
                                    : p,
                                borderRadius: BorderRadius.circular(Spacing.rMd),
                                border: Border.all(
                                  color: cards[i].matched ? context.rc.good : context.rc.line,
                                  width: 1.5,
                                ),
                              ),
                              alignment: Alignment.center,
                              child: AnimatedOpacity(
                                opacity: cards[i].open || cards[i].matched ? 1 : 0,
                                duration: context.reduceMotion ? Duration.zero : const Duration(milliseconds: 180),
                                child: Text(cards[i].e, style: const TextStyle(fontSize: 30)),
                              ),
                            ),
                          ),
                        ),
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
