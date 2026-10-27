// Hilfen der Halloween-Level H-Kapitän „Krümel im Kicherkürbis-Labyrinth“ und H-3 „Gute Nacht am Gruselgrab“
// (Welt 31, „Kürbisinsel“). Kein LEVEL – nur für diese beiden Level (andere Halloween-Level haben eigene Hilfsdateien).
// Alles hier ist Zier bzw. level-lokale Kleinmechanik für die Haken LEVEL.build/LEVEL.setup; die Spielmechanik kommt aus
// den Halloween-Bausteinen (Präzisierung „Motor und Bausteine Halloween“) und -Gegnern.
//
//   Daten:    isl, line, ring, arc, sweets, sweetRing
//   Zier:     Bld (Geometrie-Sammler), glowPoints/glowField (weiche Leuchtflecken, ein Zeichenaufruf), mazeWalls +
//             strawWalls + mazeFloor (Strohballen-Labyrinth), giantPumpkin, barn, pumpkinStand, pumpkinsOn, floatRock,
//             fireflies, chapel, cemeteryGate, rockNeedle, boneGarden, creekBridge, gravePath
//   Szenen:   wavingPumpkin (winkt zurück), gigglingGhost (kichert, versteckt sich hinter dem Grabstein),
//             kruemelCameo (Krümel mit Laterne winkt am Ufer), onRespawn

import * as THREE from 'three';
import { box, colorize, merge, lin, mixc, smooth, hex, addStatic, addObject, Rnd } from '../../blocks/kit.js';
import { Build } from '../../models/lib/kit.js';
import { visDt } from '../../entities/gimmick.js';
import { pumpkinGeo, faceGeo, softTexture, lanternParts, HWC } from '../../blocks/hwkit.js';
import { getModel, hasModel } from '../../models/index.js';

const TAU = Math.PI * 2;
const L = (c) => lin(hex(c));

// =====================================================================================================================
// Daten-Helfer
// =====================================================================================================================

/** Insel über ihre Grundfläche x0..x1, zA..zB (Reihenfolge egal), Oberseite top, Höhe h; o: weitere Felder. */
export function isl(x0, x1, zA, zB, top, h = 4, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  return { type: 'island', pos: [(x0 + x1) / 2, top - h, (z0 + z1) / 2], size: [x1 - x0, h, z0 - z1], under: 0, ...o };
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
/** Süßigkeiten in einer Reihe (je +1 Bitcoin). */
export const sweets = (from, to, n, variant) => ({ kind: 'suessigkeiten', from, to, n, ...(variant ? { variant } : {}) });
/** Süßigkeiten im Kreis. */
export const sweetRing = (pos, r, n, variant) => ({ kind: 'suessigkeiten', pos, r, n, ...(variant ? { variant } : {}) });

/** Hülle um runtime.respawn (Tod → Neustart am Checkpoint): fn() läuft danach. */
export function onRespawn(level, fn) {
  const rt = level.runtime;
  if (!rt) return;
  const prev = rt.respawn.bind(rt);
  rt.respawn = (...a) => { const r = prev(...a); fn(); return r; };
}

// =====================================================================================================================
// Geometrie-Sammler (Weltkoordinaten, Vertexfarben)
// =====================================================================================================================

/**
 * Sammler für statische Zier: b.box(w, h, d, x, y, z, farbe, { r, yaw, rx, rz }) (Mitte unten), b.cyl(rTop, rBot, h, x, y,
 * z, farbe, seg, o), b.sphere(r, x, y, z, farbe, { s }), b.cone(r, h, x, y, z, farbe, seg, o), b.add(g, farbe, o).
 * b.flush(level, opts) gibt die Geometrie an den Batcher (addStatic) – opts { material: 'glow', castShadow }.
 */
export class Bld {
  constructor() { this.b = new Build(); this.n = 0; this.raws = []; }
  /** Fertig gefärbte Geometrie (Weltkoordinaten, mit color) unverändert übernehmen. */
  raw(g) {
    const q = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(q.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') q.deleteAttribute(k);
    if (!q.attributes.normal) q.computeVertexNormals();
    this.raws.push(q); this.n++; return this;
  }
  box(w, h, d, x, y, z, color, o = {}) {
    this.b.box(w, h, d, color, { p: [x, y + h / 2, z], r: [o.rx ?? 0, o.yaw ?? 0, o.rz ?? 0], order: o.order }, o.r ?? 0.04, o.seg ?? 1);
    this.n++; return this;
  }
  cyl(rTop, rBot, h, x, y, z, color, seg = 10, o = {}) {
    this.b.cyl(rTop, rBot, h, color, { p: [x, y + h / 2, z], r: [o.rx ?? 0, o.yaw ?? 0, o.rz ?? 0], order: o.order }, seg, !!o.open);
    this.n++; return this;
  }
  sphere(r, x, y, z, color, o = {}) {
    this.b.sphere(r, color, { p: [x, y, z], s: o.s ?? 1, r: [o.rx ?? 0, o.yaw ?? 0, o.rz ?? 0] }, o.ws ?? 10, o.hs ?? 7);
    this.n++; return this;
  }
  cone(r, h, x, y, z, color, seg = 8, o = {}) {
    this.b.cone(r, h, color, { p: [x, y + h / 2, z], r: [o.rx ?? 0, o.yaw ?? 0, o.rz ?? 0], s: o.s ?? 1 }, seg);
    this.n++; return this;
  }
  torus(R, t, x, y, z, color, o = {}) {
    this.b.torus(R, t, color, { p: [x, y, z], r: [o.rx ?? 0, o.yaw ?? 0, o.rz ?? 0] }, o.rs ?? 6, o.ts ?? 16, o.arc ?? TAU);
    this.n++; return this;
  }
  add(g, color, o) { this.b.add(g, color, o); this.n++; return this; }
  geometry() {
    if (!this.n) return null;
    this.n = 0;
    const parts = this.b.parts.length ? [this.b.geometry()] : [];
    parts.push(...this.raws);
    this.raws = [];
    return parts.length > 1 ? merge(parts) : parts[0];
  }
  flush(level, opts) {
    const g = this.geometry();
    if (!g) return;
    if (!level.view) { g.dispose(); return; }
    addStatic(level, g, opts);
  }
}

/** Farbverlauf von unten (lo) nach oben (hi) über y0..y1 – für Bld-Farben ({ v }). */
export const gradY = (lo, hi, y0, y1) => {
  const A = new THREE.Color(lo), B = new THREE.Color(hi), c = new THREE.Color();
  return { v: (x, y) => c.copy(A).lerp(B, Math.max(0, Math.min(1, (y - y0) / (y1 - y0 || 1)))) };
};
/** Oben hell, unten dunkel (Licht von oben) – für Bld-Farben. */
export const litTop = (base, k = 0.7) => {
  const M = new THREE.Color(base), T = M.clone().multiplyScalar(1.18), D = M.clone().multiplyScalar(k), c = new THREE.Color();
  return { v: (x, y, z, nx, ny) => (ny >= 0 ? c.copy(M).lerp(T, ny) : c.copy(M).lerp(D, -ny)) };
};

// =====================================================================================================================
// Leuchtfeld: alle weichen Leuchtflecken eines Levels in einem Punkte-Objekt (1 Zeichenaufruf, additiv)
// =====================================================================================================================

const GLOW_VS = `
  attribute float size; attribute vec3 tint; attribute vec2 pulse;
  uniform float time; uniform float scale;
  varying vec3 vTint; varying float vA;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float k = pulse.x > 0.0 ? 0.78 + 0.22 * sin(time * pulse.x * 6.2832 + pulse.y) : 1.0;
    vTint = tint; vA = k;
    gl_PointSize = size * scale / max(0.1, -mv.z);
    gl_Position = projectionMatrix * mv;
  }`;
const GLOW_FS = `
  uniform sampler2D map;
  varying vec3 vTint; varying float vA;
  void main() {
    vec4 t = texture2D(map, gl_PointCoord);
    gl_FragColor = vec4(vTint * vA, t.a);
    #include <colorspace_fragment>
  }`;

class GlowField {
  constructor(level) {
    this.n = 0; this.cap = 0;
    this.pos = new Float32Array(0); this.size = new Float32Array(0); this.tint = new Float32Array(0); this.pulse = new Float32Array(0);
    this.geo = new THREE.BufferGeometry();
    this.mat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, scale: { value: 300 }, map: { value: softTexture() } },
      vertexShader: GLOW_VS, fragmentShader: GLOW_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.obj = new THREE.Points(this.geo, this.mat);
    this.obj.name = 'leuchtfeld';
    this.obj.frustumCulled = false;
    this.obj.renderOrder = 4;
    this.dyn = [];
    const holder = {}, size = new THREE.Vector2();
    addObject(level, this.obj, (dt) => {
      this.mat.uniforms.time.value += visDt(level, holder, dt);
      level.view.renderer?.getDrawingBufferSize?.(size);
      if (size.y) this.mat.uniforms.scale.value = size.y * 0.5;
      let dirty = false;
      for (const d of this.dyn) if (d.update) { d.update(dt); dirty = true; }
      if (dirty) this.geo.attributes.position.needsUpdate = true;
    });
  }
  grow(k) {
    if (this.n + k <= this.cap) return;
    const cap = Math.max(64, (this.n + k) * 2);
    const re = (a, w) => { const b = new Float32Array(cap * w); b.set(a); return b; };
    this.pos = re(this.pos, 3); this.size = re(this.size, 1); this.tint = re(this.tint, 3); this.pulse = re(this.pulse, 2);
    this.cap = cap;
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    this.geo.setAttribute('tint', new THREE.BufferAttribute(this.tint, 3));
    this.geo.setAttribute('pulse', new THREE.BufferAttribute(this.pulse, 2));
  }
  add(pts, o = {}) {
    this.grow(pts.length);
    const c = new THREE.Color(o.color ?? 0xffb860).multiplyScalar(o.opacity ?? 0.7);
    const i0 = this.n;
    pts.forEach((p, k) => {
      const i = this.n++;
      this.pos.set([p[0], p[1], p[2]], i * 3);
      this.size[i] = (o.size ?? 1.2) * (p[3] ?? 1);
      this.tint.set([c.r, c.g, c.b], i * 3);
      this.pulse[i * 2] = o.pulse ?? 0; this.pulse[i * 2 + 1] = (i0 + k) * 1.7;
    });
    this.geo.setDrawRange(0, this.n);
    for (const a of ['position', 'size', 'tint', 'pulse']) this.geo.attributes[a].needsUpdate = true;
    return i0;
  }
  alloc(n, o = {}, update = null) {
    const i0 = this.add(Array.from({ length: n }, () => [0, -999, 0]), o);
    const d = { i0, n, update, set: (i, x, y, z) => { const k = (i0 + i) * 3; this.pos[k] = x; this.pos[k + 1] = y; this.pos[k + 2] = z; }, hide: (i) => { this.pos[(i0 + i) * 3 + 1] = -999; } };
    this.dyn.push(d);
    return d;
  }
}

/** Leuchtfeld des Levels (beim ersten Aufruf angelegt; ohne Ansicht null). */
export function glowField(level) {
  if (!level.view) return null;
  if (!level._hwbGlow) level._hwbGlow = new GlowField(level);
  return level._hwbGlow;
}
/** Leuchtflecken: pts [[x, y, z, größe?], …], o { color, size, opacity, pulse (Hz) }. */
export function glowPoints(level, pts, o = {}) {
  const f = glowField(level);
  if (!f || !pts.length) return null;
  return { field: f, i0: f.add(pts, o), n: pts.length };
}

/** Glühwürmchen: n Leuchtpunkte, die in einem Feld (x0..x1, z0..z1, Höhe y ± 0,6) gemächlich umherschweben. */
export function fireflies(level, x0, x1, zA, zB, y, n = 14, color = 0xd8ff6a) {
  const f = glowField(level);
  if (!f) return;
  const rnd = new Rnd(Math.round(x0 * 7 + zA * 3 + n) >>> 0);
  const flies = Array.from({ length: n }, () => ({ x: rnd.real(x0, x1), z: rnd.real(Math.min(zA, zB), Math.max(zA, zB)), y: y + rnd.real(-0.3, 0.8), a: rnd.real(0, TAU), s: rnd.real(0.3, 0.7), p: rnd.real(0, TAU) }));
  let t = 0;
  const d = f.alloc(n, { color, size: 0.55, opacity: 0.95, pulse: 1.6 }, (dt) => {
    t += dt;
    flies.forEach((q, i) => d.set(i, q.x + Math.cos(t * q.s + q.a) * 1.3, q.y + Math.sin(t * 1.3 + q.p) * 0.35, q.z + Math.sin(t * q.s * 0.8 + q.a) * 1.3));
  });
}

// =====================================================================================================================
// H-Kapitän: Strohballen-Labyrinth
// =====================================================================================================================

/**
 * Wände eines Rasterlabyrinths. cfg { x0 (linke Kante), z0 (Vorderkante, +z), cell, cols, rows, open: [[c, r, c2, r2], …]
 * (Durchgänge zwischen Nachbarzellen; Spalte c von links, Zeile r von vorn), gates: [[c, r, 'n'|'s'|'e'|'w'], …] (offene
 * Außenseiten; n = vorn/+z, s = hinten/−z), t (Wanddicke 0,6) } → [{ x0, x1, z0, z1 }] (z0 > z1), zusammengefasst je Linie.
 */
export function mazeWalls(cfg) {
  const { x0, z0, cell: S, cols, rows } = cfg;
  const t = cfg.t ?? 0.6;
  const key = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const open = new Set(cfg.open.map(([c, r, c2, r2]) => key(`${c},${r}`, `${c2},${r2}`)));
  const gate = new Set((cfg.gates ?? []).map(([c, r, s]) => `${c},${r},${s}`));
  const X = (c) => x0 + c * S, Z = (r) => z0 - r * S;
  const rects = [];
  for (let c = 0; c <= cols; c++) {
    let run = null;
    for (let r = 0; r <= rows; r++) {
      let wall = false;
      if (r < rows) {
        if (c === 0) wall = !gate.has(`0,${r},w`);
        else if (c === cols) wall = !gate.has(`${cols - 1},${r},e`);
        else wall = !open.has(key(`${c - 1},${r}`, `${c},${r}`));
      }
      if (wall && run === null) run = r;
      if (!wall && run !== null) { rects.push({ x0: X(c) - t / 2, x1: X(c) + t / 2, z0: Z(run) + t / 2, z1: Z(r) - t / 2 }); run = null; }
    }
  }
  for (let r = 0; r <= rows; r++) {
    let run = null;
    for (let c = 0; c <= cols; c++) {
      let wall = false;
      if (c < cols) {
        if (r === 0) wall = !gate.has(`${c},0,n`);
        else if (r === rows) wall = !gate.has(`${c},${rows - 1},s`);
        else wall = !open.has(key(`${c},${r - 1}`, `${c},${r}`));
      }
      if (wall && run === null) run = c;
      if (!wall && run !== null) { rects.push({ x0: X(run) - t / 2, x1: X(c) + t / 2, z0: Z(r) + t / 2, z1: Z(r) - t / 2 }); run = null; }
    }
  }
  return rects;
}

/** Mitte der Labyrinth-Zelle (c, r) als [x, z]. */
export const mazeCell = (cfg, c, r) => [cfg.x0 + (c + 0.5) * cfg.cell, cfg.z0 - (r + 0.5) * cfg.cell];

const STRAW = [0xf2cc62, 0xe8bc52, 0xf8d878, 0xdcae48];

/**
 * Strohballen-Wände (Kollision je Rechteck, Höhe h ab y) – zwei Lagen Ballen mit Schnüren, oben hier und da ein
 * Kürbis (mit leuchtendem Gesicht) oder ein Maisbüschel. o { seed, pumpkins: Anteil 0..1 }.
 */
export function strawWalls(level, rects, y, h = 1.0, o = {}) {
  for (const w of rects) level.world.add({ type: 'box', min: [w.x0, y, w.z1], max: [w.x1, y + h, w.z0], tag: 'strohwand' });
  if (!level.view) return;
  const rnd = new Rnd(o.seed ?? 7);
  const b = new Bld(), g = new Bld(), pk = [], glows = [];
  const layers = 2, bh = h / layers;
  for (const w of rects) {
    const lx = w.x1 - w.x0, lz = w.z0 - w.z1, alongX = lx >= lz;
    const Lw = alongX ? lx : lz, T = alongX ? lz : lx;
    const cx = (w.x0 + w.x1) / 2, cz = (w.z0 + w.z1) / 2;
    for (let k = 0; k < layers; k++) {
      const n = Math.max(1, Math.round(Lw / 1.2));
      const bl = Lw / n;
      for (let i = 0; i < n; i++) {
        const u = -Lw / 2 + (i + 0.5) * bl + (k ? rnd.real(-0.08, 0.08) : 0);
        const x = alongX ? cx + u : cx + rnd.real(-0.03, 0.03), z = alongX ? cz + rnd.real(-0.03, 0.03) : cz + u;
        const col = litTop(STRAW[rnd.int(0, 3)], 0.62);
        const yaw = rnd.real(-0.04, 0.04);
        const bw = alongX ? bl - 0.05 : T + rnd.real(-0.02, 0.06), bd = alongX ? T + rnd.real(-0.02, 0.06) : bl - 0.05;
        b.box(bw, bh - 0.02, bd, x, y + k * bh, z, col, { r: 0, yaw });
        // zwei Schnüre quer
        for (const sgn of [-1, 1]) {
          const sx = alongX ? x + sgn * bl * 0.26 : x, sz = alongX ? z : z + sgn * bl * 0.26;
          b.box(alongX ? 0.05 : T + 0.1, bh - 0.0, alongX ? T + 0.1 : 0.05, sx, y + k * bh - 0.01, sz, 0x9a6a30, { r: 0, yaw });
        }
      }
    }
    // Kürbisse/Maisbüschel oben an den Enden langer Wände
    const ends = Lw > 2 ? [-Lw / 2 + 0.45, Lw / 2 - 0.45] : [0];
    for (const u of ends) {
      if (rnd.frac() > (o.pumpkins ?? 0.45)) continue;
      const x = alongX ? cx + u : cx, z = alongX ? cz : cz + u;
      pk.push([x, y + h, z, rnd.real(0.26, 0.36)]);
    }
  }
  for (const [x, yy, z, r] of pk) {
    const p = pumpkinGeo({ r, shape: rnd.pick(['rund', 'flach', 'dick']), color: rnd.frac() < 0.82 ? 'orange' : 'gelb', seg: 12, leafYaw: rnd.real(0, 6) });
    p.body.translate(x, yy - 0.03, z);
    b.raw(p.body);
    if (rnd.frac() < 0.75) {
      const f = faceGeo({ r, shape: 'rund', kind: rnd.pick(['lachen', 'grinsen', 'staunen']) });
      f.rotateY(-Math.PI / 2 + rnd.real(-0.5, 0.5));
      f.translate(x, yy - 0.03, z);
      g.raw(f);
      glows.push([x, yy + r * 0.9, z + r * 0.8, 0.8]);
    }
  }
  b.flush(level);
  g.flush(level, { material: 'glow', castShadow: false });
  glowPoints(level, glows, { color: 0xff9a2a, size: 1.5, opacity: 0.45, pulse: 0.9 });
}

/** Weicher Boden des Labyrinths (Erde mit Strohhäcksel) über x0..x1 × zA..zB knapp über y (Raster 0,5 m). */
export function mazeFloor(level, x0, x1, zA, zB, y, o = {}) {
  if (!level.view) return;
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB), cell = o.cell ?? 0.5;
  const nx = Math.ceil((x1 - x0) / cell), nz = Math.ceil((z0 - z1) / cell);
  const pos = [], col = [];
  const dirt = new THREE.Color(o.dirt ?? 0x6a4a3a), straw = new THREE.Color(o.straw ?? 0xd8b060), moss = new THREE.Color(o.moss ?? 0x4a6a40);
  const c = new THREE.Color();
  const hsh = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const xa = x0 + i * cell, xb = Math.min(x1, xa + cell), za = z0 - j * cell, zb = Math.max(z1, za - cell);
      const r = hsh(i, j);
      c.copy(dirt).lerp(straw, r > 0.72 ? 0.55 : r * 0.25);
      if (r < 0.08) c.lerp(moss, 0.6);
      c.multiplyScalar(0.92 + 0.12 * hsh(j, i));
      for (const [px, pz] of [[xa, za], [xb, za], [xb, zb], [xa, za], [xb, zb], [xa, zb]]) { pos.push(px, y + 0.02, pz); col.push(c.r, c.g, c.b); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  addStatic(level, g, { castShadow: false });
}

// =====================================================================================================================
// H-Kapitän: Riesenkürbis, Scheune, Kürbisstand, schwebende Felsen
// =====================================================================================================================

/**
 * Riesenkürbis (Kulisse + Kollision): Mitte (x, y, z) am Boden, Radius r ('flach'), Gesicht nach yaw (−π/2 = +Z).
 * Kollision: Schulter-Zylinder (r·0,95 bis 60 % der Höhe) und Deckel-Zylinder (Radius top.r, Oberseite top.y) zum
 * Draufstehen. Liefert { top } (Höhe der Oberseite).
 */
export function giantPumpkin(level, x, y, z, r, o = {}) {
  const shape = o.shape ?? 'flach';
  const p = pumpkinGeo({ r, shape, color: o.color ?? 'orange', seg: 40, leafYaw: 1.2 });
  const topY = o.top ?? y + p.h * 0.86;
  level.world.add({ type: 'cyl', x, z, r: r * 1.0, y0: y, y1: y + p.h * 0.62, tag: 'riesenkuerbis' });
  level.world.add({ type: 'cyl', x, z, r: o.topR ?? r * 0.7, y0: y, y1: topY, tag: 'riesenkuerbis' });
  if (!level.view) return { top: topY };
  p.body.translate(x, y, z);
  addStatic(level, p.body);
  const f = faceGeo({ r, shape, kind: o.face ?? 'lachen' });
  f.rotateY(o.yaw ?? -Math.PI / 2);
  f.translate(x, y, z);
  addStatic(level, f, { material: 'glow', castShadow: false });
  const fx = Math.cos(o.yaw ?? -Math.PI / 2), fz = -Math.sin(o.yaw ?? -Math.PI / 2);
  glowPoints(level, [[x + fx * r * 1.05, y + p.h * 0.5, z + fz * r * 1.05, 1]], { color: 0xff9a2a, size: r * 3.2, opacity: 0.5, pulse: 0.6 });
  // Ranken mit Blättern am Fuß
  const b = new Bld();
  const rnd = new Rnd(5);
  for (let i = 0; i < 7; i++) {
    const a = rnd.real(0, TAU), d = r * rnd.real(0.95, 1.25);
    b.sphere(rnd.real(0.25, 0.4), x + Math.cos(a) * d, y + 0.08, z + Math.sin(a) * d, litTop(HWC.leaf, 0.6), { s: [1.4, 0.35, 1], ws: 7, hs: 4, yaw: a });
  }
  b.flush(level);
  return { top: topY };
}

/** Rote Scheune mit weißen Kanten, Heuboden-Fenster (warm leuchtend), Kollision als Quader. Mitte unten (x, y, z). */
export function barn(level, x, y, z, w = 5, d = 4, h = 2.6, o = {}) {
  level.world.add({ type: 'box', min: [x - w / 2, y, z - d / 2], max: [x + w / 2, y + h + 1.6, z + d / 2], tag: 'scheune' });
  if (!level.view) return;
  const b = new Bld(), g = new Bld();
  const red = litTop(o.color ?? 0xc8443a, 0.6), white = litTop(0xf4ece0, 0.7), roof = litTop(0x3a2a4a, 0.7);
  b.box(w, h, d, x, y, z, red, { r: 0.05 });
  // Satteldach (Giebel nach vorn): zwei schräge Platten
  const rh = 1.7, half = w / 2 + 0.3, sl = Math.hypot(half, rh);
  const ang = Math.atan2(rh, half);
  for (const s of [-1, 1]) b.box(sl, 0.14, d + 0.5, x + s * half / 2, y + h + rh / 2 - 0.07, z, roof, { rz: -s * ang, r: 0.03, order: 'YXZ' });
  // Giebel-Dreieck vorn und hinten
  const tri = new THREE.Shape(); tri.moveTo(-w / 2, 0); tri.lineTo(w / 2, 0); tri.lineTo(0, rh - 0.05); tri.closePath();
  for (const s of [-1, 1]) b.add(new THREE.ExtrudeGeometry(tri, { depth: 0.1, bevelEnabled: false }), red, { p: [x, y + h, z + s * (d / 2) - 0.05] });
  // weiße Kanten, Tor mit X
  for (const sx of [-1, 1]) b.box(0.14, h, 0.14, x + sx * (w / 2 - 0.02), y, z + d / 2 + 0.02, white, { r: 0.02 });
  const dw = w * 0.42, dh = h * 0.78, zf = z + d / 2 + 0.04;
  b.box(dw, dh, 0.06, x, y, zf, litTop(0xa83a30, 0.6), { r: 0 });
  b.box(dw + 0.16, 0.14, 0.08, x, y + dh, zf + 0.01, white, { r: 0 });
  for (const sx of [-1, 1]) b.box(0.14, dh, 0.08, x + sx * dw / 2, y, zf + 0.01, white, { r: 0 });
  const diag = Math.hypot(dw, dh), da = Math.atan2(dh, dw);
  for (const s of [-1, 1]) b.box(diag - 0.1, 0.11, 0.08, x, y + dh / 2 - 0.055, zf + 0.02, white, { rz: s * da, r: 0 });
  // Heuboden-Fenster (leuchtet), Heu schaut heraus
  g.box(0.9, 0.7, 0.05, x, y + h + 0.25, z + d / 2 + 0.06, 0xffc860, { r: 0 });
  b.box(1.1, 0.12, 0.08, x, y + h + 0.95, z + d / 2 + 0.07, white, { r: 0 });
  b.box(1.1, 0.12, 0.08, x, y + h + 0.13, z + d / 2 + 0.07, white, { r: 0 });
  for (let i = 0; i < 5; i++) b.cone(0.07, 0.28, x - 0.35 + i * 0.17, y + h + 0.18, z + d / 2 + 0.14, 0xf0c860, 4, { rx: 1.2 });
  // Wetterhahn: Kürbis auf dem First
  b.cyl(0.03, 0.03, 0.7, x, y + h + rh - 0.1, z, 0x3a3040, 4);
  const pk = pumpkinGeo({ r: 0.22, seg: 10 });
  pk.body.translate(x, y + h + rh + 0.55, z);
  b.raw(pk.body);
  b.flush(level);
  g.flush(level, { material: 'glow', castShadow: false });
  glowPoints(level, [[x, y + h + 0.6, z + d / 2 + 0.3, 1.2]], { color: 0xffb040, size: 2.2, opacity: 0.5, pulse: 0.3 });
}

/** Kürbisstand (Holztheke mit Dach, Kürbisse, Schild-Brett): Mitte unten (x, y, z), Blick nach +Z. */
export function pumpkinStand(level, x, y, z, o = {}) {
  level.world.add({ type: 'box', min: [x - 1.4, y, z - 0.45], max: [x + 1.4, y + 0.95, z + 0.45], tag: 'stand' });
  if (!level.view) return;
  const b = new Bld(), g = new Bld();
  const wood = litTop(0xb8844a, 0.6), dark = litTop(0x7a4a2a, 0.6);
  b.box(2.8, 0.9, 0.9, x, y, z, wood, { r: 0.04 });
  for (let i = 0; i < 5; i++) b.box(0.05, 0.86, 0.02, x - 1.1 + i * 0.55, y + 0.02, z + 0.46, dark, { r: 0 });
  b.box(3.0, 0.08, 1.05, x, y + 0.9, z, dark, { r: 0.02 });
  for (const sx of [-1, 1]) b.cyl(0.06, 0.06, 2.2, x + sx * 1.35, y, z - 0.35, dark, 6);
  // gestreiftes Dach
  for (let i = 0; i < 6; i++) b.box(0.5, 0.06, 1.3, x - 1.25 + i * 0.5, y + 2.15, z - 0.05, i % 2 ? 0xffffff : 0xff7a2a, { r: 0, rx: 0.22 });
  // Kürbisse auf der Theke
  [[-0.9, 0.24, 'orange', 'lachen'], [-0.2, 0.3, 'gelb', null], [0.55, 0.27, 'orange', 'grinsen'], [1.05, 0.2, 'weiss', null]].forEach(([dx, r, color, face], i) => {
    const p = pumpkinGeo({ r, color, seg: 12, leafYaw: i * 1.7 });
    p.body.translate(x + dx, y + 0.98, z);
    b.raw(p.body);
    if (face) { const f = faceGeo({ r, kind: face }); f.rotateY(-Math.PI / 2); f.translate(x + dx, y + 0.98, z); g.raw(f); }
  });
  b.flush(level);
  g.flush(level, { material: 'glow', castShadow: false });
}

/** Schwebender Felsbrocken unter einer Insel (nur Darstellung): Oberkante y, Grundfläche x0..x1 × zA..zB, Tiefe depth. */
export function floatRock(level, x0, x1, zA, zB, y, depth = 5, o = {}) {
  if (!level.view) return;
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  const rnd = new Rnd(o.seed ?? Math.round(x0 * 13 + z0 * 7) >>> 0);
  const b = new Bld();
  const cols = o.colors ?? [0x5a4a6a, 0x4a3c5c, 0x6a5878, 0x3e3250];
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z0 - z1;
  const n = o.n ?? 4;
  for (let k = 0; k < n; k++) {
    const t = (k + 1) / (n + 1);
    const sw = w * (1 - t * 0.75), sd = d * (1 - t * 0.75), hh = depth / n;
    b.box(sw + rnd.real(-0.3, 0.3), hh + 0.2, sd + rnd.real(-0.3, 0.3), cx + rnd.real(-0.4, 0.4) * t, y - (k + 1) * hh, cz + rnd.real(-0.4, 0.4) * t, litTop(cols[k % cols.length], 0.75), { r: 0.35, seg: 2, yaw: rnd.real(-0.2, 0.2) });
  }
  // Wurzeln, die unten heraushängen
  for (let i = 0; i < (o.roots ?? 5); i++) {
    const a = rnd.real(0, TAU), rr = Math.min(w, d) * 0.25;
    b.cyl(0.03, 0.07, rnd.real(0.8, 1.8), cx + Math.cos(a) * rr, y - depth * 0.6 - 1.2, cz + Math.sin(a) * rr, 0x5a3a2a, 4, { rz: rnd.real(-0.3, 0.3) });
  }
  b.flush(level, { castShadow: false });
}

/** Kürbisse (mit leuchtenden Gesichtern) als statische Zier: list [[x, y, z, r, face?, color?, yaw?], …]. */
export function pumpkinsOn(level, list) {
  if (!level.view) return;
  const b = new Bld(), g = new Bld(), pts = [];
  list.forEach(([x, y, z, r, face, color = 'orange', yaw = -Math.PI / 2], i) => {
    const p = pumpkinGeo({ r, color, shape: i % 3 === 0 ? 'flach' : i % 3 === 1 ? 'rund' : 'dick', seg: r > 0.5 ? 18 : 12, leafYaw: i * 1.3 });
    p.body.translate(x, y, z);
    b.raw(p.body);
    if (face) {
      const f = faceGeo({ r, shape: i % 3 === 0 ? 'flach' : i % 3 === 1 ? 'rund' : 'dick', kind: face });
      f.rotateY(yaw); f.translate(x, y, z); g.raw(f);
      pts.push([x + Math.cos(yaw) * r, y + r * 0.8, z - Math.sin(yaw) * r, r * 2]);
    }
  });
  b.flush(level);
  g.flush(level, { material: 'glow', castShadow: false });
  glowPoints(level, pts, { color: 0xff9a2a, size: 1.2, opacity: 0.5, pulse: 1.0 });
}

/** Kürbisbeet: n Kürbisse verstreut in w × d um (x, z) (Boden y), meidet avoid [[x, z, r]] – Liste für pumpkinsOn. */
export function pumpkinPatch(x, y, z, w, d, n, o = {}) {
  const rnd = new Rnd(o.seed ?? Math.round(Math.abs(x * 31 + z * 17)) + n);
  const out = [];
  for (let tries = 0; tries < n * 30 && out.length < n; tries++) {
    const px = x + rnd.real(-w / 2, w / 2), pz = z + rnd.real(-d / 2, d / 2);
    if (out.some((q) => Math.hypot(q[0] - px, q[2] - pz) < 0.85)) continue;
    if ((o.avoid ?? []).some((a) => Math.hypot(a[0] - px, a[1] - pz) < (a[2] ?? 1.5))) continue;
    const r = rnd.real(o.min ?? 0.2, o.max ?? 0.42);
    const face = rnd.frac() < (o.faces ?? 0.5) ? rnd.pick(['lachen', 'grinsen', 'staunen']) : null;
    const color = rnd.frac() < 0.78 ? 'orange' : rnd.pick(['gelb', 'weiss', 'gruen']);
    out.push([px, y, pz, r, face, color, -Math.PI / 2 + rnd.real(-0.6, 0.6)]);
  }
  return out;
}

/** Kürbislaternen auf krummen Holzpfählen (leuchtendes Gesicht, warmer Schein): list [[x, y, z, höhe?], …]. Kollision: Pfahl. */
export function lanternPosts(level, list) {
  for (const [x, y, z] of list) level.world.add({ type: 'cyl', x, z, r: 0.12, y0: y, y1: y + 1.4, tag: 'pfahl' });
  if (!level.view) return;
  const b = new Bld(), g = new Bld(), pts = [];
  list.forEach(([x, y, z, h = 1.6], i) => {
    b.cyl(0.05, 0.08, h, x, y, z, litTop(0x6a4630, 0.6), 6, { rz: (i % 2 ? 1 : -1) * 0.05 });
    b.box(0.5, 0.06, 0.06, x + 0.18, y + h - 0.12, z, litTop(0x6a4630, 0.6), { r: 0 });
    b.cyl(0.012, 0.012, 0.22, x + 0.38, y + h - 0.32, z, 0x2a2430, 4);
    const p = pumpkinGeo({ r: 0.2, seg: 10, leafYaw: i });
    p.body.translate(x + 0.38, y + h - 0.68, z);
    b.raw(p.body);
    const f = faceGeo({ r: 0.2, kind: i % 2 ? 'grinsen' : 'lachen' });
    f.rotateY(-Math.PI / 2); f.translate(x + 0.38, y + h - 0.68, z);
    g.raw(f);
    pts.push([x + 0.38, y + h - 0.5, z + 0.15, 1]);
  });
  b.flush(level);
  g.flush(level, { material: 'glow', castShadow: false });
  glowPoints(level, pts, { color: 0xffa040, size: 2.4, opacity: 0.55, pulse: 0.8 });
}

/** Lose Strohballen (eckig/rund, mit Kollision): list [[x, y, z, 'eckig' | 'rund', yaw?], …]. */
export function bales(level, list) {
  for (const [x, y, z, form] of list) {
    if (form === 'rund') level.world.add({ type: 'cyl', x, z, r: 0.6, y0: y, y1: y + 1.0, tag: 'stroh' });
    else level.world.add({ type: 'box', min: [x - 0.6, y, z - 0.4], max: [x + 0.6, y + 0.7, z + 0.4], tag: 'stroh' });
  }
  if (!level.view) return;
  const b = new Bld();
  list.forEach(([x, y, z, form, yaw = 0], i) => {
    const col = litTop(STRAW[i % 4], 0.6);
    if (form === 'rund') {
      b.cyl(0.6, 0.6, 1.0, x, y, z, col, 14, { yaw });
      for (const t of [0.25, 0.5, 0.75]) b.cyl(0.615, 0.615, 0.04, x, y + t * 1.0 - 0.02, z, 0x9a6a30, 14, { yaw });
    } else {
      b.box(1.2, 0.7, 0.8, x, y, z, col, { r: 0, yaw });
      for (const sgn of [-1, 1]) b.box(0.05, 0.71, 0.82, x + Math.cos(yaw) * sgn * 0.3, y - 0.005, z - Math.sin(yaw) * sgn * 0.3, 0x9a6a30, { r: 0, yaw });
    }
  });
  b.flush(level);
}

/** Maisstauden (sparsam: Stängel + vier Blätter + Kolben): list [[x, y, z, höhe?], …]. */
export function cornStalks(level, list) {
  if (!level.view) return;
  const b = new Bld();
  list.forEach(([x, y, z, h = 2.0], i) => {
    const lean = (i % 3 - 1) * 0.06;
    b.cyl(0.03, 0.05, h, x, y, z, gradY(0x7a8a3a, 0xc8b860, y, y + h), 5, { rz: lean });
    for (let k = 0; k < 4; k++) {
      const a = i * 1.7 + k * 1.9, yy = y + h * (0.3 + k * 0.16);
      b.box(0.7, 0.03, 0.14, x + Math.cos(a) * 0.3, yy, z - Math.sin(a) * 0.3, gradY(0x6a8a3a, 0xd8c070, yy - 0.2, yy + 0.4), { r: 0, yaw: a, rz: -0.5 });
    }
    b.cyl(0.07, 0.05, 0.3, x + 0.08, y + h * 0.55, z, 0xf0c840, 5, { rz: -0.4 });
    b.cone(0.05, 0.4, x, y + h, z, 0xd8b860, 4);
  });
  b.flush(level);
}

// =====================================================================================================================
// Szenen (level-lokal, rein darstellend)
// =====================================================================================================================

/**
 * Kürbis, der zurückwinkt: ein Kürbis mit Blatt-Ärmchen; kommt eine Figur näher als near m, winkt er (Ärmchen schwingt,
 * Kürbis hüpft leicht, Gesicht strahlt) – danach ruht er wieder. pos = Fußpunkt, yaw = Blickrichtung (−π/2 = +Z).
 * Liefert { waves } (Zahl der Wink-Folgen, für Tests).
 */
export function wavingPumpkin(level, pos, o = {}) {
  const st = { waves: 0, t: 0, on: false };
  level.named?.set(o.id ?? 'winkekuerbis', { info: () => ({ waves: st.waves, on: st.on }) });
  const near = o.near ?? 2.6;
  level.onStep((dt) => {
    const p = level.player;
    if (!p) return;
    const d = Math.hypot(p.pos.x - pos[0], p.pos.z - pos[2]);
    if (d < near && !st.on && st.t <= 0) { st.on = true; st.waves++; st.t = 2.4; level.sfx?.('bounce'); }
    if (st.t > 0) st.t -= dt; else st.on = false;
    if (d > near + 1.5 && st.t <= 0) st.t = 0;
  });
  if (!level.view) return st;
  const r = o.r ?? 0.42, yaw = o.yaw ?? -Math.PI / 2;
  const root = new THREE.Group();
  root.position.set(pos[0], pos[1], pos[2]);
  const pk = pumpkinGeo({ r, shape: 'rund', seg: 18, leafYaw: 0.5 });
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 });
  const body = new THREE.Mesh(pk.body, mat);
  body.castShadow = true;
  const face = new THREE.Mesh(faceGeo({ r, kind: 'lachen' }), new THREE.MeshBasicMaterial({ vertexColors: true }));
  const bob = new THREE.Group();
  bob.rotation.y = yaw;
  bob.add(body, face);
  // Ärmchen: Ranke mit einem Blatt als Händchen (seitlich, an der Schulter)
  const arm = new THREE.Group();
  arm.position.set(0, r * 0.95, r * 0.95);
  const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.42, 5), new THREE.MeshStandardMaterial({ color: 0x4a8a2a, roughness: 0.6 }));
  vine.position.y = 0.2;
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 5), new THREE.MeshStandardMaterial({ color: 0x5ec83a, roughness: 0.5 }));
  hand.scale.set(1.3, 1, 0.45);
  hand.position.y = 0.44;
  arm.add(vine, hand);
  arm.rotation.x = -0.5;
  bob.add(arm);
  root.add(bob);
  addObject(level, root);
  const hold = {};
  let k = 0, t = 0;
  level.view.onFrame((dt) => {
    const d = visDt(level, hold, dt);
    t += d;
    k += ((st.on ? 1 : 0) - k) * Math.min(1, d * 6);
    arm.rotation.x = -0.5 - k * (1.1 + Math.sin(t * 11) * 0.55);
    bob.position.y = k * Math.abs(Math.sin(t * 5.5)) * 0.16;
    bob.rotation.z = Math.sin(t * 2) * 0.03 + k * Math.sin(t * 5.5) * 0.08;
    face.scale.setScalar(1 + k * 0.08);
  });
  return st;
}
