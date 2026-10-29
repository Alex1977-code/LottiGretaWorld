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
    b.box(w + 0.12, 0.28, d + 0.12, cx, m.y1 - 0.2, cz, FLUT.moss, { r: 0.1 });
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
