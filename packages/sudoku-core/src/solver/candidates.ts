import { Grid, boxOf, cellsInBox, cellsInCol, cellsInRow, colOf, peersOf, rowOf } from "../types.js";

export type Candidates = Set<number>[];

/** Base candidates from row/col/box constraints only — the starting point before any technique runs. */
export function computeCandidates(grid: Grid): Candidates {
  const candidates: Candidates = grid.map(() => new Set<number>());
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] !== 0) continue;
    const used = new Set<number>();
    for (const j of cellsInRow(rowOf(i))) used.add(grid[j]);
    for (const j of cellsInCol(colOf(i))) used.add(grid[j]);
    for (const j of cellsInBox(boxOf(i))) used.add(grid[j]);
    for (let n = 1; n <= 9; n++) if (!used.has(n)) candidates[i].add(n);
  }
  return candidates;
}

/**
 * Places a value and propagates the elimination to peers in place. Candidate eliminations made by
 * pair/pointing/x-wing techniques must survive this — never recompute candidates from scratch mid-solve,
 * only prune, or those deductions would be silently lost and the solver could loop without progress.
 */
export function placeValue(grid: Grid, candidates: Candidates, index: number, value: number): void {
  grid[index] = value;
  candidates[index] = new Set();
  for (const peer of peersOf(index)) {
    candidates[peer].delete(value);
  }
}

export function unitsList(): number[][] {
  const units: number[][] = [];
  for (let r = 0; r < 9; r++) units.push(cellsInRow(r));
  for (let c = 0; c < 9; c++) units.push(cellsInCol(c));
  for (let b = 0; b < 9; b++) units.push(cellsInBox(b));
  return units;
}
