<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useField, useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'

import BaseBanner from '../../auth/components/BaseBanner.vue'
import { useAuthStore } from '../../auth/stores/useAuthStore'
import type { ProfileUpdatePayload } from '../../auth/api/auth'
import { uploadAvatar } from '../api/avatar'

const auth = useAuthStore()

const role = computed(() => auth.user?.role ?? 'student')
const isStudent = computed(() => role.value === 'student')
const isInstructor = computed(() => role.value === 'instructor')

const MAX_SUMMARY = 200

const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'مبتدی' },
  { value: 'pre-intermediate', label: 'پیش‌متوسط' },
  { value: 'intermediate', label: 'متوسط' },
  { value: 'advanced', label: 'پیشرفته' },
]

const LANGUAGE_OPTIONS = [
  'انگلیسی',
  'آلمانی',
  'فرانسوی',
  'عربی',
  'ترکی استانبولی',
  'اسپانیایی',
  'ایتالیایی',
]

// One static schema keeps validation stable across role switches; the role only
// decides which fields are rendered and which are sent to the API.
const profileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, 'لطفاً نام و نام خانوادگی خود را وارد کنید')
    .max(255, 'نام نمی‌تواند بیشتر از ۲۵۵ کاراکتر باشد'),
  phone_number: z.string().trim().max(50, 'شماره تماس نمی‌تواند بیشتر از ۵۰ کاراکتر باشد'),
  current_level: z.string().max(64, 'سطح زبان معتبر نیست'),
  learning_goal: z.string().max(1000, 'هدف یادگیری نمی‌تواند بیشتر از ۱۰۰۰ کاراکتر باشد'),
  hourly_rate: z.coerce
    .number()
    .int('قیمت هر ساعت باید عدد صحیح باشد')
    .min(0, 'قیمت هر ساعت نمی‌تواند منفی باشد'),
  teaching_languages: z.array(z.string()).max(20, 'حداکثر ۲۰ زبان قابل انتخاب است'),
  short_summary: z
    .string()
    .max(MAX_SUMMARY, 'خلاصه رزومه نمی‌تواند بیشتر از ۲۰۰ کاراکتر باشد'),
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
const avatarPreview = ref(auth.user?.avatar_url ?? '')
const avatarUploading = ref(false)
const avatarError = ref('')
let previewObjectUrl: string | null = null

const summaryLength = computed(() => String(shortSummary.value ?? '').length)

const formError = ref('')
const successMessage = ref('')
const submitting = ref(false)

function buildPreview(file: File): string {
  if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl)
    previewObjectUrl = URL.createObjectURL(file)
    return previewObjectUrl
  }
  return avatarUrl.value
}

async function onAvatarSelected(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  avatarError.value = ''
  avatarPreview.value = buildPreview(file)
  avatarUploading.value = true

  try {
    avatarUrl.value = await uploadAvatar(file)
    avatarPreview.value = avatarUrl.value
  } catch {
    avatarError.value = 'آپلود تصویر ناموفق بود. دوباره تلاش کنید.'
    avatarPreview.value = avatarUrl.value
  } finally {
    avatarUploading.value = false
  }
}

watch(
  () => auth.user,
  (user) => {
    if (!user) return
    resetForm({ values: initialValues() })
    avatarUrl.value = user.avatar_url ?? ''
    avatarPreview.value = user.avatar_url ?? ''
  },
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
    successMessage.value = 'اطلاعات پروفایل با موفقیت ذخیره شد.'
  } catch {
    formError.value = 'خطا در ذخیره اطلاعات پروفایل'
  } finally {
    submitting.value = false
  }
})
</script>

<template>
  <section class="profile-page" data-test="profile-page">
    <header class="profile-header">
      <div>
        <p class="eyebrow">تنظیمات حساب</p>
        <h2>پروفایل من</h2>
        <p class="subtitle">
          اطلاعات شخصی و
          <template v-if="isStudent">آموزشی</template>
          <template v-else-if="isInstructor">حرفه‌ای</template>
          <template v-else>حساب</template>
          خود را تکمیل و به‌روز کنید.
        </p>
      </div>
      <span class="role-chip">{{ auth.user?.role }}</span>
    </header>

    <form class="profile-card" data-test="profile-form" @submit="onSubmit">
      <BaseBanner v-if="successMessage" variant="success" :message="successMessage" />

      <div v-if="formError" class="form-banner" role="alert">{{ formError }}</div>

      <div class="section-title">
        <h3>اطلاعات عمومی</h3>
        <p>این اطلاعات برای همه نقش‌ها نمایش داده می‌شود.</p>
      </div>

      <div class="avatar-row">
        <span class="avatar-frame">
          <img
            v-if="avatarPreview"
            data-test="avatar-preview"
            :src="avatarPreview"
            alt="پیش‌نمایش عکس پروفایل"
          />
          <span v-else class="avatar-placeholder" aria-hidden="true">؟</span>
        </span>

        <label class="avatar-control">
          <span class="field-label">عکس پروفایل</span>
          <input
            data-test="avatar-upload"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            :disabled="avatarUploading"
            @change="onAvatarSelected"
          />
          <span class="upload-hint">
            {{ avatarUploading ? 'در حال آپلود…' : 'فرمت‌های PNG، JPG، WebP یا GIF — حداکثر ۲ مگابایت' }}
          </span>
          <span v-if="avatarError" class="field-error" data-test="avatar-error" role="alert">
            {{ avatarError }}
          </span>
        </label>
      </div>

      <div class="field-grid">
        <label class="field">
          <span class="field-label">نام و نام خانوادگی</span>
          <input
            v-model="fullName"
            data-test="full-name"
            type="text"
            autocomplete="name"
            placeholder="مثال: علی احمدی"
          />
          <span v-if="fullNameError" class="field-error" role="alert">{{ fullNameError }}</span>
        </label>

        <label class="field">
          <span class="field-label">شماره تماس</span>
          <input
            v-model="phoneNumber"
            data-test="phone"
            type="tel"
            autocomplete="tel"
            placeholder="مثال: ۰۹۱۲۱۲۳۴۵۶۷"
          />
        </label>
      </div>

      <template v-if="isStudent">
        <div class="section-title" data-test="student-section">
          <h3>اطلاعات یادگیری</h3>
          <p>این فیلدها مخصوص حساب‌های زبان‌آموز است.</p>
        </div>

        <div class="field-grid">
          <label class="field">
            <span class="field-label">سطح زبان</span>
            <select v-model="currentLevel" data-test="current-level">
              <option v-for="level in LEVEL_OPTIONS" :key="level.value" :value="level.value">
                {{ level.label }}
              </option>
            </select>
          </label>

          <label class="field">
            <span class="field-label">هدف یادگیری</span>
            <input
              v-model="learningGoal"
              data-test="learning-goal"
              type="text"
              placeholder="مثال: آماده‌سازی برای آیلتس"
            />
          </label>
        </div>
      </template>

      <template v-else-if="isInstructor">
        <div class="section-title" data-test="instructor-section">
          <h3>اطلاعات مدرس</h3>
          <p>این فیلدها مخصوص حساب‌های مدرس است.</p>
        </div>

        <div class="field-grid">
          <label class="field">
            <span class="field-label">قیمت هر ساعت (تومان)</span>
            <input
              v-model="hourlyRate"
              data-test="hourly-rate"
              type="number"
              min="0"
              step="1000"
              placeholder="مثال: ۲۵۰۰۰۰"
            />
            <span v-if="hourlyRateError" class="field-error" role="alert">
              {{ hourlyRateError }}
            </span>
          </label>
        </div>

        <div class="field">
          <span class="field-label">زبان‌های تدریس</span>
          <div class="chip-group" data-test="teaching-languages">
            <label v-for="language in LANGUAGE_OPTIONS" :key="language" class="chip">
              <input
                v-model="teachingLanguages"
                data-test="language-option"
                type="checkbox"
                :value="language"
              />
              <span>{{ language }}</span>
            </label>
          </div>
        </div>

        <label class="field">
          <span class="field-label">خلاصه رزومه</span>
          <textarea
            v-model="shortSummary"
            data-test="short-summary"
            rows="3"
            :maxlength="MAX_SUMMARY"
            placeholder="معرفی کوتاه از خودتان (حداکثر ۲۰۰ کاراکتر)"
          ></textarea>
          <span class="field-hint" data-test="summary-counter">
            {{ summaryLength }} / {{ MAX_SUMMARY }}
          </span>
          <span v-if="summaryError" class="field-error" role="alert">{{ summaryError }}</span>
        </label>
      </template>

      <div class="form-actions">
        <button type="submit" class="save-button" data-test="submit" :disabled="submitting">
          {{ submitting ? 'در حال ذخیره…' : 'ذخیره اطلاعات' }}
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
