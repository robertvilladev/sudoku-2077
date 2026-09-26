import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sudoku2077/core/locale_controller.dart';

Future<LocaleController> controllerWith(Map<String, Object> prefs) async {
  SharedPreferences.setMockInitialValues(prefs);
  return LocaleController(await SharedPreferences.getInstance());
}

void main() {
  test('defaults to English and not chosen', () async {
    final controller = await controllerWith({});
    expect(controller.locale, const Locale('en'));
    expect(controller.languageChosen, isFalse);
  });

  test('an unsupported stored code falls back to English', () async {
    final controller = await controllerWith({'locale': 'xx'});
    expect(controller.locale, const Locale('en'));
  });

  test('setLocale and confirmChoice persist and notify', () async {
    final controller = await controllerWith({});
    var notified = 0;
    controller.addListener(() => notified++);

    await controller.setLocale(const Locale('fr'));
    await controller.confirmChoice();

    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getString('locale'), 'fr');
    expect(prefs.getBool('languageChosen'), isTrue);
    expect(controller.locale, const Locale('fr'));
    expect(notified, 2);
  });
}
