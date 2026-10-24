// 5-B „Wackelturm am Glutsee“ (Archetyp arena, Bauplan 5-B: „Arena ca. 20 × 20 m, wechselnd steigende Steinplattformen;
// 1 Feuer-Werfer auf einem Pilzlingsturm aus 9 Pilzlingen“, Welt-Tabelle: „weite Felsfläche in Lava, Werfer auf Pilzling-
// Turm, 2 steigende Steinsäulen; 100 s“). Thema lava, Musik course_arena, 1 Stern. Auf der Weltkarte über die Röhre bei
// 5-5 erreichbar.
//
// Aufbau: eine weite, wellig gerandete Felsfläche (≈ 23 m) mitten im Glutsee – Basaltwaben, glimmende Spalten, lila
// Kristalle (Lila Strand-Insel), das Lager der Werfer-Bande (Fässer, Feuerkugel-Körbe, Wimpel) am Rand; ringsum
// Basaltsäulen, die zackige Kraterwand mit zwei Lavafällen und rauchende Vulkane. Links und rechts hinten ragt je eine
// achteckige **Steinsäule** aus der Lava (1,2 m vor dem Inselrand): sie steigen im Wechsel (die eine fährt hoch, während
// die andere sinkt) bis 7,6 m über den Boden – höher als der Werfer auf seinem Turm.
// Ablauf: Der Werferturm (9 Pilzlinge, obenauf ein Feuer-Werfer) watschelt auf die Figur zu, der Werfer wirft hüpfende
// Feuerkugeln. Konter: auf eine abgesenkte Säule springen, mitfahren und von oben auf den Werfer springen (besiegt);
// danach den Turm von oben Stufe für Stufe abtragen (Abprall mit gehaltener Taste reicht für die nächste Stufe) – oder
// mit der Funkenblüte (?-Block am Start) jede Stufe einzeln abschießen. Beide besiegt → Stern in der Mitte → Ziel.
// Tod setzt die Arena zurück (Turm mit Werfer neu).

import {
  steinsaeule, arenaTowerFix, emberCracks, werferLager, crystals, sparkleField,
} from './_helpers_c.js';
import { rockIsland, islandRadius, lavaLake, calderaWall, volcanoes, lavaBubbles, embers } from '../w2/_helpers_c.js';
import { basaltColumns, basaltTiles, steamVents } from '../w4/_helpers_c.js';

const Y = 2;           // Felsfläche
const LAVA = -0.5;     // Lavaspiegel
const ISLAND = { center: [0, 0], top: Y, R: 11.8, depth: 5, lavaY: LAVA, wobble: [0.06, 0.04, 0.035], phase: [0.7, 2.1, 1.3] };
const rim = (a, d = 0) => { const r = islandRadius(ISLAND, a) + d; return [Math.cos(a) * r, Math.sin(a) * r]; };
// Steinsäulen: hinten links / hinten rechts, 1,2 m Lava zwischen Rand und Säule
const A_L = -2.62, A_R = -0.52;          // Winkel (rad) der Säulen (−z ist hinten): links/rechts, etwas nach hinten
const S_L = rim(A_L, 2.5), S_R = rim(A_R, 2.5);
export const PILLARS = { left: S_L, right: S_R, low: Y - 0.35, high: Y + 7.6 };

function build(level) {
  rockIsland(level, ISLAND);
  lavaLake(level, { center: [0, -6], size: 130, y: LAVA });
  steinsaeule(level, { id: 'saeule_l', pos: S_L, low: PILLARS.low, high: PILLARS.high, size: 2.6, hold: 2.4, move: 2.8, phase: 0, base: LAVA - 4 });
  steinsaeule(level, { id: 'saeule_r', pos: S_R, low: PILLARS.low, high: PILLARS.high, size: 2.6, hold: 2.4, move: 2.8, phase: 0.5, base: LAVA - 4 });
  // Basaltsäulen am Rand und im See (Würfe in die Lava bleiben frei)
  const cols = [];
  for (const [a, n] of [[1.1, 4], [2.3, 3], [-1.6, 3], [0.2, 2], [3.3, 3]]) {
    for (let i = 0; i < n; i++) {
      const [x, z] = rim(a + (i - n / 2) * 0.09, 1.5 + (i % 2) * 0.9);
      cols.push([x, LAVA, z, 1.2 + ((i * 7) % 5) * 0.5, 0.55 + (i % 3) * 0.12]);
    }
  }
  for (const [x, z, h] of [[-18, -16, 5.4], [-16.6, -17.4, 3.8], [19, -13, 6], [17.6, -14.6, 4.4], [-23, 3, 3.4], [22, 7, 4], [-6, -24, 6.6], [7, -25, 5]]) cols.push([x, LAVA, z, h, 0.8]);
  basaltColumns(level, cols, { lavaY: LAVA });
  basaltTiles(level, { center: [0, 0], top: Y, r0: 6.4, r1: 12, radius: (a) => islandRadius(ISLAND, a), fill: 0.55 });
  emberCracks(level, [
    [-2.4, Y, 3.2, 3.2, 0.4], [3, Y, -2.4, 3.6, 2.2], [-5.6, Y, -3.4, 2.8, -0.6], [5.2, Y, 4.6, 2.6, 2.9], [0.6, Y, -6.6, 3.2, 1.4],
  ]);
  crystals(level, [
    [Math.cos(2.0) * 10.3, Y, Math.sin(2.0) * 10.3, 1.2, 0xb07aff], [Math.cos(0.9) * 10.4, Y, Math.sin(0.9) * 10.4, 1.0, 0xff7ad8],
    [Math.cos(-1.6) * 10.2, Y, Math.sin(-1.6) * 10.2, 1.3, 0xb07aff], [Math.cos(3.1) * 10.3, Y, Math.sin(3.1) * 10.3, 0.9, 0xffd04a],
  ]);
  werferLager(level, [[Math.cos(2.35) * 9.4, Y, Math.sin(2.35) * 9.4, 0.8], [Math.cos(-1.85) * 9.6, Y, Math.sin(-1.85) * 9.6, -1.2]]);
  calderaWall(level, { center: [0, -4], r0: 30, r1: 42, n: 26, h: [8, 20], y: LAVA, gap: [1.05, 2.1] });
  volcanoes(level, [[-60, LAVA, -98, 26, 40], [54, LAVA, -110, 28, 44], [-12, LAVA, -150, 22, 32], [88, LAVA, -58, 16, 22]]);
}

function setup(level) {
  arenaTowerFix(level, 'wturm', 'werfer');
  lavaBubbles(level, { center: [0, 0], r0: 13, r1: 27, n: 16, y: LAVA });
  embers(level, { center: [0, LAVA, 0], r0: 12.5, r1: 28, n: 100, h: 16 });
  steamVents(level, [[-5.2, Y, 3.6], [5.8, Y, -5.2], [-1.6, Y, -8.4]], { per: 5, size: 2.2 });
  sparkleField(level, { min: [-12, Y + 0.5, -12], max: [12, Y + 6, 10], n: 30, size: 0.3, color: 0xffa060, rise: 0.8 });
}

export const LEVEL = {
  id: '5-B',
  world: 5,
  title: 'Wackelturm am Glutsee',
  archetype: 'arena',
  theme: 'lava',
  music: 'course_arena',
  timeLimit: 100,
  starSlots: 1,
  killY: -8,
  build,
  setup,
  start: { pos: [0, Y, 8.4], yaw: Math.PI / 2 },
  camera: [{ from: 30, to: -30, pitch: 44, dist: 24, x: 0, xLock: 0.35, ahead: 1.2, lead: 0.5, height: 2 }],
  arena: { enemies: 'all', star: [0, Y + 0.6, -0.5], starIndex: 0, intro: 'Spring von der Steinsäule auf den Werfer!', center: [0, Y, -3], camPull: 0.4 },
  segments: [
    { type: 'sign', pos: [3.6, Y, 8.6], text: 'Säule rauf,\nWerfer drauf!', size: [2.4, 0.9] },
    { type: 'deco_w4', items: [
      { kind: 'lavafall', pos: [-18, LAVA, -31], width: 4, height: 16, yaw: -Math.PI / 2 + 0.5 },
      { kind: 'lavafall', pos: [20, LAVA, -29], width: 3.4, height: 14, yaw: -Math.PI / 2 - 0.55 },
      { kind: 'lavasteine', pos: [-6.8, Y, -6.2], size: [2.2, 1.6], n: 4 },
      { kind: 'lavasteine', pos: [7.8, Y, 1.8], size: [1.8, 2.2], n: 3 },
    ] },
  ],
  blocks: [
    { kind: 'question', pos: [-3.4, Y + 2.3, 5.2], content: 'funken' },
    { kind: 'coinblock', pos: [3.4, Y + 2.3, 5.2], count: 6 },
  ],
  enemies: [
    { kind: 'werferturm', id: 'wturm', pos: [0, Y, -3], count: 9, riderId: 'werfer', speed: 0.8, sight: 16, throwSight: 16, interval: 2.4, first: 2.0, wake: 40 },
  ],
  items: [
    { kind: 'coins', pos: [-6.4, Y + 0.4, 2.2], r: 1.4, n: 6 },
    { kind: 'coins', pos: [6.4, Y + 0.4, 2.2], r: 1.4, n: 6 },
    { kind: 'coins', pos: [S_L[0], PILLARS.high + 0.6, S_L[1]], r: 0.8, n: 5 },
    { kind: 'coins', pos: [S_R[0], PILLARS.high + 0.6, S_R[1]], r: 0.8, n: 5 },
  ],
  stars: [],
  marks: { center: [0, Y, 0], start: [0, Y, 8.4], saeuleL: [S_L[0], Y, S_L[1]], saeuleR: [S_R[0], Y, S_R[1]] },
};
