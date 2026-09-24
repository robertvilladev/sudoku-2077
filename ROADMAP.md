# Roadmap: from current backend to a robust MVP

Current state: the puzzle generator/classifier/pool backend is built and verified (`packages/sudoku-core`, `packages/api-types`, `apps/api`; hardened in Phase 2.7), and Phase 0 (backend hardening), Phase 1 (auth), and Phase 2 (web MVP client, including the cyberpunk re-theme) have shipped — see `README.md`. Phase 3 (wiring the frontend to the now-live auth endpoints) has landed; remaining work is Phase 3's follow-ups plus the Flutter mobile client (Phase 5).

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

- [x] `apps/web` scaffolded (Vite + React + TS + React Query), kept separate from the future Flutter mobile client.
- [x] Core screens: title/menu, difficulty picker, daily challenge, puzzle board (grid input + calls to `/validate`), basic profile page listing past completions.
- [x] Login/signup **UI** exists (`LoginForm`/`SignupForm`), but calls provisional endpoints (`/api/auth/*`) that don't exist until Phase 1 ships — non-functional until then, mocked in tests via MSW.
- [x] Deploy target: decided and live — Vercel for `apps/web`, Render (free web service) for `apps/api`, Neon (free tier) for Postgres, and a GitHub Actions scheduled workflow for the pool-replenish job (Vercel's serverless model doesn't fit a long-running Fastify server). Config lives in `render.yaml` and `.github/workflows/replenish.yml`; manual account setup steps are in `README.md`'s Deployment notes.
- [x] **Follow-up (resolved by Phase 2.7):** watch the HARD-difficulty pool over the next few daily replenish runs. The first production seed (2026-09-16) only reached 14/20 HARD puzzles before hitting `MAX_GENERATION_ATTEMPTS` in `replenishPool.ts` — harder puzzles are rarer to land on via the random-givens generation strategy. Not blocking (14 is a usable pool, and the daily cron keeps retrying), but if it plateaus below 20 instead of climbing, revisit `MAX_GENERATION_ATTEMPTS` or the givens-range spread (`randomTargetGivens()`) in that file.

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

The board itself stays plain DOM/React (`SudokuGrid`/`SudokuCell`'s accessible `<button role="gridcell">` grid) — a canvas/WebGL renderer or game engine (PixiJS/Phaser) would mean reimplementing keyboard navigation and accessibility that DOM+React already give for free, for a board that's fundamentally a grid UI, not a game world. Deferred, not planned: **if** the app ever needs real sprite/scene visuals (e.g. non-sudoku minigames), revisit PixiJS as a dedicated effects/board-overlay renderer then — not needed for this phase.

- [x] Escalating combo glow (`ComboBadge.tsx`)
- [x] Animated "decrypting" puzzle-load transition
- [x] Screen-shake on a mistake
- [x] Win-burst particles (`canvas-confetti`, ~3KB, no deps)
- [x] Ambient background hum toggle, synthesized via Web Audio (not an audio asset file) alongside the CRT scanline one
- [x] Visually distinguish given (fixed) digits from player-entered digits
- [x] Strengthen the same-value highlight (already grid-wide) with a background tint, not just a text-color shift

---

## Phase 2.7 — Puzzle engine robustness & scale

**Status: engine work shipped; per-move mistake checking pending a product decision.** Triggered by a report that on hard puzzles a player could place a digit that was wrong without being flagged. Investigation (2,300 generated puzzles cross-checked against an independent solver) found **no correctness bug in the generator or solvers**: every puzzle had a valid solution, givens matching it, and exactly one solution. The report is explained by the client's mistake rule (below). The investigation did surface real engine problems, fixed here:

| Metric (random sample)                    | Before                                                              | After                                |
| ----------------------------------------- | ------------------------------------------------------------------- | ------------------------------------ |
| Tier mix of generated puzzles             | 84% EASY · 5% MEDIUM · **0.2% HARD** · 11% HARDCORE                 | Aimed per tier — see `npm run audit` |
| Attempts to fill all four 20-puzzle pools | HARD never filled (prod seed stopped at 14/20 after 4,000 attempts) | ~75 attempts, under 3 s              |
| Avg generation time                       | 66 ms (max ~900 ms)                                                 | 2–13 ms per profile                  |
| Uniqueness check, hardest known puzzle    | ~600 ms                                                             | a few ms (bitmask solver)            |
| Techniques known to the grader            | 5                                                                   | 13                                   |
| Reproducible puzzles                      | no (`Math.random`)                                                  | every stored puzzle has a `seed`     |

- [x] **Independent verification + CI audit.** `packages/sudoku-core/src/testing/referenceChecker.ts` is a deliberately naive solver that shares no code with `solver/`. `npm run audit --workspace packages/sudoku-core` checks every generated puzzle against it (valid solution, givens match, exactly one solution, logical answer matches, seed regenerates). CI runs it with 25 puzzles per profile and fails on any mismatch.
- [x] **Solution oracle.** `solveLogically(grid, { solution })` checks every step. A technique that places a wrong digit or removes the true candidate throws and names itself. Generation always passes the solution, so a buggy technique can't mis-rate a stored puzzle, and tests pin down the exact technique that broke.
- [x] **Seeded generation.** `createRng(seed)` (mulberry32). `Puzzle.seed` (new nullable column) stores strings like `HARD:k3j9x2a` or `HARD:k3j9x2a~v1` for variants, and `regeneratePuzzle(seed)` rebuilds the exact puzzle. A bug report can now say "seed X".
- [x] **Bitmask brute-force solver.** Row/col/box digit masks and MRV branching, the generator's hot path.
- [x] **Human-style grader.** Techniques, easiest first: hidden/naked single → pointing pair, box/line reduction, naked/hidden pair (MEDIUM) → X-Wing, naked/hidden triple, Swordfish, XY-Wing, XYZ-Wing, naked quad (HARD). Unsolved by all of these → HARDCORE (needs chains/guessing). Weights are about 10× the Sudoku Explainer ratings. `difficultyScore` = Σ weight × uses. HARDCORE scores start at 1000. Existing rows keep their old-scale scores.
- [x] **Tier-aimed generation with clue steering.** `createPuzzleForTier(tier)`: EASY digs to 36–45 givens. Harder tiers dig until the puzzle is minimal, then, if it overshoots the target tier, add givens back from the solution one at a time until it lands in the target tier. Adding a given can't break uniqueness.
- [x] **Variants.** `createPuzzleVariant` relabels digits, permutes rows/cols within bands and bands, and optionally transposes (~1.2 trillion variants per puzzle). The logic stays the same and the variant is re-rated. The replenish job multiplies each HARD/HARDCORE find into `VARIANTS_PER_RARE_FIND` (default 2) variants.
- [x] **Replenish job** aims at the most-starved tier, buckets each puzzle by its honest rating, and stores seeds. The EASY pool only takes puzzles generated with the EASY profile, so it isn't filled with ~24-given singles-only leftovers.
- [ ] **Per-move mistake checking (needs a decision).** Today a mistake is a _peer conflict_ (`apps/web/src/features/puzzle/useBoardState.ts`). A wrong digit that doesn't repeat a visible digit in its row/col/box is accepted silently and even extends the combo, and it's only caught at `/validate` when the board is full. At the start of a hard puzzle there are ~150 such "wrong but allowed" placements. Big sudoku apps check each move against the solution. Options:
  1. Include `solution` in `PublicPuzzle`. Simplest, instant, works offline. The solution becomes visible in devtools, which only matters for leaderboard integrity. `/validate` stays the authority for recorded completions.
  2. A server-side `POST /api/puzzles/:id/check` per placement. Keeps the solution off the client, but adds a round trip per move (painful on a cold Render instance) and is still a per-cell oracle.
  3. Keep the peer-conflict rule, but stop awarding combo for unverified placements.

  Whichever is chosen, the mobile port (Phase 5 "Board state") must mirror it.

- [ ] **Harder techniques** — simple coloring, X-Chains/XY-Chains, then AIC/forcing chains. These split today's HARDCORE (everything beyond wings) into "EXPERT, still logical" and "requires guessing". Add each with oracle coverage in the seeded technique corpus test.
- [ ] **Calibrate with player data.** Use `PuzzleCompletion.timeSeconds`/`mistakeCount` to adjust each puzzle's rating (Elo/Glicko-style, like chess puzzle ratings). Flag puzzles whose solve times don't match their tier.
- [ ] **Scale-out generation** — if pools grow to thousands per tier, run generation in `worker_threads` and dedupe by canonical form (the minimum over the transform group), so variants of an already-stored puzzle aren't counted as new.

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

---

## Phase 5 — Flutter mobile client

`apps/mobile`, a Flutter app (Android + iOS) consuming the same `apps/api` as the web client. Deliberately **no auth** — anonymous play only, which works because `/api/puzzles/:id/validate` uses `optionalAuthenticate` and accepts unauthenticated requests. Not an npm workspace (no `package.json`), so it is invisible to the root `npm run build`/`test`/`lint` fan-out and to `ci.yml` by design; it builds with the Flutter SDK instead.

`packages/sudoku-core` is **not** ported to Dart. The solution never leaves the server (`apps/api/src/mappers.ts` strips it) and validation is server-side, so the client needs only `stringToGrid`, `peersOf` and conflict detection — roughly 20 lines inline. Revisit a port only if offline play is wanted; a client-side hint system would not justify one either, since a `/hint` endpoint can read the already-stored `solution` column without invoking the solver.

- [x] **Scaffold** — `apps/mobile` created (`com.robertvilladev.sudoku2077`, Android + iOS, Flutter 3.47.5 pinned in `pubspec.yaml`), feature-first layout, `--dart-define=API_BASE_URL` config, placeholder app with a smoke test, and `.github/workflows/mobile.yml` (path-filtered `dart format` + `flutter analyze` + `flutter test`). State pattern: `ChangeNotifier` + `provider` (added with the first notifier). Design: `docs/superpowers/specs/2026-09-19-flutter-mobile-setup-design.md`. iOS is unverified (no Mac / macOS CI job).
- [ ] **API client** — hand-written DTOs for `PublicPuzzle` / `ValidatePuzzleResponse` against `package:http`. No codegen for three shapes. Use a request timeout that tolerates a Render free-tier cold start.
- [ ] **Board state** — a `ChangeNotifier` port of `apps/web`'s `useBoardState` reducer (grid, notes, undo history, mistake/combo counters). Mirror web's mistake rule exactly: a mistake is a **peer conflict**, not a solution mismatch (under review — see Phase 2.7 "Per-move mistake checking").
- [ ] **Basic loop screens** — title → difficulty picker → board (grid, number pad with remaining counts, notes mode, undo, erase, timer, 3-mistake lose dialog, win dialog via `/validate`).
- [ ] **Progress persistence** — `shared_preferences`, mirroring web's `sudoku2077.progress.<puzzleId>` shape. Local only, never synced, so a puzzle started on web will not resume on mobile.
- [ ] **Theme parity** — cyberpunk palette hand-converted from web's oklch values to sRGB hex (Flutter has no oklch), JetBrains Mono bundled as a font asset. Flat colours only; glow and scanline effects are the Phase 2.6 equivalent and are not part of the basic loop.
- [ ] **Follow-up, not blocking:** daily challenge screen (`GET /api/daily-challenge`) — one endpoint and one button, but not part of the basic loop.

### Phase 5 — pending items, corner cases, and things to consider

Surfaced while landing the scaffold (design: `docs/superpowers/specs/2026-09-19-flutter-mobile-setup-design.md`). None block the next bullets, but each one bites later if forgotten.

**Pending (deferred on purpose)**

- [ ] **Add `provider`** to `pubspec.yaml` together with the first `ChangeNotifier` (Board state) and provide `ApiClient` at the root. Not added at scaffold time because nothing used it yet.
- [ ] **Navigation package** (`go_router` vs plain `Navigator`) — decide in "Basic loop screens"; three screens may not justify a dependency.
- [ ] **`flutter build apk` in `mobile.yml`** — add once a native plugin (`shared_preferences`) lands, so plugin/Gradle breakage is caught in CI and not on a dev machine.
- [ ] **iOS is unverified.** It can't be built on Windows or the ubuntu runner. Needs a Mac or a `macos-latest` CI job (billed at a higher minute multiplier on private repos) before iOS is claimed to work. Also confirm the iOS simulator can reach `http://localhost:3000` (ATS should exempt `localhost`/IPs, but it hasn't been tried).
- [ ] **Release signing.** `android/app/build.gradle.kts` still signs `release` with the **debug** key (Flutter's template default). Needs a real keystore (kept out of git, injected via CI secrets) before any Play Store upload. Store publishing itself is out of scope for Phase 5.
- [ ] **App identity polish** — launcher icon and splash are Flutter defaults; the Android label is `sudoku2077` and the iOS display name `Sudoku2077` (should read "Sudoku 2077"). The application ID `com.robertvilladev.sudoku2077` is effectively permanent once published.

**Corner cases to keep in mind**

- **Release builds point at the wrong host by default.** `lib/core/config.dart` defaults `API_BASE_URL` to `http://10.0.2.2:3000` (Android emulator → host). A release build made without `--dart-define=API_BASE_URL=https://...` ships that address. Consider failing the build/startup in release mode when the define is missing, and make the release/CI build command always pass it.
- **Cleartext HTTP is debug-only** (`android/app/src/debug/AndroidManifest.xml`). The production API must stay HTTPS; a release build talking to an `http://` URL will fail silently on Android 9+.
- **Render cold start.** The free tier sleeps after ~15 min idle, so the first request can take tens of seconds. The API client needs a generous timeout, a visible "waking the server" loading state, and retry-on-timeout for idempotent GETs (never auto-retry `/validate` blindly).
- **`CORS_ORIGINS` needs no change** — native HTTP sends no `Origin` header. Don't add mobile origins there.
- **Contract drift.** Dart DTOs are hand-written against `@sudoku-2077/api-types`, and `mobile.yml` is path-filtered, so an `api-types`/API change does **not** run mobile CI. If the API surface grows past the current three shapes, add shared JSON fixtures (API tests emit them, Dart tests parse them) or run the mobile tests when `packages/api-types/**` changes.
- **Path-filtered CI + branch protection.** Safe today because the repo has no required status checks. If one is ever required, a skipped path-filtered workflow never reports and blocks the PR — add an always-running gate job first.
- **Flutter version bumps** touch two places: `environment: flutter:` in `apps/mobile/pubspec.yaml` (CI reads it) and the local SDK (`C:\src\flutter`-style install, `flutter upgrade`/checkout of the tag). Bump them together in one PR.
- **Prettier does not format `apps/mobile/`** (`.prettierignore`) and ESLint ignores it; Dart formatting is enforced by `dart format` in CI only. The husky pre-commit hook does not run `dart format`, so unformatted Dart is caught in CI, not at commit time.
- **Local-only progress.** `shared_preferences` state is per device and never synced, and `PuzzleCompletion` is only recorded for authenticated solves — so anonymous mobile wins leave no server-side record until Phase 6.
- **Mistake rule parity.** A mistake is a _peer conflict_, not a solution mismatch (as on web). If web's rule ever changes, mobile's port of `useBoardState` must change in the same breath — there is no shared code to keep them aligned.

---

## Phase 6 — Mobile auth

Deferred out of Phase 5 on purpose. The API's refresh token is an httpOnly cookie scoped `path: /api/auth`, `secure: true`, `sameSite: lax` — correct for a browser, awkward for a native client. Everything except `/api/auth/refresh` and `/api/auth/logout` is pure bearer and needs no change.

- [ ] **Decide the mobile refresh transport** — either a cookie jar in the Dart client, or an opt-in body/header refresh path on `/api/auth/refresh` (today it is cookie-only, no body, no bearer).
- [ ] **Token storage** — `flutter_secure_storage` for the refresh token; the 15-minute access JWT stays in memory, as on web.
- [ ] **Refresh-on-401** — doesn't exist on web either (see the Phase 1 follow-up); if built, build it once and mirror the approach on both clients.
- [ ] **Add `GET /api/auth/me`** — identity currently comes only from signup/login/refresh response bodies, so there is no way to rehydrate a session from a stored token alone.
- [ ] **Declare `securitySchemes` in the OpenAPI output** — `apps/api/src/openapi.ts` emits none, so `/docs` doesn't describe bearer auth to any client.
- [ ] **Profile screen** — `GET /api/profile/completions`, unblocked once auth works.
