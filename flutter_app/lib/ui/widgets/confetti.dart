import 'dart:math' as math;

import 'package:flutter/material.dart';

/// قصاصات احتفال خفيفة (تُلغى مع «تقليل الحركة»).
class ConfettiOverlay extends StatefulWidget {
  const ConfettiOverlay({super.key, required this.onDone});
  final VoidCallback onDone;

  @override
  State<ConfettiOverlay> createState() => _ConfettiOverlayState();
}

class _Piece {
  _Piece(math.Random r)
    : x = r.nextDouble(),
      delay = r.nextDouble() * 0.15,
      speed = 0.55 + r.nextDouble() * 0.6,
      drift = (r.nextDouble() - 0.5) * 0.15,
      spin = r.nextDouble() * 6,
      color = _colors[r.nextInt(_colors.length)];
  final double x, delay, speed, drift, spin;
  final Color color;
  static const _colors = [
    Color(0xFF6C4CF5),
    Color(0xFFFF8A3D),
    Color(0xFF1FBF75),
    Color(0xFFFFB020),
    Color(0xFFFF4F8B),
    Color(0xFF3DC3FF),
  ];
}

class _ConfettiOverlayState extends State<ConfettiOverlay> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 2800))
    ..forward().whenComplete(widget.onDone);
  final _pieces = List.generate(40, (_) => _Piece(math.Random()));

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: ExcludeSemantics(
        child: AnimatedBuilder(
          animation: _c,
          builder: (_, _) => CustomPaint(size: Size.infinite, painter: _Painter(_pieces, _c.value)),
        ),
      ),
    );
  }
}

class _Painter extends CustomPainter {
  _Painter(this.pieces, this.t);
  final List<_Piece> pieces;
  final double t;

  @override
  void paint(Canvas canvas, Size size) {
    for (final p in pieces) {
      final k = ((t - p.delay) * p.speed * 1.6).clamp(0.0, 1.2);
      if (k <= 0) continue;
      final y = -20 + k * (size.height + 40);
      final x = (p.x + p.drift * k) * size.width;
      final paint = Paint()..color = p.color.withValues(alpha: (1 - t).clamp(0.0, 1.0) * 0.95 + 0.05);
      canvas.save();
      canvas.translate(x, y);
      canvas.rotate(p.spin * k * 4);
      canvas.drawRRect(RRect.fromRectAndRadius(const Rect.fromLTWH(-4, -7, 8, 14), const Radius.circular(2)), paint);
      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(_Painter old) => old.t != t;
}
