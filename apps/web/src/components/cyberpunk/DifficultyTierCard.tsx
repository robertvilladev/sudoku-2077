import { clsx } from "clsx";
import type { DifficultyTier } from "@sudoku-2077/api-types";

const FLAVOR: Record<DifficultyTier, string> = {
  EASY: "ROOKIE RUN",
  MEDIUM: "STREET LEVEL",
  HARD: "CORPO GRADE",
  HARDCORE: "GHOST PROTOCOL",
};

interface DifficultyTierCardProps {
  difficulty: DifficultyTier;
  isSelected: boolean;
  onSelect: () => void;
}

export function DifficultyTierCard({ difficulty, isSelected, onSelect }: DifficultyTierCardProps) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onSelect}
      className={clsx(
        "flex flex-col gap-2.5 rounded-lg bg-surface p-5 text-left transition-shadow",
        isSelected ? "glow-card-selected" : "shadow-sm hover:shadow-md"
      )}
    >
      <span className="font-mono text-lg font-semibold">{difficulty}</span>
      <span aria-hidden="true" className="font-mono text-[11px] tracking-wide text-accent-300">
        {FLAVOR[difficulty]}
      </span>
    </button>
  );
}
