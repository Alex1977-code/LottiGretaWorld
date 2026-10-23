// Durchsicht hoher Blöcke (Präzisierung „Leistung und Level-Haken 2“, Wunsch aus 4-1): Ein Block, der zwischen Kamera
// und Figur steht, wird weich durchscheinend (Deckkraft bis min), sonst ist er deckend. Die Kollision des Blocks
// sollte camIgnore tragen (die Kamera rückt dann nicht vor die Wand). Nur Darstellung.
//
//   view.xray(mesh, box, { min: 0.28, speed: 8, shadowAbove: 0.6 }) → rec { mesh, box, fade (0..1), min }
//     mesh: eigenes Mesh mit eigenem Material (wird umgeschaltet: transparent/depthWrite/opacity); box: THREE.Box3
//     shadowAbove: unter dieser Deckkraft wirft der Block keinen Sonnenschatten
//   Baustein island mit `xray: true | { min }` nutzt das selbst (blocks/types/island.js).

import * as THREE from 'three';

const _ray = new THREE.Ray(), _hit = new THREE.Vector3(), _head = new THREE.Vector3();

export class XrayWalls {
  constructor(view) {
    this.view = view;
    this.list = [];
  }

  add(mesh, box, o = {}) {
    const rec = { mesh, box, fade: 1, min: o.min ?? 0.28, speed: o.speed ?? 8, shadowAbove: o.shadowAbove ?? 0.6, cast: mesh.castShadow };
    this.list.push(rec);
    return rec;
  }

  /** Je Bild vor dem Zeichnen. */
  update(dt, player) {
    if (!this.list.length) return;
    if (this.list.some((r) => !r.mesh.parent)) this.list = this.list.filter((r) => r.mesh.parent);
    if (!player) return;
    const cam = this.view.camera.position;
    _head.set(player.pos.x, player.pos.y + 0.9, player.pos.z);
    _ray.origin.copy(cam);
    _ray.direction.copy(_head).sub(cam);
    const len = _ray.direction.length();
    _ray.direction.normalize();
    for (const r of this.list) {
      const blocks = !!_ray.intersectBox(r.box, _hit) && _hit.distanceTo(cam) < len - 0.4 && !r.box.containsPoint(_head);
      const want = blocks ? r.min : 1;
      r.fade += (want - r.fade) * Math.min(1, (dt || 0.016) * r.speed);
      if (Math.abs(r.fade - want) < 0.01) r.fade = want;
      const m = r.mesh.material;
      const tr = r.fade < 0.999;
      if (m.transparent !== tr) { m.transparent = tr; m.depthWrite = !tr; m.needsUpdate = true; }
      m.opacity = r.fade;
      r.mesh.castShadow = r.cast && r.fade > r.shadowAbove;
    }
  }

  dispose() { this.list.length = 0; }
}
