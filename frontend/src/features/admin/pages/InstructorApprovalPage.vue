<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  CheckCircle2,
  GraduationCap,
  LoaderCircle,
  ShieldCheck,
  UserRoundX,
  Wallet,
  X,
} from 'lucide-vue-next'

import { approveInstructor, fetchPendingInstructors, rejectInstructor } from '../api/instructors'
import { resolveMediaUrl } from '../../../shared/api/media'
import type { User } from '../../auth/api/auth'

const instructors = ref<User[]>([])
const loading = ref(true)
const loadError = ref('')
const actionError = ref('')
const busyId = ref<string | null>(null)
const successMessage = ref('')
const selectedId = ref<string | null>(null)

const selected = computed(
  () => instructors.value.find((instructor) => instructor.id === selectedId.value) ?? null,
)

const formattedRate = computed(() => {
  const rate = selected.value?.hourly_rate ?? 0
  if (!rate) return 'ثبت نشده'
  return `${new Intl.NumberFormat('fa-IR').format(rate)} تومان`
})

function displayName(user: User): string {
  const fullName = user.full_name?.trim()
  return fullName && fullName.length > 0 ? fullName : '—'
}

function avatarInitial(user: User): string {
  const name = displayName(user)
  return name === '—' ? '؟' : name.charAt(0).toUpperCase()
}

function openDetails(instructor: User): void {
  actionError.value = ''
  successMessage.value = ''
  selectedId.value = instructor.id
}

function closeDetails(): void {
  selectedId.value = null
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && selectedId.value) closeDetails()
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
    if (selectedId.value === instructor.id) closeDetails()
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
    if (selectedId.value === instructor.id) closeDetails()
    successMessage.value = `درخواست ${displayName(instructor)} رد شد.`
  } catch {
    actionError.value = 'رد درخواست مدرس ناموفق بود. دوباره تلاش کنید.'
  } finally {
    busyId.value = null
  }
}

onMounted(() => {
  void load()
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
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
                    class="action details"
                    data-test="details-button"
                    @click="openDetails(instructor)"
                  >
                    مشاهده جزئیات
                  </button>
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

    <div
      v-if="selected"
      class="modal-backdrop"
      data-test="instructor-modal"
      @click.self="closeDetails"
    >
      <div
        class="modal"
        role="dialog"
        aria-modal="true"
        :aria-label="`جزئیات ${displayName(selected)}`"
      >
        <header class="modal-header">
          <div class="modal-identity">
            <span class="modal-avatar" data-test="modal-avatar">
              <img
                v-if="selected.avatar_url"
                :src="resolveMediaUrl(selected.avatar_url)"
                :alt="displayName(selected)"
              />
              <template v-else>{{ avatarInitial(selected) }}</template>
            </span>
            <div>
              <h3 data-test="modal-name">{{ displayName(selected) }}</h3>
              <p class="modal-email" data-test="modal-email">{{ selected.email }}</p>
            </div>
          </div>
          <button
            type="button"
            class="modal-close"
            data-test="modal-close"
            aria-label="بستن جزئیات"
            @click="closeDetails"
          >
            <X :size="18" />
          </button>
        </header>

        <div class="modal-body">
          <section class="summary-block">
            <h4>خلاصه رزومه</h4>
            <p class="summary-text" data-test="modal-summary">
              {{ selected.short_summary || 'ثبت نشده' }}
            </p>
          </section>

          <section>
            <h4>زبان‌های تدریس</h4>
            <div class="chips" data-test="modal-languages">
              <span
                v-for="language in selected.teaching_languages ?? []"
                :key="language"
                class="chip"
                data-test="modal-language"
              >
                {{ language }}
              </span>
              <span v-if="!(selected.teaching_languages ?? []).length" class="muted">
                ثبت نشده
              </span>
            </div>
          </section>

          <dl class="facts">
            <div class="fact">
              <dt>
                <Wallet :size="15" />
                قیمت هر ساعت
              </dt>
              <dd data-test="modal-rate">{{ formattedRate }}</dd>
            </div>
            <div class="fact">
              <dt>
                <GraduationCap :size="15" />
                سطح تحصیلات
              </dt>
              <dd data-test="modal-education">{{ selected.education_level || 'ثبت نشده' }}</dd>
            </div>
          </dl>

          <p v-if="actionError" class="banner banner-error" role="alert">
            {{ actionError }}
          </p>
        </div>

        <footer class="modal-actions">
          <button
            type="button"
            class="action approve"
            data-test="modal-approve"
            :disabled="busyId === selected.id"
            @click="approve(selected)"
          >
            <CheckCircle2 :size="15" />
            تایید
          </button>
          <button
            type="button"
            class="action reject"
            data-test="modal-reject"
            :disabled="busyId === selected.id"
            @click="reject(selected)"
          >
            <UserRoundX :size="15" />
            رد
          </button>
        </footer>
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
  flex-wrap: wrap;
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

.details {
  border-color: var(--primary);
  background: transparent;
  color: var(--primary);
}

.details:hover {
  background: var(--primary-light);
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

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(2px);
}

.modal {
  display: flex;
  flex-direction: column;
  width: min(560px, 100%);
  max-height: min(86vh, 760px);
  overflow: hidden;
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  box-shadow: 0 24px 60px -12px rgba(15, 23, 42, 0.45);
  animation: modal-in 0.18s ease-out both;
}

@keyframes modal-in {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.99);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 22px 24px 16px;
  border-bottom: 1px solid var(--border);
}

.modal-identity {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.modal-avatar {
  display: grid;
  place-items: center;
  flex: none;
  width: 56px;
  height: 56px;
  overflow: hidden;
  border-radius: 50%;
  background: var(--primary-light);
  color: var(--primary);
  font-size: 1.15rem;
  font-weight: 700;
}

.modal-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.modal-header h3 {
  margin: 0;
  color: var(--primary);
  font-size: var(--font-size-body);
}

.modal-email {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: var(--font-size-xs);
  direction: ltr;
  text-align: right;
}

.modal-close {
  display: grid;
  place-items: center;
  flex: none;
  width: 32px;
  height: 32px;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: var(--card-bg);
  color: var(--text-muted);
  cursor: pointer;
}

.modal-close:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 20px 24px;
  overflow-y: auto;
}

.modal-body h4 {
  margin: 0 0 8px;
  color: var(--text);
  font-size: var(--font-size-sm);
  font-weight: 700;
}

.summary-block {
  padding: 16px 18px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg);
}

.summary-text {
  margin: 0;
  color: var(--text);
  font-size: var(--font-size-sm);
  line-height: 1.9;
  white-space: pre-line;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  padding: 6px 13px;
  border-radius: 999px;
  background: var(--primary-light);
  color: var(--primary);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.muted {
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}

.facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin: 0;
}

.fact {
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.fact dt {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}

.fact dd {
  margin: 6px 0 0;
  color: var(--primary);
  font-size: var(--font-size-sm);
  font-weight: 700;
}

.modal-actions {
  display: flex;
  gap: 10px;
  padding: 16px 24px 22px;
  border-top: 1px solid var(--border);
}

.modal-actions .action {
  padding: 10px 18px;
  font-size: var(--font-size-sm);
}

@media (max-width: 600px) {
  .modal-backdrop {
    padding: 12px;
  }

  .modal-header,
  .modal-body,
  .modal-actions {
    padding-inline: 18px;
  }
}
</style>
