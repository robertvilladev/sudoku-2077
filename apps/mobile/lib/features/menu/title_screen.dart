import 'package:flutter/material.dart';

import '../../core/theme.dart';
import 'difficulty_screen.dart';

class TitleScreen extends StatelessWidget {
  const TitleScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 320),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: 12,
                children: [
                  const Text(
                    '> SYSTEM ONLINE\n> LOADING SUDOKU.EXE\n> GRID INTEGRITY: OK',
                    style: TextStyle(fontSize: 11, color: Palette.neutral500),
                  ),
                  const SizedBox(height: 12),
                  const FittedBox(
                    child: Text.rich(
                      TextSpan(
                        children: [
                          TextSpan(text: 'SUDOKU'),
                          TextSpan(
                            text: '//',
                            style: TextStyle(color: Palette.accent),
                          ),
                          TextSpan(text: '2077'),
                        ],
                      ),
                      style: TextStyle(
                        fontSize: 44,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  FilledButton(
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(48),
                    ),
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => const DifficultyScreen(),
                      ),
                    ),
                    child: const Text('PLAY'),
                  ),
                  const OutlinedButton(
                    onPressed: null,
                    child: Text('DAILY CHALLENGE // SOON'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
