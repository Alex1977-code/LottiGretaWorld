// Welt-4-Inselkette „Canyon“ der Kurs-Karte (Präzisierung Mehrwelten-Karte, Notiz Welt 4):
//   Weltdaten (Schranken riegeln ab, Ids/Reihenfolge/Sternbedarf laut Vertrag, 30 Sterne, Röhren) – Node;
//   Welt 4 gesperrt, solange 3-Zug offen ist; nach 3-Zug: Glasröhre am Ende von Welt 3 → Fahrt übers Meer → Ankunft am
//   Start von Welt 4 (Bilder, Kennzahlen); Eingänge zeigen Titel bzw. „Bald“ (mapAlias); Sternschranken 60/70/80 mit
//   Hinweis „Benötigt N Sterne (x/N)“; Gegnergruppen (Lavabrocken, Feuer-Werfer) starten 4-A/4-B; Piep-Blöcke am
//   Lautsprecherturm wechseln im Takt der Kartenmusik (Taktuhr, manuell vorgespult); Welt-Warp aus 4-2 nach Welt 5
//   endet auf der Welt-4-Karte an der Welt-5-Röhre mit „Welt 5 kommt bald!“ (Röhre entdeckt, Schranke offen, „Bald“);
//   Beerenhaus, Glückshaus; Trampoline federn; gespeicherte Welt bleibt nach Neuladen; Rückweg nach Welt 3;
//   Kennzahlen (< 120 Zeichenaufrufe, < 300 k Dreiecke an jeder Ansicht inkl. Ankunft und Anflug).
// Simulation deterministisch über window.__courseMap.step(n)/setInput; Bilder tests/out/cmap4_*.png zur Sichtprüfung.
// Aufruf: npm run build && PORT_BASE=3700 node tests/course_map_w4.mjs   (Teilläufe: W4_TEIL=1, 2, 3 – s. u.)
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';
import { MAP as W4 } from '../src/course/map/worlds/w4.js';
import { MAP as W3 } from '../src/course/map/worlds/w3.js';
import { MAP as W2 } from '../src/course/map/worlds/w2.js';
import { MAP as W1 } from '../src/course/map/worlds/w1.js';
import { buildWalkGrid, reachable, gateRects, gateSides, exitPoint } from '../src/course/map/layout.js';
import * as unlock from '../src/course/map/unlock.js';

const { check, summary } = makeChecker();
const W4IDS = ['4-1', '4-2', '4-A', '4-3', '4-Haus', '4-4', '4-5', '4-B', '4-Burg'];

// ------------------------------------------------------------------ 1) Weltdaten und Logik (Node)
{
  const grid = buildWalkGrid(W4);
  const order = W4.levels.map((l) => l.id);
  const after = Object.fromEntries(W4.levels.map((l) => [l.id, [].concat(l.after ?? [])]));
  let ok = true;
  const open = new Set();
  for (let i = 0; i <= order.length; i++) {
    const done = new Set(order.slice(0, i));
    for (const id of order) if (after[id].every((a) => done.has(a))) open.add(id);
    const r = reachable(W4, grid, open).ids.sort();
    const want = order.filter((id) => open.has(id)).sort();
    if (r.join() !== want.join()) { ok = false; console.log('   erreichbar', r.join(), 'erwartet', want.join()); }
  }
  check('Welt 4: jede Schranke riegelt ihren Bereich vollständig ab', ok);
  const gr = gateRects(W4, grid);
  check('Welt 4: 9 Schranken (je 4 m breit), jede mit Rückseite', gr.length === 9 && gr.every((g) => Math.abs(g.width - 4) < 0.01) && gateSides(W4, grid).every((g) => g.back !== 0));
  check('Welt 4: Ids und Reihenfolge der Welt-4-Liste', W4.levels.filter((l) => !l.next).map((l) => l.id).join() === W4IDS.join());
  const rule = (id) => W4.levels.find((l) => l.id === id);
  check('Welt 4: Freischaltung laut Vertrag (4-2 nach 4-1, 4-A nach 4-2, 4-3 nach 4-2 ≥ 60, 4-Haus nach 4-3 ≥ 70, 4-4 nach 4-3, 4-5 nach 4-4, 4-B nach 4-5, 4-Burg nach 4-5 ≥ 80)',
    !rule('4-1').after && rule('4-2').after === '4-1' && rule('4-A').after === '4-2' && rule('4-3').after === '4-2' && rule('4-3').minStars === 60
    && rule('4-Haus').after === '4-3' && rule('4-Haus').minStars === 70 && rule('4-4').after === '4-3' && rule('4-5').after === '4-4'
    && rule('4-B').after === '4-5' && rule('4-Burg').after === '4-5' && rule('4-Burg').minStars === 80 && W4.starScope === 'all'
    && W4IDS.filter((id) => rule(id).minStars).join() === '4-3,4-Haus,4-Burg');
  const perLevel = { '4-1': 3, '4-2': 3, '4-A': 1, '4-3': 3, '4-Haus': 10, '4-4': 3, '4-5': 3, '4-B': 1, '4-Burg': 3 };
  check('Welt 4: Sterne je Eingang wie in der Welt-4-Tabelle (zusammen 30), Stempel bei den Parcours',
    W4IDS.every((id) => rule(id).stars === perLevel[id]) && unlock.worldStarsMax(W4) === 30
    && W4IDS.filter((id) => rule(id).stamp).join() === '4-1,4-2,4-3,4-4,4-5,4-Burg');
  check('Welt 4: Glasröhre zurück (W3, offen) und nach Welt 5 (nach 4-Burg)', rule('W3').next === 3 && !rule('W3').after && rule('W5').next === 5 && rule('W5').after === '4-Burg');
  check('Welt 4: jeder Eingang hat ein Podest/eine Kulisse, Kulissen-Arten laut Bauplan',
    W4.levels.every((l) => W4.entrances.some((e) => e.id === l.id))
    && W4IDS.map((id) => W4.entrances.find((e) => e.id === id).kind).join() === 'anthill,poisonwood,lavaisle,beeptower,mysteryclock,bouncemeadow,ruincity,bluefortress,lavacastle');
  check('Welt 4: Gegnergruppen 4-A (3 Lavabrocken, Lava-Felsinsel) und 4-B (3 Feuer-Werfer, Festung), Beerenhaus und Glückshaus',
    W4.roamers.length === 2 && W4.roamers[0].level === '4-A' && W4.roamers[0].model === 'lavabrocken' && W4.roamers[0].count === 3
    && W4.roamers[1].level === '4-B' && W4.roamers[1].model === 'feuer_werfer' && W4.roamers[1].count === 3
    && W4.houses.some((h) => h.kind === 'beeren') && W4.houses.some((h) => h.kind === 'glueck' && h.stake === 10));
  check('Welt 4: Schilder an den Sternschranken „ab 60/70/80 ★“, Hängebrücken und Felsbögen zwischen den Inseln',
    ['ab 60 ★', 'ab 70 ★', 'ab 80 ★'].every((t) => W4.signs.some((s) => s.text === t))
    && W4.segments.filter((s) => s.type === 'ropebridge').length >= 4 && W4.segments.filter((s) => s.type === 'rockarch').length >= 2 && W4.cableways?.length >= 1);
  check('Welt 3: Glasröhre W4 frei nach 3-Zug, Canyon-Inseln am Horizont', W3.levels.find((l) => l.id === 'W4')?.next === 4 && W3.levels.find((l) => l.id === 'W4')?.after === '3-Zug'
    && W3.neighbors.some((n) => n.world === 4 && n.style === 'canyon'));
  check('Welt 4: Eingänge, Ausgänge und Häuser liegen auf begehbarem Gelände', W4.entrances.every((e) => grid.isWalk(e.pos[0], e.pos[2]) && grid.isWalk(...[exitPoint(e)[0], exitPoint(e)[2]]))
    && grid.isWalk(W4.houses[0].item[0], W4.houses[0].item[2]) && grid.isWalk(W4.houses[1].pad[0], W4.houses[1].pad[2]));
  const fake = (levels, worlds = [1]) => ({
    peek: (id) => levels[id] ?? null, starsInWorld: (w) => Object.entries(levels).filter(([k]) => k.startsWith(`${w}-`)).reduce((n, [, l]) => n + l.stars.filter(Boolean).length, 0),
    totalStars: () => Object.values(levels).reduce((n, l) => n + l.stars.filter(Boolean).length, 0), worldOpened: (n) => worlds.includes(n),
  });
  const maps = (n) => ({ 1: W1, 2: W2, 3: W3, 4: W4 }[n] ?? null);
  const d3 = { done: true, stars: [true, true, true] };
  check('worldOpen: Welt 4 zu ohne 3-Zug (auch nach 3-B), offen mit 3-Zug oder wenn schon bereist; Welt 5 ohne Karte zu',
    !unlock.worldOpen(maps, fake({ '3-7': d3, '3-B': d3 }, [1, 2, 3]), 4) && unlock.worldOpen(maps, fake({ '3-Zug': d3 }, [1, 2, 3]), 4)
    && unlock.worldOpen(maps, fake({}, [1, 2, 3, 4]), 4) && !unlock.worldOpen(maps, fake({}, [1, 2, 3, 4, 5]), 5));
  check('Welt-5-Röhre: Weg frei nach 4-Burg oder sobald Welt 5 entdeckt ist (Welt-Warp)', !unlock.pathOpen(W4, fake({}, [1, 2, 3, 4]), 'W5')
    && unlock.pathOpen(W4, fake({ '4-Burg': d3 }, [1, 2, 3, 4]), 'W5') && unlock.pathOpen(W4, fake({}, [1, 2, 3, 4, 5]), 'W5')
    && unlock.reason(W4, fake({}, [1, 2, 3, 4, 5]), 'W5') === null);
}

// ------------------------------------------------------------------ Browser
const PORT = 4240;
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
  if (s) stats.push([name, s.calls, s.triangles, await sc(() => window.__courseMap?.map.world)]);
  await page.screenshot({ path: `${OUT}cmap4_${name}.png`, timeout: 200000 });
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
const banner = () => sc(() => window.__courseMap.hud.bannerStatus.text);
const toast = () => sc(() => (window.__courseMap.hud.toastText.visible ? window.__courseMap.hud.toastText.text : ''));
const lvl = (stars, stamp = false) => ({ done: true, stars: [stars, stars, stars], stamp, bestTime: null, bestPole: 0 });
const W1IDS = ['1-1', '1-2', '1-A', '1-3', '1-Schatz', '1-4', '1-5', '1-Burg'];
const W2IDS = ['2-1', '2-2', '2-3', '2-Haus', '2-4', '2-A', '2-5', '2-Panzer'];
const W3IDS = ['3-1', '3-2', '3-3', '3-Kapitän', '3-4', '3-A', '3-5', '3-6', '3-B', '3-7', '3-Zug'];
const OPENED_123 = ['1-2', '1-A', '1-3', '1-Schatz', '1-4', '1-5', '1-Burg', 'W2', '2-2', '2-3', '2-Haus', '2-4', '2-A', '2-5', '2-Panzer', 'W3',
  '3-2', '3-3', '3-Kapitän', '3-4', '3-A', '3-5', '3-6', '3-B', '3-7', '3-Zug'];
/** Welt 1–3 geschafft (je Level stars Sterne), optional ohne 3-Zug. */
const w123 = (stars = true, zug = true) => {
  const l = {};
  for (const id of [...W1IDS, ...W2IDS, ...W3IDS]) l[id] = lvl(stars);
  if (!zug) delete l['3-Zug'];
  return l;
};
/** Welt 1–3 geschafft mit genau n Sternen (über die Level verteilt). */
const w123n = (n) => {
  const l = w123(false);
  let k = n;
  for (const id of [...W1IDS, ...W2IDS, ...W3IDS]) for (let i = 0; i < 3 && k > 0; i++) { l[id].stars[i] = true; k--; }
  return l;
};
/** Welt-4-Schranken bis einschließlich upto als geöffnet gemerkt (kein Schwenk). */
const W4_OPEN = (upto) => {
  const out = [];
  for (const l of W4.levels) { if (l.after) out.push(l.id); if (l.id === upto) break; }
  return out;
};
const W4_ALL_OPEN = W4.levels.filter((l) => l.after).map((l) => l.id);

// Teilläufe (W4_TEIL=1|2|3) für Rechner, auf denen ein Lauf am Stück zu lange dauert; ohne Angabe alle Abschnitte.
//   1: Abschnitte 2–4 (Sperre, Röhrenfahrt, Titel), 2: 5–9 (Sternschranken … Welt-Warp), 3: 10–14 (Häuser … Anflug)
const TEIL = process.env.W4_TEIL ?? '';
const PARTS = { 1: [2, 4], 2: [5, 9], 3: [10, 14] };
const part = (n) => !PARTS[TEIL] || (n >= PARTS[TEIL][0] && n <= PARTS[TEIL][1]);
const ALIAS = '&mapAlias=4-1:0-0,4-2:0-0,4-A:0-0,4-B:0-0';
let st, r, lv;
await page.goto(`http://localhost:${port}/?map=1&scale=2&adapt=0`, { waitUntil: 'load' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'load' });
await waitMap();

// ------------------------------------------------------------------ 2) Welt 4 gesperrt, solange 3-Zug offen ist
if (part(2)) {
  await loadWith({ levels: w123(true, false), mapOpened: OPENED_123.filter((x) => x !== '3-Zug'), world: 4, worlds: [1, 2, 3], mapPos: null });
  await waitMap();
  st = await sc(() => window.__courseMap.state());
  check('Gespeicherte Welt 4 ohne Freischaltung → Karte zeigt nicht Welt 4', st.world !== 4 && !st.worlds.includes(4));
  lv = w123(true, false);
  lv['3-B'] = lvl(true);
  await loadWith({ levels: lv, world: 3, worlds: [1, 2, 3] });
  await waitMap(3);
  st = await sc(() => window.__courseMap.state());
  check('Welt 3 ohne 3-Zug (3-B geschafft): Glasröhre nach Welt 4 gesperrt (Weg zu), Titel der Zielwelt', st.entrances.W4.locked && st.entrances.W4.reason === 'locked'
    && st.gates.W4 === 'closed' && st.entrances.W4.title === 'Canyon-Inselkette');
}

// ------------------------------------------------------------------ 3) Nach 3-Zug: Glasröhre W3 → W4, Ankunft
if (part(3)) {
  await loadWith({ levels: w123(true), mapOpened: [...OPENED_123], world: 3, worlds: [1, 2, 3], coins: 0, mapPos: null });
  await waitMap(3);
  st = await sc(() => window.__courseMap.state());
  check('Nach 3-Zug: Schranke zur Welt-4-Röhre versinkt (Schwenk), Röhre frei', st.cinematic && st.entrances.W4.enterable);
  r = await stepUntil((s) => !s.cinematic, 1800);
  check('Schwenk endet, Schranke offen', r.s.gates.W4 === 'open' && !r.s.cinematic);
  await sc(() => { const m = window.__courseMap; m.teleport(1, 9.3, -132.6, -Math.PI / 2); m.step(20); });
  r = await walkTo(1, -135.6, (s) => s.onPad === 'W4', 600);
  await shot('w3_roehre', 600);
  await frames();
  check('Figur steht auf dem Röhren-Podest in Welt 3, Hinweis „ab durch die Glasröhre“', r.s.onPad === 'W4' && (await banner()).includes('Glasröhre'));
  await sc(() => window.__courseMap.setInput({ jump: true }));
  st = await sc(() => window.__courseMap.step(1));
  await sc(() => window.__courseMap.setInput({}));
  check('A auf dem Podest startet die Röhrenfahrt (Abfahrt nach Welt 4)', st.travel?.mode === 'depart' && !st.leaving && st.worlds.includes(4));
  r = await stepUntil((s) => s.travel?.phase === 'ride' && s.travel.t > 1.6, 600);
  await shot('abfahrt', 400);
  r = await stepUntil(() => false, 600);
  check('Nach der Fahrt verlässt die Karte Welt 3 (Szenenwechsel zu Welt 4)', r.s.leaving === true);
  await waitMap(4);
  st = await sc(() => window.__courseMap.state());
  console.log('  Ankunft', JSON.stringify(st.travel), JSON.stringify(st.player));
  check('Welt 4 geladen, Ankunft durch die Röhre läuft (Figur weit draußen)', st.world === 4 && st.travel?.mode === 'arrive' && st.travel.entrance === 'W3'
    && Math.hypot(st.player.x + 14, st.player.z - 42.6) > 30);
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
  check('Nach der Ankunft steht die Figur vor der Rückweg-Röhre am Start von Welt 4', Math.hypot(st.player.x + 14, st.player.z - 42.6) < 0.8 && st.player.mode === 'ground' && Math.abs(st.player.y - 1) < 0.05);
  check('Welt 4 gemerkt (offen, aktuelle Welt)', st.worlds.includes(4) && (await sc(() => JSON.parse(localStorage.getItem('lotti-greta-course-v1')).world)) === 4);
  await frames(3);
  check('HUD: Weltname „Welt 4 · Canyon“, Sterne gesamt 81, Welt 4 hat 30 Sterne', (await sc(() => window.__courseMap.hud.worldName.text)) === 'Welt 4 · Canyon'
    && st.totalStars === 81 && st.stars === 0 && st.starsMax === 30);
  check('Musik der Welt-4-Karte: course_world4_map', (await sc(() => window.__courseMap.musicName())) === 'course_world4_map');
  await shot('start', 900);
}

// ------------------------------------------------------------------ 4) Eingänge: Titel bzw. „Bald“, Start-Zustand
if (part(4)) {
  if (TEIL === '1' || !TEIL) { /* Stand aus Abschnitt 3 */ }
  await loadWith({ levels: w123(true), mapOpened: [...OPENED_123, 'W4'], world: 4, worlds: [1, 2, 3, 4], mapPos: null });
  await waitMap(4);
  const titles = await sc((ids) => { const out = {}; for (const id of ids) { const s = window.__courseMap.status(id); out[id] = [s.title, s.exists]; } return out; }, W4IDS);
  console.log('  Titel', JSON.stringify(titles));
  check('Eingänge in Welt 4 zeigen den Leveltitel bzw. „Bald“', Object.values(titles).every(([t, ex]) => (ex ? t && t !== 'Bald' : t === 'Bald')));
  st = await sc(() => window.__courseMap.state());
  check('Start in Welt 4: 4-1 frei, alle anderen zu, Rückweg-Röhre frei, Welt-5-Röhre zu, alle Schranken zu', !st.entrances['4-1'].locked && st.entrances.W3.enterable
    && W4IDS.slice(1).every((id) => st.entrances[id].locked) && st.entrances.W5.locked && Object.values(st.gates).every((g) => g === 'closed')
    && st.entrances.W5.discovered === false && st.roamers.length === 6);
  await sc(() => { const m = window.__courseMap; m.teleport(9, 1.3, 35.4, Math.PI / 2); m.step(30); });
  await shot('ameisen', 800);
  await loadWith({}, ALIAS);
  await waitMap(4);
  st = await sc(() => window.__courseMap.state());
  check('mapAlias: 4-1 zeigt den Titel des Ersatz-Levels und ist startbar', st.entrances['4-1'].title !== 'Bald' && st.entrances['4-1'].enterable);
  await sc(() => { const m = window.__courseMap; m.teleport(9, 1.3, 35, Math.PI / 2); m.step(20); });
  r = await walkTo(9, 32, (s) => s.onPad === '4-1', 900);
  await sc(() => { const m = window.__courseMap; m.enter(); m.step(1); });
  st = await sc(() => window.__courseMap.state());
  check('Enter auf dem Podest 4-1 startet das (Ersatz-)Level', st.leaving && st.lastStart?.entrance === '4-1' && st.lastStart?.id === '0-0');
  await waitCourse();
  await sc(() => window.__course.exitToMap({ done: '0-0' }));
  await waitMap(4);
  st = await sc(() => window.__courseMap.state());
  check('Rückkehr aus dem Level: Welt 4, vor dem Ameisenhügel, Ergebnis auf 4-1 übertragen, Schranke zur Giftwald-Insel versinkt',
    st.world === 4 && Math.hypot(st.player.x - 9, st.player.z - 34.6) < 0.8 && st.entrances['4-1'].done && st.cinematic);
  r = await stepUntil((s) => !s.cinematic, 1800);
  check('Weg zur Giftwald-Insel offen, 4-2 frei', r.s.gates['4-2'] === 'open' && !r.s.entrances['4-2'].locked);
}

// ------------------------------------------------------------------ 5) Sternschranken 60 / 70 / 80
if (part(5)) {
  lv = w123n(59);
  lv['4-1'] = lvl(false); lv['4-2'] = lvl(false);
  await loadWith({ levels: lv, mapOpened: [...OPENED_123, 'W4', ...W4_OPEN('4-3')], world: 4, worlds: [1, 2, 3, 4], mapPos: null });
  await waitMap(4);
  st = await sc(() => window.__courseMap.state());
  check('4-2 geschafft, 59 Sterne: Weg zum Turm offen, 4-3 gesperrt (Sterne)', st.gates['4-3'] === 'open' && st.entrances['4-3'].locked && st.entrances['4-3'].reason === 'stars' && st.gateStars === 59);
  st = await sc(() => { const m = window.__courseMap; m.teleport(-6.5, 3.3, -35.4, -Math.PI / 2); return m.step(40); });
  await shot('turm', 900);
  const b60 = await banner();
  const noStart = !(await sc(() => { const m = window.__courseMap; m.enter(); return m.step(2).leaving; }));
  lv = w123n(69);
  for (const id of ['4-1', '4-2', '4-3']) lv[id] = lvl(false);
  await loadWith({ levels: lv, mapOpened: [...OPENED_123, 'W4', ...W4_OPEN('4-4')] });
  await waitMap(4);
  st = await sc(() => window.__courseMap.state());
  await sc(() => { const m = window.__courseMap; m.teleport(35, 3.3, -32, -Math.PI / 2); m.step(40); });
  await shot('haus', 900);
  const b70 = await banner();
  const st70 = st;
  lv = w123n(79);
  for (const id of ['4-1', '4-2', '4-3', '4-4', '4-5']) lv[id] = lvl(false);
  await loadWith({ levels: lv, mapOpened: [...OPENED_123, 'W4', ...W4_OPEN('4-Burg')] });
  await waitMap(4);
  st = await sc(() => window.__courseMap.state());
  await sc(() => { const m = window.__courseMap; m.teleport(38, 6.3, -122.5, -Math.PI / 2); m.step(40); });
  await shot('burg', 900);
  const b80 = await banner();
  console.log('  Hinweise:', b60, '|', b70, '|', b80);
  check('Hinweise „Benötigt 60 Sterne (59/60)“ am Turm, Enter startet nichts', st && b60 === 'Benötigt 60 Sterne (59/60)' && noStart);
  check('„Benötigt 70 Sterne (69/70)“ am geheimnisvollen Haus (Weg offen)', b70 === 'Benötigt 70 Sterne (69/70)' && st70.gates['4-Haus'] === 'open' && st70.entrances['4-Haus'].reason === 'stars');
  check('„Benötigt 80 Sterne (79/80)“ an der Lava-Burg (Weg offen)', b80 === 'Benötigt 80 Sterne (79/80)' && st.gates['4-Burg'] === 'open' && st.entrances['4-Burg'].reason === 'stars' && st.gateStars === 79);
  lv = w123n(80);
  for (const id of ['4-1', '4-2', '4-3', '4-4', '4-5']) lv[id] = lvl(false);
  await loadWith({ levels: lv });
  await waitMap(4);
  st = await sc(() => window.__courseMap.state());
  check('80 Sterne: 4-Burg frei (zeigt „Bald“, bis es das Level gibt), 4-B und 4-Haus ebenso frei', !st.entrances['4-Burg'].locked && st.gateStars === 80
    && st.entrances['4-Burg'].enterable === st.entrances['4-Burg'].exists && !st.entrances['4-B'].locked && !st.entrances['4-Haus'].locked);
}

// ------------------------------------------------------------------ 6) Gegnergruppen starten 4-A und 4-B
if (part(6)) {
  lv = w123(true);
  for (const id of ['4-1', '4-2', '4-3', '4-4', '4-5']) lv[id] = lvl(false);
  await loadWith({ levels: lv, mapOpened: [...OPENED_123, 'W4', ...W4_ALL_OPEN.filter((x) => x !== 'W5')], world: 4, worlds: [1, 2, 3, 4], mapPos: null }, ALIAS);
  await waitMap(4);
  st = await sc(() => window.__courseMap.state());
  const lava = st.roamers.filter(([x]) => x < -30), werfer = st.roamers.filter(([x]) => x > 55);
  check('4-A frei: drei Lavabrocken laufen über die Lava-Felsinsel, 4-B frei: drei Feuer-Werfer in der Festung',
    !st.entrances['4-A'].locked && !st.entrances['4-B'].locked && lava.length === 3 && werfer.length === 3
    && lava.every(([, y]) => Math.abs(y - 1.4) < 0.3) && werfer.every(([, y]) => Math.abs(y - 5) < 0.3));
  const roam = async (id, from) => {
    await sc(([p]) => { const m = window.__courseMap; m.teleport(p[0], p[1], p[2], 0); m.step(30); }, [from]);
    return sc((x0) => {
      const m = window.__courseMap;
      for (let i = 0; i < 1500; i++) {
        const p = m.player.pos;
        const b = m.roamers.filter((e) => e.alive && Math.abs(e.pos.x - x0) < 20).sort((a, c) => a.pos.distanceTo(p) - c.pos.distanceTo(p))[0];
        const dx = b.pos.x - p.x, dz = b.pos.z - p.z, d = Math.hypot(dx, dz) || 1;
        m.setInput({ x: dx / d, y: -dz / d });
        const s = m.step(1);
        if (s.leaving) return { i, s };
      }
      return { i: 1500, s: m.state() };
    }, from[0]);
  };
  await sc(() => { const m = window.__courseMap; m.teleport(-45, 1.7, 1, Math.PI); m.step(30); });
  await shot('lavainsel', 900);
  r = await roam('4-A', [-45, 1.7, 0]);
  check('Berührung der Lavabrocken startet 4-A (Ersatz-Level 0-0)', r.s.leaving && r.s.lastStart?.entrance === '4-A' && r.s.lastStart?.id === '0-0');
  await waitCourse();
  await sc(() => window.__course.exitToMap({}));
  await waitMap(4);
  st = await sc(() => window.__courseMap.state());
  check('Rückkehr aus dem Level: wieder Welt 4, vor der Lava-Felsinsel, Lavabrocken noch da', st.world === 4 && Math.hypot(st.player.x + 45.6, st.player.z) < 0.8 && st.roamers.length === 6);
  await sc(() => { const m = window.__courseMap; m.teleport(64, 5.3, -76, Math.PI); m.step(30); });
  await shot('festung', 900);
  r = await roam('4-B', [64, 5.3, -82]);
  check('Berührung der Feuer-Werfer startet 4-B (Ersatz-Level 0-0)', r.s.leaving && r.s.lastStart?.entrance === '4-B' && r.s.lastStart?.id === '0-0');
  await waitCourse();
  await sc(() => window.__course.exitToMap({}));
  await waitMap(4);
  st = await sc(() => window.__courseMap.state());
  check('Rückkehr: vor der Festung (Ausgang am Felsbogen)', st.world === 4 && Math.hypot(st.player.x - 64.8, st.player.z + 82) < 0.8);
}

// ------------------------------------------------------------------ 7) Piep-Blöcke wechseln im Takt der Kartenmusik
if (part(7)) {
  await sc(() => { const m = window.__courseMap; m.teleport(0, 3.3, -31, -Math.PI / 2); m.step(30); });
  r = await sc(() => {
    const mu = window.__audio.music, m = window.__courseMap;
    mu.setManualClock(true);
    const bpmTheme = mu.themeInfo('course_world4_map').bpm;
    const spb = 60 / bpmTheme;
    const b0 = m.state().beep;
    mu.advanceClock((4 - (b0.beat % 4)) * spb + 0.02);       // knapp nach dem nächsten Wechsel
    const b1 = m.state().beep;
    mu.advanceClock(2 * spb);                                 // mitten in der Phase
    const b2 = m.state().beep;
    mu.advanceClock(1.6 * spb);                               // letzte Zählzeit vor dem Wechsel: Warnblinken
    const b3 = m.state().beep;
    mu.advanceClock(0.4 * spb);                               // Wechsel
    const b4 = m.state().beep;
    return { b0, b1, b2, b3, b4, bpm: mu.beat().bpm, bpmTheme };
  });
  console.log('  Piep:', JSON.stringify(r));
  check(`Piep-Blöcke folgen der Taktuhr der Kartenmusik (course_world4_map, ${r.bpmTheme} BPM)`, r.b0.theme === 'course_world4_map' && r.bpm === r.bpmTheme && r.b1.source !== 'zeit');
  check('Wechsel alle 4 Zählzeiten: aktiver Satz wechselt am Taktanfang, bleibt in der Phase, warnt in der letzten Zählzeit',
    r.b1.active !== r.b0.active && r.b2.active === r.b1.active && !r.b2.warn && r.b3.warn && r.b3.active === r.b1.active && r.b4.active !== r.b3.active);
  await frames(3);
  const shownA = await sc(() => window.__courseMap.state().beep);
  await shot('piep_a', 300, false);
  await sc(() => window.__audio.music.advanceClock(4 * 60 / window.__audio.music.themeInfo('course_world4_map').bpm));
  await frames(3);
  const shownB = await sc(() => window.__courseMap.state().beep);
  await shot('piep_b', 300, false);
  console.log('  gezeigt:', JSON.stringify(shownA.shown), JSON.stringify(shownB.shown));
  check('Darstellung folgt: fester Satz wechselt zwischen den Bildern (rosa ↔ blau)', shownA.shown?.active === shownA.active && shownB.shown?.active === shownB.active && shownA.active !== shownB.active);
  await sc(() => window.__audio.music.setManualClock(false));
}

// ------------------------------------------------------------------ 8) Trampoline auf der Bergwiese federn
if (part(8)) {
  r = await sc(() => {
    const m = window.__courseMap;
    m.teleport(-11.6, 6.6, -65.6, -Math.PI / 2);
    let maxY = 0;
    for (let i = 0; i < 240; i++) { m.step(1); maxY = Math.max(maxY, m.player.pos.y); }
    return { maxY, y: m.player.pos.y };
  });
  console.log('  Trampolin:', JSON.stringify(r));
  check('Pilz-Trampolin auf der Bergwiese federt die Heldin hoch (> 3 m über der Wiese)', r.maxY > 8);
  await sc(() => { const m = window.__courseMap; m.teleport(-4, 5.3, -67.4, -Math.PI / 2); m.step(30); });
  await shot('wiese', 800);
}

// ------------------------------------------------------------------ 9) Welt-Warp aus 4-2 nach Welt 5 (gibt es noch nicht)
if (part(9)) {
  lv = w123(true);
  lv['4-1'] = lvl(false);
  await loadWith({ levels: lv, mapOpened: [...OPENED_123, 'W4', '4-2'], world: 4, worlds: [1, 2, 3, 4], mapPos: null }, ALIAS);
  await waitMap(4);
  await sc(() => { const m = window.__courseMap; m.teleport(-3.4, 2.3, -3.4, Math.PI / 2); m.step(20); });
  r = await walkTo(-6, -6, (s) => s.onPad === '4-2', 600);
  await shot('giftwald', 600);
  await sc(() => { const m = window.__courseMap; m.enter(); m.step(1); });
  st = await sc(() => window.__courseMap.state());
  check('4-2 (Ersatz-Level) gestartet', st.leaving && st.lastStart?.entrance === '4-2');
  await waitCourse();
  // wie map/warp.js (Röhre mit warpWorld: 5): Welt 5 freischalten, Level ohne Zielmast verlassen
  await sc(() => { window.__courseSave.openWorld(5); window.__course.exitToMap({ warpWorld: 5 }); });
  await waitMap(4);
  st = await sc(() => window.__courseMap.state());
  console.log('  Warp-Ankunft', JSON.stringify(st.travel), st.soonWorld, JSON.stringify(st.entrances.W5));
  check('Welt-Warp 5 ohne Welt-5-Karte endet in Welt 4: Ankunft durch die Welt-5-Röhre (kein Fehler)', st.world === 4 && st.travel?.mode === 'arrive' && st.travel.entrance === 'W5'
    && st.soonWorld === 5 && st.worlds.includes(5));
  check('Welt-5-Röhre entdeckt (Welt 5 gemerkt), Weg frei, Eingang „Bald“', st.entrances.W5.discovered === true && !st.entrances.W5.locked && st.entrances.W5.soon && !st.entrances.W5.enterable
    && st.entrances.W5.title === 'Bald');
  r = await stepUntil((s) => s.travel?.t > 1.4, 400);
  await shot('warp_ankunft', 400);
  r = await stepUntil((s) => !s.travel, 900);
  const msg = await toast();
  st = await sc(() => window.__courseMap.state());
  console.log('  Meldung:', msg, '| Schwenk', st.cinematic, st.gates.W5);
  check('Nach der Ankunft: Meldung „Welt 5 kommt bald!“, Schranke zur Röhre versinkt (Schwenk)', msg === 'Welt 5 kommt bald!' && st.cinematic);
  r = await stepUntil((s) => !s.cinematic, 1800);
  await sc(() => window.__courseMap.step(20));
  st = await sc(() => window.__courseMap.state());
  check('Figur steht vor der Welt-5-Röhre, Schranke offen', Math.hypot(st.player.x - 64, st.player.z + 121.4) < 0.8 && st.gates.W5 === 'open' && !st.cinematic);
  await shot('warp_ende', 600);
  r = await walkTo(64, -124, (s) => s.onPad === 'W5', 400);
  await sc(() => { const m = window.__courseMap; m.hud.toast('', 0.01); m.step(2); m.enter(); m.step(1); });
  const msg2 = await toast();
  st = await sc(() => { const m = window.__courseMap; m.setInput({ jump: true }); m.step(1); m.setInput({}); return m.step(5); });
  check('Enter/A auf dem Podest der Welt-5-Röhre: keine Fahrt, „Welt 5 kommt bald!“', r.s.onPad === 'W5' && !st.travel && !st.leaving && msg2 === 'Welt 5 kommt bald!');
  // zurück über die Schranken von hinten bis auf die Ruinen-Insel
  await sc(() => { const m = window.__courseMap; m.teleport(44, 6.3, -112, Math.PI / 2); m.step(20); });
  r = await walkTo(44, -93, (s) => s.player.z > -94, 900);
  check('Von der Lava-Burg zurück: Schranke 4-Burg lässt die Figur von hinten durch', r.s.player.z > -94 && r.s.gates['4-Burg'] === 'closed');
}

// ------------------------------------------------------------------ 10) Beerenhaus, Glückshaus
if (part(10)) {
  lv = w123(true);
  lv['4-1'] = lvl(false);
  await loadWith({ levels: lv, mapOpened: [...OPENED_123, 'W4', '4-2'], world: 4, worlds: [1, 2, 3, 4], mapPos: null, coins: 0 });
  await waitMap(4);
  st = await sc(() => window.__courseMap.state());
  check('Beerenhaus in Welt 4 bietet ein Power-up an', st.berry === true);
  await sc(() => { const m = window.__courseMap; m.teleport(28.4, 1.3, 46, Math.PI / 2); m.step(20); });
  r = await walkTo(28.4, 41.4, (s) => !s.berry, 400);
  check('Beerenhaus: Power-up eingepackt', !r.s.berry && !!r.s.carryPower && r.s.player.power === r.s.carryPower);
  await shot('beerenhaus', 800);
  await sc(() => { const s = window.__courseSave; s.data.coins = 25; s.save(); const m = window.__courseMap; m.teleport(19, 2.3, 3, Math.PI / 2); m.step(10); });
  r = await walkTo(19, -0.7, (s) => s.onSlotPad, 400);
  check('Figur steht auf der Matte vor dem Spielautomaten (Giftwald-Insel)', r.s.onSlotPad === true);
  await sc(() => { window.__courseMap.slot.force(['coin', 'coin', 'coin']); const m = window.__courseMap; m.setInput({ jump: true }); m.step(1); m.setInput({}); m.step(60); });
  st = await sc(() => window.__courseMap.state());
  check('Glückshaus: A zieht den Hebel, Einsatz 10 bezahlt', st.slot.state === 'spin' && st.coins === 15);
  await shot('glueck', 600);
  st = await sc(() => window.__courseMap.step(420));
  check('3 × Bitcoin: 30 Bitcoins Gewinn (15 → 45)', st.slot.state === 'idle' && st.coins === 45);
}

// ------------------------------------------------------------------ 11) Bilder der Inselkette (alle Wege offen)
if (part(11)) {
  lv = w123(true);
  for (const id of W4IDS) lv[id] = lvl(false);
  await loadWith({ levels: lv, mapOpened: [...OPENED_123, 'W4', ...W4_ALL_OPEN], world: 4, worlds: [1, 2, 3, 4], mapPos: null });
  await waitMap(4);
  for (const [name, pos, yaw] of [['bruecke', [0, 1, 25]], ['gift', [-3, 2, -1]], ['bogen', [-24, 2, 0], Math.PI], ['turmplatz', [2, 3, -30]], ['hausinsel', [33, 3, -28]],
    ['bergwiese', [0, 5, -64]], ['ruinen', [36, 5, -73]], ['festung_hof', [70, 5, -74]], ['lavaburg', [42, 6, -113]], ['roehre5', [64, 6, -118]], ['nische', [27, 1, 46]]]) {
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
  check('Nach Neuladen: wieder Welt 4 an der gemerkten Stelle', st.world === 4 && Math.hypot(st.player.x - 4, st.player.z - 40) < 0.8);
}

// ------------------------------------------------------------------ 13) Rückweg nach Welt 3
if (part(13)) {
  await sc(() => { const m = window.__courseMap; m.teleport(-14, 1.3, 43, Math.PI / 2); m.step(20); });
  r = await walkTo(-14, 40, (s) => s.onPad === 'W3', 400);
  await sc(() => { const m = window.__courseMap; m.setInput({ jump: true }); m.step(1); m.setInput({}); });
  st = await sc(() => window.__courseMap.state());
  check('Rückweg-Röhre in Welt 4 startet die Fahrt nach Welt 3', st.travel?.mode === 'depart');
  r = await stepUntil(() => false, 900);
  await waitMap(3);
  st = await sc(() => window.__courseMap.state());
  check('Welt 3: Ankunft durch die Welt-4-Röhre (von den Canyon-Inseln her)', st.world === 3 && st.travel?.mode === 'arrive' && st.travel.entrance === 'W4');
  await shot('w3_ankunft', 300);
  r = await stepUntil((s) => !s.travel, 900);
  await sc(() => window.__courseMap.step(40));
  st = await sc(() => window.__courseMap.state());
  check('Zurück in Welt 3 vor der Glasröhre nach Welt 4 (Röhrenplateau)', st.world === 3 && Math.hypot(st.player.x - 1, st.player.z + 133) < 0.8);
}

// ------------------------------------------------------------------ 14) Anflug (Welt 4 betreten) und Kennzahlen
if (part(14)) {
  await loadWith({ levels: w123(true), mapOpened: [...OPENED_123, 'W4'], world: 4, worlds: [1, 2, 3, 4], mapPos: null });
  try { await page.waitForFunction(() => window.__courseMap && window.__courseMap.intro, null, { timeout: 150000 }); } catch { /* ohne Anflug */ }
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}cmap4_anflug.png`, timeout: 200000 });
  { const s = await sc(() => window.__courseMap?.intro ? window.__courseMap.stats() : null); if (s) stats.push(['anflug', s.calls, s.triangles, 4]); }
  check('Anflug beim Betreten von Welt 4 läuft', stats.some(([n]) => n === 'anflug'));
  await waitMap(4);
}

const sst = await sc(() => window.__courseMap.map.world === 4 ? window.__courseMap.stats() : null);
if (sst) console.log(`\n  Statische Kulisse Welt 4: ${sst.staticMeshes} Kachel-Meshes, ${Math.round(sst.staticTriangles / 1000)} k Dreiecke, ${sst.shapes} Kollisionsformen`);
console.log('  Kennzahlen je Bild (Zeichenaufrufe inkl. Schattenpass, Dreiecke):');
for (const [n, c, t, w] of stats) console.log(`    ${n.padEnd(20)} ${String(c).padStart(4)} Aufrufe  ${String(Math.round(t / 1000)).padStart(4)} k Dreiecke  (Welt ${w})`);
const w4stats = stats.filter(([, , , w]) => w === 4);
if (w4stats.length) {
  const maxCalls = Math.max(...w4stats.map((s) => s[1])), maxTris = Math.max(...w4stats.map((s) => s[2]));
  check(`Kennzahlen Welt 4: Zeichenaufrufe < 120 (max ${maxCalls}), Dreiecke < 300 k (max ${Math.round(maxTris / 1000)} k)`, maxCalls < 120 && maxTris < 300000);
}
const w3stats = stats.filter(([, , , w]) => w === 3);
if (w3stats.length) {
  const maxCalls = Math.max(...w3stats.map((s) => s[1])), maxTris = Math.max(...w3stats.map((s) => s[2]));
  check(`Kennzahlen Welt 3 (Röhre nach Welt 4, Ankunft): < 120 Aufrufe (max ${maxCalls}), < 300 k Dreiecke (max ${Math.round(maxTris / 1000)} k)`, maxCalls < 120 && maxTris < 300000);
}

await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
