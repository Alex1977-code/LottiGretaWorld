// Baustein `deco_w8`: Kulisse für Welt 8 „Brummbär-Rummelplatz“ (Rummel, Regenfestung, Keksfabrik, Unterwasserfestung,
// Spukhaus) und den Abspann. Eigene Geometrie wird in die statische Geometrie verschmolzen (keine zusätzlichen Zeichenaufrufe),
// Leuchtendes (Glühbirnen, Lampions, Kerzen, Ofenglut) ins Glüh-Material. Registry-Modelle werden gebacken, sobald es sie gibt:
// `deco_w8_<kind>` (opts = die Felder des Eintrags; Ursprung Fußpunkt, Blick +X → yaw des Eintrags). Die Kollision (solid)
// bleibt gleich; look: 'eigen' erzwingt die eigene Geometrie. Das Karussell dreht sich (eigenes Objekt).
//
// Einzeln:  { type: 'deco_w8', kind, pos: [x, y, z], … }   oder Liste: { type: 'deco_w8', items: [{ kind, pos, … }, …] }
// pos = Fußpunkt; yaw in Radiant (Vorderseite nach +X gedreht um yaw; Standard −π/2 = zur Kamera +Z); Ketten von from → to
// (Durchhang sag m); Streuungen (Mehrzahl-Namen) deterministisch (seed) in size: [w, d] um pos. shadow: false → wirft keinen
// Schatten; solid: true → Kollision.
// kind:
//   Rummel     bude (Marktbude mit gestreiftem Vordach und Glühbirnen: width 3, depth 2.2, height 2.6, color 'rot' | 'blau' |
//              'gruen' | 'gelb' | 'lila') · wimpel (Wimpelkette from → to, sag 0.6) · gluehbirnen (Glühbirnenkette from → to,
//              sag 0.5) · lampions (Lampionkette from → to, sag 0.7) · mast (Laternenmast mit Glühbirnen: height 4) · karussell
//              (dreht sich: radius 3, height 3.6, speed 0.6) · ballons (Ballontraube: n 5, height 3) · achterbahn (Schienenstück
//              from → to, hump 3, ground y für die Stützen) · torbogen (Eingangsbogen mit Glühbirnen und Stern: width 6, height 5)
//              · picknick (Picknickdecke mit Korb, Torte, Bechern: size 3)
//   Regen      wasserspeier (Brummbär-Wasserspeier an der Wand mit Wasserstrahl: yaw, height 3) · pfuetze (Pfütze: size [2, 1.4])
//              · regentonne (Fass mit Wasser: height 1.2)
//   Keks       keksstapel (Stapel Riesenkekse: n 4, radius 1) · ruehrschuessel (Schüssel mit Teig und Löffel: size 1.6) · backofen
//              (Ofen mit glühendem Fenster: width 3, height 2.6) · spritzbeutel (Zuckerguss-Tülle, tropft: height 3) · kruemel
//              (Streuung von Keksbrocken: n 10)
//   Unterwasser saeule (versunkene Säule, oben abgebrochen: height 4) · muscheln (Streuung: n 8) · anker (size 2) · gitterfenster
//              (vergittertes, glimmendes Fenster an der Wand: size [1.4, 2], yaw)
//   Spukhaus   kerzenleuchter (dreiarmig, Flammen leuchten: height 1.6) · bilderrahmen (Ölbild-Rahmen an der Wand, Brummbär-
//              Silhouette: size [1.4, 1.8], yaw) · spinnennetz (Netz in einer Ecke: size 1.5, yaw) · standuhr (height 2.6)

import * as THREE from 'three';
import { v3, lin, mixc, smooth, colorize, merge, Rnd, addStatic, addObject, hex } from '../kit.js';
import { bakeModel } from '../w2kit.js';
import { hasModel } from '../../models/index.js';
import { visDt } from '../../entities/gimmick.js';

const C = (h) => lin(hex(h));
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const fill = (g, col) => { const c = Array.isArray(col) ? col : C(col); return colorize(ni(g), (p, n, o) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }); };
const shadeY = (g, lo, hi, a = -0.6, b = 0.8) => { const L = Array.isArray(lo) ? lo : C(lo), H = Array.isArray(hi) ? hi : C(hi); return colorize(ni(g), (p, n, o) => mixc(L, H, smooth(a, b, n.y * 0.7 - n.x * 0.25 + n.z * 0.25), o)); };
const TAU = Math.PI * 2;
const COLORS = { rot: 0xe8423a, blau: 0x3a7ae8, gruen: 0x4ac85a, gelb: 0xffc83a, lila: 0x9a5ae8, rosa: 0xff8ac8, orange: 0xff9a3a, tuerkis: 0x3ad0d8, weiss: 0xf6f2ea };
const PALETTE = [0xe8423a, 0xffc83a, 0x3a7ae8, 0x4ac85a, 0xff8ac8, 0x9a5ae8, 0xff9a3a];

/** Geometrie lokal (Blick +X) um yaw drehen und an p setzen. */
const place = (g, p, yaw = 0) => { if (yaw) g.rotateY(yaw); g.translate(p.x, p.y, p.z); return g; };

function rod(a, b, r0, r1 = r0, seg = 6) {
  const d = new THREE.Vector3(b.x - a.x, b.y - a.y, b.z - a.z);
  const L = Math.max(1e-3, d.length());
  const g = new THREE.CylinderGeometry(r1, r0, L, seg);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
}

function scatter(p, size, n, gap, rnd) {
  const [w, d] = Array.isArray(size) ? size : [size ?? 8, size ?? 8];
  const out = [];
  for (let tries = 0; tries < n * 30 && out.length < n; tries++) {
    const x = p.x + rnd.real(-w / 2, w / 2), z = p.z + rnd.real(-d / 2, d / 2);
    if (out.some((q) => Math.hypot(q[0] - x, q[1] - z) < gap)) continue;
    out.push([x, z]);
  }
  return out;
}

/** Kettenpunkte von a nach b mit Durchhang sag (Parabel), n Punkte. */
function chain(a, b, sag, n) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0.5 : i / (n - 1);
    pts.push({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u - sag * 4 * u * (1 - u), z: a.z + (b.z - a.z) * u });
  }
  return pts;
}

function wire(pts, parts, col = 0x2a2230) {
  for (let i = 1; i < pts.length; i++) parts.push(fill(rod(pts[i - 1], pts[i], 0.025, 0.025, 4), col));
}

// ------------------------------------------------------------------ Rummel

function bude(level, it, p, rnd, parts, glow) {
  const W = it.width ?? 3, D = it.depth ?? 2.2, H = it.height ?? 2.6, yaw = it.yaw ?? -Math.PI / 2;
  const col = COLORS[it.color] ?? PALETTE[rnd.int(0, PALETTE.length - 1)];
  const loc = [];
  // Theke und Rückwand (Holz), Pfosten
  loc.push(shadeY(new THREE.BoxGeometry(D * 0.5, 1.0, W).translate(D * 0.2, 0.5, 0), 0x8a5a2a, 0xd8a868));
  loc.push(shadeY(new THREE.BoxGeometry(0.12, H, W).translate(-D / 2, H / 2, 0), 0x7a4a22, 0xc8985a));
  for (const z of [-W / 2 + 0.08, W / 2 - 0.08]) loc.push(shadeY(new THREE.CylinderGeometry(0.07, 0.07, H, 6).translate(D / 2 - 0.1, H / 2, z), 0xc8c0d0, 0xffffff));
  // gestreiftes Vordach (schräg), Zacken-Saum
  const n = Math.max(4, Math.round(W / 0.45));
  for (let i = 0; i < n; i++) {
    const z0 = -W / 2 + (i * W) / n, w = W / n;
    const g = new THREE.BoxGeometry(D + 0.5, 0.08, w);
    g.rotateZ(-0.32);
    g.translate(0.15, H + 0.12, z0 + w / 2);
    loc.push(fill(g, i % 2 ? 0xfff6ee : col));
    const tri = new THREE.ConeGeometry(w * 0.5, 0.32, 3);
    tri.rotateZ(Math.PI); tri.translate(D / 2 + 0.38, H - 0.22, z0 + w / 2);
    loc.push(fill(tri, i % 2 ? col : 0xfff6ee));
  }
  // Ware auf der Theke: bunte Kugeln (Bonbons/Bälle)
  for (let i = 0; i < 5; i++) loc.push(fill(new THREE.SphereGeometry(0.13, 8, 6).translate(D * 0.2, 1.13, -W / 2 + 0.4 + i * (W - 0.8) / 4), PALETTE[(i + 2) % PALETTE.length]));
  for (const g of loc) parts.push(place(g, p, yaw));
  // Glühbirnen am Saum
  for (let i = 0; i <= n; i++) glow.push(place(fill(new THREE.SphereGeometry(0.07, 6, 4).translate(D / 2 + 0.4, H - 0.05, -W / 2 + (i * W) / n), 0xfff0a0), p, yaw));
  if (it.solid) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const hx = (Math.abs(c) * D + Math.abs(s) * W) / 2, hz = (Math.abs(s) * D + Math.abs(c) * W) / 2;
    level.world.add({ type: 'box', min: [p.x - hx, p.y, p.z - hz], max: [p.x + hx, p.y + 1.0, p.z + hz], tag: 'bude' });
  }
}

function wimpel(level, it, p, rnd, parts) {
  const a = v3(it.from ?? it.pos), b = v3(it.to ?? it.pos);
  const L = Math.hypot(b.x - a.x, b.z - a.z, b.y - a.y);
  const n = Math.max(3, Math.round(L / 0.55));
  const pts = chain(a, b, it.sag ?? 0.6, n + 1);
  wire(pts, parts);
  const dir = new THREE.Vector3(b.x - a.x, 0, b.z - a.z).normalize();
  const yaw = Math.atan2(-dir.z, dir.x);
  for (let i = 0; i < n; i++) {
    const q = { x: (pts[i].x + pts[i + 1].x) / 2, y: (pts[i].y + pts[i + 1].y) / 2, z: (pts[i].z + pts[i + 1].z) / 2 };
    const t = new THREE.BufferGeometry();
    t.setAttribute('position', new THREE.Float32BufferAttribute([-0.2, 0, 0, 0.2, 0, 0, 0, -0.42, 0, 0.2, 0, 0, -0.2, 0, 0, 0, -0.42, 0], 3));
    t.computeVertexNormals();
    t.rotateY(yaw);
    t.translate(q.x, q.y, q.z);
    parts.push(fill(t, PALETTE[i % PALETTE.length]));
  }
}

function gluehbirnen(level, it, p, rnd, parts, glow) {
  const a = v3(it.from ?? it.pos), b = v3(it.to ?? it.pos);
  const L = Math.hypot(b.x - a.x, b.z - a.z, b.y - a.y);
  const n = Math.max(3, Math.round(L / 0.6));
  const pts = chain(a, b, it.sag ?? 0.5, n + 1);
  wire(pts, parts);
  const warm = it.color ? [COLORS[it.color] ?? 0xfff0a0] : [0xfff0a0, 0xffd0a0, 0xfff8d0];
  for (let i = 0; i <= n; i++) glow.push(fill(new THREE.SphereGeometry(0.085, 6, 4).translate(pts[i].x, pts[i].y - 0.1, pts[i].z), warm[i % warm.length]));
}

function lampions(level, it, p, rnd, parts, glow) {
  const a = v3(it.from ?? it.pos), b = v3(it.to ?? it.pos);
  const L = Math.hypot(b.x - a.x, b.z - a.z, b.y - a.y);
  const n = Math.max(2, Math.round(L / 1.2));
  const pts = chain(a, b, it.sag ?? 0.7, n + 1);
  wire(pts, parts);
  const cols = [0xff6a5a, 0xffc04a, 0xff8ac8, 0x8ad8ff, 0xb88aff, 0x9af07a];
  for (let i = 1; i < n; i++) {
    const q = pts[i];
    const s = new THREE.SphereGeometry(0.28, 10, 8);
    s.scale(1, 1.15, 1);
    s.translate(q.x, q.y - 0.45, q.z);
    const c = C(cols[(i + rnd.int(0, 5)) % cols.length]);
    // Papierfalten: Ringe etwas dunkler, unten wärmer (Kerzenschein)
    glow.push(colorize(ni(s), (pp, nn, o) => { const k = 0.8 + 0.2 * Math.cos((pp.y - q.y + 0.45) * 26); o[0] = c[0] * k; o[1] = c[1] * k; o[2] = c[2] * k; }));
    for (const dy of [-0.13, -0.79]) parts.push(fill(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 8).translate(q.x, q.y + dy, q.z), 0x2a2230));
  }
}

function mast(level, it, p, rnd, parts, glow) {
  const H = it.height ?? 4;
  parts.push(shadeY(new THREE.CylinderGeometry(0.08, 0.12, H, 7).translate(p.x, p.y + H / 2, p.z), 0x3a2a4a, 0x8a6aa8));
  parts.push(shadeY(new THREE.CylinderGeometry(0.3, 0.36, 0.2, 10).translate(p.x, p.y + 0.1, p.z), 0x3a2a4a, 0x8a6aa8));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    parts.push(fill(rod({ x: p.x, y: p.y + H, z: p.z }, { x: p.x + Math.cos(a) * 0.5, y: p.y + H - 0.25, z: p.z + Math.sin(a) * 0.5 }, 0.03), 0x3a2a4a));
    glow.push(fill(new THREE.SphereGeometry(0.11, 6, 4).translate(p.x + Math.cos(a) * 0.5, p.y + H - 0.34, p.z + Math.sin(a) * 0.5), 0xfff0a0));
  }
  glow.push(fill(new THREE.SphereGeometry(0.16, 8, 6).translate(p.x, p.y + H + 0.12, p.z), 0xff8ac8));
  if (it.solid) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.2, y0: p.y, y1: p.y + H, tag: 'mast' });
}

function ballons(level, it, p, rnd, parts) {
  const n = it.n ?? 5, H = it.height ?? 3;
  const top = { x: p.x, y: p.y + H * 0.6, z: p.z };
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rnd.real(0, 0.5), r = 0.35 + rnd.real(0, 0.3);
    const q = { x: p.x + Math.cos(a) * r, y: p.y + H + rnd.real(-0.3, 0.4), z: p.z + Math.sin(a) * r };
    parts.push(fill(rod(top, q, 0.012, 0.012, 3), 0xf6f2ea));
    const b = new THREE.SphereGeometry(0.32, 10, 8);
    b.scale(1, 1.2, 1);
    b.translate(q.x, q.y + 0.36, q.z);
    const c = C(PALETTE[(i + rnd.int(0, 6)) % PALETTE.length]);
    parts.push(colorize(ni(b), (pp, nn, o) => mixc(c, [1, 1, 1], smooth(0.5, 1, nn.y * 0.6 + nn.z * 0.5) * 0.45, o)));
  }
  parts.push(fill(rod(p, top, 0.012, 0.012, 3), 0xf6f2ea));
  parts.push(shadeY(new THREE.BoxGeometry(0.25, 0.25, 0.25).translate(p.x, p.y + 0.125, p.z), 0x8a5a2a, 0xd8a868));
}

function achterbahn(level, it, p, rnd, parts) {
  const a = v3(it.from ?? it.pos), b = v3(it.to ?? it.pos);
  const hump = it.hump ?? 3, ground = it.ground ?? Math.min(a.y, b.y) - 6;
  const L = Math.hypot(b.x - a.x, b.z - a.z);
  const n = Math.max(6, Math.round(L / 0.8));
  const dx = (b.x - a.x) / (L || 1), dz = (b.z - a.z) / (L || 1);
  const ox = -dz * 0.55, oz = dx * 0.55;
  const pts = [];
  for (let i = 0; i <= n; i++) { const u = i / n; pts.push({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u + hump * Math.sin(Math.PI * u), z: a.z + (b.z - a.z) * u }); }
  for (let i = 1; i <= n; i++) {
    for (const s of [-1, 1]) parts.push(fill(rod({ x: pts[i - 1].x + ox * s, y: pts[i - 1].y, z: pts[i - 1].z + oz * s }, { x: pts[i].x + ox * s, y: pts[i].y, z: pts[i].z + oz * s }, 0.06, 0.06, 5), 0xe8423a));
    parts.push(fill(rod({ x: pts[i].x - ox * 1.1, y: pts[i].y - 0.08, z: pts[i].z - oz * 1.1 }, { x: pts[i].x + ox * 1.1, y: pts[i].y - 0.08, z: pts[i].z + oz * 1.1 }, 0.05, 0.05, 4), 0x8a5a2a));
    if (i % 3 === 0) {
      parts.push(fill(rod({ x: pts[i].x, y: pts[i].y - 0.1, z: pts[i].z }, { x: pts[i].x, y: ground, z: pts[i].z }, 0.09, 0.12, 6), 0xf6f2ea));
      parts.push(fill(rod({ x: pts[i].x - ox * 1.5, y: ground, z: pts[i].z - oz * 1.5 }, { x: pts[i].x, y: pts[i].y - 1, z: pts[i].z }, 0.05, 0.05, 4), 0xd8d0e0));
    }
  }
}

function torbogen(level, it, p, rnd, parts, glow) {
  const W = it.width ?? 6, H = it.height ?? 5, yaw = it.yaw ?? 0;
  const loc = [], lg = [];
  for (const z of [-W / 2, W / 2]) {
    loc.push(shadeY(new THREE.CylinderGeometry(0.3, 0.38, H, 10).translate(0, H / 2, z), 0x6a3a8a, 0xb87ae8));
    loc.push(fill(new THREE.SphereGeometry(0.42, 10, 8).translate(0, H + 0.2, z), 0xffc83a));
  }
  const arch = new THREE.TorusGeometry(W / 2, 0.22, 8, 28, Math.PI);
  arch.rotateY(Math.PI / 2);
  arch.translate(0, H, 0);
  loc.push(shadeY(arch, 0xc83a6a, 0xff8ab8));
  for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI; lg.push(fill(new THREE.SphereGeometry(0.1, 6, 4).translate(0.22, H + Math.sin(a) * (W / 2 + 0.25), Math.cos(a) * (W / 2 + 0.25)), i % 2 ? 0xfff0a0 : 0xff8ac8)); }
  const sh = new THREE.Shape();
  for (let k = 0; k < 10; k++) { const a = Math.PI / 2 + (k / 10) * TAU, r = k % 2 ? 0.35 : 0.8; if (k) sh.lineTo(Math.cos(a) * r, Math.sin(a) * r); else sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  const star = new THREE.ExtrudeGeometry(sh, { depth: 0.15, bevelEnabled: false });
  star.rotateY(Math.PI / 2); star.translate(0, H + W / 2 + 0.6, 0);
  lg.push(fill(star, 0xffe07a));
  for (const g of loc) parts.push(place(g, p, yaw));
  for (const g of lg) glow.push(place(g, p, yaw));
  if (it.solid !== false) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    for (const z of [-W / 2, W / 2]) level.world.add({ type: 'cyl', x: p.x + s * z, z: p.z + c * z, r: 0.38, y0: p.y, y1: p.y + H, tag: 'torbogen' });
  }
}

function picknick(level, it, p, rnd, parts, glow) {
  const S = it.size ?? 3, yaw = it.yaw ?? 0;
  const loc = [], lg = [];
  // karierte Decke
  const n = 8, cell = S / n;
  for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) {
    const g = new THREE.BoxGeometry(cell, 0.03, cell).translate(-S / 2 + (i + 0.5) * cell, 0.015, -S / 2 + (k + 0.5) * cell);
    loc.push(fill(g, (i + k) % 2 ? 0xf6f2ea : 0xe8423a));
  }
  // Korb
  loc.push(shadeY(new THREE.BoxGeometry(0.7, 0.45, 0.5).translate(-S * 0.3, 0.25, -S * 0.25), 0x8a5a2a, 0xd8a868));
  const handle = new THREE.TorusGeometry(0.3, 0.03, 4, 12, Math.PI); handle.translate(-S * 0.3, 0.47, -S * 0.25);
  loc.push(fill(handle, 0x8a5a2a));
  // Torte mit Kerzen
  loc.push(shadeY(new THREE.CylinderGeometry(0.42, 0.45, 0.32, 18).translate(0, 0.19, 0), 0xff9ac8, 0xfff0f6));
  loc.push(shadeY(new THREE.CylinderGeometry(0.3, 0.32, 0.22, 16).translate(0, 0.46, 0), 0xfff6ee, 0xffffff));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    loc.push(fill(new THREE.CylinderGeometry(0.025, 0.025, 0.18, 4).translate(Math.cos(a) * 0.18, 0.66, Math.sin(a) * 0.18), PALETTE[i]));
    lg.push(fill(new THREE.SphereGeometry(0.035, 5, 4).translate(Math.cos(a) * 0.18, 0.78, Math.sin(a) * 0.18), 0xffd060));
  }
  // Becher, Teller, Früchte
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + 0.4, r = S * 0.32;
    loc.push(fill(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 12).translate(Math.cos(a) * r, 0.045, Math.sin(a) * r), 0xffffff));
    loc.push(shadeY(new THREE.CylinderGeometry(0.07, 0.06, 0.16, 8).translate(Math.cos(a) * r + 0.15, 0.11, Math.sin(a) * r + 0.12), PALETTE[(i + 3) % 7], 0xffffff));
    loc.push(fill(new THREE.SphereGeometry(0.06, 6, 4).translate(Math.cos(a) * r - 0.05, 0.1, Math.sin(a) * r), i % 2 ? 0xe8423a : 0x8ad04a));
  }
  for (const g of loc) parts.push(place(g, p, yaw));
  for (const g of lg) glow.push(place(g, p, yaw));
}

// ------------------------------------------------------------------ Regenfestung

function wasserspeier(level, it, p, rnd, parts) {
  const yaw = it.yaw ?? -Math.PI / 2, H = it.height ?? 3;
  const loc = [];
  // Bärenkopf aus Stein mit Maul
  loc.push(shadeY(new THREE.SphereGeometry(0.42, 10, 8).scale(1, 0.9, 1).translate(0.3, H, 0), 0x4a4652, 0x9a96a4));
  for (const z of [-0.3, 0.3]) loc.push(shadeY(new THREE.SphereGeometry(0.14, 6, 5).translate(0.15, H + 0.38, z), 0x4a4652, 0x9a96a4));
  loc.push(shadeY(new THREE.BoxGeometry(0.5, 0.18, 0.3).translate(0.62, H - 0.12, 0), 0x4a4652, 0x9a96a4));
  // Wasserstrahl (Bogen) bis zum Boden
  const pts = [];
  for (let i = 0; i <= 8; i++) { const u = i / 8; pts.push({ x: 0.85 + u * 0.9, y: H - 0.15 - u * u * (H + 0.1), z: 0 }); }
  for (let i = 1; i < pts.length; i++) loc.push(fill(rod(pts[i - 1], pts[i], 0.09 + i * 0.01, 0.1 + i * 0.01, 6), 0x9ad8ff));
  loc.push(fill(new THREE.CylinderGeometry(0.5, 0.6, 0.06, 12).translate(1.75, 0.03, 0), 0xc8f0ff));
  for (const g of loc) parts.push(place(g, p, yaw));
}

function pfuetze(level, it, p, rnd, parts) {
  const [w, d] = it.size ?? [2, 1.4];
  const g = new THREE.CircleGeometry(0.5, 18);
  g.rotateX(-Math.PI / 2); g.scale(w, 1, d); g.translate(p.x, p.y + 0.02, p.z);
  parts.push(colorize(ni(g), (q, n, o) => mixc(C(0x2a4a6a), C(0x8ab8e8), smooth(0.5, 0, Math.hypot((q.x - p.x) / w, (q.z - p.z) / d)) * 0.6, o)));
}

function regentonne(level, it, p, rnd, parts) {
  const H = it.height ?? 1.2;
  parts.push(shadeY(new THREE.CylinderGeometry(0.5, 0.45, H, 12).translate(p.x, p.y + H / 2, p.z), 0x6a4422, 0xb8844a));
  for (const y of [0.2, H - 0.2]) parts.push(fill(new THREE.TorusGeometry(0.5, 0.03, 4, 16).rotateX(Math.PI / 2).translate(p.x, p.y + y, p.z), 0x3a3440));
  parts.push(fill(new THREE.CircleGeometry(0.45, 14).rotateX(-Math.PI / 2).translate(p.x, p.y + H - 0.08, p.z), 0x4a7ab8));
  if (it.solid) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.5, y0: p.y, y1: p.y + H, tag: 'regentonne' });
}

// ------------------------------------------------------------------ Keksfabrik

const DOUGH = 0xd89a52, DOUGH_HI = 0xf0c27a, CHIP = 0x4a2412;

function cookieDisc(x, y, z, r, th, parts, icing) {
  parts.push(colorize(ni(new THREE.CylinderGeometry(r, r * 0.96, th, 20).translate(x, y + th / 2, z)), (q, n, o) => mixc(C(0x9a5a2a), n.y > 0.5 ? C(DOUGH_HI) : C(DOUGH), 0.7, o)));
  for (let i = 0; i < Math.round(r * r * 4); i++) {
    const a = i * 2.4, rr = Math.sqrt((i + 0.5) / Math.max(1, r * r * 4)) * r * 0.8;
    parts.push(fill(new THREE.SphereGeometry(0.06 + r * 0.03, 5, 3, 0, TAU, 0, Math.PI / 2).translate(x + Math.cos(a) * rr, y + th - 0.01, z + Math.sin(a) * rr), CHIP));
  }
  if (icing) parts.push(fill(new THREE.TorusGeometry(r * 0.7, Math.min(0.06, th * 0.3), 4, 20).rotateX(Math.PI / 2).translate(x, y + th + 0.01, z), icing));
}

function keksstapel(level, it, p, rnd, parts) {
  const n = it.n ?? 4, R = it.radius ?? 1;
  let y = p.y;
  for (let i = 0; i < n; i++) {
    const r = R * (1 - i * 0.06), th = R * 0.28;
    cookieDisc(p.x + rnd.real(-0.08, 0.08), y, p.z + rnd.real(-0.08, 0.08), r, th, parts, i === n - 1 ? 0xff9ac8 : null);
    y += th;
  }
  if (it.solid) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: R, y0: p.y, y1: y, tag: 'keksstapel' });
}

function ruehrschuessel(level, it, p, rnd, parts) {
  const S = it.size ?? 1.6;
  const prof = [];
  for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI / 2; prof.push(new THREE.Vector2(Math.sin(a) * S * 0.5 + 0.02, (1 - Math.cos(a)) * S * 0.45)); }
  const bowl = new THREE.LatheGeometry(prof, 20);
  parts.push(shadeY(bowl.translate(p.x, p.y, p.z), 0x5a8ac8, 0xc8e0ff));
  parts.push(fill(new THREE.CircleGeometry(S * 0.45, 18).rotateX(-Math.PI / 2).translate(p.x, p.y + S * 0.36, p.z), DOUGH_HI));
  parts.push(fill(rod({ x: p.x + S * 0.1, y: p.y + S * 0.3, z: p.z }, { x: p.x + S * 0.45, y: p.y + S * 0.95, z: p.z + S * 0.15 }, 0.05, 0.04), 0xc8985a));
  if (it.solid) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: S * 0.5, y0: p.y, y1: p.y + S * 0.45, tag: 'schuessel' });
}

function backofen(level, it, p, rnd, parts, glow) {
  const W = it.width ?? 3, H = it.height ?? 2.6, yaw = it.yaw ?? -Math.PI / 2;
  const loc = [], lg = [];
  loc.push(shadeY(new THREE.BoxGeometry(1.8, H, W).translate(0, H / 2, 0), 0x8a3a2a, 0xd86a4a));
  loc.push(shadeY(new THREE.CylinderGeometry(W * 0.5, W * 0.5, 1.8, 16, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(Math.PI / 2).translate(0, H, 0), 0x8a3a2a, 0xd86a4a));
  loc.push(fill(new THREE.BoxGeometry(0.06, H * 0.08, W * 0.8).translate(0.92, H * 0.78, 0), 0x3a2a2a));
  lg.push(fill(new THREE.PlaneGeometry(W * 0.6, H * 0.36).rotateY(Math.PI / 2).translate(0.91, H * 0.42, 0), 0xffa040));
  loc.push(shadeY(new THREE.CylinderGeometry(0.25, 0.3, 1.6, 8).translate(-0.4, H + W * 0.5 + 0.5, W * 0.25), 0x6a6a72, 0xb8b8c8));
  for (const g of loc) parts.push(place(g, p, yaw));
  for (const g of lg) glow.push(place(g, p, yaw));
  if (it.solid) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const hx = (Math.abs(c) * 1.8 + Math.abs(s) * W) / 2, hz = (Math.abs(s) * 1.8 + Math.abs(c) * W) / 2;
    level.world.add({ type: 'box', min: [p.x - hx, p.y, p.z - hz], max: [p.x + hx, p.y + H, p.z + hz], tag: 'backofen' });
  }
}

function spritzbeutel(level, it, p, rnd, parts) {
  const H = it.height ?? 3;
  parts.push(shadeY(new THREE.ConeGeometry(0.6, 1.6, 12).rotateX(Math.PI).translate(p.x, p.y + H + 0.8, p.z), 0xe8e0f0, 0xffffff));
  parts.push(fill(new THREE.ConeGeometry(0.14, 0.4, 8).rotateX(Math.PI).translate(p.x, p.y + H - 0.2, p.z), 0xc0c0d0));
  for (let i = 0; i < 3; i++) parts.push(fill(new THREE.SphereGeometry(0.12 - i * 0.02, 6, 5).scale(1, 1.4, 1).translate(p.x, p.y + H - 0.55 - i * 0.5, p.z), 0xff9ac8));
  parts.push(fill(new THREE.SphereGeometry(0.4, 10, 6, 0, TAU, 0, Math.PI / 2).scale(1, 0.4, 1).translate(p.x, p.y, p.z), 0xff9ac8));
}

function kruemel(level, it, p, rnd, parts) {
  for (const [x, z] of scatter(p, it.size ?? [6, 6], it.n ?? 10, 0.4, rnd)) {
    const g = new THREE.DodecahedronGeometry(rnd.real(0.1, 0.25), 0);
    g.rotateX(rnd.real(0, 3)); g.rotateY(rnd.real(0, 3));
    parts.push(shadeY(g.translate(x, p.y + 0.08, z), DOUGH, DOUGH_HI));
  }
}

// ------------------------------------------------------------------ Unterwasserfestung

function saeule(level, it, p, rnd, parts) {
  const H = it.height ?? 4;
  parts.push(shadeY(new THREE.CylinderGeometry(0.5, 0.55, H, 12, 3).translate(p.x, p.y + H / 2, p.z), 0x4a6a7a, 0xa8c8c8));
  parts.push(shadeY(new THREE.BoxGeometry(1.3, 0.3, 1.3).translate(p.x, p.y + 0.15, p.z), 0x3a5a6a, 0x8aa8a8));
  // abgebrochene Kante oben (schräger Keil)
  const top = new THREE.CylinderGeometry(0.5, 0.5, 0.6, 12); top.translate(0, 0.3, 0); top.rotateZ(0.5); top.translate(p.x + 0.15, p.y + H - 0.1, p.z);
  parts.push(shadeY(top, 0x4a6a7a, 0xa8c8c8));
  for (let i = 0; i < 4; i++) parts.push(fill(new THREE.SphereGeometry(0.12, 5, 4).translate(p.x + Math.cos(i * 1.7) * 0.5, p.y + 0.5 + i * 0.7, p.z + Math.sin(i * 1.7) * 0.5), 0x4a9a5a));
  if (it.solid) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.55, y0: p.y, y1: p.y + H, tag: 'saeule' });
}

function muscheln(level, it, p, rnd, parts) {
  for (const [x, z] of scatter(p, it.size ?? [6, 6], it.n ?? 8, 0.6, rnd)) {
    const g = new THREE.SphereGeometry(rnd.real(0.12, 0.22), 8, 4, 0, TAU, 0, Math.PI / 2);
    g.scale(1, 0.5, 1.2); g.rotateY(rnd.real(0, TAU));
    parts.push(shadeY(g.translate(x, p.y, z), [0xff8ab8, 0xffd08a, 0xf6f2ea][rnd.int(0, 2)], 0xffffff));
  }
}

function anker(level, it, p, rnd, parts) {
  const S = it.size ?? 2, yaw = it.yaw ?? 0.4;
  const loc = [];
  loc.push(fill(new THREE.BoxGeometry(0.16, S, 0.16).translate(0, S / 2, 0), 0x4a4a58));
  loc.push(fill(new THREE.TorusGeometry(0.22, 0.05, 6, 12).translate(0, S + 0.2, 0), 0x4a4a58));
  loc.push(fill(new THREE.TorusGeometry(S * 0.45, 0.08, 6, 16, Math.PI).rotateZ(Math.PI).translate(0, S * 0.45, 0), 0x4a4a58));
  for (const s of [-1, 1]) loc.push(fill(new THREE.ConeGeometry(0.14, 0.35, 4).rotateZ(s * 0.6).translate(s * S * 0.45, S * 0.5, 0), 0x4a4a58));
  for (const g of loc) parts.push(place(g, p, yaw));
}

function gitterfenster(level, it, p, rnd, parts, glow) {
  const [w, h] = it.size ?? [1.4, 2], yaw = it.yaw ?? -Math.PI / 2;
  const loc = [], lg = [];
  lg.push(fill(new THREE.PlaneGeometry(w, h).rotateY(Math.PI / 2).translate(0.02, h / 2, 0), it.color ? COLORS[it.color] ?? 0x5ae0ff : 0x5ae0ff));
  for (let i = 0; i < 4; i++) loc.push(fill(new THREE.BoxGeometry(0.08, h, 0.07).translate(0.06, h / 2, -w / 2 + (i + 0.5) * (w / 4)), 0x2a2a34));
  loc.push(fill(new THREE.BoxGeometry(0.1, 0.08, w).translate(0.06, h * 0.55, 0), 0x2a2a34));
  for (const g of loc) parts.push(place(g, p, yaw));
  for (const g of lg) glow.push(place(g, p, yaw));
}

// ------------------------------------------------------------------ Spukhaus

function kerzenleuchter(level, it, p, rnd, parts, glow) {
  const H = it.height ?? 1.6;
  parts.push(shadeY(new THREE.CylinderGeometry(0.05, 0.08, H, 6).translate(p.x, p.y + H / 2, p.z), 0x8a6a2a, 0xffd23a));
  parts.push(shadeY(new THREE.CylinderGeometry(0.3, 0.35, 0.08, 10).translate(p.x, p.y + 0.04, p.z), 0x8a6a2a, 0xffd23a));
  for (const dx of [-0.35, 0, 0.35]) {
    const y = p.y + H + (dx ? -0.15 : 0.05);
    if (dx) parts.push(fill(rod({ x: p.x, y: p.y + H - 0.3, z: p.z }, { x: p.x + dx, y: y - 0.05, z: p.z }, 0.03), 0xc8a040));
    parts.push(fill(new THREE.CylinderGeometry(0.05, 0.05, 0.25, 6).translate(p.x + dx, y + 0.12, p.z), 0xfff6e0));
    glow.push(fill(new THREE.ConeGeometry(0.05, 0.16, 6).translate(p.x + dx, y + 0.33, p.z), 0xffc040));
  }
  level.view?.addLantern?.(p.x, p.y + H + 0.4, p.z);
}

function bilderrahmen(level, it, p, rnd, parts) {
  const [w, h] = it.size ?? [1.4, 1.8], yaw = it.yaw ?? -Math.PI / 2;
  const loc = [];
  loc.push(fill(new THREE.BoxGeometry(0.08, h + 0.24, w + 0.24).translate(0.04, h / 2, 0), 0xc8983a));
  loc.push(fill(new THREE.PlaneGeometry(w, h).rotateY(Math.PI / 2).translate(0.09, h / 2, 0), 0x3a2a4a));
  // Brummbär-Silhouette: Kopf, Ohren, Zylinder
  loc.push(fill(new THREE.CircleGeometry(w * 0.22, 14).rotateY(Math.PI / 2).translate(0.1, h * 0.48, 0), 0x6a4a3a));
  for (const s of [-1, 1]) loc.push(fill(new THREE.CircleGeometry(w * 0.08, 8).rotateY(Math.PI / 2).translate(0.1, h * 0.62, s * w * 0.17), 0x6a4a3a));
  loc.push(fill(new THREE.PlaneGeometry(w * 0.26, h * 0.16).rotateY(Math.PI / 2).translate(0.11, h * 0.72, 0), 0x1a1418));
  loc.push(fill(new THREE.PlaneGeometry(w * 0.6, h * 0.25).rotateY(Math.PI / 2).translate(0.1, h * 0.14, 0), 0x6a2a3a));
  for (const g of loc) parts.push(place(g, p, yaw));
}

function spinnennetz(level, it, p, rnd, parts) {
  const S = it.size ?? 1.5, yaw = it.yaw ?? 0;
  const loc = [];
  for (let i = 0; i < 6; i++) { const a = (i / 5) * Math.PI / 2; loc.push(fill(rod({ x: 0, y: 0, z: 0 }, { x: 0, y: -Math.sin(a) * S, z: Math.cos(a) * S }, 0.012, 0.012, 3), 0xe8e8f0)); }
  for (let r = 1; r <= 4; r++) {
    const rr = (r / 4) * S * 0.95;
    for (let i = 0; i < 5; i++) {
      const a0 = (i / 5) * Math.PI / 2, a1 = ((i + 1) / 5) * Math.PI / 2;
      loc.push(fill(rod({ x: 0, y: -Math.sin(a0) * rr, z: Math.cos(a0) * rr }, { x: 0, y: -Math.sin(a1) * rr * 0.92, z: Math.cos(a1) * rr * 0.92 }, 0.01, 0.01, 3), 0xd8d8e8));
    }
  }
  for (const g of loc) parts.push(place(g, p, yaw));
}

function standuhr(level, it, p, rnd, parts, glow) {
  const H = it.height ?? 2.6, yaw = it.yaw ?? -Math.PI / 2;
  const loc = [], lg = [];
  loc.push(shadeY(new THREE.BoxGeometry(0.5, H, 0.7).translate(0, H / 2, 0), 0x4a2a1a, 0x8a5a3a));
  loc.push(shadeY(new THREE.ConeGeometry(0.5, 0.4, 4).rotateY(Math.PI / 4).translate(0, H + 0.2, 0), 0x4a2a1a, 0x8a5a3a));
  lg.push(fill(new THREE.CircleGeometry(0.26, 16).rotateY(Math.PI / 2).translate(0.26, H - 0.45, 0), 0xfff0c0));
  loc.push(fill(new THREE.BoxGeometry(0.02, 0.2, 0.03).translate(0.28, H - 0.38, 0), 0x1a1418));
  loc.push(fill(new THREE.CircleGeometry(0.12, 10).rotateY(Math.PI / 2).translate(0.26, H * 0.35, 0), 0xffd23a));
  for (const g of loc) parts.push(place(g, p, yaw));
  for (const g of lg) glow.push(place(g, p, yaw));
  if (it.solid) level.world.add({ type: 'box', min: [p.x - 0.35, p.y, p.z - 0.35], max: [p.x + 0.35, p.y + H, p.z + 0.35], tag: 'standuhr' });
}

// ------------------------------------------------------------------ Karussell (bewegt)

function karussell(level, it, p) {
  const R = it.radius ?? 3, H = it.height ?? 3.6, speed = it.speed ?? 0.6;
  if (it.solid !== false) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: R, y0: p.y, y1: p.y + 0.35, tag: 'karussell' });
  if (!level.view) return;
  const base = [], spin = [], glowS = [];
  base.push(shadeY(new THREE.CylinderGeometry(R, R * 1.04, 0.35, 28).translate(0, 0.175, 0), 0x8a3a6a, 0xffd0e8));
  spin.push(shadeY(new THREE.CylinderGeometry(0.22, 0.22, H, 10).translate(0, H / 2, 0), 0xc8a040, 0xfff0a0));
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const g = new THREE.ConeGeometry(R * 1.12, 1.2, n, 1, true, a, TAU / n);
    g.translate(0, H + 0.6, 0);
    spin.push(fill(g, i % 2 ? 0xfff6ee : 0xe8423a));
    glowS.push(fill(new THREE.SphereGeometry(0.09, 6, 4).translate(Math.cos(a) * R * 1.1, H - 0.02, Math.sin(a) * R * 1.1), i % 2 ? 0xfff0a0 : 0xff8ac8));
  }
  spin.push(fill(new THREE.SphereGeometry(0.3, 10, 8).translate(0, H + 1.3, 0), 0xffc83a));
  // Pferdchen auf Stangen
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU, x = Math.cos(a) * R * 0.75, z = Math.sin(a) * R * 0.75, y = 1 + (i % 2) * 0.35;
    spin.push(fill(new THREE.CylinderGeometry(0.04, 0.04, H - 0.35, 5).translate(x, 0.35 + (H - 0.35) / 2, z), 0xfff0a0));
    const col = PALETTE[i % PALETTE.length];
    const body = new THREE.CapsuleGeometry(0.2, 0.55, 4, 8); body.rotateZ(Math.PI / 2); body.rotateY(-a + Math.PI / 2); body.translate(x, y, z);
    spin.push(shadeY(body, col, 0xffffff));
    const head = new THREE.CapsuleGeometry(0.12, 0.25, 3, 6); head.rotateZ(-0.6); head.rotateY(-a + Math.PI / 2); head.translate(x + Math.cos(a + Math.PI / 2) * 0.35, y + 0.28, z + Math.sin(a + Math.PI / 2) * -0.35 * -1);
    spin.push(shadeY(head, col, 0xffffff));
  }
  const root = new THREE.Group();
  root.position.set(p.x, p.y, p.z);
  const b = new THREE.Mesh(merge(base), level.view.mats.world); b.receiveShadow = true;
  const rot = new THREE.Group();
  const s = new THREE.Mesh(merge(spin), level.view.mats.world); s.castShadow = true;
  const gl = new THREE.Mesh(merge(glowS), level.view.mats.glow);
  rot.add(s, gl);
  root.add(b, rot);
  const holder = {};
  addObject(level, root, (dt) => { rot.rotation.y += speed * visDt(level, holder, dt); });
}

// ------------------------------------------------------------------ Registry, Aufbau

const SINGLE = {
  bude, wimpel, gluehbirnen, lampions, lampionkette: lampions, mast, ballons, achterbahn, torbogen, picknick,
  wasserspeier, pfuetze, regentonne, keksstapel, ruehrschuessel, backofen, spritzbeutel, kruemel,
  saeule, muscheln, anker, gitterfenster, kerzenleuchter, bilderrahmen, spinnennetz, standuhr,
};
const SOLID_REG = new Set(['bude', 'mast', 'torbogen', 'regentonne', 'keksstapel', 'ruehrschuessel', 'backofen', 'saeule', 'standuhr']);

/** Registry-Modell deco_w8_<kind> backen → true; Kollision über die eigene Geometrie (gebaut und verworfen). */
function placeReg(level, it, p) {
  if (it.look === 'eigen' || !hasModel(`deco_w8_${it.kind}`)) return false;
  const { pos, kind, type, items, ...opts } = it;
  if (level.view) bakeModel(level, `deco_w8_${kind}`, opts, p.x, p.y, p.z, it.yaw ?? -Math.PI / 2, it.scale ?? 1, {}, { castShadow: it.shadow !== false });
  if ((it.solid || kind === 'torbogen') && SOLID_REG.has(kind)) {
    const dump = [], dg = [];
    SINGLE[kind]?.({ world: level.world, view: null }, { ...it, solid: it.solid ?? true }, p, new Rnd(1), dump, dg);
    for (const g of [...dump, ...dg]) g.dispose();
  }
  return true;
}

export function buildDecoW8(level, spec) {
  const items = spec.items ?? [spec];
  const parts = { shadow: [], flat: [] };
  const glow = [];
  for (const it0 of items) {
    const it = spec.items && spec.shadow === false && it0.shadow === undefined ? { ...it0, shadow: false } : it0;
    const p = v3(it.pos ?? it.from);
    const rnd = new Rnd((it.seed ?? Math.floor(p.x * 73 + p.z * 37 + p.y * 11)) >>> 0);
    const P = it.shadow === false ? parts.flat : parts.shadow;
    if (it.kind === 'karussell') { if (!placeReg(level, it, p)) karussell(level, it, p); continue; }
    if (placeReg(level, it, p)) continue;
    const fn = SINGLE[it.kind];
    if (fn) fn(level, it, p, rnd, P, glow);
    else console.warn(`[deco_w8] unbekannte Art ${it.kind}`);
  }
  if (!level.view) { for (const g of [...parts.shadow, ...parts.flat, ...glow]) g.dispose(); return; }
  if (parts.shadow.length) addStatic(level, merge(parts.shadow));
  if (parts.flat.length) addStatic(level, merge(parts.flat), { castShadow: false });
  if (glow.length) addStatic(level, merge(glow), { material: 'glow', castShadow: false });
}

export const TYPES = { deco_w8: buildDecoW8 };
