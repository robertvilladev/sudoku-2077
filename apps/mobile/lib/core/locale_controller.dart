import 'package:flutter/widgets.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../l10n/l10n.dart';

/// The player's language, stored on the device. It is passed to `MaterialApp.locale`, so the
/// device language never overrides it.
class LocaleController extends ChangeNotifier {
  LocaleController(this._prefs);

  static const _localeKey = 'locale';
  static const _chosenKey = 'languageChosen';

  final SharedPreferences _prefs;

  /// English until the player picks something else, or when the stored code is not supported.
  Locale get locale {
    final code = _prefs.getString(_localeKey);
    return AppLocalizations.supportedLocales.firstWhere(
      (l) => l.languageCode == code,
      orElse: () => const Locale('en'),
    );
  }

  /// False until the first-launch language screen is confirmed.
  bool get languageChosen => _prefs.getBool(_chosenKey) ?? false;

  Future<void> setLocale(Locale locale) {
    final saved = _prefs.setString(_localeKey, locale.languageCode);
    notifyListeners(); // the in-memory value is already updated
    return saved;
  }

  Future<void> confirmChoice() {
    final saved = _prefs.setBool(_chosenKey, true);
    notifyListeners();
    return saved;
  }
}
