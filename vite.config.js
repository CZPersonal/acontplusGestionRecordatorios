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
        // index.html excluido del precache: siempre se pide a la red (NetworkFirst)
        // para evitar que el SW sirva HTML con hashes de JS que ya no existen.
        // JS/CSS/imágenes tienen hash en el nombre → seguros para cache-first.
        globPatterns: ['**/*.{js,css,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: false,
        skipWaiting: true,
        runtimeCaching: [
          {
            // Navegación SPA → NetworkFirst: siempre HTML fresco de Firebase Hosting
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages-cache',
              networkTimeoutSeconds: 3,
            },
          },
        ],
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