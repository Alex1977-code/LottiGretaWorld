// Flatterkäfer-Rad (4-4 „Riesentrampolin-Fahrt, vorbei an Rädern aus Flatterkäfern“): count Flatterkäfer auf einem
// Kreis, der sich dreht. Die Glieder sind gewöhnliche Flatterkäfer (kaefer.js: Draufspringen besiegt – sie fallen
// herunter –, alle Angriffe, seitlich verletzen sie); das Rad bewegt sie nur. Besiegte Glieder bleiben weg (Lücke).
//
// Daten: { kind: 'flatterkaefer_rad', pos | center: [x, y, z] (Radmitte; y = Flughöhe der Mitte),
//          count?: 8, radius?: 3, speed?: 1.8 (m/s am Umfang; ω = speed / radius), cw?: false,
//          plane?: 'xy' (senkrecht, quer zur Standardkamera) | 'zy' (senkrecht, entlang z) | 'xz' (waagerecht),
//          phase?: 0 (Startwinkel in rad), color?: 'pink', id? }
// Glieder: level.named `${id}_${i}` (kind 'flatterkaefer'). Laufzeit: angle (rad), members, alive, info().

import { CourseEntity } from '../CourseEntity.js';

const TAU = Math.PI * 2;

class FlatterkaeferRad extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'flatterkaefer_rad');
    const c = spec.center ?? spec.pos ?? [0, 3, 0];
    this.cx = c[0]; this.cy = c[1]; this.cz = c[2];
    this.pos.set(c[0], c[1], c[2]);
    this.touch = false;
    this.shadow = 0;
    this.count = Math.max(1, Math.min(32, Math.round(spec.count ?? 8)));
    this.radius = spec.radius ?? 3;
    this.omega = (spec.speed ?? 1.8) / Math.max(0.3, this.radius) * (spec.cw ? -1 : 1);
    this.plane = spec.plane ?? 'xy';
    this.angle = spec.phase ?? 0;
    this.members = [];
    for (let i = 0; i < this.count; i++) {
      const m = level.spawn('flatterkaefer', { pos: [c[0], c[1], c[2]], color: spec.color ?? 'pink', id: spec.id ? `${spec.id}_${i}` : undefined, drop: spec.drop });
      if (!m) continue;
      m.bob = i * 0.9;          // deterministisches Wippen
      m.wheel = this;
      this.members.push(m);
    }
    this.place();
  }

  /** Lage des Glieds i beim aktuellen Winkel. */
  slot(i, out = {}) {
    const a = this.angle + (i / this.count) * TAU;
    const u = Math.cos(a) * this.radius, v = Math.sin(a) * this.radius;
    if (this.plane === 'xz') { out.x = this.cx + u; out.y = this.cy; out.z = this.cz - v; }
    else if (this.plane === 'zy') { out.x = this.cx; out.y = this.cy + v; out.z = this.cz + u; }
    else { out.x = this.cx + u; out.y = this.cy + v; out.z = this.cz; }
    return out;
  }

  place() {
    const o = {};
    for (let i = 0; i < this.members.length; i++) {
      const m = this.members[i];
      if (m.removed || m.defeated || m.state !== 'move') continue;
      this.slot(i, o);
      const bob = Math.sin(this.level.time * 3 + m.bob) * 0.12;
      if (m.home) m.home.set(o.x, o.y, o.z); else m.home = { x: o.x, y: o.y, z: o.z, set() {} };
      m.pos.set(o.x, o.y + bob, o.z);
    }
  }

  get aliveCount() { return this.members.filter((m) => !m.removed && !m.defeated).length; }

  update(dt) {
    this.angle = (this.angle + this.omega * dt) % TAU;
    this.place();
  }

  onPlayer() { return 'none'; }

  info() { return { angle: +this.angle.toFixed(3), alive: this.aliveCount, count: this.count, plane: this.plane }; }
}

export const KINDS = { flatterkaefer_rad: (level, spec) => new FlatterkaeferRad(level, spec) };
