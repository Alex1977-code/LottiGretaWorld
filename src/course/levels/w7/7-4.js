// 7-4 „Schubser-Rummel im Blauglutkessel“ (Archetyp parcours, Bauplan 7-4: „Zeitlimit 400 s, ca. 220 m, 3 Abschnitte:
// Pfeilplattformen – Steinbauten über blauer Lava, Pfeilplattformen tauchen auf und versinken; Checkpoint. Zylinderzone –
// Zylinder, Pfeilplattformen aus Wänden, rotierende Stachelwalzen; Röhre zum Finale. Kippplattform – 3 Schubser besiegen →
// 3 Pfeilplattformen zum Ziel. Sterne: 1) Sternring am Start 2) Rätselbox vor dem Checkpoint, Schubser in die Lava stoßen
// 3) neben dem vorletzten Zylinder. Stempel: kleine runde Plattform vor der Rätselbox. Gegner: Schubser (6), Knochenflieger
// (5), Stachelwalze (14), Pendelstachel (6).“). Thema bluelava, Musik course_bluebelt.
//
// Ein Festungskessel tief unter der Erde: kleine Steinbauten mit Zinnen, Goldkappen und blau glühenden Fenstern stehen im
// brodelnden blauen Lavasee; dazwischen tauchen Pfeilplattformen auf (vorher brodelt es, vor dem Versinken blinkt der
// Pfeil rot). Abschnitte (nach −Z):
//   Start (z 10 … −7):          Festungshof mit Sternring (acht Sternmünzen: Hof, zwei Seitensäulen, Sprünge → Stern 0
//                               über dem Hof); ?-Block mit Wurfsichel.
//   Pfeilplattformen (z −7 … −93): drei Pfeilplattformen → Steinbau A (zwei Pendelstacheln) → zwei Pfeilplattformen →
//                               Steinbau B (Schubser, zwei Stachelwalzen, Knochenflieger) → zwei Pfeilplattformen → Steinbau C
//                               (zwei Stachelwalzen, dahinter die Rätselbox; links davor die kleine runde Plattform mit dem
//                               Stempel) → Steinbrücke mit zwei Pendelstacheln → Steinbau D mit Checkpoint.
//   Rätselbox (abseits bei x ≈ 100): Steinplatte im Lavasee mit einem Schubser – in die Lava stoßen → Stern 1.
//   Zylinderzone (z −93 … −184): Zylinder 1 → Steinbau E (zwei Walzen) → drei Pfeilplattformen fahren aus einer hohen Mauer →
//                               Steinbau F (zwei Walzen, Schubser) → Zylinder 2 mit Stachelreihen → Steinbau G (zwei
//                               Pendelstacheln) → Zylinder 3 (rechts daneben ein Sims mit Stern 2) → Steinbau H (zwei
//                               Walzen) → Zylinder 4 → Steinbau I (zwei Walzen) mit der Röhre zum Finale.
//   Finale (abseits bei x ≈ 60): Röhrenausgang (zwei Walzen) → Kippplattform mit drei Schubsern – alle in die Lava stoßen →
//                               drei Pfeilplattformen tauchen auf → Zielhof mit Zielmast.
// Knochenflieger kreisen über C, D, E, H und I. Extraleben: unsichtbarer Block über Steinbau B, unsichtbarer Block am
// Röhrenausgang des Finales.

import {
  isl, line, ring, arc, rundPlatte, kippPlatte, festungRand, bruestung, glowPoints, wimpelkette,
} from './_helpers_b.js';
import { TYPES as SHIP } from '../../blocks/types/w6_ship.js';

const Y = 1.5;                 // Oberseite der Steinbauten
const LAVA = 0;                // blauer Lavaspiegel
const PT = Y - 0.5;            // Oberseite der Pfeilplattformen (aus der Lava)
const RX = 100;                // Rätselbox-Raum (x)
const FX = 60;                 // Finale (x)
const WR = 0.6, WH = WR + 0.55;

const S = (x0, x1, zA, zB, top = Y, o = {}) => isl(x0, x1, zA, zB, top, top + 2, { top: 'stone', ...o });

// ------------------------------------------------------------------ Steinbauten
const BAUTEN = {
  start: [-6, 6, 10, -7], A: [-3.5, 3.5, -21, -31], B: [-5, 7, -41, -56], C: [-4, 6, -66, -77], CD: [-1.25, 1.25, -77, -83],
  D: [-5, 5, -83, -93], E: [-5, 5, -100, -112], F: [-6, 6, -123, -133], G: [-5, 5, -140, -148], H: [-5, 5, -155, -163],
  I: [-6, 6, -170, -184], R: [RX - 6, RX + 6, -64, -76], J: [FX - 6, FX + 6, -176, -190], K: [FX - 6, FX + 6, -219, -232],
};

// ------------------------------------------------------------------ Pfeilplattformen
const pp = (id, x, z, phase, o = {}) => ({ type: 'pfeilplattform', id, pos: [x, PT - 0.5, z], size: [3, 0.5, 3], arrow: [0, -1], phase, wait: 2.2, up: 3.4, style: 'blau', ...o });
const PFEILPLATTEN = [
  pp('pf1', 0, -10, 0), pp('pf2', 0, -13.75, -1.2), pp('pf3', 0, -17.5, -2.4),
  pp('pf4', 0.5, -33.25, 0.4), pp('pf5', 0.5, -37.5, -0.8),
  pp('pf6', 2, -58.5, 0.8), pp('pf7', 2, -62.5, -0.4),
  // aus der hohen Mauer rechts neben der Lücke E → F
  { type: 'pfeilplattform', id: 'pw1', from: 'wand', pos: [5, Y - 0.4, -114.5], size: [3, 0.4, 2.5], dir: [-1, 0], wait: 1.8, up: 3.4, phase: 0, style: 'blau' },
  { type: 'pfeilplattform', id: 'pw2', from: 'wand', pos: [5, Y - 0.4, -118], size: [3, 0.4, 2.5], dir: [-1, 0], wait: 1.8, up: 3.4, phase: -1.1, style: 'blau' },
  { type: 'pfeilplattform', id: 'pw3', from: 'wand', pos: [5, Y - 0.4, -121.5], size: [3, 0.4, 2.5], dir: [-1, 0], wait: 1.8, up: 3.4, phase: -2.2, style: 'blau' },
  // Finale: erscheinen, wenn alle drei Schubser der Kippplattform in der Lava sind
  pp('pz1', FX, -208.5, 0, { mode: 'signal' }), pp('pz2', FX, -212.5, 0, { mode: 'signal' }), pp('pz3', FX, -216.5, 0, { mode: 'signal' }),
];

// ------------------------------------------------------------------ Stachelwalzen (14) und Pendelstacheln (6)
const W = (id, x, z, length, speed = 1.3, y = Y) => ({ type: 'stachelwalze_rot', id, pos: [x, y + WH, z], radius: WR, length, axis: 'x', speed, stand: true });
const WALZEN = [
  W('w1', -2, -45, 5), W('w2', 4, -51, 5, -1.3),
  W('w3', 3.25, -69.5, 5.5), W('w4', 3.25, -73.5, 5.5, -1.3),
  W('w5', -2, -103.5, 6), W('w6', 2, -108, 6, -1.3),
  W('w7', -2.5, -90, 5), W('w8', 3.5, -131.4, 5, -1.3),
  W('w9', -2, -158, 6), W('w10', 2, -160.5, 6, -1.3),
  W('w11', -2.5, -173.5, 7), W('w12', 2.5, -176.5, 7, -1.3),
  W('w13', FX - 2.5, -183, 4.5), W('w14', FX + 2.5, -186.5, 4.5, -1.3),
];
const PD = (id, x, z, phase) => ({ type: 'pendelstachel', id, pos: [x, Y + 5.6, z], length: 4.6, radius: 0.6, swing: 55, period: 3, phase, plane: 'x', color: 'blau' });
const PENDEL = [
  PD('pd1', 0, -24, 0), PD('pd2', 0, -28, 0.5),
  PD('pd3', 0, -78.6, 0.25), PD('pd4', 0, -81.6, 0.75),
  PD('pd5', 0, -142.5, 0.1), PD('pd6', 0, -145.5, 0.6),
];

// ------------------------------------------------------------------ Zylinder (liegend, laufen der Figur entgegen)
const Z = (id, z, o = {}) => ({ type: 'zylinder', id, pos: [0, Y - 2.5, z], radius: 2.5, length: 9, axis: 'x', speed: 0.5, style: 'blau', ...o });
const ZYLINDER = [Z('zyl1', -96.5), Z('zyl2', -136.5, { spikes: 2, speed: 0.42 }), Z('zyl3', -151.5), Z('zyl4', -166.5, { speed: 0.55 })];

function build(level) {
  // Festungs-Zier: Zinnen an den Kanten, an denen man nicht springen muss
  festungRand(level, [
    { x0: -6, x1: 6, zA: 10, zB: -7, y: Y, edges: 'lrf' },
    { x0: -3.5, x1: 3.5, zA: -21, zB: -31, y: Y, edges: 'lr', windows: true },
    { x0: -5, x1: 7, zA: -41, zB: -56, y: Y, edges: 'lr' },
    { x0: -4, x1: 6, zA: -66, zB: -77, y: Y, edges: 'r' },
    { x0: -5, x1: 5, zA: -83, zB: -93, y: Y, edges: 'lr' },
    { x0: -5, x1: 5, zA: -100, zB: -112, y: Y, edges: 'l' },
    { x0: -6, x1: 6, zA: -123, zB: -133, y: Y, edges: 'l' },
    { x0: -5, x1: 5, zA: -140, zB: -148, y: Y, edges: 'lr' },
    { x0: -5, x1: 5, zA: -155, zB: -163, y: Y, edges: 'lr' },
    { x0: -6, x1: 6, zA: -170, zB: -184, y: Y, edges: 'lrb' },
    { x0: FX - 6, x1: FX + 6, zA: -176, zB: -190, y: Y, edges: 'lrf' },
    { x0: FX - 6, x1: FX + 6, zA: -219, zB: -232, y: Y, edges: 'lrb' },
  ]);
  // Rand des Rätselbox-Raums: niedrige Pfosten (die Kanten bleiben offen – der Schubser soll in die Lava)
  festungRand(level, [{ x0: RX - 6, x1: RX + 6, zA: -64, zB: -76, y: Y, edges: '', windows: true }]);
  // hohe Mauer neben der Lücke E → F (aus ihr fahren die Pfeilplattformen)
  bruestung(level, [[6.5, 9, -111, -124, -2, Y + 5.5]], { color: 0x5a5e88, top: 0x8a8eb8 });
  // kleine runde Plattform vor der Rätselbox (Stempel)
  rundPlatte(level, { x: -7.2, z: -69, r: 1.3, top: Y, bottom: -2 });
  // Seitensäulen am Start (Sternmünzen)
  rundPlatte(level, { x: -8.6, z: -1.5, r: 1.0, top: Y + 0.6, bottom: -2 });
  rundPlatte(level, { x: 8.6, z: -1.5, r: 1.0, top: Y + 0.6, bottom: -2 });
  // Sims rechts neben Zylinder 3 (Stern 2)
  rundPlatte(level, { x: 7.4, z: -151.5, r: 1.2, top: Y + 1.4, bottom: -2 });
  // Kippplattform des Finales
  kippPlatte(level, { id: 'kipp', pos: [FX, Y, -197.5], length: 14, width: 8, yaw: Math.PI / 2, maxTilt: 7, weight: 1.0, response: 1.3, back: 0.6, thick: 0.5 }, SHIP.wippe);
  // blaue Leuchtflecken über der Lava (Brodeln zwischen den Bauten)
  glowPoints(level, [[0, LAVA + 0.4, -14, 2.2], [0.5, LAVA + 0.4, -35, 2], [2, LAVA + 0.4, -60.5, 2], [0, LAVA + 0.4, -96.5, 3], [4, LAVA + 0.4, -118, 2.6],
    [0, LAVA + 0.4, -136.5, 3], [0, LAVA + 0.4, -151.5, 3], [0, LAVA + 0.4, -166.5, 3], [FX, LAVA + 0.4, -212, 3], [FX, LAVA + 0.4, -197, 4]],
  { color: 0x4ab8ff, size: 6, opacity: 0.5, pulse: 0.5 });
  for (const [a, b] of [[[-6, Y + 2.6, -7], [6, Y + 2.6, -7]], [[-4, Y + 2.2, -93], [4, Y + 2.2, -93]], [[FX - 6, Y + 2.4, -232], [FX + 6, Y + 2.4, -232]]]) wimpelkette(level, a, b, 12, 0.5);
}

function setup(level) {
  // Kippplattform-Schubser: sind alle drei in der Lava, tauchen die Pfeilplattformen zum Ziel auf (task, siehe items)
  void level;
}

export const LEVEL = {
  id: '7-4',
  world: 7,
  title: 'Schubser-Rummel im Blauglutkessel',
  archetype: 'parcours',
  theme: 'bluelava',
  music: 'course_bluebelt',
  timeLimit: 400,
  build,
  setup,
  start: { pos: [0, Y, 6], yaw: Math.PI / 2 },
  instances: { coin: { farHide: 44, shadow: false } },
  camera: [
    { from: 14, to: -40, pitch: 46, dist: 14, ahead: 2, area: [-40, 40] },
    { from: -40, to: -95, pitch: 46, dist: 15, ahead: 2, area: [-40, 40] },
    { from: -95, to: -185, pitch: 44, dist: 15, ahead: 2.5, area: [-40, 40] },
    { from: -170, to: -240, pitch: 48, dist: 17, ahead: 2, area: [40, 80], x: FX, xLock: 0.35 },
    { from: -55, to: -85, pitch: 52, dist: 17, ahead: 1, area: [80, 120], x: RX, xLock: 0.5 },
  ],
  segments: [
    // blaue Lava (fest) unter allem, Rätselbox-Raum und Finale mit eigener Lava
    { type: 'lavaspiegel', mode: 'fest', pos: [0, LAVA - 1.5, -90], size: [80, 1.5, 230], color: 'blau', bubbles: true },
    { type: 'lavaspiegel', mode: 'fest', pos: [RX, LAVA - 1.5, -70], size: [36, 1.5, 32], color: 'blau' },
    { type: 'lavaspiegel', mode: 'fest', pos: [FX, LAVA - 1.5, -204], size: [36, 1.5, 70], color: 'blau' },
    ...Object.values(BAUTEN).map(([x0, x1, zA, zB]) => S(x0, x1, zA, zB)),
    ...PFEILPLATTEN,
    ...WALZEN,
    ...PENDEL,
    ...ZYLINDER,
    // Röhre zum Finale und Ausgang
    { type: 'pipe', id: 'finale_ein', pos: [0, Y, -181], height: 1.4, target: 'finale_aus', color: 'blue' },
    { type: 'pipe', id: 'finale_aus', pos: [FX, Y, -179.2], height: 1.2 },
    { type: 'deco_w7', items: [
      { kind: 'burgturm', pos: [-9.5, -1, -26], height: 9, radius: 1.6, solid: true }, { kind: 'burgturm', pos: [11, -1, -48], height: 10, radius: 1.8, solid: true },
      { kind: 'burgturm', pos: [-10, -1, -88], height: 9, radius: 1.6, solid: true }, { kind: 'burgturm', pos: [10.5, -1, -143], height: 10, radius: 1.8, solid: true },
      { kind: 'burgturm', pos: [-10.5, -1, -173], height: 9, radius: 1.6, solid: true }, { kind: 'burgturm', pos: [FX + 10, -1, -222], height: 10, radius: 1.8, solid: true },
      { kind: 'fackel', pos: [-5.2, Y, 8.8], mount: 'stand', color: 'blau' }, { kind: 'fackel', pos: [5.2, Y, 8.8], mount: 'stand', color: 'blau' },
      { kind: 'fackel', pos: [-4.2, Y, -84], mount: 'stand', color: 'blau' }, { kind: 'fackel', pos: [4.2, Y, -84], mount: 'stand', color: 'blau' },
      { kind: 'fackel', pos: [FX - 5, Y, -230.8], mount: 'stand', color: 'blau' }, { kind: 'fackel', pos: [FX + 5, Y, -230.8], mount: 'stand', color: 'blau' },
      { kind: 'fahne', pos: [-5, Y, -42], height: 4.5 }, { kind: 'fahne', pos: [5, Y, -170.5], height: 4.5 },
      { kind: 'kette', pos: [-3, Y + 7, -48], length: 4 }, { kind: 'kette', pos: [5, Y + 7, -127], length: 4 }, { kind: 'kette', pos: [-3, Y + 7, -159], length: 4 },
      { kind: 'knochen', pos: [-3.5, Y, -90], n: 4 }, { kind: 'knochen', pos: [FX + 4, Y, -188], n: 3 },
    ] },
    { type: 'deco_w7', shadow: false, items: [
      { kind: 'basaltsaeulen', pos: [-16, LAVA, -60], n: 6, height: [3, 9], size: [6, 24], glow: 'blau' },
      { kind: 'basaltsaeulen', pos: [16, LAVA, -100], n: 6, height: [3, 9], size: [6, 24], glow: 'blau' },
      { kind: 'basaltsaeulen', pos: [-16, LAVA, -150], n: 6, height: [3, 9], size: [6, 24], glow: 'blau' },
      { kind: 'vulkanfelsen', pos: [15, LAVA, -20], size: [6, 14], n: 3, color: 'blau' },
      { kind: 'vulkanfelsen', pos: [-15, LAVA, -120], size: [6, 14], n: 3, color: 'blau' },
      { kind: 'vulkanfelsen', pos: [FX - 14, LAVA, -205], size: [6, 20], n: 3, color: 'blau' },
    ] },
    { type: 'sign', pos: [-4.4, Y, 8], text: 'Blauglutkessel', size: [2.8, 0.9], yaw: 0 },
    { type: 'sign', pos: [-3.4, Y, -182.6], text: 'Zum Finale', size: [2.4, 0.9], yaw: 0 },
  ],
  blocks: [
    { kind: 'question', pos: [3, Y + 2.2, 4], content: 'sichel' },
    { kind: 'question', pos: [-3, Y + 2.2, -86], content: 'sichel' },
    { kind: 'coinblock', pos: [3, Y + 2.2, -86], count: 6 },
    { kind: 'hidden', pos: [6, Y + 2.6, -54], content: 'oneup' },
    { kind: 'hidden', pos: [FX + 3.5, Y + 2.6, -177.5], content: 'oneup' },
  ],
  enemies: [
    // Schubser (6): B, F, Rätselbox, drei auf der Kippplattform
    { kind: 'schubser', id: 'sb_b', pos: [3, Y, -46.5], behavior: 'guard', sight: 6 },
    { kind: 'schubser', id: 'sb_f', pos: [1.5, Y, -127], behavior: 'guard', sight: 5.5 },
    { kind: 'schubser', id: 'sb_raetsel', pos: [RX, Y, -72], behavior: 'chase', sight: 9 },
    // Kippplattform: drei Wächter mit Abstand (sehen die Figur erst aus 5 m – einer nach dem anderen), sanfter Stoß
    { kind: 'schubser', id: 'sb_k1', pos: [FX - 2.2, Y, -193], behavior: 'guard', sight: 5, push: 7, warn: 0.75 },
    { kind: 'schubser', id: 'sb_k2', pos: [FX + 2.2, Y, -198.5], behavior: 'guard', sight: 5, push: 7, warn: 0.75 },
    { kind: 'schubser', id: 'sb_k3', pos: [FX - 2, Y, -202.6], behavior: 'guard', sight: 5, push: 7, warn: 0.75 },
    // Knochenflieger (5)
    { kind: 'knochenflieger', id: 'kf1', center: [0, Y + 3.8, -87.5], radius: 3 },
    { kind: 'knochenflieger', id: 'kf2', center: [-1, Y + 3.8, -72.5], radius: 3, phase: 0.5 },
    { kind: 'knochenflieger', id: 'kf3', center: [0, Y + 3.8, -107.5], radius: 3, phase: 0.25 },
    { kind: 'knochenflieger', id: 'kf4', center: [0, Y + 3.8, -160], radius: 3, phase: 0.75 },
    { kind: 'knochenflieger', id: 'kf5', center: [0, Y + 3.8, -177.5], radius: 3, phase: 0.4 },
  ],
  items: [
    // Start
    line([-2, Y + 0.5, 1], [2, Y + 0.5, 1], 3),
    ...arc([0, PT + 0.6, -8.5], [0, PT + 0.6, -19.5], 4, 1.2),
    line([-2.4, Y + 0.5, -23], [-2.4, Y + 0.5, -29], 3), line([2.4, Y + 0.5, -23], [2.4, Y + 0.5, -29], 3),
    ...arc([0.5, PT + 0.6, -32], [0.5, PT + 0.6, -39.5], 3, 1),
    ring([1, Y + 0.5, -48.5], 2, 6),
    ...arc([2, PT + 0.6, -57], [2, PT + 0.6, -64.5], 3, 1),
    line([-2, Y + 0.5, -67], [-2, Y + 0.5, -76], 4),
    line([0, Y + 0.5, -78], [0, Y + 0.5, -82], 3),
    // Zylinderzone
    ...arc([0, Y + 0.5, -93], [0, Y + 0.5, -100], 3, 1.6),
    line([3.8, Y + 0.5, -101], [3.8, Y + 0.5, -106], 3), line([-3.8, Y + 0.5, -106], [-3.8, Y + 0.5, -111], 3),
    line([5, Y + 0.6, -114.5], [5, Y + 0.6, -121.5], 3),
    line([-4, Y + 0.5, -127], [-4, Y + 0.5, -130], 3), line([-3.5, Y + 0.5, -131.2], [-3.5, Y + 0.5, -132.6], 2),
    ...arc([0, Y + 0.5, -133], [0, Y + 0.5, -140], 4, 1.8),
    line([-3, Y + 0.5, -141], [3, Y + 0.5, -147], 4),
    ...arc([0, Y + 0.5, -148], [0, Y + 0.5, -155], 4, 1.8),
    ...arc([0, Y + 0.5, -163], [0, Y + 0.5, -170], 4, 1.8),
    // Finale
    ring([FX, Y + 0.6, -197.5], 3, 8),
    line([FX - 3, Y + 0.5, -224], [FX + 3, Y + 0.5, -224], 4),
    // Rätselbox-Raum
    ring([RX, Y + 0.5, -70], 4, 8),
    // Sternring am Start (Stern 0): Hof, zwei Seitensäulen, zwei Sprünge
    {
      kind: 'starring', id: 'sternring', pos: [-3.2, Y, 2.5], star: 0, time: 12,
      coins: [[-3.6, Y + 0.5, -2], [3.6, Y + 0.5, -2], [-8.6, Y + 1.1, -1.5], [8.6, Y + 1.1, -1.5], [0, Y + 2.4, -1], [-3, Y + 0.5, -5.6], [3, Y + 0.5, -5.6], [0, Y + 2.4, -5]],
    },
    // Rätselbox (Stern 1): Schubser in die Lava stoßen
    { kind: 'warpbox', id: 'rb1', style: 'mystery', pos: [4.2, Y, -75.6], target: 'rb2' },
    { kind: 'warpbox', id: 'rb2', style: 'mystery', pos: [RX, Y, -65.2], target: 'rb1',
      task: { area: { min: [RX - 7, Y - 3, -77], max: [RX + 7, Y + 6, -63] }, ids: ['sb_raetsel'], star: 1, pos: [RX, Y + 0.3, -70] } },
    // Finale: drei Schubser in die Lava → drei Pfeilplattformen
    { kind: 'task', id: 'kipp_aufgabe', area: { min: [FX - 8, Y - 4, -206], max: [FX + 8, Y + 6, -189] }, ids: ['sb_k1', 'sb_k2', 'sb_k3'],
      reward: [{ reveal: ['pz1', 'pz2', 'pz3'] }, { sfx: 'powerup_appear' }] },
  ],
  checkpoint: [{ pos: [0, Y, -86.5], yaw: Math.PI / 2 }, { pos: [FX, Y, -181], yaw: Math.PI / 2 }],
  stars: [
    { pos: [0, Y + 0.3, -3.5], hidden: true, id: 'stern0' },
    { pos: [RX, Y + 0.3, -70], hidden: true, id: 'stern1' },
    [7.4, Y + 1.4 + 0.2, -151.5],
  ],
  stamp: [-7.2, Y + 0.25, -69],
  goal: [FX, Y, -227.5],
  marks: { start: [0, Y, 6], cp: [0, Y, -86.5], raetsel: [4.2, Y, -75.6], finale: [FX, Y, -181], ziel: [FX, Y, -227.5] },
};
