// 7-Kapitän „Krümel in der Zahnradschmiede“ – Welt 7 „Lava-Festung“, Rätsel-Diorama (Archetyp diorama, Thema lavamachine,
// Musik course_diorama, 400 s, 5 Sterne; Bauplan 7-Kapitän: Lava-Diorama ca. 30 × 30 m mit Förderbändern, Stampfsteinen als
// Trittstufen und Projektilköpfen).
//
// Krümel (Kapitänsmütze, Rucksack) springt nicht. In Baron Brummbärs Zahnradschmiede mitten im Lavasee helfen ihm die
// Stampfsteine: lockt er einen herunter, fällt der Stein in seine Lavagrube und liegt dort bündig wie eine Trittstufe –
// darüber hinweg oder obendrauf, und schon fährt der Stein Krümel hinauf. Ein Förderband rollt ihm entgegen, Projektilköpfe
// sausen aus zwei Kanonen quer über den Weg.
//
// Aufbau (x −14 … 14, z −18 … 14, vorn = +z), Ebenen: Boden y 0 · Deck y 4,5 · Dach y 9; Lavasee y −1,2.
//   vorn rechts   Startplatz (Krümel winkt), links davon der Lavagraben mit dem ersten Stampfstein; dahinter die Insel
//   Mitte         Förderband (rollt nach vorn) über den Lavasee, Kanone links feuert quer übers Band
//   Mitte hinten  Maschinenboden mit Stampfstein 2 (fährt hinauf aufs Deck), Kanone auf dem Deck
//   hinten links  Maschinenblock mit Durchgang („Loch“), dahinter Stampfstein 3 aufs Dach, Schacht im Dach
//   hinten rechts Fahrplattform aufs Dach des Kesselturms, Loch im Dach in die Kesselkammer
// Sterne (Bauplan): 1 hinter dem sichtbaren Stampfstein (Insel jenseits des Lavagrabens: Stein als Brücke)
//                   2 Fahrplattform hinauf, ins Loch im Dach des Kesselturms fallen (Kesselkammer)
//                   3 auf dem Förderband (gegen das Band laufen)
//                   4 auf einem Stampfstein nach dem Band (oben auf dem Stein – mitfahren)
//                   5 durch das Loch im Maschinenblock, Stampfstein hinauf aufs Dach, in den Schacht fallen
// Gegner: Stampfstein 3, Kanonenturm 2 (Projektilköpfe). Schatzstellen: Startplatz, Deck, Kesselturm-Dach.

import { C, Quads, brickBox, merlons, flushQ, gelaender, sign, line, ring, aufzug, funken, carpet } from './_helpers_c.js';
import { Bld, glimmer } from '../w6/_helpers_b.js';

const PI = Math.PI;
export const MK = { G: 0, U: 4.5, T: 9, SEA: -1.2 };
const { G, U, T, SEA } = MK;

function scene(level) {
  const Q = new Quads();
  const st = 'stahl', hot = SEA;
  const box = (x0, x1, z0, z1, top, o = {}) => brickBox(level, Q, { x0, x1, z0, z1, top, y0: o.y0 ?? -4, hot, faces: o.faces ?? '+z+x-x-z', stone: o.stone ?? st, bw: o.bw ?? 2.0, bh: o.bh ?? 1.0, cell: o.cell ?? 1.0, ...o });
  // ---------------- Boden vorn: Startplatz und Insel (Stern 1), Lavagraben dazwischen
  box(-5.1, 14, 14, 6, G, { tag: 'start', pattern: carpet([[10, 13], [4, 9.6], [-4.4, 10]], 0.6), patternColor: 0x3a8ad8 });
  box(-14, -6.9, 14, 6, G, { tag: 'insel', stone: 'ziegel', bw: 1.2, bh: 0.6 });
  box(-6.9, -5.1, 10.9, 9.1, -2, { y0: -4, faces: '', skipTop: true, tag: 'grube1' });
  // ---------------- Maschinenboden hinten (Stern 4: Grube unter Stampfstein 2)
  box(-6, 3.2, -6, -10, G, { tag: 'maschinenboden', pattern: carpet([[0, -6], [0, -7.6], [3, -7.6]], 0.55), patternColor: 0x3a8ad8 });
  box(3.2, 5.0, -6, -8.2, G, { tag: 'maschinenboden' });
  box(5.0, 6, -6, -10, G, { tag: 'maschinenboden' });
  box(3.2, 5.0, -8.2, -10, -2, { faces: '', skipTop: true, tag: 'grube2' });
  // ---------------- Deck (y 4,5) mit Grube unter Stampfstein 3 im Hof hinter dem Maschinenblock
  box(-14, 8, -10, -15.5, U, { tag: 'deck' });
  box(-14, -6.9, -15.5, -18, U, { tag: 'deck' });
  box(-6.9, -5.1, -17.3, -18, U, { tag: 'deck' });
  box(-5.1, 8, -15.5, -18, U, { tag: 'deck' });
  box(-6.9, -5.1, -15.5, -17.3, U - 2, { faces: '', skipTop: true, tag: 'grube3' });
  // ---------------- Maschinenblock (y 4,5 … 9) mit Durchgang und Schacht (Stern 5)
  box(-9.2, -4, -12.5, -15.5, T, { y0: U, stone: 'ziegel', bw: 1.2, bh: 0.6, tag: 'block' });
  box(-10.8, -9.2, -12.5, -15.5, T, { y0: 6.9, bottom: 6.9, stone: 'ziegel', bw: 1.2, bh: 0.6, tag: 'block', faces: '+z-z' });
  box(-14, -12.9, -12.5, -15.5, T, { y0: U, stone: 'ziegel', bw: 1.2, bh: 0.6, tag: 'block' });
  box(-11.3, -10.8, -12.5, -15.5, T, { y0: U, stone: 'ziegel', bw: 1.2, bh: 0.6, tag: 'block' });
  box(-12.9, -11.3, -15.1, -15.5, T, { y0: U, stone: 'ziegel', bw: 1.2, bh: 0.6, tag: 'block', faces: '-z' });
  box(-12.9, -11.3, -12.5, -12.9, T, { y0: 6.8, bottom: 6.8, stone: 'ziegel', bw: 1.2, bh: 0.6, tag: 'block', faces: '+z' });
  // ---------------- Kesselturm (y 9) mit Kesselkammer (Boden y 6, Tür nach links, Loch im Dach: Stern 2)
  box(8, 14, -9, -18, 6, { tag: 'kesselturm', stone: 'messing', faces: '+z+x-x' });
  box(8, 14, -12.4, -18, T, { y0: 6, bottom: 6, tag: 'kesselturm', stone: 'messing', faces: '+x-x-z' });
  box(11.4, 14, -9, -12.4, T, { y0: 6, bottom: 6, tag: 'kesselturm', stone: 'messing', faces: '+z+x' });
  box(8, 11.4, -9, -9.6, T, { y0: 6, bottom: 6, tag: 'kesselturm', stone: 'messing', faces: '+z' });
  box(8, 8.6, -9.6, -12.4, T, { y0: 7.6, bottom: 7.6, tag: 'kesselturm', stone: 'messing', faces: '-x' });
  // Dach über der Kammer mit Loch (x 9,2 … 10,8, z −10,2 … −11,8)
  box(8.6, 11.4, -9.6, -10.2, T, { y0: 8.6, bottom: 8.6, faces: '', tag: 'kesseldach', stone: 'messing' });
  box(8.6, 11.4, -11.8, -12.4, T, { y0: 8.6, bottom: 8.6, faces: '', tag: 'kesseldach', stone: 'messing' });
  box(8.6, 9.2, -10.2, -11.8, T, { y0: 8.6, bottom: 8.6, faces: '', tag: 'kesseldach', stone: 'messing' });
  box(10.8, 11.4, -10.2, -11.8, T, { y0: 8.6, bottom: 8.6, faces: '', tag: 'kesseldach', stone: 'messing' });
  // Kanonen-Sockel in der Lava (links vom Band)
  box(-10, -8, 2, 0, G, { tag: 'kanonensockel', stone: 'ziegel', bw: 1.2, bh: 0.6 });
  // ---------------- Geländer an allen Kanten über der Lava (nicht am Graben, Band, Grubenrand, Deck-Vorderkante über dem Boden)
  const gl = (a, b, y, o) => gelaender(level, Q, a, b, y, o);
  gl([14, 14], [14, 6], G); gl([-5.1, 6], [-1.5, 6], G); gl([1.5, 6], [14, 6], G); gl([-5.1, 14], [14, 14], G, { h: 0.7 });
  gl([-14, 14], [-14, 6], G); gl([-14, 6], [-6.9, 6], G); gl([-14, 14], [-6.9, 14], G, { h: 0.7 });
  gl([-6, -6], [-1.5, -6], G); gl([1.5, -6], [6, -6], G); gl([-6, -6], [-6, -10], G); gl([6, -6], [6, -10], G);
  gl([-14, -10], [-6, -10], U); gl([6, -10], [8, -10], U); gl([-14, -10], [-14, -18], U); gl([-14, -18], [8, -18], U, { h: 0.7 });
  gl([14, -9], [14, -18], T); gl([8, -18], [14, -18], T, { h: 0.7 }); gl([11.4, -9], [14, -9], T);
  gl([-14, -12.5], [-14, -15.5], T); gl([-4, -12.5], [-4, -15.5], T);
  flushQ(level, Q);

  // ---------------- Maschinen-Zier: Zahnräder, Rohre, Schlote, Manometer, Warnstreifen, Kessel
  const B = new Bld();
  // Kessel auf dem Kesselturm-Dach (hinten) mit Manometer
  B.cyl(1.3, 1.3, 2.2, 12.2, T, -16, 0xd8a03a, 20).sphere(1.3, 12.2, T + 2.2, -16, 0xe8b44a, { s: [1, 0.55, 1] });
  level.world.add({ type: 'cyl', x: 12.2, z: -16, r: 1.3, y0: T, y1: T + 2.9, tag: 'kessel' });
  B.cyl(0.42, 0.42, 0.12, 12.2, T + 1.2, -14.7, 0xf6f4ef, 16, { rx: PI / 2 }).box(0.06, 0.32, 0.04, 12.2, T + 1.1, -14.62, 0xd8283a, { rz: 0.6 });
  // Ventilräder und Rohrstutzen
  for (const [x, y, z] of [[-8.8, 2.2, 6.05], [13.5, 3.2, -9.05], [-3.95, 6.8, -13.4]]) B.torus(0.34, 0.06, x, y, z, 0xd8283a, { rx: 0 }).cyl(0.07, 0.07, 0.7, x, y - 0.35, z, 0x3a3a44, 6, { rx: PI / 2 });
  // Warnstreifen-Pfosten am Lavagraben
  for (const z of [6.2, 13.8]) for (const x of [-7.1, -4.9]) { for (let k = 0; k < 4; k++) B.box(0.26, 0.3, 0.26, x, k * 0.3, z, k % 2 ? 0x2a2a30 : 0xffc21a, { r: 0.02 }); }
  B.flush(level);

  // Glutfunken aus dem Lavasee, Dampf über dem Kessel
  funken(level, [[-14, 14, SEA, 7, -6, 6], [-16, 16, SEA, 8, 14, 18]], { n: 60, rise: 0.4, size: 0.2, seed: 11 });
  glimmer(level, [[11.4, 13, T + 2.4, T + 5, -16.8, -15.2]], { n: 26, color: 0xf0f0ff, size: 0.42, drift: 0.6, speed: 0.5, opacity: 0.6 });
  glimmer(level, [[-11.6, -10.2, 0.3, 1.6, 9.2, 10.8], [3.4, 4.8, 5, 6.4, -8.4, -9.8], [-12.6, -11.6, 6.8, 8.2, -13, -14.6], [9.4, 10.6, 6.6, 8.2, -10.4, -11.6], [-0.6, 0.6, 0.3, 1.4, -2.6, -1.4]], { n: 30, color: 0xfff2a0, size: 0.18, drift: 0.35 });
}

function setup(level) {
  aufzug(level, 'fahrplattform', { name: 'fahrt', back: 1.4 });
}

export const LEVEL = {
  id: '7-Kapitän',
  world: 7,
  title: 'Krümel in der Zahnradschmiede',
  archetype: 'diorama',
  theme: 'lavamachine',
  music: 'course_diorama',
  build: scene,
  setup,
  timeLimit: 400,
  killY: -10,
  start: { pos: [10, G, 12], yaw: PI / 2 },
  diorama: {
    figure: 'kruemel',
    center: [0, 3.2, -2],
    camera: { yaw: 18, pitch: 46, dist: [50, 17], follow: [0.3, 0.9], fov: 40 },
    props: [
      { kind: 'dig', pos: [12.4, G, 8.2] }, { kind: 'dig', pos: [-12.2, U, -16.8] }, { kind: 'dig', pos: [9.4, T, -16.6] },
    ],
  },
  segments: [
    // Lavasee rings um die Schmiede
    { type: 'lavaspiegel', id: 'lavasee', mode: 'fest', pos: [0, SEA - 6, -2], size: [90, 6, 90] },
    // Förderband über den Lavasee (rollt nach vorn, Krümel läuft dagegen an)
    { type: 'foerderband', id: 'band', pos: [0, G - 0.5, 0], size: [3, 0.5, 12], dir: [0, 1], speed: 1.6, style: 'gelb' },
    // Fahrplattform aufs Dach des Kesselturms
    { type: 'mover', id: 'fahrplattform', path: [[6.7, U - 0.5, -15.9], [6.7, T - 0.5, -15.9]], size: [2.6, 0.5, 2.6], speed: 1.6, idle: true, wait: 0, color: 'yellow' },
    sign(7.2, G, 11, 'Zahnradschmiede\nKrümel, los geht\'s!', { size: [2.4, 0.9], yaw: -0.35 }),
    sign(-3.7, G, 12.6, 'Stampfstein:\nlocken – warten –\ndrübergehen!', { size: [2.2, 1.0], yaw: 0.3 }),
    { type: 'deco_w7', items: [
      { kind: 'zahnrad', pos: [3.2, 1.8, 6.2], size: 2.6, axis: 'z' }, { kind: 'zahnrad', pos: [5.2, 1.0, 6.25], size: 1.6, axis: 'z' },
      { kind: 'zahnrad', pos: [-2, 6.6, -12.45], size: 2.2, axis: 'z' }, { kind: 'zahnrad', pos: [14.15, 3.4, -13], size: 3, axis: 'x' },
      { kind: 'zahnrad', pos: [-14.15, 2, 10], size: 2.2, axis: 'x' },
      { kind: 'schlot', pos: [13, T, -10], height: 3.4, solid: true }, { kind: 'schlot', pos: [-13.4, T, -15], height: 2.6, solid: true },
      { kind: 'rohr', from: [-13.6, U + 1.2, -10.4], to: [-13.6, U + 1.2, -15.2] }, { kind: 'rohr', from: [-4.2, U + 0.6, -17.6], to: [7.6, U + 0.6, -17.6] },
      { kind: 'rohr', from: [8.2, 1.2, -6.4], to: [13.6, 1.2, -6.4] },
      { kind: 'fahne', pos: [12.4, T, -9.5], height: 3.2 },
      { kind: 'fackel', pos: [-9, U + 2.6, -12.45], yaw: -PI / 2 }, { kind: 'fackel', pos: [-5.5, U + 2.6, -12.45], yaw: -PI / 2 },
      { kind: 'knochen', pos: [-12.6, G, 12.4], n: 3 },
    ] },
  ],
  items: [
    // Startplatz und Insel
    line([9, G + 0.5, 10.6], [5, G + 0.5, 9.6], 3),
    ring([-11, G + 0.6, 10], 1.6, 6),
    // Förderband
    line([0, G + 0.5, 4.6], [0, G + 0.5, 0.6], 3),
    // Maschinenboden, Deck, Dach
    line([-4.6, G + 0.5, -7.8], [1.6, G + 0.5, -7.8], 4),
    line([-2, U + 0.5, -11.2], [5, U + 0.5, -11.2], 5),
    line([-8.6, U + 0.5, -16.8], [-3.6, U + 0.5, -16.8], 4),
    line([-12.4, T + 0.5, -14], [-5.6, T + 0.5, -14], 5),
    ring([11, T + 0.6, -15], 1.4, 6),
  ],
  enemies: [
    // Stampfsteine als Trittstufen (fallen bündig in ihre Lavagrube; Oberseite in Ruhe = nächste Ebene)
    { kind: 'stampfstein', id: 'stampf1', pos: [-6, 2.6, 10], fall: 4.6, wait: 3.2, trigger: 1.0, rise: 1.8 },
    { kind: 'stampfstein', id: 'stampf2', pos: [4.1, U - 2, -9.1], fall: U, wait: 3.2, trigger: 1.0, rise: 1.8 },
    { kind: 'stampfstein', id: 'stampf3', pos: [-6, T - 2, -16.4], fall: U, wait: 3.2, trigger: 1.0, rise: 1.8 },
    // Kanonen mit Projektilköpfen: quer übers Förderband und über das Deck
    { kind: 'kanone_turm', id: 'kanone1', pos: [-9, G, 1], dir: [1, 0], interval: 4.5, range: 32, height: 1.6, speed: 4.6, first: 1.6 },
    { kind: 'kanone_turm', id: 'kanone2', pos: [2, U, -17.2], dir: [0, 1], interval: 4.5, range: 32, height: 1.6, speed: 4.2, first: 2.4 },
  ],
  stars: [
    [-11, G, 10],                 // 1: Insel hinter dem sichtbaren Stampfstein (Stein als Brücke über den Graben)
    [10, 6.9, -11],               // 2: im Loch im Kesselturm-Dach (Fahrplattform hinauf)
    [0, G, -2.4],                 // 3: auf dem Förderband
    [4.1, U + 0.05, -9.1],         // 4: oben auf dem Stampfstein nach dem Band
    [-12.1, 6.6, -13.8],          // 5: im Schacht des Maschinenblocks (Durchgang, Stampfstein, Loch)
  ],
  marks: {
    start: [10, G, 12], graben: [-4.7, G, 10], insel: [-11, G, 10], band: [0, G, 5.6], maschinenboden: [0, G, -8], grube2: [4.1, G, -7.4],
    deck: [2, U, -11.5], fahrplattform: [6.7, U, -15.9], dach: [9, T, -15.9], durchgang: [-10, U, -11.6], hof: [-7.6, U, -16.6], blockdach: [-8, T, -14],
  },
};
