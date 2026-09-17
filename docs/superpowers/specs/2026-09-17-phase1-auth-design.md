# Phase 1 — Auth system (self-hosted email+password + JWT)

Design approved 2026-09-17. Implements the Phase 1 section of `ROADMAP.md`.

## Goal

Ship a self-hosted email+password auth MVP that: (1) lets the existing
`LoginForm`/`SignupForm` UI work against real endpoints, (2) starts recording
`PuzzleCompletion` rows so leaderboards/stats/achievements have data to build
on later, (3) protects a user's own progress behind auth.

## Decisions

- JWT: `@fastify/jwt` for access-token sign/verify (fits the existing
  `@fastify/*` plugin style already used for cors/helmet/rate-limit).
- Password hashing: `bcrypt` (native module, per roadmap).
- Refresh token transport: httpOnly, `SameSite=Lax`, `Secure` cookie — matches
  the frontend's existing provisional `AuthResponseSchema` (no `refreshToken`
  field in the JSON body). Needs `@fastify/cookie` and `@fastify/cors`
  `credentials: true`.
- Scope includes `GET /api/profile/completions` (not explicitly listed under
  Phase 1 in the roadmap, but the frontend already calls it) so the profile
  page goes fully live instead of staying MSW-mocked.
- Password reset: explicitly deferred (needs an email provider — flagged as a
  post-MVP decision in the roadmap already).

## Data model (`apps/api/prisma/schema.prisma`)

```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  createdAt     DateTime @default(now())
  refreshTokens RefreshToken[]
  completions   PuzzleCompletion[]
}

model RefreshToken {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String
  expiresAt DateTime
  revoked   Boolean  @default(false)
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])

  @@index([userId])
}

model PuzzleCompletion {
  id            String   @id @default(cuid())
  userId        String
  puzzleId      String
  completedAt   DateTime @default(now())
  timeSeconds   Int
  mistakeCount  Int
  maxCombo      Int
  user          User     @relation(fields: [userId], references: [id])
  puzzle        Puzzle   @relation(fields: [puzzleId], references: [id])

  @@index([userId])
}
```

`Puzzle` gains the inverse `completions PuzzleCompletion[]` relation field.

## `packages/api-types` additions

Flat additions to `src/index.ts`, following the existing `XSchema` /
`export type X` pairing:

- `SignupRequestSchema` / `LoginRequestSchema` — `{ email: z.string().email(), password: z.string().min(8) }`.
- `AuthResponseSchema` — `{ accessToken: string, user: { id: string, email: string } }`.
- `CompletionSchema` — `{ puzzleId, difficulty, completedAt, timeSeconds, mistakeCount, maxCombo }`.
- `CompletionsResponseSchema` — `z.array(CompletionSchema)`.

## Routes

`apps/api/src/routes/auth.ts` (`authRoutes`):
- `POST /api/auth/signup` — 409 on duplicate email, else create user, issue tokens.
- `POST /api/auth/login` — generic 401 on bad email/password.
- `POST /api/auth/refresh` — reads refresh cookie, rotates (revoke old, issue new).
- `POST /api/auth/logout` — revokes the refresh token row, clears the cookie. Requires `app.authenticate`.

`apps/api/src/routes/profile.ts` (`profileRoutes`):
- `GET /api/profile/completions` — requires `app.authenticate`, returns the caller's own completions only.

Existing `apps/api/src/routes/puzzles.ts`:
- `/api/puzzles/:id/validate` gains `preHandler: app.optionalAuthenticate` and records a `PuzzleCompletion` only when `request.user` is set.

## Auth decorators (first `preHandler` usage in this codebase)

```ts
app.decorate("authenticate", async (request, reply) => {
  await request.jwtVerify(); // @fastify/jwt throws -> 401 automatically
});

app.decorate("optionalAuthenticate", async (request) => {
  try {
    await request.jwtVerify();
  } catch {
    // anonymous — fine, just don't attach a user
  }
});
```

## Env vars (`apps/api/src/config/env.ts`)

- `JWT_ACCESS_SECRET` — required, no default.
- `JWT_ACCESS_TTL` — default `"15m"`.
- `REFRESH_TOKEN_TTL_DAYS` — default `30`.

## Error handling

Falls through the existing centralized error handler — no new shape.
Signup duplicate → 409. Bad login → generic 401. Missing/expired/invalid
access token → 401 (via `@fastify/jwt`). Bad refresh cookie → 401.

## Testing

Integration tests mirroring `apps/api/src/routes/puzzles.integration.test.ts`
(real Postgres, `buildApp()`, `app.inject`, targeted `deleteMany` cleanup):
signup happy path + duplicate email, login happy + wrong password, refresh
rotation + rejection of a reused/revoked token, logout revokes, `/validate`
records a completion only when authenticated, `/profile/completions` requires
auth and scopes to the caller.

## Frontend touch points (minimal, not a Phase 3 rewrite)

- `apps/web/src/lib/apiClient.ts` — add `credentials: "include"` so the
  refresh cookie round-trips cross-origin (Vercel ↔ Render).
- Swap `apps/web/src/features/auth/types.ts` and
  `apps/web/src/features/profile/types.ts` provisional local schemas for the
  real `@sudoku-2077/api-types` exports (1-line import change, removes
  duplicated/drifted schemas). No behavior change beyond that.

## Out of scope

- Password reset flow.
- Full LoginForm/AuthContext rewiring beyond what's needed to hit real
  endpoints (silent-refresh-on-load polish, etc.) — tracked as Phase 3 in
  the roadmap.
