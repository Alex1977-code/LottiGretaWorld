// Baustein `track`: Bahngleis für Autoscroller mit Wagen/Zügen (3-Zug, 5-Zug, 8-Zug, Testlevel 0-4) – zwei
// Schienen auf Schwellen, optional auf einem hölzernen Gerüst (Trestle-Brücke über einer Schlucht) und mit
// Prellbock. Reine Optik (statisch verschmolzen); mit `solid: true` ist das Gleisbett begehbar.
//
//   path:     [[x, y, z], …]  Schienenoberkante (gerade Abschnitte; gleiche Linie wie LEVEL.scroll.path nutzbar)
//   from/to:  statt path: zwei Punkte
//   gauge:    2.4   Abstand der Schienen (m)
//   sleepers: 0.9   Abstand der Schwellen (0 = keine)
//   trestle:  { bottom: −30, every: 8, width: 3.2 } | false   Gerüst-Joche bis zur Höhe bottom
//   buffer:   'end' | 'start' | 'both' | null   Prellbock (rot-weiß) am Ende/Anfang
//   solid:    false  Gleisbett als begehbare Fläche (Breite gauge + 0.8, 0,3 m unter der Schienenoberkante)
//   from/upto: m – nur diesen Bereich der Pfadlänge zeigen (Standard: ganzer Pfad)
//   color:    Schienenfarbe (Standard grau-blau)
// Beispiel: { type: 'track', path: [[0, 0, 10], [0, 0, -140]], trestle: { bottom: -30 }, buffer: 'end' }

import { box, hex, addStatic, merge } from '../kit.js';

export function buildTrack(level, spec) {
  const pts = spec.path ?? [spec.from ?? [0, 0, 0], spec.to ?? [0, 0, -20]];
  const gauge = spec.gauge ?? 2.4;
  const every = spec.sleepers ?? 0.9;
  const rail = hex(spec.color, 0x8a8fa8), tie = 0x8a5a36, wood = 0xa86f42, woodDark = 0x7a4c2c;
  const tr = spec.trestle === false || spec.trestle === undefined ? null : { bottom: -30, every: 8, width: gauge + 0.8, ...(spec.trestle === true ? {} : spec.trestle) };
  const parts = [];
  let S = 0;
  const lo = spec.from === undefined || Array.isArray(spec.from) ? 0 : spec.from;
  const hi = spec.upto ?? Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const L = Math.hypot(dx, dy, dz);
    if (L < 1e-6) continue;
    const s0 = Math.max(0, lo - S), s1 = Math.min(L, hi - S);
    S += L;
    if (s1 <= s0) continue;
    const yaw = Math.atan2(dx, dz);
    const ux = dx / L, uy = dy / L, uz = dz / L;
    const rx = Math.cos(yaw), rz = -Math.sin(yaw);       // rechts quer zur Fahrt
    const at = (s) => [a[0] + ux * s, a[1] + uy * s, a[2] + uz * s];
    const len = s1 - s0, mid = at((s0 + s1) / 2);
    const place = (g, x, y, z) => { g.rotateY(yaw); g.translate(x, y, z); return g; };
    // Schienen
    for (const sd of [-1, 1]) parts.push(place(box(0.14, 0.16, len, 0, -0.08, 0, rail, { r: 0.03, seg: 1, topColor: 0xd8dce8 }), mid[0] + rx * sd * gauge / 2, mid[1], mid[2] + rz * sd * gauge / 2));
    // Schwellen
    if (every > 0) {
      for (let s = s0 + every / 2; s < s1; s += every) {
        const p = at(s);
        parts.push(place(box(gauge + 0.8, 0.14, 0.3, 0, -0.23, 0, tie, { r: 0.03, seg: 0 }), p[0], p[1], p[2]));
      }
    }
    // Gerüst: Längsträger + Joche
    if (tr) {
      for (const sd of [-1, 1]) parts.push(place(box(0.32, 0.36, len, 0, -0.48, 0, woodDark, { r: 0.04, seg: 0 }), mid[0] + rx * sd * (gauge / 2 - 0.2), mid[1], mid[2] + rz * sd * (gauge / 2 - 0.2)));
      const first = Math.ceil((S - L + s0) / tr.every) * tr.every - (S - L);
      for (let s = first; s <= s1 + 1e-6; s += tr.every) {
        const p = at(s);
        const top = p[1] - 0.66, h = top - tr.bottom;
        if (h <= 0.2) continue;
        parts.push(place(box(tr.width, 0.4, 0.45, 0, top - 0.2, 0, wood, { r: 0.05, seg: 0 }), p[0], 0, p[2]));
        for (const sd of [-1, 1]) {
          const w2 = tr.width / 2 - 0.2;
          parts.push(place(box(0.36, h - 0.4, 0.36, 0, tr.bottom + (h - 0.4) / 2, 0, wood, { r: 0.05, seg: 0 }), p[0] + rx * sd * w2, 0, p[2] + rz * sd * w2));
        }
        for (let y = top - 4.5; y > tr.bottom + 1; y -= 5) parts.push(place(box(tr.width, 0.22, 0.24, 0, y, 0, woodDark, { r: 0.03, seg: 0 }), p[0], 0, p[2]));
      }
    }
    if (spec.solid) {
      level.world.add({ type: 'box', min: [Math.min(a[0], b[0]) - (gauge / 2 + 0.4) * Math.abs(rx), Math.min(a[1], b[1]) - 0.6, Math.min(a[2], b[2]) - (gauge / 2 + 0.4) * Math.abs(rz)], max: [Math.max(a[0], b[0]) + (gauge / 2 + 0.4) * Math.abs(rx), Math.max(a[1], b[1]) - 0.3, Math.max(a[2], b[2]) + (gauge / 2 + 0.4) * Math.abs(rz)], tag: 'track' });
    }
  }
  // Prellböcke
  const buf = spec.buffer;
  const bufferAt = (p, q) => {
    const yaw = Math.atan2(p[0] - q[0], p[2] - q[2]);
    const g = merge([
      box(gauge + 0.6, 0.7, 0.5, 0, 0.35, 0, 0xe8463c, { r: 0.08 }),
      box(gauge + 0.7, 0.18, 0.52, 0, 0.55, 0, 0xffffff, { r: 0.04, seg: 0 }),
      box(0.4, 0.4, 0.3, -gauge / 2 + 0.2, 0.5, -0.35, 0x3a3644, { r: 0.1 }), box(0.4, 0.4, 0.3, gauge / 2 - 0.2, 0.5, -0.35, 0x3a3644, { r: 0.1 }),
    ]);
    g.rotateY(yaw); g.translate(p[0], p[1] - 0.25, p[2]);
    parts.push(g);
  };
  if (buf === 'end' || buf === 'both') bufferAt(pts[pts.length - 1], pts[pts.length - 2]);
  if (buf === 'start' || buf === 'both') bufferAt(pts[0], pts[1]);
  if (parts.length) addStatic(level, merge(parts), { castShadow: true });
}

export const TYPES = { track: buildTrack };
