import 'dart:collection';

import 'package:flutter/foundation.dart';

import '../../../domain/sudoku.dart';

const maxMistakes = 3;

class _Snapshot {
  const _Snapshot(this.grid, this.notes);

  final List<int> grid;
  final Map<int, Set<int>> notes;
}

/// Port of `apps/web/src/features/puzzle/useBoardState.ts`. A mistake is a peer conflict, not a
/// solution mismatch — keep this rule identical to web's. The server's `/validate` is the authority.
///
/// Grid and notes are copy-on-write: history snapshots share them, so never mutate them in place.
class BoardState extends ChangeNotifier {
  BoardState({required String givens, this.autoClearNotes = true})
    : _grid = parseGrid(givens) {
    givenMask = List.unmodifiable(_grid.map((v) => v != 0));
  }

  final bool autoClearNotes;
  late final List<bool> givenMask;

  List<int> _grid;
  Map<int, Set<int>> _notes = const {};
  final List<_Snapshot> _history = [];
  int _mistakeCount = 0;
  int _combo = 0;
  int _maxCombo = 0;
  int? _selectedIndex;
  bool _notesMode = false;

  List<int> get grid => UnmodifiableListView(_grid);
  Set<int> notesAt(int index) => _notes[index] ?? const {};
  int get mistakeCount => _mistakeCount;
  int get combo => _combo;
  int get maxCombo => _maxCombo;
  int? get selectedIndex => _selectedIndex;
  bool get notesMode => _notesMode;
  bool get canUndo => _history.isNotEmpty;
  bool get isGameOver => _mistakeCount >= maxMistakes;
  bool get isComplete => !_grid.contains(0);
  String get boardString => gridToString(_grid);

  Set<int> get conflicts {
    final result = <int>{};
    for (var i = 0; i < gridSize; i++) {
      final value = _grid[i];
      if (value != 0 && peersOf(i).any((p) => _grid[p] == value)) result.add(i);
    }
    return result;
  }

  int remaining(int digit) => 9 - _grid.where((v) => v == digit).length;

  void selectCell(int index) {
    if (_selectedIndex == index) return;
    _selectedIndex = index;
    notifyListeners();
  }

  void toggleNotesMode() {
    _notesMode = !_notesMode;
    notifyListeners();
  }

  /// Number-pad entry: a note in notes mode, otherwise a placement.
  void inputDigit(int digit) {
    final index = _selectedIndex;
    if (index == null) return;
    if (_notesMode) {
      toggleNote(index, digit);
    } else {
      setCell(index, digit);
    }
  }

  void eraseSelected() {
    final index = _selectedIndex;
    if (index != null) setCell(index, 0);
  }

  void setCell(int index, int value) {
    if (givenMask[index] || isGameOver) return;
    if (_grid[index] == value) return;

    final nextGrid = List<int>.of(_grid)..[index] = value;
    var nextNotes = _notes;

    if (value != 0) {
      if (nextNotes[index]?.isNotEmpty ?? false) {
        nextNotes = Map.of(nextNotes)..remove(index);
      }
      if (autoClearNotes) {
        for (final peer in peersOf(index)) {
          final peerNotes = nextNotes[peer];
          if (peerNotes != null && peerNotes.contains(value)) {
            nextNotes = Map.of(nextNotes)
              ..[peer] = (Set.of(peerNotes)..remove(value));
          }
        }
      }

      if (peersOf(index).any((p) => _grid[p] == value)) {
        _mistakeCount++;
        _combo = 0;
      } else {
        _combo++;
        if (_combo > _maxCombo) _maxCombo = _combo;
      }
    }

    _history.add(_Snapshot(_grid, _notes));
    _grid = nextGrid;
    _notes = nextNotes;
    notifyListeners();
  }

  void toggleNote(int index, int digit) {
    if (givenMask[index] || isGameOver || _grid[index] != 0) return;
    final current = Set.of(notesAt(index));
    if (!current.remove(digit)) current.add(digit);
    _notes = Map.of(_notes)..[index] = current;
    notifyListeners();
  }

  /// Restores grid and notes only; mistakes and combo stay counted, as on web.
  void undo() {
    if (_history.isEmpty) return;
    final previous = _history.removeLast();
    _grid = previous.grid;
    _notes = previous.notes;
    notifyListeners();
  }
}
