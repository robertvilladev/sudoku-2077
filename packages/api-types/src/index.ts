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
  timeSeconds: z.number().int().nonnegative().optional(),
  mistakeCount: z.number().int().nonnegative().optional(),
  maxCombo: z.number().int().nonnegative().optional(),
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

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const SignupRequestSchema = LoginRequestSchema;
export type SignupRequest = z.infer<typeof SignupRequestSchema>;

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  user: z.object({ id: z.string(), email: z.string().email() }),
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const CompletionSchema = z.object({
  puzzleId: z.string(),
  difficulty: DifficultySchema,
  completedAt: z.string(),
  timeSeconds: z.number().int().nonnegative(),
  mistakeCount: z.number().int().nonnegative(),
  maxCombo: z.number().int().nonnegative(),
});
export type Completion = z.infer<typeof CompletionSchema>;

export const CompletionsResponseSchema = z.array(CompletionSchema);
export type CompletionsResponse = z.infer<typeof CompletionsResponseSchema>;
