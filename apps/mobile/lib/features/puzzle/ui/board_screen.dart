import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../../core/settings_state.dart';
import '../../../core/sfx.dart';
import '../../../core/signal_button.dart';
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

  int? _heardCompletionId;

  void _onBoardChanged() {
    final board = _board!;
    _reactToCompletion(board);
    // Keyed on the board string so a complete-but-wrong board is re-checked once edited.
    if (board.isComplete &&
        board.boardString != _validatedBoard &&
        !_validating) {
      _validate();
    }
  }

  /// Sound, haptic and screen-reader announcement for a new unit-complete event. The board never
  /// raises one on the winning move, so the win flow plays alone.
  void _reactToCompletion(BoardState board) {
    final completion = board.lastCompletion;
    if (completion == null || completion.id == _heardCompletionId) return;
    _heardCompletionId = completion.id;
    final settings = context.read<SettingsState>();
    if (settings.sound) {
      context.read<SfxPlayer>().play(Sfx.unitChirp(completion.units.length));
    }
    if (settings.haptics) HapticFeedback.lightImpact();
    SemanticsService.sendAnnouncement(
      View.of(context),
      completion.units.map((u) => u.announcement).join(', '),
      TextDirection.ltr,
    );
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
          SignalButton(label: 'RETRY', onPressed: _load),
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
                          sectors: board.securedBoxes.length,
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
                        _EventLine(event: board.lastEvent),
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
                  extra: const _SettingsPanel(),
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
    required this.sectors,
    required this.onPause,
  });

  final Difficulty difficulty;
  final int elapsedSeconds;
  final int mistakeCount;
  final int combo;
  final int sectors;
  final VoidCallback onPause;

  @override
  Widget build(BuildContext context) {
    const label = TextStyle(
      fontSize: 10,
      letterSpacing: 1,
      color: Palette.neutral500,
    );
    Widget stat(String name, String value, {Color? color}) => Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(name, style: label),
        Text(
          value,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            fontFeatures: tabularFigures,
            color: color,
          ),
        ),
      ],
    );

    return Column(
      spacing: 6,
      children: [
        Row(
          children: [
            Expanded(
              child: Text.rich(
                TextSpan(
                  children: [
                    TextSpan(text: difficulty.wireName),
                    TextSpan(
                      text: '  // ${difficulty.flavor}',
                      style: const TextStyle(
                        color: Palette.neutral500,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontFamily: displayFont,
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.2,
                  color: Palette.accent300,
                ),
              ),
            ),
            IconButton(
              tooltip: 'Pause',
              onPressed: onPause,
              visualDensity: VisualDensity.compact,
              icon: const Icon(Icons.pause),
            ),
          ],
        ),
        Row(
          children: [
            Expanded(child: stat('TIME', formatTime(elapsedSeconds))),
            Expanded(
              child: stat(
                'MISTAKES',
                '$mistakeCount/$maxMistakes',
                color: mistakeCount > 0 ? Palette.error : null,
              ),
            ),
            Expanded(child: stat('COMBO', '×$combo', color: Palette.signal)),
            Expanded(
              child: Semantics(
                label: 'Sectors secured $sectors of 9',
                excludeSemantics: true,
                child: stat('SECTORS', '$sectors/9', color: Palette.signal),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

/// The yellow log line under the board (D11): what the last move did.
class _EventLine extends StatelessWidget {
  const _EventLine({required this.event});

  final BoardEvent? event;

  static String _cell(int index) => 'R${index ~/ 9 + 1}C${index % 9 + 1}';

  @override
  Widget build(BuildContext context) {
    final e = event;
    final text = switch (e?.kind) {
      null => 'GRID ONLINE · SELECT A CELL',
      BoardEventKind.placed => '${_cell(e!.index)} <- ${e.value}',
      BoardEventKind.clash => 'CLASH AT ${_cell(e!.index)}',
      BoardEventKind.erased => 'ERASED ${_cell(e!.index)}',
      BoardEventKind.completed =>
        '${e!.units.map((u) => u.label).join(' + ')} COMPLETE',
      BoardEventKind.gridFull => 'GRID COMPLETE · SENT FOR VALIDATION',
      BoardEventKind.undo => 'UNDO',
    };
    return ExcludeSemantics(
      child: SizedBox(
        height: 16,
        width: double.infinity,
        child: Text(
          text,
          key: const ValueKey('event-line'),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 12,
            height: 1.3,
            letterSpacing: 1.2,
            fontWeight: FontWeight.w500,
            fontFeatures: tabularFigures,
            color: e?.kind == BoardEventKind.clash
                ? Palette.error
                : Palette.signal,
          ),
        ),
      ),
    );
  }
}

/// Effects / sound / haptics toggles, shown in the pause overlay. In memory only for now.
class _SettingsPanel extends StatelessWidget {
  const _SettingsPanel();

  @override
  Widget build(BuildContext context) {
    final settings = context.watch<SettingsState>();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _SettingRow(
          id: 'effects',
          label: 'EFFECTS',
          hint: 'Sweep, pulse, brackets',
          value: settings.effects,
          onChanged: (v) => settings.effects = v,
        ),
        _SettingRow(
          id: 'sound',
          label: 'SOUND',
          value: settings.sound,
          onChanged: (v) => settings.sound = v,
        ),
        _SettingRow(
          id: 'haptics',
          label: 'HAPTICS',
          value: settings.haptics,
          onChanged: (v) => settings.haptics = v,
        ),
      ],
    );
  }
}

class _SettingRow extends StatelessWidget {
  const _SettingRow({
    required this.id,
    required this.label,
    required this.value,
    required this.onChanged,
    this.hint,
  });

  final String id;
  final String label;
  final String? hint;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      toggled: value,
      label: label.toLowerCase(),
      excludeSemantics: true,
      child: InkWell(
        key: ValueKey('setting-$id'),
        onTap: () => onChanged(!value),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: const TextStyle(
                        fontSize: 13,
                        letterSpacing: 1.2,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    if (hint != null)
                      Text(
                        hint!,
                        style: const TextStyle(
                          fontSize: 11,
                          color: Palette.neutral500,
                        ),
                      ),
                  ],
                ),
              ),
              Container(
                width: 52,
                padding: const EdgeInsets.symmetric(vertical: 4),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: value ? Palette.accent900 : null,
                  border: Border.all(
                    color: value ? Palette.accent : Palette.neutral700,
                  ),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  value ? 'ON' : 'OFF',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.2,
                    color: value ? Palette.accent300 : Palette.neutral500,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
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
    this.extra,
  });

  final String badge;
  final String title;
  final Color titleColor;
  final Map<String, String> stats;
  final (String, VoidCallback) secondary;
  final (String, VoidCallback) primary;
  final Widget? extra;

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
                  '// $badge',
                  style: const TextStyle(
                    fontSize: 11,
                    letterSpacing: 1.2,
                    color: Palette.signal,
                  ),
                ),
                Text(
                  title,
                  style: TextStyle(
                    fontFamily: displayFont,
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.4,
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
                                fontFeatures: tabularFigures,
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
                ?extra,
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
                    SignalButton(label: primary.$1, onPressed: primary.$2),
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
