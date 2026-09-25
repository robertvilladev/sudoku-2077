import 'dart:math' as math;
import 'dart:ui' show ClipOp;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/settings_state.dart';
import '../../../core/theme.dart';
import '../../../domain/sudoku.dart';
import '../../../domain/units.dart';
import '../state/board_state.dart';

/// The 9×9 board plus its Phase 5.5 layers: the per-box "sector secured" hatch (derived from the
/// grid), the selected-cell glow, the unit-complete ring and bracket flash, and the yellow frame
/// corners. Spec section 3 (cells) and 4 (effects).
class SudokuGrid extends StatefulWidget {
  const SudokuGrid({super.key});

  @override
  State<SudokuGrid> createState() => _SudokuGridState();
}

class _SudokuGridState extends State<SudokuGrid> with TickerProviderStateMixin {
  final List<_Effect> _effects = [];
  int? _seenCompletionId;

  @override
  void dispose() {
    for (final e in _effects) {
      e.controller.dispose();
    }
    super.dispose();
  }

  /// Starts an effect for a new [BoardState.lastCompletion]; cancels all of them on undo (which
  /// clears it). Runs during build, which is where a new board state is first seen.
  void _syncEffects(BoardState board, bool effectsOn, bool reduce) {
    final completion = board.lastCompletion;
    if (completion == null) {
      if (_seenCompletionId != null) {
        _seenCompletionId = null;
        for (final e in _effects) {
          e.controller.dispose();
        }
        _effects.clear();
      }
      return;
    }
    if (completion.id == _seenCompletionId) return;
    _seenCompletionId = completion.id;
    if (!effectsOn) return;

    final ringMs = reduce ? 300 : (completion.units.length > 1 ? 560 : 420);
    final hasBox = completion.units.any((u) => u.kind == UnitKind.box);
    final totalMs = math.max(ringMs, hasBox ? _bracketMs : 0);
    // `preserve`: reduced motion is handled above with the spec's own 300 ms substitute, which
    // must not be squeezed further by the framework's disable-animations scaling.
    final controller = AnimationController(
      vsync: this,
      duration: Duration(milliseconds: totalMs),
      animationBehavior: AnimationBehavior.preserve,
    );
    final effect = _Effect(
      controller: controller,
      completion: completion,
      reduced: reduce,
      ringMs: ringMs,
      totalMs: totalMs,
    );
    controller.addStatusListener((status) {
      if (status != AnimationStatus.completed) return;
      if (!_effects.remove(effect)) return;
      WidgetsBinding.instance.addPostFrameCallback((_) => controller.dispose());
      if (mounted) setState(() {});
    });
    _effects.add(effect);
    controller.forward();
  }

  @override
  Widget build(BuildContext context) {
    final board = context.watch<BoardState>();
    final effectsOn = context.select<SettingsState, bool>((s) => s.effects);
    final reduce = MediaQuery.disableAnimationsOf(context);
    _syncEffects(board, effectsOn, reduce);

    final conflicts = board.conflicts;
    final secured = board.securedBoxes;
    final selected = board.selectedIndex;
    final selectedValue = selected == null ? 0 : board.grid[selected];
    final selectedPeers = selected == null
        ? const <int>{}
        : peersOf(selected).toSet();
    final event = board.lastEvent;
    final popIndex =
        effectsOn &&
            !reduce &&
            event != null &&
            event.value != 0 &&
            event.kind != BoardEventKind.clash
        ? event.index
        : null;

    Widget cell(int index) => Expanded(
      child: _SudokuCell(
        index: index,
        value: board.grid[index],
        notes: board.notesAt(index),
        isGiven: board.givenMask[index],
        isSelected: index == selected,
        isPeer: selectedPeers.contains(index),
        isSameValue:
            selectedValue != 0 &&
            index != selected &&
            board.grid[index] == selectedValue,
        isConflict: conflicts.contains(index),
        popKey: index == popIndex ? event!.seq : null,
        onTap: () => board.selectCell(index),
      ),
    );

    Widget box(int boxRow, int boxCol) {
      final isSecured = secured.contains(boxRow * 3 + boxCol);
      return Expanded(
        child: Stack(
          fit: StackFit.expand,
          children: [
            ColoredBox(
              color: Palette.lineThin,
              child: Column(
                spacing: 1,
                children: [
                  for (var r = 0; r < 3; r++)
                    Expanded(
                      child: Row(
                        spacing: 1,
                        children: [
                          for (var c = 0; c < 3; c++)
                            cell((boxRow * 3 + r) * 9 + boxCol * 3 + c),
                        ],
                      ),
                    ),
                ],
              ),
            ),
            // "Sector secured": state, not decoration, so it ignores the effects setting.
            IgnorePointer(
              child: AnimatedOpacity(
                opacity: isSecured ? 1 : 0,
                duration: Duration(milliseconds: isSecured ? 240 : 200),
                curve: Curves.easeOutCubic,
                child: const CustomPaint(painter: _HatchPainter()),
              ),
            ),
          ],
        ),
      );
    }

    final selectedConflict = selected != null && conflicts.contains(selected);
    return AspectRatio(
      aspectRatio: 1,
      child: Stack(
        clipBehavior: Clip.none,
        fit: StackFit.expand,
        children: [
          DecoratedBox(
            decoration: BoxDecoration(
              color: Palette.accent700,
              borderRadius: BorderRadius.circular(4),
              boxShadow: const [
                BoxShadow(color: Color(0x4D9184D9), spreadRadius: 1),
                BoxShadow(color: Color(0x339184D9), blurRadius: 40),
              ],
            ),
            child: Padding(
              padding: const EdgeInsets.all(_pad),
              child: Column(
                spacing: _boxGap,
                children: [
                  for (var br = 0; br < 3; br++)
                    Expanded(
                      child: Row(
                        spacing: _boxGap,
                        children: [for (var bc = 0; bc < 3; bc++) box(br, bc)],
                      ),
                    ),
                ],
              ),
            ),
          ),
          IgnorePointer(
            child: CustomPaint(
              painter: _OverlayPainter(
                selected: selected,
                selectedConflict: selectedConflict,
                effects: List.of(_effects),
                repaint: Listenable.merge([
                  for (final e in _effects) e.controller,
                ]),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

const _pad = 2.0;
const _boxGap = 2.0;
const _cellGap = 1.0;
const _bracketMs = 480;

/// Cell and box rects from the fixed layout (padding 2, box gap 2, cell gap 1), spec 7.5.
class _Geometry {
  _Geometry(Size size)
    : cell = (size.width - 2 * _pad - 2 * _boxGap - 6 * _cellGap) / 9;

  final double cell;

  double offset(int line) =>
      _pad +
      line ~/ 3 * (3 * cell + 2 * _cellGap + _boxGap) +
      line % 3 * (cell + _cellGap);

  Rect cellRect(int index) =>
      Rect.fromLTWH(offset(index % 9), offset(index ~/ 9), cell, cell);

  Rect boxRect(int box) => Rect.fromLTWH(
    offset(box % 3 * 3),
    offset(box ~/ 3 * 3),
    3 * cell + 2 * _cellGap,
    3 * cell + 2 * _cellGap,
  );

  Rect get board => Rect.fromLTWH(0, 0, 9 * cell + 14, 9 * cell + 14);
}

class _Effect {
  _Effect({
    required this.controller,
    required this.completion,
    required this.reduced,
    required this.ringMs,
    required this.totalMs,
  });

  final AnimationController controller;
  final UnitCompletion completion;
  final bool reduced;
  final int ringMs;
  final int totalMs;

  double get elapsedMs => controller.value * totalMs;
}

/// Frame corners, selected-cell glow, and the running unit-complete effects.
class _OverlayPainter extends CustomPainter {
  _OverlayPainter({
    required this.selected,
    required this.selectedConflict,
    required this.effects,
    required Listenable repaint,
  }) : super(repaint: repaint);

  final int? selected;
  final bool selectedConflict;
  final List<_Effect> effects;

  static const _accent = Palette.accent;
  static const _signal = Palette.signal;

  @override
  void paint(Canvas canvas, Size size) {
    final g = _Geometry(size);
    _paintFrameCorners(canvas, size);
    if (selected != null) _paintSelectionGlow(canvas, g.cellRect(selected!));
    for (final e in effects) {
      final ms = e.elapsedMs;
      if (ms < e.ringMs) _paintRing(canvas, g, e, ms / e.ringMs);
      if (ms < _bracketMs) {
        for (final u in e.completion.units) {
          if (u.kind == UnitKind.box) {
            _paintBrackets(
              canvas,
              g.boxRect(u.index),
              ms / _bracketMs,
              e.reduced,
            );
          }
        }
      }
    }
  }

  /// D11: the board's outer frame corners in signal yellow, 16 px arms, 6 px outside.
  void _paintFrameCorners(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = _signal
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.square;
    const o = 5.0; // stroke centre: 6 px outside, 2 px wide
    const arm = 15.0;
    final r = Rect.fromLTRB(-o, -o, size.width + o, size.height + o);
    for (final (corner, dx, dy) in [
      (r.topLeft, 1.0, 1.0),
      (r.topRight, -1.0, 1.0),
      (r.bottomLeft, 1.0, -1.0),
      (r.bottomRight, -1.0, -1.0),
    ]) {
      canvas.drawPath(
        Path()
          ..moveTo(corner.dx, corner.dy + dy * arm)
          ..lineTo(corner.dx, corner.dy)
          ..lineTo(corner.dx + dx * arm, corner.dy),
        paint,
      );
    }
  }

  /// The selected cell's outer glow (`0 0 14px accent@55%`, or `error@45%` in conflict). Painted
  /// here so it lies over the neighbouring cells, like the POC's z-index; the cell's interior is
  /// clipped out so the digit stays clean.
  void _paintSelectionGlow(Canvas canvas, Rect rect) {
    canvas.save();
    canvas.clipRect(rect, clipOp: ClipOp.difference);
    canvas.drawRect(
      rect,
      Paint()
        ..color = selectedConflict
            ? Palette.error.withValues(alpha: 0.45)
            : _accent.withValues(alpha: 0.55)
        ..maskFilter = const MaskFilter.blur(BlurStyle.outer, 7),
    );
    canvas.restore();
  }

  /// Spec 4.2: an expanding ring from the changed cell, clipped to the union of the newly completed
  /// units. Yellow core, violet trail (D11). Reduced motion: an in-place fade instead.
  void _paintRing(Canvas canvas, _Geometry g, _Effect e, double t) {
    final cells = <int>{for (final u in e.completion.units) ...unitCells(u)};
    final clip = Path();
    for (final i in cells) {
      clip.addRect(g.cellRect(i));
    }
    canvas.save();
    canvas.clipPath(clip);
    final bounds = g.board;
    if (e.reduced) {
      canvas.drawRect(
        bounds,
        Paint()..color = _accent.withValues(alpha: 0.16 * (1 - t)),
      );
      canvas.restore();
      return;
    }

    canvas.drawRect(
      bounds,
      Paint()..color = _accent.withValues(alpha: 0.14 * (1 - t)),
    );

    final originRect = g.cellRect(e.completion.origin);
    final o = originRect.center;
    final cw = originRect.width;
    var far = 0.0;
    for (final i in cells) {
      final r = g.cellRect(i);
      for (final p in [r.topLeft, r.topRight, r.bottomLeft, r.bottomRight]) {
        far = math.max(far, (p - o).distance);
      }
    }
    final rMax = far + 1.6 * cw;
    final radius = rMax * Curves.easeOutCubic.transform(t);
    final outer = radius + 0.35 * cw;
    final trail = 1.6 * cw;
    final a = 0.7 * (1 - t * t);
    final sTrail = math.max(0.0, (radius - trail) / outer);
    final sCore = math.min(math.max(sTrail + 0.001, radius / outer), 0.999);
    canvas.drawRect(
      bounds,
      Paint()
        ..shader = RadialGradient(
          colors: [
            _accent.withValues(alpha: 0),
            _accent.withValues(alpha: 0),
            _accent.withValues(alpha: 0.45 * a),
            _signal.withValues(alpha: a),
            _signal.withValues(alpha: 0),
          ],
          stops: [0, sTrail, (sTrail + sCore) / 2, sCore, 1],
        ).createShader(Rect.fromCircle(center: o, radius: outer)),
    );
    canvas.restore();
  }

  /// Spec 2.4 bracket flash, in signal yellow (D11): 12 px arms, 2 px stroke, 3 px outside the box.
  /// Keyframes: 0 % hidden and 6 px out → 25 % shown at rest → 70 % shown → 100 % hidden.
  void _paintBrackets(Canvas canvas, Rect box, double t, bool reduced) {
    double opacity;
    var shift = 0.0;
    if (reduced) {
      opacity = t < 0.2
          ? t / 0.2
          : t < 0.7
          ? 1
          : 1 - (t - 0.7) / 0.3;
    } else if (t < 0.25) {
      final k = Curves.easeOutCubic.transform(t / 0.25);
      opacity = k;
      shift = 6 * (1 - k);
    } else if (t < 0.7) {
      opacity = 1;
    } else {
      opacity = 1 - Curves.easeOutCubic.transform((t - 0.7) / 0.3);
    }
    if (opacity <= 0) return;

    const arm = 12.0;
    final r = box.inflate(2); // stroke centre: 3 px outside, 2 px wide
    final path = Path();
    for (final (corner, dx, dy) in [
      (r.topLeft, 1.0, 1.0),
      (r.topRight, -1.0, 1.0),
      (r.bottomLeft, 1.0, -1.0),
      (r.bottomRight, -1.0, -1.0),
    ]) {
      final c = corner.translate(-dx * shift, -dy * shift);
      path
        ..moveTo(c.dx, c.dy + dy * (arm - 1))
        ..lineTo(c.dx, c.dy)
        ..lineTo(c.dx + dx * (arm - 1), c.dy);
    }
    canvas.drawPath(
      path,
      Paint()
        ..color = Palette.signalGlow.withValues(
          alpha: Palette.signalGlow.a * opacity,
        )
        ..style = PaintingStyle.stroke
        ..strokeWidth = 4
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 2),
    );
    canvas.drawPath(
      path,
      Paint()
        ..color = _signal.withValues(alpha: opacity)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2
        ..strokeCap = StrokeCap.square,
    );
  }

  @override
  bool shouldRepaint(_OverlayPainter old) => true;
}

/// "Sector secured" scanline hatch: a 1 px `accent@13%` line every 3 px.
class _HatchPainter extends CustomPainter {
  const _HatchPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = Palette.hatch;
    for (var y = 0.0; y < size.height; y += 3) {
      canvas.drawRect(Rect.fromLTWH(0, y, size.width, 1), paint);
    }
  }

  @override
  bool shouldRepaint(_HatchPainter old) => false;
}

class _SudokuCell extends StatelessWidget {
  const _SudokuCell({
    required this.index,
    required this.value,
    required this.notes,
    required this.isGiven,
    required this.isSelected,
    required this.isPeer,
    required this.isSameValue,
    required this.isConflict,
    required this.popKey,
    required this.onTap,
  });

  final int index;
  final int value;
  final Set<int> notes;
  final bool isGiven;
  final bool isSelected;
  final bool isPeer;
  final bool isSameValue;
  final bool isConflict;

  /// Non-null when this cell's digit was just placed: it pops in (keyed so each move restarts it).
  final int? popKey;
  final VoidCallback onTap;

  static final _givenBase = Color.alphaBlend(Palette.givenTint, Palette.bg);

  @override
  Widget build(BuildContext context) {
    // Highlights are a background layer over the given tint; priority conflict > selected > same > peer.
    final highlight = isConflict
        ? Palette.conflictBg
        : isSelected
        ? Palette.selected
        : isSameValue
        ? Palette.same
        : isPeer
        ? Palette.peer
        : null;
    final base = isGiven && value != 0 ? _givenBase : Palette.bg;
    final background = highlight == null
        ? base
        : Color.alphaBlend(highlight, base);

    final Border? border = isSelected
        ? Border.all(
            color: isConflict ? Palette.error : Palette.accent,
            width: 2,
          )
        : isConflict
        ? Border.all(color: Palette.error.withValues(alpha: 0.55))
        : isSameValue
        ? Border.all(color: Palette.accent.withValues(alpha: 0.45))
        : null;

    // D4: only a player digit turns red in conflict; a given stays white.
    final playerConflict = isConflict && !isGiven;
    final foreground = playerConflict
        ? Palette.error
        : isGiven
        ? Palette.neutral100
        : Palette.accent400;

    final row = index ~/ 9 + 1;
    final col = index % 9 + 1;
    final label = value == 0
        ? 'Row $row, column $col, empty'
        : 'Row $row, column $col, ${isGiven ? 'given' : 'entered'} $value';

    Widget? content;
    if (value != 0) {
      content = LayoutBuilder(
        builder: (context, constraints) {
          Widget digit = Text(
            '$value',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: constraints.maxWidth * 0.58,
              height: 1,
              color: foreground,
              fontWeight: isGiven ? FontWeight.w700 : FontWeight.w400,
              fontFeatures: tabularFigures,
              shadows: playerConflict
                  ? const [Shadow(color: Color(0x99E3645E), blurRadius: 10)]
                  : null,
            ),
          );
          if (popKey != null) {
            digit = _PopIn(key: ValueKey(popKey), child: digit);
          }
          return Center(child: digit);
        },
      );
    } else if (notes.isNotEmpty) {
      content = _NotesGrid(notes: notes);
    }

    return Semantics(
      button: true,
      selected: isSelected,
      label: label,
      excludeSemantics: true,
      child: GestureDetector(
        key: ValueKey('cell-$index'),
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: DecoratedBox(
          decoration: BoxDecoration(color: background),
          position: DecorationPosition.background,
          child: DecoratedBox(
            decoration: border == null
                ? const BoxDecoration()
                : BoxDecoration(border: border),
            position: DecorationPosition.foreground,
            child: SizedBox.expand(child: content),
          ),
        ),
      ),
    );
  }
}

/// Spec 3: digit pop-in on placement, scale 0.7 → 1 and opacity 0.2 → 1 over 160 ms.
class _PopIn extends StatelessWidget {
  const _PopIn({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: const Duration(milliseconds: 160),
      curve: Curves.easeOutCubic,
      builder: (context, t, child) => Opacity(
        opacity: 0.2 + 0.8 * t,
        child: Transform.scale(scale: 0.7 + 0.3 * t, child: child),
      ),
      child: child,
    );
  }
}

class _NotesGrid extends StatelessWidget {
  const _NotesGrid({required this.notes});

  final Set<int> notes;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final style = TextStyle(
          fontSize: constraints.maxWidth * 0.24,
          height: 1,
          fontWeight: FontWeight.w500,
          color: Palette.neutral500,
        );
        return Padding(
          padding: const EdgeInsets.all(1),
          child: Column(
            children: [
              for (var r = 0; r < 3; r++)
                Expanded(
                  child: Row(
                    children: [
                      for (var c = 1; c <= 3; c++)
                        Expanded(
                          child: Center(
                            child: Text(
                              notes.contains(r * 3 + c) ? '${r * 3 + c}' : '',
                              style: style,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}
