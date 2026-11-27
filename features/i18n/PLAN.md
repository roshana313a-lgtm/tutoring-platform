# PLAN: Internationalisation (Persian / English)

## Goal

Every screen can be read in Persian (RTL) or English (LTR). Persian stays the default, keeps the
Estedad font and `dir="rtl"`; English flips the document to `dir="ltr"` and a Latin font stack.

## Layers touched

| Layer | Files | Responsibility |
| --- | --- | --- |
| Dependency | `frontend/package.json` | `vue-i18n@11` (composition API, `legacy: false`) |
| Messages | `frontend/src/locales/fa.json`, `frontend/src/locales/en.json` | Every UI string, grouped by screen |
| Runtime | `frontend/src/i18n/index.ts` | Locale singleton, storage key `app-locale`, `setAppLocale`, document `lang`/`dir` |
| Formatting | `frontend/src/i18n/format.ts` | `Intl` helpers: Persian digits for `fa`, Latin digits for `en`, dates |
| Boot | `frontend/src/main.ts` | `app.use(i18n)` then applies the saved locale before mount |
| Styling | `frontend/src/shared/styles/theme.css` | `html[dir='ltr']` font stack and left alignment; Persian keeps Estedad |
| Auth | `LoginPage.vue`, `RegisterPage.vue`, `BaseInput.vue`, `BaseBanner.vue`, `authErrorMessage.ts` | Form labels, validation and API error messages |
| Dashboards | `AdminDashboard.vue`, `InstructorDashboard.vue`, `StudentDashboard.vue`, `PlaceholderPage.vue` | Cards, tables, banners, stats |
| Shell | `DashboardLayout.vue` | Sidebar labels, top bar, role labels, language switcher |
| Admin pages | `ManageInstructorsPage.vue`, `UserManagementPage.vue`, `ServiceQualityPage.vue`, `AdminSettingsPage.vue` | Tables, filters, validation, banners |
| Profile | `ProfilePage.vue` | Sections, fields, level and language labels |
| Routing | `frontend/src/router/index.ts` | `meta.title` now holds a translation key (`nav.titles.*`) |
| Tests | `frontend/tests/setup.ts`, `frontend/tests/unit/i18n.test.ts` | Global i18n plugin, direction/persistence tests |

## Design decisions

1. **One global i18n instance, one storage key.** `setAppLocale(locale)` updates the reactive
   locale, writes `app-locale` to `localStorage`, and sets `<html lang dir>`. On boot the saved
   value wins, with `fa` as the fallback for any unknown or missing value.
2. **Translation keys in route meta.** Page titles come from `nav.titles.*`, so switching language
   re-renders the top bar title without a reload.
3. **Numbers and dates follow the locale.** Counters use `Intl.NumberFormat('fa-IR')` in Persian and
   `en-US` in English; the dashboard date uses the same helper.
4. **Validation messages are translated when the schema is built.** The zod schemas live in
   `<script setup>`, so they read `t()` from the active locale at mount time. Switching language
   re-mounts the page component, which rebuilds the schema.
5. **Language values stay stable.** Teaching-language options keep their Persian labels as the
   stored value and translate only the visible label, so saved profiles are unaffected.

## Verification

- `bun run vitest run` — 92 passed, including `i18n.test.ts` (RTL → LTR switch, `lang`, persisted
  preference and fallback) and the existing dashboard/profile/admin suites still asserting the
  Persian defaults.
- `bun x vite build` — production bundle builds; `vue-i18n` adds roughly 80 kB to the main chunk.
- Not run: `vue-tsc` (the Bun toolchain cannot resolve `.vue` modules in this repository) and
  browser walkthroughs.
