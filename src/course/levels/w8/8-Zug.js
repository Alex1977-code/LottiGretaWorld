// 8-Zug „Brummbär-Express im Abendrot“ – Welt 8 (Archetyp autoscroller + boss, Bauplan 8-Zug): Am Bahnhof Rummelreich steht
// Baron Brummbärs Express unter Dampf – violette Wagen mit Goldkante, die rote Lok mit Bärengesicht und Monokel. Wer auf den
// Aussichtswagen steigt, fährt ab: der Zug braust im Abendrot über ein Viadukt durchs Rummeltal, das Bildfenster gleitet dabei
// über die Wagen nach vorn. Hackvögel und Schubser auf Güterwagen, offene Wasserbecken mit Wutkaulquappen, der Salonwagen
// voller Mini-Pilzlinge, ein Hammer-Werfer vor der Bossröhre – und auf der Drehbühne des vorausfahrenden Bühnenzugs wartet
// die Schattenläuferin zum zweiten Kampf. Nach dem Sieg trägt die Warp-Box zum Zielwagen.
//
// Fahrt-Illusion (Entscheidung wie die Laufband-Illusion der Bossstraße): Der Zug steht in Weltkoordinaten still, Gleisbett,
// Viadukt, Talboden, Laternen, Fahnen, Bäume und der Startbahnhof ziehen mit dem Fahrweg S(t) vorbei (Uhr = Fahrt-Uhr des
// Bildfensters, deterministisch; _helpers_b.js fahrtIllusion). Springen auf dem Zug fühlt sich an wie auf festem Boden.
//
// Abschnitte (Wagen von hinten nach vorn, z ab 0 nach −Z):
//   1 Bahnsteig + Aussichtswagen  Einsteigen (Abfahrt 1,5 s danach), Stern 1 gleich oben auf dem Dach
//   2 Hackvogel-Wagen (60 m)      Güterwagen-Dächer mit Hackvögeln, Steinblock-Ladung, zwei Gitterwagen mit Schubsern
//   3 Wasserbecken (40 m)         zwei offene Becken mit Wutkaulquappen, dazwischen Kontrollpunkt und Sternring (Stern 2)
//   4 Mini-Pilzling-Salon (18 m)  Doppelstock-Salon: ?-Block (Krallen-Anzug) und der Hebeblock – Stampfen fährt ihn durch die
//                                 Deckenluke in die Glaskuppel (Stempel)
//   5 Gepäckwagen, Röhre (30 m)   übers Dach (Kistentreppe) – oder durch die goldene Luke in den Gang mit dem Feuer-Werfer
//                                 (Stern 3); der Hammer-Werfer bewacht die Bossröhre, deren Deckel erst beim Halt aufspringt
//   6 Drehbühne (Arena 25 m)      Schattenläuferin 2 auf dem Bühnenwagen des vorausfahrenden Zugs (z −400), danach Warp-Box
//                                 zum Zielwagen
// Geheimnisse: Hebeblock (Stempel), Gang im Gepäckwagen (Stern 3), unsichtbarer Block über dem Tender (Extraleben, nach dem
// Halt), Münzspuren unter Wasser.

import {
  abendExpressThema, baronZug, fahrweg, fahrtIllusion, bahnhofOptik, hebeblock, wagenreihe, moebel, glasKuppel, wimpel,
  buehne, roehrenDeckel, feuerwerk, nahGruppe, line, arc, ring, glowPoints, Bld, TAU, ZUGF,
} from './_helpers_b.js';

const D = 1.4;              // Deck
const R = 3.75;             // Dach der Güterwagen
const G = 4.4;              // Dach des Gepäckwagens
const AX = 0, AY = 1.6, AZ = -400, AR = 9.2;     // Drehbühne des vorausfahrenden Bühnenzugs (gleiches Gleis, weit voraus)

// ---------------------------------------------------------------------- Wagen
const ZUG = wagenreihe([
  { id: 'aussicht', kind: 'aussicht', len: 10 },
  { id: 'k1', kind: 'kasten', len: 10 },
  { id: 'f1', kind: 'flach', len: 10, bord: 0.5 },
  { id: 'k2', kind: 'kasten', len: 10 },
  { id: 'f2', kind: 'flach', len: 10, bord: 0.9 },
  { id: 'k3', kind: 'kasten', len: 10 },
  { id: 'f3', kind: 'flach', len: 10, bord: 0.9 },
  { id: 't1', kind: 'tank', len: 12 },
  { id: 'f4', kind: 'flach', len: 8 },
  { id: 't2', kind: 'tank', len: 12 },
  { id: 'salon', kind: 'salon', len: 18, door: 1.0 },
  { id: 'f5', kind: 'flach', len: 6 },
  { id: 'gepaeck', kind: 'gepaeck', len: 12, door: 0.9 },
  { id: 'f6', kind: 'flach', len: 10 },
  { id: 'tender', kind: 'tender', len: 6.5 },
  { id: 'lok', kind: 'lok', len: 8.6 },
], 0);
const M = ZUG.byId;
const HZ = M.salon.z0 - 11;                      // Hebeblock unter der Deckenluke
M.salon.hole = [0, HZ, 2.0];
const LZ = M.gepaeck.z0 - 1.8;                   // goldene Dachluke des Gepäckwagens
M.gepaeck.luke = [-0.8, LZ, 1.4];
const PZ = M.f6.z1 + 1.6;                        // Bossröhre
const BUEHNE_Z0 = AZ + AR + 1.0, BUEHNE_Z1 = AZ - AR - 1.0;
const ZUG2 = wagenreihe([
  { id: 'b_schluss', kind: 'kasten', len: 8 },
], BUEHNE_Z0 + 8.6, 0.6);
const ZUG3 = wagenreihe([
  { id: 'zielwagen', kind: 'flach', len: 12 },
  { id: 'b_tender', kind: 'tender', len: 6.5 },
  { id: 'b_lok', kind: 'lok', len: 8.6 },
], BUEHNE_Z1 - 0.6, 0.6);
const ZW = ZUG3.byId.zielwagen;

// ---------------------------------------------------------------------- Fahrplan (Bildfenster; z = 10 − s)
const S_END = 10 - (PZ + 7);                     // Halt: Röhre gerade am vorderen Rand des Fensters
const BAHNSTEIG = { x0: 1.9, x1: 6.4, zA: 12, zB: -14, top: 1.4 };

// ---------------------------------------------------------------------- Gegner
const hack = (id, x, y, z, o = {}) => ({ kind: 'hackvogel', id, pos: [x, y, z], dir: [0, 1], sight: 6.5, period: 2.2, stuck: 0.9, ...o });
const enemies = [
  hack('hv1', 0, R, M.k1.z0 - 7),
  hack('hv2', 0, D, M.f1.z0 - 4.7, { sight: 7, period: 1.9 }),
  hack('hv3', -0.85, R, M.k2.z0 - 6.5, { phase: 0.5 }),
  hack('hv4', 0.85, R, M.k3.z0 - 6.5),
  { kind: 'schubser', id: 'sb1', pos: [0.4, D, M.f2.z0 - 4], dir: [0, 1], behavior: 'guard', sight: 5.5, charge: 4.5, chargeTime: 1.2, push: 7 },
  { kind: 'schubser', id: 'sb2', pos: [-0.5, D, M.f2.z0 - 7.6], dir: [0, 1], behavior: 'guard', sight: 5, charge: 4.5, chargeTime: 1.2, push: 7 },
  { kind: 'schubser', id: 'sb3', pos: [0, D, M.f3.z0 - 5.5], dir: [0, 1], behavior: 'guard', sight: 5.5, charge: 4.5, chargeTime: 1.2, push: 7 },
  // Wutkaulquappen zwischen den Schwimmkisten (wer nicht schwimmen mag, hüpft über die Kisten)
  ...[[M.t1, -0.2, 5.7], [M.t1, 0.2, 10.2], [M.t2, 0.2, 5.2], [M.t2, -0.2, 9.4]].map(([car, x, dz], i) => ({
    kind: 'wutkaulquappe', id: `wq${i + 1}`, pos: [x, 2.0, car.z0 - dz], center: [x, 2.0, car.z0 - dz], radius: 0.5, cw: i % 2 === 1, sight: 3.5, chase: 2.2, range: 3.5 })),
  // Mini-Pilzlinge im Salon
  ...[[0.9, -2.6], [-0.8, -5.4], [0.7, -8.0], [-0.6, -13.2], [0.8, -15.6]].map(([x, dz], i) => ({ kind: 'pilzling', id: `mini${i + 1}`, mini: true, pos: [x, D, M.salon.z0 + dz], dir: [0, 1], sight: 5 })),
  // Gang im Gepäckwagen, Hammer-Werfer vor der Bossröhre
  { kind: 'feuer_werfer', id: 'werfer_gang', pos: [0, D, M.gepaeck.z0 - 7.6], axis: [0, 1], pace: 1.2, speed: 0.9, sight: 7, interval: 2.6, first: 1.4, jumpEvery: 99, wake: 9 },
  { kind: 'hammer_werfer', id: 'hammer', pos: [0, D, M.f6.z0 - 4.6], axis: [1, 0], pace: 0.7, sight: 9, interval: 2.6, first: 1.2, jumpEvery: 4, hop: 0.9, wake: 12 },
  // Endgegner auf der Drehbühne
  { kind: 'schattenlaeuferin', id: 'schatten', round: 2, tempo: 1.25, pos: [AX, AY, AZ - 3.5], arena: { center: [AX, AY, AZ], r: AR - 0.6 }, ring: 5 },
];

// ---------------------------------------------------------------------- Münzen und Gegenstände
const items = [
  // Aussichtswagen: Münzspur übers Dach zum Stern, Bogen zum nächsten Wagen
  line([0, R + 0.6, -3.2], [0, R + 0.6, -7.2], 4),
  arc([0, R + 0.6, M.k1.z0 + 0.8], [0, R + 0.6, M.k1.z0 - 2.2], 3, 1.2),
  // k1: an der Seite am Hackvogel vorbei
  line([1.15, R + 0.6, M.k1.z0 - 4.4], [1.15, R + 0.6, M.k1.z0 - 9.2], 4),
  // f1: über die Steinblöcke
  arc([1.0, D + 0.6, M.f1.z0 - 1.2], [1.0, D + 0.6, M.f1.z0 - 6.4], 4, 1.9),
  // k2/k3 Dächer
  line([0.85, R + 0.6, M.k2.z0 - 2.6], [0.85, R + 0.6, M.k2.z0 - 9.4], 5),
  line([-0.85, R + 0.6, M.k3.z0 - 2.6], [-0.85, R + 0.6, M.k3.z0 - 9.4], 5),
  // Gitterwagen: Münzen auf den Kisten
  line([-1.0, D + 2.0, M.f3.z0 - 8.4], [1.0, D + 2.0, M.f3.z0 - 8.4], 2),
  // Becken: Münzen unter Wasser
  line([0, 1.9, M.t1.z0 - 1.6], [0, 1.9, M.t1.z0 - 10.4], 6),
  // Salon: Münzring um den Kronleuchter, Münzen auf dem Klavier
  ring([0, 2.9, M.salon.z1 + 4.0], 1.1, 6),
  line([0, D + 0.6, M.salon.z0 - 13.6], [0, D + 0.6, M.salon.z0 - 16.8], 3),
  // Hinweis: zwei Münzen über dem Hebeblock zeigen zur Deckenluke hinauf
  line([0, 4.85, HZ], [0, 5.45, HZ], 2),
  // Kistentreppe → Gepäckwagen-Dach, Spur zur goldenen Luke
  line([-0.9, D + 1.6, M.f5.z0 - 1.8], [-0.9, D + 2.6, M.f5.z0 - 3.4], 2),
  line([-0.8, G + 0.6, M.gepaeck.z0 - 0.3], [-0.8, G + 0.6, LZ + 0.6], 2),
  line([0.6, G + 0.6, LZ - 1.6], [0.6, G + 0.6, M.gepaeck.z1 + 1.2], 6),
  // Gang im Gepäckwagen
  line([0, D + 0.6, LZ - 1.2], [0, D + 0.6, LZ - 4.2], 4),
  // Tender und Lok (nach dem Halt)
  line([0, 3.6, M.tender.z0 - 1.2], [0, 3.6, M.tender.z1 + 1.2], 4),
  arc([0, 4.6, M.lok.z0 - 0.6], [0, 4.4, M.lok.z0 - 2.6], 3, 0.8),
  // Sternring (Stern 2): Kontrollwagen → zweites Becken (unter Wasser) → Stern auf dem vorderen Beckenrand
  { kind: 'starring', id: 'sternring', pos: [-0.8, D, M.f4.z0 - 5.6], star: 1, time: 13,
    coins: [[-0.8, D + 0.6, M.f4.z0 - 7.2], [0, 4.0, M.t2.z0 - 0.15], [0.7, 2.7, M.t2.z0 - 2.2], [-0.7, 2.0, M.t2.z0 - 4.2],
      [0, 2.0, M.t2.z0 - 6.2], [0.7, 2.0, M.t2.z0 - 8.2], [-0.5, 2.7, M.t2.z0 - 10.2], [0, 4.0, M.t2.z1 + 0.15]] },
  // Zielwagen: Münzring um den Zielmast
  ring([AX, D + 0.6, ZW.z0 - 3.6], 1.4, 8),
  // nach dem Sieg: Warp-Box in der Bühnenmitte → Zielwagen
  { kind: 'warpbox', id: 'warp_sieg', pos: [AX, AY, AZ], target: [AX, D + 0.2, ZW.z0 - 1.6], hidden: true },
];

export const LEVEL = {
  id: '8-Zug',
  world: 8,
  title: 'Brummbär-Express im Abendrot',
  archetype: 'autoscroller',
  theme: 'train',
  music: 'course_baronexpress',
  timeLimit: 400,
  killY: -8,
  prebuild: abendExpressThema,
  build,
  start: { pos: [3.6, BAHNSTEIG.top, -1.0], yaw: Math.PI },
  // Gegner und Münzen weit voraus (außerhalb des Bildfensters) nicht zeichnen bzw. ohne Sonnenschatten (Budget)
  instances: {
    schattenlaeuferin: { farHide: 120 }, goal: { farHide: 120 }, warpbox: { farHide: 120 },
    coin: { farHide: 34, shadow: false }, hackvogel: { farHide: 28, shadowDist: 14 }, schubser: { farHide: 28, shadowDist: 14 },
    wutkaulquappe: { farHide: 24, shadow: false }, pilzling: { farHide: 24, shadowDist: 12 }, feuer_werfer: { farHide: 26, shadowDist: 14 },
    star: { farHide: 40, shadowDist: 18 }, starring: { farHide: 30, shadow: false }, checkpoint: { farHide: 26, shadow: false },
    stamp: { farHide: 30, shadowDist: 14 }, 'block:question': { farHide: 40, shadowDist: 18 },
  },
  sky: { clouds: false },
  scroll: {
    path: [[0, 0, 10], [0, 0, -400]],
    start: 6, end: S_END, speed: 1.8, accel: 3,
    speeds: [{ from: 6, speed: 1.8 }, { from: 24, speed: 2.1 }, { from: 84, speed: 1.5 }, { from: 116, speed: 0.85 }, { from: 136, speed: 1.3 }],
    delay: 1.5,
    trigger: { min: [-1.8, 1.3, -12], max: [1.8, 9, 0.4] },
    frame: { back: 5, front: 8, ahead: 1.2, followX: 0.3 },
    reveal: [{ id: 'deckel', at: 'done' }],
    with: 'boss',
    startBanner: 'Einsteigen bitte!', endBanner: 'Halt: Bühnenwagen!',
  },
  camera: [
    { from: 40, to: -240, pitch: 21, dist: 14.5, yaw: 30, fov: 46, height: 1.3, area: [-40, 40] },
    { from: AZ + 40, to: AZ - 50, pitch: 44, dist: 17, x: AX, xLock: 0.3, ahead: 1.0, lead: 0.5, area: [-40, 40] },
  ],
  boss: {
    id: 'schatten', name: 'Schattenläuferin', speed: 0,
    trigger: { min: [AX - AR, AY - 0.5, AZ - AR], max: [AX + AR, AY + 6, AZ + AR - 3.6] },
    warp: 'warp_sieg', frame: 0.3, musicAfter: 'course_baronexpress',
    center: [AX, AY, AZ],
  },
  segments: [
    // Wasser der beiden Becken (Rand und Boden baut der Wagen)
    { type: 'water', pos: [0, D, M.t1.cz], size: [2.8, 1.7, M.t1.len - 0.6] },
    { type: 'water', pos: [0, D, M.t2.cz], size: [2.8, 1.7, M.t2.len - 0.6] },
    // Bossröhre (Deckel bis zum Halt) und Ausgang auf der Drehbühne
    { type: 'pipe', id: 'p_boss', pos: [0, D, PZ], height: 1.0, color: 0xc4304e, target: 'p_buehne' },
    { type: 'pipe', id: 'p_buehne', pos: [AX, AY, AZ + AR - 2.2], height: 0.9, color: 0xc4304e },
  ],
  blocks: [
    { kind: 'question', pos: [0.4, D + 2.3, -1.1], content: 'funken' },
    { kind: 'question', pos: [0, R + 2.4, M.k1.z0 - 2.4], content: 'coins:5' },
    { kind: 'question', pos: [0, R + 2.4, M.k3.z0 - 1.6], content: 'coins:5' },
    { kind: 'question', pos: [0.8, 3.4, M.salon.z0 - 5.0], content: 'krallen' },
    { kind: 'hidden', pos: [0, 5.6, M.tender.cz], content: 'oneup' },
    // Steinblock-Ladung auf f1: der Hackvogel hackt sie auf
    ...[-1, 0, 1].map((x) => ({ kind: 'steinblock', pos: [x, D, M.f1.z0 - 3.3], content: x === 0 ? 'coins:3' : 'coin' })),
  ],
  enemies,
  items,
  checkpoint: [{ pos: [0.9, D, M.f4.z0 - 2.0], yaw: Math.PI / 2 }, { pos: [AX - 2.4, AY, AZ + AR - 3.0], yaw: Math.PI / 2 }],
  stars: [
    { pos: [0, R + 0.9, -9.0], id: 'stern_dach' },
    { pos: [0, 4.1, M.t2.z1 + 0.15], hidden: true, id: 'stern_ring' },
    { pos: [0, D + 0.9, M.gepaeck.z1 + 1.3], id: 'stern_gang' },
  ],
  stamp: [0, 6.95, HZ],
  goal: { pos: [AX, D, ZW.z0 - 6.4], height: 6 },
  marks: {
    start: [3.6, BAHNSTEIG.top, -1.0], cp: [0.9, D, M.f4.z0 - 2.0], salon: [0, D, M.salon.z0 - 1], hebeblock: [0, 3.2, HZ],
    roehre: [0, D, PZ], buehne: [AX, AY, AZ], ziel: [AX, D, ZW.z0 - 6.4],
  },
  zug: Object.fromEntries([...ZUG.list, ...ZUG2.list, ...ZUG3.list].map((c) => [c.id, { kind: c.kind, z0: c.z0, z1: c.z1 }])),
};

// ---------------------------------------------------------------------- Aufbau
function build(level) {
  // Bühnenzug weit voraus: eigene Gruppe, nur in der Nähe gezeichnet (Budget an Zeichenaufrufen)
  const near = nahGruppe(level, AZ, 190);
  const a = baronZug(level, ZUG.list);
  const b = baronZug(level, ZUG2.list, { x: AX, near, name: 'buehnenzug-aufbau' });
  const c = baronZug(level, ZUG3.list, { x: AX, near, name: 'buehnenzug-aufbau2' });
  const bu = buehne(level, { x: AX, y: AY, z: AZ, r: AR, near });
  // Hebeblock unter der Deckenluke des Salons; Glaskuppel darüber
  hebeblock(level, { id: 'hebeblock', pos: [0, 3.2, HZ], rise: 2.0, speed: 1.6, hold: 3.2, content: 'coins:3', luke: { a: 2.0, y: 6.0, t: 0.2 } });
  glasKuppel(level, M.salon.dome);
  roehrenDeckel(level, 'p_boss', 'deckel');
  // Fahrt-Illusion: Landschaft, Laternen, Räder, Dampf, Startbahnhof
  fahrtIllusion(level, {
    weg: fahrweg(9, 3), band: [-480, 80], talY: -16, lampHide: [[BUEHNE_Z0 + 18, ZUG3.byId.b_lok.z1 - 2]],
    props: [
      { kind: 'baum', bands: [[-110, -9, 48], [9, 110, 48]] },
      { kind: 'laubbaum', bands: [[-90, -12, 26], [12, 90, 26]] },
      { kind: 'haus', bands: [[-80, -14, 17], [14, 80, 17]] },
      { kind: 'zelt', bands: [[-70, -16, 8], [16, 70, 8]] },
      { kind: 'ballon', y: 3, bands: [[-70, -14, 6], [14, 70, 6]] },
    ],
    wheels: [...a.wheels, ...b.wheels, ...c.wheels, ...bu.wheels],
    chimneys: [M.lok.chimney, ZUG3.byId.b_lok.chimney],
    bahnhof: BAHNSTEIG, bahnhofOptik: bahnhofOptik(level, BAHNSTEIG),
    skipLamps: [[BAHNSTEIG.x0 - 1, BAHNSTEIG.x1 + 6, BAHNSTEIG.zB - 2, BAHNSTEIG.zA + 2]],
  });
  // Ladung, Möbel, Treppen (fest)
  moebel(level, [
    // Koffer auf dem Balkon (Treppe aufs Dach)
    { kind: 'koffer', pos: [-1.05, D, -0.75], size: [0.8, 0.5, 0.7], color: 0x3a7ab8 },
    { kind: 'koffer', pos: [-1.05, D + 0.5, -0.75], size: [0.6, 0.42, 0.55], color: 0xc83a5a },
    // f1: Kisten
    { kind: 'kiste', pos: [-1.0, D, M.f1.z0 - 8.4], size: [1, 1, 1] },
    { kind: 'fass', pos: [1.05, D, M.f1.z0 - 8.6], size: [0.8, 1.0, 0.8] },
    // f3: Kistenstapel (Münzen oben)
    { kind: 'kiste', pos: [-1.0, D, M.f3.z0 - 8.4], size: [1, 1.2, 1] },
    { kind: 'kiste', pos: [1.0, D, M.f3.z0 - 8.4], size: [1, 1.2, 1], color: 0xb8803a },
    // Schwimmkisten in den Becken (Oberseite knapp über dem Wasser)
    { kind: 'kiste', pos: [0.85, 2.5, M.t1.z0 - 3.4], size: [0.8, 0.8, 0.8], color: 0xd8a050 },
    { kind: 'kiste', pos: [-0.85, 2.5, M.t1.z0 - 7.9], size: [0.8, 0.8, 0.8], color: 0xd8a050 },
    { kind: 'kiste', pos: [-0.85, 2.5, M.t2.z0 - 3.2], size: [0.8, 0.8, 0.8], color: 0xd8a050 },
    { kind: 'kiste', pos: [0.85, 2.5, M.t2.z0 - 7.2], size: [0.8, 0.8, 0.8], color: 0xd8a050 },
    // f4: Fässer
    { kind: 'fass', pos: [1.1, D, M.f4.z0 - 6.6], size: [0.7, 0.9, 0.7], color: 0x3a8a5a },
    // Salon: Sofas, Klavier (Tritt zum Hebeblock)
    { kind: 'sofa', pos: [-1.2, D, M.salon.z0 - 2.4], size: [0.75, 0.65, 2.0], back: -1, color: 0xc83a5a },
    { kind: 'sofa', pos: [1.2, D, M.salon.z0 - 15.8], size: [0.75, 0.65, 2.0], back: 1, color: 0x3a8ae0 },
    { kind: 'klavier', pos: [-1.1, D, HZ + 1.9], size: [0.95, 1.2, 1.5], keys: 1 },
    // f5: Kistentreppe zum Gepäckwagen-Dach
    { kind: 'kiste', pos: [-0.9, D, M.f5.z0 - 1.9], size: [1.2, 1.0, 1.2] },
    { kind: 'kiste', pos: [-0.9, D, M.f5.z0 - 3.5], size: [1.2, 2.0, 1.2], color: 0xb8803a },
    { kind: 'koffer', pos: [1.0, D, M.f5.z0 - 4.6], size: [0.9, 0.6, 0.7], color: 0x8a5ae8 },
    // Gepäckgang: Koffer und Säcke an den Wänden
    { kind: 'koffer', pos: [1.2, D, LZ - 2.6], size: [0.6, 0.7, 1.0], color: 0x3a7ab8 },
    { kind: 'sack', pos: [-1.25, D, LZ - 5.4], size: [0.6, 0.8, 0.6] },
    { kind: 'koffer', pos: [-1.2, D, LZ - 8.2], size: [0.6, 0.5, 0.9], color: 0xe8a03a },
    // f6: Fässer neben der Röhre
    { kind: 'fass', pos: [-1.15, D, M.f6.z0 - 1.2], size: [0.7, 0.9, 0.7] },
    { kind: 'fass', pos: [1.15, D, PZ], size: [0.7, 0.9, 0.7], color: 0x3a8a5a },
  ]);
  // Zielwagen: Geschenkkisten und Wimpel (in der Nah-Gruppe)
  moebel(level, [
    { kind: 'kiste', pos: [AX - 1.0, D, ZW.z1 + 1.2], size: [0.9, 0.9, 0.9], color: 0xe85a8a },
    { kind: 'kiste', pos: [AX + 1.0, D, ZW.z1 + 1.2], size: [0.9, 0.9, 0.9], color: 0x5ab4e8 },
  ], near);
  wimpel(level, [{ a: [AX - 1.6, 4.6, ZW.z0 - 0.5], b: [AX + 1.6, 4.6, ZW.z0 - 0.5], sag: 0.3 }], near);
  // Wimpelketten über den Gitterwagen und dem Zielwagen, Lampions am Salon
  wimpel(level, [
    { a: [-1.6, R + 0.2, M.k2.z1 + 0.1], b: [-1.6, R + 0.2, M.k3.z0 - 0.1], sag: 0.9 },
    { a: [1.6, R + 0.2, M.k2.z1 + 0.1], b: [1.6, R + 0.2, M.k3.z0 - 0.1], sag: 0.9 },
    { a: [-1.6, R + 0.2, M.k3.z1 + 0.1], b: [-1.6, 3.4, M.t1.z0 - 0.1], sag: 0.9 },
    { a: [1.6, R + 0.2, M.k3.z1 + 0.1], b: [1.6, 3.4, M.t1.z0 - 0.1], sag: 0.9 },
  ]);
  glowPoints(level, [[0, 5.2, M.salon.z0 - 5.0, 2.2], [0, 5.2, M.salon.z1 + 4.0, 2.2]], { color: 0xffd8a0, opacity: 0.6, pulse: 0.3 });
  // Kronleuchter im Salon (goldener Reif mit Kerzen)
  const kb = new Bld(), kg = new Bld();
  for (const z of [M.salon.z0 - 5.0, M.salon.z1 + 4.0]) {
    kb.cyl(0.02, 0.02, 0.85, 0, 5.15, z, ZUGF.trim, 4);
    kb.torus(0.55, 0.05, 0, 5.15, z, ZUGF.trim, { rx: Math.PI / 2, rs: 4, ts: 18 });
    kb.sphere(0.16, 0, 4.98, z, ZUGF.trim, { ws: 8, hs: 6 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU, x = Math.cos(a) * 0.55, dz = Math.sin(a) * 0.55;
      kb.cyl(0.035, 0.035, 0.16, x, 5.15, z + dz, ZUGF.cream, 5);
      kg.sphere(0.065, x, 5.37, z + dz, 0xffe08a, { ws: 5, hs: 3 });
    }
  }
  kb.flush(level, { castShadow: false });
  kg.flush(level, { material: 'glow', castShadow: false });
  // Feuerwerk über dem Rummeltal
  feuerwerk(level, { slots: 5, sparks: 22 });
  level._zugWheels = a.wheels.length + b.wheels.length + c.wheels.length + bu.wheels.length;
}
