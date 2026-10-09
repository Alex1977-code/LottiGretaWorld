// Kurs-Weltkarte (CourseMap): Weltdaten (Erreichbarkeit hinter Schranken), Laden ohne Konsolenfehler, Freischaltung,
// Laufen zum Eingang 1-1 + A → Level startet, Rückkehr mit { done } → 1-2 frei und Schranke weg (Kollision!),
// 1-Burg bei < 10 Sternen zu, Beerenhaus → Power-up im nächsten Level, wandernde Gegnergruppe startet 1-A,
// Klassik-Knopf → 'WorldMap' (und zurück), Figurwechsel (Tab, Porträt), Touch-„Los!“, Spielstand löschen.
// Simulation deterministisch über window.__courseMap.step(n)/setInput; Bilder nur zur Sichtprüfung
// (tests/out/cmap_*.png). Gibt es ein Level noch nicht (z. B. 1-1), startet der Eingang über den Testparameter
// mapAlias das Übungslevel 0-0.
// Aufruf: npm run build && PORT_BASE=1800 node tests/course_map.mjs
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';
import { MAP } from '../src/course/map/worlds/w1.js';
import { buildWalkGrid, reachable, gateRects } from '../src/course/map/layout.js';

const { check, summary } = makeChecker();

// ------------------------------------------------------------------ 1) Weltdaten (Node)
{
  const grid = buildWalkGrid(MAP);
  const order = ['1-1', '1-2', '1-A', '1-3', '1-Schatz', '1-4', '1-5', '1-Burg', 'W2'];
  const after = Object.fromEntries(MAP.levels.map((l) => [l.id, [].concat(l.after ?? [])]));
  let ok = true;
  // Jede Kombination „Vorgänger geschafft“ entlang der Reihenfolge: erreichbar sind genau die Eingänge mit offenem Weg
  const open = new Set();
  for (let i = 0; i <= order.length; i++) {
    const done = new Set(order.slice(0, i));
    for (const id of order) if (after[id].every((a) => done.has(a))) open.add(id);
    const r = reachable(MAP, grid, open).ids.sort();
    const want = order.filter((id) => open.has(id)).sort();
    if (r.join() !== want.join()) { ok = false; console.log('   erreichbar', r.join(), 'erwartet', want.join()); }
  }
  check('Weltdaten: jede Schranke riegelt ihren Bereich vollständig ab', ok);
  check('Weltdaten: 8 Schranken, je 4 m breit', gateRects(MAP, grid).length === 8 && gateRects(MAP, grid).every((g) => Math.abs(g.width - 4) < 0.01));
  check('Weltdaten: alle Welt-1-Ids aus dem Vertrag', ['1-1', '1-2', '1-A', '1-3', '1-Schatz', '1-4', '1-5', '1-Burg'].every((id) => MAP.levels.some((l) => l.id === id)));
  const burg = MAP.levels.find((l) => l.id === '1-Burg');
  check('Weltdaten: 1-Burg nach 1-5 und ab 10 Sternen; Welt hat 24 Sterne', burg.after === '1-5' && burg.minStars === 10 && MAP.levels.filter((l) => !l.world || l.world === 1).reduce((n, l) => n + (l.stars ?? 0), 0) === 24);
}

// ------------------------------------------------------------------ Browser
const PORT = 4194;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser({ hasTouch: true });
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const active = (k) => sc((key) => window.__game.scene.isActive(key), k);
const shot = async (name, wait = 1200) => { await page.waitForTimeout(wait); await page.screenshot({ path: `${OUT}cmap_${name}.png` }); };
const fail = async (msg) => { console.log(msg); for (const e of errors) console.log('  ', e); await browser.close(); stop(); process.exit(1); };

async function waitMap() {
  try {
    await page.waitForFunction(() => window.__courseMap && window.__courseMap.player && window.__game.scene.isActive('CourseMap'), null, { timeout: 60000 });
  } catch { await fail('Kurs-Weltkarte startet nicht.'); }
  await sc(() => { const m = window.__courseMap; m.setManual(true); m.level.muted = true; m.setInput({}); });
  await page.waitForTimeout(1500); // Einblenden (Software-Renderer: erste Bilder langsam)
}
async function waitCourse() {
  try {
    await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('Course'), null, { timeout: 60000 });
  } catch { await fail('Kurs-Level startet nicht.'); }
  await sc(() => { const c = window.__course; c.setManual(true); c.level.muted = true; });
}
/** Echte Touch-Ereignisse auf Logik-Koordinaten (480x270). */
async function installTap() {
  await sc(() => {
    const canvas = window.__game.canvas;
    window.__tap = (wx, wy) => {
      const r = canvas.getBoundingClientRect();
      const x = r.left + wx * (r.width / 480), y = r.top + wy * (r.height / 270);
      const mk = () => new Touch({ identifier: 7, target: canvas, clientX: x, clientY: y, pageX: x, pageY: y, screenX: x, screenY: y, radiusX: 8, radiusY: 8, force: 1 });
      canvas.dispatchEvent(new TouchEvent('touchstart', { touches: [mk()], targetTouches: [mk()], changedTouches: [mk()], bubbles: true, cancelable: true }));
      canvas.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [mk()], bubbles: true, cancelable: true }));
    };
  });
}
/** Figur in Richtung (x, z) laufen lassen, bis cond(state) erfüllt ist (höchstens max Schritte). */
const walkTo = (x, z, cond, max = 900, run = false) => sc(([tx, tz, c, mx, rn]) => {
  const m = window.__courseMap;
  const f = new Function('s', `return (${c})(s);`);
  for (let i = 0; i < mx; i++) {
    const p = m.player.pos;
    const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
    m.setInput(d < 0.15 ? {} : { x: dx / d, y: -dz / d, run: rn });
    const s = m.step(1);
    if (s.leaving || f(s)) { m.setInput({}); return { i, s }; }
  }
  m.setInput({});
  return { i: mx, s: m.state() };
}, [x, z, cond.toString(), max, run]);

// Erster Start ohne Spielstand; fehlende Level über mapAlias auf 0-0 umleiten
await page.goto(`http://localhost:${port}/?map=1&scale=2&adapt=0`, { waitUntil: 'load' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'load' });
await waitMap();
const exists = await sc(() => ({ a: window.__courseMap.status('1-1').exists, b: window.__courseMap.status('1-A').exists }));
const alias = [exists.a ? null : '1-1:0-0', exists.b ? null : '1-A:0-0'].filter(Boolean).join(',');
const T11 = exists.a ? '1-1' : '0-0', T1A = exists.b ? '1-A' : '0-0';
console.log('  Ersatz-Ids:', alias || 'keine');
const URL_MAP = `http://localhost:${port}/?map=1&scale=2&adapt=0${alias ? `&mapAlias=${alias}` : ''}`;
await page.goto(URL_MAP, { waitUntil: 'load' });
await waitMap();
await installTap();

// ------------------------------------------------------------------ 2) Start: nur 1-1 frei
let st = await sc(() => window.__courseMap.state());
console.log('  Start', JSON.stringify(st.player), 'Sterne', st.stars, '/', st.starsMax);
check('Karte lädt (CourseMap aktiv, Figur am Startpunkt)', (await active('CourseMap')) && Math.abs(st.player.z - 40.5) < 0.5);
const unlockedIds = Object.entries(st.entrances).filter(([, e]) => !e.locked).map(([id]) => id);
check('Nur 1-1 frei', unlockedIds.join() === '1-1');
check('Alle Schranken geschlossen', Object.values(st.gates).every((g) => g === 'closed'));
check('Gesamtsterne 0/24 im HUD', st.stars === 0 && st.starsMax === 24 && (await sc(() => window.__courseMap.hud.starText.text)) === '0/24');
check('1-Burg: gesperrt', st.entrances['1-Burg'].locked);
await sc(() => window.__courseMap.snapCamera());
await shot('start', 2500);

// Schranke 1-2 hält auf (Kollision)
let r = await sc(() => { const m = window.__courseMap; m.teleport(-6, 1, 23.5, Math.PI / 2); m.setInput({ y: 1 }); m.step(160); m.setInput({}); return m.player.info(); });
check('Geschlossene Schranke 1-2 hält die Figur auf', r.z > 20.4);
await sc(() => window.__courseMap.snapCamera());
await shot('schranke_zu');

// ------------------------------------------------------------------ 3) Zum Eingang 1-1 laufen, A → Level
await sc(() => { const m = window.__courseMap; m.teleport(2, 1, 40.5, Math.PI / 2); m.step(20); });
r = await walkTo(2, 31, (s) => s.onPad === '1-1', 900);
await sc(() => { const m = window.__courseMap; m.setInput({}); m.step(30); m.snapCamera(); });
st = await sc(() => window.__courseMap.state());
console.log('  auf 1-1 nach', r.i, 'Schritten', JSON.stringify(st.player));
check('Laufen zum Eingang 1-1: Figur steht auf dem Podest', st.onPad === '1-1');
await sc(() => window.__courseMap.hud.touchCtl.setVisible(true));
await sc(() => window.__courseMap.step(1));
await page.waitForFunction(() => window.__courseMap.hud.goBtn.visible, null, { timeout: 15000 }).catch(() => {});
await shot('eingang_11_touch', 1000);
check('Touch: „Los!“-Knopf erscheint auf freiem Eingang', (await sc(() => window.__courseMap.state().goVisible)));
await sc(() => window.__courseMap.hud.touchCtl.setVisible(false));
await sc(() => window.__courseMap.setInput({ jump: true }));
st = await sc(() => window.__courseMap.step(1));
check('A auf dem Podest startet das Level', st.leaving && st.lastStart?.entrance === '1-1' && st.lastStart?.id === T11);
await waitCourse();
check(`Szene Course läuft mit id ${T11}`, (await sc(() => window.__course.levelId)) === T11);

// Level „abschließen“: zwei Sterne + Stempel, Zielmast, Ergebnis → Weiter
await sc(() => { const rt = window.__course.level.runtime; rt.collectStar(0); rt.collectStar(2); rt.collectStamp(); rt.reachGoal(0.5); rt.finish(); });
await page.waitForFunction(() => window.__game.scene.isActive('CourseResult'), null, { timeout: 10000 }).catch(() => {});
check('Ergebnis-Szene nach dem Levelabschluss', await active('CourseResult'));
await sc(() => window.__course.exitToMap({ done: window.__course.levelId }));
await waitMap();

// ------------------------------------------------------------------ 4) Rückkehr: Figur vor 1-1, Schranke öffnet sich
st = await sc(() => window.__courseMap.state());
console.log('  zurück', JSON.stringify(st.player), 'Schwenk', st.cinematic);
check('Rückkehr: Figur steht vor dem Eingang 1-1', Math.hypot(st.player.x - 2, st.player.z - 33.6) < 0.6);
check('1-1 geschafft, 1-2 frei, 1-3 noch zu', st.entrances['1-1'].done && !st.entrances['1-2'].locked && st.entrances['1-3'].locked);
check('Sterne gezählt (2/24) und Stempel an 1-1', st.stars === 2 && st.entrances['1-1'].stamp);
check('Freischalt-Animation läuft (Kamera-Schwenk, Eingabe gesperrt)', st.cinematic && st.gates['1-2'] === 'closed');
await sc(() => { const m = window.__courseMap; m.step(150); m.snapCamera(); });
await shot('schranke_oeffnet', 1600);
st = await sc(() => window.__courseMap.step(500));
check('Schranke 1-2 nach der Animation weg', st.gates['1-2'] === 'open' && !st.cinematic && st.gates['1-3'] === 'closed');
r = await sc(() => { const m = window.__courseMap; m.teleport(-6, 1, 23.5, Math.PI / 2); m.setInput({ y: 1 }); m.step(200); m.setInput({}); return m.player.info(); });
check('Weg zu 1-2 begehbar (Kollision der Schranke entfernt)', r.z < 17.5);
await sc(() => { const m = window.__courseMap; m.step(20); m.snapCamera(); });
await shot('weg_frei');
const opened = await sc(() => JSON.parse(localStorage.getItem('lotti-greta-course-v1')).mapOpened);
check('Geöffnete Schranke gespeichert (keine zweite Animation)', opened.includes('1-2'));

// ------------------------------------------------------------------ 5) Figurwechsel (Tab, Porträt)
await page.keyboard.press('Tab');
await page.waitForTimeout(300);
r = await sc(() => ({ hero: window.__courseMap.player.hero, saved: window.__courseSave.hero }));
check('Tab wechselt die Figur (Lotti → Greta)', r.hero === 'greta' && r.saved === 'greta');
await sc(() => { const m = window.__courseMap; const c = m.hud.heroPicker.lotti.c; window.__tap(c.x, c.y); });
await page.waitForTimeout(300);
r = await sc(() => window.__courseMap.player.hero);
check('Porträt-Knopf wählt Lotti', r === 'lotti');

// ------------------------------------------------------------------ 6) Beerenhaus: Gratis-Power-up
st = await sc(() => window.__courseMap.state());
check('Beerenhaus bietet ein Power-up an', st.berry === true);
await sc(() => { const m = window.__courseMap; m.teleport(-21, 1, 45.2, Math.PI / 2); m.step(20); });
r = await walkTo(-21, 42.6, (s) => !s.berry, 300);
st = r.s;
check('Beerenhaus: Power-up eingesammelt und eingepackt', !st.berry && !!st.carryPower && st.player.power === st.carryPower);
const carried = st.carryPower;
await sc(() => { const m = window.__courseMap; m.step(30); m.snapCamera(); });
await shot('beerenhaus');

// mit Touch-„Los!“ in 1-1 → Power-up wird im Level eingelöst
await sc(() => { const m = window.__courseMap; m.teleport(2, 1, 33.6, Math.PI / 2); m.step(10); });
r = await walkTo(2, 31, (s) => s.onPad === '1-1', 300);
await sc(() => { const m = window.__courseMap; m.step(20); m.hud.touchCtl.setVisible(true); m.step(1); });
await page.waitForFunction(() => window.__courseMap.hud.goBtn.visible, null, { timeout: 15000 }).catch(() => {});
r = await sc(() => { const m = window.__courseMap; const b = m.hud.goBtn; return { x: b.x, y: b.y, vis: b.visible, pad: m.onPad?.id ?? null, locked: m.inputLocked, p: m.player.info() }; });
if (!r.vis) console.log('  „Los!“ nicht sichtbar:', JSON.stringify(r));
await sc(([x, y]) => window.__tap(x, y), [r.x, r.y]);
await waitCourse();
r = await sc(() => ({ id: window.__course.levelId, power: window.__course.player.power, left: window.__courseSave.carryPower }));
check('Touch-„Los!“ startet das Level', r.id === T11);
check(`Mitgebrachtes Power-up (${carried}) im Level aktiv, danach verbraucht`, r.power === carried && r.left === null);
await sc(() => window.__course.exitToMap({}));
await waitMap();
st = await sc(() => window.__courseMap.state());
check('Beerenhaus: neuer Besuch → wieder ein Power-up', st.berry === true && st.player.power === 'none');

// ------------------------------------------------------------------ 7) 1-2 … 1-5 geschafft, 4 Sterne → Burg bleibt zu
await sc(() => {
  const s = window.__courseSave;
  s.completeLevel('1-2', { stars: [true, false, false] });
  for (const id of ['1-3', '1-4', '1-5']) s.completeLevel(id, { stars: [false, false, false] });
  for (const id of ['1-A', '1-3', '1-Schatz', '1-4', '1-5', '1-Burg']) s.markMapOpened(id);
  const old = window.__courseMap;
  window.__courseMap = null;
  old.scene.restart({});
});
await waitMap();
st = await sc(() => window.__courseMap.state());
console.log('  Sterne', st.stars, 'Burg', JSON.stringify(st.entrances['1-Burg']), 'Schranken', JSON.stringify(st.gates));
check('Weg zur Burg offen, Burg bei 3 Sternen zu („Benötigt 10 Sterne“)', st.gates['1-Burg'] === 'open' && st.entrances['1-Burg'].locked && st.entrances['1-Burg'].reason === 'stars');
await sc(() => { const m = window.__courseMap; m.teleport(-18, 5.3, -61.5, -Math.PI / 2); m.step(30); m.enter(); m.step(2); m.snapCamera(); });
st = await sc(() => window.__courseMap.state());
check('Enter auf dem gesperrten Burg-Eingang startet nichts', st.onPad === '1-Burg' && !st.leaving);
await shot('burg_zu', 1600);
check('Hinweis „Benötigt 10 Sterne“ in der Hinweis-Leiste', (await sc(() => window.__courseMap.hud.bannerStatus.text)).startsWith('Benötigt 10 Sterne'));
await sc(() => { const m = window.__courseMap; m.teleport(-10, 5.3, -86, -Math.PI / 2); m.step(30); m.snapCamera(); });
await shot('glasroehre', 1400);

// ------------------------------------------------------------------ 8) Wandernde Gegnergruppe → 1-A
st = await sc(() => window.__courseMap.state());
check('1-A frei, zwei Rammbock-Bullen unterwegs', !st.entrances['1-A'].locked && st.roamers.length === 2);
await sc(() => { const m = window.__courseMap; m.teleport(-36.5, 1, -17, Math.PI); m.step(30); m.snapCamera(); });
await shot('bullen', 1400);
r = await sc(() => {
  const m = window.__courseMap;
  for (let i = 0; i < 900; i++) {
    const p = m.player.pos;
    const b = m.roamers.filter((e) => e.alive).sort((a, c) => a.pos.distanceTo(p) - c.pos.distanceTo(p))[0];
    const dx = b.pos.x - p.x, dz = b.pos.z - p.z, d = Math.hypot(dx, dz) || 1;
    m.setInput({ x: dx / d, y: -dz / d });
    const s = m.step(1);
    if (s.leaving) return { i, s };
  }
  return { i: 900, s: m.state() };
});
check('Berührung der Gegnergruppe startet 1-A', r.s.leaving && r.s.lastStart?.entrance === '1-A' && r.s.lastStart?.id === T1A);
await waitCourse();
await sc(() => { const rt = window.__course.level.runtime; rt.collectStar(0); rt.reachGoal(0.9); rt.finish(); });
await page.waitForFunction(() => window.__game.scene.isActive('CourseResult'), null, { timeout: 10000 }).catch(() => {});
await sc(() => window.__course.exitToMap({ done: window.__course.levelId }));
await waitMap();
st = await sc(() => window.__courseMap.state());
check('Nach dem Sieg: Gegnergruppe verschwunden, 1-A geschafft (Podest mit Fahne)', st.roamers.length === 0 && st.entrances['1-A'].done
  && (await sc(() => window.__courseMap.built.entrances.get('1-A').podiumGroup.visible)));
check('Rückkehr: Figur vor dem 1-A-Podest', Math.hypot(st.player.x + 38, st.player.z + 17) < 0.6);
await sc(() => { const m = window.__courseMap; m.step(30); m.snapCamera(); });
await shot('arena_geschafft', 1400);

// ------------------------------------------------------------------ 9) Ton, Klassik-Knopf → WorldMap → 3D-Kurs zurück
const muted0 = await sc(() => window.__audio.engine.muted);
await sc(() => { const b = window.__courseMap.hud.muteBtn; window.__tap(b.x, b.y); });
await page.waitForTimeout(200);
check('Ton-Knopf schaltet um', (await sc(() => window.__audio.engine.muted)) === !muted0);
await sc(() => { const b = window.__courseMap.hud.muteBtn; window.__tap(b.x, b.y); });
await sc(() => { const m = window.__courseMap; m.teleport(2, 1, 40, -Math.PI / 2); m.step(20); m.hud.touchCtl.setVisible(true); m.step(1); m.snapCamera(); });
await shot('hud_handy', 1500);
await sc(() => { const b = window.__courseMap.hud.classicBtn; window.__tap(b.x, b.y); });
await page.waitForFunction(() => window.__game.scene.isActive('WorldMap'), null, { timeout: 30000 }).catch(() => {});
check('Klassik-Knopf startet die Klassik-Weltkarte (WorldMap)', (await active('WorldMap')) && !(await active('CourseMap')));
await shot('klassik', 2500);
r = await sc(() => { const b = window.__game.scene.getScene('WorldMap').courseBtn; if (!b) return false; window.__tap(b.x, b.y); return true; });
await waitMap();
check('Klassik-Karte: Knopf „3D-Kurs“ führt zurück', r && (await active('CourseMap')));

// ------------------------------------------------------------------ 10) Spielstand löschen (mit Rückfrage)
await sc(() => { const b = window.__courseMap.hud.resetBtn; window.__tap(b.x, b.y); });
await page.waitForTimeout(300);
check('„Neu“ fragt nach', (await sc(() => !!window.__courseMap.hud.confirm)));
await shot('loeschen_frage', 800);
await sc(() => { const b = window.__courseMap.hud.confirm.no; window.__tap(b.x, b.y); });
await page.waitForTimeout(300);
check('„Nein“ behält den Spielstand', (await sc(() => !window.__courseMap.hud.confirm && window.__courseSave.peek('1-1')?.done === true)));
await sc(() => { const b = window.__courseMap.hud.resetBtn; window.__tap(b.x, b.y); });
await page.waitForTimeout(300);
await sc(() => { const b = window.__courseMap.hud.confirm.yes; window.__tap(b.x, b.y); window.__courseMap = null; });
await waitMap();
st = await sc(() => window.__courseMap.state());
check('„Ja, löschen“: Spielstand leer, nur 1-1 frei', Object.entries(st.entrances).filter(([, e]) => !e.locked).map(([id]) => id).join() === '1-1' && st.stars === 0);

// Kennzahlen der Karte
const stats = await sc(() => window.__courseMap.stats());
console.log('  Kennzahlen', JSON.stringify(stats));
check('Kennzahlen im Budget (< 120 Zeichenaufrufe, < 300 k Dreiecke)', stats.calls < 120 && stats.triangles < 300000);

// ------------------------------------------------------------------ 11) Startfluss
await page.goto(`http://localhost:${port}/?scale=2&adapt=0`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game && (window.__game.scene.isActive('CourseMap') || window.__game.scene.isActive('WorldMap')), null, { timeout: 60000 }).catch(() => {});
check('Ohne Parameter startet die Kurs-Weltkarte', (await active('CourseMap')) && !(await active('WorldMap')));
await page.goto(`http://localhost:${port}/?classic=1&scale=2&adapt=0`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game && (window.__game.scene.isActive('CourseMap') || window.__game.scene.isActive('WorldMap')), null, { timeout: 60000 }).catch(() => {});
check('?classic=1 startet die Klassik-Weltkarte', (await active('WorldMap')) && !(await active('CourseMap')));
await page.goto(`http://localhost:${port}/?course=0-0&scale=2&adapt=0`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game && window.__game.scene.isActive('Course'), null, { timeout: 60000 }).catch(() => {});
check('?course=0-0 startet das Level direkt', await active('Course'));

await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
