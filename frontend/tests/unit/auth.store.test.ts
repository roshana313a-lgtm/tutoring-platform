import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '../../src/features/auth/stores/useAuthStore'
import { clearStoredToken, getStoredToken, http } from '../../src/shared/api/http'

const user = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'instructor@example.com',
  role: 'instructor',
  created_at: '2026-11-21T10:00:00Z',
}

// The auth API is a thin wrapper over `http`, so stubbing the client exercises the
// same store code without depending on module-mock interop.
beforeEach(() => {
  setActivePinia(createPinia())
  clearStoredToken()
  vi.restoreAllMocks()
})

describe('useAuthStore', () => {
  it('stores token and user after registration', async () => {
    vi.spyOn(http, 'post').mockResolvedValue({
      user,
      access_token: 'register-token',
      token_type: 'bearer',
    })

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
    vi.spyOn(http, 'post').mockResolvedValue({
      user,
      access_token: 'login-token',
      token_type: 'bearer',
    })

    const store = useAuthStore()
    await store.login({ email: user.email, password: 'longenough' })

    expect(store.user).toEqual(user)
    expect(store.token).toBe('login-token')
    expect(store.isAuthenticated).toBe(true)
    expect(getStoredToken()).toBe('login-token')
  })

  it('clears token and user on logout', async () => {
    vi.spyOn(http, 'post').mockResolvedValue({
      user,
      access_token: 'login-token',
      token_type: 'bearer',
    })

    const store = useAuthStore()
    await store.login({ email: user.email, password: 'longenough' })
    store.logout()

    expect(store.user).toBeNull()
    expect(store.token).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(getStoredToken()).toBeNull()
  })

  it('hydrates the user on boot when a token is stored', async () => {
    vi.spyOn(http, 'get').mockResolvedValue(user)
    const { setStoredToken } = await import('../../src/shared/api/http')
    setStoredToken('existing-token')

    const store = useAuthStore()
    await store.hydrate()

    expect(http.get).toHaveBeenCalledTimes(1)
    expect(store.user).toEqual(user)
    expect(store.token).toBe('existing-token')
    expect(store.isAuthenticated).toBe(true)
  })
})
