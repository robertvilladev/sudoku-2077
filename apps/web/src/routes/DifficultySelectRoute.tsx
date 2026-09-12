import { CubeTransparentIcon } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { PageFlicker } from "@/components/cyberpunk/PageFlicker";
import { DifficultyPicker } from "../features/puzzle/DifficultyPicker.js";
import { useDailyChallenge } from "../features/puzzle/api.js";

export function DifficultySelectRoute() {
  const daily = useDailyChallenge();

  return (
    <PageFlicker>
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-4 py-8">
        <nav className="flex items-center gap-2 border-b border-[color:var(--divider)] pb-3 font-mono text-lg font-semibold">
          <CubeTransparentIcon className="text-accent" />
          <Link to="/">SUDOKU_2077</Link>
        </nav>

        <h1 className="font-mono text-2xl font-semibold">SELECT DIFFICULTY</h1>

        {daily.data && (
          <Link
            to={`/puzzles/${daily.data.puzzle.id}`}
            className="flex items-center justify-between rounded-lg p-5 shadow-[0_0_0_1px_var(--divider)]"
            style={{ background: "linear-gradient(120deg, var(--color-surface), var(--color-accent-900))" }}
          >
            <div>
              <div className="font-semibold">DAILY CHALLENGE</div>
              <div className="font-mono text-xs text-accent-300">{daily.data.puzzle.difficulty} TIER</div>
            </div>
          </Link>
        )}

        <DifficultyPicker />
      </div>
    </PageFlicker>
  );
}
