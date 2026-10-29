// Hilfen für 8-Burg „Gipfelsturm am Brummbär-Turm“ (Welt 8, Finale; kein Level: exportiert kein LEVEL, die Level-Registry
// überspringt dieses Modul). Nur für 8-Burg – andere Welt-8-Level haben eigene Hilfsdateien. Alles Level-Lokale hängt sich über
// die offiziellen Aufbau-Haken an (LEVEL.prebuild / LEVEL.build / LEVEL.setup, Präzisierung „Leistung und Level-Haken 2“) und
// über level.onStep / level.onSignal.
//
//   1) Daten-Helfer   dach (Dach-/Platzplatte als island mit Felsdeckel), line/ring/arc/column (Münzen), sign
//   2) Kulisse        haus (Rummelhaus vom Rummelboden bis zum Dach: Fensterreihen, Gesimse, Markise, Glühbirnen), vulkan,
//                     trommel/kletterfront/tuermchen/schaft (der große Turm), kelchturm (Siegerturm), schilder (ein Schild-Atlas,
//                     1 Zeichenaufruf), birnenKette (Glühbirnen als Leuchtpunkte), glockenbaum (kletterbarer Baum mit Glocken)
//   3) Ablauf         parkKulisse (Thema baronpark ohne zweiten Turm im Hintergrund), freundeFest (befreite Freunde am Ziel),
//                     feuerwerk, glockenKlang
// Statische Teile gehen über addStatic in die Abschnitts-Meshes (keine zusätzlichen Zeichenaufrufe); Leuchtendes ins
// Glüh-Material bzw. ins gemeinsame Leuchtfeld (1 Zeichenaufruf für alle weichen Lichter).

import * as THREE from 'three';
import { addObject, addStatic, Rnd } from '../../blocks/kit.js';
import { visDt } from '../../entities/gimmick.js';
import { Bld, glowField, glowPoints, onRespawn } from '../w5/_helpers_b.js';
import { friendFigure } from '../../models/lib/w8Geos.js';
import { baronPark } from '../../view/backdrop_w8.js';

export { Bld, glowField, glowPoints, onRespawn, Rnd };

const TAU = Math.PI * 2;
/** Rummelboden der Kulisse (Thema baronpark: Pflaster 22 m unter y = 0) – die Häuser stehen darauf. */
export const FY = -22;

// =====================================================================================================================
// 1) Daten-Helfer
// =====================================================================================================================

/** Dach-/Platzplatte über x0..x1, zA..zB (Reihenfolge egal) mit Oberseite top; o { h 1.4, top 'rock', color, side, cell }. */
export function dach(x0, x1, zA, zB, top, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB), h = o.h ?? 1.4;
  const spec = { type: 'island', pos: [(x0 + x1) / 2, top - h, (z0 + z1) / 2], size: [x1 - x0, h, z0 - z1], under: 0, top: o.top ?? 'rock' };
  if ((o.top ?? 'rock') === 'rock') Object.assign(spec, { topColor: o.color ?? 0xd0684a, sideColor: o.side ?? 0x7a3a4a, cell: o.cell ?? 1 });
  if (o.id) spec.id = o.id;
  return spec;
}
/** Münzen in einer Reihe. */
export const line = (from, to, n) => ({ kind: 'coins', from, to, n });
/** Münzring um pos. */
export const ring = (pos, r, n) => ({ kind: 'coins', pos, r, n });
/** Münzbogen von a nach b mit Scheitel h über der Verbindungslinie (zeigt einen Sprung an). */
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
export const sign = (x, y, z, text, o = {}) => ({ type: 'sign', pos: [x, y, z], text, size: o.size ?? [2.6, 0.95], yaw: o.yaw ?? 0, ...(o.color ? { color: o.color } : {}) });

// =====================================================================================================================
// 2) Kulisse
// =====================================================================================================================

const C = (h) => new THREE.Color(h);
const mixHex = (a, b, k) => C(a).lerp(C(b), Math.max(0, Math.min(1, k)));
/** Farbe mit Licht von oben und Verlauf über die (lokale) Höhe −H/2..H/2: unten dunkler. */
const wallPaint = (hi, lo, H) => ({ v: (x, y, z, nx, ny) => {
  const k = Math.max(0, Math.min(1, (y + H / 2) / H));
  const c = mixHex(lo, hi, 0.35 + 0.65 * k * k);
  return c.multiplyScalar(ny > 0.5 ? 1.12 : ny < -0.5 ? 0.7 : 0.92 + 0.08 * Math.abs(nx));
} });

/** Farben der Rummelhäuser [Wand hell, Wand dunkel, Zierleisten]. */
export const HAUS = {
  rosa: [0xf6a0b8, 0x8a4a6a, 0xfff0f4],
  mint: [0x8ae0c4, 0x3a7a72, 0xf0fff8],
  himmel: [0x8ab8f6, 0x3a4a8a, 0xf0f6ff],
  zitrone: [0xf8dc72, 0x9a6a3a, 0xfffbe8],
  flieder: [0xc4a4f0, 0x5a4a8a, 0xf8f0ff],
  pfirsich: [0xf8b88a, 0x8a5a4a, 0xfff4ea],
};
const MARKISE = [[0xe8423a, 0xfff4ec], [0x3a7ae8, 0xfff4ec], [0x4ac85a, 0xfff8e8], [0xffc83a, 0xe8423a], [0x9a5ae8, 0xfff0ff], [0xff8ac8, 0xffffff]];
const BIRNEN = [0xfff0a0, 0xff8ac8, 0x9af0ff, 0xffd060];

/**
 * Rummelhaus vom Rummelboden (base) bis unter den Dachdeckel (top): Wandkörper mit Verlauf, Eckpfeiler, Gesimse je Stockwerk,
 * Fensterreihen (meist warm erleuchtet, manche dunkel), vorn eine gestreifte Markise unter der Dachkante und Glühbirnen an der
 * Dachkante (Leuchtfeld). Die Wände umhüllen die Dachplatte (dach) knapp, damit kein Erdrand zu sehen ist.
 *   o: { x0, x1, z0 (Vorderseite, größeres z), z1, top, base: FY, color: HAUS.rosa, faces: ['vorn', 'links', 'rechts'],
 *        markise: Index | false, birnen: true, seed, step (Stockwerk 3.0), door: true }
 */
export function haus(level, b, g, o) {
  const [hi, lo, trim] = o.color ?? HAUS.rosa;
  const base = o.base ?? FY, top = o.top - 0.16;
  const x0 = o.x0 - 0.04, x1 = o.x1 + 0.04, z0 = o.z0 + 0.04, z1 = o.z1 - 0.04;
  const W = x1 - x0, D = z0 - z1, H = top - base;
  const rnd = new Rnd(o.seed ?? Math.floor(Math.abs(o.x0 * 31 + o.z0 * 7)) + 3);
  b.box(W, H, D, (x0 + x1) / 2, base, (z0 + z1) / 2, wallPaint(hi, lo, H), { r: 0 });
  // Eckpfeiler
  for (const [cx, cz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) b.box(0.62, H, 0.62, cx, base, cz, wallPaint(trim, lo, H), { r: 0 });
  const faces = o.faces ?? ['vorn', 'links', 'rechts'];
  const step = o.step ?? 3.0;
  const pts = [];
  for (const f of faces) {
    // Fläche: Mittelpunkt einer Stelle (u längs, y) mit Abstand off nach außen
    const F = f === 'vorn' ? { len: W, at: (u, y, off) => [x0 + u, y, z0 + off], yaw: 0, n: [0, 1] }
      : f === 'hinten' ? { len: W, at: (u, y, off) => [x0 + u, y, z1 - off], yaw: 0, n: [0, -1] }
        : f === 'links' ? { len: D, at: (u, y, off) => [x0 - off, y, z1 + u], yaw: Math.PI / 2, n: [-1, 0] }
          : { len: D, at: (u, y, off) => [x1 + off, y, z1 + u], yaw: Math.PI / 2, n: [1, 0] };
    const cols = Math.max(1, Math.floor((F.len - 1.0) / 2.5));
    const du = F.len / cols;
    // Gesimse je Stockwerk
    const yMin = Math.max(base + 1.5, top - (o.rows ?? 4) * step - 0.5);
    for (let y = top - 1.2; y > yMin; y -= step) {
      const [cx, cy, cz] = F.at(F.len / 2, y - 1.15, 0.1);
      if (F.yaw) b.box(0.22, 0.16, F.len, cx, cy, cz, trim, { r: 0 }); else b.box(F.len, 0.16, 0.22, cx, cy, cz, trim, { r: 0 });
    }
    for (let y = top - 2.2, row = 0; y > Math.max(base + 1.2, yMin); y -= step, row++) {
      for (let i = 0; i < cols; i++) {
        const u = du * (i + 0.5);
        const [fx, fy, fz] = F.at(u, y - 0.7, 0.06);
        const lit = rnd.frac() < (row < 3 ? 0.82 : 0.6);
        if (F.yaw) {
          b.box(0.14, 1.5, 1.2, fx, fy, fz, trim, { r: 0 });
          const [px, , pz] = F.at(u, y, 0.13);
          (lit ? g : b).box(0.05, 1.18, 0.9, px, fy + 0.16, pz, lit ? (rnd.frac() < 0.2 ? 0xffb8d0 : 0xffd77a) : 0x2a2448, { r: 0 });
        } else {
          b.box(1.2, 1.5, 0.14, fx, fy, fz, trim, { r: 0 });
          const [px, , pz] = F.at(u, y, 0.13);
          (lit ? g : b).box(0.9, 1.18, 0.05, px, fy + 0.16, pz, lit ? (rnd.frac() < 0.2 ? 0xffb8d0 : 0xffd77a) : 0x2a2448, { r: 0 });
        }
      }
    }
  }
  // Markise vorn unter der Dachkante (gestreift, schräg nach außen) und Glühbirnen
  if (o.markise !== false && faces.includes('vorn')) {
    const [ca, cb] = MARKISE[(o.markise ?? Math.floor(rnd.frac() * MARKISE.length)) % MARKISE.length];
    const n = Math.max(4, Math.round(W / 0.75));
    for (let i = 0; i < n; i++) {
      const w = W / n, x = x0 + w * (i + 0.5);
      b.box(w, 0.08, 1.1, x, top - 1.05, z0 + 0.5, i % 2 ? ca : cb, { r: 0, rx: 0.42 });
      b.sphere(w * 0.5, x, top - 1.3, z0 + 1.02, i % 2 ? ca : cb, { s: [1, 0.45, 0.25], ws: 6, hs: 3 });
    }
  }
  if (o.birnen !== false) {
    const list = [];
    const edge = (ax, az, bx, bz) => {
      const L = Math.hypot(bx - ax, bz - az), n = Math.max(2, Math.round(L / 1.0));
      for (let i = 0; i <= n; i++) {
        const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
        const col = BIRNEN[(i + Math.round(ax)) % BIRNEN.length];
        g.sphere(0.12, x, top - 0.28, z, col, { ws: 4, hs: 3 });
        if (i % 2 === 0) list.push([x, top - 0.28, z, 1]);
      }
    };
    if (faces.includes('vorn')) edge(x0, z0 + 0.06, x1, z0 + 0.06);
    if (faces.includes('links')) edge(x0 - 0.06, z1, x0 - 0.06, z0);
    if (faces.includes('rechts')) edge(x1 + 0.06, z1, x1 + 0.06, z0);
    glowPoints(level, list, { color: 0xffd890, size: 1.1, opacity: 0.55, pulse: 0.6 });
  }
  // Tür mit Vordach unten (nur Andeutung, weit unten im Dunst)
  if (o.door !== false && faces.includes('vorn')) {
    const cx = (x0 + x1) / 2;
    b.box(2.2, 3.0, 0.2, cx, base, z0 + 0.1, 0x5a3a2a, { r: 0.05 });
    g.box(1.6, 2.4, 0.06, cx, base + 0.1, z0 + 0.22, 0xffc070, { r: 0 });
  }
}

/**
 * Rummelboden tief unter den Dächern (nur Optik, sparsam): gestreifte Zelte mit Wimpel-Spitze, Lichterkranz (Leuchtfeld).
 * list: [[x, z, r, farbe 0..5], …] auf y = FY.
 */
export function bodenRummel(level, b, g, list) {
  const pts = [];
  for (const [x, z, r, k] of list) {
    const [ca, cb] = MARKISE[k % MARKISE.length];
    const n = 12;
    for (let i = 0; i < n; i++) {
      const cone = new THREE.ConeGeometry(r, r * 1.1, n, 1, true, (i / n) * TAU, TAU / n);
      cone.translate(x, FY + 3.2 + r * 0.55, z);
      b.add(cone, i % 2 ? ca : cb);
    }
    b.cyl(r * 0.96, r * 0.96, 3.2, x, FY, z, 0xe8d8f0, n, { open: true });
    b.cyl(0.08, 0.08, 1.6, x, FY + 3.2 + r * 1.1, z, TURM.gold, 5);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; pts.push([x + Math.cos(a) * r, FY + 3.3, z + Math.sin(a) * r, 1.4]); }
  }
  glowPoints(level, pts, { color: 0xffd890, size: 1.6, opacity: 0.6, pulse: 0.5 });
}

/**
 * Seilbahn-Portal (Station) über dem Weg: zwei gestreifte Pfosten neben dem Weg (x ± w/2) und ein Querbalken mit Seilrolle
 * auf Seilhöhe (y + 2.4), Wimpel und Glühbirnen. x, y (Boden), z, w (lichte Weite).
 */
export function seilPortal(b, g, x, y, z, w = 2.6) {
  const H = 3.4;
  for (const s of [-1, 1]) {
    const px = x + s * (w / 2 + 0.3);
    for (let k = 0; k < 6; k++) b.cyl(0.16, 0.16, H / 6, px, y + (k * H) / 6, z, k % 2 ? 0xfff4ec : 0xe8423a, 8);
    b.sphere(0.22, px, y + H + 0.1, z, TURM.gold, { ws: 8, hs: 6 });
    g.sphere(0.12, px, y + H + 0.42, z, 0xfff0a0, { ws: 6, hs: 4 });
  }
  b.box(w + 1.0, 0.24, 0.3, x, y + H - 0.55, z, 0x8a4a2a, { r: 0.04 });
  b.cyl(0.32, 0.32, 0.16, x, y + H - 0.28, z, 0x3a3a48, 12, { rx: Math.PI / 2 });
}

/** Kamin (Ziegel mit Rand und Rauchloch). */
export function kamin(b, x, y, z, h = 1.6, w = 0.9, col = 0xa85a4a) {
  b.box(w, h, w, x, y, z, { v: (px, py, pz, nx, ny) => C(col).multiplyScalar(ny > 0.5 ? 1.1 : 0.85 + 0.15 * Math.abs(nx)) }, { r: 0.04 });
  b.box(w + 0.24, 0.22, w + 0.24, x, y + h, z, 0x6a3a3a, { r: 0.04 });
  b.box(w - 0.3, 0.05, w - 0.3, x, y + h + 0.2, z, 0x1a1418, { r: 0 });
}

/**
 * Dachkram (fest, mit Kollision): Dachluke (warm erleuchtet), Lüftungsrohr mit Blechhut, Wassertank auf Stelzen, Kistenstapel,
 * Geschenkpaket, Antenne (ohne Kollision). list: [{ k: 'luke'|'rohr'|'tank'|'kisten'|'geschenk'|'antenne', x, y (Oberseite), z, yaw, col }, …]
 */
export function dachKram(level, b, g, list) {
  const W = level.world;
  for (const it of list) {
    const { k, x, y, z } = it, yaw = it.yaw ?? 0;
    if (k === 'luke') {
      const w = it.w ?? 1.3, d = it.d ?? 1.0;
      b.box(w, 0.34, d, x, y, z, 0xfff0f4, { r: 0.04, yaw });
      g.box(w - 0.3, 0.06, d - 0.3, x, y + 0.32, z, 0xffd77a, { r: 0, yaw });
      b.box(0.06, 0.05, d - 0.3, x, y + 0.36, z, 0x6a4a5a, { r: 0, yaw });
      W?.add({ type: 'box', min: [x - w / 2, y, z - d / 2], max: [x + w / 2, y + 0.38, z + d / 2], tag: 'dachkram' });
    } else if (k === 'rohr') {
      b.cyl(0.2, 0.22, 1.0, x, y, z, 0xb8bccc, 8);
      b.cyl(0.235, 0.235, 0.16, x, y + 0.5, z, it.col ?? 0xe8423a, 8);
      for (const [dx, dz] of [[0.14, 0], [-0.14, 0], [0, 0.14], [0, -0.14]]) b.box(0.04, 0.22, 0.04, x + dx, y + 1.0, z + dz, 0x8a8ea0, { r: 0 });
      b.cyl(0.3, 0.34, 0.07, x, y + 1.2, z, 0x9aa0b4, 8);
      W?.add({ type: 'cyl', x, z, r: 0.3, y0: y, y1: y + 1.2, tag: 'dachkram' });
    } else if (k === 'tank') {
      const r = it.r ?? 0.8, col = it.col ?? 0x5ab8d8;
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(0.12, 1.3, 0.12, x + dx * r * 0.6, y, z + dz * r * 0.6, 0x5a4a5a, { r: 0 });
      b.cyl(r, r, 1.5, x, y + 1.3, z, col, 12);
      b.cyl(r + 0.03, r + 0.03, 0.26, x, y + 1.9, z, 0xfff4ec, 12);
      b.cone(r + 0.12, 0.7, x, y + 2.8, z, 0xe8423a, 12);
      g.sphere(0.12, x, y + 3.55, z, 0xfff0a0, { ws: 6, hs: 4 });
      W?.add({ type: 'cyl', x, z, r: r + 0.05, y0: y, y1: y + 3.4, tag: 'dachkram' });
    } else if (k === 'kisten') {
      const s = it.s ?? 0.8;
      const kiste = (cx, cy, cz, rot) => {
        b.box(s, s, s, cx, cy, cz, 0xc8884a, { r: 0.03, yaw: rot });
        b.box(s + 0.04, 0.1, s + 0.04, cx, cy + s * 0.45, cz, 0x7a4a2a, { r: 0, yaw: rot });
      };
      kiste(x, y, z, yaw); kiste(x + Math.cos(yaw) * (s + 0.05), y, z - Math.sin(yaw) * (s + 0.05), yaw + 0.2); kiste(x + Math.cos(yaw) * s * 0.5, y + s, z - Math.sin(yaw) * s * 0.5, yaw - 0.15);
      const ex = Math.abs(Math.cos(yaw)) * (s + 0.05) + s, ez = Math.abs(Math.sin(yaw)) * (s + 0.05) + s;
      const cx = x + Math.cos(yaw) * (s + 0.05) / 2, cz = z - Math.sin(yaw) * (s + 0.05) / 2;
      W?.add({ type: 'box', min: [cx - ex / 2, y, cz - ez / 2], max: [cx + ex / 2, y + s, cz + ez / 2], tag: 'dachkram' });
      W?.add({ type: 'box', min: [x + Math.cos(yaw) * s * 0.5 - s / 2, y + s, z - Math.sin(yaw) * s * 0.5 - s / 2], max: [x + Math.cos(yaw) * s * 0.5 + s / 2, y + 2 * s, z - Math.sin(yaw) * s * 0.5 + s / 2], tag: 'dachkram' });
    } else if (k === 'geschenk') {
      const s = it.s ?? 0.7, col = it.col ?? 0xe8423a, band = it.band ?? 0xffd84a;
      b.box(s, s * 0.8, s, x, y, z, col, { r: 0.03, yaw });
      b.box(s + 0.02, s * 0.8 + 0.02, 0.12, x, y, z, band, { r: 0, yaw });
      b.box(0.12, s * 0.8 + 0.02, s + 0.02, x, y, z, band, { r: 0, yaw });
      for (const sx of [-1, 1]) b.sphere(0.13, x + Math.cos(yaw) * sx * 0.12, y + s * 0.8 + 0.08, z - Math.sin(yaw) * sx * 0.12, band, { s: [1.3, 0.8, 0.7], ws: 6, hs: 4, yaw });
      W?.add({ type: 'box', min: [x - s * 0.55, y, z - s * 0.55], max: [x + s * 0.55, y + s * 0.8, z + s * 0.55], tag: 'dachkram' });
    } else if (k === 'antenne') {
      b.cyl(0.05, 0.06, 2.6, x, y, z, 0x8a8aa0, 5);
      for (const [h, w] of [[1.6, 1.2], [2.0, 0.9], [2.35, 0.6]]) b.box(w, 0.05, 0.05, x, y + h, z, 0x8a8aa0, { r: 0, yaw });
      g.sphere(0.1, x, y + 2.68, z, 0xff4a4a, { ws: 6, hs: 4 });
    }
  }
}

/** Manege-Muster auf einer runden Fläche: n Keile im Wechsel zweier Farben zwischen r0 und r1, Goldringe an beiden Rändern. */
export function manege(b, x, y, z, r0, r1, n = 16, cols = [0xe0566a, 0xfff0dc]) {
  for (let i = 0; i < n; i++) {
    const ring = new THREE.RingGeometry(r0, r1, 3, 1, (i / n) * TAU, TAU / n);
    b.add(ring, cols[i % cols.length], { p: [x, y, z], r: [-Math.PI / 2, 0, 0] });
  }
  b.torus(r0, 0.1, x, y, z, TURM.gold, { rx: Math.PI / 2, rs: 3, ts: 28 });
  b.torus(r1, 0.12, x, y, z, TURM.gold, { rx: Math.PI / 2, rs: 3, ts: 48 });
}

/** Roter Läufer (flach auf dem Boden, Goldsaum, gelbe Sternchen) von z0 nach z1 bei x, Breite w, Bodenhöhe y. */
export function teppich(b, x, y, z0, z1, w = 2.4) {
  const L = Math.abs(z1 - z0), cz = (z0 + z1) / 2;
  b.box(w, 0.03, L, x, y + 0.005, cz, 0xc8344a, { r: 0 });
  for (const sx of [-1, 1]) b.box(0.16, 0.035, L, x + sx * (w / 2 - 0.1), y + 0.006, cz, TURM.gold, { r: 0 });
  const n = Math.max(1, Math.floor(L / 3.2));
  for (let i = 0; i < n; i++) stern(b, x, y + 0.04, Math.max(z0, z1) - (i + 0.5) * (L / n), 0.42, 0xffd84a);
}
/** Flaches Sternchen auf dem Boden (Mitte x, y, z, Radius r). */
export function stern(b, x, y, z, r = 0.5, col = 0xffd84a) {
  const s = new THREE.Shape();
  for (let i = 0; i <= 10; i++) { const a = Math.PI / 2 + (i / 10) * TAU, rr = i % 2 ? r * 0.45 : r; i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  b.add(new THREE.ShapeGeometry(s), col, { p: [x, y, z], r: [-Math.PI / 2, 0, 0] });
}

/** Lange Turmfahne (Banner) an einer Wand: Stange oben, Tuch mit Goldsaum und Spitze unten; Mitte oben x, y, z, Ausrichtung yaw. */
export function banner(b, g, x, y, z, yaw, w = 2.0, h = 7, col = TURM.red) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, -h); s.lineTo(0, -h - w * 0.45); s.lineTo(-w / 2, -h); s.lineTo(-w / 2, 0);
  b.add(new THREE.ShapeGeometry(s), { v: (px, py) => mixHex(col, 0x3a1a3a, Math.min(0.5, -py / (h * 2.4))) }, { p: [x, y, z], r: [0, yaw, 0] });
  const s2 = new THREE.Shape();
  s2.moveTo(-w * 0.22, -h * 0.22); s2.lineTo(0, -h * 0.22 + w * 0.3); s2.lineTo(w * 0.22, -h * 0.22); s2.lineTo(0, -h * 0.22 - w * 0.3); s2.lineTo(-w * 0.22, -h * 0.22);
  b.add(new THREE.ShapeGeometry(s2), TURM.gold, { p: [x + Math.sin(yaw) * 0.03, y, z + Math.cos(yaw) * 0.03], r: [0, yaw, 0] });
  b.cyl(0.08, 0.08, w + 0.5, x, y - 0.04, z, TURM.gold, 6, { rz: Math.PI / 2, yaw });
  for (const sx of [-1, 1]) g.sphere(0.14, x + Math.cos(yaw) * sx * (w / 2 + 0.3), y, z - Math.sin(yaw) * sx * (w / 2 + 0.3), 0xfff0a0, { ws: 5, hs: 4 });
}

/** Vulkan in der Kulisse: Kegelstumpf (dunkel, oben rotbraun), glühender Krater, Lavaströme. */
export function vulkan(level, b, g, x, z, base, h, r) {
  b.cyl(r * 0.16, r, h, x, base, z, { v: (px, py, pz, nx, ny) => mixHex(0x1a1220, 0x6a3030, Math.max(0, (py + h / 2) / h) ** 1.6).multiplyScalar(0.8 + 0.25 * Math.max(0, ny + nx * 0.3)) }, 28);
  const ty = base + h;
  g.cyl(r * 0.13, r * 0.13, 0.4, x, ty - 0.3, z, 0xff8a2a, 20);
  b.torus(r * 0.15, r * 0.025, x, ty, z, 0x2a1418, { rx: Math.PI / 2, rs: 6, ts: 24 });
  const rnd = new Rnd(911);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU + rnd.real(-0.3, 0.3), pts = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8, rr = r * (0.16 + 0.6 * t) + 0.3, y = ty - h * 0.6 * t + 0.4;
      pts.push(new THREE.Vector3(x + Math.cos(a + Math.sin(t * 5 + k) * 0.08) * rr, y, z + Math.sin(a + Math.sin(t * 5 + k) * 0.08) * rr));
    }
    const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.7 - k * 0.05, 5, false);
    g.add(tube, { v: (px, py) => mixHex(0xff3a1a, 0xffc040, Math.max(0, Math.min(1, (py - (ty - h * 0.6)) / (h * 0.6)))) });
  }
  glowPoints(level, [[x, ty + 2, z, 9], [x, ty + 8, z, 6]], { color: 0xff7a2a, size: 4, opacity: 0.8, pulse: 0.3 });
}

/** Ziegelfarbe des Turms (violettgrau, wie das Modell baron_turm). */
export const TURM = { brick: 0x6a5a7e, brickHi: 0x9a8ab0, brickLow: 0x3a2e4a, red: 0xd8343a, gold: 0xffc83a, win: 0xffd86a, cap: 0xc8b8dc };
const brickPaint = (H, k0 = 0.25) => ({ v: (x, y, z, nx, ny) => {
  const k = Math.max(0, Math.min(1, (y + H / 2) / H));
  const row = Math.floor((y + H / 2) / 0.9), a = Math.atan2(z, x);
  const joint = ((y + H / 2) % 0.9) / 0.9 < 0.09 || (((a / TAU) * 60 + (row % 2) * 0.5) % 1 + 1) % 1 < 0.06;
  const c = mixHex(TURM.brickLow, mixHex(TURM.brick, TURM.brickHi, 0.5 + 0.5 * Math.abs(nx)).getHex(), k0 + (1 - k0) * k);
  if (ny > 0.6) return C(TURM.cap);
  return joint ? c.multiplyScalar(0.62) : c;
} });

/**
 * Turm-Trommel: Ziegelzylinder mit roten Bändern und Goldringen, Fenstern auf einer Spirale (leuchtend), Zinnenkranz an der
 * Oberkante (nicht im Winkelbereich skip, z. B. über der Kletterfront). o: { x, z, r, y0, y1, seg 40, bands 7, zinnen true,
 * skip: [a0, a1] (Winkel, 0 = +X, π/2 = +Z) }
 */
export function trommel(level, b, g, o) {
  const { x, z, r, y0, y1 } = o, H = y1 - y0, seg = o.seg ?? 40;
  b.cyl(r, r, H, x, y0, z, brickPaint(H), seg, { open: true });
  for (let y = y0 + (o.band0 ?? 6); y < y1 - 1.5; y += o.bands ?? 7) {
    b.torus(r + 0.05, 0.28, x, y, z, TURM.red, { rx: Math.PI / 2, rs: 4, ts: seg });
    b.torus(r + 0.12, 0.08, x, y + 0.32, z, TURM.gold, { rx: Math.PI / 2, rs: 3, ts: seg });
  }
  const skip = o.skip ?? null;
  const inSkip = (a) => { if (!skip) return false; const w = (((a - skip[0]) % TAU) + TAU) % TAU; return w <= ((((skip[1] - skip[0]) % TAU) + TAU) % TAU); };
  // Fenster auf einer Spirale
  const fy0 = Math.max(y0 + 3, (o.winFrom ?? y0 + 3));
  for (let k = 0, y = fy0; y < y1 - 2.5; k++, y += o.winStep ?? 2.6) {
    const a = k * 1.05 + (o.winPhase ?? 0);
    if (inSkip(a)) continue;
    const nx = Math.cos(a), nz = Math.sin(a);
    const px = x + nx * (r + 0.05), pz = z + nz * (r + 0.05);
    b.box(1.4, 2.0, 0.24, px, y - 1, pz, TURM.gold, { r: 0, yaw: -a + Math.PI / 2 });
    g.box(1.0, 1.6, 0.1, x + nx * (r + 0.18), y - 0.8, z + nz * (r + 0.18), TURM.win, { r: 0, yaw: -a + Math.PI / 2 });
  }
  if (o.zinnen !== false) {
    const n = Math.round((TAU * r) / 2.2);
    b.cyl(r + 0.3, r + 0.1, 0.5, x, y1 - 0.5, z, TURM.brickLow, seg, { open: true });
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      if (inSkip(a)) continue;
      b.box(1.2, 1.1, 0.8, x + Math.cos(a) * (r - 0.1), y1, z + Math.sin(a) * (r - 0.1), brickPaint(1.1, 0.8), { r: 0, yaw: -a + Math.PI / 2 });
    }
  }
}

/** Oberseite einer runden Plattform (Fliesenringe) mit Goldrand: Mitte x, z, Radius r, Höhe y (Oberseite). */
export function rundDeckel(b, x, y, z, r, cols = [0xb8aac8, 0x9a8cb0]) {
  b.cyl(r, r, 0.12, x, y - 0.1, z, { v: (px, py, pz, nx, ny) => (ny > 0.5 ? (Math.floor(Math.hypot(px, pz) / 1.3) % 2 ? C(cols[0]) : C(cols[1])) : C(TURM.brickLow)) }, 36);
  b.torus(r, 0.12, x, y + 0.02, z, TURM.gold, { rx: Math.PI / 2, rs: 4, ts: 36 });
}

/** Türmchen (begehbar oben): Ziegelschaft y0..top, Fliesendeckel, Goldrand, kleine Leuchtfenster, Wimpel am hinteren Rand. */
export function tuermchen(level, b, g, x, z, r, y0, top, o = {}) {
  const H = top - 0.12 - y0;
  b.cyl(r, r + 0.3, H, x, y0, z, brickPaint(H, 0.4), 28, { open: true });
  b.torus(r + 0.02, 0.22, x, top - 0.9, z, o.band ?? TURM.red, { rx: Math.PI / 2, rs: 5, ts: 28 });
  rundDeckel(b, x, top, z, r, o.tiles);
  if (o.birnen !== false) {
    const list = [], n = Math.round(TAU * r / 0.9);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU, px = x + Math.cos(a) * (r + 0.3), pz = z + Math.sin(a) * (r + 0.3);
      g.sphere(0.12, px, top - 0.45, pz, BIRNEN[i % BIRNEN.length], { ws: 4, hs: 3 });
      if (i % 2 === 0) list.push([px, top - 0.45, pz, 1]);
    }
    glowPoints(level, list, { color: 0xffe0a0, size: 1.1, opacity: 0.5, pulse: 0.8 });
  }
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU + Math.PI / 4 + (o.phase ?? 0);
    const px = x + Math.cos(a) * (r + 0.1), pz = z + Math.sin(a) * (r + 0.1);
    for (let y = top - 3.5; y > y0 + 2; y -= 4.2) {
      b.box(0.9, 1.4, 0.2, px, y - 0.7, pz, TURM.gold, { r: 0, yaw: -a + Math.PI / 2 });
      g.box(0.62, 1.1, 0.08, x + Math.cos(a) * (r + 0.22), y - 0.55, z + Math.sin(a) * (r + 0.22), TURM.win, { r: 0, yaw: -a + Math.PI / 2 });
    }
  }
  if (o.flag !== false) {
    const fx = x + (o.flagAt?.[0] ?? r * 0.72), fz = z + (o.flagAt?.[1] ?? -r * 0.6);
    b.cyl(0.07, 0.09, 3.4, fx, top, fz, TURM.gold, 6);
    b.sphere(0.16, fx, top + 3.45, fz, TURM.gold, { ws: 8, hs: 6 });
    b.add(new THREE.ShapeGeometry(wimpel(1.6, 0.9)), o.flagColor ?? TURM.red, { p: [fx + 0.05, top + 2.4, fz], r: [0, 0, 0] });
  }
}
function wimpel(L, h) { const s = new THREE.Shape(); s.moveTo(0, h / 2); s.lineTo(L, 0.05); s.lineTo(0, -h / 2); s.lineTo(0, h / 2); return s; }

/** Kletterfront (Vorbau mit Kletterrinne): Steinquader x0..x1, Vorderseite face, Tiefe d, y0..y1; Rinne rx breit, rd tief. */
export function kletterfront(level, b, g, o) {
  const { x0, x1, face, d, y0, y1 } = o, H = y1 - y0, rx = o.rx ?? 1.2, rd = o.rd ?? 1;
  const quader = (hiCol, loCol) => ({ v: (x, y, z, nx, ny) => {
    const yy = y + H / 2, row = Math.floor(yy / 1.1), u = (nx ? z : x) + (row % 2) * 0.9;
    const joint = (yy % 1.1) / 1.1 < 0.08 || ((u / 1.8) % 1 + 1) % 1 < 0.05;
    const c = mixHex(loCol, hiCol, 0.45 + 0.55 * Math.min(1, yy / H));
    if (ny > 0.6) return C(TURM.cap);
    return joint ? c.multiplyScalar(0.6) : c.multiplyScalar(0.9 + 0.1 * Math.abs(nx));
  } });
  // linker und rechter Block, Rinne dazwischen (zurückgesetzt, dunkler)
  b.box(-rx - x0, H, d, (x0 - rx) / 2, y0, face - d / 2, quader(0xb4a6c8, 0x4a3e5a), { r: 0 });
  b.box(x1 - rx, H, d, (x1 + rx) / 2, y0, face - d / 2, quader(0xb4a6c8, 0x4a3e5a), { r: 0 });
  b.box(2 * rx, H, d - rd, 0, y0, face - rd - (d - rd) / 2, quader(0x8a7aa0, 0x3a2e48), { r: 0 });
  // Kante/Krallenspuren in der Rinne, Goldleisten an den Kanten
  for (const sx of [-1, 1]) b.box(0.16, H, 0.16, sx * rx, y0, face - 0.05, TURM.gold, { r: 0 });
  for (let y = y0 + 2.2; y < y1 - 1; y += 2.6) for (const dx of [-0.35, 0, 0.35]) b.box(0.06, 0.9, 0.04, dx, y + (dx ? 0.2 : 0), face - rd + 0.02, 0x2a2036, { r: 0, rz: 0.18 });
  // Fackeln an der Front (Glut)
  for (const [fx, fy] of o.torches ?? []) {
    b.box(0.22, 0.6, 0.3, fx, fy, face + 0.15, 0x3a2a2a, { r: 0.04 });
    g.cone(0.22, 0.6, fx, fy + 0.6, face + 0.25, 0xffa040, 6);
    glowPoints(level, [[fx, fy + 0.9, face + 0.3, 1]], { color: 0xffa050, size: 2.4, opacity: 0.7, pulse: 1.2 });
  }
}

/** Schaft (Turmkörper) als Zylinder r von y0 bis y1 – Ziegel, Bänder; ohne Deckel. */
export function schaft(level, b, g, o) { trommel(level, b, g, { ...o, zinnen: false }); }

/** Kelchturm (Siegerturm): schlanker Schaft, der sich oben zur runden Plattform r öffnet (Kelch), Glühbirnen am Rand. */
export function kelchturm(level, b, g, x, z, r, top, base = FY) {
  const pts = [[0, base], [3.2, base], [3.0, base + 8], [2.6, top - 20], [3.2, top - 10], [5.6, top - 5], [r - 0.6, top - 2.4], [r + 0.4, top - 1.2], [r + 0.4, top - 0.12], [0, top - 0.12]];
  const H = top - base;
  b.b.lathe(pts.map(([rr, y]) => [rr, y - base - H / 2]), { v: (px, py, pz, nx, ny) => {
    const k = (py + H / 2) / H;
    if (ny > 0.6) return C(0xf0e0f8);
    const band = Math.floor((py + H / 2) / 2.4) % 2;
    return mixHex(0x4a2a5a, band ? 0xe86a9a : 0xf0c8e0, 0.3 + 0.7 * k);
  } }, { p: [x, base + H / 2, z] }, 40);
  b.n++;
  rundDeckel(b, x, top, z, r, [0xfff0c8, 0xf6c8d8]);
  const list = [];
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * TAU, px = x + Math.cos(a) * (r + 0.42), pz = z + Math.sin(a) * (r + 0.42);
    g.sphere(0.13, px, top - 0.6, pz, BIRNEN[i % BIRNEN.length], { ws: 4, hs: 3 });
    if (i % 2 === 0) list.push([px, top - 0.6, pz, 1]);
  }
  glowPoints(level, list, { color: 0xffe0a0, size: 1.2, opacity: 0.55, pulse: 0.8 });
}

/** Glühbirnen-Kette als Leuchtpunkte (durchhängend) von a nach b mit n Birnen (kleine Kugeln im Glüh-Material + Schein). */
export function birnenKette(level, g, a, b, n = 12, sag = 0.6, o = {}) {
  const list = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), z = a[2] + (b[2] - a[2]) * t;
    g.sphere(o.r ?? 0.12, x, y, z, BIRNEN[i % BIRNEN.length], { ws: 4, hs: 3 });
    list.push([x, y, z, 1]);
  }
  glowPoints(level, list, { color: o.color ?? 0xffe0a0, size: o.size ?? 1.0, opacity: o.opacity ?? 0.5, pulse: 0.7 });
}

/**
 * Schilder-Atlas: alle Leuchtschilder des Levels in **einem** Mesh (eine Leinwand-Textur, 1 Zeichenaufruf). list: [{ pos (Mitte),
 * text, w, h, yaw (0 = Schrift nach +Z), bg, ink, edge }]. Unbeleuchtet (abends gut lesbar), ohne Schatten.
 */
export function schilder(level, list) {
  if (!level.view || !list.length) return null;
  const cols = 2, rows = Math.ceil(list.length / cols), CW = 512, CH = 160;
  const cv = document.createElement('canvas');
  cv.width = CW * cols; cv.height = CH * rows;
  const c2 = cv.getContext('2d');
  list.forEach((s, i) => {
    const ox = (i % cols) * CW, oy = Math.floor(i / cols) * CH;
    c2.fillStyle = s.edge ?? '#ffc83a';
    roundRect(c2, ox + 4, oy + 4, CW - 8, CH - 8, 38); c2.fill();
    c2.fillStyle = s.bg ?? '#8a2a6a';
    roundRect(c2, ox + 16, oy + 16, CW - 32, CH - 32, 28); c2.fill();
    // Glühbirnen am Rand
    for (let k = 0; k < 14; k++) { c2.fillStyle = k % 2 ? '#fff4b0' : '#ffd060'; c2.beginPath(); c2.arc(ox + 40 + k * 33, oy + 11, 6, 0, TAU); c2.fill(); c2.beginPath(); c2.arc(ox + 40 + k * 33, oy + CH - 11, 6, 0, TAU); c2.fill(); }
    c2.fillStyle = s.ink ?? '#fff6d8';
    c2.textAlign = 'center'; c2.textBaseline = 'middle';
    let size = 72;
    c2.font = `bold ${size}px "Nunito", "Arial Rounded MT Bold", Arial, sans-serif`;
    while (c2.measureText(s.text).width > CW - 70 && size > 30) { size -= 4; c2.font = `bold ${size}px "Nunito", "Arial Rounded MT Bold", Arial, sans-serif`; }
    c2.lineWidth = 8; c2.strokeStyle = 'rgba(40,10,40,0.55)';
    c2.strokeText(s.text, ox + CW / 2, oy + CH / 2 + 4);
    c2.fillText(s.text, ox + CW / 2, oy + CH / 2 + 4);
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const pos = [], uv = [], idx = [];
  list.forEach((s, i) => {
    const u0 = (i % cols) / cols, u1 = u0 + 1 / cols, v1 = 1 - Math.floor(i / cols) / rows, v0 = v1 - 1 / rows;
    const w = s.w ?? 3.2, h = s.h ?? w / 3.2, yaw = s.yaw ?? 0, cs = Math.cos(yaw), sn = Math.sin(yaw);
    const [x, y, z] = s.pos, k = pos.length / 3;
    for (const [dx, dy] of [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]) pos.push(x + dx * cs, y + dy, z - dx * sn);
    uv.push(u0, v0, u1, v0, u1, v1, u0, v1);
    idx.push(k, k + 1, k + 2, k, k + 2, k + 3);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeBoundingSphere();
  const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, toneMapped: false, fog: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'schilder';
  mesh.castShadow = false;
  addObject(level, mesh);
  return mesh;
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

/**
 * Glockenbaum: kletterbarer Stamm (Kollision mit Flag beanstalk – wie eine Bohnenranke: anspringen, hoch drücken, oben
 * abspringen), runde Krone aus Blattbüscheln (nicht fest) mit goldenen Glöckchen. x, y (Fuß), z, H (Stammhöhe 5.2).
 * Liefert { top } (Oberkante des Stamms).
 */
export function glockenbaum(level, b, g, x, y, z, H = 5.2) {
  level.world.add({ type: 'cyl', x, z, r: 0.36, y0: y, y1: y + H, beanstalk: true, solid: false, camIgnore: true, tag: 'glockenbaum' });
  b.cyl(0.3, 0.46, H + 0.6, x, y, z, { v: (px, py, pz, nx) => mixHex(0x5a3420, 0x9a6a3a, 0.5 + 0.5 * nx) }, 10);
  for (const [a, l, h] of [[0.4, 1.3, 2.4], [2.6, 1.1, 3.4], [4.4, 1.2, 1.6]]) {
    const ex = x + Math.cos(a) * l, ez = z + Math.sin(a) * l;
    b.b.tube([[x, y + h, z], [x + Math.cos(a) * l * 0.6, y + h + 0.4, z + Math.sin(a) * l * 0.6], [ex, y + h + 0.9, ez]], 0.09, 0x7a4a2a, null, 6, 5);
    b.n++;
    b.sphere(0.42, ex, y + h + 1.0, ez, 0x5ac85a, { ws: 8, hs: 6 });
  }
  const rnd = new Rnd(4242);
  const crown = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU, rr = 1.25 + rnd.real(-0.2, 0.3), yy = y + H + 0.4 + rnd.real(-0.5, 0.6);
    crown.push([x + Math.cos(a) * rr, yy, z + Math.sin(a) * rr]);
    b.sphere(0.95 + rnd.real(-0.1, 0.2), x + Math.cos(a) * rr, yy, z + Math.sin(a) * rr, i % 2 ? 0x4ab85a : 0x6ad86a, { ws: 10, hs: 7 });
  }
  b.sphere(1.0, x, y + H + 1.4, z + 0.4, 0x62cc62, { ws: 10, hs: 7 });
  // Glöckchen
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU + 0.3, rr = 1.9 + (i % 2) * 0.25, yy = y + H - 0.5 + (i % 3) * 0.35;
    const bx = x + Math.cos(a) * rr, bz = z + Math.sin(a) * rr;
    b.cyl(0.015, 0.015, 0.4, bx, yy + 0.35, bz, 0x8a6a3a, 4);
    b.b.lathe([[0.02, 0.36], [0.12, 0.32], [0.17, 0.12], [0.24, 0], [0, 0]], TURM.gold, { p: [bx, yy, bz] }, 10); b.n++;
    b.sphere(0.06, bx, yy - 0.02, bz, 0x8a5a1a, { ws: 6, hs: 4 });
  }
  glowPoints(level, [[x, y + H + 0.8, z, 2.2]], { color: 0xffe08a, size: 2.2, opacity: 0.35, pulse: 0.5 });
  return { top: y + H };
}

// =====================================================================================================================
// 3) Ablauf
// =====================================================================================================================

/**
 * Kanonen-Tor: Gitter (Kollision, Kamera sieht hindurch) vor einer Glasröhren-Öffnung; open() zieht es hoch (Zahnrad-Rasseln)
 * und gibt den Weg frei. box { min, max } (das Gitter steht in der Mitte der Tiefe). → { open(), isOpen }
 */
export function kanonenTor(level, box) {
  const st = { isOpen: false, id: level.world.add({ type: 'box', min: box.min, max: box.max, camIgnore: true, tag: 'kanonentor' }), k: 0 };
  let root = null;
  if (level.view) {
    const [x0, y0, z0] = box.min, [x1, y1, z1] = box.max, w = x1 - x0, h = y1 - y0, zc = (z0 + z1) / 2;
    const b = new Bld();
    for (let x = x0 + 0.18; x < x1 - 0.05; x += 0.42) { b.cyl(0.06, 0.06, h, x, 0, 0, 0x4a3a5a, 6); b.cone(0.11, 0.26, x, h, 0, TURM.gold, 6); }
    for (const y of [0.25, h * 0.5, h - 0.35]) b.box(w + 0.1, 0.16, 0.14, (x0 + x1) / 2, y, 0, TURM.red, { r: 0.03 });
    b.sphere(0.32, (x0 + x1) / 2, h * 0.5 + 0.08, 0.1, TURM.gold, { ws: 10, hs: 7, s: [1, 1, 0.5] });
    const g = b.geometry();
    root = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.25 }));
    root.position.set(0, y0, zc);
    root.castShadow = true;
    root.name = 'kanonentor';
    const hold = {};
    addObject(level, root, (dt) => {
      if (!st.isOpen || st.k >= 1) return;
      st.k = Math.min(1, st.k + visDt(level, hold, dt) / 0.9);
      root.position.y = y0 + (h + 0.4) * st.k * st.k;
      root.visible = st.k < 1;
    });
  }
  st.open = () => {
    if (st.isOpen) return;
    st.isOpen = true;
    if (st.id != null) level.world.remove(st.id);
    st.id = null;
    level.sfx('gate');
  };
  return st;
}

/**
 * Thema baronpark mit eigener Kulisse: der große Baron-Turm steht hier im Level selbst – den zweiten Turm der Hintergrund-
 * Kulisse weit hinter den Horizont rücken (LEVEL.prebuild, vor dem Verschmelzen; Präzisierung „Leistung und Level-Haken 2“).
 */
export function parkKulisse(level, o = {}) {
  const v = level.view;
  if (!v?.sky) return;
  const base = v.sky.theme ?? v.theme;
  if (!base || base.__burg) return;
  const th = { ...base, __burg: true, buildBackdrop(sky, bounds, rnd, yBase) { sky.w8 = baronPark(sky, bounds, rnd, yBase, { y: FY, towerDist: o.towerDist ?? 1600, towerH: 60, ...o }); } };
  v.sky.theme = th;
  v.theme = th;
}

/**
 * Befreite Freunde am Ziel (Krümel, Flocke, Hoppel, Fernglas-Kobold): zuerst unsichtbar; show() lässt sie mit Funken erscheinen,
 * danach hüpfen sie im Kreis um ihren Platz und schauen zur Figur. spots [[x, y, z], …]. → { show(), shown, root }
 */
export function freundeFest(level, spots, keys = ['kruemel', 'flocke', 'hoppel', 'kobold']) {
  const st = { shown: false, t: 0, hops: 0 };
  if (!level.view) { st.show = () => { st.shown = true; }; return st; }
  const root = new THREE.Group();
  root.name = 'freunde';
  root.visible = false;
  const figs = keys.map((k, i) => {
    const f = friendFigure(k);
    const j = new THREE.Group();
    j.add(f);
    j.scale.setScalar(k === 'kobold' ? 1.25 : 1.6);
    const [x, y, z] = spots[i % spots.length];
    j.position.set(x, y, z);
    j.userData = { x, y, z, ph: i * 1.3 };
    root.add(j);
    return j;
  });
  const hold = {};
  addObject(level, root, (dt) => {
    if (!st.shown) return;
    const d = visDt(level, hold, dt);
    st.t += d;
    const p = level.player;
    for (const j of figs) {
      const u = j.userData, ph = st.t * 3.2 + u.ph;
      const hop = Math.abs(Math.sin(ph));
      j.position.set(u.x + Math.cos(st.t * 0.6 + u.ph) * 0.35, u.y + hop * 0.55, u.z + Math.sin(st.t * 0.6 + u.ph) * 0.35);
      const tx = p ? p.pos.x - j.position.x : 0, tz = p ? p.pos.z - j.position.z : 1;
      j.rotation.y = Math.atan2(-tz, tx);
      j.scale.y = j.scale.x * (1 + (1 - hop) * 0.08);
    }
  });
  st.root = root;
  st.show = () => {
    if (st.shown) return;
    st.shown = true;
    root.visible = true;
    for (const j of figs) level.effects?.sparks({ x: j.userData.x, y: j.userData.y + 0.6, z: j.userData.z }, 14);
    level.sfx('powerup_appear');
  };
  return st;
}

/**
 * Feuerwerk über einem Punkt (gemeinsames Leuchtfeld, 0 zusätzliche Zeichenaufrufe): start() lässt Raketen aufsteigen und in
 * bunten Funkenkugeln zerplatzen (alle every s eine, insgesamt n). → { start(), bursts }
 */
export function feuerwerk(level, center, o = {}) {
  const st = { on: false, t: 0, bursts: 0, next: 0 };
  const f = glowField(level);
  const SP = 22, R = o.rockets ?? 3;
  const COLS = [0xff5a8a, 0xffd04a, 0x6ad0ff, 0x8aff7a, 0xc87aff, 0xffffff];
  const rnd = new Rnd(o.seed ?? 2024);
  const rockets = Array.from({ length: R }, () => ({ live: false, t: 0, x: 0, y: 0, z: 0, vy: 0, burst: -1, col: 0 }));
  // Raketen fliegen auf der Level-Uhr (deterministisch, auch ohne Bilder); das Leuchtfeld zeigt den Stand je Bild
  const dyn = f ? f.alloc(R * (SP + 1), { color: 0xffffff, size: 1.3, opacity: 0.9 }, () => {}) : null;
  const set = (i, x, y, z) => dyn?.set(i, x, y, z);
  const hide = (i) => dyn?.hide(i);
  level.onStep((dt) => {
    if (!st.on) return;
    st.t += dt;
    st.next -= dt;
    if (st.next <= 0 && st.bursts < (o.n ?? 24)) {
      const r = rockets.find((q) => !q.live);
      if (r) {
        r.live = true; r.t = 0; r.burst = -1;
        r.x = center[0] + rnd.real(-0.5, 0.5) * (o.spread ?? 16); r.z = center[2] + rnd.real(-0.5, 0.5) * (o.spread ?? 16) * 0.5;
        r.y = center[1]; r.vy = 16 + rnd.real(0, 4);
        r.col = COLS[(st.bursts + rockets.indexOf(r)) % COLS.length];
        if (f && dyn) {
          const c = new THREE.Color(r.col).multiplyScalar(0.9), k0 = (dyn.i0 + rockets.indexOf(r) * (SP + 1)) * 3;
          for (let q = 0; q < SP + 1; q++) f.tint.set([c.r, c.g, c.b], k0 + q * 3);
          f.geo.attributes.tint.needsUpdate = true;
        }
        level.sfx('swoop');
        st.next = o.every ?? 0.7;
      }
    }
    rockets.forEach((r, ri) => {
      const i0 = ri * (SP + 1);
      if (!r.live) { for (let q = 0; q <= SP; q++) hide(i0 + q); return; }
      r.t += dt;
      if (r.burst < 0) {
        r.y += r.vy * dt; r.vy -= 9 * dt;
        set(i0, r.x, r.y, r.z);
        for (let q = 1; q <= SP; q++) hide(i0 + q);
        if (r.vy < 3) { r.burst = 0; st.bursts++; level.sfx('poof'); }
      } else {
        r.burst += dt;
        const k = r.burst, rad = 7 * (1 - Math.exp(-k * 3));
        hide(i0);
        for (let q = 1; q <= SP; q++) {
          const a = (q / SP) * TAU, b = Math.acos(1 - 2 * ((q * 0.618) % 1));
          if (k > 1.6) hide(i0 + q);
          else set(i0 + q, r.x + Math.cos(a) * Math.sin(b) * rad, r.y + Math.cos(b) * rad - k * k * 2.2, r.z + Math.sin(a) * Math.sin(b) * rad);
        }
        if (k > 1.6) r.live = false;
      }
    });
  });
  st.start = () => { st.on = true; };
  return st;
}

/** Glöckchen klingen, wenn eine Figur den Glockenbaum hinaufklettert (je 0,7 m ein Ton der Tonleiter). */
export function glockenKlang(level) {
  let lastY = null, k = 0;
  level.onStep(() => {
    const p = level.player;
    if (!p || p.mode !== 'stalk' || p.stalk?.tag !== 'glockenbaum') { lastY = null; return; }
    if (lastY === null) lastY = p.pos.y;
    if (Math.abs(p.pos.y - lastY) >= 0.7) { lastY = p.pos.y; level.sfx(`note${k++ % 8}`); }
  });
}
