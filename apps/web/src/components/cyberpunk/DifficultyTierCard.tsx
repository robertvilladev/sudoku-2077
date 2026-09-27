import { clsx } from "clsx";
import { FormattedMessage } from "react-intl";
import type { DifficultyTier } from "@sudoku-2077/api-types";
import { DIFFICULTY_CODENAME, DIFFICULTY_LABEL } from "../../lib/i18n/difficulty.js";

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
      <span className="font-mono text-lg font-semibold uppercase">
        <FormattedMessage id={DIFFICULTY_LABEL[difficulty]} />
      </span>
      <span aria-hidden="true" className="font-mono text-[11px] tracking-wide text-accent-300">
        <FormattedMessage id={DIFFICULTY_CODENAME[difficulty]} />
      </span>
    </button>
  );
}
