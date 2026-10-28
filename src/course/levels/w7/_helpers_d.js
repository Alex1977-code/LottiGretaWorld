// Hilfen für die Welt-7-Level 7-C „Siebenfeuer-Saal der Werfer-Bande“, 7-7 „Ebbe und Glut im Brodelkrater“ und 7-Burg
// „Kampfwagen-Duell in der Glutfeste“ (kein Level: exportiert kein LEVEL, die Level-Registry überspringt dieses Modul). Nur für
// diese drei Level – andere Welt-7-Level haben eigene Hilfsdateien (_helpers_a/b/c werden nur gelesen). Alles Level-Lokale hängt
// sich über die offiziellen Aufbau-Haken an (LEVEL.build / LEVEL.setup, Präzisierung „Leistung und Level-Haken 2“) und über
// level.onStep / view.onFrame.
//
//   1) Daten-Helfer   isl (Insel über ihre Grundfläche), line/ring/arc/column (Münzen), sign
//   2) 7-C            saal7C (Werfer-Halle: Kacheln, Siebenfeuer-Mosaik, Backsteinmauern mit Fenstern, Empore, Kanzel,
//                     Balkone, Lager), siebenFeuer (sieben Feuerschalen – je besiegtem Werfer erlischt eine)
//   3) 7-7            (Vulkan-Lavasee) – siehe unten
//   4) 7-Burg         (Lava-Burg) – siehe unten
// Statische Teile gehen über addStatic in die Abschnitts-Meshes (keine zusätzlichen Zeichenaufrufe), belebte Kleinigkeiten sind
// je ein Mesh bzw. eine Instanz-Gruppe ohne Sonnenschatten.

import * as THREE from 'three';
import { lin, hex, addObject, Rnd } from '../../blocks/kit.js';
import { visDt } from '../../entities/gimmick.js';
import { Bld, litTop, gradY, glowField, onRespawn } from '../w5/_helpers_b.js';
import { ziegel, werferKram, wappenMosaik } from './_helpers_a.js';
import { fireMaterial } from '../../blocks/w7kit.js';

export { Bld, litTop, gradY, glowField, onRespawn };

const TAU = Math.PI * 2;

// =====================================================================================================================
// 1) Daten-Helfer
// =====================================================================================================================

/** Insel über ihre Grundfläche x0..x1, zA..zB (Reihenfolge egal), Oberseite top, Höhe h; o: weitere Felder. */
export function isl(x0, x1, zA, zB, top, h = 4, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  return { type: 'island', pos: [(x0 + x1) / 2, top - h, (z0 + z1) / 2], size: [x1 - x0, h, z0 - z1], under: 0, top: 'stone', ...o };
}
/** Münzen in einer Reihe. */
export const line = (from, to, n) => ({ kind: 'coins', from, to, n });
/** Münzring um pos. */
export const ring = (pos, r, n) => ({ kind: 'coins', pos, r, n });
/** Münzbogen von a nach b mit Scheitel h über der Verbindungslinie. */
export function arc(a, b, n, h = 2) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    out.push({ kind: 'coin', pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * h * t * (1 - t), a[2] + (b[2] - a[2]) * t] });
  }
  return out;
}
/** Münzsäule (senkrecht). */
export const column = (x, z, y0, y1, n) => ({ kind: 'coins', from: [x, y0, z], to: [x, y1, z], n });
/** Holzschild. */
export const sign = (x, y, z, text, o = {}) => ({ type: 'sign', pos: [x, y, z], text, size: o.size ?? [2.4, 0.9], yaw: o.yaw ?? 0 });

// =====================================================================================================================
// gemeinsame Kleinteile
// =====================================================================================================================

/**
 * Schachbrett-Kacheln auf einer waagerechten Fläche (Bld b): x0..x1 × zA..zB auf Höhe y, Kachel cell m; pal = [hell, dunkel]
 * (je Farbe leicht variiert), avoid [[x0, x1, zA, zB], …] (frei lassen), diag true = Rauten (45°).
 */
export function kacheln(b, x0, x1, zA, zB, y, pal, rnd, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB), cell = o.cell ?? 1.2, gap = o.gap ?? 0.07;
  const col = new THREE.Color();
  const avoid = o.avoid ?? [];
  const free = (x, z) => !avoid.some((a) => x > a[0] && x < a[1] && z < Math.max(a[2], a[3]) && z > Math.min(a[2], a[3]));
  for (let z = z1, j = 0; z < z0 - 0.05; z += cell, j++) {
    const d = Math.min(cell, z0 - z) - gap;
    for (let x = x0, i = 0; x < x1 - 0.05; x += cell, i++) {
      const w = Math.min(cell, x1 - x) - gap;
      const cx = x + (w + gap) / 2, cz = z + (d + gap) / 2;
      if (w < 0.15 || d < 0.15 || !free(cx, cz)) continue;
      const k = (i + j) % 2;
      col.set(pal[k]).multiplyScalar(0.93 + rnd.frac() * 0.12);
      b.box(w, 0.05, d, cx, y, cz, col.clone(), { r: 0 });
    }
  }
}

/** Rundbogen-Fenster (Kulisse) auf einer senkrechten Fläche: Leuchtfläche (g) mit Steinrahmen (b). axis 'x' = Fläche entlang x. */
export function bogenFenster(b, g, axis, at, u, y, w, h, dir, o = {}) {
  const glow = o.glow ?? 0xff9a3a, frame = o.frame ?? 0xb8aaa8, off = at + dir * 0.03;
  const B = (bw, bh, bd, uu, yy, col, opt = {}) => (axis === 'x' ? b.box(bw, bh, bd, uu, yy, off, col, opt) : b.box(bd, bh, bw, off, yy, uu, col, opt));
  const G = (bw, bh, bd, uu, yy, col) => (axis === 'x' ? g.box(bw, bh, bd, uu, yy, off + dir * 0.01, col, { r: 0 }) : g.box(bd, bh, bw, off + dir * 0.01, yy, uu, col, { r: 0 }));
  G(w, h - w / 2, 0.06, u, y, glow);
  // Bogen aus Stufen (Halbkreis angenähert)
  const n = 5;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI, a1 = ((i + 1) / n) * Math.PI;
    const xa = Math.cos(a0) * w / 2, xb = Math.cos(a1) * w / 2, ya = Math.sin((a0 + a1) / 2) * w / 2;
    G(Math.abs(xa - xb) + 0.02, ya, 0.06, u + (xa + xb) / 2, y + h - w / 2, glow);
  }
  // Rahmen: Pfosten, Sohlbank, Schlussstein, Gitterkreuz
  B(0.14, h - w / 2, 0.14, u - w / 2 - 0.05, y, litTop(frame, 0.65), { r: 0 });
  B(0.14, h - w / 2, 0.14, u + w / 2 + 0.05, y, litTop(frame, 0.65), { r: 0 });
  B(w + 0.4, 0.14, 0.2, u, y - 0.12, litTop(frame, 0.65), { r: 0 });
  B(0.28, 0.32, 0.18, u, y + h - 0.08, litTop(o.key ?? 0xffc23a, 0.6), { r: 0 });
  B(0.06, h - 0.1, 0.1, u, y, 0x2a1a1a, { r: 0 });
  B(w, 0.06, 0.1, u, y + (h - w / 2) * 0.55, 0x2a1a1a, { r: 0 });
}

/** Flammen-Geometrie (Kegel mit Farbverlauf gelb → orange → rot), Fuß bei y = 0, Höhe h. */
export function flammeGeo(r = 0.28, h = 0.8, seg = 7) {
  const g = new THREE.ConeGeometry(r, h, seg, 3).toNonIndexed();
  g.translate(0, h / 2, 0);
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3);
  const a = new THREE.Color(0xfff0a0), m = new THREE.Color(0xffa020), e = new THREE.Color(0xff3a10), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const k = pos.getY(i) / h;
    if (k < 0.45) c.copy(a).lerp(m, k / 0.45); else c.copy(m).lerp(e, (k - 0.45) / 0.55);
    c.toArray(col, i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

// =====================================================================================================================
// 2) 7-C: Siebenfeuer-Saal
// =====================================================================================================================

export const SAAL = {
  brick: [0x8a2e2c, 0x9a3a34, 0x7a2626, 0xa84438, 0x6e2224],
  stone: 0xb8aaa8, stoneDark: 0x6a5a62, gold: 0xffc23a, red: 0xd8323a, redDark: 0x8a1a26, wood: 0x9a6038, woodDark: 0x5a3820,
  tileA: 0xc89a7a, tileB: 0x8a6a72, carpet: 0xc8283a, iron: 0x3a3440,
};

/** Siebenfeuer-Mosaik (Boden): Goldring, dunkelroter Grund, sieben Flammen im Kreis, glühende Mitte. */
export function siebenfeuerMosaik(b, g, x, y, z, r = 2.6) {
  b.cyl(r, r, 0.05, x, y, z, SAAL.gold, 36);
  b.cyl(r * 0.9, r * 0.9, 0.06, x, y, z, SAAL.redDark, 36);
  b.cyl(r * 0.36, r * 0.36, 0.07, x, y, z, SAAL.gold, 20);
  g.cyl(r * 0.24, r * 0.24, 0.08, x, y, z, 0xffa020, 16);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU - Math.PI / 2, cx = x + Math.cos(a) * r * 0.62, cz = z + Math.sin(a) * r * 0.62;
    // liegende Flamme: Tropfen aus Kugel + Kegel, Spitze nach außen
    g.sphere(r * 0.13, cx, y + 0.07, cz, 0xff7a1a, { s: [1, 0.25, 1], ws: 10, hs: 4 });
    g.cone(r * 0.12, r * 0.3, cx + Math.cos(a) * r * 0.12, y + 0.07, cz + Math.sin(a) * r * 0.12, 0xffc23a, 6, { rx: 0 });
    b.box(0.07, 0.065, r * 0.55, x + Math.cos(a + Math.PI / 7) * r * 0.56, y, z + Math.sin(a + Math.PI / 7) * r * 0.56, SAAL.gold, { yaw: -(a + Math.PI / 7) + Math.PI / 2, r: 0 });
  }
}

/**
 * 7-C: Kulisse der Werfer-Halle. o: { Y (Boden), YT (Empore), YK (Kanzel), YB (Balkone), W (halbe Innenweite), ZT (Vorderkante
 * der Empore), holes [[x0, x1, zA, zB], …] (Gitterlöcher im Boden), mosaic: [x, z] }.
 */
export function saal7C(level, o) {
  const { Y, YT, YK, YB, W, ZT } = o;
  const rnd = new Rnd(7307);
  const b = new Bld(), g = new Bld();
  const T = 0.8;                       // Mauerstärke
  // ---------------- Boden: Kacheln (Rauten-Schachbrett), Läufer, Siebenfeuer-Mosaik
  const [mx, mz] = o.mosaic ?? [0, 2.4];
  const carpet = [-1.1, 1.1, ZT + 2.4, W];
  kacheln(b, -W, W, ZT + 2.4, W, Y + 0.005, [SAAL.tileA, SAAL.tileB], rnd, { cell: 1.25, avoid: [...(o.holes ?? []), carpet, [mx - 2.8, mx + 2.8, mz + 2.8, mz - 2.8]] });
  kacheln(b, -W, -1.9, ZT, ZT + 2.4, Y + 0.005, [SAAL.tileA, SAAL.tileB], rnd, { cell: 1.25 });
  kacheln(b, 1.9, W, ZT, ZT + 2.4, Y + 0.005, [SAAL.tileA, SAAL.tileB], rnd, { cell: 1.25 });
  siebenfeuerMosaik(b, g, mx, Y + 0.01, mz, 2.6);
  // Läufer vom Eingang über die Treppe bis zur Kanzel
  const run = (zA, zB, y) => {
    const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
    b.box(2.0, 0.03, z0 - z1, 0, y + 0.01, (z0 + z1) / 2, SAAL.carpet, { r: 0 });
    for (const s of [-1, 1]) b.box(0.12, 0.035, z0 - z1, s * 0.94, y + 0.012, (z0 + z1) / 2, SAAL.gold, { r: 0 });
  };
  run(W - 0.4, mz + 2.75, Y); run(mz - 2.75, ZT + 2.4, Y);
  // Treppe: Läufer auf jeder Stufe
  const steps = o.steps ?? 8, rise = (YT - Y) / steps, stepRun = 2.4 / steps;
  for (let i = 0; i < steps; i++) {
    const z = ZT + 2.4 - (i + 0.5) * stepRun;
    b.box(2.0, 0.03, stepRun - 0.04, 0, Y + rise * (i + 1) + 0.005, z, SAAL.carpet, { r: 0 });
    b.box(2.04, 0.05, 0.06, 0, Y + rise * (i + 1) - 0.02, z + stepRun / 2 - 0.03, SAAL.gold, { r: 0 });
  }
  // Empore: Kacheln oben, Läufer zur Kanzel
  kacheln(b, -W, W, -W, ZT, YT + 0.005, [0xb08a72, 0x7a5c66], rnd, { cell: 1.25, avoid: [[-1.1, 1.1, ZT, -W + 1.4]] });
  run(ZT, -W + 1.4, YT);
  // ---------------- Vorderseite der Empore: Backstein, Glutnischen, Goldkante
  ziegel(b, { axis: 'x', at: ZT, a0: -W, a1: -1.85, y0: Y, y1: YT - 0.18, dir: 1, depth: 0.1, pal: SAAL.brick }, rnd);
  ziegel(b, { axis: 'x', at: ZT, a0: 1.85, a1: W, y0: Y, y1: YT - 0.18, dir: 1, depth: 0.1, pal: SAAL.brick }, rnd);
  b.box(2 * W, 0.2, 0.3, 0, YT - 0.2, ZT + 0.06, litTop(SAAL.stone, 0.6), { r: 0 });
  b.box(2 * W, 0.06, 0.32, 0, YT - 0.02, ZT + 0.07, SAAL.gold, { r: 0 });
  for (const x of [-7.6, -4.6, 4.6, 7.6]) {
    g.box(0.9, 0.9, 0.06, x, Y + 0.45, ZT + 0.09, 0xff8a2a, { r: 0 });
    g.sphere(0.32, x, Y + 1.35, ZT + 0.09, 0xff8a2a, { s: [1.4, 1, 0.2], ws: 10, hs: 6 });
    b.box(1.2, 0.14, 0.24, x, Y + 0.3, ZT + 0.14, litTop(SAAL.stone, 0.6), { r: 0 });
    b.box(0.16, 1.3, 0.2, x - 0.6, Y + 0.3, ZT + 0.12, litTop(SAAL.stone, 0.6), { r: 0 });
    b.box(0.16, 1.3, 0.2, x + 0.6, Y + 0.3, ZT + 0.12, litTop(SAAL.stone, 0.6), { r: 0 });
  }
  // Treppenwangen mit Goldknäufen
  for (const s of [-1, 1]) {
    b.box(0.3, 0.6, 2.5, s * 1.25, Y, ZT + 1.2, litTop(SAAL.stone, 0.62), { r: 0 });
    b.box(0.3, YT - Y + 0.6, 0.3, s * 1.25, Y, ZT + 0.15, litTop(SAAL.stone, 0.62), { r: 0 });
    b.sphere(0.2, s * 1.25, YT + 0.8, ZT + 0.15, SAAL.gold, { ws: 10, hs: 7 });
  }
  // ---------------- Mauern (Backstein, Pfeiler, Gesims, Fenster mit Lavaschein)
  const H = o.wallH ?? 5.2;
  // Seitenmauern (Innenseite)
  for (const s of [-1, 1]) {
    const at = s * W;
    b.box(T, H + 0.6, 2 * W + T, s * (W + T / 2), Y - 0.6, -T / 2, 0x3a1a1c, { r: 0 });
    ziegel(b, { axis: 'z', at, a0: -W, a1: W, y0: Y, y1: Y + H - 0.3, dir: -s, depth: 0.1, pal: SAAL.brick, shift: s > 0 ? 1 : 0 }, rnd);
    b.box(0.26, 0.34, 2 * W, at - s * 0.1, Y + H - 0.34, 0, litTop(SAAL.stone, 0.6), { r: 0 });
    for (const z of [-6.6, -0.4, 5.8]) {
      b.box(0.36, H - 0.3, 0.7, at - s * 0.14, Y, z, litTop(SAAL.stone, 0.62), { r: 0 });
      b.box(0.5, 0.3, 0.86, at - s * 0.16, Y + H - 0.62, z, litTop(SAAL.stone, 0.62), { r: 0 });
    }
    for (const z of [-3.6, 2.8, 8.2]) bogenFenster(b, g, 'z', at, z, Y + 2.9, 1.3, 1.9, -s);
    // Zinnen obenauf
    for (let z = -W + 0.6; z < W; z += 1.5) b.box(T, 0.6, 0.8, s * (W + T / 2), Y + H, z, litTop(SAAL.stone, 0.6), { r: 0 });
  }
  // Rückwand
  b.box(2 * W + 2 * T, H + 2.2 + 0.6, T, 0, Y - 0.6, -W - T / 2, 0x3a1a1c, { r: 0 });
  ziegel(b, { axis: 'x', at: -W, a0: -W, a1: W, y0: YT, y1: Y + H + 1.9, dir: 1, depth: 0.1, pal: SAAL.brick }, rnd);
  for (const x of [-6.2, 6.2]) bogenFenster(b, g, 'x', -W, x, YT + 1.4, 1.6, 2.6, 1);
  bogenFenster(b, g, 'x', -W, 0, YT + 4.0, 2.2, 3.0, 1, { glow: 0xffb04a });
  b.box(2 * W, 0.34, 0.26, 0, Y + H + 1.86, -W + 0.1, litTop(SAAL.stone, 0.6), { r: 0 });
  for (let x = -W + 0.6; x < W; x += 1.5) b.box(0.8, 0.6, T, x, Y + H + 2.2, -W - T / 2, litTop(SAAL.stone, 0.6), { r: 0 });
  // Vordere Brüstung (niedrig, die Kamera sieht darüber) mit Zinnen
  b.box(2 * W + 2 * T, 1.0 + 0.6, T, 0, Y - 0.6, W + T / 2, litTop(SAAL.stoneDark, 0.6), { r: 0 });
  ziegel(b, { axis: 'x', at: W, a0: -W, a1: W, y0: Y, y1: Y + 0.9, dir: -1, depth: 0.08, pal: SAAL.brick }, rnd);
  b.box(2 * W + 2 * T, 0.16, T + 0.1, 0, Y + 1.0, W + T / 2, litTop(SAAL.stone, 0.6), { r: 0 });
  for (let x = -W; x <= W; x += 2.5) { b.box(0.7, 0.45, T, x, Y + 1.16, W + T / 2, litTop(SAAL.stone, 0.55), { r: 0 }); }
  // ---------------- Kanzel (Einweg-Plattform über der Empore): Holzboden, Pfosten, Banner
  const kz = o.kanzel ?? [-8.0, 2.8, 4.4];   // [Mitte z, Tiefe, Breite]
  const [kc, kd, kw] = kz;
  b.box(kw, 0.36, kd, 0, YK - 0.36, kc, litTop(SAAL.wood, 0.6), { r: 0.03 });
  for (let i = 0; i < 5; i++) b.box(kw - 0.1, 0.02, 0.06, 0, YK, kc - kd / 2 + 0.3 + i * (kd - 0.6) / 4, SAAL.woodDark, { r: 0 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.cyl(0.16, 0.18, YK - YT - 0.36, sx * (kw / 2 - 0.2), YT, kc + sz * (kd / 2 - 0.2), litTop(SAAL.woodDark, 0.7), 8);
  b.box(kw + 0.2, 0.12, 0.14, 0, YK - 0.5, kc + kd / 2 + 0.02, SAAL.gold, { r: 0 });
  b.box(1.6, 1.4, 0.05, 0, YK - 1.9, kc + kd / 2 + 0.06, SAAL.red, { r: 0 });
  for (let i = 0; i < 3; i++) b.box(0.5, 0.28, 0.05, -0.5 + i * 0.5, YK - 2.1, kc + kd / 2 + 0.06, SAAL.red, { r: 0, yaw: 0, rz: Math.PI / 4 });
  g.sphere(0.34, 0, YK - 1.2, kc + kd / 2 + 0.1, 0xffa020, { s: [1, 1.25, 0.25], ws: 10, hs: 7 });
  // ---------------- Balkone (Einweg) links und rechts: Holzdielen, Steinkonsolen, Geländerpfosten vorn
  for (const s of [-1, 1]) {
    const [x0, x1] = s < 0 ? [-W, -W + o.balkonW] : [W - o.balkonW, W];
    const cx = (x0 + x1) / 2, [bz0, bz1] = o.balkonZ, cz = (bz0 + bz1) / 2, bd = Math.abs(bz1 - bz0);
    b.box(x1 - x0, 0.32, bd, cx, YB - 0.32, cz, litTop(SAAL.wood, 0.6), { r: 0.03 });
    for (let k = 0; k < 4; k++) b.box(x1 - x0 - 0.1, 0.02, 0.05, cx, YB, cz - bd / 2 + 0.4 + k * (bd - 0.8) / 3, SAAL.woodDark, { r: 0 });
    for (const z of [cz - bd / 2 + 0.5, cz, cz + bd / 2 - 0.5]) b.box(0.5, 0.9, 0.5, s * (W - 0.25), YB - 1.2, z, litTop(SAAL.stone, 0.6), { r: 0.04 });
    b.box(0.14, 0.14, bd, x0 + (s < 0 ? x1 - x0 - 0.07 : 0.07), YB - 0.46, cz, SAAL.gold, { r: 0 });
    // Wimpel unter der Kante
    for (let k = 0; k < 4; k++) {
      const z = cz - bd / 2 + 0.75 + k * (bd - 1.5) / 3, x = s < 0 ? x1 - 0.05 : x0 + 0.05;
      b.cone(0.26, 0.7, x, YB - 1.05, z, [0xffc23a, 0x3d8bff, 0xff4a3d, 0x4fd04a][(k + (s > 0 ? 1 : 0)) % 4], 3, { rx: Math.PI });
    }
  }
  // ---------------- Lager der Bande (Feuerkugel-Körbe, Fässer, Kisten) und Brummbär-Wappen
  werferKram(b, g, [[-8.4, YT, -8.6, 0.4], [7.6, YT, -8.8, -0.6], [-8.6, Y, 4.8, 1.2]], rnd);
  wappenMosaik(b, 0, YT + 0.012, -4.6, 1.1);
  b.flush(level, { castShadow: false });
  g.flush(level, { material: 'glow', castShadow: false });
}

/**
 * Sieben Feuerschalen (7-C, „Siebenfeuer“): Steinsockel mit Eisenschale, darüber eine flackernde Flamme (eine Instanz-Gruppe).
 * Schale i gehört zum Werfer mit der Daten-Id ids[i]: ist er besiegt (oder fehlt er), erlischt die Flamme mit Rauchwolke und
 * „puff“; nach dem Neustart der Arena (neue Werfer) brennen alle wieder. list [[x, y, z], …] (Fußpunkt des Sockels).
 * → level.named.get('siebenfeuer') = { lit (brennende), out, info() }
 */
export function siebenFeuer(level, list, ids, o = {}) {
  const h = o.h ?? 0.9;
  const b = new Bld(), g = new Bld();
  for (const [x, y, z] of list) {
    b.cyl(0.3, 0.38, h, x, y, z, litTop(SAAL.stone, 0.6), 8);
    b.cyl(0.42, 0.32, 0.12, x, y + h, z, litTop(SAAL.stone, 0.6), 8);
    b.cyl(0.5, 0.3, 0.32, x, y + h + 0.12, z, litTop(SAAL.iron, 0.55), 10, { open: false });
    b.torus(0.5, 0.05, x, y + h + 0.44, z, SAAL.gold, { rx: Math.PI / 2, ts: 14, rs: 4 });
    g.cyl(0.42, 0.42, 0.04, x, y + h + 0.4, z, 0xff6a1a, 10);
  }
  b.flush(level, { castShadow: false });
  g.flush(level, { material: 'glow', castShadow: false });
  const st = { lit: list.length, on: list.map(() => true), k: list.map(() => 1), out: 0 };
  const handle = { get lit() { return st.lit; }, get out() { return st.out; }, info: () => ({ lit: st.lit, out: st.out, on: st.on.slice() }) };
  level.named.set('siebenfeuer', handle);
  const alive = (id) => level.entities.some((e) => e.spec?.id === id && e.alive && !e.removed && !e.defeated);
  level.onStep(() => {
    let lit = 0;
    for (let i = 0; i < list.length; i++) {
      const on = alive(ids[i]);
      if (st.on[i] && !on) {
        st.out++;
        const [x, y, z] = list[i];
        level.effects?.dust({ x, y: y + h + 0.6, z }, 8, 1.2);
        level.effects?.sparks({ x, y: y + h + 0.7, z }, 6);
        level.sfx('poof');
      }
      st.on[i] = on;
      if (on) lit++;
    }
    st.lit = lit;
  });
  if (!level.view) return handle;
  const geo = flammeGeo(0.3, 0.95, 7);
  const mat = fireMaterial(level);
  const mesh = new THREE.InstancedMesh(geo, mat, list.length);
  mesh.castShadow = false; mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  const glow = glowField(level);
  const pts = glow?.add(list.map(([x, y, z]) => [x, y + h + 0.95, z, 1]), { color: 0xff8a2a, size: 2.6, opacity: 0.55, pulse: 1.3 });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const holder = {};
  let t = 0;
  addObject(level, mesh, (dt) => {
    t += visDt(level, holder, dt);
    for (let i = 0; i < list.length; i++) {
      const target = st.on[i] ? 1 : 0;
      st.k[i] += (target - st.k[i]) * Math.min(1, dt * 6);
      const k = st.k[i], [x, y, z] = list[i];
      const fl = 1 + Math.sin(t * 11 + i * 1.7) * 0.12 + Math.sin(t * 17 + i) * 0.06;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t * 2 + i);
      s.set(k * (1 + Math.sin(t * 9 + i) * 0.06), Math.max(0.001, k * fl), k * (1 + Math.cos(t * 8 + i) * 0.06));
      p.set(x, y + h + 0.36, z);
      mesh.setMatrixAt(i, m4.compose(p, q, s));
      if (glow && pts !== undefined) {
        const kk = (pts + i) * 3;
        glow.pos[kk + 1] = k > 0.05 ? y + h + 0.95 : -999;
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (glow) glow.geo.attributes.position.needsUpdate = true;
  });
  return handle;
}

// =====================================================================================================================
// 3) 7-7: Brodelkrater (Vulkan-Lavasee mit Ebbe und Flut)
// =====================================================================================================================

export const KRATER = {
  basalt: 0x4a3c40, basaltHi: 0x7a6a6c, ash: 0xc8b8b0, soot: 0x2a2024, pumice: 0xb8a8a0, pumiceDark: 0x8a7a76,
  glow: 0xff7a2a, glowHi: 0xffc04a, gold: 0xffc23a, warnA: 0xffd23a, warnB: 0x2a2226,
};

/**
 * 7-7 Kulisse (verschmolzen): o = { Y, LOW, HIGH,
 *   flut: [[x0, x1, zA, zB], …] (Inseln im Lavasee: Pegelband – Rußstreifen bis zur Flutmarke, Glutsaum an der Ebbe-Linie),
 *   ebbe: [[x, z, top, w], …] (Bimsstein-Trittsteine: Poren, heller Rand), hoch: [[x, z, top, w], …] (Hochsteine),
 *   grube: { x0, x1, z0, z1, hole: [x0, x1], floor } (Stempel-Grube unter dem Gitter: Warnstreifen ums Loch, Glutrisse),
 *   saeulen: [[x, z, y, h], …] (Basaltsäulen-Zaun), huette: [x, y, z] (Forscherhütte am Ziel) }
 */
export function krater77(level, o) {
  const { Y, LOW, HIGH } = o;
  const rnd = new Rnd(7707);
  const b = new Bld(), g = new Bld();
  // Pegelband an den Inseln im Lavasee: dunkler Rußstreifen von der Ebbe- bis zur Flutmarke, helle Ascheleiste darüber,
  // Glutsaum an der Ebbe-Linie
  for (const [x0, x1, zA, zB] of o.flut ?? []) {
    const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB), w = x1 - x0, d = z0 - z1, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const band = (y0, y1, col, gg = b) => {
      gg.box(w + 0.06, y1 - y0, 0.06, cx, y0, z0 + 0.03, col, { r: 0 });
      gg.box(w + 0.06, y1 - y0, 0.06, cx, y0, z1 - 0.03, col, { r: 0 });
      gg.box(0.06, y1 - y0, d + 0.06, x0 - 0.03, y0, cz, col, { r: 0 });
      gg.box(0.06, y1 - y0, d + 0.06, x1 + 0.03, y0, cz, col, { r: 0 });
    };
    band(LOW, HIGH, KRATER.soot);
    band(HIGH, HIGH + 0.08, KRATER.ash);
    band(LOW - 0.04, LOW + 0.1, KRATER.glow, g);
  }
  // Bimsstein-Trittsteine (nur bei Ebbe begehbar): Poren auf der Oberseite, hellgrauer Rand
  for (const [x, z, top, w = 2.4] of o.ebbe ?? []) {
    for (let i = 0; i < 7; i++) {
      const px = x + rnd.real(-w / 2 + 0.3, w / 2 - 0.3), pz = z + rnd.real(-w / 2 + 0.3, w / 2 - 0.3);
      b.cyl(rnd.real(0.06, 0.14), rnd.real(0.06, 0.14), 0.02, px, top + 0.005, pz, KRATER.pumiceDark, 6);
    }
    b.box(w + 0.1, 0.1, 0.1, x, top - 0.1, z + w / 2 + 0.02, litTop(KRATER.pumice, 0.7), { r: 0 });
    g.box(w + 0.14, 0.06, 0.08, x, LOW + 0.02, z + w / 2 + 0.06, KRATER.glow, { r: 0 });
  }
  // Hochsteine (immer über der Flut): Glutrand oben
  for (const [x, z, top, w = 2.6] of o.hoch ?? []) {
    g.box(w + 0.04, 0.05, 0.08, x, top - 0.06, z + w / 2 + 0.02, KRATER.glowHi, { r: 0 });
    for (let i = 0; i < 3; i++) g.box(rnd.real(0.4, 0.9), 0.02, 0.05, x + rnd.real(-0.7, 0.7), top + 0.005, z + rnd.real(-0.8, 0.8), KRATER.glow, { yaw: rnd.real(0, 3), r: 0 });
  }
  // Stempel-Grube: Warnstreifen ums Loch (gelb/dunkel), Glutrisse auf dem Grubenboden
  if (o.grube) {
    const G = o.grube, [h0, h1] = G.hole;
    for (let z = G.z1 + 0.25, i = 0; z < G.z0 - 0.2; z += 0.6, i++) {
      b.box(0.24, 0.05, 0.5, h0 - 0.12, Y + 0.005, z, i % 2 ? KRATER.warnA : KRATER.warnB, { r: 0 });
    }
    for (let x = h0 + 0.25, i = 0; x < h1 - 0.1; x += 0.6, i++) {
      b.box(0.5, 0.05, 0.24, x, Y + 0.005, G.z0 + 0.12, i % 2 ? KRATER.warnA : KRATER.warnB, { r: 0 });
      b.box(0.5, 0.05, 0.24, x, Y + 0.005, G.z1 - 0.12, i % 2 ? KRATER.warnB : KRATER.warnA, { r: 0 });
    }
    for (let i = 0; i < 9; i++) {
      const x = rnd.real(G.x0 + 0.5, G.x1 - 0.5), z = rnd.real(G.z1 + 0.5, G.z0 - 0.5);
      g.box(rnd.real(0.6, 1.4), 0.02, 0.06, x, G.floor + 0.005, z, KRATER.glow, { yaw: rnd.real(0, 3), r: 0 });
    }
  }
  // Basaltsäulen-Zaun (Optik; Kollision legt der Level an)
  for (const [x, z, y, h] of o.saeulen ?? []) {
    b.cyl(0.42, 0.46, h, x, y, z, gradY(0x3a2e32, 0x6a5a5e, y, y + h), 6);
    b.cyl(0.44, 0.42, 0.12, x, y + h, z, litTop(KRATER.basaltHi, 0.6), 6);
    if (rnd.frac() < 0.4) g.box(0.05, h * 0.6, 0.05, x + 0.4, y + 0.2, z + 0.1, KRATER.glow, { r: 0 });
  }
  // Forscherhütte am Ziel: Holzhütte mit Spitzdach, Thermometer, Fähnchen
  if (o.huette) {
    const [x, y, z] = o.huette;
    b.box(2.4, 1.8, 2.0, x, y, z, litTop(0x9a6a40, 0.7), { r: 0.04 });
    b.box(0.7, 1.2, 0.06, x, y, z + 1.0, 0x4a2c18, { r: 0 });
    for (const s of [-1, 1]) b.box(1.6, 0.12, 2.4, x + s * 0.62, y + 1.95, z, 0xd8323a, { r: 0, rz: s * 0.62 });
    g.box(0.5, 0.4, 0.06, x + 0.75, y + 0.9, z + 1.02, 0xffd27a, { r: 0 });
    b.cyl(0.05, 0.05, 2.6, x - 1.4, y, z + 0.8, 0x6a5a5e, 5);
    b.box(0.8, 0.5, 0.04, x - 1.0, y + 2.0, z + 0.8, 0x3d8bff, { r: 0 });
    b.box(0.36, 1.6, 0.1, x + 1.6, y, z + 1.1, litTop(0xe8e0d8, 0.7), { r: 0.04 });
    g.box(0.1, 1.2, 0.04, x + 1.6, y + 0.2, z + 1.17, 0xff3a1a, { r: 0 });
    g.sphere(0.12, x + 1.6, y + 0.22, z + 1.18, 0xff3a1a, { ws: 8, hs: 6 });
  }
  b.flush(level, { castShadow: false });
  g.flush(level, { material: 'glow', castShadow: false });
}

/**
 * Basalt-Pflaster: Sechseck-Platten in Violettgrau auf Inseloberseiten, darunter eine dunkelrot glimmende Lage (die Fugen und
 * der Rand glühen). rects [[x0, x1, zA, zB, y], …]; o: { R 0.62, avoid [[x, z, r], …], pal, hot (Anteil heißer Platten) }.
 */
export function basaltPflaster(b, g, rects, rnd, o = {}) {
  const R = o.R ?? 0.62, pal = o.pal ?? [0x5e4c5a, 0x685462, 0x52424e, 0x726070, 0x5a4652, 0x7a6874];
  const dx = Math.sqrt(3) * R, dz = 1.5 * R, col = new THREE.Color();
  const avoid = o.avoid ?? [];
  for (const [x0, x1, zA, zB, y] of rects) {
    const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
    g.box(x1 - x0 - 0.04, 0.012, z0 - z1 - 0.04, (x0 + x1) / 2, y + 0.004, (z0 + z1) / 2, o.seam ?? 0x8a2a0c, { r: 0 });
    for (let z = z1 + R, j = 0; z < z0 - R * 0.85; z += dz, j++) {
      for (let x = x0 + R * 0.95 + (j % 2 ? dx / 2 : 0); x < x1 - R * 0.9; x += dx) {
        if (avoid.some((a) => Math.hypot(a[0] - x, a[1] - z) < (a[2] ?? 1))) continue;
        const hot = rnd.frac() < (o.hot ?? 0.04);
        col.set(hot ? 0x8a3a26 : pal[rnd.int(0, pal.length - 1)]).multiplyScalar(0.92 + rnd.frac() * 0.16);
        b.cyl(R * 0.9, R * 0.93, 0.07 + rnd.frac() * 0.03, x, y, z, col.clone(), 6, { yaw: Math.PI / 6 });
      }
    }
  }
}

/** Glutlilien (kleine leuchtende Feuerblumen) in Büscheln: list [[x, y, z, n], …]. */
export function glutlilien(b, g, list, rnd) {
  const cols = [0xff7a1a, 0xffc23a, 0xff4a2a, 0xffe07a];
  for (const [x, y, z, n = 4] of list) {
    for (let i = 0; i < n; i++) {
      const px = x + rnd.real(-0.6, 0.6), pz = z + rnd.real(-0.6, 0.6), h = rnd.real(0.25, 0.55);
      b.cyl(0.025, 0.03, h, px, y, pz, 0x3a5a2a, 4);
      b.cone(0.09, 0.12, px - 0.06, y + h * 0.4, pz, 0x4a7a32, 4, { rz: 0.9 });
      g.cone(0.13, 0.22, px, y + h, pz, cols[rnd.int(0, cols.length - 1)], 5, { rx: Math.PI });
      g.sphere(0.05, px, y + h + 0.02, pz, 0xfff0a0, { ws: 6, hs: 4 });
    }
  }
}

/** Schwefel-Krusten (gelbe Flecken) und kleine Dampfschlote: list [[x, y, z, r], …]. */
export function schwefel(b, g, list, rnd) {
  for (const [x, y, z, r = 0.9] of list) {
    for (let i = 0; i < 4; i++) b.cyl(r * rnd.real(0.3, 0.6), r * rnd.real(0.35, 0.65), 0.03, x + rnd.real(-r, r) * 0.6, y + 0.07, z + rnd.real(-r, r) * 0.6, i % 2 ? 0xe8d84a : 0xd8c03a, 8);
    b.cone(0.3, 0.35, x, y + 0.07, z, litTop(0x8a7a5a, 0.6), 7);
    g.cyl(0.1, 0.1, 0.02, x, y + 0.42, z, 0xffd27a, 6);
  }
}

/** Dracheneier im Nest (lustige Kulisse in der Drachenbucht): list [[x, y, z, yaw], …]. */
export function drachenNest(b, g, list, rnd) {
  for (const [x, y, z] of list) {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      b.cyl(0.08, 0.08, 1.0, x + Math.cos(a) * 0.75, y + 0.18, z + Math.sin(a) * 0.75, 0x6a4a2a, 4, { rx: Math.PI / 2, yaw: -a });
    }
    b.cyl(0.85, 0.7, 0.22, x, y, z, litTop(0x5a3a22, 0.7), 10);
    const eggs = [[0, 0, 0xff8a3a], [0.42, 0.18, 0xffc23a], [-0.34, 0.26, 0xff5a4a]];
    for (const [ex, ez, c] of eggs) {
      b.sphere(0.32, x + ex, y + 0.52, z + ez, litTop(c, 0.7), { s: [1, 1.3, 1], ws: 12, hs: 9 });
      for (let k = 0; k < 4; k++) g.sphere(0.06, x + ex + rnd.real(-0.22, 0.22), y + 0.4 + rnd.real(0, 0.5), z + ez + 0.26, 0xfff0a0, { s: [1, 1, 0.3], ws: 6, hs: 4 });
    }
  }
}

/** Forscherzelt mit Lagerfeuer (Start 7-7): [x, y, z, yaw]. */
export function forscherZelt(b, g, x, y, z, yaw = 0) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const P = (u, v) => [x + c * u + s * v, z - s * u + c * v];
  for (const k of [-1, 1]) {
    const [px, pz] = P(0, k * 0.55);
    b.box(2.2, 0.08, 1.35, px, y + 0.55, pz, k > 0 ? 0xd8323a : 0xf0e8e0, { yaw, rx: k * 0.95, r: 0 });
  }
  const [fx, fz] = P(0, 1.9);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; b.box(0.5, 0.08, 0.1, fx + Math.cos(a) * 0.18, y + 0.04, fz + Math.sin(a) * 0.18, 0x6a4a2a, { yaw: -a, r: 0 }); }
  for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU; b.sphere(0.12, fx + Math.cos(a) * 0.42, y + 0.06, fz + Math.sin(a) * 0.42, 0x5a5052, { ws: 6, hs: 4 }); }
  g.cone(0.22, 0.5, fx, y + 0.1, fz, 0xff8a2a, 6);
  g.cone(0.12, 0.34, fx + 0.08, y + 0.12, fz - 0.05, 0xffd27a, 5);
}

/**
 * Große blaue Quadratplattform: blauer Deckel (Kacheln, weißer Rand, gelbe Pfeile, Nieten, cyan leuchtende Kanten) auf einer
 * fahrenden Plattform (mover-Id) – nur Darstellung, fährt mit. o: { size: [w, h, d] }.
 */
export function blauePlatte(level, id, o = {}) {
  if (!level.view) return;
  const m = level.named.get(id);
  if (!m) return;
  const [w, h, d] = o.size ?? [6, 0.5, 6];
  const bl = new Bld();
  const col = new THREE.Color();
  const n = 4, cw = (w - 0.5) / n, cd = (d - 0.5) / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    col.set((i + j) % 2 ? 0x2a6ae8 : 0x3a8aff).multiplyScalar(0.95 + ((i * 7 + j * 3) % 5) * 0.02);
    bl.box(cw - 0.06, 0.05, cd - 0.06, -w / 2 + 0.25 + (i + 0.5) * cw, h + 0.005, -d / 2 + 0.25 + (j + 0.5) * cd, col.clone(), { r: 0 });
  }
  for (const s of [-1, 1]) {
    bl.box(w, 0.07, 0.22, 0, h, s * (d / 2 - 0.11), 0xf0f4ff, { r: 0 });
    bl.box(0.22, 0.07, d, s * (w / 2 - 0.11), h, 0, 0xf0f4ff, { r: 0 });
    bl.box(w + 0.04, h * 0.9, 0.04, 0, 0.02, s * (d / 2 + 0.01), 0x1a4ac8, { r: 0 });
    bl.box(0.04, h * 0.9, d + 0.04, s * (w / 2 + 0.01), 0.02, 0, 0x1a4ac8, { r: 0 });
  }
  // gelbe Pfeile in Fahrtrichtung (x) und Nieten
  for (const ax of [-1.3, 0, 1.3]) {
    bl.box(0.7, 0.03, 0.22, ax - 0.05, h + 0.06, 0, 0xffd23a, { r: 0 });
    for (const k of [-1, 1]) bl.box(0.42, 0.035, 0.16, ax + 0.2, h + 0.06, k * 0.16, 0xffd23a, { yaw: k * 0.7, r: 0 });
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) bl.sphere(0.1, sx * (w / 2 - 0.4), h + 0.07, sz * (d / 2 - 0.4), 0xd8e0f0, { ws: 6, hs: 4 });
  const mesh = new THREE.Mesh(bl.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.1 }));
  mesh.castShadow = false; mesh.receiveShadow = true;
  const glow = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, 0.06, d + 0.12), new THREE.MeshBasicMaterial({ color: 0x6ae0ff, toneMapped: false }));
  glow.position.y = 0.02;
  mesh.add(glow);
  addObject(level, mesh, () => { mesh.position.set(m.pm.pos.x, m.pm.pos.y, m.pm.pos.z); });
}

/** Bimsstein-Ente (schwimmt auf Lava): Geometrie mit Vertexfarben, Ursprung = Schwimmlinie. */
function enteGeo() {
  const bl = new Bld();
  bl.sphere(0.34, 0, 0.12, 0, litTop(KRATER.pumice, 0.75), { s: [1.25, 0.8, 1], ws: 12, hs: 8 });
  bl.sphere(0.2, 0.3, 0.42, 0, litTop(KRATER.pumice, 0.75), { ws: 10, hs: 8 });
  bl.cone(0.08, 0.2, 0.52, 0.38, 0, 0xffa020, 6, { rz: -Math.PI / 2 });
  bl.sphere(0.04, 0.42, 0.5, 0.09, 0x1a1418, { ws: 6, hs: 4 });
  bl.sphere(0.04, 0.42, 0.5, -0.09, 0x1a1418, { ws: 6, hs: 4 });
  bl.cone(0.12, 0.22, -0.4, 0.2, 0, litTop(KRATER.pumiceDark, 0.7), 5, { rz: Math.PI / 2 + 0.5 });
  return bl.geometry();
}

/**
 * Bimsstein-Enten, die auf dem Lavasee schaukeln und mit Ebbe und Flut auf- und absteigen (zeigen den Pegel; nur Optik).
 * list [[x, z, yaw], …]; lake = Id des lavaspiegel. Eine Instanz-Gruppe, ohne Sonnenschatten.
 */
export function bimsEnten(level, list, lake) {
  if (!level.view) return;
  const h = level.named.get(lake);
  const mesh = new THREE.InstancedMesh(enteGeo(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }), list.length);
  mesh.castShadow = false; mesh.frustumCulled = false;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  const holder = {};
  let t = 0;
  addObject(level, mesh, (dt) => {
    t += visDt(level, holder, dt);
    const top = h?.top ?? 0;
    list.forEach(([x, z, yaw = 0], i) => {
      const bob = Math.sin(t * 1.7 + i * 2.1) * 0.05;
      p.set(x + Math.sin(t * 0.3 + i) * 0.4, top + bob, z + Math.cos(t * 0.25 + i * 1.3) * 0.4);
      e.set(Math.sin(t * 1.3 + i) * 0.1, yaw + Math.sin(t * 0.2 + i) * 0.6, Math.cos(t * 1.1 + i) * 0.08);
      mesh.setMatrixAt(i, m4.compose(p, q.setFromEuler(e), s));
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
}

/**
 * Pegelmesser im Lavasee: rot-weiß gestreifte Messlatte mit Flut- und Ebbe-Marke, an der ein Bimsstein-Schwimmring mit der
 * Lava auf- und absteigt; oben ein Wimpel (Latte verschmolzen, Schwimmring bewegt). o: { LOW, HIGH }.
 */
export function pegel(level, x, z, lake, o) {
  const { LOW, HIGH } = o;
  const b = new Bld(), g = new Bld();
  const y0 = LOW - 0.6, y1 = HIGH + 2.4;
  for (let y = y0, i = 0; y < y1 - 0.01; y += 0.4, i++) b.box(0.22, 0.4, 0.22, x, y, z, i % 2 ? 0xe8e0d8 : 0xd8323a, { r: 0 });
  g.box(0.5, 0.06, 0.06, x, HIGH, z + 0.13, 0xff3a1a, { r: 0 });
  g.box(0.5, 0.06, 0.06, x, LOW + 0.3, z + 0.13, 0x4ad8ff, { r: 0 });
  b.cone(0.18, 0.4, x, y1, z, 0xffc23a, 6);
  b.box(0.7, 0.4, 0.03, x + 0.35, y1 - 0.5, z, 0x3d8bff, { r: 0 });
  b.flush(level, { castShadow: false });
  g.flush(level, { material: 'glow', castShadow: false });
  if (!level.view) return;
  const h = level.named.get(lake);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.1, 6, 14), new THREE.MeshStandardMaterial({ color: KRATER.pumice, roughness: 0.9 }));
  ring.rotation.x = Math.PI / 2;
  ring.castShadow = false;
  addObject(level, ring, () => { ring.position.set(x, (h?.top ?? LOW) + 0.06, z); });
}
