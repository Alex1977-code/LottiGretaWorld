// 2-Haus „Villa Tick-Tack“ (Archetyp house, Bauplan 2-Haus: Prüfungs-Haus, 5 Mini-Räume à 10 s, je ein Stern).
// Jeder Raum hat eigene Tapete, eigenes Parkett, Teppich, Möbel, Bilder und tickende Wanduhren (der Minutenzeiger
// schafft eine Runde in 10 s – so lang wie die Prüfung). Die Räume liegen weit auseinander (x 0 / 40 / 80 / 120 / 160,
// z −16 / −80 / −144 / −208 / −272): je Raum ein eigener 32-m-Abschnitt (Culling) und eine eigene Kamera.
//   1 Kinderzimmer   zwei Rollpilze           – alle besiegen (Stampfattacke, oder einen auf den anderen werfen)
//   2 Bibliothek     zwei Panzerkröten         – alle besiegen (draufspringen; ein Panzer kann die andere umwerfen)
//   3 Küche          zwei Krallen-Pilzlinge    – acht Münzen einsammeln (drei liegen auf dem Küchentisch)
//   4 Uhrenstube     vier Hackvögel            – den Stern auf dem Podest am Ende des Uhrengangs erreichen
//   5 Kaminzimmer    zwei Feuer-Werfer         – alle besiegen (einer tänzelt auf der Holzgalerie)
// Zeit abgelaufen → Haus verlassen mit den bisherigen Sternen (fail 'exit'). Thema house, Musik course_house.
// Level-Haken (LEVEL.setup, _helpers_c.js): Ausstattung aller Räume.

import { isl, levelSetup, houseRoom, houseFinish } from './_helpers_c.js';

const Y = 1, W = 14, D = 12, H = 4;
const RX = (i) => i * 40, RZ = (i) => -64 * i - 16;

/** Ausstattung je Raum (Koordinaten relativ zur Raummitte, Rückwand bei z −6). */
const ROOMS = [
  { id: 'r1', paper: 'wolken', wall: 0x8ac0f0, floor: [0xe8c890, 0xd8b478], wood: 0xf0f0f8,
    furniture: [
      { kind: 'bett', x: -5, z: -3.4, color: 0xff8fb0 }, { kind: 'kiste', x: 4.9, z: -5.2, color: 0x5ab8e8 },
      { kind: 'bausteine', x: 4.6, z: 2.6, seed: 1 }, { kind: 'bausteine', x: -5.6, z: 2.4, seed: 3, yaw: 0.6 },
      { kind: 'pflanze', x: 6.2, z: -2.4 }, { kind: 'stehlampe', x: -6.4, z: -5.3, color: 0xffd0e8 },
    ],
    rugs: [{ x: 0, z: 0.4, w: 5, d: 4, motif: 'teppich_bunt' }],
    pictures: [{ wall: 'back', at: -1.6, motif: 'lottigreta' }, { wall: 'back', at: 1.6, motif: 'haus', frame: 0xff7a5a },
      { wall: 'left', at: 0.5, motif: 'pflaume', frame: 0xff8fb0 }, { wall: 'right', at: 0.8, motif: 'huegel' }],
    clocks: [{ wall: 'back', at: 5, y: 2.9, r: 0.42 }] },
  { id: 'r2', paper: 'buecher', wall: 0x2f6a4a, floor: [0xa8744a, 0x94643c], wood: 0x5a3a22,
    furniture: [
      { kind: 'regal', x: -4.6, z: -5.65, w: 3.4, h: 2.6, seed: 0 }, { kind: 'regal', x: 0, z: -5.65, w: 3.4, h: 2.6, seed: 2 },
      { kind: 'regal', x: 4.6, z: -5.65, w: 3.4, h: 2.6, seed: 5 },
      { kind: 'globus', x: -5.8, z: 3.6 }, { kind: 'sessel', x: 5.6, z: 3.4, yaw: -Math.PI / 2, color: 0x8a3a3a },
      { kind: 'stehlampe', x: 6.3, z: 1.6 }, { kind: 'pflanze', x: -6.2, z: -1.2, size: 1.2 },
    ],
    rugs: [{ x: 0, z: 0.6, w: 6, d: 5, motif: 'teppich_gruen' }],
    pictures: [{ wall: 'left', at: 1, motif: 'berg', w: 1.6, h: 1.1 }, { wall: 'right', at: -1.6, motif: 'globus' }],
    clocks: [{ wall: 'right', at: 1.8, y: 2.8, r: 0.4, speed: 1 }] },
  { id: 'r3', paper: 'kacheln', wall: 0xe8e4d8, floor: [0xf0e8e0, 0xd0d8e8], wood: 0x6a8ac8,
    furniture: [
      { kind: 'schrank', x: -3.4, z: -5.62, w: 5.2 }, { kind: 'herd', x: 1.2, z: -5.6 }, { kind: 'kuehlschrank', x: 5.8, z: -5.6 },
      { kind: 'schrank', x: 3.4, z: -5.62, w: 1.6, color: 0xf0d8a8 },
      { kind: 'topf', x: -4.4, z: -5.6, y: 0.96, color: 0xe85a4a }, { kind: 'topf', x: -2.6, z: -5.55, y: 0.96 },
      { kind: 'tisch', x: 0, z: 0.4, w: 2.8, d: 1.5, h: 0.9, cloth: 0xe85a5a },
      { kind: 'stuhl', x: -1.9, z: 0.4, yaw: Math.PI / 2, solid: false }, { kind: 'stuhl', x: 1.9, z: 0.4, yaw: -Math.PI / 2, solid: false },
      { kind: 'pflanze', x: -6.2, z: 4.4, pot: 0x5a8ad0 },
    ],
    rugs: [],
    pictures: [{ wall: 'back', at: -3.4, y: 2.2, motif: 'kuchen', w: 1.3, h: 1.0 }, { wall: 'right', at: 1.2, motif: 'blumen' },
      { wall: 'left', at: -0.5, y: 1.7, motif: 'fenster', w: 1.8, h: 1.3, frame: 0xffffff }],
    clocks: [{ wall: 'back', at: 3.4, y: 2.6, r: 0.38, speed: 1 }] },
  { id: 'r4', paper: 'uhren', wall: 0x7a2440, floor: [0x9a6a4a, 0x8a5a3a], wood: 0x4a2a1a,
    furniture: [
      ...[-3.6, -0.8, 2.0].flatMap((z) => [{ kind: 'standuhr', x: -2.8, z, yaw: Math.PI / 2 }, { kind: 'standuhr', x: 2.8, z, yaw: -Math.PI / 2 }]),
      { kind: 'pflanze', x: -6, z: -5, size: 1.1 }, { kind: 'pflanze', x: 6, z: -5, size: 1.1 },
    ],
    rugs: [{ x: 0, z: -0.2, w: 2.6, d: 10.4, motif: 'teppich_rot' }],
    pictures: [],
    clocks: [{ wall: 'back', at: -3.8, y: 2.6, r: 0.5, speed: 1 }, { wall: 'back', at: 3.8, y: 2.6, r: 0.5, speed: 2 },
      { wall: 'back', at: 0, y: 3.1, r: 0.6, speed: 0.5 }, { wall: 'left', at: -1, y: 2.6, r: 0.45, speed: 1.5 }, { wall: 'right', at: 1, y: 2.6, r: 0.45, speed: 0.75 }] },
  { id: 'r5', paper: 'kamin', wall: 0xb8483a, floor: [0xc8945a, 0xb8844a], wood: 0x6a3a1a,
    furniture: [
      { kind: 'kamin', x: -1.6, z: -5.65, w: 3 },
      { kind: 'galerie', x: 4, z: -4.6, w: 5, d: 2.4, h: 2.7 },
      { kind: 'sofa', x: -2.6, z: 2.4, yaw: Math.PI, color: 0x5a3a8a }, { kind: 'sessel', x: -5.8, z: -1, yaw: Math.PI / 2, color: 0x5a3a8a },
      { kind: 'pflanze', x: -6.2, z: -5.2, size: 1.2 }, { kind: 'pflanze', x: 6.3, z: 4.6 }, { kind: 'stehlampe', x: -6.4, z: 4.6 },
    ],
    rugs: [{ x: -1.6, z: -0.6, w: 5, d: 3.4, motif: 'teppich_rot' }],
    pictures: [{ wall: 'back', at: -5, y: 2.2, motif: 'gesucht', w: 1.1, h: 1.1, frame: 0x8a5a3a }, { wall: 'left', at: 2.4, motif: 'meer', w: 1.5, h: 1.0 }],
    clocks: [{ wall: 'right', at: -1.2, y: 2.7, r: 0.45 }] },
];

function setup(level) {
  const shared = { pos: [], uv: [] };
  const clocks = [];
  ROOMS.forEach((r, i) => clocks.push(...houseRoom(level, { ...r, x: RX(i), z: RZ(i), w: W, d: D, h: H, y: Y }, shared)));
  houseFinish(level, shared, clocks);
}

const area = (i) => ({ min: [RX(i) - 7.5, Y - 2, RZ(i) - 6.5], max: [RX(i) + 7.5, Y + 8, RZ(i) + 6.5] });
const cam = (i, o = {}) => ({ pitch: o.pitch ?? 50, dist: o.dist ?? 18, yaw: 0, fov: 40, center: [RX(i), Y, RZ(i) - 1.6], pull: o.pull ?? 0.5, ahead: 0 });
const start = (i) => ({ pos: [RX(i), Y, RZ(i) + 4.2], yaw: Math.PI / 2 });
const at = (i, x, z, y = Y) => [RX(i) + x, y, RZ(i) + z];

export const LEVEL = {
  id: '2-Haus',
  world: 2,
  title: 'Villa Tick-Tack',
  archetype: 'house',
  theme: 'house',
  music: 'course_house',
  timeLimit: 300,
  setup: levelSetup(setup),
  start: start(0),
  house: {
    fail: 'exit',
    rooms: [
      { id: 'r1', goal: 'defeatAll', area: area(0), start: start(0), camera: cam(0), star: at(0, 0, -1.5, Y + 1.6), time: 10, title: 'Kinderzimmer: Besiege die Rollpilze!' },
      { id: 'r2', goal: 'defeatAll', area: area(1), start: start(1), camera: cam(1), star: at(1, 0, -1.5, Y + 1.6), time: 10, title: 'Bibliothek: Besiege die Panzerkröten!' },
      { id: 'r3', goal: 'collect', area: area(2), start: start(2), camera: cam(2), star: at(2, 0, -2.2, Y + 2.2), time: 10, title: 'Küche: Sammle alle Münzen!' },
      { id: 'r4', goal: 'reach', area: area(3), start: start(3), camera: cam(3, { pitch: 52 }), star: at(3, 0, -5.1, Y + 1.85), time: 10, title: 'Uhrenstube: Hol den Stern!' },
      { id: 'r5', goal: 'defeatAll', area: area(4), start: start(4), camera: cam(4), star: at(4, 0, -1, Y + 1.6), time: 10, title: 'Kaminzimmer: Besiege die Feuer-Werfer!' },
    ],
  },
  segments: [
    ...ROOMS.flatMap((r, i) => [
      isl(RX(i) - W / 2 - 0.6, RX(i) + W / 2 + 0.6, RZ(i) + D / 2 + 0.6, RZ(i) - D / 2 - 0.6, Y, 1.2, { top: 'none', under: 0, color: r.wood }),
      { type: 'room', pos: [RX(i), Y, RZ(i)], size: [W, H, D], ceiling: false, floor: false, style: r.wall, wall: 0.6 },
    ]),
    // Uhrenstube: Podest für den Stern am Ende des Uhrengangs
    { type: 'platform', pos: at(3, 0, -5.1), size: [1.8, 1.2, 1.6], style: 'block', color: 0xe8c050 },
    // Kaminzimmer: Holzgalerie (Einweg) für den oberen Feuer-Werfer
    { type: 'platform', pos: at(4, 4, -4.6, Y + 2.4), size: [5, 0.3, 2.4], style: 'wood', oneWay: true },
  ],
  enemies: [
    // 1 Kinderzimmer
    { kind: 'rollpilz', id: 'r1a', roomId: 'r1', pos: at(0, -3, -2), behavior: 'chase', sight: 14, wake: 30 },
    { kind: 'rollpilz', id: 'r1b', roomId: 'r1', pos: at(0, 3, -1.4), behavior: 'chase', sight: 14, wake: 30 },
    // 2 Bibliothek
    { kind: 'panzerkroete', id: 'r2a', roomId: 'r2', pos: at(1, -3, -1.5), path: [at(1, -5, -1.5), at(1, 4, -1.5)], respawn: false, wake: 30 },
    { kind: 'panzerkroete', id: 'r2b', roomId: 'r2', pos: at(1, 3, 1.6), path: [at(1, 5, 1.6), at(1, -4, 1.6)], respawn: false, wake: 30 },
    // 3 Küche
    { kind: 'krallen_pilzling', id: 'r3a', roomId: 'r3', pos: at(2, -4.4, 2.6), dir: [1, 0], wake: 30 },
    { kind: 'krallen_pilzling', id: 'r3b', roomId: 'r3', pos: at(2, 4.4, -2.6), dir: [-1, 0], wake: 30 },
    // 4 Uhrenstube: Hackvögel abwechselnd links/rechts im Uhrengang, Schnabel zur Gangmitte
    { kind: 'hackvogel', id: 'r4a', roomId: 'r4', pos: at(3, -1.05, 2.8), dir: [1, 0], sight: 0, period: 1.6, phase: 0 },
    { kind: 'hackvogel', id: 'r4b', roomId: 'r4', pos: at(3, 1.05, 0.6), dir: [-1, 0], sight: 0, period: 1.6, phase: 0.5 },
    { kind: 'hackvogel', id: 'r4c', roomId: 'r4', pos: at(3, -1.05, -1.6), dir: [1, 0], sight: 0, period: 1.6, phase: 0.25 },
    { kind: 'hackvogel', id: 'r4d', roomId: 'r4', pos: at(3, 1.05, -3.4), dir: [-1, 0], sight: 0, period: 1.6, phase: 0.75 },
    // 5 Kaminzimmer
    { kind: 'feuer_werfer', id: 'r5a', roomId: 'r5', weapon: 'feuer', pos: at(4, -2.6, -2.2), sight: 16, wake: 30, interval: 2.4 },
    { kind: 'feuer_werfer', id: 'r5b', roomId: 'r5', weapon: 'feuer', pos: at(4, 4, -4.6, Y + 2.7), heights: [Y, Y + 2.7], sight: 16, wake: 30, interval: 2.6 },
  ],
  items: [
    // Küche: acht Münzen (drei auf dem Tisch)
    { kind: 'coins', roomId: 'r3', from: at(2, -0.9, 0.4, Y + 1.3), to: at(2, 0.9, 0.4, Y + 1.3), n: 3 },
    { kind: 'coins', roomId: 'r3', from: at(2, -5, -1.6, Y + 0.4), to: at(2, -5, 2.4, Y + 0.4), n: 2 },
    { kind: 'coins', roomId: 'r3', from: at(2, 5, -1.6, Y + 0.4), to: at(2, 5, 2.4, Y + 0.4), n: 2 },
    { kind: 'coin', roomId: 'r3', pos: at(2, 0, 2.6, Y + 0.4) },
  ],
  marks: { r1: start(0).pos, r2: start(1).pos, r3: start(2).pos, r4: start(3).pos, r5: start(4).pos, podest: at(3, 0, -5.1, Y + 1.2) },
};
