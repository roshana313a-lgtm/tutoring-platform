<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalendarDays, LoaderCircle, ShieldBan, Star } from 'lucide-vue-next'

import { formatNumber } from '../../../i18n/format'
import { fetchServiceQuality, type ServiceQuality } from '../api/quality'

const { t, locale } = useI18n()

const quality = ref<ServiceQuality | null>(null)
const loading = ref(true)
const loadError = ref('')

const metrics = computed(() => {
  const hasRatings = (quality.value?.average_rating ?? 0) > 0

  return [
    {
      key: 'classes' as const,
      title: t('admin.quality.metrics.classes'),
      value: quality.value ? formatNumber(quality.value.total_classes, locale.value) : '—',
      hint: t('admin.quality.metrics.classesHint'),
      icon: CalendarDays,
    },
    {
      key: 'rating' as const,
      title: t('admin.quality.metrics.rating'),
      value: quality.value
        ? hasRatings
          ? t('admin.quality.metrics.ratingValue', {
              value: (quality.value.average_rating as number).toFixed(1),
            })
          : '—'
        : '—',
      hint: hasRatings ? t('admin.quality.metrics.ratingHint') : t('admin.quality.metrics.noRating'),
      icon: Star,
    },
    {
      key: 'suspended' as const,
      title: t('admin.quality.metrics.suspended'),
      value: quality.value ? formatNumber(quality.value.suspended_users, locale.value) : '—',
      hint: t('admin.quality.metrics.suspendedHint'),
      icon: ShieldBan,
    },
  ]
})

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''

  try {
    quality.value = await fetchServiceQuality()
  } catch {
    loadError.value = t('errors.quality')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="quality-page" data-test="quality-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">{{ t('admin.quality.eyebrow') }}</p>
        <h2>{{ t('admin.quality.title') }}</h2>
        <p class="subtitle">{{ t('admin.quality.subtitle') }}</p>
      </div>
      <span class="counter" data-test="quality-counter">
        {{ t('admin.quality.classCount', { count: quality ? formatNumber(quality.total_classes, locale) : '—' }) }}
      </span>
    </header>

    <p v-if="loadError" class="banner" role="alert" data-test="quality-error">{{ loadError }}</p>

    <div class="metric-grid" data-test="quality-metrics">
      <article v-for="metric in metrics" :key="metric.key" class="metric-card" data-test="quality-metric">
        <span class="metric-icon" aria-hidden="true">
          <component :is="metric.icon" :size="19" :stroke-width="1.9" />
        </span>
        <span class="metric-label">{{ metric.title }}</span>
        <strong class="metric-value" data-test="metric-value">{{ metric.value }}</strong>
        <span class="metric-hint">{{ metric.hint }}</span>
      </article>
    </div>

    <p v-if="loading" class="loading-note" data-test="quality-loading">
      {{ t('common.refreshing') }}
    </p>

    <p class="note" data-test="quality-note">
      {{ t('admin.quality.note') }}
    </p>
  </section>
</template>

<style scoped>
.quality-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
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

.page-header h2 {
  margin: 0;
  color: var(--primary);
  font-size: var(--font-size-title);
}

.subtitle {
  margin: 6px 0 0;
  color: var(--text-muted);
  font-size: var(--font-size-sm);
}

.counter {
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--primary-light);
  color: var(--primary);
  font-size: var(--font-size-sm);
  font-weight: 700;
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

.metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.metric-card {
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

.metric-icon {
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

.metric-label {
  padding-left: 48px;
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.metric-value {
  color: var(--primary);
  font-size: var(--font-size-title);
  line-height: 1.1;
}

.metric-hint {
  margin-top: auto;
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}

.loading-note {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}

.note {
  margin: 0;
  padding: 14px 18px;
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  color: var(--text-muted);
  font-size: var(--font-size-xs);
  line-height: 1.9;
}

@media (max-width: 600px) {
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
