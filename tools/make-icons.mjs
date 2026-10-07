// Erzeugt die PWA-Icons aus der laufenden Spielgrafik (Lotti, Frame idle0) – funktioniert für
// Pixel- und Vektor-Sheets gleichermaßen. Aufruf: npm run build && node tools/make-icons.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { startServer, launchBrowser, loadGame } from '../tests/helpers.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4190;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
await loadGame(page, PORT, errors, stop, 'test', '3'); // hohe Auflösung für die Icons

const render = (size, maskable) => page.evaluate(({ size, maskable }) => {
  const frame = window.__game.textures.getFrame('lotti', 'idle0');
  const src = frame.source.image;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#4fb4ff'); grad.addColorStop(1, '#b8f05a');
  ctx.fillStyle = grad;
  if (maskable) { ctx.fillRect(0, 0, size, size); }
  else { ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); ctx.fill(); }
  // Figur zentriert auf ~72 % (maskable: 55 %, Sicherheitszone)
  const target = size * (maskable ? 0.55 : 0.72);
  const scale = target / Math.max(frame.width, frame.height);
  const dw = frame.width * scale, dh = frame.height * scale;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, frame.cutX, frame.cutY, frame.width, frame.height, (size - dw) / 2, (size - dh) / 2, dw, dh);
  return c.toDataURL('image/png');
}, { size, maskable });

const save = (name, dataUrl) => writeFileSync(resolve(root, 'public/icons', name), Buffer.from(dataUrl.split(',')[1], 'base64'));
save('icon-192.png', await render(192, false));
save('icon-512.png', await render(512, false));
save('icon-maskable-512.png', await render(512, true));
await browser.close();
stop();
console.log('Icons erzeugt: public/icons/', errors.length ? errors : '');
