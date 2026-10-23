// Lavafelsen-König-Arena (0-16): Testlevel für den Endgegner von 4-Burg (tests/course_w4_enemies.mjs) mit Archetyp
// 'boss'. Runde Felsinsel in der Lava (Käfig ohne Decke, Innenradius 11 m), der Lavafelsen-König steht hinten in der
// Mitte. Der Kampf beginnt beim Schritt in die Arena. Er ruft Lavabrocken (draufspringen → aufheben → auf ihn werfen),
// rollt auf die Figur zu und verstreut nach jedem Treffer Feuerbrocken. Nach dem Sieg: Stern vorn und Warp-Box hinten
// zum Zielplateau. Thema 'lava', Musik course_lavacastle.

const Y = 2;
const R = 11;

export const LEVEL = {
  id: '0-16',
  world: 0,
  title: 'Thronsaal des Lavafelsen-Königs',
  archetype: 'boss',
  theme: 'lava',
  music: 'course_lavacastle',
  timeLimit: 400,
  start: { pos: [0, Y, 9.5], yaw: Math.PI / 2 },
  checkpoint: [{ pos: [0, Y, 10], yaw: Math.PI / 2 }],
  camera: [
    { from: 22, to: -20, pitch: 48, dist: 17, x: 0, xLock: 0.35, ahead: 0.5, lead: 0.4, height: 1.6 },
    { from: -30, to: -64, pitch: 42, dist: 12.5, ahead: 2, area: [-20, 20] },
  ],
  boss: {
    id: 'koenig', name: 'Lavafelsen-König', speed: 0,
    trigger: { min: [-R, Y - 0.5, -R], max: [R, Y + 8, 8.4] },
    warp: 'warp_sieg', warpPos: [0, Y, -9], warpTo: [0, Y + 0.3, -40], frame: 0.3, musicAfter: 'course_lavacastle',
  },
  segments: [
    // Felsinsel (Arena) und Zielplateau, ringsum Lava
    { type: 'island', pos: [0, -1, -1], size: [28, Y + 1, 30], top: 'stone', under: 0 },
    { type: 'lava', pos: [0, -2.2, -14], size: [90, 0.6, 90] },
    { type: 'killplane', y: -10 },
    { type: 'arena_cage', pos: [0, Y, 0], radius: R, height: 4.5, floor: Y + 1, ceiling: 0, gate: Math.PI, low: 0.9, color: 0x8a2a1e },
    { type: 'torches', items: [{ pos: [-12.5, Y, 9] }, { pos: [12.5, Y, 9] }, { pos: [-12.5, Y, -9] }, { pos: [12.5, Y, -9] }], h: 3 },
    { type: 'island', pos: [0, 0, -46], size: [14, Y, 18], top: 'stone' },
  ],
  enemies: [
    { kind: 'lavafelsen_koenig', id: 'koenig', pos: [0, Y, -3], arena: { center: [0, Y, 0], r: R - 0.6 }, star: { pos: [0, Y + 0.4, 6.5], index: 0 } },
  ],
  items: [
    { kind: 'warpbox', id: 'warp_sieg', pos: [0, Y, -9], target: [0, Y + 0.3, -40], hidden: true },
    { kind: 'coins', pos: [0, Y + 0.3, -44], r: 2.2, n: 8 },
  ],
  goal: [0, Y, -52],
  marks: { center: [0, Y, 0], start: [0, Y, 9.5], plateau: [0, Y, -40] },
};
