import { defineConfig } from 'vite';

// Relativer Base-Pfad, damit der Build sowohl lokal als auch unter
// GitHub Pages (https://<user>.github.io/<repo>/) funktioniert.
export default defineConfig({
  base: './',
  server: { port: 5173 },
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/phaser')) return 'phaser';
        },
      },
    },
  },
});
