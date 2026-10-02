import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sudoku2077/core/theme.dart';
import 'package:sudoku2077/features/menu/boot_text.dart';

Widget host({required bool reduceMotion}) => MaterialApp(
  theme: buildTheme(Palette.night),
  home: MediaQuery(
    data: MediaQueryData(disableAnimations: reduceMotion),
    child: const Scaffold(
      body: BootText(lines: ['System online', 'Grid integrity: OK']),
    ),
  ),
);

const full = '> SYSTEM ONLINE\n> GRID INTEGRITY: OK';

String typed(WidgetTester tester) =>
    tester.widget<Text>(find.byKey(const ValueKey('boot-typed'))).data!;

void main() {
  testWidgets('types the lines in over about 600 ms', (tester) async {
    await tester.pumpWidget(host(reduceMotion: false));
    expect(typed(tester), isNot(full));
    await tester.pump(const Duration(milliseconds: 650));
    expect(typed(tester), full);
  });

  testWidgets('a tap skips the typing', (tester) async {
    await tester.pumpWidget(host(reduceMotion: false));
    await tester.tap(find.byType(BootText));
    await tester.pump();
    expect(typed(tester), full);
  });

  testWidgets('reduced motion shows the lines at once', (tester) async {
    await tester.pumpWidget(host(reduceMotion: true));
    expect(typed(tester), full);
  });
}
