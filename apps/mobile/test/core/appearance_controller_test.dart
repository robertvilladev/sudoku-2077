import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sudoku2077/core/appearance_controller.dart';

Future<AppearanceController> controllerWith(Map<String, Object> prefs) async {
  SharedPreferences.setMockInitialValues(prefs);
  return AppearanceController(await SharedPreferences.getInstance());
}

void main() {
  test('defaults to night', () async {
    final controller = await controllerWith({});
    expect(controller.appearance, Appearance.night);
    expect(controller.themeMode, ThemeMode.dark);
  });

  test('an unknown stored value falls back to night', () async {
    final controller = await controllerWith({'appearance': 'purple'});
    expect(controller.appearance, Appearance.night);
  });

  test('setAppearance persists, notifies and maps to a ThemeMode', () async {
    final controller = await controllerWith({});
    var notified = 0;
    controller.addListener(() => notified++);

    await controller.setAppearance(Appearance.system);
    expect(controller.themeMode, ThemeMode.system);
    await controller.setAppearance(Appearance.day);
    expect(controller.themeMode, ThemeMode.light);
    expect(notified, 2);

    final reloaded = await controllerWith({'appearance': 'day'});
    expect(reloaded.appearance, Appearance.day);
  });
}
