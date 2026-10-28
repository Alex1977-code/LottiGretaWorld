// Baustein `deco_w6`: Kulisse für Welt 6 „Wolkeninseln“ (Bergland, Steinkreis, Geisterschiffe, Fernost-Halle, Dschungel,
// Schneegipfel, Maschinenhalle, Minenschacht). Eigene Geometrie (bzw. Kulissen-Modelle der Registry, sobald es sie gibt:
// Name 'deco_w6_<kind>', Ursprung = Fußpunkt, Blick +X) wird in die statische Geometrie verschmolzen (keine zusätzlichen
// Zeichenaufrufe, Abschnitts-Culling); Leuchtendes (Laternen, Kristalle) geht ins Glüh-Material. Kollision nur mit `solid`
// (bleibt auch erhalten, wenn ein Registry-Modell das Aussehen übernimmt).
//
// Einzeln:  { type: 'deco_w6', kind, pos: [x, y, z], … }   oder Liste: { type: 'deco_w6', items: [{ kind, pos, … }, …] }
// pos = Fußpunkt; yaw in Radiant; Streuungen (Mehrzahl-Namen) verteilen deterministisch (seed) in size: [w, d] um pos,
// halten gap m Abstand und meiden avoid: [[x, z, r], …]. shadow: false → wirft keinen Schatten (ferne Kulisse) – je Eintrag
// oder für die ganze Liste. scale: Faktor für Registry-Modelle.
// kind:
//   Himmel/Berg  wolke (Deko-Wolke: size 3) · wolken (Streuung n 5) · bergkiefer (height 4) · bergkiefern (Streuung n 6) ·
//                fels (size 1.2) · felsen (Streuung n 6) · bergblumen (Streuung n 14) · menhir (height 4, Steinkreis)
//   Schiff       mast (height 7, sail true, yaw) · fass (size 1) · kiste (size 1) · anker (size 1.6, yaw) · steuerrad (yaw) ·
//                wrackteil (zerbrochene Planken: size 2, yaw)
//   Fernost      laterne (Papierlaterne, leuchtet: height 0 = steht, hang: true = hängt an einer Schnur von pos) ·
//                laternenpfahl (height 2.4) · bambus (Bambushain: n 7, height [3, 6]) · kirschbaum (height 5) ·
//                paravent (Faltwand: width 3, yaw)
//   Dschungel    dschungelbaum (height 9) · farn (Farnbüschel: size 1.2) · farne (Streuung n 8) · liane (hängt von pos
//                herab: length 4) · riesenblatt (size 2, yaw) · pilze (leuchtende Pilze: Streuung n 6)
//   Schnee       schneehaufen (size 1.4) · schneekiefer (height 5) · eiszapfen (Reihe from → to, length 0.8)
//   Fabrik       zahnrad (size 2, yaw, axis 'z' | 'y') · rohr (from → to, r 0.35, color) · schornstein (height 6) ·
//                warnstreifen (Bodenmarkierung: size [w, d], yaw)
//   Mine         minenbalken (Stützrahmen: width 4, height 3.2, yaw) · minenbalken_reihe (from, to, every 4) ·
//                minenlampe (hängende Grubenlampe, leuchtet, view.addLantern) · kristalle (n 4, size 1) · lore (yaw) ·
//                schienen (from → to)

import * as THREE from 'three';
import { v3, lin, mixc, smooth, colorize, merge, Rnd, addStatic, hex, box } from '../kit.js';
import { bakeModel } from '../w2kit.js';
import { hasModel } from '../../models/index.js';
import { gearGeo } from '../../view/backdrop_w6.js';

const C = (h) => lin(hex(h));
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const range = (v, d) => (Array.isArray(v) ? v : [v ?? d[0], v ?? d[1]]);
const fill = (g, col) => { const c = Array.isArray(col) ? col : C(col); return colorize(ni(g), (p, n, o) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }); };
const shadeY = (g, lo, hi, a = -0.6, b = 0.8) => { const L = Array.isArray(lo) ? lo : C(lo), H = Array.isArray(hi) ? hi : C(hi); return colorize(ni(g), (p, n, o) => mixc(L, H, smooth(a, b, n.y * 0.7 - n.x * 0.25 + n.z * 0.25), o)); };
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
  return { a, b, L: Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z), yaw: Math.atan2(-(b.z - a.z), b.x - a.x) };
}

/** Zylinder von a nach b (Rohr, Ast, Liane). */
function rod(a, b, r0, r1 = r0, seg = 7) {
  const d = new THREE.Vector3(b.x - a.x, b.y - a.y, b.z - a.z);
  const L = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, L, seg);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
}

// ------------------------------------------------------------------ Himmel und Berg

const WHITE = C(0xffffff), CLOUD_S = C(0xcadcf2);
function wolke(level, it, p, rnd, parts) {
  const s = it.size ?? 3;
  for (let i = 0; i < 6; i++) {
    const r = s * rnd.real(0.22, 0.38);
    const g = new THREE.SphereGeometry(r, 10, 7);
    g.scale(1, 0.75, 1);
    parts.push(colorize(ni(at(g, p.x + rnd.real(-s / 2, s / 2), p.y + rnd.real(0, s * 0.2), p.z + rnd.real(-s / 3, s / 3))), (q, n, o) => mixc(CLOUD_S, WHITE, smooth(-0.6, 0.5, n.y), o)));
  }
}

const PINE = C(0x2a7a4a), PINE_D = C(0x1a4a2e), BARK = C(0x6a4428), BARK_D = C(0x3a2414);
function bergkiefer(level, it, p, rnd, parts) {
  const H = it.height ?? 4;
  parts.push(shadeY(at(new THREE.CylinderGeometry(H * 0.04, H * 0.06, H * 0.35, 6), p.x, p.y + H * 0.17, p.z), BARK_D, BARK));
  const snow = it.snow ? C(0xffffff) : null;
  for (let k = 0; k < 3; k++) {
    const r = H * (0.32 - k * 0.07), h = H * 0.42;
    const g = at(new THREE.ConeGeometry(r, h, 7), p.x, p.y + H * 0.3 + k * H * 0.22 + h / 2, p.z, rnd.real(0, 3));
    parts.push(colorize(ni(g), (q, n, o) => { mixc(PINE_D, PINE, smooth(-0.3, 0.9, n.y), o); if (snow && n.y > 0.55) mixc(o, snow, 0.85, o); }));
  }
  if (it.solid) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: H * 0.06 + 0.05, y0: p.y, y1: p.y + H * 0.8, tag: 'bergkiefer' });
}

const ROCK = C(0x9a96aa), ROCK_D = C(0x5a566a);
function fels(level, it, p, rnd, parts) {
  const s = it.size ?? 1.2;
  const g = new THREE.DodecahedronGeometry(s * 0.6, 0);
  g.scale(1, rnd.real(0.55, 0.85), rnd.real(0.8, 1.1));
  g.rotateY(rnd.real(0, 3));
  parts.push(shadeY(at(g, p.x, p.y + s * 0.25, p.z), it.dark ?? ROCK_D, it.light ?? ROCK));
  if (it.solid) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: s * 0.5, y0: p.y, y1: p.y + s * 0.7, tag: 'fels' });
}

const FLOWER = [0xffffff, 0xffd23a, 0xff8ad0, 0xb8a0ff];
function bergblume(level, it, p, rnd, parts) {
  const st = at(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 3), p.x, p.y + 0.15, p.z);
  parts.push(fill(st, 0x3a9a3a));
  const c = FLOWER[Math.floor(rnd.frac() * FLOWER.length)];
  parts.push(fill(at(new THREE.SphereGeometry(0.08, 6, 4), p.x, p.y + 0.32, p.z), c));
}

const STONE = C(0xb8b4c4), STONE_D = C(0x6a6680), MOSS = C(0x6aa84a);
function menhir(level, it, p, rnd, parts) {
  const H = it.height ?? 4, w = H * 0.32;
  const g = new THREE.BoxGeometry(w, H, w * 0.65, 2, 3, 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) { const t = (pos.getY(i) + H / 2) / H; pos.setX(i, pos.getX(i) * (1 - t * 0.2)); pos.setZ(i, pos.getZ(i) * (1 - t * 0.2)); }
  at(g, p.x, p.y + H / 2, p.z, it.yaw ?? rnd.real(0, 3));
  parts.push(colorize(ni(g), (q, n, o) => { mixc(STONE_D, STONE, smooth(-0.6, 0.9, n.y * 0.5 + Math.sin(q.y * 1.7) * 0.3), o); if (q.y < p.y + 0.5) mixc(o, MOSS, 0.6, o); }));
  if (it.solid !== false) level.world.add({ type: 'box', min: [p.x - w / 2, p.y, p.z - w / 2], max: [p.x + w / 2, p.y + H, p.z + w / 2], tag: 'menhir' });
}

// ------------------------------------------------------------------ Schiff

const WOOD = C(0x7a6a52), WOOD_D = C(0x4a3e30), IRON = C(0x3a3a44), SAIL = C(0xc8d0bc);
function mast(level, it, p, rnd, parts) {
  const H = it.height ?? 7, yaw = it.yaw ?? 0;
  parts.push(shadeY(at(new THREE.CylinderGeometry(0.14, 0.2, H, 8), p.x, p.y + H / 2, p.z), WOOD_D, WOOD));
  const yard = new THREE.CylinderGeometry(0.07, 0.07, H * 0.5, 6); yard.rotateX(Math.PI / 2);
  parts.push(fill(at(yard, p.x, p.y + H * 0.82, p.z, yaw), WOOD_D));
  if (it.sail !== false) {
    const sl = new THREE.PlaneGeometry(H * 0.45, H * 0.4, 4, 3);
    const ps = sl.attributes.position;
    for (let i = 0; i < ps.count; i++) ps.setZ(i, Math.cos((ps.getX(i) / (H * 0.45)) * Math.PI) * 0.3 + rnd.real(-0.05, 0.05));
    sl.rotateY(Math.PI / 2);
    parts.push(colorize(ni(at(sl, p.x + 0.2, p.y + H * 0.6, p.z, yaw)), (q, n, o) => mixc(SAIL, C(0x9aa898), smooth(-1, 1, n.x) * 0.4, o)));
  }
  if (it.solid) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.22, y0: p.y, y1: p.y + H, tag: 'mast' });
}

function fass(level, it, p, rnd, parts) {
  const s = it.size ?? 1;
  const g = new THREE.CylinderGeometry(s * 0.38, s * 0.38, s * 0.9, 12, 3);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) { const k = 1 + 0.12 * Math.cos((pos.getY(i) / (s * 0.45)) * Math.PI / 2); pos.setX(i, pos.getX(i) * k); pos.setZ(i, pos.getZ(i) * k); }
  at(g, p.x, p.y + s * 0.45, p.z);
  parts.push(colorize(ni(g), (q, n, o) => { mixc(WOOD_D, C(0xa87a4a), smooth(-0.8, 0.8, n.x * 0.5 + n.y * 0.6), o); const yy = (q.y - p.y) / s; if (Math.abs(yy - 0.2) < 0.04 || Math.abs(yy - 0.7) < 0.04) mixc(o, IRON, 0.9, o); }));
  if (it.solid !== false) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: s * 0.42, y0: p.y, y1: p.y + s * 0.9, tag: 'fass' });
}

function kiste(level, it, p, rnd, parts) {
  const s = it.size ?? 1;
  const g = box(s, s, s, p.x, p.y + s / 2, p.z, 0xb08050, { r: 0.04, seg: 1 });
  parts.push(colorize(g, (q, n, o) => { mixc(C(0x8a5a32), C(0xc8945a), smooth(-1, 1, n.y), o); const lx = Math.abs(q.x - p.x) / s, lz = Math.abs(q.z - p.z) / s, ly = Math.abs(q.y - p.y - s / 2) / s; if (lx > 0.44 || lz > 0.44 || ly > 0.44 || Math.abs(lx - lz) < 0.05) mixc(o, WOOD_D, 0.6, o); }));
  if (it.solid !== false) level.world.add({ type: 'box', min: [p.x - s / 2, p.y, p.z - s / 2], max: [p.x + s / 2, p.y + s, p.z + s / 2], tag: 'kiste' });
}

function anker(level, it, p, rnd, parts) {
  const s = it.size ?? 1.6, yaw = it.yaw ?? 0;
  const pp = [];
  pp.push(at(new THREE.CylinderGeometry(s * 0.05, s * 0.05, s, 6), 0, s * 0.55, 0));
  const ring = new THREE.TorusGeometry(s * 0.12, s * 0.03, 6, 12); pp.push(at(ring, 0, s * 1.12, 0));
  const arc = new THREE.TorusGeometry(s * 0.38, s * 0.05, 6, 16, Math.PI); arc.rotateZ(Math.PI); pp.push(at(arc, 0, s * 0.42, 0));
  const bar = new THREE.CylinderGeometry(s * 0.04, s * 0.04, s * 0.5, 5); bar.rotateZ(Math.PI / 2); pp.push(at(bar, 0, s * 0.92, 0));
  for (const g of pp) parts.push(fill(at(g, p.x, p.y, p.z, yaw), IRON));
}

function steuerrad(level, it, p, rnd, parts) {
  const yaw = it.yaw ?? 0;
  parts.push(shadeY(at(new THREE.CylinderGeometry(0.12, 0.18, 1.1, 6), p.x, p.y + 0.55, p.z), WOOD_D, WOOD));
  const wheel = new THREE.TorusGeometry(0.5, 0.05, 6, 18); wheel.rotateY(Math.PI / 2);
  parts.push(fill(at(wheel, p.x, p.y + 1.3, p.z, yaw), C(0xa87a4a)));
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const sp = new THREE.CylinderGeometry(0.03, 0.03, 1.3, 4); sp.rotateX(a);
    parts.push(fill(at(sp, p.x, p.y + 1.3, p.z, yaw), C(0x8a5a32)));
  }
}

function wrackteil(level, it, p, rnd, parts) {
  const s = it.size ?? 2, yaw = it.yaw ?? rnd.real(0, 3);
  for (let i = 0; i < 4; i++) {
    const g = new THREE.BoxGeometry(s * rnd.real(0.6, 1), 0.1, 0.3);
    g.rotateZ(rnd.real(-0.3, 0.3)); g.rotateY(rnd.real(-0.4, 0.4));
    parts.push(shadeY(at(g, p.x + rnd.real(-s / 3, s / 3), p.y + 0.06 + i * 0.05, p.z + (i - 1.5) * 0.35, yaw), WOOD_D, WOOD));
  }
}

// ------------------------------------------------------------------ Fernost

const PAPER = C(0xfff0d0), LACQUER = C(0xc8302a);
function laterne(level, it, p, rnd, parts, glow) {
  const H = it.height ?? 0;
  const y = it.hang ? p.y - (it.length ?? 1.2) : p.y + H;
  if (it.hang) parts.push(fill(at(new THREE.CylinderGeometry(0.015, 0.015, it.length ?? 1.2, 3), p.x, p.y - (it.length ?? 1.2) / 2, p.z), C(0x3a2a1a)));
  const body = new THREE.SphereGeometry(0.32, 12, 8); body.scale(1, 1.25, 1);
  glow.push(colorize(ni(at(body, p.x, y - 0.4, p.z)), (q, n, o) => { mixc(C(0xff9a3a), PAPER, smooth(-0.8, 0.8, n.y * 0.3 + 0.4), o); if (Math.abs(((q.y - y + 10) % 0.18) - 0.09) < 0.012) mixc(o, C(0xc8602a), 0.6, o); }));
  for (const dy of [-0.02, -0.78]) parts.push(fill(at(new THREE.CylinderGeometry(0.18, 0.2, 0.08, 10), p.x, y + dy, p.z), LACQUER));
  level.view?.addLantern?.(p.x, y - 0.4, p.z);
}

function laternenpfahl(level, it, p, rnd, parts, glow) {
  const H = it.height ?? 2.4;
  parts.push(shadeY(at(new THREE.CylinderGeometry(0.08, 0.1, H, 6), p.x, p.y + H / 2, p.z), WOOD_D, C(0x8a5a32)));
  const arm = new THREE.BoxGeometry(0.7, 0.08, 0.08); arm.translate(0.3, 0, 0);
  parts.push(fill(at(arm, p.x, p.y + H - 0.1, p.z, it.yaw ?? 0), C(0x5a3a20)));
  const off = { x: Math.cos(it.yaw ?? 0) * 0.6, z: -Math.sin(it.yaw ?? 0) * 0.6 };
  laterne(level, { hang: true, length: 0.3 }, { x: p.x + off.x, y: p.y + H - 0.1, z: p.z + off.z }, rnd, parts, glow);
  if (it.solid) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.12, y0: p.y, y1: p.y + H, tag: 'laternenpfahl' });
}

const BAMBOO = C(0x8ab848), BAMBOO_L = C(0xc8e07a), BAMBOO_D = C(0x5a7a2a);
function bambus(level, it, p, rnd, parts) {
  const n = it.n ?? 7;
  const [h0, h1] = range(it.height, [3, 6]);
  for (let i = 0; i < n; i++) {
    const a = rnd.real(0, Math.PI * 2), d = rnd.real(0, (it.size ?? 1.4) / 2);
    const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d, H = rnd.real(h0, h1), r = rnd.real(0.06, 0.1);
    const lean = { x: rnd.real(-0.15, 0.15), z: rnd.real(-0.15, 0.15) };
    const g = rod({ x, y: p.y, z }, { x: x + lean.x * H, y: p.y + H, z: z + lean.z * H }, r, r * 0.85, 6);
    parts.push(colorize(ni(g), (q, nn, o) => { mixc(BAMBOO_D, BAMBOO_L, smooth(-0.8, 0.8, nn.x * 0.6 + nn.z * 0.4), o); if (Math.abs(((q.y - p.y + 10) % 0.6) - 0.3) < 0.025) mixc(o, BAMBOO_D, 0.8, o); }));
    for (let k = 0; k < 3; k++) {
      const leaf = new THREE.ConeGeometry(0.06, 0.6, 3); leaf.rotateZ(Math.PI / 2 + rnd.real(-0.4, 0.4)); leaf.rotateY(rnd.real(0, 6.28));
      parts.push(fill(at(leaf, x + lean.x * H * (0.7 + k * 0.1), p.y + H * (0.7 + k * 0.1), z + lean.z * H * (0.7 + k * 0.1)), BAMBOO));
    }
  }
  if (it.solid) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: (it.size ?? 1.4) / 2, y0: p.y, y1: p.y + h1, tag: 'bambus' });
}

const BLOSSOM = C(0xffb8d8), BLOSSOM_L = C(0xfff0f6), CBARK = C(0x5a3a2e);
function kirschbaum(level, it, p, rnd, parts) {
  const H = it.height ?? 5;
  const top = { x: p.x + rnd.real(-0.5, 0.5), y: p.y + H * 0.65, z: p.z + rnd.real(-0.5, 0.5) };
  parts.push(shadeY(rod(p, top, H * 0.07, H * 0.05, 7), CBARK, C(0x7a5240)));
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + rnd.real(0, 1);
    const tip = { x: top.x + Math.cos(a) * H * 0.3, y: top.y + H * rnd.real(0.1, 0.25), z: top.z + Math.sin(a) * H * 0.3 };
    parts.push(fill(rod(top, tip, H * 0.035, H * 0.02, 5), CBARK));
    const s = new THREE.IcosahedronGeometry(H * rnd.real(0.2, 0.28), 1);
    parts.push(colorize(ni(at(s, tip.x, tip.y, tip.z)), (q, n, o) => mixc(BLOSSOM, BLOSSOM_L, smooth(-0.3, 0.9, n.y), o)));
  }
  const crown = new THREE.IcosahedronGeometry(H * 0.3, 1);
  parts.push(colorize(ni(at(crown, top.x, top.y + H * 0.2, top.z)), (q, n, o) => mixc(BLOSSOM, BLOSSOM_L, smooth(-0.3, 0.9, n.y), o)));
  if (it.solid) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: H * 0.08, y0: p.y, y1: p.y + H * 0.6, tag: 'kirschbaum' });
}

function paravent(level, it, p, rnd, parts) {
  const W = it.width ?? 3, H = it.height ?? 1.8, n = 4, yaw = it.yaw ?? 0;
  for (let i = 0; i < n; i++) {
    const g = new THREE.BoxGeometry(W / n, H, 0.06);
    g.rotateY((i % 2 ? 1 : -1) * 0.35);
    g.translate(-W / 2 + (i + 0.5) * (W / n), H / 2, 0);
    parts.push(colorize(ni(at(g, p.x, p.y, p.z, yaw)), (q, nn, o) => { mixc(PAPER, C(0xffe0b0), smooth(0, H, q.y - p.y), o); if (q.y - p.y < 0.08 || q.y - p.y > H - 0.08) mixc(o, LACQUER, 1, o); }));
  }
}

// ------------------------------------------------------------------ Dschungel

const LEAF = C(0x3aa83a), LEAF_D = C(0x1a5a2a), LEAF_L = C(0x8ae05a);
function dschungelbaum(level, it, p, rnd, parts) {
  const H = it.height ?? 9;
  parts.push(shadeY(at(new THREE.CylinderGeometry(H * 0.05, H * 0.09, H, 8), p.x, p.y + H / 2, p.z), C(0x4a3018), C(0x8a6a42)));
  for (let k = 0; k < 4; k++) {
    const r = H * rnd.real(0.25, 0.38);
    const s = new THREE.IcosahedronGeometry(r, 1); s.scale(1, 0.55, 1);
    parts.push(colorize(ni(at(s, p.x + rnd.real(-r, r) * 0.6, p.y + H + rnd.real(-H * 0.1, H * 0.08), p.z + rnd.real(-r, r) * 0.6)), (q, n, o) => mixc(LEAF_D, n.y > 0.6 ? LEAF_L : LEAF, smooth(-0.4, 0.9, n.y), o)));
  }
  if (it.solid !== false) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: H * 0.08, y0: p.y, y1: p.y + H, tag: 'dschungelbaum' });
}

function farn(level, it, p, rnd, parts) {
  const s = it.size ?? 1.2;
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + rnd.real(-0.2, 0.2);
    const g = new THREE.PlaneGeometry(s * 0.8, s * 0.22, 3, 1);
    const ps = g.attributes.position;
    for (let i = 0; i < ps.count; i++) { const x = ps.getX(i) + s * 0.4; ps.setX(i, x); ps.setY(i, ps.getY(i) * (1 - x / s) ); ps.setZ(i, Math.sin((x / s) * 2) * s * 0.35); }
    g.rotateX(-Math.PI / 2 + 0.35);
    parts.push(colorize(ni(at(g, p.x, p.y + 0.1, p.z, a)), (q, n, o) => mixc(LEAF_D, LEAF_L, smooth(0, s * 0.6, q.y - p.y), o)));
  }
}

function liane(level, it, p, rnd, parts) {
  const L = it.length ?? 4;
  let a = { x: p.x, y: p.y, z: p.z };
  for (let i = 0; i < 4; i++) {
    const b = { x: p.x + Math.sin(i * 1.3) * 0.25, y: p.y - (L * (i + 1)) / 4, z: p.z + Math.cos(i * 1.1) * 0.25 };
    parts.push(fill(rod(a, b, 0.05, 0.05, 4), C(0x2a7a2a)));
    const leaf = new THREE.SphereGeometry(0.14, 5, 3); leaf.scale(1, 0.4, 1.8);
    parts.push(fill(at(leaf, b.x + 0.1, b.y + 0.2, b.z, rnd.real(0, 3)), LEAF));
    a = b;
  }
}

function riesenblatt(level, it, p, rnd, parts) {
  const s = it.size ?? 2;
  const g = new THREE.CircleGeometry(s / 2, 14);
  g.scale(1, 0.55, 1);
  const ps = g.attributes.position;
  for (let i = 0; i < ps.count; i++) ps.setZ(i, -Math.abs(ps.getY(i)) * 0.4 + (ps.getX(i) * ps.getX(i)) * 0.08);
  g.rotateX(-Math.PI / 2 + 0.25);
  parts.push(colorize(ni(at(g, p.x, p.y + s * 0.25, p.z, it.yaw ?? rnd.real(0, 3))), (q, n, o) => { mixc(LEAF, LEAF_L, 0.3, o); if (Math.abs(q.x - p.x) < 0.03) mixc(o, LEAF_D, 0.6, o); }));
  parts.push(fill(rod(p, { x: p.x, y: p.y + s * 0.25, z: p.z }, 0.04, 0.04, 4), LEAF_D));
}

function pilz(level, it, p, rnd, parts, glow) {
  const s = rnd.real(0.25, 0.5);
  parts.push(fill(at(new THREE.CylinderGeometry(s * 0.15, s * 0.2, s * 0.6, 6), p.x, p.y + s * 0.3, p.z), C(0xf0e8d8)));
  const cap = new THREE.SphereGeometry(s * 0.45, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  glow.push(colorize(ni(at(cap, p.x, p.y + s * 0.55, p.z)), (q, n, o) => mixc(C(0x9a3ae0), C(0xe8a0ff), smooth(0, 1, n.y), o)));
}

// ------------------------------------------------------------------ Schnee

function schneehaufen(level, it, p, rnd, parts) {
  const s = it.size ?? 1.4;
  for (let k = 0; k < 3; k++) {
    const g = new THREE.SphereGeometry(s * rnd.real(0.35, 0.5), 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    g.scale(1, 0.6, 1);
    parts.push(colorize(ni(at(g, p.x + rnd.real(-s / 3, s / 3), p.y, p.z + rnd.real(-s / 3, s / 3))), (q, n, o) => mixc(C(0xc4d8f0), WHITE, smooth(0, 0.8, n.y), o)));
  }
}

function eiszapfen(level, it, p, rnd, parts) {
  const { a, b, L } = line(it, p);
  const n = Math.max(1, Math.round(L / 0.35));
  for (let i = 0; i <= n; i++) {
    const u = i / n, len = (it.length ?? 0.8) * rnd.real(0.5, 1.2);
    const g = new THREE.ConeGeometry(0.09, len, 5); g.rotateX(Math.PI);
    parts.push(colorize(ni(at(g, a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u - len / 2, a.z + (b.z - a.z) * u)), (q, nn, o) => mixc(C(0x9ac8f0), C(0xeef8ff), smooth(-0.5, 0.8, nn.x), o)));
  }
}

// ------------------------------------------------------------------ Fabrik

function zahnrad(level, it, p, rnd, parts) {
  const R = (it.size ?? 2) / 2;
  const g = gearGeo(R, Math.max(8, Math.round(R * 6)), R * 0.3);
  if (it.axis === 'y') g.rotateX(Math.PI / 2);
  at(g, p.x, p.y + (it.axis === 'y' ? 0.2 : R), p.z, it.yaw ?? 0);
  parts.push(colorize(ni(g), (q, n, o) => mixc(C(0x8a7a50), C(0xd8c088), smooth(-0.6, 0.9, n.y * 0.5 + n.z * 0.5), o)));
  if (it.solid) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: R * 0.9, y0: p.y, y1: p.y + (it.axis === 'y' ? R * 0.3 + 0.2 : R * 2), tag: 'zahnrad' });
}

function rohr(level, it, p, rnd, parts) {
  const { a, b } = line(it, p);
  const r = it.r ?? 0.35;
  parts.push(shadeY(rod(a, b, r, r, 12), C(it.color ?? 0x5a6476), C(0xb4bccc)));
  for (const q of [a, b]) { const s = new THREE.SphereGeometry(r * 1.2, 8, 6); parts.push(fill(at(s, q.x, q.y, q.z), C(0xffc83a))); }
}

function schornstein(level, it, p, rnd, parts) {
  const H = it.height ?? 6;
  parts.push(colorize(ni(at(new THREE.CylinderGeometry(0.5, 0.7, H, 12), p.x, p.y + H / 2, p.z)), (q, n, o) => { mixc(C(0x8a4a3a), C(0xc8745a), smooth(-1, 1, n.x), o); if (Math.abs(((q.y - p.y + 10) % 1.2) - 0.6) < 0.08) mixc(o, C(0x3a3a44), 0.8, o); }));
  if (it.solid !== false) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.65, y0: p.y, y1: p.y + H, tag: 'schornstein' });
}

function warnstreifen(level, it, p, rnd, parts) {
  const [w, d] = it.size ?? [3, 0.6];
  const g = new THREE.PlaneGeometry(w, d, Math.max(2, Math.round(w / 0.3)), 1);
  g.rotateX(-Math.PI / 2);
  parts.push(colorize(ni(at(g, p.x, p.y + 0.012, p.z, it.yaw ?? 0)), (q, n, o) => { const k = Math.floor((q.x + q.z + 100) / 0.3) & 1; mixc(C(0xffc83a), C(0x2a2a30), k, o); }));
}

// ------------------------------------------------------------------ Mine

const BEAM = C(0x9a6a3a), BEAM_D = C(0x5a3a1a);
function minenbalken(level, it, p, rnd, parts, glow) {
  const W = it.width ?? 4, H = it.height ?? 3.2, yaw = it.yaw ?? 0;
  const c = Math.cos(yaw), s = Math.sin(yaw);
  for (const sx of [-1, 1]) {
    const x = p.x + c * sx * (W / 2), z = p.z - s * sx * (W / 2);
    parts.push(shadeY(at(new THREE.BoxGeometry(0.32, H, 0.32), x, p.y + H / 2, z), BEAM_D, BEAM));
    if (it.solid) level.world.add({ type: 'box', min: [x - 0.16, p.y, z - 0.16], max: [x + 0.16, p.y + H, z + 0.16], tag: 'minenbalken' });
  }
  parts.push(shadeY(at(new THREE.BoxGeometry(W + 0.5, 0.36, 0.36), p.x, p.y + H, p.z, yaw), BEAM_D, BEAM));
  if (it.lamp) minenlampe(level, {}, { x: p.x, y: p.y + H - 0.2, z: p.z }, rnd, parts, glow);
}

function minenlampe(level, it, p, rnd, parts, glow) {
  const L = it.length ?? 0.5;
  parts.push(fill(at(new THREE.CylinderGeometry(0.015, 0.015, L, 3), p.x, p.y - L / 2, p.z), C(0x3a2a1a)));
  const cage = new THREE.CylinderGeometry(0.14, 0.17, 0.32, 6);
  parts.push(fill(at(cage, p.x, p.y - L - 0.16, p.z), C(0x3a3a44)));
  const bulb = new THREE.SphereGeometry(0.12, 8, 6);
  glow.push(fill(at(bulb, p.x, p.y - L - 0.16, p.z), C(0xffd080)));
  level.view?.addLantern?.(p.x, p.y - L - 0.2, p.z);
}

function kristalle(level, it, p, rnd, parts, glow) {
  const n = it.n ?? 4, s = it.size ?? 1;
  for (let k = 0; k < n; k++) {
    const a = rnd.real(0, 6.28), d = rnd.real(0, s * 0.5), h = s * rnd.real(0.8, 1.8);
    const g = new THREE.OctahedronGeometry(s * 0.22, 0);
    g.scale(1, h / (s * 0.44), 1); g.rotateZ(rnd.real(-0.4, 0.4)); g.rotateY(rnd.real(0, 3));
    glow.push(colorize(ni(at(g, p.x + Math.cos(a) * d, p.y + h * 0.4, p.z + Math.sin(a) * d)), (q, nn, o) => mixc(C(0x2a5aff), C(0xa8f0ff), smooth(-0.5, 1, nn.y), o)));
  }
}

function lore(level, it, p, rnd, parts) {
  const yaw = it.yaw ?? 0;
  const g = new THREE.BoxGeometry(1.4, 0.8, 1.0); g.translate(0, 0.65, 0);
  parts.push(colorize(ni(at(g, p.x, p.y, p.z, yaw)), (q, n, o) => mixc(C(0x5a5a66), C(0x9a9aa8), smooth(-1, 1, n.y), o)));
  for (const sx of [-0.45, 0.45]) for (const sz of [-0.52, 0.52]) {
    const w = new THREE.CylinderGeometry(0.18, 0.18, 0.1, 10); w.rotateX(Math.PI / 2); w.translate(sx, 0.18, sz);
    parts.push(fill(at(w, p.x, p.y, p.z, yaw), C(0x2a2a30)));
  }
  if (it.solid) level.world.add({ type: 'box', min: [p.x - 0.7, p.y, p.z - 0.7], max: [p.x + 0.7, p.y + 1.05, p.z + 0.7], tag: 'lore' });
}

function schienen(level, it, p, rnd, parts) {
  const { a, b, L, yaw } = line(it, p);
  for (const s of [-0.5, 0.5]) {
    const off = { x: -Math.sin(yaw) * s, z: -Math.cos(yaw) * s };
    parts.push(fill(rod({ x: a.x + off.x, y: a.y + 0.08, z: a.z + off.z }, { x: b.x + off.x, y: b.y + 0.08, z: b.z + off.z }, 0.05, 0.05, 4), C(0x6a6a74)));
  }
  const n = Math.max(1, Math.floor(L / 0.7));
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    parts.push(shadeY(at(new THREE.BoxGeometry(0.25, 0.08, 1.4), a.x + (b.x - a.x) * u, a.y + 0.04 + (b.y - a.y) * u, a.z + (b.z - a.z) * u, yaw), BEAM_D, BEAM));
  }
}

// ------------------------------------------------------------------ Aufbau

const SINGLE = {
  wolke, bergkiefer, fels, menhir, mast, fass, kiste, anker, steuerrad, wrackteil, laterne, laternenpfahl, bambus, kirschbaum,
  paravent, dschungelbaum, farn, liane, riesenblatt, schneehaufen, eiszapfen, zahnrad, rohr, schornstein, warnstreifen,
  minenbalken, minenlampe, kristalle, lore, schienen,
  schneekiefer: (level, it, p, rnd, parts) => bergkiefer(level, { ...it, snow: true, height: it.height ?? 5 }, p, rnd, parts),
};
// Kollision der Arten, deren Aussehen ein Registry-Modell übernimmt (gleiche Formen wie die eigene Geometrie oben)
const SOLID = new Set(['bergkiefer', 'fels', 'menhir', 'mast', 'fass', 'kiste', 'laternenpfahl', 'bambus', 'kirschbaum', 'dschungelbaum', 'zahnrad', 'schornstein', 'minenbalken', 'lore']);

export function buildDecoW6(level, spec) {
  const items = spec.items ?? [spec];
  const parts = { shadow: [], flat: [] };
  const glow = [];
  for (const it0 of items) {
    const it = spec.items && spec.shadow === false && it0.shadow === undefined ? { ...it0, shadow: false } : it0;
    const p = v3(it.pos ?? it.from);
    const rnd = new Rnd((it.seed ?? Math.floor(p.x * 73 + p.z * 37 + p.y * 11)) >>> 0);
    const P = it.shadow === false ? parts.flat : parts.shadow;
    if (hasModel(`deco_w6_${it.kind}`)) {
      bakeModel(level, `deco_w6_${it.kind}`, it, p.x, p.y, p.z, it.yaw ?? 0, it.scale ?? 1, {}, { castShadow: it.shadow !== false });
      // Kollision wie bei der eigenen Geometrie: Geometrie bauen und verwerfen (nur die Formen bleiben)
      if (SOLID.has(it.kind)) { const dump = [], dg = []; SINGLE[it.kind]?.({ world: level.world, view: null }, it, p, rnd, dump, dg); for (const g of [...dump, ...dg]) g.dispose(); }
      continue;
    }
    const scat = (fn, n, sz, gap, mk) => { for (const [x, z] of scatter(p, it.size ?? sz, it.n ?? n, it.gap ?? gap, it.avoid, rnd)) fn(level, { shadow: it.shadow, ...mk() }, { x, y: p.y, z }, rnd, P, glow); };
    switch (it.kind) {
      case 'wolken': scat(wolke, 5, [16, 16], 4, () => ({ size: rnd.real(2.2, 4) })); break;
      case 'bergkiefern': { const [h0, h1] = range(it.height, [3, 5.5]); scat(bergkiefer, 6, [14, 14], 2.5, () => ({ height: rnd.real(h0, h1), solid: it.solid, snow: it.snow })); break; }
      case 'felsen': scat(fels, 6, [14, 14], 1.8, () => ({ size: rnd.real(0.6, it.max ?? 1.6), solid: it.solid })); break;
      case 'bergblumen': scat(bergblume, 14, [10, 10], 0.5, () => ({})); break;
      case 'farne': scat(farn, 8, [12, 12], 1.4, () => ({ size: rnd.real(0.8, 1.5) })); break;
      case 'pilze': scat(pilz, 6, [6, 6], 0.7, () => ({})); break;
      case 'minenbalken_reihe': {
        const { a, b, L, yaw } = line(it, p);
        const n = Math.max(1, Math.floor(L / (it.every ?? 4)) + 1);
        for (let i = 0; i < n; i++) {
          const u = n > 1 ? i / (n - 1) : 0;
          minenbalken(level, { ...it, yaw: it.yaw ?? yaw, lamp: it.lamp && i % 2 === 0 }, { x: a.x + (b.x - a.x) * u, y: a.y, z: a.z + (b.z - a.z) * u }, rnd, P, glow);
        }
        break;
      }
      default: {
        const fn = SINGLE[it.kind];
        if (fn) fn(level, it, p, rnd, P, glow);
        else console.warn(`[deco_w6] unbekannte Art ${it.kind}`);
      }
    }
  }
  if (parts.shadow.length) addStatic(level, merge(parts.shadow));
  if (parts.flat.length) addStatic(level, merge(parts.flat), { castShadow: false });
  if (glow.length) addStatic(level, merge(glow), { material: 'glow', castShadow: false });
}

export const TYPES = { deco_w6: buildDecoW6 };
