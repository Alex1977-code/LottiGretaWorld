// Stachelwerfer – Gegner Welt 6 „Wolkeninseln“ (6-3 Fernost-Halle, Rätselbox „Stachelwerfer-Käfig“). Rundlicher Igel mit
// rotem Halstuch (Modell 'stachelwerfer'), der Stachelkugeln über dem Kopf herbeizaubert und wirft.
//
// stachelwerfer – steht (bzw. tänzelt pace m hin und her entlang axis oder läuft path ab) und blickt zur nächsten Figur. Ist
//   sie näher als sight m, wirft er alle interval s eine **Stachelkugel** (Wurf 0,9 s: die Kugel erscheint vor dem Bauch,
//   wird über den Kopf gestemmt und verlässt bei 62 % die Hände – model.hand()). Die Kugel fliegt im Bogen (flight s) und
//   landet lead m vor der Figur (höchstens range m weit; aim 'dir': gerade in Blickrichtung), danach **rollt** sie mit
//   roll m/s weiter, **prallt** an Wänden ab, rollt Hänge hinab, fällt über Kanten und zerfällt nach life s (höchstens max
//   Kugeln gleichzeitig).
//   Konter: **von oben** (Draufspringen = platt mit Abprall, Stampfattacke) – außer, er stemmt gerade eine Kugel über den
//   Kopf (dann sticht sie!); **von hinten** ist er arglos (seitliche Berührung von hinten verletzt nicht; er dreht sich erst
//   um, wenn er die Figur sieht). Alle Angriffe (Feuer, Tatze, Panzer, Wurf, Rutschen, Schwanzhieb, Kanone, Explosion, Stern,
//   Riese) besiegen ihn.
//   Seitliche Berührung von vorn verletzt.
//   Daten: { kind: 'stachelwerfer', pos, dir|yaw, sight?: 10, interval?: 2.4, first?: 1.0, ball?: 0.55 (Ø), flight?: 0.8,
//            lead?: 1.0, range?: 8, roll?: 4, life?: 6, max?: 3, aim?: 'player' | 'dir', pace?: 0, axis?: [1, 0],
//            speed?: 1, path?, loop?, wake?, drop? }
//   Zustände: idle | stand | throw | squashed | flipped. Laufzeit: throws, balls (lebende Kugeln), info().
//
// stachelkugel_wurf – geworfene Stachelkugel (auch einzeln: rollt von pos in dir los). Verletzt bei **jeder** Berührung
//   (auch von oben). Funkelstern, Riesentrank, Explosion, Kanonenkugel zerstören sie; Feuer, Tatze, Panzer, Wurf, Rutschen
//   prallen ab (sie rollt zurück). Zerfällt nach life s, in Wasser und Lava.
//   Daten: { kind: 'stachelkugel_wurf', pos (Bodenpunkt), vel?: [vx, vy, vz] (Flug) | dir: [dx, dz] + roll (rollt los),
//            size?: 0.55, roll?: 4, life?: 6, bounce?: 0.45 (Prallen am Boden nach dem Flug), owner? }
//   Zustände: fly | roll | break. Laufzeit: bounces (Wand), landAt (erste Bodenberührung), rolled (m), info().
// Sound: 'swoop' (Wurf), 'blockhit' (Wand), 'stomp', 'brickbreak' (zerfällt).

import { EnemyW2, STRONG, toWorld, localOffset, clamp, activeFigure } from '../EnemyW2.js';
import { CourseEntity } from '../CourseEntity.js';
import { getModel } from '../../models/index.js';
import { ballistic } from './bomb_cannon.js';
import { dirFromTo } from '../w6help.js';

const THROW = 0.9, HOLD0 = 0.35, RELEASE = 0.62, BREAK = 0.6;

// =====================================================================================================================
// Stachelkugel (Geschoss)
// =====================================================================================================================
class StachelWurf extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'stachelkugel_wurf');
    this.size = spec.size ?? 0.55;
    const r = this.size / 2;
    this.half.set(r * 0.92, r, r * 0.92);
    this.shadow = r * 1.05;
    this.rollSpeed = spec.roll ?? 4;
    this.life = spec.life ?? 6;
    this.bounceK = spec.bounce ?? 0.45;
    this.owner = spec.owner ?? null;
    this.spiky = true;               // wie die Stachelkugel der Bausteine: verletzt auch von oben
    this.windK = 0;
    this.age = 0;
    this.bounces = 0;
    this.rolled = 0;
    this.angle = 0;
    this.rdir = { x: 0, z: 1 };
    this._ign = (s) => !!this.owner && s.owner === this.owner;
    if (Array.isArray(spec.vel)) {
      this.vel.set(spec.vel[0], spec.vel[1], spec.vel[2]);
      const h = Math.hypot(this.vel.x, this.vel.z);
      if (h > 1e-3) { this.rdir.x = this.vel.x / h; this.rdir.z = this.vel.z / h; }
      this.state = 'fly';
    } else {
      const d = spec.dir ?? [0, 1], l = Math.hypot(d[0], d[1]) || 1;
      this.rdir.x = d[0] / l; this.rdir.z = d[1] / l;
      this.state = 'roll';
    }
    this.stateT = 0;
    this.yaw = Math.atan2(-this.rdir.z, this.rdir.x);
    if (level.view) this.setModel(getModel('stachelkugel', { size: this.size }));
  }

  setState(s) { this.state = s; this.stateT = 0; }

  update(dt) {
    this.stateT += dt;
    this.age += dt;
    if (this.state === 'break') { if (this.stateT >= BREAK) this.kill(); return; }
    if (this.age >= this.life) { this.breakUp(); return; }
    const x0 = this.pos.x, z0 = this.pos.z;
    if (this.state === 'fly') {
      const res = this.move(dt, { step: 0.1 });
      if (this.removed) return;
      if (res.hitWall) this.wallBounce(res);
      if (this.grounded && this.stateT > 0.04) {
        if (!this.landAt) this.landAt = { x: this.pos.x, y: this.pos.y, z: this.pos.z };
        // aufschlagen: einmal kurz hüpfen (gebremst), dann rollen
        if (!this.hopped && this.vel.y <= 0 && this.lastVy < -4 && this.bounceK > 0) {
          this.hopped = true;
          this.vel.y = -this.lastVy * this.bounceK; this.vel.x *= 0.55; this.vel.z *= 0.55;
          this.grounded = false; this.lastVy = 0;
          this.level.sfx('blockhit');
        } else { this.setState('roll'); this.level.effects?.dust(this.pos, 2, 0.6); }
      }
      this.lastVy = this.vel.y;
    } else {
      // rollen: geradeaus, hangabwärts schneller
      let sp = this.rollSpeed;
      const n = this.ground?.type === 'ramp' ? this.ground : null;
      if (n) {
        const down = n.dir ? (n.axis === 'x' ? { x: -n.dir, z: 0 } : { x: 0, z: -n.dir }) : null;
        if (down) { const k = down.x * this.rdir.x + down.z * this.rdir.z; sp *= 1 + 0.35 * k; }
      }
      this.vel.x = this.rdir.x * sp; this.vel.z = this.rdir.z * sp;
      const res = this.move(dt, { step: 0.25 });
      if (this.removed) return;
      if (res.hitWall) this.wallBounce(res);
    }
    const d = Math.hypot(this.pos.x - x0, this.pos.z - z0);
    this.rolled += d;
    this.angle += d / (this.size / 2);
    // Wasser/Lava: zerfällt
    for (const s of this.level.world.overlapAABB(this.center(), this.half)) {
      if ((s.water || s.kill === 'lava') && this.pos.y < s.top - 0.1) { this.level.effects?.splash?.(this.pos, s.top); this.breakUp(); return; }
    }
  }

  move(dt, opts) {
    this.vel.y = Math.max(this.vel.y - 40 * dt, -24);
    const c = this.center();
    const res = this.level.world.moveAABB(c, this.half, { x: this.vel.x * dt, y: this.vel.y * dt, z: this.vel.z * dt }, {
      step: opts.step, snap: this.grounded ? 0.3 : 0, ignore: this._ign,
    });
    this.pos.set(c.x, c.y - this.half.y, c.z);
    this.grounded = res.grounded;
    this.ground = res.ground;
    if (res.grounded && this.vel.y < 0) this.vel.y = 0;
    if (res.ceiling && this.vel.y > 0) this.vel.y = 0;
    if (this.pos.y < this.level.killY) this.kill();
    return res;
  }

  wallBounce(res) {
    const n = res.wallNormal;
    if (!n) return;
    const d = this.rdir.x * n.x + this.rdir.z * n.z;
    if (d < 0) { this.rdir.x -= 2 * d * n.x; this.rdir.z -= 2 * d * n.z; }
    const l = Math.hypot(this.rdir.x, this.rdir.z) || 1;
    this.rdir.x /= l; this.rdir.z /= l;
    if (this.state === 'fly') { const h = Math.hypot(this.vel.x, this.vel.z) * 0.6; this.vel.x = this.rdir.x * h; this.vel.z = this.rdir.z * h; }
    this.yaw = Math.atan2(-this.rdir.z, this.rdir.x);
    this.bounces++;
    this.level.sfx('blockhit');
    this.level.effects?.sparks(this.center(), 3);
  }

  /** Zurückprallen (Angriffe): rollt von der Quelle weg. */
  deflect(source) {
    const d = dirFromTo(source?.pos ?? this.pos, this.pos, { x: -this.rdir.x, z: -this.rdir.z });
    this.rdir.x = d.x; this.rdir.z = d.z;
    if (this.state === 'fly') { this.vel.x = d.x * 3; this.vel.z = d.z * 3; }
    this.yaw = Math.atan2(-d.z, d.x);
    this.level.sfx('blockhit');
    this.level.effects?.sparks(this.center(), 4);
  }

  breakUp() {
    if (this.state === 'break') return;
    this.setState('break');
    this.touch = false;
    this.vel.set(0, 0, 0);
    this.level.sfx('brickbreak');
  }

  onPlayer(player, contact) {
    if (this.state === 'break') return 'none';
    if (contact.star) { this.breakUp(); return 'none'; }
    return 'hurt';
  }

  onHit(kind, source) {
    if (this.state === 'break' || kind === 'bump') return;
    if (STRONG.has(kind)) { this.breakUp(); return; }
    this.deflect(source);
  }

  modelState() {
    if (this.state === 'break') return { anim: 'break', progress: Math.min(1, this.stateT / BREAK) };
    return { anim: 'roll', roll: this.angle };
  }

  info() { return { state: this.state, bounces: this.bounces, rolled: +this.rolled.toFixed(2), x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2) }; }
}

// =====================================================================================================================
// Stachelwerfer
// =====================================================================================================================
class Stachelwerfer extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'stachelwerfer');
    this.half.set(0.42, 0.5, 0.42);
    this.shadow = 0.5;
    this.sight = spec.sight ?? 10;
    this.interval = spec.interval ?? 2.4;
    this.cool = spec.first ?? 1.0;
    this.ballSize = spec.ball ?? 0.55;
    this.flight = spec.flight ?? 0.8;
    this.lead = spec.lead ?? 1.0;
    this.range = spec.range ?? 8;
    this.maxBalls = spec.max ?? 3;
    this.aimMode = spec.aim ?? 'player';
    this.pace = spec.pace ?? 0;
    this.speed = spec.speed ?? 1;
    const ax = spec.axis ?? [1, 0], al = Math.hypot(ax[0], ax[1]) || 1;
    this.axis = { x: ax[0] / al, z: ax[1] / al };
    this.paceDir = 1;
    this.home = this.pos.clone();
    this.baseYaw = this.yaw;
    this.throws = 0;
    this.ballList = [];
    this.released = false;
    this.state = 'idle';
    let model = null;
    if (level.view) model = this.setModel(getModel('stachelwerfer', { ball: this.ballSize }));
    this.hand = localOffset('stachelwerfer:hand', model, { anim: 'throw', progress: RELEASE - 0.02 }, (o) => model.hand(o), { x: 0.05, y: 1.35, z: 0 });
    this.initShadows(1);
  }

  get balls() { return this.ballList.filter((b) => !b.removed && b.state !== 'break').length; }
  /** Kugel über dem Kopf (sticht von oben)? */
  get overhead() { return this.state === 'throw' && this.stateT >= THROW * HOLD0 && this.stateT < THROW * RELEASE; }

  update(dt) {
    this.stateT += dt;
    if (this.updateDefeat(dt)) return;
    this.ballList = this.ballList.filter((b) => !b.removed);
    if (this.cool > 0) this.cool -= dt;
    switch (this.state) {
      case 'idle':
        this.stand(dt);
        if (this.playerActive() && this.playerDist() < this.wake) this.setState('stand');
        return;
      case 'stand': {
        const sees = this.canSee(this.sight, 4);
        if (sees) this.facePlayer(dt, 6);
        if (this.path) this.walk(dt, this.speed);
        else if (this.pace > 0 && !sees) this.paceStep(dt);
        else this.stand(dt);
        if (sees && this.cool <= 0 && this.balls < this.maxBalls && this.grounded) { this.released = false; this.vel.x = 0; this.vel.z = 0; this.setState('throw'); }
        return;
      }
      case 'throw':
        this.stand(dt);
        if (this.aimMode === 'player' && this.stateT < THROW * RELEASE) this.facePlayer(dt, 5);
        if (!this.released && this.stateT >= THROW * RELEASE) { this.released = true; this.release(); }
        if (this.stateT >= THROW) { this.cool = this.interval; this.setState('stand'); }
        return;
      default: this.stand(dt);
    }
  }

  paceStep(dt) {
    const a = this.axis;
    const off = (this.pos.x - this.home.x) * a.x + (this.pos.z - this.home.z) * a.z;
    if (off > this.pace) this.paceDir = -1; else if (off < -this.pace) this.paceDir = 1;
    if (this.grounded && !this.groundAhead(a.x * this.paceDir, a.z * this.paceDir, 0.1, 1.1)) this.paceDir = -this.paceDir;
    this.vel.x = a.x * this.speed * this.paceDir; this.vel.z = a.z * this.speed * this.paceDir;
    const res = this.moveWithGravity(dt);
    if (res.hitWall) this.paceDir = -this.paceDir;
    this.faceToward(this.vel.x, this.vel.z, dt, 8);
  }

  /** Kugel verlässt die Hände: Bogen auf eine Stelle lead m vor der Figur (bzw. gerade in Blickrichtung). */
  release() {
    const h = toWorld(this.pos, this.yaw, this.hand.x, this.hand.y, this.hand.z, {});
    const f = this.facing({});
    let tx = this.pos.x + f.x * Math.min(this.range, 4), tz = this.pos.z + f.z * Math.min(this.range, 4), ty = this.pos.y;
    const p = this.player;
    if (this.aimMode === 'player' && activeFigure(p)) {
      const d = dirFromTo(this.pos, p.pos, f), dist = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
      const L = clamp(dist - this.lead, 1.2, this.range);
      tx = this.pos.x + d.x * L; tz = this.pos.z + d.z * L; ty = Math.min(this.pos.y, p.pos.y);
    }
    const from = [h.x, h.y - this.ballSize / 2, h.z];
    const v = ballistic(from, [tx, ty, tz], this.flight);
    const b = this.level.spawn('stachelkugel_wurf', { pos: from, vel: v, size: this.ballSize, roll: this.spec.roll ?? 4, life: this.spec.life ?? 6, owner: this });
    if (b) { this.ballList.push(b); this.throws++; }
    this.level.sfx('swoop');
  }

  /** Steht die Figur hinter ihm (Blickrichtung weg von ihr)? */
  behind(player) {
    const f = this.facing({});
    const dx = player.pos.x - this.pos.x, dz = player.pos.z - this.pos.z, d = Math.hypot(dx, dz) || 1;
    return (dx * f.x + dz * f.z) / d < -0.35;
  }

  onPlayer(player, contact) {
    if (this.defeated) return 'none';
    if (contact.fromAbove || contact.pound) {
      if (this.overhead) return 'hurt';                // die Kugel über dem Kopf sticht
      this.squash(0.8);
      this.level.sfx('stomp');
      return contact.pound ? 'none' : 'stomp';
    }
    if (contact.dive) { this.onHit('claw', player); return 'none'; }
    if (this.slideAttack(player, contact)) return 'none';
    if (this.behind(player)) return 'none';             // von hinten arglos
    return 'hurt';
  }

  onHit(kind, source) {
    if (this.defeated) return;
    if (STRONG.has(kind)) { this.flip(source); return; }
    super.onHit(kind, source);
  }

  modelState() {
    const s = this.state;
    if (s === 'throw') return { anim: 'throw', progress: Math.min(1, this.stateT / THROW) };
    if (s === 'squashed') return { anim: 'defeated', progress: Math.min(1, this.stateT / 0.8) };
    if (s === 'flipped') return { anim: 'hit' };
    return { anim: 'idle' };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    this.model.root.rotation.z = this.state === 'flipped' ? Math.PI : 0;
  }

  info() {
    return {
      state: this.state, throws: this.throws, balls: this.balls, overhead: this.overhead, defeated: this.defeated,
      x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2),
    };
  }
}

export const KINDS = {
  stachelwerfer: (level, spec) => new Stachelwerfer(level, spec),
  stachelkugel_wurf: (level, spec) => new StachelWurf(level, spec),
};
