import { Grid, TechniqueName, cloneGrid } from "../types.js";
import { Candidates, computeCandidates } from "./candidates.js";
import { applyNakedSingle } from "./techniques/nakedSingle.js";
import { applyHiddenSingle } from "./techniques/hiddenSingle.js";
import { applyNakedPair } from "./techniques/nakedPair.js";
import { applyPointingPair } from "./techniques/pointingPair.js";
import { applyXWing } from "./techniques/xWing.js";

export interface LogicalSolveResult {
  solved: boolean;
  grid: Grid;
  techniquesUsed: TechniqueName[];
  techniqueCounts: Partial<Record<TechniqueName, number>>;
}

interface Technique {
  name: TechniqueName;
  apply: (grid: Grid, candidates: Candidates) => boolean;
}

// Ordered easiest-first: on each pass we always try the simplest technique first, so difficulty
// tracks the hardest technique actually *needed*, not just the last one attempted.
const TECHNIQUES: Technique[] = [
  { name: TechniqueName.NAKED_SINGLE, apply: applyNakedSingle },
  { name: TechniqueName.HIDDEN_SINGLE, apply: applyHiddenSingle },
  { name: TechniqueName.NAKED_PAIR, apply: applyNakedPair },
  { name: TechniqueName.POINTING_PAIR, apply: applyPointingPair },
  { name: TechniqueName.X_WING, apply: applyXWing },
];

/**
 * Solves the way a human would: only logical deduction, no guessing. If it gets stuck, `solved`
 * is false — that puzzle requires backtracking/guessing and is classified HARDCORE.
 */
export function solveLogically(givens: Grid): LogicalSolveResult {
  const grid = cloneGrid(givens);
  const candidates = computeCandidates(grid);
  const techniqueCounts: Partial<Record<TechniqueName, number>> = {};

  let progressed = true;
  while (progressed && grid.includes(0)) {
    progressed = false;
    for (const technique of TECHNIQUES) {
      if (technique.apply(grid, candidates)) {
        techniqueCounts[technique.name] = (techniqueCounts[technique.name] ?? 0) + 1;
        progressed = true;
        break;
      }
    }
  }

  return {
    solved: !grid.includes(0),
    grid,
    techniquesUsed: Object.keys(techniqueCounts) as TechniqueName[],
    techniqueCounts,
  };
}
