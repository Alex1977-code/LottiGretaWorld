// Rammbock-Bulle (Bauplan: „rennt auf Spieler zu“, Konter: 3× draufspringen).
//
// Verhalten: wartet (scharrt, schnaubt), dreht sich zur Figur, sobald sie in Sicht ist. Ankündigung: 0,8 s
// Hufscharren (Staubwolken) – dann Sturmlauf geradeaus in die zu Beginn gewählte Richtung (beschleunigt auf
// 7,5 m/s). Er bremst vor Kanten (nie ins Leere), nach 2,6 s oder wenn er 3 m an der Figur vorbei ist; prallt er
// gegen eine Wand, ist er 1,2 s benommen. Jeder Sprung auf den Kopf (auch Stampfen, Feuer, Tatzenhieb, Panzer,
// Wurf) kostet 1 hp und betäubt ihn kurz (0,45 s Treffer + 1,0 s Schwindel) – solange ist er harmlos. Bei 0 hp
// kippt er um. Riesentrank, Funkelstern, Explosion besiegen ihn sofort.
//
// Daten: { kind: 'rammbock_bulle', pos, yaw?|dir?, hp?: 3, sight?: 11 m, speed?: 7.5 m/s (Sturmlauf),
//          wake?, drop?: Standard 'coins:3' }
// Zustände: idle → warn (0,8 s) → charge → brake → recover (0,7 s) → idle …; bonk (Wand, 1,2 s); hit (0,45 s) →
// stunned (1,0 s); defeated (1,2 s, dann weg).
// Modell 'rammbock_bulle' (state { anim: idle|walk|charge|stunned|hit|defeated, speed, hp }).

import { Enemy } from '../Enemy.js';
import { getModel } from '../../models/index.js';

class RammbockBulle extends Enemy {
  constructor(level, spec) {
    super(level, { drop: 'coins:3', ...spec }, 'rammbock_bulle');
    this.half.set(0.6, 0.8, 0.6);
    this.shadow = 0.8;
    this.hp = spec.hp ?? 3;
    this.maxHp = this.hp;
    this.sight = spec.sight ?? 11;
    this.chargeSpeed = spec.speed ?? 7.5;
    this.gs = 0;
    this.cool = 0.5;
    this.hitGrace = 0;
    this.dustT = 0;
    if (level.view) this.setModel(getModel('rammbock_bulle'));
  }

  update(dt) {
    this.stateT += dt;
    if (this.cool > 0) this.cool -= dt;
    if (this.hitGrace > 0) this.hitGrace -= dt;
    if (this.state === 'defeated') {
      this.stand(dt);
      if (this.stateT > 1.2) { this.level.effects?.sparks(this.center(), 12); this.kill(); }
      return;
    }
    if (this.updateDefeat(dt)) return;
    switch (this.state) {
      case 'idle':
        this.stand(dt);
        if (this.canSee(this.sight, 2.5)) {
          this.facePlayer(dt, 4);
          if (this.cool <= 0) this.setState('warn');
        }
        break;
      case 'warn':
        this.facePlayer(dt, 8);
        this.stand(dt);
        this.dustT -= dt;
        if (this.dustT <= 0) {
          this.dustT = 0.16;
          const f = { x: Math.cos(this.yaw), z: -Math.sin(this.yaw) };
          this.level.effects?.dust({ x: this.pos.x - f.x * 0.5, y: this.pos.y, z: this.pos.z - f.z * 0.5 }, 2, 0.6);
        }
        if (this.stateT > 0.8) this.startCharge();
        break;
      case 'charge': this.charge(dt); break;
      case 'brake': this.brake(dt); break;
      case 'recover':
        this.stand(dt);
        if (this.stateT > 0.7) { this.setState('idle'); this.cool = 0.3; }
        break;
      case 'bonk':
        this.stand(dt);
        if (this.stateT > 1.2) { this.setState('idle'); this.cool = 0.4; }
        break;
      case 'hit':
        this.stand(dt);
        if (this.stateT > 0.45) this.setState('stunned');
        break;
      case 'stunned':
        this.stand(dt);
        if (this.stateT > 1.0) { this.setState('idle'); this.cool = 0.4; }
        break;
      default: break;
    }
  }

  startCharge() {
    if (this.playerActive()) { const t = this.toPlayer({}); this.dir.x = t.x; this.dir.z = t.z; }
    else { this.dir.x = Math.cos(this.yaw); this.dir.z = -Math.sin(this.yaw); }
    this.yaw = Math.atan2(-this.dir.z, this.dir.x);
    this.gs = 2;
    this.setState('charge');
    this.level.sfx('panic');
  }

  /** Steht vor dem Bullen in `ahead` m noch Boden? */
  floorAhead(ahead) { return this.groundAhead(this.dir.x, this.dir.z, ahead, 1.1); }

  /**
   * Kante innerhalb des Bremswegs? Eine Wand davor zählt nicht (dann prallt er dagegen statt zu bremsen).
   * Abtastung alle 0,3 m: zuerst Wand → false, zuerst kein Boden → true.
   */
  edgeWithin(dist) {
    const w = this.level.world, h = this.half;
    for (let d = 0.15; d <= dist + 1e-6; d += 0.3) {
      const x = this.pos.x + this.dir.x * (h.x + d), z = this.pos.z + this.dir.z * (h.z + d);
      const wall = w.overlapAABB({ x, y: this.pos.y + 0.9, z }, { x: 0.05, y: 0.5, z: 0.05 }, { filter: (s) => s.solid && !s.oneWay && !s.fromBelowOnly });
      if (wall.length) return false;
      if (!this.floorAhead(d)) return true;
    }
    return false;
  }

  charge(dt) {
    this.gs = Math.min(this.chargeSpeed, this.gs + 14 * dt);
    // Bremsweg v²/(2·20) – rechtzeitig vor der Kante bremsen
    const stopDist = (this.gs * this.gs) / 40 + 0.15;
    if (this.grounded && this.edgeWithin(stopDist)) { this.setState('brake'); this.brake(dt); return; }
    this.vel.x = this.dir.x * this.gs; this.vel.z = this.dir.z * this.gs;
    const res = this.moveWithGravity(dt);
    if (res.hitWall) {
      this.setState('bonk');
      this.gs = 0;
      this.level.shake(0.25);
      this.level.sfx('slam');
      this.level.effects?.dust(this.pos, 6, 1.4);
      return;
    }
    let past = false;
    if (this.playerActive()) {
      const p = this.level.player;
      past = (p.pos.x - this.pos.x) * this.dir.x + (p.pos.z - this.pos.z) * this.dir.z < -3;
    }
    if (this.stateT > 2.6 || past) this.setState('brake');
  }

  brake(dt) {
    this.gs = Math.max(0, this.gs - 20 * dt);
    if (this.grounded && !this.floorAhead(0.05)) this.gs = 0;
    this.vel.x = this.dir.x * this.gs; this.vel.z = this.dir.z * this.gs;
    const res = this.moveWithGravity(dt);
    if (res.hitWall) this.gs = 0;
    if (this.stateT % 0.1 < dt) this.level.effects?.dust(this.pos, 1, 0.8);
    if (this.gs <= 0) this.setState('recover');
  }

  get stunnedNow() { return this.state === 'hit' || this.state === 'stunned' || this.state === 'bonk'; }

  /** Treffer: hp −1, betäubt; bei 0 umkippen. */
  takeHit() {
    if (this.hitGrace > 0 || this.defeated) return false;
    this.hp--;
    this.hitGrace = 0.35;
    this.gs = 0;
    this.vel.x = 0; this.vel.z = 0;
    if (this.hp <= 0) { this.defeat(); return true; }
    this.setState('hit');
    this.level.sfx('stomp');
    this.level.effects?.sparks(this.center(), 6);
    return true;
  }

  defeat() {
    this.setState('defeated');
    this.touch = false;
    this.hp = 0;
    this.level.sfx('slam');
    this.markDefeated();
  }

  onPlayer(player, contact) {
    if (this.defeated) return 'none';
    if (contact.fromAbove || contact.pound) { this.takeHit(); return 'stomp'; }
    if (this.stunnedNow) return 'none';
    if (contact.dive) { this.onHit('claw', player); return 'none'; }
    return 'hurt';
  }

  onHit(kind, source) {
    if (this.defeated) return;
    if (kind === 'mega' || kind === 'star' || kind === 'bomb') { this.hp = 0; this.defeat(); return; }
    if (kind === 'pound' && source && Math.abs(source.pos.y - this.pos.y) > 0.6) return;
    this.takeHit();
  }

  modelState() {
    const s = this.state;
    const anim = s === 'charge' || s === 'brake' ? 'charge' : s === 'hit' ? 'hit' : s === 'stunned' || s === 'bonk' ? 'stunned' : s === 'defeated' ? 'defeated' : 'idle';
    return { anim, speed: this.gs, hp: Math.max(0, this.hp) };
  }
}

export const KINDS = { rammbock_bulle: (level, spec) => new RammbockBulle(level, spec) };
