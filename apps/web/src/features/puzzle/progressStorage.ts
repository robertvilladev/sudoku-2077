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

export function readProgress(puzzleId: string): StoredProgress | null {
  try {
    const raw = localStorage.getItem(storageKey(puzzleId));
    if (!raw) return null;
    const wire = JSON.parse(raw) as StoredProgressWire;
    if (!Array.isArray(wire.grid)) return null;
    const notes: Record<number, Set<number>> = {};
    for (const [index, digits] of Object.entries(wire.notes)) {
      notes[Number(index)] = new Set(digits);
    }
    return { ...wire, notes };
  } catch {
    return null;
  }
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
