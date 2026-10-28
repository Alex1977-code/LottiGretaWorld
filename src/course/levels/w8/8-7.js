// 8-7 „Kullerklotz-Ritt durchs Glutinferno“ (parcours, Bauplan 8-7: Kristall-Felsklötze rollen über Lava los, sobald man
// draufsteht; Stampfen macht sie schneller; 400 s). Thema inferno, Musik course_inferno, 3 Sterne + Stempel. Level verläuft
// nach −Z; Gelände-Stufen: Start/Plateau 1 y 0, Festland y −6, Plateau 3/Zielinsel y −14.
//
// Abschnitte:
//   A Start          z  +8 …   −8   Kraterplateau mit Kristallen, Schild, ?-Block (Wachstumsbeere), Felsklotz-Rastplatz
//   B Erster Klotz   z  −8 …  −58   Kristall-Felsklotz 1 (Kugel) fährt eine sanfte Schlangenlinie über den Lavasee,
//                                   Münzbögen über der Fahrt, Lavablasen springen neben der Bahn, Bimsstein-Enten
//   C Würfel-Klotz   z −58 … −128   Plateau 1, dann der Würfel-Felsklotz mit zwei 3-m-Abstürzen über Lavafälle hinab
//                                   (Lava-Stufen y −0,7 / −3,7 / −6,7); rechts neben der zweiten Stufe eine Kristall-Insel
//                                   mit Stern 0 und einem kleinen Stern-Klotz, der zurück zur Strecke fährt
//   D Festland       z −128 … −182  Kontrollpunkt, drei Hammer-Werfer (einer auf einer Basaltsäule mit dem Stempel darüber),
//                                   Basaltsäulen, Kristalle
//   E Lavahang       z −182 … −242  Felsklotz 3 rutscht den schrägen Lavastrom hinab (bergab schneller)
//   F Plateau 3      z −242 … −262  zweiter Kontrollpunkt, Sternenring (Stern 1): acht Sternmünzen auf Kristallsäulen links
//   G Kurvenroute    z −262 … −346  Felsklotz 4 fährt die lange S-Kurve; unter dem Kristallbogen schwebt Stern 2 hoch über
//                                   der Bahn (auf der Fahrt hochspringen)
//   H Zielinsel      z −346 … −362  Zielmast
// Sterne: 0 Kristall-Insel neben der zweiten Würfel-Stufe (vom Würfel hinüberspringen; der Stern-Klotz bringt zurück)
//         · 1 Sternenring auf Plateau 3 (acht Sternmünzen auf den Kristallsäulen) · 2 auf der letzten Fahrt unter dem
//         Kristallbogen hochspringen. Stempel: über dem Hammer-Werfer auf der Basaltsäule nach dem Kontrollpunkt.
// Extraleben: unsichtbarer Block am Start (links neben dem Rastplatz), unsichtbarer Block am Festland-Ende (Basaltgruppe).
// Gegner: Hammer-Werfer 3, Lavablase 10, Knochenflieger 2.

import {
  isl, line, ring, arc, sign, kristalle, basalt, lavaHang, kristallBogen, lavaFaelle, funkenFlug, glutSaum, bakeParts, blk, cyl, sph,
  levelSetup, farHide,
} from './_helpers_c.js';
import { bimsEnten } from '../w7/_helpers_d.js';

const Y0 = 0, Y2 = -6, Y3 = -14;          // Gelände-Stufen
const LV1 = -0.7, LV2 = -3.7, LV3 = -6.7, LV4 = -14.7;   // Lava-Spiegel
const C1 = -82, C2 = -108;                 // Lava-Stufen (Kanten) des Würfel-Abschnitts
const S1 = 3.6, S2 = 3.2, SS = 2.8, S3 = 3.6, S4 = 3.8;  // Klotz-Größen
const top = (y, s) => y + 0.05 - s;        // Klotz-Unterseite, damit die Oberkante knapp über der Plateauhöhe liegt

// Pfade (Unterseiten-Mitte)
const K1Y = top(Y0, S1), K2Y = top(Y0, S2), KSY = top(LV2 + 0.75, SS), K3Y = top(Y2, S3), K4Y = top(Y3, S4);
const PFAD1 = [[0, K1Y, -14], [3.5, K1Y, -24], [3.5, K1Y, -35], [-1.5, K1Y, -46], [0, K1Y, -56.6]];
const PFAD2 = [[0, K2Y, -80], [0, K2Y, C1 - 1.8], [0, K2Y - 3, C1 - 2.0], [0, K2Y - 3, C2 - 1.8], [0, K2Y - 6, C2 - 2.0], [0, K2Y - 6, -126.4]];
const PFADS = [[8.4, KSY, -100], [8.4, KSY, C2 - 1.0], [8.4, KSY - 3, C2 - 1.2], [8.4, KSY - 3, -126.9]];
const PFAD3 = [[0, K3Y, -186], [0, K3Y - 8, -234], [0, K3Y - 8, -240.8]];
const PFAD4 = [[0, K4Y, -266], [-6, K4Y, -276], [-9, K4Y, -288], [-5, K4Y, -300], [3, K4Y, -308], [9, K4Y, -318], [8, K4Y, -330], [2, K4Y, -338], [0, K4Y, -344.6]];

const rock = (x0, x1, zA, zB, t, h = 6, o = {}) => isl(x0, x1, zA, zB, t, h, { top: 'rock', topColor: 0x6a5872, sideColor: 0x34263a, ...o });
const saeule = (x, z, t, w = 1.6) => ({ type: 'island', pos: [x, t - 6, z], size: [w, 6, w], top: 'rock', under: 0, topColor: 0x9a7ab8, sideColor: 0x3a2a48 });

// Sternenring auf Plateau 3: Säulen links über der Lava (je eine Sternmünze)
const RING = [[-9.2, -246], [-11.6, -246.8], [-13.8, -248.4], [-15.2, -250.8], [-15.2, -253.6], [-13.8, -256], [-11.6, -257.6], [-9.2, -258.4]];

// Münzen über den Fahrten (Bitcoin-Pfade), 1,1 m über der Klotz-Oberkante: an Teilstücken der Pfade
const along = (path, y, a, b, n) => { const out = []; for (let i = 0; i < n; i++) { const t = a + ((b - a) * i) / Math.max(1, n - 1); const k = t * (path.length - 1), j = Math.min(path.length - 2, Math.floor(k)), f = k - j; out.push({ kind: 'coin', pos: [path[j][0] + (path[j + 1][0] - path[j][0]) * f, y, path[j][2] + (path[j + 1][2] - path[j][2]) * f] }); } return out; };

function build(level) {
  // ---------------------------------------------------------------- Kristalle, Basalt, glühende Ränder, Lavafälle
  kristalle(level, [
    [-5.4, Y0, 4.6, 1.3, 'lila'], [5.6, Y0, 5.2, 1.0, 'blau'], [-5.8, Y0, -5.4, 0.8, 'blau'], [6.2, Y0, -3.6, 1.4, 'rosa'],
    [-4.8, Y0, -60.2, 0.9, 'blau'], [4.6, Y0, -64.4, 1.1, 'lila'],
    [6.3, LV2 + 0.75, -96.1, 0.7, 'gold', 2], [4.5, LV2 + 0.75, -93.9, 0.55, 'gold', 3],
    [-8.6, Y2, -131, 1.2, 'lila'], [10.6, Y2, -138, 1.0, 'blau'], [-8.8, Y2, -150, 1.5, 'blau'], [10.8, Y2, -163, 1.2, 'rosa'], [-8.4, Y2, -176, 1.0, 'lila'],
    [5.6, Y3, -244.2, 1.0, 'blau'], [5.8, Y3, -259.6, 1.3, 'lila'],
    [-6.2, Y3, -349, 1.3, 'blau'], [6.4, Y3, -350, 1.1, 'rosa'], [-6.4, Y3, -360, 1.0, 'lila'], [6.2, Y3, -360.4, 1.5, 'blau'],
  ]);
  // Kristallnadeln in der Lava (Kulisse, ohne Kollision)
  kristalle(level, [
    [-11, LV1, -18, 2.2, 'lila'], [12, LV1, -28, 2.6, 'blau'], [-12, LV1, -44, 2.0, 'rosa'], [11, LV1, -54, 2.4, 'lila'],
    [-11, LV2, -96, 2.2, 'blau'], [-12, LV3, -118, 2.6, 'lila'], [13, LV3, -120, 2.0, 'rosa'],
    [-14, LV4, -280, 2.4, 'blau'], [15, LV4, -296, 2.8, 'lila'], [-15, LV4, -318, 2.2, 'rosa'], [15, LV4, -338, 2.4, 'blau'],
  ], { solid: false, glow: 4.2 });
  basalt(level, [
    [-6.4, Y0, 0.6, 4, 2.4], [6.8, Y0, 1.6, 5, 1.8],
    [9.6, Y2, -147, 5, 2.8], [-9.4, Y2, -160, 4, 2.2], [9.2, Y2, -176, 6, 3.0], [-9.4, Y2, -134, 3, 1.6],
    [-5.8, Y3, -262.2, 3, 1.4], [5.8, Y3, -250, 4, 1.8], [-6.8, Y3, -354, 4, 2.2], [7, Y3, -355, 5, 2.6],
  ], { solid: true });
  // Basaltsäule des Hammer-Werfers (Stempel darüber) als Säulen-Bündel-Optik
  basalt(level, [[4.5, -3.4 + 0.2, -154, 1, 0.3, 1.4]], { shadow: false });
  glutSaum(level, [[-7, 7, 8, -8], [-6, 6, -58, -66], [-10, 12, -128, -182], [-7, 7, -242, -262], [-8, 8, -346, -362]], LV1);
  lavaFaelle(level, [
    { pos: [-5.5, LV2, C1 + 0.15], width: 3.6, height: 3.0 }, { pos: [6, LV2, C1 + 0.15], width: 3, height: 3.0 }, { pos: [-11, LV2, C1 + 0.15], width: 4, height: 3.0 },
    { pos: [-6, LV3, C2 + 0.15], width: 3.2, height: 3.0 }, { pos: [4.6, LV3, C2 + 0.15], width: 2.6, height: 3.0 }, { pos: [13, LV3, C2 + 0.15], width: 4, height: 3.0 },
  ]);
  // Lava-Stufen: Felskanten zwischen den Spiegeln (fest, oben knapp über der oberen Lava)
  const kante = [];
  for (const [z, yT] of [[C1, LV1 + 0.25], [C2, LV2 + 0.25]]) {
    for (let x = -20; x < 20; x += 2.5) kante.push(blk(2.6, yT - (yT - 5), 0.9, x + 1.25, yT - 5, z - 0.1, (x / 2.5) % 2 ? 0x3a2c40 : 0x45354c, { top: 0x5a4864 }));
  }
  bakeParts(level, kante, { castShadow: false });
  glutSaum(level, [[-20, 20, C1 - 0.55, C1 + 0.35]], LV2 + 0.4, { h: 0.4 });
  glutSaum(level, [[-20, 20, C2 - 0.55, C2 + 0.35]], LV3 + 0.4, { h: 0.4 });
  // Lavahang (schräger Lavastrom) mit Felsufern
  lavaHang(level, { x0: -4.6, x1: 4.6, zA: -186, yA: LV3, zB: -234, yB: LV4, bank: 2.4, bankH: 1.4 });
  // Kristallbogen über der Kurvenfahrt (Stern 2) und am Start der Kurvenroute
  kristallBogen(level, { x: -5, z: -300, y: LV4 + 0.2, w: 9.6, h: 9.2, color: 'blau' });
  kristallBogen(level, { x: 5.6, z: -318, y: LV4 + 0.2, w: 9.8, h: 8.4, color: 'lila' });
  // Felsklotz-Rastplatz am Start: Pfosten mit Glutlaterne und Holzbank
  const rast = [];
  rast.push(blk(2.0, 0.12, 0.5, -3.6, Y0 + 0.45, -2.2, 0x8a5a3a), blk(0.14, 0.45, 0.4, -4.4, Y0, -2.2, 0x5a3a2a), blk(0.14, 0.45, 0.4, -2.8, Y0, -2.2, 0x5a3a2a));
  rast.push(cyl(0.08, 0.1, 2.2, 3.4, Y0, -6.4, 0x3a2a30, 6), sph(0.26, 3.4, Y0 + 2.35, -6.4, 0xffa040), cyl(0.3, 0.2, 0.12, 3.4, Y0 + 2.1, -6.4, 0x2a1e24, 8));
  bakeParts(level, rast, { castShadow: true });
}

function setup(level) {
  bimsEnten(level, [[-7.5, -16, 0.4], [8.8, -40, 2.4], [-6.6, -52, 1.2], [-8.4, -100, 0.8], [6.8, -116, 2.2]], 'lava1');
  funkenFlug(level, [[-12, 12, 4, -60], [-12, 12, -66, -128], [-6, 6, -186, -236], [-14, 14, -262, -346]], LV3, { n: 150 });
  // Fern-Ausblendung (Gegner springen nur nahe der Figur ins Bild)
  farHide(level, ['lavablase', 'knochenflieger', 'hammer_werfer'], 46);
}

export const LEVEL = {
  id: '8-7',
  world: 8,
  title: 'Kullerklotz-Ritt durchs Glutinferno',
  archetype: 'parcours',
  theme: 'inferno',
  music: 'course_inferno',
  timeLimit: 400,
  start: { pos: [0, Y0, 5], yaw: Math.PI / 2 },
  killY: -24,
  build,
  setup: levelSetup(setup),
  instances: { lavablase: { shadowDist: 12, farHide: 40 }, knochenflieger: { shadowDist: 14 }, coin: { shadow: false } },
  camera: [
    { from: 14, to: -8, pitch: 42, dist: 13, ahead: 2.4 },
    { from: -8, to: -58, pitch: 44, dist: 14.5, ahead: 3.0 },
    { from: -58, to: -128, pitch: 46, dist: 14.5, ahead: 3.0 },
    { from: -128, to: -182, pitch: 45, dist: 13.5, ahead: 2.4 },
    { from: -182, to: -242, pitch: 40, dist: 14.5, ahead: 3.4 },
    { from: -242, to: -262, pitch: 46, dist: 14, ahead: 2.2 },
    { from: -262, to: -346, pitch: 44, dist: 15, ahead: 3.2 },
    { from: -346, to: -366, pitch: 42, dist: 13, ahead: 2 },
  ],
  segments: [
    { type: 'killplane', y: -24 },
    // ================================================================ Lava (Spiegel fest)
    { type: 'lavaspiegel', id: 'lava1', mode: 'fest', pos: [0, LV1 - 3, (12 + C1) / 2], size: [80, 3, 12 - C1], low: LV1 },
    { type: 'lavaspiegel', id: 'lava2', mode: 'fest', pos: [0, LV2 - 3, (C1 + C2) / 2], size: [80, 3, C1 - C2], low: LV2 },
    { type: 'lavaspiegel', id: 'lava3', mode: 'fest', pos: [0, LV3 - 3, (C2 - 186) / 2], size: [80, 3, C2 + 186], low: LV3 },
    { type: 'lavaspiegel', id: 'lava3s', mode: 'fest', pos: [-25, LV3 - 3, -210], size: [30, 3, 48], low: LV3 },
    { type: 'lavaspiegel', id: 'lava3t', mode: 'fest', pos: [25, LV3 - 3, -210], size: [30, 3, 48], low: LV3 },
    { type: 'lavaspiegel', id: 'lava4', mode: 'fest', pos: [0, LV4 - 3, -301], size: [80, 3, 134], low: LV4 },
    // ================================================================ A Start
    rock(-7, 7, 8, -8, Y0, 7),
    sign(-3.4, Y0, 3.2, 'Glutinferno', { yaw: 0.2 }),
    sign(3.6, Y0, -5.2, 'Felsklotz: draufstellen,\nStampfen = schneller!', { size: [3.2, 1.1], yaw: -0.25 }),
    // ================================================================ B Erster Felsklotz
    { type: 'kristall_felsklotz', id: 'klotz1', pos: [0, K1Y, -9.2], size: S1, path: PFAD1, speed: 2.6, end: 'sinken', sinkDelay: 2.8, respawn: 2.5, color: 'lila' },
    // ================================================================ C Plateau 1 und Würfel-Felsklotz
    rock(-6, 6, -58, -66, Y0, 7),
    sign(-3.8, Y0, -59.6, 'Würfel-Klotz:\nzwei Stufen hinab!', { size: [3, 1.1], yaw: 0.25 }),
    { type: 'kristall_felsklotz', id: 'wuerfel', variant: 'wuerfel', pos: [0, K2Y, -67.7], size: S2, path: PFAD2, speed: 2.6, end: 'sinken', sinkDelay: 2.8, respawn: 2.5, color: 'blau' },
    // Kristall-Insel mit Stern 0 (rechts neben der zweiten Stufe) und Stern-Klotz zurück zur Strecke
    rock(4, 7, -93.5, -96.5, LV2 + 0.75, 4, { topColor: 0xc8a0e8, sideColor: 0x4a3060 }),
    { type: 'kristall_felsklotz', id: 'sternklotz', pos: [8.4, KSY, -95], size: SS, path: [[8.4, KSY, -95], ...PFADS], speed: 2.4, end: 'sinken', sinkDelay: 2.6, respawn: 2.5, color: 'gruen' },
    // ================================================================ D Festland
    rock(-10, 12, -128, -182, Y2, 8),
    // Basaltsäule des Hammer-Werfers mit Stufe davor
    rock(0.6, 2.4, -152.2, -155.8, Y2 + 1.3, 3, { topColor: 0x7a6884 }),
    rock(3, 6, -152.5, -155.5, -3.4, 4, { topColor: 0x8a7894 }),
    sign(-4.6, Y2, -130.4, 'Achtung, Hammer!', { yaw: 0.2 }),
    // ================================================================ E Lavahang (Felsklotz 3)
    { type: 'kristall_felsklotz', id: 'klotz3', pos: [0, K3Y, -183.2], size: S3, path: PFAD3, speed: 2.4, slope: 1.6, maxSpeed: 7, end: 'sinken', sinkDelay: 2.8, respawn: 2.5, color: 'lila' },
    // ================================================================ F Plateau 3 und Sternenring
    rock(-7, 7, -242, -262, Y3, 7),
    ...RING.map(([x, z]) => saeule(x, z, Y3)),
    sign(4, Y3, -244.6, 'Sternenring:\nüber die Säulen!', { size: [3, 1.1], yaw: -0.2 }),
    // ================================================================ G Kurvenroute (Felsklotz 4)
    { type: 'kristall_felsklotz', id: 'klotz4', pos: [0, K4Y, -263.3], size: S4, path: PFAD4, speed: 2.8, end: 'halt', color: 'blau' },
    // ================================================================ H Zielinsel
    rock(-8, 8, -346, -362, Y3, 7),
  ],
  blocks: [
    { kind: 'question', pos: [2.4, Y0 + 2.4, 1.2], content: 'wachstumsbeere' },
    { kind: 'hidden', pos: [-4.4, Y0 + 2.4, -0.8], content: 'oneup' },
    { kind: 'hidden', pos: [8.6, Y2 + 2.4, -172.6], content: 'oneup' },
    { kind: 'question', pos: [-3, Y2 + 2.4, -137], content: 'coins:5' },
  ],
  enemies: [
    { kind: 'hammer_werfer', id: 'hammer1', pos: [-3.5, Y2, -143], axis: [1, 0], pace: 1.4, sight: 11, first: 1.6 },
    { kind: 'hammer_werfer', id: 'hammer2', pos: [4.5, -3.4, -154], axis: [0, 1], pace: 0.6, sight: 11, first: 1.8 },
    { kind: 'hammer_werfer', id: 'hammer3', pos: [-2.5, Y2, -168], axis: [1, 0], pace: 1.4, sight: 11, first: 1.6 },
    // Lavablasen neben den Bahnen (springen im Takt, nie über die Fahrt)
    { kind: 'lavablase', pos: [-4.6, LV1, -21], height: 4, period: 3.2 }, { kind: 'lavablase', pos: [8.6, LV1, -30], height: 4.5, period: 3.6, phase: 0.4 },
    { kind: 'lavablase', pos: [-6.2, LV1, -40], height: 3.6, period: 2.8, phase: 0.2 }, { kind: 'lavablase', pos: [5.6, LV1, -50], height: 4, period: 3, phase: 0.7 },
    { kind: 'lavablase', pos: [-5.4, LV2, -92], height: 3.6, period: 3, phase: 0.5 }, { kind: 'lavablase', pos: [-5.6, LV3, -118], height: 4, period: 3.4, phase: 0.1 },
    { kind: 'lavablase', pos: [-12, LV4, -282], height: 4.4, period: 3.4 }, { kind: 'lavablase', pos: [-1.2, LV4, -318], height: 4, period: 3, phase: 0.6 },
    { kind: 'lavablase', pos: [15, LV4, -306], height: 4.6, period: 3.6, phase: 0.3 }, { kind: 'lavablase', pos: [-6.4, LV4, -333], height: 4, period: 3.2, phase: 0.8 },
    // Knochenflieger über Plateau 3 und der Kurvenroute (kreisen hoch, stoßen nur nahe herab)
    { kind: 'knochenflieger', id: 'flieger1', center: [-11, Y3 + 6.2, -270], radius: 3.4, speed: 2.2, sight: 4.5, reach: 5 },
    { kind: 'knochenflieger', id: 'flieger2', center: [12, Y3 + 6.4, -326], radius: 3.2, speed: 2.2, sight: 4.5, reach: 5, cw: true },
  ],
  items: [
    // Startplateau
    line([-1.5, Y0 + 0.6, -1.2], [1.5, Y0 + 0.6, -1.2], 3),
    // erste Fahrt
    ...along(PFAD1, Y0 + 1.1, 0.05, 0.4, 5), ...along(PFAD1, Y0 + 1.1, 0.6, 0.95, 5),
    ...arc([3.5, Y0 + 1.6, -27], [3.5, Y0 + 1.6, -33], 4, 2.2),
    // Würfel-Fahrt (auf den Stufen)
    ...along(PFAD2.slice(0, 2), Y0 + 1.1, 0.3, 1, 4), line([0, LV2 + 1.9, -88], [0, LV2 + 1.9, -100], 5), line([0, LV3 + 1.9, -114], [0, LV3 + 1.9, -124], 4),
    // Festland
    ring([0, Y2 + 1.3, -160], 1.6, 8), line([-6, Y2 + 0.6, -176], [6, Y2 + 0.6, -176], 5),
    // Lavahang
    line([0, -6.8, -192], [0, -12.6, -226], 8),
    // Kurvenroute
    ...along(PFAD4, Y3 + 1.1, 0.04, 0.3, 6), ...along(PFAD4, Y3 + 1.1, 0.5, 0.98, 9),
    // Zielinsel
    ...arc([-4, Y3 + 0.6, -349], [4, Y3 + 0.6, -349], 5, 1.4),
    { kind: 'starring', id: 'sternring', pos: [-3.6, Y3, -246.2], yaw: 0, star: 1, time: 12, coins: RING.map(([x, z]) => [x, Y3 + 0.9, z]) },
  ],
  checkpoint: [[0, Y2, -133], [2.6, Y3, -251]],
  stars: [
    [5.5, LV2 + 0.75 + 1.0, -95],
    { pos: [-5.2, Y3 + 0.4, -256.4], hidden: true, id: 'stern_ring' },    // 1: erscheint, wenn alle Sternmünzen eingesammelt sind
    [-5, Y3 + 3.3, -300],
  ],
  stamp: [4.5, -3.4 + 2.8, -154],
  goal: [0, Y3, -356],
  marks: {
    start: [0, Y0, 5], klotz1: [0, Y0 + 0.1, -9.2], plateau1: [0, Y0, -62], wuerfel: [0, Y0 + 0.1, -67.7], insel: [5.5, LV2 + 0.75, -95],
    festland: [0, Y2, -133], saeule: [4.5, -3.4, -154], klotz3: [0, Y2 + 0.1, -183.2], plateau3: [0, Y3, -251], klotz4: [0, Y3 + 0.1, -263.3],
    ziel: [0, Y3, -352],
  },
  _inferno: { Y0, Y2, Y3, LV1, LV2, LV3, LV4, C1, C2, PFAD1, PFAD2, PFADS, PFAD3, PFAD4, RING, S1, S2, SS, S3, S4 },
};
