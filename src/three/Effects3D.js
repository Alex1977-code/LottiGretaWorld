// Partikel-Effekte in 3D – gleiche Schnittstelle wie systems/Effects.js (dust, leaves, sparks),
// damit Hero, Pflaume und Gegner unverändert bleiben. Jede Sorte ist eine InstancedMesh mit
// festem Vorrat; die Bewegung wird je Frame auf der CPU gerechnet (wenige hundert Teilchen).
// Koordinaten der Aufrufe: Weltpixel (wie in Phaser), Umrechnung hier.

import * as THREE from 'three';
import { toX, toY } from './View3D.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();

class Pool {
  constructor(parent, geometry, material, count, opts) {
    this.mesh = new THREE.InstancedMesh(geometry, material, count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    parent.add(this.mesh);
    this.count = count;
    this.items = Array.from({ length: count }, () => ({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rot: 0, vrot: 0, size: 1 }));
    this.opts = opts; // { gravity, shrink, spin }
    this.next = 0;
    this.hide();
  }

  hide() {
    _m.makeScale(0, 0, 0);
    for (let i = 0; i < this.count; i++) this.mesh.setMatrixAt(i, _m);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  emit(px, py, n, speedMin, speedMax, angleMin, angleMax, lifeMin, lifeMax, size) {
    for (let k = 0; k < n; k++) {
      const it = this.items[this.next];
      this.next = (this.next + 1) % this.count;
      const a = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(angleMin, angleMax, Math.random()));
      const sp = THREE.MathUtils.lerp(speedMin, speedMax, Math.random()) / 16; // px/s → Einheiten/s
      it.x = toX(px); it.y = toY(py); it.z = (Math.random() - 0.5) * 0.6 + 0.3;
      // Phaser-Winkel: 0 = rechts, 90 = unten (Y nach unten) → Three: Y nach oben
      it.vx = Math.cos(a) * sp; it.vy = -Math.sin(a) * sp; it.vz = (Math.random() - 0.5) * sp * 0.4;
      it.max = THREE.MathUtils.lerp(lifeMin, lifeMax, Math.random()) / 1000;
      it.life = it.max;
      it.rot = Math.random() * Math.PI * 2;
      it.vrot = (Math.random() - 0.5) * this.opts.spin;
      it.size = size * (0.8 + Math.random() * 0.4);
    }
  }

  update(dt) {
    let any = false;
    const g = this.opts.gravity / 16;
    for (let i = 0; i < this.count; i++) {
      const it = this.items[i];
      if (it.life <= 0) continue;
      any = true;
      it.life -= dt;
      if (it.life <= 0) { _m.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, _m); continue; }
      it.vy -= g * dt;
      it.x += it.vx * dt; it.y += it.vy * dt; it.z += it.vz * dt;
      it.rot += it.vrot * dt;
      const k = it.life / it.max;
      const s = it.size * (this.opts.shrink ? k : 1);
      _p.set(it.x, it.y, it.z);
      _q.setFromEuler(new THREE.Euler(it.rot * 0.7, it.rot, it.rot * 0.3));
      _s.set(s, s, s);
      _m.compose(_p, _q, _s);
      this.mesh.setMatrixAt(i, _m);
    }
    if (any) this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.mesh.parent?.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh.dispose();
  }
}

export class Effects3D {
  constructor(view) {
    this.view = view;
    const group = new THREE.Group();
    view.three.add(group);
    this.group = group;
    this.dustPool = new Pool(group, new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshStandardMaterial({ color: 0xf0e2c8, roughness: 1, transparent: true, opacity: 0.8 }), 96, { gravity: 120, shrink: true, spin: 1 });
    this.leafPool = new Pool(group, new THREE.PlaneGeometry(0.5, 0.35), new THREE.MeshStandardMaterial({ color: 0xe88a3a, roughness: 0.9, side: THREE.DoubleSide }), 96, { gravity: 40, shrink: false, spin: 10 });
    this.sparkPool = new Pool(group, new THREE.SphereGeometry(0.5, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffe066 }), 128, { gravity: 200, shrink: true, spin: 0 });
  }

  /** Staubwolke am Boden. power skaliert Geschwindigkeit. */
  dust(x, y, count = 5, power = 1) {
    this.dustPool.emit(x, y - 1, count, 20 * power, 60 * power, 200, 340, 250, 450, 0.45);
  }

  /** Herabrieselnde Herbstblätter. */
  leaves(x, y, count = 3) {
    this.leafPool.emit(x, y, count, 10, 40, 60, 120, 500, 900, 1);
  }

  /** Funken (Münzen etc.). */
  sparks(x, y, count = 8) {
    this.sparkPool.emit(x, y, count, 40, 110, 0, 360, 200, 400, 0.22);
  }

  update(dt) {
    this.dustPool.update(dt);
    this.leafPool.update(dt);
    this.sparkPool.update(dt);
  }

  dispose() {
    this.dustPool.dispose(); this.leafPool.dispose(); this.sparkPool.dispose();
    this.group.parent?.remove(this.group);
  }
}
