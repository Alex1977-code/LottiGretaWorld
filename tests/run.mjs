// Headless-Smoke-Test (Tastatur): lädt das Spiel in Chromium, prüft auf Konsolenfehler,
// steuert Hero per Tastatur und speichert Screenshots nach tests/out/.
// Aufruf: npm run build && node tests/run.mjs
import { writeFileSync } from 'node:fs';
import { startServer, launchBrowser, loadGame, heroState, logState, makeChecker, OUT } from './helpers.mjs';

const PORT = 4173;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
await loadGame(page, PORT, errors, stop);

const info = await page.evaluate(() => ({
  renderer: window.__game.renderer.type === 2 ? 'WebGL' : 'Canvas',
  fps: window.__game.loop.actualFps,
}));
console.log('Renderer:', info.renderer, 'FPS:', info.fps.toFixed(0));

const lotti = () => heroState(page);
const shot = (name) => page.screenshot({ path: `${OUT}${name}.png` });
const log = logState;

// Sprite-Sheets vergrößert exportieren (zur Sichtkontrolle)
for (const key of ['lotti', 'leaf', 'tiles']) {
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

let s = await lotti(); log('start', s);
await shot('01_start');
const { check, summary } = makeChecker();
// Reiner Bewegungstest: Gegner entfernen, damit sie nicht dazwischenfunken
await page.evaluate(() => { const s = window.__game.scene.getScene('Play'); s.enemies.clear(true, true); s.mounts.clear(true, true); });

// 1) Laufen nach rechts
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(700);
s = await lotti(); log('run right', s);
check('läuft nach rechts (vx>100)', s.vx > 100);
await shot('02_run');

// 2) Kurzer Sprung (Tipp) vs. langer Sprung (halten)
await page.keyboard.up('ArrowRight');
await page.waitForTimeout(400);
let y0 = (await lotti()).y;
await page.keyboard.down('Space'); await page.waitForTimeout(40); await page.keyboard.up('Space');
let minYShort = y0;
for (let i = 0; i < 14; i++) { await page.waitForTimeout(40); const p = await lotti(); minYShort = Math.min(minYShort, p.y); }
await page.waitForTimeout(400);
y0 = (await lotti()).y;
await page.keyboard.down('Space');
let minYLong = y0;
for (let i = 0; i < 12; i++) { await page.waitForTimeout(40); const p = await lotti(); minYLong = Math.min(minYLong, p.y); }
await page.keyboard.up('Space');
await page.waitForTimeout(600);
console.log(`kurzer Sprung: ${(y0 - minYShort).toFixed(0)}px, langer Sprung: ${(y0 - minYLong).toFixed(0)}px`);
check('variable Sprunghöhe (lang > kurz + 15px)', (y0 - minYLong) > (y0 - minYShort) + 15);
check('langer Sprung ca. 3-4 Tiles', (y0 - minYLong) > 44 && (y0 - minYLong) < 72);

// 3) Gleiten: Springen, halten → an der Spitze öffnet sich der Schirm
await page.keyboard.down('ArrowRight');
await page.keyboard.down('Space');
let sawGlide = false, glideVy = 0;
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(40);
  const p = await lotti();
  if (p.state === 'glide' && p.vy > 0) { sawGlide = true; glideVy = p.vy; if (i > 20) break; }
}
s = await lotti(); log('glide', s);
await shot('03_glide');
check('Gleiten aktiv', sawGlide);
check('Gleit-Sinkgeschwindigkeit < 60', sawGlide && glideVy < 60 && glideVy > 0);

// 4) Sturzflug und Aufschwung – aus großer Höhe (Teleport), damit genug Luft ist
await page.keyboard.up('Space');
await page.keyboard.up('ArrowRight');
await page.waitForTimeout(800);
await page.evaluate(() => { const p = window.__game.scene.getScene('Play').hero; p.body.reset(100, 30); p.coyoteTimer = 0; p.jumpBufferTimer = 0; }); // über der freien Startfläche
await page.waitForTimeout(100);
await page.keyboard.down('Space');
await page.keyboard.down('ArrowRight');
for (let i = 0; i < 30; i++) { await page.waitForTimeout(30); if ((await lotti()).state === 'glide') break; }
await page.waitForTimeout(250);
s = await lotti(); log('glide (hoch)', s);
const yBeforeDive = s.y;
await page.keyboard.down('ArrowDown');
// Sturzflug bis ca. 100 px Tiefe halten (positionsabhängig statt zeitabhängig – robust gegen Eingabe-Latenz)
for (let i = 0; i < 40; i++) { await page.waitForTimeout(20); const p = await lotti(); if (p.state === 'dive' && p.y - yBeforeDive > 90) break; }
s = await lotti(); log('dive', s);
check('Sturzflug aktiv', s.state === 'dive');
check('Sturzflug schnell (vy>250)', s.vy > 250);
await page.evaluate(() => { window.__game.scene.getScene('Play').physics.world.pause(); }); // Bild ohne Zeitverlust (Physik steht)
await shot('04_dive');
await page.evaluate(() => { window.__game.scene.getScene('Play').physics.world.resume(); });
const yRelease = (await lotti()).y;
const depth = yRelease - yBeforeDive;
await page.keyboard.up('ArrowDown');
await page.waitForTimeout(50);
s = await lotti(); log('swoop', s);
check('Aufschwung (vy<-150)', s.vy < -150);
await shot('05_swoop');
let minY = s.y;
for (let i = 0; i < 30; i++) { await page.waitForTimeout(30); const p = await lotti(); minY = Math.min(minY, p.y); if (p.vy > 0) break; }
await page.waitForTimeout(150);
const regained = yRelease - minY;
console.log(`Sturztiefe ${depth.toFixed(0)}px → Höhengewinn ${regained.toFixed(0)}px (${(100 * regained / depth).toFixed(0)}%)`);
check('Höhengewinn (gedeckelt) plausibel', regained > 40 && regained < depth * 0.9);
s = await lotti(); log('after swoop', s);
check('Schirm nach Aufschwung wieder offen', s.state === 'glide');
await shot('06_reglide');
await page.keyboard.up('Space');
await page.keyboard.up('ArrowRight');
await page.waitForTimeout(2500);
s = await lotti(); log('landed', s);
check('wieder am Boden', s.ground);

// 4b) Figuren-Eigenschaften: Lotti springt höher, Greta weiter
const jumpStats = async (key) => {
  await page.evaluate((k) => { const s = window.__game.scene.getScene('Play'); s.hero.setHeroKey(k); s.hero.body.reset(60, 280); s.hero.coyoteTimer = 0; s.hero.jumpBufferTimer = 0; }, key);
  await page.waitForTimeout(400);
  // Anlauf, dann Sprung mit vollem Tempo
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(500);
  const y0 = (await lotti()).y, x0 = (await lotti()).x;
  await page.keyboard.down('Space');
  let minY = y0, landedX = x0;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(30);
    if (i === 8) await page.keyboard.up('Space'); // voller Sprung, aber kein Gleiten
    const p = await lotti(); minY = Math.min(minY, p.y);
    if (i > 8 && p.ground) { landedX = p.x; break; }
    if (i === 39) landedX = p.x;
  }
  await page.keyboard.up('Space'); await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(300);
  return { height: y0 - minY, distance: landedX - x0 };
};
const statsL = await jumpStats('lotti');
const statsG = await jumpStats('greta');
console.log(`Lotti: ${statsL.height.toFixed(0)}px hoch / ${statsL.distance.toFixed(0)}px weit · Greta: ${statsG.height.toFixed(0)}px hoch / ${statsG.distance.toFixed(0)}px weit`);
check('Lotti springt höher als Greta', statsL.height > statsG.height + 8);
check('Greta springt weiter als Lotti', statsG.distance > statsL.distance + 8);

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
