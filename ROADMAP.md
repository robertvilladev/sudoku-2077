# Roadmap: from current backend to a robust MVP

Current state: the puzzle generator/classifier/pool backend is built and verified (`packages/sudoku-core`, `packages/api-types`, `apps/api`) — see `README.md`. Nothing below is built yet.

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
- [ ] Prisma model `PuzzleCompletion` (userId, puzzleId, completedAt, timeSeconds) — introduce this now even though the leaderboard UI comes later, since it's what leaderboard/stats will eventually read from. Wire `/api/puzzles/:id/validate` to record a completion when an authenticated user solves a puzzle.
- [ ] Open dependency decision, not blocking MVP: password-reset needs an email-sending provider (Resend/Postmark/SES). Can be stubbed or deferred post-MVP.

---

## Phase 2 — Web MVP client

- [ ] New `apps/web` (Vite + React + TS), consuming `apps/api` directly, typed against `@sudoku-2077/api-types`. Kept as a separate app from the future React Native mobile client — not a unified Expo/React-Native-Web codebase.
- [ ] Core screens: difficulty picker / daily challenge, puzzle board (grid input + calls to `/validate`), signup/login, a basic profile page listing past completions.
- [ ] React Query for data-fetching against the REST API.
- [ ] Deploy target: Vercel fits this app well (static/SPA hosting). The API + Postgres will likely need a **separate** host (Railway/Render/Fly.io/a VPS) — Vercel's serverless model doesn't fit a long-running Fastify server, a persistent Postgres connection, and the background pool-replenish job. Plan on two deploy targets, not one, once hosting is decided.

---

## Phase 3 — Post-MVP

- [ ] Leaderboard endpoints (`/api/leaderboard/daily`, `/api/leaderboard/:difficulty`) reading from `PuzzleCompletion`. As data grows, move from live aggregate queries to indexed/cached snapshots rather than recomputing on every request.
- [ ] Streaks / stats profile expansion.
- [ ] React Native mobile app, once the API contract and auth flow are proven out by the web client.
