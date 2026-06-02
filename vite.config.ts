import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// O backend é acessado via proxy /api -> backend, evitando CORS no desenvolvimento.
// Dentro do container, o backend (publicado em :8080 no host) é alcançado por host.docker.internal.
const backend = process.env.VITE_BACKEND_URL ?? 'http://host.docker.internal:8080'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 0.0.0.0 — permite acessar de fora do container
    port: 5173,
    proxy: {
      '/api': {
        target: backend,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
})
