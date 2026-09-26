import 'package:flutter/foundation.dart';

/// Player settings, in memory only (persisting them with `shared_preferences` is a later
/// Phase 5.5 item). Provided at the app root.
class SettingsState extends ChangeNotifier {
  SettingsState({
    this._effects = true,
    this._sound = true,
    this._haptics = true,
  });

  bool _effects;
  bool _sound;
  bool _haptics;

  /// Ring, bracket flash and digit pop-in. The sector hatch is state and shows either way.
  bool get effects => _effects;
  bool get sound => _sound;
  bool get haptics => _haptics;

  set effects(bool value) => _set(() => _effects = value, _effects != value);
  set sound(bool value) => _set(() => _sound = value, _sound != value);
  set haptics(bool value) => _set(() => _haptics = value, _haptics != value);

  void _set(VoidCallback apply, bool changed) {
    if (!changed) return;
    apply();
    notifyListeners();
  }
}
