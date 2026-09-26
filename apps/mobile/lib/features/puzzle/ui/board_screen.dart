import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/theme.dart';
import '../../../domain/sudoku.dart';
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
  String? _loadError;

  Timer? _ticker;
  int _elapsedSeconds = 0;
  bool _paused = false;

  String? _validatedBoard;
  bool _validating = false;
  ValidatePuzzleResponse? _validateResult;
  String? _validateError;

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
      if (mounted) setState(() => _loadError = e.message);
    } on FormatException catch (e) {
      if (mounted) {
        setState(() => _loadError = 'Bad server response: ${e.message}');
      }
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
      _validateError = null;
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
      if (mounted) {
        setState(
          () => _validateError =
              "Couldn't verify your solution — check your connection.",
        );
      }
    } finally {
      if (mounted) setState(() => _validating = false);
    }
  }

  Future<bool> _confirmQuit() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('ABORT RUN?'),
        content: const Text(
          'Quit to menu? Progress on this puzzle is not saved yet.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('STAY'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('QUIT'),
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
    if (_loadError != null) {
      return _Centered(
        children: [
          const Text('CONNECTION LOST', style: TextStyle(fontSize: 20)),
          Text(
            _loadError!,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Palette.neutral500),
          ),
          FilledButton(onPressed: _load, child: const Text('RETRY')),
          TextButton(onPressed: _toMenu, child: const Text('MENU')),
        ],
      );
    }
    if (board == null) {
      return const _Centered(
        children: [
          CircularProgressIndicator(),
          Text('DECRYPTING GRID…', style: TextStyle(fontSize: 18)),
          Text(
            'First load can take up to a minute while the server wakes up.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Palette.neutral500, fontSize: 12),
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
                        if (_validateError != null)
                          _Banner(
                            message: _validateError!,
                            actionLabel: 'RETRY',
                            onAction: _validate,
                          ),
                        if (showIncorrect)
                          const _Banner(
                            message: 'Grid full, but the checksum failed. Keep hunting.',
                          ),
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
                  badge: 'PUZZLE_CLEARED',
                  title: 'GRID DECRYPTED',
                  titleColor: Palette.win,
                  stats: {
                    'TIME': formatTime(_elapsedSeconds),
                    'MISTAKES': '${board.mistakeCount}',
                    'MAX COMBO': '×${board.maxCombo}',
                  },
                  secondary: ('MENU', _toMenu),
                  primary: ('NEXT PUZZLE', _nextPuzzle),
                )
              else if (board.isGameOver)
                _OverlayCard(
                  badge: 'PUZZLE_FAILED',
                  title: 'GRID CORRUPTED',
                  titleColor: Palette.error,
                  stats: {
                    'TIME': formatTime(_elapsedSeconds),
                    'DIFFICULTY': widget.difficulty.wireName,
                  },
                  secondary: ('MENU', _toMenu),
                  primary: ('RETRY', _nextPuzzle),
                )
              else if (_paused)
                _OverlayCard(
                  badge: 'SYSTEM_PAUSED',
                  title: 'SYSTEM PAUSED',
                  titleColor: Palette.text,
                  stats: {'TIME': formatTime(_elapsedSeconds)},
                  secondary: (
                    'QUIT TO MENU',
                    () async {
                      if (await _confirmQuit()) _toMenu();
                    },
                  ),
                  primary: ('RESUME', () => setState(() => _paused = false)),
                ),
            ],
          );
        },
      ),
    );
  }
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
    const label = TextStyle(fontSize: 10, color: Palette.neutral500);
    Widget stat(String name, String value, {Color? color}) => Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(name, style: label),
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
          child: stat('TIER', difficulty.wireName, color: Palette.accent300),
        ),
        Expanded(child: stat('TIME', formatTime(elapsedSeconds))),
        Expanded(
          child: stat(
            'MISTAKES',
            '$mistakeCount/$maxMistakes',
            color: mistakeCount > 0 ? Palette.error : null,
          ),
        ),
        Expanded(child: stat('COMBO', '×$combo', color: Palette.accent300)),
        IconButton(
          tooltip: 'Pause',
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
                              entry.key,
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
                      child: Text(secondary.$1),
                    ),
                    FilledButton(
                      onPressed: primary.$2,
                      child: Text(primary.$1),
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
