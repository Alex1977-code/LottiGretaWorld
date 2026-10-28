// Hilfen der Welt-6-Gegner (Präzisierung Gegner Welt 6). Liegt außerhalb von kinds/ (die Registry sammelt nur kinds/*.js).
//
//   shoveFigure(fig, dx, dz, speed = 11, lift = 6.5, lock = 0.4)
//       Figur **ohne Schaden** wegstoßen (Schubser, Schubser-Prinz): sie fliegt in Richtung (dx, dz) mit speed m/s und lift
//       m/s nach oben, lock s ohne Steuerung (Zustand 'hurt' = Stolpern). Reitend (mount), im Skript, tot → nichts.
//       → true, wenn gestoßen.
//   approachSpeed(fig, e)          Tempo (m/s), mit dem sich die Figur waagerecht auf e zubewegt (negativ = weg)
//   dirFromTo(a, b, fb)            waagerechte Einheitsrichtung {x, z} von a nach b (pos-Objekte); zu nah → fb bzw. +Z
//   pushFigures(level, inside(x, y, z), vx, vy, vz, dt, ground = 0.7)
//       Figuren in einem Bereich mit Kollision verschieben (Pustewolke) – dieselbe Schnittstelle wie blocks/w6kit.js
//       (Motor und Bausteine Welt 6): am Boden × ground, in der Luft/schwimmend voll. → Zahl der Figuren.
//   shoveAABB(level, obj, dx, dy, dz, ignore?)   Objekt (pos = Fußpunkt, half) kollisionssicher verschieben
//   waterIn(level, e)              Wasserform, in die e (Hüllquader) eingetaucht ist (pos.y unter der Oberfläche) | null
//   Lcg                            kleiner deterministischer Zufall (seed) – Bosse würfeln damit reproduzierbar
//   bossManaged(level, id)         steuert ein Boss-Archetyp diesen Endgegner? (LEVEL.boss.id bzw. ein Eintrag in LEVEL.bosses)

import * as THREE from 'three';
import { figures } from './EnemyW2.js';

export { figures };

const FREE = new Set(['ground', 'air', 'swim']);

/** Figur ohne Schaden wegstoßen (fliegt, kurz ohne Steuerung). */
export function shoveFigure(fig, dx, dz, speed = 11, lift = 6.5, lock = 0.4) {
  if (!fig || fig.dead || fig.removedFigure || fig.mode === 'script' || fig.mode === 'mount') return false;
  const l = Math.hypot(dx, dz) || 1;
  if (fig.mode === 'swim') {
    // im Wasser nur waagerecht treiben
    fig.vel.x = (dx / l) * speed * 0.6; fig.vel.z = (dz / l) * speed * 0.6;
    return true;
  }
  fig.fence = null;
  fig.stalk = null;
  if (fig.mode !== 'air') fig.mode = 'air';
  fig.vel.set((dx / l) * speed, lift, (dz / l) * speed);
  fig.airMax = speed;
  fig.enterAir?.('hurt', false);
  fig.hurtTime = Math.max(fig.hurtTime ?? 0, lock);
  fig.coyote = 0;
  return true;
}

/** Waagerechtes Annäherungstempo der Figur auf e zu (m/s). */
export function approachSpeed(fig, e) {
  const dx = e.pos.x - fig.pos.x, dz = e.pos.z - fig.pos.z, d = Math.hypot(dx, dz);
  if (d < 1e-4) return 0;
  return (fig.vel.x * dx + fig.vel.z * dz) / d;
}

/** Waagerechte Einheitsrichtung von a nach b; zu nah → fb ({x, z}) bzw. +Z. */
export function dirFromTo(a, b, fb = null, out = {}) {
  const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
  if (d < 1e-3) { out.x = fb?.x ?? 0; out.z = fb?.z ?? 1; const l = Math.hypot(out.x, out.z) || 1; out.x /= l; out.z /= l; return out; }
  out.x = dx / d; out.z = dz / d;
  return out;
}

const _c = new THREE.Vector3();

/** Objekt (pos = Fußpunkt, half) um (dx, dy, dz) mit Kollision verschieben → tatsächliche Verschiebung. */
export function shoveAABB(level, obj, dx, dy, dz, ignore = null) {
  _c.set(obj.pos.x, obj.pos.y + obj.half.y, obj.pos.z);
  const x0 = _c.x, y0 = _c.y, z0 = _c.z;
  const res = level.world.moveAABB(_c, obj.half, { x: dx, y: dy, z: dz }, { step: 0.3, ignore });
  obj.pos.set(_c.x, _c.y - obj.half.y, _c.z);
  return { x: _c.x - x0, y: _c.y - y0, z: _c.z - z0, res };
}

/** Figuren in einem Bereich schieben (am Boden × ground) → Zahl der geschobenen Figuren. */
export function pushFigures(level, inside, vx, vy, vz, dt, ground = 0.7) {
  let n = 0;
  for (const f of figures(level)) {
    if (!FREE.has(f.mode) || f.dead || f.removedFigure) continue;
    const c = f.center();
    if (!inside(c.x, c.y, c.z)) continue;
    const k = f.mode === 'ground' ? ground : 1;
    shoveAABB(level, f, vx * dt * k, vy * dt * k, vz * dt * k);
    n++;
  }
  return n;
}

/** Wasserform, in die e eingetaucht ist (Fußpunkt ≥ dip m unter der Oberfläche) | null. */
export function waterIn(level, e, dip = 0.25) {
  const c = e.center();
  for (const s of level.world.overlapAABB(c, e.half)) {
    if (s.water && e.pos.y < s.top - dip) return s;
  }
  return null;
}

/** Kleiner deterministischer Zufall (LCG). */
export class Lcg {
  constructor(seed) { this.s = seed >>> 0 || 1; }
  next() { this.s = (Math.imul(this.s, 1664525) + 1013904223) >>> 0; return this.s / 4294967296; }
  real(a, b) { return a + (b - a) * this.next(); }
  int(n) { return Math.min(n - 1, Math.floor(this.next() * n)); }
}

/** Steuert ein Boss-Archetyp den Endgegner mit dieser Id? (LEVEL.boss bzw. LEVEL.bosses, Präzisierung Gegner Welt 6) */
export function bossManaged(level, id) {
  if (!level?.archetype) return false;
  const d = level.data ?? {};
  if (Array.isArray(d.bosses)) return d.bosses.some((b) => (b.id ?? 'baron') === id);
  return !!d.boss && (d.boss.id ?? 'baron') === id;
}
