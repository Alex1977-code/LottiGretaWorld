// Baustein `ramp`: Rampe (Keil) mit Grasdecke.
//
// Parameter:
//   pos:   [x, y, z]  Mitte der Unterseite
//   size:  [w, h, d]  Grundfläche w × d, Höhe h am oberen Ende
//   axis:  'z' (Standard) | 'x'   Richtung des Anstiegs
//   dir:   -1 (Standard: steigt nach −Z bzw. −X) | +1
//   low:   Höhe der Oberseite am unteren Ende über pos.y (Standard 0 = Keil)
//   top:   'grass' (Standard) | 'stone'
// Kollision: ramp (bis 50° begehbar; ab ~37° rutscht die Figur ab, Ducken rutscht immer hangabwärts).

import { v3, sz3, wedge, themeOf, addStatic } from '../kit.js';

export function buildRamp(level, spec) {
  const p = v3(spec.pos), s = sz3(spec.size, [4, 2, 6]);
  const axis = spec.axis === 'x' ? 'x' : 'z';
  const dir = spec.dir > 0 ? 1 : -1;
  const th = themeOf(level);
  const x0 = p.x - s.x / 2, x1 = p.x + s.x / 2, z0 = p.z - s.z / 2, z1 = p.z + s.z / 2;
  const lowY = p.y + (spec.low ?? 0);
  level.world.add({ type: 'ramp', min: [x0, p.y, z0], max: [x1, p.y + s.y, z1], axis, dir, low: lowY, ice: !!spec.ice, tag: 'ramp' });
  const top = spec.top === 'stone' ? th.stone : th.grassTop;
  const side = spec.top === 'stone' ? th.stoneDark : th.dirt;
  addStatic(level, wedge(x0, p.y, z0, x1, p.y + s.y, z1, axis, dir, lowY, top, side));
}

export const TYPES = { ramp: buildRamp };
