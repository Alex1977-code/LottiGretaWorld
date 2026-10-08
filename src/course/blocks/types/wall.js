// Baustein `wall`: Mauer – für Wandsprünge, als Kletterwand (Krallen-Anzug) oder Begrenzung.
//
// Parameter:
//   pos:        [x, y, z]  Mitte der Unterseite
//   size:       [w, h, d]  Standard [6, 5, 1]
//   climbable:  true → Kletterwand (`climbable`-Flag; nur mit Krallen-Anzug hochkletterbar, sonst Wandrutschen)
//   style:      'stone' (Standard) | 'climb' (Standard bei climbable: helle Wand mit Krallen-Griffmulden) |
//               'grass' (Erd-/Graswand) | Farbe
//   noWallSlide: true → kein Wandrutschen (glatte Wand)
//   camIgnore:  true → die Kamera darf hindurch (dünne Wände)
// Kollision: box.

import { v3, sz3, box, hex, islandParts, themeOf, addStatic, merge } from '../kit.js';

const FLAT = { r: 0, seg: 0 }; // Kleinteile: schlichte Quader (12 Dreiecke)

export function buildWall(level, spec) {
  const p = v3(spec.pos), s = sz3(spec.size, [6, 5, 1]);
  const th = themeOf(level);
  const climbable = !!spec.climbable;
  const style = spec.style ?? (climbable ? 'climb' : 'stone');
  const x0 = p.x - s.x / 2, x1 = p.x + s.x / 2, z0 = p.z - s.z / 2, z1 = p.z + s.z / 2, y0 = p.y, y1 = p.y + s.y;
  level.world.add({ type: 'box', min: [x0, y0, z0], max: [x1, y1, z1], climbable, noWallSlide: !!spec.noWallSlide, camIgnore: !!spec.camIgnore, tag: climbable ? 'climbwall' : 'wall' });
  if (style === 'grass') {
    for (const g of islandParts(x0, y0, z0, x1, y1, z1, th, { under: 0, rnd: level.rnd })) addStatic(level, g);
    return;
  }
  const parts = [];
  if (style === 'climb') {
    parts.push(box(s.x, s.y, s.z, p.x, p.y + s.y / 2, p.z, th.climb, { r: 0.12, topColor: 0xfff3d6 }));
    // Griffmulden: kleine dunkle Kerben in Reihen auf allen senkrechten Seiten (Kletterwand gut erkennbar)
    const step = 0.8;
    const ny = Math.floor((s.y - 0.4) / step);
    const marks = (len, fn) => { const n = Math.floor((len - 0.4) / step); for (let i = 0; i < n; i++) for (let j = 0; j < ny; j++) fn(-len / 2 + 0.2 + step * (i + 0.5) + (j % 2 ? step * 0.25 : -step * 0.25), y0 + 0.3 + step * (j + 0.5)); };
    marks(s.x, (u, y) => {
      parts.push(box(0.28, 0.1, 0.06, p.x + u, y, z1 + 0.01, th.climbDark, FLAT));
      parts.push(box(0.28, 0.1, 0.06, p.x + u, y, z0 - 0.01, th.climbDark, FLAT));
    });
    marks(s.z, (u, y) => {
      parts.push(box(0.06, 0.1, 0.28, x1 + 0.01, y, p.z + u, th.climbDark, FLAT));
      parts.push(box(0.06, 0.1, 0.28, x0 - 0.01, y, p.z + u, th.climbDark, FLAT));
    });
  } else {
    const col = style === 'stone' ? th.stoneDark : hex(style, th.stoneDark);
    parts.push(box(s.x, s.y, s.z, p.x, p.y + s.y / 2, p.z, col, { r: 0.1, topColor: style === 'stone' ? th.stone : undefined }));
    // Fugen: waagerechte Linien auf den breiten Seiten
    for (let y = y0 + 1; y < y1 - 0.3; y += 1) {
      if (s.x >= s.z) {
        parts.push(box(s.x - 0.1, 0.05, 0.03, p.x, y, z1 + 0.005, 0x8d909b, FLAT));
        parts.push(box(s.x - 0.1, 0.05, 0.03, p.x, y, z0 - 0.005, 0x8d909b, FLAT));
      } else {
        parts.push(box(0.03, 0.05, s.z - 0.1, x1 + 0.005, y, p.z, 0x8d909b, FLAT));
        parts.push(box(0.03, 0.05, s.z - 0.1, x0 - 0.005, y, p.z, 0x8d909b, FLAT));
      }
    }
  }
  addStatic(level, merge(parts));
}

export const TYPES = { wall: buildWall };
