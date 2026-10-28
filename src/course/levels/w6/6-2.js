// 6-2 „Schaukelschiffe im Nebelmeer“ (Bauplan 6-2: Parcours, 400 s, ca. 180 m – mehrere Geisterschiffe, Unterwasser-
// Abschnitt). Thema wreck, Musik course_wreck.
//
// Abendrot über einem nebligen Meer (wer hineinfällt, versinkt im Nebel); alte Geisterschiffe schaukeln in den Wellen.
// Abschnitte (nach −Z):
//   1. Schiffsdeck (z 10 … −58): Bootsanleger → Kippschiff 1 (Walzenwerfer auf dem Felsen daneben wirft Stachelwalzen
//      quer übers Deck) → 1 m breiter Kippsteg → Kippschiff 2 ohne Reling (großer Schubser: vom Schiff stoßen → Stern 0)
//      → Wrackfelsen mit Warp-Box in den Laderaum.
//   2. Laderaum (abseits bei x ≈ 100, z −8 … −62): offener Schiffsbauch im Laternenlicht (Stimmung laderaum). Kisten und
//      Fässer, ein Kreisgeist-Ring über einem **Loch im Boden** (hinab in die Bilge: Stern 1, Kisten hinauf), ein gefluteter
//      Mittelteil (Schwimmen/Tauchen, Münzen am Grund, zwei Spuke), ein zweiter Kreisgeist-Ring unter dem Querbalken
//      mit dem **Stempel** (über Kisten hinauf), Warp-Box hinaus.
//   3. Checkpoint und Kippbrücke (z −74 … −120): Felsinsel mit Checkpoint, drei Kippstege (1,4 / 1,2 / 1 m) zwischen
//      Pfahlinseln; Stern 2 schwebt über der letzten Kippbrücke.
//   4. Letztes Schiff (z −120 … −148): großes Kippschiff mit zwei Schubsern – beide hinunterstoßen → die Warp-Box auf
//      dem Bugfelsen erscheint → Zielinsel mit Leuchtturm und Zielmast.

import {
  isl, line, ring, arc, holzsteg, kisten, laderaum, geisterlaternen, areaMood, laternenpfaehle, wimpelkette, gipfelfahnen,
  nebelschwaden, irrlichter, treibgut, felsnadeln, schatzhaufen, frachtnetze, hafenkram, bojen,
} from './_helpers_a.js';
import { leuchtturm, brandung } from '../w5/_helpers_a.js';
import { moewen } from '../w3/_helpers_d.js';

const Y = 1;           // Decks und Inseln
const LX = 100, LY = 4; // Laderaum (x, Boden – über dem Nebelmeer der Kulisse)
const SEA = -1.6;      // Nebelmeer (Absturz)
const WL = -1.4;       // sichtbare Wasserlinie der Kulisse (theme wreck: seaLevel − 0,4)

/** Schaumsaum um ein Rechteck (Inselrand) auf der Wasserlinie. */
const saum = (x0, x1, zA, zB, d = 0.35) => {
  const a = [x0 - d, WL, zA + d], b = [x1 + d, WL, zA + d], c = [x1 + d, WL, zB - d], e = [x0 - d, WL, zB - d];
  return [[a, b], [b, c], [c, e], [e, a]];
};

function build(level) {
  holzsteg(level, -4.6, 4.6, 9.6, -6.4, Y, { bottom: -3 });
  holzsteg(level, -5.6, 5.6, -74.4, -85.8, Y, { bottom: -3, seed: 4 });
  holzsteg(level, -7.6, 7.6, -160.4, -177.6, Y, { bottom: -3, seed: 7 });
  // Laderaum
  laderaum(level, { x: LX, y: LY, z0: -6, z1: -62, w: 16, h: 7, beams: [{ y: LY + 3.9, z: -53, d: 1.6, h: 0.5 }] });
  holzsteg(level, LX - 8, LX + 8, -6, -20.5, LY, { posts: false, seed: 11 });
  holzsteg(level, LX - 8, LX - 3.5, -20.5, -27.5, LY, { posts: false, seed: 12 });
  holzsteg(level, LX + 3.5, LX + 8, -20.5, -27.5, LY, { posts: false, seed: 13 });
  holzsteg(level, LX - 8, LX + 8, -27.5, -30, LY, { posts: false, seed: 14 });
  holzsteg(level, LX - 3.5, LX + 3.5, -20.5, -27.5, LY - 4, { posts: false, seed: 17 });
  holzsteg(level, LX - 8, LX + 8, -46, -62, LY, { posts: false, seed: 15 });
  kisten(level, [
    [LX - 6.2, LY, -12, 1.4], [LX - 6.2, LY + 1.4, -12, 1.2, 0.3], [LX + 6.4, LY, -14.5, 1.4], [LX + 5.2, LY, -16, 1.2, 0.5],
    [LX + 2.6, LY - 4, -26.4, 1.4], [LX + 2.6, LY - 2.6, -26.4, 1.2, 0.2],
    [LX - 6.6, LY, -49.4, 1.4], [LX - 6.6, LY + 1.4, -49.4, 1.4], [LX + 6.6, LY, -58, 1.4],
  ]);
  geisterlaternen(level, [[LX - 4, LY + 6.6, -14], [LX + 4, LY + 6.6, -26], [LX - 4, LY + 6.6, -38], [LX + 4, LY + 6.6, -50], [LX, LY + 6.6, -58]]);
  // Querbalken über dem zweiten Ring (Stempel)
  level.world.add({ type: 'box', min: [LX - 8, LY + 3.9, -53.8], max: [LX + 8, LY + 4.4, -52.2], tag: 'balken' });
  schatzhaufen(level, LX - 6.2, LY, -8.4, 0.4);
  frachtnetze(level, [[LX - 6.4, LY + 6.8, -19, 2.2], [LX + 6.4, LY + 6.8, -45, 2.4]]);
  for (const z of [-11, -31, -46.5]) wimpelkette(level, [LX - 7.8, LY + 5.8, z], [LX + 7.8, LY + 5.8, z], 13, 0.9);
  hafenkram(level, { taue: [[LX + 6.6, LY, -20], [LX - 6.8, LY, -56]], netze: [[LX - 6.6, LY + 0.01, -58.6, 1.5]] });

  // ---------------- Anleger: Laternenpfähle, Wimpel, Rettungsringe, Taurollen, bunte Fischkisten, Netze
  laternenpfaehle(level, [
    [-4.3, Y, 9.2, 0], [4.3, Y, 9.2, Math.PI], [-4.3, Y, -6, 0], [4.3, Y, -6, Math.PI],
    [3.5, Y, -50.9, Math.PI],
    [-5.3, Y, -74.6, 0], [5.3, Y, -74.6, Math.PI], [-5.3, Y, -85.6, 0], [5.3, Y, -85.6, Math.PI],
    [-1.4, Y, -96.9, Math.PI], [1.4, Y, -109.3, 0],
    [-3.6, Y, -147.6, 0], [3.6, Y, -147.6, Math.PI],
    [-7.3, Y, -160.6, 0], [7.3, Y, -160.6, Math.PI], [-7.3, Y, -177.4, 0],
  ]);
  for (const [x, z0, z1] of [[-4.3, 9.2, -6], [4.3, 9.2, -6], [-5.3, -74.6, -85.6], [5.3, -74.6, -85.6], [-7.3, -160.6, -177.4]]) {
    wimpelkette(level, [x, Y + 2.75, z0], [x, Y + 2.75, z1], Math.round(Math.abs(z1 - z0) / 1.1), 0.5);
  }
  wimpelkette(level, [-7.3, Y + 2.75, -177.4], [4.2, Y + 7.6, -175.4], 12, 0.7);
  hafenkram(level, {
    ringe: [[-4.3, Y + 1.4, 9.5, 0], [4.3, Y + 1.4, 9.5, 0], [-5.3, Y + 1.4, -74.3, 0], [5.3, Y + 1.4, -74.3, 0], [5.4, Y + 1.7, -173.95, 0]],
    taue: [[3.6, Y, 5.6], [-3.9, Y, -1.2], [-4.4, Y, -83.4], [6.2, Y, -164.2], [-2.8, Y, -52]],
    kisten: [
      [3.4, Y, 0.4, 0.8, 0x3d8bff, 0.2], [3.9, Y, -0.7, 0.7, 0xffd23d, -0.3], [-3.6, Y, -5.1, 0.8, 0xe8283a, 0.1],
      [4.5, Y, -77.2, 0.8, 0x4fd04a, 0.3], [4.6, Y, -78.4, 0.6, 0xff8ac8, -0.2],
      [-6, Y, -166, 0.8, 0x3d8bff, 0.2], [-6.3, Y, -167.2, 0.7, 0xe8283a, 0.5], [-6.1, Y + 0.56, -166.5, 0.6, 0xffd23d, -0.2],
    ],
    netze: [[2.4, Y + 0.01, 8.4, 0.2], [4.1, Y + 0.01, -84.4, 0.4], [-5.4, Y + 0.01, -176.4, -0.3]],
  });
  // Zielinsel: Leuchtturm (fest) neben dem Zielmast
  leuchtturm(level, 5.4, Y, -175.4, { h: 9, r: 1.3 });

  // ---------------- Meer: Felsnadeln, Treibgut, Schaumsäume
  felsnadeln(level, WL, [[-12.5, -4, 7, 1.8], [12, -22, 6, 1.6], [-13, -44, 8, 2], [12.5, -64, 5, 1.4], [-11.5, -92, 6, 1.6], [11.5, -104, 7, 1.8], [-13, -128, 6, 1.6], [13, -150, 8, 2], [-13.5, -170, 6, 1.6]], { shadow: false });
  brandung(level, [
    ...saum(-5, 5, 10, -6.4), ...saum(-9.4, -7, -15.2, -17.6), ...saum(-4, 4, -50.4, -57.4), ...saum(-6, 6, -74, -86),
    ...saum(-1.6, 1.6, -95.4, -98.4), ...saum(-1.6, 1.6, -107.8, -110.8), ...saum(-4, 4, -140.8, -148), ...saum(-8, 8, -160, -178),
  ]);
}

function setup(level) {
  areaMood(level, {}, [{ min: [LX - 20, -70], max: [LX + 20, 0], mood: 'laderaum' }]);
  gipfelfahnen(level, [[4.5, Y, -4.2, 0x3d8bff, 4.4], [-5.6, Y, -79.6, 0xffd23d, 4.2], [-6.4, Y, -170.2, 0xe8283a, 4.6]]);
  treibgut(level, WL, [[7.5, -6, 'fass', 0.3], [-8, -30, 'planke', 0.8], [8.5, -48, 'kiste', 0.2], [-7.5, -66, 'fass', 1.2], [6.5, -90, 'planke', -0.4], [-6.5, -116, 'kiste', 0.6], [8, -138, 'fass', 0.1], [-9.5, -156, 'planke', 1.1]]);
  bojen(level, WL, [[6.5, -18, 0xe8283a], [-6.8, -36, 0x4fd04a], [7, -70, 0xe8283a], [-6, -102, 0xffd23d], [6.4, -124, 0x3d8bff], [-6.6, -158, 0xe8283a]]);
  nebelschwaden(level, [[-10, -0.9, -12, 3], [11, -0.9, -36, 3.5], [-11, -0.9, -62, 3], [10, -0.9, -96, 3.2], [-10, -0.9, -124, 3.5], [11, -0.9, -156, 3]], { drift: [0.3, 0.05], span: 5 });
  irrlichter(level, [[-8, 0, -88], [8, 0.4, -100], [-7, 0.2, -114], [-23, 2, -28], [-27, 2.4, -33], [LX - 5, LY - 1.4, -34], [LX + 5, LY - 1.6, -40], [LX, LY - 1, -44]]);
  moewen(level, [{ center: [0, 9, -30], radius: 9, n: 3 }, { center: [2, 10, -120], radius: 10, n: 3 }, { center: [4, 12, -172], radius: 7, n: 3 }]);
}

export const LEVEL = {
  id: '6-2',
  world: 6,
  title: 'Schaukelschiffe im Nebelmeer',
  archetype: 'parcours',
  theme: 'wreck',
  music: 'course_wreck',
  timeLimit: 400,
  killY: -12,
  build,
  setup,
  start: { pos: [0, Y, 6], yaw: Math.PI / 2 },
  camera: [
    { from: 14, to: -58, pitch: 38, dist: 13, fov: 42, x: 0, xLock: 0.4, area: [-40, 40] },
    { from: -58, to: -122, pitch: 40, dist: 13, fov: 42, x: 0, xLock: 0.5, area: [-40, 40] },
    { from: -122, to: -182, pitch: 38, dist: 13.5, fov: 42, x: 0, xLock: 0.4, area: [-40, 40] },
    // Laderaum (abseits)
    { from: 0, to: -70, pitch: 50, dist: 13, fov: 40, x: LX, xLock: 0.55, area: [LX - 20, LX + 20] },
  ],
  segments: [
    { type: 'killplane', y: SEA },
    // ================================================================ 1 Schiffsdeck
    isl(-5, 5, 10, -6.4, Y, 5, { top: 'rock' }),
    isl(-9.4, -7, -15.2, -17.6, Y + 1.2, 6, { top: 'rock' }),
    { type: 'kippschiff', id: 'schiff1', pos: [0, Y, -15.2], length: 16, width: 7, style: 'geist', wave: { amp: 5, period: 5.5 } },
    { type: 'kippsteg', id: 'steg', from: [0, Y, -23.6], to: [0, Y, -33.2], width: 1, style: 'geist' },
    { type: 'kippschiff', id: 'schiff2', pos: [0, Y, -41.8], length: 16, width: 7, style: 'geist', rails: false, weight: 1.4, slide: 1.4, maxTilt: 12, wave: { amp: 5, period: 5.5, phase: 0.5 } },
    isl(-4, 4, -50.4, -57.4, Y, 5, { top: 'rock' }),
    { type: 'deco_w6', items: [
      { kind: 'fass', pos: [-3.6, Y, 3] }, { kind: 'fass', pos: [-3.1, Y, 1.9], size: 0.9 }, { kind: 'kiste', pos: [3.6, Y, 2.4] },
      { kind: 'anker', pos: [3.4, Y, -2.6], yaw: 0.6 }, { kind: 'steuerrad', pos: [-3.4, Y, -3.4] },
      { kind: 'wrack', pos: [-2.6, Y, -55.6], part: 'mast', yaw: 0.3 }, { kind: 'wrackteil', pos: [2.6, Y, -52.6], yaw: 1 },
      { kind: 'geisterschiff', pos: [-26, -1, -30], length: 14, width: 5, yaw: Math.PI / 2 + 0.3, shadow: false },
      { kind: 'wrack', pos: [22, -1.2, -20], part: 'bug', yaw: -0.8, shadow: false },
    ] },

    // ================================================================ 2 Laderaum (abseits)
    isl(LX - 8, LX + 8, -6, -20.5, LY, 4.6, { top: 'none' }),
    isl(LX - 8, LX - 3.5, -20.5, -27.5, LY, 4.6, { top: 'none' }),
    isl(LX + 3.5, LX + 8, -20.5, -27.5, LY, 4.6, { top: 'none' }),
    isl(LX - 8, LX + 8, -27.5, -30, LY, 4.6, { top: 'none' }),
    isl(LX - 3.5, LX + 3.5, -20.5, -27.5, LY - 4, 2, { top: 'none' }),
    isl(LX - 8, LX + 8, -30, -46, LY - 3.6, 3, { top: 'stone' }),
    { type: 'water', pos: [LX, LY - 3.6, -38], size: [16, 3.2, 16] },
    isl(LX - 8, LX + 8, -46, -62, LY, 3, { top: 'none' }),

    // ================================================================ 3 Checkpoint und Kippbrücke
    isl(-6, 6, -74, -86, Y, 5, { top: 'rock' }),
    { type: 'kippsteg', id: 'bruecke1', from: [0, Y, -86.2], to: [0, Y, -95.2], width: 1.4, style: 'geist', wave: { amp: 6, period: 3.6 } },
    isl(-1.6, 1.6, -95.4, -98.4, Y, 5, { top: 'rock' }),
    { type: 'kippsteg', id: 'bruecke2', from: [0, Y, -98.6], to: [0, Y, -107.6], width: 1.2, style: 'geist', wave: { amp: 7, period: 3.3, phase: 0.4 } },
    isl(-1.6, 1.6, -107.8, -110.8, Y, 5, { top: 'rock' }),
    { type: 'kippsteg', id: 'bruecke3', from: [0, Y, -111], to: [0, Y, -120.2], width: 1, style: 'geist', wave: { amp: 7, period: 3.0, phase: 0.2 } },

    // ================================================================ 4 Letztes Schiff, Zielinsel
    { type: 'kippschiff', id: 'schiff3', pos: [0, Y, -130.6], length: 20, width: 8, style: 'geist', masts: 3, rails: false, weight: 1.2, slide: 1.4, maxTilt: 12, wave: { amp: 4, period: 6 } },
    isl(-4, 4, -140.8, -148, Y, 5, { top: 'rock' }),
    isl(-8, 8, -160, -178, Y, 5, { top: 'rock' }),
  ],
  enemies: [
    // Schubser (stoßen ohne Schaden): sie bewachen ihren Platz (gehen gegen das Rutschen zurück) – der große auf Schiff 2 trägt den Stern
    { kind: 'schubser', id: 'schubser2', pos: [0, Y, -43.4], behavior: 'guard', sight: 6, warn: 0.8, push: 6.5, lift: 4.5, size: 1.15, weight: 1.3, wake: 80 },
    { kind: 'schubser', id: 'boss1', pos: [-1.8, Y, -127.6], behavior: 'guard', sight: 6, warn: 0.8, push: 6.5, lift: 4.5, wake: 400 },
    { kind: 'schubser', id: 'boss2', pos: [1.8, Y, -133.6], behavior: 'guard', sight: 6, warn: 0.8, push: 6.5, lift: 4.5, wake: 400 },
    { kind: 'walzenwerfer', id: 'walze', pos: [-8.2, Y + 1.2, -16.4], dir: [1, 0], aim: 'dir', interval: 3.4, first: 1.5, speed: 3.4, life: 6, max: 2 },
    { kind: 'kreisgeist_kreis', id: 'ring1', pos: [LX, LY + 0.3, -24], count: 8, radius: 3.0, speed: 1.4 },
    { kind: 'kreisgeist_kreis', id: 'ring2', pos: [LX, LY + 0.3, -53], count: 8, radius: 3.2, speed: 1.6, cw: true },
    { kind: 'spuk', id: 'spuk1', pos: [LX - 4, LY + 1.2, -36] },
    { kind: 'spuk', id: 'spuk2', pos: [LX + 4, LY + 1.2, -41] },
  ],
  items: [
    { kind: 'warpbox', id: 'w_lr', pos: [0, Y, -54.6], target: 'lr_in' },
    { kind: 'warpbox', id: 'lr_in', pos: [LX, LY, -9], target: 'w_lr' },
    { kind: 'warpbox', id: 'lr_out', pos: [LX, LY, -59.4], target: 'cp_in' },
    { kind: 'warpbox', id: 'cp_in', pos: [-3.6, Y, -76.4], target: 'lr_out' },
    { kind: 'warpbox', id: 'w_ziel', pos: [0, Y, -145.4], target: 'ziel_in', hidden: true },
    { kind: 'warpbox', id: 'ziel_in', pos: [0, Y, -163] },
    { kind: 'chest', id: 'truhe_laderaum', pos: [LX + 6, LY, -8.6], yaw: Math.PI, content: 'oneup' },
    { kind: 'task', id: 'aufgabe_stern', area: { min: [-4.5, Y - 1.5, -50], max: [4.5, Y + 5, -33.6] }, ids: ['schubser2'], star: 0, pos: [0, Y + 0.6, -41.8] },
    { kind: 'task', id: 'aufgabe_ziel', area: { min: [-5, Y - 1.5, -140.6], max: [5, Y + 5, -120.6] }, ids: ['boss1', 'boss2'], reward: { reveal: 'w_ziel' } },
    line([0, Y + 0.6, 1], [0, Y + 0.6, -5], 4),
    line([0, Y + 0.6, -25], [0, Y + 0.6, -32], 5),
    ring([LX, LY - 1.8, -38], 2.6, 8),
    line([LX - 5, LY - 2.8, -33], [LX + 5, LY - 2.8, -33], 5),
    ring([LX, LY + 0.6, -24], 1.4, 6),
    line([0, Y + 0.6, -88], [0, Y + 0.6, -94], 4),
    line([0, Y + 0.6, -100], [0, Y + 0.6, -106], 4),
  ],
  blocks: [
    { kind: 'hidden', pos: [-2.2, Y + 2.4, -52.6], content: 'oneup' },   // Extraleben auf dem Wrackfelsen
  ],
  checkpoint: [0, Y, -80],
  stars: [
    { pos: [0, Y + 0.6, -41.8], hidden: true, id: 'stern_schubser' },   // 0: Stern-Schubser vom zweiten Schiff gestoßen
    [LX, LY - 3.9, -23.2],                                               // 1: im Loch unter dem Kreisgeist-Ring
    [0, Y + 3.3, -115.6],                                                // 2: über der letzten Kippbrücke
  ],
  stamp: [LX, LY + 4.45, -53],
  goal: [0, Y, -173],
  marks: { start: [0, Y, 6], laderaum: [LX, LY, -12], cp: [0, Y, -80] },
};
