// 7-A „Glutkönig im Platschkessel“ (Archetyp arena, Bauplan 7-A: Arena ca. 25 × 25 m, große Felsfläche in Lava – heller
// Lavafelsen-König mit Platschfischen; Schaden nur durch geworfene Lavabrocken, 3 Treffer; 200 s, 1 Stern). Thema lava,
// Musik course_arena.
//
// Aufbau: der „Platschkessel“ – eine runde Basaltinsel (≈ 25 m) in einem brodelnden Lavasee, eingefasst von einem Kranz
// aus Basaltpfeilern mit Brummbär-Bannern (vorn offen für die Kamera), dahinter die zackige Kraterwand mit Lavafällen,
// rauchende Vulkane, Glutfunken und Dampf aus den Rissen. Im Kessel wartet der helle Lavafelsen-König: Er ruft endlos
// Lavabrocken aus dem Boden und rollt als Felskugel auf die Heldin zu; aus der Lava ringsum springen Platschfische in
// Bögen über den Inselrand. Konter: einen Lavabrocken betäuben (draufspringen), aufheben und auf den König werfen – drei
// Treffer. Danach steigt der Stern in der Mitte auf; Einsammeln beendet das Level. Tod setzt den Kampf zurück.
// Extras: ?-Block mit Wachstumsbeere, Münzblock, unsichtbarer Block mit Extraleben vorn am Rand.

import { line, ring, sign, bossKampf, kessel7A } from './_helpers_a.js';
import {
  rockIsland, islandRadius, lavaLake, calderaWall, volcanoes, lavaBubbles, embers, basaltColumns, glowCracks, steamVents, basaltTiles,
} from '../w4/_helpers_c.js';

const Y = 2;           // Oberseite der Insel
const LAVA = -0.5;     // Lavaspiegel
const R = 12.4;        // Inselradius
const ISLAND = { center: [0, 0], top: Y, R, depth: 5, lavaY: LAVA, wobble: [0.05, 0.035, 0.03], phase: [0.6, 2.1, 1.3] };
const rim = (a, d = 0) => { const r = islandRadius(ISLAND, a) + d; return [Math.cos(a) * r, Math.sin(a) * r]; };

function build(level) {
  rockIsland(level, ISLAND);
  lavaLake(level, { center: [0, -6], size: 130, y: LAVA });
  const cols = [];
  for (const [a, n] of [[-2.3, 4], [-0.8, 3], [0.45, 3], [2.9, 4]]) {
    for (let i = 0; i < n; i++) {
      const [x, z] = rim(a + (i - n / 2) * 0.07, 1.3 + (i % 2) * 0.8);
      cols.push([x, LAVA, z, 1.2 + ((i * 7) % 5) * 0.5, 0.5 + (i % 3) * 0.12]);
    }
  }
  basaltColumns(level, cols, { lavaY: LAVA });
  basaltTiles(level, { center: [0, 0], top: Y, r0: 6.8, r1: 12.6, radius: (a) => islandRadius(ISLAND, a), fill: 0.55 });
  calderaWall(level, { center: [0, -4], r0: 32, r1: 44, n: 28, h: [9, 20], y: LAVA, gap: [1.05, 2.1] });
  volcanoes(level, [[-60, LAVA, -96, 26, 38], [56, LAVA, -104, 28, 44], [-12, LAVA, -150, 22, 30], [88, LAVA, -56, 16, 22]]);
  kessel7A(level, { Y, LAVA, R });
}

function setup(level) {
  glowCracks(level, { center: [0, 0], top: Y, R, n: 12 });
  lavaBubbles(level, { center: [0, 0], r0: 14, r1: 28, n: 18, y: LAVA });
  embers(level, { center: [0, LAVA, 0], r0: 13.5, r1: 29, n: 110, h: 16 });
  steamVents(level, [[-5, Y, 3.6], [5.6, Y, -5], [-1.6, Y, -9], [8, Y, 4.2], [-8.6, Y, -3.4]], { per: 5, size: 2.2 });
  bossKampf(level, { id: 'koenig', name: 'Glutkönig' });
}

export const LEVEL = {
  id: '7-A',
  world: 7,
  title: 'Glutkönig im Platschkessel',
  archetype: 'arena',
  theme: 'lava',
  music: 'course_arena',
  timeLimit: 200,
  starSlots: 1,
  killY: -8,
  build,
  setup,
  start: { pos: [0, Y, 9.4], yaw: Math.PI / 2 },
  camera: [{ from: 30, to: -30, pitch: 49, dist: 22, x: 0, xLock: 0.35, ahead: 1, lead: 0.5 }],
  arena: { enemies: [], star: [0, Y + 0.6, -0.6], starIndex: 0, intro: 'Wirf Lavabrocken auf den Glutkönig!', center: [0, Y, -1], camPull: 0.3 },
  segments: [
    { type: 'sign', pos: [4.4, Y, 9.2], text: 'Platschkessel', size: [2.6, 0.9], yaw: -0.25 },
    { type: 'sign', pos: [-4.6, Y, 8.6], text: 'Brocken betäuben,\naufheben, werfen!', size: [2.8, 1.0], yaw: 0.25 },
    { type: 'deco_w4', items: [
      { kind: 'lavafall', pos: [-18, LAVA, -32], width: 4, height: 16, yaw: -Math.PI / 2 + 0.5 },
      { kind: 'lavafall', pos: [20, LAVA, -30], width: 3.4, height: 14, yaw: -Math.PI / 2 - 0.55 },
      { kind: 'lavafall', pos: [1, LAVA, -38], width: 5, height: 18, yaw: -Math.PI / 2 },
      { kind: 'lavasteine', pos: [-7, Y, -6.6], size: [2.4, 1.8], n: 4 },
      { kind: 'lavasteine', pos: [8.2, Y, 1.4], size: [1.8, 2.4], n: 3 },
      { kind: 'lavasteine', pos: [-9, Y, 5], size: [1.6, 1.6], n: 3 },
    ] },
    { type: 'deco_w7', items: [
      { kind: 'fackel', pos: [-6.8, Y, 8.6], mount: 'stand' }, { kind: 'fackel', pos: [6.8, Y, 8.6], mount: 'stand' },
      { kind: 'knochen', pos: [9.4, Y, -4.4], n: 4 }, { kind: 'knochen', pos: [-9.6, Y, -1.6], n: 3 },
      { kind: 'glutriss', pos: [3, Y, 2.6], length: 3, yaw: 0.6 }, { kind: 'glutriss', pos: [-3.4, Y, -5.6], length: 2.6, yaw: -0.8 },
    ] },
  ],
  blocks: [
    { kind: 'question', pos: [-3.4, Y + 2.2, 5.8], content: 'wachstumsbeere' },
    { kind: 'coinblock', pos: [3.4, Y + 2.2, 5.8], count: 6 },
    { kind: 'hidden', pos: [0, Y + 2.6, 11.2], content: 'oneup' },
  ],
  enemies: [
    { kind: 'lavafelsen_koenig', id: 'koenig', pos: [0, Y, -3.6], arena: { center: [0, Y, -0.6], r: 10.8 }, wakeR: 9.5 },
  ],
  items: [
    ring([-6.6, Y + 0.5, 1.6], 1.4, 6),
    ring([6.6, Y + 0.5, 1.6], 1.4, 6),
    line([-2.4, Y + 0.5, -10], [2.4, Y + 0.5, -10], 4),
  ],
  stars: [],
  marks: { center: [0, Y, 0], start: [0, Y, 9.4], koenig: [0, Y, -3.6] },
};
