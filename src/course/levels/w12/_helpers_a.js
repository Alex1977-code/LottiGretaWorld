// Hilfen des Levels K-1 „Siegerstraße über dem Wolkenmeer“ (Welt Krone „Kronen-Gipfel“, die Abschlussprüfung). Kein LEVEL –
// die Level-Registry überspringt dieses Modul. Nur für K-1; gemeinsame Dateien werden nicht verändert. Alles hängt sich über die
// offiziellen Aufbau-Haken an (LEVEL.prebuild / LEVEL.build / LEVEL.setup, Präzisierung „Leistung und Level-Haken 2“) und über
// level.onStep / view.onFrame.
//
//   1) Daten-Helfer   line/ring/arc/column (Bitcoin-Pfade), sign, marmor (Marmorinsel über ihre Grundfläche), block (bunter
//                     Schwebeblock über seine Grundfläche), Bld (Sammler für statische Zier)
//   2) Stimmung       kronenHimmel (LEVEL.prebuild): lokale Themen-Variante „Kronen-Gipfel“ – tiefblauer Zenit, Gold und Pfirsich
//                     am Horizont, warme Sonne; tief unten ein Wolkenmeer, aus dem Marmorgipfel mit goldenen Spitzen ragen, dazu
//                     ferne schwebende Goldkronen (Kulisse, unbeleuchtet)
//   3) Zier           goldkanten (Goldleisten um Marmorinseln), geruest (goldenes Aufzugsgerüst), fahnen (Fahnenmasten mit
//                     wehenden Wimpeln – ein Objekt), ballons (schwebende Ballontrauben – ein Objekt), zauberkreis (leuchtender
//                     Kreis der Zauberarena), sockel, sternchen (funkelnde Sterne, Glüh-Material)
//   4) Mechanik       piepTakt (Warn-Pieps der Piep-Blöcke, wenn ihre Uhr der Levelmusik folgt), goldenerZielmast (der Zielmast
//                     bekommt ein goldenes Kleid mit Krone und Kronenfahne), siegesfeier (Konfetti und Feuerwerk, sobald der Mast
//                     gegriffen ist; Krümel und seine Freunde jubeln)
// Statische Teile gehen über addStatic in die Abschnitts-Meshes (keine zusätzlichen Zeichenaufrufe); belebte Kleinigkeiten sind je
// ein Mesh ohne Sonnenschatten.

import * as THREE from 'three';
import { lin, mixc, smooth, colorize, merge, addStatic, addObject, Rnd } from '../../blocks/kit.js';
import { Build } from '../../models/lib/kit.js';
import { getModel, hasModel } from '../../models/index.js';
import { banner } from '../../blocks/w3kit.js';
import { cloudFloor } from '../../view/backdrop_w6.js';

export const PI = Math.PI;
const TAU = Math.PI * 2;
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const fill = (c) => (p, n, o) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; };
export { banner };

// =====================================================================================================================
// 1) Daten-Helfer
// =====================================================================================================================

export const line = (a, b, n, o = {}) => ({ kind: 'coins', from: a, to: b, n, ...o });
export const ring = (p, r, n, o = {}) => ({ kind: 'coins', pos: p, r, n, ...o });
/** Münzbogen von a nach b (Scheitel h m über der Verbindungslinie), n Einzel-Münzen. */
export function arc(a, b, n, h = 1.5, o = {}) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0.5 : i / (n - 1);
    out.push({ kind: 'coin', pos: [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u + Math.sin(u * PI) * h, a[2] + (b[2] - a[2]) * u], ...o });
  }
  return out;
}
export const column = (x, z, y0, y1, n, o = {}) => line([x, y0, z], [x, y1, z], n, o);
export const sign = (x, y, z, text, o = {}) => ({ type: 'sign', pos: [x, y, z], text, size: o.size ?? [2.8, 0.95], yaw: o.yaw ?? 0, ...o });

/** Marmorinsel über [x0, x1] × [zA, zB] mit Oberseite top (Körper h m hoch); gold: Goldleiste um die Oberkante (build). */
export function marmor(x0, x1, zA, zB, top, h = 3, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  return { type: 'island', pos: [(x0 + x1) / 2, top - h, (z0 + z1) / 2], size: [Math.abs(x1 - x0), h, z0 - z1], top: 'stone', under: o.under ?? 2, gold: o.gold ?? true, ...o };
}

/** Bunter Schwebeblock (Baustein platform, Stil block) über [x0, x1] × [zA, zB] mit Oberseite top. */
export function block(x0, x1, zA, zB, top, color, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB), h = o.h ?? 1;
  return { type: 'platform', pos: [(x0 + x1) / 2, top - h, (z0 + z1) / 2], size: [Math.abs(x1 - x0), h, z0 - z1], style: 'block', color, ...o };
}

/**
 * Sammler für statische Zier (Weltkoordinaten; Mitte unten): b.box(w, h, d, x, y, z, farbe, { r, yaw, rx, rz }),
 * b.cyl(rTop, rBot, h, x, y, z, farbe, seg, o), b.sphere(r, x, y, z, farbe, { s }), b.cone(r, h, x, y, z, farbe, seg),
 * b.torus(R, t, x, y, z, farbe, { rx, yaw }), b.add(g, farbe, o); b.flush(level, { material: 'glow' | 'world', castShadow }).
 */
export class Bld {
  constructor() { this.b = new Build(); this.n = 0; }
  box(w, h, d, x, y, z, color, o = {}) { this.b.box(w, h, d, color, { p: [x, y + h / 2, z], r: [o.rx ?? 0, o.yaw ?? 0, o.rz ?? 0] }, o.r ?? 0.04, o.seg ?? 1); this.n++; return this; }
  cyl(rTop, rBot, h, x, y, z, color, seg = 10, o = {}) { this.b.cyl(rTop, rBot, h, color, { p: [x, y + h / 2, z], r: [o.rx ?? 0, o.yaw ?? 0, o.rz ?? 0] }, seg, !!o.open); this.n++; return this; }
  sphere(r, x, y, z, color, o = {}) { this.b.sphere(r, color, { p: [x, y, z], s: o.s ?? 1, r: [o.rx ?? 0, o.yaw ?? 0, o.rz ?? 0] }, o.ws ?? 10, o.hs ?? 7); this.n++; return this; }
  cone(r, h, x, y, z, color, seg = 8, o = {}) { this.b.cone(r, h, color, { p: [x, y + h / 2, z], r: [o.rx ?? 0, o.yaw ?? 0, o.rz ?? 0], s: o.s ?? 1 }, seg); this.n++; return this; }
  torus(R, t, x, y, z, color, o = {}) { this.b.torus(R, t, color, { p: [x, y, z], r: [o.rx ?? 0, o.yaw ?? 0, o.rz ?? 0] }, o.rs ?? 6, o.ts ?? 16, o.arc ?? TAU); this.n++; return this; }
  add(g, color, o) { this.b.add(g, color, o); this.n++; return this; }
  geometry() { if (!this.n) return null; this.n = 0; const g = this.b.geometry(); this.b = new Build(); return g; }
  flush(level, opts) {
    const g = this.geometry();
    if (!g) return;
    if (!level.view) { g.dispose(); return; }
    addStatic(level, g, opts);
  }
}

/** Oben hell, unten dunkler (Licht von oben) – Bld-Farbe je Ecke. */
export const litTop = (base, k = 0.72) => {
  const M = new THREE.Color(base), T = M.clone().multiplyScalar(1.14), D = M.clone().multiplyScalar(k), c = new THREE.Color();
  return { v: (x, y, z, nx, ny) => (ny >= 0 ? c.copy(M).lerp(T, ny) : c.copy(M).lerp(D, -ny)) };
};
/** Senkrechter Verlauf zwischen y0 (Farbe a) und y1 (Farbe b). */
export const gradY = (a, b, y0, y1) => {
  const A = new THREE.Color(a), B = new THREE.Color(b), c = new THREE.Color();
  return { v: (x, y) => c.copy(A).lerp(B, Math.min(1, Math.max(0, (y - y0) / (y1 - y0)))) };
};

export const GOLD = 0xffc83a, GOLD_HELL = 0xffe28a, GOLD_DUNKEL = 0xd8962a, MARMOR = 0xfaf6f0, ROT = 0xe8283a;

// =====================================================================================================================
// 2) Stimmung: lokale Themen-Variante „Kronen-Gipfel“ (LEVEL.prebuild)
// =====================================================================================================================

/**
 * Kronen-Gipfel über den Wolken (LEVEL.prebuild): das gemeinsame Thema (skyway) bleibt unverändert, das Level setzt eine lokale
 * Variante – tiefes Himmelblau oben, Gold und Pfirsich am Horizont, warme Sonne; Marmor-/Sandsteinfarben für Inseln und Steine.
 * Kulisse (Sky-Gruppe, unbeleuchtet): Wolkenmeer tief unten, Marmorgipfel mit goldenen Spitzen rundum, ferne schwebende Goldkronen
 * und die große Siegerkrone über dem Ziel.
 */
export function kronenHimmel(level, o = {}) {
  const v = level.view;
  if (!v) return null;
  const base = v.theme;
  const th = {
    ...base,
    label: 'Kronen-Gipfel',
    sky: [[1, 0x1a56d6], [0.5, 0x3888f0], [0.2, 0x88c4ff], [0.07, 0xffe6b4], [0, 0xffd090], [-0.1, 0xfbe4d2], [-1, 0xe2e8f6]],
    background: 0xf6e2c6,
    fog: { color: 0xf6e6d6, near: 110, far: 380 },
    hemi: { sky: 0xeef4ff, ground: 0xd8b88a, intensity: 1.4 },
    sun: { color: 0xfff0d0, intensity: 2.75, dir: [-0.45, 1, 0.5] },
    sunDisc: true,
    clouds: true,
    backdrop: 'krone',
    grassTop: 0x86dc5a, grassTop2: 0x78d04e, grassRim: 0xb8f290, grassSide: 0x52b83e,
    dirt: 0xead2ac, dirtDeep: 0xc8a47a, rock: 0xe6d6c0, rockDeep: 0xa88a6c,
    stone: MARMOR, stoneDark: 0xd6c8b8,
    wood: 0xfff4e8, woodDark: 0xc8a070,
    climb: 0xf4e4c8, climbDark: 0xc8a878,
    water: 0x4ac4ff, waterDeep: 0x1a7ad8,
    buildBackdrop(sky, bounds, rnd, yBase) {
      const y = Math.min(bounds.min.y, yBase) - (o.below ?? 22);
      cloudFloor(sky, bounds, rnd, y, { n: 90, top: 0xffffff, shade: 0xf4e4dc, deep: 0xdcc8d8 });
      kronenKulisse(sky, bounds, rnd, y, o);
    },
  };
  const k = v.toyLight;
  v.theme = th;
  if (v.three.background?.isColor) v.three.background.set(th.background);
  if (v.three.fog) { v.three.fog.color.set(th.fog.color); v.three.fog.near = th.fog.near; v.three.fog.far = th.fog.far; }
  if (v.hemi) { v.hemi.color.set(th.hemi.sky); v.hemi.groundColor.set(th.hemi.ground); v.hemi.intensity = th.hemi.intensity * (k?.hemi ?? 1); }
  if (v.sun) { v.sun.color.set(th.sun.color); v.sun.intensity = th.sun.intensity * (k?.sun ?? 1); }
  v.sunDir?.set(...th.sun.dir).normalize();
  const sky = v.sky;
  if (sky) {
    sky.theme = th;
    if (sky.domeGroup) sky.group.remove(sky.domeGroup);
    sky.buildDome();
  }
  return th;
}

/** Krone (Ursprung Mitte des Reifs unten): Reif, fünf Zacken mit Perlen, Edelsteine. */
function kroneGeo(R, H, parts, at, gold = [0xffc83a, 0xfff0a8]) {
  const [cx, cy, cz] = at;
  const g0 = lin(gold[0]), g1 = lin(gold[1]);
  const ringG = new THREE.CylinderGeometry(R, R * 0.96, H * 0.36, 24, 1, true);
  ringG.translate(cx, cy + H * 0.18, cz);
  parts.push(colorize(ni(ringG), (p, n, out) => mixc(g0, g1, smooth(-0.2, 0.9, n.y + 0.35), out)));
  const band = new THREE.TorusGeometry(R * 1.01, H * 0.06, 6, 24);
  band.rotateX(PI / 2); band.translate(cx, cy + H * 0.05, cz);
  parts.push(colorize(ni(band), (p, n, out) => mixc(lin(0xc81830), lin(0xff5a6a), smooth(-0.5, 1, n.y), out)));
  const gems = [0xe8283a, 0x2a6ae8, 0x2ac85a, 0xe8283a, 0x2a6ae8];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    const x = cx + Math.cos(a) * R, z = cz + Math.sin(a) * R;
    const sp = new THREE.ConeGeometry(R * 0.28, H * 0.7, 6);
    sp.translate(x, cy + H * 0.36 + H * 0.35, z);
    parts.push(colorize(ni(sp), (p, n, out) => mixc(g0, g1, smooth(-0.3, 0.8, n.y), out)));
    const pearl = new THREE.SphereGeometry(R * 0.13, 8, 6);
    pearl.translate(x, cy + H * 1.08, z);
    parts.push(colorize(ni(pearl), fill([1, 0.97, 0.9])));
    const gem = new THREE.OctahedronGeometry(R * 0.11, 0);
    gem.translate(cx + Math.cos(a + 0.63) * R * 1.04, cy + H * 0.2, cz + Math.sin(a + 0.63) * R * 1.04);
    const gc = lin(gems[i]);
    parts.push(colorize(ni(gem), fill(gc)));
  }
}

/** Kulisse: Marmorgipfel mit Goldspitzen, schwebende Goldkronen, Siegerkrone über dem Ziel. */
function kronenKulisse(sky, bounds, rnd, y, o) {
  const parts = [];
  const x0 = bounds.min.x, x1 = bounds.max.x, z0 = bounds.min.z, z1 = bounds.max.z;
  const peak = (bx, bz, h, rad) => {
    const g = new THREE.ConeGeometry(rad, h, 7, 2);
    g.translate(bx, y + h / 2 - 4, bz);
    const tipA = lin(0xffe8a0), tipB = lin(0xfff8e0), sideA = lin(0xc8a898), sideB = lin(0xf2e2d2);
    parts.push(colorize(ni(g), (p, n, out) => (p.y > y + h * 0.66 - 4 ? mixc(tipA, tipB, smooth(-0.2, 0.9, n.y), out) : mixc(sideA, sideB, smooth(y - 4, y + h, p.y), out))));
    // Goldband unter der Spitze
    const t = new THREE.TorusGeometry(rad * 0.36, rad * 0.035, 5, 14);
    t.rotateX(PI / 2); t.translate(bx, y + h * 0.66 - 4, bz);
    parts.push(colorize(ni(t), fill(lin(0xffc83a))));
  };
  // Gipfel links und rechts entlang des ganzen Kurses, dazu hinter dem Ziel
  for (const side of [-1, 1]) {
    for (let z = z1 + 60; z > z0 - 80; z -= rnd.real(46, 70)) {
      const x = side < 0 ? x0 - rnd.real(80, 150) : x1 + rnd.real(80, 150);
      peak(x, z + rnd.real(-12, 12), rnd.real(40, 78), rnd.real(16, 30));
    }
  }
  for (let x = x0 - 160; x < x1 + 160; x += rnd.real(48, 70)) peak(x, z0 - rnd.real(120, 190), rnd.real(50, 90), rnd.real(20, 32));
  // schwebende Goldkronen (fern) und die Siegerkrone über dem Ziel
  for (const c of o.crowns ?? []) kroneGeo(c.r, c.h, parts, c.pos);
  const g = merge(parts);
  if (!g) return;
  const mesh = new THREE.Mesh(sky.track(g), sky.track(new THREE.MeshBasicMaterial({ vertexColors: true, fog: true })));
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  mesh.name = 'k1:kulisse';
  sky.group.add(mesh);
}

// =====================================================================================================================
// 3) Zier
// =====================================================================================================================

/** Goldleisten um die Oberkanten aller Marmorinseln (segments mit gold: true) und Edelstein-Nieten an den Ecken. */
export function goldkanten(level) {
  if (!level.view) return;
  const b = new Bld(), g = new Bld();
  for (const s of level.data.segments) {
    if (s.type !== 'island' || !s.gold) continue;
    const [cx, y0, cz] = s.pos, [w, h, d] = s.size, top = y0 + h;
    const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz + d / 2, z1 = cz - d / 2;
    const t = 0.16, y = top - 0.34;
    b.box(w + 0.16, 0.18, t, cx, y, z0 + 0.06, GOLD, { r: 0.05 });
    b.box(w + 0.16, 0.18, t, cx, y, z1 - 0.06, GOLD, { r: 0.05 });
    b.box(t, 0.18, d + 0.16, x0 - 0.06, y, cz, GOLD, { r: 0.05 });
    b.box(t, 0.18, d + 0.16, x1 + 0.06, y, cz, GOLD, { r: 0.05 });
    // zweite, schmale Leiste weiter unten (Sockelprofil)
    if (h >= 1.5) {
      const y2 = top - 1.1;
      b.box(w + 0.12, 0.1, 0.12, cx, y2, z0 + 0.05, GOLD_DUNKEL, { r: 0.03 });
      b.box(0.12, 0.1, d + 0.12, x0 - 0.05, y2, cz, GOLD_DUNKEL, { r: 0.03 });
      b.box(0.12, 0.1, d + 0.12, x1 + 0.05, y2, cz, GOLD_DUNKEL, { r: 0.03 });
    }
    // Rubin-Nieten an den vorderen Ecken
    for (const x of [x0 - 0.08, x1 + 0.08]) g.sphere(0.13, x, y + 0.09, z0 + 0.08, 0xff4a5a, { ws: 8, hs: 6 });
  }
  b.flush(level, { castShadow: false });
  g.flush(level, { material: 'glow', castShadow: false });
}

/** Funkelnde Sternchen (Glüh-Material, statisch): list [[x, y, z, size, farbe?] …]. */
export function sternchen(level, list) {
  if (!level.view) return;
  const g = new Bld();
  for (const [x, y, z, s = 0.4, c = 0xfff0a0] of list) {
    const sh = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const a = PI / 2 + (i / 10) * TAU, r = i % 2 ? s * 0.45 : s; const px = Math.cos(a) * r, py = Math.sin(a) * r; if (i) sh.lineTo(px, py); else sh.moveTo(px, py); }
    g.add(new THREE.ExtrudeGeometry(sh, { depth: s * 0.25, bevelEnabled: false }), c, { p: [x, y, z] });
  }
  g.flush(level, { material: 'glow', castShadow: false });
}

/**
 * Goldenes Aufzugsgerüst: Eckpfosten, Querstreben, Laufschienen der Aufzüge, Glühbirnen-Reihen.
 * o = { x0, x1, z0, z1, y0, y1, rails: [[x, z, y0, y1] …] (Führungsschienen der Aufzüge) }
 */
export function geruest(level, o) {
  if (!level.view) return;
  const b = new Bld(), g = new Bld();
  const { x0, x1, z0, z1, y0, y1 } = o;
  const posts = [];
  for (let z = z0; z >= z1 - 0.01; z -= o.every ?? 11) for (const x of [x0, x1]) posts.push([x, z]);
  for (const [x, z] of posts) {
    b.box(0.5, y1 - y0, 0.5, x, y0, z, GOLD, { r: 0.08 });
    b.box(0.8, 0.5, 0.8, x, y1, z, GOLD_HELL, { r: 0.12 });
    g.sphere(0.24, x, y1 + 0.75, z, 0xfff4c0, { ws: 10, hs: 8 });
  }
  // Querstreben (je 6 m) zwischen den Pfostenpaaren und entlang der Seiten
  for (let y = y0 + 4; y < y1; y += 6) {
    for (let z = z0; z >= z1 - 0.01; z -= o.every ?? 11) b.box(x1 - x0, 0.22, 0.22, (x0 + x1) / 2, y, z, GOLD_DUNKEL, { r: 0.05 });
    for (const x of [x0, x1]) b.box(0.22, 0.22, z0 - z1, x, y + 3, (z0 + z1) / 2, GOLD_DUNKEL, { r: 0.05 });
  }
  // Glühbirnen entlang der oberen Längsträger
  for (const x of [x0, x1]) for (let z = z0; z > z1; z -= 1.6) g.sphere(0.1, x, y1 + 0.55, z, (Math.round(z) & 1) ? 0xffe880 : 0xff8aa0, { ws: 6, hs: 4 });
  for (const x of [x0, x1]) b.box(0.3, 0.3, z0 - z1, x, y1 + 0.2, (z0 + z1) / 2, GOLD, { r: 0.06 });
  // Führungsschienen der Aufzüge
  for (const [x, z, ya, yb] of o.rails ?? []) for (const dx of [-1.45, 1.45]) b.box(0.16, yb - ya + 0.6, 0.16, x + dx, ya - 0.3, z, 0xfff4e0, { r: 0.04 });
  b.flush(level);
  g.flush(level, { material: 'glow', castShadow: false });
}

/** Sockel/Säule aus Marmor mit Goldring oben (statisch, ohne Kollision): list [[x, z, yTop, h, r] …]. */
export function sockel(level, list) {
  if (!level.view) return;
  const b = new Bld();
  for (const [x, z, top, h, r = 0.8] of list) {
    b.cyl(r, r * 1.15, h, x, top - h, z, gradY(0xd8c8b8, MARMOR, top - h, top), 12);
    b.torus(r * 1.02, 0.09, x, top - 0.12, z, GOLD, { rx: PI / 2, ts: 18 });
  }
  b.flush(level);
}

/**
 * Fahnenmasten (Gold mit Kugel) mit wehenden Fahnen: ein Objekt für alle Tücher (Vertex-Schwingen im Bild).
 * list [[x, y, z, Masthöhe, Farbe] …]
 */
export function fahnen(level, list) {
  if (!level.view || !list.length) return;
  const b = new Bld(), g = new Bld();
  for (const [x, y, z, h] of list) {
    b.cyl(0.07, 0.09, h, x, y, z, 0xfff4e0, 8);
    b.cyl(0.18, 0.22, 0.25, x, y, z, GOLD, 10);
    g.sphere(0.16, x, y + h + 0.1, z, GOLD_HELL, { ws: 8, hs: 6 });
  }
  b.flush(level, { castShadow: false });
  g.flush(level, { material: 'glow', castShadow: false });
  const COLS = { rot: 0xe8283a, blau: 0x2a6ae8, gold: 0xffc21a, gruen: 0x2ac85a, lila: 0x9a4ae8, rosa: 0xff6ab0, weiss: 0xfff8ee };
  const pos = [], col = [], base = [];
  for (const [x, y, z, h, c] of list) {
    const k = lin(COLS[c] ?? c ?? COLS.rot), kd = k.map((v) => v * 0.7);
    const W = 1.3, H = 0.8, nx = 6;
    for (let i = 0; i < nx; i++) {
      const u0 = i / nx, u1 = (i + 1) / nx;
      const quad = [[u0, 0], [u1, 0], [u1, 1], [u0, 0], [u1, 1], [u0, 1]];
      for (const [u, w] of quad) {
        pos.push(x + 0.08 + u * W, y + h - 0.2 - (1 - w) * H, z);
        base.push(u, x, z);
        const kk = (i & 1) ? kd : k;
        col.push(kk[0], kk[1], kk[2]);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.7 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  const P = geo.getAttribute('position');
  let t = 0;
  addObject(level, mesh, (dt) => {
    t += dt;
    for (let i = 0; i < P.count; i++) {
      const u = base[i * 3], bx = base[i * 3 + 1], bz = base[i * 3 + 2];
      P.setZ(i, bz + Math.sin(t * 4.2 + u * 5 + bx * 0.3) * 0.18 * u);
    }
    P.needsUpdate = true;
  });
}

/** Schwebende Ballontrauben (ein Objekt, wippen sacht): list [[x, y, z, n] …]. */
export function ballons(level, list) {
  if (!level.view || !list.length) return;
  const b = new Bld();
  const COL = [0xff4a5a, 0x3a8aff, 0xffd23a, 0x4ad86a, 0xff7ac0, 0xa86aff];
  const rnd = new Rnd(77);
  for (const [x, y, z, n = 5] of list) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rnd.real(-0.3, 0.3), r = i === 0 ? 0 : 0.55;
      const bx = x + Math.cos(a) * r, bz = z + Math.sin(a) * r, by = y + 1.6 + (i === 0 ? 0.6 : rnd.real(0, 0.4));
      b.sphere(0.48, bx, by, bz, litTop(COL[(i + Math.round(x)) % COL.length], 0.75), { s: [1, 1.18, 1], ws: 12, hs: 9 });
      b.cone(0.09, 0.14, bx, by - 0.62, bz, COL[(i + Math.round(x)) % COL.length], 6);
      b.add(new THREE.CylinderGeometry(0.012, 0.012, by - 0.6 - y, 4), 0xfff8f0, { p: [(bx + x) / 2, (by - 0.6 + y) / 2, (bz + z) / 2] });
    }
    b.box(0.5, 0.36, 0.5, x, y - 0.36, z, 0xc8864a, { r: 0.08 });   // Körbchen
  }
  const g = b.geometry();
  if (!g) return;
  const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35 }));
  mesh.frustumCulled = false;
  let t = 0;
  addObject(level, mesh, (dt) => { t += dt; mesh.position.y = Math.sin(t * 0.8) * 0.35; mesh.rotation.y = Math.sin(t * 0.3) * 0.004; });
}

/** Leuchtender Zauberkreis am Boden (Zauberarena): zwei Ringe, Sternzacken, Runenpunkte – ein Objekt, pulsiert. */
export function zauberkreis(level, cx, y, cz, R = 9) {
  if (!level.view) return;
  const g = new Bld();
  g.torus(R, 0.09, cx, y + 0.03, cz, 0xc88aff, { rx: PI / 2, ts: 64, rs: 4 });
  g.torus(R * 0.8, 0.06, cx, y + 0.03, cz, 0xffe0ff, { rx: PI / 2, ts: 56, rs: 4 });
  for (let i = 0; i < 5; i++) {
    const a0 = PI / 2 + (i / 5) * TAU, a1 = PI / 2 + ((i + 2) / 5) * TAU;
    const ax = cx + Math.cos(a0) * R * 0.8, az = cz + Math.sin(a0) * R * 0.8, bx = cx + Math.cos(a1) * R * 0.8, bz = cz + Math.sin(a1) * R * 0.8;
    const L = Math.hypot(bx - ax, bz - az);
    g.box(L, 0.04, 0.12, (ax + bx) / 2, y + 0.02, (az + bz) / 2, 0xd8a0ff, { yaw: -Math.atan2(bz - az, bx - ax), r: 0.01 });
  }
  for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; g.sphere(0.16, cx + Math.cos(a) * R * 0.9, y + 0.1, cz + Math.sin(a) * R * 0.9, i % 2 ? 0xffe8ff : 0xb86aff, { ws: 6, hs: 4 }); }
  const geo = g.geometry();
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false });
  const mesh = new THREE.Mesh(geo, mat);
  let t = 0;
  addObject(level, mesh, (dt) => { t += dt; mat.opacity = 0.62 + 0.28 * Math.sin(t * 2.4); });
}

// =====================================================================================================================
// 4) Mechanik
// =====================================================================================================================

/**
 * Warn-Pieps der Piep-Blöcke: folgt die Taktuhr (level.beepClock) der Levelmusik (LEVEL.beepTheme = Levelmusik), spielt sie keine
 * Pieps (die hat nur course_beep in der Bell-Spur) – dann piept dieses Level selbst: 'beep' auf den letzten warn Zählzeiten vor dem
 * Umschalten, 'beep_switch' beim Umschalten. Nur, solange eine Figur in einem der Bereiche (areas [[x0, z0, x1, z1] …]) steht.
 */
export function piepTakt(level, areas) {
  const clock = level.beepClock;
  if (!clock) return;
  const near = () => (level.players ?? [level.player]).some((p) => p && !p.dead && areas.some(([x0, z0, x1, z1]) => p.pos.x > x0 && p.pos.x < x1 && p.pos.z < z0 && p.pos.z > z1));
  clock.onBeat((w, k) => {
    if (clock.source !== 'music' || !near()) return;
    if (k === 0) level.sfx('beep_switch');
    else if (k >= clock.every - clock.warn) level.sfx('beep');
  });
}

/** Leinwand-Fahne mit Krone (goldene Kronenfahne des Zielmasts). */
function kronenFahneTex() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 160;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 160);
  gr.addColorStop(0, '#ffe066'); gr.addColorStop(1, '#f2a91a');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 160);
  g.fillStyle = '#e8283a'; g.fillRect(0, 0, 256, 16); g.fillRect(0, 144, 256, 16);
  g.fillStyle = '#ffffff';
  g.beginPath(); g.arc(118, 82, 50, 0, TAU); g.fill();
  // Krone
  g.fillStyle = '#ffc21a'; g.strokeStyle = '#a8620a'; g.lineWidth = 4;
  g.beginPath();
  g.moveTo(84, 104); g.lineTo(80, 62); g.lineTo(98, 80); g.lineTo(118, 52); g.lineTo(138, 80); g.lineTo(156, 62); g.lineTo(152, 104); g.closePath();
  g.fill(); g.stroke();
  g.fillStyle = '#e8283a'; g.beginPath(); g.arc(118, 92, 7, 0, TAU); g.fill();
  g.fillStyle = '#2a6ae8'; g.beginPath(); g.arc(98, 94, 5, 0, TAU); g.fill(); g.beginPath(); g.arc(138, 94, 5, 0, TAU); g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Goldener Zielmast (LEVEL.setup): der Zielmast des Levels bekommt ein eigenes Kleid – Goldsockel mit Marmorplatte und Rubinen,
 * goldener Mast mit weißer Spirale, oben eine kleine Krone mit Glanz, eine goldene Kronenfahne (rutscht beim Greifen hinab wie
 * gewohnt). Mechanik unverändert (Entität goal, Greifhöhe, Extraleben an der Spitze).
 */
export function goldenerZielmast(level) {
  if (!level.view) return null;
  const goal = level.entities.find((e) => e.kind === 'goal');
  if (!goal) return null;
  const H = goal.H ?? 9;
  const root = new THREE.Group();
  const b = new Build();
  // Sockel: Goldblock mit Marmorplatte und Rubin-Nieten
  b.box(1.06, 0.9, 1.06, { v: (x, y, z, nx, ny) => new THREE.Color(ny > 0.5 ? 0xffe28a : 0xf2b028) }, { p: [0, 0.45, 0] }, 0.08, 2);
  b.box(1.16, 0.14, 1.16, MARMOR, { p: [0, 0.95, 0] }, 0.04, 1);
  for (const [x, z] of [[0.54, 0], [-0.54, 0], [0, 0.54], [0, -0.54]]) b.sphere(0.09, 0xff3a4a, { p: [x, 0.5, z] }, 8, 6);
  // Mast: Gold mit weißer Spirale
  const len = H - 0.1;
  const pole = new THREE.CylinderGeometry(0.09, 0.1, len, 14, Math.ceil(len * 6), false);
  b.add(pole, (x, y, z) => ((((y + len / 2) * 1.4 + Math.atan2(z, x) / TAU) % 1 + 1) % 1 < 0.35 ? 0xfffaf0 : 0xffc21a), { p: [0, 1.02 + len / 2, 0] });
  b.torus(0.13, 0.04, 0xffe28a, { p: [0, 1.05, 0], r: [PI / 2, 0, 0] }, 6, 16);
  const body = new THREE.Mesh(b.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.35, emissive: 0x2a1800 }));
  body.castShadow = true; body.receiveShadow = true;
  root.add(body);
  // Krone oben
  const parts = [];
  kroneGeo(0.32, 0.4, parts, [0, H + 1.0, 0]);
  const crown = new THREE.Mesh(merge(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.28, metalness: 0.45, emissive: 0x3a2400 }));
  crown.castShadow = true;
  root.add(crown);
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,250,210,1)'); gr.addColorStop(0.4, 'rgba(255,220,120,0.45)'); gr.addColorStop(1, 'rgba(255,200,80,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); return t;
  })();
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.position.set(0, H + 1.2, 0); glow.scale.setScalar(2.2);
  root.add(glow);
  // Kronenfahne (wehend)
  const fg = new THREE.PlaneGeometry(1.5, 0.95, 8, 2);
  fg.translate(-0.8, 0, 0);
  const fmat = new THREE.MeshStandardMaterial({ map: kronenFahneTex(), side: THREE.DoubleSide, roughness: 0.55, emissive: 0x201000 });
  const flag = new THREE.Mesh(fg, fmat);
  flag.castShadow = true;
  root.add(flag);
  const F = fg.getAttribute('position'), FX = Float32Array.from({ length: F.count }, (_, i) => F.getX(i));
  const lo = 1.7, hi = H - 0.5;
  let t = 0;
  const model = {
    root,
    update(dt, st) {
      t += dt;
      const fy = st.flag ?? 1;
      flag.position.set(-0.05, lo + fy * (hi - lo), 0);
      for (let i = 0; i < F.count; i++) { const u = -FX[i]; F.setZ(i, Math.sin(t * 5 + u * 3.4) * 0.12 * u); }
      F.needsUpdate = true;
      crown.rotation.y = t * 0.8;
      glow.scale.setScalar(2.2 + Math.sin(t * 3) * 0.25);
    },
    dispose() { body.geometry.dispose(); crown.geometry.dispose(); fg.dispose(); fmat.map?.dispose(); fmat.dispose(); glowTex.dispose(); },
  };
  goal.setModel(model);
  return goal;
}

/**
 * Siegesfeier (LEVEL.setup): sobald der Zielmast gegriffen ist, schießen vier Konfetti-Kanonen bunte Schnipsel (eine Instanz-
 * Fläche), über dem Ziel steigen Feuerwerks-Raketen auf und zerplatzen in Sternregen (eine Instanz-Gruppe), Krümel und seine
 * Freunde auf der Tribüne jubeln, eine Ansage gratuliert. o = { goal: [x, y, z], cannons: [[x, y, z, dx, dz] …],
 * friends: [{ pos, yaw, model }] }
 */
export function siegesfeier(level, o) {
  const goal = level.entities.find((e) => e.kind === 'goal');
  const st = { fired: false, t: 0, bursts: 0, confetti: 0 };
  level.named.set('siegesfeier', st);
  // Freunde (jubeln ab dem Greifen, vorher wippen sie im Takt)
  const friends = [];
  if (level.view) {
    for (const f of o.friends ?? []) {
      const name = f.model ?? 'kruemel';
      if (!hasModel(name)) continue;
      const m = getModel(name);
      m.root.position.set(...f.pos);
      m.root.rotation.y = f.yaw ?? -PI / 2;
      m.root.scale.setScalar(f.scale ?? 1.4);
      friends.push({ m, f, ph: friends.length * 0.7 });
      addObject(level, m.root);
    }
  }
  // Konfetti: eine InstancedMesh
  const N = 260;
  const conf = [];
  let cm = null;
  const dummy = new THREE.Object3D();
  if (level.view) {
    const geo = new THREE.PlaneGeometry(0.16, 0.24);
    const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, vertexColors: false });
    cm = new THREE.InstancedMesh(geo, mat, N);
    cm.frustumCulled = false;
    const COL = [0xff4a5a, 0x3a8aff, 0xffd23a, 0x4ad86a, 0xff7ac0, 0xa86aff, 0xffffff];
    const c = new THREE.Color();
    for (let i = 0; i < N; i++) { cm.setColorAt(i, c.set(COL[i % COL.length])); dummy.scale.setScalar(0); dummy.updateMatrix(); cm.setMatrixAt(i, dummy.matrix); conf.push({ life: 0 }); }
    cm.instanceMatrix.needsUpdate = true;
    if (cm.instanceColor) cm.instanceColor.needsUpdate = true;
    addObject(level, cm);
  }
  // Feuerwerk: Funken als Instanzen
  const FN = 240;
  const sparks = [];
  let fm = null;
  if (level.view) {
    const geo = new THREE.OctahedronGeometry(0.16, 0);
    const mat = new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    fm = new THREE.InstancedMesh(geo, mat, FN);
    fm.frustumCulled = false;
    const c = new THREE.Color(1, 1, 1);
    for (let i = 0; i < FN; i++) { fm.setColorAt(i, c); dummy.scale.setScalar(0); dummy.updateMatrix(); fm.setMatrixAt(i, dummy.matrix); sparks.push({ life: 0 }); }
    addObject(level, fm);
  }
  const rnd = new Rnd(4242);
  let ci = 0, fi = 0;
  const shootConfetti = (cx, cy, cz, dx, dz) => {
    for (let k = 0; k < 40; k++) {
      const p = conf[ci = (ci + 1) % N];
      const sp = rnd.real(7, 11), spread = rnd.real(-0.45, 0.45);
      p.life = rnd.real(2.6, 3.6); p.x = cx; p.y = cy; p.z = cz;
      p.vx = (dx + spread * dz) * sp * 0.45; p.vz = (dz - spread * dx) * sp * 0.45; p.vy = sp;
      p.rx = rnd.real(0, TAU); p.ry = rnd.real(0, TAU); p.w = rnd.real(4, 9);
    }
    st.confetti++;
  };
  const burst = (bx, by, bz) => {
    const COL = [0xff5a6a, 0x5aa0ff, 0xffe066, 0x6aff8a, 0xff8ad0, 0xffffff];
    const col = new THREE.Color(COL[st.bursts % COL.length]);
    for (let k = 0; k < 40; k++) {
      const p = sparks[fi = (fi + 1) % FN];
      const th = rnd.real(0, TAU), ph = Math.acos(rnd.real(-1, 1)), sp = rnd.real(5, 7.5);
      p.life = p.max = rnd.real(1.0, 1.5); p.x = bx; p.y = by; p.z = bz;
      p.vx = Math.sin(ph) * Math.cos(th) * sp; p.vy = Math.cos(ph) * sp; p.vz = Math.sin(ph) * Math.sin(th) * sp;
      fm?.setColorAt(fi, col);
    }
    if (fm?.instanceColor) fm.instanceColor.needsUpdate = true;
    st.bursts++;
    level.sfx('poof');
  };
  let next = 0;
  level.onStep((dt) => {
    if (!st.fired && goal?.grabbed) {
      st.fired = true;
      banner(level, 'Champion! Die Krone gehört dir!', { hold: 3.2, size: 15, y: 0.3 });
    }
    if (!st.fired) return;
    st.t += dt;
    next -= dt;
    if (next <= 0 && st.t < 9) {
      next = 0.55;
      const c = o.cannons[st.confetti % o.cannons.length];
      shootConfetti(c[0], c[1] + 0.6, c[2], c[3], c[4]);
      const [gx, gy, gz] = o.goal;
      burst(gx + rnd.real(-9, 9), gy + rnd.real(9, 14), gz + rnd.real(-8, 2));
    }
  });
  if (level.view) {
    let t = 0;
    level.view.onFrame((dt) => {
      t += dt;
      for (const fr of friends) {
        const hop = st.fired ? Math.abs(Math.sin(t * 7 + fr.ph)) * 0.45 : Math.abs(Math.sin(t * 3.2 + fr.ph)) * 0.08;
        fr.m.root.position.y = fr.f.pos[1] + hop;
        fr.m.update?.(dt, { anim: st.fired ? 'cheer' : 'idle' });
      }
      if (cm) {
        for (let i = 0; i < N; i++) {
          const p = conf[i];
          if (p.life <= 0) continue;
          p.life -= dt;
          p.vy -= 9 * dt; p.vx *= 1 - dt * 1.4; p.vz *= 1 - dt * 1.4; if (p.vy < -2.2) p.vy = -2.2;
          p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
          p.rx += p.w * dt; p.ry += p.w * 0.7 * dt;
          dummy.position.set(p.x + Math.sin(p.rx) * 0.2, p.y, p.z); dummy.rotation.set(p.rx, p.ry, 0);
          dummy.scale.setScalar(p.life > 0 ? 1 : 0);
          dummy.updateMatrix(); cm.setMatrixAt(i, dummy.matrix);
        }
        cm.instanceMatrix.needsUpdate = true;
      }
      if (fm) {
        for (let i = 0; i < FN; i++) {
          const p = sparks[i];
          if (p.life <= 0) continue;
          p.life -= dt;
          p.vy -= 3 * dt; p.vx *= 1 - dt * 0.8; p.vz *= 1 - dt * 0.8; p.vy *= 1 - dt * 0.8;
          p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
          dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(0, 0, 0);
          dummy.scale.setScalar(p.life > 0 ? Math.max(0.05, p.life / p.max) * 1.4 : 0);
          dummy.updateMatrix(); fm.setMatrixAt(i, dummy.matrix);
        }
        fm.instanceMatrix.needsUpdate = true;
      }
    });
  }
  return st;
}
