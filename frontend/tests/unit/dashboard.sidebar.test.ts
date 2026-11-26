// @vitest-environment happy-dom
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { useAuthStore } from '../../src/features/auth/stores/useAuthStore'
import { routes } from '../../src/router'
import { clearStoredToken, setStoredToken } from '../../src/shared/api/http'
import DashboardLayout from '../../src/features/dashboard/components/DashboardLayout.vue'

type TestRole = 'student' | 'instructor' | 'admin'

async function mountLayoutWithRole(role: TestRole) {
  setStoredToken('test-token')

  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore(pinia)
  auth.user = {
    id: '11111111-1111-4111-8111-111111111111',
    email: `${role}@example.com`,
    role,
    created_at: '2026-11-24T10:00:00Z',
  }

  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push('/dashboard')
  await router.isReady()

  const wrapper = mount(DashboardLayout, {
    global: {
      plugins: [pinia, router],
      stubs: { RouterView: true },
    },
  })

  return wrapper
}

function sidebarLabels(wrapper: ReturnType<typeof mount>): string[] {
  return wrapper.findAll('[data-test="sidebar-link"]').map((link) => link.text().trim())
}

afterEach(() => {
  clearStoredToken()
})

describe('DashboardLayout role-based sidebar', () => {
  it('renders the student menu for a student', async () => {
    const wrapper = await mountLayoutWithRole('student')

    expect(sidebarLabels(wrapper)).toEqual([
      'داشبورد',
      'جستجوی مدرس',
      'کلاس‌های من',
      'تکالیف من',
      'پیشرفت من',
      'پروفایل من',
    ])
  })

  it('renders the instructor menu for an instructor', async () => {
    const wrapper = await mountLayoutWithRole('instructor')

    expect(sidebarLabels(wrapper)).toEqual([
      'داشبورد',
      'کلاس‌های من',
      'دانشجویان من',
      'ارسال تکلیف',
      'ارزیابی‌ها',
      'پروفایل من',
    ])
  })

  it('renders the admin menu for an admin', async () => {
    const wrapper = await mountLayoutWithRole('admin')

    expect(sidebarLabels(wrapper)).toEqual([
      'داشبورد',
      'مدیریت مدرسان',
      'تایید مدرسان',
      'مدیریت کاربران',
      'کیفیت خدمات',
      'تنظیمات',
      'پروفایل من',
    ])
  })

  it('points the dashboard link at the role-specific route', async () => {
    const student = await mountLayoutWithRole('student')
    const instructor = await mountLayoutWithRole('instructor')
    const admin = await mountLayoutWithRole('admin')

    expect(student.findAll('[data-test="sidebar-link"]')[0]?.attributes('href')).toBe(
      '/dashboard/student',
    )
    expect(instructor.findAll('[data-test="sidebar-link"]')[0]?.attributes('href')).toBe(
      '/dashboard/instructor',
    )
    expect(admin.findAll('[data-test="sidebar-link"]')[0]?.attributes('href')).toBe(
      '/dashboard/admin',
    )
  })

  it('marks the current route link as active', async () => {
    const wrapper = await mountLayoutWithRole('student')
    const activeLinks = wrapper.findAll('[data-test="sidebar-link"].is-active')

    expect(activeLinks).toHaveLength(1)
    expect(activeLinks[0]?.text().trim()).toBe('داشبورد')
  })
})
