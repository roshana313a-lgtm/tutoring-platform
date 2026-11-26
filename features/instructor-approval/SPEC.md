# SPEC: Instructor Approval System (Feature 2e)

## Goal

Instructors register on their own, so an admin has to review each new instructor profile before it
counts as a working instructor. This feature adds the approval flag, the admin review endpoints and
the screens on both sides.

## Scope

### In scope

- `users.is_approved` Boolean column, `NOT NULL DEFAULT false`, added by an Alembic revision.
  Only instructors are gated by it; other roles never read the flag.
- Admin-only endpoints:
  - `GET /api/v1/admin/instructors/pending` — instructors with `role = 'instructor'` and
    `is_approved = false`, ordered by creation date.
  - `PATCH /api/v1/admin/instructors/{id}/approve` — sets `is_approved = true`, returns the user.
  - `PATCH /api/v1/admin/instructors/{id}/reject` — removes the instructor account (`204`).
- `is_approved` is part of every user payload (`UserResponse`), so both the admin list and the
  instructor's own session can see it.
- Admin dashboard: the «مدرسان در انتظار تایید» card links to `/dashboard/admin/instructors`, a
  page listing pending instructors (name, email) with approve and reject actions.
- Admin sidebar entry «تایید مدرسان».
- Instructor dashboard: a yellow banner while `is_approved` is false, titled
  «حساب شما در انتظار تایید مدیر است» with the text
  «پروفایل شما هنوز توسط مدیر تایید نشده است. تا آن زمان در لیست جستجو نمایش داده نمی‌شوید.»

### Out of scope

- Telling the instructor why a request was rejected, or re-applying after rejection.
- Emails or notifications on approval/rejection.
- Blocking the instructor from using the rest of the dashboard (they keep full access).
- Instructor discovery filtering itself (Feature 3 will read `is_approved` when it exists).
- Audit trail of which admin approved what and when.

## API contract

All three endpoints require a bearer token for a user with `role = 'admin'`.

| Request | Result |
| --- | --- |
| `GET /admin/instructors/pending` (admin) | `200` with a JSON array of user objects |
| `GET /admin/instructors/pending` (student/instructor) | `403 FORBIDDEN` |
| `GET /admin/instructors/pending` (no token) | `401 INVALID_TOKEN` |
| `PATCH /admin/instructors/{id}/approve` (admin) | `200` with `is_approved: true` |
| `PATCH /admin/instructors/{id}/reject` (admin) | `204`, account deleted |
| approve/reject unknown id, or a non-instructor id | `404 INSTRUCTOR_NOT_FOUND` |

## Acceptance criteria

1. A freshly registered instructor has `is_approved = false` and appears in the pending list.
2. `GET .../pending` returns only unapproved instructors — not students, admins or approved ones.
3. Approving sets the flag and removes the instructor from the pending list; `/auth/me` reflects it.
4. Rejecting removes the account; that user can no longer log in (`401`).
5. Only admins can call the endpoints; other roles get `403`.
6. The admin card links to the approval page, which lists name + email and approves/rejects in place.
7. The instructor dashboard shows the pending banner only while `is_approved` is false.

## Decisions

- **Reject deletes the account** rather than adding an `is_active` column: the spec allows either,
  and a rejected registration has no data worth keeping yet. Documented here so the choice is
  auditable; a `is_active`/soft-delete column can replace it later without changing the API shape.
- **Existing instructors become pending** when the migration runs (`server_default false`), which
  is the intended one-time review pass once the feature ships.
