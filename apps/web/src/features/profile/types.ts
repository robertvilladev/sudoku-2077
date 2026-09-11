import { z } from "zod";
import { DifficultySchema } from "@sudoku-2077/api-types";

// Provisional: no completions-listing endpoint exists yet. Phase 1 introduces the PuzzleCompletion
// model this will eventually read from; shape it to match once that lands.
export const CompletionSchema = z.object({
  puzzleId: z.string(),
  difficulty: DifficultySchema,
  completedAt: z.string(),
  timeSeconds: z.number().int().nonnegative(),
});
export type Completion = z.infer<typeof CompletionSchema>;

export const CompletionsResponseSchema = z.array(CompletionSchema);
