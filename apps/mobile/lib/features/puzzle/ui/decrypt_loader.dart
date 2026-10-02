import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';

import '../../../core/theme.dart';
import '../../../l10n/l10n.dart';

/// Puzzle loading: a ghost 9×9 grid cycling glyphs, an indeterminate scan bar and the cold-start
/// hint, which fades in only after 3 s so fast loads never show it. Reduced motion keeps the grid
/// and bar still.
class DecryptLoader extends StatefulWidget {
  const DecryptLoader({super.key});

  @override
  State<DecryptLoader> createState() => _DecryptLoaderState();
}

class _DecryptLoaderState extends State<DecryptLoader>
    with SingleTickerProviderStateMixin {
  static const _glyphs = '0123456789ABCDEF#%/<>';

  final _random = Random(2077);
  late List<String> _cells = _shuffle();
  late final _scan = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1200),
  );
  Timer? _cycle;
  late final Timer _hintTimer;
  bool _showHint = false;

  List<String> _shuffle() =>
      List.generate(81, (_) => _glyphs[_random.nextInt(_glyphs.length)]);

  @override
  void initState() {
    super.initState();
    _hintTimer = Timer(const Duration(seconds: 3), () {
      if (mounted) setState(() => _showHint = true);
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final still = MediaQuery.disableAnimationsOf(context);
    if (still) {
      _cycle?.cancel();
      _cycle = null;
      _scan.stop();
    } else if (_cycle == null) {
      _cycle = Timer.periodic(const Duration(milliseconds: 80), (_) {
        setState(() => _cells = _shuffle());
      });
      _scan.repeat();
    }
  }

  @override
  void dispose() {
    _cycle?.cancel();
    _hintTimer.cancel();
    _scan.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final still = MediaQuery.disableAnimationsOf(context);
    return Center(
      child: Padding(
        padding: const EdgeInsetsDirectional.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          spacing: 14,
          children: [
            ExcludeSemantics(
              child: Container(
                width: 198,
                height: 198,
                decoration: BoxDecoration(
                  color: p.lineThin,
                  border: Border.all(color: p.accent700, width: 2),
                ),
                child: GridView.count(
                  crossAxisCount: 9,
                  mainAxisSpacing: 1,
                  crossAxisSpacing: 1,
                  physics: const NeverScrollableScrollPhysics(),
                  children: [
                    for (final glyph in _cells)
                      ColoredBox(
                        color: p.cellBg,
                        child: Center(
                          child: Text(
                            glyph,
                            style: TextStyle(fontSize: 11, color: p.neutral600),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            Text(
              l10n.puzzleDecrypting.toUpperCase(),
              style: displayStyle(15, color: p.given),
            ),
            SizedBox(
              width: 198,
              height: 2,
              child: ColoredBox(
                color: p.lineThin,
                child: ClipRect(
                  child: still
                      ? ColoredBox(color: p.accent)
                      : AnimatedBuilder(
                          animation: _scan,
                          builder: (context, _) => FractionallySizedBox(
                            widthFactor: 0.3,
                            alignment: AlignmentDirectional(
                              -1 + _scan.value * 2.6,
                              0,
                            ),
                            child: ColoredBox(color: p.accent),
                          ),
                        ),
                ),
              ),
            ),
            AnimatedOpacity(
              key: const ValueKey('cold-start-hint'),
              opacity: _showHint ? 1 : 0,
              duration: Duration(milliseconds: still ? 0 : 400),
              child: Text(
                l10n.puzzleColdStartHint,
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: p.neutral500),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
