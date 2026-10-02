import 'dart:async';
import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/signal_text.dart';
import '../../../core/theme.dart';
import '../../../domain/sudoku.dart';
import '../../../l10n/l10n.dart';
import '../../menu/language_screen.dart';
import '../data/api_client.dart';
import '../data/puzzle_dto.dart';
import '../state/board_state.dart';
import 'decrypt_loader.dart';
import 'number_pad.dart';
import 'sudoku_grid.dart';

class BoardScreen extends StatefulWidget {
  const BoardScreen({super.key, required this.difficulty});

  final Difficulty difficulty;

  @override
  State<BoardScreen> createState() => _BoardScreenState();
}

class _BoardScreenState extends State<BoardScreen> {
  PublicPuzzle? _puzzle;
  BoardState? _board;
  Object? _loadError;

  Timer? _ticker;
  int _elapsedSeconds = 0;
  bool _paused = false;

  String? _validatedBoard;
  bool _validating = false;
  ValidatePuzzleResponse? _validateResult;
  bool _validateFailed = false;

  bool get _isWon =>
      _validateResult != null &&
      _validateResult!.correct &&
      _validateResult!.completed;

  bool get _inProgress => _board != null && !_isWon && !_board!.isGameOver;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _ticker?.cancel();
    _board?.removeListener(_onBoardChanged);
    _board?.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loadError = null);
    try {
      final puzzle = await context.read<ApiClient>().getRandomPuzzle(
        widget.difficulty,
      );
      if (!mounted) return;
      final board = BoardState(givens: puzzle.givens)
        ..addListener(_onBoardChanged);
      setState(() {
        _puzzle = puzzle;
        _board = board;
      });
      _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
        if (_paused || !_inProgress) return;
        setState(() => _elapsedSeconds++);
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _loadError = e);
    } on FormatException catch (e) {
      if (mounted) setState(() => _loadError = e);
    }
  }

  void _onBoardChanged() {
    final board = _board!;
    // Keyed on the board string so a complete-but-wrong board is re-checked once edited.
    if (board.isComplete &&
        board.boardString != _validatedBoard &&
        !_validating) {
      _validate();
    }
  }

  Future<void> _validate() async {
    final board = _board!;
    setState(() {
      _validatedBoard = board.boardString;
      _validating = true;
      _validateFailed = false;
    });
    try {
      final result = await context.read<ApiClient>().validate(
        _puzzle!.id,
        ValidatePuzzleRequest(
          board: board.boardString,
          timeSeconds: _elapsedSeconds,
          mistakeCount: board.mistakeCount,
          maxCombo: board.maxCombo,
        ),
      );
      if (mounted) setState(() => _validateResult = result);
    } on ApiException {
      if (mounted) setState(() => _validateFailed = true);
    } finally {
      if (mounted) setState(() => _validating = false);
    }
  }

  Future<bool> _confirmQuit() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        elevation: 0,
        insetPadding: const EdgeInsets.all(24),
        child: OverlayCard(
          title: context.l10n.abortRunTitle.toUpperCase(),
          body: context.l10n.abortRunBody,
          primary: (
            context.l10n.actionStay,
            () => Navigator.pop(context, false),
          ),
          secondaries: [
            (
              context.l10n.actionQuit,
              () => Navigator.pop(context, true),
              danger: true,
            ),
          ],
        ),
      ),
    );
    return confirmed ?? false;
  }

  void _toMenu() => Navigator.of(context).popUntil((route) => route.isFirst);

  void _nextPuzzle() => Navigator.of(context).pushReplacement(
    MaterialPageRoute<void>(
      builder: (_) => BoardScreen(difficulty: widget.difficulty),
    ),
  );

  void _openOptions() =>
      Navigator.of(context)
          .push(MaterialPageRoute<void>(builder: (_) => const OptionsScreen()));

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: !_inProgress,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        if (await _confirmQuit() && context.mounted) Navigator.pop(context);
      },
      child: Scaffold(body: SafeArea(child: _buildBody())),
    );
  }

  Widget _buildBody() {
    final board = _board;
    final l10n = context.l10n;
    final p = context.palette;
    if (_loadError != null) {
      return Center(
        child: SingleChildScrollView(
          padding: const EdgeInsetsDirectional.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 320),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 14,
              children: [
                Text(
                  l10n.puzzleConnectionLost.toUpperCase(),
                  textAlign: TextAlign.center,
                  style: displayStyle(20, color: p.error),
                ),
                Text(
                  loadErrorMessage(l10n, _loadError!),
                  textAlign: TextAlign.center,
                  style: TextStyle(color: p.neutral400),
                ),
                const SizedBox(height: 4),
                FilledButton(
                  onPressed: _load,
                  child: Text(l10n.actionRetry.toUpperCase()),
                ),
                OutlinedButton(
                  onPressed: _toMenu,
                  child: Text(l10n.actionMenu.toUpperCase()),
                ),
              ],
            ),
          ),
        ),
      );
    }
    if (board == null) return const DecryptLoader();

    return ChangeNotifierProvider.value(
      value: board,
      child: Consumer<BoardState>(
        builder: (context, board, _) {
          final showIncorrect =
              _validateResult != null &&
              !_validateResult!.correct &&
              board.boardString == _validatedBoard;
          return Stack(
            children: [
              ImageFiltered(
                enabled: _paused && !_isWon && !board.isGameOver,
                imageFilter: ImageFilter.blur(sigmaX: 6, sigmaY: 6),
                child: Center(
                  child: SingleChildScrollView(
                    padding: const EdgeInsetsDirectional.all(16),
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 520),
                      child: Column(
                        spacing: 14,
                        children: [
                          _Hud(
                            difficulty: widget.difficulty,
                            elapsedSeconds: _elapsedSeconds,
                            mistakeCount: board.mistakeCount,
                            combo: board.combo,
                            onPause: () => setState(() => _paused = true),
                          ),
                          if (_validateFailed)
                            _Banner(
                              message: l10n.puzzleValidateError,
                              actionLabel: l10n.actionRetry.toUpperCase(),
                              onAction: _validate,
                            ),
                          if (showIncorrect)
                            _Banner(message: l10n.puzzleChecksumFailed),
                          const SudokuGrid(),
                          const NumberPad(),
                          const ActionRow(),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              if (_isWon)
                _Scrim(
                  child: OverlayCard(
                    badge: l10n.puzzleClearedBadge,
                    badgeIsSignal: true,
                    title: l10n.puzzleClearedTitle.toUpperCase(),
                    titleColor: p.win,
                    stats: {
                      l10n.statTime: formatTime(_elapsedSeconds),
                      l10n.statMistakes: '${board.mistakeCount}',
                      l10n.statMaxCombo: '×${board.maxCombo}',
                    },
                    primary: (l10n.actionNextPuzzle, _nextPuzzle),
                    secondaries: [(l10n.actionMenu, _toMenu, danger: false)],
                  ),
                )
              else if (board.isGameOver)
                _Scrim(
                  child: OverlayCard(
                    badge: l10n.puzzleFailedBadge,
                    badgeColor: p.error,
                    title: l10n.puzzleFailedTitle.toUpperCase(),
                    titleColor: p.error,
                    stats: {
                      l10n.statTime: formatTime(_elapsedSeconds),
                      l10n.statDifficulty: widget.difficulty.label(l10n),
                    },
                    primary: (l10n.actionRetry, _nextPuzzle),
                    secondaries: [(l10n.actionMenu, _toMenu, danger: false)],
                  ),
                )
              else if (_paused)
                _Scrim(
                  child: OverlayCard(
                    badge: l10n.puzzlePausedBadge,
                    title: l10n.puzzlePausedTitle.toUpperCase(),
                    stats: {l10n.statTime: formatTime(_elapsedSeconds)},
                    primary: (
                      l10n.actionResume,
                      () => setState(() => _paused = false),
                    ),
                    secondaries: [
                      (l10n.menuOptions, _openOptions, danger: false),
                      (
                        l10n.actionQuitToMenu,
                        () async {
                          if (await _confirmQuit()) _toMenu();
                        },
                        danger: false,
                      ),
                    ],
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

/// Maps a load failure to catalog copy. The server's `error` text is English developer copy, so
/// only its stable `code` is used.
String loadErrorMessage(AppLocalizations l10n, Object error) {
  if (error is! ApiException) return l10n.errorGeneric;
  if (error.statusCode == null) return l10n.errorNetwork;
  return switch (error.code) {
    'NO_PUZZLES_AVAILABLE' => l10n.errorNoPuzzles,
    'NOT_FOUND' => l10n.errorNotFound,
    'RATE_LIMITED' => l10n.errorRateLimited,
    'INTERNAL_ERROR' => l10n.errorServer,
    _ => l10n.errorGeneric,
  };
}

String formatTime(int totalSeconds) {
  final m = (totalSeconds ~/ 60).toString().padLeft(2, '0');
  final s = (totalSeconds % 60).toString().padLeft(2, '0');
  return '$m:$s';
}

class _Hud extends StatelessWidget {
  const _Hud({
    required this.difficulty,
    required this.elapsedSeconds,
    required this.mistakeCount,
    required this.combo,
    required this.onPause,
  });

  final Difficulty difficulty;
  final int elapsedSeconds;
  final int mistakeCount;
  final int combo;
  final VoidCallback onPause;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final value = weighted(FontWeight.w600).copyWith(
      fontSize: 16,
      color: p.given,
      fontFeatures: const [FontFeature.tabularFigures()],
    );
    Widget stat(String name, Widget child) => Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          name.toUpperCase(),
          style: TextStyle(fontSize: 10, letterSpacing: 1, color: p.neutral500),
        ),
        child,
      ],
    );

    return Row(
      children: [
        Expanded(
          child: stat(
            l10n.statTier,
            Text(
              difficulty.label(l10n).toUpperCase(),
              style: value.copyWith(color: p.accent300),
            ),
          ),
        ),
        Expanded(
          child: stat(
            l10n.statTime,
            Text(formatTime(elapsedSeconds), style: value),
          ),
        ),
        Expanded(
          child: stat(
            l10n.statMistakes,
            Text(
              '$mistakeCount/$maxMistakes',
              style: mistakeCount > 0 ? value.copyWith(color: p.error) : value,
            ),
          ),
        ),
        Expanded(
          child: stat(l10n.statCombo, SignalText('×$combo', style: value)),
        ),
        IconButton(
          tooltip: l10n.hudPause,
          onPressed: onPause,
          style: IconButton.styleFrom(
            side: BorderSide(color: p.accent800),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(4),
            ),
          ),
          icon: const Icon(Icons.pause),
        ),
      ],
    );
  }
}

class _Banner extends StatelessWidget {
  const _Banner({required this.message, this.actionLabel, this.onAction});

  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      padding: const EdgeInsetsDirectional.symmetric(
        horizontal: 12,
        vertical: 6,
      ),
      decoration: BoxDecoration(
        color: Color.alphaBlend(p.hlConflict, p.surface2),
        border: Border.all(color: p.error),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              message,
              style: TextStyle(color: p.error, fontSize: 12),
            ),
          ),
          if (actionLabel != null)
            TextButton(
              onPressed: onAction,
              style: TextButton.styleFrom(foregroundColor: p.error),
              child: Text(actionLabel!),
            ),
        ],
      ),
    );
  }
}

class _Scrim extends StatelessWidget {
  const _Scrim({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: ColoredBox(
        color: context.palette.scrim,
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsetsDirectional.all(24),
            child: child,
          ),
        ),
      ),
    );
  }
}

/// The one card behind pause, win, lose and "Abort run?": corner brackets, badge, display title,
/// optional body and stats, then one yellow primary with the secondaries under it.
class OverlayCard extends StatelessWidget {
  const OverlayCard({
    super.key,
    this.badge,
    this.badgeColor,
    this.badgeIsSignal = false,
    required this.title,
    this.titleColor,
    this.body,
    this.stats = const {},
    required this.primary,
    this.secondaries = const [],
  });

  final String? badge;
  final Color? badgeColor;
  final bool badgeIsSignal;
  final String title;
  final Color? titleColor;
  final String? body;
  final Map<String, String> stats;
  final (String, VoidCallback) primary;
  final List<(String, VoidCallback, {bool danger})> secondaries;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    const badgeStyle = TextStyle(fontSize: 10, letterSpacing: 1.8);
    Widget bracket({required bool top, required bool start}) =>
        PositionedDirectional(
          top: top ? -6 : null,
          bottom: top ? null : -6,
          start: start ? -6 : null,
          end: start ? null : -6,
          child: Container(
            width: 14,
            height: 14,
            decoration: BoxDecoration(
              border: BorderDirectional(
                top: top
                    ? BorderSide(color: p.signalLine, width: 2)
                    : BorderSide.none,
                bottom: top
                    ? BorderSide.none
                    : BorderSide(color: p.signalLine, width: 2),
                start: start
                    ? BorderSide(color: p.signalLine, width: 2)
                    : BorderSide.none,
                end: start
                    ? BorderSide.none
                    : BorderSide(color: p.signalLine, width: 2),
              ),
            ),
          ),
        );

    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 420),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            padding: const EdgeInsetsDirectional.all(20),
            decoration: BoxDecoration(
              color: p.surface2,
              borderRadius: BorderRadius.circular(4),
              border: Border.all(color: p.accent800),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 14,
              children: [
                if (badge != null)
                  Align(
                    alignment: AlignmentDirectional.centerStart,
                    child: badgeIsSignal
                        ? SignalText(badge!, style: badgeStyle)
                        : Text(
                            badge!,
                            style: badgeStyle.copyWith(
                              color: badgeColor ?? p.neutral500,
                            ),
                          ),
                  ),
                Text(
                  title,
                  style: displayStyle(20, color: titleColor ?? p.given),
                ),
                if (body != null)
                  Text(
                    body!,
                    style: TextStyle(fontSize: 13, color: p.neutral400),
                  ),
                if (stats.isNotEmpty)
                  Row(
                    children: [
                      for (final entry in stats.entries)
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                entry.key.toUpperCase(),
                                style: TextStyle(
                                  fontSize: 10,
                                  letterSpacing: 1,
                                  color: p.neutral500,
                                ),
                              ),
                              Text(
                                entry.value,
                                style: weighted(FontWeight.w600)
                                    .copyWith(fontSize: 16, color: p.given),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                FilledButton(
                  onPressed: primary.$2,
                  child: Text(primary.$1.toUpperCase()),
                ),
                if (secondaries.isNotEmpty)
                  Row(
                    spacing: 8,
                    children: [
                      for (final (label, onPressed, danger: danger)
                          in secondaries)
                        Expanded(
                          child: OutlinedButton(
                            onPressed: onPressed,
                            style: danger
                                ? OutlinedButton.styleFrom(
                                    foregroundColor: p.error,
                                    side: BorderSide(color: p.error),
                                  )
                                : null,
                            child: Text(
                              label.toUpperCase(),
                              textAlign: TextAlign.center,
                            ),
                          ),
                        ),
                    ],
                  ),
              ],
            ),
          ),
          bracket(top: true, start: true),
          bracket(top: true, start: false),
          bracket(top: false, start: true),
          bracket(top: false, start: false),
        ],
      ),
    );
  }
}
