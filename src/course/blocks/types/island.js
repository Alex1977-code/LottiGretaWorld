// Baustein `island`: Insel/Plateau mit Grasdecke (runde Oberkante, leicht überstehend) und Erdkörper,
// optional mit verjüngtem Unterbau (schwebende Insel).
//
// Parameter:
//   pos:   [x, y, z]  Mitte der Unterseite (y = Unterkante)
//   size:  [w, h, d]  Breite (x), Höhe (y), Tiefe (z) – Oberseite liegt bei y + h
//   top:   'grass' (Standard) | 'stone' | 'sand' | 'rock' | 'none'
//          'none' zeichnet keine Oberseite (von oben sieht man in den Körper – nur für Teile, die niemand von oben
//          sieht); 'rock' = Felsdeckel (flache Steinplatte mit Kante und Raster in Fels-/Erdfarben des Themas, wie die
//          Felsen in 4-1/4-2): topColor/sideColor ändern die Farben, capH (0,18) die Plattendicke, cell (1) das Raster.
//   under: Meter verjüngter Unterbau unter der Unterkante (nur Optik), Standard 2.5 (0 = keiner)
//   color: Erdfarbe (Hex/Name), Standard aus dem Thema
//   ice:   true → rutschiger Boden
//   xray:  true | { min: 0.28 } → eigenes Mesh, das durchscheinend wird, solange der Block zwischen Kamera und Figur
//          steht; die Kollision trägt camIgnore (Kamera bleibt auf Abstand). view.xray (view/Xray.js); mit id liegt
//          { fade, box, mesh } unter level.named.
// Kollision: ein Quader (box) über das ganze Volumen.

import * as THREE from 'three';
import { v3, sz3, islandParts, themeOf, addStatic, addObject, merge } from '../kit.js';

/** Felsdeckel (top 'rock'): Steinplatte über x0..x1 × z0..z1 mit Oberseite y. */
export function rockLidParts(x0, y, z0, x1, z1, theme, o = {}) {
  const th = { ...theme, stone: o.topColor ?? theme.rock ?? theme.stone, stoneDark: o.sideColor ?? theme.dirt ?? theme.stoneDark };
  const cap = Math.min(o.capH ?? 0.18, 0.4);
  return islandParts(Math.min(x0, x1), y - cap, Math.min(z0, z1), Math.max(x0, x1), y, Math.max(z0, z1), th, { top: 'stone', capH: cap, under: 0, cell: o.cell ?? 1 });
}

export function buildIsland(level, spec) {
  const p = v3(spec.pos), s = sz3(spec.size, [8, 1, 8]);
  const x0 = p.x - s.x / 2, x1 = p.x + s.x / 2, z0 = p.z - s.z / 2, z1 = p.z + s.z / 2, y0 = p.y, y1 = p.y + s.y;
  const xray = spec.xray ? (spec.xray === true ? {} : spec.xray) : null;
  level.world.add({ type: 'box', min: [x0, y0, z0], max: [x1, y1, z1], ice: !!spec.ice, tag: spec.tag ?? 'island', ...(xray ? { camIgnore: true } : {}) });
  const theme = themeOf(level);
  const rock = spec.top === 'rock';
  const parts = islandParts(x0, y0, z0, x1, y1, z1, theme, { top: rock ? 'none' : spec.top, under: spec.under ?? 2.5, bodyColor: spec.color, rnd: level.rnd });
  if (rock) parts.push(...rockLidParts(x0, y1, z0, x1, z1, theme, spec));
  if (!xray) { for (const g of parts) addStatic(level, g); return; }
  const box = new THREE.Box3(new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1));
  let rec = { box, fade: 1, mesh: null };
  if (level.view) {
    const mat = (level.view.mats?.world ?? new THREE.MeshStandardMaterial({ vertexColors: true })).clone();
    const mesh = new THREE.Mesh(merge(parts), mat);
    for (const g of parts) g.dispose();
    mesh.castShadow = spec.castShadow !== false && spec.shadow !== false;
    mesh.receiveShadow = true;
    mesh.name = 'durchsicht';
    addObject(level, mesh);
    rec = level.view.xray(mesh, box, xray);
  } else for (const g of parts) g.dispose();
  if (spec.id && level.named && !level.named.has(spec.id)) level.named.set(spec.id, rec);
}

export const TYPES = { island: buildIsland };
