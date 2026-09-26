import { describe, expect, it } from "vitest";
import { stringToGrid } from "../types.js";
import { countSolutions, solveBruteForce } from "./bruteForceSolver.js";
import { generatePuzzle } from "../generator.js";
import { createRng } from "../random.js";
import { referenceCountSolutions } from "../testing/referenceChecker.js";

// Classic example puzzle (Wikipedia "Sudoku" article) with a well-known unique solution.
const KNOWN_PUZZLE = "530070000600195000098000060800060003400803001700020006060000280000419005000080079";
const KNOWN_SOLUTION = "534678912672195348198342567859761423426853791713924856961537284287419635345286179";
// Among the hardest known puzzles for backtracking solvers — a performance/regression guard.
const GOLDEN_NUGGET = "000000039000001005003050800008090006070002000100400000009080050020000600400700000";

describe("bruteForceSolver", () => {
  it("solves a known puzzle and matches the published solution", () => {
    const grid = stringToGrid(KNOWN_PUZZLE);
    const solved = solveBruteForce(grid);
    expect(solved).not.toBeNull();
    expect(solved!.join("")).toBe(KNOWN_SOLUTION);
  });

  it("reports exactly one solution for a uniquely-solvable puzzle", () => {
    const grid = stringToGrid(KNOWN_PUZZLE);
    expect(countSolutions(grid, 2)).toBe(1);
  });

  it("reports more than one solution for an empty grid", () => {
    const grid = new Array(81).fill(0);
    expect(countSolutions(grid, 2)).toBe(2);
  });

  it("returns null / zero solutions for givens that already contradict each other", () => {
    const grid = stringToGrid(KNOWN_PUZZLE);
    grid[2] = grid[0]; // duplicate in the same row makes it unsolvable
    expect(solveBruteForce(grid)).toBeNull();
    expect(countSolutions(grid)).toBe(0);
  });

  it("never mutates its input", () => {
    const grid = stringToGrid(KNOWN_PUZZLE);
    solveBruteForce(grid);
    countSolutions(grid);
    expect(grid.join("")).toBe(KNOWN_PUZZLE);
  });

  it("handles a notoriously hard puzzle quickly", () => {
    const start = Date.now();
    expect(countSolutions(stringToGrid(GOLDEN_NUGGET))).toBe(1);
    expect(Date.now() - start).toBeLessThan(2000);
  });

  it("agrees with the independent reference checker on unique and non-unique grids", () => {
    for (let k = 0; k < 15; k++) {
      const { puzzle } = generatePuzzle({ targetGivens: 0, rng: createRng(`bf${k}`) });
      expect(countSolutions(puzzle)).toBe(referenceCountSolutions(puzzle));
      // Blanking one more given of a minimal puzzle always breaks uniqueness.
      const extra = puzzle.findIndex((v) => v !== 0);
      const loosened = puzzle.slice();
      loosened[extra] = 0;
      expect(countSolutions(loosened)).toBe(2);
      expect(referenceCountSolutions(loosened)).toBe(2);
    }
  });
});
