// Verschmelzen der statischen Karten-Geometrie in Kacheln (32 × 32 m) statt in z-Abschnitten über die ganze Breite:
// Die Karte ist eine breite Insel, die Kamera sieht nur einen Ausschnitt – mit Kacheln greift das Frustum-Culling
// im Bild und im Schattenpass viel besser (deutlich weniger Dreiecke je Bild). Während des Kartenbaus leitet die
// Szene view.addStatic hierher um (auch für die Standard-Bausteine); build() legt die Meshes in die 3D-Szene.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const TILE = 32;

export class MapBatcher {
  /** @param {import('../view/CourseView.js').CourseView} view */
  constructor(view) {
    this.view = view;
    this.buckets = new Map();
    this.meshes = [];
    this.stats = { parts: 0, meshes: 0, triangles: 0 };
  }

  /** Wie view.addStatic(geometry, { material, castShadow, receiveShadow }). */
  add(g, opts = {}) {
    if (!g) return;
    if (g.index) g = g.toNonIndexed();
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'color') g.deleteAttribute(name);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.color) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3));
    g.computeBoundingBox();
    const bb = g.boundingBox;
    const tx = Math.floor((bb.min.x + bb.max.x) / 2 / TILE), tz = Math.floor((bb.min.z + bb.max.z) / 2 / TILE);
    const mat = opts.material ?? 'world';
    const cast = opts.castShadow !== false, recv = opts.receiveShadow !== false;
    const key = `${mat}|${tx}|${tz}|${cast ? 1 : 0}|${recv ? 1 : 0}`;
    let b = this.buckets.get(key);
    if (!b) { b = { mat, cast, recv, parts: [] }; this.buckets.set(key, b); }
    b.parts.push(g);
    this.stats.parts++;
  }

  build() {
    for (const b of this.buckets.values()) {
      const g = mergeGeometries(b.parts, false);
      for (const p of b.parts) p.dispose();
      if (!g) continue;
      g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, this.view.mats[b.mat] ?? this.view.mats.world);
      mesh.castShadow = b.cast;
      mesh.receiveShadow = b.recv;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      mesh.name = `karte:statisch:${b.mat}`;
      this.view.three.add(mesh);
      this.meshes.push(mesh);
      this.stats.meshes++;
      this.stats.triangles += g.attributes.position.count / 3;
    }
    this.buckets.clear();
  }

  dispose() {
    for (const m of this.meshes) { m.parent?.remove(m); m.geometry.dispose(); }
    this.meshes.length = 0;
  }
}
