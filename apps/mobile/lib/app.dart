import 'package:flutter/material.dart';

class SudokuApp extends StatelessWidget {
  const SudokuApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      title: 'Sudoku 2077',
      // Placeholder until the "Basic loop screens" roadmap task lands.
      home: Scaffold(body: SizedBox.shrink()),
    );
  }
}
