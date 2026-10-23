// Gegner- und Modell-Instanzen im Motor (Präzisierung „Leistung und Level-Haken 2“). Gleiche Modelle mehrerer
// Entitäten (Registry-Modelle teilen Geometrien und Materialien: neun Flatterkäfer, zwanzig Pilzlinge, Doppelgänger,
// Sterne …) werden je Bild als **eine InstancedMesh je Modellteil** gezeichnet statt je Exemplar und Teil – ohne
// Level-Code. Die Entitäten rechnen und animieren ihre Modelle wie bisher (Knoten-Matrizen werden übernommen);
// sichtbar, Material, Schattenwurf werden jedes Bild neu gelesen.
//
// Regeln je Mesh eines Entitäts-Modells (sonst zeichnet es wie bisher selbst):
//   - gleiche Geometrie + gleiches Material + gleicher Schattenwurf/-empfang bei ≥ 2 sichtbaren Exemplaren im Bild
//   - nicht transparent, ein Material, kein Skinning/Morph/Instanzen, renderOrder 0, kein eigener Render-Haken,
//     frustumCulled, Weltmatrix ohne Scherung/Spiegelung (Normalen wie beim Einzel-Mesh)
//   - je Exemplar wird geprüft, ob es im Bild liegt bzw. (castShadow) seinen Schatten ins Bild wirft (view/Culling.js);
//     je Gruppe zwei InstancedMeshes: eine für den Hauptpass (nur Exemplare im Bild), eine nur für den Schattenpass
//     (nur Exemplare, deren Schatten ins Bild fallen kann)
// Abschalten: Entität `instancing = false` (bzw. spec.instancing: false), ganzes Level LEVEL.instancing = false.
// Die Einzel-Meshes werden nur im Zeichnen übergangen (view/Culling.js: mesh.__inst), visible bleibt unangetastet.

import * as THREE from 'three';
import { worldSphere } from './Culling.js';

const DEFAULT_HOOK = THREE.Object3D.prototype.onBeforeRender;
const DEFAULT_SHADOW_HOOK = THREE.Object3D.prototype.onBeforeShadow;
const _s = new THREE.Sphere();

function eligible(m) {
  if (!m.isMesh || m.isInstancedMesh || m.isSkinnedMesh || m.isBatchedMesh || !m.frustumCulled || m.renderOrder !== 0) return false;
  const mat = m.material;
  if (!mat || Array.isArray(mat) || mat.transparent || !mat.visible) return false;
  if (m.onBeforeRender !== DEFAULT_HOOK || m.onBeforeShadow !== DEFAULT_SHADOW_HOOK || m.customDepthMaterial || m.shadowProxied) return false;
  const g = m.geometry;
  if (!g?.attributes?.position || g.morphAttributes?.position?.length) return false;
  return true;
}

/** Weltmatrix ohne Scherung und Spiegelung (Instanz-Normalen entsprechen dann der normalMatrix des Einzel-Meshes). */
function clean(e) {
  const ax = e[0], ay = e[1], az = e[2], bx = e[4], by = e[5], bz = e[6], cx = e[8], cy = e[9], cz = e[10];
  const la = ax * ax + ay * ay + az * az, lb = bx * bx + by * by + bz * bz, lc = cx * cx + cy * cy + cz * cz;
  const eps = 1e-6;
  const ab = ax * bx + ay * by + az * bz, ac = ax * cx + ay * cy + az * cz, bc = bx * cx + by * cy + bz * cz;
  if (ab * ab > eps * la * lb || ac * ac > eps * la * lc || bc * bc > eps * lb * lc) return false;
  const det = ax * (by * cz - bz * cy) - bx * (ay * cz - az * cy) + cx * (ay * bz - az * by);
  return det > 0;
}

export class EntityInstancer {
  /** @param {import('./CourseView.js').CourseView} view */
  constructor(view) {
    this.view = view;
    this.groups = new Map();     // Schlüssel → { geo, mat, cast, recv, im, cap, list: [] }
    this.found = [];
    this.stats = { groups: 0, instanced: 0, meshes: 0 };
  }

  /** Sichtbare Meshes eines Modells (Abstieg nur in sichtbare Knoten). */
  walk(node, out) {
    if (!node.visible) return;
    if (node.isMesh) out.push(node);
    const ch = node.children;
    for (let i = 0; i < ch.length; i++) this.walk(ch[i], out);
  }

  /** Je Bild vor dem Zeichnen (nach Kamera und Animationen). */
  update(level, culling) {
    const v = this.view;
    for (const G of this.groups.values()) G.list.length = 0;
    if (!v.optimize || !level || level.data?.instancing === false) { this.finish(); return; }
    const found = this.found;
    found.length = 0;
    const token = v.frame;
    for (const e of level.entities) {
      const root = e.model?.root;
      if (!root || !root.parent || e.instancing === false || e.spec?.instancing === false) continue;
      let vis = true;
      for (let q = root; q; q = q.parent) if (!q.visible) { vis = false; break; }
      if (!vis) continue;
      const n0 = found.length;
      this.walk(root, found);
      if (found.length === n0) continue;
      root.updateWorldMatrix(true, true);
      for (let i = n0; i < found.length; i++) {
        const m = found[i];
        if (!eligible(m)) continue;
        const key = `${m.geometry.id}|${m.material.id}|${m.castShadow ? 1 : 0}|${m.receiveShadow ? 1 : 0}`;
        let G = this.groups.get(key);
        if (!G) { G = { geo: m.geometry, mat: m.material, cast: m.castShadow, recv: m.receiveShadow, im: null, ims: null, cap: 0, ns: 0, list: [], kind: e.kind }; this.groups.set(key, G); }
        G.list.push(m);
      }
    }
    let inst = 0;
    for (const G of this.groups.values()) {
      if (G.list.length < 2) continue;
      let n = 0, ns = 0;
      if (!G.im || G.cap < G.list.length) this.grow(G, Math.max(8, G.list.length * 2));
      for (const m of G.list) {
        if (!clean(m.matrixWorld.elements)) continue;
        const s = worldSphere(m, _s);
        m.__inst = token;            // auch außerhalb des Bildes: das Einzel-Mesh zeichnet nicht
        if (culling.sphereVisible(s.center.x, s.center.y, s.center.z, s.radius, false)) G.im.setMatrixAt(n++, m.matrixWorld);
        if (G.cast && culling.shadowVisible(s.center.x, s.center.y, s.center.z, s.radius)) G.ims.setMatrixAt(ns++, m.matrixWorld);
      }
      G.im.count = n; G.im.visible = n > 0; G.im.instanceMatrix.needsUpdate = true;
      G.ns = ns;
      if (G.ims) { G.ims.count = ns; G.ims.visible = ns > 0; G.ims.instanceMatrix.needsUpdate = true; }
      inst += n;
    }
    this.finish(inst);
  }

  /** Haupt- (und bei Schattenwurf Schatten-)InstancedMesh mit Platz für cap Exemplare (Inhalt wird je Bild neu gefüllt). */
  grow(G, cap) {
    const make = (shadow) => {
      const im = new THREE.InstancedMesh(G.geo, G.mat, cap);
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.castShadow = shadow;
      im.receiveShadow = G.recv;
      im.matrixAutoUpdate = false;
      im.name = `instanzen:${G.kind}`;
      im.userData.owned = false;        // Geometrie/Material gehören dem Modell-Cache
      im.count = 0;
      im.visible = false;
      if (shadow) {
        // nur Schattenpass (view/Culling.js: Hauptpass nie)
        const view = this.view;
        im.frustumCulled = true;
        im.intersectsFrustum = (f) => f === view.culling.sunFrustum && G.ns > 0;
      } else im.frustumCulled = false;
      this.view.three.add(im);
      return im;
    };
    for (const k of ['im', 'ims']) { const old = G[k]; if (old) { old.parent?.remove(old); old.dispose(); G[k] = null; } }
    G.im = make(false);
    if (G.cast) G.ims = make(true);
    G.cap = cap;
  }

  finish(inst = 0) {
    let groups = 0;
    for (const G of this.groups.values()) {
      if (G.list.length < 2 && G.im) { G.im.count = 0; G.im.visible = false; G.ns = 0; if (G.ims) { G.ims.count = 0; G.ims.visible = false; } }
      if (G.im?.visible) groups++;
    }
    this.stats.groups = groups;
    this.stats.instanced = inst;
  }

  dispose() {
    for (const G of this.groups.values()) for (const im of [G.im, G.ims]) if (im) { im.parent?.remove(im); im.dispose(); }
    this.groups.clear();
  }
}

