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

export { isl, line, ring, arc, column, rectPoly, Bld, litTop, gradY, areaMood } from '../w5/_helpers_b.js';

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

// =====================================================================================================================
// 6-B Steinkreis
// =====================================================================================================================

const hash2 = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
/** Weiches Wert-Rauschen 0..1 (bilinear zwischen Gitterpunkten). */
export function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi;
  const u = fx * fx * (3 - 2 * fx), w = fz * fz * (3 - 2 * fz);
  const a = hash2(xi, zi), b = hash2(xi + 1, zi), c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
}

/** Radius der welligen Schwebeinsel in Richtung a. */
export const inselRadius = (o, a) => o.R * (1 + 0.05 * Math.sin(3 * a + 0.7) + 0.035 * Math.sin(5 * a + 2.1) + 0.03 * Math.sin(2 * a + 1.3));

/**
 * Runde Schwebeinsel über dem Wolkenmeer (6-B): flache Grasdecke (Flecken, heller Rand), Erdkante, darunter ein nach unten
 * spitz zulaufender Felskegel mit Wurzeln. Kollision: Kreis-Vereinigung (Mitte + Randzylinder). o: { center [x, z], top, R,
 * depth 4, N 48, cone 14 (m Felskegel unter der Kante) }.
 */
export function wolkeninsel(level, o) {
  const [cx, cz] = o.center ?? [0, 0];
  const top = o.top ?? 2, depth = o.depth ?? 4, N = o.N ?? 48;
  const rad = (a) => inselRadius(o, a);
  let rMin = Infinity;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU, r = rad(a), rr = 1.3;
    rMin = Math.min(rMin, r);
    level.world.add({ type: 'cyl', x: cx + Math.cos(a) * (r - rr), z: cz + Math.sin(a) * (r - rr), r: rr, y0: top - depth, y1: top, tag: 'insel' });
  }
  level.world.add({ type: 'cyl', x: cx, z: cz, r: rMin - 1.0, y0: top - depth, y1: top, tag: 'insel' });
  if (!level.view) return;
  const g1 = lin(0x6ad04a), g2 = lin(0x8ae05e), g3 = lin(0x4eb83c), rim = lin(0xb2f07c), out = [0, 0, 0];
  const topCol = (x, z, e) => {
    const n = vnoise(x * 0.32 + 3, z * 0.32), m = vnoise(x * 1.1 - 5, z * 1.1 + 2);
    mixc(g3, g1, smooth(0.2, 0.6, n), out);
    mixc(out, g2, smooth(0.6, 0.9, m) * 0.7, out);
    mixc(out, rim, smooth(0.86, 1, e) * 0.6, out);
    return [out[0], out[1], out[2]];
  };
  const RINGS = 7;
  const pos = [], col = [];
  const P = (k, i) => { const a = (i / N) * TAU, r = rad(a) * (k / RINGS); return [cx + Math.cos(a) * r, top, cz + Math.sin(a) * r, k / RINGS]; };
  const push = (q, c) => { pos.push(q[0], q[1], q[2]); const cc = c ?? topCol(q[0], q[2], q[3]); col.push(cc[0], cc[1], cc[2]); };
  for (let k = 0; k < RINGS; k++) {
    for (let i = 0; i < N; i++) {
      const a0 = P(k, i), a1 = P(k, i + 1), b0 = P(k + 1, i), b1 = P(k + 1, i + 1);
      push(a0); push(b1); push(b0);
      if (k > 0) { push(a0); push(a1); push(b1); }
    }
  }
  // Grasrand (leicht überstehend), Erdkante, Felskegel
  const dirt = lin(0xb88a5a), dirtD = lin(0x7a5a3a), rock = lin(0xa29eb8), rockD = lin(0x6a6680), grassS = lin(0x4aa83a);
  const cone = o.cone ?? 14;
  const LAY = [[0, 1.0, grassS], [0.45, 1.02, grassS], [0.7, 0.99, dirt], [depth * 0.6, 0.95, dirtD], [depth, 0.86, rock], [depth + cone * 0.45, 0.5, rockD], [depth + cone, 0.06, rockD]];
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU;
    const r0 = rad(a0), r1 = rad(a1);
    for (let l = 0; l < LAY.length - 1; l++) {
      const [d0, s0, c0] = LAY[l], [d1, s1, c1] = LAY[l + 1];
      const w0 = l > 3 ? 0.85 + 0.15 * hash2(i % N, l) : 1, w1 = l > 3 ? 0.85 + 0.15 * hash2((i + 1) % N, l) : 1;
      const v0 = l + 1 > 3 ? 0.85 + 0.15 * hash2(i % N, l + 1) : 1, v1 = l + 1 > 3 ? 0.85 + 0.15 * hash2((i + 1) % N, l + 1) : 1;
      const A = [cx + Math.cos(a0) * r0 * s0 * w0, top - d0, cz + Math.sin(a0) * r0 * s0 * w0];
      const B = [cx + Math.cos(a1) * r1 * s0 * w1, top - d0, cz + Math.sin(a1) * r1 * s0 * w1];
      const C = [cx + Math.cos(a1) * r1 * s1 * v1, top - d1, cz + Math.sin(a1) * r1 * s1 * v1];
      const D = [cx + Math.cos(a0) * r0 * s1 * v0, top - d1, cz + Math.sin(a0) * r0 * s1 * v0];
      const lit = 0.82 + 0.25 * Math.max(0, Math.cos(a0 - 2.4));
      const cA = c0.map((v) => v * lit), cD = c1.map((v) => v * lit);
      push(A, cA); push(C, cD); push(B, cA);
      push(A, cA); push(D, cD); push(C, cD);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  addStatic(level, g, { castShadow: true });
  // Wurzeln und Grashalme, die unter der Kante hängen
  const b = new Bld();
  for (let i = 0; i < N; i += 2) {
    const a = (i / N) * TAU + 0.05, r = rad(a) * 0.97;
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    const L2 = 0.6 + hash2(i, 9) * 1.4;
    b.cyl(0.03, 0.05, L2, x, top - 0.5 - L2, z, i % 4 ? 0x6a4a2a : 0x4aa83a, 4);
  }
  b.flush(level, { castShadow: false });
}

/**
 * Innerer Steinkreis: Menhire (feste Zylinder, Deckung gegen hüpfende Feuerkugeln) und Trilithen (zwei Steine mit
 * Deckstein = Einweg-Plattform, auf die Werfer springen). o: { center [x, z], y, menhirs: [[winkel, radius, höhe]],
 * trilithen: [{ pos: [x, z], yaw, top (Oberkante Deckstein), w: 3.6 }] }.
 */
export function steinkreis(level, o) {
  const [cx, cz] = o.center ?? [0, 0], y = o.y;
  const b = level.view ? new Bld() : null;
  const stone = (x, z, h, r, yaw = 0, seed = 1) => {
    level.world.add({ type: 'cyl', x, z, r: r * 0.9, y0: y, y1: y + h, tag: 'menhir' });
    if (!b) return;
    const g = new THREE.CylinderGeometry(r * 0.72, r, h, 7, 4);
    const P = g.attributes.position;
    for (let k = 0; k < P.count; k++) {
      const px = P.getX(k), py = P.getY(k), pz = P.getZ(k);
      const n = 0.88 + 0.24 * hash2(Math.round(px * 7) + seed, Math.round(pz * 7 + py * 3));
      P.setXYZ(k, px * n, py, pz * n * 0.72);
    }
    g.computeVertexNormals();
    b.add(g, { v: (px, py, pz, nx, ny) => (py < -h / 2 + 0.6 ? 0x5a9a44 : ny > 0.6 ? 0xc8c4d4 : (Math.sin(py * 3 + px * 2) > 0.7 ? 0x8ab060 : 0xa8a4b8)) }, { p: [x, y + h / 2, z], r: [0, yaw, 0] });
  };
  (o.menhirs ?? []).forEach(([a, r, h], i) => stone(cx + Math.cos(a) * r, cz + Math.sin(a) * r, h, 0.62, -a, i + 3));
  for (const t of o.trilithen ?? []) {
    const [tx, tz] = t.pos, yaw = t.yaw ?? 0, w = t.w ?? 3.6;
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const hh = t.top - y - 0.6;
    for (const sd of [-1, 1]) stone(tx + c * sd * (w / 2 - 0.45), tz - s * sd * (w / 2 - 0.45), hh, 0.5, yaw, 7 + sd);
    // Deckstein (Einweg von unten)
    const hw = (Math.abs(c) * w + Math.abs(s) * 1.6) / 2, hd = (Math.abs(s) * w + Math.abs(c) * 1.6) / 2;
    level.world.add({ type: 'box', min: [tx - hw, t.top - 0.6, tz - hd], max: [tx + hw, t.top, tz + hd], oneWay: true, tag: 'deckstein' });
    if (b) {
      b.box(w + 0.2, 0.62, 1.7, tx, t.top - 0.62, tz, { v: (px, py, pz, nx, ny) => (ny > 0.5 ? (hash2(Math.round(px * 3), Math.round(pz * 3)) > 0.7 ? 0x7ab858 : 0xccc8d8) : 0x9a96aa) }, { yaw, r: 0.14 });
      for (let k = 0; k < 4; k++) b.sphere(0.2, tx + c * (k - 1.5) * 0.9, t.top + 0.02, tz - s * (k - 1.5) * 0.9, 0x6ab84a, { s: [1.6, 0.35, 1.2], ws: 6, hs: 4 });
    }
  }
  b?.flush(level);
}

/** Lager der Werfer-Bande (Welt 6): Hammer-Ständer, Bumerang-Gestell, Fass, Feuerkugel-Korb. list [[x, y, z, yaw]]. */
export function werferlager(level, list) {
  if (!level.view) return;
  const b = new Bld(), glow = new Bld();
  for (const [x, y, z, yaw = 0] of list) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const at = (u, w) => [x + u * c + w * s, z - u * s + w * c];
    // Hammer-Ständer: Holzgestell mit drei Hämmern
    let [px, pz] = at(-1.2, 0);
    b.box(1.6, 0.12, 0.3, px, y + 0.9, pz, 0x8a5a2a, { yaw, r: 0.03 });
    for (const sd of [-0.7, 0.7]) { const [qx, qz] = at(-1.2 + sd, 0); b.box(0.12, 1.0, 0.3, qx, y, qz, 0x7a4a26, { yaw, r: 0.03 }); }
    for (let k = 0; k < 3; k++) {
      const [qx, qz] = at(-1.7 + k * 0.5, 0.05);
      b.cyl(0.04, 0.04, 0.9, qx, y + 0.12, qz, 0xc08a4a, 6);
      b.box(0.36, 0.22, 0.22, qx, y + 1.0, qz, litTop(0x8a8ea0), { yaw, r: 0.04 });
    }
    // Bumerang-Gestell (Holzbock mit drei Bumerangs)
    [px, pz] = at(0.9, -0.2);
    b.box(0.9, 0.1, 0.5, px, y + 0.7, pz, 0x9a6a3a, { yaw, r: 0.03 });
    b.box(0.1, 0.7, 0.1, px, y, pz, 0x7a4a26, { yaw, r: 0.02 });
    for (let k = 0; k < 3; k++) {
      const [qx, qz] = at(0.65 + k * 0.25, -0.2);
      for (const sd of [-1, 1]) b.box(0.38, 0.04, 0.1, qx + c * sd * 0.14, y + 0.82 + k * 0.05, qz - s * sd * 0.14, [0xffc21a, 0x3d8bff, 0xff4a3d][k], { yaw: yaw + sd * 0.6, r: 0.02 });
    }
    // Fass und Feuerkugel-Korb
    [px, pz] = at(2.0, 0.4);
    b.cyl(0.34, 0.36, 0.86, px, y, pz, { v: (qx, qy) => (Math.abs(qy) > 0.28 && Math.abs(qy) < 0.36 ? 0x3a3a48 : 0xa8683a) }, 10);
    [px, pz] = at(2.2, -0.7);
    b.cyl(0.42, 0.34, 0.44, px, y, pz, { v: (qx, qy, qz) => ((Math.floor(Math.atan2(qz, qx) * 4) & 1) ? 0xc89a50 : 0xa07030) }, 10, { open: true });
    for (let k = 0; k < 4; k++) glow.sphere(0.15, px + Math.cos(k * 1.6) * 0.18, y + 0.42, pz + Math.sin(k * 1.6) * 0.18, 0xffb030, { ws: 7, hs: 5 });
  }
  b.flush(level);
  glow.flush(level, { material: 'glow', castShadow: false });
}

/** Flacher Altarstein (Mitte des Steinkreises): Steinscheibe mit eingelegtem Sternmosaik (leuchtend), Moosrand. */
export function altarstein(level, x, y, z, r) {
  if (!level.view) return;
  const b = new Bld(), glow = new Bld();
  b.cyl(r, r + 0.12, 0.22, x, y, z, litTop(0xc8c4d4), 20);
  b.cyl(r * 0.78, r * 0.78, 0.02, x, y + 0.22, z, 0xa8a4b8, 20);
  for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU; b.sphere(0.2, x + Math.cos(a) * (r + 0.05), y + 0.08, z + Math.sin(a) * (r + 0.05), 0x6ab84a, { s: [1.5, 0.5, 1.2], ws: 6, hs: 4 }); }
  // Sternmosaik: fünf Zacken als flache Keile
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * TAU - Math.PI / 2;
    const g = new THREE.BufferGeometry();
    const tip = [x + Math.cos(a) * r * 0.7, y + 0.245, z + Math.sin(a) * r * 0.7];
    const l = [x + Math.cos(a - 0.6) * r * 0.25, y + 0.245, z + Math.sin(a - 0.6) * r * 0.25];
    const rr = [x + Math.cos(a + 0.6) * r * 0.25, y + 0.245, z + Math.sin(a + 0.6) * r * 0.25];
    g.setAttribute('position', new THREE.Float32BufferAttribute([...tip, ...l, ...rr, x, y + 0.245, z, ...rr, ...l], 3));
    g.computeVertexNormals();
    glow.add(g, 0xffd84a);
  }
  b.flush(level);
  glow.flush(level, { material: 'glow', castShadow: false });
}

// =====================================================================================================================
// 6-2 Geisterschiffe
// =====================================================================================================================

/**
 * Holzsteg/Bootsanleger: Planken quer über x0..x1 × zA..zB auf Höhe y (nur Darstellung – die Kollision liefert die Insel
 * darunter), Pfähle an den Rändern, die bis ins Wasser reichen. o: { posts: true, bottom: −3 }.
 */
export function holzsteg(level, x0, x1, zA, zB, y, o = {}) {
  if (!level.view) return;
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  const b = new Bld();
  const rnd = new Rnd(o.seed ?? Math.round(Math.abs(x0 * 3 + z0 * 7)) + 1);
  for (let z = z0 - 0.25; z > z1; z -= 0.5) {
    const c = rnd.frac() < 0.25 ? 0x6a5a48 : rnd.frac() < 0.5 ? 0x8a7458 : 0x7a6650;
    b.box(x1 - x0 - 0.1, 0.12, 0.46, (x0 + x1) / 2 + rnd.real(-0.06, 0.06), y - 0.1, z, litTop(c), { r: 0.03, yaw: rnd.real(-0.01, 0.01) });
  }
  // dunkle Unterlage (keine Lücken zwischen den Planken)
  b.box(x1 - x0 - 0.12, 0.1, z0 - z1 - 0.04, (x0 + x1) / 2, y - 0.2, (z0 + z1) / 2, 0x2e241c, { r: 0 });
  if (o.posts !== false) {
    const bottom = o.bottom ?? -3;
    for (let z = z0 - 0.3; z > z1 - 0.01; z -= Math.max(2.2, (z0 - z1) / Math.max(1, Math.round((z0 - z1) / 3)))) {
      for (const x of [x0 + 0.15, x1 - 0.15]) b.cyl(0.17, 0.2, y + 0.5 - bottom, x, bottom, z, litTop(0x4a3c30), 7);
    }
  }
  if (!o.xray) { b.flush(level); return; }
  // Durchsicht: eigenes Mesh, das durchscheinend wird, solange es zwischen Kamera und Figur liegt (Bilge darunter)
  const mesh = new THREE.Mesh(b.geometry(), (level.view.mats?.world ?? new THREE.MeshStandardMaterial({ vertexColors: true })).clone());
  mesh.name = 'holzsteg_durchsicht';
  mesh.receiveShadow = true;
  addObject(level, mesh);
  level.view.xray?.(mesh, new THREE.Box3(new THREE.Vector3(x0, y - 0.6, z1), new THREE.Vector3(x1, y + 0.1, z0)), { min: o.xray.min ?? 0.2 });
}

/** Holzkisten (fest, stapelbar): list [[x, y, z, größe, yaw?], …] (y = Unterkante). Eisenbeschläge an den Kanten. */
export function kisten(level, list) {
  const b = level.view ? new Bld() : null;
  for (const [x, y, z, s = 1.2, yaw = 0] of list) {
    level.world.add({ type: 'box', min: [x - s / 2, y, z - s / 2], max: [x + s / 2, y + s, z + s / 2], tag: 'kiste' });
    if (!b) continue;
    b.box(s, s, s, x, y, z, litTop(0x9a7448), { r: 0.04, yaw });
    for (const sy of [0.02, s - 0.1]) b.box(s + 0.03, 0.08, s + 0.03, x, y + sy, z, 0x4a4a54, { r: 0.02, yaw });
    b.box(s * 0.12, s * 0.9, s + 0.02, x, y + s * 0.05, z, 0x6a5232, { r: 0.01, yaw: yaw + Math.PI / 4 });
  }
  b?.flush(level);
}

/**
 * Laderaum (6-2): offener Schiffsbauch (Puppenhaus-Schnitt, oben offen) entlang Z bei x, Boden y von z0 bis z1:
 * Seitenwände (Kollision, camIgnore) mit Spanten, Querbalken oben (nur Optik), Bodenplanken (Darstellung), hinten das
 * Schott. Der Boden selbst kommt aus den Daten (island-Segmente, damit Löcher und Becken möglich sind).
 * o: { x, y, z0, z1, w: 16, h: 7, beams: [{ y, z, d, h }] (begehbare Querbalken: nur Optik, Kollision in den Daten) }.
 */
export function laderaum(level, o) {
  const { x, y } = o, w = o.w ?? 16, h = o.h ?? 7;
  const z0 = Math.max(o.z0, o.z1), z1 = Math.min(o.z0, o.z1);
  for (const sx of [-1, 1]) level.world.add({ type: 'box', min: [x + sx * w / 2 - (sx > 0 ? 0 : 0.8), y - 6, z1], max: [x + sx * w / 2 + (sx > 0 ? 0.8 : 0), y + h, z0], camIgnore: true, tag: 'rumpf' });
  level.world.add({ type: 'box', min: [x - w / 2, y - 6, z1 - 0.8], max: [x + w / 2, y + h, z1], camIgnore: true, tag: 'rumpf' });
  if (!level.view) return;
  const b = new Bld();
  const plank = (c) => litTop(c, 0.6);
  // Seitenwände: Plankenlagen mit leicht gebogener Form (nach oben breiter wie ein Rumpf)
  for (const sx of [-1, 1]) {
    for (let yy = y - 0.4; yy < y + h; yy += 0.5) {
      const bulge = Math.sin(((yy - y) / h) * Math.PI) * 0.6;
      b.box(0.5, 0.48, z0 - z1, x + sx * (w / 2 + 0.25 + bulge), yy, (z0 + z1) / 2, plank(((yy * 2) | 0) % 3 ? 0x5a4a3c : 0x4a3c30), { r: 0.02 });
    }
    // Spanten (Rippen) innen
    for (let z = z0 - 1.5; z > z1; z -= 3) b.box(0.4, h + 0.4, 0.45, x + sx * (w / 2 - 0.1), y - 0.4, z, plank(0x3a2e24), { r: 0.06 });
  }
  // Schott hinten
  for (let yy = y - 0.4; yy < y + h; yy += 0.5) b.box(w + 1, 0.48, 0.5, x, yy, z1 - 0.3, plank(((yy * 2) | 0) % 2 ? 0x5a4a3c : 0x4e4034), { r: 0.02 });
  // Querbalken oben nur an den Enden (dazwischen offen – die Kamera schaut von hinten oben hinein)
  for (const z of [z0 - 0.6, z1 + 0.8]) b.box(w + 1.2, 0.45, 0.5, x, y + h - 0.2, z, plank(0x4a3c30), { r: 0.06 });
  for (const bm of o.beams ?? []) b.box(w + 0.4, bm.h ?? 0.5, bm.d ?? 1.6, x, bm.y, bm.z, plank(0x5a4a3a), { r: 0.06 });
  b.flush(level);
}

/** Hängende Laternen (grünliches Geisterlicht) mit Laternenlicht des Themas: list [[x, y, z], …] (Aufhängepunkt). */
export function geisterlaternen(level, list) {
  if (!level.view) return;
  const b = new Bld(), glow = new Bld();
  for (const [x, y, z, len = 1.2] of list) {
    b.cyl(0.02, 0.02, len, x, y - len, z, 0x2a2a30, 4);
    b.cyl(0.2, 0.24, 0.1, x, y - len - 0.05, z, 0x3a3a44, 8);
    b.cyl(0.24, 0.2, 0.08, x, y - len - 0.62, z, 0x3a3a44, 8);
    glow.cyl(0.17, 0.17, 0.48, x, y - len - 0.55, z, 0x9affc8, 8);
    level.view.addLantern?.(x, y - len - 0.3, z);
  }
  b.flush(level, { castShadow: false });
  glow.flush(level, { material: 'glow', castShadow: false });
}
