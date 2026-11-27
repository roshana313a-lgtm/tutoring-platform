<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalendarCheck, ChevronLeft, ClipboardCheck, ClipboardX, ShieldAlert, Users } from 'lucide-vue-next'

import { useAuthStore } from '../../auth/stores/useAuthStore'
import { formatNumber } from '../../../i18n/format'
import { fetchInstructorStats, type InstructorStats } from '../api/stats'
import ProfileCompletionBanner from '../components/ProfileCompletionBanner.vue'

const auth = useAuthStore()
const { t, locale } = useI18n()

const stats = ref<InstructorStats | null>(null)
const loadError = ref('')

const cards = computed(() => {
  const value = (count: number | undefined) =>
    count === undefined ? '—' : formatNumber(count, locale.value)

  return [
    {
      key: 'today' as const,
      title: t('dashboard.instructor.cards.today'),
      value: value(stats.value?.today_classes),
      hint: t('dashboard.instructor.cards.todayHint'),
      icon: CalendarCheck,
    },
    {
      key: 'grading' as const,
      title: t('dashboard.instructor.cards.grading'),
      value: value(stats.value?.pending_grading),
      hint: t('dashboard.instructor.cards.gradingHint'),
      icon: ClipboardCheck,
    },
    {
      key: 'students' as const,
      title: t('dashboard.instructor.cards.students'),
      value: value(stats.value?.total_students),
      hint: t('dashboard.instructor.cards.studentsHint'),
      icon: Users,
    },
  ]
})

const isApproved = computed(() => auth.user?.is_approved !== false)

const displayName = computed(() => {
  const fullName = auth.user?.full_name?.trim()
  if (fullName) return fullName

  const email = auth.user?.email
  return email ? email.split('@')[0] : '—'
})

async function load(): Promise<void> {
  loadError.value = ''

  try {
    stats.value = await fetchInstructorStats()
  } catch {
    loadError.value = t('errors.stats')
  }
}

onMounted(load)
</script>

<template>
  <section class="dashboard-page" data-test="instructor-dashboard">
    <ProfileCompletionBanner />

    <div v-if="!isApproved" class="approval-banner" data-test="approval-banner">
      <ShieldAlert :size="20" :stroke-width="2" class="approval-icon" aria-hidden="true" />
      <div>
        <strong>{{ t('dashboard.instructor.approvalTitle') }}</strong>
        <p>{{ t('dashboard.instructor.approvalText') }}</p>
      </div>
    </div>

    <header class="welcome">
      <div>
        <p class="eyebrow">{{ t('dashboard.instructor.eyebrow') }}</p>
        <h2>{{ t('dashboard.welcome', { name: displayName }) }}</h2>
        <p class="subtitle">{{ t('dashboard.instructor.subtitle') }}</p>
      </div>
      <span class="role-chip">{{ t('roles.instructor') }}</span>
    </header>

    <p v-if="loadError" class="banner" role="alert" data-test="instructor-stats-error">
      {{ loadError }}
    </p>

    <div class="stat-grid" data-test="instructor-stats">
      <article
        v-for="card in cards"
        :key="card.key"
        class="stat-card"
        data-test="instructor-stat"
      >
        <span class="stat-icon" aria-hidden="true">
          <component :is="card.icon" :size="19" :stroke-width="1.9" />
        </span>
        <span class="stat-label">{{ card.title }}</span>
        <strong class="stat-value" data-test="stat-value">{{ card.value }}</strong>
        <span class="stat-hint">{{ card.hint }}</span>
      </article>
    </div>

    <section class="panel" data-test="booking-requests">
      <header class="panel-header">
        <div>
          <h3>{{ t('dashboard.instructor.bookings.title') }}</h3>
          <p>{{ t('dashboard.instructor.bookings.subtitle') }}</p>
        </div>
        <RouterLink :to="{ name: 'dashboard-classes' }" class="panel-link">
          {{ t('dashboard.instructor.bookings.viewClasses') }}
          <ChevronLeft :size="15" />
        </RouterLink>
      </header>

      <p class="empty-state" data-test="booking-empty">
        <ClipboardX :size="18" />
        {{ t('dashboard.instructor.bookings.empty') }}
      </p>
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

.empty-state {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  padding: 26px 18px;
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  line-height: 1.8;
}

@media (max-width: 600px) {
  .welcome {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
