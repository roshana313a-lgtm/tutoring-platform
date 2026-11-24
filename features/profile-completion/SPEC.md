# SPEC: User Profile Completion (Onboarding)

## Goal

Let every authenticated user (Student, Instructor, Admin) complete and update a
profile after registration, and surface that profile in the dashboard so the
onboarding step is discoverable and the UI greets users by name.

## Scope

### In scope

- `PUT /api/v1/auth/profile` for the currently authenticated user.
- Retrieval of the same profile fields through `GET /api/v1/auth/me`.
- Common profile fields: `full_name`, `phone_number`, `avatar_url`, `timezone`
  (default `Asia/Tehran`).
- Instructor-only fields: `bio`, `years_of_experience`.
- Student-only fields: `current_level`.
- Frontend profile settings page at `/dashboard/profile` with a sidebar entry
  `پروفایل من`.
- Onboarding banner and name-aware greeting on the dashboard.

### Out of scope

- Real avatar file upload/storage (a placeholder UI control only; `avatar_url`
  is a string supplied by the user).
- Email, password, or role changes through this endpoint.
- Admin-only management of other users' profiles.
- Profile image cropping, CDN integration, and notification settings.

## Data model

Profile data is stored on the existing `users` row via a new Alembic migration:

| Column | Type | Constraints / default |
| --- | --- | --- |
| `full_name` | String(255) | nullable, default `''` |
| `phone_number` | String(50) | nullable, default `''` |
| `avatar_url` | String(1024) | nullable, default `''` |
| `timezone` | String(64) | not null, default `Asia/Tehran` |
| `bio` | Text | nullable, default `''` (instructor only) |
| `years_of_experience` | Integer | nullable, default `0` (instructor only) |
| `current_level` | String(64) | nullable, default `''` (student only) |

One row per user keeps retrieval in the existing `GET /api/v1/auth/me` response
and avoids a second repository/schema surface for data that is always read with
the user.

## Endpoints

### `PUT /api/v1/auth/profile`

Authentication: `Authorization: Bearer <access_token>`.

Request body (all fields optional; omitted fields keep their current value):

```json
{
  "full_name": "علی احمدی",
  "phone_number": "+989121234567",
  "avatar_url": "https://example.com/avatar.png",
  "timezone": "Asia/Tehran",
  "bio": "مدرس زبان انگلیسی",
  "years_of_experience": 5,
  "current_level": "intermediate"
}
```

Success: `200 OK` with the updated `UserResponse` (never `hashed_password`).
The profile fields are included in the response of both this endpoint and
`GET /api/v1/auth/me`.

Errors:

- `401 Unauthorized` with code `INVALID_TOKEN` when the token is missing,
  malformed, expired, or references an unknown user.
- `422 Unprocessable Entity` with code `VALIDATION_ERROR` for invalid values
  (negative `years_of_experience`, over-long strings, or a role-specific field
  supplied by a user of another role).
- All errors use the standard envelope from `docs/architecture/SAD.md` §10.1.

### `GET /api/v1/auth/me`

Extended to return the profile fields listed in the data model. Existing
`id`, `email`, `role`, and `created_at` fields are unchanged.

## Frontend behavior

- `/dashboard/profile` renders `ProfileSettingsPage.vue` inside the dashboard
  layout; a `پروفایل من` sidebar link is available to every role.
- Form fields: `نام و نام خانوادگی`, `شماره تماس`, `عکس پروفایل` (placeholder
  control), plus `بیوگرافی` and `سابقه تدریس` for Instructors only. `timezone`
  and `current_level` are not exposed as inputs in this iteration.
- Submitting persists via `PUT /api/v1/auth/profile` and refreshes the auth
  store so the top bar and greeting immediately reflect `full_name`.
- Top bar shows `user.full_name` when non-empty, otherwise `user.email`.
- Dashboard greeting reads `خوش آمدید، [نام کاربر]` using `full_name` with an
  email-based fallback.
- If `full_name` is empty, `DashboardPage.vue` shows a yellow banner with the
  exact text `لطفاً برای تکمیل حساب خود، اطلاعات پروفایل خود را وارد کنید.` and
  a link to `/dashboard/profile`.

## Acceptance criteria

1. `PUT /api/v1/auth/profile` with a valid token updates and returns every
   supplied common field, including `timezone`.
2. `GET /api/v1/auth/me` after the update returns the same persisted values.
3. An Instructor can set `bio` and `years_of_experience`; a Student can set
   `current_level`; a role-specific field sent by another role returns `422`.
4. Omitted fields keep their previous values; `timezone` defaults to
   `Asia/Tehran` for users who never set it.
5. Unauthenticated requests receive `401`; invalid values receive `422`.
6. The profile page renders all required fields for the right role and submits
   them to the API.
7. The sidebar contains `پروفایل من` and `/dashboard/profile` is reachable.
8. The banner appears only when `full_name` is empty and links to the profile
   page.
9. The top bar and dashboard greeting prefer `full_name` and fall back to email.

## Error cases

| Case | Status | Code |
| --- | --- | --- |
| Missing/invalid/expired token | 401 | `INVALID_TOKEN` |
| Invalid field value or wrong-role field | 422 | `VALIDATION_ERROR` |

## Verification

- Backend: RED-first pytest tests for update + retrieval, then implementation.
- Frontend: Vitest tests for the profile form, validation, role-specific fields,
  banner visibility, and name fallback.
- Lint, type-check, and build must pass where tooling is available.
