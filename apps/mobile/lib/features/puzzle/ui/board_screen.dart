import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/theme.dart';
import '../../../domain/sudoku.dart';
import '../../../l10n/l10n.dart';
import '../data/api_client.dart';
import '../data/puzzle_dto.dart';
import '../state/board_state.dart';
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
      builder: (context) => AlertDialog(
        title: Text(context.l10n.abortRunTitle.toUpperCase()),
        content: Text(context.l10n.abortRunBody),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(context.l10n.actionStay.toUpperCase()),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(context.l10n.actionQuit.toUpperCase()),
          ),
        ],
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
    if (_loadError != null) {
      return _Centered(
        children: [
          Text(
            l10n.puzzleConnectionLost.toUpperCase(),
            style: const TextStyle(fontSize: 20),
          ),
          Text(
            loadErrorMessage(l10n, _loadError!),
            textAlign: TextAlign.center,
            style: const TextStyle(color: Palette.neutral500),
          ),
          FilledButton(
            onPressed: _load,
            child: Text(l10n.actionRetry.toUpperCase()),
          ),
          TextButton(
            onPressed: _toMenu,
            child: Text(l10n.actionMenu.toUpperCase()),
          ),
        ],
      );
    }
    if (board == null) {
      return _Centered(
        children: [
          const CircularProgressIndicator(),
          Text(
            l10n.puzzleDecrypting.toUpperCase(),
            style: const TextStyle(fontSize: 18),
          ),
          Text(
            l10n.puzzleColdStartHint,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Palette.neutral500, fontSize: 12),
          ),
        ],
      );
    }

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
              Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
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
              if (_isWon)
                _OverlayCard(
                  badge: l10n.puzzleClearedBadge,
                  title: l10n.puzzleClearedTitle.toUpperCase(),
                  titleColor: Palette.win,
                  stats: {
                    l10n.statTime: formatTime(_elapsedSeconds),
                    l10n.statMistakes: '${board.mistakeCount}',
                    l10n.statMaxCombo: '×${board.maxCombo}',
                  },
                  secondary: (l10n.actionMenu, _toMenu),
                  primary: (l10n.actionNextPuzzle, _nextPuzzle),
                )
              else if (board.isGameOver)
                _OverlayCard(
                  badge: l10n.puzzleFailedBadge,
                  title: l10n.puzzleFailedTitle.toUpperCase(),
                  titleColor: Palette.error,
                  stats: {
                    l10n.statTime: formatTime(_elapsedSeconds),
                    l10n.statDifficulty: widget.difficulty.label(l10n),
                  },
                  secondary: (l10n.actionMenu, _toMenu),
                  primary: (l10n.actionRetry, _nextPuzzle),
                )
              else if (_paused)
                _OverlayCard(
                  badge: l10n.puzzlePausedBadge,
                  title: l10n.puzzlePausedTitle.toUpperCase(),
                  titleColor: Palette.text,
                  stats: {l10n.statTime: formatTime(_elapsedSeconds)},
                  secondary: (
                    l10n.actionQuitToMenu,
                    () async {
                      if (await _confirmQuit()) _toMenu();
                    },
                  ),
                  primary: (
                    l10n.actionResume,
                    () => setState(() => _paused = false),
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
    const label = TextStyle(fontSize: 10, color: Palette.neutral500);
    Widget stat(String name, String value, {Color? color}) => Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(name.toUpperCase(), style: label),
        Text(
          value,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: color,
          ),
        ),
      ],
    );

    return Row(
      children: [
        Expanded(
          child: stat(
            l10n.statTier,
            difficulty.label(l10n).toUpperCase(),
            color: Palette.accent300,
          ),
        ),
        Expanded(child: stat(l10n.statTime, formatTime(elapsedSeconds))),
        Expanded(
          child: stat(
            l10n.statMistakes,
            '$mistakeCount/$maxMistakes',
            color: mistakeCount > 0 ? Palette.error : null,
          ),
        ),
        Expanded(
          child: stat(l10n.statCombo, '×$combo', color: Palette.accent300),
        ),
        IconButton(
          tooltip: l10n.hudPause,
          onPressed: onPause,
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
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        border: Border.all(color: Palette.error),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              message,
              style: const TextStyle(color: Palette.error, fontSize: 12),
            ),
          ),
          if (actionLabel != null)
            TextButton(onPressed: onAction, child: Text(actionLabel!)),
        ],
      ),
    );
  }
}

class _OverlayCard extends StatelessWidget {
  const _OverlayCard({
    required this.badge,
    required this.title,
    required this.titleColor,
    required this.stats,
    required this.secondary,
    required this.primary,
  });

  final String badge;
  final String title;
  final Color titleColor;
  final Map<String, String> stats;
  final (String, VoidCallback) secondary;
  final (String, VoidCallback) primary;

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: ColoredBox(
        color: const Color(0xB3000000),
        child: Center(
          child: Container(
            margin: const EdgeInsets.all(24),
            padding: const EdgeInsets.all(20),
            constraints: const BoxConstraints(maxWidth: 420),
            decoration: BoxDecoration(
              color: Palette.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Palette.divider),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              spacing: 16,
              children: [
                Text(
                  badge,
                  style: const TextStyle(
                    fontSize: 10,
                    color: Palette.neutral500,
                  ),
                ),
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                    color: titleColor,
                  ),
                ),
                Row(
                  children: [
                    for (final entry in stats.entries)
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              entry.key.toUpperCase(),
                              style: const TextStyle(
                                fontSize: 10,
                                color: Palette.neutral500,
                              ),
                            ),
                            Text(
                              entry.value,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
                OverflowBar(
                  alignment: MainAxisAlignment.end,
                  spacing: 8,
                  overflowSpacing: 8,
                  overflowAlignment: OverflowBarAlignment.end,
                  children: [
                    TextButton(
                      onPressed: secondary.$2,
                      child: Text(secondary.$1.toUpperCase()),
                    ),
                    FilledButton(
                      onPressed: primary.$2,
                      child: Text(primary.$1.toUpperCase()),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Centered extends StatelessWidget {
  const _Centered({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          spacing: 16,
          children: children,
        ),
      ),
    );
  }
}
