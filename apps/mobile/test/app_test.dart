import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sudoku2077/app.dart';
import 'package:sudoku2077/core/config.dart';
import 'package:sudoku2077/core/sfx.dart';
import 'package:sudoku2077/features/puzzle/data/api_client.dart';
import 'package:sudoku2077/features/puzzle/data/mock_api.dart';

Widget app({SfxPlayer sfx = const NoopSfxPlayer()}) => SudokuApp(
  apiClient: ApiClient(
    httpClient: mockHttpClient(latency: const Duration(milliseconds: 100)),
    baseUrl: 'http://mock.local',
  ),
  sfx: sfx,
);

class FakeSfxPlayer implements SfxPlayer {
  final played = <Sfx>[];

  @override
  Future<void> preload() async {}

  @override
  void play(Sfx sfx) => played.add(sfx);

  @override
  Future<void> dispose() async {}
}

/// Records `HapticFeedback` calls on the platform channel.
List<String> recordHaptics(WidgetTester tester) {
  final calls = <String>[];
  tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
    SystemChannels.platform,
    (call) async {
      if (call.method == 'HapticFeedback.vibrate') {
        calls.add(call.arguments as String);
      }
      return null;
    },
  );
  addTearDown(
    () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
      SystemChannels.platform,
      null,
    ),
  );
  return calls;
}

String eventLine(WidgetTester tester) =>
    tester.widget<Text>(find.byKey(const ValueKey('event-line'))).data!;

Future<void> openBoard(
  WidgetTester tester,
  String tier, {
  SfxPlayer sfx = const NoopSfxPlayer(),
}) async {
  // A 360×780 phone, so the whole board fits without scrolling.
  tester.view
    ..physicalSize = const Size(1080, 2340)
    ..devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(app(sfx: sfx));
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

  testWidgets('a completing move shows the event line and bumps SECTORS', (
    tester,
  ) async {
    await openBoard(tester, 'EASY');
    expect(find.text('6/9'), findsOneWidget);

    await place(tester, 40, 5);
    expect(eventLine(tester), 'ROW 5 + COL 5 + SECTOR 5 COMPLETE');
    expect(find.text('7/9'), findsOneWidget);
    await tester.pump(const Duration(milliseconds: 600)); // let the ring finish

    await tester.tap(find.text('UNDO'));
    await tester.pump();
    expect(eventLine(tester), 'UNDO');
    expect(find.text('6/9'), findsOneWidget);
  });

  testWidgets('sound and haptics follow the pause-menu settings', (
    tester,
  ) async {
    final sfx = FakeSfxPlayer();
    final haptics = recordHaptics(tester);
    await openBoard(tester, 'EASY', sfx: sfx);

    await place(tester, 40, 5); // row + column + box: the three-blip chirp
    expect(sfx.played, [Sfx.unitChirp3]);
    expect(haptics, ['HapticFeedbackType.lightImpact']);
    await tester.pump(const Duration(milliseconds: 600));

    await tester.tap(find.byTooltip('Pause'));
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('setting-sound')));
    await tester.tap(find.byKey(const ValueKey('setting-haptics')));
    await tester.pump();
    expect(find.text('OFF'), findsNWidgets(2));
    await tester.tap(find.text('RESUME'));
    await tester.pump();

    await place(tester, 0, 5); // completes row 1, column 1 and box 1
    expect(eventLine(tester), 'ROW 1 + COL 1 + SECTOR 1 COMPLETE');
    expect(sfx.played, [Sfx.unitChirp3]);
    expect(haptics, hasLength(1));
    await tester.pump(const Duration(milliseconds: 600));
  });

  testWidgets('the winning move plays no chirp', (tester) async {
    final sfx = FakeSfxPlayer();
    await openBoard(tester, 'EASY', sfx: sfx);
    await place(tester, 0, 5);
    await place(tester, 40, 5);
    expect(sfx.played, hasLength(2));
    await place(tester, 80, 9);
    expect(sfx.played, hasLength(2));
    expect(eventLine(tester), 'GRID COMPLETE · SENT FOR VALIDATION');
    await tester.pump(const Duration(milliseconds: 600));
  });

  testWidgets('reduced motion still completes, with the short fade', (
    tester,
  ) async {
    tester.platformDispatcher.accessibilityFeaturesTestValue =
        const FakeAccessibilityFeatures(disableAnimations: true);
    addTearDown(tester.platformDispatcher.clearAccessibilityFeaturesTestValue);
    await openBoard(tester, 'EASY');
    await place(tester, 40, 5);
    expect(eventLine(tester), 'ROW 5 + COL 5 + SECTOR 5 COMPLETE');
    expect(find.text('7/9'), findsOneWidget);
    await tester.pump(const Duration(milliseconds: 500));
    expect(tester.hasRunningAnimations, isFalse);
  });

  test('apiBaseUrl defaults to the Android emulator host alias', () {
    expect(apiBaseUrl, 'http://10.0.2.2:3000');
    expect(useMockApi, isFalse);
  });
}
