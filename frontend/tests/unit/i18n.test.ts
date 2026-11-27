// @vitest-environment happy-dom
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import type { User } from '../../src/features/auth/api/auth'
import { useAuthStore } from '../../src/features/auth/stores/useAuthStore'
import DashboardLayout from '../../src/features/dashboard/components/DashboardLayout.vue'
import { getStoredLocale, LOCALE_STORAGE_KEY, setAppLocale } from '../../src/i18n'
import { routes } from '../../src/router'
import { clearStoredToken, setStoredToken } from '../../src/shared/api/http'

const admin: User = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'admin@institute.com',
  role: 'admin',
  created_at: '2026-11-26T10:00:00Z',
  full_name: 'مدیر مؤسسه',
}

async function mountLayout() {
  setStoredToken('test-token')
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore(pinia).user = { ...admin }

  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push('/dashboard/admin')
  await router.isReady()

  const wrapper = mount(DashboardLayout, {
    global: { plugins: [pinia, router], stubs: { RouterView: true } },
  })
  await flushPromises()
  return wrapper
}

function sidebarLabels(wrapper: Awaited<ReturnType<typeof mountLayout>>): string[] {
  return wrapper.findAll('[data-test="sidebar-link"]').map((link) => link.text().trim())
}

afterEach(() => {
  setAppLocale('fa')
  clearStoredToken()
})

describe('language switcher', () => {
  it('starts in Persian with an RTL document', async () => {
    const wrapper = await mountLayout()

    expect(document.documentElement.getAttribute('dir')).toBe('rtl')
    expect(document.documentElement.getAttribute('lang')).toBe('fa')
    expect(sidebarLabels(wrapper)).toContain('مدیریت مدرسان')
    expect(wrapper.get('[data-test="language-select"]').element.value).toBe('fa')
  })

  it('switches the document to LTR English and persists the choice', async () => {
    const wrapper = await mountLayout()

    await wrapper.get('[data-test="language-select"]').setValue('en')
    await flushPromises()

    expect(document.documentElement.getAttribute('dir')).toBe('ltr')
    expect(document.documentElement.getAttribute('lang')).toBe('en')
    expect(document.documentElement.dataset.locale).toBe('en')
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en')

    expect(sidebarLabels(wrapper)).toEqual([
      'Dashboard',
      'Manage instructors',
      'Manage users',
      'Service quality',
      'Complaints & support',
      'Settings',
      'My profile',
    ])
    expect(wrapper.get('[data-test="logout"]').text()).toBe('Sign out')
    expect(wrapper.text()).not.toContain('مدیریت مدرسان')
  })

  it('switches back to Persian RTL', async () => {
    const wrapper = await mountLayout()

    await wrapper.get('[data-test="language-select"]').setValue('en')
    await flushPromises()
    await wrapper.get('[data-test="language-select"]').setValue('fa')
    await flushPromises()

    expect(document.documentElement.getAttribute('dir')).toBe('rtl')
    expect(document.documentElement.getAttribute('lang')).toBe('fa')
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('fa')
    expect(sidebarLabels(wrapper)).toContain('مدیریت مدرسان')
  })

  it('loads a stored preference and falls back to Persian for unknown values', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en')
    expect(getStoredLocale()).toBe('en')

    localStorage.setItem(LOCALE_STORAGE_KEY, 'de')
    expect(getStoredLocale()).toBe('fa')

    localStorage.removeItem(LOCALE_STORAGE_KEY)
    expect(getStoredLocale()).toBe('fa')
  })
})
