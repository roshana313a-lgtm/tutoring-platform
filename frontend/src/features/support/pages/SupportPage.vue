<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { LifeBuoy, Send } from 'lucide-vue-next'

import {
  COMPLAINT_DESCRIPTION_MAX,
  COMPLAINT_SUBJECT_MAX,
  submitComplaint,
} from '../api/complaints'

const { t } = useI18n()

const subject = ref('')
const description = ref('')
const submitting = ref(false)
const error = ref('')
const success = ref('')

async function handleSubmit(): Promise<void> {
  error.value = ''
  success.value = ''

  const trimmedSubject = subject.value.trim()
  const trimmedDescription = description.value.trim()
  if (!trimmedSubject || !trimmedDescription) {
    error.value = t('support.page.required')
    return
  }

  submitting.value = true
  try {
    await submitComplaint({ subject: trimmedSubject, description: trimmedDescription })
    success.value = t('support.page.success')
    subject.value = ''
    description.value = ''
  } catch {
    error.value = t('errors.complaintSubmit')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="support-page" data-test="support-page">
    <header class="page-header">
      <span class="header-icon" aria-hidden="true">
        <LifeBuoy :size="22" />
      </span>
      <div>
        <p class="eyebrow">{{ t('support.page.eyebrow') }}</p>
        <h2>{{ t('support.page.title') }}</h2>
        <p class="subtitle">{{ t('support.page.subtitle') }}</p>
      </div>
    </header>

    <p v-if="success" class="banner banner-success" role="status" data-test="support-success">
      {{ success }}
    </p>
    <p v-if="error" class="banner banner-error" role="alert" data-test="support-error">
      {{ error }}
    </p>

    <form class="panel" data-test="support-form" @submit.prevent="handleSubmit">
      <label class="field">
        <span class="field-label">{{ t('support.page.subject') }}</span>
        <input
          v-model="subject"
          type="text"
          class="control"
          :maxlength="COMPLAINT_SUBJECT_MAX"
          :placeholder="t('support.page.subjectPlaceholder')"
          data-test="support-subject"
        />
      </label>

      <label class="field">
        <span class="field-label">{{ t('support.page.description') }}</span>
        <textarea
          v-model="description"
          class="control control-textarea"
          rows="6"
          :maxlength="COMPLAINT_DESCRIPTION_MAX"
          :placeholder="t('support.page.descriptionPlaceholder')"
          data-test="support-description"
        ></textarea>
        <span class="counter">
          {{ description.length }} / {{ COMPLAINT_DESCRIPTION_MAX }}
        </span>
      </label>

      <div class="actions">
        <button type="submit" class="submit" :disabled="submitting" data-test="support-submit">
          <Send :size="16" />
          {{ submitting ? t('support.page.submitting') : t('support.page.submit') }}
        </button>
        <p class="hint">{{ t('support.page.hint') }}</p>
      </div>
    </form>
  </section>
</template>

<style scoped>
.support-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 760px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px 28px;
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}

.header-icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 16px;
  background: var(--primary-light);
  color: var(--primary);
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

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.control {
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

.control:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
  outline: none;
}

.control-textarea {
  min-height: 140px;
  resize: vertical;
  line-height: 1.8;
}

.counter {
  align-self: flex-end;
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}

.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.submit {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 22px;
  border: 1px solid var(--primary);
  border-radius: var(--radius);
  background: var(--primary);
  color: #fff;
  font-family: inherit;
  font-size: var(--font-size-sm);
  font-weight: 700;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease;
}

.submit:hover:not(:disabled) {
  background: var(--primary-hover);
  border-color: var(--primary-hover);
}

.submit:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.hint {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}
</style>
