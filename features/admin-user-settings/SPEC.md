# SPEC: Admin User Management & Platform Settings (Feature 2f)

## Goal

Finish the admin panel: let an admin see every student and instructor, suspend or restore an
account, and edit the institute-wide settings that the rest of the platform reads.

## Scope

### In scope

- `users.is_active` Boolean (default true) added by an Alembic revision. Suspended accounts keep
  their data but cannot log in.
- Login returns `403 ACCOUNT_SUSPENDED` for a suspended account instead of issuing a token.
- `GET /api/v1/admin/users` — students and instructors, newest first, with id, email, full name,
  role and `is_active`.
- `PATCH /api/v1/admin/users/{id}/suspend` — toggles `is_active` and returns the updated user.
- `platform_settings` key-value table (`platform_name`, `default_hourly_rate`, `support_email`)
  seeded with defaults by the migration.
- `GET /api/v1/admin/settings` and `PUT /api/v1/admin/settings` (partial update, merged result).
- Admin pages at `/dashboard/admin/users` (table: نام، ایمیل، نقش، وضعیت، اقدام) and
  `/dashboard/admin/settings` (form with the three settings).
- Admin sidebar «مدیریت کاربران» and «تنظیمات» now open these pages.

### Out of scope

- Deleting users, changing roles, or editing another user's profile.
- Listing admin accounts in user management, or suspending an admin.
- Revoking tokens already issued before a suspension (they stay valid until they expire).
- Per-institute multi-tenancy: there is exactly one settings row set for the whole platform.
- Auditing which admin changed what.

## API contract

All endpoints require an admin bearer token.

| Request | Result |
| --- | --- |
| `GET /admin/users` | `200` array of students + instructors |
| `PATCH /admin/users/{id}/suspend` | `200` with the toggled `is_active` |
| suspend unknown id or an admin id | `404 USER_NOT_FOUND` |
| non-admin token | `403 FORBIDDEN` |
| no token | `401 INVALID_TOKEN` |
| `POST /auth/login` for a suspended account | `403 ACCOUNT_SUSPENDED` |
| `GET /admin/settings` | `200` with the three settings (defaults when no row exists) |
| `PUT /admin/settings` | `200` with the merged settings; `422 VALIDATION_ERROR` for a bad email, a negative rate, an empty name or an unknown key |

## Acceptance criteria

1. User management lists exactly the students and instructors, with role and `is_active`.
2. Suspending a user makes their next login fail with `403 ACCOUNT_SUSPENDED`; toggling again
   restores access.
3. The button and status chip reflect the new state immediately after the API confirms.
4. Settings load into the form, save through `PUT`, and reject an invalid email or empty name
   before any request is sent.
5. Admins cannot suspend admins, and non-admins cannot call any of these endpoints.
