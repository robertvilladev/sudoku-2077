import 'package:flutter/material.dart';

import '../../core/theme.dart';
import '../../domain/sudoku.dart';
import '../puzzle/ui/board_screen.dart';

class DifficultyScreen extends StatelessWidget {
  const DifficultyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('SELECT DIFFICULTY')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text(
              '// CHOOSE YOUR CLEARANCE LEVEL',
              style: TextStyle(
                fontSize: 11,
                letterSpacing: 1.2,
                color: Palette.signal,
              ),
            ),
            const SizedBox(height: 16),
            for (final difficulty in Difficulty.values)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _TierCard(difficulty: difficulty),
              ),
          ],
        ),
      ),
    );
  }
}

class _TierCard extends StatelessWidget {
  const _TierCard({required this.difficulty});

  final Difficulty difficulty;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Palette.surface,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => BoardScreen(difficulty: difficulty),
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: 8,
            children: [
              Text(
                difficulty.wireName,
                style: const TextStyle(
                  fontFamily: displayFont,
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.4,
                ),
              ),
              Text(
                difficulty.flavor,
                style: const TextStyle(
                  fontSize: 12,
                  letterSpacing: 1,
                  color: Palette.accent300,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
