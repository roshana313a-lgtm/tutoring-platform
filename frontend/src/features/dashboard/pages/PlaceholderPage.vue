<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Construction } from 'lucide-vue-next'

const route = useRoute()

const title = computed(() => {
  const metaTitle = route.meta.title
  return typeof metaTitle === 'string' && metaTitle.length > 0 ? metaTitle : 'این بخش'
})
</script>

<template>
  <section class="placeholder-page" data-test="placeholder-page">
    <span class="placeholder-icon" aria-hidden="true">
      <Construction :size="26" :stroke-width="1.7" />
    </span>
    <h2>{{ title }}</h2>
    <p>این بخش در حال ساخت است و به‌زودی در دسترس قرار می‌گیرد.</p>
  </section>
</template>

<style scoped>
.placeholder-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 64px 28px;
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  text-align: center;
}

.placeholder-icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--primary-light);
  color: var(--primary);
}

.placeholder-page h2 {
  margin: 0;
  color: var(--primary);
  font-size: var(--font-size-title);
}

.placeholder-page p {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--font-size-sm);
}
</style>
