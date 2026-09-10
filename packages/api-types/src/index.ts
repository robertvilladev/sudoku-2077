import { z } from "zod";

/**
 * The wire contract shared between the API and any client (web, React Native, ...). Kept dependency-free
 * from @sudoku-2077/sudoku-core on purpose so a client can import just this package without pulling in
 * the solver/generator.
 */

export const DifficultySchema = z.enum(["EASY", "MEDIUM", "HARD", "HARDCORE"]);
export type DifficultyTier = z.infer<typeof DifficultySchema>;

// A puzzle as sent to clients: givens only, never the solution.
export const PublicPuzzleSchema = z.object({
  id: z.string(),
  givens: z.string().length(81),
  difficulty: DifficultySchema,
  difficultyScore: z.number().int().nonnegative(),
  givensCount: z.number().int().min(17).max(81),
  createdAt: z.string(),
});
export type PublicPuzzle = z.infer<typeof PublicPuzzleSchema>;

export const DailyChallengeResponseSchema = z.object({
  date: z.string(), // YYYY-MM-DD, UTC
  puzzle: PublicPuzzleSchema,
});
export type DailyChallengeResponse = z.infer<typeof DailyChallengeResponseSchema>;

export const GetPuzzlesQuerySchema = z.object({
  difficulty: z.preprocess(
    (value) => (typeof value === "string" ? value.toUpperCase() : value),
    DifficultySchema
  ),
});
export type GetPuzzlesQuery = z.infer<typeof GetPuzzlesQuerySchema>;

export const ValidatePuzzleRequestSchema = z.object({
  board: z.string().length(81),
});
export type ValidatePuzzleRequest = z.infer<typeof ValidatePuzzleRequestSchema>;

export const ValidatePuzzleResponseSchema = z.object({
  correct: z.boolean(),
  completed: z.boolean(),
});
export type ValidatePuzzleResponse = z.infer<typeof ValidatePuzzleResponseSchema>;

export const ErrorResponseSchema = z.object({
  error: z.string(),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
