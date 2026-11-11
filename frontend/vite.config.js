import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Point the dev proxy at a backend on another port with DEALIGENT_API=http://localhost:8001
const API = process.env.DEALIGENT_API || 'http://localhost:8000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: API,
        changeOrigin: true,
      },
      '/stream': {
        target: API,
        changeOrigin: true,
      },
    },
  },
})
