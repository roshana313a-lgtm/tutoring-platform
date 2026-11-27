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

async function withRouter() {
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push('/dashboard/admin')
  await router.isReady()
  return router
}

async function mountWithUser(
  component: typeof AdminDashboard | typeof InstructorDashboard,
  role: TestRole,
  overrides: Partial<User> = {},
) {
  setStoredToken('test-token')
  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore(pinia)
  auth.user = makeUser(role, overrides)

  const router = await withRouter()
  const wrapper = mount(component, {
    global: { plugins: [pinia, router], stubs: { teleport: true } },
  })
  await flushPromises()
  return { wrapper, auth }
}

function mockDashboardStats() {
  vi.spyOn(http, 'get').mockImplementation((url: string) => {
    if (url === '/api/v1/dashboard/admin/stats') {
      return Promise.resolve({ pending_instructors: 1, total_users: 5, active_classes: 0 })
    }
    if (url === '/api/v1/dashboard/instructor/stats') {
      return Promise.resolve({ today_classes: 0, pending_grading: 0, total_students: 0 })
    }
    return Promise.reject(new Error(`unexpected url: ${url}`))
  })
}

afterEach(() => {
  clearStoredToken()
  vi.restoreAllMocks()
})

describe('instructor approval status', () => {
  it('shows the pending approval banner for an unapproved instructor', async () => {
    mockDashboardStats()
    const { wrapper } = await mountWithUser(InstructorDashboard, 'instructor', {
      is_approved: false,
    })

    const banner = wrapper.get('[data-test="approval-banner"]')
    expect(banner.text()).toContain(PENDING_TITLE)
    expect(banner.text()).toContain(PENDING_TEXT)
  })

  it('hides the banner once the instructor is approved', async () => {
    mockDashboardStats()
    const { wrapper } = await mountWithUser(InstructorDashboard, 'instructor', {
      is_approved: true,
    })

    expect(wrapper.find('[data-test="approval-banner"]').exists()).toBe(false)
  })

  it('shows the banner again when the store updates to unapproved', async () => {
    mockDashboardStats()
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
  it('links the pending instructors card to the pending tab of the instructors list', async () => {
    mockDashboardStats()
    const { wrapper } = await mountWithUser(AdminDashboard, 'admin')

    const card = wrapper.get('[data-test="admin-pending-instructors-link"]')
    expect(card.attributes('href')).toBe('/dashboard/manage-instructors?status=pending')
    expect(card.text()).toContain('مدرسان در انتظار تایید')
  })

  it('keeps a single instructors entry in the admin sidebar', async () => {
    setStoredToken('test-token')
    const pinia = createPinia()
    setActivePinia(pinia)
    const auth = useAuthStore(pinia)
    auth.user = makeUser('admin')

    const DashboardLayout = (await import('../../src/features/dashboard/components/DashboardLayout.vue'))
      .default
    const router = await withRouter()
    const wrapper = mount(DashboardLayout, {
      global: { plugins: [pinia, router], stubs: { RouterView: true } },
    })
    await flushPromises()

    const labels = wrapper.findAll('[data-test="sidebar-link"]').map((link) => link.text().trim())
    expect(labels).toContain('مدیریت مدرسان')
    expect(labels).not.toContain('تایید مدرسان')
  })
})
