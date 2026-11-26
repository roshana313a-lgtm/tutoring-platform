// @vitest-environment happy-dom
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import type { User } from '../../src/features/auth/api/auth'
import { useAuthStore } from '../../src/features/auth/stores/useAuthStore'
import { http } from '../../src/shared/api/http'
import { routes } from '../../src/router'
import AdminDashboard from '../../src/features/dashboard/pages/AdminDashboard.vue'
import InstructorDashboard from '../../src/features/dashboard/pages/InstructorDashboard.vue'
import InstructorApprovalPage from '../../src/features/admin/pages/InstructorApprovalPage.vue'
import { clearStoredToken, setStoredToken } from '../../src/shared/api/http'

type TestRole = 'student' | 'instructor' | 'admin'

const PENDING_TEXT = 'پروفایل شما هنوز توسط مدیر تایید نشده است'
const PENDING_TITLE = 'حساب شما در انتظار تایید مدیر است'

function makeUser(role: TestRole, overrides: Partial<User> = {}): User {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    email: `${role}@example.com`,
    role,
    created_at: '2026-11-26T10:00:00Z',
    full_name: 'علی احمدی',
    ...overrides,
  }
}

function makeInstructor(id: string, name: string, email: string): User {
  return {
    id,
    email,
    role: 'instructor',
    created_at: '2026-11-26T10:00:00Z',
    full_name: name,
    is_approved: false,
  }
}

async function withRouter(pinia: ReturnType<typeof createPinia>) {
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push('/dashboard/admin')
  await router.isReady()
  return router
}

async function mountWithUser(
  component: typeof AdminDashboard | typeof InstructorDashboard | typeof InstructorApprovalPage,
  role: TestRole,
  overrides: Partial<User> = {},
) {
  setStoredToken('test-token')
  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore(pinia)
  auth.user = makeUser(role, overrides)

  const router = await withRouter(pinia)
  const wrapper = mount(component, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return { wrapper, auth }
}

async function settle(): Promise<void> {
  for (let round = 0; round < 3; round += 1) {
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  await flushPromises()
}

afterEach(() => {
  clearStoredToken()
  vi.restoreAllMocks()
})

describe('instructor approval status', () => {
  it('shows the pending approval banner for an unapproved instructor', async () => {
    const { wrapper } = await mountWithUser(InstructorDashboard, 'instructor', {
      is_approved: false,
    })

    const banner = wrapper.get('[data-test="approval-banner"]')
    expect(banner.text()).toContain(PENDING_TITLE)
    expect(banner.text()).toContain(PENDING_TEXT)
  })

  it('hides the banner once the instructor is approved', async () => {
    const { wrapper } = await mountWithUser(InstructorDashboard, 'instructor', {
      is_approved: true,
    })

    expect(wrapper.find('[data-test="approval-banner"]').exists()).toBe(false)
  })

  it('shows the banner again when the store updates to unapproved', async () => {
    const { wrapper, auth } = await mountWithUser(InstructorDashboard, 'instructor', {
      is_approved: true,
    })
    expect(wrapper.find('[data-test="approval-banner"]').exists()).toBe(false)

    auth.user = { ...auth.user!, is_approved: false }
    await flushPromises()

    expect(wrapper.find('[data-test="approval-banner"]').exists()).toBe(true)
  })
})

describe('admin dashboard approval entry point', () => {
  it('links the pending instructors card to the approval page', async () => {
    const { wrapper } = await mountWithUser(AdminDashboard, 'admin')

    const card = wrapper.get('[data-test="admin-pending-instructors-link"]')
    expect(card.attributes('href')).toBe('/dashboard/admin/instructors')
    expect(card.text()).toContain('مدرسان در انتظار تایید')
  })

  it('lists the approval link in the admin sidebar', async () => {
    setStoredToken('test-token')
    const pinia = createPinia()
    setActivePinia(pinia)
    const auth = useAuthStore(pinia)
    auth.user = makeUser('admin')

    const DashboardLayout = (await import('../../src/features/dashboard/components/DashboardLayout.vue'))
      .default
    const router = await withRouter(pinia)
    const wrapper = mount(DashboardLayout, {
      global: { plugins: [pinia, router], stubs: { RouterView: true } },
    })
    await flushPromises()

    const labels = wrapper
      .findAll('[data-test="sidebar-link"]')
      .map((link) => link.text().trim())
    expect(labels).toContain('تایید مدرسان')
  })
})

describe('InstructorApprovalPage', () => {
  it('lists pending instructors with their name and email', async () => {
    vi.spyOn(http, 'get').mockResolvedValue([
      makeInstructor('id-1', 'سارا کریمی', 'sara@example.com'),
      makeInstructor('id-2', 'مهدی رضایی', 'mehdi@example.com'),
    ])
    const { wrapper } = await mountWithUser(InstructorApprovalPage, 'admin')
    await settle()

    const rows = wrapper.findAll('[data-test="approval-row"]')
    expect(rows).toHaveLength(2)
    expect(rows[0]?.text()).toContain('سارا کریمی')
    expect(rows[0]?.text()).toContain('sara@example.com')
    expect(rows[1]?.text()).toContain('mehdi@example.com')
    expect(wrapper.findAll('[data-test="approve-button"]')).toHaveLength(2)
    expect(wrapper.findAll('[data-test="reject-button"]')).toHaveLength(2)
  })

  it('approves an instructor and removes the row', async () => {
    vi.spyOn(http, 'get').mockResolvedValue([
      makeInstructor('id-1', 'سارا کریمی', 'sara@example.com'),
      makeInstructor('id-2', 'مهدی رضایی', 'mehdi@example.com'),
    ])
    const patch = vi
      .spyOn(http, 'patch')
      .mockResolvedValue({ ...makeInstructor('id-1', 'سارا کریمی', 'sara@example.com'), is_approved: true })

    const { wrapper } = await mountWithUser(InstructorApprovalPage, 'admin')
    await settle()

    await wrapper.get('[data-test="approve-button"]').trigger('click')
    await settle()

    expect(patch).toHaveBeenCalledWith('/api/v1/admin/instructors/id-1/approve')
    const rows = wrapper.findAll('[data-test="approval-row"]')
    expect(rows).toHaveLength(1)
    expect(rows[0]?.text()).toContain('mehdi@example.com')
    expect(wrapper.get('[data-test="approval-success"]').text()).toContain('تایید شد')
  })

  it('rejects an instructor and removes the row', async () => {
    vi.spyOn(http, 'get').mockResolvedValue([
      makeInstructor('id-1', 'سارا کریمی', 'sara@example.com'),
    ])
    const patch = vi.spyOn(http, 'patch').mockResolvedValue(undefined)

    const { wrapper } = await mountWithUser(InstructorApprovalPage, 'admin')
    await settle()

    await wrapper.get('[data-test="reject-button"]').trigger('click')
    await settle()

    expect(patch).toHaveBeenCalledWith('/api/v1/admin/instructors/id-1/reject')
    expect(wrapper.findAll('[data-test="approval-row"]')).toHaveLength(0)
    expect(wrapper.get('[data-test="approval-empty"]').exists()).toBe(true)
  })

  it('shows an empty state when nothing is pending', async () => {
    vi.spyOn(http, 'get').mockResolvedValue([])
    const { wrapper } = await mountWithUser(InstructorApprovalPage, 'admin')
    await settle()

    expect(wrapper.find('[data-test="approval-empty"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-test="approval-row"]')).toHaveLength(0)
  })

  it('reports a failed load', async () => {
    vi.spyOn(http, 'get').mockRejectedValue(new Error('boom'))
    const { wrapper } = await mountWithUser(InstructorApprovalPage, 'admin')
    await settle()

    expect(wrapper.get('[data-test="approval-error"]').text()).toContain(
      'دریافت فهرست مدرسان ناموفق بود',
    )
  })

  it('keeps the row and reports an action failure', async () => {
    vi.spyOn(http, 'get').mockResolvedValue([
      makeInstructor('id-1', 'سارا کریمی', 'sara@example.com'),
    ])
    vi.spyOn(http, 'patch').mockRejectedValue(new Error('boom'))

    const { wrapper } = await mountWithUser(InstructorApprovalPage, 'admin')
    await settle()

    await wrapper.get('[data-test="approve-button"]').trigger('click')
    await settle()

    expect(wrapper.findAll('[data-test="approval-row"]')).toHaveLength(1)
    expect(wrapper.get('[data-test="approval-action-error"]').text()).toContain(
      'تایید مدرس ناموفق بود',
    )
  })
})
