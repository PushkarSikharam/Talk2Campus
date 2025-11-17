import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // listen on all network interfaces
    port: 5173, // optional
    allowedHosts: ['charan.social', 'localhost', '127.0.0.1'],
    // Proxy API calls to backend during development so frontend can call 
    // `/events`, `/route`, etc. without hardcoding backend host.
    proxy: {
      '/events': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/route': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/class_schedule': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/login': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/signup': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/me': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
})
