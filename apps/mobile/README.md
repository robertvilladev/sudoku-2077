# sudoku2077 (mobile)

Flutter client (Android + iOS) for `apps/api`. Anonymous play only. Not an npm workspace: root `npm`
scripts and `ci.yml` ignore it; `.github/workflows/mobile.yml` builds it. Design:
`docs/superpowers/specs/2026-09-19-flutter-mobile-setup-design.md`.

## Prerequisites

- Flutter `3.47.5` (pinned in `pubspec.yaml` under `environment: flutter:` — CI reads the same line).
  Install via <https://docs.flutter.dev/install>, then `flutter doctor`.
- Android: Android SDK 36 + build-tools 28.0.3 and JDK 17. iOS builds need a Mac (not verified in CI).

## Run

```bash
cd apps/mobile
flutter pub get
# Android emulator (default API_BASE_URL is http://10.0.2.2:3000, i.e. the host's localhost):
flutter run
# iOS simulator, or the deployed API:
flutter run --dart-define=API_BASE_URL=http://localhost:3000
flutter run --dart-define=API_BASE_URL=https://<your-render-service>.onrender.com
```

Start the API first (`npm run dev:api` from the repo root). Debug builds allow cleartext `http://` to the
emulator host; release builds do not.

No backend handy? Run against the in-app fake instead:

```bash
flutter run --dart-define=USE_MOCK_API=true
```

In mock mode every tier serves the same classic puzzle, except **EASY**, which is the solution with three
cells blank (top-left `5`, centre `5`, bottom-right `9`) so the win dialog is three taps away. Three
conflicting placements (e.g. a `5` anywhere else in the top row) trigger the lose dialog.

## Checks (same as CI)

```bash
dart format --set-exit-if-changed .
flutter analyze
flutter test
```

## Layout

Feature-first; dependency direction `ui → state → data`, `core/` is importable by everyone, `domain/` is
pure Dart. Directories are added when a task needs them.

```
lib/
  main.dart, app.dart          # entrypoint; provides ApiClient to the tree
  core/                        # config (API_BASE_URL, USE_MOCK_API), theme
  domain/sudoku.dart           # peersOf, parseGrid, Difficulty — pure Dart
  features/menu/               # title + difficulty screens
  features/puzzle/data/        # ApiClient (talks to apps/api), DTOs, mock backend
  features/puzzle/state/       # BoardState — port of web's useBoardState
  features/puzzle/ui/          # board screen, grid, number pad
```

State is one `ChangeNotifier` per feature exposed through `provider`. Navigation is plain `Navigator`
(three screens don't justify `go_router`). `ApiClient` is the Dart counterpart of
`apps/web/src/lib/apiClient.ts`: it calls the same `apps/api` endpoints, with a 60 s timeout for Render
cold starts and one automatic retry for GETs only (never for `/validate`).
