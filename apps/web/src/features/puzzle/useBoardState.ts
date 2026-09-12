import { useCallback, useMemo, useState } from "react";
import { peersOf, stringToGrid, type Grid } from "@sudoku-2077/sudoku-core";

export interface UseBoardStateResult {
  grid: Grid;
  givenMask: boolean[];
  conflicts: Set<number>;
  setCell: (index: number, value: number) => void;
  boardString: string;
  isComplete: boolean;
  selectedIndex: number | null;
  selectCell: (index: number) => void;
  notesMode: boolean;
  toggleNotesMode: () => void;
  notes: Record<number, Set<number>>;
  toggleNote: (index: number, digit: number) => void;
  eraseCell: (index: number) => void;
  undo: () => void;
  canUndo: boolean;
  mistakeCount: number;
  combo: number;
  maxCombo: number;
}

// Instant local feedback only (conflict highlighting) — the authoritative check against the stored
// solution always happens server-side via useValidatePuzzle, so the solution never reaches the client.
export function useBoardState(givens: string): UseBoardStateResult {
  const initialGrid = useMemo(() => stringToGrid(givens), [givens]);
  const givenMask = useMemo(() => initialGrid.map((value) => value !== 0), [initialGrid]);
  const [grid, setGrid] = useState<Grid>(initialGrid);
  const [history, setHistory] = useState<Grid[]>([]);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [notes, setNotes] = useState<Record<number, Set<number>>>({});

  // Mistakes/combo are derived entirely client-side (there's no server-side mistake-tracking
  // endpoint) from whether a placed digit conflicts with a peer at the moment it's placed.
  const [mistakeCount, setMistakeCount] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);

  const selectCell = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  const toggleNotesMode = useCallback(() => {
    setNotesMode((prev) => !prev);
  }, []);

  const setCell = useCallback(
    (index: number, value: number) => {
      if (givenMask[index]) return;

      setGrid((prev) => {
        if (prev[index] === value) return prev;

        setHistory((prevHistory) => [...prevHistory, prev]);

        if (value !== 0) {
          const conflicts = peersOf(index).some((peer) => prev[peer] === value);
          if (conflicts) {
            setMistakeCount((count) => count + 1);
            setCombo(0);
          } else {
            setCombo((count) => {
              const next = count + 1;
              setMaxCombo((max) => Math.max(max, next));
              return next;
            });
          }
          setNotes((prevNotes) => {
            if (!prevNotes[index]?.size) return prevNotes;
            const next = { ...prevNotes };
            delete next[index];
            return next;
          });
        }

        const next = prev.slice();
        next[index] = value;
        return next;
      });
    },
    [givenMask]
  );

  const eraseCell = useCallback(
    (index: number) => {
      setCell(index, 0);
    },
    [setCell]
  );

  const toggleNote = useCallback(
    (index: number, digit: number) => {
      if (givenMask[index] || grid[index] !== 0) return;
      setNotes((prev) => {
        const current = new Set(prev[index]);
        if (current.has(digit)) {
          current.delete(digit);
        } else {
          current.add(digit);
        }
        return { ...prev, [index]: current };
      });
    },
    [givenMask, grid]
  );

  const undo = useCallback(() => {
    setHistory((prevHistory) => {
      if (prevHistory.length === 0) return prevHistory;
      const previous = prevHistory[prevHistory.length - 1];
      setGrid(previous);
      return prevHistory.slice(0, -1);
    });
  }, []);

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

  return {
    grid,
    givenMask,
    conflicts,
    setCell,
    boardString,
    isComplete,
    selectedIndex,
    selectCell,
    notesMode,
    toggleNotesMode,
    notes,
    toggleNote,
    eraseCell,
    undo,
    canUndo: history.length > 0,
    mistakeCount,
    combo,
    maxCombo,
  };
}
