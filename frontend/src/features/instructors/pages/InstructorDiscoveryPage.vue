<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { LoaderCircle, RotateCcw, Search, UserRoundSearch } from 'lucide-vue-next'

import { resolveMediaUrl } from '../../../shared/api/media'
import { formatNumber } from '../../../i18n/format'
import { fetchInstructors, type InstructorListItem } from '../api/instructors'

const { t, locale } = useI18n()

const instructors = ref<InstructorListItem[]>([])
const loading = ref(true)
const error = ref('')
const search = ref('')
// A number input may hand back a number instead of a string, so keep both.
const maxPrice = ref<string | number>('')

function instructorName(instructor: InstructorListItem): string {
  const fullName = instructor.full_name?.trim()
  if (fullName) return fullName
  return instructor.email.split('@')[0] ?? '—'
}

function avatarSrc(instructor: InstructorListItem): string | null {
  return resolveMediaUrl(instructor.avatar_url)
}

function languages(instructor: InstructorListItem): string[] {
  return instructor.teaching_languages ?? []
}

function rate(instructor: InstructorListItem): string {
  if (!instructor.hourly_rate) return t('common.negotiable')
  return `${formatNumber(instructor.hourly_rate, locale.value)} ${t('common.perHour')}`
}

function priceQuery(): number | undefined {
  const raw = maxPrice.value
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw >= 0 ? raw : undefined
  }

  const trimmed = raw.trim()
  if (trimmed === '') return undefined

  const parsed = Number(trimmed)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''

  try {
    instructors.value = await fetchInstructors({
      search: search.value.trim() || undefined,
      max_price: priceQuery(),
    })
  } catch {
    error.value = t('errors.instructors')
  } finally {
    loading.value = false
  }
}

function reset(): void {
  search.value = ''
  maxPrice.value = ''
  void load()
}

onMounted(() => {
  void load()
})
</script>

<template>
  <section class="discovery-page" data-test="instructor-discovery">
    <header class="page-header">
      <div>
        <p class="eyebrow">{{ t('instructors.discovery.eyebrow') }}</p>
        <h2>{{ t('instructors.discovery.title') }}</h2>
        <p class="subtitle">{{ t('instructors.discovery.subtitle') }}</p>
      </div>
    </header>

    <form class="filters" data-test="discovery-filters" @submit.prevent="load">
      <label class="field field-search">
        <span>{{ t('instructors.discovery.search') }}</span>
        <span class="input-shell">
          <Search :size="16" aria-hidden="true" />
          <input
            v-model="search"
            type="search"
            data-test="discovery-search"
            :placeholder="t('instructors.discovery.searchPlaceholder')"
          />
        </span>
      </label>

      <label class="field field-price">
        <span>{{ t('instructors.discovery.maxPrice') }}</span>
        <span class="input-shell">
          <input
            v-model="maxPrice"
            type="number"
            min="0"
            step="10000"
            data-test="max-price"
            :placeholder="t('instructors.discovery.maxPricePlaceholder')"
          />
          <em>{{ t('common.currency') }}</em>
        </span>
      </label>

      <div class="filter-actions">
        <button type="submit" class="primary-button" data-test="discovery-submit">
          {{ t('instructors.discovery.submit') }}
        </button>
        <button type="button" class="ghost-button" data-test="discovery-reset" @click="reset">
          <RotateCcw :size="15" aria-hidden="true" />
          {{ t('instructors.discovery.reset') }}
        </button>
      </div>
    </form>

    <p v-if="loading" class="state" data-test="discovery-loading">
      <LoaderCircle :size="16" class="spin" aria-hidden="true" />
      {{ t('common.loading') }}
    </p>

    <p v-else-if="error" class="banner" role="alert" data-test="discovery-error">{{ error }}</p>

    <div v-else-if="instructors.length === 0" class="empty" data-test="discovery-empty">
      <UserRoundSearch :size="22" aria-hidden="true" />
      <div>
        <strong>{{ t('instructors.discovery.empty') }}</strong>
        <p>{{ t('instructors.discovery.emptyHint') }}</p>
      </div>
    </div>

    <div v-else class="card-grid">
      <article
        v-for="instructor in instructors"
        :key="instructor.id"
        class="instructor-card"
        data-test="instructor-card"
      >
        <div class="card-head">
          <span class="avatar" data-test="instructor-avatar" aria-hidden="true">
            <img
              v-if="avatarSrc(instructor)"
              :src="avatarSrc(instructor)!"
              :alt="instructorName(instructor)"
            />
            <template v-else>{{ instructorName(instructor).charAt(0) }}</template>
          </span>
          <div class="card-identity">
            <h3 data-test="instructor-name">{{ instructorName(instructor) }}</h3>
            <span class="rate" data-test="instructor-rate">{{ rate(instructor) }}</span>
          </div>
        </div>

        <ul class="chips" :aria-label="t('instructors.profile.languages')">
          <li
            v-for="language in languages(instructor)"
            :key="language"
            class="chip"
            data-test="instructor-language"
          >
            {{ language }}
          </li>
        </ul>

        <p class="summary" data-test="instructor-summary">{{ instructor.short_summary }}</p>

        <RouterLink
          :to="{ name: 'dashboard-student-discover-detail', params: { id: instructor.id } }"
          class="profile-link"
          data-test="instructor-profile-link"
        >
          {{ t('instructors.discovery.viewProfile') }}
        </RouterLink>
      </article>
    </div>
  </section>
</template>

<style scoped>
.discovery-page {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.page-header h2 {
  margin: 0;
  color: var(--primary);
  font-size: var(--font-size-title);
}

.eyebrow {
  margin: 0 0 4px;
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}

.subtitle {
  margin: 6px 0 0;
  color: var(--text-muted);
  font-size: var(--font-size-sm);
}

.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 14px;
  padding: 18px 20px;
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}

.field {
  display: flex;
  flex: 1 1 220px;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.field > span {
  color: var(--text-muted);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.field-price {
  flex: 0 1 220px;
}

.input-shell {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg);
  color: var(--text-muted);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.input-shell:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.input-shell input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text);
  font-family: inherit;
  font-size: var(--font-size-sm);
}

.input-shell em {
  font-size: var(--font-size-xs);
  font-style: normal;
  white-space: nowrap;
}

.filter-actions {
  display: flex;
  gap: 8px;
}

.primary-button,
.ghost-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: var(--radius);
  font-family: inherit;
  font-size: var(--font-size-sm);
  font-weight: 700;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.primary-button {
  border: 1px solid var(--primary);
  background: var(--primary);
  color: #fff;
}

.primary-button:hover {
  background: var(--primary-hover);
}

.ghost-button {
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-muted);
}

.ghost-button:hover {
  border-color: var(--primary);
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

.empty {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 26px 22px;
  border: 1px dashed var(--border);
  border-radius: var(--radius-lg);
  color: var(--text-muted);
}

.empty strong {
  display: block;
  color: var(--text);
  font-size: var(--font-size-sm);
}

.empty p {
  margin: 4px 0 0;
  font-size: var(--font-size-xs);
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(272px, 1fr));
  gap: 20px;
}

.instructor-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 22px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  transition:
    border-color 0.2s ease,
    transform 0.2s ease;
}

.instructor-card:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
}

.card-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  display: grid;
  place-items: center;
  flex: none;
  width: 52px;
  height: 52px;
  overflow: hidden;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--primary-hover));
  color: #fff;
  font-size: var(--font-size-title);
  font-weight: 700;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-identity {
  min-width: 0;
}

.card-identity h3 {
  margin: 0;
  color: var(--text);
  font-size: var(--font-size-body);
}

.rate {
  display: block;
  margin-top: 2px;
  color: var(--primary);
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.chip {
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--primary-light);
  color: var(--primary);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.summary {
  display: -webkit-box;
  overflow: hidden;
  margin: 0;
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  line-height: 1.8;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
}

.profile-link {
  margin-top: auto;
  padding: 9px 14px;
  border: 1px solid var(--primary);
  border-radius: var(--radius);
  color: var(--primary);
  font-size: var(--font-size-sm);
  font-weight: 700;
  text-align: center;
  text-decoration: none;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.profile-link:hover {
  background: var(--primary);
  color: #fff;
}

@media (max-width: 600px) {
  .filter-actions {
    width: 100%;
  }

  .primary-button,
  .ghost-button {
    flex: 1;
    justify-content: center;
  }
}
</style>
