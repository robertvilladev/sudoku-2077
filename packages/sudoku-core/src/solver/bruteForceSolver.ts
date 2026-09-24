import { Grid, GRID_SIZE } from "../types.js";

// Bitmask backtracking: each row/col/box keeps a 9-bit mask of used digits (bit d = digit d), so
// computing a cell's candidates is three ORs instead of building Sets. Uniqueness checks run once per
// removal attempt during generation, so this is the generator's hot path.

const ROW = new Int8Array(GRID_SIZE);
const COL = new Int8Array(GRID_SIZE);
const BOX = new Int8Array(GRID_SIZE);
for (let i = 0; i < GRID_SIZE; i++) {
  ROW[i] = Math.floor(i / 9);
  COL[i] = i % 9;
  BOX[i] = Math.floor(i / 27) * 3 + Math.floor((i % 9) / 3);
}

const ALL_DIGITS = 0x3fe; // bits 1..9

function popcount(mask: number): number {
  let n = 0;
  for (let m = mask; m; m &= m - 1) n++;
  return n;
}

interface SearchState {
  cells: Grid;
  rows: Int32Array;
  cols: Int32Array;
  boxes: Int32Array;
}

/** Returns null if the givens already contradict each other (a digit repeated in a unit). */
function initState(grid: Grid): SearchState | null {
  const state: SearchState = {
    cells: grid.slice(),
    rows: new Int32Array(9),
    cols: new Int32Array(9),
    boxes: new Int32Array(9),
  };
  for (let i = 0; i < GRID_SIZE; i++) {
    const v = grid[i];
    if (!v) continue;
    const bit = 1 << v;
    if ((state.rows[ROW[i]] | state.cols[COL[i]] | state.boxes[BOX[i]]) & bit) return null;
    state.rows[ROW[i]] |= bit;
    state.cols[COL[i]] |= bit;
    state.boxes[BOX[i]] |= bit;
  }
  return state;
}

/**
 * Depth-first search that always branches on the blank cell with the fewest candidates (MRV).
 * `onSolution` returns true to stop the search.
 */
function search(state: SearchState, onSolution: () => boolean): boolean {
  const { cells, rows, cols, boxes } = state;
  let best = -1;
  let bestMask = 0;
  let bestCount = 10;
  for (let i = 0; i < GRID_SIZE; i++) {
    if (cells[i]) continue;
    const mask = ALL_DIGITS & ~(rows[ROW[i]] | cols[COL[i]] | boxes[BOX[i]]);
    const count = popcount(mask);
    if (count < bestCount) {
      best = i;
      bestMask = mask;
      bestCount = count;
      if (count <= 1) break;
    }
  }
  if (best === -1) return onSolution();
  if (bestCount === 0) return false;

  const r = ROW[best];
  const c = COL[best];
  const b = BOX[best];
  for (let d = 1; d <= 9; d++) {
    const bit = 1 << d;
    if (!(bestMask & bit)) continue;
    cells[best] = d;
    rows[r] |= bit;
    cols[c] |= bit;
    boxes[b] |= bit;
    if (search(state, onSolution)) return true;
    rows[r] &= ~bit;
    cols[c] &= ~bit;
    boxes[b] &= ~bit;
  }
  cells[best] = 0;
  return false;
}

/** Counts solutions up to `limit` (default 2, just enough to prove uniqueness without exhausting the whole tree). */
export function countSolutions(grid: Grid, limit = 2): number {
  const state = initState(grid);
  if (!state) return 0;
  let count = 0;
  search(state, () => ++count >= limit);
  return count;
}

export function solveBruteForce(grid: Grid): Grid | null {
  const state = initState(grid);
  if (!state) return null;
  let solution: Grid | null = null;
  search(state, () => {
    solution = state.cells.slice();
    return true;
  });
  return solution;
}
