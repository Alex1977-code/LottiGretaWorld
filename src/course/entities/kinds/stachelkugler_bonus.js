// Stachelkugler – Gegner der Bonuswelten (P-1 nächtliche Rollhügel, P-2 Bohnenranken-Gipfel). Eigene Figur: kleine Kugel-Kreatur
// mit gelb-orangen Stacheln (Modell 'stachelkugler'), die als Ganzes rollt.
//
// Verhalten: **rollt Hänge hinab** – auf schrägem Boden (Rampen, Hügel; Gefälle aus Strahlen nach unten, entities/bonushelp.js
//   slopeAt) beschleunigt er hangabwärts (accel · Steigung m/s², bis max m/s) und lenkt in die Fallrichtung; unten rollt er aus,
//   bis er wieder speed m/s hat. **Auf ebenen Flächen pendelt er**: mit path rollt er zwischen den Punkten hin und her (bzw. Runde
//   mit loop), mit mode 'pendel' um pos ± dir · dist, sonst geradeaus in dir und dreht an Kanten (edges) und Wänden um (prallt
//   ab). Bewegte Plattformen tragen ihn mit.
// Konter: **nicht von oben besiegbar** (Stacheln!): Draufspringen, Stampfen, Rutschen und jede Berührung verletzen die Figur.
//   Besiegt nur durch Power-ups und Würfe: Feuer, Tatze/Schwanzhieb/Sturzflug, Wurfsichel, Panzer, Wurf, Kanonenkugel,
//   Explosion, Riesentrank, Funkelstern, Biss, Faust, POW – er verpufft (Sterne). Lava/Absturz = besiegt.
// Daten: { kind: 'stachelkugler', pos, dir?: [dx, dz] | yaw, path?, loop?, mode?: 'roll' | 'pendel', dist?: 3 (pendel),
//          speed?: 2.2 (m/s auf ebenem Boden), max?: 9 (m/s), accel?: 18 (m/s² je Steigung 1), friction?: 2.5 (m/s² über speed),
//          wake?, edges?: true, drop?, id? }
//   Beispiele: { kind: 'stachelkugler', pos: [0, 6, -40], dir: [0, 1] }                     // oben am Hang: rollt hinab
//              { kind: 'stachelkugler', pos: [4, 1, -60], mode: 'pendel', dir: [1, 0], dist: 3 }
// Zustände: idle (schläft außer Reichweite) → roll | defeated (0,7 s verpuffen) → weg. Laufzeit: speedNow (m/s), slope (Steigung),
//   downhill (rollt gerade hangab), rolled (m), turns, info().
// Sound: 'bump' (prallt an Wänden), 'poof' (verpufft).

import { EnemyW2, clamp } from '../EnemyW2.js';
import { getModel } from '../../models/index.js';
import { STACHEL_KILL, isSichel, slopeAt } from '../bonushelp.js';

const R = 0.42, DEFEAT = 0.7;

class Stachelkugler extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'stachelkugler');
    this.half.set(0.38, 0.4, 0.38);
    this.shadow = 0.45;
    this.base = spec.speed ?? 2.2;
    this.max = spec.max ?? 9;
    this.accel = spec.accel ?? 18;
    this.friction = spec.friction ?? 2.5;
    this.mode = spec.mode ?? 'roll';
    this.speedNow = this.base;
    this.slope = 0;
    this.downhill = false;
    this.rolled = 0;
    this.turns = 0;
    this.roll = 0;
    this.home = this.pos.clone();
    if (this.mode === 'pendel' && !this.path) {
      const L = (spec.dist ?? 3);
      this.path = [{ x: this.pos.x - this.dir.x * L, y: this.pos.y, z: this.pos.z - this.dir.z * L }, { x: this.pos.x + this.dir.x * L, y: this.pos.y, z: this.pos.z + this.dir.z * L }];
      this.target = 1;
    }
    this.state = 'idle';
    this.vx = this.dir.x * this.base;
    this.vz = this.dir.z * this.base;
    if (level.view) { this.setModel(getModel('stachelkugler')); this.initShadows(1); }
  }

  update(dt) {
    this.stateT += dt;
    if (this.state === 'defeated') { if (this.stateT >= DEFEAT) this.kill(); return; }
    if (this.updateDefeat(dt)) return;
    if (this.state === 'idle') {
      this.stand(dt);
      if (!this.level.player || this.playerDist() < this.wake) this.setState('roll');
      return;
    }
    if (this.turnCooldown > 0) this.turnCooldown -= dt;
    const sl = this.grounded ? slopeAt(this.level, this.pos.x, this.pos.y, this.pos.z) : null;
    this.slope = sl?.k ?? 0;
    let h = Math.hypot(this.vx, this.vz);
    this.downhill = false;
    if (sl && sl.k > 0.06) {
      // hangab beschleunigen und in die Fallrichtung lenken
      this.vx += sl.gx * this.accel * Math.min(1, sl.k) * dt;
      this.vz += sl.gz * this.accel * Math.min(1, sl.k) * dt;
      h = Math.hypot(this.vx, this.vz);
      if (h > this.max) { this.vx *= this.max / h; this.vz *= this.max / h; h = this.max; }
      this.downhill = (this.vx * sl.gx + this.vz * sl.gz) > 0.5 * h;
    } else if (this.grounded) {
      // ebene Fläche: Bahn/Pendel lenkt, über speed ausrollen
      if (this.path) {
        const t = this.path[this.target];
        const dx = t.x - this.pos.x, dz = t.z - this.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.3) { this.nextTarget(); this.turns++; }
        else {
          const want = Math.max(this.base, Math.min(h, this.base * 1.5));
          this.vx += ((dx / d) * want - this.vx) * Math.min(1, dt * 2.5);
          this.vz += ((dz / d) * want - this.vz) * Math.min(1, dt * 2.5);
        }
        h = Math.hypot(this.vx, this.vz);
      }
      if (h > this.base) { const k = Math.max(this.base, h - this.friction * dt) / h; this.vx *= k; this.vz *= k; h *= k; }
      else if (h < this.base * 0.98) {
        const dx = h > 0.05 ? this.vx / h : this.dir.x, dz = h > 0.05 ? this.vz / h : this.dir.z;
        this.vx = dx * this.base; this.vz = dz * this.base; h = this.base;
      }
      // an Kanten umdrehen (nicht auf der Bahn, nicht schnell hangab)
      if (!this.path && this.edges && this.turnCooldown <= 0 && h > 0.1 && !this.groundAhead(this.vx / h, this.vz / h, 0.2, 1.3)) this.reverse();
    }
    if (h > 0.05) { this.dir.x = this.vx / h; this.dir.z = this.vz / h; }
    this.vel.x = this.vx; this.vel.z = this.vz;
    const x0 = this.pos.x, z0 = this.pos.z;
    const res = this.moveWithGravity(dt, { step: 0.3 });
    if (this.removed) return;
    if (res.hitWall && res.wallNormal && this.turnCooldown <= 0) {
      const n = res.wallNormal, d = this.vx * n.x + this.vz * n.z;
      if (d < 0) { this.vx -= 2 * d * n.x; this.vz -= 2 * d * n.z; this.vx *= 0.8; this.vz *= 0.8; }
      this.turns++;
      this.turnCooldown = 0.2;
      if (this.path) this.reversePath();
      this.level.sfx('bump');
      this.level.effects?.sparks(this.center(), 3);
    }
    const d = Math.hypot(this.pos.x - x0, this.pos.z - z0);
    this.rolled += d;
    this.roll += d / R;
    this.speedNow = d / dt;
    this.yaw = Math.atan2(-this.dir.z, this.dir.x);
  }

  reverse() { this.vx = -this.vx; this.vz = -this.vz; this.turns++; this.turnCooldown = 0.3; }

  reversePath() {
    const n = this.path.length;
    this.pathStep = -this.pathStep;
    this.target = this.loop ? (this.target + this.pathStep + n) % n : clamp(this.target + this.pathStep, 0, n - 1);
  }

  defeat(source) {
    if (this.defeated) return;
    this.setState('defeated');
    this.touch = false;
    this.vel.set(0, 0, 0);
    this.level.sfx('poof');
    this.level.effects?.sparks(this.center(), 12);
    this.level.effects?.dust(this.pos, 6, 1);
    this.markDefeated();
    void source;
  }

  onPlayer(player, contact) {
    if (this.defeated || this.state === 'defeated') return 'none';
    if (contact.star) { this.defeat(player); return 'none'; }
    if (contact.dive) { this.defeat(player); return 'none'; }   // Krallen-Sturzflug ist ein Angriff
    return 'hurt';                                             // Stacheln: auch von oben, Stampfen, Rutschen
  }

  onHit(kind, source) {
    if (this.defeated || this.state === 'defeated') return;
    if (STACHEL_KILL.has(kind) || isSichel(kind, source)) this.defeat(source);
  }

  modelState() {
    if (this.state === 'defeated') return { anim: 'defeated', progress: clamp(this.stateT / DEFEAT, 0, 1) };
    if (this.state === 'idle') return { anim: 'idle', roll: this.roll };
    return { anim: 'roll', roll: this.roll, speed: this.speedNow };
  }

  info() {
    return {
      state: this.state, speed: +this.speedNow.toFixed(2), slope: +this.slope.toFixed(2), downhill: this.downhill, rolled: +this.rolled.toFixed(2),
      turns: this.turns, defeated: this.defeated, x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2),
    };
  }
}

export const KINDS = { stachelkugler: (level, spec) => new Stachelkugler(level, spec) };
