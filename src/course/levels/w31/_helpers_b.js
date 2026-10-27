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
  const p = pumpkinGeo({ r, shape, color: o.color ?? 'orange', seg: 40, leaf: false });
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
  for (let i = 0; i < 6; i++) b.box(0.5, 0.06, 1.3, x - 1.25 + i * 0.5, y + 2.15, z - 0.05, i % 2 ? 0xfff2d8 : 0xff8a2a, { r: 0, rx: 0.22 });
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
    b.cyl(0.03, 0.05, h, x, y, z, gradY(0x7a8a3a, 0xc8b860, -h / 2, h / 2), 5, { rz: lean });
    for (let k = 0; k < 4; k++) {
      const a = i * 1.7 + k * 1.9, yy = y + h * (0.3 + k * 0.16);
      b.box(0.7, 0.03, 0.14, x + Math.cos(a) * 0.3, yy, z - Math.sin(a) * 0.3, k % 2 ? 0x8aa048 : 0xa8b058, { r: 0, yaw: a, rz: -0.5 });
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

// =====================================================================================================================
// H-3 Nebelfriedhof: Tor, Kapelle, Glockenturm, Gruft-Durchfahrt, Klappergarten, Felsnadel
// =====================================================================================================================

const STONE = 0x8a86a0, STONE_HI = 0xb8b4cc, STONE_LO = 0x4e4a62, MOSS = 0x5a8a5a;

/** Bruchstein-Färbung (Fugenraster, moosige Unterkante ab y0) für Mauern – Bld-Farbe ({ v }); y0 in Teil-Koordinaten (Bld
 *  färbt vor dem Verschieben: ein Quader der Höhe h reicht von −h/2 bis h/2). */
const masonry = (y0, base = STONE) => {
  const M = new THREE.Color(base), H = new THREE.Color(STONE_HI), D = new THREE.Color(STONE_LO), G = new THREE.Color(MOSS), c = new THREE.Color();
  return { v: (x, y, z, nx, ny) => {
    const row = Math.floor((y + 40) / 0.5), u = (Math.abs(nx) > 0.5 ? z : x) + (row % 2) * 0.4;
    c.copy(M);
    if (ny > 0.5) c.lerp(H, 0.4);
    else if (ny < -0.5) c.lerp(D, 0.5);
    const j = Math.abs(((y + 40) / 0.5) % 1 - 0.5) > 0.42 || Math.abs((u / 0.8) % 1) < 0.07;
    if (j && ny < 0.5) c.lerp(D, 0.55);
    if (y < y0 + 0.5 && ny < 0.5) c.lerp(G, 0.45 * (1 - (y - y0) / 0.5));
    return c;
  } };
};

/**
 * Friedhofstor: zwei Steinpfeiler (Kollision) mit Kürbislaternen obendrauf, schmiedeeiserner Bogen mit Fledermaus in der
 * Mitte, Eisenzaun links und rechts bis zur Breite fence. Mitte (x, y, z), Durchgang width.
 */
export function cemeteryGate(level, x, y, z, width = 3.2, fence = 8) {
  const px = [x - width / 2 - 0.4, x + width / 2 + 0.4];
  for (const cx of px) level.world.add({ type: 'box', min: [cx - 0.4, y, z - 0.4], max: [cx + 0.4, y + 2.4, z + 0.4], tag: 'tor' });
  if (!level.view) return;
  const b = new Bld(), g = new Bld(), dark = 0x2a2438;
  for (const cx of px) {
    b.box(0.8, 2.3, 0.8, cx, y, z, masonry(-1.15), { r: 0.04 });
    b.box(1.0, 0.18, 1.0, cx, y + 2.3, z, litTop(STONE_HI, 0.6), { r: 0.04 });
    const p = pumpkinGeo({ r: 0.32, seg: 14, leafYaw: cx });
    p.body.translate(cx, y + 2.48, z);
    b.raw(p.body);
    const f = faceGeo({ r: 0.32, kind: cx < x ? 'lachen' : 'grinsen' });
    f.rotateY(-Math.PI / 2); f.translate(cx, y + 2.48, z);
    g.raw(f);
  }
  // Bogen aus Eisen mit Spitzen, kleine Fledermaus oben
  const R = width / 2 + 0.4;
  b.torus(R, 0.06, x, y + 2.4, z, dark, { arc: Math.PI, ts: 20 });
  b.torus(R - 0.25, 0.04, x, y + 2.4, z, dark, { arc: Math.PI, ts: 20 });
  for (let i = 1; i < 8; i++) { const a = (i / 8) * Math.PI; b.cone(0.05, 0.22, x + Math.cos(a) * (R + 0.05), y + 2.4 + Math.sin(a) * (R + 0.05), z, 0xd8b04a, 4); }
  const bat = new THREE.Shape();
  bat.moveTo(0, 0.12); bat.lineTo(0.12, 0.2); bat.lineTo(0.2, 0.05); bat.lineTo(0.45, 0.16); bat.lineTo(0.32, -0.05); bat.lineTo(0.18, 0.02); bat.lineTo(0, -0.12);
  bat.lineTo(-0.18, 0.02); bat.lineTo(-0.32, -0.05); bat.lineTo(-0.45, 0.16); bat.lineTo(-0.2, 0.05); bat.lineTo(-0.12, 0.2); bat.closePath();
  b.add(new THREE.ExtrudeGeometry(bat, { depth: 0.05, bevelEnabled: false }), 0x3a2a4a, { p: [x, y + 2.4 + R + 0.1, z], s: 1.3 });
  // Zaun links/rechts
  for (const sgn of [-1, 1]) {
    const a = x + sgn * (width / 2 + 0.85), e = x + sgn * fence, n = Math.max(1, Math.round(Math.abs(e - a) / 0.32));
    for (let i = 0; i <= n; i++) {
      const fx = a + (e - a) * (i / n), post = i % 6 === 0;
      b.cyl(post ? 0.05 : 0.025, post ? 0.05 : 0.025, 1.2 + (post ? 0.15 : 0), fx, y, z, dark, 4);
      b.cone(post ? 0.09 : 0.05, 0.14, fx, y + 1.2 + (post ? 0.15 : 0), z, post ? 0xd8b04a : dark, 4);
    }
    for (const yy of [0.28, 1.05]) b.box(Math.abs(e - a), 0.05, 0.05, (a + e) / 2, y + yy, z, dark, { r: 0 });
  }
  b.flush(level);
  g.flush(level, { material: 'glow', castShadow: false });
  glowPoints(level, px.map((cx) => [cx, y + 2.75, z + 0.3, 1]), { color: 0xff9a2a, size: 2.6, opacity: 0.55, pulse: 0.7 });
}

/**
 * Kapelle (Kulisse + Kollision): Grundfläche x0..x1 × zA..zB ab y, Wandhöhe h, Satteldach (First entlang z), Tür vorn
 * (+Z) mit warmem Licht, Spitzbogenfenster an den Seiten, Rosette über der Tür.
 */
export function chapel(level, x0, x1, zA, zB, y, h = 4, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB), w = x1 - x0, d = z0 - z1, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  level.world.add({ type: 'box', min: [x0, y, z1], max: [x1, y + h, z0], tag: 'kapelle' });
  if (!level.view) return;
  const b = new Bld(), g = new Bld();
  b.box(w, h, d, cx, y, cz, masonry(-h / 2), { r: 0.05 });
  // Satteldach (First entlang z)
  const rh = o.roof ?? 2.6, half = w / 2 + 0.35, sl = Math.hypot(half, rh), ang = Math.atan2(rh, half);
  const roof = litTop(o.roofColor ?? 0x4a3a7a, 0.6);
  for (const s of [-1, 1]) b.box(sl, 0.18, d + 0.6, cx + s * half / 2, y + h + rh / 2 - 0.09, cz, roof, { rz: -s * ang, r: 0.03, order: 'YXZ' });
  const tri = new THREE.Shape(); tri.moveTo(-w / 2, 0); tri.lineTo(w / 2, 0); tri.lineTo(0, rh - 0.08); tri.closePath();
  for (const s of [-1, 1]) b.add(new THREE.ExtrudeGeometry(tri, { depth: 0.2, bevelEnabled: false }), masonry(-9, STONE_HI), { p: [cx, y + h, cz + s * (d / 2) - 0.1] });
  // Kreuz auf dem Giebel
  b.box(0.12, 0.9, 0.12, cx, y + h + rh - 0.1, z0 - 0.3, 0x3a3048, { r: 0 });
  b.box(0.5, 0.1, 0.1, cx, y + h + rh + 0.45, z0 - 0.3, 0x3a3048, { r: 0 });
  // Tür (leuchtend, Rundbogen) mit Rahmen
  const dx = o.door ?? cx, zf = z0 + 0.03;
  g.box(1.3, 2.0, 0.05, dx, y, zf, 0xffc060, { r: 0 });
  g.cyl(0.65, 0.65, 0.05, dx, y + 2.0, zf, 0xffd080, 14, { rx: Math.PI / 2 });
  b.box(1.6, 0.18, 0.12, dx, y + 2.65, zf + 0.02, litTop(STONE_HI, 0.6), { r: 0.02 });
  for (const s of [-1, 1]) b.box(0.18, 2.6, 0.14, dx + s * 0.75, y, zf + 0.02, litTop(STONE_HI, 0.6), { r: 0.02 });
  // Rosette über der Tür
  g.cyl(0.55, 0.55, 0.05, cx, y + h + 0.9, zf, 0xff9ad8, 16, { rx: Math.PI / 2 });
  b.torus(0.6, 0.08, cx, y + h + 0.9, zf + 0.03, STONE_HI, { ts: 18 });
  for (let k = 0; k < 4; k++) b.box(1.1, 0.06, 0.04, cx, y + h + 0.87, zf + 0.04, STONE_HI, { r: 0, rz: (k / 4) * Math.PI });
  // Spitzbogenfenster an den Seiten (warm, bunt)
  const wins = [0xffc060, 0x9ad8ff, 0xff9ad8, 0xb8ff8a];
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
    const wz = z1 + d * (k + 1) / 4, xf = s > 0 ? x1 + 0.03 : x0 - 0.03, col = wins[(k + (s > 0 ? 1 : 0)) % 4];
    g.box(0.05, 1.3, 0.7, xf, y + 1.2, wz, col, { r: 0 });
    g.cyl(0.35, 0.35, 0.05, xf, y + 2.5, wz, col, 10, { rz: Math.PI / 2 });
  }
  b.flush(level);
  g.flush(level, { material: 'glow', castShadow: false });
  glowPoints(level, [[dx, y + 1.2, zf + 0.5, 1.6], [cx, y + h + 0.9, zf + 0.3, 0.8]], { color: 0xffb050, size: 2.6, opacity: 0.55, pulse: 0.4 });
}

/** Glockenturm (Kollision bis zur Plattform top): Grundfläche x0..x1 × zA..zB ab y; oben Ecksteine, Holzgerüst mit Glocke. */
export function bellTower(level, x0, x1, zA, zB, y, top) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB), w = x1 - x0, d = z0 - z1, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  level.world.add({ type: 'box', min: [x0, y, z1], max: [x1, top, z0], tag: 'turm' });
  if (!level.view) return;
  const b = new Bld(), g = new Bld();
  b.box(w, top - y, d, cx, y, cz, masonry(-(top - y) / 2), { r: 0.04 });
  b.box(w + 0.3, 0.2, d + 0.3, cx, top - 0.2, cz, litTop(STONE_HI, 0.6), { r: 0.04 });
  for (const [ex, ez] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) b.box(0.35, 0.45, 0.35, ex, top, ez, masonry(-9), { r: 0.03 });
  // Glocke im Holzrahmen (hinten, ohne Kollision)
  const fz = z1 + 0.35;
  for (const s of [-1, 1]) b.box(0.12, 1.5, 0.12, cx + s * 0.6, top, fz, litTop(0x7a4a2a, 0.6), { r: 0 });
  b.box(1.4, 0.14, 0.14, cx, top + 1.5, fz, litTop(0x7a4a2a, 0.6), { r: 0 });
  b.add(new THREE.LatheGeometry([[0, 0], [0.38, 0.02], [0.34, 0.12], [0.26, 0.4], [0.22, 0.62], [0.1, 0.7], [0, 0.72]].map(([r, hh]) => new THREE.Vector2(r, hh)), 14), litTop(0xffc83a, 0.55), { p: [cx, top + 0.72, fz] });
  // Fensterschlitze (warm)
  for (const k of [0.35, 0.65]) g.box(0.25, 0.8, 0.05, cx, y + (top - y) * k, z0 + 0.03, 0xffc060, { r: 0 });
  b.flush(level);
  g.flush(level, { material: 'glow', castShadow: false });
}

/**
 * Gruft-Durchfahrt über einem Bach: hohe Mauern (Kollision) links und rechts des Bachs von zA bis zB – sie decken die
 * Ufer ab (zu Fuß kein Weg vorbei, nur mit dem Floß hindurch). center(z) → x der Bachmitte, half = halbe Bachbreite + Rand.
 * Mauern von xL bzw. bis xR, Höhe h ab y; Rundbogen über Ein- und Ausfahrt mit Kürbis, Kerzen an den Innenwänden.
 */
export function cryptPassage(level, zA, zB, center, half, xL, xR, y, h, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB), step = o.step ?? 1;
  const slices = [];
  for (let za = z0; za > z1 + 1e-6; za -= step) {
    const zb = Math.max(z1, za - step);
    const cA = center(za), cB = center(zb);
    const left = Math.min(cA, cB) - half, right = Math.max(cA, cB) + half;
    slices.push([za, zb, left, right]);
    level.world.add({ type: 'box', min: [xL, y, zb], max: [left, y + h, za], tag: 'gruftmauer' });
    level.world.add({ type: 'box', min: [right, y, zb], max: [xR, y + h, za], tag: 'gruftmauer' });
  }
  if (!level.view) return;
  const b = new Bld(), g = new Bld(), pts = [];
  for (const [za, zb, left, right] of slices) {
    const zc = (za + zb) / 2, dz = za - zb;
    b.box(left - xL, h, dz, (xL + left) / 2, y, zc, masonry(-h / 2 + (o.ground ?? 0)), { r: 0 });
    b.box(xR - right, h, dz, (right + xR) / 2, y, zc, masonry(-h / 2 + (o.ground ?? 0)), { r: 0 });
  }
  for (const zz of [z0, z1]) {
    const c = center(zz), R = half + 0.2;
    b.torus(R, 0.35, c, y + h - 0.2, zz, litTop(STONE_HI, 0.6), { arc: Math.PI, ts: 18, rs: 6 });
    const p = pumpkinGeo({ r: 0.45, seg: 14, leafYaw: zz });
    p.body.translate(c, y + h - 0.2 + R + 0.2, zz);
    b.raw(p.body);
    const f = faceGeo({ r: 0.45, kind: 'grinsen' }); f.rotateY(-Math.PI / 2); f.translate(c, y + h - 0.2 + R + 0.2, zz);
    g.raw(f);
    pts.push([c, y + h + R + 0.4, zz + 0.45, 1.4]);
  }
  for (let k = 0; k < slices.length; k += 2) {
    const [za, zb, left, right] = slices[k], zc = (za + zb) / 2;
    for (const [wx, s] of [[left, 1], [right, -1]]) {
      g.cyl(0.05, 0.05, 0.22, wx + s * 0.06, y + 1.5, zc, 0xfff0c0, 6);
      pts.push([wx + s * 0.15, y + 1.8, zc, 0.6]);
    }
  }
  b.flush(level);
  g.flush(level, { material: 'glow', castShadow: false });
  glowPoints(level, pts, { color: 0xffb860, size: 1.6, opacity: 0.6, pulse: 1.4 });
}

/**
 * Klappergarten: niedrige Mauer (0,75 m, Kollision) mit Eisenspitzen um x0..x1 × zA..zB ab y, Eingang gate = { side: 'n' |
 * 's' | 'w' | 'e', from, to } (offener Abschnitt der Seite), Knochenhäufchen als Zier.
 */
export function boneGarden(level, x0, x1, zA, zB, y, gate) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB), t = 0.4, h = 0.75;
  const segs = [];
  const side = (s, a0, a1) => {
    if (gate?.side === s) { segs.push([s, a0, Math.min(gate.from, gate.to)]); segs.push([s, Math.max(gate.from, gate.to), a1]); }
    else segs.push([s, a0, a1]);
  };
  side('n', x0, x1); side('s', x0, x1); side('w', z1, z0); side('e', z1, z0);
  const rects = segs.filter(([, a, b2]) => b2 - a > 0.05).map(([s, a, b2]) => (s === 'n' ? [a, b2, z0 - t, z0] : s === 's' ? [a, b2, z1, z1 + t] : s === 'w' ? [x0, x0 + t, a, b2] : [x1 - t, x1, a, b2]));
  for (const [ax, bx, az, bz] of rects) level.world.add({ type: 'box', min: [ax, y, az], max: [bx, y + h, bz], tag: 'gartenmauer' });
  if (!level.view) return;
  const b = new Bld(), dark = 0x2a2438;
  for (const [ax, bx, az, bz] of rects) {
    b.box(bx - ax, h, bz - az, (ax + bx) / 2, y, (az + bz) / 2, masonry(-h / 2), { r: 0.03 });
    const along = bx - ax > bz - az, L0 = along ? bx - ax : bz - az, n = Math.max(1, Math.round(L0 / 0.35));
    for (let i = 0; i <= n; i++) {
      const u = i / n, px = along ? ax + (bx - ax) * u : (ax + bx) / 2, pz = along ? (az + bz) / 2 : az + (bz - az) * u;
      b.cyl(0.022, 0.022, 0.55, px, y + h, pz, dark, 4);
      b.cone(0.045, 0.13, px, y + h + 0.55, pz, i % 4 === 0 ? 0xd8b04a : dark, 4);
    }
  }
  // Knochenhäufchen (Zier) in den Ecken
  const bone = litTop(0xfff4e0, 0.7);
  for (const [bxp, bzp] of [[x0 + 1.0, z1 + 1.0], [x1 - 1.2, z0 - 1.0], [x0 + 1.2, z0 - 1.3]]) {
    for (let k = 0; k < 4; k++) b.cyl(0.04, 0.04, 0.55, bxp + (k % 2) * 0.2, y + 0.06 + k * 0.05, bzp + (k > 1 ? 0.15 : 0), bone, 5, { rz: Math.PI / 2, yaw: k * 0.9 });
    b.sphere(0.16, bxp + 0.1, y + 0.3, bzp + 0.1, bone, { ws: 8, hs: 6 });
  }
  b.flush(level);
}

/** Felsnadel aus dem Abgrund (Kollision bis top): Mitte (x, z), Breite w, von bottom bis top, mit Moos obenauf. */
export function rockNeedle(level, x, z, top, w = 1.6, bottom = top - 8) {
  level.world.add({ type: 'box', min: [x - w / 2, bottom, z - w / 2], max: [x + w / 2, top, z + w / 2], tag: 'felsnadel' });
  if (!level.view) return;
  const b = new Bld();
  const n = 4, hh = (top - bottom) / n;
  for (let k = 0; k < n; k++) {
    const s = w * (1 - k * 0.16);
    b.box(s, hh + 0.05, s, x + (k % 2 ? 0.08 : -0.06), top - (k + 1) * hh, z + (k % 2 ? -0.05 : 0.07), litTop([0x6a6688, 0x5a5678, 0x4e4a6a, 0x44405e][k], 0.7), { r: 0.12 });
  }
  b.box(w + 0.2, 0.18, w + 0.2, x, top - 0.12, z, litTop(MOSS, 0.6), { r: 0.08 });
  b.flush(level);
}

/** Text-Sprite (Canvas) – z. B. „Hihi!“ über einem Geist. */
function textSprite(text, color = '#ffffff', size = 0.9) {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 128;
  const g = cv.getContext('2d');
  g.font = 'bold 64px "Trebuchet MS", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 12; g.strokeStyle = 'rgba(40,20,70,0.85)'; g.strokeText(text, 128, 64);
  g.fillStyle = color; g.fillText(text, 128, 64);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  sp.scale.set(size * 2, size, 1);
  sp.renderOrder = 6;
  return sp;
}

/**
 * Kichernder Geist: ein kleiner Halloween-Geist schaut neben einem Grabstein hervor (pos) und schwebt; kommt eine Figur
 * näher als near m, kichert er („Hihi!“, Geister-Klang) und huscht hinter den Grabstein (hide), wo er verschwindet. Ist
 * niemand mehr in der Nähe (far m), kommt er nach einer Weile wieder hervor. Liefert { giggles }.
 */
export function gigglingGhost(level, pos, hide, o = {}) {
  const st = { giggles: 0, k: 0, want: 0, t: 0 };
  level.named?.set(o.id ?? 'kichergeist', { info: () => ({ giggles: st.giggles, hidden: st.k > 0.95 }) });
  const near = o.near ?? 5.5, far = o.far ?? 9;
  level.onStep((dt) => {
    const p = level.player;
    if (!p) return;
    const d = Math.hypot(p.pos.x - pos[0], p.pos.z - pos[2]);
    if (st.want === 0 && d < near) { st.want = 1; st.giggles++; st.t = 0; level.sfx?.('ghost'); }
    else if (st.want === 1 && d > far) { st.t += dt; if (st.t > 2.5) st.want = 0; }
    st.k += (st.want - st.k) * Math.min(1, dt * 2.2);
  });
  if (!level.view) return st;
  const root = new THREE.Group();
  const model = hasModel('kreisgeist_halloween') ? getModel('kreisgeist_halloween') : null;
  if (model) { model.root.scale.setScalar(o.scale ?? 1.1); root.add(model.root); }
  const hihi = textSprite('Hihi!', '#f4ecff', 0.7);
  hihi.position.set(0, 1.6, 0);
  root.add(hihi);
  addObject(level, root);
  const hold = {};
  let t = 0;
  level.view.onFrame((dt) => {
    const d = visDt(level, hold, dt);
    t += d;
    const k = st.k, e = k * k * (3 - 2 * k);
    const x = pos[0] + (hide[0] - pos[0]) * e, z = pos[2] + (hide[2] - pos[2]) * e;
    const y = pos[1] + Math.sin(t * 2.2) * 0.12 + (hide[1] - pos[1]) * e;
    root.position.set(x, y, z);
    root.rotation.y = -Math.PI / 2 + Math.sin(t * 1.3) * 0.25 + e * 1.4;
    root.scale.setScalar(Math.max(0.05, 1 - e * 0.65));
    root.visible = e < 0.97;
    hihi.visible = st.want === 1 && e < 0.9;
    hihi.position.y = 1.5 + e * 0.6;
    hihi.material.opacity = 1 - e;
    model?.update?.(d, { anim: e > 0.05 ? 'peek' : 'circle' });
  });
  return st;
}

/**
 * Krümel mit Laterne am Ufer: jubelt (cheer), sobald eine Figur näher als near m ist, sonst steht er da und lässt die
 * Laterne pendeln; trägt den Mini-Vampirumhang der Halloween-Verkleidung. pos = Fußpunkt, yaw = Blickrichtung.
 */
export function kruemelCameo(level, pos, yaw = -Math.PI / 2, o = {}) {
  const st = { cheers: 0, on: false };
  level.named?.set(o.id ?? 'kruemel_ufer', { info: () => ({ cheers: st.cheers, on: st.on }) });
  const near = o.near ?? 7;
  level.onStep(() => {
    const p = level.player;
    if (!p) return;
    const on = Math.hypot(p.pos.x - pos[0], p.pos.z - pos[2]) < near;
    if (on && !st.on) st.cheers++;
    st.on = on;
  });
  if (!level.view || !hasModel('kruemel')) return st;
  const root = new THREE.Group();
  root.position.set(pos[0], pos[1], pos[2]);
  root.rotation.y = yaw;
  const m = getModel('kruemel');
  m.root.scale.setScalar(1.35);
  m.root.traverse((q) => { if (q.isMesh) q.castShadow = false; });
  root.add(m.root);
  // Laterne in der Pfote (pendelt), warmer Schein
  const lant = new THREE.Group();
  const lp = lanternParts(0.9);
  lant.add(new THREE.Mesh(lp.body, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.3 })), new THREE.Mesh(lp.glass, new THREE.MeshBasicMaterial({ vertexColors: true })));
  lant.position.set(0.12, 0.62, 0.34);
  root.add(lant);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture(), color: 0xffc860, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.set(1.6, 1.6, 1);
  glow.position.set(0.12, 0.38, 0.34);
  root.add(glow);
  // Mini-Vampirumhang: dunkles Cape am Rücken
  const cape = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.55, 10, 1, true, Math.PI * 0.55, Math.PI * 0.9), new THREE.MeshStandardMaterial({ color: 0x2a1838, roughness: 0.6, side: THREE.DoubleSide }));
  cape.position.set(-0.08, 0.42, 0);
  root.add(cape);
  addObject(level, root);
  const hold = {};
  let t = 0;
  level.view.onFrame((dt) => {
    const d = visDt(level, hold, dt);
    t += d;
    lant.rotation.x = Math.sin(t * 2.4) * (st.on ? 0.5 : 0.18);
    glow.position.y = 0.38 + Math.sin(t * 2.4) * 0.03;
    try { m.update(d, { anim: st.on ? 'cheer' : 'idle' }); } catch (_) { /* Modell ohne diese Animation */ }
  });
  return st;
}
