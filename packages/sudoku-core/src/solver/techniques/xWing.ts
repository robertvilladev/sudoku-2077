import { Grid, cellsInCol, cellsInRow, colOf, rowOf } from "../../types.js";
import { Candidates } from "../candidates.js";

/**
 * If a digit's candidates in two rows are confined to the exact same two columns (or vice versa),
 * it can be eliminated from those columns/rows outside the two lines.
 */
function findXWing(grid: Grid, candidates: Candidates, primary: "row" | "col"): boolean {
  const primaryCells = primary === "row" ? cellsInRow : cellsInCol;
  const crossLine = primary === "row" ? cellsInCol : cellsInRow;
  const secondaryOf = primary === "row" ? colOf : rowOf;
  const primaryOf = primary === "row" ? rowOf : colOf;

  for (let digit = 1; digit <= 9; digit++) {
    const lines: number[][] = [];
    for (let a = 0; a < 9; a++) {
      lines.push(primaryCells(a).filter((i) => grid[i] === 0 && candidates[i].has(digit)));
    }

    for (let a = 0; a < 9; a++) {
      if (lines[a].length !== 2) continue;
      for (let b = a + 1; b < 9; b++) {
        if (lines[b].length !== 2) continue;

        const [a1, a2] = lines[a].map(secondaryOf).sort((x, y) => x - y);
        const [b1, b2] = lines[b].map(secondaryOf).sort((x, y) => x - y);
        if (a1 !== b1 || a2 !== b2) continue;

        let changed = false;
        for (const secondary of [a1, a2]) {
          for (const i of crossLine(secondary)) {
            const line = primaryOf(i);
            if (line === a || line === b || grid[i] !== 0) continue;
            if (candidates[i].delete(digit)) changed = true;
          }
        }
        if (changed) return true;
      }
    }
  }
  return false;
}

export function applyXWing(grid: Grid, candidates: Candidates): boolean {
  return findXWing(grid, candidates, "row") || findXWing(grid, candidates, "col");
}
