<script setup lang="ts">
import { computed, onMounted, ref, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import { Doughnut, Line } from 'vue-chartjs'
import {
  Activity,
  BookOpen,
  ChevronLeft,
  GraduationCap,
  LoaderCircle,
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-vue-next'

import { fetchRegistrationTrend, type RegistrationDay } from '../../admin/api/analytics'
import { fetchAllInstructors } from '../../admin/api/instructors'
import { fetchUsers } from '../../admin/api/users'
import type { User } from '../../auth/api/auth'
import { useAuthStore } from '../../auth/stores/useAuthStore'
import { resolveMediaUrl } from '../../../shared/api/media'
import { formatDate, formatNumber, formatToday } from '../../../i18n/format'
import { fetchAdminStats, type AdminStats } from '../api/stats'

ChartJS.register(
  ArcElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
)

interface StatCard {
  key: 'users' | 'pending' | 'classes'
  title: string
  value: string
  hint: string
  icon: Component
  to: RouteLocationRaw
  cta: string
  testId: string
}

interface QuickAction {
  key: string
  label: string
  description: string
  icon: Component
  to: RouteLocationRaw
}

interface ActivityItem {
  id: string
  kind: 'registered' | 'approved'
  name: string
  date: string
}

const RECENT_LIMIT = 5
const TIMELINE_LIMIT = 5
const TIMELINE_FROM_USERS = 3
const TIMELINE_FROM_INSTRUCTORS = 2

const auth = useAuthStore()
const { t, locale } = useI18n()

const stats = ref<AdminStats | null>(null)
const loading = ref(true)
const loadError = ref('')

const users = ref<User[]>([])
const usersLoading = ref(true)
const usersError = ref('')

const instructors = ref<User[]>([])
const instructorsError = ref('')

const trend = ref<RegistrationDay[]>([])
const trendLoading = ref(true)
const trendError = ref('')

const todayLabel = computed(() => formatToday(locale.value))

const formatCount = (value: number | undefined) =>
  value === undefined ? '—' : formatNumber(value, locale.value)

const cards = computed<StatCard[]>(() => [
  {
    key: 'users',
    title: t('dashboard.admin.stats.users'),
    value: formatCount(stats.value?.total_users),
    hint: t('dashboard.admin.stats.usersHint'),
    icon: Users,
    to: { name: 'dashboard-admin-users' },
    cta: t('dashboard.admin.stats.usersCta'),
    testId: 'admin-stat-users-link',
  },
  {
    key: 'pending',
    title: t('dashboard.admin.stats.pending'),
    value: formatCount(stats.value?.pending_instructors),
    hint: t('dashboard.admin.stats.pendingHint'),
    icon: GraduationCap,
    to: { name: 'dashboard-manage-instructors', query: { status: 'pending' } },
    cta: t('dashboard.admin.stats.pendingCta'),
    testId: 'admin-pending-instructors-link',
  },
  {
    key: 'classes',
    title: t('dashboard.admin.stats.classes'),
    value: formatCount(stats.value?.active_classes),
    hint: t('dashboard.admin.stats.classesHint'),
    icon: BookOpen,
    to: { name: 'dashboard-quality' },
    cta: t('dashboard.admin.stats.classesCta'),
    testId: 'admin-stat-classes-link',
  },
])

const pendingCount = computed(() => stats.value?.pending_instructors ?? 0)
const showAlert = computed(() => pendingCount.value > 0)

const quickActions = computed<QuickAction[]>(() => [
  {
    key: 'approve',
    label: t('dashboard.admin.quickActions.approve'),
    description: t('dashboard.admin.quickActions.approveHint'),
    icon: UserCheck,
    to: { name: 'dashboard-manage-instructors', query: { status: 'pending' } },
  },
  {
    key: 'users',
    label: t('dashboard.admin.quickActions.users'),
    description: t('dashboard.admin.quickActions.usersHint'),
    icon: Users,
    to: { name: 'dashboard-admin-users' },
  },
  {
    key: 'settings',
    label: t('dashboard.admin.quickActions.settings'),
    description: t('dashboard.admin.quickActions.settingsHint'),
    icon: Settings,
    to: { name: 'dashboard-admin-settings' },
  },
])

const recentUsers = computed(() =>
  [...users.value]
    .sort((first, second) => Date.parse(second.created_at) - Date.parse(first.created_at))
    .slice(0, RECENT_LIMIT),
)

const roleRatio = computed(() => {
  let students = 0
  let instructorsCount = 0
  for (const user of users.value) {
    if (user.role === 'student') students += 1
    else if (user.role === 'instructor') instructorsCount += 1
  }
  return { students, instructors: instructorsCount }
})

const registrationValues = computed(() => trend.value.map((day) => day.count))

const registrationLabels = computed(() =>
  trend.value.map((day) =>
    formatDate(day.date, locale.value, { month: 'short', day: 'numeric' }),
  ),
)

const registrationChartData = computed(() => ({
  labels: registrationLabels.value,
  datasets: [
    {
      label: t('dashboard.admin.charts.registrationLabel'),
      data: registrationValues.value,
      borderColor: '#1f6f5c',
      backgroundColor: 'rgba(31, 111, 92, 0.16)',
      pointBackgroundColor: '#1f6f5c',
      pointRadius: 3,
      tension: 0.35,
      fill: true,
    },
  ],
}))

const registrationChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: {
      beginAtZero: true,
      ticks: { precision: 0 },
      grid: { color: 'rgba(0, 0, 0, 0.06)' },
    },
    x: { grid: { display: false } },
  },
}))

const ratioChartData = computed(() => ({
  labels: [
    t('dashboard.admin.charts.students'),
    t('dashboard.admin.charts.instructors'),
  ],
  datasets: [
    {
      data: [roleRatio.value.students, roleRatio.value.instructors],
      backgroundColor: ['#1f6f5c', '#c98a2b'],
      borderWidth: 0,
      hoverOffset: 4,
    },
  ],
}))

const ratioChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '62%',
  plugins: { legend: { position: 'bottom' as const } },
}))

const timeline = computed<ActivityItem[]>(() => {
  const newestUsers = [...users.value]
    .sort((first, second) => Date.parse(second.created_at) - Date.parse(first.created_at))
    .slice(0, TIMELINE_FROM_USERS)
    .map<ActivityItem>((user) => ({
      id: `user-${user.id}`,
      kind: 'registered',
      name: userLabel(user),
      date: user.created_at,
    }))

  const taken = new Set(newestUsers.map((item) => item.id.replace('user-', '')))
  const newestApproved = instructors.value
    .filter((instructor) => instructor.is_approved && !taken.has(instructor.id))
    .sort((first, second) => Date.parse(second.created_at) - Date.parse(first.created_at))
    .slice(0, TIMELINE_FROM_INSTRUCTORS)
    .map<ActivityItem>((instructor) => ({
      id: `instructor-${instructor.id}`,
      kind: 'approved',
      name: userLabel(instructor),
      date: instructor.created_at,
    }))

  return [...newestUsers, ...newestApproved]
    .sort((first, second) => Date.parse(second.date) - Date.parse(first.date))
    .slice(0, TIMELINE_LIMIT)
})

const health = computed(() => [
  {
    key: 'server',
    label: t('dashboard.admin.health.server'),
    ok: !loadError.value,
    okLabel: t('dashboard.admin.health.online'),
    badLabel: t('dashboard.admin.health.degraded'),
  },
  {
    key: 'database',
    label: t('dashboard.admin.health.database'),
    ok: !usersError.value,
    okLabel: t('dashboard.admin.health.connected'),
    badLabel: t('dashboard.admin.health.degraded'),
  },
  {
    key: 'api',
    label: t('dashboard.admin.health.api'),
    ok: !trendError.value && !instructorsError.value,
    okLabel: t('dashboard.admin.health.healthy'),
    badLabel: t('dashboard.admin.health.degraded'),
  },
])

const displayName = computed(() => {
  const fullName = auth.user?.full_name?.trim()
  if (fullName) return fullName

  const email = auth.user?.email
  return email ? email.split('@')[0] : '—'
})

const avatarUrl = computed(() => resolveMediaUrl(auth.user?.avatar_url))
const avatarInitial = computed(() => displayName.value.charAt(0).toUpperCase())

function userLabel(user: User): string {
  const fullName = user.full_name?.trim()
  if (fullName) return fullName
  return user.email.split('@')[0] ?? '—'
}

function userInitial(user: User): string {
  return userLabel(user).charAt(0).toUpperCase()
}

function userAvatar(user: User): string {
  return resolveMediaUrl(user.avatar_url)
}

function roleLabel(role: User['role']): string {
  return role === 'admin' || role === 'instructor' ? t(`roles.${role}`) : t('roles.student')
}

function joinedLabel(value: string): string {
  return formatDate(value, locale.value)
}

function activityLabel(item: ActivityItem): string {
  return item.kind === 'approved'
    ? t('dashboard.admin.timeline.instructorApproved')
    : t('dashboard.admin.timeline.userRegistered')
}

async function loadStats(): Promise<void> {
  loading.value = true
  loadError.value = ''

  try {
    stats.value = await fetchAdminStats()
  } catch {
    loadError.value = t('errors.stats')
  } finally {
    loading.value = false
  }
}

async function loadRecentUsers(): Promise<void> {
  usersLoading.value = true
  usersError.value = ''

  try {
    users.value = await fetchUsers()
  } catch {
    usersError.value = t('errors.recentUsers')
  } finally {
    usersLoading.value = false
  }
}

async function loadInstructors(): Promise<void> {
  instructorsError.value = ''

  try {
    instructors.value = await fetchAllInstructors()
  } catch {
    instructorsError.value = t('errors.instructors')
  }
}

async function loadTrend(): Promise<void> {
  trendLoading.value = true
  trendError.value = ''

  try {
    const response = await fetchRegistrationTrend()
    trend.value = response.days
  } catch {
    trendError.value = t('errors.registrationTrend')
  } finally {
    trendLoading.value = false
  }
}

onMounted(() => {
  void loadStats()
  void loadRecentUsers()
  void loadInstructors()
  void loadTrend()
})
</script>

<template>
  <section class="dashboard-page" data-test="admin-dashboard">
    <header class="hero">
      <div class="hero-main">
        <span class="hero-avatar" data-test="admin-avatar">
          <img v-if="avatarUrl" :src="avatarUrl" alt="" />
          <template v-else>{{ avatarInitial }}</template>
        </span>
        <div class="hero-copy">
          <p class="hero-eyebrow">{{ t('dashboard.admin.eyebrow') }}</p>
          <h2>{{ t('dashboard.welcome', { name: displayName }) }}</h2>
          <p class="hero-subtitle">{{ t('dashboard.admin.subtitle') }}</p>
        </div>
      </div>

      <div class="hero-side">
        <span class="hero-badge">
          <ShieldCheck :size="15" />
          {{ t('dashboard.admin.accessBadge') }}
        </span>
        <span class="hero-date">{{ todayLabel }}</span>
      </div>
    </header>

    <div v-if="showAlert" class="alert-center" data-test="action-center" role="status">
      <span class="alert-icon" aria-hidden="true">
        <UserCheck :size="20" />
      </span>
      <div class="alert-copy">
        <strong>{{ t('dashboard.admin.alert.title', { count: formatNumber(pendingCount, locale) }) }}</strong>
        <span>{{ t('dashboard.admin.alert.hint') }}</span>
      </div>
      <RouterLink
        :to="{ name: 'dashboard-manage-instructors', query: { status: 'pending' } }"
        class="alert-action"
        data-test="action-center-link"
      >
        {{ t('dashboard.admin.alert.action') }}
        <ChevronLeft :size="15" />
      </RouterLink>
    </div>

    <p v-if="loadError" class="banner" role="alert" data-test="admin-stats-error">
      {{ loadError }}
    </p>

    <div class="stat-grid" data-test="admin-stats">
      <RouterLink
        v-for="card in cards"
        :key="card.key"
        :to="card.to"
        class="stat-card stat-card-link"
        :class="`stat-${card.key}`"
        :data-test="card.testId"
      >
        <span class="stat-icon" aria-hidden="true">
          <component :is="card.icon" :size="20" :stroke-width="1.9" />
        </span>
        <span class="stat-label">{{ card.title }}</span>
        <strong class="stat-value" data-test="stat-value">{{ card.value }}</strong>
        <span class="stat-hint">{{ card.hint }}</span>
        <span class="stat-cta">
          {{ card.cta }}
          <ChevronLeft :size="14" />
        </span>
      </RouterLink>
    </div>

    <p v-if="loading" class="loading-note" data-test="admin-stats-loading">
      {{ t('dashboard.admin.statsLoading') }}
    </p>

    <div class="chart-grid" data-test="admin-charts">
      <section class="panel chart-panel">
        <header class="panel-head">
          <div>
            <h3>{{ t('dashboard.admin.charts.registrationsTitle') }}</h3>
            <p>{{ t('dashboard.admin.charts.registrationsSubtitle') }}</p>
          </div>
        </header>

        <p v-if="trendLoading" class="state" data-test="trend-loading">
          <LoaderCircle :size="16" class="spin" />
          {{ t('dashboard.loading') }}
        </p>
        <p v-else-if="trendError" class="state state-error" role="alert" data-test="trend-error">
          {{ trendError }}
        </p>
        <div
          v-else
          class="chart-body"
          data-test="registration-chart"
          :data-values="registrationValues.join(',')"
          :data-labels="registrationLabels.join(',')"
        >
          <Line :data="registrationChartData" :options="registrationChartOptions" />
        </div>
      </section>

      <section class="panel chart-panel">
        <header class="panel-head">
          <div>
            <h3>{{ t('dashboard.admin.charts.ratioTitle') }}</h3>
            <p>{{ t('dashboard.admin.charts.ratioSubtitle') }}</p>
          </div>
        </header>

        <p v-if="usersLoading" class="state" data-test="ratio-loading">
          <LoaderCircle :size="16" class="spin" />
          {{ t('dashboard.loading') }}
        </p>
        <p v-else-if="usersError" class="state state-error" data-test="ratio-error">
          {{ t('errors.recentUsers') }}
        </p>
        <div
          v-else
          class="chart-body chart-body-doughnut"
          data-test="role-ratio-chart"
          :data-values="`${roleRatio.students},${roleRatio.instructors}`"
        >
          <Doughnut :data="ratioChartData" :options="ratioChartOptions" />
        </div>
      </section>
    </div>

    <section class="section" data-test="quick-actions">
      <div class="section-head">
        <h3>{{ t('dashboard.admin.quickActions.title') }}</h3>
        <p>{{ t('dashboard.admin.quickActions.subtitle') }}</p>
      </div>

      <div class="action-grid">
        <RouterLink
          v-for="action in quickActions"
          :key="action.key"
          :to="action.to"
          class="action-card"
          :data-test="`quick-action-${action.key}`"
        >
          <span class="action-icon" aria-hidden="true">
            <component :is="action.icon" :size="22" :stroke-width="1.9" />
          </span>
          <span class="action-body">
            <strong>{{ action.label }}</strong>
            <span class="action-desc">{{ action.description }}</span>
          </span>
          <ChevronLeft class="action-chevron" :size="18" aria-hidden="true" />
        </RouterLink>
      </div>
    </section>

    <div class="content-grid">
      <section class="panel" data-test="recent-activity">
        <header class="panel-head">
          <div>
            <h3>{{ t('dashboard.admin.recent.title') }}</h3>
            <p>{{ t('dashboard.admin.recent.subtitle') }}</p>
          </div>
          <RouterLink
            :to="{ name: 'dashboard-admin-users' }"
            class="panel-link"
            data-test="recent-view-all"
          >
            {{ t('common.viewAll') }}
            <ChevronLeft :size="15" />
          </RouterLink>
        </header>

        <p v-if="usersLoading" class="state" data-test="recent-loading">
          <LoaderCircle :size="16" class="spin" />
          {{ t('dashboard.loading') }}
        </p>
        <p v-else-if="usersError" class="state state-error" role="alert" data-test="recent-error">
          {{ usersError }}
        </p>
        <p v-else-if="recentUsers.length === 0" class="state" data-test="recent-empty">
          {{ t('dashboard.admin.recent.empty') }}
        </p>

        <div v-else class="table-scroll">
          <table class="recent-table">
            <thead>
              <tr>
                <th scope="col">{{ t('dashboard.admin.recent.name') }}</th>
                <th scope="col">{{ t('dashboard.admin.recent.email') }}</th>
                <th scope="col">{{ t('dashboard.admin.recent.role') }}</th>
                <th scope="col">{{ t('dashboard.admin.recent.joined') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in recentUsers" :key="user.id" data-test="recent-user">
                <td>
                  <span class="row-user">
                    <img
                      v-if="userAvatar(user)"
                      :src="userAvatar(user)"
                      class="row-avatar row-avatar-image"
                      alt=""
                      data-test="row-avatar-image"
                    />
                    <span v-else class="row-avatar" aria-hidden="true">{{ userInitial(user) }}</span>
                    <span class="row-name">{{ userLabel(user) }}</span>
                  </span>
                </td>
                <td class="row-email">{{ user.email }}</td>
                <td>
                  <span class="role-chip" :class="`role-${user.role}`" data-test="recent-role">
                    {{ roleLabel(user.role) }}
                  </span>
                </td>
                <td class="row-date">{{ joinedLabel(user.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel" data-test="activity-timeline">
        <header class="panel-head">
          <div>
            <h3>{{ t('dashboard.admin.timeline.title') }}</h3>
            <p>{{ t('dashboard.admin.timeline.subtitle') }}</p>
          </div>
          <span class="panel-icon" aria-hidden="true">
            <Activity :size="18" />
          </span>
        </header>

        <p v-if="usersLoading || instructors.length === 0" class="state" data-test="timeline-loading">
          <LoaderCircle :size="16" class="spin" />
          {{ t('dashboard.loading') }}
        </p>
        <p v-else-if="timeline.length === 0" class="state" data-test="timeline-empty">
          {{ t('dashboard.admin.timeline.empty') }}
        </p>

        <ol v-else class="timeline">
          <li v-for="item in timeline" :key="item.id" class="timeline-item" data-test="activity-item">
            <span class="timeline-dot" :class="`dot-${item.kind}`" aria-hidden="true"></span>
            <div class="timeline-copy">
              <span class="timeline-label">{{ activityLabel(item) }}</span>
              <span class="timeline-name">{{ item.name }}</span>
            </div>
            <span class="timeline-date">{{ joinedLabel(item.date) }}</span>
          </li>
        </ol>
      </section>
    </div>

    <footer class="health" data-test="system-health">
      <span class="health-title">{{ t('dashboard.admin.health.title') }}</span>
      <span
        v-for="item in health"
        :key="item.key"
        class="health-item"
        :class="item.ok ? 'health-ok' : 'health-down'"
        :data-test="`health-${item.key}`"
        :data-state="item.ok ? 'ok' : 'down'"
      >
        <span class="health-dot" aria-hidden="true"></span>
        {{ item.label }}: {{ item.ok ? item.okLabel : item.badLabel }}
      </span>
    </footer>
  </section>
</template>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.hero {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  overflow: hidden;
  padding: 30px 34px;
  border-radius: var(--radius-lg);
  background:
    radial-gradient(circle at 12% 15%, rgba(255, 255, 255, 0.24), transparent 45%),
    linear-gradient(125deg, var(--primary) 0%, var(--primary-hover) 65%, #143c33 100%);
  box-shadow: 0 18px 40px -18px rgba(15, 60, 50, 0.55);
  color: #fff;
}

.hero::after {
  position: absolute;
  top: -70px;
  left: -40px;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  content: '';
  pointer-events: none;
}

.hero-main {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 18px;
  min-width: 0;
}

.hero-avatar {
  display: grid;
  flex: none;
  place-items: center;
  width: 68px;
  height: 68px;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.55);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.16);
  box-shadow: 0 8px 20px -10px rgba(0, 0, 0, 0.6);
  font-size: 1.6rem;
  font-weight: 700;
}

.hero-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-copy {
  min-width: 0;
}

.hero-eyebrow {
  margin: 0 0 6px;
  color: rgba(255, 255, 255, 0.78);
  font-size: var(--font-size-xs);
  letter-spacing: 0.02em;
}

.hero h2 {
  margin: 0;
  color: #fff;
  font-size: var(--font-size-title);
}

.hero-subtitle {
  margin: 8px 0 0;
  color: rgba(255, 255, 255, 0.82);
  font-size: var(--font-size-sm);
}

.hero-side {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  text-align: left;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  font-size: var(--font-size-xs);
  font-weight: 700;
  white-space: nowrap;
}

.hero-date {
  color: rgba(255, 255, 255, 0.8);
  font-size: var(--font-size-xs);
  white-space: nowrap;
}

.alert-center {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  border: 1px solid #f2c14e;
  border-radius: var(--radius-lg);
  background: linear-gradient(120deg, #fff7e3 0%, #fdf1d6 100%);
  box-shadow: 0 10px 24px -18px rgba(146, 64, 14, 0.55);
  color: #92400e;
}

.alert-icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(180, 83, 9, 0.14);
  color: #b45309;
}

.alert-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.alert-copy strong {
  font-size: var(--font-size-sm);
}

.alert-copy span {
  font-size: var(--font-size-xs);
  opacity: 0.85;
}

.alert-action {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 4px;
  padding: 8px 14px;
  border-radius: var(--radius);
  background: #b45309;
  color: #fff;
  font-size: var(--font-size-xs);
  font-weight: 700;
  white-space: nowrap;
}

.alert-action:hover {
  background: #92400e;
  color: #fff;
}

.banner {
  margin: 0;
  padding: 12px 18px;
  border: 1px solid var(--error);
  border-radius: var(--radius);
  background: rgba(185, 28, 28, 0.08);
  color: var(--error);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.stat-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 190px;
  padding: 32px 30px 28px;
  border: 1px solid rgba(31, 111, 92, 0.08);
  border-radius: var(--radius-lg);
  background: linear-gradient(150deg, var(--card-bg) 0%, var(--primary-light) 170%);
  box-shadow: 0 10px 25px -8px rgba(0, 0, 0, 0.08);
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    border-color 0.22s ease;
}

.stat-card:hover {
  border-color: rgba(31, 111, 92, 0.28);
  box-shadow: 0 22px 40px -18px rgba(31, 111, 92, 0.4);
  transform: translateY(-4px);
}

.stat-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: var(--primary-light);
  color: var(--primary);
}

.stat-pending .stat-icon {
  background: rgba(217, 119, 6, 0.14);
  color: #b45309;
}

.stat-classes .stat-icon {
  background: rgba(37, 99, 235, 0.12);
  color: #1d4ed8;
}

.stat-label {
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.stat-value {
  color: var(--primary);
  font-size: 2.4rem;
  line-height: 1.05;
}

.stat-hint {
  margin-top: auto;
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}

.stat-card-link {
  color: inherit;
  text-decoration: none;
  cursor: pointer;
}

.stat-cta {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--primary);
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.loading-note {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}

.chart-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr);
  gap: 20px;
}

.chart-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.chart-body {
  position: relative;
  height: 240px;
}

.chart-body-doughnut {
  height: 240px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.section-head h3,
.panel-head h3 {
  margin: 0;
  color: var(--text);
  font-size: 1.05rem;
}

.section-head p,
.panel-head p {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 18px;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--card-bg);
  box-shadow: 0 6px 18px -12px rgba(0, 0, 0, 0.18);
  color: inherit;
  text-decoration: none;
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    border-color 0.22s ease;
}

.action-card:hover {
  border-color: var(--primary);
  box-shadow: 0 20px 36px -20px rgba(31, 111, 92, 0.45);
  transform: translateY(-3px);
}

.action-icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 16px;
  background: var(--primary-light);
  color: var(--primary);
}

.action-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.action-body strong {
  color: var(--text);
  font-size: var(--font-size-sm);
}

.action-desc {
  color: var(--text-muted);
  font-size: var(--font-size-xs);
  line-height: 1.6;
}

.action-chevron {
  flex: none;
  color: var(--text-muted);
}

.action-card:hover .action-chevron {
  color: var(--primary);
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.panel {
  padding: 22px 26px 10px;
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.panel-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--primary);
  font-size: var(--font-size-xs);
  font-weight: 700;
  white-space: nowrap;
}

.panel-link:hover {
  color: var(--primary-hover);
}

.panel-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: var(--primary-light);
  color: var(--primary);
}

.state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0;
  padding: 32px 0;
  color: var(--text-muted);
  font-size: var(--font-size-sm);
}

.state-error {
  color: var(--error);
}

.spin {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.table-scroll {
  overflow-x: auto;
}

.recent-table {
  width: 100%;
  border-collapse: collapse;
  text-align: right;
}

.recent-table th,
.recent-table td {
  padding: 14px 10px;
  border-bottom: 1px solid var(--border);
  font-size: var(--font-size-sm);
  white-space: nowrap;
}

.recent-table th {
  color: var(--text-muted);
  font-weight: 600;
}

.recent-table tbody tr:last-child td {
  border-bottom: 0;
}

.recent-table tbody tr:hover {
  background: var(--bg);
}

.row-user {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.row-avatar {
  display: grid;
  flex: none;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--primary-light);
  color: var(--primary);
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.row-avatar-image {
  object-fit: cover;
  padding: 0;
}

.row-name {
  font-weight: 600;
}

.row-email,
.row-date {
  color: var(--text-muted);
}

.role-chip {
  padding: 4px 11px;
  border-radius: 999px;
  background: var(--primary-light);
  color: var(--primary);
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.role-instructor {
  background: rgba(37, 99, 235, 0.12);
  color: #1d4ed8;
}

.role-admin {
  background: rgba(217, 119, 6, 0.14);
  color: #b45309;
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding: 8px 0 12px;
  list-style: none;
}

.timeline-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
}

.timeline-item::before {
  position: absolute;
  top: 30px;
  bottom: -12px;
  inset-inline-start: 5px;
  width: 1px;
  background: var(--border);
  content: '';
}

.timeline-item:last-child::before {
  display: none;
}

.timeline-dot {
  flex: none;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--primary);
  box-shadow: 0 0 0 4px var(--primary-light);
}

.dot-approved {
  background: #c98a2b;
  box-shadow: 0 0 0 4px rgba(217, 119, 6, 0.16);
}

.timeline-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.timeline-label {
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}

.timeline-name {
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.timeline-date {
  flex: none;
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}

.health {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 18px;
  padding: 14px 20px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--card-bg);
  box-shadow: var(--shadow);
  font-size: var(--font-size-xs);
}

.health-title {
  color: var(--text-muted);
  font-weight: 700;
}

.health-item {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--text);
  font-weight: 600;
}

.health-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.health-ok {
  color: var(--success);
}

.health-down {
  color: var(--error);
}

@media (max-width: 1100px) {
  .chart-grid,
  .content-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 820px) {
  .hero {
    align-items: flex-start;
    flex-direction: column;
    padding: 24px;
  }

  .hero-side {
    align-items: flex-start;
  }

  .alert-center {
    align-items: flex-start;
    flex-wrap: wrap;
  }
}
</style>
