import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

import { authGuard } from './guards'

const routes: RouteRecordRaw[] = [
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
    name: 'dashboard',
    component: () => import('../features/dashboard/pages/DashboardPage.vue'),
    beforeEnter: authGuard,
  },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
