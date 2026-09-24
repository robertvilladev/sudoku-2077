/**
 * Generator/solver audit: generates puzzles with every tier profile, cross-checks each one against the
 * independent reference checker, and reports the tier mix, techniques and timings.
 *
 *   npm run audit --workspace packages/sudoku-core -- [puzzlesPerProfile=50] [--json]
 *
 * Exits non-zero on any correctness failure, so it can gate CI or a pool-replenish run.
 */
import { performance } from "node:perf_hooks";
import { Difficulty, TechniqueName, stringToGrid } from "../src/types.js";
import { countSolutions } from "../src/solver/bruteForceSolver.js";
import { solveLogically } from "../src/solver/logicalSolver.js";
import { createPuzzleForTier, createPuzzleVariant, regeneratePuzzle } from "../src/puzzleFactory.js";
import { isValidSolution, referenceCountSolutions } from "../src/testing/referenceChecker.js";

const args = process.argv.slice(2);
const perProfile = Number(args.find((a) => /^\d+$/.test(a)) ?? 50);
const asJson = args.includes("--json");
const TIERS = Object.values(Difficulty);

const failures: string[] = [];
const landed: Record<string, Record<string, number>> = {};
const timings: Record<string, number[]> = {};
const givens: Record<string, number[]> = {};
const techniqueUse: Partial<Record<TechniqueName, number>> = {};
let variantTierDrift = 0;
let variantsChecked = 0;

function check(label: string, ok: boolean): void {
  if (!ok) failures.push(label);
}

for (const profile of TIERS) {
  landed[profile] = {};
  timings[profile] = [];
  for (let k = 0; k < perProfile; k++) {
    const seed = `audit-${profile}-${k}`;
    const start = performance.now();
    let puzzle;
    try {
      puzzle = createPuzzleForTier(profile, seed);
    } catch (err) {
      // The per-step solution oracle throws when a technique makes an invalid deduction.
      failures.push(`${profile}:${seed} threw: ${(err as Error).message}`);
      continue;
    }
    timings[profile].push(performance.now() - start);

    const tag = puzzle.seed;
    const grid = stringToGrid(puzzle.givens);
    const solution = stringToGrid(puzzle.solution);
    check(`${tag}: solution is not a valid grid`, isValidSolution(solution));
    check(
      `${tag}: a given disagrees with the solution`,
      grid.every((v, i) => v === 0 || v === solution[i])
    );
    check(`${tag}: reference checker found ≠1 solution`, referenceCountSolutions(grid) === 1);
    check(`${tag}: fast solver found ≠1 solution`, countSolutions(grid) === 1);
    const logical = solveLogically(grid, { solution });
    check(
      `${tag}: logical solver's answer differs from the solution`,
      !logical.solved || logical.grid.join("") === puzzle.solution
    );
    check(`${tag}: seed does not regenerate the same puzzle`, regeneratePuzzle(tag).givens === puzzle.givens);

    landed[profile][puzzle.difficulty] = (landed[profile][puzzle.difficulty] ?? 0) + 1;
    (givens[puzzle.difficulty] ??= []).push(puzzle.givensCount);
    for (const t of puzzle.techniques) techniqueUse[t] = (techniqueUse[t] ?? 0) + 1;

    if (puzzle.difficulty === "HARD" || puzzle.difficulty === "HARDCORE") {
      const variant = createPuzzleVariant(puzzle, `v${k}`);
      variantsChecked++;
      if (variant.difficulty !== puzzle.difficulty) variantTierDrift++;
      check(
        `${variant.seed}: variant is not unique`,
        referenceCountSolutions(stringToGrid(variant.givens)) === 1
      );
      check(`${variant.seed}: variant solution invalid`, isValidSolution(stringToGrid(variant.solution)));
    }
  }
}

const stats = (xs: number[]) => {
  const s = xs.slice().sort((a, b) => a - b);
  return s.length ? { min: s[0], median: s[s.length >> 1], max: s[s.length - 1] } : null;
};
const report = {
  puzzlesPerProfile: perProfile,
  failures,
  landedByProfile: landed,
  msPerPuzzleByProfile: Object.fromEntries(
    Object.entries(timings).map(([k, v]) => [
      k,
      { ...stats(v.map(Math.round)), avg: Math.round(v.reduce((a, b) => a + b, 0) / v.length) },
    ])
  ),
  givensByTier: Object.fromEntries(Object.entries(givens).map(([k, v]) => [k, stats(v)])),
  puzzlesUsingTechnique: techniqueUse,
  variants: { checked: variantsChecked, tierDrift: variantTierDrift },
};

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`\nAudit: ${perProfile} puzzles per profile, ${failures.length} correctness failures`);
  for (const f of failures.slice(0, 20)) console.log(`  ✗ ${f}`);
  console.log("\nWhere each profile's puzzles landed:");
  console.table(landed);
  console.log("ms per puzzle by profile:");
  console.table(report.msPerPuzzleByProfile);
  console.log("givens count by landed tier:");
  console.table(report.givensByTier);
  console.log("puzzles using each technique:");
  console.table(techniqueUse);
  console.log(`variants: ${variantsChecked} checked, ${variantTierDrift} re-rated into a different tier`);
}
process.exitCode = failures.length ? 1 : 0;
