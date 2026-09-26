import { describe, expect, it } from "vitest";
import { Difficulty, TechniqueName, stringToGrid } from "../types.js";
import { solveLogically } from "./logicalSolver.js";
import { createPuzzleForTier } from "../puzzleFactory.js";
import { solveBruteForce } from "./bruteForceSolver.js";

const KNOWN_PUZZLE = "530070000600195000098000060800060003400803001700020006060000280000419005000080079";
const KNOWN_SOLUTION = "534678912672195348198342567859761423426853791713924856961537284287419635345286179";

// Famous puzzles far beyond this solver's technique list: it must stop short, never guess wrong.
const FAMOUS_HARD = {
  aiEscargot: "100007090030020008009600500005300900010080002600004000300000010040000007007000300",
  goldenNugget: "000000039000001005003050800008090006070002000100400000009080050020000600400700000",
};

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

  it("gets stuck on famous extreme puzzles without placing a single wrong digit", () => {
    for (const givens of Object.values(FAMOUS_HARD)) {
      const grid = stringToGrid(givens);
      const solution = solveBruteForce(grid)!;
      const result = solveLogically(grid, { solution }); // the oracle would throw on a wrong step
      expect(result.solved).toBe(false);
    }
  });

  it("the solution oracle rejects a deduction that contradicts the claimed solution", () => {
    const wrongSolution = stringToGrid(KNOWN_SOLUTION);
    // Swap two digits in an unsolved cell's claimed solution: the first placement there must be flagged.
    const blank = KNOWN_PUZZLE.indexOf("0");
    wrongSolution[blank] = (wrongSolution[blank] % 9) + 1;
    expect(() => solveLogically(stringToGrid(KNOWN_PUZZLE), { solution: wrongSolution })).toThrow(
      /made an invalid deduction/
    );
  });

  // Property test: across a fixed corpus of generated hard puzzles every technique fires at least once,
  // and the oracle (on inside createPuzzleForTier) proves none of them ever made a wrong deduction.
  it("exercises every technique on a seeded corpus without a single invalid deduction", () => {
    const seen = new Set<TechniqueName>();
    // Naked quads are rare in generated puzzles; seed 354 is pinned because it needs one.
    const seeds = [...Array.from({ length: 100 }, (_, k) => k), 354].map((k) => `technique-corpus-${k}`);
    for (const tier of [Difficulty.MEDIUM, Difficulty.HARD]) {
      for (const seed of seeds) {
        for (const t of createPuzzleForTier(tier, seed).techniques) seen.add(t);
      }
    }
    expect([...seen].sort()).toEqual(Object.values(TechniqueName).sort());
  });
});
