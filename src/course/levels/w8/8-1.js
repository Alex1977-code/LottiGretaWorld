// 8-1 „Stachelstege der Regenfestung“ (Bauplan 8-1: Parcours, 400 s, ca. 260 m, 5 Abschnitte – regnerische Außenfestung mit
// Stachelfallen, Knochenflieger). Thema rainfort, Musik course_rainfort.
//
// Eine Außenfestung Baron Brummbärs im Dauerregen: schmale Steinstege zwischen Wachtürmen hoch über dem Burggraben. Abschnitte
// (nach −Z, Laufhöhe y 1, Absturz unter y −8):
//   1. Stachelstege-Auftakt (z 10 … −54): Torhof, zwei schmale Stege mit Stachelfallen im festen Takt (eine Welle aus drei),
//      Knochenflieger stoßen von oben herab; Warp-Box über den breiten Graben.
//   2. Werferstege (z −69 … −132): Stegstücke mit 3-m-Lücken, Feuer-Werfer auf den Plattformen; links vom ersten Werfer die
//      Kletter-Säule (Stern 0, nur mit dem Krallen-Anzug); Warp-Box zur Kontrollpunkt-Insel.
//   3. Kontrollpunkt-Insel (z −147 … −165): nach Südwesten ein Holzsteg zum Stempel-Turm; die Wand dahinter ist mit dem
//      Krallen-Anzug kletterbar – oben die Rätselbox in den Bonus-Hof (Stern 1).
//   4. Knochenflieger-Strecke (z −165 … −228): große Knochenflieger-Gruppen, die sich nach dem Besiegen neu zusammensetzen;
//      nach der großen Keil-Gruppe führen einzelne Fallblöcke hinaus zu Stern 2.
//   5. Stachel-Schwebeplattformen (z −228 … −273): Stachelblöcke (oben begehbar, ringsum Stacheln) tragen über den Abgrund;
//      Warp-Box zum Zielturm.

import { isl, line, ring, arc, column, sign, falle } from './_helpers_a.js';

const Y = 1;            // Laufhöhe der Festung
const PI = Math.PI;
const BX = 90;          // Bonus-Hof (abseits)

const steg = (zA, zB, w = 2.6, x = 0) => isl(x - w / 2, x + w / 2, zA, zB, Y, 1.6, { top: 'stone' });
const werfer = (id, x, z, o = {}) => ({ kind: 'feuer_werfer', id, pos: [x, o.y ?? Y, z], axis: o.axis ?? [1, 0], pace: o.pace ?? 1.1, sight: o.sight ?? 11, interval: o.interval ?? 2.6, ...o });

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
  start: { pos: [0, Y, 6], yaw: PI / 2 },
  camera: [
    { from: 16, to: -56, pitch: 44, dist: 13.5, fov: 40, x: 0, xLock: 0.3, area: [-40, 40] },
    { from: -56, to: -134, pitch: 45, dist: 13.5, fov: 40, x: 0, xLock: 0.3, area: [-40, 40] },
    { from: -134, to: -166, pitch: 46, dist: 14, fov: 40, x: -4, xLock: 0.2, area: [-40, 40] },
    { from: -166, to: -228, pitch: 45, dist: 14, fov: 40, x: 0, xLock: 0.3, area: [-40, 40] },
    { from: -228, to: -310, pitch: 46, dist: 14, fov: 40, x: 2, xLock: 0.3, area: [-40, 40] },
    // Bonus-Hof (abseits)
    { from: -130, to: -175, pitch: 48, dist: 14, fov: 40, x: BX, xLock: 0.5, area: [BX - 25, BX + 25] },
  ],
  segments: [
    // ================================================================ 1 Stachelstege-Auftakt
    isl(-7, 7, 11, -6, Y, 7),                                       // Torhof
    sign(-5.2, Y, 3.4, 'Regenfestung', { yaw: 0.25 }),
    steg(-6, -20),                                                  // Steg 1: eine Falle
    isl(-4, 4, -20, -27, Y, 6),                                     // Turm 1
    steg(-27, -45, 2.4),                                            // Steg 2: Welle aus drei Fallen
    isl(-5, 5, -45, -54, Y, 6),                                     // Turm 2 (Warp-Box)

    // ================================================================ 2 Werferstege
    isl(-5, 5, -69, -77, Y, 6),                                     // Ankunft
    steg(-77, -82),
    steg(-85, -89),                                                 // 3-m-Lücken
    isl(-6, 6, -89, -98, Y, 6),                                     // Werfer-Platz 1
    { type: 'wall', pos: [-4.4, Y, -95.6], size: [1.8, 7, 1.8], climbable: true },    // Kletter-Säule (Stern 0)
    steg(-101, -107),
    isl(-5, 5, -110, -119, Y, 6),                                   // Werfer-Platz 2
    steg(-119, -125),
    isl(-5, 5, -125, -132, Y, 6),                                   // Werfer-Platz 3 (Warp-Box)

    // ================================================================ 3 Kontrollpunkt-Insel
    isl(-8, 8, -147, -165, Y, 7),
    { type: 'bridge', from: [-8, Y, -149.5], to: [-16, Y, -149.5], width: 2 },        // Holzsteg nach Südwesten
    isl(-22, -16, -144, -152, Y, 7),                                // Stempel-Turm
    { type: 'wall', pos: [-19, Y, -153.5], size: [6, 9, 3], climbable: true },        // Kletterwand (Rätselbox oben)

    // ================================================================ 4 Knochenflieger-Strecke
    steg(-165, -180, 3),
    isl(-7, 7, -180, -192, Y, 7),                                   // Platz der Keil-Gruppe
    steg(-192, -208, 3),
    isl(-7, 7, -208, -220, Y, 7),                                   // Platz der großen Ring-Gruppe
    steg(-220, -228, 3),
    { type: 'fallblock_bruecke', id: 'fall_stern', mode: 'einzeln', blocks: [[9.6, Y - 0.6, -186], [12.4, Y - 0.2, -186.4], [15.2, Y + 0.2, -186], [18, Y + 0.6, -186.4]], size: [1.6, 0.6, 1.6], respawn: 5 },

    // ================================================================ 5 Stachel-Schwebeplattformen
    isl(-5, 5, -228, -236, Y, 6),
    { type: 'stachelblock', id: 'schwebe1', pos: [0, Y - 1, -238.2], size: [3, 1, 3], color: 'blau', spikes: ['unten', '+x', '-x'], move: [0, 0, -9], speed: 2.4, wait: 1.6, warn: 0.6 },
    { type: 'stachelblock', id: 'schwebe2', pos: [0, Y - 1, -251.2], size: [3, 1, 3], color: 'blau', spikes: ['unten', '+z', '-z'], move: [8, 0, 0], speed: 2.4, wait: 1.6, warn: 0.6, phase: 1.5 },
    { type: 'stachelblock', id: 'schwebe3', pos: [8, Y - 1, -255.4], size: [3, 1, 3], color: 'rot', spikes: ['unten', '+x', '-x'], move: [0, 0, -7], speed: 1.8 },
    isl(3, 13, -264.4, -273, Y, 6),                                 // Warp-Turm
    isl(-6, 6, -288, -304, Y, 7),                                   // Zielturm

    // ================================================================ Bonus-Hof (abseits)
    isl(BX - 9, BX + 9, -140, -160, Y, 6),
  ],
  blocks: [
    { kind: 'question', pos: [-2.5, Y + 2.4, -1], content: 'krallen' },
    { kind: 'coinblock', pos: [2.5, Y + 2.4, -1], count: 6 },
    { kind: 'hidden', pos: [5.5, Y + 2.6, 8], content: 'oneup' },                     // Extraleben am Torhof
    { kind: 'question', pos: [2.2, Y + 2.4, -73], content: 'krallen' },
    { kind: 'question', pos: [-2.5, Y + 2.4, -152], content: 'krallen' },
    { kind: 'question', pos: [2.5, Y + 2.4, -161], content: 'wachstumsbeere' },
    { kind: 'hidden', pos: [BX + 6, Y + 2.6, -156], content: 'oneup' },               // Extraleben im Bonus-Hof
  ],
  enemies: [
    werfer('werfer1', 1.8, -94.5),
    werfer('werfer2', -1.6, -114.5, { pace: 1.4 }),
    werfer('werfer3', 1.6, -128.5, { weapon: 'hammer', pace: 0.8, interval: 3 }),
  ],
  items: [
    falle('falle1', 0, Y, -13, { size: [2.6, 2.2] }),
    falle('falle2', 0, Y, -31, { size: [2.4, 2.2], phase: 0 }),
    falle('falle3', 0, Y, -36, { size: [2.4, 2.2], phase: 0.3 }),
    falle('falle4', 0, Y, -41, { size: [2.4, 2.2], phase: 0.6 }),
    falle('falle5', 0, Y, -197, { size: [3, 2.2], phase: 0.2 }),
    falle('falle6', 0, Y, -203, { size: [3, 2.2], phase: 0.7 }),
    // Warp-Boxen: Graben (1 → 2), Kontrollpunkt, Zielturm
    { kind: 'warpbox', id: 'warp1', pos: [2.5, Y, -50.5], target: 'warp1b' },
    { kind: 'warpbox', id: 'warp1b', pos: [-2.5, Y, -73], target: 'warp1' },
    { kind: 'warpbox', id: 'warp2', pos: [2.5, Y, -129], target: 'warp2b' },
    { kind: 'warpbox', id: 'warp2b', pos: [4.5, Y, -150.5], target: 'warp2' },
    { kind: 'warpbox', id: 'warpZ', pos: [8, Y, -269], target: 'warpZb' },
    { kind: 'warpbox', id: 'warpZb', pos: [-3, Y, -292], target: 'warpZ' },
    // Rätselbox oben auf der Kletterwand → Bonus-Hof
    { kind: 'warpbox', id: 'raetsel', style: 'mystery', pos: [-19, Y + 9, -153.5], target: 'raetsel2' },
    { kind: 'warpbox', id: 'raetsel2', style: 'mystery', pos: [BX, Y, -143.5], target: [-4, Y, -158],
      task: { area: { min: [BX - 9, Y - 1, -160], max: [BX + 9, Y + 8, -140] }, star: 1, pos: [BX, Y + 1.2, -151] } },
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
    ring([BX, Y + 0.6, -151], 3, 10),
  ],
  checkpoint: { pos: [0, Y, -157], yaw: PI / 2 },
  stars: [
    [-4.4, Y + 7.1, -95.6],                                         // 0: oben auf der Kletter-Säule
    { pos: [BX, Y + 1.2, -151], hidden: true, id: 'stern1' },       // 1: Bonus-Hof (Rätselbox)
    [18, Y + 1.3, -186.4],                                          // 2: auf dem letzten Fallblock
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
