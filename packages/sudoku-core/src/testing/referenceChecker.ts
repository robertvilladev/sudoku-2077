/**
 * A deliberately naive, independent implementation used only to cross-check the real solver and
 * generator in tests and the audit script. It shares no code with `solver/` on purpose: if the fast
 * bitmask solver had a bug, reusing its helpers here would let the same bug vouch for itself.
 */

function unitsOf(index: number): number[][] {
  const r = Math.floor(index / 9);
  const c = index % 9;
  const br = r - (r % 3);
  const bc = c - (c % 3);
  const row = Array.from({ length: 9 }, (_, k) => r * 9 + k);
  const col = Array.from({ length: 9 }, (_, k) => k * 9 + c);
  const box = Array.from({ length: 9 }, (_, k) => (br + Math.floor(k / 3)) * 9 + bc + (k % 3));
  return [row, col, box];
}

function canPlace(grid: number[], index: number, digit: number): boolean {
  return unitsOf(index).every((unit) => unit.every((i) => i === index || grid[i] !== digit));
}

/** True if every row, column and box of a full grid holds 1-9 exactly once. */
export function isValidSolution(grid: number[]): boolean {
  if (grid.length !== 81) return false;
  return grid.every((v, i) => v >= 1 && v <= 9 && canPlace(grid, i, v));
}

/**
 * Counts solutions up to `limit` with plain backtracking, branching on the empty cell with the fewest
 * legal digits (plain first-empty-cell order takes seconds on minimal puzzles).
 */
export function referenceCountSolutions(givens: number[], limit = 2): number {
  const grid = givens.slice();
  if (grid.some((v, i) => v !== 0 && !canPlace(grid, i, v))) return 0;
  let count = 0;
  function walk(): boolean {
    let index = -1;
    let options: number[] = [];
    for (let i = 0; i < 81; i++) {
      if (grid[i] !== 0) continue;
      const legal = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => canPlace(grid, i, d));
      if (index === -1 || legal.length < options.length) {
        index = i;
        options = legal;
        if (legal.length <= 1) break;
      }
    }
    if (index === -1) return ++count >= limit;
    for (const d of options) {
      grid[index] = d;
      if (walk()) return true;
    }
    grid[index] = 0;
    return false;
  }
  walk();
  return count;
}
