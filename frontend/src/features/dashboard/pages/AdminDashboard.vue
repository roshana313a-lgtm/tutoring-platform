<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import { Activity, ChevronLeft, GraduationCap, Server, ShieldCheck, Users } from 'lucide-vue-next'

import { useAuthStore } from '../../auth/stores/useAuthStore'
import StatusBadge from '../components/StatusBadge.vue'

interface StatSummary {
  title: string
  value: string
  hint: string
  to?: RouteLocationRaw
}

interface HealthRow {
  label: string
  value: string
  status: string
  tone: 'success' | 'warning' | 'danger'
}

const auth = useAuthStore()

const stats: StatSummary[] = [
  { title: 'کاربران فعال', value: '۱٬۲۴۸', hint: 'در ۳۰ روز گذشته' },
  {
    title: 'مدرسان در انتظار تایید',
    value: '۷',
    hint: 'درخواست بررسی نشده',
    to: { name: 'dashboard-admin-instructors' },
  },
]

const health: HealthRow[] = [
  { label: 'دسترسی سرویس', value: '۹۹٫۹۸٪', status: 'سالم', tone: 'success' },
  { label: 'میانگین زمان پاسخ', value: '۲۴۰ میلی‌ثانیه', status: 'عادی', tone: 'success' },
  { label: 'صف پردازش پس‌زمینه', value: '۱۲ کار', status: 'کمی شلوغ', tone: 'warning' },
]

const displayName = computed(() => {
  const fullName = auth.user?.full_name?.trim()
  if (fullName) return fullName

  const email = auth.user?.email
  return email ? email.split('@')[0] : '—'
})
</script>

<template>
  <section class="dashboard-page" data-test="admin-dashboard">
    <header class="welcome">
      <div>
        <p class="eyebrow">نمای مدیر</p>
        <h2>خوش آمدید، {{ displayName }}</h2>
        <p class="subtitle">وضعیت کاربران، مدرسان و سلامت سرویس‌های پلتفرم</p>
      </div>
      <span class="role-chip">مدیر</span>
    </header>

    <div class="stat-grid" data-test="admin-stats">
      <component
        :is="stat.to ? RouterLink : 'article'"
        v-for="stat in stats"
        :key="stat.title"
        :to="stat.to"
        class="stat-card"
        :class="{ 'stat-card-link': stat.to }"
        :data-test="stat.to ? 'admin-pending-instructors-link' : 'admin-stat'"
      >
        <span class="stat-icon" aria-hidden="true">
          <Users v-if="stat.title === 'کاربران فعال'" :size="19" :stroke-width="1.9" />
          <GraduationCap v-else :size="19" :stroke-width="1.9" />
        </span>
        <span class="stat-label">{{ stat.title }}</span>
        <strong class="stat-value">{{ stat.value }}</strong>
        <span class="stat-hint">{{ stat.hint }}</span>
        <span v-if="stat.to" class="stat-cta">
          بررسی درخواست‌ها
          <ChevronLeft :size="14" />
        </span>
      </component>
    </div>

    <section class="panel" data-test="platform-health">
      <header class="panel-header">
        <div class="panel-title">
          <span class="panel-icon" aria-hidden="true">
            <Server :size="17" :stroke-width="1.9" />
          </span>
          <div>
            <h3>خلاصه سلامت پلتفرم</h3>
            <p>وضعیت لحظه‌ای سرویس‌های اصلی</p>
          </div>
        </div>
        <RouterLink :to="{ name: 'dashboard-quality' }" class="panel-link">
          کیفیت خدمات
        </RouterLink>
      </header>

      <ul class="health-list">
        <li v-for="row in health" :key="row.label" class="health-row" data-test="health-row">
          <span class="health-icon" aria-hidden="true">
            <Activity v-if="row.tone === 'success'" :size="16" :stroke-width="2" />
            <ShieldCheck v-else :size="16" :stroke-width="2" />
          </span>
          <span class="health-label">{{ row.label }}</span>
          <span class="health-value">{{ row.value }}</span>
          <StatusBadge :label="row.status" :tone="row.tone" />
        </li>
      </ul>
    </section>
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
  min-height: 148px;
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

.panel {
  padding: 24px 26px;
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 10px;
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

.panel-header h3 {
  margin: 0;
  color: var(--primary);
  font-size: var(--font-size-body);
}

.panel-header p {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}

.panel-link {
  color: var(--primary);
  font-size: var(--font-size-sm);
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}

.panel-link:hover {
  color: var(--primary-hover);
}

.health-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.health-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.health-icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: var(--bg);
  color: var(--primary);
}

.health-label {
  flex: 1;
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.health-value {
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  white-space: nowrap;
}

@media (max-width: 600px) {
  .welcome {
    align-items: flex-start;
    flex-direction: column;
  }

  .health-row {
    flex-wrap: wrap;
  }
}
</style>
