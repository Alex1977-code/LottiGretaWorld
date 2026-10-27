// Hilfen für die Halloween-Level H-4 „Hokuspokus-Hochhaus“ (Hexenturm, vertikal) und H-Burg „Gruselgala auf Schloss
// Schlotterstein“ (Gruselschloss, Graf Brummbär). Kein Level: exportiert kein LEVEL, die Level-Registry überspringt dieses
// Modul. Nur für diese beiden Level – die anderen Halloween-Level haben eigene Hilfsdateien (_helpers_a/_helpers_b).
// Gemeinsame Dateien werden nicht verändert; alles Level-Lokale hängt sich über die offiziellen Aufbau-Haken an
// (LEVEL.build / LEVEL.setup, Präzisierung „Leistung und Level-Haken 2“) und über level.onStep / view.onFrame.
//
//   1) Daten-Helfer     Inseln, Münz- und Süßigkeiten-Reihen, Schilder
//   2) Hexenturm H-4    turm (runder Turmstumpf mit begehbarer Oberseite, Brüstung mit Lücken, Fenstern, Kragsteinen,
//                       spitz in die Wolken auslaufendem Unterbau), hexenHut (Riesen-Hexenhut als Dach des Hauptturms:
//                       begehbare Krempe = Zielterrasse), hexenKueche (Tische, Regale, Fläschchen, Kräuterbündel),
//                       winkeKuerbis (Kürbis, der zurückwinkt), funkelSpur (Glitzer als Hinweis)
//   3) Schloss H-Burg   siehe unten (Burgmauern, Ahnengalerie, Kronleuchter, Schlossdach-Arena, kichernder Geist,
//                       Krümel mit Laterne, Stimmungen je Bereich)
// Statische Teile gehen über addStatic in die Abschnitts-Meshes (keine zusätzlichen Zeichenaufrufe; Leuchtendes in das
// Glüh-Material), belebte Kleinigkeiten sind je ein kleines Objekt ohne Sonnenschatten.

import * as THREE from 'three';
import { colorize, merge, lin, mixc, smooth, hex, addStatic, addObject, Rnd } from '../../blocks/kit.js';
import { getModel, hasModel } from '../../models/index.js';
import { visDt } from '../../entities/gimmick.js';
import { HWC, pumpkinGeo, faceGeo, softTexture } from '../../blocks/hwkit.js';

export const TAU = Math.PI * 2;
const PI = Math.PI;
const C = (h) => lin(hex(h));
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const fill = (g, col) => colorize(ni(g), (p, n, o) => { o[0] = col[0]; o[1] = col[1]; o[2] = col[2]; });
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
/** Winkel um die Hochachse wie LatheGeometry: 0 = +Z (zur Kamera), π/2 = +X, π = −Z. */
const angOf = (dx, dz) => Math.atan2(dx, dz);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/** Schlichter Quader (Mitte unten) mit Ober-/Unterseiten-Ton; o: { top, yaw, rx, rz }. */
export function blk(w, h, d, x, y, z, color, o = {}) {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  const c = C(color), top = o.top !== undefined ? C(o.top) : [c[0] * 1.15, c[1] * 1.15, c[2] * 1.15];
  colorize(g, (p, n, out) => {
    if (n.y > 0.5) { out[0] = top[0]; out[1] = top[1]; out[2] = top[2]; return; }
    const k = n.y < -0.5 ? 0.65 : 1 - Math.abs(n.x) * 0.1;
    out[0] = c[0] * k; out[1] = c[1] * k; out[2] = c[2] * k;
  });
  if (o.rx) g.rotateX(o.rx);
  if (o.rz) g.rotateZ(o.rz);
  g.translate(0, h / 2, 0);
  if (o.yaw) g.rotateY(o.yaw);
  g.translate(x, y, z);
  return g;
}

/** Zylinder (Mitte unten), Seite schattiert; o: { top, seg, open, rx, rz, yaw, center }. */
export function zyl(rTop, rBot, h, x, y, z, color, o = {}) {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, o.seg ?? 10, 1, !!o.open).toNonIndexed();
  const c = C(color), top = o.top !== undefined ? C(o.top) : [c[0] * 1.12, c[1] * 1.12, c[2] * 1.12];
  colorize(g, (p, n, out) => {
    if (n.y > 0.5) { out[0] = top[0]; out[1] = top[1]; out[2] = top[2]; return; }
    const k = 0.8 + 0.2 * smooth(-1, 1, n.x * 0.5 + n.z * 0.7);
    out[0] = c[0] * k; out[1] = c[1] * k; out[2] = c[2] * k;
  });
  if (o.rx) g.rotateX(o.rx);
  if (o.rz) g.rotateZ(o.rz);
  g.translate(0, o.center ? 0 : h / 2, 0);
  if (o.yaw) g.rotateY(o.yaw);
  g.translate(x, y, z);
  return g;
}

/** Statische Teile je 32-m-Abschnitt verschmelzen (enge Abschnitts-Quader). */
export function bake(level, parts, opts) {
  if (!level.view || !parts.length) return;
  const by = new Map();
  for (const g of parts) {
    g.computeBoundingBox();
    const s = Math.floor(-((g.boundingBox.min.z + g.boundingBox.max.z) / 2) / 32);
    if (!by.has(s)) by.set(s, []);
    by.get(s).push(g);
  }
  for (const list of by.values()) addStatic(level, merge(list), opts);
}

// =====================================================================================================================
// 1) Daten-Helfer
// =====================================================================================================================

/** Insel über ihre Grundfläche x0..x1, zA..zB (Reihenfolge egal), Oberseite top, Höhe h; o: weitere Felder. */
export function isl(x0, x1, zA, zB, top, h = 6, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  return { type: 'island', pos: [(x0 + x1) / 2, top - h, (z0 + z1) / 2], size: [x1 - x0, h, z0 - z1], top: 'stone', under: 0, ...o };
}
/** Münzreihe von a nach b. */
export const line = (a, b, n) => ({ kind: 'coins', from: a, to: b, n });
/** Münzring um c. */
export const ring = (c, r, n) => ({ kind: 'coins', pos: c, r, n });
/** Münzbogen von a nach b mit Scheitel h über der Geraden (n Münzen). */
export function arc(a, b, n, h) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    out.push({ kind: 'coin', pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * h * t * (1 - t), a[2] + (b[2] - a[2]) * t] });
  }
  return out;
}
/** Süßigkeiten-Reihe (je +1 Bitcoin). */
export const naschen = (a, b, n, variant) => ({ kind: 'suessigkeiten', from: a, to: b, n, ...(variant ? { variant } : {}) });
/** Süßigkeiten-Kreis. */
export const naschKreis = (c, r, n, variant) => ({ kind: 'suessigkeiten', pos: c, r, n, ...(variant ? { variant } : {}) });
/** Holzschild. */
export const sign = (x, y, z, text, o = {}) => ({ type: 'sign', pos: [x, y, z], text, ...o });

// =====================================================================================================================
// 2) Hexenturm (H-4)
// =====================================================================================================================

const STONE = {
  lila: [0xb8a8d0, 0x8a78ac, 0x5e4e7e],
  grau: [0xb4b0c4, 0x8a86a0, 0x5a5670],
  gruen: [0xa8c0b0, 0x7a9a88, 0x4a6a5a],
  rosa: [0xd8b0d0, 0xa8809e, 0x7a5a78],
};
const FLOORS = {
  holz: [0xd29a5a, 0xa8743e, 0x6a4424],
  stein: [0xd0c4e4, 0xa898c4, 0x6a5a88],
  kessel: [0x9ad890, 0x6aa87a, 0x3a6a4a],
};

/**
 * Runder Turmstumpf mit begehbarer Oberseite (Kollision: Zylinder bis top, darunter depth m), Brüstung mit Lücken,
 * Kragsteinen, leuchtenden Fenstern und spitz in die Wolken auslaufendem Unterbau (nur Optik).
 *   t = { x, z, r, top, depth: 6, under: 16, floor: 'holz' | 'stein' | 'kessel', rim: 0.7 (Höhe; 0 = keine),
 *         gaps: [[a, halbe Breite], …] (Lücken in der Brüstung; a = Winkel atan2(dx, dz): 0 = +Z/Kamera, π = −Z, π/2 = +X),
 *         windows: [[a, y], …] (y relativ zu top), glow: 0x8aff6a (Fensterlicht), color: 'lila' | 'grau' | 'gruen' |
 *         'rosa', lean: 0.8 (Schiefe des Unterbaus), shadow: true, id }
 *   Liefert { x, z, r, top } (für Tests).
 */
export function turm(level, t) {
  const r = t.r, top = t.top, depth = t.depth ?? 6, under = t.under ?? 16;
  const rimH = t.rim ?? 0.7;
  const gaps = t.gaps ?? [[0, 0.45], [PI, 0.45]];
  const inGap = (a, pad = 0) => gaps.some(([g, h]) => Math.abs(wrap(a - g)) < h + pad);
  level.world.add({ type: 'cyl', x: t.x, z: t.z, r, y0: top - depth, y1: top, tag: t.tag ?? 'turm' });
  if (rimH > 0) {
    const rr = r - 0.22, N = Math.max(8, Math.round((TAU * rr) / 0.5));
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU;
      if (inGap(a, 0.04)) continue;
      level.world.add({ type: 'cyl', x: t.x + Math.sin(a) * rr, z: t.z + Math.cos(a) * rr, r: 0.26, y0: top, y1: top + rimH, camIgnore: true, noWallSlide: true, tag: 'turm:bruestung' });
    }
  }
  const out = { x: t.x, z: t.z, r, top };
  if (t.id) level.named.set(t.id, out);
  if (!level.view) return out;
  const [s0, s1, s2] = (STONE[t.color ?? 'lila'] ?? STONE.lila).map(C);
  const moss = C(0x6a9a5a), mortar = C(0x4a3e5e);
  const parts = [], glow = [];
  const rnd = new Rnd(Math.round(t.x * 13 + t.z * 7 + top * 3));
  const lean = t.lean ?? 0.8, ph = rnd.real(0, TAU);
  // Wand + Unterbau als Drehkörper (Profil von unten nach oben), Unterbau schief und spitz
  const prof = [];
  const yB = top - depth - under;
  const NS = 14;
  for (let i = 0; i <= NS; i++) {
    const k = i / NS;
    const y = yB + (top - 0.3 - yB) * k;
    let rad;
    if (y >= top - depth) rad = r * (1 + 0.025 * Math.sin((y - top) * 0.9 + ph));
    else { const u = (top - depth - y) / under; rad = r * (1 - 0.82 * u * u) * (1 + 0.03 * Math.sin(y * 1.3 + ph)); }
    prof.push(new THREE.Vector2(Math.max(0.25, rad), y));
  }
  const wall = new THREE.LatheGeometry(prof, Math.max(18, Math.round(r * 9))).toNonIndexed();
  const wp = wall.attributes.position;
  for (let i = 0; i < wp.count; i++) {
    const y = wp.getY(i);
    if (y < top - depth) { const u = (top - depth - y) / under; wp.setX(i, wp.getX(i) + lean * u * u * Math.cos(ph)); wp.setZ(i, wp.getZ(i) + lean * 0.5 * u * u * Math.sin(ph)); }
  }
  wall.computeVertexNormals();
  wall.translate(t.x, 0, t.z);
  parts.push(colorize(wall, (p, n, o) => {
    const yy = top - p.y, row = Math.floor(yy / 0.55);
    const a = angOf(p.x - t.x, p.z - t.z) + (row % 2) * 0.09;
    const cols = Math.max(10, Math.round(r * 5));
    const fa = ((a / TAU) * cols % 1 + 1) % 1;
    const seam = fa < 0.06 || (yy % 0.55) < 0.06;
    const tone = Math.sin(row * 1.7 + Math.floor((a / TAU) * cols) * 2.3) * 0.5 + 0.5;
    mixc(s0, s1, 0.25 + tone * 0.45, o);
    mixc(o, s2, smooth(0, depth + under * 0.6, yy) * 0.75, o);
    if (seam) mixc(o, mortar, 0.55, o);
    // Moos unter der Kante und in Flecken
    const m = smooth(0.25, 1.6, yy) * (1 - smooth(1.6, 3.2, yy)) * (0.5 + 0.5 * Math.sin(a * 5 + ph));
    const patch = Math.max(0, Math.sin(a * 3 + yy * 0.7 + ph) * Math.sin(yy * 1.1 - a * 2)) > 0.72 ? 0.6 : 0;
    mixc(o, moss, Math.max(m * 0.7, patch) * smooth(0, 6, yy + 1), o);
  }));
  // Kragstein-Kranz unter der Kante
  const lip = new THREE.CylinderGeometry(r + 0.16, r - 0.05, 0.42, Math.max(18, Math.round(r * 9)), 1, true).toNonIndexed();
  lip.translate(t.x, top - 0.21 - 0.08, t.z);
  parts.push(colorize(lip, (p, n, o) => { mixc(s1, s0, 0.5, o); const a = angOf(p.x - t.x, p.z - t.z); if (((a / TAU) * Math.round(r * 6) % 1 + 1) % 1 < 0.12) mixc(o, mortar, 0.6, o); }));
  const NK = Math.max(8, Math.round(r * 4));
  for (let i = 0; i < NK; i++) {
    const a = ((i + 0.5) / NK) * TAU;
    const g = blk(0.32, 0.5, 0.42, 0, 0, 0, 0x7a6a98, { top: 0x9a8ab8 });
    g.translate(0, -0.85, r + 0.05);
    g.rotateY(a);
    g.translate(t.x, top, t.z);
    parts.push(g);
  }
  // Boden
  const [f0, f1, f2] = (FLOORS[t.floor ?? 'holz'] ?? FLOORS.holz).map(C);
  const fl = new THREE.CircleGeometry(r + 0.12, Math.max(18, Math.round(r * 9))).toNonIndexed();
  fl.rotateX(-PI / 2); fl.translate(t.x, top + 0.012, t.z);
  const wood = (t.floor ?? 'holz') === 'holz';
  parts.push(colorize(fl, (p, n, o) => {
    const dx = p.x - t.x, dz = p.z - t.z, rr = Math.hypot(dx, dz);
    if (wood) {
      const plank = Math.floor((dx + 50) / 0.42);
      const seam = ((dx + 50) / 0.42) % 1 < 0.08 || (((dz + 50) + (plank % 3) * 0.7) / 2.1) % 1 < 0.03;
      mixc(f0, f1, (Math.sin(plank * 2.7) * 0.5 + 0.5) * 0.7, o);
      if (seam) mixc(o, f2, 0.75, o);
    } else {
      const ringI = Math.floor(rr / 0.9), a = angOf(dx, dz);
      const seam = (rr / 0.9) % 1 < 0.07 || ((a / TAU) * (6 + ringI * 5) % 1 + 1) % 1 < 0.04;
      mixc(f0, f1, (Math.sin(ringI * 2.1 + Math.floor((a / TAU) * (6 + ringI * 5)) * 1.3) * 0.5 + 0.5) * 0.6, o);
      if (seam) mixc(o, f2, 0.65, o);
    }
    if (rr > r - 0.12) mixc(o, s1, 0.6, o);
  }));
  // Goldener Zauberkreis auf dem Boden (Glüh-Material, sanft)
  if (t.circle !== false && r >= 2.6) {
    const rc = Math.min(r - 0.9, 2.6);
    const ringG = new THREE.RingGeometry(rc - 0.09, rc, 40).toNonIndexed();
    ringG.rotateX(-PI / 2); ringG.translate(t.x, top + 0.02, t.z);
    glow.push(fill(ringG, C(t.circleColor ?? 0xe8c060)));
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU + ph;
      const st = new THREE.CircleGeometry(0.16, 5).toNonIndexed();
      st.rotateX(-PI / 2); st.translate(t.x + Math.sin(a) * (rc - 0.4), top + 0.022, t.z + Math.cos(a) * (rc - 0.4));
      glow.push(fill(st, C(t.circleColor ?? 0xe8c060)));
    }
  }
  // Brüstung (Lathe-Stücke zwischen den Lücken) mit Zinnen-Kappen
  if (rimH > 0) {
    const sorted = gaps.map(([g, h]) => [((g - h) % TAU + TAU) % TAU, ((g + h) % TAU + TAU) % TAU]).sort((a, b) => a[0] - b[0]);
    const solid = [];
    if (!sorted.length) solid.push([0, TAU]);
    for (let i = 0; i < sorted.length; i++) {
      const a0 = sorted[i][1], a1 = sorted[(i + 1) % sorted.length][0];
      let len = a1 - a0; if (len <= 0) len += TAU;
      if (len > 0.05) solid.push([a0, len]);
    }
    const pr = [[r + 0.02, top], [r + 0.02, top + rimH], [r - 0.42, top + rimH], [r - 0.42, top]].map(([a, b]) => new THREE.Vector2(a, b));
    for (const [a0, len] of solid) {
      const seg = Math.max(3, Math.round(len * r * 2.2));
      const g = new THREE.LatheGeometry(pr, seg, a0, len).toNonIndexed();
      g.translate(t.x, 0, t.z);
      parts.push(colorize(g, (p, n, o) => { mixc(s1, s0, n.y > 0.5 ? 0.9 : 0.45, o); const a = angOf(p.x - t.x, p.z - t.z); if (n.y < 0.5 && ((a / TAU) * Math.round(r * 7) % 1 + 1) % 1 < 0.07) mixc(o, mortar, 0.55, o); }));
      const nm = Math.floor((len * r) / 1.3);
      for (let k = 1; k < nm; k++) {
        const a = a0 + (k / nm) * len;
        if (k % 2) continue;
        const g2 = blk(0.5, 0.32, 0.46, 0, 0, 0, 0x9a8ab8, { top: 0xc8b8e0 });
        g2.translate(0, top + rimH, r - 0.2);
        g2.rotateY(a);
        g2.translate(t.x, 0, t.z);
        parts.push(g2);
      }
    }
  }
  // Fenster (Bogenfenster mit Licht, Rahmen, Fensterbank)
  const gl = C(t.glow ?? 0x8aff6a), glHi = C(0xf0ffd0);
  for (const [a, dy] of t.windows ?? []) {
    const y = top + dy;
    const w = 0.62, h = 0.95;
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h - w / 2); s.absarc(0, h - w / 2, w / 2, 0, PI, false); s.lineTo(-w / 2, 0);
    const pane = new THREE.ShapeGeometry(s, 8).toNonIndexed();
    pane.translate(0, 0, r * 1.02 + 0.03);
    pane.rotateY(a); pane.translate(t.x, y, t.z);
    glow.push(colorize(pane, (p, n, o) => mixc(gl, glHi, smooth(y, y + h, p.y) * 0.6, o)));
    const frame = blk(w + 0.22, 0.12, 0.3, 0, 0, 0, 0x5a3e2e, { top: 0x8a5a3a });
    frame.translate(0, y - 0.1, r * 1.02 + 0.08); frame.rotateY(a); frame.translate(t.x, 0, t.z);
    parts.push(frame);
    for (const sd of [-1, 1]) {
      const sh = blk(0.26, h * 0.9, 0.06, 0, 0, 0, sd < 0 ? 0x3a8a5a : 0x8a4ae0, { top: 0xffffff });
      sh.translate(sd * (w / 2 + 0.2), y + 0.04, r * 1.02 + 0.04); sh.rotateY(a); sh.translate(t.x, 0, t.z);
      parts.push(sh);
    }
  }
  bake(level, parts, { castShadow: t.shadow !== false, receiveShadow: true });
  if (glow.length) bake(level, glow, { material: 'glow', castShadow: false });
  return out;
}

/**
 * Riesen-Hexenhut als Dach des Hauptturms: krummer, lila Spitzhut mit orangem Band, goldener Schnalle und gelben Sternchen;
 * die Krempe ist begehbar (Zielterrasse), darunter der Turm mit Fenstern.
 *   h = { x, z, y (Oberseite der Krempe), r: 5 (Hut unten), brim: 9.5, height: 13, bend: 2.6, tower: 6.4 (Turmradius
 *         unter der Krempe), depth: 8 }
 */
export function hexenHut(level, h) {
  const { x, z, y } = h;
  const R = h.r ?? 5, B = h.brim ?? 9.5, H = h.height ?? 13, bend = h.bend ?? 2.6;
  // Krempe (Boden), Hut-Kern bis 6 m (darüber kommt niemand hin), Turm darunter
  level.world.add({ type: 'cyl', x, z, r: B, y0: y - 0.55, y1: y, tag: 'hutkrempe' });
  level.world.add({ type: 'cyl', x, z, r: R, y0: y, y1: y + 6.2, noWallSlide: true, tag: 'hexenhut' });
  level.world.add({ type: 'cyl', x, z, r: h.tower ?? 6.4, y0: y - (h.depth ?? 8), y1: y - 0.55, tag: 'hauptturm' });
  if (!level.view) return;
  const parts = [], glow = [];
  const felt = C(0x6a34b0), feltHi = C(0x9a68e0), feltLow = C(0x3a1a6a), band = C(0xff8a1a), bandHi = C(0xffc04a), gold = C(0xffd04a), star = C(0xfff08a);
  // Kegel (Drehkörper mit Knautschfalten), Spitze nach links gebogen und eingerollt
  const prof = [];
  const N = 22;
  for (let i = 0; i <= N; i++) {
    const k = i / N;
    const rad = R * Math.pow(1 - k, 1.15) * (1 + 0.035 * Math.sin(k * 26)) + 0.04;
    prof.push(new THREE.Vector2(rad, y + k * H));
  }
  const cone = new THREE.LatheGeometry(prof, 36).toNonIndexed();
  const cp = cone.attributes.position;
  for (let i = 0; i < cp.count; i++) {
    const k = (cp.getY(i) - y) / H;
    cp.setX(i, cp.getX(i) - bend * Math.pow(k, 2.6));
    cp.setY(i, cp.getY(i) - bend * 0.35 * Math.pow(k, 4));
  }
  cone.computeVertexNormals();
  cone.translate(x, 0, z);
  const starAt = (a, yy) => { const u = (a / TAU) * 9, v = (yy - y) / 1.6; const fu = u - Math.round(u), fv = v - Math.round(v + 0.5 * (Math.round(u) % 2)) + 0.5 * (Math.round(u) % 2); return Math.hypot(fu * 1.6, fv * 1.2) < 0.18; };
  parts.push(colorize(cone, (p, n, o) => {
    const k = (p.y - y) / H;
    mixc(feltLow, felt, smooth(-0.5, 0.6, n.y * 0.4 + n.z * 0.5 + n.x * 0.2), o);
    mixc(o, feltHi, smooth(0.3, 1, n.z * 0.6 + n.y * 0.3) * 0.5, o);
    if (p.y > y + 0.5 && p.y < y + 1.7) mixc(band, bandHi, smooth(-0.3, 0.9, n.z + n.y), o);
    else if (k > 0.12 && starAt(angOf(p.x - x, p.z - z), p.y)) mixc(o, star, 0.85, o);
  }));
  // Krempe: Ring mit hochgebogenem Rand
  const brim = new THREE.RingGeometry(R * 0.9, B, 48, 3).toNonIndexed();
  brim.rotateX(-PI / 2); brim.translate(x, y + 0.01, z);
  parts.push(colorize(brim, (p, n, o) => {
    const rr = Math.hypot(p.x - x, p.z - z), a = angOf(p.x - x, p.z - z);
    mixc(felt, feltHi, 0.25 + 0.2 * Math.sin(rr * 3), o);
    if (((a / TAU) * 32 % 1 + 1) % 1 < 0.05) mixc(o, feltLow, 0.35, o);
  }));
  const edge = new THREE.TorusGeometry(B, 0.28, 8, 64).toNonIndexed();
  edge.rotateX(PI / 2); edge.translate(x, y - 0.1, z);
  parts.push(colorize(edge, (p, n, o) => mixc(feltLow, feltHi, smooth(-0.6, 0.9, n.y), o)));
  const under = new THREE.CylinderGeometry(B, B * 0.97, 0.5, 48, 1, true).toNonIndexed();
  under.translate(x, y - 0.3, z);
  parts.push(colorize(under, (p, n, o) => mixc(feltLow, felt, 0.3, o)));
  // Schnalle vorn (+Z) auf dem Band
  const bz = R * 0.93;
  for (const [w, hh, dx, dy] of [[1.3, 0.14, 0, 0.5], [1.3, 0.14, 0, 1.56], [0.14, 1.2, -0.58, 0.5], [0.14, 1.2, 0.58, 0.5]]) {
    const g = blk(w, hh, 0.16, x + dx, y + dy, z + bz + 0.1, 0xffd04a, { top: 0xfff0a0 });
    parts.push(g);
  }
  // Turm unter der Krempe (Fenster leuchten grün)
  const TR = h.tower ?? 6.4, TD = (h.depth ?? 8) + 18;
  const tw = new THREE.CylinderGeometry(TR, TR * 0.55, TD, 40, 8, true).toNonIndexed();
  tw.translate(x, y - 0.5 - TD / 2, z);
  const s0 = C(0xb8a8d0), s1 = C(0x8a78ac), s2 = C(0x4e3e6e), mortar = C(0x4a3e5e);
  parts.push(colorize(tw, (p, n, o) => {
    const yy = y - p.y, row = Math.floor(yy / 0.6);
    const a = angOf(p.x - x, p.z - z) + (row % 2) * 0.05;
    const fa = ((a / TAU) * 36 % 1 + 1) % 1;
    mixc(s0, s1, 0.3 + 0.4 * (Math.sin(row * 1.7 + Math.floor((a / TAU) * 36) * 2.3) * 0.5 + 0.5), o);
    mixc(o, s2, smooth(0, TD * 0.8, yy) * 0.8, o);
    if (fa < 0.05 || yy % 0.6 < 0.06) mixc(o, mortar, 0.5, o);
  }));
  for (const [a, dy] of [[0.35, -2.6], [-0.5, -5.2], [0.9, -7.5], [-1.1, -3.4], [0.05, -9.8]]) {
    const w = 0.8, hh = 1.2;
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, hh - w / 2); s.absarc(0, hh - w / 2, w / 2, 0, PI, false); s.lineTo(-w / 2, 0);
    const pane = new THREE.ShapeGeometry(s, 8).toNonIndexed();
    pane.translate(0, 0, TR + 0.04); pane.rotateY(a); pane.translate(x, y + dy, z);
    glow.push(fill(pane, C(0x8aff6a)));
  }
  bake(level, parts, { castShadow: true });
  bake(level, glow, { material: 'glow', castShadow: false });
}

/**
 * Hexenküche: Tische mit Fläschchen (leuchten), Regale an der Rückwand, Kräuterbündel an einem Balken, Besen an der Wand,
 * Kürbisstapel. list = [{ kind: 'tisch' | 'regal' | 'balken' | 'besen' | 'fass', pos: [x, y, z], yaw?, len? }].
 * Tische und Fässer sind fest (Kollision), Regale stehen an Wänden (fest), Balken/Besen sind Zier.
 */
export function hexenKueche(level, list) {
  const parts = [], glow = [];
  const bottle = [0x7aff4a, 0xc59aff, 0xff8a2a, 0x6ad8ff, 0xff5a8a, 0xffd23a];
  const rnd = new Rnd(31);
  for (const it of list) {
    const [x, y, z] = it.pos, yaw = it.yaw ?? 0, len = it.len ?? 3;
    const cs = Math.cos(yaw), sn = Math.sin(yaw);
    const P = (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
    if (it.kind === 'tisch') {
      level.world.add({ type: 'box', min: [x - (Math.abs(cs) * len + Math.abs(sn) * 1.1) / 2, y, z - (Math.abs(sn) * len + Math.abs(cs) * 1.1) / 2], max: [x + (Math.abs(cs) * len + Math.abs(sn) * 1.1) / 2, y + 0.9, z + (Math.abs(sn) * len + Math.abs(cs) * 1.1) / 2], tag: 'tisch' });
      parts.push(blk(len, 0.12, 1.1, x, y + 0.78, z, HWC.wood, { top: HWC.woodHi, yaw }));
      for (const [lx, lz] of [[-len / 2 + 0.15, -0.4], [len / 2 - 0.15, -0.4], [-len / 2 + 0.15, 0.4], [len / 2 - 0.15, 0.4]]) { const [px, pz] = P(lx, lz); parts.push(blk(0.12, 0.78, 0.12, px, y, pz, HWC.woodLow)); }
      const nb = Math.max(2, Math.round(len * 1.4));
      for (let i = 0; i < nb; i++) {
        const lx = -len / 2 + 0.3 + (i / Math.max(1, nb - 1)) * (len - 0.6), lz = rnd.real(-0.3, 0.3);
        const [px, pz] = P(lx, lz);
        const col = bottle[i % bottle.length], hb = rnd.real(0.18, 0.32);
        glow.push(zyl(0.09, 0.11, hb, px, y + 0.9, pz, col, { seg: 7 }));
        const neck = zyl(0.035, 0.05, 0.12, px, y + 0.9 + hb, pz, 0xe8e0f0, { seg: 6 });
        parts.push(neck);
        parts.push(zyl(0.05, 0.05, 0.04, px, y + 1.02 + hb, pz, 0x8a5a2a, { seg: 6 }));
      }
    } else if (it.kind === 'regal') {
      const h = it.h ?? 2.4;
      level.world.add({ type: 'box', min: [x - (Math.abs(cs) * len + Math.abs(sn) * 0.5) / 2, y, z - (Math.abs(sn) * len + Math.abs(cs) * 0.5) / 2], max: [x + (Math.abs(cs) * len + Math.abs(sn) * 0.5) / 2, y + h, z + (Math.abs(sn) * len + Math.abs(cs) * 0.5) / 2], tag: 'regal' });
      const back = blk(len, h, 0.08, 0, 0, 0, HWC.woodLow, { yaw });
      const [bkx, bkz] = P(0, -0.22);
      back.translate(bkx, y, bkz);
      parts.push(back);
      for (const sd of [-1, 1]) { const [px, pz] = P(sd * (len / 2 - 0.04), 0); parts.push(blk(0.08, h, 0.5, px, y, pz, HWC.wood, { yaw })); }
      for (let k = 0; k < 4; k++) {
        const sy = y + 0.3 + k * ((h - 0.4) / 3);
        const [px, pz] = P(0, 0);
        parts.push(blk(len, 0.07, 0.5, px, sy, pz, HWC.wood, { top: HWC.woodHi, yaw }));
        if (k === 3) continue;
        const nb = Math.round(len * 2.2);
        for (let i = 0; i < nb; i++) {
          const lx = -len / 2 + 0.2 + (i / Math.max(1, nb - 1)) * (len - 0.4);
          const [bx, bz] = P(lx, rnd.real(-0.1, 0.1));
          if (rnd.frac() < 0.5) {
            const hb = rnd.real(0.16, 0.3);
            glow.push(zyl(0.07, 0.09, hb, bx, sy + 0.07, bz, bottle[(i + k) % bottle.length], { seg: 6 }));
          } else {
            const bw = rnd.real(0.08, 0.14), bh = rnd.real(0.26, 0.4);
            parts.push(blk(bw, bh, 0.3, bx, sy + 0.07, bz, [0x8a2a4a, 0x2a5a8a, 0x3a7a3a, 0x7a4a9a, 0xb86a2a][(i * 3 + k) % 5], { yaw }));
          }
        }
      }
    } else if (it.kind === 'balken') {
      const [ax, az] = P(-len / 2, 0), [bx, bz] = P(len / 2, 0);
      const h = it.h ?? 3;
      parts.push(blk(len, 0.22, 0.22, x, y + h, z, HWC.woodLow, { yaw }));
      for (const [px, pz] of [[ax, az], [bx, bz]]) parts.push(blk(0.2, h, 0.2, px, y, pz, HWC.woodLow));
      const nk = Math.round(len / 0.7);
      for (let i = 1; i < nk; i++) {
        const lx = -len / 2 + (i / nk) * len;
        const [px, pz] = P(lx, 0);
        const L = rnd.real(0.4, 0.7);
        parts.push(zyl(0.012, 0.012, L * 0.4, px, y + h - L * 0.4, pz, 0xc8b890, { seg: 4 }));
        const herb = new THREE.ConeGeometry(0.16, L * 0.6, 6).toNonIndexed();
        herb.translate(px, y + h - L * 0.4 - L * 0.3, pz);
        parts.push(colorize(herb, (p, n, o) => mixc(C(i % 3 ? 0x4a8a3a : 0x8a6a3a), C(i % 3 ? 0x8ad06a : 0xd0a85a), smooth(-0.6, 0.8, n.y + n.x * 0.3), o)));
      }
    } else if (it.kind === 'besen') {
      const stick = zyl(0.04, 0.05, 1.7, 0, 0, 0, HWC.woodLow, { seg: 6 });
      stick.rotateZ(0.25); stick.rotateY(yaw); stick.translate(x, y + 0.25, z);
      parts.push(stick);
      const br = new THREE.ConeGeometry(0.22, 0.6, 9, 1, true).toNonIndexed();
      br.rotateX(PI); br.rotateZ(0.25); br.translate(0.08, 0.3, 0); br.rotateY(yaw); br.translate(x, y, z);
      parts.push(colorize(br, (p, n, o) => mixc(C(HWC.strawLow), C(HWC.straw), smooth(-0.6, 0.8, n.y + Math.sin(p.y * 40 + p.x * 30) * 0.3), o)));
    } else if (it.kind === 'fass') {
      level.world.add({ type: 'cyl', x, z, r: 0.5, y0: y, y1: y + 1.1, tag: 'fass' });
      const g = new THREE.CylinderGeometry(0.46, 0.46, 1.1, 12, 4).toNonIndexed();
      const gp = g.attributes.position;
      for (let i = 0; i < gp.count; i++) { const yy = gp.getY(i); const k = 1 + 0.12 * (1 - (yy / 0.55) ** 2); gp.setX(i, gp.getX(i) * k); gp.setZ(i, gp.getZ(i) * k); }
      g.computeVertexNormals(); g.translate(x, y + 0.55, z);
      parts.push(colorize(g, (p, n, o) => { mixc(C(HWC.woodLow), C(HWC.wood), smooth(-0.6, 0.9, n.x * 0.5 + n.z * 0.5 + n.y), o); const yy = p.y - y; if (Math.abs(yy - 0.2) < 0.05 || Math.abs(yy - 0.9) < 0.05) mixc(o, C(HWC.iron), 0.8, o); }));
    }
  }
  bake(level, parts, { castShadow: true });
  if (glow.length) bake(level, glow, { material: 'glow', castShadow: false });
}

/**
 * Kürbis, der zurückwinkt: großer Kürbis mit Lachgesicht und einem Ranken-Ärmchen mit Blatt-Hand. Kommt eine Figur näher
 * als near m, dreht er sich zu ihr, hüpft fröhlich und winkt (level.named.get(id) = { waves, state }). Fest (Zylinder).
 *   o = { id, pos: [x, y, z], size: 1.3, yaw (Blick, Standard zur Kamera), near: 6 }
 */
export function winkeKuerbis(level, o) {
  const [x, y, z] = o.pos;
  const s = o.size ?? 1.3;
  const st = { waves: 0, state: 'ruhig', t: 0, k: 0 };
  if (o.id) level.named.set(o.id, st);
  level.world.add({ type: 'cyl', x, z, r: s * 0.46, y0: y, y1: y + s * 0.82, tag: 'kuerbis' });
  const near = o.near ?? 6;
  level.onStep((dt) => {
    const p = level.player;
    const d = p ? Math.hypot(p.pos.x - x, p.pos.z - z) : 99;
    st.t += dt;
    if (d < near && st.state === 'ruhig') { st.state = 'winkt'; st.t = 0; st.waves++; }
    else if (d > near + 2 && st.state === 'winkt' && st.t > 2) st.state = 'ruhig';
  });
  if (!level.view) return st;
  const root = new THREE.Group();
  root.position.set(x, y, z);
  const body = new THREE.Group();
  root.add(body);
  const pk = pumpkinGeo({ r: s / 2, shape: 'dick', color: 'orange', leafYaw: 1.2, seg: 24 });
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 });
  const mb = new THREE.Mesh(pk.body, mat);
  mb.castShadow = true;
  body.add(mb);
  const face = new THREE.Mesh(faceGeo({ r: s / 2, shape: 'dick', kind: 'lachen' }), new THREE.MeshBasicMaterial({ vertexColors: true }));
  body.add(face);
  // Ärmchen: Ranke mit Blatt-Hand (lokal: Schulter an der rechten Seite, Blick +X)
  const shoulder = new THREE.Group();
  shoulder.position.set(0.05, s * 0.45, -s * 0.5);
  const vine = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.05, 0.18, -0.12), new THREE.Vector3(0.02, 0.38, -0.18), new THREE.Vector3(0, 0.55, -0.12)]), 10, 0.045, 5);
  const vineM = new THREE.Mesh(vine, new THREE.MeshStandardMaterial({ color: 0x4a9a3a, roughness: 0.7 }));
  shoulder.add(vineM);
  const hand = new THREE.Mesh(new THREE.CircleGeometry(0.2, 7), new THREE.MeshStandardMaterial({ color: 0x5ed04a, side: THREE.DoubleSide, roughness: 0.6 }));
  hand.scale.set(1, 1.25, 1);
  hand.position.set(0.02, 0.68, -0.1);
  hand.rotation.y = PI / 2;
  shoulder.add(hand);
  body.add(shoulder);
  root.rotation.y = o.yaw ?? -PI / 2;
  const baseYaw = root.rotation.y;
  level.view.shadows?.add?.({ pos: new THREE.Vector3(x, y, z), radius: s * 0.5, alive: () => true, visible: () => true });
  const hold = {};
  addObject(level, root, (dt, t) => {
    const d = visDt(level, hold, dt);
    const on = st.state === 'winkt';
    st.k = clamp(st.k + (on ? d * 3 : -d * 2), 0, 1);
    const p = level.player;
    let want = baseYaw;
    if (on && p) want = Math.atan2(-(p.pos.z - z), p.pos.x - x);
    root.rotation.y += wrap(want - root.rotation.y) * Math.min(1, d * 4);
    const hop = on ? Math.abs(Math.sin(t * 6)) * 0.18 * st.k : Math.sin(t * 1.6) * 0.015;
    body.position.y = hop;
    body.scale.set(1 + (on ? 0.04 * Math.sin(t * 12) : 0), 1 - (on ? 0.03 * Math.sin(t * 12) : 0), 1);
    shoulder.rotation.x = -0.4 - st.k * 1.5 + Math.sin(t * (on ? 11 : 2)) * (0.15 + st.k * 0.45);
  });
  return st;
}

/** Leuchtpunkte (additiv, ein Zeichenaufruf): pts [[x, y, z], …], Farbe, Größe (m). */
export function funkelSpur(level, pts, color = 0xfff0a0, size = 0.9, o = {}) {
  if (!level.view || !pts.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts.flat(), 3));
  const m = new THREE.PointsMaterial({ map: softTexture(), color, size, sizeAttenuation: true, transparent: true, opacity: o.opacity ?? 0.75, blending: THREE.AdditiveBlending, depthWrite: false });
  const P = new THREE.Points(g, m);
  P.renderOrder = 5;
  P.name = o.name ?? 'funkeln';
  addObject(level, P, (dt, t) => { m.opacity = (o.opacity ?? 0.75) * (0.7 + 0.3 * Math.sin(t * 3)); });
  return P;
}
