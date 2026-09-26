# Localization (i18n) strategy — web + mobile

Status: **proposal, not approved.** Options and recommendations for adding languages to `apps/web`
and `apps/mobile`. The roadmap entry is Phase 5.6 in `ROADMAP.md`; this doc holds the reasoning.

## Where we start

- **`apps/web` is a Vite + React SPA** (`react-router-dom`), not Next.js. The Next.js patterns
  (`next-intl`, `[locale]` route segments, middleware locale detection) don't apply. There's no SSR
  and no SEO need, since it's a game behind a title screen, so locale-prefixed URLs aren't needed.
  The locale can live in client state.
- **`apps/mobile` is Flutter/Dart**, not React Native. It can't import a TS package, so any
  sharing between the clients has to go through a data format that both sides can read, not
  through code.
- **Copy is hard-coded inline in both clients.** No i18n library is installed on either side.
- **Some copy is already duplicated across the clients.** For example, the difficulty flavors
  `ROOKIE RUN` / `STREET LEVEL` / `CORPO GRADE` / `GHOST PROTOCOL` and `// choose your clearance
level` are in both `apps/web/src/features/puzzle/DifficultyPicker.tsx` and
  `apps/mobile/lib/domain/sudoku.dart`.
- **Wire values are used as display labels.** Mobile shows `difficulty.wireName` (`EASY`,
  `HARDCORE`) directly. Once labels are translated, the API value and the label have to be
  separate things.
- **API errors are English prose that the web client shows directly.** `LoginForm`/`SignupForm`
  render `ApiError.message`, which is the server's `{ error: "Invalid email or password" }` string.
- **Locale-aware formatting is almost absent.** There is one
  `new Date(...).toLocaleDateString()` in `ProfilePage.tsx`. The timer is `mm:ss`, which isn't
  locale-sensitive.

## How this is usually done

Each ecosystem has a standard tool. Most teams with one web client and one native client keep a
**separate catalog per client** and use a translation management system (TMS) to keep them
aligned. Sharing one catalog in the repo is less common, but it works well when both clients use
the **ICU MessageFormat** syntax.

|                 | Web (React SPA)                                     | Mobile (Flutter)                                                             |
| --------------- | --------------------------------------------------- | ---------------------------------------------------------------------------- |
| Standard tool   | `react-intl` (FormatJS), `react-i18next`, or Lingui | `flutter_localizations` + `intl` + `flutter gen-l10n` (official)             |
| Catalog format  | JSON (ICU, or i18next's own syntax)                 | **ARB**: JSON with ICU MessageFormat strings, plus `@key` metadata           |
| Type safety     | Opt-in (generated key types)                        | Built in: generated `AppLocalizations` with a typed getter or method per key |
| Locale source   | `navigator.languages`, plus a user override         | System locale via `Localizations`, plus an optional in-app override          |
| Plurals, select | ICU `{count, plural, ...}`                          | Same ICU syntax in ARB                                                       |

ARB is ICU MessageFormat inside JSON. FormatJS (`react-intl`) is ICU-native. If the web uses
FormatJS, **one ARB-shaped catalog can feed both clients** without translating one syntax into the
other. `react-i18next` would need the `i18next-icu` plugin to read the same strings. Its default
`{{var}}` syntax and `_one`/`_other` plural suffixes aren't compatible with ARB.

## Options

### A. A separate catalog per client

Web gets `apps/web/src/i18n/*.json` and mobile gets `apps/mobile/lib/l10n/*.arb`, each in its own
idiom.

- Pros: the simplest setup. Each client stays independent, which matches how `apps/mobile` is
  already kept out of the npm workspace fan-out.
- Cons: shared game copy (difficulty names and flavors, mistakes, win/lose dialogs, settings
  labels, error messages) is translated twice and drifts. This is the same drift problem that
  Phase 5 already lists for the mistake rule and the DTOs.

### B. One shared catalog in the repo (recommended)

`packages/i18n/` holds `en.arb`, `es.arb`, and so on. It's the single source of truth.

- **Mobile:** `apps/mobile/l10n.yaml` points `gen-l10n` at the shared ARB files. If `gen-l10n`
  won't take an `arb-dir` outside the package (verify this first), a small sync script copies them
  into `apps/mobile/lib/l10n/`, and CI fails when the copy is stale.
- **Web:** a build step strips the `@key` metadata and emits `{ key: "ICU string" }` JSON per
  locale. `react-intl` loads it, and a generated `.d.ts` types the message IDs. Only the active
  locale's JSON is loaded, using dynamic `import()`.
- **Client-only strings stay in the shared file.** Web-only strings (auth forms, profile, terminal
  boot text) and mobile-only strings (haptics setting) are kept there under a prefix. Flutter
  generates getters for every key, but unused ones cost nothing. Web drops them when it
  tree-shakes the JSON import, or can filter by prefix.
- **ARB constraint:** keys must be valid Dart identifiers, so no dots. Use camelCase with a feature
  prefix, for example `difficultyEasyLabel`, `difficultyEasyFlavor`, `authLoginInvalidCredentials`.
  The web uses the same keys.
- Pros: each string is translated once, and one CI check covers key parity across locales and
  both clients.
- Cons: a build step on web, and one cross-package path to maintain, the same shape as today's
  `api-types` → hand-written Dart DTOs. The Phase 5 note on path-filtered `mobile.yml` applies:
  run mobile CI when `packages/i18n/**` changes.

### C. A TMS as the source of truth

Tolgee (open source, self-hostable), Crowdin, or Lokalise holds the strings and exports ARB for
mobile and JSON for web.

- Pros: a translator UI, translation memory, machine-translation pre-fill, and review workflow.
- Cons: an external service, another account, and sync in CI. It's overkill for one developer
  with a few hundred strings.
- Going from B to C later is easy, because every TMS imports and exports ARB. **Start with B and
  add C only if outside translators join.**

## Recommendation

1. **Option B** with **ICU MessageFormat** as the common syntax, **ARB** as the file format,
   **`react-intl`** on web, and **`gen-l10n`** on mobile.
2. **Split the work into two steps.** First extract English into the catalog, with no second
   language, on both clients. Every new screen from Phase 5.5 or Phase 6 then starts localized
   instead of adding more strings to extract later. Adding the first real language is a separate,
   small follow-up.
3. **API errors:** add a stable machine `code` next to `error` in the error shape in
   `packages/api-types`, for example
   `{ code: "AUTH_INVALID_CREDENTIALS", error: "Invalid email or password" }`. Clients translate
   `code`, and `error` stays as an English message for developers. **Don't** translate on the
   server with `Accept-Language`. It would spread copy across three places, and the server is not
   where UI copy lives.

## Details to settle when implementing

- **Locale selection and persistence**
  - Web: `navigator.languages`, matched against supported locales with English as the fallback.
    Keep the override in `SettingsContext` (`localStorage`), which the Phase 3 server-side settings
    sync already covers. Keep `<html lang>` updated.
  - Mobile: the system locale, and optionally an in-app override in `shared_preferences`, living
    in the Phase 5.5 settings panel.
  - Mobile store metadata: list the supported languages in iOS `CFBundleLocalizations` so the App
    Store shows them. On Android 13+, add `locales_config.xml` for the per-app language setting.
- **What not to localize**
  - The `SUDOKU 2077` logo and wordmark.
  - Grid digits: always `1`–`9`, never locale digit systems such as Arabic-Indic.
  - API wire values (`EASY`, `HARDCORE`).
  - Some cyberpunk flavor copy (`GHOST PROTOCOL`, `// choose your clearance level`) may be better
    left in English as part of the aesthetic. Decide per key, and mark those keys as intentionally
    untranslated in the ARB `@key.description`.
- **Fonts versus scripts.** The Phase 5.5 font candidates (Orbitron, Audiowide, Chakra Petch,
  Oxanium, Share Tech Mono) have mostly Latin-only glyph sets. Latin-script languages (es, pt, fr,
  de) are safe as long as accented characters are covered. Cyrillic, Greek, and CJK need a fallback
  font stack. **Choose the target languages before choosing the font.**
- **Uppercase styling.** Most of the UI is uppercase. Keep catalog strings in natural case and
  uppercase them in styling (CSS `text-transform` with the right `lang`, or `toUpperCase()` in
  Dart). This handles cases like the Turkish dotted `i`, and lets translators write normal
  sentences. Translations also run about 30% longer than English, so check that the HUD, tier
  cards, and number pad still fit.
- **Plurals and variables** use ICU syntax only, never string concatenation. For example:
  `{count, plural, one {# mistake left} other {# mistakes left}}`.
- **Right-to-left (RTL) languages** (ar, he) are out of scope for v1. Flutter would mostly handle
  them if layouts use `EdgeInsetsDirectional` and `AlignmentDirectional`, so prefer those in new
  mobile code anyway.
- **Formatting:** use `Intl.DateTimeFormat` / `Intl.NumberFormat` on web and `intl`'s
  `DateFormat` / `NumberFormat` on mobile. Always pass the active locale explicitly.
- **Tests**
  - Web: the Vitest setup and Playwright both wrap the app in the `en` provider, so existing
    `getByText` queries keep working.
  - Mobile: widget tests pump `MaterialApp` with `AppLocalizations.localizationsDelegates`.
  - Add an ESLint rule against JSX string literals (`formatjs/no-literal-string`) once extraction
    is done, so new inline copy can't creep back in. Flutter has no built-in equivalent, so rely
    on review for now.
- **CI checks** for `packages/i18n`:
  - Every locale has the same keys as `en`, with no missing or orphaned keys.
  - Placeholders match across locales.
  - The ICU syntax parses.
  - The web message types and the mobile generated files are up to date.
- **Translations:** a single developer can hand-translate with LLM pre-fill plus a native-speaker
  review. Revisit Option C (a TMS) if contributors join.

## Open decisions

1. **The sharing approach:** Option A, B, or C. Recommendation: B.
2. **The first target languages.** This decides whether the Phase 5.5 font needs non-Latin
   coverage.
3. **Scheduling:** extract English now, before Phase 5.5 adds more strings, or after Phase 5.5
   ships.
4. **Which cyberpunk flavor strings are translated, and which stay English on purpose.**
5. **Whether an in-app language override is wanted,** or the device or browser language is
   enough.
