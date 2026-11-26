# SPEC: Role-Based Dashboards (Feature 2d)

## Goal

Replace the single shared `DashboardPage.vue` — which only swapped card data and menus — with a
dedicated dashboard view and route per role, so each role lands on a page built for its own job.

## Scope

### In scope

- Three routes inside the existing `DashboardLayout`:
  - `/dashboard/student` → `StudentDashboard.vue` (`dashboard-student`)
  - `/dashboard/instructor` → `InstructorDashboard.vue` (`dashboard-instructor`)
  - `/dashboard/admin` → `AdminDashboard.vue` (`dashboard-admin`)
- `/dashboard` redirects to the dashboard owned by `useAuthStore().user.role`.
- Login pushes the role dashboard instead of the shared `/dashboard`.
- Sidebar «داشبورد» link targets the role dashboard; `DashboardLayout.vue` (sidebar + top bar)
  stays the wrapper for all three pages.
- Sections per role:
  - **Student:** «کلاس‌های پیش رو», «تکالیف در انتظار», «مدرسان پیشنهادی» list.
  - **Instructor:** «کلاس‌های امروز», «در انتظار تصحیح», «درخواست‌های رزرو» list.
  - **Admin:** «کاربران فعال», «مدرسان در انتظار تایید», platform health summary.
- Primary navigation entries that have no page yet render `PlaceholderPage.vue` instead of
  reusing a dashboard component.

### Out of scope

- Real data from the API (cards keep static demo values until the owning features exist).
- Blocking a role from opening another role's dashboard URL.
- New sidebar items, notifications, search behaviour, or charts beyond the health summary.

## Routing contract

| Request | Signed in as | Result |
| --- | --- | --- |
| `/dashboard` | student | redirect `/dashboard/student` |
| `/dashboard` | instructor | redirect `/dashboard/instructor` |
| `/dashboard` | admin | redirect `/dashboard/admin` |
| `/dashboard` | unknown/empty role | redirect `/dashboard/student` (never loops) |
| `/dashboard/student` | any authenticated role | renders `StudentDashboard` |
| any `/dashboard/*` | signed out | `authGuard` → `/login?redirect=...` |

`dashboardRouteName(role)` in `frontend/src/features/dashboard/roleDashboard.ts` is the single
source of that mapping; the router redirect, the sidebar link and the login redirect all use it.

## Acceptance criteria

1. `/dashboard` resolves to the role dashboard for each of the three roles.
2. Login lands on the role dashboard, not on `/dashboard`.
3. The sidebar «داشبورد» entry points at the role dashboard and is active there.
4. Each dashboard renders only its own cards and list; the other roles' sections are absent.
5. Vitest covers the redirect mapping, the post-login redirect and per-role rendering.
