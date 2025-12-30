import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    //host: '192.168.11.252',
    port: 3000,
    open: true
  }
})

