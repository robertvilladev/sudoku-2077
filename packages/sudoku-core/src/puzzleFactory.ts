import { Puzzle, gridToString } from "./types.js";
import { GeneratePuzzleOptions, generatePuzzle } from "./generator.js";
import { solveLogically } from "./solver/logicalSolver.js";
import { classifyDifficulty } from "./classifier.js";

/** End-to-end: generate a unique-solution puzzle, classify it, and package it as a storable Puzzle. */
export function createPuzzle(options: GeneratePuzzleOptions = {}): Puzzle {
  const { puzzle, solution } = generatePuzzle(options);
  const logicalResult = solveLogically(puzzle);
  const { difficulty, score } = classifyDifficulty(logicalResult);

  return {
    givens: gridToString(puzzle),
    solution: gridToString(solution),
    difficulty,
    difficultyScore: score,
    techniques: logicalResult.techniquesUsed,
    givensCount: puzzle.filter((v) => v !== 0).length,
  };
}
