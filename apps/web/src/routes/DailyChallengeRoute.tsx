import { Link } from "react-router-dom";
import { DifficultyPicker } from "../features/puzzle/DifficultyPicker.js";
import { useDailyChallenge } from "../features/puzzle/api.js";

export function DailyChallengeRoute() {
  const { data, isLoading, isError } = useDailyChallenge();

  return (
    <div>
      <h1>Sudoku 2077</h1>
      <section>
        <h2>Daily challenge</h2>
        {isLoading && <p>Loading…</p>}
        {isError && <p>No daily challenge available yet.</p>}
        {data && (
          <Link to={`/puzzles/${data.puzzle.id}`}>
            Play today's {data.puzzle.difficulty.toLowerCase()} puzzle
          </Link>
        )}
      </section>
      <DifficultyPicker />
    </div>
  );
}
