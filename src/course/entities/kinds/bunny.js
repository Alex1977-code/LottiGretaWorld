// Fang-Hase (Sonder-Baustein, Bauplan 1-1 Teich und Hügel): hoppelt umher, flieht vor der Figur, schlägt Haken
// (plötzliche Richtungswechsel), bleibt in seinem Bereich und macht nach einer Weile eine kurze Verschnaufpause.
// Fangen = berühren (auch draufspringen, Tatzenhieb, Stampfen) → Belohnung erscheint an seiner Stelle.
// Großer Hase (size 'big') ist langsamer und trägt einen Riesentrank.
//
//   { kind: 'bunny', pos: [x, y, z], size: 'small' | 'big',
//     area: { pos: [x, y, z], r } | { min: [x, z], max: [x, z] } (Standard: Kreis r 7 um pos),
//     speed: small 5,2 / big 4 (m/s auf der Flucht), alert: 6,5 (m, ab hier flieht er),
//     star: Index (Belohnung grüner Stern) | reward: Aktion (entities/gimmick.js; Standard small → 1-Up,
//     big → Riesentrank), id?, hidden? }
//   Beispiele: { kind: 'bunny', pos: [8, 0, -70], star: 1, area: { pos: [8, 0, -70], r: 6 } }
//              { kind: 'bunny', size: 'big', pos: [-6, 5, -64] }
// Kein Gegner (enemy = false): Funkelstern/Riesentrank besiegen ihn nicht, Berührung fängt ihn.
// Modell 'bunny_small' (state idle/hop/caught), für big × 2,2.

import { Gimmick, runAction } from '../gimmick.js';
import { getModel } from '../../models/index.js';
import { Rnd } from '../../../three/world/geometry.js';

const TAU = Math.PI * 2;

class Bunny extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'bunny');
    this.big = spec.size === 'big';
    this.baseScale = this.big ? 2.2 : 1;
    this.half.set(this.big ? 0.62 : 0.3, this.big ? 0.62 : 0.28, this.big ? 0.62 : 0.3);
    this.shadow = this.big ? 0.75 : 0.35;
    this.speed = spec.speed ?? (this.big ? 4 : 5.2);
    this.alert = spec.alert ?? 6.5;
    const a = spec.area ?? {};
    if (a.min && a.max) this.area = { rect: true, x0: Math.min(a.min[0], a.max[0]), x1: Math.max(a.min[0], a.max[0]), z0: Math.min(a.min[a.min.length - 1], a.max[a.max.length - 1]), z1: Math.max(a.min[a.min.length - 1], a.max[a.max.length - 1]) };
    else { const c = a.pos ?? spec.pos ?? [0, 0, 0]; this.area = { rect: false, cx: c[0], cz: c[2], r: a.r ?? 7 }; }
    this.reward = spec.reward ?? (spec.star !== undefined ? { star: spec.star } : { power: this.big ? 'riese' : 'oneup' });
    this.rnd = new Rnd(Math.floor(this.pos.x * 97 + this.pos.z * 31 + 7) >>> 0);
    this.state = 'idle';
    this.stateT = 0;
    this.flightT = 0;
    this.hookT = 0;
    this.hook = 0;
    this.dir = { x: 1, z: 0 };
    this.yaw = this.rnd.real(0, TAU);
    this.lookT = 0;
    if (level.view) this.setModel(getModel('bunny_small'));
  }

  setState(s) { if (s !== this.state) { this.state = s; this.stateT = 0; } }

  inside(x, z, margin = 0) {
    const A = this.area;
    if (A.rect) return x > A.x0 + margin && x < A.x1 - margin && z > A.z0 + margin && z < A.z1 - margin;
    return Math.hypot(x - A.cx, z - A.cz) < A.r - margin;
  }

  center2() { const A = this.area; return A.rect ? { x: (A.x0 + A.x1) / 2, z: (A.z0 + A.z1) / 2 } : { x: A.cx, z: A.cz }; }

  update(dt) {
    this.stateT += dt;
    if (this.state === 'caught') { this.vel.set(0, 0, 0); if (this.stateT > 0.8) this.kill(); return; }
    const p = this.level.player;
    const pdx = this.pos.x - (p?.pos.x ?? 1e9), pdz = this.pos.z - (p?.pos.z ?? 1e9);
    const pd = Math.hypot(pdx, pdz);
    const near = p && !p.dead && pd < this.alert && Math.abs(p.pos.y - this.pos.y) < 4;
    let speed = 0;
    switch (this.state) {
      case 'idle': {
        // gelegentlich ein Hüpfer auf der Stelle / Umschauen
        this.lookT -= dt;
        if (this.lookT <= 0) { this.lookT = this.rnd.real(0.8, 1.8); this.yaw += this.rnd.real(-1.2, 1.2); }
        if (near) { this.setState('flee'); this.flightT = 0; this.hookT = 0; }
        break;
      }
      case 'flee': {
        this.flightT += dt;
        this.hookT -= dt;
        if (this.hookT <= 0) {
          // Haken schlagen: Fluchtwinkel ändern
          this.hookT = this.rnd.real(0.7, 1.3);
          this.hook = this.rnd.real(0.45, 1.15) * (this.rnd.chance(0.5) ? 1 : -1);
        }
        // weg von der Figur, um den Hakenwinkel gedreht
        const l = pd || 1;
        let ax = pdx / l, az = pdz / l;
        const c = Math.cos(this.hook), s = Math.sin(this.hook);
        let dx = ax * c - az * s, dz = ax * s + az * c;
        // Rand des Bereichs oder Kante voraus → am Rand entlang zurück zur Mitte
        const look = 1.6;
        if (!this.inside(this.pos.x + dx * look, this.pos.z + dz * look, 0.3) || (this.grounded && !this.groundAhead(dx, dz, 0.5, 1.3))) {
          const m = this.center2();
          let cx = m.x - this.pos.x, cz = m.z - this.pos.z;
          const cl = Math.hypot(cx, cz) || 1; cx /= cl; cz /= cl;
          // seitlich zur Figur ausweichen (die Seite, die weiter von ihr weg führt)
          const t1 = { x: -cz, z: cx }, t2 = { x: cz, z: -cx };
          const t = (t1.x * ax + t1.z * az) > (t2.x * ax + t2.z * az) ? t1 : t2;
          dx = cx * 0.6 + t.x * 0.8; dz = cz * 0.6 + t.z * 0.8;
          const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
          this.hook = -this.hook;
        }
        this.dir.x = dx; this.dir.z = dz;
        speed = this.speed;
        if (this.flightT > 3.2) this.setState('rest');
        else if (!near && this.stateT > 1.2) this.setState('idle');
        break;
      }
      case 'rest':
        if (this.stateT > 0.75) { this.setState(near ? 'flee' : 'idle'); this.flightT = 0; }
        break;
      default: break;
    }
    this.vel.x = this.dir.x * speed;
    this.vel.z = this.dir.z * speed;
    if (this.state !== 'flee') { this.vel.x = 0; this.vel.z = 0; }
    const res = this.moveWithGravity(dt);
    if (res.hitWall && this.state === 'flee') { this.hook += Math.PI * 0.6; this.hookT = 0.5; }
    if (speed > 0) {
      const want = Math.atan2(-this.dir.z, this.dir.x);
      let d = want - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * Math.min(1, dt * 14);
    }
  }

  onPlayer() { this.catchMe(); return 'collect'; }
  onHit(kind) { if (kind === 'claw' || kind === 'pound' || kind === 'mega' || kind === 'star') this.catchMe(); }

  catchMe() {
    if (this.state === 'caught' || this.hidden) return;
    this.setState('caught');
    this.touch = false;
    this.level.sfx('key');
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 0.5, z: this.pos.z }, 16);
    runAction(this.level, this.reward, { pos: [this.pos.x, this.pos.y + 0.1, this.pos.z], source: this });
  }

  modelState() { return { anim: this.state === 'caught' ? 'caught' : this.state === 'flee' ? 'hop' : 'idle' }; }
}

export const KINDS = { bunny: (level, spec) => new Bunny(level, spec) };
