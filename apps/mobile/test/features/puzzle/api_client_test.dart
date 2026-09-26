import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sudoku2077/domain/sudoku.dart';
import 'package:sudoku2077/features/puzzle/data/api_client.dart';
import 'package:sudoku2077/features/puzzle/data/mock_api.dart';
import 'package:sudoku2077/features/puzzle/data/puzzle_dto.dart';

Map<String, Object> puzzleJson({String givens = mockGivens}) => {
  'id': 'p1',
  'givens': givens,
  'difficulty': 'HARD',
  'difficultyScore': 420,
  'givensCount': 30,
  'createdAt': '2026-09-01T00:00:00.000Z',
};

ApiClient clientFor(
  MockClientHandler handler, {
  Duration timeout = const Duration(seconds: 5),
}) => ApiClient(
  httpClient: MockClient(handler),
  baseUrl: 'https://api.example.com',
  timeout: timeout,
);

void main() {
  test(
    'getRandomPuzzle hits /api/puzzles with the tier and parses the DTO',
    () async {
      late Uri requested;
      final client = clientFor((request) async {
        requested = request.url;
        return http.Response(jsonEncode(puzzleJson()), 200);
      });

      final puzzle = await client.getRandomPuzzle(Difficulty.hard);

      expect(
        requested.toString(),
        'https://api.example.com/api/puzzles?difficulty=hard',
      );
      expect(puzzle.id, 'p1');
      expect(puzzle.difficulty, Difficulty.hard);
      expect(puzzle.givens, mockGivens);
    },
  );

  test('validate posts the board and stats as JSON', () async {
    late http.Request sent;
    final client = clientFor((request) async {
      sent = request;
      return http.Response(
        jsonEncode({'correct': true, 'completed': true}),
        200,
      );
    });

    final result = await client.validate(
      'p1',
      const ValidatePuzzleRequest(
        board: mockSolution,
        timeSeconds: 90,
        mistakeCount: 1,
        maxCombo: 7,
      ),
    );

    expect(sent.method, 'POST');
    expect(sent.url.path, '/api/puzzles/p1/validate');
    expect(sent.headers['Content-Type'], startsWith('application/json'));
    expect(jsonDecode(sent.body), {
      'board': mockSolution,
      'timeSeconds': 90,
      'mistakeCount': 1,
      'maxCombo': 7,
    });
    expect(result.correct, isTrue);
  });

  test('omits optional stats that are not set', () {
    expect(const ValidatePuzzleRequest(board: mockSolution).toJson(), {
      'board': mockSolution,
    });
  });

  test('error responses surface the server error message and status', () async {
    final client = clientFor(
      (_) async =>
          http.Response(jsonEncode({'error': 'No puzzles available'}), 503),
    );
    expect(
      client.getRandomPuzzle(Difficulty.easy),
      throwsA(
        isA<ApiException>()
            .having((e) => e.statusCode, 'statusCode', 503)
            .having((e) => e.message, 'message', 'No puzzles available'),
      ),
    );
  });

  test('a response that breaks the contract is rejected', () async {
    final client = clientFor(
      (_) async => http.Response(jsonEncode(puzzleJson(givens: '123')), 200),
    );
    expect(client.getRandomPuzzle(Difficulty.easy), throwsFormatException);
  });

  test('a timed-out GET is retried once', () async {
    var calls = 0;
    final client = clientFor((_) async {
      calls++;
      if (calls == 1) return Completer<http.Response>().future;
      return http.Response(jsonEncode(puzzleJson()), 200);
    }, timeout: const Duration(milliseconds: 50));

    await client.getRandomPuzzle(Difficulty.hard);
    expect(calls, 2);
  });

  test('a timed-out validate is never retried', () async {
    var calls = 0;
    final client = clientFor((_) {
      calls++;
      return Completer<http.Response>().future;
    }, timeout: const Duration(milliseconds: 50));

    await expectLater(
      client.validate('p1', const ValidatePuzzleRequest(board: mockSolution)),
      throwsA(isA<ApiException>()),
    );
    expect(calls, 1);
  });
}
