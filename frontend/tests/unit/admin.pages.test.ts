// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import type { User } from '../../src/features/auth/api/auth'
import { useAuthStore } from '../../src/features/auth/stores/useAuthStore'
import { clearStoredToken, http, setStoredToken } from '../../src/shared/api/http'
import { routes } from '../../src/router'
import ManageInstructorsPage from '../../src/features/admin/pages/ManageInstructorsPage.vue'
import ServiceQualityPage from '../../src/features/admin/pages/ServiceQualityPage.vue'

const fa = (value: number) => new Intl.NumberFormat('fa-IR').format(value)

function instructor(overrides: Partial<User> = {}): User {
  return {
    id: 'inst-1',
    email: 'pending@example.com',
    role: 'instructor',
    created_at: '2026-11-26T10:00:00Z',
    full_name: 'سارا کریمی',
    is_approved: false,
    is_active: true,
    hourly_rate: 250000,
    ...overrides,
  }
}

function activateAdmin() {
  setStoredToken('test-token')
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore(pinia).user = {
    id: 'admin-1',
    email: 'admin@institute.com',
    role: 'admin',
    created_at: '2026-11-26T10:00:00Z',
    full_name: 'مدیر مؤسسه',
  }
  return pinia
}

async function mountPage(
  component: typeof ManageInstructorsPage | typeof ServiceQualityPage,
  path: string,
) {
  const pinia = activateAdmin()
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push(path)
  await router.isReady()

  const wrapper = mount(component, { global: { plugins: [pinia, router] } })
  await flushPromises()
  await flushPromises()
  return wrapper
}

afterEach(() => {
  clearStoredToken()
  vi.restoreAllMocks()
})

describe('manage instructors page', () => {
  it('lists approved, pending and suspended instructors with real status', async () => {
    const rows = [
      instructor(),
      instructor({ id: 'inst-2', email: 'approved@example.com', full_name: 'مریم رضایی', is_approved: true }),
      instructor({ id: 'inst-3', email: 'suspended@example.com', full_name: 'رضا نادری', is_approved: true, is_active: false }),
    ]
    vi.spyOn(http, 'get').mockResolvedValue(rows)

    const wrapper = await mountPage(ManageInstructorsPage, '/dashboard/manage-instructors')

    expect(wrapper.findAll('[data-test="instructor-row"]')).toHaveLength(3)
    const statuses = wrapper.findAll('[data-test="instructor-status"]').map((node) => node.text())
    expect(statuses).toEqual(['در انتظار تایید', 'تاییدشده', 'معلق'])
    expect(wrapper.get('[data-test="filter-all"]').text()).toContain('3')
    expect(wrapper.get('[data-test="filter-pending"]').text()).toContain('1')
    expect(wrapper.text()).toContain(fa(250000))
  })

  it('opens directly on the pending tab when the status query is present', async () => {
    vi.spyOn(http, 'get').mockResolvedValue([
      instructor(),
      instructor({ id: 'inst-2', email: 'approved@example.com', is_approved: true }),
    ])

    const wrapper = await mountPage(
      ManageInstructorsPage,
      '/dashboard/manage-instructors?status=pending',
    )

    expect(wrapper.get('[data-test="filter-pending"]').attributes('aria-selected')).toBe('true')
    const rows = wrapper.findAll('[data-test="instructor-row"]')
    expect(rows).toHaveLength(1)
    expect(rows[0]?.text()).toContain('pending@example.com')
  })

  it('filters the table by status', async () => {
    vi.spyOn(http, 'get').mockResolvedValue([
      instructor(),
      instructor({ id: 'inst-2', email: 'approved@example.com', is_approved: true }),
    ])

    const wrapper = await mountPage(ManageInstructorsPage, '/dashboard/manage-instructors')
    await wrapper.get('[data-test="filter-approved"]').trigger('click')

    const rows = wrapper.findAll('[data-test="instructor-row"]')
    expect(rows).toHaveLength(1)
    expect(rows[0]?.text()).toContain('approved@example.com')
  })

  it('approves a pending instructor through the API and reloads the list', async () => {
    let rows = [instructor()]
    vi.spyOn(http, 'get').mockImplementation(() => Promise.resolve(rows))
    const patch = vi.spyOn(http, 'patch').mockImplementation(() => {
      rows = [instructor({ is_approved: true })]
      return Promise.resolve(rows[0])
    })

    const wrapper = await mountPage(ManageInstructorsPage, '/dashboard/manage-instructors')
    await wrapper.get('[data-test="approve"]').trigger('click')
    await flushPromises()

    expect(patch).toHaveBeenCalledWith('/api/v1/admin/instructors/inst-1/approve')
    expect(wrapper.get('[data-test="manage-success"]').text()).toContain('تایید شد')
    expect(wrapper.get('[data-test="instructor-status"]').text()).toBe('تاییدشده')
  })

  it('asks for confirmation before rejecting an instructor', async () => {
    let rows = [instructor()]
    vi.spyOn(http, 'get').mockImplementation(() => Promise.resolve(rows))
    const patch = vi.spyOn(http, 'patch').mockImplementation((url: string) => {
      if (url.endsWith('/reject')) rows = []
      return Promise.resolve(undefined)
    })

    const wrapper = await mountPage(ManageInstructorsPage, '/dashboard/manage-instructors')
    await wrapper.get('[data-test="reject"]').trigger('click')
    expect(wrapper.find('[data-test="confirm-reject"]').exists()).toBe(true)
    expect(patch).not.toHaveBeenCalled()

    await wrapper.get('[data-test="confirm-reject"]').trigger('click')
    await flushPromises()

    expect(patch).toHaveBeenCalledWith('/api/v1/admin/instructors/inst-1/reject')
    expect(wrapper.find('[data-test="manage-empty"]').exists()).toBe(true)
  })

  it('suspends an approved instructor through the users endpoint', async () => {
    vi.spyOn(http, 'get').mockResolvedValue([
      instructor({ id: 'inst-9', email: 'active@example.com', is_approved: true }),
    ])
    const patch = vi
      .spyOn(http, 'patch')
      .mockResolvedValue(instructor({ id: 'inst-9', is_approved: true, is_active: false }))

    const wrapper = await mountPage(ManageInstructorsPage, '/dashboard/manage-instructors')
    await wrapper.get('[data-test="suspend"]').trigger('click')
    await flushPromises()

    expect(patch).toHaveBeenCalledWith('/api/v1/admin/users/inst-9/suspend')
    expect(wrapper.get('[data-test="manage-success"]').text()).toContain('معلق شد')
  })

  it('reports a failed load instead of inventing instructors', async () => {
    vi.spyOn(http, 'get').mockRejectedValue(new Error('boom'))

    const wrapper = await mountPage(ManageInstructorsPage, '/dashboard/manage-instructors')

    expect(wrapper.get('[data-test="manage-error"]').text()).toContain('ناموفق بود')
    expect(wrapper.findAll('[data-test="instructor-row"]')).toHaveLength(0)
  })
})

describe('service quality page', () => {
  it('shows the metrics returned by the backend', async () => {
    vi.spyOn(http, 'get').mockResolvedValue({
      total_classes: 12,
      average_rating: 4.6,
      suspended_users: 2,
    })

    const wrapper = await mountPage(ServiceQualityPage, '/dashboard/quality')

    const values = wrapper.findAll('[data-test="metric-value"]').map((node) => node.text())
    expect(values).toEqual([fa(12), '4.6 از ۵', fa(2)])
  })

  it('shows zeros when the database has no classes or ratings', async () => {
    vi.spyOn(http, 'get').mockResolvedValue({
      total_classes: 0,
      average_rating: 0,
      suspended_users: 0,
    })

    const wrapper = await mountPage(ServiceQualityPage, '/dashboard/quality')

    const values = wrapper.findAll('[data-test="metric-value"]').map((node) => node.text())
    expect(values).toEqual([fa(0), '—', fa(0)])
    expect(wrapper.get('[data-test="quality-note"]').text()).toContain('هیچ رکوردی')
  })

  it('reports a failed metrics request', async () => {
    vi.spyOn(http, 'get').mockRejectedValue(new Error('boom'))

    const wrapper = await mountPage(ServiceQualityPage, '/dashboard/quality')

    expect(wrapper.get('[data-test="quality-error"]').text()).toContain('ناموفق بود')
    expect(wrapper.findAll('[data-test="metric-value"]')).toHaveLength(3)
  })
})

describe('admin menu routes', () => {
  const adminPaths: Array<[string, string]> = [
    ['/dashboard/manage-instructors', 'dashboard-manage-instructors'],
    ['/dashboard/admin/users', 'dashboard-admin-users'],
    ['/dashboard/quality', 'dashboard-quality'],
    ['/dashboard/admin/settings', 'dashboard-admin-settings'],
  ]

  it('resolves each admin menu entry to its own page component', async () => {
    const placeholder = (await import('../../src/features/dashboard/pages/PlaceholderPage.vue')).default
    activateAdmin()
    const router = createRouter({ history: createMemoryHistory(), routes })

    for (const [path, name] of adminPaths) {
      await router.push(path)
      const record = router.currentRoute.value.matched.at(-1)
      expect(record?.name).toBe(name)

      // The router resolves lazy loaders to the real component object.
      expect(record?.components?.default).not.toBe(placeholder)
      expect(record?.components?.default).toBeTruthy()
    }
  })
})
