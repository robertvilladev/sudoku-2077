import { Grid, boxOf, cellsInBox, cellsInCol, cellsInRow, cloneGrid, colOf, rowOf } from "../types.js";

function candidatesFor(grid: Grid, index: number): number[] {
  const used = new Set<number>();
  for (const i of cellsInRow(rowOf(index))) used.add(grid[i]);
  for (const i of cellsInCol(colOf(index))) used.add(grid[i]);
  for (const i of cellsInBox(boxOf(index))) used.add(grid[i]);
  const result: number[] = [];
  for (let n = 1; n <= 9; n++) if (!used.has(n)) result.push(n);
  return result;
}

/** Picks the blank cell with the fewest remaining candidates (MRV heuristic) — cuts the search tree drastically. */
function findMostConstrainedCell(grid: Grid): { index: number; candidates: number[] } | null {
  let best: { index: number; candidates: number[] } | null = null;
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] !== 0) continue;
    const candidates = candidatesFor(grid, i);
    if (candidates.length === 0) return { index: i, candidates: [] };
    if (!best || candidates.length < best.candidates.length) {
      best = { index: i, candidates };
      if (candidates.length === 1) break;
    }
  }
  return best;
}

/** Counts solutions up to `limit` (default 2, just enough to prove uniqueness without exhausting the whole tree). */
export function countSolutions(grid: Grid, limit = 2): number {
  const working = cloneGrid(grid);
  let count = 0;

  function backtrack(): boolean {
    const next = findMostConstrainedCell(working);
    if (!next) {
      count++;
      return count >= limit;
    }
    if (next.candidates.length === 0) return false;
    for (const value of next.candidates) {
      working[next.index] = value;
      if (backtrack()) return true;
      working[next.index] = 0;
    }
    return false;
  }

  backtrack();
  return count;
}

export function solveBruteForce(grid: Grid): Grid | null {
  const working = cloneGrid(grid);

  function backtrack(): boolean {
    const next = findMostConstrainedCell(working);
    if (!next) return true;
    if (next.candidates.length === 0) return false;
    for (const value of next.candidates) {
      working[next.index] = value;
      if (backtrack()) return true;
      working[next.index] = 0;
    }
    return false;
  }

  return backtrack() ? working : null;
}
