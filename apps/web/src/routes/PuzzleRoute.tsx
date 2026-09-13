import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { DifficultyTier } from "@sudoku-2077/api-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { GlitchText } from "@/components/cyberpunk/GlitchText";
import { HudBar } from "@/components/cyberpunk/HudBar";
import { PageFlicker } from "@/components/cyberpunk/PageFlicker";
import { SudokuGrid } from "@/components/cyberpunk/SudokuGrid";
import { ActionRow, NumberPad } from "@/components/cyberpunk/NumberPad";
import { useSettings } from "../lib/settings/SettingsContext.js";
import { usePuzzle, useValidatePuzzle } from "../features/puzzle/api.js";
import { useBoardState } from "../features/puzzle/useBoardState.js";
import { useGameTimer } from "../features/puzzle/useGameTimer.js";

export function PuzzleRoute() {
  const { id = "" } = useParams();
  const { data: puzzle, isLoading } = usePuzzle(id);

  if (isLoading) return <p className="p-8 font-mono text-sm text-neutral-500">Loading puzzle…</p>;
  if (!puzzle) return <p className="p-8 font-mono text-sm text-neutral-500">Puzzle not found.</p>;

  return <PuzzleBoard puzzleId={puzzle.id} givens={puzzle.givens} difficulty={puzzle.difficulty} />;
}

function PuzzleBoard({
  puzzleId,
  givens,
  difficulty,
}: {
  puzzleId: string;
  givens: string;
  difficulty: DifficultyTier;
}) {
  const navigate = useNavigate();
  const board = useBoardState(givens);
  const validate = useValidatePuzzle(puzzleId);
  const timer = useGameTimer();
  const settings = useSettings();
  const [isPaused, setIsPaused] = useState(false);
  const [validatedBoardString, setValidatedBoardString] = useState<string | null>(null);

  useEffect(() => {
    // Keyed on boardString rather than "have we ever validated" so a board that was complete-but-wrong
    // gets re-checked (and can still win) once the player edits it into a new complete state.
    if (board.isComplete && board.boardString !== validatedBoardString && !validate.isPending) {
      setValidatedBoardString(board.boardString);
      validate.mutate(board.boardString);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire validation once per unique complete boardString, not on every validate identity change
  }, [board.isComplete, board.boardString, validatedBoardString]);

  const isWon = validate.data?.completed === true && validate.data.correct === true;

  useEffect(() => {
    if (isWon) timer.pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- timer.pause is stable; timer itself is a fresh object every render
  }, [isWon]);

  return (
    <PageFlicker>
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 px-4 py-4">
        <HudBar
          elapsedSeconds={timer.elapsedSeconds}
          mistakeCount={board.mistakeCount}
          combo={board.combo}
          difficulty={difficulty}
          onPause={() => {
            timer.pause();
            setIsPaused(true);
          }}
        />

        {validate.isError && (
          <div
            role="alert"
            className="flex items-center justify-between rounded-md border border-[oklch(66%_0.16_25)] px-4 py-2 font-mono text-sm text-[oklch(66%_0.16_25)]"
          >
            <span>Couldn't verify your solution — check your connection.</span>
            <Button variant="secondary" onClick={() => validate.mutate(board.boardString)}>
              RETRY
            </Button>
          </div>
        )}

        <SudokuGrid board={board} />

        <NumberPad
          grid={board.grid}
          onDigit={(digit) => {
            if (board.selectedIndex === null) return;
            if (board.notesMode) {
              board.toggleNote(board.selectedIndex, digit);
            } else {
              board.setCell(board.selectedIndex, digit);
            }
          }}
        />

        <ActionRow
          notesMode={board.notesMode}
          onToggleNotes={board.toggleNotesMode}
          onUndo={board.undo}
          canUndo={board.canUndo}
          onErase={() => board.selectedIndex !== null && board.eraseCell(board.selectedIndex)}
        />

        <Dialog open={isWon}>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <Badge variant="outline" className="self-start">
                PUZZLE_CLEARED
              </Badge>
              <DialogTitle asChild>
                <GlitchText className="font-mono text-2xl font-bold glow-text-win">GRID DECRYPTED</GlitchText>
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-4">
              <Stat label="TIME" value={formatTime(timer.elapsedSeconds)} />
              <Stat label="MISTAKES" value={String(board.mistakeCount)} />
              <Stat label="MAX COMBO" value={`×${board.maxCombo}`} accent />
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => navigate("/")}>
                MENU
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isPaused}
          onOpenChange={(open) => {
            setIsPaused(open);
            if (open) timer.pause();
            else timer.resume();
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>SYSTEM PAUSED</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <SettingRow label="SOUND FX" value={settings.soundOn} onToggle={settings.toggleSound} />
              <SettingRow
                label="CRT SCANLINE EFFECT"
                value={settings.scanlineOn}
                onToggle={settings.toggleScanline}
              />
              <SettingRow
                label="AUTO-CLEAR NOTES"
                value={settings.autoClearNotesOn}
                onToggle={settings.toggleAutoClearNotes}
              />
            </div>
            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsPaused(false);
                  timer.resume();
                }}
              >
                RESUME
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (board.isComplete || window.confirm("Quit to menu? Your progress will be lost.")) {
                    navigate("/");
                  }
                }}
              >
                QUIT TO MENU
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageFlicker>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-[11px] tracking-wide text-neutral-500">{label}</div>
      <div className={`font-mono text-lg font-semibold ${accent ? "text-accent-300" : ""}`}>{value}</div>
    </div>
  );
}

function SettingRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between font-mono text-xs text-neutral-500">
      <span>{label}</span>
      <ToggleGroup type="single" value={value ? "on" : "off"} onValueChange={(v) => v && onToggle()}>
        <ToggleGroupItem value="on">ON</ToggleGroupItem>
        <ToggleGroupItem value="off">OFF</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
