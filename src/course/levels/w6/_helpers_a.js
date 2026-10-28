// Hilfen für die Welt-6-Level 6-1 „Röhrenreise über die Wolkengipfel“, 6-B „Werfer-Wirbel im Steinkreis“ und
// 6-2 „Schaukelschiffe im Nebelmeer“ (kein Level: exportiert kein LEVEL, die Level-Registry überspringt dieses Modul).
// Andere Welt-6-Level-Agenten haben eigene Hilfsdateien – hier nur, was diese drei Level brauchen.
//
// Oben reine Daten-Helfer (Inseln, Münzspuren – aus Welt 5 übernommen), darunter level-lokale Kulisse und kleine
// Mechanik, die es als Baustein nicht gibt. Statische Zier entsteht im Aufbau-Haken `LEVEL.build` (vor dem Verschmelzen:
// landet in den Abschnitts-Meshes, 0 zusätzliche Zeichenaufrufe); Belebtes (Vögel, Ballon, Fahnen, Wolken) ist je ein
// Mesh ohne Sonnenschatten und wird in `LEVEL.setup` angemeldet.
//
// 6-1 Bergland:  gipfel (Felsflanke eines Gipfels bis ins Wolkenmeer), grat (Felsgrat/Stufe), bergwiese (Grasflecken,
//   Alpenblumen, Steinchen), trockenmauer (niedrige Steinmauer mit Kollision – hält auch hüpfende Funkelsterne),
//   glasgang (Glasröhre zum Durchlaufen mit Decke – Stern zwischen zwei Stachelkugeln), almhuette, kuehe, murmeltiere,
//   gipfelfahne, wimpelkette, vogelschwarm, ballon, wolkenkranz (Wolkenkragen um einen Gipfel), lochinsel.

import * as THREE from 'three';
import { colorize, merge, lin, mixc, smooth, hex, addStatic, addObject, Rnd } from '../../blocks/kit.js';
import { visDt } from '../../entities/gimmick.js';
import { Bld, litTop, gradY, rectPoly, cliffSkirt, savannaFloor } from '../w5/_helpers_b.js';

export { isl, line, ring, arc, column, rectPoly, Bld, litTop, gradY } from '../w5/_helpers_b.js';

const TAU = Math.PI * 2;

// =====================================================================================================================
// 6-1 Glasröhren-Bergland
// =====================================================================================================================

/** Bänder des Bergfelsens (hellgrau-lavendel wie das Thema clearpipe). */
export const ALP_BANDS = [0xa29eb8, 0x928ea8, 0xb0acc4, 0x86829c, 0xbab6cc, 0x9894ae];

/**
 * Felsflanke eines Gipfels: senkrecht gebänderter Bergfels rund um das Rechteck x0..x1 × zA..zB von top bis bottom,
 * nach unten breiter (flare m je m) – nur Darstellung (Kollision liefert die Insel). o: { bottom −34, flare 0.14, ch 1.2,
 * seed, shadow, colors, poly (eigener Umriss [[x, z], …]) }.
 */
export function gipfel(level, x0, x1, zA, zB, top, o = {}) {
  const poly = o.poly ?? rectPoly(x0, x1, zA, zB, o.ch ?? 1.2);
  cliffSkirt(level, poly, top, o.bottom ?? -34, { colors: o.colors ?? ALP_BANDS, flare: o.flare ?? 0.14, band: o.band ?? 2.2, step: o.step ?? 1.7, seed: o.seed ?? 5, shadow: o.shadow });
}

/** Felsstufe zwischen zwei Ebenen (senkrecht, kaum ausladend): Rechteck, top → bottom. */
export function grat(level, x0, x1, zA, zB, top, bottom, o = {}) {
  cliffSkirt(level, o.poly ?? rectPoly(x0, x1, zA, zB, o.ch ?? 0.6), top, bottom, { colors: o.colors ?? ALP_BANDS, flare: o.flare ?? 0.02, band: 1.8, step: 1.4, seed: o.seed ?? 9, shadow: o.shadow });
}

const MEADOW = [0x6cd24c, 0x5ec442, 0x7ede5a, 0x8ae262, 0x58b83e, 0x98e46e, 0x74cc50];
const ALP_FLOWERS = [0xffffff, 0xffe04a, 0x4a6aff, 0xff8ac8, 0xb07aff, 0xff5a5a];

/** Bergwiese: Grasflecken, Alpenblumen (Enzianblau, Edelweiß-Weiß …), runde Polster. rects: [[x0, x1, zA, zB, top, n], …]. */
export function bergwiese(level, rects, o = {}) {
  savannaFloor(level, rects, { palette: MEADOW, flowers: ALP_FLOWERS, bushes: false, seed: o.seed ?? 61, avoid: o.avoid });
  if (!level.view) return;
  // Polsterkissen (rosa Moospolster) und Steinchen
  const rnd = new Rnd(o.seed2 ?? 17);
  const b = new Bld();
  const avoid = o.avoid ?? [];
  const free = (x, z, r) => !avoid.some((a) => Math.hypot(a[0] - x, a[1] - z) < (a[2] ?? 1.5) + r);
  for (const [x0, x1, zA, zB, top, n] of rects) {
    const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
    for (let i = 0; i < Math.round(n * 0.35); i++) {
      const x = rnd.real(x0 + 1, x1 - 1), z = rnd.real(z1 + 1, z0 - 1);
      if (!free(x, z, 0.6)) continue;
      if (i % 3 === 0) b.sphere(rnd.real(0.25, 0.42), x, top + 0.05, z, litTop(0xb4b0c4), { s: [1, 0.55, 0.85], ws: 7, hs: 5 });
      else {
        const s = rnd.real(0.3, 0.5);
        b.sphere(s, x, top + 0.02, z, litTop(0x5aa83e), { s: [1, 0.45, 1], ws: 8, hs: 5 });
        for (let k = 0; k < 5; k++) { const a = k * 1.26 + i; b.sphere(0.06, x + Math.cos(a) * s * 0.6, top + s * 0.4, z + Math.sin(a) * s * 0.6, i % 2 ? 0xff7ab8 : 0xffffff, { ws: 4, hs: 3 }); }
      }
    }
  }
  b.flush(level, { castShadow: false });
}

/** Steinpfad (graue Trittplatten) entlang pts [[x, z], …] auf Höhe top. */
export function steinpfad(level, pts, top, o = {}) {
  if (!level.view) return;
  const b = new Bld();
  const step = o.step ?? 1.05, w = o.w ?? 0.9;
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.floor(L / step));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n, off = (k % 2 ? 0.2 : -0.2) * w;
      const nx = -(bz - az) / L, nz = (bx - ax) / L;
      const x = ax + (bx - ax) * t + nx * off, z = az + (bz - az) * t + nz * off;
      b.cyl(w * 0.42, w * 0.46, 0.06, x, top - 0.01, z, litTop((i + k) % 3 ? 0xd4d0dc : 0xbcb8c8), 7, { yaw: k * 0.7 });
    }
  }
  b.flush(level, { castShadow: false });
}

/**
 * Trockenmauer: niedrige Mauer aus runden Steinen von a nach b ([x, z]) auf Höhe y (Kollision h m hoch, Standard 1,1 –
 * hält hüpfende Funkelsterne und Wurfbälle auf, die Figur springt leicht darüber).
 */
export function trockenmauer(level, a, b, y, o = {}) {
  const h = o.h ?? 1.1, t = o.t ?? 0.7;
  const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
  const ax = Math.abs(dx) > Math.abs(dz);
  if (ax) level.world.add({ type: 'box', min: [Math.min(a[0], b[0]), y, a[1] - t / 2], max: [Math.max(a[0], b[0]), y + h, a[1] + t / 2], tag: 'mauer' });
  else level.world.add({ type: 'box', min: [a[0] - t / 2, y, Math.min(a[1], b[1])], max: [a[0] + t / 2, y + h, Math.max(a[1], b[1])], tag: 'mauer' });
  if (!level.view) return;
  const rnd = new Rnd(o.seed ?? Math.round(Math.abs(a[0] * 7 + a[1] * 3)) + 3);
  const bb = new Bld();
  const rows = Math.max(2, Math.round(h / 0.38));
  for (let r = 0; r < rows; r++) {
    for (let s = (r % 2) * 0.3; s < L; s += 0.62) {
      const k = s / L, x = a[0] + dx * k, z = a[1] + dz * k;
      const sz = rnd.real(0.3, 0.4);
      bb.sphere(sz, x + rnd.real(-0.06, 0.06), y + 0.2 + r * (h - 0.2) / rows, z + rnd.real(-0.06, 0.06), litTop(rnd.frac() < 0.5 ? 0xc0bcc8 : 0xa8a4b4), { s: [1.15, 0.72, 1], ws: 7, hs: 5, yaw: rnd.real(0, 3) });
    }
  }
  // Moos obenauf
  for (let s = 0.2; s < L; s += 0.9) { const k = s / L; bb.sphere(0.22, a[0] + dx * k, y + h - 0.02, a[1] + dz * k, 0x6ab84a, { s: [1.4, 0.4, 1.1], ws: 6, hs: 4 }); }
  bb.flush(level);
}

/**
 * Glasgang: liegende Glasröhre zum Durchlaufen (Bauplan 6-1 „Glasröhre zwischen zwei Stachelkugeln“). Entlang X (a, b =
 * x-Werte bei z) oder Z (axis 'z': a, b = z-Werte bei x) auf Boden y; Innenmaß 1,8 m breit, Decke 1,95 m (so hoch, dass
 * niemand über eine Stachelkugel springen kann). Kollision: Seitenwände, Decke und die geschlossenen Enden (closed: ['a'] |
 * ['b'] | beide), alles camIgnore. Darstellung: Glasmantel (durchscheinend, wie die Glasröhren), weiße Ringe, Kappen.
 */
export function glasgang(level, o) {
  const zAxis = o.axis === 'z';
  const { y } = o;
  const c0 = zAxis ? o.x : o.z;                       // Querlage (Mitte)
  const W = 0.9, H = 1.95, R = 1.22, cy = y + 0.74;
  const lo = Math.min(o.a, o.b), hi = Math.max(o.a, o.b);
  const closed = (o.closed ?? []).map((e) => (e === 'a' ? o.a : o.b));
  // Quader in Achs-/Querkoordinaten → Welt
  const add = (l0, l1, q0, q1, y0, y1) => level.world.add({
    type: 'box', min: zAxis ? [q0, y0, l0] : [l0, y0, q0], max: zAxis ? [q1, y1, l1] : [l1, y1, q1], camIgnore: true, noWallSlide: true, tag: 'glasgang',
  });
  add(lo, hi, c0 - W - 0.3, c0 - W, y, y + H + 0.3);
  add(lo, hi, c0 + W, c0 + W + 0.3, y, y + H + 0.3);
  add(lo, hi, c0 - W, c0 + W, y + H, y + H + 0.4);
  for (const e of closed) add(e - 0.15, e + 0.15, c0 - W, c0 + W, y, y + H);
  if (!level.view) return;
  const L = hi - lo, mid = (lo + hi) / 2;
  const tube = new THREE.CylinderGeometry(R, R, L, 26, 1, true);
  if (zAxis) { tube.rotateX(Math.PI / 2); tube.translate(c0, cy, mid); } else { tube.rotateZ(Math.PI / 2); tube.translate(mid, cy, c0); }
  const parts = [tube.toNonIndexed()];
  for (const e of closed) {
    const cap = new THREE.CircleGeometry(R, 26);
    if (zAxis) cap.translate(c0, cy, e); else { cap.rotateY(Math.PI / 2); cap.translate(e, cy, c0); }
    parts.push(cap.toNonIndexed());
  }
  const g = merge(parts.map((x) => { for (const k of Object.keys(x.attributes)) if (k !== 'position' && k !== 'normal') x.deleteAttribute(k); return x; }));
  const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.3, roughness: 0.05, metalness: 0.05, side: THREE.DoubleSide, depthWrite: false, emissive: 0x0a2a3a }));
  mesh.renderOrder = 2;
  mesh.name = 'glasgang';
  addObject(level, mesh);
  const b = new Bld();
  const P3 = (l, q, yy) => (zAxis ? [q, yy, l] : [l, yy, q]);
  const ringYaw = zAxis ? 0 : Math.PI / 2;
  const nR = Math.max(1, Math.round(L / 2.2));
  for (let i = 0; i <= nR; i++) { const q = P3(lo + (L * i) / nR, c0, cy); b.torus(R + 0.03, 0.06, q[0], q[1], q[2], 0xf0f8ff, { yaw: ringYaw, rs: 6, ts: 26 }); }
  for (const e of [lo, hi]) if (!closed.includes(e)) { const q = P3(e, c0, cy); b.torus(R + 0.06, 0.12, q[0], q[1], q[2], 0xffffff, { yaw: ringYaw, rs: 6, ts: 26 }); }
  // Glanzstreifen oben, Sockelleisten (Metall)
  let q = P3(mid, c0 - 0.35, cy + R * 0.93); b.box(zAxis ? 0.08 : L, 0.05, zAxis ? L : 0.08, q[0], q[1], q[2], 0xffffff, { r: 0 });
  for (const sd of [-1, 1]) { q = P3(mid, c0 + sd * (W + 0.12), y - 0.02); b.box(zAxis ? 0.2 : L, 0.16, zAxis ? L : 0.2, q[0], q[1], q[2], litTop(0x8aa0b8), { r: 0.04 }); }
  b.flush(level, { castShadow: false });
}

/** Insel mit einem Loch (für senkrechte Röhren-Ausgänge): Rechteck x0..x1 × zA..zB, Loch (hx, hz, r) – vier Quader. */
export function lochinsel(x0, x1, zA, zB, top, h, hole, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  const [hx, hz, r] = hole;
  const box = (a, b, c, d) => ({ type: 'island', pos: [(a + b) / 2, top - h, (c + d) / 2], size: [b - a, h, c - d], under: o.under ?? 0, top: o.top });
  return [box(x0, x1, z0, hz + r), box(x0, x1, hz - r, z1), box(x0, hx - r, hz + r, hz - r), box(hx + r, x1, hz + r, hz - r)];
}

/** Almhütte (Holz, Steinsockel, rotes Dach, Blumenkasten) – mit fester Kollision. */
export function almhuette(level, x, y, z, o = {}) {
  const s = o.size ?? 1, yaw = o.yaw ?? 0;
  const W = 4.2 * s, D = 3.4 * s, H = 2.4 * s;
  const c = Math.cos(yaw), sn = Math.sin(yaw);
  const hw = (Math.abs(c) * W + Math.abs(sn) * D) / 2, hd = (Math.abs(sn) * W + Math.abs(c) * D) / 2;
  level.world.add({ type: 'box', min: [x - hw, y, z - hd], max: [x + hw, y + H + 0.4 * s, z + hd], tag: 'huette' });
  if (!level.view) return;
  const b = new Bld();
  const P = (lx, lz) => [x + lx * c + lz * sn, z - lx * sn + lz * c];
  const at = (lx, ly, lz) => { const [px, pz] = P(lx, lz); return [px, y + ly, pz]; };
  let q = at(0, 0, 0); b.box(W + 0.2, 0.45 * s, D + 0.2, q[0], q[1], q[2], litTop(0x9a96a8), { yaw, r: 0.08 });
  q = at(0, 0.45 * s, 0); b.box(W, H - 0.45 * s, D, q[0], q[1], q[2], litTop(0xb87a44), { yaw, r: 0.06 });
  for (let i = 0; i < 5; i++) { q = at(0, 0.7 * s + i * 0.36 * s, D / 2 + 0.01); b.box(W - 0.05, 0.05, 0.04, q[0], q[1], q[2], 0x7a4a26, { yaw, r: 0 }); }
  // Fenster mit Läden und Blumenkasten
  for (const sx of [-1, 1]) {
    q = at(sx * W * 0.26, 1.15 * s, D / 2 + 0.03); b.box(0.7 * s, 0.7 * s, 0.05, q[0], q[1], q[2], 0x5ab4ff, { yaw, r: 0.02 });
    q = at(sx * W * 0.26 - 0.5 * s, 1.15 * s, D / 2 + 0.05); b.box(0.28 * s, 0.74 * s, 0.05, q[0], q[1], q[2], 0x3a8a3a, { yaw, r: 0.02 });
    q = at(sx * W * 0.26 + 0.5 * s, 1.15 * s, D / 2 + 0.05); b.box(0.28 * s, 0.74 * s, 0.05, q[0], q[1], q[2], 0x3a8a3a, { yaw, r: 0.02 });
    q = at(sx * W * 0.26, 0.95 * s, D / 2 + 0.16); b.box(0.86 * s, 0.18 * s, 0.22 * s, q[0], q[1], q[2], 0x8a5a2a, { yaw, r: 0.02 });
    for (let k = 0; k < 5; k++) { q = at(sx * W * 0.26 - 0.32 * s + k * 0.16 * s, 1.18 * s, D / 2 + 0.18); b.sphere(0.08 * s, q[0], q[1], q[2], k % 2 ? 0xff3a5a : 0xffffff, { ws: 5, hs: 4 }); }
  }
  // Tür
  q = at(0, 0.45 * s, D / 2 + 0.02); b.box(0.8 * s, 1.5 * s, 0.06, q[0], q[1], q[2], litTop(0x7a4a26), { yaw, r: 0.03 });
  // Satteldach (zwei geneigte Platten) und Schornstein
  for (const sx of [-1, 1]) {
    q = at(sx * W * 0.27, H + 0.55 * s, 0);
    b.box(W * 0.62, 0.16 * s, D + 0.7 * s, q[0], q[1] - 0.08 * s, q[2], litTop(0xd83a2a), { yaw, rz: -sx * 0.5 * Math.cos(yaw), rx: sx * 0.5 * Math.sin(yaw), r: 0.03 });
  }
  q = at(-W * 0.24, H + 0.4 * s, -D * 0.2); b.box(0.42 * s, 1.1 * s, 0.42 * s, q[0], q[1], q[2], litTop(0xb8b4c4), { yaw, r: 0.04 });
  // Giebel (Dreieck vorn/hinten)
  for (const sz of [-1, 1]) {
    const g = new THREE.BufferGeometry();
    const A = at(-W / 2, H, sz * D / 2), B = at(W / 2, H, sz * D / 2), C = at(0, H + 1.15 * s, sz * D / 2);
    g.setAttribute('position', new THREE.Float32BufferAttribute([...A, ...(sz > 0 ? B : C), ...(sz > 0 ? C : B)], 3));
    g.computeVertexNormals();
    b.add(g, 0xa8683a);
  }
  // Holzbank davor
  q = at(W * 0.15, 0, D / 2 + 0.8); b.box(1.4 * s, 0.45 * s, 0.38 * s, q[0], q[1], q[2], litTop(0x9a6a3a), { yaw, r: 0.04 });
  b.flush(level);
}

/** Kühe auf der Weide (statisch, mit Glocke): list [[x, y, z, yaw, size], …]. */
export function kuehe(level, list) {
  if (!level.view) return;
  const b = new Bld();
  for (const [x, y, z, yaw = 0, s = 1] of list) {
    const c = Math.cos(yaw), sn = Math.sin(yaw);
    const at = (lx, ly, lz) => [x + (lx * c + lz * sn) * s, y + ly * s, z + (-lx * sn + lz * c) * s];
    let q = at(0, 0.62, 0); b.box(1.5 * s, 0.78 * s, 0.82 * s, q[0], q[1], q[2], litTop(0xf6f4ef), { yaw, r: 0.28 * s });
    for (const [lx, ly, lz, w, h, d] of [[-0.25, 0.95, 0.42, 0.5, 0.4, 0.02], [0.3, 1.08, -0.42, 0.42, 0.34, 0.02], [-0.45, 1.25, 0, 0.36, 0.02, 0.4]]) { q = at(lx, ly, lz); b.box(w * s, h * s + 0.02, d * s + 0.02, q[0], q[1], q[2], 0x3a2e2a, { yaw, r: 0.02 }); }
    for (const [lx, lz] of [[0.52, 0.26], [0.52, -0.26], [-0.52, 0.26], [-0.52, -0.26]]) { q = at(lx, 0, lz); b.box(0.17 * s, 0.66 * s, 0.17 * s, q[0], q[1], q[2], 0xf0eee8, { yaw, r: 0.05 }); q = at(lx, 0, lz); b.box(0.19 * s, 0.1 * s, 0.19 * s, q[0], q[1], q[2], 0x3a2a2a, { yaw, r: 0.03 }); }
    q = at(0.95, 0.98, 0); b.box(0.52 * s, 0.5 * s, 0.5 * s, q[0], q[1], q[2], litTop(0xf6f4ef), { yaw, r: 0.18 * s });
    q = at(1.22, 0.96, 0); b.box(0.24 * s, 0.3 * s, 0.42 * s, q[0], q[1], q[2], 0xffb8c0, { yaw, r: 0.1 * s });
    for (const sz of [-1, 1]) { q = at(0.9, 1.48, sz * 0.2); b.cone(0.05 * s, 0.22 * s, q[0], q[1], q[2], 0xf0e6c8, 6, { rx: sz * 0.5 * Math.cos(yaw), rz: sz * 0.5 * Math.sin(yaw) }); q = at(0.98, 1.3, sz * 0.34); b.sphere(0.1 * s, q[0], q[1], q[2], 0xf6f4ef, { s: [0.6, 0.4, 1], ws: 5, hs: 4 }); }
    for (const sz of [-1, 1]) { q = at(1.1, 1.12, sz * 0.18); b.sphere(0.06 * s, q[0], q[1], q[2], 0x1a1a22, { ws: 5, hs: 4 }); }
    q = at(0.72, 0.62, 0); b.cyl(0.11 * s, 0.14 * s, 0.2 * s, q[0], q[1], q[2], 0xffc21a, 8);
    q = at(-0.78, 0.4, 0); b.cyl(0.03 * s, 0.03 * s, 0.55 * s, q[0], q[1], q[2], 0xf0eee8, 4, { rz: 0.4 });
  }
  b.flush(level);
}

/** Gipfelfahne: Mast mit wehender Fahne (bewegt) – list [[x, y, z, farbe, höhe], …]. Ein Mesh für alle Fahnen. */
export function gipfelfahnen(level, list) {
  const v = level.view;
  if (!v) return;
  const b = new Bld();
  for (const [x, y, z, , h = 4] of list) {
    b.cyl(0.06, 0.08, h, x, y, z, 0xe8ecf4, 6);
    b.sphere(0.11, x, y + h + 0.05, z, 0xffd23a, { ws: 6, hs: 4 });
    b.cyl(0.4, 0.5, 0.25, x, y, z, litTop(0x9a96a8), 8);
  }
  b.flush(level);
  // Fahnentücher: gemeinsames Mesh, Ecken wehen im Wind (Vertex-Animation je Bild)
  const pos = [], col = [], base = [];
  const c = new THREE.Color();
  const NX = 6, NY = 3, FW = 1.4, FH = 0.85;
  for (const [x, y, z, color = 0xe8283a, h = 4] of list) {
    c.set(color);
    const c2 = c.clone().lerp(new THREE.Color(0xffffff), 0.35);
    const grid = (i, j) => [x + (i / NX) * FW, y + h - 0.1 - (j / NY) * FH, z];
    for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) {
      const A = grid(i, j), B = grid(i + 1, j), C = grid(i + 1, j + 1), D = grid(i, j + 1);
      const cc = (i + j) % 2 ? c : (j === 1 ? c2 : c);
      for (const q of [A, D, B, B, D, C]) { pos.push(...q); col.push(cc.r, cc.g, cc.b); base.push(q[0] - x, q[2]); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.7 }));
  mesh.name = 'gipfelfahnen';
  mesh.frustumCulled = false;
  const P = g.attributes.position;
  const hv = {};
  let t = 0;
  addObject(level, mesh, (dt) => {
    t += visDt(level, hv, dt);
    for (let k = 0; k < P.count; k++) {
      const u = base[k * 2];
      P.setZ(k, base[k * 2 + 1] + Math.sin(t * 5 + u * 3.2) * 0.16 * (u / FW));
    }
    P.needsUpdate = true;
  });
}

/** Wimpelkette von a nach b ([x, y, z]) mit Durchhang sag. */
export function wimpelkette(level, a, b, n = 12, sag = 0.6) {
  if (!level.view) return;
  const bb = new Bld();
  const cols = [0xff4a3d, 0xffd23d, 0x3d8bff, 0x4fd04a, 0xff7ac0, 0xffffff];
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - 4 * sag * t * (1 - t), a[2] + (b[2] - a[2]) * t]);
  }
  bb.tube(pts, 0.02, 0x6a5a4a, null, n * 3, 4);
  const yaw = Math.atan2(-(b[2] - a[2]), b[0] - a[0]);
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[i + 1];
    const g = new THREE.BufferGeometry();
    const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2 - 0.42, (p[2] + q[2]) / 2];
    g.setAttribute('position', new THREE.Float32BufferAttribute([...p, ...m, ...q], 3));
    g.computeVertexNormals();
    bb.add(g, cols[i % cols.length]);
    const g2 = new THREE.BufferGeometry();
    g2.setAttribute('position', new THREE.Float32BufferAttribute([...q, ...m, ...p], 3));
    g2.computeVertexNormals();
    bb.add(g2, cols[i % cols.length]);
  }
  void yaw;
  bb.flush(level, { castShadow: false });
}

/** Vogelschwarm (weiße Bergdohlen-Silhouetten), kreist um c in Höhe y: ein Mesh, schlagende Flügel. */
export function vogelschwarm(level, o) {
  const v = level.view;
  if (!v) return;
  const n = o.n ?? 6, R = o.r ?? 10;
  const b = new Bld();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const x = Math.cos(a) * R * (0.8 + (i % 3) * 0.12), z = Math.sin(a) * R, y = (i % 2) * 1.2;
    b.sphere(0.16, x, y, z, 0x2a2a34, { s: [1.6, 0.8, 0.8], ws: 6, hs: 4 });
    b.cone(0.05, 0.16, x + 0.28, y, z, 0xffc21a, 4, { rz: -Math.PI / 2 });
    for (const s of [-1, 1]) b.box(0.3, 0.03, 0.55, x, y + 0.05, z + s * 0.32, 0x3a3a46, { rx: s * 0.35, r: 0.01 });
  }
  const mesh = new THREE.Mesh(b.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }));
  mesh.name = 'vogelschwarm';
  mesh.position.set(o.pos[0], o.pos[1], o.pos[2]);
  const hv = {};
  let t = 0;
  addObject(level, mesh, (dt) => {
    t += visDt(level, hv, dt);
    mesh.rotation.y = t * (o.speed ?? 0.25);
    mesh.position.y = o.pos[1] + Math.sin(t * 0.7) * 0.6;
  });
}

/** Wolkenkranz: weiße Wolkenbäusche rund um einen Gipfel knapp unter der Kante (Kulisse, ein Teil der Abschnitts-Meshes). */
export function wolkenkranz(level, cx, cz, rx, rz, y, o = {}) {
  if (!level.view) return;
  const rnd = new Rnd(o.seed ?? 5);
  const b = new Bld();
  const n = o.n ?? Math.round((rx + rz) * 0.9);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rnd.real(-0.1, 0.1);
    const r = rnd.real(1.4, 2.8) * (o.size ?? 1);
    b.sphere(r, cx + Math.cos(a) * (rx + r * 0.3), y + rnd.real(-1.2, 0.8), cz + Math.sin(a) * (rz + r * 0.3), { v: (x, yy, z, nx, ny) => (ny > 0.2 ? 0xffffff : 0xdce8f6) }, { s: [1.3, 0.62, 1.1], ws: 10, hs: 6 });
  }
  b.flush(level, { castShadow: false });
}
