import { Difficulty, TechniqueName } from "./types.js";
import { LogicalSolveResult } from "./solver/logicalSolver.js";

/**
 * Per-technique weight (≈10× the Sudoku Explainer rating) and the tier that technique puts a puzzle in.
 * Tiers deliberately don't follow SE order strictly: X-Wing is SE 3.2 but reads as an "advanced" pattern
 * to most players, so it sits in HARD alongside triples, Swordfish and wings.
 */
export const TECHNIQUE_INFO: Record<TechniqueName, { weight: number; tier: Difficulty }> = {
  [TechniqueName.HIDDEN_SINGLE]: { weight: 15, tier: Difficulty.EASY },
  [TechniqueName.NAKED_SINGLE]: { weight: 23, tier: Difficulty.EASY },
  [TechniqueName.POINTING_PAIR]: { weight: 26, tier: Difficulty.MEDIUM },
  [TechniqueName.BOX_LINE_REDUCTION]: { weight: 28, tier: Difficulty.MEDIUM },
  [TechniqueName.NAKED_PAIR]: { weight: 30, tier: Difficulty.MEDIUM },
  [TechniqueName.HIDDEN_PAIR]: { weight: 34, tier: Difficulty.MEDIUM },
  [TechniqueName.X_WING]: { weight: 32, tier: Difficulty.HARD },
  [TechniqueName.NAKED_TRIPLE]: { weight: 36, tier: Difficulty.HARD },
  [TechniqueName.SWORDFISH]: { weight: 38, tier: Difficulty.HARD },
  [TechniqueName.HIDDEN_TRIPLE]: { weight: 40, tier: Difficulty.HARD },
  [TechniqueName.XY_WING]: { weight: 42, tier: Difficulty.HARD },
  [TechniqueName.XYZ_WING]: { weight: 44, tier: Difficulty.HARD },
  [TechniqueName.NAKED_QUAD]: { weight: 50, tier: Difficulty.HARD },
};

const TIER_RANK: Record<Difficulty, number> = { EASY: 0, MEDIUM: 1, HARD: 2, HARDCORE: 3 };

/** Added to a HARDCORE puzzle's score so it always sorts above every logically-solvable puzzle. */
export const HARDCORE_SCORE_BASE = 1000;

export interface ClassificationResult {
  difficulty: Difficulty;
  score: number;
}

/**
 * Difficulty tracks the hardest technique required, not given-count: a puzzle only solvable with
 * singles is EASY no matter how few givens it has. Puzzles the logical solver can't finish need
 * chains or guessing and are HARDCORE. `score` sums weight × uses, so it also grows with how many
 * hard steps a puzzle needs — useful for ordering puzzles within a tier.
 */
export function classifyDifficulty(result: LogicalSolveResult): ClassificationResult {
  let score = 0;
  let difficulty: Difficulty = Difficulty.EASY;
  for (const [name, count] of Object.entries(result.techniqueCounts) as Array<[TechniqueName, number]>) {
    const info = TECHNIQUE_INFO[name];
    score += info.weight * count;
    if (TIER_RANK[info.tier] > TIER_RANK[difficulty]) difficulty = info.tier;
  }

  if (!result.solved) return { difficulty: Difficulty.HARDCORE, score: HARDCORE_SCORE_BASE + score };
  return { difficulty, score };
}
