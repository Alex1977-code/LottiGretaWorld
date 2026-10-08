// Schatten-Blob (Pflicht laut Bauplan): dunkle, weiche Scheibe senkrecht unter Figur und Gegnern auf der
// nächsten Oberfläche (raycastDown, auch auf Wasser). Zeigt die Landeposition – wird mit der Höhe etwas
// kleiner und heller. Alle Blobs sind eine InstancedMesh (ein Zeichenaufruf), auf Rampen nach der
// Oberflächennormale gekippt.
//
// Quellen: add({ pos: Vector3 (Fußpunkt), radius, alive?: () => bool | bool, visible?: () => bool }) → Quelle,
// remove(quelle). Entitäten mit `shadow` (Radius) meldet die Level-Laufzeit automatisch an.

import * as THREE from 'three';
import { surfaceNormal } from '../physics/shapes.js';

const MAX = 96;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _n = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

function blobTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.85)');
  grad.addColorStop(0.8, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class BlobShadows {
  constructor(view) {
    this.view = view;
    this.sources = [];
    const geo = new THREE.PlaneGeometry(2, 2);
    geo.rotateX(-Math.PI / 2);
    this.tex = blobTexture();
    this.mat = new THREE.MeshBasicMaterial({
      color: 0x16203a, alphaMap: this.tex, transparent: true, opacity: 0.5, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, fog: true,
    });
    this.mesh = new THREE.InstancedMesh(geo, this.mat, MAX);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    this.mesh.name = 'schatten-blobs';
    for (let i = 0; i < MAX; i++) this.mesh.setMatrixAt(i, ZERO);
    view.three.add(this.mesh);
  }

  add(src) { this.sources.push(src); return src; }
  remove(src) { const i = this.sources.indexOf(src); if (i >= 0) this.sources.splice(i, 1); }

  update(world) {
    let k = 0;
    for (let i = this.sources.length - 1; i >= 0; i--) {
      const s = this.sources[i];
      const alive = typeof s.alive === 'function' ? s.alive() : s.alive !== false;
      if (!alive) { this.sources.splice(i, 1); continue; }
      if (k >= MAX) continue;
      if (s.visible && !s.visible()) continue;
      const p = s.pos;
      const hit = world.raycastDown(p.x, p.y + 0.1, p.z, 40, { water: true });
      if (!hit) continue;
      const h = Math.max(0, p.y - hit.y);
      const r = (s.radius ?? 0.45) * (1 - Math.min(h / 14, 1) * 0.45);
      surfaceNormal(hit.shape, _n);
      _q.setFromUnitVectors(UP, _n);
      _p.set(p.x, hit.y + 0.025, p.z);
      _s.set(r, 1, r);
      _m.compose(_p, _q, _s);
      this.mesh.setMatrixAt(k++, _m);
    }
    for (let i = k; i < (this.lastCount ?? MAX); i++) this.mesh.setMatrixAt(i, ZERO);
    this.lastCount = k;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.mesh.parent?.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mat.dispose();
    this.tex.dispose();
  }
}
