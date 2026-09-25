import 'package:flutter_test/flutter_test.dart';
import 'package:sudoku2077/domain/sudoku.dart';
import 'package:sudoku2077/domain/units.dart';
import 'package:sudoku2077/features/puzzle/data/mock_api.dart';

final solved = parseGrid(mockSolution);

/// The solved grid with [blanks] emptied.
List<int> without(Set<int> blanks) => [
  for (var i = 0; i < gridSize; i++) blanks.contains(i) ? 0 : solved[i],
];

const row0 = Unit(UnitKind.row, 0);
const col0 = Unit(UnitKind.col, 0);
const box0 = Unit(UnitKind.box, 0);

void main() {
  test('unitCells covers rows, columns and boxes in reading order', () {
    expect(unitCells(const Unit(UnitKind.row, 1)), [
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
    ]);
    expect(unitCells(const Unit(UnitKind.col, 2)), [
      2,
      11,
      20,
      29,
      38,
      47,
      56,
      65,
      74,
    ]);
    expect(unitCells(const Unit(UnitKind.box, 4)), [
      30,
      31,
      32,
      39,
      40,
      41,
      48,
      49,
      50,
    ]);
    expect(allUnits, hasLength(27));
    // Every cell sits in exactly one row, one column and one box.
    final counts = List.filled(gridSize, 0);
    for (final u in allUnits) {
      for (final i in unitCells(u)) {
        counts[i]++;
      }
    }
    expect(counts, everyElement(3));
  });

  test('a solved grid has all 27 units complete and 9 secured boxes', () {
    expect(completeUnits(solved), allUnits);
    expect(securedBoxes(solved), {0, 1, 2, 3, 4, 5, 6, 7, 8});
    expect(isSolvedGrid(solved), isTrue);
    expect(completeUnits(List.filled(gridSize, 0)), isEmpty);
  });

  test('filling a row completes only the row', () {
    // R2C1 (index 9) stays blank, so column 1 and box 1 are still open.
    final prev = without({0, 9});
    final next = without({9});
    expect(newlyCompletedUnits(prev, next), [row0]);
  });

  test('filling a column completes only the column', () {
    final prev = without({0, 1}); // index 1 keeps row 1 and box 1 open
    final next = without({1});
    expect(newlyCompletedUnits(prev, next), [col0]);
  });

  test('filling a box completes only the box', () {
    final prev = without({
      0,
      3,
      27,
    }); // 3 keeps row 1 open, 27 keeps column 1 open
    final next = without({3, 27});
    expect(newlyCompletedUnits(prev, next), [box0]);
  });

  test('one move can complete row, column and box together, ordered', () {
    final prev = without({0, 80});
    final next = without({80});
    expect(newlyCompletedUnits(prev, next), [row0, col0, box0]);
  });

  test('a duplicate inside a full unit blocks it', () {
    final grid = List.of(solved)..[1] = 5; // row 1 now has two 5s
    expect(completeUnits(grid), isNot(contains(row0)));
    expect(conflictSet(grid), containsAll([0, 1]));
  });

  test('a conflict outside the unit blocks it (board-wide conflict set)', () {
    // R2C1 becomes 5, clashing with the 5 at R1C1 through column 1. Row 1 itself has no
    // duplicate, but its first cell is in conflict, so it is not complete.
    final grid = List.of(solved)..[9] = 5;
    expect(unitCells(row0).map((i) => grid[i]).toSet(), hasLength(9));
    expect(conflictSet(grid), contains(0));
    expect(completeUnits(grid), isNot(contains(row0)));
    expect(isSolvedGrid(grid), isFalse);
  });

  test(
    'resolving a conflict completes units that do not contain the changed cell',
    () {
      final prev = List.of(solved)..[9] = 5;
      final newly = newlyCompletedUnits(prev, solved);
      expect(newly, contains(row0)); // row 1 does not contain index 9
      expect(unitCells(row0), isNot(contains(9)));
    },
  );

  test('undo un-completes: reversing the move reports nothing new', () {
    final before = without({40});
    final after = solved;
    expect(newlyCompletedUnits(before, after), hasLength(3));
    expect(newlyCompletedUnits(after, before), isEmpty);
    expect(securedBoxes(before), isNot(contains(4)));
    expect(securedBoxes(after), contains(4));
  });

  test('labels and announcements are 1-based', () {
    expect(const Unit(UnitKind.row, 4).label, 'ROW 5');
    expect(const Unit(UnitKind.col, 4).label, 'COL 5');
    expect(const Unit(UnitKind.box, 4).label, 'SECTOR 5');
    expect(const Unit(UnitKind.col, 6).announcement, 'Column 7 complete');
    expect(const Unit(UnitKind.box, 0).announcement, 'Box 1 complete');
  });
}
