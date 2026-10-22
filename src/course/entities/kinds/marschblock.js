// Marschblock (Bauplan Welt 2: „marschiert in Kolonne, Musik“, Konter: springen).
//
// Singende Spielklötze marschieren als Kolonne im Gleichschritt eine Bahn ab (count Blöcke im Abstand spacing m
// hintereinander, pendelnd oder als Schleife). Der Takt (beat, bpm) ist für alle Marschblöcke des Levels gleich;
// die Kolonne setzt die Schritte im Takt (Tempo pulsiert mit dem Schritt). Draufspringen besiegt einen Block (platt);
// seitlich = Treffer. Gefahr → Panik: wird ein Block der Kolonne besiegt oder kommt eine unverwundbare Figur
// (Funkelstern/Riesentrank) näher als 4 m, rennen die übrigen panic s (2,5) kopflos von der Gefahr weg (3,5 m/s,
// drehen an Kanten/Wänden), dann laufen sie zu ihrem Platz in der Kolonne zurück und marschieren weiter.
// Alle Marschblöcke eines Levels teilen sich Instanz-Gruppen (createInstanced('marschblock'), 5 Zeichenaufrufe).
//
// Daten: { kind: 'marschblock', path: [[x,y,z], …] (Bahn am Boden; y = Suchhöhe), loop?: (Standard: true ab
//          3 Punkten), count?: 4, spacing?: 1.3 m, speed?: 1.5 m/s, phase?: 0..1 (Lage der Spitze auf der Bahn),
//          colors?: ['red','blue','yellow','green'] (reihum; auch 'orange','purple' oder Hex), bpm?: 120,
//          panic?: 2.5 s, id?, drop? }
//   Ohne path: kurze Pendelbahn 6 m in dir ab pos.
//   Beispiel: { kind: 'marschblock', path: [[-6, 1, -40], [6, 1, -40], [6, 1, -46], [-6, 1, -46]], count: 6 }
// Zustände: march → panic → return → march; squashed | flipped. Laufzeit: group (gemeinsame Kolonne: s, members,
//   beat), slotIndex. Modell (Instanz) 'marschblock' (state march|idle|panic|squashed).

import { EnemyW2, sharedSlot, STRONG, figures } from '../EnemyW2.js';
import { PathMover } from '../../level/PathMover.js';

const TAU = Math.PI * 2;

/** Gemeinsamer Zustand einer Kolonne (eine Bahn, ein Weg-Zähler s). */
class Column {
  constructor(level, spec) {
    this.level = level;
    let pts = spec.path;
    if (!pts || pts.length < 2) {
      const p = spec.pos ?? [0, 0, 0];
      const d = Array.isArray(spec.dir) ? spec.dir : [1, 0];
      const l = Math.hypot(d[0], d[1]) || 1;
      pts = [p, [p[0] + (d[0] / l) * 6, p[1], p[2] + (d[1] / l) * 6]];
    }
    const loop = spec.loop ?? pts.length >= 3;
    this.mover = new PathMover(pts, { speed: 0, mode: loop ? 'loop' : 'pingpong', wait: 0, phase: 0 });
    this.loop = loop;
    this.L = this.mover.length || 1;
    this.speed = spec.speed ?? 1.5;
    this.spacing = spec.spacing ?? 1.3;
    this.bpm = spec.bpm ?? 120;
    this.panicTime = spec.panic ?? 2.5;
    this.s = (spec.phase ?? 0) * this.L;
    this.dir = 1;
    this.members = [];
    this.lastT = -1;
    this._p = { x: 0, y: 0, z: 0 };
  }

  /** Takt 0..1 (für alle Kolonnen des Levels gleich). */
  beat() { return ((this.level.time * this.bpm) / 60) % 1; }

  /** Weg einmal je Schritt fortschreiben (vom ersten Mitglied, das update() ruft). */
  advance(dt) {
    if (this.lastT === this.level.time) return;
    this.lastT = this.level.time;
    // Schritt im Takt: Tempo pulsiert (zwei Schritte je Schlag)
    const b = this.beat();
    const v = this.speed * (1 + 0.55 * Math.cos(b * TAU * 2));
    if (this.loop) this.s = (this.s + v * dt) % this.L;
    else {
      this.s += v * dt * this.dir;
      const span = this.L;
      if (this.s >= span) { this.s = span; this.dir = -1; } else if (this.s <= 0) { this.s = 0; this.dir = 1; }
    }
  }

  /** Platz i in der Kolonne (Bahnpunkt, Laufrichtung). */
  slot(i, out) {
    let s = this.s - i * this.spacing * (this.loop ? 1 : this.dir);
    let dirSign = this.dir;
    if (this.loop) s = ((s % this.L) + this.L) % this.L;
    else {
      // Pendelbahn: hinter der Spitze ggf. um das Ende herum gespiegelt
      if (s < 0) { s = -s; dirSign = -dirSign; }
      if (s > this.L) { s = 2 * this.L - s; dirSign = -dirSign; }
    }
    const p = this.mover.at(s, out);
    const q = this.mover.at(Math.min(this.L, Math.max(0, s + 0.05 * (this.loop ? 1 : dirSign))), this._p);
    let dx = q.x - p.x, dz = q.z - p.z;
    if (this.loop && s + 0.05 > this.L) { const r = this.mover.at(0.05, this._p); dx = r.x - p.x; dz = r.z - p.z; }
    const l = Math.hypot(dx, dz) || 1;
    out.dx = dx / l; out.dz = dz / l;
    return out;
  }

  alarm(from) {
    for (const m of this.members) if (m !== from && !m.defeated && m.state !== 'panic') m.panic(from?.pos ?? m.pos);
  }
}

class Marschblock extends EnemyW2 {
  constructor(level, spec, column, index) {
    super(level, spec, 'marschblock');
    this.half.set(0.34, 0.5, 0.34);
    this.shadow = 0.42;
    this.wake = 0;
    this.column = column;
    this.slotIndex = index;
    this.state = 'march';
    this.panicT = 0;
    this.color = (spec.colors ?? ['red', 'blue', 'yellow', 'green'])[index % (spec.colors?.length ?? 4)];
    this._s = { x: 0, y: 0, z: 0, dx: 1, dz: 0 };
    column.members.push(this);
    this.placeOnSlot(true);
    this.slot = sharedSlot(level, 'marschblock', {});
    this.slot?.color(this.color);
    this.slot?.set(this.pos, this.yaw, 1, 'march');
  }

  /** Auf den Kolonnenplatz setzen (Boden per Strahl). */
  placeOnSlot(snap) {
    const s = this.column.slot(this.slotIndex, this._s);
    const hit = this.level.world.raycastDown(s.x, s.y + 1.2, s.z, 4);
    this.pos.x = s.x; this.pos.z = s.z;
    if (hit && !hit.shape.kill) { this.pos.y = hit.y; this.grounded = true; } else if (snap) this.pos.y = s.y;
    this.dir.x = s.dx; this.dir.z = s.dz;
    this.yaw = Math.atan2(-s.dz, s.dx);
  }

  update(dt) {
    this.stateT += dt;
    if (this.updateDefeat(dt)) return;
    this.column.advance(dt);
    // Gefahr: unverwundbare Figur in der Nähe → Panik
    if (this.state === 'march' || this.state === 'return') {
      for (const p of figures(this.level)) {
        if (p.dead || !p.powerDef?.invulnerable) continue;
        if (Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < 4 && Math.abs(p.pos.y - this.pos.y) < 2.5) { this.panic(p.pos); this.column.alarm(this); break; }
      }
    }
    switch (this.state) {
      case 'march':
        this.placeOnSlot(false);
        break;
      case 'panic':
        this.walk(dt, 3.5);
        if (this.stateT >= this.panicT) this.setState('return');
        break;
      case 'return': {
        const s = this.column.slot(this.slotIndex, this._s);
        const dx = s.x - this.pos.x, dz = s.z - this.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.3 || this.stateT > 8) { this.setState('march'); this.placeOnSlot(false); break; }
        this.dir.x = dx / d; this.dir.z = dz / d;
        const sp = Math.min(3, d / dt);
        this.vel.x = this.dir.x * sp; this.vel.z = this.dir.z * sp;
        this.moveWithGravity(dt);
        this.faceToward(this.dir.x, this.dir.z, dt, 12);
        break;
      }
      default: break;
    }
  }

  /** Kopflos weg von der Gefahr. */
  panic(from) {
    if (this.defeated) return;
    let dx = this.pos.x - from.x, dz = this.pos.z - from.z;
    const l = Math.hypot(dx, dz);
    const a = this.level.rnd.real(-0.6, 0.6);
    if (l < 1e-3) { dx = Math.cos(a * 5); dz = Math.sin(a * 5); } else { dx /= l; dz /= l; }
    const c = Math.cos(a), s = Math.sin(a);
    this.dir.x = dx * c - dz * s; this.dir.z = dx * s + dz * c;
    this.panicT = this.column.panicTime * (0.85 + this.level.rnd.frac() * 0.3);
    this.path = null;
    this.setState('panic');
    this.level.sfx('panic');
  }

  markDefeated() {
    const was = this.defeated;
    super.markDefeated();
    if (!was) this.column.alarm(this);
  }

  onHit(kind, source) {
    if (this.defeated) return;
    if (STRONG.has(kind)) { this.flip(source); return; }
    super.onHit(kind, source);
  }

  modelState() {
    const s = this.state;
    if (s === 'squashed') return 'squashed';
    if (s === 'panic' || s === 'flipped') return { anim: 'panic', speed: 3.5 };
    if (s === 'return') return { anim: 'march', speed: 3 };
    return { anim: 'march', speed: this.column.speed, beat: this.column.beat() };
  }

  render() {
    if (!this.slot || this.removed) return;
    const st = this.modelState();
    this.slot.set(this.pos, this.yaw, 1, st);
  }

  dispose() {
    this.slot?.release();
    this.slot = null;
    const m = this.column.members, i = m.indexOf(this);
    if (i >= 0) m.splice(i, 1);
    super.dispose();
  }

  info() { return { state: this.state, x: +this.pos.x.toFixed(2), z: +this.pos.z.toFixed(2), defeated: this.defeated }; }
}

/** Kolonne: count Blöcke auf einer Bahn (der erste ist die Rückgabe, die übrigen über level.spawn mit _column). */
function make(level, spec) {
  if (spec._column) return new Marschblock(level, spec, spec._column, spec._index);
  const column = new Column(level, spec);
  const n = Math.max(1, Math.round(spec.count ?? 4));
  // Pendelbahn: Spitze so weit vorn, dass alle Plätze auf der Bahn liegen
  if (!column.loop) column.s = Math.min(column.L, Math.max(column.s, (n - 1) * column.spacing));
  const first = new Marschblock(level, spec, column, 0);
  for (let i = 1; i < n; i++) level.spawn('marschblock', { ...spec, id: spec.id ? `${spec.id}_${i}` : undefined, _column: column, _index: i });
  return first;
}

export const KINDS = { marschblock: make };
