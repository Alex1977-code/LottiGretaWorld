// 5-Kapitän „Krümel im Kicherschlösschen“ (Archetyp diorama, Thema ghost, Musik course_diorama, 400 s) – Spuk-Diorama
// nach dem Bauplan (5-Kapitän: Geisterhaus-Diorama ca. 30 × 30 m mit Türen, Hang, Tippplattformen, Donut-Blöcken).
// Krümel (Kapitänsmütze, Rucksack) springt nicht; Türen bringen ihn zwischen den Etagen hin und her, Antipp-Plattformen
// tippt man auf dem Bildschirm an. Schaurig-niedlich: Grabsteine mit Herzchen, Kürbislaternen, kahle Bäume, ein
// schiefes Schlösschen mit leuchtenden Fenstern und Spitzdach-Türmen unter einem großen Mond.
//
// Aufbau (x −14 … 14, z −14 … 14, vorn = +z), Ebenen: Hof unten y −3 · Garten y 0 · Terrasse y 3 · Balkone y 7 · Dach y 11
//   Garten (rechts vorn, Start) mit Kreisgeist-Ring (7 Geister) um den Brunnen-Sockel, Gruft-Häuschen mit Tür,
//   Rampe hinter dem Ring hinauf zur Terrasse; links vorn der Hang hinab in den Hof (Spuk, Gräber) mit zwei Türen;
//   hinten das Schlösschen: Balkonreihe (y 7) mit Lücken, Dach (y 11) mit dem Großspuk.
// Sterne (Bauplan): 1 Tür vom Start (Gruft-Häuschen) → rechter Balkon, Kristallplattform antippen → Erker
//                   2 Hang hinab, linke Tür → linker Balkon
//                   3 vom linken Balkon über zwei Tippblöcke (fahren aus der Wand) → mittlerer Erker
//                   4 Weg durch den Kreisgeist-Ring zum Brunnen-Sockel
//                   5 Rampe hinter den Kreisgeistern, von der Terrasse auf die Donut-Blöcke fallen → Säule
// Die rechte Tür im Hof führt aufs Dach (Großspuk, Münzen, Schatzstelle). Gegner: Spuk (1), Kreisgeist (7), Großspuk (1).

import {
  isl, line, ring, cliffSkirt, rectPoly, castleBlock, towerRoofs, heartGraves, pumpkins, ironFence, deadTrees, glowPoints,
  mushroomLamps, SPUK, mistSea, savannaFloor, bats, wisps,
} from './_helpers_b.js';

const YB = -3, YA = 0, YT = 3, YK = 7, YR = 11;     // Hof, Garten, Terrasse, Balkone, Dach
const FRONT = -Math.PI / 2;                          // Türen blicken zur Kamera (+Z)
const ROCK = [0x4a3a6a, 0x5a4a7a, 0x3a2c58, 0x6a5a8a];

function scene(level) {
  // Felssockel unter dem Diorama (läuft nach unten spitz zu), violettes Nebelmeer darunter
  cliffSkirt(level, rectPoly(-14, 14, 14, -14, 2.5), YB - 2.5, -13, { colors: ROCK, flare: -0.42, band: 1.6, seed: 2 });
  mistSea(level, [0, -17, 0], 44, 30);
  // Mondschein-Rasen im Garten (Grasflecken, kleine Blumen)
  savannaFloor(level, [[-3, 14, 14, 3, YA, 16], [2, 14, 3, -2, YA, 4]], {
    base: 0x2e5a4e, palette: [0x3a6a56, 0x26483e, 0x4a7a5a, 0x34584a], flowers: [0xffffff, 0xc8a8ff, 0x8ad0ff], bushes: false,
    avoid: [[12.75, 4.9, 2.2], [11.5, 0.5, 2.6], [5.8, 9, 1.2]], seed: 9,
  });
  // ---------------- Schlösschen: Unterbau (bis zu den Balkonen), Oberbau, Türme
  castleBlock(level, -14, 14, -8, YK, -8, -14, {
    windows: [[-8.6, -1.6, 0.9, 1.3], [-4.2, -1.6, 0.9, 1.3], [1.3, -1.6, 0.9, 1.3], [5.2, 4.1, 0.9, 1.2], [8.2, 4.1, 0.9, 1.2], [-8.6, 2.8, 0.9, 1.3], [-3.6, 2.8, 0.9, 1.3],
      // Rückseite und Seiten (Orbit-Kamera sieht ringsum)
      [-9, 0.6, 0.9, 1.3, 0, '-z'], [-3, 0.6, 0.9, 1.3, 0, '-z'], [3, 0.6, 0.9, 1.3, 0, '-z'], [9, 0.6, 0.9, 1.3, 0, '-z'], [-6, 4, 0.9, 1.3, 0, '-z'], [0, 4, 1.4, 1.4, 'rund', '-z'], [6, 4, 0.9, 1.3, 0, '-z'],
      [-11, 0.6, 0.9, 1.3, 0, '+x'], [-11, 4, 0.9, 1.3, 0, '+x'], [-11, 0.6, 0.9, 1.3, 0, '-x'], [-11, 4, 0.9, 1.3, 0, '-x']],
  });
  castleBlock(level, -10, 10, YK, YR, -8, -14, { crenel: ['+z', '+x', '-x', '-z'], windows: [[-6.6, 8.1, 0.9, 1.3], [0, 8.4, 1.6, 1.6, 'rund'], [6.6, 8.1, 0.9, 1.3], [-4, 8.1, 0.9, 1.3, 0, '-z'], [4, 8.1, 0.9, 1.3, 0, '-z']] });
  castleBlock(level, 10, 14, YK, 13.4, -8, -14, { crenel: 'all', windows: [[12, 10.8, 0.8, 1.1], [-11, 9.6, 0.8, 1.1, 0, '+x'], [12, 9.6, 0.8, 1.1, 0, '-z']] });
  castleBlock(level, -14, -10, YK, 13.4, -8, -14, { crenel: 'all', windows: [[-12, 10.8, 0.8, 1.1], [-11, 9.6, 0.8, 1.1, 0, '-x'], [-12, 9.6, 0.8, 1.1, 0, '-z']] });
  castleBlock(level, -2, 2, YR, 15, -10, -13, { crenel: 'all', windows: [[0, 12.6, 0.8, 1.1, 'rund']] });   // Uhrtürmchen
  towerRoofs(level, [[12, 13.4, -11, 2.7, 4.6, SPUK.roof, 0xff7ac0], [-12, 13.4, -11, 2.7, 4.6, SPUK.roof2, 0xffd23a], [0, 15, -11.5, 2.1, 3.4, SPUK.roof, 0x6ad0ff]]);
  // Balkonplatten (Kollision: isl in den Daten) – Geländer vorn als Zier, Trennpfeiler zwischen den Erkern
  castleBlock(level, 1.5, 2.5, YK, YK + 2.6, -5, -8, { crenel: [] });
  // Gruft-Häuschen im Garten (Tür vorn)
  castleBlock(level, 11.4, 14.1, YA, YA + 3.4, 6.2, 3.6, { crenel: ['+z'] });
  towerRoofs(level, [[12.75, YA + 3.4, 4.9, 1.7, 1.8, SPUK.roof2, 0xff7ac0]]);
  // Dachgaube mit der Dachtür
  castleBlock(level, 3.4, 6.6, YR, YR + 3.4, -13.1, -14, { crenel: ['+z'] });
  // ---------------- Hof, Garten, Zier
  heartGraves(level, [[-12, YB, 5, 0.2], [-9.6, YB, 4, -0.15, 0.9], [-12.4, YB, 9.4, 0.3, 1.1], [-7.4, YB, 12.6, 0, 0.85], [-12.6, YB, 0.2, 0.1], [9.6, YA, 13.2, 0.1, 0.8]]);
  pumpkins(level, [[-3.8, YB, 1.6, 0.4], [-13, YB, 12.8, 0.6, 1.2], [1.6, YA, 4.1, 0.2], [13.2, YA, 12.6, -0.4, 1.1], [3.6, YT, -2.6, 0.1], [-7.6, YK, -5.6, 0.2, 0.8], [6.2, YR, -12.6, 0, 1.2]]);
  deadTrees(level, [[-13, YB, 13, 1.1, 0.4], [13.2, YA, 8.4, 0.9, 2.2], [-0.6, YA, 13.2, 0.8, 1]]);
  ironFence(level, [-2.6, YA, 14], [14, YA, 14]);
  ironFence(level, [14, YA, 14], [14, YA, 6.6]);
  ironFence(level, [-14, YB, 14], [-3.4, YB, 14]);
  ironFence(level, [-14, YB, 14], [-14, YB, -7.6]);
  ironFence(level, [2.4, YT, -2.1], [9.6, YT, -2.1], 0.9);
  for (const [x0, x1] of [[-14, -8.6], [-3, 1.4], [2.6, 6.4], [9.1, 14]]) ironFence(level, [x0, YK, -5.05], [x1, YK, -5.05], 0.8);
  mushroomLamps(level, [[-10.6, YB, 11.4, 1, 0x8aff8a], [-4.4, YB, 6.2, 0.8, 0xff8ad8], [3, YA, 12.6, 0.9, 0x8ad0ff]]);
  // Hof: Moos und Pfützen zwischen den Steinplatten
  savannaFloor(level, [[-14, -3, 14, -8, YB, 14], [-3, 2, 3, -8, YB, 4]], {
    palette: [0x5a7a6a, 0x4a6a5e, 0x7a6a9a, 0x5a5a8a], flowers: [0xc8a8ff, 0xffffff], bushes: false, seed: 13,
    avoid: [[-12, 5, 0.8], [-9.6, 4, 0.8], [-12.4, 9.4, 0.8], [-7.4, 12.6, 0.8], [-12.6, 0.2, 0.8], [-5, -5, 1.6]],
  });
  // Brunnen-Sockel in der Ring-Mitte (Stern 4) und Säule hinter den Donuts (Stern 5)
  const b = [];
  glowPoints(level, [[5.8, 0.9, 9, 2.2], [-5, 2.4, -5, 2]], { color: 0x9a7aff, size: 2, opacity: 0.45, pulse: 0.5 });
  // Laternen-Schein an der Gruft und am Hof
  glowPoints(level, [[12.5, 3.0, 6.5], [-0.5, 0.3, -7.6], [-11.5, 0.3, -7.6], [12, 10.2, -7.6], [-11.5, 10.2, -7.6]], { color: 0xffb860, size: 2.4, opacity: 0.5, pulse: 0.4 });
  return b;
}

function setup(level) {
  // Außen bei Nacht: kühles Mondlicht
  level.view?.setMood?.('aussen', { time: 0 });
  bats(level, { spots: [[12, 16.5, -11, 3], [-12, 16, -11, 3.4], [0, 18.5, -8, 5]], n: 2 });
  wisps(level, [[-9, YB + 1.4, 8, 2.4, 0x9affd8], [-6, YB + 1.2, -2, 1.8, 0xc8a8ff], [2, YA + 1.4, 11, 1.6, 0x9ad8ff], [9, YT + 1.2, -5, 1.6, 0x9affd8]]);
}

export const LEVEL = {
  id: '5-Kapitän',
  world: 5,
  title: 'Krümel im Kicherschlösschen',
  archetype: 'diorama',
  theme: 'ghost',
  music: 'course_diorama',
  build: scene,
  setup,
  timeLimit: 400,
  killY: -16,
  start: { pos: [11, YA, 12], yaw: Math.PI },
  diorama: {
    figure: 'kruemel',
    center: [0, 3, -1],
    camera: { yaw: 24, pitch: 42, dist: [50, 16], follow: [0.3, 0.9], fov: 40 },
    props: [
      { kind: 'dig', pos: [1.2, YA, 12.2] }, { kind: 'dig', pos: [-12.4, YB, 11.8] }, { kind: 'dig', pos: [7.6, YR, -10.2] },

    ],
  },
  segments: [
    // ---------------- Boden: Garten (y 0), Garten hinten rechts, Hof (y −3) samt Grube, Terrasse (y 3)
    isl(-3, 14, 14, 3, YA, 5),
    isl(2, 14, 3, -2, YA, 5),
    isl(-14, -3, 14, -8, YB, 3, { top: 'stone' }),
    isl(-3, 2, 3, -8, YB, 3, { top: 'stone' }),
    isl(2, 14, -2, -8, YT, 8, { top: 'stone' }),
    // Hang vom Garten hinab in den Hof (links vorn) und Rampe hinter dem Ring hinauf zur Terrasse
    { type: 'ramp', pos: [-6, YB, 10.5], size: [6, YA - YB, 3], axis: 'x', dir: 1, top: 'stone' },
    { type: 'ramp', pos: [11.5, YA, 0.5], size: [3, YT - YA, 5], axis: 'z', dir: -1, top: 'stone' },
    // Balkonreihe (y 7): links | Tippblöcke | Erker Mitte | Pfeiler | Erker rechts | Kristallplattform | rechts
    isl(-14, -8.5, -5, -8, YK, 0.6, { top: 'stone' }),
    isl(-3, 1.5, -5, -8, YK, 0.6, { top: 'stone' }),
    isl(2.5, 6.5, -5, -8, YK, 0.6, { top: 'stone' }),
    isl(9, 14, -5, -8, YK, 0.6, { top: 'stone' }),
    // Säule mit Stern 5 (nur über die Donut-Blöcke erreichbar)
    isl(-6, -4, -4, -6, 1.6, 4.6, { top: 'stone' }),
    // Brunnen-Sockel in der Ring-Mitte (Stufe 0,25 m)
    { type: 'island', pos: [5.8, YA, 9], size: [1.6, 0.25, 1.6], under: 0, top: 'stone' },
    // ---------------- Antippen: Kristallplattform (Stern 1), Tippblöcke aus der Wand (Stern 3)
    { type: 'antipp', id: 'kristall', pos: [7.75, YK - 0.5, -6.5], size: [2.5, 0.5, 2.8], mode: 'appear', color: 'cyan' },
    { type: 'antipp', id: 'tipp1', pos: [-7.1, YK - 0.5, -9.4], size: [2.7, 0.5, 2.8], mode: 'slide', dir: [0, 1], length: 2.8, color: 'pink' },
    { type: 'antipp', id: 'tipp2', pos: [-4.4, YK - 0.5, -9.4], size: [2.7, 0.5, 2.8], mode: 'slide', dir: [0, 1], length: 2.8, color: 'pink' },
    // ---------------- Donut-Blöcke (Stern 5): unter der Terrassenkante, Reihe zur Säule
    { type: 'donutblock', id: 'donuts', from: [1.5, 0.6, -5], to: [-3.5, 0.6, -5], color: 'schoko', delay: 0.5, respawn: 3 },
    // ---------------- Türen
    { type: 'spuk_tuer', id: 'tuer1', pos: [12.75, YA, 6.25], yaw: FRONT, target: 'tuer1b', mood: 'aussen' },
    { type: 'spuk_tuer', id: 'tuer1b', pos: [12, YK, -7.95], yaw: FRONT, target: 'tuer1', mood: 'aussen' },
    { type: 'spuk_tuer', id: 'tuer2l', pos: [-11.5, YB, -7.95], yaw: FRONT, target: 'tuer2b', mood: 'aussen' },
    { type: 'spuk_tuer', id: 'tuer2b', pos: [-11.5, YK, -7.95], yaw: FRONT, target: 'tuer2l', mood: 'aussen' },
    { type: 'spuk_tuer', id: 'tuer2r', pos: [-0.5, YB, -7.95], yaw: FRONT, target: 'tuer_dach', mood: 'aussen' },
    { type: 'spuk_tuer', id: 'tuer_dach', pos: [5, YR, -13.05], yaw: FRONT, target: 'tuer2r', mood: 'aussen' },
    { type: 'sign', pos: [9.2, YA, 10.6], text: 'Kicherschlösschen\nBitte leise kichern!', yaw: -0.5 },
  ],
  items: [
    // Garten
    line([10.4, YA + 0.4, 10.6], [10.4, YA + 0.4, 3.6], 4),
    ring([5.8, YA + 0.6, 9], 1.2, 5),
    line([11.5, YA + 1.2, 2.4], [11.5, YT + 0.6, -1.4], 3),
    // Hof (Hang hinab) und Donuts
    line([-3.6, YA + 0.4, 10.5], [-8.4, YB + 0.4, 10.5], 4),
    line([-9, YB + 0.4, 7], [-9, YB + 0.4, 1], 4),
    line([1.5, 2.2, -5], [-3.5, 2.2, -5], 5),
    // Balkone und Dach
    line([10, YK + 0.4, -6.5], [13, YK + 0.4, -6.5], 3),
    line([-13, YK + 0.4, -6.5], [-11, YK + 0.4, -6.5], 2),
    ring([-4, YR + 0.5, -11], 1.6, 8),
    line([3, YR + 0.5, -9.2], [8.5, YR + 0.5, -9.2], 5),
  ],
  enemies: [
    { kind: 'kreisgeist_kreis', id: 'ring', pos: [5.8, YA + 0.15, 9], count: 7, radius: 3, speed: 1.0 },
    { kind: 'spuk', id: 'spuk', pos: [-12.2, YB, 11.6], sight: 10, speed: 1.3 },
    { kind: 'spuk', id: 'grossspuk', pos: [-4, YR, -11], size: 2.5, speed: 0.9, sight: 12 },
  ],
  stars: [
    [4.5, YK, -6.5],                                  // 1: rechter Erker hinter der Kristallplattform
    [-9.6, YK, -6.4],                                 // 2: linker Balkon (linke Tür im Hof)
    [-0.8, YK, -6.5],                                 // 3: mittlerer Erker hinter den Tippblöcken
    [5.8, YA + 0.25, 9],                              // 4: Brunnen-Sockel im Kreisgeist-Ring
    [-5, 1.6, -5],                                    // 5: Säule hinter den Donut-Blöcken
  ],
  marks: {
    start: [11, YA, 12], ringMitte: [5.8, YA, 9], tuer1: [12.75, YA, 6.25], tuer1b: [12, YK, -7.95], kristall: [7.75, YK, -6.5],
    hangOben: [-3, YA, 10.5], hangUnten: [-9, YB, 10.5], tuer2l: [-11.5, YB, -7.95], tuer2r: [-0.5, YB, -7.95], tipp1: [-7.1, YK, -6.6],
    tipp2: [-4.4, YK, -6.6], rampe: [11.5, YA, 3], terrasse: [6, YT, -5], donuts: [1.5, 1.6, -5], saeule: [-5, 1.6, -5], dach: [5, YR, -12],
  },
};
