import { useEffect, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate } from "react-router-dom";
import type { DifficultyTier } from "@sudoku-2077/api-types";
import { DifficultyTierCard } from "@/components/cyberpunk/DifficultyTierCard";
import { DIFFICULTY_LABEL } from "../../lib/i18n/difficulty.js";
import { usePuzzles } from "./api.js";

const DIFFICULTIES: DifficultyTier[] = ["EASY", "MEDIUM", "HARD", "HARDCORE"];

export function DifficultyPicker() {
  const [selected, setSelected] = useState<DifficultyTier | null>(null);
  const navigate = useNavigate();
  const { data, isLoading } = usePuzzles(selected);
  const intl = useIntl();

  useEffect(() => {
    if (data) {
      navigate(`/puzzles/${data.id}`);
    }
  }, [data, navigate]);

  return (
    <section className="w-full max-w-3xl">
      <p className="mb-6 font-mono text-xs text-neutral-500">
        <FormattedMessage id="difficultyPrompt" />
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {DIFFICULTIES.map((difficulty) => (
          <DifficultyTierCard
            key={difficulty}
            difficulty={difficulty}
            isSelected={selected === difficulty}
            onSelect={() => setSelected(difficulty)}
          />
        ))}
      </div>
      {selected && isLoading && (
        <p className="mt-4 font-mono text-sm text-neutral-500">
          <FormattedMessage
            id="difficultyLoading"
            values={{
              difficulty: intl
                .formatMessage({ id: DIFFICULTY_LABEL[selected] })
                .toLocaleLowerCase(intl.locale),
            }}
          />
        </p>
      )}
    </section>
  );
}
