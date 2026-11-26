<script setup lang="ts">
import { computed } from 'vue'
import { CalendarCheck, ChevronLeft, ClipboardCheck, Clock, ShieldAlert } from 'lucide-vue-next'

import { useAuthStore } from '../../auth/stores/useAuthStore'
import StatusBadge from '../components/StatusBadge.vue'

interface StatSummary {
  title: string
  value: string
  hint: string
}

interface BookingRequest {
  student: string
  course: string
  requestedAt: string
  status: string
  tone: 'success' | 'warning' | 'danger'
}

const auth = useAuthStore()

const stats: StatSummary[] = [
  { title: 'کلاس‌های امروز', value: '۳', hint: 'جلسه برنامه‌ریزی شده' },
  { title: 'در انتظار تصحیح', value: '۵', hint: 'تکلیف ارسال شده' },
]

const bookingRequests: BookingRequest[] = [
  {
    student: 'علی احمدی',
    course: 'مکالمه سطح متوسط',
    requestedAt: 'امروز، ۰۹:۱۵',
    status: 'در انتظار تایید',
    tone: 'warning',
  },
  {
    student: 'مریم رستمی',
    course: 'آمادگی آیلتس',
    requestedAt: 'دیروز، ۲۱:۴۰',
    status: 'در انتظار تایید',
    tone: 'warning',
  },
  {
    student: 'حسین نوری',
    course: 'گرامر پیشرفته',
    requestedAt: '۲ روز پیش',
    status: 'تایید شده',
    tone: 'success',
  },
]

const isApproved = computed(() => auth.user?.is_approved !== false)

const displayName = computed(() => {
  const fullName = auth.user?.full_name?.trim()
  if (fullName) return fullName

  const email = auth.user?.email
  return email ? email.split('@')[0] : '—'
})
</script>

<template>
  <section class="dashboard-page" data-test="instructor-dashboard">
    <div v-if="!isApproved" class="approval-banner" data-test="approval-banner">
      <ShieldAlert :size="20" :stroke-width="2" class="approval-icon" aria-hidden="true" />
      <div>
        <strong>حساب شما در انتظار تایید مدیر است</strong>
        <p>
          پروفایل شما هنوز توسط مدیر تایید نشده است. تا آن زمان در لیست جستجو نمایش داده نمی‌شوید.
        </p>
      </div>
    </div>

    <header class="welcome">
      <div>
        <p class="eyebrow">نمای مدرس</p>
        <h2>خوش آمدید، {{ displayName }}</h2>
        <p class="subtitle">برنامه امروز و درخواست‌های رزرو شما</p>
      </div>
      <span class="role-chip">مدرس</span>
    </header>

    <div class="stat-grid" data-test="instructor-stats">
      <article v-for="stat in stats" :key="stat.title" class="stat-card" data-test="instructor-stat">
        <span class="stat-icon" aria-hidden="true">
          <CalendarCheck v-if="stat.title === 'کلاس‌های امروز'" :size="19" :stroke-width="1.9" />
          <ClipboardCheck v-else :size="19" :stroke-width="1.9" />
        </span>
        <span class="stat-label">{{ stat.title }}</span>
        <strong class="stat-value">{{ stat.value }}</strong>
        <span class="stat-hint">{{ stat.hint }}</span>
      </article>
    </div>

    <section class="panel" data-test="booking-requests">
      <header class="panel-header">
        <div>
          <h3>درخواست‌های رزرو</h3>
          <p>رزروهای جدیدی که منتظر پاسخ شما هستند</p>
        </div>
        <RouterLink :to="{ name: 'dashboard-classes' }" class="panel-link">
          مشاهده کلاس‌ها
          <ChevronLeft :size="15" />
        </RouterLink>
      </header>

      <ul class="request-list">
        <li
          v-for="request in bookingRequests"
          :key="request.student"
          class="request-card"
          data-test="booking-request"
        >
          <span class="request-avatar" aria-hidden="true">{{ request.student.charAt(0) }}</span>
          <div class="request-meta">
            <span class="request-name">{{ request.student }}</span>
            <span class="request-course">{{ request.course }}</span>
          </div>
          <span class="request-time">
            <Clock :size="13" :stroke-width="2" />
            {{ request.requestedAt }}
          </span>
          <StatusBadge :label="request.status" :tone="request.tone" />
          <button type="button" class="request-action">بررسی درخواست</button>
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

.approval-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 20px;
  border: 1px solid #fcd34d;
  border-radius: var(--radius-lg);
  background: #fef3c7;
  color: #92400e;
}

.approval-icon {
  flex: none;
  margin-top: 2px;
}

.approval-banner strong {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: 700;
}

.approval-banner p {
  margin: 4px 0 0;
  font-size: var(--font-size-xs);
  line-height: 1.7;
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
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--primary);
  font-size: var(--font-size-sm);
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}

.panel-link:hover {
  color: var(--primary-hover);
}

.request-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.request-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  transition:
    border-color 0.2s ease,
    background 0.2s ease;
}

.request-card:hover {
  border-color: var(--primary);
  background: var(--bg);
}

.request-avatar {
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary-light);
  color: var(--primary);
  font-weight: 700;
}

.request-meta {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.request-name {
  font-size: var(--font-size-sm);
  font-weight: 700;
}

.request-course,
.request-time {
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}

.request-time {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.request-action {
  flex: none;
  padding: 8px 14px;
  border: 1px solid var(--primary);
  border-radius: var(--radius);
  background: transparent;
  color: var(--primary);
  font-family: inherit;
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.request-action:hover {
  background: var(--primary);
  color: #fff;
}

@media (max-width: 600px) {
  .welcome {
    align-items: flex-start;
    flex-direction: column;
  }

  .request-card {
    flex-wrap: wrap;
  }
}
</style>
