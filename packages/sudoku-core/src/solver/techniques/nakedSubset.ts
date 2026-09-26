import { Grid } from "../../types.js";
import { Candidates, combinations, unitsList } from "../candidates.js";

const UNITS = unitsList();

/**
 * Naked pair/triple/quad: if `size` cells in a unit hold only `size` distinct candidates between them,
 * those digits must fill those cells, so they can't appear anywhere else in the unit.
 */
export function applyNakedSubset(grid: Grid, candidates: Candidates, size: number): boolean {
  for (const unit of UNITS) {
    const pool = unit.filter((i) => grid[i] === 0 && candidates[i].size >= 2 && candidates[i].size <= size);
    if (pool.length < size) continue;

    for (const cells of combinations(pool, size)) {
      const union = new Set<number>();
      for (const i of cells) for (const v of candidates[i]) union.add(v);
      if (union.size !== size) continue;

      let changed = false;
      for (const i of unit) {
        if (grid[i] !== 0 || cells.includes(i)) continue;
        for (const v of union) if (candidates[i].delete(v)) changed = true;
      }
      if (changed) return true;
    }
  }
  return false;
}

export const applyNakedPair = (grid: Grid, candidates: Candidates) => applyNakedSubset(grid, candidates, 2);
export const applyNakedTriple = (grid: Grid, candidates: Candidates) => applyNakedSubset(grid, candidates, 3);
export const applyNakedQuad = (grid: Grid, candidates: Candidates) => applyNakedSubset(grid, candidates, 4);
