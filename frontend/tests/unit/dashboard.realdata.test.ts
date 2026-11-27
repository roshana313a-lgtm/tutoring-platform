// @vitest-environment happy-dom
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
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

const fa = (value: number) => new Intl.NumberFormat('fa-IR').format(value)

function makeUser(role: TestRole): User {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    email: `${role}@example.com`,
    role,
    created_at: '2026-11-26T10:00:00Z',
    full_name: 'علی احمدی',
  }
}

interface ApiStub {
  admin?: unknown
  instructor?: unknown
  student?: unknown
  instructors?: unknown
  users?: unknown
  fail?: boolean
}

async function mountDashboard(
  component: typeof AdminDashboard | typeof InstructorDashboard | typeof StudentDashboard,
  role: TestRole,
  stub: ApiStub,
) {
  setStoredToken('test-token')
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore(pinia).user = makeUser(role)

  vi.spyOn(http, 'get').mockImplementation((url: string) => {
    if (stub.fail) return Promise.reject(new Error('boom'))
    switch (url) {
      case '/api/v1/dashboard/admin/stats':
        return Promise.resolve(stub.admin)
      case '/api/v1/dashboard/instructor/stats':
        return Promise.resolve(stub.instructor)
      case '/api/v1/dashboard/student/stats':
        return Promise.resolve(stub.student)
      case '/api/v1/instructors':
        return Promise.resolve(stub.instructors ?? [])
      case '/api/v1/admin/users':
        return Promise.resolve(stub.users ?? [])
      default:
        return Promise.reject(new Error(`unexpected url: ${url}`))
    }
  })

  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push(`/dashboard/${role}`)
  await router.isReady()

  const wrapper = mount(component, { global: { plugins: [pinia, router] } })
  await flushPromises()
  await flushPromises()
  return wrapper
}

function statValues(wrapper: Awaited<ReturnType<typeof mountDashboard>>): string[] {
  return wrapper.findAll('[data-test="stat-value"]').map((node) => node.text())
}

afterEach(() => {
  clearStoredToken()
  vi.restoreAllMocks()
})

describe('admin dashboard real stats', () => {
  it('shows the exact counts returned by the API', async () => {
    const wrapper = await mountDashboard(AdminDashboard, 'admin', {
      admin: { pending_instructors: 1, total_users: 5, active_classes: 0, open_complaints: 2 },
    })

    expect(statValues(wrapper)).toEqual([fa(5), fa(1), fa(0), fa(2)])

    const pendingCard = wrapper.get('[data-test="admin-pending-instructors-link"]')
    expect(pendingCard.attributes('href')).toBe('/dashboard/manage-instructors?status=pending')
    expect(pendingCard.get('[data-test="stat-value"]').text()).toBe(fa(1))
  })

  it('links the quick actions to the matching admin pages', async () => {
    const wrapper = await mountDashboard(AdminDashboard, 'admin', {
      admin: { pending_instructors: 1, total_users: 5, active_classes: 0, open_complaints: 0 },
    })

    expect(wrapper.get('[data-test="quick-action-approve"]').attributes('href')).toBe(
      '/dashboard/manage-instructors?status=pending',
    )
    expect(wrapper.get('[data-test="quick-action-users"]').attributes('href')).toBe(
      '/dashboard/admin/users',
    )
    expect(wrapper.get('[data-test="quick-action-settings"]').attributes('href')).toBe(
      '/dashboard/admin/settings',
    )
  })

  it('shows the five most recent registrations with a link to user management', async () => {
    const registration = (id: string, email: string, createdAt: string, role: 'student' | 'instructor' = 'student') => ({
      id,
      email,
      role,
      created_at: createdAt,
      full_name: email.split('@')[0],
    })

    const wrapper = await mountDashboard(AdminDashboard, 'admin', {
      admin: { pending_instructors: 0, total_users: 6, active_classes: 0, open_complaints: 0 },
      users: [
        registration('u-3', 'third@example.com', '2026-11-24T10:00:00Z'),
        registration('u-1', 'newest@example.com', '2026-11-26T10:00:00Z', 'instructor'),
        registration('u-6', 'oldest@example.com', '2026-11-20T10:00:00Z'),
        registration('u-2', 'second@example.com', '2026-11-25T10:00:00Z'),
        registration('u-5', 'fifth@example.com', '2026-11-22T10:00:00Z'),
        registration('u-4', 'fourth@example.com', '2026-11-23T10:00:00Z'),
      ],
    })

    const rows = wrapper.findAll('[data-test="recent-user"]')
    expect(rows).toHaveLength(5)
    expect(rows[0]?.text()).toContain('newest@example.com')
    expect(rows[0]?.text()).toContain('مدرس')
    expect(rows[1]?.text()).toContain('second@example.com')
    expect(rows[4]?.text()).toContain('fifth@example.com')
    expect(wrapper.text()).not.toContain('oldest@example.com')

    expect(wrapper.get('[data-test="recent-view-all"]').attributes('href')).toBe(
      '/dashboard/admin/users',
    )
  })

  it('never shows a hardcoded value when the API fails', async () => {
    const wrapper = await mountDashboard(AdminDashboard, 'admin', { fail: true })

    expect(statValues(wrapper)).toEqual(['—', '—', '—', '—'])
    expect(wrapper.get('[data-test="admin-stats-error"]').text()).toContain(
      'دریافت آمار داشبورد ناموفق بود',
    )
  })
})

describe('instructor dashboard real stats', () => {
  it('shows today classes, grading queue and student count from the API', async () => {
    const wrapper = await mountDashboard(InstructorDashboard, 'instructor', {
      instructor: { today_classes: 2, pending_grading: 4, total_students: 3 },
    })

    expect(statValues(wrapper)).toEqual([fa(2), fa(4), fa(3)])
    expect(wrapper.get('[data-test="booking-requests"]').text()).toContain('درخواست‌های رزرو')
    expect(wrapper.find('[data-test="booking-request"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="booking-empty"]').exists()).toBe(true)
  })
})

describe('student dashboard real stats', () => {
  it('shows upcoming classes, pending homework and the average grade', async () => {
    const wrapper = await mountDashboard(StudentDashboard, 'student', {
      student: { upcoming_classes: 2, pending_homework: 3, average_grade: 17.5 },
    })

    expect(statValues(wrapper)).toEqual([fa(2), fa(3), '17.5'])
  })

  it('shows a dash for the grade when no grade exists yet', async () => {
    const wrapper = await mountDashboard(StudentDashboard, 'student', {
      student: { upcoming_classes: 0, pending_homework: 0, average_grade: 0 },
    })

    expect(statValues(wrapper)).toEqual([fa(0), fa(0), '—'])
  })

  it('reports a failed stats request', async () => {
    const wrapper = await mountDashboard(StudentDashboard, 'student', { fail: true })

    expect(wrapper.get('[data-test="student-stats-error"]').text()).toContain(
      'دریافت آمار داشبورد ناموفق بود',
    )
  })
})

describe('student dashboard instructor list', () => {
  it('renders instructors from the API', async () => {
    const wrapper = await mountDashboard(StudentDashboard, 'student', {
      student: { upcoming_classes: 0, pending_homework: 0, average_grade: 0 },
      instructors: [
        {
          id: 'i-1',
          full_name: 'سارا کریمی',
          email: 'sara@example.com',
          short_summary: 'مدرس آیلتس',
          teaching_languages: ['انگلیسی', 'آلمانی'],
          hourly_rate: 250000,
          education_level: 'کارشناسی ارشد',
          avatar_url: '',
        },
        {
          id: 'i-2',
          full_name: '',
          email: 'mehdi@example.com',
          short_summary: '',
          teaching_languages: [],
          hourly_rate: 0,
          education_level: '',
          avatar_url: '/media/avatars/mehdi.png',
        },
      ],
    })

    const rows = wrapper.findAll('[data-test="suggested-instructor"]')
    expect(rows).toHaveLength(2)
    expect(rows[0]?.text()).toContain('سارا کریمی')
    expect(rows[0]?.text()).toContain('انگلیسی، آلمانی')
    expect(rows[0]?.text()).toContain('تومان / ساعت')
    expect(rows[1]?.text()).toContain('mehdi')
    expect(rows[1]?.text()).toContain('زبان تدریس ثبت نشده')
    expect(rows[1]?.text()).toContain('نرخ توافقی')
    expect(rows[1]?.find('img').attributes('src')).toBe('/media/avatars/mehdi.png')
  })

  it('shows an empty state when no instructor is approved', async () => {
    const wrapper = await mountDashboard(StudentDashboard, 'student', {
      student: { upcoming_classes: 0, pending_homework: 0, average_grade: 0 },
      instructors: [],
    })

    expect(wrapper.find('[data-test="instructors-empty"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-test="suggested-instructor"]')).toHaveLength(0)
  })

  it('reports a failed instructor request', async () => {
    const wrapper = await mountDashboard(StudentDashboard, 'student', { fail: true })

    expect(wrapper.get('[data-test="instructors-error"]').text()).toContain(
      'دریافت فهرست مدرسان ناموفق بود',
    )
  })
})
