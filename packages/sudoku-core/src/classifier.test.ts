import { describe, expect, it } from "vitest";
import { Difficulty, stringToGrid } from "./types.js";
import { solveLogically } from "./solver/logicalSolver.js";
import { classifyDifficulty } from "./classifier.js";
import { createPuzzle } from "./puzzleFactory.js";

const KNOWN_PUZZLE =
  "530070000600195000098000060800060003400803001700020006060000280000419005000080079";

describe("classifyDifficulty", () => {
  it("classifies a singles-only puzzle as EASY", () => {
    const result = solveLogically(stringToGrid(KNOWN_PUZZLE));
    const classification = classifyDifficulty(result);
    expect(classification.difficulty).toBe(Difficulty.EASY);
    expect(classification.score).toBeGreaterThan(0);
  });

  it("classifies an unsolved puzzle as HARDCORE", () => {
    const grid = stringToGrid(KNOWN_PUZZLE);
    grid[0] = grid[1]; // contradiction the logical solver can never fully resolve
    const result = solveLogically(grid);
    const classification = classifyDifficulty(result);
    expect(classification.difficulty).toBe(Difficulty.HARDCORE);
  });
});

describe("createPuzzle", () => {
  it("produces a fully-formed, internally-consistent Puzzle", () => {
    const puzzle = createPuzzle({ targetGivens: 30 });
    expect(puzzle.givens).toHaveLength(81);
    expect(puzzle.solution).toHaveLength(81);
    expect(Object.values(Difficulty)).toContain(puzzle.difficulty);
    expect(puzzle.givensCount).toBe(puzzle.givens.split("").filter((c) => c !== "0").length);
    for (let i = 0; i < 81; i++) {
      if (puzzle.givens[i] !== "0") expect(puzzle.givens[i]).toBe(puzzle.solution[i]);
    }
  });
});
