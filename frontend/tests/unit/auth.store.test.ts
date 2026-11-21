import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/features/auth/api/auth', () => ({
  register: vi.fn(),
  login: vi.fn(),
  fetchCurrentUser: vi.fn(),
}))

import { fetchCurrentUser, login, register } from '../../src/features/auth/api/auth'
import { useAuthStore } from '../../src/features/auth/stores/useAuthStore'
import { clearStoredToken, getStoredToken } from '../../src/shared/api/http'

const user = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'instructor@example.com',
  role: 'instructor',
  created_at: '2026-11-21T10:00:00Z',
}

beforeEach(() => {
  setActivePinia(createPinia())
  clearStoredToken()
  vi.mocked(register).mockReset()
  vi.mocked(login).mockReset()
  vi.mocked(fetchCurrentUser).mockReset()
})

describe('useAuthStore', () => {
  it('stores token and user after registration', async () => {
    vi.mocked(register).mockResolvedValue({ token: 'register-token', user })

    const store = useAuthStore()
    await store.register({
      email: user.email,
      password: 'longenough',
      role: 'instructor',
    })

    expect(store.user).toEqual(user)
    expect(store.token).toBe('register-token')
    expect(store.isAuthenticated).toBe(true)
    expect(getStoredToken()).toBe('register-token')
  })

  it('stores token and user after login', async () => {
    vi.mocked(login).mockResolvedValue({ token: 'login-token', user })

    const store = useAuthStore()
    await store.login({ email: user.email, password: 'longenough' })

    expect(store.user).toEqual(user)
    expect(store.token).toBe('login-token')
    expect(store.isAuthenticated).toBe(true)
    expect(getStoredToken()).toBe('login-token')
  })

  it('clears token and user on logout', async () => {
    vi.mocked(login).mockResolvedValue({ token: 'login-token', user })

    const store = useAuthStore()
    await store.login({ email: user.email, password: 'longenough' })
    store.logout()

    expect(store.user).toBeNull()
    expect(store.token).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(getStoredToken()).toBeNull()
  })

  it('hydrates the user on boot when a token is stored', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(user)
    const { setStoredToken } = await import('../../src/shared/api/http')
    setStoredToken('existing-token')

    const store = useAuthStore()
    await store.hydrate()

    expect(fetchCurrentUser).toHaveBeenCalledOnce()
    expect(store.user).toEqual(user)
    expect(store.token).toBe('existing-token')
    expect(store.isAuthenticated).toBe(true)
  })
})
