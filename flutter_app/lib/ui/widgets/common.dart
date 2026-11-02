import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';

/// عرض مريح للقراءة على الشاشات العريضة (مثل main max-width:720px).
class PageBody extends StatelessWidget {
  const PageBody({super.key, required this.children, this.padding = const EdgeInsets.all(Spacing.lg), this.controller});
  final List<Widget> children;
  final EdgeInsets padding;
  final ScrollController? controller;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 720),
        child: ListView(controller: controller, padding: padding, children: children),
      ),
    );
  }
}

/// بطاقة بعنوان اختياري.
class SectionCard extends StatelessWidget {
  const SectionCard({super.key, this.title, this.trailing, required this.children, this.color, this.center = false});
  final String? title;
  final Widget? trailing;
  final List<Widget> children;
  final Color? color;
  final bool center;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: color,
      child: Padding(
        padding: const EdgeInsets.all(Spacing.lg),
        child: Column(
          crossAxisAlignment: center ? CrossAxisAlignment.center : CrossAxisAlignment.stretch,
          children: [
            if (title != null)
              Padding(
                padding: const EdgeInsets.only(bottom: Spacing.sm),
                child: Row(
                  children: [
                    Expanded(
                      child: Semantics(
                        header: true,
                        child: Text(title!, style: Theme.of(context).textTheme.titleMedium),
                      ),
                    ),
                    ?trailing,
                  ],
                ),
              ),
            ...children,
          ],
        ),
      ),
    );
  }
}

class Muted extends StatelessWidget {
  const Muted(this.text, {super.key, this.small = true, this.center = false});
  final String text;
  final bool small;
  final bool center;
  @override
  Widget build(BuildContext context) => Text(
    text,
    textAlign: center ? TextAlign.center : null,
    style: TextStyle(color: context.rc.muted, fontSize: small ? 13.5 : 15, height: 1.6),
  );
}

/// شريط تقدّم مستدير.
class Bar extends StatelessWidget {
  const Bar({super.key, required this.value, this.color, this.height = 10, this.label});
  final double value;
  final Color? color;
  final double height;
  final String? label;

  @override
  Widget build(BuildContext context) {
    final v = value.isFinite ? value.clamp(0.0, 1.0) : 0.0;
    return Semantics(
      label: label,
      value: '${(v * 100).round()}٪',
      child: ClipRRect(
        borderRadius: BorderRadius.circular(99),
        child: TweenAnimationBuilder<double>(
          tween: Tween(end: v),
          duration: context.reduceMotion ? Duration.zero : const Duration(milliseconds: 450),
          curve: Curves.easeOutCubic,
          builder: (_, x, _) => LinearProgressIndicator(
            value: x,
            minHeight: height,
            backgroundColor: context.rc.line,
            color: color ?? Theme.of(context).colorScheme.primary,
          ),
        ),
      ),
    );
  }
}

/// نقاط التقدّم (الخطوات أو التحديات المنجزة).
class Dots extends StatelessWidget {
  const Dots({super.key, required this.total, required this.done, this.current, this.size = 9, this.label});
  final int total;
  final int done;
  final int? current;
  final double size;
  final String? label;

  @override
  Widget build(BuildContext context) {
    final p = Theme.of(context).colorScheme.primary;
    return Semantics(
      label: label ?? 'أنجزت $done من $total',
      child: ExcludeSemantics(
        child: Wrap(
          spacing: 5,
          runSpacing: 5,
          children: [
            for (var i = 0; i < total; i++)
              AnimatedContainer(
                duration: context.reduceMotion ? Duration.zero : const Duration(milliseconds: 250),
                width: i == current ? size * 2.4 : size,
                height: size,
                decoration: BoxDecoration(
                  color: i < done || i == current ? p : context.rc.line,
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// زر اختيار (chip) بحجم لمس 48dp.
class ChoiceChipX extends StatelessWidget {
  const ChoiceChipX({super.key, required this.label, required this.selected, required this.onTap});
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onTap(),
      showCheckmark: false,
      materialTapTargetSize: MaterialTapTargetSize.padded,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    );
  }
}

/// خيار كبير (البداية والتقييم).
class BigChoice extends StatelessWidget {
  const BigChoice({super.key, required this.child, required this.selected, required this.onTap, this.semantics});
  final Widget child;
  final bool selected;
  final VoidCallback onTap;
  final String? semantics;

  @override
  Widget build(BuildContext context) {
    final p = Theme.of(context).colorScheme.primary;
    return Padding(
      padding: const EdgeInsets.only(bottom: Spacing.sm),
      child: Semantics(
        button: true,
        selected: selected,
        label: semantics,
        child: Material(
          color: selected ? p.withValues(alpha: 0.12) : context.rc.card,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(Spacing.rMd),
            side: BorderSide(color: selected ? p : context.rc.line, width: selected ? 2 : 1.5),
          ),
          child: InkWell(
            borderRadius: BorderRadius.circular(Spacing.rMd),
            onTap: onTap,
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 56),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: Spacing.lg, vertical: Spacing.md),
                child: Align(alignment: AlignmentDirectional.centerStart, child: child),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// مفتاح تشغيل/إيقاف مع عنوان وشرح.
class SwitchRow extends StatelessWidget {
  const SwitchRow({super.key, required this.title, this.hint, required this.value, required this.onChanged});
  final String title;
  final String? hint;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return SwitchListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
      subtitle: hint == null || hint!.isEmpty
          ? null
          : Text(hint!, style: TextStyle(color: context.rc.muted, fontSize: 13)),
      value: value,
      onChanged: onChanged,
    );
  }
}

/// رمز تعبيري كبير بدون قراءة من قارئ الشاشة.
class Emoji extends StatelessWidget {
  const Emoji(this.e, {super.key, this.size = 40});
  final String e;
  final double size;
  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: Text(e, style: TextStyle(fontSize: size, height: 1.2)),
  );
}

/// زر بلون مخصّص (أخضر للبدء، برتقالي لـ «تايه؟»).
class ColorButton extends StatelessWidget {
  const ColorButton({super.key, required this.label, required this.onPressed, this.color, this.big = false, this.icon});
  final String label;
  final VoidCallback? onPressed;
  final Color? color;
  final bool big;
  final Widget? icon;

  @override
  Widget build(BuildContext context) {
    final style = FilledButton.styleFrom(
      backgroundColor: color,
      foregroundColor: Colors.white,
      minimumSize: Size(double.infinity, big ? 56 : 48),
      textStyle: TextStyle(fontWeight: FontWeight.w800, fontSize: big ? 17 : 15.5),
    );
    return icon == null
        ? FilledButton(
            onPressed: onPressed,
            style: style,
            child: Text(label, textAlign: TextAlign.center),
          )
        : FilledButton.icon(onPressed: onPressed, style: style, icon: icon!, label: Text(label));
  }
}

class Gap extends StatelessWidget {
  const Gap([this.h = Spacing.md, Key? key]) : super(key: key);
  final double h;
  @override
  Widget build(BuildContext context) => SizedBox(height: h);
}

/// نافذة تأكيد موحّدة.
Future<bool> confirmDialog(
  BuildContext context, {
  required String emoji,
  required String title,
  required String body,
  required String yes,
  bool danger = false,
}) async {
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      icon: Emoji(emoji, size: 44),
      title: Text(title, textAlign: TextAlign.center),
      content: Text(body, textAlign: TextAlign.center),
      actionsAlignment: MainAxisAlignment.center,
      actions: [
        OutlinedButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('رجوع')),
        FilledButton(
          style: danger ? FilledButton.styleFrom(backgroundColor: Theme.of(ctx).colorScheme.error) : null,
          onPressed: () => Navigator.pop(ctx, true),
          child: Text(yes),
        ),
      ],
    ),
  );
  return ok ?? false;
}
