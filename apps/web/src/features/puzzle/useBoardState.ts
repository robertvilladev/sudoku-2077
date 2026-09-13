import { useCallback, useMemo, useReducer, useState } from "react";
import { peersOf, stringToGrid, type Grid } from "@sudoku-2077/sudoku-core";
import { useSettings } from "../../lib/settings/SettingsContext.js";

export const MAX_MISTAKES = 3;

export interface UseBoardStateResult {
  grid: Grid;
  givenMask: boolean[];
  conflicts: Set<number>;
  setCell: (index: number, value: number) => void;
  boardString: string;
  isComplete: boolean;
  isGameOver: boolean;
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

type Notes = Record<number, Set<number>>;

interface Snapshot {
  grid: Grid;
  notes: Notes;
}

interface ReducerState extends Snapshot {
  history: Snapshot[];
  mistakeCount: number;
  combo: number;
  maxCombo: number;
}

type Action =
  | { type: "SET_CELL"; index: number; value: number; autoClearNotesOn: boolean }
  | { type: "TOGGLE_NOTE"; index: number; digit: number }
  | { type: "UNDO" };

// A pure reducer, safe to call more than once for the same (state, action) pair — unlike a setState
// updater with side effects, it can't double-count a mistake or push a duplicate history entry.
function reducer(state: ReducerState, action: Action): ReducerState {
  switch (action.type) {
    case "SET_CELL": {
      const { index, value, autoClearNotesOn } = action;
      if (state.grid[index] === value) return state;

      const nextGrid = state.grid.slice();
      nextGrid[index] = value;

      let nextNotes = state.notes;
      if (value !== 0) {
        if (nextNotes[index]?.size) {
          nextNotes = { ...nextNotes };
          delete nextNotes[index];
        }
        if (autoClearNotesOn) {
          for (const peer of peersOf(index)) {
            if (nextNotes[peer]?.has(value)) {
              const updated = new Set(nextNotes[peer]);
              updated.delete(value);
              nextNotes = { ...nextNotes, [peer]: updated };
            }
          }
        }
      }

      let mistakeCount = state.mistakeCount;
      let combo = state.combo;
      let maxCombo = state.maxCombo;
      if (value !== 0) {
        const conflicts = peersOf(index).some((peer) => state.grid[peer] === value);
        if (conflicts) {
          mistakeCount += 1;
          combo = 0;
        } else {
          combo += 1;
          maxCombo = Math.max(maxCombo, combo);
        }
      }

      return {
        grid: nextGrid,
        notes: nextNotes,
        history: [...state.history, { grid: state.grid, notes: state.notes }],
        mistakeCount,
        combo,
        maxCombo,
      };
    }
    case "TOGGLE_NOTE": {
      const { index, digit } = action;
      if (state.grid[index] !== 0) return state;
      const current = new Set(state.notes[index]);
      if (current.has(digit)) {
        current.delete(digit);
      } else {
        current.add(digit);
      }
      return { ...state, notes: { ...state.notes, [index]: current } };
    }
    case "UNDO": {
      if (state.history.length === 0) return state;
      const previous = state.history[state.history.length - 1];
      return {
        ...state,
        grid: previous.grid,
        notes: previous.notes,
        history: state.history.slice(0, -1),
      };
    }
  }
}

function initReducerState(grid: Grid): ReducerState {
  return { grid, notes: {}, history: [], mistakeCount: 0, combo: 0, maxCombo: 0 };
}

// Instant local feedback only (conflict highlighting) — the authoritative check against the stored
// solution always happens server-side via useValidatePuzzle, so the solution never reaches the client.
export function useBoardState(givens: string): UseBoardStateResult {
  const initialGrid = useMemo(() => stringToGrid(givens), [givens]);
  const givenMask = useMemo(() => initialGrid.map((value) => value !== 0), [initialGrid]);
  const { autoClearNotesOn } = useSettings();

  const [state, dispatch] = useReducer(reducer, initialGrid, initReducerState);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState(false);

  const selectCell = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  const toggleNotesMode = useCallback(() => {
    setNotesMode((prev) => !prev);
  }, []);

  const setCell = useCallback(
    (index: number, value: number) => {
      if (givenMask[index]) return;
      if (state.mistakeCount >= MAX_MISTAKES) return;
      dispatch({ type: "SET_CELL", index, value, autoClearNotesOn });
    },
    [givenMask, autoClearNotesOn, state.mistakeCount]
  );

  const eraseCell = useCallback(
    (index: number) => {
      setCell(index, 0);
    },
    [setCell]
  );

  const toggleNote = useCallback(
    (index: number, digit: number) => {
      if (givenMask[index]) return;
      if (state.mistakeCount >= MAX_MISTAKES) return;
      dispatch({ type: "TOGGLE_NOTE", index, digit });
    },
    [givenMask, state.mistakeCount]
  );

  const undo = useCallback(() => {
    dispatch({ type: "UNDO" });
  }, []);

  const conflicts = useMemo(() => {
    const result = new Set<number>();
    state.grid.forEach((value, index) => {
      if (value === 0) return;
      for (const peer of peersOf(index)) {
        if (state.grid[peer] === value) {
          result.add(index);
          break;
        }
      }
    });
    return result;
  }, [state.grid]);

  const boardString = useMemo(() => state.grid.map(String).join(""), [state.grid]);
  const isComplete = useMemo(() => !state.grid.includes(0), [state.grid]);
  const isGameOver = useMemo(() => state.mistakeCount >= MAX_MISTAKES, [state.mistakeCount]);

  return {
    grid: state.grid,
    givenMask,
    conflicts,
    setCell,
    boardString,
    isComplete,
    isGameOver,
    selectedIndex,
    selectCell,
    notesMode,
    toggleNotesMode,
    notes: state.notes,
    toggleNote,
    eraseCell,
    undo,
    canUndo: state.history.length > 0,
    mistakeCount: state.mistakeCount,
    combo: state.combo,
    maxCombo: state.maxCombo,
  };
}
