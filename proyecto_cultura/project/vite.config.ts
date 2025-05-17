import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  // Añadir base para despliegue
  base: '/',
  // Configuración para producción
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Mejoras de rendimiento
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // Separar las dependencias grandes en chunks diferentes
          fullcalendar: [
            '@fullcalendar/core', 
            '@fullcalendar/daygrid', 
            '@fullcalendar/interaction', 
            '@fullcalendar/react', 
            '@fullcalendar/timegrid'
          ],
          pdf: ['jspdf', 'jspdf-autotable']
        }
      }
    }
  },
  // Configuración del servidor para desarrollo y previsualización
  server: {
    port: 3000,
    strictPort: true,
    host: true
  },
  preview: {
    port: 8080,
    strictPort: true,
    host: true
  }
});