import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import 'app.dart';
import 'core/config.dart';
import 'features/puzzle/data/api_client.dart';
import 'features/puzzle/data/mock_api.dart';

void main() {
  final apiClient = ApiClient(
    httpClient: useMockApi ? mockHttpClient() : http.Client(),
    baseUrl: useMockApi ? 'http://mock.local' : apiBaseUrl,
  );
  runApp(SudokuApp(apiClient: apiClient));
}
