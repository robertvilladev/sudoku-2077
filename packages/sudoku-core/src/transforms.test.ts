import { describe, expect, it } from "vitest";
import { stringToGrid } from "./types.js";
import { createRng } from "./random.js";
import { applyTransform, randomTransform } from "./transforms.js";
import { isValidSolution, referenceCountSolutions } from "./testing/referenceChecker.js";

const PUZZLE = stringToGrid(
  "530070000600195000098000060800060003400803001700020006060000280000419005000080079"
);
const SOLUTION = stringToGrid(
  "534678912672195348198342567859761423426853791713924856961537284287419635345286179"
);

describe("grid transforms", () => {
  it("map a valid unique puzzle to a different-looking valid unique puzzle", () => {
    for (let k = 0; k < 20; k++) {
      const t = randomTransform(createRng(`t${k}`));
      const puzzle = applyTransform(PUZZLE, t);
      const solution = applyTransform(SOLUTION, t);
      expect(isValidSolution(solution)).toBe(true);
      expect(puzzle.every((v, i) => v === 0 || v === solution[i])).toBe(true);
      expect(puzzle.filter((v) => v !== 0)).toHaveLength(PUZZLE.filter((v) => v !== 0).length);
      expect(referenceCountSolutions(puzzle)).toBe(1);
      expect(puzzle.join("")).not.toBe(PUZZLE.join(""));
    }
  });

  it("is deterministic per seed", () => {
    const a = applyTransform(PUZZLE, randomTransform(createRng("same")));
    const b = applyTransform(PUZZLE, randomTransform(createRng("same")));
    expect(a).toEqual(b);
  });
});
