// Baustein `deco_w2`: Kulisse für Welt 2 (Wüste, Weltraum, rosa Grasland). Modelle aus models/kinds/props_w2.js werden
// in die statische Geometrie verschmolzen (keine zusätzlichen Zeichenaufrufe, Abschnitts-Culling); nur was sich
// bewegen soll (spin/sway), wird ein eigenes Objekt. Kollision nur mit `solid` (Standard bei Stamm/Säule/Bogenfüßen).
//
// Einzeln:  { type: 'deco_w2', kind, pos: [x, y, z], … }   oder Liste: { type: 'deco_w2', items: [{ kind, pos, … }, …] }
// pos = Fußpunkt auf dem Boden; yaw in Radiant; Streuungen (Mehrzahl-Namen) verteilen deterministisch (seed) in
// size: [w, d] um pos, halten `gap` m Abstand zueinander und meiden avoid: [[x, z, r], …] (Wege freihalten).
// kind:
//   kaktus         variant 'saeule'|'kugel'|'feige'|'gruppe', size (Maßstab 1), yaw, solid (Säule: Standard true)
//   kakteen        Streuung: size [w, d], n (8), variants (alle), scale [0.7, 1.3], gap 1.2, avoid, solid (false)
//   palme          height (4.5), lean (0.25), yaw, solid (Stamm-Zylinder, Standard true), sway (true → eigenes Objekt,
//                  wiegt sich im Wind)
//   palmen         Streuung: size, n (4), height [3.8, 5], gap 3, avoid, solid
//   ruine          Säulenruine: height (3), broken (true), yaw, solid (Standard true)
//   ruinen         Streuung: size, n (4), height [1.5, 3.5], gap 2.5, avoid, solid
//   pyramide       size (8, Grundkante), steps (5), yaw, solid (false: Kulisse; true = Stufen als Quader)
//   bogen          Sandsteinbogen: width (5), height (4), thickness (1.1), yaw (0: Durchgang entlang X), solid (Füße)
//   bluetenbaum    size (4), yaw, solid (Stamm, Standard true), sway
//   bluetenbaeume  Streuung: size, n (5), scale [0.8, 1.2], gap 3, avoid, solid
//   planet         Weltraum-Kulisse, pos = Mitte: radius (3), color 'orange'|'blue'|'violet'|'green', ring (true),
//                  spin (true → dreht sich, eigenes Objekt)
//   planeten       Streuung im Raum: size [w, h, d] (Kasten um pos), n (4), radius [2, 6], colors
//   duenen         sanfte Sanddünen (ohne Kollision): size [w, d], n (6), height [1, 3], color
//   felsen         rote Felstürme/Tafelberge (Kulisse): size [w, d], n (4), height [3, 9], solid (false)
//   sandflaeche    Wüstenboden (pos = Mitte der Oberseite): size [w, d] (60), cell (4 m Raster), color, color2,
//                  solid (Standard true: 2 m dicker Quader darunter, Kamera sieht hindurch)

import * as THREE from 'three';
import { v3, lin, mixc, smooth, colorize, merge, Rnd, addStatic, hex } from '../kit.js';
import { bakeModel, modelObject } from '../w2kit.js';

const PLANET_COLORS = ['orange', 'blue', 'violet', 'green'];
const KAKTUS_VARIANTS = ['saeule', 'kugel', 'feige', 'gruppe'];

/** Deterministische Streupunkte in [w, d] um p mit Mindestabstand gap, ohne avoid-Kreise. */
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

const range = (v, d) => (Array.isArray(v) ? v : [v ?? d[0], v ?? d[1]]);

function kaktus(level, it, p, rnd) {
  const variant = it.variant ?? 'saeule';
  const s = it.size ?? 1;
  bakeModel(level, 'kaktus', { variant, size: s }, p.x, p.y, p.z, it.yaw ?? rnd.real(0, Math.PI * 2), 1);
  const solid = it.solid ?? (variant === 'saeule' || variant === 'feige');
  if (solid) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.32 * s, y0: p.y, y1: p.y + (variant === 'saeule' ? 2.2 : 1.4) * s, tag: 'kaktus' });
}

function palme(level, it, p, rnd) {
  const height = it.height ?? 4.5, lean = it.lean ?? 0.25, yaw = it.yaw ?? rnd.real(0, Math.PI * 2);
  if (it.sway) modelObject(level, 'palme', { height, lean }, p.x, p.y, p.z, yaw, { sway: 0.4 });
  else bakeModel(level, 'palme', { height, lean }, p.x, p.y, p.z, yaw, 1, { sway: 0 });
  if (it.solid !== false) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.24, y0: p.y, y1: p.y + Math.min(2.4, height * 0.5), tag: 'palme' });
}

function ruine(level, it, p, rnd) {
  const height = it.height ?? 3;
  bakeModel(level, 'ruine_saeule', { height, broken: it.broken !== false }, p.x, p.y, p.z, it.yaw ?? rnd.real(0, Math.PI * 2), it.scale ?? 1);
  if (it.solid !== false) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.42 * (it.scale ?? 1), y0: p.y, y1: p.y + height * (it.scale ?? 1), tag: 'ruine' });
}

function pyramide(level, it, p) {
  const size = it.size ?? 8, steps = it.steps ?? 5;
  bakeModel(level, 'pyramide', { size, steps }, p.x, p.y, p.z, it.yaw ?? 0, 1);
  if (it.solid) {
    const hS = (0.62 * size) / steps;
    for (let i = 0; i < steps; i++) {
      const e = size * (1 - i / steps) / 2;
      level.world.add({ type: 'box', min: [p.x - e, p.y + i * hS, p.z - e], max: [p.x + e, p.y + (i + 1) * hS, p.z + e], tag: 'pyramide' });
    }
  }
}

function bogen(level, it, p) {
  const width = it.width ?? 5, height = it.height ?? 4, th = it.thickness ?? 1.1, yaw = it.yaw ?? 0;
  bakeModel(level, 'sandsteinbogen', { width, height, thickness: th }, p.x, p.y, p.z, yaw, 1);
  if (it.solid !== false) {
    for (const s of [-1, 1]) {
      // Füße bei lokal z = ±width/2 (Durchgang entlang lokal X)
      const lx = 0, lz = s * width / 2;
      const x = p.x + lx * Math.cos(yaw) + lz * Math.sin(yaw), z = p.z - lx * Math.sin(yaw) + lz * Math.cos(yaw);
      level.world.add({ type: 'cyl', x, z, r: th * 0.55, y0: p.y, y1: p.y + height * 0.75, tag: 'bogen' });
    }
  }
}

function bluetenbaum(level, it, p, rnd) {
  const size = it.size ?? 4, yaw = it.yaw ?? rnd.real(0, Math.PI * 2);
  if (it.sway) modelObject(level, 'bluetenbaum', { size }, p.x, p.y, p.z, yaw, { sway: 0.4 });
  else bakeModel(level, 'bluetenbaum', { size }, p.x, p.y, p.z, yaw, 1, { sway: 0 });
  if (it.solid !== false) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.12 * size, y0: p.y, y1: p.y + size * 0.45, tag: 'bluetenbaum' });
}

function planet(level, it, p, rnd) {
  const r = it.radius ?? 3, color = it.color ?? rnd.pick(PLANET_COLORS), ring = it.ring !== false;
  // Modell-Ursprung = Fußpunkt (Mitte bei y = radius) → pos = Mitte
  if (it.spin) modelObject(level, 'planet', { radius: r, color, ring }, p.x, p.y - r, p.z, it.yaw ?? 0, {});
  else bakeModel(level, 'planet', { radius: r, color, ring }, p.x, p.y - r, p.z, it.yaw ?? 0, 1, {}, { castShadow: false });
}

function duenen(level, it, p, rnd, parts) {
  const [w, d] = Array.isArray(it.size) ? it.size : [it.size ?? 30, it.size ?? 20];
  const n = it.n ?? 6;
  const [h0, h1] = range(it.height, [1, 3]);
  const top = lin(hex(it.color ?? 0xf6d898)), side = mixc(top, lin(0xc98a4e), 0.45, [0, 0, 0]);
  for (let i = 0; i < n; i++) {
    const x = p.x + rnd.real(-w / 2, w / 2), z = p.z + rnd.real(-d / 2, d / 2);
    const h = rnd.real(h0, h1), rx = rnd.real(3, 7), rz = rnd.real(2.5, 5);
    const g = new THREE.SphereGeometry(1, 16, 7, 0, Math.PI * 2, 0, Math.PI / 2);
    g.scale(rx, h, rz);
    g.rotateY(rnd.real(0, Math.PI));
    g.translate(x, p.y - 0.05, z);
    parts.push(colorize(g.toNonIndexed(), (pp, nn, o) => mixc(side, top, smooth(0.1, 0.9, nn.y), o)));
  }
}

/** Sandebene (Wüstenboden): flache Fläche mit leichtem Farbrauschen (4-m-Raster), optional fest. */
function sandflaeche(level, it, p, rnd, parts) {
  const [w, d] = Array.isArray(it.size) ? it.size : [it.size ?? 60, it.size ?? 60];
  const cell = it.cell ?? 4;
  const a = lin(hex(it.color ?? 0xf0cf86)), b = lin(hex(it.color2 ?? 0xe4bc6e)), c = lin(0xf8e2a6);
  const nx = Math.max(1, Math.ceil(w / cell)), nz = Math.max(1, Math.ceil(d / cell));
  const pos = [], nor = [], col = [];
  const hAt = (i, k) => (i === 0 || k === 0 || i === nx || k === nz ? 0 : Math.sin(i * 1.7 + k * 0.6) * 0.12 + Math.sin(k * 0.9 - i * 0.4) * 0.1);
  const cAt = (i, k) => { const t = (Math.sin(i * 2.3 + k * 1.1) * 0.5 + 0.5) * 0.7 + rnd.frac() * 0.3; const o = mixc(a, b, t, [0, 0, 0]); return hAt(i, k) > 0.12 ? mixc(o, c, 0.5, o) : o; };
  const X = (i) => p.x - w / 2 + (i / nx) * w, Z = (k) => p.z - d / 2 + (k / nz) * d;
  const cols = [];
  for (let k = 0; k <= nz; k++) { cols.push([]); for (let i = 0; i <= nx; i++) cols[k].push(cAt(i, k)); }
  for (let k = 0; k < nz; k++) {
    for (let i = 0; i < nx; i++) {
      const q = [[i, k], [i, k + 1], [i + 1, k + 1], [i, k], [i + 1, k + 1], [i + 1, k]];
      for (const [ii, kk] of q) {
        pos.push(X(ii), p.y + hAt(ii, kk), Z(kk)); nor.push(0, 1, 0);
        const cc = cols[kk][ii]; col.push(cc[0], cc[1], cc[2]);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  addStatic(level, g, { castShadow: false });
  if (it.solid !== false) level.world.add({ type: 'box', min: [p.x - w / 2, p.y - 2, p.z - d / 2], max: [p.x + w / 2, p.y, p.z + d / 2], camIgnore: true, tag: 'sandflaeche' });
}

function felsen(level, it, p, rnd, parts) {
  const [w, d] = Array.isArray(it.size) ? it.size : [it.size ?? 30, it.size ?? 20];
  const n = it.n ?? 4;
  const [h0, h1] = range(it.height, [3, 9]);
  const bands = [lin(0xd8743a), lin(0xc0582c), lin(0xe89a5a), lin(0xa84a26)];
  const cap = lin(0xf0b070);
  for (let i = 0; i < n; i++) {
    const x = p.x + rnd.real(-w / 2, w / 2), z = p.z + rnd.real(-d / 2, d / 2);
    const h = rnd.real(h0, h1), r = rnd.real(1.4, 3.2);
    const g = new THREE.CylinderGeometry(r * 0.82, r, h, 9, 5);
    g.translate(x, p.y + h / 2, z);
    const ng = g.toNonIndexed();
    const pos = ng.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      const yy = pos.getY(v) - p.y;
      if (yy > 0.05 && yy < h - 0.05) { const k = 1 + Math.sin(yy * 2.3 + i) * 0.05; pos.setX(v, x + (pos.getX(v) - x) * k); pos.setZ(v, z + (pos.getZ(v) - z) * k); }
    }
    ng.computeVertexNormals();
    parts.push(colorize(ng, (pp, nn, o) => {
      if (nn.y > 0.7) { o[0] = cap[0]; o[1] = cap[1]; o[2] = cap[2]; return; }
      const b = bands[Math.floor((pp.y - p.y) / 0.9) % bands.length] ?? bands[0];
      o[0] = b[0]; o[1] = b[1]; o[2] = b[2];
    }));
    if (it.solid) level.world.add({ type: 'cyl', x, z, r: r * 0.9, y0: p.y, y1: p.y + h, tag: 'felsen' });
  }
}

export function buildDecoW2(level, spec) {
  const items = spec.items ?? [spec];
  const parts = [];
  for (const it of items) {
    const p = v3(it.pos);
    const rnd = new Rnd((it.seed ?? Math.floor(p.x * 73 + p.z * 37 + p.y * 11)) >>> 0);
    switch (it.kind) {
      case 'kaktus': kaktus(level, it, p, rnd); break;
      case 'kakteen': {
        const pts = scatter(p, it.size ?? [10, 10], it.n ?? 8, it.gap ?? 1.2, it.avoid, rnd);
        const vs = it.variants ?? KAKTUS_VARIANTS;
        const [s0, s1] = range(it.scale, [0.7, 1.3]);
        for (const [x, z] of pts) kaktus(level, { variant: rnd.pick(vs), size: rnd.real(s0, s1), solid: it.solid ?? false }, { x, y: p.y, z }, rnd);
        break;
      }
      case 'palme': palme(level, it, p, rnd); break;
      case 'palmen': {
        const [h0, h1] = range(it.height, [3.8, 5]);
        for (const [x, z] of scatter(p, it.size ?? [12, 12], it.n ?? 4, it.gap ?? 3, it.avoid, rnd)) palme(level, { height: rnd.real(h0, h1), lean: rnd.real(0.1, 0.35), solid: it.solid, sway: it.sway }, { x, y: p.y, z }, rnd);
        break;
      }
      case 'ruine': ruine(level, it, p, rnd); break;
      case 'ruinen': {
        const [h0, h1] = range(it.height, [1.5, 3.5]);
        for (const [x, z] of scatter(p, it.size ?? [12, 12], it.n ?? 4, it.gap ?? 2.5, it.avoid, rnd)) ruine(level, { height: rnd.real(h0, h1), broken: rnd.frac() < 0.75, solid: it.solid }, { x, y: p.y, z }, rnd);
        break;
      }
      case 'pyramide': pyramide(level, it, p); break;
      case 'bogen': case 'sandsteinbogen': bogen(level, it, p); break;
      case 'bluetenbaum': bluetenbaum(level, it, p, rnd); break;
      case 'bluetenbaeume': {
        const [s0, s1] = range(it.scale, [0.8, 1.2]);
        for (const [x, z] of scatter(p, it.size ?? [12, 12], it.n ?? 5, it.gap ?? 3, it.avoid, rnd)) bluetenbaum(level, { size: 4 * rnd.real(s0, s1), solid: it.solid, sway: it.sway }, { x, y: p.y, z }, rnd);
        break;
      }
      case 'planet': planet(level, it, p, rnd); break;
      case 'planeten': {
        const sz = Array.isArray(it.size) ? it.size : [60, 20, 60];
        const [r0, r1] = range(it.radius, [2, 6]);
        const cols = it.colors ?? PLANET_COLORS;
        for (let i = 0; i < (it.n ?? 4); i++) {
          planet(level, { radius: rnd.real(r0, r1), color: cols[i % cols.length], ring: rnd.frac() < 0.6, spin: it.spin },
            { x: p.x + rnd.real(-sz[0] / 2, sz[0] / 2), y: p.y + rnd.real(-sz[1] / 2, sz[1] / 2), z: p.z + rnd.real(-sz[2] / 2, sz[2] / 2) }, rnd);
        }
        break;
      }
      case 'duenen': duenen(level, it, p, rnd, parts); break;
      case 'felsen': felsen(level, it, p, rnd, parts); break;
      case 'sandflaeche': sandflaeche(level, it, p, rnd, parts); break;
      default: console.warn(`[deco_w2] unbekannte Art ${it.kind}`);
    }
  }
  if (parts.length) addStatic(level, merge(parts));
}

export const TYPES = { deco_w2: buildDecoW2 };
