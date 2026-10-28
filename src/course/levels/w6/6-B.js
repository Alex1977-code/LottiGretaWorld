// 6-B „Werfer-Wirbel im Steinkreis“ (Archetyp arena, Bauplan 6-B: „Arena ca. 20 × 20 m: 2 Hammer-, 2 Bumerang-, 1 Feuer-
// Werfer; 100 s; Zugang: Steinkreis zu Beginn der Welt“). Thema stonecircle, Musik course_arena, 1 Stern.
//
// Aufbau: eine runde Schwebeinsel (Ø ≈ 25 m) hoch über dem Wolkenmeer, ringsum (Thema) ein Kreis riesiger Menhire mit
// Decksteinen. Auf der Insel ein innerer Steinkreis: hinten und an den Seiten bemooste Menhire (vorn frei, damit die Kamera
// alles sieht), drei **Trilithen** (zwei Steine mit Deckstein, 2,8 m hoch – Einweg von unten): hinten der Feuer-Werfer,
// links und rechts je ein Hammer-Werfer; sie springen zwischen Boden und Deckstein hin und her. Zwei Bumerang-Werfer
// tänzeln vorn auf der Wiese. In der Mitte ein flacher Altarstein (dort erscheint der Stern), das Lager der Werfer-Bande
// mit Hammer-Ständer und Bumerang-Gestell, Wimpel, Fackeln, Blumen, Wolkenkragen unter dem Inselrand.
// Ablauf: Fünf Werfer werfen Feuerkugeln, Hämmer im Bogen und Bumerangs; draufspringen (in der Wurfpause) besiegt sie,
// ebenso Feuerbälle (Funkenblüte aus dem ?-Block am Start). Alle fünf besiegt → Stern auf dem Altarstein → Ziel.
// Tod setzt die Arena zurück (alle Werfer neu, Zeit voll).

import { wolkeninsel, steinkreis, werferlager, wolkenkranz, altarstein } from './_helpers_a.js';

const Y = 2;                 // Inselboden
const YT = Y + 2.8;          // Oberkante der Decksteine
const ISLAND = { center: [0, 0], top: Y, R: 11.6, depth: 4, cone: 15 };
const MENHIRE = [170, 192, 214, 236, 252, 288, 304, 326, 348, 10].map((d, i) => [(d * Math.PI) / 180, 10.2, 3.2 + ((i * 7) % 4) * 0.35]);
const TRILITHEN = [
  { pos: [0, -6.4], yaw: 0, top: YT },
  { pos: [-7.6, -1.2], yaw: Math.PI / 2, top: YT },
  { pos: [7.6, -1.2], yaw: Math.PI / 2, top: YT },
];

function build(level) {
  wolkeninsel(level, ISLAND);
  steinkreis(level, { center: [0, 0], y: Y, menhirs: MENHIRE, trilithen: TRILITHEN });
  werferlager(level, [[-4.8, Y, -9.4, 0.45], [5.4, Y, -9.0, -0.5]]);
  // Altarstein in der Mitte (flach, man kann hinaufgehen)
  level.world.add({ type: 'cyl', x: 0, z: -0.6, r: 1.5, y0: Y - 1, y1: Y + 0.22, tag: 'altar' });
  altarstein(level, 0, Y, -0.6, 1.5);
  wolkenkranz(level, 0, 0, 11, 11, Y - 3.4, { n: 28, seed: 3, size: 1.3 });
}

export const LEVEL = {
  id: '6-B',
  world: 6,
  title: 'Werfer-Wirbel im Steinkreis',
  archetype: 'arena',
  theme: 'stonecircle',
  music: 'course_arena',
  timeLimit: 100,
  starSlots: 1,
  killY: -10,
  build,
  start: { pos: [0, Y, 8.2], yaw: Math.PI / 2 },
  camera: [{ from: 30, to: -30, pitch: 54, dist: 24, x: 0, xLock: 0.45, ahead: 3, lead: 0.3 }],
  arena: { enemies: 'all', star: [0, Y + 0.8, -0.6], starIndex: 0, intro: 'Besiege die fünf Werfer im Steinkreis!', center: [0, Y, -1], camPull: 0.32 },
  segments: [
    { type: 'killplane', y: -10 },
    { type: 'torches', h: 1.5, items: [[-3.2, Y, 10.2], [3.2, Y, 10.2], [-2, YT, -6.4], [2, YT, -6.4]] },
    { type: 'pennants', items: [
      { pos: [-9.4, Y, 5.6], color: 0x3d8bff, h: 3.6 }, { pos: [9.4, Y, 5.6], color: 0xffc21a, h: 3.6 },
      { pos: [-6, Y, 9], color: 0xff4a3d, h: 3 }, { pos: [6, Y, 9], color: 0x4fd04a, h: 3 },
    ] },
    { type: 'deco_w6', items: [
      { kind: 'bergblumen', pos: [0, Y, 2], size: [16, 13], n: 24, avoid: [[0, -0.6, 2.2], [0, 8.2, 1.6], [-5.4, 2.6, 1.4], [5.4, 2.6, 1.4], [-2.8, 5.6, 1.2], [2.8, 5.6, 1.2]] },
      { kind: 'felsen', pos: [-8.4, Y, 4.6], size: [2, 3], n: 2 }, { kind: 'felsen', pos: [8.6, Y, 4.2], size: [2, 3], n: 2 },
      { kind: 'menhir', pos: [-4.4, Y, 9.0], height: 1.2 }, { kind: 'menhir', pos: [4.4, Y, 9.0], height: 1.0 },
      { kind: 'wolke', pos: [-19, Y + 6, -14], size: 4, shadow: false }, { kind: 'wolke', pos: [21, Y + 9, -6], size: 3.6, shadow: false },
      { kind: 'wolkenberg', pos: [-30, -16, -40], size: 16, height: 12, shadow: false }, { kind: 'wolkenfels', pos: [32, -6, -28], size: 6, shadow: false },
    ] },
  ],
  blocks: [
    { kind: 'question', pos: [-2.8, Y + 2.4, 5.6], content: 'funken' },
    { kind: 'coinblock', pos: [2.8, Y + 2.4, 5.6], count: 6 },
  ],
  enemies: [
    // hinten auf dem Trilithen: Feuer-Werfer; links/rechts: Hammer-Werfer (springen zwischen Boden und Deckstein)
    { kind: 'feuer_werfer', id: 'feuer', pos: [0, YT, -6.4], axis: [1, 0], pace: 1.2, heights: [Y, YT], sight: 24, interval: 2.4, first: 2.6, jumpEvery: 3.6 },
    { kind: 'hammer_werfer', id: 'hammer1', pos: [-7.6, YT, -1.2], axis: [0, 1], pace: 1.1, heights: [Y, YT], sight: 22, interval: 2.8, first: 3.2, jumpEvery: 4.2 },
    { kind: 'hammer_werfer', id: 'hammer2', pos: [7.6, YT, -1.2], axis: [0, 1], pace: 1.1, heights: [Y, YT], sight: 22, interval: 2.8, first: 4.0, jumpEvery: 4.6 },
    // vorn auf der Wiese: Bumerang-Werfer
    { kind: 'bumerang_werfer', id: 'bumerang1', pos: [-5.4, Y, 2.6], axis: [1, 0], pace: 1.4, sight: 20, interval: 2.2, first: 2.2, jumpEvery: 3.8 },
    { kind: 'bumerang_werfer', id: 'bumerang2', pos: [5.4, Y, 2.6], axis: [1, 0], pace: 1.4, sight: 20, interval: 2.2, first: 3.0, jumpEvery: 4.4 },
  ],
  items: [
    { kind: 'coins', from: [-1.2, YT + 0.5, -6.4], to: [1.2, YT + 0.5, -6.4], n: 3 },
    { kind: 'coins', from: [-7.6, YT + 0.5, -2.4], to: [-7.6, YT + 0.5, 0], n: 3 },
    { kind: 'coins', from: [7.6, YT + 0.5, -2.4], to: [7.6, YT + 0.5, 0], n: 3 },
    { kind: 'coins', pos: [0, Y + 0.6, -0.6], r: 2.4, n: 8 },
  ],
  stars: [],
  marks: { center: [0, Y, 0], start: [0, Y, 8.2], hinten: [0, YT, -6.4], links: [-7.6, YT, -1.2], rechts: [7.6, YT, -1.2] },
};

