import { Grid, TechniqueName, cloneGrid } from "../types.js";
import { Candidates, computeCandidates } from "./candidates.js";
import { applyNakedSingle } from "./techniques/nakedSingle.js";
import { applyHiddenSingle } from "./techniques/hiddenSingle.js";
import { applyPointingPair } from "./techniques/pointingPair.js";
import { applyBoxLineReduction } from "./techniques/boxLineReduction.js";
import { applyNakedPair, applyNakedQuad, applyNakedTriple } from "./techniques/nakedSubset.js";
import { applyHiddenPair, applyHiddenTriple } from "./techniques/hiddenSubset.js";
import { applySwordfish, applyXWing } from "./techniques/fish.js";
import { applyXYWing, applyXYZWing } from "./techniques/wings.js";

export interface LogicalSolveResult {
  solved: boolean;
  grid: Grid;
  techniquesUsed: TechniqueName[];
  techniqueCounts: Partial<Record<TechniqueName, number>>;
}

export interface SolveLogicallyOptions {
  /**
   * The known solution. When given, every step is checked against it and a technique that places a
   * wrong digit or eliminates the true one throws immediately, naming itself. Generation always
   * passes it, so a buggy technique can never silently mis-rate (or mis-solve) a stored puzzle.
   */
  solution?: Grid;
}

interface Technique {
  name: TechniqueName;
  apply: (grid: Grid, candidates: Candidates) => boolean;
}

// Ordered easiest-first and grouped by tier (see classifier.ts): on each pass we restart from the
// simplest technique, so difficulty tracks the hardest technique actually *needed*.
const TECHNIQUES: Technique[] = [
  { name: TechniqueName.HIDDEN_SINGLE, apply: applyHiddenSingle },
  { name: TechniqueName.NAKED_SINGLE, apply: applyNakedSingle },
  { name: TechniqueName.POINTING_PAIR, apply: applyPointingPair },
  { name: TechniqueName.BOX_LINE_REDUCTION, apply: applyBoxLineReduction },
  { name: TechniqueName.NAKED_PAIR, apply: applyNakedPair },
  { name: TechniqueName.HIDDEN_PAIR, apply: applyHiddenPair },
  { name: TechniqueName.X_WING, apply: applyXWing },
  { name: TechniqueName.NAKED_TRIPLE, apply: applyNakedTriple },
  { name: TechniqueName.SWORDFISH, apply: applySwordfish },
  { name: TechniqueName.HIDDEN_TRIPLE, apply: applyHiddenTriple },
  { name: TechniqueName.XY_WING, apply: applyXYWing },
  { name: TechniqueName.XYZ_WING, apply: applyXYZWing },
  { name: TechniqueName.NAKED_QUAD, apply: applyNakedQuad },
];

function assertConsistent(
  grid: Grid,
  candidates: Candidates,
  solution: Grid,
  technique: TechniqueName
): void {
  for (let i = 0; i < grid.length; i++) {
    const ok = grid[i] !== 0 ? grid[i] === solution[i] : candidates[i].has(solution[i]);
    if (!ok) {
      throw new Error(`${technique} made an invalid deduction at cell ${i} (solution digit ${solution[i]})`);
    }
  }
}

/**
 * Solves the way a human would: only logical deduction, no guessing. If it gets stuck, `solved`
 * is false — that puzzle needs techniques beyond this list (chains, forcing nets) and is classified HARDCORE.
 */
export function solveLogically(givens: Grid, options: SolveLogicallyOptions = {}): LogicalSolveResult {
  const grid = cloneGrid(givens);
  const candidates = computeCandidates(grid);
  const techniqueCounts: Partial<Record<TechniqueName, number>> = {};

  let progressed = true;
  while (progressed && grid.includes(0)) {
    progressed = false;
    for (const technique of TECHNIQUES) {
      if (technique.apply(grid, candidates)) {
        techniqueCounts[technique.name] = (techniqueCounts[technique.name] ?? 0) + 1;
        if (options.solution) assertConsistent(grid, candidates, options.solution, technique.name);
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
