import 'package:flutter/material.dart';

/// Nocturne palette plus the Phase 5.5 tokens, as sRGB hex. Source of truth:
/// `docs/superpowers/specs/2026-09-25-phase5.5-cyberpunk-polish-design.md` section 2.
abstract final class Palette {
  static const bg = Color(0xFF161826);
  static const surface = Color(0xFF232532);
  static const text = Color(0xFFE9E9ED);
  static const accent = Color(0xFF9184D9);
  static const accent200 = Color(0xFFE7E5FE);
  static const accent300 = Color(0xFFD2CEFD);

  /// Player ("injected") digits.
  static const accent400 = Color(0xFFB5ABFC);

  /// 2 px box separators.
  static const accent700 = Color(0xFF5D5294);
  static const accent800 = Color(0xFF423A6A);
  static const accent900 = Color(0xFF2B2741);

  /// Given ("hardwired") digits.
  static const neutral100 = Color(0xFFF3F5FE);
  static const neutral500 = Color(0xFF9397AB);
  static const neutral700 = Color(0xFF595D6C);

  /// 1 px cell separators (`text` at 16 % over `bg`, precomposited).
  static const lineThin = Color(0xFF383946);
  static const divider = Color(0x29E9E9ED);
  static const error = Color(0xFFE3645E);
  static const win = Color(0xFF54B66E);
  static const winBright = Color(0xFF7CCD8E);

  /// D11 signal yellow: events and calls to action. Never used for digits.
  static const signal = Color(0xFFFCEE0A);
  static const signalGlow = Color(0x73FCEE0A); // 45 %
  /// Ink on a signal-yellow fill.
  static const signalInk = bg;

  // Cell layers (alpha over the layer below), spec 2.2.
  static const givenTint = Color(0x0EE9E9ED); // 5.5 %
  static const peer = Color(0x179184D9); // 9 %
  static const same = Color(0x389184D9); // 22 %
  static const selected = Color(0x4D9184D9); // 30 %
  static const conflictBg = Color(0x29E3645E); // 16 %
  static const hatch = Color(0x219184D9); // 13 %
}

/// UI, HUD and grid digits.
const uiFont = 'Oxanium';

/// Logo and headings.
const displayFont = 'Orbitron';

/// Oxanium's digits are equal-width already; this keeps timers and counters steady regardless.
const tabularFigures = [FontFeature.tabularFigures()];

ThemeData buildTheme() {
  final base = ThemeData(
    brightness: Brightness.dark,
    colorScheme: const ColorScheme.dark(
      primary: Palette.accent,
      onPrimary: Palette.bg,
      secondary: Palette.accent300,
      surface: Palette.surface,
      onSurface: Palette.text,
      error: Palette.error,
    ),
    scaffoldBackgroundColor: Palette.bg,
    fontFamily: uiFont,
  );
  TextStyle? display(TextStyle? s) => s?.copyWith(
    fontFamily: displayFont,
    fontWeight: FontWeight.w700,
    letterSpacing: 1.2,
  );
  final text = base.textTheme;
  return base.copyWith(
    textTheme: text.copyWith(
      displaySmall: display(text.displaySmall),
      headlineMedium: display(text.headlineMedium),
      headlineSmall: display(text.headlineSmall),
      titleLarge: display(text.titleLarge),
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: Palette.bg,
      foregroundColor: Palette.text,
      elevation: 0,
      titleTextStyle: display(text.titleLarge)
          ?.copyWith(fontSize: 18, color: Palette.text),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: Palette.surface,
      titleTextStyle: display(text.headlineSmall)
          ?.copyWith(fontSize: 20, color: Palette.text),
    ),
  );
}
