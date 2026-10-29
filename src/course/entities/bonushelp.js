// Hilfen der Gegner der Bonuswelten Stern, Pilz, Blume, Krone (Präzisierung Gegner Bonuswelten). Liegt außerhalb von kinds/
// (die Registry sammelt nur kinds/*.js).
//
//   POWER_HIT, isSichel           wie w8help.js (Angriffe der Figur mit Power-up bzw. Wurfgegenstand; Wurfsichel-Treffer)
//   STACHEL_KILL                  Angriffe, die stachelige Gegner besiegen (nicht Draufspringen/Stampfen): Feuer, Tatze, Wurfsichel,
//                                 Panzer, Wurf, Kanone, Explosion, Riese, Stern, Faust, Biss, Schwanz, Quetschen, POW, Rutschen nein
//   slopeAt(level, x, y, z, d)    Gefälle des Bodens an (x, z) aus vier Strahlen nach unten: { gx, gz } (Einheitsrichtung
//                                 hangabwärts), k (Steigung dy/dx ≥ 0), ok (Boden gefunden)
//   Ride                          fährt eine Entität auch in der Luft mit der bewegten Plattform (MovingBox/mover: shape.mover
//                                 = { dx, dy, dz }), auf der sie zuletzt stand – Hüpfer auf gleitenden Blöcken landen wieder
//                                 auf dem Block. ride.step(e) je Schritt vor moveWithGravity; ride.clear()
//   arcVelocity(a, b, T, g)       Anfangsgeschwindigkeit eines Bogens von a nach b in T s bei Schwerkraft g ({x, y, z})
//   aura(level, owner, opts)      „Sternenstaub“ (Modell 'sternenstaub'): funkelnder Sternenkranz um einen Endgegner der Nacht-
//                                 Weltraum-Fassung (B-12); folgt owner.pos (bzw. owner.home), blendet bei unsichtbarem/besiegtem
//                                 Gegner aus. → { dispose(), set(k) }
//   bannerOf, archOf, fallingStar, Markers, Track, groundBelow, impact   aus w8help.js weitergereicht

import { POWER_HIT, isSichel, bannerOf, archOf, fallingStar, Markers, Track, groundBelow, impact } from './w8help.js';
import { figures, activeFigure, clamp } from './EnemyW2.js';
import { getModel, hasModel } from '../models/index.js';

export { POWER_HIT, isSichel, bannerOf, archOf, fallingStar, Markers, Track, groundBelow, impact, figures, activeFigure, clamp };

export const TAU = Math.PI * 2;

/** Angriffe, die stachelige Gegner besiegen (Draufspringen/Stampfen nicht – Stacheln!). */
export const STACHEL_KILL = new Set(['fire', 'claw', 'sichel', 'shell', 'throw', 'cannon', 'bomb', 'mega', 'star', 'punch', 'bite', 'tail', 'crush', 'pow']);

const _sl = { gx: 0, gz: 0, k: 0, ok: false };
/**
 * Gefälle des Bodens an (x, z) knapp unter y (vier Strahlen im Abstand d): Einheitsrichtung hangabwärts (gx, gz) und Steigung k
 * (Höhenunterschied je Meter). Ohne Boden ringsum: ok = false, k = 0.
 */
export function slopeAt(level, x, y, z, d = 0.35, out = _sl) {
  const ign = { ignore: (s) => !!s.kill || !!s.water };
  const h = (px, pz) => { const r = level.world.raycastDown(px, y + 0.6, pz, 2.2, ign); return r ? r.y : null; };
  const xa = h(x + d, z), xb = h(x - d, z), za = h(x, z + d), zb = h(x, z - d);
  out.ok = xa !== null && xb !== null && za !== null && zb !== null;
  if (!out.ok) { out.gx = 0; out.gz = 0; out.k = 0; return out; }
  const dx = (xa - xb) / (2 * d), dz = (za - zb) / (2 * d);
  const k = Math.hypot(dx, dz);
  // Stufen (Kanten) sind kein Hang
  if (k < 0.04 || k > 2.5) { out.gx = 0; out.gz = 0; out.k = 0; return out; }
  out.gx = -dx / k; out.gz = -dz / k; out.k = k;
  return out;
}

/** Fährt eine Entität auch in der Luft mit der Plattform, auf der sie zuletzt stand (bis air s nach dem Absprung). */
export class Ride {
  constructor(air = 2.5) { this.mover = null; this.airT = 0; this.air = air; }
  /** Vor moveWithGravity: in der Luft die Verschiebung der letzten Plattform übernehmen. */
  step(e, dt) {
    const g = e.ground;
    if (e.grounded && g?.mover) { this.mover = g.mover; this.airT = 0; return; }
    if (e.grounded) { this.mover = null; this.airT = 0; return; }
    if (!this.mover) return;
    this.airT += dt;
    if (this.airT > this.air) { this.mover = null; return; }
    const m = this.mover;
    e.pos.x += m.dx || 0; e.pos.z += m.dz || 0;
  }
  clear() { this.mover = null; this.airT = 0; }
}

/** Anfangsgeschwindigkeit eines Bogens von a nach b ({x, y, z}) in T s bei Schwerkraft g. */
export function arcVelocity(a, b, T, g = 40, out = {}) {
  out.x = (b.x - a.x) / T;
  out.z = (b.z - a.z) / T;
  out.y = (b.y - a.y) / T + 0.5 * g * T;
  return out;
}

/** Sternenstaub-Kranz um einen Endgegner (Nacht-Weltraum-Fassung, B-12). */
export function aura(level, owner, opts = {}) {
  if (!level.view || !hasModel('sternenstaub')) return { dispose() {}, set() {} };
  const m = getModel('sternenstaub', { radius: opts.radius ?? 1.8, height: opts.height ?? 2.4, count: opts.count ?? 22, color: opts.color });
  let k = 1, want = 1;
  const root = m.root;
  const off = level.view.add(root, (dt) => {
    const vis = owner.visible !== false && !owner.removed && owner.state !== 'gone' && owner.hp !== 0;
    want = vis ? 1 : 0;
    k += (want - k) * Math.min(1, dt * 3);
    const p = opts.at ? opts.at() : owner.pos;
    root.position.set(p.x, p.y + (opts.dy ?? 0), p.z);
    root.visible = k > 0.02;
    if (root.visible) m.update(dt, { k });
  });
  void off;
  return {
    set(v) { want = v; },
    dispose() { level.view?.remove(root); m.dispose(); },
  };
}

/** Kurz: Figur fig steht in der waagerechten Kreisfläche (c, r) und höchstens dy über/unter c.y? */
export function inCircle(fig, c, r, dy = 3) {
  return !!fig && Math.hypot(fig.pos.x - c.x, fig.pos.z - c.z) <= r && Math.abs(fig.pos.y - c.y) <= dy;
}

/** Lage aus [x, y, z] | {x, y, z} → {x, y, z}. */
export const P3 = (a, d = [0, 0, 0]) => (Array.isArray(a) ? { x: a[0] ?? d[0], y: a[1] ?? d[1], z: a[2] ?? d[2] } : a ? { x: a.x ?? d[0], y: a.y ?? d[1], z: a.z ?? d[2] } : { x: d[0], y: d[1], z: d[2] });

export { clamp as clampB };
