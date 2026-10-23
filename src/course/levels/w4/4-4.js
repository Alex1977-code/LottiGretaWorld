// 4-4 „Trampolin-Alm“ – Welt 4, Parcours über eine sommerliche Bergwiese und eine Riesentrampolin-Fahrt durch den
// Himmel. Thema `bounce`, Musik `course_bounce`, 400 s, ≈ 230 m nach −Z, 3 Sterne + Stempel. Kulisse: Almhütte mit
// Rauch, Kühe mit Glocken, grasende Schafe, Windräder, Blumenwiesen mit Bienen und Schmetterlingen, Heuballen,
// Bergfichten, ein Drachen über der Startwiese, Heißluftballons und Wolkeninseln entlang der Fahrt.
//
// Abschnitte (Level verläuft nach −Z, +X = rechts im Bild):
//   1 Bergwiese            (z 10 … −96)     Startwiese (Felswand links mit **Wandloch – Stern 1**: Springklotz als Feder
//                                          oder Krallen-Anzug aus dem ?-Block; Krabbelkäfer, hüpfender Springklotz) →
//                                          Schlucht mit zwei Pilztrampolinen auf Felssäulen → Terrasse B (Stachelpanzer,
//                                          Krabbelkäfer, drei Springklötze als Federn auf die 6-m-Stufe) → Terrasse C
//                                          (Stachelpanzer, Flatterkäfer-Schwarm, oranges Trampolin) → weiße Treppe →
//                                          Checkpoint-Plateau D; hinter der Treppe über zwei Pilztrampoline auf zwei
//                                          Felssimse → **Stern 2**
//   2 Riesentrampolin-Fahrt (z −96 … −206)   das große Trampolin startet beim Draufspringen und schwebt durch den Himmel,
//                                          vorbei an sechs Rädern aus Flatterkäfern (eines ein Ring, durch den man
//                                          fliegt); zwischen zwei Rädern hoch oben der **Stempel** (nur mit getimtem
//                                          Sprung kurz vor der Landung); links eine Wolke mit der Warp-Box →
//                                          Kletterzaun-Raum (abseits, x ≈ −107): vier Kettenzäune (fest, seitlich und
//                                          senkrecht fahrend) → **Stern 3**, Warp-Box zur Zielinsel
//   3 Zielinsel            (z −206 … −230)   Windrad, Kühe, Schafe; Springklotz unter einem unsichtbaren Block (1-Up),
//                                          Springklotz neben dem Zielmast (Spitze = Extraleben)
// Gegner: Krabbelkäfer 4, Flatterkäfer 55 (6 Räder × 8 + 7), Stachelpanzer 5, Springklotz 9.

import {
  isl, line, ring, arc, column, levelSetup, flatIslands, cullStatic, instanceEnemies, farHide, modelDiet,
  rockWall, sheep, kite, bees, wheelSwarm, bugSwarm, cow, almHut, hayBale, addStaticParts, balloon, ropeFence, stonePath, smoke,
} from './_helpers_b.js';

const PI = Math.PI;
const YA = 1;        // Startwiese
const YB = 3;        // Terrasse B
const YC = 9;        // Terrasse C
const YD = 13;       // Checkpoint-Plateau
const YZ = 10.5;     // Zielinsel
const KX = -107;     // Kletterzaun-Raum (Mitte x)
const KZ = -161;     // Kletterzaun-Raum (Mitte z)

// Fahrt des Riesentrampolins (Fußpunkte; Matte 0,9 m darüber)
const RIDE = [[0, 11.6, -99.5], [2.5, 13.5, -114], [-2.5, 15.5, -129], [0, 17, -144], [3, 16, -159], [-1, 14, -174], [1.5, 12, -189], [0, 9.6, -203]];

// ------------------------------------------------------------------ Inseln (im Haken, ohne Sonnenschatten-Wurf)
const ISLANDS = [
  isl(-12, 12, 10, -16, YA, 5, { under: 3 }),              // Startwiese A
  isl(-12, 12, -29.5, -52, YB, 7, { under: 3 }),           // Terrasse B
  isl(-12, 12, -52, -66, YC, 11, { under: 3 }),            // Terrasse C (6-m-Stufe über B)
  isl(-12, 12, -74, -96, YD, 12, { under: 3 }),            // Checkpoint-Plateau D
  isl(-12.5, -9.5, -83, -87, 18, 1.4, { under: 1.2 }),     // Felssims 1 (Stern 2)
  isl(-12.5, -8.5, -89, -93, 24, 1.4, { under: 1.6 }),     // Felssims 2 (Stern 2)
  isl(-12, 12, -206, -230, YZ, 6, { under: 3 }),           // Zielinsel
  isl(KX - 17, KX + 17, KZ + 11, KZ - 11, 10, 2, { under: 2 }),   // Kletterzaun-Raum (Boden)
  isl(-96.2, -93, -163.5, -166.5, 22.6, 1, { under: 0.6 }),       // Sims mit Stern 3
];

/** Level-Haken: Inseln, Felswand mit Wandloch, Kulisse (Tiere, Hütte, Drachen, Ballons), Budget. */
function setup(level) {
  flatIslands(level, ISLANDS);
  // Felswand links der Startwiese mit Wandloch (Nische 6 m hoch) – Vorderseite kletterbar (Krallen-Anzug)
  rockWall(level, { x0: -16, x1: -12, z0: -1, z1: -13, y: YA, h: 10.5, face: 1, climbable: true, hole: { z0: -6, z1: -8.6, y0: YA + 6, y1: YA + 9.2, depth: 2.6 } });
  rockWall(level, { x0: -16, x1: -12, z0: 10, z1: -1, y: YA, h: 6.5, face: 1 });
  rockWall(level, { x0: -16, x1: -12, z0: -13, z1: -16, y: YA, h: 7.5, face: 1 });
  // Felssäulen unter den Pilztrampolinen der Schlucht
  rockWall(level, { x0: -2.8, x1: -0.2, z0: -19.2, z1: -21.8, y: -12, h: 10.5, face: 1 });
  rockWall(level, { x0: 0.2, x1: 2.8, z0: -24.2, z1: -26.8, y: -12, h: 10.5, face: 1 });
  // Bergwiesen-Kulisse (statisch, je 32-m-Abschnitt verschmolzen)
  const parts = [];
  almHut(parts, 8.6, YA, 5.4, 1, -0.3);
  cow(parts, 9.2, YA, -4.5, 2.6, 1); cow(parts, 6.8, YA, -8.6, -2.2, 0.9);
  cow(parts, -8.6, YC, -61, 0.6, 1); cow(parts, 8.4, YD, -88.5, PI + 0.4, 1);
  cow(parts, 7.6, YZ, -214, -0.8, 1); cow(parts, -7.2, YZ, -226.4, 0.4, 0.85);
  hayBale(parts, 10.6, YA, 0.4, 0.3); hayBale(parts, 10.2, YA, -1.4, 1.2); hayBale(parts, -9.4, YB, -33.6, 0.6); hayBale(parts, 10, YD, -78.4, 1.1);
  hayBale(parts, -9.8, YZ, -210, 0.2);
  ropeFence(parts, [5.6, YA, -2.6], [11.6, YA, -2.6]); ropeFence(parts, [5.6, YA, -2.6], [5.6, YA, -12.4]); ropeFence(parts, [5.6, YA, -12.4], [11.6, YA, -12.4]);
  ropeFence(parts, [-11.4, YD, -76], [-11.4, YD, -80]);
  stonePath(parts, [0, YA, 8], [0, YA, -15]); stonePath(parts, [0, YB, -30], [0, YB, -48]); stonePath(parts, [0, YD, -75], [0, YD, -94]);
  stonePath(parts, [0, YZ, -207], [0, YZ, -223]);
  addStaticParts(level, parts);
  smoke(level, [9.9, YA + 5.2, 4.9]);
  sheep(level, [
    [-5.8, YA, -11.6, 0.3], [-7.6, YA, -9.2, 2.2], [3.6, YA, 2.6, -1.2],
    [-7.8, YB, -38.4, 1.4], [8.6, YB, -45.2, -2.4], [6.6, YB, -33.2, 0.8],
    [7.4, YC, -57, 3.1], [-4.8, YD, -77.6, 0.2], [7.2, YD, -81.2, -2.6], [5.4, YD, -92.4, 1.6],
    [-5.2, YZ, -213.4, 0.7], [5.4, YZ, -228, -1.9], [-8.6, YZ, -219.6, 2.4],
  ]);
  kite(level, { anchor: [6.2, YA + 0.6, -0.6], pos: [9, YA + 13, -12] });
  bees(level, [[-6, YA, 3, 1.2], [7.8, YB, -38.6, 1.4], [-6.4, YD, -86, 1.2], [5.6, YZ, -222.4, 1.4]]);
  balloon(level, { pos: [-24, 24, -122], r: 3, colors: [0xff5a4a, 0xffe14a], flag: 0x3a8aff });
  balloon(level, { pos: [22, 30, -150], r: 3.4, colors: [0x4aa8ff, 0xffffff], flag: 0xff4a5a, phase: 2 });
  balloon(level, { pos: [-20, 20, -190], r: 2.8, colors: [0x7ad04a, 0xfff2a0], phase: 4 });
  // ---------------- Budget
  wheelSwarm(level, { far: 44 });
  bugSwarm(level, { kinds: ['flatterkaefer', 'krabbelkaefer'], dist: 44, near: 8 });
  instanceEnemies(level, ['stachelpanzer', 'springklotz'], {});
  farHide(level, ['stachelpanzer', 'springklotz', 'warpbox', 'goal', 'checkpoint', 'kettenzaun'], 46);
  modelDiet(level, ['modell:windrad'], { far: 60 });
}

export const LEVEL = {
  id: '4-4',
  world: 4,
  title: 'Trampolin-Alm',
  archetype: 'parcours',
  theme: 'bounce',
  music: 'course_bounce',
  timeLimit: 400,
  killY: -16,
  start: { pos: [0, YA, 6], yaw: PI / 2 },
  setup: (level, scene) => { levelSetup(setup)(level, scene); cullStatic(level); },
  camera: [
    { from: 14, to: -16, pitch: 44, dist: 13 },
    { from: -16, to: -30, pitch: 46, dist: 13 },                       // Schlucht mit Pilztrampolinen
    { from: -30, to: -96, pitch: 44, dist: 13 },
    { from: -96, to: -206, pitch: 40, dist: 14, height: 1.6 },         // Riesentrampolin-Fahrt: flacher, Himmel sichtbar
    { from: -206, to: -234, pitch: 44, dist: 13 },
    { from: KZ + 16, to: KZ - 16, pitch: 24, dist: 15, height: 2, area: [KX - 24, KX + 24] },   // Kletterzaun-Raum (frontal)
  ],
  segments: [
    // ======================================================== 1  Bergwiese
    { type: 'sign', pos: [-4.6, YA, 6.6], text: 'Trampolin-Alm', size: [2.8, 1.0], yaw: 0.2 },
    { type: 'sign', pos: [-6.6, YA, -3.6], text: 'Ein Loch in der Wand?\nSpringklotz als Feder!', size: [3.2, 1.1], yaw: 0.4 },
    { type: 'deco_w4', items: [
      { kind: 'windrad', pos: [-8.8, YA, 7.4], height: 7, yaw: -PI / 2, speed: 0.35 },
      { kind: 'wiesenblumen', pos: [-6, YA, 3], size: [6, 8], n: 30 },
      { kind: 'wiesenblumen', pos: [5, YA, -7], size: [12, 12], n: 34 },
      { kind: 'bergfichten', pos: [11, YA, -14], size: [2, 3], n: 2, scale: [0.8, 1.1] },
      { kind: 'heuballen', pos: [-9.6, YA, -14.2], yaw: 0.5 },
    ] },
    { type: 'pilztrampolin', id: 'pt1', pos: [-1.5, -1.5, -20.5], scale: 1.4 },
    { type: 'pilztrampolin', id: 'pt2', pos: [1.5, -1.5, -25.5], scale: 1.4 },
    { type: 'deco_w4', items: [
      { kind: 'wiesenblumen', pos: [-6, YB, -40], size: [8, 16], n: 36 },
      { kind: 'wiesenblumen', pos: [6, YB, -36], size: [8, 10], n: 24 },
      { kind: 'windrad', pos: [10.2, YB, -42], height: 6.5, yaw: -PI / 2, speed: 0.3 },
      { kind: 'bergfichten', pos: [-11, YB, -47], size: [2, 6], n: 2, scale: [0.9, 1.2] },
      { kind: 'zaun', from: [-11.6, YB, -31], to: [-11.6, YB, -37] },
    ] },
    { type: 'sign', pos: [7.6, YB, -47.6], text: 'Springklotz:\ndrauf und hoch!', size: [2.8, 1.0], yaw: -0.3 },
    { type: 'trampolin_orange', id: 'to_b', pos: [9, YB, -49.6], strength: 21, size: 2 },
    { type: 'deco_w4', items: [
      { kind: 'wiesenblumen', pos: [0, YC, -59], size: [20, 10], n: 34 },
      { kind: 'bergfichte', pos: [10.6, YC, -64], height: 5 },
      { kind: 'heuballen', pos: [-10.6, YC, -54.2], yaw: 1.2 },
      { kind: 'zaun', from: [3.4, YC, -65.6], to: [11.6, YC, -65.6] }, { kind: 'zaun', from: [-11.6, YC, -65.6], to: [-3.4, YC, -65.6] },
    ] },
    { type: 'trampolin_orange', id: 'to_c', pos: [-9, YC, -63], angle: 30, dir: [0.3, -1], strength: 19 },
    { type: 'stairs', pos: [0, YC, -66], dir: '-z', steps: 16, rise: 0.25, run: 0.5, width: 6, style: 'white' },
    { type: 'deco_w4', items: [
      { kind: 'wiesenblumen', pos: [5, YD, -84], size: [10, 18], n: 34 },
      { kind: 'windrad', pos: [10.4, YD, -92.6], height: 7.5, yaw: -PI / 2, speed: 0.4 },
      { kind: 'bergfichten', pos: [11, YD, -76], size: [2, 3], n: 2, scale: [0.9, 1.2] },
      { kind: 'heuballen', pos: [9.6, YD, -76.6], yaw: 0.2 },
    ] },
    { type: 'sign', pos: [-4.2, YD, -93.4], text: 'Riesentrampolin:\ndraufspringen!', size: [3.0, 1.1], yaw: 0.2 },
    // Stern 2: hinter der Treppe zwei Pilztrampoline auf zwei Felssimse
    { type: 'pilztrampolin', id: 'pt3', pos: [-8.5, YD, -80] },
    { type: 'pilztrampolin', id: 'pt4', pos: [-11, 18, -85] },

    // ======================================================== 2  Riesentrampolin-Fahrt
    { type: 'riesentrampolin', id: 'rt', path: RIDE, size: 6, speed: 4.2, strength: 15, boost: 1.4 },
    { type: 'deco_w4', shadow: false, items: [
      { kind: 'wolkeninsel', pos: [-9.5, 12.8, -174], size: 5 },                // Wolke mit der Warp-Box (begehbar)
      { kind: 'wolkeninsel', pos: [9, 9, -120], size: 4.4, solid: false },
      { kind: 'wolkeninsel', pos: [-10, 11, -150], size: 5.2, solid: false },
      { kind: 'wolkeninsel', pos: [11, 8, -182], size: 4, solid: false },
      { kind: 'wolkeninsel', pos: [-8, 6, -198], size: 4.6, solid: false },
      { kind: 'wolkeninsel', pos: [12, 14, -137], size: 3.6, solid: false },
    ] },
    { type: 'warpbox', id: 'warp_wolke', pos: [-9.5, 14.9, -174], target: 'zaun_ein' },

    // ======================================================== Kletterzaun-Raum (abseits)
    { type: 'warpbox', id: 'zaun_ein', pos: [KX - 11, 10, KZ + 8], target: 'ziel_warp' },
    { type: 'kettenzaun', id: 'kz1', pos: [-116, 10, -166], size: [4, 6] },
    { type: 'kettenzaun', id: 'kz2', pos: [-111, 13, -166], size: [3, 4], path: [[-111, 13, -166], [-107, 13, -166]], speed: 1.4, wait: 0.6 },
    { type: 'kettenzaun', id: 'kz3', pos: [-102.5, 12, -166], size: [3, 4], path: [[-102.5, 12, -166], [-102.5, 17, -166]], speed: 1.4, wait: 0.6 },
    { type: 'kettenzaun', id: 'kz4', pos: [-98.5, 18, -166], size: [4, 5] },
    { type: 'warpbox', id: 'zaun_aus', pos: [-94, 10, KZ + 6], target: 'ziel_warp' },
    { type: 'sign', pos: [KX - 8, 10, KZ + 9.4], text: 'Klettern: an den Zaun springen!', size: [3.4, 1.0], yaw: 0 },
    { type: 'deco_w4', items: [
      { kind: 'wiesenblumen', pos: [KX, 10, KZ + 6], size: [30, 6], n: 30 },
      { kind: 'heuballen', pos: [KX + 13, 10, KZ + 8.6], yaw: 0.4 },
      { kind: 'windrad', pos: [KX + 15, 10, KZ - 9], height: 8, yaw: -PI / 2, speed: 0.4 },
    ] },

    // ======================================================== 3  Zielinsel
    { type: 'warpbox', id: 'ziel_warp', pos: [8, YZ, -210], target: 'zaun_aus' },
    { type: 'deco_w4', items: [
      { kind: 'windrad', pos: [-9.4, YZ, -228], height: 8, yaw: -PI / 2, speed: 0.35 },
      { kind: 'wiesenblumen', pos: [-4, YZ, -216], size: [12, 14], n: 36 },
      { kind: 'wiesenblumen', pos: [6, YZ, -224], size: [8, 8], n: 22 },
      { kind: 'bergfichten', pos: [10.6, YZ, -228], size: [2, 3], n: 2, scale: [0.9, 1.3] },
      { kind: 'zaun', from: [-11.6, YZ, -207], to: [-11.6, YZ, -214] },
    ] },
  ],
  blocks: [
    { kind: 'question', pos: [-5, YA + 2.3, 1], content: 'krallen' },               // Krallen-Anzug (Wandloch)
    { kind: 'question', pos: [3, YA + 2.3, -2], content: 'wachstumsbeere' },
    { kind: 'question', pos: [-3, YD + 2.3, -77.4], content: 'coins:5' },
    { kind: 'hidden', pos: [-6, YZ + 5.6, -213], content: 'oneup' },                 // über dem Springklotz der Zielinsel
  ],
  enemies: [
    // Startwiese
    { kind: 'springklotz', id: 'sk_wand', pos: [-10.2, YA, -7.3] },
    { kind: 'springklotz', id: 'sk_wiese', pos: [4, YA, -10.6], hop: true, dir: [-1, 0], every: 1.6 },
    { kind: 'krabbelkaefer', id: 'kk_a', path: [[-8, YA, -13.4], [8, YA, -13.4]], count: 2, spacing: 2.2, color: 'red' },
    // Terrasse B
    { kind: 'stachelpanzer', id: 'sp_b1', pos: [-5, YB, -36], path: [[-9, YB, -36], [-1.5, YB, -36]] },
    { kind: 'stachelpanzer', id: 'sp_b2', pos: [5, YB, -42], path: [[2, YB, -42], [9, YB, -42]] },
    { kind: 'krabbelkaefer', id: 'kk_b', path: [[-8, YB, -45.4], [8, YB, -45.4]], count: 2, spacing: 2.4, color: 'yellow' },
    { kind: 'springklotz', id: 'sk_b1', pos: [-3.6, YB, -50.3] },
    { kind: 'springklotz', id: 'sk_b2', pos: [0, YB, -50.3] },
    { kind: 'springklotz', id: 'sk_b3', pos: [3.6, YB, -50.3] },
    // Terrasse C
    { kind: 'stachelpanzer', id: 'sp_c1', pos: [-6, YC, -57], path: [[-9, YC, -57], [-3, YC, -57]] },
    { kind: 'stachelpanzer', id: 'sp_c2', pos: [6, YC, -61], behavior: 'chase', sight: 5 },
    { kind: 'springklotz', id: 'sk_c1', pos: [4, YC, -55.6], hop: true, dir: [1, 0], every: 2 },
    { kind: 'flatterkaefer', id: 'fk_c', count: 3, spacing: 2.2, path: [[-8, YC + 2.4, -55], [8, YC + 2.4, -55], [8, YC + 2.4, -63], [-8, YC + 2.4, -63]], loop: true },
    // Plateau D
    { kind: 'stachelpanzer', id: 'sp_d', pos: [5, YD, -86], path: [[2.5, YD, -86], [9, YD, -86]] },
    { kind: 'springklotz', id: 'sk_d', pos: [7.6, YD, -79.4] },
    // Fahrt: Räder aus Flatterkäfern
    { kind: 'flatterkaefer_rad', id: 'rad1', center: [-7, 19.5, -112], count: 8, radius: 3, speed: 1.8 },
    { kind: 'flatterkaefer_rad', id: 'rad2', center: [-2.5, 22, -129], count: 8, radius: 4.8, plane: 'xz', speed: 2.2, color: 'pink' },
    { kind: 'flatterkaefer_rad', id: 'rad3', center: [-5.4, 24, -144], count: 8, radius: 3, speed: 1.8, cw: true },
    { kind: 'flatterkaefer_rad', id: 'rad4', center: [5.4, 24, -144], count: 8, radius: 3, speed: 1.8 },
    { kind: 'flatterkaefer_rad', id: 'rad5', center: [8, 20.5, -159], count: 8, radius: 3, speed: 1.8, cw: true },
    { kind: 'flatterkaefer_rad', id: 'rad6', center: [7, 18, -189], count: 8, radius: 3, plane: 'zy', speed: 1.8 },
    { kind: 'flatterkaefer', id: 'fk_z', count: 4, spacing: 2.6, path: [[-8, YZ + 3.4, -209], [8, YZ + 3.4, -209], [8, YZ + 3.4, -217], [-8, YZ + 3.4, -217]], loop: true, speed: 2 },
    // Zielinsel
    { kind: 'springklotz', id: 'sk_eins', pos: [-6, YZ, -213] },
    { kind: 'springklotz', id: 'sk_mast', pos: [2.6, YZ, -221] },
  ],
  items: [
    // 1
    line([0, YA + 0.6, 3], [0, YA + 0.6, -12], 6),
    { kind: 'coins', pos: [-13.3, YA + 6.6, -7.3], r: 0.7, n: 3 },
    arc([-1.5, 1, -17], [-1.5, 2, -22], 3, 3), arc([1.5, 2, -24], [1.5, YB + 1, -29], 3, 3),
    line([0, YB + 0.6, -31], [0, YB + 0.6, -46], 6),
    column(0, -50.3, YB + 3.6, YB + 6.6, 3),
    line([0, YC + 0.6, -54], [0, YC + 0.6, -64], 4),
    line([0, YC + 0.8, -67], [0, YD + 0.6, -73], 4),
    column(-8.5, -80, YD + 3, YD + 6, 3), column(-11, -85, 18 + 3, 18 + 6, 3),
    // 2: Münzspur über der Fahrt
    line([2.5, 18, -114], [-2.5, 20, -129], 5),
    line([3, 20.5, -159], [-1, 18.5, -174], 5),
    // Stempel-Hilfe: Münzsäule zwischen den Rädern
    column(0, -144, 21.5, 23.5, 2),
    // Kletterzaun-Raum
    line([KX - 9, 10.6, KZ + 4], [KX + 9, 10.6, KZ + 4], 6),
    { kind: 'coins', pos: [-98.5, 23.8, -165.6], r: 0.9, n: 4 },
    // 3
    line([0, YZ + 0.6, -208], [0, YZ + 0.6, -219], 5),
  ],
  checkpoint: { pos: [3, YD, -76], yaw: PI / 2 },
  stars: [
    [-13.4, YA + 6.2, -7.3],                       // 1: Wandloch in der Felswand am Start
    [-10.5, 24.2, -91],                            // 2: Felssims hinter der Treppe (zwei Pilztrampoline)
    [-94.6, 22.8, -165],                           // 3: Kletterzaun-Raum
  ],
  stamp: [0, 25.0, -144],                          // zwischen zwei Flatterkäfer-Rädern über der Fahrt
  goal: { pos: [0, YZ, -224], height: 9 },
  marks: {
    start: [0, YA, 6], wandloch: [-13.4, YA + 6, -7.3], schlucht: [0, YA, -15], terrasseB: [0, YB, -32], federn: [0, YB, -48],
    terrasseC: [0, YC, -56], treppe: [0, YC, -65], checkpoint: [3, YD, -76], stern2: [-10.5, 24, -91], start_fahrt: [0, YD, -94],
    stempel: [0, 25, -144], wolke: [-9.5, 14.9, -174], zaunraum: [KX, 10, KZ], ziel: [0, YZ, -224],
  },
};
