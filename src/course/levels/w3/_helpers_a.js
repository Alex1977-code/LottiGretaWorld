// Hilfen für die Welt-3-Level 3-1 „Flockenwiese“ und 3-4 „Marzipangarten“ (kein Level: exportiert kein LEVEL, die
// Level-Registry überspringt dieses Modul). Oben reine Daten-Helfer (Schneefelder, Eisflächen, Münzspuren), darunter
// level-lokale Kulisse, die es als Baustein nicht gibt – alles für `LEVEL.setup = levelSetup((level) => …)`
// (Präzisierung „Level-Haken“): statische Teile gehen über addStatic in die Abschnitts-Meshes (levelSetup hängt sie an
// das vorhandene Mesh gleichen Materials an, 0 zusätzliche Zeichenaufrufe), belebte Kleinigkeiten sind je ein Mesh
// (Pinguin- und Robbenkinder, Iglu-Rauch, Brunnenwasser), ohne Sonnenschatten, mit Blob-Schatten am Boden.
//
// Schnee (3-1): Schlitten, Fußspuren, Eiszapfen-Zier, Schneebaum mit begehbarer Krone (Kollision), Rauch, Pinguin-
// kinder (watscheln, rutschen auf dem Bauch), Robbenkinder (nicken), Holzbank, Vogelhäuschen, Schneeengel.
// Pastell-Garten (3-4): Pavillon (begehbar), Brunnen (Kollision, Wasserspiel), Blumenbogen, Bonbon-Bäumchen,
// Gartenbank, Marzipan-Schweinchen, Kugelbüsche.

import * as THREE from 'three';
import { box, colorize, merge, lin, mixc, smooth, hex, addStatic, addObject } from '../../blocks/kit.js';
import { levelSetup, cyl, sphere, cone, block } from '../w2/_helpers_c.js';

export { levelSetup, cyl, sphere, cone, block };
export { line, ring, arc, column, farHide, bubble, shadowless, cullStatic } from '../w2/_helpers_a.js';
export { hedges, ponds, gardenLamps, roseVines, blossomTrees, flowerBeds, petals } from '../w2/_helpers_c.js';

const L = (c) => lin(hex(c));
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ Daten-Helfer

/** Insel über ihre Grundfläche x0..x1, zA..zB (Reihenfolge egal), Oberseite top, Höhe h. o: weitere Felder. */
export function isl(x0, x1, zA, zB, top, h = 4, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  return { type: 'island', pos: [(x0 + x1) / 2, top - h, (z0 + z1) / 2], size: [x1 - x0, h, z0 - z1], under: 0, ...o };
}
/** Schneefeld (Motor-Baustein schneefeld: Schneebälle wachsen) über die Grundfläche. */
export function snow(x0, x1, zA, zB, top, h = 4, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  return { type: 'schneefeld', pos: [(x0 + x1) / 2, top - h, (z0 + z1) / 2], size: [x1 - x0, h, z0 - z1], under: 1.5, ...o };
}
/** Eisfläche (Baustein eisflaeche: Motor-Eisbahn auf Schneesockel) bündig mit Oberseite top. */
export function rink(x0, x1, zA, zB, top, h = 4, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  return { type: 'eisflaeche', pos: [(x0 + x1) / 2, top - h, (z0 + z1) / 2], size: [x1 - x0, h, z0 - z1], edge: false, ...o };
}
/** Schmaler Eissteg (Motor-Eisbahn, 0,4 m dick, Oberseite top). */
export function steg(x0, x1, zA, zB, top, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  return { type: 'eisbahn', pos: [(x0 + x1) / 2, top - 0.45, (z0 + z1) / 2], size: [x1 - x0, 0.45, z0 - z1], ...o };
}
/** Pastell-Insel (Thema plaza: rosa Grasdecke) über die Grundfläche. */
export const lawn = (x0, x1, zA, zB, top, h = 3, o = {}) => isl(x0, x1, zA, zB, top, h, { under: 2.2, ...o });

/** Belohnung „Stern i erscheint hier“ (über dem Auslöser, z. B. dem gefangenen Hasen). */
export const starHere = (index, dy = 0.9) => (level, ctx) => {
  const p = ctx?.pos ?? [0, 0, 0];
  const v = Array.isArray(p) ? p : [p.x, p.y, p.z];
  const st = level.entities.find((e) => e.kind === 'star' && e.index === index && !e.removed);
  if (st?.hidden) st.reveal([v[0], v[1] + dy, v[2]]);
};

// ------------------------------------------------------------------ kleine Geometrie-Bausteine (Weltkoordinaten)

/** Ellipsoid mit Licht von oben. */
function blob(rx, ry, rz, x, y, z, color, o = {}) {
  const g = new THREE.SphereGeometry(1, o.ws ?? 10, o.hs ?? 7).toNonIndexed();
  g.scale(rx, ry, rz);
  if (o.rx) g.rotateX(o.rx);
  if (o.rz) g.rotateZ(o.rz);
  if (o.ry) g.rotateY(o.ry);
  g.translate(x, y, z);
  const c = L(color), dk = [c[0] * 0.7, c[1] * 0.7, c[2] * 0.75], lt = [Math.min(1, c[0] * 1.12), Math.min(1, c[1] * 1.12), Math.min(1, c[2] * 1.12)];
  return colorize(g, o.fn ?? ((p, n, out) => (n.y >= 0 ? mixc(c, lt, n.y, out) : mixc(c, dk, -n.y, out))));
}
/** Stab (Zylinder) von a nach b, Radius r0 → r1. */
function rod(a, b, r0, r1, color, seg = 6) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], len = Math.hypot(dx, dy, dz) || 1e-3;
  const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1).toNonIndexed();
  g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / len, dy / len, dz / len)));
  g.translate(a[0], a[1], a[2]);
  const c = L(color), dk = [c[0] * 0.72, c[1] * 0.72, c[2] * 0.72];
  return colorize(g, (p, n, out) => mixc(dk, c, 0.5 + n.y * 0.3 + n.z * 0.2, out));
}
/** Flacher Fleck auf dem Boden (Kreis rx × rz, Gier yaw). */
function patch(rx, rz, x, y, z, color, yaw = 0, seg = 9) {
  const g = new THREE.CircleGeometry(1, seg).toNonIndexed();
  g.rotateX(-Math.PI / 2);
  g.scale(rx, 1, rz);
  g.rotateY(yaw);
  g.translate(x, y, z);
  const c = L(color);
  return colorize(g, (p, n, out) => { out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; });
}
/** Teile in lokalen Koordinaten (Ursprung 0) drehen und an (x, y, z) setzen. */
function place(parts, x, y, z, yaw = 0, s = 1) {
  for (const g of parts) { if (s !== 1) g.scale(s, s, s); if (yaw) g.rotateY(yaw); g.translate(x, y, z); }
  return parts;
}
/** Kegel (Spitze unten) – Eiszapfen. */
function spike(r, h, x, y, z, color) {
  const g = new THREE.ConeGeometry(r, h, 5).toNonIndexed();
  g.rotateX(Math.PI);
  g.translate(x, y - h / 2, z);
  const c = L(color), t = L(0xffffff);
  return colorize(g, (p, n, out) => mixc(c, t, smooth(y - h, y, p.y) * 0.7, out));
}

// ------------------------------------------------------------------ Schnee-Zier (3-1)

/** Holzschlitten (rote Kufen, Holzsitz, Zugseil) mit Fußpunkt (x, y, z), Gier yaw (Spitze nach +X lokal). */
export function sled(level, x, y, z, yaw = 0, o = {}) {
  const P = [];
  const red = o.color ?? 0xd8302a, wood = 0xc88a4a;
  for (const s of [-1, 1]) {
    P.push(box(1.5, 0.06, 0.07, 0, 0.04, s * 0.28, red, { r: 0.02, seg: 1 }));
    const tip = box(0.36, 0.06, 0.07, 0, 0, 0, red, { r: 0.02, seg: 1 }); tip.rotateZ(0.95); tip.translate(0.84, 0.17, s * 0.28); P.push(tip);
    for (const px of [-0.45, 0, 0.45]) P.push(box(0.05, 0.22, 0.05, px, 0.15, s * 0.28, red, { r: 0.01, seg: 0 }));
  }
  for (let i = 0; i < 5; i++) P.push(box(0.2, 0.05, 0.72, -0.5 + i * 0.25, 0.29, 0, wood, { r: 0.02, seg: 1, topColor: 0xe0a868 }));
  P.push(box(1.24, 0.05, 0.1, 0, 0.27, 0.3, 0xa86a34, { r: 0.02, seg: 0 }), box(1.24, 0.05, 0.1, 0, 0.27, -0.3, 0xa86a34, { r: 0.02, seg: 0 }));
  // Zugseil im Schnee
  P.push(rod([1.0, 0.3, 0], [1.4, 0.06, 0.15], 0.018, 0.018, 0xf0e0b0, 4), rod([1.4, 0.06, 0.15], [1.95, 0.03, -0.2], 0.018, 0.018, 0xf0e0b0, 4));
  // Schneehäubchen auf dem Sitz
  P.push(blob(0.3, 0.06, 0.26, -0.25, 0.33, 0.05, 0xffffff, { ws: 8, hs: 4 }));
  addStatic(level, merge(place(P, x, y, z, yaw)));
}

/** Fußspuren (paarweise Abdrücke) entlang path [[x, z], …] auf Höhe y. o: step 0,62 m, size 1, color, kind 'stiefel'|'pfote'. */
export function footprints(level, path, y, o = {}) {
  const P = [];
  const step = o.step ?? 0.62, s = o.size ?? 1, col = o.color ?? 0xb8cce8;
  let side = 1;
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, az] = path[i], [bx, bz] = path[i + 1];
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.floor(len / step));
    const ux = (bx - ax) / len, uz = (bz - az) / len, yaw = Math.atan2(-uz, ux);
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) * step;
      const px = ax + ux * t - uz * 0.13 * side * s, pz = az + uz * t + ux * 0.13 * side * s;
      if (o.kind === 'pfote') {
        P.push(patch(0.06 * s, 0.06 * s, px, y + 0.012, pz, col, 0, 6));
        for (const [fx, fz] of [[0.09, -0.05], [0.1, 0.01], [0.08, 0.07]]) P.push(patch(0.025 * s, 0.025 * s, px + (ux * fx - uz * fz) * s, y + 0.012, pz + (uz * fx + ux * fz) * s, col, 0, 5));
      } else {
        P.push(patch(0.13 * s, 0.07 * s, px, y + 0.012, pz, col, yaw, 8));
        P.push(patch(0.06 * s, 0.055 * s, px - ux * 0.17 * s, y + 0.012, pz - uz * 0.17 * s, col, yaw, 6));
      }
      side = -side;
    }
  }
  addStatic(level, merge(P), { castShadow: false });
}

/** Schlittenspur: zwei parallele Rillen entlang path [[x, z], …]. */
export function sledTrack(level, path, y, o = {}) {
  const P = [];
  const col = o.color ?? 0xc4d6ee, gap = o.gap ?? 0.28;
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, az] = path[i], [bx, bz] = path[i + 1];
    const len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len;
    for (const s of [-1, 1]) {
      const g = new THREE.PlaneGeometry(len + 0.05, 0.07).toNonIndexed();
      g.rotateX(-Math.PI / 2);
      g.rotateY(Math.atan2(-uz, ux));
      g.translate((ax + bx) / 2 - uz * gap * s, y + 0.011, (az + bz) / 2 + ux * gap * s);
      const c = L(col);
      P.push(colorize(g, (p, n, out) => { out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; }));
    }
  }
  addStatic(level, merge(P), { castShadow: false });
}

/** Eiszapfen-Zier (ohne Gefahr) unter einer Kante von (x0, z0) nach (x1, z1) auf Höhe y. */
export function icicleFringe(level, x0, z0, x1, z1, y, o = {}) {
  const P = [];
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(len * (o.density ?? 2.2)));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, h = (o.len ?? 0.55) * (0.45 + ((Math.sin(i * 12.9898 + x0) * 43758.5453) % 1 + 1) % 1 * 0.9);
    P.push(spike(0.06 + h * 0.08, h, x0 + (x1 - x0) * t, y, z0 + (z1 - z0) * t, 0x9fe4ff));
  }
  addStatic(level, merge(P), { castShadow: false });
}

/** Schneewehen (flache weiße Buckel ohne Kollision, am Wegrand): list [[x, y, z, Länge, Gier]]. */
export function snowDrifts(level, list) {
  const P = [];
  const w = L(0xffffff), b = L(0xcadcf2);
  for (const [x, y, z, len = 2.4, yaw = 0] of list) {
    const n = Math.max(2, Math.round(len / 0.8));
    for (let i = 0; i < n; i++) {
      const u = (i / (n - 1) - 0.5) * len, r = 0.55 + Math.sin(i * 2.3 + x) * 0.15 + (i % 2) * 0.1;
      const g = new THREE.SphereGeometry(r, 8, 3, 0, TAU, 0, Math.PI / 2).toNonIndexed();
      g.scale(1.25, 0.42, 1);
      g.rotateY(yaw);
      g.translate(x + Math.cos(yaw) * u, y - 0.02, z - Math.sin(yaw) * u);
      P.push(colorize(g, (p, nn, out) => mixc(b, w, smooth(-0.1, 0.8, nn.y + nn.z * 0.2), out)));
    }
  }
  addStatic(level, merge(P), { castShadow: false });
}

/** Frostbüsche (dunkelgrün mit Schneehauben und roten Beeren): list [[x, y, z, Größe]]. Kollision: Zylinder. */
export function frostBushes(level, list) {
  const P = [];
  for (const [x, y, z, s = 1] of list) {
    for (const [dx, dz, r] of [[0, 0, 0.5], [-0.42, 0.18, 0.36], [0.4, -0.15, 0.38], [0.08, 0.38, 0.32]]) {
      P.push(blob(r * s, r * 0.8 * s, r * s, x + dx * s, y + r * 0.7 * s, z + dz * s, 0x2f6a4a, { ws: 7, hs: 5 }));
      P.push(blob(r * 0.86 * s, r * 0.32 * s, r * 0.86 * s, x + dx * s, y + r * 1.25 * s, z + dz * s, 0xffffff, { ws: 7, hs: 3 }));
    }
    for (let i = 0; i < 5; i++) { const a = i * 1.3 + x; P.push(blob(0.06 * s, 0.06 * s, 0.06 * s, x + Math.cos(a) * 0.5 * s, y + (0.35 + (i % 2) * 0.2) * s, z + Math.sin(a) * 0.5 * s, 0xe0283a, { ws: 5, hs: 3 })); }
    level.world.add({ type: 'cyl', x, z, r: 0.55 * s, y0: y, y1: y + 0.8 * s, tag: 'frostbusch' });
  }
  addStatic(level, merge(P));
}

/** Schneeball-Vorrat (Pyramide aus Schneebällen, nur Optik) mit Fähnchen. */
export function snowballPile(level, x, y, z, o = {}) {
  const P = [], r = o.r ?? 0.28;
  for (const [i, k, j] of [[-1, 0, 0], [1, 0, 0], [0, 0, 1.7], [-0.5, 1, 0.55], [0.5, 1, 0.55], [0, 2, 0.35]]) {
    P.push(blob(r, r * 0.92, r, x + i * r, y + r * 0.9 + k * r * 1.5, z + (j - 0.6) * r, 0xffffff, { ws: 8, hs: 6, fn: (p, n, out) => mixc(L(0xc4d6f0), L(0xffffff), smooth(-0.5, 0.7, n.y + n.z * 0.3), out) }));
  }
  if (o.flag !== false) {
    P.push(rod([x + 0.5, y, z - 0.4], [x + 0.5, y + 1.5, z - 0.4], 0.025, 0.02, 0x8a5a32, 5));
    const f = new THREE.BufferGeometry();
    f.setAttribute('position', new THREE.Float32BufferAttribute([x + 0.5, y + 1.5, z - 0.4, x + 0.5, y + 1.15, z - 0.4, x + 1.0, y + 1.32, z - 0.4, x + 0.5, y + 1.15, z - 0.4, x + 0.5, y + 1.5, z - 0.4, x + 1.0, y + 1.32, z - 0.4], 3));
    f.computeVertexNormals();
    const c = L(o.color ?? 0xff4a5a);
    P.push(colorize(f, (p, n, out) => { out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; }));
  }
  addStatic(level, merge(P));
}

/** Holzbank mit Schneehaube (Fußpunkt Mitte, Gier yaw: Sitzfläche entlang X lokal, Lehne nach −Z lokal). */
export function bench(level, x, y, z, yaw = 0, o = {}) {
  const P = [];
  const wood = o.wood ?? 0xb87a44, leg = o.leg ?? 0x4a4a5a;
  for (let i = 0; i < 3; i++) P.push(box(1.7, 0.06, 0.13, 0, 0.46, -0.16 + i * 0.16, wood, { r: 0.02, seg: 1, topColor: 0xd89a5a }));
  for (let i = 0; i < 2; i++) P.push(box(1.7, 0.12, 0.05, 0, 0.66 + i * 0.2, -0.27, wood, { r: 0.02, seg: 1 }));
  for (const s of [-0.72, 0.72]) { P.push(box(0.06, 0.46, 0.4, s, 0.23, 0, leg, { r: 0.02, seg: 0 })); P.push(box(0.06, 0.5, 0.05, s, 0.68, -0.27, leg, { r: 0.02, seg: 0 })); }
  if (o.snow !== false) P.push(blob(0.8, 0.05, 0.2, 0, 0.51, 0, 0xffffff, { ws: 10, hs: 4 }), blob(0.78, 0.045, 0.05, 0, 0.94, -0.27, 0xffffff, { ws: 10, hs: 3 }));
  addStatic(level, merge(place(P, x, y, z, yaw)));
}

/** Vogelhäuschen auf einem Pfahl (Fußpunkt). */
export function birdhouse(level, x, y, z, yaw = 0) {
  const P = [
    box(0.1, 1.6, 0.1, 0, 0.8, 0, 0x8a5a32, { r: 0.02, seg: 0 }),
    box(0.5, 0.42, 0.44, 0, 1.8, 0, 0xe0a050, { r: 0.04, seg: 1 }),
    box(0.62, 0.05, 0.56, 0, 1.6, 0, 0x8a5a32, { r: 0.02, seg: 0 }),
  ];
  const roof = new THREE.ConeGeometry(0.46, 0.34, 4).toNonIndexed(); roof.rotateY(Math.PI / 4); roof.translate(0, 2.18, 0);
  P.push(colorize(roof, (p, n, out) => mixc(L(0xc8402a), L(0xffffff), smooth(2.1, 2.3, p.y), out)));
  P.push(blob(0.1, 0.1, 0.03, 0.26, 1.82, 0, 0x2a1a10, { ws: 8, hs: 5 }));
  // Vögelchen auf der Stange
  P.push(blob(0.08, 0.07, 0.07, 0.36, 1.66, 0.1, 0xe84a3a, { ws: 7, hs: 5 }), blob(0.05, 0.05, 0.05, 0.42, 1.73, 0.1, 0xe84a3a, { ws: 6, hs: 4 }));
  addStatic(level, merge(place(P, x, y, z, yaw)));
}

/** Schneeengel (Abdruck im Schnee, Arme und Beine ausgebreitet). */
export function snowAngel(level, x, y, z, yaw = 0) {
  const c = 0xc6d8f0, P = [
    patch(0.22, 0.24, 0, 0.012, -0.55, c, 0, 10),
    patch(0.3, 0.42, 0, 0.012, 0, c, 0, 10),
    patch(0.5, 0.18, -0.25, 0.012, -0.05, c, 0.7, 10), patch(0.5, 0.18, 0.25, 0.012, -0.05, c, -0.7, 10),
    patch(0.22, 0.42, -0.2, 0.012, 0.55, c, -0.35, 9), patch(0.22, 0.42, 0.2, 0.012, 0.55, c, 0.35, 9),
  ];
  addStatic(level, merge(place(P, x, y, z, yaw)), { castShadow: false });
}

/**
 * Großer Schneebaum mit begehbarer Krone (Bauplan 3-1 „vom Baum aus hinüberfliegen“): Stamm, drei verschneite
 * Ast-Stufen (begehbar) um den Stamm, flache Krone mit dicker Schneedecke. Kollision: Stamm-Zylinder, Stufen und Krone
 * als Zylinder. o: top (Kronen-Oberseite, absolut), r (Kronenradius 2.3), steps: [[dx, dz, y, r], …] (Ast-Stufen,
 * y absolut).
 */
export function snowTree(level, x, y, z, o = {}) {
  const top = o.top ?? y + 7.6, R = o.r ?? 2.3, crownH = 0.8;
  const P = [];
  const bark = L(0x6a4428), barkL = L(0x9a6a40);
  const t = new THREE.CylinderGeometry(0.42, 0.62, top - crownH - y + 0.5, 10, 3, true).toNonIndexed();
  t.translate(x, y + (top - crownH - y + 0.5) / 2, z);
  P.push(colorize(t, (p, n, out) => mixc(bark, barkL, smooth(-0.5, 0.9, n.x * 0.6 + n.z * 0.8), out)));
  for (let i = 0; i < 4; i++) { const a = i * 1.6 + 0.4; P.push(blob(0.38, 0.22, 0.38, x + Math.cos(a) * 0.6, y + 0.08, z + Math.sin(a) * 0.6, 0x8a5a34, { ws: 7, hs: 5 })); }
  level.world.add({ type: 'cyl', x, z, r: 0.55, y0: y, y1: top - crownH, tag: 'schneebaum' });
  // Ast-Stufen: Ast aus dem Stamm, flaches verschneites Polster
  for (const [dx, dz, sy, sr = 0.85] of o.steps ?? []) {
    const len = Math.hypot(dx, dz);
    P.push(rod([x + dx / len * 0.4, sy - 0.9, z + dz / len * 0.4], [x + dx, sy - 0.25, z + dz], 0.15, 0.1, 0x7a4e2e, 6));
    P.push(blob(sr, 0.22, sr, x + dx, sy - 0.18, z + dz, 0x2f7a4a, { ws: 9, hs: 5 }));
    P.push(blob(sr * 0.96, 0.12, sr * 0.96, x + dx, sy - 0.04, z + dz, 0xffffff, { ws: 9, hs: 4 }));
    level.world.add({ type: 'cyl', x: x + dx, z: z + dz, r: sr, y0: sy - 0.4, y1: sy, tag: 'ast' });
  }
  // Krone: dunkelgrüne Laubbuschen, dicke Schneedecke, Schneewülste über den Rand
  const green = [0x2f7a4a, 0x3f9a5a, 0x245e3c];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + 0.2, rr = R * 0.72;
    P.push(blob(R * 0.42, R * 0.3, R * 0.42, x + Math.cos(a) * rr, top - crownH - 0.2, z + Math.sin(a) * rr, green[i % 3], { ws: 8, hs: 6 }));
  }
  P.push(blob(R * 0.75, R * 0.35, R * 0.75, x, top - crownH - 0.45, z, green[2], { ws: 10, hs: 6 }));
  const disc = new THREE.CylinderGeometry(R, R * 0.92, crownH, 24, 1).toNonIndexed();
  disc.translate(x, top - crownH / 2, z);
  const sw = L(0xffffff), ss = L(0xc8daf2);
  P.push(colorize(disc, (p, n, out) => mixc(ss, sw, smooth(-0.2, 0.8, n.y), out)));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    P.push(blob(0.42, 0.26, 0.42, x + Math.cos(a) * R * 0.95, top - 0.12, z + Math.sin(a) * R * 0.95, 0xffffff, { ws: 7, hs: 5 }));
  }
  // rote Beeren und ein Lichterkranz an den Wülsten
  for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU + 0.5; P.push(blob(0.09, 0.09, 0.09, x + Math.cos(a) * R * 1.02, top - 0.42, z + Math.sin(a) * R * 1.02, 0xe02a2a, { ws: 6, hs: 4 })); }
  addStatic(level, merge(P));
  level.world.add({ type: 'cyl', x, z, r: R, y0: top - crownH, y1: top, tag: 'schneebaum-krone' });
  if (o.lights) {
    const G = [];
    const cols = [0xfff0a0, 0xff7a7a, 0x9ad8ff, 0xb8ff9a];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * TAU, yy = top - 0.5 - (i % 2) * 0.12;
      const g = new THREE.SphereGeometry(0.07, 5, 3).toNonIndexed();
      g.translate(x + Math.cos(a) * (R + 0.08), yy, z + Math.sin(a) * (R + 0.08));
      const c = L(cols[i % 4]);
      G.push(colorize(g, (p, n, out) => { out[0] = c[0] * 1.4; out[1] = c[1] * 1.4; out[2] = c[2] * 1.4; }));
    }
    addStatic(level, merge(G), { material: 'glow', castShadow: false });
  }
}

/**
 * Gefrorener Wasserfall an einer Felswand (Vorderseite +Z): Eissäulen in Blau-Weiß, Eiszapfen-Saum oben, gefrorenes
 * Becken unten (nur Optik). x Mitte, z Wandfläche, y0 Fuß, y1 Oberkante, w Breite.
 */
export function iceFall(level, x, z, y0, y1, w = 3) {
  const P = [];
  const n = Math.max(3, Math.round(w / 0.45));
  const c0 = L(0x7ac8f0), c1 = L(0xe8f8ff);
  for (let i = 0; i < n; i++) {
    const u = (i / (n - 1) - 0.5) * w, h = (y1 - y0) * (0.82 + ((i * 7) % 5) * 0.045), r = 0.22 + ((i * 3) % 4) * 0.05;
    const g = new THREE.CylinderGeometry(r * 0.8, r * 1.15, h, 6, 4, false).toNonIndexed();
    const pos = g.attributes.position;
    for (let k = 0; k < pos.count; k++) { const yy = pos.getY(k); const wob = Math.sin(yy * 2.2 + i) * 0.06; pos.setX(k, pos.getX(k) + wob); }
    g.computeVertexNormals();
    g.translate(x + u, y1 - h / 2, z + r * 0.9);
    P.push(colorize(g, (p, nn, out) => mixc(c0, c1, smooth(-0.4, 0.9, nn.z * 0.6 + nn.y * 0.4 + Math.sin(p.y * 3 + i) * 0.15), out)));
  }
  const pool = new THREE.CylinderGeometry(w * 0.62, w * 0.7, 0.16, 12).toNonIndexed();
  pool.scale(1, 1, 0.6);
  pool.translate(x, y0 + 0.08, z + w * 0.42);
  P.push(colorize(pool, (p, nn, out) => mixc(c0, c1, smooth(-0.2, 1, nn.y), out)));
  addStatic(level, merge(P), { castShadow: false });
}

/** Schneebänder an einer hohen Felswand (Vorderseite +Z): flache verschneite Simse mit Eiszapfen (nur Optik). */
export function wallLedges(level, list) {
  const P = [];
  for (const [x, y, z, w] of list) {
    P.push(box(w, 0.28, 0.7, x, y, z + 0.3, 0x8e9cb8, { r: 0.1, seg: 1, topColor: 0xffffff }));
    P.push(blob(w * 0.52, 0.12, 0.42, x, y + 0.15, z + 0.3, 0xffffff, { ws: 8, hs: 3 }));
    const k = Math.max(2, Math.round(w * 1.6));
    for (let i = 0; i < k; i++) P.push(spike(0.06, 0.3 + ((i * 5) % 3) * 0.15, x - w / 2 + (i + 0.5) * w / k, y - 0.14, z + 0.62, 0x9fe4ff));
  }
  addStatic(level, merge(P), { castShadow: false });
}

/** Sonnenschatten der Modelle bestimmter Entitäten ausschalten (Budget; der Blob-Schatten bleibt). */
export function noModelShadow(level, kinds) {
  const want = new Set(kinds);
  for (const e of level.entities) if (want.has(e.kind)) e.model?.root.traverse((m) => { if (m.isMesh) m.castShadow = false; });
}

/** Kristalle (leuchtend) in einer Höhle: list [[x, y, z, size, color]]. */
export function crystals(level, list) {
  const G = [];
  for (const [x, y, z, s = 1, col = 0x9ff0ff] of list) {
    for (let i = 0; i < 4; i++) {
      const a = i * 1.9, h = s * (0.5 + (i % 3) * 0.25);
      const g = new THREE.OctahedronGeometry(0.16 * s, 0);
      g.scale(1, h / (0.32 * s), 1);
      g.rotateZ(Math.cos(a) * 0.35); g.rotateX(Math.sin(a) * 0.35);
      g.translate(x + Math.cos(a) * 0.16 * s, y + h * 0.42, z + Math.sin(a) * 0.16 * s);
      const c = L(col), w = L(0xffffff);
      G.push(colorize(g, (p, n, out) => mixc(c, w, smooth(0.3, 1, n.y) * 0.6, out)));
    }
  }
  addStatic(level, merge(G), { material: 'glow', castShadow: false });
}

// ------------------------------------------------------------------ belebte Kleinigkeiten (je ein Mesh)

/** Mesh aus Teilen (lokal) mit Material world, ohne Sonnenschatten; update(dt, mesh) je Bild. */
function liveMesh(level, parts, x, y, z, yaw, update, o = {}) {
  if (!level.view) { for (const g of parts) g.dispose(); return null; }
  const geo = merge(parts);
  const mesh = new THREE.Mesh(geo, level.view.mats?.world);
  mesh.castShadow = false; mesh.receiveShadow = false;
  mesh.position.set(x, y, z);
  mesh.rotation.y = yaw;
  mesh.name = o.name ?? 'zier:lebendig';
  let t = o.phase ?? 0;
  addObject(level, mesh, (dt) => { t += Math.min(dt ?? 0, 0.1); update?.(t, mesh, dt); });
  if (o.shadow !== false) level.view.shadows?.add({ pos: mesh.position, radius: o.shadowR ?? 0.3, alive: () => true, visible: () => mesh.visible });
  return mesh;
}

/** Pinguinkind (lokal, Blick nach +X, Fußpunkt 0): Mütze und Schal in color. */
function penguinParts(color = 0xe0402a, o = {}) {
  const dark = 0x1e2a48, belly = 0xfaf8f2, orange = 0xffa024;
  const P = [
    blob(0.22, 0.29, 0.2, 0, 0.31, 0, dark),
    blob(0.16, 0.23, 0.15, 0.07, 0.29, 0, belly),
    blob(0.165, 0.15, 0.16, 0.01, 0.64, 0, dark),
    blob(0.11, 0.1, 0.12, 0.08, 0.63, 0, belly, { ws: 8, hs: 6 }),
    blob(0.035, 0.045, 0.03, 0.16, 0.68, 0.055, 0x101018, { ws: 6, hs: 4 }), blob(0.035, 0.045, 0.03, 0.16, 0.68, -0.055, 0x101018, { ws: 6, hs: 4 }),
    blob(0.012, 0.012, 0.012, 0.19, 0.695, 0.06, 0xffffff, { ws: 4, hs: 3 }), blob(0.012, 0.012, 0.012, 0.19, 0.695, -0.05, 0xffffff, { ws: 4, hs: 3 }),
    blob(0.025, 0.02, 0.02, 0.15, 0.62, 0.09, 0xffa0b0, { ws: 5, hs: 3 }), blob(0.025, 0.02, 0.02, 0.15, 0.62, -0.09, 0xffa0b0, { ws: 5, hs: 3 }),
    blob(0.06, 0.03, 0.04, 0.2, 0.62, 0, orange, { ws: 6, hs: 4 }),
    blob(0.07, 0.025, 0.05, 0.07, 0.02, 0.08, orange, { ws: 6, hs: 3 }), blob(0.07, 0.025, 0.05, 0.07, 0.02, -0.08, orange, { ws: 6, hs: 3 }),
    blob(0.05, 0.16, 0.03, -0.01, 0.36, 0.21, dark, { rx: -0.35, ws: 6, hs: 4 }), blob(0.05, 0.16, 0.03, -0.01, 0.36, -0.21, dark, { rx: 0.35, ws: 6, hs: 4 }),
  ];
  // Schal und Mütze mit Bommel
  const scarf = new THREE.TorusGeometry(0.15, 0.04, 5, 12).toNonIndexed(); scarf.rotateX(Math.PI / 2); scarf.translate(0.0, 0.5, 0);
  const sc = L(color);
  P.push(colorize(scarf, (p, n, out) => mixc([sc[0] * 0.7, sc[1] * 0.7, sc[2] * 0.7], sc, 0.5 + n.y * 0.5, out)));
  P.push(box(0.05, 0.16, 0.07, -0.12, 0.43, 0.1, color, { r: 0.02, seg: 0 }));
  if (o.hat !== false) {
    P.push(blob(0.15, 0.09, 0.15, 0, 0.75, 0, color, { ws: 9, hs: 5 }));
    P.push(blob(0.16, 0.035, 0.16, 0, 0.72, 0, 0xffffff, { ws: 9, hs: 3 }));
    P.push(blob(0.055, 0.055, 0.055, -0.02, 0.86, 0, 0xffffff, { ws: 6, hs: 4 }));
  }
  return P;
}

/**
 * Pinguinkinder: list = [{ pos, yaw, color, mode: 'watschel'|'winken'|'rutschen', path: [[x, z], [x, z]] (rutschen),
 * phase }]. Watscheln: auf der Stelle wackeln und sich umdrehen; Rutschen: auf dem Bauch hin und her über eine Eisfläche.
 */
export function penguins(level, list) {
  for (const it of list) {
    const [x, y, z] = it.pos;
    const parts = penguinParts(it.color, it);
    const s = it.scale ?? 1;
    if (s !== 1) for (const g of parts) g.scale(s, s, s);
    const yaw0 = it.yaw ?? 0;
    if (it.mode === 'rutschen' && it.path) {
      const [[ax, az], [bx, bz]] = it.path;
      const len = Math.hypot(bx - ax, bz - az), dir = Math.atan2(-(bz - az), bx - ax);
      liveMesh(level, parts, ax, y, az, dir, (t, m) => {
        // Bauchrutschen hin (2,2 s), aufstehen, zurückwatscheln (len / 0,9 s), umdrehen
        const tw = len / 0.9, T = 2.2 + 0.5 + tw + 0.5, k = t % T;
        let u, lie = 0, back = false;
        if (k < 2.2) { u = smooth(0, 1, k / 2.2) * 0.3 + (k / 2.2) * 0.7; lie = 1; }
        else if (k < 2.7) { u = 1; lie = 1 - (k - 2.2) / 0.5; }
        else if (k < 2.7 + tw) { u = 1 - (k - 2.7) / tw; back = true; }
        else { u = 0; }
        m.position.set(ax + (bx - ax) * u, y + lie * 0.2, az + (bz - az) * u);
        m.rotation.set(0, back ? dir + Math.PI : dir, 0);
        m.rotateZ(-lie * 1.35);
        if (back) m.rotateX(Math.sin(t * 9) * 0.14);
      }, { phase: it.phase ?? 0, shadowR: 0.28 * s });
    } else {
      liveMesh(level, parts, x, y, z, yaw0, (t, m) => {
        const wave = it.mode === 'winken';
        m.rotation.set(0, yaw0 + Math.sin(t * 0.4) * 0.5, 0);
        m.rotateX(Math.sin(t * (wave ? 3 : 5)) * (wave ? 0.08 : 0.12));
        m.position.y = y + Math.abs(Math.sin(t * 5)) * (wave ? 0.01 : 0.035);
      }, { phase: it.phase ?? 0, shadowR: 0.26 * s });
    }
  }
}

/** Robbenkind (lokal, liegt längs X, Kopf nach +X): weißes Fell, große dunkle Augen. */
function sealParts() {
  const fur = 0xf4f6fa, sh = 0xd8e0ec;
  return [
    blob(0.42, 0.22, 0.26, 0, 0.22, 0, fur),
    blob(0.2, 0.18, 0.2, 0.36, 0.34, 0, fur),
    blob(0.06, 0.07, 0.05, 0.5, 0.38, 0.08, 0x141420, { ws: 7, hs: 5 }), blob(0.06, 0.07, 0.05, 0.5, 0.38, -0.08, 0x141420, { ws: 7, hs: 5 }),
    blob(0.018, 0.018, 0.018, 0.55, 0.405, 0.095, 0xffffff, { ws: 4, hs: 3 }), blob(0.018, 0.018, 0.018, 0.55, 0.405, -0.065, 0xffffff, { ws: 4, hs: 3 }),
    blob(0.035, 0.028, 0.035, 0.56, 0.31, 0, 0x2a2a34, { ws: 6, hs: 4 }),
    blob(0.12, 0.04, 0.08, 0.12, 0.05, 0.22, sh, { ry: 0.5, ws: 6, hs: 3 }), blob(0.12, 0.04, 0.08, 0.12, 0.05, -0.22, sh, { ry: -0.5, ws: 6, hs: 3 }),
    blob(0.1, 0.035, 0.12, -0.44, 0.06, 0.07, sh, { ws: 6, hs: 3 }), blob(0.1, 0.035, 0.12, -0.44, 0.06, -0.07, sh, { ws: 6, hs: 3 }),
  ];
}

/** Robbenkinder auf Eisschollen: list = [{ pos, yaw, floe: true, phase }] – heben ab und zu den Kopf und schaukeln. */
export function seals(level, list) {
  for (const it of list) {
    const [x, y, z] = it.pos;
    if (it.floe !== false) {
      const g = new THREE.CylinderGeometry(0.85, 0.95, 0.18, 7).toNonIndexed();
      g.rotateY(it.yaw ?? 0);
      g.translate(x, y + 0.09, z);
      const a = L(0xe8f6ff), b = L(0x9ad0f0);
      addStatic(level, colorize(g, (p, n, out) => mixc(b, a, smooth(-0.3, 0.9, n.y), out)), { castShadow: false });
    }
    const yaw0 = it.yaw ?? 0;
    liveMesh(level, sealParts(), x, y + (it.floe !== false ? 0.18 : 0), z, yaw0, (t, m) => {
      const k = Math.max(0, Math.sin(t * 0.9)) ** 3;
      m.rotation.set(0, yaw0 + Math.sin(t * 0.3) * 0.25, k * 0.3);
      m.rotateX(Math.sin(t * 1.7) * 0.05);
    }, { phase: it.phase ?? 0, shadowR: 0.45 });
  }
}

/**
 * Rauch aus dem Iglu / Schornstein: weiche Kugeln steigen, wachsen und verblassen (eine Instanz-Gruppe, 1 Zeichenaufruf,
 * kein Schatten). o: n (7), rise (2.6 m), drift [x, z] (Wind), size (0.5).
 */
export function smoke(level, pos, o = {}) {
  if (!level.view) return;
  const n = o.n ?? 7, rise = o.rise ?? 2.6, size = o.size ?? 0.5, [wx, wz] = o.drift ?? [0.5, -0.2];
  const mat = new THREE.MeshLambertMaterial({ color: o.color ?? 0xf2f6fc, transparent: true, opacity: 0.72, depthWrite: false });
  const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), mat, n);
  mesh.castShadow = false; mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  mesh.name = 'zier:rauch';
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), V = new THREE.Vector3();
  const [x, y, z] = pos;
  let t = 0;
  const T = o.period ?? 3.2;
  const upd = () => {
    for (let i = 0; i < n; i++) {
      const k = ((t / T + i / n) % 1 + 1) % 1;
      const s = size * (0.25 + smooth(0, 0.35, k) * 0.75) * (1 - smooth(0.75, 1, k) * 0.8);
      V.set(x + wx * k * rise * 0.6 + Math.sin(t * 1.3 + i) * 0.08, y + k * rise, z + wz * k * rise * 0.6);
      S.setScalar(Math.max(0.001, s));
      M.compose(V, Q, S);
      mesh.setMatrixAt(i, M);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  upd();
  addObject(level, mesh, (dt) => { t += Math.min(dt ?? 0, 0.1); upd(); });
}

// ------------------------------------------------------------------ Sparsame Fernkulisse und Gegner-Instanzen

/**
 * Ferne Tannen (sparsam: ≈ 70 Dreiecke je Baum statt ≈ 3 k des Registry-Modells), ohne Sonnenschatten, ohne Kollision:
 * Streuungen { pos: [x, y, z], size: [w, d], n, scale: [a, b] (Höhe in m), gap, avoid, seed }.
 */
export function farFirs(level, list) {
  if (!level.view) return;
  const P = [];
  const dark = L(0x1f5a3c), mid = L(0x2f7a4a), white = L(0xf4f8ff), blue = L(0xc4d6f0), bark = L(0x5a3a24);
  for (const s of list) {
    let seed = (s.seed ?? 1) * 9301 + 49297;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const [w, d] = s.size, pts = [];
    for (let k = 0; k < (s.n ?? 8) * 30 && pts.length < (s.n ?? 8); k++) {
      const x = s.pos[0] + (rnd() - 0.5) * w, z = s.pos[2] + (rnd() - 0.5) * d;
      if (pts.some((q) => Math.hypot(q[0] - x, q[1] - z) < (s.gap ?? 2.6))) continue;
      if ((s.avoid ?? []).some((a) => Math.hypot(a[0] - x, a[1] - z) < (a[2] ?? 2))) continue;
      pts.push([x, z]);
    }
    const [h0, h1] = s.scale ?? [3.5, 6];
    for (const [x, z] of pts) {
      const H = h0 + rnd() * (h1 - h0), y = s.pos[1];
      const trunk = new THREE.CylinderGeometry(0.1 * H / 4, 0.14 * H / 4, H * 0.25, 5, 1, true).toNonIndexed();
      trunk.translate(x, y + H * 0.125, z);
      P.push(colorize(trunk, (p, n, out) => { out[0] = bark[0]; out[1] = bark[1]; out[2] = bark[2]; }));
      for (let t = 0; t < 3; t++) {
        const r = H * (0.36 - t * 0.085), h = H * (0.42 - t * 0.06), y0 = y + H * (0.18 + t * 0.24);
        const g = new THREE.ConeGeometry(r, h, 7, 1, true).toNonIndexed();
        g.rotateY(rnd() * 3);
        g.translate(x, y0 + h / 2, z);
        P.push(colorize(g, (p, n, out) => {
          const k = smooth(0.15, 0.85, (p.y - y0) / h);
          mixc(mixc(dark, mid, smooth(-0.5, 0.8, n.x * 0.5 + n.z * 0.5), out), mixc(blue, white, smooth(0, 1, n.y + n.z * 0.3), [0, 0, 0]), k * 0.85 + (n.y > 0.6 ? 0.1 : 0), out);
        }));
      }
    }
  }
  addStatic(level, merge(P), { castShadow: false });
}

/**
 * Verschneite Tannen in Wegnähe (≈ 260 Dreiecke statt ≈ 3 k des Registry-Modells, mit Schatten, Stamm fest):
 * list = [[x, y, z, Höhe?, Gier?], …]. Vier gezackte Etagen mit Schneekappen und Schneewülsten am Rand.
 */
export function snowFirs(level, list, o = {}) {
  const P = [];
  const dark = L(0x1d5a3a), mid = L(0x2e7d4c), white = L(0xffffff), blue = L(0xcfe0f6), bark = L(0x6a4428);
  for (const [x, y, z, H = 4, yaw = 0] of list) {
    const trunk = new THREE.CylinderGeometry(0.12 * H / 4, 0.18 * H / 4, H * 0.3, 6, 1, true).toNonIndexed();
    trunk.translate(x, y + H * 0.15, z);
    P.push(colorize(trunk, (p, n, out) => mixc([bark[0] * 0.7, bark[1] * 0.7, bark[2] * 0.7], bark, 0.5 + n.x * 0.5, out)));
    for (let t = 0; t < 4; t++) {
      const r = H * (0.34 - t * 0.065), h = H * (0.36 - t * 0.04), y0 = y + H * (0.16 + t * 0.19);
      const g = new THREE.ConeGeometry(r, h, 11, 2, false).toNonIndexed();
      // gezackter Rand: untere Ringpunkte abwechselnd tiefer/weiter
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const py = pos.getY(i);
        if (py < -h / 2 + 1e-3) { const a = Math.atan2(pos.getZ(i), pos.getX(i)); const k = Math.round(a / (TAU / 11)) & 1; pos.setY(i, py - k * 0.12 * H / 4); pos.setX(i, pos.getX(i) * (1 + k * 0.1)); pos.setZ(i, pos.getZ(i) * (1 + k * 0.1)); }
      }
      g.computeVertexNormals();
      g.rotateY(yaw + t * 0.7);
      g.translate(x, y0 + h / 2, z);
      P.push(colorize(g, (p, n, out) => {
        const k = (p.y - y0) / h;
        mixc(dark, mid, smooth(-0.6, 0.8, n.x * 0.4 + n.z * 0.6), out);
        if (n.y < -0.2) { out[0] *= 0.6; out[1] *= 0.6; out[2] *= 0.6; return; }
        const s = smooth(0.42, 0.62, k) + smooth(0.06, 0.0, k) * 0.9;
        mixc(out, mixc(blue, white, smooth(0.2, 0.9, n.y + n.z * 0.3), [0, 0, 0]), Math.min(1, s), out);
      }));
    }
    const cap = new THREE.SphereGeometry(0.16 * H / 4, 6, 4).toNonIndexed();
    cap.translate(x, y + H * 0.98, z);
    P.push(colorize(cap, (p, n, out) => { out[0] = white[0]; out[1] = white[1]; out[2] = white[2]; }));
    if (o.solid !== false) level.world.add({ type: 'cyl', x, z, r: 0.28 * H / 4, y0: y, y1: y + H * 0.5, tag: 'tanne' });
  }
  addStatic(level, merge(P), { castShadow: o.shadow !== false });
}

/**
 * Gleiche Gegner-Modelle als Instanzen zeichnen (Budget: ein Schwarm aus neun Flatterkäfern kostet sonst ≈ 80
 * Zeichenaufrufe – je Modell 7 Meshes plus Schatten). Die Entitäten rechnen und animieren ihre Modelle wie bisher;
 * je Bild werden die Teil-Matrizen in je eine InstancedMesh pro Modellteil übernommen und die Einzelmodelle nicht
 * gezeichnet. Gruppen = gleiche Geometrien und Materialien (Registry-Caches). Weiter als far m von der Figur: nicht
 * gezeichnet. Nur Darstellung.
 */
export function instanceEnemies(level, kinds, o = {}) {
  if (!level.view) return null;
  const want = new Set(kinds), far = o.far ?? 46;
  const groups = new Map();
  for (const e of level.entities) {
    if (!want.has(e.kind) || !e.model?.root) continue;
    const meshes = [];
    let ok = true;
    e.model.root.traverse((m) => { if (m.isSkinnedMesh || (m.isMesh && Array.isArray(m.material))) ok = false; else if (m.isMesh) meshes.push(m); });
    if (!ok || !meshes.length) continue;
    const key = `${e.kind}|${meshes.map((m) => `${m.geometry.uuid}:${m.material.uuid}:${m.isInstancedMesh ? m.count : 1}`).join(',')}`;
    if (!groups.has(key)) groups.set(key, { ents: [], parts: meshes.map((m) => ({ geo: m.geometry, mat: m.material, cast: m.castShadow, recv: m.receiveShadow, n: m.isInstancedMesh ? m.count : 1 })) });
    groups.get(key).ents.push({ e, meshes });
  }
  const live = [];
  for (const G of groups.values()) {
    if (G.ents.length < 2) continue;
    G.inst = G.parts.map((pt) => {
      const im = new THREE.InstancedMesh(pt.geo, pt.mat, G.ents.length * pt.n);
      im.castShadow = pt.cast && !(o.noShadow ?? []).includes(G.ents[0].e.kind); im.receiveShadow = pt.recv;
      im.frustumCulled = false;
      im.count = 0;
      im.visible = false;
      im.name = `instanzen:gegner:${G.ents[0].e.kind}`;
      addObject(level, im);
      im.traverse((x) => { x.userData.owned = false; });   // Geometrie/Material gehören dem Modell-Cache
      return im;
    });
    live.push(G);
  }
  const vis = (m, root) => { for (let q = m; q && q !== root; q = q.parent) if (!q.visible) return false; return true; };
  const M = new THREE.Matrix4(), Mi = new THREE.Matrix4(), F = new THREE.Frustum(), S = new THREE.Sphere();
  level.view.onFrame(() => {
    const p = level.player, cam = level.view.camera;
    cam.updateMatrixWorld();
    F.setFromProjectionMatrix(M.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    for (const G of live) {
      const fill = G.inst.map(() => 0);
      for (const { e, meshes } of G.ents) {
        const root = e.model?.root;
        if (!root) continue;
        S.center.set(e.pos.x, e.pos.y + 0.6, e.pos.z); S.radius = o.radius ?? 3.5;
        const show = e.alive && !e.removed && root.parent && (!p || Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z) < far) && F.intersectsSphere(S);
        if (show) {
          root.visible = true;
          root.updateMatrixWorld(true);
          meshes.forEach((m, k) => {
            if (!vis(m, root)) return;
            const im = G.inst[k];
            if (m.isInstancedMesh) {
              for (let j = 0; j < Math.min(m.count, G.parts[k].n); j++) { m.getMatrixAt(j, Mi); im.setMatrixAt(fill[k]++, M.multiplyMatrices(m.matrixWorld, Mi)); }
            } else im.setMatrixAt(fill[k]++, m.matrixWorld);
          });
        }
        root.visible = false;
      }
      G.inst.forEach((im, k) => { im.count = fill[k]; im.visible = fill[k] > 0; im.instanceMatrix.needsUpdate = true; });
    }
  });
  return live;
}

// ------------------------------------------------------------------ Pastell-Garten (3-4)

/**
 * Pavillon (Gartenhäuschen): runder Sockel (begehbar), sechs weiße Säulen, gestuftes Kuppeldach in Rosa mit goldener
 * Spitze und Lichterkante. Kollision: Sockel, Säulen, drei Dachstufen (begehbar). pos = Fußpunkt Mitte.
 */
export function pavilion(level, x, y, z, o = {}) {
  const R = o.r ?? 2.6, H = o.h ?? 2.7;
  const roof = o.roof ?? 0xff9ccc, trim = 0xffffff, gold = 0xffd24a;
  const P = [];
  P.push(cyl(R + 0.2, R + 0.3, 0.32, x, y, z, 0xf6e8d8, 20));
  P.push(cyl(R - 0.1, R - 0.1, 0.04, x, y + 0.32, z, 0xffd8ea, 20));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + Math.PI / 6, px = x + Math.cos(a) * (R - 0.25), pz = z + Math.sin(a) * (R - 0.25);
    P.push(cyl(0.12, 0.14, H, px, y + 0.32, pz, trim, 8));
    P.push(cyl(0.2, 0.2, 0.12, px, y + 0.32, pz, 0xf0e0f0, 8), cyl(0.2, 0.16, 0.12, px, y + 0.32 + H - 0.12, pz, 0xf0e0f0, 8));
    level.world.add({ type: 'cyl', x: px, z: pz, r: 0.16, y0: y, y1: y + 0.32 + H, tag: 'pavillon' });
    // Blumengirlande zwischen den Säulen
    const b = ((i + 1) / 6) * TAU + Math.PI / 6, qx = x + Math.cos(b) * (R - 0.25), qz = z + Math.sin(b) * (R - 0.25);
    for (let k = 1; k < 6; k++) {
      const u = k / 6, sag = Math.sin(u * Math.PI) * 0.35;
      P.push(sphere(0.09, px + (qx - px) * u, y + 0.32 + H - 0.25 - sag, pz + (qz - pz) * u, [0xff7ab0, 0xffffff, 0xffd23d, 0xb07aff][(i + k) % 4], { ws: 5, hs: 4 }));
    }
  }
  const y0 = y + 0.32 + H;
  const tiers = [[R + 0.35, R - 0.1, 0.38], [R - 0.4, R - 1.2, 0.42], [R - 1.3, 0.35, 0.5]];
  let yy = y0;
  tiers.forEach(([r0, r1, h], i) => {
    P.push(cyl(r1, r0, h, x, yy, z, i % 2 ? 0xffc2de : roof, 20));
    level.world.add({ type: 'cyl', x, z, r: (r0 + r1) / 2 + (i === 2 ? 0 : 0.2), y0: yy, y1: yy + h, tag: 'pavillon-dach' });
    yy += h;
  });
  // Bogen-Saum am Dachrand
  for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU; P.push(sphere(0.16, x + Math.cos(a) * (R + 0.32), y0 - 0.02, z + Math.sin(a) * (R + 0.32), trim, { sy: 0.55, ws: 6, hs: 4 })); }
  P.push(sphere(0.2, x, yy + 0.1, z, gold, { ws: 8, hs: 6 }), cone(0.08, 0.5, x, yy + 0.22, z, gold, 6));
  addStatic(level, merge(P));
  level.world.add({ type: 'cyl', x, z, r: R + 0.25, y0: y, y1: y + 0.32, tag: 'pavillon-sockel' });
  // Lichterkante unter dem Dach
  const G = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU, g = new THREE.SphereGeometry(0.06, 5, 3).toNonIndexed();
    g.translate(x + Math.cos(a) * (R + 0.2), y0 - 0.1, z + Math.sin(a) * (R + 0.2));
    const c = L([0xfff0a0, 0xffa0d0, 0xa0e0ff][i % 3]);
    G.push(colorize(g, (p, n, out) => { out[0] = c[0] * 1.3; out[1] = c[1] * 1.3; out[2] = c[2] * 1.3; }));
  }
  addStatic(level, merge(G), { material: 'glow', castShadow: false });
  return yy;
}

/**
 * Brunnen: Becken (Kollision, begehbarer Rand), Säule, obere Schale (begehbar), Wasserspiel (ein belebtes Mesh:
 * pulsierende Fontäne und Tropfenring). pos = Fußpunkt Mitte. Liefert die Oberkante der oberen Schale.
 */
export function fountain(level, x, y, z, o = {}) {
  const R = o.r ?? 2.1, stone = o.stone ?? 0xf0e4f0, rim = 0xffd6ea;
  const P = [
    cyl(R, R + 0.1, 0.62, x, y, z, stone, 22),
    cyl(R + 0.06, R + 0.06, 0.08, x, y + 0.62, z, rim, 22),
    cyl(0.32, 0.4, 1.3, x, y + 0.6, z, stone, 10),
    cyl(0.95, 0.42, 0.34, x, y + 1.8, z, stone, 14),
    cyl(0.98, 0.98, 0.06, x, y + 2.14, z, rim, 14),
    cyl(0.12, 0.16, 0.5, x, y + 2.15, z, stone, 8),
    sphere(0.16, x, y + 2.7, z, 0xffd24a, { ws: 8, hs: 6 }),
  ];
  // Wasserflächen
  const w0 = L(0x6ad0ff), w1 = L(0xc8f2ff);
  for (const [r, yy] of [[R - 0.12, y + 0.56], [0.86, y + 2.08]]) {
    const g = new THREE.CircleGeometry(r, 20).toNonIndexed();
    g.rotateX(-Math.PI / 2); g.translate(x, yy, z);
    P.push(colorize(g, (p, n, out) => mixc(w0, w1, smooth(0, r, Math.hypot(p.x - x, p.z - z)), out)));
  }
  // Seerosen im Becken
  for (let i = 0; i < 3; i++) { const a = i * 2.2 + 0.6; P.push(sphere(0.18, x + Math.cos(a) * 1.3, y + 0.58, z + Math.sin(a) * 1.3, 0x5cc84a, { sy: 0.15, ws: 8, hs: 3 }), sphere(0.07, x + Math.cos(a) * 1.3, y + 0.63, z + Math.sin(a) * 1.3, 0xff9ccc, { ws: 5, hs: 3 })); }
  addStatic(level, merge(P));
  level.world.add({ type: 'cyl', x, z, r: R + 0.05, y0: y, y1: y + 0.62, tag: 'brunnen' });
  level.world.add({ type: 'cyl', x, z, r: 0.4, y0: y + 0.62, y1: y + 1.8, tag: 'brunnen-saeule' });
  level.world.add({ type: 'cyl', x, z, r: 0.95, y0: y + 1.8, y1: y + 2.14, tag: 'brunnen-schale' });
  if (!level.view) return y + 2.14;
  // Wasserspiel: Fontäne (Spindel) + fallende Tropfenschleier über den Schalenrand
  const mat = new THREE.MeshLambertMaterial({ color: 0xbfefff, transparent: true, opacity: 0.55, depthWrite: false, emissive: 0x2a6a8a, emissiveIntensity: 0.25 });
  const parts = [];
  const jet = new THREE.CylinderGeometry(0.04, 0.12, 0.9, 8, 1, true); jet.translate(0, 0.45, 0); parts.push(jet.toNonIndexed());
  const veil = new THREE.CylinderGeometry(0.98, 1.25, 1.45, 18, 1, true); veil.translate(0, -0.72, 0); parts.push(veil.toNonIndexed());
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; const d = new THREE.SphereGeometry(0.06, 5, 3); d.translate(Math.cos(a) * 0.3, 0.8, Math.sin(a) * 0.3); parts.push(d.toNonIndexed()); }
  const geo = merge(parts.map((g) => { g.deleteAttribute('uv'); return g; }));
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y + 2.15, z);
  mesh.castShadow = false;
  mesh.name = 'zier:brunnen';
  let t = 0;
  addObject(level, mesh, (dt) => {
    t += Math.min(dt ?? 0, 0.1);
    const k = 1 + Math.sin(t * 3.1) * 0.08;
    mesh.scale.set(1 + Math.sin(t * 5.3) * 0.02, k, 1 + Math.cos(t * 4.7) * 0.02);
    mesh.rotation.y = t * 0.6;
  });
  return y + 2.14;
}

/** Bonbon-Bäumchen (Lutscher-Kugel auf gestreiftem Stiel, Schleife). pos = Fußpunkt; size Höhe. Stiel fest. */
export function candyTrees(level, list) {
  const pal = [[0xff8cc4, 0xffffff], [0x8ce0c4, 0xfff4fa], [0xb8a0ff, 0xffffff], [0xffc87a, 0xfff6ea]];
  for (const [x, y, z, size = 2.6, k = 0] of list) {
    const [a, b] = pal[k % pal.length];
    const S = size / 2.6, P = [];
    const stick = new THREE.CylinderGeometry(0.07 * S, 0.08 * S, 1.8 * S, 8, 6, true).toNonIndexed();
    stick.translate(x, y + 0.9 * S, z);
    const A = L(a), B = L(b);
    P.push(colorize(stick, (p, n, out) => { const t = (((p.y - y) / (0.3 * S) + Math.atan2(p.z - z, p.x - x) / Math.PI) % 2 + 2) % 2; const c = t < 1 ? A : B; out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; }));
    const ball = new THREE.SphereGeometry(0.72 * S, 16, 10).toNonIndexed();
    ball.translate(x, y + 2.15 * S, z);
    P.push(colorize(ball, (p, n, out) => {
      const ang = Math.atan2(p.y - (y + 2.15 * S), p.x - x) + Math.hypot(p.x - x, p.y - y - 2.15 * S) * 2.4 / S;
      const c = ((ang / (Math.PI / 3)) % 2 + 2) % 2 < 1 ? A : B;
      const k2 = 0.82 + 0.18 * smooth(-0.6, 0.9, n.y);
      out[0] = c[0] * k2; out[1] = c[1] * k2; out[2] = c[2] * k2;
    }));
    P.push(sphere(0.16 * S, x - 0.17 * S, y + 1.45 * S, z + 0.08 * S, 0xff5a9a, { sx: 1.4, sy: 0.7, sz: 0.6, ws: 7, hs: 4 }), sphere(0.16 * S, x + 0.17 * S, y + 1.45 * S, z + 0.08 * S, 0xff5a9a, { sx: 1.4, sy: 0.7, sz: 0.6, ws: 7, hs: 4 }));
    addStatic(level, merge(P));
    level.world.add({ type: 'cyl', x, z, r: 0.12 * S, y0: y, y1: y + 1.5 * S, tag: 'bonbonbaum' });
  }
}

/** Kugelbüsche (Formschnitt) in Pastellgrün mit Blütentupfen: list [[x, y, z, r]]. Kollision: Zylinder. */
export function ballBushes(level, list) {
  const P = [];
  for (const [x, y, z, r = 0.6, solid = true] of list) {
    P.push(cyl(0.1, 0.18, 0.3, x, y, z, 0xd8b8a0, 6));
    P.push(sphere(r, x, y + 0.3 + r * 0.9, z, 0x7ad49a, { ws: 10, hs: 7, sy: 0.95 }));
    for (let i = 0; i < 6; i++) { const a = i * 1.05 + x, el = (i % 3) * 0.4 - 0.2; P.push(sphere(0.07, x + Math.cos(a) * Math.cos(el) * r, y + 0.3 + r * 0.9 + Math.sin(el) * r, z + Math.sin(a) * Math.cos(el) * r, [0xff9ccc, 0xffffff, 0xffe27a][i % 3], { ws: 5, hs: 3 })); }
    if (solid) level.world.add({ type: 'cyl', x, z, r: r * 0.9, y0: y, y1: y + 0.3 + r * 1.8, tag: 'kugelbusch' });
  }
  addStatic(level, merge(P));
}

/** Marzipan-Schweinchen (Kulisse ohne Kollision): list [[x, y, z, yaw, scale]]. */
export function marzipanPigs(level, list) {
  const P = [];
  for (const [x, y, z, yaw = 0, s = 1] of list) {
    const pink = 0xffb4c8, dk = 0xe07a98;
    const Q = [
      sphere(0.32, 0, 0.32, 0, pink, { sx: 1.25, sy: 0.9, sz: 0.95 }),
      sphere(0.22, 0.36, 0.44, 0, pink, { ws: 9, hs: 6 }),
      sphere(0.09, 0.56, 0.42, 0, dk, { sx: 0.6, ws: 8, hs: 5 }),
      sphere(0.035, 0.6, 0.44, 0.035, 0x7a2a44, { ws: 4, hs: 3 }), sphere(0.035, 0.6, 0.44, -0.035, 0x7a2a44, { ws: 4, hs: 3 }),
      sphere(0.04, 0.5, 0.54, 0.09, 0x201418, { ws: 5, hs: 3 }), sphere(0.04, 0.5, 0.54, -0.09, 0x201418, { ws: 5, hs: 3 }),
      cone(0.08, 0.14, 0.3, 0.6, 0.12, pink, 5), cone(0.08, 0.14, 0.3, 0.6, -0.12, pink, 5),
      sphere(0.07, 0.62, 0.36, 0.0, 0xfff0a0, { sx: 0.5, ws: 5, hs: 3 }),
    ];
    for (const [lx, lz] of [[0.2, 0.15], [0.2, -0.15], [-0.22, 0.15], [-0.22, -0.15]]) Q.push(cyl(0.07, 0.07, 0.14, lx, 0.0, lz, dk, 6));
    // Ringelschwänzchen und Kleeblatt
    Q.push(sphere(0.05, -0.4, 0.42, 0, dk, { ws: 5, hs: 3 }));
    Q.push(sphere(0.07, 0.04, 0.62, 0.0, 0x5cc84a, { sx: 1.6, sy: 0.3, ws: 6, hs: 3 }));
    P.push(...place(Q, x, y, z, yaw, s));
  }
  addStatic(level, merge(P));
}

/** Gartenbank in Pastell (weiß/rosa, ohne Schnee). */
export function gardenBench(level, x, y, z, yaw = 0) { bench(level, x, y, z, yaw, { wood: 0xfff4fa, leg: 0xff9ccc, snow: false }); }

/**
 * Blumenbogen: weißer Holzbogen mit dichten Pastellblüten (Kulisse über dem Weg; Pfosten fest).
 * pos = Fußpunkt Mitte, yaw 0 = Durchgang entlang Z; width, height.
 */
export function flowerArch(level, x, y, z, o = {}) {
  const w = o.width ?? 3.4, h = o.height ?? 3.2, yaw = o.yaw ?? 0;
  const P = [];
  const ux = Math.cos(yaw), uz = -Math.sin(yaw);   // Richtung quer zum Durchgang (lokal +X)
  const pt = (u, v) => [x + ux * u, y + v, z + uz * u];
  for (const s of [-1, 1]) {
    const [px, , pz] = pt(s * w / 2, 0);
    P.push(cyl(0.09, 0.11, h - 0.6, px, y, pz, 0xffffff, 8));
    level.world.add({ type: 'cyl', x: px, z: pz, r: 0.13, y0: y, y1: y + h - 0.6, tag: 'blumenbogen' });
  }
  const n = 22, cols = o.colors ?? [0xff7ab0, 0xffffff, 0xffb8d8, 0xffe27a, 0xc8a8ff];
  for (let i = 0; i <= n; i++) {
    const a = Math.PI * (i / n);
    const u = -Math.cos(a) * w / 2, v = h - 0.6 + Math.sin(a) * 0.9;
    const [qx, qy, qz] = pt(u, v);
    P.push(sphere(0.2, qx, qy, qz, 0x5cc06a, { ws: 6, hs: 4 }));
    P.push(sphere(0.11, qx + 0.06, qy + 0.12, qz + 0.08, cols[i % cols.length], { ws: 5, hs: 4 }));
    if (i % 2) P.push(sphere(0.09, qx - 0.08, qy - 0.1, qz - 0.06, cols[(i + 2) % cols.length], { ws: 5, hs: 3 }));
  }
  for (const s of [-1, 1]) for (let k = 0; k < 5; k++) {
    const [qx, qy, qz] = pt(s * w / 2, 0.4 + k * 0.5);
    P.push(sphere(0.12, qx + s * 0.08 * ux, qy, qz + s * 0.08 * uz, cols[(k + (s > 0 ? 1 : 3)) % cols.length], { ws: 5, hs: 3 }));
    P.push(sphere(0.15, qx - 0.1 * uz, qy + 0.2, qz + 0.1 * ux, 0x5cc06a, { ws: 5, hs: 3 }));
  }
  addStatic(level, merge(P));
}

/**
 * Weißes Treppengeländer mit rosa Kappen und Blumentöpfen entlang einer Treppe (nur Optik): x, z0/y0 (Fuß unten),
 * z1/y1 (oben), n Pfosten, steps (Stufenzahl) und rise (Stufenhöhe) für die Pfostenfüße.
 */
export function balustrade(level, x, z0, z1, y0, steps, rise, o = {}) {
  const P = [];
  const run = (z1 - z0) / steps;
  for (let i = 0; i <= steps; i++) {
    const z = z0 + run * Math.min(i + 0.5, steps), y = y0 + rise * Math.min(i + 1, steps);
    P.push(cyl(0.07, 0.09, 0.95, x, y, z, 0xffffff, 8), sphere(0.11, x, y + 1.02, z, o.cap ?? 0xff9ccc, { ws: 8, hs: 5 }));
    if (i < steps) {
      const zn = z0 + run * Math.min(i + 1.5, steps), yn = y0 + rise * Math.min(i + 2, steps);
      P.push(rod([x, y + 0.92, z], [x, yn + 0.92, zn], 0.045, 0.045, 0xffffff, 6));
      if (i % 2 === 0) {
        P.push(cyl(0.2, 0.15, 0.3, x - Math.sign(x) * 0.45, y, z, 0xe89a6a, 8));
        P.push(sphere(0.2, x - Math.sign(x) * 0.45, y + 0.42, z, 0x5cc06a, { ws: 7, hs: 5 }));
        for (let k = 0; k < 3; k++) P.push(sphere(0.07, x - Math.sign(x) * 0.45 + Math.cos(k * 2.1) * 0.13, y + 0.55, z + Math.sin(k * 2.1) * 0.13, [0xff7ab0, 0xffffff, 0xffe27a][(i + k) % 3], { ws: 5, hs: 3 }));
      }
    }
  }
  addStatic(level, merge(P));
}

/** Regenbogen (Halbkreis aus sechs Farbbändern, leuchtend, ohne Schatten): Mitte (x, y, z), Radius r, Gier yaw. */
export function rainbow(level, x, y, z, r = 8, o = {}) {
  const cols = [0xff6a6a, 0xffae5a, 0xffe66a, 0x7ae08a, 0x6ab8ff, 0xb88aff];
  const w = o.band ?? 0.45, P = [];
  cols.forEach((c, i) => {
    const g = new THREE.TorusGeometry(r - i * w, w * 0.5, 3, 40, Math.PI).toNonIndexed();
    g.scale(1, 1, 0.3);
    if (o.yaw) g.rotateY(o.yaw);
    g.translate(x, y, z);
    const cc = L(c);
    P.push(colorize(g, (p, n, out) => { out[0] = cc[0] * 1.05; out[1] = cc[1] * 1.05; out[2] = cc[2] * 1.05; }));
  });
  addStatic(level, merge(P), { material: 'glow', castShadow: false });
}

/** Schachbrett-Pflaster (bunte Steinplatten, flach auf y) über x0..x1, z0..z1. */
export function mosaic(level, x0, x1, zA, zB, y, o = {}) {
  const z0 = Math.min(zA, zB), z1 = Math.max(zA, zB), cell = o.cell ?? 1;
  const cols = (o.colors ?? [0xfff4fa, 0xffd0e4, 0xd8f4e8, 0xe8dcff, 0xfff0c8]).map(L);
  const P = [];
  let k = 0;
  for (let x = x0; x < x1 - 0.01; x += cell) for (let z = z0; z < z1 - 0.01; z += cell) {
    const c = cols[(((Math.floor(x / cell) * 7 + Math.floor(z / cell) * 3 + (k++ % 2)) % cols.length) + cols.length) % cols.length];
    const g = new THREE.PlaneGeometry(Math.min(cell, x1 - x) - 0.06, Math.min(cell, z1 - z) - 0.06).toNonIndexed();
    g.rotateX(-Math.PI / 2);
    g.translate(x + Math.min(cell, x1 - x) / 2, y + 0.012, z + Math.min(cell, z1 - z) / 2);
    P.push(colorize(g, (p, n, out) => { out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; }));
  }
  addStatic(level, merge(P), { castShadow: false });
}
