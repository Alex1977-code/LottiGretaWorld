// 6-6 „Kanonenturm im Wolkenwerk“ – Maschinenhalle hoch über den Wolken (Bauplan: Detail 6-6). Thema factory, Musik
// course_factory, 500 s. Stark senkrecht: vom Werkstor (y 0) über Kletterwand, Förderband-Decks, eine fahrende
// Kanonen-Plattform und die Riesenprojektil-Lücke bis auf den Turm (y 59); ≈ 230 m nach −Z plus 60 m Höhe.
//
// Abschnitte:
//   A  Werkstor          z   8 … −14  y  0   Start, ?-Block, Kessel, Schlote, Zahnräder; Schild „Wolkenwerk“
//   B  Kletterwand       z −14 … −24  y 0→14 Metall-Klettergitter (14 m) an einem Maschinenblock; ein Projektilkopf
//                                            fliegt quer über das Gitter. Oben ein Schlot mit Förderband-Aufzug →
//                                            höchster Punkt des Abschnitts (Stern 0)
//   C  Wolken, Bänder    z −24 … −80  y 14→20 Wolken über der Lücke, Deck mit Gegen-Förderband und Kanone,
//                                            Förderband-Aufzug (Wand) aufs obere Deck (darüber versteckter 1-Up-Block),
//                                            Querband, verpuffende Wolken, Warp-Box
//   D  Checkpoint        z −84 … −99  y 30   Ankunft der Warp-Box, Checkpoint, Rätselbox → Förderband-Raum (x 80):
//                                            Zeitring, acht blaue Münzen rund um ein Rundband in 10 s (Stern 1)
//   E  Kanonen-Floß      z −99 … −145 y 30   fahrende Plattform mit drei Kanonen (startet beim Draufsteigen)
//   F  Obere Wolken      z −145 … −192 y 30→34 Wolkentreppe, Riesenkanone schießt Riesenprojektile über die Lücke
//   G  Förderband-Turm   z −192 … −209 y 34→59 Checkpoint, Krallen-Automat; drei Bandwände (10 + 10 + 5 m, laufen
//                                            aufwärts, nur mit Krallen-Anzug); links ein Aufzugsband hoch → Steg nach
//                                            rechts zu Stern 2
//   H  Ziel              z −209 … −224 y 59   Zielmast; Ziegel auf einem Sockel – von ihm aus springen → Stempel
// Sterne (Index): 0 Schlot über der Kletterwand, 1 Rundband-Raum (Rätselbox), 2 links hoch, oben rechts.
// Extraleben: versteckter Block über dem Aufzugsband (Abschnitt C).

import {
  isl, line, ring, blk, cyl, sph, cone, bakeParts, glowPoints, farHide, levelSetup, cullStatic, heroShadowDiet,
  startBeimDraufstehen, krallenAutomat, traeger, zahnraeder, dampf,
} from './_helpers_c.js';

// Höhen
const YA = 0, YB = 14, YC2 = 20, YD = 30, YF = 34, YH = 59;
const T1 = 44, T2 = 54;                 // Terrassen am Förderband-Turm
const ZT = [-206, -207.5, -209];        // Vorderkanten der drei Bandwände
const RX = 80;                          // Förderband-Raum (Rätselbox)

const plat = (x0, x1, zA, zB, top, h = 6, o = {}) => isl(x0, x1, zA, zB, top, h, { top: 'grass', under: 0, ...o });
const sign = (x, y, z, text, o = {}) => ({ type: 'sign', pos: [x, y, z], text, ...o });

function build(level) {
  const P = [];
  // ---------------------------------------------------------------- Träger, Geländer, Warnstreifen (verschmolzen)
  for (const [a, b] of [
    [[-7.4, YA, 7], [-7.4, YA + 6, 7]], [[7.4, YA, 7], [7.4, YA + 6, 7]], [[-7.4, YA + 6, 7], [7.4, YA + 6, 7]],
    [[-6.4, YB, -33.5], [-6.4, YB + 5, -33.5]], [[6.4, YB, -33.5], [6.4, YB + 5, -33.5]],
    [[-6.6, YC2, -79.5], [-6.6, YC2 + 6, -79.5]], [[6.6, YC2, -79.5], [6.6, YC2 + 6, -79.5]], [[-6.6, YC2 + 6, -79.5], [6.6, YC2 + 6, -79.5]],
    [[-6.6, YD, -98.6], [-6.6, YD + 4, -98.6]], [[6.6, YD, -98.6], [6.6, YD + 4, -98.6]],
  ]) traeger(P, a, b, { w: 0.5, color: 0xe8483a });
  for (const [x0, x1, z, y] of [[-7, 7, -13.6, YA], [-5.5, 5.5, -52.7, YB], [-6, 6, -61.7, YC2], [-6, 6, -98.6, YD], [-9, 9, -205.6, YF]]) {
    for (let x = x0; x < x1 - 0.01; x += 0.8) P.push(blk(0.4, 0.02, 0.5, x + 0.2, y, z, ((x - x0) / 0.4) % 2 < 1 ? 0xffc21a : 0x2a2a34));
  }
  // Nieten-Reihen an den Deck-Kanten
  for (const [x0, x1, z, y] of [[-7, 7, 8, YA], [-5.5, 5.5, -33, YB], [-6, 6, -53, YC2], [-6, 6, -85, YD]]) {
    for (let x = x0 + 0.5; x < x1; x += 1) P.push(sph(0.07, x, y - 0.25, z + 0.04, 0xd8dce6));
  }
  bakeParts(level, P, { castShadow: false });
}

function setup(level) {
  startBeimDraufstehen(level, 'kanonenfloss');
  krallenAutomat(level, { pos: [5.5, YF, -198.5] });
  zahnraeder(level, [
    { pos: [-8.4, 4, -6], radius: 2.2, axis: 'x', speed: 0.35, color: 'messing' },
    { pos: [-8.4, 7.2, -10], radius: 1.3, axis: 'x', speed: -0.6, color: 'stahl' },
    { pos: [4.3, 9, -16], radius: 1.4, axis: 'z', speed: 0.5, color: 'kupfer' },
    { pos: [9.4, YB + 3, -44], radius: 2.4, axis: 'x', speed: -0.3, color: 'messing' },
    { pos: [-9.6, YF + 8, -205], radius: 2.6, axis: 'z', speed: 0.25, color: 'stahl' },
    { pos: [9.6, YF + 12, -205], radius: 2.0, axis: 'z', speed: -0.4, color: 'kupfer' },
  ]);
  dampf(level, [[-5.5, YA + 7.6, 4], [6, YA + 8.6, 2], [-3.5, YC2 + 6.4, -72], [7, YF + 9, -194]], { size: 1.8 });
  heroShadowDiet(level, 0.12);
  farHide(level, ['pilzling', 'projektilkopf', 'kanone_turm', 'riesenprojektil', 'star', 'powerup'], 58);
}

export const LEVEL = {
  id: '6-6',
  world: 6,
  title: 'Kanonenturm im Wolkenwerk',
  archetype: 'parcours',
  theme: 'factory',
  music: 'course_factory',
  timeLimit: 500,
  killY: YA - 12,
  build,
  setup: (level, scene) => { levelSetup(setup)(level, scene); cullStatic(level); },
  start: { pos: [0, YA, 5], yaw: Math.PI / 2 },
  camera: [
    { from: 12, to: -11, pitch: 40, dist: 14 },
    { from: -11, to: -25, pitch: 24, dist: 15, height: 1.6 },
    { from: -25, to: -52, pitch: 42, dist: 14 },
    { from: -52, to: -82, pitch: 42, dist: 14 },
    { from: -82, to: -100, pitch: 44, dist: 14 },
    { from: -100, to: -146, pitch: 40, dist: 15 },
    { from: -146, to: -191, pitch: 38, dist: 15 },
    { from: -191, to: -209, pitch: 22, dist: 16, height: 1.6 },
    { from: -209, to: -228, pitch: 42, dist: 14 },
    { from: -82, to: -106, pitch: 46, dist: 14, area: [RX - 12, RX + 12] },
  ],
  segments: [
    // ---------------- A Werkstor
    plat(-7, 7, 8, -14, YA, 8),
    sign(-4.6, YA, 6.2, 'Wolkenwerk'),
    { type: 'deco_w6', items: [
      { kind: 'kessel', pos: [-5.5, YA, 3.6], height: 3, radius: 1.1, solid: true },
      { kind: 'schornstein', pos: [6, YA, 1.8], height: 7 },
      { kind: 'rohr', from: [-6.8, 2.2, 1], to: [-6.8, 2.2, -12], r: 0.35, color: 0xc8783a },
      { kind: 'rohr', from: [6.8, 1.2, -2], to: [6.8, 1.2, -12], r: 0.3, color: 0x8a9aa8 },
      { kind: 'warnstreifen', pos: [0, YA, -11.5], size: [8, 0.6] },
      { kind: 'zahnrad', pos: [-6.6, YA + 0.6, -3.5], size: 1.2, axis: 'y' },
    ] },

    // ---------------- B Kletterwand: Maschinenblock mit Gitter, Schlot mit Aufzugsband (Stern 0)
    plat(-4, 4, -14, -24, YB, 22, { color: 0x5a6476 }),
    { type: 'klettergitter', id: 'kletterwand', mode: 'wand', pos: [0, YA, -13.85], size: [6, YB], yaw: -Math.PI / 2, style: 'metall', wall: false },
    plat(-10.4, -7.6, -12.4, -14.4, YA + 6, 14, { color: 0x5a6476 }),
    plat(1.2, 4, -19.5, -23.5, YB + 7, 7, { color: 0x6a7488 }),
    { type: 'foerderband', id: 'schlotband', mode: 'wand', pos: [1.08, YB, -21.5], width: 2.6, height: 7, yaw: Math.PI, speed: 1.8, ledges: 2.2, ledge: 0.7 },
    { type: 'deco_w6', items: [{ kind: 'zahnrad', pos: [-3, YB, -22.6], size: 1.1, axis: 'y' }, { kind: 'warnstreifen', pos: [-1.5, YB, -15], size: [4, 0.5] }] },

    // ---------------- C Wolken, Förderbänder, Aufzugsband, Warp-Box
    { type: 'wolkenplattform', id: 'wolke_c1', pos: [-1.2, YB - 0.6, -27], size: [3, 0.6, 3] },
    { type: 'wolkenplattform', id: 'wolke_c2', path: [[1.6, YB - 0.6, -30.6], [-1.6, YB - 0.6, -30.6]], size: [3, 0.6, 3], speed: 1.1, wait: 0.6 },
    plat(-5.5, 5.5, -33, -53, YB, 8),
    { type: 'foerderband', id: 'band_c1', pos: [0, YB, -43], size: [3, 0.3, 14], dir: [0, 1], speed: 2.5 },
    plat(5.5, 7.6, -39, -41, YB, 6, { color: 0x5a6476 }),
    { type: 'foerderband', id: 'aufzug_c', mode: 'wand', pos: [0, YB, -52.88], width: 3, height: YC2 - YB, yaw: -Math.PI / 2, speed: 1.6, ledges: 2, ledge: 0.7 },
    plat(-6, 6, -53, -62, YC2, 12),
    { type: 'foerderband', id: 'querband', pos: [0, YC2, -57.5], size: [12, 0.3, 3], dir: [1, 0], speed: 2.2 },
    { type: 'wolkenplattform', id: 'wolke_c3', pos: [-2, YC2 - 0.6, -64], size: [2.6, 0.6, 2.6], vanish: 1.0, respawn: 2.5 },
    { type: 'wolkenplattform', id: 'wolke_c4', pos: [2, YC2 - 0.6, -66.2], size: [2.6, 0.6, 2.6], vanish: 1.0, respawn: 2.5 },
    { type: 'wolkenplattform', id: 'wolke_c5', path: [[-3, YC2 - 0.6, -65.6], [3, YC2 - 0.6, -65.6]], size: [2.4, 0.6, 2.4], speed: 1.4, wait: 0.4 },
    plat(-6, 6, -68, -80, YC2, 12),
    plat(-8.6, -6, -71, -73, YC2, 6, { color: 0x5a6476 }),
    sign(4.4, YC2, -70.2, 'Warp-Box\nzum Checkpoint'),
    { type: 'deco_w6', items: [
      { kind: 'kessel', pos: [4.4, YB, -50.6], height: 2.4, radius: 0.9, solid: true },
      { kind: 'zahnrad', pos: [-4.4, YB, -35], size: 1.0, axis: 'y' },
      { kind: 'rohr', from: [-5.2, YB + 1.5, -34], to: [-5.2, YB + 1.5, -50], r: 0.3, color: 0x8a9aa8 },
      { kind: 'schornstein', pos: [-3.5, YC2, -76.5], height: 5 },
      { kind: 'warnstreifen', pos: [0, YC2, -74.8], size: [3.2, 0.5] },
    ] },

    // ---------------- D Checkpoint (nur per Warp-Box erreichbar), Rätselbox
    plat(-6, 6, -85, -99, YD, 10),
    sign(-4.5, YD, -86.2, 'Rätselbox:\nRundband in 10 s'),

    // ---------------- Förderband-Raum (x 80)
    plat(RX - 10, RX + 10, -84, -104, YD, 6),
    { type: 'foerderband', id: 'rundband', mode: 'rund', pos: [RX, YD + 1.6, -95], length: 10, height: 2.4, width: 3, yaw: 0, speed: 2.2, ledges: 2, ledge: 0.5 },

    // ---------------- E Kanonen-Floß (fährt, sobald man draufsteht)
    { type: 'vehicle', id: 'kanonenfloss', style: 'plain', size: [6, 1, 9], path: [[0, YD - 1, -103.5], [0, YD - 1, -140.5]], speed: 2.6, mode: 'once', color: 0x6a7488, accent: 0xffc21a },

    // ---------------- F Obere Wolken, Riesenkanone
    plat(-5, 5, -145, -153, YD, 8),
    { type: 'wolkenplattform', id: 'wolke_f1', pos: [0, YD + 1.0, -156.2], size: [3, 0.6, 3] },
    { type: 'wolkenplattform', id: 'wolke_f2', pos: [2.4, YD + 2.6, -159.6], size: [3, 0.6, 3] },
    plat(-4, 4, -162, -168, YF, 8),
    { type: 'wolkenplattform', id: 'wolke_f3', pos: [-4.5, YF - 0.6, -178], size: [2.6, 0.6, 2.6], vanish: 1.2, respawn: 3 },
    { type: 'wolkenplattform', id: 'wolke_f4', pos: [-4.5, YF - 0.6, -185], size: [2.6, 0.6, 2.6], vanish: 1.2, respawn: 3 },

    // ---------------- G Förderband-Turm: Deck, drei Bandwände mit Terrassen, linkes Aufzugsband, Steg
    plat(-9, 9, -192, -206, YF, 10),
    plat(-9, 9, ZT[0], ZT[1], T1, T1 - YF + 10),
    plat(-9, 9, ZT[1], ZT[2], T2, T2 - YF + 10),
    plat(-9, 9, ZT[2], -224, YH, YH - YF + 10),
    { type: 'foerderband', id: 'turmband1', mode: 'wand', pos: [0, YF, ZT[0] + 0.12], width: 3.2, height: T1 - YF, yaw: -Math.PI / 2, speed: 1.4, ledges: 0 },
    { type: 'foerderband', id: 'turmband2', mode: 'wand', pos: [0, T1, ZT[1] + 0.12], width: 3.2, height: T2 - T1, yaw: -Math.PI / 2, speed: 1.4, ledges: 0 },
    { type: 'foerderband', id: 'turmband3', mode: 'wand', pos: [0, T2, ZT[2] + 0.12], width: 3.2, height: YH - T2, yaw: -Math.PI / 2, speed: 1.4, ledges: 0 },
    { type: 'foerderband', id: 'linksband', mode: 'wand', pos: [-6.5, YF, ZT[0] + 0.12], width: 2.4, height: 14, yaw: -Math.PI / 2, speed: 1.7, ledges: 2.2, ledge: 0.7, style: 'rot' },
    plat(-9, -5, -204.6, ZT[0], YF + 14, 1.0, { color: 0x5a6476 }),
    plat(-5, 7.4, -205.0, ZT[0], YF + 14, 0.5, { color: 0xd8483a }),
    sign(-3.4, YF, -194, 'Nur mit\nKrallen-Anzug!'),

    // ---------------- H Ziel: Sockel mit Ziegel (Stempel)
    plat(3, 4, -212.5, -213.5, YH + 2, 2, { color: 0x6a7488 }),
  ],
  blocks: [
    { kind: 'question', pos: [-2.5, YA + 3.4, 1.5], content: 'wachstumsbeere' },
    { kind: 'question', pos: [-1.5, YA + 3.4, 1.5], content: 'coins:5' },
    { kind: 'hidden', id: 'extraleben', pos: [0, YC2 + 2.6, -53.4], content: 'oneup' },
    { kind: 'brick', id: 'ziegel', pos: [3.5, YH + 2, -213] },
    { kind: 'question', pos: [-5.5, YF + 3.4, -197], content: 'krallen' },
  ],
  enemies: [
    // Projektilkopf-Kanonen
    { kind: 'kanone_turm', id: 'kanone_wand', pos: [-9, YA + 6, -13.4], dir: [1, 0], height: 1.6, interval: 4.2, first: 2.0, range: 16, speed: 4, life: 5, max: 1 },
    { kind: 'kanone_turm', id: 'kanone_c1', pos: [6.5, YB, -40], dir: [-1, 0], height: 1.4, interval: 3.2, first: 1.0, range: 14, speed: 4.5, life: 4, max: 1 },
    { kind: 'kanone_turm', id: 'kanone_c2', pos: [-7.3, YC2, -72], dir: [1, 0], height: 1.4, interval: 3.0, first: 0.6, range: 14, speed: 5, life: 4, max: 1 },
    ...[-2, 0, 2].map((x, k) => ({ kind: 'kanone_turm', id: `floss_kanone${k + 1}`, attach: 'kanonenfloss', pos: [x, YD, -107.3], dir: [0, 1], height: 1.4, interval: 3.6, first: 0.8 + k * 1.2, range: 12, speed: 4.5, life: 2.6, max: 1 })),
    { kind: 'kanone_turm', id: 'kanone_t1', pos: [-8.2, T1, -206.75], dir: [1, 0], height: 1.4, interval: 4.5, first: 1.5, range: 12, speed: 4.5, life: 4, max: 1 },
    { kind: 'riesenkanone', id: 'riesenkanone', pos: [0, YF - 2.4, -170.2], dir: [0, -1], height: 2.6, interval: 5.5, first: 1.0, range: 30, speed: 3.6, life: 9, max: 2, hidden: true },
    // Pilzlinge auf den Decks (das Gegenband trägt sie)
    { kind: 'pilzling', pos: [0, YB + 0.3, -46], dir: [0, 1], speed: 1.0 },
    { kind: 'pilzling', pos: [-3.6, YB, -49], dir: [1, 0], speed: 1.2 },
    { kind: 'pilzling', pos: [2.5, YC2, -75], dir: [-1, 0], speed: 1.2 },
    { kind: 'pilzling', pos: [-4, YD, -146.5], dir: [1, 0], speed: 1.1 },
  ],
  items: [
    // Warp-Box zum Checkpoint (Ziel: Punkt auf dem Checkpoint-Deck)
    { kind: 'warpbox', id: 'warp_cp', pos: [0, YC2, -77.6], target: [-3, YD + 0.2, -89] },
    // Rätselbox hin und zurück, Zeitring mit acht blauen Münzen rund um das Rundband
    { kind: 'warpbox', id: 'rb1', style: 'mystery', pos: [3.6, YD, -94], target: 'rb2' },
    { kind: 'warpbox', id: 'rb2', style: 'mystery', pos: [RX - 7, YD, -88], target: 'rb1' },
    { kind: 'timering', id: 'zeitring', pos: [RX - 7.4, YD, -95], yaw: 0, time: 10, star: 1,
      coins: [[RX - 5.3, YD + 2.2, -95], [RX - 5.3, YD + 3.6, -95], [RX - 2.5, YD + 4.7, -95], [RX + 1, YD + 4.7, -95], [RX + 4.2, YD + 4.7, -95], [RX + 6.4, YD + 2.6, -95],
        [RX + 2.5, YD + 0.5, -95], [RX - 1.5, YD + 0.5, -95]] },
    // Bitcoin-Pfade
    line([0, YA + 0.6, 2], [0, YA + 0.6, -9], 5),
    line([0, YB - 0.1 + 1.3, -26.8], [0, YB + 1.3, -31], 3),
    line([-3.6, YB + 0.6, -36], [-3.6, YB + 0.6, -48], 5),
    ring([0, YC2 + 1.2, -65.2], 2.2, 8),
    line([0, YD + 1.6, -112], [0, YD + 1.6, -132], 6),
    line([0, YF + 2.6, -172], [0, YF + 2.6, -188], 6),
    line([-6.5, YF + 4, -205.2], [-6.5, YF + 12, -205.2], 4),
    ring([0, YH + 0.6, -216], 2.4, 8),
  ],
  checkpoint: [[-3, YD, -91.5], [-5.5, YF, -195.5]],
  stars: [
    [2.6, YB + 7.1, -21.5],
    { pos: [RX, YD + 4.2, -95], hidden: true, id: 'stern_rundband' },
    [6.6, YF + 14.2, -205.5],
  ],
  stamp: [3.5, YH + 7.4, -213],
  goal: { pos: [0, YH, -220] },
  marks: {
    start: [0, YA, 5], wand: [0, YA, -12.6], wandOben: [0, YB, -16], schlot: [0.3, YB, -21.5],
    c1: [0, YB, -34], c2: [0, YC2, -54.5], warp: [0, YC2, -76], cp: [-3, YD, -89], raum: [RX - 7, YD, -91],
    floss: [0, YD, -104], f0: [0, YD, -148], f1: [0, YF, -165], g: [0, YF, -195], t1: [0, T1, -206.7], t2: [0, T2, -208.2],
    oben: [0, YH, -212], links: [-6.5, YF, -204],
  },
  _w6c: { YA, YB, YC2, YD, YF, YH, T1, T2, ZT, RX },
};
