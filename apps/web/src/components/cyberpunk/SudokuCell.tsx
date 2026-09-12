import { clsx } from "clsx";
import { motion } from "motion/react";
import { useSettings } from "../../lib/settings/SettingsContext.js";
import { GlitchText } from "./GlitchText.js";

export interface SudokuCellProps {
  row: number;
  col: number;
  value: number;
  notes?: Set<number>;
  isGiven: boolean;
  isSelected: boolean;
  isPeerHighlighted: boolean;
  isSameValueHighlighted: boolean;
  isConflict: boolean;
  borderRight: "none" | "thin" | "thick";
  borderBottom: "none" | "thin" | "thick";
  onSelect: () => void;
}

export function SudokuCell({
  row,
  col,
  value,
  notes,
  isGiven,
  isSelected,
  isPeerHighlighted,
  isSameValueHighlighted,
  isConflict,
  borderRight,
  borderBottom,
  onSelect,
}: SudokuCellProps) {
  const { scanlineOn } = useSettings();

  return (
    <button
      type="button"
      role="gridcell"
      aria-label={`Row ${row + 1}, column ${col + 1}, ${value === 0 ? "empty" : value}`}
      aria-selected={isSelected}
      data-state={isConflict ? "conflict" : isGiven ? "given" : "default"}
      onClick={onSelect}
      className={clsx(
        "relative flex items-center justify-center font-mono text-[22px]",
        borderRight === "thick" && "border-r-2 border-r-accent-700",
        borderRight === "thin" && "border-r border-r-[color:var(--divider)]",
        borderBottom === "thick" && "border-b-2 border-b-accent-700",
        borderBottom === "thin" && "border-b border-b-[color:var(--divider)]",
        isConflict
          ? "bg-[color-mix(in_srgb,oklch(66%_0.16_25)_16%,transparent)]"
          : isSelected
            ? "z-10 bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)]"
            : isPeerHighlighted
              ? "bg-[color-mix(in_srgb,var(--color-accent)_6%,transparent)]"
              : "bg-transparent"
      )}
    >
      {isSelected &&
        (scanlineOn ? (
          <motion.span
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none absolute inset-0 glow-cell-selected"
          />
        ) : (
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 glow-cell-selected" />
        ))}
      {value !== 0 ? (
        isConflict ? (
          <GlitchText
            key={`${value}-conflict`}
            className="font-semibold text-[oklch(66%_0.16_25)] glow-text-error"
          >
            {value}
          </GlitchText>
        ) : (
          <span
            className={clsx(
              "font-semibold",
              isSameValueHighlighted ? "font-medium text-accent-300" : "text-neutral-200"
            )}
          >
            {value}
          </span>
        )
      ) : notes && notes.size > 0 ? (
        <div className="grid grid-cols-3 grid-rows-3 gap-0 text-[8px] leading-none text-neutral-600">
          {Array.from({ length: 9 }, (_, i) => i + 1).map((digit) => (
            <span key={digit} className="flex items-center justify-center">
              {notes.has(digit) ? digit : ""}
            </span>
          ))}
        </div>
      ) : null}
    </button>
  );
}
