import { describe, expect, it } from "vitest";
import { stringToGrid } from "../types.js";
import { countSolutions, solveBruteForce } from "./bruteForceSolver.js";

// Classic example puzzle (Wikipedia "Sudoku" article) with a well-known unique solution.
const KNOWN_PUZZLE =
  "530070000600195000098000060800060003400803001700020006060000280000419005000080079";
const KNOWN_SOLUTION =
  "534678912672195348198342567859761423426853791713924856961537284287419635345286179";

describe("bruteForceSolver", () => {
  it("solves a known puzzle and matches the published solution", () => {
    const grid = stringToGrid(KNOWN_PUZZLE);
    const solved = solveBruteForce(grid);
    expect(solved).not.toBeNull();
    expect(solved!.join("")).toBe(KNOWN_SOLUTION);
  });

  it("reports exactly one solution for a uniquely-solvable puzzle", () => {
    const grid = stringToGrid(KNOWN_PUZZLE);
    expect(countSolutions(grid, 2)).toBe(1);
  });

  it("reports more than one solution for an empty grid", () => {
    const grid = new Array(81).fill(0);
    expect(countSolutions(grid, 2)).toBe(2);
  });

  it("returns null for an unsolvable grid", () => {
    const grid = stringToGrid(KNOWN_PUZZLE);
    grid[0] = grid[1]; // duplicate in the same row makes it unsolvable
    expect(solveBruteForce(grid)).toBeNull();
  });
});
