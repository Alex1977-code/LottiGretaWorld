// Welt-6-Karte „Wolkeninseln“ der Kurs-Karte (Präzisierung Mehrwelten-Karte, Notiz Welt 6):
//   Weltdaten (Schranken riegeln ab, Ids/Reihenfolge/Sternbedarf laut Vertrag „Welt 6 – Level-Liste“, 34 Sterne,
//   Röhren W5/W7) – Node; Glasröhre W6 in Welt 5 → Fahrt → Ankunft in Welt 6 an der Rückweg-Röhre (ohne Codeänderung
//   in Welt 5); Welt-Warp nach Welt 6 aus einem Welt-5-Level landet in Welt 6; Eingänge zeigen Titel bzw. „Bald“
//   (mapAlias); 6-B (Steinkreis) gleich frei; Freischaltung nacheinander (Schranken-Schwenk, Wege, begehbare Brücken);
//   Sternschranken 110/120 mit Hinweis „Benötigt N Sterne (x/N)“; Gegnergruppen (Werfer-Brüder, Schubser-Prinz) starten
//   6-B/6-A; Windräder im Takt der Kartenmusik (Taktuhr, manuell vorgespult) und Ersatzuhr ohne Musik, Gong je Takt,
//   lebendige Kulisse; Glasröhre W7 „Welt 7 kommt bald!“ (auch Welt-Warp nach Welt 7 über den vorhandenen Rückfall,
//   Schranke von hinten); Beerenhaus, Glückshaus; gespeicherte Welt bleibt nach Neuladen; Rückweg nach Welt 5; Anflug;
//   Kennzahlen (< 120 Zeichenaufrufe, < 300 k Dreiecke an jeder Ansicht inkl. Ankunft und Anflug); keine Konsolenfehler.
// Simulation deterministisch über window.__courseMap.step(n)/setInput; Bilder tests/out/cmap6_*.png zur Sichtprüfung.
// Aufruf: npm run build && node tests/course_map_w6.mjs   (Teilläufe: W6_TEIL=1, 2, 3, 4 – s. u.; PORT_BASE verschiebt den Port)
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';
import { MAP as W6 } from '../src/course/map/worlds/w6.js';
import { MAP as W5 } from '../src/course/map/worlds/w5.js';
import { MAP as W4 } from '../src/course/map/worlds/w4.js';
import { MAP as W3 } from '../src/course/map/worlds/w3.js';
import { MAP as W2 } from '../src/course/map/worlds/w2.js';
import { MAP as W1 } from '../src/course/map/worlds/w1.js';
import { buildWalkGrid, reachable, gateRects, gateSides, exitPoint } from '../src/course/map/layout.js';
import * as unlock from '../src/course/map/unlock.js';

const { check, summary } = makeChecker();
const W6IDS = ['6-1', '6-B', '6-2', '6-3', '6-4', '6-A', '6-5', '6-6', '6-Haus', '6-7', '6-Panzer', '6-C'];

// ------------------------------------------------------------------ 1) Weltdaten und Logik (Node)
{
  const grid = buildWalkGrid(W6);
  const order = W6.levels.map((l) => l.id);
  const after = Object.fromEntries(W6.levels.map((l) => [l.id, [].concat(l.after ?? [])]));
  let ok = true;
  const open = new Set();
  for (let i = 0; i <= order.length; i++) {
    const done = new Set(order.slice(0, i));
    for (const id of order) if (after[id].every((a) => done.has(a))) open.add(id);
    const r = reachable(W6, grid, open).ids.sort();
    const want = order.filter((id) => open.has(id)).sort();
    if (r.join() !== want.join()) { ok = false; console.log('   erreichbar', r.join(), 'erwartet', want.join()); }
  }
  check('Welt 6: jede Schranke riegelt ihren Bereich vollständig ab', ok);
  const gr = gateRects(W6, grid);
  check('Welt 6: 11 Schranken (je 4 m breit), jede mit Rückseite', gr.length === 11 && gr.every((g) => Math.abs(g.width - 4) < 0.01) && gateSides(W6, grid).every((g) => g.back !== 0));
  check('Welt 6: Ids und Reihenfolge der Welt-6-Liste', W6.levels.filter((l) => !l.next).map((l) => l.id).join() === W6IDS.join());
  const rule = (id) => W6.levels.find((l) => l.id === id);
  check('Welt 6: Freischaltung laut Vertrag (6-1/6-B frei, 6-2 nach 6-1, 6-3 nach 6-2 ≥ 110, 6-4 nach 6-2, 6-A/6-5 nach 6-4, 6-6 nach 6-5, 6-Haus/6-7 nach 6-6, 6-Panzer nach 6-7, 6-C nach 6-Panzer ≥ 120)',
    !rule('6-1').after && !rule('6-B').after && rule('6-2').after === '6-1' && rule('6-3').after === '6-2' && rule('6-3').minStars === 110
    && rule('6-4').after === '6-2' && rule('6-A').after === '6-4' && rule('6-5').after === '6-4' && rule('6-6').after === '6-5'
    && rule('6-Haus').after === '6-6' && rule('6-7').after === '6-6' && rule('6-Panzer').after === '6-7' && rule('6-C').after === '6-Panzer'
    && rule('6-C').minStars === 120 && W6.starScope === 'all' && W6IDS.filter((id) => rule(id).minStars).join() === '6-3,6-C');
  const perLevel = { '6-1': 3, '6-B': 1, '6-2': 3, '6-3': 3, '6-4': 3, '6-A': 1, '6-5': 3, '6-6': 3, '6-Haus': 5, '6-7': 3, '6-Panzer': 3, '6-C': 3 };
  check('Welt 6: Sterne je Eingang wie in der Welt-6-Tabelle (zusammen 34), Stempel bei Parcours, Autoscrollern und 6-C',
    W6IDS.every((id) => rule(id).stars === perLevel[id]) && unlock.worldStarsMax(W6) === 34
    && W6IDS.filter((id) => rule(id).stamp).join() === '6-1,6-2,6-3,6-4,6-5,6-6,6-7,6-Panzer,6-C');
  check('Welt 6: Glasröhre zurück (W5, offen) und nach Welt 7 (nach 6-C)', rule('W5').next === 5 && rule('W5').world === 5 && !rule('W5').after
    && rule('W7').next === 7 && rule('W7').world === 7 && rule('W7').after === '6-C');
  check('Welt 6: jeder Eingang hat ein Podest/eine Kulisse, Kulissen-Arten je Zone',
    W6.levels.every((l) => W6.entrances.some((e) => e.id === l.id))
    && W6IDS.map((id) => W6.entrances.find((e) => e.id === id).kind).join() === 'pipehills,stonecircle,ghostbay,fareast,junglelake,pipefort,snowwind,skyfactory,throwhouse,minetower,tankroad,skycircus'
    && W6.entrances.filter((e) => e.kind === 'pipe').map((e) => e.id).join() === 'W5,W7');
  const kinds = (W6.roamers[0].memberOpts ?? []).map((o) => o.kind).sort().join();
  check('Welt 6: Gegnergruppen 6-B (1 Feuer-, 2 Hammer-, 2 Bumerang-Werfer im Steinkreis) und 6-A (Schubser-Prinz), Beerenhaus und Glückshaus',
    W6.roamers.length === 2 && W6.roamers[0].level === '6-B' && W6.roamers[0].model === 'feuer_werfer' && W6.roamers[0].count === 5 && kinds === 'bumerang,bumerang,feuer,hammer,hammer'
    && W6.roamers[1].level === '6-A' && W6.roamers[1].model === 'schubser_prinz' && W6.roamers[1].standIn === 'schubser_prinz'
    && W6.houses.some((h) => h.kind === 'beeren') && W6.houses.some((h) => h.kind === 'glueck' && h.stake === 10));
  const segs = (t) => W6.segments.filter((s) => s.type === t).length;
  check('Welt 6: Schilder „ab 110 ★“/„ab 120 ★“, Brücken (Glasröhren, Wolken-, rote und Regenbogenbrücke), Musik course_world6_map, Thema map_sky',
    ['ab 110 ★', 'ab 120 ★'].every((t) => W6.signs.some((s) => s.text === t)) && segs('glasstube') >= 6 && segs('cloudbridge') >= 2 && segs('redbridge') === 1
    && segs('rainbowbridge') === 1 && W6.segments.length === W6.walk.length && W6.music === 'course_world6_map' && W6.fallbackMusic === 'course_map'
    && W6.theme === 'map_sky' && W6.kit === 'sky' && W6.world === 6 && W6.sea === 0);
  check('Welt 6: alle begehbaren Inseln schweben über dem Wolkenmeer (Höhe ≥ 10, nach Norden steigend), Zirkus-Gipfel am höchsten',
    W6.ground.filter((b) => b.walk).every((b) => b.top >= 10) && Math.max(...W6.ground.filter((b) => b.walk).map((b) => b.top)) === 20
    && W6.entrances.find((e) => e.id === '6-C').pos[1] === 20);
  check('Welt 6: lebendige Kulisse in den Weltdaten (Windräder, Luftschiffchen, Wasserfälle, Regenbögen, Vögel, Seilbahn)',
    W6.windmills.length >= 5 && W6.airships.length >= 2 && W6.waterfalls.length >= 6 && W6.rainbows.length >= 2 && W6.birds.length >= 3 && W6.cableways.length === 1);
  check('Welt 6: Eingänge, Ausgänge und Häuser liegen auf begehbarem Gelände', W6.entrances.every((e) => grid.isWalk(e.pos[0], e.pos[2]) && grid.isWalk(exitPoint(e)[0], exitPoint(e)[2]))
    && grid.isWalk(W6.houses[0].item[0], W6.houses[0].item[2]) && grid.isWalk(W6.houses[1].pad[0], W6.houses[1].pad[2]) && grid.isWalk(W6.spawn.pos[0], W6.spawn.pos[2]));
  check('Welt 5: Glasröhre W6 unverändert (frei nach 5-Burg, Ziel Welt 6)', W5.levels.find((l) => l.id === 'W6')?.next === 6 && W5.levels.find((l) => l.id === 'W6')?.after === '5-Burg');
  const fake = (levels, worlds = [1]) => ({
    peek: (id) => levels[id] ?? null, starsInWorld: (w) => Object.entries(levels).filter(([k]) => k.startsWith(`${w}-`)).reduce((n, [, l]) => n + l.stars.filter(Boolean).length, 0),
    totalStars: () => Object.values(levels).reduce((n, l) => n + l.stars.filter(Boolean).length, 0), worldOpened: (n) => worlds.includes(n),
  });
  const maps = (n) => ({ 1: W1, 2: W2, 3: W3, 4: W4, 5: W5, 6: W6 }[n] ?? null);
  const d3 = { done: true, stars: [true, true, true] };
  check('worldOpen: Welt 6 zu ohne 5-Burg, offen mit 5-Burg oder wenn entdeckt (Welt-Warp); Welt 7 ohne Karte zu',
    !unlock.worldOpen(maps, fake({ '5-7': d3 }, [1, 2, 3, 4, 5]), 6) && unlock.worldOpen(maps, fake({ '5-Burg': d3 }, [1, 2, 3, 4, 5]), 6)
    && unlock.worldOpen(maps, fake({}, [1, 2, 3, 4, 5, 6]), 6) && !unlock.worldOpen(maps, fake({}, [1, 2, 3, 4, 5, 6, 7]), 7));
  check('Welt-7-Röhre: Weg frei nach 6-C oder sobald Welt 7 entdeckt ist; Sternbedarf 110/120 zählt alle Sterne',
    !unlock.pathOpen(W6, fake({}, [1, 2, 3, 4, 5, 6]), 'W7') && unlock.pathOpen(W6, fake({ '6-C': d3 }, [1, 2, 3, 4, 5, 6]), 'W7')
    && unlock.pathOpen(W6, fake({}, [1, 2, 3, 4, 5, 6, 7]), 'W7') && unlock.reason(W6, fake({ '6-2': d3, '5-1': d3 }), '6-3') === 'stars'
    && unlock.gateStars(W6, fake({ '1-1': d3, '5-1': d3 })) === 6 && unlock.reason(W6, fake({}), '6-B') === null && unlock.reason(W6, fake({}), '6-1') === null);
}

// ------------------------------------------------------------------ Browser
const PORT = 4270;
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
  await page.screenshot({ path: `${OUT}cmap6_${name}.png`, timeout: 200000 });
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
const W5IDS = ['5-1', '5-2', '5-3', '5-A', '5-4', '5-Kapitän', '5-5', '5-B', '5-6', '5-7', '5-Zug', '5-Burg'];
const PRE = [...W1IDS, ...W2IDS, ...W3IDS, ...W4IDS, ...W5IDS];
const withAfter = (M) => M.levels.filter((l) => l.after).map((l) => l.id);
const OPENED_12345 = ['1-2', '1-A', '1-3', '1-Schatz', '1-4', '1-5', '1-Burg', 'W2', ...withAfter(W2), 'W3', ...withAfter(W3), 'W4', ...withAfter(W4), 'W5', ...withAfter(W5)];
/** Welt 1–5 geschafft (je Level drei Sterne bzw. keine) – 48 Level, 144 Sterne. */
const w12345 = (stars = true) => { const l = {}; for (const id of PRE) l[id] = lvl(stars); return l; };
/** Welt 1–5 geschafft mit genau n Sternen (über die Level verteilt). */
const w12345n = (n) => {
  const l = w12345(false);
  let k = n;
  for (const id of PRE) for (let i = 0; i < 3 && k > 0; i++) { l[id].stars[i] = true; k--; }
  return l;
};
/** Welt-6-Level (ohne Sterne) als geschafft eintragen. */
const with6 = (base, ids) => { const l = { ...base }; for (const id of ids) l[id] = lvl(false); return l; };
/** Welt-6-Schranken, deren Weg mit den geschafften Leveln done frei ist (als geöffnet gemerkt – kein Schwenk). */
const opened6 = (done) => W6.levels.filter((l) => l.after && [].concat(l.after).every((a) => done.includes(a))).map((l) => l.id);
const WORLDS6 = [1, 2, 3, 4, 5, 6];
const EXIT_W5 = exitPoint(W6.entrances.find((e) => e.id === 'W5'));

// Teilläufe (W6_TEIL=1|2|3|4) für langsame Rechner, je unter 10 min; ohne Angabe alle Abschnitte.
//   1: Abschnitte 2–4 (Röhre W6 → Welt 6, Welt-Warp, Start/Titel, erstes Level), 2: 5–7 (Freischaltung, Brücken,
//   Sternschranken, Gegnergruppen), 3: 8–10 (Kulisse im Takt, Welt 7 bald, Beeren-/Glückshaus), 4: 11–14 (Bilder,
//   Neuladen, Rückweg nach Welt 5, Anflug)
const TEIL = process.env.W6_TEIL ?? '';
const PARTS = { 1: [2, 4], 2: [5, 7], 3: [8, 10], 4: [11, 14] };
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

// ------------------------------------------------------------------ 2) Glasröhre W6 in Welt 5 → Ankunft in Welt 6
if (part(2)) {
  await loadWith({ levels: w12345(true), mapOpened: [...OPENED_12345], world: 5, worlds: [1, 2, 3, 4, 5], coins: 0, mapPos: null });
  await waitMap(5);
  st = await sc(() => window.__courseMap.state());
  check('Welt 5 nach 5-Burg: Glasröhre W6 frei, Ziel „Wolkeninseln“ (Karte vorhanden, keine Codeänderung in Welt 5)',
    st.entrances.W6.enterable && st.entrances.W6.title === 'Wolkeninseln' && st.gates.W6 === 'open');
  await tp(54, 7.3, -154.5);
  r = await walkTo(54, -158, (s) => s.onPad === 'W6', 600);
  await shot('w5_roehre6', 600);
  await frames();
  check('Figur steht auf dem Podest der Welt-6-Röhre, Hinweis „ab durch die Glasröhre“', r.s.onPad === 'W6' && (await banner()).includes('Glasröhre'));
  await sc(() => window.__courseMap.setInput({ jump: true }));
  st = await sc(() => window.__courseMap.step(1));
  await sc(() => window.__courseMap.setInput({}));
  check('A auf dem Podest startet die Röhrenfahrt (Abfahrt nach Welt 6)', st.travel?.mode === 'depart' && !st.leaving && st.worlds.includes(6));
  r = await stepUntil((s) => s.travel?.phase === 'ride' && s.travel.t > 1.6, 600);
  await shot('w5_abfahrt', 400);
  r = await stepUntil(() => false, 600);
  check('Nach der Fahrt verlässt die Karte Welt 5 (Szenenwechsel zu Welt 6)', r.s.leaving === true);
  await waitMap(6);
  st = await sc(() => window.__courseMap.state());
  console.log('  Ankunft', JSON.stringify(st.travel), JSON.stringify(st.player));
  check('Welt 6 geladen, Ankunft durch die Rückweg-Röhre W5 (Figur weit draußen über dem Wolkenmeer)', st.world === 6 && st.travel?.mode === 'arrive' && st.travel.entrance === 'W5'
    && Math.hypot(st.player.x - EXIT_W5[0], st.player.z - EXIT_W5[2]) > 30);
  await shot('ankunft_weit', 300);
  r = await sc(() => ({ lod: window.__courseMap.lod.info(), travel: window.__courseMap.state().travel }));
  console.log('  Ankunft weit', JSON.stringify(r));
  check('Ankunft über dem Wolkenmeer: ferne Kleinteile ausgeblendet, Schattenkarte ruht', r.lod.hidden > 10 && (r.travel.t >= 1 || r.travel.shadows === false));
  r = await stepUntil((s) => s.travel?.t > 1.4, 400);
  await shot('ankunft', 400);
  r = await stepUntil((s) => s.travel?.t > 2.6, 400);
  await shot('ankunft_nah', 300);
  r = await stepUntil((s) => !s.travel, 900);
  await sc(() => window.__courseMap.step(40));
  st = await sc(() => window.__courseMap.state());
  console.log('  angekommen', JSON.stringify(st.player));
  check('Nach der Ankunft steht die Figur vor der Rückweg-Röhre auf der Ankunftsinsel', Math.hypot(st.player.x - EXIT_W5[0], st.player.z - EXIT_W5[2]) < 0.8 && st.player.mode === 'ground'
    && Math.abs(st.player.y - 10) < 0.05);
  check('Welt 6 gemerkt (offen, aktuelle Welt)', st.worlds.includes(6) && (await sc(() => JSON.parse(localStorage.getItem('lotti-greta-course-v1')).world)) === 6);
  await frames(3);
  check(`HUD: Weltname „Welt 6 · Wolkeninseln“, Sterne gesamt ${PRE.length * 3}, Welt 6 hat 34 Sterne`, (await sc(() => window.__courseMap.hud.worldName.text)) === 'Welt 6 · Wolkeninseln'
    && st.totalStars === PRE.length * 3 && st.stars === 0 && st.starsMax === 34);
  r = await sc(() => ({ name: window.__courseMap.musicName(), has: !!window.__audio.music.themeInfo('course_world6_map') }));
  check(`Musik der Welt-6-Karte: course_world6_map, solange sie fehlt der Rückfall course_map (jetzt: ${r.name})`, r.name === (r.has ? 'course_world6_map' : 'course_map'));
  await shot('start', 900);
}

// ------------------------------------------------------------------ 3) Welt-Warp aus einem Welt-5-Level landet in Welt 6
if (part(3)) {
  const done5 = W5IDS.filter((id) => !['5-7', '5-Zug', '5-Burg'].includes(id));
  lv = w12345(true);
  for (const id of ['5-7', '5-Zug', '5-Burg']) delete lv[id];
  await loadWith({ levels: lv, mapOpened: ['1-2', '1-A', '1-3', '1-Schatz', '1-4', '1-5', '1-Burg', 'W2', ...withAfter(W2), 'W3', ...withAfter(W3), 'W4', ...withAfter(W4), 'W5',
    ...W5.levels.filter((l) => l.after && [].concat(l.after).every((a) => done5.includes(a))).map((l) => l.id)], world: 5, worlds: [1, 2, 3, 4, 5], mapPos: null }, '&mapAlias=5-1:0-0');
  await waitMap(5);
  await tp(18.5, 1.3, 39, Math.PI / 2, 20);
  r = await walkTo(18.5, 36, (s) => s.onPad === '5-1', 900);
  st = await sc(() => { const m = window.__courseMap; m.enter(); m.step(1); return m.state(); });   // im selben Takt (die Szene wechselt danach)
  check('5-1 (Ersatz-Level) gestartet', st.leaving && st.lastStart?.entrance === '5-1');
  await waitCourse();
  // wie map/warp.js (Röhre mit warpWorld: 6): Welt 6 freischalten, Level ohne Zielmast verlassen
  await sc(() => { window.__courseSave.openWorld(6); window.__course.exitToMap({ warpWorld: 6 }); });
  await waitMap(6);
  st = await sc(() => window.__courseMap.state());
  console.log('  Warp-Ankunft', JSON.stringify(st.travel), st.soonWorld);
  check('Welt-Warp nach Welt 6 endet in Welt 6: Ankunft durch die Rückweg-Röhre W5, keine „bald“-Meldung', st.world === 6 && st.travel?.mode === 'arrive' && st.travel.entrance === 'W5'
    && st.soonWorld === null && st.worlds.includes(6));
  r = await stepUntil((s) => s.travel?.t > 1.4, 400);
  await shot('warp_ankunft', 400);
  r = await stepUntil((s) => !s.travel, 900);
  await sc(() => window.__courseMap.step(40));
  st = await sc(() => window.__courseMap.state());
  check('Nach dem Warp: Figur vor der Rückweg-Röhre, 6-1 und 6-B frei, Röhre zurück nach Welt 5 frei', Math.hypot(st.player.x - EXIT_W5[0], st.player.z - EXIT_W5[2]) < 0.8
    && !st.entrances['6-1'].locked && !st.entrances['6-B'].locked && st.entrances.W5.enterable && !st.cinematic && (await toast()) !== 'Welt 6 kommt bald!');
}

// ------------------------------------------------------------------ 4) Eingänge: Titel bzw. „Bald“, Start-Zustand, erstes Level
if (part(4)) {
  await loadWith({ levels: w12345(true), mapOpened: [...OPENED_12345], world: 6, worlds: WORLDS6, mapPos: null });
  await waitMap(6);
  const titles = await sc((ids) => { const out = {}; for (const id of ids) { const s = window.__courseMap.status(id); out[id] = [s.title, s.exists]; } return out; }, W6IDS);
  console.log('  Titel', JSON.stringify(titles));
  check('Eingänge in Welt 6 zeigen den Leveltitel bzw. „Bald“', Object.values(titles).every(([t, ex]) => (ex ? t && t !== 'Bald' : t === 'Bald')));
  st = await sc(() => window.__courseMap.state());
  check('Start in Welt 6: 6-1 und 6-B (Steinkreis) frei, alle anderen zu, Rückweg-Röhre frei, Welt-7-Röhre zu, alle 11 Schranken zu, 6 Gegner unterwegs',
    !st.entrances['6-1'].locked && !st.entrances['6-B'].locked && W6IDS.filter((id) => !['6-1', '6-B'].includes(id)).every((id) => st.entrances[id].locked)
    && st.entrances.W5.enterable && st.entrances.W7.locked && st.entrances.W7.discovered === false && Object.values(st.gates).length === 11
    && Object.values(st.gates).every((g) => g === 'closed') && st.roamers.length === 6);
  r = await sc(() => {
    const m = window.__courseMap;
    const g = m.roamersOf('6-B'), p = m.roamersOf('6-A');
    return { kinds: g.map((e) => e.spec.modelOpts?.kind).sort().join(), y: g.map((e) => +e.pos.y.toFixed(2)), x: g.map((e) => +e.pos.x.toFixed(1)), prinz: p.length, prinzModel: p[0]?.standInUsed ? 'stellvertreter' : 'registry', anchor: m.labelAnchor('6-B', m.player.pos.clone()).toArray().map((v) => +v.toFixed(1)) };
  });
  console.log('  Gruppen', JSON.stringify(r));
  check('Steinkreis: fünf Werfer-Brüder (Feuer, Hammer, Bumerang) tänzeln darin, Beschriftung über ihrer Mitte; Schubser-Prinz in der Festung',
    r.kinds === 'bumerang,bumerang,feuer,hammer,hammer' && r.y.every((y) => Math.abs(y - 10.5) < 0.3) && r.x.every((x) => Math.abs(x + 45) < 6) && r.prinz === 1
    && Math.hypot(r.anchor[0] + 45, r.anchor[2] - 24) < 3);
  await tp(0, 10.3, 36, -Math.PI / 2, 30);
  await shot('ankunftsinsel', 800);
  await tp(-36, 10.8, 31, Math.PI, 30);
  await shot('steinkreis', 800);
  await loadWith({}, '&mapAlias=6-1:0-0');
  await waitMap(6);
  st = await sc(() => window.__courseMap.state());
  check('mapAlias: 6-1 zeigt den Titel des Ersatz-Levels und ist startbar', st.entrances['6-1'].title !== 'Bald' && st.entrances['6-1'].enterable);
  await tp(12, 10.3, 39, Math.PI / 2, 20);
  r = await walkTo(12, 36, (s) => s.onPad === '6-1', 900);
  st = await sc(() => { const m = window.__courseMap; m.enter(); m.step(1); return m.state(); });   // im selben Takt (die Szene wechselt danach)
  check('Enter auf dem Podest 6-1 startet das (Ersatz-)Level', st.leaving && st.lastStart?.entrance === '6-1' && st.lastStart?.id === '0-0');
  await waitCourse();
  await sc(() => window.__course.exitToMap({ done: '0-0' }));
  await waitMap(6);
  st = await sc(() => window.__courseMap.state());
  check('Rückkehr aus dem Level: Welt 6, vor dem Bergland, Ergebnis auf 6-1 übertragen, Schranke zur Geisterschiff-Bucht versinkt',
    st.world === 6 && Math.hypot(st.player.x - 12, st.player.z - 38.6) < 0.8 && st.entrances['6-1'].done && st.cinematic);
  r = await stepUntil((s) => !s.cinematic, 1800);
  check('Weg zur Geisterschiff-Bucht offen, 6-2 frei', r.s.gates['6-2'] === 'open' && !r.s.entrances['6-2'].locked);
  // die Glasröhre zur Bucht ist begehbar
  await tp(0, 10.3, 30, Math.PI / 2, 20);
  r = await walkTo(0, 6, (s) => s.player.z < 7, 900);
  check('Durch die begehbare Glasröhre hinüber zur Geisterschiff-Bucht (y 11)', r.s.player.z < 7 && Math.abs(r.s.player.y - 11) < 0.1 && r.s.player.mode === 'ground');
  await tp(0, 10.6, 21, Math.PI / 2, 20);
  await shot('glasroehre', 600);
}

// ------------------------------------------------------------------ 5) Freischaltung nacheinander, begehbare Brücken
if (part(5)) {
  // 6-2 geschafft: zwei Schranken (6-3, 6-4) versinken nacheinander im Schwenk
  await loadWith({ levels: with6(w12345(true), ['6-1', '6-2']), mapOpened: [...OPENED_12345, '6-2'], world: 6, worlds: WORLDS6, mapPos: null });
  await waitMap(6);
  st = await sc(() => window.__courseMap.state());
  check('Nach 6-2: Schwenk zu den frischen Schranken (Fernost-Halle, Dschungel)', st.cinematic && st.gates['6-3'] === 'closed' && st.gates['6-4'] === 'closed');
  r = await stepUntil((s) => !s.cinematic, 4000);
  st = r.s;
  check('Schwenk endet: Wege zu 6-3 und 6-4 offen; 6-3 (144 ★ ≥ 110) und 6-4 frei; 6-A und 6-5 noch zu',
    ['6-3', '6-4'].every((id) => st.gates[id] === 'open' && !st.entrances[id].locked) && st.entrances['6-A'].locked && st.entrances['6-5'].locked
    && st.gates['6-A'] === 'closed' && st.gates['6-5'] === 'closed');
  await tp(-6, 11.3, -2);
  await shot('bucht', 700);
  const free = (s2, id) => !s2.entrances[id].locked && s2.entrances[id].pathOpen;
  const shut = (s2, id) => s2.entrances[id].locked && !s2.entrances[id].pathOpen;
  const steps = [
    [['6-4'], ['6-A', '6-5'], ['6-6']],
    [['6-4', '6-5'], ['6-6'], ['6-Haus', '6-7']],
    [['6-4', '6-5', '6-6'], ['6-Haus', '6-7'], ['6-Panzer']],
    [['6-4', '6-5', '6-6', '6-7'], ['6-Panzer'], ['6-C']],
    [['6-4', '6-5', '6-6', '6-7', '6-Panzer'], ['6-C'], ['W7']],
  ];
  for (const [done, nowFree, stillShut] of steps) {
    st = await setLevels(with6(w12345(true), ['6-1', '6-2', ...done]));
    check(`Nach ${done[done.length - 1]}: ${nowFree.join(', ')} frei, ${stillShut.join(', ')} noch zu`, nowFree.every((id) => free(st, id)) && stillShut.every((id) => shut(st, id)));
  }
  st = await setLevels(with6(w12345(true), ['6-1', '6-2', '6-4', '6-5', '6-6', '6-7', '6-Panzer', '6-C']));
  check('Nach 6-C: Weg zur Welt-7-Röhre offen, Röhre „Bald“ (Welt 7 gibt es noch nicht)', st.entrances.W7.pathOpen && !st.entrances.W7.locked
    && st.entrances.W7.soon && !st.entrances.W7.enterable && st.entrances.W7.title === 'Bald');
  // mit allen geschafften Leveln geladen sind alle Schranken offen; die Brücken sind begehbar
  const done = W6IDS.filter((id) => !['6-B', '6-A', '6-3', '6-Haus'].includes(id));
  await loadWith({ levels: with6(w12345(true), done), mapOpened: [...OPENED_12345, ...opened6(done)] });
  await waitMap(6);
  st = await sc(() => window.__courseMap.state());
  check('Alle Welt-6-Wege geschafft: alle 11 Schranken offen, alle Eingänge frei', Object.values(st.gates).length === 11 && Object.values(st.gates).every((g) => g === 'open')
    && W6IDS.every((id) => !st.entrances[id].locked));
  const walk = async (from, to, test, label) => {
    await tp(from[0], from[1] + 0.3, from[2], Math.PI / 2, 20);
    const rr = await walkTo(to[0], to[1], test, 1400);
    check(label, test(rr.s));
    return rr;
  };
  await walk([-26, 11, 0], [-44, 0], (s) => s.player.x < -42 && Math.abs(s.player.y - 12.5) < 0.1, 'Rote Brücke: von der Bucht hinüber zur Fernost-Insel (y 12.5)');
  await walk([40, 12, -38], [40, -58], (s) => s.player.z < -56 && Math.abs(s.player.y - 14) < 0.1, 'Glasröhre: vom Dschungel hinauf zum Schnee-Wolkenberg (y 14)');
  await walk([-14, 15, -80], [-44, -80], (s) => s.player.x < -42 && Math.abs(s.player.y - 15) < 0.1, 'Wolkenbrücke: von der Himmelsfabrik zum Prüfungs-Haus (y 15)');
  await walk([46, 16.5, -124], [46, -148], (s) => s.player.z < -146 && Math.abs(s.player.y - 20) < 0.1, 'Regenbogenbrücke: von der Wolkenstraße hinauf zum Zirkus-Gipfel (y 20)');
  await tp(46, 18.5, -133, Math.PI / 2, 20);
  await shot('regenbogenbruecke', 600);
}

// ------------------------------------------------------------------ 6) Sternschranken 110 / 120
if (part(6)) {
  const done2 = ['6-1', '6-2'];
  await loadWith({ levels: with6(w12345n(109), done2), mapOpened: [...OPENED_12345, ...opened6(done2)], world: 6, worlds: WORLDS6, mapPos: null });
  await waitMap(6);
  st = await sc(() => window.__courseMap.state());
  check('6-2 geschafft, 109 Sterne: Weg zur Fernost-Halle offen, 6-3 gesperrt (Sterne), 6-4 frei', st.gates['6-3'] === 'open' && st.entrances['6-3'].locked
    && st.entrances['6-3'].reason === 'stars' && st.gateStars === 109 && !st.entrances['6-4'].locked);
  await tp(-56, 12.8, -12);
  await shot('fernost', 900);
  const b110 = await banner();
  const noStart = !(await sc(() => { const m = window.__courseMap; m.enter(); return m.step(2).leaving; }));
  st = await setLevels(with6(w12345n(110), done2));
  const free110 = !st.entrances['6-3'].locked && st.gateStars === 110;
  const doneP = ['6-1', '6-2', '6-4', '6-5', '6-6', '6-7', '6-Panzer'];
  await loadWith({ levels: with6(w12345n(119), doneP), mapOpened: [...OPENED_12345, ...opened6(doneP)] });
  await waitMap(6);
  st = await sc(() => window.__courseMap.state());
  await tp(46, 20.3, -153);
  await shot('zirkus', 900);
  const b120 = await banner();
  console.log('  Hinweise:', b110, '|', b120);
  check('Hinweis „Benötigt 110 Sterne (109/110)“ an der Fernost-Halle, Enter startet nichts; mit 110 Sternen frei', b110 === 'Benötigt 110 Sterne (109/110)' && noStart && free110);
  check('„Benötigt 120 Sterne (119/120)“ am Zirkuszelt (Weg offen)', b120 === 'Benötigt 120 Sterne (119/120)' && st.gates['6-C'] === 'open'
    && st.entrances['6-C'].reason === 'stars' && st.gateStars === 119);
  st = await setLevels(with6(w12345n(120), doneP));
  check('120 Sterne: 6-C frei (zeigt „Bald“, bis es das Level gibt)', !st.entrances['6-C'].locked && st.gateStars === 120 && st.entrances['6-C'].enterable === st.entrances['6-C'].exists);
}

// ------------------------------------------------------------------ 7) Gegnergruppen starten 6-B (gleich frei) und 6-A
if (part(7)) {
  const roam = async (from, id) => {
    await tp(from[0], from[1], from[2], 0, 30);
    return sc(([lid]) => {
      const m = window.__courseMap;
      for (let i = 0; i < 1500; i++) {
        const p = m.player.pos;
        const b = m.roamersOf(lid).sort((a, c) => a.pos.distanceTo(p) - c.pos.distanceTo(p))[0];
        const dx = b.pos.x - p.x, dz = b.pos.z - p.z, d = Math.hypot(dx, dz) || 1;
        m.setInput({ x: dx / d, y: -dz / d });
        const s = m.step(1);
        if (s.leaving) return { i, s };
      }
      return { i: 1500, s: m.state() };
    }, [id]);
  };
  // ganz frischer Stand in Welt 6: der Steinkreis ist gleich frei
  await loadWith({ levels: w12345(true), mapOpened: [...OPENED_12345], world: 6, worlds: WORLDS6, mapPos: null }, '&mapAlias=6-B:0-0,6-A:0-0');
  await waitMap(6);
  r = await roam([-37.4, 10.8, 32], '6-B');
  check('Ohne ein Welt-6-Level: Berührung der Werfer-Brüder startet 6-B (Ersatz-Level 0-0)', r.s.leaving && r.s.lastStart?.entrance === '6-B' && r.s.lastStart?.id === '0-0');
  await waitCourse();
  await sc(() => window.__course.exitToMap({}));
  await waitMap(6);
  st = await sc(() => window.__courseMap.state());
  check('Rückkehr aus dem Level: wieder Welt 6, am Steinkreis-Ausgang, Werfer noch da', st.world === 6 && Math.hypot(st.player.x + 37.4, st.player.z - 32) < 0.8 && st.roamers.length === 6);
  const done4 = ['6-1', '6-2', '6-4'];
  await loadWith({ levels: with6(w12345(true), done4), mapOpened: [...OPENED_12345, ...opened6(done4)], mapPos: null }, '&mapAlias=6-B:0-0,6-A:0-0');
  await waitMap(6);
  await tp(69, 12.8, -19);
  await shot('festung', 900);
  r = await roam([67.4, 12.8, -22], '6-A');
  check('6-A frei: Berührung des Schubser-Prinzen startet 6-A (Ersatz-Level 0-0)', r.s.leaving && r.s.lastStart?.entrance === '6-A' && r.s.lastStart?.id === '0-0');
  await waitCourse();
  await sc(() => window.__course.exitToMap({}));
  await waitMap(6);
  st = await sc(() => window.__courseMap.state());
  check('Rückkehr: am Festungstor (Ausgang am Glasröhren-Steg)', st.world === 6 && Math.hypot(st.player.x - 67.4, st.player.z + 22) < 0.8);
}

// ------------------------------------------------------------------ 8) Windräder im Takt der Kartenmusik, Gong, lebendige Kulisse
if (part(8)) {
  if (!(await sc(() => window.__courseMap?.map.world === 6))) {
    const done = W6IDS.filter((id) => !['6-B', '6-A'].includes(id));
    await loadWith({ levels: with6(w12345(true), done), mapOpened: [...OPENED_12345, ...opened6([...done, '6-A', '6-B'])], world: 6, worlds: WORLDS6, mapPos: null });
    await waitMap(6);
  }
  await tp(40, 14.3, -66);
  r = await sc(() => {
    const mu = window.__audio.music, m = window.__courseMap;
    const theme = m.musicName();
    mu.setManualClock(true);
    const bpm = mu.beat().bpm, spb = 60 / bpm;
    const W = () => m.state().decor.windmills;
    const G = () => m.state().decor.gong;
    const b0 = W();
    mu.advanceClock((1 - (b0.beat % 1)) * spb + 0.6 * spb);   // nächste Zählzeit, Haltephase
    const b1 = W();
    mu.advanceClock(0.2 * spb);                               // noch dieselbe Zählzeit
    const b2 = W();
    mu.advanceClock(0.3 * spb);                               // nächste Zählzeit, Bewegung
    const b3 = W();
    mu.advanceClock(0.5 * spb);                               // Haltephase
    const b4 = W();
    // Gong: die Updater der Fernost-Kulisse zählen je Takt (4 Zählzeiten) einen Schlag
    const ev = m.built.entrances.get('6-3');
    const run = () => { for (const u of ev.updaters) u(0, m.view.time); return G(); };
    const g0 = run();
    mu.advanceClock(4 * spb);
    const g1 = run();
    mu.advanceClock(8 * spb);
    const g2 = run();
    return { theme, bpm, b0, b1, b2, b3, b4, g0, g1, g2 };
  });
  console.log('  Windräder:', JSON.stringify({ b0: r.b0.step, b1: [r.b1.step, r.b1.moving, r.b1.angle], b2: r.b2.angle, b3: [r.b3.step, r.b3.moving], b4: [r.b4.step, r.b4.angle], src: r.b1.source, theme: r.b1.theme, bpm: r.bpm, gong: [r.g0.strikes, r.g1.strikes, r.g2.strikes] }));
  check(`Windräder folgen der Taktuhr der Kartenmusik (${r.theme}, ${r.bpm} BPM)`, r.b1.theme === r.theme && r.b1.source !== 'zeit' && r.b1.bpm === r.bpm && r.b0.n >= 5);
  check('Je Zählzeit eine Achtelrunde: Schritt +1 am Taktschlag, Flügel halten in der zweiten Hälfte, drehen in der ersten',
    r.b1.step === (Math.floor(r.b0.beat) + 1) % 8 && !r.b1.moving && r.b2.angle === r.b1.angle && r.b3.step === (r.b1.step + 1) % 8
    && r.b3.moving && r.b4.step === r.b3.step && !r.b4.moving && r.b4.angle !== r.b2.angle);
  check('Gong der Fernost-Halle schlägt je Takt der Kartenmusik (4 Zählzeiten = 1 Schlag, 8 = 2)', r.g1.strikes === r.g0.strikes + 1 && r.g2.strikes === r.g0.strikes + 3 && r.g1.theme === r.theme);
  await frames(3);
  const shown = await sc(() => window.__courseMap.state().decor.windmills);
  check('Darstellung folgt: gezeigte Flügelstellung = Stellung der Taktuhr', shown.shown?.step === shown.step && Math.abs(shown.shown.angle - shown.angle) < 1e-3);
  await shot('windraeder', 300, false, 2);
  await sc(() => window.__audio.music.setManualClock(false));
  // Ersatzuhr ohne Musik
  r = await sc(() => {
    const mu = window.__audio.music;
    mu.stop();
    const d = window.__courseMap.state().decor.windmills;
    const want = mu.themeInfo('course_world6_map')?.bpm ?? mu.themeInfo('course_map')?.bpm;
    const life = window.__courseMap.built.life;
    const a1 = life.windInfo(10).angle, a2 = life.windInfo(10 + 60 / want).angle;
    return { d, want, a1, a2 };
  });
  check('Ohne laufende Musik zählt die Ersatzuhr (Kartenzeit) im Tempo der Welt-6-Kartenmusik (bzw. Rückfall), eine Achtelrunde je Zählzeit',
    r.d.source === 'zeit' && r.d.bpm === r.want && Math.abs(((r.a2 - r.a1 + Math.PI * 2) % (Math.PI * 2)) - Math.PI / 4) < 1e-3);
  await sc(() => window.__audio.music.play(window.__courseMap.musicName()));
  // Lebendige Kulisse: Geisterschiff schwankt, Floß kreist, Wurfmaschine wirft, Aufzug fährt, Luftschiffe, Wasserfälle
  r = await sc(() => {
    const m = window.__courseMap;
    const run = (id, t) => { for (const u of m.built.entrances.get(id).updaters) u(0, t); return m.state().decor; };
    const s1 = run('6-2', 1.0).ship.roll, s2 = run('6-2', 4.0).ship.roll;
    const f1 = run('6-4', 1).raft, f2 = run('6-4', 9).raft;
    const p1 = run('6-Haus', 1).pitch.throws, p2 = run('6-Haus', 11).pitch.throws;
    const c1 = run('6-7', 0).mine.cage, c2 = run('6-7', 6).mine.cage;
    const d = m.state().decor;
    const names = ['w6:luftschiff', 'w6:wasserfaelle', 'w6:windradfluegel', 'w6:kreisgeister', 'w6:wuschel-horde', 'w6:zahnraeder', 'w6:geleebrocken', 'w6:geisterschiff', 'wolkenmeer:kuppen'];
    const found = names.filter((n) => m.view.three.getObjectByName(n));
    return { s1, s2, f1, f2, p1, p2, c1, c2, air: d.airships.n, falls: d.waterfalls.n, models: d.w6models, found, names: names.length };
  });
  console.log('  Kulisse', JSON.stringify(r));
  check('Lebendige Kulisse: Geisterschiff schwankt, Floß kreist auf dem Giftsee, Wurfmaschine wirft, Aufzugkorb fährt, 3 Luftschiffchen, 9 Wasserfälle, Wolkenmeer',
    Math.abs(r.s1 - r.s2) > 0.01 && Math.hypot(r.f1.x - r.f2.x, r.f1.z - r.f2.z) > 1 && r.p2 > r.p1 && Math.abs(r.c1 - r.c2) > 1 && r.air === 3 && r.falls === 9 && r.found.length === r.names);
  console.log('  Registry-Modelle in der Kulisse:', (r.models ?? []).join(', '));
}

// ------------------------------------------------------------------ 9) Glasröhre W7 „bald“, Welt-Warp nach Welt 7 über den Rückfall
if (part(9)) {
  const all = W6IDS.filter((id) => !['6-B', '6-A', '6-3', '6-Haus'].includes(id));
  await loadWith({ levels: with6(w12345(true), all), mapOpened: [...OPENED_12345, ...opened6(all)], world: 6, worlds: WORLDS6, mapPos: null });
  await waitMap(6);
  await tp(80, 20.3, -154, -Math.PI / 2, 20);
  r = await walkTo(80, -157, (s) => s.onPad === 'W7', 400);
  await shot('roehre7', 700);
  await sc(() => { const m = window.__courseMap; m.hud.toast('', 0.01); m.step(2); m.enter(); m.step(1); });
  const msg = await toast();
  st = await sc(() => { const m = window.__courseMap; m.setInput({ jump: true }); m.step(1); m.setInput({}); return m.step(5); });
  check('Welt-7-Röhre nach 6-C: Weg frei, „Bald“, Enter/A zeigt „Welt 7 kommt bald!“ statt einer Fahrt', r.s.onPad === 'W7' && msg === 'Welt 7 kommt bald!' && !st.travel && !st.leaving
    && st.entrances.W7.soon && !st.entrances.W7.enterable && st.entrances.W7.discovered === false);
  // Warp nach Welt 7 aus einem Welt-6-Level (6-C noch offen, Zirkus-Schranke zu): Rückfall – Ankunft in Welt 6 durch die
  // Welt-7-Röhre hinter den gesperrten Schranken
  const doneP = ['6-1', '6-2', '6-4', '6-5', '6-6', '6-7'];
  await loadWith({ levels: with6(w12345(true), doneP), mapOpened: [...OPENED_12345, ...opened6(doneP)], world: 6, worlds: WORLDS6, mapPos: null }, '&mapAlias=6-1:0-0');
  await waitMap(6);
  await tp(12, 10.3, 39, Math.PI / 2, 20);
  r = await walkTo(12, 36, (s) => s.onPad === '6-1', 900);
  await sc(() => { const m = window.__courseMap; m.enter(); m.step(1); });
  await waitCourse();
  await sc(() => { window.__courseSave.openWorld(7); window.__course.exitToMap({ warpWorld: 7 }); });
  await waitMap(6);
  st = await sc(() => window.__courseMap.state());
  console.log('  Warp 7:', JSON.stringify(st.travel), st.soonWorld, JSON.stringify(st.entrances.W7));
  check('Welt-Warp 7 ohne Welt-7-Karte endet in Welt 6: Ankunft durch die Welt-7-Röhre, Röhre entdeckt, Weg frei, „Bald“',
    st.world === 6 && st.travel?.mode === 'arrive' && st.travel.entrance === 'W7' && st.soonWorld === 7 && st.worlds.includes(7)
    && st.entrances.W7.discovered === true && !st.entrances.W7.locked && st.entrances.W7.soon);
  r = await stepUntil((s) => s.travel?.t > 1.4, 400);
  await shot('warp7_ankunft', 400);
  r = await stepUntil((s) => !s.travel, 900);
  const msg7 = await toast();
  st = await sc(() => window.__courseMap.state());
  check('Nach der Ankunft: „Welt 7 kommt bald!“, Schranke zur Röhren-Insel versinkt (Schwenk)', msg7 === 'Welt 7 kommt bald!' && st.cinematic);
  r = await stepUntil((s) => !s.cinematic, 1800);
  await sc(() => window.__courseMap.step(20));
  st = await sc(() => window.__courseMap.state());
  const exit7 = exitPoint(W6.entrances.find((e) => e.id === 'W7'));
  check('Figur steht vor der Welt-7-Röhre, Schranke offen', Math.hypot(st.player.x - exit7[0], st.player.z - exit7[2]) < 0.8 && st.gates.W7 === 'open' && !st.cinematic);
  await tp(46, 20.3, -146, Math.PI / 2, 20);
  r = await walkTo(46, -124, (s) => s.player.z > -126, 900);
  check('Vom Zirkus-Gipfel zurück: Schranke 6-C auf der Regenbogenbrücke lässt die Figur von hinten durch', r.s.player.z > -126 && r.s.gates['6-C'] === 'closed'
    && Math.abs(r.s.player.y - 16.5) < 0.1);
}

// ------------------------------------------------------------------ 10) Beerenhaus, Glückshaus
if (part(10)) {
  const done6 = ['6-1', '6-2', '6-4', '6-5', '6-6'];
  await loadWith({ levels: with6(w12345(true), done6), mapOpened: [...OPENED_12345, ...opened6(done6)], world: 6, worlds: WORLDS6, mapPos: null, coins: 0 });
  await waitMap(6);
  st = await sc(() => window.__courseMap.state());
  check('Beerenhaus in Welt 6 bietet ein Power-up an', st.berry === true);
  const H = W6.houses[0];
  await tp(H.item[0], 10.3, H.item[2] + 3, Math.PI / 2, 20);
  r = await walkTo(H.item[0], H.item[2], (s) => !s.berry, 400);
  check('Beerenhaus: Power-up eingepackt', !r.s.berry && !!r.s.carryPower && r.s.player.power === r.s.carryPower);
  await shot('beerenhaus', 800);
  const G = W6.houses[1];
  await sc((p) => { const s = window.__courseSave; s.data.coins = 25; s.save(); const m = window.__courseMap; m.teleport(p[0], 15.3, p[2] + 3, Math.PI / 2); m.step(10); }, G.pad);
  r = await walkTo(G.pad[0], G.pad[2], (s) => s.onSlotPad, 400);
  check('Figur steht auf der Matte vor dem Spielautomaten (Himmelsfabrik)', r.s.onSlotPad === true);
  await sc(() => { window.__courseMap.slot.force(['coin', 'coin', 'coin']); const m = window.__courseMap; m.setInput({ jump: true }); m.step(1); m.setInput({}); m.step(60); });
  st = await sc(() => window.__courseMap.state());
  check('Glückshaus: A zieht den Hebel, Einsatz 10 bezahlt', st.slot.state === 'spin' && st.coins === 15);
  await shot('glueck', 600);
  st = await sc(() => window.__courseMap.step(420));
  check('3 × Bitcoin: 30 Bitcoins Gewinn (15 → 45)', st.slot.state === 'idle' && st.coins === 45);
}

// ------------------------------------------------------------------ 11) Bilder der Insel (alle Wege offen, alle Level geschafft)
if (part(11)) {
  const all = W6IDS.filter((id) => !['6-B', '6-A'].includes(id));
  await loadWith({ levels: with6(w12345(true), all), mapOpened: [...OPENED_12345, ...opened6([...all, '6-A', '6-B'])], world: 6, worlds: WORLDS6, mapPos: null });
  await waitMap(6);
  for (const [name, pos, yaw] of [['bergland', [10, 10, 40]], ['bucht_schiff', [-6, 11, -6]], ['dschungel', [43, 12, -6.5]], ['schnee', [40, 14, -62.5]],
    ['fabrik', [-9, 15, -70.5]], ['haus', [-51, 15, -72.5]], ['mine', [-15, 16, -113.5]], ['wolkenstrasse', [36, 16.5, -113.5]], ['zirkus_frei', [46, 20, -149.5]],
    ['roehreninsel', [80, 20, -153.5]], ['brueckenblick', [0, 10, 30.5]]]) {
    await tp(pos[0], pos[1] + 0.3, pos[2], yaw ?? -Math.PI / 2, 30);
    await shot(name, 300);
  }
}

// ------------------------------------------------------------------ 12) Aktuelle Welt bleibt nach Neuladen
if (part(12)) {
  if (!(await sc(() => window.__courseMap?.map.world === 6))) { await loadWith({ levels: w12345(true), mapOpened: [...OPENED_12345], world: 6, worlds: WORLDS6, mapPos: null }); await waitMap(6); }
  await sc(() => { const m = window.__courseMap; m.teleport(4, 10.3, 40, Math.PI / 2); m.step(30); m.rememberPos(); });
  await page.reload({ waitUntil: 'load' });
  await waitMap();
  st = await sc(() => window.__courseMap.state());
  check('Nach Neuladen: wieder Welt 6 an der gemerkten Stelle', st.world === 6 && Math.hypot(st.player.x - 4, st.player.z - 40) < 0.8);
}

// ------------------------------------------------------------------ 13) Rückweg nach Welt 5
if (part(13)) {
  if (!(await sc(() => window.__courseMap?.map.world === 6))) { await loadWith({ levels: w12345(true), mapOpened: [...OPENED_12345], world: 6, worlds: WORLDS6, mapPos: null }); await waitMap(6); }
  const W5E = W6.entrances.find((e) => e.id === 'W5').pos;
  await tp(W5E[0], 10.3, W5E[2] + 3, Math.PI / 2, 20);
  r = await walkTo(W5E[0], W5E[2], (s) => s.onPad === 'W5', 400);
  await sc(() => { const m = window.__courseMap; m.setInput({ jump: true }); m.step(1); m.setInput({}); });
  st = await sc(() => window.__courseMap.state());
  check('Rückweg-Röhre in Welt 6 startet die Fahrt nach Welt 5', r.s.onPad === 'W5' && st.travel?.mode === 'depart');
  await shot('abfahrt_w5', 300);
  r = await stepUntil(() => false, 900);
  await waitMap(5);
  st = await sc(() => window.__courseMap.state());
  check('Welt 5: Ankunft durch die Welt-6-Röhre (von den Wolkeninseln her)', st.world === 5 && st.travel?.mode === 'arrive' && st.travel.entrance === 'W6');
  await shot('w5_ankunft', 300);
  r = await stepUntil((s) => !s.travel, 900);
  await sc(() => window.__courseMap.step(40));
  st = await sc(() => window.__courseMap.state());
  check('Zurück in Welt 5 vor der Glasröhre nach Welt 6 (Röhren-Insel), Röhre frei mit Ziel „Wolkeninseln“',
    st.world === 5 && Math.hypot(st.player.x - 54, st.player.z + 155.4) < 0.8 && st.entrances.W6.enterable && st.entrances.W6.title === 'Wolkeninseln');
  await shot('w5_roehre6_zurueck', 600);
}

// ------------------------------------------------------------------ 14) Anflug (Welt 6 betreten) und Kennzahlen
if (part(14)) {
  await loadWith({ levels: w12345(true), mapOpened: [...OPENED_12345], world: 6, worlds: WORLDS6, mapPos: null });
  try { await page.waitForFunction(() => window.__courseMap && window.__courseMap.intro && window.__courseMap.map.world === 6, null, { timeout: 150000 }); } catch { /* ohne Anflug */ }
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}cmap6_anflug.png`, timeout: 200000 });
  { const s = await sc(() => window.__courseMap?.intro ? window.__courseMap.stats() : null); if (s) stats.push(['anflug', s.calls, s.triangles, 6]); }
  check('Anflug beim Betreten von Welt 6 läuft', stats.some(([n]) => n === 'anflug'));
  await waitMap(6);
}

console.log(`  — Ende (${Math.round((Date.now() - T0) / 1000)} s)`);
const sst = await sc(() => window.__courseMap.map.world === 6 ? window.__courseMap.stats() : null);
if (sst) console.log(`\n  Statische Kulisse Welt 6: ${sst.staticMeshes} Kachel-Meshes, ${Math.round(sst.staticTriangles / 1000)} k Dreiecke, ${sst.shapes} Kollisionsformen`);
console.log('  Kennzahlen je Bild (Zeichenaufrufe inkl. Schattenpass, Dreiecke):');
for (const [n, c, t, w] of stats) console.log(`    ${n.padEnd(20)} ${String(c).padStart(4)} Aufrufe  ${String(Math.round(t / 1000)).padStart(4)} k Dreiecke  (Welt ${w})`);
for (const w of [6, 5]) {
  const ws = stats.filter(([, , , ww]) => ww === w);
  if (!ws.length) continue;
  const maxCalls = Math.max(...ws.map((s) => s[1])), maxTris = Math.max(...ws.map((s) => s[2]));
  check(`Kennzahlen Welt ${w}: Zeichenaufrufe < 120 (max ${maxCalls}), Dreiecke < 300 k (max ${Math.round(maxTris / 1000)} k)`, maxCalls < 120 && maxTris < 300000);
}

await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
