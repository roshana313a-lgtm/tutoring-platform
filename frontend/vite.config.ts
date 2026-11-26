import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      // Uploaded avatars are served by the API as /media/... paths; without this
      // proxy the browser would ask the Vite server for them and get a 404.
      '/media': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    server: {
      // zod ships CJS + ESM builds; inline it so `import { z }` resolves the ESM
      // named export consistently instead of relying on CJS interop.
      deps: { inline: ['zod'] },
    },
  },
})
