import "dotenv/config";
import { createPuzzle, type Difficulty } from "@sudoku-2077/sudoku-core";
import { prisma } from "../db/client.js";

const MIN_POOL_SIZE = Number(process.env.MIN_POOL_SIZE ?? 20);
const DAILY_CHALLENGE_LOOKAHEAD_DAYS = Number(process.env.DAILY_CHALLENGE_LOOKAHEAD_DAYS ?? 30);
const MAX_GENERATION_ATTEMPTS = 4000;
const DAY_MS = 24 * 60 * 60 * 1000;

const TIERS: Difficulty[] = ["EASY", "MEDIUM", "HARD", "HARDCORE"];

// Difficulty isn't directly steerable at generation time — we spread givens counts across a wide
// range and let the logical solver classify each puzzle, then bucket it wherever it actually landed.
function randomTargetGivens(): number {
  return 22 + Math.floor(Math.random() * 24); // 22..45
}

async function replenishPools(): Promise<void> {
  const counts = new Map<Difficulty, number>();
  for (const tier of TIERS) {
    counts.set(tier, await prisma.puzzle.count({ where: { difficulty: tier } }));
  }
  console.log("[replenish] pool counts before:", Object.fromEntries(counts));

  let attempts = 0;
  while (attempts < MAX_GENERATION_ATTEMPTS && TIERS.some((tier) => (counts.get(tier) ?? 0) < MIN_POOL_SIZE)) {
    attempts++;
    const puzzle = createPuzzle({ targetGivens: randomTargetGivens() });
    const currentCount = counts.get(puzzle.difficulty) ?? 0;

    if (currentCount >= MIN_POOL_SIZE) continue; // this tier is already full; discard and keep trying

    await prisma.puzzle.create({
      data: {
        givens: puzzle.givens,
        solution: puzzle.solution,
        difficulty: puzzle.difficulty,
        difficultyScore: puzzle.difficultyScore,
        techniques: puzzle.techniques,
        givensCount: puzzle.givensCount,
      },
    });
    counts.set(puzzle.difficulty, currentCount + 1);
  }

  console.log("[replenish] pool counts after:", Object.fromEntries(counts));
  if (attempts >= MAX_GENERATION_ATTEMPTS) {
    console.warn(`[replenish] hit max generation attempts (${MAX_GENERATION_ATTEMPTS}); some tiers may still be under target`);
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
