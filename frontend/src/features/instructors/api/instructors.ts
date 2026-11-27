import { http } from '../../../shared/api/http'

export interface InstructorListItem {
  id: string
  full_name: string
  email: string
  short_summary: string
  teaching_languages: string[]
  hourly_rate: number
  education_level: string
  avatar_url: string
}

export function fetchInstructors(): Promise<InstructorListItem[]> {
  return http.get<InstructorListItem[]>('/api/v1/instructors')
}
