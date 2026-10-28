// Hilfen der Welt-7-Gegner „Lava-Festung“ (Präzisierung Gegner Welt 7). Liegt außerhalb von kinds/ (die Registry sammelt nur
// kinds/*.js).
//
//   HOT_KILL        Angriffe, die „heiße“ Gegner (Platschfisch, Lavadrache, Funkenflämmchen) besiegen: Power-ups und Wurfsichel
//                   (claw = Tatzenhieb/Schwanzhieb/Sturzflug, sichel, shell, throw, cannon, bomb, mega, star, punch, bite, crush,
//                   pow). **Feuer prallt ab**, Draufspringen/Stampfen verletzt (heiß!), Stampfwelle daneben und Rutschen wirken
//                   nicht.
//   SICHEL          'sichel' – eigene Treffer-Art (Altlast/Tests). Die Wurfsichel des Motors trifft Gegner mit onHit('throw', sichel)
//                   (sichel.sichel === true, sichel.owner = Figur) bzw. onSichelHit(sichel), falls definiert (Präzisierung
//                   Motor und Bausteine Welt 7); isSichel(kind, source) erkennt beides.
//   hurtsFrom(contact)  Berührung heißer Gegner: immer Treffer der Figur (auch von oben); Sturzflug (Krallen) ist ein Angriff.
//   lavaAt(level, x, z, y0, y1)  Lava-Form (kill 'lava') unter (x, z) zwischen y0 und y1 → { shape, top } | null
//   lavaSurface(level, x, z, near)  sichtbare Lava-Oberfläche an (x, z) bis near + 8 (folgt lavaspiegel; lavaTopAt aus
//                   blocks/w7kit.js) | null;  lavaColor(level, x, z) → 'rot' | 'blau' (lavaColorAt)
//   waterTop(level, x, y, z)     Wasserform um den Punkt → { shape, top, bottom } | null (Wasserspiegel folgt steigendem Wasser)
//   arcVel(a, b, T, g)           Anfangsgeschwindigkeit eines Wurfbogens von a nach b in T s bei Schwerkraft g
//   phaseOf(level, id, fb)       Phase eines Endgegners (level.named.get(id).phase) oder fb

import { lavaTopAt, lavaColorAt } from '../blocks/w7kit.js';

export const SICHEL = 'sichel';
/** Treffer der Wurfsichel? (eigene Art 'sichel' oder onHit('throw', sichel) des Motors) */
export const isSichel = (kind, source) => kind === 'sichel' || !!source?.sichel;

/** Sichtbare Lava-Oberfläche an (x, z) höchstens near + 8 (lavaTopAt) | null. */
export function lavaSurface(level, x, z, near = 0) { return lavaTopAt(level, x, z, near + 8); }
/** Farbe der Lava an (x, z): 'rot' | 'blau'. */
export function lavaColor(level, x, z) { return lavaColorAt(level, x, z); }
export const HOT_KILL = new Set(['claw', 'sichel', 'shell', 'throw', 'cannon', 'bomb', 'mega', 'star', 'punch', 'bite', 'crush', 'pow']);

/** Heißer Gegner berührt: 'attack' (Krallen-Sturzflug trifft ihn) oder 'hurt'. */
export function hurtsFrom(contact) {
  if (contact?.dive) return 'attack';
  return 'hurt';
}

/** Lava-Form unter (x, z) zwischen y0 und y1 → { shape, top } | null. */
export function lavaAt(level, x, z, y0, y1) {
  const cy = (y0 + y1) / 2, hy = Math.max(0.05, (y1 - y0) / 2);
  let best = null;
  for (const s of level.world.overlapAABB({ x, y: cy, z }, { x: 0.05, y: hy, z: 0.05 })) {
    if (s.kill !== 'lava') continue;
    if (!best || s.top > best.top) best = s;
  }
  return best ? { shape: best, top: best.top } : null;
}

/** Wasserform um (x, y, z) (Punkt im Wasser oder bis 0,6 m darüber) → { shape, top, bottom } | null. */
export function waterTop(level, x, y, z) {
  let best = null;
  for (const s of level.world.overlapAABB({ x, y: y - 0.3, z }, { x: 0.05, y: 0.9, z: 0.05 })) {
    if (!s.water) continue;
    if (!best || s.top > best.top) best = s;
  }
  return best ? { shape: best, top: best.top, bottom: best.bot ?? best.top - 1 } : null;
}

/** Anfangsgeschwindigkeit eines Bogens von a nach b ({x, y, z}) in T s bei Schwerkraft g. */
export function arcVel(a, b, T, g = 40) {
  return { x: (b.x - a.x) / T, y: (b.y - a.y + 0.5 * g * T * T) / T, z: (b.z - a.z) / T };
}

/** Phase des Endgegners id (1..3) oder fb. */
export function phaseOf(level, id, fb = 1) {
  const b = id ? level.named?.get(id) : null;
  return b && Number.isFinite(b.phase) ? b.phase : fb;
}
