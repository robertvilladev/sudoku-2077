import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, useAnimationControls } from "motion/react";
import confetti from "canvas-confetti";
import { FormattedMessage, useIntl } from "react-intl";
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
import { useRerollPuzzle } from "../features/puzzle/useRerollPuzzle.js";
import { useGameTimer } from "../features/puzzle/useGameTimer.js";
import { clearProgress, readValidProgress, writeProgress } from "../features/puzzle/progressStorage.js";
import { playSfx, startAmbientHum, stopAmbientHum } from "../lib/audio/sfx.js";
import { DIFFICULTY_LABEL } from "../lib/i18n/difficulty.js";

export function PuzzleRoute() {
  const { id = "" } = useParams();
  const { data: puzzle, isLoading } = usePuzzle(id);

  if (isLoading || !puzzle) {
    return (
      <p className="p-8 font-mono text-sm text-neutral-500">
        <FormattedMessage id={isLoading ? "puzzleLoading" : "puzzleNotFound"} />
      </p>
    );
  }

  return (
    <PuzzleBoard key={puzzle.id} puzzleId={puzzle.id} givens={puzzle.givens} difficulty={puzzle.difficulty} />
  );
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
  const intl = useIntl();
  const board = useBoardState(givens, puzzleId);
  const validate = useValidatePuzzle(puzzleId);
  const { reroll, isLoading: isRerolling } = useRerollPuzzle(difficulty);
  const timer = useGameTimer(readValidProgress(puzzleId, givens.length)?.elapsedSeconds ?? 0);
  const settings = useSettings();
  const shakeControls = useAnimationControls();
  const [isPaused, setIsPaused] = useState(false);
  const [validatedBoardString, setValidatedBoardString] = useState<string | null>(null);

  useEffect(() => {
    // Keyed on boardString rather than "have we ever validated" so a board that was complete-but-wrong
    // gets re-checked (and can still win) once the player edits it into a new complete state.
    if (board.isComplete && board.boardString !== validatedBoardString && !validate.isPending) {
      setValidatedBoardString(board.boardString);
      validate.mutate({
        board: board.boardString,
        timeSeconds: timer.elapsedSeconds,
        mistakeCount: board.mistakeCount,
        maxCombo: board.maxCombo,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire validation once per unique complete boardString, not on every validate identity change
  }, [board.isComplete, board.boardString, validatedBoardString]);

  const isWon = validate.data?.completed === true && validate.data.correct === true;

  useEffect(() => {
    // Guard against the interval firing once more after timer.pause() (which only flips isRunning;
    // the underlying setInterval clears on next commit) — don't resurrect a just-cleared entry.
    if (isWon) return;
    // useBoardState persists board fields on every board change, but only knows about elapsedSeconds
    // via whatever was last stored — so re-save the same entry here whenever the timer ticks, folding
    // in the current elapsedSeconds without introducing a second parallel storage key.
    writeProgress(puzzleId, {
      grid: board.grid,
      notes: board.notes,
      mistakeCount: board.mistakeCount,
      combo: board.combo,
      maxCombo: board.maxCombo,
      elapsedSeconds: timer.elapsedSeconds,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run on every timer tick; board fields are read fresh from the closure each time
  }, [puzzleId, timer.elapsedSeconds]);

  useEffect(() => {
    if (isWon) {
      timer.pause();
      clearProgress(puzzleId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- timer.pause is stable; timer itself is a fresh object every render
  }, [isWon]);

  useEffect(() => {
    if (board.isGameOver) timer.pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- timer.pause is stable; timer itself is a fresh object every render
  }, [board.isGameOver]);

  // Sound cues: each effect diffs previous vs. current value via a ref so it fires only on the
  // actual transition, not on every render. playSfx itself is settings-unaware; gate here.
  const prevMistakeCountRef = useRef(board.mistakeCount);
  useEffect(() => {
    if (board.mistakeCount > prevMistakeCountRef.current) {
      if (settings.soundOn) playSfx("error");
      if (settings.scanlineOn)
        shakeControls.start({ x: [0, -6, 6, -4, 4, 0], transition: { duration: 0.3 } });
    }
    prevMistakeCountRef.current = board.mistakeCount;
  }, [board.mistakeCount, settings.soundOn, settings.scanlineOn, shakeControls]);

  const prevGridRef = useRef(board.grid);
  useEffect(() => {
    const prevGrid = prevGridRef.current;
    if (settings.soundOn && prevGrid.some((value, index) => value === 0 && board.grid[index] !== 0)) {
      playSfx("place");
    }
    prevGridRef.current = board.grid;
  }, [board.grid, settings.soundOn]);

  const prevNotesModeRef = useRef(board.notesMode);
  useEffect(() => {
    if (settings.soundOn && board.notesMode !== prevNotesModeRef.current) {
      playSfx("notesToggle");
    }
    prevNotesModeRef.current = board.notesMode;
  }, [board.notesMode, settings.soundOn]);

  const prevIsWonRef = useRef(isWon);
  useEffect(() => {
    if (isWon && !prevIsWonRef.current) {
      if (settings.soundOn) playSfx("win");
      if (settings.scanlineOn)
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.4 }, disableForReducedMotion: true });
    }
    prevIsWonRef.current = isWon;
  }, [isWon, settings.soundOn, settings.scanlineOn]);

  useEffect(() => {
    if (settings.humOn) startAmbientHum();
    else stopAmbientHum();
    return stopAmbientHum;
  }, [settings.humOn]);

  return (
    <PageFlicker>
      <motion.div
        animate={shakeControls}
        className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 px-4 py-4"
      >
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
            <span>
              <FormattedMessage id="puzzleValidateError" />
            </span>
            <Button
              variant="secondary"
              onClick={() =>
                validate.mutate({
                  board: board.boardString,
                  timeSeconds: timer.elapsedSeconds,
                  mistakeCount: board.mistakeCount,
                  maxCombo: board.maxCombo,
                })
              }
            >
              <FormattedMessage id="actionRetry" />
            </Button>
          </div>
        )}

        {settings.scanlineOn ? (
          <motion.div
            initial={{ opacity: 0, filter: "blur(6px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.35 }}
          >
            <SudokuGrid board={board} />
          </motion.div>
        ) : (
          <SudokuGrid board={board} />
        )}

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
                <FormattedMessage id="puzzleClearedBadge" />
              </Badge>
              <DialogTitle asChild>
                <GlitchText className="font-mono text-2xl font-bold uppercase glow-text-win">
                  <FormattedMessage id="puzzleClearedTitle" />
                </GlitchText>
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-4">
              <Stat label={<FormattedMessage id="statTime" />} value={formatTime(timer.elapsedSeconds)} />
              <Stat label={<FormattedMessage id="statMistakes" />} value={String(board.mistakeCount)} />
              <Stat label={<FormattedMessage id="statMaxCombo" />} value={`×${board.maxCombo}`} accent />
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => navigate("/")}>
                <FormattedMessage id="actionMenu" />
              </Button>
              <Button variant="primary" onClick={reroll} disabled={isRerolling}>
                <FormattedMessage id="actionNextPuzzle" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={board.isGameOver}>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <Badge variant="outline" className="self-start">
                <FormattedMessage id="puzzleFailedBadge" />
              </Badge>
              <DialogTitle asChild>
                <GlitchText className="font-mono text-2xl font-bold text-[oklch(66%_0.16_25)] uppercase glow-text-error">
                  <FormattedMessage id="puzzleFailedTitle" />
                </GlitchText>
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <Stat label={<FormattedMessage id="statTime" />} value={formatTime(timer.elapsedSeconds)} />
              <Stat
                label={<FormattedMessage id="statDifficulty" />}
                value={<FormattedMessage id={DIFFICULTY_LABEL[difficulty]} />}
              />
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => navigate("/")}>
                <FormattedMessage id="actionMenu" />
              </Button>
              <Button variant="primary" onClick={reroll} disabled={isRerolling}>
                <FormattedMessage id="actionRetry" />
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
              <DialogTitle className="uppercase">
                <FormattedMessage id="puzzlePausedTitle" />
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <SettingRow
                label={<FormattedMessage id="settingSound" />}
                value={settings.soundOn}
                onToggle={settings.toggleSound}
              />
              <SettingRow
                label={<FormattedMessage id="settingScanline" />}
                value={settings.scanlineOn}
                onToggle={settings.toggleScanline}
              />
              <SettingRow
                label={<FormattedMessage id="settingAutoClearNotes" />}
                value={settings.autoClearNotesOn}
                onToggle={settings.toggleAutoClearNotes}
              />
              <SettingRow
                label={<FormattedMessage id="settingHum" />}
                value={settings.humOn}
                onToggle={settings.toggleHum}
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
                <FormattedMessage id="actionResume" />
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (isWon || window.confirm(intl.formatMessage({ id: "quitConfirmSaved" }))) {
                    navigate("/");
                  }
                }}
              >
                <FormattedMessage id="actionQuitToMenu" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </PageFlicker>
  );
}

function Stat({ label, value, accent = false }: { label: ReactNode; value: ReactNode; accent?: boolean }) {
  return (
    <div>
      <div className="text-[11px] tracking-wide text-neutral-500 uppercase">{label}</div>
      <div className={`font-mono text-lg font-semibold ${accent ? "text-accent-300" : ""}`}>{value}</div>
    </div>
  );
}

function SettingRow({ label, value, onToggle }: { label: ReactNode; value: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between font-mono text-xs text-neutral-500 uppercase">
      <span>{label}</span>
      <ToggleGroup type="single" value={value ? "on" : "off"} onValueChange={(v) => v && onToggle()}>
        <ToggleGroupItem value="on">
          <FormattedMessage id="settingOn" />
        </ToggleGroupItem>
        <ToggleGroupItem value="off">
          <FormattedMessage id="settingOff" />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
