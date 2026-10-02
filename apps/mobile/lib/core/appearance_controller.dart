import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum Appearance { night, day, system }

/// Night, Day or the system setting, stored on the device. Night is the default because it is
/// the brand look.
class AppearanceController extends ChangeNotifier {
  AppearanceController(this._prefs);

  static const _key = 'appearance';

  final SharedPreferences _prefs;

  Appearance get appearance {
    final stored = _prefs.getString(_key);
    return Appearance.values.where((a) => a.name == stored).firstOrNull ??
        Appearance.night;
  }

  ThemeMode get themeMode => switch (appearance) {
    Appearance.night => ThemeMode.dark,
    Appearance.day => ThemeMode.light,
    Appearance.system => ThemeMode.system,
  };

  Future<void> setAppearance(Appearance appearance) {
    final saved = _prefs.setString(_key, appearance.name);
    notifyListeners(); // the in-memory value is already updated
    return saved;
  }
}
