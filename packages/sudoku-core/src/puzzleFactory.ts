import { Difficulty, Grid, Puzzle, gridToString, stringToGrid } from "./types.js";
import { GeneratePuzzleOptions, generatePuzzle } from "./generator.js";
import { LogicalSolveResult, solveLogically } from "./solver/logicalSolver.js";
import { ClassificationResult, classifyDifficulty } from "./classifier.js";
import { Rng, createRng, randomSeed, shuffled } from "./random.js";
import { applyTransform, randomTransform } from "./transforms.js";

export interface CreatePuzzleOptions extends Omit<GeneratePuzzleOptions, "rng"> {
  /** Same seed + same options → same puzzle. A random seed is picked (and returned on the Puzzle) when omitted. */
  seed?: string;
}

interface Rated {
  logical: LogicalSolveResult;
  classification: ClassificationResult;
}

function rate(puzzle: Grid, solution: Grid): Rated {
  // Passing the solution turns on the per-step oracle: a buggy technique throws instead of mis-rating.
  const logical = solveLogically(puzzle, { solution });
  return { logical, classification: classifyDifficulty(logical) };
}

function toPuzzle(puzzle: Grid, solution: Grid, { logical, classification }: Rated, seed: string): Puzzle {
  return {
    givens: gridToString(puzzle),
    solution: gridToString(solution),
    difficulty: classification.difficulty,
    difficultyScore: classification.score,
    techniques: logical.techniquesUsed,
    givensCount: puzzle.filter((v) => v !== 0).length,
    seed,
  };
}

/** End-to-end: generate a unique-solution puzzle, classify it, and package it as a storable Puzzle. */
export function createPuzzle(options: CreatePuzzleOptions = {}): Puzzle {
  const { seed = randomSeed(), ...generateOptions } = options;
  const { puzzle, solution } = generatePuzzle({ ...generateOptions, rng: createRng(seed) });
  return toPuzzle(puzzle, solution, rate(puzzle, solution), seed);
}

const TIER_RANK: Record<Difficulty, number> = { EASY: 0, MEDIUM: 1, HARD: 2, HARDCORE: 3 };

/** How many clues steering may add back, and how many cells it tries per clue, before giving up. */
const MAX_STEER_CLUES = 10;
const MAX_STEER_TRIES_PER_CLUE = 24;

/**
 * Adds givens back (from the solution) to a puzzle that rated harder than `target`, one at a time,
 * only keeping a clue if the puzzle stays at or above `target`. Adding a given can never break
 * uniqueness, and each clue removes some of the hard deductions — so a HARDCORE puzzle can be walked
 * down into HARD, or HARD into MEDIUM. Only cells the logical solver got stuck on are tried: a clue
 * it could already deduce changes nothing.
 */
function steerDown(puzzle: Grid, solution: Grid, rated: Rated, target: Difficulty, rng: Rng): Rated {
  let current = rated;
  for (let clue = 0; clue < MAX_STEER_CLUES; clue++) {
    if (TIER_RANK[current.classification.difficulty] <= TIER_RANK[target]) break;
    const stuckCells = shuffled(
      puzzle.map((_, i) => i).filter((i) => current.logical.grid[i] === 0),
      rng
    ).slice(0, MAX_STEER_TRIES_PER_CLUE);

    let accepted = false;
    for (const i of stuckCells) {
      puzzle[i] = solution[i];
      const next = rate(puzzle, solution);
      if (TIER_RANK[next.classification.difficulty] >= TIER_RANK[target]) {
        current = next;
        accepted = true;
        break;
      }
      puzzle[i] = 0;
    }
    if (!accepted) break;
  }
  return current;
}

// Difficulty can't be dictated at generation time, but it can be aimed. EASY digs to a comfortable
// givens count; every harder tier digs until the puzzle is minimal (no given can be removed without
// losing uniqueness), then steers down by adding clues back if it overshot. Tuned with
// `npm run audit --workspace packages/sudoku-core`, which prints where each profile actually lands.
const EASY_GIVENS = { min: 36, max: 45 };

/**
 * Generates a puzzle aimed at `tier`. The result is classified honestly and may still land in another
 * tier (e.g. a minimal puzzle that is only EASY can't be made harder) — bucket it by `puzzle.difficulty`.
 * The returned `seed` ("TIER:seed") regenerates it exactly via `regeneratePuzzle`.
 */
export function createPuzzleForTier(tier: Difficulty, seed: string = randomSeed()): Puzzle {
  const targetGivens =
    tier === Difficulty.EASY
      ? EASY_GIVENS.min + Math.floor(createRng(`${seed}:target`)() * (EASY_GIVENS.max - EASY_GIVENS.min + 1))
      : 0;
  const { puzzle, solution } = generatePuzzle({ targetGivens, rng: createRng(seed) });
  let rated = rate(puzzle, solution);
  if (tier !== Difficulty.EASY) rated = steerDown(puzzle, solution, rated, tier, createRng(`${seed}:steer`));
  return toPuzzle(puzzle, solution, rated, `${tier}:${seed}`);
}

/**
 * Relabels/permutes a rated puzzle into a different-looking one with the same logic, so rare
 * HARD/HARDCORE finds can be multiplied instead of regenerated. The variant is re-classified rather
 * than inheriting the source's rating: the solver scans cells in a fixed order, so on rare occasions a
 * variant is solved via a different technique mix — bucket it by its own `difficulty`, like any puzzle.
 */
export function createPuzzleVariant(source: Puzzle, variantSeed: string = randomSeed()): Puzzle {
  const transform = randomTransform(createRng(variantSeed));
  const givens = applyTransform(stringToGrid(source.givens), transform);
  const solution = applyTransform(stringToGrid(source.solution), transform);
  return toPuzzle(givens, solution, rate(givens, solution), `${source.seed}~${variantSeed}`);
}

/**
 * Rebuilds a puzzle from the `seed` stored with it, for puzzles made by `createPuzzleForTier`
 * ("TIER:seed") and their variants ("TIER:seed~variantSeed"). Handy for reproducing a bug report.
 */
export function regeneratePuzzle(storedSeed: string): Puzzle {
  const [base, ...variantSeeds] = storedSeed.split("~");
  const separator = base.indexOf(":");
  const tier = base.slice(0, separator) as Difficulty;
  if (separator === -1 || !(tier in TIER_RANK)) {
    throw new Error(`Seed "${storedSeed}" was not produced by createPuzzleForTier`);
  }
  let puzzle = createPuzzleForTier(tier, base.slice(separator + 1));
  for (const variantSeed of variantSeeds) puzzle = createPuzzleVariant(puzzle, variantSeed);
  return puzzle;
}
