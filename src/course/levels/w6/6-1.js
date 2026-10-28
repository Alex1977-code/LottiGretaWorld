// 6-1 „Röhrenreise über die Wolkengipfel“ (Bauplan 6-1: Parcours, 400 s, ca. 240 m – Bergland mit verzweigtem
// Glasröhren-Netz). Thema clearpipe, Musik course_clearpipe.
//
// Grüne Berggipfel ragen aus dem Wolkenmeer; Glasröhren verbinden Wiesen, Grate und Terrassen. Abschnitte (nach −Z):
//   1. Startgipfel (z 9 … −46, y 1): Almwiese mit Hütte und Kühen, erste Stachelkugel (harmlos, ebener Boden); ein
//      Felsgrat (7,5 m) quert den Gipfel – nur das Glasröhren-Netz führt hinüber: Kreuzung über dem Grat mit Weiche
//      (ohne Stick rechts zum Hauptweg, Stick links zum Sterngarten). Hinterwiese: zwei Feuer-Schnappblumen, zwei
//      querrollende Stachelkugeln, der **Glasgang** (Stern 0 zwischen zwei Stachelkugeln – nur mit dem Funkelstern aus
//      dem ?-Block davor), Warp-Box zum zweiten Gipfel.
//   2. Gegnerstrecke (z −50 … −112, y 7): Schnappblumen und Stachelkugeln auf dem Gratweg, eine gerade Glasröhre über die
//      Kluft (Wuschel-Röhre: drei Wuschel kreisen um sie; Stern 1 liegt oben auf der Röhre), Checkpoint-Plateau.
//   3. Röhrensteigung (z −105 … −160, y 7 → 11,5 → 16 → 20,5): der Röhrenbogen (Stempel darüber) und eine zweite Röhre zur
//      ersten Terrasse, Wuschel-Kreise, versteckte Wolkenkanone in den Münzhimmel (Stern 2), Röhre mit Weiche zur zweiten
//      Terrasse, Steigröhre zur Gipfelterrasse, Warp-Box 2.
//   4. Schnappblumen-Feld (z −166 … −214, y 15): fünf Schlüsselmünzen öffnen die letzte Warp-Box.
//   5. Zielgipfel (z −222 … −246, y 24): Zielmast über den Wolken.
// Abseits: Münzhimmel bei x ≈ −46, y ≈ 42 (eigene Kameraschiene), Röhre zurück zur Gipfelterrasse.

import {
  isl, line, ring, arc, column, gipfel, grat, bergwiese, steinpfad, trockenmauer, glasgang, lochinsel, almhuette, kuehe,
  gipfelfahnen, wimpelkette, vogelschwarm, wolkenkranz,
} from './_helpers_a.js';

const Y1 = 1, RIDGE = 8.5;              // Startgipfel, Felsgrat
const Y2 = 7;                           // Gegnerstrecke, Checkpoint
const T2 = 11.5, T3 = 16, T4 = 20.5;    // Terrassen der Röhrensteigung
const Y4 = 15, Y5 = 24, YH = 42;        // Schnappblumen-Feld, Zielgipfel, Münzhimmel
const HX = -46;                         // Münzhimmel (x)
const P = 1.05;                         // Röhrenmitte über dem Boden (Öffnung)

const sign = (x, y, z, text, yaw = 0) => ({ type: 'sign', pos: [x, y, z], text, yaw });
const snap = (x, y, z, o = {}) => ({ kind: 'schnappblume', pos: [x, y, z], ...o });
const fsnap = (x, y, z, o = {}) => ({ kind: 'feuer_schnappblume', pos: [x, y, z], ...o });
const kugel = (id, a, b, o = {}) => ({ kind: 'stachelkugel', id, pos: a, path: [a, b], speed: 3, mode: 'pingpong', ...o });
const wusch = (o) => ({ kind: 'wuschel', speed: 2.4, ...o });
/** Wuschel-Ring senkrecht um eine Röhre (Achse entlang Z bei x, yc; Ebene z): Bahnpunkte (Unterkante). */
const ringZ = (x, yc, z, r = 1.75, n = 16) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [x + Math.cos(a) * r, yc - 0.45 + Math.sin(a) * r, z]; });
/** Wuschel-Ring senkrecht um eine Röhre (Achse entlang Y bei x, z; Höhe y): waagerechter Kreis. */
const key = (x, y, z) => ({ kind: 'schluesselmuenze', pos: [x, y, z], group: 'tor', onAll: { reveal: 'w3' } });

function build(level) {
  // ---------------- Gipfelflanken bis ins Wolkenmeer
  gipfel(level, -13, 13, 9, -46, Y1, { seed: 1 });
  gipfel(level, -9, 9, -50, -64, Y2, { seed: 3, poly: [[-9, -50], [9, -50], [9, -63], [6, -64], [6, -80], [-6, -80], [-6, -64], [-9, -63]] });
  gipfel(level, -12, 11, -93, -112, Y2, { seed: 4 });
  grat(level, -12, 11, -112, -125, T2, Y2, { seed: 5 });
  gipfel(level, -12, 11, -112, -125, T2, { seed: 6, bottom: Y2 - 0.2, flare: 0.02 });
  grat(level, -12, 11, -125, -139, T3, T2, { seed: 7 });
  grat(level, -11, 11, -139, -160, T4, T3, { seed: 8 });
  gipfel(level, -12, 11, -112, -160, Y2, { seed: 9, bottom: -34 });
  gipfel(level, -16, 16, -166, -214, Y4, { seed: 10 });
  gipfel(level, -9, 9, -222, -246, Y5, { seed: 11 });

  // ---------------- Wiesen
  bergwiese(level, [
    [-13, 13, 9, -17, Y1, 26], [-12.6, 12.6, -23.5, -45.6, Y1, 22], [-9, 9, -50, -64, Y2, 12], [-6, 6, -64, -80, Y2, 8],
    [-12, 11, -93, -112, Y2, 16], [-12, 11, -112, -125, T2, 12], [-12, 11, -125, -139, T3, 12], [-11, 11, -139, -160, T4, 16],
    [-16, 16, -166, -214, Y4, 40], [-9, 9, -222, -246, Y5, 14],
  ], { avoid: [[0, -14.4, 1.6], [-8, -36, 1.4], [0, 4, 1.5]] });
  steinpfad(level, [[0, 6], [0, -2], [0, -12.6]], Y1);
  steinpfad(level, [[6.5, -29.4], [6, -36], [5, -40]], Y1);
  steinpfad(level, [[0, -56.5], [0, -66], [0, -74]], Y2);

  // ---------------- Startgipfel
  glasgang(level, { x0: -12.3, x1: -3.4, y: Y1, z: -36, closed: ['x0'] });
  for (const x of [-12.6, 12.6]) trockenmauer(level, [x, -24], [x, -45.6], Y1);
  trockenmauer(level, [-12.6, -45.6], [12.6, -45.6], Y1);
  almhuette(level, -8.6, Y1, -2.5, { yaw: Math.PI / 2 - 0.25 });
  kuehe(level, [[7.5, Y1, -1.5, 2.6], [9.6, Y1, -9.5, 0.4, 0.95], [-6.5, Y1, 6.5, -0.4, 0.9]]);
}

function setup(level) {
  gipfelfahnen(level, [[11.2, Y1, 7.6, 0xe8283a, 4.4], [-8.2, Y5, -244.5, 0x3d8bff, 5], [8.2, Y5, -244.5, 0xffd23d, 5]]);
  vogelschwarm(level, { pos: [18, 14, -40], r: 9, n: 6 });
  vogelschwarm(level, { pos: [-22, 28, -150], r: 11, n: 7, speed: -0.2 });
}

export const LEVEL = {
  id: '6-1',
  world: 6,
  title: 'Röhrenreise über die Wolkengipfel',
  archetype: 'parcours',
  theme: 'clearpipe',
  music: 'course_clearpipe',
  timeLimit: 400,
  killY: -12,
  farHide: 70,
  build,
  setup,
  start: { pos: [0, Y1, 4], yaw: Math.PI / 2 },
  camera: [
    { from: 14, to: -47, pitch: 44, dist: 13.5, fov: 40, x: 0, xLock: 0.25 },
    { from: -47, to: -104, pitch: 44, dist: 13.5, fov: 40, x: 0, xLock: 0.35 },
    { from: -104, to: -162, pitch: 46, dist: 14, fov: 40, x: 0, xLock: 0.25 },
    { from: -162, to: -218, pitch: 47, dist: 14.5, fov: 40, x: 0, xLock: 0.2 },
    { from: -218, to: -252, pitch: 40, dist: 13, fov: 40, x: 0, xLock: 0.4 },
    // Münzhimmel (abseits, hoch oben)
    { from: -100, to: -170, pitch: 44, dist: 14, fov: 40, x: HX, xLock: 0.6, area: [HX - 24, HX + 18] },
  ],
  segments: [
    { type: 'killplane', y: -12 },
    // ================================================================ 1 Startgipfel
    isl(-13, 13, 9, -17, Y1, 8),
    isl(-13, 13, -17, -23.5, RIDGE, 15, { top: 'rock', xray: { min: 0.3 } }),
    isl(-13, 13, -23.5, -46, Y1, 8),
    sign(-3.2, Y1, -11.6, 'Glasröhren\n← Weiche →', 0.25),
    { type: 'glasnetz', id: 'netz1', radius: 1,
      nodes: { A: [0, Y1 + P, -14.4], K: [0, RIDGE + 2.6, -20.2], L: [-6.5, Y1 + P, -27.6], R: [6.5, Y1 + P, -27.6] },
      pipes: [
        { from: 'A', to: 'K', via: [[0, Y1 + P, -15.4], [0, RIDGE + 0.4, -15.9], [0, RIDGE + 2.6, -17.6]], coins: 3 },
        { from: 'K', to: 'R', via: [[3.2, RIDGE + 2.5, -21.6], [6.5, RIDGE + 0.6, -24.8], [6.5, Y1 + P + 0.5, -25.6]], coins: 2 },
        { from: 'K', to: 'L', via: [[-3.2, RIDGE + 2.5, -21.6], [-6.5, RIDGE + 0.6, -24.8], [-6.5, Y1 + P + 0.5, -25.6]], coins: 3 },
      ],
      weichen: { K: { to: 'R', toggle: ['L', 'R'] } } },
    { type: 'deco_w6', items: [
      { kind: 'bergkiefern', pos: [-10.5, Y1, 4], size: [3, 8], n: 3 }, { kind: 'bergkiefer', pos: [11, Y1, -14], height: 4.4 },
      { kind: 'felsen', pos: [10.5, Y1, 3], size: [3, 6], n: 3 }, { kind: 'fels', pos: [-11.4, Y1, -14.6], size: 1.5 },
      { kind: 'bergkiefer', pos: [-10.8, Y1, -42.6], height: 4.8 }, { kind: 'bergkiefer', pos: [10.6, Y1, -26], height: 4 },
      { kind: 'wolkenberg', pos: [-34, -10, -30], size: 14, height: 10, shadow: false }, { kind: 'wolkenfels', pos: [26, -4, -12], size: 5, shadow: false },
      { kind: 'wolke', pos: [16, 6, -20], size: 3.4, shadow: false }, { kind: 'wolke', pos: [-18, 9, -6], size: 3, shadow: false },
    ] },

    // ================================================================ 2 Gegnerstrecke
    isl(-9, 9, -50, -64, Y2, 10),
    isl(-6, 6, -64, -80, Y2, 10),
    isl(-12, 11, -93, -112, Y2, 10),
    { type: 'glasnetz', id: 'netz2', radius: 1,
      nodes: { A: [0, Y2 + P, -75], B: [0, Y2 + P, -96] },
      pipes: [{ from: 'A', to: 'B', coins: 4 }] },
    { type: 'deco_w6', items: [
      { kind: 'bergkiefern', pos: [-7, Y2, -52], size: [3, 3], n: 2 }, { kind: 'felsen', pos: [7, Y2, -52.5], size: [3, 3], n: 2 },
      { kind: 'bergkiefer', pos: [-9.6, Y2, -110], height: 4.6 }, { kind: 'bergkiefer', pos: [9.4, Y2, -108.5], height: 4.2 },
      { kind: 'wolkenfels', pos: [-22, 0, -84], size: 5, shadow: false }, { kind: 'wolke', pos: [14, 4, -86], size: 3.4, shadow: false },
    ] },

    // ================================================================ 3 Röhrensteigung
    isl(-12, 11, -112, -125, T2, 8),
    isl(-12, 11, -125, -139, T3, 8),
    isl(-11, 11, -139, -160, T4, 8),
    { type: 'glasnetz', id: 'bogen', radius: 1,
      nodes: { A: [8, Y2 + P, -104.6], B: [8, T2 + P, -117.6] },
      pipes: [{ from: 'A', to: 'B', via: [[8, Y2 + P, -105.8], [8, 12.4, -108.2], [8, 13.6, -110.4], [8, 13.6, -113.2], [8, 13.1, -115.4], [8, T2 + P, -116.4]], coins: 4 }] },
    { type: 'glasnetz', id: 'netz3a', radius: 1,
      nodes: { A: [-4, Y2 + P, -105.4], B: [-4, T2 + P, -115.4] },
      pipes: [{ from: 'A', to: 'B', via: [[-4, Y2 + P, -106.6], [-4, T2 + 0.4, -110.6], [-4, T2 + P + 0.4, -113.4]], coins: 2 }] },
    { type: 'glasnetz', id: 'netz3b', radius: 1,
      nodes: { A: [0, T2 + P, -120.6], K: [0, T3 + 2.4, -126.4], L: [-6, T3 + P, -131.6], R: [6, T3 + P, -131.6] },
      pipes: [
        { from: 'A', to: 'K', via: [[0, T2 + P, -121.8], [0, T3 + 0.4, -123.4]], coins: 2 },
        { from: 'K', to: 'L', via: [[-3, T3 + 2.2, -127.6], [-6, T3 + P + 0.4, -129.8]], coins: 2 },
        { from: 'K', to: 'R', via: [[3, T3 + 2.2, -127.6], [6, T3 + P + 0.4, -129.8]], coins: 2 },
      ],
      weichen: { K: { to: 'R', toggle: ['L', 'R'] } } },
    { type: 'glasnetz', id: 'netz3c', radius: 1,
      nodes: { A: [0, T3 + P, -134.6], B: [0, T4 + P, -144.6] },
      pipes: [{ from: 'A', to: 'B', via: [[0, T3 + P, -135.8], [0, T4 + 0.4, -138.0], [0, T4 + P + 0.4, -141.4]], coins: 3 }] },
    { type: 'cloudcannon', id: 'kanone', pos: [-10.4, T2, -122.4], target: [HX, YH + 0.6, -114], arc: 6 },

    // ================================================================ Münzhimmel
    { type: 'wolkenplattform', pos: [HX, YH, -114], size: [6, 0.6, 6] },
    { type: 'wolkenplattform', pos: [HX, YH, -124], size: [4, 0.6, 14] },
    { type: 'wolkenplattform', pos: [HX + 3, YH + 1, -137], size: [4, 0.6, 6] },
    { type: 'wolkenplattform', pos: [HX - 2, YH + 2, -146], size: [4, 0.6, 6] },
    { type: 'wolkenplattform', pos: [HX, YH + 2, -156], size: [6, 0.6, 8] },
    { type: 'pipe', id: 'himmelAus', pos: [HX, YH + 2.6, -159], height: 1.4, target: [-6, T4, -148] },
    { type: 'killplane', pos: [HX, YH - 14, -135], size: [46, 70] },

    // ================================================================ 4 Schnappblumen-Feld
    isl(-16, 16, -166, -214, Y4, 10),
    isl(-14.6, -12.4, -177, -179.2, Y4 + 2.2, 3, { top: 'rock' }),
    { type: 'glasnetz', id: 'netz4', radius: 1,
      nodes: { A: [-6, Y4 + P, -172.6], K: [0, Y4 + 4.2, -186], L: [-12.5, Y4 + P, -199.6], R: [12.5, Y4 + P, -199.6] },
      pipes: [
        { from: 'A', to: 'K', via: [[-6, Y4 + P, -174], [-4.2, Y4 + 3.8, -179], [-1.4, Y4 + 4.2, -183.6]], coins: 3 },
        { from: 'K', to: 'L', via: [[-4, Y4 + 4.1, -190], [-11, Y4 + 2.6, -195.6], [-12.5, Y4 + P, -198.2]], coins: 2 },
        { from: 'K', to: 'R', via: [[4, Y4 + 4.1, -190], [11, Y4 + 2.6, -195.6], [12.5, Y4 + P, -198.2]], coins: 2 },
      ],
      weichen: { K: { to: 'R', toggle: ['L', 'R'] } } },

    // ================================================================ 5 Zielgipfel
    isl(-9, 9, -222, -246, Y5, 10),
  ],
  blocks: [
    { kind: 'question', pos: [-1.5, Y1 + 2.4, 0], content: 'coins:3' },
    { kind: 'question', pos: [0.6, Y1 + 2.4, -32.6], content: 'stern' },
  ],
  enemies: [
    // Startgipfel
    kugel('k0', [-9, Y1, -6], [9, Y1, -6], { speed: 2.4 }),
    kugel('glas1', [-4.2, Y1, -36], [-7.0, Y1, -36], { size: 1.4, speed: 2.2 }),
    kugel('glas2', [-9.4, Y1, -36], [-11.6, Y1, -36], { size: 1.4, speed: 1.6, phase: 0.5 }),
    kugel('k1', [-1.5, Y1, -31.8], [11.4, Y1, -31.8], { speed: 3 }),
    kugel('k2', [-1.5, Y1, -39.4], [11.4, Y1, -39.4], { speed: 3, phase: 0.5 }),
    fsnap(10.6, Y1, -35.5, { yaw: Math.PI }),
    fsnap(11, Y1, -44.2, { yaw: Math.PI / 2 }),
    // Gegnerstrecke
    snap(-6.6, Y2, -57), snap(5.4, Y2, -66.5), snap(-4.8, Y2, -71.5), snap(4.6, Y2, -77.5),
    kugel('k3', [-8, Y2, -60.5], [8, Y2, -60.5]),
    kugel('k4', [-5.2, Y2, -68.6], [5.2, Y2, -68.6], { speed: 2.6 }),
    kugel('k5', [-5.2, Y2, -72.4], [5.2, Y2, -72.4], { speed: 2.6, phase: 0.5 }),
    kugel('k6', [-9.6, Y2, -104], [-9.6, Y2, -94], { speed: 2 }),
    fsnap(9, Y2, -101, { yaw: Math.PI }),
    wusch({ id: 'wr1', path: ringZ(0, Y2 + P, -82.6), loop: true, speed: 2.4 }),
    wusch({ id: 'wr2', path: ringZ(0, Y2 + P, -86.6), loop: true, speed: 2.4, phase: 0.33 }),
    wusch({ id: 'wr3', path: ringZ(0, Y2 + P, -90.6), loop: true, speed: 2.4, phase: 0.66 }),
    // Röhrensteigung
    wusch({ id: 'wt1', center: [-4, T2, -120], radius: 2.6, count: 4, spacing: 4.1, speed: 2.2 }),
    wusch({ id: 'wt2', path: [[-10, T2, -116], [6, T2, -116]], count: 3, spacing: 2.2, speed: 2.6 }),
    wusch({ id: 'wt3', center: [-6, T3, -134], radius: 2.2, count: 3, spacing: 4.6, speed: 2.2, cw: true }),
    wusch({ id: 'wt4', center: [6, T3, -134], radius: 2.2, count: 4, spacing: 3.4, speed: 2.2 }),
    wusch({ id: 'wt5', path: [[-9, T4, -150], [9, T4, -150]], count: 3, spacing: 2.4, speed: 2.8 }),
    wusch({ id: 'wt6', path: ringZ(-4, T2 - 1.5, -109), loop: true, speed: 2 }),
    wusch({ id: 'wt7', path: ringZ(-4, T2 - 1.5, -109), loop: true, speed: 2, phase: 0.5 }),
    wusch({ id: 'wt8', center: [0, T4, -148], radius: 3.6, count: 3, spacing: 7.5, speed: 2.4, cw: true }),
    kugel('k13', [-3, T2, -123.8], [-11, T2, -123.8], { speed: 2.2 }),
    kugel('k14', [-10, T4, -153], [10, T4, -153], { speed: 3, phase: 0.5 }),
    kugel('k16', [-8, Y2, -63], [8, Y2, -63], { speed: 2.4, phase: 0.5 }),
    snap(-9.5, T3, -128.5), snap(9.2, T3, -137.5),
    kugel('k7', [-10, T4, -144], [10, T4, -144], { speed: 3.2 }),
    kugel('k8', [-10, T3, -137.6], [-2, T3, -137.6], { speed: 2.4 }),
    // Münzhimmel
    snap(HX + 1.6, YH, -127),
    wusch({ id: 'wh1', path: [[HX + 4, YH + 1, -143], [HX - 5, YH + 2, -149]], speed: 2 }),
    // Schnappblumen-Feld
    ...[[-8, -180], [-3.5, -177.5], [3.5, -177.5], [8, -183], [-9, -190], [-4.6, -194.6], [4.6, -194.6], [9, -190], [-6, -203], [6, -203]].map(([x, z]) => snap(x, Y4, z)),
    fsnap(15, Y4, -212.6, { yaw: Math.PI * 0.75 }),
    kugel('k9', [6, Y4, -173.5], [15, Y4, -173.5], { speed: 2.4 }),
    kugel('k10', [9.8, Y4, -167.5], [9.8, Y4, -181], { speed: 2.6, phase: 0.5 }),
    kugel('k11', [-14, Y4, -207.6], [14, Y4, -207.6], { speed: 3 }),
    kugel('k12', [-15, Y4, -184.5], [-15, Y4, -196], { speed: 2.4 }),
    kugel('k15', [-14.4, Y4, -181.2], [-8.6, Y4, -181.2], { speed: 2, phase: 0.3 }),
    wusch({ id: 'wf1', center: [0, Y4, -190], radius: 2.6, count: 2, spacing: 8.2, speed: 2.2 }),
  ],
  items: [
    { kind: 'warpbox', id: 'w1', pos: [5, Y1, -42], target: 'w1b' },
    { kind: 'warpbox', id: 'w1b', pos: [0, Y2, -53], target: 'w1' },
    { kind: 'warpbox', id: 'w2', pos: [0, T4, -156], target: 'w2b' },
    { kind: 'warpbox', id: 'w2b', pos: [-11, Y4, -169.4], target: 'w2' },
    { kind: 'warpbox', id: 'w3', pos: [0, Y4, -211], target: 'w3b', hidden: true },
    { kind: 'warpbox', id: 'w3b', pos: [0, Y5, -226], target: 'w3' },
    line([0, Y1 + 0.6, 2], [0, Y1 + 0.6, -10], 5),
    ring([-8, Y1 + 0.6, -27], 1.4, 6),
    // Schlüsselmünzen im Schnappblumen-Feld
    key(-13.5, Y4 + 2.5, -178.1), key(12.5, Y4 + 0.3, -203), key(0, Y4 + 0.3, -190), key(-12.5, Y4 + 0.3, -203), key(13.6, Y4 + 0.3, -177),
    // Münzhimmel
    line([HX, YH + 0.6, -117], [HX, YH + 0.6, -131], 8), arc([HX, YH + 0.6, -131], [HX + 3, YH + 1.6, -136], 4, 1.6),
    line([HX + 3, YH + 1.6, -135], [HX + 3, YH + 1.6, -139], 3), arc([HX + 3, YH + 1.6, -139], [HX - 2, YH + 2.6, -144], 4, 1.6),
    line([HX - 2, YH + 2.6, -144], [HX - 2, YH + 2.6, -148], 3), ring([HX, YH + 2.6, -154], 2, 8),
  ],
  checkpoint: [0, Y2, -99],
  stars: [
    [-8.2, Y1 + 0.15, -36],                 // 0: im Glasgang zwischen zwei Stachelkugeln
    [0, Y2 + P + 0.9, -86.6],               // 1: oben auf der Wuschel-Röhre
    [HX, YH + 2.7, -155.4],                 // 2: Münzhimmel
  ],
  stamp: [8, 15.8, -111.8],
  goal: [0, Y5, -240],
  marks: { start: [0, Y1, 4], netz1: [0, Y1, -12], glasgang: [-2.6, Y1, -36], w1: [5, Y1, -40], w1b: [0, Y2, -56], cp: [0, Y2, -99] },
};
