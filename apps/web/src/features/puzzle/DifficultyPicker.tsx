import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { DifficultyTier } from "@sudoku-2077/api-types";
import { usePuzzles } from "./api.js";

const DIFFICULTIES: DifficultyTier[] = ["EASY", "MEDIUM", "HARD", "HARDCORE"];

export function DifficultyPicker() {
  const [selected, setSelected] = useState<DifficultyTier | null>(null);
  const navigate = useNavigate();
  const { data, isLoading } = usePuzzles(selected);

  useEffect(() => {
    if (data) {
      navigate(`/puzzles/${data.id}`);
    }
  }, [data, navigate]);

  return (
    <section>
      <h2>Pick a difficulty</h2>
      {DIFFICULTIES.map((difficulty) => (
        <button key={difficulty} onClick={() => setSelected(difficulty)}>
          {difficulty}
        </button>
      ))}
      {selected && isLoading && <p>Loading a {selected.toLowerCase()} puzzle…</p>}
    </section>
  );
}
