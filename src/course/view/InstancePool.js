// Instanz-Pool: viele gleiche, starre Objekte (Münzen, Blöcke) mit wenigen Zeichenaufrufen. Aus einer
// Vorlage (Object3D mit Meshes – eigene Geometrie oder ein Modell aus getModel) wird je Mesh eine
// InstancedMesh; jede Instanz hat Lage, Gier, Maßstab und optional Kippen. Die Vorlage wird nicht
// animiert (model.update entfällt) – für Animiertes einzelne Modelle nutzen.
// Wächst bei Bedarf (Kapazität ×2). frustumCulled = false (Instanzen liegen übers ganze Level verteilt).

import * as THREE from 'three';

const _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

export class InstancePool {
  /**
   * @param {THREE.Object3D} parent
   * @param {THREE.Object3D} template
   * @param {{ capacity?: number, castShadow?: boolean, receiveShadow?: boolean, name?: string }} opts
   */
  constructor(parent, template, opts = {}) {
    this.parent = parent;
    this.capacity = opts.capacity ?? 16;
    this.castShadow = opts.castShadow ?? true;
    this.receiveShadow = opts.receiveShadow ?? true;
    this.name = opts.name ?? 'pool';
    template.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(template.matrixWorld).invert();
    this.parts = [];
    template.traverse((o) => {
      if (!o.isMesh) return;
      const local = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
      this.parts.push({ geometry: o.geometry, material: o.material, local, mesh: null });
    });
    this.matrices = []; // je Instanz die Wurzel-Matrix
    this.used = [];
    this.free = [];
    this.count = 0;
    this.build();
  }

  build() {
    for (const part of this.parts) {
      const old = part.mesh;
      const im = new THREE.InstancedMesh(part.geometry, part.material, this.capacity);
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.frustumCulled = false;
      im.castShadow = this.castShadow;
      im.receiveShadow = this.receiveShadow;
      im.name = `${this.name}`;
      for (let i = 0; i < this.capacity; i++) im.setMatrixAt(i, ZERO);
      if (old) {
        for (let i = 0; i < this.count; i++) { old.getMatrixAt(i, _m); im.setMatrixAt(i, _m); }
        this.parent.remove(old);
        old.dispose();
      }
      im.count = this.count;
      this.parent.add(im);
      part.mesh = im;
    }
  }

  /** Neue Instanz (unsichtbar bis set()). */
  alloc() {
    if (this.free.length) { const i = this.free.pop(); this.used[i] = true; return i; }
    if (this.count >= this.capacity) { this.capacity *= 2; this.build(); }
    const i = this.count++;
    this.used[i] = true;
    for (const part of this.parts) part.mesh.count = this.count;
    return i;
  }

  /** Lage setzen: Position (Fußpunkt), Gier, Maßstab (Zahl oder [x,y,z]), Kippen um X/Z. */
  set(i, x, y, z, yaw = 0, scale = 1, rx = 0, rz = 0) {
    _p.set(x, y, z);
    _e.set(rx, yaw, rz, 'YXZ');
    _q.setFromEuler(_e);
    if (Array.isArray(scale)) _s.set(scale[0], scale[1], scale[2]); else _s.set(scale, scale, scale);
    _m.compose(_p, _q, _s);
    for (const part of this.parts) {
      _m2.multiplyMatrices(_m, part.local);
      part.mesh.setMatrixAt(i, _m2);
      part.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  hide(i) {
    for (const part of this.parts) { part.mesh.setMatrixAt(i, ZERO); part.mesh.instanceMatrix.needsUpdate = true; }
  }

  release(i) {
    if (!this.used[i]) return;
    this.used[i] = false;
    this.hide(i);
    this.free.push(i);
  }

  dispose() {
    for (const part of this.parts) { if (part.mesh) { this.parent.remove(part.mesh); part.mesh.dispose(); } }
  }
}
