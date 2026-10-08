// Referenzgegner Pilzling (Muster für den Gegner-Agenten): läuft geradeaus oder patrouilliert zwischen
// zwei Punkten, dreht an Kanten und Wänden um. Draufspringen besiegt ihn (platt), seitliche Berührung
// verletzt die Figur. Stampfattacke, Krallen, Feuer, Riesentrank, Funkelstern besiegen ihn ebenfalls.
//
// Daten: { kind: 'pilzling', pos: [x, y, z],
//          path?: [[x,y,z], [x,y,z]]  Patrouille zwischen den Punkten (sonst geradeaus in dir),
//          dir?: [dx, dz] | yaw (rad)  Laufrichtung (Standard: zur Kamera, +Z),
//          speed?: 1.6 m/s, edges?: true (an Kanten umdrehen), wake?: 18 m (erst ab dieser Nähe zur Figur aktiv) }
//
// Zustandsautomat: idle (schläft außer Reichweite) → walk → squashed (0,6 s platt, dann weg) | flipped
// (fliegt weg). Modell 'pilzling' (state { anim: 'walk'|'idle'|'squashed'|'stunned'|'alert', speed }).

import { CourseEntity } from '../CourseEntity.js';
import { getModel } from '../../models/index.js';

class Pilzling extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'pilzling');
    this.enemy = true;
    this.half.set(0.42, 0.42, 0.42);
    this.shadow = 0.5;
    this.speed = spec.speed ?? 1.6;
    this.edges = spec.edges !== false;
    this.wake = spec.wake ?? 18;
    this.path = spec.path?.length >= 2 ? spec.path.map((p) => ({ x: p[0], z: p[2] })) : null;
    this.target = 1;
    let dx = 0, dz = 1;
    if (Array.isArray(spec.dir)) { dx = spec.dir[0]; dz = spec.dir[1]; }
    else if (typeof spec.dir === 'number') { dx = Math.cos(spec.dir); dz = -Math.sin(spec.dir); }
    const l = Math.hypot(dx, dz) || 1;
    this.dir = { x: dx / l, z: dz / l };
    this.state = 'idle';
    this.stateT = 0;
    this.turnCooldown = 0;
    this.yaw = Math.atan2(-this.dir.z, this.dir.x);
    if (level.view) this.setModel(getModel('pilzling', { size: [0.9, 0.85, 0.9] }));
  }

  setState(s) { this.state = s; this.stateT = 0; }

  update(dt) {
    this.stateT += dt;
    if (this.turnCooldown > 0) this.turnCooldown -= dt;
    switch (this.state) {
      case 'idle': {
        const p = this.level.player;
        if (!p || Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < this.wake) this.setState('walk');
        this.vel.x = 0; this.vel.z = 0;
        this.moveWithGravity(dt);
        break;
      }
      case 'walk': this.walk(dt); break;
      case 'squashed':
        if (this.stateT > 0.6) this.kill();
        break;
      case 'flipped':
        this.vel.y -= 30 * dt;
        this.pos.x += this.vel.x * dt; this.pos.y += this.vel.y * dt; this.pos.z += this.vel.z * dt;
        if (this.stateT > 1.5 || this.pos.y < this.level.killY) this.kill();
        break;
      default: break;
    }
  }

  walk(dt) {
    if (this.path) {
      const t = this.path[this.target];
      const dx = t.x - this.pos.x, dz = t.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.25) this.target = 1 - this.target;
      else { this.dir.x = dx / d; this.dir.z = dz / d; }
    }
    // Kante voraus → umdrehen (nur am Boden)
    if (this.edges && this.grounded && this.turnCooldown <= 0 && !this.groundAhead(this.dir.x, this.dir.z, 0.15, 1.1)) this.turn();
    this.vel.x = this.dir.x * this.speed;
    this.vel.z = this.dir.z * this.speed;
    const res = this.moveWithGravity(dt);
    if (res.hitWall && this.turnCooldown <= 0) this.turn();
    const want = Math.atan2(-this.dir.z, this.dir.x);
    let d = want - this.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += d * Math.min(1, dt * 10);
  }

  turn() {
    this.dir.x = -this.dir.x; this.dir.z = -this.dir.z;
    if (this.path) this.target = 1 - this.target;
    this.turnCooldown = 0.25;
  }

  onPlayer(player, contact) {
    if (this.state !== 'walk' && this.state !== 'idle') return 'none';
    if (contact.pound) { this.squash(); return 'none'; }
    if (contact.fromAbove) { this.squash(); return 'stomp'; }
    if (contact.dive) { this.onHit('claw', player); return 'none'; }
    return 'hurt';
  }

  squash() {
    this.setState('squashed');
    this.touch = false;
    this.vel.set(0, 0, 0);
    this.level.effects?.dust(this.pos, 5);
  }

  onStomp() { this.squash(); }

  onHit(kind, source) {
    if (this.state === 'squashed' || this.state === 'flipped') return;
    if (kind === 'pound' && source && Math.abs(source.pos.y - this.pos.y) < 0.6) { this.squash(); this.level.sfx('stomp'); return; }
    this.setState('flipped');
    this.touch = false;
    let ax = this.pos.x - (source?.pos?.x ?? this.pos.x), az = this.pos.z - (source?.pos?.z ?? this.pos.z);
    const l = Math.hypot(ax, az) || 1;
    this.vel.set((ax / l) * 3, 8, (az / l) * 3);
    this.level.sfx('stomp');
  }

  modelState() {
    const anim = this.state === 'walk' ? 'walk' : this.state === 'squashed' ? 'squashed' : this.state === 'flipped' ? 'stunned' : 'idle';
    return { anim, speed: this.state === 'walk' ? this.speed : 0 };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    const r = this.model.root;
    // Rückfall-Optik für Platzhalter: platt drücken bzw. umdrehen
    if (this.model.placeholder) {
      r.scale.set(1, this.state === 'squashed' ? 0.25 : 1, 1);
      r.rotation.z = this.state === 'flipped' ? Math.PI : 0;
    }
  }
}

export const KINDS = { pilzling: (level, spec) => new Pilzling(level, spec) };
