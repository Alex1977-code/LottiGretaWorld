// Level-Objekt des Kurs-Modus: hält Kollisionswelt, Ansicht, Entitäten, Laufzeit und die Spielfigur und
// rechnet einen Simulationsschritt (step). Bausteine und Entitäten bekommen es als `level`.
//
// Schnittstelle (Präzisierung Motor):
//   level.data, level.id, level.world (CollisionWorld), level.view (CourseView), level.runtime (LevelRuntime)
//   level.player, level.entities, level.time (Simulationszeit s), level.killY, level.bounds
//   level.spawn(kind, spec) → Entität | null      level.hasKind(kind)      level.named.get(id)
//   level.onStep(fn(dt, time)) → Abmelden         je Simulationsschritt vor der Figur (bewegte Plattformen)
//   level.sfx(name), level.effects (Partikel), level.shake(a)
//   level.addCoins(n), level.addLife(n), level.attackArea(pos, radius, kind, source)
//   level.rnd (Rnd, je Level-Id deterministisch)
//
// Reihenfolge je Schritt: onStep-Funktionen (Plattformen) → Figur → Entitäten → Berührungen
// (onPlayer) → Angriffe → Laufzeit (Timer, Absturz) → Entfernen erledigter Entitäten.

import { CollisionWorld } from '../physics/CollisionWorld.js';
import { getEntityKind, hasEntityKind } from '../entities/index.js';
import { LevelRuntime } from './LevelRuntime.js';
import { Rnd } from '../../three/world/geometry.js';
import { sfx as playSfx } from '../../audio/index.js';

export class Level {
  /**
   * @param {object} scene CourseScene (oder Test-Attrappe mit view)
   * @param {object} data LEVEL
   * @param {{ view?: object, save?: object }} opts
   */
  constructor(scene, data, opts = {}) {
    this.scene = scene;
    this.data = data;
    this.id = data.id;
    this.world = new CollisionWorld();
    this.view = opts.view ?? null;
    this.entities = [];
    this.named = new Map();
    this.steppers = [];
    this.player = null;
    this.time = 0;
    this.controlYaw = 0;
    this.killY = -30;
    this.bounds = null;
    let seed = 7;
    for (const ch of String(data.id)) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    this.rnd = new Rnd(seed);
    this.runtime = new LevelRuntime(this, opts.save);
    this.muted = false;
  }

  get effects() { return this.view?.effects ?? null; }

  sfx(name) { if (!this.muted) playSfx(name); }

  shake(a) { this.view?.rig?.shake(a); }

  hasKind(kind) { return hasEntityKind(kind); }

  /** Entität erzeugen und anmelden. Unbekannte Art → Warnung, null. */
  spawn(kind, spec = {}) {
    const f = getEntityKind(kind);
    if (!f) { console.warn(`[Level ${this.id}] unbekannte Entität: ${kind}`); return null; }
    const e = f(this, spec);
    if (!e) return null;
    if (!e.kind || e.kind === 'entity') e.kind = kind;
    this.entities.push(e);
    if (spec.id) this.named.set(spec.id, e);
    if (e.shadow > 0 && this.view) {
      this.view.shadows.add({ pos: e.pos, radius: e.shadow, alive: () => !e.removed, visible: () => e.alive && e.shadowVisible !== false });
    }
    return e;
  }

  onStep(fn) {
    this.steppers.push(fn);
    return () => { const i = this.steppers.indexOf(fn); if (i >= 0) this.steppers.splice(i, 1); };
  }

  addCoins(n = 1) { this.runtime.addCoins(n); }
  addLife(n = 1) { this.runtime.addLife(n); }

  /** Angriff im Umkreis (Stampfattacke, Explosion): onHit(kind) für Entitäten in Reichweite. */
  attackArea(pos, radius, kind, source) {
    for (const e of this.entities) {
      if (!e.alive || e === source) continue;
      const dx = e.pos.x - pos.x, dz = e.pos.z - pos.z;
      if (dx * dx + dz * dz > radius * radius) continue;
      if (Math.abs(e.pos.y - pos.y) > 1.2) continue;
      e.onHit?.(kind, source);
    }
  }

  /** Umriss aus den Kollisionsformen (ohne riesige Ebenen) → Hintergrund und Absturzhöhe. */
  computeBounds() {
    const b = { min: { x: Infinity, y: Infinity, z: Infinity }, max: { x: -Infinity, y: -Infinity, z: -Infinity } };
    this.world.forEach((s) => {
      if (s._big || s.kill) return;
      b.min.x = Math.min(b.min.x, s.x0); b.max.x = Math.max(b.max.x, s.x1);
      b.min.y = Math.min(b.min.y, s.bot); b.max.y = Math.max(b.max.y, s.top);
      b.min.z = Math.min(b.min.z, s.z0); b.max.z = Math.max(b.max.z, s.z1);
    });
    if (!Number.isFinite(b.min.x)) { b.min = { x: -10, y: 0, z: -10 }; b.max = { x: 10, y: 1, z: 10 }; }
    this.bounds = b;
    this.killY = (this.data.killY ?? b.min.y - 14);
    return b;
  }

  // ------------------------------------------------------------------ Simulation

  step(dt, input) {
    this.time += dt;
    for (let i = 0; i < this.steppers.length; i++) this.steppers[i](dt, this.time);
    const p = this.player;
    if (p) {
      p.update(dt, input);
      if (!p.dead && p.pos.y < this.killY) p.die('fall');
    }
    for (let i = 0; i < this.entities.length; i++) {
      const e = this.entities[i];
      if (!e.removed) e.update(dt);
    }
    if (p && !p.dead && p.mode !== 'script') {
      this.contacts(input);
      this.attacks();
    }
    this.runtime.update(dt);
    // Erledigte Entitäten entfernen
    let w = 0;
    for (let i = 0; i < this.entities.length; i++) {
      const e = this.entities[i];
      if (e.removed && !e.keepModel) { e.dispose(); continue; }
      this.entities[w++] = e;
    }
    this.entities.length = w;
  }

  /** Berührungen Figur ↔ Entitäten (AABB) → onPlayer → Abprall oder Treffer. */
  contacts(input) {
    const p = this.player;
    const pc = p.center(), ph = p.half;
    for (let i = 0; i < this.entities.length; i++) {
      const e = this.entities[i];
      if (!e.alive || e.touch === false || p.dead || p.mode === 'script') continue;
      const ec = e.center();
      if (Math.abs(pc.x - ec.x) > ph.x + e.half.x || Math.abs(pc.y - ec.y) > ph.y + e.half.y || Math.abs(pc.z - ec.z) > ph.z + e.half.z) continue;
      const top = e.pos.y + e.half.y * 2;
      const fall = Math.max(0, -p.vel.y) / 120;
      const contact = {
        fromAbove: p.vel.y <= 1 && p.prevPos.y >= top - Math.max(0.28, fall * 2.5) && p.mode !== 'ground',
        pound: p.state === 'groundpound', dive: p.state === 'dive',
        star: !!p.powerDef.invulnerable,
        dx: pc.x - ec.x, dz: pc.z - ec.z, speed: p.hSpeed(),
      };
      let r;
      if (e.enemy) r = p.powerDef.onTouchEntity?.(p, e, contact);
      if (r === undefined) r = e.onPlayer(p, contact);
      if (r === 'stomp') { p.bounceOff(input); this.sfx('stomp'); }
      else if (r === 'hurt') p.hurt(e);
    }
  }

  /** Angriffsbereich der Figur (Tatzenhieb, Sturzflug) → onHit. */
  attacks() {
    const p = this.player;
    const a = p.attackInfo;
    if (!a) return;
    const f = p.facingVec();
    const reach = a.reach;
    const cx = p.pos.x + f.x * (p.half.x + reach * 0.5), cz = p.pos.z + f.z * (p.half.z + reach * 0.5), cy = p.pos.y + p.half.y;
    for (const e of this.entities) {
      if (!e.alive || a.hit.has(e) || !e.onHit) continue;
      const ec = e.center();
      if (Math.abs(ec.x - cx) > reach * 0.5 + 0.3 + e.half.x || Math.abs(ec.z - cz) > reach * 0.5 + 0.3 + e.half.z || Math.abs(ec.y - cy) > p.half.y + e.half.y) continue;
      a.hit.add(e);
      e.onHit(a.kind, p);
    }
  }

  /** Darstellung je Bild (Modelle nachführen/animieren). */
  render(dt, t) {
    for (let i = 0; i < this.entities.length; i++) this.entities[i].render?.(dt, t);
  }

  onPlayerDeath(cause) { this.runtime.onPlayerDeath(cause); }
  onPlayerDeathDone(cause) { this.runtime.onPlayerDeathDone(cause); }
  onGoalDone() { this.runtime.finish(); }
  onTeleport() { if (this.player) this.view?.rig?.snap(this.player); }

  dispose() {
    for (const e of this.entities) e.dispose();
    this.entities.length = 0;
    this.steppers.length = 0;
  }
}
