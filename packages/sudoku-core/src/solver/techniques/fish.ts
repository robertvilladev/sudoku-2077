import { Grid, cellsInCol, cellsInRow, colOf, rowOf } from "../../types.js";
import { Candidates, combinations } from "../candidates.js";

/**
 * Basic fish (X-Wing = 2, Swordfish = 3): if a digit's candidates in `size` rows are confined to the
 * same `size` columns (or vice versa), it can be eliminated from those columns outside those rows.
 */
function findFish(grid: Grid, candidates: Candidates, size: number, primary: "row" | "col"): boolean {
  const baseLine = primary === "row" ? cellsInRow : cellsInCol;
  const coverLine = primary === "row" ? cellsInCol : cellsInRow;
  const coverOf = primary === "row" ? colOf : rowOf;
  const baseOf = primary === "row" ? rowOf : colOf;

  for (let digit = 1; digit <= 9; digit++) {
    const coversByBase = new Map<number, Set<number>>();
    for (let line = 0; line < 9; line++) {
      const cells = baseLine(line).filter((i) => grid[i] === 0 && candidates[i].has(digit));
      if (cells.length >= 2 && cells.length <= size) coversByBase.set(line, new Set(cells.map(coverOf)));
    }
    if (coversByBase.size < size) continue;

    for (const bases of combinations([...coversByBase.keys()], size)) {
      const covers = new Set<number>();
      for (const b of bases) for (const c of coversByBase.get(b)!) covers.add(c);
      if (covers.size !== size) continue;

      let changed = false;
      for (const cover of covers) {
        for (const i of coverLine(cover)) {
          if (grid[i] !== 0 || bases.includes(baseOf(i))) continue;
          if (candidates[i].delete(digit)) changed = true;
        }
      }
      if (changed) return true;
    }
  }
  return false;
}

export function applyXWing(grid: Grid, candidates: Candidates): boolean {
  return findFish(grid, candidates, 2, "row") || findFish(grid, candidates, 2, "col");
}

export function applySwordfish(grid: Grid, candidates: Candidates): boolean {
  return findFish(grid, candidates, 3, "row") || findFish(grid, candidates, 3, "col");
}
