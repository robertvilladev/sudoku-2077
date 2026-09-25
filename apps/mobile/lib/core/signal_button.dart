import 'package:flutter/material.dart';

import 'theme.dart';

/// A rectangle with the top-right and bottom-left corners clipped at 45°, the POC's
/// `clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))`.
class NotchedBorder extends OutlinedBorder {
  const NotchedBorder({super.side, this.notch = 8});

  final double notch;

  Path _path(Rect r) {
    final n = notch.clamp(0.0, r.shortestSide / 2);
    return Path()
      ..moveTo(r.left, r.top)
      ..lineTo(r.right - n, r.top)
      ..lineTo(r.right, r.top + n)
      ..lineTo(r.right, r.bottom)
      ..lineTo(r.left + n, r.bottom)
      ..lineTo(r.left, r.bottom - n)
      ..close();
  }

  @override
  Path getOuterPath(Rect rect, {TextDirection? textDirection}) => _path(rect);

  @override
  Path getInnerPath(Rect rect, {TextDirection? textDirection}) =>
      _path(rect.deflate(side.strokeInset));

  @override
  void paint(Canvas canvas, Rect rect, {TextDirection? textDirection}) {
    if (side.style == BorderStyle.none) return;
    canvas.drawPath(_path(rect.deflate(side.strokeInset / 2)), side.toPaint());
  }

  @override
  ShapeBorder scale(double t) =>
      NotchedBorder(side: side.scale(t), notch: notch * t);

  @override
  NotchedBorder copyWith({BorderSide? side, double? notch}) =>
      NotchedBorder(side: side ?? this.side, notch: notch ?? this.notch);

  @override
  bool operator ==(Object other) =>
      other is NotchedBorder && other.side == side && other.notch == notch;

  @override
  int get hashCode => Object.hash(side, notch);
}

/// D11 primary action: signal-yellow fill, `bg` ink, 8 px clipped corners and a faint yellow glow.
class SignalButton extends StatelessWidget {
  const SignalButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.minHeight = 44,
    this.expand = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final double minHeight;
  final bool expand;

  @override
  Widget build(BuildContext context) {
    const shape = NotchedBorder();
    final enabled = onPressed != null;
    return DecoratedBox(
      decoration: ShapeDecoration(
        shape: shape,
        shadows: enabled
            ? const [BoxShadow(color: Color(0x40FCEE0A), blurRadius: 16)]
            : null,
      ),
      child: FilledButton(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: Palette.signal,
          foregroundColor: Palette.signalInk,
          disabledBackgroundColor: Palette.signal.withValues(alpha: 0.5),
          disabledForegroundColor: Palette.signalInk,
          shape: shape,
          minimumSize: Size(expand ? double.infinity : 64, minHeight),
          padding: const EdgeInsets.symmetric(horizontal: 20),
          textStyle: const TextStyle(
            fontFamily: uiFont,
            fontWeight: FontWeight.w700,
            fontSize: 14,
            letterSpacing: 1.4,
          ),
        ),
        child: Text(label),
      ),
    );
  }
}
