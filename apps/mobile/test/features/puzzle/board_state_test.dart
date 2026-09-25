import 'package:flutter_test/flutter_test.dart';
import 'package:sudoku2077/domain/units.dart';
import 'package:sudoku2077/features/puzzle/data/mock_api.dart';
import 'package:sudoku2077/features/puzzle/state/board_state.dart';

// mockGivens row 0: 5 3 0 | 0 7 0 | 0 0 0 — index 2 is empty, 0/1/4 are givens.
BoardState newBoard({bool autoClearNotes = true}) =>
    BoardState(givens: mockGivens, autoClearNotes: autoClearNotes);

void main() {
  test('givens cannot be overwritten', () {
    final board = newBoard()..setCell(0, 9);
    expect(board.grid[0], 5);
    expect(board.canUndo, isFalse);
  });

  test('a non-conflicting placement builds combo and maxCombo', () {
    final board = newBoard()
      ..setCell(2, 4)
      ..setCell(3, 6);
    expect(board.combo, 2);
    expect(board.maxCombo, 2);
    expect(board.mistakeCount, 0);
  });

  test('a peer conflict is a mistake and resets the combo', () {
    final board = newBoard()
      ..setCell(2, 4)
      ..setCell(3, 5); // 5 is already given at index 0 in the same row
    expect(board.mistakeCount, 1);
    expect(board.combo, 0);
    expect(board.maxCombo, 1);
    expect(board.conflicts, containsAll([0, 3]));
  });

  test(
    'a wrong digit with no visible conflict is accepted (peer-conflict rule)',
    () {
      final board = newBoard()
        ..setCell(2, 2); // solution is 4, but 2 conflicts with nothing visible
      expect(board.mistakeCount, 0);
      expect(board.combo, 1);
    },
  );

  test('three mistakes end the game and freeze input', () {
    final board = newBoard()
      ..setCell(2, 5)
      ..setCell(3, 5)
      ..setCell(5, 5);
    expect(board.isGameOver, isTrue);
    board
      ..setCell(6, 1)
      ..toggleNote(6, 1);
    expect(board.grid[6], 0);
    expect(board.notesAt(6), isEmpty);
  });

  test('undo restores grid and notes but keeps mistakes counted', () {
    final board = newBoard()
      ..toggleNote(2, 4)
      ..setCell(2, 5);
    expect(board.notesAt(2), isEmpty);
    board.undo();
    expect(board.grid[2], 0);
    expect(board.notesAt(2), {4});
    expect(board.mistakeCount, 1);
    expect(board.canUndo, isFalse);
  });

  test('notes toggle on and off, and not on filled cells', () {
    final board = newBoard()
      ..toggleNote(2, 1)
      ..toggleNote(2, 2)
      ..toggleNote(2, 1);
    expect(board.notesAt(2), {2});
    board.toggleNote(0, 1);
    expect(board.notesAt(0), isEmpty);
  });

  test('placing a digit clears that digit from peer notes when enabled', () {
    final board = newBoard()
      ..toggleNote(3, 4)
      ..toggleNote(3, 6)
      ..setCell(2, 4);
    expect(board.notesAt(3), {6});

    final manual = newBoard(autoClearNotes: false)
      ..toggleNote(3, 4)
      ..setCell(2, 4);
    expect(manual.notesAt(3), {4});
  });

  test('inputDigit respects selection and notes mode', () {
    final board = newBoard()..inputDigit(4);
    expect(board.grid[2], 0);
    board
      ..selectCell(2)
      ..toggleNotesMode()
      ..inputDigit(4);
    expect(board.notesAt(2), {4});
    board
      ..toggleNotesMode()
      ..inputDigit(4);
    expect(board.grid[2], 4);
    board.eraseSelected();
    expect(board.grid[2], 0);
  });

  test('completion, board string and remaining counts', () {
    final board = BoardState(givens: mockNearlySolvedGivens);
    expect(board.isComplete, isFalse);
    expect(board.remaining(5), 2);
    board
      ..setCell(0, 5)
      ..setCell(40, 5)
      ..setCell(80, 9);
    expect(board.isComplete, isTrue);
    expect(board.boardString, mockSolution);
    expect(board.remaining(5), 0);
  });

  test('notifies listeners on changes only', () {
    final board = newBoard();
    var calls = 0;
    board
      ..addListener(() => calls++)
      ..setCell(0, 9)
      ..setCell(2, 4)
      ..setCell(2, 4);
    expect(calls, 1);
  });

  group('unit-complete events', () {
    // mockNearlySolvedGivens: the solution with indexes 0, 40 and 80 blank. Boxes 1, 2, 3, 5, 6 and
    // 7 (0-based) are full from the start.
    const initiallySecured = {1, 2, 3, 5, 6, 7};

    test('secured boxes are derived from the grid at load, with no event', () {
      final board = BoardState(givens: mockNearlySolvedGivens);
      expect(board.securedBoxes, initiallySecured);
      expect(board.lastCompletion, isNull);
      expect(board.lastEvent, isNull);
    });

    test('a completing move exposes its units, origin and the new box', () {
      final board = BoardState(givens: mockNearlySolvedGivens)..setCell(40, 5);
      final completion = board.lastCompletion!;
      expect(completion.origin, 40);
      expect(completion.units, const [
        Unit(UnitKind.row, 4),
        Unit(UnitKind.col, 4),
        Unit(UnitKind.box, 4),
      ]);
      expect(board.securedBoxes, {...initiallySecured, 4});
      expect(board.lastEvent!.kind, BoardEventKind.completed);
      expect(board.lastEvent!.units, completion.units);
    });

    test('ids increase per completion; plain moves keep the last one', () {
      final board = BoardState(givens: mockGivens)..setCell(2, 4);
      expect(board.lastCompletion, isNull);
      expect(board.lastEvent!.kind, BoardEventKind.placed);

      final near = BoardState(givens: mockNearlySolvedGivens)..setCell(40, 5);
      final first = near.lastCompletion!.id;
      near.setCell(0, 5);
      expect(near.lastCompletion!.id, greaterThan(first));
      expect(near.lastCompletion!.origin, 0);
    });

    test('undo clears the event and un-secures the box', () {
      final board = BoardState(givens: mockNearlySolvedGivens)
        ..setCell(40, 5)
        ..undo();
      expect(board.lastCompletion, isNull);
      expect(board.lastEvent!.kind, BoardEventKind.undo);
      expect(board.securedBoxes, initiallySecured);
    });

    test(
      'a conflicting digit completes nothing and breaks the peers it hits',
      () {
        // A 1 in the centre clashes with the 1 at R5C9 (box 5) and R8C5 (box 7), so those boxes are
        // no longer secured either; undo restores them.
        final board = BoardState(givens: mockNearlySolvedGivens)
          ..setCell(40, 1);
        expect(board.lastCompletion, isNull);
        expect(board.lastEvent!.kind, BoardEventKind.clash);
        expect(board.securedBoxes, {1, 2, 3, 6});
        board.undo();
        expect(board.securedBoxes, initiallySecured);
      },
    );

    test('the winning move raises no completion event', () {
      final board = BoardState(givens: mockNearlySolvedGivens)
        ..setCell(0, 5)
        ..setCell(40, 5);
      final beforeWin = board.lastCompletion!.id;
      board.setCell(80, 9);
      expect(board.lastCompletion!.id, beforeWin);
      expect(board.lastEvent!.kind, BoardEventKind.gridFull);
      expect(board.securedBoxes, hasLength(9));
    });

    test('erase is an event and removes the hatch', () {
      final board = BoardState(givens: mockNearlySolvedGivens)
        ..setCell(40, 5)
        ..setCell(40, 0);
      expect(board.lastEvent!.kind, BoardEventKind.erased);
      expect(board.securedBoxes, initiallySecured);
    });
  });
}
