// Schlangenkönig im Zirkuszelt (0-12): Testlevel für den Endgegner von 3-B (tests/course_w3_enemies.mjs) mit
// Archetyp 'boss'. Runde Manege (arena_cage ohne Decke, Innenradius 11,5 m), in der Mitte der drehende Sockel des
// Schlangenkönigs; sechs Diener-Löcher auf einem Ring (r 6). Der Kampf beginnt beim Schritt in die Manege. Weg nach
// oben: auf einen Diener-Teller (2,8 m) springen, vom Teller auf den Kopf. Nach dem Sieg erscheinen ein Stern (vorn) und
// hinter dem Sockel eine Warp-Box zum Zielplateau. Musik course_boss.

import { getModel } from '../../models/index.js';

const Y = 2;
const R = 11.5;

export const LEVEL = {
  id: '0-12',
  world: 0,
  title: 'Zirkus des Schlangenkönigs',
  archetype: 'boss',
  theme: 'circus',
  music: 'course_boss',
  timeLimit: 400,
  start: { pos: [0, Y, 9.5], yaw: Math.PI / 2 },
  checkpoint: [{ pos: [0, Y, 10], yaw: Math.PI / 2 }],
  camera: [
    { from: 22, to: -20, pitch: 46, dist: 18, x: 0, xLock: 0.35, ahead: 0.5, lead: 0.4, height: 1.6 },
    { from: -30, to: -64, pitch: 42, dist: 12.5, ahead: 2, area: [-20, 20] },
  ],
  boss: {
    id: 'koenig', name: 'Schlangenkönig', speed: 0,
    trigger: { min: [-R, Y - 0.5, -R], max: [R, Y + 8, 8.4] },
    warp: 'warp_sieg', warpPos: [0, Y, -8.5], warpTo: [0, Y + 0.3, -40], frame: 0.25, musicAfter: 'course_circus',
  },
  segments: [
    { type: 'island', pos: [0, -1, -4], size: [60, 1, 64], top: 'stone', under: 0 },
    { type: 'killplane', y: -14 },
    { type: 'arena_cage', pos: [0, Y, 0], radius: R, height: 5, floor: Y + 1, ceiling: 0, gate: Math.PI, low: 0.9, color: 0xe8322a },
    { type: 'pennants', items: [{ pos: [-13.5, 0, 8], color: 0xe8322a, h: 7 }, { pos: [13.5, 0, 8], color: 0xffcf2a, h: 7 }, { pos: [-13.5, 0, -8], color: 0x3a7ae8, h: 7 }, { pos: [13.5, 0, -8], color: 0xe8322a, h: 7 }] },
    // Zielplateau (nur per Warp-Box erreichbar)
    { type: 'island', pos: [0, 0, -46], size: [14, Y, 18], top: 'stone' },
  ],
  enemies: [
    { kind: 'schlangenkoenig', id: 'koenig', pos: [0, Y, 0], arena: { center: [0, Y, 0], r: R - 0.5 }, plate: 2.8, star: { pos: [0, Y + 0.4, 6.5], index: 0 } },
  ],
  items: [
    { kind: 'warpbox', id: 'warp_sieg', pos: [0, Y, -8.5], target: [0, Y + 0.3, -40], hidden: true },
    { kind: 'coins', pos: [0, Y + 0.3, -44], r: 2.2, n: 8 },
  ],
  goal: [0, Y, -52],
  marks: { center: [0, Y, 0], start: [0, Y, 9.5], plateau: [0, Y, -40] },
  // Manegen-Rand (Requisit aus der Registry) als Zier
  setup(level) {
    if (!level.view) return;
    const m = getModel('manege', { radius: 10.6, floor: false });
    m.root.position.set(0, Y, 0);
    level.view.add(m.root);
  },
};
