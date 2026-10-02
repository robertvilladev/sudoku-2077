# Mobile theme parity, Day mode and screen restyle — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `apps/mobile` looks like the design lab: lab palette in Night and Day, Orbitron + Oxanium, yellow primary buttons, lab cell states, and the restyled title, difficulty, loading, board and overlay screens, with an Appearance setting in Options.

**Architecture:** `Palette` becomes a `ThemeExtension<Palette>` with `night` and `day` instances, read through `context.palette`. An `AppearanceController` (same shape as `LocaleController`) stores Night/Day/System in `shared_preferences` and drives `MaterialApp.themeMode`. Button looks come from `ThemeData` button themes, so screens keep using `FilledButton`/`OutlinedButton`. Pure style decisions (cell colours) are plain functions with unit tests.

**Tech Stack:** Flutter 3.47.5, `provider`, `shared_preferences`, `flutter gen-l10n` over `packages/i18n/arb`.

**Spec:** `docs/superpowers/specs/2026-09-27-mobile-screens-design.md` (visuals: design lab artifact, sections "Mobile · every screen" and "Day mode").

## Global Constraints

- No new pub dependencies. Fonts are bundled assets (SIL OFL 1.1), licence file shipped next to them.
- Night stays the default appearance. Stored key `appearance`, values `night` | `day` | `system`.
- One yellow primary (`FilledButton`) per screen; secondaries are `OutlinedButton`.
- Wordmark `SUDOKU//2077` on every screen; `2077` is signal (Night: yellow text; Day: ink on a yellow block).
- In Day, signal yellow `#FCEE0A` is never used as text colour on a light surface.
- Catalog copy stays natural case in ARB and is uppercased at render time. New keys land in `en`, `es`, `fr`, `ca` together.
- New layout code uses `EdgeInsetsDirectional` / `AlignmentDirectional`.
- Reduced motion: `MediaQuery.disableAnimationsOf(context)` makes every new animation static.
- Out of scope: sound, haptics, unit-complete effects, the other Options toggles (they land with Phase 5.5 behaviour), CONTINUE (progress persistence), native splash, web Day mode.
- Night palette values (lab): bg `#161826`, surface `#232532`, surface2 `#1C1E2C`, text `#E9E9ED`, given `#F3F5FE`, accent `#9184D9`, accent300 `#D2CEFD`, accent400 `#B5ABFC`, accent700 `#5D5294`, accent800 `#423A6A`, accent900 `#2B2741`, neutral400 `#B2B6CA`, neutral500 `#9397AB`, neutral600 `#75798C`, neutral700 `#595D6C`, lineThin `#383946`, error `#E3645E`, win `#54B66E`.
- Day palette values (lab): bg `#ECEEF6`, surface `#FFFFFF`, surface2 `#F6F7FB`, cell `#FFFFFF`, text/given `#161826`, accent `#6152C9`, accent300 `#4A3FA0`, accent400 `#5446B8`, accent700 `#8F84D6`, accent800 `#C9C3EF`, accent900 `#E3E0F8`, neutral400 `#4C5063`, neutral500 `#5F6377`, neutral600 `#7A7E92`, neutral700 `#A9ADBF`, lineThin `#CFD2E0`, error `#C43A33`, win `#1F7A43`.

## Review Focus

1. **Day contrast:** player digit, muted text, error and signal ink must stay ≥ 4.5:1 on their surfaces in Day — pinned by the contrast test in Task 1.
2. **Corrupt stored appearance** (`'appearance': 'purple'` from an older build) must fall back to Night, not crash — Task 2 test.
3. **Same-value highlight must not recolour digits** (the bug the lab fixed): a given stays given-coloured when highlighted — Task 6 test.
4. **Given in a clash keeps its given colour**; only its background turns red — Task 6 test.
5. **Reduced motion:** boot lines and the cold-start hint must not depend on animation to appear — Task 4 and Task 5 tests.

---

### Task 1: Palette as a ThemeExtension, bundled fonts

**Files:**

- Modify: `apps/mobile/lib/core/theme.dart`
- Create: `apps/mobile/assets/fonts/Orbitron[wght].ttf`, `apps/mobile/assets/fonts/Oxanium[wght].ttf`, `apps/mobile/assets/fonts/OFL.txt` (from `github.com/google/fonts`, `ofl/orbitron/` and `ofl/oxanium/`)
- Modify: `apps/mobile/pubspec.yaml` (fonts section)
- Test: `apps/mobile/test/core/theme_test.dart`

**Interfaces:**

- Produces: `class Palette extends ThemeExtension<Palette>` with fields `bg, surface, surface2, cellBg, text, given, accent, accent300, accent400, accent700, accent800, accent900, neutral400, neutral500, neutral600, neutral700, divider, lineThin, givenTint, hlPeer, hlSame, hlSel, hlConflict, error, win, signal, signalInk, signalLine, onAccent, scrim` and `bool isDay`; `static const Palette night, day`; `extension PaletteContext on BuildContext { Palette get palette; }`; `ThemeData buildTheme(Palette p)`; `const uiFont = 'Oxanium'`, `const displayFont = 'Orbitron'`; `TextStyle weighted(FontWeight w)` (sets `fontWeight` and `FontVariation.weight`, needed because the fonts are variable).

- [ ] **Step 1: Write the failing test** (`test/core/theme_test.dart`)

```dart
double _lum(Color c) {
  double ch(double v) =>
      v <= 0.03928 ? v / 12.92 : math.pow((v + 0.055) / 1.055, 2.4).toDouble();
  return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
}
double contrast(Color a, Color b) {
  final x = _lum(a), y = _lum(b);
  return (math.max(x, y) + 0.05) / (math.min(x, y) + 0.05);
}

void main() {
  test('night is dark, day is light, both carry their palette', () {
    final night = buildTheme(Palette.night), day = buildTheme(Palette.day);
    expect(night.brightness, Brightness.dark);
    expect(day.brightness, Brightness.light);
    expect(day.extension<Palette>(), same(Palette.day));
    expect(night.textTheme.bodyMedium!.fontFamily, uiFont);
  });

  for (final p in [Palette.night, Palette.day]) {
    test('${p.isDay ? 'day' : 'night'} text pairs reach 4.5:1', () {
      expect(contrast(p.given, p.cellBg), greaterThanOrEqualTo(4.5));
      expect(contrast(p.accent400, p.cellBg), greaterThanOrEqualTo(4.5));
      expect(contrast(p.neutral500, p.bg), greaterThanOrEqualTo(4.5));
      expect(contrast(p.error, p.cellBg), greaterThanOrEqualTo(4.5));
      expect(contrast(p.signalInk, p.signal), greaterThanOrEqualTo(4.5));
    });
  }
}
```

- [ ] **Step 2: Run it, expect a compile failure** — `flutter test test/core/theme_test.dart` → `Palette.night` undefined.

- [ ] **Step 3: Implement** `theme.dart`: the `Palette` class with the Global Constraints values; derived tokens: `divider` = text at 16% (night) / `#161826` at 14% (day); `givenTint` = `#E9E9ED` at 5.5% / `#161826` at 6%; `hlPeer/hlSame/hlSel` = accent at 9/22/30% (night) and `#6152C9` at 8/18/26% (day); `hlConflict` = error at 16% / 14%; `signal` `#FCEE0A` both; `signalInk` `#161826` both; `signalLine` `#FCEE0A` / `#161826`; `onAccent` `#161826` / `#FFFFFF`; `scrim` bg at 78% / 82%. `copyWith() => this`, `lerp(other, t) => t < 0.5 ? this : other as Palette`. `buildTheme(p)` sets `ColorScheme` from `p`, `scaffoldBackgroundColor: p.bg`, `fontFamily: uiFont`, `extensions: [p]`, plus:
  - `filledButtonTheme`: background `p.signal`, foreground `p.signalInk`, `BeveledRectangleBorder(borderRadius: BorderRadius.only(topRight: Radius.circular(8), bottomLeft: Radius.circular(8)))`, day adds `side: BorderSide(color: p.signalInk)`, text `weighted(FontWeight.w600)` with `letterSpacing: 1`, `minimumSize: Size(64, 48)`.
  - `outlinedButtonTheme`: foreground `p.text`, `side: BorderSide(color: p.accent800)`, radius 4, `minimumSize: Size(64, 48)`.
  - `appBarTheme` bg `p.bg`, title in `displayFont` 15/800 letterSpacing 1; `dialogTheme` bg `p.surface2`.
  - `pubspec.yaml`: `fonts: - family: Orbitron / asset: assets/fonts/Orbitron[wght].ttf` and the same for Oxanium.

- [ ] **Step 4: Run** `flutter test test/core/theme_test.dart` → PASS. (Other files still use the old static `Palette.x` and won't compile until Task 3; the old statics stay until then.)

### Task 2: AppearanceController

**Files:**

- Create: `apps/mobile/lib/core/appearance_controller.dart`
- Modify: `apps/mobile/lib/app.dart`, `apps/mobile/lib/main.dart`, `apps/mobile/test/app_test.dart` (helper passes the controller)
- Test: `apps/mobile/test/core/appearance_controller_test.dart`

**Interfaces:**

- Consumes: `Palette.night/day`, `buildTheme` (Task 1).
- Produces: `enum Appearance { night, day, system }`; `class AppearanceController extends ChangeNotifier { AppearanceController(SharedPreferences); Appearance get appearance; ThemeMode get themeMode; Future<void> setAppearance(Appearance); }`; `SudokuApp` gains `required AppearanceController appearanceController`.

- [ ] **Step 1: Failing test**

```dart
Future<AppearanceController> controllerWith(Map<String, Object> prefs) async {
  SharedPreferences.setMockInitialValues(prefs);
  return AppearanceController(await SharedPreferences.getInstance());
}

void main() {
  test('defaults to night', () async {
    final c = await controllerWith({});
    expect(c.appearance, Appearance.night);
    expect(c.themeMode, ThemeMode.dark);
  });

  test('an unknown stored value falls back to night', () async {
    final c = await controllerWith({'appearance': 'purple'});
    expect(c.appearance, Appearance.night);
  });

  test('setAppearance persists, notifies and maps to a ThemeMode', () async {
    final c = await controllerWith({});
    var notified = 0;
    c.addListener(() => notified++);
    await c.setAppearance(Appearance.system);
    expect(c.themeMode, ThemeMode.system);
    await c.setAppearance(Appearance.day);
    expect(c.themeMode, ThemeMode.light);
    expect(notified, 2);
    expect((await controllerWith({'appearance': 'day'})).appearance, Appearance.day);
  });
}
```

- [ ] **Step 2: Run, expect failure** (missing file).
- [ ] **Step 3: Implement** — key `appearance`, stored as `Appearance.name`; lookup with `Appearance.values.where((a) => a.name == stored).firstOrNull ?? Appearance.night`; `themeMode` switch night→dark, day→light, system→system. `app.dart`: add a `ChangeNotifierProvider<AppearanceController>.value` and a `Consumer2<LocaleController, AppearanceController>` feeding `theme: buildTheme(Palette.day)`, `darkTheme: buildTheme(Palette.night)`, `themeMode: appearance.themeMode`. `main.dart` constructs it from the same `prefs`.
- [ ] **Step 4: Run** the new test → PASS.

### Task 3: Migrate every call site to `context.palette`

**Files:**

- Modify: `lib/core/theme.dart` (delete the old static colours), `lib/features/menu/{title,difficulty,language}_screen.dart`, `lib/features/puzzle/ui/{board_screen,number_pad,sudoku_grid}.dart`

- [ ] **Step 1:** Delete the static constants from the old `Palette`, then run `flutter analyze` and fix each error: `Palette.x` → `context.palette.x` (or `final p = context.palette;` at the top of `build`), dropping `const` on the widgets that now read the palette. Mapping for renamed fields: `Palette.surface` stays `surface`; the old one-off peer colour `Color(0xFF1D1F2E)` is replaced in Task 6.
- [ ] **Step 2:** `flutter analyze` → no issues; `flutter test` → all existing tests PASS (they assert text and flow, not colours).

### Task 4: Appearance in Options, wordmark, typed boot lines

**Files:**

- Modify: `packages/i18n/arb/{en,es,fr,ca}.arb` — add after `settingLanguage`:
  - `settingAppearance`: Appearance / Apariencia / Apparence / Aparença
  - `settingThemeNight`: Night / Noche / Nuit / Nit
  - `settingThemeDay`: Day / Día / Jour / Dia
  - `settingThemeSystem`: System / Sistema / Système / Sistema
- Create: `apps/mobile/lib/features/menu/wordmark.dart` (`Wordmark({double fontSize = 30})`), `apps/mobile/lib/features/menu/boot_text.dart` (`BootText({required List<String> lines})`)
- Modify: `language_screen.dart` (Options gets an APPEARANCE section; both screens use `Wordmark`), `title_screen.dart` (`Wordmark`, `BootText`, DAILY and OPTIONS as `OutlinedButton`)
- Test: `apps/mobile/test/features/menu/boot_text_test.dart`, `apps/mobile/test/app_test.dart`

**Interfaces:**

- Consumes: `AppearanceController`, `Appearance` (Task 2); `context.palette`, `displayFont`, `weighted` (Task 1).
- Produces: `Wordmark`, `BootText` (reused by nothing else yet).

- [ ] **Step 1: Failing tests**

```dart
// boot_text_test.dart
Widget host({required bool reduceMotion}) => MaterialApp(
  theme: buildTheme(Palette.night),
  home: MediaQuery(
    data: MediaQueryData(disableAnimations: reduceMotion),
    child: const Scaffold(body: BootText(lines: ['System online', 'Grid integrity: OK'])),
  ),
);
const full = '> SYSTEM ONLINE\n> GRID INTEGRITY: OK';

testWidgets('types the lines in over ~600 ms', (tester) async {
  await tester.pumpWidget(host(reduceMotion: false));
  expect(find.text(full), findsNothing);
  await tester.pump(const Duration(milliseconds: 650));
  expect(find.text(full), findsOneWidget);
});

testWidgets('a tap skips the typing', (tester) async {
  await tester.pumpWidget(host(reduceMotion: false));
  await tester.tap(find.byType(BootText));
  await tester.pump();
  expect(find.text(full), findsOneWidget);
});

testWidgets('reduced motion shows the lines at once', (tester) async {
  await tester.pumpWidget(host(reduceMotion: true));
  expect(find.text(full), findsOneWidget);
});
```

```dart
// app_test.dart
testWidgets('Options → Day switches the theme and is remembered', (tester) async {
  usePhoneSize(tester);
  await tester.pumpWidget(await app());
  await tester.pumpAndSettle();
  await tester.tap(find.text('OPTIONS'));
  await tester.pumpAndSettle();
  await tester.tap(find.text('DAY'));
  await tester.pumpAndSettle();
  expect(Theme.of(tester.element(find.text('APPEARANCE'))).brightness, Brightness.light);
  final prefs = await SharedPreferences.getInstance();
  expect(prefs.getString('appearance'), 'day');
});
```

- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement.**
  - Run `npm run build --workspace packages/i18n` and `flutter gen-l10n`.
  - `BootText`: an `AnimationController(600 ms)` that reveals `joined.substring(0, (t * length).ceil())`. Wrap it in a `GestureDetector(onTap: controller.value = 1)`. Call `forward()` in `didChangeDependencies`, or set `value = 1` when `MediaQuery.disableAnimationsOf(context)` is true. Style: 11 px, `neutral600`, uppercase, line height 1.6.
  - `Wordmark`: a `Text.rich` with `SUDOKU` (`neutral100`/`given`), `//` (`accent`) and `2077`. The `2077` is `signal` in Night, or `signalInk` on a `signal` background in Day. Use `displayFont`, `weighted(w800)` and letterSpacing 0.08 em.
  - Options APPEARANCE section: a 3-column row of `_ModeChip` buttons (Night/Day/System, keys `appearance-night|day|system`). A chip reads as selected with an `accent` border and `accent900` fill. Section labels use `lp-section` styling: 11 px, letterSpacing 1.6, `signal` in Night; in Day, `signalInk` on a `signal` block.
- [ ] **Step 4: Run** `flutter test` → all PASS. Also run `npm run test --workspace packages/i18n` (key parity) → PASS.

### Task 5: Difficulty cards and the decrypting load state

**Files:**

- Modify: `lib/features/menu/difficulty_screen.dart`, `lib/features/puzzle/ui/board_screen.dart` (loading + error branches)
- Create: `lib/features/puzzle/ui/decrypt_loader.dart` (`DecryptLoader()`: ghost grid, title, scan bar, delayed hint)
- Test: `test/features/puzzle/decrypt_loader_test.dart`

- [ ] **Step 1: Failing test**

```dart
Widget host({bool reduceMotion = false}) => MaterialApp(
  theme: buildTheme(Palette.night),
  localizationsDelegates: AppLocalizations.localizationsDelegates,
  supportedLocales: AppLocalizations.supportedLocales,
  home: MediaQuery(
    data: MediaQueryData(disableAnimations: reduceMotion),
    child: const Scaffold(body: DecryptLoader()),
  ),
);
const hint = 'First load can take up to a minute while the server wakes up.';

testWidgets('cold-start hint only appears after 3 s', (tester) async {
  await tester.pumpWidget(host());
  await tester.pump();
  expect(find.text('DECRYPTING GRID…'), findsOneWidget);
  expect(tester.widget<AnimatedOpacity>(find.byKey(const ValueKey('cold-start-hint'))).opacity, 0);
  await tester.pump(const Duration(seconds: 3));
  expect(tester.widget<AnimatedOpacity>(find.byKey(const ValueKey('cold-start-hint'))).opacity, 1);
  await tester.pumpWidget(const SizedBox()); // disposes timers
});

testWidgets('reduced motion still shows the hint after 3 s', (tester) async {
  await tester.pumpWidget(host(reduceMotion: true));
  await tester.pump(const Duration(seconds: 3));
  expect(tester.widget<AnimatedOpacity>(find.byKey(const ValueKey('cold-start-hint'))).opacity, 1);
  await tester.pumpWidget(const SizedBox());
});
```

- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement.**
  - `DecryptLoader` is stateful.
    - A `Timer(3 s)` flips `_showHint`.
    - A `Timer.periodic(80 ms)` reshuffles the 81 glyphs from `0123456789ABCDEF#%/<>` via a seeded `Random`. It is skipped under reduced motion (static glyphs).
    - The scan bar is a repeating 1.2 s `AnimationController`. Under reduced motion it is not started and the bar is drawn full.
    - Grid: 198 px square with a 2 px `accent700` border, `lineThin` gaps and `cellBg` cells.
    - Cancel both timers and the controller in `dispose`.
  - In `board_screen.dart`, replace the loading branch's spinner, title and hint with `const DecryptLoader()`. The error branch uses the `displayFont` title in `error`, a `FilledButton` RETRY and an `OutlinedButton` MENU.
  - Difficulty `_TierCard`:
    - `surface2` fill, 1 px `accent800` border, radius 4.
    - Label in `displayFont` 15/800. Codename in `accent300`, 11 px, letterSpacing 1.8.
    - Four 7×16 pips, `accent` for filled and `accent800` for empty; the count is `Difficulty.values.indexOf(d) + 1`.
    - The `InkWell` covers the whole card.
- [ ] **Step 4: Run** `flutter test` → all PASS (the `openBoard` helper still finds `DECRYPTING GRID…`).

### Task 6: Board cells, HUD, pad and action row

**Files:**

- Create: `lib/features/puzzle/ui/cell_style.dart`
- Modify: `sudoku_grid.dart`, `number_pad.dart`, `board_screen.dart` (`_Hud`, `_Banner`)
- Test: `test/features/puzzle/cell_style_test.dart`

**Interfaces:**

- Produces: `class CellStyle { final Color background; final Color digit; final FontWeight weight; final Color? border; final double borderWidth; }` and `CellStyle cellStyleFor(Palette p, {required bool isGiven, required bool isSelected, required bool isPeer, required bool isSameValue, required bool isConflict})`.

- [ ] **Step 1: Failing test**

```dart
CellStyle s({bool given = false, bool sel = false, bool peer = false, bool same = false, bool conflict = false}) =>
    cellStyleFor(Palette.night, isGiven: given, isSelected: sel, isPeer: peer, isSameValue: same, isConflict: conflict);

test('givens are heavy and given-coloured on a tint; entries are violet and regular', () {
  expect(s(given: true).digit, Palette.night.given);
  expect(s(given: true).weight, FontWeight.w700);
  expect(s(given: true).background, isNot(Palette.night.cellBg));
  expect(s().digit, Palette.night.accent400);
  expect(s().weight, FontWeight.w400);
  expect(s().background, Palette.night.cellBg);
});

test('same-value highlight changes the background only', () {
  expect(s(given: true, same: true).digit, Palette.night.given);
  expect(s(same: true).digit, Palette.night.accent400);
  expect(s(same: true).background, isNot(s().background));
});

test('a clash turns an entry red but leaves a given its colour', () {
  expect(s(conflict: true).digit, Palette.night.error);
  expect(s(given: true, conflict: true).digit, Palette.night.given);
  expect(s(given: true, conflict: true).background, isNot(s(given: true).background));
});

test('selection draws a 2 px accent border, red when in a clash', () {
  expect(s(sel: true).border, Palette.night.accent);
  expect(s(sel: true).borderWidth, 2);
  expect(s(sel: true, conflict: true).border, Palette.night.error);
});
```

- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement.**
  - `cellStyleFor` builds the background as `Color.alphaBlend(highlight, Color.alphaBlend(isGiven ? givenTint : transparent, cellBg))`.
    - The highlight is chosen in this order: conflict `hlConflict`, selected `hlSel`, same `hlSame`, peer `hlPeer`, otherwise transparent.
    - Digit colour: `error` when the cell is a player entry in a clash; otherwise `given` or `accent400`.
    - Border: selected → `accent` 2 px, or `error` when also in a clash; same value → `accent` at 45%, 1 px; conflict → `error` at 55%, 1 px.
  - `_SudokuCell` uses it: a `DecoratedBox` with `Border.all` drawn inside the cell. The digit uses `weighted(style.weight)`. The grid frame colour becomes `accent700` and the gaps between cells `lineThin`. The notes grid uses `neutral500`.
  - `_DigitButton`: `surface2` fill, 1 px `accent800` border, radius 4, digit in `accent300` at 22 px, and the count in `neutral500` at 9 px. The existing 45% opacity stays for used-up digits.
  - `_ActionButton`: `surface2` fill with an `accent800` border. When highlighted it switches to an `accent` fill with `onAccent` text.
  - `_Hud`:
    - Tier in `accent300`.
    - Mistakes in `error` once above zero.
    - Combo is signal: `signal` text in Night, `signalInk` on a `signal` chip in Day.
    - The pause `IconButton` gets a 1 px `accent800` outline.
  - `_Banner`: `hlConflict` over a `surface2` fill with an `error` border.
- [ ] **Step 4: Run** `flutter test` → all PASS.

### Task 7: One overlay card for pause, win, lose and abort

**Files:**

- Modify: `lib/features/puzzle/ui/board_screen.dart` (`_OverlayCard`, `_confirmQuit`, pause blur)
- Test: `test/app_test.dart`

- [ ] **Step 1: Failing test**

```dart
testWidgets('pause card offers OPTIONS, which opens the options screen', (tester) async {
  await openBoard(tester, 'EASY');
  await tester.tap(find.byTooltip('Pause'));
  await tester.pumpAndSettle();
  expect(find.text('SYSTEM PAUSED'), findsOneWidget);
  await tester.tap(find.text('OPTIONS'));
  await tester.pumpAndSettle();
  expect(find.text('APPEARANCE'), findsOneWidget);
  await tester.pageBack();
  await tester.pumpAndSettle();
  expect(find.text('SYSTEM PAUSED'), findsOneWidget);
});
```

The existing "back during a run asks for confirmation" test must keep passing unchanged: `ABORT RUN?` → `QUIT` → `SELECT DIFFICULTY`.

- [ ] **Step 2: Run, expect failure** (no OPTIONS on the pause card).
- [ ] **Step 3: Implement.**
  - `_OverlayCard` fields: `badge`, `badgeColor`, `title`, `titleColor`, `body` (optional), `stats` (optional), `primary`, and `secondaries` (a list of `(String, VoidCallback, {bool danger})`).
  - Layout: a `surface2` card with a 1 px `accent800` border and radius 4. Four corner brackets sit at −6 px (14 px arms, 2 px, `signalLine`) inside a `Stack` with `clipBehavior: Clip.none`.
  - Content order: badge (10 px, letterSpacing 1.8), title (`displayFont` 19/800), optional body and stats, then a full-width `FilledButton` primary, then the secondaries as `OutlinedButton`s in an `Expanded` row. A danger secondary gets an `error` border and text.
  - Badge colours: cleared `signal` (a chip in Day), failed `error`, paused `neutral500`. The scrim is `palette.scrim`.
  - Pause: the board column is wrapped in `ImageFiltered(imageFilter: ImageFilter.blur(sigmaX: 6, sigmaY: 6), enabled: _paused)`. Secondaries are `menuOptions` (push `OptionsScreen`) and `actionQuitToMenu`.
  - Win: secondary `actionMenu`, primary `actionNextPuzzle`. Lose: secondary `actionMenu`, primary `actionRetry`.
  - `_confirmQuit`: `showDialog` whose builder returns `Dialog(backgroundColor: Colors.transparent, child: _OverlayCard(...))` with the title `abortRunTitle`, body `abortRunBody`, primary `actionStay` (pops `false`) and a danger secondary `actionQuit` (pops `true`). The card is used without its own scrim.
- [ ] **Step 4: Run** `flutter test` → all PASS.

### Task 8: Verify, docs, checkpoint

**Files:**

- Modify: `ROADMAP.md`: tick **Theme parity** and **Day mode (mobile first)**. Under the Phase 5.5 given-vs-player item, note that mobile is done and web is pending. Record that launcher icons already exist under **App identity polish**.
- Modify: `apps/mobile/README.md` (`core/` line: theme, appearance)

- [ ] **Step 1:** In `apps/mobile`, run `dart format .`, `flutter analyze` and `flutter test`. Expect clean output and all tests passing.
- [ ] **Step 2:** From the repo root, run `npm run test --workspace packages/i18n`. Expect PASS.
- [ ] **Step 3:** Run the app against the mock API: `flutter run --dart-define=USE_MOCK_API=true`. Walk the title, options (switch to Day), difficulty, loading, board, pause, win and lose screens in both modes, at 360 px wide and in `fr`.
- [ ] **Step 4: Checkpoint.** Stop and show the user the diff summary. **Commit and open the PR only after they approve.** Commit as `feat(mobile): theme parity, day mode and restyled screens` and use the same PR title.
