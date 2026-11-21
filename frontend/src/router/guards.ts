import type { NavigationGuardWithThis } from 'vue-router'

import { useAuthStore } from '../features/auth/stores/useAuthStore'

export const authGuard: NavigationGuardWithThis<undefined> = (to, _from, next) => {
  const auth = useAuthStore()

  if (!auth.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  next()
}
