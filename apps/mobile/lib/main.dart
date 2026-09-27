import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'app.dart';
import 'core/appearance_controller.dart';
import 'core/config.dart';
import 'core/locale_controller.dart';
import 'features/puzzle/data/api_client.dart';
import 'features/puzzle/data/mock_api.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  final apiClient = ApiClient(
    httpClient: useMockApi ? mockHttpClient() : http.Client(),
    baseUrl: useMockApi ? 'http://mock.local' : apiBaseUrl,
  );
  runApp(
    SudokuApp(
      apiClient: apiClient,
      localeController: LocaleController(prefs),
      appearanceController: AppearanceController(prefs),
    ),
  );
}
