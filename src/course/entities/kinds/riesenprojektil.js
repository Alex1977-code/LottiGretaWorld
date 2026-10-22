// Riesenprojektil und Riesenkanone (3-Zug: vom Parallelzug abgefeuert).
//
// riesenprojektil – großes, langsames Geschoss (≈ 4,6 m lang, Ø 2,4 m, Familie des Projektilkopfs): fliegt waagerecht
//   geradeaus (durch Einweg-Plattformen hindurch) und zerplatzt an Wänden/Boden oder nach life s. Man kann darauf
//   **landen, stehen, mitfahren und abspringen** (Einweg-Oberseite 2,35 m über der Unterkante); die Stampfattacke auf
//   ihm bringt es zum Absturz (besiegt). Vorn/seitlich = Treffer. Kanonenkugel, Explosion, Riesentrank, Funkelstern
//   besiegen es; Feuer, Krallen, Panzer, Wurf … prallen ab (zu groß).
//   Daten: { kind: 'riesenprojektil', pos: [x, y, z] (Mitte der Unterkante; Rumpfmitte = y + 1,2), dir?: [dx, dz] | yaw,
//            speed?: 3.5, life?: 14, ride?: true, owner? (Kanone: deren Formen werden ignoriert), drop? }
//   Zustände: fly (0,4 s Startflamme) → fall | burst. Laufzeit: age, riders(). Modell 'riesenprojektil'
//   (Rumpfmitte y = 1,2, Nase +X; state { anim: fly|launch|fall }).
//
// riesenkanone – Abschussrohr für Riesenprojektile: feuert alle interval s (Ankündigung charge s: Rohr zittert,
//   Rauch) ein Riesenprojektil in Rohrrichtung, solange eine Figur näher als range m ist. hidden: true → unsichtbar
//   (z. B. hinter dem Bildrand auf dem Parallelzug, nur der Abschusspunkt zählt). Unzerstörbar außer durch
//   Kanonenkugel/Explosion/Riesentrank (sichtbar). Fährt mit (attach) wie andere Entitäten.
//   Daten: { kind: 'riesenkanone', id?, pos (Fußpunkt), dir?|yaw?, height?: 2.6 (Rohrmitte über dem Fuß), interval?: 5,
//            first?: 1.5, range?: 40, charge?: 0.8, max?: 2, speed?, life?, ride?, hidden?: false, active?: true }
//   Laufzeit: shots, bullets (lebende), setActive(b). Modell: 'kanone_turm' ×2 (height 1.3, Rohr ×2).
// Alternative: kanone_turm mit shot: 'riesenprojektil' (Rumpfmitte an der Mündung).

import { EnemyW2, localOffset, toWorld, activeFigure } from '../EnemyW2.js';
import { getModel } from '../../models/index.js';

const CY = 1.2, LEN = 2.3, R = 1.2, TOP = 2.35;

class Riesenprojektil extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'riesenprojektil');
    this.wake = 0;
    this.edges = false;
    this.shadow = 1.2;
    this.speed = spec.speed ?? 3.5;
    this.life = spec.life ?? 14;
    this.owner = spec.owner ?? null;
    this.ride = spec.ride !== false;
    this.age = 0;
    this.pitch = 0;
    this.state = 'fly';
    this.yaw = Math.atan2(-this.dir.z, this.dir.x);
    this.sizeHull();
    this._ign = (s) => s.owner === this || (this.owner && s.owner === this.owner) || !!s.oneWay || !!s.water;
    this.shapeId = null;
    if (this.ride) {
      this.mover = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: this.pos.x, cz: this.pos.z };
      this.shapeId = this.addShape({ type: 'box', min: [0, 0, 0], max: [1, 1, 1], oneWay: true, mover: this.mover, camIgnore: true, tag: 'riesenprojektil' });
      this.syncShape();
    }
    if (level.view) this.setModel(getModel('riesenprojektil'));
    this.initShadows(1);
  }

  /** Hüllquader aus der Flugrichtung (Länge entlang dir, Breite quer). */
  sizeHull() {
    const c = Math.abs(Math.cos(this.yaw)), s = Math.abs(Math.sin(this.yaw));
    this.half.set(c * LEN + s * R, CY, s * LEN + c * R);
  }

  syncShape() {
    const sh = this.shapeId !== null ? this.level.world.get(this.shapeId) : null;
    if (!sh) return;
    const p = this.pos, c = Math.abs(Math.cos(this.yaw)), s = Math.abs(Math.sin(this.yaw));
    const hx = c * (LEN - 0.5) + s * 0.75, hz = s * (LEN - 0.5) + c * 0.75;
    sh.min = [p.x - hx, p.y + TOP - 0.3, p.z - hz];
    sh.max = [p.x + hx, p.y + TOP, p.z + hz];
    this.level.world.update(this.shapeId);
  }

  update(dt) {
    this.stateT += dt;
    this.age += dt;
    if (this.state === 'fall') { this.fallStep(dt); return; }
    if (this.updateDefeat(dt)) return;
    if (this.age > this.life) { this.pop(false); return; }
    const x0 = this.pos.x, y0 = this.pos.y, z0 = this.pos.z;
    const dx = Math.cos(this.yaw), dz = -Math.sin(this.yaw);
    // vorn an der Nase prüfen (Rumpf ist breit – nur ein schmaler Fühler, damit Kanten der Bahn nicht stören)
    const c = this.center();
    const res = this.level.world.moveAABB(c, this.half, { x: dx * this.speed * dt, y: 0, z: dz * this.speed * dt }, { step: 0, ignore: this._ign });
    this.pos.set(c.x, c.y - CY, c.z);
    if (res.hitWall) { this.pop(true); return; }
    if (this.mover) {
      const m = this.mover;
      m.dx = this.pos.x - x0; m.dy = this.pos.y - y0; m.dz = this.pos.z - z0;
      m.vx = m.dx / dt; m.vy = m.dy / dt; m.vz = m.dz / dt;
      this.syncShape();
    }
  }

  riders() {
    let n = 0;
    for (const p of this.level.players ?? [this.level.player]) if (p && this.riding(p)) n++;
    return n;
  }

  startFall(defeated) {
    if (defeated) this.markDefeated();
    this.setState('fall');
    this.touch = false;
    this.removeShapes();
    this.shapeId = null;
    const dx = Math.cos(this.yaw), dz = -Math.sin(this.yaw);
    this.vel.set(dx * this.speed * 0.5, 1, dz * this.speed * 0.5);
    this.level.sfx('powerdown');
  }

  fallStep(dt) {
    this.vel.y = Math.max(this.vel.y - 22 * dt, -16);
    this.pitch = Math.min(0.9, this.pitch + dt * 1.2);
    this.pos.x += this.vel.x * dt; this.pos.y += this.vel.y * dt; this.pos.z += this.vel.z * dt;
    const hit = this.level.world.raycastDown(this.pos.x, this.pos.y + 0.6, this.pos.z, 0.7);
    if ((hit && this.vel.y < 0) || this.stateT > 3.5 || this.pos.y < this.level.killY) this.pop(true);
  }

  pop(fx) {
    if (this.removed) return;
    if (fx) {
      const c = this.center();
      this.level.effects?.sparks(c, 18);
      this.level.effects?.dust(this.pos, 12, 2);
      this.level.effects?.debris(c, 0x2a1838, 10);
      this.level.sfx('brickbreak');
      this.level.shake(0.35);
    }
    this.kill();
  }

  riding(p) { return this.ride && p.mode === 'ground' && p.ground?.owner === this; }

  onPlayer(player, contact) {
    if (this.defeated || this.state === 'fall') return 'none';
    if (this.riding(player)) {
      if (contact.pound || player.state === 'groundpound') { this.startFall(true); this.level.sfx('stomp'); }
      return 'none';
    }
    // über der Oberseite (landet gleich darauf) bzw. oben drauf, aber noch nicht als Boden erkannt
    if (player.pos.y >= this.pos.y + TOP - 0.35 && player.vel.y <= 0.5) {
      if (!this.ride) { this.startFall(true); return 'stomp'; }
      return 'none';
    }
    if (contact.pound && player.pos.y > this.pos.y + CY) { this.startFall(true); return 'none'; }
    return 'hurt';
  }

  /** Stampfattacke landet auf der Oberseite (Player.land ruft onPound der getroffenen Form). */
  onPound(player) {
    if (this.defeated || this.state === 'fall') return;
    this.startFall(true);
    this.level.sfx('stomp');
  }

  onCannon(ball) { this.onHit('cannon', ball); }

  onHit(kind, source) {
    if (this.defeated || this.state === 'fall') return;
    if (kind === 'cannon' || kind === 'bomb' || kind === 'mega' || kind === 'star') { this.level.effects?.sparks(this.center(), 10); this.startFall(true); }
  }

  modelState() {
    if (this.state === 'fall') return { anim: 'fall' };
    if (this.age < 0.4) return { anim: 'launch' };
    return { anim: 'fly' };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    if (this.state === 'fall') this.model.root.rotation.z = -this.pitch * 0.4;
  }

  info() { return { state: this.state, age: +this.age.toFixed(2), x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2), riders: this.riders(), defeated: this.defeated }; }
}

// =====================================================================================================================
// Riesenkanone
// =====================================================================================================================
const FIRE = 0.7;

class Riesenkanone extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'riesenkanone');
    this.touch = false;
    this.shadow = 0;
    this.wake = 0;
    this.height = spec.height ?? 2.6;
    this.half.set(1.3, this.height / 2, 1.3);
    this.interval = spec.interval ?? 5;
    this.cool = spec.first ?? 1.5;
    this.range = spec.range ?? 40;
    this.chargeT = spec.charge ?? 0.8;
    this.maxShots = spec.max ?? 2;
    this.hidden = !!spec.hidden;
    this.active = spec.active !== false;
    this.shots = 0;
    this.bullets = [];
    this.state = 'idle';
    let model = null;
    if (level.view && !this.hidden) {
      model = this.setModel(getModel('kanone_turm', { height: 1.3, sides: 1 }));
      model.root.scale.setScalar(2);
      const p = this.pos;
      this.addShape({ type: 'box', min: [p.x - 1.2, p.y, p.z - 1.2], max: [p.x + 1.2, p.y + 2.6, p.z + 1.2], tag: 'riesenkanone' });
    }
    // Mündung (Modell ×2), sonst Abschusspunkt vor dem Fuß
    const m = localOffset('riesenkanone', model, { anim: 'idle', aim: 0 }, model?.muzzle ? (o) => model.muzzle(o, 0) : null, { x: 0.78, y: 0.73, z: 0 });
    this.muzzle = this.hidden ? { x: 0, y: this.height, z: 0 } : { x: m.x * 2, y: Math.max(this.height, m.y * 2), z: m.z * 2 };
  }

  setActive(b) {
    if (b && !this.active) this.cool = this.spec.first ?? 1.5;
    this.active = !!b;
    if (!b) this.setState('idle');
  }

  update(dt) {
    this.stateT += dt;
    if (this.defeated) return;
    this.bullets = this.bullets.filter((b) => !b.removed && b.state !== 'fall');
    const p = this.player;
    const inRange = activeFigure(p) && Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) <= this.range;
    switch (this.state) {
      case 'idle':
        if (this.cool > 0 && this.active) this.cool -= dt;
        if (this.active && this.cool <= 0 && inRange && this.bullets.length < this.maxShots) { this.setState('charge'); this.level.sfx('fuse'); }
        break;
      case 'charge':
        if (this.stateT >= this.chargeT) { this.fire(); this.setState('fire'); }
        break;
      case 'fire':
        if (this.stateT >= FIRE) { this.setState('idle'); this.cool = Math.max(0, this.interval - this.chargeT - FIRE); }
        break;
      default: break;
    }
  }

  muzzlePos(out = {}) {
    toWorld(this.pos, this.yaw, this.muzzle.x, this.muzzle.y, this.muzzle.z, out);
    out.dx = Math.cos(this.yaw); out.dz = -Math.sin(this.yaw);
    return out;
  }

  fire() {
    const m = this.muzzlePos();
    const spec = { pos: [m.x + m.dx * 2.4, m.y - CY, m.z + m.dz * 2.4], dir: [m.dx, m.dz], owner: this };
    for (const k of ['speed', 'life', 'ride']) if (this.spec[k] !== undefined) spec[k] = this.spec[k];
    const b = this.level.spawn('riesenprojektil', spec);
    if (b) this.bullets.push(b);
    this.shots++;
    this.level.sfx('cannon');
    this.level.shake(0.25);
    this.level.effects?.dust({ x: m.x, y: m.y - 0.6, z: m.z }, 8, 1.6);
  }

  onCannon(ball) { this.onHit('cannon', ball); }

  onHit(kind) {
    if (this.defeated || this.hidden) return;
    if (kind === 'cannon' || kind === 'bomb' || kind === 'mega') {
      this.setState('broken');
      this.removeShapes();
      this.level.effects?.debris(this.center(), 0x8a1a2a, 18);
      this.level.sfx('brickbreak');
      this.markDefeated();
      this.kill();
    }
  }

  onPlayer() { return 'none'; }

  modelState() {
    const s = this.state;
    if (s === 'charge') return { anim: 'charge', aim: 0, progress: Math.min(1, this.stateT / this.chargeT) };
    if (s === 'fire') return { anim: 'fire', aim: 0, progress: Math.min(1, this.stateT / FIRE) };
    return { anim: 'idle', aim: 0 };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    this.model.root.scale.setScalar(2);
  }

  info() { return { state: this.state, shots: this.shots, bullets: this.bullets.length, defeated: this.defeated }; }
}

export const KINDS = {
  riesenprojektil: (level, spec) => new Riesenprojektil(level, spec),
  riesenkanone: (level, spec) => new Riesenkanone(level, spec),
};
