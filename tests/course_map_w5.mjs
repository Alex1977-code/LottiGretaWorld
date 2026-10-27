// Welt-5-Karte „Lila Strand-Insel“ der Kurs-Karte (Präzisierung Mehrwelten-Karte, Notiz Welt 5):
//   Weltdaten (Schranken riegeln ab, Ids/Reihenfolge/Sternbedarf laut Vertrag „Welt 5 – Level-Liste“, 31 Sterne,
//   Röhren W4/W6) – Node; Glasröhre W5 in Welt 4 → Fahrt übers Meer → Ankunft in Welt 5 an der Rückweg-Röhre;
//   Welt-Warp aus 4-2 landet ohne Codeänderung in Welt 5; Eingänge zeigen Titel bzw. „Bald“ (mapAlias); Freischaltung
//   nacheinander (Schranken-Schwenk, Wege); Sternschranken 90/100 mit Hinweis „Benötigt N Sterne (x/N)“; Gegnergruppen
//   (Rammbock-Bullen, Feuer-Werfer) starten 5-A/5-B; Suchscheinwerfer der Schleich-Festung kreist im Takt der
//   Kartenmusik (Taktuhr, manuell vorgespult), Alarm im Lichtfleck; Rot-Blau-Flipper wechselt bei jedem Sprung;
//   Glasröhre W6 „Welt 6 kommt bald!“ (auch Welt-Warp nach Welt 6 über den vorhandenen Rückfall); Beerenhaus,
//   Glückshaus; gespeicherte Welt bleibt nach Neuladen; Rückweg nach Welt 4; Anflug; Kennzahlen (< 120 Zeichenaufrufe,
//   < 300 k Dreiecke an jeder Ansicht inkl. Ankunft und Anflug); keine Konsolenfehler.
// Simulation deterministisch über window.__courseMap.step(n)/setInput; Bilder tests/out/cmap5_*.png zur Sichtprüfung.
// Aufruf: npm run build && node tests/course_map_w5.mjs   (Teilläufe: W5_TEIL=1, 2, 3 – s. u.; PORT_BASE verschiebt den Port)
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';
import { MAP as W5 } from '../src/course/map/worlds/w5.js';
import { MAP as W4 } from '../src/course/map/worlds/w4.js';
import { MAP as W3 } from '../src/course/map/worlds/w3.js';
import { MAP as W2 } from '../src/course/map/worlds/w2.js';
import { MAP as W1 } from '../src/course/map/worlds/w1.js';
import { buildWalkGrid, reachable, gateRects, gateSides, exitPoint } from '../src/course/map/layout.js';
import * as unlock from '../src/course/map/unlock.js';

const { check, summary } = makeChecker();
const W5IDS = ['5-1', '5-2', '5-3', '5-A', '5-4', '5-Kapitän', '5-5', '5-B', '5-6', '5-7', '5-Zug', '5-Burg'];

// ------------------------------------------------------------------ 1) Weltdaten und Logik (Node)
{
  const grid = buildWalkGrid(W5);
  const order = W5.levels.map((l) => l.id);
  const after = Object.fromEntries(W5.levels.map((l) => [l.id, [].concat(l.after ?? [])]));
  let ok = true;
  const open = new Set();
  for (let i = 0; i <= order.length; i++) {
    const done = new Set(order.slice(0, i));
    for (const id of order) if (after[id].every((a) => done.has(a))) open.add(id);
    const r = reachable(W5, grid, open).ids.sort();
    const want = order.filter((id) => open.has(id)).sort();
    if (r.join() !== want.join()) { ok = false; console.log('   erreichbar', r.join(), 'erwartet', want.join()); }
  }
  check('Welt 5: jede Schranke riegelt ihren Bereich vollständig ab', ok);
  const gr = gateRects(W5, grid);
  check('Welt 5: 12 Schranken (je 4 m breit), jede mit Rückseite', gr.length === 12 && gr.every((g) => Math.abs(g.width - 4) < 0.01) && gateSides(W5, grid).every((g) => g.back !== 0));
  check('Welt 5: Ids und Reihenfolge der Welt-5-Liste', W5.levels.filter((l) => !l.next).map((l) => l.id).join() === W5IDS.join());
  const rule = (id) => W5.levels.find((l) => l.id === id);
  check('Welt 5: Freischaltung laut Vertrag (5-2 nach 5-1, 5-3 nach 5-2 ≥ 90, 5-A/5-4 nach 5-2, 5-Kapitän/5-5 nach 5-4, 5-B/5-6 nach 5-5, 5-7 nach 5-6, 5-Zug nach 5-7, 5-Burg nach 5-7 ≥ 100)',
    !rule('5-1').after && rule('5-2').after === '5-1' && rule('5-3').after === '5-2' && rule('5-3').minStars === 90 && rule('5-A').after === '5-2'
    && rule('5-4').after === '5-2' && rule('5-Kapitän').after === '5-4' && rule('5-5').after === '5-4' && rule('5-B').after === '5-5'
    && rule('5-6').after === '5-5' && rule('5-7').after === '5-6' && rule('5-Zug').after === '5-7' && rule('5-Burg').after === '5-7'
    && rule('5-Burg').minStars === 100 && W5.starScope === 'all' && W5IDS.filter((id) => rule(id).minStars).join() === '5-3,5-Burg');
  const perLevel = { '5-1': 3, '5-2': 3, '5-3': 3, '5-A': 1, '5-4': 3, '5-Kapitän': 5, '5-5': 3, '5-B': 1, '5-6': 3, '5-7': 3, '5-Zug': 0, '5-Burg': 3 };
  check('Welt 5: Sterne je Eingang wie in der Welt-5-Tabelle (zusammen 31), Stempel bei den Parcours',
    W5IDS.every((id) => rule(id).stars === perLevel[id]) && unlock.worldStarsMax(W5) === 31
    && W5IDS.filter((id) => rule(id).stamp).join() === '5-1,5-2,5-3,5-4,5-5,5-6,5-7,5-Burg');
  check('Welt 5: Glasröhre zurück (W4, offen) und nach Welt 6 (nach 5-Burg)', rule('W4').next === 4 && rule('W4').world === 4 && !rule('W4').after
    && rule('W6').next === 6 && rule('W6').after === '5-Burg');
  check('Welt 5: jeder Eingang hat ein Podest/eine Kulisse, Kulissen-Arten laut Bauplan',
    W5.levels.every((l) => W5.entrances.some((e) => e.id === l.id))
    && W5IDS.map((id) => W5.entrances.find((e) => e.id === id).kind).join() === 'seaside,bigtop,bluecave,bullcage,savanna,ghostdiorama,mine,lavarocks,cakeisle,sneakfort,goldstation,kipptemple');
  check('Welt 5: Gegnergruppen 5-A (5 Rammbock-Bullen im Käfig) und 5-B (Feuer-Werfer auf den Lava-Felsen), Beerenhaus und Glückshaus',
    W5.roamers.length === 2 && W5.roamers[0].level === '5-A' && W5.roamers[0].model === 'rammbock_bulle' && W5.roamers[0].count === 5
    && W5.roamers[1].level === '5-B' && W5.roamers[1].model === 'feuer_werfer' && W5.roamers[1].count >= 2
    && W5.houses.some((h) => h.kind === 'beeren') && W5.houses.some((h) => h.kind === 'glueck' && h.stake === 10));
  check('Welt 5: Schilder „ab 90 ★“/„ab 100 ★“, Holzstege zwischen den Inseln, Musik course_world5_map, Thema map_lila',
    ['ab 90 ★', 'ab 100 ★'].every((t) => W5.signs.some((s) => s.text === t)) && W5.segments.filter((s) => s.type === 'boardwalk').length >= 10
    && W5.music === 'course_world5_map' && W5.theme === 'map_lila' && W5.kit === 'lila' && W5.world === 5);
  check('Welt 5: Eingänge, Ausgänge und Häuser liegen auf begehbarem Gelände', W5.entrances.every((e) => grid.isWalk(e.pos[0], e.pos[2]) && grid.isWalk(exitPoint(e)[0], exitPoint(e)[2]))
    && grid.isWalk(W5.houses[0].item[0], W5.houses[0].item[2]) && grid.isWalk(W5.houses[1].pad[0], W5.houses[1].pad[2]));
  check('Welt 4: Glasröhre W5 unverändert (frei nach 4-Burg), Lila-Insel als Nachbarwelt am Horizont', W4.levels.find((l) => l.id === 'W5')?.next === 5
    && W4.levels.find((l) => l.id === 'W5')?.after === '4-Burg' && W4.neighbors.some((n) => n.world === 5 && n.style === 'lila'));
  const fake = (levels, worlds = [1]) => ({
    peek: (id) => levels[id] ?? null, starsInWorld: (w) => Object.entries(levels).filter(([k]) => k.startsWith(`${w}-`)).reduce((n, [, l]) => n + l.stars.filter(Boolean).length, 0),
    totalStars: () => Object.values(levels).reduce((n, l) => n + l.stars.filter(Boolean).length, 0), worldOpened: (n) => worlds.includes(n),
  });
  const maps = (n) => ({ 1: W1, 2: W2, 3: W3, 4: W4, 5: W5 }[n] ?? null);
  const d3 = { done: true, stars: [true, true, true] };
  check('worldOpen: Welt 5 zu ohne 4-Burg, offen mit 4-Burg oder wenn entdeckt (Welt-Warp); Welt 6 ohne Karte zu',
    !unlock.worldOpen(maps, fake({ '4-5': d3, '4-B': d3 }, [1, 2, 3, 4]), 5) && unlock.worldOpen(maps, fake({ '4-Burg': d3 }, [1, 2, 3, 4]), 5)
    && unlock.worldOpen(maps, fake({}, [1, 2, 3, 4, 5]), 5) && !unlock.worldOpen(maps, fake({}, [1, 2, 3, 4, 5, 6]), 6));
  check('Welt-6-Röhre: Weg frei nach 5-Burg oder sobald Welt 6 entdeckt ist; Sternbedarf 90/100 zählt alle Sterne',
    !unlock.pathOpen(W5, fake({}, [1, 2, 3, 4, 5]), 'W6') && unlock.pathOpen(W5, fake({ '5-Burg': d3 }, [1, 2, 3, 4, 5]), 'W6')
    && unlock.pathOpen(W5, fake({}, [1, 2, 3, 4, 5, 6]), 'W6') && unlock.reason(W5, fake({ '5-2': d3, '4-1': d3 }), '5-3') === 'stars'
    && unlock.gateStars(W5, fake({ '1-1': d3, '4-1': d3 })) === 6);
}

// ------------------------------------------------------------------ Browser
const PORT = 4250;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser({ hasTouch: true });
page.setDefaultNavigationTimeout(200000);
page.setDefaultTimeout(200000);
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const fail = async (msg) => { console.log(msg); for (const e of errors) console.log('  ', e); await browser.close(); stop(); process.exit(1); };
const stats = [];
/** Screenshot nach mindestens 3 neuen Bildern (Software-Renderer), Kennzahlen merken. */
async function shot(name, wait = 600, snap = true, nFrames = null) {
  if (snap) await sc(() => window.__courseMap?.snapCamera());
  const f0 = await sc(() => window.__courseMap?.view?.frame ?? 0);
  await page.waitForFunction(([f, k]) => (window.__courseMap?.view?.frame ?? 0) >= f + k, [f0, nFrames ?? (snap ? 3 : 10)], { timeout: 150000 }).catch(() => {});
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__courseMap?.stats());
  if (s) stats.push([name, s.calls, s.triangles, await sc(() => window.__courseMap?.map.world)]);
  await page.screenshot({ path: `${OUT}cmap5_${name}.png`, timeout: 200000 });
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
  await page.waitForTimeout(800);
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
const tp = (x, y, z, yaw = -Math.PI / 2, n = 30) => sc(([p, w, k]) => { const m = window.__courseMap; m.teleport(p[0], p[1], p[2], w); m.step(k); }, [[x, y, z], yaw, n]);
const lvl = (stars, stamp = false) => ({ done: true, stars: [stars, stars, stars], stamp, bestTime: null, bestPole: 0 });
const W1IDS = ['1-1', '1-2', '1-A', '1-3', '1-Schatz', '1-4', '1-5', '1-Burg'];
const W2IDS = ['2-1', '2-2', '2-3', '2-Haus', '2-4', '2-A', '2-5', '2-Panzer'];
const W3IDS = ['3-1', '3-2', '3-3', '3-Kapitän', '3-4', '3-A', '3-5', '3-6', '3-B', '3-7', '3-Zug'];
const W4IDS = ['4-1', '4-2', '4-A', '4-3', '4-Haus', '4-4', '4-5', '4-B', '4-Burg'];
const OPENED_123 = ['1-2', '1-A', '1-3', '1-Schatz', '1-4', '1-5', '1-Burg', 'W2', '2-2', '2-3', '2-Haus', '2-4', '2-A', '2-5', '2-Panzer', 'W3',
  '3-2', '3-3', '3-Kapitän', '3-4', '3-A', '3-5', '3-6', '3-B', '3-7', '3-Zug'];
const OPENED_1234 = [...OPENED_123, 'W4', ...W4.levels.filter((l) => l.after).map((l) => l.id)];
/** Welt 1–4 geschafft (je Level drei Sterne bzw. keine). */
const w1234 = (stars = true) => {
  const l = {};
  for (const id of [...W1IDS, ...W2IDS, ...W3IDS, ...W4IDS]) l[id] = lvl(stars);
  return l;
};
/** Welt 1–4 geschafft mit genau n Sternen (über die Level verteilt). */
const w1234n = (n) => {
  const l = w1234(false);
  let k = n;
  for (const id of [...W1IDS, ...W2IDS, ...W3IDS, ...W4IDS]) for (let i = 0; i < 3 && k > 0; i++) { l[id].stars[i] = true; k--; }
  return l;
};
/** Welt-5-Level (ohne Sterne) als geschafft eintragen. */
const with5 = (base, ids) => { const l = { ...base }; for (const id of ids) l[id] = lvl(false); return l; };
/** Welt-5-Schranken, deren Weg mit den geschafften Leveln done frei ist (als geöffnet gemerkt – kein Schwenk). */
const opened5 = (done) => W5.levels.filter((l) => l.after && [].concat(l.after).every((a) => done.includes(a))).map((l) => l.id);
const WORLDS5 = [1, 2, 3, 4, 5];

// Teilläufe (W5_TEIL=1|2|3) für langsame Rechner, je unter 10 min; ohne Angabe alle Abschnitte.
//   1: Abschnitte 2–4 (Röhre W5 → Welt 5, Welt-Warp aus 4-2, Start/Titel), 2: 5–8 (Freischaltung, Sternschranken,
//   Gegnergruppen, Suchscheinwerfer/Flipper), 3: 9–14 (Welt 6 … Anflug)
const TEIL = process.env.W5_TEIL ?? '';
const PARTS = { 1: [2, 4], 2: [5, 8], 3: [9, 14] };
const T0 = Date.now();
const part = (n) => { const on = !PARTS[TEIL] || (n >= PARTS[TEIL][0] && n <= PARTS[TEIL][1]); if (on) console.log(`  — Abschnitt ${n} (${Math.round((Date.now() - T0) / 1000)} s)`); return on; };
/** Spielstand in der laufenden Karte ändern und die Zustände der Eingänge neu berechnen (ohne Neuladen). */
const setLevels = (levels) => sc((l) => {
  const s = window.__courseSave, m = window.__courseMap;
  s.data.levels = l; s.save();
  m.computeStatuses();
  const st = m.state();
  for (const id of Object.keys(st.entrances)) st.entrances[id].pathOpen = m.status(id).pathOpen;
  return st;
}, levels);
let st, r, lv;
await page.goto(`http://localhost:${port}/?map=1&scale=2&adapt=0`, { waitUntil: 'load' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'load' });
await waitMap();

// ------------------------------------------------------------------ 2) Glasröhre W5 in Welt 4 → Ankunft in Welt 5
if (part(2)) {
  await loadWith({ levels: w1234(true), mapOpened: [...OPENED_1234], world: 4, worlds: [1, 2, 3, 4], coins: 0, mapPos: null });
  await waitMap(4);
  st = await sc(() => window.__courseMap.state());
  check('Welt 4 nach 4-Burg: Glasröhre W5 frei, Ziel „Lila Strand-Insel“ (Karte vorhanden, keine Codeänderung in Welt 4)',
    st.entrances.W5.enterable && st.entrances.W5.title === 'Lila Strand-Insel' && st.gates.W5 === 'open');
  await tp(64, 6.3, -119.5);
  r = await walkTo(64, -124, (s) => s.onPad === 'W5', 600);
  await shot('w4_roehre5', 600);
  await frames();
  check('Figur steht auf dem Podest der Welt-5-Röhre, Hinweis „ab durch die Glasröhre“', r.s.onPad === 'W5' && (await banner()).includes('Glasröhre'));
  await sc(() => window.__courseMap.setInput({ jump: true }));
  st = await sc(() => window.__courseMap.step(1));
  await sc(() => window.__courseMap.setInput({}));
  check('A auf dem Podest startet die Röhrenfahrt (Abfahrt nach Welt 5)', st.travel?.mode === 'depart' && !st.leaving && st.worlds.includes(5));
  r = await stepUntil((s) => s.travel?.phase === 'ride' && s.travel.t > 1.6, 600);
  await shot('w4_abfahrt', 400);
  r = await stepUntil(() => false, 600);
  check('Nach der Fahrt verlässt die Karte Welt 4 (Szenenwechsel zu Welt 5)', r.s.leaving === true);
  await waitMap(5);
  st = await sc(() => window.__courseMap.state());
  console.log('  Ankunft', JSON.stringify(st.travel), JSON.stringify(st.player));
  check('Welt 5 geladen, Ankunft durch die Rückweg-Röhre W4 (Figur weit draußen über dem Meer)', st.world === 5 && st.travel?.mode === 'arrive' && st.travel.entrance === 'W4'
    && Math.hypot(st.player.x + 16, st.player.z - 44.6) > 30);
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
  check('Nach der Ankunft steht die Figur vor der Rückweg-Röhre in der Ankunftsbucht', Math.hypot(st.player.x + 16, st.player.z - 44.6) < 0.8 && st.player.mode === 'ground' && Math.abs(st.player.y - 1) < 0.05);
  check('Welt 5 gemerkt (offen, aktuelle Welt)', st.worlds.includes(5) && (await sc(() => JSON.parse(localStorage.getItem('lotti-greta-course-v1')).world)) === 5);
  await frames(3);
  check('HUD: Weltname „Welt 5 · Lila Strand“, Sterne gesamt 108, Welt 5 hat 31 Sterne', (await sc(() => window.__courseMap.hud.worldName.text)) === 'Welt 5 · Lila Strand'
    && st.totalStars === 108 && st.stars === 0 && st.starsMax === 31);
  check('Musik der Welt-5-Karte: course_world5_map', (await sc(() => window.__courseMap.musicName())) === 'course_world5_map');
  await shot('start', 900);
}

// ------------------------------------------------------------------ 3) Welt-Warp aus 4-2 landet jetzt in Welt 5
if (part(3)) {
  lv = w1234(true);
  for (const id of W4IDS) delete lv[id];
  lv['4-1'] = lvl(false);
  await loadWith({ levels: lv, mapOpened: [...OPENED_123, 'W4', '4-2'], world: 4, worlds: [1, 2, 3, 4], mapPos: null }, '&mapAlias=4-2:0-0');
  await waitMap(4);
  await tp(-3.4, 2.3, -3.4, Math.PI / 2, 20);
  r = await walkTo(-6, -6, (s) => s.onPad === '4-2', 600);
  await sc(() => { const m = window.__courseMap; m.enter(); m.step(1); });
  st = await sc(() => window.__courseMap.state());
  check('4-2 (Ersatz-Level) gestartet', st.leaving && st.lastStart?.entrance === '4-2');
  await waitCourse();
  // wie map/warp.js (Röhre p_welt5 mit warpWorld: 5): Welt 5 freischalten, Level ohne Zielmast verlassen
  await sc(() => { window.__courseSave.openWorld(5); window.__course.exitToMap({ warpWorld: 5 }); });
  await waitMap(5);
  st = await sc(() => window.__courseMap.state());
  console.log('  Warp-Ankunft', JSON.stringify(st.travel), st.soonWorld);
  check('Welt-Warp aus 4-2 endet in Welt 5: Ankunft durch die Rückweg-Röhre W4, keine „bald“-Meldung', st.world === 5 && st.travel?.mode === 'arrive' && st.travel.entrance === 'W4'
    && st.soonWorld === null && st.worlds.includes(5));
  r = await stepUntil((s) => s.travel?.t > 1.4, 400);
  await shot('warp_ankunft', 400);
  r = await stepUntil((s) => !s.travel, 900);
  await sc(() => window.__courseMap.step(40));
  st = await sc(() => window.__courseMap.state());
  check('Nach dem Warp: Figur vor der Rückweg-Röhre, 5-1 frei, Röhre zurück nach Welt 4 frei (4-Burg noch offen)', Math.hypot(st.player.x + 16, st.player.z - 44.6) < 0.8
    && !st.entrances['5-1'].locked && st.entrances.W4.enterable && !st.cinematic && (await toast()) !== 'Welt 5 kommt bald!');
}

// ------------------------------------------------------------------ 4) Eingänge: Titel bzw. „Bald“, Start-Zustand, erstes Level
if (part(4)) {
  await loadWith({ levels: w1234(true), mapOpened: [...OPENED_1234], world: 5, worlds: WORLDS5, mapPos: null });
  await waitMap(5);
  const titles = await sc((ids) => { const out = {}; for (const id of ids) { const s = window.__courseMap.status(id); out[id] = [s.title, s.exists]; } return out; }, W5IDS);
  console.log('  Titel', JSON.stringify(titles));
  check('Eingänge in Welt 5 zeigen den Leveltitel bzw. „Bald“', Object.values(titles).every(([t, ex]) => (ex ? t && t !== 'Bald' : t === 'Bald')));
  st = await sc(() => window.__courseMap.state());
  check('Start in Welt 5: 5-1 frei, alle anderen zu, Rückweg-Röhre frei, Welt-6-Röhre zu, alle Schranken zu, 8 Gegner unterwegs',
    !st.entrances['5-1'].locked && st.entrances.W4.enterable && W5IDS.slice(1).every((id) => st.entrances[id].locked) && st.entrances.W6.locked
    && st.entrances.W6.discovered === false && Object.values(st.gates).every((g) => g === 'closed') && st.roamers.length === 8);
  await tp(19.5, 1.3, 39.5, Math.PI / 2, 30);
  await shot('strand', 800);
  await loadWith({}, '&mapAlias=5-1:0-0');
  await waitMap(5);
  st = await sc(() => window.__courseMap.state());
  check('mapAlias: 5-1 zeigt den Titel des Ersatz-Levels und ist startbar', st.entrances['5-1'].title !== 'Bald' && st.entrances['5-1'].enterable);
  await tp(18.5, 1.3, 39, Math.PI / 2, 20);
  r = await walkTo(18.5, 36, (s) => s.onPad === '5-1', 900);
  await sc(() => { const m = window.__courseMap; m.enter(); m.step(1); });
  st = await sc(() => window.__courseMap.state());
  check('Enter auf dem Podest 5-1 startet das (Ersatz-)Level', st.leaving && st.lastStart?.entrance === '5-1' && st.lastStart?.id === '0-0');
  await waitCourse();
  await sc(() => window.__course.exitToMap({ done: '0-0' }));
  await waitMap(5);
  st = await sc(() => window.__courseMap.state());
  check('Rückkehr aus dem Level: Welt 5, vor dem Strand, Ergebnis auf 5-1 übertragen, Schranke zur Zirkus-Insel versinkt',
    st.world === 5 && Math.hypot(st.player.x - 18.5, st.player.z - 38.6) < 0.8 && st.entrances['5-1'].done && st.cinematic);
  r = await stepUntil((s) => !s.cinematic, 1800);
  check('Weg zur Zirkus-Insel offen, 5-2 frei', r.s.gates['5-2'] === 'open' && !r.s.entrances['5-2'].locked);
}

// ------------------------------------------------------------------ 5) Freischaltung nacheinander
if (part(5)) {
  // 5-2 geschafft: drei Schranken (5-3, 5-A, 5-4) versinken nacheinander im Schwenk
  await loadWith({ levels: with5(w1234(true), ['5-1', '5-2']), mapOpened: [...OPENED_1234, '5-2'], world: 5, worlds: WORLDS5, mapPos: null });
  await waitMap(5);
  st = await sc(() => window.__courseMap.state());
  check('Nach 5-2: Schwenk zu den frischen Schranken (Höhle, Arena, Savanne)', st.cinematic && st.gates['5-3'] === 'closed' && st.gates['5-A'] === 'closed' && st.gates['5-4'] === 'closed');
  r = await stepUntil((s) => !s.cinematic, 4000);
  st = r.s;
  check('Schwenk endet: Wege zu 5-3, 5-A, 5-4 offen; 5-3 (108 ★ ≥ 90), 5-A, 5-4 frei; 5-Kapitän und 5-5 noch zu',
    ['5-3', '5-A', '5-4'].every((id) => st.gates[id] === 'open' && !st.entrances[id].locked) && st.entrances['5-Kapitän'].locked
    && st.entrances['5-5'].locked && st.gates['5-Kapitän'] === 'closed' && st.gates['5-5'] === 'closed');
  await tp(-6, 2.3, -1.5);
  await shot('zirkus_frei', 700);
  // weitere Stufen im laufenden Spiel (Spielstand ändern, Zustände neu berechnen): Weg (pathOpen) und Eingang frei
  const free = (s2, id) => !s2.entrances[id].locked && s2.entrances[id].pathOpen;
  const shut = (s2, id) => s2.entrances[id].locked && !s2.entrances[id].pathOpen;
  st = await setLevels(with5(w1234(true), ['5-1', '5-2', '5-4']));
  check('Nach 5-4: Geisterhaus (5-Kapitän) und Mine (5-5) frei, 5-B/5-6 noch zu', free(st, '5-Kapitän') && free(st, '5-5') && shut(st, '5-B') && shut(st, '5-6'));
  st = await setLevels(with5(w1234(true), ['5-1', '5-2', '5-4', '5-5']));
  check('Nach 5-5: Lava-Felsen (5-B) und Torten-Insel (5-6) frei, Schleich-Festung noch zu', free(st, '5-B') && free(st, '5-6') && shut(st, '5-7'));
  st = await setLevels(with5(w1234(true), ['5-1', '5-2', '5-4', '5-5', '5-6']));
  check('Nach 5-6: Schleich-Festung (5-7) frei, Bahnhof und Tempel noch zu', free(st, '5-7') && shut(st, '5-Zug') && shut(st, '5-Burg'));
  st = await setLevels(with5(w1234(true), ['5-1', '5-2', '5-4', '5-5', '5-6', '5-7']));
  check('Nach 5-7: Goldzug-Bahnhof (5-Zug) und Ruinen-Tempel (5-Burg, 108 ★ ≥ 100) frei, Welt-6-Röhre noch zu', free(st, '5-Zug') && free(st, '5-Burg') && shut(st, 'W6'));
  st = await setLevels(with5(w1234(true), ['5-1', '5-2', '5-4', '5-5', '5-6', '5-7', '5-Burg']));
  check('Nach 5-Burg: Weg zur Welt-6-Röhre offen, Röhre „Bald“ (Welt 6 gibt es noch nicht)', st.entrances.W6.pathOpen && !st.entrances.W6.locked
    && st.entrances.W6.soon && !st.entrances.W6.enterable && st.entrances.W6.title === 'Bald');
  // die Schranken selbst: mit allen geschafften Leveln geladen sind alle offen
  const done = ['5-1', '5-2', '5-4', '5-5', '5-6', '5-7', '5-Burg'];
  await loadWith({ levels: with5(w1234(true), done), mapOpened: [...OPENED_1234, ...opened5(done)] });
  await waitMap(5);
  st = await sc(() => window.__courseMap.state());
  check('Alle Welt-5-Level geschafft: alle 12 Schranken offen, alle Eingänge frei', Object.values(st.gates).length === 12 && Object.values(st.gates).every((g) => g === 'open')
    && W5IDS.every((id) => !st.entrances[id].locked));
}

// ------------------------------------------------------------------ 6) Sternschranken 90 / 100
if (part(6)) {
  const done2 = ['5-1', '5-2'];
  await loadWith({ levels: with5(w1234n(89), done2), mapOpened: [...OPENED_1234, ...opened5(done2)], world: 5, worlds: WORLDS5, mapPos: null });
  await waitMap(5);
  st = await sc(() => window.__courseMap.state());
  check('5-2 geschafft, 89 Sterne: Weg zur Höhle offen, 5-3 gesperrt (Sterne), 5-A und 5-4 frei', st.gates['5-3'] === 'open' && st.entrances['5-3'].locked
    && st.entrances['5-3'].reason === 'stars' && st.gateStars === 89 && !st.entrances['5-A'].locked && !st.entrances['5-4'].locked);
  await tp(35, 2.3, -6);
  await shot('hoehle', 900);
  const b90 = await banner();
  const noStart = !(await sc(() => { const m = window.__courseMap; m.enter(); return m.step(2).leaving; }));
  st = await setLevels(with5(w1234n(90), done2));
  const free90 = !st.entrances['5-3'].locked && st.gateStars === 90;
  const done7 = ['5-1', '5-2', '5-4', '5-5', '5-6', '5-7'];
  await loadWith({ levels: with5(w1234n(99), done7), mapOpened: [...OPENED_1234, ...opened5(done7)] });
  await waitMap(5);
  st = await sc(() => window.__courseMap.state());
  await tp(10, 7.3, -149);
  await shot('tempel', 900);
  const b100 = await banner();
  console.log('  Hinweise:', b90, '|', b100);
  check('Hinweis „Benötigt 90 Sterne (89/90)“ an der Höhle, Enter startet nichts; mit 90 Sternen frei', b90 === 'Benötigt 90 Sterne (89/90)' && noStart && free90);
  check('„Benötigt 100 Sterne (99/100)“ am Ruinen-Tempel (Weg offen), 5-Zug ohne Sternbedarf frei', b100 === 'Benötigt 100 Sterne (99/100)' && st.gates['5-Burg'] === 'open'
    && st.entrances['5-Burg'].reason === 'stars' && st.gateStars === 99 && !st.entrances['5-Zug'].locked);
  st = await setLevels(with5(w1234n(100), done7));
  check('100 Sterne: 5-Burg frei (zeigt „Bald“, bis es das Level gibt)', !st.entrances['5-Burg'].locked && st.gateStars === 100
    && st.entrances['5-Burg'].enterable === st.entrances['5-Burg'].exists);
}

// ------------------------------------------------------------------ 7) Gegnergruppen starten 5-A und 5-B
if (part(7)) {
  const done5 = ['5-1', '5-2', '5-4', '5-5'];
  await loadWith({ levels: with5(w1234(true), done5), mapOpened: [...OPENED_1234, ...opened5(done5)], world: 5, worlds: WORLDS5, mapPos: null }, '&mapAlias=5-A:0-0,5-B:0-0');
  await waitMap(5);
  st = await sc(() => window.__courseMap.state());
  const bulls = st.roamers.filter(([x]) => x < -25), werfer = st.roamers.filter(([x]) => x > 60);
  check('5-A frei: fünf Rammbock-Bullen im Arena-Käfig, 5-B frei: Feuer-Werfer auf den Lava-Felsen',
    !st.entrances['5-A'].locked && !st.entrances['5-B'].locked && bulls.length === 5 && werfer.length === W5.roamers[1].count
    && bulls.every(([, y]) => Math.abs(y - 1.6) < 0.3) && werfer.every(([, y]) => Math.abs(y - 2) < 0.3));
  const roam = async (from) => {
    await tp(from[0], from[1], from[2], 0, 30);
    return sc((x0) => {
      const m = window.__courseMap;
      for (let i = 0; i < 1500; i++) {
        const p = m.player.pos;
        const b = m.roamers.filter((e) => e.alive && Math.abs(e.pos.x - x0) < 22).sort((a, c) => a.pos.distanceTo(p) - c.pos.distanceTo(p))[0];
        const dx = b.pos.x - p.x, dz = b.pos.z - p.z, d = Math.hypot(dx, dz) || 1;
        m.setInput({ x: dx / d, y: -dz / d });
        const s = m.step(1);
        if (s.leaving) return { i, s };
      }
      return { i: 1500, s: m.state() };
    }, from[0]);
  };
  await tp(-30, 1.9, -2.5);
  await shot('arena', 900);
  r = await roam([-28.5, 1.9, -4]);
  check('Berührung der Rammbock-Bullen startet 5-A (Ersatz-Level 0-0)', r.s.leaving && r.s.lastStart?.entrance === '5-A' && r.s.lastStart?.id === '0-0');
  await waitCourse();
  await sc(() => window.__course.exitToMap({}));
  await waitMap(5);
  st = await sc(() => window.__courseMap.state());
  check('Rückkehr aus dem Level: wieder Welt 5, am Käfig-Tor, Bullen noch da', st.world === 5 && Math.hypot(st.player.x + 28.5, st.player.z + 4) < 0.8 && st.roamers.length === 8);
  await tp(69, 2.3, -49);
  await shot('lava', 900);
  r = await roam([66.4, 2.3, -52]);
  check('Berührung der Feuer-Werfer startet 5-B (Ersatz-Level 0-0)', r.s.leaving && r.s.lastStart?.entrance === '5-B' && r.s.lastStart?.id === '0-0');
  await waitCourse();
  await sc(() => window.__course.exitToMap({}));
  await waitMap(5);
  st = await sc(() => window.__courseMap.state());
  check('Rückkehr: vor den Lava-Felsen (Ausgang am Steg)', st.world === 5 && Math.hypot(st.player.x - 66.4, st.player.z + 52) < 0.8);
}

// ------------------------------------------------------------------ 8) Suchscheinwerfer im Takt der Kartenmusik, Flipper, Kippquader
if (part(8)) {
  await tp(-1, 6.3, -103);
  r = await sc(() => {
    const mu = window.__audio.music, m = window.__courseMap;
    mu.setManualClock(true);
    const bpmTheme = mu.themeInfo('course_world5_map').bpm;
    const spb = 60 / bpmTheme;
    const L = () => m.state().decor.searchlight;
    const b0 = L();
    mu.advanceClock((1 - (b0.beat % 1)) * spb + 0.6 * spb);   // nächste Zählzeit, Haltephase
    const b1 = L();
    mu.advanceClock(0.2 * spb);                               // noch dieselbe Zählzeit
    const b2 = L();
    mu.advanceClock(0.5 * spb);                               // nächste Zählzeit, Bewegung
    const b3 = L();
    mu.advanceClock(0.5 * spb);                               // Haltephase
    const b4 = L();
    return { b0, b1, b2, b3, b4, bpm: mu.beat().bpm, bpmTheme };
  });
  console.log('  Suchscheinwerfer:', JSON.stringify({ b0: r.b0.step, b1: [r.b1.step, r.b1.moving, r.b1.spot], b2: r.b2.spot, b3: [r.b3.step, r.b3.moving], b4: [r.b4.step, r.b4.spot], src: r.b1.source, bpm: r.bpm }));
  check(`Suchscheinwerfer folgt der Taktuhr der Kartenmusik (course_world5_map, ${r.bpmTheme} BPM)`, r.b0.theme === 'course_world5_map' && r.bpm === r.bpmTheme && r.b1.source !== 'zeit');
  check('Je Zählzeit eine Achtelrunde: Schritt +1 am Taktschlag, Lichtfleck hält in der zweiten Hälfte, bewegt sich in der ersten',
    r.b1.step === (Math.floor(r.b0.beat) + 1) % 8 && !r.b1.moving && r.b2.spot.join() === r.b1.spot.join() && r.b3.step === (r.b1.step + 1) % 8
    && r.b3.moving && r.b4.step === r.b3.step && !r.b4.moving && r.b4.spot.join() !== r.b2.spot.join());
  await frames(2);
  const lightA = await sc(() => window.__courseMap.state().decor.searchlight);
  await shot('licht_a', 200, false, 2);
  // Heldin in den Lichtfleck stellen → Alarm (Kegel und Fleck rot), wieder heraus → aus
  await sc((p) => { const m = window.__courseMap; m.teleport(p[0], 6.3, p[1], -Math.PI / 2); m.step(20); }, lightA.spot);
  await frames(2);
  const alarmOn = (await sc(() => window.__courseMap.state().decor.searchlight)).alarm;
  await shot('licht_alarm', 200, false, 2);
  await tp(12, 6.3, -97, -Math.PI / 2, 20);   // weit weg vom Kreis des Lichtflecks
  await sc(() => window.__audio.music.advanceClock(4 * 60 / window.__audio.music.themeInfo('course_world5_map').bpm));
  await frames(3);
  const lightB = await sc(() => window.__courseMap.state().decor.searchlight);
  await shot('licht_b', 200, false, 2);
  console.log('  Licht:', JSON.stringify(lightA.shown), alarmOn, JSON.stringify(lightB.shown), lightB.alarm);
  check('Darstellung folgt: Lichtfleck wandert (vier Zählzeiten = halbe Runde), Alarm nur im Lichtfleck', lightA.shown?.step === lightA.step && lightB.shown?.step === lightB.step
    && lightB.step === (lightA.step + 4) % 8 && alarmOn === true && lightB.alarm === false);
  await sc(() => window.__audio.music.setManualClock(false));
  // Rot-Blau-Flipper auf der Torten-Insel: jeder Sprung wechselt die Farbe
  await tp(38.5, 5.8, -95, -Math.PI / 2, 40);
  const f0 = (await sc(() => window.__courseMap.state().decor.flipper));
  const jump = () => sc(() => { const m = window.__courseMap; m.setInput({ jump: true }); m.step(1); m.setInput({}); m.step(90); return m.state().decor.flipper; });
  const f1 = await jump();
  const f2 = await jump();
  await shot('torte_flipper', 200, true);
  console.log('  Flipper:', JSON.stringify([f0, f1, f2]));
  check('Rot-Blau-Flipper wechselt bei jedem Sprung der Heldin (rot → blau → rot)', f1.flips === f0.flips + 1 && f1.color !== f0.color && f2.flips === f0.flips + 2 && f2.color === f0.color);
  const kq = await sc(() => window.__courseMap.state().decor.kippquader);
  check('Kippquader-König auf dem Tempel meldet seinen Zustand', !!kq && ['idle', 'warn', 'tip', 'down', 'up'].includes(kq.phase));
}

// ------------------------------------------------------------------ 9) Glasröhre W6 „bald“, Welt-Warp nach Welt 6 über den Rückfall
if (part(9)) {
  const doneB = ['5-1', '5-2', '5-4', '5-5', '5-6', '5-7', '5-Burg'];
  await loadWith({ levels: with5(w1234(true), doneB), mapOpened: [...OPENED_1234, ...opened5(doneB)], world: 5, worlds: WORLDS5, mapPos: null });
  await waitMap(5);
  await tp(54, 7.3, -154.5, -Math.PI / 2, 20);
  r = await walkTo(54, -158, (s) => s.onPad === 'W6', 400);
  await shot('roehre6', 700);
  await sc(() => { const m = window.__courseMap; m.hud.toast('', 0.01); m.step(2); m.enter(); m.step(1); });
  const msg = await toast();
  st = await sc(() => { const m = window.__courseMap; m.setInput({ jump: true }); m.step(1); m.setInput({}); return m.step(5); });
  check('Welt-6-Röhre nach 5-Burg: Weg frei, „Bald“, Enter/A zeigt „Welt 6 kommt bald!“ statt einer Fahrt', r.s.onPad === 'W6' && msg === 'Welt 6 kommt bald!' && !st.travel && !st.leaving
    && st.entrances.W6.soon && !st.entrances.W6.enterable && st.entrances.W6.discovered === false);
  // Warp nach Welt 6 aus einem Welt-5-Level (5-7 noch offen, Tempel-Schranke zu): Rückfall – Ankunft in Welt 5 durch
  // die Welt-6-Röhre hinter den gesperrten Schranken
  const done6 = ['5-1', '5-2', '5-4', '5-5', '5-6'];
  await loadWith({ levels: with5(w1234(true), done6), mapOpened: [...OPENED_1234, ...opened5(done6)], world: 5, worlds: WORLDS5, mapPos: null }, '&mapAlias=5-1:0-0');
  await waitMap(5);
  await tp(18.5, 1.3, 39, Math.PI / 2, 20);
  r = await walkTo(18.5, 36, (s) => s.onPad === '5-1', 900);
  await sc(() => { const m = window.__courseMap; m.enter(); m.step(1); });
  await waitCourse();
  await sc(() => { window.__courseSave.openWorld(6); window.__course.exitToMap({ warpWorld: 6 }); });
  await waitMap(5);
  st = await sc(() => window.__courseMap.state());
  console.log('  Warp 6:', JSON.stringify(st.travel), st.soonWorld, JSON.stringify(st.entrances.W6));
  check('Welt-Warp 6 ohne Welt-6-Karte endet in Welt 5: Ankunft durch die Welt-6-Röhre, Röhre entdeckt, Weg frei, „Bald“',
    st.world === 5 && st.travel?.mode === 'arrive' && st.travel.entrance === 'W6' && st.soonWorld === 6 && st.worlds.includes(6)
    && st.entrances.W6.discovered === true && !st.entrances.W6.locked && st.entrances.W6.soon);
  r = await stepUntil((s) => s.travel?.t > 1.4, 400);
  await shot('warp6_ankunft', 400);
  r = await stepUntil((s) => !s.travel, 900);
  const msg6 = await toast();
  st = await sc(() => window.__courseMap.state());
  check('Nach der Ankunft: „Welt 6 kommt bald!“, Schranke zur Röhren-Insel versinkt (Schwenk)', msg6 === 'Welt 6 kommt bald!' && st.cinematic);
  r = await stepUntil((s) => !s.cinematic, 1800);
  await sc(() => window.__courseMap.step(20));
  st = await sc(() => window.__courseMap.state());
  check('Figur steht vor der Welt-6-Röhre, Schranke offen', Math.hypot(st.player.x - 54, st.player.z + 155.4) < 0.8 && st.gates.W6 === 'open' && !st.cinematic);
  await tp(10, 7.3, -137, Math.PI / 2, 20);
  r = await walkTo(10, -121, (s) => s.player.z > -123, 900);
  check('Vom Tempel zurück: Schranke 5-Burg lässt die Figur von hinten durch', r.s.player.z > -123 && r.s.gates['5-Burg'] === 'closed');
}

// ------------------------------------------------------------------ 10) Beerenhaus, Glückshaus
if (part(10)) {
  const done7 = ['5-1', '5-2', '5-4', '5-5', '5-6', '5-7'];
  await loadWith({ levels: with5(w1234(true), done7), mapOpened: [...OPENED_1234, ...opened5(done7)], world: 5, worlds: WORLDS5, mapPos: null, coins: 0 });
  await waitMap(5);
  st = await sc(() => window.__courseMap.state());
  check('Beerenhaus in Welt 5 bietet ein Power-up an', st.berry === true);
  await tp(-30, 1.3, 43, Math.PI / 2, 20);
  r = await walkTo(-30, 40, (s) => !s.berry, 400);
  check('Beerenhaus: Power-up eingepackt', !r.s.berry && !!r.s.carryPower && r.s.player.power === r.s.carryPower);
  await shot('beerenhaus', 800);
  await sc(() => { const s = window.__courseSave; s.data.coins = 25; s.save(); const m = window.__courseMap; m.teleport(-60, 6.3, -97.6, Math.PI / 2); m.step(10); });
  r = await walkTo(-60, -100.5, (s) => s.onSlotPad, 400);
  check('Figur steht auf der Matte vor dem Spielautomaten (Goldzug-Bahnhof)', r.s.onSlotPad === true);
  await sc(() => { window.__courseMap.slot.force(['coin', 'coin', 'coin']); const m = window.__courseMap; m.setInput({ jump: true }); m.step(1); m.setInput({}); m.step(60); });
  st = await sc(() => window.__courseMap.state());
  check('Glückshaus: A zieht den Hebel, Einsatz 10 bezahlt', st.slot.state === 'spin' && st.coins === 15);
  await shot('glueck', 600);
  st = await sc(() => window.__courseMap.step(420));
  check('3 × Bitcoin: 30 Bitcoins Gewinn (15 → 45)', st.slot.state === 'idle' && st.coins === 45);
}

// ------------------------------------------------------------------ 11) Bilder der Insel (alle Wege offen, alle Level geschafft)
if (part(11)) {
  const all = W5IDS.filter((id) => !['5-A', '5-B'].includes(id));
  await loadWith({ levels: with5(w1234(true), all), mapOpened: [...OPENED_1234, ...opened5([...all, '5-A', '5-B'])], world: 5, worlds: WORLDS5, mapPos: null });
  await waitMap(5);
  for (const [name, pos, yaw] of [['zirkus', [-6, 2, -1.5]], ['savanne', [-9, 3.5, -56.5]], ['spuk', [-49, 3.5, -42.5]], ['mine', [32, 4.5, -56.5]],
    ['bahnhof', [-46, 6, -107.5]], ['steg', [8, 2.4, -19], Math.PI]]) {
    await tp(pos[0], pos[1] + 0.3, pos[2], yaw ?? -Math.PI / 2, 30);
    await shot(name, 300);
  }
}

// ------------------------------------------------------------------ 12) Aktuelle Welt bleibt nach Neuladen
if (part(12)) {
  await sc(() => { const m = window.__courseMap; m.teleport(4, 1.3, 40, Math.PI / 2); m.step(30); m.rememberPos(); });
  await page.reload({ waitUntil: 'load' });
  await waitMap();
  st = await sc(() => window.__courseMap.state());
  check('Nach Neuladen: wieder Welt 5 an der gemerkten Stelle', st.world === 5 && Math.hypot(st.player.x - 4, st.player.z - 40) < 0.8);
}

// ------------------------------------------------------------------ 13) Rückweg nach Welt 4
if (part(13)) {
  await tp(-16, 1.3, 45, Math.PI / 2, 20);
  r = await walkTo(-16, 42, (s) => s.onPad === 'W4', 400);
  await sc(() => { const m = window.__courseMap; m.setInput({ jump: true }); m.step(1); m.setInput({}); });
  st = await sc(() => window.__courseMap.state());
  check('Rückweg-Röhre in Welt 5 startet die Fahrt nach Welt 4', r.s.onPad === 'W4' && st.travel?.mode === 'depart');
  r = await stepUntil(() => false, 900);
  await waitMap(4);
  st = await sc(() => window.__courseMap.state());
  check('Welt 4: Ankunft durch die Welt-5-Röhre (von der Lila-Insel her)', st.world === 4 && st.travel?.mode === 'arrive' && st.travel.entrance === 'W5');
  await shot('w4_ankunft', 300);
  r = await stepUntil((s) => !s.travel, 900);
  await sc(() => window.__courseMap.step(40));
  st = await sc(() => window.__courseMap.state());
  check('Zurück in Welt 4 vor der Glasröhre nach Welt 5 (Röhren-Insel), Röhre frei mit Ziel „Lila Strand-Insel“',
    st.world === 4 && Math.hypot(st.player.x - 64, st.player.z + 121.4) < 0.8 && st.entrances.W5.enterable && st.entrances.W5.title === 'Lila Strand-Insel');
  await shot('w4_roehre5_zurueck', 600);
}

// ------------------------------------------------------------------ 14) Anflug (Welt 5 betreten) und Kennzahlen
if (part(14)) {
  await loadWith({ levels: w1234(true), mapOpened: [...OPENED_1234], world: 5, worlds: WORLDS5, mapPos: null });
  try { await page.waitForFunction(() => window.__courseMap && window.__courseMap.intro && window.__courseMap.map.world === 5, null, { timeout: 150000 }); } catch { /* ohne Anflug */ }
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}cmap5_anflug.png`, timeout: 200000 });
  { const s = await sc(() => window.__courseMap?.intro ? window.__courseMap.stats() : null); if (s) stats.push(['anflug', s.calls, s.triangles, 5]); }
  check('Anflug beim Betreten von Welt 5 läuft', stats.some(([n]) => n === 'anflug'));
  await waitMap(5);
}

console.log(`  — Ende (${Math.round((Date.now() - T0) / 1000)} s)`);
const sst = await sc(() => window.__courseMap.map.world === 5 ? window.__courseMap.stats() : null);
if (sst) console.log(`\n  Statische Kulisse Welt 5: ${sst.staticMeshes} Kachel-Meshes, ${Math.round(sst.staticTriangles / 1000)} k Dreiecke, ${sst.shapes} Kollisionsformen`);
console.log('  Kennzahlen je Bild (Zeichenaufrufe inkl. Schattenpass, Dreiecke):');
for (const [n, c, t, w] of stats) console.log(`    ${n.padEnd(20)} ${String(c).padStart(4)} Aufrufe  ${String(Math.round(t / 1000)).padStart(4)} k Dreiecke  (Welt ${w})`);
for (const w of [5, 4]) {
  const ws = stats.filter(([, , , ww]) => ww === w);
  if (!ws.length) continue;
  const maxCalls = Math.max(...ws.map((s) => s[1])), maxTris = Math.max(...ws.map((s) => s[2]));
  check(`Kennzahlen Welt ${w}: Zeichenaufrufe < 120 (max ${maxCalls}), Dreiecke < 300 k (max ${Math.round(maxTris / 1000)} k)`, maxCalls < 120 && maxTris < 300000);
}

await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
