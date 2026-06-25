import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuración solo para previsualizar el módulo en desarrollo.
export default defineConfig({
  plugins: [react()],
  server: { port: 5188, host: '127.0.0.1' },
});
