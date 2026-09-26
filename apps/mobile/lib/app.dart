import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/theme.dart';
import 'features/menu/title_screen.dart';
import 'features/puzzle/data/api_client.dart';

class SudokuApp extends StatelessWidget {
  const SudokuApp({super.key, required this.apiClient});

  final ApiClient apiClient;

  @override
  Widget build(BuildContext context) {
    return Provider<ApiClient>.value(
      value: apiClient,
      child: MaterialApp(
        title: 'Sudoku 2077',
        theme: buildTheme(),
        home: const TitleScreen(),
      ),
    );
  }
}
