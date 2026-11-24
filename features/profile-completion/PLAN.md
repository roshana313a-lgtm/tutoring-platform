# PLAN: User Profile Completion (Onboarding)

## Layers touched

| Layer | Files | Responsibility |
| --- | --- | --- |
| Spec / tracking | `features/profile-completion/SPEC.md`, `Task-List.md` | Contract and feature status |
| Backend model | `backend/app/models/user.py` | Portable columns for profile fields (ADR-005) |
| Backend schemas | `backend/app/schemas/auth.py` | Extend `UserResponse`; add `ProfileUpdateRequest` with role-aware validation |
| Backend repository | `backend/app/repositories/user_repository.py` | `update(user, **fields)` with commit + refresh |
| Backend router | `backend/app/api/v1/auth.py` | `PUT /auth/profile`; keep `GET /auth/me` response extended |
| Database | `backend/alembic/…` | Additive revision for the new `users` columns (portable types) |
| Frontend API | `frontend/src/shared/api/http.ts`, `frontend/src/features/auth/api/auth.ts` | Add `http.put` and `updateProfile` |
| Frontend store | `frontend/src/features/auth/stores/useAuthStore.ts` | `updateProfile` action refreshing `user` |
| Frontend routing | `frontend/src/router/index.ts` | `/dashboard/profile` child route |
| Frontend dashboard | `frontend/src/features/dashboard/components/DashboardLayout.vue`, `frontend/src/features/dashboard/pages/DashboardPage.vue` | Sidebar item, name fallback, onboarding banner |
| Frontend profile | `frontend/src/features/profile/pages/ProfileSettingsPage.vue` (new) | vee-validate + zod form and submit |
| Tests (RED first) | `backend/tests/unit/test_profile.py`, `frontend/tests/unit/profile.form.test.ts`, updates to `frontend/tests/unit/dashboard.sidebar.test.ts` | API contract, form behavior, banner/fallback behavior |

Dependency direction stays inward: Router → Service/Dependency → Repository → Model. SQL remains in the repository.

## Data model

Columns are added to `users` (no second table). Types are portable per ADR-005:
`String`, `Text`, and `Integer` with Python-side defaults; no native `ENUM`,
`JSONB`, or dialect-specific SQL.

Role-specific columns live on the same row but are only accepted for their
owning role. Validation lives in `ProfileUpdateRequest`, not in the router.

## Dependencies & Rationale

No new dependencies are introduced.

| Existing dependency | Rationale |
| --- | --- |
| `sqlalchemy[asyncio]`, `aiosqlite`, `asyncpg` | Portable ORM/driver pair for the added columns and repository update (ADR-005). |
| `pydantic` | Request validation (string lengths, non-negative experience) and extended safe user response. |
| `alembic` | Versioned additive migration for the new columns. |
| `pytest`, `pytest-asyncio`, `httpx` | RED-first API contract tests with `ASGITransport`. |
| `axios` (frontend) | `PUT` request through the shared typed HTTP client. |
| `zod`, `vee-validate`, `@vee-validate/zod` | Profile form schema and field validation, matching the auth pages. |
| `vue-router`, `pinia` | Dashboard child route and immediate auth-store refresh after save. |
| `vitest`, `@vue/test-utils`, `happy-dom` | Component tests for the form, banner, and name fallback. |
| `lucide-vue-next` | Sidebar `UserRound` icon, consistent with existing menu icons. |

## Ordered TDD cycle sequence

Each cycle is RED → GREEN → REFACTOR. Tests are written and observed failing
for the expected reason before production code is changed.

1. **Update contract:** `PUT /api/v1/auth/profile` with a valid token returns
   `200` and the supplied `full_name`, `phone_number`, `avatar_url`, `timezone`.
2. **Retrieval contract:** `GET /api/v1/auth/me` after the update returns the
   same persisted values and still omits `hashed_password`.
3. **Partial update:** omitted fields retain their previous values; `timezone`
   defaults to `Asia/Tehran`.
4. **Instructor fields:** `bio` / `years_of_experience` persist for instructors.
5. **Student fields:** `current_level` persists for students.
6. **Role isolation:** a role-specific field sent by another role returns `422`
   with code `VALIDATION_ERROR`.
7. **Validation:** negative experience / over-long strings return `422`.
8. **Authentication:** unauthenticated `PUT` returns `401` `INVALID_TOKEN`.
9. **Frontend form:** renders all common fields, instructor-only fields only
   for instructors, and submits the payload to `PUT /api/v1/auth/profile`.
10. **Frontend display:** sidebar contains `پروفایل من`; top bar and greeting
    prefer `full_name` and fall back to email; banner shows only for an empty
    `full_name` and links to `/dashboard/profile`.
11. **Migration:** additive Alembic revision adds all profile columns on both
    supported dialects.
12. **Documentation:** keep `SPEC.md`, `PLAN.md`, and `Task-List.md` current.

## Verification

- Backend: `python -m pytest tests/unit/test_profile.py -q` (plus the existing auth suite).
- Frontend: `npm run test -- profile.form` and the full `npm run test`.
- `npm run type-check`, `npm run lint`, `git diff --check`.
- Tool availability is reported explicitly if a runner is missing locally.
