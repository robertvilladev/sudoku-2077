import 'package:flutter/material.dart';

import '../../../core/theme.dart';

/// How one cell looks. Highlights only change the background, so a given (heavy, given colour, on
/// a tint) and an entry (regular, violet) stay apart in every state. Only a clash recolours a
/// digit, and only the player's: a given can't be the mistake.
class CellStyle {
  const CellStyle({
    required this.background,
    required this.digit,
    required this.weight,
    this.border,
    this.borderWidth = 0,
  });

  final Color background;
  final Color digit;
  final FontWeight weight;
  final Color? border;
  final double borderWidth;
}

CellStyle cellStyleFor(
  Palette p, {
  required bool isGiven,
  required bool isSelected,
  required bool isPeer,
  required bool isSameValue,
  required bool isConflict,
}) {
  final highlight = isConflict
      ? p.hlConflict
      : isSelected
      ? p.hlSel
      : isSameValue
      ? p.hlSame
      : isPeer
      ? p.hlPeer
      : Colors.transparent;
  final base = isGiven ? Color.alphaBlend(p.givenTint, p.cellBg) : p.cellBg;
  final (Color? border, double width) = isSelected
      ? (isConflict ? p.error : p.accent, 2)
      : isConflict
      ? (p.error.withValues(alpha: 0.55), 1)
      : isSameValue
      ? (p.accent.withValues(alpha: 0.45), 1)
      : (null, 0);
  return CellStyle(
    background: Color.alphaBlend(highlight, base),
    digit: isGiven
        ? p.given
        : isConflict
        ? p.error
        : p.accent400,
    weight: isGiven ? FontWeight.w700 : FontWeight.w400,
    border: border,
    borderWidth: width,
  );
}
