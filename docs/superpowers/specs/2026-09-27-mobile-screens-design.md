# Mobile screens and Day mode — design

Date: 2026-09-27
Scope: `mobile` (design only, no code in this change)
Visual source of truth: the Sudoku 2077 design lab artifact, sections **Mobile · every screen** and **Day mode**
(https://claude.ai/artifact/32CancxRN7HWtmZ2AeCpJt). This spec records the decisions; the artifact shows them.

## Goal

Every screen in `apps/mobile` has a designed target that uses the lab's tokens (Nocturne palette, Orbitron +
Oxanium, violet = state / yellow = signal), so the implementation work (Theme parity, Phase 5.5 polish,
progress persistence) follows one reference instead of inventing layouts. The mockups mirror the app as
built: same screens, same structure, same catalog copy.

## Screens

| Flow    | Screen             | Today (`apps/mobile`)                                    | Target                                                                                                                                                                                                                                                                                                                     |
| ------- | ------------------ | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Launch  | Native splash      | Flutter default                                          | Launcher icon on `--bg`, no text or animation (Android 12+ splash API only shows the icon). Mark: bracketed 3×3 box with one yellow cell, also the proposed launcher icon.                                                                                                                                                 |
| Launch  | Language           | `LanguageScreen`                                         | Unchanged, except the wordmark becomes `SUDOKU//2077`.                                                                                                                                                                                                                                                                     |
| Launch  | Title              | Static boot lines, wordmark, PLAY / DAILY soon / OPTIONS | Boot lines type in over ~600 ms (web's `TerminalBootText`). Tap skips; reduced motion shows them at once. Build tag bottom-left.                                                                                                                                                                                           |
| Menu    | Title, saved game  | —                                                        | CONTINUE (tier · time · mistakes) takes the yellow slot; PLAY becomes secondary. Starting a new game asks before overwriting the save. Built with the Progress persistence item.                                                                                                                                           |
| Menu    | Options            | Language only                                            | Sections: LANGUAGE, APPEARANCE (Night / Day / System), AUDIO (Sound FX, Ambient hum), VISUALS (Effects, CRT scanline), GAMEPLAY (Auto-clear notes, Haptics). 56 px rows, apply on tap. Defaults as web: all on except hum. Reduced motion follows the system, no toggle. Reachable from the title and from the pause card. |
| Menu    | Difficulty         | Surface cards, label + codename                          | Lab-style cards: label in the display face, codename in accent-300, a 1–4 pip tier bar. Whole card is the tap target.                                                                                                                                                                                                      |
| Loading | Decrypting         | Spinner + always-visible cold-start hint                 | Ghost 9×9 grid cycling glyphs, then the givens lock in. Indeterminate scan bar. Cold-start hint fades in only after 3 s.                                                                                                                                                                                                   |
| Loading | Connection lost    | Title, mapped message, RETRY / MENU                      | Same copy and mapping (`loadErrorMessage`); RETRY is the yellow button.                                                                                                                                                                                                                                                    |
| In game | Board              | HUD, banners, grid, pad, NOTES / UNDO / ERASE            | Same layout with the lab's cell states. Combo in signal yellow; mistakes red above zero; NOTES on = violet fill; a digit with 0 remaining dims to 45%.                                                                                                                                                                     |
| In game | Pause / win / lose | `_OverlayCard`                                           | One card pattern: corner brackets, badge, display title, tabular stats, one yellow primary on top, secondaries below. Badge: yellow (cleared), red (failed), neutral (paused). Pause blurs the grid and adds an OPTIONS button.                                                                                            |
| In game | Abort run?         | Stock `AlertDialog`                                      | Same card pattern: STAY is primary, QUIT gets a red outline. Body switches to `quitConfirmSaved` once progress persistence lands.                                                                                                                                                                                          |
| In game | Banners            | Red-bordered row                                         | Clash-tinted surface, red border; sit between HUD and grid and push it down.                                                                                                                                                                                                                                               |

Rules that apply everywhere:

- One yellow primary button per screen (PLAY or CONTINUE, CONFIRM, RETRY, RESUME, NEXT PUZZLE, STAY).
- Secondary buttons: violet-800 outline. Not-yet-available entries: dashed outline, disabled.
- Wordmark is `SUDOKU//2077` on every screen, with `2077` as signal.
- New layouts use `EdgeInsetsDirectional` / `AlignmentDirectional` (Phase 5.4 RTL note).

## Day mode

A second theme that keeps every colour role and swaps emitted light for ink.

- Violet stays state, darkened for contrast: player digit `#5446B8` (7.1:1 on white), accent `#6152C9`.
- Yellow `#FCEE0A` is 1.2:1 on white, so in Day it is never text. It only fills (logo `2077` block, eyebrow
  tags, combo, primary buttons), always with ink `#161826` on it (14.6:1).
- No glows or text shadows. The board and selected rows get a hard offset shadow in `#C9C3EF`.
- Corner brackets and the sweep core are ink.
- Cells are white; givens are ink, weight 700, on a 6% ink tint.
- Clash red `#C43A33` (5.3:1), win green `#1F7A43`.
- Full token table: artifact, Day mode section.

Options → APPEARANCE: **Night (default)** / Day / System. Night stays the default because it is the brand.
System follows `MediaQuery.platformBrightness`.

Implementation note: `Palette` in `lib/core/theme.dart` is static constants. Day mode turns it into a
`ThemeExtension<Palette>` with night and day instances, and every `Palette.x` call site becomes
`context.palette.x`. Do this in the **Theme parity** PR, which rewrites the palette anyway, so no widget is
touched twice. Web: its tokens are CSS variables already, so Day is one `[data-mode="day"]` block plus the glow
overrides; not scheduled.

## Catalog keys to add (`packages/i18n`)

`menuContinue`, `settingAppearance`, `settingThemeNight`, `settingThemeDay`, `settingThemeSystem`,
`settingsSectionAudio`, `settingsSectionVisuals`, `settingsSectionGameplay`, `settingEffects`, `settingHaptics`.
Each lands with the feature that first shows it, translated in es/fr/ca in the same PR.

## Mismatches resolved

- The wordmark was `SUDOKU 2077` in the lab and on the Flutter language screen, but `SUDOKU//2077` on the
  title (web and mobile). Decision: `SUDOKU//2077` everywhere.
- The lab's demo HUD reads TIME / ERR / SECTORS; the app reads TIER / TIME / MISTAKES / COMBO. The screens
  follow the app. SECTORS stays a lab-only readout.

## Out of scope

- Flutter code. Each screen is built with the roadmap item it belongs to: Theme parity (palette, fonts, Day
  mode), Phase 5.5 (effects, sound, haptics, settings store), Progress persistence (CONTINUE, saved-game copy),
  App identity polish (launcher icon, splash, "Sudoku 2077" label).
- Release/APK work.
