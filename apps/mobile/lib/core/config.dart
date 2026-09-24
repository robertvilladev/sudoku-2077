/// API origin, set at build/run time: `--dart-define=API_BASE_URL=https://...`.
/// The default is the Android emulator's alias for the host machine's `localhost`
/// (iOS simulator: pass `http://localhost:3000`).
const apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:3000',
);
