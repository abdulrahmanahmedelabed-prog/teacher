import 'package:flutter/foundation.dart';

/// أحداث لمرة واحدة من الحالة إلى الواجهة (تنبيه، احتفال، تنقّل).
sealed class UiEvent {
  const UiEvent();
}

class ToastEvent extends UiEvent {
  const ToastEvent(this.message);
  final String message;
}

class ConfettiEvent extends UiEvent {
  const ConfettiEvent();
}

class NavigateEvent extends UiEvent {
  const NavigateEvent(this.route);
  final String route;
}

/// نافذة احتفال. تنتظر دورها حتى لا تتصادم النوافذ، وصوتها يُعزف عند ظهورها.
class CelebrateEvent extends UiEvent {
  const CelebrateEvent(
    this.emoji,
    this.title,
    this.body, {
    this.sound,
    this.confetti = false,
    this.primaryLabel,
    this.onPrimary,
    this.closeLabel = 'رائع!',
  });
  final String emoji;
  final String title;
  final String body;
  final String? sound;
  final bool confetti;
  final String? primaryLabel;
  final VoidCallback? onPrimary;
  final String closeLabel;
}
