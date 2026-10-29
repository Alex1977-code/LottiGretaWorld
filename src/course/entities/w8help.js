// Hilfen der Welt-8-Gegner „Brummbär-Rummelplatz“ (Präzisierung Gegner Welt 8). Liegt außerhalb von kinds/ (die Registry sammelt
// nur kinds/*.js).
//
//   POWER_HIT        Angriffe der Figur mit Power-up bzw. Wurfgegenstand (claw = Tatzenhieb/Schwanzhieb/Sturzflug, fire, sichel,
//                    throw, shell, cannon, bomb, mega, star, punch, bite, tail, crush, pow) – besiegen Welt-8-Gegner endgültig
//                    (Knochenflieger-Gruppe: ohne Neu-Zusammensetzen; Doppelgänger des Barons platzen).
//   isSichel(kind, source)  Wurfsichel-Treffer (aus w7help.js)
//   sandTop(level, x, z, y0, below)  Sand-/Bodenhöhe an (x, z): Dünennetz des Ritt-Levels (level.river.sample) bzw. Boden unter
//                    y0 + 2 (raycastDown) bzw. y0
//   groundBelow(level, x, y, z, max)  Boden unter (x, y, z) (feste Form, keine Kill-Form) → y | null
//   Track            Bahn als Bogenlänge (Wegpunkte, Kreis, pos + dir · dist): posAt(s), advance(ds), peek(ds), tangentAt(s)
//   Markers          rote Landemarken (Modell 'boss_marker') mit Zeitablauf: add(x, y, z, T, scale) → Marke, update(dt),
//                    render(dt), clear(), remove(m)
//   fallingStar(level, index, x, y, z, floorY?)  grüner Stern, der vom Punkt zu Boden fällt (Sandflosser, Flatterkäfer mit Stern)
//   CarriedStar      Stern, den ein Gegner trägt (unberührbar, folgt ihm); release() lässt ihn fallen
//   archOf(level, boss)  Boss-Archetyp, wenn er diesen Endgegner gerade steuert (arch.boss === boss) | null
//   bannerOf(level, text, o)  Ansage über das Archetyp-HUD (falls vorhanden)
//   impact(level, x, y, z, radius, by)  meldet einen Aufschlag (Signal 'aufschlag' { pos, radius, by } – Leuchtstege des Motors
//                    leuchten auf; Präzisierung Motor und Bausteine Welt 8)

import * as THREE from 'three';
import { getModel } from '../models/index.js';
import { isSichel } from './w7help.js';

export { isSichel };

const TAU = Math.PI * 2;

export const POWER_HIT = new Set(['claw', 'fire', 'sichel', 'throw', 'shell', 'cannon', 'bomb', 'mega', 'star', 'punch', 'bite', 'tail', 'crush', 'pow']);

/** Aufschlag melden (Motor: Leuchtstege leuchten im Umkreis radius auf). */
export function impact(level, x, y, z, radius = 6, by = 'gegner') {
  level.signal?.('aufschlag', { pos: [x, y, z], radius, by });
}

/** Boden unter (x, y, z) (feste Form, keine Kill-Form; bis max m tiefer) → y | null. */
export function groundBelow(level, x, y, z, max = 30) {
  const hit = level.world.raycastDown(x, y, z, max, { ignore: (s) => !!s.kill || !!s.water });
  return hit ? hit.y : null;
}

/** Sand-/Bodenhöhe an (x, z): Dünennetz (Ritt-Level) bzw. Boden unter y0 + 2 bzw. y0. */
export function sandTop(level, x, z, y0, below = 4) {
  const net = level.river;
  if (net && typeof net.sample === 'function') {
    const f = net.sample(x, z, sandTop._o ?? (sandTop._o = {}));
    if (f?.ok && Number.isFinite(f.y)) return f.y;
  }
  const g = groundBelow(level, x, y0 + 2, z, 2 + below);
  return g ?? y0;
}

// =====================================================================================================================
// Bahn (Bogenlänge)
// =====================================================================================================================

/**
 * Bahn aus Wegpunkten: loop (Runde) oder hin und her (pingpong). posAt(s) für s in [0, L]; advance(ds) läuft weiter (an den Enden
 * Umkehr bzw. Runde) → aktuelle Lage in pos; peek(ds) → Lage nach ds, ohne zu laufen.
 */
export class Track {
  constructor(points, loop = false) {
    this.pts = points.map((p) => ({ x: p[0], y: p[1], z: p[2] }));
    if (this.pts.length === 1) this.pts.push({ ...this.pts[0] });
    this.loop = !!loop && this.pts.length > 2;
    if (this.loop) this.pts.push({ ...this.pts[0] });
    this.seg = [];
    let L = 0;
    for (let i = 0; i < this.pts.length - 1; i++) {
      const a = this.pts[i], b = this.pts[i + 1], l = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
      this.seg.push({ a, b, l, s0: L });
      L += l;
    }
    this.L = L;
    this.s = 0;
    this.dir = 1;
    this.pos = { x: 0, y: 0, z: 0 };
    this.posAt(0, this.pos);
  }

  /** Kreis (Mitte c, Radius r, n Ecken, cw im Uhrzeigersinn von oben). */
  static circle(c, r, cw = false, n = 32) {
    const pts = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU * (cw ? -1 : 1); pts.push([c[0] + Math.cos(a) * r, c[1], c[2] - Math.sin(a) * r]); }
    return new Track(pts, true);
  }

  posAt(s, out = {}) {
    if (!this.seg.length || this.L <= 0) { const p = this.pts[0]; out.x = p.x; out.y = p.y; out.z = p.z; return out; }
    s = this.wrap(s);
    let k = this.seg.length - 1;
    for (let i = 0; i < this.seg.length; i++) if (s <= this.seg[i].s0 + this.seg[i].l) { k = i; break; }
    const g = this.seg[k];
    const t = g.l > 0 ? Math.max(0, Math.min(1, (s - g.s0) / g.l)) : 0;
    out.x = g.a.x + (g.b.x - g.a.x) * t; out.y = g.a.y + (g.b.y - g.a.y) * t; out.z = g.a.z + (g.b.z - g.a.z) * t;
    return out;
  }

  /** s in [0, L] bringen (Runde: modulo; sonst geklemmt). */
  wrap(s) {
    if (this.L <= 0) return 0;
    if (this.loop) return ((s % this.L) + this.L) % this.L;
    return Math.max(0, Math.min(this.L, s));
  }

  /** Lage (und Richtung) nach ds entlang der Laufrichtung, ohne zu laufen → { x, y, z, s, dir }. */
  peek(ds, out = {}) {
    let s = this.s, dir = this.dir;
    if (this.loop) s = this.wrap(s + ds * dir);
    else {
      s += ds * dir;
      for (let i = 0; i < 4 && (s > this.L || s < 0); i++) {
        if (s > this.L) { s = 2 * this.L - s; dir = -1; } else if (s < 0) { s = -s; dir = 1; }
      }
      s = this.wrap(s);
    }
    this.posAt(s, out);
    out.s = s; out.dir = dir;
    return out;
  }

  advance(ds) {
    const p = this.peek(ds, this._pk ?? (this._pk = {}));
    this.s = p.s; this.dir = p.dir;
    this.posAt(this.s, this.pos);
    return this.pos;
  }

  /** Waagerechte Laufrichtung an der aktuellen Stelle (Einheitsvektor {x, z}). */
  heading(out = {}) {
    const a = this.posAt(this.s - 0.2 * this.dir, {}), b = this.posAt(this.s + 0.2 * this.dir, {});
    let dx = b.x - a.x, dz = b.z - a.z;
    const l = Math.hypot(dx, dz);
    if (l < 1e-5) { dx = 1; dz = 0; } else { dx /= l; dz /= l; }
    out.x = dx; out.z = dz;
    return out;
  }

  /** Nächste Stelle der Bahn zu (x, z) → s. */
  nearestS(x, z) {
    let best = 0, bd = Infinity;
    for (const g of this.seg) {
      const ax = g.a.x, az = g.a.z, bx = g.b.x - ax, bz = g.b.z - az;
      const l2 = bx * bx + bz * bz;
      const t = l2 > 1e-8 ? Math.max(0, Math.min(1, ((x - ax) * bx + (z - az) * bz) / l2)) : 0;
      const d = Math.hypot(ax + bx * t - x, az + bz * t - z);
      if (d < bd) { bd = d; best = g.s0 + g.l * t; }
    }
    return best;
  }
}

/** Bahn aus Gegnerdaten: path (+ loop) | center + radius (+ cw) | pos + dir · dist (hin und her) | null. */
export function trackOf(spec, pos, dir, defDist = 0) {
  if (Array.isArray(spec.path) && spec.path.length >= 2) return new Track(spec.path, spec.loop ?? spec.path.length >= 3);
  if (Array.isArray(spec.center)) return Track.circle(spec.center, spec.radius ?? 3, !!spec.cw);
  const L = spec.dist ?? defDist;
  if (L > 0) return new Track([[pos.x, pos.y, pos.z], [pos.x + dir.x * L, pos.y, pos.z + dir.z * L]], false);
  return null;
}

// =====================================================================================================================
// Landemarken mit Zeitablauf
// =====================================================================================================================

export class Markers {
  constructor(level) {
    this.level = level;
    this.list = [];
  }

  /** Marke bei (x, y, z) für T s (k läuft 0 → 1); scale vergrößert. → Marke { x, y, z, t, T } */
  add(x, y, z, T, scale = 1) {
    let model = null;
    if (this.level.view) {
      model = getModel('boss_marker');
      model.root.position.set(x, y + 0.03, z);
      model.root.scale.setScalar(scale);
      this.level.view.add(model.root);
    }
    const m = { x, y, z, t: 0, T: Math.max(0.05, T), model, scale };
    this.list.push(m);
    return m;
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const m = this.list[i];
      m.t += dt;
      if (m.t > m.T + 0.15) this.drop(i);
    }
  }

  render(dt) { for (const m of this.list) m.model?.update(dt, { k: Math.min(1, m.t / m.T) }); }

  remove(m) { const i = this.list.indexOf(m); if (i >= 0) this.drop(i); }

  drop(i) {
    const m = this.list[i];
    if (m.model) { this.level.view?.remove(m.model.root); m.model.dispose?.(); }
    this.list.splice(i, 1);
  }

  clear() { for (let i = this.list.length - 1; i >= 0; i--) this.drop(i); }

  get count() { return this.list.length; }
}

// =====================================================================================================================
// Sterne: fallend bzw. getragen
// =====================================================================================================================

/**
 * Grüner Stern index fällt von (x, y, z) zu Boden (Schwerkraft, landet 0,15 m über dem Boden darunter – bzw. über floorY, falls
 * angegeben; ohne Boden schwebt er an der Stelle). → Stern-Entität | null.
 */
export function fallingStar(level, index, x, y, z, floorY = null) {
  const st = level.spawn('star', { pos: [x, y, z], index });
  if (!st) return null;
  level.effects?.sparks({ x, y: y + 0.6, z }, 18);
  level.sfx('powerup_appear');
  // erst sichtbar erscheinen (0,35 s unberührbar), dann fallen
  st.touch = false;
  let wait = 0.35;
  const floor = floorY ?? groundBelow(level, x, y + 0.5, z, 40);
  let vy = 2.5;
  const off = level.onStep((dt) => {
    if (!st.alive || st.removed) { off(); return; }
    if (wait > 0) { wait -= dt; if (wait <= 0) st.touch = true; return; }
    if (floor === null) { off(); return; }
    vy -= 22 * dt;
    st.pos.y = Math.max(floor + 0.15, st.pos.y + vy * dt);
    if (st.pos.y <= floor + 0.15 + 1e-6) { off(); st.landed = true; level.effects?.dust(st.pos, 4, 0.6); }
  });
  st.falling = true;
  return st;
}

/** Stern, den ein Gegner trägt: folgt der Lage (unter dem Gegner, dy), ist unberührbar; release() → fällt herab. */
export class CarriedStar {
  constructor(level, index, owner, dy = -0.6) {
    this.level = level;
    this.owner = owner;
    this.dy = dy;
    this.index = index;
    this.star = level.spawn('star', { pos: [owner.pos.x, owner.pos.y + dy, owner.pos.z], index });
    if (this.star) this.star.touch = false;
    this.released = false;
  }

  get collected() { return !!this.star && (this.star.removed || !this.star.alive); }

  follow() {
    const s = this.star;
    if (!s || this.released || s.removed) return;
    s.pos.set(this.owner.pos.x, this.owner.pos.y + this.dy, this.owner.pos.z);
    s.touch = false;
  }

  /** Loslassen: der Stern fällt zu Boden und kann eingesammelt werden. */
  release() {
    if (this.released) return null;
    this.released = true;
    const s = this.star;
    if (!s || s.removed) return null;
    s.touch = true;
    const x = s.pos.x, y = s.pos.y, z = s.pos.z;
    this.level.effects?.sparks({ x, y: y + 0.5, z }, 14);
    this.level.sfx('powerup_appear');
    const floor = groundBelow(this.level, x, y + 0.3, z, 40);
    if (floor === null) return s;
    let vy = 1.5;
    s.falling = true;
    const off = this.level.onStep((dt) => {
      if (!s.alive || s.removed) { off(); return; }
      vy -= 22 * dt;
      s.pos.y = Math.max(floor + 0.15, s.pos.y + vy * dt);
      if (s.pos.y <= floor + 0.15 + 1e-6) { off(); s.landed = true; s.falling = false; this.level.effects?.dust(s.pos, 4, 0.6); }
    });
    return s;
  }

  dispose() { if (this.star && !this.star.removed && !this.released) this.star.kill(); }
}

// =====================================================================================================================
// Archetyp
// =====================================================================================================================

/** Boss-Archetyp, wenn er diesen Endgegner gerade steuert | null. */
export function archOf(level, boss) {
  const a = level?.archetype;
  return a && a.boss === boss ? a : null;
}

/** Ansage über das HUD des Archetyps (falls vorhanden). */
export function bannerOf(level, text, o = {}) {
  level?.archetype?.hud?.banner?.(text, { hold: 1.6, size: 13, y: 0.36, ...o });
}

/** Kleiner, fester Glanz-Funke über einem Punkt (Hinweis: „hier ist ein Stern“) – nur Partikel, alle every s. */
export function glint(level, holder, x, y, z, dt, every = 0.45) {
  holder._glint = (holder._glint ?? 0) - dt;
  if (holder._glint > 0) return;
  holder._glint = every;
  level.effects?.sparks({ x, y, z }, 2);
}

export const _v = new THREE.Vector3();
