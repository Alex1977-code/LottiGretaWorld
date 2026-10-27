// 5-Zug „Bimmelbahn voller Bitcoins“ – Bonus-Level der Welt 5 (Archetyp autoscroller, Bauplan Detail 5-Zug: „Kein
// Zeitlimit · Goldzug voller Münzen, Autoscroll; Endröhre zu einem Glückshaus. Geheimnis: goldener P-Schalter in einer
// Felsspalte“). Am Bahnhof Goldbucht steht die goldene Bimmelbahn unter Dampf – jeder Wagen randvoll mit Bitcoins.
// Kaum ist man eingestiegen, bimmelt sie los an der Goldküste der Lila Strand-Insel entlang, über Lagunen auf
// Holzgerüsten, vorbei an Strandhäuschen, Palmen und dem Leuchtturm. Das Bildfenster gleitet am Zug entlang nach vorn
// (Halte-Pausen am Felswagen, am Röhrenwagen und am Blockwagen). Am Muschelkap hält der Zug; die goldene Röhre auf dem
// Bahnsteig führt in den Glücksgarten mit dem Glückshaus (Spielautomat: Einsatz 10 Bitcoins) und dem Zielmast.
// Keine Sterne, kein Stempel, keine Gegner, keine Zeitbegrenzung – hier geht es nur ums Sammeln.
//
// Zug-Koordinate c: Meter entlang des Zugs nach vorn ab dem Heck (beim Fahrtbeginn z = 14 − c; _helpers_d.js).
//   1 Bahnhof Goldbucht   c −8 … 26     Einsteigen, Abfahrt nach 3 s (wer stehen bleibt, wird ans Bahnsteigende
//                                       geschoben und fällt in die Lagune)
//   2 Goldwagen G1–G2     c 10 … 29     Münzbögen über den Münzbergen
//   3 Felswagen F1        c 29 … 39     Halt: zwei Felsblöcke, dazwischen die Spalte mit dem goldenen Schalter
//                                       (hineinspringen → 8 s Goldregen über G2–G4)
//   4 Röhrenwagen R1      c 60 … 69     Halt: Kistenburg, mitten darin die geheime Röhre → Wolkenwagen (fährt links
//                                       oberhalb des Zugs mit: Münzreihen, Extraleben), Rückröhre auf G6
//   5 Goldwagen G5–G7     c 70 … 98     Kontrollpunkt auf G5
//   6 Blockwagen B1       c 99 … 108    Halt: ?-Block (Funkenblüte), Dauer-Münzblock, Roulette-Block
//   7 G8, Tender, Lok     c 109 … 133   unsichtbarer Block mit Extraleben über G8; Halt am Muschelkap
//   8 Glücksgarten        x ≈ 44        Röhre auf dem Bahnsteig → Glückshaus (Spielautomat), Zielmast
// Extraleben: Wolkenwagen (geheime Röhre), unsichtbarer Block über G8, Roulette-Block, Spielautomat (3 × Herz).

import {
  GZ, gzP, gzS, goldLineUp, goldWagen, aufWagen, teil, WAGEN_TOP, solveTrainRide, trackChunks, goldkuestenThema,
  ohneZeitlimit, gluecksHaus, kuestenKulisse, goldzugSzene,
} from './_helpers_d.js';

const D = WAGEN_TOP.flach;     // Holzdeck der Flachwagen
const G = WAGEN_TOP.gold;      // Münzberg der Goldwagen
const SAND = -0.35;            // Strandhöhe (Schienenoberkante 0)

// ---------------------------------------------------------------------- Wagen
const ROCK_H = 2.8;
const ZUG = goldLineUp([
  { id: 'A1', kind: 'flach' },
  { id: 'G1', kind: 'gold' },
  { id: 'G2', kind: 'gold' },
  { id: 'F1', kind: 'flach', len: 10, parts: [
    teil(-2.5, 0, D, [3, ROCK_H, 3.6], { visible: false, tag: 'fels' }),
    teil(2.5, 0, D, [3, ROCK_H, 3.6], { visible: false, tag: 'fels' }),
    teil(0, 1.2, D, [0.6, 1.2, 1.36], { visible: false, tag: 'felsstufe' }),
  ] },
  { id: 'G3', kind: 'gold' },
  { id: 'G4', kind: 'gold' },
  { id: 'R1', kind: 'flach' },
  { id: 'G5', kind: 'gold' },
  { id: 'G6', kind: 'gold' },
  { id: 'G7', kind: 'gold' },
  { id: 'B1', kind: 'flach' },
  { id: 'G8', kind: 'gold' },
  { id: 'T1', kind: 'gold', len: 6 },
  { id: 'L1', kind: 'lok' },
], 0);
const M = ZUG.byId;
const at = aufWagen;

// ---------------------------------------------------------------------- Fahrplan (Bildfenster)
const RIDE = solveTrainRide({
  ...GZ,
  cw0: 4.5,
  plan: [
    { to: 30, r: 2.2 },        // Abfahrt, Goldwagen G1/G2
    { hold: 5 },               // Felswagen: goldener Schalter in der Spalte
    { to: 60, r: 2.0 },        // Goldregen über G3/G4
    { hold: 9 },               // Röhrenwagen: Kistenburg mit der geheimen Röhre
    { to: 100, r: 2.0 },       // Wolkenwagen / G5–G7
    { hold: 8 },               // Blockwagen
    { to: 128, r: 1.8 },       // G8, Tender, Lok – Halt am Muschelkap
  ],
});
const DELAY = 3;
const HALT = GZ.ZR - RIDE.D;                 // Weltlage z des Zughecks nach dem Halt
const zH = (c) => HALT - c;                  // Weltlage z einer Zug-Koordinate nach dem Halt
const LOK_Z = zH(M.L1.cc);

// Wolkenwagen: unsichtbares Fahrzeug links oberhalb des Zugs (c 66 … 84)
const WOLKE = { cc: 75, len: 18, x: -5.5, y: 6.5 };
const atW = (dc, dx, y = WOLKE.y) => gzP(WOLKE.cc + dc, WOLKE.x + dx, y);

// Glücksgarten (eigene Insel rechts vom Muschelkap)
const GX = 46, GY = 0, GZn = LOK_Z - 4;
const PIPE_Z = zH(136.5);                     // goldene Röhre auf dem Bahnsteig vor der Lok

// Lagunen (Welt-z, von – bis): Gerüstbrücken über dem Wasser
const LAGOONS = [[-18, -58], [-205, -245], [-398, -430]];

// ---------------------------------------------------------------------- Münzen
const coins = (car, a, b, n, dx = 0, y = G + 0.6) => ({ kind: 'coins', attach: car.id, from: at(car, a, dx, y), to: at(car, b, dx, y), n });
/** Münzbogen über einem Wagen (Höhe h über y). */
const bogen = (car, a, b, n, dx, y, h) => Array.from({ length: n }, (_, i) => {
  const k = n > 1 ? i / (n - 1) : 0.5;
  return { kind: 'coin', attach: car.id, pos: at(car, a + (b - a) * k, dx, y + 4 * h * k * (1 - k)) };
});
const wolkeCoins = (a, b, n, dx) => ({ kind: 'coins', attach: 'wolke', from: atW(a, dx, WOLKE.y + 0.6), to: atW(b, dx, WOLKE.y + 0.6), n });

const items = [
  // A1 (Startwagen): Münzspur und zwei Kisten
  coins(M.A1, -3.6, 3.6, 6, 0, D + 0.6),
  { kind: 'crate', attach: 'A1', pos: at(M.A1, -3.2, -0.9, D), content: 'coins:2' },
  { kind: 'crate', attach: 'A1', pos: at(M.A1, 3.6, -0.9, D), content: 'coins:2' },
  // G1/G2: Bögen über den Münzbergen
  ...bogen(M.G1, -3.8, 3.8, 7, 0.4, G + 0.6, 1.4),
  ...bogen(M.G2, -3.8, 3.8, 7, 0.4, G + 0.6, 1.4),
  coins(M.G2, -3, 3, 4, -0.9),
  // F1: Münzen über den Felsen, drei Münzen über dem Schalter (Hinweis)
  coins(M.F1, -4, -1, 3, 0.3, D + ROCK_H + 0.6),
  coins(M.F1, 1, 4, 3, 0.3, D + ROCK_H + 0.6),
  coins(M.F1, 0, 0, 1, -0.75, D + 1.4), coins(M.F1, 0, 0, 1, -0.75, D + 2.2),
  // G3/G4 (der Goldregen fällt hierher)
  coins(M.G3, -3.6, 3.6, 5, 0.6),
  ...bogen(M.G4, -3.8, 3.8, 6, 0, G + 0.6, 1.2),
  // R1: Kistenburg um die geheime Röhre (dc −1.5)
  ...[[-2.65, -1.0, 0], [-2.65, 0, 0], [-2.65, 1.0, 0], [-2.65, -1.0, 0.9], [-2.65, 0, 0.9], [-2.65, 1.0, 0.9],
    [-1.5, -1.05, 0], [-1.5, 1.05, 0], [-0.35, -1.0, 0], [-0.35, 0, 0], [-0.35, 1.0, 0]].map(([dc, dx, y], i) => ({
    kind: 'crate', id: `burg${i}`, attach: 'R1', size: 0.9, pos: at(M.R1, dc, dx, D + y), content: i % 3 === 1 ? 'coins:2' : 'coin',
  })),
  coins(M.R1, 0.8, 4, 4, 0.4, D + 0.6),
  // Wolkenwagen: drei Münzreihen, Extraleben in der Mitte
  wolkeCoins(-6.2, -0.8, 6, -0.9), wolkeCoins(-6.2, -0.8, 6, 0.9), wolkeCoins(0.8, 6.2, 6, -0.9), wolkeCoins(0.8, 6.2, 6, 0.9),
  wolkeCoins(-5, 5, 9, 0),
  { kind: 'powerup', id: 'wolke_leben', attach: 'wolke', pos: atW(0, 0, WOLKE.y + 0.05), power: 'oneup', speed: 0 },
  // G5–G7
  ...bogen(M.G5, -3.8, 3.8, 7, -0.4, G + 0.6, 1.4),
  coins(M.G6, -3.6, 0.6, 4, 0.7), coins(M.G6, 3.2, 3.8, 2, -0.6),
  ...bogen(M.G7, -3.8, 3.8, 7, 0.4, G + 0.6, 1.6),
  // B1 (Blockwagen): Münzen am Boden
  coins(M.B1, -4, 4, 6, -0.9, D + 0.6),
  // G8, Tender, Lok
  ...bogen(M.G8, -3.8, 3.8, 7, 0, G + 0.6, 1.4),
  coins(M.T1, -2.4, 2.4, 4, 0, G + 0.6),
  coins(M.L1, -3.6, -1.8, 3, 0, WAGEN_TOP.lok + 0.6),
  // Muschelkap: Münzreihe zur goldenen Röhre
  { kind: 'coins', from: [4.4, 1.7, zH(128)], to: [4.4, 1.7, zH(134.5)], n: 5 },
  // Glücksgarten: Münzkreis um den Brunnen, Bogen zum Zielmast
  { kind: 'coins', pos: [GX - 7, GY + 0.6, GZn - 3], r: 1.8, n: 8 },
  { kind: 'coins', from: [GX + 3.5, GY + 0.6, GZn + 2], to: [GX + 7.5, GY + 0.6, GZn - 2], n: 5 },
];

/** Strandtücher, Seesterne und Eimer entlang der Sandstreifen (deterministisch verteilt). */
function strandKram() {
  const towels = [], stars = [], pails = [];
  const TW = [0xff4f7a, 0x3ac8f0, 0xffd23a, 0x6ad04a, 0xb070ff];
  let k = 0;
  for (const [a, b] of [[30, -14], [-62, -200], [-250, -394], [-436, zH(142)]]) {
    for (let z = a - 5; z > b; z -= 15, k++) {
      const side = k % 2 ? 1 : -1, right = side > 0 && (z > -14 || z < -436);   // rechts an den Bahnhöfen: hinter dem Bahnsteig
      towels.push([side * (right ? 9.5 : 6.5 + (k * 37) % 5), z, ((k * 0.7) % 1.2) - 0.6, TW[k % 5], 0xffffff]);
      stars.push([-side * (5.5 + (k * 13) % 6), z - 6, [0xff7a4a, 0xff4f7a, 0xffb020][k % 3]]);
      if (k % 3 === 0) pails.push([side * ((right ? 11 : 8.5) + (k % 3)), z - 1.4, [0x3ac8f0, 0xff4f7a, 0x6ad04a][k % 3]]);
    }
  }
  return { towels, stars, pails };
}

export const LEVEL = {
  id: '5-Zug',
  world: 5,
  title: 'Bimmelbahn voller Bitcoins',
  archetype: 'autoscroller',
  theme: 'train',
  music: 'course_goldtrain',
  timeLimit: 999,
  noTimeLimit: true,
  starSlots: 0,
  killY: -14,
  start: { pos: [3.2, 1.1, GZ.ZR - 6.5], yaw: Math.PI / 2 },
  scroll: {
    path: [[0, 0, GZ.ZP], [0, 0, -3000]],
    start: RIDE.start, end: RIDE.end, speed: RIDE.speed, speeds: RIDE.speeds, accel: GZ.ACCEL, delay: DELAY,
    frame: { back: 5, front: 8, ahead: 1.2, followX: 0.32 },
    startBanner: 'Einsteigen!', endBanner: 'Endstation Muschelkap!',
  },
  camera: [
    { from: 60, to: -2000, pitch: 40, dist: 15.5, fov: 40, area: [-45, 30] },
    { from: GZn + 30, to: GZn - 30, pitch: 36, dist: 13.5, fov: 42, ahead: 1.2, area: [30, 80] },
  ],
  prebuild: (level) => goldkuestenThema(level),
  build: (level) => {
    kuestenKulisse(level, {
      y: SAND,
      huts: [
        [12.5, 2, -0.3, 0x4ab8f0], [16.5, -6, 0.2, 0xff7aa8], [-14, 18, 2.8, 0xffc23a],
        [-16, -80, 1.4, 0x4ad08a], [-18.5, -96, 1.7, 0xff7aa8], [15, -128, -1.4, 0x9a7aff], [17, -176, -1.6, 0x4ab8f0],
        [-15, -268, 1.5, 0xffc23a], [16, -300, -1.5, 0xff7aa8], [-17, -352, 1.6, 0x4ab8f0], [15.5, -380, -1.4, 0x4ad08a],
        [14, zH(112), 0, 0xff7aa8], [-13, zH(86), 2.9, 0x9a7aff],
      ],
      lighthouse: [-22, SAND, -150],
      jetties: [[-11, -18.5, 12], [12, -206, 10], [-12, -399, 9]],
      buoys: [[-6, -30, 0xe8304a], [7, -44, 0xffd23a], [-8, -222, 0xffffff], [8, -236, 0xe8304a], [6, -414, 0xffd23a], [-5, -420, 0xe8304a]],
      baskets: [[-9, -70, 0.4, 0x3aa0e8], [-10.5, -74, 0.2, 0xe8304a], [9.5, -160, -0.3, 0xffb020], [-9, -320, 0.3, 0x3aa0e8], [10, -335, -0.2, 0xe8304a]],
      bunting: [
        { x: -3.9, z0: 26, z1: -14 }, { x: -3.9, z0: -64, z1: -198 }, { x: 3.9, z0: -64, z1: -198 },
        { x: -3.9, z0: -252, z1: -392 }, { x: 3.9, z0: -252, z1: -392 }, { x: -3.9, z0: -438, z1: zH(142) },
      ],
      lagoons: LAGOONS,
      islets: [[-15, -40, 3.2], [13, -226, 2.6], [-11, -416, 2.4]],
      boats: [[9, -31, 0.5, 0xe8304a], [-13, -222, -0.4, 0x3a8ae8], [10.5, -409, 0.25, 0xffb020], [-20, -50, 1.2, 0x6ad04a]],
      ...strandKram(),
    });
  },
  setup: (level) => {
    ohneZeitlimit(level);
    goldzugSzene(level, LEVEL.zug, M);
    gluecksHaus(level, { pos: [GX, GY, GZn - 7], machine: [GX, GY, GZn - 3.9], pad: [GX, GY, GZn - 1.4], stake: 10 });
  },
  zug: {
    ride: RIDE, delay: DELAY, lokZ: LOK_Z, halt: HALT,
    pipes: [
      { id: 'roehre_geheim', car: 'R1', dc: -1.5, dx: 0, y: D, h: 0.75, r: 0.5, target: 'wolke_ein', color: 0x2fbf4a },
      { id: 'wolke_ein', veh: 'wolke', pos: atW(-7.6, 0), h: 0.9, r: 0.7, target: 'roehre_geheim', color: 0x2fbf4a },
      { id: 'wolke_aus', veh: 'wolke', pos: atW(7.6, 0), h: 0.9, r: 0.7, target: 'roehre_g6', color: 0xffc21a, arrow: true },
      { id: 'roehre_g6', car: 'G6', dc: 2.0, dx: 0, y: G, h: 0.8, r: 0.7, target: 'wolke_aus', color: 0xffc21a },
    ],
    fels: { car: 'F1', rocks: [{ dc: -2.5, len: 3.6, h: ROCK_H }, { dc: 2.5, len: 3.6, h: ROCK_H }], step: { dc: 0, dx: 1.2, w: 0.6, len: 1.36, h: 1.2 } },
    wolke: { veh: 'wolke', len: WOLKE.len },
    schalter: { car: 'F1', dc: 0, dx: -0.75, y: D, time: 8, rate: 7, ahead: 16, behind: 7 },
    endHint: [4.4, PIPE_Z],
    shadowZones: [[44, -18], [-430, -650]],
  },
  segments: [
    // Bahnhof Goldbucht: Strand, Bahnsteig, Bahnhofshaus
    { type: 'island', pos: [-1, SAND - 2, 13], size: [46, 2, 62], top: 'sand', under: 0 },
    { type: 'bahnsteig', pos: [4.4, 0, GZ.ZR - 9], size: [5, 1.1, 34], edge: 'left', sign: 'Goldbucht', roof: false },
    { type: 'killplane', y: -14 },
    // Sandstreifen zwischen den Lagunen, Muschelkap mit Bahnsteig
    { type: 'island', pos: [-1, SAND - 2, (-58 - 205) / 2], size: [56, 2, 147], top: 'sand', under: 0 },
    { type: 'island', pos: [-1, SAND - 2, (-245 - 398) / 2], size: [56, 2, 153], top: 'sand', under: 0 },
    { type: 'island', pos: [3, SAND - 2, (-430 + LOK_Z - 46) / 2], size: [54, 2, -430 - (LOK_Z - 46)], top: 'sand', under: 0 },
    { type: 'bahnsteig', pos: [4.4, 0, zH(118)], size: [5, 1.1, 44], edge: 'left', sign: 'Muschelkap', roof: false },
    { type: 'pipe', id: 'glueck_rohr', pos: [4.6, 1.1, PIPE_Z], height: 1.0, radius: 0.85, color: 0xffc21a, target: 'garten_rohr' },
    { type: 'sign', pos: [6.4, 1.1, PIPE_Z + 2.4], text: 'Glückshaus', yaw: 0 },
    // Gleis (Gerüstbrücken über den Lagunen)
    ...trackChunks({ x: 0, z0: 40, z1: LOK_Z - 24, gorges: LAGOONS, bottom: -4, start: true }),
    // Glücksgarten
    { type: 'island', pos: [GX, GY - 2, GZn], size: [26, 2, 30], top: 'grass', under: 0 },
    { type: 'pipe', id: 'garten_rohr', pos: [GX - 7, GY, GZn + 8], height: 1.0, radius: 0.85, color: 0xffc21a },
    // Wolkenwagen (unsichtbares Fahrzeug; Optik: WolkenWagen) und der Goldzug
    { type: 'vehicle', id: 'wolke', style: 'plain', size: [3.6, 0.4, WOLKE.len], at: gzS(WOLKE.cc), speed: GZ.VT, stop: gzS(WOLKE.cc) + RIDE.D, brake: GZ.BRAKE, offset: [WOLKE.x, WOLKE.y], deck: false, model: false,
      parts: [{ pos: [0, -0.4, 0], size: [3.6, 0.4, WOLKE.len], visible: false, tag: 'wolke' }] },
    ...ZUG.list.map((c, i) => goldWagen(c, RIDE, ZUG.list[i + 1])),
    // Strand-Kulisse (deco_w5): Palmen, Sonnenschirme, Liegestühle, Sandburgen, Muscheln, Dünen
    { type: 'deco_w5', items: [
      { kind: 'palme', pos: [9, SAND, 18], height: 6 }, { kind: 'palme', pos: [-9, SAND, 6], height: 5.4, lean: 0.3 },
      { kind: 'palme', pos: [-12, SAND, 28], height: 6.4 }, { kind: 'palme', pos: [10, SAND, -10], height: 5 },
      { kind: 'sonnenschirm', pos: [-16, SAND, 0], color: 'rot' }, { kind: 'liegestuhl', pos: [-16, SAND, -2.2], yaw: -1.6, color: 'blau' },
      { kind: 'sandburg', pos: [-7, SAND, 30], size: 2 }, { kind: 'strandball', pos: [-6.5, SAND, -3], size: 0.8 },
      { kind: 'muscheln', pos: [-12, SAND, 12], size: [12, 20], n: 12 },
    ] },
    { type: 'deco_w5', items: [
      { kind: 'palme', pos: [-15, -0.45, -40], height: 4.6, lean: 0.35 }, { kind: 'palme', pos: [13, -0.45, -226], height: 4.2 },
      { kind: 'palmen', pos: [-15, SAND, -131], size: [14, 140], n: 10, gap: 6, height: [4.5, 6.8], seed: 11 },
      { kind: 'palmen', pos: [15, SAND, -131], size: [14, 140], n: 10, gap: 6, height: [4.5, 6.8], seed: 12 },
      { kind: 'sonnenschirm', pos: [-8, SAND, -72], color: 'gelb' }, { kind: 'sonnenschirm', pos: [9, SAND, -158], color: 'lila' },
      { kind: 'liegestuhl', pos: [8, SAND, -155.5], yaw: 1.4, color: 'rot' },
      { kind: 'sandburg', pos: [-8, SAND, -110], size: 2.2 }, { kind: 'sandskulptur', pos: [8, SAND, -100], yaw: -1.4, size: 1.6 },
      { kind: 'strandball', pos: [7, SAND, -188], size: 0.8 }, { kind: 'duenen', pos: [-20, SAND, -190], size: [10, 26], n: 3 },
      { kind: 'muscheln', pos: [0, SAND, -131], size: [30, 140], n: 26, avoid: [[0, -131, 2]] },
    ] },
    { type: 'deco_w5', items: [
      { kind: 'palmen', pos: [-15, SAND, -322], size: [14, 146], n: 10, gap: 6, height: [4.5, 6.8], seed: 21 },
      { kind: 'palmen', pos: [15, SAND, -322], size: [14, 146], n: 10, gap: 6, height: [4.5, 6.8], seed: 22 },
      { kind: 'sonnenschirm', pos: [-8.5, SAND, -318], color: 'blau' }, { kind: 'liegestuhl', pos: [-8.5, SAND, -315.6], yaw: -1.5, color: 'gelb' },
      { kind: 'sandburg', pos: [8, SAND, -290], size: 1.8 }, { kind: 'sandskulptur', pos: [-8, SAND, -360], yaw: 1.5, size: 1.6 },
      { kind: 'duenen', pos: [20, SAND, -260], size: [10, 26], n: 3 }, { kind: 'muscheln', pos: [0, SAND, -322], size: [30, 140], n: 26 },
    ] },
    { type: 'deco_w5', items: [
      { kind: 'palme', pos: [10.5, SAND, zH(104)], height: 6.2 }, { kind: 'palme', pos: [10, SAND, zH(140)], height: 5.4 },
      { kind: 'palme', pos: [-9, SAND, zH(96)], height: 6 }, { kind: 'palme', pos: [-10, SAND, zH(128)], height: 6.6, lean: 0.35 },
      { kind: 'palmen', pos: [-14, SAND, -470], size: [12, 60], n: 5, gap: 6, seed: 31 }, { kind: 'palmen', pos: [15, SAND, -470], size: [12, 60], n: 5, gap: 6, seed: 32 },
      { kind: 'sonnenschirm', pos: [-9, SAND, zH(116)], color: 'rot' }, { kind: 'sandburg', pos: [-8, SAND, zH(140)], size: 2 },
      { kind: 'muscheln', pos: [0, SAND, -520], size: [30, 160], n: 22 },
      // Glücksgarten
      { kind: 'palme', pos: [GX - 10, GY, GZn - 10], height: 6.5 }, { kind: 'palme', pos: [GX + 10, GY, GZn + 9], height: 5.8, lean: 0.3 },
      { kind: 'palme', pos: [GX + 10.5, GY, GZn - 11], height: 6.2 }, { kind: 'sonnenschirm', pos: [GX - 8, GY, GZn + 3], color: 'lila' },
      { kind: 'strandball', pos: [GX + 4, GY, GZn + 6], size: 0.8 },
    ] },
  ],
  blocks: [
    // B1 (Blockwagen): ?-Block mit Funkenblüte, Dauer-Münzblock, Roulette-Block
    { kind: 'question', attach: 'B1', pos: at(M.B1, -3, 0, D + 2.4), content: 'funken' },
    { kind: 'hidden', id: 'block_leben', attach: 'G8', pos: at(M.G8, 2.5, 0, G + 2.4), content: 'oneup' },
  ],
  items: [
    ...items,
    { kind: 'endlessblock', id: 'dauerblock', attach: 'B1', pos: at(M.B1, 0, 0, D + 2.4), window: 1.4, max: 30 },
    { kind: 'rouletteblock', id: 'roulette', attach: 'B1', pos: at(M.B1, 3, 0, D + 2.4), contents: ['coins:5', 'oneup', 'funken', 'krallen'], period: 0.5 },
  ],
  checkpoint: [{ pos: at(M.G5, -3, 0, G), attach: 'G5' }],
  stars: [],
  goal: { pos: [GX + 8, GY, GZn - 6], height: 8 },
  marks: {
    start: [3.2, 1.1, GZ.ZR - 6.5], pipe: [4.6, 1.1, PIPE_Z], garden: [GX - 7, GY, GZn + 8], pad: [GX, GY, GZn - 1.4], goal: [GX + 8, GY, GZn - 6],
  },
  // Zug-Daten für Tests (Zug-Koordinaten)
  train: Object.fromEntries(ZUG.list.map((c) => [c.id, { c0: c.c0, c1: c.c1, cc: c.cc, kind: c.kind, len: c.len }])),
  wolke: WOLKE,
};
