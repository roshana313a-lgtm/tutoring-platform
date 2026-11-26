<script setup lang="ts">
import { computed } from 'vue'
import { CalendarClock, ChevronLeft, ClipboardList, Star } from 'lucide-vue-next'

import { useAuthStore } from '../../auth/stores/useAuthStore'

interface StatSummary {
  title: string
  value: string
  hint: string
}

interface SuggestedInstructor {
  name: string
  field: string
  rating: string
  slots: string
}

const auth = useAuthStore()

const stats: StatSummary[] = [
  { title: 'کلاس‌های پیش رو', value: '۲', hint: 'جلسه در هفت روز آینده' },
  { title: 'تکالیف در انتظار', value: '۳', hint: 'تکلیف نیازمند ارسال' },
]

const suggestedInstructors: SuggestedInstructor[] = [
  { name: 'سارا کریمی', field: 'آیلتس و مکالمه', rating: '۴٫۹', slots: '۳ زمان آزاد' },
  { name: 'مهدی رضایی', field: 'گرامر پیشرفته', rating: '۴٫۷', slots: '۵ زمان آزاد' },
  { name: 'نگار موسوی', field: 'انگلیسی تجاری', rating: '۴٫۸', slots: '۲ زمان آزاد' },
]

const displayName = computed(() => {
  const fullName = auth.user?.full_name?.trim()
  if (fullName) return fullName

  const email = auth.user?.email
  return email ? email.split('@')[0] : '—'
})
</script>

<template>
  <section class="dashboard-page" data-test="student-dashboard">
    <header class="welcome">
      <div>
        <p class="eyebrow">نمای دانش‌آموز</p>
        <h2>خوش آمدید، {{ displayName }}</h2>
        <p class="subtitle">کلاس‌ها، تکالیف و مدرسان پیشنهادی شما در یک نگاه</p>
      </div>
      <span class="role-chip">زبان آموز</span>
    </header>

    <div class="stat-grid" data-test="student-stats">
      <article v-for="stat in stats" :key="stat.title" class="stat-card" data-test="student-stat">
        <span class="stat-icon" aria-hidden="true">
          <CalendarClock v-if="stat.title === 'کلاس‌های پیش رو'" :size="19" :stroke-width="1.9" />
          <ClipboardList v-else :size="19" :stroke-width="1.9" />
        </span>
        <span class="stat-label">{{ stat.title }}</span>
        <strong class="stat-value">{{ stat.value }}</strong>
        <span class="stat-hint">{{ stat.hint }}</span>
      </article>
    </div>

    <section class="panel" data-test="suggested-instructors">
      <header class="panel-header">
        <div>
          <h3>مدرسان پیشنهادی</h3>
          <p>مناسب سطح فعلی و هدف یادگیری شما</p>
        </div>
        <RouterLink :to="{ name: 'dashboard-instructor-search' }" class="panel-link">
          جستجوی مدرس
          <ChevronLeft :size="15" />
        </RouterLink>
      </header>

      <ul class="instructor-list">
        <li
          v-for="instructor in suggestedInstructors"
          :key="instructor.name"
          class="instructor-card"
          data-test="suggested-instructor"
        >
          <span class="instructor-avatar" aria-hidden="true">
            {{ instructor.name.charAt(0) }}
          </span>
          <div class="instructor-meta">
            <span class="instructor-name">{{ instructor.name }}</span>
            <span class="instructor-field">{{ instructor.field }}</span>
          </div>
          <span class="instructor-rating">
            <Star :size="14" :stroke-width="2" />
            {{ instructor.rating }}
          </span>
          <span class="instructor-slots">{{ instructor.slots }}</span>
          <button type="button" class="instructor-action">رزرو کلاس</button>
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

.instructor-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.instructor-card {
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

.instructor-card:hover {
  border-color: var(--primary);
  background: var(--bg);
}

.instructor-avatar {
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

.instructor-meta {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.instructor-name {
  font-size: var(--font-size-sm);
  font-weight: 700;
}

.instructor-field,
.instructor-slots {
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}

.instructor-rating {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.instructor-action {
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
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.instructor-action:hover {
  background: var(--primary);
  color: #fff;
}

@media (max-width: 600px) {
  .welcome {
    align-items: flex-start;
    flex-direction: column;
  }

  .instructor-card {
    flex-wrap: wrap;
  }
}
</style>
