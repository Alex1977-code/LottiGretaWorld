// Verschmelzen der statischen Karten-Geometrie in Kacheln (32 × 32 m) statt in z-Abschnitten über die ganze Breite:
// Die Karte ist eine breite Insel, die Kamera sieht nur einen Ausschnitt – mit Kacheln greift das Frustum-Culling
// im Bild und im Schattenpass viel besser (deutlich weniger Dreiecke je Bild). Während des Kartenbaus leitet die
// Szene view.addStatic hierher um (auch für die Standard-Bausteine); build() legt die Meshes in die 3D-Szene.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const TILE = 32;

// Optionen je Karte (map.batch, z. B. Welt 3): { tile, origin: [x, z], freeTile, freeOrigin } – Kachelgröße und
// -ursprung, für Teile ohne Schattenwurf eigene (größere) Kacheln: Sie fehlen im Schattenpass, größere Kacheln
// sparen dort Zeichenaufrufe. add(g, { tile: 'name' }) legt Teile in eine benannte Kachel (z. B. verstreute
// Kleinteile im Meer eines Sektors), unabhängig von ihrer Lage. add(g, { tile, lod: true }) (Halloween: eingebackene
// Registry-Modelle eines Eingangs): die Kachel darf von der Fern-Ausblendung (lod.js) erfasst werden (userData.lod).
// zones (Welt 6, schwebende Inseln): [[x0, z0, x1, z1, name], …] – Teile ohne benannte Kachel, deren Mitte in einer Zone
// liegt, kommen in die Kachel dieser Zone (je Insel ein Mesh je Material/Schattenwurf statt vieler angeschnittener
// Rasterkacheln – weniger Zeichenaufrufe im Weitblick); außerhalb aller Zonen gilt das Raster.
// alias (Welt 8): { 'w7:leuchten': 'w8:leuchten', … } – benannte Kacheln wiederverwendeter Bausteine anderer Welten in
// eine Kachel dieser Karte umleiten (ein Leucht-Mesh statt je eines je Herkunft).

export class MapBatcher {
  /** @param {import('../view/CourseView.js').CourseView} view */
  constructor(view, opts = {}) {
    this.view = view;
    this.tile = opts.tile ?? TILE;
    this.origin = opts.origin ?? [0, 0];
    this.freeTile = opts.freeTile ?? this.tile;
    this.freeOrigin = opts.freeOrigin ?? this.origin;
    this.zones = opts.zones ?? null;
    this.alias = opts.alias ?? null;
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
    const mat = opts.material ?? 'world';
    const cast = opts.castShadow !== false, recv = opts.receiveShadow !== false;
    const T = cast ? this.tile : this.freeTile, [ox, oz] = cast ? this.origin : this.freeOrigin;
    const tx = Math.floor(((bb.min.x + bb.max.x) / 2 - ox) / T), tz = Math.floor(((bb.min.z + bb.max.z) / 2 - oz) / T);
    let tile = opts.tile;
    if (tile !== undefined && this.alias?.[tile]) tile = this.alias[tile];
    if (tile === undefined && this.zones) {
      const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2;
      const zn = this.zones.find(([x0, z0, x1, z1]) => cx >= x0 && cx < x1 && cz >= z0 && cz < z1);
      if (zn) tile = `zone:${zn[4]}`;
    }
    const key = `${mat}|${tile ?? `${tx}|${tz}`}|${cast ? 1 : 0}|${recv ? 1 : 0}`;
    let b = this.buckets.get(key);
    if (!b) { b = { key, mat, cast, recv, parts: [], lod: !!opts.lod }; this.buckets.set(key, b); }
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
      if (b.lod) mesh.userData.lod = true;   // kompakte benannte Kachel: Fern-Ausblendung erlaubt
      mesh.userData.tile = b.key;             // Kachel-Schlüssel (Material|Kachel|Schatten|Empfang) zur Fehlersuche
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
