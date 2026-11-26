import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import {
  fetchCurrentUser,
  login as apiLogin,
  register as apiRegister,
  updateProfile as apiUpdateProfile,
  type LoginPayload,
  type ProfileUpdatePayload,
  type RegisterPayload,
  type User,
} from '../api/auth'
import {
  clearStoredToken,
  getStoredToken,
  setStoredToken,
} from '../../../shared/api/http'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(getStoredToken())
  const isAuthenticated = computed(() => Boolean(token.value))

  async function register(payload: RegisterPayload) {
    const result = await apiRegister(payload)
    user.value = result.user
    token.value = result.token
    if (result.token) setStoredToken(result.token)
    return result
  }

  async function login(payload: LoginPayload) {
    const result = await apiLogin(payload)
    user.value = result.user
    token.value = result.token
    if (result.token) setStoredToken(result.token)
    return result
  }

  async function updateProfile(payload: ProfileUpdatePayload): Promise<User> {
    const updated = await apiUpdateProfile(payload)
    user.value = updated
    return updated
  }

  // The upload endpoint stores the file before the profile form is saved, so the
  // store is updated right away to let the UI (top bar, preview) re-render.
  function setAvatar(avatarUrl: string): void {
    if (!user.value) return
    user.value = { ...user.value, avatar_url: avatarUrl }
  }

  function logout(): void {
    user.value = null
    token.value = null
    clearStoredToken()
  }

  async function hydrate(): Promise<void> {
    if (!token.value) return

    try {
      user.value = await fetchCurrentUser()
    } catch {
      logout()
    }
  }

  return {
    user,
    token,
    isAuthenticated,
    register,
    login,
    updateProfile,
    setAvatar,
    logout,
    hydrate,
  }
})
