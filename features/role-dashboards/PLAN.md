# PLAN: Role-Based Dashboards (Feature 2d)

## Layers touched

| Layer | Files | Responsibility |
| --- | --- | --- |
| Spec / tracking | `features/role-dashboards/SPEC.md`, `Task-List.md` | Contract and feature status |
| Route mapping | `frontend/src/features/dashboard/roleDashboard.ts` | Role → route name, shared by router, sidebar, login |
| Routing | `frontend/src/router/index.ts` | Three dashboard children, `/dashboard` role redirect, placeholder children |
| Pages | `frontend/src/features/dashboard/pages/StudentDashboard.vue`, `InstructorDashboard.vue`, `AdminDashboard.vue` | Role-specific cards and lists |
| Placeholder | `frontend/src/features/dashboard/pages/PlaceholderPage.vue` | Stand-in for sections that have no page yet |
| Layout | `frontend/src/features/dashboard/components/DashboardLayout.vue` | Role-aware «داشبورد» link, unchanged wrapper |
| Auth flow | `frontend/src/features/auth/pages/LoginPage.vue` | Redirect to the role dashboard after login |
| Tests | `frontend/tests/unit/dashboard.roles.test.ts`, `dashboard.sidebar.test.ts`, `profile.display.test.ts` | Redirect mapping, post-login redirect, per-role rendering, sidebar targets |

## Dependencies & Rationale

- **No new dependency.** Pages reuse `lucide-vue-next` icons, `StatusBadge.vue`, the existing
  Pinia auth store and `vue-router`; styling stays in scoped CSS with the current design tokens.
- `DashboardPage.vue` is deleted so a shared dashboard component cannot creep back in.

## Design decisions

1. **One mapping helper, not three conditions.** `dashboardRouteName()` owns the role → route
   name table. The route redirect, the sidebar item and the login redirect call it, so adding or
   renaming a dashboard touches one file.
2. **Unknown role falls back to the student dashboard.** The store can briefly hold no user while
   the session hydrates; a fallback keeps `/dashboard` from redirecting to itself, and the
   `authGuard` already rejects signed-out visitors.
3. **Role dashboards are separate components, not branches inside one page.** Each page owns its
   own template, data shape and styles, which is the point of the feature; the layout stays the
   single wrapper for sidebar and top bar.
4. **Not-yet-built sections use a placeholder page.** The sidebar keeps its existing links, but
   points them at `PlaceholderPage` instead of a dashboard, so clicking them no longer shows
   another role's dashboard under the wrong title.
5. **Role URLs are not access-controlled.** Any authenticated user may open another role's
   dashboard route; authorization per dashboard is deferred until real data arrives.

## Verification

- `vitest run` — new redirect/rendering suites plus the existing sidebar and layout suites.
- `vue-tsc --noEmit` / `vite build` where the toolchain is available (Node is not installed on
  this machine; `vue-tsc` under Bun cannot resolve `.vue` modules, a pre-existing limitation).

## Real-data pass (Feature 2g)

Hardcoded dashboard numbers were removed; every card now reads the database through one API call
per dashboard.

| Piece | File | Notes |
| --- | --- | --- |
| Stats endpoints | `backend/app/api/v1/dashboard.py` | `GET /dashboard/{admin,instructor,student}/stats`, role-guarded with `require_role` |
| Instructor directory | `backend/app/api/v1/instructors.py` | `GET /instructors` — approved + active only, for the student dashboard |
| Admin directory | `backend/app/api/v1/admin.py` | `GET /admin/instructors` (all statuses), `GET /admin/quality` |
| Counts | `backend/app/repositories/user_repository.py` | `count_all`, `count_by_role`, `count_unapproved`, `count_suspended`, `list_role`, `list_approved_instructors` |
| Frontend clients | `frontend/src/features/dashboard/api/stats.ts`, `features/instructors/api/instructors.ts`, `features/admin/api/quality.ts` | Typed wrappers over `http` |
| Admin pages | `frontend/src/features/admin/pages/ManageInstructorsPage.vue`, `ServiceQualityPage.vue` | Status filters, approve/reject (two-step) and suspend actions; quality metrics |

Decisions:

1. **Zero means zero.** Classes, assignments, grades and ratings have no tables yet (Features 4/7/8),
   so those fields return real zeros from the database instead of invented numbers, with a note on
   the service-quality page explaining it.
2. **The approval modal is teleported to `body`.** The dashboard content wrapper animates with
   `animation-fill-mode: both`, which creates a stacking context, so a child `z-index` could never
   beat the sticky top bar; the overlay now lives outside it with `z-index: 9999`, a darker blurred
   backdrop and `2rem` top padding.
3. **Suspension is the only stateful admin action on approved instructors.** Rejecting deletes the
   account, so it is offered only for pending requests and needs an explicit second click.

## Admin overview layout (SaaS pass)

The admin dashboard is now an overview screen instead of three bare cards.

| Piece | Source | Notes |
| --- | --- | --- |
| Welcome banner | `auth.user` | Gradient hero with the admin avatar (initials fallback) and the full Persian date |
| Stat cards | `GET /dashboard/admin/stats` | One icon per metric, 32px padding, hover lift; the pending card links to the pending tab |
| Quick actions | Router | Pending instructor review, user management and platform settings |
| Recent activity | `GET /admin/users` | Newest five by `created_at`, rendered as name / email / role / date with a «مشاهده همه» link |

Decisions:

1. **Recent activity reuses the admin users list.** The endpoint already returns managed users newest
   first, so no new backend route was needed; the client re-sorts defensively before slicing five.
2. **No new dependency.** Icons come from `lucide-vue-next`, formatting from `Intl` (`fa-IR`).
