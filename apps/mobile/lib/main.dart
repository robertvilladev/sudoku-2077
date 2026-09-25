import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;

import 'app.dart';
import 'core/config.dart';
import 'core/sfx_audioplayers.dart';
import 'features/puzzle/data/api_client.dart';
import 'features/puzzle/data/mock_api.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  LicenseRegistry.addLicense(() async* {
    for (final family in ['Oxanium', 'Orbitron']) {
      yield LicenseEntryWithLineBreaks([
        family,
      ], await rootBundle.loadString('assets/fonts/OFL-$family.txt'));
    }
  });

  final apiClient = ApiClient(
    httpClient: useMockApi ? mockHttpClient() : http.Client(),
    baseUrl: useMockApi ? 'http://mock.local' : apiBaseUrl,
  );
  final sfx = AudioplayersSfxPlayer()..preload();
  runApp(SudokuApp(apiClient: apiClient, sfx: sfx));
}
