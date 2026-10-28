// Gemeinsame Hilfen der Welt-6-Bausteine (blocks/types/w6_*.js, deco_w6.js, entities/kinds/w6_gimmicks.js). Liegt bewusst
// außerhalb von types/ (die Registry sammelt nur types/*.js).
//
//   w6(level)                     Sammelstelle je Level: { winds, currents, rafts, tilts, crushers, belts, pipes, gongs }
//   figures(level)                aktive Spielfiguren (auch Klone)
//   modelOr(name, opts, make)     Registry-Modell, sobald es den Namen gibt, sonst make() → { root, update?, dispose? }
//   shove(level, obj, dx, dy, dz, ignore?)   Figur/Entität kollisionssicher verschieben (Wind, Förderband, Kippschiff) →
//                                 { x, y, z } tatsächlich bewegt (Quader pos/half wie Player/CourseEntity)
//   windAt(level, x, y, z, out)   Schub aller Windfelder an diesem Punkt (m/s; {x, y, z}) – auch für Gegner (Pustewolke)
//   pushFigures(level, inside(x, y, z), vx, vy, vz, dt, ground = 0.7)   Figuren in einem Bereich schieben (Pustewolke)
//   TiltDeck                      kippende Lauffläche (Kippschiff, Kippsteg, Wippe): Streifen aus Rampen mit Mitnahme
//   beltTexture(colors)           Streifen-Textur für Förderbänder (CanvasTexture, wiederholt)
//   rotXZ(lx, lz, yaw)            lokale Lage (Blick +X) → Weltversatz
//   flatColor(g, hex)             Geometrie einfarbig (Vertexfarben)

import * as THREE from 'three';
import { figures } from './w2kit.js';
import { modelOr } from './w5kit.js';
import { lin, colorize, mixc, smooth } from './kit.js';
import { engine } from '../../audio/index.js';

export { figures, modelOr };

/** Sammelstelle der Welt-6-Bausteine je Level. */
export function w6(level) {
  return (level.w6 ??= { winds: [], currents: [], rafts: [], tilts: [], crushers: [], belts: [], pipes: [], gongs: [], grids: [] });
}

export function rotXZ(lx, lz, yaw) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return { x: lx * c + lz * s, z: -lx * s + lz * c };
}

export function flatColor(g, color) {
  const c = lin(color);
  return colorize(g.index ? g.toNonIndexed() : g, (p, n, o) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; });
}

/** Geometrie mit Licht-Schattierung nach der Normale (oben hell, unten dunkel). */
export function shadeGeo(g, lo, hi, a = -0.6, b = 0.8) {
  const L = lin(lo), H = lin(hi);
  return colorize(g.index ? g.toNonIndexed() : g, (p, n, o) => mixc(L, H, smooth(a, b, n.y * 0.7 - n.x * 0.2 + n.z * 0.25), o));
}

const _c = new THREE.Vector3();

/**
 * Objekt mit pos (Fußpunkt) und half (Halbmaße) um (dx, dy, dz) verschieben – mit Kollision (Wände halten auf, kleine
 * Stufen werden genommen). ignore(shape) blendet Formen aus (z. B. die schiebende Form selbst). → tatsächliche Verschiebung.
 */
export function shove(level, obj, dx, dy, dz, ignore = null) {
  _c.set(obj.pos.x, obj.pos.y + obj.half.y, obj.pos.z);
  const x0 = _c.x, y0 = _c.y, z0 = _c.z;
  const res = level.world.moveAABB(_c, obj.half, { x: dx, y: dy, z: dz }, { step: 0.3, ignore });
  obj.pos.set(_c.x, _c.y - obj.half.y, _c.z);
  return { x: _c.x - x0, y: _c.y - y0, z: _c.z - z0, res };
}

/**
 * Figuren schieben (Gegner-Schnittstelle, z. B. Pustewolke): für jede aktive Figur am Boden/in der Luft/schwimmend, deren
 * Mitte inside(x, y, z) erfüllt, um (vx, vy, vz)·dt verschieben (am Boden × ground, Standard 0,7). → Zahl der Figuren.
 */
export function pushFigures(level, inside, vx, vy, vz, dt, ground = 0.7) {
  let n = 0;
  for (const f of figures(level)) {
    if (f.mode !== 'ground' && f.mode !== 'air' && f.mode !== 'swim') continue;
    const c = f.center();
    if (!inside(c.x, c.y, c.z)) continue;
    const k = f.mode === 'ground' ? ground : 1;
    shove(level, f, vx * dt * k, vy * dt * k, vz * dt * k);
    n++;
  }
  return n;
}

/** Schub aller Windfelder an (x, y, z) in m/s (out {x, y, z}); 0 außerhalb. */
export function windAt(level, x, y, z, out = { x: 0, y: 0, z: 0 }) {
  out.x = 0; out.y = 0; out.z = 0;
  for (const w of level.w6?.winds ?? []) w.add?.(x, y, z, out);
  return out;
}

// ------------------------------------------------------------------ Kippende Lauffläche

/**
 * Kippende Lauffläche aus Rampen-Streifen (Kollisionswelt kennt nur achsenparallele Rampen): Mitte (cx, cz), Drehachse
 * auf Höhe y (Oberseite bei Neigung 0), axis = Richtung, entlang der die Höhe sich ändert ('x' | 'z'), lenA = Ausdehnung
 * entlang axis, lenB = quer dazu, thick = Dicke unter der Oberseite, strips = Streifen entlang axis (Mitnahme je Streifen:
 * mover.dy = Streifenmitte · Δtan). setAngle(rad) (+ = Oberseite steigt zu +axis). owner/tag für die Formen.
 * heightAt(x, z) = Oberseite, onTop(fig) = Figur steht darauf, offset(x, z) = Abstand zur Drehachse entlang axis.
 */
export class TiltDeck {
  constructor(level, o) {
    this.level = level;
    this.cx = o.cx; this.cz = o.cz; this.y = o.y;
    this.axis = o.axis === 'x' ? 'x' : 'z';
    this.lenA = o.lenA; this.lenB = o.lenB;
    this.thick = o.thick ?? 0.4;
    this.angle = 0;
    this.tan = 0;
    this.owner = o.owner ?? this;
    const n = Math.max(1, o.strips ?? Math.ceil(this.lenA / 0.6));
    this.strips = [];
    for (let i = 0; i < n; i++) {
      const a0 = -this.lenA / 2 + (i / n) * this.lenA, a1 = -this.lenA / 2 + ((i + 1) / n) * this.lenA;
      const mover = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: this.cx, cz: this.cz };
      const shape = { type: 'ramp', axis: this.axis, dir: 1, min: [0, 0, 0], max: [1, 1, 1], low: 0, mover, owner: this.owner, tag: o.tag ?? 'kippdeck', ...(o.flags ?? {}) };
      this.strips.push({ a0, a1, ac: (a0 + a1) / 2, mover, shape, id: null });
    }
    this.place();
    for (const s of this.strips) s.id = level.world.add(s.shape);
  }

  get shapes() { return this.strips.map((s) => s.shape); }

  /** Abstand eines Punktes zur Drehachse entlang axis. */
  offset(x, z) { return this.axis === 'x' ? x - this.cx : z - this.cz; }

  /** Oberseite an (x, z). */
  heightAt(x, z) { return this.y + this.offset(x, z) * this.tan; }

  place() {
    const t = this.tan;
    for (const s of this.strips) {
      const h0 = this.y + s.a0 * t, h1 = this.y + s.a1 * t;
      const lo = Math.min(h0, h1), hi = Math.max(h0, h1);
      const sh = s.shape;
      const b0 = -this.lenB / 2, b1 = this.lenB / 2;
      if (this.axis === 'x') { sh.min = [this.cx + s.a0, lo - this.thick, this.cz + b0]; sh.max = [this.cx + s.a1, hi, this.cz + b1]; }
      else { sh.min = [this.cx + b0, lo - this.thick, this.cz + s.a0]; sh.max = [this.cx + b1, hi, this.cz + s.a1]; }
      sh.dir = t >= 0 ? 1 : -1;
      sh.low = lo;
      if (s.id) this.level.world.update(s.id);
    }
  }

  /** Neigung setzen (rad); Mitnahme dieses Schritts (dt) für alles, was auf den Streifen steht. */
  setAngle(rad, dt) {
    const old = this.tan;
    this.angle = rad;
    this.tan = Math.tan(rad);
    const d = this.tan - old;
    for (const s of this.strips) {
      const m = s.mover;
      m.dy = s.ac * d; m.vy = dt > 0 ? m.dy / dt : 0;
    }
    if (d !== 0) this.place();
  }

  /** Steht die Figur (bzw. Entität mit ground) auf einem Streifen? */
  onTop(f) { return !!f && f.ground?.owner === this.owner && this.strips.some((s) => s.shape === f.ground); }

  remove() { for (const s of this.strips) if (s.id) { this.level.world.remove(s.id); s.id = null; } }
}

// ------------------------------------------------------------------ Förderband-Textur

/** Wiederholbare Band-Textur (Chevrons in Laufrichtung = Textur +V). colors: [Grund, Pfeil, Kante]. */
export function beltTexture(colors = ['#2d3142', '#ffcf3a', '#596080']) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = colors[0]; g.fillRect(0, 0, 64, 64);
  g.fillStyle = colors[2]; g.fillRect(0, 0, 64, 4); g.fillRect(0, 32, 64, 2);
  g.fillStyle = colors[1];
  g.beginPath(); g.moveTo(10, 44); g.lineTo(32, 22); g.lineTo(54, 44); g.lineTo(44, 44); g.lineTo(32, 32); g.lineTo(20, 44); g.closePath(); g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Warn-Schwelle 0..1 → Puls (für Vorwarnungen: Glühen, Zittern). */
export const pulse = (t, k, f = 14) => k * (0.6 + 0.4 * Math.sin(t * f));

// Klänge: Welt-6-Namen auf vorhandene Effekte abbilden (src/audio/sfx.js kennt z. B. 'gust' nicht – unbekannte Namen
// blieben stumm). Sobald der Audio-Agent einen Namen als eigenen Effekt anlegt, gilt dieser.
const SFX6 = { gust: 'swoop', wind: 'hover', rumble: 'land', door: 'gate', poof: 'vanish', splash: 'splash_big', bump: 'blockhit', powerup_appear: 'powerup' };
let sfxNames = null;
/** Effekt abspielen: eigener Name, falls vorhanden, sonst Ersatz aus SFX6. */
export function w6Sfx(level, name) {
  if (!level?.sfx) return;
  if (!sfxNames) sfxNames = new Set(engine.effects?.names ?? []);
  level.sfx(SFX6[name] && !sfxNames.has(name) ? SFX6[name] : name);
}
