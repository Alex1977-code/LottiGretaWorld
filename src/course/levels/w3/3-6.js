// 3-6 „Gipfelflitzer-Rennen“ – Welt 3, Parcours als Bergrennen im Kart-Stil (Bauplan 3-6: Boost-Pfeile, Sprungfelder
// über 6–8 m Lücken mit Pilztrampolinen darin, Gabelung, Hang, Schlussabfahrt). Thema `race`, Musik `course_race`,
// 400 s, ≈ 300 m nach −Z, 3 Sterne + Stempel. Rennbahn-Optik: Asphaltband mit rot-weißen Randsteinen, Banden,
// Fahnen, Start-Ziel-Bogen mit Ampel, Zuschauer-Tribüne mit Tierchen (La-Ola), Murmeltiere am Streckenrand, Almhütte,
// Kühe, Reifenstapel und Strohballen (Kulisse im Level-Haken, _helpers_b.js).
//
// Abschnitte (Level verläuft nach −Z, +X = rechts im Bild):
//   1 Rennstart        (z 14 … −60, y 0)    Startaufstellung, Ampel-Bogen, Tribüne links (Dach: Pilztrampolin → 1-Up),
//                                           Krallen-Anzug im Baum an der Boxengasse rechts; Boost-Pfeile; zwei Lücken
//                                           (7 und 8 m) mit Sprungfeldern, unten Pilztrampoline (wer fällt, hüpft heraus)
//   2 Gabelung         (z −60 … −122)       links hinauf die obere Straße (y 4) mit fünf Schnappblumen; rechts unten
//                                           Bröckelbrücken, Stern 1 unter dem Felsbogen, Flatterkäfer; am Ende der
//                                           unteren Straße eine Warp-Box hinauf zum Hang
//   3 Hang             (z −122 … −212)      Ziegelreihe (ein Münzblock), Anstieg zum Checkpoint (y 10), ?-Block mit
//                                           Gleitblatt, Boost-Schräge über die erste Grube, zwei Sprungfelder über Gruben;
//                                           rechts ein Aufstieg zur Warp-Box, bewacht von 9 Flatterkäfern →
//                                           Bonus-Oval (x ≈ 98): Boost-Pfeile, Hase (Stern 2), Trampoline → Stempel
//   4 Schlussabfahrt   (z −212 … −302)      Boost-Aufstieg mit Boost-Toren zum Gipfel (y 18); Felsturm mit der letzten
//                                           Warp-Box (Krallen-Anzug hinauf oder mit dem Gleitblatt vom Pilztrampolin
//                                           hinübergleiten) → Wolkenterrasse mit Stern 3; Rutschhang hinab, Sprungfeld
//                                           unten schleudert zur Zielinsel mit Zielbogen und Zielmast
// Gegner: Schnappblume (5), Flatterkäfer (28), Pilzling (3).

import { levelSetup, flatIslands, isl, line, ring, arc, road, grandstand, marmots, almHut, cow, tireStack, hayBale, flagPole, finishBanner, checkerLine, pennantLine, plate, cyl, sphere, bugSwarm, kartBande, addStaticParts } from './_helpers_b.js';
import { addStatic, merge } from '../../blocks/kit.js';

const PI = Math.PI;
const YU = 4;       // obere Straße / Hangfuß
const YH = 10;      // Hang oben (Checkpoint)
const YS = 18;      // Gipfel
const YB = 2;       // Fuß des Rutschhangs
const YG = 6;       // Zielinsel
const BX = 98;      // Bonus-Oval (Mitte x)
const BZ = -190;    // Bonus-Oval (Mitte z)

// ------------------------------------------------------------------ Inseln (ohne Sonnenschatten, im Haken gebaut)
const ISLANDS = [
  // 1 Rennstart
  isl(-16, 16, 14, -20, 0, 6, { under: 4 }),
  isl(-16, 16, -27, -38, 0, 6, { under: 4 }),
  isl(-16, 16, -46, -64, 0, 6, { under: 4 }),
  // Grubenböden mit Pilztrampolinen
  isl(-12, 12, -20, -27, -5, 3, { under: 2 }),
  isl(-12, 12, -38, -46, -5, 3, { under: 2 }),
  // 2 Gabelung: obere Straße, Trennrücken, untere Straße
  isl(-12, -5, -64, -72, 0, 6, { under: 3 }),
  isl(-12.5, -4.5, -72, -122, YU, 9, { under: 3 }),
  isl(-4.5, 4, -64, -122, 6, 11, { under: 3 }),
  isl(4, 13, -64, -74, 0, 6, { under: 4 }),
  isl(4, 13, -80, -94, 0, 6, { under: 4 }),
  isl(4, 13, -100, -122, 0, 6, { under: 4 }),
  // 3 Hang
  isl(-13, 13, -122, -136, YU, 10, { under: 4 }),
  isl(-13, 13, -150, -160, YH, 12, { under: 4 }),
  isl(-12, 12, -160, -166.5, YH - 5, 5, { under: 3 }),     // Grube 1 (mit Trampolin)
  isl(-13, 13, -166.5, -176, YH, 12, { under: 4 }),
  isl(-13, 13, -182, -194, YH, 12, { under: 4 }),
  isl(8.5, 13, -184, -196, YH + 4, 4, { under: 0 }),        // Aufstieg zur Warp-Box (Plateau)
  isl(-13, 13, -200, -212, YH, 12, { under: 4 }),
  // 4 Schlussabfahrt
  isl(-14, 13, -228, -242, YS, 20, { under: 5 }),
  isl(-7, 7, -274, -282, YB, 8, { under: 4 }),
  isl(-11, 11, -288, -304, YG, 10, { under: 5 }),
  // Bonus-Oval und Wolkenterrasse
  isl(BX - 15, BX + 15, BZ + 15, BZ - 15, 0, 4, { under: 3 }),
  isl(-47, -37, -229, -241, 32, 2, { under: 3 }),
];

// Banden (Kart-Banden entlang der Fahrbahn, mit Lücken für Boxengasse und Abzweige)
const BANDEN = [
  [[-5.4, 0, 14], [-5.4, 0, -19.6]], [[5.4, 0, 14], [5.4, 0, 3.5]], [[5.4, 0, -1.5], [5.4, 0, -19.6]],
  [[-5.4, 0, -27.4], [-5.4, 0, -37.6]], [[5.4, 0, -27.4], [5.4, 0, -37.6]],
  [[-5.4, 0, -46.4], [-5.4, 0, -60]], [[5.4, 0, -46.4], [5.4, 0, -60]],
  [[-12.2, YU, -72.4], [-12.2, YU, -121.6]], [[12.6, 0, -64.4], [12.6, 0, -73.6]], [[12.6, 0, -80.4], [12.6, 0, -93.6]],
  [[12.6, 0, -100.4], [12.6, 0, -121.6]],
  [[-12.6, YH, -150.4], [-12.6, YH, -159.6]], [[12.6, YH, -150.4], [12.6, YH, -159.6]],
  [[-12.6, YH, -166.9], [-12.6, YH, -175.6]], [[12.6, YH, -166.9], [12.6, YH, -175.6]],
  [[-12.6, YH, -182.4], [-12.6, YH, -193.6]], [[-12.6, YH, -200.4], [-12.6, YH, -211.6]], [[12.6, YH, -200.4], [12.6, YH, -211.6]],
  [[-13.6, YS, -228.4], [-13.6, YS, -232]], [[12.6, YS, -228.4], [12.6, YS, -241.6]],
  [[-10.6, YG, -290], [-10.6, YG, -303.6]],
];

// Fahrbahn (Asphalt, Randsteine) – im Haken gelegt
const ROAD = [
  { x: 0, w: 10, z0: 14, z1: -20, y: 0, grid: [[-2.2, 6.4], [2.2, 4.4], [-2.2, 2.4], [2.2, 0.4]] },
  { x: 0, w: 10, z0: -27, z1: -38, y: 0 },
  { x: 0, w: 10, z0: -46, z1: -60, y: 0 },
  { x: -8.5, w: 7, z0: -60, z1: -72, y: 0, y1: YU, dashes: false },
  { x: -8.5, w: 7, z0: -72, z1: -122, y: YU },
  { x: 8.5, w: 7, z0: -60, z1: -74, y: 0 },
  { x: 8.5, w: 7, z0: -80, z1: -94, y: 0 },
  { x: 8.5, w: 7, z0: -100, z1: -122, y: 0 },
  { x: 0, w: 10, z0: -122, z1: -136, y: YU },
  { x: 0, w: 10, z0: -136, z1: -150, y: YU, y1: YH },
  { x: 0, w: 10, z0: -150, z1: -160, y: YH },
  { x: 0, w: 10, z0: -166.5, z1: -176, y: YH },
  { x: -2, w: 10, z0: -182, z1: -194, y: YH },
  { x: 0, w: 10, z0: -200, z1: -212, y: YH },
  { x: 0, w: 10, z0: -212, z1: -228, y: YH, y1: YS },
  { x: 0, w: 10, z0: -228, z1: -242, y: YS },
  { x: 0, w: 8, z0: -288, z1: -304, y: YG },
];

export const LEVEL = {
  id: '3-6',
  world: 3,
  title: 'Gipfelflitzer-Rennen',
  archetype: 'parcours',
  theme: 'race',
  music: 'course_race',
  timeLimit: 400,
  killY: -14,
  start: { pos: [0, 0, 8], yaw: PI / 2 },
  // Rennen: flacher, weiter vorausschauend (Richtwert 38–42°, Vorausschau 3,5 m)
  camera: [
    { from: 18, to: -60, pitch: 40, dist: 14, ahead: 3.4, lead: 1.4 },
    { from: -60, to: -122, pitch: 42, dist: 14, ahead: 3.2, lead: 1.3 },
    { from: -122, to: -212, pitch: 42, dist: 14, ahead: 3.4, lead: 1.4 },
    { from: -212, to: -242, pitch: 40, dist: 14, ahead: 3.4, lead: 1.4 },
    { from: -242, to: -282, pitch: 36, dist: 15, ahead: 4.5, lead: 1.5 },
    { from: -282, to: -310, pitch: 42, dist: 13, ahead: 2.4, lead: 1.2 },
    // Bonus-Oval (Warp-Box, abseits)
    { from: BZ + 20, to: BZ - 20, pitch: 52, dist: 16, ahead: 1.5, area: [BX - 22, BX + 22] },
    // Wolkenterrasse (Stern 3)
    { from: -224, to: -246, pitch: 46, dist: 12, ahead: 1.5, area: [-60, -30] },
  ],
  setup: levelSetup((level) => buildRace(level)),
  segments: [
    // Rampen der Fahrbahn
    { type: 'ramp', pos: [-8.5, 0, -66], size: [7, YU, 12], axis: 'z', dir: -1, top: 'stone' },
    { type: 'ramp', pos: [0, YU, -143], size: [26, YH - YU, 14], axis: 'z', dir: -1, top: 'stone' },
    { type: 'ramp', pos: [0, YH, -220], size: [12, YS - YH, 16], axis: 'z', dir: -1, top: 'stone' },
    { type: 'stairs', pos: [4.4, YH, -189.5], dir: '+x', steps: 8, rise: 0.5, run: 0.55, width: 4, style: 'stone' },
    // Rutschhang (steigt nach +Z: oben am Gipfel, unten am Fuß)
    { type: 'rutschhang', pos: [0, YB, -258], size: [12, YS - YB, 32], axis: 'z', dir: 1, top: 'stone' },
    // Sprungfelder über die Lücken (landen genau auf `to`)
    { type: 'sprungfeld', id: 'sf1', pos: [0, 0, -17.6], to: [0, 0, -30.4], arc: 3.2 },
    { type: 'sprungfeld', id: 'sf2', pos: [2.6, 0, -35.6], to: [2.6, 0, -48.6], arc: 3.4 },
    { type: 'sprungfeld', id: 'sf3', pos: [0, YH, -174.4], to: [0, YH, -185.0], arc: 3 },
    { type: 'sprungfeld', id: 'sf4', pos: [-2, YH, -192.4], to: [-2, YH, -203.0], arc: 3 },
    { type: 'sprungfeld', id: 'sfZiel', pos: [0, YB, -279], to: [0, YG, -294.5], arc: 5 },
    // Pilztrampoline: Grubenböden, Tribünendach (1-Up), Gipfel (Gleitblatt-Weg), Bonus-Oval (Stempel)
    { type: 'pilztrampolin', pos: [0, -5, -23.5] },
    { type: 'pilztrampolin', pos: [-2.6, -5, -42] },
    { type: 'pilztrampolin', pos: [0, YH - 5, -163.2] },
    { type: 'pilztrampolin', id: 'tribuenenpilz', pos: [-8.2, 0, -11.5], scale: 0.9 },   // vor dem Südende der Tribüne (über die Bande hüpfen)
    { type: 'pilztrampolin', id: 'gipfelpilz', pos: [-1.5, YS, -235] },
    { type: 'pilztrampolin', pos: [BX + 4, 0, BZ + 1] },
    { type: 'pilztrampolin', pos: [BX + 8.5, 4.2, BZ - 2.5] },
    // Boost-Pfeile, Boost-Schräge, Boost-Tore
    { type: 'boost', pos: [0, 0, -9], speed: 16 },
    { type: 'boost', pos: [-2.4, 0, -13.2], speed: 16 },
    { type: 'boost', pos: [2.6, 0, -31.6], speed: 16 },
    { type: 'boost', pos: [8.5, 0, -66.5], speed: 16 },
    { type: 'boost_rampe', pos: [0, YH, -157.4], yaw: PI / 2, length: 2.6, width: 3, height: 1 },
    { type: 'boost_tor', pos: [0, YH + 1.5, -215], yaw: PI / 2, width: 5 },
    { type: 'boost_tor', pos: [0, YH + 5.5, -223], yaw: PI / 2, width: 5 },
    { type: 'boost', pos: [BX, 0, BZ + 12], dir: [1, 0], speed: 17 },
    { type: 'boost', pos: [BX + 12, 0, BZ], dir: [0, -1], speed: 17 },
    { type: 'boost', pos: [BX, 0, BZ - 12], dir: [-1, 0], speed: 17 },
    { type: 'boost', pos: [BX - 12, 0, BZ], dir: [0, 1], speed: 17 },
    // Banden, Start-/Zielbogen
    // Banden: im Haken (kartBande, sparsame Bauweise)
    { type: 'start_bogen', id: 'ampel', pos: [0, 0, -2.5], yaw: PI / 2, width: 10.4, mode: 'time', delay: 3 },
    { type: 'start_bogen', id: 'zielbogen', pos: [0, YG, -290.5], yaw: PI / 2, width: 8.4, mode: 'pass' },
    // Bröckelbrücken der unteren Straße
    { type: 'broeckelblock', id: 'broeckel1', blocks: [8, 9].flatMap((x) => [-74.5, -75.5, -76.5, -77.5, -78.5, -79.5].map((z) => [x, -1, z])), delay: 0.5, respawn: 4 },
    { type: 'broeckelblock', id: 'broeckel2', blocks: [[8, -1, -94.5], [9, -1, -95.5], [8, -1, -96.5], [9, -1, -97.5], [8, -1, -98.5], [9, -1, -99.5]], delay: 0.45, respawn: 4 },
    // Felsbogen über Stern 1, Felsturm (Krallenwand) mit der letzten Warp-Box
    { type: 'wall', pos: [5.6, 0, -87], size: [1.2, 3.2, 1.4] },
    { type: 'wall', pos: [11.4, 0, -87], size: [1.2, 3.2, 1.4] },
    { type: 'wall', pos: [8.5, 3.2, -87], size: [7, 1.0, 1.4] },
    { type: 'wall', pos: [-13, YS, -235], size: [3, 6, 3], climbable: true },
    // Wand am Ende der unteren Straße (Hangfuß), Krallen kommen hinauf
    { type: 'wall', pos: [8.5, 0, -121.75], size: [9, YU, 0.6], climbable: true },
    // Schilder
    { type: 'sign', pos: [-3.6, 0, 12.6], text: 'Gipfelflitzer-\nRennen', size: [2.8, 1.1] },
    { type: 'sign', pos: [0.5, 0, -61.8], text: '← oben   unten →', size: [2.8, 0.8] },
    { type: 'sign', pos: [-10.4, YS, -229.6], text: 'Felsturm', size: [2.2, 0.8] },
  ],
  blocks: [
    // Ziegelreihe am Hangfuß (einer ist ein Münzblock)
    { kind: 'brick', pos: [-1.5, YU + 3.2, -130] }, { kind: 'brick', pos: [-0.5, YU + 3.2, -130] },
    { kind: 'coinblock', pos: [0.5, YU + 3.2, -130], count: 10 }, { kind: 'brick', pos: [1.5, YU + 3.2, -130] },
    { kind: 'question', pos: [-3.5, YU + 3.2, -130], content: 'wachstumsbeere' },
    { kind: 'question', pos: [3.4, YH + 2.0, -153.4], content: 'gleitblatt' },   // niedrig: das Blatt bleibt oben liegen
    { kind: 'question', pos: [-8.5, YU + 3.2, -90], content: 'coins:5' },
  ],
  enemies: [
    // Schnappblumen (5) auf der oberen Straße
    { kind: 'schnappblume', pos: [-10.4, YU, -80], base: 'pot', yaw: 0 },
    { kind: 'schnappblume', pos: [-6.6, YU, -88], base: 'pot', yaw: PI },
    { kind: 'schnappblume', pos: [-10.4, YU, -97], base: 'pot', yaw: 0 },
    { kind: 'schnappblume', pos: [-6.6, YU, -106], base: 'pot', yaw: PI },
    { kind: 'schnappblume', pos: [-8.5, YU, -115], base: 'pot', yaw: PI / 2 },
    // Flatterkäfer (28)
    { kind: 'flatterkaefer', path: [[-4, 1.7, -50], [4, 1.7, -50], [4, 1.7, -56], [-4, 1.7, -56]], count: 4, spacing: 1.6, color: 'yellow' },
    { kind: 'flatterkaefer', path: [[6, 1.6, -66], [11, 1.6, -66], [11, 1.6, -71], [6, 1.6, -71]], count: 2, spacing: 3, color: 'pink' },
    { kind: 'flatterkaefer', path: [[6, 1.5, -84.4], [11, 1.5, -84.4], [11, 1.5, -89.6], [6, 1.5, -89.6]], count: 2, spacing: 4, color: 'red' },
    { kind: 'flatterkaefer', path: [[6, 1.7, -104], [11, 1.7, -108], [6, 1.7, -112], [11, 1.7, -116]], count: 2, spacing: 5, color: 'pink' },
    // neun Wächter um die Warp-Box auf dem Plateau (drei Ringe)
    { kind: 'flatterkaefer', path: [[8.8, YH + 5.3, -186.4], [12.8, YH + 5.3, -186.4], [12.8, YH + 5.3, -193.6], [8.8, YH + 5.3, -193.6]], count: 3, spacing: 3.8, color: 'red' },
    { kind: 'flatterkaefer', path: [[9.4, YH + 6.6, -187.4], [12.2, YH + 6.6, -187.4], [12.2, YH + 6.6, -192.6], [9.4, YH + 6.6, -192.6]], count: 3, spacing: 3.6, color: 'yellow', phase: 0.5 },
    { kind: 'flatterkaefer', path: [[6.4, YH + 2.0, -187.4], [6.4, YH + 2.0, -192.6]], count: 3, spacing: 1.5, color: 'blue', speed: 2.0 },
    { kind: 'flatterkaefer', path: [[-6, YH + 1.7, -205], [6, YH + 1.7, -205]], count: 3, spacing: 1.5, color: 'yellow' },
    { kind: 'flatterkaefer', path: [[-4, YH + 2.2, -170], [4, YH + 2.2, -172]], count: 2, spacing: 2, color: 'pink' },
    { kind: 'flatterkaefer', path: [[-8, YS + 1.8, -231], [8, YS + 1.8, -231], [8, YS + 1.8, -238], [-8, YS + 1.8, -238]], count: 4, spacing: 4, color: 'red' },
    // Pilzlinge (3)
    { kind: 'pilzling', pos: [2, 0, -55], path: [[-3, 0, -58], [3, 0, -58]] },
    { kind: 'pilzling', pos: [-3, YU, -133], path: [[-6, YU, -133.5], [6, YU, -133.5]] },
    { kind: 'pilzling', pos: [3, YS, -239], path: [[-4, YS, -240], [6, YS, -240]] },
  ],
  items: [
    // Krallen-Anzug im Baum an der Boxengasse
    { kind: 'itemtree', id: 'krallenbaum', pos: [7.4, 0, 1.0], size: 4.6, content: 'krallen' },
    // 1-Up auf dem Tribünendach
    { kind: 'powerup', pos: [-9.5, 4.42, -4], power: 'oneup', speed: 0 },
    line([-10.4, 5.0, 6], [-10.4, 5.0, -2], 4),
    // Warp-Boxen
    { kind: 'warpbox', id: 'warp_unten', pos: [8.5, 0, -119.4], target: [5, YU + 0.05, -133] },
    { kind: 'warpbox', id: 'warp_bonus', pos: [10.8, YH + 4, -190], target: 'warp_bonus_zurueck' },
    { kind: 'warpbox', id: 'warp_bonus_zurueck', pos: [BX - 10, 0, BZ + 10], target: [6, YH + 0.05, -205] },
    { kind: 'warpbox', id: 'warp_turm', pos: [-13, YS + 6, -235], target: 'warp_terrasse' },
    { kind: 'warpbox', id: 'warp_terrasse', pos: [-39.5, 32, -238.6], target: [-8, YS + 0.05, -239.5] },
    // Hase im Bonus-Oval (Stern 2)
    { kind: 'bunny', id: 'hase', pos: [BX + 6, 0, BZ - 8], star: 1, area: { min: [BX - 13, BZ - 13], max: [BX + 13, BZ + 13] }, speed: 6 },
    // Münzspuren
    line([0, 0.9, 4], [0, 0.9, -6], 4),
    ...arc([0, 1.2, -17.6], [0, 1.2, -30.4], 5, 3.2),
    line([2.6, 0.9, -28], [2.6, 0.9, -33.5], 3),
    ...arc([2.6, 1.2, -35.6], [2.6, 1.2, -48.6], 5, 3.4),
    ring([0, 0.9, -52.5], 1.6, 5),
    line([-8.5, YU + 0.9, -76], [-8.5, YU + 0.9, -120], 6),
    line([8.5, 0.9, -66], [8.5, 0.9, -72], 3),
    line([8.5, 1.6, -75], [8.5, 1.6, -79], 3),
    line([8.5, 1.6, -95], [8.5, 1.6, -99], 3),
    line([8.5, 0.9, -103], [8.5, 0.9, -116], 3),
    line([0, YU + 0.9, -124], [0, YU + 0.9, -128], 2),
    line([0, YU + 1.6, -138], [0, YH + 0.9, -149], 5),
    ...arc([0, YH + 1.4, -158], [0, YH + 1.4, -169], 5, 3.2),
    ...arc([0, YH + 1.2, -174.4], [0, YH + 1.2, -185], 4, 3),
    ...arc([-2, YH + 1.2, -192.4], [-2, YH + 1.2, -203], 4, 3),
    ring([10.8, YH + 4.9, -190], 1.6, 6),
    line([0, YH + 1.6, -213], [0, YS + 0.9, -227], 4),
    line([0, YS + 0.9, -244], [0, YB + 1.2, -272], 5),
    ...arc([0, YB + 1.4, -279], [0, YG + 1.2, -294.5], 5, 5),
    ring([BX, 0.9, BZ], 4, 6),
    ring([-42, 33.0, -234], 1.6, 6),
  ],
  checkpoint: [{ pos: [-3, YH, -153.4] }],
  stars: [
    { pos: [8.5, 0.5, -87] },                       // 1: untere Straße, unter dem Felsbogen
    { pos: [BX, 1.3, BZ], hidden: true, id: 'stern_hase' },   // 2: Hase im Bonus-Oval (erscheint auf dem Siegertreppchen)
    { pos: [-42, 32.5, -235.5] },                    // 3: Wolkenterrasse hinter der letzten Warp-Box
  ],
  stamp: { pos: [BX + 9.5, 9.2, BZ - 7.5] },
  goal: { pos: [0, YG, -298], height: 9 },
  marks: {
    start: [0, 0, 8], tree: [7.4, 0, 1.0], sf1: [0, 0, -17.6], pit1: [0, -5, -23.5], sf2: [2.6, 0, -35.6], fork: [0, 0, -60],
    upper: [-8.5, YU, -74], lower: [8.5, 0, -66], star1: [8.5, 0, -87], warpLow: [8.5, 0, -119.4], bricks: [0, YU, -130],
    cp: [-3, YH, -153.4], boostRamp: [0, YH, -157.4], sf3: [0, YH, -174.4], sf4: [-2, YH, -192.4], warpBonus: [10.8, YH + 4, -190],
    bonus: [BX, 0, BZ], ascent: [0, YH, -212], summit: [0, YS, -232], tower: [-13, YS, -235], terrace: [-42, 32, -235],
    slide: [0, YS, -243], sfZiel: [0, YB, -279], goal: [0, YG, -298],
  },
};

/** Level-Haken: Inseln ohne Schatten, Fahrbahn, Tribüne, Kulisse, Murmeltiere. */
function buildRace(level) {
  flatIslands(level, ISLANDS);
  road(level, ROAD);
  const parts = [];
  checkerLine(parts, 0, 10, -2.5, 0, 1.2);        // Startlinie
  checkerLine(parts, 0, 8, -290.5, YG, 1.2);      // Ziellinie
  // Bonus-Oval: Fahrbahnring um den Hügel
  // Tribüne links am Start (Tierchen mit La-Ola), Dach begehbar
  level._race = { stand: grandstand(level, { x: -7.2, z0: 12, z1: -10, y: 0, side: -1, rows: 3 }) };
  grandstand(level, { x: 8.9, z0: -291, z1: -302, y: YG, side: 1, rows: 2 });
  // Kulisse: Almhütte, Kühe, Reifenstapel, Strohballen, Fahnen, Wimpel, Zielbanner
  almHut(parts, 12.5, 0, -10.5, 1, -PI / 2);
  almHut(parts, -12, YH, -205, 0.9, PI / 2);
  cow(parts, 11.5, 0, -32, 0.6); cow(parts, 13.5, 0, -35.5, 2.4, 0.95); cow(parts, -12.5, 0, -50, -0.4);
  cow(parts, -11, YH, -172, 1.2, 0.9);
  for (const [x, y, z, n, c] of [[5.9, 0, -19, 3, 0xe8283a], [-5.9, 0, -19, 3, 0x3d8bff], [5.9, 0, -45.6, 3, 0xffd23d], [-5.9, 0, -45.6, 2, 0xe8283a],
    [-12.6, YU, -121, 3, 0x3d8bff], [12.9, 0, -121, 3, 0xe8283a], [5.9, YH, -167.6, 3, 0xffd23d], [-5.9, YH, -175.6, 2, 0x3d8bff],
    [-11.4, YS, -241.4, 3, 0xe8283a], [11.4, YS, -228.6, 3, 0x4fd04a]]) tireStack(parts, x, y, z, n, c);
  for (const [x, y, z, yaw] of [[-6.4, 0, -36, 0], [6.4, 0, -28.6, 0.3], [-6.2, YH, -150.8, 0], [6.2, YH, -159.2, 0.2], [-6.2, YS, -241, 0],
    [6.6, YS, -241.2, 0.4], [-6.0, YB, -281.4, 0], [6.0, YB, -281.4, 0], [-5.9, YH, -211, 0.1], [5.9, YH, -200.8, 0]]) hayBale(parts, x, y, z, yaw);
  const flagCols = [0xe8283a, 0xffd23d, 0x3d8bff, 0x4fd04a, 'karo'];
  [[6.2, 0, 8], [-6.2, 0, -16], [6.2, 0, -24], [6.2, 0, -52], [-6.2, 0, -58], [-12.8, YU, -100], [12.8, 0, -110],
    [6.4, YU, -126], [-6.4, YH, -156], [6.4, YH, -172], [-6.4, YH, -186], [6.4, YH, -208], [-6.4, YS, -236],
    [-7.2, YB, -276], [7.2, YB, -276], [-10.2, YG, -296], [10.2, YG, -296]].forEach(([x, y, z], i) => flagPole(parts, x, y, z, 4.2, flagCols[i % flagCols.length], x < 0 ? 0 : PI));
  pennantLine(parts, [-5.6, 4.6, 13.4], [5.6, 4.6, 13.4], 14, 0.6);
  for (const x of [-5.6, 5.6]) parts.push(cyl(0.08, 0.1, 4.7, x, 0, 13.4, 0xd8dce8, 8));
  pennantLine(parts, [-5.6, YH + 4, -150.6], [5.6, YH + 4, -150.6], 14, 0.6);
  for (const x of [-5.6, 5.6]) parts.push(cyl(0.08, 0.1, 4.1, x, YH, -150.6, 0xd8dce8, 8));
  // Felsbogen-Deko (Stern 1): Moos und Steinchen
  parts.push(plate(7.2, 0.2, 1.6, 8.5, 4.2, -87, 0x6cd844, { r: 0.08 }));
  // Bonus-Oval: Hügel in der Mitte, Fahnenkranz, Stempel-Plattformen
  // Siegertreppchen in der Mitte (Stern 2 erscheint oben)
  parts.push(plate(1.6, 1.0, 1.6, BX, 0, BZ, 0xffd23d, { r: 0.06 }), plate(1.6, 0.65, 1.6, BX - 1.6, 0, BZ, 0xd8dce8, { r: 0.06 }), plate(1.6, 0.4, 1.6, BX + 1.6, 0, BZ, 0xd88a4a, { r: 0.06 }));
  parts.push(sphere(4.6, BX, -2.6, BZ, 0x6cd844, { sy: 0.62, ws: 14, hs: 8 }));
  for (let i = 0; i < 8; i++) { const a = (i / 8) * PI * 2; flagPole(parts, BX + Math.cos(a) * 14.3, 0, BZ + Math.sin(a) * 14.3, 3.4, flagCols[i % 4], a); }
  addStaticParts(level, parts);
  kartBande(level, BANDEN);
  level.world.add({ type: 'cyl', x: BX, z: BZ, r: 4.2, y0: 0, y1: 0.25, tag: 'oval:huegel' });
  for (const [dx, h] of [[0, 1.0], [-1.6, 0.65], [1.6, 0.4]]) level.world.add({ type: 'box', min: [BX + dx - 0.8, 0, BZ - 0.8], max: [BX + dx + 0.8, h, BZ + 0.8], tag: 'treppchen' });
  // Stempel-Treppe im Bonus-Oval (Trampolin → Sims → Trampolin → Stempel-Plattform)
  level.world.add({ type: 'box', min: [BX + 7, 0, BZ - 4], max: [BX + 10, 4.2, BZ - 1], tag: 'sims' });
  level.world.add({ type: 'box', min: [BX + 7.5, 8.2, BZ - 9.5], max: [BX + 11.5, 9.0, BZ - 5.5], tag: 'stempelsims' });
  if (level.view) {
    const p2 = [plate(3, 4.2, 3, BX + 8.5, 0, BZ - 2.5, 0xb0aaa4, { r: 0.1, top: 0x6cd844 }), plate(4, 0.8, 4, BX + 9.5, 8.2, BZ - 7.5, 0xe8e4e0, { r: 0.1, top: 0xffd23d })];
    for (const [sx, sz] of [[-1.7, -1.7], [1.7, -1.7], [-1.7, 1.7], [1.7, 1.7]]) p2.push(cyl(0.12, 0.14, 8.2, BX + 9.5 + sx, 0, BZ - 7.5 + sz, 0xd8dce8, 8));
    addStatic(level, merge(p2));
  }
  // Murmeltiere am Streckenrand
  marmots(level, [[-8.2, 0, -30, 0.1], [8.6, 0, -40, 0.45], [-9.4, 0, -6, 0.7], [-2.2, 6, -92, 0.3], [2, 6, -110, 0.8],
    [-9, YH, -165.6, 0.2], [9.4, YH, -204, 0.6], [-9.6, YS, -229.4, 0.9], [8.6, YG, -300.6, 0.4]]);
  bugSwarm(level, { dist: 32 });
}
