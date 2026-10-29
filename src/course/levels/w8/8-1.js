// 8-1 „Stachelstege der Regenfestung“ (Bauplan 8-1: Parcours, 400 s, ca. 260 m, 5 Abschnitte – regnerische Außenfestung mit
// Stachelfallen, Knochenflieger). Thema rainfort, Musik course_rainfort.
//
// Eine Außenfestung Baron Brummbärs im Dauerregen: schmale Steinstege zwischen Wachtürmen hoch über dem Burggraben. Abschnitte
// (nach −Z, Laufhöhe y 1, Absturz unter y −8):
//   1. Stachelstege-Auftakt (z 11 … −54): Torhof, zwei schmale Stege mit Stachelfallen im festen Takt (eine Welle aus drei),
//      Knochenflieger stoßen von oben herab; Warp-Box über den breiten Graben.
//   2. Werferstege (z −69 … −132): Stegstücke mit 3-m-Lücken, Feuer-Werfer auf den Plattformen; links vom ersten Werfer die
//      Kletter-Säule (Stern 0, nur mit dem Krallen-Anzug); Warp-Box zur Kontrollpunkt-Insel.
//   3. Kontrollpunkt-Insel (z −147 … −165): nach Südwesten ein Steg (Stachelfalle) zum Stempel-Turm; die Wand dahinter ist mit
//      dem Krallen-Anzug kletterbar – oben die Rätselbox in die Wachstube des Barons (Stern 1: die Wache besiegen).
//   4. Knochenflieger-Strecke (z −165 … −228): große Knochenflieger-Gruppen, die sich nach dem Besiegen neu zusammensetzen;
//      nach der großen Keil-Gruppe führen einzelne Fallblöcke hinaus zu Stern 2.
//   5. Stachel-Schwebeplattformen (z −228 … −273): Stachelblöcke (oben begehbar, an den Seiten Stacheln) tragen über den
//      Abgrund; Warp-Box zum Zielturm.

import { isl, line, ring, arc, column, sign, falle, fallblockRuhig, regenfestung81, RF } from './_helpers_a.js';

const Y = 1;            // Laufhöhe der Festung
const PI = Math.PI;
const BX = 90;          // Wachstube (abseits)

// Plätze [x0, x1, zA, zB, Fassaden-Seiten] und Stege [x0, x1, zA, zB, Laternen] – aus ihnen entstehen Inseln und Kulisse
const PLAETZE = {
  torhof: [-7, 7, 11, -6], turm1: [-4, 4, -20, -27], turm2: [-5, 5, -45, -54],
  ankunft: [-5, 5, -69, -77], werfer1: [-6, 6, -89, -98], werfer2: [-5, 5, -110, -119], werfer3: [-5, 5, -125, -132],
  cp: [-8, 8, -147, -165], stempel: [-22, -16, -144, -152, 'flb'],
  keil: [-7, 7, -180, -192], ring: [-7, 7, -208, -220],
  schwebe: [-5, 5, -228, -236], warp: [3, 13, -264.4, -273], ziel: [-6, 6, -288, -304],
  bonus: [BX - 9, BX + 9, -140, -160],
};
const STEGE = [
  [-1.3, 1.3, -6, -20], [-1.2, 1.2, -27, -45],
  [-1.3, 1.3, -77, -82, false], [-1.3, 1.3, -85, -89, false], [-1.3, 1.3, -101, -107], [-1.3, 1.3, -119, -125, false],
  [-16, -8, -148.3, -150.7],
  [-1.5, 1.5, -165, -180], [-1.5, 1.5, -192, -208], [-1.5, 1.5, -220, -228, false],
];
const platz = (k, h = 7) => { const [x0, x1, zA, zB] = PLAETZE[k]; return isl(x0, x1, zA, zB, Y, h); };
const steg = ([x0, x1, zA, zB]) => isl(x0, x1, zA, zB, Y, 1.6, { top: 'stone' });
const werfer = (id, x, z, o = {}) => ({ kind: 'feuer_werfer', id, pos: [x, o.y ?? Y, z], axis: o.axis ?? [1, 0], pace: o.pace ?? 1.1, sight: o.sight ?? 11, interval: o.interval ?? 2.6, ...o });

function build(level) {
  regenfestung81(level, {
    Y,
    plaetze: Object.entries(PLAETZE).map(([, r]) => r),
    stege: STEGE,
    // keine Platten unter Fallen, Warp-Boxen und der Kletterwand
    avoid: [[-1.4, 1.4, -11.8, -14.2], [-1.4, 1.4, -29.8, -42.2], [-1.6, 1.6, -195.8, -204.2], [-13.2, -10.8, -148.2, -150.8],
      [1.6, 3.4, -49.6, -51.4], [-3.4, -1.6, -72.1, -73.9], [1.6, 3.4, -128.1, -129.9], [3.6, 5.4, -149.6, -151.4], [7.1, 8.9, -268.1, -269.9],
      [-3.9, -2.1, -291.1, -292.9], [-5.4, -3.4, -94.7, -96.5], [-22, -16, -152, -152.5], [BX - 6.3, BX - 4.5, -145.3, -147.1]],
    mauern: [
      { from: [-6.7, 10.6], to: [-6.7, -3.5], faces: [1] }, { from: [6.7, 10.6], to: [6.7, -3.5], faces: [-1] },
      { from: [-7.7, -153], to: [-7.7, -162.6], faces: [1] }, { from: [7.7, -147.4], to: [7.7, -162.6], faces: [-1] },
      { from: [-6.7, -180.4], to: [-6.7, -191.6], faces: [1] },
      { from: [-6.7, -208.4], to: [-6.7, -219.6], faces: [1] }, { from: [6.7, -208.4], to: [6.7, -219.6], faces: [-1] },
      { from: [-5.7, -288.4], to: [-5.7, -301.4], faces: [1] }, { from: [5.7, -288.4], to: [5.7, -301.4], faces: [-1] },
    ],
    tuerme: [
      // an den hinteren Ecken der Plätze (fest)
      { x: -6.1, y: Y, z: -4.9, r: 1.1, h: 5.4, roof: RF.roofs[0], solid: true }, { x: 6.1, y: Y, z: -4.9, r: 1.1, h: 5.4, roof: RF.roofs[1], solid: true },
      { x: -4.2, y: Y, z: -52.9, r: 0.9, h: 4.6, roof: RF.roofs[2], solid: true },
      { x: 4.6, y: Y, z: -76, r: 0.9, h: 4.6, roof: RF.roofs[3], solid: true },
      { x: -6.9, y: Y, z: -163.9, r: 1.1, h: 6, roof: RF.roofs[1], solid: true }, { x: 6.9, y: Y, z: -163.9, r: 1.1, h: 6, roof: RF.roofs[4], solid: true },
      { x: 4.2, y: Y, z: -235, r: 0.9, h: 4.8, roof: RF.roofs[0], solid: true },
      { x: -4.9, y: Y, z: -302.9, r: 1.1, h: 7.5, roof: RF.roofs[1], solid: true }, { x: 4.9, y: Y, z: -302.9, r: 1.1, h: 7.5, roof: RF.roofs[0], solid: true },
      // Kulisse im Graben (fern)
      ...[[-24, -10, 2.2, 1], [26, -38, 2.6, 0], [-28, -80, 2.4, 3], [24, -112, 2.2, 2], [-34, -138, 2.8, 0], [28, -170, 2.4, 1],
        [-26, -202, 2.2, 4], [27, -232, 2.6, 2], [-22, -262, 3, 0], [24, -290, 2.4, 3], [-26, -312, 2.6, 1]].map(([x, z, r, k]) =>
        ({ x, y: -14, z, r, h: 15 + (Math.abs(x) % 4), roof: RF.roofs[k] })),
    ],
    // rote Läufer mit Goldborte über die Plätze (der Weg ist auch im Regen gut zu sehen)
    laeufer: [[-1.1, 1.1, 10.2, -5.6], [-1, 1, -20.4, -26.6], [-1, 1, -45.4, -53.6], [-1, 1, -69.4, -76.6], [-1.2, 1.2, -89.4, -97.6],
      [-1.2, 1.2, -110.4, -118.6], [-1.2, 1.2, -125.4, -131.6], [-1.4, 1.4, -147.4, -164.6], [-1.2, 1.2, -180.4, -191.6],
      [-1.2, 1.2, -208.4, -219.6], [-1, 1, -228.4, -235.6], [-1.4, 1.4, -288.4, -303.6], [BX - 1.5, BX + 1.5, -144.6, -158.4]],
    // Frösche an den Pfützen
    froesche: [[-4.9, 6.2, 0.5], [3.3, -24.2, 2.6], [-4.1, -91.4, -0.4], [6, -155.7, 3], [4.6, -217.2, 2.2], [4.4, -294.3, 2.8], [-1.6, -47.9, 0.9]],
    // Wappenschilde des Barons an den Brüstungen (Innenseite)
    wappen: [[-6.4, 6, 1, 0], [-6.4, 1, 1, 0], [6.4, 6, -1, 0], [6.4, 1, -1, 0], [-7.4, -157, 1, 0], [-7.4, -161, 1, 0], [7.4, -151.5, -1, 0],
      [7.4, -159.5, -1, 0], [-6.4, -186, 1, 0], [-6.4, -211, 1, 0], [6.4, -217, -1, 0], [-5.4, -292, 1, 0], [5.4, -298, -1, 0]]
      .map(([x, z, nx, nz]) => ({ x, z, nx, nz })),
    // Burggraben: matt und dunkel, mit Regenringen
    graben: { y: -11, x0: -90, x1: 150, z0: 70, z1: -370 },
  });
}

function setup(level) {
  fallblockRuhig(level, 'fall_stern');
}

export const LEVEL = {
  id: '8-1',
  world: 8,
  title: 'Stachelstege der Regenfestung',
  archetype: 'parcours',
  theme: 'rainfort',
  music: 'course_rainfort',
  timeLimit: 400,
  killY: -8,
  farHide: 60,
  instances: { coin: { farHide: 44, shadow: false } },
  build,
  setup,
  start: { pos: [0, Y, 6], yaw: PI / 2 },
  camera: [
    { from: 16, to: -56, pitch: 44, dist: 13.5, fov: 40, x: 0, xLock: 0.3, area: [-40, 40] },
    { from: -56, to: -134, pitch: 45, dist: 13.5, fov: 40, x: 0, xLock: 0.3, area: [-40, 40] },
    { from: -134, to: -166, pitch: 46, dist: 14, fov: 40, x: -4, xLock: 0.2, area: [-40, 40] },
    { from: -166, to: -228, pitch: 45, dist: 14, fov: 40, x: 0, xLock: 0.3, area: [-40, 40] },
    { from: -228, to: -310, pitch: 46, dist: 14, fov: 40, x: 2, xLock: 0.3, area: [-40, 40] },
    // Wachstube (abseits)
    { from: -130, to: -175, pitch: 48, dist: 14, fov: 40, x: BX, xLock: 0.5, area: [BX - 25, BX + 25] },
  ],
  segments: [
    // ================================================================ Plätze und Stege (Listen oben)
    ...Object.keys(PLAETZE).map((k) => platz(k)),
    ...STEGE.map(steg),
    sign(-5.2, Y, 3.4, 'Regenfestung', { yaw: 0.25 }),
    { type: 'wall', pos: [-4.4, Y, -95.6], size: [1.8, 7, 1.8], climbable: true },    // Kletter-Säule (Stern 0)
    { type: 'wall', pos: [-19, Y, -153.5], size: [6, 9, 3], climbable: true },        // Kletterwand (Rätselbox oben)
    { type: 'fallblock_bruecke', id: 'fall_stern', mode: 'einzeln', blocks: [[9.4, Y - 0.6, -186], [12, Y - 0.3, -186.3], [14.6, Y, -186], [17.2, Y + 0.3, -186.3]], size: [1.6, 0.6, 1.6], respawn: 5 },

    // ================================================================ 5 Stachel-Schwebeplattformen
    { type: 'stachelblock', id: 'schwebe1', pos: [0, Y - 1, -238.2], size: [3, 1, 3], color: 'blau', spikes: ['unten', '+x', '-x'], move: [0, 0, -9], speed: 2.4, wait: 1.6, warn: 0.6 },
    { type: 'stachelblock', id: 'schwebe2', pos: [0, Y - 1, -251.2], size: [3, 1, 3], color: 'blau', spikes: ['unten', '+z', '-z'], move: [8, 0, 0], speed: 2.4, wait: 1.6, warn: 0.6, phase: 1.5 },
    { type: 'stachelblock', id: 'schwebe3', pos: [8, Y - 1, -255.4], size: [3, 1, 3], color: 'rot', spikes: ['unten', '+x', '-x'], move: [0, 0, -7], speed: 1.8 },

    // ================================================================ Wachstube des Barons (Rätselbox)
    { type: 'room', pos: [BX, Y, -151.5], size: [15, 4.4, 15], floor: false, top: 'stone' },
    sign(BX + 1.5, Y, -145.2, 'Besiege die Wache!', { size: [2.8, 0.9] }),

    // ================================================================ Kulisse (Registry-Modelle: Pfützen, Regentonnen, Wasserspeier, Fahnen, Fackeln)
    { type: 'deco_w8', items: [
      { kind: 'pfuetze', pos: [-3.5, Y + 0.02, 6.5], size: [2.4, 1.6] }, { kind: 'pfuetze', pos: [4, Y + 0.02, -2.5], size: [1.8, 1.2] },
      { kind: 'regentonne', pos: [-5.6, Y, 8.6] }, { kind: 'regentonne', pos: [-5.9, Y, 7.3], height: 1 },
      // Wasserspeier an den Brüstungen: der Strahl plätschert in eine Pfütze auf dem Platz
      { kind: 'wasserspeier', pos: [-6.4, Y, 3.5], yaw: 0, height: 1.25 }, { kind: 'pfuetze', pos: [-4.5, Y + 0.02, 3.5], size: [1.6, 1.2] },
      { kind: 'pfuetze', pos: [2.4, Y + 0.02, -24.6], size: [1.6, 1.1] },
      { kind: 'pfuetze', pos: [-2.6, Y + 0.02, -47.4], size: [1.8, 1.2] },
      { kind: 'regentonne', pos: [4, Y, -70.4] }, { kind: 'pfuetze', pos: [-3, Y + 0.02, -91], size: [2, 1.3] },
      { kind: 'pfuetze', pos: [2.8, Y + 0.02, -116.4], size: [1.8, 1.2] }, { kind: 'regentonne', pos: [-4, Y, -126.4] },
      { kind: 'pfuetze', pos: [4.6, Y + 0.02, -156], size: [2.6, 1.6] }, { kind: 'pfuetze', pos: [-4, Y + 0.02, -160.8], size: [1.8, 1.2] },
      { kind: 'regentonne', pos: [6.8, Y, -148.2] }, { kind: 'regentonne', pos: [6.6, Y, -149.5], height: 1 },
      { kind: 'wasserspeier', pos: [-7.4, Y, -154.6], yaw: 0, height: 1.25 }, { kind: 'pfuetze', pos: [-5.5, Y + 0.02, -154.6], size: [1.6, 1.2] },
      { kind: 'pfuetze', pos: [-20.4, Y + 0.02, -145.2], size: [1.4, 1] },
      { kind: 'pfuetze', pos: [3.4, Y + 0.02, -184], size: [2.2, 1.4] }, { kind: 'regentonne', pos: [-6, Y, -181.2] },
      { kind: 'pfuetze', pos: [-3.4, Y + 0.02, -213.6], size: [2.2, 1.4] }, { kind: 'pfuetze', pos: [3.2, Y + 0.02, -217.6], size: [1.6, 1.1] },
      { kind: 'wasserspeier', pos: [6.4, Y, -213.5], yaw: PI, height: 1.25 }, { kind: 'pfuetze', pos: [4.5, Y + 0.02, -213.5], size: [1.6, 1.2] },
      { kind: 'wasserspeier', pos: [-5.4, Y, -295.5], yaw: 0, height: 1.25 }, { kind: 'pfuetze', pos: [-3.5, Y + 0.02, -295.5], size: [1.5, 1.1] },
      { kind: 'regentonne', pos: [-4, Y, -229.4] }, { kind: 'pfuetze', pos: [8, Y + 0.02, -265.8], size: [1.6, 1.1] },
      { kind: 'pfuetze', pos: [3, Y + 0.02, -294], size: [2.4, 1.5] }, { kind: 'regentonne', pos: [-4.8, Y, -289.4] },
      { kind: 'festungsfahne', pos: [-5.4, Y, -97.2], yaw: 0 }, { kind: 'festungsfahne', pos: [5.4, Y, -97.2], yaw: PI },
      { kind: 'festungsfahne', pos: [-4.4, Y, -297.4], yaw: 0 }, { kind: 'festungsfahne', pos: [4.4, Y, -297.4], yaw: PI },
      // Glühbirnenketten zwischen den Ecktürmen, Wimpel auf den Brüstungen des Torhofs
      { kind: 'gluehbirnen', from: [-6.1, Y + 4.8, -4.9], to: [6.1, Y + 4.8, -4.9], sag: 0.9 },
      { kind: 'gluehbirnen', from: [-6.9, Y + 5.2, -163.9], to: [6.9, Y + 5.2, -163.9], sag: 1 },
      { kind: 'gluehbirnen', from: [-4.9, Y + 6.2, -302.9], to: [4.9, Y + 6.2, -302.9], sag: 0.9 },
      { kind: 'wimpel', from: [-6.7, Y + 2.2, 10.4], to: [-6.7, Y + 2.2, -3.4], sag: 0.5 },
      { kind: 'wimpel', from: [6.7, Y + 2.2, 10.4], to: [6.7, Y + 2.2, -3.4], sag: 0.5 },
      { kind: 'wimpel', from: [-6.7, Y + 2.2, -208.6], to: [-6.7, Y + 2.2, -219.4], sag: 0.5 },
      { kind: 'wimpel', from: [6.7, Y + 2.2, -208.6], to: [6.7, Y + 2.2, -219.4], sag: 0.5 },
      // Wachstube
      { kind: 'bilderrahmen', pos: [BX - 2, Y + 1.8, -158.6], yaw: -PI / 2 }, { kind: 'regentonne', pos: [BX - 6.4, Y, -157.6] },
      { kind: 'kerzenleuchter', pos: [BX + 6.4, Y, -158] }, { kind: 'standuhr', pos: [BX + 6.6, Y, -146.4], solid: true },
    ] },
    { type: 'deco_w7', items: [
      { kind: 'fahne', hang: true, pos: [-3, Y + 4.2, -5.5], yaw: -PI / 2, length: 2, width: 1.2 },
      { kind: 'fahne', hang: true, pos: [-6.9, Y + 4.8, -162.6], yaw: -PI / 2, length: 2.2, width: 1.1 },
      { kind: 'fahne', hang: true, pos: [6.9, Y + 4.8, -162.6], yaw: -PI / 2, length: 2.2, width: 1.1 },
      { kind: 'fahne', hang: true, pos: [-4.9, Y + 6, -301.6], yaw: -PI / 2, length: 2.4, width: 1.1 },
      { kind: 'fahne', hang: true, pos: [4.9, Y + 6, -301.6], yaw: -PI / 2, length: 2.4, width: 1.1 },
      { kind: 'fackel', pos: [-6.2, Y, 0.5], mount: 'stand' }, { kind: 'fackel', pos: [6.2, Y, 0.5], mount: 'stand' },
      { kind: 'fackel', pos: [-3.6, Y, -21], mount: 'stand' }, { kind: 'fackel', pos: [3.6, Y, -21], mount: 'stand' },
      { kind: 'fackel', pos: [-4.4, Y, -46], mount: 'stand' }, { kind: 'fackel', pos: [-4.4, Y, -70], mount: 'stand' },
      { kind: 'fackel', pos: [5.4, Y, -90], mount: 'stand' }, { kind: 'fackel', pos: [-4.4, Y, -111], mount: 'stand' }, { kind: 'fackel', pos: [4.4, Y, -126], mount: 'stand' },
      { kind: 'fackel', pos: [-7.2, Y, -147.6], mount: 'stand' }, { kind: 'fackel', pos: [-21.4, Y, -144.6], mount: 'stand' },
      { kind: 'knochen', pos: [5.4, Y, -183], n: 4 }, { kind: 'knochen', pos: [-5.2, Y, -217.4], n: 5 }, { kind: 'knochen', pos: [3.6, Y, -230], n: 3 },
      { kind: 'fackel', pos: [-6.2, Y, -186], mount: 'stand' }, { kind: 'fackel', pos: [6.2, Y, -214], mount: 'stand' },
      { kind: 'fackel', pos: [-4.4, Y, -265.4], mount: 'stand' },
      { kind: 'kette', pos: [-1.6, Y + 6, -5.6], length: 2.6 }, { kind: 'kette', pos: [1.6, Y + 6, -5.6], length: 2.6 },
      { kind: 'fackel', pos: [BX - 7, Y, -145], mount: 'stand' }, { kind: 'knochen', pos: [BX + 5, Y, -157], n: 3 },
    ] },
  ],
  blocks: [
    { kind: 'question', pos: [-2.5, Y + 1.9, -1], content: 'krallen' },
    { kind: 'coinblock', pos: [2.5, Y + 2.4, -1], count: 6 },
    { kind: 'hidden', pos: [5.5, Y + 2.6, 8], content: 'oneup' },                     // Extraleben am Torhof
    { kind: 'question', pos: [2.2, Y + 1.9, -73], content: 'krallen' },
    { kind: 'question', pos: [-2.5, Y + 1.9, -152], content: 'krallen' },
    { kind: 'question', pos: [2.5, Y + 2.4, -161], content: 'wachstumsbeere' },
    { kind: 'hidden', pos: [BX + 6, Y + 2.6, -156], content: 'oneup' },               // Extraleben in der Wachstube
  ],
  enemies: [
    werfer('werfer1', 1.8, -94.5),
    werfer('werfer2', -1.6, -114.5, { pace: 1.4 }),
    werfer('werfer3', 1.6, -128.5, { weapon: 'hammer', pace: 0.8, interval: 3 }),
    // Knochenflieger-Gruppen (setzen sich nach dem Draufspringen neu zusammen; Power-up/Stampfen auf den Haufen = endgültig)
    { kind: 'knochenflieger_gruppe', id: 'kg_turm1', pos: [0, Y + 4.6, -23.5], count: 3, formation: 'ring', radius: 1.5, center: [0, Y + 4.6, -23.5], orbit: 0.8, sight: 6, respawn: 4 },
    { kind: 'knochenflieger_gruppe', id: 'kg_turm2', count: 3, formation: 'linie', spacing: 1.5, path: [[-3.5, Y + 4.8, -47], [3.5, Y + 4.8, -47], [3.5, Y + 4.8, -52], [-3.5, Y + 4.8, -52]], loop: true, sight: 5.5, respawn: 4 },
    { kind: 'knochenflieger_gruppe', id: 'kg_steg', count: 4, formation: 'linie', spacing: 1.6, path: [[0, Y + 5, -167], [0, Y + 5, -178]], sight: 5.5, respawn: 4 },
    { kind: 'knochenflieger_gruppe', id: 'kg_keil', pos: [0, Y + 5.2, -186], count: 7, formation: 'keil', spacing: 1.5, center: [0, Y + 5.2, -186], orbit: 2.6, sight: 6.5, respawn: 4 },
    { kind: 'knochenflieger_gruppe', id: 'kg_ring', pos: [0, Y + 5, -214], count: 8, formation: 'ring', radius: 2.6, center: [0, Y + 5, -214], orbit: 1.6, spin: 0.8, sight: 6.5, respawn: 4 },
    // Wachstube (Rätselbox): die Wache des Barons
    { kind: 'pilzling', id: 'wache1', pos: [BX - 4, Y, -150], behavior: 'chase', sight: 6, wake: 30 },
    { kind: 'pilzling', id: 'wache2', pos: [BX + 4, Y, -150], behavior: 'chase', sight: 6, wake: 30 },
    { kind: 'krallen_pilzling', id: 'wache3', pos: [BX - 3, Y, -155], dir: [1, 0], wake: 30 },
    { kind: 'krallen_pilzling', id: 'wache4', pos: [BX + 3, Y, -155], dir: [-1, 0], wake: 30 },
  ],
  items: [
    falle('falle1', 0, Y, -13, { size: [2.6, 2.2] }),
    falle('falle2', 0, Y, -31, { size: [2.4, 2.2], phase: 0 }),
    falle('falle3', 0, Y, -36, { size: [2.4, 2.2], phase: 0.3 }),
    falle('falle4', 0, Y, -41, { size: [2.4, 2.2], phase: 0.6 }),
    falle('falle5', 0, Y, -197, { size: [3, 2.2], phase: 0.2 }),
    falle('falle6', 0, Y, -203, { size: [3, 2.2], phase: 0.7 }),
    falle('falle7', -12, Y, -149.5, { size: [2.2, 2.4], phase: 0.45 }),
    // Warp-Boxen: Graben (1 → 2), Kontrollpunkt, Zielturm
    { kind: 'warpbox', id: 'warp1', pos: [2.5, Y, -50.5], target: 'warp1b' },
    { kind: 'warpbox', id: 'warp1b', pos: [-2.5, Y, -73], target: 'warp1' },
    { kind: 'warpbox', id: 'warp2', pos: [2.5, Y, -129], target: 'warp2b' },
    { kind: 'warpbox', id: 'warp2b', pos: [4.5, Y, -150.5], target: 'warp2' },
    { kind: 'warpbox', id: 'warpZ', pos: [8, Y, -269], target: 'warpZb' },
    { kind: 'warpbox', id: 'warpZb', pos: [-3, Y, -292], target: 'warpZ' },
    // Rätselbox oben auf der Kletterwand → Wachstube
    { kind: 'warpbox', id: 'raetsel', style: 'mystery', pos: [-19, Y + 9, -153.5], target: 'raetsel2' },
    { kind: 'warpbox', id: 'raetsel2', style: 'mystery', pos: [BX - 5.4, Y, -146.2], target: [-4, Y, -158],
      task: { area: { min: [BX - 8, Y - 1, -159], max: [BX + 8, Y + 6, -144] }, star: 1, pos: [BX, Y + 1.2, -152] } },
    // Münzen
    line([0, Y + 0.6, 2], [0, Y + 0.6, -4], 4),
    line([0, Y + 0.6, -8], [0, Y + 0.6, -18], 5),
    ring([0, Y + 0.6, -23.5], 1.6, 6),
    line([0, Y + 0.6, -28.5], [0, Y + 0.6, -43.5], 7),
    arc([0, Y + 0.6, -79], [0, Y + 0.6, -88], 5, 1.6),
    arc([0, Y + 0.6, -97], [0, Y + 0.6, -103], 4, 1.4),
    arc([0, Y + 0.6, -106], [0, Y + 0.6, -111], 4, 1.4),
    column(-4.4, -97.2, Y + 1.2, Y + 6, 4),                         // Hinweis: an der Säule hinauf
    line([0, Y + 0.6, -167], [0, Y + 0.6, -178], 6),
    line([0, Y + 0.6, -194], [0, Y + 0.6, -206], 6),
    ring([0, Y + 0.6, -214], 2.2, 8),
    line([0, Y + 0.6, -222], [0, Y + 0.6, -227], 3),
    line([-18.5, Y + 0.6, -150], [-11, Y + 0.6, -149.5], 4),
    ring([0, Y + 0.6, -298], 2.4, 10),
    ring([BX, Y + 0.6, -152], 3, 10),
  ],
  checkpoint: { pos: [0, Y, -157], yaw: PI / 2 },
  stars: [
    [-4.4, Y + 7.1, -95.6],                                         // 0: oben auf der Kletter-Säule
    { pos: [BX, Y + 1.2, -152], hidden: true, id: 'stern1' },       // 1: Wachstube (Rätselbox)
    [17.2, Y + 1.0, -186.3],                                        // 2: auf dem letzten Fallblock
  ],
  stamp: [-19, Y + 0.6, -146.5],
  goal: [0, Y, -300],
  marks: {
    start: [0, Y, 6], steg1: [0, Y, -10], turm1: [0, Y, -23], steg2: [0, Y, -29], turm2: [0, Y, -48],
    ankunft: [0, Y, -71], werfer1: [0, Y, -91], werfer2: [0, Y, -112], werfer3: [0, Y, -127],
    cp: [0, Y, -157], stempel: [-19, Y, -147], wand: [-19, Y, -151.5], keil: [0, Y, -183], ring: [0, Y, -211],
    schwebe: [0, Y, -232], warp: [8, Y, -266], ziel: [0, Y, -296], bonus: [BX, Y, -145],
  },
};
