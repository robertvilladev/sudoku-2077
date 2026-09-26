import {
  Grid,
  GRID_SIZE,
  boxOf,
  cellsInBox,
  cellsInCol,
  cellsInRow,
  cloneGrid,
  colOf,
  rowOf,
} from "./types.js";
import { countSolutions } from "./solver/bruteForceSolver.js";
import { Rng, shuffled } from "./random.js";

function candidatesFor(grid: Grid, index: number, rng: Rng): number[] {
  const used = new Set<number>();
  for (const i of cellsInRow(rowOf(index))) used.add(grid[i]);
  for (const i of cellsInCol(colOf(index))) used.add(grid[i]);
  for (const i of cellsInBox(boxOf(index))) used.add(grid[i]);
  return shuffled(
    [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((n) => !used.has(n)),
    rng
  );
}

/** Fills a full grid via randomized backtracking. Each call (or each seed) produces a different valid solution. */
export function generateSolvedGrid(rng: Rng = Math.random): Grid {
  const grid: Grid = new Array(GRID_SIZE).fill(0);

  function fill(index: number): boolean {
    if (index === GRID_SIZE) return true;
    for (const value of candidatesFor(grid, index, rng)) {
      grid[index] = value;
      if (fill(index + 1)) return true;
    }
    grid[index] = 0;
    return false;
  }

  fill(0);
  return grid;
}

export interface GeneratePuzzleOptions {
  /** Stop removing once givens count reaches this. Fewer givens generally means a harder puzzle. */
  targetGivens?: number;
  /** Safety cap on removal attempts so generation always terminates. */
  maxAttempts?: number;
  /**
   * Remove cells in 180°-rotationally-symmetric pairs, the layout used by published/newspaper puzzles.
   * Symmetric digging removes fewer cells overall but reads as "hand-made".
   */
  symmetric?: boolean;
  /** Randomness source; pass `createRng(seed)` for a reproducible puzzle. Defaults to `Math.random`. */
  rng?: Rng;
}

/** "Digs holes" in a solved grid, only keeping a removal if the puzzle still has a unique solution. */
export function generatePuzzle(options: GeneratePuzzleOptions = {}): { puzzle: Grid; solution: Grid } {
  const { targetGivens = 28, maxAttempts = GRID_SIZE, symmetric = false, rng = Math.random } = options;
  const solution = generateSolvedGrid(rng);
  const puzzle = cloneGrid(solution);

  const removalOrder = shuffled(
    Array.from({ length: GRID_SIZE }, (_, i) => i),
    rng
  );
  let givensCount = GRID_SIZE;
  let attempts = 0;

  for (const index of removalOrder) {
    if (givensCount <= targetGivens || attempts >= maxAttempts) break;
    const mirror = GRID_SIZE - 1 - index;
    const group = symmetric && mirror !== index ? [index, mirror] : [index];
    if (group.some((i) => puzzle[i] === 0)) continue; // already removed as the other half of a pair
    attempts++;

    for (const i of group) puzzle[i] = 0;
    if (countSolutions(puzzle, 2) !== 1) {
      for (const i of group) puzzle[i] = solution[i];
      continue;
    }
    givensCount -= group.length;
  }

  return { puzzle, solution };
}
