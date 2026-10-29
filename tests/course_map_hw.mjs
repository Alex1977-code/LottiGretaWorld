// Halloween-Welt „Kürbisinsel“ (Welt 31, Präfix H) der Kurs-Karte (Präzisierung Mehrwelten-Karte, Halloween-Notiz):
//   Weltdaten (Ids/Reihenfolge/Sterne laut Vertrag „Halloween-Welt – Level-Liste“, Schranken riegeln ab, Röhren HW/W1,
//   Welt 1 sonst unverändert) – Node; Röhre HW in Welt 1 nahe der Ankunft (immer frei) → Fahrt → Ankunft in Welt 31 an der
//   Rückweg-Röhre W1, Rückweg nach Welt 1; Präfix-Mechanik (worldOfLevel, starsInWorld(31), Weltenliste numerisch, alte
//   Speicherstände); Eingänge zeigen „Bald“, solange Level fehlen (mapAlias startet ein Ersatz-Level); Freischalt-Kette laut
//   Tabelle (gesetzte Speicherstände); Laternen flackern im Takt der Kartenmusik (Taktuhr, manuell vorgespult) bzw. der
//   Ersatzuhr; lebendige Kulisse (Fledermäuse, Nebel, Geist, Kessel, Vogelscheuche); Kennzahlen (< 120 Zeichenaufrufe,
//   < 300 k Dreiecke an jeder Ansicht inkl. Ankunft und Anflug); keine Konsolenfehler.
// Simulation deterministisch über window.__courseMap.step(n)/setInput; Bilder tests/out/cmaphw_*.png zur Sichtprüfung.
// Aufruf: npm run build && node tests/course_map_hw.mjs   (Teilläufe: HW_TEIL=1, 2, 3, 4 – s. u.; PORT_BASE verschiebt den Port)
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';
import { MAP as W31 } from '../src/course/map/worlds/w31.js';
import { MAP as W1 } from '../src/course/map/worlds/w1.js';
import { buildWalkGrid, reachable, gateRects, gateSides, exitPoint } from '../src/course/map/layout.js';
import * as unlock from '../src/course/map/unlock.js';

const { check, summary } = makeChecker();
const HIDS = ['H-1', 'H-2', 'H-Kapitän', 'H-3', 'H-4', 'H-Burg'];
const W1IDS = ['1-1', '1-2', '1-A', '1-3', '1-Schatz', '1-4', '1-5', '1-Burg'];

// ------------------------------------------------------------------ 1) Weltdaten und Logik (Node)
{
  const grid = buildWalkGrid(W31);
  const order = W31.levels.map((l) => l.id);
  const after = Object.fromEntries(W31.levels.map((l) => [l.id, [].concat(l.after ?? [])]));
  let ok = true;
  const open = new Set();
  for (let i = 0; i <= order.length; i++) {
    const done = new Set(order.slice(0, i));
    for (const id of order) if (after[id].every((a) => done.has(a))) open.add(id);
    const r = reachable(W31, grid, open).ids.sort();
    const want = order.filter((id) => open.has(id)).sort();
    if (r.join() !== want.join()) { ok = false; console.log('   erreichbar', r.join(), 'erwartet', want.join()); }
  }
  check('Welt 31: jede Schranke riegelt ihren Bereich vollständig ab', ok);
  const gr = gateRects(W31, grid);
  check('Welt 31: 5 Schranken (je 4 m breit), jede mit Rückseite', gr.length === 5 && gr.every((g) => Math.abs(g.width - 4) < 0.01) && gateSides(W31, grid).every((g) => g.back !== 0));
  check('Welt 31: Weltnummer 31, Präfix H, immer offen, Name „Halloween · Kürbisinsel“, Musik course_halloween_map (Rückfall course_map), Thema map_halloween',
    W31.world === 31 && W31.prefix === 'H' && W31.alwaysOpen === true && `${W31.worldLabel} · ${W31.title}` === 'Halloween · Kürbisinsel'
    && W31.music === 'course_halloween_map' && W31.fallbackMusic === 'course_map' && W31.theme === 'map_halloween' && W31.kit === 'halloween');
  const rule = (id) => W31.levels.find((l) => l.id === id);
  check('Welt 31: Ids und Reihenfolge der Halloween-Liste', W31.levels.filter((l) => !l.next).map((l) => l.id).join() === HIDS.join());
  check('Welt 31: Freischaltung laut Tabelle (H-1 frei, H-2 nach H-1, H-Kapitän und H-3 nach H-2, H-4 nach H-3, H-Burg nach H-4, kein Sternbedarf)',
    !rule('H-1').after && rule('H-2').after === 'H-1' && rule('H-Kapitän').after === 'H-2' && rule('H-3').after === 'H-2'
    && rule('H-4').after === 'H-3' && rule('H-Burg').after === 'H-4' && HIDS.every((id) => !rule(id).minStars));
  check('Welt 31: 18 Sterne (je 3), 5 Stempel (alle außer H-Kapitän)', HIDS.every((id) => rule(id).stars === 3) && unlock.worldStarsMax(W31) === 18
    && HIDS.filter((id) => rule(id).stamp).join() === 'H-1,H-2,H-3,H-4,H-Burg');
  check('Welt 31: Rückweg-Röhre W1 (Welt 1, immer frei)', rule('W1').next === 1 && rule('W1').world === 1 && !rule('W1').after);
  check('Welt 31: Kulissen-Arten (Kürbisfeld, Gruseldorf, Kürbislabyrinth, Nebelfriedhof, Hexenturm, Gruselschloss)',
    HIDS.map((id) => W31.entrances.find((e) => e.id === id)?.kind).join() === 'pumpkinfield,spookvillage,pumpkinmaze,foggraveyard,witchtower,spookcastle'
    && W31.levels.every((l) => W31.entrances.some((e) => e.id === l.id)));
  check('Welt 31: Eingänge und Ausgänge liegen auf begehbarem Gelände', W31.entrances.every((e) => grid.isWalk(e.pos[0], e.pos[2]) && grid.isWalk(exitPoint(e)[0], exitPoint(e)[2])));
  check('Welt 31: Stege, Fledermäuse, Nebel, Laternen am Weg', W31.segments.filter((s) => s.type === 'hwbridge').length === 5 && W31.bats.length >= 3
    && W31.props.filter((p) => p.kind === 'hwlantern').length >= 10);
  // Welt 1: Röhre HW nahe der Ankunft, immer frei, sonst unverändert
  const g1 = buildWalkGrid(W1);
  const hw = W1.levels.find((l) => l.id === 'HW'), hwe = W1.entrances.find((e) => e.id === 'HW');
  check('Welt 1: Glasröhre HW (Welt 31, ohne Vorgänger, ohne Schranke), geschmückt, Schild „Halloween!“', hw?.next === 31 && hw.world === 31 && !hw.after
    && hwe?.kind === 'pipe' && hwe.dress === 'halloween' && hwe.ownSign === 'Halloween!' && !(W1.gates ?? []).some((g) => g.for === 'HW'));
  check('Welt 1: HW nahe der Ankunft (< 25 m vom Startpunkt) und von dort bei geschlossenen Schranken erreichbar',
    Math.hypot(hwe.pos[0] - W1.spawn.pos[0], hwe.pos[2] - W1.spawn.pos[2]) < 25 && reachable(W1, g1, new Set()).ids.sort().join() === '1-1,HW');
  check('Welt 1: alle übrigen Eingänge, Schranken und Sterne wie bisher (8 Schranken, 24 Sterne)', gateRects(W1, g1).length === 8
    && W1IDS.every((id) => W1.levels.some((l) => l.id === id)) && unlock.worldStarsMax(W1) === 24 && W1.levels.find((l) => l.id === 'W2')?.after === '1-Burg');
  check('Welt 1: Kürbisinsel als Nachbarwelt am Ende der Halloween-Röhre', W1.neighbors.some((n) => n.world === 31 && n.style === 'halloween'));
  const fake = (levels, worlds = [1]) => ({
    peek: (id) => levels[id] ?? null, starsInWorld: (w) => Object.entries(levels).filter(([k]) => k.startsWith(`${w}-`) || (w === 31 && k.startsWith('H-'))).reduce((n, [, l]) => n + l.stars.filter(Boolean).length, 0),
    totalStars: () => Object.values(levels).reduce((n, l) => n + l.stars.filter(Boolean).length, 0), worldOpened: (n) => worlds.includes(n),
  });
  const maps = (n) => ({ 1: W1, 31: W31 }[n] ?? null);
  check('worldOpen: Welt 31 immer offen (neuer Spielstand), Röhre HW frei, Halloween-Eingang H-1 frei',
    unlock.worldOpen(maps, fake({}), 31) && unlock.reason(W1, fake({}), 'HW') === null && unlock.pathOpen(W1, fake({}), 'HW') && unlock.reason(W31, fake({}), 'H-1') === null);
  const d3 = { done: true, stars: [true, true, true] };
  check('Freischaltung (Logik): H-2 erst nach H-1, H-Burg erst nach H-4; Sterne der Welt 31 aus H-Ids',
    unlock.reason(W31, fake({}), 'H-2') === 'locked' && unlock.reason(W31, fake({ 'H-1': d3 }), 'H-2') === null
    && unlock.reason(W31, fake({ 'H-1': d3, 'H-2': d3, 'H-3': d3 }), 'H-Burg') === 'locked' && unlock.reason(W31, fake({ 'H-4': d3 }), 'H-Burg') === null
    && unlock.worldStars(W31, fake({ 'H-1': d3, '1-1': d3 })) === 3);
}

// ------------------------------------------------------------------ Browser
const PORT = 4260;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser({ hasTouch: true });
page.setDefaultNavigationTimeout(200000);
page.setDefaultTimeout(200000);
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const fail = async (msg) => { console.log(msg); for (const e of errors) console.log('  ', e); await browser.close(); stop(); process.exit(1); };
const stats = [];
/** Screenshot nach mindestens 3 neuen Bildern (Software-Renderer), Kennzahlen merken. */
async function shot(name, wait = 500, snap = true, nFrames = null) {
  if (snap) await sc(() => window.__courseMap?.snapCamera());
  const f0 = await sc(() => window.__courseMap?.view?.frame ?? 0);
  await page.waitForFunction(([f, k]) => (window.__courseMap?.view?.frame ?? 0) >= f + k, [f0, nFrames ?? (snap ? 3 : 10)], { timeout: 150000 }).catch(() => {});
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__courseMap?.stats());
  if (s) stats.push([name, s.calls, s.triangles, await sc(() => window.__courseMap?.map.world)]);
  await page.screenshot({ path: `${OUT}cmaphw_${name}.png`, timeout: 200000 });
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
async function loadWith(data, url = '', replace = false) {
  await sc(([d, rp]) => {
    const s = window.__courseSave;
    if (rp) localStorage.setItem('lotti-greta-course-v1', JSON.stringify(d));
    else { s.data = { ...s.data, ...d }; s.save(); }
    if (window.__courseMap) window.__courseMap.leaving = true;   // kein Merken der Lage beim Entladen
  }, [data, replace]);
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
/** H-Level (ohne Sterne) als geschafft eintragen. */
const withH = (ids, stars = false) => { const l = {}; for (const id of ids) l[id] = lvl(stars); return l; };
/** Schranken der Welt 31, deren Weg mit den geschafften Leveln frei ist (als geöffnet gemerkt – kein Schwenk). */
const openedH = (done) => W31.levels.filter((l) => l.after && [].concat(l.after).every((a) => done.includes(a))).map((l) => l.id);
const setLevels = (levels) => sc((l) => {
  const s = window.__courseSave, m = window.__courseMap;
  s.data.levels = l; s.save();
  m.computeStatuses();
  const st = m.state();
  for (const id of Object.keys(st.entrances)) st.entrances[id].pathOpen = m.status(id).pathOpen;
  return st;
}, levels);

// Teilläufe (HW_TEIL=1|2|3|4) für langsame Rechner, je unter 10 min (auch unter hoher Rechnerlast); ohne Angabe alle
// Abschnitte. 1: Abschnitte 2–4 (Röhre HW → Welt 31 → zurück, Präfix/Speicherstand), 2: 5–7 (Eingänge „Bald“,
// Freischalt-Kette, Laternen im Takt, lebendige Kulisse), 3: 8 (Bilder/Kennzahlen aller Bereiche), 4: 9–10 (Anflug,
// Welt 1 an der Röhre)
const TEIL = process.env.HW_TEIL ?? '';
const PARTS = { 1: [2, 4], 2: [5, 7], 3: [8, 8], 4: [9, 10] };
const T0 = Date.now();
const part = (n) => { const on = !PARTS[TEIL] || (n >= PARTS[TEIL][0] && n <= PARTS[TEIL][1]); if (on) console.log(`  — Abschnitt ${n} (${Math.round((Date.now() - T0) / 1000)} s)`); return on; };
let st, r;
await page.goto(`http://localhost:${port}/?map=1&scale=2&adapt=0`, { waitUntil: 'load' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'load' });
await waitMap();

// ------------------------------------------------------------------ 2) Welt 1 (neuer Spielstand): Röhre HW → Kürbisinsel
if (part(2)) {
  await sc(() => { if (window.__courseMap) window.__courseMap.leaving = true; localStorage.clear(); });
  await page.reload({ waitUntil: 'load' });
  await waitMap(1);
  st = await sc(() => window.__courseMap.state());
  const free = Object.entries(st.entrances).filter(([, e]) => !e.locked).map(([id]) => id).sort().join();
  check('Neuer Spielstand in Welt 1: frei sind nur 1-1 und die Halloween-Röhre HW (Ziel „Kürbisinsel“), alle Schranken zu',
    free === '1-1,HW' && st.entrances.HW.enterable && st.entrances.HW.title === 'Kürbisinsel' && Object.values(st.gates).every((g) => g === 'closed') && st.starsMax === 24);
  await tp(2, 1.3, 40.5, Math.PI / 2, 20);
  await shot('w1_start', 600);
  r = await walkTo(14.5, 41.5, (s) => Math.hypot(s.player.x - 14.5, s.player.z - 41.5) < 0.5, 900);   // am Teich vorbei (Strand)
  r = await walkTo(21.5, 34, (s) => s.onPad === 'HW', 900);
  await sc(() => window.__courseMap.step(20));
  await shot('w1_roehre', 600);
  check('Vom Startpunkt zur Röhre HW gelaufen: Figur auf dem Podest, Hinweis „ab durch die Glasröhre“', r.s.onPad === 'HW' && (await banner()).includes('Glasröhre'));
  await sc(() => window.__courseMap.setInput({ jump: true }));
  st = await sc(() => window.__courseMap.step(1));
  await sc(() => window.__courseMap.setInput({}));
  check('A auf dem Podest startet die Röhrenfahrt zur Kürbisinsel („Auf zur Kürbisinsel!“)', st.travel?.mode === 'depart' && !st.leaving && st.worlds.includes(31) && (await toast()) === 'Auf zur Kürbisinsel!');
  r = await stepUntil((s) => s.travel?.phase === 'ride' && s.travel.t > 1.6, 600);
  await shot('w1_abfahrt', 400);
  r = await stepUntil(() => false, 600);
  check('Nach der Fahrt verlässt die Karte Welt 1 (Szenenwechsel zu Welt 31)', r.s.leaving === true);
  await waitMap(31);
  st = await sc(() => window.__courseMap.state());
  console.log('  Ankunft', JSON.stringify(st.travel), JSON.stringify(st.player));
  check('Welt 31 geladen, Ankunft durch die Rückweg-Röhre W1 (Figur weit draußen über dem Meer)', st.world === 31 && st.travel?.mode === 'arrive' && st.travel.entrance === 'W1'
    && Math.hypot(st.player.x + 16, st.player.z - 38.6) > 30);
  await shot('ankunft_weit', 300);
  r = await stepUntil((s) => s.travel?.t > 1.4, 400);
  await shot('ankunft', 400);
  r = await stepUntil((s) => s.travel?.t > 2.6, 400);
  await shot('ankunft_nah', 300);
  r = await stepUntil((s) => !s.travel, 900);
  await sc(() => window.__courseMap.step(40));
  st = await sc(() => window.__courseMap.state());
  console.log('  angekommen', JSON.stringify(st.player));
  check('Nach der Ankunft steht die Figur vor der Rückweg-Röhre in der Ankunftsbucht', Math.hypot(st.player.x + 16, st.player.z - 38.6) < 0.8 && st.player.mode === 'ground' && Math.abs(st.player.y - 1) < 0.05);
  check('Welt 31 gemerkt (offen, aktuelle Welt)', st.worlds.includes(31) && (await sc(() => JSON.parse(localStorage.getItem('lotti-greta-course-v1')).world)) === 31);
  await frames(3);
  check('HUD: Weltname „Halloween · Kürbisinsel“, Welt 31 hat 18 Sterne (0 gesammelt)', (await sc(() => window.__courseMap.hud.worldName.text)) === 'Halloween · Kürbisinsel'
    && st.stars === 0 && st.starsMax === 18 && (await sc(() => window.__courseMap.hud.starText.text)) === '0/18');
  const mus = await sc(() => ({ name: window.__courseMap.musicName(), has: window.__audio.music.listThemes().includes('course_halloween_map') }));
  check(`Kartenmusik: course_halloween_map${mus.has ? '' : ' fehlt noch → Rückfall course_map ohne Fehler'}`, mus.name === (mus.has ? 'course_halloween_map' : 'course_map'));
  st = await sc(() => window.__courseMap.state());
  check('Start in Welt 31: H-1 und Rückweg-Röhre frei, alle anderen zu, alle Schranken zu', !st.entrances['H-1'].locked && st.entrances.W1.enterable
    && HIDS.slice(1).every((id) => st.entrances[id].locked) && Object.values(st.gates).every((g) => g === 'closed') && Object.keys(st.gates).length === 5);
  await shot('start', 800);
}

// ------------------------------------------------------------------ 3) Rückweg nach Welt 1, Neuladen
if (part(3)) {
  if (!(await sc(() => window.__courseMap?.map.world === 31))) { await loadWith({ world: 31, worlds: [1, 31], mapPos: null }); await waitMap(31); }
  await tp(-16, 1.3, 39.5, Math.PI / 2, 20);
  r = await walkTo(-16, 36, (s) => s.onPad === 'W1', 400);
  await sc(() => { const m = window.__courseMap; m.setInput({ jump: true }); m.step(1); m.setInput({}); });
  st = await sc(() => window.__courseMap.state());
  check('Rückweg-Röhre W1 startet die Fahrt nach Welt 1', r.s.onPad === 'W1' && st.travel?.mode === 'depart');
  r = await stepUntil(() => false, 900);
  await waitMap(1);
  st = await sc(() => window.__courseMap.state());
  check('Welt 1: Ankunft durch die Halloween-Röhre HW', st.world === 1 && st.travel?.mode === 'arrive' && st.travel.entrance === 'HW');
  await shot('w1_ankunft', 300);
  r = await stepUntil((s) => !s.travel, 900);
  await sc(() => window.__courseMap.step(40));
  st = await sc(() => window.__courseMap.state());
  check('Zurück in Welt 1 vor der Halloween-Röhre, Röhre weiter frei mit Ziel „Kürbisinsel“', st.world === 1 && Math.hypot(st.player.x - 21.5, st.player.z - 36.6) < 0.8
    && st.entrances.HW.enterable && st.entrances.HW.title === 'Kürbisinsel');
  await sc(() => window.__courseMap.rememberPos());
  await page.reload({ waitUntil: 'load' });
  await waitMap();
  st = await sc(() => window.__courseMap.state());
  check('Nach Neuladen: wieder Welt 1 an der Halloween-Röhre', st.world === 1 && Math.hypot(st.player.x - 21.5, st.player.z - 36.6) < 0.8);
}

// ------------------------------------------------------------------ 4) Präfix-Mechanik und Speicherstand-Kompatibilität
if (part(4)) {
  // alter Stand (vor der Halloween-Welt): ohne worlds/31, ohne neue Felder, Welten 1–5 gespielt
  const old = { version: 1, hero: 'greta', lives: 4, coins: 12, world: 5, mapPos: { world: 5, pos: [2, 1, 46], yaw: 1.5 }, levels: { '1-1': lvl(true), '5-1': lvl(true) }, worlds: [1, 2, 3, 4, 5], mapOpened: [] };
  await loadWith(old, '', true);
  await waitMap(5);
  st = await sc(() => window.__courseMap.state());
  check('Alter Speicherstand ohne Welt 31 lädt fehlerfrei (Welt 5, Sterne gezählt, Welt 31 nicht in worlds)', st.world === 5 && st.totalStars === 6 && !st.worlds.includes(31));
  r = await sc(() => {
    const s = window.__courseSave, m = window.__courseMap;
    s.data.levels['H-1'] = { done: true, stars: [true, false, true], stamp: true, bestTime: null, bestPole: 0 };
    s.data.levels['H-Burg'] = { done: true, stars: [true, false, false], stamp: false, bestTime: null, bestPole: 0 };
    return {
      w: ['H-1', 'H-Kapitän', 'H-Burg', '3-2', '12-1', 'X-1'].map((id) => m.worldOfLevel(id)), s31: s.starsInWorld(31), s3: s.starsInWorld(3), s1: s.starsInWorld(1),
      total: s.totalStars(), list: m.worldList(), unl: s.unlocked('H-Burg', ['H-4', 'H-Burg']), unl2: s.unlocked('H-2', ['H-1', 'H-2'], 3), unl3: s.unlocked('H-2', ['H-1', 'H-2'], 4),
    };
  });
  console.log('  Präfix', JSON.stringify(r));
  check('worldOfLevel: H-1/H-Kapitän/H-Burg → 31 (Präfix-Tabelle aus MAP.prefix), Zahl-Ids wie bisher, Unbekanntes → null',
    r.w.join() === '31,31,31,3,12,' && r.w[5] === null);
  check('Sternzählung: starsInWorld(31) zählt H-Ids (3), Welt 1/3 unberührt', r.s31 === 3 && r.s1 === 3 && r.s3 === 0 && r.total === 9);
  check('Freischaltung im Speicherstand (unlocked mit Präfix): H-Burg braucht H-4, minStars zählt Sterne der Welt 31', !r.unl && r.unl2 && !r.unl3);
  check('Weltenliste numerisch sortiert (1–8, dann 31)', r.list.join() === '1,2,3,4,5,6,7,8,31');
  // gespeicherte Welt 31 ohne Eintrag in worlds → immer offen
  await loadWith({ version: 1, hero: 'lotti', lives: 5, coins: 0, world: 31, worlds: [1], levels: {}, mapPos: null }, '', true);
  await waitMap();
  st = await sc(() => window.__courseMap.state());
  check('Gespeicherte Welt 31 ohne Eintrag in worlds: Karte zeigt trotzdem Welt 31 (immer offen)', st.world === 31 && !st.entrances['H-1'].locked);
  // Rückkehr aus einem H-Level landet in Welt 31 (Welt aus dem Präfix der Id)
  await loadWith({ version: 1, hero: 'lotti', lives: 5, coins: 0, world: 1, worlds: [1], levels: {}, mapPos: null }, '&mapAlias=H-1:0-0', true);
  await waitMap(1);
  await sc(() => window.__courseMap.scene.start('CourseMap', { from: 'H-1' }));
  await waitMap(31);
  st = await sc(() => window.__courseMap.state());
  check('Rückkehr aus H-1 (from: „H-1“) zeigt Welt 31 vor dem Kürbisfeld', st.world === 31 && Math.hypot(st.player.x - 18, st.player.z - 35.6) < 0.8);
}

// ------------------------------------------------------------------ 5) Eingänge zeigen „Bald“, Ersatz-Level, erstes Level
if (part(5)) {
  await loadWith({ version: 1, hero: 'lotti', lives: 5, coins: 0, world: 31, worlds: [1, 31], levels: {}, mapOpened: [], mapPos: null }, '', true);
  await waitMap(31);
  const titles = await sc((ids) => { const out = {}; for (const id of ids) { const s = window.__courseMap.status(id); out[id] = [s.title, s.exists, s.soon, s.enterable]; } return out; }, HIDS);
  console.log('  Titel', JSON.stringify(titles));
  check('Eingänge der Kürbisinsel zeigen den Leveltitel bzw. „Bald“ (solange es das Level nicht gibt)', Object.values(titles).every(([t, ex]) => (ex ? t && t !== 'Bald' : t === 'Bald')));
  const h1 = titles['H-1'];
  await tp(18, 1.3, 36.6, Math.PI / 2, 20);
  r = await walkTo(18, 33, (s) => s.onPad === 'H-1', 400);
  await sc(() => window.__courseMap.step(30));
  if (!h1[1]) {
    await sc(() => { const m = window.__courseMap; m.hud.toast('', 0.01); m.step(2); m.enter(); m.step(1); });
    const msg = await toast();
    st = await sc(() => window.__courseMap.step(20));
    await frames(3);
    const bn = await banner();
    check('H-1 frei, aber „Bald“: Enter zeigt „Bald!“ und startet nichts', r.s.onPad === 'H-1' && h1[2] && !h1[3] && msg === 'Bald!' && !st.leaving && bn === 'Bald');
  } else check('H-1 gibt es schon: Eingang startbar', h1[3]);
  await shot('feld', 600);
  // Ersatz-Level über mapAlias: startbar, Rückkehr mit Ergebnis → Schranke zum Gruseldorf versinkt
  await loadWith({}, '&mapAlias=H-1:0-0');
  await waitMap(31);
  st = await sc(() => window.__courseMap.state());
  check('mapAlias: H-1 zeigt den Titel des Ersatz-Levels und ist startbar', st.entrances['H-1'].title !== 'Bald' && st.entrances['H-1'].enterable);
  await tp(18, 1.3, 36, Math.PI / 2, 20);
  r = await walkTo(18, 33, (s) => s.onPad === 'H-1', 400);
  await sc(() => { const m = window.__courseMap; m.enter(); m.step(1); });
  st = await sc(() => window.__courseMap.state());
  check('Enter auf dem Podest H-1 startet das (Ersatz-)Level', st.leaving && st.lastStart?.entrance === 'H-1' && st.lastStart?.id === '0-0');
  await waitCourse();
  await sc(() => { const rt = window.__course.level.runtime; rt.collectStar(0); rt.collectStar(1); rt.collectStamp(); rt.reachGoal(0.6); rt.finish(); });
  await page.waitForFunction(() => window.__game.scene.isActive('CourseResult'), null, { timeout: 30000 }).catch(() => {});
  await sc(() => window.__course.exitToMap({ done: '0-0' }));
  await waitMap(31);
  st = await sc(() => window.__courseMap.state());
  check('Rückkehr aus dem Level: Welt 31, vor dem Kürbisfeld, Ergebnis auf H-1 übertragen (2 Sterne, Stempel), Schwenk zur Schranke',
    st.world === 31 && Math.hypot(st.player.x - 18, st.player.z - 35.6) < 0.8 && st.entrances['H-1'].done && st.stars === 2 && st.entrances['H-1'].stamp && st.cinematic);
  r = await stepUntil((s) => !s.cinematic, 1800);
  check('Steg zum Gruseldorf offen, H-2 frei, H-Kapitän/H-3 noch zu', r.s.gates['H-2'] === 'open' && !r.s.entrances['H-2'].locked && r.s.entrances['H-Kapitän'].locked && r.s.entrances['H-3'].locked);
  await tp(-4, 1.3, 27, -Math.PI / 2, 10);
  r = await walkTo(-4, 8, (s) => s.player.z < 10, 900);
  check('Über den Steg ins Gruseldorf gelaufen (Kollision der Schranke entfernt)', r.s.player.z < 10 && Math.abs(r.s.player.y - 2) < 0.1);
}

// ------------------------------------------------------------------ 6) Freischalt-Kette laut Tabelle
if (part(6)) {
  await loadWith({ version: 1, hero: 'lotti', lives: 5, coins: 0, world: 31, worlds: [1, 31], levels: withH(['H-1']), mapOpened: openedH(['H-1']), mapPos: null }, '', true);
  await waitMap(31);
  const free = (s2, id) => !s2.entrances[id].locked && s2.entrances[id].pathOpen;
  const shut = (s2, id) => s2.entrances[id].locked && !s2.entrances[id].pathOpen;
  st = await setLevels(withH(['H-1']));
  check('Nach H-1: H-2 frei, H-Kapitän/H-3/H-4/H-Burg zu', free(st, 'H-2') && ['H-Kapitän', 'H-3', 'H-4', 'H-Burg'].every((id) => shut(st, id)));
  st = await setLevels(withH(['H-1', 'H-2']));
  check('Nach H-2: Kürbislabyrinth (H-Kapitän) und Nebelfriedhof (H-3) frei, H-4/H-Burg zu', free(st, 'H-Kapitän') && free(st, 'H-3') && shut(st, 'H-4') && shut(st, 'H-Burg'));
  st = await setLevels(withH(['H-1', 'H-2', 'H-Kapitän']));
  check('H-Kapitän schaltet nichts weiter frei (H-4 bleibt zu)', shut(st, 'H-4'));
  st = await setLevels(withH(['H-1', 'H-2', 'H-3']));
  check('Nach H-3: Hexenturm (H-4) frei, H-Burg zu', free(st, 'H-4') && shut(st, 'H-Burg'));
  st = await setLevels(withH(['H-1', 'H-2', 'H-3', 'H-4']));
  check('Nach H-4: Gruselschloss (H-Burg) frei – ohne Sternbedarf (0 Sterne)', free(st, 'H-Burg') && st.stars === 0 && st.entrances['H-Burg'].reason === null);
  // Schwenk über drei frische Schranken (H-2 geschafft: Labyrinth und Friedhof), dann alle Wege offen
  await loadWith({ levels: withH(['H-1', 'H-2']), mapOpened: openedH(['H-1']) });
  await waitMap(31);
  st = await sc(() => window.__courseMap.state());
  check('Nach H-2 (neu): Schwenk zu den frischen Schranken (Labyrinth, Friedhof)', st.cinematic && st.gates['H-Kapitän'] === 'closed' && st.gates['H-3'] === 'closed');
  r = await stepUntil((s) => !s.cinematic, 3000);
  check('Schwenk endet: Wege zu H-Kapitän und H-3 offen, H-4 zu', r.s.gates['H-Kapitän'] === 'open' && r.s.gates['H-3'] === 'open' && r.s.gates['H-4'] === 'closed');
  const all = ['H-1', 'H-2', 'H-Kapitän', 'H-3', 'H-4', 'H-Burg'];
  await loadWith({ levels: withH(all, true), mapOpened: openedH(all) });
  await waitMap(31);
  st = await sc(() => window.__courseMap.state());
  check('Alle Halloween-Level geschafft: alle 5 Schranken offen, 18/18 Sterne', Object.values(st.gates).every((g) => g === 'open') && st.stars === 18 && HIDS.every((id) => st.entrances[id].done));
  await tp(6, 3.3, -38, Math.PI, 20);
  r = await walkTo(-17, -39, (s) => Math.hypot(s.player.x + 17, s.player.z + 39) < 0.6, 900);
  r = await walkTo(-18, -64, (s) => Math.hypot(s.player.x + 18, s.player.z + 64) < 0.6, 900);
  r = await walkTo(-18, -82, (s) => s.player.z < -80, 900);
  check('Vom Friedhofssteg durchs Hexenmoor über den Stufensteg auf den Schlosshügel', r.s.player.z < -80 && Math.abs(r.s.player.y - 6) < 0.6);
}

// ------------------------------------------------------------------ 7) Laternen im Takt, lebendige Kulisse
if (part(7)) {
  if (!(await sc(() => window.__courseMap?.map.world === 31))) { await loadWith({ world: 31, worlds: [1, 31], mapPos: null }); await waitMap(31); }
  await tp(-2, 1.3, 38, -Math.PI / 2, 20);
  r = await sc(() => {
    const mu = window.__audio.music, m = window.__courseMap;
    const theme = m.musicName();
    mu.setManualClock(true);
    const bpm = mu.beat().bpm, spb = 60 / bpm;
    const L = () => m.state().decor.lanterns;
    const b0 = L();
    mu.advanceClock((1 - (b0.beat % 1)) * spb + 0.03 * spb);   // kurz nach dem nächsten Schlag
    const b1 = L();
    mu.advanceClock(0.6 * spb);                                // Mitte der Zählzeit
    const b2 = L();
    mu.advanceClock(0.4 * spb);                                // nächster Schlag
    const b3 = L();
    return { theme, bpm, b0, b1, b2, b3 };
  });
  console.log('  Laternen:', JSON.stringify({ b1: [r.b1.step, r.b1.pulse, r.b1.k], b2: [r.b2.step, r.b2.pulse, r.b2.k], b3: [r.b3.step, r.b3.pulse], src: r.b1.source, theme: r.b1.theme, bpm: r.bpm, halos: r.b1.halos }));
  check(`Laternen folgen der Taktuhr der Kartenmusik (${r.theme}, ${r.bpm} BPM)`, r.b1.theme === r.theme && r.b1.source !== 'zeit' && r.b1.bpm === r.bpm);
  check('Je Zählzeit ein heller Aufschein, dann Kerzenflackern (Schlag hell, Mitte dunkler, nächster Schlag wieder hell)',
    r.b1.step === Math.floor(r.b0.beat) + 1 && r.b1.pulse > 0.85 && r.b2.pulse < 0.2 && r.b1.k - r.b2.k > 0.2 && r.b3.step === r.b1.step + 1 && r.b3.pulse > 0.85);
  await frames(2);
  const shown = await sc(() => { const d = window.__courseMap.state().decor.lanterns; return { d, mat: +window.__courseMap.view.mats.hwglow.color.r.toFixed(3) }; });
  check('Darstellung folgt: Material der Lichter in der gezeigten Helligkeit, Lichtscheine und -flecken vorhanden', Math.abs(shown.mat - shown.d.shown.k) < 0.002
    && shown.d.halos >= 60 && shown.d.pools >= 40);
  await shot('takt', 200, false, 2);
  await sc(() => window.__audio.music.setManualClock(false));
  // Ersatzuhr ohne Musik
  r = await sc(() => {
    const mu = window.__audio.music;
    mu.stop();
    const d = window.__courseMap.state().decor.lanterns;
    const want = mu.themeInfo('course_halloween_map')?.bpm ?? mu.themeInfo('course_map')?.bpm;
    return { d, want };
  });
  check('Ohne laufende Musik zählt die Ersatzuhr (Kartenzeit) im Tempo der Halloween-Kartenmusik (bzw. Rückfall)', r.d.source === 'zeit' && r.d.bpm === r.want);
  await sc(() => window.__audio.music.play(window.__courseMap.musicName()));
  // Lebendige Kulisse: Fledermäuse, Nebel, Geist am Grabstein, Kessel, Vogelscheuche
  r = await sc(() => {
    const m = window.__courseMap;
    const life = m.built.life?.info();
    const ev3 = m.built.entrances.get('H-3');
    const run = (t) => { for (const u of ev3.updaters) u(0, t); return { ...m.state().decor.ghost, vis: m.view.three.getObjectByName('hw:geist').visible, y: +m.view.three.getObjectByName('hw:geist').position.y.toFixed(2) }; };
    const g1 = run(2.0), g2 = run(5.0), g3 = run(9.0), g4 = run(12.0);
    const ev4 = m.built.entrances.get('H-4');
    for (const u of ev4.updaters) u(0, 1.1);
    const c = m.state().decor.cauldron;
    const ev1 = m.built.entrances.get('H-1');
    for (const u of ev1.updaters) u(0, 1.7);
    const s1 = m.state().decor.scarecrow.sway;
    for (const u of ev1.updaters) u(0, 3.4);
    const s2 = m.state().decor.scarecrow.sway;
    return { life, g1, g2, g3, g4, c, s1, s2, bats: m.view.three.getObjectByName('hw:fledermaeuse')?.count ?? 0 };
  });
  console.log('  Kulisse:', JSON.stringify(r));
  check('Fledermäuse kreisen (Schwärme über Schloss, Turm, Friedhof, Bucht, Dorf), Nebelschwaden über dem Wasser', r.life.bats >= 15 && r.bats === r.life.bats && r.life.fog >= 30);
  check('Geist schaut ab und zu hinter dem Grabstein hervor (versteckt → schaut → versteckt → schaut)', r.g1.phase === 'hidden' && !r.g1.vis && r.g2.phase === 'peek' && r.g2.vis && r.g2.y > r.g1.y + 0.8
    && r.g3.phase === 'hidden' && r.g4.phase === 'peek' && r.g4.peeks === r.g2.peeks + 1);
  check('Hexenkessel blubbert (Blasen steigen), Vogelscheuche wiegt sich', r.c.bubbles > 0 && Math.abs(r.s1 - r.s2) > 0.005);
}

// ------------------------------------------------------------------ 8) Bilder der Insel (alle Wege offen), Kennzahlen je Ansicht
if (part(8)) {
  const all = ['H-1', 'H-2', 'H-Kapitän', 'H-3', 'H-4'];
  await loadWith({ version: 1, hero: 'lotti', lives: 5, coins: 0, world: 31, worlds: [1, 31], levels: withH(all, true), mapOpened: openedH([...all, 'H-Burg']), mapPos: null }, '', true);
  await waitMap(31);
  for (const [name, pos, yaw] of [['bucht', [-2, 1, 41], Math.PI / 2], ['roehre', [-15, 1, 39.5]], ['kuerbisfeld', [18, 1, 35.6]], ['steg', [-4, 1, 28]],
    ['gruseldorf', [-2, 2, -1]], ['labyrinth', [-35, 2, 3.6]], ['friedhof', [16, 3, -32.9]], ['hexenturm', [-27, 4, -50.9]], ['moor', [-20, 4, -44]],
    ['schlosshuegel', [-18, 6, -80], Math.PI], ['gruselschloss', [-4, 6, -88.4]]]) {
    await tp(pos[0], pos[1] + 0.3, pos[2], yaw ?? -Math.PI / 2, 30);
    await shot(name, 300);
  }
}

// ------------------------------------------------------------------ 9) Anflug beim Betreten der Kürbisinsel
if (part(9)) {
  await loadWith({ version: 1, hero: 'lotti', lives: 5, coins: 0, world: 31, worlds: [1, 31], levels: {}, mapOpened: [], mapPos: null }, '', true);
  try { await page.waitForFunction(() => window.__courseMap && window.__courseMap.intro && window.__courseMap.map.world === 31, null, { timeout: 150000 }); } catch { /* ohne Anflug */ }
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}cmaphw_anflug.png`, timeout: 200000 });
  { const s = await sc(() => window.__courseMap?.intro ? window.__courseMap.stats() : null); if (s) stats.push(['anflug', s.calls, s.triangles, 31]); }
  check('Anflug beim Betreten der Kürbisinsel läuft (Mond, Sterne, Insel)', stats.some(([n]) => n === 'anflug'));
  await waitMap(31);
}

// ------------------------------------------------------------------ 10) Welt 1 an der geschmückten Röhre (Kennzahlen)
if (part(10)) {
  await loadWith({ version: 1, hero: 'lotti', lives: 5, coins: 0, world: 1, worlds: [1], levels: {}, mapOpened: [], mapPos: null }, '', true);
  await waitMap(1);
  for (const [name, pos, yaw] of [['w1_bucht', [2, 1, 40.5], Math.PI / 2], ['w1_halloween', [20, 1, 37.5]], ['w1_landzunge', [14.5, 1, 38.5]]]) {
    await tp(pos[0], pos[1] + 0.3, pos[2], yaw ?? -Math.PI / 2, 30);
    await shot(name, 300);
  }
  st = await sc(() => window.__courseMap.state());
  check('Welt 1: Lichter der Halloween-Röhre im Takt (Laternen-Taktuhr auch in Welt 1)', !!st.decor.lanterns && st.decor.lanterns.halos >= 4);
}

console.log(`  — Ende (${Math.round((Date.now() - T0) / 1000)} s)`);
const sst = await sc(() => window.__courseMap.map.world === 31 ? window.__courseMap.stats() : null);
if (sst) console.log(`\n  Statische Kulisse Welt 31: ${sst.staticMeshes} Kachel-Meshes, ${Math.round(sst.staticTriangles / 1000)} k Dreiecke, ${sst.shapes} Kollisionsformen`);
console.log('  Kennzahlen je Bild (Zeichenaufrufe inkl. Schattenpass, Dreiecke):');
for (const [n, c, t, w] of stats) console.log(`    ${n.padEnd(20)} ${String(c).padStart(4)} Aufrufe  ${String(Math.round(t / 1000)).padStart(4)} k Dreiecke  (Welt ${w})`);
for (const w of [31, 1]) {
  const ws = stats.filter(([, , , ww]) => ww === w);
  if (!ws.length) continue;
  const maxCalls = Math.max(...ws.map((s) => s[1])), maxTris = Math.max(...ws.map((s) => s[2]));
  check(`Kennzahlen Welt ${w}: Zeichenaufrufe < 120 (max ${maxCalls}), Dreiecke < 300 k (max ${Math.round(maxTris / 1000)} k)`, maxCalls < 120 && maxTris < 300000);
}

await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
