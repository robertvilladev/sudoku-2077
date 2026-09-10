import { Grid } from "../../types.js";
import { Candidates, unitsList } from "../candidates.js";

const UNITS = unitsList();

/** Two cells in a unit sharing the exact same 2-candidate set means those 2 values can't appear elsewhere in the unit. */
export function applyNakedPair(grid: Grid, candidates: Candidates): boolean {
  for (const unit of UNITS) {
    const pairCells = unit.filter((i) => grid[i] === 0 && candidates[i].size === 2);

    for (let a = 0; a < pairCells.length; a++) {
      for (let b = a + 1; b < pairCells.length; b++) {
        const cellA = pairCells[a];
        const cellB = pairCells[b];
        const setA = candidates[cellA];
        const setB = candidates[cellB];
        const sameSet = [...setA].every((v) => setB.has(v));
        if (!sameSet) continue;

        let changed = false;
        for (const i of unit) {
          if (i === cellA || i === cellB || grid[i] !== 0) continue;
          for (const value of setA) {
            if (candidates[i].delete(value)) changed = true;
          }
        }
        if (changed) return true;
      }
    }
  }
  return false;
}
