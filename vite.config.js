import { defineConfig } from 'vite';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';

// Alle Dateien unter dir (relativ, mit '/'), rekursiv.
function listFiles(dir, root = dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? listFiles(p, root) : [relative(root, p).split('\\').join('/')];
  });
}

// Trägt eine Build-Kennung (neuer Cache pro Deployment) und die Liste aller Build-Dateien (Vorab-Speichern für den
// Offline-Start) in den Service Worker ein.
function swBuildStamp() {
  return {
    name: 'sw-build-stamp',
    closeBundle() {
      const file = resolve('dist/sw.js');
      if (!existsSync(file)) return;
      const stamp = Date.now().toString(36);
      const files = listFiles(resolve('dist')).filter((f) => f !== 'sw.js' && !f.endsWith('.map')).sort();
      writeFileSync(file, readFileSync(file, 'utf8')
        .replace('__BUILD__', stamp)
        .replace('[/*__PRECACHE__*/]', JSON.stringify(files)));
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
