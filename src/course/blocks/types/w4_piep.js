// Piep-Blöcke (Welt 4, 4-3 „Piep-Block-Reihen“, B-8): rote und blaue Blöcke wechseln im Takt der Musik zwischen fest und
// „nur Umriss“ (ohne Kollision). Taktuhr: blocks/w4kit.js beatClock(level) – folgt music.beat() des Sync-Themas
// (course_beep, themeInfo().sync = { switchEvery: 8, warnBeats: 3 }), sonst einer eigenen Uhr auf der Simulationszeit.
// Umschalten auf Zählzeit 0, 8, 16 … (mit phase versetzt): Achterblock gerade → rot fest, blau Umriss; ungerade → blau
// fest, rot Umriss. In den letzten `warn` Zählzeiten davor blinken die Blöcke, die gleich wechseln, im Takt (Warn-Pieps:
// in course_beep enthalten, sonst sfx 'beep'/'beep_switch' über die Uhr). Wer beim Erscheinen in einem Block steckt
// (Figur, Klon, Gegner), wird sanft herausgeschoben (nach oben, wenn die Füße im oberen Teil stecken, sonst zur nächsten
// Seite); erst dann wird der Block fest.
//
// piep_block – Feld/Steg/Einzelblöcke einer Farbe (oder Farbkarte):
//   { type: 'piep_block', color: 'rot' | 'blau', phase: 0 (Zählzeiten-Versatz; every = genau umgekehrt),
//     every: 8, warn: 3 (Standard: Sync des Themas; B-8 „4× schneller, ohne Warnung“: every: 2, warn: 0),
//     pos + size: [w, h, d]          ein Quader (pos = Mitte der Unterseite); Optik in Zellen von cell m
//     | blocks: [[x, y, z], …]       einzelne Würfel (Mitte der Unterseite), Kantenlänge cell; Nachbarn werden für die
//                                    Kollision zu Quadern zusammengefasst
//     | grid: [nx, nz] | [nx, ny, nz], pos   gefülltes Feld aus Würfeln (pos = Mitte der Unterseite des Felds)
//     | map: ['rrb.', 'b..r'], pos   Farbkarte: Zeilen laufen nach −Z (erste Zeile am +Z-Rand), Spalten nach +X;
//                                    r/b = Würfel (R/B = 2 hoch), '.'/' ' = leer; color gilt dann nicht
//     cell: 1 (Kantenlänge der Zellen), id }
// piep_treppe – Treppe aus Piep-Blöcken (Stufen schweben, Farben wechseln je Stufe):
//   { type: 'piep_treppe', from: [x, y, z] (Mitte der Unterseite der ersten Stufe), dir: [0, -1] (Laufrichtung, 90°-Raster),
//     steps: 8, rise: 1 (Höhe je Stufe), run: 1 (Tiefe je Stufe), width: 2, height: rise (Blockhöhe),
//     colors: 'wechsel' (rot/blau im Wechsel) | 'rot' | 'blau' | ['rot', 'rot', 'blau', …], phase, every, warn, id }
// piep_rutsche – Rutsche aus Piep-Blöcken (Rampe mit Flag slide: die Figur rutscht ohne Ducken; Streifen wechseln die Farbe):
//   { type: 'piep_rutsche', pos (Mitte der Unterseite des Umrisses), size: [w, h, d] (h = Höhenunterschied), axis: 'z',
//     dir: 1 (Oberseite steigt nach +axis; die Figur rutscht nach −dir), band: 2 (m je Farbstreifen), thick: 0.6,
//     colors: 'wechsel' | 'rot' | 'blau', slope: 0.85, phase, every, warn, id }
//
// Laufzeit: level.named.get(id) = { groups, boxes, info() } (info: [{ color, on, warn, solid, pending }]); level.piep =
// System { clock, groups, boxes, switches, pushes, info() }. Darstellung: Modell 'piep_block' der Registry
// (opts.color, state { on, warn }) als Instanzen; bis es das gibt: eigene Instanz-Geometrie (fester Block mit
// Kissenfeldern und Piep-Lampe; Umriss = Neon-Kanten mit Hauch-Füllung) – 4 Zeichenaufrufe für alle Piep-Blöcke.

import * as THREE from 'three';
import { v3, sz3, lin, mixc, smooth, colorize, merge, hex } from '../kit.js';
import { roundedBox, SIDE } from '../../../three/world/geometry.js';
import { beatClock, pushOutOf, penetrates } from '../w4kit.js';
import { slideSlope } from '../w3kit.js';
import { figures } from '../w2kit.js';
import { topAt } from '../../physics/shapes.js';

export const PIEP_COLORS = {
  rot: { base: 0xff3d55, top: 0xff8494, dark: 0x9a0c26, lamp: 0xfff0f2, edge: 0xff5a70 },
  blau: { base: 0x2f78ff, top: 0x86b6ff, dark: 0x0e3296, lamp: 0xeef6ff, edge: 0x58a8ff },
};
const colorName = (c) => (c === 'blau' || c === 'blue' || c === 'b' || c === 'B' ? 'blau' : 'rot');
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

// ------------------------------------------------------------------ System (eines je Level)

class PiepSystem {
  constructor(level) {
    this.level = level;
    this.clock = beatClock(level);
    this.clock.wantSounds();
    this.groups = new Map();
    this.boxes = [];
    this.cells = [];
    this.pending = new Set();
    this.switches = 0;
    this.pushes = 0;
    this.view = level.view ? new PiepView(this) : null;
    level.onStep((dt) => this.step(dt));
  }

  group(color, phase = 0, every, warn) {
    every = Math.max(1, every ?? this.clock.every);
    warn = Math.max(0, Math.min(every - 1, warn ?? this.clock.warn));
    const key = `${color}|${phase}|${every}|${warn}`;
    let g = this.groups.get(key);
    if (!g) {
      g = { key, color, phase, every, warn, on: null, warnOn: false, k: 0, boxes: [], cells: [], pop: 0, switches: 0, dirty: true };
      const st = this.stateAt(g, this.clock.beat);
      g.on = st.on; g.k = st.k; g.warnOn = st.warn;
      this.groups.set(key, g);
    }
    return g;
  }

  /** Zustand einer Gruppe zur Zählzeit beat: on (fest), warn (Warnzeit vor dem Wechsel), k (Zählzeit im Block). */
  stateAt(g, beat) {
    const b = beat + g.phase;
    const cyc = Math.floor(b / g.every);
    const even = (((cyc % 2) + 2) % 2) === 0;
    const k = b - cyc * g.every;
    return { on: g.color === 'rot' ? even : !even, warn: g.warn > 0 && k >= g.every - g.warn, k };
  }

  addBox(g, shape) {
    shape.tag ??= 'piep_block';
    shape.piep = g.color;
    const e = { g, shape, id: null, pending: false };
    this.boxes.push(e); g.boxes.push(e);
    if (g.on) e.id = this.level.world.add(shape);   // beim Aufbau: gleich im richtigen Zustand (auch für den Level-Umriss)
    return e;
  }

  addCell(g, m) {
    const c = { g, m, i: -1 };
    this.cells.push(c); g.cells.push(c);
    return c;
  }

  step(dt) {
    const beat = this.clock.beat;
    for (const g of this.groups.values()) {
      const s = this.stateAt(g, beat);
      g.k = s.k;
      g.warnOn = s.warn;
      if (s.on !== g.on) this.setGroup(g, s.on, true);
    }
    if (this.pending.size) for (const e of [...this.pending]) this.resolve(e, dt);
  }

  setGroup(g, on, isSwitch) {
    g.on = on;
    if (isSwitch) { g.switches++; this.switches++; g.pop = 0.2; }
    for (const e of g.boxes) { if (on) this.activate(e); else this.deactivate(e); }
    g.dirty = true;
  }

  activate(e) {
    if (e.id !== null) return;
    if (this.occupied(e)) { e.pending = true; this.pending.add(e); return; }
    e.id = this.level.world.add(e.shape);
    e.pending = false;
    this.pending.delete(e);
  }

  deactivate(e) {
    if (e.id !== null) { this.level.world.remove(e.id); e.id = null; }
    e.pending = false;
    this.pending.delete(e);
  }

  /** Umriss der Form für eine Figur an (x, z) (Rampe: Oberseite an dieser Stelle). */
  boundsFor(shape, x, z) {
    const b = shape._b ??= boxOf(shape);
    if (shape.type !== 'ramp') return b;
    const q = shape._q ??= { ...b };
    q.y1 = rampTop(shape, x, z);
    return q;
  }

  /** Wer steckt in der Form? (Figuren und Gegner) */
  occupants(e) {
    const out = [];
    for (const p of figures(this.level)) {
      if (p.mode === 'script') continue;
      if (penetrates(p.pos, p.half, this.boundsFor(e.shape, p.pos.x, p.pos.z))) out.push(p);
    }
    for (const en of this.level.entities) {
      if (!en.enemy || !en.alive || en.removed || en.carrier) continue;
      if (penetrates(en.pos, en.half, this.boundsFor(e.shape, en.pos.x, en.pos.z))) out.push(en);
    }
    return out;
  }

  occupied(e) { return this.occupants(e).length > 0; }

  /** Ausstehenden Block freiräumen (sanft schieben); ist niemand mehr drin, wird er fest. */
  resolve(e, dt) {
    if (!e.g.on) { this.deactivate(e); return; }
    let busy = false;
    for (const who of this.occupants(e)) {
      if (pushOutOf(this.level, who, this.boundsFor(e.shape, who.pos.x, who.pos.z), dt)) { busy = true; this.pushes++; }
    }
    if (busy) return;
    e.id = this.level.world.add(e.shape);
    e.pending = false;
    this.pending.delete(e);
  }

  info() {
    return [...this.groups.values()].map((g) => ({
      color: g.color, phase: g.phase, every: g.every, on: g.on, warn: g.warnOn, k: +g.k.toFixed(3), switches: g.switches,
      solid: g.boxes.filter((e) => e.id !== null).length, pending: g.boxes.filter((e) => e.pending).length, boxes: g.boxes.length, cells: g.cells.length,
    }));
  }
}

function boxOf(s) {
  if (s.type === 'cyl') return { x0: s.x - s.r, x1: s.x + s.r, y0: s.y0, y1: s.y1, z0: s.z - s.r, z1: s.z + s.r };
  return { x0: Math.min(s.min[0], s.max[0]), x1: Math.max(s.min[0], s.max[0]), y0: Math.min(s.min[1], s.max[1]), y1: Math.max(s.min[1], s.max[1]), z0: Math.min(s.min[2], s.max[2]), z1: Math.max(s.min[2], s.max[2]) };
}

function rampTop(s, x, z) {
  if (s.x0 !== undefined) return topAt(s, x, z);
  const b = boxOf(s);
  const low = s.low ?? b.y0;
  let t = s.axis === 'x' ? (Math.min(b.x1, Math.max(b.x0, x)) - b.x0) / Math.max(1e-6, b.x1 - b.x0) : (Math.min(b.z1, Math.max(b.z0, z)) - b.z0) / Math.max(1e-6, b.z1 - b.z0);
  if (s.dir < 0) t = 1 - t;
  return low + (b.y1 - low) * t;
}

export function piepSystem(level) {
  if (!level.piep) level.piep = new PiepSystem(level);
  return level.piep;
}

// ------------------------------------------------------------------ Darstellung (Instanzen)

/** Fester Piep-Block (Einheitswürfel um den Ursprung): runder Körper, Kissenfelder, Piep-Lampe oben und vorn. */
function solidGeo(c) {
  const base = lin(hex(c.base)), top = lin(hex(c.top)), dark = lin(hex(c.dark)), lamp = lin(hex(c.lamp));
  const parts = [];
  const body = roundedBox(0.98, 0.98, 0.98, 0.1, SIDE.ALL, 0, 1);
  parts.push(colorize(body, (p, n, o) => {
    if (n.y > 0.5) mixc(base, top, 0.35, o);
    else if (n.y < -0.5) mixc(base, dark, 0.55, o);
    else mixc(dark, base, smooth(-0.5, 0.4, p.y), o);
  }));
  // Kissenfelder (leicht erhaben) auf Oberseite und vier Seiten, Ränder dunkler
  const pad = (w, h, d, x, y, z, col) => {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(x, y, z);
    return colorize(g, (p, n, o) => { o[0] = col[0]; o[1] = col[1]; o[2] = col[2]; });
  };
  const padCol = mixc(base, top, 0.55, [0, 0, 0]);
  parts.push(pad(0.66, 0.03, 0.66, 0, 0.495, 0, padCol));
  for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    parts.push(pad(sx ? 0.03 : 0.66, 0.66, sz ? 0.03 : 0.66, sx * 0.495, 0, sz * 0.495, mixc(base, top, 0.25, [0, 0, 0])));
  }
  // Piep-Lampe: kleine Achteck-Scheibe oben und an den Seiten
  const lampAt = (rx, rz, x, y, z) => {
    const g = new THREE.CylinderGeometry(0.13, 0.15, 0.05, 8);
    if (rx) g.rotateX(rx); if (rz) g.rotateZ(rz);
    g.translate(x, y, z);
    return colorize(g, (p, n, o) => { o[0] = lamp[0]; o[1] = lamp[1]; o[2] = lamp[2]; });
  };
  parts.push(lampAt(0, 0, 0, 0.52, 0));
  parts.push(lampAt(Math.PI / 2, 0, 0, 0, 0.52), lampAt(Math.PI / 2, 0, 0, 0, -0.52));
  parts.push(lampAt(0, Math.PI / 2, 0.52, 0, 0), lampAt(0, Math.PI / 2, -0.52, 0, 0));
  return merge(parts);
}

/** Umriss (Einheitswürfel): zwölf Neon-Kanten (deckend) und eine Hauch-Füllung (Alpha 0,12) – Farben mit Alpha. */
function frameGeo(c) {
  const edge = lin(hex(c.edge)), fill = lin(hex(c.base));
  const parts = [];
  const bar = (w, h, d, x, y, z, col, a) => {
    const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
    g.translate(x, y, z);
    g.deleteAttribute('uv');
    const n = g.attributes.position.count, arr = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { arr[i * 4] = col[0]; arr[i * 4 + 1] = col[1]; arr[i * 4 + 2] = col[2]; arr[i * 4 + 3] = a; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 4));
    return g;
  };
  const t = 0.07, L = 0.98, hh = L / 2 - t / 2;
  for (const a of [-1, 1]) for (const b of [-1, 1]) {
    parts.push(bar(L, t, t, 0, a * hh, b * hh, edge, 0.95));
    parts.push(bar(t, L, t, a * hh, 0, b * hh, edge, 0.95));
    parts.push(bar(t, t, L, a * hh, b * hh, 0, edge, 0.95));
  }
  parts.push(bar(0.9, 0.9, 0.9, 0, 0, 0, fill, 0.13));
  return merge(parts);
}

const _m = new THREE.Matrix4(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _q = new THREE.Quaternion();
const _col = new THREE.Color();

class PiepView {
  constructor(sys) {
    this.sys = sys;
    this.level = sys.level;
    this.meshes = null;
    this.time = 0;
    this.level.view.onFrame((dt) => this.frame(dt));
  }

  build() {
    const byColor = { rot: [], blau: [] };
    for (const c of this.sys.cells) { c.i = byColor[c.g.color].length; byColor[c.g.color].push(c); }
    this.meshes = {};
    for (const color of ['rot', 'blau']) {
      const n = byColor[color].length;
      if (!n) continue;
      const set = PIEP_COLORS[color];
      const solid = new THREE.InstancedMesh(solidGeo(set), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.05, emissive: set.base, emissiveIntensity: 0.12 }), n);
      const frame = new THREE.InstancedMesh(frameGeo(set), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }), n);
      solid.castShadow = true; solid.receiveShadow = true;
      frame.castShadow = false; frame.renderOrder = 2;
      for (const m of [solid, frame]) {
        m.frustumCulled = false;
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        for (let i = 0; i < n; i++) { m.setMatrixAt(i, ZERO); m.setColorAt(i, _col.setRGB(1, 1, 1)); }
        m.userData.owned = true;
        this.level.view.add(m);
      }
      solid.name = `piep:${color}`; frame.name = `piep:${color}:umriss`;
      this.meshes[color] = { solid, frame, cells: byColor[color] };
    }
    for (const g of this.sys.groups.values()) g.dirty = true;
  }

  frame(dt) {
    if (!this.meshes) this.build();
    this.time += dt;
    const touched = new Set();
    for (const g of this.sys.groups.values()) {
      const popping = g.pop > 0;
      if (popping) g.pop = Math.max(0, g.pop - dt);
      const warnK = g.warnOn ? Math.exp(-(g.k % 1) * 5) : 0;   // Blitz zu Beginn jeder Warn-Zählzeit
      const warnChanged = (g._warnK ?? -1) !== warnK;
      if (!g.dirty && !popping && !warnChanged && !g._popped) continue;
      const set = this.meshes[g.color];
      if (!set) continue;
      g._popped = popping;
      const k = popping ? 1 - g.pop / 0.2 : 1;
      const sc = popping && g.on ? 0.82 + 0.18 * Math.sin(k * Math.PI * 0.5) + Math.sin(k * Math.PI) * 0.08 : 1;
      for (const c of g.cells) {
        if (g.dirty || popping || g._wasPopping) {
          if (g.on) {
            if (sc !== 1) { c.m.decompose(_p, _q, _s); _m.compose(_p, _q, _s.multiplyScalar(sc)); set.solid.setMatrixAt(c.i, _m); }
            else set.solid.setMatrixAt(c.i, c.m);
            set.frame.setMatrixAt(c.i, ZERO);
          } else { set.solid.setMatrixAt(c.i, ZERO); set.frame.setMatrixAt(c.i, c.m); }
        }
        if (warnChanged || g.dirty) {
          const w = 1 + warnK * (g.on ? 0.9 : 1.6);
          set.solid.setColorAt(c.i, _col.setRGB(w, w, w));
          set.frame.setColorAt(c.i, _col.setRGB(w, w, w));
        }
      }
      g._wasPopping = popping;
      g._warnK = warnK;
      g.dirty = false;
      touched.add(set);
    }
    for (const set of touched) {
      for (const m of [set.solid, set.frame]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
    }
  }
}

// ------------------------------------------------------------------ Bausteine

/** Zellen eines Quaders (Mitte der Unterseite p, Größe s) in Würfeln von etwa cell m. */
function cellsOfBox(sys, g, p, s, cell) {
  const nx = Math.max(1, Math.round(s.x / cell)), ny = Math.max(1, Math.round(s.y / cell)), nz = Math.max(1, Math.round(s.z / cell));
  const cx = s.x / nx, cy = s.y / ny, cz = s.z / nz;
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) {
    const m = new THREE.Matrix4().compose(
      _p.set(p.x - s.x / 2 + (i + 0.5) * cx, p.y + (j + 0.5) * cy, p.z - s.z / 2 + (k + 0.5) * cz),
      _q.identity(), _s.set(cx, cy, cz),
    );
    sys.addCell(g, m);
  }
}

function boxShape(p, s) {
  return { type: 'box', min: [p.x - s.x / 2, p.y, p.z - s.z / 2], max: [p.x + s.x / 2, p.y + s.y, p.z + s.z / 2] };
}

/** Würfel-Liste [{ x, y, z }] (Mitte unten, Kante c) zu wenigen Quadern zusammenfassen (Reihen in x, dann Lagen in z). */
function mergeCubes(list, c) {
  const key = (x, y, z) => `${Math.round(x / c * 2)}|${Math.round(y / c * 2)}|${Math.round(z / c * 2)}`;
  const set = new Map(list.map((q) => [key(q.x, q.y, q.z), q]));
  const used = new Set();
  const rows = [];
  const sorted = [...list].sort((a, b) => a.y - b.y || a.z - b.z || a.x - b.x);
  for (const q of sorted) {
    const k0 = key(q.x, q.y, q.z);
    if (used.has(k0)) continue;
    let n = 0;
    while (set.has(key(q.x + n * c, q.y, q.z)) && !used.has(key(q.x + n * c, q.y, q.z))) { used.add(key(q.x + n * c, q.y, q.z)); n++; }
    rows.push({ x0: q.x - c / 2, x1: q.x - c / 2 + n * c, y: q.y, z: q.z });
  }
  // gleich lange Reihen in z verbinden
  const out = [];
  const taken = new Set();
  rows.sort((a, b) => a.y - b.y || a.x0 - b.x0 || a.x1 - b.x1 || b.z - a.z);
  for (let i = 0; i < rows.length; i++) {
    if (taken.has(i)) continue;
    const r = rows[i];
    let z0 = r.z - c / 2, z1 = r.z + c / 2;
    for (let j = i + 1; j < rows.length; j++) {
      const q = rows[j];
      if (taken.has(j) || q.y !== r.y || Math.abs(q.x0 - r.x0) > 1e-6 || Math.abs(q.x1 - r.x1) > 1e-6) continue;
      if (Math.abs(q.z + c / 2 - z0) < 1e-6) { z0 = q.z - c / 2; taken.add(j); }
      else if (Math.abs(q.z - c / 2 - z1) < 1e-6) { z1 = q.z + c / 2; taken.add(j); }
    }
    out.push({ type: 'box', min: [r.x0, r.y, z0], max: [r.x1, r.y + c, z1] });
  }
  return out;
}

function handleFor(level, sys, groups, boxes, id) {
  const h = {
    groups, boxes,
    info: () => groups.map((g) => ({ color: g.color, on: g.on, warn: g.warnOn, solid: g.boxes.filter((e) => boxes.includes(e) && e.id !== null).length, pending: g.boxes.filter((e) => boxes.includes(e) && e.pending).length })),
    get solid() { return boxes.some((e) => e.id !== null); },
  };
  if (id) level.named.set(id, h);
  return h;
}

export function buildPiepBlock(level, spec) {
  const sys = piepSystem(level);
  const cell = spec.cell ?? 1;
  const ph = spec.phase ?? 0;
  const groups = [], boxes = [];
  const G = (color) => { const g = sys.group(colorName(color), ph, spec.every, spec.warn); if (!groups.includes(g)) groups.push(g); return g; };
  if (spec.map) {
    const rows = spec.map;
    const nz = rows.length, nx = Math.max(...rows.map((r) => r.length));
    const p = v3(spec.pos);
    const cubes = { rot: [], blau: [] };
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch !== 'r' && ch !== 'b' && ch !== 'R' && ch !== 'B') continue;
        const col = colorName(ch);
        const x = p.x - (nx * cell) / 2 + (i + 0.5) * cell, z = p.z + (nz * cell) / 2 - (j + 0.5) * cell;
        const hgt = ch === 'R' || ch === 'B' ? 2 : 1;
        for (let k = 0; k < hgt; k++) cubes[col].push({ x, y: p.y + k * cell, z });
      }
    });
    for (const col of ['rot', 'blau']) {
      if (!cubes[col].length) continue;
      const g = G(col);
      for (const q of cubes[col]) cellsOfBox(sys, g, q, { x: cell, y: cell, z: cell }, cell);
      for (const sh of mergeCubes(cubes[col], cell)) boxes.push(sys.addBox(g, sh));
    }
  } else {
    const g = G(spec.color);
    if (spec.blocks) {
      const cubes = spec.blocks.map((b) => v3(b));
      for (const q of cubes) cellsOfBox(sys, g, q, { x: cell, y: cell, z: cell }, cell);
      for (const sh of mergeCubes(cubes, cell)) boxes.push(sys.addBox(g, sh));
    } else if (spec.grid) {
      const [nx, a, b] = spec.grid;
      const ny = b === undefined ? 1 : a, nz = b === undefined ? a : b;
      const p = v3(spec.pos), s = { x: nx * cell, y: ny * cell, z: nz * cell };
      cellsOfBox(sys, g, p, s, cell);
      boxes.push(sys.addBox(g, boxShape(p, s)));
    } else {
      const p = v3(spec.pos), s = sz3(spec.size, [cell, cell, cell]);
      cellsOfBox(sys, g, p, s, cell);
      boxes.push(sys.addBox(g, boxShape(p, s)));
    }
  }
  return handleFor(level, sys, groups, boxes, spec.id);
}

function colorList(spec, n) {
  const c = spec.colors ?? spec.color ?? 'wechsel';
  if (Array.isArray(c)) return Array.from({ length: n }, (_, i) => colorName(c[i % c.length]));
  if (c === 'wechsel' || c === 'alt') {
    const first = colorName(spec.first ?? 'rot');
    return Array.from({ length: n }, (_, i) => (i % 2 ? (first === 'rot' ? 'blau' : 'rot') : first));
  }
  return Array.from({ length: n }, () => colorName(c));
}

export function buildPiepTreppe(level, spec) {
  const sys = piepSystem(level);
  const from = v3(spec.from ?? spec.pos);
  const d = spec.dir ?? [0, -1];
  const ax = Math.abs(d[0]) > Math.abs(d[1]) ? 'x' : 'z', sg = ax === 'x' ? Math.sign(d[0]) || 1 : Math.sign(d[1]) || 1;
  const n = spec.steps ?? 8, rise = spec.rise ?? 1, run = spec.run ?? 1, width = spec.width ?? 2, hgt = spec.height ?? rise;
  const cols = colorList(spec, n);
  const groups = [], boxes = [];
  for (let i = 0; i < n; i++) {
    const g = sys.group(cols[i], spec.phase ?? 0, spec.every, spec.warn);
    if (!groups.includes(g)) groups.push(g);
    const p = { x: from.x + (ax === 'x' ? sg * run * i : 0), y: from.y + rise * i, z: from.z + (ax === 'z' ? sg * run * i : 0) };
    const s = ax === 'x' ? { x: run, y: hgt, z: width } : { x: width, y: hgt, z: run };
    cellsOfBox(sys, g, p, s, Math.min(1, run, width));
    boxes.push(sys.addBox(g, boxShape(p, s)));
  }
  return handleFor(level, sys, groups, boxes, spec.id);
}

export function buildPiepRutsche(level, spec) {
  const sys = piepSystem(level);
  const p = v3(spec.pos), s = sz3(spec.size, [4, 4, 12]);
  const axis = spec.axis === 'x' ? 'x' : 'z', dir = spec.dir < 0 ? -1 : 1;
  const len = axis === 'x' ? s.x : s.z, wid = axis === 'x' ? s.z : s.x;
  const band = spec.band ?? 2, thick = spec.thick ?? 0.6;
  const nb = Math.max(1, Math.round(len / band)), bl = len / nb;
  const cols = colorList(spec, nb);
  const ang = Math.atan2(s.y, len);
  const groups = [], boxes = [];
  const a0 = axis === 'x' ? p.x - s.x / 2 : p.z - s.z / 2;
  // Höhe der Oberseite an der Achsenkoordinate u (absolut)
  const topU = (u) => { let t = (u - a0) / len; if (dir < 0) t = 1 - t; return p.y + s.y * t; };
  const cellW = Math.max(0.5, Math.min(1, wid)), nw = Math.max(1, Math.round(wid / cellW)), cw = wid / nw;
  const nAlong = Math.max(1, Math.round(bl / Math.min(1, bl))), ca = bl / nAlong;
  for (let i = 0; i < nb; i++) {
    const g = sys.group(cols[i], spec.phase ?? 0, spec.every, spec.warn);
    if (!groups.includes(g)) groups.push(g);
    const u0 = a0 + i * bl, u1 = u0 + bl;
    const h0 = topU(u0), h1 = topU(u1);
    const lo = Math.min(h0, h1), hi = Math.max(h0, h1);
    const min = axis === 'x' ? [u0, lo - thick, p.z - s.z / 2] : [p.x - s.x / 2, lo - thick, u0];
    const max = axis === 'x' ? [u1, hi, p.z + s.z / 2] : [p.x + s.x / 2, hi, u1];
    const shape = slideSlope({ type: 'ramp', min, max, axis, dir, low: lo }, spec.slope ?? 0.85);
    boxes.push(sys.addBox(g, shape));
    // Zellen: schräg liegende Blöcke auf der Rutschfläche
    for (let a = 0; a < nAlong; a++) {
      const um = u0 + (a + 0.5) * ca, top = topU(um);
      for (let w = 0; w < nw; w++) {
        const wm = (axis === 'x' ? p.z : p.x) - wid / 2 + (w + 0.5) * cw;
        const cy = top - (thick / 2) / Math.cos(ang);
        _p.set(axis === 'x' ? um : wm, cy, axis === 'x' ? wm : um);
        // Neigung: Oberseite steigt nach +axis·dir
        const e = new THREE.Euler(axis === 'z' ? -dir * ang : 0, 0, axis === 'x' ? dir * ang : 0);
        _q.setFromEuler(e);
        _s.set(axis === 'x' ? ca / Math.cos(ang) : cw, thick, axis === 'x' ? cw : ca / Math.cos(ang));
        sys.addCell(g, new THREE.Matrix4().compose(_p, _q, _s));
      }
    }
  }
  return handleFor(level, sys, groups, boxes, spec.id);
}

export const TYPES = { piep_block: buildPiepBlock, piep_treppe: buildPiepTreppe, piep_rutsche: buildPiepRutsche };
