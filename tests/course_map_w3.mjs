// Welt-3-Insel „Schnee und Eis“ der Kurs-Karte (Präzisierung Mehrwelten-Karte, Kartenelemente Welt 3):
//   Weltdaten (Schranken riegeln ab, Ids/Reihenfolge/Sternbedarf laut Vertrag, Sterne der Welt) – Node;
//   Welt 3 gesperrt, solange 2-Panzer offen ist; nach 2-Panzer: Glasröhre am Ende von Welt 2 → Fahrt übers Meer →
//   Ankunft am Start von Welt 3 (Bilder, Kennzahlen); Eingänge zeigen Titel bzw. „Bald“ (mapAlias); Sternschranken
//   35/45/55 mit Hinweis „Benötigt N Sterne (x/N)“; 3-Kapitän erscheint erst nach 3-3 (Auftauchen beim
//   Schranken-Schwenk); Zauberkröten starten 3-A; Beerenhaus, Glückshaus; Eisbahn rutschig; Glasröhre nach Welt 4
//   gesperrt bis 3-Zug, danach frei (Welt 4: tests/course_map_w4.mjs); gespeicherte Welt bleibt nach Neuladen; Rückweg nach Welt 2;
//   Kennzahlen (< 120 Zeichenaufrufe, < 300 k Dreiecke an jeder Ansicht inkl. Ankunft und Anflug).
// Simulation deterministisch über window.__courseMap.step(n)/setInput; Bilder tests/out/cmap3_*.png zur Sichtprüfung.
// Aufruf: npm run build && PORT_BASE=3700 node tests/course_map_w3.mjs   (Teilläufe: W3_TEIL=1, 2, 3 – s. u.)
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';
import { MAP as W3 } from '../src/course/map/worlds/w3.js';
import { MAP as W2 } from '../src/course/map/worlds/w2.js';
import { MAP as W1 } from '../src/course/map/worlds/w1.js';
import { buildWalkGrid, reachable, gateRects, gateSides } from '../src/course/map/layout.js';
import * as unlock from '../src/course/map/unlock.js';

const { check, summary } = makeChecker();
const W3IDS = ['3-1', '3-2', '3-3', '3-Kapitän', '3-4', '3-A', '3-5', '3-6', '3-B', '3-7', '3-Zug'];

// ------------------------------------------------------------------ 1) Weltdaten und Logik (Node)
{
  const grid = buildWalkGrid(W3);
  const order = W3.levels.map((l) => l.id);
  const after = Object.fromEntries(W3.levels.map((l) => [l.id, [].concat(l.after ?? [])]));
  let ok = true;
  const open = new Set();
  for (let i = 0; i <= order.length; i++) {
    const done = new Set(order.slice(0, i));
    for (const id of order) if (after[id].every((a) => done.has(a))) open.add(id);
    const r = reachable(W3, grid, open).ids.sort();
    const want = order.filter((id) => open.has(id)).sort();
    if (r.join() !== want.join()) { ok = false; console.log('   erreichbar', r.join(), 'erwartet', want.join()); }
  }
  check('Welt 3: jede Schranke riegelt ihren Bereich vollständig ab', ok);
  const gr = gateRects(W3, grid);
  check('Welt 3: 11 Schranken (3 m am Steg, sonst 4 m breit), jede mit Rückseite', gr.length === 11
    && gr.every((g) => Math.abs(g.width - (g.for === '3-Kapitän' ? 3 : 4)) < 0.01) && gateSides(W3, grid).every((g) => g.back !== 0));
  check('Welt 3: Ids und Reihenfolge der Welt-3-Liste', W3.levels.filter((l) => !l.next).map((l) => l.id).join() === W3IDS.join());
  const rule = (id) => W3.levels.find((l) => l.id === id);
  check('Welt 3: Freischaltung laut Vertrag (3-2 nach 3-1 ≥ 35, 3-3 nach 3-2, 3-Kapitän/3-4 nach 3-3, 3-A/3-5 nach 3-4, 3-6 nach 3-5 ≥ 45, 3-B/3-7 nach 3-6, 3-Zug nach 3-7 ≥ 55)',
    !rule('3-1').after && rule('3-2').after === '3-1' && rule('3-2').minStars === 35 && rule('3-3').after === '3-2' && rule('3-Kapitän').after === '3-3'
    && rule('3-4').after === '3-3' && rule('3-A').after === '3-4' && rule('3-5').after === '3-4' && rule('3-6').after === '3-5' && rule('3-6').minStars === 45
    && rule('3-B').after === '3-6' && rule('3-7').after === '3-6' && rule('3-Zug').after === '3-7' && rule('3-Zug').minStars === 55 && W3.starScope === 'all');
  const perLevel = { '3-1': 3, '3-2': 3, '3-3': 3, '3-Kapitän': 5, '3-4': 3, '3-A': 1, '3-5': 3, '3-6': 3, '3-B': 1, '3-7': 3, '3-Zug': 3 };
  check('Welt 3: Sterne je Eingang wie in der Welt-3-Tabelle (zusammen 31), Stempel bei Parcours/Autoscroller',
    W3IDS.every((id) => rule(id).stars === perLevel[id]) && unlock.worldStarsMax(W3) === 31
    && W3IDS.filter((id) => rule(id).stamp).join() === '3-1,3-2,3-3,3-4,3-5,3-6,3-7,3-Zug');
  check('Welt 3: Glasröhre zurück (W2, offen) und nach Welt 4 (nach 3-Zug, Vertrag Welt 4)', rule('W2').next === 2 && !rule('W2').after && rule('W4').next === 4 && rule('W4').after === '3-Zug');
  check('Welt 3: jeder Eingang hat ein Podest/eine Kulisse, 3-Kapitän erscheint erst (appear)', W3.levels.every((l) => W3.entrances.some((e) => e.id === l.id))
    && W3.entrances.find((e) => e.id === '3-Kapitän').appear === true);
  check('Welt 3: drei Zauberkröten für 3-A, Beerenhaus und Glückshaus, Eisbahn rutschig', W3.roamers.length === 1 && W3.roamers[0].level === '3-A' && W3.roamers[0].count === 3
    && W3.roamers[0].model === 'zauberkroete' && W3.houses.some((h) => h.kind === 'beeren') && W3.houses.some((h) => h.kind === 'glueck' && h.stake === 10)
    && W3.ground.some((b) => b.ice && b.walk && b.style === 'ice'));
  check('Welt 2: Glasröhre W3 nach 2-Panzer führt zu Welt 3, Schneeinsel am Horizont', W2.levels.find((l) => l.id === 'W3')?.next === 3 && W2.levels.find((l) => l.id === 'W3')?.after === '2-Panzer'
    && W2.neighbors.some((n) => n.world === 3 && n.style === 'snow'));
  const fake = (levels, worlds = [1]) => ({
    peek: (id) => levels[id] ?? null, starsInWorld: (w) => Object.entries(levels).filter(([k]) => k.startsWith(`${w}-`)).reduce((n, [, l]) => n + l.stars.filter(Boolean).length, 0),
    totalStars: () => Object.values(levels).reduce((n, l) => n + l.stars.filter(Boolean).length, 0), worldOpened: (n) => worlds.includes(n),
  });
  const maps = (n) => ({ 1: W1, 2: W2, 3: W3 }[n] ?? null);
  const d3 = { done: true, stars: [true, true, true] };
  check('worldOpen: Welt 3 zu ohne 2-Panzer, offen mit 2-Panzer oder wenn schon bereist; Welt 4 ohne Karte zu',
    !unlock.worldOpen(maps, fake({ '2-5': d3 }, [1, 2]), 3) && unlock.worldOpen(maps, fake({ '2-Panzer': d3 }, [1, 2]), 3) && unlock.worldOpen(maps, fake({}, [1, 2, 3]), 3)
    && !unlock.worldOpen(maps, fake({}, [1, 2, 3, 4]), 4));
}

// ------------------------------------------------------------------ Browser
const PORT = 4230;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser({ hasTouch: true });
page.setDefaultNavigationTimeout(200000);
page.setDefaultTimeout(200000);
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const fail = async (msg) => { console.log(msg); for (const e of errors) console.log('  ', e); await browser.close(); stop(); process.exit(1); };
const stats = [];
/** Screenshot nach mindestens 3 neuen Bildern (Software-Renderer), Kennzahlen merken. */
async function shot(name, wait = 600, snap = true) {
  if (snap) await sc(() => window.__courseMap?.snapCamera());
  const f0 = await sc(() => window.__courseMap?.view?.frame ?? 0);
  await page.waitForFunction(([f, k]) => (window.__courseMap?.view?.frame ?? 0) >= f + k, [f0, snap ? 3 : 10], { timeout: 150000 }).catch(() => {});
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__courseMap?.stats());
  if (s) stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}cmap3_${name}.png`, timeout: 200000 });
  return s;
}
async function frames(n = 3) {
  const f0 = await sc(() => window.__courseMap?.view?.frame ?? 0);
  await page.waitForFunction(([f, k]) => (window.__courseMap?.view?.frame ?? 0) >= f + k, [f0, n], { timeout: 120000 }).catch(() => {});
}
async function waitMap(world = null) {
  try {
    await page.waitForFunction((w) => window.__courseMap && window.__courseMap.player && window.__game.scene.isActive('CourseMap') && (w === null || window.__courseMap.map.world === w), world, { timeout: 200000 });
  } catch { await fail(`Kurs-Weltkarte${world ? ` (Welt ${world})` : ''} startet nicht.`); }
  await sc(() => { const m = window.__courseMap; m.setManual(true); m.level.muted = true; m.setInput({}); });
  await page.waitForTimeout(1200);
}
async function waitCourse() {
  try {
    await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('Course'), null, { timeout: 200000 });
  } catch { await fail('Kurs-Level startet nicht.'); }
}
/** Speicherstand setzen und die Seite neu laden (Karte startet mit diesem Stand). */
async function loadWith(data, url = '') {
  await sc((d) => {
    const s = window.__courseSave;
    s.data = { ...s.data, ...d };
    s.save();
    if (window.__courseMap) window.__courseMap.leaving = true;   // kein Merken der Lage beim Entladen
  }, data);
  await page.goto(`http://localhost:${port}/?map=1&scale=2&adapt=0${url}`, { waitUntil: 'load' });
}
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
const stepUntil = (cond, max = 1200) => sc(([c, mx]) => {
  const m = window.__courseMap;
  const f = new Function('s', `return (${c})(s);`);
  for (let i = 0; i < mx; i++) { const s = m.step(1); if (s.leaving || f(s)) return { i, s }; }
  return { i: mx, s: m.state() };
}, [cond.toString(), max]);
const lvl = (stars, stamp = false) => ({ done: true, stars: [stars, stars, stars], stamp, bestTime: null, bestPole: 0 });
const W1IDS = ['1-1', '1-2', '1-A', '1-3', '1-Schatz', '1-4', '1-5', '1-Burg'];
const W2IDS = ['2-1', '2-2', '2-3', '2-Haus', '2-4', '2-A', '2-5', '2-Panzer'];
const W1_OPENED = ['1-2', '1-A', '1-3', '1-Schatz', '1-4', '1-5', '1-Burg', 'W2'];
const W2_OPENED = ['2-2', '2-3', '2-Haus', '2-4', '2-A', '2-5', '2-Panzer', 'W3'];
/** Welt 1 + 2 geschafft (je Level stars Sterne), optional ohne 2-Panzer. */
const w12 = (stars = true, panzer = true) => {
  const l = {};
  for (const id of [...W1IDS, ...W2IDS]) l[id] = lvl(stars);
  if (!panzer) delete l['2-Panzer'];
  return l;
};
/** Sterne gezielt setzen: n Sterne über Welt 1/2 verteilt (alle Level geschafft). */
const w12n = (n) => {
  const l = w12(false);
  let k = n;
  for (const id of [...W1IDS, ...W2IDS]) for (let i = 0; i < 3 && k > 0; i++) { l[id].stars[i] = true; k--; }
  return l;
};

// Teilläufe (W3_TEIL=1|2|3) für Rechner, auf denen ein Lauf am Stück zu lange dauert; ohne Angabe alle Abschnitte.
//   1: Abschnitte 2–4 (Sperre, Röhrenfahrt, Titel), 2: 5–9 (Sternschranken … Glückshaus), 3: 10–14 (Welt 4 … Anflug)
const TEIL = process.env.W3_TEIL ?? '';
const PARTS = { 1: [2, 4], 2: [5, 9], 3: [10, 14] };
const part = (n) => !PARTS[TEIL] || (n >= PARTS[TEIL][0] && n <= PARTS[TEIL][1]);
const ALIAS = '&mapAlias=3-1:0-0,3-A:0-0,3-Kapitän:0-0';
const W3_OPEN = (upto) => W3IDS.slice(1, W3IDS.indexOf(upto) + 1).concat(upto === '3-Zug' ? ['W4'] : []);
let st, r, lv, banner;
if (PARTS[TEIL] && PARTS[TEIL][0] > 2) {
  // Teillauf ab Abschnitt 5 bzw. 10: frischer Speicherstand, Karte geladen
  await page.goto(`http://localhost:${port}/?map=1&scale=2&adapt=0`, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await waitMap();
}

// ------------------------------------------------------------------ 2) Welt 3 gesperrt, solange 2-Panzer offen ist
if (part(2)) {
  await page.goto(`http://localhost:${port}/?map=1&scale=2&adapt=0`, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await waitMap();
  await loadWith({ levels: w12(true, false), mapOpened: [...W1_OPENED, ...W2_OPENED.filter((x) => x !== 'W3')], world: 3, worlds: [1, 2] });
  await waitMap();
  st = await sc(() => window.__courseMap.state());
  check('Gespeicherte Welt 3 ohne Freischaltung → Karte zeigt nicht Welt 3', st.world !== 3 && !st.worlds.includes(3));
  await loadWith({ world: 2 });
  await waitMap(2);
  st = await sc(() => window.__courseMap.state());
  check('Welt 2 ohne 2-Panzer: Glasröhre nach Welt 3 gesperrt (Weg zu), Titel der Zielwelt', st.entrances.W3.locked && st.entrances.W3.reason === 'locked' && st.gates.W3 === 'closed'
    && st.entrances.W3.title === 'Schnee und Eis');
}

// ------------------------------------------------------------------ 3) Nach 2-Panzer: Glasröhre W2 → W3
if (part(3)) {
  await loadWith({ levels: w12(true), mapOpened: [...W1_OPENED, ...W2_OPENED], world: 2, worlds: [1, 2], coins: 0, mapPos: null });
  await waitMap(2);
  st = await sc(() => window.__courseMap.state());
  check('Nach 2-Panzer: Glasröhre nach Welt 3 frei (Schranke offen)', st.entrances.W3.enterable && st.gates.W3 === 'open');
  await sc(() => { const m = window.__courseMap; m.teleport(0, 3.3, -116, -Math.PI / 2); m.step(20); });
  r = await walkTo(0, -121, (s) => s.onPad === 'W3', 600);
  await shot('w2_roehre', 600);
  await frames();
  check('Figur steht auf dem Röhren-Podest in Welt 2, Hinweis „ab durch die Glasröhre“', r.s.onPad === 'W3' && (await sc(() => window.__courseMap.hud.bannerStatus.text)).includes('Glasröhre'));
  await sc(() => window.__courseMap.setInput({ jump: true }));
  st = await sc(() => window.__courseMap.step(1));
  await sc(() => window.__courseMap.setInput({}));
  check('A auf dem Podest startet die Röhrenfahrt (Abfahrt nach Welt 3)', st.travel?.mode === 'depart' && !st.leaving && st.worlds.includes(3));
  r = await stepUntil((s) => s.travel?.phase === 'ride' && s.travel.t > 1.6, 600);
  await shot('abfahrt', 400);
  r = await stepUntil(() => false, 600);
  check('Nach der Fahrt verlässt die Karte Welt 2 (Szenenwechsel zu Welt 3)', r.s.leaving === true);
  await waitMap(3);
  st = await sc(() => window.__courseMap.state());
  console.log('  Ankunft', JSON.stringify(st.travel), JSON.stringify(st.player));
  check('Welt 3 geladen, Ankunft durch die Röhre läuft (Figur weit draußen)', st.world === 3 && st.travel?.mode === 'arrive' && Math.hypot(st.player.x + 14, st.player.z - 42.6) > 30);
  await shot('ankunft_weit', 300);
  r = await sc(() => ({ lod: window.__courseMap.lod.info(), travel: window.__courseMap.state().travel }));
  console.log('  Ankunft weit', JSON.stringify(r));
  check('Ankunft über dem Meer: ferne Kleinteile ausgeblendet, Schattenkarte ruht', r.lod.hidden > 10 && (r.travel.t >= 1 || r.travel.shadows === false));
  r = await stepUntil((s) => s.travel?.t > 1.4, 400);
  await shot('ankunft', 400);
  r = await stepUntil((s) => s.travel?.t > 2.6, 400);
  await shot('ankunft_nah', 300);
  r = await stepUntil((s) => !s.travel, 900);
  await sc(() => window.__courseMap.step(40));
  st = await sc(() => window.__courseMap.state());
  console.log('  angekommen', JSON.stringify(st.player));
  check('Nach der Ankunft steht die Figur vor der Rückweg-Röhre am Start von Welt 3', Math.hypot(st.player.x + 14, st.player.z - 42.6) < 0.8 && st.player.mode === 'ground' && Math.abs(st.player.y - 1) < 0.05);
  check('Welt 3 gemerkt (offen, aktuelle Welt)', st.worlds.includes(3) && (await sc(() => JSON.parse(localStorage.getItem('lotti-greta-course-v1')).world)) === 3);
  await frames(3);
  check('HUD: Weltname „Welt 3 · Schnee“, Sterne gesamt 48, Welt 3 hat 31 Sterne', (await sc(() => window.__courseMap.hud.worldName.text)) === 'Welt 3 · Schnee'
    && st.totalStars === 48 && st.stars === 0 && st.starsMax === 31);
  const music = await sc(() => window.__courseMap.musicName());
  check('Musik der Welt-3-Karte: course_world3_map', music === 'course_world3_map');
  await shot('start', 900);
}

// ------------------------------------------------------------------ 4) Eingänge: Titel bzw. „Bald“, Start-Zustand
if (part(4)) {
  const titles = await sc((ids) => { const out = {}; for (const id of ids) { const s = window.__courseMap.status(id); out[id] = [s.title, s.exists]; } return out; }, W3IDS);
  console.log('  Titel', JSON.stringify(titles));
  check('Eingänge in Welt 3 zeigen den Leveltitel bzw. „Bald“', Object.values(titles).every(([t, ex]) => (ex ? t && t !== 'Bald' : t === 'Bald')));
  st = await sc(() => window.__courseMap.state());
  check('Start in Welt 3: 3-1 frei, alle anderen zu, Rückweg-Röhre frei, Welt-4-Röhre zu, 3-Kapitän verborgen', !st.entrances['3-1'].locked && st.entrances.W2.enterable
    && W3IDS.slice(1).every((id) => st.entrances[id].locked) && st.entrances.W4.locked && Object.values(st.gates).every((g) => g === 'closed') && st.entrances['3-Kapitän'].hidden);
  await sc(() => { const m = window.__courseMap; m.teleport(0, 1.3, 36.4, Math.PI / 2); m.step(30); });
  await shot('tor31', 800);
  // Testparameter mapAlias: 3-1, 3-A, 3-Kapitän starten das Übungslevel 0-0
  await loadWith({}, ALIAS);
  await waitMap(3);
  st = await sc(() => window.__courseMap.state());
  check('mapAlias: 3-1 zeigt den Titel des Ersatz-Levels und ist startbar', st.entrances['3-1'].title !== 'Bald' && st.entrances['3-1'].enterable);
  await sc(() => { const m = window.__courseMap; m.teleport(0, 1.3, 36.4, Math.PI / 2); m.step(20); });
  r = await walkTo(0, 33.4, (s) => s.onPad === '3-1', 900);
  await sc(() => { const m = window.__courseMap; m.enter(); m.step(1); });
  st = await sc(() => window.__courseMap.state());
  check('Enter auf dem Podest 3-1 startet das (Ersatz-)Level', st.leaving && st.lastStart?.entrance === '3-1' && st.lastStart?.id === '0-0');
  await waitCourse();
  await sc(() => window.__course.exitToMap({ done: '0-0' }));
  await waitMap(3);
  st = await sc(() => window.__courseMap.state());
  check('Rückkehr aus dem Level: Welt 3, vor dem Schneefeld-Tor, Ergebnis auf 3-1 übertragen', st.world === 3 && Math.hypot(st.player.x, st.player.z - 36) < 0.8 && st.entrances['3-1'].done);
}

// ------------------------------------------------------------------ 5) Sternschranken 35 / 45 / 55
if (part(5)) {
  lv = w12n(34);
  lv['3-1'] = lvl(false, true);
  await loadWith({ levels: lv, mapOpened: [...W1_OPENED, ...W2_OPENED, '3-2'], world: 3, worlds: [1, 2, 3], mapPos: null }, ALIAS);
  await waitMap(3);
  st = await sc(() => window.__courseMap.state());
  check('3-1 geschafft, 34 Sterne: Schneise offen, 3-2 gesperrt (Sterne)', st.gates['3-2'] === 'open' && st.entrances['3-2'].locked && st.entrances['3-2'].reason === 'stars' && st.gateStars === 34);
  st = await sc(() => { const m = window.__courseMap; m.teleport(14, 1.3, -10, -Math.PI / 2); return m.step(40); });
  await shot('leiter', 900);
  banner = await sc(() => window.__courseMap.hud.bannerStatus.text);
  console.log('  Hinweis 3-2:', banner);
  check('Auf dem Podest der Himmelsleiter: „Benötigt 35 Sterne (34/35)“, Enter startet nichts', st.onPad === '3-2' && banner === 'Benötigt 35 Sterne (34/35)'
    && !(await sc(() => { const m = window.__courseMap; m.enter(); return m.step(2).leaving; })));
  // 44 Sterne: alles bis 3-5 geschafft, 3-6 braucht 45; 54: 3-Zug braucht 55
  lv = w12n(44);
  for (const id of ['3-1', '3-2', '3-3', '3-4', '3-5']) lv[id] = lvl(false);
  await loadWith({ levels: lv, mapOpened: [...W1_OPENED, ...W2_OPENED, ...W3_OPEN('3-6')] }, ALIAS);
  await waitMap(3);
  st = await sc(() => window.__courseMap.state());
  check('44 Sterne: Weg zum Rennberg offen, 3-6 braucht 45', st.gates['3-6'] === 'open' && st.entrances['3-6'].reason === 'stars' && st.gateStars === 44);
  await sc(() => { const m = window.__courseMap; m.teleport(-30, 1.3, -79.6, -Math.PI / 2); m.step(40); });
  await shot('renn', 900);
  const bRenn = await sc(() => window.__courseMap.hud.bannerStatus.text);
  lv = w12n(48);
  for (const id of ['3-1', '3-2', '3-3', '3-4', '3-5', '3-6', '3-7']) lv[id] = lvl(false);
  lv['3-1'] = lvl(true);   // 48 + 3 = 51 …
  lv['3-2'].stars = [true, true, false];   // … + 2 = 53
  lv['3-3'].stars = [true, false, false];  // … + 1 = 54
  await loadWith({ levels: lv, mapOpened: [...W1_OPENED, ...W2_OPENED, ...W3_OPEN('3-Zug')] }, ALIAS);
  await waitMap(3);
  st = await sc(() => window.__courseMap.state());
  await sc(() => { const m = window.__courseMap; m.teleport(55, 3.3, -101, -Math.PI / 2); m.step(40); });
  await shot('bahnhof', 900);
  const bZug = await sc(() => window.__courseMap.hud.bannerStatus.text);
  console.log('  Hinweise:', bRenn, '|', bZug);
  check('Hinweise „Benötigt 45 Sterne (44/45)“ am Rennberg und „Benötigt 55 Sterne (54/55)“ am Bahnhof', bRenn === 'Benötigt 45 Sterne (44/45)' && bZug === 'Benötigt 55 Sterne (54/55)'
    && st.entrances['3-Zug'].reason === 'stars' && st.gates['3-Zug'] === 'open' && st.gateStars === 54);
  lv['3-3'].stars = [true, true, false];
  await loadWith({ levels: lv }, ALIAS);
  await waitMap(3);
  st = await sc(() => window.__courseMap.state());
  check('55 Sterne: 3-Zug frei (zeigt „Bald“, bis es das Level gibt)', !st.entrances['3-Zug'].locked && st.gateStars === 55 && st.entrances['3-Zug'].enterable === st.entrances['3-Zug'].exists);
}

// ------------------------------------------------------------------ 6) 3-Kapitän erst nach 3-3 (Auftauchen)
if (part(6)) {
  lv = w12(true);
  for (const id of ['3-1', '3-2']) lv[id] = lvl(false);
  await loadWith({ levels: lv, mapOpened: [...W1_OPENED, ...W2_OPENED, '3-2', '3-3'], mapPos: null }, ALIAS);
  await waitMap(3);
  st = await sc(() => window.__courseMap.state());
  check('3-3 offen, aber nicht geschafft: 3-Kapitän verborgen, Steg-Schranke zu', st.entrances['3-Kapitän'].hidden && st.entrances['3-Kapitän'].locked && st.gates['3-Kapitän'] === 'closed'
    && !st.entrances['3-3'].locked);
  await sc(() => { const m = window.__courseMap; m.teleport(-24, 1.1, -17, Math.PI); m.step(30); });
  await shot('see_vorher', 800);
  r = await sc(() => window.__courseMap.hud.labels.get('3-Kapitän')?.c.visible ?? false);
  check('Verborgener Eingang: keine Beschriftung, kein Hinweis', !r && (await sc(() => window.__courseMap.state().near)) !== '3-Kapitän');
  lv['3-3'] = lvl(false);
  await loadWith({ levels: lv, mapPos: { world: 3, pos: [-24, 0.8, -17], yaw: Math.PI } }, ALIAS);
  await waitMap(3);
  st = await sc(() => window.__courseMap.state());
  check('Nach 3-3: Schranken-Schwenk zum Steg läuft, Kapitäns-Diorama noch verborgen', st.cinematic && st.entrances['3-Kapitän'].hidden);
  r = await stepUntil((s) => !s.entrances['3-Kapitän'].hidden, 900);
  await sc(() => window.__courseMap.snapCamera());
  await page.waitForTimeout(1200);
  await shot('kapitaen_auftauchen', 200, false);
  st = await sc(() => window.__courseMap.state());
  check('Schranke am Steg versinkt, 3-Kapitän taucht auf (frei, zeigt Titel bzw. Ersatz-Level)', !st.entrances['3-Kapitän'].hidden && !st.entrances['3-Kapitän'].locked && st.gates['3-Kapitän'] !== 'closed');
  r = await stepUntil((s) => !s.cinematic, 1800);
  check('Schwenk endet, Eingabe wieder frei; 3-4 ebenfalls offen', !r.s.cinematic && r.s.gates['3-4'] === 'open');
  r = await sc(() => { const ev = window.__courseMap.built.entrances.get('3-Kapitän'); return [ev.decorGroup?.position.y, ev.podiumGroup.position.y]; });
  check(`Diorama und Podest in Endlage (auch bei langsamer Bildrate): ${r.map((v) => v?.toFixed(2)).join(' / ')}`, Math.abs(r[0] - 1) < 0.01 && Math.abs(r[1]) < 0.01);
  await sc(() => { const m = window.__courseMap; m.teleport(-33, 1.3, -17, Math.PI); m.step(20); });
  r = await walkTo(-42, -17, (s) => s.player.x < -41.6, 900);
  r = await walkTo(-44.5, -14, (s) => s.onPad === '3-Kapitän', 900);
  await shot('kapitaen', 600);
  check('Über den Steg auf die Insel: Figur steht auf dem Podest von 3-Kapitän', r.s.onPad === '3-Kapitän');
  await sc(() => { const m = window.__courseMap; m.enter(); m.step(1); });
  st = await sc(() => window.__courseMap.state());
  check('3-Kapitän startbar (Ersatz-Level)', st.leaving && st.lastStart?.entrance === '3-Kapitän');
  await waitCourse();
  await sc(() => window.__course.exitToMap({}));
  await waitMap(3);
  st = await sc(() => window.__courseMap.state());
  check('Rückkehr: vor dem Diorama auf der Insel, kein zweiter Schwenk', Math.hypot(st.player.x + 44.5, st.player.z + 11.4) < 0.8 && !st.cinematic && !st.entrances['3-Kapitän'].hidden);
}

// ------------------------------------------------------------------ 7) Eisbahn ist rutschig
if (part(7)) {
  r = await sc(() => {
    const m = window.__courseMap;
    const run = (x, y, z) => {
      m.teleport(x, y, z, Math.PI);
      m.step(20);
      m.setInput({ x: -1, y: 0, run: true }); m.step(150);
      m.setInput({}); m.step(1);
      const x0 = m.player.pos.x;
      m.step(30);
      return Math.abs(m.player.pos.x - x0);
    };
    return { ice: run(-16, 1.1, -20), snow: run(19.5, 1.3, -6.5) };
  });
  console.log('  Nachrutschen (m in 0,25 s):', JSON.stringify(r));
  check('Eisbahn: die Figur rutscht nach dem Loslassen deutlich weiter als auf Schnee', r.ice > r.snow + 0.4);
}

// ------------------------------------------------------------------ 8) Gegnergruppe startet 3-A
if (part(8)) {
  lv = w12(true);
  for (const id of ['3-1', '3-2', '3-3', '3-4']) lv[id] = lvl(false);
  await loadWith({ levels: lv, mapOpened: [...W1_OPENED, ...W2_OPENED, '3-2', '3-3', '3-Kapitän', '3-4', '3-A', '3-5'] }, ALIAS);
  await waitMap(3);
  st = await sc(() => window.__courseMap.state());
  check('3-A frei: drei Zauberkröten schweben durch den roten Käfig', !st.entrances['3-A'].locked && st.roamers.length === 3 && st.roamers.every(([, y]) => Math.abs(y - 5) < 0.3));
  await sc(() => { const m = window.__courseMap; m.teleport(41, 5.3, -53, 0); m.step(30); });
  r = await walkTo(46, -53, (s) => s.player.x > 45.5, 400);
  await shot('festung', 900);
  r = await sc(() => {
    const m = window.__courseMap;
    for (let i = 0; i < 1500; i++) {
      const p = m.player.pos;
      const b = m.roamers.filter((e) => e.alive).sort((a, c) => a.pos.distanceTo(p) - c.pos.distanceTo(p))[0];
      const dx = b.pos.x - p.x, dz = b.pos.z - p.z, d = Math.hypot(dx, dz) || 1;
      m.setInput({ x: dx / d, y: -dz / d });
      const s = m.step(1);
      if (s.leaving) return { i, s };
    }
    return { i: 1500, s: m.state() };
  });
  check('Berührung der Zauberkröten startet 3-A (Ersatz-Level 0-0)', r.s.leaving && r.s.lastStart?.entrance === '3-A' && r.s.lastStart?.id === '0-0');
  await waitCourse();
  await sc(() => window.__course.exitToMap({}));
  await waitMap(3);
  st = await sc(() => window.__courseMap.state());
  check('Rückkehr aus dem Level: wieder Welt 3, vor der Festung, Kröten noch da', st.world === 3 && Math.hypot(st.player.x - 52, st.player.z + 47.6) < 0.8 && st.roamers.length === 3);
}

// ------------------------------------------------------------------ 9) Beerenhaus, Glückshaus
if (part(9)) {
  st = await sc(() => window.__courseMap.state());
  check('Beerenhaus in Welt 3 bietet ein Power-up an', st.berry === true);
  await sc(() => { const m = window.__courseMap; m.teleport(27, 1.3, 45, Math.PI / 2); m.step(20); });
  r = await walkTo(27, 42, (s) => !s.berry, 400);
  check('Beerenhaus: Power-up eingepackt', !r.s.berry && !!r.s.carryPower && r.s.player.power === r.s.carryPower);
  await shot('beerenhaus', 800);
  await sc(() => { const s = window.__courseSave; s.data.coins = 25; s.save(); const m = window.__courseMap; m.teleport(-8, 1.3, -16, Math.PI / 2); m.step(10); });
  r = await walkTo(-8, -19.1, (s) => s.onSlotPad, 400);
  check('Figur steht auf der Matte vor dem Spielautomaten (Seeplatz)', r.s.onSlotPad === true);
  await sc(() => { window.__courseMap.slot.force(['coin', 'coin', 'coin']); const m = window.__courseMap; m.setInput({ jump: true }); m.step(1); m.setInput({}); m.step(60); });
  st = await sc(() => window.__courseMap.state());
  check('Glückshaus: A zieht den Hebel, Einsatz 10 bezahlt', st.slot.state === 'spin' && st.coins === 15);
  await shot('glueck', 600);
  st = await sc(() => window.__courseMap.step(420));
  check('3 × Bitcoin: 30 Bitcoins Gewinn (15 → 45)', st.slot.state === 'idle' && st.coins === 45);
}

// ------------------------------------------------------------------ 10) Welt-4-Röhre: zu bis 3-Zug, danach frei
if (part(10)) {
  lv = w12(true);
  for (const id of ['3-1', '3-2', '3-3', '3-4', '3-5', '3-6', '3-B', '3-7']) lv[id] = lvl(false);
  await loadWith({ levels: lv, mapOpened: [...W1_OPENED, ...W2_OPENED, ...W3_OPEN('3-Zug')], world: 3, worlds: [1, 2, 3], mapPos: null }, ALIAS);
  await waitMap(3);
  st = await sc(() => window.__courseMap.state());
  check('Vor 3-Zug (3-B geschafft): Welt-4-Röhre gesperrt (Schranke zu)', st.entrances.W4.locked && st.gates.W4 === 'closed' && !st.entrances['3-B'].locked && !st.entrances['3-7'].locked);
  lv['3-Zug'] = lvl(false);
  await loadWith({ levels: lv, mapOpened: [...W1_OPENED, ...W2_OPENED, ...W3_OPEN('3-Zug')] }, ALIAS);
  await waitMap(3);
  st = await sc(() => window.__courseMap.state());
  await sc(() => { const m = window.__courseMap; m.teleport(1, 9.3, -133, Math.PI / 2); m.step(20); });
  r = await walkTo(1, -135.6, (s) => s.onPad === 'W4', 400);
  await frames();
  banner = await sc(() => window.__courseMap.hud.bannerStatus.text);
  console.log('  Hinweis W4:', banner);
  await shot('roehre4', 800);
  check('Nach 3-Zug: Welt-4-Röhre frei (Ziel „Canyon-Inselkette“), A startet die Fahrt', !st.entrances.W4.locked && st.entrances.W4.enterable && st.entrances.W4.title === 'Canyon-Inselkette'
    && r.s.onPad === 'W4' && banner.includes('Glasröhre') && (await sc(() => { const m = window.__courseMap; m.setInput({ jump: true }); m.step(1); m.setInput({}); const s = m.step(5); return s.travel?.mode === 'depart'; })));
  // die Fahrt selbst prüft tests/course_map_w4.mjs – hier ohne Fahrt in Welt 3 weiter
  await loadWith({ world: 3, worlds: [1, 2, 3] }, ALIAS);
  await waitMap(3);
}

// ------------------------------------------------------------------ 11) Bilder der Insel (alle Wege offen)
if (part(11)) {
  for (const [name, pos, yaw] of [['schneise', [0, 1, 16]], ['platz', [2, 1, -5]], ['eisbahn', [-20, 0.8, -12]], ['spuk', [0.6, 5, -42]], ['pastell', [27, 5, -45]],
    ['lagune', [-27, 1, -50]], ['gipfel', [-30, 9, -112]], ['zirkus', [1, 9, -101.5]], ['weg', [0, 1, -83]], ['herbst', [29, 3, -96]], ['zug', [55, 3, -97]], ['nische', [26, 1, 46]]]) {
    await sc(([p, y]) => { const m = window.__courseMap; m.teleport(p[0], p[1] + 0.3, p[2], y ?? -Math.PI / 2); m.step(30); }, [pos, yaw]);
    await shot(name, 700);
  }
}

// ------------------------------------------------------------------ 12) Aktuelle Welt bleibt nach Neuladen
if (part(12)) {
  await sc(() => { const m = window.__courseMap; m.teleport(4, 1.3, 40, Math.PI / 2); m.step(30); m.rememberPos(); });
  await page.reload({ waitUntil: 'load' });
  await waitMap();
  st = await sc(() => window.__courseMap.state());
  check('Nach Neuladen: wieder Welt 3 an der gemerkten Stelle', st.world === 3 && Math.hypot(st.player.x - 4, st.player.z - 40) < 0.8);
}

// ------------------------------------------------------------------ 13) Rückweg nach Welt 2
if (part(13)) {
  await sc(() => { const m = window.__courseMap; m.teleport(-14, 1.3, 43, Math.PI / 2); m.step(20); });
  r = await walkTo(-14, 40, (s) => s.onPad === 'W2', 400);
  await sc(() => { const m = window.__courseMap; m.setInput({ jump: true }); m.step(1); m.setInput({}); });
  st = await sc(() => window.__courseMap.state());
  check('Rückweg-Röhre in Welt 3 startet die Fahrt nach Welt 2', st.travel?.mode === 'depart');
  r = await stepUntil(() => false, 900);
  await waitMap(2);
  st = await sc(() => window.__courseMap.state());
  check('Welt 2: Ankunft durch die Welt-3-Röhre (von der Schneeinsel her)', st.world === 2 && st.travel?.mode === 'arrive');
  await shot('w2_ankunft', 300);
  r = await stepUntil((s) => !s.travel, 900);
  await sc(() => window.__courseMap.step(40));
  st = await sc(() => window.__courseMap.state());
  check('Zurück in Welt 2 vor der Glasröhre nach Welt 3 (Röhrenplateau)', st.world === 2 && Math.hypot(st.player.x, st.player.z + 118.4) < 0.8);
}

// ------------------------------------------------------------------ 14) Anflug (Welt 3 betreten) und Kennzahlen
if (part(14)) {
  await loadWith({ world: 3, worlds: [1, 2, 3], mapPos: null });
  try { await page.waitForFunction(() => window.__courseMap && window.__courseMap.intro, null, { timeout: 150000 }); } catch { /* ohne Anflug */ }
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}cmap3_anflug.png`, timeout: 200000 });
  { const s = await sc(() => window.__courseMap?.intro ? window.__courseMap.stats() : null); if (s) stats.push(['anflug', s.calls, s.triangles]); }
  await waitMap(3);
}

const sst = await sc(() => window.__courseMap.stats());
console.log(`\n  Statische Kulisse Welt 3: ${sst.staticMeshes} Kachel-Meshes, ${Math.round(sst.staticTriangles / 1000)} k Dreiecke, ${sst.shapes} Kollisionsformen`);
console.log('  Kennzahlen je Bild (Zeichenaufrufe inkl. Schattenpass, Dreiecke):');
for (const [n, c, t] of stats) console.log(`    ${n.padEnd(20)} ${String(c).padStart(4)} Aufrufe  ${String(Math.round(t / 1000)).padStart(4)} k Dreiecke`);
const w3stats = stats.filter(([n]) => !['w2_roehre', 'abfahrt', 'w2_ankunft'].includes(n));
const maxCalls = Math.max(...w3stats.map((s) => s[1])), maxTris = Math.max(...w3stats.map((s) => s[2]));
check(`Kennzahlen Welt 3: Zeichenaufrufe < 120 (max ${maxCalls}), Dreiecke < 300 k (max ${Math.round(maxTris / 1000)} k)`, maxCalls < 120 && maxTris < 300000);

await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
