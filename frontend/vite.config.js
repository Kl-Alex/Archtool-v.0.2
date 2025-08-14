// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy'; // <— ВАЖНО: импорт плагина

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/mxgraph/javascript/dist/*',
          dest: 'mxgraph'
        }
      ]
    })
  ],
  server: {
    proxy: {
      '/login': 'http://localhost:8080',
      '/api': 'http://localhost:8080',
    }
  },
  build: {
    outDir: 'dist'
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  base: '/',
});
