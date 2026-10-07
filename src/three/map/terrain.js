// Gelände der 3D-Weltkarte: eine kleine Insel aus sanften Hügeln. Die Karte (480x270 Kartenpixel)
// liegt als Fläche am Boden: X = x/16, Z = y/16 (Tiefe, größeres y = näher an der Kamera),
// Y = Höhe. Die Höhe ist eine Summe weniger Sinus-Hügel mit ebenen Plateaus an den Level-Punkten,
// einer Teich-Senke unten rechts und einem Inselrand, der zum Wasser (Y = 0) abfällt.
// Die Höhe ist analytisch (baseHeight) und zusätzlich exakt auf dem gebauten Netz abfragbar
// (heightAt, baryzentrisch), damit Wege, Figur und Requisiten genau auf dem Gelände aufsitzen.

import * as THREE from 'three';
import { GAME } from '../../config.js';
import { WORLD } from '../../levels/worldmap.js';

/** Kartenpixel → Einheiten (1 Einheit = 16 px wie in der Level-Ansicht). */
export const U = 1 / GAME.tile;
export const MAP_W = GAME.width * U;    // 30
export const MAP_D = GAME.height * U;   // 16.875
export const CX = MAP_W / 2, CZ = MAP_D / 2;
export const WATER_Y = 0;

/** Teich (in der 2D-Karte unten rechts bei 428/232; hier etwas nach oben gerückt, damit er nicht unter dem Start-Knopf liegt). */
export const POND = { X: 414 * U, Z: 216 * U, rx: 2.7, rz: 1.45, depth: 1.3 };

export const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
export const smoothstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;

// Netzausdehnung (Einheiten) und Auflösung
const X0 = -12, X1 = 42, Z0 = -14, Z1 = 26;
const NX = 96, NZ = 72;
const DX = (X1 - X0) / NX, DZ = (Z1 - Z0) / NZ;

const _c = new THREE.Color();
const GRASS_A = new THREE.Color(0x6fd04a);
const GRASS_B = new THREE.Color(0x4fb236);
const SAND = new THREE.Color(0xf2dea6);
const SAND_WET = new THREE.Color(0xd9c58e);
const DEEP = new THREE.Color(0x2b86b4);

/** Grundform der Hügel (ohne Plateaus, Teich, Rand). */
export function hills(X, Z) {
  let h = 1.15
    + 0.5 * Math.sin(X * 0.40 + 0.9) * Math.cos(Z * 0.36 + 1.2)
    + 0.3 * Math.sin(X * 0.23 - Z * 0.31 + 2.1)
    + 0.14 * Math.cos(X * 0.85 + Z * 0.55 + 0.4)
    + 0.06 * (CZ - Z); // hinten etwas höher – man sieht mehr Wiese
  // weicher Boden: nichts auf der Insel sinkt unter ~0,35
  const k = 4, f = 0.35;
  return f + Math.log(1 + Math.exp(k * (h - f))) / k;
}

/** Inselumriss: < 1 innen, > 1 außen (Superellipse mit welligem Rand). */
export function islandRadius(X, Z) {
  const dx = (X - CX) / 16.5, dz = (Z - CZ) / 10.8;
  const ang = Math.atan2(dz, dx);
  const wob = 1 + 0.06 * Math.sin(ang * 5 + 0.7) + 0.04 * Math.sin(ang * 9 - 1.3);
  return Math.cbrt(Math.abs(dx) ** 3 + Math.abs(dz) ** 3) / wob;
}

/** Teichmaß: < 1 im Teich (elliptisch). */
export function pondRadius(X, Z) {
  return Math.hypot((X - POND.X) / POND.rx, (Z - POND.Z) / POND.rz);
}

export class Island {
  constructor() {
    this.nodes = WORLD.nodes.map((n) => ({ key: n.key, X: n.x * U, Z: n.y * U }));
    for (const n of this.nodes) n.h = hills(n.X, n.Z);
    this.heights = new Float32Array((NX + 1) * (NZ + 1));
    this.mesh = this.build();
  }

  /** Analytische Höhe (Hügel + Plateaus + Teich + Inselrand). */
  baseHeight(X, Z) {
    let h = hills(X, Z);
    for (const n of this.nodes) {
      const d = Math.hypot(X - n.X, Z - n.Z);
      if (d < 2.6) h = lerp(h, n.h, smoothstep(2.6, 1.15, d));
    }
    h -= POND.depth * smoothstep(1.3, 0.45, pondRadius(X, Z));
    const r = islandRadius(X, Z);
    const land = smoothstep(1.12, 0.92, r);
    const seaFloor = -0.7 - 1.3 * smoothstep(1.0, 1.7, r);
    return lerp(seaFloor, h, land);
  }

  /** Ebenheit um die Knoten (1 = mitten auf dem Plateau) – für Deko-Verteilung. */
  plateau(X, Z) {
    let w = 0;
    for (const n of this.nodes) w = Math.max(w, smoothstep(2.6, 1.15, Math.hypot(X - n.X, Z - n.Z)));
    return w;
  }

  /** Vertexfarbe aus Lage und Höhe. */
  colorAt(X, Z, h, out) {
    const patch = clamp01(0.5 + 0.35 * Math.sin(X * 0.75 + 0.4) * Math.sin(Z * 0.95 + 1.3) + 0.2 * Math.sin(X * 2.0 - Z * 1.5 + 0.7));
    out.copy(GRASS_B).lerp(GRASS_A, patch);
    const light = 1 + Math.max(-0.12, Math.min(0.14, (h - 1.0) * 0.1));
    out.multiplyScalar(light);
    // Plateaus einen Hauch heller (gepflegter Rasen um die Level-Punkte)
    out.lerp(GRASS_A, this.plateau(X, Z) * 0.25);
    // Strand und Meeresgrund
    const sandT = smoothstep(0.45, 0.2, h);
    if (sandT > 0) {
      _c.copy(SAND).lerp(SAND_WET, smoothstep(0.1, -0.3, h));
      _c.lerp(DEEP, smoothstep(-0.2, -1.9, h));
      out.lerp(_c, sandT);
    }
    return out;
  }

  build() {
    const cols = NX + 1, rows = NZ + 1;
    const pos = new Float32Array(cols * rows * 3);
    const col = new Float32Array(cols * rows * 3);
    const c = new THREE.Color();
    for (let i = 0; i < rows; i++) {
      const Z = Z0 + i * DZ;
      for (let j = 0; j < cols; j++) {
        const X = X0 + j * DX;
        const h = this.baseHeight(X, Z);
        const k = i * cols + j;
        this.heights[k] = h;
        pos[k * 3] = X; pos[k * 3 + 1] = h; pos[k * 3 + 2] = Z;
        this.colorAt(X, Z, h, c);
        col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
      }
    }
    const idx = new Uint32Array(NX * NZ * 6);
    let n = 0;
    for (let i = 0; i < NZ; i++) {
      for (let j = 0; j < NX; j++) {
        const a = i * cols + j, b = a + 1, d = a + cols, e = d + 1;
        // Diagonale a–e (siehe heightAt)
        idx[n++] = a; idx[n++] = d; idx[n++] = e;
        idx[n++] = a; idx[n++] = e; idx[n++] = b;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.name = 'island';
    this.geometry = geo;
    this.material = mat;
    return mesh;
  }

  /** Höhe exakt auf dem gebauten Netz (baryzentrisch im Dreieck). */
  heightAt(X, Z) {
    const fx = (X - X0) / DX, fz = (Z - Z0) / DZ;
    const j = Math.floor(fx), i = Math.floor(fz);
    if (j < 0 || i < 0 || j >= NX || i >= NZ) return this.baseHeight(X, Z);
    const u = fx - j, v = fz - i;
    const cols = NX + 1;
    const a = i * cols + j;
    const h = this.heights;
    const h00 = h[a], h10 = h[a + 1], h01 = h[a + cols], h11 = h[a + cols + 1];
    // Dreieck (a, d, e) deckt v >= u ab, Dreieck (a, e, b) deckt u >= v ab
    if (v >= u) return h00 + (v - u) * (h01 - h00) + u * (h11 - h00);
    return h00 + (u - v) * (h10 - h00) + v * (h11 - h00);
  }

  /** Liegt der Punkt auf festem Land (Wiese, nicht Strand/Wasser/Teich)? */
  isMeadow(X, Z) {
    return this.baseHeight(X, Z) > 0.5 && islandRadius(X, Z) < 0.9 && pondRadius(X, Z) > 1.5;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
