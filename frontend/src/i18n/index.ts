import { createI18n } from 'vue-i18n'

import en from '../locales/en.json'
import fa from '../locales/fa.json'

export type AppLocale = 'fa' | 'en'

export const LOCALE_STORAGE_KEY = 'app-locale'

export const SUPPORTED_LOCALES: AppLocale[] = ['fa', 'en']

export const DEFAULT_LOCALE: AppLocale = 'fa'

export function isAppLocale(value: unknown): value is AppLocale {
  return value === 'fa' || value === 'en'
}

/** Reads the saved preference; falls back to Persian when storage is unavailable. */
export function getStoredLocale(): AppLocale {
  try {
    const stored = globalThis.localStorage?.getItem(LOCALE_STORAGE_KEY)
    return isAppLocale(stored) ? stored : DEFAULT_LOCALE
  } catch {
    return DEFAULT_LOCALE
  }
}

export function persistLocale(locale: AppLocale): void {
  try {
    globalThis.localStorage?.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // Private mode or a non-browser runtime: the choice simply is not persisted.
  }
}

/** Persian is RTL with Estedad; English is LTR with the Latin font stack. */
export function applyDocumentLocale(locale: AppLocale): void {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  root.setAttribute('lang', locale)
  root.setAttribute('dir', locale === 'fa' ? 'rtl' : 'ltr')
  root.dataset.locale = locale
}

export const i18n = createI18n({
  legacy: false,
  locale: getStoredLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  messages: { fa, en },
})

export function setAppLocale(locale: AppLocale): void {
  i18n.global.locale.value = locale
  persistLocale(locale)
  applyDocumentLocale(locale)
}
