// Baustein `platform`: schwebende Plattform (bunter Riesenblock, Stein, Holz oder Wolke).
//
// Parameter:
//   pos:    [x, y, z]  Mitte der Unterseite
//   size:   [w, h, d]  Standard [3, 0.8, 3]
//   style:  'block' (Standard, kräftige Farbe) | 'stone' | 'wood' | 'cloud'
//   color:  Farbe (Name/Hex) für 'block', Standard 'yellow'
//   oneWay: true → nur von oben fest (durchspringbar). Wolken sind standardmäßig oneWay.
//   ice:    rutschig
// Kollision: box (mit oneWay-Flag).

import * as THREE from 'three';
import { v3, sz3, box, hex, lin, mixc, smooth, colorize, merge, themeOf, addStatic } from '../kit.js';

export function buildPlatform(level, spec) {
  const p = v3(spec.pos), s = sz3(spec.size, [3, 0.8, 3]);
  const style = spec.style ?? 'block';
  const oneWay = spec.oneWay ?? style === 'cloud';
  const th = themeOf(level);
  level.world.add({ type: 'box', min: [p.x - s.x / 2, p.y, p.z - s.z / 2], max: [p.x + s.x / 2, p.y + s.y, p.z + s.z / 2], oneWay, ice: !!spec.ice, tag: 'platform' });
  const cy = p.y + s.y / 2;
  if (style === 'cloud') {
    addStatic(level, cloudGeo(p.x, p.y, p.z, s), { castShadow: true });
    return;
  }
  let color, top;
  if (style === 'stone') { color = th.stoneDark; top = th.stone; }
  else if (style === 'wood') { color = th.woodDark; top = th.wood; }
  else { color = hex(spec.color, 0xffd23d); top = undefined; }
  const g = box(s.x, s.y, s.z, p.x, cy, p.z, color, { r: Math.min(0.18, s.y * 0.3), topColor: top });
  addStatic(level, g);
  if (style === 'block') {
    // helle Einlage oben (Spielzeug-Block-Look)
    const inset = box(Math.max(0.2, s.x - 0.5), 0.06, Math.max(0.2, s.z - 0.5), p.x, p.y + s.y + 0.02, p.z, mixHex(color, 0xffffff, 0.35), { r: 0.03 });
    addStatic(level, inset, { castShadow: false });
  }
}

function mixHex(a, b, t) {
  const ca = new THREE.Color(a), cb = new THREE.Color(b);
  return ca.lerp(cb, t).getHex();
}

/** Wolke: flache Kugelgruppe in Plattformgröße. */
function cloudGeo(x, y, z, s) {
  const parts = [];
  const white = lin(0xffffff), shade = lin(0xd8e6f4);
  const nx = Math.max(1, Math.round(s.x / 1.2)), nz = Math.max(1, Math.round(s.z / 1.2));
  for (let i = 0; i < nx; i++) {
    for (let k = 0; k < nz; k++) {
      const r = Math.min(s.x / nx, s.z / nz) * 0.75;
      const g = new THREE.SphereGeometry(r, 10, 7);
      g.scale(1, (s.y * 0.75) / r, 1);
      g.translate(x - s.x / 2 + (i + 0.5) * (s.x / nx), y + s.y * 0.55, z - s.z / 2 + (k + 0.5) * (s.z / nz));
      parts.push(colorize(g, (pp, n, o) => mixc(shade, white, smooth(-0.6, 0.6, n.y), o)));
    }
  }
  return merge(parts);
}

export const TYPES = { platform: buildPlatform };
