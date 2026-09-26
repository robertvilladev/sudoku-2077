import { Grid } from "../../types.js";
import { Candidates, combinations, unitsList } from "../candidates.js";

const UNITS = unitsList();

/**
 * Hidden pair/triple: if `size` digits can only go in the same `size` cells of a unit, those cells
 * must hold exactly those digits, so every other candidate in them can be removed.
 */
export function applyHiddenSubset(grid: Grid, candidates: Candidates, size: number): boolean {
  for (const unit of UNITS) {
    const positions = new Map<number, number[]>();
    for (let digit = 1; digit <= 9; digit++) {
      const cells = unit.filter((i) => grid[i] === 0 && candidates[i].has(digit));
      // Digits with a single spot are hidden singles; digits already placed have no spots.
      if (cells.length >= 2 && cells.length <= size) positions.set(digit, cells);
    }
    if (positions.size < size) continue;

    for (const digits of combinations([...positions.keys()], size)) {
      const cellUnion = new Set<number>();
      for (const d of digits) for (const i of positions.get(d)!) cellUnion.add(i);
      if (cellUnion.size !== size) continue;

      let changed = false;
      for (const i of cellUnion) {
        for (const v of [...candidates[i]]) {
          if (!digits.includes(v) && candidates[i].delete(v)) changed = true;
        }
      }
      if (changed) return true;
    }
  }
  return false;
}

export const applyHiddenPair = (grid: Grid, candidates: Candidates) => applyHiddenSubset(grid, candidates, 2);
export const applyHiddenTriple = (grid: Grid, candidates: Candidates) =>
  applyHiddenSubset(grid, candidates, 3);
