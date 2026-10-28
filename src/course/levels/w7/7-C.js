// 7-C „Siebenfeuer-Saal der Werfer-Bande“ (Archetyp arena, Bauplan 7-C: Raum ca. 20 × 20 m, hinterer Teil erhöht; 7 Feuer-
// Werfer; 100 s, 1 Stern). Thema fortress, Musik course_arena. Auf der Weltkarte die Werfer-Halle am Ostrand der Insel.
//
// Aufbau: das Versteck der Werfer-Bande – eine Halle (20 × 20 m) aus dunkelrotem Backstein hoch über dem Lavasee. Vorn ein
// gekachelter Saal mit dem „Siebenfeuer“-Mosaik (sieben goldene Flammen im Kreis), zwei Gitterrosten über glühender Lava in den
// vorderen Ecken und einer niedrigen Zinnen-Brüstung (die Kamera sieht darüber). Hinten die **erhöhte Empore** (2 m, Treppe mit
// rotem Läufer in der Mitte, Glutnischen in der Vorderwand), darauf die hölzerne **Kanzel** des Anführers (2,4 m über der
// Empore, von unten durchspringbar). Links und rechts je ein **Holzbalkon** (Einweg) an der Mauer. Rundbogen-Fenster mit
// Lavaschein, Brummbär-Banner, Wandfackeln, das Lager der Bande (Fässer, Feuerkugel-Körbe), draußen Ecktürme und Wimpel.
// An der Rückwand der Empore stehen **sieben Feuerschalen** – je Werfer eine; wer einen Werfer besiegt, sieht seine Schale
// erlöschen („Lösche alle sieben Feuer!“).
// Gegner: 7 Feuer-Werfer – zwei im Saal, zwei springen zwischen Saal und Balkon, zwei tänzeln auf der Empore, der Anführer
// springt zwischen Empore und Kanzel. Draufspringen (in der Wurfpause) besiegt sie, ebenso die Wurfsichel (?-Block am Start).
// Alle sieben besiegt → Stern auf dem Siebenfeuer-Mosaik → Einsammeln beendet das Level. Tod setzt die Arena zurück.
// Extras: ?-Block mit Wurfsichel, Münzblock, unsichtbarer Block mit Extraleben über der rechten Emporen-Ecke.

import { saal7C, siebenFeuer, line, ring, arc } from './_helpers_d.js';

const Y = 2;            // Saalboden
const W = 10;           // halbe Innenweite
const YT = Y + 2;       // Empore
const ZT = -3.4;        // Vorderkante der Empore
const YK = YT + 2.4;    // Kanzel (Oberkante)
const YB = Y + 2.4;     // Balkone (Oberkante)
const KZ = -6.2;        // Kanzel: Mitte z
const BZ = [-1.2, 4.6]; // Balkone: z-Bereich
const BW = 2.6;         // Balkone: Breite
const HOLES = [[-W, -7, 6.4, 9.6], [7, W, 6.4, 9.6]];   // Gitterroste über der Lava (vordere Ecken)
// Sieben Feuerschalen an der Rückwand der Empore – Schale i gehört zu Werfer FEUER[i]
const SCHALEN = [-7.5, -5, -2.5, 0, 2.5, 5, 7.5].map((x) => [x, YT, -9.3]);
const FEUER = ['w5', 'w3', 'w1', 'w6', 'w2', 'w4', 'w7'];

function build(level) {
  // unsichtbare Hallenmauern bis 9 m hoch (vorn camIgnore: die Kamera blickt über die Brüstung)
  const T = 0.8;
  level.world.add({ type: 'box', min: [-W - T, Y - 1, -W - T], max: [-W, Y + 9, W + T], tag: 'saal-mauer' });
  level.world.add({ type: 'box', min: [W, Y - 1, -W - T], max: [W + T, Y + 9, W + T], tag: 'saal-mauer' });
  level.world.add({ type: 'box', min: [-W - T, Y - 1, -W - T], max: [W + T, Y + 10, -W], tag: 'saal-mauer' });
  level.world.add({ type: 'box', min: [-W - T, Y - 1, W], max: [W + T, Y + 1.0, W + T], tag: 'saal-bruestung' });
  level.world.add({ type: 'box', min: [-W - T, Y + 1.0, W], max: [W + T, Y + 9, W + T], camIgnore: true, noWallSlide: true, tag: 'saal-vorn' });
  // Kanzel und Balkone: Einweg (von unten durchspringbar)
  level.world.add({ type: 'box', min: [-2.2, YK - 0.36, KZ - 1.4], max: [2.2, YK, KZ + 1.4], oneWay: true, tag: 'kanzel' });
  level.world.add({ type: 'box', min: [-W, YB - 0.32, BZ[0]], max: [-W + BW, YB, BZ[1]], oneWay: true, tag: 'balkon' });
  level.world.add({ type: 'box', min: [W - BW, YB - 0.32, BZ[0]], max: [W, YB, BZ[1]], oneWay: true, tag: 'balkon' });
  saal7C(level, { Y, YT, YK, YB, W, ZT, holes: HOLES, mosaic: [0, 2.4], kanzel: [KZ, 2.8, 4.4], balkonW: BW, balkonZ: BZ });
}

function setup(level) {
  siebenFeuer(level, SCHALEN, FEUER);
}

const werfer = (id, pos, o = {}) => ({ kind: 'feuer_werfer', id, pos, axis: [1, 0], pace: 1.4, sight: 24, interval: 2.8, first: 2.2, jumpEvery: 3.6, ...o });

export const LEVEL = {
  id: '7-C',
  world: 7,
  title: 'Siebenfeuer-Saal der Werfer-Bande',
  archetype: 'arena',
  theme: 'fortress',
  music: 'course_arena',
  timeLimit: 100,
  starSlots: 1,
  killY: -12,
  // sieben Werfer: Sonnenschatten nur in der Nähe der Heldin (Blob-Schatten bleiben) – Budget
  instances: { feuer_werfer: { shadowDist: 8 } },
  build,
  setup,
  start: { pos: [0, Y, 8.4], yaw: Math.PI / 2 },
  camera: [{ from: 30, to: -30, pitch: 50, dist: 23, x: 0, xLock: 0.45, ahead: 0.6, lead: 0.4, height: 1.6 }],
  arena: { enemies: 'all', star: [0, Y + 0.6, 2.4], starIndex: 0, intro: 'Lösche die sieben Feuer – besiege die Werfer!', center: [0, Y, -1.5], camPull: 0.4 },
  segments: [
    { type: 'killplane', y: -12 },
    // Saalboden (mit zwei Löchern für die Gitterroste vorn) auf einem Felssporn
    { type: 'island', pos: [0, Y - 4, -2.8], size: [24, 4, 18.4], top: 'stone', under: 4 },
    { type: 'island', pos: [0, Y - 4, 9.2], size: [14, 4, 5.6], top: 'stone', under: 3 },
    { type: 'island', pos: [0, Y - 4, 10.8], size: [24, 4, 2.4], top: 'stone', under: 3 },
    { type: 'island', pos: [-11, Y - 4, 8], size: [2, 4, 3.2], top: 'stone', under: 0 },
    { type: 'island', pos: [11, Y - 4, 8], size: [2, 4, 3.2], top: 'stone', under: 0 },
    { type: 'gitterboden', id: 'gitterL', pos: [-8.5, Y - 0.2, 8], size: [3, 3.2], thick: 0.2, style: 'rost', lava: { depth: 1.5 } },
    { type: 'gitterboden', id: 'gitterR', pos: [8.5, Y - 0.2, 8], size: [3, 3.2], thick: 0.2, style: 'rost', lava: { depth: 1.5 } },
    // Empore (hinterer Teil erhöht) und Treppe mit Läufer
    { type: 'island', pos: [0, Y, (ZT - W) / 2], size: [2 * W, YT - Y, ZT + W], top: 'stone', under: 0 },
    { type: 'stairs', pos: [0, Y, ZT + 2.4], dir: '-z', steps: 8, rise: (YT - Y) / 8, run: 0.3, width: 3.6, style: 'stone' },
    // Feuerschalen am Eingang, Wimpel draußen
    { type: 'torches', h: 1.3, items: [[-5.6, Y, 9.3], [5.6, Y, 9.3]] },
    { type: 'pennants', items: [
      { pos: [-12.2, Y, 12.2], color: 0xd8323a, h: 5 }, { pos: [12.2, Y, 12.2], color: 0xffc21a, h: 5 },
      { pos: [-12.2, Y, -2], color: 0x3d8bff, h: 6 }, { pos: [12.2, Y, -2], color: 0x8a4ad8, h: 6 },
    ] },
    { type: 'deco_w7', items: [
      { kind: 'fahne', pos: [-W + 0.08, Y + 4.8, -2.0], hang: true, length: 2.6, yaw: 0 },
      { kind: 'fahne', pos: [W - 0.08, Y + 4.8, -2.0], hang: true, length: 2.6, yaw: Math.PI },
      { kind: 'fahne', pos: [-W + 0.08, Y + 4.8, 5.8], hang: true, length: 2.2, yaw: 0, color: 'lila' },
      { kind: 'fahne', pos: [W - 0.08, Y + 4.8, 5.8], hang: true, length: 2.2, yaw: Math.PI, color: 'lila' },
      { kind: 'fackel', pos: [-W + 0.1, Y + 2.2, 0.2], mount: 'wand', yaw: 0 },
      { kind: 'fackel', pos: [W - 0.1, Y + 2.2, 0.2], mount: 'wand', yaw: Math.PI },
      { kind: 'fackel', pos: [-3.6, YT + 1.6, -W + 0.1], mount: 'wand', yaw: -Math.PI / 2 },
      { kind: 'fackel', pos: [3.6, YT + 1.6, -W + 0.1], mount: 'wand', yaw: -Math.PI / 2 },
      { kind: 'knochen', pos: [7.2, Y, 4.6], n: 4 },
      { kind: 'kette', pos: [-5.6, Y + 6.2, -W + 0.3], length: 2.6 }, { kind: 'kette', pos: [5.6, Y + 6.2, -W + 0.3], length: 2.6 },
      { kind: 'burgturm', pos: [-12.9, Y - 2, 12.4], height: 9, radius: 1.6 },
      { kind: 'burgturm', pos: [12.9, Y - 2, 12.4], height: 9, radius: 1.6 },
      { kind: 'burgturm', pos: [-12.9, Y - 2, -12.4], height: 12, radius: 1.8 },
      { kind: 'burgturm', pos: [12.9, Y - 2, -12.4], height: 12, radius: 1.8 },
    ] },
    { type: 'deco_w7', shadow: false, items: [
      { kind: 'basaltsaeulen', pos: [-22, -10, -8], n: 7, height: [6, 14] }, { kind: 'basaltsaeulen', pos: [22, -10, 2], n: 7, height: [5, 12] },
      { kind: 'lavafall', pos: [-17, -14, -18], width: 4, height: 20, yaw: -Math.PI / 2 + 0.5 },
      { kind: 'lavafall', pos: [17, -14, -20], width: 3.4, height: 18, yaw: -Math.PI / 2 - 0.5 },
      { kind: 'vulkanfelsen', pos: [0, -12, 18], size: [26, 6], n: 5, max: 3 },
    ] },
  ],
  blocks: [
    { kind: 'question', pos: [-3, Y + 2.2, 6.2], content: 'sichel' },
    { kind: 'coinblock', pos: [3, Y + 2.2, 6.2], count: 6 },
    { kind: 'hidden', pos: [8.6, YT + 2.5, -4.4], content: 'oneup' },
  ],
  enemies: [
    // Saal: zwei Werfer tänzeln vor dem Mosaik
    werfer('w1', [-4.6, Y, 3.6], { pace: 1.6, first: 2.0, interval: 2.9 }),
    werfer('w2', [4.6, Y, 3.6], { pace: 1.6, first: 3.0, interval: 3.1 }),
    // Balkone: springen zwischen Saal und Balkon
    werfer('w3', [-W + BW / 2, YB, 1.7], { axis: [0, 1], pace: 1.6, heights: [Y, YB], first: 3.4, jumpEvery: 3.8 }),
    werfer('w4', [W - BW / 2, YB, 1.7], { axis: [0, 1], pace: 1.6, heights: [Y, YB], first: 4.2, jumpEvery: 4.2 }),
    // Empore: zwei Werfer, der Anführer springt zwischen Empore und Kanzel
    werfer('w5', [-6, YT, -6.8], { pace: 1.8, first: 2.6, interval: 3.0 }),
    werfer('w6', [0, YK, KZ], { pace: 1.0, heights: [YT, YK], first: 1.6, interval: 2.6, jumpEvery: 4.0 }),
    werfer('w7', [6, YT, -6.8], { pace: 1.8, first: 3.6, interval: 3.0 }),
  ],
  items: [
    ring([-W + BW / 2, YB + 0.6, 1.7], 1.0, 5),
    ring([W - BW / 2, YB + 0.6, 1.7], 1.0, 5),
    line([-1.4, YK + 0.6, KZ], [1.4, YK + 0.6, KZ], 3),
    line([-8.6, YT + 0.5, -5.2], [-3.4, YT + 0.5, -5.2], 4),
    line([3.4, YT + 0.5, -5.2], [8.6, YT + 0.5, -5.2], 4),
    ...arc([-1.2, Y + 0.5, 8.6], [1.2, Y + 0.5, 8.6], 3, 0.6),
  ],
  stars: [],
  marks: { center: [0, Y, 0], start: [0, Y, 8.4], empore: [0, YT, -5], kanzel: [0, YK, KZ], links: [-W + BW / 2, YB, 1.7], rechts: [W - BW / 2, YB, 1.7], mosaik: [0, Y, 2.4] },
};
