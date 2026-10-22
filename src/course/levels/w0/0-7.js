// Wirbelbrocken-Arena (0-7): Testlevel für den Endgegner von Welt 2 (tests/course_w2_enemies.mjs) mit Archetyp
// 'boss'. Kreisrunde Festungsplattform (arena_cage, Innenradius 11 m, geschlossener Käfig) über dem Wüstensand; die
// Figur startet am Rand, der Kampf beginnt beim Schritt in die Arena (trigger). Nach dem Sieg erscheint in der Mitte
// eine Warp-Box zum Zielplateau (Zielmast). Ohne Fahr-Illusion (speed 0). Musik course_boss.

const Y = 2;
const R = 11;

export const LEVEL = {
  id: '0-7',
  world: 0,
  title: 'Wirbelbrocken-Arena',
  archetype: 'boss',
  theme: 'desert',
  music: 'course_boss',
  timeLimit: 300,
  start: { pos: [0, Y, 8.5], yaw: Math.PI / 2 },
  checkpoint: [{ pos: [0, Y, 9], yaw: Math.PI / 2 }],
  camera: [
    { from: 20, to: -20, pitch: 46, dist: 17, x: 0, xLock: 0.3, ahead: 1.2, lead: 0.5 },
    { from: -30, to: -60, pitch: 42, dist: 12.5, ahead: 2, area: [-20, 20] },
  ],
  boss: {
    id: 'wirbel', name: 'Wirbelbrocken', speed: 0,
    trigger: { min: [-R, Y - 0.5, -R], max: [R, Y + 6, 7.5] },
    warp: 'warp_sieg', warpPos: [0, Y, 0], warpTo: [0, Y + 0.3, -40], frame: 0.35, musicAfter: 'course_boss',
  },
  segments: [
    { type: 'island', pos: [0, -1, -2], size: [64, 1, 60], top: 'sand', under: 0 },
    { type: 'killplane', y: -14 },
    { type: 'arena_cage', pos: [0, Y, 0], radius: R, height: 5, floor: Y + 1, ceiling: 6.4, gate: Math.PI, low: 0.85 },
    { type: 'torches', h: 2.6, items: [[-13.5, 0, 6], [13.5, 0, 6], [-13.5, 0, -6], [13.5, 0, -6]] },
    // Zielplateau (nur per Warp-Box erreichbar)
    { type: 'island', pos: [0, 0, -46], size: [14, Y, 18], top: 'sand' },
    { type: 'deco', items: [
      { kind: 'rock', pos: [-18, 0, 12], size: 1.4 }, { kind: 'rock', pos: [19, 0, -10], size: 1.2 },
      { kind: 'rock', pos: [-20, 0, -18], size: 1.6 }, { kind: 'rock', pos: [6, Y, -51], size: 0.9 },
    ] },
  ],
  enemies: [
    { kind: 'wirbelbrocken', id: 'wirbel', pos: [0, Y, -3], arena: { center: [0, Y, 0], r: R - 0.4 } },
  ],
  items: [
    { kind: 'warpbox', id: 'warp_sieg', pos: [0, Y, 0], target: [0, Y + 0.3, -40], hidden: true },
    { kind: 'coins', pos: [0, Y + 0.3, -44], r: 2.2, n: 8 },
  ],
  stars: [[-4, Y + 1.5, -47]],
  goal: [0, Y, -52],
  marks: { center: [0, Y, 0], start: [0, Y, 8.5], plateau: [0, Y, -40] },
};
