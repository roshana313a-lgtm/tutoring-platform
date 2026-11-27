<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  CalendarClock,
  ChevronLeft,
  ClipboardList,
  LoaderCircle,
  Star,
  UserRoundSearch,
} from 'lucide-vue-next'

import { useAuthStore } from '../../auth/stores/useAuthStore'
import { resolveMediaUrl } from '../../../shared/api/media'
import { formatNumber } from '../../../i18n/format'
import { fetchStudentStats, type StudentStats } from '../api/stats'
import { fetchInstructors, type InstructorListItem } from '../../instructors/api/instructors'
import ProfileCompletionBanner from '../components/ProfileCompletionBanner.vue'

const auth = useAuthStore()
const { t, locale } = useI18n()

const stats = ref<StudentStats | null>(null)
const statsError = ref('')
const instructors = ref<InstructorListItem[]>([])
const instructorsLoading = ref(true)
const instructorsError = ref('')

const cards = computed(() => {
  const grade = stats.value?.average_grade ?? 0
  const value = (count: number | undefined) =>
    count === undefined ? '—' : formatNumber(count, locale.value)

  return [
    {
      key: 'upcoming' as const,
      title: t('dashboard.student.cards.upcoming'),
      value: value(stats.value?.upcoming_classes),
      hint: t('dashboard.student.cards.upcomingHint'),
      icon: CalendarClock,
    },
    {
      key: 'homework' as const,
      title: t('dashboard.student.cards.homework'),
      value: value(stats.value?.pending_homework),
      hint: t('dashboard.student.cards.homeworkHint'),
      icon: ClipboardList,
    },
    {
      key: 'grade' as const,
      title: t('dashboard.student.cards.grade'),
      value: grade > 0 ? grade.toFixed(1) : '—',
      hint: grade > 0 ? t('dashboard.student.cards.gradeHint') : t('dashboard.student.cards.noGrade'),
      icon: Star,
    },
  ]
})

function instructorName(instructor: InstructorListItem): string {
  const fullName = instructor.full_name?.trim()
  if (fullName) return fullName
  return instructor.email.split('@')[0] ?? '—'
}

function instructorLanguages(instructor: InstructorListItem): string {
  const languages = instructor.teaching_languages ?? []
  if (languages.length === 0) return t('dashboard.student.instructors.noLanguage')
  return languages.join(locale.value === 'fa' ? '، ' : ', ')
}

function instructorRate(instructor: InstructorListItem): string {
  if (!instructor.hourly_rate) return t('common.negotiable')
  return `${formatNumber(instructor.hourly_rate, locale.value)} ${t('common.perHour')}`
}

const displayName = computed(() => {
  const fullName = auth.user?.full_name?.trim()
  if (fullName) return fullName

  const email = auth.user?.email
  return email ? email.split('@')[0] : '—'
})

async function loadStats(): Promise<void> {
  statsError.value = ''

  try {
    stats.value = await fetchStudentStats()
  } catch {
    statsError.value = t('errors.stats')
  }
}

async function loadInstructors(): Promise<void> {
  instructorsLoading.value = true
  instructorsError.value = ''

  try {
    instructors.value = await fetchInstructors()
  } catch {
    instructorsError.value = t('errors.instructors')
  } finally {
    instructorsLoading.value = false
  }
}

onMounted(() => {
  void loadStats()
  void loadInstructors()
})
</script>

<template>
  <section class="dashboard-page" data-test="student-dashboard">
    <header class="welcome">
      <div>
        <p class="eyebrow">{{ t('dashboard.student.eyebrow') }}</p>
        <h2>{{ t('dashboard.welcome', { name: displayName }) }}</h2>
        <p class="subtitle">{{ t('dashboard.student.subtitle') }}</p>
      </div>
      <span class="role-chip">{{ t('roles.student') }}</span>
    </header>

    <ProfileCompletionBanner />

    <p v-if="statsError" class="banner" role="alert" data-test="student-stats-error">
      {{ statsError }}
    </p>

    <div class="stat-grid" data-test="student-stats">
      <article v-for="card in cards" :key="card.key" class="stat-card" data-test="student-stat">
        <span class="stat-icon" aria-hidden="true">
          <component :is="card.icon" :size="19" :stroke-width="1.9" />
        </span>
        <span class="stat-label">{{ card.title }}</span>
        <strong class="stat-value" data-test="stat-value">{{ card.value }}</strong>
        <span class="stat-hint">{{ card.hint }}</span>
      </article>
    </div>

    <section class="panel" data-test="suggested-instructors">
      <header class="panel-header">
        <div>
          <h3>{{ t('dashboard.student.instructors.title') }}</h3>
          <p>{{ t('dashboard.student.instructors.subtitle') }}</p>
        </div>
        <RouterLink :to="{ name: 'dashboard-student-discover' }" class="panel-link">
          {{ t('dashboard.student.instructors.search') }}
          <ChevronLeft :size="15" />
        </RouterLink>
      </header>

      <p v-if="instructorsLoading" class="state" data-test="instructors-loading">
        <LoaderCircle :size="16" class="spin" />
        {{ t('dashboard.loading') }}
      </p>

      <p v-else-if="instructorsError" class="banner" role="alert" data-test="instructors-error">
        {{ instructorsError }}
      </p>

      <p v-else-if="instructors.length === 0" class="empty-state" data-test="instructors-empty">
        <UserRoundSearch :size="18" />
        {{ t('dashboard.student.instructors.empty') }}
      </p>

      <ul v-else class="instructor-list">
        <li
          v-for="instructor in instructors"
          :key="instructor.id"
          class="instructor-card"
          data-test="suggested-instructor"
        >
          <span class="instructor-avatar" aria-hidden="true">
            <img
              v-if="instructor.avatar_url"
              :src="resolveMediaUrl(instructor.avatar_url)"
              :alt="instructorName(instructor)"
            />
            <template v-else>{{ instructorName(instructor).charAt(0) }}</template>
          </span>
          <div class="instructor-meta">
            <span class="instructor-name">{{ instructorName(instructor) }}</span>
            <span class="instructor-field">{{ instructorLanguages(instructor) }}</span>
          </div>
          <span class="instructor-rate">{{ instructorRate(instructor) }}</span>
          <RouterLink
            :to="{ name: 'dashboard-student-discover-detail', params: { id: instructor.id } }"
            class="instructor-action"
          >
            {{ t('dashboard.student.instructors.viewProfile') }}
          </RouterLink>
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

.state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0;
  padding: 28px 0;
  color: var(--text-muted);
  font-size: var(--font-size-sm);
}

.spin {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
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
  overflow: hidden;
  border-radius: 50%;
  background: var(--primary-light);
  color: var(--primary);
  font-weight: 700;
}

.instructor-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
.instructor-rate {
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}

.instructor-rate {
  white-space: nowrap;
}

.instructor-action {
  flex: none;
  padding: 8px 14px;
  border: 1px solid var(--primary);
  border-radius: var(--radius);
  color: var(--primary);
  font-size: var(--font-size-xs);
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
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
