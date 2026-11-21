import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import { useAuthStore } from './features/auth/stores/useAuthStore'
import router from './router'
import './shared/styles/theme.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

const auth = useAuthStore(pinia)
void auth.hydrate().finally(() => app.mount('#app'))
