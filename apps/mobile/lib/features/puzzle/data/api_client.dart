import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../../domain/sudoku.dart';
import 'puzzle_dto.dart';

class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => 'ApiException($statusCode): $message';
}

/// Talks to the existing `apps/api` backend — the Dart counterpart of `apps/web/src/lib/apiClient.ts`.
class ApiClient {
  ApiClient({
    required http.Client httpClient,
    required String baseUrl,
    // Render's free tier sleeps after ~15 min idle; a cold start can take tens of seconds.
    this.timeout = const Duration(seconds: 60),
  }) : _http = httpClient,
       _baseUri = Uri.parse(baseUrl);

  final http.Client _http;
  final Uri _baseUri;
  final Duration timeout;

  Future<PublicPuzzle> getRandomPuzzle(Difficulty difficulty) async {
    final json = await _get(
      '/api/puzzles',
      query: {'difficulty': difficulty.wireName.toLowerCase()},
    );
    return PublicPuzzle.fromJson(json);
  }

  /// Never retried automatically: a completion is recorded server-side on a correct solve.
  Future<ValidatePuzzleResponse> validate(
    String puzzleId,
    ValidatePuzzleRequest request,
  ) async {
    final response = await _send(
      () => _http.post(
        _uri('/api/puzzles/${Uri.encodeComponent(puzzleId)}/validate'),
        headers: const {'Content-Type': 'application/json'},
        body: jsonEncode(request.toJson()),
      ),
    );
    return ValidatePuzzleResponse.fromJson(_decode(response));
  }

  Future<Object?> _get(String path, {Map<String, String>? query}) async {
    final uri = _uri(path, query);
    http.Response response;
    try {
      response = await _send(() => _http.get(uri));
    } on ApiException catch (e) {
      if (e.statusCode != null) rethrow;
      // Idempotent GET: one retry covers a request that raced a cold start.
      response = await _send(() => _http.get(uri));
    }
    return _decode(response);
  }

  Uri _uri(String path, [Map<String, String>? query]) =>
      _baseUri.replace(path: path, queryParameters: query);

  Future<http.Response> _send(Future<http.Response> Function() request) async {
    try {
      return await request().timeout(timeout);
    } on TimeoutException {
      throw const ApiException('The server took too long to respond.');
    } on http.ClientException catch (e) {
      throw ApiException('Network error: ${e.message}');
    }
  }

  Object? _decode(http.Response response) {
    Object? body;
    try {
      body = jsonDecode(response.body);
    } on FormatException {
      body = null;
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final error = body is Map && body['error'] is String
          ? body['error'] as String
          : 'Request failed';
      throw ApiException(error, statusCode: response.statusCode);
    }
    return body;
  }
}
