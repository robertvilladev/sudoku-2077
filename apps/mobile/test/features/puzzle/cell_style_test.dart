import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sudoku2077/core/theme.dart';
import 'package:sudoku2077/features/puzzle/ui/cell_style.dart';

const p = Palette.night;

CellStyle s({
  bool given = false,
  bool sel = false,
  bool peer = false,
  bool same = false,
  bool conflict = false,
}) => cellStyleFor(
  p,
  isGiven: given,
  isSelected: sel,
  isPeer: peer,
  isSameValue: same,
  isConflict: conflict,
);

void main() {
  test('givens are heavy on a tint; entries are violet and regular', () {
    expect(s(given: true).digit, p.given);
    expect(s(given: true).weight, FontWeight.w700);
    expect(s(given: true).background, isNot(p.cellBg));
    expect(s().digit, p.accent400);
    expect(s().weight, FontWeight.w400);
    expect(s().background, p.cellBg);
  });

  test('the same-value highlight changes the background only', () {
    expect(s(given: true, same: true).digit, p.given);
    expect(s(same: true).digit, p.accent400);
    expect(s(same: true).background, isNot(s().background));
    expect(s(peer: true).background, isNot(s().background));
  });

  test('a clash turns an entry red but leaves a given its colour', () {
    expect(s(conflict: true).digit, p.error);
    expect(s(given: true, conflict: true).digit, p.given);
    expect(
      s(given: true, conflict: true).background,
      isNot(s(given: true).background),
    );
  });

  test('selection draws a 2 px accent border, red when in a clash', () {
    expect(s(sel: true).border, p.accent);
    expect(s(sel: true).borderWidth, 2);
    expect(s(sel: true, conflict: true).border, p.error);
    expect(s().border, isNull);
  });
}
