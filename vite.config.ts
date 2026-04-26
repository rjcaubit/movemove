import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';

export default defineConfig({
  // mkcert gera CA local + cert auto-assinado e instala no trust store do Mac.
  // Resultado: dev server roda em HTTPS, navigator.mediaDevices fica disponível
  // mesmo via IP LAN (necessário para testar do celular na mesma rede WiFi).
  plugins: [mkcert()],
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
