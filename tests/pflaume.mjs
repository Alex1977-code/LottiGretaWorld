// Pflaume-Test: Aufsteigen, Beeren-Kräfte (Feuer, Schweben, Stampfen), Flucht & Einfangen.
// Aufruf: npm run build && node tests/pflaume.mjs
import { writeFileSync } from 'node:fs';
import { startServer, launchBrowser, loadGame, pipState, logState, makeChecker, OUT } from './helpers.mjs';

const PORT = 4180;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
await loadGame(page, PORT, errors, stop);
const { check, summary } = makeChecker();
// Pilze stören den Ablauf (springen Pip an) – nur Käfer bleiben
await page.evaluate(() => { const s = window.__game.scene.getScene('Play'); s.enemies.getChildren().filter((e) => e.texture.key === 'hopper' && e.x < 1200).forEach((e) => e.destroy()); });

const sc = (fn, arg) => page.evaluate(fn, arg);
const teleport = (x, y) => sc(([x, y]) => { const p = window.__game.scene.getScene('Play').pip; p.body.reset(x, y); }, [x, y]);
const pflaume = () => sc(() => { const m = window.__game.scene.getScene('Play').mounts.getChildren()[0]; return m ? { x: m.x, y: m.y, state: m.state_, power: m.power, vx: m.body.velocity.x, hover: m.hoverTimer, stomping: m.stomping } : null; });
const pipInfo = () => sc(() => { const p = window.__game.scene.getScene('Play').pip; return { mounted: !!p.mount, bodyH: p.body.height, bottom: p.body.bottom, x: p.x, y: p.y, vy: p.body.velocity.y, ground: p.onGround }; });
const power = () => sc(() => window.__game.registry.get('power'));
const hearts = () => sc(() => window.__game.registry.get('hearts'));
const trace = async (label) => { const m = await pflaume(); const p = await pipInfo(); console.log(`  [${label}] pip x=${p.x.toFixed(0)} y=${p.y.toFixed(0)} mounted=${p.mounted} | pflaume ${m ? `${m.state} ${m.power} x=${m.x.toFixed(0)}` : 'weg'} | power=${await power()}`); };

// Sprite-Sheets zur Sichtkontrolle
for (const key of ['pflaume', 'berry', 'fireball']) {
  const dataUrl = await sc((k) => {
    const src = window.__game.textures.get(k).getSourceImage();
    const z = 6, c = document.createElement('canvas');
    c.width = src.width * z; c.height = src.height * z;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#3a3a5a'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.imageSmoothingEnabled = false; ctx.drawImage(src, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  }, key);
  writeFileSync(`${OUT}sheet_${key}.png`, Buffer.from(dataUrl.split(',')[1], 'base64'));
}

// 1) Aufsteigen: zu Pflaume laufen
let m = await pflaume();
console.log('Pflaume bei', m.x.toFixed(0), m.y.toFixed(0), m.state);
check('Pflaume wartet im Level', !!m && m.state === 'free');
await teleport(m.x, m.y - 24); // von oben draufspringen
await page.waitForTimeout(500);
let p = await pipInfo(); m = await pflaume();
check('Pip sitzt auf Pflaume', p.mounted && m.state === 'ridden');
console.log('Hitbox', JSON.stringify(await sc(() => { const b = window.__game.scene.getScene('Play').pip.body; return { w: b.width, h: b.height, ox: b.offset.x, oy: b.offset.y }; })));
check('Hitbox beim Reiten höher (26)', p.bodyH === 26);
check('HUD zeigt Kraft "none"', (await power()) === 'none');
await page.waitForTimeout(400);
p = await pipInfo();
check('Pip+Pflaume stehen auf dem Boden', p.ground && p.mounted);
await page.screenshot({ path: `${OUT}p01_mounted.png` });

// 2) Rote Beere → Feuerball
const berries = await sc(() => window.__game.scene.getScene('Play').berries.getChildren().map((b) => ({ x: b.x, y: b.y, type: b.berryType })));
const red = berries.find((b) => b.type === 'red');
await teleport(red.x - 30, red.y - 6);
await page.keyboard.down('ArrowRight'); await page.waitForTimeout(500); await page.keyboard.up('ArrowRight');
check('Rote Beere gefressen → Kraft rot', (await power()) === 'red');
// Auf freier Fläche feuern: Käfer davor platzieren
const walker = await sc(() => { const s = window.__game.scene.getScene('Play'); const w = s.enemies.getChildren().find((e) => e.texture.key === 'walker' && e.alive && e.y > 250); w.body.reset(190, 296); return { x: 190, y: 296 }; });
await teleport(walker.x - 90, walker.y - 14);
await page.waitForTimeout(400);
await page.keyboard.press('x');
await page.waitForTimeout(80);
let fb = await sc(() => window.__game.scene.getScene('Play').fireballs.getChildren().map((f) => ({ x: f.x, vx: f.body.velocity.x })));
check('Feuerball erzeugt und fliegt nach rechts', fb.length === 1 && fb[0].vx > 150);
await page.screenshot({ path: `${OUT}p02_fire.png` });
let knocked = false;
for (let i = 0; i < 40; i++) { await page.waitForTimeout(30); const alive = await sc((wx) => { const s = window.__game.scene.getScene('Play'); const w = s.enemies.getChildren().find((e) => Math.abs(e.x - wx) < 60 && e.texture.key === 'walker'); return w ? w.alive : false; }, walker.x); if (!alive) { knocked = true; break; } }
check('Feuerball erledigt den Käfer', knocked);
await trace('nach Käfer');

// 3) Blaue Beere → Schweben
const blue = berries.find((b) => b.type === 'blue');
await teleport(blue.x - 24, blue.y - 6);
await page.keyboard.down('ArrowRight'); await page.waitForTimeout(220); await page.keyboard.up('ArrowRight');
await page.waitForTimeout(200);
check('Blaue Beere → Kraft blau', (await power()) === 'blue');
await trace('blau');
await teleport(blue.x, 120); // in der Luft loslassen und Sprungtaste halten
await page.keyboard.down('Space');
await page.waitForTimeout(600);
p = await pipInfo(); m = await pflaume();
console.log('Schweben: vy', p.vy.toFixed(0), 'Restzeit', m.hover.toFixed(0));
check('Schweben: kaum Sinken', !p.ground && p.vy < 25);
check('Schwebezeit läuft ab', m.hover < 3000 && m.hover > 1500);
await page.screenshot({ path: `${OUT}p03_hover.png` });
await page.keyboard.up('Space');
await page.waitForTimeout(1200);
p = await pipInfo();
check('Nach Loslassen fällt Pip', p.ground || p.vy > 100);

// 4) Gelbe Beere → Stampfsprung zerbricht Block
const yellow = berries.find((b) => b.type === 'yellow');
await teleport(yellow.x - 30, yellow.y - 6);
await page.keyboard.down('ArrowRight'); await page.waitForTimeout(500); await page.keyboard.up('ArrowRight');
check('Gelbe Beere → Kraft gelb', (await power()) === 'yellow');
await trace('gelb');
const brick = await sc(() => { const s = window.__game.scene.getScene('Play'); const t = s.groundLayer.getTileAt(36, 17); return { tx: t.x, ty: t.y, cx: t.getCenterX(), top: t.pixelY, index: t.index }; });
console.log('Block bei Tile', brick.tx, brick.ty);
await teleport(brick.cx, brick.top - 130);
await page.waitForTimeout(60);
await page.keyboard.press('x');
await page.waitForTimeout(40);
m = await pflaume(); p = await pipInfo();
check('Stampfsprung aktiv (schnell nach unten)', m.stomping && p.vy > 400);
await page.waitForTimeout(600);
const brickGone = await sc(([tx, ty]) => { const s = window.__game.scene.getScene('Play'); const t = s.groundLayer.getTileAt(tx, ty); return !t || t.index === -1; }, [brick.tx, brick.ty]);
check('Block zerbrochen', brickGone);
await trace('nach Stampfer');
await page.screenshot({ path: `${OUT}p04_stomp.png` });

// 5) Flucht: seitlich von Gegner getroffen → Pflaume flieht, kein Herz verloren
const h0 = await hearts();
const hop = await sc(() => { const s = window.__game.scene.getScene('Play'); const e = s.enemies.getChildren().find((x) => x.texture.key === 'walker' && x.alive); e.body.reset(1260, 296); return { x: 1260, y: 296 }; });
await teleport(hop.x - 60, hop.y - 14);
await page.waitForTimeout(100);
await page.keyboard.down('ArrowRight');
let fled = false;
for (let i = 0; i < 60; i++) { await page.waitForTimeout(30); m = await pflaume(); if (m && m.state === 'fleeing') { fled = true; break; } }
await page.keyboard.up('ArrowRight');
p = await pipInfo();
check('Treffer beim Reiten → Pflaume flieht', fled);
check('Pip ist abgestiegen (Hitbox 14)', !p.mounted && p.bodyH === 14);
check('Kein Herz verloren', (await hearts()) === h0);
check('Pflaume flieht vom Gegner weg (nach links)', m && m.vx < -60);
check('Kraft-Anzeige aus', (await power()) === '');
await page.screenshot({ path: `${OUT}p05_flee.png` });

// 6) Einfangen innerhalb von 3 s → wieder aufgestiegen
await page.waitForTimeout(500);
m = await pflaume();
if (m) await teleport(m.x, m.y - 4);
let caught = false;
for (let i = 0; i < 20; i++) { await page.waitForTimeout(30); m = await pflaume(); if (m && m.state === 'ridden') { caught = true; break; } }
check('Pflaume wieder eingefangen', caught);
check('Kraft bleibt erhalten (gelb)', (await power()) === 'yellow');

// 7) Nicht einfangen → Pflaume verschwindet nach 3 s
await sc(() => { const s = window.__game.scene.getScene('Play'); s.mounts.getChildren()[0]?.panic(s.pip.x + 20); });
await page.waitForTimeout(200);
await teleport(100, 280);
await page.waitForTimeout(3300);
m = await pflaume();
check('Pflaume verschwindet nach 3 s Flucht', m === null);

await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
