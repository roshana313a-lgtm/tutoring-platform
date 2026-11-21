<script setup lang="ts">
import { ref } from 'vue'
import { useField, useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { useRouter } from 'vue-router'
import { z } from 'zod'

import BaseBanner from '../components/BaseBanner.vue'
import BaseButton from '../components/BaseButton.vue'
import BaseInput from '../components/BaseInput.vue'
import { ApiError } from '../../../shared/api/http'
import { useAuthStore } from '../stores/useAuthStore'
import { authErrorMessage } from '../utils/authErrorMessage'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const { handleSubmit, setFieldError } = useForm({
  validationSchema: toTypedSchema(loginSchema),
})
const { value: email, errorMessage: emailError } = useField<string>('email')
const { value: password, errorMessage: passwordError } = useField<string>('password')

const auth = useAuthStore()
const router = useRouter()
const formError = ref('')
const successMessage = ref('')
const submitting = ref(false)
const rememberMe = ref(false)

const onSubmit = handleSubmit(async (values) => {
  formError.value = ''
  successMessage.value = ''
  submitting.value = true

  try {
    await auth.login(values)
    successMessage.value = 'ورود موفق. در حال انتقال...'
    await new Promise((resolve) => setTimeout(resolve, 1000))
    await router.push('/dashboard')
  } catch (error) {
    formError.value = authErrorMessage(error)
    if (error instanceof ApiError && error.status === 422) {
      setFieldError('email', formError.value)
    }
    submitting.value = false
  }
})
</script>

<template>
  <main class="auth-page">
    <form class="auth-card" @submit="onSubmit">
      <header class="card-header">
        <div class="monogram" aria-hidden="true">آ</div>
        <h1>مؤسسه آموزش آنلاین</h1>
        <p class="subtitle">ورود به حساب کاربری</p>
      </header>

      <nav class="auth-tabs" aria-label="تب های احراز هویت">
        <RouterLink to="/login" class="tab active" aria-current="page">ورود</RouterLink>
        <RouterLink to="/register" class="tab">ثبت نام</RouterLink>
      </nav>

      <BaseBanner
        v-if="successMessage"
        variant="success"
        :message="successMessage"
      />

      <BaseBanner
        v-if="formError"
        variant="error"
        :message="formError"
        dismissible
        @dismiss="formError = ''"
      />

      <BaseInput
        v-model="email"
        label="ایمیل"
        name="email"
        type="email"
        autocomplete="email"
        :error="emailError"
      />

      <BaseInput
        v-model="password"
        label="رمز عبور"
        name="password"
        type="password"
        autocomplete="current-password"
        :error="passwordError"
      />

      <div class="form-options">
        <label class="checkbox-row">
          <input v-model="rememberMe" type="checkbox" />
          <span>مرا به خاطر بسپار</span>
        </label>
        <span class="text-link">فراموشی رمز عبور؟</span>
      </div>

      <BaseButton type="submit" :loading="submitting">
        {{ submitting ? 'در حال ورود…' : 'ورود' }}
      </BaseButton>

      <div class="divider"><span>یا</span></div>

      <div class="social-buttons">
        <button type="button" class="social-button" aria-label="ورود با Google">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.9h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.37z"
            />
            <path
              fill="#34A853"
              d="M12 22c2.7 0 4.96-.9 6.62-2.4l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.13H3.06v2.6A10 10 0 0 0 12 22z"
            />
            <path
              fill="#FBBC05"
              d="M6.41 13.92a6 6 0 0 1 0-3.84v-2.6H3.06a10 10 0 0 0 0 9.04l3.35-2.6z"
            />
            <path
              fill="#EA4335"
              d="M12 5.98c1.47 0 2.79.51 3.83 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.48l3.35 2.6C7.2 7.74 9.4 5.98 12 5.98z"
            />
          </svg>
          <span>Google</span>
        </button>

        <button type="button" class="social-button" aria-label="ورود با Apple">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              fill="currentColor"
              d="M16.7 12.9c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.7.8-3.4.8-.7 0-1.8-.8-3-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.7-.4 6.8 1.1 9 .7 1.1 1.6 2.3 2.8 2.2 1.1 0 1.5-.7 2.9-.7 1.3 0 1.7.7 2.9.7 1.2 0 2-1.1 2.7-2.2.8-1.2 1.2-2.4 1.2-2.5 0 0-2.2-.9-2.2-3.6zM14.6 6.7c.6-.8 1-1.9.9-3-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-1 2.9 1 .1 2.1-.5 2.8-1.3z"
            />
          </svg>
          <span>Apple</span>
        </button>
      </div>

      <p class="auth-link">
        <span>حساب ندارید؟</span>
        <RouterLink to="/register">ثبت نام کنید</RouterLink>
      </p>
    </form>
  </main>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px 16px;
  background: var(--bg);
}

.auth-card {
  position: relative;
  width: 100%;
  max-width: 440px;
  padding: 40px;
  overflow: hidden;
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  text-align: right;
}

.auth-card > * {
  position: relative;
  z-index: 1;
}

.auth-card::before,
.auth-card::after {
  content: '';
  position: absolute;
  pointer-events: none;
  opacity: 0.35;
}

.auth-card::before {
  top: -72px;
  right: -64px;
  width: 150px;
  height: 150px;
  border: 18px solid var(--primary-light);
  border-radius: 50%;
}

.auth-card::after {
  bottom: -78px;
  left: -58px;
  width: 140px;
  height: 140px;
  border: 16px solid var(--primary-light);
  border-radius: 34px;
  transform: rotate(28deg);
}

.card-header {
  margin-bottom: 24px;
  text-align: center;
}

.monogram {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  margin: 0 auto 14px;
  border-radius: 50%;
  background: var(--primary-light);
  color: var(--primary);
  font-size: 1.5rem;
  font-weight: 700;
}

.card-header h1 {
  margin: 0 0 6px;
  font-size: 1.25rem;
  font-weight: 700;
}

.subtitle {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.auth-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 24px;
  padding: 5px;
  border-radius: 999px;
  background: var(--bg);
}

.tab {
  flex: 1;
  padding: 10px 12px;
  border-radius: 999px;
  color: var(--text-muted);
  font-size: 0.9rem;
  font-weight: 600;
  text-align: center;
  transition:
    background 0.15s ease,
    color 0.15s ease,
    box-shadow 0.15s ease;
}

.tab:hover:not(.active) {
  color: var(--primary);
  background: var(--primary-light);
}

.tab.active {
  background: var(--primary);
  color: #fff;
  box-shadow: 0 3px 10px rgba(31, 111, 92, 0.18);
}

.form-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: -4px 0 22px;
  font-size: 0.85rem;
}

.checkbox-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--text-muted);
  cursor: pointer;
}

.checkbox-row input {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: var(--primary);
}

.text-link {
  color: var(--primary);
  font-size: 0.85rem;
  font-weight: 500;
}

.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 22px 0 16px;
  color: var(--text-muted);
  font-size: 0.8rem;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
}

.social-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.social-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 44px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--card-bg);
  color: var(--text);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
}

.social-button:hover {
  border-color: var(--primary);
  background: var(--primary-light);
}

.auth-link {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
  margin: 22px 0 0;
  color: var(--text-muted);
  font-size: 0.875rem;
}

.auth-link a {
  font-weight: 600;
}

@media (max-width: 480px) {
  .auth-page {
    padding: 16px;
    place-items: start center;
  }

  .auth-card {
    max-width: none;
    padding: 28px 20px;
  }

  .monogram {
    width: 48px;
    height: 48px;
    font-size: 1.3rem;
  }

  .card-header h1 {
    font-size: 1.1rem;
  }

  .subtitle,
  .tab {
    font-size: 0.85rem;
  }

  .form-options {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }

  .social-buttons {
    grid-template-columns: 1fr;
  }
}
</style>
