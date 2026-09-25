import 'package:flutter/material.dart';

/// Flat subset of web's Nocturne palette (`apps/web/src/index.css`). Exact oklch conversion and the
/// bundled JetBrains Mono font are the "Theme parity" roadmap task.
abstract final class Palette {
  static const bg = Color(0xFF161826);
  static const surface = Color(0xFF232532);
  static const text = Color(0xFFE9E9ED);
  static const accent = Color(0xFF9184D9);
  static const accent300 = Color(0xFFD2CEFD);
  static const accent800 = Color(0xFF423A6A);
  static const accent900 = Color(0xFF2B2741);
  static const neutral500 = Color(0xFF9397AB);
  static const neutral700 = Color(0xFF595D6C);
  static const divider = Color(0x29E9E9ED);
  static const error = Color(0xFFE0625A);
  static const win = Color(0xFF5DB67E);
}

const monoFont = 'monospace';

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
    fontFamily: monoFont,
  );
  return base.copyWith(
    appBarTheme: const AppBarTheme(
      backgroundColor: Palette.bg,
      foregroundColor: Palette.text,
      elevation: 0,
    ),
    dialogTheme: const DialogThemeData(backgroundColor: Palette.surface),
  );
}
