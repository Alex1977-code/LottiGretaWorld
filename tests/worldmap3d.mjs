// 3D-Weltkarte: Insel in Three.js laden, Treffflächen/Projektion, Laufen per Touch, Figurwechsel,
// Levelstart und Rückkehr zur Karte, Kennzahlen, keine Konsolenfehler.
// Aufruf: npm run build && node tests/worldmap3d.mjs
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4189;
const URL_BASE = `http://localhost:${PORT + Number(process.env.PORT_BASE ?? 0)}/?scale=2&r3d=1&adapt=0`;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser({ hasTouch: true });
const { check, summary } = makeChecker();
const sc = (fn, arg) => page.evaluate(fn, arg);
const active = (k) => sc((k) => window.__game.scene.isActive(k), k);
const mapState = () => sc(() => { const m = window.__game.scene.getScene('WorldMap'); return { current: m.current, moving: m.moving, heroX: m.hero.x, heroY: m.hero.y }; });
const renderInfo = () => sc(() => {
  const v = window.__mapView3d; const r = v.renderer.info.render;
  return { calls: r.calls, tris: r.triangles, trees: v.treeCount, canvas: [v.canvas.width, v.canvas.height], display: v.canvas.style.display, cam: v.camera.position.toArray().map((n) => +n.toFixed(2)), dist: +v.camDist.toFixed(2) };
});
const waitMap = async () => {
  try { await page.waitForFunction(() => window.__game && window.__game.scene.isActive('WorldMap') && window.__mapView3d, null, { timeout: 40000 }); }
  catch { console.log('3D-Karte startet nicht:', errors); stop(); process.exit(1); }
  // Einblendung abwarten (die ersten Frames sind im Software-Renderer langsam: Shader-Übersetzung)
  try { await page.waitForFunction(() => !window.__game.scene.getScene('WorldMap').cameras.main.fadeEffect.isRunning, null, { timeout: 30000 }); } catch { console.log('  (Einblendung hängt)'); }
};
const waitArrival = async () => { for (let i = 0; i < 150; i++) { await page.waitForTimeout(100); if (!(await mapState()).moving) break; } };
const waitFor = async (fn, ms = 5000) => { try { await page.waitForFunction(fn, null, { timeout: ms }); return true; } catch { return false; } };

// Spielstand: Level 1 geschafft (Pfad zu 2 frei), Figur Lotti, Start auf Level 1
await page.goto(URL_BASE, { waitUntil: 'load' });
await page.evaluate(() => {
  localStorage.clear();
  localStorage.setItem('lotti-greta-save-v1', JSON.stringify({ version: 1, hero: 'lotti', current: 'level1', levels: { level1: { done: true, secret: false, coins: [true, true, false, false, false] } } }));
});
await page.reload({ waitUntil: 'load' });
await waitMap();
await page.waitForTimeout(400);
await page.evaluate(() => {
  const canvas = window.__game.canvas;
  window.__tap = (wx, wy) => {
    const r = canvas.getBoundingClientRect();
    const x = r.left + wx * (r.width / 480), y = r.top + wy * (r.height / 270);
    const mk = () => new Touch({ identifier: 9, target: canvas, clientX: x, clientY: y, pageX: x, pageY: y, screenX: x, screenY: y, radiusX: 8, radiusY: 8, force: 1 });
    canvas.dispatchEvent(new TouchEvent('touchstart', { touches: [mk()], targetTouches: [mk()], changedTouches: [mk()], bubbles: true, cancelable: true }));
    canvas.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [mk()], bubbles: true, cancelable: true }));
  };
});
await page.screenshot({ path: `${OUT}m3d_01_map.png` });
check('Weltkarte in 3D aktiv', await active('WorldMap') && (await sc(() => !!window.__mapView3d && window.__game.registry.get('render3d') === true)));
let info = await renderInfo();
console.log('  Render-Info', JSON.stringify(info));
check('3D-Leinwand sichtbar und mit Größe', info.display !== 'none' && info.canvas[0] > 0 && info.canvas[1] > 0);
check('Zeichenaufrufe unter 60 (inkl. Schattenpass und Heldin)', info.calls > 0 && info.calls < 60);
check('Dreiecke unter 120k', info.tris > 0 && info.tris < 120000);
check('Bäume verteilt', info.trees >= 20);

// Projektion: alle Knoten im Bild, mit Platz für Titel (oben) und Info/Start (unten)
const nodes = await sc(() => { const m = window.__game.scene.getScene('WorldMap'); return Object.fromEntries(Object.entries(m.nodeSprites).map(([k, c]) => [k, { x: +c.x.toFixed(1), y: +c.y.toFixed(1) }])); });
console.log('  Knoten (Kartenpixel):', JSON.stringify(nodes));
check('Alle Knoten im Bild (x 30…450, y 70…225)', Object.values(nodes).every((p) => p.x > 30 && p.x < 450 && p.y > 70 && p.y < 225));
const hs = await sc(() => ({ ...window.__mapView3d.heroScreen }));
console.log('  Figur (Kartenpixel):', JSON.stringify(hs));
check('Figur steht (projiziert) nahe bei Knoten 1', Math.hypot(hs.x - nodes.level1.x, hs.y - nodes.level1.y) < 20);

// Treffflächen sichtbar machen (Debug-Kreise an den Container-Positionen und der Figur)
await sc(() => {
  const m = window.__game.scene.getScene('WorldMap');
  const g = m.add.graphics().setDepth(50);
  for (const c of Object.values(m.nodeSprites)) { g.lineStyle(1.5, 0xff00ff, 1); g.strokeCircle(c.x, c.y, 20); g.fillStyle(0xff00ff, 1); g.fillCircle(c.x, c.y, 2); }
  const h = window.__mapView3d.heroScreen; g.lineStyle(1.5, 0x00ffff, 1); g.strokeCircle(h.x, h.y, 24);
  window.__dbg = g;
});
await page.waitForTimeout(100);
await page.screenshot({ path: `${OUT}m3d_01b_hitareas.png` });
await sc(() => { window.__dbg.destroy(); window.__dbg = null; });

// Gesperrter Knoten: Tipp auf 3 bewirkt nichts
await sc((n) => window.__tap(n.level3.x, n.level3.y), nodes);
await page.waitForTimeout(300);
check('Tipp auf gesperrten Knoten 3: Figur bleibt', !(await mapState()).moving && (await mapState()).current === 'level1');

// Knoten 2 antippen (Touch an der projizierten Position) → Figur läuft los und kommt an
await sc((n) => window.__tap(n.level2.x, n.level2.y), nodes);
check('Touch auf Knoten 2: Figur läuft los', await waitFor(() => window.__game.scene.getScene('WorldMap').moving, 3000));
await page.waitForTimeout(250);
let ms = await mapState();
let speed = 0;
for (let i = 0; i < 6; i++) { speed = Math.max(speed, await sc(() => Math.abs(window.__game.scene.getScene('WorldMap').hero.body.velocity.x))); await page.waitForTimeout(60); }
console.log('  Lauftempo (Ersatzkörper):', speed.toFixed(0), 'px/s');
check('Ersatzkörper meldet Lauftempo (> 30 px/s)', speed > 30);
await page.screenshot({ path: `${OUT}m3d_02_walk.png` });
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}m3d_03_walk.png` });
await waitArrival();
ms = await mapState();
check('Figur steht auf Knoten 2', ms.current === 'level2' && !ms.moving);
check('Position gespeichert', (await sc(() => JSON.parse(localStorage.getItem('lotti-greta-save-v1')).current)) === 'level2');
const hs2 = await sc(() => ({ ...window.__mapView3d.heroScreen }));
check('Figur (projiziert) nahe bei Knoten 2', Math.hypot(hs2.x - nodes.level2.x, hs2.y - nodes.level2.y) < 20);
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}m3d_04_level2.png` });

// Tastatur: links zurück zu Knoten 1
await page.keyboard.press('ArrowLeft');
check('Pfeil links: Figur läuft zurück', await waitFor(() => window.__game.scene.getScene('WorldMap').moving, 3000));
await waitArrival();
check('Figur wieder auf Knoten 1', (await mapState()).current === 'level1');

// Figurwechsel per Porträt-Tipp → Avatar wechselt (Textur-Key)
await sc(() => { const m = window.__game.scene.getScene('WorldMap'); const c = m.heroPicker.greta.c; window.__tap(c.x, c.y); });
const swapped = await waitFor(() => window.__game.scene.getScene('WorldMap').heroKey === 'greta' && window.__mapView3d.heroAvatar?.textureKey === 'greta', 4000);
const sw = await sc(() => ({ key: window.__game.scene.getScene('WorldMap').heroKey, av: window.__mapView3d.heroAvatar?.textureKey }));
console.log('  Figurwechsel:', JSON.stringify(sw));
check('Porträt-Tipp wählt Greta, Avatar wechselt', swapped);
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}m3d_05_greta.png` });

// Tipp auf die Figur startet das Level (3D-Levelansicht erscheint)
await sc(() => { const h = window.__mapView3d.heroScreen; window.__tap(h.x, h.y); });
try { await page.waitForFunction(() => window.__game.scene.isActive('Play') && window.__view3d, null, { timeout: 15000 }); } catch { /* unten geprüft */ }
await page.waitForTimeout(500);
check('Tipp auf die Figur startet das Level, 3D-Levelansicht aktiv', await active('Play') && (await sc(() => !!window.__view3d && !window.__mapView3d)));
check('Level nutzt Greta', (await sc(() => window.__game.scene.getScene('Play').hero.texture.key)) === 'greta');
await page.screenshot({ path: `${OUT}m3d_06_level.png` });

// Pause → zurück zur Karte: Karte wieder in 3D
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
await sc(() => window.__game.scene.getScene('Pause').toMap());
await waitMap();
await page.waitForTimeout(700);
check('Zurück auf der Karte: 3D-Karte aktiv, Levelansicht weg', await active('WorldMap') && (await sc(() => !!window.__mapView3d && !window.__view3d && document.getElementById('gl3d').style.display !== 'none')));
info = await renderInfo();
console.log('  Render-Info (zurück)', JSON.stringify(info));
await page.screenshot({ path: `${OUT}m3d_07_back.png` });

// Start-Knopf → Level startet erneut
await sc(() => { const m = window.__game.scene.getScene('WorldMap'); window.__tap(m.startBtn.x, m.startBtn.y); });
try { await page.waitForFunction(() => window.__game.scene.isActive('Play') && window.__view3d, null, { timeout: 15000 }); } catch { /* unten geprüft */ }
await page.waitForTimeout(300);
check('Start-Knopf startet das Level', await active('Play') && (await sc(() => !!window.__view3d)));

// Geheimweg + geschafftes Level: Fahne und Schlüssel, goldener Weg
await sc(() => { const d = JSON.parse(localStorage.getItem('lotti-greta-save-v1')); d.levels.level1.secret = true; d.levels.level2 = { done: true, secret: false, coins: [true, true, true, true, true] }; d.current = 'level2'; localStorage.setItem('lotti-greta-save-v1', JSON.stringify(d)); });
await page.goto(URL_BASE, { waitUntil: 'load' });
await waitMap();
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}m3d_08_secret.png` });
const un = await sc(() => { const m = window.__game.scene.getScene('WorldMap'); return m.world.nodes.map((n) => n.key).filter((k) => m.nodeSprites[k].getData('unlocked')); });
check('Geheimweg schaltet Level 3 frei', un.includes('level3'));
const markers = await sc(() => window.__mapView3d.markers.state.map((s) => [s.unlocked, s.done, s.secret]));
check('Podeste: Fahnen an 1 und 2, Schlüssel an 1', markers[0][1] && markers[0][2] && markers[1][1] && !markers[2][1]);

// Rückkehr aus Level 2 (normaler Ausgang): neu freigeschalteter Knoten 3 hüpft
await sc(() => window.__game.scene.getScene('WorldMap').scene.restart({ from: 'level2', exit: 'normal' }));
await waitMap();
// Hüpfer ist zeitabhängig (unter Last schon vorbei) – deshalb zusätzlich das Protokoll der Podeste prüfen
const liftSeen = await waitFor(() => {
  const v = window.__mapView3d; if (!v) return false;
  const arr = v.markers.podiums.instanceMatrix.array; // Spalte 4 = Position, Index 13 = y (Instanz 2 = Knoten 3)
  return arr[2 * 16 + 13] - v.markers.state[2].y > 0.2;
}, 4000);
await page.screenshot({ path: `${OUT}m3d_09_hop.png` });
const hopLogged = await sc(() => window.__mapView3d.markers.hopped.has('level3'));
console.log('  Hüpfer: gesehen', liftSeen, '/ protokolliert', hopLogged);
check('Neu freigeschalteter Knoten 3 hüpft nach der Rückkehr', hopLogged);

check('Keine Konsolenfehler', errors.length === 0);
await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
