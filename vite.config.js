import { defineConfig } from 'vite';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Trägt eine Build-Kennung in den Service Worker ein (neuer Cache pro Deployment).
function swBuildStamp() {
  return {
    name: 'sw-build-stamp',
    closeBundle() {
      const file = resolve('dist/sw.js');
      if (!existsSync(file)) return;
      const stamp = Date.now().toString(36);
      writeFileSync(file, readFileSync(file, 'utf8').replace('__BUILD__', stamp));
    },
  };
}

// Relativer Base-Pfad, damit der Build sowohl lokal als auch unter
// GitHub Pages (https://<user>.github.io/<repo>/) funktioniert.
export default defineConfig({
  base: './',
  plugins: [swBuildStamp()],
  server: { port: 5173 },
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/phaser')) return 'phaser';
          if (id.includes('node_modules/three')) return 'three';
        },
      },
    },
  },
});
