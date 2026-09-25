// Hand-written mirrors of `@sudoku-2077/api-types`. Keep in sync with packages/api-types/src/index.ts.
import '../../../domain/sudoku.dart';

class PublicPuzzle {
  const PublicPuzzle({
    required this.id,
    required this.givens,
    required this.difficulty,
    required this.difficultyScore,
    required this.givensCount,
  });

  final String id;
  final String givens;
  final Difficulty difficulty;
  final int difficultyScore;
  final int givensCount;

  factory PublicPuzzle.fromJson(Object? json) {
    final map = _asMap(json);
    final givens = _field<String>(map, 'givens');
    parseGrid(givens);
    return PublicPuzzle(
      id: _field<String>(map, 'id'),
      givens: givens,
      difficulty: Difficulty.fromWire(_field<String>(map, 'difficulty')),
      difficultyScore: _field<int>(map, 'difficultyScore'),
      givensCount: _field<int>(map, 'givensCount'),
    );
  }
}

class ValidatePuzzleRequest {
  const ValidatePuzzleRequest({
    required this.board,
    this.timeSeconds,
    this.mistakeCount,
    this.maxCombo,
  });

  final String board;
  final int? timeSeconds;
  final int? mistakeCount;
  final int? maxCombo;

  Map<String, Object> toJson() => {
    'board': board,
    'timeSeconds': ?timeSeconds,
    'mistakeCount': ?mistakeCount,
    'maxCombo': ?maxCombo,
  };
}

class ValidatePuzzleResponse {
  const ValidatePuzzleResponse({
    required this.correct,
    required this.completed,
  });

  final bool correct;
  final bool completed;

  factory ValidatePuzzleResponse.fromJson(Object? json) {
    final map = _asMap(json);
    return ValidatePuzzleResponse(
      correct: _field<bool>(map, 'correct'),
      completed: _field<bool>(map, 'completed'),
    );
  }
}

Map<String, Object?> _asMap(Object? json) {
  if (json is Map<String, Object?>) return json;
  throw const FormatException('Expected a JSON object');
}

T _field<T>(Map<String, Object?> map, String key) {
  final value = map[key];
  if (value is T) return value;
  throw FormatException('Field "$key" missing or not a $T');
}
