export interface StoredProgress {
  grid: number[];
  notes: Record<number, Set<number>>;
  mistakeCount: number;
  combo: number;
  maxCombo: number;
  elapsedSeconds: number;
}

// Set isn't JSON-serializable — array on the wire, Set in memory. Conversion happens only here.
interface StoredProgressWire {
  grid: number[];
  notes: Record<number, number[]>;
  mistakeCount: number;
  combo: number;
  maxCombo: number;
  elapsedSeconds: number;
}

function storageKey(puzzleId: string): string {
  return `sudoku2077.progress.${puzzleId}`;
}

// A syntactically valid but malformed entry (e.g. missing/non-numeric fields from a future schema
// change, or hand-edited storage) must be rejected here, at the boundary — otherwise `undefined`
// numeric fields silently corrupt the reducer's arithmetic (mistakeCount/combo becoming NaN) instead
// of falling back to a fresh board like a missing entry does.
function isValidWire(wire: StoredProgressWire): boolean {
  if (!Array.isArray(wire.grid) || !wire.grid.every((v) => Number.isInteger(v))) return false;
  if (
    !Number.isFinite(wire.mistakeCount) ||
    !Number.isFinite(wire.combo) ||
    !Number.isFinite(wire.maxCombo) ||
    !Number.isFinite(wire.elapsedSeconds)
  ) {
    return false;
  }
  if (typeof wire.notes !== "object" || wire.notes === null) return false;
  return Object.values(wire.notes).every(
    (digits) => Array.isArray(digits) && digits.every((d) => Number.isInteger(d))
  );
}

export function readProgress(puzzleId: string): StoredProgress | null {
  try {
    const raw = localStorage.getItem(storageKey(puzzleId));
    if (!raw) return null;
    const wire = JSON.parse(raw) as StoredProgressWire;
    if (!isValidWire(wire)) return null;
    const notes: Record<number, Set<number>> = {};
    for (const [index, digits] of Object.entries(wire.notes)) {
      notes[Number(index)] = new Set(digits);
    }
    return { ...wire, notes };
  } catch {
    return null;
  }
}

// Also rejects an entry whose grid doesn't match the current puzzle's cell count — the shape a
// stale/corrupt entry from a different puzzle would have. Callers that only need a scalar field
// (e.g. the timer's elapsedSeconds) still go through this so they agree with the board on whether
// a given stored entry counts as usable.
export function readValidProgress(puzzleId: string, expectedGridLength: number): StoredProgress | null {
  const stored = readProgress(puzzleId);
  if (!stored || stored.grid.length !== expectedGridLength) return null;
  return stored;
}

export function writeProgress(puzzleId: string, progress: StoredProgress): void {
  try {
    const notes: Record<number, number[]> = {};
    for (const [index, digits] of Object.entries(progress.notes)) {
      notes[Number(index)] = Array.from(digits);
    }
    const wire: StoredProgressWire = { ...progress, notes };
    localStorage.setItem(storageKey(puzzleId), JSON.stringify(wire));
  } catch {
    // localStorage unavailable (private browsing, etc.) — progress just won't persist.
  }
}

export function clearProgress(puzzleId: string): void {
  try {
    localStorage.removeItem(storageKey(puzzleId));
  } catch {
    // localStorage unavailable — nothing to clear.
  }
}
