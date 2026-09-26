import { Grid, GRID_SIZE } from "./types.js";
import { Rng, shuffled } from "./random.js";

/**
 * A validity-preserving remapping of the grid. Relabelling digits, permuting rows within a band,
 * permuting bands (and the same for columns) and transposing all map a valid sudoku onto another valid
 * sudoku that needs exactly the same deductions — so a rated puzzle stays at its rating. Combined,
 * they give ~1.2 trillion (9! * 6^8 * 2) distinct-looking variants per puzzle.
 */
export interface GridTransform {
  /** digitMap[d] is the new label for digit d (index 0 unused, blanks stay blank). */
  digitMap: number[];
  /** rowOrder[newRow] = the old row placed there. */
  rowOrder: number[];
  colOrder: number[];
  transpose: boolean;
}

function lineOrder(rng: Rng): number[] {
  const bands = shuffled([0, 1, 2], rng);
  return bands.flatMap((band) => shuffled([0, 1, 2], rng).map((offset) => band * 3 + offset));
}

export function randomTransform(rng: Rng): GridTransform {
  return {
    digitMap: [0, ...shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9], rng)],
    rowOrder: lineOrder(rng),
    colOrder: lineOrder(rng),
    transpose: rng() < 0.5,
  };
}

export function applyTransform(grid: Grid, t: GridTransform): Grid {
  const out: Grid = new Array(GRID_SIZE).fill(0);
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const value = grid[t.rowOrder[r] * 9 + t.colOrder[c]];
      const target = t.transpose ? c * 9 + r : r * 9 + c;
      out[target] = t.digitMap[value];
    }
  }
  return out;
}
