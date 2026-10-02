import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sudoku2077/core/theme.dart';
import 'package:sudoku2077/features/puzzle/ui/decrypt_loader.dart';
import 'package:sudoku2077/l10n/l10n.dart';

Widget host({bool reduceMotion = false}) => MaterialApp(
  theme: buildTheme(Palette.night),
  localizationsDelegates: AppLocalizations.localizationsDelegates,
  supportedLocales: AppLocalizations.supportedLocales,
  home: MediaQuery(
    data: MediaQueryData(disableAnimations: reduceMotion),
    child: const Scaffold(body: DecryptLoader()),
  ),
);

double hintOpacity(WidgetTester tester) => tester
    .widget<AnimatedOpacity>(find.byKey(const ValueKey('cold-start-hint')))
    .opacity;

void main() {
  testWidgets('the cold-start hint only appears after 3 s', (tester) async {
    await tester.pumpWidget(host());
    await tester.pump();
    expect(find.text('DECRYPTING GRID…'), findsOneWidget);
    expect(hintOpacity(tester), 0);

    await tester.pump(const Duration(seconds: 3));
    expect(hintOpacity(tester), 1);
    await tester.pumpWidget(const SizedBox()); // disposes the timers
  });

  testWidgets('reduced motion still shows the hint after 3 s', (tester) async {
    await tester.pumpWidget(host(reduceMotion: true));
    await tester.pump(const Duration(seconds: 3));
    expect(hintOpacity(tester), 1);
    await tester.pumpWidget(const SizedBox());
  });
}
