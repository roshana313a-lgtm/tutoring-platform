// @vitest-environment happy-dom
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '../../src/features/auth/stores/useAuthStore'
import type { ProfileUpdatePayload, User } from '../../src/features/auth/api/auth'
import { http } from '../../src/shared/api/http'
import ProfilePage from '../../src/features/profile/pages/ProfilePage.vue'

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'student@example.com',
    role: 'student',
    created_at: '2026-11-26T10:00:00Z',
    full_name: 'علی احمدی',
    phone_number: '+989121234567',
    avatar_url: '',
    current_level: 'beginner',
    learning_goal: '',
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
  const uploadRequest = vi
    .spyOn(http, 'post')
    .mockResolvedValue({ avatar_url: '/media/avatars/new-avatar.png' })

  const wrapper = mount(ProfilePage, { global: { plugins: [pinia] } })
  await settle()
  return { wrapper, auth, updateProfile, uploadRequest }
}

// vee-validate schedules field validation on timers, so microtasks alone are not enough.
async function settle(): Promise<void> {
  for (let round = 0; round < 3; round += 1) {
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  await flushPromises()
}

function imageFile(): File {
  return new File([new Uint8Array([137, 80, 78, 71])], 'avatar.png', { type: 'image/png' })
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ProfilePage role-specific rendering', () => {
  it('renders common and student fields for a student', async () => {
    const { wrapper } = await mountPage(makeUser({ role: 'student' }))

    expect(wrapper.find('[data-test="full-name"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="phone"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="avatar-upload"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('سطح زبان')
    expect(wrapper.text()).toContain('هدف یادگیری')
    expect(wrapper.find('[data-test="current-level"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="learning-goal"]').exists()).toBe(true)

    expect(wrapper.find('[data-test="hourly-rate"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="teaching-languages"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="short-summary"]').exists()).toBe(false)
  })

  it('renders instructor fields with a 200 character summary limit', async () => {
    const { wrapper } = await mountPage(makeUser({ role: 'instructor' }))

    expect(wrapper.text()).toContain('قیمت هر ساعت (تومان)')
    expect(wrapper.text()).toContain('زبان‌های تدریس')
    expect(wrapper.text()).toContain('خلاصه رزومه')
    expect(wrapper.find('[data-test="hourly-rate"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="teaching-languages"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="short-summary"]').attributes('maxlength')).toBe('200')

    expect(wrapper.find('[data-test="current-level"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="learning-goal"]').exists()).toBe(false)
  })

  it('renders only common fields for an admin', async () => {
    const { wrapper } = await mountPage(makeUser({ role: 'admin' }))

    expect(wrapper.find('[data-test="full-name"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="phone"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="avatar-upload"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="student-section"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="instructor-section"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="current-level"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="short-summary"]').exists()).toBe(false)
  })

  it('prefills role-specific values from the user', async () => {
    const { wrapper } = await mountPage(
      makeUser({
        role: 'instructor',
        hourly_rate: 250000,
        short_summary: 'مدرس زبان',
        teaching_languages: ['انگلیسی'],
      }),
    )

    expect((wrapper.get('[data-test="hourly-rate"]').element as HTMLInputElement).value).toBe(
      '250000',
    )
    expect((wrapper.get('[data-test="short-summary"]').element as HTMLTextAreaElement).value).toBe(
      'مدرس زبان',
    )
    expect(
      (wrapper.findAll('[data-test="language-option"]')[0]?.element as HTMLInputElement).checked,
    ).toBe(true)
    expect(wrapper.get('[data-test="summary-counter"]').text()).toContain('9 / 200')
  })
})

describe('ProfilePage avatar upload', () => {
  it('shows the stored avatar as the preview', async () => {
    const { wrapper } = await mountPage(makeUser({ avatar_url: '/media/avatars/existing.png' }))

    expect(wrapper.get('[data-test="avatar-preview"]').attributes('src')).toBe(
      '/media/avatars/existing.png',
    )
  })

  it('uploads the selected file and previews the returned url', async () => {
    const { wrapper, uploadRequest } = await mountPage(makeUser())
    const file = imageFile()
    const input = wrapper.get('[data-test="avatar-upload"]')
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })

    await input.trigger('change')
    await settle()

    expect(uploadRequest).toHaveBeenCalledTimes(1)
    const [url, body] = uploadRequest.mock.calls[0] ?? []
    expect(url).toBe('/api/v1/uploads/avatar')
    expect((body as FormData).get('file')).toBe(file)
    expect(wrapper.get('[data-test="avatar-preview"]').attributes('src')).toBe(
      '/media/avatars/new-avatar.png',
    )
  })

  it('updates the auth store so the avatar renders immediately', async () => {
    const { wrapper, auth } = await mountPage(makeUser())
    const input = wrapper.get('[data-test="avatar-upload"]')
    Object.defineProperty(input.element, 'files', { value: [imageFile()], configurable: true })

    expect(auth.user?.avatar_url).toBe('')
    expect(wrapper.find('[data-test="avatar-preview"]').exists()).toBe(false)

    await input.trigger('change')
    await settle()

    expect(auth.user?.avatar_url).toBe('/media/avatars/new-avatar.png')
    const preview = wrapper.get('[data-test="avatar-preview"]')
    expect(preview.attributes('src')).toBe('/media/avatars/new-avatar.png')
  })

  it('keeps unsaved form edits when the avatar updates the store', async () => {
    const { wrapper } = await mountPage(makeUser())
    await wrapper.get('[data-test="learning-goal"]').setValue('آماده‌سازی آیلتس')

    const input = wrapper.get('[data-test="avatar-upload"]')
    Object.defineProperty(input.element, 'files', { value: [imageFile()], configurable: true })
    await input.trigger('change')
    await settle()

    expect((wrapper.get('[data-test="learning-goal"]').element as HTMLInputElement).value).toBe(
      'آماده‌سازی آیلتس',
    )
  })

  it('reports an upload failure without submitting', async () => {
    const { wrapper, uploadRequest, updateProfile } = await mountPage(makeUser())
    uploadRequest.mockRejectedValue(new Error('boom'))
    const input = wrapper.get('[data-test="avatar-upload"]')
    Object.defineProperty(input.element, 'files', { value: [imageFile()], configurable: true })

    await input.trigger('change')
    await settle()

    expect(wrapper.get('[data-test="avatar-error"]').text()).toContain('آپلود تصویر ناموفق بود')
    expect(updateProfile).not.toHaveBeenCalled()
  })
})

describe('ProfilePage submission', () => {
  it('sends only the student fields for a student', async () => {
    const { wrapper, updateProfile } = await mountPage(makeUser({ role: 'student' }))

    await wrapper.get('[data-test="learning-goal"]').setValue('آماده‌سازی آیلتس')
    await wrapper.get('[data-test="current-level"]').setValue('intermediate')
    await wrapper.get('form').trigger('submit')
    await settle()

    expect(updateProfile).toHaveBeenCalledTimes(1)
    const payload = updateProfile.mock.calls[0]?.[0] as Record<string, unknown>
    expect(payload).toMatchObject({
      full_name: 'علی احمدی',
      phone_number: '+989121234567',
      current_level: 'intermediate',
      learning_goal: 'آماده‌سازی آیلتس',
    })
    expect(payload).not.toHaveProperty('hourly_rate')
    expect(payload).not.toHaveProperty('short_summary')
    expect(payload).not.toHaveProperty('teaching_languages')
    expect(wrapper.text()).toContain('اطلاعات پروفایل با موفقیت ذخیره شد.')
  })

  it('sends only the instructor fields for an instructor', async () => {
    const { wrapper, updateProfile } = await mountPage(makeUser({ role: 'instructor' }))

    await wrapper.get('[data-test="hourly-rate"]').setValue('300000')
    await wrapper.get('[data-test="short-summary"]').setValue('مدرس ریاضی')
    await wrapper.findAll('[data-test="language-option"]')[0]?.setValue(true)
    await wrapper.get('form').trigger('submit')
    await settle()

    expect(updateProfile).toHaveBeenCalledTimes(1)
    const payload = updateProfile.mock.calls[0]?.[0] as Record<string, unknown>
    expect(payload).toMatchObject({
      hourly_rate: 300000,
      short_summary: 'مدرس ریاضی',
      teaching_languages: ['انگلیسی'],
    })
    expect(payload).not.toHaveProperty('current_level')
    expect(payload).not.toHaveProperty('learning_goal')
  })

  it('blocks submission when the full name is empty', async () => {
    const { wrapper, updateProfile } = await mountPage(makeUser({ full_name: '' }))

    await wrapper.get('form').trigger('submit')
    await settle()

    expect(updateProfile).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('لطفاً نام و نام خانوادگی خود را وارد کنید')
  })
})
