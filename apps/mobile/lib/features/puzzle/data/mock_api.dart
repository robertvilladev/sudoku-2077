import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import '../../../domain/sudoku.dart';

const mockSolution =
    '534678912672195348198342567859761423426853791713924856961537284287419635345286179';
const mockGivens =
    '530070000600195000098000060800060003400803001700020006060000280000419005000080079';

/// EASY in mock mode is the solution with three cells blanked, so the win flow is three taps away.
final String mockNearlySolvedGivens = gridToString(
  List.of(parseGrid(mockSolution))
    ..[0] = 0
    ..[40] = 0
    ..[80] = 0,
);

/// Stand-in for `apps/api` behind `--dart-define=USE_MOCK_API=true`, so the loop runs with no backend.
http.Client mockHttpClient({
  Duration latency = const Duration(milliseconds: 400),
}) {
  return MockClient((request) async {
    if (latency > Duration.zero) await Future<void>.delayed(latency);
    final path = request.url.path;

    if (request.method == 'GET' && path == '/api/puzzles') {
      final difficulty = Difficulty.fromWire(
        (request.url.queryParameters['difficulty'] ?? '').toUpperCase(),
      );
      final givens = difficulty == Difficulty.easy
          ? mockNearlySolvedGivens
          : mockGivens;
      return _json({
        'id': 'mock-${difficulty.name}',
        'givens': givens,
        'difficulty': difficulty.wireName,
        'difficultyScore': 0,
        'givensCount': givens.split('').where((c) => c != '0').length,
        'createdAt': '2026-01-01T00:00:00.000Z',
      });
    }

    final validate = RegExp(r'^/api/puzzles/[^/]+/validate$');
    if (request.method == 'POST' && validate.hasMatch(path)) {
      final board =
          (jsonDecode(request.body) as Map<String, Object?>)['board'] as String;
      return _json({
        'correct': board == mockSolution,
        'completed': !board.contains('0'),
      });
    }

    return _json({'error': 'Not found'}, status: 404);
  });
}

http.Response _json(Object body, {int status = 200}) => http.Response(
  jsonEncode(body),
  status,
  headers: {'content-type': 'application/json'},
);
