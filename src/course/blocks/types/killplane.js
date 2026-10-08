// Baustein `killplane`: unsichtbare Absturzebene – alles darunter ist Abgrund (Tod, Neustart am Checkpoint).
//
//   y:    Höhe der Ebene (Standard −20)
//   pos:  optional [x, y, z] Mitte, size: optional [w, d] (Standard: 4 km × 4 km)
// Kollision: flache Form mit kill = 'fall'. Ohne killplane gilt level.killY (Level-Umriss − 14 m).

import { v3 } from '../kit.js';

export function buildKillplane(level, spec) {
  const y = spec.y ?? spec.pos?.[1] ?? -20;
  const c = spec.pos ? v3(spec.pos) : { x: 0, z: -500 };
  const [w, d] = spec.size ?? [4000, 4000];
  level.world.add({ type: 'box', min: [c.x - w / 2, y - 50, c.z - d / 2], max: [c.x + w / 2, y, c.z + d / 2], kill: 'fall', solid: false, camIgnore: true, tag: 'killplane' });
}

export const TYPES = { killplane: buildKillplane };
