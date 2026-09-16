# Game-Feel Effects — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close out `ROADMAP.md` Phase 2.5's "more visual/animation polish" backlog item — escalating combo glow, a decrypting puzzle-load transition, screen-shake on a mistake, a win-burst effect, and an ambient hum toggle — so the board reads as more of a videogame without touching accessibility or rewriting the (already-decoupled) game logic.

**Architecture:** Additive/localized changes to `apps/web` only. No backend changes, no changes to `packages/sudoku-core`/`packages/api-types`, no deploy config changes. The board stays plain DOM/React (accessible `<button role="gridcell">` grid) — every task here is a non-interactive visual/audio layer on top of existing state, not a board rewrite. Full rationale for staying DOM+`motion` instead of adopting a canvas/WebGL renderer (PixiJS) or a game engine (Phaser) is in `ROADMAP.md` Phase 2.5's entry for this work; not re-litigated per-task here.

**Tech Stack:** `motion` (already a dependency, already used in `SudokuCell.tsx`/`GlitchText.tsx`), the existing Web Audio synthesis pattern in `apps/web/src/lib/audio/sfx.ts`, the existing `SettingsContext`/`scanlineOn`-gates-decorative-effects pattern, and one new dependency — `canvas-confetti` — for the one effect DOM/CSS genuinely can't do well (Task 4).

**Spec:** `ROADMAP.md` (Phase 2.5 "Deferred backlog" → game-feel effects entry)

## Global constraints

- **Every new decorative effect is gated by `settings.scanlineOn`**, matching the existing convention documented in `SettingsContext.tsx:35-37` ("`scanlineOn` also gates every other decorative/ambient effect ... not just the literal scanline texture"). Don't add a second "reduce motion"-style toggle — one already exists and every other component already respects it (`GlitchText.tsx`, `SudokuCell.tsx`'s selection glow). The ambient hum (Task 5) is the one exception with its own dedicated toggle, since it's audio a player may want independent of visual effects.
- **Sound stays in the Web Audio synthesis style already established in `sfx.ts`** — no audio asset files, ever (per its own header comment). Task 5's hum extends that module with the same lazy-`AudioContext` pattern rather than introducing an `<audio>` element or a library like Howler.
- **Don't touch `useBoardState`'s reducer** (`apps/web/src/features/puzzle/useBoardState.ts`) — it's deliberately pure (see its own comments and `sfx.ts`'s existing wiring in `PuzzleRoute.tsx`). Every effect here reacts to state via a `useEffect`/`useRef`-diff in `PuzzleBoard`, following the exact pattern already used for the four existing sound cues (`PuzzleRoute.tsx:94-125`).
- Keep bundle size in mind — `ROADMAP.md` already notes the build warns above 500kB. `canvas-confetti` (~3KB gzipped) is small enough to import directly; if the build warning gets worse, switch to a dynamic `import("canvas-confetti")` inside the win-effect handler instead of a static top-level import.

---

## Suggested sequencing

1. Escalating combo glow — smallest, self-contained in `ComboBadge.tsx`, no new state.
2. Screen-shake on mistake — same ref-diff pattern as the existing `error` sound cue, ships alongside it.
3. Decrypting puzzle-load transition — self-contained in `PuzzleBoard`'s mount, independent of the others.
4. Win-burst particles — new dependency, do it once the simpler motion-only tasks are settled.
5. Ambient hum toggle — touches `SettingsContext` (new setting) and extends `sfx.ts`; do last since it's the most cross-cutting.

---

## Task 1: Escalating combo glow

**Files:**
- Modify: `apps/web/src/components/cyberpunk/ComboBadge.tsx`

**Approach:** `ComboBadge` (`ComboBadge.tsx:3-12`) already renders nothing below combo 2 and a static accent-colored badge above it. Add tiers so the badge visibly escalates — brighter color / subtle pulse — as combo grows, reusing the `glow-text-win`-style token pattern already used elsewhere (`apps/web/src/index.css` / `apps/web/src/styles/glow.css`) rather than inventing new CSS.

- [ ] Read `apps/web/src/styles/glow.css` for existing glow utility classes/tokens to reuse (don't hand-roll new `text-shadow`/`box-shadow` values if an equivalent already exists).
- [ ] Add combo tiers, e.g. `combo < 5` (current static style) → `combo < 10` (stronger glow class) → `combo >= 10` (strongest glow class + a `motion.span` pulse, gated by `scanlineOn` the same way `SudokuCell.tsx:60-71` branches on it).
- [ ] Manual verification: place several correct digits in a row without a mistake; confirm the combo badge visibly escalates at each tier and resets to hidden after a mistake (existing `combo = 0` reset in `useBoardState.ts:84`, unchanged).

---

## Task 2: Screen-shake on mistake

**Files:**
- Modify: `apps/web/src/routes/PuzzleRoute.tsx` — wrap the root layout `div` (currently plain, `PuzzleRoute.tsx:129`) in a `motion.div`; add a shake trigger alongside the existing `error` sound-cue effect.

**Approach:** Reuse the exact ref-diff pattern already wired for the `error` sound cue (`PuzzleRoute.tsx:94-100`) — don't add a second mechanism for detecting "mistake just happened." Trigger a `motion` `animate` keyframe sequence (small `x` jitter, same shape as `GlitchText.tsx:24-27` but larger amplitude, e.g. `[0, -6, 6, -4, 4, 0]` over ~0.3s) via a `useAnimationControls()` (from `motion/react`) each time the mistake count increases, gated by `settings.scanlineOn`.

- [ ] Change the root container from a plain `<div>` to `<motion.div ref={...} animate={shakeControls}>` (import `useAnimationControls` from `motion/react`, matching the existing `import { motion } from "motion/react"` style in `SudokuCell.tsx`/`GlitchText.tsx`).
- [ ] In the existing mistake-cue `useEffect` (`PuzzleRoute.tsx:94-100`), alongside `playSfx("error")`, call `shakeControls.start({ x: [0, -6, 6, -4, 4, 0], transition: { duration: 0.3 } })` when `settings.scanlineOn` (separately from the `soundOn` gate already there — shake and sound are independent settings).
- [ ] Manual verification: with CRT SCANLINE EFFECT on, place a conflicting digit and confirm the whole board area shakes briefly; toggle the setting off in Pause and confirm the shake stops (sound cue still plays independently, per its own `soundOn` gate).

---

## Task 3: Decrypting puzzle-load transition

**Files:**
- Modify: `apps/web/src/routes/PuzzleRoute.tsx` — wrap `SudokuGrid` in a mount transition inside `PuzzleBoard`.

**Approach:** `PuzzleBoard` remounts on every puzzle change already (`PuzzleRoute.tsx:28`'s `key={puzzle.id}` forces a fresh mount), so a plain `motion.div` with an `initial`/`animate` mount transition around `SudokuGrid` is sufficient — no `AnimatePresence` needed since there's no exit transition, only entry. "Decrypting" reads well as a quick blur/opacity resolve rather than a literal per-cell reveal (keep it simple — a staggered 81-cell reveal is not worth the complexity for a one-time load moment).

- [ ] Wrap `<SudokuGrid board={board} />` (`PuzzleRoute.tsx:153`) in a `motion.div` with `initial={{ opacity: 0, filter: "blur(6px)" }}`, `animate={{ opacity: 1, filter: "blur(0px)" }}`, `transition={{ duration: 0.35 }}`, gated by `settings.scanlineOn` (render the plain unwrapped grid when off, same branch shape as `SudokuCell.tsx:60-71`).
- [ ] Manual verification: navigate from difficulty picker into a puzzle, confirm the grid resolves in with a brief blur/fade; use NEXT PUZZLE/RETRY (Task 5 of the prior plan) and confirm it replays on each new puzzle (since `key={puzzle.id}` forces remount on `PuzzleRoute.tsx:28`).

---

## Task 4: Win-burst particles

**Files:**
- Modify: `apps/web/package.json` — add `canvas-confetti` + `@types/canvas-confetti` (devDependency for types).
- Modify: `apps/web/src/routes/PuzzleRoute.tsx` — fire a burst in the existing win-cue effect.

**Approach:** `canvas-confetti` is a ~3KB, dependency-free, imperative `confetti()` call — it manages its own transient `<canvas>` overlay, so it doesn't touch the board's DOM/accessibility tree at all. Reuse the existing win-transition ref-diff effect (`PuzzleRoute.tsx:119-125`) rather than adding a new one.

- [ ] `npm install canvas-confetti --workspace apps/web && npm install -D @types/canvas-confetti --workspace apps/web`.
- [ ] In the existing `isWon` effect (`PuzzleRoute.tsx:119-125`), alongside `playSfx("win")`, call `confetti({ particleCount: 80, spread: 70, origin: { y: 0.4 } })` when `settings.scanlineOn` (static top-level `import confetti from "canvas-confetti"` is fine at ~3KB — only switch to a dynamic `import()` if `npm run build --workspace apps/web`'s chunk-size warning measurably worsens).
- [ ] Manual verification: solve a puzzle, confirm a confetti burst plays once alongside the existing win dialog/sound; toggle CRT SCANLINE EFFECT off beforehand and confirm no burst (dialog/sound unaffected).
- [ ] `npm run build --workspace apps/web`: confirm the chunk-size warning didn't measurably worsen; if it did, switch the import to `const { default: confetti } = await import("canvas-confetti")` inside the effect.

---

## Task 5: Ambient hum toggle

**Files:**
- Modify: `apps/web/src/lib/settings/SettingsContext.tsx` — add `humOn: boolean` (default `false` — opt-in, since a continuous drone is more intrusive than one-shot SFX), `toggleHum`.
- Modify: `apps/web/src/lib/audio/sfx.ts` — add `startAmbientHum()`/`stopAmbientHum()`.
- Modify: `apps/web/src/routes/PuzzleRoute.tsx` — start/stop the hum based on `settings.humOn`, mirroring the SOUND FX row.

**Approach:** Extend `sfx.ts`'s existing lazy-`AudioContext` module (`sfx.ts:6-15`) rather than creating a second audio module. A continuous low-frequency drone is a sustained `OscillatorNode` (not the fire-and-forget `playTone` used for blips), so it needs its own start/stop pair that the caller holds a reference to stop later.

- [ ] In `sfx.ts`, add a module-level `let hum: { oscillator: OscillatorNode; gain: GainNode } | null = null;`. `startAmbientHum()`: no-op if already running; otherwise create a low-frequency (~55Hz) sine oscillator through a low gain (e.g. `0.04`) into `ctx.destination`, `oscillator.start()`, store the refs. `stopAmbientHum()`: if running, ramp gain to 0 over ~0.2s then `oscillator.stop()`, clear the ref; no-op if not running.
- [ ] In `SettingsContext.tsx`: add `humOn: false` to `DEFAULTS` (`SettingsContext.tsx:17-21`), thread it through the `Settings`/`SettingsState` interfaces and `toggleHum` the same way `toggleScanline` is done (`SettingsContext.tsx:54`).
- [ ] In `PuzzleRoute.tsx`'s `PuzzleBoard`, add a `useEffect(() => { if (settings.humOn) startAmbientHum(); else stopAmbientHum(); return stopAmbientHum; }, [settings.humOn])` so the hum starts/stops with the setting and always stops on unmount (leaving the puzzle) — don't leave an oscillator running after navigating away.
- [ ] Add a `SettingRow` for `"AMBIENT HUM"` in the Pause dialog (`PuzzleRoute.tsx:240-251`), alongside the existing three.
- [ ] Manual verification: enable AMBIENT HUM in Pause, confirm a continuous low tone plays while resumed and stops when paused/toggled off/navigating to menu; confirm it defaults to off for a fresh player (no `localStorage` entry).

---

## Verification (whole plan)

- `npm run typecheck`, `npm run lint`, `npm run test` (from `apps/web`, or `--workspaces` from the repo root) green after each task.
- `npm run build --workspace apps/web` after Task 4 specifically, to confirm the bundle-size warning noted in `ROADMAP.md` doesn't measurably worsen.
- Full manual click-through with CRT SCANLINE EFFECT on: load a puzzle (decrypt transition), build a combo (escalating glow), trigger a mistake (shake + existing error sound), win (confetti + existing win sound/dialog). Repeat with the setting off — only the ambient hum (its own toggle) and existing win/error sounds should remain active; all newly-added visual effects should be absent.
