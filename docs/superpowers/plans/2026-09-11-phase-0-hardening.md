# Phase 0 — Harden the Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `apps/api` safe to build Phase 1 (auth) on: CI, centralized error handling + param validation, security headers/CORS/rate-limiting, DB-aware health checks, boot-time env validation, and a browsable OpenAPI contract.

**Architecture:** Additive changes to `apps/api` only — no new apps/packages. Config/validation/error-handling/security concerns each get one small new file under `apps/api/src/`, wired into `server.ts`. Integration tests use Fastify's built-in `app.inject()` (no server socket, no supertest) against a real Postgres, both locally (existing `docker-compose.yml`) and in CI (Postgres service container + `prisma migrate deploy`).

**Tech Stack:** Fastify 5, Zod 3, Prisma 5, vitest (already used in `packages/sudoku-core`), `@fastify/cors`, `@fastify/rate-limit`, `@fastify/helmet`, `@fastify/swagger` + `@fastify/swagger-ui` + `@asteasolutions/zod-to-openapi`.

**Spec:** `ROADMAP.md` (Phase 0 section)

## Global Constraints

- ESM throughout (`"type": "module"`), NodeNext resolution — relative imports in `apps/api/src` use explicit `.js` extensions, matching existing files.
- `strict: true` TypeScript (`tsconfig.base.json`) — no `any`, no unchecked casts of `request.params`/`request.query`.
- Error responses use the existing `ErrorResponseSchema` shape from `@sudoku-2077/api-types`: `{ error: string }`.
- Don't touch `packages/sudoku-core` or `packages/api-types` route DTOs — only `apps/api` and repo-root CI config change in this plan.
- No new workspaces, no new top-level deps outside `apps/api`.

---

## Task 1: Boot-time env validation

**Files:**
- Create: `apps/api/src/config/env.ts`
- Test: `apps/api/src/config/env.test.ts`
- Modify: `apps/api/src/server.ts` (import `env` instead of reading `process.env` directly)
- Modify: `apps/api/.env.example` (document new vars)

**Interfaces:**
- Produces: `env: { PORT: number; DATABASE_URL: string; MIN_POOL_SIZE: number; DAILY_CHALLENGE_LOOKAHEAD_DAYS: number; CORS_ORIGINS: string[]; RATE_LIMIT_MAX: number }` — parsed once at import time, throws on invalid config.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/config/env.test.ts
import { describe, expect, it } from "vitest";
import { parseEnv } from "./env.js";

describe("parseEnv", () => {
  it("applies defaults when optional vars are absent", () => {
    const env = parseEnv({ DATABASE_URL: "postgresql://u:p@localhost:5432/db" });
    expect(env.PORT).toBe(3000);
    expect(env.MIN_POOL_SIZE).toBe(20);
    expect(env.CORS_ORIGINS).toEqual([]);
  });

  it("parses CORS_ORIGINS as a comma-separated list", () => {
    const env = parseEnv({
      DATABASE_URL: "postgresql://u:p@localhost:5432/db",
      CORS_ORIGINS: "http://localhost:5173,https://sudoku-2077.example.com",
    });
    expect(env.CORS_ORIGINS).toEqual(["http://localhost:5173", "https://sudoku-2077.example.com"]);
  });

  it("throws when DATABASE_URL is missing", () => {
    expect(() => parseEnv({})).toThrow();
  });

  it("throws when PORT is not a positive integer", () => {
    expect(() =>
      parseEnv({ DATABASE_URL: "postgresql://u:p@localhost:5432/db", PORT: "not-a-number" })
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace apps/api`
Expected: FAIL — `./env.js` does not exist yet.

- [ ] **Step 3: Write the implementation**

```typescript
// apps/api/src/config/env.ts
import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  PORT: z.coerce.number().int().positive().default(3000),
  MIN_POOL_SIZE: z.coerce.number().int().positive().default(20),
  DAILY_CHALLENGE_LOOKAHEAD_DAYS: z.coerce.number().int().positive().default(30),
  CORS_ORIGINS: z
    .string()
    .optional()
    .transform((value) => (value ? value.split(",").map((origin) => origin.trim()).filter(Boolean) : [])),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
});

export type Env = z.infer<typeof EnvSchema>;

export function parseEnv(source: NodeJS.ProcessEnv | Record<string, string | undefined>): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid environment configuration:\n${result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n")}`);
  }
  return result.data;
}

export const env = parseEnv(process.env);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test --workspace apps/api`
Expected: PASS (4 tests)

- [ ] **Step 5: Wire into server.ts and .env.example**

In `apps/api/src/server.ts`, replace `const port = Number(process.env.PORT ?? 3000);` with an import of `env` from `./config/env.js` (used again in Tasks 3 and 4 — don't fully rewrite `server.ts` yet, just switch the port line):

```typescript
import { env } from "./config/env.js";
// ...
const port = env.PORT;
```

Append to `apps/api/.env.example`:

```
CORS_ORIGINS="http://localhost:5173"
RATE_LIMIT_MAX=100
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/config apps/api/src/server.ts apps/api/.env.example
git commit -m "feat(api): validate env vars at boot with zod"
```

---

## Task 2: Centralized error handler + `:id` param validation

**Files:**
- Create: `apps/api/src/errors.ts`
- Test: `apps/api/src/errors.test.ts`
- Modify: `apps/api/src/server.ts` (register the handler)
- Modify: `apps/api/src/routes/puzzles.ts` (validate `:id` with zod, drop the unchecked cast)

**Interfaces:**
- Consumes: `ErrorResponseSchema` shape `{ error: string }` (already in `@sudoku-2077/api-types`, no change needed there).
- Produces: `registerErrorHandler(app: FastifyInstance): void` — sets a catch-all error handler.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/errors.test.ts
import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { registerErrorHandler } from "./errors.js";

describe("registerErrorHandler", () => {
  it("returns a 500 with a consistent { error } shape for unexpected exceptions", async () => {
    const app = Fastify();
    registerErrorHandler(app);
    app.get("/boom", async () => {
      throw new Error("kaboom");
    });

    const response = await app.inject({ method: "GET", url: "/boom" });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: "Internal server error" });
  });

  it("preserves the status code of errors that set one (e.g. Fastify validation errors)", async () => {
    const app = Fastify();
    registerErrorHandler(app);
    app.get("/typed", async () => {
      const err = Object.assign(new Error("bad input"), { statusCode: 400 });
      throw err;
    });

    const response = await app.inject({ method: "GET", url: "/typed" });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "bad input" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace apps/api`
Expected: FAIL — `./errors.js` does not exist yet.

- [ ] **Step 3: Write the implementation**

```typescript
// apps/api/src/errors.ts
import type { FastifyInstance } from "fastify";

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
    if (statusCode >= 500) {
      request.log.error(error);
      reply.code(500).send({ error: "Internal server error" });
      return;
    }
    reply.code(statusCode).send({ error: error.message });
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test --workspace apps/api`
Expected: PASS

- [ ] **Step 5: Register it in server.ts**

```typescript
import { registerErrorHandler } from "./errors.js";
// after `const app = Fastify({ logger: true });`
registerErrorHandler(app);
```

- [ ] **Step 6: Validate `:id` params with zod in puzzles.ts**

Add near the top of `apps/api/src/routes/puzzles.ts`:

```typescript
import { z } from "zod";

const PuzzleIdParamsSchema = z.object({ id: z.string().min(1) });
```

Replace both `const { id } = request.params as { id: string };` occurrences with:

```typescript
const params = PuzzleIdParamsSchema.safeParse(request.params);
if (!params.success) {
  reply.code(400);
  return { error: "Invalid puzzle id" };
}
const { id } = params.data;
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/errors.ts apps/api/src/errors.test.ts apps/api/src/server.ts apps/api/src/routes/puzzles.ts
git commit -m "feat(api): centralized error handler and zod-validated :id params"
```

---

## Task 3: Security hardening (CORS, rate limiting, helmet)

**Files:**
- Modify: `apps/api/src/server.ts`
- Modify: `apps/api/package.json` (add `@fastify/cors`, `@fastify/rate-limit`, `@fastify/helmet`)

**Interfaces:**
- Consumes: `env.CORS_ORIGINS: string[]`, `env.RATE_LIMIT_MAX: number` (Task 1).

- [ ] **Step 1: Install dependencies**

```bash
npm install --workspace apps/api @fastify/cors @fastify/rate-limit @fastify/helmet
```

- [ ] **Step 2: Register the plugins in server.ts**

```typescript
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import helmet from "@fastify/helmet";
// ... after registerErrorHandler(app);
await app.register(helmet);
await app.register(cors, { origin: env.CORS_ORIGINS.length > 0 ? env.CORS_ORIGINS : false });
await app.register(rateLimit, { max: env.RATE_LIMIT_MAX, timeWindow: "1 minute" });
```

- [ ] **Step 3: Manual verification**

Run: `npm run typecheck --workspace apps/api`
Expected: no errors.

Run the dev server (`npm run dev:api`) and confirm response headers include `x-ratelimit-limit` and standard helmet headers (`x-content-type-options`, etc.) via `curl -i http://localhost:3000/health`.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/server.ts apps/api/package.json apps/api/package-lock.json ../../package-lock.json
git commit -m "feat(api): add cors, rate-limit, and helmet"
```

(Note: `package-lock.json` lives at the repo root for this npm workspaces setup — `git add` it from there, or just `git add -A` scoped to the two package.json/lock paths that actually changed.)

---

## Task 4: Observability — DB-aware health check + request-id correlation

**Files:**
- Modify: `apps/api/src/server.ts`
- Test: `apps/api/src/health.test.ts`

**Interfaces:**
- Consumes: `prisma` from `./db/client.js`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/health.test.ts
import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { registerHealthRoute } from "./health.js";

describe("GET /health", () => {
  it("returns 200 when the DB check succeeds", async () => {
    const app = Fastify();
    registerHealthRoute(app, { checkDb: async () => true });
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });

  it("returns 503 when the DB check fails", async () => {
    const app = Fastify();
    registerHealthRoute(app, {
      checkDb: async () => {
        throw new Error("connection refused");
      },
    });
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ status: "error", error: "Database unavailable" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace apps/api`
Expected: FAIL — `./health.js` does not exist yet.

- [ ] **Step 3: Write the implementation**

```typescript
// apps/api/src/health.ts
import type { FastifyInstance } from "fastify";
import { prisma } from "./db/client.js";

export function registerHealthRoute(
  app: FastifyInstance,
  deps: { checkDb: () => Promise<unknown> } = { checkDb: () => prisma.$queryRaw`SELECT 1` }
): void {
  app.get("/health", async (_request, reply) => {
    try {
      await deps.checkDb();
      return { status: "ok" };
    } catch (err) {
      app.log.error(err);
      reply.code(503);
      return { status: "error", error: "Database unavailable" };
    }
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test --workspace apps/api`
Expected: PASS

- [ ] **Step 5: Wire into server.ts and add request-id correlation**

Replace `app.get("/health", async () => ({ status: "ok" }));` with:

```typescript
import { registerHealthRoute } from "./health.js";
// ...
registerHealthRoute(app);
```

Fastify already generates a per-request id and includes it in every log line by default (`logger: true`). Make it correlate with an incoming/outgoing header too — change the Fastify constructor call to:

```typescript
const app = Fastify({
  logger: true,
  requestIdHeader: "x-request-id",
  genReqId: (req) => (req.headers["x-request-id"] as string) ?? crypto.randomUUID(),
});
```

Add `import { randomUUID } from "node:crypto";` and use `randomUUID()` instead of `crypto.randomUUID()` (no global `crypto` typing assumed under this `lib` config).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/health.ts apps/api/src/health.test.ts apps/api/src/server.ts
git commit -m "feat(api): DB-aware health check and request-id correlation"
```

---

## Task 5: Integration test harness for routes

**Files:**
- Create: `apps/api/vitest.config.ts`
- Create: `apps/api/src/test/buildApp.ts`
- Create: `apps/api/src/routes/puzzles.integration.test.ts`
- Create: `apps/api/src/routes/dailyChallenge.integration.test.ts`
- Modify: `apps/api/package.json` (add `vitest` devDependency, `"test": "vitest run"` script)
- Modify: `apps/api/src/server.ts` (extract app-building into a reusable function)

**Interfaces:**
- Produces: `buildApp(): FastifyInstance` in `apps/api/src/app.ts` — same setup `server.ts` uses to `listen()`, factored out so tests can `app.inject()` without binding a port.

- [ ] **Step 1: Extract `buildApp` from server.ts**

Create `apps/api/src/app.ts` with everything currently in `server.ts` except the `listen()` call:

```typescript
// apps/api/src/app.ts
import "dotenv/config";
import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import helmet from "@fastify/helmet";
import { env } from "./config/env.js";
import { registerErrorHandler } from "./errors.js";
import { registerHealthRoute } from "./health.js";
import { dailyChallengeRoutes } from "./routes/dailyChallenge.js";
import { puzzleRoutes } from "./routes/puzzles.js";

export async function buildApp() {
  const app = Fastify({
    logger: true,
    requestIdHeader: "x-request-id",
    genReqId: (req) => (req.headers["x-request-id"] as string) ?? randomUUID(),
  });

  registerErrorHandler(app);
  await app.register(helmet);
  await app.register(cors, { origin: env.CORS_ORIGINS.length > 0 ? env.CORS_ORIGINS : false });
  await app.register(rateLimit, { max: env.RATE_LIMIT_MAX, timeWindow: "1 minute" });

  registerHealthRoute(app);
  await app.register(dailyChallengeRoutes);
  await app.register(puzzleRoutes);

  return app;
}
```

Reduce `apps/api/src/server.ts` to:

```typescript
import { buildApp } from "./app.js";
import { env } from "./config/env.js";

const app = await buildApp();

try {
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
```

- [ ] **Step 2: Add vitest to apps/api**

```bash
npm install --workspace apps/api --save-dev vitest
```

Add to `apps/api/package.json` scripts: `"test": "vitest run"`.

Create `apps/api/vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    hookTimeout: 20_000,
    testTimeout: 20_000,
  },
});
```

- [ ] **Step 3: Write integration tests against a real Postgres**

These assume `DATABASE_URL` points at a running, migrated Postgres (local `docker-compose.yml` today; CI's service container in Task 6). Each test seeds the exact rows it needs via `prisma` directly and cleans up after itself.

```typescript
// apps/api/src/routes/puzzles.integration.test.ts
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { prisma } from "../db/client.js";

const solution = "1".repeat(81);
const givens = "1" + "0".repeat(80);

async function seedPuzzle() {
  return prisma.puzzle.create({
    data: {
      id: randomUUID(),
      givens,
      solution,
      difficulty: "EASY",
      difficultyScore: 1,
      techniques: ["nakedSingle"],
      givensCount: 1,
    },
  });
}

afterEach(async () => {
  await prisma.puzzle.deleteMany({ where: { givens } });
});

describe("GET /api/puzzles/:id", () => {
  it("returns the puzzle's givens, not its solution", async () => {
    const puzzle = await seedPuzzle();
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: `/api/puzzles/${puzzle.id}` });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.givens).toBe(givens);
    expect(body.solution).toBeUndefined();
  });

  it("returns 404 for an id that doesn't exist", async () => {
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: `/api/puzzles/${randomUUID()}` });
    expect(response.statusCode).toBe(404);
  });
});

describe("POST /api/puzzles/:id/validate", () => {
  it("returns correct: true when the submitted board matches the solution", async () => {
    const puzzle = await seedPuzzle();
    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: `/api/puzzles/${puzzle.id}/validate`,
      payload: { board: solution },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ correct: true, completed: true });
  });

  it("returns 400 for a malformed board", async () => {
    const puzzle = await seedPuzzle();
    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: `/api/puzzles/${puzzle.id}/validate`,
      payload: { board: "too-short" },
    });
    expect(response.statusCode).toBe(400);
  });
});
```

```typescript
// apps/api/src/routes/dailyChallenge.integration.test.ts
import { describe, expect, it } from "vitest";
import { buildApp } from "../app.js";

describe("GET /api/daily-challenge", () => {
  it("returns 404 when no challenge is assigned for today", async () => {
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: "/api/daily-challenge" });
    expect([200, 404]).toContain(response.statusCode);
  });
});
```

(The daily-challenge test only asserts the route responds correctly either way, since seeding "today, UTC" deterministically needs a real `DailyChallenge` + `Puzzle` pair — left loose on purpose rather than faking the clock.)

- [ ] **Step 4: Run against local Postgres**

```bash
docker compose up -d
npm run --workspace apps/api prisma:migrate -- --name phase0_hardening_baseline
npm run test --workspace apps/api
```

Expected: all tests pass (the earlier unit tests from Tasks 1-4 plus these integration tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/app.ts apps/api/src/server.ts apps/api/vitest.config.ts apps/api/src/routes/*.integration.test.ts apps/api/package.json apps/api/package-lock.json
git commit -m "test(api): integration tests for puzzle and daily-challenge routes"
```

---

## Task 6: CI — GitHub Actions workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write the workflow**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: sudoku_2077
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/sudoku_2077?schema=public
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run --workspace apps/api prisma:generate
      - run: npm run --workspace apps/api -- prisma migrate deploy
      - run: npm run typecheck
      - run: npm run test
```

- [ ] **Step 2: Manual verification**

Run `npm run --workspace apps/api -- prisma migrate deploy --help` locally to confirm the CLI invocation shape is correct for this Prisma version (5.x). Push the branch and confirm the workflow appears and runs in the GitHub Actions tab (can't run `act`/GitHub Actions locally in this environment — first real run happens on push).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: run typecheck and test with an ephemeral Postgres on push/PR"
```

---

## Task 7: API documentation — OpenAPI from existing zod schemas

**Files:**
- Create: `apps/api/src/openapi.ts`
- Modify: `apps/api/src/app.ts` (register swagger + swagger-ui)
- Modify: `apps/api/package.json` (add `@fastify/swagger`, `@fastify/swagger-ui`, `@asteasolutions/zod-to-openapi`)

**Interfaces:**
- Consumes: `PublicPuzzleSchema`, `DailyChallengeResponseSchema`, `GetPuzzlesQuerySchema`, `ValidatePuzzleRequestSchema`, `ValidatePuzzleResponseSchema`, `ErrorResponseSchema` from `@sudoku-2077/api-types`.
- Produces: `buildOpenApiDocument(): OpenAPIObject`, registered at `/docs`.

- [ ] **Step 1: Install dependencies**

```bash
npm install --workspace apps/api @fastify/swagger @fastify/swagger-ui @asteasolutions/zod-to-openapi
```

- [ ] **Step 2: Build the OpenAPI registry**

```typescript
// apps/api/src/openapi.ts
import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import {
  DailyChallengeResponseSchema,
  ErrorResponseSchema,
  GetPuzzlesQuerySchema,
  PublicPuzzleSchema,
  ValidatePuzzleRequestSchema,
  ValidatePuzzleResponseSchema,
} from "@sudoku-2077/api-types";

const registry = new OpenAPIRegistry();

registry.registerPath({
  method: "get",
  path: "/api/daily-challenge",
  description: "Today's daily challenge puzzle (UTC), givens only.",
  responses: {
    200: { description: "The daily challenge", content: { "application/json": { schema: DailyChallengeResponseSchema } } },
    404: { description: "No daily challenge assigned yet", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/puzzles",
  description: "One puzzle from the given difficulty tier's pool, givens only.",
  request: { query: GetPuzzlesQuerySchema },
  responses: {
    200: { description: "A puzzle", content: { "application/json": { schema: PublicPuzzleSchema } } },
    400: { description: "Invalid or missing difficulty", content: { "application/json": { schema: ErrorResponseSchema } } },
    404: { description: "No puzzles available for that tier", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/puzzles/{id}",
  description: "A specific puzzle by id, givens only.",
  responses: {
    200: { description: "A puzzle", content: { "application/json": { schema: PublicPuzzleSchema } } },
    404: { description: "Puzzle not found", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/puzzles/{id}/validate",
  description: "Validate a submitted board against the stored solution, server-side.",
  request: {
    body: { content: { "application/json": { schema: ValidatePuzzleRequestSchema } } },
  },
  responses: {
    200: { description: "Validation result", content: { "application/json": { schema: ValidatePuzzleResponseSchema } } },
    400: { description: "Malformed board", content: { "application/json": { schema: ErrorResponseSchema } } },
    404: { description: "Puzzle not found", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

export function buildOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.0",
    info: { title: "sudoku-2077 API", version: "0.0.0" },
  });
}
```

- [ ] **Step 3: Register swagger + swagger-ui in app.ts**

```typescript
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { buildOpenApiDocument } from "./openapi.js";
// ... inside buildApp(), after registerErrorHandler(app):
await app.register(swagger, { mode: "static", specification: { document: buildOpenApiDocument() } });
await app.register(swaggerUi, { routePrefix: "/docs" });
```

- [ ] **Step 4: Manual verification**

Run `npm run dev:api`, open `http://localhost:3000/docs`, confirm all four routes render with their request/response schemas.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/openapi.ts apps/api/src/app.ts apps/api/package.json apps/api/package-lock.json
git commit -m "docs(api): generate OpenAPI from existing zod schemas, serve at /docs"
```

---

## Task 8: Database & config documentation

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a "Deployment notes" section to README.md**

```markdown
## Deployment notes

- **Migrations:** use `prisma migrate dev` locally (creates + applies a new migration interactively). CI/CD environments must use `prisma migrate deploy` instead — it only applies existing migration files and never generates new ones, which is what `.github/workflows/ci.yml` does against its ephemeral Postgres.
- **Connection pooling:** `apps/api` uses a single long-lived `PrismaClient` (see `src/db/client.ts`), which is correct for a single long-running process. If the API ever moves to a serverless or multi-instance host, add PgBouncer (or the host's equivalent) in front of Postgres first — otherwise each instance/invocation opens its own pool and Postgres runs out of connections under load.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: note prisma migrate dev vs deploy and pooling for serverless hosts"
```

---

## Self-Review Notes

- **Spec coverage:** Testing & CI → Tasks 5, 6. Error handling & validation → Task 2. Security (`cors`/`rate-limit`/`helmet`) → Task 3. Observability (`/health` + request-id; Sentry explicitly deferred as "plan for... once public-facing", no task needed yet) → Task 4. DB & config (PgBouncer note, migrate dev/deploy doc, env validation) → Tasks 1, 8. API docs → Task 7.
- **Ceiling called out:** rate limiting uses in-memory state (`@fastify/rate-limit` default store) — fine for the current single-instance deployment; move to a shared Redis store only when the API runs on more than one instance.
