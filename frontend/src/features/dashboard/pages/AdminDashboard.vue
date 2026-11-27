<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import { CalendarDays, GraduationCap, Users } from 'lucide-vue-next'

import { useAuthStore } from '../../auth/stores/useAuthStore'
import { fetchAdminStats, type AdminStats } from '../api/stats'

interface StatCard {
  key: 'users' | 'pending' | 'classes'
  title: string
  value: string
  hint: string
  to?: RouteLocationRaw
}

const auth = useAuthStore()

const stats = ref<AdminStats | null>(null)
const loading = ref(true)
const loadError = ref('')

const formatter = new Intl.NumberFormat('fa-IR')

function formatNumber(value: number): string {
  return formatter.format(value)
}

const cards = computed<StatCard[]>(() => {
  const value = (count: number | undefined) =>
    count === undefined ? '—' : formatNumber(count)

  return [
    {
      key: 'users',
      title: 'کاربران فعال',
      value: value(stats.value?.total_users),
      hint: 'همه حساب‌های ثبت‌شده',
    },
    {
      key: 'pending',
      title: 'مدرسان در انتظار تایید',
      value: value(stats.value?.pending_instructors),
      hint: 'درخواست بررسی نشده',
      to: { name: 'dashboard-manage-instructors', query: { status: 'pending' } },
    },
    {
      key: 'classes',
      title: 'کلاس‌های فعال',
      value: value(stats.value?.active_classes),
      hint: 'جلسات در حال برگزاری',
    },
  ]
})

const displayName = computed(() => {
  const fullName = auth.user?.full_name?.trim()
  if (fullName) return fullName

  const email = auth.user?.email
  return email ? email.split('@')[0] : '—'
})

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''

  try {
    stats.value = await fetchAdminStats()
  } catch {
    loadError.value = 'دریافت آمار داشبورد ناموفق بود.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="dashboard-page" data-test="admin-dashboard">
    <header class="welcome">
      <div>
        <p class="eyebrow">نمای مدیر</p>
        <h2>خوش آمدید، {{ displayName }}</h2>
        <p class="subtitle">آمار زنده کاربران و مدرسان مؤسسه</p>
      </div>
      <span class="role-chip">مدیر</span>
    </header>

    <p v-if="loadError" class="banner" role="alert" data-test="admin-stats-error">
      {{ loadError }}
    </p>

    <div class="stat-grid" data-test="admin-stats">
      <component
        :is="card.to ? RouterLink : 'article'"
        v-for="card in cards"
        :key="card.key"
        :to="card.to"
        class="stat-card"
        :class="{ 'stat-card-link': card.to }"
        :data-test="card.to ? 'admin-pending-instructors-link' : `admin-stat-${card.key}`"
      >
        <span class="stat-icon" aria-hidden="true">
          <Users v-if="card.key === 'users'" :size="19" :stroke-width="1.9" />
          <GraduationCap v-else-if="card.key === 'pending'" :size="19" :stroke-width="1.9" />
          <CalendarDays v-else :size="19" :stroke-width="1.9" />
        </span>
        <span class="stat-label">{{ card.title }}</span>
        <strong class="stat-value" data-test="stat-value">{{ card.value }}</strong>
        <span class="stat-hint">{{ card.hint }}</span>
        <span v-if="card.to" class="stat-cta">بررسی درخواست‌ها</span>
      </component>
    </div>

    <p v-if="loading" class="loading-note" data-test="admin-stats-loading">در حال بروزرسانی آمار…</p>
  </section>
</template>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.welcome {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 24px 28px;
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}

.eyebrow {
  margin: 0 0 4px;
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}

.welcome h2 {
  margin: 0;
  color: var(--primary);
  font-size: var(--font-size-title);
}

.subtitle {
  margin: 6px 0 0;
  color: var(--text-muted);
  font-size: var(--font-size-sm);
}

.role-chip {
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--primary-light);
  color: var(--primary);
  font-size: var(--font-size-sm);
  font-weight: 600;
  white-space: nowrap;
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
  gap: 8px;
  min-height: 168px;
  padding: 26px 26px 22px;
  border: 1px solid rgba(31, 111, 92, 0.08);
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--card-bg) 0%, var(--primary-light) 160%);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
}

.stat-icon {
  position: absolute;
  top: 22px;
  left: 24px;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: var(--primary);
  color: #fff;
}

.stat-label {
  padding-left: 48px;
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.stat-value {
  color: var(--primary);
  font-size: var(--font-size-title);
  line-height: 1.1;
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
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.stat-card-link:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 30px -8px rgba(31, 111, 92, 0.25);
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

@media (max-width: 600px) {
  .welcome {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
