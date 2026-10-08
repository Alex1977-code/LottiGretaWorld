// Pilzlingsturm (Bauplan: 3–5 gestapelte Pilzlinge, Konter: von oben einzeln abtragen). Läuft langsam (Standard:
// auf die Figur zu, sobald sie in Sicht ist). Jede Berührung von oben (Sprung oder Stampfattacke) nimmt die oberste
// Stufe ab (sie liegt kurz platt da) und die Figur prallt ab; seitlich verletzt der Turm. Feuer, Tatzenhieb, Panzer
// und Wurf nehmen ebenfalls je eine Stufe; Explosion, Riesentrank und Funkelstern werfen den ganzen Turm um.
//
// Daten: { kind: 'pilzlingsturm', pos, count?: 4 (3–5), speed?: 1.1, behavior?: 'chase' (Standard) | 'walk',
//          sight?: 9 m, path?, loop?, dir?, edges?, wake?, drop?,
//          carries?: 'star:I' | { star: I } | 'coins:N' | Power-up-Name }
//   carries 'star:I': der grüne Stern Nr. I (0..2) sitzt sichtbar auf dem Turm und ist erst einsammelbar, wenn der
//   letzte Pilzling gefallen ist (dann schwebt er an der Stelle des Turms). LEVEL.stars listet ihn dann nicht.
//   Andere carries erscheinen beim Fall des Turms (wie drop).
//
// Laufzeit: count (übrige Stufen), height (m). Zustände: idle → walk | chase → (Stufen weg …) → defeated/flipped.
// Modell 'pilzlingsturm' (opts { count }, state { anim: walk|idle|alert|stunned, speed, count }).

import { Enemy, spawnLoot } from '../Enemy.js';
import { getModel } from '../../models/index.js';

const STEP = 0.62;
const heightOf = (n) => (n <= 0 ? 0 : (n - 1) * STEP + 0.84);

function parseCarry(c) {
  if (!c) return null;
  if (typeof c === 'object') return c.star !== undefined ? { star: c.star } : c;
  const m = /^star(?::(\d+))?$/.exec(String(c));
  if (m) return { star: +(m[1] ?? 0) };
  return { loot: c };
}

class Pilzlingsturm extends Enemy {
  constructor(level, spec) {
    super(level, spec, 'pilzlingsturm');
    this.max = Math.max(1, Math.min(5, Math.round(spec.count ?? 4)));
    this.count = this.max;
    this.speed = spec.speed ?? 1.1;
    this.behavior = spec.behavior ?? 'chase';
    this.sight = spec.sight ?? 9;
    this.shadow = 0.55;
    this.hitCool = 0;
    this.half.set(0.42, heightOf(this.count) / 2, 0.42);
    this.carry = parseCarry(spec.carries);
    this.riding = null;
    if (this.carry?.star !== undefined) {
      this.riding = level.spawn('star', { pos: [this.pos.x, this.pos.y + heightOf(this.count) + 0.1, this.pos.z], index: this.carry.star });
      if (this.riding) this.riding.touch = false;
    }
    if (level.view) this.setModel(getModel('pilzlingsturm', { count: Math.max(3, this.max) }));
  }

  get height() { return heightOf(this.count); }

  update(dt) {
    this.stateT += dt;
    if (this.hitCool > 0) this.hitCool -= dt;
    if (!this.updateDefeat(dt)) {
      switch (this.state) {
        case 'idle':
          if (!this.level.player || this.playerDist() < this.wake) this.setState('walk');
          this.stand(dt);
          break;
        case 'walk':
          this.walk(dt, this.speed);
          if (this.behavior === 'chase' && this.canSee(this.sight, 2.5)) this.setState('chase');
          break;
        case 'chase':
          this.chase(dt, this.speed);
          if (!this.canSee(this.sight * 1.6, 3.5)) this.setState('walk');
          break;
        default: break;
      }
    }
    // Getragener Stern reitet oben mit
    if (this.riding && !this.defeated) this.riding.pos.set(this.pos.x, this.pos.y + this.height + 0.1, this.pos.z);
  }

  /** Oberste Stufe abnehmen (platt gedrückter Pilzling als Rückmeldung). */
  popTop(effect = 'squash') {
    if (this.count <= 0) return;
    const y = this.pos.y + heightOf(this.count) - 0.84;
    this.count--;
    this.hitCool = 0.25;
    const e = this.level.spawn('pilzling', { pos: [this.pos.x, y, this.pos.z], wake: 0, yaw: this.yaw });
    if (e) {
      e.markDefeated = () => { e.defeated = true; };   // zählt nicht als eigener Gegner
      if (effect === 'squash') e.squash(); else e.flip(this.level.player);
    }
    this.half.y = Math.max(0.2, heightOf(this.count) / 2);
    if (this.count <= 0) this.fall();
  }

  /** Letzte Stufe gefallen: Gegner besiegt, Getragenes freigeben. */
  fall() {
    this.touch = false;
    this.markDefeated();
    this.releaseCarry();
    this.kill();
  }

  releaseCarry() {
    if (this.riding) {
      this.riding.pos.set(this.pos.x, this.pos.y + 0.3, this.pos.z);
      this.riding.touch = true;
      this.riding = null;
      this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 0.8, z: this.pos.z }, 14);
      this.level.sfx('powerup_appear');
    } else if (this.carry?.loot) spawnLoot(this.level, this.carry.loot, this.pos.x, this.pos.y, this.pos.z);
    this.carry = null;
  }

  onPlayer(player, contact) {
    if (this.defeated) return 'none';
    if (contact.fromAbove || contact.pound) {
      if (this.hitCool <= 0) this.popTop();
      return 'stomp';
    }
    if (contact.dive) { this.onHit('claw', player); return 'none'; }
    return 'hurt';
  }

  onHit(kind, source) {
    if (this.defeated) return;
    if (kind === 'bomb' || kind === 'mega' || kind === 'star' || kind === 'bump') {
      this.releaseCarry();
      this.flip(source);
      return;
    }
    if (kind === 'pound' && source && Math.abs(source.pos.y - this.pos.y) > 0.6) return;
    if (this.hitCool > 0) return;
    this.popTop(kind === 'pound' ? 'squash' : 'flip');
  }

  modelState() {
    const s = this.state;
    const anim = s === 'walk' || s === 'chase' ? 'walk' : s === 'flipped' ? 'stunned' : 'idle';
    return { anim, speed: anim === 'walk' ? this.speed : 0, count: this.count };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    if (this.state === 'flipped') this.model.root.rotation.z = Math.min(Math.PI / 2, this.stateT * 4);
  }

  dispose() {
    if (this.riding && !this.riding.removed) this.riding.kill();
    super.dispose();
  }
}

export const KINDS = { pilzlingsturm: (level, spec) => new Pilzlingsturm(level, spec) };
