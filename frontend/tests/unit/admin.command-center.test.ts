// @vitest-environment happy-dom
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import type { User } from '../../src/features/auth/api/auth'
import { useAuthStore } from '../../src/features/auth/stores/useAuthStore'
import AdminDashboard from '../../src/features/dashboard/pages/AdminDashboard.vue'
import { routes } from '../../src/router'
import { clearStoredToken, http, setStoredToken } from '../../src/shared/api/http'

// Chart.js needs a canvas; the dashboard markup and datasets are what we assert here.
vi.mock('vue-chartjs', () => ({
  Line: { name: 'Line', props: ['data', 'options'], template: '<canvas class="mock-line" />' },
  Doughnut: {
    name: 'Doughnut',
    props: ['data', 'options'],
    template: '<canvas class="mock-doughnut" />',
  },
}))

const admin: User = {
  id: 'admin-1',
  email: 'admin@institute.com',
  role: 'admin',
  created_at: '2026-11-27T09:00:00Z',
  full_name: 'مدیر مؤسسه',
}

const fa = (value: number) => new Intl.NumberFormat('fa-IR').format(value)

function person(
  id: string,
  email: string,
  role: 'student' | 'instructor',
  createdAt: string,
  overrides: Partial<User> = {},
): User {
  return {
    id,
    email,
    role,
    created_at: createdAt,
    full_name: email.split('@')[0],
    is_approved: role === 'instructor' ? true : undefined,
    is_active: true,
    ...overrides,
  }
}

function sevenDays(counts: number[]) {
  return counts.map((count, index) => ({
    date: `2026-11-${21 + index}`,
    count,
  }))
}

interface DashboardStub {
  pending?: number
  users?: User[]
  instructors?: User[]
  days?: { date: string; count: number }[]
  failTrend?: boolean
  failUsers?: boolean
}

async function mountDashboard(stub: DashboardStub = {}) {
  const {
    pending = 0,
    users = [],
    instructors = [],
    days = sevenDays([0, 0, 0, 0, 0, 0, 0]),
    failTrend = false,
    failUsers = false,
  } = stub

  setStoredToken('test-token')
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore(pinia).user = { ...admin }

  vi.spyOn(http, 'get').mockImplementation((url: string) => {
    switch (url) {
      case '/api/v1/dashboard/admin/stats':
        return Promise.resolve({
          pending_instructors: pending,
          total_users: users.length,
          active_classes: 0,
        })
      case '/api/v1/admin/users':
        return failUsers ? Promise.reject(new Error('boom')) : Promise.resolve(users)
      case '/api/v1/admin/instructors':
        return Promise.resolve(instructors)
      case '/api/v1/admin/stats/registrations':
        return failTrend
          ? Promise.reject(new Error('boom'))
          : Promise.resolve({ days })
      default:
        return Promise.reject(new Error(`unexpected url: ${url}`))
    }
  })

  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push('/dashboard/admin')
  await router.isReady()

  const wrapper = mount(AdminDashboard, { global: { plugins: [pinia, router] } })
  await flushPromises()
  await flushPromises()
  return wrapper
}

afterEach(() => {
  clearStoredToken()
  vi.restoreAllMocks()
})

describe('action center', () => {
  it('warns about pending instructor requests and links to the review queue', async () => {
    const wrapper = await mountDashboard({ pending: 1 })

    const alert = wrapper.get('[data-test="action-center"]')
    expect(alert.text()).toContain(`${fa(1)} درخواست تایید مدرس`)
    expect(wrapper.get('[data-test="action-center-link"]').attributes('href')).toBe(
      '/dashboard/manage-instructors?status=pending',
    )
  })

  it('hides the alert when nothing is pending', async () => {
    const wrapper = await mountDashboard({ pending: 0 })

    expect(wrapper.find('[data-test="action-center"]').exists()).toBe(false)
  })
})

describe('stat card navigation', () => {
  it('makes every card a link to its own page', async () => {
    const wrapper = await mountDashboard({ pending: 1 })

    expect(wrapper.get('[data-test="admin-stat-users-link"]').attributes('href')).toBe(
      '/dashboard/admin/users',
    )
    expect(wrapper.get('[data-test="admin-pending-instructors-link"]').attributes('href')).toBe(
      '/dashboard/manage-instructors?status=pending',
    )
    expect(wrapper.get('[data-test="admin-stat-classes-link"]').attributes('href')).toBe(
      '/dashboard/quality',
    )
    for (const link of wrapper.findAll('.stat-card-link')) {
      expect(link.element.tagName).toBe('A')
    }
  })
})

describe('recent user avatars', () => {
  it('renders a round image when the user has an avatar', async () => {
    const wrapper = await mountDashboard({
      users: [
        person('s1', 'mini@example.com', 'student', '2026-11-27T08:00:00Z', {
          avatar_url: '/media/avatars/mini.png',
        }),
      ],
    })

    const image = wrapper.get('[data-test="row-avatar-image"]')
    expect(image.attributes('src')).toBe('/media/avatars/mini.png')
    expect(image.classes()).toContain('row-avatar')
    expect(image.attributes('alt')).toBe('')
  })

  it('falls back to the initial letter without an avatar', async () => {
    const wrapper = await mountDashboard({
      users: [person('s1', 'zahra@example.com', 'student', '2026-11-27T08:00:00Z')],
    })

    expect(wrapper.find('[data-test="row-avatar-image"]').exists()).toBe(false)
    expect(wrapper.get('.row-avatar').text()).toBe('Z')
  })
})

describe('visual analytics', () => {
  it('feeds the registration trend into the line chart', async () => {
    const wrapper = await mountDashboard({ days: sevenDays([0, 1, 2, 1, 0, 3, 1]) })

    const chart = wrapper.get('[data-test="registration-chart"]')
    expect(chart.get('.mock-line').exists()).toBe(true)
    expect(chart.attributes('data-values')).toBe('0,1,2,1,0,3,1')
    expect(chart.attributes('data-labels')?.split(',')).toHaveLength(7)
    expect(wrapper.text()).toContain('روند ثبت‌نام کاربران')
  })

  it('reports a failed trend request instead of a chart', async () => {
    const wrapper = await mountDashboard({ failTrend: true })

    expect(wrapper.get('[data-test="trend-error"]').text()).toContain('روند ثبت‌نام')
    expect(wrapper.find('[data-test="registration-chart"]').exists()).toBe(false)
  })

  it('shows the student to instructor ratio in the doughnut chart', async () => {
    const wrapper = await mountDashboard({
      users: [
        person('s1', 's1@example.com', 'student', '2026-11-27T08:00:00Z'),
        person('s2', 's2@example.com', 'student', '2026-11-26T08:00:00Z'),
        person('s3', 's3@example.com', 'student', '2026-11-25T08:00:00Z'),
        person('i1', 'i1@example.com', 'instructor', '2026-11-24T08:00:00Z'),
        person('i2', 'i2@example.com', 'instructor', '2026-11-23T08:00:00Z'),
      ],
    })

    const chart = wrapper.get('[data-test="role-ratio-chart"]')
    expect(chart.get('.mock-doughnut').exists()).toBe(true)
    expect(chart.attributes('data-values')).toBe('3,2')
  })
})

describe('activity timeline', () => {
  it('combines the three newest users with the two newest approved instructors', async () => {
    const wrapper = await mountDashboard({
      users: [
        person('s1', 'newest@example.com', 'student', '2026-11-27T08:00:00Z'),
        person('s2', 'second@example.com', 'student', '2026-11-26T08:00:00Z'),
        person('s3', 'third@example.com', 'student', '2026-11-25T08:00:00Z'),
        person('i1', 'approved-one@example.com', 'instructor', '2026-11-24T08:00:00Z'),
        person('i2', 'approved-two@example.com', 'instructor', '2026-11-23T08:00:00Z'),
      ],
      instructors: [
        person('i1', 'approved-one@example.com', 'instructor', '2026-11-24T08:00:00Z'),
        person('i2', 'approved-two@example.com', 'instructor', '2026-11-23T08:00:00Z'),
        person('i3', 'pending@example.com', 'instructor', '2026-11-22T08:00:00Z', {
          is_approved: false,
        }),
      ],
    })

    const items = wrapper.findAll('[data-test="activity-item"]')
    expect(items).toHaveLength(5)
    expect(wrapper.get('[data-test="activity-timeline"]').text()).toContain('لاگ فعالیت‌ها')
    expect(items[0]?.text()).toContain('ثبت‌نام کاربر تازه')
    expect(items[0]?.text()).toContain('newest')
    expect(items.map((item) => item.text()).join(' ')).toContain('تایید مدرس')
    expect(wrapper.get('[data-test="activity-timeline"]').text()).not.toContain('pending@example.com')
  })
})

describe('system health', () => {
  it('shows every service as healthy when the requests succeed', async () => {
    const wrapper = await mountDashboard({ users: [] })

    const health = wrapper.get('[data-test="system-health"]')
    expect(health.text()).toContain('وضعیت سرور: آنلاین')
    expect(health.text()).toContain('پایگاه داده: متصل')
    expect(health.text()).toContain('وضعیت API: سالم')
    expect(wrapper.get('[data-test="health-server"]').attributes('data-state')).toBe('ok')
  })

  it('marks the API and database as degraded when a request fails', async () => {
    const wrapper = await mountDashboard({ failTrend: true, failUsers: true })

    expect(wrapper.get('[data-test="health-api"]').attributes('data-state')).toBe('down')
    expect(wrapper.get('[data-test="health-api"]').text()).toContain('مختل')
    expect(wrapper.get('[data-test="health-database"]').attributes('data-state')).toBe('down')
    expect(wrapper.get('[data-test="health-server"]').attributes('data-state')).toBe('ok')
  })
})
