import { describe, expect, it } from "vitest";
import { Difficulty, stringToGrid } from "./types.js";
import { createPuzzle, createPuzzleForTier, createPuzzleVariant, regeneratePuzzle } from "./puzzleFactory.js";
import { isValidSolution, referenceCountSolutions } from "./testing/referenceChecker.js";

function expectSound(givens: string, solution: string): void {
  const grid = stringToGrid(givens);
  expect(isValidSolution(stringToGrid(solution))).toBe(true);
  expect(grid.every((v, i) => v === 0 || String(v) === solution[i])).toBe(true);
  expect(referenceCountSolutions(grid)).toBe(1);
}

describe("createPuzzle", () => {
  it("produces a fully-formed, internally-consistent Puzzle", () => {
    const puzzle = createPuzzle({ targetGivens: 30 });
    expect(puzzle.givens).toHaveLength(81);
    expect(puzzle.solution).toHaveLength(81);
    expect(Object.values(Difficulty)).toContain(puzzle.difficulty);
    expect(puzzle.givensCount).toBe(puzzle.givens.split("").filter((c) => c !== "0").length);
    expectSound(puzzle.givens, puzzle.solution);
  });

  it("is reproducible from its seed", () => {
    const a = createPuzzle({ seed: "abc", targetGivens: 28 });
    expect(createPuzzle({ seed: "abc", targetGivens: 28 })).toEqual(a);
    expect(a.seed).toBe("abc");
  });
});

describe("createPuzzleForTier", () => {
  it("yields sound puzzles for every tier profile", () => {
    for (const tier of Object.values(Difficulty)) {
      for (let k = 0; k < 5; k++) {
        const puzzle = createPuzzleForTier(tier, `sound-${k}`);
        expect(puzzle.seed).toBe(`${tier}:sound-${k}`);
        expectSound(puzzle.givens, puzzle.solution);
      }
    }
  });

  it("always lands EASY for the EASY profile", () => {
    for (let k = 0; k < 20; k++)
      expect(createPuzzleForTier(Difficulty.EASY, `easy-${k}`).difficulty).toBe("EASY");
  });

  // Regression guard on generation yield: before tier-aimed generation, HARD landed ~0.2% of the time.
  it("lands HARD for a meaningful share of HARD-profile attempts", () => {
    const hard = Array.from({ length: 40 }, (_, k) =>
      createPuzzleForTier(Difficulty.HARD, `yield-${k}`)
    ).filter((p) => p.difficulty === Difficulty.HARD);
    expect(hard.length).toBeGreaterThanOrEqual(4);
  });
});

describe("variants and regeneration", () => {
  it("createPuzzleVariant produces a sound, different-looking puzzle with a derived seed", () => {
    const source = createPuzzleForTier(Difficulty.HARDCORE, "variant-src");
    const variant = createPuzzleVariant(source, "v1");
    expect(variant.givens).not.toBe(source.givens);
    expect(variant.givensCount).toBe(source.givensCount);
    expect(variant.seed).toBe(`${source.seed}~v1`);
    expectSound(variant.givens, variant.solution);
  });

  it("regeneratePuzzle rebuilds tier puzzles and variants from the stored seed", () => {
    const source = createPuzzleForTier(Difficulty.HARD, "regen");
    const variant = createPuzzleVariant(source, "v2");
    expect(regeneratePuzzle(source.seed)).toEqual(source);
    expect(regeneratePuzzle(variant.seed)).toEqual(variant);
  });

  it("regeneratePuzzle rejects seeds it cannot interpret", () => {
    expect(() => regeneratePuzzle("no-tier")).toThrow();
    expect(() => regeneratePuzzle("IMPOSSIBLE:x")).toThrow();
  });
});
