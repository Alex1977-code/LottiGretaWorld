// Headless-Smoke-Test (Tastatur): lädt das Spiel in Chromium, prüft auf Konsolenfehler,
// steuert Pip per Tastatur und speichert Screenshots nach tests/out/.
// Aufruf: npm run build && node tests/run.mjs
import { writeFileSync } from 'node:fs';
import { startServer, launchBrowser, loadGame, pipState, logState, makeChecker, OUT } from './helpers.mjs';

const PORT = 4173;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
await loadGame(page, PORT, errors, stop);

const info = await page.evaluate(() => ({
  renderer: window.__game.renderer.type === 2 ? 'WebGL' : 'Canvas',
  fps: window.__game.loop.actualFps,
}));
console.log('Renderer:', info.renderer, 'FPS:', info.fps.toFixed(0));

const pip = () => pipState(page);
const shot = (name) => page.screenshot({ path: `${OUT}${name}.png` });
const log = logState;

// Sprite-Sheets vergrößert exportieren (zur Sichtkontrolle)
for (const key of ['pip', 'leaf', 'tiles']) {
  const dataUrl = await page.evaluate((k) => {
    const src = window.__game.textures.get(k).getSourceImage();
    const z = 6;
    const c = document.createElement('canvas');
    c.width = src.width * z; c.height = src.height * z;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#3a3a5a'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  }, key);
  writeFileSync(`${OUT}sheet_${key}.png`, Buffer.from(dataUrl.split(',')[1], 'base64'));
}

let s = await pip(); log('start', s);
await shot('01_start');
const { check, summary } = makeChecker();

// 1) Laufen nach rechts
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(700);
s = await pip(); log('run right', s);
check('läuft nach rechts (vx>100)', s.vx > 100);
await shot('02_run');

// 2) Kurzer Sprung (Tipp) vs. langer Sprung (halten)
await page.keyboard.up('ArrowRight');
await page.waitForTimeout(400);
let y0 = (await pip()).y;
await page.keyboard.down('Space'); await page.waitForTimeout(40); await page.keyboard.up('Space');
let minYShort = y0;
for (let i = 0; i < 14; i++) { await page.waitForTimeout(40); const p = await pip(); minYShort = Math.min(minYShort, p.y); }
await page.waitForTimeout(400);
y0 = (await pip()).y;
await page.keyboard.down('Space');
let minYLong = y0;
for (let i = 0; i < 12; i++) { await page.waitForTimeout(40); const p = await pip(); minYLong = Math.min(minYLong, p.y); }
await page.keyboard.up('Space');
await page.waitForTimeout(600);
console.log(`kurzer Sprung: ${(y0 - minYShort).toFixed(0)}px, langer Sprung: ${(y0 - minYLong).toFixed(0)}px`);
check('variable Sprunghöhe (lang > kurz + 15px)', (y0 - minYLong) > (y0 - minYShort) + 15);
check('langer Sprung ca. 3-4 Tiles', (y0 - minYLong) > 44 && (y0 - minYLong) < 70);

// 3) Gleiten: Springen, halten → an der Spitze öffnet sich der Schirm
await page.keyboard.down('ArrowRight');
await page.keyboard.down('Space');
let sawGlide = false, glideVy = 0;
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(40);
  const p = await pip();
  if (p.state === 'glide' && p.vy > 0) { sawGlide = true; glideVy = p.vy; if (i > 20) break; }
}
s = await pip(); log('glide', s);
await shot('03_glide');
check('Gleiten aktiv', sawGlide);
check('Gleit-Sinkgeschwindigkeit < 60', sawGlide && glideVy < 60 && glideVy > 0);

// 4) Sturzflug und Aufschwung – aus großer Höhe (Teleport), damit genug Luft ist
await page.keyboard.up('Space');
await page.keyboard.up('ArrowRight');
await page.waitForTimeout(800);
await page.evaluate(() => { const p = window.__game.scene.getScene('Play').pip; p.body.reset(300, 30); });
await page.waitForTimeout(100);
await page.keyboard.down('Space');
await page.keyboard.down('ArrowRight');
for (let i = 0; i < 30; i++) { await page.waitForTimeout(30); if ((await pip()).state === 'glide') break; }
await page.waitForTimeout(250);
s = await pip(); log('glide (hoch)', s);
const yBeforeDive = s.y;
await page.keyboard.down('ArrowDown');
await page.waitForTimeout(260);
s = await pip(); log('dive', s);
check('Sturzflug aktiv', s.state === 'dive');
check('Sturzflug schnell (vy>250)', s.vy > 250);
await shot('04_dive');
const yRelease = (await pip()).y;
const depth = yRelease - yBeforeDive;
await page.keyboard.up('ArrowDown');
await page.waitForTimeout(50);
s = await pip(); log('swoop', s);
check('Aufschwung (vy<-150)', s.vy < -150);
await shot('05_swoop');
let minY = s.y;
for (let i = 0; i < 30; i++) { await page.waitForTimeout(30); const p = await pip(); minY = Math.min(minY, p.y); if (p.vy > 0) break; }
await page.waitForTimeout(150);
const regained = yRelease - minY;
console.log(`Sturztiefe ${depth.toFixed(0)}px → Höhengewinn ${regained.toFixed(0)}px (${(100 * regained / depth).toFixed(0)}%)`);
check('Höhengewinn 40-90% der Sturztiefe', regained > depth * 0.4 && regained < depth * 0.9);
s = await pip(); log('after swoop', s);
check('Schirm nach Aufschwung wieder offen', s.state === 'glide');
await shot('06_reglide');
await page.keyboard.up('Space');
await page.keyboard.up('ArrowRight');
await page.waitForTimeout(2500);
s = await pip(); log('landed', s);
check('wieder am Boden', s.ground);

// 5) Debug-Overlay
await page.keyboard.press('d');
await page.waitForTimeout(100);
await shot('07_debug');
await page.keyboard.press('d');

await page.waitForTimeout(200);
const fps = await page.evaluate(() => window.__game.loop.actualFps);
console.log('FPS am Ende:', fps.toFixed(0));

await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
