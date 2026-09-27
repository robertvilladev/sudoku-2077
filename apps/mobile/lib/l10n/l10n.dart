import 'package:flutter/widgets.dart';

import '../domain/sudoku.dart';
import 'gen/app_localizations.dart';

export 'gen/app_localizations.dart';

/// Always shown in their own language, never translated, so a player who picked the wrong
/// language can still find theirs.
const languageNames = {
  'en': 'English',
  'es': 'Español',
  'fr': 'Français',
  'ca': 'Català',
};

extension L10nContext on BuildContext {
  AppLocalizations get l10n => AppLocalizations.of(this);
}

/// Display labels for the wire enum. `wireName` is never shown.
extension DifficultyL10n on Difficulty {
  String label(AppLocalizations l10n) => switch (this) {
    Difficulty.easy => l10n.difficultyEasy,
    Difficulty.medium => l10n.difficultyMedium,
    Difficulty.hard => l10n.difficultyHard,
    Difficulty.hardcore => l10n.difficultyHardcore,
  };

  String codename(AppLocalizations l10n) => switch (this) {
    Difficulty.easy => l10n.difficultyEasyCodename,
    Difficulty.medium => l10n.difficultyMediumCodename,
    Difficulty.hard => l10n.difficultyHardCodename,
    Difficulty.hardcore => l10n.difficultyHardcoreCodename,
  };
}
