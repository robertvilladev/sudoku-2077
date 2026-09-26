import { Grid, boxOf, cellsInBox, cellsInCol, cellsInRow } from "../../types.js";
import { Candidates } from "../candidates.js";

/**
 * Box/line reduction ("claiming"), the mirror of pointing pairs: if a digit's candidates within a row
 * or column all fall inside one box, it can be eliminated from the rest of that box.
 */
export function applyBoxLineReduction(grid: Grid, candidates: Candidates): boolean {
  const lines = [
    ...Array.from({ length: 9 }, (_, r) => cellsInRow(r)),
    ...Array.from({ length: 9 }, (_, c) => cellsInCol(c)),
  ];
  for (const line of lines) {
    for (let digit = 1; digit <= 9; digit++) {
      const cellsWithDigit = line.filter((i) => grid[i] === 0 && candidates[i].has(digit));
      if (cellsWithDigit.length < 2) continue;
      const boxes = new Set(cellsWithDigit.map(boxOf));
      if (boxes.size !== 1) continue;

      let changed = false;
      for (const i of cellsInBox([...boxes][0])) {
        if (line.includes(i) || grid[i] !== 0) continue;
        if (candidates[i].delete(digit)) changed = true;
      }
      if (changed) return true;
    }
  }
  return false;
}
