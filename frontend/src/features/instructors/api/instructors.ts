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
  average_rating: number | null
}

export interface InstructorProfile {
  id: string
  full_name: string
  avatar_url: string
  short_summary: string
  bio: string
  teaching_languages: string[]
  hourly_rate: number
  average_rating: number | null
  years_of_experience: number
  education_level: string
}

export interface InstructorQuery {
  search?: string
  max_price?: number
}

/** Approved instructors only; the API applies the search and price filters. */
export function fetchInstructors(query: InstructorQuery = {}): Promise<InstructorListItem[]> {
  const params = new URLSearchParams()
  const search = query.search?.trim()
  if (search) params.set('search', search)
  if (query.max_price !== undefined) params.set('max_price', String(query.max_price))

  const suffix = params.size > 0 ? `?${params.toString()}` : ''
  return http.get<InstructorListItem[]>(`/api/v1/instructors${suffix}`)
}

export function fetchInstructor(id: string): Promise<InstructorProfile> {
  return http.get<InstructorProfile>(`/api/v1/instructors/${encodeURIComponent(id)}`)
}
