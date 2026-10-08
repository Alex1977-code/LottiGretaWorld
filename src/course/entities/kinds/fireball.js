// Feuerball der Funkenblüte (Power-up `funken`). Fliegt flach in Blickrichtung (10 m/s), hüpft über den Boden
// (≈ 0,55 m hohe Sprünge), besiegt Gegner (onHit('fire')), zündet Kickbomben, sammelt Münzen ein und verschwindet
// an Wänden, im Wasser, nach dem ersten Treffer oder nach 1,5 s. Höchstens 2 gleichzeitig je Figur (zählt
// player/powers/funken.js).
//
// Daten (vom Power-up erzeugt): { kind: 'fireball', pos: [x, y, z] (Fußpunkt der Kugel, Mitte + 0,2 m),
//          dir: [dx, dz], owner: player, speed?: 10, life?: 1.5 }
// Modell 'funkenball' (Ø 0,4 m, Mitte bei y = 0,2, Funkenschweif nach −X → yaw = Flugrichtung).

import { CourseEntity } from '../CourseEntity.js';
import { getModel } from '../../models/index.js';

const BOUNCE = 7.5;
const GRAVITY = 48;

class Fireball extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'fireball');
    this.half.set(0.18, 0.18, 0.18);
    this.touch = false;            // trifft nur Gegner, nie die Figur
    this.shadow = 0.18;
    this.owner = spec.owner ?? null;
    this.life = spec.life ?? 1.5;
    this.age = 0;
    const d = spec.dir ?? [1, 0];
    const l = Math.hypot(d[0], d[1]) || 1;
    const sp = spec.speed ?? 10;
    this.vel.set((d[0] / l) * sp, spec.vy ?? -3, (d[1] / l) * sp);
    this.yaw = Math.atan2(-this.vel.z, this.vel.x);
    if (level.view) this.setModel(getModel('funkenball'));
  }

  update(dt) {
    this.age += dt;
    if (this.age > this.life) { this.poof(); return; }
    this.vel.y = Math.max(this.vel.y - GRAVITY * dt, -20);
    const c = this.center();
    const res = this.level.world.moveAABB(c, this.half, { x: this.vel.x * dt, y: this.vel.y * dt, z: this.vel.z * dt }, { step: 0.12 });
    this.pos.set(c.x, c.y - this.half.y, c.z);
    if (res.hitWall) { this.poof(); return; }
    if (res.grounded && this.vel.y <= 0) this.vel.y = BOUNCE;
    if (res.ceiling && this.vel.y > 0) this.vel.y = 0;
    if (this.pos.y < this.level.killY) { this.kill(); return; }
    // Wasser/Lava löschen ihn
    for (const s of this.level.world.overlapAABB(c, this.half)) {
      if (s.water || s.kill) { this.level.effects?.splash(this.pos, s.top ?? this.pos.y); this.kill(); return; }
    }
    // Gegner treffen (erster Treffer verbraucht den Feuerball); Münzen einsammeln
    for (const e of this.level.entities) {
      if (e === this || !e.alive || e.removed || e.carrier) continue;
      if (e.kind === 'coin') { if (this.overlaps(e)) e.onHit?.('fire', this); continue; }
      if (!e.enemy || e.touch === false || e.defeated) continue;
      if (!this.overlaps(e, 0.04)) continue;
      e.onHit?.('fire', this);
      this.poof();
      return;
    }
  }

  poof() {
    if (this.removed) return;
    this.level.effects?.sparks(this.center(), 6);
    this.kill();
  }
}

export const KINDS = { fireball: (level, spec) => new Fireball(level, spec) };
