import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'zolikstore.loca.lt' // Разрешаем Vite принимать запросы от твоего localtunnel
    ]
    // allowedHosts: True,
  }
})