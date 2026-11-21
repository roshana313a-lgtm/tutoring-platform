import { ApiError } from '../../../shared/api/http'

export function authErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'خطای نامشخص. لطفاً دوباره تلاش کنید.'
  }

  switch (error.status) {
    case 401:
      return 'ایمیل یا رمز عبور اشتباه است.'
    case 409:
      return 'این ایمیل قبلاً ثبت شده است. لطفاً وارد شوید یا ایمیل دیگری انتخاب کنید.'
    case 422:
      return 'اطلاعات وارد شده معتبر نیست. لطفاً همه فیلدها را بررسی کنید.'
    case 0:
      return 'خطا در ارتباط با سرور. لطفاً دوباره تلاش کنید.'
    default:
      return 'خطای نامشخص. لطفاً دوباره تلاش کنید.'
  }
}
