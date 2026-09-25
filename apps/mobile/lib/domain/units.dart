/// Unit-complete detection (spec section 4.1), a line-by-line port of the planned
/// `packages/sudoku-core/src/units.ts`. Pure Dart.
///
/// "Complete" means all nine cells are filled and none of them is in the board-wide peer-conflict
/// set. It does NOT mean "correct": the client has no solution (see Phase 2.7).
library;

import 'sudoku.dart';

enum UnitKind { row, col, box }

class Unit {
  const Unit(this.kind, this.index);

  final UnitKind kind;

  /// 0..8. Boxes are numbered left to right, top to bottom.
  final int index;

  /// Event-line name: `ROW 5`, `COL 5`, `SECTOR 5` (1-based).
  String get label => switch (kind) {
    UnitKind.row => 'ROW ${index + 1}',
    UnitKind.col => 'COL ${index + 1}',
    UnitKind.box => 'SECTOR ${index + 1}',
  };

  /// Screen-reader wording: `Row 5 complete`.
  String get announcement => switch (kind) {
    UnitKind.row => 'Row ${index + 1} complete',
    UnitKind.col => 'Column ${index + 1} complete',
    UnitKind.box => 'Box ${index + 1} complete',
  };

  @override
  bool operator ==(Object other) =>
      other is Unit && other.kind == kind && other.index == index;

  @override
  int get hashCode => Object.hash(kind, index);

  @override
  String toString() => '${kind.name}$index';
}

/// The nine cell indexes of [u], in reading order.
List<int> unitCells(Unit u) => _unitCells[u.kind.index * 9 + u.index];

/// All 27 units, ordered rows, columns, boxes.
final List<Unit> allUnits = List.unmodifiable([
  for (final kind in UnitKind.values)
    for (var index = 0; index < 9; index++) Unit(kind, index),
]);

final List<List<int>> _unitCells = List.unmodifiable([
  for (final kind in UnitKind.values)
    for (var index = 0; index < 9; index++)
      List<int>.unmodifiable([
        for (var k = 0; k < 9; k++)
          switch (kind) {
            UnitKind.row => index * 9 + k,
            UnitKind.col => k * 9 + index,
            UnitKind.box =>
              (index ~/ 3 * 3 + k ~/ 3) * 9 + index % 3 * 3 + k % 3,
          },
      ]),
]);

/// Board-wide peer-conflict set: every filled cell that shares its value with a peer.
Set<int> conflictSet(List<int> grid) {
  final out = <int>{};
  for (var i = 0; i < gridSize; i++) {
    final v = grid[i];
    if (v != 0 && peersOf(i).any((p) => grid[p] == v)) out.add(i);
  }
  return out;
}

/// Units whose nine cells are all filled and conflict-free, ordered rows, columns, boxes.
List<Unit> completeUnits(List<int> grid, [Set<int>? conflicts]) {
  final c = conflicts ?? conflictSet(grid);
  return [
    for (final u in allUnits)
      if (unitCells(u).every((i) => grid[i] != 0 && !c.contains(i))) u,
  ];
}

/// Units complete in [next] but not in [prev], ordered rows, columns, boxes.
///
/// Compares all 27 units, not just the changed cell's three: an overwrite or erase can clear a
/// conflict elsewhere and complete a unit that doesn't contain the changed cell.
List<Unit> newlyCompletedUnits(List<int> prev, List<int> next) {
  final before = completeUnits(prev).toSet();
  return [
    for (final u in completeUnits(next))
      if (!before.contains(u)) u,
  ];
}

/// Boxes that are currently complete ("sector secured"). Derived state: undo just works.
Set<int> securedBoxes(List<int> grid, [Set<int>? conflicts]) => {
  for (final u in completeUnits(grid, conflicts))
    if (u.kind == UnitKind.box) u.index,
};

/// Full and conflict-free: the win condition the client can know without the solution.
bool isSolvedGrid(List<int> grid, [Set<int>? conflicts]) =>
    !grid.contains(0) && (conflicts ?? conflictSet(grid)).isEmpty;
