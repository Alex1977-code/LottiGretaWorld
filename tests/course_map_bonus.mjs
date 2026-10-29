// Karten der Bonuswelten Pilz „Pilz-Remix“ (Welt 10), Blume „Blumen-Remix“ (Welt 11) und Krone „Kronen-Gipfel“ (Welt 12) der
// Kurs-Karte (Präzisierung Mehrwelten-Karte, Notizen Welt Pilz / Welt Blume / Welt Krone):
//   Weltdaten (Schranken riegeln ab, Ids/Reihenfolge/Sternbedarf laut Vertrag „Bonuswelten – Level-Liste und Freischaltung“,
//   31/36/38 Sterne, Glasröhren WS/WB, WP/WK, WB; Sammel-Schranke K-1 über unlock.collection; Weltenkette worldOpen 10 → 11 → 12
//   inkl. Sternschranken 310/330) – Node; Ankunft in jeder Welt über die Röhre der Vorwelt (Welt 9 WP → Welt 10 an WS, Welt 10 WB
//   → Welt 11 an WP, Welt 11 WK → Welt 12 an WB – ohne Codeänderung in der Vorwelt); Freischaltung nacheinander (Schranken-Schwenk
//   nach der Rückkehr aus einem Level, Wege und Brücken begehbar), Sternschranken „Benötigt 310 Sterne (309/310)“ (P-7) und
//   „Benötigt 330 Sterne (329/330)“ (Röhre WK), Sammel-Schranke K-1 („Alle Sterne und Stempel nötig …“, Fortschritts-Tafel, mit
//   vollständiger Sammlung frei); Kartenmusik je Welt und Ersatzuhr ohne Musik; lebendige Kulisse im Takt (Leuchtpilze/Glühwürmchen,
//   Blüten/Schmetterlinge, Fahnen/Konfetti, Kulissen der Eingänge); Rückwege 12 → 11 → 10 → 9; Rückkehr aus P-/B-/K-Leveln
//   (Präfix); Abspann (?credits=1) nennt jede neue Welt genau einmal; Kennzahlen (< 120 Zeichenaufrufe, < 300 k Dreiecke an jeder
//   Ansicht inkl. Schattenpass); keine Konsolenfehler.
// Simulation deterministisch über window.__courseMap.step(n)/setInput; Bilder tests/out/cmapB_*.png zur Sichtprüfung.
// Aufruf: npm run build && node tests/course_map_bonus.mjs   (Teilläufe: MB_TEIL=pilz | blume | krone | wege, je unter 10 min;
// MB_TEIL=daten nur die Node-Prüfungen der Weltdaten)
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';
import { MAP as W1 } from '../src/course/map/worlds/w1.js';
import { MAP as W2 } from '../src/course/map/worlds/w2.js';
import { MAP as W3 } from '../src/course/map/worlds/w3.js';
import { MAP as W4 } from '../src/course/map/worlds/w4.js';
import { MAP as W5 } from '../src/course/map/worlds/w5.js';
import { MAP as W6 } from '../src/course/map/worlds/w6.js';
import { MAP as W7 } from '../src/course/map/worlds/w7.js';
import { MAP as W8 } from '../src/course/map/worlds/w8.js';
import { MAP as W9 } from '../src/course/map/worlds/w9.js';
import { MAP as W10 } from '../src/course/map/worlds/w10.js';
import { MAP as W11 } from '../src/course/map/worlds/w11.js';
import { MAP as W12 } from '../src/course/map/worlds/w12.js';
import { MAP as W31 } from '../src/course/map/worlds/w31.js';
import { buildWalkGrid, reachable, gateRects, gateSides, exitPoint } from '../src/course/map/layout.js';
import * as unlock from '../src/course/map/unlock.js';

const { check, summary } = makeChecker();
const ALL = [W1, W2, W3, W4, W5, W6, W7, W8, W9, W10, W11, W12, W31];
const MAPS = Object.fromEntries(ALL.map((m) => [m.world, m]));
const getMap = (n) => MAPS[n] ?? null;
const PIDS = ['P-1', 'P-2', 'P-3', 'P-4', 'P-5', 'P-Haus', 'P-6', 'P-7'];
const BIDS = ['B-1', 'B-2', 'B-5', 'B-3', 'B-4', 'B-6', 'B-7', 'B-8', 'B-9', 'B-10', 'B-11', 'B-12'];
const KIDS = ['K-Kapitän', 'K-Haus', 'K-1'];
const ruleOf = (M, id) => M.levels.find((l) => l.id === id);
const entOf = (M, id) => M.entrances.find((e) => e.id === id);
const ownLevels = (M) => M.levels.filter((l) => !l.next && (l.world ?? M.world) === M.world);

/** Jede Schranke riegelt ihren Bereich ab: mit den nacheinander geschafften Leveln ist genau erreichbar, was frei ist. */
function seals(M) {
  const grid = buildWalkGrid(M);
  const order = M.levels.map((l) => l.id);
  const after = Object.fromEntries(M.levels.map((l) => [l.id, [].concat(l.after ?? [])]));
  let ok = true;
  const open = new Set();
  for (let i = 0; i <= order.length; i++) {
    const done = new Set(order.slice(0, i));
    for (const id of order) if (after[id].every((a) => done.has(a))) open.add(id);
    const r = reachable(M, grid, open).ids.sort();
    const want = order.filter((id) => open.has(id)).sort();
    if (r.join() !== want.join()) { ok = false; console.log(`   Welt ${M.world} erreichbar`, r.join(), 'erwartet', want.join()); }
  }
  return ok;
}
const onGround = (M) => {
  const grid = buildWalkGrid(M);
  return M.entrances.every((e) => grid.isWalk(e.pos[0], e.pos[2]) && grid.isWalk(exitPoint(e)[0], exitPoint(e)[2])) && grid.isWalk(M.spawn.pos[0], M.spawn.pos[2])
    && (M.houses ?? []).every((h) => (h.item ? grid.isWalk(h.item[0], h.item[2]) : true) && (h.pad ? grid.isWalk(h.pad[0], h.pad[2]) : true));
};

/** Speicherstand-Eintrag eines Levels: so viele Sterne, wie die Regel verspricht (mind. 3 Felder), Stempel laut Regel. */
const entry = (rule, stars = true, stamp = true) => ({ done: true, stars: Array(Math.max(3, rule.stars ?? 3)).fill(false).map((_, i) => !!stars && i < (rule.stars ?? 3)),
  stamp: !!(stamp && rule.stamp), bestTime: null, bestPole: 0 });
/** Alle eigenen Level der Welten (mit allen Sternen und Stempeln bzw. ohne Sterne). */
function levelsOf(maps, stars = true, stamp = true) { const l = {}; for (const M of maps) for (const r of ownLevels(M)) l[r.id] = entry(r, stars, stamp); return l; }
const PRE = [W1, W2, W3, W4, W5, W6, W7, W8, W31, W9];
/** Welt 1–8, Halloween und Sternenzelt vollständig (alle Sterne und Stempel). */
const base9 = () => levelsOf(PRE);
/** Level ids einer Welt als geschafft (ohne Sterne) dazu. */
const withDone = (base, M, ids, stars = false) => { const l = { ...base }; for (const id of ids) l[id] = entry(ruleOf(M, id), stars); return l; };
const totalOf = (levels) => Object.values(levels).reduce((n, l) => n + l.stars.filter(Boolean).length, 0);
/** Sterne genau auf `target` bringen: zuerst bei den Leveln `ids` (der Reihe nach) Sterne an- bzw. abschalten. */
function adjustTo(levels, target, ids) {
  const l = JSON.parse(JSON.stringify(levels));
  let n = totalOf(l);
  for (const id of ids) {
    const e = l[id];
    if (!e) continue;
    for (let i = 0; i < e.stars.length && n !== target; i++) {
      if (n < target && !e.stars[i]) { e.stars[i] = true; n++; } else if (n > target && e.stars[i]) { e.stars[i] = false; n--; }
    }
    if (n === target) break;
  }
  return l;
}
/** Schranken aller Welten, deren Weg mit den geschafften Leveln frei ist (als geöffnet gemerkt – kein Schwenk). */
const openedFor = (maps, done) => maps.flatMap((M) => M.levels.filter((r) => r.after && [].concat(r.after).every((a) => done.includes(a))).map((r) => r.id));
const ALLIDS = (maps) => maps.flatMap((M) => M.levels.map((r) => r.id));
const OPEN_PRE = openedFor(PRE, ALLIDS(PRE));
const WORLDS = (n) => [...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((w) => w <= n), 31];

// ------------------------------------------------------------------ Weltdaten und Logik (Node, jeder Teillauf)
{
  const fake = (levels, worlds = [1]) => ({
    peek: (id) => levels[id] ?? null, totalStars: () => totalOf(levels), worldOpened: (n) => worlds.includes(n),
    starsInWorld: (w) => Object.entries(levels).filter(([k]) => k.startsWith(`${MAPS[w]?.prefix ?? w}-`) || k.startsWith(`${w}-`)).reduce((n, [, l]) => n + l.stars.filter(Boolean).length, 0),
  });
  const R10 = (id) => ruleOf(W10, id), R11 = (id) => ruleOf(W11, id), R12 = (id) => ruleOf(W12, id);
  // Welt Pilz
  check('Welt Pilz: jede Schranke riegelt ihren Bereich vollständig ab (Abzweig P-Haus nach P-4, Gabel P-7/WB nach P-6)', seals(W10));
  check('Welt Pilz: 8 Schranken (je 4 m breit), jede mit Rückseite', gateRects(W10, buildWalkGrid(W10)).length === 8
    && gateRects(W10, buildWalkGrid(W10)).every((g) => Math.abs(g.width - 4) < 0.01) && gateSides(W10, buildWalkGrid(W10)).every((g) => g.back !== 0));
  check('Welt Pilz: Ids und Reihenfolge (P-1 … P-5, P-Haus, P-6, P-7)', ownLevels(W10).map((l) => l.id).join() === PIDS.join());
  check('Welt Pilz: Freischaltung laut Vertrag (P-1 frei, P-2 … P-6 nacheinander, P-Haus nach P-4, P-7 nach P-6 und ≥ 310 Sternen – alle Sterne zählen)',
    !R10('P-1').after && R10('P-2').after === 'P-1' && R10('P-3').after === 'P-2' && R10('P-4').after === 'P-3' && R10('P-5').after === 'P-4' && R10('P-Haus').after === 'P-4'
    && R10('P-6').after === 'P-5' && R10('P-7').after === 'P-6' && R10('P-7').minStars === 310 && PIDS.filter((id) => R10(id).minStars).join() === 'P-7' && W10.starScope === 'all');
  check('Welt Pilz: 3 Sterne je Level, Prüfungs-Haus 10 (zusammen 31)', PIDS.every((id) => R10(id).stars === (id === 'P-Haus' ? 10 : 3)) && unlock.worldStarsMax(W10) === 31);
  check('Welt Pilz: Glasröhren zurück (WS → Welt 9, offen) und zur Welt Blume (WB → Welt 11, nach P-6, „Welt Blume“)',
    R10('WS').next === 9 && R10('WS').world === 9 && !R10('WS').after && R10('WB').next === 11 && R10('WB').world === 11 && R10('WB').after === 'P-6' && R10('WB').worldLabel === 'Welt Blume');
  check('Welt Pilz: Weltdaten (Welt 10, Präfix P, „Welt Pilz · Pilz-Remix“, Musik course_worldpilz_map, Thema map_pilz, Bausatz pilz)',
    W10.world === 10 && W10.prefix === 'P' && W10.worldLabel === 'Welt Pilz' && W10.title === 'Pilz-Remix' && W10.music === 'course_worldpilz_map' && W10.fallbackMusic === 'course_map'
    && W10.theme === 'map_pilz' && W10.kit === 'pilz');
  check('Welt Pilz: Eingänge mit Remix-Kulissen (Rollhügel bei Nacht … Blaulava, Prüfungs-Haus), Röhren WS/WB, Schild „ab 310 ★“',
    PIDS.map((id) => entOf(W10, id).kind).join() === 'nighthills,spikybean,darkjungle,shadowalley,dayhall,brawlhouse,giantwreck,brokenbelt'
    && W10.entrances.filter((e) => e.kind === 'pipe').map((e) => e.id).join() === 'WS,WB' && W10.signs.some((s) => s.text === 'ab 310 ★'));
  check('Welt Pilz: Eingänge, Ausgänge, Häuser und Start auf begehbarem Gelände; Pilzhüte steigen nach Norden (y 5 … 13)',
    onGround(W10) && entOf(W10, 'WS').pos[1] === 5 && entOf(W10, 'P-7').pos[1] === Math.max(...W10.ground.map((b) => b.top)) && entOf(W10, 'WB').pos[2] < entOf(W10, 'P-1').pos[2] - 140);
  // Welt Blume
  check('Welt Blume: jede Schranke riegelt ihren Bereich vollständig ab (Abzweig B-5 nach B-1)', seals(W11));
  check('Welt Blume: 12 Schranken (je 4 m breit), jede mit Rückseite', gateRects(W11, buildWalkGrid(W11)).length === 12
    && gateRects(W11, buildWalkGrid(W11)).every((g) => Math.abs(g.width - 4) < 0.01) && gateSides(W11, buildWalkGrid(W11)).every((g) => g.back !== 0));
  check('Welt Blume: Ids (B-1 … B-12, B-5 gleich nach B-1)', ownLevels(W11).map((l) => l.id).join() === BIDS.join());
  check('Welt Blume: Freischaltung laut Vertrag (B-1 frei, B-2 und B-5 nach B-1, B-3 … B-12 nacheinander, Röhre WK nach B-12 und ≥ 330 Sternen)',
    !R11('B-1').after && R11('B-2').after === 'B-1' && R11('B-5').after === 'B-1' && R11('B-3').after === 'B-2' && R11('B-4').after === 'B-3' && R11('B-6').after === 'B-4'
    && ['B-7', 'B-8', 'B-9', 'B-10', 'B-11', 'B-12'].every((id, i, a) => R11(id).after === (i ? a[i - 1] : 'B-6')) && BIDS.every((id) => !R11(id).minStars)
    && R11('WK').after === 'B-12' && R11('WK').minStars === 330 && W11.starScope === 'all');
  check('Welt Blume: 3 Sterne je Level (zusammen 36)', BIDS.every((id) => R11(id).stars === 3) && unlock.worldStarsMax(W11) === 36);
  check('Welt Blume: Glasröhren zurück (WP → Welt 10, offen) und zur Welt Krone (WK → Welt 12, „Welt Krone“)',
    R11('WP').next === 10 && !R11('WP').after && R11('WK').next === 12 && R11('WK').world === 12 && R11('WK').worldLabel === 'Welt Krone' && R11('WK').stars === 0);
  check('Welt Blume: Weltdaten (Welt 11, Präfix B, „Welt Blume · Blumen-Remix“, Musik course_worldblume_map, Thema map_blume, Bausatz blume)',
    W11.world === 11 && W11.prefix === 'B' && W11.worldLabel === 'Welt Blume' && W11.title === 'Blumen-Remix' && W11.music === 'course_worldblume_map' && W11.theme === 'map_blume' && W11.kit === 'blume');
  check('Welt Blume: Eingänge mit Remix-Kulissen (Zirkus … Boss-Marathon-Kuppel), Röhren WP/WK, Schild „ab 330 ★“',
    BIDS.map((id) => entOf(W11, id).kind).join() === 'sparkcircus,cubemine,bunnysavanna,torchcreek,clockfort,graymansion,cannonlagoon,beepskyway,sunsetbeach,dayhive,spotbridge,bossdome'
    && W11.entrances.filter((e) => e.kind === 'pipe').map((e) => e.id).join() === 'WP,WK' && W11.signs.some((s) => s.text === 'ab 330 ★'));
  check('Welt Blume: Eingänge, Ausgänge, Häuser und Start auf begehbarem Gelände; Gießkannen- und Stängel-Brücken je Steg begehbar',
    onGround(W11) && W11.segments.filter((s) => s.type === 'canbridge').length >= 5 && W11.segments.filter((s) => s.type === 'stembridge11').length >= 5 && W11.segments.length === W11.walk.length);
  // Welt Krone
  check('Welt Krone: keine Schranken, alle Eingänge vom Start aus erreichbar', W12.gates.length === 0 && seals(W12)
    && reachable(W12, buildWalkGrid(W12), new Set(W12.levels.map((l) => l.id))).ids.length === W12.levels.length);
  check('Welt Krone: Ids (K-Kapitän, K-Haus, K-1), K-Kapitän und K-Haus gleich frei, K-1 mit Sammel-Schranke; Sterne 5 + 30 + 3 = 38',
    ownLevels(W12).map((l) => l.id).join() === KIDS.join() && KIDS.every((id) => !R12(id).after && !R12(id).minStars) && R12('K-1').collection === true
    && R12('K-Kapitän').stars === 5 && R12('K-Haus').stars === 30 && R12('K-1').stars === 3 && unlock.worldStarsMax(W12) === 38);
  check('Welt Krone: Weltdaten (Welt 12, Präfix K, „Welt Krone · Kronen-Gipfel“, Musik course_worldkrone_map, Wolkenmeer) und Röhre WB → Welt 11',
    W12.world === 12 && W12.prefix === 'K' && W12.worldLabel === 'Welt Krone' && W12.title === 'Kronen-Gipfel' && W12.music === 'course_worldkrone_map' && W12.theme === 'map_krone'
    && W12.kit === 'krone' && R12('WB').next === 11 && !R12('WB').after && onGround(W12)
    && KIDS.map((id) => entOf(W12, id).kind).join() === 'lavadiorama,marathonhouse,championarch' && W12.flags.length >= 8 && W12.confetti.length >= 4);
  // Weltenkette
  const d3 = (id, M) => entry(ruleOf(M, id), true);
  const b9 = base9();
  const s7 = { ...b9 }; delete s7['S-8']; delete s7['S-9'];
  check('worldOpen: Welt 10 erst nach S-8 (oder entdeckt), Welt 11 erst nach P-6, Welt 12 erst nach B-12 und 330 Sternen',
    !unlock.worldOpen(getMap, fake(s7, WORLDS(9)), 10) && unlock.worldOpen(getMap, fake(b9, WORLDS(9)), 10) && unlock.worldOpen(getMap, fake({}, [...WORLDS(9), 10]), 10)
    && !unlock.worldOpen(getMap, fake(withDone(b9, W10, ['P-1', 'P-2', 'P-3', 'P-4', 'P-5']), WORLDS(10)), 11)
    && unlock.worldOpen(getMap, fake(withDone(b9, W10, ['P-1', 'P-2', 'P-3', 'P-4', 'P-5', 'P-6']), WORLDS(10)), 11)
    && !unlock.worldOpen(getMap, fake(adjustTo(withDone(levelsOf([...PRE, W10]), W11, BIDS), 329, PIDS), WORLDS(11)), 12)
    && unlock.worldOpen(getMap, fake(adjustTo(withDone(levelsOf([...PRE, W10]), W11, BIDS), 330, [...PIDS, ...BIDS]), WORLDS(11)), 12)
    && !unlock.worldOpen(getMap, fake(levelsOf(ALL), WORLDS(12)), 13));
  const l309 = adjustTo(withDone(b9, W10, PIDS.slice(0, 7)), 309, PIDS);
  check('P-7: Weg erst nach P-6; dann 310 Sterne nötig (309 reichen nicht, alle Sterne zählen); Röhre WB nach P-6 ohne Sternbedarf',
    unlock.reason(W10, fake(withDone(b9, W10, PIDS.slice(0, 6))), 'P-7') === 'locked' && unlock.reason(W10, fake(l309), 'P-7') === 'stars' && unlock.gateStars(W10, fake(l309)) === 309
    && unlock.reason(W10, fake(adjustTo(l309, 310, PIDS)), 'P-7') === null && unlock.reason(W10, fake(l309), 'WB') === null && unlock.reason(W10, fake({}), 'P-2') === 'locked'
    && unlock.reason(W10, fake({}), 'P-1') === null && unlock.reason(W10, fake({}), 'WS') === null);
  const l329 = adjustTo(withDone(levelsOf([...PRE, W10]), W11, BIDS), 329, [...PIDS, ...BIDS]);
  check('Röhre WK: Weg erst nach B-12, dann 330 Sterne nötig (329 reichen nicht); entdeckte Welt 12 öffnet sie ohne Sterne',
    unlock.reason(W11, fake(withDone(levelsOf([...PRE, W10]), W11, BIDS.slice(0, 11))), 'WK') === 'locked' && unlock.reason(W11, fake(l329), 'WK') === 'stars'
    && unlock.reason(W11, fake(adjustTo(l329, 330, [...PIDS, ...BIDS])), 'WK') === null && unlock.reason(W11, fake({}, [12]), 'WK') === null
    && unlock.reason(W11, fake({}), 'B-5') === 'locked' && unlock.reason(W11, fake(withDone({}, W11, ['B-1'])), 'B-5') === null);
  // Sammel-Schranke
  const others = ALL.filter((M) => M.world !== 12 && M.world !== 0);
  const full = levelsOf(others);
  const cFull = unlock.collection(ALL, fake(full), 12);
  const starsMax = others.reduce((n, M) => n + unlock.worldStarsMax(M), 0);
  const stampsMax = others.reduce((n, M) => n + ownLevels(M).filter((r) => r.stamp).length, 0);
  console.log(`  Sammlung: ${cFull.stars}/${cFull.starsMax} Sterne, ${cFull.stamps}/${cFull.stampsMax} Stempel, ${cFull.levels}/${cFull.levelsMax} Level (ohne Welt Krone)`);
  const noStar = JSON.parse(JSON.stringify(full)); noStar['3-2'].stars[1] = false;
  const noStamp = JSON.parse(JSON.stringify(full)); const stampId = ownLevels(W5).find((r) => r.stamp).id; noStamp[stampId].stamp = false;
  const noP = JSON.parse(JSON.stringify(full)); delete noP['B-7'];
  const cs = unlock.collection(ALL, fake(noStar), 12), cp = unlock.collection(ALL, fake(noStamp), 12), cb = unlock.collection(ALL, fake(noP), 12);
  check(`Sammlung = alle Sterne (${starsMax}) und Stempel (${stampsMax}) aller anderen Welten inkl. Halloween, Sternenzelt, Pilz und Blume`,
    cFull.complete && cFull.stars === starsMax && cFull.starsMax === starsMax && cFull.stamps === stampsMax && cFull.stampsMax === stampsMax && starsMax >= 366 && cFull.missing.length === 0);
  check(`Sammel-Schranke K-1: ein fehlender Stern (3-2), Stempel (${stampId}) oder Level (B-7) hält sie zu ('collection'), vollständig frei; K-Kapitän/K-Haus immer frei`,
    !cs.complete && cs.stars === starsMax - 1 && cs.missing[0] === '3-2' && !cp.complete && cp.stamps === stampsMax - 1 && cp.missing.includes(stampId) && !cb.complete && cb.missing.includes('B-7')
    && unlock.reason(W12, fake(noStar), 'K-1', ALL) === 'collection' && unlock.reason(W12, fake(full), 'K-1', ALL) === null && unlock.reason(W12, fake({}), 'K-Kapitän', ALL) === null
    && unlock.reason(W12, fake({}), 'K-Haus', ALL) === null && unlock.reason(W12, fake({}), 'WB', ALL) === null);
  const extra = JSON.parse(JSON.stringify(noStar)); extra['K-Haus'] = entry(R12('K-Haus')); extra['1-1'].stars = [true, true, true, true, true];
  const ce = unlock.collection(ALL, fake(extra), 12);
  check('Sammlung: Sterne der Welt Krone selbst und überzählige Sterne eines Levels gleichen keinen fehlenden aus (je Level höchstens laut Regel)', !ce.complete && ce.stars === starsMax - 1);
}

// ------------------------------------------------------------------ Browser
const TEIL = process.env.MB_TEIL ?? '';
const RUN = (t) => !TEIL || TEIL === t;
if (TEIL === 'daten') process.exit(summary([]) ? 0 : 1);   // nur die Node-Prüfungen
const PORT = 4975;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser({ hasTouch: true });
page.setDefaultNavigationTimeout(200000);
page.setDefaultTimeout(200000);
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const fail = async (msg) => { console.log(msg); for (const e of errors) console.log('  ', e); await browser.close(); stop(); process.exit(1); };
const stats = [];
const T0 = Date.now();
const sec = (name) => console.log(`  — ${name} (${Math.round((Date.now() - T0) / 1000)} s)`);
/** Screenshot nach mindestens 3 neuen Bildern (Software-Renderer), Kennzahlen merken. */
async function shot(name, wait = 500, snap = true, nFrames = null) {
  if (snap) await sc(() => window.__courseMap?.snapCamera());
  const f0 = await sc(() => window.__courseMap?.view?.frame ?? 0);
  await page.waitForFunction(([f, k]) => (window.__courseMap?.view?.frame ?? 0) >= f + k, [f0, nFrames ?? (snap ? 3 : 10)], { timeout: 150000 }).catch(() => {});
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__courseMap?.stats());
  if (s) stats.push([name, s.calls, s.triangles, await sc(() => window.__courseMap?.map.world)]);
  await page.screenshot({ path: `${OUT}cmapB_${name}.png`, timeout: 200000 });
  return s;
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
/** Spielstand in der laufenden Karte ändern und die Zustände der Eingänge neu berechnen (ohne Neuladen). */
const setLevels = (levels) => sc((l) => {
  const s = window.__courseSave, m = window.__courseMap;
  s.data.levels = l; s.save();
  m.computeStatuses();
  const st = m.state();
  for (const id of Object.keys(st.entrances)) st.entrances[id].pathOpen = m.status(id).pathOpen;
  return st;
}, levels);
const free = (s2, id) => !s2.entrances[id].locked && s2.entrances[id].pathOpen;
const shut = (s2, id) => s2.entrances[id].locked && !s2.entrances[id].pathOpen;
/** Auf das Podest der Glasröhre laufen, A drücken, Fahrt bis zum Szenenwechsel; liefert Meldung und Zustand bei der Abfahrt. */
async function ride(M, id, label) {
  const P = entOf(M, id).pos;
  await tp(P[0], P[1] + 0.3, P[2] + 3, -Math.PI / 2, 20);
  let rr = await walkTo(P[0], P[2], `(s) => s.onPad === '${id}'`, 600);
  const onPad = rr.s.onPad === id;
  await frames(2);
  const hint = await banner();
  await sc(() => { const m = window.__courseMap; m.hud.toast('', 0.01); m.step(2); m.setInput({ jump: true }); });
  const s1 = await sc(() => window.__courseMap.step(1));
  await sc(() => window.__courseMap.setInput({}));
  const msg = await toast();
  rr = await stepUntil((s) => s.travel?.phase === 'ride' && s.travel.t > 1.6, 600);
  await shot(`${label}_abfahrt`, 300);
  rr = await stepUntil(() => false, 900);
  return { onPad, hint, depart: s1.travel?.mode === 'depart', msg, leaving: rr.s.leaving === true };
}
/** Ankunft in der Zielwelt durch die Röhre `id`: weit draußen beginnen, vor dem Podest enden. */
async function arrive(M, id, label) {
  await waitMap(M.world);
  let st2 = await sc(() => window.__courseMap.state());
  const ex = exitPoint(entOf(M, id));
  const far = st2.travel?.mode === 'arrive' && st2.travel.entrance === id && Math.hypot(st2.player.x - ex[0], st2.player.z - ex[2]) > 30;
  await stepUntil((s) => s.travel?.t > 1.4, 400);
  await shot(`${label}_ankunft`, 300);
  await stepUntil((s) => !s.travel, 900);
  await sc(() => window.__courseMap.step(40));
  st2 = await sc(() => window.__courseMap.state());
  const near = Math.hypot(st2.player.x - ex[0], st2.player.z - ex[2]) < 0.8 && st2.player.mode === 'ground' && Math.abs(st2.player.y - entOf(M, id).pos[1]) < 0.05;
  return { far, near, st: st2 };
}
/** Takt-Kulisse prüfen: Musik mit handgesteuerter Taktuhr vorspulen; liefert Zustände um eine Zählzeit. */
const beatProbe = (key) => sc((k) => {
  const mu = window.__audio.music, m = window.__courseMap;
  const theme = m.musicName();
  if (!mu.beat().playing) mu.play(theme);
  mu.setManualClock(true);
  const bpm = mu.beat().bpm, spb = 60 / bpm;
  const D = () => { m.built.life.update(0.016, m.view.time); return m.state().decor[k]; };
  const t0 = D();
  mu.advanceClock((1 - (t0.beat % 1)) * spb + 0.05 * spb);
  const t1 = D();
  mu.advanceClock(0.55 * spb);
  const t2 = D();
  mu.advanceClock(0.45 * spb);
  const t3 = D();
  mu.setManualClock(false);
  return { theme, bpm, t0, t1, t2, t3 };
}, key);
const beatOk = (r) => r.t1.theme === r.theme && r.t1.source !== 'zeit' && r.t1.bpm === r.bpm && r.t1.step === (Math.floor(r.t0.beat) + 1) % 3 && r.t1.k > 0.9 && r.t2.step === r.t1.step
  && r.t2.k < 0.6 && r.t3.step === (r.t1.step + 1) % 3 && r.t3.k > 0.9 && r.t1.shown?.step === r.t1.step && Math.abs(r.t1.shown.k - r.t1.k) < 1e-3;
/** Ersatzuhr ohne Musik: Tempo der Kartenmusik, je Zählzeit wechselt die Gruppe. */
const fallbackProbe = (key, fnName) => sc(([k, fn]) => {
  const mu = window.__audio.music, m = window.__courseMap;
  mu.stop();
  const life = m.built.life;
  life.update(0.016, m.view.time);
  const d = m.state().decor[k];
  const want = mu.themeInfo(m.map.music)?.bpm ?? mu.themeInfo('course_map')?.bpm;
  const a = life[fn](10.02), b = life[fn](10.02 + 60 / want);
  return { d, want, a, b };
}, [key, fnName]);
/** Kulissen der Eingänge zu mehreren Zeitpunkten laufen lassen (Musik aus: Ersatzuhr folgt der übergebenen Zeit); die Figur steht
 *  dazu vor dem Eingang (Kulissen rechnen nur im Bild). */
async function decorAt(M, ids, times) {
  const out = {};
  for (const id of ids) {
    const P = entOf(M, id).pos;
    await sc(([p]) => { const m = window.__courseMap; m.teleport(p[0], p[1] + 0.3, p[2] + 2.6, -Math.PI / 2); m.step(5); m.snapCamera(); }, [P]);
    await frames(2);
    out[id] = await sc(([i, ts]) => {
      const m = window.__courseMap, e = m.built.entrances.get(i);
      return ts.map((t) => { for (const u of e?.updaters ?? []) u(0.016, t); return JSON.stringify(m.state().decor); });
    }, [id, times]);
  }
  return out;
}
async function frames(n = 3) {
  const f0 = await sc(() => window.__courseMap?.view?.frame ?? 0);
  await page.waitForFunction(([f, k]) => (window.__courseMap?.view?.frame ?? 0) >= f + k, [f0, n], { timeout: 120000 }).catch(() => {});
}
const decorKeys = (key, times) => sc(([k, ts]) => {
  const m = window.__courseMap;
  return ts.map((t) => { for (const e of m.built.entrances.values()) for (const u of e.updaters ?? []) u(0.016, t); m.built.life.update(0.016, t); return m.state().decor[k]; });
}, [key, times]);
const changes = (r) => Object.entries(r).filter(([, v]) => new Set(v).size > 1).map(([id]) => id);

await page.goto(`http://localhost:${port}/?map=1&scale=2&adapt=0`, { waitUntil: 'load' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'load' });
await waitMap();
let st, r;

// ================================================================== Teil „pilz“: Welt 9 → Welt 10, Freischaltung, Sternschranke 310, Kulisse
if (RUN('pilz')) {
  sec('pilz: Röhre WP im Sternenzelt → Ankunft im Pilz-Remix');
  await loadWith({ levels: base9(), mapOpened: [...OPEN_PRE], world: 9, worlds: WORLDS(9), coins: 0, mapPos: null });
  await waitMap(9);
  st = await sc(() => window.__courseMap.state());
  const sign = await sc(() => window.__courseMap.signOf('WP'));
  check('Sternenzelt nach S-8: Glasröhre WP frei, Ziel „Pilz-Remix“ (Karte vorhanden, keine Codeänderung in Welt 9), Schild „Welt Pilz / Pilz-Remix“',
    st.entrances.WP.enterable && st.entrances.WP.title === 'Pilz-Remix' && !st.entrances.WP.soon && sign === 'Welt Pilz\nPilz-Remix');
  r = await ride(W9, 'WP', 'w9');
  check(`A auf dem Podest der Pilz-Röhre startet die Fahrt (Hinweis „${r.hint}“, Meldung „${r.msg}“), danach Szenenwechsel`, r.onPad && r.hint.includes('Glasröhre') && r.depart
    && r.msg === 'Auf in den Pilz-Remix!' && r.leaving);
  r = await arrive(W10, 'WS', 'pilz');
  st = r.st;
  check('Welt 10 geladen: Ankunft durch die Rückweg-Röhre WS (weit draußen über dem Meer), danach vor der Röhre auf dem Ankunfts-Hut (y 5)', r.far && r.near && st.world === 10);
  check('Welt 10 gemerkt (offen, aktuelle Welt)', st.worlds.includes(10) && (await sc(() => JSON.parse(localStorage.getItem('lotti-greta-course-v1')).world)) === 10);
  const tot = totalOf(base9());
  check(`HUD: „Welt Pilz · Pilz-Remix“, Sterne gesamt ${tot}, Welt Pilz 0/31`, (await sc(() => window.__courseMap.hud.worldName.text)) === 'Welt Pilz · Pilz-Remix'
    && st.totalStars === tot && st.stars === 0 && st.starsMax === 31);
  r = await sc(() => ({ name: window.__courseMap.musicName(), has: !!window.__audio.music.themeInfo('course_worldpilz_map') }));
  check(`Musik der Pilz-Karte: course_worldpilz_map (vorhanden: ${r.has}; jetzt: ${r.name})`, r.has ? r.name === 'course_worldpilz_map' : r.name === 'course_map');
  check('Start im Pilz-Remix: nur P-1 frei, alle anderen zu, Rückweg-Röhre frei, Röhre WB zu, alle 8 Schranken zu',
    !st.entrances['P-1'].locked && PIDS.filter((id) => id !== 'P-1').every((id) => st.entrances[id].locked) && st.entrances.WS.enterable && st.entrances.WB.locked
    && Object.values(st.gates).length === 8 && Object.values(st.gates).every((g) => g === 'closed'));
  const titles = await sc((ids) => ids.map((id) => [window.__courseMap.status(id).title, window.__courseMap.status(id).exists]), PIDS);
  check('Eingänge im Pilz-Remix zeigen den Leveltitel bzw. „Bald“', titles.every(([t, ex]) => (ex ? t && t !== 'Bald' : t === 'Bald')));
  await shot('pilz_start', 700);

  sec('pilz: erstes Level, Rückkehr (Präfix P), Schranken-Schwenk');
  await loadWith({}, '&mapAlias=P-1:0-0');
  await waitMap(10);
  const P1 = entOf(W10, 'P-1').pos;
  await tp(P1[0], P1[1] + 0.3, P1[2] + 3, Math.PI / 2, 20);
  r = await walkTo(P1[0], P1[2], (s) => s.onPad === 'P-1', 900);
  await shot('pilz_p1', 500);
  st = await sc(() => { const m = window.__courseMap; m.enter(); m.step(1); return m.state(); });
  check('mapAlias: Enter auf dem Podest P-1 startet das (Ersatz-)Level', r.s.onPad === 'P-1' && st.leaving && st.lastStart?.entrance === 'P-1' && st.lastStart?.id === '0-0');
  await waitCourse();
  await sc(() => window.__course.exitToMap({ done: '0-0' }));
  await waitMap(10);
  st = await sc(() => window.__courseMap.state());
  const ex1 = exitPoint(entOf(W10, 'P-1'));
  check('Rückkehr aus dem Level: Welt 10 vor dem Rollhügel-Eingang, Ergebnis auf P-1, Schranke zu P-2 versinkt im Schwenk',
    st.world === 10 && Math.hypot(st.player.x - ex1[0], st.player.z - ex1[2]) < 0.8 && st.entrances['P-1'].done && st.cinematic);
  await shot('pilz_schwenk', 300, false, 3);
  r = await stepUntil((s) => !s.cinematic, 2400);
  check('Weg zu P-2 offen und frei, P-3 noch zu', r.s.gates['P-2'] === 'open' && !r.s.entrances['P-2'].locked && r.s.entrances['P-3'].locked);

  sec('pilz: Freischaltung nacheinander');
  const b9 = base9();
  const steps10 = [
    [[], ['P-1'], ['P-2', 'P-3', 'P-4', 'P-5', 'P-Haus', 'P-6', 'P-7', 'WB']],
    [['P-1'], ['P-2'], ['P-3']],
    [['P-1', 'P-2'], ['P-3'], ['P-4']],
    [['P-1', 'P-2', 'P-3'], ['P-4'], ['P-5', 'P-Haus']],
    [['P-1', 'P-2', 'P-3', 'P-4'], ['P-5', 'P-Haus'], ['P-6']],
    [['P-1', 'P-2', 'P-3', 'P-4', 'P-5'], ['P-6'], ['P-7', 'WB']],
    [['P-1', 'P-2', 'P-3', 'P-4', 'P-Haus', 'P-5'], ['P-6'], ['P-7', 'WB']],
  ];
  for (const [done, nowFree, stillShut] of steps10) {
    st = await setLevels(withDone(b9, W10, done));
    check(`${done.length ? `Nach ${done.slice(-2).join(' + ')}` : 'Ohne Pilz-Level'}: ${nowFree.join(', ')} frei, ${stillShut.join(', ')} noch zu`,
      nowFree.every((id) => free(st, id)) && stillShut.every((id) => shut(st, id)));
  }
  st = await setLevels(withDone(b9, W10, PIDS.slice(0, 7)));
  check(`Nach P-6 (${st.gateStars} Sterne): Röhre WB frei (Ziel „Blumen-Remix“), Weg zu P-7 offen, P-7 gesperrt (Sterne)`, free(st, 'WB') && st.entrances.WB.enterable
    && st.entrances.WB.title === 'Blumen-Remix' && st.entrances['P-7'].pathOpen && st.entrances['P-7'].locked && st.entrances['P-7'].reason === 'stars');

  sec('pilz: Sternschranke 310');
  const l309 = adjustTo(withDone(b9, W10, PIDS.slice(0, 7)), 309, PIDS);
  await loadWith({ levels: l309, mapOpened: [...OPEN_PRE, ...openedFor([W10], PIDS)], world: 10, worlds: WORLDS(10), mapPos: null });
  await waitMap(10);
  st = await sc(() => window.__courseMap.state());
  const P7 = entOf(W10, 'P-7').pos;
  await tp(P7[0], P7[1] + 0.3, P7[2]);
  await shot('pilz_p7', 700);
  const b309 = await banner();
  const noStart = !(await sc(() => { const m = window.__courseMap; m.enter(); return m.step(2).leaving; }));
  st = await setLevels(adjustTo(l309, 310, PIDS));
  console.log('  Hinweis:', b309);
  check('Hinweis „Benötigt 310 Sterne (309/310)“ am Blaulava-Hut, Enter startet nichts; mit 310 Sternen frei', b309 === 'Benötigt 310 Sterne (309/310)' && noStart
    && !st.entrances['P-7'].locked && st.gateStars === 310);

  sec('pilz: Brücken, Kulisse im Takt, Ersatzuhr');
  await loadWith({ levels: levelsOf([...PRE, W10]), mapOpened: [...OPEN_PRE, ...openedFor([W10], PIDS)], world: 10, worlds: WORLDS(10), mapPos: null });
  await waitMap(10);
  st = await sc(() => window.__courseMap.state());
  check('Alle Pilz-Level geschafft: alle 8 Schranken offen, alle Eingänge frei', Object.values(st.gates).every((g) => g === 'open') && PIDS.every((id) => !st.entrances[id].locked));
  const walk = async (from, to, test, label) => { await tp(from[0], from[1] + 0.3, from[2], Math.PI / 2, 20); const rr = await walkTo(to[0], to[1], test, 1400); check(label, test(rr.s)); return rr; };
  await walk([0, 5, 40], [16, 40], (s) => s.player.x > 13.5 && Math.abs(s.player.y - 5.5) < 0.1, 'Rankenbrücke: vom Ankunfts-Hut zum Nacht-Hut (y 5.5)');
  await walk([22, 7, -4], [22, -26], (s) => s.player.z < -23.5 && Math.abs(s.player.y - 8.5) < 0.1, 'Rankenbrücke: vom Sonnenuntergangs-Hut hinauf zum Dschungel-Hut (y 8.5)');
  await walk([-14, 9.5, -42], [-14, -64], (s) => s.player.z < -61.5 && Math.abs(s.player.y - 11) < 0.1, 'Stiel-Brücke: von der Schattengasse zur Fernost-Halle (y 11)');
  await walk([19, 12, -86], [19, -112], (s) => s.player.z < -109.5 && Math.abs(s.player.y - 12) < 0.1, 'Rankenbrücke: vom Wrack-Hut zum Röhren-Hut (y 12)');
  await walk([48, 13, -90], [48, -108], (s) => s.player.z < -106.5 && Math.abs(s.player.y - 13) < 0.1, 'Blaulava-Hut: Ring um das Lavabecken begehbar (y 13)');
  r = await beatProbe('glow');
  console.log('  Leuchtpilze:', JSON.stringify({ t0: [r.t0.step, r.t0.k], t1: [r.t1.step, r.t1.k], t2: [r.t2.step, r.t2.k], t3: [r.t3.step, r.t3.k], src: r.t1.source, theme: r.t1.theme, bpm: r.bpm }));
  check(`Leuchtpilze und Laternen pulsieren im Takt der Kartenmusik (${r.theme}, ${r.bpm} BPM): am Schlag hell, dann schwächer, Darstellung folgt`, beatOk(r));
  r = await fallbackProbe('glow', 'glowState');
  check(`Ohne Musik zählt die Ersatzuhr im Tempo der Pilz-Kartenmusik (${r.want} BPM)`, r.d.source === 'zeit' && r.d.bpm === r.want && r.a.step !== r.b.step && Math.abs(r.a.k - r.b.k) < 1e-3);
  r = await decorAt(W10, PIDS, [1, 2.3, 4.1, 6.2]);
  const moving10 = changes(r);
  check(`Lebendige Kulisse aller Pilz-Eingänge bewegt sich im Takt (${moving10.length}/${PIDS.length}: ${moving10.join(', ')})`, moving10.length === PIDS.length);
  r = await sc(() => { const d = window.__courseMap.state().decor; return { fire: d.fireflies, models: d.w10models, heavy: d.w10heavy, keys: Object.keys(d) }; });
  console.log('  Registry-Modelle Welt Pilz:', (r.models ?? []).join(', '), '| zu schwer:', JSON.stringify(r.heavy ?? {}));
  check(`Glühwürmchen (${r.fire?.n}), Kulissen-Infos je Eingang (Rollhügel … Prüfungs-Haus), Registry-Modelle in der Kulisse, keines zu schwer`,
    r.fire?.n >= 40 && ['nighthills', 'beanstalk', 'darkjungle', 'shadowalley', 'dayhall', 'giantwreck', 'brokenbelt', 'brawlhouse'].every((k) => r.keys.includes(k))
    && ['mond_gesicht', 'geisterschiff_wrack', 'warp_box', 'zylinder_walze', 'papierlaterne'].every((n) => (r.models ?? []).includes(n)) && Object.keys(r.heavy ?? {}).length === 0);
  await sc(() => window.__audio.music.play(window.__courseMap.musicName()));
  st = await sc(() => window.__courseMap.state());
  check('Beerenhaus auf dem Ankunfts-Hut bietet ein Power-up an', st.berry === true);
  for (const [name, pos] of [['pilz_hafen', [-6, 5, 42]], ['pilz_nacht', [24, 5.5, 32]], ['pilz_bohnen', [28, 7, 2]], ['pilz_dschungel', [24, 8.5, -30]], ['pilz_gasse', [-20, 9.5, -32]],
    ['pilz_haus', [-57, 9.5, -31]], ['pilz_halle', [-24, 11, -69]], ['pilz_wrack', [12, 12, -72]], ['pilz_lava', [56, 13, -90]], ['pilz_roehre', [19, 12, -112]]]) {
    await tp(pos[0], pos[1] + 0.3, pos[2], -Math.PI / 2, 30);
    await shot(name, 250);
  }
}

// ================================================================== Teil „blume“: Welt 10 → Welt 11, Freischaltung, Sternschranke 330, Kulisse
if (RUN('blume')) {
  sec('blume: Röhre WB im Pilz-Remix → Ankunft im Blumen-Remix');
  const l10 = levelsOf([...PRE, W10]);
  await loadWith({ levels: l10, mapOpened: [...OPEN_PRE, ...openedFor([W10], PIDS)], world: 10, worlds: WORLDS(10), coins: 0, mapPos: null });
  await waitMap(10);
  st = await sc(() => window.__courseMap.state());
  const sign = await sc(() => window.__courseMap.signOf('WB'));
  check('Pilz-Remix nach P-6: Glasröhre WB frei, Ziel „Blumen-Remix“, Schild „Welt Blume / Blumen-Remix“', st.entrances.WB.enterable && st.entrances.WB.title === 'Blumen-Remix'
    && sign === 'Welt Blume\nBlumen-Remix');
  r = await ride(W10, 'WB', 'pilz');
  check(`A auf dem Podest der Blumen-Röhre startet die Fahrt (Meldung „${r.msg}“), danach Szenenwechsel`, r.onPad && r.depart && r.msg === 'Auf in den Blumen-Remix!' && r.leaving);
  r = await arrive(W11, 'WP', 'blume');
  st = r.st;
  check('Welt 11 geladen: Ankunft durch die Rückweg-Röhre WP (weit draußen), danach vor der Röhre auf dem Rosen-Blatt (y 3)', r.far && r.near && st.world === 11 && st.worlds.includes(11));
  check(`HUD: „Welt Blume · Blumen-Remix“, Welt Blume 0/36, Sterne gesamt ${totalOf(l10)}`, (await sc(() => window.__courseMap.hud.worldName.text)) === 'Welt Blume · Blumen-Remix'
    && st.stars === 0 && st.starsMax === 36 && st.totalStars === totalOf(l10));
  r = await sc(() => ({ name: window.__courseMap.musicName(), has: !!window.__audio.music.themeInfo('course_worldblume_map') }));
  check(`Musik der Blumen-Karte: course_worldblume_map (vorhanden: ${r.has}; jetzt: ${r.name})`, r.has ? r.name === 'course_worldblume_map' : r.name === 'course_map');
  check('Start im Blumen-Remix: nur B-1 frei, Rückweg-Röhre frei, Röhre WK zu, alle 12 Schranken zu', !st.entrances['B-1'].locked && BIDS.filter((id) => id !== 'B-1').every((id) => st.entrances[id].locked)
    && st.entrances.WP.enterable && st.entrances.WK.locked && Object.values(st.gates).length === 12 && Object.values(st.gates).every((g) => g === 'closed'));
  await shot('blume_start', 700);

  sec('blume: Freischaltung nacheinander');
  const steps11 = [
    [[], ['B-1'], ['B-2', 'B-5', 'B-3', 'B-12', 'WK']],
    [['B-1'], ['B-2', 'B-5'], ['B-3']],
    [['B-1', 'B-2'], ['B-3'], ['B-4']],
    [['B-1', 'B-2', 'B-3'], ['B-4'], ['B-6']],
    [['B-1', 'B-2', 'B-3', 'B-4'], ['B-6'], ['B-7']],
    [['B-1', 'B-2', 'B-3', 'B-4', 'B-6'], ['B-7'], ['B-8']],
    [['B-1', 'B-2', 'B-3', 'B-4', 'B-6', 'B-7'], ['B-8'], ['B-9']],
    [['B-1', 'B-2', 'B-3', 'B-4', 'B-6', 'B-7', 'B-8'], ['B-9'], ['B-10']],
    [['B-1', 'B-2', 'B-3', 'B-4', 'B-6', 'B-7', 'B-8', 'B-9'], ['B-10'], ['B-11']],
    [['B-1', 'B-2', 'B-3', 'B-4', 'B-6', 'B-7', 'B-8', 'B-9', 'B-10'], ['B-11'], ['B-12']],
    [['B-1', 'B-2', 'B-3', 'B-4', 'B-6', 'B-7', 'B-8', 'B-9', 'B-10', 'B-11'], ['B-12'], ['WK']],
  ];
  const low = adjustTo(l10, 300, PIDS);
  for (const [done, nowFree, stillShut] of steps11) {
    st = await setLevels(withDone(low, W11, done));
    check(`${done.length ? `Nach ${done.slice(-2).join(' + ')}` : 'Ohne Blumen-Level'}: ${nowFree.join(', ')} frei, ${stillShut.join(', ')} noch zu`,
      nowFree.every((id) => free(st, id)) && stillShut.every((id) => shut(st, id)));
  }
  st = await setLevels(withDone(low, W11, BIDS));
  check(`Nach B-12 mit ${st.gateStars} Sternen: Weg zur Kronen-Röhre offen, Röhre gesperrt (Sterne)`, st.entrances.WK.pathOpen && st.entrances.WK.locked && st.entrances.WK.reason === 'stars');

  sec('blume: Sternschranke 330 an der Kronen-Röhre');
  const l329 = adjustTo(withDone(l10, W11, BIDS), 329, [...PIDS, ...BIDS]);
  await loadWith({ levels: l329, mapOpened: [...OPEN_PRE, ...openedFor([W10, W11], [...PIDS, ...BIDS])], world: 11, worlds: WORLDS(11), mapPos: null });
  await waitMap(11);
  const PK = entOf(W11, 'WK').pos;
  await tp(PK[0], PK[1] + 0.3, PK[2] + 3, -Math.PI / 2, 20);
  r = await walkTo(PK[0], PK[2], (s) => s.onPad === 'WK', 600);
  await shot('blume_wk', 700);
  const b329 = await banner();
  await sc(() => { const m = window.__courseMap; m.hud.toast('', 0.01); m.step(2); m.enter(); m.step(1); });
  const t329 = await toast();
  st = await sc(() => { const m = window.__courseMap; m.setInput({ jump: true }); m.step(1); m.setInput({}); return m.step(3); });
  console.log('  Hinweis:', b329, '| Meldung:', t329);
  check('Kronen-Röhre: „Benötigt 330 Sterne (329/330)“, A startet keine Fahrt', r.s.onPad === 'WK' && b329 === 'Benötigt 330 Sterne (329/330)' && !st.travel && !st.leaving
    && t329 === 'Benötigt 330 Sterne');
  st = await setLevels(adjustTo(l329, 330, [...PIDS, ...BIDS]));
  check('Mit 330 Sternen: Kronen-Röhre frei, Ziel „Kronen-Gipfel“, Schild „Welt Krone / Kronen-Gipfel“', !st.entrances.WK.locked && st.entrances.WK.enterable && st.entrances.WK.title === 'Kronen-Gipfel'
    && (await sc(() => window.__courseMap.signOf('WK'))) === 'Welt Krone\nKronen-Gipfel');

  sec('blume: Brücken, Kulisse im Takt, Ersatzuhr');
  await loadWith({ levels: levelsOf([...PRE, W10, W11]), mapOpened: [...OPEN_PRE, ...openedFor([W10, W11], [...PIDS, ...BIDS])], world: 11, worlds: WORLDS(11), mapPos: null });
  await waitMap(11);
  st = await sc(() => window.__courseMap.state());
  check('Alle Blumen-Level geschafft: alle 12 Schranken offen, alle Eingänge frei', Object.values(st.gates).every((g) => g === 'open') && BIDS.every((id) => !st.entrances[id].locked));
  const walk = async (from, to, test, label) => { await tp(from[0], from[1] + 0.3, from[2], Math.PI / 2, 20); const rr = await walkTo(to[0], to[1], test, 1400); check(label, test(rr.s)); return rr; };
  await walk([0, 3, 40], [16, 40], (s) => s.player.x > 13.5 && Math.abs(s.player.y - 3.5) < 0.1, 'Gießkannen-Brücke: vom Rosen-Blatt zum Zirkus-Blatt (y 3.5)');
  await walk([34, 3.5, 28], [56, 28], (s) => s.player.x > 53.5 && Math.abs(s.player.y - 4.5) < 0.1, 'Stängel-Brücke: zum Savannen-Blatt (B-5, y 4.5)');
  await walk([30, 9.5, -86], [48, -86], (s) => s.player.x > 45.5 && Math.abs(s.player.y - 10.5) < 0.1, 'Stängel-Brücke: von der Lagune zum Piep-Block-Blatt (y 10.5)');
  await walk([-22, 13.5, -156], [-22, -176], (s) => s.player.z < -173.5 && Math.abs(s.player.y - 15) < 0.1, 'Stängel-Brücke: von der Stachelbrücke hinauf zur Sternenkuppel (y 15)');
  await walk([-10, 15, -196], [8, -196], (s) => s.player.x > 5.5 && Math.abs(s.player.y - 15) < 0.1, 'Gießkannen-Brücke: von der Sternenkuppel zum Röhren-Blatt (y 15)');
  r = await beatProbe('bloom');
  console.log('  Blüten:', JSON.stringify({ t0: [r.t0.step, r.t0.k], t1: [r.t1.step, r.t1.k], t2: [r.t2.step, r.t2.k], t3: [r.t3.step, r.t3.k], src: r.t1.source, theme: r.t1.theme, bpm: r.bpm }));
  check(`Blüten und Laternen pulsieren im Takt der Kartenmusik (${r.theme}, ${r.bpm} BPM), Darstellung folgt`, beatOk(r));
  r = await fallbackProbe('bloom', 'bloomState');
  check(`Ohne Musik zählt die Ersatzuhr im Tempo der Blumen-Kartenmusik (${r.want} BPM)`, r.d.source === 'zeit' && r.d.bpm === r.want && r.a.step !== r.b.step && Math.abs(r.a.k - r.b.k) < 1e-3);
  r = await decorAt(W11, BIDS, [1, 2.3, 4.1, 6.2]);
  const moving11 = changes(r);
  check(`Lebendige Kulisse aller Blumen-Eingänge bewegt sich im Takt (${moving11.length}/${BIDS.length}: ${moving11.join(', ')})`, moving11.length === BIDS.length);
  r = await decorKeys('butterflies', [1, 1.37]);
  const r2 = await sc(() => { const d = window.__courseMap.state().decor; return { petals: d.petals, drops: d.drops, models: d.w11models, heavy: d.w11heavy, keys: Object.keys(d) }; });
  console.log('  Registry-Modelle Welt Blume:', (r2.models ?? []).join(', '), '| zu schwer:', JSON.stringify(r2.heavy ?? {}));
  check(`Schmetterlinge flattern (${r[0].n}, Flügel ${r[0].open} → ${r[1].open}), Blütenblätter (${r2.petals?.n}), Tropfen aus den Gießkannen (${r2.drops?.roses})`,
    r[0].n >= 20 && r[0].open !== r[1].open && r2.petals?.n >= 20 && r2.drops?.roses >= 3);
  check('Kulissen-Infos je Eingang (Zirkus … Boss-Kuppel) und Registry-Modelle in der Kulisse',
    ['sparkcircus', 'cubemine', 'savanna', 'torches', 'clockfort', 'graymansion', 'lagoon', 'beep', 'beach', 'dayhive', 'spotbridge', 'bossdome'].every((k) => r2.keys.includes(k))
    && ['zirkuszelt', 'funkenflaemmchen', 'helm_kanone', 'suchscheinwerfer', 'bossblitz_box_deko', 'wabensaeule', 'spuk'].every((n) => (r2.models ?? []).includes(n))
    && Object.keys(r2.heavy ?? {}).length === 0 && (r2.models ?? []).includes('schacht_geruest'));
  await sc(() => window.__audio.music.play(window.__courseMap.musicName()));
  for (const [name, pos] of [['blume_hafen', [-6, 3, 42]], ['blume_zirkus', [22, 3.5, 32]], ['blume_savanne', [62, 4.5, 20]], ['blume_mine', [28, 5, 2]], ['blume_fackeln', [24, 6.5, -30]],
    ['blume_uhr', [-16, 7.5, -30]], ['blume_spuk', [-24, 9, -69]], ['blume_lagune', [12, 9.5, -72]], ['blume_piep', [54, 10.5, -90]], ['blume_strand', [52, 11.5, -133]],
    ['blume_waben', [14, 12.5, -143]], ['blume_suchlicht', [-30, 13.5, -143]], ['blume_kuppel', [-22, 15, -181]], ['blume_roehre', [14, 15, -189]]]) {
    await tp(pos[0], pos[1] + 0.3, pos[2], -Math.PI / 2, 30);
    await shot(name, 250);
  }
}

// ================================================================== Teil „krone“: Welt 11 → Welt 12, Sammel-Schranke, Kulisse
if (RUN('krone')) {
  sec('krone: Röhre WK im Blumen-Remix → Ankunft auf dem Kronen-Gipfel');
  const others = ALL.filter((M) => M.world !== 12);
  const full = levelsOf(others);
  const oneStamp = JSON.parse(JSON.stringify(full));
  const stampId = ownLevels(W3).find((x) => x.stamp).id;
  oneStamp[stampId].stamp = false;
  await loadWith({ levels: oneStamp, mapOpened: [...OPEN_PRE, ...openedFor([W10, W11], [...PIDS, ...BIDS])], world: 11, worlds: WORLDS(11), coins: 0, mapPos: null });
  await waitMap(11);
  r = await ride(W11, 'WK', 'blume');
  check(`A auf dem Podest der Kronen-Röhre startet die Fahrt (Meldung „${r.msg}“), danach Szenenwechsel`, r.onPad && r.depart && r.msg === 'Auf zum Kronen-Gipfel!' && r.leaving);
  r = await arrive(W12, 'WB', 'krone');
  st = r.st;
  check('Welt 12 geladen: Ankunft durch die Rückweg-Röhre WB (aus dem Wolkenmeer), danach vor der Röhre auf der Ankunfts-Terrasse (y 10)', r.far && r.near && st.world === 12 && st.worlds.includes(12));
  check('HUD: „Welt Krone · Kronen-Gipfel“, Welt Krone 0/38', (await sc(() => window.__courseMap.hud.worldName.text)) === 'Welt Krone · Kronen-Gipfel' && st.stars === 0 && st.starsMax === 38);
  r = await sc(() => ({ name: window.__courseMap.musicName(), has: !!window.__audio.music.themeInfo('course_worldkrone_map') }));
  check(`Musik der Kronen-Karte: course_worldkrone_map (vorhanden: ${r.has}; jetzt: ${r.name})`, r.has ? r.name === 'course_worldkrone_map' : r.name === 'course_map');
  check('Start auf dem Kronen-Gipfel: K-Kapitän und K-Haus frei, K-1 gesperrt (Sammlung unvollständig), Rückweg-Röhre frei, keine Schranken',
    !st.entrances['K-Kapitän'].locked && !st.entrances['K-Haus'].locked && st.entrances['K-1'].locked && st.entrances['K-1'].reason === 'collection' && st.entrances.WB.enterable
    && Object.keys(st.gates).length === 0);
  const coll = st.entrances['K-1'].collection;
  console.log('  Sammlung:', JSON.stringify(coll));
  check(`Sammlungsstand an K-1: ★ ${coll?.stars}/${coll?.starsMax}, Stempel ${coll?.stamps}/${coll?.stampsMax} (ein Stempel fehlt: ${stampId})`,
    coll && coll.stars === coll.starsMax && coll.stamps === coll.stampsMax - 1 && coll.missing.includes(stampId) && !coll.complete);
  await shot('krone_start', 700);
  const K1 = entOf(W12, 'K-1').pos;
  await tp(K1[0], K1[1] + 0.3, K1[2] + 3, -Math.PI / 2, 20);
  r = await walkTo(K1[0], K1[2], (s) => s.onPad === 'K-1', 600);
  await shot('krone_k1', 700);
  const bK = await banner();
  st = await sc(() => { const m = window.__courseMap; m.hud.toast('', 0.01); m.step(2); m.enter(); return m.step(2); });
  const tK = await toast();
  const want = `Alle Sterne und Stempel nötig (★ ${coll.starsMax}/${coll.starsMax} · Stempel ${coll.stampsMax - 1}/${coll.stampsMax})`;
  console.log('  Hinweis:', bK, '| Meldung:', tK);
  check(`K-1: Hinweis „${want}“, Enter startet nichts (gleiche Meldung)`, r.s.onPad === 'K-1' && bK === want && tK === want && !st.leaving);
  r = await sc(() => window.__courseMap.state().decor.champion);
  check(`Fortschritts-Tafel und Startbogen: Sammlung offen (${r.open}), ★ ${r.stars}/${r.starsMax}, Stempel ${r.stamps}/${r.stampsMax}, Bogen/Podest/Freunde (${r.friends})`,
    r.open === false && r.stars === coll.stars && r.stamps === coll.stamps && r.arch && r.podest && r.friends >= 5);
  st = await setLevels(full);
  check('Mit vollständiger Sammlung: K-1 frei (Weg und Eingang), Grund weg', !st.entrances['K-1'].locked && st.entrances['K-1'].reason === null && st.entrances['K-1'].collection.complete);

  sec('krone: Treppen, Kulisse im Takt, Ersatzuhr');
  await loadWith({ levels: full, world: 12, worlds: WORLDS(12), mapPos: null });
  await waitMap(12);
  st = await sc(() => window.__courseMap.state());
  r = await sc(() => window.__courseMap.state().decor.champion);
  check('Neu geladen mit vollständiger Sammlung: K-1 frei, Kette am Startbogen weg (Sammlung vollständig)', !st.entrances['K-1'].locked && r.open === true && r.stars === r.starsMax && r.stamps === r.stampsMax);
  const walk = async (from, to, test, label) => { await tp(from[0], from[1] + 0.3, from[2], Math.PI / 2, 20); const rr = await walkTo(to[0], to[1], test, 1400); check(label, test(rr.s)); return rr; };
  await walk([-12, 10, 38], [-30, 38], (s) => s.player.x < -27.5 && Math.abs(s.player.y - 12.5) < 0.1, 'Goldtreppe: von der Ankunfts-Terrasse hinauf zur West-Terrasse (y 12.5)');
  await walk([12, 10, 38], [30, 38], (s) => s.player.x > 27.5 && Math.abs(s.player.y - 12.5) < 0.1, 'Goldtreppe: hinauf zur Ost-Terrasse (y 12.5)');
  await walk([0, 10, 34], [0, 4], (s) => s.player.z < 6 && Math.abs(s.player.y - 16) < 0.1, 'Große Treppe: hinauf zum Siegerplatz (y 16)');
  r = await beatProbe('fest');
  console.log('  Fest:', JSON.stringify({ t0: [r.t0.step, r.t0.k, r.t0.cannon], t1: [r.t1.step, r.t1.k, r.t1.cannon], t3: [r.t3.step, r.t3.k, r.t3.cannon], src: r.t1.source, theme: r.t1.theme, bpm: r.bpm }));
  check(`Goldlaternen pulsieren und Konfetti-Kanonen schießen reihum im Takt der Kartenmusik (${r.theme}, ${r.bpm} BPM)`, beatOk(r) && r.t1.cannon !== r.t3.cannon);
  r = await fallbackProbe('fest', 'festState');
  check(`Ohne Musik zählt die Ersatzuhr im Tempo der Kronen-Kartenmusik (${r.want} BPM)`, r.d.source === 'zeit' && r.d.bpm === r.want && r.a.step !== r.b.step && Math.abs(r.a.k - r.b.k) < 1e-3);
  r = await decorAt(W12, KIDS, [1, 2.3, 4.1, 6.2]);
  const moving12 = changes(r);
  check(`Lebendige Kulisse: Lava im Diorama steigt und sinkt, Fenster des Marathon-Hauses leuchten reihum, Freunde hüpfen (${moving12.join(', ')})`, moving12.length === KIDS.length);
  r = await sc(() => { const d = window.__courseMap.state().decor; return { conf: d.confetti, flags: d.flags, models: d.w12models, heavy: d.w12heavy }; });
  console.log('  Registry-Modelle Welt Krone:', (r.models ?? []).join(', '), '| zu schwer:', JSON.stringify(r.heavy ?? {}));
  check(`Konfetti (${r.conf?.cannons} Kanonen, ${r.conf?.n} Schnipsel), Fahnen (${r.flags?.n}), Siegerpodest mit Krone, großer Pokal, Startbogen aus der Registry`,
    r.conf?.cannons >= 4 && r.conf?.n >= 100 && r.flags?.n >= 8 && ['krone_podest', 'pokal_gross', 'start_bogen', 'kruemel', 'propellerplattform'].every((n) => (r.models ?? []).includes(n))
    && Object.keys(r.heavy ?? {}).length === 0);
  await sc(() => window.__audio.music.play(window.__courseMap.musicName()));
  for (const [name, pos] of [['krone_terrasse', [0, 10, 44]], ['krone_kapitaen', [-36, 12.5, 40]], ['krone_haus', [36, 12.5, 40]], ['krone_treppe', [0, 13, 18]], ['krone_siegerplatz', [0, 16, 0]],
    ['krone_podest', [6, 16, -2]], ['krone_bogen', [0, 16, -12]]]) {
    await tp(pos[0], pos[1] + 0.3, pos[2], -Math.PI / 2, 30);
    await shot(name, 250);
  }
}

// ================================================================== Teil „wege“: Rückwege 12 → 11 → 10 → 9, Rückkehr aus Leveln, Abspann, Neuladen
if (RUN('wege')) {
  sec('wege: Rückweg Kronen-Gipfel → Blumen-Remix');
  const full = levelsOf(ALL.filter((M) => M.world !== 12));
  const opened = [...OPEN_PRE, ...openedFor([W10, W11], [...PIDS, ...BIDS])];
  await loadWith({ levels: full, mapOpened: opened, world: 12, worlds: WORLDS(12), coins: 0, mapPos: null });
  await waitMap(12);
  r = await ride(W12, 'WB', 'krone');
  check('Rückweg-Röhre auf dem Kronen-Gipfel startet die Fahrt in den Blumen-Remix', r.onPad && r.depart && r.leaving);
  r = await arrive(W11, 'WK', 'wege11');
  check('Welt 11: Ankunft durch die Kronen-Röhre WK, danach vor ihr auf dem Röhren-Blatt (y 15); Röhre frei mit Ziel „Kronen-Gipfel“',
    r.far && r.near && r.st.world === 11 && r.st.entrances.WK.enterable && r.st.entrances.WK.title === 'Kronen-Gipfel');
  sec('wege: Rückweg Blumen-Remix → Pilz-Remix');
  r = await ride(W11, 'WP', 'wege11');
  check('Rückweg-Röhre im Blumen-Remix startet die Fahrt in den Pilz-Remix', r.onPad && r.depart && r.leaving);
  r = await arrive(W10, 'WB', 'wege10');
  check('Welt 10: Ankunft durch die Blumen-Röhre WB, danach vor ihr auf dem Röhren-Hut (y 12)', r.far && r.near && r.st.world === 10 && r.st.entrances.WB.enterable);
  sec('wege: Rückweg Pilz-Remix → Sternenzelt');
  r = await ride(W10, 'WS', 'wege10');
  check('Rückweg-Röhre im Pilz-Remix startet die Fahrt ins Sternenzelt', r.onPad && r.depart && r.leaving);
  r = await arrive(W9, 'WP', 'wege9');
  check('Welt 9: Ankunft durch die Pilz-Röhre WP, danach vor ihr auf der Röhren-Insel (y 19.5); Röhre frei mit Ziel „Pilz-Remix“',
    r.far && r.near && r.st.world === 9 && r.st.entrances.WP.enterable && r.st.entrances.WP.title === 'Pilz-Remix');

  sec('wege: Rückkehr aus P-/B-/K-Leveln, Weltenliste');
  r = await sc(() => ({ list: window.__courseMap.worldList(), wo: ['P-1', 'P-Haus', 'B-12', 'B-5', 'K-1', 'K-Kapitän', 'S-9', '8-Burg'].map((id) => window.__courseMap.worldOfLevel(id)) }));
  check(`Weltenliste mit den Welten 10–12 nach Welt 9 (${r.list.join()}), worldOfLevel: P → 10, B → 11, K → 12`, r.list.join() === '1,2,3,4,5,6,7,8,9,10,11,12,31'
    && r.wo.join() === '10,10,11,11,12,12,9,8');
  for (const [from, M] of [['B-3', W11], ['K-Haus', W12], ['P-Haus', W10]]) {
    await sc((f) => { const s = window.__courseSave; s.data.world = 1; s.save(); window.__courseMap.leaving = true; window.__courseMap.scene.start('CourseMap', { from: f }); }, from);
    await waitMap(M.world);
    st = await sc(() => window.__courseMap.state());
    const ex = exitPoint(entOf(M, from));
    check(`Rückkehr aus ${from} (from: „${from}“) zeigt Welt ${M.world} vor dem Eingang`, st.world === M.world && Math.hypot(st.player.x - ex[0], st.player.z - ex[2]) < 0.8);
  }
  const remembered = await sc(() => { const m = window.__courseMap; m.rememberPos(); return [m.player.pos.x, m.player.pos.z]; });
  await page.reload({ waitUntil: 'load' });
  await waitMap();
  st = await sc(() => window.__courseMap.state());
  check('Nach Neuladen: wieder Welt 10 an der gemerkten Stelle', st.world === 10 && Math.hypot(st.player.x - remembered[0], st.player.z - remembered[1]) < 0.8);

  sec('wege: Abspann');
  await page.goto(`http://localhost:${port}/?credits=1&scale=2&adapt=0`, { waitUntil: 'load' });
  try { await page.waitForFunction(() => window.__credits && window.__game.scene.isActive('Credits'), null, { timeout: 150000 }); } catch { await fail('Abspann startet nicht.'); }
  await page.waitForTimeout(800);
  r = await sc(() => {
    const c = window.__credits;
    c.setManual?.(true);
    const texts = (c.lines ?? []).map((l) => (Array.isArray(l) ? l[0] : l)).filter((x) => typeof x === 'string');
    const reise = texts.filter((x) => /^(Welt \d+|Welt Stern|Welt Pilz|Welt Blume|Welt Krone|Halloween) · /.test(x));
    const n = (s) => texts.filter((x) => x === s).length;
    return { reise, pilz: n('Welt Pilz · Pilz-Remix'), blume: n('Welt Blume · Blumen-Remix'), krone: n('Welt Krone · Kronen-Gipfel'), star: n('Welt Stern · Sternenzelt'),
      anyPilz: texts.filter((x) => x.includes('Pilz-Remix')).length, anyBlume: texts.filter((x) => x.includes('Blumen-Remix')).length, anyKrone: texts.filter((x) => x.includes('Kronen-Gipfel')).length };
  });
  console.log('  Abspann – die Reise:', r.reise.join(' | '));
  const iS = r.reise.indexOf('Welt Stern · Sternenzelt');
  check('Abspann (?credits=1) nennt „Welt Pilz · Pilz-Remix“, „Welt Blume · Blumen-Remix“ und „Welt Krone · Kronen-Gipfel“ je genau einmal, nach Welt Stern in Weltreihenfolge',
    r.pilz === 1 && r.blume === 1 && r.krone === 1 && r.star === 1 && r.anyPilz === 1 && r.anyBlume === 1 && r.anyKrone === 1
    && r.reise.indexOf('Welt Pilz · Pilz-Remix') === iS + 1 && r.reise.indexOf('Welt Blume · Blumen-Remix') === iS + 2 && r.reise.indexOf('Welt Krone · Kronen-Gipfel') === iS + 3);
  await sc(() => window.__credits.advance?.(30));
  await page.screenshot({ path: `${OUT}cmapB_abspann.png`, timeout: 200000 });
}

console.log(`  — Ende (${Math.round((Date.now() - T0) / 1000)} s)`);
for (const w of [10, 11, 12]) {
  const s = await sc((ww) => (window.__courseMap?.map.world === ww ? window.__courseMap.stats() : null), w);
  if (s) console.log(`\n  Statische Kulisse Welt ${w}: ${s.staticMeshes} Kachel-Meshes, ${Math.round(s.staticTriangles / 1000)} k Dreiecke, ${s.shapes} Kollisionsformen`);
}
console.log('  Kennzahlen je Bild (Zeichenaufrufe inkl. Schattenpass, Dreiecke):');
for (const [n, c, t, w] of stats) console.log(`    ${n.padEnd(22)} ${String(c).padStart(4)} Aufrufe  ${String(Math.round(t / 1000)).padStart(4)} k Dreiecke  (Welt ${w})`);
for (const w of [9, 10, 11, 12]) {
  const ws = stats.filter(([, , , ww]) => ww === w);
  if (!ws.length) continue;
  const maxCalls = Math.max(...ws.map((s) => s[1])), maxTris = Math.max(...ws.map((s) => s[2]));
  check(`Kennzahlen Welt ${w}: Zeichenaufrufe < 120 (max ${maxCalls}), Dreiecke < 300 k (max ${Math.round(maxTris / 1000)} k)`, maxCalls < 120 && maxTris < 300000);
}

await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
