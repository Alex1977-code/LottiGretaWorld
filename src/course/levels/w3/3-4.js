// 3-4 „Marzipangarten“ – kurzer Pastell-Garten über den Wolken, nur 100 s (Bauplan: Detail 3-4). Level verläuft nach −Z;
// Thema plaza (rosa Gras, Pastellfarben), Musik course_plaza.
//
// Abschnitte:
//   1  Start             z   9 … −26  Startinsel unter dem Blumenbogen; direkt **hinter** dem Start ein unsichtbarer
//                                      Wolkenlift (drei Münzen schweben über ihm) – er trägt zu Stern 0. Zwei
//                                      gegenläufige Schwebeplattformen über die erste Lücke, Pilzlinge.
//   2  Hasenplattform    z −26 … −55  Gartenplatz mit Brunnen (Extraleben im unsichtbaren Block über der oberen
//                                      Schale), Pavillon, Marzipan-Schweinchen; Hase (Stern 1); links Lotti- und
//                                      Greta-Schalter (je die eigene Heldin) lassen Wolkenstufen zum Stempel erscheinen;
//                                      Glasröhre über den Abgrund.
//   3  Schnappblumen     z −66 … −96  drei Schwebeplattformen mit Topf-Schnappblumen; rechts die Wolkenkanone in den
//                                      Münzhimmel (Stern 2 am Ende, zurück durch einen Sprung in die Tiefe).
//   4  Zieltreppe        z −96 … −116 Pastelltreppe mit Pilzlingen, Endlos-Münzblock über der dritten Stufe, Zielmast.
// Sterne (Index): 0 Wolkenlift hinter dem Start, 1 Hase fangen, 2 Münzhimmel (Wolkenkanone).
// Stempel: Wolkenstufen links nach der Hasenstelle (Figurenschalter Lotti bzw. Greta).

import {
  lawn, line, ring, arc, starHere, levelSetup, farHide, pavilion, fountain, candyTrees, ballBushes, marzipanPigs,
  gardenBench, flowerArch, mosaic, blossomTrees, flowerBeds, gardenLamps, hedges, petals, instanceEnemies, cullStatic,
  shadowless, isl, noModelShadow, balustrade,
} from './_helpers_a.js';

const Y = 1;
const YT = Y + 4.2;          // Zielplateau (Oberkante der Treppe)
const YH = Y + 24;           // Münzhimmel
const CAM = { pitch: 44, dist: 13, fov: 40 };

function scene(level) {
  // ---------------- Start
  flowerArch(level, 0, Y, 1.2, { width: 3.6, height: 3.2 });
  blossomTrees(level, [[-4.6, Y, 6.4, 3.6], [4.8, Y, -4.4, 3.2]]);
  candyTrees(level, [[4.6, Y, 6.2, 2.4, 0], [-4.8, Y, -4.6, 2.2, 1]]);
  gardenBench(level, -4.4, Y, 2.6, Math.PI / 2);
  ballBushes(level, [[5, Y, 1.8, 0.5], [-5.2, Y, -1.2, 0.45], [6.1, Y, -22.6, 0.55], [-6.2, Y, -18.4, 0.5]]);
  flowerBeds(level, [[0, Y, 6.8, 6, 1.6, 14], [-2.6, Y, -21.6, 4, 2, 10], [3.6, Y, -25, 4, 1.4, 9]]);
  marzipanPigs(level, [[5.3, Y, -19.4, -2.4, 0.9]]);
  // ---------------- Hasenplattform
  fountain(level, -6.4, Y, -35.4, { r: 2.0 });
  pavilion(level, -5.6, Y, -49, { r: 2.4, h: 2.6 });
  flowerArch(level, 0, Y, -30.6, { width: 3.6, height: 3.3, colors: [0xffffff, 0xff9ccc, 0xffe27a, 0xb8a0ff] });
  flowerArch(level, 0, Y, -52.2, { width: 3.4, height: 3.2 });
  mosaic(level, -2, 2, -30.2, -54.6, Y, { cell: 1 });
  mosaic(level, -9.4, -2, -40.2, -44.2, Y, { cell: 1 });
  candyTrees(level, [[8.6, Y, -31.8, 2.6, 2], [8.8, Y, -53.4, 2.4, 3], [-9, Y, -53.6, 2.2, 0]]);
  blossomTrees(level, [[8.6, Y, -46.6, 3.8]]);
  ballBushes(level, [[9.2, Y, -38.4, 0.5], [9.3, Y, -42.4, 0.45], [-9.3, Y, -31.2, 0.5]]);
  gardenLamps(level, [[-2.6, Y, -31.4], [2.6, Y, -31.4], [-2.6, Y, -51.4], [2.6, Y, -51.4]]);
  marzipanPigs(level, [[7.4, Y, -50.2, -2.8, 1], [8.1, Y, -51.2, -3.2, 0.7]]);
  gardenBench(level, 9.2, Y, -35.6, -Math.PI / 2);
  flowerBeds(level, [[-8.8, Y, -38.6, 1.2, 2.6, 7], [8.9, Y, -44.8, 1.2, 3, 7], [-3.4, Y, -45.4, 2, 1.2, 6]]);
  hedges(level, [[-10, -7.8, -54.6, -53.6, Y, 0.9]]);
  // ---------------- Schnappblumen-Strecke, Münzhimmel
  candyTrees(level, [[5, Y, -71, 2.2, 1], [-5, Y, -91.2, 2.4, 2], [5.6, Y, -95, 2.2, 3]]);
  ballBushes(level, [[-5, Y, -67.2, 0.5], [12.8, Y, -71, 0.5], [6, Y, -90.2, 0.45]]);
  flowerBeds(level, [[-3.4, Y, -70.4, 3, 1.4, 8], [11.4, Y, -65.2, 3, 1, 7], [2.2, Y, -94.8, 3, 1.2, 8]]);
  blossomTrees(level, [[12.8, Y, -65, 3.2]]);
  // ---------------- Zieltreppe
  balustrade(level, -3.8, -96, -105.6, Y, 6, 0.7);
  balustrade(level, 3.8, -96, -105.6, Y, 6, 0.7, { cap: 0xb8a0ff });
  gardenLamps(level, [[-4.6, YT, -107], [4.6, YT, -107]]);
  candyTrees(level, [[-5, YT, -115, 2.8, 1], [5, YT, -115, 2.6, 0]]);
  ballBushes(level, [[-5.2, YT, -110.6, 0.55], [5.2, YT, -110.6, 0.55]]);
  flowerBeds(level, [[0, YT, -116.4, 8, 1, 12]]);
  marzipanPigs(level, [[-3.4, YT, -108.6, 0.4, 0.8]]);
  // ferne Gartenschwebeinseln (ohne Sonnenschatten)
  shadowless(level, FAR);
  petals(level, { n: 60, size: [28, 12, 24] });
  instanceEnemies(level, ['pilzling']);
  noModelShadow(level, ['schnappblume', 'endlessblock']);
  farHide(level, ['bunny', 'schnappblume', 'endlessblock'], 34);
}

// ferne Schwebeinseln mit Blütenbäumen
const FAR = [
  isl(-34, -22, -10, -24, -6, 3, { under: 3 }), isl(22, 36, -30, -44, -9, 3, { under: 3 }),
  isl(-36, -24, -70, -86, -4, 3, { under: 3 }), isl(24, 34, -96, -110, -7, 3, { under: 3 }),
  isl(-30, -20, -118, -130, -2, 3, { under: 3 }),
  { type: 'deco', items: [
    { kind: 'tree', pos: [-28, -6, -16], size: 4.4, color: 0xffb8dc, solid: false }, { kind: 'tree', pos: [29, -9, -37], size: 4, color: 0xd8f0a0, solid: false },
    { kind: 'tree', pos: [-30, -4, -78], size: 4.6, color: 0xffc8e8, solid: false }, { kind: 'tree', pos: [29, -7, -103], size: 3.8, color: 0xffd8a0, solid: false },
    { kind: 'tree', pos: [-25, -2, -124], size: 4, color: 0xffb8dc, solid: false },
  ] },
];

/** Schwebeplattform (Pastell) mit Bahn quer über die Lücke. */
const glider = (id, z, x0, x1, o = {}) => ({
  type: 'mover', id, path: [[x0, Y - 0.5, z], [x1, Y - 0.5, z]], size: o.size ?? [3, 0.5, 3], speed: o.speed ?? 2.2, wait: 0.3,
  phase: o.phase ?? 0, color: o.color ?? 0xffb8dc,
});

export const LEVEL = {
  id: '3-4',
  world: 3,
  title: 'Marzipangarten',
  archetype: 'parcours',
  theme: 'plaza',
  music: 'course_plaza',
  timeLimit: 100,
  start: { pos: [0, Y, 4], yaw: Math.PI / 2 },
  killY: -12,
  setup(level, sc) { levelSetup(scene)(level, sc); cullStatic(level); },
  camera: [
    { ...CAM, from: 14, to: -26 },
    { ...CAM, from: -28, to: -56, pitch: 46, dist: 13.5 },
    { ...CAM, from: -62, to: -95, pitch: 46 },
    { ...CAM, from: -97, to: -120, pitch: 42, dist: 13.5 },
  ],
  segments: [
    // =============================================================== 1  Start
    lawn(-6, 6, 8, -6.5, Y),
    { type: 'sign', pos: [-3.6, Y, 6.4], text: 'Marzipangarten', size: [2.8, 0.9] },
    // unsichtbarer Wolkenlift direkt hinter dem Start (bündig an der Hinterkante)
    { type: 'wolkenlift', id: 'wl_start', pos: [0, Y - 0.55, 8.95], width: 2.6, path: [[0, Y + 9.4, 8.95]], speed: 2.4, reveal: 'touch', wait: 0.3 },
    { type: 'hecken_hase', pos: [4.4, Y, 4.2], yaw: -Math.PI / 2 - 0.5, scale: 0.8 },
    glider('mA', -9.6, -3.4, 3.4),
    glider('mB', -14, 3.4, -3.4),
    lawn(-7, 7, -17, -26, Y),
    { type: 'bridge', from: [0, Y, -26], to: [0, Y, -30], width: 3, color: 0xfff4fa },
    { type: 'deco_w1', items: [
      { kind: 'butterflies', pos: [0, Y, 2], n: 3, r: 2.2, colors: [0xff9ccc, 0xffffff, 0xb8a0ff] },
      { kind: 'bunting', from: [-5.8, Y + 3.2, -25.6], to: [5.8, Y + 3.2, -25.6], sag: 0.6, colors: [0xff9ccc, 0xfff4fa, 0x9ad8c0, 0xb8a0ff] },
    ] },

    // =============================================================== 2  Hasenplattform
    lawn(-10, 10, -30, -55, Y),
    { type: 'sign', pos: [-9, Y, -45.6], text: 'Lotti- oder\nGreta-Schalter', size: [2.4, 0.8] },
    // Wolkenstufen zum Stempel (erscheinen über den Schaltern)
    { type: 'appear', id: 'stempelweg', style: 'cloud', parts: [
      { pos: [-12.4, Y + 1.1, -43.2], size: [2.2, 0.5, 2.2] },
      { pos: [-14.8, Y + 2.6, -45.4], size: [2.2, 0.5, 2.2] },
      { pos: [-17.2, Y + 4.1, -47.6], size: [2.2, 0.5, 2.2] },
    ] },
    { type: 'platform', pos: [-18.6, Y + 5.4, -50.6], size: [3, 0.6, 3], style: 'cloud' },
    { type: 'deco_w1', items: [
      { kind: 'butterflies', pos: [3, Y, -40], n: 4, r: 3, colors: [0xffd23d, 0xff9ccc, 0x9ad8ff] },
      { kind: 'butterflies', pos: [-6.4, Y + 1.5, -35.4], n: 2, r: 1.6, colors: [0xffffff, 0xb8a0ff] },
    ] },
    { type: 'pastell_blume', pos: [6.6, Y, -33.2], yaw: 0.6 },
    { type: 'hecken_hase', pos: [-8.6, Y, -51.6], yaw: 0.3, scale: 0.9 },
    // Glasröhre über den Abgrund
    { type: 'glasspipe', id: 'rohr', radius: 1, oneWay: true, coins: 4, path: [[0, Y + 1.05, -53.2], [0, Y + 1.05, -56.5], [0, Y + 3.2, -61], [0, Y + 1.05, -66], [0, Y + 1.05, -68.4]] },

    // =============================================================== 3  Schnappblumen-Strecke, Wolkenkanone
    lawn(-6, 6, -66, -72, Y),
    lawn(9, 14, -63.5, -72, Y),
    { type: 'cloudcannon', id: 'kanone', pos: [11.5, Y, -68.4], target: [0, YH, -77], arc: 4 },
    glider('m1', -75.5, -4, 4, { size: [3.6, 0.5, 3.6], speed: 1.8 }),
    glider('m2', -80.5, 4, -4, { size: [3.6, 0.5, 3.6], speed: 1.8 }),
    glider('m3', -85.5, -4, 4, { size: [3.6, 0.5, 3.6], speed: 1.8 }),
    lawn(-7, 7, -89, -96, Y),
    // Münzhimmel: Wolkenweg hoch über der Strecke, am Ende Stern 2; zurück durch einen Sprung in die Tiefe
    { type: 'cloud', pos: [0, YH - 0.6, -77], size: [4, 0.6, 4] },
    { type: 'cloud', pos: [0, YH - 0.6, -83.5], size: [3, 0.6, 3] },
    { type: 'cloud', pos: [3, YH - 0.6, -89.5], size: [3, 0.6, 3] },
    { type: 'cloud', pos: [0, YH - 0.6, -95.5], size: [3, 0.6, 3] },
    { type: 'cloud', pos: [-2.6, YH - 0.6, -101.5], size: [3.4, 0.6, 3.4] },

    // =============================================================== 4  Zieltreppe
    lawn(-4.5, 4.5, -96, -106, Y),
    { type: 'stairs', pos: [0, Y, -96], dir: '-z', steps: 6, rise: 0.7, run: 1.6, width: 8, style: 0xffc8e0 },
    lawn(-6, 6, -105.6, -118, YT, 4),
    { type: 'deco_w1', items: [
      { kind: 'bunting', from: [-4.6, YT + 2.6, -107], to: [4.6, YT + 2.6, -107], sag: 0.5, colors: [0xff9ccc, 0xffe27a, 0x9ad8c0, 0xb8a0ff] },
      { kind: 'butterflies', pos: [0, YT, -112], n: 3, r: 2.4, colors: [0xff9ccc, 0xffffff, 0xffd23d] },
    ] },
  ],
  blocks: [
    { kind: 'question', pos: [0, Y + 2.4, -21], content: 'coins:5' },
    // Extraleben: unsichtbarer Block über der oberen Brunnenschale
    { kind: 'hidden', pos: [-6.4, Y + 4.4, -35.4], content: 'oneup' },
    // Endlos-Münzblock über der dritten Stufe
    { kind: 'endlessblock', id: 'endlos', pos: [-2.2, Y + 2.1 + 2.4, -100] },
  ],
  enemies: [
    // Pilzlinge (11) und Mini-Pilzlinge (5)
    { kind: 'pilzling', pos: [3, Y, -2.6], path: [[1, Y, -2.6], [4.6, Y, -2.6]] },
    { kind: 'pilzling', mini: true, pos: [-3, Y, -4.6], path: [[-4.6, Y, -4.6], [-1, Y, -4.6]] },
    { kind: 'pilzling', pos: [-3, Y, -20.4], path: [[-5.4, Y, -20.4], [-0.6, Y, -20.4]] },
    { kind: 'pilzling', pos: [4, Y, -22.8], behavior: 'chase', sight: 6 },
    { kind: 'pilzling', mini: true, pos: [0, Y, -24.8], path: [[-3, Y, -24.8], [3, Y, -24.8]] },
    { kind: 'pilzling', pos: [6.6, Y, -48], path: [[4, Y, -48], [8.6, Y, -48]] },
    { kind: 'pilzling', pos: [-1, Y, -33.4], path: [[-3, Y, -33.4], [2.6, Y, -33.4]] },
    { kind: 'pilzling', mini: true, pos: [4.6, Y, -52.4], behavior: 'chase', sight: 5 },
    { kind: 'pilzling', pos: [-3, Y, -69.6], path: [[-4.6, Y, -69.6], [-1.4, Y, -69.6]] },
    { kind: 'pilzling', pos: [3.4, Y, -92.6], path: [[1, Y, -92.6], [5.6, Y, -92.6]] },
    { kind: 'pilzling', pos: [-3.6, Y, -94.6], behavior: 'chase', sight: 6 },
    { kind: 'pilzling', mini: true, pos: [0, Y, -91], path: [[-3, Y, -91], [3, Y, -91]] },
    // auf der Treppe (laufen quer über die Stufen)
    { kind: 'pilzling', pos: [2, Y + 1.4, -98.4], path: [[-3.2, Y + 1.4, -98.4], [3.2, Y + 1.4, -98.4]] },
    { kind: 'pilzling', pos: [-2, Y + 2.8, -101.6], path: [[-3.2, Y + 2.8, -101.6], [3.2, Y + 2.8, -101.6]] },
    { kind: 'pilzling', pos: [1, Y + 4.2, -104.8], path: [[-3.2, Y + 4.2, -104.8], [3.2, Y + 4.2, -104.8]] },
    { kind: 'pilzling', mini: true, pos: [-2, Y + 3.5, -103.2], path: [[-3.2, Y + 3.5, -103.2], [3.2, Y + 3.5, -103.2]] },
    // Schnappblumen (3) im Topf auf den Schwebeplattformen
    { kind: 'schnappblume', id: 'sb1', pos: [-4, Y, -75.5], base: 'pot', yaw: -Math.PI / 2 },
    { kind: 'schnappblume', id: 'sb2', pos: [4, Y, -80.5], base: 'pot', yaw: -Math.PI / 2 },
    { kind: 'schnappblume', id: 'sb3', pos: [-4, Y, -85.5], base: 'pot', yaw: -Math.PI / 2 },
  ],
  items: [
    // Hinweis: drei Münzen schweben über dem unsichtbaren Wolkenlift
    line([0, Y + 0.7, 7.0], [0, Y + 0.7, 9.6], 3),
    line([0, Y + 0.7, 1], [0, Y + 0.7, -4], 3),
    ...arc([0, Y + 0.6, -7.4], [0, Y + 0.6, -16], 4, 1.4),
    { kind: 'bunny', id: 'hase', pos: [3, Y, -41.5], area: { pos: [2.6, Y, -41.6], r: 5.4 }, reward: starHere(1) },
    { kind: 'figurenschalter', id: 'fs_lotti', pos: [-8.2, Y, -41.2], hero: 'lotti', on: { reveal: 'stempelweg' } },
    { kind: 'figurenschalter', id: 'fs_greta', pos: [-8.2, Y, -43.8], hero: 'greta', on: { reveal: 'stempelweg' } },
    ring([-6.4, Y + 3.2, -35.4], 1.4, 5),
    line([11.5, Y + 0.7, -64.6], [11.5, Y + 0.7, -66.4], 2),
    // Münzhimmel
    line([0, YH + 0.6, -78.5], [0, YH + 0.6, -82.6], 3),
    ...arc([0, YH + 0.6, -84.8], [3, YH + 0.6, -88.2], 3, 1.2),
    ...arc([3, YH + 0.6, -90.8], [0, YH + 0.6, -94.2], 3, 1.2),
    ...arc([0, YH + 0.6, -96.8], [-2.6, YH + 0.6, -100.2], 3, 1.2),
    ring([-2.6, YH + 1.2, -101.5], 1.3, 6),
    // Treppe
    line([0, Y + 0.6, -88.4], [0, Y + 0.6, -94], 3),
  ],
  stars: [
    [0, Y + 10.7, 8.95],                                                  // 0: auf dem unsichtbaren Wolkenlift
    { pos: [3, Y + 1, -41.5], hidden: true, id: 'stern_hase' },          // 1: Hase
    [-2.6, YH + 0.6, -101.5],                                             // 2: Münzhimmel
  ],
  stamp: [-18.6, Y + 6.6, -50.6],
  goal: { pos: [0, YT, -112.6], height: 8 },
  marks: {
    start: [0, Y, 4],
    lift: [0, Y, 8.95],
    gliders: [0, Y, -6],
    hare: [3, Y, -41.5],
    switches: [-8.2, Y, -42.5],
    pipe: [0, Y, -52.6],
    island: [0, Y, -68],
    cannon: [11.5, Y, -68.4],
    flowers: [0, Y, -72],
    heaven: [0, YH, -77],
    stairs: [0, Y, -95],
    endless: [-2.2, Y + 2.1, -100],
    goal: [0, YT, -108],
  },
};
