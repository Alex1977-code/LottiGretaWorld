// Tragbare Topfpflanze (Präzisierung Motor Welt 2; Bauplan 2-3 „Topfpflanze als tragbare Waffe“): eine zahme
// Schnappblume im Topf. Aufheben mit Aktion (Tragen-System, vor der Brust `holdStyle: 'front'`), erneute Aktion
// wirft sie im Bogen (Ducken + Aktion: absetzen). Sie schnappt im Takt nach vorn nach Gegnern und Münzen in
// Reichweite – getragen in Blickrichtung der Figur, abgestellt dreht sie sich zum Ziel:
//   Gegner → onHit('bite', pflanze) (Standard-Gegner fliegen weg; zähe Gegner zählen Treffer), Münzen → eingesammelt.
// Geworfen trifft sie Gegner im Flug (onHit('throw')) und bleibt danach liegen (wieder aufhebbar). Der Figur tut sie
// nichts. Fällt sie in einen Abgrund, ist sie weg (respawn: s → erscheint wieder am Ursprung).
//
// Daten: { kind: 'topfpflanze', pos: [x, y, z] (Fußpunkt), reach?: 1.7 (m vor dem Kopf), pause?: 0.35 (s zwischen
//          zwei Bissen), yaw?, respawn?: 0, id? }
// Modell 'topfpflanze' aus der Registry (state { anim: 'idle'|'snap', progress, carried }), sonst die
// Schnappblume im Topf (getModel('schnappblume', { base: 'pot' })) mit goldenem Topfrand als Kennzeichen.

import * as THREE from 'three';
import { Gimmick } from '../gimmick.js';
import { hasModel, getModel } from '../../models/index.js';

const SCALE = 0.72;            // Darstellung (Schnappblumen-Modell ≈ 1 m → ≈ 0,72 m)
const SNAP = 0.5;              // s je Biss (Ausholen → Zuschnappen → zurück)
const COLLECT = new Set(['coin', 'bluecoin', 'starcoin']);

class Topfpflanze extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'topfpflanze');
    this.half.set(0.28, 0.36, 0.28);
    this.shadow = 0.36;
    this.carryable = true;
    this.holdStyle = 'front';
    this.reach = spec.reach ?? 1.7;
    this.pause = spec.pause ?? 0.35;
    this.yaw = spec.yaw ?? -Math.PI / 2;
    this.home = this.pos.clone();
    this.respawnT = spec.respawn ?? 0;
    this.snapT = -1;
    this.bit = false;
    this.cool = 0.2;
    this.thrown = false;
    this.thrower = null;
    this.bites = 0;
    this._h = { x: 0, y: 0, z: 0 };
    if (level.view) this.setModel(this.makeModel());
  }

  makeModel() {
    if (hasModel('topfpflanze')) return getModel('topfpflanze');
    const m = getModel('schnappblume', { base: 'pot' });
    const inner = new THREE.Group();
    inner.scale.setScalar(SCALE);
    while (m.root.children.length) inner.add(m.root.children[0]);
    m.root.add(inner);
    // goldener Topfrand: zahm, tragbar
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.045, 8, 20), new THREE.MeshStandardMaterial({ color: 0xffc83a, roughness: 0.3, metalness: 0.5 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.37 * SCALE;
    ring.castShadow = true;
    m.root.add(ring);
    const dispose = m.dispose?.bind(m);
    m.dispose = () => { dispose?.(); ring.geometry.dispose(); ring.material.dispose(); };
    return m;
  }

  canCarry() { return !this.thrown && this.alive; }

  onPickup() { this.touch = false; this.thrown = false; }

  onThrow(player, o) {
    super.onThrow(player, o);
    this.thrown = !o.gentle;
    this.thrower = player;
    this.touch = true;
    this.grounded = false;
  }

  onDrop() { this.vel.set(0, 2, 0); this.touch = true; }

  onPlayer() { return 'none'; }

  /** Kopf der Pflanze (Welt), k = 0 … 1 Anteil der Reichweite nach vorn. */
  headPos(k = 0) {
    const fx = Math.cos(this.yaw), fz = -Math.sin(this.yaw);
    const h = this._h;
    h.x = this.pos.x + fx * (0.15 + this.reach * 0.55 * k);
    h.z = this.pos.z + fz * (0.15 + this.reach * 0.55 * k);
    h.y = this.pos.y + 0.62 * SCALE;
    return h;
  }

  update(dt) {
    if (this.hidden) return;
    if (this.carrier) {
      if (!this.followCarrier()) this.touch = true;
    } else {
      const res = this.moveWithGravity(dt);
      if (this.thrown) {
        // im Flug: Gegner treffen
        for (const e of this.level.entities) {
          if (!e.enemy || !e.alive || e.defeated || e.touch === false || e === this) continue;
          if (!this.overlaps(e, 0.1)) continue;
          e.onHit?.('throw', this);
          this.vel.x *= -0.3; this.vel.z *= -0.3;
          break;
        }
        if (res.hitWall) { this.vel.x *= -0.3; this.vel.z *= -0.3; }
        if (this.grounded && this.vel.y <= 0) { this.thrown = false; this.level.effects?.dust(this.pos, 4); this.level.sfx('land'); }
      }
      if (this.grounded) { this.vel.x *= Math.max(0, 1 - dt * 8); this.vel.z *= Math.max(0, 1 - dt * 8); }
      if (!this.alive && this.respawnT > 0) this.respawnLater();
    }
    this.updateBite(dt);
  }

  /** Biss-Takt: Ziel suchen → ausholen → bei 42 % zuschnappen (Treffer im Kopfbereich) → zurück → Pause. */
  updateBite(dt) {
    if (this.thrown) { this.snapT = -1; return; }
    if (this.snapT >= 0) {
      this.snapT += dt;
      const p = this.snapT / SNAP;
      if (!this.bit && p >= 0.42) { this.bit = true; this.strike(); }
      if (p >= 1) { this.snapT = -1; this.cool = this.pause; }
      return;
    }
    this.cool -= dt;
    if (this.cool > 0) return;
    const t = this.findTarget();
    if (!t) return;
    // abgestellt: zum Ziel drehen; getragen schaut sie mit der Figur
    if (!this.carrier) this.yaw = Math.atan2(-(t.pos.z - this.pos.z), t.pos.x - this.pos.x);
    this.snapT = 0;
    this.bit = false;
  }

  /** Nächstes Ziel in Reichweite (Gegner vor Münzen); getragen nur vor der Figur. */
  findTarget() {
    const h = this.headPos(0);
    const fx = Math.cos(this.yaw), fz = -Math.sin(this.yaw);
    let best = null, bd = Infinity;
    for (const e of this.level.entities) {
      if (e === this || !e.alive || e.removed || e.hidden || e.carrier) continue;
      const isEnemy = e.enemy && !e.defeated && e.touch !== false;
      if (!isEnemy && !COLLECT.has(e.kind)) continue;
      const c = e.center();
      const dx = c.x - h.x, dz = c.z - h.z, dy = c.y - h.y;
      if (Math.abs(dy) > 1.0 + e.half.y) continue;
      const d = Math.hypot(dx, dz) - e.half.x;
      if (d > this.reach) continue;
      if (this.carrier && dx * fx + dz * fz < -0.1) continue;   // getragen: nur nach vorn
      const score = d + (isEnemy ? 0 : 0.8);
      if (score < bd) { bd = score; best = e; }
    }
    return best;
  }

  strike() {
    const fx = Math.cos(this.yaw), fz = -Math.sin(this.yaw);
    const h = this.headPos(0);
    this.level.sfx('claw');
    for (const e of this.level.entities) {
      if (e === this || !e.alive || e.removed || e.hidden || e.carrier) continue;
      const isEnemy = e.enemy && !e.defeated && e.touch !== false;
      if (!isEnemy && !COLLECT.has(e.kind)) continue;
      const c = e.center();
      const dx = c.x - h.x, dz = c.z - h.z, dy = c.y - h.y;
      const along = dx * fx + dz * fz;
      if (along < -0.3 || along > this.reach + e.half.x) continue;
      if (Math.hypot(dx - fx * along, dz - fz * along) > 0.75 + e.half.x) continue;
      if (Math.abs(dy) > 0.9 + e.half.y) continue;
      if (isEnemy) { e.onHit?.('bite', this); this.bites++; }
      else e.onPlayer?.(this.carrier ?? this.level.player, {});
    }
    const k = this.headPos(1);
    this.level.effects?.sparks({ x: k.x, y: k.y, z: k.z }, 3);
  }

  respawnLater() {
    if (this._respawnSet) return;
    this._respawnSet = true;
    const L = this.level, home = [this.home.x, this.home.y, this.home.z], respawn = this.respawnT;
    let t = 0, done = false;
    const off = L.onStep((dt) => {
      if (done) return;
      t += dt;
      if (t < respawn) return;
      done = true;
      queueMicrotask(off);
      L.spawn('topfpflanze', { pos: home, respawn, reach: this.reach, pause: this.pause });
      L.effects?.sparks({ x: home[0], y: home[1] + 0.4, z: home[2] }, 10);
    });
  }

  kill() {
    if (!this.removed && this.respawnT > 0) this.respawnLater();
    super.kill();
  }

  modelState() {
    return this.snapT >= 0 ? { anim: 'snap', progress: Math.min(1, this.snapT / SNAP), carried: !!this.carrier } : { anim: 'idle', carried: !!this.carrier };
  }
}

export const KINDS = { topfpflanze: (level, spec) => new Topfpflanze(level, spec) };
