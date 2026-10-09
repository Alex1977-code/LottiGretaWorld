// Bausteine `room` (Raum mit Ausschnitt-Ansicht und Kristall-Luke) und `crystalfloor` (Kristallblock-Feld).
//
// room – Bonus-/Geheimraum (Bauplan 1-1 Stempel-Raum, 1-2 versteckter Raum unter Kristallblöcken, 1-5 Kistenraum):
//   Boden, Wände, Decke (oben begehbar). Ist die Figur im Raum, werden Decke und die Wand zur Kamera (+z) halb
//   durchsichtig (Ausschnitt wie im Puppenhaus); die Kamera sieht ohnehin hindurch (camIgnore).
//   pos:     [x, y, z]  Mitte des Innenraums auf Bodenhöhe (Bodenoberkante = y)
//   size:    [w, h, d]  Innenmaße (Standard [8, 4, 8])
//   wall:    0.6        Wanddicke;  floor: true (Boden 1 m dick);  ceiling: true
//   open:    ['+z']     Seiten ohne Wand: '+z' | '-z' | '+x' | '-x' (Eingänge; Standard: keine)
//   door:    { side: '-z', w: 2, h: 2.4 }  Türöffnung in einer Wand (Mitte der Seite)
//   hatch:   { at: [dx, dz] (Versatz zur Mitte), size: [w, d] (ganze Meter) }  Luke in der Decke aus Kristall-
//            blöcken (Stampfen zerbricht sie → man fällt in den Raum); Decke ist dann 1 m dick
//   top:     'grass' | 'stone' (Oberseite der Decke), style: 'stone' (Standard) | 'wood' | 'grass' | Farbe (Wände)
//   cutaway: true
//   Beispiel: { type: 'room', pos: [0, 1, -40], size: [6, 3, 6], top: 'grass', hatch: { at: [0, 0], size: [2, 2] } }
//
// crystalfloor – Feld aus Kristallblöcken (Entität crystal: Stampfen zerbricht sie):
//   { type: 'crystalfloor', pos: [x, y, z] (Mitte der Unterseite), size: [w, d] (ganze Meter) }

import * as THREE from 'three';
import { v3, sz3, box, hex, islandParts, themeOf, addStatic, addObject, merge } from '../kit.js';
import { visDt } from '../../entities/gimmick.js';

const SIDES = ['+z', '-z', '+x', '-x'];

export function buildRoom(level, spec) {
  const p = v3(spec.pos), s = sz3(spec.size, [8, 4, 8]);
  const th = themeOf(level);
  const T = spec.wall ?? 0.6;
  const open = new Set(spec.open ?? []);
  const hatch = spec.hatch ? { cx: p.x + (spec.hatch.at?.[0] ?? 0), cz: p.z + (spec.hatch.at?.[1] ?? 0), w: Math.max(1, Math.round(spec.hatch.size?.[0] ?? 2)), d: Math.max(1, Math.round(spec.hatch.size?.[1] ?? 2)) } : null;
  const CT = hatch ? 1 : T;
  const x0 = p.x - s.x / 2, x1 = p.x + s.x / 2, z0 = p.z - s.z / 2, z1 = p.z + s.z / 2, y0 = p.y, y1 = p.y + s.y;
  const wallCol = spec.style === 'wood' ? th.woodDark : spec.style === 'grass' ? th.dirt : hex(spec.style && spec.style !== 'stone' ? spec.style : undefined, th.stoneDark);
  const staticParts = [], fadeParts = [];
  const solid = (b, fade, opts = {}) => {
    level.world.add({ type: 'box', min: [b[0], b[1], b[2]], max: [b[3], b[4], b[5]], camIgnore: fade || !!opts.camIgnore, tag: 'room' });
    const g = box(b[3] - b[0], b[4] - b[1], b[5] - b[2], (b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2, opts.color ?? wallCol, { r: 0.08, topColor: opts.top });
    (fade ? fadeParts : staticParts).push(g);
  };
  // Boden
  if (spec.floor !== false) {
    level.world.add({ type: 'box', min: [x0 - T, y0 - 1, z0 - T], max: [x1 + T, y0, z1 + T], tag: 'room:boden' });
    for (const g of islandParts(x0 - T, y0 - 1, z0 - T, x1 + T, y0, z1 + T, th, { top: 'stone', under: 0, rnd: level.rnd })) staticParts.push(g);
  }
  // Wände (mit optionaler Tür)
  const door = spec.door ? { side: spec.door.side ?? '-z', w: spec.door.w ?? 2, h: spec.door.h ?? 2.4 } : null;
  const wallBox = (side) => {
    if (side === '+z') return [x0 - T, y0, z1, x1 + T, y1, z1 + T];
    if (side === '-z') return [x0 - T, y0, z0 - T, x1 + T, y1, z0];
    if (side === '+x') return [x1, y0, z0, x1 + T, y1, z1];
    return [x0 - T, y0, z0, x0, y1, z1];
  };
  for (const side of SIDES) {
    if (open.has(side)) continue;
    const b = wallBox(side);
    const fade = side === '+z' && spec.cutaway !== false;
    if (door && door.side === side) {
      const alongX = side === '+z' || side === '-z';
      const c = alongX ? p.x : p.z;
      const lo = alongX ? b[0] : b[2], hi = alongX ? b[3] : b[5];
      const dl = c - door.w / 2, dh = c + door.w / 2;
      const seg = (a, z) => (alongX ? [a, b[1], b[2], z, b[4], b[5]] : [b[0], b[1], a, b[3], b[4], z]);
      solid(seg(lo, dl), fade); solid(seg(dh, hi), fade);
      const lintel = alongX ? [dl, y0 + door.h, b[2], dh, b[4], b[5]] : [b[0], y0 + door.h, dl, b[3], b[4], dh];
      if (lintel[4] - lintel[1] > 0.05) solid(lintel, fade);
    } else solid(b, fade);
  }
  // Decke (mit Luke)
  if (spec.ceiling !== false) {
    const cx0 = x0 - T, cx1 = x1 + T, cz0 = z0 - T, cz1 = z1 + T, top = spec.top === 'stone' ? th.stone : th.grassTop;
    const slab = (a, b) => {
      if (a[0] >= b[0] - 1e-3 || a[2] >= b[2] - 1e-3) return;
      level.world.add({ type: 'box', min: [a[0], y1, a[2]], max: [b[0], y1 + CT, b[2]], camIgnore: true, tag: 'room:decke' });
      const parts = spec.top ? islandParts(a[0], y1, a[2], b[0], y1 + CT, b[2], th, { top: spec.top, under: 0, rnd: level.rnd })
        : [box(b[0] - a[0], CT, b[2] - a[2], (a[0] + b[0]) / 2, y1 + CT / 2, (a[2] + b[2]) / 2, wallCol, { r: 0.08, topColor: top })];
      fadeParts.push(...parts);
    };
    if (hatch) {
      const hx0 = hatch.cx - hatch.w / 2, hx1 = hatch.cx + hatch.w / 2, hz0 = hatch.cz - hatch.d / 2, hz1 = hatch.cz + hatch.d / 2;
      slab([cx0, 0, cz0], [cx1, 0, hz0]);
      slab([cx0, 0, hz1], [cx1, 0, cz1]);
      slab([cx0, 0, hz0], [hx0, 0, hz1]);
      slab([hx1, 0, hz0], [cx1, 0, hz1]);
      buildCrystalFloor(level, { pos: [hatch.cx, y1, hatch.cz], size: [hatch.w, hatch.d] });
    } else slab([cx0, 0, cz0], [cx1, 0, cz1]);
  }
  if (staticParts.length) addStatic(level, merge(staticParts));
  // Ausschnitt-Teile: eigenes Mesh mit eigenem Material (wird durchsichtig, solange die Figur im Raum ist)
  if (fadeParts.length && level.view) {
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, transparent: false, opacity: 1 });
    const mesh = new THREE.Mesh(merge(fadeParts), mat);
    mesh.name = 'raum:ausschnitt';
    mesh.castShadow = true; mesh.receiveShadow = true;
    let k = 1;
    const vis = {};
    addObject(level, mesh, (dt) => {
      dt = visDt(level, vis, dt);
      const pl = level.player;
      const inside = spec.cutaway !== false && pl && pl.pos.x > x0 && pl.pos.x < x1 && pl.pos.z > z0 && pl.pos.z < z1 && pl.pos.y >= y0 - 0.5 && pl.pos.y < y1;
      k += ((inside ? 0.18 : 1) - k) * Math.min(1, dt * 8);
      const fading = k < 0.995;
      mat.transparent = fading; mat.opacity = k; mat.depthWrite = !fading;
      mesh.castShadow = !fading;
    });
  } else for (const g of fadeParts) g.dispose();
  return { x0, x1, z0, z1, y0, y1 };
}

export function buildCrystalFloor(level, spec) {
  const p = v3(spec.pos);
  const [w, d] = spec.size ?? [2, 2];
  const n = Math.max(1, Math.round(w)), m = Math.max(1, Math.round(d));
  const out = [];
  for (let i = 0; i < n; i++) for (let k = 0; k < m; k++) out.push(level.spawn('crystal', { pos: [p.x - n / 2 + i + 0.5, p.y, p.z - m / 2 + k + 0.5] }));
  return out;
}

export const TYPES = { room: buildRoom, crystalfloor: buildCrystalFloor };
