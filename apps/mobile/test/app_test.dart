import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sudoku2077/app.dart';
import 'package:sudoku2077/core/config.dart';
import 'package:sudoku2077/core/locale_controller.dart';
import 'package:sudoku2077/features/puzzle/data/api_client.dart';
import 'package:sudoku2077/features/puzzle/data/mock_api.dart';

/// A phone that has already been through the first-launch language screen, unless [prefs] says
/// otherwise.
Future<Widget> app({
  Map<String, Object> prefs = const {'languageChosen': true},
}) async {
  SharedPreferences.setMockInitialValues(prefs);
  return SudokuApp(
    apiClient: ApiClient(
      httpClient: mockHttpClient(latency: const Duration(milliseconds: 100)),
      baseUrl: 'http://mock.local',
    ),
    localeController: LocaleController(await SharedPreferences.getInstance()),
  );
}

void usePhoneSize(WidgetTester tester) {
  // A 360×780 phone, so the whole board fits without scrolling.
  tester.view
    ..physicalSize = const Size(1080, 2340)
    ..devicePixelRatio = 3;
  addTearDown(tester.view.reset);
}

Future<void> openBoard(WidgetTester tester, String tier) async {
  usePhoneSize(tester);
  await tester.pumpWidget(await app());
  await tester.tap(find.text('PLAY'));
  await tester.pumpAndSettle();
  await tester.tap(find.text(tier));
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 50));
  expect(find.text('DECRYPTING GRID…'), findsOneWidget);
  await tester.pump(const Duration(milliseconds: 500));
  await tester.pumpAndSettle();
}

Future<void> place(WidgetTester tester, int index, int digit) async {
  await tester.tap(find.byKey(ValueKey('cell-$index')));
  await tester.pump();
  await tester.tap(find.byKey(ValueKey('digit-$digit')));
  await tester.pump();
}

void main() {
  testWidgets('title → difficulty → board → win dialog → next puzzle', (
    tester,
  ) async {
    await openBoard(tester, 'EASY');
    expect(find.text('MISTAKES'), findsOneWidget);

    await place(tester, 0, 5);
    await place(tester, 40, 5);
    await place(tester, 80, 9);
    await tester.pump(const Duration(milliseconds: 150));
    await tester.pump();

    expect(find.text('GRID DECRYPTED'), findsOneWidget);
    expect(find.text('×3'), findsWidgets);

    await tester.tap(find.text('NEXT PUZZLE'));
    await tester.pump(const Duration(milliseconds: 400));
    await tester.pumpAndSettle();
    expect(find.text('GRID DECRYPTED'), findsNothing);
    expect(find.text('MISTAKES'), findsOneWidget);
  });

  testWidgets(
    'three peer conflicts show the lose dialog; MENU returns to title',
    (tester) async {
      await openBoard(tester, 'HARD');

      // mockGivens row 0 is "530070000": a 5 anywhere else in the row conflicts with the given.
      await place(tester, 2, 5);
      await place(tester, 3, 5);
      await place(tester, 5, 5);

      expect(find.text('GRID CORRUPTED'), findsOneWidget);
      await tester.tap(find.text('MENU'));
      await tester.pumpAndSettle();
      expect(find.text('PLAY'), findsOneWidget);
    },
  );

  testWidgets('back during a run asks for confirmation', (tester) async {
    await openBoard(tester, 'MEDIUM');
    await tester.binding.handlePopRoute(); // Android system back
    await tester.pumpAndSettle();
    expect(find.text('ABORT RUN?'), findsOneWidget);
    await tester.tap(find.text('QUIT'));
    await tester.pumpAndSettle();
    expect(find.text('SELECT DIFFICULTY'), findsOneWidget);
  });

  test('apiBaseUrl defaults to the Android emulator host alias', () {
    expect(apiBaseUrl, 'http://10.0.2.2:3000');
    expect(useMockApi, isFalse);
  });

  testWidgets('first launch asks for a language, then remembers it', (
    tester,
  ) async {
    usePhoneSize(tester);
    await tester.pumpWidget(await app(prefs: {}));
    await tester.pumpAndSettle();

    expect(find.text('SELECT LANGUAGE'), findsOneWidget);
    expect(find.text('PLAY'), findsNothing);

    await tester.tap(find.text('Español'));
    await tester.pumpAndSettle();
    expect(find.text('ELIGE IDIOMA'), findsOneWidget); // applied live

    await tester.tap(find.text('CONFIRMAR'));
    await tester.pumpAndSettle();
    expect(find.text('JUGAR'), findsOneWidget);

    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getString('locale'), 'es');
    expect(prefs.getBool('languageChosen'), isTrue);
  });

  testWidgets('a stored language skips the picker', (tester) async {
    usePhoneSize(tester);
    await tester.pumpWidget(
      await app(prefs: {'languageChosen': true, 'locale': 'ca'}),
    );
    await tester.pumpAndSettle();
    expect(find.text('JUGAR'), findsOneWidget);
    expect(find.text('OPCIONS'), findsOneWidget);
  });

  testWidgets('OPTIONS changes the language right away', (tester) async {
    usePhoneSize(tester);
    await tester.pumpWidget(await app());
    await tester.pumpAndSettle();

    await tester.tap(find.text('OPTIONS'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Français'));
    await tester.pumpAndSettle();
    expect(find.text('LANGUE'), findsOneWidget);

    await tester.binding.handlePopRoute(); // Android system back
    await tester.pumpAndSettle();
    expect(find.text('JOUER'), findsOneWidget);
  });
}
