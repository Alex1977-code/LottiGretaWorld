// 1-1 „Kraxelwiese“ – Wiesen-Parcours, führt den Krallen-Anzug ein (Bauplan: Detail 1-1). Level verläuft nach −Z.
//
// Abschnitte (Länge entlang z):
//   1  Start-Wiese      z   9 … −22  (31 m) weiße Stufen hoch zur Terrasse mit Pilzling und ?-Block (Krallen-Anzug);
//                                     rechts unten der Eingang der Glasröhre (obere Route, Stern 1).
//   2  Röhren-Wiese     z −30 … −56  (26 m) Glasröhre endet auf der Wiese, ihr Abzweig auf dem Sims mit Stern 1;
//                                     Pilzlinge, ?-Block, zweite Glasröhre von der Hecken-Terrasse weiter.
//   3  Kletterwand      z −59 … −92  (33 m) Pilzlinge vor der 6-m-Wand (mit Krallen kletterbar); Ausweichroute
//                                     rechts über die Hügelkette (2-m-Stufen); Plateau mit Krallen-Pilzling und zwei
//                                     Glasröhren (zum Checkpoint bzw. auf den großen Hügel).
//   4  Checkpoint-Wiese z −92 … −124 (28 × 32 m) Checkpoint, Krallen-Anzug im Baum, großer Hase mit Riesentrank auf
//                                     dem 5-m-Hügel, Teich mit kleinem Hasen (Stern) und Röhren-Insel (Stempel-Raum).
//   5  Brücken-Passage  z −124 … −174 (50 m) Hohlweg mit Holzkisten, Ziegelreihe, Krallen-Pilzlinge, weiße Holzbrücke;
//                                     unten rechts ein Durchgang mit Extraleben; ein Buckel aus Steinblöcken direkt
//                                     hinter der Brücke deckt die Nische mit Stern 3 ab (Riesentrank zertrümmert ihn –
//                                     oder rechts hinunterfallen und mit dem Krallen-Anzug zur Nische hochklettern).
//   6  Ziel             z −174 … −200 (26 m) Glasröhre hinauf auf die Treppe, Sprungfeder, Zielmast.
//   Stempel-Raum abseits bei x ≈ 90 (Röhre auf der Teich-Insel hin, zweite Röhre zurück).
// Sterne (Index): 0 Sims der oberen Route, 1 Nische unter den Steinblöcken, 2 kleiner Hase am Teich.

import { isl, lawn, line, ring, arc, column, deco, decoW1, fence } from './_helpers.js';

const CAM = { pitch: 41, dist: 14, fov: 40, area: [-40, 40] };

export const LEVEL = {
  id: '1-1',
  world: 1,
  title: 'Kraxelwiese',
  archetype: 'parcours',
  theme: 'grass',
  music: 'course_grass',
  timeLimit: 500,
  start: { pos: [0, 1, 5], yaw: Math.PI / 2 },
  killY: -10,
  camera: [
    { ...CAM, from: 12, to: -24 },
    { ...CAM, from: -24, to: -57, yaw: -7 },
    { ...CAM, from: -57, to: -92, pitch: 42 },
    { ...CAM, from: -92, to: -124, pitch: 43 },
    { ...CAM, from: -124, to: -160, pitch: 46, dist: 13.5 },
    { ...CAM, from: -160, to: -204, pitch: 42 },
    // Stempel-Raum (abseits)
    { from: -100, to: -122, pitch: 50, dist: 12.5, fov: 40, x: 90, xLock: 0.7, area: [70, 110] },
  ],
  segments: [
    // =============================================================== 1  Start-Wiese
    ...lawn(-9, 9, 9, -22, 1, 3, { under: 3 }),
    ...lawn(-9, -5.5, 6.5, -4, 1.6, 0.6, { under: 0 }),
    { type: 'mound', pos: [5.8, 1, 2.5], radius: 2.8, height: 0.7 },
    { type: 'stairs', pos: [-3, 1, -5], dir: '-z', steps: 3, rise: 1, run: 1.2, width: 6 },
    ...lawn(-9, 2, -8.6, -22, 4, 3, { under: 0 }),
    { type: 'glasspipe', id: 'g_start', radius: 1, oneWay: true, coins: 4,
      path: [[6.5, 2.05, -11], [6.5, 2.05, -17], [6.5, 6.6, -23.5], [6.5, 6.6, -29], [4.4, 5.3, -33.4], [2.4, 5.05, -35.4]],
      branches: [{ at: 3, path: [[6.5, 6.6, -29], [8, 10.4, -34.5], [8.5, 10.55, -38.4]] }] },
    { type: 'bridge', from: [-4, 4, -22], to: [-4, 4, -30], width: 3 },
    deco([
      { kind: 'tree', pos: [-7.4, 4, -19.6], size: 5.6 },
      { kind: 'tree', pos: [8.2, 1, 7.6], size: 4.6 },
      { kind: 'tree', pos: [-7.8, 1.6, 4.6], size: 3.6, color: 'green' },
      { kind: 'tree', pos: [8.2, 1, -20.6], size: 4.2, color: 'green' },
      { kind: 'bush', pos: [-8.4, 1, -6.2], size: 0.8 }, { kind: 'bush', pos: [2.9, 1, -7.4], size: 0.6 },
      { kind: 'bush', pos: [8.5, 1, -8.6], size: 0.85 }, { kind: 'bush', pos: [1.2, 4, -21], size: 0.6 },
      { kind: 'flowers', pos: [-7.3, 1.6, 0.6], size: [2.6, 5], n: 6 },
      { kind: 'flowers', pos: [-6, 4, -13], size: [3, 3], n: 5, colors: ['pink', 'white', 'red'] },
      { kind: 'rock', pos: [8.6, 1, -13.5], size: 0.55 }, { kind: 'rock', pos: [-4.8, 1, 7.6], size: 0.4 },
      ...fence([[2.3, -21.6], [8.7, -21.6]], 1),
      ...fence([[-8.7, 8.6], [-8.7, 6.8]], 1),
      ...fence([[-8.7, 6.2], [-8.7, -3.8]], 1.6),
    ]),
    decoW1([
      { kind: 'daisies', pos: [-7.2, 1.6, 1], size: [3, 10], n: 34 },
      { kind: 'butterflies', pos: [-5.5, 1.6, 1], n: 3, r: 2.2 },
      { kind: 'daisies', pos: [2, 1, 3], size: [8, 8], n: 24, colors: ['white', 'white', 'yellow'] },
      { kind: 'daisies', pos: [-4, 4, -18], size: [9, 6], n: 22 },
      { kind: 'sign', pos: [1.9, 1, 1.6], arrow: 'up' },
      { kind: 'sign', pos: [4.2, 1, -9.4], arrow: 'right', yaw: -0.3 },
      { kind: 'bellflowers', pos: [-3.2, 1, 6.8], size: [2.6, 1.4], n: 8 },
      { kind: 'bellflowers', pos: [-1, 4, -20.8], size: [2.2, 1], n: 6 },
      { kind: 'mushrooms', pos: [8.4, 1, -1.4], color: 'red' },
      { kind: 'mushrooms', pos: [4.6, 1, -14.6], size: 0.7, color: 'orange' },
      { kind: 'mushrooms', pos: [-5.6, 4, -20.6], size: 0.8, color: 'red' },
      { kind: 'stump', pos: [-6.2, 1, -6.6], size: 0.5 },
      { kind: 'pebbles', from: [0.6, 1, 3.6], to: [-2.6, 1, -3.8], n: 6 },
      { kind: 'tufts', pos: [0, 1, -1], size: [14, 10], n: 12 },
      { kind: 'tufts', pos: [6, 1, -14], size: [6, 12], n: 8 },
      { kind: 'arch', pos: [-4, 4, -21.3], width: 3.5, height: 2.7 },
      { kind: 'cloudbank', pos: [-15, -5, -2], size: 4 },
      { kind: 'cloudbank', pos: [16, -6, -14], size: 5 },
      { kind: 'cloudbank', pos: [1, -9, 15], size: 5, n: 7 },
    ]),

    // =============================================================== 2  Röhren-Wiese
    ...lawn(-8, 5, -30, -56, 4, 3, { under: 3 }),
    ...lawn(-8, -4.5, -37, -48, 5, 1, { under: 0 }),
    { type: 'mound', pos: [0.5, 4, -47.5], radius: 2.6, height: 0.6 },
    // Sims der oberen Route (Stern 0)
    ...lawn(6.5, 10.5, -39, -50, 9.5, 1.2, { under: 2 }),
    { type: 'glasspipe', id: 'g_hedge', radius: 1, oneWay: true, coins: 3,
      path: [[-6.3, 6.05, -44.5], [-6.3, 6.05, -53], [-6.3, 5.6, -58.2], [-6.3, 5.05, -63.6]] },
    deco([
      { kind: 'tree', pos: [-7, 5, -39], size: 4.4, color: 'green' },
      { kind: 'tree', pos: [3.6, 4, -31.4], size: 3.4 },
      { kind: 'tree', pos: [9.6, 9.5, -49.2], size: 3.2 },
      { kind: 'bush', pos: [-4.9, 5, -38], size: 0.55 }, { kind: 'bush', pos: [-4.9, 5, -41.5], size: 0.55 },
      { kind: 'bush', pos: [4.3, 4, -55.2], size: 0.7 }, { kind: 'bush', pos: [-7.4, 4, -55], size: 0.6 },
      { kind: 'flowers', pos: [7.6, 9.5, -45], size: [1.6, 4], n: 4, colors: ['yellow', 'white'] },
      { kind: 'flowers', pos: [1.6, 4, -33.6], size: [3, 2], n: 4, colors: ['red', 'yellow'] },
      { kind: 'rock', pos: [-7.4, 4, -50], size: 0.5 },
      ...fence([[4.7, -31], [4.7, -54.6]], 4),
    ]),
    decoW1([
      { kind: 'daisies', pos: [-6.2, 5, -42], size: [3, 10], n: 26, colors: ['white', 'pink', 'yellow'] },
      { kind: 'butterflies', pos: [-5, 5, -43], n: 3, r: 2.4 },
      { kind: 'daisies', pos: [0, 4, -50], size: [8, 10], n: 22 },
      { kind: 'daisies', pos: [8.5, 9.5, -44], size: [3.4, 9], n: 16 },
      { kind: 'bellflowers', pos: [-2.4, 4, -31.6], size: [2.4, 1.2], n: 7 },
      { kind: 'mushrooms', pos: [-7.2, 4, -33.6], size: 1.1, color: 'red' },
      { kind: 'haybale', pos: [3.3, 4, -43], yaw: 0.4 },
      { kind: 'tufts', pos: [-1, 4, -44], size: [10, 20], n: 12 },
      { kind: 'sign', pos: [-2.6, 4, -54.6], arrow: 'up' },
      { kind: 'cloudbank', pos: [8.6, 6.4, -44.5], size: 2.2, n: 5 },
      { kind: 'cloudbank', pos: [-15, -3, -44], size: 4.5 },
    ]),

    // =============================================================== 3  Kletterwand-Zone
    ...lawn(-10, 10, -59.5, -76, 4, 3, { under: 3 }),
    { type: 'wall', pos: [-3.5, 4, -76.25], size: [13, 6, 0.5], climbable: true },
    ...lawn(-10, 3, -76.5, -92, 10, 9, { under: 3 }),
    // Ausweichroute: Hügelkette mit 2-m-Stufen (4 → 6 → 8 → 10)
    { type: 'hill', pos: [6.5, 4, -71.2], radius: 2.8, height: 2, steps: 1 },
    ...lawn(3, 10, -76, -82, 8, 7, { under: 3 }),
    ...lawn(3, 10, -82, -92, 10, 9, { under: 3 }),
    { type: 'glasspipe', id: 'g_cp', radius: 1, oneWay: true, coins: 3,
      path: [[-7, 11.05, -87.6], [-7, 11.05, -92.6], [-7, 8.7, -97.6], [-7, 8.05, -101.4]] },
    { type: 'glasspipe', id: 'g_hill', radius: 1, oneWay: true, coins: 3,
      path: [[6.2, 11.05, -87.6], [6.2, 11.05, -92], [7.6, 13.6, -95.8], [8, 13.1, -97.8]] },
    deco([
      { kind: 'tree', pos: [9, 4, -61.5], size: 5 },
      { kind: 'tree', pos: [-9, 4, -61], size: 3.8, color: 'green' },
      { kind: 'tree', pos: [-8.6, 10, -80.4], size: 5.2 },
      { kind: 'tree', pos: [9.2, 10, -84.5], size: 4, color: 'green' },
      { kind: 'bush', pos: [-9.3, 4, -70], size: 0.8 }, { kind: 'bush', pos: [9.4, 8, -79], size: 0.6 },
      { kind: 'bush', pos: [-0.8, 10, -91.2], size: 0.6 },
      { kind: 'flowers', pos: [-5, 4, -74.8], size: [8, 1.2], n: 6, colors: ['yellow', 'white', 'pink'] },
      { kind: 'flowers', pos: [6.5, 6, -71.2], size: [2.5, 2.5], n: 4, colors: ['red', 'yellow'] },
      { kind: 'rock', pos: [0.5, 4, -61], size: 0.5 }, { kind: 'rock', pos: [9.3, 4, -74.8], size: 0.6 },
    ]),
    decoW1([
      { kind: 'sign', pos: [-7.6, 4, -73.6], arrow: 'up' },
      { kind: 'sign', pos: [3.6, 4, -67.6], arrow: 'right' },
      { kind: 'daisies', pos: [0, 4, -66], size: [18, 10], n: 30 },
      { kind: 'daisies', pos: [-3.5, 10, -84], size: [12, 12], n: 28 },
      { kind: 'bellflowers', pos: [-9, 10, -84.5], size: [1.4, 3], n: 7 },
      { kind: 'bellflowers', pos: [7, 8, -80.6], size: [4, 1.2], n: 6 },
      { kind: 'mushrooms', pos: [1.6, 10, -78.4], color: 'red' },
      { kind: 'mushrooms', pos: [8.6, 4, -66], size: 0.8, color: 'brown' },
      { kind: 'stump', pos: [-8.6, 10, -86.4], size: 0.5 },
      { kind: 'tufts', pos: [0, 4, -67], size: [18, 12], n: 12 },
      { kind: 'cloudbank', pos: [17, -2, -75], size: 5 },
      { kind: 'cloudbank', pos: [-17, 2, -86], size: 4 },
    ]),

    // =============================================================== 4  Checkpoint-Wiese mit Teich
    { type: 'stairs', pos: [-3.5, 7, -95], dir: '+z', steps: 3, rise: 1, run: 1, width: 5 },
    ...lawn(-14, 14, -92, -110, 7, 6, { under: 3 }),
    ...lawn(-14, 3, -110, -124, 7, 6, { under: 3 }),
    ...lawn(11, 14, -110, -124, 7, 6, { under: 3 }),
    ...lawn(3, 11, -120, -124, 7, 6, { under: 3 }),
    isl(3, 11, -110, -120, 5, 4, { top: 'sand', under: 0 }),
    { type: 'water', pos: [7, 5, -115], size: [8, 1.6, 10] },
    isl(7.5, 10.5, -113.5, -116.5, 6.9, 1.9, { top: 'stone', under: 0 }),
    { type: 'pipe', id: 'p_pond', pos: [9.2, 6.9, -115.4], height: 1.3, target: 'p_room' },
    { type: 'pipe', id: 'p_back', pos: [12.5, 7, -121.6], height: 1.2 },
    // großer Hügel (5 m, drei Terrassen) mit dem großen Hasen (Riesentrank)
    { type: 'hill', pos: [8, 7, -98.5], radius: 5, height: 5, steps: 3 },
    deco([
      { kind: 'tree', pos: [12.6, 7, -94.8], size: 4.4, color: 'green' },
      { kind: 'tree', pos: [-12.6, 7, -95.5], size: 4.6 },
      { kind: 'tree', pos: [-11.6, 7, -121.4], size: 3.8, color: 'green' },
      { kind: 'bush', pos: [-13, 7, -104], size: 0.8 }, { kind: 'bush', pos: [13, 7, -103.4], size: 0.7 },
      { kind: 'bush', pos: [2.2, 7, -108.8], size: 0.55 },
      { kind: 'flowers', pos: [-4, 7, -116.5], size: [5, 5], n: 7 },
      { kind: 'flowers', pos: [12.5, 7, -112.5], size: [1.6, 3], n: 4, colors: ['pink', 'white'] },
      { kind: 'rock', pos: [3.4, 7, -121], size: 0.5 }, { kind: 'rock', pos: [2.6, 5, -114], size: 0.4 },
      ...fence([[-13.6, -123.6], [-3.4, -123.6]], 7),
      ...fence([[3.4, -123.6], [11, -123.6]], 7),
      ...fence([[13.6, -92.6], [13.6, -109.6]], 7),
    ]),
    decoW1([
      { kind: 'picnic', pos: [-8, 7, -100.6], yaw: 0.35 },
      { kind: 'haybale', pos: [12.3, 7, -107.4], yaw: 1.4 },
      { kind: 'haybale', pos: [-12.6, 7, -108], yaw: 0.2 },
      { kind: 'reeds', pos: [3.5, 5, -111.6], n: 8, size: 2.0 },
      { kind: 'reeds', pos: [10.5, 5, -119.3], n: 7, size: 2.0 },
      { kind: 'reeds', pos: [3.6, 5, -119.1], n: 6, size: 1.9 },
      { kind: 'reeds', pos: [11.6, 7, -110.4], n: 5, size: 1.1 },
      { kind: 'lilypads', pos: [5.4, 6.6, -116], size: [3, 6], n: 6 },
      { kind: 'daisies', pos: [-2, 7, -103], size: [20, 12], n: 40 },
      { kind: 'butterflies', pos: [-4, 7, -105], n: 4, r: 3.4 },
      { kind: 'butterflies', pos: [6.6, 7, -114.6], n: 3, r: 3, h: 1.6, colors: [0x8fd0ff, 0xffffff, 0xb07aff] },
      { kind: 'daisies', pos: [8, 8.67, -98.5], size: [8, 8], n: 18, colors: ['yellow', 'white'] },
      { kind: 'bellflowers', pos: [1.8, 7, -112], size: [1.4, 3], n: 8 },
      { kind: 'mushrooms', pos: [-11.8, 7, -117.4], color: 'red' },
      { kind: 'mushrooms', pos: [-12.6, 7, -111.2], size: 0.7, color: 'orange' },
      { kind: 'stump', pos: [-6, 7, -106.6], size: 0.45 },
      { kind: 'tufts', pos: [-3, 7, -104], size: [20, 14], n: 14 },
      { kind: 'sign', pos: [1.4, 7, -96.6], arrow: 'up' },
      { kind: 'cloudbank', pos: [-19, 1, -110], size: 5 },
      { kind: 'cloudbank', pos: [19, 0, -118], size: 4.5 },
    ]),

    // =============================================================== 5  Brücken-Passage
    // Hohlweg mit Graswänden (Holzkisten), danach Ziegelreihe und Brücke
    ...lawn(-4, 4, -124, -136, 7, 6, { under: 3 }),
    ...lawn(-8, -4, -124, -136, 10.5, 9.5, { under: 3 }),
    ...lawn(4, 8, -124, -136, 10.5, 9.5, { under: 3 }),
    ...lawn(-6, 8.5, -136, -146, 7, 6, { under: 3 }),
    { type: 'bridge', from: [0, 7, -146], to: [0, 7, -157], width: 3 },
    // hinter der Brücke: Buckel aus Steinblöcken (LEVEL.blocks) über der Nische mit Stern 1; die Nische öffnet sich
    // nach rechts (+x) zur Kletterwand über dem unteren Durchgang
    ...lawn(-8, 6.5, -157, -174, 7, 6, { under: 3 }),
    ...lawn(6.5, 8.5, -157, -158, 7, 6, { under: 0 }),
    ...lawn(6.5, 8.5, -160, -174, 7, 6, { under: 0 }),
    isl(6.5, 8.5, -158, -160, 4.9, 3.9, { under: 0, top: 'stone' }),
    { type: 'wall', pos: [8.7, 0.5, -159.75], size: [0.4, 4.4, 5.5], climbable: true },
    { type: 'wall', pos: [8.7, 4.9, -157.5], size: [0.4, 2.1, 1], climbable: true },
    { type: 'wall', pos: [8.7, 4.9, -161.25], size: [0.4, 2.1, 2.5], climbable: true },
    { type: 'pipe', id: 'p_high', pos: [-6, 7, -168], height: 1.2 },
    // unterer Durchgang rechts neben Brücke und Nische (Extraleben), Röhre zurück nach oben
    ...lawn(8.5, 13.5, -139, -166, 0.5, 3, { under: 2 }),
    { type: 'pipe', id: 'p_low', pos: [12, 0.5, -164], height: 1.2, target: 'p_high' },
    deco([
      { kind: 'tree', pos: [-7, 10.5, -133.4], size: 4.2, color: 'green' },
      { kind: 'tree', pos: [7, 10.5, -134.4], size: 4 },
      { kind: 'tree', pos: [5.4, 7, -171.6], size: 4.8 },
      { kind: 'tree', pos: [-6.8, 7, -160.6], size: 3.6, color: 'green' },
      { kind: 'tree', pos: [12.4, 0.5, -141], size: 3.8, color: 'green' },
      { kind: 'bush', pos: [-5.2, 10.5, -134], size: 0.6 }, { kind: 'bush', pos: [5.3, 10.5, -126], size: 0.6 },
      { kind: 'bush', pos: [-5.2, 7, -137.6], size: 0.7 }, { kind: 'bush', pos: [-7.4, 7, -172.6], size: 0.8 },
      { kind: 'bush', pos: [13, 0.5, -158], size: 0.7 },
      { kind: 'flowers', pos: [-6, 10.5, -131], size: [3, 4], n: 4 },
      { kind: 'flowers', pos: [6, 10.5, -129], size: [3, 4], n: 4, colors: ['yellow', 'white'] },
      // Steine an den Kanten neben dem Buckel (kein Absprung seitlich in die Nische)
      { kind: 'rock', pos: [8, 7, -157.5], size: 0.6, solid: true }, { kind: 'rock', pos: [8, 7, -160.6], size: 0.6, solid: true },
      { kind: 'rock', pos: [12.8, 0.5, -150], size: 0.6 },
      ...fence([[-5.6, -136.4], [-5.6, -145.6]], 7),
      ...fence([[-7.6, -159.4], [-7.6, -173.6]], 7),
      ...fence([[13.1, -139.4], [13.1, -147]], 0.5),
    ]),
    decoW1([
      { kind: 'arch', pos: [0, 7, -124.6], width: 7.4, height: 3.2 },
      { kind: 'mushrooms', pos: [-3.3, 7, -127.6], size: 0.7, color: 'brown' },
      { kind: 'bellflowers', pos: [3.2, 7, -126.4], size: [1, 2], n: 6 },
      { kind: 'daisies', pos: [1, 7, -141], size: [14, 8], n: 22 },
      { kind: 'daisies', pos: [-6, 10.5, -130], size: [3.6, 11], n: 14 },
      { kind: 'daisies', pos: [6, 10.5, -130], size: [3.6, 11], n: 14 },
      { kind: 'sign', pos: [7.6, 7, -144.6], arrow: 'right' },
      { kind: 'mushrooms', pos: [10, 0.5, -146], size: 1.1, color: 'red' },
      { kind: 'daisies', pos: [11, 0.5, -152], size: [4, 24], n: 30 },
      { kind: 'bellflowers', pos: [7.2, 4.9, -158.6], size: [0.6, 0.6], n: 3 },
      { kind: 'daisies', pos: [-1, 7, -166], size: [14, 14], n: 28 },
      { kind: 'tufts', pos: [-1, 7, -166], size: [14, 12], n: 10 },
      { kind: 'cloudbank', pos: [-18, -1, -150], size: 5 },
      { kind: 'cloudbank', pos: [22, -5, -134], size: 4.5 },
      { kind: 'cloudbank', pos: [0, -6, -151], size: 3.6 },
      { kind: 'cloudbank', pos: [18, -6, -160], size: 3.4 },
    ]),

    // =============================================================== 6  Ziel
    { type: 'glasspipe', id: 'g_goal', radius: 1, oneWay: true, coins: 4,
      path: [[0, 8.05, -170.5], [0, 8.05, -176], [0, 11.2, -181.5], [0, 11.05, -184.4]] },
    ...lawn(-9, 9, -178, -200, 7, 6, { under: 3 }),
    { type: 'stairs', pos: [0, 7, -183.5], dir: '-z', steps: 3, rise: 1, run: 1.2, width: 4 },
    { type: 'trampoline', pos: [4.2, 7, -186.5], strength: 17 },
    deco([
      { kind: 'tree', pos: [-7.4, 7, -196.6], size: 6 },
      { kind: 'tree', pos: [7.4, 7, -197.4], size: 5.2, color: 'green' },
      { kind: 'tree', pos: [-7.8, 7, -181], size: 3.8, color: 'green' },
      { kind: 'bush', pos: [7.6, 7, -180], size: 0.8 }, { kind: 'bush', pos: [-3, 7, -198.6], size: 0.7 },
      { kind: 'flowers', pos: [-4.5, 7, -190], size: [4, 6], n: 6 },
      { kind: 'flowers', pos: [5, 7, -193], size: [4, 5], n: 5, colors: ['yellow', 'white', 'pink'] },
      { kind: 'post', pos: [-4, 7, -182.4], size: 3.4 }, { kind: 'post', pos: [4, 7, -182.4], size: 3.4 },
      ...fence([[-8.6, -199.6], [8.6, -199.6]], 7),
    ]),
    decoW1([
      { kind: 'bunting', from: [-4, 10.3, -182.4], to: [4, 10.3, -182.4], sag: 0.6 },
      { kind: 'bunting', from: [-7.4, 9.6, -196.6], to: [-1, 9.6, -193.2], sag: 0.5 },
      { kind: 'daisies', pos: [0, 7, -190], size: [16, 18], n: 36, colors: ['white', 'yellow', 'pink'] },
      { kind: 'butterflies', pos: [-3.6, 7, -190], n: 4, r: 2.6 },
      { kind: 'sign', pos: [-2.6, 7, -179.2], arrow: 'up' },
      { kind: 'mushrooms', pos: [7.6, 7, -188.6], color: 'red' },
      { kind: 'bellflowers', pos: [3.4, 7, -180.4], size: [2, 1], n: 6 },
      { kind: 'haybale', pos: [-6.6, 7, -186.2], yaw: 0.9 },
      { kind: 'cloudbank', pos: [-17, 0, -192], size: 5 },
      { kind: 'cloudbank', pos: [16, -2, -186], size: 4.5 },
      { kind: 'cloudbank', pos: [0, 2, -214], size: 7, n: 7 },
    ]),

    // =============================================================== Kulisse: kleine schwebende Inseln mit Bäumen
    ...lawn(-24, -18, -6, -12, -1, 2, { under: 3 }),
    ...lawn(19, 25, -54, -61, 2, 2, { under: 3 }),
    ...lawn(-27, -20, -96, -103, 4, 2, { under: 3 }),
    ...lawn(21, 27, -146, -152, 3, 2, { under: 3 }),
    deco([
      { kind: 'tree', pos: [-21, -1, -9], size: 4.4 }, { kind: 'bush', pos: [-19, -1, -7], size: 0.6 },
      { kind: 'tree', pos: [22, 2, -57.6], size: 3.8, color: 'green' },
      { kind: 'tree', pos: [-23.4, 4, -99.4], size: 5 }, { kind: 'bush', pos: [-21, 4, -101.8], size: 0.7 },
      { kind: 'tree', pos: [24, 3, -149], size: 4.2 },
    ]),
    decoW1([
      { kind: 'daisies', pos: [-21, -1, -9], size: [5, 5], n: 12 },
      { kind: 'cloudbank', pos: [-21, -4.6, -9], size: 2.6, n: 5 },
      { kind: 'cloudbank', pos: [22, -1.6, -57.6], size: 2.4, n: 5 },
      { kind: 'cloudbank', pos: [-23.4, 0.4, -99.4], size: 2.8, n: 5 },
      { kind: 'cloudbank', pos: [24, -0.6, -149], size: 2.4, n: 5 },
    ]),

    // =============================================================== Stempel-Raum (abseits, x ≈ 90)
    { type: 'room', pos: [90, 1, -111], size: [14, 4.5, 12], top: 'grass', style: 'wood' },
    { type: 'pipe', id: 'p_room', pos: [85, 1, -107], height: 1.2 },
    { type: 'pipe', id: 'p_room_out', pos: [95.5, 1, -107], height: 1.2, target: 'p_back' },
    { type: 'platform', pos: [87.5, 1, -113.5], size: [2, 1.2, 2], color: 'red' },
    { type: 'platform', pos: [90.5, 1, -115], size: [2, 2.4, 2], color: 'yellow' },
    { type: 'platform', pos: [93.6, 1, -113.6], size: [2, 3.6, 2], color: 'blue' },
    deco([
      { kind: 'bush', pos: [84, 1, -116], size: 0.6 }, { kind: 'bush', pos: [96, 1, -116], size: 0.6 },
    ]),
    decoW1([
      { kind: 'bunting', from: [83.6, 5, -116.6], to: [96.4, 5, -116.6], sag: 0.8 },
      { kind: 'mushrooms', pos: [84, 1, -111], size: 0.8, color: 'red' },
      { kind: 'bellflowers', pos: [96, 1, -111], size: [1, 3], n: 6 },
      { kind: 'daisies', pos: [90, 1, -108], size: [10, 3], n: 18 },
    ]),
  ],
  blocks: [
    // 1: ?-Block mit Krallen-Anzug zwischen Ziegeln über der Terrasse; versteckter Münzblock rechts unten
    { kind: 'brick', pos: [-5, 5.8, -11.6] },
    { kind: 'question', pos: [-4, 5.8, -11.6], content: 'krallenAnzug' },
    { kind: 'brick', pos: [-3, 5.8, -11.6], content: 'coins:3' },
    { kind: 'hidden', pos: [5.4, 3.4, -10.4], content: 'coins:5' },
    // 2: Wachstumsbeere
    { kind: 'brick', pos: [-2, 6.4, -38.5] },
    { kind: 'question', pos: [-1, 6.4, -38.5], content: 'wachstumsbeere' },
    { kind: 'brick', pos: [0, 6.4, -38.5], content: 'coins:4' },
    // 3: Münzblock vor der Wand
    { kind: 'coinblock', pos: [4, 6.4, -63], count: 8 },
    // 5: Steinblöcke (nur Riesentrank) als Buckel über der Stern-Nische direkt hinter der Brücke
    { kind: 'blockwand', pos: [7.5, 7, -159], size: [2, 1, 2] },
    // 5: Ziegelreihe über dem Weg
    ...[-3, -2, -1, 0, 1, 2, 3].map((x) => (x === 0
      ? { kind: 'question', pos: [x, 9.4, -140], content: 'wachstumsbeere' }
      : { kind: 'brick', pos: [x, 9.4, -140], content: x === -2 ? 'coins:6' : undefined })),
  ],
  enemies: [
    { kind: 'pilzling', pos: [-6, 4, -16], path: [[-8, 4, -16], [0.5, 4, -16]] },
    { kind: 'pilzling', pos: [2, 4, -35], path: [[-3.5, 4, -35], [3.5, 4, -35]] },
    { kind: 'pilzling', pos: [-2, 4, -52], path: [[-6, 4, -52], [3.5, 4, -52]] },
    { kind: 'pilzling', pos: [-5, 4, -71.5], path: [[-8, 4, -71.5], [1, 4, -71.5]] },
    { kind: 'pilzling', pos: [3, 4, -66], path: [[-6, 4, -66], [6, 4, -66]] },
    { kind: 'krallen_pilzling', pos: [-4, 10, -85], path: [[-8, 10, -85], [1, 10, -85]] },
    { kind: 'pilzling', pos: [-4, 7, -105], path: [[-8, 7, -105], [1, 7, -105]] },
    { kind: 'krallen_pilzling', pos: [0, 7, -132], path: [[-2.5, 7, -132], [2.5, 7, -132]] },
    { kind: 'pilzling', pos: [3, 7, -143], path: [[-4, 7, -143], [7, 7, -143]] },
    { kind: 'schnappblume', pos: [7.4, 7, -138.4] },
    { kind: 'krallen_pilzling', pos: [2, 7, -165], path: [[-4, 7, -165], [5, 7, -165]] },
  ],
  items: [
    // 1
    line([0.5, 1.2, 3], [-2.4, 1.2, -3.2], 3),
    ...arc([-3, 1.2, -4.4], [-3, 4.2, -10], 3, 1.5),
    line([-4, 4.4, -23.5], [-4, 4.4, -28.5], 3),
    line([4.6, 1.2, -11.6], [6.5, 1.2, -13.6], 2),
    // 2
    ring([8.5, 9.8, -46.5], 1.3, 6),
    line([-6.3, 5.3, -38.5], [-6.3, 5.3, -42], 3),
    ...arc([-1, 4.2, -54.5], [-1, 4.2, -61.5], 4, 2.2),
    // 3
    ...column(-3.5, -75.6, 5, 9.2, 4),
    { kind: 'coin', pos: [6.5, 6.3, -71.2] }, { kind: 'coin', pos: [6.5, 8.3, -79] }, { kind: 'coin', pos: [6.5, 10.3, -85] },
    line([-7, 10.3, -82], [-1, 10.3, -82], 3),
    // 4
    ...arc([-3.5, 10.2, -92.4], [-3.5, 7.2, -97], 3, 0.6),
    ring([8, 12.3, -98.5], 1.6, 6),
    line([-6, 7.3, -110], [-1, 7.3, -110], 3),
    ...arc([2.4, 7.2, -114.5], [7.8, 7.1, -114.8], 3, 1.4),
    // 5
    line([0, 7.3, -126.5], [0, 7.3, -129.5], 2),
    line([0, 7.6, -148], [0, 7.6, -155], 4),
    line([11, 0.7, -144], [11, 0.7, -152], 4),
    line([10, 0.7, -154.5], [9.4, 0.7, -158], 3),
    line([-3, 7.3, -167.5], [3, 7.3, -167.5], 3),
    // 6
    ...arc([0, 10.3, -187.2], [0, 9.2, -192], 3, 1.8),
    // Stempel-Raum
    ...arc([86.4, 1.2, -110.4], [87.5, 2.4, -113.5], 2, 1),
    ...arc([87.5, 2.4, -113.5], [90.5, 3.6, -115], 3, 1.2),
    ...arc([90.5, 3.6, -115], [93.6, 4.8, -113.6], 3, 1.2),
    ...column(84.2, -114.6, 1.2, 3.6, 3), ...column(96, -114.6, 1.2, 3.6, 3),
    // Gimmicks (Sonder-Bausteine): Krallen-Anzug im Baum, Hasen, Holzkisten
    { kind: 'itemtree', pos: [-10, 7, -114], size: 6.6, color: 'autumn', content: 'krallenAnzug' },
    { kind: 'bunny', size: 'big', pos: [8, 12, -98.5], area: { pos: [8, 12, -98.5], r: 2.1 } },
    { kind: 'bunny', pos: [4.6, 7, -108.4], star: 2, area: { min: [-2, -123], max: [13.6, -106] } },
    { kind: 'crate', pos: [-2.2, 7, -127.8], content: 'coins:3' },
    { kind: 'crate', pos: [2.2, 7, -129.4], content: 'coin' },
    { kind: 'crate', pos: [-1.4, 7, -134.6], content: 'coins:3' },
    { kind: 'powerup', pos: [12.2, 0.55, -155], power: 'oneup' },
  ],
  checkpoint: [-3.5, 7, -98],
  stars: [
    [8.5, 9.6, -46.5],        // 0: Sims der oberen Route (Abzweig der Glasröhre)
    [7.4, 4.95, -159],        // 1: Nische unter den Steinblöcken hinter der Brücke
    //                           2: kleiner Hase am Teich (bunny star: 2)
  ],
  stamp: [93.6, 4.7, -113.6],
  goal: { pos: [0, 7, -193], height: 9 },
  marks: {
    start: [0, 1, 5],
    s2: [-4, 4, -31],
    s3: [-1, 4, -60.5],
    wall: [-3.5, 4, -74.8],
    s4: [-3.5, 7, -99],
    s5: [0, 7, -125],
    s6: [0, 7, -172],
    goal: [0, 7, -188],
    pipeIn: [6.5, 1, -8],
    ledge: [8.5, 9.5, -43],
    pond: [9.2, 8.2, -115.4],
    room: [85, 2.2, -107],
    hilltop: [8, 12, -98.5],
    tree: [-10, 7, -111.6],
    lowPass: [11, 0.5, -146],
    niche: [9.6, 0.5, -159],
  },
};
