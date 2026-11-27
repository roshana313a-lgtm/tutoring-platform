import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import { useAuthStore } from './features/auth/stores/useAuthStore'
import { applyDocumentLocale, i18n, type AppLocale } from './i18n'
import router from './router'
import './shared/styles/theme.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(i18n)
app.use(router)

// `index.html` ships the Persian defaults; the saved preference wins on boot.
applyDocumentLocale(i18n.global.locale.value as AppLocale)

const auth = useAuthStore(pinia)
void auth.hydrate().finally(() => app.mount('#app'))
