<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  BellRing,
  CircleDollarSign,
  LoaderCircle,
  Save,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-vue-next'

import { fetchSettings, saveSettings, type PlatformSettings } from '../api/settings'

const { t } = useI18n()

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DESCRIPTION_MAX = 1000
const TOAST_DURATION_MS = 5000

type TabKey = 'general' | 'financial' | 'system'
type ToastType = 'success' | 'error'

const tabs: { key: TabKey; labelKey: string; icon: unknown }[] = [
  { key: 'general', labelKey: 'admin.settings.tabs.general', icon: SlidersHorizontal },
  { key: 'financial', labelKey: 'admin.settings.tabs.financial', icon: CircleDollarSign },
  { key: 'system', labelKey: 'admin.settings.tabs.system', icon: Settings2 },
]

const activeTab = ref<TabKey>('general')

const form = reactive<PlatformSettings>({
  platform_name: '',
  support_email: '',
  platform_description: '',
  default_hourly_rate: 0,
  currency: 'تومان',
  min_withdrawal_amount: 0,
  enable_email_notifications: true,
  maintenance_mode: false,
})

const errors = reactive<Record<string, string>>({})
const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const toast = ref<{ type: ToastType; message: string } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null

const currencyLabel = computed(() => form.currency.trim() || t('admin.settings.currencyFallback'))

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

function validate(): boolean {
  for (const key of Object.keys(errors)) delete errors[key]

  const description = form.platform_description.trim()
  if (!form.platform_name.trim()) {
    errors.platform_name = t('validation.platformName')
  }
  if (description.length > DESCRIPTION_MAX) {
    errors.platform_description = t('validation.platformDescriptionMax')
  }
  if (!EMAIL_PATTERN.test(form.support_email.trim())) {
    errors.support_email = t('validation.supportEmail')
  }
  if (!Number.isFinite(Number(form.default_hourly_rate)) || Number(form.default_hourly_rate) < 0) {
    errors.default_hourly_rate = t('validation.defaultRate')
  }
  if (!form.currency.trim() || form.currency.trim().length > 16) {
    errors.currency = t('validation.currencyRequired')
  }
  if (
    !Number.isFinite(Number(form.min_withdrawal_amount)) ||
    Number(form.min_withdrawal_amount) < 0
  ) {
    errors.min_withdrawal_amount = t('validation.minWithdrawal')
  }

  if (Object.keys(errors).length > 0) {
    activeTab.value = tabForFirstError()
    return false
  }

  return true
}

function tabForFirstError(): TabKey {
  if (errors.platform_name || errors.platform_description || errors.support_email) return 'general'
  if (errors.default_hourly_rate || errors.currency || errors.min_withdrawal_amount) {
    return 'financial'
  }
  return 'system'
}

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''

  try {
    const settings = await fetchSettings()
    form.platform_name = settings.platform_name
    form.support_email = settings.support_email
    form.platform_description = settings.platform_description
    form.default_hourly_rate = settings.default_hourly_rate
    form.currency = settings.currency
    form.min_withdrawal_amount = settings.min_withdrawal_amount
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
      platform_name: form.platform_name.trim(),
      support_email: form.support_email.trim(),
      platform_description: form.platform_description.trim(),
      default_hourly_rate: Number(form.default_hourly_rate),
      currency: form.currency.trim(),
      min_withdrawal_amount: Number(form.min_withdrawal_amount),
      enable_email_notifications: form.enable_email_notifications,
      maintenance_mode: form.maintenance_mode,
    })
    form.platform_name = saved.platform_name
    form.support_email = saved.support_email
    form.platform_description = saved.platform_description
    form.default_hourly_rate = saved.default_hourly_rate
    form.currency = saved.currency
    form.min_withdrawal_amount = saved.min_withdrawal_amount
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

      <div v-if="activeTab === 'general'" class="tab-panel" data-test="settings-panel-general">
        <label class="field">
          <span class="field-label">{{ t('admin.settings.platformName') }}</span>
          <input v-model="form.platform_name" data-test="platform-name" type="text" />
          <span v-if="errors.platform_name" class="field-error" data-test="platform-name-error">
            {{ errors.platform_name }}
          </span>
        </label>

        <label class="field">
          <span class="field-label">{{ t('admin.settings.supportEmail') }}</span>
          <input v-model="form.support_email" data-test="support-email" type="email" dir="ltr" />
          <span v-if="errors.support_email" class="field-error" data-test="support-email-error">
            {{ errors.support_email }}
          </span>
        </label>

        <label class="field">
          <span class="field-label">{{ t('admin.settings.description') }}</span>
          <textarea
            v-model="form.platform_description"
            data-test="platform-description"
            rows="4"
            :placeholder="t('admin.settings.descriptionPlaceholder')"
          />
          <span class="field-hint">{{ t('admin.settings.descriptionHint') }}</span>
          <span
            v-if="errors.platform_description"
            class="field-error"
            data-test="platform-description-error"
          >
            {{ errors.platform_description }}
          </span>
        </label>
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
          <span class="field-label">{{ t('admin.settings.minWithdrawal') }}</span>
          <input
            v-model.number="form.min_withdrawal_amount"
            data-test="min-withdrawal"
            type="number"
            min="0"
            step="10000"
          />
          <span class="field-hint">
            {{ t('admin.settings.minWithdrawalHint', { currency: currencyLabel }) }}
          </span>
          <span
            v-if="errors.min_withdrawal_amount"
            class="field-error"
            data-test="min-withdrawal-error"
          >
            {{ errors.min_withdrawal_amount }}
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

.field {
  display: block;
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
  padding-top: 4px;
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
