// Bombenkanone (1-Burg, Kanonen-Zone, Ziegelwand, Blockwand): feuert Kickbomben in hohem Bogen auf die Figur
// bzw. auf feste Zielpunkte. Fair: Ankündigung 0,8 s (Rohr glüht und zittert, Zündfunke, Zischen), Landeanzeige
// (roter Ring) am Zielpunkt, solange die Bombe fliegt. Die Bombe landet brennend (Lunte `fuse` s ab Abschuss),
// läuft auf die Figur zu und kann zurückgekickt werden – in Wände (Ziegel-/Steinwand, graue Blockwand) oder in
// Gegner. Die Kanone selbst ist unzerstörbar (feste Form, gekickte Bomben explodieren daran).
//
// Daten: { kind: 'bomb_cannon', id?, pos: [x, y, z] (Fußpunkt), yaw? (Ruhe-Blickrichtung, Standard zur Kamera +Z),
//          aim: 'player' (Standard) | [x, y, z] | [[x, y, z], …] (feste Ziele, reihum),
//          interval: 3.6 (s zwischen Schüssen), first: 1.2 (s bis zum ersten Schuss nach Aktivierung),
//          range: 24 (m – nur aktiv, wenn die Figur so nah ist), flight: 1.05 (s Flugzeit), lead: 0.35 (s Vorhalt),
//          spread: 1.0 (m Streuung), area?: { min: [x, z], max: [x, z] } (Ziele darauf begrenzt),
//          max: 2 (gleichzeitig lebende Bomben dieser Kanone), fuse: 3.4, charge: 0.8, active: true }
// Laufzeit: state idle | charge | fire, shots (abgefeuerte Bomben), bombs (lebende), setActive(b).
// Modell 'bomb_cannon' (state { anim, aim, progress }), Landeanzeige 'boss_marker'.

import { CourseEntity } from '../CourseEntity.js';
import { getModel } from '../../models/index.js';
import { Rnd } from '../../../three/world/geometry.js';

const G = 40;            // Schwerkraft der Entitäten (CourseEntity)
const PIVOT_Y = 1.48;    // Schildzapfen über dem Fußpunkt
const BARREL = 1.15;     // Rohrlänge ab Zapfen

/** Startgeschwindigkeit für einen Wurf von a nach b in T s (Schwerkraft G). */
export function ballistic(a, b, T) {
  return [(b[0] - a[0]) / T, (b[1] - a[1] + 0.5 * G * T * T) / T, (b[2] - a[2]) / T];
}

/** Landeanzeigen (Ring am Zielpunkt, solange die Bombe fliegt) – geteilt von Kanonen und Endgegner. */
export class LandingMarkers {
  constructor(level) {
    this.level = level;
    this.list = [];
  }

  add(bomb, x, y, z, T) {
    let model = null;
    if (this.level.view) {
      model = getModel('boss_marker');
      model.root.position.set(x, y + 0.02, z);
      this.level.view.add(model.root);
    }
    this.list.push({ bomb, model, t: 0, T, x, y, z });
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const m = this.list[i];
      m.t += dt;
      const b = m.bomb;
      if (m.t > m.T + 0.4 || !b || b.removed || b.state !== 'air' || b.kicker) { this.drop(i); continue; }
    }
  }

  render(dt) {
    for (const m of this.list) m.model?.update(dt, { k: Math.min(1, m.t / m.T) });
  }

  drop(i) {
    const m = this.list[i];
    if (m.model) { this.level.view.remove(m.model.root); m.model.dispose(); }
    this.list.splice(i, 1);
  }

  clear() { for (let i = this.list.length - 1; i >= 0; i--) this.drop(i); }
}

class BombCannon extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'bomb_cannon');
    this.touch = false;
    this.half.set(0.85, 1.0, 0.85);
    this.shadow = 0;
    this.restYaw = spec.yaw ?? -Math.PI / 2;
    this.yaw = this.restYaw;
    this.aimSpec = spec.aim ?? 'player';
    this.interval = spec.interval ?? 3.6;
    this.range = spec.range ?? 24;
    this.flight = spec.flight ?? 1.05;
    this.lead = spec.lead ?? 0.35;
    this.spread = spec.spread ?? 1.0;
    this.area = spec.area ?? null;
    this.maxBombs = spec.max ?? 2;
    this.fuse = spec.fuse ?? 3.4;
    this.chargeT = spec.charge ?? 0.8;
    this.active = spec.active !== false;
    this.cool = spec.first ?? 1.2;
    this.state = 'idle';
    this.stateT = 0;
    this.pitch = 0.5;
    this.shots = 0;
    this.bombs = [];
    this.target = null;
    this.aimIndex = 0;
    this.rnd = new Rnd((Math.floor(this.pos.x * 131 + this.pos.z * 71) ^ 0x7c7c) >>> 0);
    this.markers = new LandingMarkers(level);
    const p = this.pos;
    this.addShape({ type: 'cyl', x: p.x, z: p.z, r: 0.85, y0: p.y, y1: p.y + 1.25, tag: 'cannon' });
    if (level.view) this.setModel(getModel('bomb_cannon'));
  }

  setActive(b) { this.active = !!b; if (!b) { this.state = 'idle'; this.stateT = 0; } }

  setState(s) { this.state = s; this.stateT = 0; }

  /** Nächster Zielpunkt (Fußpunkt). */
  pickTarget() {
    const a = this.aimSpec;
    let t;
    if (a === 'player') {
      const p = this.level.player;
      t = [p.pos.x + p.vel.x * this.lead, p.pos.y, p.pos.z + p.vel.z * this.lead];
      const r = this.rnd.real(0, this.spread), ang = this.rnd.real(0, Math.PI * 2);
      t[0] += Math.cos(ang) * r; t[2] += Math.sin(ang) * r;
      // Bodenhöhe am Ziel
      const hit = this.level.world.raycastDown(t[0], p.pos.y + 2, t[2], 8);
      if (hit && !hit.shape.kill) t[1] = hit.y;
    } else if (Array.isArray(a[0])) {
      t = a[this.aimIndex % a.length].slice();
      this.aimIndex++;
    } else t = a.slice();
    if (this.area) {
      t[0] = Math.max(this.area.min[0], Math.min(this.area.max[0], t[0]));
      t[2] = Math.max(this.area.min[1], Math.min(this.area.max[1], t[2]));
    }
    return t;
  }

  muzzle(yaw, pitch) {
    const c = Math.cos(pitch) * BARREL;
    return [this.pos.x + Math.cos(yaw) * c, this.pos.y + PIVOT_Y + Math.sin(pitch) * BARREL, this.pos.z - Math.sin(yaw) * c];
  }

  update(dt) {
    this.stateT += dt;
    this.bombs = this.bombs.filter((b) => !b.removed);
    this.markers.update(dt);
    const p = this.level.player;
    const near = this.active && p && !p.dead && p.mode !== 'script' && Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < this.range;
    // Rohr ausrichten (auf das aktuelle Ziel bzw. die Figur)
    const aimAt = this.target ?? (near ? [p.pos.x, p.pos.y, p.pos.z] : null);
    if (aimAt) {
      const want = Math.atan2(-(aimAt[2] - this.pos.z), aimAt[0] - this.pos.x);
      let d = want - this.yaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.yaw += d * Math.min(1, dt * 6);
    }
    switch (this.state) {
      case 'idle':
        if (this.cool > 0) this.cool -= dt;
        if (near && this.cool <= 0 && this.bombs.length < this.maxBombs) {
          this.target = this.pickTarget();
          this.setState('charge');
          this.level.sfx('hover');
        }
        break;
      case 'charge':
        if (this.stateT >= this.chargeT) this.fire();
        break;
      case 'fire':
        if (this.stateT >= 0.6) { this.setState('idle'); this.target = null; }
        break;
      default: break;
    }
  }

  fire() {
    const t = this.target ?? this.pickTarget();
    const yaw = Math.atan2(-(t[2] - this.pos.z), t[0] - this.pos.x);
    this.yaw = yaw;
    // Neigung aus der Startrichtung (zweimal verfeinert, da die Mündung von der Neigung abhängt)
    // Fußpunkt der Bombe = Mündung − 0,36 m (Bombenmitte sitzt in der Mündung)
    const foot = (q) => [q[0], q[1] - 0.36, q[2]];
    let m = this.muzzle(yaw, this.pitch), v = ballistic(foot(m), t, this.flight);
    for (let k = 0; k < 2; k++) {
      this.pitch = Math.max(0.15, Math.min(1.35, Math.atan2(v[1], Math.hypot(v[0], v[2]))));
      m = this.muzzle(yaw, this.pitch);
      v = ballistic(foot(m), t, this.flight);
    }
    const b = this.level.spawn('kickbombe', { pos: foot(m), vel: v, owner: this, fuse: this.fuse });
    if (b) {
      this.bombs.push(b);
      this.markers.add(b, t[0], t[1], t[2], this.flight);
    }
    this.shots++;
    this.cool = this.interval;
    this.setState('fire');
    this.level.sfx('slam');
    this.level.shake(0.12);
    this.level.effects?.dust({ x: m[0], y: m[1] - 0.3, z: m[2] }, 4, 1.2);
  }

  onHit() { /* unzerstörbar */ }

  render(dt, t) {
    this.syncModel();
    const progress = this.state === 'charge' ? Math.min(1, this.stateT / this.chargeT) : this.state === 'fire' ? Math.min(1, this.stateT / 0.6) : 0;
    this.model?.update(dt, { anim: this.state, aim: this.pitch, progress });
    this.markers.render(dt);
  }

  dispose() {
    this.markers.clear();
    super.dispose();
  }
}

export const KINDS = { bomb_cannon: (level, spec) => new BombCannon(level, spec) };
export { BombCannon, PIVOT_Y };
