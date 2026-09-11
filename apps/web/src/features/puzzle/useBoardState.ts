import { useCallback, useMemo, useState } from "react";
import { peersOf, stringToGrid, type Grid } from "@sudoku-2077/sudoku-core";

export interface UseBoardStateResult {
  grid: Grid;
  givenMask: boolean[];
  conflicts: Set<number>;
  setCell: (index: number, value: number) => void;
  boardString: string;
  isComplete: boolean;
}

// Instant local feedback only (conflict highlighting) — the authoritative check against the stored
// solution always happens server-side via useValidatePuzzle, so the solution never reaches the client.
export function useBoardState(givens: string): UseBoardStateResult {
  const initialGrid = useMemo(() => stringToGrid(givens), [givens]);
  const givenMask = useMemo(() => initialGrid.map((value) => value !== 0), [initialGrid]);
  const [grid, setGrid] = useState<Grid>(initialGrid);

  const setCell = useCallback(
    (index: number, value: number) => {
      if (givenMask[index]) return;
      setGrid((prev) => {
        const next = prev.slice();
        next[index] = value;
        return next;
      });
    },
    [givenMask]
  );

  const conflicts = useMemo(() => {
    const result = new Set<number>();
    grid.forEach((value, index) => {
      if (value === 0) return;
      for (const peer of peersOf(index)) {
        if (grid[peer] === value) {
          result.add(index);
          break;
        }
      }
    });
    return result;
  }, [grid]);

  const boardString = useMemo(() => grid.map(String).join(""), [grid]);
  const isComplete = useMemo(() => !grid.includes(0), [grid]);

  return { grid, givenMask, conflicts, setCell, boardString, isComplete };
}
