import 'package:flutter_test/flutter_test.dart';
import 'package:sudoku2077/domain/sudoku.dart';

void main() {
  test('every cell has 20 distinct peers, excluding itself', () {
    for (var i = 0; i < gridSize; i++) {
      final peers = peersOf(i);
      expect(peers.toSet(), hasLength(20));
      expect(peers, isNot(contains(i)));
    }
  });

  test('peers of the top-left cell cover its row, column and box', () {
    expect(peersOf(0).toSet(), {
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      18,
      27,
      36,
      45,
      54,
      63,
      72,
      10,
      11,
      19,
      20,
    });
  });

  test('parseGrid round-trips and rejects malformed strings', () {
    final s = '1${'0' * 80}';
    expect(gridToString(parseGrid(s)), s);
    expect(() => parseGrid('123'), throwsFormatException);
    expect(() => parseGrid('x${'0' * 80}'), throwsFormatException);
  });

  test('Difficulty maps to and from the wire names', () {
    expect(Difficulty.fromWire('HARDCORE'), Difficulty.hardcore);
    expect(() => Difficulty.fromWire('EXPERT'), throwsFormatException);
  });
}
