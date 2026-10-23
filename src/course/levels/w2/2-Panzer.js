// 2-Panzer „Brummbärs Panzerparade“ – Welt-2-Finale (Archetyp autoscroller + boss, Bauplan 2-Panzer): Baron
// Brummbärs Panzerkolonne rollt im Abendrot durch das Treibsandmeer zu seinem Festungspanzer. Das Bildfenster gleitet
// schneller als die Panzer (5,2 gegen 3 m/s) am Zug entlang – die Heldin muss nach vorn, von Panzer zu Panzer. Wer in
// den Treibsand fällt, versinkt (mit etwas Glück reicht ein schwacher Sprung zurück aufs Deck). Am Ende hält der Zug,
// die Luke des Kommandopanzers öffnet sich und führt auf den Geschützturm des Festungspanzers: Kampf gegen
// Wirbelbrocken (drei Phasen). Danach flieht Baron Brummbär im roten Sportwagen, die Warp-Box führt zur Oase mit
// der befreiten Flocke und dem Zielmast.
//
// Konvoi-Koordinate c (Meter entlang des Zugs nach vorn, beim Fahrtbeginn z = −c; Rechnung in _helpers_d.js):
//   1 Erster Panzer      T1   c   1 … 15   Start, Marschblöcke, ?-Block (Funkenblüte) oben
//   2 Zweiter Panzer     T2   c  17 … 32   Kisten, Münzen, Marschblöcke; Projektilköpfe der Kanone 1 von vorn
//   3 Dritter Panzer     T3   c  34 … 51   Kanonen-Helm (Kasten am Heck), roter Ring, Kanone 1 (mit Helm zerstörbar)
//   4 Doppelreihe        T4L/T4R c 53 … 66 nebeneinander: links rote Münzen, rechts drei Feuer-Schnappblumen um
//                                          Stern 1;  T5 c 69 … 81 Checkpoint, Marschblöcke
//   5 Zweite Welle       T6 … T11 c 85 … 163  Lücken 3–5 m: kleiner Beipanzer mit Sternkiste (Stern 2), Metalltor
//                                          hinter Holzkisten (Stempel über dem Sturz), Lastenpanzer mit Holzwand
//                                          (Baron-Gesicht) → Stern 3 nur mit Kanonen-Helm, Kanone 2, Feuer-Schnappblume
//   6 Kommandopanzer     TK   c 166 … 186  Halt, Luke → Bossarena
//   7 Bossarena          Geschützturm (Ø 21 m) auf dem Festungspanzer, Wirbelbrocken; Sieg → Baron flieht,
//                        Warp-Box → Oase (Münzkreis, Flocke im Käfig, Zielmast)
// Sterne: 1 zwischen drei Feuer-Schnappblumen (T4R), 2 in der Kiste auf dem Beipanzer (T7s), 3 hinter der Holzwand
// (T9, Kanonen-Helm). Stempel: über dem Metalltor (T8, über die Kisten auf den Sturz). Gegner: Marschblock (25),
// Projektilkopf (endlos aus 2 Kanonen), Feuer-Schnappblume (4), Wirbelbrocken.

import { VW, ZP, CW0, ACCEL, DELAY, WIN_END, P, onTank, tank, panzerBuild, panzerSetup } from './_helpers_d.js';

const D = 2.0;                 // Deckhöhe der Panzer (über der Fahrebene y = 0)
const DK = 2.4;                // Kommandopanzer
const AZ = -492, AY = 7, AR = 10.5;      // Bossarena (Mitte, Boden, Innenradius)
const GX = 68, GZ = -493;                // Oase mit Zielmast (ganz im 32-m-Abschnitt der Festung: Sichtweite)

// ---------------------------------------------------------------------- Panzer (Konvoi-Koordinaten)
const T = {
  T1: { id: 'T1', c: 8, len: 14, w: 5.0, h: D, x: 0 },
  T2: { id: 'T2', c: 24.5, len: 14, w: 4.6, h: D, x: -0.4 },
  T3: { id: 'T3', c: 42.5, len: 16, w: 5.0, h: D, x: 0 },
  T4L: { id: 'T4L', c: 59, len: 12, w: 4.4, h: D, x: -2.5, color: 'oliv' },
  T4R: { id: 'T4R', c: 60, len: 12, w: 4.4, h: D, x: 2.7 },
  T5: { id: 'T5', c: 75, len: 12, w: 4.8, h: D, x: 0 },
  T6: { id: 'T6', c: 89, len: 8, w: 4.2, h: D, x: -0.4 },
  T7: { id: 'T7', c: 100, len: 8, w: 4.0, h: D, x: -1.8 },
  T7s: { id: 'T7s', c: 101, len: 6, w: 3.0, h: D, x: 2.4, color: 'oliv' },
  T8: { id: 'T8', c: 114, len: 12, w: 4.6, h: D, x: 0 },
  T9: { id: 'T9', c: 131, len: 14, w: 6.4, h: D, x: 0.6, color: 'oliv' },
  T10: { id: 'T10', c: 146, len: 8, w: 4.2, h: D, x: -0.6 },
  T11: { id: 'T11', c: 158.5, len: 8, w: 4.2, h: D, x: 0.4 },
  TK: { id: 'TK', c: 176, len: 20, w: 6.0, h: DK, x: 0 },
};
// Aufbauten (Panzer-Koordinaten: dc vorn, dx rechts, y über der Fahrebene)
const RED = 0x9a1626, GOLD = 0xffc21a, IRON = 0x5a5468;
T.T9.parts = [
  // Kammer rechts (Holzwand hinten = Rückwand, Stern 3 darin)
  { dc: -1, dx: 0.15, y: D, size: [0.3, 3.0, 4.0], color: RED, tag: 'kammer' },
  { dc: -1, dx: 3.05, y: D, size: [0.3, 3.0, 4.0], color: RED, tag: 'kammer' },
  { dc: 0.85, dx: 1.6, y: D, size: [3.2, 3.0, 0.3], color: RED, tag: 'kammer' },
  { dc: -1, dx: 1.6, y: D + 3.0, size: [3.2, 0.3, 4.0], color: RED, tag: 'kammer' },
  { dc: -2.95, dx: 1.6, y: D + 3.0, size: [3.3, 0.36, 0.14], color: GOLD, tag: 'kammer' },
];
T.TK.parts = [
  { dc: 7.2, dx: 0, y: DK, size: [3.8, 1.3, 3.6], color: RED, tag: 'kommandoturm' },
  { dc: 7.2, dx: 0, y: DK + 1.3, size: [2.4, 0.9, 2.2], color: GOLD, tag: 'kommandoturm' },
];
const at = (t, dc, dx, y = t.h) => onTank(t, dc, dx, y);

// Holzwand-Kammer, Metalltor, Luke (level-lokal, siehe _helpers_d.js)
const WALL = { id: 'wand', attach: 'T9', pos: at(T.T9, -2.85, 1.6), size: [2.6, 3.0, 0.4], hits: 3, content: { reveal: 'stern3' } };
const GATE = { id: 'tor', attach: 'T8', pos: at(T.T8, 2.5, 0), width: 3.4, height: 3.2 };

// rote Münzen (roter Ring auf T3, 10 s): über T3, die Lücke und die Doppelreihe verteilt
const RED_COINS = [
  P(47.2, -1.6, D + 0.7), P(49.8, 1.9, D + 0.7), P(51.8, -1.6, D + 1.7), P(55.5, -3.6, D + 0.7),
  P(59.5, -1.3, D + 0.7), P(62.2, 0.1, D + 1.9), P(63.6, -2.8, D + 0.7), P(65.2, 3.9, D + 0.7),
];

// Marschblock-Kolonne auf einem Panzer (Bahn in Konvoi-Koordinaten; ride = Panzer, auf dem die Bahn mitfährt)
const loop = (t, c0, c1, x0, x1, o = {}) => ({
  kind: 'marschblock', ride: t.id, path: [P(c0, t.x + x0, t.h), P(c0, t.x + x1, t.h), P(c1, t.x + x1, t.h), P(c1, t.x + x0, t.h)],
  loop: true, count: o.count ?? 4, spacing: o.spacing ?? 1.35, speed: o.speed ?? 1.25, phase: o.phase ?? 0, id: o.id,
});
const swing = (t, c, x0, x1, o = {}) => ({
  kind: 'marschblock', ride: t.id, path: [P(c, t.x + x0, t.h), P(c, t.x + x1, t.h)], count: o.count ?? 3, spacing: o.spacing ?? 1.15,
  speed: o.speed ?? 1.0, phase: o.phase ?? 0, id: o.id,
});
const coins = (t, from, to, n) => ({ kind: 'coins', attach: t.id, from, to, n });

// ---------------------------------------------------------------------- Kulisse
// Felsinseln im Treibsandmeer links/rechts der Strecke (fahren am Zug vorbei) mit Kakteen, Felsen, Ruinen, Wimpeln
const ISLES = [];
const PENNANTS = [];
{
  const spots = [
    [-16, -20, 12, 12, 1.4], [17, -46, 12, 16, 0.9], [-18, -80, 14, 14, 2.2], [15, -106, 10, 12, 1.2],
    [-16, -138, 12, 16, 1.0], [18, -176, 14, 14, 2.4], [-17, -208, 12, 12, 1.6], [16, -236, 12, 16, 1.1],
    [-19, -268, 14, 16, 2.0], [16, -298, 12, 12, 1.4], [-16, -340, 12, 14, 1.2], [18, -364, 14, 16, 2.0],
    [-18, -394, 14, 14, 1.5], [16, -424, 12, 12, 1.0],
  ];
  spots.forEach(([x, z, w, d, h], i) => {
    ISLES.push({ type: 'island', pos: [x, -3, z], size: [w, 3 + h, d], top: 'sand', under: 0 });
    const top = h;
    const items = [];
    if (i % 3 === 0) items.push({ kind: 'kakteen', pos: [x, top, z], size: [w - 3, d - 3], n: 5, seed: 11 + i });
    if (i % 3 === 1) items.push({ kind: 'felsen', pos: [x + Math.sign(x) * 2, top, z], size: [w - 4, d - 4], n: 2, height: [4, 9], seed: 21 + i });
    if (i % 3 === 2) items.push({ kind: 'ruinen', pos: [x, top, z], size: [w - 4, d - 4], n: 3, seed: 31 + i });
    if (i % 4 === 1) items.push({ kind: 'kaktus', pos: [x - Math.sign(x) * (w / 2 - 1.5), top, z + 2], variant: 'saeule', size: 1.3 });
    if (i % 5 === 2) items.push({ kind: 'palmen', pos: [x, top, z], size: [w - 4, d - 4], n: 2, seed: 41 + i });
    items.push({ kind: 'duenen', pos: [x + Math.sign(x) * 3, top, z], size: [w - 2, d - 2], n: 2, height: [0.6, 1.4], seed: 51 + i });
    ISLES.push({ type: 'deco_w2', items });
    PENNANTS.push({ pos: [x - Math.sign(x) * (w / 2 - 1.2), top, z - d / 2 + 1.5], color: 0xb01e2e, h: 6 + (i % 3) });
  });
}

export const LEVEL = {
  id: '2-Panzer',
  world: 2,
  title: 'Brummbärs Panzerparade',
  archetype: 'autoscroller',
  theme: 'desert',
  music: 'course_tank',
  // Aufbau-Haken vor dem ersten Baustein: Abendrot-Farben (die Bausteine nutzen sie) und Festungspanzer (verschmolzen)
  prebuild: panzerBuild,
  timeLimit: 400,
  killY: -8,
  start: { pos: P(3, -0.6, D), yaw: Math.PI / 2 },
  scroll: {
    path: [[0, 0, ZP], [0, 0, -1500]],
    start: ZP + CW0, end: WIN_END, speed: VW, accel: ACCEL, delay: DELAY,
    frame: { back: 5, front: 8, ahead: 1.4, followX: 0.35 },
    with: 'boss',
    startBanner: "Los geht's!", endBanner: 'Endstation!',
  },
  camera: [
    { from: 40, to: -446, pitch: 40, dist: 16, fov: 40, area: [-48, 48] },
    { from: -454, to: -540, pitch: 46, dist: 17, x: 0, xLock: 0.3, ahead: 1.2, lead: 0.5, area: [-46, 46] },
    { from: -462, to: -525, pitch: 42, dist: 12.5, ahead: 2, area: [50, 90] },
  ],
  boss: {
    id: 'wirbel', name: 'Wirbelbrocken', speed: 0,
    trigger: { min: [-AR, AY - 0.5, AZ - AR], max: [AR, AY + 6, AZ + 6.6] },
    warp: 'warp_sieg', frame: 0.35, musicAfter: 'course_tank',
    // Phase 3: eigene Ansage statt „Vorsicht – Feuerspur!“ (gilt dem Baron)
    phaseBanners: { 3: { text: 'Jetzt wirbelt er wie wild!', hold: 1.5, size: 14, color: '#ffb040' } },
  },
  // Level-Haken (Präzisierung „Level-Haken“): lokale Teile, Mitfahr-Regeln, Baron-Szene (_helpers_d.js)
  setup: panzerSetup,
  // level-lokale Teile (_helpers_d.js)
  panzer: {
    quicksand: 'treibsand',
    luke: { id: 'luke', attach: 'TK', pos: at(T.TK, 2, 0), target: 'arena_rohr' },
    walls: [WALL],
    gates: [GATE],
    helmets: [
      { id: 'helm1', on: 'T3', dc: -5.5, dx: -1.5, every: 6 },
      { id: 'helm2', on: 'T6', dc: 1.8, dx: 1.2, every: 8 },
    ],
    flags: [
      { on: 'T1', dc: -6, dx: 2.2 }, { on: 'T3', dc: -7.4, dx: 2.2 }, { on: 'T4R', dc: 5, dx: 1.8 }, { on: 'T5', dc: -5.2, dx: 2.0 },
      { on: 'T8', dc: -5.2, dx: 1.9 }, { on: 'T9', dc: 6.2, dx: -2.8 }, { on: 'T11', dc: -3.4, dx: -1.7 },
      { on: 'TK', dc: -8.6, dx: 2.6 }, { on: 'TK', dc: -8.6, dx: -2.6 }, { on: 'TK', dc: 7.2, dx: 0, y: DK + 2.2, h: 2.6 },
    ],
    fortress: { pos: [0, 0.6, AZ], length: 28, width: 24, deck: 4.0 },
    baron: { from: [44, 0.6, -468], stop: [16.5, 0.6, -493], away: [34, 0.6, -566] },
  },
  segments: [
    // Laterne am Bahnsteig (früher Aufbau-Haken; Abendrot und Festungspanzer jetzt über LEVEL.prebuild)
    { type: 'lantern', id: 'laterne', pos: [-5.6, D, 4.2], lit: true },
    { type: 'lantern', pos: [5.6, D, 4.2], lit: true },
    // Treibsandmeer (Oberfläche y = 0,3) bis zur Festung
    { type: 'quicksand', id: 'treibsand', pos: [0, -1.0, -205], size: [96, 1.3, 472], sink: 0.3, flow: [0, 0.25], color: 0xcf9a5c },
    // Depot am Start (Bahnsteig, Einfahrtsbogen)
    { type: 'island', pos: [0, -3, 9.4], size: [14, 3 + D, 15.6], top: 'stone', under: 0 },
    { type: 'deco_w2', items: [
      { kind: 'bogen', pos: [0, D, 13.5], width: 12, height: 9, thickness: 1.6, yaw: Math.PI / 2 },
      { kind: 'kaktus', pos: [-5.2, D, 10], variant: 'saeule', size: 1.1 }, { kind: 'kaktus', pos: [5.4, D, 8.5], variant: 'gruppe' },
    ] },
    // Begrüßungsschild auf der ersten Felsinsel (die Kamera steht beim Start über dem Bahnsteig)
    { type: 'sign', pos: [-12.2, 1.4, -15.0], text: 'Brummbärs\nPanzerparade', size: [3.2, 1.3], yaw: 0.35 },
    ...ISLES,
    // zwei hohe Sandsteinbögen über der Strecke
    { type: 'island', pos: [-17, -3, -152], size: [6, 4, 6], top: 'sand', under: 0 },
    { type: 'island', pos: [17, -3, -152], size: [6, 4, 6], top: 'sand', under: 0 },
    { type: 'island', pos: [-17, -3, -322], size: [6, 4.4, 6], top: 'sand', under: 0 },
    { type: 'island', pos: [17, -3, -322], size: [6, 4.4, 6], top: 'sand', under: 0 },
    { type: 'deco_w2', items: [
      { kind: 'bogen', pos: [0, 1, -152], width: 34, height: 15, thickness: 2.6, yaw: Math.PI / 2, solid: false },
      { kind: 'bogen', pos: [0, 1.4, -322], width: 34, height: 17, thickness: 2.8, yaw: Math.PI / 2, solid: false },
    ] },
    // Festung: Plateau, Festungspanzer (Kulisse, vom Haken verschmolzen) mit Geschützturm-Arena
    { type: 'deco_w2', items: [{ kind: 'sandflaeche', pos: [0, 0.6, -500.5], size: [92, 119], cell: 6, color: 0xeab878, color2: 0xd8a062 }] },
    { type: 'arena_cage', pos: [0, AY, AZ], radius: AR, height: 5, floor: 2.4, ceiling: 6.4, gate: Math.PI, low: 0.85, color: GOLD },
    { type: 'pipe', id: 'arena_rohr', pos: [0, AY, AZ + 9.0], height: 0.9, color: 0xc0283a },
    { type: 'torches', h: 2.4, items: [[-16, 0.6, -472], [16, 0.6, -472], [-16, 0.6, -512], [16, 0.6, -512]] },
    { type: 'deco_w2', items: [
      { kind: 'kakteen', pos: [-30, 0.6, -470], size: [18, 30], n: 4, seed: 5 },
      { kind: 'felsen', pos: [34, 0.6, -530], size: [16, 30], n: 2, height: [5, 11], seed: 7 },
      { kind: 'ruinen', pos: [-30, 0.6, -526], size: [14, 20], n: 2, seed: 9 },
      { kind: 'pyramide', pos: [-28, 0.6, -548], size: 12, steps: 5 },
    ] },
    // Oase mit Zielmast (nur über die Warp-Box nach dem Sieg)
    // Sandinsel aus vier Stücken um das Wasserbecken (der Baustein `oase` bringt Rand und Becken selbst mit)
    { type: 'island', pos: [GX - 2, -3, GZ + 11.5], size: [28, 3.6, 11], top: 'sand', under: 0 },
    { type: 'island', pos: [GX - 2, -3, GZ - 10.5], size: [28, 3.6, 17], top: 'sand', under: 0 },
    { type: 'island', pos: [GX - 10, -3, GZ + 2], size: [12, 3.6, 8], top: 'sand', under: 0 },
    { type: 'island', pos: [GX + 8.5, -3, GZ + 2], size: [7, 3.6, 8], top: 'sand', under: 0 },
    { type: 'oase', pos: [GX + 0.5, 0.6, GZ + 2], size: [5, 4], base: 0.8, palms: 3 },
    { type: 'deco_w2', items: [
      { kind: 'palmen', pos: [GX - 12, 0.6, GZ - 12], size: [6, 8], n: 3, seed: 3 },
      { kind: 'kakteen', pos: [GX + 7, 0.6, GZ - 12], size: [6, 6], n: 3, seed: 4 },
      { kind: 'duenen', pos: [GX + 6, 0.6, GZ + 12], size: [8, 6], n: 2, height: [0.4, 0.9], seed: 6 },
    ] },
    { type: 'sign', pos: [GX - 13, 0.6, GZ + 12.5], text: 'Oase\nder Freiheit', yaw: 0.25 },
    { type: 'pennants', items: [
      ...PENNANTS,
      { pos: [-6.2, D, 15.5], color: 0xb01e2e, h: 7 }, { pos: [6.2, D, 15.5], color: 0xb01e2e, h: 7 },
      { pos: [-14, 0.6, -446], color: 0xb01e2e, h: 9 }, { pos: [14, 0.6, -446], color: 0xb01e2e, h: 9 },
      { pos: [-24, 0.6, -500], color: 0xffc21a, h: 8 }, { pos: [24, 0.6, -500], color: 0xffc21a, h: 8 },
    ] },
    // ---------------------------------------------------------------- Panzerkolonne
    ...Object.values(T).map(tank),
  ],
  blocks: [
    { kind: 'question', attach: 'T1', pos: at(T.T1, -1.2, 0.6, D + 3.0), content: 'funken' },
  ],
  enemies: [
    // Marschblöcke (25)
    loop(T.T1, 10.4, 14.2, -1.6, 1.6, { id: 'mb1', count: 4 }),
    swing(T.T2, 28.2, -2.0, 1.4, { id: 'mb2', count: 3 }),
    loop(T.T5, 76, 80.2, -1.7, 1.7, { id: 'mb5', count: 5, phase: 0.3 }),
    swing(T.T6, 91.2, -1.6, 1.2, { id: 'mb6', count: 2, speed: 0.9 }),
    loop(T.T9, 133.2, 137.4, -2.2, -0.4, { id: 'mb9', count: 4, spacing: 1.25, speed: 1.0 }),
    swing(T.T11, 156.6, -1.4, 1.6, { id: 'mb11', count: 2 }),
    loop(T.TK, 168.5, 173.5, -2.3, 2.3, { id: 'mbk', count: 5, speed: 1.1 }),
    // Kanonen (Projektilköpfe von vorn, Rohr folgt der Figur)
    { kind: 'kanone_turm', id: 'kanone1', attach: 'T3', pos: at(T.T3, 7.1, 0), dir: [0, 1], height: 1.4, track: true, interval: 3.4, first: 1.5, range: 20, minRange: 2.2, max: 2, speed: 4.5 },
    { kind: 'kanone_turm', id: 'kanone2', attach: 'T10', pos: at(T.T10, 0.6, 1.0), dir: [0, 1], height: 1.4, track: true, interval: 3.0, first: 1.0, range: 22, minRange: 2.2, max: 2, speed: 4.8 },
    // Feuer-Schnappblumen: drei um Stern 1 (T4R), eine auf T11
    { kind: 'feuer_schnappblume', id: 'fs1', attach: 'T4R', pos: at(T.T4R, -2.8, -1.2), base: 'pot', range: 9, pause: 1.7 },
    { kind: 'feuer_schnappblume', id: 'fs2', attach: 'T4R', pos: at(T.T4R, -2.8, 1.2), base: 'pot', range: 9, pause: 1.9 },
    { kind: 'feuer_schnappblume', id: 'fs3', attach: 'T4R', pos: at(T.T4R, 3.4, 0), base: 'pot', range: 9, pause: 1.8 },
    { kind: 'feuer_schnappblume', id: 'fs4', attach: 'T11', pos: at(T.T11, 2.4, 1.3), base: 'pot', range: 9, pause: 1.6 },
    // Endgegner auf dem Geschützturm
    { kind: 'wirbelbrocken', id: 'wirbel', pos: [0, AY, AZ - 3], arena: { center: [0, AY, AZ], r: AR - 0.4 } },
  ],
  items: [
    // roter Ring auf T3 (Belohnung: 1-up)
    { kind: 'roter_ring', id: 'ring', attach: 'T3', pos: at(T.T3, 1.5, 1.2), yaw: Math.PI / 2, coins: RED_COINS, time: 10, reward: { power: 'oneup' } },
    // Kisten
    { kind: 'crate', id: 'kiste1', attach: 'T2', pos: at(T.T2, -4, 1.4), content: 'coins:3' },
    { kind: 'crate', id: 'kiste2', attach: 'T2', pos: at(T.T2, -4, 1.4, D + 1), content: 'coin' },
    { kind: 'crate', id: 'kiste_stern', attach: 'T7s', pos: at(T.T7s, 0.4, 0), size: 1.1, content: { reveal: 'stern2' } },
    { kind: 'crate', id: 'tor_k1', attach: 'T8', pos: at(T.T8, 0.2, -1.0), content: 'coin' },
    { kind: 'crate', id: 'tor_k2', attach: 'T8', pos: at(T.T8, 1.3, -1.0), content: 'coins:2' },
    { kind: 'crate', id: 'tor_k3', attach: 'T8', pos: at(T.T8, 1.3, -1.0, D + 1), content: 'coin' },
    // Münzen
    coins(T.T1, at(T.T1, -4.5, -1.8, D + 0.6), at(T.T1, 0, -1.8, D + 0.6), 4),
    coins(T.T1, P(15.4, 0, D + 1.3), P(15.4, 0, D + 1.3), 1),
    coins(T.T2, P(16.6, 0, D + 1.5), P(17.8, -0.2, D + 1.1), 2),
    coins(T.T2, at(T.T2, -6, -2.0, D + 0.6), at(T.T2, -1, -2.0, D + 0.6), 3),
    coins(T.T3, at(T.T3, -2.5, 1.6, D + 1.2), at(T.T3, 0.5, 1.6, D + 1.2), 3),
    coins(T.T4L, at(T.T4L, -4, -0.6, D + 0.6), at(T.T4L, 4, -0.6, D + 0.6), 3),
    coins(T.T5, at(T.T5, -4.5, 1.8, D + 0.6), at(T.T5, -1, 1.8, D + 0.6), 3),
    coins(T.T6, P(83.4, -0.3, D + 1.4), P(83.4, -0.3, D + 1.4), 1),
    coins(T.T6, at(T.T6, -2.6, -1.2, D + 0.6), at(T.T6, 0.4, -1.2, D + 0.6), 2),
    coins(T.T7, at(T.T7, -3, 0, D + 0.6), at(T.T7, 2, 0, D + 0.6), 2),
    coins(T.T8, at(T.T8, -4.6, 1.6, D + 0.6), at(T.T8, -2, 1.6, D + 0.6), 2),
    coins(T.T9, at(T.T9, -5.5, -1.6, D + 0.6), at(T.T9, 1.5, -1.6, D + 0.6), 4),
    coins(T.T10, at(T.T10, -3, 1.2, D + 0.6), at(T.T10, 0.5, 1.2, D + 0.6), 2),
    coins(T.T11, at(T.T11, -2.4, -1.2, D + 0.6), at(T.T11, 1.4, -1.2, D + 0.6), 2),
    { kind: 'coins', attach: 'TK', pos: at(T.TK, 2, 0, DK + 0.4), r: 2.2, n: 6 },
    // nach dem Sieg: Warp-Box auf dem Geschützturm → Oase
    { kind: 'warpbox', id: 'warp_sieg', pos: [0, AY, AZ - 1], target: [GX - 8, 0.9, GZ + 11], hidden: true },
    // Oase: Münzkreis, befreite Flocke
    { kind: 'coins', pos: [GX - 8, 1.2, GZ + 4.5], r: 2.2, n: 8 },
    { kind: 'rescue_friend', id: 'flocke', pos: [GX - 8, 0.6, GZ - 6], name: 'Flocke' },
  ],
  checkpoint: [{ pos: at(T.T5, -3.6, -1.7), attach: 'T5' }, { pos: [0.85, AY, AZ + 7.3] }],   // Arena: direkt am Ausstieg der Röhre
  stars: [
    { pos: at(T.T4R, 0.3, 0, D + 0.9), attach: 'T4R', id: 'stern1' },
    { pos: at(T.T7s, 0.4, 0, D + 0.35), attach: 'T7s', id: 'stern2', hidden: true },
    { pos: at(T.T9, -1.0, 1.6, D + 0.5), attach: 'T9', id: 'stern3' },
  ],
  stamp: { pos: at(T.T8, 2.5, 0, D + 3.2 + 0.8 + 0.35), attach: 'T8' },
  goal: { pos: [GX - 2.5, 0.6, GZ - 12], height: 8 },
  marks: {
    start: P(3, -0.6, D), ring: at(T.T3, 1.5, 1.2), helm: at(T.T3, -5.5, -1.5, D), cannon1: at(T.T3, 7.1, 0),
    star1: at(T.T4R, 0.3, 0, D), crate2: at(T.T7s, 0.4, 0), gate: at(T.T8, 2.5, 0), wall: at(T.T9, -2.85, 1.6),
    luke: at(T.TK, 2, 0, DK), arena: [0, AY, AZ], oasis: [GX - 8, 0.9, GZ + 11], goal: [GX - 2.5, 0.6, GZ - 12],
  },
  // Konvoi-Daten für Tests (Panzer: Mitte c, Länge, Breite, Spur)
  convoy: Object.fromEntries(Object.values(T).map((t) => [t.id, { c: t.c, len: t.len, w: t.w, x: t.x, h: t.h }])),
};
