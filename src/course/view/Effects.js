// Partikel des Kurs-Modus (Meter): Staub, Funken, Ziegel-Trümmer, Spritzwasser, Stampf-Ring,
// hochspringende Münze. Je Sorte eine InstancedMesh mit festem Vorrat (ein Zeichenaufruf je Sorte,
// nur wenn Teilchen leben). Alle Aufrufe nehmen {x, y, z}.

import * as THREE from 'three';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _e = new THREE.Euler();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const rand = (a, b) => a + (b - a) * Math.random();

class Pool {
  constructor(parent, geometry, material, count, opts) {
    this.mesh = new THREE.InstancedMesh(geometry, material, count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.count = count;
    this.items = Array.from({ length: count }, () => ({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rot: 0, vrot: 0, size: 1 }));
    this.opts = opts;
    this.next = 0;
    this.alive = 0;
    for (let i = 0; i < count; i++) this.mesh.setMatrixAt(i, ZERO);
    this.mesh.visible = false;
    parent.add(this.mesh);
  }

  emit(n, init) {
    for (let k = 0; k < n; k++) {
      const it = this.items[this.next];
      this.next = (this.next + 1) % this.count;
      it.rot = Math.random() * Math.PI * 2;
      it.vrot = (Math.random() - 0.5) * (this.opts.spin ?? 0);
      init(it, k);
      it.life = it.max;
    }
    this.mesh.visible = true;
  }

  update(dt) {
    if (!this.mesh.visible) return;
    let any = false;
    const g = this.opts.gravity ?? 0;
    for (let i = 0; i < this.count; i++) {
      const it = this.items[i];
      if (it.life <= 0) continue;
      it.life -= dt;
      if (it.life <= 0) { this.mesh.setMatrixAt(i, ZERO); continue; }
      any = true;
      it.vy -= g * dt;
      if (this.opts.drag) { const k = Math.exp(-this.opts.drag * dt); it.vx *= k; it.vz *= k; if (it.vy > 0) it.vy *= k; }
      it.x += it.vx * dt; it.y += it.vy * dt; it.z += it.vz * dt;
      it.rot += it.vrot * dt;
      const t = it.life / it.max;
      const s = it.size * (this.opts.shrink ? Math.min(1, t * 1.6) : this.opts.grow ? 1 + (1 - t) * this.opts.grow : 1);
      _p.set(it.x, it.y, it.z);
      _e.set(it.rot * 0.7, it.rot, it.rot * 0.3);
      if (this.opts.yOnly) _e.set(0, it.rot, 0);
      _q.setFromEuler(_e);
      _s.set(s, s, s);
      _m.compose(_p, _q, _s);
      this.mesh.setMatrixAt(i, _m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (!any) this.mesh.visible = false;
  }

  dispose() {
    this.mesh.parent?.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh.dispose();
  }
}

export class CourseEffects {
  constructor(view) {
    const group = new THREE.Group();
    group.name = 'effekte';
    view.three.add(group);
    this.group = group;
    this.dustPool = new Pool(group, new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshStandardMaterial({ color: 0xf5ecdc, roughness: 1, transparent: true, opacity: 0.85 }), 96, { gravity: -0.6, shrink: true, drag: 3 });
    this.sparkPool = new Pool(group, new THREE.OctahedronGeometry(0.5, 0), new THREE.MeshBasicMaterial({ color: 0xfff07a }), 96, { gravity: 9, shrink: true, spin: 12 });
    this.debrisPool = new Pool(group, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, vertexColors: false }), 48, { gravity: 30, spin: 14 });
    this.debrisColors = new Float32Array(48 * 3).fill(1);
    this.debrisPool.mesh.instanceColor = new THREE.InstancedBufferAttribute(this.debrisColors, 3);
    this.splashPool = new Pool(group, new THREE.SphereGeometry(0.5, 6, 5), new THREE.MeshStandardMaterial({ color: 0xbfeaff, roughness: 0.2, transparent: true, opacity: 0.85 }), 64, { gravity: 22, shrink: true });
    this.coinPool = new Pool(group, new THREE.CylinderGeometry(0.4, 0.4, 0.12, 20).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf7931a, roughness: 0.3, metalness: 0.5, emissive: 0x3a1800 }), 12, { gravity: 30, spin: 0, yOnly: true });
  }

  /** Staubwolke am Boden. */
  dust(p, n = 4, power = 1) {
    this.dustPool.emit(n, (it) => {
      const a = Math.random() * Math.PI * 2, sp = rand(0.8, 2.2) * power;
      it.x = p.x + Math.cos(a) * 0.2; it.y = p.y + 0.1; it.z = p.z + Math.sin(a) * 0.2;
      it.vx = Math.cos(a) * sp; it.vy = rand(0.4, 1.2); it.vz = Math.sin(a) * sp;
      it.max = rand(0.3, 0.55); it.size = rand(0.22, 0.36);
    });
  }

  /** Ring aus Staub (Stampfattacke). */
  ring(p, r = 1.2) {
    const n = 14;
    this.dustPool.emit(n, (it, k) => {
      const a = (k / n) * Math.PI * 2;
      it.x = p.x + Math.cos(a) * 0.3; it.y = p.y + 0.12; it.z = p.z + Math.sin(a) * 0.3;
      it.vx = Math.cos(a) * r * 4; it.vy = 0.6; it.vz = Math.sin(a) * r * 4;
      it.max = 0.45; it.size = 0.32;
    });
  }

  /** Glitzer (Münzen, Sterne). */
  sparks(p, n = 8) {
    this.sparkPool.emit(n, (it) => {
      const a = Math.random() * Math.PI * 2, sp = rand(1.5, 4);
      it.x = p.x; it.y = p.y; it.z = p.z;
      it.vx = Math.cos(a) * sp; it.vy = rand(2, 5); it.vz = Math.sin(a) * sp;
      it.max = rand(0.3, 0.6); it.size = rand(0.08, 0.15);
    });
  }

  /** Trümmer eines Blocks (Farbe 0xRRGGBB). */
  debris(p, color = 0xc86a2e, n = 8) {
    const c = new THREE.Color(color);
    const start = this.debrisPool.next;
    this.debrisPool.emit(n, (it, k) => {
      const a = (k / n) * Math.PI * 2 + Math.random() * 0.5, sp = rand(2.5, 5);
      it.x = p.x + Math.cos(a) * 0.25; it.y = p.y + rand(0.2, 0.8); it.z = p.z + Math.sin(a) * 0.25;
      it.vx = Math.cos(a) * sp; it.vy = rand(5, 10); it.vz = Math.sin(a) * sp;
      it.max = rand(0.8, 1.2); it.size = rand(0.2, 0.32);
    });
    for (let k = 0; k < n; k++) {
      const i = (start + k) % this.debrisPool.count;
      this.debrisColors[i * 3] = c.r; this.debrisColors[i * 3 + 1] = c.g; this.debrisColors[i * 3 + 2] = c.b;
    }
    this.debrisPool.mesh.instanceColor.needsUpdate = true;
  }

  /** Spritzer an der Wasseroberfläche y. */
  splash(p, y) {
    this.splashPool.emit(12, (it) => {
      const a = Math.random() * Math.PI * 2, sp = rand(1, 3);
      it.x = p.x; it.y = y; it.z = p.z;
      it.vx = Math.cos(a) * sp; it.vy = rand(4, 7); it.vz = Math.sin(a) * sp;
      it.max = rand(0.4, 0.7); it.size = rand(0.1, 0.2);
    });
  }

  /** Münze springt aus einem Block (rein optisch, die Münze ist schon gezählt). */
  coinPop(p) {
    this.coinPool.emit(1, (it) => {
      it.x = p.x; it.y = p.y; it.z = p.z; it.vx = 0; it.vy = 11; it.vz = 0;
      it.vrot = 22; it.max = 0.55; it.size = 1;
    });
    this.sparks({ x: p.x, y: p.y + 1.6, z: p.z }, 4);
  }

  update(dt) {
    this.dustPool.update(dt); this.sparkPool.update(dt); this.debrisPool.update(dt);
    this.splashPool.update(dt); this.coinPool.update(dt);
  }

  dispose() {
    for (const p of [this.dustPool, this.sparkPool, this.debrisPool, this.splashPool, this.coinPool]) p.dispose();
    this.group.parent?.remove(this.group);
  }
}
