<script setup lang="ts">
import { computed, type Component } from 'vue'
import { CircleCheck, CircleX, Clock } from 'lucide-vue-next'

type BadgeTone = 'success' | 'warning' | 'danger'

const props = withDefaults(
  defineProps<{
    label: string
    tone?: BadgeTone
  }>(),
  { tone: 'success' },
)

const icon = computed<Component>(() => {
  switch (props.tone) {
    case 'warning':
      return Clock
    case 'danger':
      return CircleX
    default:
      return CircleCheck
  }
})
</script>

<template>
  <span class="status-badge" :class="`status-${tone}`">
    <component :is="icon" :size="13" :stroke-width="2.5" />
    {{ label }}
  </span>
</template>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: var(--font-size-xs);
  font-weight: 600;
  white-space: nowrap;
}

.status-success {
  background: rgba(22, 163, 74, 0.12);
  color: var(--success);
}

.status-warning {
  background: rgba(217, 119, 6, 0.12);
  color: #b45309;
}

.status-danger {
  background: rgba(185, 28, 28, 0.1);
  color: var(--error);
}
</style>
