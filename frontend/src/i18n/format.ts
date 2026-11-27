import type { AppLocale } from '.'

/** Persian digits for `fa`, plain Latin digits for `en`. */
export function numberLocale(locale: string): string {
  return locale === 'fa' ? 'fa-IR' : 'en-US'
}

export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(numberLocale(locale)).format(value)
}

export function formatCurrency(value: number, locale: string): string {
  return formatNumber(value, locale)
}

export function formatDate(
  value: string,
  locale: string,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' },
): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(numberLocale(locale), options).format(date)
}

export function formatToday(locale: AppLocale | string): string {
  return new Intl.DateTimeFormat(numberLocale(locale), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
}
