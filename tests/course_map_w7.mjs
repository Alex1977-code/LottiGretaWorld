// Welt-7-Karte „Lava-Festung“ der Kurs-Karte (Präzisierung Mehrwelten-Karte, Notiz Welt 7):
//   Weltdaten (Schranken riegeln ab, Ids/Reihenfolge/Sternbedarf laut Vertrag „Welt 7 – Level-Liste“, 32 Sterne, Röhren
//   W6/W8, Arenen am Rand) – Node; Glasröhre W7 in Welt 6 → Fahrt → Ankunft in Welt 7 an der Rückweg-Röhre (ohne
//   Codeänderung in Welt 6); Welt-Warp nach Welt 7 aus einem Welt-6-Level landet in Welt 7; Eingänge zeigen Titel bzw.
//   „Bald“ (mapAlias); Freischaltung nacheinander (Schranken-Schwenk, Wege, begehbare Brücken, Damm, Zugbrücke,
//   Glasröhre); Sternschranke 150 mit Hinweis „Benötigt 150 Sterne (x/150)“; Gegnergruppen (heller Lavafelsen-König,
//   blauer Schubser-Prinz, Feuer-Werfer) starten 7-A/7-B/7-C; Lava-Fontänen im Takt der Kartenmusik (Taktuhr, manuell
//   vorgespult) und Ersatzuhr ohne Musik, lebendige Kulisse (Lava fließt, Schaltfelder, Rennkugeln, Zylinder, Kraterlava,
//   Lavadrache, Rammfisch …); Glasröhre W8 „Welt 8 kommt bald!“ (auch Welt-Warp nach Welt 8 über den vorhandenen
//   Rückfall, Schranke von hinten); Beerenhaus, Glückshaus; gespeicherte Welt bleibt nach Neuladen; Rückweg nach Welt 6;
//   Anflug; Kennzahlen (< 120 Zeichenaufrufe, < 300 k Dreiecke an jeder Ansicht inkl. Ankunft und Anflug); keine
//   Konsolenfehler.
// Simulation deterministisch über window.__courseMap.step(n)/setInput; Bilder tests/out/cmap7_*.png zur Sichtprüfung.
// Aufruf: npm run build && node tests/course_map_w7.mjs   (Teilläufe: W7_TEIL=1, 2, 3, 4 – s. u.; PORT_BASE verschiebt den Port)
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';
import { MAP as W7 } from '../src/course/map/worlds/w7.js';
import { MAP as W6 } from '../src/course/map/worlds/w6.js';
import { MAP as W5 } from '../src/course/map/worlds/w5.js';
import { MAP as W4 } from '../src/course/map/worlds/w4.js';
import { MAP as W3 } from '../src/course/map/worlds/w3.js';
import { MAP as W2 } from '../src/course/map/worlds/w2.js';
import { MAP as W1 } from '../src/course/map/worlds/w1.js';
import { buildWalkGrid, reachable, gateRects, gateSides, exitPoint } from '../src/course/map/layout.js';
import * as unlock from '../src/course/map/unlock.js';

const { check, summary } = makeChecker();
const W7IDS = ['7-1', '7-2', '7-A', '7-3', '7-4', '7-B', '7-5', '7-Kapitän', '7-6', '7-C', '7-7', '7-Burg'];

// ------------------------------------------------------------------ 1) Weltdaten und Logik (Node)
{
  const grid = buildWalkGrid(W7);
  const order = W7.levels.map((l) => l.id);
  const after = Object.fromEntries(W7.levels.map((l) => [l.id, [].concat(l.after ?? [])]));
  let ok = true;
  const open = new Set();
  for (let i = 0; i <= order.length; i++) {
    const done = new Set(order.slice(0, i));
    for (const id of order) if (after[id].every((a) => done.has(a))) open.add(id);
    const r = reachable(W7, grid, open).ids.sort();
    const want = order.filter((id) => open.has(id)).sort();
    if (r.join() !== want.join()) { ok = false; console.log('   erreichbar', r.join(), 'erwartet', want.join()); }
  }
  check('Welt 7: jede Schranke riegelt ihren Bereich vollständig ab', ok);
  const gr = gateRects(W7, grid);
  check('Welt 7: 12 Schranken (je 4 m breit), jede mit Rückseite', gr.length === 12 && gr.every((g) => Math.abs(g.width - 4) < 0.01) && gateSides(W7, grid).every((g) => g.back !== 0));
  check('Welt 7: Ids und Reihenfolge der Welt-7-Liste', W7.levels.filter((l) => !l.next).map((l) => l.id).join() === W7IDS.join());
  const rule = (id) => W7.levels.find((l) => l.id === id);
  check('Welt 7: Freischaltung laut Vertrag (7-1 frei, 7-2/7-A nach 7-1, 7-3/7-4 nach 7-2, 7-B/7-5 nach 7-4, 7-Kapitän/7-6 nach 7-5, 7-C/7-7 nach 7-6, 7-Burg nach 7-7 ≥ 150)',
    !rule('7-1').after && rule('7-2').after === '7-1' && rule('7-A').after === '7-1' && rule('7-3').after === '7-2' && rule('7-4').after === '7-2'
    && rule('7-B').after === '7-4' && rule('7-5').after === '7-4' && rule('7-Kapitän').after === '7-5' && rule('7-6').after === '7-5'
    && rule('7-C').after === '7-6' && rule('7-7').after === '7-6' && rule('7-Burg').after === '7-7' && rule('7-Burg').minStars === 150
    && W7.starScope === 'all' && W7IDS.filter((id) => rule(id).minStars).join() === '7-Burg');
  const perLevel = { '7-1': 3, '7-2': 3, '7-A': 1, '7-3': 3, '7-4': 3, '7-B': 1, '7-5': 3, '7-Kapitän': 5, '7-6': 3, '7-C': 1, '7-7': 3, '7-Burg': 3 };
  check('Welt 7: Sterne je Eingang wie in der Welt-7-Tabelle (zusammen 32), Stempel bei den Parcours und 7-Burg',
    W7IDS.every((id) => rule(id).stars === perLevel[id]) && unlock.worldStarsMax(W7) === 32
    && W7IDS.filter((id) => rule(id).stamp).join() === '7-1,7-2,7-3,7-4,7-5,7-6,7-7,7-Burg');
  check('Welt 7: Glasröhre zurück (W6, offen) und nach Welt 8 (nach 7-Burg)', rule('W6').next === 6 && rule('W6').world === 6 && !rule('W6').after
    && rule('W8').next === 8 && rule('W8').world === 8 && rule('W8').after === '7-Burg');
  check('Welt 7: jeder Eingang hat ein Podest/eine Kulisse, Kulissen-Arten je Zone',
    W7.levels.every((l) => W7.entrances.some((e) => e.id === l.id))
    && W7IDS.map((id) => W7.entrances.find((e) => e.id === id).kind).join() === 'bluefort,templerock,rockarena,lavarace,bluecylinders,bluecage,lavatower,machinediorama,reeflagoon,werferhall,crater,lavakeep'
    && W7.entrances.filter((e) => e.kind === 'pipe').map((e) => e.id).join() === 'W6,W8');
  check('Welt 7: Gegnergruppen der drei Arenen (heller Lavafelsen-König 7-A, blauer Schubser-Prinz 7-B, vier Feuer-Werfer 7-C), Beerenhaus und Glückshaus',
    W7.roamers.length === 3 && W7.roamers[0].level === '7-A' && W7.roamers[0].model === 'lavafelsen_koenig' && W7.roamers[0].memberOpts[0].variant === 'hell'
    && W7.roamers[1].level === '7-B' && W7.roamers[1].model === 'schubser_prinz' && W7.roamers[1].memberOpts[0].color === 'blau'
    && W7.roamers[2].level === '7-C' && W7.roamers[2].model === 'feuer_werfer' && W7.roamers[2].count === 4
    && W7.houses.some((h) => h.kind === 'beeren') && W7.houses.some((h) => h.kind === 'glueck' && h.stake === 10));
  // Arenen am Rand: kein anderer Eingang liegt weiter außen in ihrer Richtung (Nebenwege zum Rand der Insel)
  const xs = W7.ground.flatMap((b) => [b.rect[0], b.rect[2]]);
  const arenaPos = (id) => W7.entrances.find((e) => e.id === id).pos;
  check('Welt 7: die drei Arenen liegen als Nebenwege am Rand (7-A Westteil der Bucht, 7-B ganz im Westen, 7-C am Ostrand)',
    arenaPos('7-B')[0] < -70 && arenaPos('7-A')[0] < -40 && arenaPos('7-C')[0] > 20 && Math.min(...xs) >= -92);
  const segs = (t) => W7.segments.filter((s) => s.type === t).length;
  check('Welt 7: Schild „ab 150 ★“, Brücken (Basaltbrücken, Kettenstege, Damm, Zugbrücke, Glasröhre), Musik course_world7_map, Thema map_lava',
    W7.signs.some((s) => s.text === 'ab 150 ★') && segs('basaltbridge') >= 4 && segs('chainbridge') >= 2 && segs('causeway') === 1 && segs('drawbridge') === 1
    && segs('glasstube') === 1 && W7.segments.length === W7.walk.length && W7.music === 'course_world7_map' && W7.fallbackMusic === 'course_map'
    && W7.theme === 'map_lava' && W7.kit === 'lava' && W7.world === 7 && W7.sea === 0);
  const red = W7.ground.filter((b) => b.style === 'basin').length, blue = W7.ground.filter((b) => b.style === 'bluebasin').length;
  check(`Welt 7: Lavaflüsse und -seen rot (${red}) und blau (${blue}), Lagune mit Wasser, Lava-Burg am höchsten Punkt`, red >= 4 && blue >= 2
    && W7.ground.some((b) => b.style === 'lagoon') && W7.entrances.find((e) => e.id === '7-Burg').pos[1] === Math.max(...W7.ground.filter((b) => b.walk).map((b) => b.top)));
  check('Welt 7: lebendige Kulisse in den Weltdaten (Fontänen, Lavafälle, Rauch, Knochenflieger, Fahnen, Fackeln, Platschfische, Seilbahn)',
    W7.fountains.length >= 10 && W7.lavafalls.length >= 3 && W7.smoke.length >= 5 && W7.boneflyers.length >= 3 && W7.flags.length >= 8 && W7.torches.length >= 10
    && W7.fishjumps.length >= 5 && W7.cableways.length === 1 && W7.fountains.some((f) => f[4] === 'blau') && W7.lavafalls.some((f) => f.color === 'blau'));
  check('Welt 7: Eingänge, Ausgänge und Häuser liegen auf begehbarem Gelände', W7.entrances.every((e) => grid.isWalk(e.pos[0], e.pos[2]) && grid.isWalk(exitPoint(e)[0], exitPoint(e)[2]))
    && grid.isWalk(W7.houses[0].item[0], W7.houses[0].item[2]) && grid.isWalk(W7.houses[1].pad[0], W7.houses[1].pad[2]) && grid.isWalk(W7.spawn.pos[0], W7.spawn.pos[2]));
  check('Welt 6: Glasröhre W7 unverändert (frei nach 6-C, Ziel Welt 7)', W6.levels.find((l) => l.id === 'W7')?.next === 7 && W6.levels.find((l) => l.id === 'W7')?.after === '6-C');
  const fake = (levels, worlds = [1]) => ({
    peek: (id) => levels[id] ?? null, starsInWorld: (w) => Object.entries(levels).filter(([k]) => k.startsWith(`${w}-`)).reduce((n, [, l]) => n + l.stars.filter(Boolean).length, 0),
    totalStars: () => Object.values(levels).reduce((n, l) => n + l.stars.filter(Boolean).length, 0), worldOpened: (n) => worlds.includes(n),
  });
  const maps = (n) => ({ 1: W1, 2: W2, 3: W3, 4: W4, 5: W5, 6: W6, 7: W7 }[n] ?? null);
  const d3 = { done: true, stars: [true, true, true] };
  check('worldOpen: Welt 7 zu ohne 6-C, offen mit 6-C oder wenn entdeckt (Welt-Warp); Welt 8 ohne Karte zu',
    !unlock.worldOpen(maps, fake({ '6-Panzer': d3 }, [1, 2, 3, 4, 5, 6]), 7) && unlock.worldOpen(maps, fake({ '6-C': d3 }, [1, 2, 3, 4, 5, 6]), 7)
    && unlock.worldOpen(maps, fake({}, [1, 2, 3, 4, 5, 6, 7]), 7) && !unlock.worldOpen(maps, fake({}, [1, 2, 3, 4, 5, 6, 7, 8]), 8));
  const many = {}; for (let i = 0; i < 50; i++) many[`5-x${i}`] = d3;
  check('Welt-8-Röhre: Weg frei nach 7-Burg oder sobald Welt 8 entdeckt ist; 7-Burg braucht 150 Sterne (alle Sterne zählen)',
    !unlock.pathOpen(W7, fake({}, [1, 2, 3, 4, 5, 6, 7]), 'W8') && unlock.pathOpen(W7, fake({ '7-Burg': d3 }, [1, 2, 3, 4, 5, 6, 7]), 'W8')
    && unlock.pathOpen(W7, fake({}, [1, 2, 3, 4, 5, 6, 7, 8]), 'W8') && unlock.reason(W7, fake({ '7-7': d3, '6-1': d3 }), '7-Burg') === 'stars'
    && unlock.reason(W7, fake({ ...many, '7-7': d3 }), '7-Burg') === null && unlock.gateStars(W7, fake({ '1-1': d3, '6-1': d3 })) === 6
    && unlock.reason(W7, fake({}), '7-1') === null && unlock.reason(W7, fake({}), '7-2') === 'locked');
}

// ------------------------------------------------------------------ Browser
const PORT = 4280;
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
  await page.screenshot({ path: `${OUT}cmap7_${name}.png`, timeout: 200000 });
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
const W6IDS = ['6-1', '6-B', '6-2', '6-3', '6-4', '6-A', '6-5', '6-6', '6-Haus', '6-7', '6-Panzer', '6-C'];
const PRE = [...W1IDS, ...W2IDS, ...W3IDS, ...W4IDS, ...W5IDS, ...W6IDS];
const withAfter = (M) => M.levels.filter((l) => l.after).map((l) => l.id);
const OPENED_1_6 = ['1-2', '1-A', '1-3', '1-Schatz', '1-4', '1-5', '1-Burg', 'W2', ...withAfter(W2), 'W3', ...withAfter(W3), 'W4', ...withAfter(W4), 'W5', ...withAfter(W5), 'W6', ...withAfter(W6)];
/** Welt 1–6 geschafft (je Level drei Sterne bzw. keine) – 60 Level, 180 Sterne. */
const w1to6 = (stars = true) => { const l = {}; for (const id of PRE) l[id] = lvl(stars); return l; };
/** Welt 1–6 geschafft mit genau n Sternen (über die Level verteilt). */
const w1to6n = (n) => {
  const l = w1to6(false);
  let k = n;
  for (const id of PRE) for (let i = 0; i < 3 && k > 0; i++) { l[id].stars[i] = true; k--; }
  return l;
};
/** Welt-7-Level (ohne Sterne) als geschafft eintragen. */
const with7 = (base, ids) => { const l = { ...base }; for (const id of ids) l[id] = lvl(false); return l; };
/** Welt-7-Schranken, deren Weg mit den geschafften Leveln done frei ist (als geöffnet gemerkt – kein Schwenk). */
const opened7 = (done) => W7.levels.filter((l) => l.after && [].concat(l.after).every((a) => done.includes(a))).map((l) => l.id);
const WORLDS7 = [1, 2, 3, 4, 5, 6, 7];
const EXIT_W6 = exitPoint(W7.entrances.find((e) => e.id === 'W6'));
const P71 = W7.entrances.find((e) => e.id === '7-1').pos;

// Teilläufe (W7_TEIL=1|2|3|4) für langsame Rechner, je unter 10 min; ohne Angabe alle Abschnitte.
//   1: Abschnitte 2–4 (Röhre W7 → Welt 7, Welt-Warp, Start/Titel, erstes Level), 2: 5–7 (Freischaltung, Brücken,
//   Sternschranke, Gegnergruppen), 3: 8–10 (Kulisse im Takt, Welt 8 bald, Beeren-/Glückshaus), 4: 11–14 (Bilder,
//   Neuladen, Rückweg nach Welt 6, Anflug)
const TEIL = process.env.W7_TEIL ?? '';
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

// ------------------------------------------------------------------ 2) Glasröhre W7 in Welt 6 → Ankunft in Welt 7
if (part(2)) {
  await loadWith({ levels: w1to6(true), mapOpened: [...OPENED_1_6], world: 6, worlds: [1, 2, 3, 4, 5, 6], coins: 0, mapPos: null });
  await waitMap(6);
  st = await sc(() => window.__courseMap.state());
  check('Welt 6 nach 6-C: Glasröhre W7 frei, Ziel „Lava-Festung“ (Karte vorhanden, keine Codeänderung in Welt 6)',
    st.entrances.W7.enterable && st.entrances.W7.title === 'Lava-Festung' && st.gates.W7 === 'open');
  await tp(80, 20.3, -154);
  r = await walkTo(80, -157, (s) => s.onPad === 'W7', 600);
  await shot('w6_roehre7', 600);
  await frames();
  check('Figur steht auf dem Podest der Welt-7-Röhre, Hinweis „ab durch die Glasröhre“', r.s.onPad === 'W7' && (await banner()).includes('Glasröhre'));
  await sc(() => window.__courseMap.setInput({ jump: true }));
  st = await sc(() => window.__courseMap.step(1));
  await sc(() => window.__courseMap.setInput({}));
  check('A auf dem Podest startet die Röhrenfahrt (Abfahrt nach Welt 7)', st.travel?.mode === 'depart' && !st.leaving && st.worlds.includes(7));
  r = await stepUntil((s) => s.travel?.phase === 'ride' && s.travel.t > 1.6, 600);
  await shot('w6_abfahrt', 400);
  r = await stepUntil(() => false, 600);
  check('Nach der Fahrt verlässt die Karte Welt 6 (Szenenwechsel zu Welt 7)', r.s.leaving === true);
  await waitMap(7);
  st = await sc(() => window.__courseMap.state());
  console.log('  Ankunft', JSON.stringify(st.travel), JSON.stringify(st.player));
  check('Welt 7 geladen, Ankunft durch die Rückweg-Röhre W6 (Figur weit draußen über dem Meer)', st.world === 7 && st.travel?.mode === 'arrive' && st.travel.entrance === 'W6'
    && Math.hypot(st.player.x - EXIT_W6[0], st.player.z - EXIT_W6[2]) > 30);
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
  check('Nach der Ankunft steht die Figur vor der Rückweg-Röhre in der Ankunftsbucht', Math.hypot(st.player.x - EXIT_W6[0], st.player.z - EXIT_W6[2]) < 0.8 && st.player.mode === 'ground'
    && Math.abs(st.player.y - 1.5) < 0.05);
  check('Welt 7 gemerkt (offen, aktuelle Welt)', st.worlds.includes(7) && (await sc(() => JSON.parse(localStorage.getItem('lotti-greta-course-v1')).world)) === 7);
  await frames(3);
  check(`HUD: Weltname „Welt 7 · Lava-Festung“, Sterne gesamt ${PRE.length * 3}, Welt 7 hat 32 Sterne`, (await sc(() => window.__courseMap.hud.worldName.text)) === 'Welt 7 · Lava-Festung'
    && st.totalStars === PRE.length * 3 && st.stars === 0 && st.starsMax === 32);
  r = await sc(() => ({ name: window.__courseMap.musicName(), has: !!window.__audio.music.themeInfo('course_world7_map') }));
  check(`Musik der Welt-7-Karte: course_world7_map (vorhanden: ${r.has}), sonst Rückfall course_map (jetzt: ${r.name})`, r.has && r.name === 'course_world7_map');
  await shot('start', 900);
}

// ------------------------------------------------------------------ 3) Welt-Warp aus einem Welt-6-Level landet in Welt 7
if (part(3)) {
  lv = w1to6(true);
  delete lv['6-C'];
  await loadWith({ levels: lv, mapOpened: [...OPENED_1_6.filter((id) => id !== 'W7')], world: 6, worlds: [1, 2, 3, 4, 5, 6], mapPos: null }, '&mapAlias=6-1:0-0');
  await waitMap(6);
  await tp(12, 10.3, 39, Math.PI / 2, 20);
  r = await walkTo(12, 36, (s) => s.onPad === '6-1', 900);
  st = await sc(() => { const m = window.__courseMap; m.enter(); m.step(1); return m.state(); });   // im selben Takt (die Szene wechselt danach)
  check('6-1 (Ersatz-Level) gestartet', st.leaving && st.lastStart?.entrance === '6-1');
  await waitCourse();
  // wie map/warp.js (Röhre mit warpWorld: 7): Welt 7 freischalten, Level ohne Zielmast verlassen
  await sc(() => { window.__courseSave.openWorld(7); window.__course.exitToMap({ warpWorld: 7 }); });
  await waitMap(7);
  st = await sc(() => window.__courseMap.state());
  console.log('  Warp-Ankunft', JSON.stringify(st.travel), st.soonWorld);
  check('Welt-Warp nach Welt 7 endet in Welt 7: Ankunft durch die Rückweg-Röhre W6, keine „bald“-Meldung', st.world === 7 && st.travel?.mode === 'arrive' && st.travel.entrance === 'W6'
    && st.soonWorld === null && st.worlds.includes(7));
  r = await stepUntil((s) => s.travel?.t > 1.4, 400);
  await shot('warp_ankunft', 400);
  r = await stepUntil((s) => !s.travel, 900);
  await sc(() => window.__courseMap.step(40));
  st = await sc(() => window.__courseMap.state());
  check('Nach dem Warp: Figur vor der Rückweg-Röhre, 7-1 frei, Röhre zurück nach Welt 6 frei', Math.hypot(st.player.x - EXIT_W6[0], st.player.z - EXIT_W6[2]) < 0.8
    && !st.entrances['7-1'].locked && st.entrances.W6.enterable && !st.cinematic && (await toast()) !== 'Welt 7 kommt bald!');
}

// ------------------------------------------------------------------ 4) Eingänge: Titel bzw. „Bald“, Start-Zustand, erstes Level
if (part(4)) {
  await loadWith({ levels: w1to6(true), mapOpened: [...OPENED_1_6], world: 7, worlds: WORLDS7, mapPos: null });
  await waitMap(7);
  const titles = await sc((ids) => { const out = {}; for (const id of ids) { const s = window.__courseMap.status(id); out[id] = [s.title, s.exists]; } return out; }, W7IDS);
  console.log('  Titel', JSON.stringify(titles));
  check('Eingänge in Welt 7 zeigen den Leveltitel bzw. „Bald“', Object.values(titles).every(([t, ex]) => (ex ? t && t !== 'Bald' : t === 'Bald')));
  st = await sc(() => window.__courseMap.state());
  check('Start in Welt 7: nur 7-1 frei, alle anderen zu, Rückweg-Röhre frei, Welt-8-Röhre zu, alle 12 Schranken zu, 6 Gegner unterwegs',
    !st.entrances['7-1'].locked && W7IDS.filter((id) => id !== '7-1').every((id) => st.entrances[id].locked)
    && st.entrances.W6.enterable && st.entrances.W8.locked && st.entrances.W8.discovered === false && Object.values(st.gates).length === 12
    && Object.values(st.gates).every((g) => g === 'closed') && st.roamers.length === 6);
  r = await sc(() => {
    const m = window.__courseMap;
    const k = m.roamersOf('7-A'), p = m.roamersOf('7-B'), w = m.roamersOf('7-C');
    return { king: k.map((e) => [e.spec.modelOpts?.variant, e.standInUsed, +e.pos.y.toFixed(2)]), prince: p.map((e) => [e.spec.modelOpts?.color, e.standInUsed]), werfer: w.length,
      wy: w.map((e) => +e.pos.y.toFixed(2)), anchor: m.labelAnchor('7-A', m.player.pos.clone()).toArray().map((v) => +v.toFixed(1)) };
  });
  console.log('  Gruppen', JSON.stringify(r));
  check('Arenen: heller Lavafelsen-König auf der Felsfläche (Registry-Modell), blauer Schubser-Prinz im Käfig, vier Feuer-Werfer in der Halle',
    r.king.length === 1 && r.king[0][0] === 'hell' && !r.king[0][1] && Math.abs(r.king[0][2] - 1.2) < 0.3 && r.prince.length === 1 && r.prince[0][0] === 'blau' && !r.prince[0][1]
    && r.werfer === 4 && r.wy.every((y) => Math.abs(y - 5) < 0.3) && Math.hypot(r.anchor[0] + 48, r.anchor[2] - 24) < 5.5);   // Beschriftung folgt dem König auf seinem Kreis (Radius 4,4)
  await tp(2, 1.8, 40, -Math.PI / 2, 30);
  await shot('ankunftsbucht', 800);
  await tp(-40, 1.5, 31, Math.PI, 30);
  await shot('felsarena', 800);
  await loadWith({}, '&mapAlias=7-1:0-0');
  await waitMap(7);
  st = await sc(() => window.__courseMap.state());
  check('mapAlias: 7-1 zeigt den Titel des Ersatz-Levels und ist startbar', st.entrances['7-1'].title !== 'Bald' && st.entrances['7-1'].enterable);
  await tp(P71[0], 1.8, P71[2] + 3, Math.PI / 2, 20);
  r = await walkTo(P71[0], P71[2], (s) => s.onPad === '7-1', 900);
  st = await sc(() => { const m = window.__courseMap; m.enter(); m.step(1); return m.state(); });   // im selben Takt (die Szene wechselt danach)
  check('Enter auf dem Podest 7-1 startet das (Ersatz-)Level', st.leaving && st.lastStart?.entrance === '7-1' && st.lastStart?.id === '0-0');
  await waitCourse();
  await sc(() => window.__course.exitToMap({ done: '0-0' }));
  await waitMap(7);
  st = await sc(() => window.__courseMap.state());
  check('Rückkehr aus dem Level: Welt 7, vor der Werfer-Festung, Ergebnis auf 7-1 übertragen, Schranken zum Tempel und zur Felsfläche versinken',
    st.world === 7 && Math.hypot(st.player.x - P71[0], st.player.z - P71[2] - 2.6) < 0.8 && st.entrances['7-1'].done && st.cinematic);
  r = await stepUntil((s) => !s.cinematic, 2400);
  check('Wege zum Tempel (7-2) und zur Felsfläche (7-A) offen, beide frei', r.s.gates['7-2'] === 'open' && r.s.gates['7-A'] === 'open' && !r.s.entrances['7-2'].locked
    && !r.s.entrances['7-A'].locked);
  // die Basaltbrücke über den Lavafluss ist begehbar
  await tp(0, 1.8, 33, Math.PI / 2, 20);
  r = await walkTo(0, 8, (s) => s.player.z < 10, 900);
  check('Über die Basaltbrücke hinüber zum Tempelplatz (y 3)', r.s.player.z < 10 && Math.abs(r.s.player.y - 3) < 0.1 && r.s.player.mode === 'ground');
  await tp(0, 1.8, 33, Math.PI / 2, 20);
  await shot('basaltbruecke', 600);
}

// ------------------------------------------------------------------ 5) Freischaltung nacheinander, begehbare Brücken
if (part(5)) {
  // 7-2 geschafft: zwei Schranken (7-3, 7-4) versinken nacheinander im Schwenk
  await loadWith({ levels: with7(w1to6(true), ['7-1', '7-2']), mapOpened: [...OPENED_1_6, '7-2', '7-A'], world: 7, worlds: WORLDS7, mapPos: null });
  await waitMap(7);
  st = await sc(() => window.__courseMap.state());
  check('Nach 7-2: Schwenk zu den frischen Schranken (Rennbahn, blaue Lava)', st.cinematic && st.gates['7-3'] === 'closed' && st.gates['7-4'] === 'closed');
  r = await stepUntil((s) => !s.cinematic, 4000);
  st = r.s;
  check('Schwenk endet: Wege zu 7-3 und 7-4 offen, beide frei; 7-B und 7-5 noch zu',
    ['7-3', '7-4'].every((id) => st.gates[id] === 'open' && !st.entrances[id].locked) && st.entrances['7-B'].locked && st.entrances['7-5'].locked
    && st.gates['7-B'] === 'closed' && st.gates['7-5'] === 'closed');
  await tp(0, 3.3, 6);
  await shot('tempel', 700);
  const free = (s2, id) => !s2.entrances[id].locked && s2.entrances[id].pathOpen;
  const shut = (s2, id) => s2.entrances[id].locked && !s2.entrances[id].pathOpen;
  const steps = [
    [['7-4'], ['7-B', '7-5'], ['7-Kapitän', '7-6']],
    [['7-4', '7-5'], ['7-Kapitän', '7-6'], ['7-C', '7-7']],
    [['7-4', '7-5', '7-6'], ['7-C', '7-7'], ['7-Burg']],
    [['7-4', '7-5', '7-6', '7-7'], ['7-Burg'], ['W8']],
  ];
  for (const [done, nowFree, stillShut] of steps) {
    st = await setLevels(with7(w1to6(true), ['7-1', '7-2', ...done]));
    check(`Nach ${done[done.length - 1]}: ${nowFree.join(', ')} frei, ${stillShut.join(', ')} noch zu`, nowFree.every((id) => free(st, id)) && stillShut.every((id) => shut(st, id)));
  }
  st = await setLevels(with7(w1to6(true), ['7-1', '7-2', '7-4', '7-5', '7-6', '7-7', '7-Burg']));
  check('Nach 7-Burg: Weg zur Welt-8-Röhre offen, Röhre „Bald“ (Welt 8 gibt es noch nicht)', st.entrances.W8.pathOpen && !st.entrances.W8.locked
    && st.entrances.W8.soon && !st.entrances.W8.enterable && st.entrances.W8.title === 'Bald');
  // mit allen geschafften Leveln geladen sind alle Schranken offen; die Brücken sind begehbar
  const done = W7IDS.filter((id) => !['7-A', '7-B', '7-C', '7-3', '7-Kapitän'].includes(id));
  await loadWith({ levels: with7(w1to6(true), done), mapOpened: [...OPENED_1_6, ...opened7(done)] });
  await waitMap(7);
  st = await sc(() => window.__courseMap.state());
  check('Alle Welt-7-Wege geschafft: alle 12 Schranken offen, alle Eingänge frei', Object.values(st.gates).length === 12 && Object.values(st.gates).every((g) => g === 'open')
    && W7IDS.every((id) => !st.entrances[id].locked));
  const walk = async (from, to, test, label) => {
    await tp(from[0], from[1] + 0.3, from[2], Math.PI / 2, 20);
    const rr = await walkTo(to[0], to[1], test, 1400);
    check(label, test(rr.s));
    return rr;
  };
  await walk([-40, 3.5, -10], [-40, -33], (s) => s.player.z < -31.5 && Math.abs(s.player.y - 5) < 0.1, 'Kettensteg: vom blauen Lavaufer über die blaue Lava zum Turm-Ufer (y 5)');
  await walk([-6, 3, -47], [-6, -85], (s) => s.player.z < -83.5 && Math.abs(s.player.y - 7) < 0.1, 'Basaltdamm: vom Riff-Ufer über die Lagune zum Kraterrand (y 7)');
  await walk([8, 7, -96], [25, -96], (s) => s.player.x > 23.5 && Math.abs(s.player.y - 8.5) < 0.1, 'Zugbrücke: vom Kraterrand in den Burghof (y 8.5)');
  await walk([49, 8.5, -112], [65, -112], (s) => s.player.x > 63.5 && Math.abs(s.player.y - 8.5) < 0.1, 'Glasröhre: vom Burghof hinüber zur Röhren-Insel (y 8.5)');
  await tp(-6, 3.3, -46, Math.PI / 2, 20);
  await shot('damm', 600);
}

// ------------------------------------------------------------------ 6) Sternschranke 150
if (part(6)) {
  const done7 = ['7-1', '7-2', '7-4', '7-5', '7-6', '7-7'];
  await loadWith({ levels: with7(w1to6n(149), done7), mapOpened: [...OPENED_1_6, ...opened7(done7)], world: 7, worlds: WORLDS7, mapPos: null });
  await waitMap(7);
  st = await sc(() => window.__courseMap.state());
  check('7-7 geschafft, 149 Sterne: Weg zur Lava-Burg offen, 7-Burg gesperrt (Sterne)', st.gates['7-Burg'] === 'open' && st.entrances['7-Burg'].locked
    && st.entrances['7-Burg'].reason === 'stars' && st.gateStars === 149);
  const PB = W7.entrances.find((e) => e.id === '7-Burg').pos;
  await tp(PB[0], PB[1] + 0.3, PB[2]);
  await shot('burg', 900);
  const b150 = await banner();
  const noStart = !(await sc(() => { const m = window.__courseMap; m.enter(); return m.step(2).leaving; }));
  st = await setLevels(with7(w1to6n(150), done7));
  console.log('  Hinweis:', b150);
  check('Hinweis „Benötigt 150 Sterne (149/150)“ an der Lava-Burg, Enter startet nichts; mit 150 Sternen frei (zeigt „Bald“, bis es das Level gibt)',
    b150 === 'Benötigt 150 Sterne (149/150)' && noStart && !st.entrances['7-Burg'].locked && st.gateStars === 150 && st.entrances['7-Burg'].enterable === st.entrances['7-Burg'].exists);
}

// ------------------------------------------------------------------ 7) Gegnergruppen starten 7-A, 7-B, 7-C
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
  const alias = '&mapAlias=7-A:0-0,7-B:0-0,7-C:0-0';
  await loadWith({ levels: with7(w1to6(true), ['7-1']), mapOpened: [...OPENED_1_6, ...opened7(['7-1'])], world: 7, worlds: WORLDS7, mapPos: null }, alias);
  await waitMap(7);
  r = await roam([-39.6, 1.5, 32], '7-A');
  check('Nach 7-1: Berührung des hellen Lavafelsen-Königs startet 7-A (Ersatz-Level 0-0)', r.s.leaving && r.s.lastStart?.entrance === '7-A' && r.s.lastStart?.id === '0-0');
  await waitCourse();
  await sc(() => window.__course.exitToMap({}));
  await waitMap(7);
  st = await sc(() => window.__courseMap.state());
  check('Rückkehr aus dem Level: wieder Welt 7, am Brückenkopf der Felsfläche, König noch da', st.world === 7 && Math.hypot(st.player.x + 39.6, st.player.z - 32) < 0.8 && st.roamers.length === 6);
  const done4 = ['7-1', '7-2', '7-4'];
  await loadWith({ levels: with7(w1to6(true), done4), mapOpened: [...OPENED_1_6, ...opened7(done4)], mapPos: null }, alias);
  await waitMap(7);
  await tp(-72, 3.8, 0);
  await shot('kaefig', 900);
  r = await roam([-67.4, 3.8, -4], '7-B');
  check('7-B frei: Berührung des blauen Schubser-Prinzen startet 7-B (Ersatz-Level 0-0)', r.s.leaving && r.s.lastStart?.entrance === '7-B' && r.s.lastStart?.id === '0-0');
  await waitCourse();
  await sc(() => window.__course.exitToMap({}));
  await waitMap(7);
  st = await sc(() => window.__courseMap.state());
  check('Rückkehr: am Käfigtor (Ausgang am Kettensteg)', st.world === 7 && Math.hypot(st.player.x + 67.4, st.player.z + 4) < 0.8);
  const done6 = ['7-1', '7-2', '7-4', '7-5', '7-6'];
  await loadWith({ levels: with7(w1to6(true), done6), mapOpened: [...OPENED_1_6, ...opened7(done6)], mapPos: null }, alias);
  await waitMap(7);
  await tp(27, 5.3, -38);
  await shot('halle', 900);
  r = await roam([19.4, 5.3, -36], '7-C');
  check('7-C frei: Berührung der Feuer-Werfer startet 7-C (Ersatz-Level 0-0)', r.s.leaving && r.s.lastStart?.entrance === '7-C' && r.s.lastStart?.id === '0-0');
}

// ------------------------------------------------------------------ 8) Lava-Fontänen im Takt der Kartenmusik, lebendige Kulisse
if (part(8)) {
  if (!(await sc(() => window.__courseMap?.map.world === 7))) {
    const done = W7IDS.filter((id) => !['7-A', '7-B', '7-C'].includes(id));
    await loadWith({ levels: with7(w1to6(true), done), mapOpened: [...OPENED_1_6, ...opened7([...done, '7-A', '7-B', '7-C'])], world: 7, worlds: WORLDS7, mapPos: null });
    await waitMap(7);
  }
  await tp(2, 1.8, 33);
  r = await sc(() => {
    const mu = window.__audio.music, m = window.__courseMap;
    const theme = m.musicName();
    mu.setManualClock(true);
    const bpm = mu.beat().bpm, spb = 60 / bpm;
    const F = () => m.state().decor.fountains;
    const b0 = F();
    mu.advanceClock((1 - (b0.beat % 1)) * spb + 0.13 * spb);  // nächste Zählzeit, Fontänen schießen hoch
    const b1 = F();
    mu.advanceClock(0.55 * spb);                              // dieselbe Zählzeit, Fontänen fallen
    const b2 = F();
    mu.advanceClock(0.45 * spb);                              // nächste Zählzeit (13 %): andere Gruppe
    const b3 = F();
    return { theme, bpm, b0, b1, b2, b3 };
  });
  console.log('  Fontänen:', JSON.stringify({ b0: [r.b0.step, r.b0.k], b1: [r.b1.step, r.b1.k, r.b1.erupting], b2: [r.b2.step, r.b2.k], b3: [r.b3.step, r.b3.k], src: r.b1.source, theme: r.b1.theme, bpm: r.bpm, n: r.b0.n }));
  check(`Lava-Fontänen folgen der Taktuhr der Kartenmusik (${r.theme}, ${r.bpm} BPM)`, r.b1.theme === r.theme && r.b1.source !== 'zeit' && r.b1.bpm === r.bpm && r.b0.n >= 10);
  check('Je Zählzeit sprüht eine Gruppe: Wechsel am Taktschlag, hoch am Anfang der Zählzeit, fällt danach zurück, nächste Zählzeit die andere Gruppe',
    r.b1.step === (Math.floor(r.b0.beat) + 1) % 2 && r.b1.k > 0.9 && r.b1.erupting && r.b2.step === r.b1.step && r.b2.k < 0.15 && r.b3.step === (r.b1.step + 1) % 2 && r.b3.k > 0.9);
  await frames(3);
  const shown = await sc(() => window.__courseMap.state().decor.fountains);
  check('Darstellung folgt: gezeigte Fontänen-Gruppe und -Höhe = Stellung der Taktuhr', shown.shown?.step === shown.step && Math.abs(shown.shown.k - shown.k) < 1e-3);
  await shot('fontaenen', 300, false, 2);
  await sc(() => window.__audio.music.setManualClock(false));
  // Ersatzuhr ohne Musik
  r = await sc(() => {
    const mu = window.__audio.music;
    mu.stop();
    const d = window.__courseMap.state().decor.fountains;
    const want = mu.themeInfo('course_world7_map')?.bpm ?? mu.themeInfo('course_map')?.bpm;
    const life = window.__courseMap.built.life;
    const a = life.fountainInfo(10.02), b = life.fountainInfo(10.02 + 60 / want);
    return { d, want, a, b };
  });
  check('Ohne laufende Musik zählt die Ersatzuhr (Kartenzeit) im Tempo der Welt-7-Kartenmusik, je Zählzeit wechselt die Gruppe',
    r.d.source === 'zeit' && r.d.bpm === r.want && r.a.step !== r.b.step && Math.abs(r.a.k - r.b.k) < 1e-3);
  await sc(() => window.__audio.music.play(window.__courseMap.musicName()));
  // Lebendige Kulisse: Lava fließt, Schaltfelder, Rennkugeln, Zylinder, Kraterlava, Lavadrache, Rammfisch, Fahnen …
  r = await sc(() => {
    const m = window.__courseMap;
    const run = (id, t) => { for (const u of m.built.entrances.get(id).updaters) u(0, t); return m.state().decor; };
    const sw1 = run('7-2', 0.2).switches.lit, sw2 = run('7-2', 2.0).switches.lit;
    const l1 = run('7-3', 0.1).race.light, l2 = run('7-3', 1.0).race.light;
    const c1 = run('7-4', 1).cylinders.angle, c2 = run('7-4', 4).cylinders.angle;
    const k1 = run('7-7', 0).crater, k2 = run('7-7', 2.2).crater;
    const f1 = run('7-6', 1).reef.fin, f2 = run('7-6', 6).reef.fin;
    const life = m.built.life;
    const tex = life.lavaTex.rot;
    life.update(0.016, 1); const o1 = tex.offset.y;
    life.update(0.016, 6); const o2 = tex.offset.y;
    const fa = m.view.three.getObjectByName('w7:fahnen').geometry.attributes.position.array[5];
    life.update(0.016, 6.4);
    const fb = m.view.three.getObjectByName('w7:fahnen').geometry.attributes.position.array[5];
    const d = m.state().decor;
    const names = ['w7:lava:rot', 'w7:lava:blau', 'w7:lavafaelle:rot', 'w7:lavafaelle:blau', 'w7:fontaenen', 'w7:lavablasen', 'w7:rauch', 'w7:knochenflieger', 'w7:fahnen',
      'w7:fackelflammen', 'w7:platschfische', 'w7:kraterlava', 'w7:lavadrache', 'w7:schaltfelder', 'w7:rennkugeln', 'w7:giftnebel', 'w7:wutkaulquappen', 'w7:rammfisch', 'w7:vulkan'];
    const found = names.filter((n) => m.view.three.getObjectByName(n));
    return { sw1, sw2, l1, l2, c1, c2, k1, k2, f1, f2, o1, o2, fa, fb, d, found, missing: names.filter((n) => !found.includes(n)), models: d.w7models, heavy: d.w7heavy };
  });
  console.log('  Kulisse', JSON.stringify({ ...r, d: undefined, models: undefined }));
  check('Lebendige Kulisse: Lava fließt (Textur wandert), Fahnen wehen, Schaltfelder leuchten nacheinander, Ampel der Rennbahn schaltet, Zylinder drehen, Kraterlava steigt/sinkt, Lavadrache taucht auf, Rammfisch kreist',
    Math.abs(r.o1 - r.o2) > 0.01 && Math.abs(r.fa - r.fb) > 1e-3 && r.sw2 > r.sw1 && r.l1 !== r.l2 && Math.abs(r.c1 - r.c2) > 0.5 && Math.abs(r.k1.level - r.k2.level) > 0.1
    && r.k2.dragon > 0.5 && Math.abs(r.f1 - r.f2) > 1);
  check(`Kulissen-Objekte vorhanden (${r.found.length}/${r.found.length + r.missing.length}${r.missing.length ? `, fehlt: ${r.missing.join(', ')}` : ''}); Fontänen ${r.d.fountains.n}, Lavafälle ${r.d.lavafalls.n}, Knochenflieger ${r.d.boneflyers.n}, Fahnen ${r.d.flags.n}, Fackeln ${r.d.torches.n}, Platschfische ${r.d.fish.n}`,
    r.missing.length === 0 && r.d.lavafalls.n >= 3 && r.d.boneflyers.n >= 6 && r.d.flags.n >= 8 && r.d.torches.n >= 10 && r.d.bubbles.n >= 20 && r.d.smoke.n >= 5 && r.d.fish.n >= 5);
  console.log('  Registry-Modelle in der Kulisse:', (r.models ?? []).join(', '), '| zu schwer:', JSON.stringify(r.heavy ?? {}));
  check('Welt-7-Modelle der Registry in der Kulisse (Festungsturm, Basaltsäule, Vulkanfels, Riffkoralle, Lavagestein, Lava-Maschine, Zylinder, Gitterboden)',
    ['festungsturm', 'basaltsaeule', 'vulkanfels', 'riffkoralle', 'lavagestein', 'lava_maschine', 'zylinder_walze', 'gitterboden'].every((n) => (r.models ?? []).includes(n)));
}

// ------------------------------------------------------------------ 9) Glasröhre W8 „bald“, Welt-Warp nach Welt 8 über den Rückfall
if (part(9)) {
  const all = W7IDS.filter((id) => !['7-A', '7-B', '7-C', '7-3', '7-Kapitän'].includes(id));
  await loadWith({ levels: with7(w1to6(true), all), mapOpened: [...OPENED_1_6, ...opened7(all)], world: 7, worlds: WORLDS7, mapPos: null });
  await waitMap(7);
  const P8 = W7.entrances.find((e) => e.id === 'W8').pos;
  await tp(P8[0], P8[1] + 0.3, P8[2] + 3, -Math.PI / 2, 20);
  r = await walkTo(P8[0], P8[2], (s) => s.onPad === 'W8', 400);
  await shot('roehre8', 700);
  await sc(() => { const m = window.__courseMap; m.hud.toast('', 0.01); m.step(2); m.enter(); m.step(1); });
  const msg = await toast();
  st = await sc(() => { const m = window.__courseMap; m.setInput({ jump: true }); m.step(1); m.setInput({}); return m.step(5); });
  check('Welt-8-Röhre nach 7-Burg: Weg frei, „Bald“, Enter/A zeigt „Welt 8 kommt bald!“ statt einer Fahrt', r.s.onPad === 'W8' && msg === 'Welt 8 kommt bald!' && !st.travel && !st.leaving
    && st.entrances.W8.soon && !st.entrances.W8.enterable && st.entrances.W8.discovered === false);
  // Warp nach Welt 8 aus einem Welt-7-Level (7-7 noch offen, Burg-Schranke zu): Rückfall – Ankunft in Welt 7 durch die
  // Welt-8-Röhre hinter den gesperrten Schranken
  const done6 = ['7-1', '7-2', '7-4', '7-5', '7-6'];
  await loadWith({ levels: with7(w1to6(true), done6), mapOpened: [...OPENED_1_6, ...opened7(done6)], world: 7, worlds: WORLDS7, mapPos: null }, '&mapAlias=7-1:0-0');
  await waitMap(7);
  await tp(P71[0], 1.8, P71[2] + 3, Math.PI / 2, 20);
  r = await walkTo(P71[0], P71[2], (s) => s.onPad === '7-1', 900);
  await sc(() => { const m = window.__courseMap; m.enter(); m.step(1); });
  await waitCourse();
  await sc(() => { window.__courseSave.openWorld(8); window.__course.exitToMap({ warpWorld: 8 }); });
  await waitMap(7);
  st = await sc(() => window.__courseMap.state());
  console.log('  Warp 8:', JSON.stringify(st.travel), st.soonWorld, JSON.stringify(st.entrances.W8));
  check('Welt-Warp 8 ohne Welt-8-Karte endet in Welt 7: Ankunft durch die Welt-8-Röhre, Röhre entdeckt, Weg frei, „Bald“',
    st.world === 7 && st.travel?.mode === 'arrive' && st.travel.entrance === 'W8' && st.soonWorld === 8 && st.worlds.includes(8)
    && st.entrances.W8.discovered === true && !st.entrances.W8.locked && st.entrances.W8.soon);
  r = await stepUntil((s) => s.travel?.t > 1.4, 400);
  await shot('warp8_ankunft', 400);
  r = await stepUntil((s) => !s.travel, 900);
  const msg8 = await toast();
  st = await sc(() => window.__courseMap.state());
  check('Nach der Ankunft: „Welt 8 kommt bald!“, Schranke zur Röhren-Insel versinkt (Schwenk)', msg8 === 'Welt 8 kommt bald!' && st.cinematic);
  r = await stepUntil((s) => !s.cinematic, 1800);
  await sc(() => window.__courseMap.step(20));
  st = await sc(() => window.__courseMap.state());
  const exit8 = exitPoint(W7.entrances.find((e) => e.id === 'W8'));
  check('Figur steht vor der Welt-8-Röhre, Schranke offen', Math.hypot(st.player.x - exit8[0], st.player.z - exit8[2]) < 0.8 && st.gates.W8 === 'open' && !st.cinematic);
  await tp(27, 8.8, -96, Math.PI / 2, 20);
  r = await walkTo(4, -96, (s) => s.player.x < 11, 900);
  check('Aus dem Burghof zurück: Schranke 7-Burg an der Zugbrücke lässt die Figur von hinten durch', r.s.player.x < 11 && r.s.gates['7-Burg'] === 'closed'
    && Math.abs(r.s.player.y - 7) < 0.1);
}

// ------------------------------------------------------------------ 10) Beerenhaus, Glückshaus
if (part(10)) {
  const done6 = ['7-1', '7-2', '7-4', '7-5'];
  await loadWith({ levels: with7(w1to6(true), done6), mapOpened: [...OPENED_1_6, ...opened7(done6)], world: 7, worlds: WORLDS7, mapPos: null, coins: 0 });
  await waitMap(7);
  st = await sc(() => window.__courseMap.state());
  check('Beerenhaus in Welt 7 bietet ein Power-up an', st.berry === true);
  const H = W7.houses[0];
  await tp(H.item[0], 1.8, H.item[2] + 3, Math.PI / 2, 20);
  r = await walkTo(H.item[0], H.item[2], (s) => !s.berry, 400);
  check('Beerenhaus: Power-up eingepackt', !r.s.berry && !!r.s.carryPower && r.s.player.power === r.s.carryPower);
  await shot('beerenhaus', 800);
  const G = W7.houses[1];
  await sc((p) => { const s = window.__courseSave; s.data.coins = 25; s.save(); const m = window.__courseMap; m.teleport(p[0], 3.3, p[2] + 3, Math.PI / 2); m.step(10); }, G.pad);
  r = await walkTo(G.pad[0], G.pad[2], (s) => s.onSlotPad, 400);
  check('Figur steht auf der Matte vor dem Spielautomaten (Riff-Ufer)', r.s.onSlotPad === true);
  await sc(() => { window.__courseMap.slot.force(['coin', 'coin', 'coin']); const m = window.__courseMap; m.setInput({ jump: true }); m.step(1); m.setInput({}); m.step(60); });
  st = await sc(() => window.__courseMap.state());
  check('Glückshaus: A zieht den Hebel, Einsatz 10 bezahlt', st.slot.state === 'spin' && st.coins === 15);
  await shot('glueck', 600);
  st = await sc(() => window.__courseMap.step(420));
  check('3 × Bitcoin: 30 Bitcoins Gewinn (15 → 45)', st.slot.state === 'idle' && st.coins === 45);
}

// ------------------------------------------------------------------ 11) Bilder der Insel (alle Wege offen, alle Level geschafft)
if (part(11)) {
  const all = W7IDS.filter((id) => !['7-A', '7-B', '7-C'].includes(id));
  await loadWith({ levels: with7(w1to6(true), all), mapOpened: [...OPENED_1_6, ...opened7([...all, '7-A', '7-B', '7-C'])], world: 7, worlds: WORLDS7, mapPos: null });
  await waitMap(7);
  for (const [name, pos, yaw] of [['festung', [16, 1.5, 47.5]], ['felsflaeche', [-46, 1.2, 29]], ['rennbahn', [44, 4, 1.5]], ['blaulava', [-42, 3.5, -0.5]],
    ['turm', [-41, 5, -37]], ['diorama', [-68, 5, -32.5]], ['riff', [-8, 3, -42]], ['krater', [-7, 7, -93]], ['burg_frei', [37, 8.5, -104.5]],
    ['roehreninsel', [70, 8.5, -106.5]], ['lavafluss', [10, 1.5, 33]], ['werferhalle', [28, 5, -39]]]) {
    await tp(pos[0], pos[1] + 0.3, pos[2], yaw ?? -Math.PI / 2, 30);
    await shot(name, 300);
  }
}

// ------------------------------------------------------------------ 12) Aktuelle Welt bleibt nach Neuladen
if (part(12)) {
  if (!(await sc(() => window.__courseMap?.map.world === 7))) { await loadWith({ levels: w1to6(true), mapOpened: [...OPENED_1_6], world: 7, worlds: WORLDS7, mapPos: null }); await waitMap(7); }
  await sc(() => { const m = window.__courseMap; m.teleport(4, 1.8, 40, Math.PI / 2); m.step(30); m.rememberPos(); });
  await page.reload({ waitUntil: 'load' });
  await waitMap();
  st = await sc(() => window.__courseMap.state());
  check('Nach Neuladen: wieder Welt 7 an der gemerkten Stelle', st.world === 7 && Math.hypot(st.player.x - 4, st.player.z - 40) < 0.8);
}

// ------------------------------------------------------------------ 13) Rückweg nach Welt 6
if (part(13)) {
  if (!(await sc(() => window.__courseMap?.map.world === 7))) { await loadWith({ levels: w1to6(true), mapOpened: [...OPENED_1_6], world: 7, worlds: WORLDS7, mapPos: null }); await waitMap(7); }
  const W6E = W7.entrances.find((e) => e.id === 'W6').pos;
  await tp(W6E[0], 1.8, W6E[2] + 3, Math.PI / 2, 20);
  r = await walkTo(W6E[0], W6E[2], (s) => s.onPad === 'W6', 400);
  await sc(() => { const m = window.__courseMap; m.setInput({ jump: true }); m.step(1); m.setInput({}); });
  st = await sc(() => window.__courseMap.state());
  check('Rückweg-Röhre in Welt 7 startet die Fahrt nach Welt 6', r.s.onPad === 'W6' && st.travel?.mode === 'depart');
  await shot('abfahrt_w6', 300);
  r = await stepUntil(() => false, 900);
  await waitMap(6);
  st = await sc(() => window.__courseMap.state());
  check('Welt 6: Ankunft durch die Welt-7-Röhre (von der Lava-Festung her)', st.world === 6 && st.travel?.mode === 'arrive' && st.travel.entrance === 'W7');
  await shot('w6_ankunft', 300);
  r = await stepUntil((s) => !s.travel, 900);
  await sc(() => window.__courseMap.step(40));
  st = await sc(() => window.__courseMap.state());
  check('Zurück in Welt 6 vor der Glasröhre nach Welt 7 (Röhren-Insel), Röhre frei mit Ziel „Lava-Festung“',
    st.world === 6 && Math.hypot(st.player.x - 80, st.player.z + 154.4) < 0.8 && st.entrances.W7.enterable && st.entrances.W7.title === 'Lava-Festung');
  await shot('w6_roehre7_zurueck', 600);
}

// ------------------------------------------------------------------ 14) Anflug (Welt 7 betreten) und Kennzahlen
if (part(14)) {
  await loadWith({ levels: w1to6(true), mapOpened: [...OPENED_1_6], world: 7, worlds: WORLDS7, mapPos: null });
  try { await page.waitForFunction(() => window.__courseMap && window.__courseMap.intro && window.__courseMap.map.world === 7, null, { timeout: 150000 }); } catch { /* ohne Anflug */ }
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}cmap7_anflug.png`, timeout: 200000 });
  { const s = await sc(() => window.__courseMap?.intro ? window.__courseMap.stats() : null); if (s) stats.push(['anflug', s.calls, s.triangles, 7]); }
  check('Anflug beim Betreten von Welt 7 läuft', stats.some(([n]) => n === 'anflug'));
  await waitMap(7);
}

console.log(`  — Ende (${Math.round((Date.now() - T0) / 1000)} s)`);
const sst = await sc(() => window.__courseMap.map.world === 7 ? window.__courseMap.stats() : null);
if (sst) console.log(`\n  Statische Kulisse Welt 7: ${sst.staticMeshes} Kachel-Meshes, ${Math.round(sst.staticTriangles / 1000)} k Dreiecke, ${sst.shapes} Kollisionsformen`);
console.log('  Kennzahlen je Bild (Zeichenaufrufe inkl. Schattenpass, Dreiecke):');
for (const [n, c, t, w] of stats) console.log(`    ${n.padEnd(20)} ${String(c).padStart(4)} Aufrufe  ${String(Math.round(t / 1000)).padStart(4)} k Dreiecke  (Welt ${w})`);
for (const w of [7, 6]) {
  const ws = stats.filter(([, , , ww]) => ww === w);
  if (!ws.length) continue;
  const maxCalls = Math.max(...ws.map((s) => s[1])), maxTris = Math.max(...ws.map((s) => s[2]));
  check(`Kennzahlen Welt ${w}: Zeichenaufrufe < 120 (max ${maxCalls}), Dreiecke < 300 k (max ${Math.round(maxTris / 1000)} k)`, maxCalls < 120 && maxTris < 300000);
}

await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
