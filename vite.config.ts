import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(import.meta.dirname, './src/shared'),
      '@client': path.resolve(import.meta.dirname, './src/client'),
      '@server': path.resolve(import.meta.dirname, './src/server')
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true
      },
      '/api': {
        target: 'http://localhost:3001'
      }
    }
  }
});
