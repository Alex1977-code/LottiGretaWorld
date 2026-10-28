// Baustein `deco_w7`: Kulisse für Welt 7 „Lava-Festung“ (Burg, Tempel, Vulkan, Maschinen, Riff). Eigene Geometrie wird in
// die statische Geometrie verschmolzen (keine zusätzlichen Zeichenaufrufe, Abschnitts-Culling), Leuchtendes (Flammen, Glut)
// ins Glüh-Material. Registry-Modelle werden gebacken (statische Geometrie, keine eigenen Zeichenaufrufe), sobald es sie gibt:
// `deco_w7_<kind>` (opts = die Felder des Eintrags) oder die Zuordnung REG – burgturm → festungsturm, basaltsaeule(n) →
// basaltsaeule, vulkanfels(en) → vulkanfels (brocken), fackel → fackel, fahne → brummbaer_fahne (bewegt, Wappen-Textur) bzw.
// hang → brummbaer_banner, kette → burg_kette, zahnrad → zahnrad, koralle(n) → riffkoralle, seetang → seetang. Die Kollision
// (solid) bleibt gleich; look: 'eigen' erzwingt die eigene Geometrie. Lavafälle sind animiert (w4_fluids lavafall).
//
// Einzeln:  { type: 'deco_w7', kind, pos: [x, y, z], … }   oder Liste: { type: 'deco_w7', items: [{ kind, pos, … }, …] }
// pos = Fußpunkt; yaw in Radiant; Streuungen (Mehrzahl-Namen) verteilen deterministisch (seed) in size: [w, d] um pos,
// halten gap m Abstand und meiden avoid: [[x, z, r], …]. shadow: false → wirft keinen Schatten; solid: true → Kollision.
// kind:
//   Burg        burgturm (Rundturm mit Zinnen und rotem Spitzdach: height 8, radius 1.6, windows true) · zinnen (Mauer mit
//               Zinnen from → to: height 3, thick 1) · fahne (Fahnenmast mit Brummbär-Wappen: height 5, color 'rot' |
//               'lila'; hang: true = Wandbehang von pos herab, yaw) · wappen (Brummbär-Wappen-Schild an der Wand: size 1.4,
//               yaw) · kette (hängt von pos herab: length 3) · fackel (Wandfackel: mount 'wand' | 'stand' (Ständer, height
//               1.6), yaw; leuchtet: view.addLantern) · knochen (lustiger Knochenhaufen: n 4) · rohr (from → to, r 0.35) ·
//               schlot (Schornstein mit Glut: height 5) · zahnrad (size 2, axis 'z' | 'x' | 'y')
//   Vulkan      basaltsaeule (Sechseck-Säule: height 3, r 0.6) · basaltsaeulen (Gruppe: n 7, height [1.5, 5]) · vulkanfels
//               (Fels mit Glutrissen: size 1.4) · vulkanfelsen (Streuung n 6) · glutriss (glühender Riss im Boden: length 3,
//               yaw) · lavafall (animiert: width 3, height 8, yaw; kill false – nur Optik, kill: true = tödlich)
//   Riff        koralle (Korallenstock: size 1.2, color 'rosa' | 'orange' | 'lila' | 'gelb' | 'tuerkis') · korallen
//               (Streuung n 6) · seetang (Büschel: height 3)

import * as THREE from 'three';
import { v3, lin, mixc, smooth, colorize, merge, Rnd, addStatic, addObject, hex } from '../kit.js';
import { bakeModel } from '../w2kit.js';
import { hasModel, getModel } from '../../models/index.js';
import { gearGeo } from '../../view/backdrop_w6.js';
import { TYPES as FLUIDS } from './w4_fluids.js';

const C = (h) => lin(hex(h));
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const range = (v, d) => (Array.isArray(v) ? v : [v ?? d[0], v ?? d[1]]);
const fill = (g, col) => { const c = Array.isArray(col) ? col : C(col); return colorize(ni(g), (p, n, o) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }); };
const shadeY = (g, lo, hi, a = -0.6, b = 0.8) => { const L = Array.isArray(lo) ? lo : C(lo), H = Array.isArray(hi) ? hi : C(hi); return colorize(ni(g), (p, n, o) => mixc(L, H, smooth(a, b, n.y * 0.7 - n.x * 0.25 + n.z * 0.25), o)); };
const at = (g, x, y, z, yaw = 0) => { if (yaw) g.rotateY(yaw); g.translate(x, y, z); return g; };
const TAU = Math.PI * 2;

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

function rod(a, b, r0, r1 = r0, seg = 7) {
  const d = new THREE.Vector3(b.x - a.x, b.y - a.y, b.z - a.z);
  const L = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, L, seg);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
}

// ------------------------------------------------------------------ Burg

const STONE = C(0x5a4e56), STONE_H = C(0x9a8a92), STONE_D = C(0x2e262c), ROOF = C(0xc8322a), ROOF_H = C(0xff6a4a), GLOW = C(0xffb040);

function burgturm(level, it, p, rnd, parts, glow) {
  const H = it.height ?? 8, R = it.radius ?? 1.6;
  const body = new THREE.CylinderGeometry(R, R * 1.08, H, 16, Math.max(2, Math.round(H)));
  parts.push(colorize(ni(at(body, p.x, p.y + H / 2, p.z)), (q, n, o) => {
    const yy = q.y - p.y;
    mixc(STONE_D, STONE, smooth(-0.8, 0.8, n.x * 0.4 + n.z * 0.6), o);
    if ((yy % 1) < 0.07 || Math.abs(Math.sin(Math.atan2(q.z - p.z, q.x - p.x) * 8 + Math.floor(yy) * 1.6)) > 0.97) mixc(o, STONE_D, 0.6, o);
  }));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    const m = new THREE.BoxGeometry(0.55, 0.6, 0.55);
    parts.push(shadeY(at(m, p.x + Math.cos(a) * R * 1.02, p.y + H + 0.3, p.z + Math.sin(a) * R * 1.02, -a), STONE_D, STONE_H));
  }
  const rim = new THREE.CylinderGeometry(R * 1.12, R * 1.12, 0.3, 16); parts.push(shadeY(at(rim, p.x, p.y + H, p.z), STONE_D, STONE_H));
  const roof = new THREE.ConeGeometry(R * 1.1, R * 2.2, 12); parts.push(shadeY(at(roof, p.x, p.y + H + 0.6 + R * 1.1, p.z), ROOF, ROOF_H));
  if (it.windows !== false) {
    for (let k = 0; k < 3; k++) {
      const a = (it.yaw ?? -Math.PI / 2) + (k - 1) * 0.9, y = p.y + H * (0.35 + k * 0.18);
      const w = new THREE.PlaneGeometry(0.4, 0.9); w.rotateY(-a + Math.PI / 2);
      glow.push(fill(at(w, p.x + Math.cos(a) * (R + 0.02), y, p.z - Math.sin(a) * (R + 0.02)), GLOW));
    }
  }
  if (it.solid) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: R, y0: p.y, y1: p.y + H, tag: 'burgturm' });
}

function zinnen(level, it, p, rnd, parts) {
  const a = v3(it.from ?? it.pos), b = v3(it.to ?? it.pos);
  const L = Math.hypot(b.x - a.x, b.z - a.z), yaw = Math.atan2(-(b.z - a.z), b.x - a.x);
  const H = it.height ?? 3, T = it.thick ?? 1;
  const cx = (a.x + b.x) / 2, cz = (a.z + b.z) / 2;
  const w = new THREE.BoxGeometry(L, H, T, Math.max(1, Math.round(L)), Math.max(1, Math.round(H)), 1);
  parts.push(colorize(ni(at(w, cx, a.y + H / 2, cz, yaw)), (q, n, o) => { mixc(STONE_D, STONE, smooth(-0.8, 0.9, n.y * 0.5 + n.z * 0.3 + 0.2), o); if (((q.y - a.y) % 0.8) < 0.06) mixc(o, STONE_D, 0.5, o); }));
  const nm = Math.max(1, Math.floor(L / 1.2));
  for (let i = 0; i < nm; i++) {
    const u = (i + 0.5) / nm - 0.5;
    const m = new THREE.BoxGeometry(0.7, 0.7, T);
    parts.push(shadeY(at(m, cx + Math.cos(yaw) * u * L, a.y + H + 0.35, cz - Math.sin(yaw) * u * L, yaw), STONE_D, STONE_H));
  }
  if (it.solid !== false) {
    const hx = Math.abs(Math.cos(yaw)) * L / 2 + Math.abs(Math.sin(yaw)) * T / 2, hz = Math.abs(Math.sin(yaw)) * L / 2 + Math.abs(Math.cos(yaw)) * T / 2;
    level.world.add({ type: 'box', min: [cx - hx, a.y, cz - hz], max: [cx + hx, a.y + H, cz + hz], tag: 'zinnen' });
  }
}

/** Brummbär-Wappen (Bärenkopf mit Zylinder und Monokel) als flache Geometrie in der lokalen YZ-Ebene, blickt +X. */
function wappenParts(size, out) {
  const s = size;
  const add = (g, col) => out.push(fill(g, col));
  const shield = new THREE.CircleGeometry(s * 0.5, 20); shield.scale(1, 1.15, 1); shield.rotateY(Math.PI / 2); add(shield, 0xf2d24a);
  const inner = new THREE.CircleGeometry(s * 0.43, 20); inner.scale(1, 1.15, 1); inner.rotateY(Math.PI / 2); inner.translate(0.01, 0, 0); add(inner, 0x8a1a2a);
  const head = new THREE.CircleGeometry(s * 0.22, 16); head.rotateY(Math.PI / 2); head.translate(0.02, -s * 0.05, 0); add(head, 0x8a5a34);
  for (const z of [-1, 1]) { const e = new THREE.CircleGeometry(s * 0.08, 10); e.rotateY(Math.PI / 2); e.translate(0.018, s * 0.13, z * s * 0.17); add(e, 0x8a5a34); }
  const snout = new THREE.CircleGeometry(s * 0.09, 12); snout.rotateY(Math.PI / 2); snout.translate(0.03, -s * 0.11, 0); add(snout, 0xd8b088);
  const nose = new THREE.CircleGeometry(s * 0.035, 8); nose.rotateY(Math.PI / 2); nose.translate(0.035, -s * 0.08, 0); add(nose, 0x1a1012);
  for (const z of [-1, 1]) { const e = new THREE.CircleGeometry(s * 0.03, 8); e.rotateY(Math.PI / 2); e.translate(0.035, 0, z * s * 0.08); add(e, 0x1a1012); }
  const mono = new THREE.RingGeometry(s * 0.045, s * 0.06, 12); mono.rotateY(Math.PI / 2); mono.translate(0.04, 0, s * 0.08); add(mono, 0xffe080);
  const hat = new THREE.PlaneGeometry(s * 0.26, s * 0.2); hat.rotateY(Math.PI / 2); hat.translate(0.03, s * 0.24, 0); add(hat, 0x1a1418);
  const brim = new THREE.PlaneGeometry(s * 0.4, s * 0.05); brim.rotateY(Math.PI / 2); brim.translate(0.032, s * 0.14, 0); add(brim, 0x1a1418);
}

function fahne(level, it, p, rnd, parts) {
  const yaw = it.yaw ?? -Math.PI / 2;
  const col = it.color === 'lila' ? [0x5a2a8a, 0x8a4ac8] : [0x9a1a1a, 0xd83a2a];
  const local = [];
  if (it.hang) {
    // Wandbehang: hängt von pos herab
    const L = it.length ?? 3, W = it.width ?? 1.4;
    const c = new THREE.PlaneGeometry(W, L, 1, 4); c.rotateY(Math.PI / 2); c.translate(0.02, -L / 2, 0);
    const ps = c.attributes.position; for (let i = 0; i < ps.count; i++) if (ps.getY(i) < -L + 0.01) ps.setY(i, ps.getY(i) - (Math.abs(ps.getZ(i)) < 0.01 ? 0 : 0.3));
    local.push(colorize(ni(c), (q, n, o) => mixc(C(col[0]), C(col[1]), smooth(-L, 0, q.y), o)));
    const bar = new THREE.CylinderGeometry(0.05, 0.05, W + 0.3, 6); bar.rotateX(Math.PI / 2); bar.translate(0.06, 0, 0); local.push(fill(bar, 0x3a2a1a));
    const w = []; wappenParts(W * 0.8, w); for (const g of w) { g.translate(0.03, -L * 0.42, 0); local.push(g); }
  } else {
    const H = it.height ?? 5;
    const pole = new THREE.CylinderGeometry(0.07, 0.09, H, 7); pole.translate(0, H / 2, 0); local.push(shadeY(pole, 0x4a3a2a, 0x8a6a4a));
    const knob = new THREE.SphereGeometry(0.14, 8, 6); knob.translate(0, H + 0.1, 0); local.push(fill(knob, 0xffd040));
    const FW = 1.8, FH = 1.2;
    const cloth = new THREE.PlaneGeometry(FW, FH, 6, 2); cloth.translate(FW / 2 + 0.08, H - FH / 2 - 0.15, 0);
    const ps = cloth.attributes.position; for (let i = 0; i < ps.count; i++) ps.setZ(i, Math.sin(ps.getX(i) * 2.6) * 0.12 * (ps.getX(i) / FW));
    local.push(colorize(ni(cloth), (q, n, o) => mixc(C(col[0]), C(col[1]), smooth(0, FW, q.x), o)));
    const back = cloth.clone(); back.rotateY(Math.PI); back.translate(FW + 0.16, 0, 0); local.push(colorize(ni(back), (q, n, o) => mixc(C(col[0]), C(col[1]), 0.4, o)));
    const w = []; wappenParts(0.9, w); for (const g of w) { g.rotateY(-Math.PI / 2); g.translate(FW / 2 + 0.08, H - FH / 2 - 0.15, 0.02 + 0.13); local.push(g); }
    if (it.solid) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.12, y0: p.y, y1: p.y + H, tag: 'fahne' });
  }
  for (const g of local) parts.push(at(g, p.x, p.y, p.z, yaw + (it.hang ? 0 : Math.PI / 2)));
}

function wappen(level, it, p, rnd, parts) {
  const w = []; wappenParts(it.size ?? 1.4, w);
  for (const g of w) parts.push(at(g, p.x, p.y, p.z, it.yaw ?? -Math.PI / 2));
}

function kette(level, it, p, rnd, parts) {
  const L = it.length ?? 3;
  const n = Math.max(2, Math.round(L / 0.24));
  for (let i = 0; i < n; i++) {
    const g = new THREE.TorusGeometry(0.09, 0.03, 4, 8); g.scale(1, 1.5, 1);
    if (i % 2) g.rotateY(Math.PI / 2);
    parts.push(shadeY(at(g, p.x, p.y - 0.12 - i * (L / n), p.z), 0x2a2a30, 0x8a8a96));
  }
}

function fackel(level, it, p, rnd, parts, glow) {
  const yaw = it.yaw ?? -Math.PI / 2;
  let top;
  if (it.mount === 'stand') {
    const H = it.height ?? 1.6;
    parts.push(shadeY(new THREE.CylinderGeometry(0.06, 0.1, H, 6).translate(p.x, p.y + H / 2, p.z), 0x2a2026, 0x6a5a62));
    const foot = new THREE.CylinderGeometry(0.3, 0.38, 0.12, 8); parts.push(shadeY(at(foot, p.x, p.y + 0.06, p.z), 0x2a2026, 0x6a5a62));
    top = { x: p.x, y: p.y + H, z: p.z };
    if (it.solid) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.18, y0: p.y, y1: p.y + H, tag: 'fackel' });
  } else {
    // Wandhalter: ragt in Blickrichtung (yaw) aus der Wand
    const dx = Math.cos(yaw), dz = -Math.sin(yaw);
    parts.push(shadeY(rod({ x: p.x, y: p.y, z: p.z }, { x: p.x + dx * 0.35, y: p.y + 0.25, z: p.z + dz * 0.35 }, 0.05), 0x2a2026, 0x6a5a62));
    const plate = new THREE.BoxGeometry(0.08, 0.4, 0.3); parts.push(shadeY(at(plate, p.x, p.y, p.z, yaw), 0x2a2026, 0x6a5a62));
    top = { x: p.x + dx * 0.38, y: p.y + 0.3, z: p.z + dz * 0.38 };
  }
  const bowl = new THREE.CylinderGeometry(0.2, 0.1, 0.22, 8); parts.push(shadeY(at(bowl, top.x, top.y + 0.08, top.z), 0x3a2a1a, 0x8a6a3a));
  const f1 = new THREE.ConeGeometry(0.17, 0.55, 7); glow.push(colorize(ni(at(f1, top.x, top.y + 0.45, top.z)), (q, n, o) => mixc(C(0xff4a10), C(0xffe070), smooth(top.y + 0.7, top.y + 0.25, q.y), o)));
  const f2 = new THREE.ConeGeometry(0.09, 0.32, 6); glow.push(fill(at(f2, top.x, top.y + 0.36, top.z), 0xfff4c0));
  level.view?.addLantern?.(top.x, top.y + 0.5, top.z);
}

const BONE = C(0xfff4e0), BONE_D = C(0xd8c8a8);
function knochen(level, it, p, rnd, parts) {
  const n = it.n ?? 4;
  for (let i = 0; i < n; i++) {
    const L = rnd.real(0.5, 0.9), a = rnd.real(0, TAU), x = p.x + rnd.real(-0.5, 0.5), z = p.z + rnd.real(-0.5, 0.5), y = p.y + 0.08 + i * 0.05;
    const s = new THREE.CylinderGeometry(0.06, 0.06, L, 6); s.rotateZ(Math.PI / 2);
    const g = [s];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const k = new THREE.SphereGeometry(0.075, 7, 5); k.translate(sx * L / 2, 0, sz * 0.05); g.push(k); }
    for (const q of g) { q.rotateZ(rnd.real(-0.15, 0.15)); parts.push(colorize(ni(at(q, x, y, z, a)), (qq, nn, o) => mixc(BONE_D, BONE, smooth(-0.5, 0.9, nn.y), o))); }
  }
}

function rohr(level, it, p, rnd, parts) {
  const a = v3(it.from ?? it.pos), b = v3(it.to ?? it.pos), r = it.r ?? 0.35;
  parts.push(colorize(ni(rod(a, b, r, r, 10)), (q, n, o) => mixc(C(0x3a3a44), C(0xa0a0b0), smooth(-1, 1, n.y), o)));
  for (const e of [a, b]) parts.push(shadeY(new THREE.SphereGeometry(r * 1.25, 10, 6).translate(e.x, e.y, e.z), 0x3a3a44, 0xb8a050));
}

function schlot(level, it, p, rnd, parts, glow) {
  const H = it.height ?? 5;
  parts.push(colorize(ni(new THREE.CylinderGeometry(0.6, 0.85, H, 10).translate(p.x, p.y + H / 2, p.z)), (q, n, o) => { mixc(C(0x3a3036), C(0x7a6a70), smooth(-1, 1, n.x * 0.5 + n.z * 0.5), o); if (Math.abs(((q.y - p.y) % 1.4) - 0.7) < 0.08) mixc(o, C(0xc8a048), 0.7, o); }));
  glow.push(fill(new THREE.CylinderGeometry(0.5, 0.5, 0.2, 10).translate(p.x, p.y + H + 0.05, p.z), 0xff8a2a));
  if (it.solid) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.85, y0: p.y, y1: p.y + H, tag: 'schlot' });
}

function zahnrad(level, it, p, rnd, parts) {
  const s = it.size ?? 2, ax = it.axis ?? 'z';
  const g = gearGeo(s / 2, Math.round(s * 4), s * 0.12);
  if (ax === 'x') g.rotateY(Math.PI / 2); else if (ax === 'y') g.rotateX(Math.PI / 2);
  parts.push(colorize(ni(at(g, p.x, p.y + (ax === 'y' ? 0.1 : s / 2), p.z, it.yaw ?? 0)), (q, n, o) => mixc(C(0x8a6a2a), C(0xe8c060), smooth(-0.8, 0.9, n.y * 0.4 + n.z * 0.6), o)));
}

// ------------------------------------------------------------------ Vulkan

const BAS = C(0x2a2228), BAS_H = C(0x5a4a54), HOT = C(0xff7a2a);
function basaltsaeule(level, it, p, rnd, parts) {
  const H = it.height ?? 3, r = it.r ?? 0.6;
  const g = new THREE.CylinderGeometry(r, r, H, 6);
  const topY = p.y + H;
  parts.push(colorize(ni(at(g, p.x, p.y + H / 2, p.z, rnd.real(0, 1))), (q, n, o) => { mixc(BAS, BAS_H, smooth(-0.6, 1, n.y * 0.6 + n.x * 0.3), o); if (n.y > 0.5) mixc(o, BAS_H, 0.4, o); if (q.y < p.y + 0.25) mixc(o, HOT, it.glow === false ? 0 : 0.7, o); if (Math.abs(q.y - topY) < 0.01 && n.y < 0.5) mixc(o, BAS_H, 0.3, o); }));
  if (it.solid) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: r * 0.95, y0: p.y, y1: p.y + H, tag: 'basalt' });
}

function vulkanfels(level, it, p, rnd, parts) {
  const s = it.size ?? 1.4;
  const g = new THREE.DodecahedronGeometry(s * 0.6, 1);
  g.scale(1, rnd.real(0.55, 0.9), rnd.real(0.8, 1.1)); g.rotateY(rnd.real(0, 3));
  parts.push(colorize(ni(at(g, p.x, p.y + s * 0.25, p.z)), (q, n, o) => { mixc(C(0x241a1c), C(0x5a4a4c), smooth(-0.6, 0.9, n.y), o); if (Math.abs(Math.sin(q.x * 5.1 + q.y * 3.7) * Math.sin(q.z * 4.3 - q.y * 2.1)) > 0.9) mixc(o, HOT, 0.85, o); }));
  if (it.solid) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: s * 0.5, y0: p.y, y1: p.y + s * 0.65, tag: 'vulkanfels' });
}

function glutriss(level, it, p, rnd, parts, glow) {
  const L = it.length ?? 3, yaw = it.yaw ?? rnd.real(0, Math.PI);
  let x = -L / 2, z = 0;
  const n = Math.max(3, Math.round(L / 0.4));
  for (let i = 0; i < n; i++) {
    const nx = x + L / n, nz = z + rnd.real(-0.18, 0.18);
    const w = 0.12 * (1 - Math.abs(i / n - 0.5));
    const g = new THREE.PlaneGeometry(Math.hypot(nx - x, nz - z), w + 0.05); g.rotateX(-Math.PI / 2); g.rotateY(-Math.atan2(nz - z, nx - x));
    glow.push(fill(at(g, (x + nx) / 2, 0, (z + nz) / 2).rotateY(yaw).translate(p.x, p.y + 0.02, p.z), 0xff8a2a));
    x = nx; z = nz;
  }
}

// ------------------------------------------------------------------ Riff

const CORAL = { rosa: [0xff6ab0, 0xffb8d8], orange: [0xff8a3a, 0xffd08a], lila: [0xa86aff, 0xd8b8ff], gelb: [0xffd23a, 0xfff0a0], tuerkis: [0x3ad8c8, 0xa8fff0] };
const CORAL_KEYS = Object.keys(CORAL);
function koralle(level, it, p, rnd, parts) {
  const s = it.size ?? 1.2;
  const [ca, cb] = (CORAL[it.color] ?? CORAL[CORAL_KEYS[Math.floor(rnd.frac() * CORAL_KEYS.length)]]).map((c) => C(c));
  const k = Math.round(rnd.real(4, 7));
  for (let j = 0; j < k; j++) {
    const h = s * rnd.real(0.6, 1.5), tilt = rnd.real(-0.6, 0.6), a = rnd.real(0, TAU);
    const c = new THREE.CylinderGeometry(0.06 * s, 0.11 * s, h, 6); c.translate(0, h / 2, 0);
    const tip = new THREE.SphereGeometry(0.13 * s, 7, 5); tip.translate(0, h, 0);
    for (const g of [c, tip]) { g.rotateZ(tilt); g.rotateY(a); g.translate(p.x, p.y, p.z); parts.push(colorize(ni(g), (q, n, o) => mixc(ca, cb, smooth(p.y, p.y + s * 1.4, q.y), o))); }
  }
  if (it.solid) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: s * 0.4, y0: p.y, y1: p.y + s, tag: 'koralle' });
}

function seetang(level, it, p, rnd, parts) {
  const H = it.height ?? 3;
  for (let j = 0; j < 4; j++) {
    const h = H * rnd.real(0.6, 1.1);
    const c = new THREE.CylinderGeometry(0.05, 0.1, h, 4, 5); c.translate(p.x + rnd.real(-0.4, 0.4), p.y + h / 2, p.z + rnd.real(-0.4, 0.4));
    const ps = c.attributes.position, ph = rnd.real(0, 6);
    for (let i = 0; i < ps.count; i++) ps.setX(i, ps.getX(i) + Math.sin(ps.getY(i) * 1.1 + ph) * 0.25);
    parts.push(colorize(ni(c), (q, n, o) => mixc(C(0x1a6a3a), C(0x7ad86a), smooth(p.y, p.y + h, q.y), o)));
  }
}

// ------------------------------------------------------------------ Aufbau

const SINGLE = { burgturm, zinnen, fahne, wappen, kette, fackel, knochen, rohr, schlot, zahnrad, basaltsaeule, vulkanfels, glutriss, koralle, seetang };
// Kollision der Arten (gleich, ob eigene Geometrie oder Registry-Modell): eigene Geometrie bauen und verwerfen
const SOLID = new Set(['burgturm', 'zinnen', 'fahne', 'fackel', 'schlot', 'basaltsaeule', 'vulkanfels', 'koralle']);
const TURN = new Set(['basaltsaeule', 'vulkanfels', 'koralle', 'seetang', 'knochen']);

/**
 * Registry-Modelle der Arten (Modell-Agent Welt 7: props_festung_w7.js; wiederverwendet: burg_kette, brummbaer_banner aus
 * Welt 4, zahnrad aus Welt 6, seetang aus Welt 3). Je Art: name, opts, yaw (Vorderseite +X des Modells → Blickrichtung des
 * Eintrags), scale, dy; live: true = bewegtes Objekt statt gebacken (Fahnentuch mit Wappen-Textur). null = eigene Geometrie.
 */
const CORAL_KIND = { rosa: 'geweih', lila: 'geweih', orange: 'roehre', gelb: 'roehre', tuerkis: 'roehre' };
const REG = {
  burgturm: (it) => ({ name: 'festungsturm', opts: { height: it.height ?? 8, radius: it.radius ?? 1.6, roof: it.roof !== false, windows: it.windows !== false, color: it.color === 'blau' ? 'blau' : 'rot' }, yaw: it.yaw ?? -Math.PI / 2 }),
  basaltsaeule: (it, rnd) => { const k = (it.r ?? 0.6) / 0.42; return { name: 'basaltsaeule', opts: { height: it.height ?? 3, count: 1, seed: it.seed ?? rnd.int(1, 999), glow: it.glow === false ? false : it.glow === 'blau' ? 'blau' : 'rot' }, scale: [k, 1, k] }; },
  vulkanfels: (it, rnd) => ({ name: 'vulkanfels', opts: { kind: 'brocken', size: (it.size ?? 1.4) * 1.2, seed: it.seed ?? rnd.int(1, 999), color: it.color === 'blau' ? 'blau' : 'rot' } }),
  fackel: (it) => ({ name: 'fackel', opts: { mount: it.mount === 'stand' ? 'stand' : 'wand', color: it.color === 'blau' ? 'blau' : 'rot' }, yaw: it.yaw ?? -Math.PI / 2 }),
  fahne: (it) => (it.hang
    ? { name: 'brummbaer_banner', opts: { height: it.length ?? 3, width: it.width ?? 1.4 }, yaw: it.yaw ?? -Math.PI / 2 }
    : (it.color === 'lila' ? null : { name: 'brummbaer_fahne', opts: { height: it.height ?? 5, size: [1.8, 1.2] }, yaw: (it.yaw ?? -Math.PI / 2) + Math.PI / 2, live: true })),
  kette: (it) => ({ name: 'burg_kette', opts: { length: it.length ?? 3 } }),
  zahnrad: (it) => { const s = it.size ?? 2, ax = it.axis ?? 'z'; return ax === 'y' ? null : { name: 'zahnrad', opts: { radius: s / 2, thick: s * 0.12, color: 'messing' }, yaw: (it.yaw ?? 0) + (ax === 'z' ? Math.PI / 2 : 0), dy: s / 2 }; },
  koralle: (it, rnd) => ({ name: 'riffkoralle', opts: { kind: CORAL_KIND[it.color] ?? 'geweih', size: (it.size ?? 1.2) / 1.2, seed: it.seed ?? rnd.int(1, 999) } }),
  seetang: (it) => ({ name: 'seetang', opts: { height: it.height ?? 3, count: it.count ?? 3 } }),
};

/** Registry-Modell backen (true) – sonst false (eigene Geometrie): zuerst deco_w7_<kind>, dann die Zuordnung REG. */
function placeReg(level, kind, it, p, rnd) {
  if (it.look === 'eigen') return false;
  let r = null;
  if (hasModel(`deco_w7_${kind}`)) {
    const { pos, kind: _k, type, items, ...opts } = it;
    r = { name: `deco_w7_${kind}`, opts, yaw: it.yaw ?? (TURN.has(kind) ? rnd.real(0, TAU) : 0) };
  } else if (REG[kind]) {
    r = REG[kind](it, rnd);
    if (r && !hasModel(r.name)) r = null;
    if (r && r.yaw === undefined) r.yaw = TURN.has(kind) ? rnd.real(0, TAU) : 0;
  }
  if (!r) return false;
  const y = p.y + (r.dy ?? 0);
  if (level.view) {
    if (r.live) {
      const m = getModel(r.name, r.opts);
      m.root.position.set(p.x, y, p.z);
      m.root.rotation.y = r.yaw;
      m.root.traverse((o) => { if (o.isMesh) { o.castShadow = it.shadow !== false; o.receiveShadow = true; } });
      addObject(level, m.root, (dt) => m.update?.(dt, {}));
    } else {
      bakeModel(level, r.name, r.opts, p.x, y, p.z, r.yaw, r.scale ?? it.scale ?? 1, {}, { castShadow: it.shadow !== false });
    }
  }
  if (kind === 'fackel') {
    const yaw = it.yaw ?? -Math.PI / 2, dx = Math.cos(yaw), dz = -Math.sin(yaw), stand = it.mount === 'stand';
    level.view?.addLantern?.(p.x + (stand ? 0 : dx * 0.49), p.y + (stand ? 1.58 : 0.46) + 0.5, p.z + (stand ? 0 : dz * 0.49));
  }
  if ((it.solid || kind === 'zinnen') && SOLID.has(kind)) {
    const dump = [], dg = [];
    SINGLE[kind]?.({ world: level.world, view: null }, it, p, rnd, dump, dg);
    for (const g of [...dump, ...dg]) g.dispose();
  }
  return true;
}

export function buildDecoW7(level, spec) {
  const items = spec.items ?? [spec];
  const parts = { shadow: [], flat: [] };
  const glow = [];
  for (const it0 of items) {
    const it = spec.items && spec.shadow === false && it0.shadow === undefined ? { ...it0, shadow: false } : it0;
    const p = v3(it.pos ?? it.from);
    const rnd = new Rnd((it.seed ?? Math.floor(p.x * 73 + p.z * 37 + p.y * 11)) >>> 0);
    const P = it.shadow === false ? parts.flat : parts.shadow;
    if (it.kind === 'lavafall') { FLUIDS.lavafall(level, { ...it, kill: it.kill ?? false }); continue; }
    if (placeReg(level, it.kind, it, p, rnd)) continue;
    const scat = (k, n, sz, gap, mk) => {
      for (const [x, z] of scatter(p, it.size ?? sz, it.n ?? n, it.gap ?? gap, it.avoid, rnd)) {
        const sub = { shadow: it.shadow, look: it.look, ...mk() }, q = { x, y: p.y, z };
        if (!placeReg(level, k, sub, q, rnd)) SINGLE[k](level, sub, q, rnd, P, glow);
      }
    };
    switch (it.kind) {
      case 'basaltsaeulen': { const [h0, h1] = range(it.height, [1.5, 5]); scat('basaltsaeule', 7, [4, 4], 1.1, () => ({ height: rnd.real(h0, h1), r: rnd.real(0.45, 0.7), solid: it.solid })); break; }
      case 'vulkanfelsen': scat('vulkanfels', 6, [10, 10], 1.6, () => ({ size: rnd.real(0.7, it.max ?? 1.8), solid: it.solid })); break;
      case 'korallen': scat('koralle', 6, [8, 8], 1.4, () => ({ size: rnd.real(0.8, 1.5), color: it.color })); break;
      default: {
        const fn = SINGLE[it.kind];
        if (fn) fn(level, it, p, rnd, P, glow);
        else console.warn(`[deco_w7] unbekannte Art ${it.kind}`);
      }
    }
  }
  if (parts.shadow.length) addStatic(level, merge(parts.shadow));
  if (parts.flat.length) addStatic(level, merge(parts.flat), { castShadow: false });
  if (glow.length) addStatic(level, merge(glow), { material: 'glow', castShadow: false });
}

export const TYPES = { deco_w7: buildDecoW7 };
