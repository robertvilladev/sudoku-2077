import 'package:flutter/material.dart';

import '../../core/theme.dart';
import '../../domain/sudoku.dart';
import '../../l10n/l10n.dart';
import '../puzzle/ui/board_screen.dart';

class DifficultyScreen extends StatelessWidget {
  const DifficultyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Scaffold(
      appBar: AppBar(title: Text(l10n.difficultySelectTitle.toUpperCase())),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              l10n.difficultyPrompt,
              style: const TextStyle(fontSize: 12, color: Palette.neutral500),
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
    final l10n = context.l10n;
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
                difficulty.label(l10n).toUpperCase(),
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
              ),
              Text(
                difficulty.codename(l10n),
                style: const TextStyle(fontSize: 11, color: Palette.accent300),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
