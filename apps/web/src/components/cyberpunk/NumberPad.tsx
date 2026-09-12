import { ArrowCounterClockwiseIcon, EraserIcon, PencilSimpleIcon } from "@phosphor-icons/react";
import { clsx } from "clsx";
import type { Grid } from "@sudoku-2077/sudoku-core";
import { Button } from "@/components/ui/button";

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

interface NumberPadProps {
  grid: Grid;
  onDigit: (digit: number) => void;
}

export function NumberPad({ grid, onDigit }: NumberPadProps) {
  const remaining = DIGITS.map((digit) => 9 - grid.filter((value) => value === digit).length);

  return (
    <div className="grid grid-cols-9 gap-1.5 max-[480px]:grid-cols-3">
      {DIGITS.map((digit, i) => (
        <button
          key={digit}
          type="button"
          aria-label={`Enter ${digit}`}
          disabled={remaining[i] <= 0}
          onClick={() => onDigit(digit)}
          className={clsx(
            "relative flex size-[52px] items-center justify-center rounded-md border font-mono text-xl",
            "border-[color:var(--divider)] hover:bg-[color-mix(in_srgb,var(--color-text)_7%,transparent)]",
            "disabled:pointer-events-none disabled:opacity-45"
          )}
        >
          {digit}
          <span aria-hidden="true" className="absolute top-1 right-1.5 text-[9px] text-neutral-600">
            {remaining[i]}
          </span>
        </button>
      ))}
    </div>
  );
}

interface ActionRowProps {
  notesMode: boolean;
  onToggleNotes: () => void;
  onUndo: () => void;
  canUndo: boolean;
  onErase: () => void;
}

export function ActionRow({ notesMode, onToggleNotes, onUndo, canUndo, onErase }: ActionRowProps) {
  return (
    <div className="flex gap-2">
      <Button
        variant={notesMode ? "primary" : "secondary"}
        size="stack"
        onClick={onToggleNotes}
        className="flex-1 text-xs"
      >
        <PencilSimpleIcon size={18} />
        NOTES
      </Button>
      <Button
        variant="secondary"
        size="stack"
        disabled={!canUndo}
        onClick={onUndo}
        className="flex-1 text-xs"
      >
        <ArrowCounterClockwiseIcon size={18} />
        UNDO
      </Button>
      <Button variant="secondary" size="stack" onClick={onErase} className="flex-1 text-xs">
        <EraserIcon size={18} />
        ERASE
      </Button>
    </div>
  );
}
