<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useField, useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'

import BaseBanner from '../../auth/components/BaseBanner.vue'
import { useAuthStore } from '../../auth/stores/useAuthStore'
import type { ProfileUpdatePayload } from '../../auth/api/auth'

const auth = useAuthStore()
const isInstructor = computed(() => auth.user?.role === 'instructor')

const profileSchema = z.object({
  full_name: z.string().trim().min(1, 'لطفاً نام و نام خانوادگی خود را وارد کنید'),
  phone_number: z.string().max(50, 'شماره تماس نمیتواند بیشتر از ۵۰ کاراکتر باشد'),
  bio: z.string().max(5000, 'بیوگرافی نمیتواند بیشتر از ۵۰۰۰ کاراکتر باشد'),
  years_of_experience: z.coerce
    .number()
    .int('سابقه تدریس باید عدد صحیح باشد')
    .min(0, 'سابقه تدریس نمیتواند منفی باشد'),
})

const { handleSubmit, resetForm } = useForm({
  validationSchema: toTypedSchema(profileSchema),
  initialValues: {
    full_name: auth.user?.full_name ?? '',
    phone_number: auth.user?.phone_number ?? '',
    bio: auth.user?.bio ?? '',
    years_of_experience: auth.user?.years_of_experience ?? 0,
  },
})

const { value: fullName, errorMessage: fullNameError } = useField<string>('full_name')
const { value: phoneNumber } = useField<string>('phone_number')
const { value: bio } = useField<string>('bio')
const { value: years, errorMessage: yearsError } = useField<string | number>('years_of_experience')

const formError = ref('')
const successMessage = ref('')
const submitting = ref(false)

watch(
  () => auth.user,
  (user) => {
    if (!user) return
    resetForm({
      values: {
        full_name: user.full_name ?? '',
        phone_number: user.phone_number ?? '',
        bio: user.bio ?? '',
        years_of_experience: user.years_of_experience ?? 0,
      },
    })
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

  if (isInstructor.value) {
    payload.bio = values.bio
    payload.years_of_experience = values.years_of_experience
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
  <section class="profile-page">
    <header class="profile-header">
      <div>
        <p class="eyebrow">تنظیمات حساب</p>
        <h2>پروفایل من</h2>
        <p class="subtitle">اطلاعات شخصی و حرفهای خود را تکمیل و بهروز کنید.</p>
      </div>
    </header>

    <form class="profile-card" @submit="onSubmit">
      <BaseBanner
        v-if="successMessage"
        variant="success"
        :message="successMessage"
      />

      <div v-if="formError" class="form-banner" role="alert">{{ formError }}</div>

      <div class="section-title">
        <h3>اطلاعات عمومی</h3>
        <p>این اطلاعات در سراسر پنل نمایش داده میشوند.</p>
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

      <label class="field avatar-field">
        <span class="field-label">عکس پروفایل</span>
        <span class="avatar-upload">
          <input data-test="avatar-upload" type="file" accept="image/*" aria-label="عکس پروفایل" />
          <span class="upload-hint">انتخاب تصویر (آپلود به زودی فعال میشود)</span>
        </span>
      </label>

      <template v-if="isInstructor">
        <div class="section-title">
          <h3>اطلاعات مدرس</h3>
          <p>این فیلدها فقط برای حسابهای مدرس قابل ویرایش هستند.</p>
        </div>

        <label class="field">
          <span class="field-label">بیوگرافی</span>
          <textarea
            v-model="bio"
            data-test="bio"
            rows="4"
            placeholder="معرفی کوتاه و سوابق خود را بنویسید"
          ></textarea>
        </label>

        <label class="field">
          <span class="field-label">سابقه تدریس</span>
          <input
            v-model="years"
            data-test="years"
            type="number"
            min="0"
            step="1"
            placeholder="تعداد سال"
          />
          <span v-if="yearsError" class="field-error" role="alert">{{ yearsError }}</span>
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

input:focus,
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

.avatar-upload {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  background: var(--bg);
}

.upload-hint {
  color: var(--text-muted);
  font-size: var(--font-size-xs);
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
