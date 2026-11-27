<script setup lang="ts">
import { computed, type Component } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChartNoAxesColumn,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  Search,
  Settings,
  TrendingUp,
  UserCheck,
  UserRound,
  Users,
} from 'lucide-vue-next'

import { useAuthStore } from '../../auth/stores/useAuthStore'
import { resolveMediaUrl } from '../../../shared/api/media'
import { dashboardRouteName } from '../roleDashboard'

interface MenuItem {
  label: string
  to: RouteLocationRaw
  icon: Component
}

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const notificationCount = 3

const studentMenu: MenuItem[] = [
  { label: 'جستجوی مدرس', to: { name: 'dashboard-instructor-search' }, icon: Search },
  { label: 'کلاس‌های من', to: { name: 'dashboard-classes' }, icon: CalendarDays },
  { label: 'تکالیف من', to: { name: 'dashboard-homework' }, icon: BookOpen },
  { label: 'پیشرفت من', to: { name: 'dashboard-progress' }, icon: TrendingUp },
  { label: 'پروفایل من', to: { name: 'profile' }, icon: UserRound },
]

const instructorMenu: MenuItem[] = [
  { label: 'کلاس‌های من', to: { name: 'dashboard-classes' }, icon: CalendarDays },
  { label: 'دانشجویان من', to: { name: 'dashboard-students' }, icon: Users },
  { label: 'ارسال تکلیف', to: { name: 'dashboard-homework-new' }, icon: ClipboardList },
  { label: 'ارزیابی‌ها', to: { name: 'dashboard-evaluations' }, icon: ClipboardCheck },
  { label: 'پروفایل من', to: { name: 'profile' }, icon: UserRound },
]

const adminMenu: MenuItem[] = [
  { label: 'مدیریت مدرسان', to: { name: 'dashboard-manage-instructors' }, icon: GraduationCap },
  { label: 'تایید مدرسان', to: { name: 'dashboard-admin-instructors' }, icon: UserCheck },
  { label: 'مدیریت کاربران', to: { name: 'dashboard-admin-users' }, icon: Users },
  { label: 'کیفیت خدمات', to: { name: 'dashboard-quality' }, icon: ChartNoAxesColumn },
  { label: 'تنظیمات', to: { name: 'dashboard-admin-settings' }, icon: Settings },
  { label: 'پروفایل من', to: { name: 'profile' }, icon: UserRound },
]

const dashboardItem = computed<MenuItem>(() => ({
  label: 'داشبورد',
  to: { name: dashboardRouteName(auth.user?.role) },
  icon: LayoutDashboard,
}))

const menuItems = computed<MenuItem[]>(() => {
  switch (auth.user?.role) {
    case 'student':
      return [dashboardItem.value, ...studentMenu]
    case 'instructor':
      return [dashboardItem.value, ...instructorMenu]
    case 'admin':
      return [dashboardItem.value, ...adminMenu]
    default:
      return []
  }
})

const roleLabel = computed(() => {
  switch (auth.user?.role) {
    case 'student':
      return 'زبان آموز'
    case 'instructor':
      return 'مدرس'
    case 'admin':
      return 'مدیر'
    default:
      return '—'
  }
})

const displayName = computed(() => {
  const fullName = auth.user?.full_name?.trim()
  if (fullName) return fullName

  const email = auth.user?.email
  return email ? email.split('@')[0] : '—'
})

const avatarInitial = computed(() => displayName.value.charAt(0).toUpperCase())

const avatarSrc = computed(() => resolveMediaUrl(auth.user?.avatar_url))

const settingsRouteName = computed(() =>
  auth.user?.role === 'admin' ? 'dashboard-admin-settings' : 'dashboard-settings',
)

const pageTitle = computed(() => {
  const title = route.meta.title
  return typeof title === 'string' && title.length > 0 ? title : 'داشبورد'
})

async function logout(): Promise<void> {
  auth.logout()
  await router.push('/login')
}
</script>

<template>
  <div class="dashboard-layout">
    <aside class="sidebar" data-test="sidebar">
      <div class="sidebar-brand">
        <svg class="logo-mark" viewBox="0 0 32 32" aria-hidden="true">
          <path
            d="M16 3C9 7 6 13 8 19c2 6 8 9 8 9s6-3 8-9c2-6-1-12-8-16Z"
            fill="currentColor"
          />
          <path d="M16 27V12" stroke="var(--card-bg)" stroke-width="2" stroke-linecap="round" />
        </svg>
        <div>
          <strong>مؤسسه آموزش آنلاین</strong>
          <span>پنل {{ roleLabel }}</span>
        </div>
      </div>

      <nav class="sidebar-nav" aria-label="منوی داشبورد">
        <RouterLink
          v-for="item in menuItems"
          :key="item.label"
          :to="item.to"
          class="sidebar-link"
          exact-active-class="is-active"
          data-test="sidebar-link"
        >
          <component :is="item.icon" :size="18" :stroke-width="1.9" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="sidebar-footer">
        <RouterLink :to="{ name: settingsRouteName }" class="footer-link">
          <Settings :size="17" />
          <span>تنظیمات</span>
        </RouterLink>
        <a class="footer-link" href="mailto:support@example.com">
          <LifeBuoy :size="17" />
          <span>پشتیبانی</span>
        </a>
      </div>
    </aside>

    <div class="dashboard-shell">
      <header class="topbar">
        <div class="topbar-title">
          <span class="topbar-logo" aria-hidden="true">
            <svg class="logo-mark" viewBox="0 0 32 32">
              <path
                d="M16 3C9 7 6 13 8 19c2 6 8 9 8 9s6-3 8-9c2-6-1-12-8-16Z"
                fill="currentColor"
              />
              <path d="M16 27V12" stroke="var(--card-bg)" stroke-width="2" stroke-linecap="round" />
            </svg>
          </span>
          <div>
            <span class="eyebrow">مؤسسه آموزش آنلاین</span>
            <h1>{{ pageTitle }}</h1>
          </div>
        </div>

        <div class="topbar-actions">
          <label class="global-search">
            <Search :size="17" aria-hidden="true" />
            <input type="search" aria-label="جستجوی سراسری" placeholder="جستجوی سریع..." />
            <kbd>⌘K</kbd>
          </label>

          <button type="button" class="icon-button" aria-label="تنظیمات" data-test="topbar-settings">
            <Settings :size="19" />
          </button>

          <button
            type="button"
            class="icon-button notification-button"
            aria-label="اعلانها"
            data-test="topbar-notifications"
          >
            <Bell :size="19" />
            <span class="notification-badge">{{ notificationCount }}</span>
          </button>

          <div class="user-menu" data-test="topbar-user">
            <span class="avatar" data-test="topbar-avatar">
              <img v-if="avatarSrc" :src="avatarSrc" alt="" />
              <template v-else>{{ avatarInitial }}</template>
            </span>
            <div class="user-meta">
              <span class="user-name">{{ displayName }}</span>
              <span class="user-role">{{ roleLabel }}</span>
            </div>
            <ChevronDown :size="16" class="chevron" aria-hidden="true" />
          </div>

          <button type="button" class="logout-button" data-test="logout" @click="logout">
            خروج
          </button>
        </div>
      </header>

      <main class="dashboard-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.dashboard-layout {
  min-height: 100vh;
  background: var(--bg);
}

.sidebar {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 268px;
  height: 100vh;
  padding: 28px 18px;
  background: var(--card-bg);
  border-left: 1px solid var(--border);
  box-shadow: var(--shadow);
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 8px;
}

.logo-mark {
  flex: none;
  width: 32px;
  height: 32px;
  color: var(--primary);
}

.sidebar-brand strong {
  display: block;
  font-size: var(--font-size-body);
}

.sidebar-brand span {
  display: block;
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sidebar-link {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  overflow: hidden;
  border-radius: var(--radius);
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 500;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
}

.sidebar-link:hover {
  background: var(--primary-light);
  color: var(--primary);
  transform: translateX(-2px);
}

.sidebar-link::before {
  position: absolute;
  top: 50%;
  right: 5px;
  width: 4px;
  height: 22px;
  border-radius: 999px;
  background: var(--primary);
  content: '';
  opacity: 0;
  transform: translateY(-50%) scaleY(0.4);
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.sidebar-link.is-active {
  background: var(--primary);
  color: #fff;
  font-weight: 700;
}

.sidebar-link.is-active::before {
  background: var(--card-bg);
  opacity: 1;
  transform: translateY(-50%) scaleY(1);
}

.sidebar-footer {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: auto;
  padding-top: 18px;
  border-top: 1px solid var(--border);
}

.footer-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: var(--radius);
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.footer-link:hover {
  background: var(--primary-light);
  color: var(--primary);
}

.dashboard-shell {
  min-height: 100vh;
  margin-right: 268px;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 14px 32px;
  background: color-mix(in srgb, var(--card-bg) 88%, transparent);
  border-bottom: 1px solid var(--border);
  box-shadow: var(--shadow);
  backdrop-filter: blur(14px);
}

@supports not (background: color-mix(in srgb, red 50%, blue)) {
  .topbar {
    background: var(--card-bg);
  }
}

.topbar-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.topbar-logo {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius);
  background: var(--primary-light);
}

.topbar-logo .logo-mark {
  width: 22px;
  height: 22px;
}

.eyebrow {
  display: block;
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

h1 {
  margin: 0;
  color: var(--primary);
  font-size: var(--font-size-title);
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.global-search {
  display: flex;
  align-items: center;
  gap: 8px;
  width: min(280px, 30vw);
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg);
  color: var(--text-muted);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.global-search:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.global-search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text);
  font-size: var(--font-size-body);
}

.global-search input::placeholder {
  color: var(--text-muted);
}

.global-search kbd {
  padding: 2px 6px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--card-bg);
  font-size: var(--font-size-xs);
}

.icon-button {
  position: relative;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: var(--card-bg);
  color: var(--text-muted);
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease;
}

.icon-button:hover {
  border-color: var(--primary);
  background: var(--primary-light);
  color: var(--primary);
}

.notification-badge {
  position: absolute;
  top: -4px;
  left: -4px;
  display: grid;
  place-items: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  background: #dc2626;
  color: #fff;
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 10px 5px 6px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--card-bg);
}

.avatar {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  overflow: hidden;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--primary-hover));
  color: #fff;
  font-weight: 700;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-meta {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
  text-align: right;
}

.user-name {
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.user-role {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.chevron {
  color: var(--text-muted);
}

.logout-button {
  padding: 9px 16px;
  border: 1px solid var(--primary);
  border-radius: var(--radius);
  background: transparent;
  color: var(--primary);
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.logout-button:hover {
  background: var(--primary);
  color: #fff;
}

.dashboard-content {
  max-width: 1240px;
  margin: 0 auto;
  padding: 32px;
  animation: content-enter 0.45s ease-out both;
}

@keyframes content-enter {
  from {
    opacity: 0;
    transform: translateY(16px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1100px) {
  .global-search {
    width: 200px;
  }

  .global-search kbd {
    display: none;
  }
}

@media (max-width: 900px) {
  .sidebar {
    position: static;
    width: 100%;
    height: auto;
    padding: 18px;
    border-left: 0;
    border-bottom: 1px solid var(--border);
  }

  .sidebar-nav {
    flex-direction: row;
    overflow-x: auto;
  }

  .sidebar-link {
    white-space: nowrap;
  }

  .sidebar-footer {
    flex-direction: row;
    margin-top: 0;
  }

  .dashboard-shell {
    margin-right: 0;
  }

  .topbar {
    flex-wrap: wrap;
    padding: 16px 18px;
  }

  .global-search {
    order: 3;
    width: 100%;
  }

  .dashboard-content {
    padding: 20px 18px;
  }
}

@media (max-width: 600px) {
  .user-meta,
  .chevron,
  .logout-button {
    display: none;
  }
}
</style>
