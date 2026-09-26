import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/theme.dart';
import '../../../domain/sudoku.dart';
import '../state/board_state.dart';

class SudokuGrid extends StatelessWidget {
  const SudokuGrid({super.key});

  @override
  Widget build(BuildContext context) {
    final board = context.watch<BoardState>();
    final conflicts = board.conflicts;
    final selected = board.selectedIndex;
    final selectedValue = selected == null ? 0 : board.grid[selected];
    final selectedPeers = selected == null
        ? const <int>{}
        : peersOf(selected).toSet();

    Widget cell(int index) => Expanded(
      child: _SudokuCell(
        index: index,
        value: board.grid[index],
        notes: board.notesAt(index),
        isGiven: board.givenMask[index],
        isSelected: index == selected,
        isPeer: selectedPeers.contains(index),
        isSameValue:
            selectedValue != 0 &&
            index != selected &&
            board.grid[index] == selectedValue,
        isConflict: conflicts.contains(index),
        onTap: () => board.selectCell(index),
      ),
    );

    Widget box(int boxRow, int boxCol) => Expanded(
      child: Column(
        spacing: 1,
        children: [
          for (var r = 0; r < 3; r++)
            Expanded(
              child: Row(
                spacing: 1,
                children: [
                  for (var c = 0; c < 3; c++)
                    cell((boxRow * 3 + r) * 9 + boxCol * 3 + c),
                ],
              ),
            ),
        ],
      ),
    );

    return AspectRatio(
      aspectRatio: 1,
      child: Container(
        padding: const EdgeInsets.all(2),
        decoration: BoxDecoration(
          color: Palette.neutral700,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Column(
          spacing: 2,
          children: [
            for (var br = 0; br < 3; br++)
              Expanded(
                child: Row(
                  spacing: 2,
                  children: [for (var bc = 0; bc < 3; bc++) box(br, bc)],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _SudokuCell extends StatelessWidget {
  const _SudokuCell({
    required this.index,
    required this.value,
    required this.notes,
    required this.isGiven,
    required this.isSelected,
    required this.isPeer,
    required this.isSameValue,
    required this.isConflict,
    required this.onTap,
  });

  final int index;
  final int value;
  final Set<int> notes;
  final bool isGiven;
  final bool isSelected;
  final bool isPeer;
  final bool isSameValue;
  final bool isConflict;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final background = isSelected
        ? Palette.accent800
        : isSameValue
        ? Palette.accent900
        : isPeer
        ? const Color(0xFF1D1F2E)
        : Palette.bg;
    final foreground = isConflict
        ? Palette.error
        : isGiven
        ? Palette.text
        : Palette.accent300;

    final row = index ~/ 9 + 1;
    final col = index % 9 + 1;
    final label = value == 0
        ? 'Row $row, column $col, empty'
        : 'Row $row, column $col, ${isGiven ? 'given' : 'entered'} $value';

    return Semantics(
      button: true,
      selected: isSelected,
      label: label,
      excludeSemantics: true,
      child: GestureDetector(
        key: ValueKey('cell-$index'),
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: ColoredBox(
          color: background,
          child: value != 0
              ? Center(
                  child: FittedBox(
                    child: Padding(
                      padding: const EdgeInsets.all(4),
                      child: Text(
                        '$value',
                        style: TextStyle(
                          fontSize: 22,
                          color: foreground,
                          fontWeight: isGiven
                              ? FontWeight.w700
                              : FontWeight.w400,
                        ),
                      ),
                    ),
                  ),
                )
              : notes.isEmpty
              ? const SizedBox.expand()
              : _NotesGrid(notes: notes),
        ),
      ),
    );
  }
}

class _NotesGrid extends StatelessWidget {
  const _NotesGrid({required this.notes});

  final Set<int> notes;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(1),
      child: Column(
        children: [
          for (var r = 0; r < 3; r++)
            Expanded(
              child: Row(
                children: [
                  for (var c = 1; c <= 3; c++)
                    Expanded(
                      child: Center(
                        child: FittedBox(
                          child: Text(
                            notes.contains(r * 3 + c) ? '${r * 3 + c}' : '',
                            style: const TextStyle(
                              fontSize: 9,
                              color: Palette.neutral500,
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
