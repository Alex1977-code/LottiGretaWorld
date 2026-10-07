// Erzeugt die PWA-Icons aus der prozeduralen Hero-Grafik (einmalig ausführen,
// Ergebnis liegt in public/icons/). Aufruf: node tools/make-icons.mjs
import { createRequire } from 'node:module';
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const framesSrc = readFileSync(resolve(root, 'src/gfx/sprites/heroes.js'), 'utf8');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent('<canvas id="c"></canvas>');

const render = async (size, maskable) => page.evaluate(async ({ size, maskable, framesSrc }) => {
  const mod = (src) => import(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
  const { SHEETS } = await mod(framesSrc);
  const sheet = SHEETS.find((s) => s.key === 'lotti');
  const PAL = sheet.palette;
  const rows = sheet.frames.idle0;
  const FW = sheet.frameWidth;
  const c = document.getElementById('c');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  // Hintergrund: Kreis (normal) oder volle Fläche (maskable)
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#4a3a8a'); grad.addColorStop(1, '#f0a06a');
  ctx.fillStyle = grad;
  if (maskable) { ctx.fillRect(0, 0, size, size); }
  else { ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); ctx.fill(); }
  // Hero zentriert, 20px-Raster auf ~70% der Fläche (maskable: 55%, Sicherheitszone)
  const scale = Math.floor((size * (maskable ? 0.55 : 0.72)) / FW);
  const ox = Math.round((size - FW * scale) / 2);
  const oy = Math.round((size - FW * scale) / 2);
  for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) {
    const col = PAL[rows[y][x]];
    if (!col) continue;
    ctx.fillStyle = col;
    ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
  }
  return c.toDataURL('image/png');
}, { size, maskable, framesSrc });

const save = (name, dataUrl) => writeFileSync(resolve(root, 'public/icons', name), Buffer.from(dataUrl.split(',')[1], 'base64'));
save('icon-192.png', await render(192, false));
save('icon-512.png', await render(512, false));
save('icon-maskable-512.png', await render(512, true));
await browser.close();
console.log('Icons erzeugt: public/icons/');
