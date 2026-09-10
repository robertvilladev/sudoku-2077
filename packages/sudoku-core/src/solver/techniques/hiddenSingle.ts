import { Grid } from "../../types.js";
import { Candidates, placeValue, unitsList } from "../candidates.js";

const UNITS = unitsList();

/** A digit that can only go in one cell within a unit (row/col/box) must go there. */
export function applyHiddenSingle(grid: Grid, candidates: Candidates): boolean {
  for (const unit of UNITS) {
    for (let digit = 1; digit <= 9; digit++) {
      const cellsWithDigit = unit.filter((i) => grid[i] === 0 && candidates[i].has(digit));
      if (cellsWithDigit.length === 1) {
        placeValue(grid, candidates, cellsWithDigit[0], digit);
        return true;
      }
    }
  }
  return false;
}
