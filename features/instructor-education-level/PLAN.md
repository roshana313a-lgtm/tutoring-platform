# PLAN — Instructor Education Level Dropdown

## Frontend

`frontend/src/features/profile/pages/ProfilePage.vue` follows its existing pattern for
role-specific selects (the student `current_level` select):

- `EDUCATION_OPTIONS` — `{ value, labelKey }` pairs, value = the Persian identifier
  the API and existing records use, label = i18n key.
- `profileSchema` — `education_level: z.string().max(64)`, matching the backend limit.
- `initialValues()` — `auth.user?.education_level ?? ''`, so the form prefills.
- `useField<string>('education_level')` → `educationLevel`.
- Instructor branch of `onSubmit` — `payload.education_level = values.education_level`.
- Template — a `<label class="field">` with `<select data-test="education-level">`
  placed in the instructor field grid next to the hourly rate, plus an empty
  placeholder option so an unset field does not appear as «دیپلم».

Locale keys (`fa.json`, `en.json`): `profile.educationLevel`,
`profile.educationLevelPlaceholder`, `profile.educationOptions.{diploma,bachelor,master,phd}`.

## Backend verification

`ProfileUpdateRequest.education_level` already exists and is not role-restricted;
`PUT /api/v1/auth/profile` writes it through `UserRepository.update`. Two contract
tests are added to `backend/tests/unit/test_profile_roles.py`:

1. An instructor can save `education_level` together with `hourly_rate`,
   `teaching_languages` and `short_summary`, and `GET /api/v1/auth/me` returns it.
2. Oversized values and unknown fields are rejected with `VALIDATION_ERROR`.

## Dependencies & Rationale

No new dependencies; the select reuses vee-validate, zod and vue-i18n, which the page
already uses.

## Tests

`frontend/tests/unit/profile.education.test.ts` (written first, red before the
implementation), run with `"$FREEBUFF_BUN" run vitest run` in `frontend/`:

1. The dropdown renders for an instructor with exactly the four education levels.
2. It is not rendered for a student.
3. A stored education level is preselected.
4. Choosing a level and submitting includes `education_level` in the payload passed to
   `auth.updateProfile` (alongside the other instructor fields).

## Checks

- `"$FREEBUFF_BUN" run vitest run` — full frontend suite.
- `"$FREEBUFF_BUN" x vite build` — production build.
- `python -m pytest -q` in `backend/` — full backend suite, including the new
  instructor `education_level` contract tests.
