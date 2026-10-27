// Schlossdach des Grafen (0-22): Testlevel für den Endgegner der Halloween-Welt (H-Burg) Graf Brummbär
// (tests/course_hw_enemies.mjs) mit Archetyp 'boss'. Rundes Schlossdach (Innenradius 9,6 m, Oberseite y = 2) mit Brüstung
// und Zinnen über dem Abgrund, vorn ein Steg mit Lücke in der Brüstung (Sperre während des Kampfs), dahinter der Vollmond.
// Der Graf steht hinten und blickt zur Figur; der Kampf beginnt beim Schritt vom Steg aufs Dach. Nach dem Sieg: Stern vorn,
// Warp-Box in der Mitte zum Zielplateau. Thema 'ghost' (Stimmung 'aussen': Mondnacht), Musik course_brummula.

import * as THREE from 'three';
import { colorize, lin, mixc, smooth, addStatic, addObject, merge } from '../../blocks/kit.js';
import { getModel, hasModel } from '../../models/index.js';

const Y = 2;
const R = 9.6;          // Innenradius des Dachs bis zur Brüstung
const GAP = 0.24;       // halbe Lücke der Brüstung vorn (rad, zum Steg +Z)
const TAU = Math.PI * 2;

/** Dach: Boden (Kollision Zylinder), Turmwand, Brüstung mit Zinnen (Kollision, Lücke vorn), Schiefer-Muster. */
function buildRoof(level) {
  const W = level.world;
  W.add({ type: 'cyl', x: 0, z: 0, r: R + 0.9, y0: Y - 5, y1: Y, tag: 'schlossdach' });
  // Brüstung (0,8 m) und Zinnen (1,6 m) als Zylinder rundum, außer in der Lücke vorn
  const N = Math.round((TAU * (R + 0.45)) / 0.7);
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU;
    const off = Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
    if (off < GAP + 0.03) continue;
    const merlon = i % 4 < 2;
    W.add({ type: 'cyl', x: Math.sin(a) * (R + 0.45), z: Math.cos(a) * (R + 0.45), r: 0.46, y0: Y, y1: Y + (merlon ? 1.6 : 0.8), camIgnore: true, noWallSlide: true, tag: 'zinne' });
  }
  if (!level.view) return;
  const slate = lin(0x9a8cb8), slateHi = lin(0xb4a8d0), slateDk = lin(0x7a6c98), stone = lin(0xb0a8c4), stoneDk = lin(0x6e6688), mortar = lin(0x5a5470);
  const parts = [];
  // Boden: Schieferplatten in Ringen, Mitte mit hellem Kreis (Rosette)
  const mid0 = lin(0xf0e6ff), mid1 = lin(0xcab8f0);
  const ringG = [];
  for (let r0 = 0; r0 < R + 0.9; r0 += 1.6) {
    const g = new THREE.RingGeometry(Math.max(0.01, r0), Math.min(R + 0.9, r0 + 1.6), 72, 1).toNonIndexed();
    g.rotateX(-Math.PI / 2);
    g.translate(0, Y + 0.01, 0);
    const ring = Math.round(r0 / 1.6);
    ringG.push(colorize(g, (p, n, o) => {
      const a = Math.atan2(p.x, p.z) + ring * 0.13;
      const k = Math.floor(((a / TAU) + 1) * (12 + ring * 6)) % 2;
      const rr = Math.hypot(p.x, p.z);
      mixc(k ? slate : slateHi, slateDk, ring === 0 ? 0 : 0.15 + 0.1 * Math.sin(ring * 2.3), o);
      if (ring === 0) mixc(mid0, mid1, smooth(0, 1.6, rr), o);
      if (rr - r0 < 0.06 || r0 + 1.6 - rr < 0.06) mixc(o, mortar, 0.6, o);
    }));
  }
  parts.push(...ringG);
  // Turmwand unter dem Dach (Steinquader mit Fugen)
  const wall = new THREE.CylinderGeometry(R + 0.9, R + 0.6, 5, 72, 6, true).toNonIndexed();
  wall.translate(0, Y - 2.5, 0);
  parts.push(colorize(wall, (p, n, o) => {
    const yy = Y - p.y, row = Math.floor(yy / 0.55);
    const a = Math.atan2(p.x, p.z) + (row % 2) * 0.05;
    const seam = Math.abs(((a / TAU) * 60) % 1) < 0.06 || (yy % 0.55) < 0.05;
    mixc(stone, stoneDk, smooth(0, 5, yy) * 0.7, o);
    if (seam) mixc(o, mortar, 0.7, o);
  }));
  // Brüstung (mit Lücke vorn) und Zinnen
  const prof = [[R + 0.9, Y], [R + 0.9, Y + 0.8], [R, Y + 0.8], [R, Y]].map(([r, y]) => new THREE.Vector2(r, y));
  const par = new THREE.LatheGeometry(prof, 80, GAP, TAU - 2 * GAP).toNonIndexed();
  parts.push(colorize(par, (p, n, o) => {
    const a = Math.atan2(p.x, p.z);
    const seam = Math.abs(((a / TAU) * 70) % 1) < 0.05;
    mixc(stone, stoneDk, n.y > 0.5 ? 0 : 0.35, o);
    if (seam && n.y < 0.5) mixc(o, mortar, 0.6, o);
  }));
  const NM = 28;
  for (let i = 0; i < NM; i++) {
    const a = ((i + 0.5) / NM) * TAU;
    const off = Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
    if (off < GAP + 0.12) continue;
    const g = new THREE.BoxGeometry(0.85, 0.8, 1.1, 1, 1, 1).toNonIndexed();
    g.translate(0, Y + 1.2, R + 0.45);
    g.rotateY(a);
    parts.push(colorize(g, (p, n, o) => mixc(stone, stoneDk, n.y > 0.5 ? 0 : 0.3, o)));
  }
  addStatic(level, merge(parts), { castShadow: true });
  // Kulisse: Vollmond mit Gesicht, Kürbislaternen auf der Brüstung
  if (hasModel('mond_gesicht')) {
    const m = getModel('mond_gesicht', { size: 7 });
    m.root.position.set(-9, 26, -60);
    m.root.rotation.y = -Math.PI / 2;
    addObject(level, m.root, (dt) => m.update(dt, {}));
  }
  if (hasModel('kuerbislaterne')) {
    for (const a of [0.8, 2.2, -0.8, -2.2]) {
      const m = getModel('kuerbislaterne', { mount: 'boden', size: 0.6 });
      m.root.position.set(Math.sin(a) * (R + 0.45), Y + 0.8, Math.cos(a) * (R + 0.45));
      m.root.rotation.y = a + Math.PI / 2;
      addObject(level, m.root, (dt) => m.update(dt, { lit: true }));
    }
  }
}

export const LEVEL = {
  id: '0-22',
  world: 0,
  title: 'Schlossdach des Grafen',
  archetype: 'boss',
  theme: 'ghost',
  music: 'course_brummula',
  halloween: true,
  timeLimit: 400,
  start: { pos: [0, Y, 20], yaw: Math.PI / 2 },
  checkpoint: [{ pos: [0, Y, 20], yaw: Math.PI / 2 }],
  camera: [
    { from: 28, to: -16, pitch: 50, dist: 19, x: 0, xLock: 0.3, ahead: 0.4, lead: 0.4, height: 1.8 },
    { from: -26, to: -60, pitch: 42, dist: 12.5, ahead: 2, area: [-20, 20] },
  ],
  boss: {
    id: 'graf', name: 'Graf Brummbär', speed: 0,
    trigger: { min: [-8.5, Y - 0.5, -8.5], max: [8.5, Y + 8, 8.2] },
    lock: { min: [-2.6, Y - 0.5, R + 0.1], max: [2.6, Y + 5, R + 0.9] },
    warp: 'warp_sieg', warpPos: [0, Y, -6.5], warpTo: [0, Y + 0.3, -40], frame: 0.45, musicAfter: 'course_halloween_map',
    center: [0, Y, 0],
  },
  segments: [
    // Steg zum Dach, Zielplateau
    { type: 'island', pos: [0, Y - 3, R + 6.8], size: [4.4, 3, 13], top: 'stone', under: 0 },
    { type: 'island', pos: [0, -1, -42], size: [14, Y + 1, 16], top: 'stone' },
    { type: 'killplane', y: -10 },
  ],
  enemies: [
    { kind: 'graf_brummbaer', id: 'graf', pos: [0, Y, -4], dir: [0, 1], arena: { center: [0, Y, 0], r: 9 }, star: { pos: [0, Y + 0.4, 5], index: 0 } },
  ],
  items: [
    { kind: 'warpbox', id: 'warp_sieg', pos: [0, Y, -6.5], target: [0, Y + 0.3, -40], hidden: true },
    { kind: 'coins', pos: [0, Y + 0.3, -44], r: 2.2, n: 8 },
  ],
  goal: [0, Y, -48],
  marks: { center: [0, Y, 0], start: [0, Y, 20], plateau: [0, Y, -40] },
  setup(level) {
    buildRoof(level);
    level.view?.setMood?.('aussen');
  },
};
