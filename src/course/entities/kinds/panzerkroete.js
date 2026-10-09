// Panzerkröte und Panzer (Bauplan: „läuft, Panzer kickbar“, Konter: springen, Panzer werfen).
//
// panzerkroete: läuft/patrouilliert wie ein Pilzling. Draufspringen (oder Stampfen, Tatzenhieb) → sie zieht sich in
//   den Panzer zurück (0,2 s) und wird zur Entität 'panzer'. Feuer, Panzer, Wurf, Explosion, Riesentrank,
//   Funkelstern → fliegt weg. Seitlich verletzt sie.
//   Daten: { kind: 'panzerkroete', pos, path?, loop?, dir?, speed?: 1.4, edges?, wake?, drop?,
//            gold?: true (Goldpanzer, Bauplan 1-2), respawn?: true (Kröte kommt nach 8 s aus dem liegenden Panzer) }
//   Modell 'panzerkroete' (opts { gold }, state { anim: walk|idle|stunned|hide, speed }).
//
// panzer: liegt still (idle). Berühren kickt ihn (er gleitet mit 10 m/s von der Figur weg); gleitend besiegt er
//   Gegner (onHit('shell')), zerbricht Ziegel/löst ?-Blöcke seitlich aus, prallt an Wänden ab und verletzt die
//   Figur, sobald er zurückkommt (direkt nach dem Kick 0,3 s nicht). Draufspringen hält ihn an (Abprall); auf
//   einen liegenden Panzer springen kickt ihn. Tragbar (carryable): Aktion in Reichweite oder Rennen + Berühren
//   hebt ihn auf, erneute Aktion wirft ihn (er gleitet in Blickrichtung), Ducken + Aktion setzt ab.
//   Goldpanzer: beim Gleiten alle 0,3 s eine Münze (höchstens coins, Standard 15).
//   Daten: { kind: 'panzer', pos, gold?, speed?: 10, coins?: 15, wakeAfter?: 0 (s bis die Kröte herauskommt; 0 = nie) }
//   Zustände: idle | slide | carried | shake | flipped. Modell 'panzer' (state { anim: idle|spin|shake, speed }).

import { Enemy } from '../Enemy.js';
import { getModel } from '../../models/index.js';

class Panzerkroete extends Enemy {
  constructor(level, spec) {
    super(level, spec, 'panzerkroete');
    this.half.set(0.36, 0.5, 0.36);
    this.shadow = 0.5;
    this.speed = spec.speed ?? 1.4;
    this.gold = !!spec.gold;
    if (level.view) this.setModel(getModel('panzerkroete', { gold: this.gold }));
  }

  update(dt) {
    this.stateT += dt;
    if (this.updateDefeat(dt)) return;
    switch (this.state) {
      case 'idle':
        if (!this.level.player || this.playerDist() < this.wake) this.setState('walk');
        this.stand(dt);
        break;
      case 'walk': this.walk(dt, this.speed); break;
      case 'hide':
        this.stand(dt);
        if (this.stateT > 0.2) this.becomeShell();
        break;
      default: break;
    }
  }

  /** In den Panzer zurückziehen (zählt als besiegt). */
  hide() {
    if (this.defeated) return;
    this.setState('hide');
    this.touch = false;
    this.vel.set(0, 0, 0);
    this.markDefeated();
  }

  becomeShell() {
    const sh = this.level.spawn('panzer', {
      pos: [this.pos.x, this.pos.y, this.pos.z], yaw: this.yaw, gold: this.gold,
      wakeAfter: this.spec.respawn === false ? 0 : 8, from: { ...this.spec, pos: undefined, drop: undefined, id: undefined },
    });
    if (sh) sh.grounded = this.grounded;
    this.kill();
  }

  onStomp() { this.hide(); }

  onHit(kind, source) {
    if (this.defeated) return;
    if (kind === 'claw' || (kind === 'pound' && source && Math.abs(source.pos.y - this.pos.y) < 0.6)) { this.hide(); this.level.sfx('stomp'); return; }
    if (kind === 'pound') return;
    this.flip(source);
  }

  modelState() {
    const s = this.state;
    const anim = s === 'walk' ? 'walk' : s === 'hide' ? 'hide' : s === 'flipped' ? 'stunned' : 'idle';
    return { anim, speed: s === 'walk' ? this.speed : 0 };
  }
}

class Panzer extends Enemy {
  constructor(level, spec) {
    super(level, spec, 'panzer');
    this.half.set(0.36, 0.2, 0.36);
    this.shadow = 0.45;
    this.carryable = true;
    this.wake = 0;
    this.slideSpeed = spec.speed ?? 10;
    this.gold = !!spec.gold;
    this.coinsLeft = spec.coins ?? 15;
    this.coinT = 0;
    this.wakeAfter = spec.wakeAfter ?? 0;
    this.grace = 0;
    this.kicker = null;
    this.state = 'idle';
    if (level.view) this.setModel(getModel('panzer', { gold: this.gold }));
  }

  canCarry() { return this.state === 'idle' || this.state === 'shake'; }

  /** Ein zerstörter Panzer zählt nicht als weiterer besiegter Gegner (die Kröte zählte schon). */
  markDefeated() { this.defeated = true; }

  update(dt) {
    this.stateT += dt;
    if (this.grace > 0) this.grace -= dt;
    if (this.updateDefeat(dt)) return;
    if (this.state === 'carried') {
      if (!this.followCarrier()) return;
      return;
    }
    switch (this.state) {
      case 'idle': {
        const k = Math.exp(-8 * dt);
        this.vel.x *= k; this.vel.z *= k;
        this.moveWithGravity(dt);
        if (this.wakeAfter > 0 && this.stateT > this.wakeAfter) this.setState('shake');
        break;
      }
      case 'shake':
        this.stand(dt);
        if (this.stateT > 1.4) this.emerge();
        break;
      case 'slide': this.slide(dt); break;
      default: break;
    }
  }

  slide(dt) {
    this.vel.x = this.dir.x * this.slideSpeed;
    this.vel.z = this.dir.z * this.slideSpeed;
    const res = this.moveWithGravity(dt, { step: 0.3 });
    if (this.removed) return;
    if (res.hitWall) {
      const n = res.wallNormal;
      res.wallShape?.owner?.onHit?.('shell', this, res.wallShape);
      const d = this.dir.x * n.x + this.dir.z * n.z;
      if (d < 0) { this.dir.x -= 2 * d * n.x; this.dir.z -= 2 * d * n.z; }
      const l = Math.hypot(this.dir.x, this.dir.z) || 1;
      this.dir.x /= l; this.dir.z /= l;
      this.grace = 0;                       // Rückpraller trifft auch den, der gekickt hat
      this.level.sfx('blockhit');
      this.level.effects?.sparks({ x: this.pos.x - n.x * 0.3, y: this.pos.y + 0.2, z: this.pos.z - n.z * 0.3 }, 4);
    }
    // Gegner im Weg besiegen
    for (const e of this.level.entities) {
      if (e === this || !e.alive || e.removed || e.defeated || e.touch === false || !e.enemy || e.carrier) continue;
      if (!this.overlaps(e, 0.05)) continue;
      if (e.kind === 'panzer' && e.state === 'slide') { e.flip(this); this.flip(e); return; }
      e.onHit?.('shell', this);
    }
    // Goldpanzer: Münzen
    if (this.gold && this.coinsLeft > 0) {
      this.coinT += dt;
      if (this.coinT >= 0.3) {
        this.coinT = 0;
        this.coinsLeft--;
        this.level.addCoins(1);
        this.level.sfx('coin');
        this.level.effects?.coinPop({ x: this.pos.x, y: this.pos.y + 0.4, z: this.pos.z });
      }
    }
  }

  /** Kick in Richtung (dx, dz) – von der Figur weg. */
  kick(player, dx, dz) {
    const l = Math.hypot(dx, dz);
    if (l < 1e-3) { const f = player.facingVec(); dx = f.x; dz = f.z; } else { dx /= l; dz /= l; }
    this.dir.x = dx; this.dir.z = dz;
    this.kicker = player;
    this.grace = 0.3;
    this.setState('slide');
    this.level.sfx('stomp');
    this.level.effects?.dust(this.pos, 4);
  }

  stop() {
    this.setState('idle');
    this.vel.x = 0; this.vel.z = 0;
    this.grace = 0.2;
  }

  /** Kröte kommt wieder heraus (respawn). */
  emerge() {
    const from = this.spec.from ?? {};
    const t = this.playerActive() ? this.toPlayer({}) : { x: this.dir.x, z: this.dir.z };
    this.level.spawn('panzerkroete', { ...from, path: undefined, pos: [this.pos.x, this.pos.y, this.pos.z], dir: [t.x, t.z], gold: this.gold, wake: 1e9 });
    this.kill();
  }

  onPlayer(player, contact) {
    if (this.defeated || this.state === 'carried') return 'none';
    if (this.state === 'idle' || this.state === 'shake') {
      if (this.grace > 0) return 'none';
      // Rennen gehalten + Berührung (nicht von oben) → aufheben
      if (!contact.fromAbove && !contact.pound && player.input?.run && player.canPickUp?.()) { player.pickUp(this); return 'none'; }
      if (contact.fromAbove || contact.pound) {
        const f = player.facingVec();
        this.kick(player, f.x, f.z);
        return 'stomp';
      }
      this.kick(player, this.pos.x - player.pos.x, this.pos.z - player.pos.z);
      return 'none';
    }
    // gleitet
    if (this.grace > 0 && player === this.kicker) return 'none';
    if (contact.fromAbove || contact.pound) { this.stop(); return 'stomp'; }
    if (contact.dive) { this.onHit('claw', player); return 'none'; }
    return 'hurt';
  }

  onHit(kind, source) {
    if (this.defeated || this.state === 'carried') return;
    if (kind === 'claw' && source?.facingVec) {
      // Tatzenhieb kickt den Panzer in Blickrichtung
      const f = source.facingVec();
      this.kick(source, f.x, f.z);
      return;
    }
    if (kind === 'fire' || kind === 'pound') return;
    if (kind === 'shell' && source === this) return;
    this.flip(source);
  }

  onPickup() {
    this.setState('carried');
    this.touch = false;
    this.vel.set(0, 0, 0);
  }

  onThrow(player, o) {
    this.touch = true;
    if (o.gentle) {
      this.pos.x = player.pos.x + o.dir.x * 0.75; this.pos.z = player.pos.z + o.dir.z * 0.75;
      this.pos.y = player.pos.y + 0.1;
      this.vel.set(0, 0, 0);
      this.setState('idle');
      this.grace = 0.3;
      return;
    }
    this.kick(player, o.dir.x, o.dir.z);
    this.vel.y = 2;
    this.grace = 0.4;
  }

  onDrop() {
    this.touch = true;
    this.setState('idle');
    this.vel.set(0, 2, 0);
    this.grace = 0.4;
  }

  modelState() {
    const s = this.state;
    return { anim: s === 'slide' ? 'spin' : s === 'shake' ? 'shake' : 'idle', speed: this.slideSpeed };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    if (this.state === 'flipped') this.model.root.rotation.z = Math.PI;
    else this.model.root.rotation.z = 0;
  }
}

export const KINDS = {
  panzerkroete: (level, spec) => new Panzerkroete(level, spec),
  panzer: (level, spec) => new Panzer(level, spec),
};
