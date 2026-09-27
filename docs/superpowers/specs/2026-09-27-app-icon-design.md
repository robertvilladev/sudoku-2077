# App icon design

Phase 5 "App identity polish". Replaces the Flutter default launcher icons, adds the missing web favicon, and fixes the app display names.

## Decision

Concept **X1 "Whisper chip"**, picked from the icon lab (six concepts, then three A1 × C2 hybrids):

- A1's 3×3 grid of blocks: dim violet `#5D5294`, violet `#9184D9`, and the centre cell in signal yellow `#FCEE0A`.
- Behind it, C2's chip (body and 12 pins) in the darkest violet `#423A6A` on `#1E2030`, so it reads as background.
- A1's HUD brackets `#D2CEFD` on the chip's corners.
- Ground: Nocturne `#161826`, a soft violet halo and faint scanlines. A neon glow (Gaussian blur, σ 1.8 units) on the mark.

Splash art is out of scope: Android 12+ limits the native splash to a colour plus the icon.

## Geometry

One drawing on the 108 × 108 Android adaptive-icon canvas. The mark is scaled to 0.85 around the centre so every part stays inside the 66-unit safe circle; no launcher mask crops it. Other targets reuse the drawing with a tighter crop:

| Target                                                | viewBox       | Glow                     |
| ----------------------------------------------------- | ------------- | ------------------------ |
| Android adaptive foreground / background / monochrome | `0 0 108 108` | yes (fg)                 |
| iOS + legacy Android (`icon.png`)                     | `22 22 64 64` | yes                      |
| Web `apple-touch-icon.png` (180 px)                   | `22 22 64 64` | yes                      |
| Web `favicon.svg`                                     | `26 26 56 56` | no, blur smears at 16 px |

The monochrome layer (Android 13 themed icons) is the same shapes in white: dim cells at 40 %, chip at 25 %, chip body dropped.

## Pipeline

- `scripts/render-icons.mjs` is the single source. It builds each SVG variant and rasterises the PNGs with Playwright, already a dev dependency of `apps/web`, so no new npm dependency. Run it with `node scripts/render-icons.mjs` after changing the mark.
- Outputs:
  - `apps/web/public/favicon.svg`
  - `apps/web/public/apple-touch-icon.png`
  - `apps/mobile/assets/icon/{icon,foreground,background,monochrome}.png` (1024 px). These are not bundled into the app.
- `flutter_launcher_icons` (a new **dev** dependency in `apps/mobile`) fans the 1024 px PNGs out to every Android density, including the adaptive icon with a monochrome layer, and to the iOS `AppIcon.appiconset` with the alpha channel removed. Run with `dart run flutter_launcher_icons`. The generated files are committed. It was picked over hand-writing the density sets and the iOS alpha stripping.
- Web links the icons from `apps/web/index.html`.

## Names

Android `android:label` and iOS `CFBundleDisplayName` become `Sudoku 2077`. The application ID is unchanged.

## Not in scope

- A PWA manifest. Add it with 192/512 icons if the web app becomes installable.
- The native launch background, still white by default. A one-line colour change to `#161826` is a good follow-up.
