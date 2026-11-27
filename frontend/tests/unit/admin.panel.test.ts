// @vitest-environment happy-dom
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import type { User } from '../../src/features/auth/api/auth'
import { useAuthStore } from '../../src/features/auth/stores/useAuthStore'
import { clearStoredToken, http, setStoredToken } from '../../src/shared/api/http'
import { routes } from '../../src/router'
import UserManagementPage from '../../src/features/admin/pages/UserManagementPage.vue'
import AdminSettingsPage from '../../src/features/admin/pages/AdminSettingsPage.vue'

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'student@example.com',
    role: 'student',
    created_at: '2026-11-26T10:00:00Z',
    full_name: 'علی احمدی',
    is_active: true,
    ...overrides,
  }
}

async function mountPage(
  component: typeof UserManagementPage | typeof AdminSettingsPage,
  path = '/dashboard/admin/users',
) {
  setStoredToken('test-token')
  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore(pinia)
  auth.user = makeUser({ role: 'admin', email: 'admin@institute.com', full_name: 'مدیر سیستم' })

  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push(path)
  await router.isReady()

  const wrapper = mount(component, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return { wrapper, router }
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

describe('UserManagementPage', () => {
  it('lists users with name, email and role', async () => {
    vi.spyOn(http, 'get').mockResolvedValue([
      makeUser({ id: 'id-1', full_name: 'علی احمدی', email: 'ali@example.com' }),
      makeUser({
        id: 'id-2',
        role: 'instructor',
        full_name: 'سارا کریمی',
        email: 'sara@example.com',
      }),
    ])
    const { wrapper } = await mountPage(UserManagementPage)
    await settle()

    const rows = wrapper.findAll('[data-test="user-row"]')
    expect(rows).toHaveLength(2)
    expect(rows[0]?.text()).toContain('علی احمدی')
    expect(rows[0]?.text()).toContain('ali@example.com')
    expect(rows[0]?.text()).toContain('زبان آموز')
    expect(rows[1]?.text()).toContain('sara@example.com')
    expect(rows[1]?.text()).toContain('مدرس')
    expect(wrapper.findAll('[data-test="toggle-button"]')[0]?.text()).toContain('مسدود کردن')
  })

  it('suspends an active user and flips the button to reactivate', async () => {
    vi.spyOn(http, 'get').mockResolvedValue([makeUser({ id: 'id-1', is_active: true })])
    const patch = vi
      .spyOn(http, 'patch')
      .mockResolvedValue(makeUser({ id: 'id-1', is_active: false }))

    const { wrapper } = await mountPage(UserManagementPage)
    await settle()

    await wrapper.get('[data-test="toggle-button"]').trigger('click')
    await settle()

    expect(patch).toHaveBeenCalledWith('/api/v1/admin/users/id-1/suspend')
    expect(wrapper.get('[data-test="user-status"]').text()).toBe('مسدود')
    expect(wrapper.get('[data-test="toggle-button"]').text()).toContain('فعال کردن')
    expect(wrapper.get('[data-test="users-success"]').text()).toContain('مسدود شد')
  })

  it('reactivates a suspended user', async () => {
    vi.spyOn(http, 'get').mockResolvedValue([makeUser({ id: 'id-2', is_active: false })])
    vi.spyOn(http, 'patch').mockResolvedValue(makeUser({ id: 'id-2', is_active: true }))

    const { wrapper } = await mountPage(UserManagementPage)
    await settle()

    expect(wrapper.get('[data-test="toggle-button"]').text()).toContain('فعال کردن')
    await wrapper.get('[data-test="toggle-button"]').trigger('click')
    await settle()

    expect(wrapper.get('[data-test="user-status"]').text()).toBe('فعال')
    expect(wrapper.get('[data-test="users-success"]').text()).toContain('فعال شد')
  })

  it('keeps the previous state and reports a failed toggle', async () => {
    vi.spyOn(http, 'get').mockResolvedValue([makeUser({ id: 'id-1', is_active: true })])
    vi.spyOn(http, 'patch').mockRejectedValue(new Error('boom'))

    const { wrapper } = await mountPage(UserManagementPage)
    await settle()

    await wrapper.get('[data-test="toggle-button"]').trigger('click')
    await settle()

    expect(wrapper.get('[data-test="user-status"]').text()).toBe('فعال')
    expect(wrapper.get('[data-test="users-action-error"]').text()).toContain(
      'تغییر وضعیت کاربر ناموفق بود',
    )
  })

  it('shows an empty state and a load error', async () => {
    vi.spyOn(http, 'get').mockResolvedValueOnce([])
    const empty = await mountPage(UserManagementPage)
    await settle()
    expect(empty.wrapper.find('[data-test="users-empty"]').exists()).toBe(true)

    vi.restoreAllMocks()
    vi.spyOn(http, 'get').mockRejectedValue(new Error('boom'))
    const failed = await mountPage(UserManagementPage)
    await settle()
    expect(failed.wrapper.get('[data-test="users-error"]').text()).toContain(
      'دریافت فهرست کاربران ناموفق بود',
    )
  })
})

describe('AdminSettingsPage', () => {
  const stored = {
    platform_name: 'آکادمی پارس',
    default_hourly_rate: 350000,
    support_email: 'help@pars.example.com',
  }

  it('loads the current settings into the form', async () => {
    vi.spyOn(http, 'get').mockResolvedValue(stored)
    const { wrapper } = await mountPage(AdminSettingsPage, '/dashboard/admin/settings')
    await settle()

    expect((wrapper.get('[data-test="platform-name"]').element as HTMLInputElement).value).toBe(
      stored.platform_name,
    )
    expect((wrapper.get('[data-test="default-rate"]').element as HTMLInputElement).value).toBe(
      String(stored.default_hourly_rate),
    )
    expect((wrapper.get('[data-test="support-email"]').element as HTMLInputElement).value).toBe(
      stored.support_email,
    )
  })

  it('saves edited settings', async () => {
    vi.spyOn(http, 'get').mockResolvedValue(stored)
    const put = vi.spyOn(http, 'put').mockResolvedValue({
      ...stored,
      platform_name: 'آکادمی زبان پارس',
    })

    const { wrapper } = await mountPage(AdminSettingsPage, '/dashboard/admin/settings')
    await settle()

    await wrapper.get('[data-test="platform-name"]').setValue('آکادمی زبان پارس')
    await wrapper.get('[data-test="settings-form"]').trigger('submit')
    await settle()

    expect(put).toHaveBeenCalledWith('/api/v1/admin/settings', {
      platform_name: 'آکادمی زبان پارس',
      default_hourly_rate: stored.default_hourly_rate,
      support_email: stored.support_email,
    })
    expect(wrapper.get('[data-test="settings-success"]').text()).toContain('ذخیره شد')
  })

  it('blocks saving an invalid email without calling the API', async () => {
    vi.spyOn(http, 'get').mockResolvedValue(stored)
    const put = vi.spyOn(http, 'put').mockResolvedValue(stored)

    const { wrapper } = await mountPage(AdminSettingsPage, '/dashboard/admin/settings')
    await settle()

    await wrapper.get('[data-test="support-email"]').setValue('not-an-email')
    await wrapper.get('[data-test="settings-form"]').trigger('submit')
    await settle()

    expect(put).not.toHaveBeenCalled()
    expect(wrapper.get('[data-test="support-email-error"]').text()).toContain(
      'ایمیل پشتیبانی معتبر نیست',
    )
  })

  it('blocks saving an empty platform name', async () => {
    vi.spyOn(http, 'get').mockResolvedValue(stored)
    const put = vi.spyOn(http, 'put').mockResolvedValue(stored)

    const { wrapper } = await mountPage(AdminSettingsPage, '/dashboard/admin/settings')
    await settle()

    await wrapper.get('[data-test="platform-name"]').setValue('   ')
    await wrapper.get('[data-test="settings-form"]').trigger('submit')
    await settle()

    expect(put).not.toHaveBeenCalled()
    expect(wrapper.get('[data-test="platform-name-error"]').exists()).toBe(true)
  })

  it('reports a failed save', async () => {
    vi.spyOn(http, 'get').mockResolvedValue(stored)
    vi.spyOn(http, 'put').mockRejectedValue(new Error('boom'))

    const { wrapper } = await mountPage(AdminSettingsPage, '/dashboard/admin/settings')
    await settle()

    await wrapper.get('[data-test="settings-form"]').trigger('submit')
    await settle()

    expect(wrapper.get('[data-test="settings-error"]').text()).toContain(
      'ذخیره تنظیمات ناموفق بود',
    )
  })
})

describe('admin panel routing and navigation', () => {
  it('serves the user management page at /dashboard/admin/users', async () => {
    vi.spyOn(http, 'get').mockResolvedValue([])
    const pinia = createPinia()
    setActivePinia(pinia)
    setStoredToken('test-token')
    useAuthStore(pinia).user = makeUser({ role: 'admin' })

    const router = createRouter({ history: createMemoryHistory(), routes })
    await router.push('/dashboard/admin/users')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('dashboard-admin-users')
    expect(router.currentRoute.value.meta.title).toBe('nav.titles.users')

    await router.push('/dashboard/admin/settings')
    expect(router.currentRoute.value.name).toBe('dashboard-admin-settings')
  })
})
