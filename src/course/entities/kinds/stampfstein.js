// Stampfstein (Bauplan: „fällt bei Annäherung“, Konter: ausweichen, Rückseite nutzen). Nicht besiegbar – nur
// Riesentrank und Funkelstern zertrümmern ihn.
//
// Ein fester Steinquader (Kollisionsform mit mover → Figur und Gegner stehen darauf und werden mitgenommen) wartet
// über einem Weg. Kommt die Figur unter ihn (waagerecht im Fußabdruck + trigger, Füße unter seiner Unterkante),
// zittert er kurz (0,3 s) und fällt (bis 24 m/s) auf den Boden darunter: Staubring, Wackeln. Wer darunter steht,
// wird getroffen und seitlich hinausgeschoben; Gegner darunter werden platt. Er bleibt wait s liegen (Oberseite
// begehbar) und fährt dann langsam wieder hoch (mit der Figur obendrauf).
//
// Daten: { kind: 'stampfstein', pos: [x, y, z] (Mitte der Unterseite in der oberen Ruhelage),
//          size?: [1.8, 2, 1.8], fall?: m (sonst bis zum Boden darunter, höchstens 30 m), trigger?: 1.0 m
//          (über den Fußabdruck hinaus), wait?: 1.2 s, rise?: 2.5 m/s, drop? }
// Zustände: wait → shake (0,3 s) → fall → land (wait s) → rise → wait (0,5 s Pause) …; broken (zertrümmert).
// Modell 'stampfstein' (2,0 × 1,8 × 1,8 m; state { anim: wait|fall|angry|rise }).

import { Enemy } from '../Enemy.js';
import { getModel } from '../../models/index.js';

class Stampfstein extends Enemy {
  constructor(level, spec) {
    super(level, spec, 'stampfstein');
    const s = spec.size ?? [1.8, 2, 1.8];
    this.size = { x: s[0], y: s[1], z: s[2] };
    this.half.set(s[0] / 2, s[1] / 2, s[2] / 2);
    this.touch = false;            // Berührung: feste Form; Treffer beim Fallen rechnet der Stein selbst
    this.shadow = Math.min(s[0], s[2]) * 0.55;
    this.topY = this.pos.y;
    this.trigger = spec.trigger ?? 1.0;
    this.waitTime = spec.wait ?? 1.2;
    this.riseSpeed = spec.rise ?? 2.5;
    this.vy = 0;
    this.cool = 0;
    this.state = 'wait';
    const own = (sh) => sh.owner === this;
    if (spec.fall !== undefined) this.groundY = this.topY - spec.fall;
    else {
      const hit = level.world.raycastDown(this.pos.x, this.topY - 0.01, this.pos.z, 30, { ignore: own });
      this.groundY = hit ? hit.y : this.topY - 4;
    }
    this.mover = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: this.pos.x, cz: this.pos.z };
    // camIgnore: der bewegte Stein lässt die Kamera nicht springen (er verdeckt höchstens kurz)
    this.shapeId = this.addShape({ type: 'box', min: [0, 0, 0], max: [1, 1, 1], mover: this.mover, camIgnore: true, tag: 'stampfstein' });
    this.syncShape();
    this.unstep = level.onStep((dt) => this.stepMove(dt));
    if (level.view) this.setModel(getModel('stampfstein'));
    if (this.model && (s[0] !== 1.8 || s[1] !== 2 || s[2] !== 1.8)) this.model.root.scale.set(s[0] / 1.8, s[1] / 2, s[2] / 1.8);
  }

  syncShape() {
    const sh = this.level.world.get(this.shapeId);
    if (!sh) return;
    const p = this.pos, h = this.half;
    sh.min = [p.x - h.x, p.y, p.z - h.z];
    sh.max = [p.x + h.x, p.y + this.size.y, p.z + h.z];
    this.level.world.update(this.shapeId);
  }

  /** Bewegung im Plattform-Takt (vor der Figur), damit sie mitgenommen wird. */
  stepMove(dt) {
    if (this.removed || this.state === 'broken') return;
    this.stateT += dt;
    if (this.cool > 0) this.cool -= dt;
    // Funkelstern/Riesentrank: Berührung zertrümmert ihn
    const pl = this.level.player;
    if (pl && !pl.dead && pl.powerDef.invulnerable && this.touchesPlayer(0.08)) { this.smash(); return; }
    const y0 = this.pos.y;
    switch (this.state) {
      case 'wait':
        if (this.cool <= 0 && this.playerBelow()) { this.setState('shake'); this.level.sfx('blockhit'); }
        break;
      case 'shake':
        if (this.stateT > 0.3) { this.setState('fall'); this.vy = 0; }
        break;
      case 'fall': {
        this.vy = Math.max(this.vy - 55 * dt, -24);
        let y = this.pos.y + this.vy * dt;
        if (y <= this.groundY) y = this.groundY;
        this.crushCheck(y);
        if (this.state === 'broken') return;
        this.pos.y = y;
        if (y <= this.groundY) this.landed();
        break;
      }
      case 'land':
        if (this.stateT > this.waitTime) this.setState('rise');
        break;
      case 'rise':
        this.pos.y = Math.min(this.topY, this.pos.y + this.riseSpeed * dt);
        if (this.pos.y >= this.topY) { this.setState('wait'); this.cool = 0.5; }
        break;
      default: break;
    }
    const dy = this.pos.y - y0;
    this.mover.dx = 0; this.mover.dz = 0; this.mover.dy = dy;
    this.mover.vx = 0; this.mover.vz = 0; this.mover.vy = dy / dt;
    if (dy !== 0) this.syncShape();
  }

  touchesPlayer(pad) {
    const p = this.level.player, h = this.half, ph = p.half;
    return Math.abs(p.pos.x - this.pos.x) < h.x + ph.x + pad && Math.abs(p.pos.z - this.pos.z) < h.z + ph.z + pad
      && p.pos.y < this.pos.y + this.size.y + pad && p.pos.y + ph.y * 2 > this.pos.y - pad;
  }

  /** Figur unter dem Stein (Fußabdruck + trigger, Füße unterhalb der Unterkante, nicht tiefer als der Boden)? */
  playerBelow() {
    if (!this.playerActive()) return false;
    const p = this.level.player;
    const t = this.trigger;
    return Math.abs(p.pos.x - this.pos.x) < this.half.x + t && Math.abs(p.pos.z - this.pos.z) < this.half.z + t
      && p.pos.y < this.pos.y - 0.2 && p.pos.y > this.groundY - 1.5;
  }

  /** Beim Fallen: Figur darunter → Treffer und seitlich hinaus; Unverwundbare (Stern/Riese) zertrümmern ihn. */
  crushCheck(newY) {
    const p = this.level.player;
    if (!p || p.dead || p.mode === 'script') return;
    const h = this.half, ph = p.half;
    const ox = h.x + ph.x - Math.abs(p.pos.x - this.pos.x), oz = h.z + ph.z - Math.abs(p.pos.z - this.pos.z);
    if (ox <= 0 || oz <= 0) return;
    const head = p.pos.y + ph.y * 2;
    if (head <= newY || p.pos.y >= this.pos.y) return;
    if (p.powerDef.invulnerable) { this.smash(); return; }
    p.hurt(this);
    // seitlich aus dem Fußabdruck schieben (kürzester Weg)
    if (ox < oz) p.pos.x += Math.sign(p.pos.x - this.pos.x || 1) * (ox + 0.02);
    else p.pos.z += Math.sign(p.pos.z - this.pos.z || 1) * (oz + 0.02);
  }

  landed() {
    this.setState('land');
    this.vy = 0;
    this.level.shake(0.35);
    this.level.sfx('slam');
    this.level.effects?.ring({ x: this.pos.x, y: this.pos.y, z: this.pos.z }, Math.max(this.half.x, this.half.z) + 0.4);
    this.level.effects?.dust(this.pos, 8, 1.6);
    // Gegner darunter werden platt
    for (const e of this.level.entities) {
      if (e === this || !e.alive || !e.enemy || e.defeated) continue;
      if (Math.abs(e.pos.x - this.pos.x) < this.half.x + e.half.x && Math.abs(e.pos.z - this.pos.z) < this.half.z + e.half.z
        && e.pos.y < this.pos.y + 0.2 && e.pos.y + e.half.y * 2 > this.pos.y - 0.2) {
        e.onHit?.('pound', this);
      }
    }
  }

  smash() {
    if (this.state === 'broken') return;
    this.setState('broken');
    this.mover.dy = 0; this.mover.vy = 0;
    this.removeShapes();
    this.level.effects?.debris(this.center(), 0x9aa0a8, 12);
    this.level.effects?.dust(this.pos, 10, 1.6);
    this.level.sfx('brickbreak');
    this.level.shake(0.3);
    this.markDefeated();
    this.kill();
  }

  update() {}

  onPlayer() { return 'none'; }

  onHit(kind) {
    if (kind === 'mega' || kind === 'star') this.smash();
  }

  modelState() {
    const s = this.state;
    return { anim: s === 'fall' ? 'fall' : s === 'land' ? 'angry' : s === 'rise' ? 'rise' : 'wait' };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    // Ankündigung: Zittern vor dem Fall
    if (this.state === 'shake') this.model.root.position.x += Math.sin(this.stateT * 90) * 0.05;
  }

  dispose() {
    this.unstep?.();
    super.dispose();
  }
}

export const KINDS = { stampfstein: (level, spec) => new Stampfstein(level, spec) };
