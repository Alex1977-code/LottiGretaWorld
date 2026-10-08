// Brummer (Bauplan: „fliegt, sticht nach Ankündigung“, Konter: springen).
//
// Fliegt auf einer Bahn (path, Runde) oder kreist (center + radius) oder schwebt (pos). Ist die Figur in Reichweite
// und nicht über ihm, hält er an, zittert und lässt den Stachel glühen (Ankündigung 0,75 s) und sticht dann im
// Sturzflug geradlinig auf die Stelle der Figur (9 m/s, höchstens 1,1 s, endet an fester Geometrie). Danach
// kurz schweben und zurück auf die Bahn; 1,8 s Pause bis zum nächsten Angriff.
// Draufspringen besiegt ihn (er fällt herunter), seitliche Berührung und der Stich verletzen.
//
// Daten: { kind: 'brummer', pos?, path?: [[x,y,z], …] (Flugbahn, y = Flughöhe; loop Standard ab 3 Punkten),
//          center?: [x,y,z] + radius?: 2.5 (Kreisflug), speed?: 2.4 m/s, sight?: 6 m (waagerecht),
//          dive?: 9 m/s, cooldown?: 1.8 s, phase?: 0..1, wake?, drop? }
// Zustände: fly → warn → dive → recover (0,5 s) → back → fly …; squashed (fällt) | flipped.
// Modell 'brummer' (state { anim: fly|warn|dive|squashed }; Körpermitte bei y ≈ 0,45).

import * as THREE from 'three';
import { Enemy } from '../Enemy.js';
import { PathMover } from '../../level/PathMover.js';
import { getModel } from '../../models/index.js';

class Brummer extends Enemy {
  constructor(level, spec) {
    super(level, spec, 'brummer');
    this.half.set(0.38, 0.42, 0.38);
    this.shadow = 0.4;
    this.speed = spec.speed ?? 2.4;
    this.sight = spec.sight ?? 6;
    this.diveSpeed = spec.dive ?? 9;
    this.coolTime = spec.cooldown ?? 1.8;
    this.cool = 1;
    this.mover = null;
    this.circle = null;
    if (spec.path?.length >= 2) {
      this.mover = new PathMover(spec.path, { speed: this.speed, mode: (spec.loop ?? spec.path.length >= 3) ? 'loop' : 'pingpong', wait: 0.2, phase: spec.phase ?? 0 });
    } else if (spec.center) {
      const c = spec.center;
      this.circle = { x: c[0], y: c[1], z: c[2], r: spec.radius ?? 2.5, a: (spec.phase ?? 0) * Math.PI * 2 };
    }
    this.home = new THREE.Vector3();
    this.homeAt(0);
    this.pos.copy(this.home);
    this.aim = new THREE.Vector3();
    this.state = 'fly';
    if (level.view) this.setModel(getModel('brummer'));
  }

  /** Bahnpunkt (Flugweg ohne Wippen) weiterrücken und in this.home ablegen. */
  homeAt(dt) {
    if (this.mover) { if (dt) this.mover.step(dt); const p = this.mover.pos; this.home.set(p.x, p.y, p.z); }
    else if (this.circle) {
      const c = this.circle;
      c.a += (this.speed / c.r) * dt;
      this.home.set(c.x + Math.cos(c.a) * c.r, c.y, c.z - Math.sin(c.a) * c.r);
    } else if (!dt) this.home.copy(this.pos);
    return this.home;
  }

  update(dt) {
    this.stateT += dt;
    if (this.cool > 0) this.cool -= dt;
    if (this.state === 'squashed') {
      this.vel.x = 0; this.vel.z = 0;
      this.moveWithGravity(dt);
      if ((this.grounded && this.stateT > 0.3) || this.stateT > 1.5) this.kill();
      return;
    }
    if (this.updateDefeat(dt)) return;
    const p = this.level.player;
    switch (this.state) {
      case 'fly': {
        const ox = this.pos.x, oz = this.pos.z;
        this.homeAt(dt);
        this.pos.set(this.home.x, this.home.y + Math.sin(this.level.time * 4) * 0.08, this.home.z);
        const dx = this.pos.x - ox, dz = this.pos.z - oz;
        if (dx * dx + dz * dz > 1e-8) this.faceToward(dx, dz, dt, 8);
        if (this.cool <= 0 && this.canSee(this.sight, 9) && p.pos.y < this.pos.y + 0.6) this.setState('warn');
        break;
      }
      case 'warn':
        this.facePlayer(dt, 10);
        if (this.stateT > 0.75) this.startDive();
        break;
      case 'dive': {
        this.pos.addScaledVector(this.aim, this.diveSpeed * dt);
        const hit = this.level.world.overlapAABB(this.center(), this.half, { filter: (s) => s.solid && !s.oneWay });
        if (hit.length || this.stateT > 1.1) {
          // aus der Geometrie zurück
          if (hit.length) this.pos.addScaledVector(this.aim, -this.diveSpeed * dt);
          this.setState('recover');
        }
        break;
      }
      case 'recover':
        if (this.stateT > 0.5) this.setState('back');
        break;
      case 'back': {
        const dx = this.home.x - this.pos.x, dy = this.home.y - this.pos.y, dz = this.home.z - this.pos.z;
        const d = Math.hypot(dx, dy, dz);
        const step = 4 * dt;
        if (d <= step) { this.pos.copy(this.home); this.setState('fly'); this.cool = this.coolTime; }
        else { this.pos.x += (dx / d) * step; this.pos.y += (dy / d) * step; this.pos.z += (dz / d) * step; this.faceToward(dx, dz, dt, 8); }
        break;
      }
      default: break;
    }
  }

  startDive() {
    const p = this.level.player;
    if (!p || !this.playerActive()) { this.setState('back'); return; }
    const c = this.center();
    this.aim.set(p.pos.x - c.x, p.pos.y + p.half.y - c.y, p.pos.z - c.z);
    this.aim.normalize();
    if (this.aim.y > -0.15) { this.aim.y = -0.15; this.aim.normalize(); }
    this.faceToward(this.aim.x, this.aim.z, 1, 1);
    this.setState('dive');
    this.level.sfx('dive');
  }

  onStomp() {
    this.squash();
    this.state = 'squashed';
  }

  modelState() {
    const s = this.state;
    if (s === 'warn') return { anim: 'warn' };
    if (s === 'dive') return { anim: 'dive' };
    if (s === 'squashed' || s === 'flipped') return { anim: 'squashed' };
    return { anim: 'fly' };
  }
}

export const KINDS = { brummer: (level, spec) => new Brummer(level, spec) };
