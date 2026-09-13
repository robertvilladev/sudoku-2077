# Roadmap: from current backend to a robust MVP

Current state: the puzzle generator/classifier/pool backend is built and verified (`packages/sudoku-core`, `packages/api-types`, `apps/api`), and Phase 0 (backend hardening) and Phase 2 (web MVP client, including the cyberpunk re-theme) have shipped — see `README.md`. Phase 1 (auth) is next on the backend track; Phase 2.5 (client hardening) can proceed in parallel.

Guiding principle: **Phase 0 comes first.** Auth, the web client, and a leaderboard should land on a backend that's already hardened, not get bolted onto one that isn't. Skipping Phase 0 means re-doing security/observability work later under a live user base instead of an empty one.

---

## Phase 0 — Harden the current backend

Nothing here is user-facing; it's what makes everything after this phase safe to build on.

- [ ] **Testing & CI** — GitHub Actions workflow running `npm run typecheck` and `npm run test` on every push/PR. Add integration tests for `apps/api` routes (today only `packages/sudoku-core` has tests) against an ephemeral Postgres in CI, mirroring the local `docker-compose.yml` setup.
- [ ] **Error handling & validation** — a centralized Fastify error handler so unexpected exceptions return a consistent `{ error }` shape and status code instead of a default 500. Validate route params (e.g. `:id` in `/api/puzzles/:id`) with zod the same way query/body params already are.
- [ ] **Security hardening**
  - `@fastify/cors`, scoped to known origins — currently unconfigured, so the future web app's browser calls will be blocked by default.
  - `@fastify/rate-limit` on public endpoints.
  - `@fastify/helmet` for standard security headers.
- [ ] **Observability** — extend `/health` into a real readiness check (DB connectivity, not just process liveness). Keep the existing structured pino logging; add request-id correlation. Plan for error tracking (e.g. Sentry) once the API is public-facing.
- [ ] **Database & config**
  - Note Prisma connection-pooling needs if the API ends up on a serverless/multi-instance host (e.g. PgBouncer) — relevant once a hosting decision is made.
  - Document the `prisma migrate dev` (local) vs `prisma migrate deploy` (CI/CD) split.
  - Validate required env vars at boot via a small zod-parsed env schema, so misconfiguration fails fast at startup instead of at first request.
- [ ] **API documentation** — generate OpenAPI from the existing `@sudoku-2077/api-types` zod schemas (e.g. `@fastify/swagger` + `zod-to-openapi`) so the contract is browsable as more clients get added.

---

## Phase 1 — Auth system (self-hosted email+password + JWT)

- [ ] Prisma model `User` (id, email unique, passwordHash, createdAt).
- [ ] Prisma model `RefreshToken` (userId, tokenHash, expiresAt, revoked) — DB-backed so refresh tokens are revocable, not just stateless JWTs.
- [ ] `packages/api-types` — add `SignupRequest`, `LoginRequest`, `AuthResponse` DTOs alongside the existing puzzle DTOs.
- [ ] `apps/api` — `/api/auth/signup`, `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`. bcrypt for password hashing. Short-lived JWT access token + rotating refresh token. A Fastify `preHandler` auth decorator to protect routes that need a logged-in user.
- [ ] Prisma model `PuzzleCompletion` (userId, puzzleId, completedAt, timeSeconds, mistakeCount, maxCombo) — introduce this now even though the leaderboard UI comes later, since it's what leaderboard/stats/scoring will eventually read from. Wire `/api/puzzles/:id/validate` to record a completion when an authenticated user solves a puzzle. Include `mistakeCount`/`maxCombo` from the start (the web client already computes these client-side, see Phase 2.5) so a real score formula (time + mistakes + combo, replacing the mockup's fabricated SCORE stat) has data to work from in Phase 4 without a later migration.
- [ ] Open dependency decision, not blocking MVP: password-reset needs an email-sending provider (Resend/Postmark/SES). Can be stubbed or deferred post-MVP.

---

## Phase 2 — Web MVP client

**Status: shipped.** `apps/web` (Vite + React + TS) exists, consuming `apps/api` directly and typed against `@sudoku-2077/api-types`, with the cyberpunk/Nocturne re-theme from PR #4 (Tailwind v4 + shadcn/ui + Motion + Phosphor icons + JetBrains Mono).

- [x] `apps/web` scaffolded (Vite + React + TS + React Query), kept separate from the future React Native mobile client.
- [x] Core screens: title/menu, difficulty picker, daily challenge, puzzle board (grid input + calls to `/validate`), basic profile page listing past completions.
- [x] Login/signup **UI** exists (`LoginForm`/`SignupForm`), but calls provisional endpoints (`/api/auth/*`) that don't exist until Phase 1 ships — non-functional until then, mocked in tests via MSW.
- [ ] Deploy target: Vercel fits this app well (static/SPA hosting). The API + Postgres will likely need a **separate** host (Railway/Render/Fly.io/a VPS) — Vercel's serverless model doesn't fit a long-running Fastify server, a persistent Postgres connection, and the background pool-replenish job. Plan on two deploy targets, not one, once hosting is decided.

---

## Phase 2.5 — Core loop completeness & client hardening

**Client-only — no backend changes required, so this can run in parallel with Phase 1 rather than waiting on it.** The reskin in PR #4 made the basic loop playable end-to-end, but left a few gaps a player would hit in their first couple of games (no losing state, a Sound FX toggle that does nothing, progress that vanishes on refresh) plus some polish/robustness work. Full task-by-task plan: `docs/superpowers/plans/2026-09-13-core-loop-completeness.md`.

- [ ] Mistake-limit losing state (a "GRID CORRUPTED" dialog mirroring the win dialog, at 3/3 mistakes)
- [ ] "Next puzzle" reroll action on the win dialog (same difficulty)
- [ ] Progress persistence to `localStorage` so a refresh/back-button doesn't lose an in-progress board
- [ ] Sound effects wired to the existing (currently inert) SOUND FX setting
- [ ] Visible retry/error state when `/validate` fails (offline, 500, etc.)
- [ ] Confirm-before-quit when abandoning an in-progress puzzle

Deferred backlog from the same review (not in the detailed plan above, revisit after the client feels solid):
- [ ] Hint system (reveal one digit at a cost) and a "fill all candidate notes" helper
- [ ] Redo (undo already exists)
- [ ] First-run controls tutorial (fits the boot-sequence terminal aesthetic)
- [ ] Accessibility pass beyond what's already there: `aria-live` announcements for mistakes/completion, full focus-state audit, dark-palette contrast check
- [ ] Mobile ergonomics beyond responsive layout (touch target sizing, long-press interactions)
- [ ] Error boundaries around routes
- [ ] Expand e2e coverage past the single smoke test (pause/settings, notes mode, win flow via a mocked `/validate`)
- [ ] Route-based code splitting (the build already warns about a >500kB chunk)
- [ ] More visual/animation polish: escalating combo glow, an animated "decrypting" puzzle-load transition, screen-shake on a mistake, an ambient background hum toggle alongside the CRT scanline one

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
