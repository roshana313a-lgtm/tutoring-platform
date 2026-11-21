import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'

import { authGuard } from '../../src/router/guards'
import { clearStoredToken, setStoredToken } from '../../src/shared/api/http'

const DashboardView = { render: () => null }
const LoginView = { render: () => null }

function createTestRouter() {
  const routes: RouteRecordRaw[] = [
    { path: '/login', name: 'login', component: LoginView },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
      beforeEnter: authGuard,
    },
  ]

  return createRouter({ history: createMemoryHistory(), routes })
}

beforeEach(() => {
  setActivePinia(createPinia())
  clearStoredToken()
})

describe('authGuard', () => {
  it('redirects unauthenticated users to login with a redirect query', async () => {
    const router = createTestRouter()

    await router.push('/dashboard')

    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/dashboard')
  })

  it('allows authenticated users to reach the dashboard', async () => {
    setStoredToken('test-token')
    const router = createTestRouter()

    await router.push('/dashboard')

    expect(router.currentRoute.value.path).toBe('/dashboard')
  })
})
