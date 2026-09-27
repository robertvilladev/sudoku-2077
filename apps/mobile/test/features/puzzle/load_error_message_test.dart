import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sudoku2077/features/puzzle/data/api_client.dart';
import 'package:sudoku2077/features/puzzle/ui/board_screen.dart';
import 'package:sudoku2077/l10n/l10n.dart';

void main() {
  final l10n = lookupAppLocalizations(const Locale('en'));

  test('known codes map to catalog copy, never to the server text', () {
    const empty = ApiException(
      'No puzzles for EASY',
      statusCode: 404,
      code: 'NO_PUZZLES_AVAILABLE',
    );
    expect(loadErrorMessage(l10n, empty), l10n.errorNoPuzzles);
  });

  test('network failures, unknown codes and bad payloads fall back', () {
    expect(
      loadErrorMessage(l10n, const ApiException('timeout')),
      l10n.errorNetwork,
    );
    expect(
      loadErrorMessage(l10n, const ApiException('x', statusCode: 418)),
      l10n.errorGeneric,
    );
    expect(
      loadErrorMessage(l10n, const FormatException('bad')),
      l10n.errorGeneric,
    );
  });
}
