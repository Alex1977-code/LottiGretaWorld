// Entitäten der Kurs-Weltkarte (eigene Klassen, nicht in der Entitäten-Registry – sie gehören nur zur Karte):
//   MapRoamer  wandernde Gegnerfigur (z. B. Rammbock-Bulle für 1-A): läuft auf einem Wegstück hin und her, schaut
//              die Heldin an, wenn sie näher kommt; Berührung → onTouch(roamer) (startet das Level, wenn frei).
//   MapItem    schwebendes Gratis-Power-up (Beerenhaus): Berührung → onCollect(item).
// Beide nutzen CourseEntity (Schwerkraft, Kollision, Modell) und werden mit addEntity() angemeldet.

import { CourseEntity } from '../entities/CourseEntity.js';
import { getModel } from '../models/index.js';

/** Entität ohne Registry anmelden (wie Level.spawn: Liste, Schatten-Blob). */
export function addEntity(level, e) {
  level.entities.push(e);
  if (e.shadow > 0 && level.view) {
    level.view.shadows.add({ pos: e.pos, radius: e.shadow, alive: () => !e.removed, visible: () => e.alive && e.shadowVisible !== false });
  }
  return e;
}

const wrap = (a) => { a %= Math.PI * 2; if (a > Math.PI) a -= Math.PI * 2; else if (a < -Math.PI) a += Math.PI * 2; return a; };

export class MapRoamer extends CourseEntity {
  /**
   * @param {object} level
   * @param {{ from: number[], to: number[], speed?: number, start?: number, dir?: number, model?: string, level: string }} spec
   * @param {(r: MapRoamer) => void} onTouch
   */
  constructor(level, spec, onTouch) {
    const t = spec.start ?? 0;
    const pos = spec.from.map((v, i) => v + (spec.to[i] - v) * t);
    super(level, { ...spec, pos }, 'map_roamer');
    this.half.set(0.55, 0.8, 0.55);
    this.shadow = 0.75;
    this.enemy = false;
    this.onTouch = onTouch;
    this.a = spec.from; this.b = spec.to;
    this.dir = spec.dir ?? 1;              // 1 = Richtung to, −1 = Richtung from
    this.speed = spec.speed ?? 2;
    this.anim = 'walk';
    this.pause = 0;
    this.cool = 0;
    this.setModel(getModel(spec.model ?? 'rammbock_bulle'));
  }

  update(dt) {
    if (this.cool > 0) this.cool -= dt;
    const p = this.level.player;
    const target = this.dir > 0 ? this.b : this.a;
    let dx = target[0] - this.pos.x, dz = target[2] - this.pos.z;
    const d = Math.hypot(dx, dz);
    const near = p && !p.dead && Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < 4.2 && Math.abs(p.pos.y - this.pos.y) < 2;
    if (this.pause > 0) {
      this.pause -= dt;
      this.vel.x = this.vel.z = 0;
      this.anim = 'idle';
    } else if (near) {
      // stehen bleiben, schnauben, die Heldin ansehen
      this.vel.x = this.vel.z = 0;
      this.anim = 'idle';
      const want = Math.atan2(-(p.pos.z - this.pos.z), p.pos.x - this.pos.x);
      this.yaw += wrap(want - this.yaw) * Math.min(1, dt * 6);
    } else if (d < 0.15) {
      this.dir = -this.dir;
      this.pause = 0.7;
    } else {
      dx /= d; dz /= d;
      this.vel.x = dx * this.speed; this.vel.z = dz * this.speed;
      this.anim = 'walk';
      const want = Math.atan2(-dz, dx);
      this.yaw += wrap(want - this.yaw) * Math.min(1, dt * 8);
    }
    this.moveWithGravity(dt);
  }

  modelState() { return { anim: this.anim, speed: this.anim === 'walk' ? this.speed : 0, hp: 3 }; }

  onPlayer(player) {
    if (this.cool <= 0) { this.cool = 0.6; this.onTouch?.(this, player); }
    return 'none';
  }
}

export class MapItem extends CourseEntity {
  /**
   * @param {object} level
   * @param {{ pos: number[], power: string }} spec
   * @param {(item: MapItem, player) => void} onCollect
   */
  constructor(level, spec, onCollect) {
    super(level, spec, 'map_item');
    this.power = spec.power;
    this.half.set(1.0, 0.7, 1.0);       // großzügig: Hinlaufen an den Sockel genügt
    this.shadow = 0;
    this.onCollect = onCollect;
    this.base = this.pos.y;
    this.t = 0;
    this.setModel(getModel(`powerup_${spec.power}`));
  }

  update(dt) { this.t += dt; }

  render(dt, t) {
    if (!this.model) return;
    this.model.root.position.set(this.pos.x, this.base + 0.12 + Math.sin(t * 2.2) * 0.08, this.pos.z);
    this.model.root.rotation.y = t * 1.4;
    this.model.update?.(dt, { anim: 'idle' });
  }

  onPlayer(player) {
    if (!this.alive) return 'none';
    this.onCollect?.(this, player);
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 0.6, z: this.pos.z }, 14);
    this.kill();
    return 'collect';
  }
}
