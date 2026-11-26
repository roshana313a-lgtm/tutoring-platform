// @vitest-environment happy-dom
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import type { User } from '../../src/features/auth/api/auth'
import { useAuthStore } from '../../src/features/auth/stores/useAuthStore'
import { routes } from '../../src/router'
import DashboardLayout from '../../src/features/dashboard/components/DashboardLayout.vue'

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

async function mountWithUser(component: typeof DashboardLayout, user: User) {
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

  it('shows the uploaded avatar in the top bar', async () => {
    const wrapper = await mountWithUser(
      DashboardLayout,
      makeUser({ full_name: 'علی احمدی', avatar_url: '/media/avatars/abc.png' }),
    )

    expect(wrapper.get('[data-test="topbar-avatar"] img').attributes('src')).toBe(
      '/media/avatars/abc.png',
    )
  })

  it('falls back to the avatar initial when no avatar is stored', async () => {
    const wrapper = await mountWithUser(DashboardLayout, makeUser({ full_name: 'علی احمدی' }))

    const avatar = wrapper.get('[data-test="topbar-avatar"]')
    expect(avatar.find('img').exists()).toBe(false)
    expect(avatar.text()).toBe('ع')
  })

  it('re-renders the top bar avatar after the store receives a new url', async () => {
    const wrapper = await mountWithUser(DashboardLayout, makeUser({ full_name: 'علی احمدی' }))
    expect(wrapper.find('[data-test="topbar-avatar"] img').exists()).toBe(false)

    const auth = useAuthStore()
    auth.setAvatar('/media/avatars/after-upload.png')
    await flushPromises()

    expect(wrapper.get('[data-test="topbar-avatar"] img').attributes('src')).toBe(
      '/media/avatars/after-upload.png',
    )
  })

})
