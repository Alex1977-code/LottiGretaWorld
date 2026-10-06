// Touch-Test: simuliert Finger per CDP (Stick links, Sprung/Gleiten/Wischen rechts),
// prüft den Querformat-Hinweis. Aufruf: npm run build && node tests/touch.mjs
import { startServer, launchBrowser, loadGame, pipState, logState, makeChecker, OUT } from './helpers.mjs';

const PORT = 4175;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser({ hasTouch: true, isMobile: true, viewport: { width: 960, height: 540 } });
await loadGame(page, PORT, errors, stop);
const { check, summary } = makeChecker();
// Reiner Bewegungstest: Gegner entfernen, damit sie nicht dazwischenfunken
await page.evaluate(() => window.__game.scene.getScene('Play').enemies.clear(true, true));
// Finger werden als echte DOM-TouchEvents auf dem Canvas erzeugt (CDP-Emulation
// vergibt bei mehreren Fingern falsche Identifier).
await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  const fingers = new Map();
  const mk = (f) => new Touch({ identifier: f.id, target: canvas, clientX: f.x, clientY: f.y, pageX: f.x, pageY: f.y, screenX: f.x, screenY: f.y, radiusX: 8, radiusY: 8, force: 1 });
  const fire = (type, changed) => {
    const touches = [...fingers.values()].map(mk);
    canvas.dispatchEvent(new TouchEvent(type, { touches, targetTouches: touches, changedTouches: changed.map(mk), bubbles: true, cancelable: true }));
  };
  window.__finger = {
    down(id, x, y) { const f = { id, x, y }; fingers.set(id, f); fire('touchstart', [f]); },
    move(id, x, y) { const f = fingers.get(id); if (!f) return; f.x = x; f.y = y; fire('touchmove', [f]); },
    up(id) { const f = fingers.get(id); if (!f) return; fingers.delete(id); fire('touchend', [f]); },
  };
});
const down = (id, x, y) => page.evaluate(([id, x, y]) => window.__finger.down(id, x, y), [id, x, y]);
const move = (id, x, y) => page.evaluate(([id, x, y]) => window.__finger.move(id, x, y), [id, x, y]);
const up = (id) => page.evaluate((id) => window.__finger.up(id), id);
const touch = () => page.evaluate(() => ({ ...window.__game.scene.getScene('Play').input_.touch }));

let s = await pipState(page); logState('start', s);

// 1) Stick: Finger links aufsetzen und nach rechts ziehen
await down(1, 200, 400);
await move(1, 260, 400);
await page.waitForTimeout(80);
let t = await touch();
console.log('Stick axisX =', t.axisX.toFixed(2));
check('Stick liefert vollen Ausschlag', t.axisX > 0.95);
await page.screenshot({ path: `${OUT}t01_stick.png` });
await page.waitForTimeout(500);
s = await pipState(page); logState('stick rechts', s);
check('Pip läuft nach rechts per Stick', s.vx > 60);
// Halber Ausschlag → langsamer
await move(1, 226, 400);
await page.waitForTimeout(400);
s = await pipState(page); logState('stick halb', s);
check('Analog: halber Ausschlag langsamer', s.vx > 20 && s.vx < 100);
await move(1, 290, 400); // voll

// 2) Sprung: zweiter Finger rechts tippen
const y0 = (await pipState(page)).y;
await down(2, 700, 400);
await page.waitForTimeout(40);
await up(2);
let minY = y0;
for (let i = 0; i < 14; i++) { await page.waitForTimeout(40); minY = Math.min(minY, (await pipState(page)).y); }
console.log(`Tipp-Sprung: ${(y0 - minY).toFixed(0)}px`);
check('Tippen springt (kurz)', y0 - minY > 10 && y0 - minY < 45);

// 3) Halten → Gleiten
await page.waitForTimeout(500);
await down(2, 700, 400);
let sawGlide = false;
for (let i = 0; i < 40; i++) { await page.waitForTimeout(40); if ((await pipState(page)).state === 'glide') { sawGlide = true; break; } }
check('Halten öffnet den Schirm', sawGlide);
await page.screenshot({ path: `${OUT}t02_glide.png` });

// 4) Hoch teleportieren, dann Wisch nach unten → Sturzflug, Finger loslassen → Aufschwung
await up(2); await up(1);
await page.waitForTimeout(600);
await page.evaluate(() => { const p = window.__game.scene.getScene('Play').pip; p.body.reset(300, 30); });
await page.waitForTimeout(60);
await down(1, 200, 400); await move(1, 260, 400);
await down(2, 700, 300);
for (let i = 0; i < 40; i++) { await page.waitForTimeout(30); if ((await pipState(page)).state === 'glide') break; }
await page.waitForTimeout(200);
// Wisch: 4 Schritte innerhalb ~100ms nach unten
for (let i = 1; i <= 4; i++) { await move(2, 700, 300 + i * 25); await page.waitForTimeout(16); }
await page.waitForTimeout(150);
s = await pipState(page); logState('swipe down', s);
check('Wisch nach unten → Sturzflug', s.state === 'dive');
await page.screenshot({ path: `${OUT}t03_dive.png` });
await page.waitForTimeout(150);
// Wisch nach oben → hochziehen, Finger bleibt → Schirm wieder offen
for (let i = 1; i <= 4; i++) { await move(2, 700, 400 - i * 25); await page.waitForTimeout(16); }
await page.waitForTimeout(60);
s = await pipState(page); logState('swipe up', s);
check('Wisch nach oben → Aufschwung', s.vy < -150);
let reglide = false;
for (let i = 0; i < 40; i++) { await page.waitForTimeout(40); if ((await pipState(page)).state === 'glide') { reglide = true; break; } }
check('Nach Aufschwung wieder Gleiten (Finger gehalten)', reglide);
await up(2); await up(1);
await page.waitForTimeout(100);
t = await touch();
check('Loslassen setzt alle Touch-Flags zurück', !t.jumpHeld && !t.diveHeld && t.axisX === 0);

// 5) Aktionsknopf
const btn = await page.evaluate(() => {
  const tc = window.__game.scene.getScene('UI').touchControls;
  const sc = window.__game.scale;
  const r = sc.canvas.getBoundingClientRect();
  return { x: r.left + tc.actionPos.x * (r.width / 480), y: r.top + tc.actionPos.y * (r.height / 270) };
});
await down(3, btn.x, btn.y);
await page.waitForTimeout(30);
t = await touch();
check('Aktionsknopf erkannt', t.actionHeld === true);
await page.screenshot({ path: `${OUT}t04_action.png` });
await up(3);

// 6) Hochformat → Hinweis sichtbar und Spiel pausiert
await page.setViewportSize({ width: 540, height: 960 });
await page.waitForTimeout(300);
const portrait = await page.evaluate(() => ({
  hint: getComputedStyle(document.getElementById('rotate-hint')).display,
  paused: window.__game.scene.isPaused('Play'),
}));
check('Hochformat zeigt Hinweis', portrait.hint === 'flex');
check('Hochformat pausiert das Spiel', portrait.paused === true);
await page.screenshot({ path: `${OUT}t05_portrait.png` });
await page.setViewportSize({ width: 960, height: 540 });
await page.waitForTimeout(300);
const back = await page.evaluate(() => ({ hint: getComputedStyle(document.getElementById('rotate-hint')).display, paused: window.__game.scene.isPaused('Play') }));
check('Querformat: Hinweis weg, Spiel läuft', back.hint === 'none' && back.paused === false);

// 7) Manifest & Service Worker erreichbar
const manifest = await page.evaluate(async () => (await fetch('./manifest.webmanifest')).ok);
const sw = await page.evaluate(async () => { const r = await fetch('./sw.js'); return r.ok ? (await r.text()).includes('__BUILD__') ? 'unstamped' : 'ok' : 'missing'; });
check('Manifest erreichbar', manifest);
check('Service Worker mit Build-Kennung', sw === 'ok');
const swReg = await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return !!r; });
check('Service Worker registriert', swReg);

await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
