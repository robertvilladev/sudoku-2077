import 'package:flutter_test/flutter_test.dart';
import 'package:sudoku2077/app.dart';
import 'package:sudoku2077/core/config.dart';

void main() {
  testWidgets('app boots to the placeholder scaffold', (tester) async {
    await tester.pumpWidget(const SudokuApp());
    expect(find.byType(SudokuApp), findsOneWidget);
  });

  test('apiBaseUrl defaults to the Android emulator host alias', () {
    expect(apiBaseUrl, 'http://10.0.2.2:3000');
  });
}
