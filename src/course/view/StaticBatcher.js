// Statische Level-Geometrie je Abschnitt verschmelzen (Vertrag: wenige Zeichenaufrufe, Frustum-Culling je
// Abschnitt). Bausteine geben Geometrien in Weltkoordinaten mit Vertexfarben ab (level.view.addStatic);
// finalize() fasst sie je (Material, Abschnitt von SECTION m entlang z, Schattenwurf) zu einem Mesh zusammen.
// Sehr große Teile (länger als BIG_Z oder breiter als BIG_X: lange Strecken wie `track`, Kulissen-Ringe, große Böden)
// blähen die Quader der Abschnitte nicht mehr auf: mit vielen Dreiecken (≥ BIG_TRIS) werden sie dreiecksweise auf
// eigene Zellen (Abschnitt × CELL_X-Streifen, Schwerpunkt des Dreiecks) verteilt – gezeichnet wird nur, was im Bild
// liegt –, sparsame (Kulissen-Hügel aus wenigen Dreiecken) landen zusammen in einem eigenen Mesh je Material (werden
// es zusammen zu viele, ebenfalls auf Zellen verteilt).
// Nicht-indizierte Geometrie mit position/normal/color wird erwartet; fehlende Farbe = Weiß, uv entfällt.
//
// Präzisierung (Leistung und Level-Haken 2): addStatic nach finalize (LEVEL.setup, Archetyp, Laufzeit) wird beim
// nächsten build() bzw. spätestens vor dem nächsten Bild in die vorhandenen Meshes derselben Zelle verschmolzen
// (kein zusätzlicher Zeichenaufruf). Geprüft wird je Mesh mit dem Quader (mesh.cullBox, view/Culling.js).
// Dioramen (Archetyp diorama; sonst `LEVEL.staticSplit: false`) sieht die Kamera ganz – dort bleiben große Teile ungeteilt
// in ihrem Abschnitt (Zellen kosteten nur Zeichenaufrufe).

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const SECTION = 32;
export const CELL_X = 64;
const BIG_Z = SECTION * 2.5, BIG_X = 120, BIG_TRIS = 2000, WEIT_TRIS = 2000, MIN_CELL = 600;

const cellX = (x) => Math.floor((x + CELL_X / 2) / CELL_X);
const secZ = (z) => Math.floor(-z / SECTION);

/**
 * Nicht-indizierte Geometrie dreiecksweise nach Zellen aufteilen → Map(Schlüssel → Geometrie). Dreiecke aus Zellen mit
 * weniger als MIN_CELL Dreiecken landen in einer groben Zelle (2 × 2 Zellen) – sonst kosteten viele fast leere Zellen je
 * einen Zeichenaufruf.
 */
function splitByCells(g) {
  const P = g.attributes.position.array, N = g.attributes.normal.array, C = g.attributes.color.array;
  const tris = P.length / 9;
  const lists = new Map();
  for (let t = 0; t < tris; t++) {
    const o = t * 9;
    const cx = (P[o] + P[o + 3] + P[o + 6]) / 3, cz = (P[o + 2] + P[o + 5] + P[o + 8]) / 3;
    const k = `${secZ(cz)}|${cellX(cx)}`;
    let l = lists.get(k);
    if (!l) { l = []; lists.set(k, l); }
    l.push(t);
  }
  for (const [k, l] of [...lists]) {
    if (l.length >= MIN_CELL) continue;
    const [zs, xc] = k.split('|').map(Number);
    const g4 = `g${Math.floor(zs / 2)}|${Math.floor(xc / 2)}`;
    lists.delete(k);
    if (!lists.has(g4)) lists.set(g4, []);
    lists.get(g4).push(...l);
  }
  const out = new Map();
  for (const [k, l] of lists) {
    const p = new Float32Array(l.length * 9), n = new Float32Array(l.length * 9), c = new Float32Array(l.length * 9);
    l.forEach((t, i) => { p.set(P.subarray(t * 9, t * 9 + 9), i * 9); n.set(N.subarray(t * 9, t * 9 + 9), i * 9); c.set(C.subarray(t * 9, t * 9 + 9), i * 9); });
    const q = new THREE.BufferGeometry();
    q.setAttribute('position', new THREE.BufferAttribute(p, 3));
    q.setAttribute('normal', new THREE.BufferAttribute(n, 3));
    q.setAttribute('color', new THREE.BufferAttribute(c, 3));
    out.set(k, q);
  }
  return out;
}

export class StaticBatcher {
  constructor(view) {
    this.view = view;
    this.buckets = new Map();
    this.meshes = [];
    this.byKey = new Map();          // Schlüssel → Mesh (für späteres Anhängen)
    this.stats = { parts: 0, meshes: 0, triangles: 0, split: 0 };
    this.built = false;
  }

  /** Ganze Szene im Bild (Diorama) bzw. LEVEL.staticSplit === false: große Teile nicht auf Zellen verteilen. */
  get compact() {
    const d = this.view.data;
    return d?.staticSplit === false || (d?.staticSplit === undefined && d?.archetype === 'diorama');
  }

  /** Teile, die noch nicht verschmolzen sind (nach finalize: beim nächsten Bild). */
  get pending() { return this.buckets.size > 0; }

  /**
   * @param {THREE.BufferGeometry} g Weltkoordinaten
   * @param {{ material?: 'world'|'stone'|'glow', castShadow?: boolean, receiveShadow?: boolean }} opts
   */
  add(g, opts = {}) {
    if (!g) return;
    if (g.index) g = g.toNonIndexed();
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'color') g.deleteAttribute(name);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.color) {
      const col = new Float32Array(g.attributes.position.count * 3).fill(1);
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    }
    g.computeBoundingBox();
    const bb = g.boundingBox;
    const mat = opts.material ?? 'world';
    const cast = opts.castShadow !== false;
    const recv = opts.receiveShadow !== false;
    const tail = `${mat}|${cast ? 1 : 0}|${recv ? 1 : 0}`;
    const big = !this.compact && (bb.max.z - bb.min.z > BIG_Z || bb.max.x - bb.min.x > BIG_X);
    if (big && g.attributes.position.count >= BIG_TRIS * 3) {
      for (const [cell, q] of splitByCells(g)) this.put(`groß|${cell}|${tail}`, mat, cast, recv, q);
      g.dispose();
      this.stats.split++;
    } else if (big) {
      this.put(`weit|${tail}`, mat, cast, recv, g);
    } else {
      this.put(`${secZ((bb.min.z + bb.max.z) / 2)}|${tail}`, mat, cast, recv, g);
    }
    this.stats.parts++;
  }

  put(key, mat, cast, recv, g) {
    let b = this.buckets.get(key);
    if (!b) { b = { mat, cast, recv, parts: [] }; this.buckets.set(key, b); }
    b.parts.push(g);
  }

  build() {
    // viele sparsame Großteile zusammen (z. B. Gelände-Streifen, Schneezäune entlang einer langen Strecke): dann doch
    // auf Zellen verteilen, sonst wäre das gemeinsame Mesh groß und überall zu sehen
    for (const [key, b] of [...this.buckets]) {
      if (!key.startsWith('weit|')) continue;
      let n = 0;
      for (const g of b.parts) n += g.attributes.position.count;
      if (n < WEIT_TRIS * 3) continue;
      this.buckets.delete(key);
      const tail = key.slice(5);
      const g = mergeGeometries(b.parts, false);
      for (const q of b.parts) q.dispose();
      if (!g) continue;
      for (const [cell, q] of splitByCells(g)) this.put(`groß|${cell}|${tail}`, b.mat, b.cast, b.recv, q);
      g.dispose();
    }
    for (const [key, b] of this.buckets) {
      const host = this.byKey.get(key);
      // schon gebaut (spätes addStatic): an das vorhandene Mesh derselben Zelle anhängen
      const list = host && host.parent ? [host.geometry, ...b.parts] : b.parts;
      const g = mergeGeometries(list, false);
      for (const p of b.parts) p.dispose();
      if (!g) continue;
      g.computeBoundingSphere();
      g.computeBoundingBox();
      if (host && host.parent) {
        this.stats.triangles -= host.geometry.attributes.position.count / 3;
        host.geometry.dispose();
        host.geometry = g;
        this.stats.triangles += g.attributes.position.count / 3;
        continue;
      }
      const mesh = new THREE.Mesh(g, this.view.mats[b.mat] ?? this.view.mats.world);
      mesh.castShadow = b.cast;
      mesh.receiveShadow = b.recv;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      mesh.cullBox = true;            // Quader statt Kugel gegen Sicht/Schatten (view/Culling.js)
      mesh.name = `statisch:${b.mat}`;
      mesh.userData.cell = key;
      this.view.three.add(mesh);
      this.meshes.push(mesh);
      this.byKey.set(key, mesh);
      this.stats.meshes++;
      this.stats.triangles += g.attributes.position.count / 3;
    }
    this.buckets.clear();
    this.built = true;
  }

  dispose() {
    for (const m of this.meshes) { m.parent?.remove(m); m.geometry.dispose(); }
    this.meshes.length = 0;
    this.byKey.clear();
  }
}
