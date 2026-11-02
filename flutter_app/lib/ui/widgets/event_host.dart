import 'dart:async';
import 'dart:collection';

import 'package:flutter/material.dart';

import '../../state/app_state.dart';
import '../../state/ui_events.dart';
import '../../theme/app_theme.dart';
import '../screens/settings_screen.dart';
import 'common.dart';
import 'confetti.dart';

/// يعرض أحداث الحالة: تنبيهات قصيرة، نوافذ احتفال بالدور، وقصاصات.
class EventHost extends StatefulWidget {
  const EventHost({
    super.key,
    required this.state,
    required this.navigatorKey,
    required this.messengerKey,
    required this.child,
  });
  final AppState state;
  final GlobalKey<NavigatorState> navigatorKey;
  final GlobalKey<ScaffoldMessengerState> messengerKey;
  final Widget child;

  @override
  State<EventHost> createState() => _EventHostState();
}

class _EventHostState extends State<EventHost> {
  StreamSubscription<UiEvent>? _sub;
  final Queue<CelebrateEvent> _queue = Queue();
  bool _showing = false;
  int _confetti = 0;

  @override
  void initState() {
    super.initState();
    _sub = widget.state.events.listen(_on);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      for (final e in widget.state.takeBacklog()) {
        _on(e);
      }
      _pump();
    });
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  bool get _reduce => MediaQuery.maybeDisableAnimationsOf(context) ?? false;

  void _on(UiEvent e) {
    switch (e) {
      case ToastEvent(:final message):
        final m = widget.messengerKey.currentState;
        m?.hideCurrentSnackBar();
        m?.showSnackBar(SnackBar(content: Text(message), duration: const Duration(milliseconds: 2200)));
      case ConfettiEvent():
        _burst();
      case NavigateEvent(:final route):
        if (route == 'settings') {
          widget.navigatorKey.currentState?.push(MaterialPageRoute(builder: (_) => const SettingsScreen()));
        }
      case CelebrateEvent():
        _queue.add(e);
        _pump();
    }
  }

  void _burst() {
    if (_reduce) return;
    setState(() => _confetti++);
  }

  Future<void> _pump() async {
    if (_showing || _queue.isEmpty) return;
    final ctx = widget.navigatorKey.currentContext;
    if (ctx == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _pump());
      return;
    }
    _showing = true;
    final e = _queue.removeFirst();
    if (e.sound != null) widget.state.fx(e.sound!);
    if (e.confetti) _burst();
    final primary = await showDialog<bool>(
      context: ctx,
      builder: (c) => AlertDialog(
        icon: Emoji(e.emoji, size: 52),
        title: Text(e.title, textAlign: TextAlign.center),
        content: Text(
          e.body,
          textAlign: TextAlign.center,
          style: TextStyle(color: c.rc.muted, height: 1.7),
        ),
        actionsAlignment: MainAxisAlignment.center,
        actionsOverflowDirection: VerticalDirection.down,
        actions: [
          if (e.primaryLabel != null)
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () => Navigator.pop(c, true),
                child: Text(e.primaryLabel!, textAlign: TextAlign.center),
              ),
            ),
          SizedBox(
            width: double.infinity,
            child: e.primaryLabel == null
                ? FilledButton(onPressed: () => Navigator.pop(c, false), child: Text(e.closeLabel))
                : OutlinedButton(onPressed: () => Navigator.pop(c, false), child: Text(e.closeLabel)),
          ),
        ],
      ),
    );
    if (primary == true) e.onPrimary?.call();
    _showing = false;
    if (_queue.isNotEmpty) {
      await Future.delayed(const Duration(milliseconds: 260));
      _pump();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        if (_confetti > 0)
          Positioned.fill(
            child: ConfettiOverlay(
              key: ValueKey(_confetti),
              onDone: () {
                if (mounted) setState(() => _confetti = 0);
              },
            ),
          ),
      ],
    );
  }
}
