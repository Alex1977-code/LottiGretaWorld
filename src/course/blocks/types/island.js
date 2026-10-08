// Baustein `island`: Insel/Plateau mit Grasdecke (runde Oberkante, leicht überstehend) und Erdkörper,
// optional mit verjüngtem Unterbau (schwebende Insel).
//
// Parameter:
//   pos:   [x, y, z]  Mitte der Unterseite (y = Unterkante)
//   size:  [w, h, d]  Breite (x), Höhe (y), Tiefe (z) – Oberseite liegt bei y + h
//   top:   'grass' (Standard) | 'stone' | 'sand' | 'none'
//   under: Meter verjüngter Unterbau unter der Unterkante (nur Optik), Standard 2.5 (0 = keiner)
//   color: Erdfarbe (Hex/Name), Standard aus dem Thema
//   ice:   true → rutschiger Boden
// Kollision: ein Quader (box) über das ganze Volumen.

import { v3, sz3, islandParts, themeOf, addStatic } from '../kit.js';

export function buildIsland(level, spec) {
  const p = v3(spec.pos), s = sz3(spec.size, [8, 1, 8]);
  const x0 = p.x - s.x / 2, x1 = p.x + s.x / 2, z0 = p.z - s.z / 2, z1 = p.z + s.z / 2, y0 = p.y, y1 = p.y + s.y;
  level.world.add({ type: 'box', min: [x0, y0, z0], max: [x1, y1, z1], ice: !!spec.ice, tag: spec.tag ?? 'island' });
  const parts = islandParts(x0, y0, z0, x1, y1, z1, themeOf(level), { top: spec.top, under: spec.under ?? 2.5, bodyColor: spec.color, rnd: level.rnd });
  for (const g of parts) addStatic(level, g);
}

export const TYPES = { island: buildIsland };
