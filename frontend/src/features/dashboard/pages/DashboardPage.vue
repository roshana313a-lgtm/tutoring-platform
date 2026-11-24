<script setup lang="ts">
import { computed, type Component } from 'vue'
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  TrendingUp,
  Users,
} from 'lucide-vue-next'

import { useAuthStore } from '../../auth/stores/useAuthStore'
import StatusBadge from '../components/StatusBadge.vue'

interface SummaryCard {
  title: string
  value: string
  hint: string
  icon: Component
  trend: string
  trendIcon: Component
  trendDirection: 'up' | 'down'
}

interface ActivityRow {
  title: string
  date: string
  status: string
  tone: 'success' | 'warning' | 'danger'
}

const auth = useAuthStore()

const studentCards: SummaryCard[] = [
  {
    title: 'کلاس‌های پیش رو',
    value: '—',
    hint: 'جلسات برنامهریزی شده',
    icon: CalendarDays,
    trend: '+12%',
    trendIcon: ArrowUpRight,
    trendDirection: 'up',
  },
  {
    title: 'تکالیف در انتظار',
    value: '—',
    hint: 'تکالیف نیازمند اقدام',
    icon: ClipboardList,
    trend: '-3%',
    trendIcon: ArrowDownRight,
    trendDirection: 'down',
  },
  {
    title: 'نمره میانگین',
    value: '—',
    hint: 'میانگین نمرات شما',
    icon: TrendingUp,
    trend: '+5%',
    trendIcon: ArrowUpRight,
    trendDirection: 'up',
  },
]

const instructorCards: SummaryCard[] = [
  {
    title: 'کلاس‌های امروز',
    value: '—',
    hint: 'جلسات برنامهریزی شده',
    icon: CalendarDays,
    trend: '+8%',
    trendIcon: ArrowUpRight,
    trendDirection: 'up',
  },
  {
    title: 'در انتظار تصحیح',
    value: '—',
    hint: 'تکالیف ارسال شده',
    icon: ClipboardCheck,
    trend: '-6%',
    trendIcon: ArrowDownRight,
    trendDirection: 'down',
  },
  {
    title: 'دانشجویان فعال',
    value: '—',
    hint: 'زبانآموزان در حال تحصیل',
    icon: Users,
    trend: '+14%',
    trendIcon: ArrowUpRight,
    trendDirection: 'up',
  },
]

const adminCards: SummaryCard[] = [
  {
    title: 'درخواست‌های مدرسان',
    value: '—',
    hint: 'در انتظار بررسی',
    icon: GraduationCap,
    trend: '+9%',
    trendIcon: ArrowUpRight,
    trendDirection: 'up',
  },
  {
    title: 'کاربران فعال',
    value: '—',
    hint: 'حسابهای فعال مؤسسه',
    icon: Users,
    trend: '+11%',
    trendIcon: ArrowUpRight,
    trendDirection: 'up',
  },
  {
    title: 'کلاس‌های امروز',
    value: '—',
    hint: 'جلسات برنامهریزی شده',
    icon: CalendarDays,
    trend: '-2%',
    trendIcon: ArrowDownRight,
    trendDirection: 'down',
  },
]

const activities: ActivityRow[] = [
  { title: 'جلسه خصوصی با مدرس', date: 'امروز، ۱۴:۳۰', status: 'تکمیل شده', tone: 'success' },
  { title: 'ارسال تکلیف هفته دوم', date: 'دیروز، ۱۸:۱۰', status: 'در انتظار', tone: 'warning' },
  { title: 'رزرو کلاس آزمایشی', date: '۲۲ آبان ۱۴۰۵', status: 'لغو شده', tone: 'danger' },
]

const weeklyBars = [
  { label: 'شنبه', value: 45 },
  { label: 'یکشنبه', value: 62 },
  { label: 'دوشنبه', value: 38 },
  { label: 'سهشنبه', value: 78 },
  { label: 'چهارشنبه', value: 55 },
  { label: 'پنجشنبه', value: 30 },
  { label: 'جمعه', value: 66 },
]

const cards = computed<SummaryCard[]>(() => {
  switch (auth.user?.role) {
    case 'student':
      return studentCards
    case 'instructor':
      return instructorCards
    case 'admin':
      return adminCards
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
  const email = auth.user?.email
  return email ? email.split('@')[0] : '—'
})
</script>

<template>
  <section class="dashboard-page">
    <div class="welcome">
      <div>
        <p class="eyebrow">نمای کلی</p>
        <h2>خوش آمدید، {{ displayName }}</h2>
        <p class="welcome-subtitle">خلاصهای از وضعیت آموزشی و فعالیتهای اخیر شما</p>
      </div>
      <span class="role-chip">{{ roleLabel }}</span>
    </div>

    <div class="summary-grid" data-test="summary-cards">
      <article v-for="card in cards" :key="card.title" class="stat-card" data-test="summary-card">
        <span class="stat-icon" aria-hidden="true">
          <component :is="card.icon" :size="20" :stroke-width="1.9" />
        </span>
        <span class="card-label">{{ card.title }}</span>
        <strong class="card-value">{{ card.value }}</strong>
        <div class="stat-footer">
          <span class="trend" :class="`trend-${card.trendDirection}`">
            <component :is="card.trendIcon" :size="14" :stroke-width="2.4" />
            {{ card.trend }}
          </span>
          <span class="card-hint">{{ card.hint }}</span>
        </div>
      </article>
    </div>

    <div class="content-grid">
      <section class="activity-card">
        <header class="card-header">
          <div>
            <h2>آخرین فعالیت‌ها</h2>
            <p>آخرین رویدادهای مرتبط با حساب شما</p>
          </div>
          <button type="button" class="view-all">
            مشاهده همه
            <ChevronRight :size="15" />
          </button>
        </header>

        <div class="table-scroll">
          <table class="activity-table">
            <thead>
              <tr>
                <th scope="col">فعالیت</th>
                <th scope="col">تاریخ</th>
                <th scope="col">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="activity in activities" :key="activity.title">
                <td class="activity-title">{{ activity.title }}</td>
                <td>{{ activity.date }}</td>
                <td>
                  <StatusBadge :label="activity.status" :tone="activity.tone" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="chart-card">
        <header class="card-header">
          <div>
            <h2>نمای هفتگی کلاسها</h2>
            <p>تعداد جلسات برگزار شده در هفته</p>
          </div>
          <button type="button" class="view-all">
            مشاهده همه
            <ChevronRight :size="15" />
          </button>
        </header>

        <div class="chart-bars">
          <div v-for="day in weeklyBars" :key="day.label" class="bar-column">
            <div class="bar-track">
              <div class="bar-fill" :style="{ height: `${day.value}%` }"></div>
            </div>
            <span>{{ day.label }}</span>
          </div>
        </div>
      </section>
    </div>
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

.welcome-subtitle {
  margin: 6px 0 0;
  color: var(--text-muted);
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

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.stat-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 168px;
  padding: 30px 26px 24px;
  border: 1px solid rgba(31, 111, 92, 0.08);
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--card-bg) 0%, var(--primary-light) 160%);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(10px);
  animation: card-in 0.5s ease-out both;
}

.stat-card:nth-child(2) {
  animation-delay: 0.07s;
}

.stat-card:nth-child(3) {
  animation-delay: 0.14s;
}

.stat-icon {
  position: absolute;
  top: 20px;
  left: 22px;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: var(--primary);
  color: #fff;
  box-shadow: 0 6px 14px -4px rgba(31, 111, 92, 0.5);
}

.card-label {
  padding-left: 48px;
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.card-value {
  color: var(--primary);
  font-size: var(--font-size-title);
  line-height: 1.1;
}

.stat-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: auto;
}

.trend {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.trend-up {
  background: rgba(22, 163, 74, 0.12);
  color: var(--success);
}

.trend-down {
  background: rgba(185, 28, 28, 0.1);
  color: var(--error);
}

.card-hint {
  color: var(--text-muted);
  font-size: var(--font-size-xs);
  text-align: left;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(280px, 1fr);
  gap: 20px;
}

.activity-card,
.chart-card {
  padding: 24px 26px;
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.card-header h2 {
  margin: 0;
  color: var(--primary);
  font-size: var(--font-size-title);
}

.card-header p {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}

.view-all {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--primary);
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.view-all:hover {
  color: var(--primary-hover);
}

.table-scroll {
  overflow-x: auto;
}

.activity-table {
  width: 100%;
  border-collapse: collapse;
  text-align: right;
}

.activity-table th,
.activity-table td {
  padding: 13px 10px;
  border-bottom: 1px solid var(--border);
  font-size: var(--font-size-sm);
  white-space: nowrap;
}

.activity-table th {
  color: var(--text-muted);
  font-weight: 600;
}

.activity-table tbody tr {
  transition: background 0.2s ease;
}

.activity-table tbody tr:hover {
  background: var(--bg);
}

.activity-title {
  font-weight: 600;
}

.chart-bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
  height: 190px;
  padding-top: 10px;
}

.bar-column {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.bar-track {
  display: flex;
  align-items: flex-end;
  width: 100%;
  max-width: 26px;
  height: 150px;
  border-radius: 999px;
  background: var(--primary-light);
  overflow: hidden;
}

.bar-fill {
  width: 100%;
  border-radius: 999px;
  background: linear-gradient(to top, var(--primary), var(--primary-hover));
  animation: bar-grow 0.6s ease-out both;
  transform-origin: bottom;
}

.bar-column span {
  color: var(--text-muted);
  font-size: var(--font-size-xs);
  white-space: nowrap;
}

@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(18px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bar-grow {
  from {
    transform: scaleY(0);
  }

  to {
    transform: scaleY(1);
  }
}

@media (max-width: 1100px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .welcome {
    align-items: flex-start;
    flex-direction: column;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .card-header {
    flex-direction: column;
  }

  .chart-bars {
    gap: 5px;
  }
}
</style>
