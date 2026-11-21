import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
}))

vi.mock('axios', () => ({
  default: {
    create: () => ({ get: mocks.get, post: mocks.post }),
  },
}))

import { fetchCurrentUser, login, register } from '../../src/features/auth/api/auth'
import { ApiError, clearStoredToken } from '../../src/shared/api/http'

const student = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'student@example.com',
  role: 'student',
  created_at: '2026-11-21T10:00:00Z',
}

function axiosFailure(status: number, code: string, message: string) {
  return {
    message: 'Request failed',
    response: {
      status,
      data: { error: { code, message, details: { field: 'email' } } },
    },
  }
}

beforeEach(() => {
  mocks.post.mockReset()
  mocks.get.mockReset()
  clearStoredToken()
})

describe('auth API', () => {
  it('posts the register payload to the full endpoint and returns the auth response', async () => {
    mocks.post.mockResolvedValueOnce({
      data: {
        user: student,
        access_token: 'register-token',
        token_type: 'bearer',
      },
    })

    const result = await register({
      email: 'student@example.com',
      password: 'correct horse battery staple',
      role: 'student',
    })

    expect(mocks.post).toHaveBeenCalledWith('/api/v1/auth/register', {
      email: 'student@example.com',
      password: 'correct horse battery staple',
      role: 'student',
    })
    expect(result.user).toEqual(student)
    expect(result.token).toBe('register-token')
  })

  it('maps a 409 duplicate-email response to a typed ApiError', async () => {
    mocks.post.mockRejectedValueOnce(axiosFailure(409, 'EMAIL_EXISTS', 'Email already registered'))

    await expect(
      register({ email: 'student@example.com', password: 'longenough', role: 'student' }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
      code: 'EMAIL_EXISTS',
      message: 'Email already registered',
    } satisfies Partial<ApiError>)
  })

  it('maps a 422 validation response to a typed ApiError', async () => {
    mocks.post.mockRejectedValueOnce(axiosFailure(422, 'VALIDATION_ERROR', 'Invalid input'))

    await expect(
      register({ email: 'not-an-email', password: 'short', role: 'student' }),
    ).rejects.toMatchObject({ status: 422, code: 'VALIDATION_ERROR' })
  })

  it('posts the login payload and returns the auth response', async () => {
    mocks.post.mockResolvedValueOnce({
      data: {
        user: student,
        access_token: 'login-token',
        token_type: 'bearer',
      },
    })

    const result = await login({ email: 'student@example.com', password: 'secret12345' })

    expect(mocks.post).toHaveBeenCalledWith('/api/v1/auth/login', {
      email: 'student@example.com',
      password: 'secret12345',
    })
    expect(mocks.get).not.toHaveBeenCalled()
    expect(result).toEqual({ token: 'login-token', user: student })
  })

  it('maps a 401 bad-credentials response to a typed ApiError', async () => {
    mocks.post.mockRejectedValueOnce(
      axiosFailure(401, 'INVALID_CREDENTIALS', 'Invalid email or password'),
    )

    await expect(
      login({ email: 'student@example.com', password: 'wrong-password' }),
    ).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password',
    })
  })

  it('fetches the current user through the shared client', async () => {
    mocks.get.mockResolvedValueOnce({ data: student })

    await expect(fetchCurrentUser()).resolves.toEqual(student)
    expect(mocks.get).toHaveBeenCalledWith('/api/v1/auth/me')
  })
})
