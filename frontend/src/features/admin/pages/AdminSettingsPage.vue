<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { LoaderCircle, Save, Settings2 } from 'lucide-vue-next'

import { fetchSettings, saveSettings } from '../api/settings'

const { t } = useI18n()

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const form = reactive({
  platform_name: '',
  default_hourly_rate: 0,
  support_email: '',
})

const errors = reactive<Record<string, string>>({})
const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const formError = ref('')
const successMessage = ref('')

function validate(): boolean {
  for (const key of Object.keys(errors)) delete errors[key]

  if (!form.platform_name.trim()) {
    errors.platform_name = t('validation.platformName')
  }
  if (!Number.isFinite(Number(form.default_hourly_rate)) || Number(form.default_hourly_rate) < 0) {
    errors.default_hourly_rate = t('validation.defaultRate')
  }
  if (!EMAIL_PATTERN.test(form.support_email.trim())) {
    errors.support_email = t('validation.supportEmail')
  }

  return Object.keys(errors).length === 0
}

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''

  try {
    const settings = await fetchSettings()
    form.platform_name = settings.platform_name
    form.default_hourly_rate = settings.default_hourly_rate
    form.support_email = settings.support_email
  } catch {
    loadError.value = t('errors.settingsLoad')
  } finally {
    loading.value = false
  }
}

async function submit(): Promise<void> {
  formError.value = ''
  successMessage.value = ''

  if (!validate()) {
    formError.value = t('errors.formErrors')
    return
  }

  saving.value = true
  try {
    const saved = await saveSettings({
      platform_name: form.platform_name.trim(),
      default_hourly_rate: Number(form.default_hourly_rate),
      support_email: form.support_email.trim(),
    })
    form.platform_name = saved.platform_name
    form.default_hourly_rate = saved.default_hourly_rate
    form.support_email = saved.support_email
    successMessage.value = t('admin.settings.saved')
  } catch {
    formError.value = t('errors.settingsSave')
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

    <p v-if="successMessage" class="banner banner-success" data-test="settings-success">
      {{ successMessage }}
    </p>
    <p v-if="formError" class="banner banner-error" role="alert" data-test="settings-error">
      {{ formError }}
    </p>

    <form class="panel" data-test="settings-form" @submit.prevent="submit">
      <p v-if="loading" class="state" data-test="settings-loading">
        <LoaderCircle :size="16" class="spin" />
        {{ t('common.loading') }}
      </p>

      <p v-else-if="loadError" class="state state-error" role="alert" data-test="settings-load-error">
        {{ loadError }}
      </p>

      <template v-else>
        <label class="field">
          <span class="field-label">{{ t('admin.settings.platformName') }}</span>
          <input v-model="form.platform_name" data-test="platform-name" type="text" />
          <span v-if="errors.platform_name" class="field-error" data-test="platform-name-error">
            {{ errors.platform_name }}
          </span>
        </label>

        <label class="field">
          <span class="field-label">{{ t('admin.settings.defaultRate') }}</span>
          <input
            v-model.number="form.default_hourly_rate"
            data-test="default-rate"
            type="number"
            min="0"
            step="1000"
          />
          <span v-if="errors.default_hourly_rate" class="field-error" data-test="default-rate-error">
            {{ errors.default_hourly_rate }}
          </span>
        </label>

        <label class="field">
          <span class="field-label">{{ t('admin.settings.supportEmail') }}</span>
          <input v-model="form.support_email" data-test="support-email" type="email" dir="ltr" />
          <span v-if="errors.support_email" class="field-error" data-test="support-email-error">
            {{ errors.support_email }}
          </span>
        </label>

        <div class="form-actions">
          <button type="submit" class="save-button" data-test="settings-submit" :disabled="saving">
            <Save :size="16" />
            {{ saving ? t('common.saving') : t('admin.settings.submit') }}
          </button>
        </div>
      </template>
    </form>
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

.banner {
  margin: 0;
  padding: 12px 18px;
  border-radius: var(--radius);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.banner-success {
  border: 1px solid rgba(22, 163, 74, 0.35);
  background: rgba(22, 163, 74, 0.08);
  color: var(--success);
}

.banner-error {
  border: 1px solid var(--error);
  background: rgba(185, 28, 28, 0.08);
  color: var(--error);
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 26px 28px;
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
  padding: 24px 0;
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

.field {
  display: block;
  max-width: 460px;
  text-align: right;
}

.field-label {
  display: block;
  margin-bottom: 8px;
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

input {
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

input:focus {
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

.form-actions {
  padding-top: 4px;
}

.save-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 22px;
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
</style>
