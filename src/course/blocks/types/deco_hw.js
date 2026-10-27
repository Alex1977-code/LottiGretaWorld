// Baustein `deco_hw`: Kulisse der Halloween-Welt „Kürbisinsel“ (Kürbisfeld, Süßes-oder-Saures-Dorf, Nebelfriedhof,
// Hexenturm, Gruselschloss). Eigene Geometrie (bzw. Kulissen-Modelle der Registry, sobald es sie gibt: Name
// 'deco_hw_<kind>', sonst die Halloween-Modelle 'kuerbis', 'kuerbislaterne', 'vogelscheuche', 'strohballen',
// 'maisstaude', 'suessigkeiten_haufen'; Ursprung = Fußpunkt, Blick +X) wird in die statische Geometrie verschmolzen
// (keine zusätzlichen Zeichenaufrufe, Abschnitts-Culling); Leuchtendes (Kürbisgesichter, Kerzenflammen, Fenster) geht ins
// Glüh-Material. Kollision nur, wo `solid` (Standard je Art unten) – sie bleibt auch mit Registry-Modell gleich.
//
// Einzeln:  { type: 'deco_hw', kind, pos: [x, y, z], … }   oder Liste: { type: 'deco_hw', items: [{ kind, pos, … }, …] }
// pos = Fußpunkt; yaw in Radiant; Streuungen (Mehrzahl-Namen) verteilen deterministisch (seed) in size: [w, d] um pos,
// halten gap m Abstand und meiden avoid: [[x, z, r], …]. shadow: false → kein Schattenwurf (je Eintrag oder Liste).
// kind:
//   kuerbis (size 0.9 = Ø, shape 'rund' | 'flach' | 'hoch' | 'dick', color 'orange' | 'gelb' | 'weiss' | 'gruen' | 'rot',
//            face: false | 'lachen' | 'grinsen' | 'staunen', yaw, solid: size ≥ 1.2) ·
//   kuerbisse (Streuung n 8, sizes [0.45, 1.1], faces 0.3 = Anteil mit Gesicht, colors) ·
//   kuerbislaterne (leuchtender Kürbis: size 0.7, mount 'boden' | 'pfahl', face 'lachen', yaw, light: true = Punktlicht
//            im Thema mit lanternLight) ·
//   vogelscheuche (freundlich, Kürbiskopf mit Hut: size 1, yaw, solid true) ·
//   strohballen (form 'eckig' | 'rund', size 1, yaw, solid true) ·
//   maisstaude (height 2.2) · maisfeld (Streuung n 12, height [1.8, 2.5]) ·
//   krummer_baum (kahler, verdrehter Baum: height 5, yaw, solid true) · krumme_baeume (Streuung n 4) ·
//   grabstein (style 'rund' | 'kreuz' | 'spitz', size 1, face true (Lachgesicht), yaw, solid true) · grabsteine
//            (Streuung n 6) ·
//   zaun (from, to, style 'holz' | 'eisen', height 1.1, solid false) ·
//   spinnweben (size 1.4, yaw, lage 'ecke' (senkrecht, in einer Ecke) | 'decke' (waagerecht)) ·
//   kerzen (Gruppe leuchtender Kerzen: n 3, size 1, light false) ·
//   fledermaus_girlande (Leine mit Papier-Fledermäusen: from, to (Aufhängepunkte), n 7, sag 0.6) ·
//   suessigkeiten (Süßigkeiten-Haufen: size 1.2, seed)

import * as THREE from 'three';
import { v3, lin, mixc, smooth, colorize, merge, Rnd, addStatic, hex, box } from '../kit.js';
import { bakeModel } from '../w2kit.js';
import { hasModel } from '../../models/index.js';
import { HWC, pumpkinGeo, faceGeo, candyGeo, CANDY_VARIANTS } from '../hwkit.js';

const C = (h) => lin(hex(h));
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const range = (v, d) => (Array.isArray(v) ? v : [v ?? d[0], v ?? d[1]]);
const fill = (g, col) => colorize(ni(g), (p, n, o) => { o[0] = col[0]; o[1] = col[1]; o[2] = col[2]; });
const shadeY = (g, lo, hi, a = -0.6, b = 0.8) => colorize(ni(g), (p, n, o) => mixc(lo, hi, smooth(a, b, n.y * 0.7 - n.x * 0.25 + n.z * 0.25), o));
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

// ------------------------------------------------------------------ Kürbisfeld

function kuerbis(level, it, p, rnd, parts, glow) {
  const s = it.size ?? 0.9, yaw = it.yaw ?? (it.face ? -Math.PI / 2 + rnd.real(-0.4, 0.4) : rnd.real(0, 6.28));
  const pk = pumpkinGeo({ r: s / 2, shape: it.shape ?? 'rund', color: it.color ?? 'orange', leafYaw: rnd.real(0, 6.28), seg: s > 1 ? 24 : 16 });
  parts.push(at(pk.body, p.x, p.y, p.z, yaw));
  if (it.face) glow.push(at(faceGeo({ r: s / 2, shape: it.shape ?? 'rund', kind: it.face }), p.x, p.y, p.z, yaw));
  if (it.solid ?? s >= 1.2) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: s * 0.45, y0: p.y, y1: p.y + s * 0.8, tag: 'kuerbis' });
}

function kuerbislaterne(level, it, p, rnd, parts, glow) {
  const s = it.size ?? 0.7, yaw = it.yaw ?? -Math.PI / 2;
  let y = p.y;
  if (it.mount === 'pfahl') {
    const post = new THREE.CylinderGeometry(0.08, 0.11, 1.6, 6); post.translate(p.x, p.y + 0.8, p.z);
    parts.push(shadeY(post, C(HWC.woodLow), C(HWC.wood)));
    y = p.y + 1.6;
  }
  const pk = pumpkinGeo({ r: s / 2, color: it.color ?? 'orange', leaf: false });
  parts.push(at(pk.body, p.x, y, p.z, yaw));
  glow.push(at(faceGeo({ r: s / 2, kind: it.face ?? 'lachen' }), p.x, y, p.z, yaw));
  if (it.light !== false) level.view?.addLantern?.(p.x, y + s * 0.5, p.z);
  if (it.solid) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: s * 0.45, y0: p.y, y1: y + s * 0.8, tag: 'kuerbislaterne' });
}

function vogelscheuche(level, it, p, rnd, parts, glow) {
  const k = it.size ?? 1, yaw = it.yaw ?? -Math.PI / 2;
  const L = [];
  const wood = (g) => shadeY(g, C(HWC.woodLow), C(HWC.wood));
  L.push(wood(at(new THREE.CylinderGeometry(0.07, 0.09, 2.0, 6), 0, 1.0, 0)));
  const arm = new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6); arm.rotateX(Math.PI / 2); L.push(wood(at(arm, 0, 1.45, 0)));
  // kariertes Hemd (Körper + Ärmel)
  const shirt = (g) => colorize(ni(g), (q, n, o) => { const ch = (Math.floor(q.y * 6) + Math.floor(q.z * 6)) & 1; mixc(C(0xc83a3a), C(0x8a2a5a), ch ? 0.7 : 0, o); if (n.y > 0.7) mixc(o, C(0xffffff), 0.1, o); });
  L.push(shirt(at(new THREE.CylinderGeometry(0.28, 0.34, 0.75, 8), 0, 1.15, 0)));
  for (const sd of [-1, 1]) {
    const sl = new THREE.CylinderGeometry(0.11, 0.14, 0.55, 6); sl.rotateX(Math.PI / 2); L.push(shirt(at(sl, 0, 1.45, sd * 0.45)));
    // Strohbüschel an den Ärmeln
    const st = new THREE.ConeGeometry(0.12, 0.25, 6); st.rotateX(sd * Math.PI / 2); L.push(colorize(ni(at(st, 0, 1.45, sd * 0.82)), (q, n, o) => mixc(C(HWC.strawLow), C(HWC.straw), 0.6, o)));
  }
  // Flicken
  L.push(fill(at(new THREE.BoxGeometry(0.02, 0.16, 0.14), 0.33, 1.05, 0.08), C(0xffd23a)));
  // Kürbiskopf mit Hut
  const pk = pumpkinGeo({ r: 0.27, color: 'orange', stem: false });
  L.push(at(pk.body, 0, 1.55, 0));
  const face = faceGeo({ r: 0.27, kind: 'lachen' });
  face.translate(0, 1.55, 0);
  const hatB = new THREE.CylinderGeometry(0.42, 0.44, 0.04, 14); L.push(fill(at(hatB, 0, 1.98, 0), C(0x6a4a2a)));
  const hatT = new THREE.CylinderGeometry(0.18, 0.24, 0.32, 12); hatT.rotateZ(0.12); L.push(shadeY(at(hatT, -0.02, 2.14, 0), C(0x5a3a1e), C(0x8a6a3a)));
  L.push(fill(at(new THREE.CylinderGeometry(0.245, 0.245, 0.06, 12), -0.01, 2.02, 0), C(0xc83a3a)));
  // Krähe mit Schleife auf dem Arm
  const crow = new THREE.SphereGeometry(0.11, 8, 6); crow.scale(1.3, 1, 1); L.push(fill(at(crow, 0, 1.6, 0.62), C(0x2a2438)));
  L.push(fill(at(new THREE.ConeGeometry(0.03, 0.09, 5).rotateZ(-Math.PI / 2), 0.16, 1.62, 0.62), C(0xffb03a)));
  const g = merge(L);
  g.scale(k, k, k); g.rotateY(yaw); g.translate(p.x, p.y, p.z);
  parts.push(g);
  face.scale(k, k, k); face.rotateY(yaw); face.translate(p.x, p.y, p.z);
  glow.push(face);
  if (it.solid !== false) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.3 * k, y0: p.y, y1: p.y + 2.1 * k, tag: 'vogelscheuche' });
}

function strohballen(level, it, p, rnd, parts) {
  const k = it.size ?? 1, yaw = it.yaw ?? rnd.real(0, 6.28);
  const sh = (g) => colorize(ni(g), (q, n, o) => { mixc(C(HWC.strawLow), C(HWC.straw), smooth(-0.6, 0.9, n.y * 0.6 + Math.sin(q.x * 31 + q.y * 23 + q.z * 17) * 0.25), o); });
  if (it.form === 'rund') {
    const g = new THREE.CylinderGeometry(0.6 * k, 0.6 * k, 1.1 * k, 16); g.rotateX(Math.PI / 2); g.translate(0, 0.6 * k, 0);
    const gg = sh(g); gg.rotateY(yaw); gg.translate(p.x, p.y, p.z); parts.push(gg);
    if (it.solid !== false) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.6 * k, y0: p.y, y1: p.y + 1.2 * k, tag: 'strohballen' });
  } else {
    const ys = snapYaw4(yaw);
    const g = box(1.2 * k, 0.65 * k, 0.75 * k, 0, 0.325 * k, 0, HWC.straw, { r: 0.08, seg: 1 });
    const gg = sh(g);
    gg.rotateY(ys); gg.translate(p.x, p.y, p.z); parts.push(gg);
    for (const dx of [-0.3, 0.3]) { const t = box(0.04, 0.67 * k, 0.77 * k, dx * k, 0.325 * k, 0, 0xa83a2a, { r: 0.01, seg: 1 }); t.rotateY(ys); t.translate(p.x, p.y, p.z); parts.push(t); }
    if (it.solid !== false) {
      const c = Math.abs(Math.cos(ys)), s = Math.abs(Math.sin(ys));
      const hx = (0.6 * c + 0.375 * s) * k, hz = (0.6 * s + 0.375 * c) * k;
      level.world.add({ type: 'box', min: [p.x - hx, p.y, p.z - hz], max: [p.x + hx, p.y + 0.65 * k, p.z + hz], tag: 'strohballen' });
    }
  }
}
const snapYaw4 = (y) => Math.round(y / (Math.PI / 2)) * (Math.PI / 2);

function maisstaude(level, it, p, rnd, parts) {
  const H = it.height ?? 2.2;
  const stalk = C(0xb8b04a), stalkD = C(0x7a7a2a), leaf = C(0xd8c860), leafD = C(0x9a8a3a);
  for (let s = 0; s < 3; s++) {
    const ox = rnd.real(-0.25, 0.25), oz = rnd.real(-0.25, 0.25), h = H * rnd.real(0.8, 1.05);
    parts.push(shadeY(at(new THREE.CylinderGeometry(0.03, 0.05, h, 5), p.x + ox, p.y + h / 2, p.z + oz), stalkD, stalk));
    for (let l = 0; l < 4; l++) {
      const a = rnd.real(0, 6.28), y = p.y + h * (0.25 + l * 0.17), len = rnd.real(0.6, 0.9);
      const g = new THREE.PlaneGeometry(len, 0.12, 4, 1);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) { const x = pos.getX(i) + len / 2; pos.setXYZ(i, x, -x * x * 0.5 + pos.getY(i) * 0.3, pos.getY(i)); }
      g.rotateY(-a); g.translate(p.x + ox, y, p.z + oz);
      parts.push(colorize(ni(g), (q, n, o) => mixc(leafD, leaf, 0.5, o)));
    }
    // Kolben
    const cob = new THREE.CylinderGeometry(0.05, 0.035, 0.28, 6); cob.rotateZ(0.4);
    parts.push(colorize(ni(at(cob, p.x + ox + 0.06, p.y + h * 0.55, p.z + oz)), (q, n, o) => mixc(C(0xe8b82a), C(0xffe070), 0.5, o)));
    // Rispe
    parts.push(fill(at(new THREE.ConeGeometry(0.06, 0.3, 5), p.x + ox, p.y + h + 0.1, p.z + oz), C(0xe8d88a)));
  }
}

function krummerBaum(level, it, p, rnd, parts) {
  const H = it.height ?? 5;
  const dark = C(0x3a2a3a), hi = C(0x6a5a6a);
  const branch = (x, y, z, len, a, b, r, depth) => {
    const g = new THREE.CylinderGeometry(r * 0.6, r, len, 6, 2);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) { const yy = pos.getY(i) + len / 2; pos.setX(i, pos.getX(i) + Math.sin(yy * 1.3 + depth) * 0.06 * len); }
    g.computeVertexNormals();
    g.translate(0, len / 2, 0); g.rotateZ(a); g.rotateY(b); g.translate(x, y, z);
    parts.push(colorize(ni(g), (q, n, o) => mixc(dark, hi, smooth(-0.5, 0.9, n.x * -0.5 + n.y * 0.5), o)));
    if (depth > 0) {
      const ex = x - Math.sin(a) * len * Math.cos(b), ey = y + Math.cos(a) * len, ez = z + Math.sin(a) * len * Math.sin(b);
      branch(ex, ey, ez, len * 0.66, a + rnd.real(0.5, 0.9), b + rnd.real(-0.7, 0.7), r * 0.62, depth - 1);
      branch(ex, ey, ez, len * 0.6, a - rnd.real(0.5, 0.9), b + rnd.real(-0.7, 0.7), r * 0.6, depth - 1);
      if (depth === 1) {
        // gekrümmte Spitze
        branch(ex, ey, ez, len * 0.4, a * 0.5 + 1.2, b + 1.5, r * 0.4, 0);
      }
    }
  };
  branch(p.x, p.y, p.z, H * 0.45, rnd.real(-0.15, 0.15), it.yaw ?? rnd.real(0, 6.28), H * 0.06, 3);
  // Wurzeln
  for (let k = 0; k < 4; k++) {
    const a = k * 1.57 + rnd.real(-0.3, 0.3);
    const r = new THREE.ConeGeometry(0.16 * H / 5, 0.9 * H / 5, 5); r.rotateZ(-Math.PI / 2 + 0.4); r.rotateY(-a); r.translate(p.x + Math.cos(a) * 0.25, p.y + 0.12, p.z + Math.sin(a) * 0.25);
    parts.push(colorize(ni(r), (q, n, o) => mixc(dark, hi, 0.3, o)));
  }
  if (it.solid !== false) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: H * 0.06, y0: p.y, y1: p.y + H * 0.45, tag: 'baum' });
}

function grabstein(level, it, p, rnd, parts, glow) {
  const k = it.size ?? 1, yaw = it.yaw ?? -Math.PI / 2 + rnd.real(-0.25, 0.25);
  const style = it.style ?? ['rund', 'kreuz', 'spitz'][Math.floor(rnd.frac() * 3)];
  const st = C(HWC.stone), hi = C(HWC.stoneHi), low = C(HWC.stoneLow), moss = C(HWC.moss);
  const sh = (g) => colorize(ni(g), (q, n, o) => { mixc(low, st, smooth(-0.6, 0.8, n.x * 0.5 + n.y * 0.5), o); mixc(o, hi, smooth(0.6, 1, n.y) * 0.4, o); if (q.y < 0.25 && Math.sin(q.z * 12 + q.x * 9) > 0.2) mixc(o, moss, 0.5, o); });
  const L = [];
  if (style === 'kreuz') {
    L.push(box(0.2, 1.2, 0.24, 0, 0.6, 0, HWC.stone, { r: 0.04, seg: 1 }));
    L.push(box(0.2, 0.22, 0.75, 0, 0.85, 0, HWC.stone, { r: 0.04, seg: 1 }));
  } else {
    L.push(box(0.22, 0.75, 0.75, 0, 0.375, 0, HWC.stone, { r: 0.04, seg: 1 }));
    const top = style === 'spitz' ? new THREE.ConeGeometry(0.53, 0.45, 4) : new THREE.CylinderGeometry(0.375, 0.375, 0.22, 16, 1, false, 0, Math.PI);
    if (style === 'spitz') { top.rotateY(Math.PI / 4); top.scale(0.3, 1, 1); top.translate(0, 0.97, 0); }
    else { top.rotateX(Math.PI / 2); top.rotateZ(Math.PI / 2); top.rotateY(Math.PI / 2); top.translate(0, 0.75, 0); }
    L.push(top);
  }
  L.push(box(0.4, 0.1, 0.95, 0, 0.05, 0, HWC.stone, { r: 0.03, seg: 1 }));
  const g = merge(L.map((q) => sh(q)));
  g.scale(k, k, k); g.rotateY(yaw); g.translate(p.x, p.y, p.z);
  parts.push(g);
  if (it.face !== false && style !== 'kreuz') {
    const F = [];
    for (const sd of [-1, 1]) { const e = new THREE.CircleGeometry(0.055, 8); e.scale(1, 1.3, 1); e.rotateY(Math.PI / 2); e.translate(0.115, 0.6, sd * 0.14); F.push(e); }
    const m = new THREE.RingGeometry(0.08, 0.12, 10, 1, Math.PI * 1.1, Math.PI * 0.8); m.rotateY(Math.PI / 2); m.translate(0.115, 0.46, 0); F.push(m);
    const f = fill(merge(F.map(ni)), C(0x2a2236));
    f.scale(k, k, k); f.rotateY(yaw); f.translate(p.x, p.y, p.z);
    parts.push(f);
  }
  if (it.solid !== false) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.38 * k, y0: p.y, y1: p.y + 1.0 * k, tag: 'grabstein' });
}

function zaun(level, it, p, rnd, parts) {
  const a = v3(it.from ?? it.pos), b = v3(it.to ?? it.pos);
  const L = Math.hypot(b.x - a.x, b.z - a.z), H = it.height ?? 1.1;
  if (L < 0.1) return;
  const yaw = Math.atan2(-(b.z - a.z), b.x - a.x);
  const eisen = it.style === 'eisen';
  const n = Math.max(2, Math.round(L / (eisen ? 0.32 : 0.45)) + 1);
  const col = eisen ? [C(HWC.iron), C(HWC.ironHi)] : [C(HWC.woodLow), C(0xd8c8a8)];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1), x = a.x + (b.x - a.x) * u, z = a.z + (b.z - a.z) * u, y = a.y + (b.y - a.y) * u;
    const h = H * (eisen ? 1 : 0.85 + 0.15 * Math.sin(i * 1.7));
    const lean = eisen ? 0 : Math.sin(i * 2.3) * 0.08;
    const g = eisen ? new THREE.CylinderGeometry(0.025, 0.025, h, 5) : new THREE.BoxGeometry(0.16, h, 0.05);
    g.translate(0, h / 2, 0); g.rotateZ(lean);
    const tip = eisen ? new THREE.ConeGeometry(0.06, 0.16, 4) : new THREE.ConeGeometry(0.09, 0.14, 4);
    tip.translate(0, h + 0.07, 0); tip.rotateZ(lean);
    for (const q of [g, tip]) { q.rotateY(yaw); q.translate(x, y, z); parts.push(shadeY(q, col[0], col[1])); }
  }
  for (const hh of eisen ? [0.15, H - 0.12] : [0.3, H * 0.65]) {
    const rail = eisen ? new THREE.CylinderGeometry(0.03, 0.03, L, 5) : new THREE.BoxGeometry(0.06, 0.1, L);
    if (eisen) rail.rotateX(Math.PI / 2);
    rail.rotateY(yaw + Math.PI / 2); rail.translate((a.x + b.x) / 2, (a.y + b.y) / 2 + hh, (a.z + b.z) / 2);
    parts.push(shadeY(rail, col[0], col[1]));
  }
  if (it.solid) {
    const x0 = Math.min(a.x, b.x) - 0.08, x1 = Math.max(a.x, b.x) + 0.08, z0 = Math.min(a.z, b.z) - 0.08, z1 = Math.max(a.z, b.z) + 0.08;
    level.world.add({ type: 'box', min: [x0, Math.min(a.y, b.y), z0], max: [x1, Math.max(a.y, b.y) + H, z1], tag: 'zaun' });
  }
}

function spinnweben(level, it, p, rnd, parts) {
  const s = it.size ?? 1.4, yaw = it.yaw ?? 0;
  const pos = [];
  const strand = (ax, ay, bx, by, w) => {
    const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1, nx = -dy / l * w / 2, ny = dx / l * w / 2;
    for (const [x, y] of [[ax + nx, ay + ny], [ax - nx, ay - ny], [bx - nx, by - ny], [ax + nx, ay + ny], [bx - nx, by - ny], [bx + nx, by + ny]]) pos.push(x * s, y * s, 0);
  };
  // Viertelkreis-Netz in der Ecke (Ursprung = Ecke)
  const sp = 6;
  for (let i = 0; i <= sp; i++) { const a = (i / sp) * Math.PI / 2; strand(0, 0, Math.cos(a), Math.sin(a), 0.02); }
  for (let r = 1; r <= 4; r++) {
    const rr = r / 4.4;
    for (let i = 0; i < sp; i++) {
      const a0 = (i / sp) * Math.PI / 2, a1 = ((i + 1) / sp) * Math.PI / 2;
      const sag = 0.06 * rr;
      const m = (a0 + a1) / 2;
      strand(Math.cos(a0) * rr, Math.sin(a0) * rr, Math.cos(m) * (rr - sag), Math.sin(m) * (rr - sag), 0.016);
      strand(Math.cos(m) * (rr - sag), Math.sin(m) * (rr - sag), Math.cos(a1) * rr, Math.sin(a1) * rr, 0.016);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  if (it.lage === 'decke') g.rotateX(-Math.PI / 2);
  else g.rotateZ(Math.PI);   // Ecke oben: hängt von oben in die Ecke
  g.rotateY(yaw);
  g.translate(p.x, p.y, p.z);
  // beidseitig sichtbar: Rückseite dazu
  const back = g.clone();
  const idx = back.attributes.position.array;
  for (let i = 0; i < idx.length; i += 9) for (let k = 0; k < 3; k++) { const t = idx[i + 3 + k]; idx[i + 3 + k] = idx[i + 6 + k]; idx[i + 6 + k] = t; }
  back.computeVertexNormals();
  const silk = C(0xeee8ff);
  parts.push(fill(g, silk), fill(back, silk));
}

function kerzen(level, it, p, rnd, parts, glow) {
  const n = it.n ?? 3, s = it.size ?? 1;
  for (let i = 0; i < n; i++) {
    const a = rnd.real(0, 6.28), d = i ? rnd.real(0.12, 0.35) * s : 0, h = s * rnd.real(0.25, 0.55);
    const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
    parts.push(colorize(ni(at(new THREE.CylinderGeometry(0.06 * s, 0.065 * s, h, 8), x, p.y + h / 2, z)), (q, nn, o) => mixc(C(0xe8dcc0), C(0xfff8e8), smooth(-0.3, 1, nn.y), o)));
    // Wachstropfen
    parts.push(fill(at(new THREE.SphereGeometry(0.05 * s, 5, 4), x + 0.05 * s, p.y + h * 0.8, z), C(0xfff4dc)));
    const fl = new THREE.SphereGeometry(0.045 * s, 6, 5); fl.scale(1, 1.9, 1);
    glow.push(colorize(ni(at(fl, x, p.y + h + 0.07 * s, z)), (q, nn, o) => mixc(C(0xff9a2a), C(0xfff6c0), smooth(p.y + h, p.y + h + 0.12 * s, q.y), o)));
  }
  if (it.light) level.view?.addLantern?.(p.x, p.y + s * 0.6, p.z);
}

function fledermausGirlande(level, it, p, rnd, parts) {
  const a = v3(it.from ?? it.pos), b = v3(it.to ?? it.pos);
  const n = it.n ?? 7, sag = it.sag ?? 0.6;
  const pt = (u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u - Math.sin(u * Math.PI) * sag, z: a.z + (b.z - a.z) * u });
  const seg = 16;
  for (let i = 0; i < seg; i++) {
    const q0 = pt(i / seg), q1 = pt((i + 1) / seg);
    const len = Math.hypot(q1.x - q0.x, q1.y - q0.y, q1.z - q0.z);
    const g = new THREE.CylinderGeometry(0.012, 0.012, len, 3);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(q1.x - q0.x, q1.y - q0.y, q1.z - q0.z).normalize()));
    g.translate((q0.x + q1.x) / 2, (q0.y + q1.y) / 2, (q0.z + q1.z) / 2);
    parts.push(fill(g, C(0x3a2a2a)));
  }
  const yaw = Math.atan2(-(b.z - a.z), b.x - a.x);
  const cols = [0x2a2040, 0xff8a1a, 0x6a3ab8].map(C);
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, q = pt(u);
    const sh = new THREE.Shape();
    // Fledermaus-Silhouette (Papier)
    sh.moveTo(0, 0.08); sh.lineTo(0.06, 0.12); sh.lineTo(0.08, 0.04); sh.quadraticCurveTo(0.22, 0.12, 0.34, 0.06);
    sh.quadraticCurveTo(0.26, 0.0, 0.28, -0.06); sh.quadraticCurveTo(0.18, -0.02, 0.12, -0.08); sh.quadraticCurveTo(0.04, -0.04, 0, -0.12);
    sh.quadraticCurveTo(-0.04, -0.04, -0.12, -0.08); sh.quadraticCurveTo(-0.18, -0.02, -0.28, -0.06); sh.quadraticCurveTo(-0.26, 0.0, -0.34, 0.06);
    sh.quadraticCurveTo(-0.22, 0.12, -0.08, 0.04); sh.lineTo(-0.06, 0.12); sh.closePath();
    const g = new THREE.ShapeGeometry(sh, 3);
    g.scale(1.3, 1.3, 1);
    g.rotateY(yaw); g.translate(q.x, q.y - 0.2, q.z);
    parts.push(fill(g, cols[i % cols.length]));
    const g2 = new THREE.ShapeGeometry(sh, 3); g2.scale(1.3, 1.3, 1); g2.rotateY(yaw + Math.PI); g2.translate(q.x, q.y - 0.2, q.z);
    parts.push(fill(g2, cols[i % cols.length]));
  }
}

function suessigkeiten(level, it, p, rnd, parts) {
  const s = it.size ?? 1.2;
  // Kegel aus Bonbonkugeln, obenauf Lollis und Zuckermais
  for (let i = 0; i < 26; i++) {
    const h = rnd.real(0, 0.55) * s, rr = (0.55 - h / s) * s * rnd.real(0.3, 1);
    const a = rnd.real(0, 6.28);
    const ball = new THREE.SphereGeometry(rnd.real(0.08, 0.13) * s, 7, 5);
    parts.push(colorize(ni(at(ball, p.x + Math.cos(a) * rr, p.y + h + 0.06 * s, p.z + Math.sin(a) * rr)), ((c) => (q, n, o) => mixc(c, C(0xffffff), smooth(0.4, 1, n.y) * 0.4, o))(C(HWC.candy[i % HWC.candy.length]))));
  }
  for (let i = 0; i < 4; i++) {
    const v = CANDY_VARIANTS[i % CANDY_VARIANTS.length];
    const g = candyGeo(v, i + 1);
    g.scale(s * 0.9, s * 0.9, s * 0.9);
    g.rotateZ(rnd.real(-0.6, 0.6)); g.rotateY(rnd.real(0, 6.28));
    const a = (i / 4) * 6.28;
    g.translate(p.x + Math.cos(a) * 0.3 * s, p.y + 0.5 * s, p.z + Math.sin(a) * 0.3 * s);
    parts.push(g);
  }
}

// ------------------------------------------------------------------ Aufbau

const SINGLE = {
  kuerbis, kuerbislaterne, vogelscheuche, strohballen, maisstaude, krummer_baum: krummerBaum, grabstein, zaun, spinnweben, kerzen,
  fledermaus_girlande: fledermausGirlande, suessigkeiten,
};

// Registry-Modelle ohne Präfix (Halloween-Modelle des Modell-Agenten); Optionen wie die Felder hier
const ALIAS = { kuerbis: 'kuerbis', kuerbislaterne: 'kuerbislaterne', vogelscheuche: 'vogelscheuche', strohballen: 'strohballen', maisstaude: 'maisstaude', suessigkeiten: 'suessigkeiten_haufen' };

// Kollision der Arten, deren Aussehen ein Registry-Modell übernimmt (gleiche Formen wie die eigene Geometrie oben)
const MODEL_SOLID = {
  kuerbis: (level, it, p, s) => { const d = (it.size ?? 0.9) * s; if (it.solid ?? d >= 1.2) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: d * 0.45, y0: p.y, y1: p.y + d * 0.8, tag: 'kuerbis' }); },
  kuerbislaterne: (level, it, p, s) => { if (it.light !== false) level.view?.addLantern?.(p.x, p.y + (it.mount === 'pfahl' ? 1.9 : 0.4) * s, p.z); if (it.solid) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.3 * s, y0: p.y, y1: p.y + (it.mount === 'pfahl' ? 2.2 : 0.6) * s, tag: 'kuerbislaterne' }); },
  vogelscheuche: (level, it, p, s) => { const k = (it.size ?? 1) * s; if (it.solid !== false) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.3 * k, y0: p.y, y1: p.y + 2.1 * k, tag: 'vogelscheuche' }); },
  strohballen: (level, it, p, s) => { const k = (it.size ?? 1) * s; if (it.solid !== false) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.6 * k, y0: p.y, y1: p.y + (it.form === 'rund' ? 1.2 : 0.65) * k, tag: 'strohballen' }); },
  krummer_baum: (level, it, p, s) => { const H = (it.height ?? 5) * s; if (it.solid !== false) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: H * 0.06, y0: p.y, y1: p.y + H * 0.45, tag: 'baum' }); },
  grabstein: (level, it, p, s) => { const k = (it.size ?? 1) * s; if (it.solid !== false) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.38 * k, y0: p.y, y1: p.y + k, tag: 'grabstein' }); },
  kerzen: (level, it, p, s) => { if (it.light) level.view?.addLantern?.(p.x, p.y + (it.size ?? 1) * 0.6 * s, p.z); },
};

function modelName(kind) {
  if (hasModel(`deco_hw_${kind}`)) return `deco_hw_${kind}`;
  const a = ALIAS[kind];
  return a && hasModel(a) ? a : null;
}

export function buildDecoHw(level, spec) {
  const items = spec.items ?? [spec];
  const parts = { shadow: [], flat: [] };
  const glow = [];
  for (const it0 of items) {
    const it = spec.items && spec.shadow === false && it0.shadow === undefined ? { ...it0, shadow: false } : it0;
    const p = v3(it.pos ?? it.from);
    const rnd = new Rnd((it.seed ?? Math.floor(p.x * 73 + p.z * 37 + p.y * 11)) >>> 0);
    const P = it.shadow === false ? parts.flat : parts.shadow;
    const name = it.kind && level.view ? modelName(it.kind) : null;
    if (name) {
      const opts = it.kind === 'strohballen' ? { ...it, kind: it.form ?? 'eckig' } : it.kind === 'maisstaude' ? { ...it, count: it.count ?? 4 } : it;
      bakeModel(level, name, opts, p.x, p.y, p.z, it.yaw ?? (it.kind === 'kuerbislaterne' ? -Math.PI / 2 : 0), it.scale ?? 1, {}, { castShadow: it.shadow !== false });
      MODEL_SOLID[it.kind]?.(level, it, p, it.scale ?? 1);
      continue;
    }
    const scat = (fn, n, sz, gap, mk) => { for (const [x, z] of scatter(p, it.size ?? sz, it.n ?? n, it.gap ?? gap, it.avoid, rnd)) fn(level, { shadow: it.shadow, ...mk() }, { x, y: p.y, z }, rnd, P, glow); };
    switch (it.kind) {
      case 'kuerbisse': {
        const [s0, s1] = range(it.sizes, [0.45, 1.1]);
        const cols = it.colors ?? ['orange', 'orange', 'orange', 'gelb', 'weiss', 'gruen'];
        scat(kuerbis, 8, [10, 10], 1.1, () => ({ size: rnd.real(s0, s1), color: cols[Math.floor(rnd.frac() * cols.length)], shape: ['rund', 'flach', 'hoch', 'dick'][Math.floor(rnd.frac() * 4)], face: rnd.frac() < (it.faces ?? 0.3) ? ['lachen', 'grinsen', 'staunen'][Math.floor(rnd.frac() * 3)] : false, yaw: -Math.PI / 2 + rnd.real(-0.6, 0.6), solid: it.solid }));
        break;
      }
      case 'maisfeld': { const [h0, h1] = range(it.height, [1.8, 2.5]); scat(maisstaude, 12, [8, 8], 0.9, () => ({ height: rnd.real(h0, h1) })); break; }
      case 'krumme_baeume': { const [h0, h1] = range(it.height, [4, 6]); scat(krummerBaum, 4, [16, 16], 4, () => ({ height: rnd.real(h0, h1), solid: it.solid })); break; }
      case 'grabsteine': scat(grabstein, 6, [10, 8], 1.4, () => ({ size: rnd.real(0.8, 1.15) * (it.scaleStone ?? 1), style: it.style, face: it.face, solid: it.solid })); break;
      default: {
        const fn = SINGLE[it.kind];
        if (fn) fn(level, it, p, rnd, P, glow);
        else console.warn(`[deco_hw] unbekannte Art ${it.kind}`);
      }
    }
  }
  if (parts.shadow.length) addStatic(level, merge(parts.shadow));
  if (parts.flat.length) addStatic(level, merge(parts.flat), { castShadow: false });
  if (glow.length) addStatic(level, merge(glow), { material: 'glow', castShadow: false });
}

export const TYPES = { deco_hw: buildDecoHw };
