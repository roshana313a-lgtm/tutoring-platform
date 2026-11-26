import type { Role } from '../auth/api/auth'

export type DashboardRole = Role | 'admin'

export const DASHBOARD_ROUTE_NAMES: Record<DashboardRole, string> = {
  student: 'dashboard-student',
  instructor: 'dashboard-instructor',
  admin: 'dashboard-admin',
}

/**
 * Route name of the dashboard a role owns. An unknown or not-yet-hydrated role
 * falls back to the student dashboard so `/dashboard` never loops on itself.
 */
export function dashboardRouteName(role?: string | null): string {
  if (role && role in DASHBOARD_ROUTE_NAMES) {
    return DASHBOARD_ROUTE_NAMES[role as DashboardRole]
  }

  return DASHBOARD_ROUTE_NAMES.student
}

export function dashboardLocation(role?: string | null): { name: string } {
  return { name: dashboardRouteName(role) }
}
