// Schattenläuferin-Arena (0-11): Testlevel für den Endgegner von 3-Zug (tests/course_w3_enemies.mjs) mit Archetyp
// 'boss'. Runde Festungsplattform (arena_cage, Innenradius 9 m) – im Spiel die Arena am Zugende; die Figur startet am
// Rand, der Kampf beginnt beim Schritt in die Arena. Die Schattenläuferin taucht mit Doppelgängern (2 / 3 / 5) auf
// einem Ring (r 5) um die Mitte auf; nur das Original (pinke Schleife) zählt. Nach dem Sieg erscheint in der Mitte
// eine Warp-Box zum Zielplateau. Ohne Fahr-Illusion (speed 0). Musik course_boss.

const Y = 2;
const R = 9;

export const LEVEL = {
  id: '0-11',
  world: 0,
  title: 'Schattenläuferin-Arena',
  archetype: 'boss',
  theme: 'train',
  music: 'course_boss',
  timeLimit: 300,
  start: { pos: [0, Y, 7], yaw: Math.PI / 2 },
  checkpoint: [{ pos: [0, Y, 7.5], yaw: Math.PI / 2 }],
  camera: [
    { from: 20, to: -20, pitch: 48, dist: 16, x: 0, xLock: 0.3, ahead: 1.2, lead: 0.5 },
    { from: -28, to: -60, pitch: 42, dist: 12.5, ahead: 2, area: [-20, 20] },
  ],
  boss: {
    id: 'schatten', name: 'Schattenläuferin', speed: 0,
    trigger: { min: [-R, Y - 0.5, -R], max: [R, Y + 6, 5.8] },
    warp: 'warp_sieg', warpPos: [0, Y, 0], warpTo: [0, Y + 0.3, -36], frame: 0.3, musicAfter: 'course_boss',
  },
  segments: [
    { type: 'island', pos: [0, -1, -2], size: [56, 1, 56], top: 'stone', under: 0 },
    { type: 'killplane', y: -14 },
    { type: 'arena_cage', pos: [0, Y, 0], radius: R, height: 5, floor: Y + 1, ceiling: 6.4, gate: Math.PI, low: 0.85, color: 0xc04cff },
    { type: 'torches', h: 2.6, items: [[-11.5, 0, 6], [11.5, 0, 6], [-11.5, 0, -6], [11.5, 0, -6]] },
    // Zielplateau (nur per Warp-Box erreichbar)
    { type: 'island', pos: [0, 0, -42], size: [14, Y, 18], top: 'stone' },
  ],
  enemies: [
    { kind: 'schattenlaeuferin', id: 'schatten', pos: [0, Y, -3.5], arena: { center: [0, Y, 0], r: R - 0.4 }, ring: 5 },
  ],
  items: [
    { kind: 'warpbox', id: 'warp_sieg', pos: [0, Y, 0], target: [0, Y + 0.3, -36], hidden: true },
    { kind: 'coins', pos: [0, Y + 0.3, -40], r: 2.2, n: 8 },
  ],
  stars: [[-4, Y + 1.5, -43]],
  goal: [0, Y, -48],
  marks: { center: [0, Y, 0], start: [0, Y, 7], plateau: [0, Y, -36] },
};
