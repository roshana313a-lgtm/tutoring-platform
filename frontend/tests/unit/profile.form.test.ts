// @vitest-environment happy-dom
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  updateProfile: vi.fn(),
}))

vi.mock('../../src/features/auth/api/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/features/auth/api/auth')>()
  return { ...actual, updateProfile: mocks.updateProfile }
})

import { useAuthStore } from '../../src/features/auth/stores/useAuthStore'
import type { User } from '../../src/features/auth/api/auth'
import ProfileSettingsPage from '../../src/features/profile/pages/ProfileSettingsPage.vue'

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

async function mountPage(user: User) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore(pinia)
  auth.user = user

  mocks.updateProfile.mockResolvedValue({
    ...user,
    full_name: user.full_name || 'تست کاربر',
  })

  const wrapper = mount(ProfileSettingsPage, { global: { plugins: [pinia] } })
  await settle()
  return { wrapper, updateProfile: mocks.updateProfile, auth }
}

// vee-validate schedules field validation on a timer, so microtasks alone are not enough.
async function settle(): Promise<void> {
  await flushPromises()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await flushPromises()
}

beforeEach(() => {
  mocks.updateProfile.mockReset()
})

describe('ProfileSettingsPage', () => {
  it('renders the common fields with Persian labels for a student', async () => {
    const { wrapper } = await mountPage(makeUser())

    expect(wrapper.text()).toContain('نام و نام خانوادگی')
    expect(wrapper.text()).toContain('شماره تماس')
    expect(wrapper.text()).toContain('عکس پروفایل')
    expect(wrapper.find('[data-test="full-name"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="phone"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="avatar-upload"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="bio"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="years"]').exists()).toBe(false)
  })

  it('renders bio and experience for an instructor', async () => {
    const { wrapper } = await mountPage(makeUser({ role: 'instructor' }))

    expect(wrapper.text()).toContain('بیوگرافی')
    expect(wrapper.text()).toContain('سابقه تدریس')
    expect(wrapper.find('[data-test="bio"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="years"]').exists()).toBe(true)
  })

  it('prefills the form from the current user', async () => {
    const { wrapper } = await mountPage(
      makeUser({
        full_name: 'علی احمدی',
        phone_number: '+989121234567',
        avatar_url: 'https://example.com/ali.png',
        bio: 'مدرس زبان',
        years_of_experience: 6,
        role: 'instructor',
      }),
    )

    expect((wrapper.get('[data-test="full-name"]').element as HTMLInputElement).value).toBe(
      'علی احمدی',
    )
    expect((wrapper.get('[data-test="phone"]').element as HTMLInputElement).value).toBe(
      '+989121234567',
    )
    expect((wrapper.get('[data-test="bio"]').element as HTMLTextAreaElement).value).toBe(
      'مدرس زبان',
    )
    expect((wrapper.get('[data-test="years"]').element as HTMLInputElement).value).toBe('6')
  })

  it('submits the profile payload through the auth store', async () => {
    const { wrapper, updateProfile } = await mountPage(makeUser({ role: 'instructor' }))

    await wrapper.get('[data-test="full-name"]').setValue('سارا کریمی')
    await wrapper.get('[data-test="phone"]').setValue('+989120000000')
    await wrapper.get('[data-test="bio"]').setValue('مدرس ریاضی')
    await wrapper.get('[data-test="years"]').setValue('4')
    await wrapper.get('form').trigger('submit')
    await settle()

    expect(updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        full_name: 'سارا کریمی',
        phone_number: '+989120000000',
        bio: 'مدرس ریاضی',
        years_of_experience: 4,
      }),
    )
  })

  it('blocks submission when the full name is empty', async () => {
    const { wrapper, updateProfile } = await mountPage(makeUser())

    await wrapper.get('form').trigger('submit')
    await settle()

    expect(updateProfile).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('لطفاً نام و نام خانوادگی خود را وارد کنید')
  })

  it('shows an error message when saving fails', async () => {
    const { wrapper, updateProfile } = await mountPage(makeUser())
    updateProfile.mockRejectedValue(new Error('ذخیره نشد'))

    await wrapper.get('[data-test="full-name"]').setValue('رضا محمدی')
    await wrapper.get('form').trigger('submit')
    await settle()

    expect(wrapper.text()).toContain('خطا در ذخیره اطلاعات پروفایل')
  })
})
