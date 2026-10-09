// Feuerspur (1-Burg, Bosskampf Phase 3): brennende Flecken auf der Fahrbahn, die kurz brennen und mit der
// fahrenden Straße auf die Figur zu wandern. Eine Entität verwaltet alle Flecken (ein Zeichenaufruf für die
// Flammen, einer für die Glut am Boden). Berührung verletzt die Figur (normaler Treffer); Flammen 0,7 m hoch –
// darüber springen oder durch eine Lücke gehen.
//
// Daten: { kind: 'fire_trail', id?, drift: [0, 0, 6] (m/s, Wanderung der Flecken), life: 2.4 (s Brenndauer),
//          r: 0.42 (halbe Breite eines Flecks), zMax?: Flecken hinter dieser z-Linie verlöschen,
//          max: 96 (Vorrat) }
// API: emit(x, y, z) → Fleck (Boden y), clear(), count (brennende Flecken).
// Fleck: { x, y, z, t, life } – Ausbrennen: wächst 0,15 s auf, flackert, schrumpft die letzten 0,4 s.

import * as THREE from 'three';
import { CourseEntity } from '../CourseEntity.js';
import { colorize, merge, lin, mixc, smooth } from '../../../three/world/geometry.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

let FLAME = null, GLOW = null;
function flameGeo() {
  if (FLAME) return FLAME;
  const parts = [];
  const tongues = [[0, 0, 0, 0.26, 0.72], [0.17, 0, 0.1, 0.17, 0.5], [-0.15, 0, -0.08, 0.18, 0.55], [0.02, 0, -0.18, 0.15, 0.42]];
  const outer = lin(0xff5a1a), mid = lin(0xffa21a), core = lin(0xfff07a);
  for (const [x, y, z, r, h] of tongues) {
    const g = new THREE.ConeGeometry(r, h, 7, 2);
    g.translate(x, y + h / 2, z);
    parts.push(colorize(g.toNonIndexed(), (p, n, o) => {
      const k = (p.y - y) / h;
      return mixc(k < 0.5 ? outer : mid, k < 0.5 ? mid : core, smooth(0, 1, (k % 0.5) * 2), o);
    }));
  }
  FLAME = merge(parts);
  return FLAME;
}
function glowGeo() {
  if (GLOW) return GLOW;
  const g = new THREE.CircleGeometry(0.62, 14);
  g.rotateX(-Math.PI / 2);
  const c0 = lin(0xff8a2a), c1 = lin(0x3a1408);
  GLOW = colorize(g.toNonIndexed(), (p, n, o) => mixc(c0, c1, smooth(0.1, 0.62, Math.hypot(p.x, p.z)), o));
  return GLOW;
}

class FireTrail extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'fire_trail');
    this.touch = false;
    this.shadow = 0;
    const d = spec.drift ?? [0, 0, 6];
    this.drift = { x: d[0], y: d[1], z: d[2] };
    this.life = spec.life ?? 2.4;
    this.r = spec.r ?? 0.42;
    this.zMax = spec.zMax ?? Infinity;
    this.max = spec.max ?? 96;
    this.patches = [];
    this.emitted = 0;
    this.hits = 0;
    this.src = { pos: new THREE.Vector3() };
    if (level.view) {
      this.flames = new THREE.InstancedMesh(flameGeo(), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false }), this.max);
      this.glows = new THREE.InstancedMesh(glowGeo(), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }), this.max);
      for (const im of [this.flames, this.glows]) {
        im.frustumCulled = false;
        im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        for (let i = 0; i < this.max; i++) im.setMatrixAt(i, ZERO);
        im.count = 0;
        im.renderOrder = 2;
        level.view.add(im);
      }
    }
  }

  get count() { return this.patches.length; }

  emit(x, y, z) {
    if (this.patches.length >= this.max) this.patches.shift();
    const p = { x, y, z, t: 0, life: this.life, seed: (this.emitted * 0.618) % 1 };
    this.patches.push(p);
    this.emitted++;
    return p;
  }

  clear() { this.patches.length = 0; }

  update(dt) {
    const pl = this.level.player;
    const live = [];
    for (const p of this.patches) {
      p.t += dt;
      p.x += this.drift.x * dt; p.y += this.drift.y * dt; p.z += this.drift.z * dt;
      if (p.t < p.life && p.z < this.zMax) live.push(p);
    }
    this.patches = live;
    if (!pl || pl.dead || pl.mode === 'script' || pl.invulnerable) return;
    const r = this.r, ph = pl.half;
    for (const p of this.patches) {
      if (p.t < 0.1 || p.t > p.life - 0.25) continue;     // auflodernd/verlöschend harmlos
      if (Math.abs(pl.pos.x - p.x) < r + ph.x - 0.08 && Math.abs(pl.pos.z - p.z) < r + ph.z - 0.08 && pl.pos.y < p.y + 0.62 && pl.pos.y + ph.y * 2 > p.y) {
        this.src.pos.set(p.x, p.y, p.z - Math.sign(this.drift.z || 1) * 0.5);
        if (pl.hurt(this.src)) { this.hits++; this.level.sfx('fireball'); }
        break;
      }
    }
  }

  render(dt, t) {
    if (!this.flames) return;
    const n = this.patches.length;
    for (let i = 0; i < n; i++) {
      const p = this.patches[i];
      const grow = Math.min(1, p.t / 0.15), fade = Math.min(1, (p.life - p.t) / 0.4);
      const k = Math.max(0.01, grow * fade);
      const fl = 1 + Math.sin(t * 19 + p.seed * 40) * 0.12 + Math.sin(t * 31 + p.seed * 17) * 0.08;
      _p.set(p.x, p.y, p.z);
      _q.setFromEuler(_e.set(0, p.seed * 6.28 + t * 0.8, 0));
      _s.set(k, k * fl, k);
      this.flames.setMatrixAt(i, _m.compose(_p, _q, _s));
      _p.y = p.y + 0.02;
      _s.set(k, 1, k);
      this.glows.setMatrixAt(i, _m.compose(_p, _q, _s));
    }
    this.flames.count = n; this.glows.count = n;
    this.flames.visible = this.glows.visible = n > 0;
    this.flames.instanceMatrix.needsUpdate = true;
    this.glows.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    for (const im of [this.flames, this.glows]) {
      if (!im) continue;
      this.level.view.remove(im);
      im.material.dispose();
      im.dispose();
    }
    this.flames = this.glows = null;
    super.dispose();
  }
}

export const KINDS = { fire_trail: (level, spec) => new FireTrail(level, spec) };
