// Krakenpilz – Gegner der Bonuswelten (S-2 Planetoiden, P-6 Riesen-Wracks, K-1 Schiebeblock-Auftakt). Eigene Figur: kleiner
// Pilzling aus dem All mit fünf geringelten Tentakel-Füßchen (Modell 'krakenpilz').
//
// Verhalten: hüpft in kleinen Sprüngen (ducken → Bogen height m hoch, hop m weit → landen → Pause every s) – auf der Stelle
//   (behavior 'hop', Standard), seine Bahn entlang (path + loop bzw. hin und her in dir; 'patrol') oder auf die Figur zu
//   ('chase', bleibt an Kanten stehen). Sieht er eine Figur (sight m, Höhe ± 4 m), dreht er sich zu ihr und **spuckt alle
//   interval s ein Steinchen in einem Bogen** auf ihre Stelle (Vorhalt lead s, höchstens range m weit; Vorwarnung: er bläht
//   die Backen 0,5 s). Das Steinchen ('krakenpilz_stein') fliegt im Bogen, hüpft einmal auf und zerbröselt; es verletzt bei
//   Berührung. **Steht gern auf gleitenden Blöcken**: bewegte Plattformen (MovingBox/mover) tragen ihn mit – auch im Hüpfer
//   (er landet wieder auf seinem Block, entities/bonushelp.js Ride).
// Konter: **von oben besiegbar** (Draufspringen/Stampfen: platt, Abprall), ebenso Feuer, Tatze, Wurfsichel, Panzer, Wurf, Kanone,
//   Explosion, Riese, Stern, Rutschen (fliegt weg). Seitliche Berührung verletzt. Lava/Absturz = besiegt.
// Daten: { kind: 'krakenpilz', pos, dir?, yaw?, path?, loop?, behavior?: 'hop' | 'patrol' | 'chase', hop?: 0.9 (m je Hüpfer;
//          'hop' auf der Stelle: 0), height?: 0.45, every?: 0.7 (s Pause), sight?: 11, interval?: 2.6, first?: 0.9 (s bis zum
//          ersten Spucken), flight?: 1.0 (s Flug des Steinchens), lead?: 0.45, range?: 12, max?: 2 (Steinchen zugleich),
//          spit?: true, stone?: { bounce: 0.35, life: 3.5 }, wake?, edges?, drop?, id? }
//   Beispiel: { kind: 'krakenpilz', pos: [0, 2.5, -20], sight: 10 }   // auf einem gleitenden Block (mover)
// Zustände: idle → rest ⇄ crouch → air → land … | spit (0,9 s; Steinchen bei 0,5 s); squashed | flipped. Laufzeit: hops, spits,
//   stones (lebende Steinchen), info(). Sound: 'hop', 'land', 'swoop' (Spucken), 'stomp'.
//
// krakenpilz_stein – Spuck-Steinchen (auch einzeln): { kind: 'krakenpilz_stein', pos (Unterkante), vel: [vx, vy, vz], owner?,
//   bounce?: 0.35 (Rückprall beim ersten Aufschlag; 0 = zerbröselt gleich), life?: 3.5 } – Schwerkraft 26 m/s², verletzt bei
//   Berührung (Funkelstern zerschlägt es), zerbröselt beim zweiten Aufschlag, an Wänden, im Wasser/Lava oder nach life s;
//   jeder Angriff zerschlägt es. Kein Gegner. Laufzeit: state ('fly' | 'roll' | 'break'), bounces, info().

import { EnemyW2, activeFigure, clamp } from '../EnemyW2.js';
import { CourseEntity } from '../CourseEntity.js';
import { getModel } from '../../models/index.js';
import { POWER_HIT, isSichel, Ride, arcVelocity } from '../bonushelp.js';

const CROUCH = 0.16, LAND = 0.14, SPIT = 0.9, SPIT_AT = 0.5;
const G_STONE = 26;

class Krakenpilz extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'krakenpilz');
    this.half.set(0.36, 0.42, 0.36);
    this.shadow = 0.45;
    this.behavior = spec.behavior ?? (this.path ? 'patrol' : 'hop');
    this.hopLen = spec.hop ?? (this.behavior === 'hop' ? 0 : 0.9);
    this.hopH = spec.height ?? 0.45;
    this.every = spec.every ?? 0.7;
    this.sight = spec.sight ?? 11;
    this.interval = spec.interval ?? 2.6;
    this.flight = spec.flight ?? 1.0;
    this.lead = spec.lead ?? 0.45;
    this.range = spec.range ?? 12;
    this.maxStones = spec.max ?? 2;
    this.spitOn = spec.spit !== false;
    this.spitT = spec.first ?? 0.9;
    this.hops = 0;
    this.spits = 0;
    this.stones = [];
    this.ride = new Ride();
    this.state = 'idle';
    this.spitDone = false;
    if (level.view) { this.setModel(getModel('krakenpilz')); this.initShadows(2); }
  }

  update(dt) {
    this.stateT += dt;
    this.stones = this.stones.filter((s) => !s.removed);
    if (this.updateDefeat(dt)) return;
    if (this.spitT > 0) this.spitT -= dt;
    const sees = this.spitOn && this.canSee(this.sight, 4);
    this.ride.step(this, dt);
    switch (this.state) {
      case 'idle':
        this.stand(dt);
        if (!this.level.player || this.playerDist() < this.wake) this.setState('rest');
        break;
      case 'rest':
        this.vel.x = 0; this.vel.z = 0;
        this.moveWithGravity(dt);
        if (sees) this.facePlayer(dt, 8);
        if (sees && this.grounded && this.spitT <= 0 && this.stones.length < this.maxStones) { this.setState('spit'); this.spitDone = false; break; }
        if (this.stateT >= this.every && this.grounded) this.setState('crouch');
        break;
      case 'crouch':
        this.stand(dt);
        if (this.stateT >= CROUCH) this.jump(sees);
        break;
      case 'air': {
        const res = this.moveWithGravity(dt);
        if (this.removed) return;
        if (res.hitWall && this.turnCooldown <= 0) { this.turn(res); this.vel.x = this.dir.x * Math.hypot(this.vel.x, this.vel.z); this.vel.z = this.dir.z * Math.hypot(this.vel.x, this.vel.z); }
        if (this.turnCooldown > 0) this.turnCooldown -= dt;
        if (Math.abs(this.vel.x) + Math.abs(this.vel.z) > 0.05) this.faceToward(this.vel.x, this.vel.z, dt, 10);
        if (this.grounded && this.stateT > 0.05) { this.setState('land'); this.level.sfx('land'); }
        break;
      }
      case 'land':
        this.stand(dt);
        if (this.stateT >= LAND) this.setState('rest');
        break;
      case 'spit':
        this.stand(dt);
        this.facePlayer(dt, 10);
        if (!this.spitDone && this.stateT >= SPIT_AT) { this.spitDone = true; this.spit(); }
        if (this.stateT >= SPIT) { this.spitT = this.interval; this.setState('rest'); }
        break;
      default: break;
    }
  }

  /** Hüpfer: Richtung je nach Verhalten; an Kanten nicht hinunter (außer edges: false). */
  jump(sees) {
    let dx = 0, dz = 0;
    if (this.hopLen > 0) {
      if (this.behavior === 'chase' && sees) { const t = this.toPlayer(this._tp ?? (this._tp = {})); dx = t.x; dz = t.z; this.dir.x = dx; this.dir.z = dz; }
      else { if (this.path) this.followPath(); dx = this.dir.x; dz = this.dir.z; }
      if (this.edges && !this.groundAhead(dx, dz, this.hopLen * 0.8, 1.2)) {
        if (this.behavior === 'chase' && sees) { dx = 0; dz = 0; } else { this.turn(); dx = this.dir.x; dz = this.dir.z; }
      }
    }
    const vy = Math.sqrt(2 * 40 * this.hopH);
    const T = (2 * vy) / 40;
    const v = this.hopLen > 0 ? this.hopLen / T : 0;
    this.vel.set(dx * v, vy, dz * v);
    this.grounded = false;
    this.hops++;
    this.setState('air');
    this.level.sfx('hop');
  }

  /** Steinchen im Bogen auf die (vorausberechnete) Stelle der Figur spucken. */
  spit() {
    const p = this.player;
    if (!activeFigure(p)) return;
    const from = this.mouthPoint();
    let tx = p.pos.x + p.vel.x * this.lead, tz = p.pos.z + p.vel.z * this.lead;
    let dx = tx - from.x, dz = tz - from.z;
    const d = Math.hypot(dx, dz);
    if (d > this.range) { tx = from.x + (dx / d) * this.range; tz = from.z + (dz / d) * this.range; }
    const to = { x: tx, y: p.pos.y, z: tz };
    const T = clamp(this.flight * (0.6 + 0.4 * Math.min(1, d / 8)), 0.45, this.flight * 1.2);
    const v = arcVelocity({ x: from.x, y: from.y, z: from.z }, to, T, G_STONE);
    const st = this.level.spawn('krakenpilz_stein', { pos: [from.x, from.y - 0.12, from.z], vel: [v.x, v.y, v.z], owner: this, ...(this.spec.stone ?? {}) });
    if (st) this.stones.push(st);
    this.spits++;
    this.level.sfx('swoop');
    dx = tx - this.pos.x; dz = tz - this.pos.z;
    this.faceToward(dx, dz, 1, 99);
  }

  /** Mundlage (aus dem Modell, sonst 0,32 m vor dem Gesicht in 0,22 m Höhe). */
  mouthPoint() {
    const c = Math.cos(this.yaw), s = Math.sin(this.yaw);
    return { x: this.pos.x + c * 0.4, y: this.pos.y + 0.24, z: this.pos.z - s * 0.4 };
  }

  onPlayer(player, contact) {
    if (this.defeated) return 'none';
    if (this.slideAttack(player, contact)) return 'none';
    if (contact.pound) { this.squash(); this.level.sfx('stomp'); return 'none'; }
    if (contact.fromAbove) { this.squash(); return 'stomp'; }
    if (contact.dive) { this.onHit('claw', player); return 'none'; }
    return 'hurt';
  }

  onHit(kind, source) {
    if (this.defeated) return;
    if (kind === 'bump') { if (this.grounded) { this.vel.y = 6; this.grounded = false; this.setState('air'); } return; }
    if (kind === 'pound') {
      if (source && Math.abs(source.pos.y - this.pos.y) < 0.6) { this.squash(); this.level.sfx('stomp'); }
      return;
    }
    if (POWER_HIT.has(kind) || kind === 'slide' || isSichel(kind, source)) this.flip(source);
  }

  modelState() {
    const s = this.state;
    if (s === 'squashed') return { anim: 'squashed' };
    if (s === 'flipped') return { anim: 'defeated' };
    if (s === 'spit') return { anim: 'spit', progress: clamp(this.stateT / SPIT, 0, 1) };
    if (s === 'crouch') return { anim: 'hop', progress: clamp(this.stateT / CROUCH, 0, 1) * 0.22 };
    if (s === 'air') return { anim: 'hop', progress: 0.22 + clamp(this.stateT / 0.3, 0, 1) * 0.55 };
    if (s === 'land') return { anim: 'hop', progress: 0.8 + clamp(this.stateT / LAND, 0, 1) * 0.2 };
    return { anim: 'idle' };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    this.model.root.rotation.z = this.state === 'flipped' ? Math.min(Math.PI, this.stateT * 8) : 0;
  }

  info() {
    return { state: this.state, hops: this.hops, spits: this.spits, stones: this.stones.length, defeated: this.defeated, x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2) };
  }
}

// =====================================================================================================================
// Spuck-Steinchen
// =====================================================================================================================
class KrakenStein extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'krakenpilz_stein');
    this.half.set(0.12, 0.11, 0.12);
    this.shadow = 0.16;
    this.owner = spec.owner ?? null;
    if (Array.isArray(spec.vel)) this.vel.set(spec.vel[0], spec.vel[1], spec.vel[2]);
    this.bounceK = spec.bounce ?? 0.35;
    this.life = spec.life ?? 3.5;
    this.age = 0;
    this.state = 'fly';
    this.stateT = 0;
    this.bounces = 0;
    this.spin = 0;
    this._ign = (s) => (this.owner && s.owner === this.owner) || !!s.water;
    if (level.view) this.setModel(getModel('krakenpilz_stein'));
  }

  update(dt) {
    this.age += dt;
    this.stateT += dt;
    if (this.state === 'break') { if (this.stateT > 0.05) this.kill(); return; }
    if (this.age >= this.life) { this.shatter(); return; }
    const vy0 = this.vel.y;
    this.vel.y = Math.max(this.vel.y - G_STONE * dt, -24);
    if (this.state === 'roll') { const h = Math.hypot(this.vel.x, this.vel.z), k = Math.max(0, h - 6 * dt) / (h || 1); this.vel.x *= k; this.vel.z *= k; }
    const c = this.center();
    const res = this.level.world.moveAABB(c, this.half, { x: this.vel.x * dt, y: this.vel.y * dt, z: this.vel.z * dt }, { step: 0.05, ignore: this._ign });
    this.pos.set(c.x, c.y - this.half.y, c.z);
    this.spin += Math.hypot(this.vel.x, this.vel.z) * dt * 6;
    if (this.pos.y < this.level.killY) { this.kill(); return; }
    if (res.hitWall && Math.hypot(this.vel.x, this.vel.z) > 2) { this.shatter(); return; }
    if (res.grounded && vy0 < -1) {
      if (this.bounces === 0 && this.bounceK > 0) {
        this.bounces++;
        this.vel.y = -vy0 * this.bounceK; this.vel.x *= 0.6; this.vel.z *= 0.6;
        this.level.effects?.dust(this.pos, 2, 0.5);
        this.level.sfx('bump');
        this.state = 'roll';
      } else { this.shatter(); return; }
    } else if (res.grounded && this.state === 'roll' && this.stateT > 0.6) { this.shatter(); return; }
    // Wasser/Lava
    for (const s of this.level.world.overlapAABB(this.center(), this.half)) {
      if ((s.water || s.kill === 'lava') && this.pos.y < s.top - 0.05) { this.shatter(); return; }
    }
  }

  shatter() {
    if (this.state === 'break') return;
    this.state = 'break';
    this.stateT = 0;
    this.touch = false;
    this.level.effects?.debris(this.center(), 0x8a8296, 5);
    this.level.effects?.dust(this.pos, 3, 0.6);
    this.level.sfx('brickbreak');
  }

  onPlayer(player, contact) {
    if (this.state === 'break') return 'none';
    if (contact.star) { this.shatter(); return 'none'; }
    this.shatter();
    return 'hurt';
  }

  onHit(kind) { if (kind !== 'bump') this.shatter(); }

  modelState() { return { spin: this.spin }; }

  info() { return { state: this.state, bounces: this.bounces, age: +this.age.toFixed(2), x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2) }; }
}

export const KINDS = {
  krakenpilz: (level, spec) => new Krakenpilz(level, spec),
  krakenpilz_stein: (level, spec) => new KrakenStein(level, spec),
};
