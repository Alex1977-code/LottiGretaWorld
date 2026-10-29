// Baustein des Boss-Marathons B-12 (Präzisierung Gegner Bonuswelten): `weltraum_arena` – schwebende Kampf-Plattform im
// Nacht-Weltraum (auch der Hub): Bodenplatte mit Sternenfliesen und Goldstern, leuchtender Rand, Lichtsterne auf Stäben ringsum,
// Asteroiden-Unterseite, unsichtbare Wand (niemand fällt aus der Arena), optional ausgesparte Ecken (Bruchplatten des
// Kippquader-Königs) und Leuchtkreise für Warp-Boxen (Hub).
//
//   { type: 'weltraum_arena', id?, pos: [x, y, z] (Mitte der Bodenoberfläche), shape: 'rund' (Standard) | 'eckig',
//     r: 11 (rund: Radius der Lauffläche), size: [20, 20] (eckig: Breite × Tiefe), thick: 1.4 (Plattendicke),
//     wall: 7 (Höhe der unsichtbaren Wand am Rand, 0 = keine), corners: 0 (eckig: Kantenlänge der ausgesparten Ecken – dort
//     liegen Entitäten 'bruchplatte' mit size [c, c], pos = Mitte der Ecke), color: 'violett' | 'blau' | 'rosa' | 'gold' | 'gruen'
//     | 'rot' (Fliesen und Rand), star: true (Goldstern in der Mitte), pads: [[x, z], …] (Leuchtkreise Ø 3 m für Warp-Boxen, Welt-
//     koordinaten), lamps: 8 (Lichtsterne am Rand, 0 = keine), rock: true (Asteroiden-Unterseite), gate: null (rund: Winkel
//     einer Lücke in der Wand, rad um +Y; 0 = +Z zur Kamera) | gateW: 3 (m) }
//   Kollision: Bodenplatte (cyl bzw. box/Kreuz aus boxen), Wand aus Pfosten (cyl, camIgnore, noWallSlide) bzw. vier Kästen.
//   level.named.get(id) = { center: {x, y, z}, r, size, shape, inside(x, z, margin) }.
//   Kosten: alles statisch verschmolzen (Boden/Rand/Lampen beleuchtet + Glüh-Teile), keine eigenen Zeichenaufrufe je Arena.

import * as THREE from 'three';
import { v3, colorize, merge, lin, mixc, smooth, addStatic, box } from '../kit.js';

const TAU = Math.PI * 2;
const COLORS = {
  violett: { tile: 0x3a2e8a, tile2: 0x4a3aa8, seam: 0x8a7aff, rim: 0x9af0ff, side: 0x2a2060 },
  blau: { tile: 0x1e3a8a, tile2: 0x2a4ab0, seam: 0x6ab0ff, rim: 0x8af0ff, side: 0x16285e },
  rosa: { tile: 0x7a2a6a, tile2: 0x9a3a8a, seam: 0xff8ad8, rim: 0xffb0f0, side: 0x4a1a48 },
  gold: { tile: 0x6a4a1a, tile2: 0x8a6420, seam: 0xffd060, rim: 0xffe08a, side: 0x3e2a10 },
  gruen: { tile: 0x1a5a4a, tile2: 0x247060, seam: 0x6affc8, rim: 0xa0ffe0, side: 0x10382e },
  rot: { tile: 0x6a1e2a, tile2: 0x8a2a36, seam: 0xff7a6a, rim: 0xffb08a, side: 0x401218 },
};

function starShape(R, r) {
  const s = new THREE.Shape();
  for (let i = 0; i <= 10; i++) { const a = Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r : R; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; if (i === 0) s.moveTo(x, y); else s.lineTo(x, y); }
  return s;
}
const flat = (g, col) => { const c = lin(col); return colorize(g, (p, n, o) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }); };

export function buildWeltraumArena(level, spec) {
  const c = v3(spec.pos);
  const round = (spec.shape ?? 'rund') !== 'eckig';
  const R = spec.r ?? 11;
  const size = spec.size ?? [20, 20];
  const W = size[0], D = size[1];
  const T = spec.thick ?? 1.4;
  const C = round ? 0 : Math.max(0, spec.corners ?? 0);
  const pal = COLORS[spec.color] ?? COLORS.violett;
  const inside = (x, z, m = 0) => (round ? Math.hypot(x - c.x, z - c.z) <= R - m : Math.abs(x - c.x) <= W / 2 - m && Math.abs(z - c.z) <= D / 2 - m);

  // ---- Kollision
  if (round) level.world.add({ type: 'cyl', x: c.x, z: c.z, r: R + 0.3, y0: c.y - T, y1: c.y, tag: 'weltraum-arena' });
  else if (C > 0) {
    level.world.add({ type: 'box', min: [c.x - W / 2 + C, c.y - T, c.z - D / 2], max: [c.x + W / 2 - C, c.y, c.z + D / 2], tag: 'weltraum-arena' });
    level.world.add({ type: 'box', min: [c.x - W / 2, c.y - T, c.z - D / 2 + C], max: [c.x - W / 2 + C, c.y, c.z + D / 2 - C], tag: 'weltraum-arena' });
    level.world.add({ type: 'box', min: [c.x + W / 2 - C, c.y - T, c.z - D / 2 + C], max: [c.x + W / 2, c.y, c.z + D / 2 - C], tag: 'weltraum-arena' });
  } else level.world.add({ type: 'box', min: [c.x - W / 2, c.y - T, c.z - D / 2], max: [c.x + W / 2, c.y, c.z + D / 2], tag: 'weltraum-arena' });
  const wall = spec.wall ?? 7;
  if (wall > 0) {
    if (round) {
      const rr = R + 0.55, N = Math.ceil((TAU * rr) / 0.8);
      const gate = spec.gate ?? null, gw = (spec.gateW ?? 3) / rr / 2;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * TAU;
        if (gate !== null && Math.abs(Math.atan2(Math.sin(a - gate), Math.cos(a - gate))) < gw) continue;
        level.world.add({ type: 'cyl', x: c.x + Math.sin(a) * rr, z: c.z + Math.cos(a) * rr, r: 0.5, y0: c.y - 0.2, y1: c.y + wall, camIgnore: true, noWallSlide: true, tag: 'weltraum-wand' });
      }
    } else {
      const t = 0.6;
      for (const [x0, z0, x1, z1] of [[-W / 2 - t, -D / 2 - t, W / 2 + t, -D / 2], [-W / 2 - t, D / 2, W / 2 + t, D / 2 + t], [-W / 2 - t, -D / 2, -W / 2, D / 2], [W / 2, -D / 2, W / 2 + t, D / 2]]) {
        level.world.add({ type: 'box', min: [c.x + x0, c.y - 0.2, c.z + z0], max: [c.x + x1, c.y + wall, c.z + z1], camIgnore: true, noWallSlide: true, tag: 'weltraum-wand' });
      }
    }
  }

  // ---- Darstellung
  const parts = [], glow = [];
  const tile = lin(pal.tile), tile2 = lin(pal.tile2), seam = lin(pal.seam), side = lin(pal.side);
  const tileCol = (x, z, o) => {
    const u = x - c.x, w = z - c.z;
    if (round) {
      const rr = Math.hypot(u, w), a = Math.atan2(w, u);
      const ring = Math.floor(rr / 2.2), seg = Math.floor(((a + Math.PI) / TAU) * (8 + ring * 6));
      mixc(tile, tile2, (ring + seg) & 1 ? 1 : 0, o);
    } else {
      const k = (Math.floor(u / 2 + 100) + Math.floor(w / 2 + 100)) & 1;
      mixc(tile, tile2, k, o);
    }
    // feine Sternfunkel in den Fliesen
    const h = Math.sin(u * 12.9898 + w * 78.233) * 43758.5453;
    if (h - Math.floor(h) > 0.985) mixc(o, seam, 0.7, o);
    return o;
  };
  if (round) {
    const top = new THREE.CircleGeometry(R + 0.3, 64, 0, TAU);
    top.rotateX(-Math.PI / 2); top.translate(c.x, c.y, c.z);
    parts.push(colorize(top, (p, n, o) => tileCol(p.x, p.z, o)));
    for (let k = 1; k * 2.2 < R; k++) {
      const g = new THREE.RingGeometry(k * 2.2 - 0.05, k * 2.2 + 0.05, 64, 1);
      g.rotateX(-Math.PI / 2); g.translate(c.x, c.y + 0.006, c.z);
      glow.push(flat(g, pal.seam));
    }
    const band = new THREE.CylinderGeometry(R + 0.3, R + 0.1, T, 64, 2, true);
    band.translate(c.x, c.y - T / 2, c.z);
    parts.push(colorize(band, (p, n, o) => mixc(side, tile2, smooth(c.y - T, c.y, p.y) * 0.6, o)));
  } else {
    const holes = C > 0 ? [[-1, -1], [1, -1], [-1, 1], [1, 1]] : [];
    const cells = [];
    const sx = W / 2, sz = D / 2;
    if (C > 0) {
      cells.push([-sx + C, -sz, sx - C, sz], [-sx, -sz + C, -sx + C, sz - C], [sx - C, -sz + C, sx, sz - C]);
    } else cells.push([-sx, -sz, sx, sz]);
    for (const [x0, z0, x1, z1] of cells) {
      const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, Math.max(1, Math.round((x1 - x0) / 2)), Math.max(1, Math.round((z1 - z0) / 2)));
      g.rotateX(-Math.PI / 2); g.translate(c.x + (x0 + x1) / 2, c.y, c.z + (z0 + z1) / 2);
      parts.push(colorize(g, (p, n, o) => tileCol(p.x, p.z, o)));
      const b = box(x1 - x0, T, z1 - z0, c.x + (x0 + x1) / 2, c.y - T / 2 - 0.004, c.z + (z0 + z1) / 2, pal.side, { r: 0.08, seg: 1 });
      parts.push(b);
    }
    // Fugen-Raster
    for (let u = -sx + 2; u < sx - 0.1; u += 2) { const g = new THREE.PlaneGeometry(0.08, D - 2 * C); g.rotateX(-Math.PI / 2); g.translate(c.x + u, c.y + 0.006, c.z); glow.push(flat(g, pal.seam)); }
    for (let w = -sz + 2; w < sz - 0.1; w += 2) { const g = new THREE.PlaneGeometry(W - 2 * C, 0.08); g.rotateX(-Math.PI / 2); g.translate(c.x, c.y + 0.006, c.z + w); glow.push(flat(g, pal.seam)); }
    void holes;
  }
  if (spec.star !== false) {
    const g = new THREE.ShapeGeometry(starShape(Math.min(2.2, (round ? R : Math.min(W, D) / 2) * 0.22), Math.min(0.95, (round ? R : Math.min(W, D) / 2) * 0.095)));
    g.rotateX(-Math.PI / 2); g.translate(c.x, c.y + 0.012, c.z);
    glow.push(flat(g, 0xffd84a));
  }
  for (const pd of spec.pads ?? []) {
    const g = new THREE.RingGeometry(1.2, 1.5, 40, 1);
    g.rotateX(-Math.PI / 2); g.translate(pd[0], c.y + 0.01, pd[pd.length - 1]);
    glow.push(flat(g, pal.rim));
    const d = new THREE.CircleGeometry(1.2, 40);
    d.rotateX(-Math.PI / 2); d.translate(pd[0], c.y + 0.008, pd[pd.length - 1]);
    parts.push(flat(d, pal.tile2));
  }
  // Leuchtrand
  if (spec.rim !== false) {
    if (round) {
      const t = new THREE.TorusGeometry(R + 0.3, 0.14, 6, 72);
      t.rotateX(Math.PI / 2); t.translate(c.x, c.y + 0.06, c.z);
      glow.push(flat(t, pal.rim));
    } else {
      const ring = [];
      const ex = W / 2, ez = D / 2;
      const seg = (x0, z0, x1, z1) => { const l = Math.hypot(x1 - x0, z1 - z0); const g = new THREE.BoxGeometry(l, 0.16, 0.22); g.rotateY(-Math.atan2(z1 - z0, x1 - x0)); g.translate(c.x + (x0 + x1) / 2, c.y + 0.08, c.z + (z0 + z1) / 2); ring.push(flat(g, pal.rim)); };
      if (C > 0) {
        seg(-ex + C, -ez, ex - C, -ez); seg(-ex + C, ez, ex - C, ez); seg(-ex, -ez + C, -ex, ez - C); seg(ex, -ez + C, ex, ez - C);
      } else { seg(-ex, -ez, ex, -ez); seg(-ex, ez, ex, ez); seg(-ex, -ez, -ex, ez); seg(ex, -ez, ex, ez); }
      glow.push(...ring);
    }
  }
  // Lichtsterne auf Stäben am Rand
  const nL = spec.lamps ?? 8;
  for (let i = 0; i < nL; i++) {
    const a = (i / nL) * TAU + Math.PI / nL;
    let x, z;
    if (round) { x = c.x + Math.sin(a) * (R + 0.9); z = c.z + Math.cos(a) * (R + 0.9); }
    else { const k = Math.max(Math.abs(Math.sin(a)) / (W / 2 + 0.9), Math.abs(Math.cos(a)) / (D / 2 + 0.9)); x = c.x + Math.sin(a) / k; z = c.z + Math.cos(a) / k; }
    // nicht vor die Kamera (+Z): dort nur kurze Stäbe
    const front = round ? Math.cos(a) > 0.55 : Math.cos(a) > 0.7;
    const h = front ? 0.6 : 2.6;
    const pole = new THREE.CylinderGeometry(0.06, 0.1, h, 8, 1, true);
    pole.translate(x, c.y + h / 2, z);
    parts.push(colorize(pole, (p, n, o) => mixc(lin(0x6a5aa8), lin(0xc8b8ff), smooth(c.y, c.y + h, p.y), o)));
    const s = new THREE.ExtrudeGeometry(starShape(0.32, 0.14), { depth: 0.1, bevelEnabled: false });
    s.translate(0, 0, -0.05); s.rotateY(-Math.atan2(c.z - z, c.x - x) + Math.PI / 2); s.translate(x, c.y + h + 0.3, z);
    glow.push(flat(s, 0xfff0a0));
  }
  // Asteroiden-Unterseite
  if (spec.rock !== false) {
    const rr = round ? R + 0.2 : Math.min(W, D) / 2 + 0.6;
    const cone = new THREE.ConeGeometry(rr * (round ? 1 : 1.25), rr * 1.3, round ? 28 : 4, 5, true);
    cone.rotateX(Math.PI);
    if (!round) cone.rotateY(Math.PI / 4);
    const P = cone.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      const k = 1 + Math.sin(x * 1.7 + y * 2.3) * 0.08 + Math.cos(z * 1.9 - y * 1.3) * 0.07;
      P.setXYZ(i, x * k, y, z * k);
    }
    cone.computeVertexNormals();
    cone.translate(c.x, c.y - T - rr * 0.65, c.z);
    const rk = lin(0x3a3048), rk2 = lin(0x5a4a68);
    parts.push(colorize(cone, (p, n, o) => mixc(rk, rk2, smooth(-0.6, 0.6, Math.sin(p.x * 2.1) * Math.cos(p.z * 1.7) + n.y), o)));
  }
  addStatic(level, merge(parts), { castShadow: false, receiveShadow: true });
  if (glow.length) addStatic(level, merge(glow), { material: 'glow', castShadow: false, receiveShadow: false });
  const handle = { center: { x: c.x, y: c.y, z: c.z }, r: R, size: [W, D], shape: round ? 'rund' : 'eckig', inside };
  if (spec.id) level.named.set(spec.id, handle);
  return handle;
}

export const TYPES = { weltraum_arena: buildWeltraumArena };
