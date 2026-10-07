// Geometrie-Helfer der 3D-Welt: Quader mit *selektiv* abgerundeten Kanten, Vertexfarben,
// deterministischer Zufall und das Zusammenfassen vieler Teile zu einer Geometrie.
//
// Alles ist Code-generiert (keine Texturen). Farbe und Form tragen den Look; die Rundungen
// sitzen nur an Kanten zwischen zwei *freien* Seiten (z. B. Grasdecke oben/vorn), damit
// aneinanderstoßende Teile nahtlos bleiben.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Seiten-Bits eines Quaders. */
export const SIDE = { PX: 1, NX: 2, PY: 4, NY: 8, PZ: 16, NZ: 32, ALL: 63 };

// ---------------------------------------------------------------- Zufall

/** mulberry32 – kleiner deterministischer Zufallsgenerator (gleicher Seed = gleiche Welt). */
export class Rnd {
  constructor(seed) { this.s = seed >>> 0; }
  frac() {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  real(a, b) { return a + (b - a) * this.frac(); }
  int(a, b) { return Math.floor(this.real(a, b + 1)); }
  pick(arr) { return arr[Math.floor(this.frac() * arr.length)]; }
  chance(p) { return this.frac() < p; }
}

/** Seed aus Tile-Koordinaten (und Salz), gut durchmischt. */
export function seedOf(tx, ty, salt = 0) {
  let h = (Math.imul(tx + 1013, 73856093) ^ Math.imul(ty + 7919, 19349663) ^ Math.imul(salt + 17, 83492791)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0x5bd1e995) >>> 0;
  return h ^ (h >>> 15);
}

// ---------------------------------------------------------------- Farben

const _c = new THREE.Color();
/** Hex (sRGB) → [r, g, b] linear, gecacht. */
const LIN = new Map();
export function lin(hex) {
  let v = LIN.get(hex);
  if (!v) { _c.setHex(hex); v = [_c.r, _c.g, _c.b]; LIN.set(hex, v); }
  return v;
}
/** Mischt zwei lineare Farben. */
export function mixc(a, b, t, out = [0, 0, 0]) {
  out[0] = a[0] + (b[0] - a[0]) * t; out[1] = a[1] + (b[1] - a[1]) * t; out[2] = a[2] + (b[2] - a[2]) * t;
  return out;
}
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------- Quader mit runden Kanten

const AXES = [
  // [Achse, Vorzeichen, Seiten-Bit, Tangente u, Tangente v]
  [0, 1, SIDE.PX, 2, 1], [0, -1, SIDE.NX, 2, 1],
  [1, 1, SIDE.PY, 0, 2], [1, -1, SIDE.NY, 0, 2],
  [2, 1, SIDE.PZ, 0, 1], [2, -1, SIDE.NZ, 0, 1],
];

/**
 * Quader (w × h × d, Mittelpunkt im Ursprung) mit Rundungsradius r an allen Kanten, die zwischen
 * zwei *freien* Seiten liegen (`free`: SIDE-Bits). Seiten in `skip` werden nicht erzeugt.
 * `seg` = Unterteilungen der Rundung (2 → drei Stützpunkte pro Viertelkreis).
 * Liefert eine nicht-indizierte Geometrie mit position/normal; Farben kommen über `colorize`.
 * Entartete Dreiecke (Rundung mit Radius 0 an nicht-freien Seiten) werden entfernt.
 */
export function roundedBox(w, h, d, r = 0.12, free = SIDE.ALL, skip = 0, seg = 2) {
  const segs = seg * 2 + 1;
  const half = [w / 2, h / 2, d / 2];
  r = Math.min(r, half[0], half[1], half[2]);
  const halfSeg = 0.5 / segs;
  const freePos = [!!(free & SIDE.PX), !!(free & SIDE.PY), !!(free & SIDE.PZ)];
  const freeNeg = [!!(free & SIDE.NX), !!(free & SIDE.NY), !!(free & SIDE.NZ)];
  const isFree = (axis, sign) => (sign > 0 ? freePos[axis] : freeNeg[axis]);
  const pos = [], nor = [];
  const p = [0, 0, 0], n = [0, 0, 0], out = [0, 0, 0];
  const vert = (faceAxis, faceSign, faceFree) => {
    // Eckrichtung: Koordinaten um ein halbes Segment zur Mitte ziehen (wie RoundedBoxGeometry)
    for (let i = 0; i < 3; i++) {
      const c = p[i];
      const s = Math.sign(c);
      let v = Math.abs(c) - halfSeg; if (v < 0) v = 0;
      n[i] = s * v;
      if (!isFree(i, s)) n[i] = 0; // nicht-freie Seite: keine Rundung in dieser Achse
    }
    const len = Math.hypot(n[0], n[1], n[2]);
    if (len > 0) { n[0] /= len; n[1] /= len; n[2] /= len; }
    for (let i = 0; i < 3; i++) {
      const s = Math.sign(p[i]);
      out[i] = isFree(i, s) ? s * (half[i] - r) + n[i] * r : s * half[i];
    }
    pos.push(out[0], out[1], out[2]);
    if (len > 0 && faceFree) nor.push(n[0], n[1], n[2]);
    else { const fn = [0, 0, 0]; fn[faceAxis] = faceSign; nor.push(fn[0], fn[1], fn[2]); }
  };
  for (const [axis, sign, bit, ua, va] of AXES) {
    if (skip & bit) continue;
    const faceFree = isFree(axis, sign);
    // Gitter der Fläche; Umlaufsinn so, dass die Normale nach außen zeigt
    const grid = [];
    for (let j = 0; j <= segs; j++) {
      for (let i = 0; i <= segs; i++) {
        p[axis] = sign * 0.5;
        p[ua] = -0.5 + i / segs;
        p[va] = -0.5 + j / segs;
        grid.push([p[0], p[1], p[2]]);
      }
    }
    // Orientierung prüfen: (u × v) · normal > 0 ?
    const U = [0, 0, 0], V = [0, 0, 0]; U[ua] = 1; V[va] = 1;
    const cross = [U[1] * V[2] - U[2] * V[1], U[2] * V[0] - U[0] * V[2], U[0] * V[1] - U[1] * V[0]];
    const flip = cross[axis] * sign < 0;
    const emit = (a, b, c) => {
      const tri = flip ? [a, c, b] : [a, b, c];
      const start = pos.length;
      for (const g of tri) { p[0] = g[0]; p[1] = g[1]; p[2] = g[2]; vert(axis, sign, faceFree); }
      // entartete Dreiecke verwerfen
      const ax = pos[start], ay = pos[start + 1], az = pos[start + 2];
      const bx = pos[start + 3] - ax, by = pos[start + 4] - ay, bz = pos[start + 5] - az;
      const cx = pos[start + 6] - ax, cy = pos[start + 7] - ay, cz = pos[start + 8] - az;
      const nx = by * cz - bz * cy, ny = bz * cx - bx * cz, nz = bx * cy - by * cx;
      if (nx * nx + ny * ny + nz * nz < 1e-12) { pos.length = start; nor.length = start; }
    };
    for (let j = 0; j < segs; j++) {
      for (let i = 0; i < segs; i++) {
        const a = grid[j * (segs + 1) + i], b = grid[j * (segs + 1) + i + 1];
        const c = grid[(j + 1) * (segs + 1) + i], dd = grid[(j + 1) * (segs + 1) + i + 1];
        emit(a, b, dd); emit(a, dd, c);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return g;
}

// ---------------------------------------------------------------- Vertexfarben, Zusammenfassen

const _p = new THREE.Vector3(), _n = new THREE.Vector3();
/**
 * Fügt der Geometrie eine Farbe pro Vertex hinzu: fn(position, normal, out[3]) schreibt lineare RGB-Werte.
 * Indizierte Geometrien werden vorher aufgelöst (einheitliches Format fürs Zusammenfassen).
 */
export function colorize(geometry, fn) {
  if (geometry.index) geometry = geometry.toNonIndexed();
  const P = geometry.attributes.position, N = geometry.attributes.normal;
  const col = new Float32Array(P.count * 3);
  const out = [0, 0, 0];
  for (let i = 0; i < P.count; i++) {
    _p.fromBufferAttribute(P, i); _n.fromBufferAttribute(N, i);
    fn(_p, _n, out);
    col[i * 3] = out[0]; col[i * 3 + 1] = out[1]; col[i * 3 + 2] = out[2];
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geometry.deleteAttribute('uv');
  return geometry;
}

/** Einfarbig (lineare Farbe), optional mit Helligkeit nach Normale (oben heller, unten dunkler). */
export function flat(geometry, color, shade = 0) {
  return colorize(geometry, (p, n, o) => {
    const k = 1 + shade * n.y;
    o[0] = color[0] * k; o[1] = color[1] * k; o[2] = color[2] * k;
  });
}

/** Geometrie verschieben/drehen/skalieren (in dieser Reihenfolge: skalieren, drehen, verschieben). */
export function place(geometry, x, y, z, sx = 1, sy = sx, sz = sx, ry = 0) {
  if (sx !== 1 || sy !== 1 || sz !== 1) geometry.scale(sx, sy, sz);
  if (ry) geometry.rotateY(ry);
  geometry.translate(x, y, z);
  return geometry;
}

/** Viele (nicht-indizierte, gefärbte) Teile → eine Geometrie; die Teile werden freigegeben. */
export function merge(parts) {
  const list = parts.filter(Boolean);
  if (!list.length) return null;
  const g = mergeGeometries(list, false);
  for (const p of list) p.dispose();
  g.computeBoundingSphere();
  return g;
}
