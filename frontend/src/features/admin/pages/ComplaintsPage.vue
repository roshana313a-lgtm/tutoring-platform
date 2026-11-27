<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CheckCheck, LifeBuoy, LoaderCircle, MessageSquare } from 'lucide-vue-next'

import {
  fetchComplaints,
  updateComplaintStatus,
  type AdminComplaint,
  type ComplaintStatus,
  type ComplaintTransition,
} from '../../support/api/complaints'
import { formatDate } from '../../../i18n/format'

const { t, locale } = useI18n()

const complaints = ref<AdminComplaint[]>([])
const loading = ref(true)
const loadError = ref('')
const actionError = ref('')
const successMessage = ref('')
const busyId = ref<string | null>(null)

function statusLabel(status: ComplaintStatus): string {
  return t(`admin.complaints.status.${status}`)
}

function dateLabel(value: string): string {
  return formatDate(value, locale.value)
}

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''

  try {
    complaints.value = await fetchComplaints()
  } catch {
    loadError.value = t('errors.complaints')
  } finally {
    loading.value = false
  }
}

async function changeStatus(item: AdminComplaint, status: ComplaintTransition): Promise<void> {
  busyId.value = item.id
  actionError.value = ''
  successMessage.value = ''

  try {
    const updated = await updateComplaintStatus(item.id, status)
    complaints.value = complaints.value.map((row) =>
      row.id === updated.id ? { ...row, status: updated.status } : row,
    )
    successMessage.value = t(
      status === 'resolved' ? 'admin.complaints.resolvedMessage' : 'admin.complaints.startedMessage',
      { subject: item.subject },
    )
  } catch {
    actionError.value = t('errors.complaintStatus')
  } finally {
    busyId.value = null
  }
}

onMounted(load)
</script>

<template>
  <section class="complaints-page" data-test="complaints-page">
    <header class="page-header">
      <div class="header-copy">
        <p class="eyebrow">{{ t('admin.complaints.eyebrow') }}</p>
        <h2>{{ t('admin.complaints.title') }}</h2>
        <p class="subtitle">{{ t('admin.complaints.subtitle') }}</p>
      </div>
      <span class="counter">
        <MessageSquare :size="15" />
        {{ t('admin.complaints.count', { count: complaints.length }) }}
      </span>
    </header>

    <p v-if="successMessage" class="banner banner-success" data-test="complaints-success">
      {{ successMessage }}
    </p>
    <p v-if="actionError" class="banner banner-error" role="alert" data-test="complaints-action-error">
      {{ actionError }}
    </p>

    <div class="panel">
      <p v-if="loading" class="state" data-test="complaints-loading">
        <LoaderCircle :size="16" class="spin" />
        {{ t('common.loading') }}
      </p>

      <p v-else-if="loadError" class="state state-error" role="alert" data-test="complaints-error">
        {{ loadError }}
      </p>

      <p v-else-if="complaints.length === 0" class="state" data-test="complaints-empty">
        <LifeBuoy :size="18" />
        {{ t('admin.complaints.empty') }}
      </p>

      <div v-else class="table-scroll">
        <table class="complaints-table">
          <thead>
            <tr>
              <th scope="col">{{ t('admin.complaints.columns.subject') }}</th>
              <th scope="col">{{ t('admin.complaints.columns.user') }}</th>
              <th scope="col">{{ t('admin.complaints.columns.status') }}</th>
              <th scope="col">{{ t('admin.complaints.columns.date') }}</th>
              <th scope="col">{{ t('admin.complaints.columns.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in complaints" :key="item.id" data-test="complaint-row">
              <td class="subject">
                <strong data-test="complaint-subject">{{ item.subject }}</strong>
                <span class="description">{{ item.description }}</span>
              </td>
              <td>
                <span class="user" data-test="complaint-user">
                  <span class="user-name">{{ item.user_name }}</span>
                  <span class="user-email">{{ item.user_email }}</span>
                </span>
              </td>
              <td>
                <span
                  class="status-chip"
                  :class="`status-${item.status}`"
                  data-test="complaint-status"
                >
                  {{ statusLabel(item.status) }}
                </span>
              </td>
              <td class="date" data-test="complaint-date">{{ dateLabel(item.created_at) }}</td>
              <td>
                <span class="row-actions">
                  <button
                    v-if="item.status === 'open'"
                    type="button"
                    class="action action-start"
                    data-test="complaint-start"
                    :disabled="busyId === item.id"
                    @click="changeStatus(item, 'in_progress')"
                  >
                    {{ t('admin.complaints.actions.start') }}
                  </button>
                  <button
                    v-if="item.status !== 'resolved'"
                    type="button"
                    class="action action-resolve"
                    data-test="complaint-resolve"
                    :disabled="busyId === item.id"
                    @click="changeStatus(item, 'resolved')"
                  >
                    <CheckCheck :size="15" />
                    {{ t('admin.complaints.actions.resolve') }}
                  </button>
                  <span v-if="item.status === 'resolved'" class="done">
                    {{ t('admin.complaints.actions.done') }}
                  </span>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<style scoped>
.complaints-page {
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

.complaints-table {
  width: 100%;
  border-collapse: collapse;
  text-align: right;
}

.complaints-table th,
.complaints-table td {
  padding: 14px 10px;
  border-bottom: 1px solid var(--border);
  font-size: var(--font-size-sm);
  vertical-align: middle;
}

.complaints-table th {
  color: var(--text-muted);
  font-weight: 600;
  white-space: nowrap;
}

.complaints-table tbody tr:last-child td {
  border-bottom: 0;
}

.complaints-table tbody tr:hover {
  background: var(--bg);
}

.subject {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 220px;
}

.subject strong {
  font-weight: 700;
}

.description {
  display: -webkit-box;
  overflow: hidden;
  color: var(--text-muted);
  font-size: var(--font-size-xs);
  line-height: 1.7;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.user {
  display: flex;
  flex-direction: column;
  gap: 2px;
  white-space: nowrap;
}

.user-name {
  font-weight: 600;
}

.user-email {
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}

.status-chip {
  padding: 4px 11px;
  border-radius: 999px;
  font-size: var(--font-size-xs);
  font-weight: 700;
  white-space: nowrap;
}

.status-open {
  background: rgba(217, 119, 6, 0.14);
  color: #b45309;
}

.status-in_progress {
  background: rgba(37, 99, 235, 0.12);
  color: #1d4ed8;
}

.status-resolved {
  background: rgba(22, 163, 74, 0.12);
  color: var(--success);
}

.date {
  color: var(--text-muted);
  white-space: nowrap;
}

.row-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.action {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 13px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
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

.action-start {
  color: #1d4ed8;
}

.action-start:hover:not(:disabled) {
  border-color: #1d4ed8;
  background: rgba(37, 99, 235, 0.08);
}

.action-resolve {
  border-color: var(--primary);
  background: var(--primary);
  color: #fff;
}

.action-resolve:hover:not(:disabled) {
  background: var(--primary-hover);
  border-color: var(--primary-hover);
}

.action:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.done {
  color: var(--success);
  font-size: var(--font-size-xs);
  font-weight: 700;
}
</style>
