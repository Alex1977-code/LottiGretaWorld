// Hilfen für die Welt-7-Level 7-5 „Stampfsteinturm und Giftnebel-Flucht“, 7-Kapitän „Krümel in der Zahnradschmiede“ und
// 7-6 „Rammfisch-Riff am Feuerberg“ (kein Level: exportiert kein LEVEL, die Level-Registry überspringt dieses Modul; nur für
// diese drei Level – die übrigen Welt-7-Level haben eigene Hilfsdateien).
//
// Oben reine Daten-Helfer (Inseln, Münzspuren, Schilder), dann Geometrie (Burgmauern mit einzelnen Steinen, runde
// Turmstufen, Zinnen, Plattenböden – alles statisch und verschmolzen über LEVEL.build), dann kleine level-lokale Mechanik
// (Aufzug, der losfährt, wenn man daraufsteht; Giftnebel startet die Lava), zuletzt Belebtes (Funken, Blasen, Glut).
//
// Gemeinsam:   isl, line, ring, arc, column, sign, glimmer, Bld (aus Welt 5/6), C (Farbe), brickBox, brickCyl, merlons,
//              merlonsRound, slits, tiles, tilesRound, aufzug, kette (Zierketten), funken
// 7-5:         fortressTier (eckige Turmetage), roundTier (runde Turmstufe), seilStation, nebelLava, brickCube (Ziegel-Würfel)
// 7-Kapitän:   machinePlate (Stahlplatte mit Nieten), gearWall, pipeRun, kruemelWinkt
// 7-6:         reefFloor (Sandboden mit Korallen), volcanoIsland, bubbles

import * as THREE from 'three';
import { colorize, merge, lin, mixc, smooth, hex, addStatic, addObject, Rnd, box } from '../../blocks/kit.js';
import { visDt } from '../../entities/gimmick.js';
import { figures, onRespawn } from '../../blocks/w7kit.js';
import { isl, line, ring, arc, column, sign, glimmer, Bld } from '../w6/_helpers_b.js';

export { isl, line, ring, arc, column, sign, glimmer, Bld, onRespawn };

const TAU = Math.PI * 2;
export const C = (c) => lin(hex(c));

// =====================================================================================================================
// Geometrie-Grundlagen: Vierecke mit flacher Farbe (je Stein eines)
// =====================================================================================================================

class Quads {
  constructor() { this.P = []; this.N = []; this.Cc = []; }
  /** Viereck a→b→c→d (gegen den Uhrzeigersinn von der Normalen aus gesehen). */
  quad(a, b, c, d, n, col) {
    for (const v of [a, b, c, a, c, d]) { this.P.push(v[0], v[1], v[2]); this.N.push(n[0], n[1], n[2]); this.Cc.push(col[0], col[1], col[2]); }
  }
  get empty() { return this.P.length === 0; }
  geometry() {
    if (!this.P.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.N, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.Cc, 3));
    return g;
  }
}
export { Quads };

const hash = (a, b, c = 0) => { const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return s - Math.floor(s); };

/** Steinfarben (Burgstein des Themas lavatower / lavamachine / reef). */
export const STONE = {
  burg: { s0: 0x8a7a86, s1: 0xa8969e, s2: 0x6a5a66, mortar: 0x3a2e38, hot: 0xff7a2a, top0: 0xb0a0a6, top1: 0x9a8a92, rim: 0xc8b8bc },
  rot: { s0: 0x9a5a52, s1: 0xb87068, s2: 0x7a443e, mortar: 0x3e2422, hot: 0xff8a3a, top0: 0xc8a094, top1: 0xb08880, rim: 0xd8b4a8 },
  dunkel: { s0: 0x5e5060, s1: 0x766878, s2: 0x463a48, mortar: 0x241c26, hot: 0xff6a1a, top0: 0x8a7c8a, top1: 0x766a78, rim: 0xa898a8 },
  basalt: { s0: 0x4a4048, s1: 0x5e5258, s2: 0x342c32, mortar: 0x1e181c, hot: 0xff6a1a, top0: 0x6a5e64, top1: 0x5a4e54, rim: 0x8a7e84 },
  sand: { s0: 0xb89a74, s1: 0xd0b48a, s2: 0x9a7e5e, mortar: 0x5a4632, hot: 0xff9a4a, top0: 0xdcc49a, top1: 0xc8ae86, rim: 0xe8d4ae },
};
const pal = (k) => { const s = typeof k === 'string' ? STONE[k] : k ?? STONE.burg; return { s0: C(s.s0), s1: C(s.s1), s2: C(s.s2), mortar: C(s.mortar), hot: C(s.hot), top0: C(s.top0), top1: C(s.top1), rim: C(s.rim) }; };

/**
 * Mauerfläche aus einzelnen Steinen: Fugen-Hintergrund + je Stein ein leicht vorstehendes Viereck mit eigener Tönung.
 * f = { o: [x, y, z] (Ecke links unten von außen), u: [ux, 0, uz] (Einheitsvektor nach rechts), n: [nx, 0, nz] (außen),
 *       w, h, bw: 1.2, bh: 0.6, row0: 0 (Reihen-Versatz), hotY: Höhe, unter der die Steine glühen (Lava), soot: 0..1 }
 */
export function brickFace(Q, f, P) {
  const [ox, oy, oz] = f.o, [ux, , uz] = f.u, [nx, , nz] = f.n;
  const bw = f.bw ?? 1.2, bh = f.bh ?? 0.6, g = 0.045, lift = 0.035;
  const at = (s, t, d = 0) => [ox + ux * s + nx * d, oy + t, oz + uz * s + nz * d];
  Q.quad(at(0, 0), at(f.w, 0), at(f.w, f.h), at(0, f.h), [nx, 0, nz], P.mortar);
  const rows = Math.max(1, Math.round(f.h / bh));
  const rh = f.h / rows;
  const tmp = [0, 0, 0];
  for (let r = 0; r < rows; r++) {
    const y0 = r * rh, y1 = (r + 1) * rh;
    const shift = ((r + (f.row0 ?? 0)) % 2) * bw * 0.5;
    for (let s = -shift; s < f.w - 1e-3; s += bw) {
      const a = Math.max(0, s), b = Math.min(f.w, s + bw);
      if (b - a < 0.15) continue;
      const k = hash(Math.round((ox + ux * a) * 3), Math.round((oy + y0) * 5), Math.round((oz + uz * a) * 3));
      mixc(P.s0, P.s1, 0.2 + k * 0.7, tmp);
      if (k > 0.86) mixc(tmp, P.s2, 0.5, tmp);
      const wy = oy + (y0 + y1) / 2;
      if (f.hotY !== undefined) mixc(tmp, P.hot, smooth(f.hotY + 3, f.hotY, wy) * 0.65, tmp);
      if (f.soot) mixc(tmp, P.s2, f.soot * smooth(oy + f.h * 0.4, oy + f.h, wy) * 0.5, tmp);
      const col = [tmp[0], tmp[1], tmp[2]];
      Q.quad(at(a + g, y0 + g, lift), at(b - g, y0 + g, lift), at(b - g, y1 - g, lift), at(a + g, y1 - g, lift), [nx, 0, nz], col);
    }
  }
}

/** Plattenboden (Steinplatten mit Fugen) über [x0,x1]×[z0,z1] auf Höhe y. cell = Plattengröße; rim = Randsteine. */
export function tiles(Q, x0, x1, z0, z1, y, P, o = {}) {
  const cell = o.cell ?? 1.0, g = 0.04;
  const za = Math.min(z0, z1), zb = Math.max(z0, z1);
  Q.quad([x0, y, zb], [x1, y, zb], [x1, y, za], [x0, y, za], [0, 1, 0], P.mortar);
  const tmp = [0, 0, 0];
  for (let x = x0; x < x1 - 1e-3; x += cell) {
    for (let z = za; z < zb - 1e-3; z += cell) {
      const a = x, b = Math.min(x1, x + cell), c = z, d = Math.min(zb, z + cell);
      const edge = o.rim && (a <= x0 + 1e-3 || b >= x1 - 1e-3 || c <= za + 1e-3 || d >= zb - 1e-3);
      const k = hash(Math.round(a * 2), Math.round(c * 2), y);
      if (edge) mixc(P.rim, P.top0, k * 0.4, tmp); else mixc(P.top0, P.top1, k, tmp);
      if (o.pattern?.(a + cell / 2, c + cell / 2)) mixc(tmp, C(o.patternColor ?? 0xd8483a), 0.75, tmp);
      Q.quad([a + g, y + 0.012, d - g], [b - g, y + 0.012, d - g], [b - g, y + 0.012, c + g], [a + g, y + 0.012, c + g], [0, 1, 0], [tmp[0], tmp[1], tmp[2]]);
    }
  }
}

/**
 * Burgmauer-Quader (Kollision box) mit gemauerten Seiten, Plattenboden oben, glühenden Fenstern und Zinnen.
 * b = { x0, x1, z0, z1, y0 (unten, Standard −3), top, stone: 'burg', hot: Lavahöhe (Glut unten), faces: '+z+x-x-z'
 *       (gezeigte Seiten), windows: [[seite, u, y, w, h]], skipTop, cell, rim, tag, camIgnore, pattern, patternColor }
 * Liefert Q (Vierecke, noch nicht abgegeben) – addFortress gibt sie ab.
 */
export function brickBox(level, Q, b) {
  const y0 = b.y0 ?? -3, top = b.top;
  const za = Math.min(b.z0, b.z1), zb = Math.max(b.z0, b.z1);
  if (b.solid !== false) level.world.add({ type: 'box', min: [b.x0, b.bottom ?? y0, za], max: [b.x1, top, zb], tag: b.tag ?? 'turm', camIgnore: !!b.camIgnore, climbable: !!b.climbable });
  if (!level.view) return;
  const P = pal(b.stone ?? 'burg');
  const faces = b.faces ?? '+z+x-x-z';
  const h = top - y0;
  const F = {
    '+z': { o: [b.x0, y0, zb], u: [1, 0, 0], n: [0, 0, 1], w: b.x1 - b.x0 },
    '-z': { o: [b.x1, y0, za], u: [-1, 0, 0], n: [0, 0, -1], w: b.x1 - b.x0 },
    '+x': { o: [b.x1, y0, zb], u: [0, 0, -1], n: [1, 0, 0], w: zb - za },
    '-x': { o: [b.x0, y0, za], u: [0, 0, 1], n: [-1, 0, 0], w: zb - za },
  };
  for (const k of ['+z', '-z', '+x', '-x']) if (faces.includes(k)) brickFace(Q, { ...F[k], h, hotY: b.hot, soot: b.soot ?? 0.3, row0: Math.round(top * 2) }, P);
  if (!b.skipTop) tiles(Q, b.x0, b.x1, za, zb, top, P, { cell: b.cell ?? 1.0, rim: b.rim ?? true, pattern: b.pattern, patternColor: b.patternColor });
  // Kantensteine oben (heller, leicht vorstehend) auf den gezeigten Seiten
  const lip = 0.12, lh = 0.22;
  const sideLip = (k) => {
    const f = F[k];
    const [ux, , uz] = f.u, [nx, , nz] = f.n;
    const o = f.o;
    const s0 = [o[0] + nx * lip, top - lh, o[2] + nz * lip];
    const at = (s, t) => [s0[0] + ux * s, s0[1] + t, s0[2] + uz * s];
    Q.quad(at(-lip, 0), at(f.w + lip, 0), at(f.w + lip, lh), at(-lip, lh), [nx, 0, nz], P.rim);
  };
  for (const k of ['+z', '-z', '+x', '-x']) if (faces.includes(k) && b.lip !== false) sideLip(k);
}

/**
 * Glühende Fensterschlitze (Bogenfenster) an einer Mauer: list [[x, y, z, seite ('+z'|'-z'|'+x'|'-x'), w, h]] →
 * Glüh-Geometrie (Licht innen) + dunkle Laibung. Liefert Geometrie für das Material 'glow'.
 */
export function slits(level, list, o = {}) {
  if (!level.view || !list.length) return;
  const G = new Quads(), D = new Quads();
  const glow = C(o.color ?? 0xffa040), glow2 = C(o.color2 ?? 0xffe08a), dark = C(0x1a1014);
  const N = { '+z': [0, 0, 1], '-z': [0, 0, -1], '+x': [1, 0, 0], '-x': [-1, 0, 0] };
  for (const [x, y, z, side, w = 0.6, h = 1.4] of list) {
    // side: Seite ('+z' …) oder Winkel in rad (runde Wand: Normale (sin a, 0, cos a))
    const n = typeof side === 'number' ? [Math.sin(side), 0, Math.cos(side)] : N[side] ?? N['+z'];
    const u = [n[2], 0, -n[0]];   // rechts von außen gesehen
    const d = 0.06;
    const at = (s, t, dd = d) => [x + u[0] * s + n[0] * dd, y + t, z + u[2] * s + n[2] * dd];
    D.quad(at(-w / 2 - 0.12, -0.12, 0.05), at(w / 2 + 0.12, -0.12, 0.05), at(w / 2 + 0.12, h + 0.12, 0.05), at(-w / 2 - 0.12, h + 0.12, 0.05), n, dark);
    // Rechteck + Bogen oben (Dreiecksfächer)
    const hb = h - w / 2;
    G.quad(at(-w / 2, 0), at(w / 2, 0), at(w / 2, hb), at(-w / 2, hb), n, glow);
    const seg = 6;
    for (let i = 0; i < seg; i++) {
      const a0 = Math.PI - (i / seg) * Math.PI, a1 = Math.PI - ((i + 1) / seg) * Math.PI;
      const p0 = at(Math.cos(a0) * w / 2, hb + Math.sin(a0) * w / 2), p1 = at(Math.cos(a1) * w / 2, hb + Math.sin(a1) * w / 2);
      G.quad(at(0, hb), p1, p0, at(0, hb), n, glow2);
    }
  }
  addStatic(level, D.geometry());
  addStatic(level, G.geometry(), { material: 'glow' });
}

/**
 * Zinnen entlang einer Strecke a→b (Höhe y): Zinnen (w × h × d) im Abstand step, dazwischen Brüstung (ph hoch).
 * o = { w: 0.8, h: 0.95, d: 0.5, step: 1.6, ph: 0.45, stone, solid: true (Kollision Brüstung bis ph), gaps: [[s0, s1]] (m
 *       ab a frei – Durchgänge), cam: true (camIgnore) }
 */
export function merlons(level, Q, a, b, y, o = {}) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
  if (L < 0.1) return;
  const ux = dx / L, uz = dz / L;
  const w = o.w ?? 0.8, h = o.h ?? 0.95, d = o.d ?? 0.5, step = o.step ?? 1.6, ph = o.ph ?? 0.45;
  const gaps = o.gaps ?? [];
  const free = (s0, s1) => !gaps.some(([g0, g1]) => s1 > g0 && s0 < g1);
  const P = pal(o.stone ?? 'burg');
  // Kollision: Brüstung je freiem Stück (bis ph … h, damit man nicht versehentlich hinunterfällt)
  const pieces = [];
  let s = 0;
  const cuts = [0, ...gaps.flat().filter((v) => v > 0 && v < L), L].sort((p, q) => p - q);
  for (let i = 0; i < cuts.length - 1; i++) { const m = (cuts[i] + cuts[i + 1]) / 2; if (free(m - 1e-3, m + 1e-3)) pieces.push([cuts[i], cuts[i + 1]]); }
  for (const [p0, p1] of pieces) {
    if (o.solid === false || p1 - p0 < 0.05) continue;
    const x0 = a[0] + ux * p0, z0 = a[1] + uz * p0, x1 = a[0] + ux * p1, z1 = a[1] + uz * p1;
    const hx = Math.abs(uz) * d / 2, hz = Math.abs(ux) * d / 2;
    level.world.add({ type: 'box', min: [Math.min(x0, x1) - hx, y, Math.min(z0, z1) - hz], max: [Math.max(x0, x1) + hx, y + (o.collide ?? h), Math.max(z0, z1) + hz], camIgnore: o.cam !== false, noWallSlide: true, tag: 'zinnen' });
  }
  if (!level.view) return;
  const yaw = Math.atan2(-uz, ux);
  const put = (gw, gh, gd, s0, yy, col, colTop) => {
    const g = box(gw, gh, gd, 0, 0, 0, col, { r: 0, seg: 0, topColor: colTop });
    g.rotateY(yaw);
    g.translate(a[0] + ux * s0, yy + gh / 2, a[1] + uz * s0);
    Q.extra ??= [];
    Q.extra.push(g);
  };
  const c0 = (Math.round(o.color ?? 0) || null);
  for (const [p0, p1] of pieces) {
    // Brüstung als ein Stück
    put(p1 - p0, ph, d, (p0 + p1) / 2, y, c0 ?? (o.stone === 'rot' ? 0x9a5a52 : 0x8a7a86), 0xb8a8ae);
    for (s = p0 + step / 2; s < p1 - w / 2 + 1e-3; s += step) put(w, h, d * 1.02, s, y, c0 ?? (o.stone === 'rot' ? 0xa8645a : 0x9a8a94), 0xc8b8bc);
  }
  void P;
}

/** Zinnen im Kreis (runde Turmstufe): r, y, Winkel-Lücken gaps: [[a0, a1]] (a = atan2(dx, dz): 0 = +Z, π/2 = +X). */
export function merlonsRound(level, Q, cx, cz, r, y, o = {}) {
  const gaps = o.gaps ?? [];
  const wrap = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
  const inGap = (a) => gaps.some(([g0, g1]) => { const m = wrap(a - (g0 + g1) / 2); return Math.abs(m) < Math.abs(g1 - g0) / 2; });
  const n = Math.max(12, Math.round((TAU * r) / (o.step ?? 1.6)));
  const h = o.h ?? 0.95, ph = o.ph ?? 0.45, d = o.d ?? 0.5;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU - Math.PI;
    if (inGap(a)) continue;
    const x = cx + Math.sin(a) * r, z = cz + Math.cos(a) * r;
    const seg = (TAU * r) / n;
    if (o.solid !== false) level.world.add({ type: 'cyl', x, z, r: Math.max(0.28, seg * 0.55), y0: y, y1: y + (o.collide ?? h), camIgnore: true, noWallSlide: true, tag: 'zinnen' });
    if (!level.view) continue;
    Q.extra ??= [];
    const base = box(seg * 1.02, ph, d, 0, 0, 0, o.color ?? 0x8a7a86, { r: 0, seg: 0, topColor: 0xb8a8ae });
    base.rotateY(a); base.translate(x, y + ph / 2, z);
    Q.extra.push(base);
    if (i % 2 === 0) {
      const m = box(seg * 0.62, h, d * 1.02, 0, 0, 0, o.color2 ?? 0x9a8a94, { r: 0, seg: 0, topColor: 0xc8b8bc });
      m.rotateY(a); m.translate(x, y + h / 2, z);
      Q.extra.push(m);
    }
  }
}

/** Gibt gesammelte Vierecke (und Zusatzteile) als statische Geometrie ab. */
export function flushQ(level, Q, opts) {
  if (!level.view) return;
  const parts = [];
  const g = Q.geometry();
  if (g) parts.push(g);
  if (Q.extra?.length) parts.push(...Q.extra.map((x) => (x.index ? x.toNonIndexed() : x)));
  if (parts.length) addStatic(level, merge(parts), opts);
  Q.P = []; Q.N = []; Q.Cc = []; Q.extra = [];
}

// =====================================================================================================================
// Runde Turmstufe (Zylinder) mit gemauerter Wand, Plattenboden und Zinnen
// =====================================================================================================================

/**
 * t = { x, z, r, top, y0: −3 (sichtbar ab), stone, hot (Lavahöhe), gaps (Zinnen-Lücken [[a0, a1]] in rad, a = atan2(dx, dz)),
 *       merlons: true, inner: Radius der nächsthöheren Stufe (Boden nur im Ring sichtbar), tag, windows: [[a, y]] }
 * Kollision: Zylinder von y0 − 6 bis top.
 */
export function roundTier(level, Q, t) {
  const y0 = t.y0 ?? -3;
  // camIgnore: der Kamerastrahl prüft Zylinder als Quader – sonst rückte die Kamera auf den Ringen ganz nah heran
  level.world.add({ type: 'cyl', x: t.x, z: t.z, r: t.r, y0: y0 - 6, y1: t.top, tag: t.tag ?? 'turmstufe', camIgnore: t.camIgnore ?? true });
  if (t.merlons !== false) merlonsRound(level, Q, t.x, t.z, t.r - 0.3, t.top, { gaps: t.gaps ?? [], solid: t.solidMerlons !== false });
  if (!level.view) return;
  const P = pal(t.stone ?? 'burg');
  const r = t.r, h = t.top - y0;
  const bw = 1.2, bh = 0.6;
  const rows = Math.max(1, Math.round(h / bh));
  const rh = h / rows;
  const n = Math.max(16, Math.round((TAU * r) / bw));
  const tmp = [0, 0, 0];
  // Fugen-Hintergrund (Zylindermantel) + Steine als leicht vorstehende Vierecke
  const ring = (rr, a, y) => [t.x + Math.sin(a) * rr, y, t.z + Math.cos(a) * rr];
  const nrm = (a) => [Math.sin(a), 0, Math.cos(a)];
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU;
    // nur die vordere Hälfte und Seiten (Kamera blickt nach −Z); hinten genügt der Fugengrund
    const am = (a0 + a1) / 2;
    const back = Math.cos(am) < -0.55;
    Q.quad(ring(r, a0, y0), ring(r, a1, y0), ring(r, a1, t.top), ring(r, a0, t.top), nrm(am), P.mortar);
    if (back) continue;
  }
  for (let rI = 0; rI < rows; rI++) {
    const ya = y0 + rI * rh, yb = ya + rh;
    const off = (rI % 2) * 0.5;
    for (let i = 0; i < n; i++) {
      const a0 = ((i + off) / n) * TAU, a1 = ((i + off + 1) / n) * TAU;
      const am = (a0 + a1) / 2;
      if (Math.cos(am) < -0.55) continue;
      const g = 0.045 / r;
      const k = hash(i, rI, t.r * 7);
      mixc(P.s0, P.s1, 0.2 + k * 0.7, tmp);
      if (k > 0.86) mixc(tmp, P.s2, 0.5, tmp);
      if (t.hot !== undefined) mixc(tmp, P.hot, smooth(t.hot + 3, t.hot, (ya + yb) / 2) * 0.65, tmp);
      mixc(tmp, P.s2, smooth(t.top - h * 0.6, t.top, (ya + yb) / 2) * 0.12, tmp);
      const rr = r + 0.035;
      Q.quad(ring(rr, a0 + g, ya + 0.045), ring(rr, a1 - g, ya + 0.045), ring(rr, a1 - g, yb - 0.045), ring(rr, a0 + g, yb - 0.045), nrm(am), [tmp[0], tmp[1], tmp[2]]);
    }
  }
  // Kantenring (hell) unter der Oberkante
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU, am = (a0 + a1) / 2;
    Q.quad(ring(r + 0.12, a0, t.top - 0.24), ring(r + 0.12, a1, t.top - 0.24), ring(r + 0.12, a1, t.top), ring(r + 0.12, a0, t.top), nrm(am), P.rim);
  }
  // Boden: Ring aus Platten (konzentrisch) zwischen inner und r
  const ri = t.inner ?? 0;
  const ringsN = Math.max(1, Math.round((r - ri) / 1.0));
  for (let k = 0; k < ringsN; k++) {
    const ra = ri + ((r - ri) * k) / ringsN, rb = ri + ((r - ri) * (k + 1)) / ringsN;
    const m = Math.max(6, Math.round((TAU * (ra + rb) / 2) / 1.1));
    for (let i = 0; i < m; i++) {
      const a0 = ((i + (k % 2) * 0.5) / m) * TAU, a1 = ((i + (k % 2) * 0.5 + 1) / m) * TAU;
      const kk = hash(i, k, t.top);
      const edge = k === ringsN - 1;
      if (edge) mixc(P.rim, P.top0, kk * 0.4, tmp); else mixc(P.top0, P.top1, kk, tmp);
      const g = 0.04;
      const y = t.top + 0.012;
      const ra2 = Math.max(0, ra + (ra > 0 ? g : 0)), rb2 = rb - g, ga = g / Math.max(0.5, rb);
      Q.quad(ring(ra2, a0 + ga, y), ring(rb2, a0 + ga, y), ring(rb2, a1 - ga, y), ring(ra2, a1 - ga, y), [0, 1, 0], [tmp[0], tmp[1], tmp[2]]);
    }
  }
  // Fugen-Boden darunter
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU;
    Q.quad(ring(ri, a0, t.top), ring(r, a0, t.top), ring(r, a1, t.top), ring(ri, a1, t.top), [0, 1, 0], P.mortar);
  }
}

// =====================================================================================================================
// Zierketten, Banner, Funken
// =====================================================================================================================

/** Hängende Ketten (Glieder als flache Ringe), list [[x, yTop, z, länge]]. */
export function ketten(level, list) {
  if (!level.view || !list.length) return;
  const parts = [];
  const dark = C(0x3a3a44), hi = C(0x8a8a98);
  for (const [x, yTop, z, L] of list) {
    const n = Math.max(2, Math.round(L / 0.32));
    for (let i = 0; i < n; i++) {
      const g = new THREE.TorusGeometry(0.12, 0.035, 4, 8);
      if (i % 2) g.rotateY(Math.PI / 2);
      g.rotateX(Math.PI / 2 * 0 + (i % 2 ? 0 : 0));
      g.translate(x, yTop - i * 0.3 - 0.15, z);
      parts.push(colorize(g.toNonIndexed(), (p, nn, o) => mixc(dark, hi, smooth(-0.5, 0.9, nn.x * 0.6 + nn.y * 0.4), o)));
    }
  }
  addStatic(level, merge(parts), { castShadow: false });
}

/**
 * Aufsteigende Glutfunken (eine Punktwolke, additiv): boxes [[x0, x1, y0, y1, z0, z1]], n, rise (m/s), color.
 */
export function funken(level, boxes, o = {}) {
  if (!level.view) return null;
  const rnd = new Rnd(o.seed ?? 77);
  const n = o.n ?? 70;
  const items = [];
  for (let i = 0; i < n; i++) {
    const b = boxes[i % boxes.length];
    items.push({ x: rnd.real(b[0], b[1]), y0: b[2], h: b[3] - b[2], z: rnd.real(Math.min(b[4], b[5]), Math.max(b[4], b[5])), t: rnd.real(0, 1), v: rnd.real(0.6, 1.4), ph: rnd.real(0, TAU) });
  }
  const pos = new Float32Array(n * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const cv = document.createElement('canvas');
  cv.width = cv.height = 32;
  const g2 = cv.getContext('2d');
  const gr = g2.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g2.fillStyle = gr; g2.fillRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.PointsMaterial({ size: o.size ?? 0.2, map: tex, color: o.color ?? 0xffa040, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const pts = new THREE.Points(geo, mat);
  const bb = new THREE.Box3();
  for (const q of boxes) bb.union(new THREE.Box3(new THREE.Vector3(q[0], q[2], Math.min(q[4], q[5])), new THREE.Vector3(q[1], q[3], Math.max(q[4], q[5]))));
  geo.boundingSphere = bb.getBoundingSphere(new THREE.Sphere());
  geo.computeBoundingSphere = () => {};
  pts.renderOrder = 4;
  pts.userData.tex = tex;
  const hv = {};
  const rise = o.rise ?? 0.35;
  addObject(level, pts, (dt) => {
    dt = visDt(level, hv, dt);
    for (let i = 0; i < n; i++) {
      const it = items[i];
      it.t = (it.t + dt * rise * it.v / Math.max(1, it.h) * 3) % 1;
      pos[i * 3] = it.x + Math.sin(it.t * 6 + it.ph) * 0.3;
      pos[i * 3 + 1] = it.y0 + it.t * it.h;
      pos[i * 3 + 2] = it.z + Math.cos(it.t * 5 + it.ph) * 0.3;
    }
    geo.attributes.position.needsUpdate = true;
  });
  return pts;
}

// =====================================================================================================================
// Mechanik
// =====================================================================================================================

/**
 * Aufzug: eine bewegliche Plattform (`mover` bzw. `cloud` mit idle: true, path [unten, oben], wait: 0) fährt los, sobald
 * eine Figur daraufsteht (0,25 s), hält am Pfadende, wartet dort, bis niemand mehr daraufsteht (back s), und fährt leer
 * zurück. Neustart am Checkpoint: zurück an den Anfang. Liefert { state, trips, info() }.
 */
export function aufzug(level, id, o = {}) {
  const h = level.named.get(id);
  if (!h) { console.warn(`[7-Level] Aufzug ${id} fehlt`); return null; }
  const pm = h.pm;
  pm.wait = 0;
  const st = { state: 'start', t: 0, trips: 0 };
  const onIt = () => figures(level).some((f) => !f.dead && (f.mode === 'ground') && f.ground?.mover === h.mover);
  level.onStep((dt) => {
    st.t += dt;
    const on = onIt();
    switch (st.state) {
      case 'start':
        h.running = false;
        if (on) { if (st.t > (o.delay ?? 0.25)) { st.state = 'hin'; st.t = 0; pm.dir = 1; pm.pause = 0; h.running = true; level.sfx('switch'); } } else st.t = 0;
        break;
      case 'hin':
        if (pm.s >= pm.length - 1e-6) { st.state = 'ende'; st.t = 0; h.running = false; st.trips++; }
        break;
      case 'ende':
        h.running = false;
        if (on) st.t = 0;
        else if (st.t > (o.back ?? 1.2)) { st.state = 'zurueck'; st.t = 0; pm.dir = -1; pm.pause = 0; h.running = true; }
        break;
      case 'zurueck':
        if (pm.s <= 1e-6) { st.state = 'start'; st.t = 0; h.running = false; pm.dir = 1; pm.pause = 0; }
        break;
      default: break;
    }
  });
  onRespawn(level, () => { pm.s = 0; pm.at(0, pm.pos); pm.dir = 1; pm.pause = 0; h.running = false; st.state = 'start'; st.t = 0; });
  st.info = () => ({ state: st.state, s: +pm.s.toFixed(2), trips: st.trips });
  if (o.name) level.named.set(o.name, st);
  return st;
}

/**
 * Giftnebel startet die steigende Lava (7-5 Flucht): sobald der Nebel `fog` jagt (bzw. verzögert), fährt der Lavaspiegel
 * `lava` (mode 'signal') hinauf; Neustart setzt beides zurück (Lava: reset: true). Liefert { started, info() }.
 */
export function nebelLava(level, fogId, lavaId) {
  const st = { started: false, at: null };
  level.onStep(() => {
    if (st.started) return;
    const f = level.named.get(fogId), l = level.named.get(lavaId);
    if (!f || !l) return;
    if (f.state === 'verzoegert' || f.state === 'jagt') { st.started = true; st.at = level.time; l.start(); level.sfx('rumble'); }
  });
  onRespawn(level, () => { st.started = false; st.at = null; });
  st.info = () => ({ started: st.started, at: st.at });
  return st;
}
