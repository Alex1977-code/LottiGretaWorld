// Lava-Gegner der Welt 4: Lavabrocken (4-A, 4-Burg, Boss Lavafelsen-König) und Lavafunke (4-Burg).
//
// lavabrocken – Lavastein-Wesen: watschelt/folgt der nächsten Figur, holt aus (0,45 s) und stürmt los (charge, 5 m/s,
//   1,1 s; bremst an Kanten/Wänden). **Draufspringen betäubt** (stunned, Glut kühlt ab, Abprall) – dann ist er **tragbar
//   und werfbar** wie der Rollpilz: Aktion hebt auf (oder Rennen + Berühren), Aktion wirft (Bogen, leichte Zielhilfe zum
//   Endgegner), Ducken + Aktion setzt ab. Geworfen **zerplatzt** er an Gegnern (besiegt sie: onHit('throw')), am
//   Endgegner (onHit('throw', brocken) – nur so nimmt der Lavafelsen-König Schaden) und an Wänden (Ziegel/Kisten:
//   onHit('shell')); landet er auf dem Boden, liegt er wieder betäubt da (stun s, danach wackelt er und steht auf).
//   **Druckfelder:** Lavabrocken zählen als Gewicht (pfeld, figuren.js weightsOn); auf einem Druckfeld bleibt er liegen,
//   bis man ihn aufhebt. Konter: betäubt + Stampfattacke zerbricht ihn; Wurf eines anderen Brockens, Kanonenkugel,
//   Explosion, Riesentrank, Funkelstern besiegen; Krallen/Schwanzhieb, Faust, Rutschen, Panzer, Biss, Stampfwelle daneben
//   betäuben; **Feuer prallt ab** (Lavawesen). Lava/Giftwasser/Absturz: zerschmilzt (besiegt). Seitlich (wach) = Treffer;
//   betäubt harmlos.
//   Daten: { kind: 'lavabrocken', pos, path?, loop?, dir?, behavior?: 'chase' (Standard) | 'walk', speed?: 1.2,
//            chaseSpeed?: 1.8, sight?: 7, charge?: true, chargeSpeed?: 5, stun?: 6 (s betäubt), vel?: [vx, vy, vz]
//            (startet im Flug, z. B. vom Endgegner gerufen), owner? (Endgegner), wake?, edges?, drop? }
//   Zustände: idle → walk | chase → windup → charge → cool → …; air (Start im Flug); stunned → getup → walk; carried;
//   thrown; burst (zerplatzt) | squashed | flipped. Laufzeit: weight (1), thrownBy, hits, info().
//
// lavafunke – springt im Takt aus der Lava hoch und fällt zurück (unbesiegbar außer Funkelstern/Riesentrank; jede
//   Berührung verletzt). Reihen: count Funken nebeneinander (spacing m entlang dir), je Glied um stagger Takt versetzt –
//   alle laufen auf der Level-Uhr (level.time) und bleiben im Gleichtakt.
//   Daten: { kind: 'lavafunke', pos: [x, y, z] (Lava-Oberfläche), height?: 4 (Sprunghöhe), period?: 2.6 (s Takt),
//            phase?: 0..1, count?: 1, spacing?: 1.6, dir?: [1, 0] (Reihe entlang), stagger?: 0.12, id? }
//   Zustände: down (in der Lava, unsichtbar, harmlos) | up (in der Luft). Laufzeit: jumps, height(), info().

import { EnemyW2, STRONG, clamp } from '../EnemyW2.js';
import { getModel } from '../../models/index.js';

const STUN = 6, GETUP = 0.7, WINDUP = 0.45, CHARGE = 1.1, COOL = 1.4, BURST = 0.9;
const THROW_G = 28;

// =====================================================================================================================
// Lavabrocken
// =====================================================================================================================

class Lavabrocken extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'lavabrocken');
    this.half.set(0.4, 0.45, 0.4);
    this.shadow = 0.45;
    this.speed = spec.speed ?? 1.2;
    this.chaseSpeed = spec.chaseSpeed ?? 1.8;
    this.behavior = spec.behavior ?? 'chase';
    this.sight = spec.sight ?? 7;
    this.canCharge = spec.charge !== false;
    this.chargeSpeed = spec.chargeSpeed ?? 5;
    this.stunTime = spec.stun ?? STUN;
    this.owner = spec.owner ?? null;
    this.carryable = true;
    this.holdStyle = 'over';
    this.weight = 1;
    this.stunT = 0;
    this.grace = 0;
    this.thrownBy = null;
    this.hits = 0;
    this.cool = 0;
    this.state = 'idle';
    if (Array.isArray(spec.vel)) { this.vel.set(spec.vel[0], spec.vel[1], spec.vel[2]); this.state = 'air'; this.grounded = false; }
    if (level.view) this.setModel(getModel('lavabrocken'));
    this.initShadows(1);
  }

  canCarry() { return this.state === 'stunned' || this.state === 'getup'; }

  /** Liegt auf einem Druckfeld? */
  get onPlate() { return this.grounded && this.ground?.owner?.kind === 'pfeld'; }

  update(dt) {
    this.stateT += dt;
    if (this.grace > 0) this.grace -= dt;
    if (this.cool > 0) this.cool -= dt;
    if (this.state === 'burst') { if (this.stateT >= BURST) this.kill(); return; }
    if (this.updateDefeat(dt)) return;
    switch (this.state) {
      case 'idle':
        this.stand(dt);
        if (!this.level.player || this.playerDist() < this.wake) this.setState('walk');
        break;
      case 'air':
        this.vel.x *= Math.exp(-0.6 * dt); this.vel.z *= Math.exp(-0.6 * dt);
        this.moveWithGravity(dt);
        if (this.grounded && this.stateT > 0.05) { this.level.effects?.dust(this.pos, 4, 0.9); this.setState('walk'); }
        break;
      case 'walk':
        this.walk(dt, this.speed);
        if (this.behavior === 'chase' && this.grounded && this.canSee(this.sight, 2.5)) this.setState('chase');
        break;
      case 'chase': {
        this.chase(dt, this.chaseSpeed);
        if (!this.canSee(this.sight * 1.5, 4)) { this.setState('walk'); break; }
        const d = this.playerDist();
        if (this.canCharge && this.cool <= 0 && d < this.sight * 0.8 && d > 1.2 && this.grounded) {
          this.setState('windup');
          const t = this.toPlayer({});
          this.dir.x = t.x; this.dir.z = t.z;
          this.level.sfx('panic');
        }
        break;
      }
      case 'windup':
        this.stand(dt);
        this.faceToward(this.dir.x, this.dir.z, dt, 14);
        if (this.stateT >= WINDUP) this.setState('charge');
        break;
      case 'charge': {
        let s = this.chargeSpeed;
        if (this.edges && this.grounded && !this.groundAhead(this.dir.x, this.dir.z, 0.2, 1.1)) s = 0;
        this.vel.x = this.dir.x * s; this.vel.z = this.dir.z * s;
        const res = this.moveWithGravity(dt);
        this.faceToward(this.dir.x, this.dir.z, dt, 14);
        if (this.stateT > 0.25 && this.stateT % 0.2 < dt) this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 0.3, z: this.pos.z }, 2);
        if (res.hitWall || s === 0 || this.stateT >= CHARGE) { this.cool = COOL; this.setState('walk'); }
        break;
      }
      case 'stunned': {
        const f = Math.exp(-8 * dt);
        this.vel.x *= f; this.vel.z *= f;
        this.moveWithGravity(dt);
        if (this.onPlate) this.stunT = 0;   // auf dem Druckfeld bleibt er liegen
        else this.stunT += dt;
        if (this.stunT >= this.stunTime) this.setState('getup');
        break;
      }
      case 'getup':
        this.stand(dt);
        if (this.stateT >= GETUP) this.wake_();
        break;
      case 'carried':
        this.followCarrier();
        break;
      case 'thrown': this.fly(dt); break;
      default: break;
    }
  }

  // ------------------------------------------------------------------ Zustandswechsel

  stun(keepTimer = false) {
    if (this.defeated) return;
    if (this.state !== 'stunned') this.level.sfx('stomp');
    this.setState('stunned');
    if (!keepTimer) this.stunT = 0;
    this.touch = true;
    this.vel.x = 0; this.vel.z = 0;
    this.grace = Math.max(this.grace, 0.25);
  }

  wake_() {
    this.setState('walk');
    this.stunT = 0;
    this.touch = true;
    this.vel.y = 3;
    this.grounded = false;
    if (this.playerActive()) { const t = this.toPlayer({}); this.dir.x = t.x; this.dir.z = t.z; this.yaw = Math.atan2(-t.z, t.x); }
  }

  /** Zerplatzt (geworfen gegen Gegner/Endgegner/Wand) – besiegt. */
  burst() {
    if (this.defeated && this.state === 'burst') return;
    this.carryable = false;
    this.touch = false;
    this.setState('burst');
    this.vel.set(0, 0, 0);
    this.level.effects?.sparks(this.center(), 14);
    this.level.effects?.debris(this.center(), 0x3a2a26, 8);
    this.level.sfx('brickbreak');
    this.markDefeated();
  }

  // ------------------------------------------------------------------ Wurf

  onPickup() {
    this.setState('carried');
    this.touch = false;
    this.vel.set(0, 0, 0);
  }

  onThrow(player, o) {
    if (o.gentle) {
      this.pos.x = player.pos.x + o.dir.x * 0.8; this.pos.z = player.pos.z + o.dir.z * 0.8;
      this.pos.y = player.pos.y + 0.1;
      this.vel.set(0, 0, 0);
      this.stun();
      this.grace = 0.4;
      return;
    }
    let dx = o.dir.x, dz = o.dir.z;
    // Zielhilfe: Endgegner (boss) grob in Wurfrichtung → leicht einlenken
    const aim = this.aimTarget(player, dx, dz);
    if (aim) { dx = aim.x; dz = aim.z; }
    const along = Math.max(0, player.vel.x * dx + player.vel.z * dz);
    const sp = 10 + along * 0.3;
    this.vel.set(dx * sp, 4.5, dz * sp);
    this.dir.x = dx; this.dir.z = dz;
    this.yaw = Math.atan2(-dz, dx);
    this.thrownBy = player;
    this.touch = true;
    this.grounded = false;
    this.setState('thrown');
  }

  onDrop() {
    this.stun(true);
    this.vel.set(0, 2, 0);
    this.grace = 0.4;
  }

  aimTarget(player, dx, dz) {
    let best = null, bd = 0.82;   // cos 35°
    for (const e of this.level.entities) {
      if (!e.boss || !e.alive || e.removed || e.hp <= 0 || e.visible === false) continue;
      const ex = e.pos.x - player.pos.x, ez = e.pos.z - player.pos.z, d = Math.hypot(ex, ez);
      if (d < 0.5 || d > 11) continue;
      const c = (ex * dx + ez * dz) / d;
      if (c > bd) { bd = c; best = { x: ex / d, z: ez / d }; }
    }
    if (!best) return null;
    // höchstens 25° einlenken
    const a0 = Math.atan2(dz, dx), a1 = Math.atan2(best.z, best.x);
    let da = Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0));
    da = clamp(da, -0.44, 0.44);
    return { x: Math.cos(a0 + da), z: Math.sin(a0 + da) };
  }

  fly(dt) {
    const res = this.moveWithGravity(dt, { gravity: THROW_G, step: 0.2 });
    if (this.removed || this.defeated) return;
    if (this.hitTargets()) return;
    if (res.hitWall) {
      const s = res.wallShape;
      if (s?.owner && s.owner !== this && typeof s.owner.onHit === 'function') s.owner.onHit('shell', this, s);
      this.level.sfx('blockhit');
      this.burst();
      return;
    }
    if (this.grounded && this.stateT > 0.05) {
      this.level.effects?.dust(this.pos, 5, 1);
      this.level.shake(0.08);
      this.thrownBy = null;
      this.stun();
    }
  }

  /** Geworfen: Gegner und Endgegner treffen. true = zerplatzt. */
  hitTargets() {
    for (const e of this.level.entities) {
      if (e === this || !e.alive || e.removed || e.carrier) continue;
      if (e.boss) {
        if (e.touch === false && e.visible === false) continue;
        if (e.hp <= 0 || !this.overlaps(e, 0.1)) continue;
        e.onHit?.('throw', this);
        this.hits++;
        this.level.shake(0.2);
        this.burst();
        return true;
      }
      if (!e.enemy || e.defeated || e.touch === false) continue;
      if (!this.overlaps(e, 0.05)) continue;
      e.onHit?.('throw', this);
      this.hits++;
      this.level.sfx('stomp');
      this.burst();
      return true;
    }
    return false;
  }

  // ------------------------------------------------------------------ Berührung und Treffer

  onPlayer(player, contact) {
    if (this.defeated || this.state === 'carried' || this.state === 'burst') return 'none';
    if (this.state === 'thrown') return 'none';
    if (this.state === 'stunned' || this.state === 'getup') {
      if (contact.pound) { this.flip(player, 6); this.level.sfx('brickbreak'); return 'none'; }
      if (contact.fromAbove) { this.stun(); return 'stomp'; }
      if (this.grace > 0) return 'none';
      if (player.input?.run && player.canPickUp?.()) { player.pickUp(this); return 'none'; }
      return 'none';
    }
    if (this.slideAttack(player, contact)) return 'none';
    if (contact.pound) { this.stun(); return 'none'; }
    if (contact.fromAbove) { this.stun(); return 'stomp'; }
    if (contact.dive) { this.onHit('claw', player); return 'none'; }
    return 'hurt';
  }

  onHit(kind, source) {
    if (this.defeated || this.state === 'carried' || this.state === 'burst') return;
    if (source === this) return;
    if (kind === 'fire') { this.level.effects?.sparks(this.center(), 3); return; }   // Lavawesen: Feuer prallt ab
    if (STRONG.has(kind) || kind === 'throw') { this.flip(source, 7); return; }
    if (kind === 'pound') {
      const sameH = source?.pos && Math.abs(source.pos.y - this.pos.y) < 0.6;
      if (!sameH) return;
      if (this.state === 'stunned') { this.flip(source, 6); return; }
      this.stun();
      return;
    }
    // Krallen, Schwanzhieb, Faust, Rutschen, Panzer, Biss, Stoß: umwerfen (betäubt)
    if (this.state === 'thrown') return;
    this.stun();
  }

  // ------------------------------------------------------------------ Darstellung

  modelState() {
    const s = this.state;
    if (s === 'walk' || s === 'chase' || s === 'air') return { anim: 'walk', speed: s === 'chase' ? this.chaseSpeed : this.speed };
    if (s === 'windup' || s === 'charge') return { anim: 'charge', speed: this.chargeSpeed };
    if (s === 'stunned' || s === 'getup') return { anim: 'stunned' };
    if (s === 'carried') return { anim: 'carried' };
    if (s === 'thrown') return { anim: 'thrown' };
    if (s === 'burst') return { anim: 'defeated' };
    if (s === 'squashed' || s === 'flipped') return { anim: 'defeated' };
    return { anim: 'idle' };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    if (this.state === 'getup') this.model.root.position.x += Math.sin(this.stateT * 40) * 0.03;
    if (this.state === 'windup') this.model.root.position.x += Math.sin(this.stateT * 60) * 0.02;
  }

  info() {
    return { state: this.state, x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2), stunT: +this.stunT.toFixed(2), onPlate: this.onPlate, hits: this.hits, defeated: this.defeated };
  }
}

// =====================================================================================================================
// Lavafunke
// =====================================================================================================================

const FUNKE_G = 22;

class Lavafunke extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'lavafunke');
    this.flying = true;
    this.wake = 0;
    this.half.set(0.3, 0.3, 0.3);
    this.shadow = 0;
    this.base = this.pos.clone();
    this.period = spec.period ?? 2.6;
    this.phase = ((spec.phase ?? 0) % 1 + 1) % 1;
    this.jump = spec.height ?? 4;
    // Flugzeit passt in den Takt (sonst Schwerkraft erhöhen)
    let g = FUNKE_G;
    const tFlight = (gg) => 2 * Math.sqrt(2 * this.jump / gg);
    if (tFlight(g) > this.period * 0.85) g = 8 * this.jump / (this.period * 0.85) ** 2;
    this.g = g;
    this.v0 = Math.sqrt(2 * g * this.jump);
    this.flight = tFlight(g);
    this.state = 'down';
    this.jumps = 0;
    this.touch = false;
    if (level.view) { this.setModel(getModel('lavafunke')); this.model.root.visible = false; }
    this.track();
  }

  /** Stand im Takt: Zeit seit dem Absprung (s) dieses Zyklus. */
  cycleT() {
    const u = (this.level.time / this.period + this.phase) % 1;
    return u * this.period;
  }

  height() { return this.pos.y - this.base.y; }

  track() {
    const t = this.cycleT();
    if (t < this.flight) {
      const y = this.v0 * t - 0.5 * this.g * t * t;
      if (this.state !== 'up') { this.setState('up'); this.jumps++; this.level.effects?.sparks({ x: this.base.x, y: this.base.y + 0.2, z: this.base.z }, 4); }
      this.pos.set(this.base.x, this.base.y + Math.max(-0.6, y) - 0.3, this.base.z);
      this.vel.y = this.v0 - this.g * t;
      this.touch = y > -0.1;
    } else {
      if (this.state !== 'down') { this.setState('down'); this.level.effects?.sparks({ x: this.base.x, y: this.base.y + 0.1, z: this.base.z }, 3); }
      this.pos.set(this.base.x, this.base.y - 0.9, this.base.z);
      this.vel.y = 0;
      this.touch = false;
    }
  }

  update(dt) {
    this.stateT += dt;
    if (this.updateDefeat(dt)) return;
    this.track();
  }

  onPlayer() { return this.defeated || !this.touch ? 'none' : 'hurt'; }

  onHit(kind, source) {
    if (this.defeated || this.state !== 'up') return;
    if (kind === 'star' || kind === 'mega' || kind === 'bomb') this.flip(source, 5);
  }

  modelState() { return { anim: this.state === 'up' ? (this.vel.y > 0 ? 'rise' : 'fall') : 'idle' }; }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    this.model.root.visible = this.state === 'up' || this.state === 'flipped';
  }

  info() { return { state: this.state, y: +this.pos.y.toFixed(2), h: +this.height().toFixed(2), jumps: this.jumps, touch: this.touch }; }
}

function makeFunken(level, spec) {
  const n = Math.max(1, Math.round(spec.count ?? 1));
  const d = Array.isArray(spec.dir) ? spec.dir : [1, 0];
  const l = Math.hypot(d[0], d[1]) || 1;
  const dx = d[0] / l, dz = d[1] / l;
  const sp = spec.spacing ?? 1.6, st = spec.stagger ?? 0.12;
  const p = spec.pos ?? [0, 0, 0];
  const first = new Lavafunke(level, { ...spec, count: 1 });
  for (let i = 1; i < n; i++) {
    level.spawn('lavafunke', { ...spec, id: spec.id ? `${spec.id}_${i}` : undefined, count: 1, pos: [p[0] + dx * sp * i, p[1], p[2] + dz * sp * i], phase: (spec.phase ?? 0) - st * i });
  }
  return first;
}

export const KINDS = {
  lavabrocken: (level, spec) => new Lavabrocken(level, spec),
  lavafunke: makeFunken,
};

