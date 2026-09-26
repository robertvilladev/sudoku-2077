import { describe, expect, it } from "vitest";
import { Difficulty, TechniqueName, stringToGrid } from "./types.js";
import { LogicalSolveResult, solveLogically } from "./solver/logicalSolver.js";
import { HARDCORE_SCORE_BASE, TECHNIQUE_INFO, classifyDifficulty } from "./classifier.js";

const KNOWN_PUZZLE = "530070000600195000098000060800060003400803001700020006060000280000419005000080079";

function resultUsing(counts: Partial<Record<TechniqueName, number>>, solved = true): LogicalSolveResult {
  return {
    solved,
    grid: [],
    techniquesUsed: Object.keys(counts) as TechniqueName[],
    techniqueCounts: counts,
  };
}

describe("classifyDifficulty", () => {
  it("classifies a singles-only puzzle as EASY", () => {
    const result = solveLogically(stringToGrid(KNOWN_PUZZLE));
    const classification = classifyDifficulty(result);
    expect(classification.difficulty).toBe(Difficulty.EASY);
    expect(classification.score).toBeGreaterThan(0);
  });

  it("classifies an unsolved puzzle as HARDCORE, scored above anything solvable", () => {
    const grid = stringToGrid(KNOWN_PUZZLE);
    grid[0] = grid[1]; // contradiction the logical solver can never fully resolve
    const classification = classifyDifficulty(solveLogically(grid));
    expect(classification.difficulty).toBe(Difficulty.HARDCORE);
    expect(classification.score).toBeGreaterThanOrEqual(HARDCORE_SCORE_BASE);
  });

  it("puts a puzzle in the tier of its hardest technique", () => {
    const cases: Array<[Partial<Record<TechniqueName, number>>, Difficulty]> = [
      [{ HIDDEN_SINGLE: 40, NAKED_SINGLE: 10 }, Difficulty.EASY],
      [{ HIDDEN_SINGLE: 40, POINTING_PAIR: 1 }, Difficulty.MEDIUM],
      [{ HIDDEN_SINGLE: 40, HIDDEN_PAIR: 2, BOX_LINE_REDUCTION: 1 }, Difficulty.MEDIUM],
      [{ HIDDEN_SINGLE: 40, NAKED_PAIR: 3, X_WING: 1 }, Difficulty.HARD],
      [{ HIDDEN_SINGLE: 40, XYZ_WING: 1 }, Difficulty.HARD],
    ];
    for (const [counts, expected] of cases) {
      expect(classifyDifficulty(resultUsing(counts)).difficulty).toBe(expected);
    }
  });

  it("scores by weight × uses, so more hard steps score higher within a tier", () => {
    const one = classifyDifficulty(resultUsing({ HIDDEN_SINGLE: 40, X_WING: 1 })).score;
    const two = classifyDifficulty(resultUsing({ HIDDEN_SINGLE: 40, X_WING: 2 })).score;
    expect(two - one).toBe(TECHNIQUE_INFO.X_WING.weight);
  });
});
