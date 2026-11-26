import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

import DashboardLayout from '../features/dashboard/components/DashboardLayout.vue'
import { authGuard } from './guards'

const DashboardPage = () => import('../features/dashboard/pages/DashboardPage.vue')
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
        path: '',
        name: 'dashboard',
        component: DashboardPage,
        meta: { title: 'داشبورد' },
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
        component: DashboardPage,
        meta: { title: 'جستجوی مدرس' },
      },
      {
        path: 'classes',
        name: 'dashboard-classes',
        component: DashboardPage,
        meta: { title: 'کلاس‌های من' },
      },
      {
        path: 'homework',
        name: 'dashboard-homework',
        component: DashboardPage,
        meta: { title: 'تکالیف من' },
      },
      {
        path: 'progress',
        name: 'dashboard-progress',
        component: DashboardPage,
        meta: { title: 'پیشرفت من' },
      },
      {
        path: 'students',
        name: 'dashboard-students',
        component: DashboardPage,
        meta: { title: 'دانشجویان من' },
      },
      {
        path: 'homework/new',
        name: 'dashboard-homework-new',
        component: DashboardPage,
        meta: { title: 'ارسال تکلیف' },
      },
      {
        path: 'evaluations',
        name: 'dashboard-evaluations',
        component: DashboardPage,
        meta: { title: 'ارزیابی‌ها' },
      },
      {
        path: 'manage-instructors',
        name: 'dashboard-manage-instructors',
        component: DashboardPage,
        meta: { title: 'مدیریت مدرسان' },
      },
      {
        path: 'users',
        name: 'dashboard-users',
        component: DashboardPage,
        meta: { title: 'مدیریت کاربران' },
      },
      {
        path: 'quality',
        name: 'dashboard-quality',
        component: DashboardPage,
        meta: { title: 'کیفیت خدمات' },
      },
      {
        path: 'settings',
        name: 'dashboard-settings',
        component: DashboardPage,
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
