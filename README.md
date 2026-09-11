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
