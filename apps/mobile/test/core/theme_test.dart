import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sudoku2077/core/theme.dart';

double _luminance(Color c) {
  double channel(double v) =>
      v <= 0.03928 ? v / 12.92 : math.pow((v + 0.055) / 1.055, 2.4).toDouble();
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

double contrast(Color a, Color b) {
  final x = _luminance(a), y = _luminance(b);
  return (math.max(x, y) + 0.05) / (math.min(x, y) + 0.05);
}

void main() {
  test('night is dark, day is light, both carry their palette', () {
    final night = buildTheme(Palette.night), day = buildTheme(Palette.day);
    expect(night.brightness, Brightness.dark);
    expect(day.brightness, Brightness.light);
    expect(day.extension<Palette>(), same(Palette.day));
    expect(night.textTheme.bodyMedium!.fontFamily, uiFont);
  });

  test(
    'button text uses the UI font (a button textStyle replaces the theme one)',
    () {
      final theme = buildTheme(Palette.night);
      TextStyle? text(ButtonStyle? s) => s!.textStyle!.resolve({});
      expect(text(theme.filledButtonTheme.style)!.fontFamily, uiFont);
      expect(text(theme.outlinedButtonTheme.style)!.fontFamily, uiFont);
    },
  );

  for (final p in [Palette.night, Palette.day]) {
    test('${p.isDay ? 'day' : 'night'} text pairs reach 4.5:1', () {
      expect(contrast(p.given, p.cellBg), greaterThanOrEqualTo(4.5));
      expect(contrast(p.accent400, p.cellBg), greaterThanOrEqualTo(4.5));
      expect(contrast(p.neutral500, p.bg), greaterThanOrEqualTo(4.5));
      expect(contrast(p.error, p.cellBg), greaterThanOrEqualTo(4.5));
      expect(contrast(p.signalInk, p.signal), greaterThanOrEqualTo(4.5));
    });
  }
}
