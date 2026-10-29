// Hilfen für die Pilz-Remix-Level P-1 „Mondscheinwalzen am Mühlenhügel“, P-2 „Stachelranken im Abendrot“, P-3 „Spukfloß
// im Finsterdschungel“ und P-4 „Schattenspuk-Gerangel“ (kein Level: exportiert kein LEVEL, die Level-Registry überspringt
// dieses Modul). Nur für diese vier Level – andere Remix-Level haben eigene Hilfsdateien; Basislevel und gemeinsame Dateien
// bleiben unverändert. Alles Level-Lokale hängt sich über die Remix-Haken (prebuild/build/setup, level.onStep) an.
//
//   uhrenZurueck(level, id)    Zeit-Uhren erscheinen nach jedem Neustart wieder (P-1 hat keinen Checkpoint: ohne die Uhren
//                              wäre der Kurs nach einem Sturz nicht mehr zu schaffen)
//   (weitere Hilfen der Level P-2 … P-4 folgen unten)

import * as THREE from 'three';
import { lin, addStatic, addObject } from '../../blocks/kit.js';
import { CourseEntity } from '../../entities/CourseEntity.js';
import { runAction, visDt } from '../../entities/gimmick.js';

/** Münzen in einer Reihe. */
export const line = (from, to, n) => ({ kind: 'coins', from, to, n });
/** Münzring um pos. */
export const ring = (pos, r, n) => ({ kind: 'coins', pos, r, n });
/** Münzbogen von a nach b mit Scheitel h über der Verbindungslinie. */
export function arc(a, b, n, h = 2) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    out.push({ kind: 'coin', pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * h * t * (1 - t), a[2] + (b[2] - a[2]) * t] });
  }
  return out;
}
/** Insel über ihre Grundfläche x0..x1, zA..zB, Oberseite top, Höhe h. */
export function isl(x0, x1, zA, zB, top, h = 3, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  return { type: 'island', pos: [(x0 + x1) / 2, top - h, (z0 + z1) / 2], size: [x1 - x0, h, z0 - z1], ...o };
}
/** Holzbrett (platform style wood) mit Oberkante top. */
export const plank = (x, top, z, w = 2.2, d = 2.2, h = 0.4, o = {}) => ({ type: 'platform', style: 'wood', pos: [x, top - h, z], size: [w, h, d], ...o });

// =====================================================================================================================
// P-1: Zeit-Uhren nach einem Neustart wieder da
// =====================================================================================================================

/** Nach jedem Neustart (Sturz, Zeit um) erscheinen alle Zeit-Uhren der Gruppe id wieder. → Zahl der Neustarts. */
export function uhrenZurueck(level, id) {
  const rt = level.runtime, h = level.named.get(id);
  if (!rt || !h || rt._uhrenZurueck) return;
  rt._uhrenZurueck = true;
  const orig = rt.respawn.bind(rt);
  h.resets = 0;
  rt.respawn = () => {
    for (const it of h.items) { it.taken = false; it.pop = 0; }
    h.resets++;
    return orig();
  };
}

export { THREE, lin, addStatic, addObject, CourseEntity, runAction, visDt };
