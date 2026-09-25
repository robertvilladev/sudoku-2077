import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/theme.dart';
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
    return Semantics(
      button: true,
      enabled: enabled,
      label: 'Enter $digit, $remaining remaining',
      excludeSemantics: true,
      child: Opacity(
        opacity: enabled ? 1 : 0.45,
        child: Material(
          color: Palette.surface,
          borderRadius: BorderRadius.circular(6),
          child: InkWell(
            key: ValueKey('digit-$digit'),
            borderRadius: BorderRadius.circular(6),
            onTap: enabled ? onPressed : null,
            child: SizedBox(
              height: 56,
              child: Stack(
                children: [
                  Center(
                    child: Text('$digit', style: const TextStyle(fontSize: 22)),
                  ),
                  Positioned(
                    top: 3,
                    right: 5,
                    child: Text(
                      '$remaining',
                      style: const TextStyle(
                        fontSize: 9,
                        color: Palette.neutral500,
                      ),
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
    return Row(
      spacing: 8,
      children: [
        Expanded(
          child: _ActionButton(
            icon: Icons.edit_outlined,
            label: 'NOTES',
            highlighted: board.notesMode,
            onPressed: board.toggleNotesMode,
          ),
        ),
        Expanded(
          child: _ActionButton(
            icon: Icons.undo,
            label: 'UNDO',
            onPressed: active && board.canUndo ? board.undo : null,
          ),
        ),
        Expanded(
          child: _ActionButton(
            icon: Icons.backspace_outlined,
            label: 'ERASE',
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
    return FilledButton(
      onPressed: onPressed,
      style: FilledButton.styleFrom(
        backgroundColor: highlighted ? Palette.accent : Palette.surface,
        foregroundColor: highlighted ? Palette.bg : Palette.text,
        minimumSize: const Size.fromHeight(56),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 18),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(fontSize: 11)),
        ],
      ),
    );
  }
}
