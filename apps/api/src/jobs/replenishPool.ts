import "dotenv/config";
import {
  createPuzzleForTier,
  createPuzzleVariant,
  type Difficulty,
  type Puzzle,
} from "@sudoku-2077/sudoku-core";
import { prisma } from "../db/client.js";

const MIN_POOL_SIZE = Number(process.env.MIN_POOL_SIZE ?? 20);
const DAILY_CHALLENGE_LOOKAHEAD_DAYS = Number(process.env.DAILY_CHALLENGE_LOOKAHEAD_DAYS ?? 30);
// Rare HARD/HARDCORE finds are multiplied into this many relabelled/permuted variants (same logic,
// different-looking grid) instead of paying to generate each one from scratch.
const VARIANTS_PER_RARE_FIND = Number(process.env.VARIANTS_PER_RARE_FIND ?? 2);
const MAX_GENERATION_ATTEMPTS = 4000;
const DAY_MS = 24 * 60 * 60 * 1000;

const TIERS: Difficulty[] = ["EASY", "MEDIUM", "HARD", "HARDCORE"];
const RARE_TIERS: Difficulty[] = ["HARD", "HARDCORE"];

// The tier furthest below target, preferring harder tiers on a tie since they take more attempts to fill.
function mostStarvedTier(counts: Map<Difficulty, number>): Difficulty {
  let best = TIERS[0];
  for (const tier of TIERS) {
    if ((counts.get(tier) ?? 0) <= (counts.get(best) ?? 0)) best = tier;
  }
  return best;
}

async function replenishPools(): Promise<void> {
  const counts = new Map<Difficulty, number>();
  for (const tier of TIERS) {
    counts.set(tier, await prisma.puzzle.count({ where: { difficulty: tier } }));
  }
  console.log("[replenish] pool counts before:", Object.fromEntries(counts));

  let attempts = 0;
  while (
    attempts < MAX_GENERATION_ATTEMPTS &&
    TIERS.some((tier) => (counts.get(tier) ?? 0) < MIN_POOL_SIZE)
  ) {
    attempts++;
    // Aim at the tier that needs puzzles most, but classification is honest: whatever tier the
    // puzzle actually lands in is where it's stored (if that pool still has room).
    const aimedAt = mostStarvedTier(counts);
    const puzzle = createPuzzleForTier(aimedAt);
    const batch: Puzzle[] = [puzzle];
    if (RARE_TIERS.includes(puzzle.difficulty)) {
      for (let v = 0; v < VARIANTS_PER_RARE_FIND; v++) batch.push(createPuzzleVariant(puzzle));
    }

    for (const candidate of batch) {
      const currentCount = counts.get(candidate.difficulty) ?? 0;
      if (currentCount >= MIN_POOL_SIZE) continue; // this tier is already full; discard
      // A minimal puzzle that turned out singles-only is technically EASY, but with ~24 givens it's a
      // slog; the EASY pool only takes puzzles generated with the EASY profile's roomier givens range.
      if (candidate.difficulty === "EASY" && aimedAt !== "EASY") continue;

      await prisma.puzzle.create({
        data: {
          givens: candidate.givens,
          solution: candidate.solution,
          difficulty: candidate.difficulty,
          difficultyScore: candidate.difficultyScore,
          techniques: candidate.techniques,
          givensCount: candidate.givensCount,
          seed: candidate.seed,
        },
      });
      counts.set(candidate.difficulty, currentCount + 1);
    }
  }

  console.log(`[replenish] pool counts after ${attempts} generation attempts:`, Object.fromEntries(counts));
  if (attempts >= MAX_GENERATION_ATTEMPTS) {
    console.warn(
      `[replenish] hit max generation attempts (${MAX_GENERATION_ATTEMPTS}); some tiers may still be under target`
    );
  }
}

async function replenishDailyChallenges(): Promise<void> {
  const now = new Date();
  const todayUtcMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  for (let dayOffset = 0; dayOffset < DAILY_CHALLENGE_LOOKAHEAD_DAYS; dayOffset++) {
    const date = new Date(todayUtcMs + dayOffset * DAY_MS);
    const existing = await prisma.dailyChallenge.findUnique({ where: { date } });
    if (existing) continue;

    // Daily challenges are pulled from the MEDIUM pool: approachable but not trivial.
    const candidate = await prisma.puzzle.findFirst({
      where: { difficulty: "MEDIUM", dailyChallenge: null },
      orderBy: { servedCount: "asc" },
    });

    if (!candidate) {
      console.warn(`[replenish] no spare MEDIUM puzzle to assign for ${date.toISOString().slice(0, 10)}`);
      continue;
    }

    await prisma.dailyChallenge.create({ data: { date, puzzleId: candidate.id } });
    console.log(`[replenish] assigned daily challenge for ${date.toISOString().slice(0, 10)}`);
  }
}

async function main(): Promise<void> {
  await replenishPools();
  await replenishDailyChallenges();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
