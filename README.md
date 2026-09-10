# sudoku-2077

Backend "sudoku machine": generates puzzles, classifies them by real difficulty (technique-based, not just given-count), stores a pool per tier in Postgres, and exposes them over a REST API.

## Layout

- `packages/sudoku-core` — generator, brute-force solver (uniqueness checking), logical/technique solver, difficulty classifier. Pure TS, no HTTP/DB dependencies.
- `packages/api-types` — shared Zod schemas/DTOs for the API's request/response shapes. Any future client (web, React Native) imports this instead of redeclaring types.
- `apps/api` — Fastify server, Prisma schema, routes, and the pool-replenish job. The only app built so far.
- `apps/mobile`, `apps/web` — reserved for later, not scaffolded yet.

## Setup

```bash
npm install
docker compose up -d                     # starts local Postgres on :5432
cp apps/api/.env.example apps/api/.env
npm run --workspace apps/api prisma:migrate -- --name init
npm run --workspace apps/api replenish   # generates the initial puzzle pool + daily challenges
npm run dev:api                          # starts the API on :3000
```

## Scripts

- `npm run build` / `npm run typecheck` / `npm run test` — run across all workspaces
- `npm run dev:api` — start the API in watch mode
- `npm run replenish` — top up the puzzle pool per difficulty tier and pre-assign upcoming daily challenges

## API

- `GET /api/daily-challenge` — today's puzzle (UTC), givens only
- `GET /api/puzzles?difficulty=easy|medium|hard|hardcore` — one puzzle from that tier's pool, givens only
- `GET /api/puzzles/:id` — a specific puzzle by id, givens only
- `POST /api/puzzles/:id/validate` — `{ board: <81-char string> }` → `{ correct, completed }`, checked server-side so the solution never has to reach the client
- `GET /docs` — browsable OpenAPI contract, generated from `@sudoku-2077/api-types`'s zod schemas

## Deployment notes

- **Migrations:** use `prisma migrate dev` locally (creates + applies a new migration interactively). CI/CD environments must use `prisma migrate deploy` instead — it only applies existing migration files and never generates new ones, which is what `.github/workflows/ci.yml` does against its ephemeral Postgres.
- **Connection pooling:** `apps/api` uses a single long-lived `PrismaClient` (see `src/db/client.ts`), which is correct for a single long-running process. If the API ever moves to a serverless or multi-instance host, add PgBouncer (or the host's equivalent) in front of Postgres first — otherwise each instance/invocation opens its own pool and Postgres runs out of connections under load.
