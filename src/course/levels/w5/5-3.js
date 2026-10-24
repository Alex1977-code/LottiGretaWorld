// 5-3 „Klon-Gewusel in den Blauglut-Gassen“ – kurzer Parcours (Bauplan 5-3: unterirdisch, blaue Lava, Spiegelfrüchte,
// 3er-/4er-Lifte, nur 100 s; Zugang erst ab 90 Sternen – das regelt die Weltkarte). Thema bluelava, Musik
// course_bluelava. Ein Höhlenraum ≈ 24 × 44 m: eine kleine Stadt unter dem Berg – Gassen aus Basaltpflaster zwischen
// Häusern mit leuchtenden Fenstern, darunter überall glühende blaue Lava. Start vorn links, Ziel hinten rechts
// („gegenüber“).
//
//   Südgasse (Startplatz)  z   9 …   1   Start; links vom Start die rissige Fliese (Stampfattacke → Grube, Stern 0);
//                                       Spiegelfrucht-Kristall zum Ausprobieren; Brücke A zur Marktinsel
//   Westgasse              x −12 …  −7   Häuserzeile, Pilzling, Lavaspalt mit Glutball → Nordgasse
//   Ostgasse               x   7 …  12   Figurenschalter „Greta“ (Pilzkopf-Figur) → Kristallstufen zum Dach mit dem
//                                       Stempel; Lavaspalt mit Glutball
//   Marktinsel (Mitte)     x  −4 …   4   Abkürzung über zwei schmale Brücken, je von einer Feuer-Schnappblume bewacht;
//                                       Uhrturm mit 3er-Lift (drei Figuren → Turmterrasse, Stern 1), Spiegelfrucht-
//                                       Kristall, Blauglut-Brunnen (unsichtbarer Block mit Extraleben darüber)
//   Nordgasse (Ziel)       z −26 … −34   Checkpoint, 4er-Lift vor der Nordwand (vier Figuren → Felsterrasse, Stern 2;
//                                       oder Krallen-Anzug aus dem ?-Block und die Kletterwand daneben), Zielmast
// Sterne: 0 Grube unter der rissigen Fliese, 1 Uhrturm (3er-Lift), 2 Felsterrasse (4er-Lift/Krallen). Stempel: Dach in
// der Ostgasse (Figurenschalter für Greta – Heldin im Pause-Menü wechseln). Gegner (Bauplan): Feuer-Schnappblume 2,
// Pilzling 2, Glutball 2.

import {
  isl, line, ring, arc, crackTile, fruitCrystal, caveWall, caveHouses, streetLamps, mushroomLamps, stalactites, laundry,
  bats, blueFalls, marketStalls, glowFountain, paving, sparksUp, blueLavaSea, fairyLights, parapet, liftShaft, Bld, litTop, GASSE,
} from './_helpers_b.js';

const Y = 1;              // Gassen (Oberseite)
const LAVA = -0.8;        // Lava-Oberfläche
const PIT = -0.6;         // Boden der Grube unter der rissigen Fliese
const X0 = -14, X1 = 14;  // Höhlenraum (Felswände außerhalb)
const WA = -9.5, EA = 9.5;  // Innenkante der West-/Ostgasse
const TILE = { x: -11.2, z: 4.6 };
const ISLE = { x0: -4.5, x1: 4.5, z0: -8, z1: -19.5 };
const TOWER = { x0: -4.5, x1: -0.6, z0: -14, z1: -19.5, top: 6.5, back: -16.8, clock: 10.5 };
const LIFT3 = { x: -2.5, z: -12.45, x0: -4, x1: -1, z0: -10.95, z1: -13.95, rise: TOWER.top - Y };   // in einer Mulde: Oberseite bündig
const BA = 1.6, BB = 1.2;   // Brücken A (Süd → Insel) und B (Insel → Nord), Mitte x
const FOUNT = [3.2, Y, -15.6];
const NWALL = { z: -34, top: 12, ledge: 8.4, lx0: X0, lx1: -5.5, lz1: -37.6, cx1: -10.8 };
const LIFT4 = { x: -9, z: -32.42, x0: -10.5, x1: -7.5, z0: -30.92, z1: -33.92, rise: NWALL.ledge - Y };
const ROOF = { x0: X1, x1: 16.6, z0: -8.6, z1: -13.4, top: 6.5 };
const SIDE = 8.6;          // Höhe der Seitenwände (die Kamera schaut darüber)
const ROCK = { top: 'rock', topColor: 0x8c8ab8, sideColor: 0x4c4a78 };

function scene(level) {
  // ---------------------------------------------------------------- Felswände (Westen, Osten, Norden)
  caveWall(level, X0 - 5, X0, -3, SIDE, 13, NWALL.z, { tag: 'westwand' });
  caveWall(level, X1, X1 + 5, -3, SIDE, 13, ROOF.z0, { tag: 'ostwand' });
  caveWall(level, ROOF.x1, X1 + 5, -3, SIDE, ROOF.z0, ROOF.z1, { tag: 'ostwand' });
  caveWall(level, ROOF.x0, ROOF.x1, -3, ROOF.top, ROOF.z0, ROOF.z1, { tag: 'dach' });
  caveWall(level, X1, X1 + 5, -3, SIDE, ROOF.z1, NWALL.z, { tag: 'ostwand' });
  // Nordwand: Felsterrasse links (Stern 2), Kletterwand neben dem 4er-Lift
  caveWall(level, X0 - 5, NWALL.lx0, -3, NWALL.top, NWALL.z, -42, { tag: 'nordwand' });
  caveWall(level, NWALL.lx0, NWALL.cx1, -3, NWALL.ledge, NWALL.z, NWALL.lz1, { tag: 'kletterwand', climbable: true });
  caveWall(level, NWALL.cx1, NWALL.lx1, -3, NWALL.ledge, NWALL.z, NWALL.lz1, { tag: 'nordwand' });
  caveWall(level, NWALL.lx0, NWALL.lx1, -3, NWALL.top, NWALL.lz1, -42, { tag: 'nordwand' });
  caveWall(level, NWALL.lx1, X1 + 5, -3, NWALL.top, NWALL.z, -42, { tag: 'nordwand' });
  // Griffmulden der Kletterwand (helle Leisten)
  const grip = new Bld();
  for (let r = 0; r < 9; r++) for (let c = 0; c < 4; c++) grip.box(0.42, 0.12, 0.12, NWALL.lx0 + 0.5 + c * 0.72 + (r % 2) * 0.36, Y + 0.4 + r * 0.8, NWALL.z + 0.06, litTop(0xb8c8ff), { r: 0.04 });
  grip.flush(level, { castShadow: false });
  // Brüstungen an den Liften: mit der Wand dahinter eine Ecke, in der sich die Figuren auf dem Lift sammeln
  parapet(level, ISLE.x0, LIFT3.x0, ISLE.z0 - 0.1, LIFT3.z0, Y, 1.0);
  // Ufermauern entlang der Lava (an Brücken und Lavaspalten offen): Klone fallen nicht so leicht hinein
  const P = 0.3, H = 0.75;
  parapet(level, ISLE.x1 - P, ISLE.x1, ISLE.z0, ISLE.z1, Y, H);
  parapet(level, ISLE.x0 + 0.5, BA - 0.8, ISLE.z0, ISLE.z0 - P, Y, H);
  parapet(level, BA + 0.8, ISLE.x1 - P, ISLE.z0, ISLE.z0 - P, Y, H);
  parapet(level, TOWER.x1, BB - 0.8, ISLE.z1 + P, ISLE.z1, Y, H);
  parapet(level, BB + 0.8, ISLE.x1 - P, ISLE.z1 + P, ISLE.z1, Y, H);
  parapet(level, WA, BA - 0.8, 1 + P, 1, Y, H);
  parapet(level, BA + 0.8, EA, 1 + P, 1, Y, H);
  parapet(level, WA, BB - 0.8, -26, -26 - P, Y, H);
  parapet(level, BB + 0.8, EA, -26, -26 - P, Y, H);
  parapet(level, WA - P, WA, 1, -6, Y, H);
  parapet(level, WA - P, WA, -8.5, -26, Y, H);
  parapet(level, EA, EA + P, 1, -17, Y, H);
  parapet(level, EA, EA + P, -19.5, -26, Y, H);
  liftShaft(level, ISLE.x0, LIFT3.x0, LIFT3.z0, TOWER.z0, Y, TOWER.top + 1.2);
  liftShaft(level, LIFT4.x0 - 0.45, LIFT4.x0, LIFT4.z0, NWALL.z, Y - 0.4, NWALL.ledge + 1.2);
  // Uhrturm auf der Marktinsel: vorn die Terrasse (Stern 1), hinten der Turm mit Uhr
  caveWall(level, TOWER.x0, TOWER.x1, Y, TOWER.top, TOWER.z0, TOWER.back, { tag: 'uhrturm', light: 0xc8b8e8, color: 0x8a7aa8 });
  caveWall(level, TOWER.x0, TOWER.x1, Y, TOWER.clock, TOWER.back, TOWER.z1, { tag: 'uhrturm', light: 0xc8b8e8, color: 0x8a7aa8 });

  // ---------------------------------------------------------------- Häuser an den Wänden
  caveHouses(level, [
    { at: [X0, Y, 5.2], face: '+x', w: 4.2, h: 4.4, shop: 'brot', balcony: true },
    { at: [X0, Y, -1.2], face: '+x', w: 3.6, h: 3.8 },
    { at: [X0, Y, -11], face: '+x', w: 4.4, h: 4.6, shop: 'kristall' },
    { at: [X0, Y, -17.5], face: '+x', w: 3.4, h: 4.0, balcony: true },
    { at: [X0, Y, -23.5], face: '+x', w: 4.0, h: 4.2, shop: 'pilz' },
    { at: [X1, Y, 5.5], face: '-x', w: 4.0, h: 4.2, shop: 'muenze' },
    { at: [X1, Y, -1.5], face: '-x', w: 3.6, h: 3.6, balcony: true },
    { at: [X1, Y, -16.8], face: '-x', w: 3.6, h: 4.4 },
    { at: [X1, Y, -23], face: '-x', w: 4.2, h: 3.8, shop: 'laterne' },
    { at: [-2.6, Y, NWALL.z], face: '+z', w: 3.6, h: 4.2, shop: 'kristall' },
    { at: [3.4, Y, NWALL.z], face: '+z', w: 4.0, h: 4.6, balcony: true },
    { at: [11.4, Y, NWALL.z], face: '+z', w: 3.0, h: 3.6, door: false, windows: 2 },
  ]);
  clockFace(level, [(TOWER.x0 + TOWER.x1) / 2, (TOWER.top + TOWER.clock) / 2 + 0.2, TOWER.back + 0.02]);

  // ---------------------------------------------------------------- Pflaster, Brunnen, Marktstände
  paving(level, X0, X1, 9, 1, Y + 0.02, { avoid: [[TILE.x - 1.05, TILE.x + 1.05, TILE.z + 1.05, TILE.z - 1.05]] });
  paving(level, X0, WA, 1, -26, Y + 0.02, { avoid: [[X0, WA, -5.9, -8.6]] });
  paving(level, EA, X1, 1, -26, Y + 0.02, { avoid: [[EA, X1, -16.9, -19.6]] });
  paving(level, X0, X1, -26, NWALL.z, Y + 0.02, { avoid: [[LIFT4.x0, LIFT4.x1, LIFT4.z0, NWALL.z]] });
  paving(level, ISLE.x0, ISLE.x1, ISLE.z0, ISLE.z1, Y + 0.02, { colors: [0x9a8ac0, 0x8a7ab0, 0xa898cc], avoid: [[TOWER.x0, TOWER.x1, TOWER.z0 + 0.2, TOWER.z1], [LIFT3.x0, LIFT3.x1, LIFT3.z0, LIFT3.z1]] });
  glowFountain(level, FOUNT, { r: 1.15 });
  marketStalls(level, [
    { pos: [X0 + 1.3, Y, -3.4], yaw: Math.PI / 2, w: 2.2, colors: [0x6ac8ff, 0xffffff] },
    { pos: [X1 - 1.3, Y, -11.4], yaw: -Math.PI / 2, w: 2.2, colors: [0xff7ac0, 0xffffff] },
    { pos: [6.6, Y, -32.8], yaw: 0, w: 2.4, colors: [0xffd24a, 0x8a5aff] },
  ]);
  streetLamps(level, [[WA + 0.5, Y, 1.4], [6.6, Y, 7.6], [WA + 0.4, Y, -13.6], [EA - 0.4, Y, -6.6], [EA - 0.4, Y, -24.4], [6.4, Y, -27.0], [12.6, Y, -29], [4, Y, -9.2], [X0 + 0.6, Y, -27]]);
  mushroomLamps(level, [
    [X0 + 0.8, Y, 8.2, 1.2, 0x6ad0ff], [X0 + 1.6, Y, 8.6, 0.8, 0xff8ad8], [X1 - 0.8, Y, 8.4, 1.1, 0xb08aff], [4.1, Y, -19, 0.9, 0x6ad0ff],
    [X0 + 0.7, Y, -8.9, 0.8, 0xff8ad8], [X1 - 0.8, Y, -14.6, 1.0, 0x6ad0ff], [9.4, Y, -33.3, 0.9, 0xff8ad8], [-5.0, Y, -33.3, 1.0, 0x6ad0ff],
  ]);
  // Grube unter der rissigen Fliese: leuchtende Kristalle am Grund
  const pit = new Bld();
  for (const [dx, dz, h] of [[-0.6, -0.55, 0.7], [0.65, -0.5, 0.5], [-0.55, 0.6, 0.45], [0.7, 0.62, 0.65]]) pit.cone(0.16, h, TILE.x + dx, PIT, TILE.z + dz, 0x7ad8ff, 5);
  pit.flush(level, { material: 'glow', castShadow: false });
  // Fässer und Kisten
  const props = new Bld();
  for (const [x, z, s] of [[X0 + 0.8, 2.2, 1], [X0 + 1.4, 2.9, 0.8], [X1 - 0.8, -5.6, 1], [X1 - 0.9, -20.6, 0.9], [X0 + 0.8, -20.4, 1], [X1 - 1.2, -32.8, 0.9]]) {
    props.cyl(0.36 * s, 0.32 * s, 0.86 * s, x, Y, z, litTop(0x8a5a3a), 10);
    props.torus(0.35 * s, 0.03, x, Y + 0.2 * s, z, 0x3a3a50, { rx: Math.PI / 2 });
    props.torus(0.35 * s, 0.03, x, Y + 0.66 * s, z, 0x3a3a50, { rx: Math.PI / 2 });
  }
  for (const [x, z, s, yaw] of [[X0 + 1.1, 0.2, 0.8, 0.3], [X0 + 1.4, -0.7, 0.6, -0.2], [X1 - 1.1, 2.2, 0.8, 0.1], [X0 + 1, -26.2, 0.9, 0.4], [X1 - 1.3, -26.5, 0.7, 0.2]]) {
    props.box(s, s, s, x, Y, z, litTop(0xb07a4a), { yaw, r: 0.04 });
    props.box(s + 0.02, 0.08, s + 0.02, x, Y + s * 0.45, z, litTop(0x6a4a2a), { yaw, r: 0 });
  }
  props.flush(level);
  // Tropfsteine unter der Decke, Lavafälle an der Nordwand
  stalactites(level, [
    [-9, 15, 4, 3], [-4, 16, -4, 4], [5, 15.5, 2, 3.4], [9, 16, -12, 4.2], [-8, 16, -18, 3.6], [0, 17, -22, 5], [6, 16, -28, 3.8],
    [-6, 16, -30, 3], [10, 15, 6, 2.8], [-1, 16, 6, 3.2], [3, 15.5, -14, 3.6],
  ]);
  blueFalls(level, [
    { pos: [15.5, LAVA, -38], width: 2.2, height: 12.6, face: '+z' },
    { pos: [-16, LAVA, -38], width: 1.6, height: 12.6, face: '+z' },
  ]);
}

/** Uhr am Turm (Zifferblatt leuchtet, Zeiger aus Holz). */
function clockFace(level, [x, y, z]) {
  const b = new Bld(), g = new Bld();
  b.cyl(1.25, 1.25, 0.16, x, y, z + 0.06, litTop(0xc8a050), 20, { rx: Math.PI / 2 });
  g.cyl(1.05, 1.05, 0.06, x, y, z + 0.16, 0xf6f0d8, 24, { rx: Math.PI / 2 });
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    b.box(0.08, k % 3 ? 0.14 : 0.24, 0.04, x + Math.sin(a) * 0.86, y + Math.cos(a) * 0.86 - 0.07, z + 0.2, 0x3a2a4a, { r: 0, rz: -a });
  }
  b.box(0.1, 0.62, 0.05, x, y - 0.05, z + 0.22, 0x3a2a4a, { r: 0, rz: 0.6 });
  b.box(0.08, 0.84, 0.05, x, y - 0.06, z + 0.23, 0x3a2a4a, { r: 0, rz: -2.2 });
  b.flush(level);
  g.flush(level, { material: 'glow', castShadow: false });
}

function setup(level) {
  laundry(level, [X0 + 0.4, Y + 4.6, -6.2], [WA + 0.3, Y + 3.6, -6.6], { n: 5, phase: 0.3 });
  laundry(level, [X0 + 0.4, Y + 4.4, -27.6], [-6.8, Y + 4.8, NWALL.z + 0.1], { n: 6, phase: 2.2 });
  fairyLights(level, [
    [[X0 + 0.3, Y + 4.8, 3.2], [X1 - 0.3, Y + 4.8, 3.6], 22, 0.9],
    [[X0 + 0.3, Y + 4.6, -14.2], [WA - 0.1, Y + 3.2, -14.2], 6, 0.35],
    [[X1 - 0.3, Y + 4.6, -9.8], [EA + 0.1, Y + 3.2, -9.8], 6, 0.35],
    [[TOWER.x1, TOWER.clock - 0.4, TOWER.back - 0.6], [ISLE.x1, Y + 3.4, ISLE.z1 + 0.4], 8, 0.4],
    [[X0 + 0.3, Y + 5, -30], [X1 - 0.3, Y + 5, -30.4], 22, 0.8],
  ]);
  bats(level, { spots: [[-4, 11, -6, 4], [6, 12, -22, 5], [-6, 12.5, -24, 3]], n: 2 });
  sparksUp(level, { x0: WA, x1: EA, z0: 1, z1: -26, y: LAVA, h: 10, n: 70 });
}

export const LEVEL = {
  id: '5-3',
  world: 5,
  title: 'Klon-Gewusel in den Blauglut-Gassen',
  archetype: 'parcours',
  theme: 'bluelava',
  music: 'course_bluelava',
  timeLimit: 100,
  killY: -6,
  build: (level) => {
    scene(level);
    // eigene Formen/Entitäten: rissige Fliese, Spiegelfrucht-Kristalle
    blueLavaSea(level, { x0: -24, x1: 24, z0: 16, z1: -44, y: LAVA });
    crackTile(level, { pos: [TILE.x, Y, TILE.z], size: [2, 2], id: 'fliese' });
    fruitCrystal(level, MARKS.fruitStart, { id: 'frucht_start', every: 3 });
    fruitCrystal(level, MARKS.fruitIsle, { id: 'frucht_insel', every: 2.2 });
    fruitCrystal(level, MARKS.fruitN1, { id: 'frucht_nord1', every: 2.2 });
    fruitCrystal(level, MARKS.fruitN2, { id: 'frucht_nord2', every: 2.2 });
  },
  setup,
  start: { pos: [-8, Y, 6.6], yaw: Math.PI / 2 },
  camera: [
    { from: 16, to: -24, pitch: 46, dist: 13.5, fov: 40, x: 0, xLock: 0.35 },
    { from: -24, to: -44, pitch: 44, dist: 13.5, fov: 40, x: 0, xLock: 0.3 },
  ],
  segments: [
    // ---------------- Blaue Lava unter der ganzen Stadt
    // ---------------- Südgasse (Startplatz) mit Loch für die Grube
    isl(X0, X1, 9, TILE.z + 1, Y, 4.6, ROCK),
    isl(X0, X1, TILE.z - 1, 1, Y, 4.6, ROCK),
    isl(X0, TILE.x - 1, TILE.z + 1, TILE.z - 1, Y, 4.6, ROCK),
    isl(TILE.x + 1, X1, TILE.z + 1, TILE.z - 1, Y, 4.6, ROCK),
    isl(TILE.x - 1, TILE.x + 1, TILE.z + 1, TILE.z - 1, PIT, 3, ROCK),
    // ---------------- Westgasse (Lavaspalt z −6 … −8,5), Ostgasse (Lavaspalt z −17 … −19,5)
    isl(X0, WA, 1, -6, Y, 4.6, ROCK),
    isl(X0, WA, -8.5, -26, Y, 4.6, ROCK),
    isl(EA, X1, 1, -17, Y, 4.6, ROCK),
    isl(EA, X1, -19.5, -26, Y, 4.6, ROCK),
    // ---------------- Nordgasse (Mulde für den 4er-Lift)
    isl(X0, X1, -26, LIFT4.z0, Y, 4.6, ROCK),
    isl(X0, LIFT4.x0, LIFT4.z0, NWALL.z, Y, 4.6, ROCK),
    isl(LIFT4.x1, X1, LIFT4.z0, NWALL.z, Y, 4.6, ROCK),
    isl(LIFT4.x0, LIFT4.x1, LIFT4.z0, NWALL.z, Y - 0.4, 4.2, ROCK),
    // ---------------- Marktinsel und die zwei schmalen Brücken (Abkürzung)
    isl(ISLE.x0, ISLE.x1, ISLE.z0, LIFT3.z0, Y, 4.6, ROCK),
    isl(ISLE.x0, LIFT3.x0, LIFT3.z0, LIFT3.z1, Y, 4.6, ROCK),
    isl(LIFT3.x1, ISLE.x1, LIFT3.z0, LIFT3.z1, Y, 4.6, ROCK),
    isl(ISLE.x0, ISLE.x1, LIFT3.z1, ISLE.z1, Y, 4.6, ROCK),
    isl(LIFT3.x0, LIFT3.x1, LIFT3.z0, LIFT3.z1, Y - 0.4, 4.2, ROCK),
    { type: 'bridge', from: [BA, Y, 1], to: [BA, Y, ISLE.z0], width: 1.6 },
    { type: 'bridge', from: [BB, Y, ISLE.z1], to: [BB, Y, -26], width: 1.6 },
    // ---------------- Lifte
    { type: 'multilift', id: 'dreier', pos: [LIFT3.x, Y - 0.4, LIFT3.z], rise: LIFT3.rise, need: 3, size: [3, 0.5, 3], wait: 1.2 },
    { type: 'multilift', id: 'vierer', pos: [LIFT4.x, Y - 0.4, LIFT4.z], rise: LIFT4.rise, need: 4, size: [3, 0.5, 3], wait: 1.2 },
    // ---------------- Stempel: Kristallstufen zum Dach (erscheinen mit dem Greta-Schalter)
    { type: 'appear', id: 'stempelweg', style: 'block', color: 0x7ad8ff, parts: [
      { pos: [12.4, Y + 1.25, -7.2], size: [1.7, 0.4, 1.7] },
      { pos: [12.4, Y + 2.6, -9.4], size: [1.7, 0.4, 1.7] },
      { pos: [12.4, Y + 3.95, -11.6], size: [1.7, 0.4, 1.7] },
    ] },
    // ---------------- Schilder
    { type: 'sign', pos: [-4.6, Y, 8.2], text: 'Blauglut-Gassen', size: [2.8, 0.9] },
    { type: 'sign', pos: [-1.4, Y, 4.2], text: 'Spiegelfrucht\n= Klon!', size: [2.0, 0.95] },
    { type: 'sign', pos: [11.2, Y, -2.8], text: 'Nur für Greta!\n(Pause → Figur)', size: [2.4, 0.95] },
    { type: 'sign', pos: [-0.4, Y, -9.6], text: 'Dreier-Lift', size: [1.9, 0.7] },
  ],
  blocks: [
    { kind: 'question', pos: [-5.2, Y + 2.0, -29.4], content: 'krallen' },
    { kind: 'question', pos: [0.4, Y + 2.6, 5.2], content: 'coins:5' },
    { kind: 'coinblock', pos: [-11.8, Y + 2.6, -14.2], count: 6 },
    { kind: 'hidden', pos: [FOUNT[0], Y + 3.4, FOUNT[2]], content: 'oneup' },
  ],
  enemies: [
    { kind: 'feuer_schnappblume', id: 'fs_a', pos: [BA - 2.1, Y, ISLE.z0 - 0.8], base: 'pot', dir: [0, 1], range: 8.5, pause: 1.6 },
    { kind: 'feuer_schnappblume', id: 'fs_b', pos: [BB + 2.2, Y, -26.9], base: 'pot', dir: [0, 1], range: 8.5, pause: 1.6 },
    { kind: 'pilzling', id: 'pz_west', pos: [-11.75, Y, -12], path: [[-11.75, Y, -10.5], [-11.75, Y, -23]] },
    { kind: 'pilzling', id: 'pz_nord', pos: [1, Y, -30.6], path: [[-2.2, Y, -30.6], [6.5, Y, -30.6]] },
    { kind: 'glutball', id: 'gb_west', pos: [-11.75, LAVA, -7.25], height: 3.6, period: 2.4 },
    { kind: 'glutball', id: 'gb_ost', pos: [11.75, LAVA, -18.25], height: 3.6, period: 2.4, phase: 0.5 },
  ],
  items: [
    // Figurenschalter (nur Greta) → Kristallstufen zum Stempel
    { kind: 'figurenschalter', id: 'greta_schalter', pos: [11.6, Y, -4.8], hero: 'greta', on: { reveal: 'stempelweg' } },
    // Münzen
    line([-8, Y + 0.6, 3], [-8, Y + 0.6, -0.6], 3),
    line([-11.75, Y + 0.6, -1], [-11.75, Y + 0.6, -4.8], 3),
    ...arc([-11.75, Y + 0.6, -5.2], [-11.75, Y + 0.6, -9.3], 3, 1.6),
    line([-11.75, Y + 0.6, -16], [-11.75, Y + 0.6, -24], 5),
    line([11.75, Y + 0.6, 2.8], [11.75, Y + 0.6, -2], 4),
    ...arc([11.75, Y + 0.6, -16.2], [11.75, Y + 0.6, -20.3], 3, 1.6),
    line([BA, Y + 0.6, 0], [BA, Y + 0.6, -6.6], 4),
    line([BB, Y + 0.6, -20.6], [BB, Y + 0.6, -25], 3),
    ring([FOUNT[0], Y + 2.3, FOUNT[2]], 1.8, 8),
    line([-2, Y + 0.6, -32.4], [6, Y + 0.6, -32.4], 5),
    ring([-2.6, TOWER.top + 0.6, -15.4], 1.0, 5),
    line([12.4, Y + 2.2, -7.2], [12.4, Y + 4.95, -11.6], 3),
  ],
  checkpoint: { pos: [-1.2, Y, -27.4], yaw: Math.PI / 2 },
  stars: [
    [TILE.x, PIT + 0.1, TILE.z],                         // 0: Grube unter der rissigen Fliese
    [-2.6, TOWER.top, -15.6],                           // 1: Uhrturm-Terrasse (3er-Lift)
    [LIFT4.x, NWALL.ledge, -35.8],                      // 2: Felsterrasse (4er-Lift oder Krallen-Anzug)
  ],
  stamp: [15.3, ROOF.top, -11],
  goal: [10.6, Y, -30.4],
  marks: undefined,
};

const MARKS = {
  start: [-8, Y, 6.6], tile: [TILE.x, Y, TILE.z], pit: [TILE.x, PIT, TILE.z], bridgeA: [BA, Y, 1.4], island: [BA, Y, -10],
  lift3: [LIFT3.x, Y, LIFT3.z], tower: [-2.6, TOWER.top, -15.4], lift4: [LIFT4.x, Y, LIFT4.z], ledge: [LIFT4.x, NWALL.ledge, -35.6],
  climb: [NWALL.lx0 + 1.8, Y, NWALL.z + 0.4], switch: [11.6, Y, -4.8], roof: [15.3, ROOF.top, -11], goal: [10.6, Y, -30.4],
  fruitStart: [-3.4, Y, 5.4], fruitIsle: [3.0, Y, -10.6], fruitN1: [-6.2, Y, -27.8], fruitN2: [-4.0, Y, -30.4],
  westGap: [-11.75, Y, -7.25], eastGap: [11.75, Y, -18.25], bridgeB: [BB, Y, -20], fountain: FOUNT,
};
LEVEL.marks = MARKS;
