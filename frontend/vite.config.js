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
    // Important: when the browser performs a full navigation/reload for a
    // client-side route like `/events`, we must NOT proxy that request to the
    // backend (which returns JSON). To allow SPA history fallback while still
    // proxying XHR/fetch API calls, each proxy entry below uses `bypass` to
    // return `index.html` for requests that want HTML (browser navigations).
    proxy: {
      '/events': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        bypass: (req, res, options) => {
          const accept = req.headers && req.headers.accept;
          if (accept && accept.indexOf('text/html') !== -1) return '/index.html';
        }
      },
      '/route': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        bypass: (req, res, options) => {
          const accept = req.headers && req.headers.accept;
          if (accept && accept.indexOf('text/html') !== -1) return '/index.html';
        }
      },
      '/class_schedule': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        bypass: (req, res, options) => {
          const accept = req.headers && req.headers.accept;
          if (accept && accept.indexOf('text/html') !== -1) return '/index.html';
        }
      },
      // Note: login is performed via explicit backend POSTs; do not proxy the
      // browser GET for `/login` which should be served by the SPA router.
      // Note: page routes such as `/signup` are handled by the SPA router.
      // Do not proxy them to the backend to avoid intercepting browser navigations.
      '/me': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        bypass: (req, res, options) => {
          const accept = req.headers && req.headers.accept;
          if (accept && accept.indexOf('text/html') !== -1) return '/index.html';
        }
      }
    }
  },
})
