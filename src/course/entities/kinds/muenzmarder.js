// Münzmarder (Bauplan 2-2: „Münz-Dieb“ – flinker Marder mit Münzsack, flieht vor der Figur).
//
// Wartet am Anfang seiner Bahn (path) und schaut sich um. Kommt eine Figur näher als sight m, flitzt er los und
// flieht die Bahn entlang (speed m/s, Standard 7 – rennend holt die Heldin ihn ein, gehend nicht). Lücken in der
// Bahn (kein Boden unter dem Bahnpunkt) überspringt er im Bogen. Ist die Figur weit zurück (> lead m), wartet er
// frech (bleibt stehen, bis sie wieder auf sight m heran ist). Erreicht er das Bahnende, verschwindet er in einer
// Staubwolke (entkommen, nicht besiegt).
// Einholen: jede Berührung (auch von oben) oder jeder Angriff (Feuer, Krallen, Wurf, Panzer, Stampfen …) ist ein
// Treffer: er springt erschrocken hoch, verliert Münzen (coins / hp je Treffer, als Münzregen) und rast 1,2 s
// schneller weiter. Beim letzten Treffer (hp) kippt er um und der Rest der Münzen regnet heraus (besiegt).
// Er verletzt die Figur nie.
//
// Daten: { kind: 'muenzmarder', path: [[x,y,z], …] (Fluchtweg, y = Suchhöhe des Bodens), pos? (Standard path[0]),
//          speed?: 7, sight?: 7 m, lead?: 12 m, hp?: 2, coins?: 30 (insgesamt), drop? (zusätzlich beim Sieg), id? }
//   Beispiel: { kind: 'muenzmarder', path: [[0, 1, -60], [0, 1, -80], [8, 1, -86], [8, 1, -110]], coins: 30 }
// Zustände: wait → run ⇄ tease (wartet) | jump (Lücke) | hit (0,7 s) → … → defeated (1 s) | escaped.
// Laufzeit: s (Bahnweg), hits, coinsLeft, escaped. Modell 'muenzmarder' (state { anim: idle|run|hit|defeated, speed }).
//
// muenze_flug: Münze des Münzregens – fliegt im Bogen heraus, hüpft aus und bleibt liegen (einsammelbar nach 0,25 s;
//   Instanz-Pool 'coin' wie normale Münzen). { kind: 'muenze_flug', pos, vel: [vx, vy, vz] }

import { CourseEntity } from '../CourseEntity.js';
import { EnemyW2, figures, activeFigure } from '../EnemyW2.js';
import { PathMover } from '../../level/PathMover.js';
import { coinTemplate } from '../visuals.js';
import { getModel } from '../../models/index.js';

class Muenzmarder extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'muenzmarder');
    this.half.set(0.42, 0.4, 0.42);
    this.shadow = 0.5;
    this.wake = 0;
    this.speed = spec.speed ?? 7;
    this.sight = spec.sight ?? 7;
    this.lead = spec.lead ?? 12;
    this.maxHp = spec.hp ?? 2;
    this.hp = this.maxHp;
    this.coinsLeft = spec.coins ?? 30;
    this.hits = 0;
    this.rained = 0;
    this.escaped = false;
    this.boost = 0;
    this.state = 'wait';
    const pts = spec.path?.length >= 2 ? spec.path : [spec.pos ?? [0, 0, 0], [(spec.pos ?? [0, 0, 0])[0], (spec.pos ?? [0, 0, 0])[1], (spec.pos ?? [0, 0, 0])[2] - 20]];
    this.mover = new PathMover(pts, { speed: 0, mode: 'pingpong', wait: 0 });
    this.L = this.mover.length;
    this.s = 0;
    this.jumpArc = null;
    this._p = { x: 0, y: 0, z: 0 };
    this._q = { x: 0, y: 0, z: 0 };
    this.placeAt(0, true);
    if (level.view) this.setModel(getModel('muenzmarder'));
    this.initShadows(2);
  }

  /** Bodenhöhe unter dem Bahnpunkt s (oder null über einer Lücke). */
  groundAt(s, out = this._p) {
    const p = this.mover.at(Math.max(0, Math.min(this.L, s)), out);
    const hit = this.level.world.raycastDown(p.x, p.y + 1.5, p.z, 4);
    return hit && !hit.shape.kill ? hit.y : null;
  }

  placeAt(s, snap) {
    const p = this.mover.at(s, this._p);
    const gy = this.groundAt(s, this._q);
    this.pos.x = p.x; this.pos.z = p.z;
    if (gy !== null) this.pos.y = gy; else if (snap) this.pos.y = p.y;
    const q = this.mover.at(Math.min(this.L, s + 0.2), this._q);
    if (Math.hypot(q.x - p.x, q.z - p.z) > 1e-4) { this.yaw = Math.atan2(-(q.z - p.z), q.x - p.x); this.dir.x = Math.cos(this.yaw); this.dir.z = -Math.sin(this.yaw); }
  }

  /** Abstand der nächsten Figur. */
  nearest() {
    let best = Infinity;
    for (const p of figures(this.level)) {
      if (!activeFigure(p)) continue;
      const d = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
      if (Math.abs(p.pos.y - this.pos.y) < 5) best = Math.min(best, d);
    }
    return best;
  }

  update(dt) {
    this.stateT += dt;
    if (this.boost > 0) this.boost -= dt;
    if (this.state === 'defeated') { if (this.stateT > 1.0) { this.level.effects?.sparks(this.center(), 12); this.kill(); } return; }
    if (this.state === 'escaped') return;
    const d = this.nearest();
    switch (this.state) {
      case 'wait':
        this.placeAt(this.s, false);
        if (d < this.sight) { this.setState('run'); this.level.sfx('panic'); }
        break;
      case 'tease':
        this.placeAt(this.s, false);
        if (d < this.sight) this.setState('run');
        break;
      case 'hit':
        this.advance(dt, this.speed * 0.4);
        if (this.stateT >= 0.7) this.setState('run');
        break;
      case 'run':
        if (d > this.lead) { this.setState('tease'); break; }
        this.advance(dt, this.speed * (this.boost > 0 ? 1.25 : 1));
        break;
      case 'jump':
        this.jumpStep(dt);
        break;
      default: break;
    }
  }

  /** Bahn entlang laufen; Lücke voraus → Sprung bis zum nächsten Boden. */
  advance(dt, v) {
    const s1 = this.s + v * dt;
    if (s1 >= this.L) { this.escape(); return; }
    if (this.groundAt(s1 + 0.4) === null && this.groundAt(this.s) !== null) {
      // Lücke: nächsten Boden suchen (bis 9 m voraus)
      let e = s1 + 0.4;
      while (e < Math.min(this.L, s1 + 9) && this.groundAt(e) === null) e += 0.25;
      const gy = this.groundAt(e);
      if (gy !== null) {
        const span = e + 0.3 - this.s;
        this.jumpArc = { s0: this.s, s1: Math.min(this.L, e + 0.3), y0: this.pos.y, y1: gy, T: Math.max(0.35, span / Math.max(v, 4)), h: 0.9 + span * 0.12 };
        this.setState('jump');
        this.level.sfx('hop');
        return;
      }
    }
    this.s = s1;
    this.placeAt(this.s, false);
  }

  jumpStep(dt) {
    const j = this.jumpArc;
    const k = Math.min(1, this.stateT / j.T);
    this.s = j.s0 + (j.s1 - j.s0) * k;
    this.placeAt(this.s, false);
    this.pos.y = j.y0 + (j.y1 - j.y0) * k + 4 * j.h * k * (1 - k);
    if (k >= 1) { this.pos.y = j.y1; this.setState('run'); this.level.effects?.dust(this.pos, 3, 0.7); }
  }

  escape() {
    this.s = this.L;
    this.escaped = true;
    this.touch = false;
    this.setState('escaped');
    this.level.effects?.dust(this.pos, 10, 1.4);
    this.level.effects?.sparks(this.center(), 6);
    this.level.sfx('swoop');
    this.kill();
  }

  /** Treffer: Münzregen, schneller weiter; beim letzten besiegt. */
  catchHit(source) {
    if (this.defeated || this.state === 'hit' || this.state === 'escaped' || this.state === 'defeated') return;
    if (this.state === 'jump') { this.s = this.jumpArc.s1; this.placeAt(this.s, false); this.pos.y = this.jumpArc.y1; }
    this.hits++;
    this.hp--;
    const n = this.hp <= 0 ? this.coinsLeft : Math.min(this.coinsLeft, Math.round((this.spec.coins ?? 30) / (this.maxHp + 1)));
    this.coinsLeft -= n;
    this.rain(n);
    this.level.sfx('coin');
    if (this.hp <= 0) {
      this.setState('defeated');
      this.touch = false;
      this.markDefeated();
      return;
    }
    this.setState('hit');
    this.boost = 1.9;
  }

  /** n Münzen fliegen im Kranz aus dem Sack (deterministisch) – nur dorthin, wo Boden ist (nicht in Gräben). */
  rain(n) {
    const w = this.level.world;
    for (let i = 0; i < n; i++) {
      let a = i * 2.39996 + this.hits;
      let r = 1.2 + (i % 3) * 0.9;
      const vy = 6.5 + (i % 4) * 0.8;
      const T = (2 * vy) / 30 + 0.05;               // Flugzeit bis zur Ausgangshöhe
      const ground = (aa, rr) => {
        const h = w.raycastDown(this.pos.x + Math.cos(aa) * rr, this.pos.y + 2, this.pos.z + Math.sin(aa) * rr, 4);
        return h && !h.shape.kill && Math.abs(h.y - this.pos.y) < 1.5;
      };
      if (!ground(a, r)) { if (ground(a + Math.PI, r)) a += Math.PI; else r = 0.4; }
      this.level.spawn('muenze_flug', { pos: [this.pos.x, this.pos.y + 0.6, this.pos.z], vel: [(Math.cos(a) * r) / T, vy, (Math.sin(a) * r) / T] });
      this.rained++;
    }
  }

  onPlayer(player) {
    if (this.defeated || this.escaped) return 'none';
    this.catchHit(player);
    return 'none';
  }

  onHit(kind, source) {
    if (this.defeated || this.escaped) return;
    if (kind === 'bump') return;
    this.catchHit(source);
  }

  modelState() {
    const s = this.state;
    if (s === 'run' || s === 'jump') return { anim: 'run', speed: this.speed };
    if (s === 'hit') return { anim: 'hit' };
    if (s === 'defeated') return { anim: 'defeated' };
    return { anim: 'idle' };
  }

  info() { return { state: this.state, s: +this.s.toFixed(2), L: +this.L.toFixed(2), hits: this.hits, hp: this.hp, coinsLeft: this.coinsLeft, rained: this.rained, escaped: this.escaped, defeated: this.defeated }; }
}

class FlugMuenze extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'muenze_flug');
    this.half.set(0.36, 0.4, 0.36);
    if (Array.isArray(spec.vel)) this.vel.set(spec.vel[0], spec.vel[1], spec.vel[2]);
    this.age = 0;
    this.resting = false;
    this.pool = level.view?.pool('coin', coinTemplate, { castShadow: false, capacity: 64 }) ?? null;
    this.idx = this.pool ? this.pool.alloc() : -1;
    this.spin = (this.pos.x * 1.3 + this.pos.z) % 6.28;
  }

  update(dt) {
    this.age += dt;
    if (this.resting) return;
    this.vel.y = Math.max(this.vel.y - 30 * dt, -18);
    const c = this.center();
    const res = this.level.world.moveAABB(c, this.half, { x: this.vel.x * dt, y: this.vel.y * dt, z: this.vel.z * dt }, { step: 0.2 });
    this.pos.set(c.x, c.y - this.half.y, c.z);
    if (res.hitWall) { this.vel.x *= -0.3; this.vel.z *= -0.3; }
    if (res.grounded && this.vel.y <= 0) {
      if (this.vel.y < -4) this.vel.y = -this.vel.y * 0.35;
      else { this.vel.set(0, 0, 0); this.resting = true; }
      this.vel.x *= 0.5; this.vel.z *= 0.5;
    }
    if (this.pos.y < this.level.killY) this.kill();
  }

  onPlayer() {
    if (this.age < 0.25) return 'none';
    this.collect();
    return 'collect';
  }

  onHit(kind) { if (this.age >= 0.25 && (kind === 'claw' || kind === 'mega' || kind === 'fire')) this.collect(); }

  collect() {
    if (!this.alive) return;
    this.level.addCoins(1);
    this.level.sfx('coin');
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 0.45, z: this.pos.z }, 4);
    this.kill();
  }

  render(dt, t) {
    if (this.idx < 0) return;
    this.pool.set(this.idx, this.pos.x, this.pos.y, this.pos.z, t * (this.resting ? 2.6 : 9) + this.spin);
  }

  dispose() {
    if (this.idx >= 0) this.pool.release(this.idx);
    this.idx = -1;
    super.dispose();
  }
}

export const KINDS = {
  muenzmarder: (level, spec) => new Muenzmarder(level, spec),
  muenze_flug: (level, spec) => new FlugMuenze(level, spec),
};
