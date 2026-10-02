import 'package:flutter/material.dart';

import 'theme.dart';

/// Text in the signal role: yellow at night, ink on a yellow block by day (yellow is unreadable as
/// text on a light surface).
class SignalText extends StatelessWidget {
  const SignalText(this.text, {super.key, this.style});

  final String text;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    if (!p.isDay) {
      return Text(
        text,
        style: style?.copyWith(color: p.signal) ?? TextStyle(color: p.signal),
      );
    }
    return DecoratedBox(
      decoration: BoxDecoration(color: p.signal),
      child: Padding(
        padding: const EdgeInsetsDirectional.symmetric(horizontal: 4),
        child: Text(
          text,
          style:
              style?.copyWith(color: p.signalInk) ??
              TextStyle(color: p.signalInk),
        ),
      ),
    );
  }
}

/// Signal as an inline span, for text that must stay on one line with its neighbours.
InlineSpan signalSpan(BuildContext context, String text) {
  final p = context.palette;
  return TextSpan(
    text: p.isDay ? ' $text ' : text,
    style: TextStyle(
      color: p.isDay ? p.signalInk : p.signal,
      backgroundColor: p.isDay ? p.signal : null,
    ),
  );
}
