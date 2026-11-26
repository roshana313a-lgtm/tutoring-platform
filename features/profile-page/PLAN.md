# PLAN: Role-Specific Profile Page (Feature 2c)

## Layers touched

| Layer | Files | Responsibility |
| --- | --- | --- |
| Spec / tracking | `features/profile-page/SPEC.md`, `Task-List.md` | Contract and feature status |
| Database | `backend/alembic/versions/0002_add_role_profile_fields.py` | Additive revision for the new `users` columns (portable types, ADR-005) |
| Backend model | `backend/app/models/user.py` | New mapped columns |
| Backend schemas | `backend/app/schemas/auth.py`, `backend/app/schemas/uploads.py` | Role field sets, validation, upload response |
| Backend router | `backend/app/api/v1/auth.py`, `backend/app/api/v1/uploads.py` | Role-gated profile update, avatar upload |
| App wiring | `backend/app/main.py`, `backend/app/core/config.py` | Mount `/media`, configurable media root |
| Frontend page | `frontend/src/features/profile/pages/ProfilePage.vue` | Role-aware form, avatar preview |
| Frontend API | `frontend/src/features/profile/api/avatar.ts`, `frontend/src/features/auth/api/auth.ts` | Upload client, extended `User`/payload types |
| Frontend routing | `frontend/src/router/index.ts`, `frontend/src/features/dashboard/components/DashboardLayout.vue` | `/profile` route, sidebar link for every role |
| Tests | `backend/tests/unit/test_profile_roles.py`, `backend/tests/unit/test_avatar_upload.py`, `frontend/tests/unit/profile.page.test.ts` | Role validation, upload contract, conditional rendering |

## Dependencies & Rationale

- **`python-multipart`** (backend, required): FastAPI only accepts `UploadFile` /
  `multipart/form-data` endpoints when this parser is installed. It is the reference
  implementation, pure Python, and is required by the avatar endpoint rather than by choice.
- **No new frontend dependency.** The avatar upload reuses the existing `axios` HTTP client with
  `FormData`; forms keep the existing `zod` + `vee-validate` stack; icons reuse `lucide-vue-next`.
- **No image library.** Files are stored as received (content-type checked, size capped at 2 MB),
  so no re-encoding or thumbnail dependency is introduced.

## Design decisions

1. **`teaching_languages` is generic `JSON`** holding a list of language names. ADR-005 forbids
   `ARRAY`/`JSONB`; `JSON` behaves identically on SQLite and PostgreSQL.
2. **Role gating lives in the schema.** `ProfileUpdateRequest.fields_for_role()` raises
   `RoleFieldNotAllowedError`, which the router maps to `422 VALIDATION_ERROR` — the same envelope
   used by the existing profile endpoint. Admin is "common only" by construction, since it is
   neither `student` nor `instructor`.
3. **One static zod schema in the page.** Role only decides which fields render and which are sent;
   a computed schema made validation state unstable, so role gating happens when the payload is
   built.
4. **Upload and save are separate requests.** The upload returns a URL which the user record stores
   on save, so abandoning the form leaves the previous avatar intact.
5. **`/profile` is canonical.** `/dashboard/profile` redirects to it so existing links keep working,
   and the sidebar points every role at `/profile`.

## Test plan

- Backend (RED first):
  - student ↔ instructor field rejection for every owned field, admin common-only rule;
  - value constraints (`short_summary` length, negative `hourly_rate`, malformed `date_of_birth`);
  - avatar upload: unauthenticated, stored file + URL, wrong content type, oversized file.
- Frontend: role-specific rendering for student/instructor/admin, 200-character summary limit,
  avatar preview and upload, role-filtered submit payload, empty full-name validation.
- Migration: `alembic upgrade head` then `downgrade 0001_add_user_profile_fields` against a copy of
  an existing database.
