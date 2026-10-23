// Mehrwelten-Karte und Welt-2-Insel „Wüste mit Sandblöcken“ (Präzisierung Mehrwelten-Karte):
//   Weltdaten (Schranken riegeln ab, Ids/Reihenfolge/Sternbedarf laut Vertrag), Spielautomat-Logik (Node);
//   Welt 2 gesperrt, solange 1-Burg offen ist; nach 1-Burg: Glasröhre am Ende von Welt 1 → Fahrt übers Meer →
//   Figur am Start von Welt 2; Eingänge zeigen Titel bzw. „Bald“ (mapAlias), Sternschranken 15/20/30 mit Hinweis
//   „Benötigt 15 Sterne (x/15)“; Beerenhaus; Glückshaus (Einsatz, Gewinn, kein Einsatz ohne 10 Bitcoins);
//   Großrollpilze starten 2-A; Rückweg nach Welt 1; aktuelle Welt bleibt nach Neuladen; Welt-Warp-Röhre in 1-2 →
//   Welt 2 (schaltet sie frei), zurück nach Welt 1 und von hinten durch gesperrte Schranken zum Start;
//   Kennzahlen (< 120 Zeichenaufrufe, < 300 k Dreiecke). Screenshots tests/out/cmap2_*.png.
// Simulation deterministisch über window.__courseMap.step(n)/setInput; Bilder nur zur Sichtprüfung.
// Aufruf: npm run build && PORT_BASE=3700 node tests/course_map_w2.mjs   (Teilläufe: W2_TEIL=1, 2, 3 – s. u.)
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';
import { MAP as W2 } from '../src/course/map/worlds/w2.js';
import { MAP as W1 } from '../src/course/map/worlds/w1.js';
import { buildWalkGrid, reachable, gateRects, gateSides } from '../src/course/map/layout.js';
import * as unlock from '../src/course/map/unlock.js';
import { slotResult, slotPrize, SLOT_SYMBOLS } from '../src/course/map/slot.js';

const { check, summary } = makeChecker();

// ------------------------------------------------------------------ 1) Weltdaten und Logik (Node)
{
  const grid = buildWalkGrid(W2);
  const order = W2.levels.map((l) => l.id);
  const after = Object.fromEntries(W2.levels.map((l) => [l.id, [].concat(l.after ?? [])]));
  let ok = true;
  const open = new Set();
  for (let i = 0; i <= order.length; i++) {
    const done = new Set(order.slice(0, i));
    for (const id of order) if (after[id].every((a) => done.has(a))) open.add(id);
    const r = reachable(W2, grid, open).ids.sort();
    const want = order.filter((id) => open.has(id)).sort();
    if (r.join() !== want.join()) { ok = false; console.log('   erreichbar', r.join(), 'erwartet', want.join()); }
  }
  check('Welt 2: jede Schranke riegelt ihren Bereich vollständig ab', ok);
  const gr = gateRects(W2, grid);
  check('Welt 2: 8 Schranken, je 4 m breit', gr.length === 8 && gr.every((g) => Math.abs(g.width - 4) < 0.01));
  check('Welt 2: jede Schranke hat eine Rückseite (Durchlass von hinten)', gateSides(W2, grid).every((g) => g.back !== 0) && gateSides(W1, buildWalkGrid(W1)).every((g) => g.back !== 0));
  const ids = ['2-1', '2-2', '2-3', '2-Haus', '2-4', '2-A', '2-5', '2-Panzer'];
  check('Welt 2: Ids und Reihenfolge der Welt-2-Liste', W2.levels.filter((l) => !l.next).map((l) => l.id).join() === ids.join());
  const rule = (id) => W2.levels.find((l) => l.id === id);
  check('Welt 2: Freischaltung 2-2 nach 2-1 (15), 2-3 nach 2-2, 2-Haus nach 2-2 (20), 2-4/2-A nach 2-3, 2-5 nach 2-4, 2-Panzer nach 2-5 (30)',
    rule('2-2').after === '2-1' && rule('2-2').minStars === 15 && rule('2-3').after === '2-2' && rule('2-Haus').after === '2-2' && rule('2-Haus').minStars === 20
    && rule('2-4').after === '2-3' && rule('2-A').after === '2-3' && rule('2-5').after === '2-4' && rule('2-Panzer').after === '2-5' && rule('2-Panzer').minStars === 30
    && !rule('2-1').after && W2.starScope === 'all');
  check('Welt 2: 24 Sterne (Vertrag)', unlock.worldStarsMax(W2) === 24);
  check('Welt 2: Glasröhre zurück (W1, offen) und nach Welt 3 (nach 2-Panzer)', rule('W1').next === 1 && !rule('W1').after && rule('W3').next === 3 && rule('W3').after === '2-Panzer');
  check('Welt 2: jeder Eingang hat ein Podest/eine Kulisse', W2.levels.every((l) => W2.entrances.some((e) => e.id === l.id)));
  check('Welt 2: drei Großrollpilze für 2-A, Beerenhaus und Glückshaus', W2.roamers.length === 1 && W2.roamers[0].level === '2-A' && W2.roamers[0].count === 3
    && W2.roamers[0].model === 'grossrollpilz' && W2.houses.some((h) => h.kind === 'beeren') && W2.houses.some((h) => h.kind === 'glueck' && h.stake === 10));
  check('Welt 1: Glasröhre W2 nach 1-Burg führt zu Welt 2', W1.levels.find((l) => l.id === 'W2')?.next === 2 && W1.levels.find((l) => l.id === 'W2')?.after === '1-Burg');
  // Freischaltung über die Welten (Attrappe des Speicherstands)
  const fake = (levels, worlds = [1]) => ({
    peek: (id) => levels[id] ?? null, starsInWorld: (w) => Object.entries(levels).filter(([k]) => k.startsWith(`${w}-`)).reduce((n, [, l]) => n + l.stars.filter(Boolean).length, 0),
    totalStars: () => Object.values(levels).reduce((n, l) => n + l.stars.filter(Boolean).length, 0), worldOpened: (n) => worlds.includes(n),
  });
  const maps = (n) => (n === 1 ? W1 : n === 2 ? W2 : null);
  const done3 = { done: true, stars: [true, true, true] };
  check('worldOpen: Welt 2 zu ohne 1-Burg, offen mit 1-Burg oder per Warp; Welt 3 ohne Karte zu',
    !unlock.worldOpen(maps, fake({}), 2) && unlock.worldOpen(maps, fake({ '1-5': done3, '1-Burg': done3 }), 2) && unlock.worldOpen(maps, fake({}, [1, 2]), 2) && !unlock.worldOpen(maps, fake({}, [1, 2, 3]), 3));
  const s14 = fake({ '1-1': done3, '1-2': done3, '1-3': done3, '1-4': done3, '2-1': { done: true, stars: [true, true, false] } });
  check('Sternschranke 2-2 zählt alle Sterne (14 < 15 → „stars“, 15 → frei)', unlock.reason(W2, s14, '2-2') === 'stars' && unlock.gateStars(W2, s14) === 14
    && unlock.reason(W2, fake({ '1-1': done3, '1-2': done3, '1-3': done3, '1-4': done3, '2-1': done3 }), '2-2') === null);
  // Spielautomat
  const res = Array.from({ length: 400 }, (_, i) => slotResult(i));
  const triples = res.filter(([a, b, c]) => a === b && b === c).length, none = res.filter((r) => slotPrize(r).kind === 'none').length;
  console.log(`  Spielautomat: ${triples} Drillinge, ${none} Nieten in 400 Drehungen`);
  check('Spielautomat: deterministisch, nur bekannte Bilder, mal Drilling, mal Niete', JSON.stringify(slotResult(7)) === JSON.stringify(slotResult(7))
    && res.every((r) => r.every((s) => SLOT_SYMBOLS.includes(s))) && triples > 20 && none > 40);
  check('Spielautomat: Gewinne (30 Bitcoins, Leben, Power-up, Einsatz zurück)', slotPrize(['coin', 'coin', 'coin']).n === 30 && slotPrize(['oneup', 'oneup', 'oneup']).kind === 'life'
    && slotPrize(['funken', 'funken', 'funken']).power === 'funken' && slotPrize(['coin', 'stern', 'coin']).n === 10 && slotPrize(['baron', 'baron', 'baron']).kind === 'none');
}

// ------------------------------------------------------------------ Browser
const PORT = 4210;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser({ hasTouch: true });
page.setDefaultNavigationTimeout(150000);
page.setDefaultTimeout(150000);
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const active = (k) => sc((key) => window.__game.scene.isActive(key), k);
const fail = async (msg) => { console.log(msg); for (const e of errors) console.log('  ', e); await browser.close(); stop(); process.exit(1); };
const stats = [];
/** Screenshot nach mindestens 3 neuen Bildern (Software-Renderer), Kennzahlen merken. */
async function shot(name, wait = 700, snap = true) {
  if (snap) await sc(() => window.__courseMap?.snapCamera());
  const f0 = await sc(() => window.__courseMap?.view?.frame ?? 0);
  // ohne Einrasten (Röhrenfahrt) braucht die weich folgende Kamera ein paar Bilder mehr
  await page.waitForFunction(([f, k]) => (window.__courseMap?.view?.frame ?? 0) >= f + k, [f0, snap ? 3 : 10], { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__courseMap?.stats());
  if (s) stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}cmap2_${name}.png`, timeout: 90000 });
  return s;
}
/** Ein paar Bilder abwarten (HUD wird je Bild aktualisiert). */
async function frames(n = 3) {
  const f0 = await sc(() => window.__courseMap?.view?.frame ?? 0);
  await page.waitForFunction(([f, k]) => (window.__courseMap?.view?.frame ?? 0) >= f + k, [f0, n], { timeout: 60000 }).catch(() => {});
}
async function waitMap(world = null) {
  try {
    await page.waitForFunction((w) => window.__courseMap && window.__courseMap.player && window.__game.scene.isActive('CourseMap') && (w === null || window.__courseMap.map.world === w), world, { timeout: 90000 });
  } catch { await fail(`Kurs-Weltkarte${world ? ` (Welt ${world})` : ''} startet nicht.`); }
  await sc(() => { const m = window.__courseMap; m.setManual(true); m.level.muted = true; m.setInput({}); });
  await page.waitForTimeout(1200);
}
async function waitCourse() {
  try {
    await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('Course'), null, { timeout: 90000 });
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
/** Simulation bis zur Bedingung (höchstens max Schritte, Eingabe neutral). */
const stepUntil = (cond, max = 1200) => sc(([c, mx]) => {
  const m = window.__courseMap;
  const f = new Function('s', `return (${c})(s);`);
  for (let i = 0; i < mx; i++) { const s = m.step(1); if (s.leaving || f(s)) return { i, s }; }
  return { i: mx, s: m.state() };
}, [cond.toString(), max]);
const allW1Done = (stars) => {
  const lv = {};
  for (const id of ['1-1', '1-2', '1-A', '1-3', '1-Schatz', '1-4', '1-5', '1-Burg']) lv[id] = { done: true, stars: [stars, stars, stars], stamp: false, bestTime: null, bestPole: 0 };
  return lv;
};
const W1_OPENED = ['1-2', '1-A', '1-3', '1-Schatz', '1-4', '1-5', '1-Burg', 'W2'];
// Testparameter mapAlias: 2-1, 2-A starten das Übungslevel 0-0
const ALIAS = '&mapAlias=2-1:0-0,2-A:0-0';
// Teilläufe (W2_TEIL=1|2|3) für Rechner, auf denen ein Lauf am Stück zu lange dauert; ohne Angabe alle Abschnitte.
//   1: Abschnitte 2–4 (Sperre, Röhrenfahrt, Titel/Sterne), 2: 5–9 (Gegnergruppe … Neuladen), 3: 10–12 (Rückweg, Warp, Anflug)
const TEIL = process.env.W2_TEIL ?? '';
const PARTS = { 1: [2, 4], 2: [5, 9], 3: [10, 12] };
const part = (n) => !PARTS[TEIL] || (n >= PARTS[TEIL][0] && n <= PARTS[TEIL][1]);
let st, r, banner;
if (PARTS[TEIL] && PARTS[TEIL][0] > 2) {
  // Teillauf ab Abschnitt 5 bzw. 10: frischer Speicherstand, Welt 2 mit offenen Wegen
  await page.goto(`http://localhost:${port}/?map=1&scale=2&adapt=0`, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await waitMap();
  const lv = allW1Done(true);
  for (const id of ['2-1', '2-2', '2-3', '2-4', '2-5']) lv[id] = { done: true, stars: [false, false, false], stamp: false, bestTime: null, bestPole: 0 };
  await loadWith({ levels: lv, mapOpened: [...W1_OPENED, '2-2', '2-3', '2-Haus', '2-4', '2-A', '2-5', '2-Panzer'], world: 2, worlds: [1, 2] }, ALIAS);
  await waitMap(2);
}

// ------------------------------------------------------------------ 2) Welt 2 gesperrt, solange 1-Burg offen ist
if (part(2)) {
await page.goto(`http://localhost:${port}/?map=1&scale=2&adapt=0`, { waitUntil: 'load' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'load' });
await waitMap();
await loadWith({ levels: (() => { const l = allW1Done(false); delete l['1-Burg']; return l; })(), mapOpened: W1_OPENED.filter((x) => x !== 'W2'), world: 2, worlds: [1] });
await waitMap();
st = await sc(() => window.__courseMap.state());
check('Gespeicherte Welt 2 ohne Freischaltung → Karte zeigt Welt 1', st.world === 1);
check('Welt 2 gesperrt, solange 1-Burg offen ist (Glasröhre zu, Schranke zu)', st.entrances.W2.locked && st.entrances.W2.reason === 'locked' && st.gates.W2 === 'closed' && !st.worlds.includes(2));
check('W2-Eingang zeigt den Weltnamen der Zielwelt', st.entrances.W2.title === 'Wüste mit Sandblöcken');

// ------------------------------------------------------------------ 3) Nach 1-Burg: Glasröhre → Fahrt → Welt 2
await loadWith({ levels: allW1Done(true), mapOpened: W1_OPENED, world: 1, worlds: [1], coins: 0 });
await waitMap(1);
st = await sc(() => window.__courseMap.state());
check('Nach 1-Burg: Glasröhre nach Welt 2 frei (Schranke offen)', st.entrances.W2.enterable && st.gates.W2 === 'open');
await sc(() => { const m = window.__courseMap; m.teleport(-10, 5.3, -84, -Math.PI / 2); m.step(20); });
r = await walkTo(-10, -88.5, (s) => s.onPad === 'W2', 600);
await shot('w1_roehre', 600);
await frames();
check('Figur steht auf dem Röhren-Podest, Hinweis „ab durch die Glasröhre“', r.s.onPad === 'W2' && (await sc(() => window.__courseMap.hud.bannerStatus.text)).includes('Glasröhre'));
await sc(() => window.__courseMap.setInput({ jump: true }));
st = await sc(() => window.__courseMap.step(1));
await sc(() => window.__courseMap.setInput({}));
check('A auf dem Podest startet die Röhrenfahrt (Abfahrt)', st.travel?.mode === 'depart' && !st.leaving);
r = await stepUntil((s) => s.travel?.phase === 'ride' && s.travel.t > 1.6, 600);
await shot('abfahrt', 400);
r = await stepUntil(() => false, 600);
check('Nach der Fahrt verlässt die Karte Welt 1 (Szenenwechsel zu Welt 2)', r.s.leaving === true);
await waitMap(2);
st = await sc(() => window.__courseMap.state());
console.log('  Ankunft', JSON.stringify(st.travel), JSON.stringify(st.player));
check('Welt 2 geladen, Ankunft durch die Röhre läuft (Figur weit draußen)', st.world === 2 && st.travel?.mode === 'arrive' && Math.hypot(st.player.x + 10, st.player.z - 43.6) > 30);
// teuerstes Bild der Karte: Anfang der Ankunft, Blick über die ganze Insel (ferne Kleinteile ausgeblendet, Schattenpass ruht)
await shot('ankunft_weit', 300);
r = await sc(() => ({ lod: window.__courseMap.lod.info(), travel: window.__courseMap.state().travel }));
console.log('  Ankunft weit', JSON.stringify(r));
check('Ankunft über dem Meer: ferne Kleinteile ausgeblendet, Schattenkarte ruht', r.lod.hidden > 10 && (r.travel.t >= 1 || r.travel.shadows === false));
r = await stepUntil((s) => s.travel?.t > 1.4, 400);
await shot('ankunft', 400);
r = await stepUntil((s) => !s.travel, 900);
await sc(() => window.__courseMap.step(40));
st = await sc(() => window.__courseMap.state());
console.log('  angekommen', JSON.stringify(st.player));
check('Nach der Ankunft steht die Figur vor der Rückweg-Röhre am Start von Welt 2', Math.hypot(st.player.x + 10, st.player.z - 43.6) < 0.8 && st.player.mode === 'ground' && Math.abs(st.player.y - 1) < 0.05);
await sc(() => window.__courseMap.snapCamera());
await frames(3);
// Fern-Ausblendung ändert die normale Kartenansicht nicht (ausgeblendet ist nur, was ohnehin nicht im Bild liegt –
// höchstens ein Krümel am Horizont, der die Hüllkugel-Prüfung noch besteht)
r = await sc(() => {
  const m = window.__courseMap, v = m.view, rr = v.renderer;
  const draw = () => { rr.render(v.three, v.camera); return [rr.info.render.calls, rr.info.render.triangles]; };
  const a = draw();
  const hid = m.lod.units.filter((u) => u.far);
  for (const u of hid) m.lod.set(u, false);
  const b = draw();
  for (const u of hid) m.lod.set(u, true);
  return { auto: rr.shadowMap.autoUpdate, a, b, hidden: hid.length };
});
console.log('  Fern-Ausblendung am Start', JSON.stringify(r));
check('Danach: Schattenkarte wieder laufend; Fern-Ausblendung ändert die Kartenansicht nicht (≤ 2 Aufrufe, ≤ 500 Dreiecke)', r.auto === true && Math.abs(r.a[0] - r.b[0]) <= 2 && Math.abs(r.a[1] - r.b[1]) <= 500);
check('Welt 2 gemerkt (offen, aktuelle Welt)', st.worlds.includes(2) && (await sc(() => JSON.parse(localStorage.getItem('lotti-greta-course-v1')).world)) === 2);
check('HUD: Weltname „Welt 2 · Wüste“ und Sterne gesamt (24)', (await sc(() => window.__courseMap.hud.worldName.text)) === 'Welt 2 · Wüste'
  && (await sc(() => window.__courseMap.hud.totalText.text)).startsWith('24') && st.totalStars === 24 && st.stars === 0 && st.starsMax === 24);
await shot('start', 900);

// ------------------------------------------------------------------ 4) Eingänge: Titel bzw. „Bald“, Sternschranken
const titles = await sc(() => { const out = {}; for (const id of ['2-1', '2-2', '2-3', '2-Haus', '2-4', '2-A', '2-5', '2-Panzer']) { const s = window.__courseMap.status(id); out[id] = [s.title, s.exists]; } return out; });
console.log('  Titel', JSON.stringify(titles));
check('Eingänge in Welt 2 zeigen den Leveltitel bzw. „Bald“', Object.values(titles).every(([t, ex]) => (ex ? t && t !== 'Bald' : t === 'Bald')));
st = await sc(() => window.__courseMap.state());
check('Start in Welt 2: 2-1 frei, alle anderen zu, Rückweg-Röhre frei, Welt-3-Röhre zu', !st.entrances['2-1'].locked && !st.entrances.W1.locked && st.entrances.W1.enterable
  && ['2-2', '2-3', '2-Haus', '2-4', '2-A', '2-5', '2-Panzer', 'W3'].every((id) => st.entrances[id].locked) && Object.values(st.gates).every((g) => g === 'closed'));
await loadWith({}, ALIAS);
await waitMap(2);
st = await sc(() => window.__courseMap.state());
const t00 = await sc(() => window.__courseMap.status('2-1').title);
check('mapAlias: 2-1 zeigt den Titel des Ersatz-Levels und ist startbar', t00 !== 'Bald' && st.entrances['2-1'].enterable);
// 2-1 mit 2 Sternen geschafft, W1 mit 12 Sternen → 14 gesamt: Weg zu 2-2 offen, Eingang braucht 15
const lv14 = allW1Done(false);
['1-1', '1-2', '1-3', '1-4'].forEach((id) => { lv14[id].stars = [true, true, true]; });
lv14['2-1'] = { done: true, stars: [true, true, false], stamp: true, bestTime: null, bestPole: 0 };
await loadWith({ levels: lv14, mapOpened: [...W1_OPENED, '2-2'], world: 2, worlds: [1, 2] }, ALIAS);
await waitMap(2);
st = await sc(() => window.__courseMap.state());
check('2-1 geschafft → Schluchtweg offen; 2-2 bei 14 Sternen gesperrt (Sterne)', st.gates['2-2'] === 'open' && st.entrances['2-2'].locked && st.entrances['2-2'].reason === 'stars' && st.gateStars === 14);
await sc(() => { const m = window.__courseMap; m.teleport(12, 3.6, -6.6, -Math.PI / 2); m.step(40); });
st = await sc(() => window.__courseMap.state());
await shot('sterne', 900);
banner = await sc(() => window.__courseMap.hud.bannerStatus.text);
console.log('  Hinweis 2-2:', banner);
check('Auf der Sternenplattform: Hinweis „Benötigt 15 Sterne (14/15)“, Enter startet nichts', st.onPad === '2-2' && banner === 'Benötigt 15 Sterne (14/15)'
  && !(await sc(() => { const m = window.__courseMap; m.enter(); return m.step(2).leaving; })));
// über die Sterntritte auf die Plattform
await sc(() => { const m = window.__courseMap; m.teleport(4.4, 1, -1.4, 0); m.step(20); });
r = await sc(() => {
  const m = window.__courseMap;
  for (const [x, z] of [[5.9, -2.1], [7.7, -3.5], [11.4, -5.6]]) {
    let t = -1;
    for (let i = 0; i < 300; i++) {
      const p = m.player.pos, dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz);
      if (t < 0 && m.player.mode === 'ground') t = i;
      const k = m.player.mode !== 'ground' ? Math.min(1, d / 1.5) : 0.6;
      m.setInput({ x: d > 0.1 ? (dx / d) * k : 0, y: d > 0.1 ? (-dz / d) * k : 0, jump: i - t < 28 });
      m.step(1);
      if (i - t > 30 && m.player.mode === 'ground') break;
    }
    m.setInput({}); m.step(10);
  }
  m.setInput({}); m.step(30);
  return m.player.info();
});
console.log('  Sterntritte →', JSON.stringify(r));
check('Sterntritte führen auf die schwebende Plattform (Höhe 3,4 m)', r.y > 3.3 && r.y < 3.8 && Math.hypot(r.x - 12, r.z + 5.2) < 3.6);
// 2-Haus (20) und 2-Panzer (30)
const lvAll = allW1Done(true);   // 24 Sterne in Welt 1
for (const id of ['2-1', '2-2', '2-3', '2-4', '2-5']) lvAll[id] = { done: true, stars: [false, false, false], stamp: false, bestTime: null, bestPole: 0 };
lvAll['1-1'].stars = [false, false, false]; lvAll['1-2'].stars = [false, false, false];   // 18 gesamt
await loadWith({ levels: lvAll, mapOpened: [...W1_OPENED, '2-2', '2-3', '2-Haus', '2-4', '2-A', '2-5', '2-Panzer'], world: 2, worlds: [1, 2] }, ALIAS);
await waitMap(2);
st = await sc(() => window.__courseMap.state());
check('18 Sterne: 2-2 frei, 2-Haus braucht 20, 2-Panzer braucht 30 (Wege offen)', !st.entrances['2-2'].locked && st.entrances['2-Haus'].reason === 'stars' && st.entrances['2-Panzer'].reason === 'stars'
  && st.gates['2-Haus'] === 'open' && st.gates['2-Panzer'] === 'open' && st.gateStars === 18);
await sc(() => { const m = window.__courseMap; m.teleport(-36, 1.3, -11, -Math.PI / 2); m.step(40); });
await shot('haus', 900);
const bHaus = await sc(() => window.__courseMap.hud.bannerStatus.text);
await sc(() => { const m = window.__courseMap; m.teleport(2, 3.3, -93, -Math.PI / 2); m.step(40); });
await shot('panzer', 900);
const bPanzer = await sc(() => window.__courseMap.hud.bannerStatus.text);
console.log('  Hinweise:', bHaus, '|', bPanzer);
check('Hinweise „Benötigt 20 Sterne (18/20)“ am Haus und „Benötigt 30 Sterne (18/30)“ am Panzer-Depot', bHaus === 'Benötigt 20 Sterne (18/20)' && bPanzer === 'Benötigt 30 Sterne (18/30)');
lvAll['1-1'].stars = [true, true, true]; lvAll['1-2'].stars = [true, true, true];
lvAll['2-5'].stars = [true, true, true]; lvAll['2-4'].stars = [true, true, true];   // 30 gesamt
await loadWith({ levels: lvAll }, ALIAS);
await waitMap(2);
st = await sc(() => window.__courseMap.state());
check('30 Sterne: 2-Haus und 2-Panzer frei (zeigen „Bald“, bis es die Level gibt)', !st.entrances['2-Haus'].locked && !st.entrances['2-Panzer'].locked && st.gateStars === 30);

}

// ------------------------------------------------------------------ 5) Gegnergruppe startet 2-A
if (part(5)) {
st = await sc(() => window.__courseMap.state());
check('2-A frei: drei Großrollpilze laufen auf der Lava-Felsinsel', !st.entrances['2-A'].locked && st.roamers.length === 3);
await sc(() => { const m = window.__courseMap; m.teleport(-24, 1.3, -48, Math.PI); m.step(30); });
await shot('lava', 900);
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
check('Berührung der Großrollpilze startet 2-A (Ersatz-Level 0-0)', r.s.leaving && r.s.lastStart?.entrance === '2-A' && r.s.lastStart?.id === '0-0');
await waitCourse();
await sc(() => window.__course.exitToMap({}));
await waitMap(2);
st = await sc(() => window.__courseMap.state());
check('Rückkehr aus dem Level: wieder Welt 2, vor der Felsinsel, Pilze noch da', st.world === 2 && !st.leaving && Math.hypot(st.player.x + 28.4, st.player.z + 48) < 0.8 && st.roamers.length === 3);

// ------------------------------------------------------------------ 6) Beerenhaus
st = await sc(() => window.__courseMap.state());
check('Beerenhaus in Welt 2 bietet ein Power-up an', st.berry === true);
await sc(() => { const m = window.__courseMap; m.teleport(27, 1, 45, Math.PI / 2); m.step(20); });
r = await walkTo(27, 42, (s) => !s.berry, 400);
check('Beerenhaus: Power-up eingepackt', !r.s.berry && !!r.s.carryPower && r.s.player.power === r.s.carryPower);
await shot('beerenhaus', 800);

// ------------------------------------------------------------------ 7) Glückshaus
await sc(() => { const s = window.__courseSave; s.data.coins = 5; s.save(); const m = window.__courseMap; m.teleport(15, 1, -11, Math.PI / 2); m.step(10); });
r = await walkTo(15, -14.3, (s) => s.onSlotPad, 400);
check('Figur steht auf der Matte vor dem Spielautomaten', r.s.onSlotPad === true);
await sc(() => { const m = window.__courseMap; m.setInput({ jump: true }); m.step(1); m.setInput({}); m.step(10); });
st = await sc(() => window.__courseMap.state());
check('Ohne 10 Bitcoins: kein Spiel (Bitcoins bleiben 5)', st.slot.state === 'idle' && st.slot.spins === 0 && st.coins === 5 && st.player.mode === 'ground');
await frames();
banner = await sc(() => window.__courseMap.hud.bannerStatus.text);
console.log('  Hinweis Automat:', banner);
check('Hinweis am Automaten: Einsatz 10 Bitcoins', banner.includes('10 Bitcoins'));
await sc(() => { const s = window.__courseSave; s.data.coins = 25; s.save(); window.__courseMap.slot.force(['coin', 'coin', 'coin']); });
await sc(() => { const m = window.__courseMap; m.setInput({ jump: true }); m.step(1); m.setInput({}); m.step(60); });
st = await sc(() => window.__courseMap.state());
check('A zieht den Hebel: Einsatz 10 bezahlt, Walzen drehen sich', st.slot.state === 'spin' && st.coins === 15 && st.player.mode === 'ground');
await shot('glueck', 600);
st = await sc(() => window.__courseMap.step(420));
console.log('  Automat', JSON.stringify(st.slot), 'Bitcoins', st.coins);
check('3 × Bitcoin: 30 Bitcoins Gewinn (15 → 45)', st.slot.state === 'idle' && st.slot.prize?.n === 30 && st.coins === 45);
await sc(() => { window.__courseMap.slot.force(['funken', 'funken', 'funken']); const m = window.__courseMap; m.setInput({ jump: true }); m.step(1); m.setInput({}); m.step(420); });
st = await sc(() => window.__courseMap.state());
check('3 × Funkenblüte: Power-up gewonnen und eingepackt (Einsatz bezahlt)', st.carryPower === 'funken' && st.player.power === 'funken' && st.coins === 35);
await sc(() => { const m = window.__courseMap; m.setInput({ jump: true }); m.step(1); m.setInput({}); m.step(420); });
st = await sc(() => window.__courseMap.state());
check('Drehung ohne Vorgabe: deterministisches Ergebnis, Einsatz bezahlt', st.slot.spins === 3 && Array.isArray(st.slot.result) && st.coins >= 25);

// ------------------------------------------------------------------ 8) Bilder der Insel
for (const [name, pos, yaw] of [['schlucht', [0, 1, 22]], ['oase', [-4, 1, -3]], ['hoehle', [0, 1, -47]], ['huegel', [33, 3, -48]], ['rosa', [36, 3, -84]], ['w3', [0, 3, -117]], ['nische', [26, 1, 46]]]) {
  await sc(([p, y]) => { const m = window.__courseMap; m.teleport(p[0], p[1] + 0.3, p[2], y ?? -Math.PI / 2); m.step(30); }, [pos, yaw]);
  await shot(name, 700);
}

// ------------------------------------------------------------------ 9) Aktuelle Welt bleibt nach Neuladen
await sc(() => { const m = window.__courseMap; m.teleport(4, 1.3, 40, Math.PI / 2); m.step(30); m.rememberPos(); });
await page.reload({ waitUntil: 'load' });
await waitMap();
st = await sc(() => window.__courseMap.state());
check('Nach Neuladen: wieder Welt 2 an der gemerkten Stelle', st.world === 2 && Math.hypot(st.player.x - 4, st.player.z - 40) < 0.8);

}

// ------------------------------------------------------------------ 10) Rückweg nach Welt 1
if (part(10)) {
await sc(() => { const m = window.__courseMap; m.teleport(-10, 1.3, 43.6, Math.PI / 2); m.step(20); });
r = await walkTo(-10, 41, (s) => s.onPad === 'W1', 400);
await sc(() => { const m = window.__courseMap; m.setInput({ jump: true }); m.step(1); m.setInput({}); });
st = await sc(() => window.__courseMap.state());
check('Rückweg-Röhre in Welt 2 startet die Fahrt nach Welt 1', st.travel?.mode === 'depart');
r = await stepUntil(() => false, 900);
await waitMap(1);
r = await stepUntil((s) => !s.travel, 900);
await sc(() => window.__courseMap.step(40));
st = await sc(() => window.__courseMap.state());
check('Zurück in Welt 1 vor der Glasröhre (Burgberg)', st.world === 1 && Math.hypot(st.player.x + 10, st.player.z + 85.5) < 0.8);

// ------------------------------------------------------------------ 11) Welt-Warp-Röhre in 1-2 → Welt 2
await loadWith({ levels: { '1-1': { done: true, stars: [true, false, false], stamp: false, bestTime: null, bestPole: 0 } }, mapOpened: ['1-2'], world: 1, worlds: [1], mapPos: null, carryPower: null });
await waitMap(1);
st = await sc(() => window.__courseMap.state());
check('Neuer Stand: nur 1-1 geschafft, Welt 2 zu', st.entrances.W2.locked && !st.worlds.includes(2));
await page.goto(`http://localhost:${port}/?course=1-2&scale=2&adapt=0`, { waitUntil: 'load' });
await waitCourse();
await sc(() => { const c = window.__course; c.setManual(true); c.level.muted = true; c.teleport(6.4, 8.3, -155); c.step(30); });
r = await sc(() => { const c = window.__course; c.setInput({ crouch: true }); c.step(8); c.setInput({}); for (let i = 0; i < 120 && !c.worldWarp; i++) c.step(1); return { warp: c.worldWarp, p: c.player.info(), opened: JSON.parse(localStorage.getItem('lotti-greta-course-v1')).worlds.includes(2) }; });
console.log('  Warp', JSON.stringify(r));
check('1-2: Welt-Warp-Röhre (Krallen-Sims) schaltet Welt 2 frei', r.warp === 2 && r.opened);
// im Echtzeitbetrieb führt sie auf die Welt-2-Insel
await sc(() => { window.__oldLevel = window.__course.level; window.__course.restartLevel(); });
await page.waitForFunction(() => window.__course && window.__course.level && window.__course.level !== window.__oldLevel && window.__game.scene.isActive('Course'), null, { timeout: 120000 });
await sc(() => { const c = window.__course; c.level.muted = true; c.setInput({}); c.teleport(6.4, 8.3, -155); });
await page.waitForFunction(() => window.__course.player.mode === 'ground', null, { timeout: 120000 }).catch(() => {});
await sc(() => window.__course.setInput({ crouch: true }));   // Ducken auf der Röhre (Echtzeit)
try {
  await page.waitForFunction(() => window.__courseMap && window.__game.scene.isActive('CourseMap') && window.__courseMap.map.world === 2, null, { timeout: 120000 });
} catch { /* unten geprüft */ }
await waitMap();
st = await sc(() => window.__courseMap.state());
check('Welt-Warp-Röhre führt auf die Welt-2-Insel (Ankunft durch die Glasröhre)', st.world === 2 && (st.travel?.mode === 'arrive' || Math.hypot(st.player.x + 10, st.player.z - 43.6) < 1));
r = await stepUntil((s) => !s.travel, 900);
await sc(() => window.__courseMap.step(30));
st = await sc(() => window.__courseMap.state());
check('Nach dem Warp: Figur am Start von Welt 2, Rückweg nach Welt 1 frei', Math.hypot(st.player.x + 10, st.player.z - 43.6) < 0.8 && st.entrances.W1.enterable && st.entrances['2-1'].enterable === st.entrances['2-1'].exists);
// zurück nach Welt 1: Ankunft hinter gesperrten Wegen → Schranke W2 öffnet, die übrigen lassen von hinten durch
await sc(() => { const m = window.__courseMap; m.teleport(-10, 1.3, 43.6, Math.PI / 2); m.step(20); });
await walkTo(-10, 41, (s) => s.onPad === 'W1', 400);
await sc(() => { const m = window.__courseMap; m.setInput({ jump: true }); m.step(1); m.setInput({}); });
await stepUntil(() => false, 900);
await waitMap(1);
await stepUntil((s) => !s.travel && !s.cinematic, 1500);
st = await sc(() => window.__courseMap.state());
check('Welt 1 nach dem Warp: Röhren-Schranke offen (Welt 2 offen), 1-Burg-Schranke zu', st.gates.W2 === 'open' && st.gates['1-Burg'] === 'closed' && st.entrances.W2.enterable);
// von hinten durch die 1-Burg-Schranke (x = 10) auf die Zirkuswiese
await sc(() => { const m = window.__courseMap; m.teleport(4, 1.3, -58, 0); m.step(20); });
r = await walkTo(16, -58, (s) => s.player.x > 13, 600);
await shot('schranke_hinten', 300);
st = await sc(() => window.__courseMap.step(240));
console.log('  hinter der Schranke', JSON.stringify(st.player), JSON.stringify(st.gates['1-Burg']));
check('Gesperrte Schranke lässt von hinten durch (Weg zurück zum Start) und schließt sich wieder', r.s.player.x > 13 && st.gates['1-Burg'] === 'closed'
  && (await sc(() => window.__courseMap.built.gates.find((g) => g.for === '1-Burg').pass)) === 0);
r = await sc(() => { const m = window.__courseMap; m.teleport(16, 1.3, -58, Math.PI); m.setInput({ x: -1, y: 0 }); m.step(240); m.setInput({}); return m.player.info(); });
check('… von vorn bleibt sie zu', r.x > 10.5);

// ------------------------------------------------------------------ 12) Anflug (Welt 2 betreten) und Kennzahlen
await loadWith({ world: 2, worlds: [1, 2], mapPos: null });
try { await page.waitForFunction(() => window.__courseMap && window.__courseMap.intro, null, { timeout: 90000 }); } catch { /* ohne Anflug */ }
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}cmap2_anflug.png`, timeout: 90000 });
{ const s = await sc(() => window.__courseMap?.intro ? window.__courseMap.stats() : null); if (s) stats.push(['anflug', s.calls, s.triangles]); }
await waitMap(2);
}
console.log('\n  Kennzahlen je Bild (Zeichenaufrufe inkl. Schattenpass, Dreiecke):');
for (const [n, c, t] of stats) console.log(`    ${n.padEnd(18)} ${String(c).padStart(4)} Aufrufe  ${String(Math.round(t / 1000)).padStart(4)} k Dreiecke`);
const w2stats = stats.filter(([n]) => !['w1_roehre', 'schranke_hinten', 'abfahrt'].includes(n));
const maxCalls = Math.max(...w2stats.map((s) => s[1])), maxTris = Math.max(...w2stats.map((s) => s[2]));
if (w2stats.length) check(`Kennzahlen Welt 2: Zeichenaufrufe < 120 (max ${maxCalls}), Dreiecke < 300 k (max ${Math.round(maxTris / 1000)} k)`, maxCalls < 120 && maxTris < 300000);

await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
