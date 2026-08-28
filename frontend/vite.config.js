import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev server proxies API + media + websocket to the FastAPI backend.
const BACKEND = process.env.BACKEND_URL || 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': { target: BACKEND, changeOrigin: true },
      '/media': { target: BACKEND, changeOrigin: true },
      '/ws': { target: BACKEND.replace('http', 'ws'), ws: true },
    },
  },
  preview: {
    host: true,
    port: 4173,
    proxy: {
      '/api': { target: BACKEND, changeOrigin: true },
      '/media': { target: BACKEND, changeOrigin: true },
      '/ws': { target: BACKEND.replace('http', 'ws'), ws: true },
    },
  },
})
