import { ClockIcon, PauseIcon } from "@phosphor-icons/react";
import type { DifficultyTier } from "@sudoku-2077/api-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ComboBadge } from "./ComboBadge.js";
import { MistakePips } from "./MistakePips.js";

interface HudBarProps {
  elapsedSeconds: number;
  mistakeCount: number;
  combo: number;
  difficulty: DifficultyTier;
  onPause: () => void;
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function HudBar({ elapsedSeconds, mistakeCount, combo, difficulty, onPause }: HudBarProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-center gap-2">
        <ClockIcon className="text-accent-300" />
        <span className="font-mono text-xl font-semibold">{formatTime(elapsedSeconds)}</span>
      </div>
      <MistakePips count={mistakeCount} />
      <ComboBadge combo={combo} />
      <Badge variant="outline">{difficulty}</Badge>
      <Button variant="secondary" size="icon" onClick={onPause} aria-label="Pause">
        <PauseIcon />
      </Button>
    </div>
  );
}
