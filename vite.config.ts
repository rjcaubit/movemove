import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    assetsInlineLimit: 0,
  },
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision'],
  },
});
