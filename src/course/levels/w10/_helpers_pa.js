// Hilfen für die Pilz-Remix-Level P-1 „Mondscheinwalzen am Mühlenhügel“, P-2 „Stachelranken im Abendrot“, P-3 „Spukfloß
// im Finsterdschungel“ und P-4 „Schattenspuk-Gerangel“ (kein Level: exportiert kein LEVEL, die Level-Registry überspringt
// dieses Modul). Nur für diese vier Level – andere Remix-Level haben eigene Hilfsdateien; Basislevel und gemeinsame Dateien
// bleiben unverändert. Alles Level-Lokale hängt sich über die Remix-Haken (prebuild/build/setup, level.onStep) an.
//
//   uhrenZurueck(level, id)    Zeit-Uhren erscheinen nach jedem Neustart wieder (P-1 hat keinen Checkpoint: ohne die Uhren
//                              wäre der Kurs nach einem Sturz nicht mehr zu schaffen)
//   (weitere Hilfen der Level P-2 … P-4 folgen unten)

import * as THREE from 'three';
import { lin, addStatic, addObject, box, merge } from '../../blocks/kit.js';
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

// =====================================================================================================================
// Holzbretter (P-1 oberer Weg im Mühlenkeller): fester Quader mit Brettern wie die Kellerdielen
// =====================================================================================================================

const DIELEN = [0x8a5a34, 0x7a4c2a, 0x966438, 0x6e4426, 0x845530];

/**
 * Holzbretter: list [[x, top, z, w = 2.2, d = 2.2, h = 0.4] …] – Kollisionsquader (Oberkante top) und Optik aus längs gelegten
 * Dielen (Farben der Mühlenkeller-Dielen von 2-4), dunkler Unterbau, Querleisten. In LEVEL.build aufrufen (verschmolzen).
 */
export function holzbretter(level, list, o = {}) {
  const parts = [];
  for (const [x, top, z, w = 2.2, d = 2.2, h = 0.4] of list) {
    level.world.add({ type: 'box', min: [x - w / 2, top - h, z - d / 2], max: [x + w / 2, top, z + d / 2], tag: o.tag ?? 'holzbrett' });
    if (!level.view) continue;
    parts.push(box(w - 0.08, h - 0.08, d - 0.08, x, top - h / 2 - 0.04, z, 0x4a2e1a, { r: 0.04, seg: 1 }));
    const n = Math.max(2, Math.round(w / 0.62)), bw = w / n;
    for (let i = 0; i < n; i++) {
      const c = DIELEN[(((i * 3 + Math.round(x * 7 + z * 3)) % DIELEN.length) + DIELEN.length) % DIELEN.length];
      parts.push(box(bw - 0.05, 0.1, d, x - w / 2 + bw * (i + 0.5), top - 0.05, z, c, { r: 0, seg: 0, topColor: c }));
    }
    for (const s of [-1, 1]) parts.push(box(w + 0.04, 0.14, 0.22, x, top - h + 0.12, z + s * (d / 2 - 0.3), 0x3a2414, { r: 0.03, seg: 1 }));
  }
  if (parts.length) addStatic(level, merge(parts));
}

export { THREE, lin, addStatic, addObject, CourseEntity, runAction, visDt };
