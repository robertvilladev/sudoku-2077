import 'package:flutter/material.dart';

/// The design lab's Night and Day palettes (sRGB hex; web's oklch values hand-converted).
/// Night is the brand default. Day keeps every role but swaps glow for ink: violet is still state,
/// and signal yellow only ever fills, since it is unreadable as text on a light surface.
@immutable
class Palette extends ThemeExtension<Palette> {
  const Palette({
    required this.isDay,
    required this.bg,
    required this.surface,
    required this.surface2,
    required this.cellBg,
    required this.text,
    required this.given,
    required this.accent,
    required this.accent300,
    required this.accent400,
    required this.accent700,
    required this.accent800,
    required this.accent900,
    required this.neutral400,
    required this.neutral500,
    required this.neutral600,
    required this.neutral700,
    required this.divider,
    required this.lineThin,
    required this.givenTint,
    required this.hlPeer,
    required this.hlSame,
    required this.hlSel,
    required this.hlConflict,
    required this.error,
    required this.win,
    required this.signalLine,
    required this.onAccent,
    required this.scrim,
  });

  final bool isDay;
  final Color bg;
  final Color surface;
  final Color surface2;
  final Color cellBg;
  final Color text;
  final Color given;
  final Color accent;
  final Color accent300;
  final Color accent400;
  final Color accent700;
  final Color accent800;
  final Color accent900;
  final Color neutral400;
  final Color neutral500;
  final Color neutral600;
  final Color neutral700;
  final Color divider;
  final Color lineThin;
  final Color givenTint;
  final Color hlPeer;
  final Color hlSame;
  final Color hlSel;
  final Color hlConflict;
  final Color error;
  final Color win;

  /// Brackets and other signal strokes: yellow at night, ink by day.
  final Color signalLine;
  final Color onAccent;
  final Color scrim;

  /// Signal yellow and the ink that sits on it, in both modes.
  Color get signal => const Color(0xFFFCEE0A);
  Color get signalInk => const Color(0xFF161826);

  static const night = Palette(
    isDay: false,
    bg: Color(0xFF161826),
    surface: Color(0xFF232532),
    surface2: Color(0xFF1C1E2C),
    cellBg: Color(0xFF161826),
    text: Color(0xFFE9E9ED),
    given: Color(0xFFF3F5FE),
    accent: Color(0xFF9184D9),
    accent300: Color(0xFFD2CEFD),
    accent400: Color(0xFFB5ABFC),
    accent700: Color(0xFF5D5294),
    accent800: Color(0xFF423A6A),
    accent900: Color(0xFF2B2741),
    neutral400: Color(0xFFB2B6CA),
    neutral500: Color(0xFF9397AB),
    neutral600: Color(0xFF75798C),
    neutral700: Color(0xFF595D6C),
    divider: Color(0x29E9E9ED),
    lineThin: Color(0xFF383946),
    givenTint: Color(0x0EE9E9ED),
    hlPeer: Color(0x179184D9),
    hlSame: Color(0x389184D9),
    hlSel: Color(0x4D9184D9),
    hlConflict: Color(0x29E3645E),
    error: Color(0xFFE3645E),
    win: Color(0xFF54B66E),
    signalLine: Color(0xFFFCEE0A),
    onAccent: Color(0xFF161826),
    scrim: Color(0xC7161826),
  );

  static const day = Palette(
    isDay: true,
    bg: Color(0xFFECEEF6),
    surface: Color(0xFFFFFFFF),
    surface2: Color(0xFFF6F7FB),
    cellBg: Color(0xFFFFFFFF),
    text: Color(0xFF161826),
    given: Color(0xFF161826),
    accent: Color(0xFF6152C9),
    accent300: Color(0xFF4A3FA0),
    accent400: Color(0xFF5446B8),
    accent700: Color(0xFF8F84D6),
    accent800: Color(0xFFC9C3EF),
    accent900: Color(0xFFE3E0F8),
    neutral400: Color(0xFF4C5063),
    neutral500: Color(0xFF5F6377),
    neutral600: Color(0xFF7A7E92),
    neutral700: Color(0xFFA9ADBF),
    divider: Color(0x24161826),
    lineThin: Color(0xFFCFD2E0),
    givenTint: Color(0x0F161826),
    hlPeer: Color(0x146152C9),
    hlSame: Color(0x2E6152C9),
    hlSel: Color(0x426152C9),
    hlConflict: Color(0x24C43A33),
    error: Color(0xFFC43A33),
    win: Color(0xFF1F7A43),
    signalLine: Color(0xFF161826),
    onAccent: Color(0xFFFFFFFF),
    scrim: Color(0xD1ECEEF6),
  );

  @override
  Palette copyWith() => this;

  @override
  Palette lerp(covariant Palette? other, double t) =>
      other == null || t < 0.5 ? this : other;
}

extension PaletteContext on BuildContext {
  Palette get palette => Theme.of(this).extension<Palette>()!;
}

const uiFont = 'Oxanium';
const displayFont = 'Orbitron';

/// Both bundled fonts are variable, so a weight must also set the `wght` axis.
TextStyle weighted(FontWeight weight) => TextStyle(
  fontWeight: weight,
  fontVariations: [FontVariation.weight(weight.value.toDouble())],
);

/// Display face for the wordmark, screen titles and card titles.
TextStyle displayStyle(double size, {Color? color}) => weighted(FontWeight.w800)
    .copyWith(
      fontFamily: displayFont,
      fontSize: size,
      letterSpacing: size * 0.06,
      color: color,
    );

ThemeData buildTheme(Palette p) {
  final base = ThemeData(
    brightness: p.isDay ? Brightness.light : Brightness.dark,
    colorScheme: ColorScheme(
      brightness: p.isDay ? Brightness.light : Brightness.dark,
      primary: p.accent,
      onPrimary: p.onAccent,
      secondary: p.accent300,
      onSecondary: p.bg,
      surface: p.surface,
      onSurface: p.text,
      error: p.error,
      onError: p.bg,
    ),
    scaffoldBackgroundColor: p.bg,
    fontFamily: uiFont,
    extensions: [p],
  );
  const minSize = Size(64, 48);
  return base.copyWith(
    appBarTheme: AppBarTheme(
      backgroundColor: p.bg,
      foregroundColor: p.text,
      elevation: 0,
      scrolledUnderElevation: 0,
      titleTextStyle: displayStyle(15, color: p.given),
    ),
    dialogTheme: DialogThemeData(backgroundColor: p.surface2),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: p.signal,
        foregroundColor: p.signalInk,
        disabledBackgroundColor: p.signal.withValues(alpha: 0.5),
        minimumSize: minSize,
        textStyle: weighted(FontWeight.w600)
            .copyWith(fontFamily: uiFont, letterSpacing: 1),
        shape: BeveledRectangleBorder(
          borderRadius: const BorderRadius.only(
            topRight: Radius.circular(8),
            bottomLeft: Radius.circular(8),
          ),
          side: p.isDay ? BorderSide(color: p.signalInk) : BorderSide.none,
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: p.text,
        minimumSize: minSize,
        side: BorderSide(color: p.accent800),
        textStyle: const TextStyle(fontFamily: uiFont, letterSpacing: 1),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
      ),
    ),
    progressIndicatorTheme: ProgressIndicatorThemeData(color: p.accent),
  );
}
