// Rollpilz und Großrollpilz (Bauplan Welt 2: „läuft, rollt nach Treffer“, Konter: springen, aufheben, werfen;
// 2-A: „Großrollpilze umwerfen und in die Lava stoßen“).
//
// rollpilz: läuft/patrouilliert wie ein Pilzling (behavior 'chase': läuft auf die nächste Figur zu). Draufspringen
//   wirft ihn auf den Rücken (Zustand back, Abprall) – er ist dann NICHT besiegt, sondern tragbar (carryable): Aktion
//   in Reichweite (oder Rennen + Berühren) hebt ihn auf, Aktion wirft ihn (Bogen, rollt dann am Boden: thrown).
//   Ein geworfener/gekickter Rollpilz besiegt Gegner, die er trifft (onHit('throw')), zerbricht Kisten/Ziegel an
//   Wänden (onHit('shell')) und zerplatzt dabei selbst; nach 2,5 s Rollen bleibt er wieder auf dem Rücken liegen.
//   Seitlich in einen liegenden laufen kickt ihn (rollt flach, 7 m/s). Auf einen liegenden springen: Abprall, er
//   bleibt länger liegen. Nach up s (6) zappelt er 0,8 s (getup) und steht wieder auf.
//   Besiegt: Stampfattacke auf den liegenden, Feuer, Krallen, Panzer, Wurf, Explosion, Kanonenkugel, Riesentrank,
//   Funkelstern, Lava, Absturz. Stampfwelle daneben / POW / Hineinrutschen werfen ihn um (back). Seitlich (stehend)
//   = Treffer.
// grossrollpilz: 2,6-mal so groß, nicht tragbar, hp 3. Draufspringen wirft ihn um (−1 hp, Abprall), auf den
//   liegenden springen kostet je 1 hp; bei 0 hp platt. Liegend lässt er sich stoßen: hineinlaufen (5–9 m/s je nach
//   Tempo), Rutschen (9 m/s), Tatzenhieb (8 m/s, −1 hp) – er rutscht mit Reibung (3,5 m/s²), fällt über Kanten in Lava/Abgrund
//   (= besiegt) und wirft Gegner um, die er trifft. Feuer/Panzer/Wurf: −1 hp (stehend auch umwerfen). Explosion,
//   Kanonenkugel, Riesentrank, Funkelstern besiegen sofort. Liegend und gestoßen harmlos.
//
// Daten: { kind: 'rollpilz' | 'grossrollpilz', pos, path?, loop?, dir?, speed?: 1.5 (groß 1.1),
//          behavior?: 'walk' | 'chase', sight?: 6 (groß 8), chaseSpeed?: 2.2 (groß 1.6), up?: 6 s,
//          hp?: 1 (groß 3), edges?, wake?, drop? }
// Zustände: idle → walk|chase → back (liegt) → getup (0,8 s) → walk …; carried, thrown (klein), pushed (groß);
//   squashed | flipped (besiegt, fliegt weg). Laufzeit: hp, backT (s auf dem Rücken), kicker.
// Modelle 'rollpilz' / 'grossrollpilz' (state { anim: walk|idle|flipped|carried|thrown|squashed, speed }).

import { EnemyW2, STRONG, clamp } from '../EnemyW2.js';
import { getModel } from '../../models/index.js';

const ROLL_TIME = 2.5;

class Rollpilz extends EnemyW2 {
  constructor(level, spec, big) {
    super(level, spec, big ? 'grossrollpilz' : 'rollpilz');
    this.big = big;
    const k = big ? 2.6 : 1;
    this.half.set(0.36 * k, 0.4 * k, 0.36 * k);
    this.shadow = 0.45 * k;
    this.speed = spec.speed ?? (big ? 1.1 : 1.5);
    this.behavior = spec.behavior ?? 'walk';
    this.sight = spec.sight ?? (big ? 8 : 6);
    this.chaseSpeed = spec.chaseSpeed ?? (big ? 1.6 : 2.2);
    this.upTime = spec.up ?? 6;
    this.maxHp = spec.hp ?? (big ? 3 : 1);
    this.hp = this.maxHp;
    this.carryable = !big;
    this.backT = 0;
    this.grace = 0;
    this.invuln = 0;
    this.kicker = null;
    this.rollT = 0;
    this.pushes = 0;
    if (level.view) this.setModel(getModel(this.kind));
    this.initShadows(big ? 3 : 1);
  }

  get onBack() { return this.state === 'back' || this.state === 'getup' || this.state === 'pushed'; }

  canCarry() { return !this.big && (this.state === 'back' || this.state === 'getup'); }

  /** Ein zerplatzter/besiegter Rollpilz zählt einmal. */
  update(dt) {
    this.stateT += dt;
    if (this.grace > 0) this.grace -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.updateDefeat(dt)) return;
    switch (this.state) {
      case 'idle':
        this.stand(dt);
        if (!this.level.player || this.playerDist() < this.wake) this.setState('walk');
        break;
      case 'walk':
        this.walk(dt, this.speed);
        if (this.behavior === 'chase' && this.grounded && this.canSee(this.sight, 2 * (this.big ? 2 : 1))) this.setState('chase');
        break;
      case 'chase':
        this.chase(dt, this.chaseSpeed);
        if (!this.canSee(this.sight * 1.6, 4)) { this.setState('walk'); this.turnCooldown = 0.3; }
        break;
      case 'back': {
        const f = Math.exp(-7 * dt);
        this.vel.x *= f; this.vel.z *= f;
        this.moveWithGravity(dt);
        this.backT += dt;
        if (this.backT >= this.upTime) this.setState('getup');
        break;
      }
      case 'getup':
        this.stand(dt);
        if (this.stateT >= 0.8) this.standUp();
        break;
      case 'carried':
        this.followCarrier();
        break;
      case 'thrown': this.roll(dt); break;
      case 'pushed': this.slidePushed(dt); break;
      default: break;
    }
  }

  // ------------------------------------------------------------------ Zustandswechsel

  /** Auf den Rücken (umgeworfen). */
  toBack(keepTimer = false) {
    if (this.defeated) return;
    if (!this.onBack) this.level.effects?.dust(this.pos, 4, this.big ? 1.6 : 0.8);
    this.setState('back');
    if (!keepTimer) this.backT = 0;
    this.touch = true;
    this.vel.x = 0; this.vel.z = 0;
    this.grace = Math.max(this.grace, 0.25);
  }

  standUp() {
    this.setState('walk');
    this.backT = 0;
    this.touch = true;
    if (this.playerActive()) { const t = this.toPlayer({}); this.dir.x = t.x; this.dir.z = t.z; this.yaw = Math.atan2(-t.z, t.x); }
    this.vel.y = 3;
    this.grounded = false;
  }

  /** Kleiner Rollpilz rollt los (geworfen oder gekickt). */
  launch(player, dx, dz, speed, vy) {
    const l = Math.hypot(dx, dz) || 1;
    this.dir.x = dx / l; this.dir.z = dz / l;
    this.yaw = Math.atan2(-this.dir.z, this.dir.x);
    this.vel.set(this.dir.x * speed, vy, this.dir.z * speed);
    this.rollSpeed = speed;
    this.kicker = player;
    this.grace = 0.35;
    this.rollT = 0;
    this.touch = true;
    this.grounded = false;
    this.setState('thrown');
  }

  roll(dt) {
    this.rollT += dt;
    this.rollSpeed = Math.max(6, this.rollSpeed - 1.2 * dt);
    this.vel.x = this.dir.x * this.rollSpeed;
    this.vel.z = this.dir.z * this.rollSpeed;
    const res = this.moveWithGravity(dt, { step: 0.3 });
    if (this.removed || this.defeated) return;
    if (res.hitWall) {
      const s = res.wallShape;
      if (s?.owner && s.owner !== this && typeof s.owner.onHit === 'function') s.owner.onHit('shell', this, s);
      this.level.sfx('blockhit');
      this.pop(null);
      return;
    }
    if (this.hitEnemies(0.05)) { this.pop(null); return; }
    if (this.rollT > ROLL_TIME) { this.toBack(); this.backT = Math.min(this.backT, this.upTime - 2); }
  }

  /** Gegner im Weg treffen (geworfen/gestoßen). true = getroffen. */
  hitEnemies(pad) {
    let hit = false;
    for (const e of this.level.entities) {
      if (e === this || !e.alive || e.removed || e.defeated || e.touch === false || !e.enemy || e.carrier) continue;
      if (!this.overlaps(e, pad)) continue;
      e.onHit?.('throw', this);
      hit = true;
      if (!this.big) break;
    }
    if (hit) { this.level.sfx('kick'); this.level.effects?.sparks(this.center(), 8); }
    return hit;
  }

  /** Großrollpilz liegend gestoßen: rutscht mit Reibung (fällt über Kanten). */
  push(source, speed) {
    let dx = this.pos.x - (source?.pos?.x ?? this.pos.x), dz = this.pos.z - (source?.pos?.z ?? this.pos.z);
    if (source?.facingVec && Math.hypot(dx, dz) < 0.2) { const f = source.facingVec(); dx = f.x; dz = f.z; }
    const l = Math.hypot(dx, dz) || 1;
    const cur = Math.hypot(this.vel.x, this.vel.z);
    if (this.state === 'pushed' && cur >= speed - 0.5) return;
    this.dir.x = dx / l; this.dir.z = dz / l;
    this.vel.x = this.dir.x * speed; this.vel.z = this.dir.z * speed;
    this.pushes++;
    this.level.sfx('kick');
    this.level.effects?.dust(this.pos, 3, 1.2);
    this.setState('pushed');
  }

  slidePushed(dt) {
    const sp = Math.hypot(this.vel.x, this.vel.z);
    const ns = Math.max(0, sp - 3.5 * dt);
    if (sp > 1e-4) { this.vel.x *= ns / sp; this.vel.z *= ns / sp; }
    this.backT += dt;
    const res = this.moveWithGravity(dt, { step: 0.3 });
    if (this.removed || this.defeated) return;
    if (res.hitWall) { this.vel.x *= 0.2; this.vel.z *= 0.2; }
    if (ns > 2.5) this.hitEnemies(0.05);
    if (ns < 0.3 && this.grounded) { const t = this.backT; this.setState('back'); this.backT = t; }
  }

  /** Zerplatzt (geworfen gegen Wand/Gegner) – besiegt. */
  pop(source) {
    this.carryable = false;
    this.flip(source, 6);
  }

  /** Großrollpilz verliert 1 hp (mit kurzer Schonzeit). true = besiegt. */
  damage(n = 1) {
    if (this.invuln > 0) return false;
    this.hp -= n;
    this.invuln = 0.4;
    this.level.effects?.sparks(this.center(), 6);
    if (this.hp <= 0) { this.squash(0.9); this.level.sfx('stomp'); return true; }
    return false;
  }

  // ------------------------------------------------------------------ Berührung und Treffer

  onPlayer(player, contact) {
    if (this.defeated || this.state === 'carried') return 'none';
    if (this.state === 'thrown') {
      if (contact.fromAbove && !contact.pound) { this.toBack(); return 'stomp'; }
      return 'none';                                   // rollend harmlos für Figuren
    }
    if (this.onBack) {
      if (this.big) {
        if (contact.fromAbove || contact.pound) {
          this.damage(1);
          if (!this.defeated && this.state !== 'pushed') this.toBack(true);
          return contact.pound ? 'none' : 'stomp';
        }
        const slide = player.state === 'slide' || contact.dive;
        this.push(player, slide ? 9 : clamp(5 + player.hSpeed() * 0.5, 5, 9));
        return 'none';
      }
      if (this.grace > 0 && !contact.fromAbove) return 'none';
      if (contact.pound) { this.squash(); this.level.sfx('stomp'); return 'none'; }
      if (contact.fromAbove) { this.toBack(); return 'stomp'; }
      if (player.input?.run && player.canPickUp?.()) { player.pickUp(this); return 'none'; }
      this.launch(player, this.pos.x - player.pos.x, this.pos.z - player.pos.z, 7, 0);
      this.level.sfx('kick');
      return 'none';
    }
    // stehend
    if (this.slideAttack(player, contact)) return 'none';
    if (contact.pound) {
      if (this.big) { this.damage(1); if (!this.defeated) this.toBack(); }
      else this.squash();
      return 'none';
    }
    if (contact.fromAbove) {
      if (this.big) { this.damage(1); if (!this.defeated) this.toBack(); }
      else this.toBack();
      return 'stomp';
    }
    if (contact.dive) { this.onHit('claw', player); return 'none'; }
    return 'hurt';
  }

  onHit(kind, source) {
    if (this.defeated || this.state === 'carried') return;
    if (kind === 'throw' && source === this) return;
    const sameH = source?.pos && Math.abs(source.pos.y - this.pos.y) < 0.6 * (this.big ? 2 : 1);
    if (this.big) {
      if (STRONG.has(kind)) { this.flip(source); return; }
      if (kind === 'bump' || (kind === 'pound' && !sameH)) { if (!this.onBack) this.toBack(); return; }
      if (kind === 'pound') { if (!this.damage(1) && !this.onBack) this.toBack(); return; }
      if (kind === 'claw') { if (!this.damage(1)) { if (!this.onBack) this.toBack(); this.push(source, 8); } return; }
      if (!this.damage(1) && !this.onBack) this.toBack();
      return;
    }
    if (kind === 'bump' || kind === 'slide') { if (!this.onBack) this.toBack(); return; }
    if (kind === 'pound') {
      if (!sameH) return;
      if (this.onBack) { this.squash(); this.level.sfx('stomp'); } else this.toBack();
      return;
    }
    this.flip(source);
  }

  // ------------------------------------------------------------------ Tragen/Werfen

  onPickup() {
    this.setState('carried');
    this.touch = false;
    this.vel.set(0, 0, 0);
  }

  onThrow(player, o) {
    if (o.gentle) {
      this.pos.x = player.pos.x + o.dir.x * 0.75; this.pos.z = player.pos.z + o.dir.z * 0.75;
      this.pos.y = player.pos.y + 0.1;
      this.vel.set(0, 0, 0);
      this.toBack(true);
      this.grace = 0.4;
      return;
    }
    this.launch(player, o.dir.x, o.dir.z, 9 + Math.max(0, player.vel.x * o.dir.x + player.vel.z * o.dir.z) * 0.3, 4.5);
  }

  onDrop() {
    this.toBack(true);
    this.vel.set(0, 2, 0);
    this.grace = 0.4;
  }

  // ------------------------------------------------------------------ Darstellung

  modelState() {
    const s = this.state;
    if (s === 'walk' || s === 'chase') return { anim: 'walk', speed: s === 'chase' ? this.chaseSpeed : this.speed };
    if (s === 'back' || s === 'getup' || s === 'pushed' || s === 'flipped') return { anim: 'flipped' };
    if (s === 'carried') return { anim: 'carried' };
    if (s === 'thrown') return { anim: 'thrown', speed: this.rollSpeed };
    if (s === 'squashed') return { anim: 'squashed' };
    return { anim: 'idle' };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    const r = this.model.root;
    if (this.state === 'getup') r.position.x += Math.sin(this.stateT * 40) * 0.03 * (this.big ? 2.6 : 1);
    r.rotation.z = this.state === 'flipped' ? Math.PI * 0.5 : 0;
  }

  info() { return { state: this.state, hp: this.hp, backT: +this.backT.toFixed(2), defeated: this.defeated, pushes: this.pushes }; }
}

export const KINDS = {
  rollpilz: (level, spec) => new Rollpilz(level, spec, false),
  grossrollpilz: (level, spec) => new Rollpilz(level, spec, true),
};
