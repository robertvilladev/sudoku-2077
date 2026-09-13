import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { DifficultyTier } from "@sudoku-2077/api-types";
import { usePuzzles } from "./api.js";

export function useRerollPuzzle(difficulty: DifficultyTier) {
  const [attempt, setAttempt] = useState(0);
  const navigate = useNavigate();
  const { data, isLoading } = usePuzzles(attempt > 0 ? difficulty : null, attempt);

  useEffect(() => {
    if (data) navigate(`/puzzles/${data.id}`);
  }, [data, navigate]);

  return { reroll: () => setAttempt((n) => n + 1), isLoading };
}
