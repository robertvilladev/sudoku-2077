# sudoku-2077

Backend "sudoku machine": generates puzzles, classifies them by real difficulty (technique-based, not just given-count), stores a pool per tier in Postgres, and exposes them over a REST API.

## Layout

- `packages/sudoku-core` — generator, brute-force solver (uniqueness checking), logical/technique solver, difficulty classifier. Pure TS, no HTTP/DB dependencies.
- `packages/api-types` — shared Zod schemas/DTOs for the API's request/response shapes. Any future client (web, React Native) imports this instead of redeclaring types.
- `apps/api` — Fastify server, Prisma schema, routes, and the pool-replenish job.
- `apps/web` — Vite + React + TS web client (Phase 2 MVP), consuming `apps/api` via `@sudoku-2077/api-types`.
- `apps/mobile` — reserved for later (Phase 3), not scaffolded yet.

## Setup

```bash
npm install
docker compose up -d                     # starts local Postgres on :5432
cp apps/api/.env.example apps/api/.env
npm run --workspace apps/api prisma:migrate -- --name init
npm run --workspace apps/api replenish   # generates the initial puzzle pool + daily challenges
npm run dev:api                          # starts the API on :3000
cp apps/web/.env.example apps/web/.env
npm run dev:web                          # starts the web client on :5173
```

## Scripts

- `npm run build` / `npm run typecheck` / `npm run test` — run across all workspaces
- `npm run lint` / `npm run format` — ESLint / Prettier across the repo
- `npm run dev:api` / `npm run dev:web` — start the API / web client in watch mode
- `npm run replenish` — top up the puzzle pool per difficulty tier and pre-assign upcoming daily challenges

## Web client (`apps/web`)

Feature-folder layout (`src/features/{puzzle,auth,profile}`), TanStack Query for server state, and a
thin `src/lib/apiClient.ts` that parses every response against the shared `@sudoku-2077/api-types` Zod
schemas. Tests are Vitest + React Testing Library, colocated as `*.test.ts(x)`, with network calls
mocked via MSW (`src/test/msw/handlers.ts`) — plus one Playwright smoke spec under `e2e/`.

Login/signup/profile call provisional endpoints (`/api/auth/*`, `/api/profile/completions`) that don't
exist in `apps/api` yet — they're mocked in tests and will 404 against the real API until Phase 1 (auth)
ships. See `apps/web/src/features/auth/types.ts` and `.../profile/types.ts` for the provisional contract.

## API

- `GET /api/daily-challenge` — today's puzzle (UTC), givens only
- `GET /api/puzzles?difficulty=easy|medium|hard|hardcore` — one puzzle from that tier's pool, givens only
- `GET /api/puzzles/:id` — a specific puzzle by id, givens only
- `POST /api/puzzles/:id/validate` — `{ board: <81-char string> }` → `{ correct, completed }`, checked server-side so the solution never has to reach the client
- `GET /docs` — browsable OpenAPI contract, generated from `@sudoku-2077/api-types`'s zod schemas

## Deployment notes

- **Migrations:** use `prisma migrate dev` locally (creates + applies a new migration interactively). CI/CD environments must use `prisma migrate deploy` instead — it only applies existing migration files and never generates new ones, which is what `.github/workflows/ci.yml` does against its ephemeral Postgres, and what Render's build command (below) does against production.
- **Connection pooling:** `apps/api` uses a single long-lived `PrismaClient` (see `src/db/client.ts`), which is correct for a single long-running process like the Render web service below. Neon's pooled connection string covers you if this ever moves to a serverless or multi-instance host. Migrations are the exception: `prisma migrate deploy`/`dev` need a direct, unpooled connection (transaction pooling can break migration-session behavior), so `schema.prisma` sets `directUrl` from a separate `DIRECT_URL` env var — keep `DATABASE_URL` pooled and `DIRECT_URL` unpooled, both required (locally/CI they're just the same non-pooled URL, see `.env.example`).

### Architecture

Three separate free-tier services, chosen because `apps/api` is a long-running Fastify process (not a serverless function) plus a separate background job — Vercel alone can't host it:

| Piece | Host | Notes |
| --- | --- | --- |
| `apps/web` | **Vercel** | Static/SPA build, free Hobby plan |
| `apps/api` | **Render** (free web service, see `render.yaml`) | No card required; free tier spins down after ~15 min idle (cold start on next request) |
| Postgres | **Neon** (free tier) | No card required, doesn't expire; use the pooled connection string |
| `npm run replenish` job | **GitHub Actions** scheduled workflow (`.github/workflows/replenish.yml`) | Reuses existing CI infra instead of a paid cron add-on; runs daily against the Neon `DATABASE_URL` |

### One-time manual setup

Do these in order — each later step needs a URL produced by the one before it.

1. **Neon** — create a free project at neon.tech. Copy **both** connection strings from the dashboard: the **pooled** one (hostname has `-pooler`) is your production `DATABASE_URL`, the **direct** one (no `-pooler`) is your `DIRECT_URL`.
2. **Render** — create a new Blueprint, point it at this repo (it picks up `render.yaml`). In the service's Environment tab, set the three secrets `render.yaml` leaves blank:
   - `DATABASE_URL` → the Neon pooled connection string from step 1
   - `DIRECT_URL` → the Neon direct connection string from step 1 (needed for `prisma migrate deploy` in the build command — the pooled URL can't run migrations)
   - `CORS_ORIGINS` → leave empty for now, come back after step 3
   Deploy, then note the service URL Render assigns (e.g. `https://sudoku-2077-api.onrender.com`).
3. **Vercel** — import this repo as a new project, leaving **Root Directory** at the repo root. This is an npm workspaces monorepo — `apps/web` depends on `packages/api-types`/`packages/sudoku-core`, which only exist as built output after a root-level build, so don't scope Root Directory to `apps/web`. The committed `vercel.json` already sets the build/output commands for this; Vercel picks it up automatically. Add an environment variable `VITE_API_BASE_URL` set to the Render URL from step 2. Deploy, then note the Vercel domain (e.g. `https://sudoku-2077.vercel.app`).
4. **Back to Render** — set `CORS_ORIGINS` to the Vercel domain from step 3 (comma-separate if you add more origins later, e.g. a custom domain). Saving triggers a redeploy.
5. **GitHub Actions** — in this repo's Settings → Secrets and variables → Actions, add a secret named `PROD_DATABASE_URL` with the same Neon **pooled** connection string used for `DATABASE_URL` in step 2. The `replenish.yml` workflow uses it on its daily schedule.
6. **Seed the database** — the Render build only migrates the schema, it doesn't populate it. Immediately after step 5, go to this repo's Actions tab → "Replenish puzzle pool" → "Run workflow" to seed the initial puzzle pool and daily challenges by hand, rather than waiting for the next 06:00 UTC scheduled run.

Not covered yet: Vercel preview-deployment URLs (per-PR, random subdomains) won't match a static `CORS_ORIGINS` list — only the production Vercel domain is wired up above. Revisit if preview deploys need to call the live API.
