# PLAN — Profile Completion Onboarding Banner

## Design

A single presentational component, `ProfileCompletionBanner.vue`, is mounted by all
three dashboards instead of repeating the markup and the condition three times.

- Location: `frontend/src/features/dashboard/components/ProfileCompletionBanner.vue`
  (only dashboards use it).
- State: it imports `useAuthStore` and derives `isIncomplete` with a `computed`, so
  any later assignment to `auth.user` — including the one `updateProfile()` performs
  — re-renders it. No props, no local state to keep in sync.
- Markup: `role="alert"`, `data-test="profile-incomplete-banner"`, and a
  `RouterLink` named `profile` with `data-test="profile-completion-link"`.
- Styling: yellow alert (amber border/background, brown text) matching the existing
  instructor approval banner, so the dashboard keeps one visual language. It wraps
  on narrow screens.
- Copy: `dashboard.profileBanner.text` / `dashboard.profileBanner.action` in
  `locales/fa.json` and `locales/en.json`.

Placement: immediately after each dashboard's header block and before its stat
grid (Instructor dashboard: above the approval banner too; Admin dashboard: above
the action centre).

## Dependencies & Rationale

No new dependencies. `lucide-vue-next`, `vue-i18n`, Pinia and Vue Router are
already used throughout the dashboards; `AlertTriangle` reuses the installed icon
set.

## Tests (written first, red before implementation)

`frontend/tests/unit/dashboard.profile-banner.test.ts`, run with
`"$FREEBUFF_BUN" run vitest run` in `frontend/`:

1. The banner appears on the student, instructor and admin dashboards when
   `full_name` is empty.
2. It is absent on all three when the profile is complete.
3. It also appears when only `phone_number` is missing.
4. Its DOM node precedes the stat grid.
5. Replacing `auth.user` with a complete profile removes it after `nextTick` (the
   reactive contract behind "disappears immediately after saving").
6. The action reads «تکمیل پروفایل» and links to `/profile`.

## Checks

- `"$FREEBUFF_BUN" run vitest run` — full frontend suite, no regressions in the
  existing dashboard tests.
- `"$FREEBUFF_BUN" x vite build` — production build still compiles.
