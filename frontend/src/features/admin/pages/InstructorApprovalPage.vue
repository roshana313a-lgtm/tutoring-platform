<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { CheckCircle2, LoaderCircle, ShieldCheck, UserRoundX } from 'lucide-vue-next'

import { approveInstructor, fetchPendingInstructors, rejectInstructor } from '../api/instructors'
import type { User } from '../../auth/api/auth'

const instructors = ref<User[]>([])
const loading = ref(true)
const loadError = ref('')
const actionError = ref('')
const busyId = ref<string | null>(null)
const successMessage = ref('')

function displayName(user: User): string {
  const fullName = user.full_name?.trim()
  return fullName && fullName.length > 0 ? fullName : '—'
}

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''

  try {
    instructors.value = await fetchPendingInstructors()
  } catch {
    loadError.value = 'دریافت فهرست مدرسان ناموفق بود.'
  } finally {
    loading.value = false
  }
}

async function approve(instructor: User): Promise<void> {
  busyId.value = instructor.id
  actionError.value = ''
  successMessage.value = ''

  try {
    await approveInstructor(instructor.id)
    instructors.value = instructors.value.filter((item) => item.id !== instructor.id)
    successMessage.value = `پروفایل ${displayName(instructor)} تایید شد.`
  } catch {
    actionError.value = 'تایید مدرس ناموفق بود. دوباره تلاش کنید.'
  } finally {
    busyId.value = null
  }
}

async function reject(instructor: User): Promise<void> {
  busyId.value = instructor.id
  actionError.value = ''
  successMessage.value = ''

  try {
    await rejectInstructor(instructor.id)
    instructors.value = instructors.value.filter((item) => item.id !== instructor.id)
    successMessage.value = `درخواست ${displayName(instructor)} رد شد.`
  } catch {
    actionError.value = 'رد درخواست مدرس ناموفق بود. دوباره تلاش کنید.'
  } finally {
    busyId.value = null
  }
}

onMounted(load)
</script>

<template>
  <section class="approval-page" data-test="approval-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">مدیریت مدرسان</p>
        <h2>تایید مدرسان</h2>
        <p class="subtitle">درخواست‌هایی که هنوز بررسی نشده‌اند</p>
      </div>
      <span class="counter">{{ instructors.length }} در انتظار</span>
    </header>

    <p v-if="successMessage" class="banner banner-success" data-test="approval-success">
      {{ successMessage }}
    </p>
    <p v-if="actionError" class="banner banner-error" role="alert" data-test="approval-action-error">
      {{ actionError }}
    </p>

    <div class="panel">
      <p v-if="loading" class="state" data-test="approval-loading">
        <LoaderCircle :size="16" class="spin" />
        در حال بارگذاری…
      </p>

      <p v-else-if="loadError" class="state state-error" role="alert" data-test="approval-error">
        {{ loadError }}
      </p>

      <p v-else-if="instructors.length === 0" class="state" data-test="approval-empty">
        <ShieldCheck :size="17" />
        در حال حاضر مدرسی در انتظار تایید نیست.
      </p>

      <div v-else class="table-scroll">
        <table class="approval-table">
          <thead>
            <tr>
              <th scope="col">نام</th>
              <th scope="col">ایمیل</th>
              <th scope="col">اقدام</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="instructor in instructors" :key="instructor.id" data-test="approval-row">
              <td class="name">{{ displayName(instructor) }}</td>
              <td class="email">{{ instructor.email }}</td>
              <td>
                <div class="actions">
                  <button
                    type="button"
                    class="action approve"
                    data-test="approve-button"
                    :disabled="busyId === instructor.id"
                    @click="approve(instructor)"
                  >
                    <CheckCircle2 :size="15" />
                    تایید
                  </button>
                  <button
                    type="button"
                    class="action reject"
                    data-test="reject-button"
                    :disabled="busyId === instructor.id"
                    @click="reject(instructor)"
                  >
                    <UserRoundX :size="15" />
                    رد
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<style scoped>
.approval-page {
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
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(217, 119, 6, 0.12);
  color: #b45309;
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

.approval-table {
  width: 100%;
  border-collapse: collapse;
  text-align: right;
}

.approval-table th,
.approval-table td {
  padding: 13px 10px;
  border-bottom: 1px solid var(--border);
  font-size: var(--font-size-sm);
  white-space: nowrap;
}

.approval-table th {
  color: var(--text-muted);
  font-weight: 600;
}

.approval-table tbody tr:hover {
  background: var(--bg);
}

.name {
  font-weight: 600;
}

.email {
  color: var(--text-muted);
}

.actions {
  display: flex;
  gap: 8px;
}

.action {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 13px;
  border-radius: var(--radius);
  border: 1px solid transparent;
  font-family: inherit;
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease;
}

.approve {
  border-color: var(--primary);
  background: var(--primary);
  color: #fff;
}

.approve:hover:not(:disabled) {
  background: var(--primary-hover);
}

.reject {
  border-color: var(--border);
  background: transparent;
  color: var(--error);
}

.reject:hover:not(:disabled) {
  border-color: var(--error);
  background: rgba(185, 28, 28, 0.08);
}

.action:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
