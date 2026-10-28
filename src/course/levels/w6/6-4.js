// 6-4 „Floßfahrt durch den Giftsee-Dschungel“ – Parcours der Wolkeninseln (Bauplan Welt 6, Detail 6-4: „Floßstart im
// Giftsee → erste Floßstrecke (90 m) mit Brummern, Checkpoint → zweite Floßstrecke (90 m) mit Rankenschnappern →
// Abwärtsströmung (40 m) zur Warp-Box → Ziel“, viele Klettergitter). Thema jungle, Musik course_jungle, 400 s.
//
// Ein lila Giftsee mitten im Dschungel: Riesenbäume auf Wurzelinseln, Lianen, Seerosen, Giftblüten, Glühwürmchen. Die
// Heldin fährt auf Holzflößen (legen ab, sobald man draufsteht) über den See. Parcours nach −Z, ≈ 300 m:
//   1  Startufer           z  12 …   −8   Kletterwand (Lianengitter) zum Aussichtsfelsen (?-Block mit Extraleben), Steg
//   2  Floßstrecke I       z  −8 …  −96   Floß 1 (≈ 92 m) zwischen Wurzelinseln, vier Brummer kreisen über dem Weg;
//                                         Abzweig: unter dem Lianen-Deckengitter vom Floß hochspringen und hinüberhangeln
//                                         zur **Tor-Insel** mit dem blauen Tor (Kletterranke am Pfeiler → Stempel oben)
//                                         und der **Glasröhre** hinauf zum Baumhaus (Stern 0); vom Baumhaus führt eine
//                                         zweite Röhre hinab zur Checkpoint-Insel
//   3  Checkpoint-Insel    z −97 … −114   Checkpoint, Sternenring (acht Sternmünzen, Baumstümpfe im Gift → Stern 1)
//   4  Floßstrecke II      z −114 … −204  Floß 2 (≈ 92 m), sechs Rankenschnapper wachsen aus dem Gift über den Weg
//   5  Abwärtsströmung     z −204 … −244  dasselbe Floß saust 40 m die Giftschlucht hinab (4 m Gefälle)
//   6  Landeinsel          z −248 … −266  End-Warp-Box; daneben die kletterbare Felswand → Sims mit Stern 2
//   7  Ruinenplateau       z −278 … −304  (per Warp-Box) Ruinen, Steinfrösche, Zielmast
// Gegner: Brummer 4, Rankenschnapper 6. Extraleben: ?-Block auf dem Aussichtsfelsen, unsichtbarer Block auf der Tor-Insel.

import * as THREE from 'three';
import { isl, line, ring, arc, sign, seerosen, schilf, moospolster, blauesTor, baumhaus, felsen, ruinen, glimmer, zier } from './_helpers_b.js';

const PI = Math.PI;
const WS = 0.4;          // Giftsee (oben)
const Y1 = 1.0;          // Ufer und Inseln
const WL = -3.6;         // Giftsee unten (nach der Abwärtsströmung)
const YL = -3.0;         // Landeinsel
const YG = 9;            // Ruinenplateau (Ziel)

const PATH1 = [[0, WS, -9.5], [0, WS, -22], [-5, WS, -30], [-5, WS, -44], [3, WS, -54], [5, WS, -62], [5, WS, -72], [-1, WS, -82], [-1, WS, -95]];
const PATH2 = [[0, WS, -116.3], [0, WS, -130], [6, WS, -140], [6, WS, -156], [-4, WS, -168], [-4, WS, -182], [0, WS, -192], [0, WS, -204], [0, WL, -244], [0, WL, -246.6]];

// ---------------------------------------------------------------- Maße (auch für den Test)
export const M64 = {
  WS, Y1, WL, YL, YG, PATH1, PATH2,
  DECKE: { pos: [7.8, 4.4, -63], size: [11.6, 4] },            // Lianen-Deckengitter über Floß 1 zur Tor-Insel (x 2 … 13,6)
  TOR: { x: 17, y: Y1, z: -66, span: 5, h: 5.2 },              // blaues Tor (Stempel oben)
  TORGITTER: [14.5, Y1, -65.25],                               // Kletterranke am linken Pfeiler
  STAMP: [17, Y1 + 6.4, -66],
  BAUM: { x: 21, z: -77.5, top: 10, tx: 21.4, tz: -78.6 },     // Baumhaus (Stern 0)
  ROEHRE: { A: [20.5, Y1 + 1.05, -59], P: [21, 11.05, -74.3], Q: [23.6, 11.05, -79.8], C: [11.2, Y1 + 1.05, -104] },
  RING: [-4, Y1, -104],
  STUMPS: [[-12.6, -111.2], [-14.6, -107.6], [-14.6, -103.6], [-12.6, -100]],
  KLIPPE: { gitter: [-5, YL, -265.97], top: 4 },               // kletterbare Felswand neben der End-Warp-Box (Stern 2)
  WARP: [5, YL, -256],
};
const { DECKE, TOR, TORGITTER, BAUM, ROEHRE } = M64;

/** Rankenschnapper aus dem Gift quer über den Floßweg. */
const ranke = (id, x, z, dx, o = {}) => ({ kind: 'rankenschnapper', id, pos: [x, WS, z], dir: [dx, 0], length: 5, height: 1.5, grow: { out: 1.2, hold: 2.2, back: 1.1, wait: 1.8 }, ...o });
const RANKEN = [['r1', -3.2, -124, 1], ['r2', 9.6, -146, -1, { phase: 0.3 }], ['r3', 2.4, -152, 1, { phase: 0.65 }],
  ['r4', -7.6, -172, 1, { phase: 0.1 }], ['r5', -0.4, -179, -1, { phase: 0.55 }], ['r6', 3.6, -197, -1, { phase: 0.25 }]];
/** Brummer kreist über dem Floßweg. */
const brummer = (id, x, y, z, r, o = {}) => ({ kind: 'brummer', id, center: [x, y, z], radius: r, speed: 2.2, sight: 5.5, ...o });

/** Aufbau-Haken (vor dem Verschmelzen): Kulisse, Felsen, Seerosen, Ruinen, Baumhaus, blaues Tor. */
function build(level) {
  blauesTor(level, TOR);
  baumhaus(level, { ...BAUM, r: 3.6, trunk: 1.2, gaps: [[-PI / 2, 0.55], [0.72, 0.5]] });
  // Seerosen am Rand der Floßwege
  const pads = [];
  const padLine = (pts, side, seed) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, , az] = pts[i], [bx, , bz] = pts[i + 1];
      const L = Math.hypot(bx - ax, bz - az), n = Math.floor(L / 3.2);
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
        const nx = -(bz - az) / L, nz = (bx - ax) / L;
        const off = (2.8 + ((k * 7 + i * 3 + seed) % 5) * 0.55) * side;
        pads.push([x + nx * off, WS, z + nz * off, 0.6 + ((k + i + seed) % 4) * 0.18]);
      }
    }
  };
  padLine(PATH1, 1, 0); padLine(PATH1, -1, 2); padLine(PATH2.slice(0, 8), 1, 1); padLine(PATH2.slice(0, 8), -1, 3);
  seerosen(level, pads, { flowers: 0.4 });
  // Schilfbüschel am Floßweg – nicht in Inseln, nicht auf den Linien der Rankenschnapper
  const rects = LEVEL.segments.filter((g) => g.type === 'island').map((g) => [g.pos[0] - g.size[0] / 2 - 0.7, g.pos[0] + g.size[0] / 2 + 0.7, g.pos[2] - g.size[2] / 2 - 0.7, g.pos[2] + g.size[2] / 2 + 0.7]);
  const free = (x, z) => !rects.some(([a, b, c, d]) => x > a && x < b && z > c && z < d)
    && !RANKEN.some(([, rx, rz, dx]) => Math.abs(z - rz) < 2.2 && (x - rx) * dx > -2 && (x - rx) * dx < 7);
  const reeds = [];
  const reedLine = (pts, seed) => {
    let k = seed;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, , az] = pts[i], [bx, , bz] = pts[i + 1];
      const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.floor(L / 3.8));
      for (let j = 0; j < n; j++, k++) {
        const t = (j + 0.4) / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
        const side = k % 2 ? 1 : -1, off = (3.9 + (k * 5 % 7) * 0.22) * side;
        const px = x - ((bz - az) / L) * off, pz = z + ((bx - ax) / L) * off;
        if (free(px, pz)) reeds.push([px, WS, pz, 5 + (k % 4)]);
      }
    }
  };
  reedLine(PATH1, 0); reedLine(PATH2.slice(0, 8), 1);
  schilf(level, reeds);
  // Moospolster an den Schluchtkanten
  moospolster(level, { x: -3.6, face: 1, z0: -200, z1: -248.4, top: 3, seed: 3 });
  moospolster(level, { x: 3.6, face: -1, z0: -200, z1: -248.4, top: 3, seed: 9 });
  // Ruinenmauer des Zielplateaus und Felssims: Moos an den Oberkanten
  moospolster(level, { axis: 'z', z: -278, face: 1, x0: -12, x1: 12, top: YG, seed: 13 });
  moospolster(level, { axis: 'z', z: -266, face: 1, x0: -12, x1: -6.8, top: M64.KLIPPE.top, seed: 17 });
  moospolster(level, { axis: 'z', z: -266, face: 1, x0: -3.2, x1: 12, top: M64.KLIPPE.top, seed: 19 });
  // Schluchtwände der Abwärtsströmung (gestuft, rein optisch – die Kollision liefern die Inseln)
  // Felsbrocken an den Schluchtkanten (oben auf den Wänden)
  felsen(level, [[-5.2, 3, -208, 1.6, 1.1, 1.8, 0.4], [5.4, 3, -217, 1.4, 0.9, 1.6, -0.3], [-5.0, 3, -229, 1.2, 0.8, 1.4, 0.2], [5.2, 3, -242, 1.8, 1.2, 2, -0.5]], { color: 0x7a8a6a });
  felsen(level, [[-9, YL, -248.5, 2.4, 1.6, 2, 0.4], [9.5, YL, -250, 2.6, 2.2, 2.4, -0.3], [-10.5, YL, -262, 2, 3, 2.4, 0.2], [10.8, YL, -263, 2.6, 3.6, 2.6, -0.5],
    [-15, Y1, 8, 2.6, 2, 2.4, 0.3], [14.6, Y1, 9, 2.2, 1.4, 2, -0.4]], { color: 0x7a8a6a });
  ruinen(level, [
    { kind: 'saeule', pos: [-7, YG, -283], h: 4.2 }, { kind: 'saeule', pos: [7, YG, -283], h: 3.6 },
    { kind: 'saeule', pos: [-8, YG, -293], h: 5 }, { kind: 'saeule', pos: [8.2, YG, -294], h: 2.6 },
    { kind: 'liegend', pos: [5.5, YG, -288.5], h: 3.6, yaw: 0.4 }, { kind: 'block', pos: [-4.8, YG, -289], w: 1.4, h: 0.9 },
    { kind: 'frosch', pos: [-3.6, YG, -300.5], size: 1.1 }, { kind: 'frosch', pos: [3.6, YG, -300.5], size: 1.1 },
    { kind: 'frosch', pos: [-10, YL, -252], size: 0.8 }, { kind: 'block', pos: [8.5, Y1, -110], w: 1.2, h: 0.7 },
  ]);  zier(level, [
    // Startufer: Hütte, Stamm, Blumen, Moos, Trittsteine zum Steg
    { kind: 'huette', pos: [8.5, Y1, 5.5], size: 1.1 }, { kind: 'stamm', pos: [-5.5, Y1, -2.5], length: 4.2, yaw: 0.4 },
    { kind: 'blumen', pos: [-3.6, Y1, 9.5], size: [3, 1.2], colors: [0xff5a3a, 0xffb02a, 0xc04aff, 0xff7ac0] },
    { kind: 'moos', pos: [0, Y1, 3], size: [14, 9], n: 12, flower: 0xffd84a }, { kind: 'steine', pos: [0, Y1, 1], to: [0, Y1, -5.4], n: 5 },
    // Inseln am Floßweg
    { kind: 'moos', pos: [-12.5, Y1, -17], size: [5, 8], n: 6, flower: 0xff7ac0 }, { kind: 'moos', pos: [12, Y1, -20], size: [4, 9], n: 6 },
    { kind: 'moos', pos: [-14, Y1, -43], size: [5, 10], n: 7, flower: 0xffb02a }, { kind: 'stamm', pos: [13, Y1, -45.5], length: 3.4, yaw: -0.3 },
    { kind: 'moos', pos: [-12.5, Y1, -67], size: [6, 10], n: 7 }, { kind: 'blumen', pos: [-12.5, Y1, -72.5], size: [3, 1], colors: [0xff5a3a, 0xc04aff] },
    // Tor-Insel
    { kind: 'moos', pos: [17, Y1, -63], size: [8, 14], n: 10, flower: 0x5ac8ff }, { kind: 'blumen', pos: [20.6, Y1, -66], size: [1.4, 5], colors: [0xff7ac0, 0xffd84a, 0xffffff] },
    // Checkpoint-Insel
    { kind: 'moos', pos: [2, Y1, -105], size: [18, 14], n: 14, flower: 0xffd84a }, { kind: 'stamm', pos: [6, Y1, -112.6], length: 3.6, yaw: 0.1 },
    { kind: 'blumen', pos: [9.6, Y1, -101], size: [1.2, 4], colors: [0xff5a3a, 0xffb02a] },
    // Floßweg II
    { kind: 'moos', pos: [-10, Y1, -127], size: [6, 12], n: 7 }, { kind: 'moos', pos: [14, Y1, -168], size: [5, 14], n: 7, flower: 0xc04aff },
    { kind: 'stamm', pos: [-12.5, Y1, -194], length: 3.2, yaw: 1.2 },
    // Landeinsel, Ruinenplateau
    { kind: 'moos', pos: [0, YL, -257], size: [20, 14], n: 14, flower: 0xffb02a }, { kind: 'stamm', pos: [7.5, YL, -261], length: 3.4, yaw: -0.2 },
    { kind: 'moos', pos: [0, YG, -291], size: [20, 22], n: 14, flower: 0xffffff },
    // Felssims (Stern 2): Moos und Blumen neben dem Kletterausstieg
    { kind: 'moos', pos: [5, M64.KLIPPE.top, -269], size: [12, 4.5], n: 6, flower: 0xff7ac0 },
    { kind: 'blumen', pos: [9.5, M64.KLIPPE.top, -270.5], size: [3, 1], colors: [0xff5a3a, 0xffd84a, 0xc04aff] },
    { kind: 'blumen', pos: [-9.5, YG, -284], size: [1.4, 4], colors: [0xff5a3a, 0xffd84a] }, { kind: 'blumen', pos: [9.5, YG, -284], size: [1.4, 4], colors: [0xc04aff, 0xff7ac0] },
  ]);
}

/** Belebtes (nach dem Verschmelzen): Glühwürmchen und Pollen über dem See und in der Schlucht. */
function setup(level) {
  glimmer(level, [[-14, 14, 1.4, 5, 10, -96], [-14, 14, 1.4, 5, -114, -204], [-8, 8, -2, 3, -204, -250], [-10, 10, 9.5, 13, -280, -304]], { n: 90, color: 0xd8ff6a, size: 0.2, drift: 0.8 });
  glimmer(level, [[10, 24, 1.5, 12, -55, -82]], { n: 26, color: 0xfff0a0, size: 0.24, seed: 7 });
  // Wand-Klettergitter werfen keinen Sonnenschatten (Dreiecke im Schattenpass); das Deckengitter über dem Gift behält ihn
  const wp = new THREE.Vector3();
  for (const o of level.view?.three.children ?? []) {
    if (o.name !== 'modell:klettergitter') continue;
    o.updateMatrixWorld(); wp.setFromMatrixPosition(o.matrixWorld);
    if (wp.y < 3.5) o.traverse((m) => { if (m.isMesh) m.castShadow = false; });
  }
}

export const LEVEL = {
  id: '6-4',
  world: 6,
  title: 'Floßfahrt durch den Giftsee-Dschungel',
  archetype: 'parcours',
  theme: 'jungle',
  music: 'course_jungle',
  timeLimit: 400,
  killY: -14,
  // tiefer liegender Giftsee am Horizont (die Abwärtsströmung führt 4 m unter den oberen See)
  prebuild(level) { if (level.view?.sky) level.view.sky.theme = { ...level.view.sky.theme, seaLevel: -7 }; },
  build,
  setup,
  start: { pos: [0, Y1, 6], yaw: PI / 2 },
  camera: [
    { from: 16, to: -8, pitch: 44, dist: 13 },
    { from: -8, to: -96, pitch: 44, dist: 14, ahead: 2.6 },
    { from: -96, to: -114, pitch: 46, dist: 13 },
    { from: -114, to: -204, pitch: 44, dist: 14, ahead: 2.6 },
    { from: -204, to: -246, pitch: 36, dist: 14, ahead: 3 },
    { from: -246, to: -272, pitch: 44, dist: 13 },
    { from: -276, to: -310, pitch: 42, dist: 12.5 },
  ],
  segments: [
    { type: 'killplane', y: -14 },
    // ---------------- Giftsee (oben), Strömung, unteres Becken
    { type: 'giftwasser', id: 'giftsee', pos: [0, WS - 9, -95], size: [70, 9, 218], bubbles: true },
    { type: 'stroemung', id: 'strom', from: [0, WS, -204], to: [0, WL, -244], width: 7, speed: 6, fluid: 'gift' },
    { type: 'giftwasser', id: 'becken', pos: [0, WL - 3, -246.3], size: [16, 3, 4.6], bubbles: true },

    // ---------------- 1 Startufer
    isl(-16, 16, 12, -7, Y1, 5),
    isl(-16, -9, 4, -4, 6, 5, { top: 'rock' }),                                       // Aussichtsfelsen
    { type: 'klettergitter', id: 'startgitter', mode: 'wand', pos: [-12.5, Y1, 4.03], size: [3, 5], yaw: -PI / 2, style: 'liane' },
    { type: 'bridge', from: [0, Y1, -6.6], to: [0, Y1, -8], width: 3 },
    sign(5.5, Y1, 2, 'Giftsee-Floßfahrt'),
    // ---------------- 2 Floßstrecke I
    { type: 'floss', id: 'floss1', pos: PATH1[0], path: PATH1, speed: 3, style: 'bambus', size: [3, 3] },
    isl(-16, -9, -12, -22, Y1, 4), isl(9, 15, -14, -26, Y1, 4),
    isl(-18, -10.5, -36, -50, Y1, 4), isl(10, 16, -38, -48, Y1, 4),
    isl(-17, -8.5, -60, -74, Y1, 4), isl(9, 14, -82, -92, Y1, 4), isl(-13, -6, -84, -92, Y1, 4),
    // Tor-Insel mit Lianen-Deckengitter, blauem Tor, Kletterranke, Glasröhren zum Baumhaus und zur Checkpoint-Insel
    { type: 'klettergitter', id: 'decke', mode: 'decke', pos: DECKE.pos, size: DECKE.size, style: 'liane', ceiling: false },
    isl(12, 22, -55, -72, Y1, 4),
    { type: 'klettergitter', id: 'torgitter', mode: 'wand', pos: TORGITTER, size: [1.2, 5.8], yaw: -PI / 2, style: 'liane' },
    { type: 'glasnetz', id: 'roehre', radius: 1, speed: 11,
      nodes: { A: ROEHRE.A, P: ROEHRE.P, Q: ROEHRE.Q, C: ROEHRE.C },
      pipes: [
        { from: 'A', to: 'P', via: [[23.5, Y1 + 1.05, -59], [25.2, 5, -63.5], [25, 9.2, -68.5], [23, 11.05, -71.6]], coins: 4 },
        { from: 'Q', to: 'C', via: [[26.2, 11.05, -81.6], [27.6, 8, -88], [24, 4, -97.5], [17.5, Y1 + 1.05, -103.6]], coins: 4 },
      ],
      ends: { A: { enter: true }, P: { enter: true, exitSpeed: 3 }, Q: { enter: true }, C: { enter: true, exitSpeed: 5 } } },
    sign(13.4, Y1, -57, 'Blaues Tor', { size: [2, 0.8] }),
    // ---------------- 3 Checkpoint-Insel und Sternenring
    isl(-10, 12, -96.8, -114, Y1, 5),
    ...M64.STUMPS.map(([x, z]) => isl(x - 1, x + 1, z + 1, z - 1, Y1 + 0.2, 4, { top: 'rock' })),
    // ---------------- 4 Floßstrecke II
    { type: 'floss', id: 'floss2', pos: PATH2[0], path: PATH2, speed: 3, style: 'bambus', size: [3, 3] },
    isl(-14, -6.5, -120, -134, Y1, 4), isl(11, 18, -118, -132, Y1, 4),
    isl(-16, -9, -146, -160, Y1, 4), isl(11.5, 17, -160, -176, Y1, 4),
    isl(-16, -10, -186, -198, Y1, 4), isl(6.5, 14, -188, -200, Y1, 4),
    // ---------------- 5 Schlucht der Abwärtsströmung (Wände)
    isl(-12, -3.6, -200, -248.4, 3, 18), isl(3.6, 12, -200, -248.4, 3, 18),
    // ---------------- 6 Landeinsel, Felswand mit Kletterranke
    isl(-12, 12, -248.4, -266, YL, 5),
    isl(-12, 12, -266, -272, M64.KLIPPE.top, 9, { top: 'rock' }),
    { type: 'klettergitter', id: 'klippe', mode: 'wand', pos: M64.KLIPPE.gitter, size: [3.2, 7], yaw: -PI / 2, style: 'liane' },
    sign(-8.5, YL, -251, 'Warp-Box zum Ziel', { size: [2.6, 0.9] }),
    // ---------------- 7 Ruinenplateau
    isl(-12, 12, -278, -304, YG, 18, { top: 'stone', color: 0x9a9480 }),
    // ---------------- Kulisse
    { type: 'deco_w6', items: [
      { kind: 'dschungelbaum', pos: [-12, Y1, 9], height: 10 }, { kind: 'dschungelbaum', pos: [12, Y1, -2], height: 9 },
      { kind: 'farne', pos: [8, Y1, 6], size: [6, 6], n: 6 }, { kind: 'pilze', pos: [-6, Y1, -3], n: 6 }, { kind: 'giftbluete', pos: [10, Y1, 9] },
      { kind: 'riesenblatt', pos: [-4.5, Y1, 9.5], size: 2.2, yaw: 0.6 }, { kind: 'riesenblatt', pos: [4, Y1, -5], size: 1.8, yaw: -0.8 },
      { kind: 'dschungelbaum', pos: [-12.5, Y1, -17], height: 11 }, { kind: 'dschungelbaum', pos: [12, Y1, -20], height: 9 },
      { kind: 'farne', pos: [-12.5, Y1, -17], size: [5, 8], n: 5 }, { kind: 'giftpilz', pos: [11.5, Y1, -15.5], height: 1.8 },
      { kind: 'dschungelbaum', pos: [-14.5, Y1, -43], height: 12 }, { kind: 'dschungelbaum', pos: [13, Y1, -43], height: 10 },
      { kind: 'pilze', pos: [-13, Y1, -47], n: 5 }, { kind: 'giftbluete', pos: [12, Y1, -40] }, { kind: 'riesenblatt', pos: [-12, Y1, -38], size: 2.4, yaw: 1.2 },
      { kind: 'dschungelbaum', pos: [-13, Y1, -67], height: 11 }, { kind: 'farne', pos: [-12.5, Y1, -66], size: [6, 10], n: 6 },
      { kind: 'farne', pos: [17, Y1, -60], size: [6, 4], n: 4 }, { kind: 'pilze', pos: [20, Y1, -69], n: 4 }, { kind: 'giftbluete', pos: [13.2, Y1, -70.5] },
      { kind: 'dschungelbaum', pos: [11.5, Y1, -87], height: 10 }, { kind: 'dschungelbaum', pos: [-9.5, Y1, -88], height: 9 },
      { kind: 'dschungelbaum', pos: [-8, Y1, -113], height: 10 }, { kind: 'farne', pos: [6, Y1, -112], size: [6, 3], n: 4 },
      { kind: 'riesenblatt', pos: [10, Y1, -98.5], size: 2, yaw: -0.4 }, { kind: 'pilze', pos: [-8.5, Y1, -98], n: 5 },
      { kind: 'dschungelbaum', pos: [-10, Y1, -127], height: 11 }, { kind: 'dschungelbaum', pos: [14.5, Y1, -125], height: 10 },
      { kind: 'giftbluete', pos: [-12.5, Y1, -122] }, { kind: 'farne', pos: [14, Y1, -129], size: [5, 5], n: 4 },
      { kind: 'dschungelbaum', pos: [-12.5, Y1, -153], height: 12 }, { kind: 'dschungelbaum', pos: [14, Y1, -168], height: 10 },
      { kind: 'pilze', pos: [-12, Y1, -150], n: 5 }, { kind: 'giftpilz', pos: [13, Y1, -163], height: 2 },
      { kind: 'dschungelbaum', pos: [-13, Y1, -192], height: 11 }, { kind: 'dschungelbaum', pos: [10, Y1, -194], height: 10 },
      { kind: 'riesenblatt', pos: [-12, Y1, -188], size: 2.2, yaw: 0.3 }, { kind: 'giftbluete', pos: [9, Y1, -190] },
      { kind: 'farne', pos: [0, YL, -258], size: [18, 10], n: 7, avoid: [[5, -256, 2], [-5, -264, 2.5]] }, { kind: 'pilze', pos: [-8, YL, -258], n: 5 },
      { kind: 'dschungelbaum', pos: [10, YL, -262], height: 9 }, { kind: 'giftbluete', pos: [-10.5, YL, -256] },
      { kind: 'farne', pos: [6, M64.KLIPPE.top, -269.5], size: [10, 4], n: 4 }, { kind: 'pilze', pos: [-10, M64.KLIPPE.top, -270], n: 4 },
      { kind: 'riesenblatt', pos: [1.5, M64.KLIPPE.top, -271], size: 1.8, yaw: 0.5 },
      ...[-10, -6, -1.5, 3, 7.5, 11].map((x, i) => ({ kind: 'liane', pos: [x, YG + 0.2, -277.8], length: 3 + (i % 3) * 1.1 })),
      { kind: 'dschungelbaum', pos: [-10, YG, -300], height: 10 }, { kind: 'dschungelbaum', pos: [10.5, YG, -300], height: 11 },
      { kind: 'farne', pos: [0, YG, -290], size: [20, 14], n: 8, avoid: [[0, -297, 2.5], [0, -282, 2.5]] },
      { kind: 'liane', pos: [-6, 9.5, -27], length: 4 }, { kind: 'liane', pos: [3, 9.5, -51], length: 3.6 }, { kind: 'liane', pos: [-2, 9.5, -79], length: 4 },
      { kind: 'liane', pos: [3, 9.5, -136], length: 3.6 }, { kind: 'liane', pos: [-5, 9.5, -176], length: 4 },
      // Schlucht: Farne und Pilze auf den Wänden, Lianen über der Strömung
      { kind: 'farne', pos: [-7.5, 3, -215], size: [6, 20], n: 7 }, { kind: 'farne', pos: [7.5, 3, -232], size: [6, 20], n: 7 },
      { kind: 'pilze', pos: [-7.5, 3, -236], n: 6 }, { kind: 'pilze', pos: [7.5, 3, -212], n: 6 },
      { kind: 'dschungelbaum', pos: [-8.5, 3, -224], height: 10 }, { kind: 'dschungelbaum', pos: [9, 3, -240], height: 9 },
      { kind: 'liane', pos: [-2, 8, -214], length: 3.4 }, { kind: 'liane', pos: [2.4, 8, -228], length: 3 },
      // Lianen an den Schluchtwänden (hängen von der Kante herab)
      ...[-206, -213, -221, -229, -238, -245].map((z, i) => ({ kind: 'liane', pos: [i % 2 ? 3.8 : -3.8, 3.2, z], length: 2.6 + (i % 3) * 0.7 })),
      ...[-209, -217, -225, -234, -242].map((z, i) => ({ kind: 'liane', pos: [i % 2 ? -3.8 : 3.8, 3.2, z], length: 2.2 + (i % 2) * 1.2 })),
    ] },
    { type: 'deco_w4', items: [{ kind: 'giftwasserfall', pos: [-3.7, -1.6, -219], width: 2.2, height: 4.6, yaw: PI / 2 }, { kind: 'giftwasserfall', pos: [3.7, -2.6, -236], width: 2.2, height: 5.6, yaw: -PI / 2 }] },
  ],
  blocks: [
    { kind: 'question', pos: [-12.5, 6 + 2.3, 0], content: 'oneup' },
    { kind: 'question', pos: [-14.5, 6 + 2.3, 0], content: 'coins:5' },
    { kind: 'hidden', pos: [19.5, Y1 + 3.2, -61], content: 'oneup' },
    { kind: 'question', pos: [3, Y1 + 2.4, -100.5], content: 'coins:5' },
    { kind: 'coinblock', pos: [-2, YG + 2.4, -290], count: 8 },
  ],
  enemies: [
    brummer('b1', -3, 3.4, -30, 2.2),
    brummer('b2', 1.5, 3.6, -50, 2.4, { phase: 0.4 }),
    brummer('b3', 3, 3.4, -77, 2.4, { phase: 0.2 }),
    brummer('b4', -1, 3.6, -89, 2.0, { phase: 0.7 }),
    ...RANKEN.map(([id, x, z, dx, o]) => ranke(id, x, z, dx, o)),
  ],
  items: [
    line([-1.5, Y1 + 0.5, 3], [1.5, Y1 + 0.5, 3], 3),
    ring([-12.5, 6 + 0.5, -1], 1.2, 6),
    // Floßstrecke I: Münzen über dem Weg (man fährt hindurch) und um die Brummer
    line([0, 1.5, -14], [0, 1.5, -20], 4), line([-5, 1.5, -33], [-5, 1.5, -41], 5), line([4, 1.5, -64], [4.6, 1.5, -70], 4),
    ring([-3, 3.4, -30], 1.2, 5), ring([1.5, 3.6, -50], 1.2, 5),
    // unter dem Deckengitter (Hangelweg zur Tor-Insel)
    line([6.5, 3.6, -62], [12.5, 3.6, -62], 5),
    ring([17, Y1 + 0.5, -61], 1.4, 6), line([21, Y1 + 0.5, -70], [21, Y1 + 0.5, -66], 3),
    { kind: 'starring', id: 'ring', pos: M64.RING, star: 1, time: 15, coins: [
      [-1, Y1 + 0.6, -101], [1, Y1 + 0.6, -105], [-1, Y1 + 0.6, -109.5], [-5.5, Y1 + 0.6, -111.6],
      ...M64.STUMPS.map(([x, z]) => [x, Y1 + 0.8, z]),
    ] },
    // Floßstrecke II
    line([0, 1.5, -120], [0, 1.5, -127], 4), line([6, 1.5, -144], [6, 1.5, -152], 5), line([-4, 1.5, -172], [-4, 1.5, -179], 4),
    arc([0, 1.4, -206], [0, -2.6, -240], 8, 1.2),
    line([-3, YL + 0.5, -252], [3, YL + 0.5, -252], 4),
    line([-3, YG + 0.5, -285], [3, YG + 0.5, -285], 4),
  ],
  checkpoint: { pos: [-2, Y1, -100], yaw: PI / 2 },
  stars: [
    [21.8, 10.6, -78.6],
    { pos: [-4, Y1 + 1.2, -107.5], hidden: true, id: 'stern1' },
    [-5, M64.KLIPPE.top + 0.6, -268.6],
  ],
  stamp: M64.STAMP,
  goal: [0, YG, -297],
  marks: {
    start: [0, Y1, 6], steg: [0, Y1, -7.4], floss1: PATH1[0], cp: [-2, Y1, -100], floss2: PATH2[0], landung: [0, YL, -250],
    warp: M64.WARP, ziel: [0, YG, -284], tor: [17, Y1, -63], baumhaus: [21, 10, -77.5], ring: M64.RING,
  },
};

// End-Warp-Box (nach den Inseln, damit sie über der Landeinsel steht) – zum Ruinenplateau
LEVEL.items.push({ kind: 'warpbox', id: 'warp', pos: M64.WARP, target: [0, YG + 0.3, -282] });
