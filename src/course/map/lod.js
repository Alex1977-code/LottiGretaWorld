// Fern-Ausblendung kleiner Kartenobjekte (Eingänge, Schranken, Gegnergruppe, Schilder, Kulissen-Effekte): liegt ihre
// Hüllkugel weiter als FAR m vor der Kamera, werden sie nicht gezeichnet – auch nicht im Schattenpass. Normale
// Kartenansichten reichen nicht so weit (Blick schräg von oben, < 60 m); wirksam ist sie beim Anflug und bei der
// Ankunft durch die Glasröhre, wenn die Kamera über die ganze Insel blickt (dort sind diese Objekte nur wenige Pixel
// groß und liegen im Dunst). Statische Kacheln, Himmel, Umgebung und die Heldin bleiben unberührt.
//
// Umgesetzt über Ebenen (Object3D.layers) statt `visible`, damit Sichtbarkeits-Schalter der Objekte selbst (Schloss,
// Ring, Flagge …) unangetastet bleiben.

import * as THREE from 'three';

export const LOD_FAR = 90;     // m: Abstand Kamera – Rand der Hüllkugel
const MAX_R = 20;              // größere Objekte (Glasröhren übers Meer) bleiben immer sichtbar
const SKIP = new Set(['himmel', 'karte:umgebung', 'schatten-blobs', 'effekte', 'heldin']);

const PAUSES = new WeakMap();   // shadowMap → { n, auto }

/**
 * Schattenkarte beim nächsten Bild noch einmal zeichnen und danach ruhen lassen (kein Schattenpass) – für Kamerafahrten
 * mit Blick über die ganze Insel, bei denen sich im Schattenbereich nichts bewegt (Anflug: Heldin steht) bzw. nur Meer
 * liegt (Ankunft durch die Glasröhre). Gibt resume() zurück (mehrfach aufrufbar). Der Renderer ist gemeinsam:
 * Pausen werden gezählt, die letzte resume() stellt den alten Zustand her; spätestens beim Aufräumen aufrufen.
 */
export function pauseShadows(view) {
  const sm = view?.renderer?.shadowMap;
  if (!sm) return () => {};
  let p = PAUSES.get(sm);
  if (!p) { p = { n: 0, auto: sm.autoUpdate }; PAUSES.set(sm, p); }
  p.n++;
  sm.autoUpdate = false;
  sm.needsUpdate = true;
  let done = false;
  return () => {
    if (done) return;
    done = true;
    if (--p.n <= 0) { sm.autoUpdate = p.auto; PAUSES.delete(sm); }
  };
}

export class MapLod {
  /**
   * @param {object} view CourseView
   * @param {{ exclude?: object[], movers?: { root: object, pos: THREE.Vector3, r?: number }[] }} opts
   *        movers = Objekte, die sich bewegen (Mitte = pos, jedes Bild neu)
   */
  constructor(view, { exclude = [], movers = [] } = {}) {
    this.view = view;
    this.units = [];
    const ex = new Set(exclude.filter(Boolean));
    const mv = new Map(movers.filter((m) => m?.root).map((m) => [m.root, m]));
    const box = new THREE.Box3(), sph = new THREE.Sphere();
    view.three.updateMatrixWorld(true);
    for (const o of view.three.children) {
      if (ex.has(o) || SKIP.has(o.name) || o.isLight) continue;
      const meshes = [];
      o.traverse((c) => { if (c.isMesh || c.isSprite || c.isPoints || c.isLine) meshes.push(c); });
      if (!meshes.length) continue;
      const m = mv.get(o);
      if (m) { this.units.push({ meshes, pos: m.pos, r: m.r ?? 2, far: false }); continue; }
      box.setFromObject(o);
      if (box.isEmpty()) continue;
      box.getBoundingSphere(sph);
      if (sph.radius > MAX_R) continue;
      this.units.push({ meshes, pos: sph.center.clone(), r: sph.radius, far: false });
    }
    this.off = view.onFrame(() => this.update());
  }

  /** Je Bild (vor dem Zeichnen, nach der Kamera). */
  update() {
    const cam = this.view.camera.position;
    for (const u of this.units) {
      const far = cam.distanceTo(u.pos) - u.r > LOD_FAR;
      if (far !== u.far) this.set(u, far);
    }
  }

  set(u, far) {
    u.far = far;
    for (const m of u.meshes) {
      if (far) { m.userData.lodMask = m.layers.mask; m.layers.disableAll(); } else m.layers.mask = m.userData.lodMask ?? 1;
    }
  }

  info() { return { units: this.units.length, hidden: this.units.filter((u) => u.far).length }; }

  dispose() {
    this.off?.();
    this.off = null;
    for (const u of this.units) if (u.far) this.set(u, false);
    this.units = [];
  }
}
