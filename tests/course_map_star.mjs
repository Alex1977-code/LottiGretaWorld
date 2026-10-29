// Karte der Bonuswelt Stern „Sternenzelt“ (Welt 9) der Kurs-Karte (Präzisierung Mehrwelten-Karte, Notiz Welt Stern):
//   Weltdaten (Schranken riegeln ab, Ids/Reihenfolge/Sternbedarf laut Vertrag „Bonuswelten – Level-Liste und Freischaltung“,
//   32 Sterne, Röhren W8/WP, Zonen je Level, Inseln steigen nach Norden) – Node; Glasröhre WS in Welt 8 (nach 8-Burg) → Fahrt →
//   Ankunft in Welt 9 an der Rückweg-Röhre (ohne Codeänderung in Welt 8); Welt-Warp nach Welt 9 aus einem Welt-8-Level landet in
//   Welt 9; Rückkehr aus einem S-Level zeigt Welt 9 (Präfix 'S'); Eingänge zeigen Titel bzw. „Bald“ (mapAlias); Freischaltung
//   nacheinander (Schranken-Schwenk, Regenbogenwege und Sternenbrücken begehbar) inkl. Abzweig S-Kapitän; Sternschranke 280 (alle
//   Sterne) mit Hinweis „Benötigt 280 Sterne (x/280)“; Glasröhre WP „Welt Pilz kommt bald!“ (auch Welt-Warp nach Welt 10 über den
//   Rückfall); funkelnde Sterne und Farbplatten im Takt der Kartenmusik (Taktuhr, manuell vorgespult) und Ersatzuhr ohne Musik;
//   lebendige Kulisse (Planeten, Raketen, Sternschnuppen, Walze, Zielmast, Diorama, ?-Turm, Waben, Großrollpilz, Nebel, Station);
//   Rückweg nach Welt 8; Beerenhaus, Glückshaus; Abspann (?credits=1) läuft weiter richtig; gespeicherte Welt bleibt nach Neuladen;
//   Anflug; Kennzahlen (< 120 Zeichenaufrufe, < 300 k Dreiecke an jeder Ansicht inkl. Ankunft und Anflug); keine Konsolenfehler.
// Simulation deterministisch über window.__courseMap.step(n)/setInput; Bilder tests/out/cmapS_*.png zur Sichtprüfung.
// Aufruf: npm run build && node tests/course_map_star.mjs   (Teilläufe: ST_TEIL=1, 2, 3 – s. u.; PORT_BASE verschiebt den Port)
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';
import { MAP as W9 } from '../src/course/map/worlds/w9.js';
import { MAP as W8 } from '../src/course/map/worlds/w8.js';
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
const SIDS = ['S-1', 'S-2', 'S-Kapitän', 'S-3', 'S-4', 'S-5', 'S-6', 'S-7', 'S-8', 'S-9'];
const rule = (id) => W9.levels.find((l) => l.id === id);
const ePos = (id) => W9.entrances.find((e) => e.id === id).pos;

// ------------------------------------------------------------------ 1) Weltdaten und Logik (Node)
{
  const grid = buildWalkGrid(W9);
  const order = W9.levels.map((l) => l.id);
  const after = Object.fromEntries(W9.levels.map((l) => [l.id, [].concat(l.after ?? [])]));
  let ok = true;
  const open = new Set();
  for (let i = 0; i <= order.length; i++) {
    const done = new Set(order.slice(0, i));
    for (const id of order) if (after[id].every((a) => done.has(a))) open.add(id);
    const r = reachable(W9, grid, open).ids.sort();
    const want = order.filter((id) => open.has(id)).sort();
    if (r.join() !== want.join()) { ok = false; console.log('   erreichbar', r.join(), 'erwartet', want.join()); }
  }
  // ohne S-8 bleiben Kanonen-Station und Röhren-Insel unerreichbar
  const o7 = new Set(['W8', 'S-1', 'S-2', 'S-Kapitän', 'S-3', 'S-4', 'S-5', 'S-6', 'S-7', 'S-8']);
  const r7 = reachable(W9, grid, o7).ids;
  if (r7.includes('S-9') || r7.includes('WP')) { ok = false; console.log('   Station/Röhre ohne Weg erreichbar'); }
  check('Welt Stern: jede Schranke riegelt ihren Bereich vollständig ab (Abzweig S-Kapitän, Gabel S-9/WP nach S-8)', ok);
  const gr = gateRects(W9, grid);
  check('Welt Stern: 10 Schranken (je 4 m breit), jede mit Rückseite', gr.length === 10 && gr.every((g) => Math.abs(g.width - 4) < 0.01) && gateSides(W9, grid).every((g) => g.back !== 0));
  check('Welt Stern: Ids und Reihenfolge der Bonuswelt-Tabelle', W9.levels.filter((l) => !l.next).map((l) => l.id).join() === SIDS.join());
  check('Welt Stern: Freischaltung laut Vertrag (S-1 frei, S-2 nach S-1, S-Kapitän und S-3 nach S-2, S-4 … S-8 nacheinander, S-9 nach S-8 und ≥ 280 Sternen)',
    !rule('S-1').after && rule('S-2').after === 'S-1' && rule('S-Kapitän').after === 'S-2' && rule('S-3').after === 'S-2' && rule('S-4').after === 'S-3'
    && rule('S-5').after === 'S-4' && rule('S-6').after === 'S-5' && rule('S-7').after === 'S-6' && rule('S-8').after === 'S-7' && rule('S-9').after === 'S-8'
    && rule('S-9').minStars === 280 && SIDS.filter((id) => rule(id).minStars).join() === 'S-9' && W9.starScope === 'all');
  check('Welt Stern: 3 Sterne je Level, S-Kapitän 5 (zusammen 32), Stempel überall außer S-Kapitän',
    SIDS.every((id) => rule(id).stars === (id === 'S-Kapitän' ? 5 : 3)) && unlock.worldStarsMax(W9) === 32
    && SIDS.filter((id) => rule(id).stamp).join() === SIDS.filter((id) => id !== 'S-Kapitän').join());
  check('Welt Stern: Glasröhre zurück (W8 → Welt 8, offen) und zur Welt Pilz (WP → Welt 10, nach S-8, „Welt Pilz“)',
    rule('W8').next === 8 && rule('W8').world === 8 && !rule('W8').after && rule('WP').next === 10 && rule('WP').world === 10 && rule('WP').after === 'S-8'
    && rule('WP').worldLabel === 'Welt Pilz' && rule('WP').stars === 0);
  check('Welt Stern: Weltdaten (Welt 9, Präfix S, „Welt Stern · Sternenzelt“, Musik course_worldstar_map, Thema map_star)',
    W9.world === 9 && W9.prefix === 'S' && W9.worldLabel === 'Welt Stern' && W9.title === 'Sternenzelt' && W9.music === 'course_worldstar_map'
    && W9.fallbackMusic === 'course_map' && W9.theme === 'map_star' && W9.kit === 'star' && W9.sea === 0);
  check('Welt Stern: jeder Eingang hat ein Podest/eine Kulisse, Kulissen-Arten je Zone',
    W9.levels.every((l) => W9.entrances.some((e) => e.id === l.id))
    && SIDS.map((id) => W9.entrances.find((e) => e.id === id).kind).join() === 'rainbowisle,platefield,spindiorama,rollerisle,goalcloud,blockland,honeycomb,giantjungle,fogyard,cannonstation'
    && W9.entrances.filter((e) => e.kind === 'pipe').map((e) => e.id).join() === 'W8,WP');
  check('Welt Stern: Zonen (Sternenhafen, Regenbogen, Plattenfeld, Diorama, Holz, Wolke, Retro, Waben, Dschungel, Schnee, Hightech)',
    ['starplaza', 'rainbow', 'galaxy', 'diorama', 'wood', 'cloud', 'retro', 'honey', 'jungle', 'snowfog', 'tech'].every((s) => W9.ground.some((b) => b.style === s)));
  const segs = (t) => W9.segments.filter((s) => s.type === t).length;
  check('Welt Stern: Regenbogenwege und Sternenbrücken verbinden die Inseln (je Steg eine begehbare Fläche), Schild „ab 280 ★“',
    segs('rainbowway') >= 5 && segs('starbridge') >= 5 && W9.segments.length === W9.walk.length && W9.signs.some((s) => s.text === 'ab 280 ★'));
  const top = (id) => ePos(id)[1];
  check('Welt Stern: Inseln schweben und steigen nach Norden (Sternenhafen y 10 … Kanonen-Station y 21), Station am höchsten',
    top('W8') === 10 && SIDS.slice(3).every((id, i, a) => i === 0 || top(id) >= top(a[i - 1])) && top('S-9') === Math.max(...W9.ground.map((b) => b.top))
    && ePos('S-9')[2] < ePos('S-1')[2] - 150);
  check('Welt Stern: lebendige Kulisse in den Weltdaten (Planeten ring/pilz/blume/eis, Raketen, Sternschnuppen, funkelnde Sterne)',
    ['ring', 'pilz', 'blume', 'eis'].every((k) => W9.planets.some((p) => p.kind === k)) && W9.rockets.length >= 2 && W9.shooting.n >= 1 && W9.twinkle.perIsland >= 8);
  check('Welt Stern: Eingänge, Ausgänge, Häuser und Start liegen auf begehbarem Gelände', W9.entrances.every((e) => grid.isWalk(e.pos[0], e.pos[2]) && grid.isWalk(exitPoint(e)[0], exitPoint(e)[2]))
    && grid.isWalk(W9.houses[0].item[0], W9.houses[0].item[2]) && grid.isWalk(W9.houses[1].pad[0], W9.houses[1].pad[2]) && grid.isWalk(W9.spawn.pos[0], W9.spawn.pos[2]));
  check('Welt 8: Glasröhre WS unverändert (frei nach 8-Burg, Ziel Welt 9 „Welt Stern“)', W8.levels.find((l) => l.id === 'WS')?.next === 9 && W8.levels.find((l) => l.id === 'WS')?.after === '8-Burg');
  const fake = (levels, worlds = [1]) => ({
    peek: (id) => levels[id] ?? null, starsInWorld: (w) => Object.entries(levels).filter(([k]) => k.startsWith(`${w}-`) || (w === 9 && k.startsWith('S-'))).reduce((n, [, l]) => n + l.stars.filter(Boolean).length, 0),
    totalStars: () => Object.values(levels).reduce((n, l) => n + l.stars.filter(Boolean).length, 0), worldOpened: (n) => worlds.includes(n),
  });
  const maps = (n) => ({ 1: W1, 2: W2, 3: W3, 4: W4, 5: W5, 6: W6, 7: W7, 8: W8, 9: W9 }[n] ?? null);
  const d3 = { done: true, stars: [true, true, true] }, d0 = { done: true, stars: [false, false, false] };
  const W18 = [1, 2, 3, 4, 5, 6, 7, 8];
  check('worldOpen: Welt 9 zu ohne 8-Burg, offen mit 8-Burg oder wenn entdeckt (Welt-Warp); Welt 10 ohne Karte zu',
    !unlock.worldOpen(maps, fake({ '8-A': d3, '8-B': d3 }, W18), 9) && unlock.worldOpen(maps, fake({ '8-Burg': d3 }, W18), 9)
    && unlock.worldOpen(maps, fake({}, [...W18, 9]), 9) && !unlock.worldOpen(maps, fake({ 'S-8': d3 }, [...W18, 9, 10]), 10));
  const many = {}; for (let i = 0; i < 93; i++) many[`5-x${i}`] = d3;   // 279 Sterne
  const s8 = { 'S-1': d0, 'S-2': d0, 'S-3': d0, 'S-4': d0, 'S-5': d0, 'S-6': d0, 'S-7': d0, 'S-8': d0 };
  check('S-9: Weg erst nach S-8 frei; dann 280 Sterne nötig (alle Sterne zählen, 279 reichen nicht); Pilz-Röhre nach S-8 oder sobald Welt 10 entdeckt ist',
    unlock.reason(W9, fake({ ...many, 'S-7': d3 }), 'S-9') === 'locked' && unlock.reason(W9, fake({ ...many, ...s8 }), 'S-9') === 'stars'
    && unlock.gateStars(W9, fake({ ...many, ...s8 })) === 279 && unlock.reason(W9, fake({ ...many, ...s8, 'S-1': { done: true, stars: [true, false, false] } }), 'S-9') === null
    && !unlock.pathOpen(W9, fake({ 'S-7': d3 }, [...W18, 9]), 'WP') && unlock.pathOpen(W9, fake({ ...s8 }, [...W18, 9]), 'WP') && unlock.pathOpen(W9, fake({}, [...W18, 9, 10]), 'WP')
    && unlock.reason(W9, fake({}), 'S-1') === null && unlock.reason(W9, fake({}), 'S-2') === 'locked' && unlock.reason(W9, fake({}), 'W8') === null);
}

// ------------------------------------------------------------------ Browser
const PORT = 4915;
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
  await page.screenshot({ path: `${OUT}cmapS_${name}.png`, timeout: 200000 });
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
    if (!('finished' in d)) delete s.data.finished;
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
const W7IDS = ['7-1', '7-2', '7-A', '7-3', '7-4', '7-B', '7-5', '7-Kapitän', '7-6', '7-C', '7-7', '7-Burg'];
const W8IDS = ['8-1', '8-2', '8-3', '8-Zug', '8-4', '8-5', '8-Haus', '8-6', '8-7', '8-A', '8-B', '8-Burg'];
const HIDS = ['H-1', 'H-2', 'H-Kapitän', 'H-3', 'H-4', 'H-Burg'];
const PRE = [...W1IDS, ...W2IDS, ...W3IDS, ...W4IDS, ...W5IDS, ...W6IDS, ...W7IDS, ...W8IDS];
const withAfter = (M) => M.levels.filter((l) => l.after).map((l) => l.id);
const OPENED_1_8 = ['1-2', '1-A', '1-3', '1-Schatz', '1-4', '1-5', '1-Burg', 'W2', ...withAfter(W2), 'W3', ...withAfter(W3), 'W4', ...withAfter(W4), 'W5', ...withAfter(W5),
  'W6', ...withAfter(W6), 'W7', ...withAfter(W7), 'W8', ...withAfter(W8)];
/** Welt 1–8 und Halloween geschafft (je Level drei Sterne bzw. keine) – 90 Level, 270 Sterne. */
const w1to8 = (stars = true) => { const l = {}; for (const id of [...PRE, ...HIDS]) l[id] = lvl(stars); return l; };
/** Sternenzelt-Level (ohne Sterne) als geschafft eintragen. */
const with9 = (base, ids) => { const l = { ...base }; for (const id of ids) l[id] = lvl(false); return l; };
/** Alles geschafft mit allen Sternen (Welt 1–8, Halloween, Sternenzelt: 302 Sterne – genug für die Sternschranke). */
const all9 = () => { const l = w1to8(true); for (const id of SIDS) l[id] = lvl(true); return l; };
/** Schranken der Welt 9, deren Weg mit den geschafften Leveln done frei ist (als geöffnet gemerkt – kein Schwenk). */
const opened9 = (done) => W9.levels.filter((l) => l.after && [].concat(l.after).every((a) => done.includes(a))).map((l) => l.id);
const WORLDS9 = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const EXIT_W8 = exitPoint(W9.entrances.find((e) => e.id === 'W8'));
const P1 = ePos('S-1');
const S18 = ['S-1', 'S-2', 'S-Kapitän', 'S-3', 'S-4', 'S-5', 'S-6', 'S-7', 'S-8'];

// Teilläufe (ST_TEIL=1|2|3) für langsame Rechner, je unter 10 min; ohne Angabe alle Abschnitte.
//   1: Abschnitte 2–5 (Röhre WS → Welt 9, Welt-Warp, Eingänge/erstes Level, Freischaltung und Brücken), 2: 6–9 (Sternschranke,
//   Welt Pilz bald, Kulisse im Takt, Rückweg nach Welt 8), 3: 10–13 (Beeren-/Glückshaus, Abspann, Bilder und Neuladen, Anflug)
const TEIL = process.env.ST_TEIL ?? '';
const PARTS = { 1: [2, 5], 2: [6, 9], 3: [10, 13] };
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

// ------------------------------------------------------------------ 2) Glasröhre WS in Welt 8 → Ankunft in Welt 9
if (part(2)) {
  await loadWith({ levels: w1to8(true), mapOpened: [...OPENED_1_8], world: 8, worlds: [1, 2, 3, 4, 5, 6, 7, 8], coins: 0, mapPos: null });
  await waitMap(8);
  st = await sc(() => window.__courseMap.state());
  const sign = await sc(() => window.__courseMap.signOf('WS'));
  check('Welt 8 nach 8-Burg: Glasröhre WS frei, Ziel „Sternenzelt“ (Karte vorhanden, keine Codeänderung in Welt 8), Schild „Welt Stern / Sternenzelt“, keine „bald“-Anzeige',
    st.entrances.WS.enterable && st.entrances.WS.title === 'Sternenzelt' && st.gates.WS === 'open' && !st.entrances.WS.soon && sign === 'Welt Stern\nSternenzelt');
  const PS = W8.entrances.find((e) => e.id === 'WS').pos;
  await tp(PS[0], PS[1] + 0.3, PS[2] + 3, -Math.PI / 2, 20);
  r = await walkTo(PS[0], PS[2], (s) => s.onPad === 'WS', 600);
  await shot('w8_sternroehre', 600);
  check('Figur steht auf dem Podest der Sternen-Röhre, Hinweis „ab durch die Glasröhre“', r.s.onPad === 'WS' && (await banner()).includes('Glasröhre'));
  await sc(() => window.__courseMap.setInput({ jump: true }));
  st = await sc(() => window.__courseMap.step(1));
  await sc(() => window.__courseMap.setInput({}));
  const t1 = await toast();
  check(`A auf dem Podest startet die Röhrenfahrt ins Sternenzelt (Meldung „${t1}“, kein „Welt Stern kommt bald!“)`, st.travel?.mode === 'depart' && !st.leaving && st.worlds.includes(9)
    && t1 === 'Auf ins Sternenzelt!');
  r = await stepUntil((s) => s.travel?.phase === 'ride' && s.travel.t > 1.6, 600);
  await shot('w8_abfahrt', 400);
  r = await stepUntil(() => false, 600);
  check('Nach der Fahrt verlässt die Karte Welt 8 (Szenenwechsel zu Welt 9)', r.s.leaving === true);
  await waitMap(9);
  st = await sc(() => window.__courseMap.state());
  console.log('  Ankunft', JSON.stringify(st.travel), JSON.stringify(st.player));
  check('Welt 9 geladen, Ankunft durch die Rückweg-Röhre W8 (Figur weit draußen im All)', st.world === 9 && st.travel?.mode === 'arrive' && st.travel.entrance === 'W8'
    && Math.hypot(st.player.x - EXIT_W8[0], st.player.z - EXIT_W8[2]) > 30);
  await shot('ankunft_weit', 300);
  r = await sc(() => ({ lod: window.__courseMap.lod.info(), travel: window.__courseMap.state().travel }));
  console.log('  Ankunft weit', JSON.stringify(r));
  check('Ankunft im All: ferne Kleinteile ausgeblendet, Schattenkarte ruht', r.lod.hidden > 5 && (r.travel.t >= 1 || r.travel.shadows === false));
  r = await stepUntil((s) => s.travel?.t > 1.4, 400);
  await shot('ankunft', 400);
  r = await stepUntil((s) => s.travel?.t > 2.6, 400);
  await shot('ankunft_nah', 300);
  r = await stepUntil((s) => !s.travel, 900);
  await sc(() => window.__courseMap.step(40));
  st = await sc(() => window.__courseMap.state());
  console.log('  angekommen', JSON.stringify(st.player));
  check('Nach der Ankunft steht die Figur vor der Rückweg-Röhre im Sternenhafen', Math.hypot(st.player.x - EXIT_W8[0], st.player.z - EXIT_W8[2]) < 0.8 && st.player.mode === 'ground'
    && Math.abs(st.player.y - 10) < 0.05);
  check('Welt 9 gemerkt (offen, aktuelle Welt)', st.worlds.includes(9) && (await sc(() => JSON.parse(localStorage.getItem('lotti-greta-course-v1')).world)) === 9);
  await frames(3);
  check(`HUD: Weltname „Welt Stern · Sternenzelt“, Sterne gesamt ${(PRE.length + HIDS.length) * 3}, Welt Stern hat 32 Sterne`, (await sc(() => window.__courseMap.hud.worldName.text)) === 'Welt Stern · Sternenzelt'
    && st.totalStars === (PRE.length + HIDS.length) * 3 && st.stars === 0 && st.starsMax === 32);
  r = await sc(() => ({ name: window.__courseMap.musicName(), has: !!window.__audio.music.themeInfo('course_worldstar_map') }));
  check(`Musik der Sternenzelt-Karte: course_worldstar_map (vorhanden: ${r.has}), sonst Rückfall course_map (jetzt: ${r.name})`, r.has && r.name === 'course_worldstar_map');
  await shot('start', 900);
}

// ------------------------------------------------------------------ 3) Welt-Warp aus einem Welt-8-Level landet in Welt 9; Rückkehr aus einem S-Level
if (part(3)) {
  lv = w1to8(true);
  delete lv['8-Burg'];
  await loadWith({ levels: lv, mapOpened: [...OPENED_1_8.filter((id) => id !== 'WS')], world: 8, worlds: [1, 2, 3, 4, 5, 6, 7, 8], mapPos: null }, '&mapAlias=8-1:0-0');
  await waitMap(8);
  const P81 = W8.entrances.find((e) => e.id === '8-1').pos;
  await tp(P81[0], 1.8, P81[2] + 3, Math.PI / 2, 20);
  r = await walkTo(P81[0], P81[2], (s) => s.onPad === '8-1', 900);
  st = await sc(() => { const m = window.__courseMap; m.enter(); m.step(1); return m.state(); });
  check('8-1 (Ersatz-Level) gestartet', st.leaving && st.lastStart?.entrance === '8-1');
  await waitCourse();
  // wie map/warp.js (Röhre mit warpWorld: 9): Welt 9 freischalten, Level ohne Zielmast verlassen
  await sc(() => { window.__courseSave.openWorld(9); window.__course.exitToMap({ warpWorld: 9 }); });
  await waitMap(9);
  st = await sc(() => window.__courseMap.state());
  console.log('  Warp-Ankunft', JSON.stringify(st.travel), st.soonWorld);
  check('Welt-Warp nach Welt 9 endet im Sternenzelt: Ankunft durch die Rückweg-Röhre W8, keine „bald“-Meldung', st.world === 9 && st.travel?.mode === 'arrive' && st.travel.entrance === 'W8'
    && st.soonWorld === null && st.worlds.includes(9));
  r = await stepUntil((s) => s.travel?.t > 1.4, 400);
  await shot('warp_ankunft', 400);
  r = await stepUntil((s) => !s.travel, 900);
  await sc(() => window.__courseMap.step(40));
  st = await sc(() => window.__courseMap.state());
  check('Nach dem Warp: Figur vor der Rückweg-Röhre, S-1 frei, Röhre zurück nach Welt 8 frei', Math.hypot(st.player.x - EXIT_W8[0], st.player.z - EXIT_W8[2]) < 0.8
    && !st.entrances['S-1'].locked && st.entrances.W8.enterable && !st.cinematic && (await toast()) !== 'Welt Stern kommt bald!');
  // Rückkehr aus einem S-Level (Präfix 'S' → Welt 9), auch wenn die gemerkte Welt eine andere ist
  r = await sc(() => window.__courseMap.worldList());
  const wo = await sc(() => ['S-1', 'S-Kapitän', 'S-9', '8-Burg'].map((id) => window.__courseMap.worldOfLevel(id)));
  check(`Weltenliste mit Welt 9 (${r.join()}), worldOfLevel: S-Ids → 9 (Präfix S), Zahl-Ids wie bisher`, r.includes(9) && r.indexOf(9) === r.indexOf(8) + 1 && wo.join() === '9,9,9,8');
  await sc(() => { const s = window.__courseSave; s.data.world = 1; s.save(); window.__courseMap.leaving = true; window.__courseMap.scene.start('CourseMap', { from: 'S-1' }); });
  await waitMap(9);
  st = await sc(() => window.__courseMap.state());
  check('Rückkehr aus S-1 (from: „S-1“) zeigt Welt 9 vor der Regenbogeninsel', st.world === 9 && Math.hypot(st.player.x - P1[0], st.player.z - P1[2] - 2.6) < 0.8);
}

// ------------------------------------------------------------------ 4) Eingänge: Titel bzw. „Bald“, Start-Zustand, erstes Level
if (part(4)) {
  await loadWith({ levels: w1to8(true), mapOpened: [...OPENED_1_8], world: 9, worlds: WORLDS9, mapPos: null });
  await waitMap(9);
  const titles = await sc((ids) => { const out = {}; for (const id of ids) { const s = window.__courseMap.status(id); out[id] = [s.title, s.exists]; } return out; }, SIDS);
  console.log('  Titel', JSON.stringify(titles));
  check('Eingänge im Sternenzelt zeigen den Leveltitel bzw. „Bald“', Object.values(titles).every(([t, ex]) => (ex ? t && t !== 'Bald' : t === 'Bald')));
  st = await sc(() => window.__courseMap.state());
  check('Start im Sternenzelt: nur S-1 frei, alle anderen zu, Rückweg-Röhre frei, Pilz-Röhre zu, alle 10 Schranken zu, keine Gegnergruppen',
    !st.entrances['S-1'].locked && SIDS.filter((id) => id !== 'S-1').every((id) => st.entrances[id].locked)
    && st.entrances.W8.enterable && st.entrances.WP.locked && st.entrances.WP.discovered === false && Object.values(st.gates).length === 10
    && Object.values(st.gates).every((g) => g === 'closed') && st.roamers.length === 0);
  await tp(-4, 10.3, 46, -Math.PI / 2, 30);
  await shot('hafen', 800);
  await tp(8, 10.3, 40, -Math.PI / 2, 30);
  await shot('regenbogenweg', 800);
  await loadWith({}, '&mapAlias=S-1:0-0');
  await waitMap(9);
  st = await sc(() => window.__courseMap.state());
  check('mapAlias: S-1 zeigt den Titel des Ersatz-Levels und ist startbar', st.entrances['S-1'].title !== 'Bald' && st.entrances['S-1'].enterable);
  await tp(P1[0], P1[1] + 0.3, P1[2] + 3, Math.PI / 2, 20);
  r = await walkTo(P1[0], P1[2], (s) => s.onPad === 'S-1', 900);
  await shot('regenbogeninsel', 700);
  st = await sc(() => { const m = window.__courseMap; m.enter(); m.step(1); return m.state(); });
  check('Enter auf dem Podest S-1 startet das (Ersatz-)Level', st.leaving && st.lastStart?.entrance === 'S-1' && st.lastStart?.id === '0-0');
  await waitCourse();
  await sc(() => window.__course.exitToMap({ done: '0-0' }));
  await waitMap(9);
  st = await sc(() => window.__courseMap.state());
  check('Rückkehr aus dem Level: Welt 9, vor der Regenbogeninsel, Ergebnis auf S-1 übertragen, Schranke zum Plattenfeld versinkt',
    st.world === 9 && Math.hypot(st.player.x - P1[0], st.player.z - P1[2] - 2.6) < 0.8 && st.entrances['S-1'].done && st.cinematic);
  await shot('schwenk_s2', 300, false, 3);
  r = await stepUntil((s) => !s.cinematic, 2400);
  check('Weg zum Plattenfeld (S-2) offen und frei, S-3 und S-Kapitän noch zu', r.s.gates['S-2'] === 'open' && !r.s.entrances['S-2'].locked && r.s.entrances['S-3'].locked
    && r.s.entrances['S-Kapitän'].locked);
  // die Sternenbrücke zum Plattenfeld ist begehbar
  await tp(24, 10.8, 28, Math.PI / 2, 20);
  r = await walkTo(24, 10, (s) => s.player.z < 12, 900);
  check('Über die Sternenbrücke hinauf zum Plattenfeld (y 12)', r.s.player.z < 12 && Math.abs(r.s.player.y - 12) < 0.1 && r.s.player.mode === 'ground');
  await tp(28, 12.3, 8, -Math.PI / 2, 20);
  await shot('plattenfeld', 700);
}

// ------------------------------------------------------------------ 5) Freischaltung nacheinander, Abzweig S-Kapitän, begehbare Brücken
if (part(5)) {
  // S-2 geschafft: zwei Schranken (S-Kapitän, S-3) versinken nacheinander im Schwenk
  await loadWith({ levels: with9(w1to8(true), ['S-1', 'S-2']), mapOpened: [...OPENED_1_8, ...opened9(['S-1'])], world: 9, worlds: WORLDS9, mapPos: null });
  await waitMap(9);
  st = await sc(() => window.__courseMap.state());
  check('Nach S-2: Schwenk zu den frischen Schranken (Diorama-Insel, Holz-Walzen-Insel)', st.cinematic && st.gates['S-Kapitän'] === 'closed' && st.gates['S-3'] === 'closed');
  r = await stepUntil((s) => !s.cinematic, 4000);
  st = r.s;
  check('Schwenk endet: Wege zu S-Kapitän und S-3 offen, beide frei; S-4 noch zu', ['S-Kapitän', 'S-3'].every((id) => st.gates[id] === 'open' && !st.entrances[id].locked)
    && st.entrances['S-4'].locked && st.gates['S-4'] === 'closed');
  await tp(62, 12.8, 10, -Math.PI / 2, 30);
  await shot('diorama', 700);
  const free = (s2, id) => !s2.entrances[id].locked && s2.entrances[id].pathOpen;
  const shut = (s2, id) => s2.entrances[id].locked && !s2.entrances[id].pathOpen;
  const steps = [
    [[], ['S-1'], ['S-2', 'S-Kapitän', 'S-3', 'S-4', 'S-5', 'S-6', 'S-7', 'S-8', 'S-9', 'WP']],
    [['S-1'], ['S-2'], ['S-Kapitän', 'S-3']],
    [['S-1', 'S-2'], ['S-Kapitän', 'S-3'], ['S-4']],
    [['S-1', 'S-2', 'S-3'], ['S-4'], ['S-5']],
    [['S-1', 'S-2', 'S-3', 'S-4'], ['S-5'], ['S-6']],
    [['S-1', 'S-2', 'S-3', 'S-4', 'S-5'], ['S-6'], ['S-7']],
    [['S-1', 'S-2', 'S-3', 'S-4', 'S-5', 'S-6'], ['S-7'], ['S-8']],
    [['S-1', 'S-2', 'S-3', 'S-4', 'S-5', 'S-6', 'S-7'], ['S-8'], ['S-9', 'WP']],
    [['S-1', 'S-2', 'S-Kapitän', 'S-3', 'S-4', 'S-5', 'S-6', 'S-7'], ['S-8'], ['S-9', 'WP']],
    [S18, ['WP'], []],
  ];
  for (const [done, nowFree, stillShut] of steps) {
    st = await setLevels(with9(w1to8(false), done));
    const label = done.length ? `Nach ${done.slice(-2).join(' + ')}` : 'Ohne Sternenzelt-Level';
    check(`${label}: ${nowFree.join(', ') || '(nichts Neues)'} frei, ${stillShut.join(', ') || '–'} noch zu`, nowFree.every((id) => free(st, id)) && stillShut.every((id) => shut(st, id)));
  }
  st = await setLevels(with9(w1to8(false), S18));
  check('Nach S-8 mit wenigen Sternen: Weg zur Kanonen-Station offen, S-9 gesperrt (Sterne); Röhre WP „Bald“ (Welt Pilz gibt es noch nicht) bzw. frei, sobald es ihre Karte gibt',
    st.entrances['S-9'].pathOpen && st.entrances['S-9'].locked && st.entrances['S-9'].reason === 'stars' && st.entrances.WP.pathOpen && !st.entrances.WP.locked
    && (st.entrances.WP.exists ? st.entrances.WP.enterable : (st.entrances.WP.soon && st.entrances.WP.title === 'Bald')));
  // mit allen geschafften Leveln geladen sind alle Schranken offen; die Brücken sind begehbar
  await loadWith({ levels: all9(), mapOpened: [...OPENED_1_8, ...opened9([...SIDS])] });
  await waitMap(9);
  st = await sc(() => window.__courseMap.state());
  check('Alle Sternenzelt-Wege geschafft: alle 10 Schranken offen, alle Eingänge frei', Object.values(st.gates).length === 10 && Object.values(st.gates).every((g) => g === 'open')
    && SIDS.every((id) => !st.entrances[id].locked));
  const walk = async (from, to, test, label) => {
    await tp(from[0], from[1] + 0.3, from[2], Math.PI / 2, 20);
    const rr = await walkTo(to[0], to[1], test, 1400);
    check(label, test(rr.s));
    return rr;
  };
  await walk([6, 10, 40], [16, 40], (s) => s.player.x > 13.5 && Math.abs(s.player.y - 10.5) < 0.1, 'Regenbogenweg: vom Sternenhafen zur Regenbogeninsel (y 10.5)');
  await walk([22, 12, -4], [22, -26], (s) => s.player.z < -23.5 && Math.abs(s.player.y - 13.5) < 0.1, 'Regenbogenweg: vom Plattenfeld hinauf zur Holz-Walzen-Insel (y 13.5)');
  await walk([8, 13.5, -32], [-14, -32], (s) => s.player.x < -11.5 && Math.abs(s.player.y - 14.5) < 0.1, 'Sternenbrücke: von der Holz-Walzen-Insel zur Wolkeninsel (y 14.5)');
  await walk([-14, 16, -72], [6, -72], (s) => s.player.x > 3.5 && Math.abs(s.player.y - 17) < 0.1, 'Sternenbrücke: vom Retro-Blockland zur Wabeninsel (y 17)');
  await walk([22, 19.5, -132], [-2, -132], (s) => s.player.x < 0.5 && Math.abs(s.player.y - 21) < 0.1, 'Regenbogenweg: vom Nebelfriedhof hinauf zur Kanonen-Station (y 21)');
  await walk([38, 19.5, -136], [38, -153], (s) => s.player.z < -151.5 && Math.abs(s.player.y - 19.5) < 0.1, 'Sternenbrücke: vom Nebelfriedhof zur Röhren-Insel (y 19.5)');
  await tp(24, 12.3, 18, Math.PI / 2, 20);
  await shot('sternenbruecke', 600);
}

// ------------------------------------------------------------------ 6) Sternschranke 280 (alle Sterne zählen)
if (part(6)) {
  // Welt 1–8 und Halloween mit 270 Sternen, S-1 … S-8 geschafft mit 9 Sternen → 279
  const base = w1to8(true);
  const l279 = with9(base, S18);
  for (const id of ['S-1', 'S-2', 'S-3']) l279[id] = lvl(true);
  await loadWith({ levels: l279, mapOpened: [...OPENED_1_8, ...opened9(S18)], world: 9, worlds: WORLDS9, mapPos: null });
  await waitMap(9);
  st = await sc(() => window.__courseMap.state());
  check(`S-8 geschafft, ${st.gateStars} Sterne: Weg zur Kanonen-Station offen, S-9 gesperrt (Sterne)`, st.gates['S-9'] === 'open' && st.entrances['S-9'].locked
    && st.entrances['S-9'].reason === 'stars' && st.gateStars === 279);
  const P9 = ePos('S-9');
  await tp(P9[0], P9[1] + 0.3, P9[2]);
  await shot('station', 900);
  const b279 = await banner();
  const noStart = !(await sc(() => { const m = window.__courseMap; m.enter(); return m.step(2).leaving; }));
  const l280 = { ...l279, 'S-4': lvl(false) };
  l280['S-4'].stars[0] = true;
  st = await setLevels(l280);
  console.log('  Hinweis:', b279);
  check('Hinweis „Benötigt 280 Sterne (279/280)“ an der Station, Enter startet nichts; mit 280 Sternen frei (zeigt „Bald“, bis es das Level gibt)',
    b279 === 'Benötigt 280 Sterne (279/280)' && noStart && !st.entrances['S-9'].locked && st.gateStars === 280 && st.entrances['S-9'].enterable === st.entrances['S-9'].exists);
  await tp(20, 19.8, -126, -Math.PI / 2, 30);
  await shot('sternschranke', 700);
}

// ------------------------------------------------------------------ 7) Glasröhre WP „Welt Pilz kommt bald“, Welt-Warp nach Welt 10 über den Rückfall
if (part(7)) {
  await loadWith({ levels: all9(), mapOpened: [...OPENED_1_8, ...opened9([...SIDS])], world: 9, worlds: WORLDS9, mapPos: null });
  await waitMap(9);
  const PP = ePos('WP');
  st = await sc(() => window.__courseMap.state());
  const hasPilz = st.entrances.WP.exists;
  await tp(PP[0], PP[1] + 0.3, PP[2] + 3, -Math.PI / 2, 20);
  r = await walkTo(PP[0], PP[2], (s) => s.onPad === 'WP', 400);
  await shot('pilzroehre', 700);
  if (!hasPilz) {
    await sc(() => { const m = window.__courseMap; m.hud.toast('', 0.01); m.step(2); m.enter(); m.step(1); });
    const msg = await toast();
    st = await sc(() => { const m = window.__courseMap; m.setInput({ jump: true }); m.step(1); m.setInput({}); return m.step(5); });
    const sign = await sc(() => window.__courseMap.signOf('WP'));
    check('Pilz-Röhre nach S-8: Weg frei, „Bald“, Enter/A zeigt „Welt Pilz kommt bald!“ statt einer Fahrt; Schild „Welt Pilz / bald!“', r.s.onPad === 'WP' && msg === 'Welt Pilz kommt bald!'
      && !st.travel && !st.leaving && st.entrances.WP.soon && !st.entrances.WP.enterable && st.entrances.WP.discovered === false && sign === 'Welt Pilz\nbald!');
    // Warp nach Welt 10 aus einem Welt-9-Level (S-7 und S-8 noch offen, Schranken zum Nebelfriedhof und zur Röhren-Insel zu):
    // Rückfall – Ankunft durch die Pilz-Röhre hinter den gesperrten Schranken
    const done6 = ['S-1', 'S-2', 'S-3', 'S-4', 'S-5', 'S-6'];
    await loadWith({ levels: with9(w1to8(true), done6), mapOpened: [...OPENED_1_8, ...opened9(done6)], world: 9, worlds: WORLDS9, mapPos: null }, '&mapAlias=S-1:0-0');
    await waitMap(9);
    await tp(P1[0], P1[1] + 0.3, P1[2] + 3, Math.PI / 2, 20);
    r = await walkTo(P1[0], P1[2], (s) => s.onPad === 'S-1', 900);
    await sc(() => { const m = window.__courseMap; m.enter(); m.step(1); });
    await waitCourse();
    await sc(() => { window.__courseSave.openWorld(10); window.__course.exitToMap({ warpWorld: 10 }); });
    await waitMap(9);
    st = await sc(() => window.__courseMap.state());
    console.log('  Warp 10:', JSON.stringify(st.travel), st.soonWorld, JSON.stringify(st.entrances.WP));
    check('Welt-Warp 10 ohne Karte endet im Sternenzelt: Ankunft durch die Pilz-Röhre, Röhre entdeckt, Weg frei, „Bald“',
      st.world === 9 && st.travel?.mode === 'arrive' && st.travel.entrance === 'WP' && st.soonWorld === 10 && st.worlds.includes(10)
      && st.entrances.WP.discovered === true && !st.entrances.WP.locked && st.entrances.WP.soon);
    r = await stepUntil((s) => s.travel?.t > 1.4, 400);
    await shot('warp10_ankunft', 400);
    r = await stepUntil((s) => !s.travel, 900);
    const msg10 = await toast();
    st = await sc(() => window.__courseMap.state());
    check('Nach der Ankunft: „Welt Pilz kommt bald!“, Schranke zur Röhren-Insel versinkt (Schwenk)', msg10 === 'Welt Pilz kommt bald!' && st.cinematic);
    r = await stepUntil((s) => !s.cinematic, 1800);
    await sc(() => window.__courseMap.step(20));
    st = await sc(() => window.__courseMap.state());
    const exitP = exitPoint(W9.entrances.find((e) => e.id === 'WP'));
    check('Figur steht vor der Pilz-Röhre, Schranke offen', Math.hypot(st.player.x - exitP[0], st.player.z - exitP[2]) < 0.8 && st.gates.WP === 'open' && !st.cinematic);
    await tp(38, 19.8, -153, Math.PI / 2, 20);
    await walkTo(38, -137, (s) => s.player.z > -138, 900);
    r = await walkTo(30, -126, (s) => Math.hypot(s.player.x - 30, s.player.z + 126) < 0.6, 1400);
    console.log('  von der Röhren-Insel zurück:', r.s.player.x.toFixed(2), r.s.player.y.toFixed(2), r.s.player.z.toFixed(2), r.s.gates['S-8']);
    check('Von der Röhren-Insel zurück: die Figur kommt über die Sternenbrücke auf den Nebelfriedhof', Math.hypot(r.s.player.x - 30, r.s.player.z + 126) < 0.6 && Math.abs(r.s.player.y - 19.5) < 0.1);
    await tp(48, 19.8, -118, Math.PI / 2, 20);
    r = await walkTo(48, -100, (s) => s.player.z > -101, 900);
    check('Vom Nebelfriedhof zurück: Schranke S-8 auf der Sternenbrücke lässt die Figur von hinten durch', r.s.player.z > -101 && r.s.gates['S-8'] === 'closed' && Math.abs(r.s.player.y - 18) < 0.1);
  } else {
    await sc(() => { const m = window.__courseMap; m.setInput({ jump: true }); m.step(1); m.setInput({}); });
    st = await sc(() => window.__courseMap.state());
    check('Pilz-Röhre nach S-8: Karte der Welt Pilz vorhanden – A startet die Fahrt', st.travel?.mode === 'depart');
  }
}

// ------------------------------------------------------------------ 8) Funkelnde Sterne im Takt der Kartenmusik, lebendige Kulisse
if (part(8)) {
  if (!(await sc(() => window.__courseMap?.map.world === 9))) {
    await loadWith({ levels: all9(), mapOpened: [...OPENED_1_8, ...opened9([...SIDS])], world: 9, worlds: WORLDS9, mapPos: null });
    await waitMap(9);
  }
  await tp(28, 12.3, 8);
  r = await sc(() => {
    const mu = window.__audio.music, m = window.__courseMap;
    const theme = m.musicName();
    mu.setManualClock(true);
    const bpm = mu.beat().bpm, spb = 60 / bpm;
    const T = () => m.state().decor.twinkle;
    const P = () => m.state().decor.plates;
    const t0 = T();
    mu.advanceClock((1 - (t0.beat % 1)) * spb + 0.05 * spb);   // nächste Zählzeit: Gruppe wechselt, Puls hell
    const t1 = T(); for (const u of m.built.entrances.get('S-2').updaters) u(0, 0); const p1 = P();
    mu.advanceClock(0.55 * spb);                               // dieselbe Zählzeit, Puls klingt ab
    const t2 = T(); for (const u of m.built.entrances.get('S-2').updaters) u(0, 0); const p2 = P();
    mu.advanceClock(0.45 * spb);                               // nächste Zählzeit: nächste Gruppe, Farbplatten wechseln
    const t3 = T(); for (const u of m.built.entrances.get('S-2').updaters) u(0, 0); const p3 = P();
    return { theme, bpm, t0, t1, t2, t3, p1, p2, p3 };
  });
  console.log('  Funkelsterne:', JSON.stringify({ t0: [r.t0.step, r.t0.k], t1: [r.t1.step, r.t1.k], t2: [r.t2.step, r.t2.k], t3: [r.t3.step, r.t3.k], src: r.t1.source, theme: r.t1.theme, bpm: r.bpm, n: r.t0.n }),
    'Farbplatten:', JSON.stringify([r.p1, r.p2, r.p3]));
  check(`Funkelnde Sterne folgen der Taktuhr der Kartenmusik (${r.theme}, ${r.bpm} BPM)`, r.t1.theme === r.theme && r.t1.source !== 'zeit' && r.t1.bpm === r.bpm && r.t0.n >= 100);
  check('Je Zählzeit leuchtet eine der drei Sterngruppen hell auf (am Schlag hell, dann schwächer, nächste Zählzeit die nächste Gruppe)',
    r.t1.step === (Math.floor(r.t0.beat) + 1) % 3 && r.t1.k > 0.9 && r.t2.step === r.t1.step && r.t2.k < 0.6 && r.t3.step === (r.t1.step + 1) % 3 && r.t3.k > 0.9);
  check('Farbplatten im Takt: je Zählzeit wechseln alle die Farbe (Schachbrett), am Schlag leuchten sie auf',
    r.p1.tiles && r.p1.step !== r.p3.step && r.p1.step === r.p2.step && r.p1.flash > r.p2.flash && r.p3.flash > 0.5);
  await frames(3);
  const shown = await sc(() => window.__courseMap.state().decor.twinkle);
  check('Darstellung folgt: gezeigte Sterngruppe und Puls = Stellung der Taktuhr', shown.shown?.step === shown.step && Math.abs(shown.shown.k - shown.k) < 1e-3);
  await shot('funkeln', 300, false, 2);
  await sc(() => window.__audio.music.setManualClock(false));
  // Ersatzuhr ohne Musik
  r = await sc(() => {
    const mu = window.__audio.music;
    mu.stop();
    const d = window.__courseMap.state().decor.twinkle;
    const want = mu.themeInfo('course_worldstar_map')?.bpm ?? mu.themeInfo('course_map')?.bpm;
    const life = window.__courseMap.built.life;
    const a = life.twinkleState(10.02), b = life.twinkleState(10.02 + 60 / want);
    return { d, want, a, b };
  });
  check('Ohne laufende Musik zählt die Ersatzuhr (Kartenzeit) im Tempo der Sternenzelt-Kartenmusik, je Zählzeit wechselt die Gruppe',
    r.d.source === 'zeit' && r.d.bpm === r.want && r.a.step !== r.b.step && Math.abs(r.a.k - r.b.k) < 1e-3);
  // Lebendige Kulisse (Musik bleibt aus: Takt-Kulissen folgen der Ersatzuhr, also der übergebenen Zeit): Walze, Zielmast, Diorama, ?-Turm, Waben, Großrollpilz, Nebel, Station, Regenbogen; Planeten, Raketen, Sternschnuppen
  r = await sc(() => {
    const m = window.__courseMap;
    const run = (id, t) => { for (const u of m.built.entrances.get(id).updaters) u(0.016, t); return m.state().decor; };
    const wz = [run('S-3', 1).roller.z, run('S-3', 4).roller.z];
    const gp = [run('S-4', 1).goalpole.angle, run('S-4', 3).goalpole.angle];
    const di = [run('S-Kapitän', 1).diorama.angle, run('S-Kapitän', 5).diorama.angle];
    const tw = [run('S-5', 1).blockland.grow, run('S-5', 5).blockland.grow, run('S-5', 9).blockland.grow];
    const jr = [run('S-7', 1).jungle.roll, run('S-7', 3).jungle.roll];
    const fy = [run('S-8', 1).fogyard, run('S-8', 4).fogyard];
    const sta = [run('S-9', 1).station, run('S-9', 3).station];
    const rb = [run('S-1', 0.2).rainbow, run('S-1', 0.6).rainbow];
    const life = m.built.life;
    life.update(0.016, 1); const d1 = m.state().decor;
    life.update(0.016, 7); const d2 = m.state().decor;
    const names = ['w9:funkelsterne', 'w9:sternschnuppen', 'w9:rakete', 'w9:sterne-tief', 'w9:sterne-nah', 'w9:nebel-tief', 'w9:kuppelsterne', 'w9:funkenflaemmchen', 'w9:holzwalzen', 'w9:laufbombe', 'w9:schneefall'];
    const found = names.filter((n) => m.view.three.getObjectByName(n));
    return { wz, gp, di, tw, jr, fy, sta, rb, pl: [d1.planets.angle, d2.planets.angle], rk: [d1.rockets.a, d2.rockets.a], d: d2, found, missing: names.filter((n) => !found.includes(n)), models: d2.w9models, heavy: d2.w9heavy };
  });
  console.log('  Kulisse', JSON.stringify({ ...r, d: undefined, models: undefined }));
  check('Lebendige Kulisse: Walze rollt, Zielmast fliegt, Diorama dreht sich, ?-Turm wächst und schrumpft, Großrollpilz rollt, Nebelplattformen blenden, Schienenbrett fährt, Kanonenkugel fliegt, Hüpfmaus hüpft',
    Math.abs(r.wz[0] - r.wz[1]) > 0.5 && Math.abs(r.gp[0] - r.gp[1]) > 0.3 && Math.abs(r.di[0] - r.di[1]) > 0.3 && new Set(r.tw.map((v) => v.toFixed(2))).size > 1
    && Math.abs(r.jr[0] - r.jr[1]) > 0.3 && Math.abs(r.fy[0].fade - r.fy[1].fade) > 0.01 && Math.abs(r.sta[0].brett - r.sta[1].brett) > 0.5 && r.sta[0].ball !== r.sta[1].ball
    && r.rb[0].hop !== r.rb[1].hop);
  check(`Planeten drehen sich (${r.d.planets.n}, Registry ${r.d.planets.registry}: ${r.d.planets.kinds.join('/')}), Spielzeugraketen kreisen (${r.d.rockets.n}), Sternschnuppen (${r.d.shooting.n})`,
    r.d.planets.n >= 4 && r.d.planets.registry === r.d.planets.n && r.pl[0] !== r.pl[1] && r.d.rockets.n >= 2 && r.rk[0] !== r.rk[1] && r.d.shooting.n >= 1);
  check(`Kulissen-Objekte vorhanden (${r.found.length}/${r.found.length + r.missing.length}${r.missing.length ? `, fehlt: ${r.missing.join(', ')}` : ''}); Funkelsterne ${r.d.twinkle.n}, Gräber ${r.d.fogyard.graves}, Waben ${r.d.honeycomb.cells}`,
    r.missing.length === 0 && r.d.twinkle.n >= 100 && r.d.honeycomb.cells === 19 && r.d.fogyard.platforms === 2);
  console.log('  Registry-Modelle in der Kulisse:', (r.models ?? []).join(', '), '| zu schwer:', JSON.stringify(r.heavy ?? {}));
  check('Bonuswelt-Modelle der Registry in der Kulisse (Planet mit kind, Sternschnuppe, Spielzeugrakete, Sternen-Torbogen, Farb-/Drehplatte, Drehscheibe, Walze, Zielmast mit Flügeln, Retro-Block, ?-Turm, Wabe, Riesenpflanze, Schneegrab, Nebelplattform, Kuppel, Schienenbrett, Kanonenkugel)',
    ['planet', 'sternschnuppe', 'spielzeugrakete', 'sternen_torbogen', 'farbplatte', 'drehplatte', 'diorama_drehscheibe', 'walzen_schiene', 'schienenwalze', 'zielmast_fluegel',
      'retro_block', 'riesen_frageblock_turm', 'wabe', 'wabensaeule', 'riesenpflanze', 'schneegrab', 'nebelplattform', 'weltraum_kuppel', 'brett_schiene', 'schienenbrett', 'kanonenkugel_tritt', 'kruemel']
      .every((n) => (r.models ?? []).includes(n)) && Object.keys(r.heavy ?? {}).length === 0);
  await sc(() => window.__audio.music.play(window.__courseMap.musicName()));
}

// ------------------------------------------------------------------ 9) Rückweg nach Welt 8
if (part(9)) {
  if (!(await sc(() => window.__courseMap?.map.world === 9))) { await loadWith({ levels: w1to8(true), mapOpened: [...OPENED_1_8], world: 9, worlds: WORLDS9, mapPos: null }); await waitMap(9); }
  const W8E = ePos('W8');
  await tp(W8E[0], 10.3, W8E[2] + 3, Math.PI / 2, 20);
  r = await walkTo(W8E[0], W8E[2], (s) => s.onPad === 'W8', 400);
  await sc(() => { const m = window.__courseMap; m.setInput({ jump: true }); m.step(1); m.setInput({}); });
  st = await sc(() => window.__courseMap.state());
  check('Rückweg-Röhre im Sternenzelt startet die Fahrt nach Welt 8', r.s.onPad === 'W8' && st.travel?.mode === 'depart');
  r = await stepUntil((s) => s.travel?.t > 1.4, 600);
  await shot('abfahrt_w8', 300);
  r = await stepUntil(() => false, 900);
  await waitMap(8);
  st = await sc(() => window.__courseMap.state());
  check('Welt 8: Ankunft durch die Sternen-Röhre (aus dem Sternenzelt)', st.world === 8 && st.travel?.mode === 'arrive' && st.travel.entrance === 'WS');
  await shot('w8_ankunft', 300);
  r = await stepUntil((s) => !s.travel, 900);
  await sc(() => window.__courseMap.step(40));
  st = await sc(() => window.__courseMap.state());
  const exS = exitPoint(W8.entrances.find((e) => e.id === 'WS'));
  check('Zurück in Welt 8 vor der Sternen-Röhre, Röhre frei (Welt Stern entdeckt) mit Ziel „Sternenzelt“',
    st.world === 8 && Math.hypot(st.player.x - exS[0], st.player.z - exS[2]) < 0.8 && st.entrances.WS.enterable && st.entrances.WS.discovered === true && st.entrances.WS.title === 'Sternenzelt');
  await shot('w8_sternroehre_zurueck', 600);
}

// ------------------------------------------------------------------ 10) Beerenhaus, Glückshaus
if (part(10)) {
  const d = ['S-1', 'S-2', 'S-3', 'S-4'];
  await loadWith({ levels: with9(w1to8(true), d), mapOpened: [...OPENED_1_8, ...opened9([...d, 'S-5'])], world: 9, worlds: WORLDS9, mapPos: null, coins: 0 });
  await waitMap(9);
  st = await sc(() => window.__courseMap.state());
  check('Beerenhaus im Sternenhafen bietet ein Power-up an', st.berry === true);
  const H = W9.houses[0];
  await tp(H.item[0], 10.3, H.item[2] + 3, Math.PI / 2, 20);
  r = await walkTo(H.item[0], H.item[2], (s) => !s.berry, 400);
  check('Beerenhaus: Power-up eingepackt', !r.s.berry && !!r.s.carryPower && r.s.player.power === r.s.carryPower);
  await shot('beerenhaus', 800);
  const G = W9.houses[1];
  await sc((p) => { const s = window.__courseSave; s.data.coins = 25; s.save(); const m = window.__courseMap; m.teleport(p[0], 16.3, p[2] + 3, Math.PI / 2); m.step(10); }, G.pad);
  r = await walkTo(G.pad[0], G.pad[2], (s) => s.onSlotPad, 400);
  check('Figur steht auf der Matte vor dem Spielautomaten (Retro-Blockland)', r.s.onSlotPad === true);
  await sc(() => { window.__courseMap.slot.force(['coin', 'coin', 'coin']); const m = window.__courseMap; m.setInput({ jump: true }); m.step(1); m.setInput({}); m.step(60); });
  st = await sc(() => window.__courseMap.state());
  check('Glückshaus: A zieht den Hebel, Einsatz 10 bezahlt', st.slot.state === 'spin' && st.coins === 15);
  await shot('glueck', 600);
  st = await sc(() => window.__courseMap.step(420));
  check('3 × Bitcoin: 30 Bitcoins Gewinn (15 → 45)', st.slot.state === 'idle' && st.coins === 45);
}

// ------------------------------------------------------------------ 11) Abspann (?credits=1) läuft mit der Sternenzelt-Karte weiter richtig
if (part(11)) {
  await loadWith({ levels: with9(w1to8(true), ['S-1']), mapOpened: [...OPENED_1_8, ...opened9(['S-1'])], world: 9, worlds: WORLDS9, mapPos: null });
  await waitMap(9);
  await page.goto(`http://localhost:${port}/?credits=1&scale=2&adapt=0`, { waitUntil: 'load' });
  try { await page.waitForFunction(() => window.__credits && window.__game.scene.isActive('Credits'), null, { timeout: 150000 }); } catch { await fail('Abspann startet nicht.'); }
  await page.waitForTimeout(800);
  r = await sc(() => {
    const c = window.__credits;
    c.setManual?.(true);
    const texts = (c.lines ?? []).map((l) => (Array.isArray(l) ? l[0] : l)).filter((x) => typeof x === 'string');
    const reise = texts.filter((x) => /^(Welt \d+|Welt Stern|Halloween) · /.test(x));
    return { reise, w8: reise.filter((x) => x === 'Welt 8 · Brummbär-Rummelplatz').length, star: reise.filter((x) => x === 'Welt Stern · Sternenzelt').length, st: c.state() };
  });
  console.log('  Abspann – die Reise:', r.reise.join(' | '));
  check('Abspann (?credits=1): Weltenliste nennt Welt 8 und „Welt Stern · Sternenzelt“ je genau einmal (nach Welt 8, vor Halloween)',
    r.w8 === 1 && r.star === 1 && r.reise.indexOf('Welt Stern · Sternenzelt') === r.reise.indexOf('Welt 8 · Brummbär-Rummelplatz') + 1);
  await sc(() => window.__credits.advance(30));
  await page.screenshot({ path: `${OUT}cmapS_abspann.png`, timeout: 200000 });
  await sc(() => window.__credits.advance(80));
  let back = true;
  try { await page.waitForFunction(() => window.__game.scene.isActive('CourseMap') && window.__courseMap?.hud && window.__courseMap.player, null, { timeout: 120000 }); } catch { back = false; }
  await page.waitForTimeout(1200);
  st = back ? await sc(() => { const m = window.__courseMap; m.setManual(true); return { ...m.state(), trophy: !!m.hud.trophyShown, finished: window.__courseSave.data.finished }; }) : {};
  check('Abspann endet von selbst: zurück zur Weltkarte (Welt 8, befreiter Turm), Pokal im HUD, Spielstand „geschafft“', back && st.world === 8 && st.trophy && st.finished === true
    && st.decor?.finished === true);
  // die befreite Welt 8 führt weiter ins Sternenzelt
  check('Nach dem Abspann: Sternen-Röhre in Welt 8 frei mit Ziel „Sternenzelt“', back && st.entrances?.WS?.enterable && st.entrances.WS.title === 'Sternenzelt');
}

// ------------------------------------------------------------------ 12) Bilder der Inseln (alle Wege offen, alle Level geschafft) und Neuladen
if (part(12)) {
  await loadWith({ levels: all9(), mapOpened: [...OPENED_1_8, ...opened9([...SIDS])], world: 9, worlds: WORLDS9, mapPos: null });
  await waitMap(9);
  for (const [name, pos] of [['hafen_beeren', [-8, 10, 41]], ['plattenstufen', [36, 12, 4]], ['drehplatten', [16, 12, -4]], ['walzen', [21, 13.5, -27]], ['athletik', [30, 13.5, -27]],
    ['wolkeninsel', [-16, 14.5, -28]], ['zielmast', [-22, 14.5, -27]], ['blockland', [-24, 16, -64]], ['frageturm', [-18, 16, -70]], ['waben', [16, 17, -67]],
    ['dschungel', [59, 18, -83]], ['riesenpflanzen', [58, 18, -90]], ['nebelfriedhof', [32, 19.5, -126]], ['nebelplattformen', [30, 19.5, -118]], ['station_kuppel', [-14, 21, -136]],
    ['schienenbrett', [-24, 21, -138]], ['pilzinsel', [38, 19.5, -152]]]) {
    await tp(pos[0], pos[1] + 0.3, pos[2], -Math.PI / 2, 30);
    await shot(name, 300);
  }
  await sc(() => { const m = window.__courseMap; m.teleport(-2, 10.3, 44, Math.PI / 2); m.step(30); m.rememberPos(); });
  await page.reload({ waitUntil: 'load' });
  await waitMap();
  st = await sc(() => window.__courseMap.state());
  check('Nach Neuladen: wieder Welt 9 an der gemerkten Stelle', st.world === 9 && Math.hypot(st.player.x + 2, st.player.z - 44) < 0.8);
}

// ------------------------------------------------------------------ 13) Anflug (Welt 9 betreten) und Kennzahlen
if (part(13)) {
  await loadWith({ levels: w1to8(true), mapOpened: [...OPENED_1_8], world: 9, worlds: WORLDS9, mapPos: null });
  try { await page.waitForFunction(() => window.__courseMap && window.__courseMap.intro && window.__courseMap.map.world === 9, null, { timeout: 150000 }); } catch { /* ohne Anflug */ }
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}cmapS_anflug.png`, timeout: 200000 });
  { const s = await sc(() => window.__courseMap?.intro ? window.__courseMap.stats() : null); if (s) stats.push(['anflug', s.calls, s.triangles, 9]); }
  check('Anflug beim Betreten des Sternenzelts läuft', stats.some(([n]) => n === 'anflug'));
  await waitMap(9);
}

console.log(`  — Ende (${Math.round((Date.now() - T0) / 1000)} s)`);
const sst = await sc(() => window.__courseMap?.map.world === 9 ? window.__courseMap.stats() : null);
if (sst) console.log(`\n  Statische Kulisse Welt 9: ${sst.staticMeshes} Kachel-Meshes, ${Math.round(sst.staticTriangles / 1000)} k Dreiecke, ${sst.shapes} Kollisionsformen`);
console.log('  Kennzahlen je Bild (Zeichenaufrufe inkl. Schattenpass, Dreiecke):');
for (const [n, c, t, w] of stats) console.log(`    ${n.padEnd(22)} ${String(c).padStart(4)} Aufrufe  ${String(Math.round(t / 1000)).padStart(4)} k Dreiecke  (Welt ${w})`);
for (const w of [9, 8]) {
  const ws = stats.filter(([, , , ww]) => ww === w);
  if (!ws.length) continue;
  const maxCalls = Math.max(...ws.map((s) => s[1])), maxTris = Math.max(...ws.map((s) => s[2]));
  check(`Kennzahlen Welt ${w}: Zeichenaufrufe < 120 (max ${maxCalls}), Dreiecke < 300 k (max ${Math.round(maxTris / 1000)} k)`, maxCalls < 120 && maxTris < 300000);
}

await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
