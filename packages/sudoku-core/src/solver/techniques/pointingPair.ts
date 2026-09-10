import { Grid, cellsInBox, cellsInCol, cellsInRow, colOf, rowOf } from "../../types.js";
import { Candidates } from "../candidates.js";

/** If a digit's candidates within a box all share a row/col, it can be eliminated from that row/col outside the box. */
export function applyPointingPair(grid: Grid, candidates: Candidates): boolean {
  for (let box = 0; box < 9; box++) {
    const boxCells = cellsInBox(box);
    for (let digit = 1; digit <= 9; digit++) {
      const cellsWithDigit = boxCells.filter((i) => grid[i] === 0 && candidates[i].has(digit));
      if (cellsWithDigit.length < 2) continue;

      const rows = new Set(cellsWithDigit.map(rowOf));
      const cols = new Set(cellsWithDigit.map(colOf));

      let changed = false;
      if (rows.size === 1) {
        const line = cellsInRow([...rows][0]);
        for (const i of line) {
          if (boxCells.includes(i) || grid[i] !== 0) continue;
          if (candidates[i].delete(digit)) changed = true;
        }
      } else if (cols.size === 1) {
        const line = cellsInCol([...cols][0]);
        for (const i of line) {
          if (boxCells.includes(i) || grid[i] !== 0) continue;
          if (candidates[i].delete(digit)) changed = true;
        }
      }
      if (changed) return true;
    }
  }
  return false;
}
