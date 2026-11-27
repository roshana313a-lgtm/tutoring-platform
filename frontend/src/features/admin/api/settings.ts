import { http } from '../../../shared/api/http'

export interface PlatformSettings {
  platform_name: string
  support_email: string
  platform_description: string
  default_hourly_rate: number
  currency: string
  min_withdrawal_amount: number
  enable_email_notifications: boolean
  maintenance_mode: boolean
}

export async function fetchSettings(): Promise<PlatformSettings> {
  return http.get<PlatformSettings>('/api/v1/admin/settings')
}

export async function saveSettings(payload: PlatformSettings): Promise<PlatformSettings> {
  return http.put<PlatformSettings>('/api/v1/admin/settings', payload)
}
