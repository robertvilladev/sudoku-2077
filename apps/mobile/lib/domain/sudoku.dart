/// Pure-Dart board rules: the ~20 lines of `packages/sudoku-core` the client needs.
library;

const gridSize = 81;

enum Difficulty {
  easy('EASY', 'ROOKIE RUN'),
  medium('MEDIUM', 'STREET LEVEL'),
  hard('HARD', 'CORPO GRADE'),
  hardcore('HARDCORE', 'GHOST PROTOCOL');

  const Difficulty(this.wireName, this.flavor);

  final String wireName;
  final String flavor;

  static Difficulty fromWire(String value) => Difficulty.values.firstWhere(
    (d) => d.wireName == value,
    orElse: () => throw FormatException('Unknown difficulty "$value"'),
  );
}

List<int> parseGrid(String s) {
  if (s.length != gridSize) {
    throw FormatException(
      'Expected an $gridSize-character puzzle string, got ${s.length}',
    );
  }
  return List<int>.generate(gridSize, (i) {
    final digit = s.codeUnitAt(i) - 0x30;
    if (digit < 0 || digit > 9) {
      throw FormatException('Invalid character at $i in puzzle string');
    }
    return digit;
  });
}

String gridToString(List<int> grid) => grid.join();

final List<List<int>> _peers = List.generate(gridSize, (index) {
  final row = index ~/ 9;
  final col = index % 9;
  final boxRow = row ~/ 3 * 3;
  final boxCol = col ~/ 3 * 3;
  final peers = <int>{};
  for (var i = 0; i < 9; i++) {
    peers.add(row * 9 + i);
    peers.add(i * 9 + col);
    peers.add((boxRow + i ~/ 3) * 9 + boxCol + i % 3);
  }
  peers.remove(index);
  return List.unmodifiable(peers);
}, growable: false);

List<int> peersOf(int index) => _peers[index];
