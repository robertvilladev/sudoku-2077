import type { PublicPuzzle } from "@sudoku-2077/api-types";

interface PuzzleRecord {
  id: string;
  givens: string;
  difficulty: string;
  difficultyScore: number;
  givensCount: number;
  createdAt: Date;
}

/** Never include `solution` here — this is the shape sent to untrusted clients. */
export function toPublicPuzzle(puzzle: PuzzleRecord): PublicPuzzle {
  return {
    id: puzzle.id,
    givens: puzzle.givens,
    difficulty: puzzle.difficulty as PublicPuzzle["difficulty"],
    difficultyScore: puzzle.difficultyScore,
    givensCount: puzzle.givensCount,
    createdAt: puzzle.createdAt.toISOString(),
  };
}
