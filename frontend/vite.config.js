import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/login": "http://localhost:8080",
      "/api": "http://localhost:8080"
    }
  },
  build: {
    outDir: 'dist'
  },
  // 👇 Добавляем fallback для SPA
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  // 👇 Самое важное
  base: '/',
});
