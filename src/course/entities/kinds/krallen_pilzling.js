// Krallen-Pilzling (Bauplan: „springt den Spieler an“, Konter: draufspringen). Läuft wie ein Pilzling; kommt die
// Figur in Sichtweite, kündigt er den Angriff an (Hüpfer mit „!“, dann ducken) und springt in einem flachen Bogen
// auf die Stelle, an der die Figur gleich sein wird. Nach der Landung kurz verschnaufen, dann wieder laufen.
//
// Daten: { kind: 'krallen_pilzling', pos, path?, loop?, dir?, speed?: 1.8, edges?, wake?, drop?,
//          sight?: 5.5 m (Angriffsweite = größte Sprungweite), cooldown?: 1.4 s }
//
// Zustände: idle → walk → alert (0,4 s, dreht sich zur Figur) → crouch (0,22 s ducken) → leap (Sprung 0,5 s,
// ≈ 1,25 m hoch, höchstens sight weit; springt nie über eine Kante ins Leere) → land (0,5 s) → walk …; squashed | flipped.
// Modell 'krallen_pilzling' (state { anim: walk|idle|alert|pounce|squashed|stunned, speed }; pounce: 0–0,22 s
// ducken, danach gestreckter Sprung).

import { Enemy } from '../Enemy.js';
import { getModel } from '../../models/index.js';

const LEAP_VY = 10;         // m/s → Scheitel ≈ 1,25 m, Flugzeit 0,5 s bis zur Ausgangshöhe
const FLIGHT = (2 * LEAP_VY) / 40;

class KrallenPilzling extends Enemy {
  constructor(level, spec) {
    super(level, spec, 'krallen_pilzling');
    this.half.set(0.42, 0.44, 0.42);
    this.shadow = 0.5;
    this.speed = spec.speed ?? 1.8;
    this.sight = spec.sight ?? 5.5;
    this.coolTime = spec.cooldown ?? 1.4;
    this.cool = 0.6;
    if (level.view) this.setModel(getModel('krallen_pilzling', { size: [0.9, 0.9, 0.9] }));
  }

  update(dt) {
    this.stateT += dt;
    if (this.updateDefeat(dt)) return;
    if (this.cool > 0) this.cool -= dt;
    switch (this.state) {
      case 'idle':
        if (!this.level.player || this.playerDist() < this.wake) this.setState('walk');
        this.stand(dt);
        break;
      case 'walk':
        this.walk(dt, this.speed);
        if (this.cool <= 0 && this.grounded && this.canSee(this.sight, 1.6)) this.setState('alert');
        break;
      case 'alert':
        this.facePlayer(dt, 14);
        this.stand(dt);
        if (this.stateT > 0.4) this.setState('crouch');
        break;
      case 'crouch':
        this.facePlayer(dt, 14);
        this.stand(dt);
        if (this.stateT > 0.22) this.startLeap();
        break;
      case 'leap': {
        const res = this.moveWithGravity(dt);
        if (res.hitWall) { this.vel.x = 0; this.vel.z = 0; }
        if (this.grounded && this.stateT > 0.08) { this.setState('land'); this.vel.set(0, 0, 0); this.level.effects?.dust(this.pos, 3); }
        break;
      }
      case 'land':
        this.stand(dt);
        if (this.stateT > 0.5) { this.setState('walk'); this.cool = this.coolTime; }
        break;
      default: break;
    }
  }

  /** Sprung auf die vorausberechnete Stelle der Figur (Vorhalt 0,25 s), nie ins Leere. */
  startLeap() {
    const p = this.level.player;
    if (!p || !this.playerActive()) { this.setState('walk'); return; }
    let tx = p.pos.x + p.vel.x * 0.25 - this.pos.x, tz = p.pos.z + p.vel.z * 0.25 - this.pos.z;
    let d = Math.hypot(tx, tz);
    if (d < 0.01) { tx = this.dir.x; tz = this.dir.z; d = 1; }
    const dist = Math.min(d, this.sight);
    const ux = tx / d, uz = tz / d;
    // Landestelle prüfen: ohne Boden kürzer springen, notfalls gar nicht
    let land = dist;
    while (land > 0.5 && !this.level.world.raycastDown(this.pos.x + ux * land, this.pos.y + 1.2, this.pos.z + uz * land, 2.6)) land -= 0.5;
    if (land <= 0.5) { this.setState('walk'); this.cool = this.coolTime; return; }
    const vh = land / FLIGHT;
    this.dir.x = ux; this.dir.z = uz;
    this.yaw = Math.atan2(-uz, ux);
    this.vel.set(ux * vh, LEAP_VY, uz * vh);
    this.grounded = false;
    this.setState('leap');
    this.level.sfx('claw');
  }

  modelState() {
    const s = this.state;
    if (s === 'crouch' || s === 'leap') return { anim: 'pounce' };
    const anim = s === 'walk' ? 'walk' : s === 'squashed' ? 'squashed' : s === 'flipped' ? 'stunned' : s === 'alert' ? 'alert' : 'idle';
    return { anim, speed: s === 'walk' ? this.speed : 0 };
  }
}

export const KINDS = { krallen_pilzling: (level, spec) => new KrallenPilzling(level, spec) };
