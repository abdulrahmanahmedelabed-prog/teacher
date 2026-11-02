import 'package:flutter/material.dart';

import '../../data/app_text.dart';
import '../../data/content.dart';
import '../../state/app_scope.dart';
import '../../theme/app_theme.dart';
import 'common.dart';

/// مهمة «أنا تايه»: أصغر خطوة ممكنة في 5 خطوات.
Future<void> showLostFlow(BuildContext context) async {
  final s = AppScope.read(context);
  var step = 0;
  final result = await showDialog<String>(
    context: context,
    builder: (c) => StatefulBuilder(
      builder: (c, set) {
        final last = step == kLostSteps.length - 1;
        return AlertDialog(
          icon: Emoji(kLostEmoji[step], size: 52),
          title: Text('خطوة ${step + 1} من ${kLostSteps.length}', textAlign: TextAlign.center),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Dots(total: kLostSteps.length, done: step, current: step),
              const Gap(Spacing.lg),
              AnimatedSwitcher(
                duration: c.reduceMotion ? Duration.zero : const Duration(milliseconds: 220),
                child: Text(
                  kLostSteps[step],
                  key: ValueKey(step),
                  textAlign: TextAlign.center,
                  style: const TextStyle(height: 1.7, fontSize: 16),
                ),
              ),
            ],
          ),
          actionsOverflowDirection: VerticalDirection.down,
          actions: [
            SizedBox(
              width: double.infinity,
              child: last
                  ? ColorButton(label: 'أنجزتها! ✔', color: c.rc.good, onPressed: () => Navigator.pop(c, 'done'))
                  : FilledButton(onPressed: () => set(() => step++), child: const Text('التالي ←')),
            ),
            if (step == 3)
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(c, 'timer'),
                  child: const Text('شغّل مؤقت 5 دقائق'),
                ),
              ),
            SizedBox(
              width: double.infinity,
              child: TextButton(onPressed: () => Navigator.pop(c), child: const Text('إغلاق')),
            ),
          ],
        );
      },
    ),
  );
  if (result == 'done') s.lostDone();
  if (result == 'timer' && !s.timerRunning) s.startTimer(5, s.subjects.first);
}
