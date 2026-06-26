import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// VitePWA eliminado: el registerType:'autoUpdate' forzaba clientsClaim() en el
// SW generado sin importar la config de workbox, tomando control de todos los
// tabs y borrando el cache viejo mientras seguían en uso -> pantalla en blanco.
// El SW ahora es public/sw.js (kill-switch que limpia caches y no cachea nada).

export default defineConfig({
  plugins: [
    react(),
  ],
  server: {
    host: true,
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
  },
})