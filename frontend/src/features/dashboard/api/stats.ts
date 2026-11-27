import { http } from '../../../shared/api/http'

export interface AdminStats {
  pending_instructors: number
  total_users: number
  active_classes: number
}

export interface InstructorStats {
  today_classes: number
  pending_grading: number
  total_students: number
}

export interface StudentStats {
  upcoming_classes: number
  pending_homework: number
  average_grade: number
}

export function fetchAdminStats(): Promise<AdminStats> {
  return http.get<AdminStats>('/api/v1/dashboard/admin/stats')
}

export function fetchInstructorStats(): Promise<InstructorStats> {
  return http.get<InstructorStats>('/api/v1/dashboard/instructor/stats')
}

export function fetchStudentStats(): Promise<StudentStats> {
  return http.get<StudentStats>('/api/v1/dashboard/student/stats')
}
