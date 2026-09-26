import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sudoku2077/app.dart';
import 'package:sudoku2077/core/config.dart';
import 'package:sudoku2077/features/puzzle/data/api_client.dart';
import 'package:sudoku2077/features/puzzle/data/mock_api.dart';

Widget app() => SudokuApp(
  apiClient: ApiClient(
    httpClient: mockHttpClient(latency: const Duration(milliseconds: 100)),
    baseUrl: 'http://mock.local',
  ),
);

Future<void> openBoard(WidgetTester tester, String tier) async {
  // A 360×780 phone, so the whole board fits without scrolling.
  tester.view
    ..physicalSize = const Size(1080, 2340)
    ..devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(app());
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
}
