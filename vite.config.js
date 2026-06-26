import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false, // ya existe public/manifest.json
      devOptions: { enabled: false },
      workbox: {
        cacheId: 'acontplus-v3',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        // clientsClaim eliminado: tomaba control de tabs existentes y borraba
        // el cache viejo mientras seguían en uso → pantalla en blanco
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/firebase-messaging-sw\.js/],
      },
    }),
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