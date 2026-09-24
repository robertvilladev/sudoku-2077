import { describe, expect, it } from "vitest";
import { generatePuzzle, generateSolvedGrid } from "./generator.js";
import { countSolutions } from "./solver/bruteForceSolver.js";
import { createRng } from "./random.js";
import { isValidSolution, referenceCountSolutions } from "./testing/referenceChecker.js";

describe("generateSolvedGrid", () => {
  it("produces a fully valid, fully filled grid", () => {
    const grid = generateSolvedGrid();
    expect(grid).toHaveLength(81);
    expect(isValidSolution(grid)).toBe(true);
  });

  it("produces different solutions across calls", () => {
    const a = generateSolvedGrid();
    const b = generateSolvedGrid();
    expect(a.join("")).not.toBe(b.join(""));
  });

  it("is reproducible from a seed", () => {
    expect(generateSolvedGrid(createRng("s"))).toEqual(generateSolvedGrid(createRng("s")));
  });
});

describe("generatePuzzle", () => {
  it("produces a puzzle with a unique solution matching the stored solution", () => {
    const { puzzle, solution } = generatePuzzle({ targetGivens: 30 });
    expect(countSolutions(puzzle, 2)).toBe(1);
    expect(isValidSolution(solution)).toBe(true);
    for (let i = 0; i < 81; i++) {
      if (puzzle[i] !== 0) expect(puzzle[i]).toBe(solution[i]);
    }
  });

  it("respects a lower givens target for a harder puzzle", () => {
    const { puzzle } = generatePuzzle({ targetGivens: 24 });
    const givensCount = puzzle.filter((v) => v !== 0).length;
    expect(givensCount).toBeLessThanOrEqual(32); // may not hit target exactly if uniqueness blocks removal
    expect(countSolutions(puzzle, 2)).toBe(1);
  });

  it("is reproducible from a seed", () => {
    const a = generatePuzzle({ targetGivens: 0, rng: createRng("repro") });
    const b = generatePuzzle({ targetGivens: 0, rng: createRng("repro") });
    expect(a).toEqual(b);
  });

  it("keeps 180° rotational symmetry when asked", () => {
    const { puzzle } = generatePuzzle({ targetGivens: 0, symmetric: true, rng: createRng("sym") });
    for (let i = 0; i < 81; i++) expect(puzzle[i] === 0).toBe(puzzle[80 - i] === 0);
    expect(referenceCountSolutions(puzzle)).toBe(1);
  });

  it("digs to a minimal puzzle when the target is 0: removing any given breaks uniqueness", () => {
    const { puzzle } = generatePuzzle({ targetGivens: 0, rng: createRng("minimal") });
    for (let i = 0; i < 81; i++) {
      if (puzzle[i] === 0) continue;
      const loosened = puzzle.slice();
      loosened[i] = 0;
      expect(referenceCountSolutions(loosened)).toBe(2);
    }
  });
});
