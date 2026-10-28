// Wuschel-Horde – Gefahr Welt 6 (Bauplan 6-7 „Fuzzy Time Mine: vertikaler Schacht, Autoscroll – Wuschel-Horde jagt von
// unten“). Ein wimmelnder Schwarm aus Wuscheln (Modell 'wuschel_horde': EIN InstancedMesh je Schicht), dessen **Front** nach
// einem Zeitplan entlang einer Achse nachrückt – im senkrechten Autoscroller von unten nach oben. **Berührung verletzt**
// (Rückstoß von der Horde weg: senkrecht nach oben bzw. in Jagdrichtung), unverwundbar (Funkelstern/Riesentrank schützen nur
// die Figur). Sie ist keine Entität mit eigener Kollision (touch false), sondern prüft selbst: eine Figur, deren Füße
// (senkrecht) bzw. Mitte (waagerecht) hinter der Front liegen – höchstens depth m tief – und die quer innerhalb der Fläche
// size steht, wird getroffen.
//
// Front (Lage auf der Achse, Koordinate wie die Achse sie zählt: bei 'y' die Höhe, bei '-z' die z-Koordinate):
//   follow: 'scroll'  folgt dem Bildfenster des Autoscrollers (level.scroll): behind m hinter dessen Mitte (Standard 7)
//   schedule: [[t, Lage], …]   Zeitplan (s seit Jagdbeginn → Lage, dazwischen linear; danach steht sie)
//   sonst speed m/s (speeds: [{ at: s, speed }] ab at s seit Jagdbeginn), höchstens bis end
//   Jagdbeginn: delay s nach Levelstart bzw. nachdem die Figur trigger betreten hat.
// Neustart nach Tod (umhüllt runtime.respawn): die Front springt auf gap m hinter den Neustart-Punkt zurück (nie vor ihren
//   Start), Zeitplan/Tempo laufen von dort weiter; mit follow 'scroll' übernimmt das Bildfenster.
//
// Daten: { kind: 'wuschel_horde', id?, pos: [x, y, z] (Mitte der Front beim Start; bei waagerechter Jagd y = Unterkante),
//          axis?: 'y' (Standard) | '-z' | 'z' | 'x' | '-x', follow?: 'scroll', behind?: 7, schedule?, speed?: 1.5, speeds?,
//          delay?: 0, trigger?: { min, max }, end?, size?: [Breite, Tiefe] quer zur Achse (senkrecht: [x, z], Standard [8, 8];
//          waagerecht: [Breite, Höhe], Standard [8, 3]), depth?: 12 (m hinter der Front, die verletzen), gap?: 6,
//          count?: 48 (sichtbare Wuschel, je Schicht ≤ 64), layers?: 2 (senkrecht) | 1 }
//   Beispiel (6-7): { kind: 'wuschel_horde', id: 'horde', pos: [0, -6, -20], axis: 'y', follow: 'scroll', behind: 6.5,
//                     size: [10, 10] }
// Laufzeit: state ('wait' | 'run' | 'done'), front (Lage), clock (s seit Jagdbeginn), hits (Treffer auf Figuren), info().
// Sound: 'panic' (Jagdbeginn).

import * as THREE from 'three';
import { CourseEntity } from '../CourseEntity.js';
import { figures, activeFigure, clamp } from '../EnemyW2.js';
import { getModel } from '../../models/index.js';

const AXES = { y: [0, 1, 0], '-y': [0, -1, 0], z: [0, 0, 1], '-z': [0, 0, -1], x: [1, 0, 0], '-x': [-1, 0, 0] };
const inBox = (p, b) => p.x >= b.min[0] && p.x <= b.max[0] && p.y >= b.min[1] && p.y <= b.max[1] && p.z >= b.min[2] && p.z <= b.max[2];

class WuschelHorde extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'wuschel_horde');
    this.touch = false;
    this.shadow = 0;
    this.axisName = AXES[spec.axis] ? spec.axis : 'y';
    const a = AXES[this.axisName];
    this.A = { x: a[0], y: a[1], z: a[2] };
    this.vertical = this.A.y !== 0;
    this.sign = a[0] + a[1] + a[2];                         // ±1: Lage = Koordinate · sign
    this.origin = this.pos.clone();
    this.start = this.along(this.origin);
    this.front = this.start;
    this.size = spec.size ?? (this.vertical ? [8, 8] : [8, 3]);
    this.depth = spec.depth ?? 12;
    this.gap = spec.gap ?? 6;
    this.behind = spec.behind ?? 7;
    this.speed = spec.speed ?? 1.5;
    this.delay = spec.delay ?? 0;
    this.endAlong = spec.end !== undefined ? spec.end * this.sign : Infinity;
    this.sched = Array.isArray(spec.schedule) && spec.schedule.length ? spec.schedule.map(([t, c]) => [t, c * this.sign]).sort((p, q) => p[0] - q[0]) : null;
    this.state = spec.trigger ? 'wait' : 'delay';
    this.waitT = 0;
    this.clock = 0;
    this.base = this.start;                                 // Lage beim Jagdbeginn bzw. nach Neustart (Tempo-Modus)
    this.baseClock = 0;
    this.hits = 0;
    this.resets = 0;
    // Darstellung: Schichten hinter der Front
    this.layers = [];
    if (level.view) {
      const n = Math.max(1, Math.round(spec.layers ?? (this.vertical ? 2 : 1)));
      const total = clamp(Math.round(spec.count ?? 48), 1, 64 * n);
      for (let i = 0; i < n; i++) {
        const cnt = Math.min(64, Math.ceil(total / n));
        const m = this.vertical
          ? getModel('wuschel_horde', { count: cnt, depth: this.size[0], width: this.size[1], height: 1.3 })
          : getModel('wuschel_horde', { count: cnt, depth: 2.6, width: this.size[0], height: Math.max(0.6, this.size[1] - 1) });
        level.view.add(m.root);
        this.layers.push(m);
      }
    }
    // Neustart: Front zurück hinter den Neustart-Punkt
    const rt = level.runtime;
    if (rt?.respawn) {
      const orig = rt.respawn.bind(rt);
      rt.respawn = () => { orig(); this.onRespawn(); };
    }
    this.place();
  }

  /** Lage eines Punkts auf der Achse. */
  along(p) { return p.x * this.A.x + p.y * this.A.y + p.z * this.A.z; }

  /** Mitte der Front als Punkt (für Darstellung und pos). */
  place() {
    const d = this.front - this.along(this.origin);
    this.pos.set(this.origin.x + this.A.x * d, this.origin.y + this.A.y * d, this.origin.z + this.A.z * d);
  }

  /** Front nach Zeitplan zur Jagd-Uhr t. */
  schedAt(t) {
    const s = this.sched;
    if (t <= s[0][0]) return s[0][1];
    for (let i = 1; i < s.length; i++) {
      if (t <= s[i][0]) { const [t0, a] = s[i - 1], [t1, b] = s[i]; return a + (b - a) * ((t - t0) / Math.max(1e-6, t1 - t0)); }
    }
    return s[s.length - 1][1];
  }

  speedAt(t) {
    let sp = this.speed;
    for (const e of this.spec.speeds ?? []) if (t >= (e.at ?? 0)) sp = e.speed;
    return sp;
  }

  update(dt) {
    const p0 = this.level.player;
    if (this.state === 'wait') {
      if (p0 && !p0.dead && inBox(p0.pos, this.spec.trigger)) this.state = 'delay';
      else { this.place(); return; }
    }
    if (this.state === 'delay') {
      this.waitT += dt;
      if (this.waitT < this.delay && this.spec.follow !== 'scroll') { this.place(); return; }
      this.state = 'run';
      this.level.sfx('panic');
    }
    // Front bewegen
    if (this.spec.follow === 'scroll' && this.level.scroll?.center) {
      this.front = Math.max(this.start, this.along(this.level.scroll.center) - this.behind);
    } else if (this.state === 'run') {
      this.clock += dt;
      if (this.sched) this.front = Math.max(this.front, this.schedAt(this.clock));
      else this.front += this.speedAt(this.clock) * dt;
    }
    if (this.front >= this.endAlong) { this.front = this.endAlong; if (this.state === 'run' && this.spec.follow !== 'scroll') this.state = 'done'; }
    this.place();
    this.bite();
  }

  /** Figuren hinter der Front (in der Fläche) verletzen. */
  bite() {
    const [w, d] = this.size;
    for (const f of figures(this.level)) {
      if (!activeFigure(f)) continue;
      // quer zur Achse in der Fläche?
      if (this.vertical) {
        if (Math.abs(f.pos.x - this.origin.x) > w / 2 + f.half.x || Math.abs(f.pos.z - this.origin.z) > d / 2 + f.half.z) continue;
      } else {
        const across = this.A.x !== 0 ? f.pos.z - this.origin.z : f.pos.x - this.origin.x;
        if (Math.abs(across) > w / 2 + f.half.x || f.pos.y > this.origin.y + d || f.pos.y + f.half.y * 2 < this.origin.y - 0.5) continue;
      }
      const a = this.vertical ? this.along(f.pos) * 1 : this.along(f.center());
      const lim = this.vertical ? this.front : this.front + f.half.x;
      if (a > lim || a < this.front - this.depth) continue;
      const src = this.vertical
        ? { pos: { x: f.pos.x, y: f.pos.y - 1, z: f.pos.z } }
        : { pos: { x: f.pos.x - this.A.x * 1.5, y: f.pos.y, z: f.pos.z - this.A.z * 1.5 } };
      if (f.hurt(src)) {
        this.hits++;
        if (this.vertical && !f.dead && f.mode === 'air') f.vel.y = Math.max(f.vel.y, 9);   // aus der Horde heraus
      }
    }
  }

  onRespawn() {
    this.resets++;
    if (this.spec.follow === 'scroll') return;
    const r = this.level.runtime.respawnPoint();
    const at = this.along({ x: r.pos[0], y: r.pos[1], z: r.pos[2] }) - this.gap;
    this.front = Math.max(this.start, Math.min(this.front, at));
    if (this.sched) {
      // Uhr auf den Zeitpunkt, zu dem der Zeitplan diese Lage erreicht
      let t = 0;
      const tEnd = this.sched[this.sched.length - 1][0];
      while (t < tEnd && this.schedAt(t) < this.front) t += 0.05;
      this.clock = t;
    }
    if (this.state === 'done') this.state = 'run';
    this.place();
  }

  render(dt) {
    const L = this.layers;
    if (!L.length) return;
    const chase = this.state === 'run';
    for (let i = 0; i < L.length; i++) {
      const r = L[i].root;
      if (this.vertical) {
        r.position.set(this.origin.x, this.front * this.sign - this.sign * (1.35 + i * 1.5), this.origin.z);
        r.rotation.set(this.sign < 0 ? Math.PI : 0, 0, 0);
      } else {
        const back = 1.3 + i * 2.4;
        r.position.set(this.pos.x - this.A.x * back, this.origin.y, this.pos.z - this.A.z * back);
        r.rotation.set(0, Math.atan2(-this.A.z, this.A.x), 0);
      }
      L[i].update(dt, { anim: chase ? 'chase' : 'idle', speed: chase ? 3 : 0.6 });
    }
  }

  info() {
    return { state: this.state, front: +(this.front * this.sign).toFixed(2), clock: +this.clock.toFixed(2), hits: this.hits, resets: this.resets };
  }

  dispose() {
    for (const m of this.layers) { this.level.view?.remove(m.root); m.dispose?.(); }
    this.layers.length = 0;
    super.dispose();
  }
}

export const KINDS = { wuschel_horde: (level, spec) => new WuschelHorde(level, spec) };
