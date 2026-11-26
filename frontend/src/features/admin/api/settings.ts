import { http } from '../../../shared/api/http'

export interface PlatformSettings {
  platform_name: string
  default_hourly_rate: number
  support_email: string
}

export async function fetchSettings(): Promise<PlatformSettings> {
  return http.get<PlatformSettings>('/api/v1/admin/settings')
}

export async function saveSettings(
  payload: Partial<PlatformSettings>,
): Promise<PlatformSettings> {
  return http.put<PlatformSettings>('/api/v1/admin/settings', payload)
}
