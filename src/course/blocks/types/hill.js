// Bausteine `hill` (Stufenhügel) und `mound` (sanfter Hügel).
//
// hill – runde Terrassen wie eine Hochzeitstorte (Sprung je Stufe):
//   pos:    [x, y, z]  Mitte der Unterseite
//   radius: Radius der untersten Terrasse (Standard 6)
//   height: Gesamthöhe (Standard 3)
//   steps:  Zahl der Terrassen (Standard 3; Stufenhöhe = height / steps)
// Kollision: je Terrasse ein Zylinder (cyl).
//
// mound – sanfte Kuppel, ohne Springen begehbar:
//   pos, radius (Standard 5), height (Standard 1.5)
// Kollision: Zylinder-Ringe in 0,25-m-Stufen (werden automatisch hochgegangen), Optik als glatte Kuppel.

import * as THREE from 'three';
import { v3, disc, lin, mixc, smooth, colorize, hex, themeOf, addStatic } from '../kit.js';

export function buildHill(level, spec) {
  const p = v3(spec.pos);
  const R = spec.radius ?? 6, H = spec.height ?? 3, n = Math.max(1, spec.steps ?? 3);
  const th = themeOf(level);
  const h = H / n;
  for (let i = 0; i < n; i++) {
    const r = R * (1 - (i / n) * 0.75);
    const y0 = p.y + i * h;
    level.world.add({ type: 'cyl', x: p.x, z: p.z, r, y0: p.y, y1: y0 + h, tag: 'hill' });
    addStatic(level, disc(p.x, i === 0 ? p.y : y0 - 0.02, p.z, r, i === 0 ? h : h + 0.02, th.grassTop, th.dirt, 32));
  }
}

export function buildMound(level, spec) {
  const p = v3(spec.pos);
  const R = spec.radius ?? 5, H = spec.height ?? 1.5;
  const th = themeOf(level);
  // Kuppelprofil: y(r) = H · (1 − (r/R)²)^0.8
  const yAt = (r) => H * Math.pow(Math.max(0, 1 - (r / R) * (r / R)), 0.8);
  const rAt = (y) => R * Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, y) / H, 1 / 0.8)));
  const stepH = 0.25;
  const n = Math.max(1, Math.ceil(H / stepH));
  for (let i = 0; i < n; i++) {
    const yTop = Math.min(H, (i + 1) * stepH);
    const r = rAt(yTop - stepH * 0.5);
    if (r < 0.2) continue;
    level.world.add({ type: 'cyl', x: p.x, z: p.z, r, y0: p.y, y1: p.y + yTop, tag: 'mound' });
  }
  const g = new THREE.SphereGeometry(1, 40, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const r = Math.hypot(x, z) * R;
    const k = Math.hypot(x, z) > 1e-6 ? R / Math.hypot(x, z) : 0;
    pos.setXYZ(i, x * k * (r / R), yAt(r), z * k * (r / R));
  }
  g.computeVertexNormals();
  const top = lin(hex(th.grassTop)), rim = lin(hex(th.grassSide));
  const ng = colorize(g, (pp, nn, o) => mixc(rim, top, smooth(0.15, 0.8, nn.y), o));
  ng.translate(p.x, p.y, p.z);
  addStatic(level, ng);
}

export const TYPES = { hill: buildHill, mound: buildMound };
