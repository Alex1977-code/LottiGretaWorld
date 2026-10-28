// 6-7 „Wuschelflucht im Glitzerschacht“ – Welt 6 (Archetyp autoscroller, senkrecht; Bauplan Detail 6-7: „vertikaler Schacht
// (80 m hoch, Autoscroll) – Wuschel-Horde jagt von unten; Wolkenplattformen, Sprungfelder, periodische Quetschblöcke →
// horizontaler Abschnitt mit Wippen (70 m) → Tür zum Deck mit Zielmast“). Thema fuzzymine, Musik course_fuzzymine, 400 s.
//
// Ein alter Glitzerschacht tief in der Wolkeninsel: Kristalladern leuchten, Grubenlampen glimmen, und von unten quillt
// eine wimmelnde Wuschel-Horde herauf. Sobald die Heldin die Sohle verlässt, beginnt die Flucht nach oben – das Bild fährt
// mit, die Horde bleibt dicht dahinter (Berührung tut weh und schleudert nach oben; wer unten aus dem Bild fällt, ist
// weg). Oben führt eine Galerie über einen Abgrund mit drei Wippen zum Grubentor und auf das Deck mit dem Zielmast; auch
// dort rollt die Horde langsam heran.
//
// Koordinaten: Schacht innen x −8 … 8, Rückwand z −3,5, Böden bis z 1,6 (davor eine unsichtbare Glaswand: man fällt nicht
// nach vorn aus dem Schacht). Beim Aufstieg schaut die Kamera fast waagerecht von vorn (+Z) in den Schacht.
//   1  Sohle               y  0 …  5   Start; links die Nische hinter dem Quetschblock (Stempel), rechts das Sprungfeld
//   2  Erste Bretter       y  4 … 16   Bretter, Wolke, seitlicher Quetschblock; links unter dem grauen Wolkenbausch Stern 1
//   3  Puffwolken          y 16 … 25   drei verpuffende Wolken im Zickzack
//   4  Mittelstation       y 25,4      Gerüstboden, Kontrollpunkt, Sprungfeld (die Fahrt wird hier gemächlich)
//   5  Quetschgang         y 31 … 36   drei Quetschblöcke im Wellentakt über dem Felsgang; dahinter die Felsrille in der
//                                      linken Wand (Stern 3, Kiste mit Extraleben)
//   6  Sprungfelder        y 35 … 50   Wolke, Bretter mit seitlichem Quetschblock, Sprungfeld, fahrende Goldwolke
//   7  Puffwolken 2        y 50 … 64   verpuffende Wolken, Felssims mit Quetschblock vor dem Sprungfeld
//   8  Schachtkrone        y 64 … 78   Wolke, schwebende Wolke, oberer Bretterboden → die Fahrt endet
//   9  Wippen-Galerie      y 78, z −4 … −60   Kontrollpunkt, Wippe 1, Fels, Wippe 2 (Wuschel kreisen), Fels mit Quetschblock,
//                                      Wippe 3 (Quetschblock über dem fernen Ende – drückt er es hinab, schnellt das nahe Ende
//                                      hoch: Stern 2 darüber), Fels, Wolkenbrücke
//   10 Deck                z −60 … −80  Torplatz, Grubentor (öffnet sich, wenn man davor steht), Holzdeck mit Zielmast
// Sterne: 1 unter dem grauen Wolkenbausch links (Abstecher gleich nach dem Stempel), 2 über Wippe 3 (nur vom hochgeschnellten
// Ende aus), 3 in der Felsrille hinter der Quetschblock-Wand. Stempel: in der Nische gleich am Start hinter dem Quetschblock.
// Extraleben: unsichtbarer Block über der Sohle links vom Start, Kiste in der Felsrille.
// Gegner: Wuschel-Horde (Schacht, folgt dem Bild; Galerie, rollt langsam), Wuschel (4).

import {
  arc, column, line, ring, schachtBauen, schachtZier, Grubentor, wippenStoss, schachtAbsturz, schachtLeben, schattenDiaet, hordenSicht,
  fahrtAnsage,
} from './_helpers_d.js';

const PI = Math.PI;
const X0 = -8, X1 = 8;           // Schacht innen
const ZB = -3.5, ZF = 1.6;       // Rückwand (Innenseite), Vorderkante der Böden
const ZL = -1;                   // Laufspur (Mitte der Böden)
const YT = 78;                   // Galerie
const YK = 25.4;                 // Mittelstation
const YQ = 31;                   // Quetschgang
const YS = 58;                   // Felssims mit Quetschblock
const G0 = 60;                   // Unterkante der Felspfeiler in der Galerie

// ---------------------------------------------------------------- Maße (auch für den Test)
export const M67 = {
  X0, X1, ZB, ZF, ZL, YT, YK, YQ, YS,
  NISCHE: { x0: X0, x1: -5.6, top: 2.6 },              // Stempel-Nische (Decke 2,6)
  Q0: { x: -4.6 },                                      // Quetschblock vor der Nische
  STERN1: { x: -7.0, y: 8.4 },                          // Felssporn unter dem grauen Wolkenbausch
  RILLE: { x0: -10.4, x1: X0, y0: YQ, y1: YQ + 3.4 },
  QG: { x0: X0, x1: 3.8, top: YQ, crushers: [-6.0, -3.1, -0.2], gaps: [-4.55, -1.65] },
  W3: { z: -44, len: 10, raise: [0, -41] },
  TOR: { z: -64.5 },
};

// ---------------------------------------------------------------- Schachtgeometrie (LEVEL.schacht, Aufbau-Haken)
const rock = (x0, x1, y0, y1, z0, z1, o = {}) => ({ min: [x0, y0, z0], max: [x1, y1, z1], ...o });
const plank = (x0, x1, y, o = {}) => ({ x0, x1, y, z0: o.z0 ?? ZB, z1: o.z1 ?? ZF, zb: ZB, ...o });

/** Seitenwand x0..x1 von y0 bis y1 mit Aussparungen (Sockel der seitlichen Quetschblöcke, Felsrille). */
function sideWall(x0, x1, y0, y1, holes, o = {}) {
  const out = [];
  let y = y0;
  for (const h of [...holes].sort((a, b) => a.y0 - b.y0)) {
    if (h.y0 > y) out.push(rock(x0, x1, y, h.y0, -7, ZF, o));
    if (h.z0 > -7) out.push(rock(x0, x1, h.y0, h.y1, -7, h.z0, { ...o, skip: [...(o.skip ?? []), '-z'] }));
    if (h.z1 < ZF) out.push(rock(x0, x1, h.y0, h.y1, h.z1, ZF, o));
    const ix0 = Math.max(x0, h.x0), ix1 = Math.min(x1, h.x1);
    if (x0 < ix0) out.push(rock(x0, ix0, h.y0, h.y1, h.z0, h.z1, o));
    if (ix1 < x1) out.push(rock(ix1, x1, h.y0, h.y1, h.z0, h.z1, o));
    y = h.y1;
  }
  if (y < y1) out.push(rock(x0, x1, y, y1, -7, ZF, o));
  return out;
}

// Aussparungen: rechts die Sockel der seitlichen Quetschblöcke Q1 (y 12,4) und Q5 (y 40,6); links die Felsrille (Stern 3)
const HOLES_R = [
  { y0: 12.2, y1: 14.8, z0: -3.5, z1: 0.5, x0: X1, x1: 10.4 },
  { y0: 41.0, y1: 43.6, z0: -3.5, z1: 0.5, x0: X1, x1: 10.4 },
];
const HOLES_L = [{ y0: YQ, y1: YQ + 3.4, z0: -3.2, z1: ZF, x0: -10.4, x1: X0 }];

const ROCKS = [
  // Sohle und Rückwand (bis zur Galerie), Seitenwände mit Aussparungen
  rock(X0, X1, -6, 0, ZB, ZF, { skip: ['-z', '-x', '+x', '-y'] }),
  rock(-12, 12, -6, YT, -7, ZB, { skip: ['-z', '-x', '+x', '-y'], cell: 2.2 }),
  ...sideWall(-12, X0, -6, 94, HOLES_L, { skip: ['-x', '-y'], cell: 2 }),
  ...sideWall(X1, 12, -6, 94, HOLES_R, { skip: ['+x', '-y'], cell: 2 }),
  // über der Galerie-Öffnung
  rock(-12, -6.5, YT, 94, -7, ZB, { skip: ['-z'] }),
  rock(6.5, 12, YT, 94, -7, ZB, { skip: ['-z'] }),
  rock(-6.5, 6.5, 86, 94, -7, ZB, { skip: ['-z'] }),
  // Nische: Überhang (Decke 2,6) und Gehäuse des Quetschblocks Q0
  rock(X0, -5.6, 2.6, 3.6, ZB, ZF),
  rock(-5.6, -3.6, 4.6, 5.8, ZB, ZF, { cell: 1 }),
  // Stern-1-Brett unter dem grauen Wolkenbausch: kleiner Felssporn an der linken Wand
  rock(X0, -5.0, 7.6, 8.4, ZB, ZF, { cell: 1 }),
  // Quetschgang (Fels als Gegenfläche der drei Quetschblöcke) und ihre Gehäuse
  rock(X0, 3.8, YQ - 1.6, YQ, ZB, ZF),
  ...M67.QG.crushers.map((x) => rock(x - 1.0, x + 1.0, YQ + 4.8, YQ + 5.5, ZB, ZF - 0.6, { cell: 1.0 })),
  // Felssims (rechts) mit Quetschblock Q6 vor dem Sprungfeld und dessen Gehäuse
  rock(3, X1, YS - 1.2, YS, ZB, ZF),
  rock(4.5, 6.7, YS + 4.4, YS + 5.0, ZB, ZF - 0.6, { cell: 1.1 }),
  // Galerie: Boden am Kontrollpunkt, Felspfeiler über dem Abgrund, Torplatz, Brüstung und Rückwand hinter dem Deck
  rock(-6.5, 6.5, G0, YT, -12.7, -7, { skip: ['-y'] }),
  rock(-2.5, 2.5, G0, YT, -24.7, -21.3, { skip: ['-y'] }),
  rock(-2.6, 2.6, G0, YT, -38.7, -33.3, { skip: ['-y'] }),
  rock(-2.5, 2.5, G0, YT, -53.3, -49.3, { skip: ['-y'] }),
  rock(-6.5, 6.5, G0, YT, -65, -60.2, { skip: ['-y'] }),
  rock(-6.5, 6.5, G0, YT, -80, -65, { skip: ['-y'], visible: false }),
  rock(-12, 12, 54, 94, -88, -80, { skip: ['-z', '-y'], cell: 2.6 }),
  // Galeriewände links/rechts (hoch, über dem Abgrund)
  rock(-12, -6.5, 54, 94, -80, -7, { skip: ['-x', '-y'], cell: 2.6 }),
  rock(6.5, 12, 54, 94, -80, -7, { skip: ['+x', '-y'], cell: 2.6 }),
  // Mauern neben dem Grubentor
  rock(-6.5, -2.8, YT, YT + 4.4, -65, -64, { cell: 1.2 }),
  rock(2.8, 6.5, YT, YT + 4.4, -65, -64, { cell: 1.2 }),
];

const PLANKS = [
  plank(2.5, X1, 4.6),                          // R1
  plank(-3, 1.2, 7.2),                          // L2
  plank(3.5, X1, 12.4),                         // R4 (seitlicher Quetschblock Q1)
  plank(-4, 0.8, 15.0),                         // L5
  plank(X0, X1, YK, { tag: 'mittelstation' }),   // Mittelstation
  plank(4, X1, YQ),                             // R6 (Landeplatz neben dem Quetschgang)
  plank(1.6, 5.6, 35.4),                        // L8
  plank(1.5, X1, 40.6),                         // R10 (seitlicher Quetschblock Q5 vor dem Sprungfeld)
  plank(1.6, 7, 45.0),                          // L11
  plank(X0, -4, 50.2),                          // L12
  plank(3, X1, 63.8),                           // R16 (über dem Gehäuse von Q6)
  plank(X0, -2.5, 69.0),                        // L18
  plank(2.5, X1, 75.4),                         // R19
  plank(X0, X1, YT, { tag: 'schachtkrone' }),   // oberer Bretterboden (Fahrt endet)
  // Holzdeck hinter dem Grubentor
  plank(-6.5, 6.5, YT + 0.02, { z0: -80, z1: -65, zb: undefined, braces: false, tag: 'deck', oneWay: false }),
];

// Zier: Stützrahmen an der Rückwand, Kristalle
const FRAMES = [];
for (let y = 1, i = 0; y < 76; y += 7.4, i++) FRAMES.push({ x0: i % 2 ? 1.4 : -6.2, x1: i % 2 ? 6.2 : -1.4, y, z: ZB + 0.3, h: 3.2 });
const CRYSTALS = [
  { pos: [-7.3, 0, -3], size: 0.6, n: 3 }, { pos: [7.2, 4.6, -3.1], size: 0.5, color: 'rosa' }, { pos: [-7.4, 19, -3.1], size: 0.7, n: 2 },
  { pos: [6.9, YK, -3.1], size: 0.6, color: 'gold' }, { pos: [-2, 44, -3.2], size: 0.55 }, { pos: [7.3, 52, -3.1], size: 0.7, color: 'rosa' },
  { pos: [-7.2, 69, -3.1], size: 0.6 }, { pos: [6.6, 75.4, -3.2], size: 0.5, color: 'gold' },
  { pos: [-10.0, YQ, -2.4], size: 0.5, n: 2, color: 'gold' },                     // Felsrille (Glitzer als Hinweis)
  { pos: [-5.9, YT, -62.4], size: 0.6 }, { pos: [5.9, YT, -61.6], size: 0.6, color: 'rosa' },
];

// ---------------------------------------------------------------- Wolken (Baustein wolkenplattform: pos = Mitte unten, 0,6 hoch)
const cloud = (id, x, top, o = {}) => ({ type: 'wolkenplattform', id, pos: [x, top - 0.6, o.z ?? ZL], size: o.size ?? [3, 0.6, 3], ...o });
const CLOUDS = [
  cloud('c3', 3.2, 9.8),
  cloud('wolke_stern1', -5.0, 10.8, { color: 'grau', size: [3.2, 0.6, 3.4] }),     // grauer Bausch, Stern 1 halb darunter
  cloud('v1', -5.8, 17.6),
  cloud('v2', -2.2, 20.2, { vanish: 1.2, respawn: 2.2 }),
  cloud('v3', 1.6, 22.8),
  cloud('c9', -1.6, 38.0),
  cloud('c13', -1.4, 52.8),
  cloud('c14', 1.2, 55.4, { vanish: 1.2, respawn: 2.2 }),
  cloud('c17', 0.6, 66.4),
  { type: 'wolkenplattform', id: 'c_fahrt', pos: [0.2, 70.4, ZL], size: [3, 0.6, 3], path: [[0.2, 70.4, ZL], [0.2, 72.4, ZL]], speed: 1.0, wait: 0.6 },
  // Galerie: Wolkenbrücke vor dem Torplatz
  cloud('g1', 0, YT, { z: -55, sink: 0 }),
  cloud('g2', 0, YT, { z: -58.4, sink: 0, vanish: 1.2, respawn: 2.4 }),
];

// ---------------------------------------------------------------- Quetschblöcke
const q = (id, pos, o = {}) => ({ type: 'quetschblock', id, pos, size: o.size ?? [2, 2, 5], dir: 'down', travel: 2.8, wait: 1.6, hold: 0.5, back: 1.0, warn: 0.7, ...o });

export const LEVEL = {
  id: '6-7',
  world: 6,
  title: 'Wuschelflucht im Glitzerschacht',
  archetype: 'autoscroller',
  theme: 'fuzzymine',
  music: 'course_fuzzymine',
  timeLimit: 400,
  start: { pos: [0.5, 0, ZL], yaw: PI / 2 },
  sky: { clouds: false },
  killY: -14,
  // Senkrechte Fahrt: die Fenstermitte steigt von y 3 auf y 80. Abfahrt, sobald die Heldin auf den ersten Brettern steht
  // (Stempel-Nische und Extraleben in Ruhe holen). Unten aus dem Bild = Absturz (backMode kill); die Horde bleibt 5,5 m
  // unter der Fenstermitte. Am Quetschgang fährt das Bild gemächlich (Zeit für die Felsrille).
  scroll: {
    path: [[0, 3, ZL], [0, 120, ZL]],
    start: 0, end: 77,
    speed: 1.0, speeds: [{ from: 14, speed: 1.15 }, { from: 24, speed: 0.6 }, { from: 34, speed: 1.25 }, { from: 41, speed: 1.0 }, { from: 52, speed: 1.3 }],
    accel: 2, delay: 0.6,
    trigger: { min: [X0, 4.2, -4], max: [X1, 30, 3] },
    frame: { back: 6.5, front: 6.5, ahead: 1.0, followX: 0.3, turn: false, backMode: 'kill' },
    cams: [{ s: 0, pitch: 14, dist: 17.5, fov: 42, height: 1 }, { s: 80, pitch: 14, dist: 17.5, fov: 42, height: 1 }],
    startBanner: '', endBanner: 'Geschafft – ab in die Galerie!',
  },
  // nach der Fahrt (Schachtkrone, Galerie, Deck) die normale Verfolgerkamera
  camera: [
    { from: 6, to: -8, pitch: 34, dist: 13, fov: 42 },
    { from: -8, to: -92, pitch: 44, dist: 13, fov: 40, x: 0, xLock: 0.35 },
  ],
  instances: { coin: { farHide: 30, shadow: false } },
  schacht: {
    rocks: ROCKS,
    planks: PLANKS,
    glass: [{ min: [X0, -2, ZF], max: [X1, YT + 6, ZF + 0.3] }],
    frames: FRAMES,
    crystals: CRYSTALS,
  },
  build(level) {
    schachtBauen(level);
    schachtZier(level);
  },
  setup(level) {
    level._tor = new Grubentor(level, { pos: [0, YT, M67.TOR.z], width: 4.4, height: 3.8, id: 'grubentor' });
    level._wippe3 = wippenStoss(level, { wippe: 'wippe3', crusher: 'q8', raise: M67.W3.raise, kick: 85 });
    schachtAbsturz(level, { y: YT - 6, x: [X0, X1], z: [-3.4, 3] });
    fahrtAnsage(level, { text: 'Die Wuschel kommen – nach oben!' });
    hordenSicht(level, ['horde', 'horde_galerie']);
    schattenDiaet(level, ['modell:wolkenplattform', 'wolkenplattform', 'modell:trampoline'], ['wuschel_horde']);
    schachtLeben(level);
  },
  segments: [
    // ---------------------------------------------------------------- 1 Sohle
    q('q0', [M67.Q0.x, 2.6, -0.95], { travel: 2.6, wait: 1.8, hold: 0.6, back: 1.1 }),
    { type: 'trampoline', id: 'sprung0', pos: [4.4, 0, ZL], strength: 17 },
    { type: 'sign', pos: [6.4, 0, -2.4], text: 'Glitzer-\nschacht', size: [2.2, 1] },
    { type: 'deco_w6', items: [
      { kind: 'lore', pos: [-1.6, 0, -2.6], yaw: 0, load: 'kristall' }, { kind: 'schienen', from: [-5.2, 0, -2.6], to: [2.6, 0, -2.6] },
      { kind: 'kristalle', pos: [6.6, 0, -2.4], n: 3, size: 0.8 },
      { kind: 'minenlampe', pos: [-2.4, 6.0, -1.6] }, { kind: 'minenlampe', pos: [5.6, 11.0, -1.2] }, { kind: 'minenlampe', pos: [-5.8, 22.2, -1.2] },
      { kind: 'minenlampe', pos: [3.2, 30.0, -1.4] }, { kind: 'minenlampe', pos: [-1.0, 37.2, -1.6] }, { kind: 'minenlampe', pos: [4.2, 49.4, -1.4] },
      { kind: 'minenlampe', pos: [-4.8, 56.4, -1.2] }, { kind: 'minenlampe', pos: [5.4, 68.4, -1.2] }, { kind: 'minenlampe', pos: [-4.6, 77.0, -1.2] },
      { kind: 'kiste', pos: [6.8, 4.6, -2.6] }, { kind: 'kiste', pos: [-2.4, 7.2, -2.8], size: 0.8 },
      { kind: 'lore', pos: [-3.4, YK, -2.6], yaw: 0, load: 'gold' }, { kind: 'schienen', from: [X0 + 0.4, YK, -2.6], to: [0.4, YK, -2.6] },
      { kind: 'fass', pos: [7.0, YK, -2.8] }, { kind: 'kiste', pos: [7.2, YK, -1.4], size: 0.8 },
      { kind: 'schachtgeruest', pos: [-6.4, YT, -2.2], width: 2.6, depth: 2, height: 4.2, yaw: 0 },
    ] },
    // ---------------------------------------------------------------- 2 Erste Bretter: seitlicher Quetschblock Q1
    q('q1', [9.4, 12.4, -1.5], { size: [2, 2, 4], dir: '-x', travel: 3.0, wait: 2.2, hold: 0.5, back: 1.2, phase: 1.0 }),
    // ---------------------------------------------------------------- 4 Mittelstation
    { type: 'trampoline', id: 'sprung5', pos: [6.2, YK, ZL], strength: 19 },
    // ---------------------------------------------------------------- 5 Quetschgang: drei Quetschblöcke im Wellentakt
    ...M67.QG.crushers.map((x, i) => q(`qg${i + 1}`, [x, YQ + 2.8, -0.95], { size: [1.8, 2, 5], wait: 1.5, warn: 0.6, phase: -0.5 + i * 0.7 })),
    { type: 'trampoline', id: 'sprung6', pos: [6.6, YQ, ZL], strength: 17.5 },
    // ---------------------------------------------------------------- 6 Sprungfelder, seitlicher Quetschblock Q5, fahrende Goldwolke
    q('q5', [9.4, 41.2, -1.5], { size: [2, 2, 4], dir: '-x', travel: 3.0, wait: 2.0, hold: 0.5, back: 1.2, phase: 0.4 }),
    { type: 'trampoline', id: 'sprung10', pos: [4.2, 40.6, ZL], strength: 17.5 },
    { type: 'wolkenplattform', id: 'goldwolke', pos: [3.2, 47.0, ZL], size: [3, 0.6, 3], path: [[3.2, 47.0, ZL], [-3.0, 47.0, ZL]], speed: 2.2, wait: 0.7, color: 'gold' },
    // ---------------------------------------------------------------- 7 Felssims mit Quetschblock Q6 vor dem Sprungfeld
    q('q6', [5.6, YS + 2.8, -0.95], { size: [2, 1.6, 5], wait: 1.7, warn: 0.6 }),
    { type: 'trampoline', id: 'sprung15', pos: [7.3, YS, ZL], strength: 19.5, size: 1.3 },
    // ---------------------------------------------------------------- Wolken
    ...CLOUDS,
    // ---------------------------------------------------------------- 9 Wippen-Galerie
    { type: 'killplane', y: G0 + 4, pos: [0, G0 + 4, -46], size: [30, 80] },
    { type: 'wippe', id: 'wippe1', pos: [0, YT, -17], length: 8, width: 3, yaw: PI / 2, maxTilt: 24, style: 'mine' },
    { type: 'wippe', id: 'wippe2', pos: [0, YT, -29], length: 8, width: 3, yaw: PI / 2, maxTilt: 24, style: 'mine' },
    { type: 'wippe', id: 'wippe3', pos: [0, YT, M67.W3.z], length: M67.W3.len, width: 3, yaw: PI / 2, maxTilt: 30, weight: 9, back: 0.5, style: 'mine' },
    q('q7', [0, YT + 3, -36], { size: [3, 2, 2], travel: 3.0, wait: 1.8, hold: 0.6, back: 1.1, phase: 0.5 }),
    // Q8 über dem fernen Ende der Wippe 3: wacht auf, wenn jemand auf der Wippe steht, drückt das Ende hinab – das nahe
    // Ende schnellt hoch (wippenStoss im Level-Haken)
    q('q8', [0, YT + 4.2, M67.W3.z - 4], { size: [3, 2, 2], travel: 6.1, out: 1.0, hold: 1.8, back: 1.2, warn: 0.8, mode: 'signal' }),
    { type: 'deco_w6', items: [
      { kind: 'minenbalken', pos: [0, YT - 0.4, -36], width: 13, height: 6.4, yaw: 0 },
      { kind: 'minenbalken', pos: [0, YT - 0.4, -48], width: 13, height: 7.6, yaw: 0 },
      { kind: 'minenlampe', pos: [-4.6, YT + 4.6, -9] }, { kind: 'minenlampe', pos: [4.6, YT + 4.6, -23] },
      { kind: 'minenlampe', pos: [-4.4, YT + 4.6, -42] }, { kind: 'minenlampe', pos: [4.4, YT + 4.6, -57] },
      { kind: 'kristalle', pos: [-5.4, YT, -10.6], n: 3, size: 0.6 }, { kind: 'lore', pos: [4.2, YT, -9.6], yaw: PI / 2, load: 'erz' },
      { kind: 'minenbalken_reihe', from: [0, YT, -67], to: [0, YT, -79], every: 4, lamp: true },
      { kind: 'fass', pos: [-5.4, YT, -78.6] }, { kind: 'kiste', pos: [5.2, YT, -79], size: 0.9 }, { kind: 'kiste', pos: [5.4, YT + 0.9, -79.1], size: 0.7 },
    ] },
    { type: 'sign', pos: [-4.2, YT, -5.2], text: 'Wippen-\nGalerie', size: [2.2, 1] },
    { type: 'sign', pos: [-4.6, YT, -61.4], text: 'Zum Deck', size: [2, 0.8] },
  ],
  blocks: [
    { kind: 'hidden', pos: [-2.6, 3.1, ZL], content: 'oneup' },
    { kind: 'question', pos: [-1.0, YK + 3.3, ZL], content: 'coins:3' },
  ],
  enemies: [
    // die Horde jagt im Schacht von unten (folgt dem Bildfenster) …
    { kind: 'wuschel_horde', id: 'horde', pos: [0, -6, ZL - 0.4], axis: 'y', follow: 'scroll', behind: 5.2, size: [16, 5.4], count: 64, layers: 2 },
    // … und rollt in der Galerie langsam hinterher
    { kind: 'wuschel_horde', id: 'horde_galerie', pos: [0, 73, -2], axis: '-z', speed: 1.1, delay: 1.5, end: -56, size: [13, 10], count: 48,
      trigger: { min: [-7, 76, -14], max: [7, 86, -10] } },
    // einzelne Wuschel auf ihren Bahnen
    { kind: 'wuschel', id: 'w_puff', center: [-1.8, 19.4, ZL], radius: 2.4, speed: 1.5 },
    { kind: 'wuschel', id: 'w_lore', path: [[-3.6, 49.4, ZL - 1.8], [3.2, 49.4, ZL - 1.8]], speed: 1.4, wait: 0.6 },
    { kind: 'wuschel', id: 'w_wippe2', center: [0, YT + 1.8, -29], radius: 3.4, speed: 1.8, count: 2, spacing: 10.7 },
  ],
  items: [
    // Bitcoin-Spuren den Schacht hinauf
    ...arc([0.5, 0.6, ZL], [4.4, 0.6, ZL], 4, 0.8),
    ...column(4.4, 2.2, 4.4, ZL, 2),
    ...arc([4.8, 5.2, ZL], [-0.6, 7.8, ZL], 4, 1.2),
    ...column(3.2, 10.4, 11.4, ZL, 2),
    line([4, 13.0, ZL], [6.6, 13.0, ZL], 3),
    ...arc([-3.2, 15.6, ZL], [-5.8, 18.2, ZL], 3, 0.8),
    ...arc([-2.2, 20.8, ZL], [1.6, 23.4, ZL], 3, 0.8),
    ring([0, YK + 1.2, ZL], 1.6, 6),
    line([4.6, YQ + 0.6, ZL], [7.4, YQ + 0.6, ZL], 3),
    line([-6.8, YQ + 0.6, ZL], [-1.6, YQ + 0.6, ZL], 6),
    ...column(1.0, 36.2, 38.6, ZL, 3),
    line([5.8, 41.2, ZL], [7.4, 41.2, ZL], 3),
    ...arc([4.6, 45.6, ZL], [-4.6, 47.8, ZL], 5, 1.4),
    ...column(-1.4, 53.4, 54.6, ZL, 2),
    ...column(3.6, 58.6, 61.4, ZL, 3),
    ...arc([4.6, 64.4, ZL], [0.6, 67.0, ZL], 3, 0.8),
    ...column(0.2, 73.8, 75.0, ZL, 2),
    // Galerie
    line([0, YT + 0.6, -13.8], [0, YT + 0.6, -20.2], 4),
    line([0, YT + 0.6, -25.8], [0, YT + 0.6, -32.2], 4),
    line([0, YT + 0.6, -46.6], [0, YT + 0.6, -48.4], 2),
    ring([0, YT + 0.8, -74], 1.8, 8),
    { kind: 'crate', pos: [-9.6, YQ, -0.2], size: 0.9, content: 'oneup' },
    { kind: 'crate', pos: [4.6, YT, -61.4], content: 'coins:5' },
  ],
  checkpoint: [{ pos: [-5.6, YK, -2.0], yaw: PI / 2 }, { pos: [0, YT, -9.4], yaw: PI / 2 }],
  stars: [
    { pos: [M67.STERN1.x, M67.STERN1.y, ZL], id: 'stern1' },   // unter dem grauen Wolkenbausch (Felssporn)
    { pos: [0, YT + 5.5, M67.W3.raise[1]], id: 'stern2' },      // über Wippe 3 (nur vom hochgeschnellten Ende)
    { pos: [-9.3, YQ + 0.25, -1.6], id: 'stern3' },            // in der Felsrille
  ],
  stamp: { pos: [-7.0, 0.3, ZL] },
  goal: { pos: [0, YT, -74], height: 8 },
  marks: {
    start: [0.5, 0, ZL], nische: [-7, 0, ZL], q0: [M67.Q0.x, 0, ZL], sprung0: [4.4, 0, ZL], r1: [5, 4.6, ZL], l2: [-1, 7.2, ZL],
    stern1: [M67.STERN1.x, M67.STERN1.y, ZL], mittel: [0, YK, ZL], qg: [3, YQ, ZL], rille: [-9.2, YQ, -1.4], krone: [0, YT, ZL],
    galerie: [0, YT, -9.4], w3: [0, YT, M67.W3.z], w3n: [0, YT, M67.W3.raise[1]], p2: [0, YT, -34.4], p3: [0, YT, -51.4], tor: [0, YT, -62], deck: [0, YT, -70],
  },
};
