// H-Kapitän „Krümel im Kürbis-Kuddelmuddel“ (Halloween-Welt 31 „Kürbisinsel“; Archetyp diorama, Thema pumpkin_night,
// Musik course_diorama, 400 s, 3 Sterne). Kürbisfeld-Diorama bei Nacht: Krümel (springt nicht) trägt von Anfang an eine
// Laterne – ihr Licht macht die Geisterplattformen sichtbar und begehbar. Ein Strohballen-Labyrinth voller grinsender
// Kürbisse, ein Riesenkürbis mit einer Geistertreppe, eine rote Scheune und ein Laternenpfahl, der als einziger die blaue
// Geisterbrücke zur Vogelscheuchen-Insel zeigt.
//
// Aufbau (vorn = +z zur Kamera, Felder y 0, Terrasse y 2,5):
//   Kürbisstand-Insel (Start, x 4 … 11, z 17 … 21,5) – lila Geistersteg (3 Platten, Laternenlicht) aufs Kürbisfeld
//   Kürbisfeld (x −14 … 14, z −4 … 13,5): links vorn das Labyrinth (5 × 5 Zellen à 2,6 m, Strohballen 1 m hoch, Eingang
//     rechts vorn), rechts Vogelscheuche, Kürbisbeet, Kürbling auf Streife, Rampe hinauf zur Terrasse
//   Terrasse (z −4 … −13,5): links der Riesenkürbis mit grüner Geistertreppe (10 Stufen à 0,25 m, beginnt vorn rechts) und
//     einem Kreisgeist,
//     Mitte die Scheune (zweiter Kürbling davor), rechts der blinkende Laternenpfahl und die blaue Pfahl-Brücke (nur sein
//     Licht zeigt sie) hinüber zur Vogelscheuchen-Insel (x 18 … 23)
// Sterne: 1 Herz des Labyrinths (richtiger Weg durch die Strohgänge; Sackgassen mit Süßem, ein Kürbis winkt zurück)
//         2 auf dem Riesenkürbis (Geistertreppe im Laternenlicht, Lücke im Kreisgeist abwarten)
//         3 Vogelscheuchen-Insel (warten, bis der Laternenpfahl brennt, dann über die blaue Brücke)
// Schatzstellen (Krümel buddelt 3 Bitcoins): Sackgasse im Labyrinth, Kürbisbeet, Insel. Gegner: Kürbling (2), Kreisgeist (1).

import {
  isl, line, ring, sweets, sweetRing, mazeWalls, mazeCell, strawWalls, mazeFloor, giantPumpkin, barn, pumpkinStand, floatRock,
  pumpkinsOn, pumpkinPatch, lanternPosts, bales, cornStalks, fireflies, glowPoints, wavingPumpkin,
} from './_helpers_b.js';

const YF = 0, YT = 2.5;                     // Kürbisfeld, Terrasse
const MAZE = {
  x0: -13, z0: 12, cell: 2.6, cols: 5, rows: 5, t: 0.6, gates: [[4, 0, 'e']],
  // Durchgänge (Spalte, Zeile von vorn): Hauptweg außen herum ins Herz (2,2), zwei Sackgassen-Äste
  open: [
    [4, 0, 3, 0], [3, 0, 2, 0], [2, 0, 1, 0], [1, 0, 0, 0], [0, 0, 0, 1], [0, 1, 0, 2], [0, 2, 0, 3], [0, 3, 0, 4], [0, 4, 1, 4],
    [1, 4, 2, 4], [2, 4, 3, 4], [3, 4, 4, 4], [4, 4, 4, 3], [4, 3, 3, 3], [3, 3, 3, 2], [3, 2, 2, 2],
    [1, 0, 1, 1], [1, 1, 2, 1], [2, 1, 3, 1], [3, 1, 4, 1], [4, 1, 4, 2],
    [0, 2, 1, 2], [1, 2, 1, 3], [1, 3, 2, 3],
  ],
};
const C = (c, r) => mazeCell(MAZE, c, r);
const HEART = C(2, 2), WAVE = C(4, 2), SACK = C(2, 3);
const PK = { x: -7.5, z: -9, r: 2.4, top: 5.0 };     // Riesenkürbis
const STEP = 0.25;

// Geistertreppe um den Riesenkürbis: beginnt vorn rechts (Rampe), steigt vorn (z −5,4) nach links, an der linken Seite
// (x −11) nach hinten, dann über eine letzte Platte auf den Deckel
function pumpkinStairs() {
  const parts = [];
  for (let i = 0; i < 8; i++) parts.push({ pos: [-4 - i, YT + STEP * (i + 1) - 0.5, -5.4], size: [1.0, 0.5, 1.4] });
  parts.push({ pos: [-11, YT + STEP * 9 - 0.5, -6.4], size: [1.4, 0.5, 1.0] });
  parts.push({ pos: [-11, PK.top - 0.5, -7.4], size: [1.4, 0.5, 1.0] });
  parts.push({ pos: [-11, PK.top - 0.5, -8.4], size: [1.4, 0.5, 1.0] });
  parts.push({ pos: [-9.7, PK.top - 0.5, -8.6], size: [1.6, 0.5, 1.4] });
  return parts;
}

function scene(level) {
  // schwebende Erdbrocken unter Feld, Terrasse und Inseln
  floatRock(level, -14, 14, 13.5, -13.5, -4, 7, { n: 4, roots: 8 });
  floatRock(level, 4, 11, 21.5, 17, -3, 4, { n: 3 });
  floatRock(level, 18, 23, -5.5, -10.5, -0.5, 4, { n: 3 });
  // Labyrinth: Boden, Strohballen-Wände mit Kürbissen
  mazeFloor(level, MAZE.x0, MAZE.x0 + MAZE.cell * MAZE.cols, MAZE.z0, MAZE.z0 - MAZE.cell * MAZE.rows, YF);
  strawWalls(level, mazeWalls(MAZE), YF, 1.0, { seed: 11, pumpkins: 0.5 });
  // Riesenkürbis (Kollision: Schulter + Deckel zum Draufstehen)
  giantPumpkin(level, PK.x, YT, PK.z, PK.r, { top: PK.top, topR: 1.7, yaw: -Math.PI / 2 + 0.55, face: 'lachen' });
  barn(level, 2.5, YT, -10.9, 5.2, 4, 2.6);
  pumpkinStand(level, 8.2, YF, 20.6);
  lanternPosts(level, [[6.0, YF, 17.4], [9.0, YF, 17.4], [5.9, YF, 12.7], [0.9, YF, 9.0], [8.4, YF, 1.8], [-13.2, YT, -4.7], [18.7, YT, -6.0, 1.2]]);
  bales(level, [[13, YF, 0.2, 'rund', 0.4], [1.4, YF, -2.7, 'eckig', 0.1], [-13.0, YT, -7.6, 'rund', 1.3], [12.9, YT, -12.4, 'eckig', 0.5]]);
  cornStalks(level, [[13.3, YF, 8.2, 2.2], [13.0, YF, 6.6, 1.9], [13.4, YF, 5.0, 2.3], [12.9, YF, 3.4, 2.0], [-13.4, YT, -12.4, 2.1], [-12.7, YT, -13.0, 1.8], [22.4, YT, -10.0, 1.9]]);
  // Kürbisse mit Gesichtern: Herz des Labyrinths (Ring), Insel, Terrasse
  const heart = [];
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + 0.3; heart.push([HEART[0] + Math.cos(a) * 1.05, YF, HEART[1] + Math.sin(a) * 1.05, 0.22, k % 2 ? 'grinsen' : 'lachen', k === 3 ? 'gelb' : 'orange', -Math.PI / 2 - (a - Math.PI * 1.5) * 0.4]); }
  pumpkinsOn(level, [
    ...heart,
    ...pumpkinPatch(5.6, YF, 8.6, 6, 4, 8, { avoid: [[5.4, 8.6, 1.1]], seed: 3 }),
    ...pumpkinPatch(8.6, YT, -11.6, 5, 2.6, 6, { seed: 4 }),
    [21.8, YT, -6.3, 0.42, 'grinsen'], [19.0, YT, -9.9, 0.3, null, 'weiss'], [22.5, YT, -9.6, 0.36, 'lachen', 'gelb'],
    [-1.2, YT, -12.6, 0.45, 'staunen'], [6.1, YT, -12.3, 0.38, 'lachen'], [12.8, YT, -12.4, 0.5, 'grinsen'],
    [12.6, YF, 12.6, 0.4, 'lachen'], [2.2, YF, 12.8, 0.34, 'grinsen'], [10.2, YF, 18.0, 0.3, null, 'gelb'],
  ]);
  glowPoints(level, [[HEART[0], YF + 0.3, HEART[1], 3.2]], { color: 0xffc040, size: 1, opacity: 0.35, pulse: 0.5 });
  return [];
}

function setup(level) {
  wavingPumpkin(level, [WAVE[0], YF, WAVE[1] - 0.2], { id: 'winkekuerbis', r: 0.45, near: 1.9 });
  fireflies(level, -2, 13, 12, -2, YF + 0.9, 16);
  fireflies(level, -13, 2, 12, -1, YF + 1.3, 10, 0xffe060);
  fireflies(level, -13, 13, -5, -13, YT + 1.6, 12);
}

export const LEVEL = {
  id: 'H-Kapitän',
  world: 31,
  title: 'Krümel im Kürbis-Kuddelmuddel',
  archetype: 'diorama',
  theme: 'pumpkin_night',
  music: 'course_diorama',
  build: scene,
  setup,
  timeLimit: 400,
  killY: -14,
  lantern: { carry: true, radius: 4.6 },
  candyHud: true,
  start: { pos: [7.5, YF, 19.2], yaw: Math.PI / 2 },
  diorama: {
    figure: 'kruemel',
    center: [4, 1.5, 3.5],
    camera: { yaw: 16, pitch: 47, dist: [52, 17], follow: [0.3, 0.9], fov: 40 },
    props: [
      { kind: 'dig', pos: [SACK[0], YF, SACK[1]] },
      { kind: 'dig', pos: [5.4, YF, 8.6] },
      { kind: 'dig', pos: [21.4, YT, -9.2] },
    ],
  },
  segments: [
    // ---------------- Böden: Kürbisfeld, Terrasse, Kürbisstand-Insel, Vogelscheuchen-Insel
    isl(-14, 14, 13.5, -4, YF, 4),
    isl(-14, 14, -4, -13.5, YT, 6.5),
    isl(4, 11, 21.5, 17, YF, 3),
    isl(18, 23, -5.5, -10.5, YT, 3),
    // Rampe vom Feld hinauf zur Terrasse (rechts)
    { type: 'ramp', pos: [10.75, YF, -1.25], size: [3.5, YT - YF, 5.5], axis: 'z', dir: -1 },
    // ---------------- Laternenlicht (Krümel trägt die Laterne) und Geisterplattformen
    { type: 'geisterplattform', id: 'startsteg', light: 'laterne', from: [7.5, YF - 0.5, 16.6], to: [7.5, YF - 0.5, 13.9], n: 3, size: [2.4, 0.5, 1.5], color: 'lila' },
    { type: 'geisterplattform', id: 'kuerbistreppe', light: 'laterne', parts: pumpkinStairs(), color: 'gruen' },
    { type: 'laternenpfahl', id: 'pfahl', pos: [13.3, YT, -9.9], radius: 6.6, blink: [4.5, 3], warn: 0.8, style: 'kuerbis', yaw: 0 },
    { type: 'geisterplattform', id: 'pfahlsteg', light: 'pfahl', from: [14.4, YT - 0.5, -8], to: [17.6, YT - 0.5, -8], n: 3, size: [1.7, 0.5, 1.8], color: 'blau' },
    // ---------------- Kulisse
    { type: 'deco_hw', items: [
      { kind: 'vogelscheuche', pos: [12.4, YF, 10.4], size: 1.1, yaw: -Math.PI / 2 - 0.5 },
      { kind: 'vogelscheuche', pos: [21.6, YT, -7.6], size: 1.0, yaw: -Math.PI / 2 + 0.6 },
      { kind: 'zaun', from: [-14, YT, -4.25], to: [-12.2, YT, -4.25], style: 'holz', solid: true },
      { kind: 'zaun', from: [-3.2, YT, -4.25], to: [8.6, YT, -4.25], style: 'holz', solid: true },
      { kind: 'zaun', from: [14, YF, 13.3], to: [9.6, YF, 13.3], style: 'holz' },
      { kind: 'zaun', from: [5.4, YF, 13.3], to: [1, YF, 13.3], style: 'holz' },
      { kind: 'krummer_baum', pos: [-12.6, YT, -12.3], height: 4.2 },
      { kind: 'spinnweben', pos: [-12.3, YT + 2.6, -12.1], size: 1.1, yaw: 0.4 },
    ] },
    { type: 'sign', pos: [5.0, YF, 18.6], text: 'Kürbis-\nKuddelmuddel', yaw: 0.35 },
  ],
  items: [
    // Kürbisstand-Insel und Feld
    sweets([9.8, YF, 19.4], [9.8, YF, 17.9], 3),
    line([7.5, YF + 0.5, 12.2], [1.6, YF + 0.5, 10.7], 4),
    // Labyrinth: Hauptweg, Sackgassen voller Süßem
    line([C(3, 0)[0], YF + 0.5, C(3, 0)[1]], [C(1, 0)[0], YF + 0.5, C(1, 0)[1]], 4),
    line([C(0, 1)[0], YF + 0.5, C(0, 1)[1]], [C(0, 3)[0], YF + 0.5, C(0, 3)[1]], 4),
    line([C(1, 4)[0], YF + 0.5, C(1, 4)[1]], [C(3, 4)[0], YF + 0.5, C(3, 4)[1]], 3),
    sweets([C(2, 1)[0], YF, C(2, 1)[1]], [C(4, 1)[0], YF, C(4, 1)[1]], 4),
    sweets([C(1, 2)[0], YF, C(1, 2)[1]], [C(1, 3)[0], YF, C(1, 3)[1]], 3),
    sweetRing([HEART[0], YF, HEART[1]], 1.6, 6),
    // Terrasse
    line([10.75, YF + 0.9, 1], [10.75, YT + 0.6, -3.2], 3),
    line([-4.5, YT + 0.9, -5.4], [-10.5, YT + 2.4, -5.4], 4),
    ring([2.5, YT + 0.5, -6.6], 1.3, 6),
    // Pfahl-Brücke und Insel
    sweets([15.2, YT, -8], [17.2, YT, -8], 3),
    sweetRing([20.6, YT, -8.2], 1.4, 5),
  ],
  enemies: [
    { kind: 'kuerbling', id: 'kb_feld', pos: [2.5, YF, 5.6], behavior: 'patrol', path: [[2.5, YF, 5.6], [8.8, YF, 5.6]], sight: 0, hop: 0.9, pause: 0.5 },
    { kind: 'kuerbling', id: 'kb_terrasse', pos: [0.6, YT, -6.7], behavior: 'patrol', path: [[0.6, YT, -6.7], [6.6, YT, -6.7]], sight: 0, hop: 0.9, pause: 0.5 },
    { kind: 'kreisgeist', id: 'kg_kuerbis', center: [PK.x, YT + 1.05, PK.z], radius: 3.5, speed: 1.0, phase: 0.25 },
  ],
  stars: [
    [HEART[0], YF, HEART[1]],                       // 1: Herz des Labyrinths
    [PK.x - 0.4, PK.top, PK.z + 0.2],               // 2: auf dem Riesenkürbis
    [20.4, YT, -8.2],                               // 3: Vogelscheuchen-Insel
  ],
  marks: {
    start: [7.5, YF, 19.2], steg: [7.5, YF, 15.2], feld: [7.5, YF, 11.5], tor: [0.6, YF, C(4, 0)[1]], herz: [HEART[0], YF, HEART[1]],
    winke: [WAVE[0], YF, WAVE[1]], sack: [SACK[0], YF, SACK[1]], rampe: [10.75, YF, 1.8], terrasse: [10.75, YT, -5],
    treppe: [-2.9, YT, -5.4], deckel: [PK.x, PK.top, PK.z], pfahl: [13.3, YT, -9.9], bruecke: [13.4, YT, -8], insel: [20.4, YT, -8.2],
  },
};
