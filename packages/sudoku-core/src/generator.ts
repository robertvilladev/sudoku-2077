import { Grid, GRID_SIZE, boxOf, cellsInBox, cellsInCol, cellsInRow, cloneGrid, colOf, rowOf } from "./types.js";
import { countSolutions } from "./solver/bruteForceSolver.js";

function shuffled<T>(items: T[]): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function candidatesFor(grid: Grid, index: number): number[] {
  const used = new Set<number>();
  for (const i of cellsInRow(rowOf(index))) used.add(grid[i]);
  for (const i of cellsInCol(colOf(index))) used.add(grid[i]);
  for (const i of cellsInBox(boxOf(index))) used.add(grid[i]);
  return shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9].filter((n) => !used.has(n)));
}

/** Fills a full grid via randomized backtracking. Every call produces a different valid solution. */
export function generateSolvedGrid(): Grid {
  const grid: Grid = new Array(GRID_SIZE).fill(0);

  function fill(index: number): boolean {
    if (index === GRID_SIZE) return true;
    for (const value of candidatesFor(grid, index)) {
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
}

/** "Digs holes" in a solved grid, only keeping a removal if the puzzle still has a unique solution. */
export function generatePuzzle(options: GeneratePuzzleOptions = {}): { puzzle: Grid; solution: Grid } {
  const { targetGivens = 28, maxAttempts = 200 } = options;
  const solution = generateSolvedGrid();
  const puzzle = cloneGrid(solution);

  const removalOrder = shuffled(Array.from({ length: GRID_SIZE }, (_, i) => i));
  let givensCount = GRID_SIZE;
  let attempts = 0;

  for (const index of removalOrder) {
    if (givensCount <= targetGivens || attempts >= maxAttempts) break;
    attempts++;

    const removedValue = puzzle[index];
    puzzle[index] = 0;

    if (countSolutions(puzzle, 2) !== 1) {
      puzzle[index] = removedValue;
      continue;
    }

    givensCount--;
  }

  return { puzzle, solution };
}
