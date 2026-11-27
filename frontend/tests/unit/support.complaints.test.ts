// @vitest-environment happy-dom
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import ComplaintsPage from '../../src/features/admin/pages/ComplaintsPage.vue'
import type { User } from '../../src/features/auth/api/auth'
import { useAuthStore } from '../../src/features/auth/stores/useAuthStore'
import DashboardLayout from '../../src/features/dashboard/components/DashboardLayout.vue'
import AdminDashboard from '../../src/features/dashboard/pages/AdminDashboard.vue'
import SupportPage from '../../src/features/support/pages/SupportPage.vue'
import { routes } from '../../src/router'
import { clearStoredToken, http, setStoredToken } from '../../src/shared/api/http'
import type { AdminComplaint } from '../../src/features/support/api/complaints'

vi.mock('vue-chartjs', () => ({
  Line: { name: 'Line', props: ['data', 'options'], template: '<canvas class="mock-line" />' },
  Doughnut: {
    name: 'Doughnut',
    props: ['data', 'options'],
    template: '<canvas class="mock-doughnut" />',
  },
}))

type TestRole = 'student' | 'instructor' | 'admin'

const fa = (value: number) => new Intl.NumberFormat('fa-IR').format(value)

function makeUser(role: TestRole): User {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    email: `${role}@example.com`,
    role,
    created_at: '2026-11-26T10:00:00Z',
    full_name: 'کاربر آزمایشی',
  }
}

async function mountWithRole(
  component: Parameters<typeof mount>[0],
  role: TestRole,
  path: string,
) {
  setStoredToken('test-token')
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore(pinia).user = makeUser(role)

  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push(path)
  await router.isReady()

  const wrapper = mount(component, {
    global: { plugins: [pinia, router], stubs: { RouterView: true } },
  })
  await flushPromises()
  await flushPromises()
  return wrapper
}

function complaint(overrides: Partial<AdminComplaint> = {}): AdminComplaint {
  return {
    id: 'cmp-1',
    user_id: 'user-1',
    subject: 'کلاس لغو شد',
    description: 'مدرس بدون اطلاع کلاس را لغو کرد.',
    status: 'open',
    created_at: '2026-11-27T09:00:00Z',
    user_name: 'علی احمدی',
    user_email: 'ali@example.com',
    ...overrides,
  }
}

afterEach(() => {
  clearStoredToken()
  vi.restoreAllMocks()
})

describe('SupportPage', () => {
  it('submits a trimmed complaint and confirms it', async () => {
    const post = vi.spyOn(http, 'post').mockResolvedValue({
      id: 'cmp-1',
      user_id: 'user-1',
      subject: 'مشکل پرداخت',
      description: 'مبلغ کسر شد',
      status: 'open',
      created_at: '2026-11-27T09:00:00Z',
    })

    const wrapper = await mountWithRole(SupportPage, 'student', '/dashboard/support')

    await wrapper.get('[data-test="support-subject"]').setValue('  مشکل پرداخت  ')
    await wrapper.get('[data-test="support-description"]').setValue('  مبلغ کسر شد  ')
    await wrapper.get('[data-test="support-form"]').trigger('submit')
    await flushPromises()

    expect(post).toHaveBeenCalledWith('/api/v1/complaints', {
      subject: 'مشکل پرداخت',
      description: 'مبلغ کسر شد',
    })
    expect(wrapper.get('[data-test="support-success"]').text()).toContain('ثبت شد')
    expect((wrapper.get('[data-test="support-subject"]').element as HTMLInputElement).value).toBe(
      '',
    )
  })

  it('refuses an empty form without calling the API', async () => {
    const post = vi.spyOn(http, 'post')

    const wrapper = await mountWithRole(SupportPage, 'instructor', '/dashboard/support')

    await wrapper.get('[data-test="support-form"]').trigger('submit')
    await flushPromises()

    expect(post).not.toHaveBeenCalled()
    expect(wrapper.get('[data-test="support-error"]').text()).toContain('موضوع و توضیحات')
  })

  it('reports a failed submission', async () => {
    vi.spyOn(http, 'post').mockRejectedValue(new Error('boom'))

    const wrapper = await mountWithRole(SupportPage, 'student', '/dashboard/support')
    await wrapper.get('[data-test="support-subject"]').setValue('موضوع')
    await wrapper.get('[data-test="support-description"]').setValue('توضیح')
    await wrapper.get('[data-test="support-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[data-test="support-error"]').text()).toContain('ثبت شکایت ناموفق بود')
    expect(wrapper.find('[data-test="support-success"]').exists()).toBe(false)
  })
})

describe('admin complaints page', () => {
  it('lists tickets with the submitter and status badges', async () => {
    vi.spyOn(http, 'get').mockResolvedValue([
      complaint(),
      complaint({
        id: 'cmp-2',
        subject: 'مشکل ورود',
        status: 'in_progress',
        user_name: 'سارا کریمی',
        user_email: 'sara@example.com',
      }),
      complaint({ id: 'cmp-3', subject: 'قدیمی', status: 'resolved' }),
    ])

    const wrapper = await mountWithRole(
      ComplaintsPage,
      'admin',
      '/dashboard/admin/complaints',
    )

    const rows = wrapper.findAll('[data-test="complaint-row"]')
    expect(rows).toHaveLength(3)
    expect(rows[0]?.text()).toContain('کلاس لغو شد')
    expect(rows[0]?.text()).toContain('علی احمدی')
    expect(rows[0]?.text()).toContain('ali@example.com')
    expect(wrapper.findAll('[data-test="complaint-status"]').map((node) => node.text())).toEqual([
      'باز',
      'در حال بررسی',
      'حل شد',
    ])
    expect(wrapper.get('[data-test="complaints-page"]').text()).toContain('3 شکایت')
  })

  it('only offers the transitions that are still allowed', async () => {
    vi.spyOn(http, 'get').mockResolvedValue([
      complaint(),
      complaint({ id: 'cmp-2', status: 'in_progress' }),
      complaint({ id: 'cmp-3', status: 'resolved' }),
    ])

    const wrapper = await mountWithRole(
      ComplaintsPage,
      'admin',
      '/dashboard/admin/complaints',
    )

    const rows = wrapper.findAll('[data-test="complaint-row"]')
    expect(rows[0]?.find('[data-test="complaint-start"]').exists()).toBe(true)
    expect(rows[0]?.find('[data-test="complaint-resolve"]').exists()).toBe(true)
    expect(rows[1]?.find('[data-test="complaint-start"]').exists()).toBe(false)
    expect(rows[1]?.find('[data-test="complaint-resolve"]').exists()).toBe(true)
    expect(rows[2]?.find('[data-test="complaint-resolve"]').exists()).toBe(false)
  })

  it('moves a ticket to in progress and then to resolved', async () => {
    vi.spyOn(http, 'get').mockResolvedValue([complaint()])
    const patch = vi
      .spyOn(http, 'patch')
      .mockResolvedValue({ ...complaint(), status: 'in_progress' })

    const wrapper = await mountWithRole(
      ComplaintsPage,
      'admin',
      '/dashboard/admin/complaints',
    )

    await wrapper.get('[data-test="complaint-start"]').trigger('click')
    await flushPromises()

    expect(patch).toHaveBeenCalledWith('/api/v1/admin/complaints/cmp-1/status', {
      status: 'in_progress',
    })
    expect(wrapper.get('[data-test="complaint-status"]').text()).toBe('در حال بررسی')

    patch.mockResolvedValue({ ...complaint(), status: 'resolved' })
    await wrapper.get('[data-test="complaint-resolve"]').trigger('click')
    await flushPromises()

    expect(patch).toHaveBeenLastCalledWith('/api/v1/admin/complaints/cmp-1/status', {
      status: 'resolved',
    })
    expect(wrapper.get('[data-test="complaint-status"]').text()).toBe('حل شد')
    expect(wrapper.get('[data-test="complaints-success"]').text()).toContain('کلاس لغو شد')
  })

  it('reports a failed load', async () => {
    vi.spyOn(http, 'get').mockRejectedValue(new Error('boom'))

    const wrapper = await mountWithRole(
      ComplaintsPage,
      'admin',
      '/dashboard/admin/complaints',
    )

    expect(wrapper.get('[data-test="complaints-error"]').text()).toContain('دریافت شکایات')
    expect(wrapper.findAll('[data-test="complaint-row"]')).toHaveLength(0)
  })
})

describe('support entry points', () => {
  it('shows a support link to students and instructors', async () => {
    for (const role of ['student', 'instructor'] as const) {
      const wrapper = await mountWithRole(DashboardLayout, role, '/dashboard')

      const support = wrapper
        .findAll('[data-test="sidebar-link"]')
        .find((link) => link.text().trim() === 'پشتیبانی')
      expect(support, `missing support link for ${role}`).toBeTruthy()
      expect(support?.attributes('href')).toBe('/dashboard/support')
    }
  })

  it('shows the complaints queue to the admin', async () => {
    const wrapper = await mountWithRole(DashboardLayout, 'admin', '/dashboard')

    const complaintsLink = wrapper
      .findAll('[data-test="sidebar-link"]')
      .find((link) => link.text().trim() === 'شکایات و پشتیبانی')
    expect(complaintsLink).toBeTruthy()
    expect(complaintsLink?.attributes('href')).toBe('/dashboard/admin/complaints')
  })

  it('counts open complaints on the admin dashboard and links to the queue', async () => {
    vi.spyOn(http, 'get').mockImplementation((url: string) => {
      switch (url) {
        case '/api/v1/dashboard/admin/stats':
          return Promise.resolve({
            pending_instructors: 0,
            total_users: 3,
            active_classes: 0,
            open_complaints: 2,
          })
        case '/api/v1/admin/users':
        case '/api/v1/admin/instructors':
          return Promise.resolve([])
        case '/api/v1/admin/stats/registrations':
          return Promise.resolve({ days: [] })
        default:
          return Promise.reject(new Error(`unexpected url: ${url}`))
      }
    })

    const wrapper = await mountWithRole(AdminDashboard, 'admin', '/dashboard/admin')

    const card = wrapper.get('[data-test="admin-stat-complaints-link"]')
    expect(card.attributes('href')).toBe('/dashboard/admin/complaints')
    expect(card.get('[data-test="stat-value"]').text()).toBe(fa(2))
    expect(card.text()).toContain('شکایات باز')
  })
})
