// Hilfen für die Welt-8-Level 8-Zug „Brummbär-Express im Abendrot“, 8-4 „Glimmstege der Mitternachtsfestung“ und 8-5
// „Flutverlies der Brummbär-Festung“ (kein Level: exportiert kein LEVEL, die Level-Registry überspringt dieses Modul).
// Gemeinsame Dateien werden nicht verändert; alles Level-Lokale hängt an den offiziellen Haken LEVEL.prebuild/build/setup.
//
//   Daten-Helfer     isl, line, ring, arc, column (Welt 5), stege (Leuchtsteg aus Rechtecken), plate (unsichtbare Kollision)
//   8-4 Nachtburg    burgZinnen (Zinnen-Ränder um feste Plattformen), laternen (Laternenpfähle mit Glühlicht), mond,
//                    funkelSterne, gluehwuermchen
//   8-5 Flutverlies  siehe unten
//   8-Zug            siehe unten

import * as THREE from 'three';
import { addObject } from '../../blocks/kit.js';
import { visDt } from '../../entities/gimmick.js';
import { isl, line, ring, arc, column, Bld, litTop, gradY, glowPoints, onRespawn } from '../w5/_helpers_b.js';

export { isl, line, ring, arc, column, Bld, litTop, gradY, glowPoints, onRespawn };

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// =====================================================================================================================
// Daten-Helfer
// =====================================================================================================================

/**
 * Leuchtsteg aus Rechtecken: rects = [[x0, x1, zA, zB, top?], …] (Oberseite top, Standard o.top ?? 0; Dicke o.thick 0,4).
 * Die Rechtecke dürfen sich nicht überlappen (sonst doppelte Kacheln).
 */
export function stege(id, rects, o = {}) {
  const th = o.thick ?? 0.4;
  const parts = rects.map(([x0, x1, zA, zB, top = o.top ?? 0]) => {
    const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
    return { pos: [(x0 + x1) / 2, top - th, (z0 + z1) / 2], size: [Math.abs(x1 - x0), th, z0 - z1] };
  });
  const spec = { type: 'leuchtsteg', id, parts, color: o.color ?? 'gold' };
  for (const k of ['radius', 'soft', 'hint', 'flash', 'always', 'hidden', 'oneWay']) if (o[k] !== undefined) spec[k] = o[k];
  return spec;
}

/** Unsichtbare feste Kollision (Quader) im Aufbau-Haken: [x0, x1, y0, y1, zA, zB] + Flags. */
export function plate(level, [x0, x1, y0, y1, zA, zB], o = {}) {
  const z0 = Math.min(zA, zB), z1 = Math.max(zA, zB);
  return level.world.add({ type: 'box', min: [Math.min(x0, x1), y0, z0], max: [Math.max(x0, x1), y1, z1], tag: o.tag ?? 'unsichtbar', ...o });
}

// =====================================================================================================================
// 8-4 Nachtburg
// =====================================================================================================================

export const NACHT = {
  stone: 0x3e4462, stoneHi: 0x5c6488, stoneLo: 0x23263a, mortar: 0x2a2e44, roof: 0x5a3a8a, roof2: 0x2e6a8a,
  gold: 0xffc84a, glow: 0xffd27a, banner: 0xb02a4a, banner2: 0x6a3ac0, wood: 0x4a3426,
};

/**
 * Zinnen-Rand um feste Plattformen: list = [{ x0, x1, zA, zB, y, edges: 'lrfb' }] (l = links/−X, r = rechts, f = vorn/+Z,
 * b = hinten/−Z). Niedrige Brüstung (0,5 m) mit Zinnen (Kollision 0,9 m hoch, die Kamera darf hindurch).
 */
export function burgZinnen(level, list) {
  const b = new Bld();
  for (const e of list) {
    const z0 = Math.max(e.zA, e.zB), z1 = Math.min(e.zA, e.zB), y = e.y ?? 0, t = 0.5;
    const runs = [];
    if (e.edges.includes('l')) runs.push([e.x0 + t / 2, e.x0 + t / 2, z0, z1, 'z']);
    if (e.edges.includes('r')) runs.push([e.x1 - t / 2, e.x1 - t / 2, z0, z1, 'z']);
    if (e.edges.includes('f')) runs.push([e.x0, e.x1, z0 - t / 2, z0 - t / 2, 'x']);
    if (e.edges.includes('b')) runs.push([e.x0, e.x1, z1 + t / 2, z1 + t / 2, 'x']);
    for (const [ax, bx, az, bz, dir] of runs) {
      const L = dir === 'z' ? az - bz : bx - ax;
      const cx = (ax + bx) / 2, cz = (az + bz) / 2;
      const w = dir === 'z' ? t : L, d = dir === 'z' ? L : t;
      b.box(w, 0.5, d, cx, y, cz, NACHT.stone, { r: 0.05 });
      const n = Math.max(1, Math.floor(L / 1.1));
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n;
        const px = dir === 'z' ? cx : ax + (bx - ax) * u, pz = dir === 'z' ? az + (bz - az) * u : cz;
        b.box(dir === 'z' ? t : 0.55, 0.42, dir === 'z' ? 0.55 : t, px, y + 0.5, pz, NACHT.stoneHi, { r: 0.05 });
      }
      level.world.add({ type: 'box', min: [cx - w / 2, y, cz - d / 2], max: [cx + w / 2, y + 0.9, cz + d / 2], camIgnore: true, tag: 'zinnen' });
    }
  }
  b.flush(level, { castShadow: false });
}

/** Laternenpfähle (Eisen, goldene Laterne mit warmem Licht): pts = [[x, y, z, h?], …]. */
export function laternen(level, pts, o = {}) {
  const b = new Bld(), g = new Bld();
  const glow = [];
  for (const [x, y, z, h = 2.6] of pts) {
    b.cyl(0.09, 0.12, h, x, y, z, 0x22263a, 8);
    b.cyl(0.22, 0.28, 0.18, x, y, z, 0x2e3248, 10);
    b.box(0.5, 0.06, 0.5, x, y + h, z, 0x2a2e44, { r: 0.02 });
    b.cone(0.36, 0.34, x, y + h + 0.62, z, 0x2a2e44, 8);
    g.box(0.38, 0.52, 0.38, x, y + h + 0.08, z, o.color ?? NACHT.glow, { r: 0.04 });
    glow.push([x, y + h + 0.34, z, o.size ?? 3.2]);
    if (level.view && o.light !== false) level.view.addLantern(x, y + h + 0.3, z);
  }
  b.flush(level, { castShadow: false });
  g.flush(level, { material: 'glow', castShadow: false });
  glowPoints(level, glow, { color: o.color ?? 0xffc86a, opacity: 0.8, pulse: 0.35 });
}

/** Großer Mond mit Hof (nur Optik, folgt nicht der Kamera; sehr weit hinten). */
export function mond(level, pos, r = 9) {
  if (!level.view) return;
  const g = new THREE.Group();
  g.name = 'mond';
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfff4d6, fog: false }));
  g.add(m);
  // Krater (dunklere Flecken)
  for (const [a, b2, s] of [[0.3, 0.2, 0.22], [-0.25, -0.1, 0.16], [0.05, -0.35, 0.12], [-0.4, 0.3, 0.1]]) {
    const c = new THREE.Mesh(new THREE.CircleGeometry(r * s, 16), new THREE.MeshBasicMaterial({ color: 0xe8d8b0, fog: false }));
    c.position.set(a * r, b2 * r, r * 0.99);
    g.add(c);
  }
  const halo = new THREE.Mesh(new THREE.CircleGeometry(r * 2.4, 32), new THREE.MeshBasicMaterial({ color: 0xbfd0ff, transparent: true, opacity: 0.12, fog: false, depthWrite: false }));
  halo.position.z = -0.5;
  g.add(halo);
  g.position.set(...pos);
  g.lookAt(pos[0], pos[1] - 10, pos[2] + 120);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.userData.owned = true; } });
  addObject(level, g);
}

/** Glühwürmchen: tanzende Leuchtpunkte in Kästen boxes = [[x0, x1, y0, y1, zA, zB, n]] (ein Leuchtfeld, 0 Aufrufe extra). */
export function gluehwuermchen(level, boxes, o = {}) {
  if (!level.view) return;
  const pts = [];
  let s = 7;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (const [x0, x1, y0, y1, zA, zB, n = 8] of boxes) {
    for (let i = 0; i < n; i++) pts.push({ x: x0 + (x1 - x0) * rnd(), y: y0 + (y1 - y0) * rnd(), z: zB + (zA - zB) * rnd(), p: rnd() * TAU, r: 0.4 + rnd() * 0.6 });
  }
  const g = glowPoints(level, pts.map((q) => [q.x, q.y, q.z, o.size ?? 0.9]), { color: o.color ?? 0xd8ff7a, opacity: 0.9, pulse: 1.4 });
  if (!g) return;
  const f = g.field;
  let t = 0;
  const holder = {};
  level.view.onFrame((dt) => {
    t += visDt(level, holder, dt);
    for (let i = 0; i < pts.length; i++) {
      const q = pts[i], k = (g.i0 + i) * 3;
      f.pos[k] = q.x + Math.sin(t * 0.7 + q.p) * q.r;
      f.pos[k + 1] = q.y + Math.sin(t * 1.1 + q.p * 2) * 0.35;
      f.pos[k + 2] = q.z + Math.cos(t * 0.6 + q.p) * q.r;
    }
    f.geo.attributes.position.needsUpdate = true;
  });
}
