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
