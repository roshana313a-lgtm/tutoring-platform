<script setup lang="ts">
defineProps<{
  message?: string
}>()
</script>

<template>
  <p v-if="message" class="form-error" role="alert">{{ message }}</p>
</template>

<style scoped>
.form-error {
  margin: 6px 0 0;
  color: var(--error);
  font-size: 0.8rem;
  line-height: 1.4;
}
</style>
