import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'

export const TOKEN_KEY = 'tutoring.auth.token'

let memoryToken: string | null = null

function browserStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function getStoredToken(): string | null {
  const storage = browserStorage()
  return storage ? storage.getItem(TOKEN_KEY) : memoryToken
}

export function setStoredToken(token: string): void {
  memoryToken = token
  browserStorage()?.setItem(TOKEN_KEY, token)
  applyAuthorizationHeader(token)
}

export function clearStoredToken(): void {
  memoryToken = null
  browserStorage()?.removeItem(TOKEN_KEY)
  applyAuthorizationHeader(null)
}

interface ErrorEnvelope {
  error?: {
    code?: string
    message?: string
    details?: unknown
  }
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function toApiError(error: unknown): ApiError {
  const candidate = error as {
    response?: { status?: number; data?: ErrorEnvelope }
    message?: string
  }
  const envelope = candidate?.response?.data?.error
  const status = candidate?.response?.status ?? 0

  if (envelope) {
    return new ApiError(
      status,
      envelope.code ?? 'UNKNOWN_ERROR',
      envelope.message ?? 'Request failed',
      envelope.details,
    )
  }

  return new ApiError(status, 'NETWORK_ERROR', candidate?.message ?? 'Request failed')
}

// Empty in development so /api/v1/... stays relative and is handled by the Vite proxy.
// Set VITE_API_BASE_URL only when the browser must call a different origin.
const baseURL = import.meta.env.VITE_API_BASE_URL ?? ''

const client: AxiosInstance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

function applyAuthorizationHeader(token: string | null): void {
  const defaults = client.defaults
  if (!defaults?.headers) return

  const headers = defaults.headers as Record<string, unknown>
  if (token) headers.Authorization = `Bearer ${token}`
  else delete headers.Authorization
}

applyAuthorizationHeader(getStoredToken())

export interface Http {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T>
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
  patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
}

async function unwrap<T>(execute: () => Promise<{ data: T }>): Promise<T> {
  try {
    const response = await execute()
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

export const http: Http = {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return unwrap(() =>
      config ? client.get<T, { data: T }>(url, config) : client.get<T, { data: T }>(url),
    )
  },
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return unwrap(() =>
      config
        ? client.post<T, { data: T }>(url, data, config)
        : client.post<T, { data: T }>(url, data),
    )
  },
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return unwrap(() =>
      config
        ? client.put<T, { data: T }>(url, data, config)
        : client.put<T, { data: T }>(url, data),
    )
  },
  patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return unwrap(() =>
      config
        ? client.patch<T, { data: T }>(url, data, config)
        : client.patch<T, { data: T }>(url, data),
    )
  },
}
