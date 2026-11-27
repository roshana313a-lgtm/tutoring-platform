<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  BellRing,
  CircleDollarSign,
  GraduationCap,
  LoaderCircle,
  Save,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-vue-next'

import { fetchSettings, saveSettings, type PlatformSettings } from '../api/settings'

const { t } = useI18n()

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CLASS_DURATION_MIN = 1
const CLASS_DURATION_MAX = 1440
const CANCELLATION_HOURS_MIN = 0
const CANCELLATION_HOURS_MAX = 720
const COMMISSION_MIN = 0
const COMMISSION_MAX = 100
const TOAST_DURATION_MS = 5000

type TabKey = 'academic' | 'financial' | 'system'
type ToastType = 'success' | 'error'

const tabs: { key: TabKey; labelKey: string; icon: unknown }[] = [
  { key: 'academic', labelKey: 'admin.settings.tabs.academic', icon: GraduationCap },
  { key: 'financial', labelKey: 'admin.settings.tabs.financial', icon: CircleDollarSign },
  { key: 'system', labelKey: 'admin.settings.tabs.system', icon: Settings2 },
]

const activeTab = ref<TabKey>('academic')

const form = reactive<PlatformSettings>({
  institute_name: '',
  support_email: '',
  default_class_duration: 60,
  min_cancellation_hours: 24,
  default_hourly_rate: 0,
  currency: 'تومان',
  commission_rate: 10,
  enable_email_notifications: true,
  maintenance_mode: false,
})

const errors = reactive<Record<string, string>>({})
const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const toast = ref<{ type: ToastType; message: string } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null

const currencyLabel = computed(() => form.currency.trim())

function clearToast(): void {
  toast.value = null
  if (toastTimer) {
    clearTimeout(toastTimer)
    toastTimer = null
  }
}

function notify(type: ToastType, message: string): void {
  clearToast()
  toast.value = { type, message }
  toastTimer = setTimeout(clearToast, TOAST_DURATION_MS)
}

function inRange(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max
}

function validate(): boolean {
  for (const key of Object.keys(errors)) delete errors[key]

  if (!form.institute_name.trim()) {
    errors.institute_name = t('validation.instituteName')
  }
  if (!EMAIL_PATTERN.test(form.support_email.trim())) {
    errors.support_email = t('validation.supportEmail')
  }
  if (
    !inRange(Number(form.default_class_duration), CLASS_DURATION_MIN, CLASS_DURATION_MAX)
  ) {
    errors.default_class_duration = t('validation.classDuration')
  }
  if (
    !inRange(Number(form.min_cancellation_hours), CANCELLATION_HOURS_MIN, CANCELLATION_HOURS_MAX)
  ) {
    errors.min_cancellation_hours = t('validation.cancellationHours')
  }
  if (!Number.isFinite(Number(form.default_hourly_rate)) || Number(form.default_hourly_rate) < 0) {
    errors.default_hourly_rate = t('validation.defaultRate')
  }
  if (!form.currency.trim() || form.currency.trim().length > 16) {
    errors.currency = t('validation.currencyRequired')
  }
  if (!inRange(Number(form.commission_rate), COMMISSION_MIN, COMMISSION_MAX)) {
    errors.commission_rate = t('validation.commissionRate')
  }

  if (Object.keys(errors).length > 0) {
    activeTab.value = tabForFirstError()
    return false
  }

  return true
}

function tabForFirstError(): TabKey {
  if (errors.institute_name || errors.support_email) return 'academic'
  if (errors.default_class_duration || errors.min_cancellation_hours) return 'academic'
  if (errors.default_hourly_rate || errors.currency || errors.commission_rate) return 'financial'
  return 'system'
}

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''

  try {
    const settings = await fetchSettings()
    form.institute_name = settings.institute_name
    form.support_email = settings.support_email
    form.default_class_duration = settings.default_class_duration
    form.min_cancellation_hours = settings.min_cancellation_hours
    form.default_hourly_rate = settings.default_hourly_rate
    form.currency = settings.currency
    form.commission_rate = settings.commission_rate
    form.enable_email_notifications = settings.enable_email_notifications
    form.maintenance_mode = settings.maintenance_mode
  } catch {
    loadError.value = t('errors.settingsLoad')
  } finally {
    loading.value = false
  }
}

async function submit(): Promise<void> {
  clearToast()

  if (!validate()) {
    notify('error', t('errors.formErrors'))
    return
  }

  saving.value = true
  try {
    const saved = await saveSettings({
      institute_name: form.institute_name.trim(),
      support_email: form.support_email.trim(),
      default_class_duration: Number(form.default_class_duration),
      min_cancellation_hours: Number(form.min_cancellation_hours),
      default_hourly_rate: Number(form.default_hourly_rate),
      currency: form.currency.trim(),
      commission_rate: Number(form.commission_rate),
      enable_email_notifications: form.enable_email_notifications,
      maintenance_mode: form.maintenance_mode,
    })
    form.institute_name = saved.institute_name
    form.support_email = saved.support_email
    form.default_class_duration = saved.default_class_duration
    form.min_cancellation_hours = saved.min_cancellation_hours
    form.default_hourly_rate = saved.default_hourly_rate
    form.currency = saved.currency
    form.commission_rate = saved.commission_rate
    form.enable_email_notifications = saved.enable_email_notifications
    form.maintenance_mode = saved.maintenance_mode
    notify('success', t('admin.settings.saved'))
  } catch {
    notify('error', t('errors.settingsSave'))
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="settings-page" data-test="settings-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">{{ t('admin.settings.eyebrow') }}</p>
        <h2>{{ t('admin.settings.title') }}</h2>
        <p class="subtitle">{{ t('admin.settings.subtitle') }}</p>
      </div>
      <span class="header-icon" aria-hidden="true">
        <Settings2 :size="20" />
      </span>
    </header>

    <p v-if="loading" class="panel state" data-test="settings-loading">
      <LoaderCircle :size="16" class="spin" />
      {{ t('common.loading') }}
    </p>

    <p v-else-if="loadError" class="panel state state-error" role="alert" data-test="settings-load-error">
      {{ loadError }}
    </p>

    <form v-else class="panel" data-test="settings-form" @submit.prevent="submit">
      <div class="tabs" role="tablist" :aria-label="t('admin.settings.tabsAria')">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          role="tab"
          class="tab"
          :class="{ 'tab-active': activeTab === tab.key }"
          :aria-selected="activeTab === tab.key ? 'true' : 'false'"
          :data-test="`settings-tab-${tab.key}`"
          @click="activeTab = tab.key"
        >
          <component :is="tab.icon" :size="16" />
          {{ t(tab.labelKey) }}
        </button>
      </div>

      <div v-if="activeTab === 'academic'" class="tab-panel" data-test="settings-panel-academic">
        <label class="field">
          <span class="field-label">{{ t('admin.settings.instituteName') }}</span>
          <input v-model="form.institute_name" data-test="institute-name" type="text" />
          <span v-if="errors.institute_name" class="field-error" data-test="institute-name-error">
            {{ errors.institute_name }}
          </span>
        </label>

        <label class="field">
          <span class="field-label">{{ t('admin.settings.supportEmail') }}</span>
          <input v-model="form.support_email" data-test="support-email" type="email" dir="ltr" />
          <span v-if="errors.support_email" class="field-error" data-test="support-email-error">
            {{ errors.support_email }}
          </span>
        </label>

        <div class="field-row">
          <label class="field">
            <span class="field-label">{{ t('admin.settings.classDuration') }}</span>
            <input
              v-model.number="form.default_class_duration"
              data-test="class-duration"
              type="number"
              min="1"
              max="1440"
              step="5"
            />
            <span class="field-hint">{{ t('admin.settings.classDurationHint') }}</span>
            <span
              v-if="errors.default_class_duration"
              class="field-error"
              data-test="class-duration-error"
            >
              {{ errors.default_class_duration }}
            </span>
          </label>

          <label class="field">
            <span class="field-label">{{ t('admin.settings.cancellationHours') }}</span>
            <input
              v-model.number="form.min_cancellation_hours"
              data-test="cancellation-hours"
              type="number"
              min="0"
              max="720"
              step="1"
            />
            <span class="field-hint">{{ t('admin.settings.cancellationHoursHint') }}</span>
            <span
              v-if="errors.min_cancellation_hours"
              class="field-error"
              data-test="cancellation-hours-error"
            >
              {{ errors.min_cancellation_hours }}
            </span>
          </label>
        </div>
      </div>

      <div v-else-if="activeTab === 'financial'" class="tab-panel" data-test="settings-panel-financial">
        <label class="field">
          <span class="field-label">{{ t('admin.settings.defaultRate') }}</span>
          <input
            v-model.number="form.default_hourly_rate"
            data-test="default-rate"
            type="number"
            min="0"
            step="1000"
          />
          <span class="field-hint">{{ currencyLabel }}</span>
          <span
            v-if="errors.default_hourly_rate"
            class="field-error"
            data-test="default-rate-error"
          >
            {{ errors.default_hourly_rate }}
          </span>
        </label>

        <label class="field">
          <span class="field-label">{{ t('admin.settings.currency') }}</span>
          <input
            v-model="form.currency"
            data-test="currency"
            type="text"
            :placeholder="t('admin.settings.currencyPlaceholder')"
          />
          <span v-if="errors.currency" class="field-error" data-test="currency-error">
            {{ errors.currency }}
          </span>
        </label>

        <label class="field">
          <span class="field-label">{{ t('admin.settings.commissionRate') }}</span>
          <input
            v-model.number="form.commission_rate"
            data-test="commission-rate"
            type="number"
            min="0"
            max="100"
            step="1"
          />
          <span class="field-hint">{{ t('admin.settings.commissionRateHint') }}</span>
          <span
            v-if="errors.commission_rate"
            class="field-error"
            data-test="commission-rate-error"
          >
            {{ errors.commission_rate }}
          </span>
        </label>
      </div>

      <div v-else class="tab-panel" data-test="settings-panel-system">
        <label class="switch-row">
          <span class="switch-copy">
            <span class="switch-title">
              <BellRing :size="16" />
              {{ t('admin.settings.emailNotifications') }}
            </span>
            <span class="field-hint">{{ t('admin.settings.emailNotificationsHint') }}</span>
          </span>
          <input
            v-model="form.enable_email_notifications"
            data-test="email-notifications-toggle"
            type="checkbox"
            class="switch-input"
          />
          <span class="switch-track" aria-hidden="true" />
        </label>

        <label class="switch-row">
          <span class="switch-copy">
            <span class="switch-title">
              <ShieldAlert :size="16" />
              {{ t('admin.settings.maintenanceMode') }}
            </span>
            <span class="field-hint">{{ t('admin.settings.maintenanceModeHint') }}</span>
          </span>
          <input
            v-model="form.maintenance_mode"
            data-test="maintenance-toggle"
            type="checkbox"
            class="switch-input"
          />
          <span class="switch-track" aria-hidden="true" />
        </label>

        <p v-if="form.maintenance_mode" class="maintenance-warning" data-test="maintenance-warning">
          <ShieldAlert :size="16" />
          {{ t('admin.settings.maintenanceWarning') }}
        </p>
      </div>

      <p class="security-note" data-test="settings-security-note">
        <ShieldCheck :size="16" />
        {{ t('admin.settings.securityNote') }}
      </p>

      <div class="form-actions">
        <button type="submit" class="save-button" data-test="settings-submit" :disabled="saving">
          <Save :size="16" />
          {{ saving ? t('common.saving') : t('admin.settings.submit') }}
        </button>
      </div>
    </form>

    <Transition name="toast">
      <div
        v-if="toast"
        class="toast"
        :class="`toast-${toast.type}`"
        :role="toast.type === 'error' ? 'alert' : 'status'"
        :data-test="toast.type === 'success' ? 'settings-success' : 'settings-error'"
      >
        <span>{{ toast.message }}</span>
        <button
          type="button"
          class="toast-close"
          data-test="settings-toast-close"
          :aria-label="t('common.close')"
          @click="clearToast"
        >
          <X :size="14" />
        </button>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.settings-page {
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

.header-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: var(--radius);
  background: var(--primary-light);
  color: var(--primary);
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px 28px;
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
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

.state-error {
  color: var(--error);
}

.spin {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 5px;
  border-radius: var(--radius);
  background: var(--bg);
}

.tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border: 0;
  border-radius: calc(var(--radius) - 2px);
  background: transparent;
  color: var(--text-muted);
  font-family: inherit;
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.tab:hover {
  color: var(--primary);
}

.tab-active {
  background: var(--card-bg);
  color: var(--primary);
  box-shadow: var(--shadow-sm, 0 1px 3px rgba(15, 23, 42, 0.12));
}

.tab-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.field-row {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
}

.field {
  display: block;
  flex: 1 1 220px;
  max-width: 520px;
  text-align: right;
}

.field-label {
  display: block;
  margin-bottom: 8px;
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.field-hint {
  display: block;
  margin-top: 6px;
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}

input,
textarea {
  width: 100%;
  padding: 11px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg);
  color: var(--text);
  font-family: inherit;
  font-size: var(--font-size-sm);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

textarea {
  resize: vertical;
  min-height: 104px;
  line-height: 1.7;
}

input:focus,
textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.field-error {
  display: block;
  margin-top: 6px;
  color: var(--error);
  font-size: var(--font-size-xs);
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  max-width: 720px;
  padding: 16px 18px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
}

.switch-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.switch-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 700;
}

.switch-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

.switch-track {
  position: relative;
  flex: 0 0 auto;
  width: 46px;
  height: 26px;
  border-radius: 999px;
  background: var(--border);
  transition: background 0.2s ease;
}

.switch-track::after {
  content: '';
  position: absolute;
  top: 3px;
  right: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.25);
  transition: transform 0.2s ease;
}

.switch-input:checked + .switch-track {
  background: var(--primary);
}

.switch-input:checked + .switch-track::after {
  transform: translateX(-20px);
}

.switch-input:focus-visible + .switch-track {
  box-shadow: 0 0 0 3px var(--primary-light);
}

.maintenance-warning {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 720px;
  margin: 0;
  padding: 12px 16px;
  border: 1px solid rgba(217, 119, 6, 0.4);
  border-radius: var(--radius);
  background: rgba(217, 119, 6, 0.1);
  color: #b45309;
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.security-note {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  padding: 12px 16px;
  border-radius: var(--radius);
  background: var(--bg);
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}

.form-actions {
  border-top: 1px solid var(--border);
  padding-top: 18px;
}

.save-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 24px;
  border: 0;
  border-radius: var(--radius);
  background: var(--primary);
  color: #fff;
  font-family: inherit;
  font-size: var(--font-size-sm);
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease;
}

.save-button:hover:not(:disabled) {
  background: var(--primary-hover);
}

.save-button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.toast {
  position: fixed;
  inset-inline-end: 24px;
  inset-block-end: 24px;
  z-index: 60;
  display: flex;
  align-items: center;
  gap: 14px;
  max-width: 420px;
  padding: 14px 16px;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.toast-success {
  border: 1px solid rgba(22, 163, 74, 0.35);
  background: #f0fdf4;
  color: #15803d;
}

.toast-error {
  border: 1px solid rgba(185, 28, 28, 0.35);
  background: #fef2f2;
  color: #b91c1c;
}

.toast-close {
  display: grid;
  place-items: center;
  padding: 4px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  cursor: pointer;
  opacity: 0.7;
}

.toast-close:hover {
  opacity: 1;
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
