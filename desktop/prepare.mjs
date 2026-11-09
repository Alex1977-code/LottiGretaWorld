// Kopiert den Web-Build (../dist, vorher im Hauptordner `npm run build`) nach desktop/app – ohne Service Worker (das
// Programm lädt seine Dateien direkt von der Platte).
import { cpSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
if (!existsSync(here('../dist/index.html'))) { console.error('dist/ fehlt – zuerst im Hauptordner "npm run build" ausführen.'); process.exit(1); }
rmSync(here('./app'), { recursive: true, force: true });
cpSync(here('../dist'), here('./app'), { recursive: true, filter: (src) => !src.endsWith('sw.js') && !src.endsWith('.map') });
console.log('desktop/app bereit');
