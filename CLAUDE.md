# CLAUDE.md

Guidance for coding agents working in this repo.

## What this is
Sudoku backend "machine": generates puzzles, classifies them by real solving difficulty (technique-based, not given-count), keeps a per-tier pool in Postgres, and serves them over a REST API — plus a Vite/React web client that consumes it.

## Layout (npm workspaces monorepo)
- `packages/sudoku-core` — generator, brute-force solver (uniqueness check), logical/technique solver, difficulty classifier. Pure TS, no HTTP/DB deps. Has vitest unit tests.
- `packages/api-types` — shared Zod schemas/DTOs for API request/response shapes. Add new API contracts here first, then import them in the API route and in the web client — don't redeclare shapes inline in either.
- `apps/api` — Fastify 5 server + Prisma. Source of truth for what the backend actually does.
- `apps/web` — Vite + React + TS client (Phase 2 MVP). Feature-folder layout (`src/features/{puzzle,auth,profile}`), TanStack Query for server state, `src/lib/apiClient.ts` parses every response against the shared Zod schemas.
- `apps/mobile` — reserved for later, not scaffolded yet.

**Important:** `apps/web`'s auth (`/api/auth/*`) and profile (`/api/profile/completions`) calls hit endpoints that **don't exist in `apps/api` yet** — they're mocked in web tests (MSW) and will 404 against the real API until Phase 1 (auth) ships. Don't assume those routes exist server-side just because the web client calls them; check `apps/api/src/routes/` first.

## Local setup
```bash
npm install
docker compose up -d                     # Postgres 16 on :5432
cp apps/api/.env.example apps/api/.env
npm run --workspace apps/api prisma:migrate -- --name init
npm run --workspace apps/api replenish   # seeds puzzle pool + daily challenges
npm run dev:api                          # API on :3000, tsx watch
cp apps/web/.env.example apps/web/.env
npm run dev:web                          # web client on :5173, Vite
```

## Common commands
- `npm run build` / `npm run typecheck` / `npm run test` — fan out to all workspaces (`--if-present`)
- `npm run lint` / `npm run format` — ESLint / Prettier across the whole repo (flat config in `eslint.config.mjs`)
- `npm run dev:api` / `npm run dev:web` — API / web client in watch mode
- `npm run replenish` — top up puzzle pool per tier, pre-assign upcoming daily challenges
- `npm run --workspace apps/api prisma:migrate -- --name <name>` — new migration (interactive, local only; CI uses `prisma migrate deploy` instead — never hand-edit that distinction)

## Conventions an agent must follow
- **ESM + NodeNext**: every relative import needs an explicit `.js` extension, even in `.ts` source (e.g. `import { prisma } from "../db/client.js"`). This applies to `apps/api` and the packages; `apps/web` is bundled by Vite and does not need it.
- **Zod-first API contracts**: add/change a schema in `packages/api-types/src/index.ts`, then `.safeParse` it in the Fastify route (`apps/api/src/routes/*.ts`) and reuse it for parsing responses client-side (`apps/web/src/lib/apiClient.ts`). Don't hand-roll validation or duplicate a shape.
- **`app.ts` vs `server.ts`** in `apps/api/src`: `app.ts` exports `buildApp()` (builds and configures the Fastify instance — plugins, routes, error handler); `server.ts` just calls it and `listen()`s. Tests should import `buildApp()` from `app.ts`, never `server.ts`, so they exercise the app without binding a port.
- **Centralized error handling**: `apps/api/src/errors.ts`'s `registerErrorHandler` is the only place that shapes error responses (`{ error: message }`, 5xx logged + generic message). Don't `reply.send()` raw errors from a route.
- **Env vars are validated at boot**: `apps/api/src/config/env.ts` parses `process.env` through a Zod schema and throws on startup if invalid. Add new env vars there, not via ad-hoc `process.env.X` reads.
- **`toPublicPuzzle()`** in `apps/api/src/mappers.ts` strips `solution` before a puzzle ever reaches the client — always map through it rather than returning a Prisma `Puzzle` record directly. Validation (`POST /api/puzzles/:id/validate`) happens server-side against the stored solution so the answer key never crosses the wire.

## Testing
- `packages/sudoku-core`: vitest unit tests colocated as `*.test.ts` next to the source.
- `apps/api`: vitest. Unit tests colocated as `*.test.ts` (e.g. `errors.test.ts`, `health.test.ts`, `config/env.test.ts`); route tests are `*.integration.test.ts` and hit a real Postgres — need `docker compose up -d` plus a migrated DB running locally to pass.
- `apps/web`: vitest + React Testing Library, colocated as `*.test.ts(x)`, network calls mocked via MSW (`src/test/msw/handlers.ts`). One Playwright smoke spec under `apps/web/e2e/` (`npm run test:e2e --workspace apps/web`), not part of the default `npm run test`.
- `packages/api-types`: no tests (schema declarations only).
- Root `npm run test` runs unit/vitest suites across workspaces via `--workspaces --if-present` — it does not run the Playwright e2e spec.

## API surface (`apps/api`)
- `GET /health` — DB-aware liveness check (`{status:"ok"}` / 503 with `{status:"error"}`)
- `GET /docs` — Swagger UI, OpenAPI doc generated from the `api-types` Zod schemas
- `GET /api/daily-challenge` — today's puzzle (UTC), givens only
- `GET /api/puzzles?difficulty=easy|medium|hard|hardcore` — one puzzle from that tier's pool, givens only
- `GET /api/puzzles/:id` — a specific puzzle by id, givens only
- `POST /api/puzzles/:id/validate` — `{ board: <81-char string> }` → `{ correct, completed }`

## Deployment notes
- Single long-lived `PrismaClient` (`apps/api/src/db/client.ts`) — fine for one long-running process; add PgBouncer (or the host's equivalent) before going serverless/multi-instance, or Postgres will run out of connections under load.
- CI (`.github/workflows/ci.yml`): runs against an ephemeral Postgres service container: `prisma migrate deploy` → `typecheck` → `test`.
