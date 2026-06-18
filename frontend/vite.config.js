import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const spaBypass = (req) => {
  const accept = req.headers && req.headers.accept;
  if (accept && accept.includes('text/html')) return '/index.html';
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const backendTarget = env.VITE_API_TARGET || 'http://localhost:8000';
  const apiPrefixes = [
    '/events',
    '/route',
    '/class_schedule',
    '/login',
    '/signup',
    '/logout',
    '/registrations',
    '/me',
    '/chat',
    '/health',
  ];

  const proxy = Object.fromEntries(
    apiPrefixes.map((prefix) => [
      prefix,
      {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
        bypass: spaBypass,
      },
    ])
  );

  return {
    plugins: [react()],
    build: {
      chunkSizeWarningLimit: 650,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('@ant-design/icons')) return 'ant-icons';
            if (id.includes('/rc-')) return 'rc-components';
            if (id.includes('leaflet') || id.includes('react-leaflet')) return 'maps';
            if (id.includes('antd') || id.includes('@ant-design')) return 'antd';
            if (id.includes('react-router')) return 'router';
            if (id.includes('axios')) return 'network';
            if (id.includes('dayjs')) return 'date-utils';
            if (id.includes('dompurify')) return 'sanitize';
            if (id.includes('react-dom') || id.includes('/react/')) return 'react-vendor';
            return 'vendor';
          },
        },
      },
    },
    server: {
      host: true,
      port: 5173,
      allowedHosts: ['charan.social', 'localhost', '127.0.0.1'],
      proxy,
    },
  };
})
