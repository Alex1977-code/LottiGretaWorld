// Instanz-Pool: viele gleiche, starre Objekte (Münzen, Blöcke) mit wenigen Zeichenaufrufen. Aus einer
// Vorlage (Object3D mit Meshes – eigene Geometrie oder ein Modell aus getModel) wird je Mesh eine
// InstancedMesh; jede Instanz hat Lage, Gier, Maßstab und optional Kippen. Die Vorlage wird nicht
// animiert (model.update entfällt) – für Animiertes einzelne Modelle nutzen.
// Wächst bei Bedarf (Kapazität ×2). frustumCulled = false (Instanzen liegen übers ganze Level verteilt).
//
// Auswahl je Bild (Präzisierung „Leistung und Level-Haken 2“, view.optimize): flush(culling) vor dem Zeichnen schreibt
// nur die Instanzen in die InstancedMeshes, die im Bild liegen oder (castShadow) ihren Schatten ins Bild werfen –
// früher wurden alle Instanzen jedes Levels immer gezeichnet (Münzen ≈ 430 Dreiecke je Stück). Mit `lod` zeichnen
// ferne Instanzen (Abstand zur Kamera > dist m) eine sparsame Vorlage (eigene InstancedMeshes):
//   view.pool(name, makeTemplate, { lod: { dist: 26, make: (vorlage) => template } })   (oder Liste; lod: false = keine)
// Für Motor-Vorlagen (Münze, ?-/Ziegel-/benutzte Blöcke) liegen die Detailstufen in view/lod.js (nach Pool-Name).
// Schnittstelle unverändert: alloc(), set(i, …), hide(i), release(i), dispose().

import * as THREE from 'three';

const _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

/** Meshes einer Vorlage mit Lage relativ zur Wurzel; Begrenzungskugel aller Teile (Wurzel-Koordinaten). */
function partsOf(template) {
  template.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(template.matrixWorld).invert();
  const parts = [];
  const box = new THREE.Box3();
  template.traverse((o) => {
    // Instanz-Gruppen in der Vorlage (z. B. unsichtbare Bruchstücke des Ziegels) lassen sich nicht übernehmen
    if (!o.isMesh || o.isInstancedMesh) return;
    const local = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    parts.push({ geometry: o.geometry, material: o.material, local, mesh: null });
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    box.union(o.geometry.boundingBox.clone().applyMatrix4(local));
  });
  const sphere = new THREE.Sphere();
  if (box.isEmpty()) sphere.set(new THREE.Vector3(), 1); else box.getBoundingSphere(sphere);
  return { parts, sphere };
}

export class InstancePool {
  /**
   * @param {THREE.Object3D} parent
   * @param {THREE.Object3D} template
   * @param {{ capacity?: number, castShadow?: boolean, receiveShadow?: boolean, name?: string,
   *           lod?: false | { dist: number, make: (base: THREE.Object3D) => THREE.Object3D | null } | Array<…> }} opts
   */
  constructor(parent, template, opts = {}) {
    this.parent = parent;
    this.capacity = opts.capacity ?? 16;
    this.castShadow = opts.castShadow ?? true;
    this.receiveShadow = opts.receiveShadow ?? true;
    this.name = opts.name ?? 'pool';
    const t = partsOf(template);
    this.parts = t.parts;
    this.sphere = t.sphere;
    // Detailstufen: [{ dist, parts }] aufsteigend; Stufe 0 = Vorlage
    const lods = opts.lod ? (Array.isArray(opts.lod) ? opts.lod : [opts.lod]) : [];
    this.levels = [{ dist: 0, parts: this.parts }];
    for (const l of lods.slice().sort((a, b) => a.dist - b.dist)) {
      const tpl = l.make?.(template);
      if (tpl) this.levels.push({ dist: l.dist, parts: partsOf(tpl).parts });
    }
    this.used = [];
    this.free = [];
    this.count = 0;
    this.roots = new Float32Array(this.capacity * 16);   // je Instanz die Wurzel-Matrix
    this.shown = new Uint8Array(this.capacity);
    this.bound = new Float32Array(this.capacity * 4);     // Kugel je Instanz (Welt): x, y, z, r
    this.dirty = true;
    this.mode = 'all';                                    // 'all' (alle Plätze wie früher) | 'pick' (Auswahl je Bild)
    this.drawn = 0;
    this.build();
  }

  build() {
    for (const lv of this.levels) {
      for (const part of lv.parts) {
        const old = part.mesh;
        const im = new THREE.InstancedMesh(part.geometry, part.material, this.capacity);
        im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        im.frustumCulled = false;
        im.castShadow = this.castShadow;
        im.receiveShadow = this.receiveShadow;
        im.name = `${this.name}`;
        im.count = 0;
        if (old) { im.visible = old.visible; this.parent.remove(old); old.dispose(); }
        this.parent.add(im);
        part.mesh = im;
      }
    }
    if (this.roots.length < this.capacity * 16) {
      const r = new Float32Array(this.capacity * 16); r.set(this.roots); this.roots = r;
      const s = new Uint8Array(this.capacity); s.set(this.shown); this.shown = s;
      const b = new Float32Array(this.capacity * 4); b.set(this.bound); this.bound = b;
    }
    this.dirty = true;
    this.mode = 'all';
  }

  /** Neue Instanz (unsichtbar bis set()). */
  alloc() {
    if (this.free.length) { const i = this.free.pop(); this.used[i] = true; return i; }
    if (this.count >= this.capacity) { this.capacity *= 2; this.build(); }
    const i = this.count++;
    this.used[i] = true;
    this.shown[i] = 0;
    this.dirty = true;
    return i;
  }

  /** Lage setzen: Position (Fußpunkt), Gier, Maßstab (Zahl oder [x,y,z]), Kippen um X/Z. */
  set(i, x, y, z, yaw = 0, scale = 1, rx = 0, rz = 0) {
    _p.set(x, y, z);
    _e.set(rx, yaw, rz, 'YXZ');
    _q.setFromEuler(_e);
    if (Array.isArray(scale)) _s.set(scale[0], scale[1], scale[2]); else _s.set(scale, scale, scale);
    _m.compose(_p, _q, _s);
    _m.toArray(this.roots, i * 16);
    const c = this.sphere.center, e = _m.elements;
    const k = Math.max(Math.abs(_s.x), Math.abs(_s.y), Math.abs(_s.z));
    const o = i * 4;
    this.bound[o] = e[0] * c.x + e[4] * c.y + e[8] * c.z + e[12];
    this.bound[o + 1] = e[1] * c.x + e[5] * c.y + e[9] * c.z + e[13];
    this.bound[o + 2] = e[2] * c.x + e[6] * c.y + e[10] * c.z + e[14];
    this.bound[o + 3] = this.sphere.radius * k;
    this.shown[i] = 1;
    this.dirty = true;
  }

  hide(i) {
    if (!this.shown[i]) return;
    this.shown[i] = 0;
    this.dirty = true;
  }

  release(i) {
    if (!this.used[i]) return;
    this.used[i] = false;
    this.hide(i);
    this.free.push(i);
  }

  /**
   * Vor dem Zeichnen (CourseView.render): Instanzen in die InstancedMeshes schreiben. Mit Sparmaßnahmen nur die
   * sichtbaren (bzw. schattenwerfenden) Instanzen, ferne in der sparsamen Stufe; sonst wie früher alle Plätze.
   * @param {import('./Culling.js').ViewCulling} culling
   */
  flush(culling) {
    const pick = !!culling?.view?.optimize;
    if (!pick) {
      if (!this.dirty && this.mode === 'all') return;
      this.mode = 'all';
      this.dirty = false;
      for (let l = 0; l < this.levels.length; l++) {
        for (const part of this.levels[l].parts) {
          const im = part.mesh;
          if (l > 0) { im.count = 0; continue; }
          for (let i = 0; i < this.count; i++) {
            if (this.shown[i]) { _m.fromArray(this.roots, i * 16); _m2.multiplyMatrices(_m, part.local); im.setMatrixAt(i, _m2); } else im.setMatrixAt(i, ZERO);
          }
          im.count = this.count;
          im.instanceMatrix.needsUpdate = true;
        }
      }
      this.drawn = this.count;
      return;
    }
    this.mode = 'pick';
    this.dirty = false;
    const L = this.levels, nL = L.length, cast = this.castShadow;
    const fill = this._fill ?? (this._fill = []);
    for (let l = 0; l < nL; l++) fill[l] = 0;
    const cam = culling.camPos;
    let drawn = 0;
    for (let i = 0; i < this.count; i++) {
      if (!this.shown[i]) continue;
      const o = i * 4, x = this.bound[o], y = this.bound[o + 1], z = this.bound[o + 2], r = this.bound[o + 3];
      if (!culling.sphereVisible(x, y, z, r, cast)) continue;
      let l = 0;
      if (nL > 1) {
        const dx = x - cam.x, dy = y - cam.y, dz = z - cam.z, d2 = dx * dx + dy * dy + dz * dz;
        while (l + 1 < nL && d2 > L[l + 1].dist * L[l + 1].dist) l++;
      }
      const j = fill[l]++;
      _m.fromArray(this.roots, i * 16);
      for (const part of L[l].parts) { _m2.multiplyMatrices(_m, part.local); part.mesh.setMatrixAt(j, _m2); }
      drawn++;
    }
    for (let l = 0; l < nL; l++) for (const part of L[l].parts) { part.mesh.count = fill[l]; part.mesh.instanceMatrix.needsUpdate = true; }
    this.drawn = drawn;
  }

  dispose() {
    for (const lv of this.levels) for (const part of lv.parts) { if (part.mesh) { this.parent.remove(part.mesh); part.mesh.dispose(); } }
  }
}
