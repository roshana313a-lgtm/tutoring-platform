// @vitest-environment happy-dom
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import type { User } from '../../src/features/auth/api/auth'
import { useAuthStore } from '../../src/features/auth/stores/useAuthStore'
import { clearStoredToken, http, setStoredToken } from '../../src/shared/api/http'
import { routes } from '../../src/router'
import AdminDashboard from '../../src/features/dashboard/pages/AdminDashboard.vue'
import InstructorDashboard from '../../src/features/dashboard/pages/InstructorDashboard.vue'
import StudentDashboard from '../../src/features/dashboard/pages/StudentDashboard.vue'

type TestRole = 'student' | 'instructor' | 'admin'

const BANNER = '[data-test="profile-incomplete-banner"]'
const BANNER_TEXT = 'پروفایل شما تکمیل نیست'
const BANNER_HINT = 'لطفاً برای استفاده کامل از امکانات، اطلاعات خود را وارد کنید.'

function makeUser(role: TestRole, overrides: Partial<User> = {}): User {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    email: `${role}@example.com`,
    role,
    created_at: '2026-11-26T10:00:00Z',
    full_name: 'علی احمدی',
    phone_number: '09121234567',
    ...overrides,
  }
}

const dashboards = [
  { role: 'student' as const, component: StudentDashboard, name: 'student' },
  { role: 'instructor' as const, component: InstructorDashboard, name: 'instructor' },
  { role: 'admin' as const, component: AdminDashboard, name: 'admin' },
]

function mockDashboardApi() {
  vi.spyOn(http, 'get').mockImplementation((url: string) => {
    switch (url) {
      case '/api/v1/dashboard/admin/stats':
        return Promise.resolve({ pending_instructors: 0, total_users: 0, active_classes: 0 })
      case '/api/v1/dashboard/instructor/stats':
        return Promise.resolve({ today_classes: 0, pending_grading: 0, total_students: 0 })
      case '/api/v1/dashboard/student/stats':
        return Promise.resolve({ upcoming_classes: 0, pending_homework: 0, average_grade: 0 })
      case '/api/v1/instructors':
        return Promise.resolve([])
      case '/api/v1/admin/users':
        return Promise.resolve([])
      case '/api/v1/admin/stats/registrations':
        return Promise.resolve({ days: [] })
      default:
        return Promise.resolve([])
    }
  })
}

async function mountDashboard(
  component: typeof StudentDashboard | typeof InstructorDashboard | typeof AdminDashboard,
  role: TestRole,
  overrides: Partial<User> = {},
) {
  mockDashboardApi()
  setStoredToken('test-token')

  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore(pinia)
  auth.user = makeUser(role, overrides)

  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push(`/dashboard/${role}`)
  await router.isReady()

  const wrapper = mount(component, { global: { plugins: [pinia, router] } })
  for (let round = 0; round < 3; round += 1) {
    await flushPromises()
  }

  return { wrapper, auth }
}

afterEach(() => {
  clearStoredToken()
  vi.restoreAllMocks()
})

describe('profile completion banner', () => {
  for (const dashboard of dashboards) {
    it(`shows the banner on the ${dashboard.name} dashboard when the full name is empty`, async () => {
      const { wrapper } = await mountDashboard(dashboard.component, dashboard.role, {
        full_name: '',
        phone_number: '09121234567',
      })

      const banner = wrapper.get(BANNER)
      expect(banner.text()).toContain(BANNER_TEXT)
      expect(banner.text()).toContain(BANNER_HINT)
      expect(wrapper.get('[data-test="profile-completion-link"]').attributes('href')).toBe(
        '/profile',
      )
    })

    it(`hides the banner on the ${dashboard.name} dashboard when the profile is complete`, async () => {
      const { wrapper } = await mountDashboard(dashboard.component, dashboard.role)

      expect(wrapper.find(BANNER).exists()).toBe(false)
    })
  }

  it('shows the banner when only the phone number is missing', async () => {
    const { wrapper } = await mountDashboard(StudentDashboard, 'student', {
      full_name: 'علی احمدی',
      phone_number: '',
    })

    expect(wrapper.find(BANNER).exists()).toBe(true)
  })

  it('shows the banner above the stat cards', async () => {
    const { wrapper } = await mountDashboard(StudentDashboard, 'student', { full_name: '' })

    const banner = wrapper.get(BANNER).element
    const stats = wrapper.get('[data-test="student-stats"]').element
    expect(
      banner.compareDocumentPosition(stats) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('disappears as soon as the store holds the saved profile', async () => {
    const { wrapper, auth } = await mountDashboard(StudentDashboard, 'student', {
      full_name: '',
      phone_number: '',
    })

    expect(wrapper.find(BANNER).exists()).toBe(true)

    auth.user = { ...makeUser('student'), full_name: 'علی احمدی', phone_number: '09121234567' }
    await nextTick()
    await nextTick()

    expect(wrapper.find(BANNER).exists()).toBe(false)
  })

  it('links to the profile page with the completion action label', async () => {
    const { wrapper } = await mountDashboard(StudentDashboard, 'student', { full_name: '' })

    const link = wrapper.get('[data-test="profile-completion-link"]')
    expect(link.text()).toBe('تکمیل پروفایل')
    expect(link.attributes('href')).toBe('/profile')
  })
})
