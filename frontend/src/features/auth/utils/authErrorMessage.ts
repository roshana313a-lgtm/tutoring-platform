import { ApiError } from '../../../shared/api/http'

// Returns a translation key so callers render the message in the active locale.
export function authErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'errors.unknown'
  }

  switch (error.status) {
    case 401:
      return 'errors.unauthorized'
    case 409:
      return 'errors.conflict'
    case 422:
      return 'errors.invalid'
    case 0:
      return 'errors.network'
    default:
      return 'errors.unknown'
  }
}
