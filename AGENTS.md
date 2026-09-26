# AGENTS.md

Rules for AI agents working in this repo. Keep this file short. Details live in `README.md`, `ROADMAP.md` and `apps/mobile/README.md`.

## Before you start: read the roadmap

1. Read `ROADMAP.md`: the "Current state" line at the top, plus the phase your task belongs to.
2. Check that the task fits the current phase. If it skips ahead, conflicts with a decision recorded there, or duplicates something already done, **say so before writing code**.
3. Raise problems early. If the roadmap and the code disagree, or a task needs a decision that isn't recorded anywhere (a new dependency, an API contract change, a schema change), stop and ask. Don't guess.
4. When the work is done, tick the roadmap checkbox or update it in the same PR.

## Monorepo map

| Path                    | What                                               | Scope    |
| ----------------------- | -------------------------------------------------- | -------- |
| `apps/api`              | Fastify + Prisma (Postgres) REST API               | `api`    |
| `apps/web`              | Vite + React + TS client, TanStack Query           | `web`    |
| `apps/mobile`           | Flutter client. **Not** an npm workspace           | `mobile` |
| `packages/sudoku-core`  | Generator, solvers, classifier. Pure TS, no IO     | `core`   |
| `packages/api-types`    | Shared Zod schemas/DTOs, the API contract          | `types`  |
| root, `.github`, config | Tooling, CI, deploy (`render.yaml`, `vercel.json`) | `repo`   |

Invariants:

- The puzzle solution never reaches a client. Validation happens server-side (`apps/api/src/mappers.ts` strips it).
- A request/response shape change starts in `packages/api-types`. Mobile DTOs are hand-written in Dart, so update them in the same PR. Mobile CI does **not** run on `api-types` changes.
- Web and mobile share no code. A game-rule change (e.g. the mistake rule, which is a peer conflict) must land on both clients.

## Commands

- TS (from root): `npm run typecheck`, `npm run lint`, `npm run test`. The pre-push hook runs all three.
- Single workspace: `npm run test --workspace apps/web`
- Web e2e: `npm run test:e2e --workspace apps/web`
- Mobile (in `apps/mobile`): `dart format .`, `flutter analyze`, `flutter test`. No git hook covers Dart, so run them yourself.
- API tests need Postgres: `docker compose up -d`.

## Workflow: pragmatic TDD

- **Test first** for logic: `sudoku-core`, API routes/services, board-state reducers/notifiers, API clients. Write a failing test, make it pass, then refactor.
- **Bug fixes** start with a test that reproduces the bug.
- **Test after, or skip,** for pure visuals (styles, animations, SFX), config and docs.
- Tests are colocated as `*.test.ts(x)` in TS and live under `apps/mobile/test/` in Flutter. Web mocks the network with MSW (`src/test/msw/handlers.ts`).
- Never skip, delete or weaken a test to get green.

## Git

**Conventional Commits**, always with a scope from the table above:

```
<type>(<scope>): <imperative summary, lowercase, no period>

feat(web): add unit-complete scan sweep
fix(api): reject validate requests with 80-char boards
test(core): cover x-wing elimination edge case
chore(repo): bump prettier
ci(mobile): add flutter build apk step
```

- Types: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `style`, `build`, `ci`, `chore`, `revert`.
- One scope per commit. If a change spans several (e.g. `types` + `api` + `web` for a contract change), use the scope of the main change, or split the commits.
- Breaking API contract changes use `!`, e.g. `feat(types)!: ...`, and include a `BREAKING CHANGE:` footer.
- PRs are squash-merged, so **the PR title must be a valid conventional commit too**.

**Branches:** `<type>/<scope>-<short-kebab-desc>`, e.g. `feat/mobile-progress-persistence`, `fix/api-cold-start-timeout`. Never prefix a branch with `claude/`.

## Style

- Match the surrounding code. Prettier + ESLint for TS, `dart format` for Dart (Prettier ignores `apps/mobile/`).
- Keep diffs minimal and scoped to the task. Don't refactor unrelated code in the same PR.
- Don't add a dependency without saying why in the PR.
- Design specs and plans live in `docs/superpowers/{specs,plans}/`. Write one for any multi-step feature.
