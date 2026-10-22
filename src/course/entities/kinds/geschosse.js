// Geschosse der Welt-2-Gegner (Werfer-Brüder, Feuer-Schnappblume). Alle verletzen die Figur bei Berührung, sind
// keine Gegner (Funkelstern/Feuerbälle der Figur beachten sie nicht) und verschwinden nach life s.
//
// feuerkugel  Ø 0,36 m. mode 'bounce' (Werfer): Schwerkraft, hüpft ≈ 0,45 m über den Boden, verlischt an Wänden,
//             in Wasser/Lava; mode 'straight' (Feuer-Schnappblume): fliegt gerade (ohne Schwerkraft) und verlischt am
//             ersten Hindernis (Boden, Wand).
//   { kind: 'feuerkugel', pos: [x, y, z] (Unterkante; Mitte = y + 0,18), vel: [vx, vy, vz], mode?: 'bounce',
//     life?: 3 (bounce) | 2.5 (straight), owner? (Entität, deren Formen ignoriert werden) }
// wurf_hammer  dreht sich im Bogen (Schwerkraft 30), fliegt durch alles hindurch. life 3.
//   { kind: 'wurf_hammer', pos, vel: [vx, vy, vz], owner? }
// wurf_bumerang  fliegt waagerecht in einem Bogen hinaus (range m, Standard 6) und kehrt zum Werfer zurück; der
//   Werfer fängt ihn (≤ 0,7 m) – sonst verschwindet er nach life s (4). Fliegt durch Wände.
//   { kind: 'wurf_bumerang', pos, dir: [dx, dz], range?: 6, speed?: 7.5, curve?: 1 (Seite des Bogens ±1), owner? }
// Modelle 'feuerkugel' (Mitte y 0,18), 'wurf_hammer' (Mitte y 0,25, state 'spin'), 'wurf_bumerang' (state 'spin').

import { CourseEntity } from '../CourseEntity.js';
import { getModel } from '../../models/index.js';

class Geschoss extends CourseEntity {
  constructor(level, spec, kind, r) {
    super(level, spec, kind);
    this.half.set(r, r, r);
    this.shadow = r;
    this.owner = spec.owner ?? null;
    this.age = 0;
    if (Array.isArray(spec.vel)) this.vel.set(spec.vel[0], spec.vel[1], spec.vel[2]);
    this.yaw = Math.atan2(-this.vel.z, this.vel.x);
  }

  ownShape(s) { return !!this.owner && s.owner === this.owner; }

  onPlayer(player) {
    if (!this.alive) return 'none';
    this.poof(false);
    return 'hurt';
  }

  poof(sparks = true) {
    if (this.removed) return;
    if (sparks) this.level.effects?.sparks(this.center(), 5);
    this.kill();
  }
}

class Feuerkugel extends Geschoss {
  constructor(level, spec) {
    super(level, spec, 'feuerkugel', 0.17);
    this.mode = spec.mode === 'straight' ? 'straight' : 'bounce';
    this.life = spec.life ?? (this.mode === 'straight' ? 2.5 : 3);
    this.bounces = 0;
    this._ign = (s) => this.ownShape(s);
    if (level.view) this.setModel(getModel('feuerkugel'));
  }

  update(dt) {
    this.age += dt;
    if (this.age > this.life) { this.poof(); return; }
    if (this.mode === 'bounce') this.vel.y = Math.max(this.vel.y - 40 * dt, -18);
    const c = this.center();
    const res = this.level.world.moveAABB(c, this.half, { x: this.vel.x * dt, y: this.vel.y * dt, z: this.vel.z * dt }, { step: 0.1, ignore: this._ign });
    this.pos.set(c.x, c.y - this.half.y, c.z);
    if (res.hitWall || (this.mode === 'straight' && (res.grounded || res.ceiling))) { this.poof(); return; }
    if (res.grounded && this.vel.y <= 0) { this.vel.y = 6; this.bounces++; }
    if (res.ceiling && this.vel.y > 0) this.vel.y = 0;
    if (this.pos.y < this.level.killY) { this.kill(); return; }
    for (const s of this.level.world.overlapAABB(c, this.half)) {
      if (s.water || s.kill) { this.level.effects?.splash?.(this.pos, s.top ?? this.pos.y); this.kill(); return; }
    }
  }
}

class WurfHammer extends Geschoss {
  constructor(level, spec) {
    super(level, spec, 'wurf_hammer', 0.24);
    this.life = spec.life ?? 3;
    this.floor = this.pos.y - 14;
    if (level.view) this.setModel(getModel('wurf_hammer'));
  }

  update(dt) {
    this.age += dt;
    this.vel.y -= 30 * dt;
    this.pos.x += this.vel.x * dt; this.pos.y += this.vel.y * dt; this.pos.z += this.vel.z * dt;
    if (this.age > this.life || this.pos.y < this.floor || this.pos.y < this.level.killY) this.kill();
  }

  modelState() { return { anim: 'spin' }; }
}

class WurfBumerang extends Geschoss {
  constructor(level, spec) {
    super(level, spec, 'wurf_bumerang', 0.26);
    this.shadow = 0.22;
    const d = spec.dir ?? [1, 0];
    const l = Math.hypot(d[0], d[1]) || 1;
    this.d = { x: d[0] / l, z: d[1] / l };
    this.range = spec.range ?? 6;
    this.speed = spec.speed ?? 7.5;
    this.curve = spec.curve ?? 1;
    this.life = spec.life ?? 4;
    this.start = this.pos.clone();
    this.T = (Math.PI * this.range) / (2 * this.speed) * 2;     // Hin und zurück (Sinusbogen)
    this.returning = false;
    this.caught = false;
    this.y0 = this.pos.y;
    if (level.view) this.setModel(getModel('wurf_bumerang'));
  }

  update(dt) {
    this.age += dt;
    if (this.age > this.life) { this.poof(); return; }
    const k = Math.min(1, this.age / this.T);
    const x0 = this.pos.x, z0 = this.pos.z;
    if (k < 0.5 || !this.owner || this.owner.removed || this.owner.defeated) {
      // hinaus und zurück auf einem Bogen (seitlich ausschwingend)
      const out = Math.sin(k * Math.PI) * this.range;
      const side = Math.sin(k * Math.PI * 2) * 1.1 * this.curve;
      this.pos.x = this.start.x + this.d.x * out - this.d.z * side;
      this.pos.z = this.start.z + this.d.z * out + this.d.x * side;
      this.pos.y = this.y0 + Math.sin(k * Math.PI) * 0.4;
      if (k >= 1) { this.poof(); return; }
    } else {
      // Rückweg: zur Hand des Werfers
      this.returning = true;
      const o = this.owner;
      const tx = o.pos.x, ty = o.pos.y + 0.7, tz = o.pos.z;
      const dx = tx - this.pos.x, dy = ty - this.pos.y, dz = tz - this.pos.z, d = Math.hypot(dx, dy, dz);
      if (d < 0.7) { this.caught = true; o.onCatch?.(this); this.kill(); return; }
      const sp = this.speed * 1.1 * dt;
      this.pos.x += (dx / d) * sp; this.pos.y += (dy / d) * sp; this.pos.z += (dz / d) * sp;
    }
    const vx = (this.pos.x - x0) / dt, vz = (this.pos.z - z0) / dt;
    this.vel.set(vx, 0, vz);
  }

  modelState() { return { anim: 'spin' }; }
}

export const KINDS = {
  feuerkugel: (level, spec) => new Feuerkugel(level, spec),
  wurf_hammer: (level, spec) => new WurfHammer(level, spec),
  wurf_bumerang: (level, spec) => new WurfBumerang(level, spec),
};
