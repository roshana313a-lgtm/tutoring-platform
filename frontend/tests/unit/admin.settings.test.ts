// @vitest-environment happy-dom
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import type { User } from '../../src/features/auth/api/auth'
import { useAuthStore } from '../../src/features/auth/stores/useAuthStore'
import { clearStoredToken, http, setStoredToken } from '../../src/shared/api/http'
import { routes } from '../../src/router'
import AdminSettingsPage from '../../src/features/admin/pages/AdminSettingsPage.vue'

const admin: User = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'admin@institute.com',
  role: 'admin',
  created_at: '2026-11-26T10:00:00Z',
  full_name: 'مدیر مؤسسه',
}

const stored = {
  institute_name: 'آکادمی پارس',
  support_email: 'help@pars.example.com',
  default_class_duration: 60,
  min_cancellation_hours: 24,
  default_hourly_rate: 350000,
  currency: 'تومان',
  commission_rate: 15,
  enable_email_notifications: true,
  maintenance_mode: false,
}

async function mountPage() {
  setStoredToken('test-token')
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore(pinia).user = { ...admin }

  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push('/dashboard/admin/settings')
  await router.isReady()

  const wrapper = mount(AdminSettingsPage, { global: { plugins: [pinia, router] } })
  await settle()
  return wrapper
}

async function settle(): Promise<void> {
  for (let round = 0; round < 3; round += 1) {
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  await flushPromises()
}

function inputValue(wrapper: Awaited<ReturnType<typeof mountPage>>, testId: string): string {
  return (wrapper.get(`[data-test="${testId}"]`).element as HTMLInputElement).value
}

afterEach(() => {
  clearStoredToken()
  vi.restoreAllMocks()
})

describe('AdminSettingsPage tabs', () => {
  it('opens on the academic tab with the institute fields', async () => {
    vi.spyOn(http, 'get').mockResolvedValue(stored)
    const wrapper = await mountPage()

    expect(wrapper.get('[data-test="settings-tab-academic"]').attributes('aria-selected')).toBe(
      'true',
    )
    expect(wrapper.get('[data-test="settings-tab-academic"]').text()).toContain('آموزشی')
    expect(wrapper.find('[data-test="settings-panel-academic"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="settings-panel-financial"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="settings-panel-system"]').exists()).toBe(false)

    expect(inputValue(wrapper, 'institute-name')).toBe(stored.institute_name)
    expect(inputValue(wrapper, 'support-email')).toBe(stored.support_email)
    expect(inputValue(wrapper, 'class-duration')).toBe(String(stored.default_class_duration))
    expect(inputValue(wrapper, 'cancellation-hours')).toBe(String(stored.min_cancellation_hours))
  })

  it('switches to the financial tab and shows the loaded money settings', async () => {
    vi.spyOn(http, 'get').mockResolvedValue(stored)
    const wrapper = await mountPage()

    await wrapper.get('[data-test="settings-tab-financial"]').trigger('click')

    expect(wrapper.get('[data-test="settings-tab-financial"]').attributes('aria-selected')).toBe(
      'true',
    )
    expect(wrapper.find('[data-test="settings-panel-academic"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="settings-panel-financial"]').exists()).toBe(true)

    expect(inputValue(wrapper, 'default-rate')).toBe(String(stored.default_hourly_rate))
    expect(inputValue(wrapper, 'currency')).toBe(stored.currency)
    expect(inputValue(wrapper, 'commission-rate')).toBe(String(stored.commission_rate))
  })

  it('switches to the system tab and shows both toggles in their loaded state', async () => {
    vi.spyOn(http, 'get').mockResolvedValue(stored)
    const wrapper = await mountPage()

    await wrapper.get('[data-test="settings-tab-system"]').trigger('click')

    expect(wrapper.find('[data-test="settings-panel-system"]').exists()).toBe(true)
    expect(
      (wrapper.get('[data-test="email-notifications-toggle"]').element as HTMLInputElement).checked,
    ).toBe(true)
    expect(
      (wrapper.get('[data-test="maintenance-toggle"]').element as HTMLInputElement).checked,
    ).toBe(false)
    expect(wrapper.find('[data-test="maintenance-warning"]').exists()).toBe(false)
  })

  it('warns on the system tab while maintenance mode is switched on', async () => {
    vi.spyOn(http, 'get').mockResolvedValue(stored)
    const wrapper = await mountPage()

    await wrapper.get('[data-test="settings-tab-system"]').trigger('click')
    await wrapper.get('[data-test="maintenance-toggle"]').setValue(true)

    expect(wrapper.get('[data-test="maintenance-warning"]').text()).toContain('حالت تعمیر')
  })

  it('keeps the admin identity out of the page', async () => {
    vi.spyOn(http, 'get').mockResolvedValue(stored)
    const wrapper = await mountPage()

    expect(wrapper.find('[data-test="admin-email"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="admin-role"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="settings-security-note"]').text()).toContain('پروفایل من')
  })
})

describe('AdminSettingsPage save', () => {
  it('sends every institute setting in one PUT request', async () => {
    vi.spyOn(http, 'get').mockResolvedValue(stored)
    const put = vi.spyOn(http, 'put').mockResolvedValue({
      ...stored,
      institute_name: 'آکادمی زبان پارس',
      commission_rate: 20,
      maintenance_mode: true,
    })

    const wrapper = await mountPage()

    await wrapper.get('[data-test="institute-name"]').setValue('آکادمی زبان پارس')
    await wrapper.get('[data-test="class-duration"]').setValue('90')
    await wrapper.get('[data-test="settings-tab-financial"]').trigger('click')
    await wrapper.get('[data-test="commission-rate"]').setValue('20')
    await wrapper.get('[data-test="settings-tab-system"]').trigger('click')
    await wrapper.get('[data-test="maintenance-toggle"]').setValue(true)
    await wrapper.get('[data-test="settings-form"]').trigger('submit')
    await settle()

    expect(put).toHaveBeenCalledWith('/api/v1/admin/settings', {
      institute_name: 'آکادمی زبان پارس',
      support_email: stored.support_email,
      default_class_duration: 90,
      min_cancellation_hours: stored.min_cancellation_hours,
      default_hourly_rate: stored.default_hourly_rate,
      currency: stored.currency,
      commission_rate: 20,
      enable_email_notifications: true,
      maintenance_mode: true,
    })
  })

  it('shows a success toast with the saved values and lets it be dismissed', async () => {
    vi.spyOn(http, 'get').mockResolvedValue(stored)
    vi.spyOn(http, 'put').mockResolvedValue({ ...stored, institute_name: 'آکادمی زبان پارس' })

    const wrapper = await mountPage()
    await wrapper.get('[data-test="institute-name"]').setValue('آکادمی زبان پارس')
    await wrapper.get('[data-test="settings-form"]').trigger('submit')
    await settle()

    const toast = wrapper.get('[data-test="settings-success"]')
    expect(toast.text()).toContain('ذخیره شد')
    expect(toast.classes()).toContain('toast-success')

    await wrapper.get('[data-test="settings-toast-close"]').trigger('click')
    expect(wrapper.find('[data-test="settings-success"]').exists()).toBe(false)
  })

  it('shows an error toast and keeps the edits when the save fails', async () => {
    vi.spyOn(http, 'get').mockResolvedValue(stored)
    vi.spyOn(http, 'put').mockRejectedValue(new Error('boom'))

    const wrapper = await mountPage()
    await wrapper.get('[data-test="institute-name"]').setValue('آکادمی زبان پارس')
    await wrapper.get('[data-test="settings-form"]').trigger('submit')
    await settle()

    const toast = wrapper.get('[data-test="settings-error"]')
    expect(toast.text()).toContain('ذخیره تنظیمات ناموفق بود')
    expect(toast.classes()).toContain('toast-error')
    expect(inputValue(wrapper, 'institute-name')).toBe('آکادمی زبان پارس')
  })

  it('does not call the API when the commission is out of range', async () => {
    vi.spyOn(http, 'get').mockResolvedValue(stored)
    const put = vi.spyOn(http, 'put').mockResolvedValue(stored)

    const wrapper = await mountPage()
    await wrapper.get('[data-test="settings-tab-financial"]').trigger('click')
    await wrapper.get('[data-test="commission-rate"]').setValue('120')
    await wrapper.get('[data-test="settings-form"]').trigger('submit')
    await settle()

    expect(put).not.toHaveBeenCalled()
    expect(wrapper.get('[data-test="commission-rate-error"]').text()).toContain('کمیسیون')
  })

  it('does not call the API when the institute name is empty', async () => {
    vi.spyOn(http, 'get').mockResolvedValue(stored)
    const put = vi.spyOn(http, 'put').mockResolvedValue(stored)

    const wrapper = await mountPage()
    await wrapper.get('[data-test="institute-name"]').setValue('   ')
    await wrapper.get('[data-test="settings-form"]').trigger('submit')
    await settle()

    expect(put).not.toHaveBeenCalled()
    expect(wrapper.get('[data-test="institute-name-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="settings-panel-academic"]').exists()).toBe(true)
  })
})
