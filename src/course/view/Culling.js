// Sicht- und Schattenprüfung der Kurs-Ansicht (Präzisierung „Leistung und Level-Haken 2“). Nur Darstellung – nichts
// wird umgeschaltet (visible/castShadow bleiben, wie Level-Code sie setzt); geprüft wird beim Zeichnen:
//
// - **Schattenpass:** Ein Objekt wirft nur dann in die Schattenkarte, wenn sein Schatten die Kamera-Sicht überhaupt
//   erreichen kann: die Begrenzungskugel (bzw. der Quader statischer Abschnitte) wird entlang des Sonnenlichts bis
//   unter den Level-Umriss verlängert und gegen die Sichtpyramide der Kamera geprüft (konservativ: was den Schatten ins
//   Bild werfen könnte, bleibt). Gilt für alle Meshes mit frustumCulled (Gegner, Heldin, Modelle, Abschnitte).
// - **Statische Abschnitte** (StaticBatcher): Quader statt Begrenzungskugel gegen die Sichtpyramide – die Kugeln der
//   32-m-Abschnitte (Radius ≈ 35 m und mehr) reichen sonst weit über das Bild hinaus.
// - Für Instanz-Pools/Instanzierer: `view.culling.sphereVisible(x, y, z, r, cast)` und `.boxVisible(box, cast)`
//   (Kamera oder – mit cast – Schattenwurf ins Bild), `.camFrustum`, `.camPos`.
//
// Umsetzung: three.js prüft je Mesh `object.intersectsFrustum(frustum)` – im Hauptpass mit der Kamera-Pyramide, im
// Schattenpass mit `sun.shadow.getFrustum()`. Mesh.prototype.intersectsFrustum wird einmal ergänzt; außerhalb von
// CourseView.render (ACTIVE = null) verhält sie sich wie bisher.

import * as THREE from 'three';

let ACTIVE = null;
const _sphere = new THREE.Sphere(), _box = new THREE.Box3(), _m = new THREE.Matrix4(), _v = new THREE.Vector3();

/** Begrenzungskugel eines Objekts in Weltkoordinaten (wie Frustum.intersectsObject). */
export function worldSphere(object, out = _sphere) {
  if (object.boundingSphere !== undefined) {
    if (object.boundingSphere === null) object.computeBoundingSphere();
    out.copy(object.boundingSphere).applyMatrix4(object.matrixWorld);
  } else {
    const g = object.geometry;
    if (g.boundingSphere === null) g.computeBoundingSphere();
    out.copy(g.boundingSphere).applyMatrix4(object.matrixWorld);
  }
  return out;
}

const base = THREE.Mesh.prototype.intersectsFrustum;
if (!THREE.Mesh.prototype.__kursCulling) {
  THREE.Mesh.prototype.__kursCulling = true;
  THREE.Mesh.prototype.intersectsFrustum = function (frustum) {
    const c = ACTIVE;
    if (!c) return base.call(this, frustum);
    if (this.__inst === c.view.frame) return false;                     // zeichnet als Instanz (EntityInstancer.js)
    if (this.shadowProxied && frustum === c.sunFrustum) return false;   // Schatten zeichnet der Stellvertreter (ShadowProxy.js)
    if (this.cullBox) return c.boxTest(this, frustum);
    if (!base.call(this, frustum)) return false;
    if (frustum !== c.sunFrustum || !c.shadowCull) return true;
    const s = worldSphere(this);
    return c.sweptSphereInView(s.center.x, s.center.y, s.center.z, s.radius);
  };
}

export class ViewCulling {
  /** @param {import('./CourseView.js').CourseView} view */
  constructor(view) {
    this.view = view;
    this.camFrustum = new THREE.Frustum();
    this.sunFrustum = view.sun.shadow.getFrustum();
    this.camPos = new THREE.Vector3();
    this.light = new THREE.Vector3(0, -1, 0);   // Lichtrichtung (von der Sonne weg)
    this.floorY = -40;
    this.shadowCull = true;
    this.stats = { shadowSkipped: 0 };
  }

  /** Vor dem Zeichnen: Pyramide der Kamera, Lichtrichtung, Boden für die Schattenverlängerung. */
  begin() {
    const v = this.view, cam = v.camera;
    if (!v.optimize) { ACTIVE = null; return; }
    cam.updateMatrixWorld();
    this.camFrustum.setFromProjectionMatrix(_m.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse), THREE.WebGLCoordinateSystem, cam.reversedDepth);
    this.camPos.setFromMatrixPosition(cam.matrixWorld);
    this.light.copy(v.sunDir).negate().normalize();
    this.shadowCull = v.sun.castShadow && this.light.y < -0.05;
    const b = v.bounds;
    this.floorY = (b ? Math.min(b.min.y, 0) : 0) - 8;
    this.sunFrustum = v.sun.shadow.getFrustum();
    this.prepareShadow();
    this.stats.shadowSkipped = 0;
    ACTIVE = this;
  }

  /** Schattenkörper-Matrizen schon vor dem Zeichnen (für Pools, die selbst auswählen). */
  prepareShadow() {
    const sun = this.view.sun;
    if (!sun.castShadow) return false;
    sun.updateMatrixWorld();
    sun.target.updateMatrixWorld();
    sun.shadow.updateMatrices(sun);
    return true;
  }

  end() { ACTIVE = null; }

  /** Länge der Verlängerung entlang des Lichts von Höhe y bis zum Boden. */
  sweep(y) { return Math.max(0, y - this.floorY) / Math.max(0.2, -this.light.y); }

  /** Kugel, entlang des Lichts bis zum Boden verlängert: kann ihr Schatten ins Bild fallen? */
  sweptSphereInView(x, y, z, r) {
    const L = this.light, t = this.sweep(y + r);
    const bx = x + L.x * t, by = y + L.y * t, bz = z + L.z * t;
    for (const p of this.camFrustum.planes) {
      const n = p.normal;
      const a = n.x * x + n.y * y + n.z * z + p.constant, b = n.x * bx + n.y * by + n.z * bz + p.constant;
      if (a < -r && b < -r) { this.stats.shadowSkipped++; return false; }
    }
    return true;
  }

  /** Quader (Weltkoordinaten), entlang des Lichts verlängert: kann sein Schatten ins Bild fallen? */
  sweptBoxInView(box) {
    const L = this.light, t = this.sweep(box.max.y);
    const cx = (box.min.x + box.max.x) / 2, cy = (box.min.y + box.max.y) / 2, cz = (box.min.z + box.max.z) / 2;
    const ex = (box.max.x - box.min.x) / 2, ey = (box.max.y - box.min.y) / 2, ez = (box.max.z - box.min.z) / 2;
    for (const p of this.camFrustum.planes) {
      const n = p.normal;
      const reach = Math.abs(n.x) * ex + Math.abs(n.y) * ey + Math.abs(n.z) * ez;
      const a = n.x * cx + n.y * cy + n.z * cz + p.constant;
      const b = a + (n.x * L.x + n.y * L.y + n.z * L.z) * t;
      if (a < -reach && b < -reach) { this.stats.shadowSkipped++; return false; }
    }
    return true;
  }

  /** Statischer Abschnitt (mesh.cullBox = true): Quader gegen Kamera bzw. Schattenkörper + Schattenwurf ins Bild. */
  boxTest(mesh, frustum) {
    const g = mesh.geometry;
    if (!g.boundingBox) g.computeBoundingBox();
    const box = mesh.matrixWorld.equals(IDENT) ? g.boundingBox : _box.copy(g.boundingBox).applyMatrix4(mesh.matrixWorld);
    if (!frustum.intersectsBox(box)) return false;
    if (frustum === this.sunFrustum && this.shadowCull) return this.sweptBoxInView(box);
    return true;
  }

  /** Für eigene Auswahl (Pools): Kugel sichtbar oder (cast) ihr Schatten im Bild. */
  sphereVisible(x, y, z, r, cast = false) {
    _sphere.center.set(x, y, z); _sphere.radius = r;
    if (this.camFrustum.intersectsSphere(_sphere)) return true;
    if (!cast || !this.view.sun.castShadow) return false;
    if (!this.sunFrustum.intersectsSphere(_sphere)) return false;
    return !this.shadowCull || this.sweptSphereInView(x, y, z, r);
  }

  /** Nur Schatten: liegt die Kugel im Schattenkörper und kann ihr Schatten ins Bild fallen? */
  shadowVisible(x, y, z, r) {
    if (!this.view.sun.castShadow) return false;
    _sphere.center.set(x, y, z); _sphere.radius = r;
    if (!this.sunFrustum.intersectsSphere(_sphere)) return false;
    return !this.shadowCull || this.sweptSphereInView(x, y, z, r);
  }

  boxVisible(box, cast = false) {
    if (this.camFrustum.intersectsBox(box)) return true;
    if (!cast || !this.view.sun.castShadow) return false;
    if (!this.sunFrustum.intersectsBox(box)) return false;
    return !this.shadowCull || this.sweptBoxInView(box);
  }

  distanceTo(x, y, z) { return _v.set(x, y, z).distanceTo(this.camPos); }
}

const IDENT = new THREE.Matrix4();
