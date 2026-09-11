import type { Grid } from "@sudoku-2077/sudoku-core";
import styles from "./Board.module.css";

interface BoardProps {
  grid: Grid;
  givenMask: boolean[];
  conflicts: Set<number>;
  onCellChange: (index: number, value: number) => void;
}

export function Board({ grid, givenMask, conflicts, onCellChange }: BoardProps) {
  return (
    <div className={styles.board} role="grid">
      {grid.map((value, index) => {
        const isGiven = givenMask[index];
        const className = [styles.cell, isGiven && styles.given, conflicts.has(index) && styles.conflict]
          .filter(Boolean)
          .join(" ");

        return (
          <input
            key={index}
            role="gridcell"
            aria-label={`Cell ${index + 1}`}
            className={className}
            inputMode="numeric"
            maxLength={1}
            value={value === 0 ? "" : String(value)}
            readOnly={isGiven}
            onChange={(event) => {
              const digit = event.target.value.replace(/[^1-9]/g, "");
              onCellChange(index, digit === "" ? 0 : Number(digit));
            }}
          />
        );
      })}
    </div>
  );
}
