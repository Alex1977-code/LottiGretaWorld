// 6-Panzer „Kawumm-Kolonne über den Wolken“ – Welt-6-Panzerfahrt (Archetyp autoscroller + boss, Bauplan 6-Panzer): Baron
// Brummbärs zweite Panzerkolonne rollt auf einer Wolkenstraße hoch über dem Wolkenmeer zur Wolkenburg. Das Bildfenster
// gleitet schneller als die Panzer (6,0 gegen 3,2 m/s) an der Kolonne entlang – die Heldin muss nach vorn, von Panzer zu
// Panzer. An drei Rätsel-Panzern fährt das Fenster eine Weile mit der Kolonne (Zeit für die Zündköpfe). Wer zwischen die
// Panzer fällt, plumpst durch die Wolken. Am Ende hält die Kolonne, die Luke des Kommandopanzers führt in die Burg-Arena:
// Wirbelbrocken mit Attrappen (nach dem 1. Treffer eine, nach dem 2. zwei). Die Warp-Box bringt zur Regenbogeninsel.
//
// Konvoi-Koordinate c (Meter entlang der Kolonne nach vorn, beim Fahrtbeginn z = −c; Fahrplan in _helpers_d.js):
//   1 Abfahrt            T1    c   0 … 14   Wolkenbahnhof, Marschblöcke, ?-Block (Funkenblüte)
//   2 Zündkopf-Panzer    T2    c  16 … 30   erster Zündkopf-Spender, zwei Steinblöcke (Münzen) – werfen lernen
//   3 Turm-Panzer        T3    c  33 … 51   Halt 18 s: drei große ?-Blöcke (nur Explosion) wachsen zur Treppe → Stern 1
//   4 Doppelreihe        T4L/T4R c 53 … 66 links Münzen, rechts ein Feuer-Werfer
//   5 Kontrollpunkt      T5    c  69 … 81   Checkpoint, Marschblöcke, ?-Block (Krallen-Anzug)
//   6 Steinpanzer        T6    c  84 … 94   Steinblock-Pyramide (Münzen, oben ein 1-up) und Zündkopf-Spender
//   7 Hammer-Panzer      T7    c  97 … 106  Hammer-Werfer
//   8 Schatz-Panzer      T8    c 108 … 122  Halt 8 s: Steinblock auf dem Goldsockel sprengen → Stern 2
//   9 Stampf-Panzer      T9    c 126 … 140  Halt 7 s: großer ?-Block (nur Stampfen) fährt die Heldin hinauf → Stern 3
//  10 Werfer-Panzer      T10/T11 c 142 … 166  Feuer-Werfer, Hammer-Werfer auf dem Podest, Marschblöcke
//  11 Münz-Panzer       T12   c 169 … 181  Steinblöcke (Münzen), verborgener 1-up-Block, Marschblöcke
//  12 Kommandopanzer     TK    c 184 … 206  Halt, Luke → Arena; hinter der Luke die Baron-Holzwand → Stempel (sprengen)
//  13 Wolkenburg-Arena   Wirbelbrocken mit Attrappen; Sieg → Warp-Box → Regenbogeninsel mit Zielmast
// Sterne: 1) T3 drei große ?-Blöcke sprengen, über die Turmtreppe hinauf; 2) T8 Steinblock sprengen; 3) T9 großen ?-Block
// per Stampfen hochfahren. Stempel: TK hinter der Luke (Bossröhre), Holzwand sprengen. Geheimnisse: 1-up im obersten
// Steinblock (T6), verborgener 1-up-Block (T12). Gegner: Marschblock (15), Zündkopf (endlos aus 6 Spendern), Feuer-Werfer
// (2), Hammer-Werfer (2), Wirbelbrocken (Boss).

import { panzerSetup } from '../w2/_helpers_d.js';
import {
  kolonnenFahrplan, panzer6, kP, aufPanzer, wolkenStrasse, schwebeInseln, wolkenBurg, kolonnenSetup, regenbogen,
  beiZerstoerung, lichterketten, heissluftballons, strassenSchmuck,
} from './_helpers_d.js';

const VT = 3.2, VW = 6.0, ZP = 20, CW0 = 6;
const D = 2.0;                 // Deckhöhe der Panzer (über der Wolkenstraße y = 0)
const DK = 2.4;                // Kommandopanzer

// ---------------------------------------------------------------------- Panzer (Konvoi-Koordinaten)
const T = {
  T1: { id: 'T1', c: 7, len: 14, w: 5.0, h: D, x: 0 },
  T2: { id: 'T2', c: 23, len: 14, w: 4.6, h: D, x: -0.4, color: 'oliv' },
  T3: { id: 'T3', c: 42, len: 18, w: 6.4, h: D, x: 0 },
  T4L: { id: 'T4L', c: 59, len: 12, w: 4.4, h: D, x: -2.5, color: 'oliv' },
  T4R: { id: 'T4R', c: 60, len: 12, w: 4.4, h: D, x: 2.7 },
  T5: { id: 'T5', c: 75, len: 12, w: 4.8, h: D, x: 0 },
  T6: { id: 'T6', c: 89, len: 10, w: 4.6, h: D, x: -0.4, color: 'oliv' },
  T7: { id: 'T7', c: 101.5, len: 9, w: 4.2, h: D, x: 0.4 },
  T8: { id: 'T8', c: 115, len: 14, w: 5.4, h: D, x: 0 },
  T9: { id: 'T9', c: 133, len: 14, w: 5.6, h: D, x: 0.4, color: 'oliv' },
  T10: { id: 'T10', c: 148, len: 12, w: 4.8, h: D, x: -0.4 },
  T11: { id: 'T11', c: 161, len: 10, w: 4.6, h: D, x: 0.4, color: 'oliv' },
  T12: { id: 'T12', c: 175, len: 12, w: 5.0, h: D, x: 0 },
  TK: { id: 'TK', c: 195, len: 22, w: 6.4, h: DK, x: 0 },
};
// Haltepunkte: das Fenster fährt T s lang mit der Kolonne (Rätsel mit Zündköpfen bzw. Stampfen)
const HOLDS = [{ c: 41, T: 18 }, { c: 115, T: 8 }, { c: 133, T: 7 }];
const PLAN = kolonnenFahrplan({ vt: VT, vw: VW, zp: ZP, cw0: CW0, cEnd: T.TK.c, accel: 6, brake: 3, holds: HOLDS });
const F = { ...PLAN, vt: VT, zp: ZP };

// Weltlage beim Halt: Kommandopanzer, Arena (Wolkenburg davor), Regenbogeninsel mit Zielmast dahinter
const ZK = -(T.TK.c + F.ride);
const AR = 10.5, AY = 6;
const AZ = Math.round((ZK - T.TK.len / 2 - AR - 5.5) * 10) / 10;
const GX = 48, GY = 5, GZ = AZ;                     // Regenbogeninsel seitlich der Burg (eigene Kamera-Schiene)

// Große ?-Blöcke auf T3 (links, Treppe A → B → C; Wachstum so, dass jede Stufe 2,6–3 m höher ist)
const QB = { dx: -2.0, S: 2, steps: [{ id: 'turm_a', dc: -3.6, grow: 1.0 }, { id: 'turm_b', dc: 0.4, grow: 3.6 }, { id: 'turm_c', dc: 4.4, grow: 6.2 }] };
const TOP_C = D + QB.steps[2].grow + QB.S;          // 10,2
// Stampf-Turm auf T9
const Q9 = { dc: 0.5, dx: 0, grow: 7 };
const TOP_9 = D + Q9.grow + 2;                       // 11,0

// Aufbauten (Panzer-Koordinaten: dc vorn, dx rechts, y über der Wolkenstraße)
const RED = 0xc8283a, GOLD = 0xffc21a;
T.T8.parts = [
  // Goldsockel mit vier Pfosten (darauf der Steinblock mit Stern 2)
  { dc: 3.4, dx: 0, y: D, size: [1.8, 0.4, 1.8], color: GOLD, tag: 'sockel' },
  ...[[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]].map(([a, b]) => ({ dc: 3.4 + b, dx: a, y: D + 0.4, size: [0.18, 1.5, 0.18], color: GOLD, tag: 'sockel' })),
];
T.T11.parts = [{ dc: 2.4, dx: -0.9, y: D, size: [2.4, 1.2, 4.0], color: RED, tag: 'podest' }];
// Kommandopanzer: Kammer vor der Luke (Rückseite = Baron-Holzwand, Stempel darin), Krone obenauf
const KAM = { dc0: 5.4, dc1: 9.2, w: 2.6, h: 3.0 };
T.TK.parts = [
  { dc: (KAM.dc0 + KAM.dc1) / 2, dx: -(KAM.w / 2 + 0.25), y: DK, size: [0.5, KAM.h + 0.4, KAM.dc1 - KAM.dc0], color: RED, tag: 'kammer' },
  { dc: (KAM.dc0 + KAM.dc1) / 2, dx: KAM.w / 2 + 0.25, y: DK, size: [0.5, KAM.h + 0.4, KAM.dc1 - KAM.dc0], color: RED, tag: 'kammer' },
  { dc: KAM.dc1 - 0.2, dx: 0, y: DK, size: [KAM.w + 1, KAM.h + 0.4, 0.4], color: RED, tag: 'kammer' },
  { dc: (KAM.dc0 + KAM.dc1) / 2, dx: 0, y: DK + KAM.h, size: [KAM.w + 1, 0.4, KAM.dc1 - KAM.dc0], color: RED, tag: 'kammer' },
  { dc: (KAM.dc0 + KAM.dc1) / 2 + 0.4, dx: 0, y: DK + KAM.h + 0.4, size: [2.2, 0.5, 2.2], color: GOLD, tag: 'krone' },
];
const at = aufPanzer;

// Baron-Holzwand vor der Kammer (Zündkopf sprengt sie), Luke dahinter (Konvoi-Rückseite)
const WALL = { id: 'stempelwand', attach: 'TK', pos: at(T.TK, KAM.dc0 - 0.2, 0), size: [KAM.w, KAM.h, 0.4], hits: 3 };

// Marschblock-Kolonne auf einem Panzer (Bahn in Konvoi-Koordinaten; ride = Panzer, auf dem die Bahn mitfährt)
const loop = (t, c0, c1, x0, x1, o = {}) => ({
  kind: 'marschblock', ride: t.id, path: [kP(c0, t.x + x0, t.h), kP(c0, t.x + x1, t.h), kP(c1, t.x + x1, t.h), kP(c1, t.x + x0, t.h)],
  loop: true, count: o.count ?? 4, spacing: o.spacing ?? 1.35, speed: o.speed ?? 1.2, phase: o.phase ?? 0, id: o.id,
});
const swing = (t, c, x0, x1, o = {}) => ({
  kind: 'marschblock', ride: t.id, path: [kP(c, t.x + x0, t.h), kP(c, t.x + x1, t.h)], count: o.count ?? 3, spacing: o.spacing ?? 1.15,
  speed: o.speed ?? 1.0, phase: o.phase ?? 0, id: o.id,
});
const coins = (t, from, to, n) => ({ kind: 'coins', attach: t.id, from, to, n });
// Zündkopf-Spender auf einem Panzer
const spender = (t, dc, dx, o = {}) => ({
  kind: 'zuendkopf', id: o.id, attach: t.id, pos: at(t, dc, dx), behavior: 'walk', dir: [0, 1], trigger: 1.1, fuse: 4, speed: 0.9, sight: 5,
  spawner: { every: o.every ?? 3, max: o.max ?? 1, first: o.first ?? 0.6, range: o.range ?? 16 },
});
const werfer = (kind, t, dc, dx, o = {}) => ({
  kind, id: o.id, attach: t.id, ride: t.id, pos: at(t, dc, dx, o.y ?? t.h), axis: o.axis ?? [0, 1], pace: o.pace ?? 1.0, sight: 11,
  interval: o.interval ?? 2.4, first: 1.6, jumpEvery: o.jumpEvery ?? 3.8,
});
const stein = (t, dc, dx, y, content, id) => ({ kind: 'steinblock', id, attach: t.id, pos: at(t, dc, dx, y), content });

// ---------------------------------------------------------------------- Kulisse
const STRASSE = { z0: 30, z1: ZK - 26, width: 16 };
const INSELN = [];
{
  const rnd = (i, a, b) => a + ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1 * (b - a);
  for (let i = 0, z = -6; z > ZK - 20; i++, z -= rnd(i, 22, 34)) {
    const s = i % 2 ? 1 : -1;
    INSELN.push({ x: s * rnd(i + 3, 17, 27), y: rnd(i + 7, -2.5, 4.5), z, r: rnd(i + 11, 3.2, 5.2), h: rnd(i + 13, 3, 6) });
  }
}
const BALLONS = [];
{
  const pal = [[0xff4a6a, 0xffe04a], [0x3a8aff, 0xffffff], [0x5ad85a, 0xffe04a], [0xb07aff, 0xff9ad0], [0xff9a3a, 0x3ad0ff]];
  for (let i = 0, z = -14; z > ZK - 30; i++, z -= 23 + (i % 3) * 5) {
    const s = i % 2 ? 1 : -1;
    BALLONS.push({ x: s * (13.5 + (i % 3) * 1.8), y: 10 + (i % 4) * 1.2, z, r: 1.8 + (i % 3) * 0.25, colors: pal[i % pal.length] });
  }
}
const WOLKENBERGE = [];
for (let i = 0; i < 9; i++) {
  const s = i % 2 ? 1 : -1;
  WOLKENBERGE.push({ kind: 'wolkenberg', pos: [s * (46 + (i % 3) * 9), -10, 10 - i * 64], size: 26 + (i % 4) * 5, height: 14 + (i % 3) * 4, shadow: false });
}

export const LEVEL = {
  id: '6-Panzer',
  world: 6,
  title: 'Kawumm-Kolonne über den Wolken',
  archetype: 'autoscroller',
  theme: 'skyway',
  music: 'course_tank',
  timeLimit: 400,
  killY: -4,
  sky: { clouds: true },
  start: { pos: kP(3, -0.6, D), yaw: Math.PI / 2 },
  scroll: {
    path: [[0, 0, ZP], [0, 0, -1500]],
    start: F.start, end: F.end, speed: VW, speeds: F.speeds, accel: 6, delay: 2,
    frame: { back: 5, front: 8, ahead: 1.4, followX: 0.35 },
    cams: [{ s: 0, pitch: 42, dist: 18, fov: 42, height: 1 }],
    with: 'boss',
    startBanner: 'Kolonne – marsch!', endBanner: 'Endstation Wolkenburg!',
  },
  camera: [
    { from: 40, to: ZK - 12, pitch: 42, dist: 18, fov: 42, area: [-30, 30] },
    { from: ZK - 12, to: AZ - 20, pitch: 46, dist: 17, x: 0, xLock: 0.3, ahead: 1.2, lead: 0.5, area: [-30, 30] },
    { from: GZ + 20, to: GZ - 20, pitch: 28, dist: 17, ahead: 2, area: [GX - 16, GX + 16] },
  ],
  boss: {
    id: 'wirbel', name: 'Wirbelbrocken', speed: 0,
    trigger: { min: [-AR, AY - 0.5, AZ - AR], max: [AR, AY + 6, AZ + 6.6] },
    warp: 'warp_sieg', frame: 0.35, musicAfter: 'course_tank',
    phaseBanners: { 3: { text: 'Jetzt wirbelt er wie wild!', hold: 1.5, size: 14, color: '#ffb040' } },
  },
  // Level-Haken: Mitfahr-Regeln der Welt-2-Kolonne (ohne Wüsten-Abendrot) + Welt-6-Ergänzungen (_helpers_d.js)
  setup(level) {
    kolonnenSetup(level, panzerSetup);
    beiZerstoerung(level, 'sternstein', { reveal: 'stern2' });
  },
  build(level) {
    wolkenStrasse(level, STRASSE);
    schwebeInseln(level, INSELN, { seed: 6 });
    heissluftballons(level, BALLONS);
    wolkenBurg(level, { pos: [0, AY, AZ], r: 13 });
    regenbogen(level, { pos: [GX, GY - 1.5, GZ - 12], r: 10, band: 0.55 });
    strassenSchmuck(level, { z0: 2, z1: ZK - 14, every: 16, x: 8.9, y: 0.5, h: 4.8 });
    lichterketten(level, [
      { a: [-6.2, D + 6.2, 15.5], b: [6.2, D + 6.2, 15.5], sag: 1.2, kind: 'wimpel', every: 0.6 },
      { a: [-6.2, D + 6.0, 4.6], b: [-6.2, D + 6.0, 15.5], sag: 1.0, kind: 'wimpel', every: 0.6 },
      { a: [6.2, D + 6.0, 4.6], b: [6.2, D + 6.0, 15.5], sag: 1.0, kind: 'wimpel', every: 0.6 },
    ]);

  },
  // level-lokale Teile der Welt-2-Kolonne (Luke, Holzwand, Wimpel)
  panzer: {
    luke: { id: 'luke', attach: 'TK', pos: at(T.TK, -1.2, 0), target: 'arena_rohr' },
    walls: [WALL],
    flags: [
      { on: 'T1', dc: -6, dx: 2.2 }, { on: 'T3', dc: -8.2, dx: 2.6 }, { on: 'T4R', dc: 5, dx: 1.8 }, { on: 'T5', dc: -5.2, dx: 2.0 },
      { on: 'T8', dc: -6.2, dx: 2.3 }, { on: 'T9', dc: 6.2, dx: -2.4 }, { on: 'T11', dc: -4.2, dx: -1.9 }, { on: 'T12', dc: 5.4, dx: 2.1 },
      { on: 'TK', dc: -10, dx: 2.8 }, { on: 'TK', dc: -10, dx: -2.8 }, { on: 'TK', dc: 7.7, dx: 0, y: DK + KAM.h + 0.9, h: 2.4 },
    ],
  },
  segments: [
    // ---------------------------------------------------------------- Wolkenbahnhof (Start, hinter T1)
    { type: 'island', pos: [0, -3, 9.6], size: [14, 3 + D, 15.6], top: 'stone', under: 0 },
    { type: 'island', pos: [0, -6.5, 9.6], size: [10, 3.5, 12], top: 'none', under: 3 },
    { type: 'deco_w6', items: [
      { kind: 'wolke', pos: [-8.4, D - 0.6, 9], size: 3.4 }, { kind: 'wolke', pos: [8.6, D - 0.8, 12], size: 3.0 },
      { kind: 'bergblumen', pos: [0, D, 13.6], size: [11, 3], n: 12, seed: 4 },
      { kind: 'bergkiefer', pos: [-5.6, D, 16.2], height: 3.6 }, { kind: 'bergkiefer', pos: [5.4, D, 16.4], height: 3.2 },
      ...WOLKENBERGE,
    ] },
    { type: 'sign', pos: [-4.4, D, 7.2], text: 'Kawumm-\nKolonne', size: [2.6, 1.1], yaw: 0.3 },
    { type: 'sign', pos: [4.6, D, 6.8], text: 'Zündkopf:\nAktion = werfen', size: [2.8, 1.1], yaw: -0.3 },
    { type: 'pennants', items: [
      { pos: [-6.4, D, 16.6], color: 0xff4a6a, h: 7 }, { pos: [6.4, D, 16.6], color: 0x3a8aff, h: 7 },
      { pos: [-6.4, D, 2.6], color: 0xffd04a, h: 6 }, { pos: [6.4, D, 2.6], color: 0x5ad85a, h: 6 },
      { pos: [-11, AY, AZ + 9], color: 0xff4a6a, h: 7 }, { pos: [11, AY, AZ + 9], color: 0x3a8aff, h: 7 },
      { pos: [-12.5, AY, AZ - 4], color: 0xffd04a, h: 8 }, { pos: [12.5, AY, AZ - 4], color: 0x5ad85a, h: 8 },
    ] },
    // ---------------------------------------------------------------- Wolkenburg-Arena (nach dem Halt)
    { type: 'arena_cage', pos: [0, AY, AZ], radius: AR, height: 5, floor: 2.4, ceiling: 6.4, gate: Math.PI, low: 0.85, color: 0xffd04a },
    { type: 'pipe', id: 'arena_rohr', pos: [0, AY, AZ + 8.8], height: 0.9, color: 0xc0283a },
    { type: 'torches', h: 2.4, items: [[-9, AY, AZ + 9.8], [9, AY, AZ + 9.8]] },
    // ---------------------------------------------------------------- Regenbogeninsel mit Zielmast (nur über die Warp-Box)
    { type: 'island', pos: [GX, GY - 4, GZ], size: [20, 4, 26], top: 'grass', under: 3 },
    { type: 'deco_w6', items: [
      { kind: 'bergblumen', pos: [GX, GY, GZ + 2], size: [16, 20], n: 24, seed: 9 },
      { kind: 'bergkiefer', pos: [GX - 7.6, GY, GZ - 9], height: 4.2 }, { kind: 'bergkiefer', pos: [GX + 7.4, GY, GZ - 10], height: 3.6 },
      { kind: 'wolke', pos: [GX - 11, GY - 1, GZ + 4], size: 4 }, { kind: 'wolke', pos: [GX + 11.5, GY - 1.2, GZ - 3], size: 3.6 },
    ] },
    { type: 'sign', pos: [GX - 6.5, GY, GZ + 10.5], text: 'Regenbogen-\ninsel', size: [2.6, 1.1], yaw: 0.25 },
    // ---------------------------------------------------------------- Panzerkolonne
    ...Object.values(T).map((t) => panzer6(t, F)),
  ],
  blocks: [
    { kind: 'question', attach: 'T1', pos: at(T.T1, -1.2, 0.6, D + 3.0), content: 'funken' },
    { kind: 'question', attach: 'T5', pos: at(T.T5, 2.4, 1.2, D + 3.0), content: 'krallen' },
    { kind: 'hidden', attach: 'T12', pos: at(T.T12, -0.6, 1.4, D + 3.2), content: 'oneup' },
  ],
  enemies: [
    // Marschblöcke (15) – je Panzer bleibt eine Spur frei
    loop(T.T1, 10.2, 13.2, 0.0, 1.9, { id: 'mb1', count: 3 }),
    loop(T.T5, 76, 79.6, -1.8, 0.2, { id: 'mb5', count: 4, phase: 0.3 }),
    loop(T.T9, 136.4, 139.4, -2.2, -0.3, { id: 'mb9', count: 3, spacing: 1.3, speed: 1.0 }),
    swing(T.T10, 144.4, -1.9, -0.3, { id: 'mb10', count: 3 }),
    swing(T.T12, 172.2, -2.1, -0.4, { id: 'mb12', count: 2 }),
    // Zündkopf-Spender (endlos)
    spender(T.T2, 5.2, 1.3, { id: 'zk2', every: 4 }),
    spender(T.T3, 7.6, 1.6, { id: 'zk3v', every: 2.2, max: 2, first: 0.2 }),
    spender(T.T3, -6.6, 1.6, { id: 'zk3h', every: 2.6, max: 1 }),
    spender(T.T6, -3.4, 1.4, { id: 'zk6', every: 4.5 }),
    spender(T.T8, -4.4, -1.6, { id: 'zk8', every: 3, max: 1 }),
    spender(T.TK, -8.4, -2.0, { id: 'zkk', every: 3.5, max: 1, range: 20 }),
    // Werfer-Brüder
    werfer('feuer_werfer', T.T4R, 3.0, 1.2, { id: 'fw4' }),
    werfer('hammer_werfer', T.T7, 1.6, -0.9, { id: 'hw7', interval: 2.8 }),
    werfer('feuer_werfer', T.T10, 3.4, -1.2, { id: 'fw10', interval: 2.2 }),
    werfer('hammer_werfer', T.T11, 2.4, -0.9, { id: 'hw11', y: D + 1.2, pace: 0.7, interval: 2.6 }),
    // Endgegner in der Wolkenburg
    { kind: 'wirbelbrocken', id: 'wirbel', pos: [0, AY, AZ - 3], arena: { center: [0, AY, AZ], r: AR - 0.4 }, decoys: true },
  ],
  items: [
    // große ?-Blöcke: T3 (Treppe, nur Explosion), T9 (nur Stampfen)
    ...QB.steps.map((q, i) => ({
      kind: 'riesenfrageblock', id: q.id, attach: 'T3', pos: at(T.T3, q.dc, QB.dx), size: QB.S, grow: q.grow, speed: 3, trigger: ['bomb'],
      content: i === 2 ? 'coins:5' : 'coins:3', onGrow: i === 2 ? { reveal: 'stern1' } : null,
    })),
    { kind: 'riesenfrageblock', id: 'turm9', attach: 'T9', pos: at(T.T9, Q9.dc, Q9.dx), size: 2, grow: Q9.grow, speed: 3, trigger: ['pound'], content: 'coins:5' },
    // Steinblöcke: T2 (Münzen), T6 (Pyramide, oben 1-up), T8 (Stern 2), T12 (Münzen)
    stein(T.T2, -0.6, -1.2, D, 'coins:2'), stein(T.T2, -0.6, -1.2, D + 1, 'coins:2'), stein(T.T2, -1.6, -1.2, D, 'coin'),
    stein(T.T6, 2.0, -0.5, D, 'coins:2'), stein(T.T6, 2.0, 0.5, D, 'coins:2'), stein(T.T6, 2.0, 0, D + 1, 'oneup', 'stein_1up'),
    stein(T.T8, 3.4, 0, D + 0.4, null, 'sternstein'),
    stein(T.T12, 3.6, -1.0, D, 'coins:3'), stein(T.T12, 3.6, 0, D, 'coins:2'),
    // Münzen (Bitcoins) – Spuren über die Lücken und auf den Decks
    coins(T.T1, at(T.T1, -4.5, -1.8, D + 0.6), at(T.T1, 0, -1.8, D + 0.6), 4),
    coins(T.T1, kP(15, 0, D + 1.4), kP(15, 0, D + 1.4), 1),
    coins(T.T2, at(T.T2, -6, 1.4, D + 0.6), at(T.T2, -2, 1.4, D + 0.6), 3),
    coins(T.T3, kP(31.5, 0.6, D + 1.5), kP(31.5, 0.6, D + 1.5), 1),
    // Hinweis-Münzen über den großen ?-Blöcken: dort enden die Türme
    ...QB.steps.map((q) => coins(T.T3, at(T.T3, q.dc, QB.dx, D + q.grow + QB.S + 0.7), at(T.T3, q.dc, QB.dx, D + q.grow + QB.S + 0.7), 1)),
    coins(T.T4L, at(T.T4L, -4, -0.4, D + 0.6), at(T.T4L, 4, -0.4, D + 0.6), 5),
    coins(T.T5, at(T.T5, -4.5, 1.8, D + 0.6), at(T.T5, -1, 1.8, D + 0.6), 3),
    coins(T.T6, kP(82.5, 0, D + 1.6), kP(82.5, 0, D + 1.6), 1),
    coins(T.T7, at(T.T7, -3.2, -1.0, D + 0.6), at(T.T7, -0.4, -1.0, D + 0.6), 3),
    { kind: 'coins', attach: 'T8', pos: at(T.T8, 3.4, 0, D + 0.8), r: 1.7, n: 6 },
    // Stampf-Turm: Münzsäule, durch die der wachsende Turm die Heldin trägt
    coins(T.T9, at(T.T9, Q9.dc, Q9.dx, D + 2 + 1.4), at(T.T9, Q9.dc, Q9.dx, TOP_9 - 0.6), 5),
    coins(T.T10, at(T.T10, -4.6, 1.4, D + 0.6), at(T.T10, -1.2, 1.4, D + 0.6), 3),
    coins(T.T11, at(T.T11, 1.0, -0.9, D + 2.0), at(T.T11, 3.8, -0.9, D + 2.0), 3),
    coins(T.T12, at(T.T12, 1.2, 1.4, D + 0.6), at(T.T12, 4.0, 1.4, D + 0.6), 3),
    { kind: 'coins', attach: 'TK', pos: at(T.TK, -6.0, 0, DK + 0.5), r: 2.0, n: 6 },
    // nach dem Sieg: Warp-Box in der Arena → Regenbogeninsel
    { kind: 'warpbox', id: 'warp_sieg', pos: [0, AY, AZ - 1], target: [GX, GY + 0.3, GZ + 8], hidden: true },
    { kind: 'coins', pos: [GX, GY + 1.2, GZ + 2], r: 2.6, n: 10 },
  ],
  checkpoint: [{ pos: at(T.T5, -3.6, 1.6), attach: 'T5' }, { pos: [0.85, AY, AZ + 7.3] }],
  stars: [
    { pos: at(T.T3, QB.steps[2].dc, QB.dx, TOP_C + 0.8), attach: 'T3', id: 'stern1', hidden: true },
    { pos: at(T.T8, 3.4, 0, D + 0.5), attach: 'T8', id: 'stern2', hidden: true },
    { pos: at(T.T9, Q9.dc, Q9.dx, TOP_9 + 1.0), attach: 'T9', id: 'stern3' },
  ],
  stamp: { pos: at(T.TK, (KAM.dc0 + KAM.dc1) / 2, 0, DK + 0.7), attach: 'TK' },
  goal: { pos: [GX, GY, GZ - 6], height: 8 },
  marks: {
    start: kP(3, -0.6, D), turm: at(T.T3, 0, 0), stein2: at(T.T8, 3.4, 0), turm9: at(T.T9, Q9.dc, Q9.dx), wand: WALL.pos,
    luke: at(T.TK, -1.2, 0, DK), arena: [0, AY, AZ], insel: [GX, GY, GZ + 8], goal: [GX, GY, GZ - 6],
  },
  // Konvoi-Daten für Tests (Panzer: Mitte c, Länge, Breite, Spur, Deck) und Fahrplan
  convoy: Object.fromEntries(Object.values(T).map((t) => [t.id, { c: t.c, len: t.len, w: t.w, x: t.x, h: t.h }])),
  plan: { vt: VT, vw: VW, zp: ZP, cw0: CW0, holds: HOLDS, ride: F.ride, T: F.T, zk: ZK, az: AZ, gx: GX, gz: GZ, qb: QB, q9: Q9, kam: KAM },
};
