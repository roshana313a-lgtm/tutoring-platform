// @vitest-environment happy-dom
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import type { User } from '../../src/features/auth/api/auth'
import { useAuthStore } from '../../src/features/auth/stores/useAuthStore'
import { clearStoredToken, http, setStoredToken } from '../../src/shared/api/http'
import { routes } from '../../src/router'
import DashboardLayout from '../../src/features/dashboard/components/DashboardLayout.vue'
import InstructorDiscoveryPage from '../../src/features/instructors/pages/InstructorDiscoveryPage.vue'
import InstructorDetailPage from '../../src/features/instructors/pages/InstructorDetailPage.vue'

const fa = (value: number) => new Intl.NumberFormat('fa-IR').format(value)

const student: User = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'student@example.com',
  role: 'student',
  created_at: '2026-11-26T10:00:00Z',
  full_name: 'زبان‌آموز نمونه',
}

const INSTRUCTOR_ID = '22222222-2222-4222-8222-222222222222'

const instructor = {
  id: INSTRUCTOR_ID,
  full_name: 'سارا کریمی',
  email: 'sara@example.com',
  short_summary: 'مدرس آیلتس با هشت سال تجربه',
  teaching_languages: ['انگلیسی', 'آلمانی'],
  hourly_rate: 500000,
  education_level: 'کارشناسی ارشد',
  avatar_url: '',
  average_rating: null,
}

const profile = {
  id: INSTRUCTOR_ID,
  full_name: instructor.full_name,
  avatar_url: '',
  short_summary: instructor.short_summary,
  bio: 'هشت سال تجربه تدریس آیلتس و مکالمه.',
  teaching_languages: instructor.teaching_languages,
  hourly_rate: instructor.hourly_rate,
  average_rating: null,
  years_of_experience: 8,
  education_level: instructor.education_level,
}

const calls: string[] = []

function mockApi(list: unknown = [instructor], detail: unknown = profile) {
  calls.length = 0
  vi.spyOn(http, 'get').mockImplementation((url: string) => {
    calls.push(url)
    if (url.startsWith('/api/v1/instructors/')) return Promise.resolve(detail)
    if (url.startsWith('/api/v1/instructors')) return Promise.resolve(list)
    return Promise.reject(new Error(`unexpected url: ${url}`))
  })
}

async function settle(): Promise<void> {
  for (let round = 0; round < 3; round += 1) {
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  await flushPromises()
}

async function mountAt<P>(component: P, path: string) {
  setStoredToken('test-token')
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore(pinia).user = { ...student }

  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push(path)
  await router.isReady()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrapper = mount(component as any, { global: { plugins: [pinia, router] } })
  await settle()
  return wrapper
}

function lastQuery(): URLSearchParams {
  const url = calls.at(-1) ?? ''
  return new URL(url, 'http://localhost').searchParams
}

afterEach(() => {
  clearStoredToken()
  vi.restoreAllMocks()
})

describe('InstructorDiscoveryPage', () => {
  it('renders a card per instructor with name, languages, rate and summary', async () => {
    mockApi()

    const wrapper = await mountAt(InstructorDiscoveryPage, '/dashboard/student/discover')

    const card = wrapper.get('[data-test="instructor-card"]')
    expect(card.get('[data-test="instructor-name"]').text()).toBe('سارا کریمی')
    expect(
      card.findAll('[data-test="instructor-language"]').map((chip) => chip.text()),
    ).toEqual(['انگلیسی', 'آلمانی'])
    expect(card.get('[data-test="instructor-rate"]').text()).toBe(`${fa(500000)} تومان / ساعت`)
    expect(card.get('[data-test="instructor-summary"]').text()).toBe(
      'مدرس آیلتس با هشت سال تجربه',
    )
    expect(card.get('[data-test="instructor-profile-link"]').attributes('href')).toBe(
      `/dashboard/student/discover/${INSTRUCTOR_ID}`,
    )
    expect(card.get('[data-test="instructor-profile-link"]').text()).toBe('مشاهده پروفایل')
  })

  it('falls back to the initial when the instructor has no avatar', async () => {
    mockApi()

    const wrapper = await mountAt(InstructorDiscoveryPage, '/dashboard/student/discover')

    expect(wrapper.get('[data-test="instructor-avatar"]').text()).toBe('س')
  })

  it('sends the search term to the API', async () => {
    mockApi()

    const wrapper = await mountAt(InstructorDiscoveryPage, '/dashboard/student/discover')
    await wrapper.get('[data-test="discovery-search"]').setValue('سارا')
    await wrapper.get('[data-test="discovery-filters"]').trigger('submit')
    await settle()

    expect(lastQuery().get('search')).toBe('سارا')
  })

  it('sends the max price filter to the API', async () => {
    mockApi()

    const wrapper = await mountAt(InstructorDiscoveryPage, '/dashboard/student/discover')
    await wrapper.get('[data-test="max-price"]').setValue('300000')
    await wrapper.get('[data-test="discovery-filters"]').trigger('submit')
    await settle()

    expect(lastQuery().get('max_price')).toBe('300000')
    expect(lastQuery().get('search')).toBeNull()
  })

  it('shows an empty state when nothing matches', async () => {
    mockApi([])

    const wrapper = await mountAt(InstructorDiscoveryPage, '/dashboard/student/discover')

    expect(wrapper.find('[data-test="instructor-card"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="discovery-empty"]').text()).toContain(
      'مدرسی با این مشخصات پیدا نشد',
    )
  })

  it('points the student sidebar item at the discovery page', async () => {
    mockApi()

    const wrapper = await mountAt(DashboardLayout, '/dashboard/student')

    const link = wrapper
      .findAll('[data-test="sidebar-link"]')
      .find((item) => item.text().trim() === 'جستجوی مدرس')
    expect(link?.attributes('href')).toBe('/dashboard/student/discover')
  })

  it('redirects the legacy instructor-search path to discovery', async () => {
    mockApi()

    setStoredToken('test-token')
    const pinia = createPinia()
    setActivePinia(pinia)
    useAuthStore(pinia).user = { ...student }
    const router = createRouter({ history: createMemoryHistory(), routes })

    await router.push('/dashboard/instructor-search')
    await router.isReady()

    expect(router.currentRoute.value.path).toBe('/dashboard/student/discover')
  })
})

describe('InstructorDetailPage', () => {
  it('renders the full profile with a placeholder booking button', async () => {
    mockApi()

    const wrapper = await mountAt(
      InstructorDetailPage,
      `/dashboard/student/discover/${INSTRUCTOR_ID}`,
    )

    expect(calls.at(-1)).toBe(`/api/v1/instructors/${INSTRUCTOR_ID}`)
    expect(wrapper.get('[data-test="profile-name"]').text()).toBe('سارا کریمی')
    expect(wrapper.get('[data-test="profile-bio"]').text()).toBe(
      'هشت سال تجربه تدریس آیلتس و مکالمه.',
    )
    expect(
      wrapper.findAll('[data-test="profile-language"]').map((chip) => chip.text()),
    ).toEqual(['انگلیسی', 'آلمانی'])
    expect(wrapper.get('[data-test="profile-rate"]').text()).toBe(
      `${fa(500000)} تومان / ساعت`,
    )
    expect(wrapper.get('[data-test="profile-experience"]').text()).toContain('۸')
    expect(wrapper.get('[data-test="profile-rating"]').text()).toBe('بدون امتیاز')

    const bookButton = wrapper.get('[data-test="book-class"]')
    expect(bookButton.text()).toBe('رزرو کلاس')
  })

  it('shows an error when the instructor is not discoverable', async () => {
    mockApi()
    vi.spyOn(http, 'get').mockRejectedValue(new Error('not found'))

    const wrapper = await mountAt(
      InstructorDetailPage,
      `/dashboard/student/discover/${INSTRUCTOR_ID}`,
    )

    expect(wrapper.get('[data-test="profile-error"]').exists()).toBe(true)
  })
})
