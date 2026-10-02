import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/appearance_controller.dart';
import '../../core/locale_controller.dart';
import '../../core/signal_text.dart';
import '../../core/theme.dart';
import '../../l10n/l10n.dart';
import 'wordmark.dart';

/// First launch only: shown before the title screen until the player confirms a language.
/// A tap applies the language at once, so the screen already reads in it.
class LanguageScreen extends StatelessWidget {
  const LanguageScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final muted = TextStyle(fontSize: 12, color: p.neutral500);
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
                    style: TextStyle(fontSize: 11, color: p.neutral600),
                  ),
                  const Wordmark(fontSize: 26),
                  Text(
                    l10n.languagePickerTitle.toUpperCase(),
                    style: displayStyle(16, color: p.given),
                  ),
                  Text(l10n.languagePickerPrompt, style: muted),
                  const LanguageList(),
                  FilledButton(
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

/// Title menu → OPTIONS, also reached from the pause card. Everything applies on tap. The Phase 5.5
/// settings (sound, effects, haptics…) join it together with the behaviour they switch.
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
            SectionLabel(l10n.settingLanguage),
            const LanguageList(),
            const SizedBox(height: 24),
            SectionLabel(l10n.settingAppearance),
            const _AppearancePicker(),
          ],
        ),
      ),
    );
  }
}

/// An uppercase section eyebrow in the signal role.
class SectionLabel extends StatelessWidget {
  const SectionLabel(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsetsDirectional.only(bottom: 10),
      child: Align(
        alignment: AlignmentDirectional.centerStart,
        child: SignalText(
          text.toUpperCase(),
          style: const TextStyle(fontSize: 11, letterSpacing: 1.6),
        ),
      ),
    );
  }
}

class _AppearancePicker extends StatelessWidget {
  const _AppearancePicker();

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<AppearanceController>();
    final l10n = context.l10n;
    final labels = {
      Appearance.night: l10n.settingThemeNight,
      Appearance.day: l10n.settingThemeDay,
      Appearance.system: l10n.settingThemeSystem,
    };
    return Row(
      spacing: 8,
      children: [
        for (final entry in labels.entries)
          Expanded(
            child: _Choice(
              key: ValueKey('appearance-${entry.key.name}'),
              label: entry.value.toUpperCase(),
              selected: controller.appearance == entry.key,
              onTap: () => controller.setAppearance(entry.key),
            ),
          ),
      ],
    );
  }
}

class _Choice extends StatelessWidget {
  const _Choice({
    super.key,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Semantics(
      inMutuallyExclusiveGroup: true,
      checked: selected,
      button: true,
      child: Material(
        color: selected ? p.accent900 : p.surface2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(4),
          side: BorderSide(color: selected ? p.accent : p.accent800),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(4),
          onTap: onTap,
          child: SizedBox(
            height: 48,
            child: Center(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  letterSpacing: 1,
                  color: selected ? p.given : p.neutral400,
                ),
              ),
            ),
          ),
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
    final p = context.palette;
    final code = locale.languageCode;
    final lit = selected ? p.accent300 : p.neutral700;
    return Semantics(
      inMutuallyExclusiveGroup: true,
      checked: selected,
      child: Material(
        color: selected ? p.accent900 : p.surface2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(4),
          side: BorderSide(color: selected ? p.accent : p.accent800),
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
                        color: selected ? p.accent : p.neutral700,
                      ),
                      borderRadius: BorderRadius.circular(3),
                    ),
                    child: Text(
                      code.toUpperCase(),
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 11,
                        letterSpacing: 1.5,
                        color: selected ? p.accent300 : p.neutral500,
                      ),
                    ),
                  ),
                  Expanded(
                    child: Text(
                      languageNames[code] ?? code,
                      style: TextStyle(
                        fontSize: 16,
                        color: selected ? p.given : p.text,
                      ),
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
