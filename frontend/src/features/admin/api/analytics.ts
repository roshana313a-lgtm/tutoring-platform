import { http } from '../../../shared/api/http'

export interface RegistrationDay {
  date: string
  count: number
}

export interface RegistrationTrend {
  days: RegistrationDay[]
}

export async function fetchRegistrationTrend(): Promise<RegistrationTrend> {
  return http.get<RegistrationTrend>('/api/v1/admin/stats/registrations')
}
