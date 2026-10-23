// 3-Zug „Volldampf durchs Schneetal“ – Welt-3-Finale (Archetyp autoscroller + boss, Bauplan 3-Zug): Am Bahnhof
// Tannenruh steht der Schneetal-Express unter Dampf – und daneben Baron Brummbärs gepanzerter Kanonenzug. Kaum ist man
// eingestiegen, fahren beide los: das Bildfenster gleitet schneller als die Züge am Express entlang nach vorn
// (Fahrplan mit Halte-Pausen am Pilzlingsturm, an der Geheimröhre und langsam durch den Postwagen). Vom Parallelzug
// feuern Riesenprojektile quer über die Wagendächer (drüberspringen oder mitreiten), eine Kanone schießt Suchköpfe.
// Am Ende hält der Express im Bahnhof Schneetal; die Röhre auf der Lok führt zur Drehscheibe im Lokschuppen –
// Kampf gegen die Schattenläuferin. Danach braust Baron Brummbär heran, schimpft und flieht; die Warp-Box führt
// zum Bahnsteig mit dem Zielmast, wo Krümel schon wartet.
//
// Zug-Koordinate c: Meter entlang des Zugs nach vorn ab dem Heck (beim Fahrtbeginn z = 14 − c; _helpers_e.js).
//   1 Bahnsteig        c −8 … 26     Einsteigen; der Zug fährt nach 3,5 s schnell an (wer nicht aufspringt, wird ans
//                                    Bahnsteigende geschoben und stürzt in die Schlucht)
//   2 Zugfahrt         W1 … W7       Hüpfquallen, Riesenprojektile (PK1–PK4), Suchköpfe (PS), Pilzlingsturm (F2),
//                                    versteckter Block mit Riesentrank (F4) und Steinblock-Ladung
//   3 Bonuswagen       B1            optional: 8 Kisten, 7 mit Münzen, 1 mit Extraleben
//   4 Arena            Lok L1        nach zwei Feuer-Werfern auf dem Tender: Röhre → Drehscheibe, Schattenläuferin
// Geheimnis: Röhre auf dem Flachwagen F3 zum Brummbär-Zug (Wagen PX), dort Krümel aus einer Kiste befreien.
// Sterne: 0 an der Hinterkante des letzten Wagens (gleich am Start), 1 im Pilzlingsturm (F2), 2 Krümel (PX).
// Stempel: im Postwagen G1 (Dachluke hinein), bewacht von einem Feuer-Werfer.

import {
  ZUG, solveTrainRide, lineUp, part, onCar, carSegment, postwagenParts, levelSetupE, zugSetup, trackChunks,
} from './_helpers_e.js';

const VT = ZUG.VT;
const D = 1.39;             // Flachwagen-Deck
const R = 3.75;             // Wagendach
const XP = -10;             // Parallelgleis

// ---------------------------------------------------------------------- Wagen
const board = (len, h = 0.55) => [
  part({}, 0, -1.42, D, [0.12, h, len], { color: 0x8a4a2a }), part({}, 0, 1.42, D, [0.12, h, len], { color: 0x8a4a2a }),
];
// Tritt (zwei Holzstufen) vorn auf einem Flachwagen, wenn ein Personenwagen folgt: Deck → 0,6 → 1,15 → Dach
const tritt = (len = 10, inner = 0) => [
  part({}, len / 2 - 0.8 - inner, 0, D, [2.0, 0.6, 1.6], { color: 0x9a6a3a, tag: 'tritt' }),
  part({}, len / 2 - 0.45 - inner, 0, D, [2.0, 1.15, 0.9], { color: 0xb8844a, tag: 'tritt' }),
];
const MAIN = lineUp([
  { id: 'W1', style: 'wagen' },
  { id: 'W2', style: 'wagen' },
  { id: 'F1', style: 'flach', parts: tritt() },
  { id: 'W3', style: 'wagen' },
  { id: 'W4', style: 'wagen' },
  { id: 'F2', style: 'flach', parts: [...board(10), part({}, 4.9, 0, D, [3, 0.55, 0.12], { color: 0x8a4a2a }), part({}, -4.9, 0, D, [3, 0.55, 0.12], { color: 0x8a4a2a }), ...tritt(10, 0.15)] },
  { id: 'W5', style: 'wagen' },
  { id: 'F3', style: 'flach', parts: tritt() },
  { id: 'W6', style: 'wagen' },
  { id: 'G1', style: 'flach', roof: true, parts: postwagenParts({ len: 10 }) },
  { id: 'F4', style: 'flach', parts: tritt() },
  { id: 'W7', style: 'wagen' },
  { id: 'B1', style: 'flach', parts: [
    ...board(10, 1.1), part({}, 4.94, 0, D, [3, 1.1, 0.12], { color: 0x8a4a2a }), part({}, -4.94, 0, D, [3, 1.1, 0.12], { color: 0x8a4a2a }),
  ] },
  { id: 'T1', style: 'flach', len: 6.5, parts: [part({}, 0.4, 0, D, [2.4, 0.9, 3.6], { color: 0x2a2630, tag: 'kohle' }), part({}, 2.4, 0, D, [2.0, 1.6, 1.2], { color: 0x2a2630, tag: 'kohle' })] },
  { id: 'L1', style: 'lok' },
], 0);
const PAR = lineUp([
  { id: 'PK1', style: 'flach', x: XP, parts: [part({}, 1, 0.4, D, [2.2, 1.2, 2.2], { color: 0x6a1422, tag: 'sockel' })] },
  { id: 'PW1', style: 'wagen', x: XP },
  { id: 'PK2', style: 'flach', x: XP, parts: [part({}, 0, 0.4, D, [2.2, 1.2, 2.2], { color: 0x6a1422, tag: 'sockel' })] },
  { id: 'PW2', style: 'wagen', x: XP },
  { id: 'PS', style: 'flach', x: XP },
  { id: 'PX', style: 'flach', x: XP, parts: board(10, 0.45) },
  { id: 'PW3', style: 'wagen', x: XP },
  { id: 'PK3', style: 'flach', x: XP, parts: [part({}, 0, 0.4, D, [2.2, 1.2, 2.2], { color: 0x6a1422, tag: 'sockel' })] },
  { id: 'PW4', style: 'wagen', x: XP },
  { id: 'PK4', style: 'flach', x: XP, parts: [part({}, -1.5, 0.4, D, [2.2, 1.2, 2.2], { color: 0x6a1422, tag: 'sockel' })] },
  { id: 'PL', style: 'lok', x: XP },
], 22);
const M = MAIN.byId, Q = PAR.byId;
const at = (car, dc, dx, y) => onCar(car, dc, dx, y);

// ---------------------------------------------------------------------- Fahrplan (Bildfenster)
const RIDE = solveTrainRide({
  cw0: 5.5,
  plan: [
    { to: 24, r: 2.2 },          // Abfahrt, W1/W2 mit Hüpfquallen
    { to: 57.5, r: 2.0 },        // Riesenprojektile über W3/W4
    { hold: 8 },                 // Pilzlingsturm (F2)
    { to: 79, r: 2.0 },          // Suchköpfe (W5)
    { hold: 10 },                // Geheimröhre F3 ↔ PX (Krümel)
    { to: 99, r: 1.6 },          // W6
    { to: 107, r: 0.9 },         // Postwagen G1 (innen)
    { to: 118, r: 1.8 },         // F4: Riesentrank
    { to: 139, r: 2.2 },         // W7, Bonuswagen
    { to: 150.5, r: 1.6 },       // Tender, Lok – Halt
  ],
});
const DELAY = 3.5;
// Halt: Lok-Mitte in Weltkoordinaten
const LOK_Z = ZUG.ZR - M.L1.cc - RIDE.D;
const AX = 30, AY = 1.6, AZ = LOK_Z - 8, AR = 9.2;          // Drehscheiben-Arena im Lokschuppen
const GX = 4.6, GZ = LOK_Z - 2;                               // Zielbahnsteig (rechts am Halt)
// Schluchten (Welt-z, von – bis): Gerüstbrücken, kein Tiefschnee darunter (Absturz)
const GORGES = [[-16, -62], [-282, -330], [-504, -548]];

// ---------------------------------------------------------------------- Gegner, Gegenstände (Kurzformen)
const qualle = (car, dc, dx, y, o = {}) => ({ kind: 'huepfqualle', attach: car.id, pos: at(car, dc, dx, y), period: o.period ?? 1.3, phase: o.phase ?? 0, height: 1.2, behavior: o.behavior ?? 'hop', sight: 5, ...o });
const cannon = (car, dc, o = {}) => ({ kind: 'riesenkanone', id: o.id, attach: car.id, pos: at(car, dc, 0.4, D + 1.2), dir: [1, 0], height: 2.6, interval: o.interval ?? 5.2, first: o.first ?? 2, range: 30, max: 2, speed: 3.6, life: 7, charge: 0.9 });
const coins = (car, a, b, n) => ({ kind: 'coins', attach: car.id, from: a, to: b, n });

const enemies = [
  qualle(M.W2, 2.5, 0.3, R, { phase: 0 }), qualle(M.W2, -2.5, -0.3, R, { phase: 0.5 }),
  qualle(M.F1, 2, 0, D, { phase: 0.25 }),
  cannon(Q.PK1, 1, { id: 'rk1', first: 3.5 }), cannon(Q.PK2, 0, { id: 'rk2', first: 6 }),
  { kind: 'pilzlingsturm', id: 'turm', attach: 'F2', pos: at(M.F2, 0, 0, D), count: 5, carries: 'star:1', behavior: 'walk', speed: 0.7, dir: [0, -1], wake: 30 },
  { kind: 'kanone_turm', id: 'suchkanone', attach: 'PS', pos: at(Q.PS, 0, 0.6, D), dir: [1, 0], height: 1.4, shot: 'suchkopf', track: true, interval: 3.4, first: 2.5, range: 17, minRange: 3, max: 2, speed: 4.2, seek: 2.6, life: 5 },
  qualle(M.W5, 2.8, 0, R, { phase: 0.3 }),
  { kind: 'feuer_werfer', id: 'post_werfer', attach: 'G1', pos: at(M.G1, 0.4, 0.2, D), axis: [0, 1], pace: 1.4, speed: 1.0, sight: 7, interval: 2.6, first: 1.2, jumpEvery: 99, hop: 0.6, wake: 8 },
  qualle(M.F4, -3.6, 0.6, D, { phase: 0.1, behavior: 'chase' }), qualle(M.F4, 1.9, -0.9, D, { phase: 0.6 }),
  cannon(Q.PK3, 0, { id: 'rk3', first: 1 }), cannon(Q.PK4, -1.5, { id: 'rk4', first: 3 }),
  { kind: 'feuer_werfer', id: 'werfer1', attach: 'T1', pos: at(M.T1, 0.4, 0, D + 0.9), axis: [1, 0], pace: 0.7, sight: 9, interval: 2.4, first: 0.8, heights: [D, D + 0.9], jumpEvery: 3.2, wake: 14 },
  { kind: 'feuer_werfer', id: 'werfer2', attach: 'T1', pos: at(M.T1, -2.6, 0.5, D), axis: [1, 0], pace: 0.6, sight: 9, interval: 2.8, first: 1.6, heights: [D, D + 0.9], jumpEvery: 3.6, wake: 14 },
  // Endgegner in der Drehscheiben-Arena
  { kind: 'schattenlaeuferin', id: 'schatten', pos: [AX, AY, AZ - 3.5], arena: { center: [AX, AY, AZ], r: AR - 0.6 }, ring: 5 },
];

const items = [
  coins(M.W1, at(M.W1, -3, 0, R + 0.6), at(M.W1, 3, 0, R + 0.6), 4),
  coins(M.F1, at(M.F1, -3.5, -0.8, D + 0.6), at(M.F1, 0, -0.8, D + 0.6), 3),
  coins(M.W4, at(M.W4, -2, 0, R + 1.6), at(M.W4, 2, 0, R + 1.6), 3),
  coins(M.W6, at(M.W6, -3, 0.7, R + 0.6), at(M.W6, 1, 0.7, R + 0.6), 3),
  coins(M.W7, at(M.W7, -3, 0, R + 0.6), at(M.W7, 3, 0, R + 0.6), 4),
  { kind: 'crate', attach: 'F1', pos: at(M.F1, -2.5, 0.8, D), content: 'coins:2' },
  { kind: 'crate', attach: 'F1', pos: at(M.F1, -2.5, 0.8, D + 1), content: 'coin' },
  // Geheimröhre F3 → Brummbär-Zug (PX), Krümels Kiste, Rückröhre PX → Dach von W6
  { kind: 'crate', id: 'kiste_kruemel', attach: 'PX', pos: at(Q.PX, 0.6, 0, D), size: 1.3, content: { fn: (level) => level._zugScene?.freeKruemel() } },
  { kind: 'crate', attach: 'PX', pos: at(Q.PX, -1.4, 0.7, D), content: 'coins:2' },
  // Bonuswagen: 8 Kisten (7 Münzen, 1 Extraleben)
  ...[[-3.3, -0.6], [-3.3, 0.6], [-1.1, -0.6], [-1.1, 0.6], [1.1, -0.6], [1.1, 0.6], [3.3, -0.6], [3.3, 0.6]].map(([dc, dx], i) => ({
    kind: 'crate', id: `bonus${i}`, attach: 'B1', pos: at(M.B1, dc, dx, D), content: i === 5 ? 'oneup' : 'coins:2',
  })),
  // Pfad zum versteckten Block (F4) – Münzspur zeigt hin
  coins(M.F4, at(M.F4, -4, 0, D + 0.5), at(M.F4, -1, 0, D + 0.5), 3),
];

export const LEVEL = {
  id: '3-Zug',
  world: 3,
  title: 'Volldampf durchs Schneetal',
  archetype: 'autoscroller',
  theme: 'train',
  music: 'course_train',
  timeLimit: 400,
  killY: -14,
  start: { pos: [3.2, 1.1, ZUG.ZR - 6.5], yaw: Math.PI / 2 },
  scroll: {
    path: [[ZUG.XW, 0, ZUG.ZP], [ZUG.XW, 0, -3000]],
    start: RIDE.start, end: RIDE.end, speed: RIDE.speed, speeds: RIDE.speeds, accel: ZUG.ACCEL, delay: DELAY,
    frame: { back: 5, front: 8, ahead: 1.2, followX: 0.32 },
    with: 'boss',
    startBanner: 'Einsteigen!', endBanner: 'Bahnhof Schneetal!',
  },
  camera: [
    { from: 40, to: -1200, pitch: 40, dist: 15.5, fov: 40, area: [-45, 22] },
    { from: AZ + 30, to: AZ - 30, pitch: 48, dist: 16, x: AX, xLock: 0.3, ahead: 1.2, lead: 0.5, area: [22, 60] },
  ],
  boss: {
    id: 'schatten', name: 'Schattenläuferin', speed: 0,
    trigger: { min: [AX - AR, AY - 0.5, AZ - AR], max: [AX + AR, AY + 6, AZ + AR - 3.2] },
    warp: 'warp_sieg', frame: 0.3, musicAfter: 'course_train',
  },
  setup: levelSetupE((level, scene) => zugSetup(level, scene)),
  zug: {
    main: MAIN.list, par: PAR.list, ride: RIDE, delay: DELAY, lokZ: LOK_Z, arena: { x: AX, y: AY, z: AZ, r: AR }, goal: { x: GX, z: GZ },
    // Röhren auf Wagen: Geheimröhre F3 ↔ Brummbär-Zug PX, Rückröhre PX ↔ Dach von W6, Lok-Röhre → Arena (öffnet beim Halt)
    pipes: [
      { id: 'roehre_hin', car: 'F3', dc: -1.6, dx: -0.6, y: D, target: 'roehre_px', color: 0x2fbf4a, arrow: true },
      { id: 'roehre_px', car: 'PX', dc: -3.2, y: D, target: 'roehre_hin', color: 0x2fbf4a },
      { id: 'roehre_rueck', car: 'PX', dc: 3.4, y: D, target: 'roehre_w6', color: 0x2fbf4a, arrow: true },
      { id: 'roehre_w6', car: 'W6', dc: -2.4, dx: -0.7, y: R, target: 'roehre_rueck', color: 0x2fbf4a },
      { id: 'luke', car: 'L1', dc: 1.4, y: 3.2, target: 'arena_rohr', color: 0xc0283a, closed: true, lid: true },
    ],
    kruemel: { car: 'PX', dc: 0.6, dx: 0, pipe: 'roehre_rueck', star: 2 },
    post: 'G1',
    baron: { from: [AX + 40, -0.35, AZ + 16], stop: [AX + 12.5, -0.35, AZ + 3], away: [AX + 72, -0.35, AZ + 30] },
    // statische Sonnenschatten nur an den Bahnhöfen, am Bahnübergang und im Dorf (Budget)
    shadowZones: [[40, -20], [-358, -396], [-636, -800]],
    // Landschaft (_helpers_e.js schneetalSzene): Tiefschnee, Schluchten, Herde, Bahnübergang, Bahnhöfe, Lokschuppen
    land: {
      z0: 44, z1: LOK_Z - 62, tracks: [0, XP], trackFrom: { 0: 40, [XP]: 6 }, gorges: GORGES, floor: -22, sink: 0.5,
      islands: [
        { x0: -22, x1: 20, z0: 32, z1: -16, y: -0.35 },
        { x0: -25, x1: 55, z0: LOK_Z + 26, z1: LOK_Z - 34, y: -0.35 },
      ],
      flats: [
        { x: 22, z: -238, rx: 8, rz: 13 }, { x: 12.6, z: -381, rx: 7, rz: 7 },
        { x: 15, z: -648, rx: 4.5, rz: 5 }, { x: 15, z: -668, rx: 4.5, rz: 5 }, { x: 24, z: -660, rx: 4.5, rz: 6 },
      ],
      deep: { x0: -40, x1: 34 },
      forest: [{ x: [20, 62], per: 55, h: [3.6, 7.2] }, { x: [-64, -21], per: 55, h: [3.6, 7.2] }],
      keepOut: [[13, 32, -222, -254], [3, 12, -60, -262], [5, 21, -362, -392], [-60, 60, -366, -378], [-24, 22, 36, -18], [-27, 57, LOK_Z + 28, LOK_Z - 36], [10, 30, -638, -700]],
      trees: [
        [-17.5, -84, 4.2], [-18.6, -118, 5.2], [16.2, -150, 4.4], [-17.2, -176, 3.8], [16.8, -300, 4], [-18, -350, 5],
        [16.5, -420, 4.6], [-17.8, -446, 4.2], [17, -470, 5.4], [-18.2, -585, 4.8], [16.4, -612, 4.2], [-17, -630, 5],
      ],
      poles: { x: -14.2, z0: -34, z1: LOK_Z + 30, every: 25 },
      fences: [{ x: -17.4, z0: -70, z1: -200 }, { x: -17.4, z0: -420, z1: -495 }, { x: -17.4, z0: -560, z1: -640 }],
      clutter: { x: [-21, 19], per: 24 },
      signals: [[3.6, -268], [3.6, -490], [3.6, -684]],
      crossing: { z: -372, w: 6, house: [12.6, -382.5], keeper: [6.2, -376.7] },
      lake: { x: 22, z: -238, rx: 7, rz: 12 },
      herd: { n: 7, x: 6.2, z: -104, wake: -80, stop: -250 },
      waterfalls: [{ x: 15, zTop: -334, dir: 1 }],
      stations: [
        { house: [15.8, -0.35, 6], w: 6.4, d: 14, tower: [-17, -0.35, 22], lights: [[9.6, 23, 4.2, -0.35]], trees: [[-19, 28, 5], [17.5, 26, 4.4], [-19.5, -6, 4.6]],
          snowmen: [[10.4, -0.35, 15.5], [-15.5, -0.35, 2, 0.4]], carts: [[6.1, 1.1, 19]] },
        { house: [13, -0.35, LOK_Z + 13], w: 6, d: 12, tower: [-17.5, -0.35, LOK_Z + 18], coal: [[-17.5, -0.35, LOK_Z + 4, 2.4]],
          lights: [[9.2, LOK_Z - 15, 4.6, -0.35]], snowmen: [[8.8, -0.35, LOK_Z + 2]], trees: [[-21, LOK_Z - 20, 5], [52, LOK_Z + 20, 5.5]] },
      ],
      lokschuppen: { center: [AX, -0.35, AZ], r0: 13, r1: 21, stalls: 5, rail: 10.2, bridge: [AX, AY, AZ, AR] },
      village: [[15, -648, 0], [15, -668, 0, 0xc8806a], [14.5, -690, 0, 0xe0c080]],
      chapel: [24, -660],
      steam: [{ veh: 'L1', at: [0, 4.3, 3.4], hiss: true }, { veh: 'PL', at: [0, 4.3, 3.4] }],
      kruemelZiel: [GX + 1.3, 1.1, GZ - 9.4],
    },
    flags: [
      { car: 'PK1', dc: -4.2, dx: -1.2 }, { car: 'PW1', dc: 4, dx: 0 }, { car: 'PK2', dc: -4.2, dx: -1.2 }, { car: 'PW2', dc: -4, dx: 0 },
      { car: 'PS', dc: 4, dx: -1.2 }, { car: 'PW3', dc: 4, dx: 0 }, { car: 'PK3', dc: 4.2, dx: -1.2 }, { car: 'PW4', dc: -4, dx: 0 },
      { car: 'PK4', dc: 4, dx: -1.2 }, { car: 'PL', dc: -2.6, dx: 0, y: 3.96, h: 2.6 },
    ],
  },
  segments: [
    // Bahnhof Tannenruh: Gelände, Bahnsteig
    { type: 'island', pos: [-1, -4.35, 8], size: [42, 4, 48], top: 'grass', under: 0 },
    { type: 'bahnsteig', pos: [4.4, 0, ZUG.ZR - 9], size: [5, 1.1, 34], edge: 'left', sign: 'Tannenruh' },
    { type: 'killplane', y: -14 },
    // Gleise (Haupt- und Parallelgleis) mit Gerüstbrücke über die Schlucht
    ...trackChunks({ x: 0, z0: 40, z1: LOK_Z - 30, gorges: GORGES, bottom: -30 }),
    ...trackChunks({ x: XP, z0: 6, z1: LOK_Z - 30, gorges: GORGES, bottom: -30, start: true }),
    // Bahnhof Schneetal (Halt), Lokschuppen mit Drehscheibe
    { type: 'island', pos: [15, -4.35, LOK_Z - 4], size: [80, 4, 60], top: 'grass', under: 0 },
    { type: 'bahnsteig', pos: [GX, 0, LOK_Z + 4], size: [5, 1.1, 40], edge: 'left', sign: 'Schneetal' },
    { type: 'arena_cage', pos: [AX, AY, AZ], radius: AR, height: 5, floor: AY + 4.35, ceiling: 6.4, gate: Math.PI / 2, low: 0.85, color: 0x3a6ae8 },
    { type: 'pipe', id: 'arena_rohr', pos: [AX - 1.5, AY, AZ + AR - 2.2], height: 0.9, color: 0x2fbf4a },
    // Züge
    ...MAIN.list.map((c, i) => carSegment(c, RIDE, MAIN.list[i + 1])),
    ...PAR.list.map((c, i) => carSegment(c, RIDE, PAR.list[i + 1])),
  ],
  blocks: [
    { kind: 'hidden', id: 'block_riese', attach: 'F4', pos: at(M.F4, -2.5, 0, D + 2.4), content: 'riese' },
    { kind: 'question', attach: 'W3', pos: at(M.W3, -2, 0, R + 2.4), content: 'coins:5' },
  ],
  enemies,
  items: [
    ...items,
    { kind: 'steinblock', attach: 'F4', pos: at(M.F4, 0, -0.6, D), content: 'coins:3' },
    { kind: 'steinblock', attach: 'F4', pos: at(M.F4, 0, 0.6, D), content: 'coins:3' },
    { kind: 'steinblock', attach: 'F4', pos: at(M.F4, 0, 0, D + 1), content: 'coins:3' },
    // nach dem Sieg: Warp-Box in der Arena-Mitte → Zielbahnsteig
    { kind: 'warpbox', id: 'warp_sieg', pos: [AX, AY, AZ], target: [GX, 1.4, GZ + 8], hidden: true },
    { kind: 'coins', pos: [GX, 1.6, GZ + 2], r: 1.6, n: 8 },
  ],
  checkpoint: [{ pos: at(M.W5, -3, 0, R), attach: 'W5' }, { pos: [AX - 1.5, AY, AZ + AR - 4.2] }],
  stars: [
    { pos: at(M.W1, -4.4, 0, R + 0.7), attach: 'W1', id: 'stern0' },
  ],
  stamp: { pos: at(M.G1, -3.6, 0, D + 0.6), attach: 'G1' },
  goal: { pos: [GX, 1.1, GZ - 12], height: 8 },
  marks: {
    start: [3.2, 1.1, ZUG.ZR - 6.5], arena: [AX, AY, AZ], goal: [GX, 1.1, GZ - 12],
  },
  // Zug-Daten für Tests (Zug-Koordinaten)
  train: Object.fromEntries([...MAIN.list, ...PAR.list].map((c) => [c.id, { c0: c.c0, c1: c.c1, cc: c.cc, x: c.x ?? 0, style: c.style, len: c.len }])),
};
