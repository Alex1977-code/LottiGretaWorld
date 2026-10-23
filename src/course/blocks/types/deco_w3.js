// Baustein `deco_w3`: Kulisse für Welt 3 (Schnee, Herbstwald, Spukhaus, Lagune). Modelle aus models/kinds/props_*_w3.js
// und eigene Geometrie werden in die statische Geometrie verschmolzen (keine zusätzlichen Zeichenaufrufe, Abschnitts-
// Culling); nur Kerzen mit Flammen (light) werden eigene Objekte. Kollision nur mit `solid`.
//
// Einzeln:  { type: 'deco_w3', kind, pos: [x, y, z], … }   oder Liste: { type: 'deco_w3', items: [{ kind, pos, … }, …] }
// pos = Fußpunkt; yaw in Radiant; Streuungen (Mehrzahl-Namen) verteilen deterministisch (seed) in size: [w, d] um pos,
// halten gap m Abstand und meiden avoid: [[x, z, r], …]. shadow: false → wirft keinen Schatten (ferne Kulisse, spart den
// Schattenpass) – gilt je Eintrag (oder für alle über die Liste: { type: 'deco_w3', shadow: false, items }).
// kind:
//   tanne          verschneite Tanne: size (Höhe 3,5), yaw, solid (Stamm, Standard true)
//   tannen         Streuung: size [w, d], n (8), scale [0.7, 1.4] (× 3,5 m), gap 2.2, avoid, solid (false)
//   schneemann     Schneemann ≈2,2 m: yaw, scale, solid (Standard true)
//   felsen         verschneite Felsen (Kulisse): size [w, d], n (5), height [1, 3], solid (false)
//   schneehuegel   sanfte Schneehügel (ohne Kollision): size [w, d], n (6), height [0.8, 2.5]
//   schneeflaeche  Schneeboden (pos = Mitte der Oberseite): size [w, d] (60), cell 4, solid (Standard true: 2 m Quader)
//   iglu           Iglu (wie Baustein iglu): size 3.4, yaw, solid (true)
//   laterne        Laterne mit warmem Licht: height 2.8, yaw, solid (true); laternen: from, to, every (6)
//   herbstbaum     Laubbaum in Herbstfarben: size (4), yaw, solid (Stamm, true); herbstbaeume: Streuung (n 6, gap 3)
//   korallen       Korallen-Streuung (ast/fächer/hirn): size [w, d], n (6), scale [0.7, 1.3]
//   kerze          Kerze/Leuchter (Spukhaus): count 1|3, light (true → flackernde Flammen, eigenes Objekt)
//   spinnweben     Eck-Spinnennetz (Ursprung = Raumecke oben): size 1.2, yaw

import * as THREE from 'three';
import { v3, lin, mixc, smooth, colorize, merge, Rnd, addStatic, hex, box } from '../kit.js';
import { bakeModel, modelObject, noShadow } from '../w3kit.js';
import { buildIglu } from './w3_snow.js';

const range = (v, d) => (Array.isArray(v) ? v : [v ?? d[0], v ?? d[1]]);

function scatter(p, size, n, gap, avoid, rnd) {
  const [w, d] = Array.isArray(size) ? size : [size ?? 10, size ?? 10];
  const out = [];
  for (let tries = 0; tries < n * 30 && out.length < n; tries++) {
    const x = p.x + rnd.real(-w / 2, w / 2), z = p.z + rnd.real(-d / 2, d / 2);
    if (out.some((q) => Math.hypot(q[0] - x, q[1] - z) < gap)) continue;
    if ((avoid ?? []).some((a) => Math.hypot(a[0] - x, a[1] - z) < (a[2] ?? 2))) continue;
    out.push([x, z]);
  }
  return out;
}

const bo = (it) => ({ castShadow: it.shadow !== false });

function tanne(level, it, p, rnd) {
  const size = it.size ?? 3.5;
  bakeModel(level, 'tanne_schnee', { size }, p.x, p.y, p.z, it.yaw ?? rnd.real(0, Math.PI * 2), 1, {}, bo(it));
  if (it.solid !== false) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.3 * size / 3.5, y0: p.y, y1: p.y + size * 0.45, tag: 'tanne' });
}

function schneemann(level, it, p, rnd) {
  const sc = it.scale ?? 1;
  bakeModel(level, 'schneemann', {}, p.x, p.y, p.z, it.yaw ?? rnd.real(-0.6, 0.6) - Math.PI / 2, sc, {}, bo(it));
  if (it.solid !== false) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.55 * sc, y0: p.y, y1: p.y + 2 * sc, tag: 'schneemann' });
}

function felsen(level, it, p, rnd, parts) {
  const [w, d] = Array.isArray(it.size) ? it.size : [it.size ?? 12, it.size ?? 12];
  const [h0, h1] = range(it.height, [1, 3]);
  const rock = lin(hex(it.color ?? 0x7a8498)), rockDark = lin(0x4a5468), snow = lin(0xf6faff), snowSh = lin(0xc8daf0);
  for (let i = 0; i < (it.n ?? 5); i++) {
    const x = p.x + rnd.real(-w / 2, w / 2), z = p.z + rnd.real(-d / 2, d / 2);
    const h = rnd.real(h0, h1), r = rnd.real(0.7, 1.4) * Math.max(0.8, h * 0.6);
    const g = new THREE.DodecahedronGeometry(1, 1);
    g.scale(r, h * 0.62, r * rnd.real(0.75, 1.1));
    g.rotateY(rnd.real(0, Math.PI));
    const ng = g.index ? g.toNonIndexed() : g;
    ng.translate(x, p.y + h * 0.42, z);
    ng.computeVertexNormals();
    parts.push(colorize(ng, (pp, n, o) => {
      mixc(rockDark, rock, smooth(-0.6, 0.6, n.y + n.z * 0.2), o);
      if (n.y > 0.45) mixc(snowSh, snow, smooth(0.45, 0.85, n.y), o);
    }));
    if (it.solid) level.world.add({ type: 'cyl', x, z, r: r * 0.85, y0: p.y, y1: p.y + h * 0.95, tag: 'felsen' });
  }
}

function schneehuegel(level, it, p, rnd, parts) {
  const [w, d] = Array.isArray(it.size) ? it.size : [it.size ?? 30, it.size ?? 20];
  const [h0, h1] = range(it.height, [0.8, 2.5]);
  const top = lin(0xffffff), side = lin(0xd2e2f6);
  for (let i = 0; i < (it.n ?? 6); i++) {
    const x = p.x + rnd.real(-w / 2, w / 2), z = p.z + rnd.real(-d / 2, d / 2);
    const g = new THREE.SphereGeometry(1, 16, 7, 0, Math.PI * 2, 0, Math.PI / 2);
    g.scale(rnd.real(3, 7), rnd.real(h0, h1), rnd.real(2.5, 5));
    g.translate(x, p.y - 0.05, z);
    parts.push(colorize(g.toNonIndexed(), (pp, n, o) => mixc(side, top, smooth(0.1, 0.85, n.y), o)));
  }
}

function schneeflaeche(level, it, p, rnd) {
  const [w, d] = Array.isArray(it.size) ? it.size : [it.size ?? 60, it.size ?? 60];
  const cell = it.cell ?? 4;
  const a = lin(hex(it.color ?? 0xf4f8ff)), b = lin(hex(it.color2 ?? 0xdde8f8)), c = lin(0xffffff);
  const nx = Math.max(1, Math.ceil(w / cell)), nz = Math.max(1, Math.ceil(d / cell));
  const hAt = (i, k) => (i === 0 || k === 0 || i === nx || k === nz ? 0 : Math.sin(i * 1.3 + k * 0.7) * 0.14 + Math.sin(k * 1.1 - i * 0.5) * 0.1);
  const pos = [], col = [];
  const X = (i) => p.x - w / 2 + (i / nx) * w, Z = (k) => p.z - d / 2 + (k / nz) * d;
  const cols = [];
  for (let k = 0; k <= nz; k++) { cols.push([]); for (let i = 0; i <= nx; i++) { const t = (Math.sin(i * 2.1 + k * 1.3) * 0.5 + 0.5) * 0.7 + rnd.frac() * 0.3; const o = mixc(a, b, t, [0, 0, 0]); cols[k].push(hAt(i, k) > 0.12 ? mixc(o, c, 0.6, o) : o); } }
  for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) {
    for (const [ii, kk] of [[i, k], [i, k + 1], [i + 1, k + 1], [i, k], [i + 1, k + 1], [i + 1, k]]) {
      pos.push(X(ii), p.y + hAt(ii, kk), Z(kk));
      const cc = cols[kk][ii]; col.push(cc[0], cc[1], cc[2]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  addStatic(level, g, { castShadow: false });
  if (it.solid !== false) level.world.add({ type: 'box', min: [p.x - w / 2, p.y - 2, p.z - d / 2], max: [p.x + w / 2, p.y, p.z + d / 2], camIgnore: true, tag: 'schneeflaeche' });
}

function laterne(level, it, p, rnd) {
  const H = it.height ?? 2.8;
  const parts = [
    box(0.42, 0.25, 0.42, p.x, p.y + 0.125, p.z, 0x2a2a3a, { r: 0.05, seg: 1 }),
    box(0.12, H - 0.5, 0.12, p.x, p.y + (H - 0.5) / 2 + 0.2, p.z, 0x2a2a3a, { r: 0.03, seg: 1 }),
    box(0.5, 0.08, 0.5, p.x, p.y + H - 0.25, p.z, 0x1a1a24, { r: 0.03, seg: 1 }),
    box(0.62, 0.1, 0.62, p.x, p.y + H + 0.3, p.z, 0x1a1a24, { r: 0.04, seg: 1, topColor: 0xffffff }),
  ];
  addStatic(level, merge(parts), { castShadow: it.shadow !== false });
  addStatic(level, box(0.4, 0.48, 0.4, p.x, p.y + H + 0.02, p.z, 0xffd27a, { r: 0.06, seg: 1, topColor: 0xfff0c0 }), { material: 'glow', castShadow: false });
  level.view?.addLantern?.(p.x, p.y + H, p.z);
  if (it.solid !== false) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.2, y0: p.y, y1: p.y + H, tag: 'laterne' });
}

function herbstbaum(level, it, p, rnd, parts) {
  const S = it.size ?? 4;
  const trunk = lin(0x6a4428), cols = [0xe8602a, 0xf0a020, 0xd83a2a, 0xf6c040, 0xb8502a].map(lin);
  const tg = new THREE.CylinderGeometry(0.12 * S / 4, 0.2 * S / 4, S * 0.5, 8);
  tg.translate(p.x, p.y + S * 0.25, p.z);
  parts.push(colorize(tg.toNonIndexed(), (pp, n, o) => { o[0] = trunk[0]; o[1] = trunk[1]; o[2] = trunk[2]; }));
  const k = 5;
  for (let i = 0; i < k; i++) {
    const a = (i / k) * Math.PI * 2 + rnd.real(0, 1), rr = i === 0 ? 0 : S * 0.2;
    const r = S * rnd.real(0.2, 0.28);
    const g = new THREE.IcosahedronGeometry(r, 1);
    g.translate(p.x + Math.cos(a) * rr, p.y + S * (0.62 + (i === 0 ? 0.18 : rnd.real(-0.05, 0.08))), p.z + Math.sin(a) * rr);
    const c = cols[(((i + Math.floor(p.x * 3 + p.z)) % cols.length) + cols.length) % cols.length];
    const dark = mixc(c, [0.08, 0.03, 0.02], 0.45, [0, 0, 0]);
    parts.push(colorize(g, (pp, n, o) => mixc(dark, c, smooth(-0.5, 0.7, n.y), o)));
  }
  if (it.solid !== false) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.2 * S / 4, y0: p.y, y1: p.y + S * 0.5, tag: 'herbstbaum' });
}

export function buildDecoW3(level, spec) {
  const items = spec.items ?? [spec];
  const parts = { shadow: [], flat: [] };
  for (const it0 of items) {
    const it = spec.items && spec.shadow === false && it0.shadow === undefined ? { ...it0, shadow: false } : it0;
    const p = v3(it.pos);
    const rnd = new Rnd((it.seed ?? Math.floor(p.x * 73 + p.z * 37 + p.y * 11)) >>> 0);
    const P = it.shadow === false ? parts.flat : parts.shadow;
    switch (it.kind) {
      case 'tanne': tanne(level, it, p, rnd); break;
      case 'tannen': {
        const [s0, s1] = range(it.scale, [0.7, 1.4]);
        for (const [x, z] of scatter(p, it.size ?? [12, 12], it.n ?? 8, it.gap ?? 2.2, it.avoid, rnd)) tanne(level, { size: 3.5 * rnd.real(s0, s1), solid: it.solid ?? false, shadow: it.shadow }, { x, y: p.y, z }, rnd);
        break;
      }
      case 'schneemann': schneemann(level, it, p, rnd); break;
      case 'felsen': felsen(level, it, p, rnd, P); break;
      case 'schneehuegel': schneehuegel(level, it, p, rnd, parts.flat); break;
      case 'schneeflaeche': schneeflaeche(level, it, p, rnd); break;
      case 'iglu': buildIglu(level, { pos: it.pos, size: it.size, yaw: it.yaw, solid: it.solid }); break;
      case 'laterne': laterne(level, it, p, rnd); break;
      case 'laternen': {
        const a = v3(it.from ?? it.pos), b = v3(it.to ?? it.pos);
        const L = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.floor(L / (it.every ?? 6)) + 1);
        for (let i = 0; i < n; i++) { const u = n > 1 ? i / (n - 1) : 0; laterne(level, it, { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u }, rnd); }
        break;
      }
      case 'herbstbaum': herbstbaum(level, it, p, rnd, P); break;
      case 'herbstbaeume': {
        for (const [x, z] of scatter(p, it.size ?? [12, 12], it.n ?? 6, it.gap ?? 3, it.avoid, rnd)) herbstbaum(level, { size: (it.scale ? rnd.real(...range(it.scale, [0.8, 1.2])) : rnd.real(0.8, 1.25)) * 4, solid: it.solid ?? false }, { x, y: p.y, z }, rnd, P);
        break;
      }
      case 'korallen': {
        const [s0, s1] = range(it.scale, [0.7, 1.3]);
        const kinds = ['ast', 'faecher', 'hirn'];
        for (const [x, z] of scatter(p, it.size ?? [8, 8], it.n ?? 6, it.gap ?? 1.4, it.avoid, rnd)) bakeModel(level, 'koralle', { kind: rnd.pick(kinds) }, x, p.y, z, rnd.real(0, 6.28), rnd.real(s0, s1), {}, bo(it));
        break;
      }
      case 'kerze':
        if (it.light !== false && level.view) noShadow(modelObject(level, 'kerze', { count: it.count ?? 1 }, p.x, p.y, p.z, it.yaw ?? 0, { anim: 'on' }));
        else bakeModel(level, 'kerze', { count: it.count ?? 1 }, p.x, p.y, p.z, it.yaw ?? 0, 1, { anim: 'off' }, bo(it));
        break;
      case 'spinnweben': {
        if (level.view) noShadow(modelObject(level, 'spinnweben', { size: it.size ?? 1.2 }, p.x, p.y, p.z, it.yaw ?? 0, {}));
        break;
      }
      default: console.warn(`[deco_w3] unbekannte Art ${it.kind}`);
    }
  }
  if (parts.shadow.length) addStatic(level, merge(parts.shadow));
  if (parts.flat.length) addStatic(level, merge(parts.flat), { castShadow: false });
}

export const TYPES = { deco_w3: buildDecoW3 };
