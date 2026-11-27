import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

import DashboardLayout from '../features/dashboard/components/DashboardLayout.vue'
import { dashboardRouteName } from '../features/dashboard/roleDashboard'
import { useAuthStore } from '../features/auth/stores/useAuthStore'
import { authGuard } from './guards'

const StudentDashboard = () => import('../features/dashboard/pages/StudentDashboard.vue')
const InstructorDashboard = () => import('../features/dashboard/pages/InstructorDashboard.vue')
const AdminDashboard = () => import('../features/dashboard/pages/AdminDashboard.vue')
const PlaceholderPage = () => import('../features/dashboard/pages/PlaceholderPage.vue')
const UserManagementPage = () => import('../features/admin/pages/UserManagementPage.vue')
const AdminSettingsPage = () => import('../features/admin/pages/AdminSettingsPage.vue')
const ManageInstructorsPage = () => import('../features/admin/pages/ManageInstructorsPage.vue')
const ServiceQualityPage = () => import('../features/admin/pages/ServiceQualityPage.vue')
const ComplaintsPage = () => import('../features/admin/pages/ComplaintsPage.vue')
const SupportPage = () => import('../features/support/pages/SupportPage.vue')
const ProfilePage = () => import('../features/profile/pages/ProfilePage.vue')

export const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/login' },
  {
    path: '/login',
    name: 'login',
    component: () => import('../features/auth/pages/LoginPage.vue'),
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('../features/auth/pages/RegisterPage.vue'),
  },
  {
    path: '/dashboard',
    component: DashboardLayout,
    beforeEnter: authGuard,
    children: [
      {
        // Each role owns its own dashboard, so the shared path resolves per role.
        path: '',
        name: 'dashboard',
        redirect: () => ({ name: dashboardRouteName(useAuthStore().user?.role) }),
      },
      {
        path: 'student',
        name: 'dashboard-student',
        component: StudentDashboard,
        meta: { title: 'nav.titles.student' },
      },
      {
        path: 'instructor',
        name: 'dashboard-instructor',
        component: InstructorDashboard,
        meta: { title: 'nav.titles.instructor' },
      },
      {
        path: 'admin',
        name: 'dashboard-admin',
        component: AdminDashboard,
        meta: { title: 'nav.titles.admin' },
      },
      {
        path: 'admin/users',
        name: 'dashboard-admin-users',
        component: UserManagementPage,
        meta: { title: 'nav.titles.users' },
      },
      {
        path: 'admin/settings',
        name: 'dashboard-admin-settings',
        component: AdminSettingsPage,
        meta: { title: 'nav.titles.settings' },
      },
      {
        // Legacy path kept as a redirect so older links keep working.
        path: 'profile',
        name: 'dashboard-profile',
        redirect: { name: 'profile' },
      },
      {
        path: 'instructor-search',
        name: 'dashboard-instructor-search',
        component: PlaceholderPage,
        meta: { title: 'nav.titles.instructorSearch' },
      },
      {
        path: 'classes',
        name: 'dashboard-classes',
        component: PlaceholderPage,
        meta: { title: 'nav.titles.classes' },
      },
      {
        path: 'homework',
        name: 'dashboard-homework',
        component: PlaceholderPage,
        meta: { title: 'nav.titles.homework' },
      },
      {
        path: 'progress',
        name: 'dashboard-progress',
        component: PlaceholderPage,
        meta: { title: 'nav.titles.progress' },
      },
      {
        path: 'students',
        name: 'dashboard-students',
        component: PlaceholderPage,
        meta: { title: 'nav.titles.students' },
      },
      {
        path: 'homework/new',
        name: 'dashboard-homework-new',
        component: PlaceholderPage,
        meta: { title: 'nav.titles.homeworkNew' },
      },
      {
        path: 'evaluations',
        name: 'dashboard-evaluations',
        component: PlaceholderPage,
        meta: { title: 'nav.titles.evaluations' },
      },
      {
        path: 'manage-instructors',
        name: 'dashboard-manage-instructors',
        component: ManageInstructorsPage,
        meta: { title: 'nav.titles.manageInstructors' },
      },
      {
        path: 'users',
        name: 'dashboard-users',
        component: PlaceholderPage,
        meta: { title: 'nav.titles.users' },
      },
      {
        path: 'quality',
        name: 'dashboard-quality',
        component: ServiceQualityPage,
        meta: { title: 'nav.titles.quality' },
      },
      {
        // The admin area deep-links to its own quality path; keep both forms working.
        path: 'admin/quality',
        redirect: { name: 'dashboard-quality' },
      },
      {
        path: 'admin/complaints',
        name: 'dashboard-admin-complaints',
        component: ComplaintsPage,
        meta: { title: 'nav.titles.complaints' },
      },
      {
        path: 'support',
        name: 'dashboard-support',
        component: SupportPage,
        meta: { title: 'nav.titles.support' },
      },
      {
        path: 'settings',
        name: 'dashboard-settings',
        component: PlaceholderPage,
        meta: { title: 'nav.titles.settings' },
      },
    ],
  },
  {
    path: '/profile',
    component: DashboardLayout,
    beforeEnter: authGuard,
    children: [
      {
        path: '',
        name: 'profile',
        component: ProfilePage,
        meta: { title: 'nav.titles.profile' },
      },
    ],
  },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
