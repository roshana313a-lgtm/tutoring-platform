<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  CheckCircle2,
  GraduationCap,
  LoaderCircle,
  ShieldBan,
  ShieldCheck,
  UserRoundX,
} from 'lucide-vue-next'

import type { User } from '../../auth/api/auth'
import {
  approveInstructor,
  fetchAllInstructors,
  rejectInstructor,
} from '../api/instructors'
import { toggleUserSuspension } from '../api/users'

type StatusFilter = 'all' | 'pending' | 'approved' | 'suspended'

const STATUS_FILTERS: StatusFilter[] = ['all', 'pending', 'approved', 'suspended']

const route = useRoute()

// The admin dashboard links here with ?status=pending so the review queue opens directly.
function filterFromQuery(): StatusFilter {
  const status = route.query.status
  return typeof status === 'string' && STATUS_FILTERS.includes(status as StatusFilter)
    ? (status as StatusFilter)
    : 'all'
}

const instructors = ref<User[]>([])
const loading = ref(true)
const loadError = ref('')
const actionError = ref('')
const successMessage = ref('')
const busyId = ref<string | null>(null)
const confirmRejectId = ref<string | null>(null)
const filter = ref<StatusFilter>(filterFromQuery())

const rateFormatter = new Intl.NumberFormat('fa-IR')

function displayName(instructor: User): string {
  const fullName = instructor.full_name?.trim()
  if (fullName) return fullName
  return instructor.email.split('@')[0] ?? '—'
}

function statusOf(instructor: User): Exclude<StatusFilter, 'all'> {
  if (instructor.is_active === false) return 'suspended'
  return instructor.is_approved ? 'approved' : 'pending'
}

const counts = computed(() => {
  const result: Record<StatusFilter, number> = {
    all: instructors.value.length,
    pending: 0,
    approved: 0,
    suspended: 0,
  }
  for (const instructor of instructors.value) {
    result[statusOf(instructor)] += 1
  }
  return result
})

const filters = computed(() => [
  { key: 'all' as const, label: 'همه', count: counts.value.all },
  { key: 'pending' as const, label: 'در انتظار تایید', count: counts.value.pending },
  { key: 'approved' as const, label: 'تاییدشده', count: counts.value.approved },
  { key: 'suspended' as const, label: 'معلق', count: counts.value.suspended },
])

const visibleInstructors = computed(() =>
  filter.value === 'all'
    ? instructors.value
    : instructors.value.filter((instructor) => statusOf(instructor) === filter.value),
)

function statusLabel(instructor: User): string {
  switch (statusOf(instructor)) {
    case 'suspended':
      return 'معلق'
    case 'approved':
      return 'تاییدشده'
    default:
      return 'در انتظار تایید'
  }
}

function rateLabel(instructor: User): string {
  return instructor.hourly_rate > 0
    ? `${rateFormatter.format(instructor.hourly_rate)} تومان / ساعت`
    : 'تعیین نشده'
}

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''

  try {
    instructors.value = await fetchAllInstructors()
  } catch {
    loadError.value = 'دریافت فهرست مدرسان ناموفق بود.'
  } finally {
    loading.value = false
  }
}

async function run(
  instructor: User,
  action: () => Promise<unknown>,
  success: string,
): Promise<void> {
  busyId.value = instructor.id
  actionError.value = ''
  successMessage.value = ''

  try {
    await action()
    successMessage.value = success
    await load()
  } catch {
    actionError.value = 'انجام این عملیات ناموفق بود. دوباره تلاش کنید.'
  } finally {
    busyId.value = null
    confirmRejectId.value = null
  }
}

function approve(instructor: User): Promise<void> {
  return run(
    instructor,
    () => approveInstructor(instructor.id),
    `حساب ${displayName(instructor)} تایید شد.`,
  )
}

function reject(instructor: User): Promise<void> {
  return run(
    instructor,
    () => rejectInstructor(instructor.id),
    `درخواست ${displayName(instructor)} رد شد.`,
  )
}

function toggleSuspension(instructor: User): Promise<void> {
  const suspended = instructor.is_active === false
  return run(
    instructor,
    () => toggleUserSuspension(instructor.id),
    suspended
      ? `دسترسی ${displayName(instructor)} فعال شد.`
      : `حساب ${displayName(instructor)} معلق شد.`,
  )
}

onMounted(load)
</script>

<template>
  <section class="manage-page" data-test="manage-instructors-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">مدیریت مدرسان</p>
        <h2>همه مدرسان</h2>
        <p class="subtitle">تایید، رد و تعلیق حساب مدرسان مؤسسه</p>
      </div>
      <span class="counter">
        <GraduationCap :size="15" />
        {{ counts.all }} مدرس
      </span>
    </header>

    <p v-if="successMessage" class="banner banner-success" data-test="manage-success">
      {{ successMessage }}
    </p>
    <p v-if="actionError" class="banner banner-error" role="alert" data-test="manage-action-error">
      {{ actionError }}
    </p>

    <div class="toolbar" role="tablist" aria-label="فیلتر وضعیت مدرسان">
      <button
        v-for="item in filters"
        :key="item.key"
        type="button"
        role="tab"
        class="filter"
        :class="{ 'filter-active': filter === item.key }"
        :aria-selected="filter === item.key"
        :data-test="`filter-${item.key}`"
        @click="filter = item.key"
      >
        {{ item.label }}
        <span class="filter-count">{{ item.count }}</span>
      </button>
    </div>

    <div class="panel">
      <p v-if="loading" class="state" data-test="manage-loading">
        <LoaderCircle :size="16" class="spin" />
        در حال بارگذاری…
      </p>

      <p v-else-if="loadError" class="state state-error" role="alert" data-test="manage-error">
        {{ loadError }}
      </p>

      <p v-else-if="visibleInstructors.length === 0" class="state" data-test="manage-empty">
        {{ filter === 'all' ? 'هنوز مدرسی ثبت‌نام نکرده است.' : 'مدرسی با این وضعیت وجود ندارد.' }}
      </p>

      <div v-else class="table-scroll">
        <table class="instructors-table">
          <thead>
            <tr>
              <th scope="col">نام</th>
              <th scope="col">ایمیل</th>
              <th scope="col">وضعیت</th>
              <th scope="col">نرخ هر ساعت</th>
              <th scope="col">اقدام</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="instructor in visibleInstructors" :key="instructor.id" data-test="instructor-row">
              <td class="name">{{ displayName(instructor) }}</td>
              <td class="email">{{ instructor.email }}</td>
              <td>
                <span
                  class="status-chip"
                  :class="`status-${statusOf(instructor)}`"
                  data-test="instructor-status"
                >
                  {{ statusLabel(instructor) }}
                </span>
              </td>
              <td class="rate">{{ rateLabel(instructor) }}</td>
              <td>
                <div v-if="confirmRejectId === instructor.id" class="actions">
                  <button
                    type="button"
                    class="action danger-solid"
                    data-test="confirm-reject"
                    :disabled="busyId === instructor.id"
                    @click="reject(instructor)"
                  >
                    تایید رد درخواست
                  </button>
                  <button
                    type="button"
                    class="action"
                    data-test="cancel-reject"
                    :disabled="busyId === instructor.id"
                    @click="confirmRejectId = null"
                  >
                    انصراف
                  </button>
                </div>
                <div v-else class="actions">
                  <button
                    v-if="!instructor.is_approved && instructor.is_active !== false"
                    type="button"
                    class="action approve"
                    data-test="approve"
                    :disabled="busyId === instructor.id"
                    @click="approve(instructor)"
                  >
                    <CheckCircle2 :size="15" />
                    تایید
                  </button>
                  <button
                    v-if="!instructor.is_approved"
                    type="button"
                    class="action danger"
                    data-test="reject"
                    :disabled="busyId === instructor.id"
                    @click="confirmRejectId = instructor.id"
                  >
                    <UserRoundX :size="15" />
                    رد
                  </button>
                  <button
                    type="button"
                    class="action"
                    :class="instructor.is_active === false ? 'approve' : 'danger'"
                    data-test="suspend"
                    :disabled="busyId === instructor.id"
                    @click="toggleSuspension(instructor)"
                  >
                    <ShieldCheck v-if="instructor.is_active === false" :size="15" />
                    <ShieldBan v-else :size="15" />
                    {{ instructor.is_active === false ? 'فعال کردن' : 'تعلیق' }}
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
.manage-page {
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

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--card-bg);
  color: var(--text);
  font-family: inherit;
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    color 0.2s ease;
}

.filter:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.filter-active {
  border-color: var(--primary);
  background: var(--primary);
  color: #fff;
}

.filter-count {
  padding: 1px 7px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.08);
  font-size: var(--font-size-xs);
}

.filter-active .filter-count {
  background: rgba(255, 255, 255, 0.24);
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

.instructors-table {
  width: 100%;
  border-collapse: collapse;
  text-align: right;
}

.instructors-table th,
.instructors-table td {
  padding: 13px 10px;
  border-bottom: 1px solid var(--border);
  font-size: var(--font-size-sm);
  white-space: nowrap;
}

.instructors-table th {
  color: var(--text-muted);
  font-weight: 600;
}

.instructors-table tbody tr:hover {
  background: var(--bg);
}

.name {
  font-weight: 600;
}

.email,
.rate {
  color: var(--text-muted);
}

.status-chip {
  padding: 4px 11px;
  border-radius: 999px;
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.status-approved {
  background: rgba(22, 163, 74, 0.12);
  color: var(--success);
}

.status-pending {
  background: rgba(217, 119, 6, 0.12);
  color: #b45309;
}

.status-suspended {
  background: rgba(185, 28, 28, 0.1);
  color: var(--error);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.action {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 13px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: transparent;
  color: var(--text-muted);
  font-family: inherit;
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease;
}

.action:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.approve {
  border-color: var(--primary);
  color: var(--primary);
}

.approve:hover:not(:disabled) {
  background: var(--primary);
  color: #fff;
}

.danger {
  border-color: rgba(185, 28, 28, 0.4);
  color: var(--error);
}

.danger:hover:not(:disabled) {
  border-color: var(--error);
  background: rgba(185, 28, 28, 0.08);
}

.danger-solid {
  border-color: var(--error);
  background: var(--error);
  color: #fff;
}

.danger-solid:hover:not(:disabled) {
  background: #991b1b;
}
</style>
