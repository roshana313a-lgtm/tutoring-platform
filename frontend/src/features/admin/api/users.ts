import type { User } from '../../auth/api/auth'
import { http } from '../../../shared/api/http'

export async function fetchUsers(): Promise<User[]> {
  return http.get<User[]>('/api/v1/admin/users')
}

export async function toggleUserSuspension(userId: string): Promise<User> {
  return http.patch<User>(`/api/v1/admin/users/${userId}/suspend`)
}
