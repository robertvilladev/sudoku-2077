# Core Loop Completeness & Client Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the gaps a player hits within their first couple of games of the cyberpunk-reskinned board (PR #4): no losing state, a Sound FX toggle that does nothing, progress that vanishes on refresh, no way to keep playing after a win without going back to the menu, and no feedback when the validate call fails.

**Architecture:** Additive/localized changes to `apps/web` only — no backend changes, no new routes. Everything here is client-only and can proceed independently of `ROADMAP.md` Phase 1 (auth). Most tasks touch `apps/web/src/routes/PuzzleRoute.tsx` and/or `apps/web/src/features/puzzle/useBoardState.ts`.

**Tech Stack:** React 18, TanStack Query v5 (already used for `usePuzzles`/`useValidatePuzzle`), the existing `SettingsContext` pattern for localStorage persistence, native Web APIs (`window.confirm`, `localStorage`, Web Audio) over new dependencies.

**Spec:** `ROADMAP.md` (Phase 2.5 section)

## Global Constraints

- Don't reintroduce side effects into `useBoardState`'s reducer (`apps/web/src/features/puzzle/useBoardState.ts`) — it was deliberately made pure in the last PR to fix a class of double-counting bugs. Anything that reacts to state changes (sound, persistence writes) belongs in a `useEffect` in the consuming component, not in the reducer.
- Reuse existing patterns rather than introducing new ones: the "fetch on trigger, navigate on data" pattern already used by `DifficultyPicker.tsx` (`apps/web/src/features/puzzle/DifficultyPicker.tsx`) for the "next puzzle"/"retry" tasks; the `readStoredSettings`/`STORAGE_KEY` pattern already used by `SettingsContext.tsx` (`apps/web/src/lib/settings/SettingsContext.tsx`) for progress persistence.
- Prefer a native browser feature over a custom component where one exists and the interaction is low-frequency/non-critical (e.g. `window.confirm` for the quit confirmation) — don't build a themed dialog for everything.
- ESM throughout, relative imports use explicit `.js` extensions, matching the rest of `apps/web/src`.

---

## Suggested sequencing

1. Confirm-before-quit — trivial, ships alone.
2. Validate-failure error/retry state — trivial, ships alone.
3. Mistake-limit losing state — touches `useBoardState`, foundational for #5's "retry" action.
4. Progress persistence — the more invasive change (new hook parameters); do this once #3 has settled the shape of board state so you're not persisting a shape you'll immediately change.
5. "Next puzzle" / "retry" reroll — small, but shares a hook with #3's lose dialog.
6. Sound effects — cross-cutting (observes mistakes/wins/placements from several other tasks), do it last so the events it hooks into are stable.

---

## Task 1: Confirm before quitting mid-puzzle

**Files:**
- Modify: `apps/web/src/routes/PuzzleRoute.tsx` (Pause dialog's `QUIT TO MENU` button, currently `navigate("/")` unconditionally)

**Approach:** Native `window.confirm()` — this is a low-frequency, non-critical interaction; a themed Radix dialog would be overkill. Skip the prompt when the board is already solved (`board.isComplete`), since there's nothing left to lose.

- [ ] Wrap the `QUIT TO MENU` handler:
  ```tsx
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
  ```
- [ ] Manual verification: open Pause mid-puzzle, click QUIT TO MENU, confirm the browser prompt appears; Cancel keeps you on the board; OK navigates home. Repeat after solving the puzzle — no prompt.

---

## Task 2: Visible error/retry state when `/validate` fails

**Files:**
- Modify: `apps/web/src/routes/PuzzleRoute.tsx` (render near the top of the board, e.g. between `HudBar` and `SudokuGrid`)

**Approach:** `useValidatePuzzle` (`apps/web/src/features/puzzle/api.ts:33-38`) is a TanStack Query `useMutation` and already exposes `isError`/`error` for free — no new data-fetching code needed, just a UI branch plus a manual retry action.

- [ ] Add an inline banner rendered when `validate.isError`:
  ```tsx
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
  ```
- [ ] Confirm this doesn't fight the existing auto-validate effect (`PuzzleRoute.tsx:45-53`): that effect only re-fires when `board.boardString` changes, so a failed mutation won't retry-loop on its own — the RETRY button is the only recovery path for the same board state, which is the intended behavior (no surprise background retries).
- [ ] Manual verification: use Playwright route mocking (`page.route("**/validate", route => route.abort())`) or devtools offline mode, complete a puzzle, confirm the banner appears; go back online, click RETRY, confirm normal validation (and the win dialog if correct) proceeds.

---

## Task 3: Mistake-limit losing state

**Files:**
- Modify: `apps/web/src/features/puzzle/useBoardState.ts` — export a shared `MAX_MISTAKES = 3` constant; add `isGameOver: boolean` to `UseBoardStateResult`; guard further mutation once game over.
- Modify: `apps/web/src/components/cyberpunk/MistakePips.tsx` — import the shared constant instead of its private `MAX_MISTAKES = 3`.
- Modify: `apps/web/src/routes/PuzzleRoute.tsx` — add a lose `Dialog`, structurally mirroring the existing win dialog (`PuzzleRoute.tsx:98-119`).

**Approach:**
- [ ] In `useBoardState.ts`, export `export const MAX_MISTAKES = 3;` near the top, and derive `isGameOver` from `state.mistakeCount >= MAX_MISTAKES` alongside the other `useMemo`-derived values (`conflicts`, `boardString`, `isComplete`).
- [ ] Guard `setCell` and `toggleNote` (both already have an early-return `if (givenMask[index]) return;`) with an additional `if (state.mistakeCount >= MAX_MISTAKES) return;` so the board freezes for review once lost. (Leave `undo` unguarded — letting a player undo out of a loss is a reasonable judgment call; revisit if playtesting says otherwise.)
- [ ] Update `MistakePips.tsx` to `import { MAX_MISTAKES } from "../../features/puzzle/useBoardState.js";` instead of declaring its own copy.
- [ ] In `PuzzleRoute.tsx`, add `useEffect(() => { if (board.isGameOver) timer.pause(); }, [board.isGameOver])`, mirroring the existing `isWon` pause effect (`PuzzleRoute.tsx:57-60`).
- [ ] Add the lose dialog (`open={board.isGameOver}`), reusing the win dialog's structure and the existing error-color tokens (`--error`/`glow-text-error`, already used for conflicting cells) instead of the win green ones:
  - Tag: `PUZZLE_FAILED` (parallel to the win dialog's `PUZZLE_CLEARED`)
  - Title: `GRID CORRUPTED` (parallel to `GRID DECRYPTED`), wrapped in `GlitchText` the same way
  - Stats: TIME, DIFFICULTY (no MISTAKES stat needed — it's always `MAX_MISTAKES`)
  - Actions: `MENU` (navigate home) and `RETRY` (see Task 5 — reroll a new puzzle at the same difficulty)
- [ ] Extend `apps/web/src/features/puzzle/useBoardState.test.ts` with a test: three conflicting placements flip `isGameOver` to `true`; a fourth `setCell` call afterward doesn't change `result.current.grid`.
- [ ] Manual verification: deliberately place three conflicting digits, confirm the lose dialog appears, the timer stops, and further clicks/keypresses on the grid don't change anything.

---

## Task 4: Persist progress across refresh

**Files:**
- New: `apps/web/src/features/puzzle/progressStorage.ts` — serialize/deserialize helpers, one storage entry per puzzle.
- New: `apps/web/src/features/puzzle/progressStorage.test.ts`
- Modify: `apps/web/src/features/puzzle/useBoardState.ts` — accept a `puzzleId: string` second parameter; seed the reducer's initial state from storage when present; persist on every change.
- Modify: `apps/web/src/routes/PuzzleRoute.tsx` — pass `puzzleId` into `useBoardState(givens, puzzleId)`; own the timer's `elapsedSeconds` persistence in the same storage entry (don't add a second parallel key — see below); clear the entry on win.

**Approach:**
- [ ] `progressStorage.ts`: mirror the `SettingsContext.tsx` pattern (`STORAGE_KEY` + a `readStored*`/`try { JSON.parse } catch { fallback }` helper). Key format: `` `sudoku2077.progress.${puzzleId}` ``. Shape on the wire:
  ```ts
  interface StoredProgress {
    grid: number[];
    notes: Record<number, number[]>; // Set isn't JSON-serializable — array on the wire, Set in memory
    mistakeCount: number;
    combo: number;
    maxCombo: number;
    elapsedSeconds: number;
  }
  ```
  Export `readProgress(puzzleId): StoredProgress | null`, `writeProgress(puzzleId, progress): void`, `clearProgress(puzzleId): void`. Convert `notes` Set↔array at this boundary only — keep `Set` as the in-memory representation everywhere else, unchanged.
- [ ] `useBoardState.ts`: change the signature to `useBoardState(givens: string, puzzleId: string)`. Use `readProgress(puzzleId)` inside the `useReducer` lazy-init function to seed `{grid, notes, mistakeCount, combo, maxCombo}` when present and its `grid.length` matches the puzzle's length (defends against a stale/corrupt entry — fall back to `initReducerState(initialGrid)` otherwise). Add a `useEffect` that calls `writeProgress` on every `state` change. `history` (the undo stack) is *not* persisted — resuming with a fresh undo stack is an acceptable simplification, note it as such if it comes up in review.
- [ ] Decide where `elapsedSeconds` persistence lives: recommend **not** touching `useGameTimer.ts`'s internals — instead have `PuzzleRoute` read `readProgress(puzzleId)?.elapsedSeconds` once to seed... this requires `useGameTimer` to accept an optional initial value. Add an `initialSeconds = 0` parameter to `useGameTimer(initialSeconds?: number)` (`apps/web/src/features/puzzle/useGameTimer.ts:10`), and have `PuzzleRoute` write the current `elapsedSeconds` into the same `writeProgress` call as the board state (one storage entry per puzzle, not two).
- [ ] `PuzzleRoute.tsx`: call `clearProgress(puzzleId)` in the `isWon` effect (alongside `timer.pause()`) so a solved puzzle doesn't linger in storage. Explicitly **don't** clear on quit — quitting mid-puzzle (including via the daily-challenge link, which a player may revisit) should still resume where they left off; only a win clears it.
- [ ] `progressStorage.test.ts`: round-trip test (write then read returns an equivalent object, including the notes Set↔array conversion) and a "corrupt/missing entry falls back to null" test.
- [ ] Manual verification: fill a few cells, toggle a note, wait a few seconds, refresh the page — board, notes, mistake count, and timer all resume. Solve the puzzle, refresh, navigate back to the same puzzle id — starts empty (no stale "solved" state to resume into).

---

## Task 5: "Next puzzle" / "retry" reroll

**Files:**
- New: `apps/web/src/features/puzzle/useRerollPuzzle.ts`
- Modify: `apps/web/src/features/puzzle/api.ts` — `usePuzzles`'s query key needs an "attempt" component (see gotcha below).
- Modify: `apps/web/src/routes/PuzzleRoute.tsx` — add a `NEXT PUZZLE` button to the win dialog's `DialogFooter` (alongside `MENU`) and a `RETRY` button to Task 3's lose dialog, both using the new hook.

**Gotcha to handle:** `usePuzzles(difficulty)` (`apps/web/src/features/puzzle/api.ts:17-23`) has query key `["puzzles", difficulty]`. With TanStack Query's default caching, calling it again for the *same* difficulty returns the *same cached puzzle* instead of hitting the pool for a new one — fine for `DifficultyPicker` (one pick per visit) but wrong for a repeated reroll action.

- [ ] In `api.ts`, add an `attempt` parameter to force a fresh fetch per reroll without touching `DifficultyPicker`'s existing call site: `usePuzzles(difficulty: DifficultyTier | null, attempt = 0)` with `queryKey: ["puzzles", difficulty, attempt]`. `DifficultyPicker.tsx` keeps calling `usePuzzles(selected)` unchanged (defaults to `attempt = 0`).
- [ ] `useRerollPuzzle.ts`: same "trigger + navigate on data" shape as `DifficultyPicker.tsx` (`apps/web/src/features/puzzle/DifficultyPicker.tsx:8-18`) — a `useState` attempt counter incremented on `reroll()`, feeding `usePuzzles(difficulty, attempt)`, with a `useEffect` navigating to `/puzzles/${data.id}` when data arrives:
  ```ts
  export function useRerollPuzzle(difficulty: DifficultyTier) {
    const [attempt, setAttempt] = useState(0);
    const navigate = useNavigate();
    const { data, isLoading } = usePuzzles(attempt > 0 ? difficulty : null, attempt);

    useEffect(() => {
      if (data) navigate(`/puzzles/${data.id}`);
    }, [data, navigate]);

    return { reroll: () => setAttempt((n) => n + 1), isLoading };
  }
  ```
- [ ] Wire `reroll` into both dialogs' footers in `PuzzleRoute.tsx`, disabling the button while `isLoading`.
- [ ] Manual verification: win a puzzle, click NEXT PUZZLE, confirm the URL changes to a *different* puzzle id at the same difficulty. Repeat for RETRY from the lose dialog (Task 3).

---

## Task 6: Sound effects wired to the SOUND FX setting

**Files:**
- New: `apps/web/src/lib/audio/sfx.ts`
- Modify: `apps/web/src/routes/PuzzleRoute.tsx` and/or `apps/web/src/components/cyberpunk/SudokuGrid.tsx` — trigger cues from `useEffect`s watching state transitions.

**Approach:** Synthesize short retro "blip" tones via the Web Audio API (`OscillatorNode` + a `GainNode` envelope) rather than shipping audio asset files — no licensing/sourcing needed, and it fits the terminal aesthetic better than realistic SFX would.

- [ ] `sfx.ts`: lazily create a single module-level `AudioContext` on first use (browsers block `AudioContext` creation/autoplay before a user gesture — every call site here is already the result of a click or keypress, so first-use lazy init is sufficient). Export `playSfx(kind: "place" | "error" | "notesToggle" | "win")`, each a short oscillator burst at a distinct frequency/duration (e.g. a quick mid-tone blip for `place`, a lower buzz for `error`, a soft click for `notesToggle`, a short ascending three-note arpeggio for `win`). Keep this module unaware of settings — it just plays when called.
- [ ] In the consuming component(s), gate every call with `if (settings.soundOn) playSfx(...)`, triggered from `useEffect`s that diff the previous vs. current value (via a `useRef`) to fire only on the actual transition:
  - `board.mistakeCount` increasing → `"error"`
  - a cell's value changing from `0` to non-zero (not on erase) → `"place"`
  - `board.notesMode` toggling → `"notesToggle"`
  - `isWon` becoming `true` → `"win"`
- [ ] **Do not** call `playSfx` from inside `useBoardState`'s reducer (`apps/web/src/features/puzzle/useBoardState.ts`) — it was deliberately made pure in the last PR; audio is a side effect and belongs in the UI layer reacting to the resulting state, not in the state transition itself.
- [ ] Manual verification only (no reliable way to assert audio output in Vitest/jsdom): toggle SOUND FX off in Pause, confirm digit entry/mistakes/notes-toggle/win are silent; toggle on, confirm all four cues play at the right moments.

---

## Verification (whole plan)

- `npm run typecheck`, `npm run lint`, `npm run test` (from `apps/web`, or `--workspaces` from the repo root) green after each task.
- Manual click-through of the full loop after Task 4 lands: start a puzzle, make progress, refresh mid-puzzle (resumes), lose deliberately (Task 3's dialog + timer stop), retry into a new puzzle (Task 5), win it (Task 6's win cue + Task 4 clearing storage), and use NEXT PUZZLE to keep going.
- No existing test regressions — in particular, `useBoardState.test.ts`'s local `renderBoardState(givens)` helper (which wraps `renderHook` with the `SettingsProvider`) needs a `puzzleId` argument threaded through once Task 4 changes `useBoardState`'s signature.
