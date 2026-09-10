import { describe, expect, it } from "vitest";
import { stringToGrid } from "../types.js";
import { solveLogically } from "./logicalSolver.js";

const KNOWN_PUZZLE =
  "530070000600195000098000060800060003400803001700020006060000280000419005000080079";
const KNOWN_SOLUTION =
  "534678912672195348198342567859761423426853791713924856961537284287419635345286179";

describe("solveLogically", () => {
  it("fully solves a beginner-level puzzle using only singles", () => {
    const result = solveLogically(stringToGrid(KNOWN_PUZZLE));
    expect(result.solved).toBe(true);
    expect(result.grid.join("")).toBe(KNOWN_SOLUTION);
    expect(result.techniquesUsed.length).toBeGreaterThan(0);
  });

  it("never mutates the input grid", () => {
    const input = stringToGrid(KNOWN_PUZZLE);
    const copy = input.slice();
    solveLogically(input);
    expect(input).toEqual(copy);
  });

  it("reports unsolved (not throw) on an unsolvable grid", () => {
    const grid = stringToGrid(KNOWN_PUZZLE);
    grid[0] = grid[1];
    const result = solveLogically(grid);
    expect(result.solved).toBe(false);
  });
});
