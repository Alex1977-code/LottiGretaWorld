// Baustein `stairs`: Treppe aus massiven Stufen (weiße Steinstufen wie im Bauplan, je 1 m).
//
// Parameter:
//   pos:    [x, y, z]  Mitte der Vorderkante der untersten Stufe, y = Fußboden
//   dir:    Aufstiegsrichtung '-z' (Standard) | '+z' | '-x' | '+x'
//   steps:  Anzahl (Standard 4)
//   rise:   Stufenhöhe (Standard 1; ≤ 0,3 wird ohne Springen hochgelaufen)
//   run:    Stufentiefe (Standard 1)
//   width:  Breite quer zur Richtung (Standard 4)
//   style:  'white' (Standard) | 'stone' | 'grass' | Farbe
// Kollision: je Stufe ein Quader vom Fußboden bis zur Stufenhöhe.

import { v3, box, hex, islandParts, themeOf, addStatic } from '../kit.js';

const DIRS = { '-z': [0, -1], '+z': [0, 1], '-x': [-1, 0], '+x': [1, 0] };

export function buildStairs(level, spec) {
  const p = v3(spec.pos);
  const [ux, uz] = DIRS[spec.dir ?? '-z'] ?? DIRS['-z'];
  const n = spec.steps ?? 4, rise = spec.rise ?? 1, run = spec.run ?? 1, w = spec.width ?? 4;
  const th = themeOf(level);
  const style = spec.style ?? 'white';
  for (let i = 0; i < n; i++) {
    const a = i * run, b = (i + 1) * run, h = rise * (i + 1);
    const cx = p.x + ux * (a + b) / 2, cz = p.z + uz * (a + b) / 2;
    const sx = ux ? run : w, sz = uz ? run : w;
    const x0 = cx - sx / 2, x1 = cx + sx / 2, z0 = cz - sz / 2, z1 = cz + sz / 2;
    level.world.add({ type: 'box', min: [x0, p.y, z0], max: [x1, p.y + h, z1], tag: 'stairs' });
    if (style === 'grass') {
      for (const g of islandParts(x0, p.y, z0, x1, p.y + h, z1, th, { under: 0, rnd: level.rnd })) addStatic(level, g);
    } else {
      const col = style === 'white' ? 0xf4f2ec : style === 'stone' ? th.stoneDark : hex(style, 0xf4f2ec);
      const top = style === 'white' ? 0xffffff : style === 'stone' ? th.stone : undefined;
      addStatic(level, box(sx, h, sz, cx, p.y + h / 2, cz, col, { r: 0.1, topColor: top }));
    }
  }
}

export const TYPES = { stairs: buildStairs };
