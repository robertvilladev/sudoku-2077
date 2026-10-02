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
          padding: const EdgeInsetsDirectional.all(16),
          children: [
            Text(
              l10n.difficultyPrompt,
              style: TextStyle(fontSize: 12, color: context.palette.neutral500),
            ),
            const SizedBox(height: 16),
            for (final difficulty in Difficulty.values)
              Padding(
                padding: const EdgeInsetsDirectional.only(bottom: 12),
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
    final p = context.palette;
    final level = Difficulty.values.indexOf(difficulty) + 1;
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(4),
      side: BorderSide(color: p.accent800),
    );
    return Material(
      color: p.surface2,
      shape: shape,
      child: InkWell(
        customBorder: shape,
        overlayColor: WidgetStatePropertyAll(p.hlSel),
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => BoardScreen(difficulty: difficulty),
          ),
        ),
        child: Padding(
          padding: const EdgeInsetsDirectional.all(16),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  spacing: 6,
                  children: [
                    Text(
                      difficulty.label(l10n).toUpperCase(),
                      style: displayStyle(15, color: p.given),
                    ),
                    Text(
                      difficulty.codename(l10n),
                      style: TextStyle(
                        fontSize: 11,
                        letterSpacing: 1.8,
                        color: p.accent300,
                      ),
                    ),
                  ],
                ),
              ),
              ExcludeSemantics(
                child: Row(
                  spacing: 3,
                  children: [
                    for (var i = 1; i <= Difficulty.values.length; i++)
                      Container(
                        width: 7,
                        height: 16,
                        color: i <= level ? p.accent : p.accent800,
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
