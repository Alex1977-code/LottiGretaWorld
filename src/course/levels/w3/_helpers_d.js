// Gemeinsame Hilfen der Welt-3-Level 3-5 „Leuchtturmriff“ (Lagune) und 3-7 „Ahornklamm“ (Herbstwald mit Schalttafeln).
// Kein Level (exportiert kein LEVEL – die Level-Registry überspringt das Modul). Neben Daten-Helfern liegt hier die
// level-lokale Zier und Mechanik, die es als Baustein nicht gibt:
//
//   Lagune   seaFill (Meer zwischen den Becken bis zum Horizont), Leuchtturm mit kreisendem Lichtstrahl, Strandkörbe,
//            Sonnenschirme, Sandburgen, Muscheln/Seesterne, Rettungsringe, Krabben, Möwen, Fischschwärme (Zier),
//            Wandlöcher der Stachelwand, flutKammer (steigender Wasserspiegel am Ende des Tauchbereichs)
//   Herbst   Laubhaufen (Stampfen/Hineinrennen/Angriff → Blätterwirbel und Münzen), Kürbisse, Fliegenpilze,
//            Eichhörnchen (hüpfen, schauen), Wasserfall (durchscheinend, fließend, mit Gischt), Teich tief unten
//   beide    zeitUhren (Zeit-Uhren: Einsammeln → +10 s), levelSetup/isl/line/ring/arc (aus Welt 2)
//
// Kosten: alles Statische wird verschmolzen (view.addStatic → Abschnitts-Meshes); animierte Zier liegt in wenigen
// Instanz-Gruppen (Fische, Möwen, Laubhaufen, Uhren je 1 Zeichenaufruf) bzw. ist ein Mesh (Krabbe, Eichhörnchen).

import * as THREE from 'three';
import { box, colorize, merge, lin, mixc, smooth, hex, addStatic, addObject, themeOf } from '../../blocks/kit.js';
import { visDt, runAction } from '../../entities/gimmick.js';
import { CourseEntity } from '../../entities/CourseEntity.js';
import { banner } from '../../blocks/w3kit.js';

export { isl, line, ring, arc, levelSetup, cyl, sphere, cone, block } from '../w2/_helpers_c.js';
export { farHide, cullStatic } from '../w2/_helpers_a.js';
export { instanceEnemies } from './_helpers_a.js';

const L = (c) => lin(hex(c));
const TAU = Math.PI * 2;

/** Verschmelzen mit einheitlichen Attributen (position, normal, color; nicht indiziert). */
function mrg(parts) {
  const list = [];
  for (let g of parts) {
    if (!g) continue;
    if (g.index) g = g.toNonIndexed();
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'color') g.deleteAttribute(name);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.color) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3));
    list.push(g);
  }
  return merge(list);
}

/** Einfarbig mit Licht von oben (oben heller, unten dunkler). */
function litFn(c, k = 0.72) {
  const M = L(c), T = [M[0] * 1.12, M[1] * 1.12, M[2] * 1.12], D = [M[0] * k, M[1] * k, M[2] * k];
  return (p, n, o) => (n.y >= 0 ? mixc(M, T, smooth(0, 0.9, n.y), o) : mixc(M, D, smooth(0, -0.9, n.y), o));
}

/** Geometrie lokal einfärben (fn sieht lokale Koordinaten), dann drehen/verschieben. */
function place(g, fn, x, y, z, yaw = 0) {
  if (g.index) g = g.toNonIndexed();
  const c = colorize(g, fn);
  if (yaw) c.rotateY(yaw);
  c.translate(x, y, z);
  return c;
}

const cylG = (rt, rb, h, seg = 12, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);

/** Figuren (alle Klone) des Levels. */
const figs = (level) => (level.players ?? [level.player]).filter((p) => p && !p.dead);

// =====================================================================================================================
// Meer zwischen den Becken
// =====================================================================================================================

/**
 * Flache Meeresfläche (y) über dem um pad erweiterten Level-Umriss, ausgespart sind die Rechtecke holes
 * ([x0, z0, x1, z1] – Becken mit eigener Oberfläche, Inseln dürfen überdeckt werden). Ein Mesh ohne Schattenwurf, Farben
 * wie das Meer des Themas (hell nah am Weg, tiefblau fern), Schaumbänder. Schließt die Lücke zwischen den Becken und dem
 * Kulissen-Meer des Themas (das erst 6 m außerhalb des Umrisses beginnt).
 */
export function seaFill(level, holes, o = {}) {
  if (!level.view) return null;
  const b = level.bounds, pad = o.pad ?? 14, y = o.y ?? -0.04;
  const X0 = b.min.x - pad, X1 = b.max.x + pad, Z0 = b.min.z - pad, Z1 = b.max.z + pad;
  const xs = new Set([X0, X1]), zs = new Set([Z0, Z1]);
  for (const [a, c, d, e] of holes) { xs.add(Math.max(X0, Math.min(X1, Math.min(a, d)))); xs.add(Math.max(X0, Math.min(X1, Math.max(a, d)))); zs.add(Math.max(Z0, Math.min(Z1, Math.min(c, e)))); zs.add(Math.max(Z0, Math.min(Z1, Math.max(c, e)))); }
  const X = [...xs].sort((p, q) => p - q), Z = [...zs].sort((p, q) => p - q);
  const inHole = (cx, cz) => holes.some(([a, c, d, e]) => cx > Math.min(a, d) && cx < Math.max(a, d) && cz > Math.min(c, e) && cz < Math.max(c, e));
  const pos = [];
  for (let j = 0; j < Z.length - 1; j++) {
    let run = null;
    const flush = () => { if (run) { pos.push([run[0], Z[j], run[1], Z[j + 1]]); run = null; } };
    for (let i = 0; i < X.length - 1; i++) {
      const cx = (X[i] + X[i + 1]) / 2, cz = (Z[j] + Z[j + 1]) / 2;
      if (inHole(cx, cz)) { flush(); continue; }
      if (run) run[1] = X[i + 1]; else run = [X[i], X[i + 1]];
    }
    flush();
  }
  const parts = [];
  for (const [ax, az, bx, bz] of pos) {
    const w = bx - ax, d = bz - az;
    if (w < 0.01 || d < 0.01) continue;
    const g = new THREE.PlaneGeometry(w, d, Math.max(1, Math.round(w / 8)), Math.max(1, Math.round(d / 8)));
    g.rotateX(-Math.PI / 2);
    g.translate((ax + bx) / 2, y, (az + bz) / 2);
    parts.push(g.toNonIndexed());
  }
  if (!parts.length) return null;
  const near = L(o.near ?? 0x52d8e2), far = L(o.far ?? 0x1e86c8), foam = L(0xeafcff);
  const path = o.path ?? [b.min.x + pad, b.max.x - pad];
  const g = colorize(mrg(parts), (p, n, out) => {
    const dx = Math.max(0, path[0] - p.x, p.x - path[1]);
    mixc(near, far, smooth(6, 70, dx), out);
    const w = Math.sin(p.x * 0.11 + Math.sin(p.z * 0.06) * 2) * Math.sin(p.z * 0.09 + p.x * 0.02);
    if (w > 0.86) mixc(out, foam, (w - 0.86) * 2.4, out);
  });
  const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, fog: true }));
  mesh.name = 'zier:meer';
  mesh.matrixAutoUpdate = false;
  addObject(level, mesh);
  return mesh;
}

// =====================================================================================================================
// Lagunen-Zier (statisch)
// =====================================================================================================================

/** Leuchtturm (rot-weiß geringelt, Galerie, Laterne, kreisender Lichtstrahl). pos = Fuß, h = Turmhöhe. */
export function leuchtturm(level, pos, o = {}) {
  const [x, y, z] = pos, H = o.height ?? 11, R0 = o.r ?? 1.5, R1 = R0 * 0.68;
  const parts = [], glow = [];
  const red = L(0xe2333a), white = L(0xfaf6ee), stone = L(0xc8c2b4), stoneD = L(0x8a8478);
  // Sockel
  parts.push(place(cylG(R0 + 0.7, R0 + 0.9, 1.2, 14), (p, n, out) => mixc(stoneD, stone, smooth(-0.6, 0.6, p.y + n.y * 0.3), out), x, y + 0.6, z));
  parts.push(place(cylG(R0 + 0.5, R0 + 0.7, 0.2, 14), (p, n, out) => mixc(stone, white, 0.5, out), x, y + 1.3, z));
  // Turm mit Ringen
  const band = H / 6;
  parts.push(place(cylG(R1, R0, H, 16), (p, n, out) => {
    const k = Math.floor((p.y + H / 2) / band) & 1;
    const c = k ? red : white;
    out[0] = c[0] * (0.85 + 0.15 * n.x); out[1] = c[1] * (0.85 + 0.15 * n.x); out[2] = c[2] * (0.85 + 0.15 * n.x);
  }, x, y + 1.4 + H / 2, z));
  // Fenster (zur Kamera und zur Seite)
  for (const [k, a] of [[0.25, 0], [0.5, 1.2], [0.72, -0.4]]) {
    const r = R0 + (R1 - R0) * k + 0.02, wy = y + 1.4 + H * k;
    const g = box(0.34, 0.6, 0.12, 0, 0, 0, 0x2a3a5a, { r: 0.05, seg: 1 });
    g.rotateY(-a);
    g.translate(x + Math.sin(a) * r, wy, z + Math.cos(a) * r);
    parts.push(g);
  }
  // Galerie mit Geländer
  const gy = y + 1.4 + H;
  parts.push(place(cylG(R1 + 0.6, R1 + 0.3, 0.3, 16), litFn(0x3a3a48), x, gy + 0.15, z));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    parts.push(place(cylG(0.04, 0.04, 0.6, 5), litFn(0xf0f0f0), x + Math.cos(a) * (R1 + 0.5), gy + 0.6, z + Math.sin(a) * (R1 + 0.5)));
  }
  parts.push(place(new THREE.TorusGeometry(R1 + 0.5, 0.05, 5, 24).rotateX(Math.PI / 2), litFn(0xf0f0f0), x, gy + 0.9, z));
  // Laterne (leuchtet) und Dach
  glow.push(place(cylG(R1 * 0.75, R1 * 0.75, 1.3, 12), (p, n, out) => mixc(L(0xfff2a0), L(0xffd040), smooth(-0.6, 0.6, p.y), out), x, gy + 0.95, z));
  parts.push(place(new THREE.ConeGeometry(R1 + 0.25, 1.1, 14), litFn(0xd02a32), x, gy + 2.15, z));
  parts.push(place(new THREE.SphereGeometry(0.18, 8, 6), litFn(0x3a3a48), x, gy + 2.8, z));
  addStatic(level, mrg(parts), { castShadow: o.shadow !== false });
  addStatic(level, mrg(glow), { material: 'glow', castShadow: false });
  level.world.add({ type: 'cyl', x, z, r: R0 + 0.8, y0: y, y1: y + 1.4 + H, tag: 'leuchtturm' });
  // Lichtstrahl: zwei lange, weiche Kegel, kreisen langsam (ein additives Mesh)
  if (!level.view) return;
  const beam = new THREE.ConeGeometry(2.4, 26, 14, 1, true);
  beam.translate(0, -13, 0);
  beam.rotateZ(Math.PI / 2);
  const b2 = beam.clone(); b2.rotateY(Math.PI);
  const bg = mrg([beam.toNonIndexed(), b2.toNonIndexed()]);
  const mat = new THREE.MeshBasicMaterial({ color: 0xfff4c0, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: true });
  const m = new THREE.Mesh(bg, mat);
  m.position.set(x, gy + 0.95, z);
  m.renderOrder = 3;
  const holder = {};
  addObject(level, m, (dt) => { m.rotation.y += visDt(level, holder, dt) * 0.55; });
}

/** Strandkorb (Korbgeflecht, gestreiftes Polster und gestreifte Haube). yaw: Blick der Sitzfläche (0 = +Z zur Kamera). */
function strandkorbParts(parts, x, y, z, yaw, stripe) {
  const wick = L(0xeedcb0), wickD = L(0xb89a60), s = L(stripe), w = L(0xfffaf0);
  const wickFn = (p, n, out) => { mixc(wickD, wick, smooth(-0.5, 0.8, n.y + 0.3), out); const k = 0.9 + 0.1 * Math.sin(p.y * 38 + p.x * 21 + p.z * 17); out[0] *= k; out[1] *= k; out[2] *= k; };
  const stripesX = (p, n, out) => { const c = (Math.floor((p.x + 2) / 0.17) & 1) ? s : w; out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; };
  const add = (g, fn, lx, ly, lz) => { g = g.toNonIndexed(); colorize(g, fn); g.translate(lx, ly, lz); g.rotateY(yaw); g.translate(x, y, z); parts.push(g); };
  add(new THREE.BoxGeometry(1.3, 0.5, 0.9), wickFn, 0, 0.25, 0);                 // Sockel
  add(new THREE.BoxGeometry(1.34, 0.9, 0.2), wickFn, 0, 0.95, -0.36);            // Rücken
  add(new THREE.BoxGeometry(0.14, 0.62, 0.78), wickFn, -0.6, 0.8, -0.02);        // Seitenwangen
  add(new THREE.BoxGeometry(0.14, 0.62, 0.78), wickFn, 0.6, 0.8, -0.02);
  // Haube: halber Zylinder quer (Achse x), oben und hinten geschlossen, vorn offen; außen breite Streifen
  const hood = new THREE.CylinderGeometry(0.62, 0.62, 1.34, 12, 1, true, Math.PI * 0.12, Math.PI * 0.88);
  hood.rotateZ(Math.PI / 2);
  const ring = (p, n, out) => { const a = Math.atan2(p.y, p.z); const c = (Math.floor(a / (Math.PI / 6)) & 1) ? s : w; out[0] = c[0] * 0.95; out[1] = c[1] * 0.95; out[2] = c[2] * 0.95; };
  add(hood, ring, 0, 1.2, -0.08);
  add(new THREE.BoxGeometry(1.36, 0.06, 0.06), wickFn, 0, 1.2 + 0.62 * Math.sin(Math.PI * 0.12), 0.5);   // Haubenkante
  add(new THREE.BoxGeometry(1.12, 0.1, 0.66), stripesX, 0, 0.55, 0.06);          // Sitzpolster
  add(new THREE.BoxGeometry(1.12, 0.66, 0.06), stripesX, 0, 0.92, -0.24);        // Rückenpolster
  add(new THREE.BoxGeometry(0.5, 0.05, 0.7), wickFn, 0, 0.12, 0.72);             // Fußbank
}

/** Sonnenschirm (gestreift) mit Badetuch. */
function schirmParts(parts, x, y, z, a, b) {
  parts.push(place(cylG(0.04, 0.04, 2.3, 6), litFn(0xf4f4f4), x, y + 1.15, z));
  const ca = L(a), cb = L(b);
  const g = new THREE.ConeGeometry(1.35, 0.55, 16, 1, true);
  parts.push(place(g, (p, n, out) => { const ang = Math.atan2(p.z, p.x); const c = (Math.floor((ang + Math.PI) / (TAU / 8)) & 1) ? ca : cb; out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; }, x, y + 2.3, z));
  parts.push(place(new THREE.SphereGeometry(0.07, 6, 4), litFn(0xffffff), x, y + 2.6, z));
  const t = box(0.9, 0.03, 1.7, 0, 0, 0, b, { r: 0.01, seg: 0 });
  t.rotateY(0.4); t.translate(x + 0.9, y + 0.02, z + 0.6);
  parts.push(t);
}

/** Sandburg: Türme mit Zinnen, Mauer, Fähnchen, Burggraben-Ring. size = Maßstab. */
function sandburgParts(parts, x, y, z, s = 1, yaw = 0) {
  const sand = L(0xf0d494), sandD = L(0xd0aa62);
  const sf = (p, n, out) => mixc(sandD, sand, smooth(-0.6, 0.8, n.y + 0.2), out);
  const T = (lx, lz, r, h) => {
    const c = Math.cos(yaw), si = Math.sin(yaw), wx = x + (lx * c + lz * si) * s, wz = z + (-lx * si + lz * c) * s;
    parts.push(place(cylG(r * s * 0.92, r * s, h * s, 10), sf, wx, y + (h * s) / 2, wz));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      parts.push(place(new THREE.BoxGeometry(0.12 * s, 0.14 * s, 0.12 * s), sf, wx + Math.cos(a) * r * s * 0.8, y + h * s + 0.07 * s, wz + Math.sin(a) * r * s * 0.8));
    }
    return [wx, wz, h];
  };
  T(0, 0, 0.42, 1.0);
  T(-0.75, 0.35, 0.3, 0.7);
  const [fx, fz, fh] = T(0.75, 0.35, 0.3, 0.75);
  T(0, -0.6, 0.3, 0.65);
  const wall = new THREE.BoxGeometry(1.4 * s, 0.4 * s, 0.22 * s);
  wall.rotateY(yaw); parts.push(place(wall, sf, x + Math.sin(yaw) * 0.35 * s, y + 0.2 * s, z + Math.cos(yaw) * 0.35 * s));
  // Fähnchen
  parts.push(place(cylG(0.015, 0.015, 0.5 * s, 4), litFn(0x8a6a4a), fx, y + fh * s + 0.25 * s, fz));
  const fl = new THREE.BufferGeometry();
  fl.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.28, -0.08, 0, 0, -0.18, 0, 0, 0, 0, 0, -0.18, 0, 0.28, -0.08, 0], 3));
  fl.computeVertexNormals();
  parts.push(place(fl.scale(s, s, s), (p, n, out) => { const c = L(0xff3a4a); out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; }, fx, y + fh * s + 0.5 * s, fz));
  // Graben (dunklerer, nasser Sand)
  const moat = new THREE.RingGeometry(1.25 * s, 1.55 * s, 20);
  moat.rotateX(-Math.PI / 2);
  parts.push(place(moat, (p, n, out) => { const c = L(0xc8a060); out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; }, x, y + 0.012, z));
  // Eimer und Schaufel
  parts.push(place(cylG(0.16, 0.12, 0.26, 10), litFn(0x3a8aff), x + 1.7 * s, y + 0.13, z + 0.4 * s));
  const sh = box(0.08, 0.03, 0.5, 0, 0, 0, 0xffd23d, { r: 0.01, seg: 0 });
  sh.rotateY(0.9); sh.translate(x + 1.5 * s, y + 0.02, z + 0.9 * s);
  parts.push(sh);
}

/** Muscheln und Seesterne verstreut (deterministisch). */
function muschelParts(parts, list, seed = 1) {
  let k = seed;
  const r = () => { k = (k * 9301 + 49297) % 233280; return k / 233280; };
  const shellC = [0xffd6e0, 0xfff0e0, 0xffc8a8, 0xf6e8ff], starC = [0xff7a3a, 0xff5a7a, 0xffb02a];
  for (const [x, y, z, n = 4, rad = 1.2] of list) {
    for (let i = 0; i < n; i++) {
      const a = r() * TAU, d = r() * rad, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      if (r() < 0.65) {
        // Muschel: gerippter Fächer (halbe Scheibe, leicht gewölbt)
        const g = new THREE.SphereGeometry(0.14, 7, 3, 0, Math.PI, 0, Math.PI / 2);
        g.scale(1, 0.45, 1); g.rotateY(r() * TAU);
        const c = L(shellC[Math.floor(r() * shellC.length)]), cD = [c[0] * 0.7, c[1] * 0.7, c[2] * 0.7];
        parts.push(place(g, (p, nn, out) => mixc(cD, c, 0.5 + 0.5 * Math.sin(Math.atan2(p.z, p.x) * 9), out), px, y + 0.01, pz));
      } else {
        // Seestern: fünf Arme
        const c = L(starC[Math.floor(r() * starC.length)]), rot = r() * TAU;
        for (let j = 0; j < 5; j++) {
          const g = new THREE.BoxGeometry(0.22, 0.04, 0.07);
          g.translate(0.11, 0, 0); g.rotateY(rot + (j / 5) * TAU);
          parts.push(place(g, (p, nn, out) => { out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; }, px, y + 0.025, pz));
        }
      }
    }
  }
}

/** Rettungsring an einem Pfosten. */
function rettungsringParts(parts, x, y, z, yaw = 0) {
  parts.push(place(cylG(0.06, 0.07, 1.6, 6), litFn(0xa87a4a), x, y + 0.8, z));
  const t = new THREE.TorusGeometry(0.38, 0.11, 6, 14);
  t.rotateY(yaw);
  const red = L(0xff3a3a), w = L(0xffffff);
  parts.push(place(t, (p, n, out) => { const a = Math.atan2(p.y, Math.hypot(p.x, p.z) * Math.sign(p.x + p.z || 1)); const c = (Math.floor((a + Math.PI) / (Math.PI / 4)) & 1) ? red : w; out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; }, x + Math.sin(yaw) * 0.1, y + 1.15, z + Math.cos(yaw) * 0.1));
}

/** Palme (sparsam: gebogener Stamm aus Ringen, sechs Wedel, Kokosnüsse). */
function palmeParts(parts, x, y, z, h = 4.2, lean = 0.3, yaw = 0) {
  const bark = L(0xa8804a), barkD = L(0x7a5a32);
  const n = 7;
  let tx = x, tz = z;
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n;
    const off = (t) => lean * t * t * h;
    const ax = x + Math.sin(yaw) * off(t0), az = z + Math.cos(yaw) * off(t0), bx = x + Math.sin(yaw) * off(t1), bz = z + Math.cos(yaw) * off(t1);
    const seg = cylG(0.15 - 0.04 * t1, 0.17 - 0.04 * t0, (h / n) * 1.02, 7);
    const dx = bx - ax, dz = bz - az, dy = h / n;
    const g = seg.toNonIndexed();
    colorize(g, (p, nn, out) => mixc(barkD, bark, 0.5 + 0.5 * Math.sin(p.y * 22), out));
    const axis = new THREE.Vector3(dx, dy, dz).normalize();
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis));
    g.translate((ax + bx) / 2, y + (t0 + t1) / 2 * h, (az + bz) / 2);
    parts.push(g);
    tx = bx; tz = bz;
  }
  const top = y + h;
  const leaf = L(0x3ab84a), leafD = L(0x1e7a32);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.3;
    const g = new THREE.PlaneGeometry(2.1, 0.5, 4, 1);
    const P = g.attributes.position;
    for (let k = 0; k < P.count; k++) { const u = P.getX(k) + 1.05; P.setY(k, P.getY(k) * (1 - u / 2.3)); P.setZ(k, -0.32 * u * u); }
    g.translate(1.05, 0, 0); g.rotateX(-Math.PI / 2);
    g.computeVertexNormals();
    g.rotateY(a);
    parts.push(place(g, (p, nn, out) => mixc(leafD, leaf, smooth(0, 2, Math.hypot(p.x, p.z)), out), tx, top, tz));
  }
  for (let i = 0; i < 3; i++) parts.push(place(new THREE.SphereGeometry(0.13, 6, 4), litFn(0x6a4a2a), tx + Math.cos(i * 2.1) * 0.2, top - 0.15, tz + Math.sin(i * 2.1) * 0.2));
  return [tx, tz];
}

/**
 * Strandzier in die statische Geometrie: o = { koerbe: [[x, y, z, yaw, farbe]], schirme: [[x, y, z, a, b]],
 * burgen: [[x, y, z, s, yaw]], muscheln: [[x, y, z, n, r]], ringe: [[x, y, z, yaw]], palmen: [[x, y, z, h, lean, yaw]] }.
 * Palmen haben einen festen Stamm (Zylinder), Körbe einen Quader.
 */
export function strand(level, o) {
  const parts = [];
  for (const [x, y, z, yaw = 0, c = 0x3a7aff] of o.koerbe ?? []) {
    strandkorbParts(parts, x, y, z, yaw, c);
    level.world.add({ type: 'box', min: [x - 0.7, y, z - 0.7], max: [x + 0.7, y + 1.9, z + 0.7], tag: 'strandkorb' });
  }
  for (const [x, y, z, a = 0xff4a5a, b = 0xffffff] of o.schirme ?? []) schirmParts(parts, x, y, z, a, b);
  for (const [x, y, z, s = 1, yaw = 0] of o.burgen ?? []) sandburgParts(parts, x, y, z, s, yaw);
  muschelParts(parts, o.muscheln ?? [], o.seed ?? 3);
  for (const [x, y, z, yaw = 0] of o.ringe ?? []) rettungsringParts(parts, x, y, z, yaw);
  for (const [x, y, z, h = 4.2, lean = 0.3, yaw = 0] of o.palmen ?? []) {
    palmeParts(parts, x, y, z, h, lean, yaw);
    level.world.add({ type: 'cyl', x, z, r: 0.2, y0: y, y1: y + h * 0.6, tag: 'palme' });
  }
  // je ≈ 20 Teile eine Geometrie, damit die Abschnitts-Zuordnung (32 m) stimmt
  for (let i = 0; i < parts.length; i += 24) addStatic(level, mrg(parts.slice(i, i + 24)), { castShadow: o.shadow !== false });
}

/**
 * Felsen (Riff/Klippe) als Kollisions-Quader mit unregelmäßiger Felsoptik: list = [[x0, x1, zA, zB, y0, y1, farbe?]].
 * top: Farbe der Oberseite (Sand, Gras, Moos). Liefert nichts; Kollision box.
 */
export function felsen(level, list, o = {}) {
  const parts = [];
  for (const it of list) {
    const [x0, x1, zA, zB, y0, y1] = it;
    const z0 = Math.min(zA, zB), z1 = Math.max(zA, zB);
    level.world.add({ type: 'box', min: [x0, y0, z0], max: [x1, y1, z1], tag: 'fels', camIgnore: !!(it[7]?.camIgnore ?? o.camIgnore) });
    if (!level.view) continue;
    const col = L(it[6] ?? o.color ?? 0xb09a80), colD = L(o.dark ?? 0x6e5e4e), topC = o.top !== undefined ? L(o.top) : null;
    const w = x1 - x0, h = y1 - y0, d = z1 - z0;
    const nx = Math.max(1, Math.round(w / 1.6)), ny = Math.max(1, Math.round(h / 1.6)), nz = Math.max(1, Math.round(d / 1.6));
    const g = new THREE.BoxGeometry(w, h, d, nx, ny, nz).toNonIndexed();
    const P = g.attributes.position;
    const seed = x0 * 1.7 + z0 * 0.9;
    for (let i = 0; i < P.count; i++) {
      const px = P.getX(i), py = P.getY(i), pz = P.getZ(i);
      const onTop = py > h / 2 - 1e-3;
      if (onTop) continue;
      const k = Math.sin(px * 1.3 + seed) * Math.cos(pz * 1.1 + py * 0.7 + seed) * 0.22 + Math.sin(py * 2.1 + px * 0.5) * 0.08;
      const ex = Math.abs(Math.abs(px) - w / 2) < 1e-3 ? Math.sign(px) * k : 0, ez = Math.abs(Math.abs(pz) - d / 2) < 1e-3 ? Math.sign(pz) * k : 0;
      P.setXYZ(i, px + ex, py, pz + ez);
    }
    g.computeVertexNormals();
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const topD = topC ? [topC[0] * 0.78, topC[1] * 0.8, topC[2] * 0.7] : null, rockT = L(o.rockTop ?? 0xd8c4a0);
    colorize(g, (p, n, out) => {
      const wx = p.x + cx, wz = p.z + cz;
      if (n.y > 0.6 && topC) {
        // Oberseite: Moos-/Grasflecken auf hellem Fels (Rauschen in Weltkoordinaten)
        const v = Math.sin(wx * 0.55 + Math.sin(wz * 0.4) * 1.7) * Math.cos(wz * 0.47 - wx * 0.21) + Math.sin(wx * 1.3 + wz * 1.1) * 0.35;
        if (v > -0.15) mixc(topD, topC, smooth(-0.15, 0.9, v), out); else mixc(rockT, topD, smooth(-0.9, -0.15, v), out);
        return;
      }
      const band = 0.5 + 0.5 * Math.sin((p.y + (y0 + y1) / 2) * 2.3 + wx * 0.3);
      mixc(colD, col, smooth(-h / 2, h / 2, p.y) * 0.6 + 0.25 + band * 0.15, out);
    });
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    parts.push(g);
  }
  for (const g of parts) addStatic(level, g, { castShadow: o.shadow !== false });
}

/**
 * Sparsame Riffkorallen (≈ 60–160 Dreiecke je Stück statt ≈ 2 k des Registry-Modells), verschmolzen, ohne Kollision:
 * Streuungen { pos: [x, y, z], size: [w, d], n, scale: [a, b], kinds: ['ast', 'faecher', 'hirn', 'roehre'], seed,
 * shadow }. Farben: Rosa, Orange, Violett, Gelbgrün, Türkis.
 */
export function riffKorallen(level, list) {
  const P = { cast: [], flat: [] };
  const cols = [0xff6a9a, 0xff9a3a, 0xb06aff, 0xc8e04a, 0x4ad8c8, 0xff5a5a];
  for (const it of list) {
    let k = it.seed ?? Math.floor(Math.abs(it.pos[0] * 13 + it.pos[2] * 7)) + 1;
    const r = () => { k = (k * 9301 + 49297) % 233280; return k / 233280; };
    const [w, d] = it.size ?? [6, 6];
    const kinds = it.kinds ?? ['ast', 'faecher', 'hirn', 'roehre'];
    const out = it.shadow === false ? P.flat : P.cast;
    const pts = [];
    for (let t = 0; t < (it.n ?? 6) * 20 && pts.length < (it.n ?? 6); t++) {
      const x = it.pos[0] + (r() - 0.5) * w, z = it.pos[2] + (r() - 0.5) * d;
      if (pts.some((q) => Math.hypot(q[0] - x, q[1] - z) < (it.gap ?? 1.2))) continue;
      pts.push([x, z]);
    }
    const [s0, s1] = it.scale ?? [0.8, 1.3];
    for (const [x, z] of pts) {
      const y = it.pos[1], sc = s0 + r() * (s1 - s0), kind = kinds[Math.floor(r() * kinds.length)];
      const C = L(cols[Math.floor(r() * cols.length)]), CD = [C[0] * 0.55, C[1] * 0.5, C[2] * 0.55], CL = [Math.min(1, C[0] * 1.25 + 0.1), Math.min(1, C[1] * 1.25 + 0.1), Math.min(1, C[2] * 1.25 + 0.1)];
      const grad = (p, n, o) => mixc(CD, CL, smooth(0, 1.2 * sc, p.y), o);
      if (kind === 'ast') {
        for (let i = 0; i < 5; i++) {
          const a = i * 1.26 + r(), lean = i ? 0.45 : 0.1, h = (0.6 + r() * 0.5) * sc;
          const g = new THREE.CylinderGeometry(0.035 * sc, 0.07 * sc, h, 5, 1, true);
          g.translate(0, h / 2, 0); g.rotateZ(lean * Math.cos(a)); g.rotateX(lean * Math.sin(a));
          const tip = new THREE.Vector3(0, h, 0).applyEuler(new THREE.Euler(lean * Math.sin(a), 0, lean * Math.cos(a)));
          out.push(place(g, grad, x, y, z));
          out.push(place(new THREE.SphereGeometry(0.075 * sc, 5, 3), (p, n, o) => { o[0] = CL[0]; o[1] = CL[1]; o[2] = CL[2]; }, x + tip.x, y + tip.y, z + tip.z));
        }
      } else if (kind === 'faecher') {
        const yaw = r() * Math.PI;
        for (const back of [0, Math.PI]) {
          const g = new THREE.CircleGeometry(0.7 * sc, 9, Math.PI * 0.1, Math.PI * 0.8);
          g.rotateY(yaw + back);
          out.push(place(g, (p, n, o) => { const v = Math.abs(Math.sin(Math.atan2(p.y, p.x + p.z) * 9)); mixc(CD, CL, 0.35 + 0.65 * v * smooth(0, 0.7 * sc, Math.hypot(p.x, p.y, p.z)), o); }, x, y + 0.1 * sc, z));
        }
        out.push(place(new THREE.CylinderGeometry(0.04 * sc, 0.07 * sc, 0.2 * sc, 5), grad, x, y + 0.1 * sc, z));
      } else if (kind === 'hirn') {
        const g = new THREE.SphereGeometry(0.5 * sc, 10, 5, 0, TAU, 0, Math.PI / 2);
        g.scale(1, 0.75, 1);
        const A = L(0xd8e85a), B = L(0x7a9a2a);
        out.push(place(g, (p, n, o) => mixc(B, A, Math.sin(p.x * 14 / sc + Math.sin(p.z * 8 / sc) * 2.5) * Math.cos(p.z * 4 / sc) > 0.1 ? 1 : 0, o), x, y, z));
      } else {
        // Röhrenkorallen: Bündel offener Röhrchen
        for (let i = 0; i < 4; i++) {
          const a = i * 1.57 + r(), rr = 0.12 * sc, h = (0.35 + r() * 0.45) * sc;
          out.push(place(new THREE.CylinderGeometry(0.07 * sc, 0.06 * sc, h, 6, 1, true), grad, x + Math.cos(a) * rr, y + h / 2, z + Math.sin(a) * rr));
          const ring = new THREE.TorusGeometry(0.07 * sc, 0.02 * sc, 3, 6); ring.rotateX(Math.PI / 2);
          out.push(place(ring, (p, n, o) => { o[0] = CL[0]; o[1] = CL[1]; o[2] = CL[2]; }, x + Math.cos(a) * rr, y + h, z + Math.sin(a) * rr));
        }
      }
    }
  }
  for (let i = 0; i < P.cast.length; i += 60) addStatic(level, mrg(P.cast.slice(i, i + 60)));
  for (let i = 0; i < P.flat.length; i += 60) addStatic(level, mrg(P.flat.slice(i, i + 60)), { castShadow: false });
}

/** Dunkle Wandlöcher (Stachelfisch-Röhren) als Scheiben mit Rand: list = [[x, y, z, nx, nz, r]] (Normale zeigt aus der Wand). */
export function wandloecher(level, list) {
  const parts = [];
  const rim = L(0x8a7a68), dark = L(0x0a1420);
  for (const [x, y, z, nx, nz, r = 0.42] of list) {
    const yaw = Math.atan2(nx, nz);
    const ring = new THREE.TorusGeometry(r, 0.09, 5, 14);
    ring.rotateY(yaw);
    parts.push(place(ring, (p, n, out) => { out[0] = rim[0]; out[1] = rim[1]; out[2] = rim[2]; }, x + nx * 0.04, y, z + nz * 0.04));
    const disc = new THREE.CircleGeometry(r, 14);
    disc.rotateY(yaw);
    parts.push(place(disc, (p, n, out) => { out[0] = dark[0]; out[1] = dark[1]; out[2] = dark[2]; }, x + nx * 0.03, y, z + nz * 0.03));
  }
  if (parts.length) addStatic(level, mrg(parts), { castShadow: false });
}

/** Vogelscheuche (Strohhut, kariertes Hemd, Kürbiskopf), verschmolzen; Pfahl fest. */
export function vogelscheuche(level, x, y, z, yaw = 0) {
  const P = [];
  P.push(place(cylG(0.06, 0.07, 2.3, 6), litFn(0x7a5232), x, y + 1.15, z));
  const arm = new THREE.CylinderGeometry(0.05, 0.05, 1.8, 6); arm.rotateZ(Math.PI / 2); arm.rotateY(yaw);
  P.push(place(arm, litFn(0x7a5232), x, y + 1.6, z));
  const shirt = new THREE.BoxGeometry(0.62, 0.7, 0.32); shirt.rotateY(yaw);
  const red = L(0xd83a2a), dark = L(0x7a1a1a);
  P.push(place(shirt, (p, n, o) => mixc(red, dark, ((Math.floor((p.x + p.z) * 7) + Math.floor(p.y * 7)) & 1) ? 0.6 : 0, o), x, y + 1.45, z));
  const sleeve = new THREE.BoxGeometry(1.5, 0.22, 0.26); sleeve.rotateY(yaw);
  P.push(place(sleeve, (p, n, o) => mixc(red, dark, (Math.floor((p.x + p.z) * 7) & 1) ? 0.6 : 0, o), x, y + 1.62, z));
  const head = new THREE.SphereGeometry(0.3, 10, 7); head.scale(1, 0.85, 1);
  P.push(place(head, (p, n, o) => { const a = Math.atan2(p.z, p.x); mixc(L(0xc8601a), L(0xff9a2a), 0.5 + 0.5 * Math.abs(Math.sin(a * 4)), o); }, x, y + 2.2, z));
  P.push(place(new THREE.CylinderGeometry(0.52, 0.56, 0.05, 14), litFn(0xe8c870), x, y + 2.42, z));
  P.push(place(new THREE.CylinderGeometry(0.22, 0.28, 0.32, 12), litFn(0xe0be60), x, y + 2.6, z));
  for (let i = 0; i < 6; i++) { const a = yaw + (i - 2.5) * 0.25; const g = new THREE.ConeGeometry(0.04, 0.3, 4); g.rotateZ(Math.PI); P.push(place(g, litFn(0xf0d070), x + Math.cos(a) * 0.95, y + 1.48, z - Math.sin(a) * 0.95)); }
  addStatic(level, mrg(P));
  level.world.add({ type: 'cyl', x, z, r: 0.12, y0: y, y1: y + 2.3, tag: 'vogelscheuche' });
}

/** Flaschenpost im Sand (Kulisse). */
export function flaschenpost(level, x, y, z, yaw = 0) {
  const P = [];
  const g = new THREE.CylinderGeometry(0.09, 0.11, 0.42, 8); g.rotateZ(Math.PI / 2 - 0.15); g.rotateY(yaw);
  P.push(place(g, (p, n, o) => mixc(L(0x2a8a5a), L(0x8ae0b0), smooth(-0.5, 0.9, n.y), o), x, y + 0.1, z));
  const neck = new THREE.CylinderGeometry(0.04, 0.05, 0.14, 6); neck.rotateZ(Math.PI / 2 - 0.15); neck.rotateY(yaw);
  P.push(place(neck, litFn(0x2a8a5a), x + Math.cos(yaw) * 0.27, y + 0.14, z - Math.sin(yaw) * 0.27));
  const cork = new THREE.CylinderGeometry(0.035, 0.035, 0.05, 6); cork.rotateZ(Math.PI / 2 - 0.15); cork.rotateY(yaw);
  P.push(place(cork, litFn(0xb8864a), x + Math.cos(yaw) * 0.36, y + 0.15, z - Math.sin(yaw) * 0.36));
  const note = new THREE.BoxGeometry(0.2, 0.08, 0.08); note.rotateY(yaw);
  P.push(place(note, litFn(0xfff4d0), x, y + 0.1, z));
  addStatic(level, mrg(P), { castShadow: false });
}

// =====================================================================================================================
// Lagunen-Zier (animiert)
// =====================================================================================================================

function fishGeo(color, size = 0.32) {
  const body = new THREE.SphereGeometry(size * 0.5, 7, 5);
  body.scale(1.4, 0.8, 0.55);
  const tail = new THREE.BufferGeometry();
  tail.setAttribute('position', new THREE.Float32BufferAttribute([-size * 0.6, 0, 0, -size * 1.05, size * 0.32, 0, -size * 1.05, -size * 0.32, 0, -size * 0.6, 0, 0, -size * 1.05, -size * 0.32, 0, -size * 1.05, size * 0.32, 0], 3));
  tail.computeVertexNormals();
  const cl = L(color), c = [cl[0] * 0.55, cl[1] * 0.55, cl[2] * 0.6];
  const g = mrg([body.toNonIndexed(), tail]);
  return colorize(g, (p, n, out) => mixc(c, cl, smooth(-0.1, 0.1, p.y), out));
}

/**
 * Fischschwärme (Zier, harmlos): schools = [{ center: [x, y, z], radius, n, speed, color, size, rz? (Oval) }]. Eine
 * Instanz-Gruppe für alle (1 Zeichenaufruf), die Fische kreisen mit leichtem Schlängeln. Nur Darstellung.
 */
export function fischschwaerme(level, schools) {
  if (!level.view || !schools.length) return;
  const total = schools.reduce((a, s) => a + (s.n ?? 8), 0);
  // eine Instanz-Gruppe für alle Schwärme: weiße Grundfarbe, Farbe je Instanz (instanceColor)
  const mesh = new THREE.InstancedMesh(fishGeo(0xffffff, 0.3), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.15 }), total);
  mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = false;
  mesh.name = 'zier:fische';
  const fish = [];
  const col = new THREE.Color();
  for (const s of schools) {
    const n = s.n ?? 8;
    for (let i = 0; i < n; i++) {
      col.setHex(s.color ?? 0xffa030);
      mesh.setColorAt(fish.length, col);
      fish.push({ s, ph: (i / n) * TAU * (s.spread ?? 0.35), off: [Math.sin(i * 2.7) * 0.5, Math.cos(i * 1.9) * 0.35, Math.sin(i * 3.3) * 0.4], sc: 0.8 + ((i * 37) % 10) / 25 });
    }
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  let t = 0;
  const holder = {};
  addObject(level, mesh, (dt) => {
    t += visDt(level, holder, dt);
    fish.forEach((f, i) => {
      const s = f.s, R = s.radius ?? 3, w = (s.speed ?? 1.2) / R, a = t * w * (s.cw ? -1 : 1) + f.ph;
      const rz = s.rz ?? R;
      v.set(s.center[0] + Math.cos(a) * (R + f.off[0]), s.center[1] + f.off[1] + Math.sin(t * 1.3 + f.ph * 3) * 0.15, s.center[2] - Math.sin(a) * (rz + f.off[2]));
      const yaw = Math.atan2(Math.cos(a) * rz, Math.sin(a) * R) * (s.cw ? -1 : 1) + (s.cw ? Math.PI : 0) + Math.sin(t * 6 + f.ph * 5) * 0.15;
      e.set(0, yaw + Math.PI, 0);
      q.setFromEuler(e);
      sc.setScalar((s.size ?? 1) * f.sc);
      m4.compose(v, q, sc);
      mesh.setMatrixAt(i, m4);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
}

/** Möwen, die kreisen (ein Instanz-Mesh, Flügelschlag über Maßstab). list = [{ center: [x, y, z], radius, n }]. */
export function moewen(level, list) {
  if (!level.view || !list.length) return;
  const total = list.reduce((a, s) => a + (s.n ?? 3), 0);
  const g = new THREE.BufferGeometry();
  const P = [0, 0, 0.12, 0, 0, -0.12, 0.7, 0.18, 0, 0, 0, -0.12, 0, 0, 0.12, -0.7, 0.18, 0, 0.12, 0.02, 0, -0.12, 0.02, 0, 0, 0.05, 0.35];
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.computeVertexNormals();
  const m = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color: 0xf8fafc, side: THREE.DoubleSide, fog: true }), total);
  m.frustumCulled = false;
  const birds = [];
  for (const s of list) for (let i = 0; i < (s.n ?? 3); i++) birds.push({ s, ph: i * 2.1, r: (s.radius ?? 6) * (0.8 + 0.15 * i), h: i * 0.8 });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  let t = 0;
  const holder = {};
  addObject(level, m, (dt) => {
    t += visDt(level, holder, dt);
    birds.forEach((b, i) => {
      const a = t * 0.35 + b.ph;
      v.set(b.s.center[0] + Math.cos(a) * b.r, b.s.center[1] + b.h + Math.sin(t * 0.8 + b.ph) * 0.6, b.s.center[2] + Math.sin(a) * b.r);
      e.set(0, -a, Math.sin(t * 2 + b.ph) * 0.15);
      q.setFromEuler(e);
      sc.set(1.3, 1 + Math.sin(t * 7 + b.ph) * 0.5, 1.3);
      m4.compose(v, q, sc);
      m.setMatrixAt(i, m4);
    });
    m.instanceMatrix.needsUpdate = true;
  });
}

/** Krabbe, die seitwärts zwischen a und b trippelt (ein Mesh). */
export function krabbe(level, a, b, o = {}) {
  if (!level.view) return;
  const red = L(o.color ?? 0xff5a3a), redD = [red[0] * 0.7, red[1] * 0.6, red[2] * 0.6];
  const parts = [];
  const body = new THREE.SphereGeometry(0.22, 8, 5); body.scale(1.3, 0.6, 1);
  parts.push(place(body, (p, n, out) => mixc(redD, red, smooth(-0.1, 0.1, p.y), out), 0, 0.17, 0));
  for (const s of [-1, 1]) {
    parts.push(place(new THREE.SphereGeometry(0.1, 6, 4).scale(1, 0.7, 0.8), litFn(o.color ?? 0xff5a3a), s * 0.34, 0.2, 0.16));
    parts.push(place(cylG(0.02, 0.02, 0.14, 4), litFn(0x3a2a2a), s * 0.08, 0.3, 0.14));
    parts.push(place(new THREE.SphereGeometry(0.035, 5, 4), litFn(0x111111), s * 0.08, 0.38, 0.14));
    for (let k = 0; k < 3; k++) { const g = new THREE.BoxGeometry(0.2, 0.025, 0.025); g.rotateZ(s * -0.6); parts.push(place(g, litFn(o.color ?? 0xff5a3a), s * 0.28, 0.1, -0.08 + k * 0.08)); }
  }
  const mesh = new THREE.Mesh(mrg(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }));
  mesh.castShadow = false;
  const dx = b[0] - a[0], dz = b[2] - a[2], len = Math.hypot(dx, dz) || 1;
  const yaw = Math.atan2(dx, dz) + Math.PI / 2;
  let t = (o.phase ?? 0) * 10;
  const holder = {};
  addObject(level, mesh, (dt) => {
    t += visDt(level, holder, dt);
    const u = 0.5 - 0.5 * Math.cos((t * (o.speed ?? 0.5) * TAU) / (len / 1.2) * 0.5);
    mesh.position.set(a[0] + dx * u, a[1] + Math.abs(Math.sin(t * 14)) * 0.02, a[2] + dz * u);
    mesh.rotation.set(0, yaw + Math.sin(t * 3) * 0.1, Math.sin(t * 14) * 0.05);
  });
}

/**
 * Ferne statische Abschnitte nicht zeichnen (nach cullStatic anmelden): Abschnitts-Meshes, deren Quader weiter als
 * dist m von der Kamera entfernt ist, werden ausgeblendet (flache Kameras sehen sonst den ganzen Kurs – im Dunst kaum
 * sichtbar, aber teuer). Nur Darstellung.
 */
export function fernAus(level, dist = 130) {
  const v = level.view;
  if (!v) return;
  const items = v.static.meshes.map((m) => { m.geometry.computeBoundingBox(); return { m, b: m.geometry.boundingBox.clone() }; });
  const c = new THREE.Vector3();
  v.onFrame(() => {
    const cam = v.camera.position;
    for (const it of items) {
      if (!it.m.visible) continue;
      it.b.clampPoint(cam, c);
      if (c.distanceTo(cam) > dist) { it.m.visible = false; it.m.castShadow = false; }
    }
  });
}

// =====================================================================================================================
// Sparsame Darstellung der Gegner (Zeichenaufrufe)
// =====================================================================================================================

/**
 * Gegner-Modelle nur zeichnen, wenn nötig (nur Darstellung, die Gegner laufen weiter): rules = { art: { dist, shadow,
 * hide(e) } } – weiter als dist m (waagerecht) von der Haupt-Figur weg bzw. hide(e) → unsichtbar; shadow: false → wirft
 * nie Sonnenschatten (Fische unter Wasser: der Schatten fiele auf den Grund und kostet je Teil einen Aufruf).
 */
export function gegnerSicht(level, rules) {
  if (!level.view) return;
  const off = (e) => { e.shadowMeshes = []; e.model?.root.traverse((o) => { if (o.isMesh) o.castShadow = false; }); };
  for (const e of level.entities) if (rules[e.kind]?.shadow === false) off(e);
  level.view.onFrame(() => {
    const p = level.player;
    if (!p) return;
    for (const e of level.entities) {
      const r = rules[e.kind];
      if (!r || !e.model?.root) continue;
      if (r.shadow === false && e.shadowMeshes?.length) off(e);
      const far = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z) > (r.dist ?? 45);
      const vis = !e.removed && !far && !(r.hide && r.hide(e));
      if (e.model.root.visible !== vis) e.model.root.visible = vis;
    }
  });
}

// =====================================================================================================================
// Steigendes Wasser am Ende des Tauchbereichs (3-5)
// =====================================================================================================================

/**
 * Flutkammer: Schwimmt eine Figur im Bereich area ({ min: [x, y, z], max }), steigt das Wasser id auf `to` (speed m/s)
 * – Ansage, Rumpeln. Neustart ohne Checkpoint hinter der Kammer setzt den Wasserspiegel auf `from` zurück.
 * Liefert { state: 'ruhig'|'steigt'|'oben', trigger() }.
 */
export function flutKammer(level, o) {
  const st = { state: 'ruhig', t: 0, trigger() {
    if (st.state !== 'ruhig') return;
    st.state = 'steigt';
    level.setWaterLevel?.(o.id, o.to, o.speed ?? 1.2);
    level.sfx('switch');
    level.shake?.(0.25);
    banner(level, o.text ?? 'Die Flut steigt!', { hold: 1.6 });
  } };
  const { min, max } = o.area;
  level.onStep((dt) => {
    if (st.state === 'ruhig') {
      for (const p of figs(level)) {
        if (p.mode !== 'swim' && !(o.anyMode)) continue;
        if (p.pos.x > min[0] && p.pos.x < max[0] && p.pos.y > min[1] && p.pos.y < max[1] && p.pos.z > min[2] && p.pos.z < max[2]) { st.trigger(); break; }
      }
    } else if (st.state === 'steigt') {
      st.t += dt;
      const top = level.waterLevel?.(o.id);
      if (top !== undefined && top !== null && top >= o.to - 0.01) { st.state = 'oben'; level.sfx('stamp'); }
      if (Math.floor(st.t * 3) !== Math.floor((st.t - dt) * 3)) level.effects?.splash?.({ x: (min[0] + max[0]) / 2, y: top ?? 0, z: (min[2] + max[2]) / 2 }, top ?? 0);
    }
  });
  const rt = level.runtime;
  const orig = rt.respawn.bind(rt);
  rt.respawn = (...args) => {
    const r = orig(...args);
    const cp = rt.checkpoint?.pos;
    if (!cp || cp[2] > (o.resetBefore ?? -Infinity)) {
      level.setWaterLevel?.(o.id, o.from, 0);
      st.state = 'ruhig'; st.t = 0;
    }
    return r;
  };
  if (o.id) level.named.set(`${o.id}_kammer`, st);
  return st;
}

// =====================================================================================================================
// Zeit-Uhren (+10 s)
// =====================================================================================================================

function clockGeo() {
  const parts = [];
  const gold = L(0xffc93a), goldD = L(0xc88a1a), face = L(0xfffaf0), ink = L(0x2a2a3a), red = L(0xff3a3a);
  const ring = new THREE.TorusGeometry(0.36, 0.08, 6, 20);
  parts.push(colorize(ring.toNonIndexed(), (p, n, o) => mixc(goldD, gold, smooth(-0.6, 0.8, n.y + n.z * 0.5), o)));
  const f = new THREE.CircleGeometry(0.34, 20).toNonIndexed();
  f.translate(0, 0, 0.02);
  parts.push(colorize(f, (p, n, o) => { o[0] = face[0]; o[1] = face[1]; o[2] = face[2]; }));
  const fb = new THREE.CircleGeometry(0.34, 20).toNonIndexed(); fb.rotateY(Math.PI); fb.translate(0, 0, -0.02);
  parts.push(colorize(fb, (p, n, o) => { o[0] = face[0]; o[1] = face[1]; o[2] = face[2]; }));
  for (const [w, h, a, c] of [[0.04, 0.22, 0, ink], [0.035, 0.16, 2.1, ink], [0.02, 0.26, -1, red]]) {
    for (const s of [1, -1]) {
      const g = new THREE.BoxGeometry(w, h, 0.01).toNonIndexed();
      g.translate(0, h / 2 - 0.02, 0); g.rotateZ(a); g.translate(0, 0, 0.035 * s);
      parts.push(colorize(g, (p, n, o) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }));
    }
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    for (const s of [1, -1]) {
      const g = new THREE.BoxGeometry(0.03, 0.06, 0.01).toNonIndexed();
      g.translate(0, 0.27, 0.03 * s); g.rotateZ(a);
      parts.push(colorize(g, (p, n, o) => { o[0] = ink[0]; o[1] = ink[1]; o[2] = ink[2]; }));
    }
  }
  // Glocke und Füßchen
  parts.push(colorize(new THREE.SphereGeometry(0.11, 8, 5).toNonIndexed().translate(0, 0.47, 0), (p, n, o) => mixc(goldD, gold, smooth(-0.5, 0.8, n.y), o)));
  for (const s of [-1, 1]) parts.push(colorize(new THREE.SphereGeometry(0.06, 6, 4).toNonIndexed().translate(s * 0.22, -0.4, 0), (p, n, o) => mixc(goldD, gold, 0.5, o)));
  return mrg(parts);
}

/**
 * Zeit-Uhren: list = [[x, y, z], …] (Mitte). Berühren → +sec Sekunden (Standard 10) Restzeit, Funkeln, Ansage
 * „+10“. Eine Instanz-Gruppe für alle (1 Zeichenaufruf). Liefert { got, list } (für Tests).
 */
export function zeitUhren(level, list, o = {}) {
  const sec = o.sec ?? 10;
  const st = { got: 0, items: list.map((p) => ({ x: p[0], y: p[1], z: p[2], taken: false, pop: 0 })) };
  let mesh = null;
  if (level.view) {
    mesh = new THREE.InstancedMesh(clockGeo(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.35, emissive: 0x332200 }), list.length);
    mesh.frustumCulled = false;
    mesh.castShadow = true;
    mesh.name = 'zier:uhren';
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    let t = 0;
    const holder = {};
    addObject(level, mesh, (dt) => {
      const d = visDt(level, holder, dt);
      t += d;
      st.items.forEach((it, i) => {
        if (it.taken) it.pop = Math.min(1, it.pop + d * 3);
        const k = it.taken ? 1 - it.pop : 1;
        v.set(it.x, it.y + Math.sin(t * 2.4 + i) * 0.12 + (it.taken ? it.pop * 1.2 : 0), it.z);
        e.set(0, t * 1.8 + i, 0); q.setFromEuler(e);
        sc.setScalar(Math.max(0.0001, k * 1.25));
        m4.compose(v, q, sc);
        mesh.setMatrixAt(i, m4);
      });
      mesh.instanceMatrix.needsUpdate = true;
    });
  }
  level.onStep(() => {
    for (const it of st.items) {
      if (it.taken) continue;
      for (const p of figs(level)) {
        const c = p.center();
        if (Math.abs(c.x - it.x) < 0.75 && Math.abs(c.y - it.y) < 0.95 && Math.abs(c.z - it.z) < 0.75) {
          it.taken = true; st.got++;
          level.runtime.timeLeft += sec;
          level.sfx('coin'); level.sfx('timewarn');
          level.effects?.sparks?.({ x: it.x, y: it.y, z: it.z }, 10);
          banner(level, `+${sec} Sekunden`, { hold: 0.6, size: 14 });
          break;
        }
      }
    }
  });
  if (o.id) level.named.set(o.id, st);
  return st;
}

// =====================================================================================================================
// Herbstwald
// =====================================================================================================================

const LEAF_COLS = [0xff7a1a, 0xffb21e, 0xe8402a, 0xc8501e, 0xffd03a];

function laubGeo() {
  const parts = [];
  const g = new THREE.SphereGeometry(0.85, 10, 6, 0, TAU, 0, Math.PI / 2);
  g.scale(1, 0.55, 1);
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i); const k = 1 + Math.sin(x * 6) * Math.cos(z * 5) * 0.08; P.setXYZ(i, x * k, y * (1 + Math.sin(x * 3 + z * 4) * 0.12), z * k); }
  g.computeVertexNormals();
  const cs = LEAF_COLS.map(L);
  parts.push(colorize(g.toNonIndexed(), (p, n, o) => { const k = Math.abs(Math.floor(p.x * 4.3 + p.z * 3.1 + p.y * 7)) % cs.length; mixc(cs[k], cs[(k + 2) % cs.length], 0.3, o); const sh = 0.75 + 0.25 * n.y; o[0] *= sh; o[1] *= sh; o[2] *= sh; }));
  for (let i = 0; i < 9; i++) {
    const a = i * 2.39, r = 0.25 + (i % 3) * 0.22;
    const lf = new THREE.CircleGeometry(0.13, 5).toNonIndexed();
    lf.scale(1, 0.6, 1); lf.rotateX(-Math.PI / 2 + 0.4); lf.rotateY(a);
    lf.translate(Math.cos(a) * r, 0.38 + Math.sin(i) * 0.05 - r * 0.25, Math.sin(a) * r);
    const c = cs[i % cs.length];
    parts.push(colorize(lf, (p, n, o) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }));
  }
  return mrg(parts);
}

/** Laubhaufen als level-lokale Entität (keine Registry-Art): Kollision Zylinder (breakable → Stampfen), Angriffe. */
const SCATTER = new Set(['claw', 'fire', 'shell', 'pound', 'bomb', 'mega', 'cannon', 'throw', 'slide', 'bite', 'punch', 'star']);
class Laubhaufen extends CourseEntity {
  constructor(level, h, scatter) {
    super(level, { pos: [h.x, h.y, h.z] }, 'laubhaufen');
    this.h = h; this.scatterFn = scatter;
    const r = 0.85 * h.s;
    this.half.set(r, 0.35 * h.s, r);
    this.addShape({ type: 'cyl', x: h.x, z: h.z, r: r * 0.85, y0: h.y, y1: h.y + 0.42 * h.s, breakable: true, tag: 'laubhaufen' });
  }
  onPlayer(p) {
    if (p.mode === 'ground' && (p.state === 'slide' || p.hSpeed() >= 5)) this.poof();
    return 'none';
  }
  onHit(kind) { if (SCATTER.has(kind)) this.poof(); }
  onPound() { this.poof(); }
  poof() { if (this.h.gone) return; this.removeShapes(); this.scatterFn(this.h); this.kill(); }
  update() {}
  render() {}
}

/**
 * Laubhaufen: list = [{ pos: [x, y, z], coins?: 3, size?: 1, content? (Aktion im Format von entities/gimmick.js, z. B.
 * { power: 'oneup' }) }]. Stampfen (auf oder neben dem Haufen: Stampfwelle), Hineinrennen (≥ 5 m/s), Rutschen,
 * Tatze/Schwanzhieb/Feuer/Kanone → Blätterwirbel und Münzen (bzw. content). Eine Instanz-Gruppe (mit Schatten) und
 * eine Punktwolke für den Wirbel. Liefert { piles } (für Tests: piles[i].gone).
 */
export function laubhaufen(level, list) {
  const piles = list.map((it) => ({ x: it.pos[0], y: it.pos[1], z: it.pos[2], s: it.size ?? 1, coins: it.coins ?? 3, content: it.content, gone: false, k: 0 }));
  let mesh = null, burst = null, geo = null;
  if (level.view) {
    mesh = new THREE.InstancedMesh(laubGeo(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), piles.length);
    mesh.frustumCulled = false; mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.name = 'zier:laub';
    // Blätterwirbel: Punktwolke (eine für alle Haufen)
    const N = 40;
    geo = new THREE.BufferGeometry();
    const arr = new Float32Array(N * 3), col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { const c = L(LEAF_COLS[i % LEAF_COLS.length]); col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2]; arr[i * 3 + 1] = -999; }
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.24, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false }));
    pts.frustumCulled = false;
    burst = { pts, arr, vel: new Float32Array(N * 3), life: 0, N };
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    const holder = {};
    const grp = new THREE.Group(); grp.add(mesh, pts);
    addObject(level, grp, (dt) => {
      const d = visDt(level, holder, dt);
      piles.forEach((h, i) => {
        if (h.gone) h.k = Math.min(1, h.k + d * 4);
        v.set(h.x, h.y, h.z);
        q.setFromAxisAngle(up, h.x * 1.3 + h.z);
        const s = Math.max(0.0001, h.s * (1 - h.k));
        sc.set(s, s, s);
        m4.compose(v, q, sc);
        mesh.setMatrixAt(i, m4);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (burst.life > 0) {
        burst.life -= d;
        for (let i = 0; i < burst.N; i++) {
          burst.vel[i * 3 + 1] -= 3.2 * d;
          burst.vel[i * 3] *= 1 - d * 1.2; burst.vel[i * 3 + 2] *= 1 - d * 1.2;
          burst.arr[i * 3] += burst.vel[i * 3] * d + Math.sin(burst.life * 9 + i) * d * 0.6;
          burst.arr[i * 3 + 1] += Math.max(-1.2, burst.vel[i * 3 + 1]) * d;
          burst.arr[i * 3 + 2] += burst.vel[i * 3 + 2] * d;
        }
        if (burst.life <= 0) for (let i = 0; i < burst.N; i++) burst.arr[i * 3 + 1] = -999;
        geo.attributes.position.needsUpdate = true;
      }
    });
  }
  const scatter = (h) => {
    if (h.gone) return;
    h.gone = true;
    level.sfx('brickbreak');
    level.effects?.dust?.({ x: h.x, y: h.y + 0.3, z: h.z }, 8, 1.3);
    if (burst) {
      burst.life = 1.6;
      for (let i = 0; i < burst.N; i++) {
        const a = i * 2.39, sp = 1.5 + (i % 5) * 0.5;
        burst.arr[i * 3] = h.x + Math.cos(a) * 0.3; burst.arr[i * 3 + 1] = h.y + 0.4; burst.arr[i * 3 + 2] = h.z + Math.sin(a) * 0.3;
        burst.vel[i * 3] = Math.cos(a) * sp; burst.vel[i * 3 + 1] = 2.5 + (i % 4) * 0.8; burst.vel[i * 3 + 2] = Math.sin(a) * sp;
      }
    }
    if (h.content) runAction(level, h.content, { pos: [h.x, h.y + 0.6, h.z] });
    else if (h.coins > 0) runAction(level, { coins: h.coins }, { pos: [h.x, h.y + 0.8, h.z] });
  };
  for (const h of piles) level.entities.push(new Laubhaufen(level, h, scatter));
  const api = { piles, scatter, get gone() { return piles.filter((h) => h.gone).length; } };
  level.named.set('laubhaufen', api);
  return api;
}

/** Kürbisse (statisch, Kollision Zylinder bei size ≥ 0.7): list = [[x, y, z, size, farbe?]]. */
export function kuerbisse(level, list) {
  const parts = [];
  for (const [x, y, z, s = 0.6, c = 0xff8a1a] of list) {
    const g = new THREE.SphereGeometry(s, 14, 8);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) { const px = P.getX(i), py = P.getY(i), pz = P.getZ(i); const a = Math.atan2(pz, px); const k = 1 - 0.07 * Math.pow(Math.abs(Math.cos(a * 4)), 0.5); P.setXYZ(i, px * k, py * 0.72, pz * k); }
    g.computeVertexNormals();
    const C = L(c), CD = [C[0] * 0.62, C[1] * 0.45, C[2] * 0.3];
    parts.push(place(g, (p, n, out) => { const a = Math.atan2(p.z, p.x); mixc(CD, C, 0.55 + 0.45 * Math.abs(Math.sin(a * 4 + Math.PI / 2)) * (0.6 + 0.4 * n.y), out); }, x, y + s * 0.68, z));
    const st = cylG(s * 0.07, s * 0.1, s * 0.4, 6);
    st.rotateZ(0.25);
    parts.push(place(st, litFn(0x5a7a2a), x, y + s * 1.55, z));
    const lf = new THREE.CircleGeometry(s * 0.22, 5); lf.rotateX(-1.1);
    parts.push(place(lf, litFn(0x4aa83a), x + s * 0.18, y + s * 1.42, z + s * 0.1));
    if (s >= 0.7) level.world.add({ type: 'cyl', x, z, r: s * 0.85, y0: y, y1: y + s * 1.4, tag: 'kuerbis' });
  }
  if (parts.length) for (let i = 0; i < parts.length; i += 30) addStatic(level, mrg(parts.slice(i, i + 30)));
}

/** Fliegenpilze (rote Kappe, weiße Punkte): list = [[x, y, z, size]]. */
export function fliegenpilze(level, list) {
  const parts = [];
  for (const [x, y, z, s = 0.6] of list) {
    parts.push(place(cylG(s * 0.16, s * 0.22, s * 0.7, 8), litFn(0xfaf4e6), x, y + s * 0.35, z));
    const cap = new THREE.SphereGeometry(s * 0.5, 12, 6, 0, TAU, 0, Math.PI / 2);
    cap.scale(1, 0.7, 1);
    const red = L(0xe8202a), w = L(0xffffff);
    parts.push(place(cap, (p, n, out) => { const dots = Math.sin(p.x * 31 / s) * Math.sin(p.z * 29 / s) * Math.cos(p.y * 23 / s) > 0.55; const c = dots ? w : red; out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; }, x, y + s * 0.66, z));
  }
  if (parts.length) addStatic(level, mrg(parts));
}

function squirrelGeo() {
  const parts = [];
  const fur = 0xc8642a, furL = 0xf0a060, belly = 0xfff0d8;
  parts.push(place(new THREE.SphereGeometry(0.17, 8, 6).scale(1.15, 1, 0.9), litFn(fur), 0, 0.2, 0));
  parts.push(place(new THREE.SphereGeometry(0.1, 6, 4).scale(0.6, 1, 0.8), litFn(belly), 0.12, 0.2, 0));
  parts.push(place(new THREE.SphereGeometry(0.12, 8, 6), litFn(fur), 0.16, 0.38, 0));
  for (const s of [-1, 1]) {
    parts.push(place(new THREE.ConeGeometry(0.035, 0.1, 5), litFn(fur), 0.14, 0.52, s * 0.06));
    parts.push(place(new THREE.SphereGeometry(0.025, 5, 4), litFn(0x111111), 0.26, 0.41, s * 0.05));
  }
  parts.push(place(new THREE.SphereGeometry(0.025, 5, 4), litFn(0x3a2a2a), 0.28, 0.37, 0));
  // buschiger Schwanz (geschwungen)
  for (let i = 0; i < 6; i++) {
    const t = i / 5, r = 0.09 + 0.06 * Math.sin(t * Math.PI);
    parts.push(place(new THREE.SphereGeometry(r, 7, 5), (p, n, out) => mixc(L(fur), L(furL), smooth(-0.4, 0.9, n.y), out), -0.18 - Math.sin(t * 2.2) * 0.14, 0.12 + t * 0.48, 0));
  }
  parts.push(place(new THREE.SphereGeometry(0.07, 6, 4), litFn(0x8a5a2a), 0.2, 0.26, 0.07));   // Nuss
  return mrg(parts);
}

/**
 * Eichhörnchen: list = [{ pos, spots?: [[x, y, z], …] (hüpft reihum), yaw? }]. Sitzen, schauen sich um, putzen,
 * hüpfen zum nächsten Platz (springen weg, wenn eine Figur näher als 2,5 m kommt). Je eins ein Mesh, kein Schattenwurf.
 */
export function eichhoernchen(level, list) {
  if (!level.view) return;
  const geo = squirrelGeo();
  for (const it of list) {
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }));
    mesh.castShadow = false;
    const spots = it.spots ?? [it.pos];
    let i = 0, t = 0, hop = 0, from = spots[0], to = spots[0], yaw = it.yaw ?? 0, wait = 1 + (it.pos[0] % 2);
    const holder = {};
    addObject(level, mesh, (dt) => {
      const d = visDt(level, holder, dt);
      t += d;
      const p = level.player;
      const near = p && Math.hypot(p.pos.x - to[0], p.pos.z - to[2]) < 2.5 && Math.abs(p.pos.y - to[1]) < 2;
      if (hop <= 0) {
        wait -= d;
        if ((wait <= 0 || near) && spots.length > 1) { from = to; i = (i + 1) % spots.length; to = spots[i]; hop = 1; yaw = Math.atan2(-(to[2] - from[2]), to[0] - from[0]); }
        const look = Math.sin(t * 1.7) * 0.6 + (Math.sin(t * 0.37) > 0.6 ? 1.2 : 0);
        mesh.position.set(to[0], to[1] + Math.abs(Math.sin(t * 5)) * 0.01, to[2]);
        mesh.rotation.set(0, yaw + look * 0.4, Math.sin(t * 9) * 0.03);
      } else {
        hop -= d * 1.6;
        const u = 1 - Math.max(0, hop);
        const h = Math.hypot(to[0] - from[0], to[2] - from[2]);
        mesh.position.set(from[0] + (to[0] - from[0]) * u, from[1] + (to[1] - from[1]) * u + Math.sin(u * Math.PI) * (0.5 + h * 0.15), from[2] + (to[2] - from[2]) * u);
        mesh.rotation.set(0, yaw, -0.4 + u * 0.8);
        if (hop <= 0) wait = 1.5 + ((i * 37) % 10) / 4;
      }
    });
  }
}

/** Nicht indizierte Geometrie nach innen kehren (Umlauf tauschen, Normalen umdrehen). */
function inward(g) {
  g = g.index ? g.toNonIndexed() : g;
  const P = g.attributes.position.array, N = g.attributes.normal.array;
  for (let i = 0; i < P.length; i += 9) {
    for (let k = 0; k < 3; k++) { const a = P[i + 3 + k]; P[i + 3 + k] = P[i + 6 + k]; P[i + 6 + k] = a; const b = N[i + 3 + k]; N[i + 3 + k] = N[i + 6 + k]; N[i + 6 + k] = b; }
  }
  for (let i = 0; i < N.length; i++) N[i] = -N[i];
  return g;
}

/**
 * Hohler Baum als Fallschacht (3-7 Fallraum): innen Rinde mit Längsrillen und Jahresringen, vorn (zur Kamera, +Z) offen,
 * Baumpilze als Einweg-Simse (shelves: [[Winkel, y, Breite]], Winkel 0 = hinten), oben ein Kranz Herbstlaub.
 * Kollision: drei Wände (hinten, links, rechts) als Quader innerhalb des Stamms, Simse oneWay. o: x, z, r, y0, y1.
 */
export function hohlerBaum(level, o) {
  const { x, z, r = 5.5, y0 = 1, y1 = 44 } = o;
  const H = y1 - y0, gap = Math.PI * 0.5;
  const bark = L(0x6a4428), barkD = L(0x3a2414), barkL = L(0x8a5a34), wood = L(0xc8945a);
  const parts = [];
  // Innenseite
  const inner = new THREE.CylinderGeometry(r, r, H, 28, Math.max(2, Math.round(H / 3)), true, gap / 2, Math.PI * 2 - gap);
  const gi = inward(inner.toNonIndexed());
  colorize(gi, (p, n, out) => { const a = Math.atan2(p.x, p.z); const groove = Math.abs(Math.sin(a * 14 + Math.sin(p.y * 0.3) * 0.6)); mixc(barkD, wood, 0.25 + 0.45 * groove * (0.7 + 0.3 * Math.sin(p.y * 0.9)), out); });
  gi.translate(x, y0 + H / 2, z);
  parts.push(gi);
  // Außenseite (Rinde) und Schnittkanten (helles Holz)
  const outer = new THREE.CylinderGeometry(r + 0.7, r + 0.9, H, 28, Math.max(2, Math.round(H / 3)), true, gap / 2, Math.PI * 2 - gap);
  parts.push(place(outer, (p, n, out) => { const a = Math.atan2(p.x, p.z); mixc(barkD, barkL, 0.3 + 0.5 * Math.abs(Math.sin(a * 22 + p.y * 0.2)), out); }, x, y0 + H / 2, z));
  for (const sg of [-1, 1]) {
    const th = sg * (gap / 2);
    const g = new THREE.BoxGeometry(0.9, H, 0.25);
    g.rotateY(th - Math.PI / 2);
    parts.push(place(g, (p, n, out) => mixc(wood, barkL, 0.3 + 0.3 * Math.sin(p.y * 2), out), x + Math.sin(th) * (r + 0.4), y0 + H / 2, z + Math.cos(th) * (r + 0.4)));
  }
  // Baumpilze (Simse) und Laubkranz oben
  for (const [a, y, w = 2.2] of o.shelves ?? []) {
    const sx = x + Math.sin(a + Math.PI) * (r - 0.6), sz = z + Math.cos(a + Math.PI) * (r - 0.6);
    const g = new THREE.CylinderGeometry(w / 2, w / 2 * 0.9, 0.3, 14, 1, false, 0, Math.PI * 2);
    g.scale(1, 1, 0.7);
    parts.push(place(g, (p, n, out) => mixc(L(0xb8642a), L(0xf0c070), smooth(-0.2, 0.9, n.y) * (0.6 + 0.4 * Math.sin(Math.hypot(p.x, p.z) * 9)), out), sx, y - 0.15, sz, a));
    level.world.add({ type: 'box', min: [sx - w * 0.4, y - 0.3, sz - w * 0.3], max: [sx + w * 0.4, y, sz + w * 0.3], oneWay: true, tag: 'baumpilz' });
  }
  const cs = LEAF_COLS.map(L);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 1.5) continue;   // vorn frei (Kamera)
    const g = new THREE.IcosahedronGeometry(1.6 + (i % 3) * 0.4, 0);
    const c = cs[i % cs.length];
    parts.push(place(g, (p, n, out) => mixc([c[0] * 0.55, c[1] * 0.45, c[2] * 0.4], c, smooth(-0.5, 0.8, n.y), out), x + Math.sin(a) * (r + 0.9), y1 + 1.4 + (i % 2) * 0.6, z + Math.cos(a) * (r + 0.9)));
  }
  for (let i = 0; i < parts.length; i += 12) addStatic(level, mrg(parts.slice(i, i + 12)), { castShadow: false });
  // Kollision: Rückwand und Seitenwände innerhalb des Stamms (die Front bleibt offen)
  const w = r * 0.86, t = 0.6;
  level.world.add({ type: 'box', min: [x - w, y0, z - w - t], max: [x + w, y1, z - w], tag: 'baum:wand' });
  level.world.add({ type: 'box', min: [x - w - t, y0, z - w], max: [x - w, y1, z + w * 0.7], tag: 'baum:wand' });
  level.world.add({ type: 'box', min: [x + w, y0, z - w], max: [x + w + t, y1, z + w * 0.7], tag: 'baum:wand' });
}

/** Herbstlaub auf dem Boden (flache Blätter, verschmolzen, ohne Schatten): list = [[x0, z0, x1, z1, y, n]]. */
export function laubTeppich(level, list) {
  const P = [];
  const cs = [...LEAF_COLS, 0xa8401a, 0xd89a2a].map(L);
  let k = 7;
  const r = () => { k = (k * 9301 + 49297) % 233280; return k / 233280; };
  for (const [x0, z0, x1, z1, y, n = 40] of list) {
    for (let i = 0; i < n; i++) {
      const x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0), s = 0.12 + r() * 0.12;
      const g = new THREE.CircleGeometry(s, 5);
      g.scale(1, 0.62, 1); g.rotateZ(r() * Math.PI); g.rotateX(-Math.PI / 2 + (r() - 0.5) * 0.3);
      const c = cs[Math.floor(r() * cs.length)], sh = 0.8 + r() * 0.3;
      P.push(place(g, (p, nn, o) => { o[0] = c[0] * sh; o[1] = c[1] * sh; o[2] = c[2] * sh; }, x, y + 0.02 + r() * 0.01, z, r() * TAU));
    }
  }
  for (let i = 0; i < P.length; i += 150) addStatic(level, mrg(P.slice(i, i + 150)), { castShadow: false });
}

/** Weiche runde Punkt-Textur (Gischt, Blasen). */
function softDot() {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Wasserfall: durchscheinender, fließender Vorhang (Shader mit wandernden Streifen) von top bis bottom über x0..x1 bei z,
 * Gischtwolke am Fuß (Punktwolke) und Abrisskante oben. 2 Zeichenaufrufe. Nur Darstellung.
 */
export function wasserfall(level, o) {
  if (!level.view) return;
  const { x0, x1, z, top, bottom } = o;
  const w = x1 - x0, h = top - bottom;
  const g = new THREE.PlaneGeometry(w, h, Math.max(2, Math.round(w)), Math.max(2, Math.round(h / 2)));
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) { const y = P.getY(i); const u = (h / 2 - y) / h; P.setZ(i, Math.sqrt(u) * (o.bulge ?? 1.2) + Math.sin(P.getX(i) * 1.7) * 0.08); }
  g.computeVertexNormals();
  const mat = new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, a: { value: new THREE.Color(o.light ?? 0xd8f6ff) }, b: { value: new THREE.Color(o.color ?? 0x2a90e0) }, op: { value: o.opacity ?? 0.3 }, fogColor: { value: new THREE.Color(0xf4e0c2) }, fogNear: { value: 60 }, fogFar: { value: 235 } },
    vertexShader: 'varying vec2 vUv; varying float vD; void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vD = -mv.z; gl_Position = projectionMatrix * mv; }',
    fragmentShader: `uniform float t; uniform vec3 a; uniform vec3 b; uniform float op; uniform vec3 fogColor; uniform float fogNear; uniform float fogFar;
      varying vec2 vUv; varying float vD;
      float h(float x) { return fract(sin(x * 127.1) * 43758.5453); }
      void main() {
        float col = floor(vUv.x * 90.0);
        float sp = 0.9 + h(col) * 0.7;
        float s = fract(vUv.y * 5.0 + t * sp + h(col + 3.0));
        float streak = smoothstep(0.0, 0.25, s) * (1.0 - smoothstep(0.55, 1.0, s));
        float edge = smoothstep(0.0, 0.04, vUv.x) * smoothstep(1.0, 0.96, vUv.x);
        vec3 c = mix(b, a, 0.12 + streak * 0.6);
        float foam = smoothstep(0.12, 0.0, vUv.y) + smoothstep(0.93, 1.0, vUv.y) * 0.6;
        c = mix(c, vec3(1.0), clamp(foam, 0.0, 1.0));
        float alpha = (op * (0.55 + 0.45 * streak) + foam * 0.3) * edge;
        float f = smoothstep(fogNear, fogFar, vD);
        gl_FragColor = vec4(mix(c, fogColor, f), alpha);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const fogC = level.view.theme?.fog;
  if (fogC) { mat.uniforms.fogColor.value.set(fogC.color); mat.uniforms.fogNear.value = fogC.near; mat.uniforms.fogFar.value = fogC.far; }
  const m = new THREE.Mesh(g, mat);
  m.position.set((x0 + x1) / 2, bottom + h / 2, z);
  m.renderOrder = 2;
  const holder = {};
  addObject(level, m, (dt) => { mat.uniforms.t.value += visDt(level, holder, dt) * (o.speed ?? 0.55); });
  // Gischt am Fuß
  const N = Math.min(120, Math.round(w * 6));
  const geo = new THREE.BufferGeometry();
  const arr = new Float32Array(N * 3);
  const seeds = Array.from({ length: N }, (_, i) => ({ x: x0 + ((i * 0.618) % 1) * w, ph: (i * 0.37) % 1, sp: 0.6 + ((i * 7) % 5) / 6 }));
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const dot = softDot();
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: o.spray ?? 1.4, map: dot, transparent: true, opacity: 0.6, depthWrite: false, sizeAttenuation: true }));
  pts.frustumCulled = false;
  let t = 0;
  const h2 = {};
  addObject(level, pts, (dt) => {
    t += visDt(level, h2, dt);
    seeds.forEach((s, i) => {
      const u = (t * s.sp * 0.5 + s.ph) % 1;
      arr[i * 3] = s.x + Math.sin(i * 3.1 + u * 4) * 0.6;
      arr[i * 3 + 1] = bottom + u * (o.sprayH ?? 3.5);
      arr[i * 3 + 2] = z + (o.bulge ?? 1.2) + 0.4 + u * 2.2 * Math.sin(i * 1.7) ;
    });
    geo.attributes.position.needsUpdate = true;
  });
}

/** Teich tief unten (nur Optik): Wasserfläche mit Schaum am Rand. rect [x0, z0, x1, z1], y. */
export function teich(level, rect, y, o = {}) {
  if (!level.view) return;
  const [x0, z0, x1, z1] = rect;
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, 12, 12);
  g.rotateX(-Math.PI / 2);
  const deep = L(o.deep ?? 0x1e78c0), shallow = L(o.color ?? 0x4ab8e8), foam = L(0xf0fbff);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, rx = (x1 - x0) / 2, rz = (z1 - z0) / 2;
  const gg = colorize(g.toNonIndexed(), (p, n, out) => { const e = Math.max(Math.abs(p.x) / rx, Math.abs(p.z) / rz); mixc(deep, shallow, smooth(0.2, 0.9, e), out); if (e > 0.93) mixc(out, foam, (e - 0.93) * 10, out); });
  gg.translate(cx, y, cz);
  const m = new THREE.Mesh(gg, new THREE.MeshBasicMaterial({ vertexColors: true, fog: true }));
  m.matrixAutoUpdate = false;
  m.updateMatrix();
  addObject(level, m);
}
