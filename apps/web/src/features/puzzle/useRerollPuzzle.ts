import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { DifficultyTier } from "@sudoku-2077/api-types";
import { usePuzzles } from "./api.js";

// Module-level, not component-local: PuzzleBoard remounts (keyed by puzzle id) on every reroll, so a
// per-instance counter restarts at 0 and its first reroll always requests query key
// ["puzzles", difficulty, 1] — still within usePuzzles' 30s staleTime from the *previous* board's
// reroll that produced this one, so TanStack Query would serve that stale cache entry instead of
// fetching. A counter shared across every instance guarantees each reroll's key is one this session
// has never requested before, forcing an actual network fetch every time.
let rerollAttemptCounter = 0;

export function useRerollPuzzle(difficulty: DifficultyTier) {
  const [attempt, setAttempt] = useState(0);
  const navigate = useNavigate();
  const { data, isLoading } = usePuzzles(attempt > 0 ? difficulty : null, attempt);

  useEffect(() => {
    if (data) navigate(`/puzzles/${data.id}`);
  }, [data, navigate]);

  return { reroll: () => setAttempt(() => ++rerollAttemptCounter), isLoading };
}
