// Hackbeil-Pilz – Gegner Welt 5 (5-7 „Schleich-Festung“). Eigene Figur: stämmiger Pilz mit magenta Tupfenhut, auf dem als
// Kamm ein breites Stahl-Hackbeil sitzt (Gegner-Katalog: „springt hin und her – Konter: Springen“).
//
// Verhalten: hüpft (Hüpfer 0,6 s, hop m weit) auf seiner Bahn hin und her bzw. – sieht er eine Figur (sight m) – auf sie
//   zu. Steht sie reach m vor ihm, **holt er aus** (raise, Standard 0,55 s: lehnt sich zurück, die Schneide blitzt –
//   Vorwarnung, sfx 'swoop'), **hackt** nach vorn (chop 0,35 s: kippt um die Fußspitze, die Schneide schlägt 1,1–1,4 m vor
//   ihm auf; Staub, Beben) und **steckt danach fest** (stuck, Standard 1,3 s: zappelt mit den Füßen, Schwindelsterne),
//   zieht das Beil heraus (pull 0,35 s) und hüpft weiter (cooldown s bis zum nächsten Hieb).
// Treffer: Die **Schneide** verletzt, während sie herabsaust (chop ab 45 %) und im Aufschlag-Augenblick (0,12 s). Steckt er
//   fest, ist er **von oben besiegbar** (Draufspringen/Stampfen: platt mit Abprall) und seitlich harmlos. Sonst gilt:
//   **von hinten** draufspringen besiegt ihn, von vorn/oben trifft man das Beil auf dem Kopf (Treffer der Figur);
//   seitliche Berührung verletzt. Feuer, Krallen, Panzer, Wurf, Rutschen, Biss, Kanone, Explosion, Riesentrank, Stern,
//   POW, Stampfwelle daneben besiegen ihn immer.
// Daten: { kind: 'hackbeil_pilz', pos, dir?, path?, loop?, hop?: 0.8 (m je Hüpfer), sight?: 6, reach?: 1.9,
//          raise?: 0.55 (Vorwarnung), stuck?: 1.3, cooldown?: 0.9, behavior?: 'chase' (Standard) | 'patrol', wake?, edges?,
//          drop?, id? }
// Zustände: idle → hop ⇄ rest → raise → chop → stuck → pull → hop …; squashed | flipped. Laufzeit: chops, bladePos() →
//   { x, y, z } (Weltpunkt der Schneidenmitte, gerechnet wie im Modell: Kippdrehpunkt 0,3 m vor dem Fuß),
//   vulnerable (steckt fest), info(). Modell 'hackbeil_pilz' (state { anim: idle|hop|raise|chop|stuck|squashed, progress }).

import { EnemyW2, STRONG, activeFigure, toWorld, clamp, maskedFrom } from '../EnemyW2.js';
import { getModel } from '../../models/index.js';

const HOP = 0.6, REST = 0.14, CHOP = 0.35, PULL = 0.35, HIT_GRACE = 0.12;
const PIV = 0.3, BLADE_R = 0.4;
const CHOP_ANG = Math.PI / 2 + 0.14, STUCK_ANG = Math.PI / 2 + 0.2;

/** Schneidenmitte relativ zum Fuß (x vorn, y oben) bei Kippwinkel a (≤ 0 = nach vorn) und Hub dy – wie das Modell. */
function bladeLocal(a, dy = 0) {
  const rx = -PIV, ry = 0.94;
  return { x: PIV + rx * Math.cos(a) - ry * Math.sin(a), y: dy + rx * Math.sin(a) + ry * Math.cos(a) };
}

class HackbeilPilz extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'hackbeil_pilz');
    this.half.set(0.34, 0.58, 0.34);
    this.shadow = 0.42;
    this.hopLen = spec.hop ?? 0.8;
    this.sight = spec.sight ?? 6;
    this.reach = spec.reach ?? 1.9;
    this.raiseT = spec.raise ?? 0.55;
    this.stuckT = spec.stuck ?? 1.3;
    this.coolTime = spec.cooldown ?? 0.9;
    this.behavior = spec.behavior ?? 'chase';
    this.cool = 0.4;
    this.chops = 0;
    this.hits = 0;
    this.hopDir = { x: this.dir.x, z: this.dir.z };
    this.state = 'idle';
    this._bp = {};
    if (level.view) this.setModel(getModel('hackbeil_pilz'));
    this.initShadows(2);
  }

  get vulnerable() { return this.state === 'stuck' || this.state === 'pull'; }

  /** Kippwinkel und Hub wie im Modell (für die Schneide). */
  pose() {
    const s = this.state;
    if (s === 'chop') { const p = Math.min(1, this.stateT / CHOP); return { a: -CHOP_ANG * p * p * p, dy: Math.sin(p * Math.PI) * 0.12 }; }
    if (s === 'stuck') return { a: -STUCK_ANG, dy: 0 };
    if (s === 'pull') { const k = 1 - Math.min(1, this.stateT / PULL); return { a: -STUCK_ANG * k * k, dy: 0 }; }
    if (s === 'raise') return { a: 0.38 * Math.min(1, this.stateT / 0.25), dy: 0 };
    return { a: 0, dy: 0 };
  }

  /** Weltpunkt der Schneidenmitte. */
  bladePos(out = this._bp) {
    const { a, dy } = this.pose();
    const l = bladeLocal(a, dy);
    return toWorld(this.pos, this.yaw, l.x, l.y, 0, out);
  }

  /** Figur, auf die er es abgesehen hat (aktiv, in Sicht), oder null. */
  prey(range = this.sight) {
    const p = this.player;
    if (!activeFigure(p)) return null;
    if (Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) > range || Math.abs(p.pos.y - this.pos.y) > 2) return null;
    if (maskedFrom(this.level, this, p)) return null;   // Pilz-Maske (Welt 6)
    return p;
  }

  /** Steht die Figur vor ihm in Hiebweite? */
  inReach(p) {
    if (!p) return false;
    const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z, d = Math.hypot(dx, dz);
    if (d > this.reach || Math.abs(p.pos.y - this.pos.y) > 1.2) return false;
    const f = this.facing({});
    return d < 0.6 || (dx * f.x + dz * f.z) / d > 0.45;
  }

  update(dt) {
    this.stateT += dt;
    if (this.cool > 0) this.cool -= dt;
    if (this.updateDefeat(dt)) return;
    switch (this.state) {
      case 'idle':
        this.stand(dt);
        if (!this.level.player || this.playerDist() < this.wake) this.setState('rest');
        break;
      case 'rest': {
        this.stand(dt);
        const p = this.behavior === 'chase' ? this.prey() : null;
        if (p) this.faceToward(p.pos.x - this.pos.x, p.pos.z - this.pos.z, dt, 10);
        if (this.cool <= 0 && p && this.inReach(p)) { this.startRaise(p); break; }
        const close = p && Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < 1.1;
        if (this.stateT >= REST && !close) this.startHop(p);
        break;
      }
      case 'hop': this.hopStep(dt); break;
      case 'raise': {
        this.stand(dt);
        const p = this.prey(this.reach + 1.5);
        if (p && this.stateT < this.raiseT * 0.6) this.faceToward(p.pos.x - this.pos.x, p.pos.z - this.pos.z, dt, 4);
        if (this.stateT >= this.raiseT) { this.setState('chop'); this.half.y = 0.5; }
        break;
      }
      case 'chop':
        this.stand(dt);
        if (this.stateT >= CHOP * 0.45) this.bladeHurt();
        if (this.stateT >= CHOP) {
          this.chops++;
          this.setState('stuck');
          this.half.y = 0.4;
          const b = this.bladePos();
          this.level.shake(0.18);
          this.level.sfx('slam');
          this.level.effects?.dust({ x: b.x, y: this.pos.y, z: b.z }, 6, 1);
        }
        break;
      case 'stuck':
        this.stand(dt);
        if (this.stateT < HIT_GRACE) this.bladeHurt();
        if (this.stateT >= this.stuckT) this.setState('pull');
        break;
      case 'pull':
        this.stand(dt);
        if (this.stateT >= PULL) { this.half.y = 0.58; this.cool = this.coolTime; this.setState('rest'); }
        break;
      default: break;
    }
  }

  startRaise(p) {
    this.faceToward(p.pos.x - this.pos.x, p.pos.z - this.pos.z, 1, 100);
    this.setState('raise');
    this.level.sfx('swoop');
  }

  startHop(p) {
    if (p) {
      const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d > 0.3) { this.hopDir.x = dx / d; this.hopDir.z = dz / d; }
    } else {
      if (this.path) { this.followPath(); this.hopDir.x = this.dir.x; this.hopDir.z = this.dir.z; }
      if (this.edges && this.grounded && !this.groundAhead(this.hopDir.x, this.hopDir.z, this.hopLen * 0.6, 1.1)) { this.turn(); this.hopDir.x = this.dir.x; this.hopDir.z = this.dir.z; }
    }
    this.blocked = !!p && this.edges && this.grounded && !this.groundAhead(this.hopDir.x, this.hopDir.z, this.hopLen * 0.6, 1.1);
    this.setState('hop');
  }

  hopStep(dt) {
    const k = this.stateT / HOP;
    const air = k > 0.15 && k < 0.85 && !this.blocked;
    const sp = air ? this.hopLen / (HOP * 0.7) : 0;
    this.vel.x = this.hopDir.x * sp; this.vel.z = this.hopDir.z * sp;
    const res = this.moveWithGravity(dt);
    if (res.hitWall && !this.prey()) { this.turn(res); this.hopDir.x = this.dir.x; this.hopDir.z = this.dir.z; }
    this.faceToward(this.hopDir.x, this.hopDir.z, dt, 12);
    if (k >= 1) {
      this.setState('rest');
      if (!this.prey()) { this.dir.x = this.hopDir.x; this.dir.z = this.hopDir.z; }
    }
  }

  /** Schneide gegen alle Figuren (Kugel r 0,4 m gegen die Hülle der Figur). */
  bladeHurt() {
    const b = this.bladePos();
    for (const p of this.level.players ?? [this.level.player]) {
      if (!activeFigure(p)) continue;
      const c = p.center();
      const dx = Math.max(0, Math.abs(b.x - c.x) - p.half.x), dy = Math.max(0, Math.abs(b.y - c.y) - p.half.y), dz = Math.max(0, Math.abs(b.z - c.z) - p.half.z);
      if (Math.hypot(dx, dy, dz) < BLADE_R && p.hurt(this)) this.hits++;
    }
  }

  // ------------------------------------------------------------------ Treffer

  behind(player) {
    const dx = player.pos.x - this.pos.x, dz = player.pos.z - this.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.12) return false;
    const f = this.facing({});
    return (dx * f.x + dz * f.z) / d < -0.2;
  }

  onPlayer(player, contact) {
    if (this.defeated) return 'none';
    if (this.slideAttack(player, contact)) return 'none';
    if (contact.dive) { this.onHit('claw', player); return 'none'; }
    if (contact.fromAbove || contact.pound) {
      if (this.vulnerable || this.behind(player)) { this.squash(); this.level.sfx('stomp'); return contact.pound ? 'none' : 'stomp'; }
      return 'hurt';   // das Beil auf dem Kopf
    }
    if (this.vulnerable) return 'none';
    return 'hurt';
  }

  onHit(kind, source) {
    if (this.defeated) return;
    if (kind === 'pound') {
      if (source?.pos && Math.abs(source.pos.y - this.pos.y) < 0.6) { this.squash(); this.level.sfx('stomp'); }
      return;
    }
    this.flip(source, STRONG.has(kind) ? 9 : 7);
  }

  // ------------------------------------------------------------------ Darstellung

  modelState() {
    const s = this.state;
    if (s === 'hop') return { anim: 'hop', progress: clamp(this.stateT / HOP, 0, 1) };
    if (s === 'raise') return { anim: 'raise' };
    if (s === 'chop') return { anim: 'chop', progress: clamp(this.stateT / CHOP, 0, 1) };
    if (s === 'stuck') return { anim: 'stuck' };
    if (s === 'squashed') return { anim: 'squashed' };
    return { anim: 'idle' };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    if (this.state === 'flipped') this.model.root.rotation.z = Math.min(Math.PI, this.stateT * 6);
    else this.model.root.rotation.z = 0;
  }

  info() {
    const b = this.bladePos({});
    return {
      state: this.state, chops: this.chops, hits: this.hits, vulnerable: this.vulnerable, defeated: this.defeated,
      x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2), yaw: +this.yaw.toFixed(2),
      blade: [+b.x.toFixed(2), +b.y.toFixed(2), +b.z.toFixed(2)],
    };
  }
}

export const KINDS = { hackbeil_pilz: (level, spec) => new HackbeilPilz(level, spec) };
