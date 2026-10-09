// Krabbelkäfer und Flatterkäfer (Bauplan: „folgen fester Bahn in Reihe“, Konter: springen).
//
// Beide folgen einer festen Bahn (spec.path) mit gleichmäßigem Tempo – mit count > 1 mehrere hintereinander im
// Abstand spacing (Meter entlang der Bahn). Krabbelkäfer laufen am Boden (Höhe = Boden unter dem Bahnpunkt,
// Bahn-y ist nur Suchhöhe); Flatterkäfer fliegen genau auf der Bahn (y = Flughöhe, leichtes Wippen). Ohne path
// laufen Krabbelkäfer wie Pilzlinge (dir, Umkehr an Kanten/Wänden) und Flatterkäfer schweben auf der Stelle.
// Draufspringen besiegt (Krabbelkäfer platt, Flatterkäfer fällt herunter); seitlich verletzen sie.
//
// Daten: { kind: 'krabbelkaefer' | 'flatterkaefer', path?: [[x,y,z], …], loop?: (Standard: true ab 3 Punkten,
//          sonst hin und her), speed?: 2.2 (Flatter 2.4) m/s, count?: 1, spacing?: 1.4 m, phase?: 0..1 (Start auf
//          der Bahn), color?: 'blue'|'red'|'green'|'yellow'|'pink' (Standard blau bzw. rosa), pos?, dir?, wake?, drop? }
// Zustände: move | squashed | flipped. Modelle 'krabbelkaefer' / 'flatterkaefer' (opts { color },
// state { anim: walk|fly|idle|squashed, speed }).

import { Enemy } from '../Enemy.js';
import { PathMover } from '../../level/PathMover.js';
import { getModel } from '../../models/index.js';

class Kaefer extends Enemy {
  constructor(level, spec, flying) {
    super(level, spec, flying ? 'flatterkaefer' : 'krabbelkaefer');
    this.flying = flying;
    this.half.set(0.3, flying ? 0.28 : 0.26, 0.3);
    this.shadow = 0.35;
    this.speed = spec.speed ?? (flying ? 2.4 : 2.2);
    this.bob = Math.random() * 6.28;
    this.mover = null;
    this.state = 'move';
    if (spec.path?.length >= 1) {
      const loop = spec.loop ?? spec.path.length >= 3;
      this.mover = new PathMover(spec.path, { speed: this.speed, mode: loop ? 'loop' : 'pingpong', wait: 0, phase: ((spec.phase ?? 0) % 1 + 1) % 1 });
      this.placeOnPath(0);
    } else if (flying) {
      this.home = this.pos.clone();
    }
    if (level.view) this.setModel(getModel(this.kind, { color: spec.color ?? (flying ? 'pink' : 'blue') }));
  }

  placeOnPath(dt) {
    const m = this.mover;
    const x0 = this.pos.x, z0 = this.pos.z;
    if (dt > 0) m.step(dt);
    const p = m.pos;
    this.pos.x = p.x; this.pos.z = p.z;
    if (this.flying) {
      this.pos.y = p.y + Math.sin(this.level.time * 3 + this.bob) * 0.12;
    } else {
      const hit = this.level.world.raycastDown(p.x, p.y + 1.2, p.z, 3.5);
      this.pos.y = hit ? hit.y : p.y;
      this.grounded = !!hit;
    }
    const dx = this.pos.x - x0, dz = this.pos.z - z0;
    if (dt > 0 && dx * dx + dz * dz > 1e-8) { this.dir.x = dx; this.dir.z = dz; const l = Math.hypot(dx, dz); this.dir.x /= l; this.dir.z /= l; }
  }

  update(dt) {
    this.stateT += dt;
    if (this.state === 'squashed' && this.flying) {
      // Flatterkäfer fällt herunter und verschwindet nach der Landung
      this.vel.x = 0; this.vel.z = 0;
      this.moveWithGravity(dt);
      if ((this.grounded && this.stateT > 0.3) || this.stateT > 1.5) this.kill();
      return;
    }
    if (this.updateDefeat(dt)) return;
    if (this.mover) {
      this.placeOnPath(dt);
      this.faceToward(this.dir.x, this.dir.z, dt, 12);
    } else if (this.flying) {
      this.pos.y = this.home.y + Math.sin(this.level.time * 3 + this.bob) * 0.15;
      this.facePlayer(dt, 2);
    } else {
      this.walk(dt, this.speed);
    }
  }

  modelState() {
    const s = this.state;
    if (s === 'squashed') return { anim: 'squashed' };
    if (s === 'flipped') return { anim: 'idle' };
    return { anim: this.flying ? 'fly' : 'walk', speed: this.speed };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    this.model.root.rotation.z = this.state === 'flipped' ? Math.PI : 0;
  }
}

/** Fabrik: count Käfer hintereinander auf derselben Bahn (Abstand spacing m). */
function make(flying) {
  return (level, spec) => {
    const n = Math.max(1, Math.round(spec.count ?? 1));
    const first = new Kaefer(level, { ...spec, count: 1 }, flying);
    if (n > 1 && first.mover) {
      const L = first.mover.length || 1;
      const spacing = spec.spacing ?? 1.4;
      for (let i = 1; i < n; i++) {
        level.spawn(first.kind, { ...spec, id: spec.id ? `${spec.id}_${i}` : undefined, count: 1, phase: (spec.phase ?? 0) - (i * spacing) / L });
      }
    }
    return first;
  };
}

export const KINDS = {
  krabbelkaefer: make(false),
  flatterkaefer: make(true),
};
