// Lava-Bossarenen (0-28): Testlevel für die Endgegner der Welt 7 „Lava-Festung“ (tests/course_w7_enemies.mjs) mit Archetyp 'boss'
// und drei Kämpfen nacheinander (LEVEL.bosses, Präzisierung Gegner Welt 6):
//   A (z ≈ 0)     runde Basaltinsel (r 11,4) im Lavasee, Steg nach vorn – **heller Lavafelsen-König** (7-A) mit Lavabrocken und
//                 Platschfischen, die rings um die Insel über den Rand springen (der Steg bleibt frei). Die Figur startet auf dem
//                 Vorplatz (z 19) und geht über den Steg hinein (Sperre im Kampf). Sieg → Stern, Warp-Box → Käfig B.
//   B (z ≈ −60)   Festungskäfig 20 × 20 m mit 2 × 3 Glasröhren (Netz 'roehren7' wie 0-25) – **blauer Schubser-Prinz** (7-B, drei
//                 blaue Feuerbälle in einer Kurve, nach jedem Treffer einer mehr). Sieg → Stern, Warp-Box → Bossstraße C.
//   C (z −104 …)  Startplatz, dann die **Boss-Straße** 'strasse' (150 m bis z −262) über dem Lavasee mit Lavalücken (a = 26,
//                 64, 104 m), einer Mittellücke (76 … 98 m) und Stachelfallen – **Baron Brummbär im Kampfwagen** (7-Burg,
//                 9 Treffer, Autoscroll). Sieg → Stern, Warp-Box am Endplatz → Zielplateau (z −284).
// Checkpoints an jedem Kampfanfang (B und C erreicht man nur per Warp-Box). Thema 'lavacastle', Musik course_keep.

import * as THREE from 'three';
import { colorize, lin, mixc, smooth, addStatic, merge } from '../../blocks/kit.js';

const Y = 2;
const TAU = Math.PI * 2;
const RA = 11.4;                // Inselradius (Arena A)
const ZB = -60, W = 10;         // Prinzen-Käfig: Mitte, halbe Innenweite
const ZC = -112, LEN = 150;     // Boss-Straße: Anfang, Länge
const ZE = ZC - LEN;            // Straßenende (−262)
const PZ = [-6, 0, 6];          // Röhren-Mündungen (z relativ zur Käfigmitte)

/** Glasröhren-Netz des Käfigs B: linke Öffnung hinter dem Käfig herum zur rechten (gleiches z). */
const NODES = {}, PIPES = [], ENDS = {};
PZ.forEach((z, m) => {
  const o = W + 1.3 + 2.3 * m, back = ZB - (W + 1.3 + 2.3 * m), y = Y + 1;
  NODES[`L${z}`] = [-W + 0.05, y, ZB + z]; NODES[`R${z}`] = [W - 0.05, y, ZB + z];
  ENDS[`L${z}`] = { enter: false }; ENDS[`R${z}`] = { enter: false };
  PIPES.push({ from: `L${z}`, to: `R${z}`, via: [[-o, y, ZB + z], [-o, y, back], [o, y, back], [o, y, ZB + z]] });
});

/** Arena A: runde Basaltinsel (Kollision Zylinder) mit glühenden Fugen. */
function buildIsland(level) {
  level.world.add({ type: 'cyl', x: 0, z: 0, r: RA, y0: Y - 6, y1: Y, tag: 'basaltinsel' });
  if (!level.view) return;
  const top = lin(0x5a4a52), topHi = lin(0x7a6670), seam = lin(0xff7a2a), side = lin(0x3a2c30), sideDk = lin(0x1e1416);
  const parts = [];
  for (let r0 = 0; r0 < RA; r0 += 1.9) {
    const g = new THREE.RingGeometry(Math.max(0.01, r0), Math.min(RA, r0 + 1.9), 72, 1).toNonIndexed();
    g.rotateX(-Math.PI / 2);
    g.translate(0, Y + 0.01, 0);
    const ring = Math.round(r0 / 1.9);
    parts.push(colorize(g, (p, n, o) => {
      const a = Math.atan2(p.x, p.z) + ring * 0.31;
      const k = Math.floor(((a / TAU) + 1) * (7 + ring * 5)) % 2;
      const rr = Math.hypot(p.x, p.z);
      mixc(top, topHi, k ? 0.35 : 0.05, o);
      if (rr - r0 < 0.07 || r0 + 1.9 - rr < 0.07) mixc(o, seam, 0.75, o);
    }));
  }
  const wall = new THREE.CylinderGeometry(RA, RA + 0.9, 6, 72, 4, true).toNonIndexed();
  wall.translate(0, Y - 3, 0);
  parts.push(colorize(wall, (p, n, o) => mixc(side, sideDk, smooth(Y, Y - 4, p.y), o)));
  const rim = new THREE.TorusGeometry(RA - 0.05, 0.12, 5, 72);
  rim.rotateX(Math.PI / 2); rim.translate(0, Y + 0.02, 0);
  parts.push(colorize(rim.toNonIndexed(), (p, n, o) => mixc(lin(0xffa040), lin(0xffe08a), smooth(-0.5, 1, n.y), o)));
  addStatic(level, merge(parts), { castShadow: false });
}

export const LEVEL = {
  id: '0-28',
  world: 0,
  title: 'Lava-Bossarenen',
  archetype: 'boss',
  theme: 'lavacastle',
  music: 'course_keep',
  timeLimit: 999,
  start: { pos: [0, Y, 19], yaw: Math.PI / 2 },
  checkpoint: [{ pos: [0, Y, 19], yaw: Math.PI / 2 }, { pos: [0, Y, ZB + 14], yaw: Math.PI / 2 }, { pos: [0, Y, ZC + 6], yaw: Math.PI / 2 }],
  camera: [
    { from: 26, to: -16, pitch: 50, dist: 19, x: 0, xLock: 0.3, ahead: 0.4, lead: 0.4, height: 1.8 },
    { from: -36, to: -84, pitch: 50, dist: 19, x: 0, xLock: 0.3, ahead: 0.4, lead: 0.4, height: 1.8 },
    { from: -98, to: -268, pitch: 40, dist: 17, x: 0, xLock: 0.45, ahead: 1.2, lead: 0.4, height: 1.4 },
    { from: -274, to: -300, pitch: 42, dist: 12.5, ahead: 2 },
  ],
  bosses: [
    {
      id: 'koenig7', name: 'Lavafelsen-König', speed: 0,
      trigger: { min: [-RA, Y - 0.5, -RA], max: [RA, Y + 8, 9.4] },
      lock: { min: [-2, Y - 0.5, 11], max: [2, Y + 6, 11.6] },
      warp: 'warp_a', warpPos: [0, Y, -6], warpTo: [0, Y + 0.3, ZB + 14], frame: 0.3, center: [0, Y, 0], musicAfter: 'course_arena',
    },
    {
      id: 'prinz7', name: 'Schubser-Prinz', speed: 0,
      trigger: { min: [-W + 0.5, Y - 0.5, ZB - W + 0.5], max: [W - 0.5, Y + 8, ZB + W - 1.5] },
      lock: { min: [-2.4, Y - 0.5, ZB + W], max: [2.4, Y + 6, ZB + W + 0.7] },
      warp: 'warp_b', warpPos: [0, Y, ZB], warpTo: [0, Y + 0.3, ZC + 6], frame: 0.45, center: [0, Y, ZB], musicAfter: 'course_keep',
    },
    {
      id: 'baron', name: 'Baron Brummbär', speed: 0,
      trigger: { min: [-6, Y - 0.5, ZC - 5], max: [6, Y + 6, ZC - 1] },
      warp: 'warp_c', warpPos: [3.5, Y, ZE + 14], warpTo: [0, Y + 0.3, -284], frame: 0.5, center: [0, Y, ZC - 70], musicAfter: 'course_grass',
    },
  ],
  segments: [
    // ---- A: Vorplatz, Steg, Lava ringsum (die Insel baut build)
    { type: 'island', pos: [0, -1, 20], size: [14, Y + 1, 8], top: 'rock', under: 0 },
    { type: 'island', pos: [0, -1, 13.6], size: [3.4, Y + 1, 5.4], top: 'rock', under: 0 },
    { type: 'lava', pos: [0, Y - 1.4, 0], size: [70, 0.6, 46] },
    { type: 'torches', h: 2.4, items: [[-6, Y, 23], [6, Y, 23]] },
    // ---- B: Festungsplattform mit Käfig und Glasröhren (wie 0-25)
    { type: 'island', pos: [0, -1, ZB - 2], size: [44, Y + 1, 44], top: 'stone', under: 3 },
    { type: 'wall', pos: [-W - 0.3, Y, ZB], size: [0.6, 3.2, 2 * W + 1.2], style: 0x5a4a6a },
    { type: 'wall', pos: [W + 0.3, Y, ZB], size: [0.6, 3.2, 2 * W + 1.2], style: 0x5a4a6a },
    { type: 'wall', pos: [0, Y, ZB - W - 0.3], size: [2 * W + 1.2, 3.2, 0.6], style: 0x5a4a6a },
    { type: 'wall', pos: [-(W + 2.4) / 2 - 0.3, Y, ZB + W + 0.3], size: [W - 1.8, 1.0, 0.6], style: 0x5a4a6a, camIgnore: true },
    { type: 'wall', pos: [(W + 2.4) / 2 + 0.3, Y, ZB + W + 0.3], size: [W - 1.8, 1.0, 0.6], style: 0x5a4a6a, camIgnore: true },
    { type: 'glasnetz', id: 'roehren7', radius: 1, nodes: NODES, pipes: PIPES, ends: ENDS },
    { type: 'torches', h: 2.2, items: [[-W - 1.6, Y, ZB + W + 1.6], [W + 1.6, Y, ZB + W + 1.6]] },
    // ---- C: Startplatz vor der Boss-Straße (die Straße ist eine Entität), Lavasee darunter, Zielplateau
    { type: 'island', pos: [0, -1, ZC + 4.5], size: [14, Y + 1, 9], top: 'rock', under: 0 },
    { type: 'lava', pos: [0, Y - 3.2, -185], size: [80, 0.6, 180] },
    { type: 'island', pos: [0, -1, -288], size: [16, Y + 1, 18], top: 'rock' },
    { type: 'killplane', y: -14 },
  ],
  enemies: [
    {
      kind: 'lavafelsen_koenig', id: 'koenig7', pos: [0, Y, -3], arena: { center: [0, Y, 0], r: RA - 1 }, variant: 'hell',
      fish: { gate: Math.PI / 2, gateHalf: 0.32, height: 3.4 }, star: { pos: [0, Y + 0.4, 6.5], index: 0 },
    },
    {
      kind: 'schubser_prinz', id: 'prinz7', color: 'blau', pos: [0, Y, ZB - 5], dir: [0, 1], arena: { min: [-W, ZB - W], max: [W, ZB + W], y: Y },
      net: 'roehren7', star: { pos: [0, Y + 0.4, ZB + 6.5], index: 1 },
    },
    { kind: 'baron_kampfwagen', id: 'baron', road: 'strasse', pos: [0, Y, ZC - 14], star: { pos: [0, Y + 0.4, ZE + 16], index: 2 } },
  ],
  items: [
    {
      kind: 'kampfwagen_strasse', id: 'strasse', from: [0, Y, ZC], length: LEN, width: 12,
      gaps: [{ at: 26, width: 3 }, { at: 64, width: 2.6 }, { at: 104, width: 3 }],
      middle: [{ from: 76, to: 98, width: 2 }],
      traps: [{ at: 8, x: -3 }, { at: 15, x: 3 }, { at: 34, x: 0 }, { at: 46, x: -3.5 }, { at: 54, x: 3.5 }, { at: 71, x: 0 },
        { at: 84, x: -3.6 }, { at: 92, x: 3.6 }, { at: 113, x: -2.5 }, { at: 124, x: 2.5 }, { at: 134, x: 0 }],
    },
    { kind: 'warpbox', id: 'warp_a', pos: [0, Y, -6], target: [0, Y + 0.3, ZB + 14], hidden: true },
    { kind: 'warpbox', id: 'warp_b', pos: [0, Y, ZB], target: [0, Y + 0.3, ZC + 6], hidden: true },
    { kind: 'warpbox', id: 'warp_c', pos: [3.5, Y, ZE + 14], target: [0, Y + 0.3, -284], hidden: true },
    { kind: 'coins', pos: [0, Y + 0.3, -287], r: 2.2, n: 8 },
  ],
  goal: [0, Y, -293],
  marks: { a: [0, Y, 0], b: [0, Y, ZB], startB: [0, Y, ZB + 14], startC: [0, Y, ZC + 6], roadStart: [0, Y, ZC], roadEnd: [0, Y, ZE], plateau: [0, Y, -284] },
  build(level) {
    buildIsland(level);
    // Prinzen-Käfig: unsichtbare Kollision über der niedrigen Vorderwand und eine Decke (kein Entkommen über die Wände)
    const W2 = W + 0.6;
    level.world.add({ type: 'box', min: [-W2, Y + 1, ZB + W], max: [-2.4, Y + 6, ZB + W2], camIgnore: true, tag: 'kaefig-vorn' });
    level.world.add({ type: 'box', min: [2.4, Y + 1, ZB + W], max: [W2, Y + 6, ZB + W2], camIgnore: true, tag: 'kaefig-vorn' });
    level.world.add({ type: 'box', min: [-W2, Y + 3.2, ZB - W2], max: [-W, Y + 6, ZB + W2], camIgnore: true, tag: 'kaefig-wand' });
    level.world.add({ type: 'box', min: [W, Y + 3.2, ZB - W2], max: [W2, Y + 6, ZB + W2], camIgnore: true, tag: 'kaefig-wand' });
    level.world.add({ type: 'box', min: [-W2, Y + 3.2, ZB - W2], max: [W2, Y + 6, ZB - W], camIgnore: true, tag: 'kaefig-wand' });
    level.world.add({ type: 'box', min: [-W2, Y + 6, ZB - W2], max: [W2, Y + 6.4, ZB + W2], camIgnore: true, tag: 'kaefig-decke' });
  },
};
