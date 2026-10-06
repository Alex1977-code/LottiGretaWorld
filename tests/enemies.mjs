// Gegner-Test: Schaden, Draufspringen, Tod/Respawn, Checkpoint.
// Aufruf: npm run build && node tests/enemies.mjs
import { writeFileSync } from 'node:fs';
import { startServer, launchBrowser, loadGame, lottiState, logState, makeChecker, OUT } from './helpers.mjs';

const PORT = 4178;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
await loadGame(page, PORT, errors, stop);
const { check, summary } = makeChecker();

const hearts = () => page.evaluate(() => window.__game.registry.get('hearts'));
const enemies = () => page.evaluate(() => window.__game.scene.getScene('Play').enemies.getChildren().map((e) => ({ type: e.texture.key, x: e.x, y: e.y, alive: e.alive, vx: e.body.velocity.x })));
const teleport = (x, y) => page.evaluate(([x, y]) => { const p = window.__game.scene.getScene('Play').lotti; p.body.reset(x, y); }, [x, y]);

// Sprite-Sheets zur Sichtkontrolle exportieren
for (const key of ['walker', 'hopper', 'checkpoint', 'heart']) {
  const dataUrl = await page.evaluate((k) => {
    const src = window.__game.textures.get(k).getSourceImage();
    const z = 6, c = document.createElement('canvas');
    c.width = src.width * z; c.height = src.height * z;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#3a3a5a'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.imageSmoothingEnabled = false; ctx.drawImage(src, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  }, key);
  writeFileSync(`${OUT}sheet_${key}.png`, Buffer.from(dataUrl.split(',')[1], 'base64'));
}

let list = await enemies();
console.log('Gegner:', list.map((e) => `${e.type}@${e.x.toFixed(0)}`).join(' '));
check('Gegner platziert (2 Käfer + 2 Pilze + 1 Plattform-Käfer)', list.filter((e) => e.type === 'walker').length === 3 && list.filter((e) => e.type === 'hopper').length === 2);
check('Herzen voll am Start', (await hearts()) === 3);

// 1) Käfer läuft
await page.waitForTimeout(300);
list = await enemies();
const w0 = list.find((e) => e.type === 'walker' && e.x < 300); // der Käfer nahe der Kamera
check('Laufkäfer bewegt sich', Math.abs(w0.vx) > 20);

// 2) In den Käfer laufen → Schaden, Rückstoß, Unverwundbarkeit
await page.keyboard.down('ArrowRight');
let hurtSeen = false, knockVx = 0;
for (let i = 0; i < 60; i++) {
  await page.waitForTimeout(30);
  const h = await hearts();
  if (h < 3) { hurtSeen = true; knockVx = (await lottiState(page)).vx; break; }
}
await page.keyboard.up('ArrowRight');
check('Seitliche Berührung kostet ein Herz', hurtSeen && (await hearts()) === 2);
check('Rückstoß nach links', knockVx < -50);
await page.screenshot({ path: `${OUT}e01_hurt.png` });
const inv = await page.evaluate(() => window.__game.scene.getScene('Play').lotti.invincible);
check('Lotti ist kurz unverwundbar', inv === true);
await page.waitForTimeout(400);
// Während Unverwundbarkeit erneut berühren → kein weiterer Verlust
await page.keyboard.down('ArrowRight'); await page.waitForTimeout(300); await page.keyboard.up('ArrowRight');
check('Kein Doppelschaden während Unverwundbarkeit', (await hearts()) === 2);
await page.waitForTimeout(1200);

// 3) Draufspringen: über einen lebenden Käfer teleportieren
list = await enemies();
const w = list.find((e) => e.type === 'walker' && e.alive);
await teleport(w.x, w.y - 40);
let squashed = false, bounceVy = 0, bounceSeen = false;
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(30);
  const l = await enemies();
  const s = await lottiState(page);
  if (s.vy < -100) { bounceSeen = true; bounceVy = s.vy; }
  if (!l.find((e) => e.x === w.x && e.alive) && l.length < list.length + 1) { squashed = true; }
  if (squashed && bounceSeen) break;
}
await page.screenshot({ path: `${OUT}e02_stomp.png` });
logState('nach Stomp', await lottiState(page));
check('Käfer wird plattgedrückt', squashed || (await enemies()).filter((e) => e.type === 'walker' && e.alive).length < 3);
check('Lotti prallt nach oben ab', bounceSeen);
check('Draufspringen kostet kein Herz', (await hearts()) === 2);
await page.waitForTimeout(800);

// 4) Tod: ein Herz übrig, in den Käfer am Boden laufen → Respawn am Start mit vollen Herzen
await page.evaluate(() => window.__game.registry.set('hearts', 1));
list = await enemies();
const m = list.find((e) => e.type === 'walker' && e.alive && e.y > 250 && e.x > 300);
await teleport(m.x - 40, m.y - 2);
await page.keyboard.down('ArrowRight');
let died = false;
for (let i = 0; i < 60; i++) { await page.waitForTimeout(30); if (await page.evaluate(() => window.__game.scene.getScene('Play').lotti.dead)) { died = true; break; } }
await page.keyboard.up('ArrowRight');
check('Letztes Herz → Lotti stirbt', died);
await page.screenshot({ path: `${OUT}e03_death.png` });
// Bis zum Respawn warten und sofort messen (bevor der Käfer am Start Lotti erreicht)
let respawned = null;
for (let i = 0; i < 80; i++) {
  await page.waitForTimeout(30);
  respawned = await page.evaluate(() => { const sc = window.__game.scene.getScene('Play'); const p = sc.lotti; return (!p.dead && !p.respawnLock) ? { x: p.x, hearts: sc.registry.get('hearts') } : null; });
  if (respawned) break;
}
console.log('nach Respawn', respawned);
check('Respawn am Startpunkt', !!respawned && Math.abs(respawned.x - 56) < 4);
check('Herzen nach Respawn voll', !!respawned && respawned.hearts === 3);
let s;

// 5) Checkpoint: hinlaufen, aktivieren, sterben → Respawn am Checkpoint
const cp = await page.evaluate(() => { const c = window.__game.scene.getScene('Play').checkpoints.getChildren()[0]; return { x: c.x, y: c.y, bottom: c.body.bottom }; });
await teleport(cp.x - 40, cp.bottom - 12);
await page.keyboard.down('ArrowRight'); await page.waitForTimeout(600); await page.keyboard.up('ArrowRight');
const cpActive = await page.evaluate(() => window.__game.scene.getScene('Play').checkpoints.getChildren()[0].active_);
check('Checkpoint aktiviert', cpActive);
await page.screenshot({ path: `${OUT}e04_checkpoint.png` });
await teleport(cp.x, 600); // in die Tiefe → Tod
await page.waitForTimeout(1200);
s = await lottiState(page); logState('nach Checkpoint-Respawn', s);
check('Respawn am Checkpoint', Math.abs(s.x - cp.x) < 6);

// 6) Debug-Ansicht mit Gegnern
await page.keyboard.press('d'); await page.waitForTimeout(100);
await page.screenshot({ path: `${OUT}e05_debug.png` });

await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
