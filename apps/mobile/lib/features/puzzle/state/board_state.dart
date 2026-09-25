import 'dart:collection';

import 'package:flutter/foundation.dart';

import '../../../domain/sudoku.dart';
import '../../../domain/units.dart';
import '../../../domain/units.dart' as units show securedBoxes;

const maxMistakes = 3;

/// One move's unit-complete event (spec 4.2). [id] increases on every event so the UI can tell a
/// new completion from a rebuild.
class UnitCompletion {
  const UnitCompletion({
    required this.id,
    required this.origin,
    required this.units,
  });

  final int id;

  /// The changed cell: the ring's centre.
  final int origin;

  /// Newly completed units, ordered rows, columns, boxes (1–3 for a normal placement).
  final List<Unit> units;
}

enum BoardEventKind { placed, clash, erased, completed, gridFull, undo }

/// What the last grid change did, for the event line under the board.
class BoardEvent {
  const BoardEvent({
    required this.seq,
    required this.kind,
    required this.index,
    this.value = 0,
    this.units = const [],
  });

  final int seq;
  final BoardEventKind kind;
  final int index;
  final int value;
  final List<Unit> units;
}

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
  UnitCompletion? _lastCompletion;
  BoardEvent? _lastEvent;
  int _seq = 0;

  // Derived-state cache, keyed on grid identity (the grid is copy-on-write).
  List<int>? _derivedFor;
  Set<int> _conflicts = const {};
  Set<int> _securedBoxes = const {};

  void _derive() {
    if (identical(_derivedFor, _grid)) return;
    _derivedFor = _grid;
    _conflicts = Set.unmodifiable(conflictSet(_grid));
    _securedBoxes = Set.unmodifiable(units.securedBoxes(_grid, _conflicts));
  }

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
    _derive();
    return _conflicts;
  }

  /// Boxes that are complete right now ("sector secured"). Derived from the grid, so undo, erase
  /// and conflict changes remove the hatch with no bookkeeping.
  Set<int> get securedBoxes {
    _derive();
    return _securedBoxes;
  }

  /// The latest unit-complete event. Set by a completing, non-winning [setCell]; kept until the next
  /// completion replaces it; cleared by [undo] (which cancels running effects).
  UnitCompletion? get lastCompletion => _lastCompletion;

  /// What the last grid change did (placement, clash, erase, completion, full grid or undo).
  BoardEvent? get lastEvent => _lastEvent;

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
    var clash = false;

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
        clash = true;
        _mistakeCount++;
        _combo = 0;
      } else {
        _combo++;
        if (_combo > _maxCombo) _maxCombo = _combo;
      }
    }

    final units = newlyCompletedUnits(_grid, nextGrid);
    final seq = ++_seq;
    _history.add(_Snapshot(_grid, _notes));
    _grid = nextGrid;
    _notes = nextNotes;

    final won = isSolvedGrid(_grid, conflicts);
    // On the winning move the win flow takes over: no completion event, so no ring and no chirp.
    if (units.isNotEmpty && !won) {
      _lastCompletion = UnitCompletion(id: seq, origin: index, units: units);
    }
    final BoardEventKind kind;
    if (won) {
      kind = BoardEventKind.gridFull;
    } else if (clash) {
      kind = BoardEventKind.clash;
    } else if (units.isNotEmpty) {
      kind = BoardEventKind.completed;
    } else {
      kind = value == 0 ? BoardEventKind.erased : BoardEventKind.placed;
    }
    _lastEvent = BoardEvent(
      seq: seq,
      kind: kind,
      index: index,
      value: value,
      units: kind == BoardEventKind.completed ? units : const [],
    );
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
    _lastCompletion = null;
    _lastEvent = BoardEvent(
      seq: ++_seq,
      kind: BoardEventKind.undo,
      index: _selectedIndex ?? 0,
    );
    notifyListeners();
  }
}
