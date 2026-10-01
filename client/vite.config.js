import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_DEV_API_TARGET || 'http://localhost:5000';
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: {
        '/api': { target, changeOrigin: true },
        '/uploads': { target, changeOrigin: true },
        '/sitemap.xml': { target, changeOrigin: true },
        '/socket.io': { target, ws: true, changeOrigin: true },
      },
    },
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('recharts') || id.includes('d3-')) return 'charts';
              if (id.includes('framer-motion') || id.includes('motion-')) return 'motion';
              if (id.includes('react-router') || id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) return 'react';
            }
          },
        },
      },
    },
  };
});
