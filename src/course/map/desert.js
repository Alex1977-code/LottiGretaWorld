// Gelände und Requisiten der Welt-2-Insel „Wüste mit Sandblöcken“ (eigene Gestaltung, Spielzeug-Look wie Welt 1):
// Geländestile aus gestapelten Sandstein-Schichten (Sandblöcke), Dünen, rosa Grasland, Lavafels; dazu Palmen,
// Kakteen, Stufenpyramiden, Säulen- und Bogenruinen, Obelisk, Katzen-Sphinx, Tonkrüge, Beduinenzelt, rosa Bäume,
// Panzer (Baron Brummbärs Depot), Sandsäcke, Kisten, Sandstein-Mäuerchen und Seilzäune als Wegränder.
// Alle Geometrien in Weltkoordinaten mit Vertexfarben (position/normal/color) für view.addStatic (Kacheln).
// Ursprung der Requisiten = Fußpunkt; Vorderseite nach +Z (zur Kamera); yaw dreht um +Y.

import * as THREE from 'three';
import { Build as KitBuild, mix, TAU } from '../models/lib/kit.js';
import { roundedBox, SIDE, colorize, lin, mixc, smooth, merge, Rnd } from '../../three/world/geometry.js';
import { alignedGrid, islandParts } from '../blocks/kit.js';

/**
 * Sparsamer Baukasten für die Karte: runde Kanten nur mit einem Segment (108 statt 300 Dreiecke je Quader), Kugeln
 * standardmäßig grob – die Insel ist groß und das Budget (< 300 k Dreiecke inkl. Schattenpass) knapp.
 */
export class LowBuild extends KitBuild {
  box(w, h, d, color, o, r = 0.05, seg = 1) { return super.box(w, h, d, color, o, r, seg); }
  sphere(r, color, o, ws = 10, hs = 7) { return super.sphere(r, color, o, ws, hs); }
}
const Build = LowBuild;

// ------------------------------------------------------------------ Farben

export const SAND = { top: 0xf6dc9c, top2: 0xeccb84, rim: 0xfff0c6, side: 0xe7bd78, body: [0xe0a865, 0xd39253, 0xc9874a], deep: 0x9c6436 };
// kräftig gewählt: sonnenbeschienene Flächen werden im Kartenlicht deutlich heller
const STONE_BANDS = [0xd07a3c, 0xa9552c, 0xe39a52, 0x94452a, 0xc2703a, 0xe8b070];
const PINK = { grassTop: 0xffa8d8, grassTop2: 0xfc98d0, grassRim: 0xffd0ea, grassSide: 0xe06ab4, dirt: 0xd59a6a, dirtDeep: 0xa86a44, checker: false };
const LAVAROCK = [0x4a3a44, 0x3c2f38, 0x564450];

/** Geometrie um yaw drehen und an (x, y, z) setzen. */
export function place(g, x, y, z, yaw = 0) {
  if (yaw) g.rotateY(yaw);
  g.translate(x, y, z);
  return g;
}

// ------------------------------------------------------------------ Geländestile

/**
 * Gelände-Block der Wüsteninsel (Box x0..x1 × z0..z1 von base bis top). style:
 *   'desert'    begehbarer Sand: Sandstein-Schichten, Sanddecke mit runder Kante, Raster aus Sandblöcken (2 m)
 *   'sandstone' Klippe/Tafelberg: versetzte Schichten in Ocker/Orange, Felsspalten, sandige Kuppe mit Brocken
 *   'dune'      Dünenblock: Sand-Block mit weicher Düne obenauf (nur Optik)
 *   'pink'      rosa Grasland (Grasdecke rosa)          'grass'  grüne Wiese (Hügelland)
 *   'lavarock'  dunkler Lavafels mit Sanddecke aus Asche  'basin'  dunkles Becken unter dem Lavasee
 * Liefert Teil-Geometrien.
 */
export function desertGround(b, base, theme, rnd) {
  const [x0, z0, x1, z1] = b.rect;
  const top = b.top;
  const style = b.style ?? 'desert';
  if (style === 'pink') return islandParts(x0, base, z0, x1, top, z1, { ...theme, ...PINK }, { under: 0, rnd, top: 'grass' });
  if (style === 'grass' || style === 'meadow') return islandParts(x0, base, z0, x1, top, z1, theme, { under: 0, rnd, top: 'grass' });
  if (style === 'pond' || style === 'sand') return islandParts(x0, base, z0, x1, top, z1, theme, { under: 0, rnd, top: 'sand' });
  const parts = [];
  if (style === 'sandstone') {
    strata(parts, x0, base, z0, x1, top - 0.35, z1, STONE_BANDS, rnd, 0.85, 0.22);
    sandCap(parts, x0, top - 0.35, z0, x1, top, z1, rnd, 0.12, false, 4);
    return parts;
  }
  if (style === 'lavarock' || style === 'basin') {
    strata(parts, x0, base, z0, x1, top - (style === 'basin' ? 0 : 0.25), z1, LAVAROCK, rnd, 0.7, 0.1);
    if (style === 'lavarock') {
      const a = lin(0x6a5a5e), c = lin(0x7c6a6a);
      const cap = roundedBox(x1 - x0 + 0.1, 0.25, z1 - z0 + 0.1, 0.1, SIDE.ALL & ~SIDE.NY, 0, 1);
      colorize(cap, (p, n, o) => mixc(lin(0x45383e), a, smooth(0.1, 0.9, n.y), o));
      cap.translate((x0 + x1) / 2, top - 0.125, (z0 + z1) / 2);
      parts.push(cap);
      parts.push(alignedGrid(x0 + 0.1, z0 + 0.1, x1 - 0.1, z1 - 0.1, top + 0.004, 2, () => mixc(a, c, rnd.frac(), [0, 0, 0])));
    }
    return parts;
  }
  // desert / dune
  strata(parts, x0, base, z0, x1, top - 0.32, z1, SAND.body, rnd, 1.0, 0.07);
  sandCap(parts, x0, top - 0.32, z0, x1, top, z1, rnd, 0.06, style === 'desert' && b.walk, b.walk ? 2 : 4);
  if (style === 'dune') parts.push(duneMound(x0, top, z0, x1, z1, b.mound ?? Math.min(3, Math.min(x1 - x0, z1 - z0) * 0.22), rnd));
  return parts;
}

/** Versetzte Gesteinsschichten (Quader je Schicht, abwechselnde Farben, leicht ein-/ausgerückt). */
function strata(parts, x0, y0, z0, x1, y1, z1, colors, rnd, layer, jitter) {
  const h = y1 - y0;
  if (h <= 0.02) return;
  const n = Math.max(1, Math.round(h / layer));
  const lh = h / n;
  for (let i = 0; i < n; i++) {
    const inset = (i % 2 ? jitter : 0) + rnd.real(0, jitter * 0.5);
    const c = lin(colors[(i * 2 + Math.floor(rnd.frac() * 2)) % colors.length]);
    const dark = mixc(c, [0, 0, 0], 0.18, [0, 0, 0]);
    const w = Math.max(0.2, x1 - x0 - inset * 2), d = Math.max(0.2, z1 - z0 - inset * 2);
    const g = colorize(new THREE.BoxGeometry(w, lh, d), (p, nn, o) => {
      if (nn.y < -0.5) { o[0] = dark[0] * 0.8; o[1] = dark[1] * 0.8; o[2] = dark[2] * 0.8; return; }
      const k = Math.abs(nn.x) > 0.5 ? 0.92 : 1;    // Seiten nach ±X etwas dunkler (Kanten lesbar)
      o[0] = c[0] * k; o[1] = c[1] * k; o[2] = c[2] * k;
    });
    g.translate((x0 + x1) / 2, y0 + lh * (i + 0.5), (z0 + z1) / 2);
    parts.push(g);
  }
}

/** Sanddecke mit runder Oberkante; grid → Raster aus 2-m-Sandblöcken (sonst feine Farbvariation je Meter). */
function sandCap(parts, x0, y0, z0, x1, y1, z1, rnd, lip, grid, cell = 2) {
  const capH = y1 - y0, w = x1 - x0, d = z1 - z0;
  const side = lin(SAND.side), rim = lin(SAND.rim);
  const r = Math.min(0.16, capH * 0.45);
  const g = roundedBox(w + lip * 2, capH, d + lip * 2, r, SIDE.ALL & ~SIDE.NY, 0, 1);
  colorize(g, (p, n, o) => mixc(side, rim, smooth(0.15, 0.85, n.y), o));
  g.translate((x0 + x1) / 2, y0 + capH / 2, (z0 + z1) / 2);
  parts.push(g);
  const a = lin(SAND.top), b2 = lin(SAND.top2), c3 = lin(0xf9e2aa);
  const ins = r + lip * 0.5;
  const gx0 = x0 - lip + ins, gx1 = x1 + lip - ins, gz0 = z0 - lip + ins, gz1 = z1 + lip - ins;
  if (gx1 <= gx0 || gz1 <= gz0) return;
  const fn = grid
    ? (ix, iz, ax, az) => {
      const blk = (Math.floor((ax + cell / 2 + 0.01) / 2) + Math.floor((az + cell / 2 + 0.01) / 2)) & 1;
      return mixc(blk ? a : c3, b2, rnd.frac() * 0.22, [0, 0, 0]);
    }
    : () => mixc(a, b2, rnd.frac() * 0.7, [0, 0, 0]);
  parts.push(alignedGrid(gx0, gz0, gx1, gz1, y1 + 0.004, cell, fn));
}

/** Weiche Düne (Halbellipsoid) mit Rippeln. */
function duneMound(x0, y, z0, x1, z1, h, rnd) {
  const w = x1 - x0, d = z1 - z0;
  const g = new THREE.SphereGeometry(1, 16, 6, 0, TAU, 0, Math.PI / 2);
  g.scale(w * 0.47, h, d * 0.47);
  const ph = rnd.real(0, 6);
  const lo = lin(0xe8bf76), hi = lin(0xfbe5ae), rip = lin(0xdcae66);
  const out = colorize(g, (p, n, o) => {
    mixc(lo, hi, smooth(-0.1, 0.9, n.y), o);
    if (Math.sin(p.x * 1.3 + p.z * 0.6 + ph) > 0.86 && n.y < 0.95) mixc(o, rip, 0.45, o);
  });
  out.translate((x0 + x1) / 2, y - 0.05, (z0 + z1) / 2);
  return out;
}

// ------------------------------------------------------------------ Wegränder (statt Hecke/Zaun)

/** Sandstein-Mäuerchen entlang +X (Länge len, Mitte im Ursprung) – Rand zu gleich hohem Gelände. */
export function adobeWallGeo(len, seed = 1) {
  const b = new Build();
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  b.box(len, 0.62, 0.62, { v: (x, y) => mix(0xd39253, 0xe9b46e, (y + 0.31) / 0.62) }, { p: [0, 0.31, 0] }, 0);
  const n = Math.max(1, Math.round(len / 1.1));
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i + 0.5) * (len / n);
    b.box(len / n - 0.12, 0.2, 0.68, rnd() < 0.5 ? 0xf0c98a : 0xe6b878, { p: [x, 0.72, (rnd() - 0.5) * 0.04] }, 0);
  }
  return b.geometry();
}

/** Seilzaun (Holzpfosten, zwei Seile) entlang +X – Rand an einem Abbruch. dark → dunkle Pfosten mit Kette (Lava). */
export function ropeFenceGeo(len, dark = false) {
  const b = new Build();
  const n = Math.max(2, Math.round(len / 1.6) + 1);
  const post = dark ? 0x3a3036 : 0x9a6a3c, rope = dark ? 0x6a6470 : 0xd8b878;
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i / (n - 1)) * len;
    b.cyl(0.07, 0.09, 0.8, post, { p: [x, 0.4, 0] }, 6);
    b.cone(0.1, 0.14, dark ? 0xff7a2a : 0xb98352, { p: [x, 0.86, 0] }, 5);
  }
  for (const y of [0.42, 0.7]) b.cyl(0.03, 0.03, len, rope, { p: [0, y, 0], r: [0, 0, Math.PI / 2] }, 5);
  return b.geometry();
}

/** Rosa bzw. farbige Hecke (wie Welt 1, eigene Farben). */
export function tintHedgeGeo(len, palette, seed = 1) {
  const [dark, mid, light] = palette;
  const b = new Build();
  b.add(roundedBox(len, 0.88, 0.9, 0.2, SIDE.ALL, SIDE.NY, 2), { v: (x, y) => mix(dark, mid, (y + 0.44) / 0.88) }, { p: [0, 0.44, 0] });
  const n = Math.max(1, Math.round(len / 0.75));
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i + 0.5) * (len / n);
    b.sphere(0.9 * (0.42 + rnd() * 0.12), { v: (px, py, pz, nx, ny) => mix(mid, light, Math.max(0, ny)) }, { p: [x, 0.86, (rnd() - 0.5) * 0.12], s: [1.1, 0.8, 1] }, 7, 4);
  }
  return b.geometry();
}
export const PINK_HEDGE = [0xc94a94, 0xf27cc0, 0xffb4de];

// ------------------------------------------------------------------ Pflanzen

/** Palme: geschwungener Ringelstamm, 7 hängende Wedel, Kokosnüsse. h = Höhe, lean = Neigung (m Versatz oben). */
export function palmGeo(h = 5, lean = 0.8, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const n = 5;
  let px = 0, py = 0;
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n;
    const x0 = lean * t0 * t0, x1 = lean * t1 * t1;
    const y0 = h * t0, y1 = h * t1;
    const len = Math.hypot(x1 - x0, y1 - y0);
    const ang = Math.atan2(x1 - x0, y1 - y0);
    const r0 = 0.2 - 0.07 * t0, r1 = 0.2 - 0.07 * t1;
    b.cyl(r1 + 0.02, r0, len * 1.02, { v: (x, y) => mix(0x7a5230, 0xa87848, (y / len) + 0.5) }, { p: [(x0 + x1) / 2, (y0 + y1) / 2, 0], r: [0, 0, -ang] }, 6, true);
    px = x1; py = y1;
  }
  // Krone
  const fronds = 7;
  for (let i = 0; i < fronds; i++) {
    const a = (i / fronds) * TAU + rnd.real(-0.2, 0.2);
    const L = rnd.real(1.9, 2.4);
    const ca = Math.cos(a), sa = Math.sin(a);
    // innerer Teil leicht ansteigend, äußerer hängt
    b.sphere(1, { v: (x, y, z, nx, ny) => mix(0x2f8a32, 0x6fd04a, Math.max(0, ny) * 0.8 + 0.2) }, { p: [px + ca * L * 0.3, py + 0.18, sa * L * 0.3], r: [0, -a, 0.18], s: [L * 0.34, 0.09, 0.32] }, 6, 3);
    b.sphere(1, { v: (x, y, z, nx, ny) => mix(0x3a9a36, 0x8ae25a, Math.max(0, ny) * 0.8 + 0.2) }, { p: [px + ca * L * 0.78, py - 0.28, sa * L * 0.78], r: [0, -a, -0.55], s: [L * 0.3, 0.07, 0.26] }, 6, 3);
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + 0.4;
    b.sphere(0.16, 0x6a4424, { p: [px + Math.cos(a) * 0.2, py - 0.2, Math.sin(a) * 0.2] }, 5, 3);
  }
  return b.geometry();
}

/** Kaktus (Saguaro): gerippter Stamm, 0–2 Arme, manchmal Blüte. */
export function cactusGeo(h = 2.2, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const rib = (x, y, z) => (Math.floor(((Math.atan2(z, x) / TAU) + 1) * 16) % 2 ? 0x3f9a3c : 0x58b84a);
  const r = 0.26 + h * 0.02;
  b.cyl(r, r, h - r, rib, { p: [0, (h - r) / 2, 0] }, 8, true);
  b.dome(r, 0x58b84a, { p: [0, h - r, 0] }, Math.PI / 2, 8, 3);
  const arms = rnd.int(0, 2);
  for (let i = 0; i < arms; i++) {
    const s = i === 0 ? 1 : -1;
    const ay = rnd.real(h * 0.35, h * 0.55), ah = rnd.real(0.6, 1.0), ar = r * 0.7, out = r + 0.32;
    b.cyl(ar, ar, out, rib, { p: [s * out / 2, ay, 0], r: [0, 0, Math.PI / 2] }, 6, true);
    b.sphere(ar, 0x4aa840, { p: [s * out, ay, 0] }, 6, 4);
    b.cyl(ar, ar, ah, rib, { p: [s * out, ay + ah / 2, 0] }, 6, true);
    b.dome(ar, 0x58b84a, { p: [s * out, ay + ah, 0] }, Math.PI / 2, 6, 2);
  }
  if (rnd.chance(0.5)) b.sphere(0.13, 0xff6aa8, { p: [0, h + 0.02, 0], s: [1, 0.55, 1] }, 6, 3);
  return b.geometry();
}

/** Kugelkaktus mit Blüte. */
export function barrelCactusGeo(r = 0.45) {
  const b = new Build();
  b.sphere(r, (x, y, z) => (Math.floor(((Math.atan2(z, x) / TAU) + 1) * 12) % 2 ? 0x3f9a3c : 0x5cbc4c), { p: [0, r * 0.85, 0], s: [1, 0.9, 1] }, 10, 6);
  b.sphere(0.13, 0xffb43a, { p: [0, r * 1.68, 0], s: [1, 0.55, 1] }, 6, 3);
  return b.geometry();
}

/** Trockenbusch. */
export function shrubGeo(r = 0.5, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  for (let i = 0; i < 3; i++) {
    const a = rnd.real(0, TAU), d = rnd.real(0, r * 0.5);
    b.sphere(r * rnd.real(0.5, 0.7), { v: (x, y, z, nx, ny) => mix(0x8a9a4a, 0xbcc86a, Math.max(0, ny)) }, { p: [Math.cos(a) * d, r * 0.45, Math.sin(a) * d], s: [1, 0.75, 1] }, 6, 4);
  }
  return b.geometry();
}

/** Wüstenfels (gestapelte, runde Brocken in Rot-Ocker). */
export function desertRockGeo(r = 0.8, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const n = rnd.int(2, 3);
  for (let i = 0; i < n; i++) {
    const rr = r * rnd.real(0.55, 1);
    b.add(new THREE.DodecahedronGeometry(rr, 0), { v: (x, y, z, nx, ny) => mix(0xb8683a, 0xe8a668, Math.max(0, ny) * 0.8 + 0.1) },
      { p: [rnd.real(-r, r) * 0.6, rr * 0.55, rnd.real(-r, r) * 0.5], r: [rnd.real(0, 3), rnd.real(0, 3), rnd.real(0, 3)], s: [1, 0.72, 1] });
  }
  return b.geometry();
}

/** Rosa Blütenbaum (rosa Grasland 2-5). */
export function pinkTreeGeo(h = 4.2, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const th = h * 0.45;
  b.cyl(0.16, 0.24, th, { v: (x, y) => mix(0x6a3a2a, 0x8a5238, y / th + 0.5) }, { p: [0, th / 2, 0] }, 6, true);
  const R = h * 0.27;
  const pals = [[0xffd4ec, 0xff9acd], [0xffe4f2, 0xffb0d8], [0xffc0e0, 0xf47cc0]];
  for (const [dx, dy, dz, k] of [[0, 1.0, 0, 1.1], [-0.75, 0.6, 0.25, 0.8], [0.7, 0.7, -0.2, 0.85], [0.1, 1.5, -0.1, 0.7]]) {
    const [hi, lo] = pals[Math.floor(rnd.frac() * pals.length)];
    b.sphere(R * k, { v: (x, y, z, nx, ny) => mix(lo, hi, Math.max(0, ny) * 0.9 + 0.1) }, { p: [dx * R, th + dy * R, dz * R] }, 8, 5);
  }
  return b.geometry();
}

// ------------------------------------------------------------------ Bauwerke

/** Stufenpyramide aus Sandblöcken (base = Grundkante, height = Höhe), goldene Spitze, Eingang nach +Z. */
export function pyramidGeo(base = 16, height = 11, steps = 8) {
  const b = new Build();
  const sh = height / (steps + 0.6);
  for (let i = 0; i < steps; i++) {
    const w = base * (1 - i / (steps + 0.4));
    const c = i % 2 ? 0xe0ac66 : 0xedc282;
    b.box(w, sh, w, { v: (x, y, z, nx, ny) => (ny > 0.5 ? mix(c, 0xfff0c6, 0.35) : Math.abs(nx) > 0.5 ? mix(c, 0x9c6436, 0.18) : c) }, { p: [0, sh * (i + 0.5), 0] }, 0);
  }
  const topW = base * (1 - steps / (steps + 0.4));
  b.cone(topW * 0.72, sh * 1.6, 0xffcf3a, { p: [0, sh * steps + sh * 0.8, 0], r: [0, Math.PI / 4, 0] }, 4);
  // Eingang mit dunkler Öffnung (Vorderseite +Z) auf der untersten Stufe
  const door = new THREE.Shape();
  door.moveTo(-0.9, 0); door.lineTo(-0.9, 1.4); door.lineTo(0, 2.1); door.lineTo(0.9, 1.4); door.lineTo(0.9, 0); door.lineTo(-0.9, 0);
  b.extrude(door, 0.1, 0x2a1a12, { p: [0, 0, base / 2 + 0.03] }, 0, 1);
  b.box(2.4, 0.3, 0.4, 0xf6dc9c, { p: [0, 2.35, base / 2 + 0.12] }, 0);
  return b.geometry();
}

/** Säule (Ruine): kannelierter Schaft, Basis, Kapitell; broken → abgebrochen mit schrägem Bruch. */
export function columnGeo(h = 4, broken = false, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const shaft = broken ? h * rnd.real(0.45, 0.7) : h - 0.7;
  b.box(1.1, 0.35, 1.1, 0xe6c590, { p: [0, 0.175, 0] }, 0);
  b.cyl(0.38, 0.42, shaft, (x, y, z) => (Math.floor(((Math.atan2(z, x) / TAU) + 1) * 12) % 2 ? 0xf0d6a2 : 0xe2c08a), { p: [0, 0.35 + shaft / 2, 0] }, 12, true);
  if (broken) {
    b.cyl(0.36, 0.36, 0.3, 0xe8c896, { p: [0.05, 0.35 + shaft + 0.05, 0], r: [0.35, 0, 0.25] }, 7);
  } else {
    b.cyl(0.5, 0.4, 0.22, 0xf0d6a2, { p: [0, 0.35 + shaft + 0.11, 0] }, 12, true);
    b.box(1.2, 0.3, 1.2, 0xe6c590, { p: [0, 0.35 + shaft + 0.37, 0] }, 0);
  }
  return b.geometry();
}

/** Umgestürzte Säulentrommeln. */
export function fallenColumnGeo(len = 3, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const n = Math.max(1, Math.round(len / 1.1));
  for (let i = 0; i < n; i++) {
    b.cyl(0.38, 0.38, 0.95, (x, y, z) => (Math.floor(((Math.atan2(z, x) / TAU) + 1) * 14) % 2 ? 0xf0d6a2 : 0xe2c08a),
      { p: [-len / 2 + (i + 0.5) * (len / n) + rnd.real(-0.1, 0.1), 0.38, rnd.real(-0.15, 0.15)], r: [rnd.real(-0.2, 0.2), 0, Math.PI / 2] }, 12);
  }
  return b.geometry();
}

/** Ruinen-Torbogen (Durchgang entlang Z). */
export function ruinArchGeo(w = 3.4, h = 4) {
  const b = new Build();
  for (const s of [-1, 1]) {
    b.box(0.9, h, 0.9, { v: (x, y) => mix(0xd8a868, 0xf0c98a, (y + h / 2) / h) }, { p: [s * w / 2, h / 2, 0] }, 0);
    b.box(1.1, 0.3, 1.1, 0xe6b878, { p: [s * w / 2, 0.15, 0] }, 0);
  }
  b.box(w + 1.5, 0.7, 1.1, 0xe9be7e, { p: [0, h + 0.35, 0] }, 0);
  b.box(w * 0.6, 0.35, 1.0, 0xd8a868, { p: [-w * 0.15, h + 0.85, 0], r: [0, 0, 0.06] }, 0);
  return b.geometry();
}

/** Obelisk mit goldener Spitze und Glyphen. */
export function obeliskGeo(h = 6) {
  const b = new Build();
  b.box(1.6, 0.5, 1.6, 0xd8a868, { p: [0, 0.25, 0] }, 0);
  b.add(new THREE.CylinderGeometry(0.42, 0.62, h, 4, 1), { v: (x, y) => mix(0xd99a58, 0xf0c98a, (y + h / 2) / h) }, { p: [0, 0.5 + h / 2, 0], r: [0, Math.PI / 4, 0] });
  b.cone(0.6, 0.9, 0xffcf3a, { p: [0, 0.5 + h + 0.45, 0], r: [0, Math.PI / 4, 0] }, 4);
  // Glyphen (Augen, Wellen, Stern) vorn
  for (let i = 0; i < 4; i++) b.box(0.32, 0.12, 0.04, 0x8a4e26, { p: [0, 1.4 + i * 1.05, 0.5 - i * 0.03] }, 0);
  b.sphere(0.12, 0x2a7ab8, { p: [0, 1.9, 0.48], s: [1, 0.6, 0.4] }, 8, 5);
  return b.geometry();
}

/** Katzen-Sphinx (liegende Sandstein-Katze auf Sockel, Blick +Z) – eine Verbeugung vor dem Krallen-Anzug. */
export function sphinxGeo(s = 1) {
  const b = new Build();
  const S = (v) => v * s;
  const stone = { v: (x, y, z, nx, ny) => mix(0xe0ac66, 0xf6d49a, Math.max(0, ny) * 0.6 + 0.2) };
  b.box(S(2.2), S(0.6), S(3.4), 0xd39253, { p: [0, S(0.3), 0] }, 0.08);
  b.box(S(1.5), S(1.0), S(2.6), stone, { p: [0, S(1.1), S(-0.2)] }, 0.35);              // Körper
  for (const sx of [-1, 1]) b.box(S(0.42), S(0.36), S(1.3), stone, { p: [sx * S(0.48), S(0.78), S(1.35)] }, 0.15);   // Vorderpfoten
  b.box(S(1.15), S(1.0), S(1.0), stone, { p: [0, S(2.0), S(0.9)] }, 0.3);                // Kopf
  for (const sx of [-1, 1]) {
    b.add(new THREE.ConeGeometry(S(0.28), S(0.5), 4), stone, { p: [sx * S(0.36), S(2.68), S(0.9)], r: [0, Math.PI / 4, 0] });
    b.box(S(0.2), S(0.12), S(0.04), 0x2a6a8a, { p: [sx * S(0.25), S(2.08), S(1.41)] }, 0.02);   // Augen (türkis)
  }
  b.sphere(S(0.08), 0xc87850, { p: [0, S(1.88), S(1.42)] }, 6, 4);
  b.torus(S(0.5), S(0.12), stone, { p: [S(0.2), S(0.85), S(-1.5)], r: [0, Math.PI / 2, 0] }, 6, 12, Math.PI);  // Schwanz
  return b.geometry();
}

/** Tonkrüge (Gruppe von 3). */
export function potsGeo(seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const prof = [[0, 0], [0.22, 0], [0.34, 0.2], [0.36, 0.42], [0.24, 0.66], [0.15, 0.74], [0.19, 0.82], [0, 0.82]];
  for (let i = 0; i < 3; i++) {
    const k = rnd.real(0.75, 1.15);
    const col = rnd.pick([0xc8683a, 0xd88a4a, 0xb85a34]);
    b.lathe(prof.map(([r, y]) => [r * k, y * k]), { v: (x, y) => (Math.abs(y * (1 / k) - 0.42) < 0.05 ? 0xf6dc9c : col) }, { p: [(i - 1) * 0.62 + rnd.real(-0.1, 0.1), 0, rnd.real(-0.2, 0.2)] }, 8);
  }
  return b.geometry();
}

/** Beduinenzelt (gestreiftes Dach auf Stangen, Teppich) – Vorderseite +Z. */
export function bedouinTentGeo() {
  const b = new Build();
  const stripe = (x, y, z) => (Math.floor(x * 1.6 + 10) % 2 ? 0xe0452a : 0xfff0d0);
  for (const [x, z] of [[-1.6, -1.2], [1.6, -1.2], [-1.6, 1.2], [1.6, 1.2]]) b.cyl(0.06, 0.06, 2.0, 0x8a5a34, { p: [x, 1.0, z] }, 6);
  b.cyl(0.07, 0.07, 2.6, 0x8a5a34, { p: [0, 1.3, 0] }, 6);
  const roof = new THREE.Shape();
  roof.moveTo(-1.9, 0); roof.lineTo(0, 0.85); roof.lineTo(1.9, 0); roof.lineTo(-1.9, 0);
  b.extrude(roof, 2.8, stripe, { p: [0, 1.95, 0] }, 0, 1);
  b.box(3.0, 0.04, 2.2, (x, y, z) => (Math.floor((x + z) * 2 + 20) % 2 ? 0x7a2a6a : 0xc84a3a), { p: [0, 0.02, 0.2] }, 0);
  b.sphere(0.25, 0x5a3a8a, { p: [-0.8, 0.2, 0.3], s: [1.3, 0.6, 1] }, 8, 5);
  b.sphere(0.25, 0xd8a83a, { p: [0.7, 0.2, 0.4], s: [1.3, 0.6, 1] }, 8, 5);
  return b.geometry();
}

/** Stapel aus Sandblöcken (1 m, Spirale eingeritzt) – Kulisse. n = Anzahl (1–6). */
export function sandBlocksGeo(n = 3, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const spots = [[0, 0, 0], [1.02, 0, 0.1], [0.5, 1.0, 0.05], [-1.0, 0, -0.2], [-0.5, 1, -0.1], [0, 2, 0]];
  for (let i = 0; i < Math.min(n, spots.length); i++) {
    const [x, y, z] = spots[i];
    const c = rnd.pick([0xedc282, 0xe0ac66, 0xf2cf92]);
    b.box(0.98, 0.98, 0.98, { v: (px, py, pz, nx, ny) => (ny > 0.5 ? mix(c, 0xfff0c6, 0.3) : c) }, { p: [x, y + 0.49, z], r: [0, rnd.real(-0.1, 0.1), 0] }, 0);
    b.torus(0.22, 0.04, 0xb07a44, { p: [x, y + 0.5, z + 0.5] }, 3, 10, Math.PI * 1.5);
  }
  return b.geometry();
}

/** Holzkisten-Stapel. */
export function cratesGeo(seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  for (const [x, y, z, s] of [[0, 0, 0, 1], [1.05, 0, 0.1, 0.9], [0.5, 1, 0.05, 0.85]]) {
    b.box(s, s, s, (px, py, pz, nx, ny) => (Math.abs(ny) > 0.5 ? 0xc89a5a : 0xb07a44), { p: [x, y + s / 2, z], r: [0, rnd.real(-0.15, 0.15), 0] }, 0);
    b.box(s * 1.02, 0.1, s * 1.02, 0x7a5230, { p: [x, y + s * 0.2, z] }, 0);
    b.box(s * 1.02, 0.1, s * 1.02, 0x7a5230, { p: [x, y + s * 0.8, z] }, 0);
  }
  return b.geometry();
}

/** Sandsack-Wall entlang +X (Länge len). */
export function sandbagsGeo(len = 4) {
  const b = new Build();
  const n = Math.max(2, Math.round(len / 0.7));
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < n - row; i++) {
      const x = -len / 2 + (i + 0.5 + row * 0.5) * (len / n);
      b.cyl(0.2, 0.2, 0.62, i % 2 ? 0xc8b07a : 0xb89c66, { p: [x, 0.2 + row * 0.34, 0], r: [0, 0, Math.PI / 2], s: [1, 1, 0.75] }, 6);
    }
  }
  return b.geometry();
}

/** Panzer (Baron Brummbärs Kolonne): Ketten, Wanne, Turm mit Kanone, Bär-Emblem. Blick (Kanone) nach +X. */
export function tankGeo(s = 1) {
  const b = new Build();
  const S = (v) => v * s;
  const hull = { v: (x, y, z, nx, ny) => mix(0x5a6a3a, 0x7a8a4a, Math.max(0, ny) * 0.6 + 0.2) };
  for (const sz of [-1, 1]) {
    b.box(S(3.6), S(0.8), S(0.7), 0x3a3638, { p: [0, S(0.4), sz * S(1.05)] }, 0.3);
    for (let i = 0; i < 4; i++) b.cyl(S(0.26), S(0.26), S(0.74), 0x8a8478, { p: [S(-1.2 + i * 0.8), S(0.36), sz * S(1.05)], r: [Math.PI / 2, 0, 0] }, 8);
  }
  b.box(S(3.4), S(0.7), S(1.8), hull, { p: [0, S(1.0), 0] }, 0.18);
  b.box(S(3.2), S(0.12), S(2.6), 0x4a5a32, { p: [0, S(0.82), 0] }, 0);
  b.cyl(S(0.75), S(0.85), S(0.6), hull, { p: [S(-0.2), S(1.65), 0] }, 12, true);
  b.dome(S(0.75), 0x6a7a42, { p: [S(-0.2), S(1.95), 0] }, Math.PI / 2, 12, 3);
  b.cyl(S(0.14), S(0.16), S(2.0), 0x4a5a32, { p: [S(1.4), S(1.7), 0], r: [0, 0, Math.PI / 2] }, 8, true);
  b.cyl(S(0.2), S(0.2), S(0.3), 0x3a3638, { p: [S(2.4), S(1.7), 0], r: [0, 0, Math.PI / 2] }, 8);
  // Emblem: Bärenkopf mit Zylinder (Seite +Z)
  b.cyl(S(0.32), S(0.32), S(0.04), 0xffc21a, { p: [S(-0.2), S(1.65), S(0.82)], r: [Math.PI / 2, 0, 0] }, 12);
  b.sphere(S(0.2), 0x8a5a34, { p: [S(-0.2), S(1.62), S(0.85)], s: [1, 1, 0.4] }, 8, 5);
  b.box(S(0.24), S(0.2), S(0.05), 0x16121c, { p: [S(-0.2), S(1.86), S(0.86)] }, 0);
  return b.geometry();
}

/** Geschützturm mit Kanone und Bärenwappen (sitzt auf dem Deck eines Panzerwagens; Kanone nach +X). */
export function turretGeo(s = 1, olive = false) {
  const b = new Build();
  const S = (v) => v * s;
  const [c0, c1, c2] = olive ? [0x4a5a32, 0x7a8a4a, 0x6a7a42] : [0x8a1c3a, 0xc4304e, 0xb8283e];
  b.cyl(S(0.9), S(1.0), S(0.7), { v: (x, y, z, nx, ny) => mix(c0, c1, Math.max(0, ny) * 0.5 + 0.3) }, { p: [S(-0.4), S(0.35), 0] }, 14, true);
  b.dome(S(0.9), c2, { p: [S(-0.4), S(0.7), 0] }, Math.PI / 2, 14, 4);
  b.torus(S(0.95), S(0.06), 0xffc21a, { p: [S(-0.4), S(0.68), 0], r: [Math.PI / 2, 0, 0] }, 4, 20);
  b.cyl(S(0.17), S(0.2), S(2.2), 0x3a3638, { p: [S(1.1), S(0.85), 0], r: [0, 0, Math.PI / 2] }, 10, true);
  b.cyl(S(0.26), S(0.26), S(0.36), 0x2a2628, { p: [S(2.15), S(0.85), 0], r: [0, 0, Math.PI / 2] }, 10);
  b.cyl(S(0.3), S(0.3), S(0.04), 0xffc21a, { p: [S(-0.4), S(0.8), S(0.92)], r: [Math.PI / 2, 0, 0] }, 12);
  b.sphere(S(0.2), 0x8a5a34, { p: [S(-0.4), S(0.78), S(0.95)], s: [1, 1, 0.4] }, 8, 5);
  b.box(S(0.26), S(0.2), S(0.05), 0x16121c, { p: [S(-0.4), S(1.02), S(0.97)] }, 0);
  return b.geometry();
}

/** Mächtiger Panzer als Kulisse hinter dem Eingang 2-Panzer (größer, mit Antenne und Wimpel). */
export function bigTankGeo() {
  const g = tankGeo(1.6);
  const b = new Build();
  b.cyl(0.03, 0.03, 2.2, 0x2a2a2a, { p: [-1.6, 4.0, -0.8] }, 5);
  const pen = new THREE.Shape(); pen.moveTo(0, 0); pen.lineTo(0.7, -0.18); pen.lineTo(0, -0.36); pen.lineTo(0, 0);
  b.extrude(pen, 0.03, 0xc4304e, { p: [-1.58, 5.0, -0.8] }, 0, 1);
  return merge([g, b.geometry()]);
}

/** Doppelkirschen-Statue (Spiegelfrucht 2-5): zwei rote Kugeln an gebogenen Stielen mit Blatt, auf Sockel. */
export function cherryStatueGeo() {
  const b = new Build();
  b.cyl(1.0, 1.15, 0.6, 0xf6d6ea, { p: [0, 0.3, 0] }, 16);
  b.torus(1.02, 0.07, 0xffc21a, { p: [0, 0.6, 0], r: [Math.PI / 2, 0, 0] }, 4, 18);
  for (const s of [-1, 1]) {
    b.sphere(0.72, { v: (x, y, z, nx, ny) => mix(0xb8102a, 0xff3a4a, Math.max(0, ny) * 0.7 + 0.3) }, { p: [s * 0.62, 1.32, 0] }, 12, 8);
    b.sphere(0.16, 0xffffff, { p: [s * 0.62 - 0.22, 1.62, 0.5], s: [1, 0.7, 0.4] }, 6, 4);
    b.tube([[s * 0.62, 1.95, 0], [s * 0.45, 2.6, 0], [0.05, 3.15, 0]], 0.07, 0x3a7a2a, null, 8, 5);
  }
  b.sphere(0.5, 0x4fc24a, { p: [0.45, 3.2, 0], r: [0, 0, -0.4], s: [1, 0.25, 0.55] }, 8, 4);
  return b.geometry();
}

/** Wüsten-Fackel (Pfosten, Schale – die Flamme macht die Szene als leuchtendes Objekt). */
export function torchStandGeo() {
  const b = new Build();
  b.cyl(0.08, 0.1, 1.6, 0x6a4424, { p: [0, 0.8, 0] }, 6);
  b.cyl(0.26, 0.12, 0.22, 0x8a8478, { p: [0, 1.7, 0] }, 10);
  return b.geometry();
}

/** Oasen-Brunnen: runder Sandsteinring mit Wasser, Holzgestell mit Dach und Eimer. */
export function wellGeo() {
  const b = new Build();
  b.cyl(1.0, 1.08, 0.8, (x, y, z) => (Math.floor(((Math.atan2(z, x) / TAU) + 1) * 12) % 2 ? 0xe0a864 : 0xeebf80), { p: [0, 0.4, 0] }, 16);
  b.torus(0.98, 0.1, 0xf3cf94, { p: [0, 0.8, 0], r: [Math.PI / 2, 0, 0] }, 4, 18);
  b.cyl(0.86, 0.86, 0.06, 0x3fb4ff, { p: [0, 0.62, 0] }, 16);
  for (const s of [-1, 1]) b.box(0.14, 1.9, 0.14, 0x8a5a34, { p: [s * 0.95, 1.55, 0] }, 0);
  b.cyl(0.07, 0.07, 2.0, 0x6a4424, { p: [0, 2.1, 0], r: [0, 0, Math.PI / 2] }, 6);
  const roof = new THREE.Shape(); roof.moveTo(-1.35, 0); roof.lineTo(0, 0.7); roof.lineTo(1.35, 0); roof.lineTo(-1.35, 0);
  b.extrude(roof, 1.3, (x, y, z) => (Math.floor(x * 2.5 + 10) % 2 ? 0xc84a3a : 0xe86a4a), { p: [0, 2.45, 0] }, 0, 1);
  b.cyl(0.16, 0.13, 0.26, 0x9a6a3c, { p: [0.15, 1.55, 0] }, 8);
  b.cyl(0.015, 0.015, 0.5, 0xd8b878, { p: [0.15, 1.9, 0] }, 3);
  return b.geometry();
}

/** Marktstand: Tisch mit Früchten und Krügen unter gestreifter Markise (Vorderseite +Z). */
export function stallGeo() {
  const b = new Build();
  for (const [x, z] of [[-1.2, -0.5], [1.2, -0.5], [-1.2, 0.5], [1.2, 0.5]]) b.cyl(0.05, 0.05, 2.2, 0x8a5a34, { p: [x, 1.1, z] }, 5);
  b.box(2.6, 0.12, 1.2, 0xb07a44, { p: [0, 0.85, 0] }, 0);
  b.box(2.5, 0.75, 0.08, 0x8a5a34, { p: [0, 0.42, 0.55] }, 0);
  b.add(new THREE.BoxGeometry(2.9, 0.08, 1.7, 12, 1, 1), (x) => (Math.floor((x + 1.45) / 0.36) % 2 ? 0xfff0d0 : 0x2a8ad8), { p: [0, 2.25, 0.15], r: [0.18, 0, 0] });
  const fruit = [[0xff8a1f, -0.8], [0xffd23a, -0.3], [0xe8305a, 0.2], [0x6cc74d, 0.7]];
  for (const [c, x] of fruit) for (let k = 0; k < 3; k++) b.sphere(0.11, c, { p: [x + (k - 1) * 0.12, 0.98 + (k === 1 ? 0.08 : 0), 0.1 + (k % 2) * 0.12] }, 6, 4);
  b.lathe([[0, 0], [0.16, 0], [0.2, 0.18], [0.1, 0.36], [0.12, 0.42], [0, 0.42]], 0xc8683a, { p: [1.0, 0.91, -0.25] }, 8);
  return b.geometry();
}

/** Trockene Grasbüschel in einem Feld (size [w, d], n Büschel) – Bodendeko ohne Kollision. */
export function tuftsGeo(size = [6, 6], n = 8, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  for (let i = 0; i < n; i++) {
    const x = rnd.real(-size[0] / 2, size[0] / 2), z = rnd.real(-size[1] / 2, size[1] / 2);
    const c = rnd.pick([0xb8b860, 0xa8b45a, 0xd8c47a]);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU + rnd.real(0, 0.6);
      b.cone(0.05, rnd.real(0.3, 0.5), c, { p: [x + Math.cos(a) * 0.08, 0.18, z + Math.sin(a) * 0.08], r: [Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35] }, 3);
    }
  }
  return b.geometry();
}

/** Muscheln und Seesterne am Strand (size [w, d], n). */
export function shellsGeo(size = [8, 3], n = 6, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  for (let i = 0; i < n; i++) {
    const x = rnd.real(-size[0] / 2, size[0] / 2), z = rnd.real(-size[1] / 2, size[1] / 2);
    if (i % 2) b.extrude(starShape5(0.22, 0.09), 0.05, rnd.pick([0xff7a5a, 0xffa04a, 0xff6a8a]), { p: [x, 0.025, z], r: [-Math.PI / 2, 0, rnd.real(0, 6)] }, 0.015, 1);
    else b.dome(0.14, (px, py, pz) => (Math.floor((Math.atan2(pz, px) + 4) * 2.2) % 2 ? 0xfff0e0 : 0xffc8b0), { p: [x, 0, z], s: [1, 0.55, 1.2], r: [0, rnd.real(0, 6), 0] }, Math.PI / 2, 8, 2);
  }
  return b.geometry();
}
function starShape5(R, r) {
  const sh = new THREE.Shape();
  for (let i = 0; i <= 10; i++) { const a = Math.PI / 2 + (i / 10) * TAU, q = i % 2 ? r : R; if (!i) sh.moveTo(Math.cos(a) * q, Math.sin(a) * q); else sh.lineTo(Math.cos(a) * q, Math.sin(a) * q); }
  return sh;
}

/** Pflanzbeet: niedriger Sandsteinkasten (size [w, d]) mit Sand und Kugelkakteen. */
export function planterGeo(size = [3, 3], seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const [w, d] = size;
  b.box(w, 0.6, d, { v: (x, y, z, nx, ny) => (ny > 0.5 ? 0xf3cf94 : 0xd99a58) }, { p: [0, 0.3, 0] }, 0);
  b.box(w - 0.3, 0.06, d - 0.3, 0xf6dc9c, { p: [0, 0.61, 0] }, 0);
  for (let i = 0; i < 3; i++) {
    const g = barrelCactusGeo(rnd.real(0.28, 0.4));
    g.translate(rnd.real(-w / 2 + 0.6, w / 2 - 0.6), 0.6, rnd.real(-d / 2 + 0.6, d / 2 - 0.6));
    b.parts.push(g);
  }
  return b.geometry();
}

/** Geometrie einer Requisite nach Art (für map.props). */
export function propGeo(it, seed) {
  switch (it.kind) {
    case 'palm': return palmGeo(it.size ?? 5, it.lean ?? 0.8, seed);
    case 'cactus': return cactusGeo(it.size ?? 2.2, seed);
    case 'barrel': return barrelCactusGeo(it.size ?? 0.45);
    case 'shrub': return shrubGeo(it.size ?? 0.5, seed);
    case 'rock': return desertRockGeo(it.size ?? 0.8, seed);
    case 'pinktree': return pinkTreeGeo(it.size ?? 4.2, seed);
    case 'pyramid': return pyramidGeo(it.size?.[0] ?? 16, it.size?.[1] ?? 11, it.steps ?? 8);
    case 'column': return columnGeo(it.size ?? 4, !!it.broken, seed);
    case 'fallen': return fallenColumnGeo(it.size ?? 3, seed);
    case 'arch': return ruinArchGeo(it.width ?? 3.4, it.size ?? 4);
    case 'obelisk': return obeliskGeo(it.size ?? 6);
    case 'sphinx': return sphinxGeo(it.size ?? 1);
    case 'pots': return potsGeo(seed);
    case 'tent': return bedouinTentGeo();
    case 'sandblocks': return sandBlocksGeo(it.n ?? 3, seed);
    case 'crates': return cratesGeo(seed);
    case 'sandbags': return sandbagsGeo(it.size ?? 4);
    case 'tank': return tankGeo(it.size ?? 1);
    case 'bigtank': return bigTankGeo();
    case 'cherry': return cherryStatueGeo();
    case 'torch': return torchStandGeo();
    case 'well': return wellGeo();
    case 'stall': return stallGeo();
    case 'tufts': return tuftsGeo(it.size ?? [6, 6], it.n ?? 8, seed);
    case 'shells': return shellsGeo(it.size ?? [8, 3], it.n ?? 6, seed);
    case 'planter': return planterGeo(it.size ?? [3, 3], seed);
    default: return null;
  }
}

/** Kollision einer Requisite (begehbares Gelände): Zylinder/Quader oder null. */
export function propShape(it) {
  const [x, y, z] = it.pos;
  const cyl = (r, h) => ({ type: 'cyl', x, z, r, y0: y - 0.2, y1: y + h, tag: `deko:${it.kind}` });
  switch (it.kind) {
    case 'palm': return cyl(0.3, 4);
    case 'cactus': return cyl(0.35, it.size ?? 2.2);
    case 'barrel': return cyl(0.4, 0.8);
    case 'column': return cyl(0.5, it.size ?? 4);
    case 'obelisk': return cyl(0.85, 6);
    case 'torch': return cyl(0.22, 1.8);
    case 'pots': return cyl(0.75, 0.8);
    case 'cherry': return cyl(1.1, 3.2);
    case 'pinktree': return cyl(0.3, 3);
    case 'tank': {
      // Panzerwagen 6,4 × 3,4 m, um yaw gedreht: achsenparalleler Umriss
      const k = it.size ?? 1, c = Math.abs(Math.cos(it.yaw ?? 0)), s = Math.abs(Math.sin(it.yaw ?? 0));
      const hx = ((6.4 * c + 3.4 * s) * k) / 2, hz = ((6.4 * s + 3.4 * c) * k) / 2;
      return { type: 'box', min: [x - hx, y - 0.2, z - hz], max: [x + hx, y + 2.6 * k, z + hz], tag: 'deko:panzer' };
    }
    case 'tent': return cyl(1.7, 2.8);
    case 'crates': return cyl(1.1, 2);
    case 'sandblocks': return cyl(1.0, (it.n ?? 3) > 2 ? 2 : 1);
    case 'well': return cyl(1.1, 2.6);
    case 'stall': return { type: 'box', min: [x - 1.35, y - 0.2, z - 0.65], max: [x + 1.35, y + 1.0, z + 0.65], tag: 'deko:stand' };
    case 'planter': { const [w, d] = it.size ?? [3, 3]; return { type: 'box', min: [x - w / 2, y - 0.2, z - d / 2], max: [x + w / 2, y + 0.6, z + d / 2], tag: 'deko:beet' }; }
    case 'sandbags': {
      // Wall der Länge size, um yaw gedreht: achsenparalleler Umriss
      const L = it.size ?? 4, c = Math.abs(Math.cos(it.yaw ?? 0)), s = Math.abs(Math.sin(it.yaw ?? 0));
      const hx = (L * c + 0.5 * s) / 2, hz = (L * s + 0.5 * c) / 2;
      return { type: 'box', min: [x - hx, y - 0.2, z - hz], max: [x + hx, y + 0.62, z + hz], tag: 'deko:sandsaecke' };
    }
    default: return null;
  }
}
