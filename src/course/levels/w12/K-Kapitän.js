// K-Kapitän „Krümels Glutturm-Finale“ – Welt Krone „Kronen-Gipfel“, Rätsel-Diorama (Archetyp diorama, Thema volcano,
// Musik course_diorama, 400 s, 5 Sterne + Stempel; Bauplan K-Kapitän: Lavaturm-Diorama ca. 30 × 30 m, 25 m hoch:
// steigende/sinkende Lava, rote Plattform, Nische, Propellerplattformen, Donut-Brücke, Wolke mit Loch).
//
// Krümel (Kapitänsmütze, Rucksack) springt nicht. Sein letztes und schwerstes Abenteuer: ein schwebender Glutkessel
// (32 × 31 m) voller Lava, die alle 26 s steigt und wieder sinkt (13 s unten – die letzten 2,5 s brodelt sie zur Warnung –,
// 4,5 s Steigen, 4 s oben, 4,5 s Sinken; Spiegel y 0 … 7,6). Darin der Glutturm (16 m) mit der Lochwolke darüber (20 m)
// und der goldenen Gipfelkrone (bis 25 m).
//
// Aufbau (x −16 … 16, z −16 … 15,5, vorn = +z), Ebenen: Lava 0 … 7,6 · Glutsteg 1 · Kraterrand 8 · Glutbalkon 8,6 ·
// Felsklippe 9 · Turmstube 12,6 · Turmdach und Glutsäule 16 · Lochwolke 20.
//   vorn rechts  Kraterrand (Start, y 8) – nie überflutet; nach hinten ein Steg zu den Propellerplattformen
//   vorn Mitte   Rampe hinab zum Glutsteg (y 1) – unten nur trocken, solange die Lava unten ist
//   links        Glutsteg mit der Nische im Westfels; daneben die rote Plattform (Glutfloß) – sie schwimmt auf der Lava
//   Mitte        Glutbalkon (y 8,6, nur mit dem Glutfloß erreichbar) und der Hängesteg (0,6 m tiefer) zurück zum Kraterrand
//   hinten       Glutturm (Dach y 16), links davon die Felsklippe mit der Glutsäule, Donut-Brücke dazwischen
//   oben         Lochwolke (y 20) über der verschlossenen Turmstube (y 12,6), Treppe vom Turmdach hinauf
// Sterne (Bauplan): 1 auf der roten Plattform warten, bis die Lava steigt (Glutbalkon)
//                   2 bei sinkender Lava in die Nische (Westfels am Glutsteg)
//                   3 Propellerplattformen anheben (zwei steigen nacheinander, der Stern schwebt über der oberen)
//                   4 über die Donut-Brücke zur Glutsäule
//                   5 auf der Lochwolke ins Loch fallen → Turmstube (Ausgang: Tür auf die ruhende obere Propellerplattform)
// Stempel: auf der Lochwolke. Schatzstellen: Kraterrand, Turmdach, Glutsäule. Keine Gegner (Bauplan).

import {
  Quads, brickBox, gelaender, flushQ, funken, carpet, Bld, glimmer, sign, line, ring, glutFloss, lochWolke, randsteine, glutInsel, kronenZier,
} from './_helpers_b.js';

const PI = Math.PI;
/** Maße (auch für Tests). */
export const MKK = {
  LO: 0, HI: 7.6, W: 1, T0: 8, BAL: 8.6, KLIPPE: 9, STUBE: 12.6, TOP: 16, WOLKE: 20,
  FLOSS: { pos: [-6.7, 1.7], size: [2.6, 2.6], offset: 1.0 },
  P1: { pos: [10.5, 7.6, 0.7] }, P2: { pos: [10.5, 11.6, -2.4] },
  LOCH: [9.7, 11.3, -9.8, -8.2],
  LAVA: { wait: 13, warn: 2.5, rise: 4.5, hold: 4, fall: 4.5 },
};
const { LO, HI, W, T0, BAL, TOP, WOLKE, STUBE } = MKK;
const KL = MKK.KLIPPE;

function scene(level) {
  const Q = new Quads();
  const box = (x0, x1, z0, z1, top, o = {}) => brickBox(level, Q, { x0, x1, z0, z1, top, y0: o.y0 ?? -4, hot: o.hot ?? LO + 0.8, stone: o.stone ?? 'basalt', bw: o.bw ?? 1.6, bh: o.bh ?? 0.8, cell: o.cell ?? 1.0, faces: o.faces ?? '+z+x-x-z', ...o });
  // ---------------- Kessel (Wände 8,5 hoch, halten die Lava)
  box(-16, 16, 14.5, 15.5, 8.5, { tag: 'kessel', faces: '+z-z+x-x', bands: [3.5] });
  box(-16, 16, -16, -15, 8.5, { tag: 'kessel', faces: '-z+z+x-x', bands: [3.5] });
  box(-16, -15, -15, 14.5, 8.5, { tag: 'kessel', faces: '-x+x', bands: [3.5] });
  box(15, 16, -15, 14.5, 8.5, { tag: 'kessel', faces: '+x-x', bands: [3.5] });
  // ---------------- Kraterrand (Start) mit Steg zur Propellerplattform und rotem Läufer
  box(2, 15, 3, 14.5, T0, { stone: 'rot', tag: 'kraterrand', pattern: carpet([[12, 11.5], [12, 5], [10.5, 3.2], [10.5, 2.4]], 0.7), patternColor: 0xc8283a, faces: '-x-z' });
  box(8.5, 12.5, 2.3, 3, T0, { stone: 'rot', tag: 'kraterrand', faces: '-z+x-x', pattern: () => true, patternColor: 0xc8283a });
  // ---------------- Rampe hinab zum Glutsteg (Unterbau; die schräge Fläche baut der Baustein ramp)
  box(-9, 2, 9, 12, W, { tag: 'rampenfuss', faces: '+z-z' });
  // ---------------- Glutsteg (y 1) mit Nische im Westfels
  box(-13.5, -9, -2, 14.5, W, { tag: 'glutsteg', pattern: carpet([[-11.3, 13], [-11.3, 3]], 0.45), patternColor: 0x5a3a2e, faces: '+x' });
  box(-9, -8.1, 0.4, 3.0, W, { tag: 'glutsteg', faces: '+x+z-z' });
  box(-15, -13.5, 4.5, 6.5, W, { tag: 'nische', faces: '', skipTop: false });
  box(-15, -13.5, -2, 4.5, KL, { tag: 'westfels', faces: '+x+z', stone: 'dunkel' });
  box(-15, -13.5, 6.5, 14.5, KL, { tag: 'westfels', faces: '+x-z', stone: 'dunkel' });
  box(-15, -13.5, 4.5, 6.5, KL, { y0: 3.6, bottom: 3.6, tag: 'westfels', faces: '+x', stone: 'dunkel' });
  // ---------------- Felsklippe mit der Glutsäule (Stern 4)
  box(-15, -5, -15, -2, KL, { tag: 'klippe', faces: '+z+x', stone: 'dunkel', bands: [4.5] });
  box(-15, -11, -11, -7, TOP, { y0: KL, tag: 'glutsaeule', faces: '+z+x-z', stone: 'rot', bands: [12.5], windows: [['+z', 2, 12.6, 0.6, 1.2], ['+x', 2, 12.6, 0.6, 1.2]] });
  // ---------------- Glutbalkon (nur mit dem Glutfloß) und Hängesteg zum Kraterrand (0,6 m tiefer: nur hinab)
  box(-5.3, -1.5, -0.4, 4.4, BAL, { tag: 'glutbalkon', stone: 'rot', faces: '+z+x-x-z', pattern: carpet([[-3.4, 1.7]], 0.9), patternColor: 0xffc83a });
  box(-1.5, 2, 3.0, 4.4, T0, { y0: T0 - 0.8, bottom: T0 - 0.8, tag: 'haengesteg', stone: 'sand', faces: '+z-z', cell: 0.5 });
  // ---------------- Glutturm (Dach y 16) mit Ostflügel und verschlossener Turmstube (Boden 12,6)
  const win = [['+z', 1.5, 9.2, 0.8, 1.6], ['+z', 5, 9.2, 0.8, 1.6], ['+z', 8.5, 9.2, 0.8, 1.6], ['+z', 12, 9.2, 0.8, 1.6], ['-x', 3, 11, 0.8, 1.6], ['-x', 7.5, 11, 0.8, 1.6]];
  box(-5, 8.6, -15, -4, TOP, { tag: 'turm', stone: 'rot', bands: [8.8, 12.4], windows: win, faces: '+z-x' });
  box(8.6, 13, -15, -10.5, TOP, { tag: 'turm', stone: 'rot', bands: [8.8, 12.4], faces: '+x' });
  box(8.6, 13, -10.5, -4, STUBE, { tag: 'stube', stone: 'rot', bands: [8.8], faces: '+z+x', pattern: carpet([[10.5, -9], [10.5, -4.5]], 0.6), patternColor: 0xc8283a });
  box(12.2, 13, -10.5, -4.5, 15.4, { y0: STUBE, bottom: STUBE, tag: 'stube', stone: 'rot', faces: '+x-x', skipTop: true, hot: undefined });
  box(8.6, 9.6, -4.5, -4, 15.4, { y0: STUBE, bottom: STUBE, tag: 'stube', stone: 'rot', faces: '+z', skipTop: true, hot: undefined });
  box(11.4, 13, -4.5, -4, 15.4, { y0: STUBE, bottom: STUBE, tag: 'stube', stone: 'rot', faces: '+z+x', skipTop: true, hot: undefined });
  box(9.6, 11.4, -4.5, -4, 15.4, { y0: 15, bottom: 15, tag: 'stube', stone: 'rot', faces: '+z', skipTop: true, hot: undefined });
  const [hx0, hx1, hz0, hz1] = MKK.LOCH;
  box(8.6, hx0, -10.5, -4, TOP, { y0: 15.4, bottom: 15.4, tag: 'turmdach', stone: 'rot', faces: '+z', hot: undefined });
  box(hx1, 13, -10.5, -4, TOP, { y0: 15.4, bottom: 15.4, tag: 'turmdach', stone: 'rot', faces: '+z+x', hot: undefined });
  box(hx0, hx1, -10.5, hz0, TOP, { y0: 15.4, bottom: 15.4, tag: 'turmdach', stone: 'rot', faces: '', hot: undefined });
  box(hx0, hx1, hz1, -4, TOP, { y0: 15.4, bottom: 15.4, tag: 'turmdach', stone: 'rot', faces: '+z', hot: undefined });

  // ---------------- Geländer (Krümel fällt nicht in die Lava) – offen nur an Rampe, Steg, Floß, Propellern, Donut-Brücke
  const gl = (a, b, y, o) => gelaender(level, Q, a, b, y, { color: 0xffc83a, ...o });
  gl([2, 3], [8.5, 3], T0); gl([12.5, 3], [15, 3], T0); gl([8.5, 3], [8.5, 2.3], T0); gl([12.5, 3], [12.5, 2.3], T0);
  gl([8.5, 2.3], [9, 2.3], T0); gl([12, 2.3], [12.5, 2.3], T0);
  gl([2, 4.4], [2, 9], T0); gl([2, 12], [2, 14.5], T0);
  gl([-9, -2], [-9, 0.4], W); gl([-9, 3], [-9, 9], W); gl([-9, 12], [-9, 14.5], W); gl([-9, 0.4], [-8.1, 0.4], W); gl([-9, 3], [-8.1, 3], W);
  gl([-5.3, -0.4], [-1.5, -0.4], BAL); gl([-5.3, 4.4], [-1.5, 4.4], BAL); gl([-1.5, -0.4], [-1.5, 3.0], BAL);
  gl([-5.3, -0.4], [-5.3, 0.4], BAL); gl([-5.3, 3.0], [-5.3, 4.4], BAL);
  gl([-1.5, 3.0], [2, 3.0], T0, { h: 0.8 }); gl([-1.5, 4.4], [2, 4.4], T0, { h: 0.8 });
  gl([-5, -4], [9, -4], TOP); gl([12, -4], [13, -4], TOP); gl([-5, -15], [13, -15], TOP); gl([13, -15], [13, -4], TOP);
  gl([-5, -15], [-5, -10], TOP); gl([-5, -8], [-5, -4], TOP);
  gl([-15, -11], [-11, -11], TOP); gl([-15, -7], [-11, -7], TOP); gl([-15, -11], [-15, -7], TOP);
  gl([-11, -11], [-11, -10], TOP); gl([-11, -8], [-11, -7], TOP);
  // Ring um die Dachluke der Turmstube (vom Dach aus kommt man nicht hinein – nur von der Wolke durchs Loch)
  const r0x = hx0 - 0.25, r1x = hx1 + 0.25, r0z = hz0 - 0.25, r1z = hz1 + 0.25;
  gl([r0x, r0z], [r1x, r0z], TOP, { h: 0.8 }); gl([r1x, r0z], [r1x, r1z], TOP, { h: 0.8 }); gl([r1x, r1z], [r0x, r1z], TOP, { h: 0.8 }); gl([r0x, r1z], [r0x, r0z], TOP, { h: 0.8 });
  flushQ(level, Q);

  // ---------------- Bordsteine an der Rampe, Zier
  const B = new Bld(), Gl = new Bld();
  randsteine(level, B, { xa: -9, ya: W, xb: 2, yb: T0, z: 9.12 });
  randsteine(level, B, { xa: -9, ya: W, xb: 2, yb: T0, z: 11.88 });
  // Turmstube: Laterne, Schatzkiste, Wandteppich mit Krone (sichtbar durch die Tür)
  B.box(1.2, 0.7, 0.8, 11.4, STUBE, -10.0, 0x8a5a2e, { r: 0.08 }).box(1.26, 0.16, 0.86, 11.4, STUBE + 0.62, -10.0, 0xffc83a, { r: 0.04 });
  B.box(1.6, 2.0, 0.06, 10.5, STUBE + 0.6, -10.44, 0xb01e2a, { r: 0.02 });
  Gl.box(0.9, 0.5, 0.07, 10.5, STUBE + 1.3, -10.4, 0xffd23d, { r: 0.02 });
  Gl.sphere(0.22, 9.0, STUBE + 2.2, -6, 0xffe08a, { ws: 8, hs: 6 });
  // Kraterrand: Krümels Rastplatz (Rucksack, Kompass-Stein, Kistchen) und Feuerschalen
  B.box(0.9, 0.6, 0.7, 13.6, T0, 12.8, 0x9a6a3e, { r: 0.06 }).box(0.95, 0.1, 0.75, 13.6, T0 + 0.5, 12.8, 0x6a4422, { r: 0.03 });
  for (const [x, z] of [[3, 13.6], [14.2, 4], [-4.6, 3.8], [12.4, -14.2], [-4.4, -14.2]]) {
    const y = x < -4 && z > 0 ? BAL : z < -10 ? TOP : T0;
    B.cyl(0.38, 0.22, 0.5, x, y, z, 0x3a2e34, 10).cyl(0.42, 0.42, 0.08, x, y + 0.5, z, 0xffc83a, 12);
    Gl.cone(0.3, 0.55, x, y + 0.56, z, 0xff8a2a, 7).cone(0.16, 0.4, x, y + 0.6, z, 0xffe070, 6);
  }
  // Banner mit Krone am Turm (rot mit Goldrand)
  for (const x of [-1.2, 5.6]) {
    B.box(1.6, 3.2, 0.08, x, 11.4, -3.94, 0xc81e2a, { r: 0.02 }).box(1.7, 0.16, 0.1, x, 14.55, -3.93, 0xffc83a, { r: 0.02 });
    Gl.box(0.8, 0.42, 0.1, x, 13.2, -3.88, 0xffd23d, { r: 0.02 });
    for (const dx of [-0.3, 0, 0.3]) Gl.cone(0.12, 0.3, x + dx, 13.62, -3.88, 0xffd23d, 4);
  }
  B.flush(level, { castShadow: true });
  Gl.flush(level, { material: 'glow', castShadow: false });
  glutInsel(level, { x0: -16, x1: 16, z0: -16, z1: 15.5, y: -4 });
  kronenZier(level, { pos: [11.7, WOLKE, -11.6], size: 0.9, flag: [8.0, WOLKE, -12.6], flagH: 5 });
}

function setup(level) {
  glutFloss(level, { id: 'glutfloss', lava: 'glut', pos: MKK.FLOSS.pos, size: MKK.FLOSS.size, offset: MKK.FLOSS.offset });
  funken(level, [[-15, 15, LO, 10, -15, 14.5]], { n: 80, rise: 0.5, size: 0.22, seed: 12 });
  glimmer(level, [[7.5, 13, WOLKE + 0.5, WOLKE + 4, -13, -9], [-15, -11, TOP + 0.4, TOP + 2.5, -11, -7]], { n: 30, color: 0xfff2a0, size: 0.2, drift: 0.4 });
}

export const LEVEL = {
  id: 'K-Kapitän',
  world: 12,
  title: 'Krümels Glutturm-Finale',
  archetype: 'diorama',
  theme: 'volcano',
  music: 'course_diorama',
  build: scene,
  setup,
  timeLimit: 400,
  killY: -12,
  start: { pos: [7.4, T0, 11.6], yaw: PI },
  diorama: {
    figure: 'kruemel',
    center: [0, 9, -1],
    camera: { yaw: 24, pitch: 40, dist: [60, 18], follow: [0.3, 0.9], fov: 40 },
    props: [
      { kind: 'dig', pos: [13.6, T0, 5.2] }, { kind: 'dig', pos: [-2.8, TOP, -13.6] }, { kind: 'dig', pos: [-14.2, TOP, -10.2] },
    ],
  },
  segments: [
    // Lava im Kessel: 13 s unten (2,5 s Brodeln zur Warnung), 4,5 s Steigen, 4 s oben, 4,5 s Sinken
    { type: 'lavaspiegel', id: 'glut', mode: 'zyklus', pos: [0, -4, -0.25], size: [30, 4, 29.5], low: LO, high: HI, ...MKK.LAVA },
    // Rampe Kraterrand → Glutsteg (steigt nach +X)
    { type: 'ramp', pos: [-3.5, W, 10.5], size: [11, T0 - W, 3], axis: 'x', dir: 1, top: 'stone' },
    // Propellerplattformen: steigen, solange Krümel daraufsteht (je 4 m), sinken leer zurück
    { type: 'propellerplattform', id: 'propeller1', pos: MKK.P1.pos, size: [3, 3], thick: 0.4, mode: 'rise', height: 4, climb: 1.6, back: 1.4 },
    { type: 'propellerplattform', id: 'propeller2', pos: MKK.P2.pos, size: [3, 3], thick: 0.4, mode: 'rise', height: 4, climb: 1.6, back: 1.4 },
    // Donut-Brücke vom Turmdach zur Glutsäule
    { type: 'donutblock', id: 'donuts', grid: [6, 2], pos: [-8, TOP - 1, -9], delay: 0.6, respawn: 2.6, color: 'rosa' },
    // Treppe vom Turmdach zur Lochwolke (Stufen 0,25 m)
    { type: 'stairs', pos: [-0.2, TOP, -11.3], dir: '+x', steps: 16, rise: 0.25, run: 0.45, width: 2.4, style: 'stone' },
    // Lochwolke über der Turmstube
    ...lochWolke({ x0: 7, x1: 12.8, z0: -13, z1: -5, y: WOLKE, hole: MKK.LOCH }),
    sign(9.2, T0, 12.6, 'Glutturm-Finale\nKrümels letztes Abenteuer!', { size: [2.8, 1.0], yaw: -0.3 }),
    sign(3.4, T0, 8.2, 'Hinab nur,\nwenn die Lava sinkt!', { size: [2.2, 0.9], yaw: 0.25 }),
    sign(-12.4, W, 1.2, 'Rote Platte:\nwarten, bis die\nLava steigt!', { size: [2.2, 1.0], yaw: 0.5 }),
    sign(7.6, TOP, -6.4, 'Hoch zur\nLochwolke!', { size: [1.8, 0.8], yaw: 0.2 }),
    { type: 'deco_w7', items: [
      { kind: 'lavafall', pos: [3.2, LO, -3.95], width: 2.2, height: 12.5, yaw: 0 },
      { kind: 'lavafall', pos: [14.95, LO, -1.6], width: 1.8, height: 8.2, yaw: -PI / 2 },
      { kind: 'lavafall', pos: [-8.5, LO, -1.95], width: 1.6, height: 8.2, yaw: 0 },
      { kind: 'basaltsaeulen', pos: [-6.5, -2, 12.6], size: [3.2, 2.4], n: 6, height: [1.5, 4.2], seed: 4 },
      { kind: 'basaltsaeulen', pos: [5.2, -2, -1.2], size: [3.2, 1.6], n: 5, height: [1.5, 5.4], seed: 9 },
      { kind: 'vulkanfelsen', pos: [-2.5, -1.4, -2.2], size: [3, 2], n: 3, seed: 3 },
      { kind: 'glutriss', pos: [6, T0, 9.5], length: 2.6, yaw: 0.4 },
      { kind: 'fackel', mount: 'stand', pos: [14.2, T0, 14.0], height: 1.6 }, { kind: 'fackel', mount: 'stand', pos: [2.6, T0, 4.0], height: 1.6 },
      { kind: 'fackel', mount: 'stand', pos: [-14.4, TOP, -7.6], height: 1.4 }, { kind: 'fackel', mount: 'stand', pos: [12.4, TOP, -4.6], height: 1.4 },
      { kind: 'fackel', mount: 'stand', pos: [-12.9, W, 13.9], height: 1.4 },
      { kind: 'kette', pos: [-1.5, 7.9, 3.7], length: 2.2 }, { kind: 'kette', pos: [2, 7.9, 3.7], length: 2.2 },
    ] },
  ],
  items: [
    // Kraterrand, Rampe, Glutsteg, Nische
    line([12, T0 + 0.5, 9.6], [5.5, T0 + 0.5, 10.5], 4),
    line([0.5, 7.6, 10.5], [-7.5, 2.6, 10.5], 5),
    line([-11.3, W + 0.5, 12.5], [-11.3, W + 0.5, 3.2], 5),
    { kind: 'coins', from: [-14.6, W + 0.5, 4.9], to: [-14.6, W + 0.5, 6.2], n: 2 },
    // Glutbalkon, Turmdach, Glutsäule, Wolke
    ring([-3.4, BAL + 0.6, 1.7], 1.2, 5),
    line([7.5, TOP + 0.5, -6.2], [-3.5, TOP + 0.5, -6.2], 6),
    ring([-13, TOP + 0.6, -9], 1.2, 5),
    line([7.8, WOLKE + 0.5, -6], [7.8, WOLKE + 0.5, -10.6], 3),
    // Turmstube: Bitcoin-Häufchen
    ring([10.5, STUBE + 0.5, -6.4], 0.8, 4),
  ],
  stars: [
    [-3.4, BAL + 0.05, 1.7],          // 1: Glutbalkon – nur mit dem Glutfloß (warten, bis die Lava steigt)
    [-14.35, W + 0.05, 5.5],          // 2: Nische im Westfels (nur bei Ebbe trocken)
    [10.5, TOP + 0.35, -2.4],         // 3: über der oberen Propellerplattform (beide anheben)
    [-13, TOP + 0.05, -9],            // 4: Glutsäule hinter der Donut-Brücke
    [10.5, STUBE + 0.05, -9],         // 5: Turmstube unter dem Loch der Wolke
  ],
  stamp: [12.0, WOLKE + 0.05, -6.2],  // auf der Lochwolke
  marks: {
    start: [7.4, T0, 11.6], rampeOben: [2.6, T0, 10.5], rampeUnten: [-9.6, W, 10.5], nische: [-14.35, W, 5.5], flossRand: [-8.55, W, 1.7],
    floss: [-6.7, W, 1.7], balkon: [-3.4, BAL, 1.7], steg: [0.2, T0, 3.7], steg2: [10.5, T0, 2.6], p1: [10.5, T0, 0.7], p2: [10.5, 12, -2.4],
    dach: [10.5, TOP, -5.0], bruecke: [-4.4, TOP, -9], saeule: [-13, TOP, -9], treppe: [-0.8, TOP, -11.3], wolke: [7.6, WOLKE, -11.3],
    loch: [10.5, WOLKE, -9], stube: [10.5, STUBE, -9], tuer: [10.5, STUBE, -4.6],
  },
};
