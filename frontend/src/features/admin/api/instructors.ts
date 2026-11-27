import type { User } from '../../auth/api/auth'
import { http } from '../../../shared/api/http'

export async function fetchAllInstructors(): Promise<User[]> {
  return http.get<User[]>('/api/v1/admin/instructors')
}

export async function fetchPendingInstructors(): Promise<User[]> {
  return http.get<User[]>('/api/v1/admin/instructors/pending')
}

export async function approveInstructor(instructorId: string): Promise<User> {
  return http.patch<User>(`/api/v1/admin/instructors/${instructorId}/approve`)
}

export async function rejectInstructor(instructorId: string): Promise<void> {
  await http.patch<void>(`/api/v1/admin/instructors/${instructorId}/reject`)
}
