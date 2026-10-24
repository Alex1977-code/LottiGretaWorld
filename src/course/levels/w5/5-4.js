// 5-4 „Kanonenflug über die Goldsavanne“ (Bauplan 5-4: Parcours offen, 400 s, ca. 280 m, 5 Abschnitte). Thema savanna,
// Musik course_savanna.
//
// Die Savanne liegt tief unten im goldenen Dunst; gebänderte Tafelberge ragen daraus auf, verbunden nur durch
// Röhrenkanonen, Glasröhren, eine Drehbrücke und zwei Drehbalken.
//   1. Startsäule (10 m hoch, 10 × 12 m): Röhrenkanone schießt ≈ 43 m weit zum Kletterberg (Münzbogen in der Flugbahn).
//   2. Kletterberg (≈ 80 m, Terrassen 7 → 10,5 → 14,5 → 19 m): Ameisensoldaten im Kreis, eine Rampe, die erste
//      Glasröhren-Gruppe (zwei Röhren zur dritten Terrasse; die linke gabelt sich in die **Mulde** mit Stern 0, um den
//      ein Wuschel kreist), Wuschel, eine Glasröhre und eine Ameisen-Wandspur (trägt die Figur die Wand hinauf) zum
//      Gipfel, dort die Drehbrücke zur zweiten Röhrenkanone.
//   3. Dritter Berg (60 × 74 m, offen): Checkpoint, zwei Wasserlöcher, Giraffen, Hasen (der **grün leuchtende** trägt
//      Stern 1, die kleinen ein Extraleben), ein Ameisenstrom läuft in das **Loch** eines Ameisenhügels – hineinspringen
//      → Warp-Box in den Ameisenbau: dort trägt der Groß-Ameisensoldat den **Stempel** auf dem Rücken (Deck 1,25 m).
//   4. Hohe Wand (30 m): am Eingang ein ?-Block mit Funkelstern; Glasröhre die Wand hinauf zum Sims, über den drei
//      Wuschel pendeln, zweite Glasröhre ganz hinauf.
//   5. Plateau (≈ 75 m): zwei Drehbalken über Lücken, auf der Insel dazwischen der **Sternring** (Stern 2: acht
//      Sternmünzen auf Insel und Zielplateau in 16 s), Zielmast.
// Extraleben: zwei kleine Hasen, unsichtbarer Block am Gipfel neben der Drehbrücke.

import {
  isl, line, ring, column, arc, rectPoly, cliffSkirt, waterholeRim, antHill, hideBoxModel, antCave, bunnyGlow, stampOnAnt,
  giraffes, areaMood, cannonCoins, savannaFloor, dirtPath,
} from './_helpers_b.js';

const S1 = 10;                                   // Startsäule
const T1 = 7, T2 = 10.5, T3 = 14.5, M = 12, T4 = 19; // Kletterberg: Terrassen, Mulde
const Y3 = 9;                                    // dritter Berg
const LEDGE = 24, TOP = 39;                      // Hohe Wand: Sims, Plateau
const BOT = -22;                                 // Savannenboden tief unten (Thema ground.y)
const CAVE = { x0: 392, x1: 416, z0: -150, z1: -168, y: 0 };

const K1 = { pos: [0, S1, -2.6], to: [0, T1, -45] };
const K2 = { pos: [1, T4, -114], to: [0, Y3, -142] };
const HOLE = [-14, Y3, -182];

const sign = (x, y, z, text, yaw = 0) => ({ type: 'sign', pos: [x, y, z], text, yaw });

/** Flächen der Tafelberge (Kollision über isl, Flanken in build). */
const PLATEAUS = [
  // [x0, x1, zA, zB, top, h]
  [-5, 5, 6, -6, S1, 3],                         // Startsäule
  [-8, 8, -38, -58, T1, 3],                      // T1 Landeplatz
  [-10, 3, -52, -58, T2, 3.5],                   // T2 West (neben der Rampe)
  [-10, 8, -58, -70, T2, 3],                     // T2
  [-7.5, 10, -70, -88, T3, 4],                   // T3
  [-14, -7.5, -70, -72, T3, 4],                  // Mulde: Vorderrand
  [-14, -7.5, -82, -88, T3, 4],                  // Mulde: Hinterrand
  [-14, -12.6, -72, -82, T3, 4],                 // Mulde: Westrand
  [-12.6, -7.5, -72, -82, M, 2],                 // Mulde: Boden
  [-6, 8, -88, -100, T4, 4.5],                   // T4 Gipfel
  [-4, 6, -110, -118, T4, 3],                    // Kanonen-Kanzel
  [-30, 30, -130, -204, Y3, 4],                  // dritter Berg
  [-16, 10, -198, -204, LEDGE, LEDGE - Y3 + 2],  // Sims vor der Hohen Wand
  [-30, 30, -204, -222, TOP, TOP - Y3 + 2],      // Hohe Wand / Plateau A
  [-5, 5, -232, -242, TOP, 3],                   // Insel B (Sternring)
  [-14, 14, -252, -280, TOP, 3],                 // Zielplateau C
];

function build(level) {
  PLATEAUS.forEach(([x0, x1, zA, zB, top], i) => cliffSkirt(level, rectPoly(x0, x1, zA, zB, 0.9), top, BOT, { seed: i * 3 + 1, shadow: top > 20 || i < 12 }));
  waterholeRim(level, -16, -8, -152, -158, Y3, { rim: 0.6, depth: 0.55, seed: 3 });
  waterholeRim(level, 10, 18, -172, -180, Y3, { rim: 0.6, depth: 0.55, seed: 8, lilies: 5 });
  antHill(level, HOLE, { seed: 4 });
  antCave(level, CAVE.x0, CAVE.x1, CAVE.z0, CAVE.z1, CAVE.y, { h: 7, tunnels: [CAVE.x0 + 5, CAVE.x1 - 5], eggs: [[CAVE.x0 + 2.4, CAVE.z1 + 2], [CAVE.x1 - 2.4, CAVE.z0 - 2.2]] });
  giraffes(level, [[24, Y3, -150, 2.4, 1.15], [21.5, Y3, -154, 2.0, 0.9], [-26, Y3, -196, -0.6, 1.1]]);
  // lebendiger Boden: Grasflecken, Blumen, Büsche; Trampelpfade entlang des Wegs
  savannaFloor(level, [
    [-5, 5, 6, -6, S1, 7], [-8, 8, -38, -58, T1, 16], [-10, 8, -58, -70, T2, 12], [-7.5, 10, -70, -88, T3, 14], [-12.6, -7.5, -72, -82, M, 3],
    [-6, 8, -88, -100, T4, 10], [-4, 6, -110, -118, T4, 5], [-30, 30, -130, -204, Y3, 70], [-16, 10, -198, -204, LEDGE, 6],
    [-30, 30, -204, -222, TOP, 26], [-5, 5, -232, -242, TOP, 5], [-14, 14, -252, -280, TOP, 22],
  ], { avoid: [[0, -2.6, 1.8], [-4, -61, 1.6], [4, -61, 1.6], [3, -80, 1.6], [2, -190, 1.6], [-7, -201.6, 1.6], [-12, -155, 5.5], [14, -176, 6], [-14, -182, 3], [0, -235.4, 1.6], [0, -272, 1.4], [-10.05, -77, 2.5]] });
  dirtPath(level, [[0, -42], [2.4, -46.5], [5, -50.6]], T1);
  dirtPath(level, [[4, -76.6], [3, -78.6]], T3, 1.4);
  dirtPath(level, [[3, -94.2], [1.6, -96.6], [1, -98.6]], T4, 1.4);
  dirtPath(level, [[0, -136], [0.6, -146], [3, -160], [1, -172], [2, -185]], Y3);
  dirtPath(level, [[-2, -146], [-8, -160], [-12, -170], [-14, -178.4]], Y3, 1.2);
  dirtPath(level, [[-10.6, -210], [-4, -214], [0, -220.6]], TOP, 1.4);
  dirtPath(level, [[0, -254], [0, -268]], TOP);
}

function setup(level) {
  hideBoxModel(level, 'ameisenloch');
  bunnyGlow(level, 'sternhase');
  stampOnAnt(level, 'grossameise');
  areaMood(level, {
    bau: { fog: { color: 0x2e1c12, near: 12, far: 56 }, background: 0x22140c, hemi: { sky: 0xe0a47a, ground: 0x4a2412, intensity: 0.72 }, sun: { color: 0xffb47a, intensity: 1.0 }, dome: 0x4a3020 },
  }, [{ min: [CAVE.x0 - 10, CAVE.z1 - 10], max: [CAVE.x1 + 10, CAVE.z0 + 10], mood: 'bau' }]);
}

const ANT_HOLE_PATH = [[-25, Y3, -164], [-21, Y3, -169], [-18.5, Y3, -175], [-15.6, Y3, -179], [-14.5, Y3 + 0.6, -180.8], [HOLE[0], Y3 + 1.2, HOLE[2]]];
const WALL_ANT = [[-3, T3, -81, 0, 1, 0], [-3, T3, -88, 0, 1, 0], [-3, T3, -88, 0, 0, 1], [-3, T4, -88, 0, 0, 1], [-3, T4, -88, 0, 1, 0], [-3, T4, -93, 0, 1, 0]];

export const LEVEL = {
  id: '5-4',
  world: 5,
  title: 'Kanonenflug über die Goldsavanne',
  archetype: 'parcours',
  theme: 'savanna',
  music: 'course_savanna',
  timeLimit: 400,
  killY: -8,
  farHide: 70,
  build,
  setup,
  instances: {
    ameisensoldat: { farHide: 44, shadowDist: 16 },
    riesenameise: { farHide: 40, shadowDist: 16 },
  },
  start: { pos: [0, S1, 3.6], yaw: Math.PI / 2 },
  camera: [
    { from: 14, to: -36, pitch: 42, dist: 13, fov: 40, x: 0, xLock: 0.5 },
    { from: -36, to: -122, pitch: 44, dist: 13.5, fov: 40, x: 0, xLock: 0.3 },
    { from: -122, to: -190, pitch: 46, dist: 14.5, fov: 40, x: 0, xLock: 0 },
    { from: -190, to: -207, pitch: 38, dist: 14, fov: 40, x: -3, xLock: 0.4 },
    { from: -207, to: -290, pitch: 44, dist: 13.5, fov: 40, x: 0, xLock: 0.35 },
    { from: -140, to: -180, pitch: 50, dist: 12.5, fov: 40, x: 404, xLock: 0.6, area: [370, 440] },
  ],
  segments: [
    { type: 'killplane', y: -8 },
    ...PLATEAUS.map(([x0, x1, zA, zB, top, h]) => isl(x0, x1, zA, zB, top, h)),
    // ---------------- 1 Startsäule
    sign(-3.2, S1, 1.2, 'Röhrenkanone', 0.4),
    { type: 'roehrenkanone', id: 'kanone1', pos: K1.pos, to: K1.to, color: 'gruen' },
    { type: 'deco_w5', items: [
      { kind: 'akazie', pos: [-3.5, S1, -4.6], height: 4.6, lean: 0.2 }, { kind: 'termitenhuegel', pos: [3.6, S1, -4.6], size: 1.1 },
      { kind: 'savannengras', pos: [0, S1, 0], size: [9, 11], n: 10, avoid: [[0, -2.6, 1.8], [0, 3.6, 1.2], [-3.2, 1.2, 1.2]] },
      { kind: 'felsbrocken', pos: [3.8, S1, 2.4], size: [1.5, 3], n: 2 },
    ] },
    // ---------------- 2 Kletterberg
    { type: 'ramp', pos: [5, T1, -55], size: [4, T2 - T1, 6], axis: 'z', dir: -1 },
    { type: 'glasspipe', id: 'roehre_a', radius: 1, oneWay: true, coins: 2,
      path: [[-4, T2 + 1.05, -61], [-4, T2 + 1.05, -66.6], [-4, T3 + 1.7, -70.6], [-4, T3 + 1.05, -75.5]],
      branches: [{ at: 2, path: [[-4, T3 + 1.7, -70.6], [-7, T3 + 2.1, -72.6], [-9, M + 1.6, -75], [-9.8, M + 1.05, -76.6]] }] },
    { type: 'glasspipe', id: 'roehre_b', radius: 1, oneWay: true, coins: 3,
      path: [[4, T2 + 1.05, -61], [4, T2 + 1.05, -66.6], [4, T3 + 1.7, -70.6], [4, T3 + 1.05, -75.5]] },
    { type: 'glasspipe', id: 'roehre_c', radius: 1, oneWay: true, coins: 3,
      path: [[3, T3 + 1.05, -80], [3, T3 + 1.05, -85], [3, T4 + 1.7, -88.6], [3, T4 + 1.05, -93]] },
    sign(-6.8, T2, -60.4, 'Glasröhren', 0.3),
    { type: 'drehbruecke', id: 'drehbruecke', pos: [1, T4, -105], length: 10.8, width: 2.6, yaw: Math.PI / 2, mode: 'step', step: 90, wait: 3, turn: 1.4, postDown: T4 - BOT, style: 'holz' },
    { type: 'roehrenkanone', id: 'kanone2', pos: K2.pos, to: K2.to, color: 'gold' },
    { type: 'deco_w5', items: [
      { kind: 'akazie', pos: [-5.6, T1, -41], height: 5.2 }, { kind: 'akazie', pos: [6.4, T1, -49], height: 4.6, lean: 0.2 },
      { kind: 'termitenhuegel', pos: [-6, T1, -55.6], size: 1.4 }, { kind: 'felsbrocken', pos: [0, T1, -40.5], size: [12, 2], n: 3 },
      { kind: 'savannengras', pos: [0, T1, -47], size: [15, 18], n: 14, avoid: [[0, -45, 2], [5, -55, 3]] },
      { kind: 'baobab', pos: [-8, T2, -67.5], height: 5.4 }, { kind: 'savannengras', pos: [0, T2, -64], size: [18, 10], n: 10, avoid: [[-4, -62, 2], [4, -62, 2]] },
      { kind: 'akazie', pos: [8.4, T3, -73], height: 5 }, { kind: 'felsbrocken', pos: [5, T3, -79], size: [3, 3], n: 3 },
      { kind: 'savannengras', pos: [1, T3, -80], size: [16, 14], n: 12, avoid: [[3, -80, 2], [-4, -75, 2], [5, -79, 3.4]] },
      { kind: 'akazie', pos: [-4.6, T4, -91], height: 5.6, lean: 0.25 }, { kind: 'termitenhuegel', pos: [6.6, T4, -90.6], size: 1.2 },
      { kind: 'savannengras', pos: [1, T4, -94], size: [12, 10], n: 8, avoid: [[3, -93, 2], [1, -99.5, 2.4]] },
      { kind: 'felsbrocken', pos: [1, T4, -116.5], size: [8, 2], n: 2, avoid: [[1, -114, 2.2]] },
    ] },
    // ---------------- 3 Dritter Berg
    { type: 'water', pos: [-12, Y3, -155], size: [8, 0.55, 6] },
    { type: 'water', pos: [14, Y3, -176], size: [8, 0.55, 8] },
    { type: 'deco_w5', items: [
      { kind: 'baobab', pos: [18, Y3, -150], height: 6.4 }, { kind: 'akazie', pos: [-22, Y3, -142], height: 6 },
      { kind: 'akazie', pos: [24, Y3, -186], height: 5.4, lean: 0.25 }, { kind: 'akazie', pos: [-4, Y3, -192], height: 5 },
      { kind: 'termitenhuegel', pos: [-25, Y3, -163], size: 1.8 }, { kind: 'termitenhuegel', pos: [8, Y3, -136], size: 1.2 },
      { kind: 'felsbrocken', pos: [0, Y3, -165], size: [50, 50], n: 10, avoid: [[0, -142, 4], [-12, -155, 6], [14, -176, 7], [-14, -182, 4]] },
      { kind: 'savannengras', pos: [0, Y3, -165], size: [56, 62], n: 40, avoid: [[0, -142, 3], [-12, -155, 5.5], [14, -176, 6.5], [-14, -182, 3.2], [0, -147, 2]] },
    ] },
    // ---------------- 4 Hohe Wand
    { type: 'glasspipe', id: 'roehre_d', radius: 1, oneWay: true, coins: 5,
      path: [[2, Y3 + 1.05, -190], [2, Y3 + 1.05, -195.2], [2, Y3 + 3, -196.9], [2, LEDGE + 0.4, -196.9], [2, LEDGE + 1.6, -198.8], [2, LEDGE + 1.05, -201.4]] },
    { type: 'glasspipe', id: 'roehre_e', radius: 1, oneWay: true, coins: 5,
      path: [[-7, LEDGE + 1.05, -201.6], [-9.6, LEDGE + 1.05, -201.6], [-10.6, LEDGE + 2.8, -202.7], [-10.6, TOP + 0.4, -202.7], [-10.6, TOP + 1.6, -205], [-10.6, TOP + 1.05, -208.2]] },
    sign(-6, Y3, -188, 'Hohe Wand'),
    // ---------------- 5 Plateau
    { type: 'drehplattform', id: 'balken1', axis: 'y', pos: [0, TOP - 0.5, -227], arms: 2, length: 4.9, width: 2.1, speed: 0.6, style: 'holz', postDown: TOP - BOT - 0.5 },
    { type: 'drehplattform', id: 'balken2', axis: 'y', pos: [0, TOP - 0.5, -247], arms: 3, length: 4.9, width: 2.0, speed: -0.65, style: 'holz', postDown: TOP - BOT - 0.5 },
    { type: 'deco_w5', items: [
      { kind: 'akazie', pos: [-12, TOP, -212], height: 5.4 }, { kind: 'baobab', pos: [14, TOP, -214], height: 6 },
      { kind: 'savannengras', pos: [0, TOP, -214], size: [40, 12], n: 16, avoid: [[-10.6, -208.2, 2.2]] },
      { kind: 'akazie', pos: [-10, TOP, -266], height: 5.6 }, { kind: 'akazie', pos: [10.5, TOP, -258], height: 5 },
      { kind: 'termitenhuegel', pos: [9, TOP, -276], size: 1.3 },
      { kind: 'savannengras', pos: [0, TOP, -266], size: [24, 24], n: 16, avoid: [[0, -272, 2.5]] },
    ] },
  ],
  blocks: [
    { kind: 'question', pos: [-1.6, S1 + 2.3, 2], content: 'coin' },
    { kind: 'question', pos: [-2, T1 + 2.3, -48], content: 'wachstumsbeere' },
    { kind: 'coinblock', pos: [2, T1 + 2.3, -48], count: 6 },
    { kind: 'hidden', pos: [-3.6, T4 + 2.6, -98.2], content: 'oneup' },
    { kind: 'question', pos: [-3, Y3 + 2.3, -186.5], content: 'stern' },
    { kind: 'question', pos: [3, Y3 + 2.3, -146], content: 'krallen' },
    { kind: 'coinblock', pos: [CAVE.x0 + 12, CAVE.y + 2.4, CAVE.z0 - 3.4], count: 8 },
  ],
  enemies: [
    // Kletterberg
    { kind: 'ameisensoldat', id: 'kreis_t1', count: 3, spacing: 7, speed: 1.3, antpath: { loop: true, path: [[-5, T1, -42], [5, T1, -42], [5, T1, -50.5], [-5, T1, -50.5]] }, mode: 'loop' },
    { kind: 'ameisensoldat', id: 'rampe', speed: 1.2, antpath: [[5, T1, -47], [5, T1, -52], [5, T2, -58], [5, T2, -63.6]] },
    { kind: 'wuschel', id: 'wuschel_t2', path: [[-8, T2 + 0.3, -63.4], [-1, T2 + 0.3, -63.4]], speed: 2 },
    { kind: 'wuschel', id: 'wuschel_mulde', center: [-10.05, M + 0.3, -77], radius: 1.9, speed: 1.8 },
    { kind: 'ameisensoldat', id: 'kreis_t3', count: 2, spacing: 8, speed: 1.3, antpath: { loop: true, path: [[-5, T3, -77], [1, T3, -77], [1, T3, -84], [-5, T3, -84]] }, mode: 'loop' },
    { kind: 'wuschel', id: 'wuschel_t3', center: [7.6, T3 + 0.3, -79], radius: 1.9, count: 2, spacing: 6, speed: 1.8 },
    { kind: 'ameisensoldat', id: 'wandameise', speed: 1.4, antpath: WALL_ANT },
    { kind: 'wuschel', id: 'wuschel_t4', center: [6.4, T4 + 0.3, -91], radius: 1.7, speed: 1.6 },
    // Dritter Berg: Ameisenstrom ins Loch, Kolonnen
    { kind: 'ameisensoldat', id: 'strom', antpath: ANT_HOLE_PATH, mode: 'once', speed: 1.4, spawner: { every: 3.2, max: 6, prefill: true } },
    { kind: 'ameisensoldat', id: 'kolonne_s3', count: 3, spacing: 6, speed: 1.3, antpath: { loop: true, path: [[-4, Y3, -165], [6, Y3, -165], [6, Y3, -172], [-4, Y3, -172]] }, mode: 'loop' },
    { kind: 'ameisensoldat_horn', id: 'horn_s3', count: 2, spacing: 10, speed: 1.2, antpath: { loop: true, path: [[-6, Y3, -186], [8, Y3, -186], [8, Y3, -192], [-6, Y3, -192]] }, mode: 'loop' },
    // Hohe Wand: Sims
    { kind: 'wuschel', id: 'sims1', path: [[-6.4, LEDGE + 0.3, -199.4], [0.4, LEDGE + 0.3, -199.4]], speed: 2.2 },
    { kind: 'wuschel', id: 'sims2', path: [[-6.4, LEDGE + 0.3, -202.8], [0.4, LEDGE + 0.3, -202.8]], speed: 2.2, phase: 0.5 },
    { kind: 'wuschel', id: 'sims3', path: [[-4.2, LEDGE + 0.3, -198.6], [-4.2, LEDGE + 0.3, -203.4]], speed: 1.8, phase: 0.25 },
    // Plateau
    { kind: 'ameisensoldat', id: 'kolonne_c', count: 3, spacing: 5, speed: 1.2, antpath: { loop: true, path: [[-8, TOP, -258], [-2, TOP, -258], [-2, TOP, -264], [-8, TOP, -264]] }, mode: 'loop' },
    // Ameisenbau: Groß-Ameisensoldat mit dem Stempel
    { kind: 'riesenameise', id: 'grossameise', path: [[CAVE.x0 + 5, CAVE.y, -160.5], [CAVE.x1 - 5, CAVE.y, -160.5]], mode: 'pingpong', speed: 1.5 },
  ],
  items: [
    // Startsäule
    ring([0, S1 + 0.6, 2.6], 2.6, 6),
    ...cannonCoins(K1.pos, 2.2, K1.to, 9, { skipEnd: 0.24 }),
    // Kletterberg
    line([-4, T1 + 0.6, -40], [4, T1 + 0.6, -40], 5),
    line([5, T1 + 0.9, -52.6], [5, T2 + 0.7, -57.6], 4),
    ring([-10.05, M + 0.6, -77], 1.0, 4),
    line([-4, T4 + 0.6, -94], [6, T4 + 0.6, -94], 5),
    ...cannonCoins(K2.pos, 2.2, K2.to, 8, { skipEnd: 0.24 }),
    { kind: 'warpbox', id: 'ameisenloch', pos: HOLE, target: 'hoehle' },
    // Dritter Berg
    ring([0, Y3 + 0.6, -158], 3, 8),
    ...arc([-17.4, Y3 + 1.6, -155], [-6.6, Y3 + 1.6, -155], 6, 1.6),
    ...arc([14, Y3 + 1.6, -170.4], [14, Y3 + 1.6, -181.6], 6, 1.6),
    line([-22, Y3 + 0.6, -168], [-17, Y3 + 0.6, -176], 4),
    column(2, -188.6, Y3 + 1, Y3 + 4, 3),
    { kind: 'bunny', id: 'sternhase', pos: [14, Y3, -156], star: 1, area: { min: [5, -166], max: [27, -146] } },
    { kind: 'bunny', id: 'hase1', pos: [-18, Y3, -192], area: { min: [-28, -198], max: [-8, -186] } },
    { kind: 'bunny', id: 'hase2', pos: [20, Y3, -194], area: { min: [10, -200], max: [28, -186] } },
    // Hohe Wand: Sims
    line([0, LEDGE + 0.6, -201], [-6, LEDGE + 0.6, -201], 5),
    // Plateau
    line([-6, TOP + 0.6, -212], [6, TOP + 0.6, -212], 5),
    { kind: 'sternring', id: 'sternring', pos: [0, TOP, -235.4], yaw: Math.PI / 2, star: 2, time: 16, coins: [
      [-3.4, TOP + 0.8, -233.4], [3.4, TOP + 0.8, -233.4], [-3.4, TOP + 0.8, -240.4], [3.4, TOP + 0.8, -240.4],
      [-6, TOP + 0.8, -255], [-2, TOP + 1.6, -256.6], [2, TOP + 1.6, -256.6], [6, TOP + 0.8, -255],
    ] },
    line([-4, TOP + 0.6, -266], [4, TOP + 0.6, -266], 5),
    // Ameisenbau
    { kind: 'warpbox', id: 'hoehle', pos: [CAVE.x0 + 3.4, CAVE.y, CAVE.z0 - 2.6], target: 'ameisenloch' },
    ring([CAVE.x0 + 12, CAVE.y + 0.6, -157], 2.4, 8),
    line([CAVE.x0 + 5, CAVE.y + 2.6, -160.5], [CAVE.x1 - 5, CAVE.y + 2.6, -160.5], 6),
  ],
  checkpoint: { pos: [0, Y3, -147], yaw: Math.PI / 2 },
  stars: [
    [-10.05, M + 0.3, -77],                        // 0: Mulde bei der ersten Glasröhren-Gruppe
    //                                                1: grün leuchtender Hase (bunny star: 1)
    //                                                2: Sternring auf Insel B (sternring star: 2)
  ],
  stamp: [CAVE.x0 + 10, CAVE.y + 1.4, -160.5],      // reitet auf der Riesenameise (setup)
  goal: { pos: [0, TOP, -272], height: 9 },
  marks: {
    start: [0, S1, 3.6], kanone1: K1.pos, landung1: K1.to, rampe: [5, T1, -52], roehreA: [-4, T2, -61], roehreB: [4, T2, -61],
    mulde: [-10.05, M, -77], roehreC: [3, T3, -80], wandameise: [-3, T3, -82], gipfel: [1, T4, -96], bruecke: [1, T4, -105],
    kanone2: K2.pos, checkpoint: [0, Y3, -147], loch: HOLE, hoehle: [CAVE.x0 + 3.4, CAVE.y, CAVE.z0 - 2.6], ameise: [CAVE.x0 + 10, CAVE.y, -160.5],
    wandfuss: [2, Y3, -188], sims: [-2, LEDGE, -201], plateau: [-10.6, TOP, -210], ring: [0, TOP, -235.4], ziel: [0, TOP, -272],
  },
};
