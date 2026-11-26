# PLAN: Admin User Management & Platform Settings (Feature 2f)

## Layers touched

| Layer | Files | Responsibility |
| --- | --- | --- |
| Spec / tracking | `features/admin-user-settings/SPEC.md`, `Task-List.md` | Contract and feature status |
| Database | `backend/alembic/versions/0004_add_is_active_and_settings.py` | `users.is_active`, `platform_settings` + seeded defaults |
| Backend models | `backend/app/models/user.py`, `backend/app/models/setting.py` | `is_active`, `PlatformSetting` |
| Backend auth | `backend/app/services/auth_service.py`, `backend/app/core/errors.py`, `backend/app/api/v1/auth.py` | Suspended login → `403 ACCOUNT_SUSPENDED` |
| Backend schemas | `backend/app/schemas/admin.py`, `backend/app/schemas/auth.py` | Settings DTOs, `is_active` on the user payload |
| Backend repository | `backend/app/repositories/user_repository.py`, `setting_repository.py` | `list_by_roles`, settings get/upsert |
| Backend router | `backend/app/api/v1/admin.py` | Users list, suspend toggle, settings get/put |
| Backend service | `backend/app/services/platform_settings.py` | Defaults and merged settings response |
| Frontend API | `frontend/src/features/admin/api/users.ts`, `settings.ts` | Typed clients |
| Frontend pages | `frontend/src/features/admin/pages/UserManagementPage.vue`, `AdminSettingsPage.vue` | Table with suspend toggle, settings form |
| Routing / nav | `frontend/src/router/index.ts`, `frontend/src/features/dashboard/components/DashboardLayout.vue` | Two admin routes, sidebar entries repointed |
| Tests | `backend/tests/unit/test_admin_users.py`, `test_admin_settings.py`, `frontend/tests/unit/admin.panel.test.ts` | Access rules, suspension lifecycle, settings validation, page behaviour |

## Dependencies & Rationale

- **No new dependency.** Suspension reuses the existing `require_role("admin")` dependency and the
  user repository; settings use one SQLAlchemy model and the existing async session. The frontend
  reuses `axios` (`http.patch`/`http.put`), Pinia, `vue-router` and `lucide-vue-next`.
- Settings values are stored as strings in a key-value table, so adding a setting later needs no
  migration; the API converts `default_hourly_rate` to an integer at the boundary.

## Design decisions

1. **One toggle endpoint, not separate suspend/activate routes.** `PATCH .../suspend` flips the
   flag, so the UI has a single action per row and cannot desynchronise from the server.
2. **Admins are outside user management.** Listing and suspending are limited to students and
   instructors, which prevents an admin locking out the only admin account by accident.
3. **`is_active` is checked at login only.** Already-issued tokens stay valid until expiry; token
   revocation is a separate concern (needs a token blacklist or short TTLs).
4. **Defaults live in code and in the migration.** The migration seeds rows for real databases,
   while `build_settings()` supplies the same defaults for a fresh database whose table is empty,
   so `GET` never returns a half-filled object.
5. **`PUT` accepts a partial body.** The form sends all three fields, but the endpoint merges, which
   keeps it usable for one-off changes and keeps unknown keys rejected by `extra="forbid"`.
