<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { ArrowRight, CalendarPlus, GraduationCap, LoaderCircle, Star, UserRoundSearch } from 'lucide-vue-next'

import { resolveMediaUrl } from '../../../shared/api/media'
import { formatNumber } from '../../../i18n/format'
import { fetchInstructor, type InstructorProfile } from '../api/instructors'

const route = useRoute()
const { t, locale } = useI18n()

const profile = ref<InstructorProfile | null>(null)
const loading = ref(true)
const error = ref('')

const instructorId = computed(() => String(route.params.id ?? ''))

const displayName = computed(() => {
  const fullName = profile.value?.full_name?.trim()
  return fullName ? fullName : '—'
})

const avatarSrc = computed(() => resolveMediaUrl(profile.value?.avatar_url))

const rateLabel = computed(() => {
  const hourlyRate = profile.value?.hourly_rate ?? 0
  if (!hourlyRate) return t('common.negotiable')
  return `${formatNumber(hourlyRate, locale.value)} ${t('common.perHour')}`
})

const ratingLabel = computed(() => {
  const rating = profile.value?.average_rating
  if (rating === null || rating === undefined) return t('instructors.profile.noRating')
  return formatNumber(rating, locale.value)
})

const experienceLabel = computed(() =>
  t('instructors.profile.years', {
    count: formatNumber(profile.value?.years_of_experience ?? 0, locale.value),
  }),
)

async function load(): Promise<void> {
  if (!instructorId.value) {
    error.value = t('instructors.profile.notFound')
    loading.value = false
    return
  }

  loading.value = true
  error.value = ''

  try {
    profile.value = await fetchInstructor(instructorId.value)
  } catch {
    profile.value = null
    error.value = t('instructors.profile.error')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void load()
})

watch(instructorId, () => {
  void load()
})
</script>

<template>
  <section class="detail-page" data-test="instructor-detail">
    <RouterLink :to="{ name: 'dashboard-student-discover' }" class="back-link">
      <ArrowRight :size="16" aria-hidden="true" />
      {{ t('instructors.profile.back') }}
    </RouterLink>

    <p v-if="loading" class="state" data-test="profile-loading">
      <LoaderCircle :size="16" class="spin" aria-hidden="true" />
      {{ t('common.loading') }}
    </p>

    <p v-else-if="error" class="banner" role="alert" data-test="profile-error">{{ error }}</p>

    <template v-else-if="profile">
      <header class="profile-header">
        <span class="avatar" aria-hidden="true">
          <img v-if="avatarSrc" :src="avatarSrc" :alt="displayName" />
          <template v-else>{{ displayName.charAt(0) }}</template>
        </span>
        <div class="identity">
          <p class="eyebrow">{{ t('instructors.profile.eyebrow') }}</p>
          <h2 data-test="profile-name">{{ displayName }}</h2>
          <p class="summary">{{ profile.short_summary }}</p>
        </div>
        <div class="highlight">
          <span class="highlight-label">{{ t('instructors.profile.rate') }}</span>
          <strong data-test="profile-rate">{{ rateLabel }}</strong>
        </div>
      </header>

      <div class="facts">
        <div class="fact">
          <Star :size="16" aria-hidden="true" />
          <span>{{ t('instructors.profile.rating') }}</span>
          <strong data-test="profile-rating">{{ ratingLabel }}</strong>
        </div>
        <div class="fact">
          <GraduationCap :size="16" aria-hidden="true" />
          <span>{{ t('instructors.profile.experience') }}</span>
          <strong data-test="profile-experience">{{ experienceLabel }}</strong>
        </div>
        <div class="fact">
          <UserRoundSearch :size="16" aria-hidden="true" />
          <span>{{ t('instructors.profile.education') }}</span>
          <strong>{{ profile.education_level || t('common.notSet') }}</strong>
        </div>
      </div>

      <section class="panel">
        <h3>{{ t('instructors.profile.languages') }}</h3>
        <ul class="chips">
          <li
            v-for="language in profile.teaching_languages"
            :key="language"
            class="chip"
            data-test="profile-language"
          >
            {{ language }}
          </li>
          <li v-if="profile.teaching_languages.length === 0" class="chip chip-muted">
            {{ t('instructors.discovery.noLanguage') }}
          </li>
        </ul>
      </section>

      <section class="panel">
        <h3>{{ t('instructors.profile.bio') }}</h3>
        <p class="bio" data-test="profile-bio">{{ profile.bio || t('instructors.profile.noBio') }}</p>
      </section>

      <div class="booking">
        <button type="button" class="book-button" disabled data-test="book-class">
          <CalendarPlus :size="17" aria-hidden="true" />
          {{ t('instructors.profile.book') }}
        </button>
        <p class="booking-hint">{{ t('instructors.profile.bookHint') }}</p>
      </div>
    </template>
  </section>
</template>

<style scoped>
.detail-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  font-weight: 600;
  text-decoration: none;
}

.back-link:hover {
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

.spin {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
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

.profile-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px;
  padding: 26px 28px;
  background: linear-gradient(135deg, var(--card-bg) 0%, var(--primary-light) 180%);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}

.avatar {
  display: grid;
  place-items: center;
  flex: none;
  width: 84px;
  height: 84px;
  overflow: hidden;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--primary-hover));
  color: #fff;
  font-size: 34px;
  font-weight: 700;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.identity {
  flex: 1 1 240px;
  min-width: 0;
}

.eyebrow {
  margin: 0 0 4px;
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}

.identity h2 {
  margin: 0;
  color: var(--primary);
  font-size: var(--font-size-title);
}

.summary {
  margin: 6px 0 0;
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  line-height: 1.8;
}

.highlight {
  flex: none;
  padding: 12px 18px;
  border-radius: var(--radius);
  background: var(--card-bg);
  text-align: center;
}

.highlight-label {
  display: block;
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}

.highlight strong {
  display: block;
  margin-top: 2px;
  color: var(--primary);
  font-size: var(--font-size-body);
}

.facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
}

.fact {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 18px;
  background: var(--card-bg);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}

.fact strong {
  margin-left: auto;
  color: var(--text);
  font-size: var(--font-size-sm);
}

.panel {
  padding: 20px 24px;
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}

.panel h3 {
  margin: 0 0 12px;
  color: var(--primary);
  font-size: var(--font-size-body);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.chip {
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--primary-light);
  color: var(--primary);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.chip-muted {
  background: var(--bg);
  color: var(--text-muted);
}

.bio {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  line-height: 2;
  white-space: pre-line;
}

.booking {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.book-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 26px;
  border: 1px solid var(--primary);
  border-radius: var(--radius);
  background: var(--primary);
  color: #fff;
  font-family: inherit;
  font-size: var(--font-size-sm);
  font-weight: 700;
  cursor: not-allowed;
  opacity: 0.7;
}

.booking-hint {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}
</style>
