// @vitest-environment happy-dom
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import type { User } from '../../src/features/auth/api/auth'
import { useAuthStore } from '../../src/features/auth/stores/useAuthStore'
import { dashboardRouteName } from '../../src/features/dashboard/roleDashboard'
import StudentDashboard from '../../src/features/dashboard/pages/StudentDashboard.vue'
import InstructorDashboard from '../../src/features/dashboard/pages/InstructorDashboard.vue'
import AdminDashboard from '../../src/features/dashboard/pages/AdminDashboard.vue'
import LoginPage from '../../src/features/auth/pages/LoginPage.vue'
import { routes } from '../../src/router'
import { clearStoredToken, http, setStoredToken } from '../../src/shared/api/http'

type TestRole = 'student' | 'instructor' | 'admin'

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

function activateStore(user: User) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore(pinia)
  auth.user = user
  return { pinia, auth }
}

async function resolveDashboardPath(role: TestRole): Promise<string> {
  setStoredToken('test-token')
  activateStore(makeUser(role))

  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push('/dashboard')
  await router.isReady()
  return router.currentRoute.value.fullPath
}

const INSTRUCTOR_ITEM = {
  id: 'instructor-1',
  full_name: 'سارا کریمی',
  email: 'sara@example.com',
  short_summary: 'مدرس آیلتس',
  teaching_languages: ['انگلیسی'],
  hourly_rate: 250000,
  education_level: 'کارشناسی ارشد',
  avatar_url: '',
}

function mockDashboardApi() {
  return vi.spyOn(http, 'get').mockImplementation((url: string) => {
    switch (url) {
      case '/api/v1/dashboard/admin/stats':
        return Promise.resolve({ pending_instructors: 1, total_users: 7, active_classes: 0 })
      case '/api/v1/dashboard/instructor/stats':
        return Promise.resolve({ today_classes: 2, pending_grading: 4, total_students: 3 })
      case '/api/v1/dashboard/student/stats':
        return Promise.resolve({ upcoming_classes: 2, pending_homework: 3, average_grade: 0 })
      case '/api/v1/instructors':
        return Promise.resolve([INSTRUCTOR_ITEM])
      default:
        return Promise.reject(new Error(`unexpected url: ${url}`))
    }
  })
}

async function mountDashboard(
  component: typeof StudentDashboard | typeof InstructorDashboard | typeof AdminDashboard,
  role: TestRole,
) {
  mockDashboardApi()
  setStoredToken('test-token')
  const { pinia } = activateStore(makeUser(role))

  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push(`/dashboard/${role}`)
  await router.isReady()

  const wrapper = mount(component, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return wrapper
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

describe('role dashboard routes', () => {
  it('maps every role to its own dashboard route name', () => {
    expect(dashboardRouteName('student')).toBe('dashboard-student')
    expect(dashboardRouteName('instructor')).toBe('dashboard-instructor')
    expect(dashboardRouteName('admin')).toBe('dashboard-admin')
  })

  it('falls back to the student dashboard for an unknown role', () => {
    expect(dashboardRouteName(undefined)).toBe('dashboard-student')
    expect(dashboardRouteName(null)).toBe('dashboard-student')
    expect(dashboardRouteName('ghost')).toBe('dashboard-student')
  })

  it('redirects /dashboard to the student dashboard for a student', async () => {
    expect(await resolveDashboardPath('student')).toBe('/dashboard/student')
  })

  it('redirects /dashboard to the instructor dashboard for an instructor', async () => {
    expect(await resolveDashboardPath('instructor')).toBe('/dashboard/instructor')
  })

  it('redirects /dashboard to the admin dashboard for an admin', async () => {
    expect(await resolveDashboardPath('admin')).toBe('/dashboard/admin')
  })

  it('sends the user to their role dashboard after login', async () => {
    const { pinia, auth } = activateStore(makeUser('student'))
    vi.spyOn(auth, 'login').mockImplementation(async () => {
      const user = makeUser('instructor')
      auth.user = user
      auth.token = 'test-token'
      setStoredToken('test-token')
      return { token: 'test-token', user }
    })

    const router = createRouter({ history: createMemoryHistory(), routes })
    await router.push('/login')
    await router.isReady()

    const wrapper = mount(LoginPage, { global: { plugins: [pinia, router] } })
    await wrapper.get('input[name="email"]').setValue('instructor@example.com')
    await wrapper.get('input[name="password"]').setValue('correct horse battery')
    await settle()

    await wrapper.get('form').trigger('submit')
    await new Promise((resolve) => setTimeout(resolve, 1200))
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/dashboard/instructor')
  })
})

describe('role dashboard rendering', () => {
  it('renders the student dashboard with its cards and suggested instructors', async () => {
    const wrapper = await mountDashboard(StudentDashboard, 'student')

    expect(wrapper.find('[data-test="student-dashboard"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('کلاس‌های پیش رو')
    expect(wrapper.text()).toContain('تکالیف در انتظار')
    expect(wrapper.text()).toContain('مدرسان پیشنهادی')
    expect(wrapper.findAll('[data-test="suggested-instructor"]')).toHaveLength(1)
    expect(wrapper.find('[data-test="instructor-dashboard"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="admin-dashboard"]').exists()).toBe(false)
  })

  it('renders the instructor dashboard with its cards and booking requests', async () => {
    const wrapper = await mountDashboard(InstructorDashboard, 'instructor')

    expect(wrapper.find('[data-test="instructor-dashboard"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('کلاس‌های امروز')
    expect(wrapper.text()).toContain('در انتظار تصحیح')
    expect(wrapper.text()).toContain('درخواست‌های رزرو')
    expect(wrapper.findAll('[data-test="booking-request"]')).toHaveLength(0)
    expect(wrapper.find('[data-test="booking-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="student-dashboard"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="admin-dashboard"]').exists()).toBe(false)
  })

  it('renders the admin dashboard with live stats', async () => {
    const wrapper = await mountDashboard(AdminDashboard, 'admin')

    expect(wrapper.find('[data-test="admin-dashboard"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('کاربران فعال')
    expect(wrapper.text()).toContain('مدرسان در انتظار تایید')
    expect(wrapper.find('[data-test="admin-stats"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="student-dashboard"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="instructor-dashboard"]').exists()).toBe(false)
  })

  it('greets the signed-in user by name', async () => {
    const wrapper = await mountDashboard(StudentDashboard, 'student')

    expect(wrapper.text()).toContain('خوش آمدید، علی احمدی')
  })
})
