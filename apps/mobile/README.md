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
  main.dart, app.dart   # entrypoint + MaterialApp
  core/config.dart      # API_BASE_URL
  features/<name>/{domain,data,state,ui}/   # as features land
```

State is one `ChangeNotifier` per feature exposed through `provider` (added with the first notifier).
