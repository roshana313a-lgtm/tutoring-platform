import { http, setStoredToken } from '../../../shared/api/http'

export type Role = 'student' | 'instructor'

export interface User {
  id: string
  email: string
  role: Role | 'admin'
  created_at: string
  full_name?: string
  phone_number?: string
  avatar_url?: string
  timezone?: string
  bio?: string
  years_of_experience?: number
  current_level?: string
}

export interface ProfileUpdatePayload {
  full_name?: string
  phone_number?: string
  avatar_url?: string
  timezone?: string
  bio?: string
  years_of_experience?: number
  current_level?: string
}

export interface RegisterPayload {
  email: string
  password: string
  role: Role
}

export interface LoginPayload {
  email: string
  password: string
}

export interface AuthResult {
  token: string | null
  user: User
}

interface AuthResponse {
  user: User
  access_token: string
  token_type: 'bearer'
}

export async function fetchCurrentUser(): Promise<User> {
  return http.get<User>('/api/v1/auth/me')
}

export async function updateProfile(payload: ProfileUpdatePayload): Promise<User> {
  return http.put<User>('/api/v1/auth/profile', payload)
}

export async function register(payload: RegisterPayload): Promise<AuthResult> {
  const data = await http.post<AuthResponse>('/api/v1/auth/register', payload)
  setStoredToken(data.access_token)

  return { token: data.access_token, user: data.user }
}

export async function login(payload: LoginPayload): Promise<AuthResult> {
  const data = await http.post<AuthResponse>('/api/v1/auth/login', payload)
  setStoredToken(data.access_token)

  return { token: data.access_token, user: data.user }
}
