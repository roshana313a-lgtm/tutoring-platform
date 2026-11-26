import { http } from '../../../shared/api/http'

export interface AvatarUploadResult {
  avatar_url: string
}

export async function uploadAvatar(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)

  const data = await http.post<AvatarUploadResult>('/api/v1/uploads/avatar', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  return data.avatar_url
}
