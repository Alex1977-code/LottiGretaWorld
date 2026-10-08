// Baustein `bridge`: weiße Holzbrücke zwischen zwei Punkten (Planken quer, Seitenbalken, Geländer).
//
// Parameter:
//   from, to: [x, y, z]  Lauffläche an Anfang und Ende (y = Oberseite der Planken)
//   width:    Breite in m (Standard 2)
//   rails:    Geländer (Standard true, nur Optik – keine Kollision)
//   color:    Plankenfarbe (Standard: Thema wood = weiß)
// Kollision: achsenparallel (gleiches x oder gleiches z) als Quader bzw. Rampe bei Höhenunterschied;
// schräge Brücken werden in 0,5-m-Stücke zerlegt (Treppchen ≤ 0,3 m werden automatisch hochgegangen).
// Dicke 0,3 m.

import * as THREE from 'three';
import { v3, box, hex, themeOf, addStatic, merge } from '../kit.js';

const T = 0.3;

export function buildBridge(level, spec) {
  const a = v3(spec.from), b = v3(spec.to);
  const w = spec.width ?? 2;
  const th = themeOf(level);
  const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz);
  if (L < 0.01) return;
  const ux = dx / L, uz = dz / L;
  const yaw = Math.atan2(-uz, ux); // Längsachse → +X des Bauteils
  // --- Kollision
  const alongZ = Math.abs(dx) < 1e-3, alongX = Math.abs(dz) < 1e-3;
  if (alongZ || alongX) {
    const hw = w / 2;
    const min = alongZ ? [a.x - hw, Math.min(a.y, b.y) - T, Math.min(a.z, b.z)] : [Math.min(a.x, b.x), Math.min(a.y, b.y) - T, a.z - hw];
    const max = alongZ ? [a.x + hw, Math.max(a.y, b.y), Math.max(a.z, b.z)] : [Math.max(a.x, b.x), Math.max(a.y, b.y), a.z + hw];
    if (Math.abs(a.y - b.y) < 1e-3) level.world.add({ type: 'box', min, max, tag: 'bridge' });
    else {
      const axis = alongZ ? 'z' : 'x';
      const rising = (b.y > a.y) === (axis === 'z' ? b.z > a.z : b.x > a.x) ? 1 : -1;
      level.world.add({ type: 'ramp', min, max, axis, dir: rising, low: Math.min(a.y, b.y), tag: 'bridge' });
    }
  } else {
    const n = Math.ceil(L / 0.5);
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n, tm = (t0 + t1) / 2;
      const cx = a.x + dx * tm, cz = a.z + dz * tm, y = a.y + (b.y - a.y) * tm;
      const hx = (Math.abs(ux) * (L / n) + Math.abs(uz) * w) / 2, hz = (Math.abs(uz) * (L / n) + Math.abs(ux) * w) / 2;
      level.world.add({ type: 'box', min: [cx - hx, y - T, cz - hz], max: [cx + hx, y, cz + hz], tag: 'bridge' });
    }
  }
  // --- Optik: Planken, Seitenbalken, Geländer (lokal entlang +X gebaut, dann gedreht)
  const parts = [];
  const plank = hex(spec.color, th.wood), dark = th.woodDark;
  const slope = (b.y - a.y) / L;
  const pitch = Math.atan(slope);
  const np = Math.max(1, Math.floor(L / 0.5));
  for (let i = 0; i < np; i++) {
    const t = (i + 0.5) / np;
    const g = box(0.44, 0.14, w, 0, 0, 0, plank, { r: 0.04, topColor: 0xffffff });
    g.rotateZ(pitch);
    g.translate(t * L, slope * t * L - 0.07, 0);
    parts.push(g);
  }
  for (const s of [-1, 1]) {
    const beam = box(L + 0.2, 0.24, 0.16, 0, 0, 0, dark, { r: 0.05 });
    beam.rotateZ(pitch);
    beam.translate(L / 2, slope * L / 2 - 0.2, s * (w / 2 - 0.08));
    parts.push(beam);
  }
  if (spec.rails !== false) {
    const nPost = Math.max(2, Math.round(L / 2) + 1);
    for (const s of [-1, 1]) {
      for (let i = 0; i < nPost; i++) {
        const t = i / (nPost - 1);
        const post = box(0.14, 0.75, 0.14, t * L, slope * t * L + 0.37, s * (w / 2 - 0.06), plank, { r: 0.05 });
        parts.push(post);
      }
      const rail = box(L, 0.1, 0.12, 0, 0, 0, plank, { r: 0.04, topColor: 0xffffff });
      rail.rotateZ(pitch);
      rail.translate(L / 2, slope * L / 2 + 0.72, s * (w / 2 - 0.06));
      parts.push(rail);
    }
  }
  const g = merge(parts);
  g.rotateY(yaw);
  g.translate(a.x, a.y, a.z);
  addStatic(level, g);
}

export const TYPES = { bridge: buildBridge };
