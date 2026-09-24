# Phase 5 kickoff — Flutter mobile app: monorepo integration + bare setup

Design approved 2026-09-19. Implements the first slice of the Phase 5 section of `ROADMAP.md`.

## Goal

Fit a Flutter app into the existing monorepo and CI without disturbing the Node toolchain, fix the
folder structure and state pattern for the rest of Phase 5, and land an empty-but-green app. No
screens and no API calls yet — those are the following Phase 5 bullets.

## Decisions

- **Standalone `apps/mobile`, not an npm workspace.** No `package.json`, so root
  `npm run build/test/typecheck/lint` skip it and `ci.yml` stays Node-only. Rejected: a wrapper
  `package.json` (forces the Flutter SDK into every root run and husky), and Melos/Dart workspaces
  (tooling for a single app).
- **State: `ChangeNotifier` + `provider`.** One notifier per feature; `ApiClient` provided at the root so
  tests swap in a fake (`package:http/testing.dart`'s `MockClient`, no extra dependency). `provider` also
  gives Phase 6 a place to inject an auth session.
- **Structure: feature-first**, mirroring `apps/web`'s `features/` + `lib/`. Dependency direction
  `ui → state → data`; `core/` importable by everyone; `domain/` is pure Dart (no Flutter imports).
  Directories are created when a task needs them — no empty scaffolding.
- **IDs:** `com.robertvilladev.sudoku2077` (Android `applicationId`, iOS bundle id). Platforms:
  Android + iOS only.
- **Config:** `--dart-define=API_BASE_URL=...` (the analogue of web's `VITE_API_BASE_URL`). Native HTTP
  sends no `Origin`, so `CORS_ORIGINS` on Render is unchanged.
- **SDK pin:** `environment: flutter:` in `pubspec.yaml` is the single source; `mobile.yml` reads it via
  `flutter-version-file`.
- **CI:** separate `.github/workflows/mobile.yml`, path-filtered to `apps/mobile/**` (the repo has no
  required status checks, so skipped runs don't block PRs). Steps: `pub get`, `dart format`,
  `flutter analyze`, `flutter test`.

## Tooling integration

- Root Prettier (and lint-staged) would reformat Flutter-generated JSON/MD, and Prettier 3 only reads the
  root `.gitignore` → `.prettierignore` gets `apps/mobile/`; `eslint.config.mjs` ignores `apps/mobile/**`.
- Android: `INTERNET` permission goes in the **main** manifest (Flutter only adds it to debug/profile, so
  release builds would have no network); `usesCleartextTraffic="true"` goes in the **debug** manifest
  only, for `http://10.0.2.2:3000`.

## Known limits / deferred

- iOS is unverified: it cannot be built on Windows or the ubuntu runner. Add a macOS job or use a Mac when
  iOS matters.
- No `flutter build apk` in CI yet — add it when native plugins (`shared_preferences`) land.
- The Render free tier sleeps after ~15 min idle; the `ApiClient` (next task) needs a timeout that
  tolerates a cold start.
- Navigation package (go_router vs Navigator) is decided in the "Basic loop screens" task.
- Contract drift between the hand-written Dart DTOs and `@sudoku-2077/api-types` is accepted for three
  shapes; revisit with shared JSON fixtures if the API surface grows.
