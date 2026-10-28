// Welt-8-Karte „Brummbär-Rummelplatz“ der Kurs-Karte (Präzisierung Mehrwelten-Karte, Notiz Welt 8):
//   Weltdaten (Schranken riegeln ab, Ids/Reihenfolge/Sternbedarf laut Vertrag „Welt 8 – Level-Liste“, 43 Sterne, Röhren
//   W7/WS, Zirkuszelte am Rand, Turm in der Mitte) – Node; Glasröhre W8 in Welt 7 → Fahrt → Ankunft in Welt 8 an der
//   Rückweg-Röhre (ohne Codeänderung in Welt 7); Welt-Warp nach Welt 8 aus einem Welt-7-Level landet in Welt 8; Eingänge
//   zeigen Titel bzw. „Bald“ (mapAlias); Freischaltung nacheinander (Schranken-Schwenk, Wege, begehbare Brücken, Zugbrücke,
//   Glasröhre) inkl. Doppelbedingung 8-A **und** 8-B für 8-Burg; Sternschranke 190 mit Hinweis „Benötigt 190 Sterne
//   (x/190)“; Glühbirnen im Takt der Kartenmusik (Taktuhr, manuell vorgespult) und Ersatzuhr ohne Musik, Stachelbrücken im
//   Takt, lebendige Kulisse (Riesenrad, Karussell, Achterbahn, Ballons, Regen, Baron-Express, Leuchtstege, Felsklotz …);
//   Glasröhre WS „Welt Stern kommt bald!“ (auch Welt-Warp nach Welt 9 über den Rückfall); Beerenhaus, Glückshaus;
//   „befreiter“ Turm nach dem Spielende (courseSave.data.finished: Herz-Fahnen, Freunde vor dem Turm, Feuerwerk, Glas offen);
//   gespeicherte Welt bleibt nach Neuladen; Rückweg nach Welt 7; Anflug; Kennzahlen (< 120 Zeichenaufrufe, < 300 k Dreiecke an
//   jeder Ansicht inkl. Ankunft und Anflug); keine Konsolenfehler.
// Simulation deterministisch über window.__courseMap.step(n)/setInput; Bilder tests/out/cmap8_*.png zur Sichtprüfung.
// Aufruf: npm run build && node tests/course_map_w8.mjs   (Teilläufe: W8_TEIL=1, 2, 3, 4 – s. u.; PORT_BASE verschiebt den Port)
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';
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
const W8IDS = ['8-1', '8-2', '8-3', '8-Zug', '8-4', '8-5', '8-Haus', '8-6', '8-7', '8-A', '8-B', '8-Burg'];

// ------------------------------------------------------------------ 1) Weltdaten und Logik (Node)
{
  const grid = buildWalkGrid(W8);
  const order = W8.levels.map((l) => l.id);
  const after = Object.fromEntries(W8.levels.map((l) => [l.id, [].concat(l.after ?? [])]));
  let ok = true;
  const open = new Set();
  for (let i = 0; i <= order.length; i++) {
    const done = new Set(order.slice(0, i));
    for (const id of order) if (after[id].every((a) => done.has(a))) open.add(id);
    const r = reachable(W8, grid, open).ids.sort();
    const want = order.filter((id) => open.has(id)).sort();
    if (r.join() !== want.join()) { ok = false; console.log('   erreichbar', r.join(), 'erwartet', want.join()); }
  }
  // Doppelbedingung: nur 8-A oder nur 8-B geschafft → Turmplatz bleibt unerreichbar
  for (const one of ['8-A', '8-B']) {
    const o = new Set(['W7', '8-1', '8-2', '8-3', '8-Zug', '8-4', '8-5', '8-Haus', '8-6', '8-7', '8-A', '8-B']);
    const r = reachable(W8, grid, o).ids;
    if (r.includes('8-Burg') || r.includes('WS')) { ok = false; console.log('   Turmplatz ohne 8-Burg-Weg erreichbar', one); }
  }
  check('Welt 8: jede Schranke riegelt ihren Bereich vollständig ab (auch die Turm-Schranke bis 8-A und 8-B geschafft sind)', ok);
  const gr = gateRects(W8, grid);
  check('Welt 8: 12 Schranken (je 4 m breit), jede mit Rückseite', gr.length === 12 && gr.every((g) => Math.abs(g.width - 4) < 0.01) && gateSides(W8, grid).every((g) => g.back !== 0));
  check('Welt 8: Ids und Reihenfolge der Welt-8-Liste', W8.levels.filter((l) => !l.next).map((l) => l.id).join() === W8IDS.join());
  const rule = (id) => W8.levels.find((l) => l.id === id);
  check('Welt 8: Freischaltung laut Vertrag (8-1 frei, 8-2 … 8-4 nacheinander, 8-5/8-Haus nach 8-4, 8-6 nach 8-5, 8-7 nach 8-6, 8-A/8-B nach 8-7, 8-Burg nach 8-A und 8-B ≥ 190)',
    !rule('8-1').after && rule('8-2').after === '8-1' && rule('8-3').after === '8-2' && rule('8-Zug').after === '8-3' && rule('8-4').after === '8-Zug'
    && rule('8-5').after === '8-4' && rule('8-Haus').after === '8-4' && rule('8-6').after === '8-5' && rule('8-7').after === '8-6'
    && rule('8-A').after === '8-7' && rule('8-B').after === '8-7' && [].concat(rule('8-Burg').after).sort().join() === '8-A,8-B' && rule('8-Burg').minStars === 190
    && W8.starScope === 'all' && W8IDS.filter((id) => rule(id).minStars).join() === '8-Burg');
  const perLevel = { '8-1': 3, '8-2': 3, '8-3': 3, '8-Zug': 3, '8-4': 3, '8-5': 3, '8-Haus': 10, '8-6': 3, '8-7': 3, '8-A': 3, '8-B': 3, '8-Burg': 3 };
  check('Welt 8: Sterne je Eingang wie in der Welt-8-Tabelle (zusammen 43), Stempel überall außer 8-Haus',
    W8IDS.every((id) => rule(id).stars === perLevel[id]) && unlock.worldStarsMax(W8) === 43
    && W8IDS.filter((id) => rule(id).stamp).join() === W8IDS.filter((id) => id !== '8-Haus').join());
  check('Welt 8: Glasröhre zurück (W7, offen) und zur Welt Stern (WS → Welt 9, nach 8-Burg)', rule('W7').next === 7 && rule('W7').world === 7 && !rule('W7').after
    && rule('WS').next === 9 && rule('WS').world === 9 && rule('WS').after === '8-Burg' && rule('WS').worldLabel === 'Welt Stern');
  check('Welt 8: jeder Eingang hat ein Podest/eine Kulisse, Kulissen-Arten je Zone',
    W8.levels.every((l) => W8.entrances.some((e) => e.id === l.id))
    && W8IDS.map((id) => W8.entrances.find((e) => e.id === id).kind).join() === 'rainfort,dunes8,cookiefactory,baronstation,nightfort,lakefort,clawhouse,darkmansion,inferno,goldtent,snaketent,barontower'
    && W8.entrances.filter((e) => e.kind === 'pipe').map((e) => e.id).join() === 'W7,WS');
  const xs = W8.ground.flatMap((b) => [b.rect[0], b.rect[2]]);
  const ePos = (id) => W8.entrances.find((e) => e.id === id).pos;
  const walkTops = W8.ground.filter((b) => b.walk).map((b) => b.top);
  check('Welt 8: Zirkuszelte am Rand (8-A Nordost, 8-B Ostrand), Turm in der Mitte (x ≈ 0) am höchsten Punkt, ab Turmplatz die Sternen-Röhre',
    ePos('8-B')[0] > 50 && ePos('8-A')[0] > 30 && Math.abs(ePos('8-Burg')[0]) < 1 && ePos('8-Burg')[1] === Math.max(...walkTops)
    && ePos('WS')[1] === ePos('8-Burg')[1] && Math.min(...xs) >= -94 && Math.max(...xs) <= 86);
  const segs = (t) => W8.segments.filter((s) => s.type === t).length;
  check('Welt 8: Schild „ab 190 ★“, Brücken (Rummelstege, Kettenstege, Basaltbrücke, Zugbrücke, Glasröhre), Musik course_world8_map, Thema map_rummel',
    W8.signs.some((s) => s.text === 'ab 190 ★') && segs('rummelbridge') >= 5 && segs('chainbridge') >= 2 && segs('basaltbridge') === 1 && segs('drawbridge') === 1
    && segs('glasstube') === 1 && W8.segments.length === W8.walk.length && W8.music === 'course_world8_map' && W8.fallbackMusic === 'course_map'
    && W8.theme === 'map_rummel' && W8.kit === 'rummel' && W8.world === 8 && W8.sea === 0);
  check('Welt 8: Zonen (Regenfels, Dünen, Keksboden, Bahnsteig mit Gleis, Nachtstein, See, Spukgarten, Inferno mit Lava, Manegen, Turmplatz, Park)',
    ['rainrock', 'sand', 'cookie', 'station', 'rails', 'nightstone', 'lake', 'spook', 'inferno', 'basin', 'circus', 'tower', 'parkgrass', 'plaza'].every((s) => W8.ground.some((b) => b.style === s)));
  check('Welt 8: lebendige Kulisse in den Weltdaten (Riesenrad, Karussell, Achterbahn, Glühbirnenketten, Ballons, Fahnen, Turm-Banner, Feuerwerk, Lava-Fontänen, Rauch, Knochenflieger)',
    !!W8.wheel && !!W8.carousel && W8.coaster.pts.length >= 12 && W8.lights.length >= 12 && W8.balloons.length >= 3 && W8.flags.length >= 10 && W8.banners.length >= 2
    && W8.fireworks.length >= 5 && W8.fountains.length >= 2 && W8.smoke.length >= 3 && W8.boneflyers.length >= 2);
  check('Welt 8: Eingänge, Ausgänge, Häuser und Lichtmasten liegen auf begehbarem Gelände', W8.entrances.every((e) => grid.isWalk(e.pos[0], e.pos[2]) && grid.isWalk(exitPoint(e)[0], exitPoint(e)[2]))
    && grid.isWalk(W8.houses[0].item[0], W8.houses[0].item[2]) && grid.isWalk(W8.houses[1].pad[0], W8.houses[1].pad[2]) && grid.isWalk(W8.spawn.pos[0], W8.spawn.pos[2])
    && W8.lights.every((l) => grid.isWalk(l.a[0], l.a[2]) && grid.isWalk(l.b[0], l.b[2])));
  check('Welt 7: Glasröhre W8 unverändert (frei nach 7-Burg, Ziel Welt 8)', W7.levels.find((l) => l.id === 'W8')?.next === 8 && W7.levels.find((l) => l.id === 'W8')?.after === '7-Burg');
  const fake = (levels, worlds = [1]) => ({
    peek: (id) => levels[id] ?? null, starsInWorld: (w) => Object.entries(levels).filter(([k]) => k.startsWith(`${w}-`)).reduce((n, [, l]) => n + l.stars.filter(Boolean).length, 0),
    totalStars: () => Object.values(levels).reduce((n, l) => n + l.stars.filter(Boolean).length, 0), worldOpened: (n) => worlds.includes(n),
  });
  const maps = (n) => ({ 1: W1, 2: W2, 3: W3, 4: W4, 5: W5, 6: W6, 7: W7, 8: W8 }[n] ?? null);
  const d3 = { done: true, stars: [true, true, true] }, d0 = { done: true, stars: [false, false, false] };
  const W17 = [1, 2, 3, 4, 5, 6, 7];
  check('worldOpen: Welt 8 zu ohne 7-Burg, offen mit 7-Burg oder wenn entdeckt (Welt-Warp); Welt 9 ohne Karte zu',
    !unlock.worldOpen(maps, fake({ '7-7': d3 }, W17), 8) && unlock.worldOpen(maps, fake({ '7-Burg': d3 }, W17), 8)
    && unlock.worldOpen(maps, fake({}, [...W17, 8]), 8) && !unlock.worldOpen(maps, fake({}, [...W17, 8, 9]), 9));
  const many = {}; for (let i = 0; i < 64; i++) many[`5-x${i}`] = d3;   // 192 Sterne
  const few = {}; for (let i = 0; i < 63; i++) few[`5-x${i}`] = d3; few['5-y'] = { done: true, stars: [true, false, false] };   // 190 Sterne … dann 189
  const few189 = { ...few, '5-y': { done: true, stars: [false, false, false] }, '5-z': { done: true, stars: [true, false, false] } };
  delete few189['5-x0']; few189['5-w'] = { done: true, stars: [true, true, false] };   // 62·3 + 1 + 2 = 189
  check('8-Burg: Weg erst nach 8-A **und** 8-B frei; dann 190 Sterne nötig (alle Sterne zählen); Sternen-Röhre nach 8-Burg oder sobald Welt 9 entdeckt ist',
    unlock.reason(W8, fake({ '8-A': d3 }), '8-Burg') === 'locked' && unlock.reason(W8, fake({ '8-B': d3 }), '8-Burg') === 'locked'
    && unlock.reason(W8, fake({ ...few189, '8-A': d0, '8-B': d0 }), '8-Burg') === 'stars' && unlock.gateStars(W8, fake({ ...few189, '8-A': d0, '8-B': d0 })) === 189
    && unlock.reason(W8, fake({ ...many, '8-A': d3, '8-B': d3 }), '8-Burg') === null
    && !unlock.pathOpen(W8, fake({}, [...W17, 8]), 'WS') && unlock.pathOpen(W8, fake({ '8-Burg': d3 }, [...W17, 8]), 'WS') && unlock.pathOpen(W8, fake({}, [...W17, 8, 9]), 'WS')
    && unlock.reason(W8, fake({}), '8-1') === null && unlock.reason(W8, fake({}), '8-2') === 'locked');
  // Sternzählung für die Schranke ohne die Welt-8-Sterne: 189 vs. 190
  const g189 = unlock.gateStars(W8, fake({ ...few189 })), g190 = unlock.gateStars(W8, fake({ ...few }));
  check(`Sternschranke zählt alle Sterne (Attrappe: ${g189} bzw. ${g190})`, g189 === 189 && g190 === 190);
}

// ------------------------------------------------------------------ Browser
const PORT = 4290;
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
  await page.screenshot({ path: `${OUT}cmap8_${name}.png`, timeout: 200000 });
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
const PRE = [...W1IDS, ...W2IDS, ...W3IDS, ...W4IDS, ...W5IDS, ...W6IDS, ...W7IDS];
const withAfter = (M) => M.levels.filter((l) => l.after).map((l) => l.id);
const OPENED_1_7 = ['1-2', '1-A', '1-3', '1-Schatz', '1-4', '1-5', '1-Burg', 'W2', ...withAfter(W2), 'W3', ...withAfter(W3), 'W4', ...withAfter(W4), 'W5', ...withAfter(W5),
  'W6', ...withAfter(W6), 'W7', ...withAfter(W7)];
/** Welt 1–7 geschafft (je Level drei Sterne bzw. keine) – 72 Level, 216 Sterne. */
const w1to7 = (stars = true) => { const l = {}; for (const id of PRE) l[id] = lvl(stars); return l; };
/** Welt 1–7 geschafft mit genau n Sternen (über die Level verteilt). */
const w1to7n = (n) => {
  const l = w1to7(false);
  let k = n;
  for (const id of PRE) for (let i = 0; i < 3 && k > 0; i++) { l[id].stars[i] = true; k--; }
  return l;
};
/** Welt-8-Level (ohne Sterne) als geschafft eintragen. */
const with8 = (base, ids) => { const l = { ...base }; for (const id of ids) l[id] = lvl(false); return l; };
/** Welt-8-Schranken, deren Weg mit den geschafften Leveln done frei ist (als geöffnet gemerkt – kein Schwenk). */
const opened8 = (done) => W8.levels.filter((l) => l.after && [].concat(l.after).every((a) => done.includes(a))).map((l) => l.id);
const WORLDS8 = [1, 2, 3, 4, 5, 6, 7, 8];
const EXIT_W7 = exitPoint(W8.entrances.find((e) => e.id === 'W7'));
const P81 = W8.entrances.find((e) => e.id === '8-1').pos;

// Teilläufe (W8_TEIL=1|2|3|4) für langsame Rechner, je unter 10 min; ohne Angabe alle Abschnitte.
//   1: Abschnitte 2–4 (Röhre W8 → Welt 8, Welt-Warp, Start/Titel, erstes Level), 2: 5–7 (Freischaltung, Brücken,
//   Sternschranke, Doppelbedingung), 3: 8–10 (Kulisse im Takt, Welt Stern bald, Beeren-/Glückshaus), 4: 11–14 (befreiter
//   Turm, Bilder, Neuladen, Rückweg nach Welt 7, Anflug)
const TEIL = process.env.W8_TEIL ?? '';
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

// ------------------------------------------------------------------ 2) Glasröhre W8 in Welt 7 → Ankunft in Welt 8
if (part(2)) {
  await loadWith({ levels: w1to7(true), mapOpened: [...OPENED_1_7], world: 7, worlds: [1, 2, 3, 4, 5, 6, 7], coins: 0, mapPos: null });
  await waitMap(7);
  st = await sc(() => window.__courseMap.state());
  check('Welt 7 nach 7-Burg: Glasröhre W8 frei, Ziel „Brummbär-Rummelplatz“ (Karte vorhanden, keine Codeänderung in Welt 7), keine „bald“-Anzeige',
    st.entrances.W8.enterable && st.entrances.W8.title === 'Brummbär-Rummelplatz' && st.gates.W8 === 'open' && !st.entrances.W8.soon);
  const P8 = W7.entrances.find((e) => e.id === 'W8').pos;
  await tp(P8[0], P8[1] + 0.3, P8[2] + 3, -Math.PI / 2, 20);
  r = await walkTo(P8[0], P8[2], (s) => s.onPad === 'W8', 600);
  await shot('w7_roehre8', 600);
  await frames();
  check('Figur steht auf dem Podest der Welt-8-Röhre, Hinweis „ab durch die Glasröhre“', r.s.onPad === 'W8' && (await banner()).includes('Glasröhre'));
  await sc(() => window.__courseMap.setInput({ jump: true }));
  st = await sc(() => window.__courseMap.step(1));
  await sc(() => window.__courseMap.setInput({}));
  check('A auf dem Podest startet die Röhrenfahrt (Abfahrt nach Welt 8, kein „Welt 8 kommt bald!“)', st.travel?.mode === 'depart' && !st.leaving && st.worlds.includes(8)
    && (await toast()) !== 'Welt 8 kommt bald!');
  r = await stepUntil((s) => s.travel?.phase === 'ride' && s.travel.t > 1.6, 600);
  await shot('w7_abfahrt', 400);
  r = await stepUntil(() => false, 600);
  check('Nach der Fahrt verlässt die Karte Welt 7 (Szenenwechsel zu Welt 8)', r.s.leaving === true);
  await waitMap(8);
  st = await sc(() => window.__courseMap.state());
  console.log('  Ankunft', JSON.stringify(st.travel), JSON.stringify(st.player));
  check('Welt 8 geladen, Ankunft durch die Rückweg-Röhre W7 (Figur weit draußen über dem Meer)', st.world === 8 && st.travel?.mode === 'arrive' && st.travel.entrance === 'W7'
    && Math.hypot(st.player.x - EXIT_W7[0], st.player.z - EXIT_W7[2]) > 30);
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
  check('Nach der Ankunft steht die Figur vor der Rückweg-Röhre am Rummel-Eingang', Math.hypot(st.player.x - EXIT_W7[0], st.player.z - EXIT_W7[2]) < 0.8 && st.player.mode === 'ground'
    && Math.abs(st.player.y - 1.5) < 0.05);
  check('Welt 8 gemerkt (offen, aktuelle Welt)', st.worlds.includes(8) && (await sc(() => JSON.parse(localStorage.getItem('lotti-greta-course-v1')).world)) === 8);
  await frames(3);
  check(`HUD: Weltname „Welt 8 · Brummbär-Rummelplatz“, Sterne gesamt ${PRE.length * 3}, Welt 8 hat 43 Sterne`, (await sc(() => window.__courseMap.hud.worldName.text)) === 'Welt 8 · Brummbär-Rummelplatz'
    && st.totalStars === PRE.length * 3 && st.stars === 0 && st.starsMax === 43);
  r = await sc(() => ({ name: window.__courseMap.musicName(), has: !!window.__audio.music.themeInfo('course_world8_map') }));
  check(`Musik der Welt-8-Karte: course_world8_map (vorhanden: ${r.has}), sonst Rückfall course_map (jetzt: ${r.name})`, r.has && r.name === 'course_world8_map');
  await shot('start', 900);
}

// ------------------------------------------------------------------ 3) Welt-Warp aus einem Welt-7-Level landet in Welt 8
if (part(3)) {
  lv = w1to7(true);
  delete lv['7-Burg'];
  await loadWith({ levels: lv, mapOpened: [...OPENED_1_7.filter((id) => id !== 'W8')], world: 7, worlds: [1, 2, 3, 4, 5, 6, 7], mapPos: null }, '&mapAlias=7-1:0-0');
  await waitMap(7);
  const P71 = W7.entrances.find((e) => e.id === '7-1').pos;
  await tp(P71[0], 1.8, P71[2] + 3, Math.PI / 2, 20);
  r = await walkTo(P71[0], P71[2], (s) => s.onPad === '7-1', 900);
  st = await sc(() => { const m = window.__courseMap; m.enter(); m.step(1); return m.state(); });   // im selben Takt (die Szene wechselt danach)
  check('7-1 (Ersatz-Level) gestartet', st.leaving && st.lastStart?.entrance === '7-1');
  await waitCourse();
  // wie map/warp.js (Röhre mit warpWorld: 8): Welt 8 freischalten, Level ohne Zielmast verlassen
  await sc(() => { window.__courseSave.openWorld(8); window.__course.exitToMap({ warpWorld: 8 }); });
  await waitMap(8);
  st = await sc(() => window.__courseMap.state());
  console.log('  Warp-Ankunft', JSON.stringify(st.travel), st.soonWorld);
  check('Welt-Warp nach Welt 8 endet in Welt 8: Ankunft durch die Rückweg-Röhre W7, keine „bald“-Meldung', st.world === 8 && st.travel?.mode === 'arrive' && st.travel.entrance === 'W7'
    && st.soonWorld === null && st.worlds.includes(8));
  r = await stepUntil((s) => s.travel?.t > 1.4, 400);
  await shot('warp_ankunft', 400);
  r = await stepUntil((s) => !s.travel, 900);
  await sc(() => window.__courseMap.step(40));
  st = await sc(() => window.__courseMap.state());
  check('Nach dem Warp: Figur vor der Rückweg-Röhre, 8-1 frei, Röhre zurück nach Welt 7 frei', Math.hypot(st.player.x - EXIT_W7[0], st.player.z - EXIT_W7[2]) < 0.8
    && !st.entrances['8-1'].locked && st.entrances.W7.enterable && !st.cinematic && (await toast()) !== 'Welt 8 kommt bald!');
}

// ------------------------------------------------------------------ 4) Eingänge: Titel bzw. „Bald“, Start-Zustand, erstes Level
if (part(4)) {
  await loadWith({ levels: w1to7(true), mapOpened: [...OPENED_1_7], world: 8, worlds: WORLDS8, mapPos: null });
  await waitMap(8);
  const titles = await sc((ids) => { const out = {}; for (const id of ids) { const s = window.__courseMap.status(id); out[id] = [s.title, s.exists]; } return out; }, W8IDS);
  console.log('  Titel', JSON.stringify(titles));
  check('Eingänge in Welt 8 zeigen den Leveltitel bzw. „Bald“', Object.values(titles).every(([t, ex]) => (ex ? t && t !== 'Bald' : t === 'Bald')));
  st = await sc(() => window.__courseMap.state());
  check('Start in Welt 8: nur 8-1 frei, alle anderen zu, Rückweg-Röhre frei, Sternen-Röhre zu, alle 12 Schranken zu, keine Gegnergruppen',
    !st.entrances['8-1'].locked && W8IDS.filter((id) => id !== '8-1').every((id) => st.entrances[id].locked)
    && st.entrances.W7.enterable && st.entrances.WS.locked && st.entrances.WS.discovered === false && Object.values(st.gates).length === 12
    && Object.values(st.gates).every((g) => g === 'closed') && st.roamers.length === 0);
  await tp(2, 1.8, 40, -Math.PI / 2, 30);
  await shot('eingang', 800);
  await tp(-12, 1.8, 28, -Math.PI / 2, 30);
  await shot('karussell', 800);
  await loadWith({}, '&mapAlias=8-1:0-0');
  await waitMap(8);
  st = await sc(() => window.__courseMap.state());
  check('mapAlias: 8-1 zeigt den Titel des Ersatz-Levels und ist startbar', st.entrances['8-1'].title !== 'Bald' && st.entrances['8-1'].enterable);
  await tp(P81[0], 1.8, P81[2] + 3, Math.PI / 2, 20);
  r = await walkTo(P81[0], P81[2], (s) => s.onPad === '8-1', 900);
  await shot('regenfestung', 700);
  st = await sc(() => { const m = window.__courseMap; m.enter(); m.step(1); return m.state(); });   // im selben Takt (die Szene wechselt danach)
  check('Enter auf dem Podest 8-1 startet das (Ersatz-)Level', st.leaving && st.lastStart?.entrance === '8-1' && st.lastStart?.id === '0-0');
  await waitCourse();
  await sc(() => window.__course.exitToMap({ done: '0-0' }));
  await waitMap(8);
  st = await sc(() => window.__courseMap.state());
  check('Rückkehr aus dem Level: Welt 8, vor der Regenfestung, Ergebnis auf 8-1 übertragen, Schranke zu den Dünen versinkt',
    st.world === 8 && Math.hypot(st.player.x - P81[0], st.player.z - P81[2] - 2.6) < 0.8 && st.entrances['8-1'].done && st.cinematic);
  r = await stepUntil((s) => !s.cinematic, 2400);
  check('Weg zu den Dünen (8-2) offen und frei, 8-3 noch zu', r.s.gates['8-2'] === 'open' && !r.s.entrances['8-2'].locked && r.s.entrances['8-3'].locked);
  // der Rummelsteg zu den Dünen ist begehbar
  await tp(14, 1.8, 10, Math.PI / 2, 20);
  r = await walkTo(34, 10, (s) => s.player.x > 31, 900);
  check('Über den Rummelsteg hinüber zum Dünenplatz (y 2.5)', r.s.player.x > 31 && Math.abs(r.s.player.y - 2.5) < 0.1 && r.s.player.mode === 'ground');
  await tp(40, 2.8, 2, -Math.PI / 2, 20);
  await shot('duenen', 700);
}

// ------------------------------------------------------------------ 5) Freischaltung nacheinander, Doppelbedingung, begehbare Brücken
if (part(5)) {
  // 8-4 geschafft: zwei Schranken (8-5, 8-Haus) versinken nacheinander im Schwenk
  const d4 = ['8-1', '8-2', '8-3', '8-Zug', '8-4'];
  await loadWith({ levels: with8(w1to7(true), d4), mapOpened: [...OPENED_1_7, ...opened8(['8-1', '8-2', '8-3', '8-Zug'])], world: 8, worlds: WORLDS8, mapPos: null });
  await waitMap(8);
  st = await sc(() => window.__courseMap.state());
  check('Nach 8-4: Schwenk zu den frischen Schranken (Seeufer, Haus-Insel)', st.cinematic && st.gates['8-5'] === 'closed' && st.gates['8-Haus'] === 'closed');
  r = await stepUntil((s) => !s.cinematic, 4000);
  st = r.s;
  check('Schwenk endet: Wege zu 8-5 und 8-Haus offen, beide frei; 8-6 noch zu', ['8-5', '8-Haus'].every((id) => st.gates[id] === 'open' && !st.entrances[id].locked)
    && st.entrances['8-6'].locked && st.gates['8-6'] === 'closed');
  await tp(-62, 5.8, -59, -Math.PI / 2, 30);
  await shot('nachtfestung', 700);
  const free = (s2, id) => !s2.entrances[id].locked && s2.entrances[id].pathOpen;
  const shut = (s2, id) => s2.entrances[id].locked && !s2.entrances[id].pathOpen;
  const steps = [
    [[], ['8-1'], ['8-2', '8-3', '8-Zug', '8-4', '8-5', '8-Haus', '8-6', '8-7', '8-A', '8-B', '8-Burg', 'WS']],
    [['8-1'], ['8-2'], ['8-3']],
    [['8-1', '8-2'], ['8-3'], ['8-Zug']],
    [['8-1', '8-2', '8-3'], ['8-Zug'], ['8-4']],
    [['8-1', '8-2', '8-3', '8-Zug'], ['8-4'], ['8-5', '8-Haus']],
    [d4, ['8-5', '8-Haus'], ['8-6']],
    [[...d4, '8-5'], ['8-6'], ['8-7']],
    [[...d4, '8-5', '8-6'], ['8-7'], ['8-A', '8-B']],
    [[...d4, '8-5', '8-6', '8-7'], ['8-A', '8-B'], ['8-Burg', 'WS']],
    [[...d4, '8-5', '8-6', '8-7', '8-A'], [], ['8-Burg', 'WS']],
    [[...d4, '8-5', '8-6', '8-7', '8-B'], [], ['8-Burg', 'WS']],
    [[...d4, '8-5', '8-6', '8-7', '8-A', '8-B'], ['8-Burg'], ['WS']],
  ];
  for (const [done, nowFree, stillShut] of steps) {
    st = await setLevels(with8(w1to7(true), done));
    const label = done.length ? `Nach ${done.slice(-2).join(' + ')}` : 'Ohne Welt-8-Level';
    check(`${label}: ${nowFree.join(', ') || '(nichts Neues)'} frei, ${stillShut.join(', ')} noch zu`, nowFree.every((id) => free(st, id)) && stillShut.every((id) => shut(st, id)));
  }
  st = await setLevels(with8(w1to7(true), [...W8IDS]));
  check('Nach 8-Burg: Weg zur Sternen-Röhre offen, Röhre „Bald“ (Welt Stern gibt es noch nicht) bzw. frei, sobald es ihre Karte gibt',
    st.entrances.WS.pathOpen && !st.entrances.WS.locked && (st.entrances.WS.exists ? st.entrances.WS.enterable : (st.entrances.WS.soon && st.entrances.WS.title === 'Bald')));
  // mit allen geschafften Leveln geladen sind alle Schranken offen; die Brücken sind begehbar
  await loadWith({ levels: with8(w1to7(true), [...W8IDS]), mapOpened: [...OPENED_1_7, ...opened8([...W8IDS])] });
  await waitMap(8);
  st = await sc(() => window.__courseMap.state());
  check('Alle Welt-8-Wege geschafft: alle 12 Schranken offen, alle Eingänge frei', Object.values(st.gates).length === 12 && Object.values(st.gates).every((g) => g === 'open')
    && W8IDS.every((id) => !st.entrances[id].locked));
  const walk = async (from, to, test, label) => {
    await tp(from[0], from[1] + 0.3, from[2], Math.PI / 2, 20);
    const rr = await walkTo(to[0], to[1], test, 1400);
    check(label, test(rr.s));
    return rr;
  };
  await walk([-26, 4.5, -62], [-46, -62], (s) => s.player.x < -44 && Math.abs(s.player.y - 5.5) < 0.1, 'Kettensteg: vom Bahnsteig zur Nacht-Festung (y 5.5)');
  await walk([-56, 5.5, -70], [-56, -86], (s) => s.player.z < -84.5 && Math.abs(s.player.y - 5) < 0.1, 'Kettensteg: von der Nacht-Festung zum Seeufer (y 5)');
  await walk([-28, 6.5, -98], [-10, -98], (s) => s.player.x > -12 && Math.abs(s.player.y - 7.5) < 0.1, 'Basaltbrücke: vom Spukgarten aufs Inferno-Plateau (y 7.5)');
  await walk([0, 7.5, -96], [0, -113], (s) => s.player.z < -111 && Math.abs(s.player.y - 9.5) < 0.1, 'Zugbrücke: vom Inferno-Plateau auf den Turmplatz (y 9.5)');
  await walk([-8, 9.5, -130], [-21, -130], (s) => s.player.x < -19 && Math.abs(s.player.y - 9.5) < 0.1, 'Glasröhre: vom Turmplatz zur Sternen-Röhre (y 9.5)');
  await tp(0, 9.8, -100, Math.PI / 2, 20);
  await shot('zugbruecke', 600);
}

// ------------------------------------------------------------------ 6) Sternschranke 190 (8-A und 8-B geschafft)
if (part(6)) {
  const done7 = ['8-1', '8-2', '8-3', '8-Zug', '8-4', '8-5', '8-6', '8-7', '8-A', '8-B'];
  await loadWith({ levels: with8(w1to7n(189), done7), mapOpened: [...OPENED_1_7, ...opened8(done7)], world: 8, worlds: WORLDS8, mapPos: null });
  await waitMap(8);
  st = await sc(() => window.__courseMap.state());
  check('8-A und 8-B geschafft, 189 Sterne: Weg zum Turmplatz offen, 8-Burg gesperrt (Sterne)', st.gates['8-Burg'] === 'open' && st.entrances['8-Burg'].locked
    && st.entrances['8-Burg'].reason === 'stars' && st.gateStars === 189);
  const PB = W8.entrances.find((e) => e.id === '8-Burg').pos;
  await tp(PB[0], PB[1] + 0.3, PB[2]);
  await shot('turm', 900);
  const b190 = await banner();
  const noStart = !(await sc(() => { const m = window.__courseMap; m.enter(); return m.step(2).leaving; }));
  st = await setLevels(with8(w1to7n(190), done7));
  console.log('  Hinweis:', b190);
  check('Hinweis „Benötigt 190 Sterne (189/190)“ am Turm, Enter startet nichts; mit 190 Sternen frei (zeigt „Bald“, bis es das Level gibt)',
    b190 === 'Benötigt 190 Sterne (189/190)' && noStart && !st.entrances['8-Burg'].locked && st.gateStars === 190 && st.entrances['8-Burg'].enterable === st.entrances['8-Burg'].exists);
}

// ------------------------------------------------------------------ 7) Doppelbedingung im Spiel: nur 8-A geschafft → Turm-Schranke bleibt zu
if (part(7)) {
  const doneA = ['8-1', '8-2', '8-3', '8-Zug', '8-4', '8-5', '8-6', '8-7', '8-A'];
  await loadWith({ levels: with8(w1to7(true), doneA), mapOpened: [...OPENED_1_7, ...opened8(doneA)], world: 8, worlds: WORLDS8, mapPos: null });
  await waitMap(8);
  st = await sc(() => window.__courseMap.state());
  check('Nur 8-A geschafft (8-B offen): Turm-Schranke zu, 8-Burg gesperrt (Weg), kein Schwenk', st.gates['8-Burg'] === 'closed' && st.entrances['8-Burg'].reason === 'locked' && !st.cinematic);
  await tp(0, 7.8, -94, Math.PI / 2, 20);
  r = await walkTo(0, -112, (s) => s.player.z < -110, 700);
  console.log('  vor der Turm-Schranke:', r.s.player.x.toFixed(2), r.s.player.y.toFixed(2), r.s.player.z.toFixed(2));
  check('Die Zugbrücke ist an der Turm-Schranke versperrt (Figur bleibt auf der ansteigenden Brücke vor der Schranke, nicht auf dem Turmplatz)',
    r.s.player.z > -104 && r.s.player.y > 7.4 && r.s.player.y < 8.6);
  await shot('turmschranke', 600);
  // jetzt auch 8-B: beim nächsten Besuch versinkt die Turm-Schranke im Schwenk
  await loadWith({ levels: with8(w1to7(true), [...doneA, '8-B']), mapOpened: [...OPENED_1_7, ...opened8(doneA)], mapPos: null });
  await waitMap(8);
  st = await sc(() => window.__courseMap.state());
  check('8-A und 8-B geschafft: Schwenk zur Turm-Schranke', st.cinematic && st.gates['8-Burg'] === 'closed');
  r = await stepUntil((s) => !s.cinematic, 2400);
  check('Schranke versunken: Turmplatz offen, 8-Burg frei (genug Sterne)', r.s.gates['8-Burg'] === 'open' && !r.s.entrances['8-Burg'].locked);
}

// ------------------------------------------------------------------ 8) Glühbirnen im Takt der Kartenmusik, lebendige Kulisse
if (part(8)) {
  if (!(await sc(() => window.__courseMap?.map.world === 8))) {
    await loadWith({ levels: with8(w1to7(true), [...W8IDS]), mapOpened: [...OPENED_1_7, ...opened8([...W8IDS])], world: 8, worlds: WORLDS8, mapPos: null });
    await waitMap(8);
  }
  await tp(2, 1.8, 40);
  r = await sc(() => {
    const mu = window.__audio.music, m = window.__courseMap;
    const theme = m.musicName();
    mu.setManualClock(true);
    const bpm = mu.beat().bpm, spb = 60 / bpm;
    const B = () => m.state().decor.bulbs;
    const S = () => m.state().decor.spikebridges;
    const b0 = B();
    mu.advanceClock((1 - (b0.beat % 1)) * spb + 0.05 * spb);  // nächste Zählzeit: Gruppe wechselt, Puls hell
    const b1 = B(), s1 = S();
    mu.advanceClock(0.6 * spb);                               // dieselbe Zählzeit, Puls klingt ab
    const b2 = B(), s2 = S();
    mu.advanceClock(0.4 * spb);                               // nächste Zählzeit: nächste Gruppe
    const b3 = B(), s3 = S();
    return { theme, bpm, b0, b1, b2, b3, s1, s2, s3 };
  });
  console.log('  Glühbirnen:', JSON.stringify({ b0: [r.b0.step, r.b0.k], b1: [r.b1.step, r.b1.k], b2: [r.b2.step, r.b2.k], b3: [r.b3.step, r.b3.k], src: r.b1.source, theme: r.b1.theme, bpm: r.bpm, n: r.b0.n }),
    'Stacheln:', JSON.stringify([r.s1, r.s2, r.s3]));
  check(`Glühbirnen folgen der Taktuhr der Kartenmusik (${r.theme}, ${r.bpm} BPM)`, r.b1.theme === r.theme && r.b1.source !== 'zeit' && r.b1.bpm === r.bpm && r.b0.n >= 100);
  check('Je Zählzeit leuchtet eine der drei Gruppen hell auf (Lauflicht): Wechsel am Taktschlag, hell am Anfang der Zählzeit, dann schwächer, nächste Zählzeit die nächste Gruppe',
    r.b1.step === (Math.floor(r.b0.beat) + 1) % 3 && r.b1.k > 0.9 && r.b2.step === r.b1.step && r.b2.k < 0.6 && r.b3.step === (r.b1.step + 1) % 3 && r.b3.k > 0.9);
  check('Stachelbrücken der Regenfestung im Takt: je Zählzeit fahren die Stacheln der anderen Brücke aus',
    r.s1.step === (Math.floor(r.b0.beat) + 1) % 2 && r.s2.step === r.s1.step && r.s2.up > 0.9 && r.s3.step !== r.s1.step);
  await frames(3);
  const shown = await sc(() => window.__courseMap.state().decor.bulbs);
  check('Darstellung folgt: gezeigte Glühbirnen-Gruppe und -Puls = Stellung der Taktuhr', shown.shown?.step === shown.step && Math.abs(shown.shown.k - shown.k) < 1e-3);
  await shot('gluehbirnen', 300, false, 2);
  await sc(() => window.__audio.music.setManualClock(false));
  // Ersatzuhr ohne Musik
  r = await sc(() => {
    const mu = window.__audio.music;
    mu.stop();
    const d = window.__courseMap.state().decor.bulbs;
    const want = mu.themeInfo('course_world8_map')?.bpm ?? mu.themeInfo('course_map')?.bpm;
    const life = window.__courseMap.built.life;
    const a = life.bulbState(10.02), b = life.bulbState(10.02 + 60 / want);
    return { d, want, a, b };
  });
  check('Ohne laufende Musik zählt die Ersatzuhr (Kartenzeit) im Tempo der Welt-8-Kartenmusik, je Zählzeit wechselt die Gruppe',
    r.d.source === 'zeit' && r.d.bpm === r.want && r.a.step !== r.b.step && Math.abs(r.a.k - r.b.k) < 1e-3);
  await sc(() => window.__audio.music.play(window.__courseMap.musicName()));
  // Lebendige Kulisse: Riesenrad, Karussell, Achterbahn, Ballons, Fahnen, Regen, Zug, Leuchtstege, Felsklotz, Schlange …
  r = await sc(() => {
    const m = window.__courseMap;
    const run = (id, t) => { for (const u of m.built.entrances.get(id).updaters) u(0, t); return m.state().decor; };
    const tr1 = run('8-Zug', 2).train.x, tr2 = run('8-Zug', 7).train.x;
    const w1 = run('8-4', 0.3).nightfort.wave, w2 = run('8-4', 1.3).nightfort.wave;
    const k1 = run('8-7', 1).inferno.rock, k2 = run('8-7', 5).inferno.rock;
    const c1 = run('8-3', 1).cookie.angle, c2 = run('8-3', 3).cookie.angle;
    const rn1 = run('8-1', 0.5).rain.cloud, rn2 = run('8-1', 3).rain.cloud;
    const sn1 = run('8-B', 0.6).snaketent.sway, sn2 = run('8-B', 2.6).snaketent.sway;
    const life = m.built.life;
    life.update(0.016, 1); const d1 = m.state().decor;
    const fa = m.view.three.getObjectByName('w8:fahnen').geometry.attributes.position.array[5];
    life.update(0.016, 6); const d2 = m.state().decor;
    const fb = m.view.three.getObjectByName('w8:fahnen').geometry.attributes.position.array[5];
    const names = ['w8:gluehbirnen', 'w8:fahnen', 'w8:turmbanner', 'w8:ballons', 'w8:achterbahn-wagen', 'w8:regen', 'w8:regenwolke', 'w8:stacheln', 'w8:baronexpress', 'w8:dampf',
      'w8:sandflosser', 'w8:luftblasen', 'w8:spukgeister', 'w8:spukfenster', 'w8:goldsterne', 'w8:rosa-schlangenkoenig', 'w8:freundeglas', 'w8:glas-schein', 'w8:hintergrund',
      'w7:lava:rot', 'w7:fontaenen', 'w7:rauch', 'w7:knochenflieger', 'w7:fackelflammen'];
    const found = names.filter((n) => m.view.three.getObjectByName(n));
    return { tr1, tr2, w1, w2, k1, k2, c1, c2, rn1, rn2, sn1, sn2, fa, fb, wheel: [d1.wheel.angle, d2.wheel.angle], car: [d1.carousel.angle, d2.carousel.angle], coaster: [d1.coaster.u, d2.coaster.u],
      d: d2, found, missing: names.filter((n) => !found.includes(n)), models: d2.w8models, heavy: d2.w8heavy };
  });
  console.log('  Kulisse', JSON.stringify({ ...r, d: undefined, models: undefined }));
  check('Lebendige Kulisse: Riesenrad und Karussell drehen sich, Achterbahn-Wägelchen fahren, Fahnen wehen, Baron-Express rangiert, Leuchtstege leuchten als Welle, Felsklotz rollt, Keksrad dreht, Regenwolke wiegt sich, Schlangenkönig wiegt sich',
    r.wheel[1] > r.wheel[0] && r.car[1] > r.car[0] && r.coaster[0] !== r.coaster[1] && Math.abs(r.fa - r.fb) > 1e-3 && Math.abs(r.tr1 - r.tr2) > 1 && r.w1 !== r.w2
    && Math.abs(r.k1 - r.k2) > 1 && Math.abs(r.c1 - r.c2) > 0.5 && Math.abs(r.rn1 - r.rn2) > 0.01 && Math.abs(r.sn1 - r.sn2) > 0.01);
  check(`Kulissen-Objekte vorhanden (${r.found.length}/${r.found.length + r.missing.length}${r.missing.length ? `, fehlt: ${r.missing.join(', ')}` : ''}); Glühbirnen ${r.d.bulbs.n}, Fahnen ${r.d.flags.n}, Banner ${r.d.flags.banners}, Ballons ${r.d.balloons.n}, Achterbahn-Wagen ${r.d.coaster.cars}, Regentropfen ${r.d.rain.drops}`,
    r.missing.length === 0 && r.d.flags.n >= 10 && r.d.flags.banners === 2 && r.d.flags.style === 'baron' && r.d.balloons.n >= 12 && r.d.coaster.cars >= 3 && r.d.rain.drops >= 60
    && r.d.fireworks === null && r.d.finished === false);
  console.log('  Registry-Modelle in der Kulisse:', (r.models ?? []).join(', '), '| zu schwer:', JSON.stringify(r.heavy ?? {}));
  check('Welt-8-Modelle der Registry in der Kulisse (Baron-Turm, Riesenrad, Karussell, Achterbahn, Buden, Ballons, Regenfestung, Keksfabrik, Wasserfestung, Dünen, Leuchtsteg, Spukspiegel, Felsklotz, Sandstatue, Autowrack)',
    ['baron_turm', 'riesenrad_kulisse', 'karussell', 'achterbahn', 'rummel_bude', 'brummbaer_ballon', 'regenfestung', 'keksfabrik', 'wasserfestung', 'duene', 'leuchtsteg',
      'spukspiegel', 'kristall_felsklotz', 'baron_sandstatue', 'autowrack'].every((n) => (r.models ?? []).includes(n)));
}

// ------------------------------------------------------------------ 9) Glasröhre WS „Welt Stern kommt bald“, Welt-Warp nach Welt 9 über den Rückfall
if (part(9)) {
  await loadWith({ levels: with8(w1to7(true), [...W8IDS]), mapOpened: [...OPENED_1_7, ...opened8([...W8IDS])], world: 8, worlds: WORLDS8, mapPos: null });
  await waitMap(8);
  const PS = W8.entrances.find((e) => e.id === 'WS').pos;
  st = await sc(() => window.__courseMap.state());
  const hasStar = st.entrances.WS.exists;
  await tp(PS[0], PS[1] + 0.3, PS[2] + 3, -Math.PI / 2, 20);
  r = await walkTo(PS[0], PS[2], (s) => s.onPad === 'WS', 400);
  await shot('sternroehre', 700);
  if (!hasStar) {
    await sc(() => { const m = window.__courseMap; m.hud.toast('', 0.01); m.step(2); m.enter(); m.step(1); });
    const msg = await toast();
    st = await sc(() => { const m = window.__courseMap; m.setInput({ jump: true }); m.step(1); m.setInput({}); return m.step(5); });
    const sign = await sc(() => window.__courseMap.signOf('WS'));
    check('Sternen-Röhre nach 8-Burg: Weg frei, „Bald“, Enter/A zeigt „Welt Stern kommt bald!“ statt einer Fahrt; Schild „Welt Stern / bald!“', r.s.onPad === 'WS' && msg === 'Welt Stern kommt bald!'
      && !st.travel && !st.leaving && st.entrances.WS.soon && !st.entrances.WS.enterable && st.entrances.WS.discovered === false && sign === 'Welt Stern\nbald!');
    // Warp nach Welt 9 aus einem Welt-8-Level (8-7 noch offen, Turm-Schranke zu): Rückfall – Ankunft in Welt 8 durch die Sternen-Röhre
    const done6 = ['8-1', '8-2', '8-3', '8-Zug', '8-4', '8-5', '8-6'];
    await loadWith({ levels: with8(w1to7(true), done6), mapOpened: [...OPENED_1_7, ...opened8(done6)], world: 8, worlds: WORLDS8, mapPos: null }, '&mapAlias=8-1:0-0');
    await waitMap(8);
    await tp(P81[0], 1.8, P81[2] + 3, Math.PI / 2, 20);
    r = await walkTo(P81[0], P81[2], (s) => s.onPad === '8-1', 900);
    await sc(() => { const m = window.__courseMap; m.enter(); m.step(1); });
    await waitCourse();
    await sc(() => { window.__courseSave.openWorld(9); window.__course.exitToMap({ warpWorld: 9 }); });
    await waitMap(8);
    st = await sc(() => window.__courseMap.state());
    console.log('  Warp 9:', JSON.stringify(st.travel), st.soonWorld, JSON.stringify(st.entrances.WS));
    check('Welt-Warp 9 ohne Karte endet in Welt 8: Ankunft durch die Sternen-Röhre, Röhre entdeckt, Weg frei, „Bald“',
      st.world === 8 && st.travel?.mode === 'arrive' && st.travel.entrance === 'WS' && st.soonWorld === 9 && st.worlds.includes(9)
      && st.entrances.WS.discovered === true && !st.entrances.WS.locked && st.entrances.WS.soon);
    r = await stepUntil((s) => s.travel?.t > 1.4, 400);
    await shot('warp9_ankunft', 400);
    r = await stepUntil((s) => !s.travel, 900);
    const msg9 = await toast();
    st = await sc(() => window.__courseMap.state());
    check('Nach der Ankunft: „Welt Stern kommt bald!“, Schranke zur Sternen-Röhre versinkt (Schwenk)', msg9 === 'Welt Stern kommt bald!' && st.cinematic);
    r = await stepUntil((s) => !s.cinematic, 1800);
    await sc(() => window.__courseMap.step(20));
    st = await sc(() => window.__courseMap.state());
    const exitS = exitPoint(W8.entrances.find((e) => e.id === 'WS'));
    check('Figur steht vor der Sternen-Röhre, Schranke offen', Math.hypot(st.player.x - exitS[0], st.player.z - exitS[2]) < 0.8 && st.gates.WS === 'open' && !st.cinematic);
    await tp(-4, 9.8, -112, Math.PI / 2, 20);
    r = await walkTo(0, -98, (s) => s.player.z > -99, 900);
    check('Vom Turmplatz zurück: Turm-Schranke an der Zugbrücke lässt die Figur von hinten durch', r.s.player.z > -99 && r.s.gates['8-Burg'] === 'closed' && Math.abs(r.s.player.y - 7.5) < 0.1);
  } else {
    await sc(() => { const m = window.__courseMap; m.setInput({ jump: true }); m.step(1); m.setInput({}); });
    st = await sc(() => window.__courseMap.state());
    check('Sternen-Röhre nach 8-Burg: Karte der Welt Stern vorhanden – A startet die Fahrt', st.travel?.mode === 'depart');
  }
}

// ------------------------------------------------------------------ 10) Beerenhaus, Glückshaus
if (part(10)) {
  const d = ['8-1', '8-2', '8-3'];
  await loadWith({ levels: with8(w1to7(true), d), mapOpened: [...OPENED_1_7, ...opened8([...d, '8-Zug'])], world: 8, worlds: WORLDS8, mapPos: null, coins: 0 });
  await waitMap(8);
  st = await sc(() => window.__courseMap.state());
  check('Beerenhaus in Welt 8 bietet ein Power-up an', st.berry === true);
  const H = W8.houses[0];
  await tp(H.item[0], 1.8, H.item[2] + 3, Math.PI / 2, 20);
  r = await walkTo(H.item[0], H.item[2], (s) => !s.berry, 400);
  check('Beerenhaus: Power-up eingepackt', !r.s.berry && !!r.s.carryPower && r.s.player.power === r.s.carryPower);
  await shot('beerenhaus', 800);
  const G = W8.houses[1];
  await sc((p) => { const s = window.__courseSave; s.data.coins = 25; s.save(); const m = window.__courseMap; m.teleport(p[0], 4.8, p[2] + 3, Math.PI / 2); m.step(10); }, G.pad);
  r = await walkTo(G.pad[0], G.pad[2], (s) => s.onSlotPad, 400);
  check('Figur steht auf der Matte vor dem Spielautomaten (Bahnsteig)', r.s.onSlotPad === true);
  await sc(() => { window.__courseMap.slot.force(['coin', 'coin', 'coin']); const m = window.__courseMap; m.setInput({ jump: true }); m.step(1); m.setInput({}); m.step(60); });
  st = await sc(() => window.__courseMap.state());
  check('Glückshaus: A zieht den Hebel, Einsatz 10 bezahlt', st.slot.state === 'spin' && st.coins === 15);
  await shot('glueck', 600);
  st = await sc(() => window.__courseMap.step(420));
  check('3 × Bitcoin: 30 Bitcoins Gewinn (15 → 45)', st.slot.state === 'idle' && st.coins === 45);
}

// ------------------------------------------------------------------ 11) Nach dem Spielende: der Turm ist befreit
if (part(11)) {
  await loadWith({ levels: with8(w1to7(true), [...W8IDS]), mapOpened: [...OPENED_1_7, ...opened8([...W8IDS])], world: 8, worlds: WORLDS8, mapPos: null, finished: true });
  await waitMap(8);
  st = await sc(() => window.__courseMap.state());
  const d = st.decor;
  console.log('  befreit:', JSON.stringify({ flags: d.flags, fireworks: d.fireworks, tower: d.tower, finished: d.finished }));
  r = await sc(() => {
    const m = window.__courseMap;
    const fl = m.view.three.getObjectByName('w8:fahnen'), bn = m.view.three.getObjectByName('w8:turmbanner'), fw = m.view.three.getObjectByName('w8:feuerwerk');
    const friends = ['kruemel', 'flocke', 'hoppel', 'kobold'].map((k) => !!m.view.three.getObjectByName(`w8:freund:${k}`));
    const life = m.built.life;
    const f1 = life.fireworkInfo(0.5), f2 = life.fireworkInfo(1.6);
    return { flagTex: fl?.material.map?.name ?? fl?.material.map?.uuid, herz: fl?.material.map === undefined ? null : fl.material.map.image?.width, bannerHappy: !!bn, fw: !!fw, fwCount: fw?.count, friends, f1, f2 };
  });
  console.log('  ', JSON.stringify(r));
  check('Befreiter Turm: Herz-/Stern-Fahnen statt Brummbär-Fahnen, Feuerwerk über dem Rummel, die vier Freunde vor dem Turm, Glas offen',
    d.finished === true && d.flags.style === 'herz' && d.fireworks?.n >= 5 && r.fw && r.friends.every(Boolean) && d.tower.friends === 4 && d.tower.jar === 'offen');
  const PB = W8.entrances.find((e) => e.id === '8-Burg').pos;
  await tp(PB[0], PB[1] + 0.3, PB[2] + 1, -Math.PI / 2, 40);
  await shot('befreit_turm', 900);
  r = await sc(() => { const m = window.__courseMap; const a = m.state().decor.tower.hop; for (const u of m.built.entrances.get('8-Burg').updaters) u(0, 0.37); return { a, b: m.state().decor.tower.hop }; });
  check('Die Freunde hüpfen (Höhe ändert sich mit der Zeit)', Math.abs(r.a - r.b) > 0.01 || r.b > 0);
  await tp(2, 1.8, 30, -Math.PI / 2, 40);
  await sc(() => window.__courseMap.built.life.update(0.016, 1.3));
  await shot('befreit_rummel', 900);
  // Rückweg ohne Spielende: wieder Brummbär-Fahnen, kein Feuerwerk
  await loadWith({ levels: with8(w1to7(true), [...W8IDS]), mapOpened: [...OPENED_1_7, ...opened8([...W8IDS])], world: 8, worlds: WORLDS8, mapPos: null });
  await waitMap(8);
  st = await sc(() => window.__courseMap.state());
  check('Ohne Spielende: Brummbär-Fahnen, kein Feuerwerk, Glas mit den Freunden oben auf dem Turm', st.decor.flags.style === 'baron' && st.decor.fireworks === null && st.decor.tower.jar === 'gefangen'
    && st.decor.tower.friends === 0);
  // Abspann (Motor: Szene 'Credits') mit dieser Karte: Weltenliste nennt Welt 8 einmal, danach zurück in die befreite Welt 8
  await sc(() => window.__courseMap.scene.start('Credits', { from: '8-Burg' }));
  try { await page.waitForFunction(() => window.__credits && window.__game.scene.isActive('Credits'), null, { timeout: 150000 }); } catch { await fail('Abspann startet nicht.'); }
  r = await sc(() => {
    const c = window.__credits;
    c.setManual?.(true);
    const texts = (c.lines ?? []).map((l) => (Array.isArray(l) ? l[0] : l)).filter((x) => typeof x === 'string');
    return { w8: texts.filter((x) => x.includes('Brummbär-Rummelplatz')).length, finished: c.state().finished };
  });
  console.log('  Abspann:', JSON.stringify(r));
  await sc(() => window.__credits.finish());
  await waitMap(8);
  st = await sc(() => window.__courseMap.state());
  check('Abspann läuft mit der Welt-8-Karte (Welt 8 genau einmal in der Weltenliste, Spielstand „geschafft“), Rückkehr in die befreite Welt 8 mit Pokal',
    r.finished && r.w8 === 1 && st.world === 8 && st.decor.finished === true && st.decor.flags.style === 'herz' && (await sc(() => !!window.__courseMap.hud.trophyShown)));
  await loadWith({ levels: with8(w1to7(true), [...W8IDS]), mapOpened: [...OPENED_1_7, ...opened8([...W8IDS])], world: 8, worlds: WORLDS8, mapPos: null });
  await waitMap(8);
}

// ------------------------------------------------------------------ 12) Bilder der Insel (alle Wege offen, alle Level geschafft) und Neuladen
if (part(12)) {
  if (!(await sc(() => window.__courseMap?.map.world === 8))) {
    await loadWith({ levels: with8(w1to7(true), [...W8IDS]), mapOpened: [...OPENED_1_7, ...opened8([...W8IDS])], world: 8, worlds: WORLDS8, mapPos: null });
    await waitMap(8);
  }
  for (const [name, pos, yaw] of [['keksfabrik', [44, 3.5, -48]], ['bahnhof', [-6, 4.5, -61]], ['haus', [-68, 5, -28]], ['seeufer', [-58, 5, -102]], ['spukhaus', [-31, 6.5, -100]],
    ['inferno', [20, 7.5, -90]], ['zelt_gold', [37, 8, -114]], ['zelt_rosa', [58, 8, -80]], ['turmplatz', [0, 9.5, -116]], ['riesenrad', [-6, 1.5, 9]],
    ['regenfels', [14, 1.5, 9]], ['dunenstatue', [46, 2.5, -4]]]) {
    await tp(pos[0], pos[1] + 0.3, pos[2], yaw ?? -Math.PI / 2, 30);
    await shot(name, 300);
  }
  await sc(() => { const m = window.__courseMap; m.teleport(4, 1.8, 40, Math.PI / 2); m.step(30); m.rememberPos(); });
  await page.reload({ waitUntil: 'load' });
  await waitMap();
  st = await sc(() => window.__courseMap.state());
  check('Nach Neuladen: wieder Welt 8 an der gemerkten Stelle', st.world === 8 && Math.hypot(st.player.x - 4, st.player.z - 40) < 0.8);
}

// ------------------------------------------------------------------ 13) Rückweg nach Welt 7
if (part(13)) {
  if (!(await sc(() => window.__courseMap?.map.world === 8))) { await loadWith({ levels: w1to7(true), mapOpened: [...OPENED_1_7], world: 8, worlds: WORLDS8, mapPos: null }); await waitMap(8); }
  const W7E = W8.entrances.find((e) => e.id === 'W7').pos;
  await tp(W7E[0], 1.8, W7E[2] + 3, Math.PI / 2, 20);
  r = await walkTo(W7E[0], W7E[2], (s) => s.onPad === 'W7', 400);
  await sc(() => { const m = window.__courseMap; m.setInput({ jump: true }); m.step(1); m.setInput({}); });
  st = await sc(() => window.__courseMap.state());
  check('Rückweg-Röhre in Welt 8 startet die Fahrt nach Welt 7', r.s.onPad === 'W7' && st.travel?.mode === 'depart');
  await shot('abfahrt_w7', 300);
  r = await stepUntil(() => false, 900);
  await waitMap(7);
  st = await sc(() => window.__courseMap.state());
  check('Welt 7: Ankunft durch die Welt-8-Röhre (vom Rummelplatz her)', st.world === 7 && st.travel?.mode === 'arrive' && st.travel.entrance === 'W8');
  await shot('w7_ankunft', 300);
  r = await stepUntil((s) => !s.travel, 900);
  await sc(() => window.__courseMap.step(40));
  st = await sc(() => window.__courseMap.state());
  const ex8 = exitPoint(W7.entrances.find((e) => e.id === 'W8'));
  check('Zurück in Welt 7 vor der Glasröhre nach Welt 8 (Röhren-Insel), Röhre frei mit Ziel „Brummbär-Rummelplatz“',
    st.world === 7 && Math.hypot(st.player.x - ex8[0], st.player.z - ex8[2]) < 0.8 && st.entrances.W8.enterable && st.entrances.W8.title === 'Brummbär-Rummelplatz');
  await shot('w7_roehre8_zurueck', 600);
}

// ------------------------------------------------------------------ 14) Anflug (Welt 8 betreten) und Kennzahlen
if (part(14)) {
  await loadWith({ levels: w1to7(true), mapOpened: [...OPENED_1_7], world: 8, worlds: WORLDS8, mapPos: null });
  try { await page.waitForFunction(() => window.__courseMap && window.__courseMap.intro && window.__courseMap.map.world === 8, null, { timeout: 150000 }); } catch { /* ohne Anflug */ }
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}cmap8_anflug.png`, timeout: 200000 });
  { const s = await sc(() => window.__courseMap?.intro ? window.__courseMap.stats() : null); if (s) stats.push(['anflug', s.calls, s.triangles, 8]); }
  check('Anflug beim Betreten von Welt 8 läuft', stats.some(([n]) => n === 'anflug'));
  await waitMap(8);
}

console.log(`  — Ende (${Math.round((Date.now() - T0) / 1000)} s)`);
const sst = await sc(() => window.__courseMap.map.world === 8 ? window.__courseMap.stats() : null);
if (sst) console.log(`\n  Statische Kulisse Welt 8: ${sst.staticMeshes} Kachel-Meshes, ${Math.round(sst.staticTriangles / 1000)} k Dreiecke, ${sst.shapes} Kollisionsformen`);
console.log('  Kennzahlen je Bild (Zeichenaufrufe inkl. Schattenpass, Dreiecke):');
for (const [n, c, t, w] of stats) console.log(`    ${n.padEnd(20)} ${String(c).padStart(4)} Aufrufe  ${String(Math.round(t / 1000)).padStart(4)} k Dreiecke  (Welt ${w})`);
for (const w of [8, 7]) {
  const ws = stats.filter(([, , , ww]) => ww === w);
  if (!ws.length) continue;
  const maxCalls = Math.max(...ws.map((s) => s[1])), maxTris = Math.max(...ws.map((s) => s[2]));
  check(`Kennzahlen Welt ${w}: Zeichenaufrufe < 120 (max ${maxCalls}), Dreiecke < 300 k (max ${Math.round(maxTris / 1000)} k)`, maxCalls < 120 && maxTris < 300000);
}

await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
