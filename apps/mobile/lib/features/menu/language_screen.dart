import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/locale_controller.dart';
import '../../core/theme.dart';
import '../../l10n/l10n.dart';

/// First launch only: shown before the title screen until the player confirms a language.
/// A tap applies the language at once, so the screen already reads in it.
class LanguageScreen extends StatelessWidget {
  const LanguageScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    const muted = TextStyle(fontSize: 12, color: Palette.neutral500);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsetsDirectional.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 360),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: 14,
                children: [
                  Text(
                    '> > ${l10n.languageBootLine}'.toUpperCase(),
                    style: const TextStyle(
                      fontSize: 11,
                      color: Palette.neutral500,
                    ),
                  ),
                  const Text(
                    'SUDOKU 2077',
                    style: TextStyle(fontSize: 26, fontWeight: FontWeight.w700),
                  ),
                  Text(
                    l10n.languagePickerTitle.toUpperCase(),
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  Text(l10n.languagePickerPrompt, style: muted),
                  const LanguageList(),
                  FilledButton(
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(48),
                    ),
                    onPressed: context.read<LocaleController>().confirmChoice,
                    child: Text(l10n.actionConfirm.toUpperCase()),
                  ),
                  Text(
                    l10n.languagePickerHint,
                    textAlign: TextAlign.center,
                    style: muted,
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

/// Title menu → OPTIONS. Language only for now; the Phase 5.5 settings join it later.
class OptionsScreen extends StatelessWidget {
  const OptionsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Scaffold(
      appBar: AppBar(title: Text(l10n.menuOptions.toUpperCase())),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsetsDirectional.all(16),
          children: [
            Text(
              l10n.settingLanguage.toUpperCase(),
              style: const TextStyle(
                fontSize: 11,
                letterSpacing: 1.6,
                color: Palette.accent,
              ),
            ),
            const SizedBox(height: 10),
            const LanguageList(),
          ],
        ),
      ),
    );
  }
}

class LanguageList extends StatelessWidget {
  const LanguageList({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<LocaleController>();
    return Column(
      spacing: 8,
      children: [
        for (final locale in AppLocalizations.supportedLocales)
          _LanguageTile(
            locale: locale,
            selected: locale == controller.locale,
            onTap: () => controller.setLocale(locale),
          ),
      ],
    );
  }
}

class _LanguageTile extends StatelessWidget {
  const _LanguageTile({
    required this.locale,
    required this.selected,
    required this.onTap,
  });

  final Locale locale;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final code = locale.languageCode;
    final lit = selected ? Palette.accent300 : Palette.neutral700;
    return Semantics(
      inMutuallyExclusiveGroup: true,
      checked: selected,
      child: Material(
        color: selected ? Palette.accent900 : Palette.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(4),
          side: BorderSide(
            color: selected ? Palette.accent : Palette.accent800,
          ),
        ),
        child: InkWell(
          key: ValueKey('language-$code'),
          borderRadius: BorderRadius.circular(4),
          onTap: onTap,
          child: SizedBox(
            height: 56,
            child: Padding(
              padding: const EdgeInsetsDirectional.symmetric(horizontal: 14),
              child: Row(
                spacing: 12,
                children: [
                  Container(
                    width: 40,
                    padding: const EdgeInsets.symmetric(vertical: 2),
                    decoration: BoxDecoration(
                      border: Border.all(
                        color: selected ? Palette.accent : Palette.neutral700,
                      ),
                      borderRadius: BorderRadius.circular(3),
                    ),
                    child: Text(
                      code.toUpperCase(),
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 11,
                        letterSpacing: 1.5,
                        color: selected
                            ? Palette.accent300
                            : Palette.neutral500,
                      ),
                    ),
                  ),
                  Expanded(
                    child: Text(
                      languageNames[code] ?? code,
                      style: const TextStyle(fontSize: 16),
                    ),
                  ),
                  Container(
                    width: 14,
                    height: 14,
                    decoration: BoxDecoration(
                      color: selected ? lit : null,
                      border: Border.all(color: lit, width: 1.5),
                      borderRadius: BorderRadius.circular(2),
                    ),
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
