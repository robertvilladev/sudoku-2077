import { useMutation, useQuery } from "@tanstack/react-query";
import {
  DailyChallengeResponseSchema,
  PublicPuzzleSchema,
  ValidatePuzzleResponseSchema,
  type DifficultyTier,
} from "@sudoku-2077/api-types";
import { getJson, postJson } from "../../lib/apiClient.js";

export function useDailyChallenge() {
  return useQuery({
    queryKey: ["daily-challenge"],
    queryFn: () => getJson("/api/daily-challenge", DailyChallengeResponseSchema),
  });
}

export function usePuzzles(difficulty: DifficultyTier | null, attempt = 0) {
  return useQuery({
    queryKey: ["puzzles", difficulty, attempt],
    queryFn: () => getJson(`/api/puzzles?difficulty=${difficulty}`, PublicPuzzleSchema),
    enabled: difficulty !== null,
  });
}

export function usePuzzle(id: string) {
  return useQuery({
    queryKey: ["puzzle", id],
    queryFn: () => getJson(`/api/puzzles/${id}`, PublicPuzzleSchema),
    enabled: id !== "",
  });
}

export function useValidatePuzzle(id: string) {
  return useMutation({
    mutationFn: (board: string) =>
      postJson(`/api/puzzles/${id}/validate`, ValidatePuzzleResponseSchema, { board }),
  });
}
