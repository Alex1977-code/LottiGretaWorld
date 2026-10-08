// Statische Level-Geometrie je Abschnitt verschmelzen (Vertrag: wenige Zeichenaufrufe, Frustum-Culling je
// Abschnitt). Bausteine geben Geometrien in Weltkoordinaten mit Vertexfarben ab (level.view.addStatic);
// finalize() fasst sie je (Material, Abschnitt von SECTION m entlang z, Schattenwurf) zu einem Mesh zusammen.
// Nicht-indizierte Geometrie mit position/normal/color wird erwartet; fehlende Farbe = Weiß, uv entfällt.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const SECTION = 32;

export class StaticBatcher {
  constructor(view) {
    this.view = view;
    this.buckets = new Map();
    this.meshes = [];
    this.stats = { parts: 0, meshes: 0, triangles: 0 };
  }

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
    const cz = (g.boundingBox.min.z + g.boundingBox.max.z) / 2;
    const sec = Math.floor(-cz / SECTION);
    const mat = opts.material ?? 'world';
    const cast = opts.castShadow !== false;
    const recv = opts.receiveShadow !== false;
    const key = `${mat}|${sec}|${cast ? 1 : 0}|${recv ? 1 : 0}`;
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
      mesh.name = `statisch:${b.mat}`;
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
