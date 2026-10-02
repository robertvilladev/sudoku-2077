import 'package:flutter/material.dart';

import '../../core/theme.dart';

/// Terminal boot lines typed in over about 600 ms, like web's `TerminalBootText`. A tap skips the
/// typing, and with reduced motion the lines appear at once.
class BootText extends StatefulWidget {
  const BootText({super.key, required this.lines});

  final List<String> lines;

  @override
  State<BootText> createState() => _BootTextState();
}

class _BootTextState extends State<BootText>
    with SingleTickerProviderStateMixin {
  late final _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 600),
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.disableAnimationsOf(context)) {
      _controller.value = 1;
    } else if (!_controller.isAnimating && _controller.value == 0) {
      _controller.forward();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final full = widget.lines.map((l) => '> $l').join('\n').toUpperCase();
    final style = TextStyle(
      fontSize: 11,
      height: 1.6,
      letterSpacing: 0.4,
      color: context.palette.neutral600,
    );
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => _controller.value = 1,
      child: Stack(
        children: [
          // Reserves the final size, so the layout doesn't grow while typing.
          ExcludeSemantics(
            child: Opacity(opacity: 0, child: Text(full, style: style)),
          ),
          AnimatedBuilder(
            animation: _controller,
            builder: (context, _) => Text(
              key: const ValueKey('boot-typed'),
              full.substring(0, (_controller.value * full.length).ceil()),
              style: style,
            ),
          ),
        ],
      ),
    );
  }
}
