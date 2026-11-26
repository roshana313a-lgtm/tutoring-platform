// Uploaded files (avatars) are served by the API at /media/... as relative paths.
// In development the Vite server proxies /media to the API, so a relative path
// works as-is; when VITE_API_BASE_URL points at another origin the path must be
// prefixed with it or the browser would request the file from the frontend host.
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

const ABSOLUTE_URL = /^([a-z][a-z0-9+.-]*:)?\/\//i

export function resolveMediaUrl(url?: string | null): string {
  const value = (url ?? '').trim()
  if (!value) return ''
  if (ABSOLUTE_URL.test(value) || value.startsWith('data:') || value.startsWith('blob:')) {
    return value
  }

  const path = value.startsWith('/') ? value : `/${value}`
  return `${apiBaseUrl}${path}`
}
