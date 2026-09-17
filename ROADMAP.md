# Roadmap: from current backend to a robust MVP

Current state: the puzzle generator/classifier/pool backend is built and verified (`packages/sudoku-core`, `packages/api-types`, `apps/api`), and Phase 0 (backend hardening), Phase 1 (auth), and Phase 2 (web MVP client, including the cyberpunk re-theme) have shipped — see `README.md`. Phase 3 (wiring the frontend to the now-live auth endpoints) is next.

Guiding principle: **Phase 0 comes first.** Auth, the web client, and a leaderboard should land on a backend that's already hardened, not get bolted onto one that isn't. Skipping Phase 0 means re-doing security/observability work later under a live user base instead of an empty one.

---

## Phase 0 — Harden the current backend

**Status: shipped.** Nothing here is user-facing; it's what makes everything after this phase safe to build on.

- [x] **Testing & CI** — GitHub Actions workflow running `npm run typecheck` and `npm run test` on every push/PR. Add integration tests for `apps/api` routes (today only `packages/sudoku-core` has tests) against an ephemeral Postgres in CI, mirroring the local `docker-compose.yml` setup.
- [x] **Error handling & validation** — a centralized Fastify error handler so unexpected exceptions return a consistent `{ error }` shape and status code instead of a default 500. Validate route params (e.g. `:id` in `/api/puzzles/:id`) with zod the same way query/body params already are.
- [x] **Security hardening**
  - `@fastify/cors`, scoped to known origins — currently unconfigured, so the future web app's browser calls will be blocked by default.
  - `@fastify/rate-limit` on public endpoints.
  - `@fastify/helmet` for standard security headers.
- [x] **Observability** — extend `/health` into a real readiness check (DB connectivity, not just process liveness). Keep the existing structured pino logging; add request-id correlation. Plan for error tracking (e.g. Sentry) once the API is public-facing.
- [x] **Database & config**
  - Note Prisma connection-pooling needs if the API ends up on a serverless/multi-instance host (e.g. PgBouncer) — relevant once a hosting decision is made.
  - Document the `prisma migrate dev` (local) vs `prisma migrate deploy` (CI/CD) split.
  - Validate required env vars at boot via a small zod-parsed env schema, so misconfiguration fails fast at startup instead of at first request.
- [x] **API documentation** — generate OpenAPI from the existing `@sudoku-2077/api-types` zod schemas (e.g. `@fastify/swagger` + `zod-to-openapi`) so the contract is browsable as more clients get added.

---

## Phase 1 — Auth system (self-hosted email+password + JWT)

**Status: shipped.** Design: `docs/superpowers/specs/2026-09-17-phase1-auth-design.md`.

- [x] Prisma model `User` (id, email unique, passwordHash, createdAt).
- [x] Prisma model `RefreshToken` (userId, tokenHash, expiresAt, revoked) — DB-backed so refresh tokens are revocable, not just stateless JWTs.
- [x] `packages/api-types` — `SignupRequest`, `LoginRequest`, `AuthResponse` DTOs alongside the existing puzzle DTOs.
- [x] `apps/api` — `/api/auth/signup`, `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`. bcrypt for password hashing. Short-lived JWT access token + rotating refresh token (httpOnly cookie). A Fastify `preHandler` auth decorator (`app.authenticate`/`app.optionalAuthenticate`) to protect routes that need a logged-in user.
- [x] Prisma model `PuzzleCompletion` (userId, puzzleId, completedAt, timeSeconds, mistakeCount, maxCombo). `/api/puzzles/:id/validate` records a completion for authenticated, correct solves.
- [x] `GET /api/profile/completions` (not originally listed here, added since the frontend already expected it) — the profile page is now backed by real data instead of MSW mocks.
- [ ] **Follow-up, not blocking:** password-reset needs an email-sending provider (Resend/Postmark/SES). Still stubbed/deferred post-MVP, per the original plan.
- [ ] **Follow-up, not blocking:** `apps/web`'s `AuthContext` keeps the access token in memory only (no silent-refresh-on-page-load yet) — a full page refresh currently logs the user out even though their refresh cookie is still valid server-side. Revisit as part of Phase 3's frontend wiring.
- [ ] **Follow-up, not blocking:** rate-limit `/api/auth/login` and `/api/auth/signup` specifically (the global `RATE_LIMIT_MAX` applies, but a tighter per-route limit would slow down credential-stuffing/enumeration attempts).

---

## Phase 2 — Web MVP client

**Status: shipped.** `apps/web` (Vite + React + TS) exists, consuming `apps/api` directly and typed against `@sudoku-2077/api-types`, with the cyberpunk/Nocturne re-theme from PR #4 (Tailwind v4 + shadcn/ui + Motion + Phosphor icons + JetBrains Mono).

- [x] `apps/web` scaffolded (Vite + React + TS + React Query), kept separate from the future React Native mobile client.
- [x] Core screens: title/menu, difficulty picker, daily challenge, puzzle board (grid input + calls to `/validate`), basic profile page listing past completions.
- [x] Login/signup **UI** exists (`LoginForm`/`SignupForm`), but calls provisional endpoints (`/api/auth/*`) that don't exist until Phase 1 ships — non-functional until then, mocked in tests via MSW.
- [x] Deploy target: decided and live — Vercel for `apps/web`, Render (free web service) for `apps/api`, Neon (free tier) for Postgres, and a GitHub Actions scheduled workflow for the pool-replenish job (Vercel's serverless model doesn't fit a long-running Fastify server). Config lives in `render.yaml` and `.github/workflows/replenish.yml`; manual account setup steps are in `README.md`'s Deployment notes.
- [ ] **Follow-up:** watch the HARD-difficulty pool over the next few daily replenish runs. The first production seed (2026-09-16) only reached 14/20 HARD puzzles before hitting `MAX_GENERATION_ATTEMPTS` in `replenishPool.ts` — harder puzzles are rarer to land on via the random-givens generation strategy. Not blocking (14 is a usable pool, and the daily cron keeps retrying), but if it plateaus below 20 instead of climbing, revisit `MAX_GENERATION_ATTEMPTS` or the givens-range spread (`randomTargetGivens()`) in that file.

---

## Phase 2.5 — Core loop completeness & client hardening

**Status: shipped.** **Client-only — no backend changes required, so this can run in parallel with Phase 1 rather than waiting on it.** The reskin in PR #4 made the basic loop playable end-to-end, but left a few gaps a player would hit in their first couple of games (no losing state, a Sound FX toggle that does nothing, progress that vanishes on refresh) plus some polish/robustness work. Full task-by-task plan: `docs/superpowers/plans/2026-09-13-core-loop-completeness.md`.

- [x] Mistake-limit losing state (a "GRID CORRUPTED" dialog mirroring the win dialog, at 3/3 mistakes)
- [x] "Next puzzle" reroll action on the win dialog (same difficulty)
- [x] Progress persistence to `localStorage` so a refresh/back-button doesn't lose an in-progress board
- [x] Sound effects wired to the existing (currently inert) SOUND FX setting
- [x] Visible retry/error state when `/validate` fails (offline, 500, etc.)
- [x] Confirm-before-quit when abandoning an in-progress puzzle

Deferred backlog from the same review (not in the detailed plan above, revisit after the client feels solid):
- [ ] Hint system (reveal one digit at a cost) and a "fill all candidate notes" helper
- [ ] Redo (undo already exists)
- [ ] First-run controls tutorial (fits the boot-sequence terminal aesthetic)
- [ ] Accessibility pass beyond what's already there: `aria-live` announcements for mistakes/completion, full focus-state audit, dark-palette contrast check
- [ ] Mobile ergonomics beyond responsive layout (touch target sizing, long-press interactions)
- [ ] Error boundaries around routes
- [ ] Expand e2e coverage past the single smoke test (pause/settings, notes mode, win flow via a mocked `/validate`)
- [ ] Route-based code splitting (the build already warns about a >500kB chunk)

---

## Phase 2.6 — Game-feel effects

**Status: shipped.** The reskin already laid the groundwork for this — `motion` is already a dependency used for micro-interactions (`SudokuCell.tsx`'s selection glow, `GlitchText.tsx`), and SFX is already synthesized live via the Web Audio API (`apps/web/src/lib/audio/sfx.ts`) rather than shipped as asset files. This phase finishes that direction rather than starting a new one. Full task-by-task plan: `docs/superpowers/plans/2026-09-16-game-feel-effects.md`.

The board itself stays plain DOM/React (`SudokuGrid`/`SudokuCell`'s accessible `<button role="gridcell">` grid) — a canvas/WebGL renderer or game engine (PixiJS/Phaser) would mean reimplementing keyboard navigation and accessibility that DOM+React already give for free, for a board that's fundamentally a grid UI, not a game world. Deferred, not planned: **if** the app ever needs real sprite/scene visuals (e.g. a shared renderer with `apps/mobile`, or non-sudoku minigames), revisit PixiJS as a dedicated effects/board-overlay renderer then — not needed for this phase.

- [x] Escalating combo glow (`ComboBadge.tsx`)
- [x] Animated "decrypting" puzzle-load transition
- [x] Screen-shake on a mistake
- [x] Win-burst particles (`canvas-confetti`, ~3KB, no deps)
- [x] Ambient background hum toggle, synthesized via Web Audio (not an audio asset file) alongside the CRT scanline one
- [x] Visually distinguish given (fixed) digits from player-entered digits
- [x] Strengthen the same-value highlight (already grid-wide) with a background tint, not just a text-color shift

---

## Phase 3 — Auth-dependent client work

- [ ] Wire the existing `LoginForm`/`SignupForm` UI to the real `/api/auth/*` endpoints once Phase 1 ships.
- [ ] Settings (`SettingsContext`) currently persist to `localStorage` only, per-device — sync them server-side once accounts exist.
- [ ] Real score display (time + mistakes + combo) on the win dialog and profile, once `PuzzleCompletion` (Phase 1) is recording the data.

---

## Phase 4 — Post-MVP

- [ ] Leaderboard endpoints (`/api/leaderboard/daily`, `/api/leaderboard/:difficulty`) reading from `PuzzleCompletion`. As data grows, move from live aggregate queries to indexed/cached snapshots rather than recomputing on every request.
- [ ] Streaks / stats profile expansion, including a daily-challenge streak counter and history/calendar view.
- [ ] Achievements/badges (first win at each difficulty, streak milestones, etc.) — reuses `PuzzleCompletion` data.
- [ ] Shareable results ("Wordle-style" spoiler-free summary of time/difficulty/mistakes) — the mockup's win-dialog SHARE action is currently unused.
- [ ] React Native mobile app, once the API contract and auth flow are proven out by the web client.
