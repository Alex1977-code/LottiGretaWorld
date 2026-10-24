// Baustein `deco_w5`: Kulisse für Welt 5 „Lila Strand-Insel“ (Strand, Savanne, Torten-Welt, Ruinen-Tempel, Mine).
// Eigene Geometrie (bzw. Kulissen-Modelle der Registry, sobald es sie gibt: Name 'deco_w5_<kind>', Ursprung = Fußpunkt,
// Blick +X) wird in die statische Geometrie verschmolzen (keine zusätzlichen Zeichenaufrufe, Abschnitts-Culling); nur
// Leuchtendes (Kerzenflammen, Laternen) geht ins Glüh-Material. Kollision nur mit `solid`.
//
// Einzeln:  { type: 'deco_w5', kind, pos: [x, y, z], … }   oder Liste: { type: 'deco_w5', items: [{ kind, pos, … }, …] }
// pos = Fußpunkt; yaw in Radiant; Streuungen (Mehrzahl-Namen) verteilen deterministisch (seed) in size: [w, d] um pos,
// halten gap m Abstand und meiden avoid: [[x, z, r], …]. shadow: false → wirft keinen Schatten (ferne Kulisse) – je
// Eintrag oder für die ganze Liste ({ type: 'deco_w5', shadow: false, items }).
// kind:
//   Strand   palme (height 5.5, lean 0.25, yaw) · palmen (Streuung: n 5, height [4, 6.5]) · sandburg (size 2) ·
//            sandskulptur (Pilzling-Figur aus Sand: size 1.5, yaw) · muscheln (Muscheln und Seesterne: Streuung n 12) ·
//            sonnenschirm (color 'rot' | 'blau' | 'gelb' | 'lila', height 2.6) · liegestuhl (yaw, color) · strandball
//            (size 0.8) · duenen (Sandhügel: Streuung n 4, size)
//   Savanne  akazie (height 5, Schirmkrone) · akazien (Streuung: n 5) · baobab (height 6) · termitenhuegel (size 1.4) ·
//            savannengras (Grasbüschel: Streuung n 14) · felsbrocken (Streuung n 6)
//   Torte    tortenstueck (Tortenstück mit Schichten und Sahne: size 2, yaw) · torte (runde Stufentorte: size 3, tiers 3) ·
//            kerzen (Gruppe leuchtender Kerzen: n 3, size 1) · sahnehaeubchen (Streuung n 8) · kirsche (size 0.6) ·
//            zuckerstange (height 3, yaw) · keksstapel (size 1)
//   Tempel   tempelsaeule (height 5, r 0.55, broken) · tempelsaeulen (from, to, every 3.5) · steinkopf (size 2.4, yaw) ·
//            obelisk (height 6) · tempeltor (width 4, height 5, yaw; Durchgang ±X) · steinplatten (Bodenplatten: size [w, d])
//   Mine     grubenbalken (Stützrahmen aus Holz: width 4, height 3.2, yaw) · grubenbalken_reihe (from, to, every 4) ·
//            grubenlampe (hängende Laterne, leuchtet; height 0) · kristalle (blau leuchtende Kristalle: n 4, size 1)

import * as THREE from 'three';
import { v3, lin, mixc, smooth, colorize, merge, Rnd, addStatic, hex, box } from '../kit.js';
import { bakeModel } from '../w2kit.js';
import { hasModel } from '../../models/index.js';

const C = (h) => lin(hex(h));
const ni = (g) => (g.index ? g.toNonIndexed() : g);   // nur indizierte Geometrie umwandeln (keine three-Warnung)
const range = (v, d) => (Array.isArray(v) ? v : [v ?? d[0], v ?? d[1]]);
const fill = (g, col) => colorize(g.index ? g.toNonIndexed() : g, (p, n, o) => { o[0] = col[0]; o[1] = col[1]; o[2] = col[2]; });
const shadeY = (g, lo, hi, a = -0.6, b = 0.8) => colorize(g.index ? g.toNonIndexed() : g, (p, n, o) => mixc(lo, hi, smooth(a, b, n.y * 0.7 - n.x * 0.25 + n.z * 0.25), o));
const at = (g, x, y, z, yaw = 0) => { if (yaw) g.rotateY(yaw); g.translate(x, y, z); return g; };

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

function line(it, p) {
  const a = v3(it.from ?? it.pos), b = v3(it.to ?? it.pos);
  return { a, b, L: Math.hypot(b.x - a.x, b.z - a.z), yaw: Math.atan2(-(b.z - a.z), b.x - a.x) };
}

// ------------------------------------------------------------------ Strand

const TRUNK = C(0xb88a52), TRUNK_D = C(0x7a5630), FROND = C(0x3cc06a), FROND_L = C(0x8af0a0), FROND_D = C(0x1e7a4a);
const SAND = C(0xf4dca0), SAND_D = C(0xd8b46a), SAND_L = C(0xfff0c8);

function palme(level, it, p, rnd, parts) {
  const H = it.height ?? 5.5, lean = it.lean ?? 0.25, yaw = it.yaw ?? rnd.real(0, 6.28);
  const lx = Math.cos(yaw) * lean, lz = -Math.sin(yaw) * lean;
  const seg = 7;
  let tip = { x: p.x, y: p.y, z: p.z };
  for (let i = 0; i < seg; i++) {
    const u0 = i / seg, u1 = (i + 1) / seg;
    const off = (u) => ({ x: p.x + lx * H * u * u, y: p.y + H * u, z: p.z + lz * H * u * u });
    const a = off(u0), b = off(u1);
    const len = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    const g = new THREE.CylinderGeometry(0.17 - u1 * 0.05, 0.2 - u0 * 0.05, len * 1.04, 7);
    const dir = new THREE.Vector3(b.x - a.x, b.y - a.y, b.z - a.z).normalize();
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
    g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    parts.push(colorize(ni(g), (q, n, o) => mixc(TRUNK_D, TRUNK, (Math.floor((q.y - p.y) * 3.3) & 1) * 0.6 + 0.2, o)));
    tip = b;
  }
  // Wedel: 7 gebogene, flache Blätter
  const nf = 7;
  for (let k = 0; k < nf; k++) {
    const a = (k / nf) * Math.PI * 2 + rnd.real(-0.2, 0.2);
    const L = H * rnd.real(0.42, 0.52);
    const g = new THREE.PlaneGeometry(L, 0.75, 6, 1);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + L / 2, w = pos.getY(i);
      const u = x / L;
      pos.setXYZ(i, x, -u * u * L * 0.55 + Math.abs(w) * 0.25, w * (1 - u * 0.75));
    }
    g.rotateY(-a);
    g.translate(tip.x, tip.y, tip.z);
    parts.push(colorize(ni(g), (q, n, o) => mixc(FROND_D, FROND, 0.4 + 0.6 * smooth(-0.2, 1, n.y), o)));
    const g2 = g.clone(); g2.translate(0, -0.02, 0);
  }
  const nut = new THREE.SphereGeometry(0.22, 6, 5);
  for (let k = 0; k < 3; k++) { const n = nut.clone(); n.translate(tip.x + Math.cos(k * 2.1) * 0.22, tip.y - 0.2, tip.z + Math.sin(k * 2.1) * 0.22); parts.push(fill(n, C(0x6a4a2a))); }
  if (it.solid) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.25, y0: p.y, y1: p.y + H * 0.8, tag: 'palme' });
}

function sandburg(level, it, p, rnd, parts) {
  const s = it.size ?? 2;
  const sh = (g) => colorize(ni(g), (q, n, o) => mixc(SAND_D, SAND, smooth(-0.6, 0.8, n.y + (Math.sin(q.x * 9) + Math.cos(q.z * 8)) * 0.08), o));
  parts.push(sh(at(new THREE.CylinderGeometry(s * 0.55, s * 0.62, s * 0.5, 10), p.x, p.y + s * 0.25, p.z)));
  parts.push(sh(at(new THREE.BoxGeometry(s * 0.7, s * 0.4, s * 0.7), p.x, p.y + s * 0.7, p.z)));
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    parts.push(sh(at(new THREE.CylinderGeometry(s * 0.14, s * 0.16, s * 0.75, 8), p.x + dx * s * 0.36, p.y + s * 0.5 + s * 0.37, p.z + dz * s * 0.36)));
    parts.push(sh(at(new THREE.ConeGeometry(s * 0.17, s * 0.25, 8), p.x + dx * s * 0.36, p.y + s * 1.37, p.z + dz * s * 0.36)));
  }
  parts.push(sh(at(new THREE.CylinderGeometry(s * 0.2, s * 0.22, s * 0.5, 8), p.x, p.y + s * 1.1, p.z)));
  parts.push(fill(at(new THREE.ConeGeometry(s * 0.12, s * 0.35, 3), p.x, p.y + s * 1.5, p.z), C(0xff4a6a)));
  if (it.solid) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: s * 0.6, y0: p.y, y1: p.y + s * 0.9, tag: 'sandburg' });
}

function sandskulptur(level, it, p, rnd, parts) {
  // Pilzling aus Sand: Stiel mit Gesicht, großer Hut mit Tupfen (Bauplan 5-1 „Pilzlings-Sandskulpturen“)
  const s = it.size ?? 1.5, yaw = it.yaw ?? Math.PI / 2;
  const sh = (g) => colorize(ni(g), (q, n, o) => mixc(SAND_D, SAND_L, smooth(-0.6, 0.9, n.y + Math.sin(q.x * 11 + q.z * 7) * 0.06), o));
  parts.push(sh(at(new THREE.CylinderGeometry(s * 0.6, s * 0.7, s * 0.25, 12), p.x, p.y + s * 0.12, p.z)));
  parts.push(sh(at(new THREE.CylinderGeometry(s * 0.3, s * 0.36, s * 0.55, 10), p.x, p.y + s * 0.52, p.z)));
  const cap = new THREE.SphereGeometry(s * 0.55, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  cap.scale(1, 0.75, 1);
  parts.push(sh(at(cap, p.x, p.y + s * 0.78, p.z)));
  for (let k = 0; k < 5; k++) {
    const a = k * 1.26, d = s * 0.32;
    parts.push(fill(at(new THREE.SphereGeometry(s * 0.09, 6, 4), p.x + Math.cos(a) * d, p.y + s * 0.78 + s * 0.3, p.z + Math.sin(a) * d), SAND_D));
  }
  const fx = Math.cos(yaw), fz = -Math.sin(yaw);
  for (const sd of [-1, 1]) {
    const ex = p.x + fx * s * 0.33 + fz * sd * s * 0.1, ez = p.z + fz * s * 0.33 - fx * sd * s * 0.1;
    parts.push(fill(at(new THREE.SphereGeometry(s * 0.05, 5, 4), ex, p.y + s * 0.6, ez), C(0x8a6a3a)));
  }
  if (it.solid !== false) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: s * 0.45, y0: p.y, y1: p.y + s * 1.15, tag: 'sandskulptur' });
}

function muscheln(level, it, p, rnd, parts) {
  const cols = [0xffb0c8, 0xfff0e0, 0xffc890, 0xffe060, 0xff8a6a].map(C);
  for (const [x, z] of scatter(p, it.size ?? [8, 8], it.n ?? 12, 0.6, it.avoid, rnd)) {
    const c = cols[Math.floor(rnd.frac() * cols.length)];
    if (rnd.frac() < 0.35) {
      // Seestern
      const g = new THREE.CircleGeometry(0.22, 5);
      g.rotateX(-Math.PI / 2);
      const pos = g.attributes.position;
      for (let i = 1; i < pos.count; i++) { const k = (i - 1) % 2 ? 0.45 : 1; pos.setX(i, pos.getX(i) * k); pos.setZ(i, pos.getZ(i) * k); }
      g.rotateY(rnd.real(0, 6));
      g.translate(x, p.y + 0.03, z);
      parts.push(fill(g, C(0xff7a4a)));
    } else {
      const g = new THREE.SphereGeometry(0.16, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
      g.scale(1, 0.5, 0.8);
      g.rotateY(rnd.real(0, 6));
      g.translate(x, p.y, z);
      parts.push(shadeY(g, c, C(0xffffff), -0.2, 1.4));
    }
  }
}

const UMBRELLA = { rot: [0xff4a4a, 0xffffff], blau: [0x3d8bff, 0xffffff], gelb: [0xffd23a, 0xff8a2a], lila: [0xb070ff, 0xfff0ff] };
function sonnenschirm(level, it, p, rnd, parts) {
  const H = it.height ?? 2.6;
  const [a, b] = (UMBRELLA[it.color] ?? UMBRELLA.rot).map(C);
  parts.push(fill(at(new THREE.CylinderGeometry(0.05, 0.05, H, 6), p.x, p.y + H / 2, p.z), C(0xf4f0e8)));
  const top = new THREE.ConeGeometry(1.4, 0.55, 12, 1, true);
  parts.push(colorize(ni(at(top, p.x, p.y + H, p.z)), (q, n, o) => { const k = Math.floor(((Math.atan2(q.z - p.z, q.x - p.x) + Math.PI) / (Math.PI * 2)) * 12) & 1; const c = k ? a : b; o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }));
  parts.push(fill(at(new THREE.SphereGeometry(0.08, 6, 4), p.x, p.y + H + 0.3, p.z), b));
}

function liegestuhl(level, it, p, rnd, parts) {
  const yaw = it.yaw ?? 0;
  const [a, b] = (UMBRELLA[it.color] ?? UMBRELLA.blau).map(C);
  const g1 = new THREE.BoxGeometry(1.2, 0.05, 0.6); g1.rotateZ(0.12); g1.translate(0.1, 0.35, 0);
  const g2 = new THREE.BoxGeometry(0.8, 0.05, 0.6); g2.rotateZ(1.0); g2.translate(-0.65, 0.6, 0);
  for (const g of [g1, g2]) parts.push(colorize(ni(at(g, p.x, p.y, p.z, yaw)), (q, n, o) => { const k = Math.floor((q.x + q.z) * 6) & 1; const c = k ? a : b; o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }));
  for (const [dx, dz] of [[0.55, 0.28], [0.55, -0.28], [-0.4, 0.28], [-0.4, -0.28]]) parts.push(fill(at(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 4), dx, 0.2, dz).rotateY(yaw).translate(p.x, p.y, p.z), C(0xd8b888)));
}

function strandball(level, it, p, rnd, parts) {
  const s = it.size ?? 0.8;
  const cols = [0xff4a4a, 0xffffff, 0x3d8bff, 0xffd23a, 0xffffff, 0x4fd04a].map(C);
  const g = new THREE.SphereGeometry(s / 2, 16, 10);
  g.translate(p.x, p.y + s / 2, p.z);
  parts.push(colorize(ni(g), (q, n, o) => { const k = Math.floor(((Math.atan2(q.z - p.z, q.x - p.x) + Math.PI) / (Math.PI * 2)) * 6) % 6; const c = cols[k]; o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }));
}

function duenen(level, it, p, rnd, parts) {
  for (const [x, z] of scatter(p, it.size ?? [20, 20], it.n ?? 4, 5, it.avoid, rnd)) {
    const r = rnd.real(3, 6);
    const g = new THREE.SphereGeometry(r, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2);
    g.scale(1.3, rnd.real(0.25, 0.4), 1);
    g.rotateY(rnd.real(0, 3));
    g.translate(x, p.y - 0.2, z);
    parts.push(shadeY(g, SAND_D, SAND_L, -0.2, 1));
  }
}

// ------------------------------------------------------------------ Savanne

const BARK = C(0x7a5434), BARK_D = C(0x4a321e), LEAF = C(0x8ab83a), LEAF_D = C(0x5a8a2a), LEAF_L = C(0xc8e06a);

function akazie(level, it, p, rnd, parts) {
  const H = it.height ?? 5;
  const lean = rnd.real(-0.25, 0.25), ang = rnd.real(0, 6.28);
  const tx = p.x + Math.cos(ang) * lean * H * 0.4, tz = p.z + Math.sin(ang) * lean * H * 0.4;
  const trunk = new THREE.CylinderGeometry(0.16, 0.26, H * 0.75, 7);
  trunk.translate(0, H * 0.375, 0);
  trunk.applyMatrix4(new THREE.Matrix4().makeShear(0, 0, (tx - p.x) / (H * 0.75), 0, (tz - p.z) / (H * 0.75), 0));
  parts.push(shadeY(at(trunk, p.x, p.y, p.z), BARK_D, BARK));
  // Äste zur Schirmkrone
  for (let k = 0; k < 3; k++) {
    const a = ang + k * 2.1, d = H * 0.3;
    const br = new THREE.CylinderGeometry(0.06, 0.1, d * 1.2, 5);
    br.translate(0, d * 0.6, 0); br.rotateZ(0.9); br.rotateY(-a);
    parts.push(fill(at(br, tx, p.y + H * 0.7, tz), BARK));
  }
  // flache Schirmkrone aus 3 Scheiben
  for (let k = 0; k < 3; k++) {
    const r = H * rnd.real(0.38, 0.5);
    const g = new THREE.CylinderGeometry(r, r * 0.85, H * 0.12, 10, 1);
    const ox = Math.cos(ang + k * 2.1) * H * 0.18, oz = Math.sin(ang + k * 2.1) * H * 0.18;
    g.translate(tx + ox, p.y + H * (0.86 + k * 0.035), tz + oz);
    parts.push(colorize(ni(g), (q, n, o) => mixc(LEAF_D, n.y > 0.5 ? LEAF_L : LEAF, smooth(-0.6, 0.9, n.y), o)));
  }
  if (it.solid) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.3, y0: p.y, y1: p.y + H * 0.7, tag: 'akazie' });
}

function baobab(level, it, p, rnd, parts) {
  const H = it.height ?? 6;
  const g = new THREE.CylinderGeometry(H * 0.13, H * 0.2, H * 0.78, 10, 3);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); const k = 1 + 0.25 * Math.sin((y / H) * 4 + 1); pos.setX(i, pos.getX(i) * k); pos.setZ(i, pos.getZ(i) * k); }
  g.computeVertexNormals();
  parts.push(shadeY(at(g, p.x, p.y + H * 0.39, p.z), C(0x8a6a5a), C(0xc8a28a)));
  for (let k = 0; k < 5; k++) {
    const a = k * 1.26 + rnd.real(-0.2, 0.2);
    const br = new THREE.CylinderGeometry(0.08, 0.16, H * 0.3, 5);
    br.translate(0, H * 0.15, 0); br.rotateZ(0.8); br.rotateY(-a);
    parts.push(fill(at(br, p.x, p.y + H * 0.76, p.z), C(0x9a7a6a)));
    const l = new THREE.IcosahedronGeometry(H * 0.12, 0);
    l.scale(1.3, 0.6, 1.3);
    parts.push(shadeY(at(l, p.x + Math.cos(a) * H * 0.26, p.y + H * 0.95, p.z + Math.sin(a) * H * 0.26), LEAF_D, LEAF));
  }
  if (it.solid !== false) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: H * 0.18, y0: p.y, y1: p.y + H * 0.78, tag: 'baobab' });
}

function termitenhuegel(level, it, p, rnd, parts) {
  const s = it.size ?? 1.4;
  const col = (g) => colorize(ni(g), (q, n, o) => mixc(C(0x9a5a32), C(0xd8925a), smooth(-0.6, 0.9, n.y * 0.5 + n.x * 0.3 + Math.sin(q.y * 7) * 0.1), o));
  parts.push(col(at(new THREE.ConeGeometry(s * 0.7, s * 2.2, 9, 3), p.x, p.y + s * 1.1, p.z)));
  for (let k = 0; k < 3; k++) {
    const a = k * 2.3 + rnd.real(0, 0.5), h = s * rnd.real(0.9, 1.5);
    parts.push(col(at(new THREE.ConeGeometry(s * 0.32, h, 7), p.x + Math.cos(a) * s * 0.55, p.y + h / 2, p.z + Math.sin(a) * s * 0.55)));
  }
  if (it.solid !== false) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: s * 0.6, y0: p.y, y1: p.y + s * 1.6, tag: 'termitenhuegel' });
}

function savannengras(level, it, p, rnd, parts) {
  const g0 = C(0xc8b048), g1 = C(0xe8d070), g2 = C(0x9a8a32);
  for (const [x, z] of scatter(p, it.size ?? [10, 10], it.n ?? 14, 0.7, it.avoid, rnd)) {
    const h = rnd.real(0.5, 1.1);
    for (let k = 0; k < 4; k++) {
      const g = new THREE.ConeGeometry(0.06, h, 3);
      g.translate(0, h / 2, 0); g.rotateZ(rnd.real(-0.45, 0.45)); g.rotateY(rnd.real(0, 6.28));
      parts.push(colorize(ni(at(g, x, p.y, z)), (q, n, o) => mixc(g2, rnd.frac() < 0.5 ? g0 : g1, smooth(p.y, p.y + h, q.y), o)));
    }
  }
}

function felsbrocken(level, it, p, rnd, parts) {
  for (const [x, z] of scatter(p, it.size ?? [10, 10], it.n ?? 6, 1.2, it.avoid, rnd)) {
    const r = rnd.real(0.35, 1.1);
    const g = new THREE.DodecahedronGeometry(r, 0);
    g.scale(1.2, rnd.real(0.55, 0.85), 1);
    g.rotateY(rnd.real(0, 3));
    parts.push(shadeY(at(g, x, p.y + r * 0.35, z), C(0x8a6a4a), C(0xd8b088)));
  }
}

// ------------------------------------------------------------------ Torte

const CAKE = { sponge: C(0xf4c878), sponge2: C(0xe8a85a), cream: C(0xfff8f0), creamS: C(0xffe0ea), jam: C(0xff4a6a), choco: C(0x8a4a2a), pink: C(0xff9ad0), mint: C(0x8af0d0) };

function layered(g, y0, h, cols) {
  return colorize(ni(g), (q, n, o) => {
    if (n.y > 0.6) { o[0] = cols[0][0]; o[1] = cols[0][1]; o[2] = cols[0][2]; return; }
    const k = Math.floor(((q.y - y0) / h) * cols.length * 1.5) % cols.length;
    const c = cols[(k + 1) % cols.length];
    o[0] = c[0]; o[1] = c[1]; o[2] = c[2];
  });
}

function tortenstueck(level, it, p, rnd, parts) {
  const s = it.size ?? 2, yaw = it.yaw ?? rnd.real(0, 6.28), H = s * 0.6;
  const g = new THREE.CylinderGeometry(s, s, H, 3, 1, false, 0, Math.PI / 3);
  g.translate(0, H / 2, 0);
  parts.push(layered(at(g, p.x, p.y, p.z, yaw), p.y, H, [CAKE.cream, CAKE.sponge, CAKE.jam, CAKE.sponge2]));
  // Sahnetupfer und Erdbeere
  const a = yaw + Math.PI / 6;
  const cx = p.x + Math.sin(a) * s * 0.6, cz = p.z + Math.cos(a) * s * 0.6;
  parts.push(shadeY(at(new THREE.SphereGeometry(s * 0.14, 8, 6), cx, p.y + H + s * 0.08, cz), CAKE.creamS, CAKE.cream));
  parts.push(shadeY(at(new THREE.ConeGeometry(s * 0.09, s * 0.16, 8), cx, p.y + H + s * 0.26, cz).rotateX(Math.PI).translate(0, 0, 0), C(0xd82a3a), C(0xff6a6a)));
  if (it.solid) level.world.add({ type: 'box', min: [p.x - s * 0.5, p.y, p.z - s * 0.5], max: [p.x + s * 0.5, p.y + H, p.z + s * 0.5], tag: 'tortenstueck' });
}

function torte(level, it, p, rnd, parts, glow) {
  const s = it.size ?? 3, tiers = it.tiers ?? 3;
  let y = p.y, r = s / 2;
  const cols = [[CAKE.pink, CAKE.cream], [CAKE.mint, CAKE.cream], [CAKE.cream, CAKE.pink]];
  for (let t = 0; t < tiers; t++) {
    const h = s * 0.32;
    const g = new THREE.CylinderGeometry(r, r, h, 20, 2);
    g.translate(p.x, y + h / 2, p.z);
    const [c0, c1] = cols[t % cols.length];
    parts.push(colorize(ni(g), (q, n, o) => mixc(c0, c1, n.y > 0.5 ? 1 : (Math.sin(Math.atan2(q.z - p.z, q.x - p.x) * 10) > 0.6 && q.y > y + h * 0.7 ? 1 : 0), o)));
    // Sahnerand
    const rim = new THREE.TorusGeometry(r * 0.96, s * 0.04, 5, 20);
    rim.rotateX(Math.PI / 2); rim.translate(p.x, y + h, p.z);
    parts.push(fill(rim, CAKE.cream));
    y += h; r *= 0.72;
  }
  kerzen(level, { n: 3, size: s * 0.3, shadow: it.shadow }, { x: p.x, y, z: p.z }, rnd, parts, glow, r * 0.5);
  if (it.solid) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: s / 2, y0: p.y, y1: y, tag: 'torte' });
}

function kerzen(level, it, p, rnd, parts, glow, ring = null) {
  const n = it.n ?? 3, s = it.size ?? 1;
  const cols = [0xff7ab8, 0x7ad0ff, 0xffe04a, 0x9aff7a].map(C);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + 0.4;
    const d = ring ?? s * 0.5 * (n > 1 ? 1 : 0);
    const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d, h = s * rnd.real(0.6, 1);
    const c = cols[k % cols.length];
    parts.push(colorize(ni(at(new THREE.CylinderGeometry(s * 0.07, s * 0.07, h, 8), x, p.y + h / 2, z)), (q, nn, o) => mixc(c, CAKE.cream, (Math.floor((q.y - p.y) * 9 / s) & 1) * 0.6, o)));
    const f = new THREE.SphereGeometry(s * 0.06, 6, 5); f.scale(1, 1.8, 1);
    glow.push(fill(at(f, x, p.y + h + s * 0.09, z), C(0xffd860)));
  }
}

function sahnehaeubchen(level, it, p, rnd, parts) {
  for (const [x, z] of scatter(p, it.size ?? [6, 6], it.n ?? 8, 0.8, it.avoid, rnd)) {
    const s = rnd.real(0.25, 0.45);
    const g = new THREE.ConeGeometry(s, s * 1.4, 8, 2);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i), a = Math.atan2(pos.getZ(i), pos.getX(i)); const k = 1 + 0.18 * Math.sin(a * 8 + y * 6); pos.setX(i, pos.getX(i) * k); pos.setZ(i, pos.getZ(i) * k); }
    g.computeVertexNormals();
    parts.push(shadeY(at(g, x, p.y + s * 0.7, z), CAKE.creamS, CAKE.cream));
  }
}

function kirsche(level, it, p, rnd, parts) {
  const s = it.size ?? 0.6;
  parts.push(shadeY(at(new THREE.SphereGeometry(s / 2, 12, 8), p.x, p.y + s / 2, p.z), C(0x9a1020), C(0xff3a4a)));
  const st = new THREE.CylinderGeometry(0.02, 0.02, s * 0.7, 4); st.rotateZ(0.4);
  parts.push(fill(at(st, p.x + s * 0.12, p.y + s * 1.2, p.z), C(0x4a8a2a)));
}

function zuckerstange(level, it, p, rnd, parts) {
  const H = it.height ?? 3, yaw = it.yaw ?? 0;
  const red = C(0xff3a4a), wht = C(0xfff8f4);
  const stripe = (g) => colorize(ni(g), (q, n, o) => { const c = Math.floor((q.y * 3 + Math.atan2(q.z - p.z, q.x - p.x) * 0.5) * 1) & 1 ? red : wht; o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; });
  parts.push(stripe(at(new THREE.CylinderGeometry(0.15, 0.15, H, 10), p.x, p.y + H / 2, p.z)));
  const hook = new THREE.TorusGeometry(0.4, 0.15, 8, 12, Math.PI);
  hook.rotateY(yaw);
  parts.push(stripe(at(hook, p.x + Math.cos(yaw) * 0.4, p.y + H, p.z - Math.sin(yaw) * 0.4)));
  if (it.solid) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.18, y0: p.y, y1: p.y + H, tag: 'zuckerstange' });
}

function keksstapel(level, it, p, rnd, parts) {
  const s = it.size ?? 1;
  let y = p.y;
  for (let k = 0; k < 3; k++) {
    const g = new THREE.CylinderGeometry(s * 0.5, s * 0.5, s * 0.16, 14);
    g.rotateY(rnd.real(0, 1));
    parts.push(colorize(ni(at(g, p.x + rnd.real(-0.05, 0.05) * s, y + s * 0.08, p.z + rnd.real(-0.05, 0.05) * s)), (q, n, o) => mixc(CAKE.sponge2, CAKE.sponge, n.y > 0.5 ? (Math.sin(q.x * 20) * Math.cos(q.z * 20) > 0.5 ? 0 : 1) : 0.4, o)));
    y += s * 0.17;
  }
}

// ------------------------------------------------------------------ Tempel

const TSTONE = C(0xe0c890), TSTONE_D = C(0x9a7a4a), TSTONE_L = C(0xfff0c8), MOSS = C(0x7aa84a);

function tempelsaeule(level, it, p, rnd, parts) {
  const H = (it.height ?? 5) * (it.broken ? rnd.real(0.35, 0.7) : 1), r = it.r ?? 0.55;
  const col = (g) => colorize(ni(g), (q, n, o) => { mixc(TSTONE_D, TSTONE, smooth(-0.6, 0.9, n.y * 0.6 + n.x * 0.3), o); if (Math.sin(Math.atan2(q.z - p.z, q.x - p.x) * 12) > 0.75 && Math.abs(n.y) < 0.5) mixc(o, TSTONE_D, 0.4, o); if (q.y < p.y + 0.6 && n.y < 0.5 && rnd.frac() < 0.5) mixc(o, MOSS, 0.4, o); });
  parts.push(col(at(new THREE.BoxGeometry(r * 2.6, 0.35, r * 2.6), p.x, p.y + 0.175, p.z)));
  parts.push(col(at(new THREE.CylinderGeometry(r * 0.92, r, H - 0.7, 16, 2), p.x, p.y + 0.35 + (H - 0.7) / 2, p.z)));
  if (!it.broken) parts.push(col(at(new THREE.BoxGeometry(r * 2.4, 0.35, r * 2.4), p.x, p.y + H - 0.175, p.z)));
  if (it.solid !== false) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: r * 1.05, y0: p.y, y1: p.y + H, tag: 'tempelsaeule' });
}

function steinkopf(level, it, p, rnd, parts) {
  const s = it.size ?? 2.4, yaw = it.yaw ?? Math.PI / 2;
  const col = (g) => colorize(ni(g), (q, n, o) => mixc(TSTONE_D, TSTONE, smooth(-0.6, 0.9, n.y * 0.5 + n.x * 0.3 + n.z * 0.2), o));
  const head = new THREE.BoxGeometry(s * 0.8, s, s * 0.85, 2, 2, 2);
  parts.push(col(at(head, 0, s / 2, 0).rotateY(yaw).translate(p.x, p.y, p.z)));
  const fx = Math.cos(yaw), fz = -Math.sin(yaw), rx = -fz, rz = fx;
  for (const sd of [-1, 1]) {
    const e = new THREE.BoxGeometry(s * 0.12, s * 0.12, s * 0.18);
    e.rotateY(yaw);
    parts.push(fill(e.translate(p.x + fx * s * 0.41 + rx * sd * s * 0.18, p.y + s * 0.62, p.z + fz * s * 0.41 + rz * sd * s * 0.18), C(0x3a2a1a)));
  }
  const nose = new THREE.BoxGeometry(s * 0.16, s * 0.28, s * 0.14); nose.rotateY(yaw);
  parts.push(col(nose.translate(p.x + fx * s * 0.47, p.y + s * 0.45, p.z + fz * s * 0.47)));
  const mouth = new THREE.BoxGeometry(s * 0.06, s * 0.06, s * 0.36); mouth.rotateY(yaw);
  parts.push(fill(mouth.translate(p.x + fx * s * 0.43, p.y + s * 0.22, p.z + fz * s * 0.43), C(0x4a3a24)));
  if (it.solid !== false) level.world.add({ type: 'box', min: [p.x - s * 0.42, p.y, p.z - s * 0.42], max: [p.x + s * 0.42, p.y + s, p.z + s * 0.42], tag: 'steinkopf' });
}

function obelisk(level, it, p, rnd, parts) {
  const H = it.height ?? 6, w = H * 0.14;
  const col = (g) => colorize(ni(g), (q, n, o) => { mixc(TSTONE_D, TSTONE_L, smooth(-0.6, 0.9, n.y * 0.4 + n.x * 0.4), o); if (Math.abs(((q.y - p.y) * 2.5) % 1 - 0.5) > 0.45) mixc(o, TSTONE_D, 0.3, o); });
  const g = new THREE.CylinderGeometry(w * 0.7, w, H, 4, 4);
  g.rotateY(Math.PI / 4);
  parts.push(col(at(g, p.x, p.y + H / 2, p.z)));
  const tip = new THREE.ConeGeometry(w * 0.72, H * 0.12, 4); tip.rotateY(Math.PI / 4);
  parts.push(fill(at(tip, p.x, p.y + H + H * 0.06, p.z), C(0xffd24a)));
  if (it.solid !== false) level.world.add({ type: 'box', min: [p.x - w * 0.7, p.y, p.z - w * 0.7], max: [p.x + w * 0.7, p.y + H, p.z + w * 0.7], tag: 'obelisk' });
}

function tempeltor(level, it, p, rnd, parts) {
  const W = it.width ?? 4, H = it.height ?? 5, yaw = it.yaw ?? 0, t = 0.9;
  const col = (g) => colorize(ni(g), (q, n, o) => mixc(TSTONE_D, TSTONE, smooth(-0.6, 0.9, n.y * 0.5 + n.x * 0.3 + n.z * 0.2), o));
  const sx = -Math.sin(yaw), sz = -Math.cos(yaw);   // quer zum Durchgang (lokal z)
  for (const sd of [-1, 1]) {
    const g = new THREE.BoxGeometry(t, H, t); g.rotateY(yaw);
    parts.push(col(g.translate(p.x + sx * sd * (W / 2 + t / 2), p.y + H / 2, p.z + sz * sd * (W / 2 + t / 2))));
    if (it.solid !== false) {
      const cx = p.x + sx * sd * (W / 2 + t / 2), cz = p.z + sz * sd * (W / 2 + t / 2);
      level.world.add({ type: 'box', min: [cx - t / 2, p.y, cz - t / 2], max: [cx + t / 2, p.y + H, cz + t / 2], tag: 'tempeltor' });
    }
  }
  const top = new THREE.BoxGeometry(t * 1.2, t, W + t * 3); top.rotateY(yaw);
  parts.push(col(top.translate(p.x, p.y + H + t / 2, p.z)));
}

function steinplatten(level, it, p, rnd, parts) {
  const [w, d] = Array.isArray(it.size) ? it.size : [it.size ?? 6, it.size ?? 6];
  for (let x = -w / 2 + 0.5; x < w / 2; x += 1) for (let z = -d / 2 + 0.5; z < d / 2; z += 1) {
    if (rnd.frac() < 0.15) continue;
    const g = new THREE.BoxGeometry(0.94, 0.06, 0.94);
    g.rotateY(rnd.real(-0.05, 0.05));
    const k = rnd.real(0.85, 1.05);
    parts.push(fill(at(g, p.x + x, p.y + 0.03, p.z + z), [TSTONE[0] * k, TSTONE[1] * k, TSTONE[2] * k]));
  }
}

// ------------------------------------------------------------------ Mine

const BEAM = C(0x8a5a2e), BEAM_D = C(0x5a3a1e);
function grubenbalken(level, it, p, rnd, parts, glow) {
  const W = it.width ?? 4, H = it.height ?? 3.2, yaw = it.yaw ?? 0, t = 0.28;
  const sx = -Math.sin(yaw), sz = -Math.cos(yaw);
  for (const sd of [-1, 1]) {
    const g = new THREE.BoxGeometry(t, H, t); g.rotateY(yaw);
    parts.push(shadeY(g.translate(p.x + sx * sd * W / 2, p.y + H / 2, p.z + sz * sd * W / 2), BEAM_D, BEAM));
  }
  const top = new THREE.BoxGeometry(t * 1.2, t * 1.2, W + t * 2); top.rotateY(yaw);
  parts.push(shadeY(top.translate(p.x, p.y + H, p.z), BEAM_D, BEAM));
  if (it.lamp) grubenlampe(level, {}, { x: p.x, y: p.y + H - 0.2, z: p.z }, rnd, parts, glow);
}

function grubenlampe(level, it, p, rnd, parts, glow) {
  const y = p.y + (it.height ?? 0);
  parts.push(fill(at(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 4), p.x, y - 0.25, p.z), C(0x2a2a2a)));
  parts.push(fill(at(new THREE.CylinderGeometry(0.14, 0.18, 0.08, 8), p.x, y - 0.5, p.z), C(0x3a3a3a)));
  glow.push(fill(at(new THREE.SphereGeometry(0.13, 8, 6), p.x, y - 0.66, p.z), C(0xffc860)));
  parts.push(fill(at(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 8), p.x, y - 0.84, p.z), C(0x3a3a3a)));
  level.view?.addLantern?.(p.x, y - 0.7, p.z);
}

function kristalle(level, it, p, rnd, parts, glow) {
  const n = it.n ?? 4, s = it.size ?? 1;
  for (let k = 0; k < n; k++) {
    const a = rnd.real(0, 6.28), d = rnd.real(0, s * 0.5), h = s * rnd.real(0.8, 1.8);
    const g = new THREE.OctahedronGeometry(s * 0.22, 0);
    g.scale(1, h / (s * 0.44), 1);
    g.rotateZ(rnd.real(-0.4, 0.4)); g.rotateY(rnd.real(0, 3));
    glow.push(colorize(ni(at(g, p.x + Math.cos(a) * d, p.y + h * 0.4, p.z + Math.sin(a) * d)), (q, nn, o) => mixc(C(0x2a5aff), C(0xa8f0ff), smooth(-0.5, 1, nn.y), o)));
  }
}

// ------------------------------------------------------------------ Aufbau

const SINGLE = {
  palme, sandburg, sandskulptur, muscheln, sonnenschirm, liegestuhl, strandball, duenen,
  akazie, baobab, termitenhuegel, savannengras, felsbrocken,
  tortenstueck, torte, kerzen, sahnehaeubchen, kirsche, zuckerstange, keksstapel,
  tempelsaeule, steinkopf, obelisk, tempeltor, steinplatten,
  grubenbalken, grubenlampe, kristalle,
};

// Kollision der Arten, deren Aussehen ein Registry-Modell übernimmt (gleiche Formen wie die eigene Geometrie oben)
const MODEL_SOLID = {
  akazie: (level, it, p, s) => { if (it.solid) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.3 * s, y0: p.y, y1: p.y + (it.height ?? 5) * 0.7 * s, tag: 'akazie' }); },
  zuckerstange: (level, it, p, s) => { if (it.solid) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.18 * s, y0: p.y, y1: p.y + (it.height ?? 3) * s, tag: 'zuckerstange' }); },
};

export function buildDecoW5(level, spec) {
  const items = spec.items ?? [spec];
  const parts = { shadow: [], flat: [] };
  const glow = [];
  for (const it0 of items) {
    const it = spec.items && spec.shadow === false && it0.shadow === undefined ? { ...it0, shadow: false } : it0;
    const p = v3(it.pos ?? it.from);
    const rnd = new Rnd((it.seed ?? Math.floor(p.x * 73 + p.z * 37 + p.y * 11)) >>> 0);
    const P = it.shadow === false ? parts.flat : parts.shadow;
    // Kulissen-Modell der Registry, sobald es den Namen gibt (deco_w5_<kind>)
    if (hasModel(`deco_w5_${it.kind}`)) {
      bakeModel(level, `deco_w5_${it.kind}`, it, p.x, p.y, p.z, it.yaw ?? 0, it.scale ?? 1, {}, { castShadow: it.shadow !== false });
      MODEL_SOLID[it.kind]?.(level, it, p, it.scale ?? 1);   // Kollision wie bei der eigenen Geometrie
      continue;
    }
    const scat = (fn, n, sz, gap, mk) => { for (const [x, z] of scatter(p, it.size ?? sz, it.n ?? n, it.gap ?? gap, it.avoid, rnd)) fn(level, { shadow: it.shadow, ...mk() }, { x, y: p.y, z }, rnd, P, glow); };
    switch (it.kind) {
      case 'palmen': { const [h0, h1] = range(it.height, [4, 6.5]); scat(palme, 5, [14, 14], 3, () => ({ height: rnd.real(h0, h1), lean: rnd.real(0.1, 0.35), solid: it.solid })); break; }
      case 'akazien': { const [h0, h1] = range(it.height, [4, 6]); scat(akazie, 5, [16, 16], 5, () => ({ height: rnd.real(h0, h1), solid: it.solid })); break; }
      case 'tempelsaeulen': case 'grubenbalken_reihe': {
        const { a, b, L, yaw } = line(it, p);
        const n = Math.max(1, Math.floor(L / (it.every ?? (it.kind === 'tempelsaeulen' ? 3.5 : 4))) + 1);
        for (let i = 0; i < n; i++) {
          const u = n > 1 ? i / (n - 1) : 0, q = { x: a.x + (b.x - a.x) * u, y: a.y, z: a.z + (b.z - a.z) * u };
          if (it.kind === 'tempelsaeulen') tempelsaeule(level, { ...it, broken: rnd.frac() < (it.broken ?? 0.25) }, q, rnd, P);
          else grubenbalken(level, { ...it, yaw: it.yaw ?? yaw, lamp: it.lamp && i % 2 === 0 }, q, rnd, P, glow);
        }
        break;
      }
      default: {
        const fn = SINGLE[it.kind];
        if (fn) fn(level, it, p, rnd, P, glow);
        else console.warn(`[deco_w5] unbekannte Art ${it.kind}`);
      }
    }
  }
  if (parts.shadow.length) addStatic(level, merge(parts.shadow));
  if (parts.flat.length) addStatic(level, merge(parts.flat), { castShadow: false });
  if (glow.length) addStatic(level, merge(glow), { material: 'glow', castShadow: false });
}

export const TYPES = { deco_w5: buildDecoW5 };
