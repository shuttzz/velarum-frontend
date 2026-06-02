import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// O backend é acessado via proxy /api -> backend, evitando CORS no desenvolvimento.
const backend = process.env.VITE_BACKEND_URL ?? 'http://host.docker.internal:8080'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // HMR funciona dentro do Docker; usePolling garante que o watcher detecte
    // edições feitas no host (eventos de FS nem sempre propagam pelo volume no Mac/Windows).
    watch: { usePolling: true },
    proxy: {
      '/api': {
        target: backend,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
