// Gegner- und Modell-Instanzen im Motor (Präzisierung „Leistung und Level-Haken 2“). Gleiche Modelle mehrerer
// Entitäten (Registry-Modelle teilen Geometrien und Materialien: neun Flatterkäfer, zwanzig Pilzlinge, Doppelgänger,
// Sterne …) werden je Bild als **eine InstancedMesh je Modellteil** gezeichnet statt je Exemplar und Teil – ohne
// Level-Code. Die Entitäten rechnen und animieren ihre Modelle wie bisher (Knoten-Matrizen werden übernommen);
// sichtbar, Material, Schattenwurf werden jedes Bild neu gelesen.
//
// Regeln je Mesh eines Entitäts-Modells (sonst zeichnet es wie bisher selbst):
//   - gleiche Geometrie + gleiches Material + gleicher Schattenwurf/-empfang bei ≥ 2 sichtbaren Exemplaren im Bild
//     (Instanz-Gruppen im Modell, z. B. Käferbeine, zählen mit all ihren Instanzen)
//   - nicht transparent (Ausnahme: Entität mit `instancing = 'all'`, z. B. Käferflügel), ein Material, kein Skinning/
//     Morph, renderOrder 0, kein eigener Render-Haken, frustumCulled, Weltmatrix ohne Scherung/Spiegelung
//     (Normalen wie beim Einzel-Mesh)
//   - je Exemplar wird geprüft, ob es im Bild liegt bzw. (castShadow) seinen Schatten ins Bild wirft (view/Culling.js);
//     je Gruppe zwei InstancedMeshes: eine für den Hauptpass (nur Exemplare im Bild), eine nur für den Schattenpass
//     (nur Exemplare, deren Schatten ins Bild fallen kann)
// Detailstufe ferner Exemplare (view/lod.js, nach Art; z. B. Käfer ≈ 4500 → ≈ 650 Dreiecke ab 22 m Kameraabstand):
//   das volle Modell zeichnet dann nur die Teile, die die Stufe behält (Flügel), dazu die sparsame Vorlage.
// Abschalten: Entität `instancing = false` (bzw. spec.instancing: false), ganzes Level LEVEL.instancing = false.
// Die Einzel-Meshes werden nur im Zeichnen übergangen (view/Culling.js: mesh.__inst), visible bleibt unangetastet.
//
// Präzisierung (Motor-Feinschliff nach Welt 6):
//   - Regeln je Art aus `LEVEL.instances[kind]` bzw. `view.instanceRule(kind, rule)` gelten jetzt auch für die
//     Entitäts-Modelle (vorher nur für Instanz-Gruppen/Pools): `shadow: false` – kein Sonnenschatten, `shadowDist: m` –
//     weiter als m (waagerecht) von der Haupt-Figur kein Sonnenschatten; `farHide` blendet Level.render aus. Eine Art mit
//     Regel zeichnet auch als einzelnes Exemplar über die Instanz-Gruppe (die Regel wirkt je Exemplar); Teile, die nicht
//     instanziert werden können, überspringen nur den Schattenpass (mesh.__noSun, view/Culling.js).
//   - Schatten-Stellvertreter (view/lod.js, shadowStandIn): Geometrien mit sparsamer Vorlage (Stachelkugel ≈ 5,7 k →
//     ≈ 1 k Dreiecke) zeichnen im Schattenpass die Vorlage – auch als einzelnes Exemplar (Gruppe zwingend instanziert).

import * as THREE from 'three';
import { modelLod, shadowStandIn } from './lod.js';

const DEFAULT_HOOK = THREE.Object3D.prototype.onBeforeRender;
const DEFAULT_SHADOW_HOOK = THREE.Object3D.prototype.onBeforeShadow;
const _s = new THREE.Sphere(), _m = new THREE.Matrix4(), _mi = new THREE.Matrix4(), _c = new THREE.Vector3();

function eligible(m, all) {
  if (!m.isMesh || m.isSkinnedMesh || m.isBatchedMesh || !m.frustumCulled || m.renderOrder !== 0) return false;
  const mat = m.material;
  if (!mat || Array.isArray(mat) || (mat.transparent && !all) || !mat.visible) return false;
  if (m.onBeforeRender !== DEFAULT_HOOK || m.onBeforeShadow !== DEFAULT_SHADOW_HOOK || m.customDepthMaterial || m.shadowProxied) return false;
  const g = m.geometry;
  if (!g?.attributes?.position || g.morphAttributes?.position?.length) return false;
  if (m.isInstancedMesh && (m.count < 1 || m.instanceColor || m.morphTexture)) return false;
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

/** Kugel einer Geometrie unter Matrix e (Elemente) → _s. */
function sphereOf(g, e) {
  if (!g.boundingSphere) g.computeBoundingSphere();
  return _s.copy(g.boundingSphere).applyMatrix4(_m.fromArray(e));
}

export class EntityInstancer {
  /** @param {import('./CourseView.js').CourseView} view */
  constructor(view) {
    this.view = view;
    this.groups = new Map();     // Schlüssel → Gruppe { geo, mat, cast, recv, im, ims, cap, n, mats: Float32Array, force }
    this.found = [];
    this.stats = { groups: 0, instanced: 0, lod: 0, ruled: 0, shadowLow: 0 };
    this.lods = new WeakMap();   // Entität → { parts: [{ geometry, material, local, cast, recv }], anchor } | null
  }

  group(geo, mat, cast, recv, kind) {
    const key = `${geo.id}|${mat.id}|${cast ? 1 : 0}|${recv ? 1 : 0}`;
    let G = this.groups.get(key);
    if (!G) {
      // Schattenpass mit sparsamer Vorlage (Stachelkugel …), sonst dieselbe Geometrie
      const sgeo = (cast && shadowStandIn(geo)) || geo;
      G = { geo, sgeo, mat, cast, recv, im: null, ims: null, cap: 0, n: 0, ns: 0, mats: new Float32Array(16 * 8), owners: [], nos: [], force: false, kind, transparent: !!mat.transparent };
      this.groups.set(key, G);
    }
    return G;
  }

  /** Matrix (Elemente e) als Kandidat in G (owner = Mesh, das bei Instanzierung nicht selbst zeichnet; noSun = ohne Schatten). */
  push(G, e, owner, noSun = false) {
    if (G.mats.length < (G.n + 1) * 16) { const a = new Float32Array(G.mats.length * 2); a.set(G.mats); G.mats = a; }
    G.mats.set(e, G.n * 16);
    G.owners[G.n] = owner;
    G.nos[G.n] = noSun;
    G.n++;
  }

  /** Sichtbare Meshes eines Modells (Abstieg nur in sichtbare Knoten). */
  walk(node, out) {
    if (!node.visible) return;
    if (node.isMesh) out.push(node);
    const ch = node.children;
    for (let i = 0; i < ch.length; i++) this.walk(ch[i], out);
  }

  /**
   * Mesh m (sichtbar) einsortieren; false = zeichnet selbst. noSun: dieses Exemplar ohne Sonnenschatten (Regel der Art);
   * force: Gruppe auch mit einem Exemplar instanziert zeichnen (Regel der Art).
   */
  addMesh(m, all, kind, noSun = false, force = false) {
    if (!eligible(m, all)) { if (noSun) m.__noSun = this.view.frame; return false; }
    const G = this.group(m.geometry, m.material, m.castShadow, m.receiveShadow, kind);
    if (force || G.sgeo !== G.geo) G.force = true;
    if (m.isInstancedMesh) {
      const n0 = G.n;
      for (let j = 0; j < m.count; j++) {
        m.getMatrixAt(j, _mi);
        _m.multiplyMatrices(m.matrixWorld, _mi);
        if (!clean(_m.elements)) { G.n = n0; if (noSun) m.__noSun = this.view.frame; return false; }
        this.push(G, _m.elements, null, noSun);
      }
      G.owners[n0] = m;              // ganze Gruppe gehört einem Mesh
      return true;
    }
    this.push(G, m.matrixWorld.elements, m, noSun);
    return true;
  }

  /** Je Bild vor dem Zeichnen (nach Kamera und Animationen). */
  update(level, culling) {
    const v = this.view;
    for (const G of this.groups.values()) { G.n = 0; G.force = false; }
    if (!v.optimize || !level || level.data?.instancing === false) { this.finish(); return; }
    const found = this.found;
    const token = v.frame;
    const cam = culling.camPos;
    const rules = v.instanceRules ?? {};
    const focus = level.players?.[0]?.pos ?? level.player?.pos ?? null;
    let lodN = 0, ruled = 0;
    for (const e of level.entities) {
      const root = e.model?.root;
      if (!root || !root.parent || e.instancing === false || e.spec?.instancing === false) continue;
      let vis = true;
      for (let q = root; q; q = q.parent) if (!q.visible) { vis = false; break; }
      if (!vis) continue;
      found.length = 0;
      this.walk(root, found);
      if (!found.length) continue;
      root.updateWorldMatrix(true, true);
      // Regel der Art (LEVEL.instances[kind]): Sonnenschatten nur nah bzw. nie
      const rule = rules[e.kind];
      let noSun = false;
      if (rule) {
        ruled++;
        if (rule.shadow === false) noSun = true;
        else if (rule.shadowDist > 0 && focus && Math.hypot(e.pos.x - focus.x, e.pos.z - focus.z) > rule.shadowDist) noSun = true;
      }
      const force = !!rule;
      // Detailstufe ferner Exemplare
      const lod = this.lodOf(e);
      const all = e.instancing === 'all' || !!lod?.all;
      const ld = e.lodDist ?? lod?.dist;
      if (lod && cam.distanceToSquared(e.pos) > ld * ld) {
        const anchor = lod.anchor(root);
        for (const m of found) {
          if (lod.keep?.(m)) { if (!this.addMesh(m, true, e.kind, noSun, force)) continue; }
          else m.__inst = token;
        }
        for (const p of lod.parts) {
          const G = this.group(p.geometry, p.material, p.cast && anchorCasts(found), p.recv, e.kind);
          G.force = true;
          _m.multiplyMatrices(anchor.matrixWorld, p.local);
          this.push(G, _m.elements, null, noSun);
        }
        lodN++;
        continue;
      }
      for (const m of found) this.addMesh(m, all, e.kind, noSun, force);
    }
    this.stats.ruled = ruled;
    let inst = 0, lowS = 0;
    for (const G of this.groups.values()) {
      if (G.n < 2 && !G.force) continue;
      if (!G.im || G.cap < G.n) this.grow(G, Math.max(8, G.n * 2));
      // durchsichtige Gruppen: Lage der InstancedMesh im Schwerpunkt (Sortierung der Durchsichtigen wie bisher je Objekt)
      let ox = 0, oy = 0, oz = 0;
      if (G.transparent) {
        for (let i = 0; i < G.n; i++) { ox += G.mats[i * 16 + 12]; oy += G.mats[i * 16 + 13]; oz += G.mats[i * 16 + 14]; }
        ox /= G.n; oy /= G.n; oz /= G.n;
        for (const im of [G.im, G.ims]) if (im) { im.matrix.makeTranslation(ox, oy, oz); im.matrixWorld.copy(im.matrix); }
      }
      let n = 0, ns = 0;
      for (let i = 0; i < G.n; i++) {
        const o = G.owners[i];
        if (o) o.__inst = token;      // auch außerhalb des Bildes: das Einzel-Mesh zeichnet nicht
        const e = G.mats.subarray(i * 16, i * 16 + 16);
        const s = sphereOf(G.geo, e);
        const inC = culling.sphereVisible(s.center.x, s.center.y, s.center.z, s.radius, false);
        const inS = G.cast && !G.nos[i] && culling.shadowVisible(s.center.x, s.center.y, s.center.z, s.radius);
        if (!inC && !inS) continue;
        _m.fromArray(e);
        if (G.transparent) { _m.elements[12] -= ox; _m.elements[13] -= oy; _m.elements[14] -= oz; }
        if (inC) G.im.setMatrixAt(n++, _m);
        if (inS) G.ims.setMatrixAt(ns++, _m);
      }
      G.im.count = n; G.im.visible = n > 0; G.im.instanceMatrix.needsUpdate = true;
      G.ns = ns;
      if (G.ims) { G.ims.count = ns; G.ims.visible = ns > 0; G.ims.instanceMatrix.needsUpdate = true; }
      if (G.sgeo !== G.geo) lowS += ns;
      inst += n;
    }
    this.stats.lod = lodN;
    this.stats.shadowLow = lowS;
    this.finish(inst);
  }

  /** Detailstufe der Entität (einmal gebaut; null = keine). */
  lodOf(e) {
    if (this.lods.has(e)) return this.lods.get(e);
    const def = modelLod(e);
    let lod = null;
    if (def) {
      const tpl = def.make(e);
      if (tpl) {
        tpl.updateMatrixWorld(true);
        const parts = [];
        tpl.traverse((o) => { if (o.isMesh && !o.isInstancedMesh) parts.push({ geometry: o.geometry, material: o.material, local: o.matrixWorld.clone(), cast: o.castShadow, recv: o.receiveShadow }); });
        lod = { dist: def.dist, parts, anchor: def.anchor ?? ((root) => root), keep: def.keep ?? null, all: !!def.all };
      }
    }
    this.lods.set(e, lod);
    return lod;
  }

  /** Haupt- (und bei Schattenwurf Schatten-)InstancedMesh mit Platz für cap Exemplare (Inhalt wird je Bild neu gefüllt). */
  grow(G, cap) {
    const make = (shadow) => {
      const im = new THREE.InstancedMesh(shadow ? G.sgeo : G.geo, G.mat, cap);
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.castShadow = shadow;
      im.receiveShadow = G.recv;
      im.matrixAutoUpdate = false;
      im.matrixWorldAutoUpdate = false;
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
      if (G.n < 2 && !G.force && G.im) { G.im.count = 0; G.im.visible = false; G.ns = 0; if (G.ims) { G.ims.count = 0; G.ims.visible = false; } }
      if (G.im?.visible) groups++;
    }
    this.stats.groups = groups;
    this.stats.instanced = inst;
  }

  dispose() {
    for (const G of this.groups.values()) for (const im of [G.im, G.ims]) if (im) { im.parent?.remove(im); im.dispose(); }
    this.groups.clear();
    this.lods = new WeakMap();
  }
}

/** Wirft das volle Modell (sichtbare Teile) einen Sonnenschatten? Dann auch seine Detailstufe. */
function anchorCasts(found) {
  for (const m of found) if (m.castShadow) return true;
  return false;
}
