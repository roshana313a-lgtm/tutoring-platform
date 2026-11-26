import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

import DashboardLayout from '../features/dashboard/components/DashboardLayout.vue'
import { dashboardRouteName } from '../features/dashboard/roleDashboard'
import { useAuthStore } from '../features/auth/stores/useAuthStore'
import { authGuard } from './guards'

const StudentDashboard = () => import('../features/dashboard/pages/StudentDashboard.vue')
const InstructorDashboard = () => import('../features/dashboard/pages/InstructorDashboard.vue')
const AdminDashboard = () => import('../features/dashboard/pages/AdminDashboard.vue')
const PlaceholderPage = () => import('../features/dashboard/pages/PlaceholderPage.vue')
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
        meta: { title: 'داشبورد زبان‌آموز' },
      },
      {
        path: 'instructor',
        name: 'dashboard-instructor',
        component: InstructorDashboard,
        meta: { title: 'داشبورد مدرس' },
      },
      {
        path: 'admin',
        name: 'dashboard-admin',
        component: AdminDashboard,
        meta: { title: 'داشبورد مدیر' },
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
        meta: { title: 'جستجوی مدرس' },
      },
      {
        path: 'classes',
        name: 'dashboard-classes',
        component: PlaceholderPage,
        meta: { title: 'کلاس‌های من' },
      },
      {
        path: 'homework',
        name: 'dashboard-homework',
        component: PlaceholderPage,
        meta: { title: 'تکالیف من' },
      },
      {
        path: 'progress',
        name: 'dashboard-progress',
        component: PlaceholderPage,
        meta: { title: 'پیشرفت من' },
      },
      {
        path: 'students',
        name: 'dashboard-students',
        component: PlaceholderPage,
        meta: { title: 'دانشجویان من' },
      },
      {
        path: 'homework/new',
        name: 'dashboard-homework-new',
        component: PlaceholderPage,
        meta: { title: 'ارسال تکلیف' },
      },
      {
        path: 'evaluations',
        name: 'dashboard-evaluations',
        component: PlaceholderPage,
        meta: { title: 'ارزیابی‌ها' },
      },
      {
        path: 'manage-instructors',
        name: 'dashboard-manage-instructors',
        component: PlaceholderPage,
        meta: { title: 'مدیریت مدرسان' },
      },
      {
        path: 'users',
        name: 'dashboard-users',
        component: PlaceholderPage,
        meta: { title: 'مدیریت کاربران' },
      },
      {
        path: 'quality',
        name: 'dashboard-quality',
        component: PlaceholderPage,
        meta: { title: 'کیفیت خدمات' },
      },
      {
        path: 'settings',
        name: 'dashboard-settings',
        component: PlaceholderPage,
        meta: { title: 'تنظیمات' },
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
        meta: { title: 'پروفایل من' },
      },
    ],
  },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
