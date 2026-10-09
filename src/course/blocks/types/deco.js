// Baustein `deco`: Zier – Bäume, Büsche, Blumen, Zäune, Steine, Laternen, Pfosten. Ohne Kollision,
// außer Baumstämmen (Zylinder) und Steinen mit solid: true.
//
// Einzeln:  { type: 'deco', kind, pos: [x, y, z], … }   oder Liste: { type: 'deco', items: [{ kind, pos, … }, …] }
// kind:
//   tree     size (Höhe, Standard 4.5), color (Kronenfarbe: 'autumn'|'green'|Hex), solid (Stamm, Standard true),
//            climbable (Stamm mit Krallen-Anzug kletterbar, z. B. Stern im Baum 1-3)
//   bush     size (Radius, Standard 0.8), color
//   flower   color ('red'|'yellow'|'white'|'pink'|Hex)
//   flowers  Beet: size [w, d], n (Anzahl, Standard 10)
//   fence    from/to [x, y, z] (Bodenhöhe), weißer Lattenzaun ohne Kollision
//   rock     size (Radius, Standard 0.6), solid (Standard false)
//   lantern  Laterne (Pfosten + Leuchte; im Thema cave mit Licht)
//   post     Pfosten (size = Höhe)
// pos = Fußpunkt auf dem Boden.

import * as THREE from 'three';
import { v3, box, hex, lin, mixc, smooth, colorize, merge, Rnd, addStatic } from '../kit.js';

const CROWNS = {
  autumn: [[0xffcf7a, 0xf58f3a, 0xc45f22], [0xffa38a, 0xef5f44, 0xb33a2a], [0xfff0a6, 0xf6c54a, 0xc98d22]],
  green: [[0xb9f286, 0x6cc74d, 0x3d8f32], [0xa6ec7a, 0x58b947, 0x2f7d2a]],
};
const FLOWERS = { red: 0xff5a4a, yellow: 0xffd43a, white: 0xffffff, pink: 0xff8ccc, blue: 0x6aa8ff };

function sphereCol(r, x, y, z, light, mid, dark, sx = 1, sy = 1, sz = 1, ws = 10, hs = 7) {
  const g = new THREE.SphereGeometry(r, ws, hs);
  g.scale(sx, sy, sz);
  g.translate(x, y, z);
  const L = lin(light), M = lin(mid), D = lin(dark);
  return colorize(g, (p, n, o) => (n.y >= 0 ? mixc(M, L, smooth(0, 0.9, n.y), o) : mixc(M, D, smooth(0, -0.9, n.y), o)));
}

function tree(level, it, parts, rnd) {
  const p = v3(it.pos);
  const h = it.size ?? 4.5;
  const trunkH = h * 0.42, rT = 0.09 * h;
  const trunk = new THREE.CylinderGeometry(rT * 0.75, rT, trunkH, 8, 1, true);
  trunk.translate(p.x, p.y + trunkH / 2, p.z);
  const td = lin(0x5c3a22), tl = lin(0x8a5a36);
  parts.push(colorize(trunk, (pp, n, o) => mixc(td, tl, smooth(p.y, p.y + trunkH, pp.y), o)));
  const pal = Array.isArray(it.color) ? it.color : rnd.pick(CROWNS[it.color ?? 'autumn'] ?? CROWNS.autumn);
  const R = h * 0.26;
  for (const [dx, dy, dz, r] of [[0, trunkH + R * 1.1, 0, R * 1.15], [-R * 0.75, trunkH + R * 0.55, R * 0.25, R * 0.85], [R * 0.7, trunkH + R * 0.7, -R * 0.2, R * 0.9]]) {
    parts.push(sphereCol(r, p.x + dx, p.y + dy, p.z + dz, pal[0], pal[1], pal[2]));
  }
  if (it.solid !== false) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: Math.max(0.3, rT * 1.1), y0: p.y, y1: p.y + trunkH + R * 0.6, climbable: !!it.climbable, tag: 'tree' });
}

function bush(it, parts, rnd) {
  const p = v3(it.pos);
  const r = it.size ?? 0.8;
  const pal = rnd.pick(CROWNS[it.color ?? 'green'] ?? CROWNS.green);
  for (const [dx, dy, dz, k] of [[0, 0.55, 0, 1], [-0.7, 0.4, 0.2, 0.75], [0.65, 0.42, -0.15, 0.7]]) {
    parts.push(sphereCol(r * k, p.x + dx * r, p.y + dy * r, p.z + dz * r, pal[0], pal[1], pal[2]));
  }
}

function flower(p, color, parts) {
  const stem = new THREE.CylinderGeometry(0.025, 0.03, 0.32, 5, 1, true);
  stem.translate(p.x, p.y + 0.16, p.z);
  const sc = lin(0x3f9a2a);
  parts.push(colorize(stem, (pp, n, o) => { o[0] = sc[0]; o[1] = sc[1]; o[2] = sc[2]; }));
  const c = hex(FLOWERS[color] ?? color, 0xff5a4a);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    parts.push(sphereCol(0.07, p.x + Math.cos(a) * 0.08, p.y + 0.34, p.z + Math.sin(a) * 0.08, 0xffffff, c, c, 1, 0.5, 1, 5, 3));
  }
  parts.push(sphereCol(0.05, p.x, p.y + 0.36, p.z, 0xfff6c0, 0xffc21a, 0xd99a00, 1, 1, 1, 5, 3));
}

function fence(it, parts) {
  const a = v3(it.from ?? it.pos), b = v3(it.to ?? [a.x + 4, a.y, a.z]);
  const L = Math.hypot(b.x - a.x, b.z - a.z);
  const yaw = Math.atan2(-(b.z - a.z), b.x - a.x);
  const local = [];
  const n = Math.max(2, Math.round(L / 0.5) + 1);
  for (let i = 0; i < n; i++) local.push(box(0.12, 0.8, 0.08, (i / (n - 1)) * L, 0.4, 0, 0xffffff, { r: 0, seg: 0 }));
  for (const y of [0.3, 0.62]) local.push(box(L, 0.08, 0.06, L / 2, y, -0.06, 0xf2f2f2, { r: 0, seg: 0 }));
  const g = merge(local);
  g.rotateY(yaw);
  g.translate(a.x, a.y, a.z);
  parts.push(g);
}

function rock(level, it, parts) {
  const p = v3(it.pos);
  const r = it.size ?? 0.6;
  const g = new THREE.DodecahedronGeometry(r, 0);
  g.scale(1.1, 0.75, 0.95);
  g.translate(p.x, p.y + r * 0.45, p.z);
  const L = lin(0xc9c6cf), D = lin(0x7c7885);
  parts.push(colorize(g.index ? g.toNonIndexed() : g, (pp, n, o) => mixc(D, L, smooth(-0.4, 0.8, n.y), o)));
  if (it.solid) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: r * 0.95, y0: p.y, y1: p.y + r * 0.9, tag: 'rock' });
}

function lantern(level, it, parts) {
  const p = v3(it.pos);
  parts.push(box(0.12, 1.8, 0.12, p.x, p.y + 0.9, p.z, 0x3d3440, { r: 0.04 }));
  parts.push(box(0.36, 0.42, 0.36, p.x, p.y + 1.95, p.z, 0x3d3440, { r: 0.06 }));
  const glow = new THREE.SphereGeometry(0.15, 8, 6);
  glow.translate(p.x, p.y + 1.95, p.z);
  const c = lin(0xffd27a);
  parts.glow.push(colorize(glow, (pp, n, o) => { o[0] = c[0] * 1.4; o[1] = c[1] * 1.4; o[2] = c[2] * 1.2; }));
  level.view?.addLantern(p.x, p.y + 2.1, p.z);
}

export function buildDeco(level, spec) {
  const items = spec.items ?? [spec];
  const rnd = new Rnd((level.rnd.int(0, 1e9) ^ items.length) >>> 0);
  // je Eintrag eigene Geometrie → landet im passenden Abschnitt (Frustum-Culling)
  for (const it of items) {
    const parts = [];
    parts.glow = [];
    switch (it.kind) {
      case 'tree': tree(level, it, parts, rnd); break;
      case 'bush': bush(it, parts, rnd); break;
      case 'flower': flower(v3(it.pos), it.color ?? 'red', parts); break;
      case 'flowers': {
        const p = v3(it.pos);
        const [w, d] = it.size ?? [2, 2];
        const n = it.n ?? 10;
        const cols = it.colors ?? ['red', 'yellow', 'white', 'pink'];
        for (let i = 0; i < n; i++) flower({ x: p.x + rnd.real(-w / 2, w / 2), y: p.y, z: p.z + rnd.real(-d / 2, d / 2) }, rnd.pick(cols), parts);
        break;
      }
      case 'fence': fence(it, parts); break;
      case 'rock': rock(level, it, parts); break;
      case 'lantern': lantern(level, it, parts); break;
      case 'post': { const p = v3(it.pos); const h = it.size ?? 1.2; parts.push(box(0.22, h, 0.22, p.x, p.y + h / 2, p.z, hex(it.color, 0xf4f2ec), { r: 0.06 })); break; }
      default: console.warn(`[deco] unbekannte Art: ${it.kind}`);
    }
    if (parts.length) addStatic(level, merge(parts), { castShadow: it.kind !== 'flower' && it.kind !== 'flowers' });
    if (parts.glow.length) addStatic(level, merge(parts.glow), { material: 'glow', castShadow: false });
  }
}

export const TYPES = { deco: buildDeco };
