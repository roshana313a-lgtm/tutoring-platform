# PLAN: Instructor Approval System (Feature 2e)

## Layers touched

| Layer | Files | Responsibility |
| --- | --- | --- |
| Spec / tracking | `features/instructor-approval/SPEC.md`, `Task-List.md` | Contract and feature status |
| Database | `backend/alembic/versions/0003_add_user_is_approved.py` | `is_approved` column, reversible |
| Backend model | `backend/app/models/user.py` | `is_approved` mapped column |
| Backend schema | `backend/app/schemas/auth.py` | `is_approved` in `UserResponse` |
| Backend repository | `backend/app/repositories/user_repository.py` | `list_unapproved(role)`, `delete(user)` |
| Backend router | `backend/app/api/v1/admin.py` | Pending list, approve, reject (admin only) |
| App wiring | `backend/app/main.py` | Mount the admin router |
| Frontend API | `frontend/src/features/admin/api/instructors.ts`, `frontend/src/shared/api/http.ts` | Approval client, `http.patch` |
| Frontend admin UI | `frontend/src/features/admin/pages/ManageInstructorsPage.vue`, `frontend/src/features/dashboard/pages/AdminDashboard.vue`, `frontend/src/features/dashboard/components/DashboardLayout.vue` | Review queue as the pending tab of the instructor directory, card link, sidebar entry |
| Frontend instructor UI | `frontend/src/features/dashboard/pages/InstructorDashboard.vue` | Pending approval banner |
| Routing | `frontend/src/router/index.ts` | `/dashboard/manage-instructors?status=pending` |
| Types | `frontend/src/features/auth/api/auth.ts` | `User.is_approved` |
| Tests | `backend/tests/unit/test_admin_instructors.py`, `frontend/tests/unit/instructor.approval.test.ts` | Admin-only access, approve/reject, conditional rendering |

## Dependencies & Rationale

- **No new dependency.** The backend reuses `require_role("admin")`, the existing repository and the
  Pydantic response model; the frontend reuses `axios` through the existing `http` client (which
  gains a `patch` method), Pinia, `vue-router` and `lucide-vue-next` icons.

## Design decisions

1. **Authorisation lives in a dependency, not in each handler.** `require_role("admin")` returns the
   current user or `403`, so every new admin endpoint gets the same behaviour for free.
2. **Reject deletes the row.** One endpoint, no new lifecycle column; the decision is recorded in
   the SPEC with the alternative noted.
3. **`is_approved` ships in `UserResponse` for every role.** The instructor UI reads it from the
   session it already has, with no extra request; students/admins simply ignore it.
4. **The banner is informative, not blocking.** An unapproved instructor can still use the
   dashboard; only discovery is meant to hide them (Feature 3).
5. **Approval actions remove the row optimistically after the API confirms**, so the admin sees the
   queue shrink without a refetch.
