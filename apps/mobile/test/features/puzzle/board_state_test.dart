import 'package:flutter_test/flutter_test.dart';
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
}
