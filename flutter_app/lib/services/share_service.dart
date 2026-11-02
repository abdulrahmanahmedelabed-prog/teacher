import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

/// مشاركة/حفظ الملفات عبر نافذة المشاركة في Android.
class ShareService {
  Future<bool> shareBytes(Uint8List bytes, String name, String mime, {String? text}) async {
    try {
      final dir = await getTemporaryDirectory();
      final f = File('${dir.path}/$name');
      await f.writeAsBytes(bytes, flush: true);
      await SharePlus.instance.share(
        ShareParams(
          files: [XFile(f.path, mimeType: mime, name: name)],
          text: text,
          title: 'رحلة العودة',
        ),
      );
      return true;
    } catch (e) {
      debugPrint('share failed: $e');
      return false;
    }
  }

  Future<bool> shareFile(String path, String mime, {String? text}) async {
    try {
      await SharePlus.instance.share(
        ShareParams(
          files: [XFile(path, mimeType: mime)],
          text: text,
          title: 'رحلة العودة',
        ),
      );
      return true;
    } catch (e) {
      debugPrint('share failed: $e');
      return false;
    }
  }
}

class ProgressCardData {
  const ProgressCardData({
    required this.name,
    required this.levelLine,
    required this.stageLine,
    required this.streak,
    required this.xp,
    required this.focus,
    required this.badges,
    required this.quote,
  });
  final String name;
  final String levelLine;
  final String stageLine;
  final int streak;
  final int xp;
  final int focus;
  final int badges;
  final String quote;
}

/// يرسم صورة الإنجاز 1080×1350 (مثل shareProgress في الويب).
Future<Uint8List?> renderProgressImage(ProgressCardData d) async {
  const w = 1080.0, h = 1350.0;
  final rec = ui.PictureRecorder();
  final c = Canvas(rec, const Rect.fromLTWH(0, 0, w, h));
  final bg = Paint()
    ..shader = ui.Gradient.linear(
      Offset.zero,
      const Offset(w, h),
      const [Color(0xFF6C4CF5), Color(0xFFB05CFF), Color(0xFFFF8A3D)],
      const [0, 0.6, 1],
    );
  c.drawRect(const Rect.fromLTWH(0, 0, w, h), bg);

  void text(
    String s,
    double size,
    double y, {
    FontWeight wt = FontWeight.w600,
    double maxW = w - 120,
    double cx = w / 2,
    double alpha = 1,
  }) {
    final tp = TextPainter(
      text: TextSpan(
        text: s,
        style: TextStyle(
          fontSize: size,
          fontWeight: wt,
          color: Colors.white.withValues(alpha: alpha),
          height: 1.3,
        ),
      ),
      textAlign: TextAlign.center,
      textDirection: TextDirection.rtl,
      maxLines: 3,
      ellipsis: '…',
    )..layout(maxWidth: maxW);
    tp.paint(c, Offset(cx - tp.width / 2, y - tp.height / 2));
  }

  text('🚀 رحلة العودة', 60, 120, wt: FontWeight.w800);
  text(d.name, 96, 310, wt: FontWeight.w800);
  text(d.levelLine, 54, 410);
  text(d.stageLine, 44, 490);
  final boxes = [
    ('🔥 ${d.streak}', 'أيام متتالية'),
    ('⭐ ${d.xp}', 'نقطة'),
    ('⏱️ ${d.focus}', 'دقيقة تركيز'),
    ('🏅 ${d.badges}', 'وسام'),
  ];
  for (var i = 0; i < boxes.length; i++) {
    // RTL: الأول على اليمين
    final bx = 90 + (1 - i % 2) * 470.0, by = 580 + (i ~/ 2) * 260.0;
    const bw = 430.0, bh = 220.0;
    c.drawRRect(
      RRect.fromRectAndRadius(Rect.fromLTWH(bx, by, bw, bh), const Radius.circular(36)),
      Paint()..color = Colors.white.withValues(alpha: 0.18),
    );
    text(boxes[i].$1, 84, by + 90, wt: FontWeight.w800, cx: bx + bw / 2, maxW: bw - 20);
    text(boxes[i].$2, 40, by + 170, cx: bx + bw / 2, maxW: bw - 20);
  }
  text(d.quote.startsWith('«') ? d.quote : '«${d.quote}»', 46, 1170, wt: FontWeight.w700);
  text('ابدأ رحلتك أنت أيضاً ✨', 34, 1270, alpha: 0.85);

  final img = await rec.endRecording().toImage(w.toInt(), h.toInt());
  final data = await img.toByteData(format: ui.ImageByteFormat.png);
  return data?.buffer.asUint8List();
}
