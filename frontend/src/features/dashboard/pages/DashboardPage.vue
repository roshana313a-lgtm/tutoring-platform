<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { useAuthStore } from '../../auth/stores/useAuthStore'

const auth = useAuthStore()
const router = useRouter()

const roleLabel = computed(() => {
  switch (auth.user?.role) {
    case 'student':
      return 'زبان آموز'
    case 'instructor':
      return 'مدرس'
    case 'admin':
      return 'مدیر'
    default:
      return '—'
  }
})

async function logout(): Promise<void> {
  auth.logout()
  await router.push('/login')
}
</script>

<template>
  <main class="dashboard-page">
    <header class="dashboard-header">
      <div>
        <p class="institute-name">مؤسسه آموزش آنلاین</p>
        <h1>داشبورد</h1>
      </div>

      <button type="button" class="logout-button" @click="logout">خروج</button>
    </header>

    <section class="welcome-card">
      <h2>خوش آمدید</h2>
      <p class="user-email">{{ auth.user?.email }}</p>
      <p class="user-role">نقش: {{ roleLabel }}</p>
    </section>
  </main>
</template>

<style scoped>
.dashboard-page {
  min-height: 100vh;
  padding: 32px 20px;
  background: var(--bg);
}

.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  max-width: 880px;
  margin: 0 auto 28px;
  padding: 20px 24px;
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}

.institute-name {
  margin: 0 0 4px;
  color: var(--text-muted);
  font-size: 0.85rem;
}

h1 {
  margin: 0;
  color: var(--primary);
  font-size: 1.6rem;
}

.logout-button {
  padding: 10px 20px;
  border: 1px solid var(--primary);
  border-radius: var(--radius);
  background: transparent;
  color: var(--primary);
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.logout-button:hover {
  background: var(--primary);
  color: #fff;
}

.welcome-card {
  width: 100%;
  max-width: 880px;
  margin: 0 auto;
  padding: 36px;
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}

h2 {
  margin: 0 0 18px;
  font-size: 1.25rem;
}

.user-email {
  margin: 0 0 8px;
  font-size: 1rem;
  font-weight: 600;
}

.user-role {
  margin: 0;
  color: var(--text-muted);
}

@media (max-width: 600px) {
  .dashboard-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .welcome-card {
    padding: 28px 22px;
  }
}
</style>
