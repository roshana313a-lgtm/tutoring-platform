<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import FormError from './FormError.vue'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    modelValue: string
    label: string
    type?: string
    name?: string
    error?: string
    autocomplete?: string
  }>(),
  {
    type: 'text',
  },
)

defineEmits<{
  'update:modelValue': [value: string]
}>()

const showPassword = ref(false)
const resolvedType = computed(() =>
  props.type === 'password' && showPassword.value ? 'text' : props.type,
)
</script>

<template>
  <label class="field">
    <span class="field-label">{{ label }}</span>

    <span
      class="input-wrap"
      :class="{ 'has-error': Boolean(error), 'with-toggle': type === 'password' }"
    >
      <input
        :type="resolvedType"
        :name="name"
        :value="modelValue"
        :autocomplete="autocomplete"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />

      <button
        v-if="type === 'password'"
        type="button"
        class="eye-button"
        :aria-label="showPassword ? t('auth.hidePassword') : t('auth.showPassword')"
        @click="showPassword = !showPassword"
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
          <path v-if="!showPassword" d="M4 4l16 16" />
        </svg>
      </button>
    </span>

    <FormError v-if="error" :message="error" />
  </label>
</template>

<style scoped>
.field {
  display: block;
  margin-bottom: 18px;
  text-align: right;
}

.field-label {
  display: block;
  margin-bottom: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text);
}

.input-wrap {
  position: relative;
  display: block;
}

input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--card-bg);
  color: var(--text);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.with-toggle input {
  padding-left: 44px;
}

input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow:
    0 0 0 2px var(--primary),
    0 0 0 6px rgba(31, 111, 92, 0.12);
}

.has-error input {
  border-color: var(--error);
}

.eye-button {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.eye-button:hover {
  color: var(--primary);
  background: var(--primary-light);
}

@media (max-width: 480px) {
  .field-label {
    font-size: 0.85rem;
  }

  input {
    padding: 10px 12px;
  }

  .with-toggle input {
    padding-left: 40px;
  }
}
</style>
