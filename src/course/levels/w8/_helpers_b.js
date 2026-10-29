// Hilfen für die Welt-8-Level 8-Zug „Brummbär-Express im Abendrot“, 8-4 „Glimmstege der Mitternachtsfestung“ und 8-5
// „Flutverlies der Brummbär-Festung“ (kein Level: exportiert kein LEVEL, die Level-Registry überspringt dieses Modul).
// Gemeinsame Dateien werden nicht verändert; alles Level-Lokale hängt an den offiziellen Haken LEVEL.prebuild/build/setup.
//
//   Daten-Helfer     isl, line, ring, arc, column (Welt 5), stege (Leuchtsteg aus Rechtecken), plate (unsichtbare Kollision)
//   8-4 Nachtburg    burgZinnen (Zinnen-Ränder um feste Plattformen), laternen (Laternenpfähle mit Glühlicht), teppich,
//                    feuerschalen, himmelslaternen (aufsteigende Papierlaternen), mond, gluehwuermchen
//   8-5 Flutverlies  flutMauern (Bogenmauern mit Gitterfenstern), korallen, fischSchwaerme
//   8-Zug            fahrweg, abendExpressThema (Themen-Variante), baronZug (Wagen), fahrtIllusion (vorbeiziehende
//                    Landschaft, Räder, Dampf, Startbahnhof), bahnhofOptik, hebeblock

import * as THREE from 'three';
import { addObject } from '../../blocks/kit.js';
import { MovingBox } from '../../blocks/w2kit.js';
import { visDt, runAction } from '../../entities/gimmick.js';
import { blockTemplate } from '../../entities/visuals.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { isl, line, ring, arc, column, Bld, litTop, gradY, glowPoints, glowField, onRespawn } from '../w5/_helpers_b.js';

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

/**
 * Teppich mit Goldkante und Rautenmuster auf einem Balkon: list = [[x0, x1, zA, zB, y, farbe?, muster?], …] (nur Optik,
 * ins statische Mesh verschmolzen).
 */
export function teppich(level, list) {
  const b = new Bld();
  for (const [x0, x1, zA, zB, y = 0, col = 0xb0204a, pat = 0xffc84a] of list) {
    const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB), w = x1 - x0, d = z0 - z1, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    b.box(w, 0.03, d, cx, y, cz, pat, { r: 0, seg: 0 });
    b.box(w - 0.3, 0.035, d - 0.3, cx, y + 0.002, cz, col, { r: 0, seg: 0 });
    // Rauten entlang der Mitte
    const n = Math.max(1, Math.floor((w > d ? w : d) / 1.6));
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      const px = w > d ? x0 + w * u : cx, pz = w > d ? cz : z0 - d * u;
      b.box(0.5, 0.04, 0.5, px, y + 0.004, pz, pat, { r: 0, seg: 0, yaw: Math.PI / 4 });
    }
  }
  b.flush(level, { castShadow: false });
}

/** Feuerschalen (Eisenschale auf Dreibein, Flammen im Glüh-Material + Glühen): pts = [[x, y, z, farbe?], …]. */
export function feuerschalen(level, pts) {
  const b = new Bld(), g = new Bld(), glow = [];
  for (const [x, y, z, col = 0xff8a2a] of pts) {
    for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; b.cyl(0.05, 0.06, 1.05, x + Math.cos(a) * 0.28, y, z + Math.sin(a) * 0.28, 0x2a2e44, 6, { rz: Math.cos(a) * 0.25, rx: -Math.sin(a) * 0.25 }); }
    b.cyl(0.5, 0.28, 0.32, x, y + 0.95, z, 0x3a3e58, 12);
    b.cyl(0.52, 0.5, 0.06, x, y + 1.25, z, NACHT.gold, 14);
    g.cone(0.36, 0.7, x, y + 1.22, z, col, 7);
    g.cone(0.2, 0.5, x + 0.12, y + 1.25, z - 0.08, 0xffe07a, 6);
    glow.push([x, y + 1.6, z, 3.4]);
    if (level.view) level.view.addLantern(x, y + 1.6, z);
  }
  b.flush(level, { castShadow: false });
  g.flush(level, { material: 'glow', castShadow: false });
  glowPoints(level, glow, { color: 0xff9a4a, opacity: 0.85, pulse: 1.1 });
}

/**
 * Himmelslaternen: bunte Papierlaternen steigen langsam aus dem Abgrund auf (eine Instanz-Gruppe ohne Schatten + Leuchtfeld).
 * box = [x0, x1, y0, y1, zA, zB], n Laternen; o.avoid = [[x0, x1, zA, zB], …] (dort keine – über den Wegen).
 */
export function himmelslaternen(level, box, n = 40, o = {}) {
  if (!level.view) return null;
  const [x0, x1, y0, y1, zA, zB] = box;
  const zMax = Math.max(zA, zB), zMin = Math.min(zA, zB);
  let s = o.seed ?? 11;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const COLS = o.colors ?? [0xff6a8a, 0xffb84a, 0x8ae0ff, 0xc08aff, 0x9aff8a, 0xffe06a];
  const L = [];
  for (let tries = 0; L.length < n && tries < n * 40; tries++) {
    const x = x0 + (x1 - x0) * rnd(), z = zMin + (zMax - zMin) * rnd();
    if ((o.avoid ?? []).some(([a0, a1, b0, b1]) => x > Math.min(a0, a1) - 2.5 && x < Math.max(a0, a1) + 2.5 && z > Math.min(b0, b1) - 2.5 && z < Math.max(b0, b1) + 2.5)) continue;
    L.push({ x, z, y: y0 + (y1 - y0) * rnd(), v: 0.35 + rnd() * 0.35, p: rnd() * TAU, c: COLS[L.length % COLS.length], s: (o.size ?? 1.3) * (0.8 + rnd() * 0.5) });
  }
  const geo = new THREE.CylinderGeometry(0.26, 0.2, 0.5, 8);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: true });
  const mesh = new THREE.InstancedMesh(geo, mat, L.length);
  mesh.name = 'himmelslaternen';
  mesh.castShadow = false; mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  const col = new THREE.Color();
  L.forEach((q, i) => mesh.setColorAt(i, col.set(q.c)));
  const g = glowPoints(level, L.map((q) => [q.x, q.y, q.z, 2.4 * q.s]), { color: 0xffc88a, opacity: 0.6, pulse: 0.8 });
  const m4 = new THREE.Matrix4(), qt = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
  const holder = {};
  let t = 0;
  const update = (dt) => {
    t += visDt(level, holder, dt);
    for (let i = 0; i < L.length; i++) {
      const q = L[i];
      const h = y1 - y0, y = y0 + ((q.y - y0 + t * q.v) % h + h) % h;
      const x = q.x + Math.sin(t * 0.3 + q.p) * 0.8, z = q.z + Math.cos(t * 0.25 + q.p) * 0.6;
      const fade = Math.min(1, (y - y0) / 2, (y1 - y) / 2);
      ps.set(x, y, z); sc.setScalar(q.s * Math.max(0.01, fade));
      m4.compose(ps, qt, sc);
      mesh.setMatrixAt(i, m4);
      if (g) { const k = (g.i0 + i) * 3; g.field.pos[k] = x; g.field.pos[k + 1] = fade > 0.05 ? y : -999; g.field.pos[k + 2] = z; }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (g) g.field.geo.attributes.position.needsUpdate = true;
  };
  update(0);
  addObject(level, mesh, update);
  return mesh;
}

// =====================================================================================================================
// 8-5 Flutverlies
// =====================================================================================================================

export const FLUT = {
  stone: 0x5a8a94, stoneHi: 0x86b8c0, stoneLo: 0x2e5058, mortar: 0x3a6068, moss: 0x4aa88a, mossHi: 0x7ad8b0,
  gold: 0xffc84a, glow: 0x7af0ff, grate: 0x2a3a44, coral: [0xff7a9a, 0xffa84a, 0xc07aff, 0xffe06a, 0x6ae0d0],
};

/**
 * Festungsmauern mit Bogenblenden, Moosrand und glimmenden Gitterfenstern (Optik + Kollision, die Kamera darf hindurch):
 * list = [{ x0, x1, zA, zB, y0, y1, arches: 'x' | 'z' | null (Bögen auf der Seite zum Weg), side: +1 | −1 (Wegseite),
 * windows: true }].
 */
export function flutMauern(level, list) {
  const b = new Bld(), g = new Bld();
  for (const m of list) {
    const z0 = Math.max(m.zA, m.zB), z1 = Math.min(m.zA, m.zB), w = m.x1 - m.x0, d = z0 - z1, h = m.y1 - m.y0;
    const cx = (m.x0 + m.x1) / 2, cz = (z0 + z1) / 2;
    b.box(w, h, d, cx, m.y0, cz, litTop(FLUT.stone, 0.62), { r: 0.08 });
    // Mauerkrone: heller Deckstein mit Goldband, darauf Moospolster, Korallen und Seesterne (statt einer Moosplatte)
    b.box(w + 0.12, 0.28, d + 0.12, cx, m.y1 - 0.2, cz, litTop(FLUT.stoneHi, 0.66), { r: 0.1 });
    b.box(w + 0.16, 0.07, d + 0.16, cx, m.y1 - 0.26, cz, FLUT.gold, { r: 0.02 });
    {
      const along = Math.max(w, d), nn = Math.max(1, Math.floor(along / 2.1)), alongX = w >= d;
      for (let i = 0; i < nn; i++) {
        const u = (i + 0.5) / nn, side = i % 2 ? 0.28 : -0.28;
        const px = alongX ? m.x0 + w * u : cx + side * Math.min(w, 1.2), pz = alongX ? cz + side * Math.min(d, 1.2) : z0 - d * u;
        b.sphere(0.42 + (i % 3) * 0.08, px, m.y1 + 0.06, pz, i % 3 ? FLUT.moss : FLUT.mossHi, { s: [1.25, 0.32, 1.0], ws: 7, hs: 4 });
        if (i % 3 === 1) { b.cyl(0.05, 0.08, 0.36, px + 0.3, m.y1, pz - 0.2, FLUT.coral[i % 5], 5); b.sphere(0.12, px + 0.3, m.y1 + 0.38, pz - 0.2, FLUT.coral[i % 5], { ws: 6, hs: 4 }); }
        if (i % 4 === 2) b.cone(0.2, 0.06, px - 0.3, m.y1 + 0.08, pz + 0.25, FLUT.coral[(i + 2) % 5], 5);
      }
    }
    level.world.add({ type: 'box', min: [m.x0, m.y0, z1], max: [m.x1, m.y1, z0], camIgnore: m.camIgnore ?? true, tag: 'flutmauer', ...(m.climbable ? { climbable: true } : {}) });
    if (!m.arches) continue;
    const along = m.arches === 'z' ? d : w;
    const n = Math.max(1, Math.floor(along / 4));
    const face = m.arches === 'z' ? (m.side > 0 ? m.x1 : m.x0) : (m.side > 0 ? z0 : z1);
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      const ax = m.arches === 'z' ? face + 0.06 * (m.side ?? 1) : m.x0 + w * u, az = m.arches === 'z' ? z0 - d * u : face + 0.06 * (m.side ?? 1);
      const aw = Math.min(3, along / n - 0.8), ah = Math.min(h - 1, 4.2);
      // Bogenblende: dunkle Nische mit Rundbogen, helle Laibung
      const sx = m.arches === 'z' ? 0.14 : aw, sz = m.arches === 'z' ? aw : 0.14;
      b.box(sx, ah - aw / 2, sz, ax, m.y0 + 0.2, az, FLUT.stoneLo, { r: 0.02, seg: 0 });
      b.cyl(aw / 2, aw / 2, 0.14, ax, m.y0 + 0.2 + ah - aw / 2, az, FLUT.stoneLo, 14, { rx: m.arches === 'z' ? 0 : Math.PI / 2, rz: m.arches === 'z' ? Math.PI / 2 : 0 });
      if (m.windows !== false && i % 2 === 0) {
        // Gitterfenster im Bogen (glimmt türkis)
        g.box(m.arches === 'z' ? 0.16 : aw * 0.5, 1.1, m.arches === 'z' ? aw * 0.5 : 0.16, ax, m.y0 + 0.2 + ah - aw / 2 - 0.8, az, FLUT.glow, { r: 0, seg: 0 });
        for (let k = -1; k <= 1; k++) {
          const ox = m.arches === 'z' ? 0 : k * aw * 0.16, oz = m.arches === 'z' ? k * aw * 0.16 : 0;
          b.box(m.arches === 'z' ? 0.2 : 0.06, 1.2, m.arches === 'z' ? 0.06 : 0.2, ax + ox, m.y0 + 0.2 + ah - aw / 2 - 0.85, az + oz, FLUT.grate, { r: 0, seg: 0 });
        }
      }
    }
  }
  b.flush(level, { castShadow: true });
  g.flush(level, { material: 'glow', castShadow: false });
}

/** Korallen und Seeanemonen (bunt, verschmolzen): pts = [[x, y, z, größe?], …]. */
export function korallen(level, pts) {
  const b = new Bld();
  pts.forEach(([x, y, z, s = 1], i) => {
    const c = FLUT.coral[i % FLUT.coral.length];
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU + i, r = 0.25 * s;
      b.cyl(0.07 * s, 0.11 * s, (0.6 + (k % 2) * 0.35) * s, x + Math.cos(a) * r, y, z + Math.sin(a) * r, c, 6, { rz: Math.cos(a) * 0.35, rx: -Math.sin(a) * 0.35 });
      b.sphere(0.12 * s, x + Math.cos(a) * r * 2, y + (0.62 + (k % 2) * 0.35) * s, z + Math.sin(a) * r * 2, c);
    }
    b.sphere(0.22 * s, x, y + 0.12 * s, z, 0xffffff, { s: [1, 0.6, 1] });
  });
  b.flush(level, { castShadow: false });
}

/**
 * Bunte Fischschwärme (harmlose Zier, eine Instanz-Gruppe): schools = [{ c: [x, y, z], r, n, h, speed }]. Kreisen um ihre
 * Mitte und wippen; Fische zeigen in Schwimmrichtung.
 */
export function fischSchwaerme(level, schools) {
  if (!level.view) return null;
  const fish = [];
  let s = 5;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const COLS = [0xff8a3a, 0xffd23a, 0x3ad0ff, 0xff6aa8, 0x9aff6a];
  schools.forEach((sc, si) => { for (let i = 0; i < (sc.n ?? 8); i++) fish.push({ sc, a: rnd() * TAU, r: (sc.r ?? 2) * (0.6 + rnd() * 0.5), y: (rnd() - 0.5) * (sc.h ?? 1.2), c: COLS[(si + i) % COLS.length], w: (sc.speed ?? 0.5) * (0.8 + rnd() * 0.4) }); });
  // Fisch: Körper (gestreckte Kugel) + Schwanzflosse (Kegel), Blick nach +X
  const body = new THREE.SphereGeometry(0.22, 8, 6); body.scale(1.5, 0.9, 0.6);
  const tail = new THREE.ConeGeometry(0.16, 0.28, 4); tail.rotateZ(Math.PI / 2); tail.translate(-0.42, 0, 0);
  const geo = new THREE.BufferGeometry();
  const merged = [body.toNonIndexed(), tail.toNonIndexed()];
  const pos = [], nor = [];
  for (const g of merged) { pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.1 }), fish.length);
  mesh.name = 'fische';
  mesh.castShadow = false; mesh.receiveShadow = false; mesh.frustumCulled = false;
  const col = new THREE.Color();
  fish.forEach((f, i) => mesh.setColorAt(i, col.set(f.c)));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  const holder = {};
  let t = 0;
  const update = (dt) => {
    t += visDt(level, holder, dt);
    fish.forEach((f, i) => {
      const a = f.a + t * f.w, [cx, cy, cz] = f.sc.c;
      p.set(cx + Math.cos(a) * f.r, cy + f.y + Math.sin(t * 1.3 + f.a) * 0.15, cz + Math.sin(a) * f.r);
      e.set(0, -a - Math.PI / 2 + Math.sin(t * 9 + i) * 0.15, 0);
      q.setFromEuler(e);
      m4.compose(p, q, one);
      mesh.setMatrixAt(i, m4);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  update(0);
  addObject(level, mesh, update);
  return mesh;
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

// =====================================================================================================================
// 8-Zug Baron-Express (Fahrt-Illusion)
// =====================================================================================================================
//
// Entscheidung (wie die Laufband-Illusion der Bossstraße, Präzisierung Arena/Boss): Der Zug steht in Weltkoordinaten still,
// die Landschaft zieht vorbei – Gleisbett, Viadukt, Talboden, Laternen, Bäume, Fahnen und der Startbahnhof laufen mit dem
// Fahrweg S(t) nach +Z (Uhr = Fahrt-Uhr des Bildfensters, level.scroll.clock: deterministisch, Neustarts setzen sie mit dem
// Fenster zurück). So bleiben Wasserbecken, Hebeblock und Gegner auf festem Boden, und Springen auf dem Zug fühlt sich an wie
// auf dem Boden – das Bildfenster gleitet über die Wagen nach vorn.

// Farben wie der Baron-Express auf der Weltkarte (map/decor_w8.js baronStation): violette Wagen mit Goldkante, rote Lok mit
// Goldringen, Bärengesicht, Monokel und Zylinder-Schornstein.
export const ZUGF = {
  body: 0x7e2a6e, bodyHi: 0x9a4a8a, bodyDk: 0x4a1640, trim: 0xffc83a, frame: 0x2a2232, roof: 0x6e2a5e, roofHi: 0x8e3a76,
  wood: 0xc88e52, woodDk: 0x8a5a30, glow: 0xffd27a, steel: 0x7a7e92, tank: 0x2a7ab8, tankHi: 0x5ab4e8, black: 0x1e1a26,
  cream: 0xfff0d0, lok: 0xc4304e, lokDk: 0x8a1a2a, bear: 0x8a5a34, snout: 0xe2b585,
};

/** Geometrie-Sammler mit seitlichem Versatz ox (zweiter Zug auf einem Parallelgleis). */
class XBld extends Bld {
  constructor(ox = 0) { super(); this.ox = ox; }
  box(w, h, d, x, ...r) { return super.box(w, h, d, x + this.ox, ...r); }
  cyl(a, c, h, x, ...r) { return super.cyl(a, c, h, x + this.ox, ...r); }
  sphere(q, x, ...r) { return super.sphere(q, x + this.ox, ...r); }
  cone(q, h, x, ...r) { return super.cone(q, h, x + this.ox, ...r); }
  torus(R, t, x, ...r) { return super.torus(R, t, x + this.ox, ...r); }
}

/** Fahrweg S(t) [m] und Tempo v(t) des Zugs: Anfahren in ramp s auf vt m/s, danach gleichmäßig. */
export function fahrweg(vt = 9, ramp = 3) {
  const a = vt / ramp;
  return {
    vt,
    S: (t) => (t <= 0 ? 0 : t < ramp ? 0.5 * a * t * t : vt * (t - ramp / 2)),
    v: (t) => (t <= 0 ? 0 : t < ramp ? a * t : vt),
  };
}

/** Uhr der Fahrt (s seit Abfahrt; vor der Abfahrt 0). */
const fahrUhr = (level) => (level.scroll && level.scroll.state !== 'wait' ? level.scroll.clock : 0);

/**
 * Lokale Themen-Variante (LEVEL.prebuild): Thema `train` im Abendrot über dem Rummelreich des Barons – violett-orangefarbener
 * Himmel, ferne Hügel, der große Turm am Horizont, ein Riesenrad, erste Sterne. Nur weit entfernte Kulisse (die naheliegende
 * Landschaft fährt mit der Fahrt-Illusion vorbei).
 */
export function abendExpressThema(level) {
  const v = level.view;
  if (!v) return null;
  const base = v.theme;
  const th = {
    ...base,
    label: 'Abendfahrt im Rummelreich',
    sky: [[1, 0x1a1248], [0.5, 0x3a2068], [0.2, 0x8a3a7a], [0.07, 0xf0806a], [0, 0xffb07a], [-0.15, 0x9a4a6a], [-1, 0x24123a]],
    background: 0x6a3a64,
    fog: { color: 0x7a4068, near: 70, far: 230 },
    hemi: { sky: 0xffd0e0, ground: 0x5a3a6a, intensity: 1.25 },
    sun: { color: 0xffbe8a, intensity: 2.2, dir: [-0.55, 0.45, 0.7] },
    ground: null,
    clouds: false,
    grassTop: 0x6ab85a, grassTop2: 0x5aa84e, grassRim: 0x9ad88a, grassSide: 0x6a4a5a,
    stone: 0xd8c0d0, stoneDark: 0x8a6a8a, wood: 0xc88e52, woodDark: 0x8a5a30,
    water: 0x4ab8ff, waterDeep: 0x1a6ab8,
    buildBackdrop(sky, bounds) { sky.express = expressHorizont(sky, bounds); },
    updateBackdrop(sky, dt) { const e = sky.express; if (e?.rad) e.rad.rotation.z += dt * 0.08; },
  };
  const k = v.toyLight;
  v.theme = th;
  if (v.three.background?.isColor) v.three.background.set(th.background);
  if (v.three.fog) { v.three.fog.color.set(th.fog.color); v.three.fog.near = th.fog.near; v.three.fog.far = th.fog.far; }
  if (v.hemi) { v.hemi.color.set(th.hemi.sky); v.hemi.groundColor.set(th.hemi.ground); v.hemi.intensity = th.hemi.intensity * (k?.hemi ?? 1); }
  if (v.sun) { v.sun.color.set(th.sun.color); v.sun.intensity = th.sun.intensity * (k?.sun ?? 1); }
  v.sunDir?.set(...th.sun.dir).normalize();
  const sky = v.sky;
  if (sky) {
    sky.theme = th;
    if (sky.domeGroup) sky.group.remove(sky.domeGroup);
    sky.buildDome();
  }
  return th;
}

/** Ferne Kulisse: Hügelketten weit seitlich/hinten, großer Baron-Turm vorn am Horizont, Riesenrad, Lichterpunkte. */
function expressHorizont(sky, bounds) {
  const b = new Bld();
  const cz = (bounds.min.z + bounds.max.z) / 2;
  let s = 3;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  // Hügel weit draußen (≥ 220 m): dunkles Violett mit Abendlicht oben
  for (const side of [-1, 1]) for (let i = 0; i < 9; i++) {
    const r = 40 + rnd() * 35, z = cz + 260 - i * 80 - rnd() * 30;
    b.sphere(1, side * (230 + rnd() * 80), -40, z, gradY(0x2a1a3e, 0x8a4a7a, -40, 30), { s: [r, 30 + rnd() * 30, r * 0.8] });
  }
  for (let i = 0; i < 12; i++) { const r = 50 + rnd() * 40; b.sphere(1, -500 + i * 90 + rnd() * 20, -40, cz - 480 - rnd() * 60, gradY(0x3a224a, 0xa05a80, -40, 40), { s: [r, 40 + rnd() * 30, r * 0.7] }); }
  // der große Baron-Turm weit vorn
  const tz = cz - 420, tx = 60;
  b.cyl(14, 18, 130, tx, -40, tz, gradY(0x3a1430, 0x9a3a6a, -40, 90), 14);
  for (let k = 1; k <= 4; k++) b.cyl(15.5, 15.5, 2.4, tx, -40 + k * 26, tz, 0xc85a8a, 14);
  b.cone(18, 40, tx, 90, tz, 0x5a2a5a, 14);
  const g = b.geometry();
  if (g) {
    const mesh = new THREE.Mesh(sky.track(g), sky.track(new THREE.MeshBasicMaterial({ vertexColors: true, fog: true })));
    mesh.matrixAutoUpdate = false; mesh.updateMatrix();
    sky.group.add(mesh);
  }
  // Riesenrad-Silhouette mit Glühbirnen (dreht sich langsam)
  const rad = new THREE.Group();
  const dark = sky.track(new THREE.MeshBasicMaterial({ color: 0x3a1e46, fog: true }));
  // Reif und Speichen in einem Mesh (ein Zeichenaufruf)
  const parts = [new THREE.TorusGeometry(26, 0.9, 6, 48)];
  for (let i = 0; i < 8; i++) parts.push(new THREE.BoxGeometry(52, 0.6, 0.6).rotateZ((i / 8) * Math.PI));
  rad.add(new THREE.Mesh(sky.track(mergeGeometries(parts.map((q) => q.toNonIndexed()), false)), dark));
  const bulbs = new THREE.InstancedMesh(sky.track(new THREE.SphereGeometry(1.1, 6, 4)), sky.track(new THREE.MeshBasicMaterial({ color: 0xffe08a, fog: false })), 32);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 32; i++) { const a = (i / 32) * TAU; m4.makeTranslation(Math.cos(a) * 26, Math.sin(a) * 26, 0.8); bulbs.setMatrixAt(i, m4); }
  rad.add(bulbs);
  rad.position.set(-150, 10, cz - 330);
  sky.group.add(rad);
  return { rad };
}

// ------------------------------------------------------------------ Wagen

/**
 * Baron-Express aus festen Wagen (Optik verschmolzen, Kollision je Teil, Kamera darf hindurch). cars = [{ id, kind, z0, z1, w,
 * … }] (z0 hinten > z1 vorn). kind: 'aussicht' (Schlusswagen mit Balkon, Dach 3,75), 'flach' (Holzdeck 1,4; bord: Bordwände),
 * 'kasten' (Güterwagen, Dach 3,75), 'tank' (offenes Wasserbecken, Rand 3,4; das Wasser legt das Level als Baustein water an),
 * 'salon' (Doppelstock-Salon mit Innenraum: Boden 1,4, Decke 6,0, Dach 6,2; Türen hinten/vorn; Luke hole: [x, z, a] mit
 * Glaskuppel), 'gepaeck' (Gepäckwagen mit Innengang: Boden 1,4, Dach 3,8, Dachluke luke: [x, z, a]), 'tender' (Kohle 3,0),
 * 'lok' (Kessel mit Brummbär-Gesicht, Führerhaus-Dach 3,96). Dach und Rückwand von Salon und Gepäckwagen blenden aus, solange
 * die Figur darin ist (Ausschnitt). Rückgabe { wheels: [[x, y, z, r?]], faders: [{ id, box, k }] }.
 */
export function baronZug(level, cars, opt = {}) {
  const OX = opt.x ?? 0;
  const b = new XBld(OX), g = new XBld(OX), fade = new Map();
  const add = (x0, x1, y0, y1, zA, zB, o = {}) => {
    const z0 = Math.min(zA, zB), z1 = Math.max(zA, zB);
    level.world.add({ type: 'box', min: [x0 + OX, y0, z0], max: [x1 + OX, y1, z1], camIgnore: true, tag: o.tag ?? 'zug', ...(o.flags ?? {}) });
  };
  const wheels = [];
  const fb = (id) => { if (!fade.has(id)) fade.set(id, new XBld(OX)); return fade.get(id); };
  const faders = [];
  const emblem = (bb, x, y, z, side) => {
    // Brummbär-Wappen: Goldscheibe mit Bärenkopf (zur Seite side = ±1)
    bb.cyl(0.46, 0.46, 0.06, x + side * 0.03, y, z, ZUGF.trim, 16, { rz: Math.PI / 2 });
    bb.sphere(0.28, x + side * 0.08, y + 0.02, z, 0x7a4a2a, { s: [0.5, 1, 1] });
    for (const dz of [-0.2, 0.2]) bb.sphere(0.1, x + side * 0.08, y + 0.24, z + dz, 0x7a4a2a, { s: [0.5, 1, 1] });
    bb.sphere(0.09, x + side * 0.16, y - 0.06, z, 0xe8c8a0, { s: [0.6, 0.8, 1] });
  };
  for (const c of cars) {
    const w = c.w ?? 3.4, hw = w / 2, z0 = c.z0, z1 = c.z1, L = z0 - z1, cz = (z0 + z1) / 2;
    // Fahrgestell, Drehgestelle, Räder, Puffer
    b.box(w - 0.3, 0.42, L - 0.4, 0, 0.58, cz, ZUGF.frame, { r: 0.06 });
    if (c.kind !== 'lok') {
      for (const bz of [z0 - 1.7, z1 + 1.7]) {
        b.box(1.9, 0.3, 2.0, 0, 0.32, bz, ZUGF.black, { r: 0.05 });
        for (const az of [bz - 0.62, bz + 0.62]) for (const sx of [-1, 1]) wheels.push([OX + sx * 0.86, 0.42, az]);
      }
    }
    for (const sz of [-1, 1]) {
      const ez = sz > 0 ? z0 + 0.12 : z1 - 0.12;
      for (const sx of [-0.8, 0.8]) b.cyl(0.16, 0.16, 0.3, sx, 0.66, ez, ZUGF.trim, 10, { rx: Math.PI / 2 });
    }
    const kind = c.kind;
    if (kind === 'flach' || kind === 'aussicht' || kind === 'tank' || kind === 'tender') {
      // Holzdeck mit Goldkante
      b.box(w, 0.4, L, 0, 1.0, cz, ZUGF.woodDk, { r: 0.05 });
      b.box(w - 0.16, 0.04, L - 0.16, 0, 1.38, cz, ZUGF.wood, { r: 0, seg: 0 });
      for (let i = 1; i < Math.floor(w / 0.42); i++) b.box(0.03, 0.02, L - 0.2, -hw + i * 0.42, 1.41, cz, ZUGF.woodDk, { r: 0, seg: 0 });
      for (const sx of [-1, 1]) b.box(0.1, 0.12, L, sx * (hw - 0.05), 1.32, cz, ZUGF.trim, { r: 0.02 });
      add(-hw, hw, 1.0, 1.4, z0, z1);
    }
    if (kind === 'flach' && c.bord) {
      // Bordwände (Höhe bord; ab 0,8 m als Gitter mit Goldholm – Gitterwagen)
      const bh = typeof c.bord === 'number' ? c.bord : 0.5;
      for (const sx of [-1, 1]) {
        const xm = sx * (hw - 0.07);
        add(sx > 0 ? hw - 0.14 : -hw, sx > 0 ? hw : -hw + 0.14, 1.4, 1.4 + bh, z0 - 0.2, z1 + 0.2);
        if (bh < 0.8) { b.box(0.14, bh, L - 0.4, xm, 1.4, cz, ZUGF.body, { r: 0.04 }); continue; }
        b.box(0.16, 0.14, L - 0.4, xm, 1.4 + bh - 0.14, cz, ZUGF.trim, { r: 0.04 });
        b.box(0.14, 0.22, L - 0.4, xm, 1.4, cz, ZUGF.body, { r: 0.03 });
        for (let i = 0; i <= Math.floor((L - 0.6) / 0.5); i++) b.box(0.07, bh - 0.3, 0.07, xm, 1.56, z0 - 0.3 - i * 0.5, i % 4 === 0 ? ZUGF.bodyDk : ZUGF.bodyHi, { r: 0, seg: 0 });
      }
    }
    if (kind === 'kasten' || kind === 'aussicht') {
      const zb0 = kind === 'aussicht' ? z0 - 2.2 : z0;
      const Lb = zb0 - z1, czb = (zb0 + z1) / 2;
      if (kind === 'kasten') add(-hw, hw, 1.0, 3.75, z0, z1);
      else add(-hw, hw, 1.4, 3.75, zb0, z1);
      // unten fest, oben (Wand ab 2,45, Goldband, Dach, Laufsteg) blendet aus, wenn der Wagen die Figur verdeckt
      const F = fb(c.id);
      b.box(w, 1.1, Lb, 0, 1.4, czb, ZUGF.body, { r: 0.1 });
      F.box(w, 1.2, Lb, 0, 2.45, czb, ZUGF.body, { r: 0.1 });
      F.box(w + 0.04, 0.16, Lb + 0.02, 0, 2.5, czb, ZUGF.trim, { r: 0.04 });
      F.box(w + 0.2, 0.18, Lb + 0.2, 0, 3.58, czb, ZUGF.roof, { r: 0.09 });
      F.box(w - 0.4, 0.05, Lb - 0.4, 0, 3.74, czb, ZUGF.roofHi, { r: 0.03 });
      // Laufsteg aus Holzplanken mit Goldnieten (zeigt den Weg übers Dach)
      F.box(1.1, 0.04, Lb - 0.7, 0, 3.78, czb, ZUGF.wood, { r: 0, seg: 0 });
      for (let k = 1; k < Math.floor((Lb - 0.7) / 0.6); k++) F.box(1.1, 0.012, 0.04, 0, 3.82, zb0 - 0.35 - k * 0.6, ZUGF.woodDk, { r: 0, seg: 0 });
      for (const sx of [-0.62, 0.62]) F.box(0.06, 0.05, Lb - 0.7, sx, 3.78, czb, ZUGF.trim, { r: 0, seg: 0 });
      faders.push({ id: c.id, occ: { x0: OX - hw - 0.1, x1: OX + hw + 0.1, y0: 2.45, y1: 3.9, z0: z1, z1: zb0 } });
      // Fenster (leuchten) und Wappen
      const n = Math.max(1, Math.floor(Lb / 2.2));
      for (let i = 0; i < n; i++) {
        const z = zb0 - (i + 0.5) * (Lb / n);
        for (const sx of [-1, 1]) {
          if (i === Math.floor(n / 2)) emblem(b, sx * (hw + 0.01), 2.0, z, sx);
          else g.box(0.06, 0.62, 1.0, sx * (hw + 0.01), 1.68, z, ZUGF.glow, { r: 0, seg: 0 });
        }
      }
      if (kind === 'aussicht') {
        // Balkon hinten mit Geländer (links und hinten; rechts offen zum Bahnsteig)
        for (const [x0, x1, za, zb] of [[-hw, -hw + 0.12, z0, zb0], [-hw, hw - 1.2, z0, z0 - 0.12]]) {
          b.box(x1 - x0, 0.08, za - zb, (x0 + x1) / 2, 2.3, (za + zb) / 2, ZUGF.trim, { r: 0.02 });
          add(x0, x1, 1.4, 2.4, za, zb);
        }
        for (let i = 0; i < 7; i++) b.cyl(0.04, 0.04, 0.9, -hw + 0.06, 1.4, z0 - 0.15 - i * 0.32, ZUGF.trim, 6);
        for (let i = 0; i < 6; i++) b.cyl(0.04, 0.04, 0.9, -hw + 0.2 + i * 0.36, 1.4, z0 - 0.06, ZUGF.trim, 6);
        g.sphere(0.2, hw - 0.3, 2.5, z0 - 0.1, 0xff5a4a);
      }
    }
    if (kind === 'tank') {
      // offenes Becken: Wände 0,3 dick bis 3,4 (Wasser 1,4 … 3,1 legt das Level als Baustein water an)
      // unten fest, ab 2,4 m blendet die Beckenwand aus, wenn sie die Figur verdeckt
      const t = 0.3, top = 3.4, F = fb(c.id);
      for (const [x0, x1, za, zb] of [[-hw, -hw + t, z0, z1], [hw - t, hw, z0, z1], [-hw + t, hw - t, z0, z0 - t], [-hw + t, hw - t, z1 + t, z1]]) {
        b.box(x1 - x0, 1.0, za - zb, (x0 + x1) / 2, 1.4, (za + zb) / 2, ZUGF.tank, { r: 0.05 });
        F.box(x1 - x0, top - 2.4, za - zb, (x0 + x1) / 2, 2.4, (za + zb) / 2, ZUGF.tank, { r: 0.05 });
        F.box(x1 - x0 + 0.06, 0.1, za - zb + 0.06, (x0 + x1) / 2, top - 0.05, (za + zb) / 2, ZUGF.trim, { r: 0.03 });
        add(x0, x1, 1.4, top, za, zb);
      }
      for (let i = 1; i < Math.floor(L / 3); i++) for (const sx of [-1, 1]) { b.box(0.05, 0.95, 0.16, sx * (hw + 0.01), 1.45, z0 - i * 3, ZUGF.tankHi, { r: 0, seg: 0 }); F.box(0.05, top - 2.5, 0.16, sx * (hw + 0.01), 2.4, z0 - i * 3, ZUGF.tankHi, { r: 0, seg: 0 }); }
      for (const sx of [-1, 1]) emblem(F, sx * (hw + 0.01), 2.75, cz, sx);
      faders.push({ id: c.id, insideVis: 0.4, box: { x0: OX - hw + 0.25, x1: OX + hw - 0.25, y0: 1.2, y1: top + 0.3, z0: z1 + 0.25, z1: z0 - 0.25 },
        occ: { x0: OX - hw - 0.1, x1: OX + hw + 0.1, y0: 2.4, y1: top + 0.1, z0: z1, z1: z0 } });
    }
    if (kind === 'salon') {
      // Doppelstock-Salon: Wände (0,2) bis 6,0, Dach 6,0 … 6,2 mit Luke; Türen hinten/vorn (x ±D, bis 4,0)
      const t = 0.2, top = 6.0, D = c.door ?? 1.0, DH = 4.0;
      add(-hw, hw, 1.0, 1.4, z0, z1);
      b.box(w, 0.4, L, 0, 1.0, cz, ZUGF.woodDk, { r: 0.05 });
      b.box(w - 0.4, 0.03, L - 0.4, 0, 1.39, cz, 0x6a2a3a, { r: 0, seg: 0 });
      for (let i = 0; i < L / 2.5; i++) b.box(0.8, 0.035, 0.8, 0, 1.4, z0 - 1.25 - i * 2.5, ZUGF.trim, { r: 0, seg: 0, yaw: Math.PI / 4 });
      const F = fb(c.id);
      for (const sx of [-1, 1]) {
        const x0 = sx > 0 ? hw - t : -hw, x1 = sx > 0 ? hw : -hw + t;
        add(x0, x1, 1.4, top, z0, z1, { flags: { noWallSlide: true } });
        b.box(t, 1.2, L, (x0 + x1) / 2, 1.4, cz, ZUGF.body, { r: 0.04 });
        b.box(t + 0.04, 0.14, L, (x0 + x1) / 2, 2.6, cz, ZUGF.trim, { r: 0.02 });
        F.box(t, top - 2.74, L, (x0 + x1) / 2, 2.74, cz, ZUGF.body, { r: 0.04 });
        for (let i = 0; i < Math.floor(L / 2.4); i++) {
          const z = z0 - 1.2 - i * 2.4;
          if (i % 3 === 1) emblem(F, (x0 + x1) / 2 + sx * 0.11, 4.6, z, sx); else F.box(0.06, 1.1, 1.2, sx * (hw + 0.01), 3.2, z, ZUGF.glow, { r: 0, seg: 0 });
          F.box(0.06, 0.9, 1.0, sx * (hw + 0.01), 4.6, z, 0xffe8b0, { r: 0, seg: 0 });
        }
      }
      // Stirnwände mit Tür (die hintere blendet aus)
      for (const [ez, rear] of [[z0, true], [z1, false]]) {
        const ze = rear ? ez - t / 2 : ez + t / 2;
        const B = F;
        for (const sx of [-1, 1]) { const x0 = sx > 0 ? D : -hw, x1 = sx > 0 ? hw : -D; add(x0, x1, 1.4, top, ze + t / 2, ze - t / 2); B.box(x1 - x0, top - 1.4, t, (x0 + x1) / 2, 1.4, ze, ZUGF.bodyDk, { r: 0.03 }); }
        add(-D, D, DH, top, ze + t / 2, ze - t / 2);
        B.box(2 * D, top - DH, t, 0, DH, ze, ZUGF.bodyDk, { r: 0.03 });
        b.box(2 * D + 0.3, 0.16, t + 0.06, 0, DH - 0.08, ze, ZUGF.trim, { r: 0.03 });
      }
      // Decke/Dach mit Luke (hole: [x, z, a]) – blendet aus; Glaskuppel über der Luke (Optik im Level)
      const [hx, hz, ha] = c.hole ?? [0, cz, 1.6];
      const roofRects = [[-hw, hw, z0, hz + ha / 2], [-hw, hw, hz - ha / 2, z1], [-hw, hx - ha / 2, hz + ha / 2, hz - ha / 2], [hx + ha / 2, hw, hz + ha / 2, hz - ha / 2]];
      for (const [x0, x1, za, zb] of roofRects) {
        if (x1 - x0 < 0.01 || za - zb < 0.01) continue;
        add(x0, x1, top, top + 0.2, za, zb);
        F.box(x1 - x0, 0.2, za - zb, (x0 + x1) / 2, top, (za + zb) / 2, ZUGF.roof, { r: 0.03 });
      }
      const K = ha / 2 + 0.5, KH = 2.2;
      for (const [x0, x1, za, zb] of [[hx - K - 0.12, hx - K, hz + K + 0.12, hz - K - 0.12], [hx + K, hx + K + 0.12, hz + K + 0.12, hz - K - 0.12], [hx - K, hx + K, hz + K + 0.12, hz + K], [hx - K, hx + K, hz - K, hz - K - 0.12]]) add(x0, x1, top + 0.2, top + 0.2 + KH, za, zb);
      add(hx - K - 0.12, hx + K + 0.12, top + 0.2 + KH, top + 0.4 + KH, hz + K + 0.12, hz - K - 0.12);
      faders.push({ id: c.id, box: { x0: OX - hw + 0.1, x1: OX + hw - 0.1, y0: 1.2, y1: top - 0.1, z0: z1 + 0.1, z1: z0 - 0.1 },
        occ: { x0: OX - hw - 0.1, x1: OX + hw + 0.1, y0: 2.7, y1: top + 0.2, z0: z1, z1: z0 } });
      c.dome = { x: OX + hx, z: hz, K, top: top + 0.2, KH, a: ha };
    }
    if (kind === 'gepaeck') {
      // Gepäckwagen: Innengang (Boden 1,4, Decke 4,2), Dach 4,2 … 4,4 begehbar mit Luke (luke: [x, z, a]); Rückwand geschlossen,
      // vorn eine Tür (door: halbe Breite, doorH: Höhe; ohne door geschlossen)
      const t = 0.2, top = 4.2, GR = 0x2a6a4a, GD = 0x1e4a2e;
      add(-hw, hw, 1.0, 1.4, z0, z1);
      b.box(w, 0.4, L, 0, 1.0, cz, ZUGF.woodDk, { r: 0.05 });
      b.box(w - 0.4, 0.03, L - 0.4, 0, 1.39, cz, ZUGF.wood, { r: 0, seg: 0 });
      const F = fb(c.id);
      for (const sx of [-1, 1]) {
        const x0 = sx > 0 ? hw - t : -hw, x1 = sx > 0 ? hw : -hw + t;
        add(x0, x1, 1.4, top, z0, z1, { flags: { noWallSlide: true } });
        b.box(t, 1.0, L, (x0 + x1) / 2, 1.4, cz, GR, { r: 0.04 });
        b.box(t + 0.04, 0.12, L, (x0 + x1) / 2, 2.4, cz, ZUGF.trim, { r: 0.02 });
        F.box(t, top - 2.52, L, (x0 + x1) / 2, 2.52, cz, GR, { r: 0.04 });
        for (let i = 0; i < Math.floor(L / 2); i++) F.box(0.05, top - 2.7, 0.12, sx * (hw + 0.01), 2.6, z0 - 1 - i * 2, 0x5a9a6a, { r: 0, seg: 0 });
        emblem(F, sx * (hw + 0.01), 3.3, cz, sx);
      }
      for (const [ez, rear] of [[z0, true], [z1, false]]) {
        const ze = rear ? ez - t / 2 : ez + t / 2;
        const B = F;
        const D = rear ? 0 : c.door ?? 0, DH = c.doorH ?? 2.8;
        if (!D) { add(-hw, hw, 1.4, top, ze + t / 2, ze - t / 2); B.box(w, top - 1.4, t, 0, 1.4, ze, GD, { r: 0.03 }); continue; }
        for (const sx of [-1, 1]) { const x0 = sx > 0 ? D : -hw, x1 = sx > 0 ? hw : -D; add(x0, x1, 1.4, top, ze + t / 2, ze - t / 2); B.box(x1 - x0, top - 1.4, t, (x0 + x1) / 2, 1.4, ze, GD, { r: 0.03 }); }
        add(-D, D, DH, top, ze + t / 2, ze - t / 2);
        B.box(2 * D, top - DH, t, 0, DH, ze, GD, { r: 0.03 });
        b.box(2 * D + 0.3, 0.14, t + 0.06, 0, DH - 0.07, ze, ZUGF.trim, { r: 0.03 });
      }
      const [lx, lz, la] = c.luke ?? [-0.9, z0 - 1.6, 1.4];
      const rects = [[-hw, hw, z0, lz + la / 2], [-hw, hw, lz - la / 2, z1], [-hw, lx - la / 2, lz + la / 2, lz - la / 2], [lx + la / 2, hw, lz + la / 2, lz - la / 2]];
      for (const [x0, x1, za, zb] of rects) {
        if (x1 - x0 < 0.01 || za - zb < 0.01) continue;
        add(x0, x1, top, top + 0.2, za, zb);
        F.box(x1 - x0, 0.2, za - zb, (x0 + x1) / 2, top, (za + zb) / 2, 0x3a3a4a, { r: 0.03 });
      }
      // Lukenrahmen (Gold) – verrät das Geheimnis
      for (const [dx, dz, sx, sz] of [[0, la / 2, la + 0.2, 0.1], [0, -la / 2, la + 0.2, 0.1], [la / 2, 0, 0.1, la], [-la / 2, 0, 0.1, la]]) b.box(sx, 0.08, sz, lx + dx, top + 0.2, lz + dz, ZUGF.trim, { r: 0.02 });
      faders.push({ id: c.id, box: { x0: OX - hw + 0.1, x1: OX + hw - 0.1, y0: 1.2, y1: top - 0.05, z0: z1 + 0.1, z1: z0 - 0.1 },
        occ: { x0: OX - hw - 0.1, x1: OX + hw + 0.1, y0: 2.5, y1: top + 0.25, z0: z1, z1: z0 } });
      c.luke = [OX + lx, lz, la];
      c.top = top;
    }
    if (kind === 'tender') {
      b.box(w, 1.6, L, 0, 1.4, cz, ZUGF.body, { r: 0.08 });
      b.box(w + 0.04, 0.14, L + 0.04, 0, 2.6, cz, ZUGF.trim, { r: 0.03 });
      for (let i = 0; i < 20; i++) b.sphere(0.34 + (i % 3) * 0.06, -1.1 + (i % 5) * 0.55, 2.98, z0 - 0.7 - Math.floor(i / 5) * ((L - 1.2) / 3), i % 4 ? ZUGF.black : 0x3a3446, { s: [1, 0.42, 1], ws: 7, hs: 4 });
      add(-hw, hw, 1.0, 3.0, z0, z1);
      for (const sx of [-1, 1]) emblem(b, sx * (hw + 0.01), 2.0, cz, sx);
    }
    if (kind === 'lok') {
      // Führerhaus hinten (Dach 3,96), roter Kessel mit Goldringen vorn, Brummbär-Gesicht mit Monokel, Zylinder-Schornstein,
      // Kuhfänger
      const cab0 = z0, cab1 = z0 - 3.0;
      const red = { v: (x, y, z, nx, ny) => (ny > 0.4 ? 0xe0404a : ny < -0.4 ? ZUGF.lokDk : ZUGF.lok) };
      add(-hw, hw, 1.0, 1.4, z0, z1);
      b.box(w, 0.4, L, 0, 1.0, cz, ZUGF.black, { r: 0.05 });
      b.box(w, 2.3, cab0 - cab1, 0, 1.4, (cab0 + cab1) / 2, red, { r: 0.1 });
      b.box(w + 0.3, 0.26, cab0 - cab1 + 0.4, 0, 3.7, (cab0 + cab1) / 2, ZUGF.black, { r: 0.1 });
      b.box(w + 0.34, 0.08, cab0 - cab1 + 0.44, 0, 3.66, (cab0 + cab1) / 2, ZUGF.trim, { r: 0.02 });
      for (const sx of [-1, 1]) g.box(0.06, 0.8, 1.2, sx * (hw + 0.01), 2.3, (cab0 + cab1) / 2, ZUGF.glow, { r: 0, seg: 0 });
      add(-hw, hw, 1.4, 3.96, cab0, cab1);
      const kz0 = cab1, kz1 = z1 + 0.4, kl = kz0 - kz1;
      b.cyl(1.25, 1.25, kl, 0, 2.5 - kl / 2, (kz0 + kz1) / 2, red, 18, { rx: Math.PI / 2 });
      for (let i = 0; i < 3; i++) b.cyl(1.3, 1.3, 0.14, 0, 2.5 - 0.07, kz0 - 0.6 - i * (kl - 1) / 2, ZUGF.trim, 18, { rx: Math.PI / 2 });
      add(-1.25, 1.25, 1.4, 3.75, kz0, kz1);
      // Gesicht (Rauchkammertür): Bärenkopf mit Ohren, Augen, Schnauze, Monokel
      const fz = kz1 - 0.05;
      b.cyl(1.15, 1.15, 0.2, 0, 2.4, fz, ZUGF.bear, 18, { rx: Math.PI / 2 });
      for (const sx of [-1, 1]) {
        b.sphere(0.42, sx * 0.95, 3.55, fz, ZUGF.bear);
        b.sphere(0.22, sx * 0.95, 3.6, fz - 0.15, 0xe8a888);
        b.sphere(0.2, sx * 0.42, 2.85, fz - 0.12, 0xffffff);
        b.sphere(0.1, sx * 0.42, 2.85, fz - 0.28, ZUGF.black);
        b.box(0.42, 0.1, 0.1, sx * 0.42, 3.12, fz - 0.14, ZUGF.black, { r: 0.02, rz: sx * 0.3 });
      }
      b.torus(0.27, 0.05, 0.42, 2.85, fz - 0.24, ZUGF.trim, { rs: 4, ts: 14 });
      b.box(0.03, 0.5, 0.03, 0.66, 2.35, fz - 0.24, ZUGF.trim, { r: 0, seg: 0 });
      b.sphere(0.38, 0, 2.2, fz - 0.2, ZUGF.snout, { s: [1.2, 0.8, 0.8] });
      b.sphere(0.16, 0, 2.38, fz - 0.5, ZUGF.black);
      // Zylinder-Schornstein mit rotem Band und Krempe
      b.cyl(0.42, 0.42, 1.4, 0, 3.6, kz1 + 1.2, ZUGF.black, 14);
      b.cyl(0.7, 0.7, 0.1, 0, 3.72, kz1 + 1.2, ZUGF.black, 14);
      b.cyl(0.44, 0.44, 0.22, 0, 3.9, kz1 + 1.2, ZUGF.lok, 14);
      b.sphere(0.5, 0, 3.7, kz0 - 1.8, ZUGF.trim, { s: [1, 0.7, 1] });
      for (let i = 0; i < 5; i++) b.box(0.14, 0.9, 0.12, -1.0 + i * 0.5, 0.25, z1 + 0.15, ZUGF.trim, { r: 0.02, rx: -0.5 });
      g.sphere(0.24, 0, 3.4, fz - 0.15, 0xfff0a0);
      c.chimney = [OX, 5.0, kz1 + 1.2];
      // große Treibräder
      for (const az of [kz0 - 0.8, kz0 - 2.3, kz0 - 3.8]) for (const sx of [-1, 1]) wheels.push([OX + sx * 0.95, 0.62, az, 0.62]);
    }
  }
  // Kupplungsbleche zwischen den Wagen (auf Deckhöhe, etwas schmaler)
  for (let i = 0; i + 1 < cars.length; i++) {
    const a = cars[i], n = cars[i + 1];
    const gz0 = a.z1, gz1 = n.z0;
    if (gz0 - gz1 < 0.05) continue;
    b.box(2.6, 0.12, gz0 - gz1 + 0.3, 0, 1.28, (gz0 + gz1) / 2, ZUGF.steel, { r: 0.02 });
    for (let k = 0; k < 4; k++) b.box(2.5, 0.02, 0.05, 0, 1.4, gz0 - (k + 0.5) * (gz0 - gz1) / 4, 0x5a5e72, { r: 0, seg: 0 });
    add(-1.6, 1.6, 1.2, 1.4, gz0 + 0.15, gz1 - 0.15);
  }
  if (opt.near) { opt.near.put(b); opt.near.put(g, 'glow'); } else {
    b.flush(level, { castShadow: true });
    g.flush(level, { material: 'glow', castShadow: false });
  }
  // Ausblend-Teile aller Wagen in einem Mesh: je Wagen blendet der Aufbau gerastert aus (Bayer-Muster, deckendes Zeichnen
  // ohne Sortierprobleme), solange die Figur darin ist (Ausschnitt) oder der Wagen zwischen Kamera und Figur steht
  if (level.view && faders.length) aufbauMesh(level, faders, fade, opt.name ?? 'zug-aufbau', opt.near?.group);
  return { wheels, faders };
}

/** Steht die Figur p im Ausschnitt-Wagen f? */
export const imWagen = (f, p) => { const B = f.box, q = p.pos; return !!B && q.x > B.x0 && q.x < B.x1 && q.y > B.y0 && q.y < B.y1 && q.z > B.z0 && q.z < B.z1; };

const BAYER = '0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.';
const _zr = new THREE.Ray(), _zh = new THREE.Vector3(), _zp = new THREE.Vector3();

/** Ein Mesh für die Ausblend-Teile aller Wagen (Attribut aCar je Wagen, Uniform uFade[N] = sichtbarer Anteil 0..1). */
function aufbauMesh(level, faders, fade, name, parent = null) {
  const geos = [], used = [];
  faders.forEach((f) => {
    const geo = fade.get(f.id)?.geometry();
    if (!geo) return;
    const g2 = geo.index ? geo.toNonIndexed() : geo;
    for (const k of Object.keys(g2.attributes)) if (!['position', 'normal', 'color'].includes(k)) g2.deleteAttribute(k);
    g2.setAttribute('aCar', new THREE.BufferAttribute(new Float32Array(g2.attributes.position.count).fill(used.length), 1));
    geos.push(g2);
    f.slot = used.length;
    used.push(f);
  });
  if (!geos.length) return null;
  const N = used.length;
  const uFade = { value: new Array(N).fill(1) };
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uFade = uFade;
    sh.vertexShader = 'attribute float aCar;\nvarying float vCar;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vCar = aCar;');
    sh.fragmentShader = `#define ZF_N ${N}\nuniform float uFade[ZF_N];\nvarying float vCar;\n` + sh.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
  {
    float zf = uFade[int(vCar + 0.5)];
    if (zf < 0.999) {
      const float zb[16] = float[16](${BAYER});
      ivec2 zp = ivec2(mod(gl_FragCoord.xy, 4.0));
      if ((zb[zp.x + zp.y * 4] + 0.5) / 16.0 >= zf) discard;
    }
  }`);
  };
  mat.customProgramCacheKey = () => `w8b:zugaufbau:${N}`;
  const mesh = new THREE.Mesh(mergeGeometries(geos, false), mat);
  mesh.name = name;
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.userData.owned = true;
  if (parent) parent.add(mesh); else level.view.add(mesh);
  for (const f of used) {
    f.vis = 1;
    if (f.occ) f.occBox = new THREE.Box3(new THREE.Vector3(f.occ.x0, f.occ.y0, f.occ.z0), new THREE.Vector3(f.occ.x1, f.occ.y1, f.occ.z1));
  }
  level.view.onFrame((dt) => {
    const p = level.player, cam = level.view.camera.position;
    let ray = false, len = 0;
    if (p) {
      _zh.set(p.pos.x, p.pos.y + 0.75, p.pos.z);
      _zr.origin.copy(cam);
      _zr.direction.copy(_zh).sub(cam);
      len = _zr.direction.length();
      _zr.direction.normalize();
      ray = true;
    }
    const step = Math.min(0.1, dt || 0) / 0.25;
    for (const f of used) {
      const inside = !!p && imWagen(f, p);
      const blocks = ray && !inside && f.occBox && !f.occBox.containsPoint(_zh) && !!_zr.intersectBox(f.occBox, _zp) && _zp.distanceTo(cam) < len - 0.3;
      const want = inside ? f.insideVis ?? 0.1 : blocks ? 0.35 : 1;
      f.vis += clamp(want - f.vis, -step, step);
      uFade.value[f.slot] = f.vis;
    }
  });
  return mesh;
}

// ------------------------------------------------------------------ Fahrt-Illusion

/** Leinwand-Textur (wiederholt). */
function texture(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
const _X = new THREE.Vector3(1, 0, 0), _Y = new THREE.Vector3(0, 1, 0);

/** Einheits-Modelle der Tal-Requisiten (Vertexfarben; Größe 1 ≈ Höhe). */
function requisitGeo(kind) {
  const b = new Bld();
  if (kind === 'baum') {
    b.cyl(0.07, 0.09, 0.3, 0, 0, 0, 0x6a4a3a, 6);
    b.cone(0.42, 0.55, 0, 0.22, 0, gradY(0x2a5a3a, 0x4a8a4a, 0.2, 0.8), 7);
    b.cone(0.32, 0.45, 0, 0.55, 0, gradY(0x3a6a40, 0x6aa85a, 0.5, 1.0), 7);
  } else if (kind === 'laubbaum') {
    b.cyl(0.06, 0.08, 0.45, 0, 0, 0, 0x6a4a3a, 6);
    b.sphere(0.36, 0, 0.7, 0, gradY(0x3a7a3a, 0x8ac85a, 0.4, 1.0), { s: [1, 0.9, 1], ws: 8, hs: 6 });
    b.sphere(0.12, 0.2, 0.86, 0.18, 0xff6a5a, { ws: 5, hs: 4 });
  } else if (kind === 'haus') {
    b.box(1.0, 0.7, 0.8, 0, 0, 0, 0xf6e6d0, { r: 0, seg: 0 });
    b.cone(0.78, 0.55, 0, 0.7, 0, 0xd04a4a, 4, { yaw: Math.PI / 4, s: [1, 1, 0.82] });
    for (const sx of [-0.25, 0.25]) b.box(0.18, 0.2, 0.02, sx, 0.32, 0.41, 0xffd25a, { r: 0, seg: 0 });
    b.box(0.2, 0.34, 0.02, 0, 0, -0.41, 0x7a4a2a, { r: 0, seg: 0 });
    b.box(0.12, 0.3, 0.12, 0.28, 0.85, 0.1, 0x8a5a4a, { r: 0, seg: 0 });
  } else if (kind === 'zelt') {
    b.cyl(0.62, 0.62, 0.45, 0, 0, 0, { v: (x, y, z) => (Math.floor(((Math.atan2(x, z) + Math.PI) / TAU) * 12) % 2 ? 0xffffff : 0xe83a4a) }, 12);
    b.cone(0.72, 0.6, 0, 0.45, 0, { v: (x, y, z) => (Math.floor(((Math.atan2(x, z) + Math.PI) / TAU) * 12) % 2 ? 0xffe8f0 : 0xe83a4a) }, 12);
    b.cyl(0.02, 0.02, 0.25, 0, 1.0, 0, 0x3a2a3a, 4);
    b.box(0.02, 0.1, 0.16, 0, 1.13, 0.08, 0xffc83a, { r: 0, seg: 0 });
  } else if (kind === 'ballon') {
    b.sphere(0.5, 0, 1.0, 0, { v: (x, y, z) => (Math.floor(((Math.atan2(x, z) + Math.PI) / TAU) * 8) % 2 ? 0xffffff : 0xffd8e8) }, { s: [1, 1.15, 1], ws: 12, hs: 8 });
    b.cone(0.22, 0.3, 0, 0.32, 0, 0xffffff, 8, { rx: Math.PI });
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.cyl(0.008, 0.008, 0.36, sx * 0.08, 0.1, sz * 0.08, 0x3a2a2a, 3);
    b.box(0.2, 0.14, 0.2, 0, 0, 0, 0x9a6a3a, { r: 0.02 });
  }
  return b.geometry();
}
const REQUISIT = {
  baum: { size: [3, 8], colors: [0xffffff, 0xd8f0d0, 0xf0e8ff] },
  laubbaum: { size: [3, 6], colors: [0xffffff, 0xffe8c0, 0xf8d0e8] },
  haus: { size: [3, 4.4], colors: [0xffffff, 0xffe0f0, 0xe0f0ff, 0xfff0c0] },
  zelt: { size: [4, 6.5], colors: [0xffffff, 0xd0e0ff, 0xffe8a0] },
  ballon: { size: [3.5, 5], colors: [0xff6a8a, 0x6ac8ff, 0xffd84a, 0x9a7aff, 0x6ae08a], dy: 16 },
};

/** Tal-Requisiten: specs = [{ kind, bands: [[x0, x1, n], …], y?, size? }] → [{ kind, geo, list: [{ x, y, z0, s, yaw, color }] }]. */
function talRequisiten(specs, rnd, zMax, len, talY) {
  return specs.map((sp) => {
    const D = REQUISIT[sp.kind] ?? REQUISIT.baum;
    const [s0, s1] = sp.size ?? D.size;
    const list = [];
    for (const [x0, x1, n] of sp.bands) for (let i = 0; i < n; i++) {
      list.push({ x: x0 + rnd() * (x1 - x0), z0: zMax - rnd() * len, y: (sp.y ?? talY) + (D.dy ? rnd() * D.dy : 0), s: s0 + rnd() * (s1 - s0), yaw: rnd() * TAU, color: D.colors[Math.floor(rnd() * D.colors.length)] });
    }
    return { kind: sp.kind, geo: requisitGeo(sp.kind), list };
  });
}

/**
 * Fahrt-Illusion: Gleisbett, Viadukt-Seitenwände, Talboden (Texturen laufen mit S(t)), vorbeiziehende Laternen, Fahnen und
 * Bäume (Instanzen, kreisen über das Band zMin … zMax), Dampf der Lok, drehende Räder. Der Startbahnhof (Bahnsteig mit
 * Kollision) fährt mit S(t) nach hinten weg. cfg = { weg (fahrweg), band: [zMin, zMax], gleise: [x, …] (Standard [0]; je Gleis
 * Gleisbett, Viadukt, Laternen), talY, trees: [[x0, x1, n], …] (Baumstreifen im Tal), wheels (aus baronZug), chimneys,
 * bahnhof: { x0, x1, zA, zB, top }, bahnhofOptik (Gruppe) }. Rückgabe { S(), v(), bahnsteig (MovingBox) }.
 */
export function fahrtIllusion(level, cfg) {
  const W = cfg.weg;
  const [zMin, zMax] = cfg.band;
  const len = zMax - zMin;
  const T = () => fahrUhr(level);
  // Bahnsteig (Kollision fährt mit)
  const bh = cfg.bahnhof;
  let bahnsteig = null;
  if (bh) {
    const z0 = Math.max(bh.zA, bh.zB), z1 = Math.min(bh.zA, bh.zB);
    bahnsteig = new MovingBox(level, (bh.x0 + bh.x1) / 2, bh.top - 1.2, (z0 + z1) / 2, bh.x1 - bh.x0, 1.2, z0 - z1, { tag: 'bahnsteig' });
    const zc = (z0 + z1) / 2;
    level.onStep((dt) => { bahnsteig.moveTo(bahnsteig.pos.x, bahnsteig.pos.y, zc + W.S(T()), dt); });
  }
  const out = { S: () => W.S(T()), v: () => W.v(T()), bahnsteig };
  if (!level.view) return out;
  const v = level.view;
  const holder = {};
  let vis = 0;
  // ---- Gleisbett (Schwellen auf Schotter)
  const tie = texture(64, 128, (x, w, h) => {
    x.fillStyle = '#6a5a6a'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 140; i++) { x.fillStyle = ['#5a4a5a', '#7a6a78', '#4e4252'][i % 3]; x.fillRect((i * 37) % w, (i * 53) % h, 3, 3); }
    for (let k = 0; k < 2; k++) { x.fillStyle = '#5a3420'; x.fillRect(4, 20 + k * 64, w - 8, 22); x.fillStyle = '#7a4a2a'; x.fillRect(4, 20 + k * 64, w - 8, 5); }
  });
  const GL = cfg.gleise ?? [0];
  const zc = (zMin + zMax) / 2;
  const bedGeo = mergeGeometries(GL.map((gx) => {
    const g = new THREE.PlaneGeometry(3.6, len, 1, 1); g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * len / 1.6);
    return g.translate(gx, -0.02, zc);
  }), false);
  const bed = new THREE.Mesh(bedGeo, new THREE.MeshLambertMaterial({ map: tie }));
  bed.receiveShadow = true;
  bed.name = 'gleisbett';
  // ---- Viadukt-Seitenwände mit Bögen (Textur: Mauer + Bogen je 12 m), Talboden
  const arch = texture(256, 128, (x, w, h) => {
    x.fillStyle = '#8a5a6e'; x.fillRect(0, 0, w, h);
    for (let r = 0; r < 8; r++) for (let c2 = 0; c2 < 9; c2++) { x.fillStyle = (r + c2) % 2 ? '#7a4e62' : '#946478'; x.fillRect(c2 * 32 - (r % 2) * 16, r * 16, 30, 14); }
    x.fillStyle = '#2a1a30'; x.beginPath(); x.moveTo(40, h); x.lineTo(40, 70); x.arc(128, 70, 88, Math.PI, 0); x.lineTo(216, h); x.closePath(); x.fill();
    x.fillStyle = '#ffd27a'; x.fillRect(0, 0, w, 6);
  });
  const WH = 16;
  const wallMat = new THREE.MeshLambertMaterial({ map: arch, side: THREE.DoubleSide });
  const wallGeo = mergeGeometries(GL.flatMap((gx) => [-1, 1].map((sx) => {
    const gw = new THREE.PlaneGeometry(len, WH, 1, 1);
    const uv = gw.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * len / 12);
    gw.rotateY(sx * Math.PI / 2);
    return gw.translate(gx + sx * 1.85, -0.25 - WH / 2, zc);
  })), false);
  const walls = [new THREE.Mesh(wallGeo, wallMat)];
  walls[0].name = 'viadukt';
  const tal = texture(512, 512, (x, w, h) => {
    // Abendfelder: Wiesen, goldene Kornfelder, Lavendel, Kürbisäcker mit Furchen; Feldwege, Teiche, Hecken, Lichterpunkte
    x.fillStyle = '#4a7a4a'; x.fillRect(0, 0, w, h);
    let q = 5;
    const r = () => { q = (q * 16807) % 2147483647; return q / 2147483647; };
    const fields = [['#6a9a4a', '#5a8a42'], ['#e0b04a', '#c8963a'], ['#9a6ad0', '#7e52b8'], ['#e8804a', '#c8643a'], ['#58a05a', '#4a8a4c'], ['#d8c050', '#bca240']];
    const cell = 128;
    for (let gy = 0; gy < h / cell; gy++) for (let gx = 0; gx < w / cell; gx++) {
      const [a, b] = fields[Math.floor(r() * fields.length)];
      const x0 = gx * cell + 3, y0 = gy * cell + 3, ww = cell - 6, hh = cell - 6;
      x.fillStyle = a; x.fillRect(x0, y0, ww, hh);
      x.fillStyle = b;
      const vert = r() > 0.5;
      for (let k = 6; k < (vert ? ww : hh); k += 12) { if (vert) x.fillRect(x0 + k, y0, 5, hh); else x.fillRect(x0, y0 + k, ww, 5); }
    }
    // Hecken zwischen den Feldern
    x.fillStyle = '#2e5a36';
    for (let k = 0; k <= w; k += cell) { x.fillRect(k - 3, 0, 6, h); x.fillRect(0, k - 3, w, 6); }
    // Feldweg und Bach
    x.strokeStyle = '#e8d0a0'; x.lineWidth = 9; x.beginPath(); x.moveTo(0, 120); x.bezierCurveTo(160, 240, 340, 20, 512, 140); x.stroke();
    x.strokeStyle = '#4ab8ff'; x.lineWidth = 12; x.beginPath(); x.moveTo(300, 0); x.bezierCurveTo(200, 160, 420, 330, 260, 512); x.stroke();
    x.strokeStyle = '#9ae0ff'; x.lineWidth = 3; x.stroke();
    for (const [cx, cy, rr] of [[90, 380, 34], [430, 300, 26]]) { x.fillStyle = '#3a9ae0'; x.beginPath(); x.ellipse(cx, cy, rr, rr * 0.7, 0.3, 0, TAU); x.fill(); x.fillStyle = '#8ad8ff'; x.beginPath(); x.ellipse(cx - 6, cy - 4, rr * 0.5, rr * 0.25, 0.3, 0, TAU); x.fill(); }
    // Blumen und Lichterpunkte
    for (let i = 0; i < 140; i++) { x.fillStyle = ['#ffe08a', '#ff8ac8', '#ffffff', '#ff6a5a'][i % 4]; x.beginPath(); x.arc(r() * w, r() * h, 2 + r() * 2, 0, TAU); x.fill(); }
  });
  const gx0 = Math.min(...GL), gx1 = Math.max(...GL);
  const TW = 420 + (gx1 - gx0), TL = len + 300;
  const talGeo = new THREE.PlaneGeometry(TW, TL, 1, 1); talGeo.rotateX(-Math.PI / 2);
  { const uv = talGeo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * TW / 90, uv.getY(i) * TL / 90); }
  const talMesh = new THREE.Mesh(talGeo, new THREE.MeshLambertMaterial({ map: tal }));
  talMesh.position.set((gx0 + gx1) / 2, cfg.talY ?? -16, zc - 60);
  talMesh.name = 'talboden';
  for (const m of [bed, ...walls, talMesh]) { m.castShadow = false; m.userData.owned = true; v.add(m); }
  talMesh.receiveShadow = false;
  // ---- Laternen und Fahnen auf dem Viadukt, Bäume im Tal (Instanzen, kreisen über das Band)
  const EVERY = cfg.lampEvery ?? 15;
  const lamps = [], flags = [];
  const skip = (x, z) => (cfg.skipLamps ?? []).some(([x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1);
  for (const gx of cfg.lampGleise ?? GL) for (let z = zMax, i = 0; z > zMin; z -= EVERY, i++) { const x = gx + (i % 2 ? 2.1 : -2.1); if (!skip(x, z)) (i % 3 === 2 ? flags : lamps).push({ x, z0: z }); }
  let s = 9;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  // Requisiten im Tal (je Art eine Instanz-Gruppe): Bäume, Häuschen mit Lichtfenstern, Rummelzelte, Heißluftballons
  const props = talRequisiten(cfg.props ?? [{ kind: 'baum', bands: [[-78, -8, 23], [8, 78, 23]] }], rnd, zMax, len, cfg.talY ?? -16);
  const poleGeo = new THREE.CylinderGeometry(0.07, 0.09, 2.6, 6); poleGeo.translate(0, 1.3, 0);
  const headGeo = new THREE.BoxGeometry(0.34, 0.42, 0.34); headGeo.translate(0, 2.75, 0);
  const flagGeo = new THREE.BoxGeometry(0.06, 1.0, 0.8); flagGeo.translate(0, 2.0, 0.42);
  const mk = (geo, mat, n, name) => { const m = new THREE.InstancedMesh(geo, mat, Math.max(1, n)); m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false; m.name = name; m.userData.owned = true; v.add(m); return m; };
  const poles = mk(poleGeo, new THREE.MeshLambertMaterial({ color: 0x2a2236 }), lamps.length + flags.length, 'masten');
  const heads = mk(headGeo, new THREE.MeshBasicMaterial({ color: 0xffd27a }), lamps.length, 'laternen');
  const flagM = mk(flagGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), flags.length, 'fahnen');
  const col = new THREE.Color();
  for (const pr of props) {
    pr.mesh = mk(pr.geo, new THREE.MeshLambertMaterial({ vertexColors: true }), pr.list.length, `tal:${pr.kind}`);
    pr.list.forEach((q, i) => { if (q.color !== undefined) pr.mesh.setColorAt(i, col.set(q.color)); });
  }
  flags.forEach((q, i) => flagM.setColorAt(i, col.set([0xe83a5a, 0xffc84a, 0x8a5ae8][i % 3])));
  const glow = glowPoints(level, lamps.map((q) => [q.x, 2.8, q.z0, 2.6]), { color: 0xffc86a, opacity: 0.75 });
  const m4 = new THREE.Matrix4(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), qt = new THREE.Quaternion(), q0 = new THREE.Quaternion();
  const wrap = (z) => zMin + ((((z - zMin) % len) + len) % len);
  // Laternen/Fahnen in diesen z-Bereichen (z. B. unter einem breiten Bühnenwagen) nicht zeigen
  const hidden = (z) => (cfg.lampHide ?? []).some(([a, b]) => z <= Math.max(a, b) && z >= Math.min(a, b));
  // ---- Räder (alle Wagen eine Instanz-Gruppe), Dampf
  const wl = cfg.wheels ?? [];
  const wheelGeo = new THREE.CylinderGeometry(1, 1, 0.16, 14).toNonIndexed(); wheelGeo.rotateZ(Math.PI / 2);
  const wp = wheelGeo.attributes.position;
  const wc = new Float32Array(wp.count * 3);
  for (let i = 0; i < wp.count; i++) {
    const r = Math.hypot(wp.getY(i), wp.getZ(i));
    const ang = Math.atan2(wp.getZ(i), wp.getY(i));
    const c = r > 0.82 ? [0.8, 0.1, 0.14] : Math.abs(Math.sin(ang * 3)) < 0.3 ? [1, 0.75, 0.25] : [0.1, 0.08, 0.12];
    wc.set(c, i * 3);
  }
  wheelGeo.setAttribute('color', new THREE.BufferAttribute(wc, 3));
  const wheelMesh = mk(wheelGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.3 }), wl.length, 'raeder');
  const steamN = 18;
  const steam = mk(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshLambertMaterial({ color: 0xfff4ff, emissive: 0x3a2a40, transparent: true, opacity: 0.5, depthWrite: false }), steamN, 'dampf');
  const station = cfg.bahnhofOptik ?? null;
  if (station) v.add(station);
  v.onFrame((dt) => {
    vis += visDt(level, holder, dt);
    const t = T(), S = W.S(t), vv = W.v(t);
    tie.offset.y = S / 1.6;
    arch.offset.x = S / 12;
    tal.offset.y = S / 90;
    lamps.forEach((q, i) => {
      const z = wrap(q.z0 + S);
      ps.set(q.x, hidden(z) ? -60 : 0, z); sc.set(1, 1, 1); m4.compose(ps, q0, sc);
      poles.setMatrixAt(i, m4); heads.setMatrixAt(i, m4);
      if (glow) { const k = (glow.i0 + i) * 3; glow.field.pos[k] = q.x; glow.field.pos[k + 1] = hidden(z) ? -999 : 2.8; glow.field.pos[k + 2] = z; }
    });
    flags.forEach((q, i) => {
      const z = wrap(q.z0 + S);
      ps.set(q.x, hidden(z) ? -60 : 0, z); sc.set(1, 1, 1); m4.compose(ps, q0, sc);
      poles.setMatrixAt(lamps.length + i, m4);
      qt.setFromAxisAngle(_Y, Math.sin(vis * 7 + q.z0) * 0.15 * Math.sign(q.x)); m4.compose(ps, qt, sc);
      flagM.setMatrixAt(i, m4);
    });
    for (const pr of props) {
      pr.list.forEach((q, i) => {
        const bob = pr.kind === 'ballon' ? Math.sin(vis * 0.6 + q.z0) * 0.8 : 0;
        ps.set(q.x, q.y + bob, wrap(q.z0 + S)); sc.set(q.s, q.s, q.s); qt.setFromAxisAngle(_Y, q.yaw); m4.compose(ps, qt, sc);
        pr.mesh.setMatrixAt(i, m4);
      });
      pr.mesh.instanceMatrix.needsUpdate = true;
    }
    poles.instanceMatrix.needsUpdate = true; heads.instanceMatrix.needsUpdate = true; flagM.instanceMatrix.needsUpdate = true;
    if (glow) glow.field.geo.attributes.position.needsUpdate = true;
    // Räder drehen (Abrollen: Winkel = S / r)
    wl.forEach(([x, y, z, r = 0.42], i) => { qt.setFromAxisAngle(_X, -S / r); ps.set(x, y, z); sc.set(r, r, r); m4.compose(ps, qt, sc); wheelMesh.setMatrixAt(i, m4); });
    wheelMesh.instanceMatrix.needsUpdate = true;
    // Dampfwolken aus den Schornsteinen: steigen auf und ziehen mit dem Fahrtwind nach hinten
    const chs = cfg.chimneys ?? [[0, 5, 0]], per = Math.ceil(steamN / chs.length);
    for (let i = 0; i < steamN; i++) {
      const ch = chs[Math.min(chs.length - 1, Math.floor(i / per))];
      const life = 1.6, u = ((vis * 1.1 + ((i % per) / per) * life) % life) / life;
      ps.set(ch[0] + Math.sin(i * 1.7) * 0.5 * u, ch[1] + u * 3.4, ch[2] + u * (1.2 + vv * 0.8));
      const r = 0.22 + u * 0.75;
      sc.set(r, r * 0.8, r); m4.compose(ps, q0, sc);
      steam.setMatrixAt(i, m4);
    }
    steam.instanceMatrix.needsUpdate = true;
    if (station) { station.position.z = S; station.visible = S < 160; }
  });
  return out;
}

/** Optik des Startbahnhofs (eine Gruppe, fährt mit): Bahnsteig, Dach auf Säulen, Häuschen mit Uhr, Bänke, Laternen, Schild. */
export function bahnhofOptik(level, bh) {
  if (!level.view) return null;
  const b = new Bld(), g = new Bld();
  const z0 = Math.max(bh.zA, bh.zB), z1 = Math.min(bh.zA, bh.zB), cx = (bh.x0 + bh.x1) / 2, cz = (z0 + z1) / 2, w = bh.x1 - bh.x0, L = z0 - z1, y = bh.top;
  b.box(w, y + 6, L, cx, -6, cz, gradY(0x6a4a5a, 0xd8c0d0, -6, y), { r: 0.08 });
  b.box(w + 0.1, 0.12, L + 0.1, cx, y - 0.1, cz, 0xf0e0f0, { r: 0.03 });
  b.box(0.3, 0.02, L, bh.x0 + 0.25, y + 0.01, cz, 0xffd23a, { r: 0, seg: 0 });
  // Blumenkästen an der Bahnsteigkante (rechts, außerhalb des Wegs)
  for (let z = z0 - 1.5; z > z1 + 1; z -= 3.2) {
    b.box(0.5, 0.35, 1.2, bh.x1 - 0.3, y, z, 0x8a5a30, { r: 0.04 });
    for (let k = 0; k < 4; k++) b.sphere(0.13, bh.x1 - 0.3, y + 0.42, z - 0.45 + k * 0.3, [0xff6a8a, 0xffd84a, 0xffffff, 0x9a7aff][(k + Math.round(z)) & 3], { ws: 6, hs: 4 });
  }
  // Bahnhofsgebäude gegenüber (links der Gleise, Uhrtürmchen und Fenster zum Zug) auf eigenem Sockel
  const hx = bh.houseX ?? -6.2, hz = cz + 2, fs = Math.sign(cx - hx) || 1;
  b.box(4.4, 16 + y, 8, hx, -16, hz, gradY(0x5a3a5a, 0xc8a8c0, -16, y), { r: 0.06 });
  b.box(3.4, 3.2, 5, hx, y, hz, 0xf6e0c8, { r: 0.1 });
  b.box(3.8, 0.4, 5.4, hx, y + 3.2, hz, ZUGF.body, { r: 0.1 });
  b.cone(3.1, 1.6, hx, y + 3.6, hz, ZUGF.roof, 4, { yaw: Math.PI / 4 });
  b.box(1.2, 1.5, 1.2, hx, y + 4.5, hz, 0xf6e0c8, { r: 0.05 });
  b.cone(1.05, 1.1, hx, y + 6.0, hz, ZUGF.roof, 4, { yaw: Math.PI / 4 });
  b.sphere(0.14, hx, y + 7.15, hz, ZUGF.trim);
  b.cyl(0.46, 0.46, 0.1, hx + fs * 0.62, y + 5.25, hz, 0xffffff, 16, { rz: Math.PI / 2 });
  b.box(0.04, 0.32, 0.05, hx + fs * 0.69, y + 5.25, hz, ZUGF.black, { r: 0, seg: 0 });
  b.box(0.04, 0.05, 0.26, hx + fs * 0.69, y + 5.25, hz - 0.1, ZUGF.black, { r: 0, seg: 0 });
  for (const dz of [-1.5, 1.5]) g.box(0.06, 1.0, 1.0, hx + fs * 1.71, y + 1.0, hz + dz, ZUGF.glow, { r: 0, seg: 0 });
  b.box(0.06, 1.9, 1.0, hx + fs * 1.71, y, hz, 0x7a4a2a, { r: 0, seg: 0 });
  b.box(0.08, 0.5, 2.8, hx + fs * 1.75, y + 2.3, hz, ZUGF.trim, { r: 0.03 });
  b.box(0.06, 0.36, 2.6, hx + fs * 1.79, y + 2.37, hz, ZUGF.lok, { r: 0.02 });
  // Bänke, Koffer, Laternen, Schild
  for (const z of [z0 - 4, z1 + 5]) { b.box(0.5, 0.45, 1.8, bh.x1 - 0.5, y, z, ZUGF.woodDk, { r: 0.05 }); b.box(0.1, 0.6, 1.8, bh.x1 - 0.3, y + 0.45, z, ZUGF.wood, { r: 0.03 }); }
  b.box(0.7, 0.5, 0.45, cx + 1.6, y, z0 - 7, 0x8a4a2a, { r: 0.06 }); b.box(0.5, 0.4, 0.35, cx + 1.6, y + 0.5, z0 - 7, 0x3a7ab8, { r: 0.05 });
  for (const z of [z0 - 1, cz, z1 + 1]) { b.cyl(0.07, 0.09, 2.6, bh.x1 - 0.3, y, z, ZUGF.black, 6); g.box(0.36, 0.44, 0.36, bh.x1 - 0.3, y + 2.6, z, ZUGF.glow, { r: 0.03 }); }
  b.box(0.12, 0.9, 3.4, bh.x1 - 0.1, y + 2.0, cz - 3, ZUGF.body, { r: 0.04 });
  b.box(0.14, 0.7, 3.2, bh.x1 - 0.12, y + 2.1, cz - 3, ZUGF.cream, { r: 0.03 });
  const grp = new THREE.Group();
  grp.name = 'bahnhof';
  const geo = b.geometry(), geo2 = g.geometry();
  if (geo) { const m = new THREE.Mesh(geo, level.view.mats.world); m.castShadow = true; m.receiveShadow = true; grp.add(m); }
  if (geo2) grp.add(new THREE.Mesh(geo2, level.view.mats.glow));
  grp.traverse((q) => { if (q.isMesh) q.userData.owned = true; });
  return grp;
}

// ------------------------------------------------------------------ Hebeblock

/**
 * Hebeblock (Bauplan 8-Zug „zweiter ?-Block im Mini-Pilzling-Raum ist ein Hebeblock – Stampfen fährt ihn zur Decke“): ?-Block,
 * der beim Stampfen von oben hinauffährt (trägt die Figur), oben hold s wartet und wieder hinabfährt. Kopfstoß von unten gibt
 * einmal content. Mit luke: { a, y, t } liegt über ihm eine Deckenluke (a × a, Unterkante y, Dicke t): geschlossen fest (von
 * unten kommt niemand hindurch), der fahrende Block stößt sie auf; sie schließt erst wieder, wenn der Block unten ist und
 * niemand mehr darüber bzw. im Lukenloch steckt. { pos: [x, y, z] (Mitte Unterseite), rise: 1.4, speed: 1.6, hold: 3.0,
 * content: 'coins:3', id, luke } → level.named { state ('unten'|'hoch'|'oben'|'runter'), lifts, h, y, lukeOpen, info() }.
 */
export function hebeblock(level, spec) {
  const p = { x: spec.pos[0], y: spec.pos[1], z: spec.pos[2] };
  const S = 1, rise = spec.rise ?? 1.4, speed = spec.speed ?? 1.6, hold = spec.hold ?? 3.0;
  const st = { state: 'unten', h: 0, t: 0, lifts: 0, used: false, bumpT: 0, open: false, k: 0 };
  const blk = new MovingBox(level, p.x, p.y, p.z, S, S, S, { tag: 'hebeblock' });
  const LK = spec.luke ?? null;
  const lukeShape = LK ? { type: 'box', min: [p.x - LK.a / 2, LK.y, p.z - LK.a / 2], max: [p.x + LK.a / 2, LK.y + (LK.t ?? 0.2), p.z + LK.a / 2], camIgnore: true, tag: 'luke' } : null;
  const lukeId = lukeShape ? level.world.add(lukeShape) : null;
  const setOpen = (open) => {
    if (!LK || open === st.open) return;
    st.open = open;
    level.world.update(lukeId, { solid: !open });
    level.sfx('door');
  };
  // steckt eine Figur über der Luke (Kuppel) oder im Lukenloch?
  const blocked = () => (level.players ?? [level.player]).some((f) => {
    if (!f || f.dead) return false;
    const dx = Math.abs(f.pos.x - p.x), dz = Math.abs(f.pos.z - p.z), r = LK.a / 2 + 0.6;
    return dx < r && dz < r && f.pos.y + 0.95 > LK.y - 0.05;
  });
  const handle = {
    get state() { return st.state; }, get lifts() { return st.lifts; }, get y() { return p.y + st.h; }, get h() { return st.h; },
    get lukeOpen() { return st.open; },
    info: () => ({ state: st.state, h: +st.h.toFixed(2), lifts: st.lifts, used: st.used, open: st.open }),
    onBump() {
      st.bumpT = 0.25;
      level.sfx('blockhit');
      if (!st.used) { st.used = true; runAction(level, spec.content ?? 'coins:3', { pos: [p.x, p.y + S + st.h + 0.2, p.z], source: handle, via: 'bump' }); }
    },
    onPound() {
      if (st.state !== 'unten') return;
      st.state = 'hoch'; st.t = 0; st.lifts++;
      setOpen(true);
      level.sfx('rumble'); level.shake?.(0.15);
    },
  };
  blk.shape.owner = handle;
  if (spec.id) level.named.set(spec.id, handle);
  level.onStep((dt) => {
    st.t += dt;
    if (st.state === 'hoch') { st.h = Math.min(rise, st.h + speed * dt); if (st.h >= rise) { st.state = 'oben'; st.t = 0; level.sfx('switch'); } }
    else if (st.state === 'oben') { if (st.t >= hold) { st.state = 'runter'; st.t = 0; } }
    else if (st.state === 'runter') { st.h = Math.max(0, st.h - speed * 0.7 * dt); if (st.h <= 0) { st.state = 'unten'; st.t = 0; } }
    if (st.state === 'unten' || st.state === 'oben') blk.still(); else blk.moveTo(p.x, p.y + st.h, p.z, dt);
    if (LK) setOpen(st.state !== 'unten' || blocked());
  });
  onRespawn(level, () => { st.state = 'unten'; st.h = 0; blk.moveTo(p.x, p.y, p.z, 1 / 120); blk.still(); if (LK) setOpen(false); });
  if (!level.view) return handle;
  const pool = level.view.pool('block:question', () => blockTemplate('question'), { castShadow: true, capacity: 32 });
  const idx = pool.alloc();
  // Lukenklappen (zwei Flügel, schwingen nach oben auf)
  const root = new THREE.Group();
  root.name = 'hebeblock';
  const flaps = [];
  if (LK) {
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 });
    for (const sx of [-1, 1]) {
      const hinge = new THREE.Group();
      hinge.position.set(p.x + sx * LK.a / 2, LK.y + (LK.t ?? 0.2), p.z);
      const fb = new Bld();
      fb.box(LK.a / 2 - 0.02, 0.1, LK.a - 0.04, -sx * (LK.a / 4), -0.11, 0, 0x8a5a30, { r: 0.02 });
      fb.box(0.12, 0.12, LK.a - 0.1, -sx * (LK.a / 2 - 0.08), -0.1, 0, ZUGF.trim, { r: 0.02 });
      for (let k = 1; k < 4; k++) fb.box(LK.a / 2 - 0.1, 0.02, 0.04, -sx * (LK.a / 4), -0.02, -LK.a / 2 + k * LK.a / 4, 0x6a4020, { r: 0, seg: 0 });
      hinge.add(new THREE.Mesh(fb.geometry(), mat));
      hinge.userData.sx = sx;
      root.add(hinge);
      flaps.push(hinge);
    }
  }
  const holder = {};
  addObject(level, root, (dt) => {
    const d = visDt(level, holder, dt);
    if (st.bumpT > 0) st.bumpT = Math.max(0, st.bumpT - d);
    const by = p.y + st.h + Math.sin((st.bumpT / 0.25) * Math.PI) * 0.2;
    pool.set(idx, p.x, by, p.z, 0, S);
    st.k = clamp(st.k + (st.open ? 1 : -1) * d * 3, 0, 1);
    const pl = level.player;
    root.visible = !pl || Math.abs(pl.pos.z - p.z) < 30;
    for (const f of flaps) f.rotation.z = -f.userData.sx * st.k * 1.9;
  });
  return handle;
}

// ------------------------------------------------------------------ Wagenreihe, Möbel, Kuppel, Bühne, Röhrendeckel

/**
 * Wagenreihe: list = [{ id, kind, len, … }] hintereinander ab z0 nach −Z mit Kupplungsabstand gap → dieselben Objekte mit z0/z1
 * und Mitte cz; byId.
 */
export function wagenreihe(list, z0 = 0, gap = 0.6) {
  let z = z0;
  const byId = {};
  for (const c of list) {
    c.z0 = z; c.z1 = z - c.len; c.cz = (c.z0 + c.z1) / 2;
    byId[c.id] = c;
    z = c.z1 - gap;
  }
  return { list, byId };
}

/**
 * Feste Kisten, Koffer, Möbel mit Kollision (Kamera darf hindurch): list = [{ pos: [x, y, z] (Mitte unten), size: [w, h, d],
 * kind: 'kiste'|'koffer'|'fass'|'sofa'|'klavier'|'sack', color, solid }].
 */
export function moebel(level, list, near = null) {
  const b = new Bld();
  for (const m of list) {
    const [x, y, z] = m.pos, [w, h, d] = m.size ?? [1, 1, 1];
    if (m.solid !== false) level.world.add({ type: 'box', min: [x - w / 2, y, z - d / 2], max: [x + w / 2, y + h, z + d / 2], camIgnore: true, tag: m.kind ?? 'kiste' });
    const kind = m.kind ?? 'kiste';
    if (kind === 'kiste') {
      b.box(w, h, d, x, y, z, m.color ?? 0xc8904a, { r: 0.05 });
      for (const sy of [0.08, h - 0.16]) b.box(w + 0.04, 0.08, d + 0.04, x, y + sy, z, 0x8a5a30, { r: 0.02 });
      b.box(w * 0.98, 0.07, 0.07, x, y + h / 2 - 0.035, z + d / 2 + 0.01, 0x8a5a30, { r: 0, seg: 0, rz: Math.atan2(h, w) });
    } else if (kind === 'koffer') {
      b.box(w, h, d, x, y, z, m.color ?? 0x8a4a2a, { r: 0.08 });
      b.box(w + 0.02, 0.06, d + 0.02, x, y + h * 0.5, z, ZUGF.trim, { r: 0.02 });
      b.box(w * 0.3, 0.1, 0.06, x, y + h, z, 0x3a2a20, { r: 0.02 });
    } else if (kind === 'fass') {
      b.cyl(w / 2, w / 2 * 0.9, h, x, y, z, m.color ?? 0x9a5a2e, 12);
      for (const sy of [0.15, h - 0.2]) b.cyl(w / 2 + 0.03, w / 2 + 0.03, 0.06, x, y + sy, z, 0x3a3040, 12);
    } else if (kind === 'sofa') {
      const c = m.color ?? 0xc83a5a, sx = Math.sign(m.back ?? -1);
      b.box(w, 0.45, d, x, y, z, 0x5a2a1a, { r: 0.05 });
      b.box(w * 0.92, 0.18, d * 0.94, x, y + 0.45, z, c, { r: 0.08 });
      b.box(0.22, 0.6, d, x + sx * (w / 2 - 0.11), y + 0.45, z, c, { r: 0.08 });
      for (const sz of [-1, 1]) b.box(w, 0.3, 0.2, x, y + 0.45, z + sz * (d / 2 - 0.1), c, { r: 0.08 });
    } else if (kind === 'klavier') {
      b.box(w, h, d, x, y, z, 0x1e1a26, { r: 0.06 });
      b.box(w + 0.04, 0.06, d + 0.04, x, y + h - 0.06, z, ZUGF.trim, { r: 0.02 });
      const ks = Math.sign(m.keys ?? 1), kx = x + ks * (w / 2 + 0.12);
      b.box(0.3, 0.1, d * 0.9, kx, y + h * 0.62, z, 0xffffff, { r: 0.02 });
      for (let i = 0; i < 7; i++) b.box(0.18, 0.06, 0.06, kx - ks * 0.05, y + h * 0.62 + 0.08, z - d * 0.4 + i * d * 0.13, 0x1e1a26, { r: 0, seg: 0 });
      b.box(0.06, 0.5, d * 0.5, x + ks * (w / 2 - 0.05), y + h, z, ZUGF.cream, { r: 0.02 });
    } else if (kind === 'sack') {
      b.sphere(w / 2, x, y + h * 0.45, z, m.color ?? 0xd8c8a0, { s: [1, h / w * 1.1, d / w] });
      b.cyl(0.08, 0.12, 0.25, x, y + h * 0.82, z, 0x8a6a4a, 6);
    }
  }
  if (near) near.put(b); else b.flush(level, { castShadow: true });
}

/**
 * Glaskuppel über einer Dachluke (dome aus baronZug: { x, z, K, top, KH }): Goldrahmen, Glasscheiben (durchscheinend, ein Mesh),
 * Spitze mit Goldknauf. Die Kollision der Kuppel legt baronZug an.
 */
export function glasKuppel(level, dome) {
  if (!level.view || !dome) return;
  const b = new Bld();
  const { x, z, K, top, KH } = dome;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(0.14, KH, 0.14, x + sx * (K + 0.06), top, z + sz * (K + 0.06), ZUGF.trim, { r: 0.03 });
  for (const sy of [0, KH - 0.1]) for (const [w, d, dx, dz] of [[2 * K + 0.3, 0.12, 0, K + 0.06], [2 * K + 0.3, 0.12, 0, -K - 0.06], [0.12, 2 * K + 0.3, K + 0.06, 0], [0.12, 2 * K + 0.3, -K - 0.06, 0]]) b.box(w, 0.1, d, x + dx, top + sy, z + dz, ZUGF.trim, { r: 0.02 });
  b.cone(K * 1.15, 1.1, x, top + KH, z, ZUGF.roofHi, 4, { yaw: Math.PI / 4 });
  b.sphere(0.28, x, top + KH + 1.2, z, ZUGF.trim);
  b.flush(level, { castShadow: true });
  const glass = new THREE.Mesh(new THREE.BoxGeometry(2 * K + 0.1, KH - 0.1, 2 * K + 0.1), new THREE.MeshStandardMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.22, roughness: 0.1, metalness: 0.2, depthWrite: false }));
  glass.position.set(x, top + KH / 2, z);
  glass.renderOrder = 3;
  glass.name = 'glaskuppel';
  glass.userData.owned = true;
  level.view.add(glass);
}

/** Wimpelketten: list = [{ a: [x, y, z], b: [x, y, z], n, sag: 0.4 }] – bunte Dreiecke an einer Schnur (statisch). */
export function wimpel(level, list, near = null) {
  const b = new Bld();
  const cols = [0xe83a5a, 0xffc83a, 0x4ab8ff, 0x8a5ae8, 0x5ad86a, 0xff8a3a];
  let k = 0;
  const at = (w, t) => [w.a[0] + (w.b[0] - w.a[0]) * t, w.a[1] + (w.b[1] - w.a[1]) * t - (w.sag ?? 0.4) * 4 * t * (1 - t), w.a[2] + (w.b[2] - w.a[2]) * t];
  for (const w of list) {
    const n = w.n ?? Math.max(4, Math.round(Math.hypot(w.b[0] - w.a[0], w.b[2] - w.a[2]) / 0.7));
    const yaw = Math.atan2(w.b[0] - w.a[0], w.b[2] - w.a[2]);
    for (let i = 0; i < n; i++) {
      const [x, y, z] = at(w, i / n), [x2, y2, z2] = at(w, (i + 1) / n);
      const L = Math.hypot(x2 - x, y2 - y, z2 - z);
      b.box(0.03, 0.03, L, (x + x2) / 2, (y + y2) / 2 - 0.015, (z + z2) / 2, 0x3a3040, { r: 0, seg: 0, yaw, rx: -Math.atan2(y2 - y, Math.hypot(x2 - x, z2 - z)) });
      b.cone(0.17, 0.42, (x + x2) / 2, (y + y2) / 2 - 0.44, (z + z2) / 2, cols[k++ % cols.length], 3, { rx: Math.PI, yaw: yaw + Math.PI / 2 });
    }
  }
  if (near) near.put(b, 'world', false); else b.flush(level, { castShadow: false });
}

/**
 * Drehbühne auf dem Schwerlastwagen (Bossarena 8-Zug): runde Bühne (Oberseite y, Radius r) mit Gold-Geländer, Glühbirnen-
 * masten und Wimpelketten; Kollision: Boden (cyl), Ring aus Stäben bis y + 5 (camIgnore), Decke y + 6,4. Fahrgestell darunter.
 * Rückgabe { wheels } (für die Fahrt-Illusion).
 */
export function buehne(level, { x, y, z, r, near = null }) {
  level.world.add({ type: 'cyl', x, z, r: r + 0.5, y0: y - 0.6, y1: y, tag: 'buehne' });
  const N = Math.ceil((TAU * r) / 0.9);
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU;
    level.world.add({ type: 'cyl', x: x + Math.sin(a) * (r + 0.2), z: z + Math.cos(a) * (r + 0.2), r: 0.3, y0: y, y1: y + 5, camIgnore: true, noWallSlide: true, tag: 'buehne-rand' });
  }
  level.world.add({ type: 'box', min: [x - r - 1, y + 6.4, z - r - 1], max: [x + r + 1, y + 6.9, z + r + 1], camIgnore: true, tag: 'buehne-decke' });
  const wheels = [];
  const b = new Bld(), g = new Bld();
  // Fahrgestell, Drehgestelle, Säule unter der Scheibe
  b.box(3.1, 0.5, 2 * r + 0.8, x, 0.55, z, ZUGF.frame, { r: 0.06 });
  for (const bz of [z + r - 1.2, z + r - 3.6, z - r + 3.6, z - r + 1.2]) {
    b.box(1.9, 0.3, 2.0, x, 0.32, bz, ZUGF.black, { r: 0.05 });
    for (const az of [bz - 0.62, bz + 0.62]) for (const sx of [-1, 1]) wheels.push([x + sx * 0.86, 0.42, az]);
  }
  b.cyl(1.2, 1.6, y - 1.65, x, 1.05, z, ZUGF.frame, 16);
  // Bühnenscheibe: Holzrand mit Goldkante, Ringe, Stern in der Mitte
  b.cyl(r + 0.5, r + 0.3, 0.6, x, y - 0.6, z, { v: (px, py) => (py > y - 0.1 ? 0x8a5a30 : 0x6a3e22) }, 48);
  b.cyl(r + 0.56, r + 0.56, 0.1, x, y - 0.12, z, ZUGF.trim, 48);
  const rings = [[r + 0.45, 0xf3e6c8], [r - 0.6, 0xc83a5a], [r - 2.6, 0xf3e6c8], [4.4, 0x8a5ae8], [2.4, 0xffd85a]];
  rings.forEach(([rr, c], i) => b.cyl(rr, rr, 0.02, x, y + 0.004 * i, z, c, 48));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    b.box(0.5, 0.02, 2.0, x + Math.sin(a) * 1.0, y + 0.03, z + Math.cos(a) * 1.0, 0xff9a3a, { r: 0, seg: 0, yaw: a });
  }
  // Geländer: niedrige Pfosten und Goldreif; hohe Glühbirnenmasten mit Wimpeln dazwischen
  for (let i = 0; i < 36; i++) { const a = (i / 36) * TAU; b.cyl(0.05, 0.05, 1.0, x + Math.sin(a) * (r + 0.2), y, z + Math.cos(a) * (r + 0.2), ZUGF.trim, 6); }
  b.torus(r + 0.2, 0.07, x, y + 1.0, z, ZUGF.trim, { rx: Math.PI / 2, rs: 5, ts: 64 });
  const masts = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU + 0.31;
    const mx = x + Math.sin(a) * (r + 0.35), mz = z + Math.cos(a) * (r + 0.35);
    b.cyl(0.09, 0.12, 4.6, mx, y, mz, 0x3a2a4a, 8);
    b.sphere(0.2, mx, y + 4.7, mz, ZUGF.trim);
    for (let k = 1; k <= 4; k++) g.sphere(0.11, mx + Math.sin(a) * 0.1, y + k * 1.0, mz + Math.cos(a) * 0.1, k % 2 ? 0xffe08a : 0xff8ac8);
    masts.push([mx, y + 4.5, mz]);
  }
  if (near) { near.put(b); near.put(g, 'glow'); } else {
    b.flush(level, { castShadow: true });
    g.flush(level, { material: 'glow', castShadow: false });
  }
  wimpel(level, masts.map((m, i) => ({ a: m, b: masts[(i + 1) % masts.length], sag: 0.6 })), near);
  glowPoints(level, masts.map((m) => [m[0], m[1] - 1.5, m[2], 1.6]), { color: 0xffc8a0, opacity: 0.4, pulse: 0.6 });
  return { wheels };
}

/**
 * Röhrendeckel: die Röhre pipeId nimmt erst nach dem Signal reveal (Autoscroller reveal: [{ id: deckelId, at: 'done' }]) auf;
 * bis dahin liegt ein roter Deckel mit Goldstern darauf (springt beim Öffnen hoch und kippt weg). → level.named deckelId
 * { open, reveal() }.
 */
export function roehrenDeckel(level, pipeId, deckelId, o = {}) {
  const info = level.named.get(pipeId);
  if (!info) return null;
  const st = { open: false, t: 0 };
  const enter = info.enter;
  info.enter = (player) => { if (!st.open) { level.sfx('bump'); return; } enter(player); };
  const handle = {
    get open() { return st.open; },
    reveal() { if (st.open) return; st.open = true; st.t = 0; level.sfx('door'); level.effects?.sparks({ x: info.x, y: info.top + 0.4, z: info.z }, 14); },
  };
  level.named.set(deckelId, handle);
  onRespawn(level, () => { if (level.scroll && level.scroll.state !== 'done') { st.open = false; st.t = 0; } });
  if (!level.view) return handle;
  const R = o.radius ?? 0.9;
  const lb = new Bld();
  lb.cyl(R * 0.98, R * 0.98, 0.16, 0, 0, 0, 0xc4304e, 24);
  lb.cyl(R * 0.42, R * 0.42, 0.04, 0, 0.16, 0, ZUGF.trim, 5);
  lb.sphere(0.12, 0, 0.24, 0, ZUGF.trim, { ws: 6, hs: 4 });
  const lid = new THREE.Mesh(lb.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45 }));
  lid.castShadow = true;
  lid.position.set(info.x, info.top, info.z);
  lid.name = 'roehrendeckel';
  const holder = {};
  addObject(level, lid, (dt) => {
    const d = visDt(level, holder, dt);
    if (!st.open) { lid.visible = true; lid.position.set(info.x, info.top, info.z); lid.rotation.set(0, 0, 0); return; }
    st.t += d;
    const t = st.t;
    lid.visible = t < 1.6;
    lid.position.set(info.x + t * 1.6, info.top + 3.2 * t - 4.5 * t * t, info.z);
    lid.rotation.z = -t * 3;
  });
  return handle;
}

/**
 * Feuerwerk am Abendhimmel (nur Darstellung, im gemeinsamen Leuchtfeld – 0 zusätzliche Zeichenaufrufe): slots Raketen steigen
 * abwechselnd seitlich vor der Figur auf und zerplatzen in sparks Funken (je Rakete eine Farbe), die auseinanderfliegen,
 * sinken und verglühen. o = { slots: 5, sparks: 20, size: 3.2, colors }.
 */
export function feuerwerk(level, o = {}) {
  const field = glowField(level);
  if (!field) return;
  const K = o.slots ?? 5, per = o.sparks ?? 20, RISE = 1.0, BURST = 1.8;
  const cols = o.colors ?? [0xff6a9a, 0xffd84a, 0x6ad8ff, 0xb48aff, 0x7aff9a];
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let k = 0; k < K; k++) {
    const st = { t: -0.4 - k * 1.1, x: 0, y: 30, z: -60, dirs: [] };
    const aim = () => {
      const p = level.player?.pos ?? { x: 0, z: 0 };
      st.x = p.x + (rnd() < 0.5 ? -1 : 1) * (16 + rnd() * 46);
      st.z = p.z - 30 - rnd() * 70;
      st.y = 20 + rnd() * 16;
    };
    aim();
    for (let i = 0; i < per; i++) {
      const a = rnd() * TAU, e = (rnd() - 0.35) * 1.4;
      st.dirs.push([Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)]);
    }
    const d = field.alloc(per + 1, { color: cols[k % cols.length], size: o.size ?? 3.2, opacity: 0.95 }, (dt) => {
      st.t += Math.min(0.1, dt || 0);
      if (st.t < 0) { for (let i = 0; i <= per; i++) d.hide(i); return; }
      if (st.t >= RISE + BURST) { st.t = -(0.8 + rnd() * 2.4); aim(); for (let i = 0; i <= per; i++) d.hide(i); return; }
      if (st.t < RISE) {
        const u = st.t / RISE;
        d.set(0, st.x, -14 + (st.y + 14) * (1 - (1 - u) * (1 - u)), st.z);
        for (let i = 1; i <= per; i++) d.hide(i);
        return;
      }
      d.hide(0);
      const u = (st.t - RISE) / BURST, r = 8 * (1 - Math.pow(1 - u, 2.4)), fall = 5 * u * u;
      for (let i = 0; i < per; i++) {
        if (u > 0.7 + (i % 4) * 0.08) { d.hide(i + 1); continue; }
        const q = st.dirs[i];
        d.set(i + 1, st.x + q[0] * r, st.y + q[1] * r - fall, st.z + q[2] * r);
      }
    });
  }
}

/**
 * Gruppe für einen weit voraus liegenden Bereich (z. B. die Arena 250 m vor dem Zug): wird nur gezeichnet, solange die Figur
 * näher als r m (in z) ist – statt im statischen Verschmelzen, das nach Entfernung nicht ausblendet. put(bld, 'world'|'glow',
 * castShadow) legt die Geometrie eines Sammlers als eigenes Mesh hinein.
 */
export function nahGruppe(level, z0, r) {
  if (!level.view) return null;
  const group = new THREE.Group();
  group.name = 'nahgruppe';
  level.view.add(group);
  level.view.onFrame(() => { const p = level.player; group.visible = !p || Math.abs(p.pos.z - z0) < r; });
  const put = (bld, mat = 'world', cast = true) => {
    const geo = bld.geometry();
    if (!geo) return null;
    const m = new THREE.Mesh(geo, mat === 'glow' ? level.view.mats.glow : level.view.mats.world);
    m.castShadow = cast && mat !== 'glow';
    m.receiveShadow = mat !== 'glow';
    m.userData.owned = true;
    group.add(m);
    return m;
  };
  return { group, put };
}
