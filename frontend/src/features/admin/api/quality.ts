import { http } from '../../../shared/api/http'

export interface ServiceQuality {
  total_classes: number
  average_rating: number
  suspended_users: number
}

export async function fetchServiceQuality(): Promise<ServiceQuality> {
  return http.get<ServiceQuality>('/api/v1/admin/quality')
}
