<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useField, useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'

import BaseBanner from '../../auth/components/BaseBanner.vue'
import { useAuthStore } from '../../auth/stores/useAuthStore'
import type { ProfileUpdatePayload } from '../../auth/api/auth'
import { resolveMediaUrl } from '../../../shared/api/media'
import { uploadAvatar } from '../api/avatar'

const auth = useAuthStore()
const { t } = useI18n()

const role = computed(() => auth.user?.role ?? 'student')
const isStudent = computed(() => role.value === 'student')
const isInstructor = computed(() => role.value === 'instructor')

const MAX_SUMMARY = 200

const LEVEL_OPTIONS = [
  { value: 'beginner', labelKey: 'profile.levels.beginner' },
  { value: 'pre-intermediate', labelKey: 'profile.levels.pre-intermediate' },
  { value: 'intermediate', labelKey: 'profile.levels.intermediate' },
  { value: 'advanced', labelKey: 'profile.levels.advanced' },
]

// The stored value stays a stable identifier; only the label is translated.
const LANGUAGE_OPTIONS = [
  { value: 'انگلیسی', labelKey: 'profile.languageOptions.english' },
  { value: 'آلمانی', labelKey: 'profile.languageOptions.german' },
  { value: 'فرانسوی', labelKey: 'profile.languageOptions.french' },
  { value: 'عربی', labelKey: 'profile.languageOptions.arabic' },
  { value: 'ترکی استانبولی', labelKey: 'profile.languageOptions.turkish' },
  { value: 'اسپانیایی', labelKey: 'profile.languageOptions.spanish' },
  { value: 'ایتالیایی', labelKey: 'profile.languageOptions.italian' },
]

// One static schema keeps validation stable across role switches; the role only
// decides which fields are rendered and which are sent to the API.
const profileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, t('validation.fullNameRequired'))
    .max(255, t('validation.fullNameMax')),
  phone_number: z.string().trim().max(50, t('validation.phoneMax')),
  current_level: z.string().max(64, t('validation.levelInvalid')),
  learning_goal: z.string().max(1000, t('validation.goalMax')),
  hourly_rate: z.coerce
    .number()
    .int(t('validation.hourlyRateInteger'))
    .min(0, t('validation.hourlyRateMin')),
  teaching_languages: z.array(z.string()).max(20, t('validation.languagesMax')),
  short_summary: z
    .string()
    .max(MAX_SUMMARY, t('validation.summaryMax')),
})

function initialValues() {
  return {
    full_name: auth.user?.full_name ?? '',
    phone_number: auth.user?.phone_number ?? '',
    current_level: auth.user?.current_level || 'beginner',
    learning_goal: auth.user?.learning_goal ?? '',
    hourly_rate: auth.user?.hourly_rate ?? 0,
    teaching_languages: auth.user?.teaching_languages ?? [],
    short_summary: auth.user?.short_summary ?? '',
  }
}

const { handleSubmit, resetForm } = useForm({
  validationSchema: toTypedSchema(profileSchema),
  initialValues: initialValues(),
})

const { value: fullName, errorMessage: fullNameError } = useField<string>('full_name')
const { value: phoneNumber } = useField<string>('phone_number')
const { value: currentLevel } = useField<string>('current_level')
const { value: learningGoal } = useField<string>('learning_goal')
const { value: hourlyRate, errorMessage: hourlyRateError } = useField<string | number>(
  'hourly_rate',
)
const { value: teachingLanguages } = useField<string[]>('teaching_languages')
const { value: shortSummary, errorMessage: summaryError } = useField<string>('short_summary')

const avatarUrl = ref(auth.user?.avatar_url ?? '')
const avatarPreview = ref(resolveMediaUrl(auth.user?.avatar_url))
const avatarUploading = ref(false)
const avatarError = ref('')
let previewObjectUrl: string | null = null

const summaryLength = computed(() => String(shortSummary.value ?? '').length)

const formError = ref('')
const successMessage = ref('')
const submitting = ref(false)

function releasePreviewObjectUrl(): void {
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl)
    previewObjectUrl = null
  }
}

function buildPreview(file: File): string {
  if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    releasePreviewObjectUrl()
    previewObjectUrl = URL.createObjectURL(file)
    return previewObjectUrl
  }
  return avatarPreview.value
}

async function onAvatarSelected(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  avatarError.value = ''
  avatarPreview.value = buildPreview(file)
  avatarUploading.value = true

  try {
    const uploadedUrl = await uploadAvatar(file)
    avatarUrl.value = uploadedUrl
    releasePreviewObjectUrl()
    avatarPreview.value = resolveMediaUrl(uploadedUrl)
    // Keep the store in sync so the top bar and any other avatar surface update
    // without waiting for the form to be submitted.
    auth.setAvatar(uploadedUrl)
  } catch {
    avatarError.value = t('errors.avatarUpload')
    releasePreviewObjectUrl()
    avatarPreview.value = resolveMediaUrl(avatarUrl.value)
  } finally {
    avatarUploading.value = false
  }
}

watch(
  () => auth.user,
  (user, previous) => {
    if (!user) return
    // An avatar-only store update must not wipe unsaved form edits.
    if (previous?.id !== user.id) resetForm({ values: initialValues() })
    avatarUrl.value = user.avatar_url ?? ''
    avatarPreview.value = resolveMediaUrl(user.avatar_url)
  },
)

const subtitle = computed(() =>
  isStudent.value
    ? t('profile.subtitleStudent')
    : isInstructor.value
      ? t('profile.subtitleInstructor')
      : t('profile.subtitleOther'),
)

const onSubmit = handleSubmit(async (values) => {
  formError.value = ''
  successMessage.value = ''
  submitting.value = true

  const payload: ProfileUpdatePayload = {
    full_name: values.full_name,
    phone_number: values.phone_number,
  }
  if (avatarUrl.value) payload.avatar_url = avatarUrl.value

  if (isStudent.value) {
    payload.current_level = values.current_level
    payload.learning_goal = values.learning_goal
  }

  if (isInstructor.value) {
    payload.hourly_rate = Number(values.hourly_rate)
    payload.teaching_languages = values.teaching_languages
    payload.short_summary = values.short_summary
  }

  try {
    await auth.updateProfile(payload)
    successMessage.value = t('profile.saved')
  } catch {
    formError.value = t('errors.profileSave')
  } finally {
    submitting.value = false
  }
})
</script>

<template>
  <section class="profile-page" data-test="profile-page">
    <header class="profile-header">
      <div>
        <p class="eyebrow">{{ t('profile.eyebrow') }}</p>
        <h2>{{ t('profile.title') }}</h2>
        <p class="subtitle">{{ subtitle }}</p>
      </div>
      <span class="role-chip">{{ auth.user?.role ? t(`roles.${auth.user.role}`) : '—' }}</span>
    </header>

    <form class="profile-card" data-test="profile-form" @submit="onSubmit">
      <BaseBanner v-if="successMessage" variant="success" :message="successMessage" />

      <div v-if="formError" class="form-banner" role="alert">{{ formError }}</div>

      <div class="section-title">
        <h3>{{ t('profile.general') }}</h3>
        <p>{{ t('profile.generalHint') }}</p>
      </div>

      <div class="avatar-row">
        <span class="avatar-frame">
          <img
            v-if="avatarPreview"
            data-test="avatar-preview"
            :src="avatarPreview"
            :alt="t('profile.avatarAlt')"
          />
          <span v-else class="avatar-placeholder" aria-hidden="true">؟</span>
        </span>

        <label class="avatar-control">
          <span class="field-label">{{ t('profile.avatar') }}</span>
          <input
            data-test="avatar-upload"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            :disabled="avatarUploading"
            @change="onAvatarSelected"
          />
          <span class="upload-hint">
            {{ avatarUploading ? t('profile.avatarUploading') : t('profile.avatarHint') }}
          </span>
          <span v-if="avatarError" class="field-error" data-test="avatar-error" role="alert">
            {{ avatarError }}
          </span>
        </label>
      </div>

      <div class="field-grid">
        <label class="field">
          <span class="field-label">{{ t('profile.fullName') }}</span>
          <input
            v-model="fullName"
            data-test="full-name"
            type="text"
            autocomplete="name"
            :placeholder="t('profile.fullNamePlaceholder')"
          />
          <span v-if="fullNameError" class="field-error" role="alert">{{ fullNameError }}</span>
        </label>

        <label class="field">
          <span class="field-label">{{ t('profile.phone') }}</span>
          <input
            v-model="phoneNumber"
            data-test="phone"
            type="tel"
            autocomplete="tel"
            :placeholder="t('profile.phonePlaceholder')"
          />
        </label>
      </div>

      <template v-if="isStudent">
        <div class="section-title" data-test="student-section">
          <h3>{{ t('profile.learning') }}</h3>
          <p>{{ t('profile.learningHint') }}</p>
        </div>

        <div class="field-grid">
          <label class="field">
            <span class="field-label">{{ t('profile.level') }}</span>
            <select v-model="currentLevel" data-test="current-level">
              <option v-for="level in LEVEL_OPTIONS" :key="level.value" :value="level.value">
                {{ t(level.labelKey) }}
              </option>
            </select>
          </label>

          <label class="field">
            <span class="field-label">{{ t('profile.goal') }}</span>
            <input
              v-model="learningGoal"
              data-test="learning-goal"
              type="text"
              :placeholder="t('profile.goalPlaceholder')"
            />
          </label>
        </div>
      </template>

      <template v-else-if="isInstructor">
        <div class="section-title" data-test="instructor-section">
          <h3>{{ t('profile.teaching') }}</h3>
          <p>{{ t('profile.teachingHint') }}</p>
        </div>

        <div class="field-grid">
          <label class="field">
            <span class="field-label">{{ t('profile.hourlyRate') }}</span>
            <input
              v-model="hourlyRate"
              data-test="hourly-rate"
              type="number"
              min="0"
              step="1000"
              :placeholder="t('profile.hourlyRatePlaceholder')"
            />
            <span v-if="hourlyRateError" class="field-error" role="alert">
              {{ hourlyRateError }}
            </span>
          </label>
        </div>

        <div class="field">
          <span class="field-label">{{ t('profile.languages') }}</span>
          <div class="chip-group" data-test="teaching-languages">
            <label v-for="language in LANGUAGE_OPTIONS" :key="language.value" class="chip">
              <input
                v-model="teachingLanguages"
                data-test="language-option"
                type="checkbox"
                :value="language.value"
              />
              <span>{{ t(language.labelKey) }}</span>
            </label>
          </div>
        </div>

        <label class="field">
          <span class="field-label">{{ t('profile.summary') }}</span>
          <textarea
            v-model="shortSummary"
            data-test="short-summary"
            rows="3"
            :maxlength="MAX_SUMMARY"
            :placeholder="t('profile.summaryPlaceholder')"
          ></textarea>
          <span class="field-hint" data-test="summary-counter">
            {{ summaryLength }} / {{ MAX_SUMMARY }}
          </span>
          <span v-if="summaryError" class="field-error" role="alert">{{ summaryError }}</span>
        </label>
      </template>

      <div class="form-actions">
        <button type="submit" class="save-button" data-test="submit" :disabled="submitting">
          {{ submitting ? t('common.saving') : t('common.save') }}
        </button>
      </div>
    </form>
  </section>
</template>

<style scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.profile-header {
  display: flex;
  align-items: flex-start;
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

.profile-header h2 {
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

.profile-card {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 28px;
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}

.form-banner {
  padding: 12px 16px;
  border: 1px solid var(--error);
  border-radius: var(--radius);
  background: rgba(185, 28, 28, 0.08);
  color: var(--error);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.section-title {
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
}

.section-title h3 {
  margin: 0;
  color: var(--primary);
  font-size: var(--font-size-body);
}

.section-title p {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}

.avatar-row {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.avatar-frame {
  display: grid;
  place-items: center;
  width: 96px;
  height: 96px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: var(--bg);
}

.avatar-frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  color: var(--text-muted);
  font-size: 2rem;
}

.avatar-control {
  display: block;
  flex: 1 1 240px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 18px;
}

.field {
  display: block;
  text-align: right;
}

.field-label {
  display: block;
  margin-bottom: 8px;
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

input,
select,
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

input[type='file'] {
  padding: 10px;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
}

textarea {
  resize: vertical;
}

.field-error {
  display: block;
  margin-top: 6px;
  color: var(--error);
  font-size: var(--font-size-xs);
}

.field-hint {
  display: block;
  margin-top: 6px;
  color: var(--text-muted);
  font-size: var(--font-size-xs);
  text-align: left;
}

.upload-hint {
  display: block;
  margin-top: 6px;
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.chip input {
  width: auto;
  padding: 0;
  accent-color: var(--primary);
}

.form-actions {
  display: flex;
  justify-content: flex-start;
  padding-top: 6px;
}

.save-button {
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

@media (max-width: 600px) {
  .profile-header,
  .profile-card {
    padding: 20px;
  }
}
</style>
