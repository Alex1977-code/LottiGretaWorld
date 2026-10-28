// Wutkaulquappe – Gegner Welt 7 „Lava-Festung“ (7-6 Rammfisch-Riff, Vulkaninsel): kleine korallenrote Kaulquappe mit grimmigen
// Augen, die sich zur stacheligen Kugel aufbläst (Modell 'wutkaulquappe', Ursprung = Körpermitte). Eigene Figur.
//
// Verhalten (unter Wasser; sie verlässt das Wasser nie und folgt steigendem/sinkendem Wasser): schwimmt gemütlich ihre Bahn
// (path bzw. center + radius) oder paddelt um ihren Platz. Schwimmt eine Figur im Wasser (bzw. ist sie ≤ 1,5 m darüber) näher
// als sight m, **schwimmt sie an** (chase m/s, höchstens range m von ihrem Platz weg). Ist sie ≤ puffR m nah, **bläst sie sich
// auf** (0,4 s, Bläschen) und **stößt** als Stachelkugel auf die Figur zu (0,3 s, shove m/s): Berührung der aufgeblasenen Kugel
// verletzt und stößt die Figur weg. Danach bleibt sie puff s aufgeblasen, lässt die Luft ab und schwimmt zurück (cooldown s).
// Konter: **Angriffe** besiegen sie (Tatzenhieb, Schwanzhieb, Wurfsichel, Feuer, Panzer, Wurf, Rutschen, Kanone, Explosion, Stern,
// Riese …), ebenso Draufspringen/Stampfen bzw. Krallen-Sturzflug – aber **nicht, solange sie aufgeblasen ist** (Stacheln: Treffer
// der Figur; Angriffe besiegen sie dann trotzdem). Seitliche Berührung verletzt.
//
// Daten: { kind: 'wutkaulquappe', pos: [x, y, z] (Körpermitte unter Wasser), path?: [[x, y, z], …] + loop?, center?: [x, y, z]
//          + radius?: 2.5 + cw?, speed?: 1.2, sight?: 6, chase?: 2.6, puffR?: 1.8, puff?: 1.4, shove?: 6, push?: 7 (m/s Stoß
//          auf die Figur), cooldown?: 1.2, range?: 8, size?: 1.25, drop? }
//   Beispiel: { kind: 'wutkaulquappe', pos: [4, -1.5, -40], center: [4, -1.5, -40], radius: 2 }
// Zustände: swim → chase → inflate → shove → puffed → deflate → swim …; defeated (1,0 s). Laufzeit: puffs, shoves, puffK (0..1),
//   info(). Sound: 'hover' (aufblasen), 'dash' (Stoß), 'bounce', 'stomp', 'poof'.

import * as THREE from 'three';
import { EnemyW2, activeFigure, clamp, waterAt } from '../EnemyW2.js';
import { PathMover } from '../../level/PathMover.js';
import { getModel } from '../../models/index.js';

const TAU = Math.PI * 2;
const INFLATE = 0.4, SHOVE = 0.3, DEFLATE = 0.4, DEFEAT = 1.0;

/** Liegt der Punkt in einer Wasserform (mit Abstand m zur Oberfläche/zum Grund)? → Form | null */
function waterIn(level, x, y, z, m = 0.15) {
  for (const s of level.world.overlapAABB({ x, y, z }, { x: 0.02, y: 0.02, z: 0.02 })) {
    if (s.water && y < s.top - m && y > (s.bot ?? -1e9) + m) return s;
  }
  return null;
}

function circlePath(c, r, n = 20, cw = false) {
  const pts = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU * (cw ? -1 : 1); pts.push([c[0] + Math.cos(a) * r, c[1], c[2] - Math.sin(a) * r]); }
  return pts;
}

class Wutkaulquappe extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'wutkaulquappe');
    this.size = spec.size ?? 1.25;
    this.r0 = 0.24 * this.size;
    this.half.set(this.r0, this.r0, this.r0);
    this.shadow = 0;
    this.wake = 0;
    this.edges = false;
    this.speed = spec.speed ?? 1.2;
    this.sight = spec.sight ?? 6;
    this.chaseSpeed = spec.chase ?? 2.6;
    this.puffR = spec.puffR ?? 1.8;
    this.puffT = spec.puff ?? 1.4;
    this.shoveSpeed = spec.shove ?? 6;
    this.pushSpeed = spec.push ?? 7;
    this.coolTime = spec.cooldown ?? 1.2;
    this.range = spec.range ?? 8;
    this.cool = 0;
    this.puffK = 0;
    this.puffs = 0; this.shoves = 0;
    this.bumpT = 0;
    // pos = Körpermitte (Daten) → Fußpunkt der Hülle
    this.home = new THREE.Vector3(this.pos.x, this.pos.y, this.pos.z);
    this.pos.y -= this.half.y;
    const pts = spec.center ? circlePath(spec.center, spec.radius ?? 2.5, 20, !!spec.cw) : spec.path;
    this.mover = pts?.length >= 2 ? new PathMover(pts, { speed: this.speed, mode: spec.center || (spec.loop ?? pts.length >= 3) ? 'loop' : 'pingpong', wait: 0.4, phase: spec.phase ?? 0 }) : null;
    if (this.mover) { const p = this.mover.pos; this.home.set(p.x, p.y, p.z); this.setBody(p.x, p.y, p.z); }
    this.shoveDir = { x: 0, y: 0, z: 1 };
    this.state = 'swim';
    if (level.view) this.setModel(getModel('wutkaulquappe', { size: this.size }));
    this.initShadows(1);
  }

  body(out = new THREE.Vector3()) { return out.set(this.pos.x, this.pos.y + this.half.y, this.pos.z); }
  setBody(x, y, z) { this.pos.set(x, y - this.half.y, z); }

  /** Figur im Wasser (oder knapp darüber) in Sichtweite? */
  targetFigure() {
    const p = this.player;
    if (!activeFigure(p)) return null;
    const inWater = p.mode === 'swim' || !!waterAt(this.level, p.pos.x, p.pos.y, p.pos.z, 1.5);
    if (!inWater) return null;
    const b = this.body();
    const d = Math.hypot(p.pos.x - b.x, p.pos.y + p.half.y - b.y, p.pos.z - b.z);
    return d < this.sight ? p : null;
  }

  /** Körpermitte um (dx, dy, dz) verschieben, nur innerhalb des Wassers (bzw. ohne Wasser am Platz frei). */
  swimBy(dx, dy, dz) {
    const b = this.body();
    const free = !waterIn(this.level, this.home.x, this.home.y, this.home.z, 0);
    const nx = b.x + dx, ny = b.y + dy, nz = b.z + dz;
    if (free || waterIn(this.level, nx, ny, nz, this.half.y * 0.6)) { this.setBody(nx, ny, nz); return true; }
    // nur waagerecht versuchen (Oberfläche/Grund)
    if (waterIn(this.level, nx, b.y, nz, this.half.y * 0.6)) { this.setBody(nx, b.y, nz); return true; }
    return false;
  }

  moveToward(x, y, z, speed, dt) {
    const b = this.body();
    const dx = x - b.x, dy = y - b.y, dz = z - b.z, d = Math.hypot(dx, dy, dz);
    if (d < 1e-3) return 0;
    const s = Math.min(d, speed * dt);
    this.swimBy((dx / d) * s, (dy / d) * s, (dz / d) * s);
    if (Math.hypot(dx, dz) > 0.05) this.faceToward(dx, dz, dt, 8);
    return d;
  }

  update(dt) {
    this.stateT += dt;
    if (this.bumpT > 0) this.bumpT -= dt;
    if (this.state === 'defeated') {
      this.pos.y += dt * 0.5;
      if (this.stateT >= DEFEAT) this.kill();
      return;
    }
    if (this.cool > 0) this.cool -= dt;
    switch (this.state) {
      case 'swim': {
        this.puffK = Math.max(0, this.puffK - dt * 3);
        if (this.mover) {
          this.mover.step(dt);
          const p = this.mover.pos;
          this.moveToward(p.x, p.y, p.z, this.speed * 2, dt);
        } else {
          const t = this.level.time;
          this.moveToward(this.home.x + Math.cos(t * 0.6) * 0.8, this.home.y + Math.sin(t * 1.3) * 0.15, this.home.z - Math.sin(t * 0.6) * 0.8, this.speed, dt);
        }
        if (this.cool <= 0 && this.targetFigure()) this.setState('chase');
        return;
      }
      case 'chase': {
        const p = this.targetFigure();
        const b = this.body();
        if (!p || Math.hypot(b.x - this.home.x, b.z - this.home.z) > this.range) { this.setState('return'); return; }
        const c = p.center();
        const d = this.moveToward(c.x, c.y, c.z, this.chaseSpeed, dt);
        if (d < this.puffR + this.half.x) { this.setState('inflate'); this.puffs++; this.level.sfx('hover'); }
        return;
      }
      case 'return': {
        this.puffK = Math.max(0, this.puffK - dt * 3);
        const t = this.mover ? this.mover.pos : this.home;
        const d = this.moveToward(t.x, t.y, t.z, this.speed * 1.6, dt);
        if (d < 0.3) this.setState('swim');
        else if (this.stateT > 0.6 && this.cool <= 0 && this.targetFigure()) this.setState('chase');
        return;
      }
      case 'inflate': {
        this.puffK = Math.min(1, this.stateT / INFLATE);
        this.grow();
        const p = this.player;
        if (activeFigure(p)) { const c = p.center(), b = this.body(); this.faceToward(c.x - b.x, c.z - b.z, dt, 10); }
        if (this.stateT >= INFLATE) this.startShove();
        return;
      }
      case 'shove': {
        this.puffK = 1;
        const s = this.shoveSpeed * dt * (1 - this.stateT / SHOVE * 0.5);
        this.swimBy(this.shoveDir.x * s, this.shoveDir.y * s, this.shoveDir.z * s);
        if (this.stateT >= SHOVE) this.setState('puffed');
        return;
      }
      case 'puffed':
        this.puffK = 1;
        this.swimBy(0, Math.sin(this.stateT * 6) * 0.004, 0);
        if (this.stateT >= this.puffT) this.setState('deflate');
        return;
      case 'deflate':
        this.puffK = Math.max(0, 1 - this.stateT / DEFLATE);
        this.grow();
        if (this.stateT >= DEFLATE) { this.cool = this.coolTime; this.setState('return'); }
        return;
      default: break;
    }
  }

  /** Hülle mit dem Aufblasen wachsen lassen (Körpermitte bleibt). */
  grow() {
    const b = this.body();
    const r = this.r0 + (0.4 * this.size - this.r0) * this.puffK;
    this.half.set(r, r, r);
    this.setBody(b.x, b.y, b.z);
  }

  startShove() {
    this.puffK = 1;
    this.grow();
    const p = this.player;
    const b = this.body();
    if (activeFigure(p)) {
      const c = p.center();
      const dx = c.x - b.x, dy = c.y - b.y, dz = c.z - b.z, d = Math.hypot(dx, dy, dz) || 1;
      this.shoveDir = { x: dx / d, y: dy / d, z: dz / d };
    } else {
      this.shoveDir = { x: Math.cos(this.yaw), y: 0, z: -Math.sin(this.yaw) };
    }
    this.shoves++;
    this.setState('shove');
    this.level.sfx('dash');
  }

  get puffed() { return this.puffK > 0.5; }

  defeat(source) {
    if (this.defeated) return;
    this.setState('defeated');
    this.touch = false;
    this.level.sfx('poof');
    this.level.effects?.sparks(this.body(), 6);
    this.markDefeated();
  }

  /** Aufgeblasene Kugel: Figur wegstoßen. */
  pushAway(player) {
    const b = this.body(), c = player.center();
    let dx = c.x - b.x, dz = c.z - b.z;
    const d = Math.hypot(dx, dz) || 1;
    dx /= d; dz /= d;
    if (!player.dead) { player.vel.x = dx * this.pushSpeed; player.vel.z = dz * this.pushSpeed; player.vel.y = Math.max(player.vel.y, 2.5); }
  }

  onPlayer(player, contact) {
    if (this.defeated) return 'none';
    if (this.puffed) {
      if (contact.dive) { this.defeat(player); return 'none'; }
      if (this.bumpT > 0) return 'none';
      this.bumpT = 0.4;
      if (player.hurt(this)) this.pushAway(player);
      this.level.sfx('bounce');
      return 'none';
    }
    if (this.slideAttack(player, contact)) return 'none';
    if (contact.pound) { this.defeat(player); return 'none'; }
    if (contact.fromAbove) { this.defeat(player); return 'stomp'; }
    if (contact.dive) { this.defeat(player); return 'none'; }
    return 'hurt';
  }

  onHit(kind, source) {
    if (this.defeated || kind === 'bump') return;
    if (kind === 'pound' && source?.pos && Math.abs(source.pos.y - this.pos.y) > 1.2) return;
    this.defeat(source);
  }

  modelState() {
    const s = this.state;
    if (s === 'defeated') return { anim: 'defeated', progress: Math.min(1, this.stateT / DEFEAT) };
    if (s === 'chase' || s === 'shove') return { anim: 'charge', puff: this.puffK, speed: this.chaseSpeed };
    if (s === 'inflate' || s === 'puffed' || s === 'deflate') return { anim: 'puff', puff: this.puffK };
    return { anim: 'swim', speed: this.speed, puff: this.puffK };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    this.model.root.position.y = this.pos.y + this.half.y;
  }

  info() {
    const b = this.body();
    return {
      state: this.state, puffs: this.puffs, shoves: this.shoves, puff: +this.puffK.toFixed(2), defeated: this.defeated,
      x: +b.x.toFixed(2), y: +b.y.toFixed(2), z: +b.z.toFixed(2),
    };
  }
}

export const KINDS = { wutkaulquappe: (level, spec) => new Wutkaulquappe(level, spec) };
