// Hilfen für die Welt-Stern-Level S-1 „Regenbogenritt durchs Sternenzelt“, S-2 „Plattenpurzeln zwischen den Planetoiden“
// und S-Kapitän „Krümel im Kurbel-Karussell“ (kein Level: exportiert kein LEVEL, die Level-Registry überspringt dieses
// Modul). Nur für diese drei Level – andere Bonuswelt-Level haben eigene Hilfsdateien. Gemeinsame Dateien werden nicht
// verändert; alles Level-Lokale hängt sich über die offiziellen Aufbau-Haken an (LEVEL.prebuild / LEVEL.build /
// LEVEL.setup, Präzisierung „Leistung und Level-Haken 2“) und über level.onStep / view.onFrame.
//
//   1) Daten-Helfer   isl (Insel über ihre Grundfläche), line/ring/arc/column (Münzen), sign
//   2) Geometrie      Bld (Sammler für statische Zier, verschmolzen), litTop, gradY, RAINBOW (Farben)
//   3) Regenbogen     regenbogenPlatten (schwebende Regenbogen-Plattformen mit Kollision), regenbogenBogen (Bogen über
//                     einer Trapez-Lücke), flussPalette (Ufer- und Wasserfarben des Sternenbachs), sternenbachUfer
//   4) Mechanik       sternfackeln (Entität `sternfackel`: nur Feuer zündet sie; alle einer Gruppe an → Aktion),
//                     wolkenkanoneSpaeter (Wolkenkanone erscheint per Signal), flussblock (versteckter ?-Block über dem
//                     Sternenbach: Hüpfer auf Pflaume stößt ihn an), kugeltore (Schiebekugeln in Tore rollen → Aktion),
//                     muenzregen (Signal → Bitcoins regnen vom Himmel), trittschalter (Bodenplatte: Drauftreten → Aktion,
//                     für Krümel ohne Sprung)
//   5) Kulisse        sternFunkeln (schwebende Glitzersterne), schwebeSterne (große Leuchtsterne, drehen sich),
//                     planetchen (kleine Planetoiden mit Ring), wolkenTupfer
// Statische Teile gehen über addStatic in die Abschnitts-Meshes (keine zusätzlichen Zeichenaufrufe), belebte Kleinigkeiten
// sind je ein Mesh bzw. eine Instanz-Gruppe ohne Sonnenschatten.

import * as THREE from 'three';
import { lin, hex, addStatic, addObject, Rnd } from '../../blocks/kit.js';
import { Build } from '../../models/lib/kit.js';
import { CourseEntity } from '../../entities/CourseEntity.js';
import { runAction, visDt } from '../../entities/gimmick.js';
import { getModel, hasModel } from '../../models/index.js';
import { buildCloudCannon } from '../../blocks/types/cloud.js';

const TAU = Math.PI * 2;

// =====================================================================================================================
// 1) Daten-Helfer
// =====================================================================================================================

/** Insel über ihre Grundfläche x0..x1, zA..zB (Reihenfolge egal), Oberseite top, Höhe h; o: weitere Felder. */
export function isl(x0, x1, zA, zB, top, h = 4, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  return { type: 'island', pos: [(x0 + x1) / 2, top - h, (z0 + z1) / 2], size: [x1 - x0, h, z0 - z1], under: 0, ...o };
}
/** Münzen in einer Reihe. */
export const line = (from, to, n) => ({ kind: 'coins', from, to, n });
/** Münzring um pos. */
export const ring = (pos, r, n) => ({ kind: 'coins', pos, r, n });
/** Münzbogen von a nach b mit Scheitel h über der Verbindungslinie (zeigt einen Sprung an). */
export function arc(a, b, n, h = 2) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    out.push({ kind: 'coin', pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * h * t * (1 - t), a[2] + (b[2] - a[2]) * t] });
  }
  return out;
}
/** Münzsäule (senkrecht). */
export const column = (x, z, y0, y1, n) => ({ kind: 'coins', from: [x, y0, z], to: [x, y1, z], n });
/** Holzschild. */
export const sign = (x, y, z, text, o = {}) => ({ type: 'sign', pos: [x, y, z], text, size: o.size ?? [2.4, 0.9], yaw: o.yaw ?? 0 });

// =====================================================================================================================
// 2) Geometrie
// =====================================================================================================================

/**
 * Sammler für statische Zier (Weltkoordinaten): b.box(w, h, d, x, y, z, farbe, { r, yaw, rx, rz }) (Mitte unten),
 * b.cyl(rTop, rBot, h, x, y, z, farbe, seg), b.sphere(r, x, y, z, farbe, { s }), b.cone(r, h, x, y, z, farbe, seg),
 * b.torus(R, t, x, y, z, farbe, { rx, yaw, arc }), b.tube(punkte, r, farbe, seg), b.add(g, farbe, o).
 * b.flush(level, opts) gibt die Geometrie an den Batcher (addStatic) – opts { material: 'glow', castShadow }.
 * Farbe: Hex | Funktion (x, y, z, nx, ny, nz) je Dreieck | { v: fn } je Ecke.
 */
export class Bld {
  constructor() { this.b = new Build(); this.n = 0; }
  box(w, h, d, x, y, z, color, o = {}) { this.b.box(w, h, d, color, { p: [x, y + h / 2, z], r: [o.rx ?? 0, o.yaw ?? 0, o.rz ?? 0] }, o.r ?? 0.04, o.seg ?? 1); this.n++; return this; }
  cyl(rTop, rBot, h, x, y, z, color, seg = 10, o = {}) { this.b.cyl(rTop, rBot, h, color, { p: [x, y + h / 2, z], r: [o.rx ?? 0, o.yaw ?? 0, o.rz ?? 0] }, seg, !!o.open); this.n++; return this; }
  sphere(r, x, y, z, color, o = {}) { this.b.sphere(r, color, { p: [x, y, z], s: o.s ?? 1, r: [o.rx ?? 0, o.yaw ?? 0, o.rz ?? 0] }, o.ws ?? 10, o.hs ?? 7); this.n++; return this; }
  cone(r, h, x, y, z, color, seg = 8, o = {}) { this.b.cone(r, h, color, { p: [x, y + h / 2, z], r: [o.rx ?? 0, o.yaw ?? 0, o.rz ?? 0], s: o.s ?? 1 }, seg); this.n++; return this; }
  torus(R, t, x, y, z, color, o = {}) { this.b.torus(R, t, color, { p: [x, y, z], r: [o.rx ?? 0, o.yaw ?? 0, o.rz ?? 0] }, o.rs ?? 6, o.ts ?? 16, o.arc ?? TAU); this.n++; return this; }
  tube(points, r, color, seg = 24, rs = 6) { this.b.tube(points, r, color, undefined, seg, rs); this.n++; return this; }
  star(R, r, depth, x, y, z, color, o = {}) {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + (i / 10) * TAU, q = i % 2 ? r : R; if (i) s.lineTo(Math.cos(a) * q, Math.sin(a) * q); else s.moveTo(Math.cos(a) * q, Math.sin(a) * q); }
    s.closePath();
    this.b.extrude(s, depth, color, { p: [x, y, z], r: [o.rx ?? 0, o.yaw ?? 0, o.rz ?? 0], s: o.s ?? 1 }, o.bevel ?? 0.04, 1, 1);
    this.n++; return this;
  }
  add(g, color, o) { this.b.add(g, color, o); this.n++; return this; }
  geometry() { if (!this.n) return null; this.n = 0; return this.b.geometry(); }
  flush(level, opts) {
    const g = this.geometry();
    if (!g) return;
    if (!level.view) { g.dispose(); return; }
    addStatic(level, g, opts);
  }
  mesh(material) {
    const g = this.geometry();
    return g ? new THREE.Mesh(g, material) : null;
  }
}

/** Oben hell, unten dunkel (Licht von oben) – für Bld-Farben. */
export const litTop = (base, k = 0.72) => {
  const M = new THREE.Color(base), T = M.clone().multiplyScalar(1.12), D = M.clone().multiplyScalar(k), c = new THREE.Color();
  return { v: (x, y, z, nx, ny) => (ny >= 0 ? c.copy(M).lerp(T, ny) : c.copy(M).lerp(D, -ny)) };
};
/** Farbverlauf von unten (lo) nach oben (hi) über y0..y1 – für Bld-Farben. */
export const gradY = (lo, hi, y0, y1) => {
  const A = new THREE.Color(lo), B = new THREE.Color(hi), c = new THREE.Color();
  return { v: (x, y) => c.copy(A).lerp(B, Math.max(0, Math.min(1, (y - y0) / (y1 - y0 || 1)))) };
};

/** Regenbogenfarben (links → rechts im Bild): kräftige Pastelltöne. */
export const RAINBOW = [0xff5a72, 0xff9a3c, 0xffd84a, 0x6ad86a, 0x4ab8ff, 0x7a7aff, 0xc072ff];

// =====================================================================================================================
// 3) Regenbogen
// =====================================================================================================================

/**
 * Schwebende Regenbogen-Plattformen (Bauplan S-1 „regenbogenfarbene Pfade“): je Eintrag eine Kollisionsform (Quader) und
 * Optik – weißer Plattenkörper mit Lavendel-Verlauf, oben sieben Regenbogenstreifen in Laufrichtung (bei Breite < 3 m
 * fünf), weiße Kante, darunter zwei abgestufte Wolkensockel mit eingelassenen Glitzersternen (Glüh-Material).
 *   list: [{ x0, x1, z0, z1, top, h: 1.1, axis: 'z' | 'x' (Streifenrichtung, Standard längere Seite), under: true,
 *            tag, climbable, color (Körper), bands (Farbliste), glitter: 3 }]
 * Aufruf in LEVEL.prebuild/build. Liefert die Liste der Formen.
 */
export function regenbogenPlatten(level, list) {
  const b = new Bld(), g = new Bld();
  const rnd = new Rnd(4242);
  const shapes = [];
  for (const q of list) {
    const x0 = Math.min(q.x0, q.x1), x1 = Math.max(q.x0, q.x1), z0 = Math.min(q.z0, q.z1), z1 = Math.max(q.z0, q.z1);
    const W = x1 - x0, D = z1 - z0, top = q.top, h = q.h ?? 1.1, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const sh = { type: 'box', min: [x0, top - h, z0], max: [x1, top, z1], tag: q.tag ?? 'regenbogen' };
    if (q.climbable) sh.climbable = true;
    shapes.push(level.world.add(sh));
    if (!level.view) continue;
    const body = q.color ?? 0xfff8ff;
    // Körper: weiß, nach unten Lavendel
    b.box(W, h - 0.05, D, cx, top - h, cz, gradY(0xc8b4ff, body, top - h, top - 0.2), { r: 0.22, seg: 2 });
    // Regenbogenstreifen (Laufrichtung = längere Seite, sonst axis)
    const along = q.axis ?? (D >= W ? 'z' : 'x');
    const bands = q.bands ?? (Math.min(W, D) < 3 ? [RAINBOW[0], RAINBOW[2], RAINBOW[3], RAINBOW[4], RAINBOW[6]] : RAINBOW);
    const n = bands.length, rim = Math.min(0.32, Math.min(W, D) * 0.08);
    const span = (along === 'z' ? W : D) - 2 * rim, len = (along === 'z' ? D : W) - 2 * rim, bw = span / n;
    for (let i = 0; i < n; i++) {
      const off = -span / 2 + (i + 0.5) * bw;
      const col = litTop(bands[i], 0.85);
      if (along === 'z') b.box(bw - 0.03, 0.08, len, cx + off, top - 0.075, cz, col, { r: 0.02 });
      else b.box(len, 0.08, bw - 0.03, cx, top - 0.075, cz - off, col, { r: 0.02 });
    }
    // Wolkensockel darunter (zwei Stufen), Glitzersterne
    if (q.under !== false) {
      const w2 = Math.max(0.8, W - 1.4), d2 = Math.max(0.8, D - 1.4);
      b.box(w2, 0.7, d2, cx, top - h - 0.62, cz, gradY(0xa890f0, 0xd8c8ff, top - h - 0.62, top - h), { r: 0.3, seg: 2 });
      const w3 = Math.max(0.6, W - 3), d3 = Math.max(0.6, D - 3);
      if (W > 3 && D > 3) b.box(w3, 0.6, d3, cx, top - h - 1.15, cz, gradY(0x8a70e0, 0xa890f0, top - h - 1.15, top - h - 0.55), { r: 0.28, seg: 2 });
      const ng = q.glitter ?? Math.min(6, Math.max(2, Math.round((W * D) / 30)));
      for (let k = 0; k < ng; k++) {
        const sx = cx + rnd.real(-W / 2 + 0.4, W / 2 - 0.4), sz = cz + rnd.real(-D / 2 + 0.4, D / 2 - 0.4);
        // Leuchtstern an der Unterseite (schaut nach unten/vorn)
        g.star(0.22, 0.09, 0.05, sx, top - h - 0.1, sz, [0xfff2a0, 0xffd0f0, 0xb8f0ff][k % 3], { rx: Math.PI / 2 });
      }
      // Glitzersterne vorn an der Kante (sichtbar aus der Spielkamera)
      for (let k = 0; k < Math.max(1, Math.round(W / 3)); k++) {
        const sx = x0 + (k + 0.5) * (W / Math.max(1, Math.round(W / 3)));
        g.star(0.16, 0.065, 0.04, sx, top - h * 0.55, z1 + 0.02, [0xfff2a0, 0xffd0f0, 0xb8f0ff][(k + 1) % 3]);
      }
    }
  }
  b.flush(level);
  g.flush(level, { material: 'glow', castShadow: false });
  return shapes;
}

/**
 * Regenbogen-Bogen über einer Trapez-Lücke (nur Optik): sieben farbige Röhren als Halbbogen von (x, y0, zA) nach
 * (x, y0, zB) mit Scheitel y1, je zwei Bögen links/rechts (x ± off) und ein Querbalken je Trapez-Aufhängung (hang: [z …]
 * auf Höhe hy) – die Trapeze hängen sichtbar am Regenbogen.
 */
export function regenbogenBogen(level, o) {
  if (!level.view) return;
  const b = new Bld();
  const { x = 0, y0, y1, zA, zB, off = 4.4, hang = [], hy } = o;
  const mid = (zA + zB) / 2, half = Math.abs(zA - zB) / 2, sg = zA > zB ? 1 : -1, H = y1 - y0;
  const BW = 0.15;   // Bandbreite (radial)
  // Bänder ineinander (außen Rot): Halbellipse mit Radien half + d, H + d
  const curve = (dx, d) => {
    const pts = [];
    for (let i = 0; i <= 18; i++) { const a = Math.PI * (i / 18); pts.push([x + dx, y0 + (H + d) * Math.sin(a), mid + sg * (half + d) * Math.cos(a)]); }
    return pts;
  };
  for (const side of [-1, 1]) {
    for (let k = 0; k < RAINBOW.length; k++) b.tube(curve(side * off, (RAINBOW.length - 1 - k) * BW - BW * 3), 0.085, RAINBOW[k], 30, 5);
    // Fußwolken
    for (const zz of [mid + sg * half, mid - sg * half]) {
      b.sphere(0.75, x + side * off, y0 - 0.1, zz, 0xffffff, { s: [1.4, 0.6, 1.3] });
      b.sphere(0.5, x + side * off + 0.6, y0 - 0.05, zz + 0.4, 0xf4f0ff, { s: [1.2, 0.6, 1.1] });
    }
  }
  // Querbalken an den Aufhängungen (golden), darunter hängt das Trapez
  for (const z of hang) {
    const c = Math.max(-1, Math.min(1, (z - mid) / (sg * half)));
    const ya = y0 + H * Math.sqrt(1 - c * c);
    const yb = hy ?? ya;
    b.box(off * 2 + 0.3, 0.18, 0.18, x, yb - 0.09, z, litTop(0xffd04a), { r: 0.06 });
    b.star(0.28, 0.12, 0.08, x, yb + 0.25, z, 0xffe070);
    if (ya > yb + 0.1) for (const side of [-1, 1]) b.cyl(0.06, 0.06, ya - yb, x + side * off, yb, z, 0xfff0c0, 6);
  }
  b.flush(level, { castShadow: false });
}

/** Ufer- und Wasserfarben des Sternenbachs (für themes.jungle; river.js liest themeOf(level).jungle). */
export const STERNENBACH = {
  water: 0x5ad8ff, waterDeep: 0x3a8aff, waterEdge: 0xb8f4ff, foam: 0xffffff,
  bankRock: 0xf4ecff, bankRockDark: 0xb8a4f0, moss: 0xffb0dc, lip: 0xffffff, floor: 0xf8f0ff, floor2: 0xeee4ff,
  skirt: 0xc8b4ff, skirtDark: 0x8a70e0, lowland: 0x2a2a6a,
  palmTrunk: 0xd8c8f8, palmTrunkDark: 0xa890e0, frond: 0xff9ad8, frondLight: 0xffd8f0, frondDark: 0xd060b0,
  canopy: [[0xff9ad8, 0xd878c0, 0xa058a0], [0x9ad8ff, 0x78b8e8, 0x5890c8]],
  blooms: [0xff5a72, 0xff9a3c, 0xffd84a, 0x6ad86a, 0x4ab8ff, 0xc072ff],
};

/** Lokale Themen-Variante mit Sternenbach-Ufer (LEVEL.prebuild): Bausteine lesen die Farben schon beim Bau. */
export function sternenbachThema(level, extra = {}) {
  const v = level.view;
  if (!v) return;
  v.theme = { ...v.theme, jungle: { ...STERNENBACH, ...(extra.jungle ?? {}) }, ...(extra.theme ?? {}) };
  if (v.sky) v.sky.theme = v.theme;
}

// =====================================================================================================================
// 4) Mechanik
// =====================================================================================================================

/**
 * Sternfackel (Bauplan S-1 „Fackelplatz: zwei Fackeln anzünden, Wolkenkanone erscheint“): Kristallsockel mit goldener
 * Sternschale; nur ein Feuerball (Funkenblüte) zündet sie – er prallt am Sockel bzw. an der Schale (fester Körper,
 * owner = Fackel). Brennt dann in Regenbogenfarben. Gruppe: sind alle Fackeln gleicher group an, läuft onAll (einmal).
 *   { pos: [x, y, z] (Fußpunkt), group: 'fackeln', onAll: Aktion, h: 1.3 (Sockelhöhe), id }
 * Laufzeit: lit, hits; level.named.get(id); Signal 'sternfackel' { id, lit, of }.
 */
class Sternfackel extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'sternfackel');
    this.touch = false;
    this.lit = false;
    this.hits = 0;
    this.group = spec.group ?? 'fackeln';
    this.H = spec.h ?? 1.3;
    this.half.set(0.55, this.H / 2 + 0.25, 0.55);
    const p = this.pos;
    this.addShape({ type: 'box', min: [p.x - 0.45, p.y, p.z - 0.45], max: [p.x + 0.45, p.y + this.H, p.z + 0.45], tag: 'sternfackel' });
    this.addShape({ type: 'cyl', x: p.x, z: p.z, r: 0.66, y0: p.y + this.H, y1: p.y + this.H + 0.38, tag: 'sternfackel' });
    if (level.view) this.buildLook();
  }

  buildLook() {
    const b = new Bld(), H = this.H;
    b.box(1.1, 0.2, 1.1, 0, 0, 0, litTop(0xd8c8ff), { r: 0.08 });
    b.cyl(0.36, 0.44, H - 0.4, 0, 0.2, 0, gradY(0x8a70e0, 0xe0d4ff, 0.2, H - 0.2), 8);
    b.cyl(0.62, 0.34, 0.38, 0, H - 0.2, 0, litTop(0xffd04a), 10);
    b.torus(0.62, 0.06, 0, H + 0.18, 0, 0xfff0a0, { rx: Math.PI / 2, ts: 20 });
    for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; b.star(0.16, 0.07, 0.06, Math.cos(a) * 0.66, H + 0.02, Math.sin(a) * 0.66, 0xffe070, { yaw: -a + Math.PI / 2 }); }
    // Kristallsplitter am Sockel
    for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.4; b.cone(0.13, 0.55, Math.cos(a) * 0.5, 0.15, Math.sin(a) * 0.5, [0xffb0e0, 0xb0e8ff, 0xfff0a0, 0xc8b0ff][i], 5, { rx: Math.sin(a) * 0.4, rz: -Math.cos(a) * 0.4 }); }
    const root = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.1 });
    const body = b.mesh(mat);
    body.castShadow = true; body.receiveShadow = true;
    root.add(body);
    // Flamme: drei Kegel in Regenbogenfarben (additiv), unsichtbar bis zum Anzünden
    const fb = new Bld();
    fb.cone(0.46, 1.4, 0, 0, 0, 0xff5aa0, 8);
    fb.cone(0.32, 1.05, 0, 0, 0, 0xffb040, 8);
    fb.cone(0.17, 0.7, 0, 0, 0, 0xfff4c0, 8);
    const fl = fb.mesh(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.92, depthWrite: false, blending: THREE.AdditiveBlending }));
    fl.position.y = H + 0.25;
    fl.visible = false;
    root.add(fl);
    // kalter Schimmer: hier gehört Feuer hinein
    const hint = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.05, 6, 24), new THREE.MeshBasicMaterial({ color: 0x9ad8ff, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
    hint.rotation.x = Math.PI / 2;
    hint.position.y = H + 0.42;
    root.add(hint);
    this.fl = fl; this.hint = hint;
    this.setModel({ root, update: () => {}, dispose() { body.geometry.dispose(); mat.dispose(); fl.geometry.dispose(); hint.geometry.dispose(); } });
  }

  onHit(kind) {
    if (kind !== 'fire' || this.lit) return;
    this.hits++;
    this.light();
  }

  light() {
    if (this.lit) return;
    this.lit = true;
    const L = this.level;
    L.sfx('burn');
    L.effects?.sparks({ x: this.pos.x, y: this.pos.y + this.H + 0.7, z: this.pos.z }, 22);
    L.view?.addLantern?.(this.pos.x, this.pos.y + this.H + 1, this.pos.z);
    const all = L.entities.filter((e) => e.kind === 'sternfackel' && e.group === this.group);
    const n = all.filter((e) => e.lit).length;
    L.signal?.('sternfackel', { id: this.spec.id ?? null, lit: n, of: all.length });
    if (n === all.length && !L['_sternfackel_' + this.group]) {
      L['_sternfackel_' + this.group] = true;
      L.sfx('key');
      runAction(L, this.spec.onAll ?? all.find((e) => e.spec.onAll)?.spec.onAll, { pos: [this.pos.x, this.pos.y + 1, this.pos.z], source: this });
    }
  }

  render(dt, t) {
    super.render?.(dt, t);
    if (!this.fl) return;
    this.fl.visible = this.lit;
    this.hint.visible = !this.lit;
    if (this.lit) {
      const k = 1 + 0.12 * Math.sin(t * 13 + this.pos.x) + 0.06 * Math.sin(t * 23);
      this.fl.scale.set(1 / Math.sqrt(k), k, 1 / Math.sqrt(k));
      this.fl.rotation.y = t * 1.7;
    } else this.hint.material.opacity = 0.3 + 0.25 * Math.sin(t * 3 + this.pos.z);
  }

  info() { return { lit: this.lit, hits: this.hits, group: this.group }; }
}

/** Sternfackeln anlegen (in LEVEL.build oder setup): list [{ pos, id? }], o { group, onAll, h }. */
export function sternfackeln(level, list, o = {}) {
  const out = [];
  for (const q of list) {
    const e = new Sternfackel(level, { ...o, ...q, group: o.group ?? q.group ?? 'fackeln', onAll: o.onAll });
    level.entities.push(e);
    if (q.id) level.named.set(q.id, e);
    level.view?.shadows?.add({ pos: e.pos, radius: 0.65, alive: () => !e.removed, visible: () => true });
    out.push(e);
  }
  return out;
}

/**
 * Wolkenkanone, die erst auf ein Signal erscheint (Bauplan S-1 „Wolkenkanone erscheint“): legt unter `id` einen Griff mit
 * reveal() an; reveal baut den Baustein cloudcannon (blocks/types/cloud.js) an seiner Stelle – mit Funkeln und Plopp.
 * spec wie cloudcannon ({ pos, target, arc, yaw, onFire }). → { shown, reveal(), info() }
 */
export function wolkenkanoneSpaeter(level, spec) {
  const st = { shown: false, owner: null };
  const h = {
    get shown() { return st.shown; },
    reveal() {
      if (st.shown) return;
      st.shown = true;
      st.owner = buildCloudCannon(level, { ...spec, id: undefined });
      const [x, y, z] = spec.pos;
      level.effects?.sparks({ x, y: y + 1.5, z }, 26);
      level.effects?.ring?.({ x, y: y + 0.2, z }, 2.2);
      level.sfx('powerup_appear');
    },
    get owner() { return st.owner; },
    info: () => ({ shown: st.shown, anim: st.owner?.anim ?? null }),
  };
  if (spec.id) level.named.set(spec.id, h);
  return h;
}

/**
 * Versteckter ?-Block über dem Sternenbach (Bauplan S-1 „versteckte Blöcke mit Funkenblüte (Reitfahrt)“): unsichtbar
 * (nur ein zartes Glitzern auf dem Wasser darunter); hüpft die Heldin auf Pflaume darunter hoch (Kopf erreicht die
 * Unterkante), erscheint der Block, wird benutzt und gibt den Inhalt (Power-up direkt an die Reiterin, sonst Aktion).
 *   { pos: [x, y, z] (Mitte der Unterseite), power: 'funken', content: Aktion, reach: 0.95 (m waagerecht), id }
 * Laufzeit: shown, used, info().
 */
class Flussblock extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'flussblock');
    this.touch = false;
    this.shown = false;
    this.used = false;
    this.bumpT = 0;
    this.half.set(0.5, 0.5, 0.5);
    if (level.view) {
      const root = new THREE.Group();
      this.q = getModel('question_block');
      this.u = getModel(hasModel('used_block') ? 'used_block' : 'question_block');
      this.q.root.position.y = 0;
      this.u.root.visible = false;
      root.add(this.q.root, this.u.root);
      root.visible = false;
      // Glitzern auf dem Wasser (Hinweis)
      const sp = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.42, 5), new THREE.MeshBasicMaterial({ color: 0xfff6c0, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      sp.rotation.x = -Math.PI / 2;
      sp.position.set(this.pos.x, (spec.water ?? this.pos.y - 2.4) + 0.06, this.pos.z);
      this.sparkle = sp;
      addObject(level, sp);
      this.setModel({ root, update: (dt) => { this.q.update?.(dt, { anim: 'idle' }); this.u.update?.(dt, {}); }, dispose() {} });
    }
  }

  update(dt) {
    if (this.bumpT > 0) this.bumpT = Math.max(0, this.bumpT - dt);
    if (this.used) return;
    for (const p of this.level.players ?? [this.level.player]) {
      if (!p || p.dead || !p.riding || p.mode !== 'air' || p.vel.y <= 0) continue;
      const head = p.pos.y + p.half.y * 2;
      if (Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) > (this.spec.reach ?? 0.95)) continue;
      if (head < this.pos.y - 0.25) continue;
      this.hit(p);
      p.vel.y = Math.min(p.vel.y, 0);
      break;
    }
  }

  hit(p) {
    const L = this.level;
    this.shown = true;
    this.used = true;
    this.bumpT = 0.25;
    L.sfx('blockhit');
    L.effects?.sparks({ x: this.pos.x, y: this.pos.y + 1, z: this.pos.z }, 16);
    if (this.spec.power) {
      p.collectPowerup?.(this.spec.power) ?? p.setPower?.(this.spec.power);
      L.sfx('powerup');
    }
    if (this.spec.content) runAction(L, this.spec.content, { pos: [this.pos.x, this.pos.y + 1, this.pos.z], source: this });
  }

  render(dt, t) {
    if (!this.model) return;
    const r = this.model.root;
    r.visible = this.shown;
    r.position.set(this.pos.x, this.pos.y + Math.sin((this.bumpT / 0.25) * Math.PI) * 0.3, this.pos.z);
    this.q.root.visible = !this.used;
    this.u.root.visible = this.used;
    if (this.sparkle) {
      this.sparkle.visible = !this.used;
      this.sparkle.rotation.z = t * 1.3;
      this.sparkle.material.opacity = 0.35 + 0.3 * Math.sin(t * 4 + this.pos.z);
    }
    this.model.update?.(dt, {});
  }

  info() { return { shown: this.shown, used: this.used }; }
}

/** Versteckte ?-Blöcke über dem Sternenbach anlegen: list [{ pos, power | content, id, water }]. */
export function flussbloecke(level, list) {
  return list.map((q) => {
    const e = new Flussblock(level, q);
    level.entities.push(e);
    if (q.id) level.named.set(q.id, e);
    return e;
  });
}

/**
 * Kugeltore (Bauplan S-1 Stern 1 „Kugeln in Tore schieben“): je Tor ein Rahmen (zwei Pfosten, Latte, Netz) mit einer
 * leuchtenden Torlinie; rollt eine Schiebekugel (Daten-id in balls) langsam ganz hinein, rastet sie dort ein, das Tor
 * leuchtet und jubelt. Sind alle Tore belegt, läuft onAll einmal (z. B. { star: 0 }). Figuren lösen nichts aus.
 *   o: { id, goals: [{ pos: [x, y, z] (Mitte der Torlinie, Boden), dir: [0, -1] (Richtung ins Tor), width: 3, depth: 1.8,
 *        color }], balls: [id …], onAll }
 * → level.named.get(id) { filled, of, done, info() }
 */
export function kugeltore(level, o) {
  const st = { filled: 0, done: false, goals: [] };
  const balls = o.balls ?? [];
  for (const q of o.goals) {
    const [px, py, pz] = q.pos, d = q.dir ?? [0, -1], l = Math.hypot(d[0], d[1]) || 1, dx = d[0] / l, dz = d[1] / l;
    const w = q.width ?? 3, dep = q.depth ?? 1.8;
    const g = { x: px, y: py, z: pz, dx, dz, w, dep, ball: null, t: 0, glow: null };
    st.goals.push(g);
    // Pfosten und Rückwand fest (die Kugel prallt nicht seitlich hinein durch die Pfosten)
    const rx = -dz, rz = dx;   // quer
    const post = (s) => { const cx = px + rx * s * (w / 2 + 0.12), cz = pz + rz * s * (w / 2 + 0.12); level.world.add({ type: 'box', min: [cx - 0.14 - Math.abs(dx) * dep / 2, py, cz - 0.14 - Math.abs(dz) * dep / 2], max: [cx + 0.14 + Math.abs(dx) * dep / 2, py + 2.0, cz + 0.14 + Math.abs(dz) * dep / 2], tag: 'kugeltor' }); };
    void post;
    // Seitenwände des Tors (ganze Tiefe) und Rückwand
    for (const s of [-1, 1]) {
      const cx = px + rx * s * (w / 2 + 0.15) + dx * dep / 2, cz = pz + rz * s * (w / 2 + 0.15) + dz * dep / 2;
      const hx = Math.abs(rx) * 0.15 + Math.abs(dx) * dep / 2, hz = Math.abs(rz) * 0.15 + Math.abs(dz) * dep / 2;
      level.world.add({ type: 'box', min: [cx - hx, py, cz - hz], max: [cx + hx, py + 2.0, cz + hz], tag: 'kugeltor' });
    }
    {
      const cx = px + dx * (dep + 0.15), cz = pz + dz * (dep + 0.15);
      const hx = Math.abs(rx) * (w / 2 + 0.3) + Math.abs(dx) * 0.15, hz = Math.abs(rz) * (w / 2 + 0.3) + Math.abs(dz) * 0.15;
      level.world.add({ type: 'box', min: [cx - hx, py, cz - hz], max: [cx + hx, py + 2.0, cz + hz], tag: 'kugeltor' });
    }
    if (level.view) {
      const b = new Bld();
      const col = q.color ?? 0xffffff;
      const yaw = Math.atan2(-dz, dx) - Math.PI / 2;
      const P = (s, k) => [px + rx * s + dx * k, pz + rz * s + dz * k];
      for (const s of [-1, 1]) {
        const [x0, z0] = P(s * (w / 2 + 0.12), 0);
        b.cyl(0.12, 0.12, 2.1, x0, py, z0, litTop(col), 10);
        const [x1, z1] = P(s * (w / 2 + 0.12), dep);
        b.cyl(0.08, 0.08, 1.4, x1, py, z1, litTop(0xd8d8e8), 8);
        // Seitennetz
        const [xm, zm] = P(s * (w / 2 + 0.12), dep / 2);
        b.box(0.04, 1.6, dep, xm, py + 0.1, zm, 0xf4f4ff, { yaw: yaw, r: 0 });
      }
      const [xl, zl] = P(0, 0);
      b.box(w + 0.48, 0.24, 0.24, xl, py + 2.0, zl, litTop(col), { yaw: yaw + Math.PI / 2 * 0, r: 0.08 });
      const [xb, zb] = P(0, dep);
      b.box(w + 0.3, 1.5, 0.05, xb, py, zb, 0xf0f0ff, { yaw, r: 0 });
      // Netzmaschen (Gitterlinien auf der Rückwand)
      for (let i = -3; i <= 3; i++) {
        const [xa, za] = P(i * (w / 7), dep - 0.04);
        b.box(0.035, 1.5, 0.035, xa, py, za, 0xb8c0e0, { r: 0 });
      }
      b.flush(level);
      // Torlinie (leuchtet, wenn belegt)
      const lg = new THREE.PlaneGeometry(w, dep);
      lg.rotateX(-Math.PI / 2);
      const glow = new THREE.Mesh(lg, new THREE.MeshBasicMaterial({ color: q.color ?? 0x7aff8a, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending }));
      glow.rotation.y = yaw;
      glow.position.set(px + dx * dep / 2, py + 0.03, pz + dz * dep / 2);
      g.glow = glow;
      const hd = {};
      let tt = 0;
      addObject(level, glow, (dt) => { tt += visDt(level, hd, dt); glow.material.opacity = g.ball ? 0.75 + 0.2 * Math.sin(tt * 6) : 0.22 + 0.12 * Math.sin(tt * 3); });
    }
  }
  level.onStep(() => {
    if (st.done) return;
    for (const g of st.goals) {
      if (g.ball) {
        // eingerastete Kugel festhalten
        g.ball.pos.x = g.x + g.dx * g.dep * 0.5; g.ball.pos.z = g.z + g.dz * g.dep * 0.5; g.ball.vel?.set(0, g.ball.vel.y, 0);
        continue;
      }
      for (const id of balls) {
        const k = level.named.get(id);
        if (!k || !k.alive || k.hidden || k.lost || st.goals.some((q) => q.ball === k)) continue;
        const rx = k.pos.x - g.x, rz = k.pos.z - g.z;
        const along = rx * g.dx + rz * g.dz, lat = rx * -g.dz + rz * g.dx;
        if (along > 0.55 && along < g.dep + 0.2 && Math.abs(lat) < g.w / 2 && Math.abs(k.pos.y - g.y) < 0.8) {
          g.ball = k;
          st.filled++;
          level.sfx('switch');
          level.sfx('coin');
          level.effects?.sparks({ x: k.pos.x, y: k.pos.y + 1.2, z: k.pos.z }, 26);
          level.addCoins?.(3);
          level.signal?.('kugeltor', { id: o.id ?? null, filled: st.filled, of: st.goals.length });
          if (st.filled >= st.goals.length) {
            st.done = true;
            level.sfx('key');
            runAction(level, o.onAll, { pos: [g.x, g.y + 1.5, g.z], source: null });
          }
          break;
        }
      }
    }
  });
  const h = { get filled() { return st.filled; }, get of() { return st.goals.length; }, get done() { return st.done; }, info: () => ({ filled: st.filled, of: st.goals.length, done: st.done }) };
  if (o.id) level.named.set(o.id, h);
  return h;
}

/**
 * Münzregen (Bauplan S-1 „P-Schalter-Finale mit Münzregen“): Auf das Signal `signal` (Standard 'muenzregen', z. B. aus
 * dem Druckknopf { signal: 'muenzregen' }) fallen n Bitcoins gestaffelt aus dem Himmel über der Fläche area
 * [x0, z0, x1, z1] auf den Boden (Strahl nach unten, kleiner Hüpfer) und bleiben liegen, bis sie eingesammelt sind.
 *   o: { area, n: 40, height: 12, every: 0.06 (s zwischen zwei Münzen), seed, signal, id }
 * → level.named.get(id) { started, spawned, landed, info() }
 */
export function muenzregen(level, o) {
  const st = { started: false, spawned: 0, landed: 0, list: [] };
  const rnd = new Rnd(o.seed ?? 77);
  const [x0, z0, x1, z1] = o.area;
  const n = o.n ?? 40, every = o.every ?? 0.06, H = o.height ?? 12;
  const spots = [];
  for (let i = 0; i < n; i++) spots.push([rnd.real(Math.min(x0, x1) + 0.4, Math.max(x0, x1) - 0.4), rnd.real(Math.min(z0, z1) + 0.4, Math.max(z0, z1) - 0.4)]);
  let t = 0;
  const start = () => { if (st.started) return; st.started = true; t = 0; level.sfx('powerup_appear'); };
  level.onSignal?.(o.signal ?? 'muenzregen', start);
  level.onStep((dt) => {
    if (!st.started) return;
    t += dt;
    while (st.spawned < n && t >= st.spawned * every) {
      const [x, z] = spots[st.spawned];
      const hit = level.world.raycastDown(x, (o.top ?? 30) + H, z, 80);
      const floor = hit ? hit.y : (o.floor ?? 0);
      const c = level.spawn('coin', { pos: [x, floor + H + rnd.real(0, 3), z] });
      if (c) st.list.push({ c, floor: floor + 0.5, vy: -rnd.real(0, 2), bounced: false });
      st.spawned++;
    }
    for (const q of st.list) {
      if (q.done || !q.c.alive) { q.done = true; continue; }
      q.vy -= 26 * dt;
      q.c.pos.y += q.vy * dt;
      if (q.c.pos.y <= q.floor) {
        q.c.pos.y = q.floor;
        if (!q.bounced && q.vy < -4) { q.bounced = true; q.vy = 3.2; level.effects?.sparks?.({ x: q.c.pos.x, y: q.floor, z: q.c.pos.z }, 3); }
        else { q.done = true; st.landed++; }
      }
    }
  });
  const h = { start, get started() { return st.started; }, get spawned() { return st.spawned; }, get landed() { return st.landed; }, info: () => ({ started: st.started, spawned: st.spawned, landed: st.landed, of: n }) };
  if (o.id) level.named.set(o.id, h);
  return h;
}

/**
 * Trittschalter (für Krümel, der nicht springt – S-Kapitän): runde, flache Bodenplatte (0,12 m, Krümel steigt hinauf);
 * wer sich daraufstellt, löst onPress aus; danach erst wieder, wenn alle Figuren heruntergegangen sind und reset s
 * vergangen sind. Optik: Messingring mit Drehpfeil-Symbol, leuchtet, solange bereit.
 *   { pos: [x, y, z] (Mitte unten), r: 0.9, onPress: Aktion, reset: 0.6, color, id, ready: () => bool (optional) }
 * Laufzeit: presses, pressed, info(); level.named.get(id).
 */
class Trittschalter extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'trittschalter');
    this.touch = false;
    this.R = spec.r ?? 0.9;
    this.H = 0.12;
    this.half.set(this.R, 0.1, this.R);
    this.presses = 0;
    this.pressed = false;
    this.cool = 0;
    this.press = 0;
    const p = this.pos;
    this.shape = { type: 'cyl', x: p.x, z: p.z, r: this.R, y0: p.y, y1: p.y + this.H, tag: 'trittschalter' };
    this.addShape(this.shape);
    if (level.view) this.buildLook(spec);
  }

  buildLook(spec) {
    const b = new Bld(), R = this.R;
    b.cyl(R + 0.08, R + 0.12, 0.08, 0, 0, 0, litTop(0xc89a3a), 24);
    const root = new THREE.Group();
    const base = b.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.35 }));
    base.receiveShadow = true;
    root.add(base);
    const t = new Bld();
    t.cyl(R - 0.05, R - 0.02, 0.1, 0, 0, 0, litTop(spec.color ?? 0x3a9aff), 24);
    // Drehpfeil (Bogen mit Spitze) oben auf der Platte
    t.torus(R * 0.55, 0.07, 0, 0.12, 0, 0xffffff, { rx: Math.PI / 2, arc: TAU * 0.72, ts: 18 });
    t.cone(0.17, 0.32, R * 0.55, 0.12, 0, 0xffffff, 6, { rx: Math.PI / 2 });
    const topM = t.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, emissive: 0x112244 }));
    topM.receiveShadow = true;
    this.top = topM;
    root.add(topM);
    this.setModel({ root, update: () => {}, dispose() { base.geometry.dispose(); topM.geometry.dispose(); } });
  }

  update(dt) {
    if (this.cool > 0) this.cool -= dt;
    let on = false;
    for (const p of this.level.players ?? [this.level.player]) {
      if (!p || p.dead || p.mode !== 'ground') continue;
      if (p.ground?.owner === this || (Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < this.R - 0.15 && Math.abs(p.pos.y - (this.pos.y + this.H)) < 0.2)) on = true;
    }
    const ready = this.spec.ready ? this.spec.ready() : true;
    if (on && !this.pressed && this.cool <= 0 && ready) {
      this.pressed = true;
      this.presses++;
      this.level.sfx('switch');
      this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 0.4, z: this.pos.z }, 10);
      runAction(this.level, this.spec.onPress, { pos: [this.pos.x, this.pos.y + 0.3, this.pos.z], source: this });
    } else if (!on && this.pressed) {
      this.pressed = false;
      this.cool = this.spec.reset ?? 0.6;
    }
  }

  render(dt, t) {
    if (!this.model) return;
    this.syncModel();
    const want = this.pressed ? 1 : 0;
    this.press += (want - this.press) * Math.min(1, (dt || 0.016) * 12);
    this.top.position.y = 0.06 - this.press * 0.05;
    const ready = (this.spec.ready ? this.spec.ready() : true) && !this.pressed && this.cool <= 0;
    this.top.material.emissive.setHex(ready ? 0x1a3a7a : 0x060a18);
    this.top.material.emissiveIntensity = ready ? 0.6 + 0.4 * Math.sin(t * 4) : 0.4;
    this.top.rotation.y = ready ? t * 0.8 : this.top.rotation.y;
  }

  info() { return { presses: this.presses, pressed: this.pressed }; }
}

/** Trittschalter anlegen (LEVEL.build/setup): list [{ pos, onPress, id, … }]. */
export function trittschalter(level, list) {
  return list.map((q) => {
    const e = new Trittschalter(level, q);
    level.entities.push(e);
    if (q.id) level.named.set(q.id, e);
    return e;
  });
}

/**
 * Sternblock-Mauer (Bauplan S-1 „Riesentrank-Strecke“): Mauer aus pastellbunten Sternblöcken (ein Mesh, sparsam), fest;
 * nur der Riesentrank (onHit 'mega'), Bomben und Kanonenkugeln zertrümmern sie (Stampfen, Tatze, Feuer prallen ab –
 * Kollisionsflag breakable 'bomb'). Beim Zertrümmern: Trümmer, Funken, Münzen (coins), Aktion onBreak.
 *   { id, x0, x1, z0, z1 (Grundfläche), y (Unterkante), h: 3, block: 1 (Kantenlänge), coins: 3, onBreak }
 * Laufzeit: broken (0 | 1), by, info(); level.named.get(id).
 */
const MAUER_COLS = [0xffd0ec, 0xd8ccff, 0xc8f4e4, 0xfff0b8, 0xc8e4ff];
const STAR_COLS = [0xff5a9a, 0x8a6aff, 0x2ac890, 0xffb020, 0x3a9aff];
class Sternmauer extends CourseEntity {
  constructor(level, spec) {
    const x0 = Math.min(spec.x0, spec.x1), x1 = Math.max(spec.x0, spec.x1), z0 = Math.min(spec.z0, spec.z1), z1 = Math.max(spec.z0, spec.z1);
    super(level, { ...spec, pos: [(x0 + x1) / 2, spec.y, (z0 + z1) / 2] }, 'sternmauer');
    this.touch = false;
    this.broken = 0;
    this.by = null;
    this.box = { x0, x1, z0, z1, y0: spec.y, y1: spec.y + (spec.h ?? 3) };
    this.half.set((x1 - x0) / 2, (spec.h ?? 3) / 2, (z1 - z0) / 2);
    this.addShape({ type: 'box', min: [x0, this.box.y0, z0], max: [x1, this.box.y1, z1], breakable: 'bomb', tag: 'sternmauer' });
    if (level.view) this.buildLook(spec);
  }

  buildLook(spec) {
    const { x0, x1, z0, z1, y0, y1 } = this.box;
    const s = spec.block ?? 1;
    const nx = Math.max(1, Math.round((x1 - x0) / s)), nz = Math.max(1, Math.round((z1 - z0) / s)), ny = Math.max(1, Math.round((y1 - y0) / s));
    const sx = (x1 - x0) / nx, sz = (z1 - z0) / nz, sy = (y1 - y0) / ny;
    const b = new Bld(), g = new Bld();
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, cy = y0;
    let k = 0;
    for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) for (let iz = 0; iz < nz; iz++) {
      // nur Außenhaut zeichnen
      if (ix > 0 && ix < nx - 1 && iz > 0 && iz < nz - 1 && iy < ny - 1) continue;
      const x = x0 + (ix + 0.5) * sx - cx, z = z0 + (iz + 0.5) * sz - cz, y = iy * sy;
      const ci = (ix * 7 + iy * 3 + iz * 5 + k) % MAUER_COLS.length;
      b.box(sx - 0.06, sy - 0.06, sz - 0.06, x, y + 0.03, z, litTop(MAUER_COLS[ci], 0.8), { r: 0.1 });
      // Stern vorn (+z) bzw. seitlich (+x/−x), je nach Lage
      if (iz === nz - 1) g.star(0.27 * s, 0.12 * s, 0.06, x, y + sy / 2, z + sz / 2 - 0.01, STAR_COLS[ci]);
      if (nz > nx && ix === 0) g.star(0.27 * s, 0.12 * s, 0.06, x - sx / 2 + 0.01, y + sy / 2, z, STAR_COLS[ci], { yaw: -Math.PI / 2 });
      if (nz > nx && ix === nx - 1) g.star(0.27 * s, 0.12 * s, 0.06, x + sx / 2 - 0.01, y + sy / 2, z, STAR_COLS[ci], { yaw: Math.PI / 2 });
    }
    k++;
    const root = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45 });
    const body = b.mesh(mat);
    body.castShadow = true; body.receiveShadow = true;
    root.add(body);
    const starM = g.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, emissive: 0x332200, emissiveIntensity: 0.5 }));
    if (starM) root.add(starM);
    root.position.set(cx, cy, cz);
    this.root = root;
    this.setModel({ root, update: () => {}, dispose() { body.geometry.dispose(); mat.dispose(); starM?.geometry.dispose(); } });
  }

  syncModel() { if (this.model) this.model.root.position.set(this.pos.x, this.pos.y, this.pos.z); }

  onHit(kind, source) {
    if (this.broken) return;
    if (kind !== 'mega' && kind !== 'bomb' && kind !== 'cannon') return;
    this.broken = 1;
    this.by = kind;
    this.removeShapes();
    const L = this.level, { x0, x1, z0, z1, y0, y1 } = this.box;
    L.sfx('brickbreak');
    L.shake?.(0.25);
    for (let i = 0; i < 4; i++) L.effects?.debris({ x: x0 + (x1 - x0) * (i + 0.5) / 4, y: y0 + 0.8, z: (z0 + z1) / 2 + (z1 - z0) * ((i % 2) - 0.5) * 0.5 }, MAUER_COLS[i % MAUER_COLS.length], 8);
    L.effects?.sparks({ x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: (z0 + z1) / 2 }, 20);
    if (this.spec.coins !== 0) runAction(L, { coins: this.spec.coins ?? 3 }, { pos: [(x0 + x1) / 2, y0 + 1, (z0 + z1) / 2] });
    if (this.spec.onBreak) runAction(L, this.spec.onBreak, { pos: [(x0 + x1) / 2, y0 + 1, (z0 + z1) / 2], source: this });
    L.signal?.('sternmauer', { id: this.spec.id ?? null, by: kind });
    void source;
  }

  render() {
    if (!this.model) return;
    this.model.root.visible = !this.broken;
  }

  info() { return { broken: this.broken, by: this.by }; }
}

/** Sternblock-Mauern anlegen: list [{ id, x0, x1, z0, z1, y, h, coins, onBreak }]. */
export function sternmauern(level, list) {
  return list.map((q) => {
    const e = new Sternmauer(level, q);
    level.entities.push(e);
    if (q.id) level.named.set(q.id, e);
    return e;
  });
}

// =====================================================================================================================
// 5) Kulisse
// =====================================================================================================================

/**
 * Schwebende Leuchtsterne (Glüh-Material, statisch): list [[x, y, z, size, color?, yaw?]]. Große Sterne bekommen einen
 * dunkleren Rand (zwei Lagen) – kräftige Spielzeug-Sterne im All.
 */
export function leuchtsterne(level, list) {
  if (!level.view) return;
  const g = new Bld(), b = new Bld();
  const COLS = [0xfff07a, 0xffb0e0, 0x9ae8ff, 0xc8a8ff, 0xffc87a];
  list.forEach(([x, y, z, s = 1, c, yaw = 0], i) => {
    const col = c ?? COLS[i % COLS.length];
    g.star(0.5 * s, 0.22 * s, 0.16 * s, x, y, z, col, { yaw });
    if (s > 0.9) b.star(0.58 * s, 0.27 * s, 0.1 * s, x, y, z - 0.02 * Math.cos(yaw), 0xffffff, { yaw });
  });
  g.flush(level, { material: 'glow', castShadow: false });
  b.flush(level, { castShadow: false });
}

/**
 * Kleine Planetoiden (statisch, verschmolzen): list [{ pos, r: 2, color: [a, b], ring: true, tilt, grass: false }] –
 * Kugel mit Farbbändern, optional Ring (Torus) und Grashaube mit Bäumchen (S-2).
 */
export function planetchen(level, list) {
  if (!level.view) return;
  const b = new Bld();
  for (const q of list) {
    const [x, y, z] = q.pos, r = q.r ?? 2, [ca, cb] = q.color ?? [0xff9ad0, 0xffe0f0];
    const A = new THREE.Color(ca), B = new THREE.Color(cb), c = new THREE.Color();
    b.sphere(r, x, y, z, { v: (px, py, pz, nx, ny) => c.copy(A).lerp(B, 0.5 + 0.5 * Math.sin((py - y) / r * 6 + (px - x) * 0.4) * 0.8 + ny * 0.15) }, { ws: 18, hs: 12 });
    if (q.grass) {
      b.sphere(r * 1.02, x, y + r * 0.08, z, { v: (px, py, pz, nx, ny) => c.set(ny > 0.35 ? 0x7ae05a : 0x8a62c8) }, { s: [1, 0.98, 1], ws: 18, hs: 12 });
      for (let i = 0; i < (q.trees ?? 2); i++) {
        const a = i * 2.4 + (q.seed ?? 0), tx = x + Math.cos(a) * r * 0.35, tz = z + Math.sin(a) * r * 0.35, ty = y + r * 0.93;
        b.cyl(0.08 * r, 0.1 * r, 0.35 * r, tx, ty, tz, 0xa87a4a, 6);
        b.sphere(0.24 * r, tx, ty + 0.45 * r, tz, [0x5ad84a, 0xff9ad0, 0xffd84a][i % 3], { ws: 8, hs: 6 });
      }
    }
    if (q.ring !== false) b.torus(r * 1.55, r * 0.09, x, y, z, litTop(q.ringColor ?? 0xffe08a), { rx: Math.PI / 2 + (q.tilt ?? 0.35), rz: q.tiltZ ?? 0.2, ts: 32 });
  }
  b.flush(level, { castShadow: false });
}

/** Glitzer-Funkeln (eine Instanz-Gruppe, additiv, blinkt): Punkte in einem Quader um center ± size. */
export function funkeln(level, o) {
  if (!level.view) return;
  const n = o.n ?? 40, rnd = new Rnd(o.seed ?? 5);
  const geo = new THREE.OctahedronGeometry(1, 0);
  const mat = new THREE.MeshBasicMaterial({ color: o.color ?? 0xfff6d0, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending });
  const im = new THREE.InstancedMesh(geo, mat, n);
  im.frustumCulled = false;
  im.name = 'funkeln';
  const [cx, cy, cz] = o.center, [sx, sy, sz] = o.size;
  const pts = Array.from({ length: n }, () => ({ x: cx + rnd.real(-sx, sx), y: cy + rnd.real(-sy, sy), z: cz + rnd.real(-sz, sz), p: rnd.real(0, TAU), s: rnd.real(0.05, 0.14) }));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
  const hd = {};
  let t = 0;
  addObject(level, im, (dt) => {
    t += visDt(level, hd, dt);
    pts.forEach((p, i) => {
      const k = Math.max(0, Math.sin(t * 2.2 + p.p));
      e.set(0, t + p.p, 0);
      q.setFromEuler(e);
      m.compose(v.set(p.x, p.y + Math.sin(t * 0.7 + p.p) * 0.2, p.z), q, s.setScalar(p.s * (0.3 + k)));
      im.setMatrixAt(i, m);
    });
    im.instanceMatrix.needsUpdate = true;
  });
}

export { lin, hex, Rnd, addObject, addStatic, visDt, runAction, getModel, hasModel, TAU };
