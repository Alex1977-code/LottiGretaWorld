// Zauberkröte und Zauberkugel (Bauplan: „teleportiert, Zauberkugeln“, Konter: treffen nach dem Erscheinen).
//
// zauberkroete: erscheint reihum an festen Punkten (spots), dreht sich zur Figur, zaubert eine Zauberkugel und
//   verschwindet wieder. Nur sichtbar verwundbar (ab der Hälfte des Erscheinens bis kurz nach Beginn des
//   Verschwindens): draufspringen, Feuer, Tatzenhieb, Panzer, Wurf, Explosion, Riesentrank, Funkelstern → „Puff“.
//   Seitliche Berührung verletzt. Unsichtbar ist sie weder zu treffen noch gefährlich. Einen Punkt, an dem die
//   Figur gerade steht (< 2,5 m), überspringt sie.
//   Daten: { kind: 'zauberkroete', spots: [[x,y,z], …] (Fußpunkte; Standard [pos]), pos?, sight?: 16 m,
//            hidden?: 1.4 s (unsichtbar zwischen zwei Auftritten), linger?: 0.7 s (nach dem Zauber), wake?, drop? }
//   Zustände: hidden → appear (0,6 s) → cast (1,0 s; Kugel bei 0,5 s) → linger → vanish (0,5 s) → hidden …; poof.
//   Modell 'zauberkroete' (state { anim: idle|appear|cast|vanish, progress }).
// zauberkugel: fliegt langsam (3,2 m/s) auf die Figur zu und lenkt leicht nach (0,9 rad/s); verschwindet nach
//   life s oder an fester Geometrie. Berührung verletzt (danach weg); Tatzenhieb, Feuer, Explosion, Funkelstern
//   und Riesentrank lösen sie auf. Daten: { kind: 'zauberkugel', pos (Kugelmitte − 0,25 m), dir?: [dx,dy,dz] |
//   target?: [x,y,z], speed?: 3.2, life?: 4.5, owner? }.  Modell 'zauberkugel' (Kugel bei y = 0,25).

import * as THREE from 'three';
import { Enemy } from '../Enemy.js';
import { CourseEntity } from '../CourseEntity.js';
import { getModel } from '../../models/index.js';

const T_APPEAR = 0.6, T_CAST = 1.0, T_VANISH = 0.5;

class Zauberkroete extends Enemy {
  constructor(level, spec) {
    super(level, spec, 'zauberkroete');
    this.half.set(0.35, 0.62, 0.35);
    this.shadow = 0.45;
    this.spots = (spec.spots?.length ? spec.spots : [spec.pos ?? [0, 0, 0]]).map((p) => new THREE.Vector3(p[0], p[1], p[2]));
    this.spot = -1;
    this.sight = spec.sight ?? 16;
    this.hiddenTime = spec.hidden ?? 1.4;
    this.lingerTime = spec.linger ?? 0.7;
    this.cast = false;
    this.pos.copy(this.spots[0]);
    this.hide(0.6);
    if (level.view) this.setModel(getModel('zauberkroete'));
  }

  hide(wait) {
    this.setState('hidden');
    this.wait = wait ?? this.hiddenTime;
    this.touch = false;
    this.shadowVisible = false;
  }

  /** Nächster Auftrittspunkt (reihum; nicht dort, wo die Figur steht). */
  pickSpot() {
    const n = this.spots.length;
    const p = this.level.player;
    for (let k = 1; k <= n; k++) {
      const i = (this.spot + k) % n;
      const s = this.spots[i];
      if (n > 1 && i === this.spot) continue;
      if (p && Math.hypot(p.pos.x - s.x, p.pos.z - s.z) < 2.5 && n > 1) continue;
      this.spot = i;
      return s;
    }
    this.spot = (this.spot + 1) % n;
    return this.spots[this.spot];
  }

  get vulnerable() {
    const s = this.state, t = this.stateT;
    return (s === 'appear' && t > T_APPEAR * 0.5) || s === 'cast' || s === 'linger' || (s === 'vanish' && t < T_VANISH * 0.5);
  }

  update(dt) {
    this.stateT += dt;
    if (this.state === 'poof') { if (this.stateT > T_VANISH) this.kill(); return; }
    this.touch = this.vulnerable;
    switch (this.state) {
      case 'hidden':
        if (this.stateT > this.wait && this.canSee(this.sight, 8)) {
          this.pos.copy(this.pickSpot());
          this.setState('appear');
          this.shadowVisible = true;
          this.facePlayer(1, 1);
          this.level.sfx('vanish');
          this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 0.7, z: this.pos.z }, 10);
        }
        break;
      case 'appear':
        this.facePlayer(dt, 8);
        if (this.stateT > T_APPEAR) { this.setState('cast'); this.cast = false; }
        break;
      case 'cast':
        this.facePlayer(dt, 8);
        if (!this.cast && this.stateT >= 0.5) { this.cast = true; this.castOrb(); }
        if (this.stateT > T_CAST) this.setState('linger');
        break;
      case 'linger':
        this.facePlayer(dt, 4);
        if (this.stateT > this.lingerTime) { this.setState('vanish'); this.level.sfx('vanish'); }
        break;
      case 'vanish':
        if (this.stateT > T_VANISH) this.hide();
        break;
      default: break;
    }
  }

  castOrb() {
    const p = this.level.player;
    const f = { x: Math.cos(this.yaw), z: -Math.sin(this.yaw) };
    const sx = this.pos.x + f.x * 0.55, sy = this.pos.y + 0.85, sz = this.pos.z + f.z * 0.55;
    const target = p ? [p.pos.x, p.pos.y + p.half.y, p.pos.z] : [sx + f.x, sy, sz + f.z];
    this.level.spawn('zauberkugel', { pos: [sx, sy - 0.25, sz], target, owner: this });
    this.level.sfx('swoop');
  }

  onPlayer(player, contact) {
    if (this.defeated || !this.vulnerable) return 'none';
    return super.onPlayer(player, contact);
  }

  onStomp() { this.poof(); }

  onHit(kind, source) {
    if (this.defeated || !this.vulnerable) return;
    if (kind === 'pound' && source && Math.abs(source.pos.y - this.pos.y) > 0.8) return;
    if (kind === 'bump') return;
    this.poof();
  }

  poof() {
    if (this.defeated) return;
    this.setState('poof');
    this.touch = false;
    this.level.sfx('stomp');
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 0.7, z: this.pos.z }, 18);
    this.level.effects?.dust(this.pos, 6);
    this.markDefeated();
  }

  modelState() {
    const s = this.state, t = this.stateT;
    if (s === 'hidden') return { anim: 'vanish', progress: 1 };
    if (s === 'appear') return { anim: 'appear', progress: Math.min(1, t / T_APPEAR) };
    if (s === 'cast') return { anim: 'cast', progress: Math.min(1, t / T_CAST) };
    if (s === 'vanish' || s === 'poof') return { anim: 'vanish', progress: Math.min(1, t / T_VANISH) };
    return { anim: 'idle' };
  }
}

class Zauberkugel extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'zauberkugel');
    this.half.set(0.22, 0.25, 0.22);
    this.shadow = 0.22;
    this.speed = spec.speed ?? 3.2;
    this.life = spec.life ?? 4.5;
    this.owner = spec.owner ?? null;
    let d = spec.dir;
    if (!d && spec.target) {
      const c = this.center();
      d = [spec.target[0] - c.x, spec.target[1] - c.y, spec.target[2] - c.z];
    }
    d = d ?? [1, 0, 0];
    const l = Math.hypot(d[0], d[1], d[2]) || 1;
    this.vel.set((d[0] / l) * this.speed, (d[1] / l) * this.speed, (d[2] / l) * this.speed);
    this.age = 0;
    if (level.view) this.setModel(getModel('zauberkugel'));
  }

  update(dt) {
    this.age += dt;
    if (this.age > this.life) { this.pop(); return; }
    // leicht nachlenken (0,9 rad/s)
    const p = this.level.player;
    if (p && !p.dead) {
      const c = this.center();
      const tx = p.pos.x - c.x, ty = p.pos.y + p.half.y - c.y, tz = p.pos.z - c.z;
      const tl = Math.hypot(tx, ty, tz) || 1;
      const v = this.vel, vl = v.length() || 1;
      const ux = v.x / vl, uy = v.y / vl, uz = v.z / vl;
      const dot = Math.max(-1, Math.min(1, ux * tx / tl + uy * ty / tl + uz * tz / tl));
      const ang = Math.acos(dot);
      if (ang > 1e-3) {
        const k = Math.min(1, (0.9 * dt) / ang);
        let nx = ux + (tx / tl - ux) * k, ny = uy + (ty / tl - uy) * k, nz = uz + (tz / tl - uz) * k;
        const nl = Math.hypot(nx, ny, nz) || 1;
        v.set((nx / nl) * this.speed, (ny / nl) * this.speed, (nz / nl) * this.speed);
      }
    }
    this.pos.addScaledVector(this.vel, dt);
    const hits = this.level.world.overlapAABB(this.center(), { x: 0.12, y: 0.12, z: 0.12 }, { filter: (s) => s.solid && !s.oneWay });
    if (hits.length) this.pop();
  }

  pop() {
    if (this.removed) return;
    this.level.effects?.sparks(this.center(), 8);
    this.kill();
  }

  onPlayer(player) {
    if (this.removed) return 'none';
    this.pop();
    return player.invulnerable ? 'none' : 'hurt';
  }

  onHit(kind) {
    if (kind === 'claw' || kind === 'fire' || kind === 'bomb' || kind === 'star' || kind === 'mega' || kind === 'shell') this.pop();
  }

  syncModel() {
    if (!this.model) return;
    this.model.root.position.copy(this.pos);
    const s = this.age > this.life - 0.4 ? Math.max(0.05, (this.life - this.age) / 0.4) : 1;
    this.model.root.scale.setScalar(s);
  }
}

export const KINDS = {
  zauberkroete: (level, spec) => new Zauberkroete(level, spec),
  zauberkugel: (level, spec) => new Zauberkugel(level, spec),
};
