import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/locale_controller.dart';
import 'core/theme.dart';
import 'features/menu/language_screen.dart';
import 'features/menu/title_screen.dart';
import 'features/puzzle/data/api_client.dart';
import 'l10n/l10n.dart';

class SudokuApp extends StatelessWidget {
  const SudokuApp({
    super.key,
    required this.apiClient,
    required this.localeController,
  });

  final ApiClient apiClient;
  final LocaleController localeController;

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<ApiClient>.value(value: apiClient),
        ChangeNotifierProvider<LocaleController>.value(value: localeController),
      ],
      child: Consumer<LocaleController>(
        builder: (context, locale, _) => MaterialApp(
          title: 'Sudoku 2077',
          theme: buildTheme(),
          locale: locale.locale,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: locale.languageChosen
              ? const TitleScreen()
              : const LanguageScreen(),
        ),
      ),
    );
  }
}
