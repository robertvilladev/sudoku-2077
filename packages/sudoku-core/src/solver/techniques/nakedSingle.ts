import { Grid } from "../../types.js";
import { Candidates, placeValue } from "../candidates.js";

/** A cell with exactly one remaining candidate must be that value. */
export function applyNakedSingle(grid: Grid, candidates: Candidates): boolean {
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] !== 0) continue;
    if (candidates[i].size === 1) {
      const [value] = candidates[i];
      placeValue(grid, candidates, i, value);
      return true;
    }
  }
  return false;
}
