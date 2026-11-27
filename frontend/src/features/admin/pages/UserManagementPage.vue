<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { LoaderCircle, ShieldBan, ShieldCheck, Users } from 'lucide-vue-next'

import { fetchUsers, toggleUserSuspension } from '../api/users'
import type { User } from '../../auth/api/auth'

const { t } = useI18n()

const users = ref<User[]>([])
const loading = ref(true)
const loadError = ref('')
const actionError = ref('')
const successMessage = ref('')
const busyId = ref<string | null>(null)

function displayName(user: User): string {
  const fullName = user.full_name?.trim()
  return fullName && fullName.length > 0 ? fullName : '—'
}

function roleLabel(user: User): string {
  return user.role === 'instructor' ? t('roles.instructor') : t('roles.student')
}

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''

  try {
    users.value = await fetchUsers()
  } catch {
    loadError.value = t('errors.users')
  } finally {
    loading.value = false
  }
}

async function toggle(user: User): Promise<void> {
  busyId.value = user.id
  actionError.value = ''
  successMessage.value = ''

  try {
    const updated = await toggleUserSuspension(user.id)
    users.value = users.value.map((item) =>
      item.id === updated.id ? { ...item, is_active: updated.is_active } : item,
    )
    successMessage.value = updated.is_active
      ? t('admin.users.activatedMessage', { name: displayName(user) })
      : t('admin.users.suspendedMessage', { name: displayName(user) })
  } catch {
    actionError.value = t('errors.userToggle')
  } finally {
    busyId.value = null
  }
}

onMounted(load)
</script>

<template>
  <section class="users-page" data-test="users-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">{{ t('admin.users.eyebrow') }}</p>
        <h2>{{ t('admin.users.title') }}</h2>
        <p class="subtitle">{{ t('admin.users.subtitle') }}</p>
      </div>
      <span class="counter">
        <Users :size="15" />
        {{ t('admin.users.count', { count: users.length }) }}
      </span>
    </header>

    <p v-if="successMessage" class="banner banner-success" data-test="users-success">
      {{ successMessage }}
    </p>
    <p v-if="actionError" class="banner banner-error" role="alert" data-test="users-action-error">
      {{ actionError }}
    </p>

    <div class="panel">
      <p v-if="loading" class="state" data-test="users-loading">
        <LoaderCircle :size="16" class="spin" />
        {{ t('common.loading') }}
      </p>

      <p v-else-if="loadError" class="state state-error" role="alert" data-test="users-error">
        {{ loadError }}
      </p>

      <p v-else-if="users.length === 0" class="state" data-test="users-empty">
        {{ t('admin.users.empty') }}
      </p>

      <div v-else class="table-scroll">
        <table class="users-table">
          <thead>
            <tr>
              <th scope="col">{{ t('admin.users.columns.name') }}</th>
              <th scope="col">{{ t('admin.users.columns.email') }}</th>
              <th scope="col">{{ t('admin.users.columns.role') }}</th>
              <th scope="col">{{ t('admin.users.columns.status') }}</th>
              <th scope="col">{{ t('admin.users.columns.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id" data-test="user-row">
              <td class="name">{{ displayName(user) }}</td>
              <td class="email">{{ user.email }}</td>
              <td>
                <span class="role-chip" data-test="user-role">{{ roleLabel(user) }}</span>
              </td>
              <td>
                <span
                  class="status-chip"
                  :class="user.is_active === false ? 'status-suspended' : 'status-active'"
                  data-test="user-status"
                >
                  {{ user.is_active === false ? t('admin.users.statusSuspended') : t('admin.users.statusActive') }}
                </span>
              </td>
              <td>
                <button
                  type="button"
                  class="action"
                  :class="user.is_active === false ? 'activate' : 'suspend'"
                  data-test="toggle-button"
                  :disabled="busyId === user.id"
                  @click="toggle(user)"
                >
                  <ShieldCheck v-if="user.is_active === false" :size="15" />
                  <ShieldBan v-else :size="15" />
                  {{ user.is_active === false ? t('admin.users.activate') : t('admin.users.suspend') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<style scoped>
.users-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-header {
  display: flex;
  align-items: center;
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

.page-header h2 {
  margin: 0;
  color: var(--primary);
  font-size: var(--font-size-title);
}

.subtitle {
  margin: 6px 0 0;
  color: var(--text-muted);
  font-size: var(--font-size-sm);
}

.counter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--primary-light);
  color: var(--primary);
  font-size: var(--font-size-sm);
  font-weight: 700;
  white-space: nowrap;
}

.banner {
  margin: 0;
  padding: 12px 18px;
  border-radius: var(--radius);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.banner-success {
  border: 1px solid rgba(22, 163, 74, 0.35);
  background: rgba(22, 163, 74, 0.08);
  color: var(--success);
}

.banner-error {
  border: 1px solid var(--error);
  background: rgba(185, 28, 28, 0.08);
  color: var(--error);
}

.panel {
  padding: 20px 24px;
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}

.state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0;
  padding: 32px 0;
  color: var(--text-muted);
  font-size: var(--font-size-sm);
}

.state-error {
  color: var(--error);
}

.spin {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.table-scroll {
  overflow-x: auto;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  text-align: right;
}

.users-table th,
.users-table td {
  padding: 13px 10px;
  border-bottom: 1px solid var(--border);
  font-size: var(--font-size-sm);
  white-space: nowrap;
}

.users-table th {
  color: var(--text-muted);
  font-weight: 600;
}

.users-table tbody tr:hover {
  background: var(--bg);
}

.name {
  font-weight: 600;
}

.email {
  color: var(--text-muted);
}

.role-chip {
  padding: 4px 11px;
  border-radius: 999px;
  background: var(--primary-light);
  color: var(--primary);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.status-chip {
  padding: 4px 11px;
  border-radius: 999px;
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.status-active {
  background: rgba(22, 163, 74, 0.12);
  color: var(--success);
}

.status-suspended {
  background: rgba(185, 28, 28, 0.1);
  color: var(--error);
}

.action {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 13px;
  border-radius: var(--radius);
  border: 1px solid transparent;
  background: transparent;
  font-family: inherit;
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease;
}

.suspend {
  border-color: var(--border);
  color: var(--error);
}

.suspend:hover:not(:disabled) {
  border-color: var(--error);
  background: rgba(185, 28, 28, 0.08);
}

.activate {
  border-color: var(--primary);
  background: var(--primary);
  color: #fff;
}

.activate:hover:not(:disabled) {
  background: var(--primary-hover);
}

.action:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
