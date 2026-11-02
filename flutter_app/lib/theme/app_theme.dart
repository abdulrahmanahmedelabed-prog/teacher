import 'package:flutter/material.dart';

/// ألوان التصميم من styles.css في نسخة الويب.
@immutable
class RehlaColors extends ThemeExtension<RehlaColors> {
  const RehlaColors({
    required this.bg,
    required this.card,
    required this.text,
    required this.muted,
    required this.line,
    required this.primaryText,
    required this.accent,
    required this.good,
    required this.warn,
    required this.xpBg,
    required this.xpFg,
    required this.hero,
  });

  final Color bg;
  final Color card;
  final Color text;
  final Color muted;
  final Color line;
  final Color primaryText;
  final Color accent;
  final Color good;
  final Color warn;
  final Color xpBg;
  final Color xpFg;
  final List<Color> hero;

  static const primary = Color(0xFF6C4CF5);
  static const primary2 = Color(0xFF7B5CF0);

  static const light = RehlaColors(
    bg: Color(0xFFF4F2FF),
    card: Color(0xFFFFFFFF),
    text: Color(0xFF1F1A3D),
    muted: Color(0xFF6B6690),
    line: Color(0xFFE4E0FB),
    primaryText: Color(0xFF5B3CE0),
    accent: Color(0xFFC2560F),
    good: Color(0xFF0F8A52),
    warn: Color(0xFFFFB020),
    xpBg: Color(0xFFFFF2D6),
    xpFg: Color(0xFFA76800),
    hero: [Color(0xFF6C4CF5), Color(0xFFB05CFF), Color(0xFFFF8A3D)],
  );

  static const dark = RehlaColors(
    bg: Color(0xFF120F24),
    card: Color(0xFF1D1838),
    text: Color(0xFFF1EEFF),
    muted: Color(0xFFA59FCC),
    line: Color(0xFF2E2856),
    primaryText: Color(0xFFA58BFF),
    accent: Color(0xFFC2560F),
    good: Color(0xFF0F8A52),
    warn: Color(0xFFFFB020),
    xpBg: Color(0xFF3D2F10),
    xpFg: Color(0xFFFFC964),
    hero: [Color(0xFF4B33C9), Color(0xFF7A3FD1), Color(0xFFA8541F)],
  );

  @override
  RehlaColors copyWith() => this;

  @override
  RehlaColors lerp(RehlaColors? other, double t) {
    if (other == null) return this;
    Color c(Color a, Color b) => Color.lerp(a, b, t)!;
    return RehlaColors(
      bg: c(bg, other.bg),
      card: c(card, other.card),
      text: c(text, other.text),
      muted: c(muted, other.muted),
      line: c(line, other.line),
      primaryText: c(primaryText, other.primaryText),
      accent: c(accent, other.accent),
      good: c(good, other.good),
      warn: c(warn, other.warn),
      xpBg: c(xpBg, other.xpBg),
      xpFg: c(xpFg, other.xpFg),
      hero: [for (var i = 0; i < hero.length; i++) c(hero[i], other.hero[i])],
    );
  }
}

extension RehlaThemeX on BuildContext {
  RehlaColors get rc => Theme.of(this).extension<RehlaColors>()!;
  bool get reduceMotion => MediaQuery.maybeDisableAnimationsOf(this) ?? false;
}

class Spacing {
  static const xs = 4.0, sm = 8.0, md = 12.0, lg = 16.0, xl = 24.0;
  static const rSm = 10.0, rMd = 14.0, rLg = 20.0;
}

ThemeData buildTheme(Brightness b) {
  final rc = b == Brightness.dark ? RehlaColors.dark : RehlaColors.light;
  final scheme = ColorScheme.fromSeed(seedColor: RehlaColors.primary, brightness: b).copyWith(
    primary: b == Brightness.dark ? const Color(0xFF8C70FF) : RehlaColors.primary,
    onPrimary: Colors.white,
    secondary: rc.accent,
    tertiary: rc.good,
    surface: rc.card,
    onSurface: rc.text,
    onSurfaceVariant: rc.muted,
    outline: rc.line,
    outlineVariant: rc.line,
  );
  final base = ThemeData(useMaterial3: true, colorScheme: scheme, brightness: b);
  final text = base.textTheme
      .apply(bodyColor: rc.text, displayColor: rc.text)
      .copyWith(
        bodyMedium: base.textTheme.bodyMedium?.copyWith(height: 1.6, color: rc.text),
        bodyLarge: base.textTheme.bodyLarge?.copyWith(height: 1.6, color: rc.text),
        titleLarge: base.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800, color: rc.text),
        titleMedium: base.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700, color: rc.text),
      );
  final shape = RoundedRectangleBorder(borderRadius: BorderRadius.circular(Spacing.rMd));
  const minSize = Size(48, 48);
  return base.copyWith(
    scaffoldBackgroundColor: rc.bg,
    textTheme: text,
    extensions: [rc],
    cardTheme: CardThemeData(
      color: rc.card,
      elevation: 0,
      margin: const EdgeInsets.only(bottom: Spacing.lg),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(Spacing.rLg),
        side: BorderSide(color: rc.line),
      ),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: RehlaColors.primary,
      foregroundColor: Colors.white,
      elevation: 0,
      centerTitle: false,
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: rc.card,
      indicatorColor: scheme.primary.withValues(alpha: 0.16),
      labelTextStyle: WidgetStatePropertyAll(TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: rc.text)),
      height: 68,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: minSize,
        shape: shape,
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: minSize,
        shape: shape,
        side: BorderSide(color: rc.line, width: 1.5),
      ),
    ),
    textButtonTheme: TextButtonThemeData(style: TextButton.styleFrom(minimumSize: minSize)),
    chipTheme: base.chipTheme.copyWith(
      shape: const StadiumBorder(),
      side: BorderSide(color: rc.line),
      labelStyle: TextStyle(color: rc.text, fontWeight: FontWeight.w600),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: rc.bg,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(Spacing.rMd),
        borderSide: BorderSide(color: rc.line),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(Spacing.rMd),
        borderSide: BorderSide(color: rc.line),
      ),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: rc.card,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
    ),
    snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
    dividerTheme: DividerThemeData(color: rc.line),
  );
}
