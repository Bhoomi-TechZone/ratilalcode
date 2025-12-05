import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 4000,
    host: '0.0.0.0',
    allowedHosts: ['localhost', '127.0.0.1'],

    fs: {
      allow: [
        path.resolve(__dirname, '.'),
        path.resolve(__dirname, '..')
      ],
      strict: true
    },
    proxy: {
      '/api': {
        target: 'https://ratilalandsons.onrender.com',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  plugins: [
    react(),
    {
      name: 'spa-fallback',
      configureServer(server) {
        return () => {
          server.middlewares.use((req, res, next) => {
            if (req.url.startsWith('/leads/') && req.url.indexOf('.') === -1) {
              req.url = '/index.html';
            }
            next();
          });
        };
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  // This ensures SPA routing works properly when refreshing
  base: './'
})
