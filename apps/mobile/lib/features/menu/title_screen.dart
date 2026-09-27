import 'package:flutter/material.dart';

import '../../l10n/l10n.dart';
import 'boot_text.dart';
import 'difficulty_screen.dart';
import 'language_screen.dart';
import 'wordmark.dart';

class TitleScreen extends StatelessWidget {
  const TitleScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsetsDirectional.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 320),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: 12,
                children: [
                  BootText(
                    lines: [
                      l10n.titleBootOnline,
                      l10n.titleBootLoading,
                      l10n.titleBootIntegrity,
                    ],
                  ),
                  const Wordmark(),
                  const SizedBox(height: 18),
                  FilledButton(
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => const DifficultyScreen(),
                      ),
                    ),
                    child: Text(l10n.menuPlay.toUpperCase()),
                  ),
                  OutlinedButton(
                    onPressed: null,
                    child: Text(l10n.menuDailyChallengeSoon.toUpperCase()),
                  ),
                  OutlinedButton(
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => const OptionsScreen(),
                      ),
                    ),
                    child: Text(l10n.menuOptions.toUpperCase()),
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
