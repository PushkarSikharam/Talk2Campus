import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // listen on all network interfaces
    port: 5173, // optional
    allowedHosts: ['charan.social', 'localhost', '127.0.0.1'],
  },
})
