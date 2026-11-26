// @vitest-environment happy-dom
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import type { User } from '../../src/features/auth/api/auth'
import { useAuthStore } from '../../src/features/auth/stores/useAuthStore'
import { routes } from '../../src/router'
import DashboardLayout from '../../src/features/dashboard/components/DashboardLayout.vue'
import DashboardPage from '../../src/features/dashboard/pages/DashboardPage.vue'

const BANNER_TEXT = 'لطفاً برای تکمیل حساب خود، اطلاعات پروفایل خود را وارد کنید.'

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'student@example.com',
    role: 'student',
    created_at: '2026-11-24T10:00:00Z',
    full_name: '',
    phone_number: '',
    avatar_url: '',
    timezone: 'Asia/Tehran',
    bio: '',
    years_of_experience: 0,
    current_level: '',
    ...overrides,
  }
}

async function mountWithUser(component: typeof DashboardLayout | typeof DashboardPage, user: User) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore(pinia)
  auth.user = user

  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push('/dashboard')
  await router.isReady()

  const wrapper = mount(component, {
    global: {
      plugins: [pinia, router],
      stubs: { RouterView: true },
    },
  })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  localStorage.clear()
})

describe('profile data display', () => {
  it('shows the full name in the top bar when available', async () => {
    const wrapper = await mountWithUser(
      DashboardLayout,
      makeUser({ full_name: 'علی احمدی', email: 'ali@example.com' }),
    )

    expect(wrapper.get('[data-test="topbar-user"]').text()).toContain('علی احمدی')
    expect(wrapper.get('[data-test="topbar-user"]').text()).not.toContain('ali@example.com')
  })

  it('falls back to the email local part in the top bar', async () => {
    const wrapper = await mountWithUser(DashboardLayout, makeUser({ email: 'ali@example.com' }))

    expect(wrapper.get('[data-test="topbar-user"]').text()).toContain('ali')
    expect(wrapper.get('[data-test="topbar-user"]').text()).not.toContain('@example.com')
  })

  it('greets the user by full name', async () => {
    const wrapper = await mountWithUser(DashboardPage, makeUser({ full_name: 'سارا کریمی' }))

    expect(wrapper.text()).toContain('خوش آمدید، سارا کریمی')
    expect(wrapper.find('[data-test="onboarding-banner"]').exists()).toBe(false)
  })

  it('falls back to the email local part in the greeting', async () => {
    const wrapper = await mountWithUser(DashboardPage, makeUser({ email: 'sara@example.com' }))

    expect(wrapper.text()).toContain('خوش آمدید، sara')
  })

  it('shows the onboarding banner with a profile link for an empty full name', async () => {
    const wrapper = await mountWithUser(DashboardPage, makeUser())

    const banner = wrapper.get('[data-test="onboarding-banner"]')
    expect(banner.text()).toContain(BANNER_TEXT)
    expect(banner.get('a').attributes('href')).toBe('/profile')
  })
})
