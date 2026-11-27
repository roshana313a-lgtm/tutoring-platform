import { config } from '@vue/test-utils'
import { beforeEach } from 'vitest'

import { i18n, setAppLocale } from '../src/i18n'

// Every mounted component can call `useI18n()` without repeating the plugin.
config.global.plugins = [i18n]

// Language is global state; start each test in the default Persian locale.
beforeEach(() => {
  setAppLocale('fa')
})
