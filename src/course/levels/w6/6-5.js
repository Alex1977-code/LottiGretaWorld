// 6-5 „Pustewind am Eisgipfel“ – verschneite Gipfel über dem Wolkenmeer (Bauplan: Detail 6-5). Thema snowwind, Musik
// course_snowwind, 400 s, ≈ 270 m nach −Z: oben los, den Pustewolken-Hang hinab, durch zwei Glasröhren und über windige
// Abgründe bis auf den Gipfel.
//
// Abschnitte:
//   A  Schneestart        z   8 … −14  y 0      Iglu, Schneemann, Schlittschuh; Treppe aus zwei ?-Blöcken und einem
//                                               versteckten Block → Stern 0 hoch darüber; rechts die Stachelplattform mit
//                                               dem Stempel (nur mit Schlittschuh)
//   B  Eissee             z −14 … −54  y 0      rutschiger See, Eisläufer-Pilzlinge, Eisblöcke, Schneehaufen
//   C  Pustewolken-Hang   z −54 … −100 y 0→−10,5 drei Hangstücke mit Absätzen, Pustewolken blasen quer (Schneewälle mit
//                                               Lücken), unten Glasröhre 1
//   D  Zweiter Eissee     z −118 … −160 y −6   Checkpoint, Schlittschuh; rechts die Stachelbrücke zur Rätselbox
//                                               (Schlittschuh-Bahn bei x 90: acht blaue Münzen in 10 s → Stern 1)
//   E  Windiger Abgrund   z −160 … −200 y −6   Schneeschollen mit 5–6 m Lücken, quer blasende Windböen; über der dritten
//                                               Lücke ein Aufwind und Stern 2 hoch in der Luft
//   F  Glotzfisch-Bucht   z −200 … −244 y −6,5 Eisschollen im Wasser, Glotzfische springen von Loch zu Loch; Glasröhre 2
//                                               hinauf zum Gipfel
//   G  Gipfel             z −250 … −272 y 4    Zielmast, Fahnen, Schneekiefern
// Sterne (Index): 0 über den ?-Blöcken und dem versteckten Block, 1 Rätselbox (Schlittschuh-Bahn), 2 über dem windigen Abgrund.
// Stempel: Stachelplattform am Start (mit Schlittschuh). Extraleben: versteckter Block (Treppe am Start).

import { isl, line, ring, farHide, levelSetup, cullStatic, heroShadowDiet } from './_helpers_c.js';

const Y0 = 0, YH = -10.5, YD = -6, YF = -6.5, YW = -7.6, YG = 4;
const RX = 90;                          // Schlittschuh-Bahn (Rätselbox)

const snow = (x0, x1, zA, zB, top, h = 6, o = {}) => isl(x0, x1, zA, zB, top, h, { top: 'grass', under: 2, ...o });
const sign = (x, y, z, text, o = {}) => ({ type: 'sign', pos: [x, y, z], text, ...o });
/** Niedrige Schneeufer links und rechts eines Eissees (statt der teuren Eiskante); gaps: [[seite, z0, z1], …] lässt Lücken. */
const bank = (x0, x1, zA, zB, top, gaps = []) => {
  const out = [];
  for (const [side, xa, xb] of [[-1, x0 - 1.2, x0], [1, x1, x1 + 1.2]]) {
    let z = zA;
    const gs = gaps.filter((g) => g[0] === side).sort((a, b) => b[1] - a[1]);
    for (const [, g0, g1] of gs) { if (z > g0) out.push(isl(xa, xb, z, g0, top + 0.5, 2, { top: 'grass', under: 0 })); z = g1; }
    if (z > zB) out.push(isl(xa, xb, z, zB, top + 0.5, 2, { top: 'grass', under: 0 }));
  }
  return out;
};
const ramp = (x0, x1, zHigh, zLow, yHigh, yLow, base = yLow - 3) => ({ type: 'ramp', pos: [(x0 + x1) / 2, base, (zHigh + zLow) / 2], size: [x1 - x0, yHigh - base, Math.abs(zHigh - zLow)], axis: 'z', dir: 1, low: yLow - base });

// Schneeschollen über dem windigen Abgrund (z-Bereiche) und Eisschollen der Glotzfisch-Bucht ([x0, x1, z0, z1])
const SCHOLLEN = [[-163, -169], [-174.5, -179.5], [-185, -190], [-195.5, -200]];
const FLOES = [[-3, 3, -200, -205], [-4.5, 0.5, -207.5, -212], [-0.5, 4.5, -214.5, -219], [-4, 1, -221.5, -226], [-1, 4, -228.5, -233], [-3, 3, -235.5, -244]];
// je ein Glotzfisch quer über jeder Lücke zwischen den Eisschollen (Bogen kreuzt den Sprungweg)
const FISH_HOLES = [[[-3.6, YW, -206.25], [3.6, YW, -206.25]], [[5.6, YW, -213.25], [-3, YW, -213.25]], [[-3.4, YW, -220.25], [5.4, YW, -220.25]],
  [[5, YW, -227.25], [-4.4, YW, -227.25]], [[-3.6, YW, -234.25], [5, YW, -234.25]]];

function setup(level) {
  heroShadowDiet(level, 0.12);
  farHide(level, ['pustewolke', 'glotzfisch', 'pilzling_eis', 'star', 'schlittschuh'], 56);
}

export const LEVEL = {
  id: '6-5',
  world: 6,
  title: 'Pustewind am Eisgipfel',
  archetype: 'parcours',
  theme: 'snowwind',
  music: 'course_snowwind',
  timeLimit: 400,
  killY: YH - 14,
  setup: (level, scene) => { levelSetup(setup)(level, scene); cullStatic(level); },
  start: { pos: [0, Y0, 5], yaw: Math.PI / 2 },
  camera: [
    { from: 12, to: -14, pitch: 42, dist: 14 },
    { from: -14, to: -54, pitch: 44, dist: 14 },
    { from: -54, to: -101, pitch: 40, dist: 14.5 },
    { from: -101, to: -118, pitch: 34, dist: 15 },
    { from: -118, to: -160, pitch: 44, dist: 14 },
    { from: -160, to: -200, pitch: 46, dist: 14.5 },
    { from: -200, to: -246, pitch: 46, dist: 14 },
    { from: -246, to: -275, pitch: 40, dist: 14 },
    { from: -110, to: -150, pitch: 52, dist: 16, area: [RX - 20, RX + 20] },
  ],
  segments: [
    // ---------------- A Schneestart: Plateau, Stufe, Stachelplattform (Rampe hinauf)
    { type: 'schneefeld', pos: [0, Y0 - 2, -3], size: [18, 2, 22], under: 2.5 },
    snow(-8, -5.6, -1.6, -4.4, Y0 + 1.4, 1.4),
    snow(10, 22, 0, -12, Y0 + 1, 4),
    { type: 'ramp', pos: [8.5, Y0, -6], size: [3, 1, 12], axis: 'x', dir: 1, low: 0 },
    { type: 'stachelboden', pos: [16, Y0 + 1, -6], size: [12, 0.25, 12] },
    sign(-6.5, Y0, 5.6, 'Eisgipfel'),
    sign(8, Y0, 2.2, 'Stacheln? Nur mit\nSchlittschuhen!', { size: [2.8, 1.0] }),
    { type: 'iglu', pos: [-6.8, Y0, 3.6], size: 3.4, yaw: 0.3 },
    { type: 'deco_w3', items: [{ kind: 'schneemann', pos: [6.5, Y0, 6.2], yaw: -0.6 }, { kind: 'tannen', pos: [-7.5, Y0, -10], size: [3, 6], n: 3 }] },
    { type: 'deco_w6', items: [{ kind: 'schneekiefer', pos: [7.5, Y0, -12], height: 4.5 }, { kind: 'schneehaufen', pos: [-4, Y0, 6.5] }, { kind: 'schneehaufen', pos: [3.5, Y0, -12.6], size: 1.1 }] },

    // ---------------- B Eissee
    { type: 'eisflaeche', pos: [0, Y0 - 1, -34], size: [16, 1, 40], edge: false },
    ...bank(-8, 8, -14, -54, Y0),
    { type: 'deco_w6', items: [
      { kind: 'schneekiefer', pos: [-9.6, Y0 - 0.6, -22], height: 4 }, { kind: 'schneekiefer', pos: [9.8, Y0 - 0.6, -40], height: 5 },
      { kind: 'wolke', pos: [-12, Y0 - 3, -30], size: 3 }, { kind: 'wolke', pos: [13, Y0 - 4, -46], size: 3.4 },
    ] },

    // ---------------- C Pustewolken-Hang (drei Hangstücke, Absätze, Schneewälle mit Lücken), Glasröhre 1
    snow(-9.2, 9.2, -53.2, -55, Y0, 4),
    ramp(-5, 5, -55, -66, Y0, -4),
    snow(-5, 5, -66, -70, -4, 4),
    ramp(-5, 5, -70, -82, -4, -8),
    snow(-5, 5, -82, -86, -8, 4),
    ramp(-5, 5, -86, -94, -8, YH),
    snow(-6, 6, -94, -101, YH, 4),
    // Schneewälle (Lücken dort, wohin die Wolken pusten)
    snow(4.6, 5.4, -66, -67.4, -3.3, 0.7), snow(4.6, 5.4, -69.2, -70, -3.3, 0.7),
    snow(-5.4, -4.6, -76, -82, -5.4 - 0.6, 0.4, { under: 0 }),
    snow(4.6, 5.4, -82, -83, -7.3, 0.7), snow(4.6, 5.4, -85.2, -86, -7.3, 0.7),
    { type: 'glasnetz', id: 'roehre1', radius: 1, speed: 12, exitSpeed: 6,
      nodes: { A: [0, YH + 1.05, -100.2], B: [0, YD + 1.05, -118.6] },
      pipes: [{ from: 'A', to: 'B', via: [[0, YH + 1.05, -103.5], [0, YH + 3.5, -107], [0, YD + 4.6, -111.5], [0, YD + 2.2, -114.8], [0, YD + 1.05, -116.6]], coins: 4 }],
      ends: { B: { enter: false } } },
    { type: 'deco_w6', items: [
      { kind: 'felsen', pos: [-8.5, -6, -76], size: [3, 10], n: 3, shadow: false }, { kind: 'schneekiefer', pos: [7.6, -8, -91], height: 4 },
      { kind: 'wolken', pos: [0, -16, -80], size: [26, 30], n: 5, shadow: false }, { kind: 'schneehaufen', pos: [-4.4, YH, -96] },
    ] },

    // ---------------- D Zweiter Eissee mit Checkpoint, Stachelbrücke zur Rätselbox
    { type: 'eisflaeche', pos: [0, YD - 1, -139], size: [16, 1, 42], edge: false },
    ...bank(-8, 8, -118, -160, YD, [[1, -128.6, -131.8]]),
    snow(8, 18, -129, -131.4, YD, 3, { color: 0x8a98b4 }),
    { type: 'stachelboden', pos: [13, YD, -130.2], size: [10, 0.25, 2.4] },
    snow(18, 24.5, -125.5, -134.5, YD, 5),
    sign(6.4, YD, -127, 'Stachelbrücke'),

    // ---------------- Schlittschuh-Bahn (Rätselbox, x 90): Eis-Oval mit Schneeinsel in der Mitte
    { type: 'eisflaeche', pos: [RX, YD - 1, -130], size: [34, 1, 34], edge: false },
    snow(RX - 6.5, RX + 6.5, -123.5, -136.5, YD + 1.2, 2.2, { color: 0xb4cae8 }),

    // ---------------- E Windiger Abgrund: Schollen, quer blasende Böen, Aufwind mit Stern
    snow(-9.2, 9.2, -159.4, -163, YD, 5),
    ...SCHOLLEN.map(([z0, z1]) => snow(-3.5, 3.5, z0, z1, YD, 5)),
    { type: 'windfeld', id: 'boe1', pos: [0, YD - 4, -171.8], size: [16, 9, 5.4], dir: [1, 0], strength: 6.5, period: 4.2, on: 1.6, warn: 1.0, source: 'wolke', fahne: [-3, YD, -168.4] },
    { type: 'windfeld', id: 'boe2', pos: [0, YD - 4, -182.2], size: [16, 9, 5.4], dir: [-1, 0], strength: 6.5, period: 4.2, on: 1.6, warn: 1.0, phase: 2.1, source: 'wolke', fahne: [3, YD, -179] },
    { type: 'windfeld', id: 'aufwind', pos: [0, YD - 6, -193], size: [6, 16, 5.8], dir: [0, 1, 0], strength: 10, period: 3.6, on: 1.8, warn: 0.8, source: 'ventil' },
    { type: 'deco_w6', items: [
      { kind: 'wolke', pos: [-9, YD - 2, -176], size: 3.2 }, { kind: 'wolke', pos: [10, YD - 3, -188], size: 3.6 },
      { kind: 'schneekiefer', pos: [2.6, YD, -165.4], height: 3.2 }, { kind: 'schneehaufen', pos: [-2.6, YD, -187] },
    ] },

    // ---------------- F Glotzfisch-Bucht: Wasser, Eisschollen, Glasröhre 2 hinauf zum Gipfel
    { type: 'water', pos: [0, YW - 3, -224], size: [30, 3, 50] },
    ...FLOES.map(([x0, x1, z0, z1]) => snow(x0, x1, z0, z1, YF, 3, { color: 0xcfe6f8 })),
    { type: 'glasnetz', id: 'roehre2', radius: 1, speed: 13, exitSpeed: 6,
      nodes: { A: [0, YF + 1.05, -243.2], B: [0, YG + 1.05, -253.5] },
      pipes: [{ from: 'A', to: 'B', via: [[0, YF + 1.05, -245.5], [0, YF + 3, -247.5], [0, YG - 1, -248.5], [0, YG + 3.5, -250], [0, YG + 1.05, -252]], coins: 3 }],
      ends: { B: { enter: false } } },

    // ---------------- G Gipfel
    snow(-8, 8, -252, -272, YG, 10),
    { type: 'deco_w6', items: [
      { kind: 'bergkiefern', pos: [-6, YG, -268], size: [4, 6], n: 3, snow: true }, { kind: 'schneekiefer', pos: [6.6, YG, -258], height: 5 },
      { kind: 'schneehaufen', pos: [5.5, YG, -270] }, { kind: 'wolkenberg', pos: [-22, -14, -262], size: 14, height: 9, shadow: false },
    ] },
  ],
  blocks: [
    { kind: 'question', pos: [-4.4, Y0 + 3.0, -3], content: 'coin' },
    { kind: 'question', pos: [-1.9, Y0 + 5.8, -3], content: 'coins:3' },
    { kind: 'hidden', id: 'versteckt', pos: [0.6, Y0 + 8.6, -3], content: 'oneup' },
    { kind: 'question', pos: [-3, Y0 + 3.4, -18], content: 'wachstumsbeere' },
    { kind: 'question', pos: [-2, YD + 3.4, -124], content: 'coins:5' },
  ],
  enemies: [
    { kind: 'pilzling_eis', pos: [-3, Y0, -30], center: [-1, Y0, -30], radius: 4, rz: 6 },
    { kind: 'pilzling_eis', pos: [3, Y0, -44], center: [2, Y0, -44], radius: 3.5, rz: 5, cw: true },
    // Pustewolken am Hang (≈ 1,4 m über dem Weg, blasen quer)
    { kind: 'pustewolke', id: 'puste1', pos: [-6.6, -4 + 1.4, -68], dir: [1, 0], reach: 6.5, phase: 0 },
    { kind: 'pustewolke', id: 'puste2', pos: [6.6, -6 + 1.4, -77], dir: [-1, 0], reach: 6.5, phase: 1.4 },
    { kind: 'pustewolke', id: 'puste3', pos: [-6.6, -8 + 1.4, -84], dir: [1, 0], reach: 6.5, phase: 2.6 },
    { kind: 'pustewolke', id: 'puste4', pos: [-5, YH + 1.5, -97.5], dir: [1, 0], reach: 6.5, phase: 0.8 },
    { kind: 'pilzling_eis', pos: [2, YD, -146], center: [0, YD, -146], radius: 4, rz: 6 },
    { kind: 'pustewolke', id: 'puste5', pos: [5.5, YD + 1.5, -156], dir: [-1, 0], reach: 6 },
    // Glotzfische springen zwischen den Löchern der Bucht
    ...FISH_HOLES.map((holes, k) => ({ kind: 'glotzfisch', id: `fisch${k + 1}`, holes, height: 2.6, every: 2.8, phase: (k * 0.37) % 1, color: ['blau', 'gelb', 'blau', 'rosa', 'blau'][k] })),
  ],
  items: [
    { kind: 'schlittschuh', id: 'schlittschuh_start', pos: [4.2, Y0, 1.8], respawn: 4 },
    { kind: 'schlittschuh', id: 'schlittschuh_cp', pos: [4.4, YD, -121.5], respawn: 4 },
    // Rätselbox hin und zurück; Schlittschuh-Bahn mit Zeitring und acht blauen Münzen rund um die Schneeinsel
    { kind: 'warpbox', id: 'rb1', style: 'mystery', pos: [21.5, YD, -130], target: 'rb2' },
    { kind: 'warpbox', id: 'rb2', style: 'mystery', pos: [RX - 13, YD, -116], target: 'rb1' },
    { kind: 'schlittschuh', id: 'schlittschuh_bahn', pos: [RX - 11, YD, -117.5], respawn: 2 },
    { kind: 'timering', id: 'bahnring', pos: [RX - 10.5, YD, -125], yaw: Math.PI / 2, time: 10, star: 1,
      coins: Array.from({ length: 8 }, (_, k) => { const a = Math.PI + 0.55 + k * 0.72; return [RX + Math.cos(a) * 10.5, YD + 0.6, -130 - Math.sin(a) * 10.5]; }) },
    // Bitcoin-Pfade
    line([0, Y0 + 0.6, 2], [0, Y0 + 0.6, -10], 5),
    ring([0, Y0 + 0.6, -36], 3, 8),
    line([0, -4 + 0.6, -66.8], [0, -4 + 0.6, -69.2], 2),
    line([0, -8 + 0.6, -82.8], [0, -8 + 0.6, -85.2], 2),
    line([0, YD + 0.6, -130], [0, YD + 0.6, -150], 5),
    line([0, YD + 2.2, -170], [0, YD + 2.2, -173.5], 2), line([0, YD + 2.2, -180.6], [0, YD + 2.2, -184], 2),
    ring([0, YG + 0.6, -262], 2.4, 8),
  ],
  checkpoint: [[-4, YD, -122.5], [0, YD, -197.5]],
  stars: [
    [0.6, Y0 + 13.3, -3],
    { pos: [RX - 10.5, YD + 0.4, -121], hidden: true, id: 'stern_bahn' },
    [0, YD + 6.2, -193],
  ],
  stamp: [20.5, Y0 + 1.6, -9.5],
  goal: { pos: [0, YG, -266] },
  marks: {
    start: [0, Y0, 5], treppe: [-6.8, Y0 + 1.4, -3], stacheln: [9, Y0, -6], see: [0, Y0, -20], hang: [0, Y0, -54.5], absatz1: [0, -4, -68],
    absatz2: [0, -8, -84], roehre1: [0, YH, -98], see2: [0, YD, -121], bruecke: [8.6, YD, -130.2], insel: [20, YD, -130], bahn: [RX - 13, YD, -118],
    abgrund: [0, YD, -166], aufwind: [0, YD, -188], bucht: [0, YF, -202.5], roehre2: [0, YF, -241], gipfel: [0, YG, -256],
  },
  _w6c: { Y0, YH, YD, YF, YW, YG, RX, SCHOLLEN, FLOES },
};
