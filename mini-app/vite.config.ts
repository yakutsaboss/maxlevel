import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

// Vite plugin: inject build hash into sw.js so each deploy busts the SW cache
function swCacheBust() {
  return {
    name: 'sw-cache-bust',
    closeBundle() {
      const swPath = path.resolve(__dirname, 'dist/sw.js');
      if (existsSync(swPath)) {
        const content = readFileSync(swPath, 'utf8');
        const hash = Date.now().toString(36);
        writeFileSync(swPath, content.replace('__BUILD_HASH__', hash));
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), swCacheBust()],
  base: '/levelapp/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3001,
    host: true,
  },
  build: {
    outDir: 'dist',
    // Disable sourcemaps in production to reduce bundle size
    sourcemap: false,
    // Target modern browsers (Telegram WebView uses Chrome)
    target: 'es2020',
    // Split vendor chunks for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-ui': ['framer-motion', 'lucide-react'],
          'vendor-i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
        },
      },
    },
    // Reduce chunk size warnings threshold
    chunkSizeWarningLimit: 500,
  },
});
