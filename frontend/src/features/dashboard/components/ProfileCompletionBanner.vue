<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { AlertTriangle } from 'lucide-vue-next'

import { useAuthStore } from '../../auth/stores/useAuthStore'

const auth = useAuthStore()
const { t } = useI18n()

// Reads the store directly so saving the profile (which replaces `auth.user`)
// hides the banner on the spot, without a reload.
const isIncomplete = computed(() => {
  if (!auth.user) return false
  return !auth.user.full_name?.trim() || !auth.user.phone_number?.trim()
})
</script>

<template>
  <div
    v-if="isIncomplete"
    class="profile-banner"
    role="alert"
    data-test="profile-incomplete-banner"
  >
    <AlertTriangle :size="20" :stroke-width="2" class="profile-banner-icon" aria-hidden="true" />
    <p class="profile-banner-text">{{ t('dashboard.profileBanner.text') }}</p>
    <RouterLink
      :to="{ name: 'profile' }"
      class="profile-banner-action"
      data-test="profile-completion-link"
    >
      {{ t('dashboard.profileBanner.action') }}
    </RouterLink>
  </div>
</template>

<style scoped>
.profile-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border: 1px solid #fcd34d;
  border-radius: var(--radius-lg);
  background: #fef3c7;
  color: #92400e;
}

.profile-banner-icon {
  flex: none;
}

.profile-banner-text {
  flex: 1;
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: 600;
  line-height: 1.7;
}

.profile-banner-action {
  flex: none;
  padding: 8px 14px;
  border-radius: var(--radius);
  background: #b45309;
  color: #fff;
  font-size: var(--font-size-xs);
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.2s ease;
}

.profile-banner-action:hover {
  background: #92400e;
  color: #fff;
}

@media (max-width: 600px) {
  .profile-banner {
    align-items: flex-start;
    flex-wrap: wrap;
  }
}
</style>
