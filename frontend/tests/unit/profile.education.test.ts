// @vitest-environment happy-dom
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '../../src/features/auth/stores/useAuthStore'
import type { ProfileUpdatePayload, User } from '../../src/features/auth/api/auth'
import ProfilePage from '../../src/features/profile/pages/ProfilePage.vue'

const EDUCATION_LEVELS = ['دیپلم', 'کارشناسی', 'کارشناسی ارشد', 'دکتری']

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'instructor@example.com',
    role: 'instructor',
    created_at: '2026-11-26T10:00:00Z',
    full_name: 'سارا کریمی',
    phone_number: '+989121234567',
    avatar_url: '',
    hourly_rate: 250000,
    short_summary: 'مدرس آیلتس',
    teaching_languages: ['انگلیسی'],
    education_level: '',
    ...overrides,
  }
}

async function mountPage(user: User) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore(pinia)
  auth.user = user

  const updateProfile = vi
    .spyOn(auth, 'updateProfile')
    .mockImplementation(async (payload: ProfileUpdatePayload) => ({ ...user, ...payload }))

  const wrapper = mount(ProfilePage, { global: { plugins: [pinia] } })
  await settle()
  return { wrapper, updateProfile }
}

// vee-validate schedules field validation on timers, so microtasks alone are not enough.
async function settle(): Promise<void> {
  for (let round = 0; round < 3; round += 1) {
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  await flushPromises()
}

function options(wrapper: Awaited<ReturnType<typeof mountPage>>['wrapper']): string[] {
  return wrapper
    .findAll('[data-test="education-level"] option')
    .map((option) => option.attributes('value') ?? '')
    .filter((value) => value !== '')
}

beforeEach(() => {
  localStorage.clear()
})

describe('ProfilePage education level', () => {
  it('renders the four education levels for an instructor', async () => {
    const { wrapper } = await mountPage(makeUser())

    expect(wrapper.find('[data-test="instructor-section"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('سطح تحصیلات')
    expect(wrapper.find('[data-test="education-level"]').exists()).toBe(true)
    expect(options(wrapper)).toEqual(EDUCATION_LEVELS)
  })

  it('is not rendered for a student', async () => {
    const { wrapper } = await mountPage(makeUser({ role: 'student' }))

    expect(wrapper.find('[data-test="education-level"]').exists()).toBe(false)
  })

  it('prefills the stored education level', async () => {
    const { wrapper } = await mountPage(makeUser({ education_level: 'کارشناسی ارشد' }))

    expect(
      (wrapper.get('[data-test="education-level"]').element as HTMLSelectElement).value,
    ).toBe('کارشناسی ارشد')
  })

  it('sends the selected education level in the payload', async () => {
    const { wrapper, updateProfile } = await mountPage(makeUser())

    await wrapper.get('[data-test="education-level"]').setValue('دکتری')
    await wrapper.get('form').trigger('submit')
    await settle()

    expect(updateProfile).toHaveBeenCalledTimes(1)
    const payload = updateProfile.mock.calls[0]?.[0] as Record<string, unknown>
    expect(payload).toMatchObject({
      full_name: 'سارا کریمی',
      education_level: 'دکتری',
      hourly_rate: 250000,
      teaching_languages: ['انگلیسی'],
    })
    expect(wrapper.text()).toContain('اطلاعات پروفایل با موفقیت ذخیره شد.')
  })
})
