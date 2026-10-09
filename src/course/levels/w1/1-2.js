// 1-2 „Laternengrotte“ – Höhlen-Parcours (Bauplan: Detail 1-2). Laternen anfassen macht versteckte Münzen sichtbar,
// die Funkenblüte wird eingeführt, eine geheime Röhre (nur mit Krallen erreichbar) führt zum Welt-Warp.
// Level verläuft nach −Z.
//
// Abschnitte (Länge entlang z):
//   1  Start-Hügel        z   8 … −10  (18 × 16 m, oben bei y 13) Panzerkröte, ?-Block mit Funkenblüte, erste Laterne,
//                                       Warp-Röhre hinab in die Höhle.
//   2  Höhleneingang      z −26 … −56  (30 m) Panzerkröten, Pilzlinge; Glasröhre hinauf zur Panzerkröte mit ?-Block –
//                                       die Plattform ist das Dach eines versteckten Raums (Kristallblöcke: Stampfen).
//   3  Röhrenfeld         z −60 … −86  (26 m) acht Röhren, Mini-Pilzlinge, verstecktes Extraleben über der höchsten.
//   4  Wolkenaufstieg     z −86 … −117 (31 m, 12 m hoch) Wolken mit 2–3 m Lücken, Stern 0 zwischen den Wolken;
//                                       oben die Gerade mit der Glasröhre hinab.
//   5  Dreitor-Raum       z −126 … −146 (20 × 20 m) drei Tore: links Goldröhre (Raum mit drei Goldpanzer-Kröten),
//                                       Mitte weiter, rechts Pilzling; drei violette Blöcke hoch zur Rätselbox (Stern 1).
//   6  Gang, Pilzlingsarena und Ziel  z −148 … −160 (Gang) + Arena/Ziel abseits bei x ≈ 50 (z −140 … −194):
//                                       im Gang die unsichtbare Blockkette (Stempel) und die Kletterwand zur
//                                       Welt-Warp-Röhre; Röhre in die Arena mit Pilzlingsturm (Stern 2); Röhre zum Ziel.
//   Abseits: Goldröhren-Raum (x ≈ −60), Rätselbox-Raum (x ≈ 100), Welt-2-Raum „bald“ (x ≈ 100, z ≈ −40),
//            Stempel-Gehege (x ≈ −18) hinter der Glasröhre in der linken Gangwand.
// Sterne (Index): 0 zwischen den Wolken, 1 Rätselbox (zwei Panzerkröten besiegen), 2 im Pilzlingsturm.

import { isl, line, ring, arc, column, deco, decoW1 } from './_helpers.js';

const CAM = { pitch: 44, dist: 13, fov: 40, area: [-35, 35] };
const ROCK = 0x5a4458, ROCK2 = 0x4c3f5e;
/** Felswand (zerklüftet, fest) über ihre Grundfläche. */
const rock = (x0, x1, zA, zB, y0, y1, o = {}) => ({
  kind: 'rockwall', pos: [(x0 + x1) / 2, y0, (zA + zB) / 2], size: [x1 - x0, y1 - y0, Math.abs(zA - zB)], color: o.color ?? ROCK, ...o,
});
/** Versteckte Münzen (erscheinen im Licht einer Laterne). */
const hidden = (spec) => (Array.isArray(spec) ? spec.map((c) => ({ ...c, hiddenUntilLit: true })) : { ...spec, hiddenUntilLit: true });

export const LEVEL = {
  id: '1-2',
  world: 1,
  title: 'Laternengrotte',
  archetype: 'parcours',
  theme: 'cave',
  music: 'course_cave',
  timeLimit: 500,
  start: { pos: [0, 13, 5], yaw: Math.PI / 2 },
  killY: -12,
  camera: [
    { ...CAM, from: 12, to: -14, pitch: 42 },
    { ...CAM, from: -20, to: -58 },
    { ...CAM, from: -58, to: -86, pitch: 46 },
    { ...CAM, from: -86, to: -110, pitch: 36, dist: 14.5 },
    { ...CAM, from: -110, to: -124, pitch: 42 },
    { ...CAM, from: -124, to: -147, pitch: 46, dist: 13.5 },
    { ...CAM, from: -147, to: -166, pitch: 50, dist: 12.5 },
    // Pilzlingsarena und Ziel (abseits, x ≈ 50)
    { from: -136, to: -200, pitch: 45, dist: 13, fov: 40, area: [36, 66] },
    // Goldröhren-Raum, Rätselbox-Raum, Welt-2-Raum (abseits)
    { from: -120, to: -146, pitch: 50, dist: 12, fov: 40, x: -60, xLock: 0.6, area: [-80, -42] },
    { from: -116, to: -144, pitch: 50, dist: 12, fov: 40, x: 100, xLock: 0.6, area: [84, 120] },
    { from: -24, to: -54, pitch: 48, dist: 12, fov: 40, x: 100, xLock: 0.6, area: [84, 120] },
  ],
  segments: [
    // =============================================================== 1  Start-Hügel (oben, y 13)
    isl(-8, 8, 8, -10, 13, 4, { under: 4 }),
    { type: 'mound', pos: [-1, 13, -2.5], radius: 4, height: 1.1 },
    { type: 'pipe', id: 'p_down', pos: [4.2, 13, -6.6], height: 1.6, target: 'p_cave' },
    deco([
      { kind: 'lantern', pos: [6.6, 13, 3] },
      { kind: 'rock', pos: [-6.6, 13, -2], size: 0.7 }, { kind: 'rock', pos: [6.8, 13, -3.6], size: 0.5 },
    ]),
    decoW1([
      rock(-10, 10, -10, -12.5, 13, 21, { top: true }),
      rock(-10.5, -8, 8, -10, 13, 18.5, { color: ROCK2 }),
      rock(8, 10.5, 8, -10, 13, 17.5, { color: ROCK2 }),
      { kind: 'stalactites', pos: [0, 20.6, -10], size: [18, 1], n: 9, len: [1, 3.2] },
      { kind: 'stalactites', pos: [-8.4, 18.2, -1], size: [0.8, 14], n: 5, len: [0.8, 2.2] },
      { kind: 'stalactites', pos: [8.4, 17.2, -1], size: [0.8, 14], n: 5, len: [0.8, 2.2] },
      { kind: 'stalagmites', pos: [-6.8, 13, 5.4], size: [1.6, 2], n: 4, len: [0.5, 1.6] },
      { kind: 'stalagmites', pos: [6.6, 13, -8.4], size: [2, 1], n: 3, len: [0.6, 1.8] },
      { kind: 'crystals', pos: [-7.2, 13, -8.2], size: 1.1, color: 'violet' },
      { kind: 'crystals', pos: [7.1, 13, 6.2], size: 0.8, color: 'cyan' },
      { kind: 'mushrooms', pos: [-6.4, 13, 1.6], size: 0.9, color: 'cyan', glow: true },
      { kind: 'mushrooms', pos: [5.6, 13, -0.8], size: 0.7, color: 'violet', glow: true },
      { kind: 'sign', pos: [2.4, 13, -5.4], arrow: 'down' },
      { kind: 'tufts', pos: [0, 13, 1], size: [12, 10], n: 10 },
      { kind: 'fireflies', pos: [-2, 13, -1], size: [12, 3, 12], n: 12 },
    ]),

    // =============================================================== 2  Höhleneingang (y 1)
    isl(-8, 8, -26, -56, 1, 3, { under: 2 }),
    { type: 'pipe', id: 'p_cave', pos: [0, 1, -29], height: 1.4 },
    { type: 'glasspipe', id: 'g_room', radius: 1, oneWay: true, coins: 3,
      path: [[3.2, 2.05, -32.6], [3.2, 2.05, -36.4], [3.2, 6.7, -41], [3.2, 6.65, -43.6]] },
    { type: 'room', pos: [3.2, 1, -47.8], size: [6, 3.6, 6], top: 'stone', style: 'stone',
      hatch: { at: [0, 0], size: [2, 2] }, door: { side: '-x', w: 2, h: 2.4 } },
    deco([
      { kind: 'lantern', pos: [7, 1, -38] }, { kind: 'lantern', pos: [-7, 1, -50] },
      { kind: 'rock', pos: [-7, 1, -27.5], size: 0.6 }, { kind: 'rock', pos: [7.2, 1, -55], size: 0.7 },
    ]),
    decoW1([
      rock(-10.5, -8, -24, -56, 1, 10),
      rock(8, 10.5, -24, -56, 1, 9.5, { color: ROCK2 }),
      { kind: 'stalactites', pos: [-8.3, 9.6, -40], size: [0.8, 30], n: 10, len: [1, 2.8] },
      { kind: 'stalactites', pos: [8.3, 9.1, -40], size: [0.8, 30], n: 10, len: [1, 2.8] },
      { kind: 'stalagmites', pos: [-7, 1, -44], size: [1.4, 6], n: 5, len: [0.6, 1.8] },
      { kind: 'stalagmites', pos: [7.2, 1, -30], size: [1.2, 4], n: 3, len: [0.5, 1.5] },
      { kind: 'crystals', pos: [-7.3, 1, -36.5], size: 1, color: 'cyan' },
      { kind: 'crystals', pos: [7.3, 1, -52], size: 1.2, color: 'violet' },
      { kind: 'crystals', pos: [-7.4, 4.5, -54], size: 0.7, color: 'pink' },
      { kind: 'mushrooms', pos: [-6.6, 1, -28.6], size: 0.9, color: 'cyan', glow: true },
      { kind: 'mushrooms', pos: [6.8, 1, -46], size: 0.7, color: 'violet', glow: true },
      { kind: 'mushrooms', pos: [-1, 1, -54.6], size: 0.6, color: 'gold', glow: true },
      { kind: 'tufts', pos: [-2, 1, -40], size: [10, 26], n: 10 },
      { kind: 'pebbles', from: [-0.6, 1, -31.4], to: [-2.6, 1, -42], n: 8, size: 0.45 },
      { kind: 'fireflies', pos: [0, 1, -42], size: [14, 4, 26], n: 14 },
      { kind: 'pebbles', from: [-2.6, 1, -43.4], to: [-0.4, 1, -55.4], n: 8, size: 0.45 },
    ]),
    // Holzsteg über die Spalte
    { type: 'bridge', from: [0, 1, -56], to: [0, 1, -60], width: 3 },

    // =============================================================== 3  Röhrenfeld
    isl(-9, 9, -60, -86, 1, 3, { under: 2 }),
    { type: 'pipe', pos: [-5.5, 1, -63.5], height: 1.8 },
    { type: 'pipe', pos: [-2, 1, -67.2], height: 3.0 },
    { type: 'pipe', pos: [3.6, 1, -64.4], height: 1.4 },
    { type: 'pipe', pos: [6, 1, -71], height: 2.6, color: 0x3d8bff },
    { type: 'pipe', pos: [-5.2, 1, -75], height: 4.2 },
    { type: 'pipe', pos: [1.6, 1, -77.4], height: 2.2, color: 0xff4a3d },
    { type: 'pipe', pos: [-7, 1, -81.4], height: 1.4 },
    { type: 'pipe', pos: [5.2, 1, -81.8], height: 3.4 },
    deco([
      { kind: 'lantern', pos: [-7.8, 1, -69] }, { kind: 'lantern', pos: [8, 1, -78] },
      { kind: 'rock', pos: [8, 1, -62], size: 0.6 },
    ]),
    decoW1([
      rock(-11.5, -9, -58, -86, 1, 9),
      rock(9, 11.5, -58, -86, 1, 9.5, { color: ROCK2 }),
      { kind: 'stalactites', pos: [-9.3, 8.6, -72], size: [0.8, 26], n: 9, len: [1, 2.6] },
      { kind: 'stalactites', pos: [9.3, 9.1, -72], size: [0.8, 26], n: 9, len: [1, 2.6] },
      { kind: 'stalagmites', pos: [7.6, 1, -66], size: [1.2, 3], n: 3, len: [0.6, 1.6] },
      { kind: 'stalagmites', pos: [-8, 1, -76], size: [1, 4], n: 3, len: [0.6, 1.6] },
      { kind: 'crystals', pos: [8, 1, -84.4], size: 1.1, color: 'cyan' },
      { kind: 'crystals', pos: [-8, 1, -61.6], size: 0.8, color: 'pink' },
      { kind: 'mushrooms', pos: [-3.4, 1, -84.6], size: 0.8, color: 'violet', glow: true },
      { kind: 'mushrooms', pos: [7.6, 1, -74], size: 0.6, color: 'cyan', glow: true },
      { kind: 'tufts', pos: [0, 1, -72], size: [14, 22], n: 10 },
      { kind: 'pebbles', from: [0, 1, -60.6], to: [0.8, 1, -65.6], n: 4, size: 0.45 },
      { kind: 'fireflies', pos: [0, 2, -72], size: [16, 4, 24], n: 12 },
      { kind: 'pebbles', from: [0, 1, -67.4], to: [-1.4, 1, -84.6], n: 10, size: 0.45 },
    ]),

    // =============================================================== 4  Wolkenaufstieg
    isl(-9, 9, -86, -112, 1, 3, { under: 2 }),
    { type: 'cloud', pos: [-3.5, 2.6, -89.5], size: [3, 0.6, 3] },
    { type: 'cloud', pos: [1.5, 4.6, -93.6], size: [3, 0.6, 3] },
    { type: 'cloud', pos: [5.6, 6.6, -98], size: [3, 0.6, 3], path: [[5.6, 6.6, -98], [3, 6.6, -98]], speed: 1.2 },
    { type: 'cloud', pos: [7.4, 8.2, -103], size: [2.2, 0.5, 2.2] },
    { type: 'cloud', pos: [1.5, 8.6, -102.4], size: [3, 0.6, 3] },
    { type: 'cloud', pos: [-3, 10.6, -106.4], size: [3, 0.6, 3] },
    // Felsrücken unter der oberen Geraden (trennt Aufstieg und Dreitor-Raum)
    isl(-6, 6, -109.6, -117, 13, 1.8, { top: 'stone', under: 2 }),
    { type: 'glasspipe', id: 'g_down', radius: 1, oneWay: true, coins: 4,
      path: [[0, 14.05, -115], [0, 14.05, -118.6], [0, 8.4, -123.4], [0, 2.05, -127.6], [0, 2.05, -131]] },
    deco([
      { kind: 'lantern', pos: [-5, 13, -110.4] },
    ]),
    decoW1([
      rock(-11.5, -9, -86, -118, 1, 18),
      rock(9, 11.5, -86, -118, 1, 18, { color: ROCK2 }),
      rock(-9, 9, -110, -112.5, 1, 11.2),
      { kind: 'stalactites', pos: [-9.3, 17.6, -100], size: [0.8, 30], n: 10, len: [1.2, 3.6] },
      { kind: 'stalactites', pos: [9.3, 17.6, -100], size: [0.8, 30], n: 10, len: [1.2, 3.6] },
      { kind: 'crystals', pos: [-8, 1, -96], size: 1.4, color: 'violet' },
      { kind: 'crystals', pos: [8, 1, -91], size: 1, color: 'cyan' },
      { kind: 'crystals', pos: [-9, 9, -102], size: 0.9, color: 'pink' },
      { kind: 'crystals', pos: [9, 12, -94], size: 0.9, color: 'cyan' },
      { kind: 'mushrooms', pos: [-6, 1, -88], size: 1, color: 'cyan', glow: true },
      { kind: 'mushrooms', pos: [4, 1, -108], size: 0.8, color: 'gold', glow: true },
      { kind: 'stalagmites', pos: [0, 1, -100], size: [12, 14], n: 7, len: [0.6, 2.2] },
      { kind: 'sign', pos: [4.2, 13, -111], arrow: 'up' },
      { kind: 'fireflies', pos: [0, 3, -98], size: [16, 10, 22], n: 16, colors: [0x9ff2ff, 0xd8ff7a, 0xfff27a] },
    ]),

    // =============================================================== 5  Dreitor-Raum
    isl(-10, 10, -126, -146, 1, 3, { under: 2 }),
    // drei violette Blöcke hoch zur Rätselbox
    { type: 'platform', pos: [7.2, 1, -130.4], size: [1.8, 1.4, 1.8], color: 'purple' },
    { type: 'platform', pos: [7.2, 1, -133.4], size: [1.8, 2.8, 1.8], color: 'purple' },
    { type: 'platform', pos: [7.2, 1, -136.4], size: [1.8, 4.2, 1.8], color: 'purple' },
    isl(6.6, 10, -137.6, -142.6, 5.2, 4.2, { top: 'stone', under: 0 }),
    // Tor-Nischen hinter der Rückwand: links Goldröhre, rechts Pilzling
    isl(-9.5, -4.6, -146, -152, 1, 3, { under: 2 }),
    isl(4.6, 9.5, -146, -152, 1, 3, { under: 2 }),
    { type: 'pipe', id: 'p_gold', pos: [-7, 1, -149.8], height: 1.4, color: 0xffc21a, target: 'p_gold_in' },
    { type: 'pipe', id: 'p_gold_back', pos: [-8.4, 1, -128], height: 1.0, color: 0xffc21a },
    deco([
      { kind: 'lantern', pos: [-8.8, 1, -145.2] }, { kind: 'lantern', pos: [-2.4, 1, -145.2] },
      { kind: 'lantern', pos: [2.4, 1, -145.2] }, { kind: 'lantern', pos: [8.8, 1, -145.2] },
    ]),
    decoW1([
      rock(-12.5, -10, -124, -146, 1, 9),
      rock(10, 12.5, -124, -146, 1, 9, { color: ROCK2 }),
      // Rückwand mit drei Toren (Öffnungen x −7,6…−4,4 | −1,6…1,6 | 4,4…7,6), niedrig genug für die Kamera
      rock(-10, -7.6, -146, -147.6, 1, 5.6), rock(-4.4, -1.6, -146, -147.6, 1, 5.6),
      rock(1.6, 4.4, -146, -147.6, 1, 5.6), rock(7.6, 10, -146, -147.6, 1, 5.6),
      rock(-11, -9.5, -147.6, -153.4, 1, 6), rock(-9.5, -4.6, -152, -153.4, 1, 6),
      rock(9.5, 11, -147.6, -153.4, 1, 6, { color: ROCK2 }), rock(4.6, 9.5, -152, -153.4, 1, 6, { color: ROCK2 }),
      { kind: 'stalactites', pos: [-10.3, 8.6, -135], size: [0.8, 20], n: 7, len: [1, 2.6] },
      { kind: 'stalactites', pos: [10.3, 8.6, -135], size: [0.8, 20], n: 7, len: [1, 2.6] },
      { kind: 'crystals', pos: [-6, 5.6, -146.8], size: 0.8, color: 'gold' },
      { kind: 'crystals', pos: [6, 5.6, -146.8], size: 0.8, color: 'violet' },
      { kind: 'crystals', pos: [-8.6, 1, -132], size: 1.1, color: 'gold' },
      { kind: 'mushrooms', pos: [-5, 1, -129], size: 0.8, color: 'violet', glow: true },
      { kind: 'mushrooms', pos: [9.2, 5.2, -142], size: 0.6, color: 'pink', glow: true },
      { kind: 'mushrooms', pos: [8.6, 1, -151], size: 0.6, color: 'cyan', glow: true },
      { kind: 'stalagmites', pos: [3, 1, -127.6], size: [3, 1.4], n: 3, len: [0.5, 1.4] },
      { kind: 'tufts', pos: [-2, 1, -136], size: [14, 16], n: 10 },
      { kind: 'pebbles', from: [0, 1, -132.4], to: [0, 1, -146.6], n: 9, size: 0.5 },
      { kind: 'fireflies', pos: [0, 1, -136], size: [18, 5, 18], n: 12 },
    ]),

    // =============================================================== 6  Gang mit Blockkette und Welt-Warp, Röhre in die Arena
    isl(-3.5, 3.5, -146, -160, 1, 3, { under: 2 }),
    { type: 'hiddenchain', id: 'chain', lead: { pos: [-2, 1, -150.4], size: [3, 1, 1] },
      blocks: [[-2.9, 2.4, -152.2], [-2.9, 4.4, -153.8], [-2.9, 6.4, -155.4]] },
    isl(-6.5, -3.5, -153, -157, 8, 7, { top: 'stone', under: 0 }),
    { type: 'glasspipe', id: 'g_stamp', radius: 1, oneWay: true, coins: 3,
      path: [[-4.4, 9.05, -155], [-9, 9.05, -155], [-13.4, 9.05, -155]] },
    // rechts: Kletterwand (Krallen) zum Sims mit der Welt-Warp-Röhre
    { type: 'wall', pos: [3.7, 1, -155], size: [0.4, 6, 3.2], climbable: true },
    isl(3.9, 8.5, -153.4, -156.6, 7, 6, { top: 'stone', under: 0 }),
    { type: 'pipe', id: 'p_world2', pos: [6.4, 7, -155], height: 1.2, color: 0xa865ff, target: 'p_w2_in' },
    { type: 'pipe', id: 'p_corr', pos: [2.4, 1, -149], height: 0.9 },
    { type: 'pipe', id: 'p_arena', pos: [0, 1, -158.4], height: 1.4, target: 'p_arena_in' },
    deco([{ kind: 'lantern', pos: [-2.8, 1, -159.2] }]),
    decoW1([
      rock(-4.6, -3.5, -147.6, -153, 1, 10), rock(-9.5, -6.5, -153.4, -157, 1, 8), rock(-9, -3.5, -157, -161, 1, 10),
      rock(3.5, 4.6, -147.6, -153.4, 1, 10, { color: ROCK2 }), rock(3.5, 9, -156.6, -161, 1, 10, { color: ROCK2 }),
      rock(8.5, 10, -153.4, -156.6, 1, 9, { color: ROCK2 }),
      rock(-3.5, 3.5, -160, -162, 1, 10),
      { kind: 'stalactites', pos: [-3.8, 9.6, -158.6], size: [0.6, 4], n: 3, len: [0.8, 2] },
      { kind: 'stalactites', pos: [3.8, 9.6, -150], size: [0.6, 4], n: 3, len: [0.8, 2] },
      { kind: 'crystals', pos: [7.8, 7, -154], size: 0.6, color: 'violet' },
      { kind: 'mushrooms', pos: [2.6, 1, -159.2], size: 0.6, color: 'cyan', glow: true },
      { kind: 'sign', pos: [-1.8, 1, -157.6], arrow: 'down' },
    ]),
    // Stempel-Gehege (hinter der Glasröhre in der linken Gangwand)
    isl(-23, -13.4, -150, -160, 8, 2.5, { under: 3 }),
    { type: 'platform', style: 'stone', pos: [-19, 8, -155], size: [1.8, 0.8, 1.8] },
    { type: 'pipe', id: 'p_stamp_out', pos: [-15, 8, -158.6], height: 1.0, target: 'p_corr' },
    decoW1([
      rock(-24.5, -23, -149, -161, 8, 11.5), rock(-23, -13.4, -160, -161.5, 8, 11),
      rock(-23, -13.4, -148.6, -150, 8, 9, { camIgnore: true }),
      { kind: 'crystals', pos: [-22.4, 8, -151], size: 1, color: 'gold' },
      { kind: 'crystals', pos: [-22.4, 8, -159], size: 0.8, color: 'pink' },
      { kind: 'mushrooms', pos: [-15, 8, -151.4], size: 0.7, color: 'gold', glow: true },
    ]),

    // =============================================================== Pilzlingsarena (abseits, x ≈ 50)
    isl(40, 60, -140, -162, 1, 3, { under: 3 }),
    { type: 'pipe', id: 'p_arena_in', pos: [50, 1, -142.6], height: 1.4 },
    { type: 'pipe', id: 'p_goalpipe', pos: [57.4, 1, -159.6], height: 1.6, target: 'p_goal' },
    deco([{ kind: 'lantern', pos: [41, 1, -141] }, { kind: 'lantern', pos: [59, 1, -141] }, { kind: 'lantern', pos: [41, 1, -161] }]),
    decoW1([
      rock(37.5, 40, -138, -164, 1, 8), rock(60, 62.5, -138, -164, 1, 8, { color: ROCK2 }), rock(40, 60, -162, -164, 1, 7),
      rock(40, 60, -139.2, -140, 1, 1.6, { camIgnore: true }),
      { kind: 'stalactites', pos: [39.7, 7.6, -151], size: [0.8, 20], n: 7, len: [1, 2.4] },
      { kind: 'stalactites', pos: [60.3, 7.6, -151], size: [0.8, 20], n: 7, len: [1, 2.4] },
      { kind: 'crystals', pos: [41, 1, -152], size: 1.1, color: 'violet' },
      { kind: 'crystals', pos: [59, 1, -150], size: 1, color: 'cyan' },
      { kind: 'mushrooms', pos: [44, 1, -160.6], size: 0.9, color: 'gold', glow: true },
      { kind: 'stalagmites', pos: [50, 1, -161.4], size: [16, 0.8], n: 6, len: [0.5, 1.5] },
    ]),

    // =============================================================== Ziel (abseits, x ≈ 50)
    isl(40, 60, -168, -194, 1, 3, { under: 3 }),
    { type: 'pipe', id: 'p_goal', pos: [50, 1, -171], height: 1.4 },
    { type: 'stairs', pos: [50, 1, -177.4], dir: '-z', steps: 3, rise: 1, run: 1.2, width: 4 },
    deco([
      { kind: 'lantern', pos: [44, 1, -173] }, { kind: 'lantern', pos: [56, 1, -173] },
      { kind: 'lantern', pos: [46, 1, -189] }, { kind: 'lantern', pos: [54.5, 1, -190] },
    ]),
    decoW1([
      rock(37.5, 40, -166, -196, 1, 10), rock(60, 62.5, -166, -196, 1, 10, { color: ROCK2 }), rock(40, 60, -194, -196.5, 1, 12),
      { kind: 'stalactites', pos: [50, 11.6, -194.4], size: [18, 1], n: 9, len: [1, 3.4] },
      { kind: 'crystals', pos: [42, 1, -192], size: 1.6, color: 'cyan' },
      { kind: 'crystals', pos: [58, 1, -191.5], size: 1.4, color: 'violet' },
      { kind: 'crystals', pos: [41.6, 1, -180], size: 1, color: 'gold' },
      { kind: 'crystals', pos: [58.4, 1, -181], size: 1, color: 'pink' },
      { kind: 'mushrooms', pos: [43, 1, -185], size: 1, color: 'cyan', glow: true },
      { kind: 'mushrooms', pos: [57, 1, -186], size: 0.9, color: 'violet', glow: true },
      { kind: 'bunting', from: [44.4, 4.2, -183], to: [55.6, 4.2, -183], sag: 0.6 },
      { kind: 'tufts', pos: [50, 1, -186], size: [16, 14], n: 10 },
      { kind: 'fireflies', pos: [50, 1, -182], size: [18, 6, 22], n: 18, colors: [0xfff27a, 0xffd25a, 0x9ff2ff] },
    ]),
    deco([{ kind: 'post', pos: [44.4, 1, -183], size: 3.2 }, { kind: 'post', pos: [55.6, 1, -183], size: 3.2 }]),

    // =============================================================== Goldröhren-Raum (abseits, x ≈ −60)
    isl(-70, -50, -126, -142, 1, 3, { under: 3 }),
    { type: 'pipe', id: 'p_gold_in', pos: [-60, 1, -128.6], height: 1.2, color: 0xffc21a },
    { type: 'pipe', id: 'p_gold_out', pos: [-52.6, 1, -139.6], height: 1.2, color: 0xffc21a, target: 'p_gold_back' },
    deco([{ kind: 'lantern', pos: [-69, 1, -127] }, { kind: 'lantern', pos: [-51, 1, -127] }]),
    decoW1([
      rock(-72.5, -70, -124, -144, 1, 7), rock(-50, -47.5, -124, -144, 1, 7), rock(-70, -50, -142, -144, 1, 7),
      { kind: 'crystals', pos: [-69, 1, -141], size: 1.2, color: 'gold' },
      { kind: 'crystals', pos: [-51, 1, -134], size: 1, color: 'gold' },
      { kind: 'mushrooms', pos: [-68.6, 1, -133], size: 0.8, color: 'gold', glow: true },
    ]),

    // =============================================================== Rätselbox-Raum (abseits, x ≈ 100)
    isl(92, 108, -122, -140, 1, 3, { under: 3 }),
    deco([{ kind: 'lantern', pos: [93, 1, -123] }, { kind: 'lantern', pos: [107, 1, -123] }, { kind: 'lantern', pos: [100, 1, -139] }]),
    decoW1([
      rock(89.5, 92, -120, -142, 1, 6), rock(108, 110.5, -120, -142, 1, 6), rock(92, 108, -140, -142, 1, 6),
      { kind: 'crystals', pos: [93, 1, -139], size: 1, color: 'violet' },
      { kind: 'crystals', pos: [107, 1, -139], size: 1, color: 'violet' },
    ]),

    // =============================================================== Welt-2-Raum „bald“ (abseits, x ≈ 100, z ≈ −40)
    isl(92, 108, -28, -50, 1, 3, { under: 3 }),
    { type: 'pipe', id: 'p_w2_in', pos: [100, 1, -31], height: 1.2, color: 0xa865ff },
    { type: 'pipe', id: 'p_w2_out', pos: [105, 1, -47], height: 1.2, target: 'p_corr' },
    { type: 'sign', pos: [96, 1, -46.6], text: 'Welt 2\nbald!' },
    deco([{ kind: 'lantern', pos: [93, 1, -29] }, { kind: 'lantern', pos: [107, 1, -29] }]),
    decoW1([
      rock(89.5, 92, -26, -52, 1, 6), rock(108, 110.5, -26, -52, 1, 6), rock(92, 108, -50, -52, 1, 6),
      { kind: 'crystals', pos: [93, 1, -49], size: 1.2, color: 'cyan' },
      { kind: 'crystals', pos: [107, 1, -38], size: 1, color: 'pink' },
    ]),

    { type: 'killplane', y: -12 },
  ],
  blocks: [
    // 1: Funkenblüte (Einführung)
    { kind: 'question', pos: [-2.6, 15.4, -4.6], content: 'funkenbluete' },
    // 2: ?-Block über der Panzerkröte auf dem Dach des versteckten Raums; Münzblock im Raum
    { kind: 'question', pos: [3.2, 8, -50.2], content: 'coins:5' },
    { kind: 'coinblock', pos: [5.2, 3.4, -46], count: 6 },
    // 3: Wachstumsbeere, verstecktes Extraleben über der höchsten Röhre
    { kind: 'brick', pos: [-0.6, 3.4, -70.4] },
    { kind: 'question', pos: [0.4, 3.4, -70.4], content: 'wachstumsbeere' },
    { kind: 'hidden', pos: [-5.2, 7.6, -75], content: 'oneup' },
    // 5: Krallen-Anzug für die Kletterwand zum Welt-Warp
    { kind: 'question', pos: [-3, 3.4, -136.6], content: 'krallenAnzug' },
    { kind: 'brick', pos: [-2, 3.4, -136.6], content: 'coins:4' },
  ],
  enemies: [
    // Panzerkröten (12): Start 1, Eingang 3 (eine auf dem Raumdach), Röhrenfeld 2, obere Gerade 1, Goldraum 3, Rätselbox 2
    { kind: 'panzerkroete', pos: [-3, 13, -7.2], path: [[-6, 13, -7.2], [1.5, 13, -7.2]] },
    { kind: 'panzerkroete', pos: [-3, 1, -35], path: [[-6, 1, -35], [1, 1, -35]] },
    { kind: 'panzerkroete', pos: [-4, 1, -46], path: [[-6.5, 1, -46], [-1.5, 1, -46]] },
    { kind: 'panzerkroete', pos: [1.5, 5.6, -47.8], path: [[0.8, 5.6, -46], [5.6, 5.6, -46]] },
    { kind: 'panzerkroete', pos: [0, 1, -73.4], path: [[-3, 1, -73.4], [4, 1, -73.4]] },
    { kind: 'panzerkroete', pos: [-1, 1, -84], path: [[-4, 1, -84], [4, 1, -84]] },
    { kind: 'panzerkroete', pos: [2, 13, -113.4], path: [[-4, 13, -113.4], [4, 13, -113.4]] },
    { kind: 'panzerkroete', gold: true, pos: [-65, 1, -134], path: [[-67, 1, -134], [-62, 1, -134]] },
    { kind: 'panzerkroete', gold: true, pos: [-58, 1, -136], path: [[-60, 1, -136], [-54, 1, -136]] },
    { kind: 'panzerkroete', gold: true, pos: [-62, 1, -139], path: [[-66, 1, -139], [-56, 1, -139]] },
    { kind: 'panzerkroete', id: 'rk1', pos: [96, 1, -131], path: [[95, 1, -131], [104, 1, -131]] },
    { kind: 'panzerkroete', id: 'rk2', pos: [104, 1, -136], path: [[96, 1, -136], [105, 1, -136]] },
    // Pilzlinge (7 frei + 5 im Turm): Eingang 2, Tor rechts 1, Gang 1, Arena 3
    { kind: 'pilzling', pos: [3, 1, -30.6], path: [[-2, 1, -30.6], [6, 1, -30.6]] },
    { kind: 'pilzling', pos: [-3, 1, -53], path: [[-6, 1, -53], [6.5, 1, -53]] },
    { kind: 'pilzling', pos: [6.6, 1, -149.6], path: [[5.4, 1, -149.6], [8.8, 1, -149.6]] },
    { kind: 'pilzling', pos: [0, 1, -154], path: [[-1.5, 1, -154], [1.8, 1, -154]] },
    { kind: 'pilzling', pos: [44, 1, -148], behavior: 'chase' },
    { kind: 'pilzling', pos: [56, 1, -147], behavior: 'chase' },
    { kind: 'pilzling', pos: [53, 1, -158], path: [[46, 1, -158], [55, 1, -158]] },
    { kind: 'pilzlingsturm', pos: [50, 1, -153.6], count: 5, carries: 'star:2', behavior: 'chase' },
    // Mini-Pilzlinge (6): Röhrenfeld 3, Arena 3
    { kind: 'pilzling', mini: true, pos: [0, 1, -62.6], path: [[-3, 1, -62.6], [2, 1, -62.6]] },
    { kind: 'pilzling', mini: true, pos: [-3.4, 1, -79.4], path: [[-4, 1, -79.4], [0, 1, -79.4]] },
    { kind: 'pilzling', mini: true, pos: [3, 1, -74.4], path: [[2, 1, -75], [4, 1, -79]] },
    { kind: 'pilzling', mini: true, pos: [47, 1, -150], behavior: 'chase' },
    { kind: 'pilzling', mini: true, pos: [53, 1, -151.4], behavior: 'chase' },
    { kind: 'pilzling', mini: true, pos: [50, 1, -146.6], behavior: 'chase' },
  ],
  items: [
    // 1: Laterne mit versteckten Münzen (Einführung)
    { kind: 'lantern', pos: [-5.4, 13, 2.4], radius: 6.5 },
    ...hidden([ring([-2.4, 13.9, -1], 1.7, 6)]),
    line([2.4, 13.4, -2.6], [4, 13.4, -5], 3),
    // 2
    { kind: 'lantern', pos: [-6.4, 1, -31.4], radius: 7 },
    ...hidden([line([-6.4, 1.6, -34.6], [-6.4, 1.6, -41], 4)]),
    line([0, 1.4, -38], [0, 1.4, -44], 3),
    ring([3.2, 1.6, -47.8], 1.7, 6),
    // 3
    { kind: 'lantern', pos: [7.6, 1, -67.4], radius: 8 },
    ...hidden([{ kind: 'coin', pos: [3.6, 2.8, -64.4] }, { kind: 'coin', pos: [6, 4, -71] }, { kind: 'coin', pos: [5.2, 4.8, -81.8] }]),
    { kind: 'coin', pos: [-2, 4.4, -67.2] }, { kind: 'coin', pos: [-5.2, 5.6, -75] },
    line([-1, 1.4, -79.6], [-1, 1.4, -83.6], 3),
    // 4: Münzbögen zwischen den Wolken, Abstecher zum Stern
    ...arc([-3.5, 3.4, -89.5], [1.5, 5.4, -93.6], 3, 1.2),
    ...arc([1.5, 5.4, -93.6], [5, 7.4, -98], 3, 1.2),
    ...arc([5, 7.4, -98], [7.4, 9, -103], 3, 1.2),
    ...arc([1.5, 9.4, -102.4], [-3, 11.4, -106.4], 3, 1.2),
    { kind: 'lantern', pos: [3.6, 13, -112.6], radius: 6 },
    ...hidden([line([-3.6, 13.6, -115.6], [3.6, 13.6, -115.6], 4)]),
    // 5
    ...arc([7.2, 2.6, -130.4], [7.2, 4, -133.4], 2, 0.8), ...arc([7.2, 4, -133.4], [7.2, 5.4, -136.4], 2, 0.8),
    ...column(7, -150.4, 1.6, 3.6, 3),
    // 6: Kette und Gehege
    { kind: 'coin', pos: [-2.9, 4.0, -152.2] }, { kind: 'coin', pos: [-2.9, 6.0, -153.8] }, { kind: 'coin', pos: [-2.9, 8.0, -155.4] },
    ...column(-16.4, -152, 8.6, 11, 4), ...column(-21.4, -152.4, 8.6, 11, 4), ...column(-21.4, -157.8, 8.6, 11, 4), ...column(-16.6, -157.6, 8.6, 11, 4),
    // Arena, Ziel, Welt-2-Raum
    { kind: 'lantern', pos: [58.6, 1, -152], radius: 8 },
    ...hidden([line([44, 1.6, -144], [56, 1.6, -144], 5)]),
    line([50, 1.4, -173.6], [50, 1.4, -176], 2),
    ...arc([50, 4.4, -180.4], [50, 6, -185.6], 3, 1.4),
    line([94, 1.4, -34], [106, 1.4, -34], 6), line([94, 2.6, -38], [106, 2.6, -38], 6), line([94, 1.4, -42], [106, 1.4, -42], 6),
    // Rätselbox (Stern 1) mit Raum: zwei Panzerkröten besiegen
    { kind: 'warpbox', id: 'rb1', style: 'mystery', pos: [8.3, 5.2, -140.2], target: 'rb2' },
    { kind: 'warpbox', id: 'rb2', style: 'mystery', pos: [100, 1, -124.6], target: 'rb1',
      task: { type: 'defeatAll', area: { min: [92, 0, -140], max: [108, 8, -122] }, ids: ['rk1', 'rk2'], star: 1, pos: [100, 2, -132] } },
  ],
  checkpoint: [0, 1, -88],
  stars: [
    [7.4, 9.6, -103],          // 0: zwischen den Wolken (über der kleinen Wolke rechts)
    //                            1: Rätselbox (task star: 1), 2: im Pilzlingsturm (carries 'star:2')
  ],
  stamp: [-19, 8.9, -155],
  goal: { pos: [50, 1, -186], height: 9 },
  marks: {
    start: [0, 13, 5],
    cave: [0, 1, -32],
    room: [3.2, 1, -47],
    roof: [3.2, 5.6, -46.4],
    pipes: [0, 1, -62],
    clouds: [0, 1, -87],
    top: [0, 13, -112],
    gates: [0, 1, -130],
    corridor: [0, 1, -149.5],
    arena: [50, 1, -145],
    goal: [50, 1, -176],
    gold: [-60, 1, -131],
    mystery: [100, 1, -128],
    world2: [100, 1, -34],
    enclosure: [-16, 8, -155],
  },
};
