import { describe, expect, it } from "vitest";
import { generatePuzzle, generateSolvedGrid } from "./generator.js";
import { countSolutions } from "./solver/bruteForceSolver.js";

function isValidSolvedGrid(grid: number[]): boolean {
  const checkUnit = (indices: number[]) => new Set(indices.map((i) => grid[i])).size === 9;
  for (let r = 0; r < 9; r++) {
    if (!checkUnit(Array.from({ length: 9 }, (_, c) => r * 9 + c))) return false;
  }
  for (let c = 0; c < 9; c++) {
    if (!checkUnit(Array.from({ length: 9 }, (_, r) => r * 9 + c))) return false;
  }
  for (let b = 0; b < 9; b++) {
    const br = Math.floor(b / 3) * 3;
    const bc = (b % 3) * 3;
    const cells: number[] = [];
    for (let r = br; r < br + 3; r++) for (let c = bc; c < bc + 3; c++) cells.push(r * 9 + c);
    if (!checkUnit(cells)) return false;
  }
  return true;
}

describe("generateSolvedGrid", () => {
  it("produces a fully valid, fully filled grid", () => {
    const grid = generateSolvedGrid();
    expect(grid).toHaveLength(81);
    expect(grid.every((v) => v >= 1 && v <= 9)).toBe(true);
    expect(isValidSolvedGrid(grid)).toBe(true);
  });

  it("produces different solutions across calls", () => {
    const a = generateSolvedGrid();
    const b = generateSolvedGrid();
    expect(a.join("")).not.toBe(b.join(""));
  });
});

describe("generatePuzzle", () => {
  it("produces a puzzle with a unique solution matching the stored solution", () => {
    const { puzzle, solution } = generatePuzzle({ targetGivens: 30 });
    expect(countSolutions(puzzle, 2)).toBe(1);
    expect(isValidSolvedGrid(solution)).toBe(true);
    for (let i = 0; i < 81; i++) {
      if (puzzle[i] !== 0) expect(puzzle[i]).toBe(solution[i]);
    }
  });

  it("respects a lower givens target for a harder puzzle", () => {
    const { puzzle } = generatePuzzle({ targetGivens: 24 });
    const givensCount = puzzle.filter((v) => v !== 0).length;
    expect(givensCount).toBeLessThanOrEqual(32); // may not hit target exactly if uniqueness blocks removal
    expect(countSolutions(puzzle, 2)).toBe(1);
  });
});
