import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Hash único por build — sirve para que UpdatePrompt detecte nuevos deploys.
const BUILD_HASH = Date.now().toString(36);

// Plugin que escribe dist/version.json al terminar el build.
// UpdatePrompt lo sondea cada 60 s para detectar actualizaciones.
const versionJsonPlugin = {
  name: 'version-json',
  writeBundle(options) {
    const outDir = options.dir || 'dist';
    fs.writeFileSync(
      path.join(outDir, 'version.json'),
      JSON.stringify({ v: BUILD_HASH }),
    );
  },
};

export default defineConfig({
  plugins: [
    react(),
    versionJsonPlugin,
  ],
  define: {
    __BUILD_HASH__: JSON.stringify(BUILD_HASH),
  },
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