<script setup lang="ts">
withDefaults(
  defineProps<{
    variant: 'success' | 'error'
    message: string
    dismissible?: boolean
  }>(),
  {
    dismissible: false,
  },
)

defineEmits<{
  dismiss: []
}>()
</script>

<template>
  <div
    class="base-banner"
    :class="variant === 'success' ? 'banner-success' : 'banner-error'"
    :role="variant === 'success' ? 'status' : 'alert'"
  >
    <span
      v-if="variant === 'success'"
      class="banner-icon"
      data-test="icon-success"
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>

    <span v-else class="banner-icon" data-test="icon-error" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10.3 3.9 2.5 17.4a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4" />
        <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
      </svg>
    </span>

    <span class="banner-message">{{ message }}</span>

    <button
      v-if="dismissible"
      type="button"
      class="banner-close"
      data-test="dismiss"
      aria-label="بستن پیام خطا"
      @click="$emit('dismiss')"
    >
      ×
    </button>
  </div>
</template>

<style scoped>
.base-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 20px;
  padding: 12px 14px;
  border-radius: var(--radius);
  font-size: 0.88rem;
  line-height: 1.6;
}

.banner-success {
  background: #e6f2ee;
  color: #16a34a;
}

.banner-error {
  background: #fef2f2;
  color: #b91c1c;
}

.banner-icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
}

.banner-message {
  flex: 1 1 auto;
}

.banner-close {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
}

.banner-close:hover {
  background: rgba(0, 0, 0, 0.06);
}
</style>
