// Zier der Rätsel-Dioramen (Archetyp `diorama`): wird vom Archetyp vor dem Levelaufbau aus LEVEL.diorama.props
// gebaut (statische Geometrie wird mit dem Level verschmolzen; Häuschen haben Kollision). Arten:
//   house    { pos, yaw, size: [w, h, d] (3, 2.4, 3), roof: Farbe, wall: Farbe }  Häuschen mit Spitzdach, Tür, Fenstern,
//            Schornstein (Kollision: Quader)
//   mushroom { pos, size (0.6), color }   Glückspilz (rot mit weißen Punkten)
//   banner   { pos, color, yaw }          Wimpel an einer Stange
//   dig      { pos }                      Schatzstelle: rotes Kreuz im Gras (der Archetyp lässt Pflaume dort buddeln)
//   cloudsea { pos: [x, y, z], r }        weiches Wolkenmeer unter dem Würfel (viele flache Wolkenballen)
//   islet    { pos, size }                kleine schwebende Grasinsel in der Ferne (mit Bäumchen)
// Positionen = Fußpunkt (Weltkoordinaten, m).

import * as THREE from 'three';
import { box, hex, lin, mixc, smooth, colorize, merge, Rnd, islandParts, themeOf, addStatic } from '../blocks/kit.js';

const TAU = Math.PI * 2;

function blob(r, x, y, z, light, mid, dark, sx = 1, sy = 1, sz = 1, ws = 9, hs = 6) {
  const g = new THREE.SphereGeometry(r, ws, hs);
  g.scale(sx, sy, sz);
  g.translate(x, y, z);
  const L = lin(light), M = lin(mid), D = lin(dark);
  return colorize(g, (p, n, o) => (n.y >= 0 ? mixc(M, L, smooth(0, 0.9, n.y), o) : mixc(M, D, smooth(0, -0.9, n.y), o)));
}

function house(level, it, parts) {
  const [x, y, z] = it.pos;
  const [w, h, d] = it.size ?? [3, 2.4, 3];
  const yaw = it.yaw ?? 0;
  const wall = hex(it.wall, 0xfff3dc), roof = hex(it.roof, 0xe8483a);
  const local = [];
  local.push(box(w, h, d, 0, h / 2, 0, wall, { r: 0.12, topColor: wall }));
  // Fachwerk-Balken an den Ecken
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) local.push(box(0.16, h, 0.16, sx * (w / 2 - 0.02), h / 2, sz * (d / 2 - 0.02), 0x9a6338, { r: 0.04, seg: 1 }));
  // Dach: Prisma (zwei schräge Platten) + Giebel
  const rh = Math.min(w, d) * 0.55;
  for (const s of [-1, 1]) {
    const len = Math.hypot(w / 2 + 0.3, rh);
    const g = box(len, 0.22, d + 0.5, 0, 0, 0, roof, { r: 0.08, seg: 1, topColor: roof });
    g.rotateZ(-s * Math.atan2(rh, w / 2 + 0.3));
    g.translate(s * (w / 2 + 0.3) / 2, h + rh / 2 + 0.08, 0);
    local.push(g);
  }
  const gable = new THREE.BufferGeometry();
  const gp = [];
  for (const sz of [-1, 1]) gp.push(-w / 2, h, sz * d / 2, w / 2, h, sz * d / 2, 0, h + rh, sz * d / 2);
  gable.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
  gable.setIndex([0, 1, 2, 3, 5, 4]);
  gable.computeVertexNormals();
  local.push(colorize(gable, (p, n, o) => { const c = lin(wall); o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }));
  const gable2 = gable.clone();
  gable2.setIndex([0, 2, 1, 3, 4, 5]);
  gable2.computeVertexNormals();
  local.push(colorize(gable2, (p, n, o) => { const c = lin(wall); o[0] = c[0] * 0.9; o[1] = c[1] * 0.9; o[2] = c[2] * 0.9; }));
  // Tür (vorn +Z), Fenster, Schornstein, Türstufe
  local.push(box(0.8, 1.35, 0.1, 0, 0.68, d / 2 + 0.03, 0x8a4a22, { r: 0.08, seg: 1 }));
  local.push(box(0.12, 0.12, 0.08, 0.25, 0.7, d / 2 + 0.1, 0xffd23a, { r: 0.04, seg: 1 }));
  for (const sx of [-1, 1]) {
    local.push(box(0.62, 0.6, 0.08, sx * (w / 2 - 0.62), h * 0.62, d / 2 + 0.03, 0x7ac8ff, { r: 0.06, seg: 1, topColor: 0xbfe8ff }));
    local.push(box(0.72, 0.1, 0.12, sx * (w / 2 - 0.62), h * 0.62 - 0.35, d / 2 + 0.06, 0x9a6338, { r: 0.03, seg: 1 }));
    // Blumenkasten
    local.push(box(0.66, 0.16, 0.2, sx * (w / 2 - 0.62), h * 0.62 - 0.46, d / 2 + 0.14, 0x9a6338, { r: 0.04, seg: 1 }));
    for (let k = 0; k < 3; k++) local.push(blob(0.08, sx * (w / 2 - 0.62) + (k - 1) * 0.2, h * 0.62 - 0.33, d / 2 + 0.16, 0xffffff, [0xff5a7a, 0xffd23a, 0xff8ad0][k], 0xc02a50, 1, 1, 1, 5, 4));
  }
  local.push(box(0.5, 1.0, 0.5, w * 0.25, h + rh * 0.7, -d * 0.15, 0xb8604a, { r: 0.06, seg: 1, topColor: 0x5a3a30 }));
  local.push(box(1.1, 0.14, 0.5, 0, 0.07, d / 2 + 0.3, 0xd9d2c4, { r: 0.04, seg: 1 }));
  const g = merge(local);
  g.rotateY(yaw);
  g.translate(x, y, z);
  parts.push(g);
  // Kollision (achsenparallele Hülle der gedrehten Grundfläche)
  const c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw));
  const hx = (w * c + d * s) / 2, hz = (w * s + d * c) / 2;
  level.world.add({ type: 'box', min: [x - hx, y, z - hz], max: [x + hx, y + h + rh * 0.6, z + hz], tag: 'haus' });
}

function mushroom(it, parts, rnd) {
  const [x, y, z] = it.pos;
  const s = it.size ?? 0.6;
  const stem = new THREE.CylinderGeometry(s * 0.28, s * 0.36, s * 0.7, 8);
  stem.translate(x, y + s * 0.35, z);
  const sc = lin(0xfff3dc);
  parts.push(colorize(stem, (p, n, o) => { o[0] = sc[0]; o[1] = sc[1]; o[2] = sc[2]; }));
  const cap = new THREE.SphereGeometry(s * 0.62, 12, 6, 0, TAU, 0, Math.PI / 2);
  cap.scale(1, 0.75, 1);
  cap.translate(x, y + s * 0.62, z);
  const c = lin(hex(it.color, 0xe8343a)), w = lin(0xffffff);
  parts.push(colorize(cap, (p, n, o) => {
    const a = Math.atan2(p.z - z, p.x - x), up = n.y;
    const dot = Math.sin(a * 5) > 0.55 && up > 0.25 && up < 0.85;
    mixc(c, w, dot ? 0.95 : 0, o);
  }));
  void rnd;
}

function banner(it, parts) {
  const [x, y, z] = it.pos;
  const local = [box(0.1, 2.2, 0.1, 0, 1.1, 0, 0xf6f4ef, { r: 0.04, seg: 1 }), blob(0.09, 0, 2.25, 0, 0xfff6c0, 0xffd23a, 0xc09000, 1, 1, 1, 6, 4)];
  const fl = new THREE.BufferGeometry();
  fl.setAttribute('position', new THREE.Float32BufferAttribute([0, 2.1, 0, 0, 1.55, 0, 0.85, 1.85, 0], 3));
  fl.setIndex([0, 1, 2, 0, 2, 1]);
  fl.computeVertexNormals();
  const c = lin(hex(it.color, 0x3a8bff));
  local.push(colorize(fl, (p, n, o) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }));
  const g = merge(local);
  g.rotateY(it.yaw ?? 0);
  g.translate(x, y, z);
  parts.push(g);
}

function digMark(it, parts) {
  const [x, y, z] = it.pos;
  for (const a of [0.78, -0.78]) {
    const g = box(0.9, 0.04, 0.16, 0, 0, 0, 0xe0342a, { r: 0.03, seg: 1 });
    g.rotateY(a);
    g.translate(x, y + 0.03, z);
    parts.push(g);
  }
  // aufgeworfene Erde
  parts.push(blob(0.28, x - 0.45, y, z + 0.3, 0xc98a52, 0xa86e3c, 0x7a4a26, 1, 0.35, 1, 6, 3));
}

function cloudsea(it, parts, rnd) {
  const [cx, cy, cz] = it.pos;
  const R = it.r ?? 40;
  const white = lin(0xffffff), shade = lin(0xcfe0f2);
  const n = it.n ?? 46;
  for (let i = 0; i < n; i++) {
    const a = rnd.real(0, TAU), d = Math.sqrt(rnd.frac()) * R;
    const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, y = cy + rnd.real(-2.5, 1.5);
    const r = rnd.real(4, 8);
    const g = new THREE.SphereGeometry(r, 9, 5);
    g.scale(1, rnd.real(0.35, 0.55), rnd.real(0.8, 1.2));
    g.translate(x, y, z);
    parts.push(colorize(g, (p, nn, o) => mixc(shade, white, smooth(-0.5, 0.6, nn.y), o)));
  }
}

function islet(level, it, parts, rnd) {
  const [x, y, z] = it.pos;
  const s = it.size ?? 3;
  const th = themeOf(level);
  for (const g of islandParts(x - s / 2, y - s * 0.6, z - s / 2, x + s / 2, y, z + s / 2, th, { under: s * 0.9, rnd })) parts.push(g);
  // Bäumchen
  const t = new THREE.CylinderGeometry(0.12 * s / 3, 0.16 * s / 3, s * 0.4, 6);
  t.translate(x + s * 0.15, y + s * 0.2, z);
  const tc = lin(0x7a4a26);
  parts.push(colorize(t, (p, n, o) => { o[0] = tc[0]; o[1] = tc[1]; o[2] = tc[2]; }));
  parts.push(blob(s * 0.3, x + s * 0.15, y + s * 0.5, z, 0xb9f286, 0x6cc74d, 0x3d8f32, 1, 1, 1, 8, 5));
}

/** Zier aus LEVEL.diorama.props bauen (vor dem Levelaufbau, damit sie mit verschmolzen wird). */
export function buildDioramaProps(level, props = []) {
  const rnd = new Rnd(0xd10a);
  const solid = [], light = [], clouds = [];
  for (const it of props) {
    switch (it.kind) {
      case 'house': house(level, it, solid); break;
      case 'mushroom': mushroom(it, light, rnd); break;
      case 'banner': banner(it, light); break;
      case 'dig': digMark(it, light); break;
      case 'cloudsea': cloudsea(it, clouds, rnd); break;
      case 'islet': islet(level, it, solid, rnd); break;
      default: console.warn(`[Diorama] unbekannte Zier: ${it.kind}`);
    }
  }
  for (const g of solid) addStatic(level, g, { castShadow: true });
  if (light.length) addStatic(level, merge(light), { castShadow: false });
  if (clouds.length) addStatic(level, merge(clouds), { material: 'glow', castShadow: false, receiveShadow: false });
}
