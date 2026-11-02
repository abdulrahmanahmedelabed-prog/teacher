import 'package:flutter/material.dart';

import '../../data/app_text.dart';
import '../../logic/dates.dart';
import '../../state/app_state.dart';
import '../../theme/app_theme.dart';

/// شريط الأسبوع (يبدأ السبت): ✔ للأيام التي درست فيها.
class WeekStrip extends StatelessWidget {
  const WeekStrip({super.key, required this.state});
  final AppState state;

  @override
  Widget build(BuildContext context) {
    final ws = weekStart(state.now);
    final today = state.today;
    final p = Theme.of(context).colorScheme.primary;
    return Row(
      children: [
        for (var i = 0; i < 7; i++)
          Builder(
            builder: (context) {
              final k = dateKey(addDays(ws, i));
              final on = state.data.isActive(k);
              final isToday = k == today;
              return Expanded(
                child: Semantics(
                  label: '${kWeekStrip[i]}: ${on ? 'درست' : 'لم تدرس'}${isToday ? ' (اليوم)' : ''}',
                  child: ExcludeSemantics(
                    child: Container(
                      margin: const EdgeInsets.symmetric(horizontal: 2),
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      decoration: BoxDecoration(
                        color: on ? p : context.rc.bg,
                        borderRadius: BorderRadius.circular(Spacing.rSm),
                        border: Border.all(color: isToday ? p : context.rc.line, width: isToday ? 2 : 1),
                      ),
                      child: Column(
                        children: [
                          Text(
                            kWeekStrip[i],
                            style: TextStyle(
                              fontSize: 10.5,
                              color: on ? Colors.white : context.rc.muted,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          Text(
                            on ? '✔' : '·',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              color: on ? Colors.white : context.rc.muted,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
      ],
    );
  }
}
