// Baustein `deco_w4`: Kulisse für Welt 4 (Canyon, Giftwald, Technik, Bergwiese, Ruinen, Lavaburg). Eigene Geometrie
// (und Kulissen-Modelle der Registry, sobald es sie gibt: Name 'deco_w4_<kind>') wird in die statische Geometrie
// verschmolzen (keine zusätzlichen Zeichenaufrufe, Abschnitts-Culling); nur Bewegtes (Windrad, Fackelflammen) wird ein
// eigenes Objekt. Kollision nur mit `solid`.
//
// Einzeln:  { type: 'deco_w4', kind, pos: [x, y, z], … }   oder Liste: { type: 'deco_w4', items: [{ kind, pos, … }, …] }
// pos = Fußpunkt; yaw in Radiant; Streuungen (Mehrzahl-Namen) verteilen deterministisch (seed) in size: [w, d] um pos,
// halten gap m Abstand und meiden avoid: [[x, z, r], …]. shadow: false → wirft keinen Schatten (ferne Kulisse) – je
// Eintrag oder für die ganze Liste ({ type: 'deco_w4', shadow: false, items }).
// kind:
//   Canyon     felsnadel (height 8, size 2.2 Fußradius) · felsnadeln (Streuung: n 5, height [5, 12]) · tafelberg (size [w, d]
//              ([14, 10]), height 10) · canyonwand (from, to, height 12, depth 4: gestufte, gebänderte Felswand) · geroell
//              (Streuung: n 10, size [w, d]) · trockenbusch / trockenbuesche (Streuung: n 6)
//   Giftwald   giftbaum (height 7) · giftbaeume (Streuung: n 5, scale [0.8, 1.3]) · leuchtpilze (Gruppe: n 5, size 1.6,
//              leuchtend) · ranken (hängende Ranken ab pos: length 3, count 4, width 1.6) · sumpfgras (Streuung: n 8)
//   Technik    antenne (height 6, Blinklicht) · lautsprecher (size 1.6, yaw) · neonbogen (width 5, height 4, color, yaw) ·
//              kabel (from, to, sag 1.2, color)
//   Bergwiese  wiesenblumen (Streuung: n 30, size [w, d]) · bergfichte (height 5) · bergfichten (Streuung: n 6) ·
//              heuballen (yaw, size 1.4) · zaun (from, to, height 1) · windrad (height 7, yaw; Flügel drehen sich)
//   Ruinen     saeule (height 5, r 0.6, broken) · saeulen (from, to, every 3, height, broken: 0..1 Anteil) · ruinenbogen
//              (width 4, height 5, yaw) · ruinenmauer (from, to, height 2.5, thick 0.8; bröckelnde Oberkante) · statue
//              (Steinkopf: size 2.4, yaw) · truemmer (Streuung: n 8)
//   Lavaburg   fackel (Wandfackel: yaw = Blickrichtung von der Wand weg; Flamme flackert, Licht) · fackeln (from, to,
//              every 6, yaw) · kette (length 4, hängt ab pos) · ketten (from, to, every 2.5, length) · burgzinne (from,
//              to, height 4, thick 1.6) · banner (height 3, width 1.2, yaw, color) · lavasteine (glühende Brocken: n 6)

import * as THREE from 'three';
import { v3, lin, mixc, smooth, colorize, merge, Rnd, addStatic, addObject, hex, box } from '../kit.js';
import { bakeModel, modelObject } from '../w2kit.js';
import { rotXZ } from '../w3kit.js';
import { hasModel } from '../../models/index.js';
import { glowSprite } from '../w4kit.js';
import { visDt } from '../../entities/gimmick.js';
import { music } from '../../../audio/index.js';

const range = (v, d) => (Array.isArray(v) ? v : [v ?? d[0], v ?? d[1]]);
const C = (h) => lin(hex(h));
const fill = (g, col) => colorize(g.index ? g.toNonIndexed() : g, (p, n, o) => { o[0] = col[0]; o[1] = col[1]; o[2] = col[2]; });
const shadeY = (g, lo, hi, a = -0.6, b = 0.8) => colorize(g.index ? g.toNonIndexed() : g, (p, n, o) => mixc(lo, hi, smooth(a, b, n.y * 0.7 - n.x * 0.25 + n.z * 0.25), o));

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

// ------------------------------------------------------------------ Canyon

const ROCK = [0xc8562e, 0xe07a3e, 0xb04424, 0xf0a060, 0xd8683a].map(C);
const rockBand = (y0) => (p, n, o) => {
  if (n.y > 0.75) { mixc(C(0xe8c080), C(0xd8a868), 0.4, o); return; }
  const b = ROCK[Math.abs(Math.floor((p.y - y0) / 1.1 + Math.sin(p.x * 0.4 + p.z * 0.3) * 0.4)) % ROCK.length];
  mixc(C(0x6a2a1e), b, 0.55 + 0.45 * smooth(-0.8, 0.6, n.x * -0.4 + n.z * 0.6 + n.y * 0.3), o);
};

function felsnadel(level, it, p, rnd, parts) {
  const H = it.height ?? 8, R = it.size ?? 2.2;
  let y = p.y, r = R;
  const n = Math.max(2, Math.round(H / 2.6));
  for (let k = 0; k < n; k++) {
    const h = H / n;
    const g = new THREE.CylinderGeometry(r * 0.82, r, h, 8, 2);
    g.rotateY(rnd.real(0, 1));
    g.translate(p.x + rnd.real(-0.1, 0.1), y + h / 2, p.z + rnd.real(-0.1, 0.1));
    parts.push(colorize(g, rockBand(p.y)));
    y += h; r *= rnd.real(0.78, 0.92);
  }
  const cap = new THREE.CylinderGeometry(r * 1.5, r * 1.05, R * 0.45, 8);
  cap.translate(p.x, y + R * 0.22, p.z);
  parts.push(shadeY(cap, C(0x5a2a1e), C(0x9a5434)));
  if (it.solid) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: R * 0.85, y0: p.y, y1: y, tag: 'felsnadel' });
}

function tafelberg(level, it, p, rnd, parts) {
  const [w, d] = Array.isArray(it.size) ? it.size : [it.size ?? 14, it.size ?? 10];
  const H = it.height ?? 10;
  const g = new THREE.CylinderGeometry(0.47, 0.5, 1, 10, Math.max(2, Math.round(H / 1.4)));
  g.scale(w, H, d);
  g.translate(p.x, p.y + H / 2, p.z);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) { const yy = pos.getY(i); if (yy < p.y + H - 0.1 && yy > p.y + 0.1) { const k = 1 + Math.sin(yy * 1.7 + pos.getX(i)) * 0.03; pos.setX(i, p.x + (pos.getX(i) - p.x) * k); pos.setZ(i, p.z + (pos.getZ(i) - p.z) * k); } }
  g.computeVertexNormals();
  parts.push(colorize(g, rockBand(p.y)));
  if (it.solid) level.world.add({ type: 'box', min: [p.x - w * 0.45, p.y, p.z - d * 0.45], max: [p.x + w * 0.45, p.y + H, p.z + d * 0.45], tag: 'tafelberg' });
}

function canyonwand(level, it, p, rnd, parts) {
  const { a, b, L, yaw } = line(it, p);
  const H = it.height ?? 12, D = it.depth ?? 4;
  const n = Math.max(1, Math.round(L / 3.2));
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const x = a.x + (b.x - a.x) * u, z = a.z + (b.z - a.z) * u;
    const h = H * rnd.real(0.82, 1.08), w = (L / n) * 1.12;
    const tiers = 2;
    for (let t = 0; t < tiers; t++) {
      const th = t === 0 ? h * 0.66 : h * 0.34, ty = a.y + (t === 0 ? 0 : h * 0.66);
      const g = new THREE.BoxGeometry(w * (1 - t * 0.12), th, D * (1 - t * 0.25) * rnd.real(0.85, 1.1), 2, 3, 1);
      const ps = g.attributes.position;
      for (let k = 0; k < ps.count; k++) ps.setZ(k, ps.getZ(k) + Math.sin(ps.getY(k) * 1.3 + i) * 0.25);
      g.computeVertexNormals();
      g.translate(0, th / 2, -t * D * 0.12);
      g.rotateY(yaw);
      g.translate(x, ty, z);
      parts.push(colorize(g, rockBand(a.y)));
    }
  }
  if (it.solid) {
    const xs = [a.x, b.x], zs = [a.z, b.z];
    const nx = Math.abs(Math.sin(yaw)) * D / 2, nz = Math.abs(Math.cos(yaw)) * D / 2;
    level.world.add({ type: 'box', min: [Math.min(...xs) - nx, a.y, Math.min(...zs) - nz], max: [Math.max(...xs) + nx, a.y + H, Math.max(...zs) + nz], tag: 'canyonwand' });
  }
}

function geroell(level, it, p, rnd, parts) {
  for (const [x, z] of scatter(p, it.size ?? [8, 8], it.n ?? 10, 0.6, it.avoid, rnd)) {
    const r = rnd.real(0.25, 0.8);
    const g = new THREE.DodecahedronGeometry(r, 0);
    g.scale(1, rnd.real(0.5, 0.8), rnd.real(0.8, 1.2));
    g.rotateY(rnd.real(0, 3));
    g.translate(x, p.y + r * 0.3, z);
    parts.push(colorize(g, rockBand(p.y - 3)));
  }
}

function trockenbusch(level, it, p, rnd, parts) {
  const s = it.size ?? rnd.real(0.7, 1.2);
  const twig = C(0x8a6a3a), leaf = C(0xb8a85a), leafD = C(0x7a6a32);
  for (let k = 0; k < 5; k++) {
    const g = new THREE.CylinderGeometry(0.02, 0.04, s, 4);
    g.translate(0, s / 2, 0); g.rotateZ(rnd.real(-0.7, 0.7)); g.rotateY(rnd.real(0, 6.28));
    g.translate(p.x, p.y, p.z);
    parts.push(fill(g, twig));
  }
  const g = new THREE.IcosahedronGeometry(s * 0.45, 0);
  g.scale(1.2, 0.7, 1.2);
  g.translate(p.x, p.y + s * 0.55, p.z);
  parts.push(shadeY(g, leafD, leaf));
}

// ------------------------------------------------------------------ Giftwald

function giftbaum(level, it, p, rnd, parts, glow) {
  const H = it.height ?? 7;
  const bark = C(0x2e1c32), barkHi = C(0x5c3c5c);
  let x = p.x, y = p.y, z = p.z, r = H * 0.07;
  const bend = rnd.real(-0.5, 0.5), dir = rnd.real(0, 6.28);
  for (let k = 0; k < 4; k++) {
    const len = H * 0.2;
    const tilt = bend * (k + 1) * 0.3;
    const g = new THREE.CylinderGeometry(r * 0.78, r, len, 7);
    g.translate(0, len / 2, 0); g.rotateZ(tilt); g.rotateY(dir); g.translate(x, y, z);
    parts.push(colorize(g, (pp, n, o) => mixc(bark, barkHi, smooth(-0.4, 0.9, n.x * -0.4 + n.z * 0.5), o)));
    x += -Math.sin(tilt) * len * Math.cos(dir); y += Math.cos(tilt) * len; z += Math.sin(tilt) * len * Math.sin(dir); r *= 0.78;
  }
  // Wurzelanlauf: flache, kurze Wülste am Stammfuß
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + dir;
    const g = new THREE.SphereGeometry(H * 0.06, 6, 4);
    g.scale(2.2, 0.8, 1);
    g.translate(H * 0.07, H * 0.02, 0); g.rotateY(a); g.translate(p.x, p.y, p.z);
    parts.push(shadeY(g, bark, barkHi));
  }
  const cols = [0x7a2aaa, 0x5a1a8a, 0x9a3abf].map(C);
  for (let k = 0; k < 3; k++) {
    const c = cols[k % 3];
    const cr = H * rnd.real(0.26, 0.36) * (1 - k * 0.18);
    const g = new THREE.SphereGeometry(cr, 10, 5, 0, Math.PI * 2, 0, Math.PI * 0.55);
    g.scale(1, 0.5, 1);
    g.translate(x + rnd.real(-1, 1) * H * 0.08, y - k * H * 0.09 + H * 0.05, z + rnd.real(-1, 1) * H * 0.08);
    const dark = mixc(c, [0.02, 0.01, 0.04], 0.55, [0, 0, 0]);
    parts.push(colorize(g, (pp, n, o) => mixc(dark, c, smooth(-0.3, 0.8, n.y), o)));
  }
  // leuchtende Tropfen an der Krone
  const gl = C(0xb8ff6a);
  for (let k = 0; k < 4; k++) {
    const g = new THREE.SphereGeometry(0.09, 5, 3);
    g.translate(x + rnd.real(-1, 1) * H * 0.22, y - H * 0.05 - rnd.real(0, 0.4), z + rnd.real(-1, 1) * H * 0.22);
    glow.push(fill(g, gl));
  }
  if (it.solid !== false) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: H * 0.06, y0: p.y, y1: p.y + H * 0.7, tag: 'giftbaum' });
}

function leuchtpilze(level, it, p, rnd, parts, glow) {
  const n = it.n ?? 5, S = it.size ?? 1.6;
  const caps = [0xc06aff, 0x8aff5a, 0x5affd8].map(C);
  for (let k = 0; k < n; k++) {
    const a = rnd.real(0, 6.28), d = rnd.real(0, S / 2);
    const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
    const h = rnd.real(0.25, 0.7) * (k === 0 ? 1.6 : 1), r = h * rnd.real(0.6, 0.9);
    const st = new THREE.CylinderGeometry(r * 0.22, r * 0.3, h, 6);
    st.translate(x, p.y + h / 2, z);
    parts.push(fill(st, C(0xe8e0d0)));
    const c = caps[k % caps.length];
    const cap = new THREE.SphereGeometry(r, 9, 4, 0, Math.PI * 2, 0, Math.PI / 2);
    cap.scale(1, 0.6, 1);
    cap.translate(x, p.y + h * 0.95, z);
    glow.push(colorize(cap, (pp, nn, o) => mixc(mixc(c, [0, 0, 0], 0.35, [0, 0, 0]), c, smooth(0, 1, nn.y), o)));
    // Punkte
    const dot = new THREE.SphereGeometry(r * 0.12, 4, 2);
    dot.translate(x + r * 0.4, p.y + h * 0.95 + r * 0.4, z);
    glow.push(fill(dot, C(0xffffff)));
  }
}

function ranken(level, it, p, rnd, parts) {
  const L = it.length ?? 3, n = it.count ?? 4, W = it.width ?? 1.6;
  const vine = C(0x3a7a2a), vineHi = C(0x7ac84a), leaf = C(0x5aaa3a);
  for (let k = 0; k < n; k++) {
    const x = p.x + (n > 1 ? (k / (n - 1) - 0.5) * W : 0), z = p.z + rnd.real(-0.1, 0.1);
    const len = L * rnd.real(0.55, 1);
    const g = new THREE.CylinderGeometry(0.035, 0.05, len, 4, 4);
    const ps = g.attributes.position;
    for (let v = 0; v < ps.count; v++) ps.setX(v, ps.getX(v) + Math.sin(ps.getY(v) * 2.2 + k) * 0.08);
    g.translate(x, p.y - len / 2, z);
    parts.push(colorize(g, (pp, nn, o) => mixc(vine, vineHi, smooth(-0.5, 0.8, nn.x), o)));
    for (let j = 0; j < Math.round(len / 0.45); j++) {
      const lg = new THREE.CircleGeometry(0.13, 5);
      lg.scale(1, 0.6, 1);
      lg.rotateY(rnd.real(-0.8, 0.8)); lg.rotateZ(rnd.real(-0.6, 0.6));
      lg.translate(x + (j % 2 ? 0.1 : -0.1), p.y - j * 0.45 - 0.2, z + 0.03);
      parts.push(fill(lg, leaf));
    }
  }
}

function sumpfgras(level, it, p, rnd, parts) {
  const a = C(0x4a7a3a), b = C(0x9aca5a), c = C(0x7a4aa0);
  for (const [x, z] of scatter(p, it.size ?? [5, 5], it.n ?? 8, 0.5, it.avoid, rnd)) {
    for (let k = 0; k < 5; k++) {
      const h = rnd.real(0.5, 1.1);
      const g = new THREE.ConeGeometry(0.035, h, 3);
      g.translate(0, h / 2, 0); g.rotateZ(rnd.real(-0.35, 0.35)); g.rotateY(rnd.real(0, 6));
      g.translate(x + rnd.real(-0.15, 0.15), p.y, z + rnd.real(-0.15, 0.15));
      parts.push(colorize(g, (pp, nn, o) => mixc(a, k === 4 ? c : b, smooth(p.y, p.y + h, pp.y), o)));
    }
  }
}

// ------------------------------------------------------------------ Technik

function antenne(level, it, p, rnd, parts, glow) {
  const H = it.height ?? 6;
  const steel = C(0x5a6a9a), steelHi = C(0xb8c8f0);
  for (const [dx, dz] of [[-0.3, -0.3], [0.3, -0.3], [0, 0.35]]) {
    const g = new THREE.CylinderGeometry(0.04, 0.06, H, 4);
    g.translate(0, H / 2, 0);
    g.rotateX(dz * 0.1); g.rotateZ(-dx * 0.1);
    g.translate(p.x + dx * 0.5, p.y, p.z + dz * 0.5);
    parts.push(shadeY(g, steel, steelHi));
  }
  for (let y = 0.8; y < H - 0.4; y += 0.9) {
    const r = new THREE.TorusGeometry(0.3 * (1 - y / H * 0.6), 0.025, 3, 6);
    r.rotateX(Math.PI / 2); r.translate(p.x, p.y + y, p.z);
    parts.push(fill(r, steel));
  }
  const tip = new THREE.SphereGeometry(0.18, 8, 6);
  tip.translate(p.x, p.y + H + 0.1, p.z);
  glow.push(fill(tip, C(it.color ?? 0xff4060)));
}

function lautsprecher(level, it, p, rnd, parts, glow) {
  const S = it.size ?? 1.6, yaw = it.yaw ?? 0;
  const bx = box(S * 0.8, S, S * 0.6, 0, S / 2, 0, 0x1a1e3a, { r: 0.06, seg: 1, topColor: 0x3a4270 });
  const cones = [];
  for (const [yy, rr] of [[S * 0.68, S * 0.22], [S * 0.28, S * 0.14]]) {
    const ring = new THREE.TorusGeometry(rr, rr * 0.18, 5, 16);
    ring.translate(0, yy, S * 0.3);
    cones.push(fill(ring, C(0x7cf0ff)));
    const cone = new THREE.ConeGeometry(rr * 0.85, rr * 0.5, 14, 1, true);
    cone.rotateX(-Math.PI / 2); cone.translate(0, yy, S * 0.28);
    parts.push(fill(cone, C(0x2a2e4a)).rotateY(yaw).translate(p.x, p.y, p.z));
  }
  parts.push(bx.rotateY(yaw).translate(p.x, p.y, p.z));
  for (const g of cones) glow.push(g.rotateY(yaw).translate(p.x, p.y, p.z));
  if (it.solid !== false) level.world.add({ type: 'box', min: [p.x - S * 0.4, p.y, p.z - S * 0.4], max: [p.x + S * 0.4, p.y + S, p.z + S * 0.4], tag: 'lautsprecher' });
}

function neonbogen(level, it, p, rnd, parts, glow) {
  const W = it.width ?? 5, H = it.height ?? 4, yaw = it.yaw ?? 0;
  const col = C(it.color ?? 0x40e8ff);
  for (const s of [-1, 1]) {
    const post = box(0.3, H, 0.3, s * W / 2, H / 2, 0, 0x2a3466, { r: 0.05, seg: 1 });
    parts.push(post.rotateY(yaw).translate(p.x, p.y, p.z));
    const strip = new THREE.BoxGeometry(0.08, H - 0.4, 0.34);
    strip.translate(s * (W / 2 - 0.17), H / 2, 0);
    glow.push(fill(strip, col).rotateY(yaw).translate(p.x, p.y, p.z));
  }
  const arc = new THREE.TorusGeometry(W / 2, 0.12, 6, 24, Math.PI);
  arc.translate(0, H, 0);
  glow.push(fill(arc, col).rotateY(yaw).translate(p.x, p.y, p.z));
}

function kabel(level, it, p, rnd, parts) {
  const a = v3(it.from ?? it.pos), b = v3(it.to ?? it.pos);
  const sag = it.sag ?? 1.2;
  const pts = [];
  for (let i = 0; i <= 16; i++) { const u = i / 16; pts.push(new THREE.Vector3(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u - Math.sin(u * Math.PI) * sag, a.z + (b.z - a.z) * u)); }
  const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, it.r ?? 0.05, 4);
  parts.push(fill(g, C(it.color ?? 0x1a1a2a)));
}

// ------------------------------------------------------------------ Bergwiese

function wiesenblumen(level, it, p, rnd, parts) {
  const cols = [0xffffff, 0xffe04a, 0xff6aa8, 0xb08aff, 0xff8a3a].map(C);
  const stem = C(0x3a9a3a);
  for (const [x, z] of scatter(p, it.size ?? [6, 6], it.n ?? 30, 0.35, it.avoid, rnd)) {
    const h = rnd.real(0.18, 0.45);
    const st = new THREE.CylinderGeometry(0.015, 0.02, h, 3);
    st.translate(x, p.y + h / 2, z);
    parts.push(fill(st, stem));
    const c = cols[Math.floor(rnd.frac() * cols.length)];
    const fl = new THREE.CircleGeometry(rnd.real(0.07, 0.12), 5);
    fl.rotateX(-Math.PI / 2 + rnd.real(-0.3, 0.3));
    fl.translate(x, p.y + h, z);
    parts.push(fill(fl, c));
  }
}

function bergfichte(level, it, p, rnd, parts) {
  const H = it.height ?? 5;
  const trunk = C(0x5a3a22), dark = C(0x1e5a32), light = C(0x3a8a4a);
  const tr = new THREE.CylinderGeometry(H * 0.03, H * 0.05, H * 0.3, 6);
  tr.translate(p.x, p.y + H * 0.15, p.z);
  parts.push(fill(tr, trunk));
  for (let k = 0; k < 3; k++) {
    const r = H * (0.3 - k * 0.07), h = H * (0.42 - k * 0.06);
    const g = new THREE.ConeGeometry(r, h, 8);
    g.translate(p.x, p.y + H * (0.32 + k * 0.2) + h / 2, p.z);
    parts.push(colorize(g, (pp, n, o) => mixc(dark, light, smooth(-0.3, 0.7, n.y + n.x * -0.3), o)));
  }
  if (it.solid) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: H * 0.05, y0: p.y, y1: p.y + H * 0.6, tag: 'fichte' });
}

function heuballen(level, it, p, rnd, parts) {
  const S = it.size ?? 1.4, yaw = it.yaw ?? rnd.real(0, 3);
  const g = new THREE.CylinderGeometry(S / 2, S / 2, S * 0.9, 16, 2);
  g.rotateX(Math.PI / 2); g.rotateY(yaw); g.translate(p.x, p.y + S / 2, p.z);
  const hay = C(0xf0c860), hayD = C(0xb88a3a);
  parts.push(colorize(g, (pp, n, o) => { mixc(hayD, hay, smooth(-0.6, 0.8, n.y), o); const s = Math.sin(Math.atan2(pp.y - p.y - S / 2, (pp.x - p.x) + (pp.z - p.z)) * 9) > 0.6 ? 0.9 : 1; o[0] *= s; o[1] *= s; o[2] *= s; }));
  if (it.solid !== false) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: S * 0.45, y0: p.y, y1: p.y + S, tag: 'heuballen' });
}

function zaun(level, it, p, rnd, parts) {
  const { a, b, L, yaw } = line(it, p);
  const H = it.height ?? 1, wood = C(0xb8864e), woodHi = C(0xe8c08a);
  const n = Math.max(1, Math.round(L / 1.6));
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const g = new THREE.BoxGeometry(0.14, H, 0.14);
    g.translate(a.x + (b.x - a.x) * u, a.y + H / 2, a.z + (b.z - a.z) * u);
    parts.push(shadeY(g, wood, woodHi));
  }
  for (const yy of [H * 0.4, H * 0.8]) {
    const g = new THREE.BoxGeometry(L, 0.1, 0.06);
    g.rotateY(yaw); g.translate((a.x + b.x) / 2, a.y + yy, (a.z + b.z) / 2);
    parts.push(shadeY(g, wood, woodHi));
  }
}

function windrad(level, it, p, rnd, parts) {
  const H = it.height ?? 7, yaw = it.yaw ?? 0;
  const tower = new THREE.CylinderGeometry(0.35, 0.8, H, 8);
  tower.translate(p.x, p.y + H / 2, p.z);
  parts.push(shadeY(tower, C(0xd8d0c8), C(0xffffff)));
  const roof = new THREE.ConeGeometry(0.9, 1.2, 8);
  roof.translate(p.x, p.y + H + 0.5, p.z);
  parts.push(shadeY(roof, C(0x8a2a2a), C(0xd04a3a)));
  if (!level.view) return;
  const rotor = new THREE.Group();
  const bladeG = new THREE.BoxGeometry(0.25, H * 0.42, 0.05);
  bladeG.translate(0, H * 0.21, 0);
  const mat = new THREE.MeshStandardMaterial({ color: 0xfff6e8, roughness: 0.7 });
  for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(bladeG, mat); b.rotation.z = (k * Math.PI) / 2; b.castShadow = true; rotor.add(b); }
  const holder = new THREE.Group();
  holder.position.set(p.x, p.y + H - 0.4, p.z);
  holder.rotation.y = yaw;
  rotor.position.set(0.85, 0, 0);
  rotor.rotation.y = Math.PI / 2;
  holder.add(rotor);
  const h = {};
  addObject(level, holder, (dt) => { rotor.rotation.z += visDt(level, h, dt) * (it.speed ?? 0.8); });
}

// ------------------------------------------------------------------ Ruinen

const SAND = C(0xe8cc94), SAND_D = C(0xa47a4c), MOSS = C(0x6aa83e);
const sandCol = (p, n, o) => { mixc(SAND_D, SAND, smooth(-0.7, 0.8, n.y * 0.5 - n.x * 0.35 + n.z * 0.4), o); if (n.y > 0.6) mixc(o, MOSS, 0.5, o); };

function saeule(level, it, p, rnd, parts) {
  const H = it.height ?? 5, r = it.r ?? 0.6, broken = !!it.broken;
  const base = new THREE.BoxGeometry(r * 2.6, r * 0.5, r * 2.6);
  base.translate(p.x, p.y + r * 0.25, p.z);
  parts.push(colorize(base, sandCol));
  const hh = broken ? H * rnd.real(0.4, 0.75) : H;
  const g = new THREE.CylinderGeometry(r * 0.92, r, hh - r * 0.5, 12, 3);
  const ps = g.attributes.position;
  if (broken) for (let v = 0; v < ps.count; v++) if (ps.getY(v) > 0) ps.setY(v, ps.getY(v) - Math.max(0, Math.sin(ps.getX(v) * 5 + ps.getZ(v) * 3) * r * 0.5));
  g.computeVertexNormals();
  g.translate(p.x, p.y + r * 0.5 + (hh - r * 0.5) / 2, p.z);
  parts.push(colorize(g, (pp, n, o) => { sandCol(pp, n, o); const a = Math.atan2(pp.z - p.z, pp.x - p.x); const k = 0.88 + 0.12 * Math.cos(a * 12); o[0] *= k; o[1] *= k; o[2] *= k; }));
  if (!broken) {
    const cap = new THREE.BoxGeometry(r * 2.5, r * 0.55, r * 2.5);
    cap.translate(p.x, p.y + H + r * 0.27, p.z);
    parts.push(colorize(cap, sandCol));
  } else {
    // Bruchstück daneben
    const ch = new THREE.CylinderGeometry(r * 0.9, r * 0.9, r * 2.2, 10);
    ch.rotateZ(Math.PI / 2); ch.rotateY(rnd.real(0, 3));
    ch.translate(p.x + rnd.real(1, 1.8), p.y + r * 0.85, p.z + rnd.real(-1, 1));
    parts.push(colorize(ch, sandCol));
  }
  if (it.solid !== false) level.world.add({ type: 'cyl', x: p.x, z: p.z, r, y0: p.y, y1: p.y + (broken ? hh : H + r * 0.55), tag: 'saeule' });
}

function ruinenbogen(level, it, p, rnd, parts) {
  const W = it.width ?? 4, H = it.height ?? 5, yaw = it.yaw ?? 0, t = 0.9;
  const pieces = [];
  for (const s of [-1, 1]) { const g = new THREE.BoxGeometry(t, H, t, 1, 3, 1); g.translate(s * W / 2, H / 2, 0); pieces.push(g); }
  const arc = new THREE.TorusGeometry(W / 2, t / 2, 6, 14, Math.PI);
  arc.translate(0, H, 0);
  pieces.push(arc);
  for (const g of pieces) { g.rotateY(yaw); g.translate(p.x, p.y, p.z); parts.push(colorize(g, sandCol)); }
  if (it.solid !== false) {
    for (const s of [-1, 1]) {
      const ox = Math.cos(yaw) * s * W / 2, oz = -Math.sin(yaw) * s * W / 2;
      level.world.add({ type: 'box', min: [p.x + ox - t / 2, p.y, p.z + oz - t / 2], max: [p.x + ox + t / 2, p.y + H, p.z + oz + t / 2], tag: 'ruinenbogen' });
    }
  }
}

function ruinenmauer(level, it, p, rnd, parts) {
  const { a, b, L, yaw } = line(it, p);
  const H = it.height ?? 2.5, T = it.thick ?? 0.8;
  const n = Math.max(1, Math.round(L / 0.8));
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const h = H * (0.6 + 0.4 * Math.abs(Math.sin(i * 1.7 + a.x))) ;
    const rows = Math.max(1, Math.round(h / 0.5));
    for (let r = 0; r < rows; r++) {
      if (r === rows - 1 && rnd.frac() < 0.3) continue;
      const g = new THREE.BoxGeometry((L / n) * 0.96, 0.46, T * rnd.real(0.9, 1));
      g.rotateY(yaw);
      g.translate(a.x + (b.x - a.x) * u, a.y + r * 0.5 + 0.23, a.z + (b.z - a.z) * u);
      parts.push(colorize(g, (pp, nn, o) => { sandCol(pp, nn, o); const k = 0.9 + ((i + r) % 3) * 0.05; o[0] *= k; o[1] *= k; o[2] *= k; }));
    }
  }
  if (it.solid !== false) {
    const nx = Math.abs(Math.sin(yaw)) * T / 2, nz = Math.abs(Math.cos(yaw)) * T / 2;
    level.world.add({ type: 'box', min: [Math.min(a.x, b.x) - nx, a.y, Math.min(a.z, b.z) - nz], max: [Math.max(a.x, b.x) + nx, a.y + H * 0.6, Math.max(a.z, b.z) + nz], tag: 'ruinenmauer' });
  }
}

function statue(level, it, p, rnd, parts) {
  const S = it.size ?? 2.4, yaw = it.yaw ?? -Math.PI / 2;
  const g = [];
  const head = new THREE.BoxGeometry(S * 0.7, S * 0.85, S * 0.7, 2, 2, 2);
  head.translate(0, S * 0.62, 0); g.push(head);
  const nose = new THREE.BoxGeometry(S * 0.14, S * 0.3, S * 0.18); nose.translate(S * 0.36, S * 0.6, 0); g.push(nose);
  const brow = new THREE.BoxGeometry(S * 0.12, S * 0.1, S * 0.6); brow.translate(S * 0.36, S * 0.78, 0); g.push(brow);
  const plinth = new THREE.BoxGeometry(S * 0.9, S * 0.2, S * 0.9); plinth.translate(0, S * 0.1, 0); g.push(plinth);
  for (const q of g) { q.rotateY(yaw); q.translate(p.x, p.y, p.z); parts.push(colorize(q, sandCol)); }
  if (it.solid !== false) level.world.add({ type: 'box', min: [p.x - S * 0.4, p.y, p.z - S * 0.4], max: [p.x + S * 0.4, p.y + S * 1.05, p.z + S * 0.4], tag: 'statue' });
}

function truemmer(level, it, p, rnd, parts) {
  for (const [x, z] of scatter(p, it.size ?? [6, 6], it.n ?? 8, 0.7, it.avoid, rnd)) {
    const s = rnd.real(0.3, 0.8);
    const g = new THREE.BoxGeometry(s * rnd.real(1, 1.8), s * rnd.real(0.5, 0.9), s);
    g.rotateY(rnd.real(0, 3)); g.rotateZ(rnd.real(-0.25, 0.25));
    g.translate(x, p.y + s * 0.3, z);
    parts.push(colorize(g, sandCol));
  }
}

// ------------------------------------------------------------------ Lavaburg

const IRON = C(0x3a3640), IRON_HI = C(0x8a8494);

function fackel(level, it, p, rnd, parts, glow) {
  const yaw = it.yaw ?? -Math.PI / 2;
  const f = { x: Math.cos(yaw), z: -Math.sin(yaw) };
  const g = [];
  const plate = new THREE.BoxGeometry(0.1, 0.5, 0.3); plate.translate(0, 0, 0); g.push(plate);
  const arm = new THREE.CylinderGeometry(0.04, 0.05, 0.5, 5); arm.rotateZ(Math.PI / 2 - 0.5); arm.translate(0.22, 0.12, 0); g.push(arm);
  const cup = new THREE.CylinderGeometry(0.16, 0.08, 0.22, 7); cup.translate(0.42, 0.32, 0); g.push(cup);
  for (const q of g) { q.rotateY(yaw); q.translate(p.x, p.y, p.z); parts.push(shadeY(q, IRON, IRON_HI)); }
  const fx = p.x + f.x * 0.42, fz = p.z + f.z * 0.42, fy = p.y + 0.5;
  level.view?.addLantern?.(fx, fy, fz);
  if (!level.view) return;
  const flame = new THREE.Group();
  const fg = new THREE.ConeGeometry(0.13, 0.42, 7);
  fg.translate(0, 0.21, 0);
  const outer = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: 0xff8a20 }));
  const inner = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: 0xffe070 }));
  inner.scale.setScalar(0.6);
  const glowS = glowSprite(0xff9030, 1.6, 0.6);
  glowS.position.y = 0.2;
  flame.add(outer, inner, glowS);
  flame.position.set(fx, fy - 0.08, fz);
  const h = {};
  let t = rnd.real(0, 6);
  addObject(level, flame, (dt) => { t += visDt(level, h, dt); const k = 1 + Math.sin(t * 13) * 0.08 + Math.sin(t * 7.3) * 0.06; flame.scale.set(1, k, 1); outer.rotation.y = t * 2; });
}

function kette(level, it, p, rnd, parts) {
  const L = it.length ?? 4;
  const n = Math.max(2, Math.round(L / 0.22));
  for (let i = 0; i < n; i++) {
    const g = new THREE.TorusGeometry(0.09, 0.025, 4, 8);
    if (i % 2) g.rotateY(Math.PI / 2);
    g.rotateX(Math.PI / 2 * 0);
    g.translate(p.x, p.y - i * 0.2 - 0.1, p.z);
    parts.push(shadeY(g, IRON, IRON_HI));
  }
}

function burgzinne(level, it, p, rnd, parts) {
  const { a, b, L, yaw } = line(it, p);
  const H = it.height ?? 4, T = it.thick ?? 1.6;
  const st = C(0x4a3a40), stHi = C(0x7a6068);
  const col = (pp, n, o) => { mixc(st, stHi, smooth(-0.7, 0.8, n.y * 0.4 - n.x * 0.3 + n.z * 0.5), o); if (((Math.floor(pp.y / 0.6) + Math.floor((pp.x + pp.z) / 1.2)) & 1) && Math.abs(n.y) < 0.3) { o[0] *= 0.88; o[1] *= 0.88; o[2] *= 0.88; } };
  const wall = new THREE.BoxGeometry(L, H, T, Math.max(1, Math.round(L)), 3, 1);
  wall.rotateY(yaw); wall.translate((a.x + b.x) / 2, a.y + H / 2, (a.z + b.z) / 2);
  parts.push(colorize(wall, col));
  const n = Math.max(1, Math.floor(L / 1.4));
  for (let i = 0; i < n; i += 1) {
    if (i % 2) continue;
    const u = (i + 0.5) / n;
    const m = new THREE.BoxGeometry(L / n, 0.8, T * 1.04);
    m.rotateY(yaw); m.translate(a.x + (b.x - a.x) * u, a.y + H + 0.4, a.z + (b.z - a.z) * u);
    parts.push(colorize(m, col));
  }
  if (it.solid !== false) {
    const nx = Math.abs(Math.sin(yaw)) * T / 2, nz = Math.abs(Math.cos(yaw)) * T / 2;
    level.world.add({ type: 'box', min: [Math.min(a.x, b.x) - nx, a.y, Math.min(a.z, b.z) - nz], max: [Math.max(a.x, b.x) + nx, a.y + H, Math.max(a.z, b.z) + nz], tag: 'burgzinne' });
  }
}

function banner(level, it, p, rnd, parts) {
  const H = it.height ?? 3, W = it.width ?? 1.2, yaw = it.yaw ?? 0;
  const red = C(it.color ?? 0xb01a2a), gold = C(0xffc83a);
  const g = new THREE.PlaneGeometry(W, H, 2, 4);
  const ps = g.attributes.position;
  for (let v = 0; v < ps.count; v++) { if (ps.getY(v) < -H / 2 + 0.01 && Math.abs(ps.getX(v)) < 0.01) ps.setY(v, ps.getY(v) + W * 0.35); ps.setZ(v, Math.sin(ps.getY(v) * 1.5) * 0.05); }
  g.translate(0, -H / 2, 0);
  const gg = colorize(g, (pp, n, o) => { const em = Math.hypot(pp.x, pp.y + H * 0.38) < W * 0.24; mixc(red, gold, em ? 1 : 0, o); });
  gg.rotateY(yaw); gg.translate(p.x, p.y, p.z);
  parts.push(gg);
  const rod = new THREE.CylinderGeometry(0.04, 0.04, W + 0.3, 5);
  rod.rotateZ(Math.PI / 2); rod.rotateY(yaw); rod.translate(p.x, p.y + 0.02, p.z);
  parts.push(fill(rod, gold));
}

function lavasteine(level, it, p, rnd, parts, glow) {
  const hot = C(0xffa030), dark = C(0x2a1a18);
  for (const [x, z] of scatter(p, it.size ?? [5, 5], it.n ?? 6, 0.8, it.avoid, rnd)) {
    const r = rnd.real(0.3, 0.75);
    const g = new THREE.DodecahedronGeometry(r, 0);
    g.scale(1, 0.7, 1); g.translate(x, p.y + r * 0.35, z);
    parts.push(fill(g, dark));
    const c = new THREE.DodecahedronGeometry(r * 0.55, 0);
    c.scale(1, 0.5, 1); c.translate(x, p.y + r * 0.62, z);
    glow.push(fill(c, hot));
  }
}

// ------------------------------------------------------------------ Kulissen-Modelle der Registry (models/kinds/props_*_w4.js)

/** Takt-Puls 0..1 (Blitz zu Beginn jeder Zählzeit) aus der Taktuhr des Levels bzw. der Musik. */
function beatPulse(level) {
  let b = level.beepClock?.beat;
  if (b === undefined) { try { const mb = music.beat(); b = mb.playing ? mb.beat : level.time * 2; } catch { b = level.time * 2; } }
  return Math.exp(-(((b % 1) + 1) % 1) * 5);
}

/** Achsenparalleler Hüllquader eines lokalen Quaders (Ursprung p, Gier yaw: lokal x → rotXZ). */
function boxAt(level, p, lx0, lx1, y0, y1, lz0, lz1, yaw, tag) {
  const xs = [], zs = [];
  for (const a of [lx0, lx1]) for (const b of [lz0, lz1]) { const w = rotXZ(a, b, yaw); xs.push(p.x + w.x); zs.push(p.z + w.z); }
  level.world.add({ type: 'box', min: [Math.min(...xs), p.y + y0, Math.min(...zs)], max: [Math.max(...xs), p.y + y1, Math.max(...zs)], tag });
}

const sh = (it) => ({ castShadow: it.shadow !== false });

/**
 * Kind → Aufbau mit Modell (nur wenn das Modell in der Registry ist; sonst eigene Geometrie oben). yaw = Drehung des
 * Modells (Vorderseite bzw. Durchgang bei yaw 0 nach +X, wie bei allen Modellen).
 */
const REG = {
  felsnadel(level, it, p) {
    const H = it.height ?? 5;
    bakeModel(level, 'felsnadel', { height: H }, p.x, p.y, p.z, it.yaw ?? (p.x * 1.7 + p.z) % 6.28, it.scale ?? 1, {}, sh(it));
    if (it.solid) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: it.size ?? H * 0.2, y0: p.y, y1: p.y + H, tag: 'felsnadel' });
  },
  tafelberg(level, it, p) {
    const sz = Array.isArray(it.size) ? Math.max(...it.size) : it.size;
    const R = it.radius ?? (sz ? sz / 2 : 4), H = it.height ?? 6;
    bakeModel(level, 'tafelberg', { radius: R, height: H }, p.x, p.y, p.z, it.yaw ?? 0, 1, {}, sh(it));
    if (it.solid) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: R * 0.9, y0: p.y, y1: p.y + H, tag: 'tafelberg' });
  },
  canyon_bogen(level, it, p) {
    const W = it.width ?? 5, H = it.height ?? 4, T = it.thickness ?? 1.2, yaw = it.yaw ?? 0;
    bakeModel(level, 'canyon_bogen', { width: W, height: H, thickness: T }, p.x, p.y, p.z, yaw, 1, {}, sh(it));
    if (it.solid !== false) for (const s of [-1, 1]) boxAt(level, p, -T / 2, T / 2, 0, H * 0.7, s * W / 2 - T * 0.6, s * W / 2 + T * 0.6, yaw, 'canyon_bogen');
  },
  ameisenhuegel(level, it, p) {
    const S = it.size ?? 2.5;
    bakeModel(level, 'ameisenhuegel', { size: S }, p.x, p.y, p.z, it.yaw ?? 0, 1, {}, sh(it));
    if (it.solid !== false) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: S * 0.4, y0: p.y, y1: p.y + S * 0.45, tag: 'ameisenhuegel' });
  },
  ameisenhoehle(level, it, p) {
    bakeModel(level, 'ameisenhoehle', { width: it.width ?? 3.2, height: it.height ?? 2.4 }, p.x, p.y, p.z, it.yaw ?? 0, 1, {}, sh(it));
  },
  giftpilz(level, it, p) {
    const H = it.height ?? 2;
    bakeModel(level, 'giftpilz', { height: H }, p.x, p.y, p.z, it.yaw ?? (p.x + p.z * 1.3) % 6.28, it.scale ?? 1, {}, sh(it));
    if (it.solid) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: H * 0.12, y0: p.y, y1: p.y + H * 0.8, tag: 'giftpilz' });
  },
  giftbaum(level, it, p) {
    const H = it.height ?? 5;
    bakeModel(level, 'giftbaum', { height: H }, p.x, p.y, p.z, it.yaw ?? (p.x * 0.7 + p.z) % 6.28, 1, {}, sh(it));
    if (it.solid !== false) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: H * 0.07, y0: p.y, y1: p.y + H * 0.7, tag: 'giftbaum' });
  },
  liane(level, it, p) {
    if (level.view) modelObject(level, 'liane', { length: it.length ?? 3 }, p.x, p.y, p.z, it.yaw ?? 0, { sway: it.sway ?? 0.35 });
  },
  giftwasserfall(level, it, p) {
    if (level.view) modelObject(level, 'giftwasserfall', { width: it.width ?? 3, height: it.height ?? 5 }, p.x, p.y, p.z, it.yaw ?? 0, {});
  },
  lavafall(level, it, p) {
    if (level.view) modelObject(level, 'lavafall', { width: it.width ?? 3, height: it.height ?? 5 }, p.x, p.y, p.z, it.yaw ?? 0, {});
  },
  lautsprecher(level, it, p) {
    const H = it.height ?? (it.size ?? 2);
    if (level.view) { const st = { beat: 0 }; modelObject(level, 'lautsprecher', { height: H }, p.x, p.y, p.z, it.yaw ?? 0, () => { st.beat = beatPulse(level); return st; }); }
    if (it.solid !== false) level.world.add({ type: 'box', min: [p.x - H * 0.35, p.y, p.z - H * 0.35], max: [p.x + H * 0.35, p.y + H, p.z + H * 0.35], tag: 'lautsprecher' });
  },
  neon_ring(level, it, p) {
    if (level.view) { const st = { pulse: 0 }; modelObject(level, 'neon_ring', { radius: it.radius ?? 1.5, color: it.color ?? 'cyan' }, p.x, p.y, p.z, it.yaw ?? 0, () => { st.pulse = 0.35 + 0.65 * beatPulse(level); return st; }); }
  },
  equalizer_saeule(level, it, p) {
    const H = it.height ?? 4, seed = (p.x * 3.1 + p.z * 1.7) % 1;
    if (level.view) {
      const st = { level: 0 };
      modelObject(level, 'equalizer_saeule', { segments: it.segments ?? 10, height: H }, p.x, p.y, p.z, it.yaw ?? 0, () => {
        const k = beatPulse(level);
        st.level = Math.min(1, 0.25 + 0.6 * k + 0.15 * Math.abs(Math.sin(level.time * 3.7 + seed * 9)));
        return st;
      });
    }
    if (it.solid !== false) level.world.add({ type: 'box', min: [p.x - 0.5, p.y, p.z - 0.5], max: [p.x + 0.5, p.y + H, p.z + 0.5], tag: 'equalizer' });
  },
  wolkeninsel(level, it, p) {
    const S = it.size ?? 4;
    bakeModel(level, 'wolkeninsel', { size: S }, p.x, p.y, p.z, it.yaw ?? 0, 1, {}, sh(it));
    if (it.solid !== false) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: S * 0.42, y0: p.y + S * 0.42 - 0.6, y1: p.y + S * 0.42, tag: 'wolkeninsel' });
  },
  windrad(level, it, p) {
    if (level.view) modelObject(level, 'windrad', { height: it.height ?? 6 }, p.x, p.y, p.z, it.yaw ?? 0, { speed: it.speed ?? 0.3 });
    if (it.solid !== false) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.45, y0: p.y, y1: p.y + (it.height ?? 6), tag: 'windrad' });
  },
  saeule(level, it, p) {
    const H = it.height ?? 5;
    bakeModel(level, 'ruinen_saeule', { height: H, broken: !!it.broken }, p.x, p.y, p.z, it.yaw ?? (p.x + p.z) % 6.28, 1, {}, sh(it));
    if (it.solid !== false) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: it.r ?? 0.55, y0: p.y, y1: p.y + H * (it.broken ? 0.6 : 1), tag: 'saeule' });
  },
  statue(level, it, p) {
    const S = it.size ?? 3, yaw = it.yaw ?? 0;
    bakeModel(level, 'statue_bruch', { size: S }, p.x, p.y, p.z, yaw, 1, {}, sh(it));
    if (it.solid !== false) level.world.add({ type: 'box', min: [p.x - S * 0.3, p.y, p.z - S * 0.3], max: [p.x + S * 0.3, p.y + S * 0.85, p.z + S * 0.3], tag: 'statue' });
  },
  ruinenbogen(level, it, p) {
    const W = it.width ?? 4, H = it.height ?? 4.5, yaw = it.yaw ?? 0;
    bakeModel(level, 'ruinen_torbogen', { width: W, height: H }, p.x, p.y, p.z, yaw, 1, {}, sh(it));
    if (it.solid !== false) for (const s of [-1, 1]) boxAt(level, p, -0.5, 0.5, 0, H * 0.85, s * (W / 2 + 0.45) - 0.45, s * (W / 2 + 0.45) + 0.45, yaw, 'ruinenbogen');
  },
  ruinen_treppe(level, it, p) {
    const n = it.steps ?? 5, W = it.width ?? 3, rise = it.rise ?? 0.35, run = it.run ?? 0.55, yaw = it.yaw ?? 0;
    bakeModel(level, 'ruinen_treppe', { steps: n, width: W, rise, run }, p.x, p.y, p.z, yaw, 1, {}, sh(it));
    if (it.solid !== false) for (let i = 0; i < n; i++) boxAt(level, p, i * run, n * run, 0, (i + 1) * rise, -W / 2, W / 2, yaw, 'ruinen_treppe');
  },
  ranken(level, it, p) {
    if (level.view) modelObject(level, 'ranken', { length: it.width ?? it.length ?? 3, kind: it.lage === 'boden' ? 'boden' : 'haengend' }, p.x, p.y, p.z, it.yaw ?? 0, { sway: it.sway ?? 0.3 });
  },
  kette(level, it, p) {
    if (level.view) modelObject(level, 'burg_kette', { length: it.length ?? 3 }, p.x, p.y, p.z, it.yaw ?? 0, { sway: it.sway ?? 0.2 });
  },
  banner(level, it, p) {
    if (level.view) modelObject(level, 'brummbaer_banner', { height: it.height ?? 3, width: it.width ?? 1.4 }, p.x, p.y, p.z, it.yaw ?? 0, { sway: it.sway ?? 0.3 });
  },
  burgzinne(level, it, p) {
    const { a, b, L } = line(it, p);
    const H = it.height ?? 3.5, T = it.thick ?? 1;
    const yaw = Math.atan2(b.x - a.x, b.z - a.z) - Math.PI / 2;   // Modell verläuft lokal entlang z; lokal +Z → Richtung a→b
    const m = { x: (a.x + b.x) / 2, y: a.y, z: (a.z + b.z) / 2 };
    bakeModel(level, 'burgmauer', { length: L, height: H, thickness: T }, m.x, m.y, m.z, yaw + Math.PI / 2, 1, {}, sh(it));
    if (it.solid !== false) boxAt(level, m, -T / 2, T / 2, 0, H, -L / 2, L / 2, yaw + Math.PI / 2, 'burgzinne');
  },
  fallgitter(level, it, p) {
    const W = it.width ?? 3, H = it.height ?? 3.5, yaw = it.yaw ?? 0;
    const st = { open: it.open ? 1 : 0, target: it.open ? 1 : 0 };
    let sid = null;
    const shape = () => {
      const xs = [], zs = [];
      for (const aa of [-0.2, 0.2]) for (const bb of [-W / 2, W / 2]) { const w = rotXZ(aa, bb, yaw); xs.push(p.x + w.x); zs.push(p.z + w.z); }
      return { type: 'box', min: [Math.min(...xs), p.y, Math.min(...zs)], max: [Math.max(...xs), p.y + H, Math.max(...zs)], tag: 'fallgitter' };
    };
    const sync = () => {
      const closed = st.open < 0.6;
      if (closed && sid === null && it.solid !== false) sid = level.world.add(shape());
      else if (!closed && sid !== null) { level.world.remove(sid); sid = null; }
    };
    sync();
    const h = { get openK() { return st.open; }, start() { st.target = 1; }, open() { st.target = 1; }, close() { st.target = 0; }, toggle() { st.target = 1 - st.target; } };
    if (it.id) level.named.set(it.id, h);
    level.onStep((dt) => { if (st.open !== st.target) { st.open = st.target > st.open ? Math.min(1, st.open + dt / 1.2) : Math.max(0, st.open - dt / 0.5); sync(); } });
    if (level.view) modelObject(level, 'fallgitter', { width: W, height: H }, p.x, p.y, p.z, yaw, () => ({ open: st.open }));
  },
  festungsgitter(level, it, p) {
    const W = it.width ?? 4, H = it.height ?? 3, yaw = it.yaw ?? 0;
    if (level.view) modelObject(level, 'festungsgitter', { width: W, height: H }, p.x, p.y, p.z, yaw, {});
    if (it.solid !== false) boxAt(level, p, -0.15, 0.15, 0, H, -W / 2, W / 2, yaw, 'festungsgitter');
  },
};
const REG_MODEL = {
  felsnadel: 'felsnadel', tafelberg: 'tafelberg', canyon_bogen: 'canyon_bogen', ameisenhuegel: 'ameisenhuegel', ameisenhoehle: 'ameisenhoehle',
  giftpilz: 'giftpilz', giftbaum: 'giftbaum', liane: 'liane', giftwasserfall: 'giftwasserfall', lavafall: 'lavafall', lautsprecher: 'lautsprecher',
  neon_ring: 'neon_ring', equalizer_saeule: 'equalizer_saeule', wolkeninsel: 'wolkeninsel', windrad: 'windrad', saeule: 'ruinen_saeule',
  statue: 'statue_bruch', ruinenbogen: 'ruinen_torbogen', ruinen_treppe: 'ruinen_treppe', ranken: 'ranken', kette: 'burg_kette',
  banner: 'brummbaer_banner', burgzinne: 'burgmauer', fallgitter: 'fallgitter', festungsgitter: 'festungsgitter',
};
const viaModel = (kind) => !!REG[kind] && hasModel(REG_MODEL[kind]);

// ------------------------------------------------------------------ Aufbau

const SINGLE = {
  felsnadel, tafelberg, canyonwand, geroell, trockenbusch, giftbaum, leuchtpilze, ranken, sumpfgras, antenne, lautsprecher,
  neonbogen, kabel, wiesenblumen, bergfichte, heuballen, zaun, windrad, saeule, ruinenbogen, ruinenmauer, statue, truemmer,
  fackel, kette, burgzinne, banner, lavasteine,
};

export function buildDecoW4(level, spec) {
  const items = spec.items ?? [spec];
  const parts = { shadow: [], flat: [] };
  const glow = [];
  for (const it0 of items) {
    const it = spec.items && spec.shadow === false && it0.shadow === undefined ? { ...it0, shadow: false } : it0;
    const p = v3(it.pos ?? it.from);
    const rnd = new Rnd((it.seed ?? Math.floor(p.x * 73 + p.z * 37 + p.y * 11)) >>> 0);
    const P = it.shadow === false ? parts.flat : parts.shadow;
    const scat = (fn, n, sz, gap, mk, regKind) => {
      for (const [x, z] of scatter(p, it.size ?? sz, it.n ?? n, it.gap ?? gap, it.avoid, rnd)) {
        const one = { shadow: it.shadow, ...mk() };
        if (regKind && viaModel(regKind)) REG[regKind](level, one, { x, y: p.y, z }); else fn(level, one, { x, y: p.y, z }, rnd, P, glow);
      }
    };
    if (viaModel(it.kind)) { REG[it.kind](level, it, p, rnd); continue; }
    switch (it.kind) {
      case 'felsnadeln': { const [h0, h1] = range(it.height, [5, 12]); scat(felsnadel, 5, [12, 12], 3, () => ({ height: rnd.real(h0, h1), size: rnd.real(1.4, 2.6), solid: it.solid }), 'felsnadel'); break; }
      case 'giftpilze': { const [h0, h1] = range(it.height, [1.2, 2.6]); scat(leuchtpilze, 5, [8, 8], 1.6, () => ({ height: rnd.real(h0, h1), n: 3, solid: it.solid }), 'giftpilz'); break; }
      case 'trockenbuesche': scat(trockenbusch, 6, [8, 8], 1.2, () => ({})); break;
      case 'giftbaeume': { const [s0, s1] = range(it.scale, [0.8, 1.3]); scat(giftbaum, 5, [12, 12], 3, () => ({ height: 6 * rnd.real(s0, s1), solid: it.solid ?? false }), 'giftbaum'); break; }
      case 'bergfichten': { const [s0, s1] = range(it.scale, [0.8, 1.3]); scat(bergfichte, 6, [12, 12], 2.2, () => ({ height: 5 * rnd.real(s0, s1), solid: it.solid })); break; }
      case 'saeulen': {
        const { a, b, L } = line(it, p);
        const n = Math.max(1, Math.floor(L / (it.every ?? 3)) + 1);
        for (let i = 0; i < n; i++) {
          const u = n > 1 ? i / (n - 1) : 0, q = { x: a.x + (b.x - a.x) * u, y: a.y, z: a.z + (b.z - a.z) * u };
          const one = { ...it, broken: rnd.frac() < (it.broken ?? 0.3) };
          if (viaModel('saeule')) REG.saeule(level, one, q); else saeule(level, one, q, rnd, P);
        }
        break;
      }
      case 'fackeln': case 'ketten': {
        const { a, b, L } = line(it, p);
        const n = Math.max(1, Math.floor(L / (it.every ?? (it.kind === 'fackeln' ? 6 : 2.5))) + 1);
        const fn = it.kind === 'fackeln' ? fackel : kette;
        for (let i = 0; i < n; i++) {
          const u = n > 1 ? i / (n - 1) : 0, q = { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u };
          if (it.kind === 'ketten' && viaModel('kette')) REG.kette(level, it, q); else fn(level, it, q, rnd, P, glow);
        }
        break;
      }
      default: {
        const fn = SINGLE[it.kind];
        if (fn) fn(level, it, p, rnd, P, glow);
        else console.warn(`[deco_w4] unbekannte Art ${it.kind}`);
      }
    }
  }
  if (parts.shadow.length) addStatic(level, merge(parts.shadow));
  if (parts.flat.length) addStatic(level, merge(parts.flat), { castShadow: false });
  if (glow.length) addStatic(level, merge(glow), { material: 'glow', castShadow: false });
}

export const TYPES = { deco_w4: buildDecoW4 };
