import 'package:flutter/material.dart';

import '../../core/signal_text.dart';
import '../../core/theme.dart';

/// `SUDOKU//2077`, a brand name, never translated.
class Wordmark extends StatelessWidget {
  const Wordmark({super.key, this.fontSize = 30});

  final double fontSize;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return FittedBox(
      alignment: AlignmentDirectional.centerStart,
      fit: BoxFit.scaleDown,
      child: Text.rich(
        TextSpan(
          children: [
            const TextSpan(text: 'SUDOKU'),
            TextSpan(
              text: '//',
              style: TextStyle(color: p.accent),
            ),
            signalSpan(context, '2077'),
          ],
        ),
        style: displayStyle(fontSize, color: p.given),
      ),
    );
  }
}
