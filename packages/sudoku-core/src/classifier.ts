import { Difficulty, TechniqueName } from "./types.js";
import { LogicalSolveResult } from "./solver/logicalSolver.js";

const TECHNIQUE_WEIGHT: Record<TechniqueName, number> = {
  [TechniqueName.NAKED_SINGLE]: 1,
  [TechniqueName.HIDDEN_SINGLE]: 1,
  [TechniqueName.NAKED_PAIR]: 3,
  [TechniqueName.POINTING_PAIR]: 4,
  [TechniqueName.X_WING]: 9,
};

export interface ClassificationResult {
  difficulty: Difficulty;
  score: number;
}

/**
 * Difficulty tracks the hardest technique required, not just given-count: a puzzle only solvable with
 * naked/hidden singles is EASY no matter how few givens it has, and one needing X-Wing is HARD.
 * Puzzles the logical solver can't finish at all require guessing and are HARDCORE.
 */
export function classifyDifficulty(result: LogicalSolveResult): ClassificationResult {
  if (!result.solved) {
    return { difficulty: Difficulty.HARDCORE, score: 999 };
  }

  let score = 0;
  let maxWeight = 0;
  for (const [name, count] of Object.entries(result.techniqueCounts) as Array<[TechniqueName, number]>) {
    const weight = TECHNIQUE_WEIGHT[name];
    score += weight * count;
    maxWeight = Math.max(maxWeight, weight);
  }

  let difficulty: Difficulty;
  if (maxWeight <= 1) difficulty = Difficulty.EASY;
  else if (maxWeight <= 4) difficulty = Difficulty.MEDIUM;
  else difficulty = Difficulty.HARD;

  return { difficulty, score };
}
