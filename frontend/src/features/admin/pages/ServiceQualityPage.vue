<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { CalendarDays, LoaderCircle, ShieldBan, Star } from 'lucide-vue-next'

import { fetchServiceQuality, type ServiceQuality } from '../api/quality'

const quality = ref<ServiceQuality | null>(null)
const loading = ref(true)
const loadError = ref('')

const formatter = new Intl.NumberFormat('fa-IR')

const metrics = computed(() => {
  const hasRatings = (quality.value?.average_rating ?? 0) > 0

  return [
    {
      key: 'classes' as const,
      title: 'کلاس‌های برگزارشده',
      value: quality.value ? formatter.format(quality.value.total_classes) : '—',
      hint: 'بر اساس رکوردهای کلاس',
      icon: CalendarDays,
    },
    {
      key: 'rating' as const,
      title: 'میانگین رضایت',
      value: quality.value
        ? hasRatings
          ? `${(quality.value.average_rating as number).toFixed(1)} از ۵`
          : '—'
        : '—',
      hint: hasRatings ? 'میانگین امتیاز زبان‌آموزان' : 'هنوز امتیازی ثبت نشده',
      icon: Star,
    },
    {
      key: 'suspended' as const,
      title: 'کاربران معلق',
      value: quality.value ? formatter.format(quality.value.suspended_users) : '—',
      hint: 'حساب‌های مسدودشده توسط مدیر',
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
    loadError.value = 'دریافت شاخص‌های کیفیت ناموفق بود.'
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
        <p class="eyebrow">کیفیت خدمات</p>
        <h2>شاخص‌های کیفیت</h2>
        <p class="subtitle">سنجه‌های واقعی ثبت‌شده در پایگاه داده</p>
      </div>
      <span class="counter" data-test="quality-counter">
        {{ quality ? formatter.format(quality.total_classes) : '—' }} کلاس
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

    <p v-if="loading" class="loading-note" data-test="quality-loading">در حال بروزرسانی…</p>

    <p class="note" data-test="quality-note">
      کلاس‌ها و امتیازهای رضایت پس از فعال شدن ماژول کلاس‌ها و ارزیابی‌ها در این بخش محاسبه
      می‌شوند؛ تا آن زمان مقدار صفر یعنی هیچ رکوردی در پایگاه داده وجود ندارد.
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
