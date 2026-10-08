// Kickbombe (Bauplan Welt 1-Burg: Kickbomben in Wände kicken, vom Endgegner geworfen und zurückgekickt).
//
// Läuft wie ein Pilzling. Berührung, Sprung oder Treffer zünden die Lunte (lit): nach fuse s (Standard 3) explodiert
// sie – Radius 2,5 m: zerstört Ziegel/Kristall/Steinblöcke (`breakable`- und `mega`-Formen mit owner), besiegt
// Gegner (onHit('bomb')), zündet andere Kickbomben (Kettenreaktion) und verletzt die Figur. Brennend läuft sie
// langsam auf die Figur zu.
// Die Figur kickt sie durch seitliche Berührung (sie rollt mit 9 m/s davon, 0,35 s ohne Rückwirkung) oder hebt sie
// auf (Aktion in Reichweite bzw. Rennen gehalten + Berührung) und wirft sie (Bogen). Eine gekickte/geworfene Bombe
// explodiert beim Aufprall (> 3 m/s) an einer Wand oder an einem Gegner; trifft sie eine Entität mit
// `onBombHit(bomb)`, wird diese zuerst gerufen (Endgegner Baron Brummbär: zurückgekickte Bombe = Treffer).
// Draufspringen zündet sie (Abprall), Funkelstern/Riesentrank entschärfen sie (fliegt weg, keine Explosion).
//
// Daten: { kind: 'kickbombe', pos, path?, loop?, dir?, speed?: 1.3, behavior?: 'walk' | 'chase', sight?: 9,
//          lit?: false (Lunte brennt schon), fuse?: 3 s, radius?: 2.5 m, kickSpeed?: 9 m/s, wake?,
//          vel?: [vx, vy, vz] (Start im Flug, z. B. vom Endgegner geworfen; landet dann brennend),
//          owner?: Entität oder ihre id (wird von ihr nicht getroffen, bis die Figur sie gekickt/geworfen hat) }
// onBombHit-Ziele müssen alive sein, touch !== false und nicht defeated.
// Zustände: walk → lit → kicked | air | carried → (Explosion); flipped (entschärft).
// Hooks: level.onExplosion?.(center, radius, bomb) nach jeder Explosion. Feld exploded, fuse (s übrig).
// Modell 'kickbombe' (state { anim: walk|idle|lit|kicked, speed, fuse 0..1 }).

import * as THREE from 'three';
import { Enemy } from '../Enemy.js';
import { getModel } from '../../models/index.js';

/** Abstand Punkt → Hüllquader einer Kollisionsform. */
function shapeDist(s, c) {
  if (s.type === 'cyl') {
    const r = Math.max(0, Math.hypot(c.x - s.x, c.z - s.z) - s.r);
    const dy = Math.max(s.bot - c.y, 0, c.y - s.top);
    return Math.hypot(r, dy);
  }
  const dx = Math.max(s.x0 - c.x, 0, c.x - s.x1), dy = Math.max(s.bot - c.y, 0, c.y - s.top), dz = Math.max(s.z0 - c.z, 0, c.z - s.z1);
  return Math.hypot(dx, dy, dz);
}

/** Kurzer Explosionsblitz (wachsende, verblassende Kugel). */
function flash(level, c, r) {
  const view = level.view;
  if (!view) return;
  const mat = new THREE.MeshBasicMaterial({ color: 0xffb040, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending });
  const geo = new THREE.SphereGeometry(1, 16, 10);
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(c);
  m.scale.setScalar(0.3);
  let t = 0;
  view.add(m, (dt) => {
    t += dt;
    const k = Math.min(1, t / 0.35);
    m.scale.setScalar(0.3 + r * 0.9 * Math.sqrt(k));
    mat.opacity = 0.8 * (1 - k);
    if (k >= 1) { view.remove(m); geo.dispose(); mat.dispose(); }
  });
}

class Kickbombe extends Enemy {
  constructor(level, spec) {
    super(level, spec, 'kickbombe');
    this.half.set(0.32, 0.36, 0.32);
    this.shadow = 0.42;
    this.carryable = true;
    this.speed = spec.speed ?? 1.3;
    this.behavior = spec.behavior ?? 'walk';
    this.sight = spec.sight ?? 9;
    this.fuseTotal = spec.fuse ?? 3;
    this.radius = spec.radius ?? 2.5;
    this.kickSpeed = spec.kickSpeed ?? 9;
    this.lit = false;
    this.fuse = 0;
    this.owner = typeof spec.owner === 'string' ? level.named.get(spec.owner) ?? null : spec.owner ?? null;
    this.kicker = null;
    this.grace = 0;
    this.rollSpeed = 0;
    this.exploded = false;
    this.state = 'walk';
    if (spec.lit) this.light();
    if (spec.vel) {
      this.vel.set(spec.vel[0], spec.vel[1], spec.vel[2]);
      this.state = 'air';
      this.light();
    }
    if (level.view) this.setModel(getModel('kickbombe'));
  }

  /** Lunte anzünden (bzw. verkürzen: t = höchstens noch so viele s). */
  light(t) {
    if (this.lit) { if (t !== undefined) this.fuse = Math.min(this.fuse, t); return; }
    this.lit = true;
    this.fuse = t ?? this.fuseTotal;
    if (this.state === 'walk') this.state = 'lit';
    this.level.sfx('hover');
  }

  canCarry() { return !this.exploded && !this.defeated && (this.state === 'walk' || this.state === 'lit' || this.state === 'kicked'); }

  update(dt) {
    this.stateT += dt;
    if (this.grace > 0) this.grace -= dt;
    if (this.updateDefeat(dt)) return;
    if (this.lit) {
      this.fuse -= dt;
      if (this.fuse <= 0) { this.explode(); return; }
    }
    switch (this.state) {
      case 'carried': this.followCarrier(); break;
      case 'walk':
        if (this.behavior === 'chase' && this.canSee(this.sight, 2.5)) this.chase(dt, this.speed);
        else this.walk(dt, this.speed);
        break;
      case 'lit':
        if (this.canSee(this.sight, 2.5)) this.chase(dt, 1.6);
        else this.walk(dt, 1.6);
        break;
      case 'kicked': this.roll(dt); break;
      case 'air': this.fly(dt); break;
      default: break;
    }
  }

  roll(dt) {
    this.rollSpeed = Math.max(0, this.rollSpeed - 2.5 * dt);
    this.vel.x = this.dir.x * this.rollSpeed;
    this.vel.z = this.dir.z * this.rollSpeed;
    const res = this.moveWithGravity(dt, { step: 0.3 });
    if (this.removed) return;
    if (res.hitWall) {
      if (this.rollSpeed > 3) { this.explode(); return; }
      const n = res.wallNormal, d = this.dir.x * n.x + this.dir.z * n.z;
      if (d < 0) { this.dir.x -= 2 * d * n.x; this.dir.z -= 2 * d * n.z; }
      this.rollSpeed *= 0.5;
    }
    if (this.impact()) return;
    if (this.rollSpeed < 0.4) this.setState('lit');
  }

  fly(dt) {
    const hs = Math.hypot(this.vel.x, this.vel.z);
    const res = this.moveWithGravity(dt, { step: 0.1 });
    if (this.removed) return;
    if (res.hitWall && hs > 3 && this.kicker) { this.explode(); return; }
    if (this.kicker && this.impact()) return;
    if (this.grounded) {
      if (this.kicker && hs > 1) {
        this.dir.x = this.vel.x / hs; this.dir.z = this.vel.z / hs;
        this.rollSpeed = hs * 0.7;
        this.setState('kicked');
      } else {
        this.vel.x = 0; this.vel.z = 0;
        this.setState('lit');
      }
    }
  }

  /** Aufprall an einer Entität (gekickt/geworfen): onBombHit-Ziel oder Gegner → Explosion. */
  impact() {
    for (const e of this.level.entities) {
      if (e === this || !e.alive || e.removed || e.defeated || e.touch === false || e.carrier) continue;
      if (e === this.owner && !this.kicker) continue;
      if (!e.onBombHit && !e.enemy) continue;
      if (!this.overlaps(e, 0.05)) continue;
      if (e.onBombHit) e.onBombHit(this);
      this.explode();
      return true;
    }
    return false;
  }

  /** Kick von der Figur weg (leicht in ihre Blickrichtung gezogen). */
  kick(player, dx, dz) {
    const f = player.facingVec();
    let l = Math.hypot(dx, dz);
    if (l < 1e-3) { dx = f.x; dz = f.z; l = 1; }
    dx = dx / l + f.x * 0.6; dz = dz / l + f.z * 0.6;
    l = Math.hypot(dx, dz) || 1;
    this.dir.x = dx / l; this.dir.z = dz / l;
    this.rollSpeed = this.kickSpeed;
    this.kicker = player;
    this.owner = null;
    this.grace = 0.35;
    this.vel.y = 2.5;
    this.grounded = false;
    this.light();
    this.setState('kicked');
    this.level.sfx('stomp');
    this.level.effects?.dust(this.pos, 3);
  }

  onPlayer(player, contact) {
    if (this.defeated || this.exploded || this.state === 'carried') return 'none';
    if (this.state === 'air' && !this.kicker) return 'none';
    if (this.grace > 0) return 'none';
    if (contact.fromAbove || contact.pound) {
      this.light();
      if (this.state === 'kicked') { this.rollSpeed = 0; this.setState('lit'); }
      this.grace = 0.2;
      return 'stomp';
    }
    if (player.input?.run && player.canPickUp?.()) { player.pickUp(this); return 'none'; }
    this.kick(player, this.pos.x - player.pos.x, this.pos.z - player.pos.z);
    return 'none';
  }

  onHit(kind, source) {
    if (this.defeated || this.exploded || this.state === 'carried') return;
    if (kind === 'mega' || kind === 'star') { this.lit = false; this.flip(source); return; }
    if (kind === 'bomb') { this.light(0.12); return; }
    if (kind === 'pound' && source && Math.abs(source.pos.y - this.pos.y) > 0.6) return;
    if (kind === 'claw' && source?.facingVec) { const f = source.facingVec(); this.kick(source, f.x, f.z); return; }
    this.light();
  }

  /** Eine entschärfte Bombe zählt nicht als besiegter Gegner. */
  markDefeated() { this.defeated = true; }

  onPickup() {
    this.setState('carried');
    this.touch = false;
    this.vel.set(0, 0, 0);
    this.light();
  }

  onThrow(player, o) {
    this.touch = true;
    this.kicker = player;
    this.owner = null;
    this.grace = 0.4;
    if (o.gentle) {
      this.pos.x = player.pos.x + o.dir.x * 0.75; this.pos.z = player.pos.z + o.dir.z * 0.75;
      this.pos.y = player.pos.y + 0.1;
      this.vel.set(0, 0, 0);
      this.setState('lit');
      return;
    }
    this.vel.set(o.dir.x * 8 + player.vel.x * 0.3, 4.5, o.dir.z * 8 + player.vel.z * 0.3);
    this.grounded = false;
    this.setState('air');
  }

  onDrop() {
    this.touch = true;
    this.vel.set(0, 2, 0);
    this.grace = 0.4;
    this.setState('lit');
  }

  /** Explosion: Blöcke/Wände, Gegner, Figur im Radius. */
  explode() {
    if (this.exploded) return;
    this.exploded = true;
    this.defeated = true;
    if (this.carrier) { if (this.carrier.holding === this) this.carrier.holding = null; this.carrier = null; }
    const lv = this.level;
    const R = this.radius;
    const c = this.center().clone();
    this.touch = false;
    this.kill();
    lv.sfx('slam');
    lv.sfx('brickbreak');
    lv.shake(0.5);
    const fx = lv.effects;
    fx?.ring(this.pos, R * 0.8);
    fx?.dust(this.pos, 10, 2.2);
    fx?.sparks(c, 26);
    fx?.debris(c, 0x2c3274, 6);
    flash(lv, c, R);
    const done = new Set([this]);
    for (const e of lv.entities.slice()) {
      if (done.has(e) || !e.alive || e.removed) continue;
      if (e.distanceTo(c.x, c.y, c.z) > R) continue;
      done.add(e);
      e.onHit?.('bomb', this);
    }
    for (const s of lv.world.overlapAABB(c, { x: R, y: R, z: R })) {
      const o = s.owner;
      if (!o || done.has(o) || !(s.breakable || s.mega)) continue;
      if (shapeDist(s, c) > R) continue;
      done.add(o);
      o.onHit?.('bomb', this, s);
    }
    const p = lv.player;
    if (p && !p.dead) {
      const pc = p.center();
      const dx = Math.max(0, Math.abs(pc.x - c.x) - p.half.x), dy = Math.max(0, Math.abs(pc.y - c.y) - p.half.y), dz = Math.max(0, Math.abs(pc.z - c.z) - p.half.z);
      if (Math.hypot(dx, dy, dz) < R * 0.9) p.hurt(this);
    }
    lv.onExplosion?.(c, R, this);
  }

  modelState() {
    const s = this.state;
    const fuse = this.lit ? Math.max(0, Math.min(1, 1 - this.fuse / this.fuseTotal)) : 0;
    if (s === 'kicked' || s === 'air') return { anim: 'kicked', speed: Math.max(this.rollSpeed, Math.hypot(this.vel.x, this.vel.z)), fuse };
    if (s === 'walk') return { anim: 'walk', speed: this.speed };
    if (s === 'flipped') return { anim: 'idle' };
    return { anim: 'lit', speed: s === 'carried' ? 0 : Math.hypot(this.vel.x, this.vel.z), fuse };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    this.model.root.rotation.z = this.state === 'flipped' ? Math.PI : 0;
  }
}

export const KINDS = { kickbombe: (level, spec) => new Kickbombe(level, spec) };
