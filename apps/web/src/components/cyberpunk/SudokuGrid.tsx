import { useCallback, useMemo, type KeyboardEvent } from "react";
import { peersOf } from "@sudoku-2077/sudoku-core";
import type { UseBoardStateResult } from "../../features/puzzle/useBoardState.js";
import { CornerBrackets } from "./CornerBrackets.js";
import { SudokuCell } from "./SudokuCell.js";

interface SudokuGridProps {
  board: UseBoardStateResult;
}

function borderFor(line: number): "none" | "thin" | "thick" {
  if (line === 8) return "none";
  return line % 3 === 2 ? "thick" : "thin";
}

export function SudokuGrid({ board }: SudokuGridProps) {
  const { grid, givenMask, conflicts, notes, selectedIndex, selectCell, setCell, toggleNote, notesMode } =
    board;

  const peerSet = useMemo(
    () => (selectedIndex === null ? new Set<number>() : new Set(peersOf(selectedIndex))),
    [selectedIndex]
  );
  const selectedValue = selectedIndex === null ? 0 : grid[selectedIndex];

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (selectedIndex === null) return;
      const row = Math.floor(selectedIndex / 9);
      const col = selectedIndex % 9;

      switch (event.key) {
        case "ArrowUp":
          if (row > 0) selectCell(selectedIndex - 9);
          event.preventDefault();
          break;
        case "ArrowDown":
          if (row < 8) selectCell(selectedIndex + 9);
          event.preventDefault();
          break;
        case "ArrowLeft":
          if (col > 0) selectCell(selectedIndex - 1);
          event.preventDefault();
          break;
        case "ArrowRight":
          if (col < 8) selectCell(selectedIndex + 1);
          event.preventDefault();
          break;
        case "Backspace":
        case "Delete":
          if (!givenMask[selectedIndex]) setCell(selectedIndex, 0);
          break;
        default:
          if (/^[1-9]$/.test(event.key) && !givenMask[selectedIndex]) {
            if (notesMode) {
              toggleNote(selectedIndex, Number(event.key));
            } else {
              setCell(selectedIndex, Number(event.key));
            }
          }
      }
    },
    [selectedIndex, givenMask, notesMode, selectCell, setCell, toggleNote]
  );

  return (
    <div
      role="grid"
      aria-label="Sudoku board"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="relative mx-auto aspect-square w-full max-w-[560px] rounded-sm border border-accent glow-grid-frame outline-none"
    >
      <CornerBrackets />
      <div className="grid size-full grid-cols-9 grid-rows-9 overflow-hidden rounded-sm">
        {grid.map((value, index) => {
          const row = Math.floor(index / 9);
          const col = index % 9;
          return (
            <SudokuCell
              key={index}
              row={row}
              col={col}
              value={value}
              notes={notes[index]}
              isGiven={givenMask[index]}
              isSelected={selectedIndex === index}
              isPeerHighlighted={peerSet.has(index)}
              isSameValueHighlighted={
                selectedValue !== 0 && value === selectedValue && selectedIndex !== index
              }
              isConflict={conflicts.has(index)}
              borderRight={borderFor(col)}
              borderBottom={borderFor(row)}
              onSelect={() => selectCell(index)}
            />
          );
        })}
      </div>
    </div>
  );
}
