// Werfer-Brüder (Bauplan Welt 2: Feuer-/Hammer-/Bumerang-Werfer – „springt, wirft Projektile“, Konter:
// draufspringen in der Pause).
//
// Ein Werfer tänzelt um seinen Platz (pace m hin und her entlang axis), blickt stets zur nächsten Figur und wirft
// in Salven (volley Würfe, je 0,6 s; das Geschoss verlässt die Hand bei 50 % = model.hand()) auf sie, sobald sie in
// sight m ist; zwischen den Salven interval s Pause. Alle jumpEvery s springt er: mit heights [unten, oben] zwischen
// zwei Ebenen (hinauf durch Einweg-Plattformen, hinunter fällt er durch sie hindurch), sonst ein Hüpfer auf der
// Stelle (hop m). Geschosse (entities/kinds/geschosse.js):
//   feuer:    Feuerkugel, rollt hüpfend über den Boden auf die Figur zu (6 m/s)
//   hammer:   Hammer im hohen Bogen auf die Stelle der Figur (fliegt durch alles)
//   bumerang: Bumerang fliegt im Bogen hinaus und kehrt zurück (erst nach dem Fangen wirft er den nächsten)
// Konter: Draufspringen besiegt ihn (platt); seitlich = Treffer. Feuer, Krallen, Panzer, Wurf, Explosion,
// Kanonenkugel, Riesentrank, Funkelstern, Stampfwelle daneben besiegen ihn ebenfalls.
//
// Daten: { kind: 'feuer_werfer', weapon?: 'feuer' (Standard) | 'hammer' | 'bumerang', pos, axis?: [1, 0],
//          pace?: 1.2 m, speed?: 1.2, sight?: 12 m, interval?: 2.0 s, volley?: (feuer 2, hammer 3, bumerang 1),
//          first?: 1.0 s, jumpEvery?: 3.4 s, heights?: [yUnten, yOben], hop?: 1.3 m, wake?, drop? }
//   Kurzformen: { kind: 'hammer_werfer', … } ≙ weapon 'hammer', { kind: 'bumerang_werfer', … } ≙ weapon 'bumerang'.
//   Beispiel: { kind: 'feuer_werfer', weapon: 'hammer', pos: [0, 1, -60], heights: [1, 3.6] }
//     (dazu eine Einweg-Plattform: { type: 'platform', pos: [0, 2.8, -60], size: [5, 0.8, 2], oneWay: true })
// Welt 7 (additiv, Präzisierung Gegner Welt 7):
//   sichel?: true   (nur Bumerang-Werfer, 7-Burg) trägt eine goldene Wurfsichel auf dem Rücken (Modell 'bumerang_werfer'
//                   { sichel: true }) und **wirft sie statt des Bumerangs** (Gegner-Sichel: Entität 'wurfsichel' mit owner = er,
//                   verletzt nur Figuren, kehrt zu ihm zurück; solange sie fliegt, fehlt sie auf dem Rücken). Besiegt lässt
//                   er sie fallen: an seiner Stelle erscheint das Power-up { kind: 'powerup', power: 'sichel' }; fällt er in
//                   Lava/Abgrund, erscheint es an seinem Platz (home).
//   fireColor?: 'blau'  blaue Feuerkugeln (Modell 'feuerkugel_blau', z. B. über blauer Lava in 7-1).
//   Wurfsichel der Figur (Motor: onHit('throw', sichel)) besiegt jeden Werfer wie ein Feuerball.
// Zustände: idle → walk ⇄ throw | jump; squashed | flipped. Laufzeit: throws (Zahl der Würfe), jumps, shots (lebende
//   Geschosse), tier ('low'|'high' mit heights), sichelDropped.
// Modell 'feuer_werfer' (opts { kind }, state { anim: idle|walk|jump|throw|squashed|stunned, speed, progress }).

import { EnemyW2, STRONG, toWorld, localOffset, clamp } from '../EnemyW2.js';
import { getModel } from '../../models/index.js';

const G = 40;
const THROW = 0.6, RELEASE = 0.3;
const WEAPONS = ['feuer', 'hammer', 'bumerang'];
const VOLLEY = { feuer: 2, hammer: 3, bumerang: 1 };

class Werfer extends EnemyW2 {
  constructor(level, spec, weapon) {
    super(level, spec, 'feuer_werfer');
    this.weapon = WEAPONS.includes(weapon ?? spec.weapon) ? (weapon ?? spec.weapon) : 'feuer';
    this.half.set(0.34, 0.6, 0.34);
    this.shadow = 0.45;
    this.home = this.pos.clone();
    const ax = spec.axis ?? [1, 0];
    const al = Math.hypot(ax[0], ax[1]) || 1;
    this.axis = { x: ax[0] / al, z: ax[1] / al };
    this.pace = spec.pace ?? 1.2;
    this.speed = spec.speed ?? 1.2;
    this.paceDir = 1;
    this.sight = spec.sight ?? 12;
    this.interval = spec.interval ?? 2.0;
    this.volley = spec.volley ?? VOLLEY[this.weapon];
    this.throwCool = spec.first ?? 1.0;
    this.jumpEvery = spec.jumpEvery ?? 3.4;
    this.jumpCool = this.jumpEvery * 0.6;
    this.heights = Array.isArray(spec.heights) && spec.heights.length === 2 ? [Math.min(...spec.heights), Math.max(...spec.heights)] : null;
    this.hop = spec.hop ?? 1.3;
    this.left = 0;            // Würfe der laufenden Salve
    this.released = false;
    this.dropThrough = false;
    this.throws = 0;
    this.jumps = 0;
    this.shots = [];
    this.boomerang = null;
    this.curve = 1;
    this._own = (s) => s.owner === this;
    this._drop = (s) => s.owner === this || !!s.oneWay;
    this.sichel = this.weapon === 'bumerang' && !!spec.sichel;
    this.sichelDropped = false;
    this.sichelItem = null;
    this.fireColor = spec.fireColor === 'blau' ? 'blau' : null;
    let model = null;
    if (level.view) model = this.setModel(this.sichel ? getModel('bumerang_werfer', { sichel: true }) : getModel('feuer_werfer', { kind: this.weapon }));
    this.hand = localOffset(`werfer:${this.weapon}`, model, { anim: 'throw', progress: 0.5 }, (o) => model.hand(o), { x: 0.3, y: 1.0, z: 0.28 });
    if (model) model.update(0.01, { anim: 'idle' });
    this.initShadows(1);
  }

  get tier() {
    if (!this.heights) return null;
    return this.pos.y > (this.heights[0] + this.heights[1]) / 2 ? 'high' : 'low';
  }

  update(dt) {
    this.stateT += dt;
    if (this.updateDefeat(dt)) return;
    this.shots = this.shots.filter((s) => !s.removed);
    if (this.boomerang?.removed) {
      // Gegner-Sichel gefangen (sichelCatch zählt der Baustein) → bald die nächste
      if (this.boomerang.kind === 'wurfsichel' && (this.sichelCatch ?? 0) > (this.catches0 ?? 0)) this.onCatch(this.boomerang);
      this.boomerang = null;
    }
    if (this.state !== 'idle') {
      if (this.throwCool > 0) this.throwCool -= dt;
      if (this.jumpCool > 0) this.jumpCool -= dt;
      if (this.playerActive()) this.facePlayer(dt, 8);
    }
    switch (this.state) {
      case 'idle':
        this.stand(dt);
        if (!this.level.player || this.playerDist() < this.wake) this.setState('walk');
        break;
      case 'walk':
        this.paceStep(dt);
        if (!this.grounded) break;
        if (this.throwCool <= 0 && !this.boomerang && this.canSee(this.sight, 6)) { this.left = this.volley; this.startThrow(); }
        else if (this.jumpCool <= 0) this.startJump();
        break;
      case 'throw':
        this.vel.x = 0; this.vel.z = 0;
        this.moveWithGravity(dt);
        if (!this.released && this.stateT >= RELEASE) { this.released = true; this.release(); }
        if (this.stateT >= THROW) {
          this.left--;
          if (this.left > 0 && this.weapon !== 'bumerang') this.startThrow();
          else { this.setState('walk'); this.throwCool = this.interval; }
        }
        break;
      case 'jump': {
        this.vel.x = 0; this.vel.z = 0;
        const res = this.dropThrough ? this.moveDrop(dt) : this.moveWithGravity(dt);
        if (this.dropThrough && this.heights && this.pos.y < this.heights[1] - 0.6) this.dropThrough = false;
        if (res && this.grounded && this.stateT > 0.1) { this.setState('walk'); this.jumpCool = this.jumpEvery; this.level.effects?.dust(this.pos, 3, 0.7); }
        break;
      }
      default: break;
    }
  }

  /** Tänzeln entlang axis um home (kehrt an den Enden und an Kanten um). */
  paceStep(dt) {
    const a = this.axis;
    const off = (this.pos.x - this.home.x) * a.x + (this.pos.z - this.home.z) * a.z;
    if (off > this.pace) this.paceDir = -1; else if (off < -this.pace) this.paceDir = 1;
    if (this.grounded && !this.groundAhead(a.x * this.paceDir, a.z * this.paceDir, 0.1, 1.1)) this.paceDir = -this.paceDir;
    this.vel.x = a.x * this.speed * this.paceDir;
    this.vel.z = a.z * this.speed * this.paceDir;
    const res = this.moveWithGravity(dt);
    if (res.hitWall) this.paceDir = -this.paceDir;
  }

  startThrow() {
    this.setState('throw');
    this.released = false;
  }

  startJump() {
    this.jumps++;
    this.dropThrough = false;
    let h = this.hop;
    if (this.heights) {
      if (this.tier === 'low') h = this.heights[1] - this.pos.y + 1.0;
      else { h = 0.9; this.dropThrough = true; }
    }
    this.vel.y = Math.sqrt(2 * G * h);
    this.grounded = false;
    this.setState('jump');
    this.level.sfx('hop');
  }

  /** Schwerkraft-Bewegung, die Einweg-Plattformen ignoriert (hinunterspringen). */
  moveDrop(dt) {
    this.vel.y = Math.max(this.vel.y - G * dt, -24);
    const c = this.center();
    const res = this.level.world.moveAABB(c, this.half, { x: 0, y: this.vel.y * dt, z: 0 }, { step: 0.25, snap: 0, ignore: this._drop });
    this.pos.set(c.x, c.y - this.half.y, c.z);
    this.grounded = res.grounded;
    this.ground = res.ground;
    if (res.grounded && this.vel.y < 0) this.vel.y = 0;
    if (this.pos.y < this.level.killY) { this.kill(); if (!this.defeated) this.fallOut('fall'); }
    else this.checkLava();
    return res;
  }

  /** Geschoss aus der Hand (lokaler Abwurfpunkt = model.hand() bei progress 0,5). */
  release() {
    const p = this.player;
    if (!p) return;
    const h = toWorld(this.pos, this.yaw, this.hand.x, this.hand.y, this.hand.z, {});
    const c = p.center();
    let dx = c.x - h.x, dz = c.z - h.z;
    const d = Math.hypot(dx, dz) || 1;
    dx /= d; dz /= d;
    let e = null;
    if (this.weapon === 'feuer') {
      e = this.level.spawn('feuerkugel', { pos: [h.x, h.y - 0.17, h.z], vel: [dx * 6, 1.5, dz * 6], mode: 'bounce', owner: this, ...(this.fireColor ? { color: this.fireColor } : {}) });
      this.level.sfx('fireball');
    } else if (this.weapon === 'hammer') {
      const T = clamp(d / 6, 0.7, 1.25);
      const ty = p.pos.y + 0.4 - (h.y - 0.25);
      let vx = (c.x - h.x) / T, vz = (c.z - h.z) / T;
      const hv = Math.hypot(vx, vz);
      if (hv > 7) { vx *= 7 / hv; vz *= 7 / hv; }
      e = this.level.spawn('wurf_hammer', { pos: [h.x, h.y - 0.25, h.z], vel: [vx, (ty + 0.5 * 30 * T * T) / T, vz], owner: this });
      this.level.sfx('swoop');
    } else if (this.sichel && this.level.hasKind?.('wurfsichel')) {
      // Welt 7: Wurfsichel statt Bumerang (Gegner-Sichel der Bausteine Welt 7)
      this.curve = -this.curve;
      e = this.level.spawn('wurfsichel', { pos: [h.x, h.y - 0.16, h.z], dir: [dx, dz], owner: this, speed: 9, range: clamp(d + 1.5, 4, 9), curve: this.curve * 0.9 });
      this.boomerang = e;
      this.catches0 = this.sichelCatch ?? 0;
      this.level.sfx('boomerang');
    } else {
      this.curve = -this.curve;
      e = this.level.spawn('wurf_bumerang', { pos: [h.x, h.y - 0.1, h.z], dir: [dx, dz], range: clamp(d + 1.5, 4, 9), curve: this.curve, owner: this });
      this.boomerang = e;
      this.level.sfx('swoop');
    }
    if (e) { this.shots.push(e); this.throws++; }
  }

  /** Bumerang gefangen → bald der nächste. */
  onCatch(b) {
    if (this.boomerang === b) this.boomerang = null;
    this.throwCool = Math.min(this.throwCool, this.interval * 0.5);
  }

  onHit(kind, source) {
    if (this.defeated) return;
    if (STRONG.has(kind)) { this.flip(source); return; }
    super.onHit(kind, source);
  }

  /** Besiegt: mit Wurfsichel auf dem Rücken lässt er sie fallen (Welt 7). */
  markDefeated() {
    const was = this.defeated;
    super.markDefeated();
    if (!was && this.sichel) this.dropSichel();
  }

  dropSichel() {
    if (this.sichelDropped) return;
    this.sichelDropped = true;
    const at = this.fellOut ? this.home : this.pos;
    let y = at.y;
    const hit = this.level.world.raycastDown(at.x, at.y + 1, at.z, 3);
    if (hit && !hit.shape.kill) y = hit.y;
    else if (!this.fellOut) y = this.home.y;
    const pos = [at.x, y, at.z];
    this.sichelItem = this.level.spawn('powerup', { pos, power: 'sichel', emerge: false });
    this.level.effects?.sparks({ x: at.x, y: y + 0.6, z: at.z }, 10);
    this.level.sfx('powerup_appear');
  }

  modelState() {
    const s = this.state;
    const dropped = this.sichelDropped || (this.boomerang?.kind === 'wurfsichel' && !this.boomerang.removed);
    if (s === 'throw') return { anim: 'throw', progress: Math.min(1, this.stateT / THROW), dropped };
    if (s === 'jump') return { anim: 'jump', dropped };
    if (s === 'walk') return { anim: 'walk', speed: this.speed, dropped };
    if (s === 'squashed') return { anim: 'squashed', dropped };
    if (s === 'flipped') return { anim: 'stunned', dropped };
    return { anim: 'idle', dropped };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    this.model.root.rotation.z = this.state === 'flipped' ? Math.PI : 0;
  }

  info() { return { state: this.state, weapon: this.weapon, throws: this.throws, jumps: this.jumps, tier: this.tier, y: +this.pos.y.toFixed(2), defeated: this.defeated, sichel: this.sichel, sichelDropped: this.sichelDropped }; }
}

export const KINDS = {
  feuer_werfer: (level, spec) => new Werfer(level, spec),
  hammer_werfer: (level, spec) => new Werfer(level, spec, 'hammer'),
  bumerang_werfer: (level, spec) => new Werfer(level, spec, 'bumerang'),
};
