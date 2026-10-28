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

import { isl, line, ring, blk, cyl, cone, bakeParts, wimpel, farHide, levelSetup, cullStatic, heroShadowDiet, rampenKameraFrei } from './_helpers_c.js';

const Y0 = 0, YH = -10.5, YD = -6, YF = -6.5, YW = -7.6, YG = 4;
const RX = 90;                          // Schlittschuh-Bahn (Rätselbox)
const BAHN_R = 6.9;                     // Kreis der blauen Münzen (ganz auf dem Stachelrahmen)

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

// Farben der Kulisse (bunte Holzteile im Schnee)
const ROT = 0xe8483a, BLAU = 0x3a8ae8, GELB = 0xffc93a, HOLZ = 0x9a5a2e, WEISS = 0xf6faff, EIS = 0x8fd6ff;

/** Kulisse (statisch verschmolzen): Slalomstangen am Hang, Holzzäune, Skihütte, Wimpelketten, Eiszapfen, Eiskristalle. */
function build(level) {
  const P = [];
  const zaun = (x0, z0, x1, z1, y, o = {}) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 1.6)), yaw = Math.atan2(-(z1 - z0), x1 - x0);
    for (let k = 0; k <= n; k++) { const t = k / n; P.push(cyl(0.09, 0.11, 1.05, x0 + (x1 - x0) * t, y, z0 + (z1 - z0) * t, HOLZ, 6, { top: WEISS })); }
    for (const [h, c] of [[0.45, o.color ?? ROT], [0.85, o.color ?? ROT]]) {
      const g = blk(len, 0.12, 0.07, 0, 0, 0, c, { top: WEISS });
      g.rotateY(yaw); g.translate((x0 + x1) / 2, y + h, (z0 + z1) / 2); P.push(g);
    }
    if (o.solid !== false) {
      const xa = Math.min(x0, x1) - 0.08, xb = Math.max(x0, x1) + 0.08, za = Math.min(z0, z1) - 0.08, zb = Math.max(z0, z1) + 0.08;
      level.world.add({ type: 'box', min: [xa, y, za], max: [xb, y + 1.0, zb], camIgnore: true, tag: 'zaun' });
    }
  };
  // Start: Zaun links und vorn, rechts bis zur Rampe zur Stachelplattform
  zaun(-8.7, 7.6, 8.7, 7.6, Y0);
  zaun(-8.7, 7.6, -8.7, -13.4, Y0);
  zaun(8.7, 7.6, 8.7, 0.6, Y0);
  // Skihütte (Holz, rotes Dach mit Schnee, gelbe Fensterläden) links hinten am Start
  {
    const hx = -6.6, hz = -9.6;
    P.push(blk(3.6, 2.4, 3.0, hx, Y0, hz, HOLZ, { top: 0xb87a40 }));
    for (let k = 0; k < 5; k++) P.push(blk(3.66, 0.06, 3.06, hx, Y0 + 0.3 + k * 0.46, hz, 0x7a4220));
    for (const [r, h, y, c] of [[3.0, 1.7, Y0 + 2.4, ROT], [1.75, 1.0, Y0 + 3.1, WEISS]]) { const g = cone(r, h, 0, 0, 0, c, 4); g.rotateY(Math.PI / 4); g.translate(hx, y, hz); P.push(g); }
    P.push(blk(0.9, 1.5, 0.08, hx + 0.6, Y0, hz + 1.53, 0x5a3418, { top: GELB }));
    for (const sx of [-1, 1]) { P.push(blk(0.7, 0.6, 0.06, hx - 0.9 + sx * 0.05, Y0 + 1.1, hz + 1.53, EIS)); P.push(blk(0.18, 0.66, 0.08, hx - 0.9 + sx * 0.45, Y0 + 1.07, hz + 1.55, GELB)); }
    P.push(cyl(0.22, 0.22, 1.0, hx + 1.0, Y0 + 2.6, hz - 0.6, 0x8a8a96, 6));
    level.world.add({ type: 'box', min: [hx - 1.8, Y0, hz - 1.5], max: [hx + 1.8, Y0 + 2.6, hz + 1.5], tag: 'huette' });
  }
  // Slalomstangen rot/blau an beiden Rändern des Pustewolken-Hangs
  const hangY = (z) => (z > -55 ? Y0 : z > -66 ? Y0 - 4 * (-55 - z) / 11 : z > -70 ? -4 : z > -82 ? -4 - 4 * (-70 - z) / 12 : z > -86 ? -8 : z > -94 ? -8 - 2.5 * (-86 - z) / 8 : YH);
  let k = 0;
  for (let z = -57; z > -94; z -= 3.6, k++) {
    for (const sx of [-1, 1]) {
      const x = sx * 4.55, y = hangY(z), c = (k + (sx > 0 ? 1 : 0)) % 2 ? ROT : BLAU;
      P.push(cyl(0.05, 0.05, 1.7, x, y, z, c, 6, { top: WEISS }));
      const f = blk(0.62, 0.42, 0.03, x - sx * 0.33, y + 1.2, z, c, { top: c }); P.push(f);
    }
  }
  // Eiszapfen an den Kanten der Schollen und unter dem Start-Plateau (helles Eisblau)
  const zapfen = (x0, x1, z, y, step = 0.55) => { for (let x = x0 + 0.2; x < x1; x += step) { const h = 0.35 + ((Math.sin(x * 7.3 + z) + 1) / 2) * 0.55; P.push(cone(0.09 + h * 0.06, h, x, y - h, z, EIS, 5, { rx: Math.PI })); } };
  for (const [z0, z1] of SCHOLLEN) { zapfen(-2.6, 2.6, z0 + 0.02, YD - 0.3); zapfen(-2.6, 2.6, z1 - 0.02, YD - 0.3); }
  zapfen(-6, 6, -101.02, YH - 2.1, 0.7);
  zapfen(-8, 8, -272.02, YG - 2.1, 0.7);
  // … auch an den Längsseiten der Schollen
  const zapfenZ = (x, z0, z1, y, step = 0.6) => { for (let z = z1 + 0.2; z < z0; z += step) { const h = 0.3 + ((Math.sin(z * 5.1 + x) + 1) / 2) * 0.5; P.push(cone(0.08 + h * 0.06, h, x, y - h, z, EIS, 5, { rx: Math.PI })); } };
  for (const [z0, z1] of SCHOLLEN) for (const sx of [-1, 1]) zapfenZ(sx * 2.62, z0, z1, YD - 0.3);
  // Eisschollen der Bucht: blaue Eiskante oben, Eiszapfen vorn und hinten; Eislöcher der Glotzfische (Ring + dunkles Wasser)
  for (const [x0, x1, z0, z1] of FLOES) {
    const w = x1 - x0, d = z0 - z1, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    P.push(blk(w + 0.08, 0.14, 0.16, cx, YF - 0.1, z0, EIS, { top: 0xd8f4ff }), blk(w + 0.08, 0.14, 0.16, cx, YF - 0.1, z1, EIS, { top: 0xd8f4ff }));
    P.push(blk(0.16, 0.14, d, x0, YF - 0.1, cz, EIS, { top: 0xd8f4ff }), blk(0.16, 0.14, d, x1, YF - 0.1, cz, EIS, { top: 0xd8f4ff }));
    zapfen(x0, x1, z0 + 0.06, YF - 0.12, 0.7); zapfen(x0, x1, z1 - 0.06, YF - 0.12, 0.7);
  }
  for (const holes of FISH_HOLES) for (const [x, y, z] of holes) { P.push(cyl(1.0, 1.1, 0.12, x, y - 0.04, z, 0xeaf6ff, 14, { top: 0xffffff })); P.push(cyl(0.68, 0.68, 0.02, x, y + 0.07, z, 0x1a4a8a, 14, { top: 0x1a4a8a })); }
  // Stachelplattform des Stempels: rot-weißer Rand (vorn zur Rampe offen)
  for (const [x0, x1, z0, z1] of [[10, 22, 0.2, -0.2], [10, 22, -11.8, -12.2], [21.8, 22.2, 0, -12]]) {
    const alongX = x1 - x0 > z0 - z1, len = alongX ? x1 - x0 : z0 - z1, n = Math.round(len / 1);
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n, c = k % 2 ? WEISS : ROT;
      if (alongX) P.push(blk(len / n, 0.32, 0.4, x0 + (x1 - x0) * t, Y0 + 1, (z0 + z1) / 2, c));
      else P.push(blk(0.4, 0.32, len / n, (x0 + x1) / 2, Y0 + 1, z0 + (z1 - z0) * t, c));
    }
  }
  // Eiskristalle (bunte Eis-Spitzen) auf den Ufern und am Gipfel
  const kristall = (x, y, z, s, c) => { P.push(cone(0.22 * s, 1.1 * s, x, y, z, c, 5)); P.push(cone(0.16 * s, 0.8 * s, x + 0.25 * s, y, z + 0.15 * s, c, 5, { rz: -0.35 })); P.push(cone(0.14 * s, 0.7 * s, x - 0.22 * s, y, z - 0.1 * s, c, 5, { rx: 0.35 })); };
  for (const [x, y, z, s, c] of [[-8.6, Y0 + 0.5, -24, 1, 0x9ae6ff], [8.6, Y0 + 0.5, -33, 1.1, 0xc8a8ff], [-8.6, Y0 + 0.5, -46, 0.9, 0xffa8d8], [8.6, YD + 0.5, -146, 1, 0x9ae6ff],
    [-8.6, YD + 0.5, -136, 1.1, 0xc8a8ff], [-6.5, YG, -258, 1.3, 0x9ae6ff], [6.5, YG, -266, 1.2, 0xffa8d8], [RX + 16.8, YD + 0.5, -120, 1.2, 0xc8a8ff], [RX - 16.8, YD + 0.5, -140, 1.2, 0x9ae6ff]]) kristall(x, y, z, s, c);
  bakeParts(level, P);
  wimpel(level, [
    { x0: -8.6, x1: 8.6, y: Y0 + 4.2, z: 7.6, n: 16 },
    { x0: -8.6, x1: 8.6, y: Y0 + 4.0, z: -53.6, n: 16, colors: [0x4aa8ff, 0xffffff, 0xff5a5a] },
    { x0: -8, x1: 8, y: YD + 4.0, z: -118.4, n: 14 },
    { x0: RX - 17, x1: RX + 17, y: YD + 4.2, z: -113.2, n: 26, colors: [0xff5a5a, 0xffd23d, 0x4aa8ff] },
    { x0: -8, x1: 8, y: YG + 4.6, z: -258, n: 14 },
  ]);
}

function setup(level) {
  rampenKameraFrei(level);
  heroShadowDiet(level, 0.12);
  farHide(level, ['pustewolke', 'glotzfisch', 'pilzling_eis', 'star', 'schlittschuh'], 56);
}

export const LEVEL = {
  id: '6-5',
  build,
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
    { type: 'ramp', pos: [8.5, Y0, -6], size: [3, 1.25, 12], axis: 'x', dir: 1, low: 0 },
    { type: 'stachelboden', pos: [16, Y0 + 1, -6], size: [12, 0.25, 12] },
    sign(-6.5, Y0, 5.6, 'Eisgipfel'),
    sign(8, Y0, 2.2, 'Stacheln? Nur mit\nSchlittschuhen!', { size: [2.8, 1.0] }),
    { type: 'iglu', pos: [-6.8, Y0, 3.6], size: 3.4, yaw: 0.3 },
    { type: 'deco_w3', items: [{ kind: 'schneemann', pos: [6.5, Y0, 6.2], yaw: -0.6 }, { kind: 'tanne', pos: [-4.2, Y0, -12.6], size: 3.2 }] },
    { type: 'deco_w6', items: [{ kind: 'schneekiefer', pos: [7.5, Y0, -12], height: 4.5 }, { kind: 'schneehaufen', pos: [-4, Y0, 6.5] }, { kind: 'schneehaufen', pos: [3.5, Y0, -12.6], size: 1.1 }] },

    // ---------------- B Eissee
    { type: 'eisflaeche', pos: [0, Y0 - 1, -34], size: [16, 1, 40], edge: false },
    ...bank(-8, 8, -14, -54, Y0),
    { type: 'deco_w6', items: [
      { kind: 'schneekiefer', pos: [-8.6, Y0 + 0.5, -21], height: 4 }, { kind: 'schneekiefer', pos: [8.6, Y0 + 0.5, -41], height: 5 },
      { kind: 'wolke', pos: [-12, Y0 - 3, -30], size: 3 }, { kind: 'wolke', pos: [13, Y0 - 4, -46], size: 3.4 },
    ] },
    { type: 'deco_w3', items: [
      { kind: 'laternen', from: [-8.6, Y0 + 0.5, -16], to: [-8.6, Y0 + 0.5, -52], every: 9 }, { kind: 'laternen', from: [8.6, Y0 + 0.5, -20], to: [8.6, Y0 + 0.5, -52], every: 10 },
      { kind: 'laternen', from: [-8.6, YD + 0.5, -126], to: [-8.6, YD + 0.5, -158], every: 10 }, { kind: 'laternen', from: [8.6, YD + 0.5, -136], to: [8.6, YD + 0.5, -158], every: 11 },
      { kind: 'schneemann', pos: [-6.4, YD, -119.6], yaw: 0.5 }, { kind: 'schneemann', pos: [-5.6, YG, -255.5], yaw: 0.4 },
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
    ...bank(-8, 8, -118, -160, YD, [[1, -128.4, -131.8]]),
    snow(8, 18, -128.4, -131.8, YD, 3, { color: 0x8a98b4 }),
    { type: 'stachelboden', pos: [13, YD, -130.1], size: [10, 0.25, 3.4] },
    snow(18, 24.5, -125.5, -134.5, YD, 5),
    sign(6.4, YD, -127, 'Stachelbrücke'),

    // ---------------- Schlittschuh-Bahn (Rätselbox, x 90): Eis-Oval mit Schneeinsel in der Mitte
    { type: 'eisflaeche', pos: [RX, YD - 1, -130], size: [34, 1, 34], edge: false },
    ...bank(RX - 17, RX + 17, -113, -147, YD),
    isl(RX - 18.2, RX + 18.2, -111.8, -113, YD + 0.5, 2, { top: 'grass', under: 0 }), isl(RX - 18.2, RX + 18.2, -147, -148.2, YD + 0.5, 2, { top: 'grass', under: 0 }),
    snow(RX - 3.5, RX + 3.5, -126.5, -133.5, YD + 1.2, 2.2, { color: 0xeaf2fb }),
    // Stachelrahmen (nur mit Schlittschuh befahrbar)
    { type: 'stachelboden', pos: [RX, YD, -130 + 6.5], size: [19, 0.25, 6] },
    { type: 'stachelboden', pos: [RX, YD, -130 - 6.5], size: [19, 0.25, 6] },
    { type: 'stachelboden', pos: [RX - 6.5, YD, -130], size: [6, 0.25, 7] },
    { type: 'stachelboden', pos: [RX + 6.5, YD, -130], size: [6, 0.25, 7] },
    sign(RX - 14.5, YD, -118, 'Stachelbahn:\nnur mit Schlittschuh!', { size: [2.8, 1.0] }),

    // ---------------- E Windiger Abgrund: Schollen, quer blasende Böen, Aufwind mit Stern
    snow(-9.2, 9.2, -159.4, -163, YD, 5),
    ...SCHOLLEN.map(([z0, z1]) => snow(-2.6, 2.6, z0, z1, YD, 5)),
    { type: 'windfeld', id: 'boe1', pos: [0, YD - 4, -171.8], size: [16, 9, 5.4], dir: [1, 0], strength: 9, period: 4.2, on: 1.6, warn: 1.0, source: 'wolke', fahne: [-1.9, YD, -168.2] },
    { type: 'windfeld', id: 'boe2', pos: [0, YD - 4, -182.2], size: [16, 9, 5.4], dir: [-1, 0], strength: 9, period: 4.2, on: 1.6, warn: 1.0, phase: 2.1, source: 'wolke', fahne: [1.9, YD, -179.2] },
    { type: 'windfeld', id: 'aufwind', pos: [0, YD - 6, -193], size: [6, 16, 5.8], dir: [0, 1, 0], strength: 10, period: 3.6, on: 1.8, warn: 0.8, source: 'ventil' },
    { type: 'deco_w6', items: [
      { kind: 'wolke', pos: [-9, YD - 2, -176], size: 3.2 }, { kind: 'wolke', pos: [10, YD - 3, -188], size: 3.6 },
      { kind: 'schneekiefer', pos: [5.5, YD, -161.2], height: 3.2 }, { kind: 'schneehaufen', pos: [-1.9, YD, -186.4], size: 0.8 },
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
    { kind: 'hidden', id: 'versteckt', pos: [-1.9, Y0 + 4.0, -3], content: 'oneup' },
    { kind: 'question', pos: [0.6, Y0 + 7.2, -3], content: 'coins:3' },
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
    { kind: 'timering', id: 'bahnring', pos: [RX - BAHN_R, YD + 0.25, -130], yaw: Math.PI / 2, time: 10, star: 1,
      coins: Array.from({ length: 8 }, (_, k) => { const a = Math.PI - 0.39 - k * Math.PI / 4; return [RX + Math.cos(a) * BAHN_R, YD + 0.85, -130 - Math.sin(a) * BAHN_R]; }) },
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
    [0.6, Y0 + 11.4, -3],
    { pos: [RX, YD + 1.7, -130], hidden: true, id: 'stern_bahn' },
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
