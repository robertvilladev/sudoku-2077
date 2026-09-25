import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/settings_state.dart';
import 'core/sfx.dart';
import 'core/theme.dart';
import 'features/menu/title_screen.dart';
import 'features/puzzle/data/api_client.dart';

class SudokuApp extends StatefulWidget {
  const SudokuApp({
    super.key,
    required this.apiClient,
    this.sfx = const NoopSfxPlayer(),
    this.settings,
  });

  final ApiClient apiClient;

  /// Defaults to silence; `main()` passes the real player. Tests inject a fake.
  final SfxPlayer sfx;

  /// Defaults to a fresh [SettingsState] owned by the app.
  final SettingsState? settings;

  @override
  State<SudokuApp> createState() => _SudokuAppState();
}

class _SudokuAppState extends State<SudokuApp> {
  late final SettingsState _ownSettings = SettingsState();

  @override
  void dispose() {
    _ownSettings.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<ApiClient>.value(value: widget.apiClient),
        Provider<SfxPlayer>.value(value: widget.sfx),
        ChangeNotifierProvider<SettingsState>.value(
          value: widget.settings ?? _ownSettings,
        ),
      ],
      child: MaterialApp(
        title: 'Sudoku 2077',
        theme: buildTheme(),
        home: const TitleScreen(),
      ),
    );
  }
}
