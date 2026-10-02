import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/theme.dart';
import '../../../l10n/l10n.dart';
import '../state/board_state.dart';

class NumberPad extends StatelessWidget {
  const NumberPad({super.key});

  @override
  Widget build(BuildContext context) {
    final board = context.watch<BoardState>();
    return Row(
      spacing: 4,
      children: [
        for (var digit = 1; digit <= 9; digit++)
          Expanded(
            child: _DigitButton(
              digit: digit,
              remaining: board.remaining(digit),
              onPressed: board.isGameOver
                  ? null
                  : () => board.inputDigit(digit),
            ),
          ),
      ],
    );
  }
}

class _DigitButton extends StatelessWidget {
  const _DigitButton({
    required this.digit,
    required this.remaining,
    required this.onPressed,
  });

  final int digit;
  final int remaining;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null && remaining > 0;
    final p = context.palette;
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(4),
      side: BorderSide(color: p.accent800),
    );
    return Semantics(
      button: true,
      enabled: enabled,
      label: context.l10n.padEnterDigitRemaining(digit, remaining),
      excludeSemantics: true,
      child: Opacity(
        opacity: enabled ? 1 : 0.45,
        child: Material(
          color: p.surface2,
          shape: shape,
          child: InkWell(
            key: ValueKey('digit-$digit'),
            customBorder: shape,
            onTap: enabled ? onPressed : null,
            child: SizedBox(
              height: 56,
              child: Stack(
                children: [
                  Center(
                    child: Text(
                      '$digit',
                      style: weighted(FontWeight.w500)
                          .copyWith(fontSize: 22, color: p.accent300),
                    ),
                  ),
                  PositionedDirectional(
                    top: 3,
                    end: 5,
                    child: Text(
                      '$remaining',
                      style: TextStyle(fontSize: 9, color: p.neutral500),
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

class ActionRow extends StatelessWidget {
  const ActionRow({super.key});

  @override
  Widget build(BuildContext context) {
    final board = context.watch<BoardState>();
    final active = !board.isGameOver;
    final l10n = context.l10n;
    return Row(
      spacing: 8,
      children: [
        Expanded(
          child: _ActionButton(
            icon: Icons.edit_outlined,
            label: l10n.actionNotes.toUpperCase(),
            highlighted: board.notesMode,
            onPressed: board.toggleNotesMode,
          ),
        ),
        Expanded(
          child: _ActionButton(
            icon: Icons.undo,
            label: l10n.actionUndo.toUpperCase(),
            onPressed: active && board.canUndo ? board.undo : null,
          ),
        ),
        Expanded(
          child: _ActionButton(
            icon: Icons.backspace_outlined,
            label: l10n.actionErase.toUpperCase(),
            onPressed: active ? board.eraseSelected : null,
          ),
        ),
      ],
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.icon,
    required this.label,
    required this.onPressed,
    this.highlighted = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback? onPressed;
  final bool highlighted;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return OutlinedButton(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        backgroundColor: highlighted ? p.accent : p.surface2,
        foregroundColor: highlighted ? p.onAccent : p.text,
        side: BorderSide(color: highlighted ? p.accent : p.accent800),
        minimumSize: const Size.fromHeight(56),
        padding: EdgeInsets.zero,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 18),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(fontSize: 11, letterSpacing: 1.2)),
        ],
      ),
    );
  }
}
