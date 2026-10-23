// Hilfen für die Welt-4-Level 4-5 „Säulenstadt der Stachelwalzen“, 4-A „Glutbrocken-Gerangel“ und 4-B
// „Blaugitter-Bastion der Feuer-Werfer“ (kein Level: exportiert kein LEVEL, die Level-Registry überspringt dieses Modul).
// Gemeinsame Dateien werden nicht verändert; alles Level-Lokale hängt sich über den offiziellen Level-Haken
// `LEVEL.setup` (Präzisierung „Level-Haken“) und über `level.onStep` / `view.onFrame` an.
//
//   1) Grundlagen     Re-Exporte (levelSetup, Münz-Helfer, Budget-Helfer), Farb-/Geometrie-Kleinteile
//   2) Ruinen (4-5)   Mosaikpflaster, alte Brunnen, Ranken, Sandstein-Blöcke, Rundturm (gewölbte Kletterwand),
//                     Dschungelbäume, Moos und Blumen, Vögel, versiegelte Röhre zur Werfer-Festung,
//                     Räuberleiter (vom Klon abspringen), Schalterraum-Kulisse
//   3) Lava (4-A)     Felsinsel mit Basaltsäulen und Glutrissen, Dampfschwaden, Lavabrocken-Wellen aus der Lava
//   4) Festung (4-B)  blau vergitterte Werfer-Festung: Gitter, Mauern, Türme, Fahnen, Banner, Steckbrief, Lager

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { box, colorize, merge, lin, mixc, smooth, hex, addStatic, addObject, Rnd } from '../../blocks/kit.js';
import { pipeGeo } from '../../blocks/types/pipe.js';
import { MOVE } from '../../player/moveset.js';
import { banner } from '../../blocks/w3kit.js';
import { getModel } from '../../models/index.js';
import { visDt } from '../../entities/gimmick.js';
import {
  levelSetup, isl, line, ring, arc, cyl, sphere, cone, block, embers, lavaLake, lavaBubbles, volcanoes, rockIsland,
  islandRadius, calderaWall, fruitBush,
} from '../w2/_helpers_c.js';
import { cullStatic, farHide } from '../w2/_helpers_a.js';
import { instanceEnemies, noModelShadow } from '../w3/_helpers_a.js';
import { birds } from '../w3/_helpers_b.js';
import { WavingFlags, emblemTexture, particles, litFn, cylG, sphereG, coneG, blockG, ringG, discG, starG, bake, shadowDiet } from '../w3/_helpers_e.js';

export {
  levelSetup, isl, line, ring, arc, cullStatic, farHide, instanceEnemies, noModelShadow, birds, fruitBush, banner, shadowDiet,
  embers, lavaLake, lavaBubbles, volcanoes, rockIsland, islandRadius, calderaWall,
};

// ====================================================================== 1) Grundlagen

const TAU = Math.PI * 2;
const L = (c) => lin(hex(c));
const hash = (a, b = 0, c = 0) => { const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return s - Math.floor(s); };
const flat = (c) => { const k = L(c); return (p, n, o) => { o[0] = k[0]; o[1] = k[1]; o[2] = k[2]; }; };

/** Waagerechte Fläche (Rechteck) auf Höhe y. */
function quadXZ(x0, x1, z0, z1, y, fn) {
  const g = new THREE.PlaneGeometry(Math.abs(x1 - x0), Math.abs(z1 - z0)).toNonIndexed();
  g.rotateX(-Math.PI / 2);
  g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  return colorize(g, fn);
}

// ====================================================================== 2) Ruinen (4-5)

export const RUIN = {
  sand: 0xf0d8a8, sandLt: 0xfbe9c4, sandDk: 0xc8a674, sandDeep: 0x9a7a50, moss: 0x7aa84a, mossLt: 0xa8d06a,
  terra: 0xd2643c, terraDk: 0xa0442a, turq: 0x3cc4b8, turqDk: 0x1e8a86, gold: 0xf0b83a, ivory: 0xfff4dc,
};

/**
 * Mosaikpflaster aus Sandstein: Rand aus Terrakotta, Feld mit türkisen Rauten, in der Mitte eine Rosette; einzelne
 * Steinchen fehlen (alter Boden). Flache Steinchen auf y (+1 cm), kein Schattenwurf. o: cell (0.5), rosette (true),
 * gap (Anteil fehlender Steinchen 0.06), border (2 Reihen).
 */
export function ruinMosaic(level, x0, x1, zA, zB, y, o = {}) {
  const z0 = Math.min(zA, zB), z1 = Math.max(zA, zB), c = o.cell ?? 0.5;
  const nx = Math.max(1, Math.round((x1 - x0) / c)), nz = Math.max(1, Math.round((z1 - z0) / c));
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, rr = Math.min(x1 - x0, z1 - z0) * 0.32;
  const P = [];
  const col = (i, j, x, z) => {
    const bi = Math.min(i, nx - 1 - i), bj = Math.min(j, nz - 1 - j), b = Math.min(bi, bj);
    if (b < (o.border ?? 2)) return b === 0 ? RUIN.terraDk : RUIN.terra;
    const d = Math.hypot(x - cx, z - cz);
    if (o.rosette !== false && d < rr) {
      const a = Math.atan2(z - cz, x - cx), petal = Math.cos(a * 8) * 0.5 + 0.5;
      if (d < rr * 0.22) return RUIN.gold;
      if (d > rr * 0.9) return RUIN.turqDk;
      return petal > 0.55 ? RUIN.turq : (d < rr * 0.5 ? RUIN.ivory : RUIN.sandLt);
    }
    const di = (i + j) % 6, dj = (i - j + 600) % 6;
    if (di === 0 || dj === 0) return RUIN.turq;
    return (i + 2 * j) % 3 === 0 ? RUIN.sandLt : RUIN.sand;
  };
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const x = x0 + (i + 0.5) * ((x1 - x0) / nx), z = z0 + (j + 0.5) * ((z1 - z0) / nz);
    if (hash(i, j, x0) < (o.gap ?? 0.06)) continue;
    const w = (x1 - x0) / nx - 0.05, d = (z1 - z0) / nz - 0.05;
    const k = L(col(i, j, x, z)), v = 0.92 + hash(j, i, 3) * 0.12;
    P.push(quadXZ(x - w / 2, x + w / 2, z - d / 2, z + d / 2, y + 0.012, (p, n, out) => { out[0] = k[0] * v; out[1] = k[1] * v; out[2] = k[2] * v; }));
  }
  addStatic(level, merge(P), { castShadow: false });
}

/**
 * Sandstein-Quader mit Lagerfugen, abgebröckelter Oberkante, Moos oben und optional Ranken vorn (nur Geometrie).
 * Liefert Teile (push in parts). o: color, top (Moos true), chips (true), face ('+z'…) für Fugen-Betonung.
 */
export function stoneBlockParts(parts, x0, x1, y0, y1, z0, z1, o = {}) {
  const w = x1 - x0, h = y1 - y0, d = Math.abs(z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const base = L(o.color ?? RUIN.sand), dk = L(o.dark ?? RUIN.sandDk), lt = L(o.light ?? RUIN.sandLt), moss = L(RUIN.moss);
  const g = box(w, h, d, cx, y0 + h / 2, cz, o.color ?? RUIN.sand, { r: o.r ?? 0.08, seg: 1 });
  parts.push(colorize(g, (p, n, out) => {
    const course = Math.floor((p.y - y0) / (o.course ?? 0.7));
    const jitter = hash(course, Math.floor((p.x + p.z) / 1.3), 7);
    mixc(base, dk, 0.15 + jitter * 0.25, out);
    if (n.y > 0.5) mixc(out, o.top === false ? lt : moss, o.top === false ? 0.6 : 0.55, out);
    else if (n.y < -0.5) mixc(out, dk, 0.6, out);
    else {
      const fy = ((p.y - y0) / (o.course ?? 0.7)) % 1;
      if (fy < 0.06) mixc(out, L(RUIN.sandDeep), 0.55, out);
      if (p.y < y0 + 0.5) mixc(out, moss, smooth(y0 + 0.5, y0, p.y) * 0.45, out);
    }
  }));
  if (o.chips !== false) {
    // abgebröckelte Oberkante: kleine Steinquader auf der Krone
    const n = Math.max(2, Math.round((w + d) / 1.6));
    for (let i = 0; i < n; i++) {
      const t = hash(i, x0, z0), s = 0.35 + hash(i, 2, x0) * 0.35;
      const px = x0 + 0.3 + t * (w - 0.6), pz = Math.min(z0, z1) + 0.3 + hash(i, 5, z0) * (d - 0.6);
      parts.push(blockG(s, s * 0.6, s * 0.9, px, y1 - 0.02, pz, hash(i, 9) < 0.5 ? RUIN.sandDk : RUIN.sand, { r: 0.05, seg: 1, top: RUIN.mossLt, ry: hash(i, 4) }));
    }
  }
}

/** Sandstein-Block mit Kollision (box) und Optik. flags: climbable, noWallSlide, camIgnore, tag. */
export function stoneBlock(level, x0, x1, y0, y1, zA, zB, o = {}) {
  const z0 = Math.min(zA, zB), z1 = Math.max(zA, zB);
  const id = level.world.add({ type: 'box', min: [x0, y0, z0], max: [x1, y1, z1], climbable: !!o.climbable, noWallSlide: !!o.noWallSlide, camIgnore: !!o.camIgnore, tag: o.tag ?? 'ruinenblock' });
  if (level.view && o.visual !== false) {
    const P = [];
    stoneBlockParts(P, x0, x1, y0, y1, z0, z1, o);
    addStatic(level, merge(P), { castShadow: o.shadow !== false });
  }
  return id;
}

/**
 * Hängende Ranken (statisch, ohne Schattenwurf): list = [{ x, y (Oberkante), z, w (Breite), len, face: '+z'|'-z'|'+x'|'-x',
 * n (Stränge), flowers }]. Stränge mit Blättern in zwei Grüntönen und kleinen Blüten, leicht vor der Wand.
 */
export function vines(level, list) {
  if (!level.view) return;
  const P = [];
  const leafA = L(0x4f9a3a), leafB = L(0x7cc24e), stem = L(0x3d6e2c);
  for (const [k, v] of list.entries()) {
    const n = v.n ?? Math.max(2, Math.round(v.w / 0.45));
    const off = 0.06;
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const len = v.len * (0.45 + 0.55 * hash(i, k, 3));
      const along = -v.w / 2 + t * v.w + (hash(i, k) - 0.5) * 0.2;
      const pos = (dy, lat) => {
        const sway = Math.sin(dy * 2.2 + i) * 0.08;
        if (v.face === '+z') return [v.x + along + sway, v.y - dy, v.z + off + lat];
        if (v.face === '-z') return [v.x + along + sway, v.y - dy, v.z - off - lat];
        if (v.face === '+x') return [v.x + off + lat, v.y - dy, v.z + along + sway];
        return [v.x - off - lat, v.y - dy, v.z + along + sway];
      };
      // Stängel
      const steps = Math.max(2, Math.round(len / 0.35));
      for (let s = 0; s < steps; s++) {
        const a = pos((s / steps) * len, 0), b = pos(((s + 1) / steps) * len, 0);
        const g = new THREE.CylinderGeometry(0.025, 0.025, Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), 4).toNonIndexed();
        const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
        g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
        g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
        P.push(colorize(g, (p, nn, o) => { o[0] = stem[0]; o[1] = stem[1]; o[2] = stem[2]; }));
        // Blattpaar
        const q = pos(((s + 0.5) / steps) * len, 0.03);
        const lf = new THREE.SphereGeometry(0.13, 5, 3).toNonIndexed();
        lf.scale(1.3, 0.55, 0.9);
        lf.rotateZ((s % 2 ? 1 : -1) * 0.5);
        lf.translate(q[0], q[1], q[2]);
        const lc = (s + i) % 2 ? leafA : leafB;
        P.push(colorize(lf, (p, nn, o) => mixc(lc, leafB, smooth(-0.3, 0.9, nn.y) * 0.4, o)));
        if (v.flowers !== false && hash(i, s, k) > 0.86) {
          const fl = new THREE.SphereGeometry(0.07, 5, 3).toNonIndexed();
          fl.translate(q[0], q[1] - 0.05, q[2] + 0.02);
          P.push(colorize(fl, flat(hash(s, i) > 0.5 ? 0xff7ab0 : 0xfff07a)));
        }
      }
    }
  }
  addStatic(level, merge(P), { castShadow: false });
}

/** Moos- und Blumentupfer am Boden (statisch, flach): list = [[x, y, z, r, n]]. */
export function mossTufts(level, list) {
  if (!level.view) return;
  const P = [];
  const moss = [L(0x6a9a3c), L(0x8ec24e), L(0x5a8a34)];
  const fl = [0xffffff, 0xff8cc0, 0xffe066, 0xb894ff];
  for (const [k, [x, y, z, r, n]] of list.entries()) {
    for (let i = 0; i < (n ?? 6); i++) {
      const a = hash(i, k) * TAU, d = hash(k, i, 2) * r;
      const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      const g = new THREE.SphereGeometry(0.2 + hash(i, 3, k) * 0.2, 9, 3, 0, TAU, 0, Math.PI / 2).toNonIndexed();
      g.scale(1.25, 0.5 + hash(k, i, 5) * 0.35, 1.05);
      g.rotateY(hash(i, k, 4) * 3);
      g.translate(px, y, pz);
      const c = moss[(i + k) % 3];
      P.push(colorize(g, (p, nn, o) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }));
      if (hash(i, k, 9) > 0.5) {
        const f = new THREE.SphereGeometry(0.06, 5, 3).toNonIndexed();
        f.translate(px + 0.08, y + 0.12, pz);
        P.push(colorize(f, flat(fl[(i + k) % fl.length])));
      }
    }
  }
  addStatic(level, merge(P), { castShadow: false });
}

/**
 * Alter Ruinenbrunnen: achteckiges Sandsteinbecken (Rand begehbar), türkises Wasser mit Seerosen, Mittelsäule mit
 * steinernem Hasenkopf, aus dessen Maul ein Wasserstrahl ins Becken plätschert (ein belebtes, durchscheinendes Mesh).
 * pos = Fußpunkt Mitte; o: r (2), h (0.7), dry (ohne Wasser, Moos im Becken).
 */
export function ruinFountain(level, x, y, z, o = {}) {
  const R = o.r ?? 2, H = o.h ?? 0.7;
  level.world.add({ type: 'cyl', x, z, r: R + 0.05, y0: y, y1: y + H, tag: 'brunnen' });
  level.world.add({ type: 'cyl', x, z, r: 0.42, y0: y + H, y1: y + H + 1.5, tag: 'brunnen-saeule' });
  if (!level.view) return;
  const P = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + Math.PI / 8, a2 = ((i + 1) / 8) * TAU + Math.PI / 8;
    const mx = x + Math.cos((a + a2) / 2) * R * 0.94, mz = z + Math.sin((a + a2) / 2) * R * 0.94;
    const len = 2 * R * Math.sin(Math.PI / 8) + 0.12;
    const cracked = hash(i, x) > 0.75;
    P.push(blockG(len, H - (cracked ? 0.12 : 0), 0.34, mx, y, mz, RUIN.sand, { r: 0.05, seg: 1, top: cracked ? RUIN.mossLt : RUIN.sandLt, ry: -(a + a2) / 2 + Math.PI / 2 }));
  }
  P.push(cylG(R * 0.9, R * 0.9, 0.12, x, y, z, RUIN.sandDk, 16));
  if (!o.dry) {
    const w0 = L(0x3cc8d8), w1 = L(0xa8f0f4);
    const g = new THREE.CircleGeometry(R * 0.86, 24).toNonIndexed();
    g.rotateX(-Math.PI / 2); g.translate(x, y + H - 0.16, z);
    P.push(colorize(g, (p, n, out) => mixc(w0, w1, smooth(R * 0.2, R * 0.86, Math.hypot(p.x - x, p.z - z)), out)));
    for (let i = 0; i < 4; i++) {
      const a = i * 1.7 + 0.4, r = R * (0.5 + 0.12 * (i % 2));
      P.push(sphereG(0.2, x + Math.cos(a) * r, y + H - 0.15, z + Math.sin(a) * r, 0x5cb84a, { sy: 0.12, ws: 8, hs: 3 }));
      if (i % 2 === 0) P.push(sphereG(0.07, x + Math.cos(a) * r, y + H - 0.1, z + Math.sin(a) * r, 0xffa0d0, { ws: 5, hs: 3 }));
    }
  } else {
    P.push(sphereG(R * 0.7, x, y + 0.1, z, RUIN.moss, { sy: 0.18, ws: 12, hs: 4, half: true }));
  }
  // Mittelsäule mit Hasenkopf (Ohren, Schnauze nach +z)
  P.push(cylG(0.36, 0.44, 1.5, x, y + H - 0.2, z, RUIN.sandLt, 10));
  P.push(cylG(0.5, 0.5, 0.14, x, y + H + 1.24, z, RUIN.sand, 10));
  const hy = y + H + 1.62;
  P.push(sphereG(0.38, x, hy, z, RUIN.ivory, { ws: 12, hs: 8 }));
  for (const s of [-1, 1]) {
    const ear = new THREE.CapsuleGeometry(0.1, 0.5, 3, 6).toNonIndexed();
    ear.rotateZ(s * 0.25); ear.translate(x + s * 0.17, hy + 0.55, z - 0.05);
    P.push(colorize(ear, litFn(RUIN.ivory)));
  }
  P.push(sphereG(0.16, x, hy - 0.06, z + 0.3, RUIN.sandLt, { ws: 8, hs: 6 }));
  for (const s of [-1, 1]) P.push(sphereG(0.05, x + s * 0.14, hy + 0.08, z + 0.32, 0x2a3a40, { ws: 6, hs: 4 }));
  // Moos am Fuß
  for (let i = 0; i < 6; i++) { const a = i * 1.1; P.push(sphereG(0.22, x + Math.cos(a) * (R + 0.1), y + 0.05, z + Math.sin(a) * (R + 0.1), RUIN.moss, { sy: 0.4, ws: 6, hs: 3 })); }
  addStatic(level, merge(P));
  if (o.dry) return;
  // Wasserstrahl aus dem Maul (Bogen) + Ringwellen
  const pts = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector3(0, -0.06 - t * t * (1.62 + 0.16), 0.36 + t * 0.9)); }
  const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.05, 5, false);
  const rip = new THREE.RingGeometry(0.12, 0.2, 16); rip.rotateX(-Math.PI / 2); rip.translate(0, -1.66, 1.26);
  const mat = new THREE.MeshBasicMaterial({ color: 0xc8f6ff, transparent: true, opacity: 0.7, depthWrite: false });
  const mesh = new THREE.Mesh(merge([tube.toNonIndexed(), rip.toNonIndexed()].map((g) => { g.deleteAttribute('uv'); return g; })), mat);
  mesh.position.set(x, hy, z);
  mesh.name = 'zier:brunnenstrahl';
  const holder = {};
  let t = 0;
  addObject(level, mesh, (dt) => { t += visDt(level, holder, dt); mesh.scale.set(1, 1 + Math.sin(t * 6) * 0.03, 1 + Math.sin(t * 4.3) * 0.04); mat.opacity = 0.62 + Math.sin(t * 7) * 0.08; });
}

/**
 * Rundturm (gewölbte Kletterwand für den Krallen-Anzug): Sandsteinlagen, Fugen, Rundbogenfenster, Gesims, Zinnen,
 * Ranken. Kollision: Zylinder (climbable) + Plattform oben. o: x, z, y (Fuß), r, h, climbable (true).
 */
export function roundTower(level, o) {
  const { x, z } = o, y = o.y ?? 0, R = o.r ?? 2.4, H = o.h ?? 7;
  level.world.add({ type: 'cyl', x, z, r: R, y0: y - 2, y1: y + H, climbable: o.climbable !== false, tag: 'rundturm' });
  if (!level.view) return;
  const P = [];
  const rows = Math.round(H / 0.7);
  const base = L(RUIN.sand), dk = L(RUIN.sandDk), lt = L(RUIN.sandLt), moss = L(RUIN.moss);
  const g = new THREE.CylinderGeometry(R, R * 1.04, H + 2, 28, rows + 3).toNonIndexed();
  g.translate(x, y - 2 + (H + 2) / 2, z);
  P.push(colorize(g, (p, n, out) => {
    const row = Math.floor((p.y - y) / 0.7), a = Math.atan2(p.z - z, p.x - x);
    const brick = Math.floor((a / TAU) * 24 + (row % 2) * 0.5);
    mixc(base, dk, 0.1 + hash(row, brick) * 0.3, out);
    if (((p.y - y) / 0.7) % 1 < 0.07) mixc(out, L(RUIN.sandDeep), 0.5, out);
    // Kletter-Griffmulden: hellere Steine im Zickzack (Hinweis „hier geht's hoch“)
    if (o.climbable !== false && hash(row, brick, 3) > 0.7) mixc(out, lt, 0.55, out);
    if (p.y < y + 0.7) mixc(out, moss, smooth(y + 0.7, y, p.y) * 0.5, out);
  }));
  P.push(cylG(R + 0.22, R + 0.22, 0.3, x, y + H - 0.3, z, RUIN.sandLt, 28));
  for (let i = 0; i < 12; i++) {
    if (i % 2) continue;
    const a = (i / 12) * TAU;
    P.push(blockG(0.8, 0.6, 0.45, x + Math.cos(a) * (R + 0.02), y + H, z + Math.sin(a) * (R + 0.02), RUIN.sand, { r: 0.05, seg: 1, top: RUIN.mossLt, ry: -a + Math.PI / 2 }));
  }
  // Rundbogenfenster (dunkel) auf der Kameraseite
  for (const [a, yy] of [[Math.PI * 0.5, H * 0.45], [Math.PI * 0.2, H * 0.75], [Math.PI * 0.8, H * 0.3]]) {
    const wx = x + Math.cos(a) * (R + 0.01), wz = z + Math.sin(a) * (R + 0.01);
    const sh = new THREE.Shape();
    sh.moveTo(-0.35, 0); sh.lineTo(0.35, 0); sh.lineTo(0.35, 0.7); sh.absarc(0, 0.7, 0.35, 0, Math.PI, false); sh.closePath();
    const wg = new THREE.ShapeGeometry(sh, 6).toNonIndexed();
    wg.rotateY(-a + Math.PI / 2);
    wg.translate(wx, y + yy, wz);
    P.push(colorize(wg, flat(0x2a2018)));
  }
  addStatic(level, merge(P));
  vines(level, [
    { x: x + Math.cos(2.0) * (R + 0.02), y: y + H - 0.2, z: z + Math.sin(2.0) * (R + 0.02), w: 1.4, len: 3.2, face: '+z', n: 4 },
    { x: x + Math.cos(0.9) * (R + 0.02), y: y + H * 0.6, z: z + Math.sin(0.9) * (R + 0.02), w: 1.0, len: 2.2, face: '+z', n: 3 },
  ]);
}

/** Dschungelbaum (Krone aus Blattballen, gebogener Stamm mit Ranken), statisch: list = [[x, y, z, h]]. */
export function jungleTrees(level, list, o = {}) {
  if (!level.view) return;
  const P = [];
  for (const [k, [x, y, z, h0]] of list.entries()) {
    const h = h0 ?? 6, lean = (hash(k, x) - 0.5) * 0.6;
    const segs = 4;
    let px = x, pz = z;
    for (let s = 0; s < segs; s++) {
      const nx = x + lean * ((s + 1) / segs) * h * 0.25;
      const g = cylG(0.28 - s * 0.04, 0.34 - s * 0.04, h / segs + 0.05, (px + nx) / 2, y + (s * h) / segs, pz, 0x8a6a48, 8);
      P.push(g);
      px = nx;
    }
    if (o.solid !== false) level.world.add({ type: 'cyl', x, z, r: 0.34, y0: y, y1: y + h, tag: 'baum' });
    const top = y + h;
    const greens = [0x3e9a3a, 0x5ab84a, 0x2f7e30, 0x6cc85a];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + hash(i, k), r = i === 0 ? 0 : 1.2 + hash(k, i) * 0.6;
      P.push(sphereG(1.1 + hash(i, k, 2) * 0.5, px + Math.cos(a) * r, top + (i === 0 ? 0.6 : hash(i, 7, k) * 0.6), pz + Math.sin(a) * r, greens[(i + k) % 4], { ws: 9, hs: 6, sy: 0.75 }));
    }
    // Lianen aus der Krone
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1 + k, r = 1.5;
      const g = cylG(0.03, 0.03, 1.6 + hash(i, k) * 1.5, px + Math.cos(a) * r, top - 2.4, pz + Math.sin(a) * r, 0x3d6e2c, 4);
      P.push(g);
    }
  }
  addStatic(level, merge(P), { castShadow: o.shadow !== false });
}

/**
 * Räuberleiter (Bauplan 4-5: „vom Mitspieler abspringen“ – Mitspieler = Klon der Spiegelfrucht): Kommt eine Figur von
 * oben (oder auf gleicher Höhe heranlaufend) auf den Kopf einer stehenden Figur in der Zone area, wird sie mit speed
 * m/s hochgeworfen (wie von einer Sprungfeder, fester Schwerkraft-Bogen ohne Sprungtasten-Abhängigkeit) und bekommt
 * frische Kletterzeit (Krallen-Anzug). Die untere Figur zuckt kurz zusammen.
 * o = { area: { min: [x, y, z], max: [x, y, z] } (Fußpunkt der unteren Figur), speed: 19.5, window: [-0.45, 0.3], r: 0.6, id }
 * Laufzeit: level.named.get(id) = { launches, log }.
 */
export function raeuberleiter(level, o) {
  const V = o.speed ?? 19.5, win = o.window ?? [-0.45, 0.3], R = o.r ?? 0.6;
  const [a0, a1] = [o.area.min, o.area.max];
  const st = { launches: 0, log: [], squash: new Map() };
  const inArea = (p) => p.pos.x >= a0[0] && p.pos.x <= a1[0] && p.pos.y >= a0[1] && p.pos.y <= a1[1] && p.pos.z >= a0[2] && p.pos.z <= a1[2];
  const ok = (p) => p && !p.dead && !p.removedFigure && !p.hidden && p.mode !== 'script';
  level.onStep((dt) => {
    for (const [f, t] of st.squash) { if (t <= dt) st.squash.delete(f); else st.squash.set(f, t - dt); }
    const figs = level.players;
    if (!figs || figs.length < 2) return;
    for (const a of figs) {
      if (!ok(a) || a.vel.y > 0.5 || a.mode === 'swim') continue;
      for (const b of figs) {
        if (b === a || !ok(b) || b.mode !== 'ground' || !inArea(b)) continue;
        const head = b.pos.y + b.half.y * 2, dy = a.pos.y - head;
        if (dy < win[0] || dy > win[1]) continue;
        if (Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z) > R) continue;
        // Hochwurf
        a.mode = 'air';
        a.pos.y = Math.max(a.pos.y, head);
        a.vel.set(a.vel.x * 0.2, V, a.vel.z * 0.2);
        a.enterAir('bounce', false);
        a.setState('jump2');
        a.climbLeft = MOVE.climbTime;
        a.airMax = Math.max(a.hSpeed?.() ?? 0, MOVE.walk * (a.speedMult ?? 1) * 0.6);
        a.coyote = 0;
        st.launches++;
        st.squash.set(b, 0.25);
        st.log.push({ t: +level.time.toFixed(2), who: a.clone ? 'klon' : 'haupt', on: b.clone ? 'klon' : 'haupt', y: +head.toFixed(2) });
        level.sfx('bounce');
        level.effects?.ring?.({ x: b.pos.x, y: head, z: b.pos.z }, 0.8);
        level.effects?.sparks?.({ x: b.pos.x, y: head + 0.1, z: b.pos.z }, 10);
        break;
      }
    }
  });
  if (o.id) level.named.set(o.id, st);
  return st;
}

/**
 * Versiegelte blaue Röhre (Hinweis auf die Werfer-Festung 4-B, die auf der Weltkarte erreichbar ist): Röhre mit
 * Gitterdeckel, Vorhängeschloss, kleinem Feuer-Werfer-Wimpel; Steht man darauf und duckt sich, erscheint eine Ansage.
 * o: pos (Fuß), height (1.4), radius (0.9), text.
 */
export function sealedPipe(level, o) {
  const [x, y, z] = o.pos, H = o.height ?? 1.4, R = o.radius ?? 0.9;
  const info = {
    x, z, top: y + H, pipe: true, enterRadius: R * 0.7,
    enter: () => { if (level.time - (info.last ?? -9) > 2.5) { info.last = level.time; info.tries = (info.tries ?? 0) + 1; level.sfx('blockhit'); banner(level, o.text ?? 'Zur Werfer-Festung geht es über die Weltkarte!', { color: '#9ad8ff', size: 13, hold: 2.2 }); } },
  };
  level.world.add({ type: 'cyl', x, z, r: R + 0.08, y0: y, y1: y + H, pipe: info, tag: 'roehre-versiegelt' });
  if (o.id) level.named.set(o.id, info);
  if (!level.view) return info;
  const P = [pipeGeo(x, y, z, H, R, 0x2a6ad8)];
  // Gitterdeckel: Stäbe in zwei Richtungen + Rahmenring
  const top = y + H + 0.02;
  for (let i = -3; i <= 3; i++) {
    const w = Math.sqrt(Math.max(0, R * R * 0.81 - (i * 0.22) ** 2)) * 2;
    if (w < 0.1) continue;
    P.push(blockG(w, 0.06, 0.07, x, top, z + i * 0.22, 0x8a96a8, { r: 0.01, seg: 0 }));
    P.push(blockG(0.07, 0.06, w, x + i * 0.22, top + 0.03, z, 0x9aa6b8, { r: 0.01, seg: 0 }));
  }
  P.push(ringG(R * 0.92, 0.07, x, top + 0.02, z, 0xffc23a, 24));
  // Vorhängeschloss vorn
  P.push(blockG(0.32, 0.3, 0.12, x, y + H - 0.62, z + R + 0.04, 0xffc23a, { r: 0.04, seg: 1 }));
  P.push(ringG(0.1, 0.03, x, y + H - 0.28, z + R + 0.04, 0xd8a028, 12, { ry: 0 }));
  addStatic(level, merge(P));
  return info;
}

/**
 * Ruinen-Kulisse des Schalterraums (Untergrund-Kammer): Mauern mit Fries und leuchtenden türkisen Glyphen, Säulen in
 * den Ecken, Ranken. o: x0, x1, z0, z1 (Innenmaße), y (Boden), h (Wandhöhe 5), open: Seite ohne Wand ('+z').
 */
export function switchHall(level, o) {
  const { x0, x1, y } = o, z0 = Math.min(o.z0, o.z1), z1 = Math.max(o.z0, o.z1), H = o.h ?? 5, T = 1.2;
  const P = [], G = [];
  const walls = [
    ['-z', x0 - T, x1 + T, z0 - T, z0], ['-x', x0 - T, x0, z0, z1], ['+x', x1, x1 + T, z0, z1],
  ];
  walls.push(['+z', x0 - T, x1 + T, z1, z1 + T]);
  for (const [face, a0, a1, b0, b1] of walls) {
    const open = face === '+z' && o.open === '+z';
    level.world.add({ type: 'box', min: [a0, y, b0], max: [a1, y + (open ? 0.8 : H), b1], camIgnore: face === '+z', tag: 'kammerwand' });
    if (open) { P.push(blockG(a1 - a0, 0.8, b1 - b0, (a0 + a1) / 2, y, (b0 + b1) / 2, RUIN.sandDk, { r: 0.05, seg: 1, top: RUIN.sand })); continue; }
    stoneBlockParts(P, a0, a1, y, y + H, b0, b1, { chips: false });
  }
  // Fries und Glyphen an den Innenseiten
  const glyph = (gx, gy, gz, face) => {
    const k = Math.floor(hash(gx, gz) * 3);
    const shapes = [[[0, 0.3], [0.2, 0], [0, -0.3], [-0.2, 0]], [[-0.2, 0.3], [0.2, 0.3], [0, -0.3]], [[-0.2, -0.2], [0.2, -0.2], [0.2, 0.2], [-0.2, 0.2]]];
    const sh = new THREE.Shape(shapes[k].map(([a, b]) => new THREE.Vector2(a, b)));
    const g = new THREE.ShapeGeometry(sh).toNonIndexed();
    if (face === '+x') g.rotateY(-Math.PI / 2);
    if (face === '-x') g.rotateY(Math.PI / 2);
    g.translate(gx, gy, gz);
    G.push(colorize(g, flat(0x6af0e4)));
  };
  for (let x = x0 + 1.5; x < x1 - 1; x += 2.2) glyph(x, y + 2.6, z0 + 0.02, '+z');
  for (let z = z0 + 1.5; z < z1 - 1; z += 2.2) { glyph(x0 + 0.02, y + 2.6, z, '+x'); glyph(x1 - 0.02, y + 2.6, z, '-x'); }
  P.push(blockG(x1 - x0, 0.25, 0.12, (x0 + x1) / 2, y + 3.4, z0 + 0.06, RUIN.terra, { r: 0.02, seg: 0 }));
  for (const [cx, cz] of [[x0 + 0.6, z0 + 0.6], [x1 - 0.6, z0 + 0.6]]) {
    P.push(cylG(0.45, 0.5, H, cx, y, cz, RUIN.sandLt, 12));
    P.push(blockG(1.1, 0.3, 1.1, cx, y + H - 0.3, cz, RUIN.sand, { r: 0.04, seg: 1 }));
  }
  addStatic(level, merge(P));
  if (G.length) addStatic(level, merge(G), { material: 'glow', castShadow: false });
  vines(level, [
    { x: x0 + 3, y: y + H, z: z0 + 0.02, w: 2.4, len: 2.6, face: '+z' },
    { x: x1 - 3, y: y + H, z: z0 + 0.02, w: 2.0, len: 2.0, face: '+z' },
    { x: x0 + 0.02, y: y + H, z: (z0 + z1) / 2, w: 2.6, len: 2.2, face: '+x' },
  ]);
}

// ====================================================================== 3) Lava (4-A)

/**
 * Basaltsäulen (sechseckig, dunkel mit glühendem Fuß) als Gruppen am Inselrand bzw. im See: list = [[x, y, z, h, r]]
 * (y = Fuß). solid: Säulen fest (Zylinder).
 */
export function basaltColumns(level, list, o = {}) {
  const P = [];
  const dark = L(0x2e2624), mid = L(0x4a3e3a), top = L(0x6a5a54), hot = L(0xff7a2a);
  for (const [k, [x, y, z, h, r]] of list.entries()) {
    if (o.solid) level.world.add({ type: 'cyl', x, z, r: r * 0.95, y0: y - 3, y1: y + h, tag: 'basalt' });
    if (!level.view) continue;
    const g = new THREE.CylinderGeometry(r, r * 1.04, h + 3, 6, 2).toNonIndexed();
    g.rotateY(hash(k, x) * 1.2);
    g.translate(x, y - 3 + (h + 3) / 2, z);
    P.push(colorize(g, (p, n, out) => {
      if (n.y > 0.7) { mixc(top, mid, hash(Math.round(p.x * 3), Math.round(p.z * 3)) * 0.5, out); return; }
      mixc(dark, mid, smooth(-0.6, 0.9, n.x * -0.4 + n.z * 0.6), out);
      if (p.y < (o.lavaY ?? -0.5) + 0.9) mixc(out, hot, smooth((o.lavaY ?? -0.5) + 0.9, (o.lavaY ?? -0.5), p.y) * 0.85, out);
    }));
  }
  if (P.length) addStatic(level, merge(P), { castShadow: o.shadow ?? false });
}

/** Glühende Risse auf der Insel-Oberseite (unbeleuchtet): Zickzack-Linien von der Mitte nach außen. o: center, top, R, n. */
export function glowCracks(level, o) {
  if (!level.view) return null;
  const [cx, cz] = o.center ?? [0, 0], y = (o.top ?? 2) + 0.02, n = o.n ?? 9;
  const G = [];
  for (let i = 0; i < n; i++) {
    let a = (i / n) * TAU + hash(i, 4) * 0.5, r = 2.2 + hash(i, 2) * 1.5;
    const len = (o.R ?? 10) * (0.55 + hash(i, 6) * 0.3);
    while (r < len) {
      const step = 0.7 + hash(i, r) * 0.5, a2 = a + (hash(r, i) - 0.5) * 0.35;
      const xa = cx + Math.cos(a) * r, za = cz + Math.sin(a) * r, xb = cx + Math.cos(a2) * (r + step), zb = cz + Math.sin(a2) * (r + step);
      const w = 0.12 * (1 - r / len) + 0.04;
      const g = new THREE.PlaneGeometry(Math.hypot(xb - xa, zb - za) + 0.05, w).toNonIndexed();
      g.rotateX(-Math.PI / 2);
      g.rotateY(-Math.atan2(zb - za, xb - xa));
      g.translate((xa + xb) / 2, y, (za + zb) / 2);
      const c = L(r < len * 0.5 ? 0xffd060 : 0xff7a24);
      G.push(colorize(g, (p, nn, out) => { out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; }));
      a = a2; r += step;
    }
  }
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false });
  const mesh = new THREE.Mesh(merge(G), mat);
  mesh.name = 'zier:glutrisse';
  mesh.renderOrder = 2;
  const holder = {};
  let t = 0;
  addObject(level, mesh, (dt) => { t += visDt(level, holder, dt); mat.opacity = 0.6 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.1)) + (o.boost?.() ?? 0); });
  return mat;
}

/**
 * Lavabrocken-Wellen (4-A): Gegner der Wellen ab 2 warten unsichtbar und ohne Wirkung (geparkt), bis alle Gegner der
 * vorigen Welle besiegt sind; dann springen sie nach pause s aus der Lava am Inselrand (Glutspritzer, Ansage) im Bogen
 * auf die Insel – an ihren Startpunkt. Der Arena-Archetyp zählt alle Wellen von Anfang an (HUD „noch N“). Nach einem Tod
 * setzt die Arena alle Gegner neu (runtime.respawn) – die Wellen beginnen wieder bei 1.
 * waves = [['id1'], ['id2', …]]; o: pause (1.4 s), from: id → [x, y, z] (Absprung in der Lava), flight (1.0 s), banner(level, w).
 */
export function lavaWaves(level, waves, o = {}) {
  const st = { wave: 0, timer: -1, flying: [], log: [], landed: 0 };
  const ent = (id) => level.named.get(id);
  const park = (e) => {
    if (!e || e.parked) return;
    e.parked = { update: e.update, home: e.pos.clone(), touch: e.touch };
    e.update = () => {};
    e.touch = false;
    e.shadowVisible = false;
    e.pos.set(e.parked.home.x, e.parked.home.y - 40, e.parked.home.z);
    e.vel?.set(0, 0, 0);
    if (e.model) e.model.root.visible = false;
  };
  const release = (e, id) => {
    if (!e?.parked) return;
    const P = e.parked;
    delete e.update;
    if (e.update !== P.update) e.update = P.update;
    e.touch = P.touch ?? true;
    e.shadowVisible = true;
    const from = o.from?.(id, P.home) ?? [P.home.x * 1.6, (o.lavaY ?? -0.5), P.home.z * 1.6];
    const T = o.flight ?? 1.0, g = 40;
    e.pos.set(from[0], from[1], from[2]);
    e.vel?.set((P.home.x - from[0]) / T, (P.home.y - from[1]) / T + 0.5 * g * T, (P.home.z - from[2]) / T);
    e.grounded = false;
    e.state = 'air';
    e.stateT = 0;
    e.wake = Math.max(e.wake ?? 0, 60);
    if (e.model) e.model.root.visible = true;
    e.parked = null;
    st.flying.push(e);
    level.effects?.splash?.({ x: from[0], y: from[1], z: from[2] }, 12);
    level.effects?.sparks?.({ x: from[0], y: from[1] + 0.3, z: from[2] }, 16);
  };
  const reset = () => {
    st.wave = 0; st.timer = -1; st.flying = [];
    for (let w = 1; w < waves.length; w++) for (const id of waves[w]) park(ent(id));
  };
  const rt = level.runtime;
  const respawn = rt.respawn.bind(rt);
  rt.respawn = () => { respawn(); reset(); };
  reset();
  level.onStep((dt) => {
    for (const e of st.flying.slice()) {
      if (e.removed || e.defeated) { st.flying.splice(st.flying.indexOf(e), 1); continue; }
      if (e.grounded && e.vel.y <= 0.01) {
        st.flying.splice(st.flying.indexOf(e), 1);
        st.landed++;
        level.effects?.dust(e.pos, 10, 2.0);
        level.shake?.(0.25);
        level.sfx('land');
      }
    }
    if (st.wave + 1 >= waves.length) return;
    const cur = waves[st.wave].map(ent);
    const down = cur.every((e) => !e || e.defeated || e.removed || !e.alive);
    if (down && st.timer < 0) st.timer = o.pause ?? 1.4;
    if (st.timer >= 0) {
      st.timer -= dt;
      if (st.timer <= 0) {
        st.timer = -1;
        st.wave++;
        for (const id of waves[st.wave]) release(ent(id), id);
        st.log.push({ wave: st.wave + 1, t: +level.time.toFixed(2) });
        o.banner?.(level, st.wave + 1);
      }
    }
  });
  level.named.set(o.id ?? 'wellen', st);
  return st;
}

/** Dampfschwaden aus Spalten (Punkte, 1 Zeichenaufruf): list = [[x, y, z]]. */
export function steamVents(level, list, o = {}) {
  if (!level.view || typeof document === 'undefined') return null;
  const per = o.per ?? 6, n = list.length * per;
  const pos = new Float32Array(n * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const tex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const mat = new THREE.PointsMaterial({ size: o.size ?? 2.4, map: tex, color: o.color ?? 0xd8c8c0, transparent: true, opacity: 0.4, depthWrite: false, sizeAttenuation: true });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.name = 'dampf';
  const holder = {};
  let t = 0;
  addObject(level, pts, (dt) => {
    t += visDt(level, holder, dt);
    for (let i = 0; i < n; i++) {
      const [x, y, z] = list[Math.floor(i / per)], k = (t * 0.35 + (i % per) / per) % 1;
      pos[i * 3] = x + Math.sin(t * 0.7 + i) * 0.3 * k + k * 0.6;
      pos[i * 3 + 1] = y + k * 4.5;
      pos[i * 3 + 2] = z + Math.cos(t * 0.6 + i) * 0.3 * k;
    }
    geo.attributes.position.needsUpdate = true;
  });
  return pts;
}

// ====================================================================== 4) Festung (4-B)

/**
 * Mehrere statische Registry-Modelle zu je einem Mesh pro Material verschmelzen (Weltkoordinaten; Schattenwurf wie im
 * Modell). list = [{ name, opts, pos, yaw }]. Liefert die erzeugten Meshes.
 */
export function mergeModels(level, list, tag = 'modelle') {
  if (!level.view) return [];
  const groups = new Map();
  for (const it of list) {
    const m = getModel(it.name, it.opts ?? {});
    m.update?.(0, {});
    m.root.position.set(it.pos[0], it.pos[1], it.pos[2]);
    m.root.rotation.set(0, it.yaw ?? 0, 0);
    m.root.updateMatrixWorld(true);
    m.root.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || !o.visible || Array.isArray(o.material)) return;
      const key = o.material.uuid;
      if (!groups.has(key)) groups.set(key, { mat: o.material, cast: o.castShadow, recv: o.receiveShadow, geos: [] });
      const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld);
      groups.get(key).geos.push(g);
    });
  }
  const out = [];
  for (const G of groups.values()) {
    const keys = Object.keys(G.geos[0].attributes);
    const geos = G.geos.map((g) => { for (const k of Object.keys(g.attributes)) if (!keys.includes(k)) g.deleteAttribute(k); return g; });
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, G.mat.clone());   // eigene Kopie: die Ansicht gibt sie am Levelende frei
    mesh.castShadow = G.cast; mesh.receiveShadow = G.recv;
    mesh.name = `zier:${tag}`;
    mesh.userData.owned = true;
    addObject(level, mesh);
    out.push(mesh);
  }
  return out;
}

/** Steckbrief „Gesucht: Lotti & Greta“ (Kanvas, eigene Gestaltung) als Textur. */
function wantedTexture() {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = '#f2dfb0'; g.fillRect(0, 0, 128, 160);
  g.strokeStyle = '#8a5a2a'; g.lineWidth = 4; g.strokeRect(4, 4, 120, 152);
  g.fillStyle = '#7a2a18'; g.font = 'bold 18px sans-serif'; g.textAlign = 'center';
  g.fillText('GESUCHT', 64, 28);
  // zwei Köpfchen (Lotti mit Zöpfen, Greta mit Pferdeschwanz) – eigene Strichzeichnung
  for (const [cx, hair] of [[40, '#c86a28'], [88, '#f0c040']]) {
    g.fillStyle = '#ffd8b8'; g.beginPath(); g.arc(cx, 72, 16, 0, TAU); g.fill();
    g.fillStyle = hair; g.beginPath(); g.arc(cx, 66, 16, Math.PI, TAU); g.fill();
    if (cx < 64) { g.beginPath(); g.arc(cx - 17, 78, 6, 0, TAU); g.arc(cx + 17, 78, 6, 0, TAU); g.fill(); }
    else { g.beginPath(); g.ellipse(cx + 16, 70, 5, 12, 0.4, 0, TAU); g.fill(); }
    g.fillStyle = '#2a1a10'; g.beginPath(); g.arc(cx - 5, 74, 2, 0, TAU); g.arc(cx + 5, 74, 2, 0, TAU); g.fill();
    g.strokeStyle = '#a03a2a'; g.lineWidth = 2; g.beginPath(); g.arc(cx, 79, 5, 0.2, Math.PI - 0.2); g.stroke();
  }
  g.fillStyle = '#3a2a1a'; g.font = 'bold 13px sans-serif';
  g.fillText('Lotti & Greta', 64, 112);
  g.font = '11px sans-serif'; g.fillText('Belohnung:', 64, 130);
  g.fillText('1 Honigtopf', 64, 145);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Blau vergitterte Werfer-Festung (Bauplan 4-B: ca. 25 × 25 m). Kampfplatz half × half um (0, y, 0): Kollision ringsum
 * (unsichtbare Wände, Kamera geht hindurch), Decke; Darstellung: Steinboden (blau-grau, Schachbrett), Wappen-Mosaik in
 * der Mitte, Gitterwände (Modell festungsgitter, hinten/links/rechts; vorn niedrige Brüstung), Außenmauern mit Zinnen,
 * vier Ecktürme mit blauen Kegeldächern und wehenden Fahnen, Banner, Steckbrief, Fässer und Kisten.
 * cfg = { y, half: 11, outer: 14.5, height: 4.5, ceiling: 8 }. Rückgabe: { flags, glowMat }.
 */
export function blueFortress(level, cfg) {
  const Y = cfg.y, R = cfg.half ?? 11, O = cfg.outer ?? 14.5, H = cfg.height ?? 4.5;
  const W = level.world;
  const inv = (min, max, tag) => W.add({ type: 'box', min, max, camIgnore: true, noWallSlide: true, tag });
  const C = cfg.ceiling ?? 8;
  inv([-R - 0.6, Y, -R - 0.6], [R + 0.6, Y + C, -R], 'gitter');
  inv([-R - 0.6, Y, R], [R + 0.6, Y + C, R + 0.6], 'gitter');
  inv([-R - 0.6, Y, -R], [-R, Y + C, R], 'gitter');
  inv([R, Y, -R], [R + 0.6, Y + C, R], 'gitter');
  inv([-R - 0.6, Y + C, -R - 0.6], [R + 0.6, Y + C + 0.5, R + 0.6], 'gitter-decke');
  if (!level.view) return {};
  const blue = 0x2a5ac8, blueDk = 0x1a3478, stone = 0x8a94a8, stoneDk = 0x5a6478, stoneLt = 0xb4bccc, gold = 0xffc23a;
  const P = [], N = [], G = [];
  // Boden: Platten
  const tA = L(0x7e8aa2), tB = L(0x6a7690), tC = L(0x8e9ab0);
  for (let ix = -O; ix < O; ix += 2) for (let iz = -O; iz < O; iz += 2) {
    const k = ((ix / 2 + iz / 2) & 1) ? tA : (((ix * 7 + iz * 3) & 3) === 0 ? tC : tB);
    P.push(quadXZ(ix + 0.04, ix + 1.96, iz + 0.04, iz + 1.96, Y + 0.012, (p, n, o) => { o[0] = k[0]; o[1] = k[1]; o[2] = k[2]; }));
  }
  // Wappen-Mosaik: blauer Ring, goldene Flamme (Feuer-Werfer-Zeichen), Sterne
  const glowParts = [discG(3.4, 3.7, 0, Y + 0.025, 0, 0x3a7aff, 48), discG(2.7, 2.85, 0, Y + 0.025, 0, gold, 48)];
  const flame = new THREE.Shape();
  flame.moveTo(0, -1.4); flame.bezierCurveTo(1.3, -1.0, 1.1, 0.4, 0.2, 1.6); flame.bezierCurveTo(0.3, 0.6, -0.2, 0.4, -0.4, 0.9);
  flame.bezierCurveTo(-1.2, 0.2, -1.1, -1.0, 0, -1.4);
  const fg = new THREE.ShapeGeometry(flame, 10).toNonIndexed();
  fg.rotateX(-Math.PI / 2); fg.translate(0, Y + 0.03, 0.1);
  glowParts.push(colorize(fg, (p, n, o) => mixc(L(0xff7a1a), L(0xffe066), smooth(-1.4, 1.2, -(p.z - 0.1)), o)));
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.3; glowParts.push(starG(0.42, 0.18, Math.cos(a) * 3.15, Y + 0.028, Math.sin(a) * 3.15, gold, a)); }
  const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false });
  const circle = new THREE.Mesh(merge(glowParts), glowMat);
  circle.renderOrder = 2;
  addObject(level, circle);
  // Gitterwände (Registry-Modell, Fläche nach ±X, verläuft entlang z): links, rechts, hinten – zu je einem Mesh pro
  // Material verschmolzen (3 Modelle → 2 Zeichenaufrufe + Schatten)
  mergeModels(level, [
    { name: 'festungsgitter', opts: { width: 2 * R, height: H }, pos: [-R - 0.15, Y, 0], yaw: 0 },
    { name: 'festungsgitter', opts: { width: 2 * R, height: H }, pos: [R + 0.15, Y, 0], yaw: 0 },
    { name: 'festungsgitter', opts: { width: 2 * R, height: H }, pos: [0, Y, -R - 0.15], yaw: Math.PI / 2 },
  ], 'gitter');
  // vorn: niedrige blaue Brüstung mit Goldkugeln
  P.push(blockG(2 * R + 0.4, 0.9, 0.4, 0, Y, R + 0.2, blue, { r: 0.06, seg: 1, top: blueDk }));
  for (let x = -R; x <= R + 0.01; x += 2.2) { P.push(blockG(0.32, 1.25, 0.32, x, Y, R + 0.2, blueDk, { r: 0.04, seg: 1 })); P.push(sphereG(0.18, x, Y + 1.36, R + 0.2, gold, { ws: 8, hs: 6 })); }
  // Außenmauern (blau-graue Quader) mit Zinnen: hinten hoch, seitlich mittel, vorn niedrig
  const wall = (x0, z0, x1, z1, h, th, zinnen = true) => {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, len = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(-(z1 - z0), x1 - x0);
    P.push(blockG(len, h, th, cx, Y, cz, stone, { r: 0.08, seg: 1, top: stoneLt, ry }));
    for (let yy = 0.8; yy < h - 0.2; yy += 0.8) P.push(blockG(len + 0.02, 0.05, th + 0.02, cx, Y + yy, cz, stoneDk, { r: 0, seg: 0, ry }));
    P.push(blockG(len + 0.04, 0.22, th + 0.06, cx, Y + h - 0.6, cz, blue, { r: 0.02, seg: 0, ry }));
    if (zinnen) {
      const n = Math.round(len / 1.3);
      for (let i = 0; i < n; i += 2) {
        const t = (i + 0.5) / n - 0.5;
        P.push(blockG(len / n, 0.7, th, cx + Math.cos(ry) * t * len, Y + h, cz - Math.sin(ry) * t * len, stone, { r: 0.05, seg: 1, top: stoneLt, ry }));
      }
    }
  };
  wall(-O, -O + 0.6, O, -O + 0.6, 7.4, 1.2);
  wall(-O + 0.5, -O, -O + 0.5, O, 3.6, 1.0);
  wall(O - 0.5, -O, O - 0.5, O, 3.6, 1.0);
  wall(-O, O - 0.4, -3, O - 0.4, 1.2, 0.8);
  wall(3, O - 0.4, O, O - 0.4, 1.2, 0.8);
  // Torbogen hinten mit blauem Tor (geschlossen), Banner, Steckbrief
  P.push(blockG(5.4, 1.0, 1.6, 0, Y + 5.0, -O + 0.6, stoneLt, { r: 0.1, seg: 1 }));
  for (const s of [-1, 1]) P.push(blockG(1.0, 5.0, 1.6, s * 2.2, Y, -O + 0.6, stoneLt, { r: 0.08, seg: 1 }));
  for (let i = 0; i < 6; i++) P.push(blockG(0.55, 4.9, 0.18, -1.38 + i * 0.55, Y, -O + 1.45, i % 2 ? blue : blueDk, { r: 0.02, seg: 0 }));
  P.push(blockG(3.4, 0.18, 0.22, 0, Y + 1.6, -O + 1.5, gold, { r: 0.02, seg: 0 }));
  P.push(blockG(3.4, 0.18, 0.22, 0, Y + 3.4, -O + 1.5, gold, { r: 0.02, seg: 0 }));
  const banTex = emblemTexture('banner', { base: '#1c46b8', edge: '#ffc21a' });
  const banMat = new THREE.MeshLambertMaterial({ map: banTex, side: THREE.DoubleSide, emissive: 0x020818 });
  const banG = [];
  for (const x of [-8.2, -4.6, 4.6, 8.2]) {
    const b = new THREE.PlaneGeometry(1.7, 3.2, 1, 1);
    b.translate(x, Y + 4.4, -O + 1.24);
    banG.push(b);
    P.push(cylG(0.05, 0.05, 2.1, x, Y + 6.05, -O + 1.3, gold, 6, { rz: Math.PI / 2, center: true }));
  }
  const banners = new THREE.Mesh(merge(banG.map((g) => g.toNonIndexed())), banMat);
  addObject(level, banners);
  const wt = wantedTexture();
  if (wt) {
    const wm = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.5), new THREE.MeshLambertMaterial({ map: wt, side: THREE.DoubleSide }));
    wm.position.set(6.4, Y + 1.9, -O + 1.24);
    wm.rotation.z = 0.04;
    addObject(level, wm);
    P.push(sphereG(0.06, 6.4, Y + 2.6, -O + 1.28, 0xb03a2a, { ws: 6, hs: 4 }));
  }
  // Ecktürme: blaue Kegeldächer, Fensterschlitze (leuchtend), Fahnen
  const flagList = [];
  for (const [x, z, h, r] of [[-O + 0.6, -O + 0.8, 11, 2.3], [O - 0.6, -O + 0.8, 11, 2.3], [-O + 0.6, O - 0.6, 5, 1.7], [O - 0.6, O - 0.6, 5, 1.7]]) {
    const rows = Math.max(1, Math.round(h / 1.1));
    P.push(cylG(r, r * 1.08, h + 2, x, Y - 2, z, stone, 18, { rows, fn: (p, n, o) => mixc(L(stone), L(stoneDk), (Math.floor((p.y - Y) / 0.8) & 1) * 0.25, o) }));
    P.push(cylG(r + 0.25, r + 0.25, 0.4, x, Y + h - 0.4, z, blue, 18));
    if (h > 8) {
      P.push(coneG(r + 0.5, 4.0, x, Y + h, z, blue, 16, { fn: (p, n, o) => mixc(L(blueDk), L(0x4a7ae8), smooth(-0.3, 0.8, n.y + (Math.floor(p.y * 2.2) & 1) * 0.15), o) }));
      P.push(sphereG(0.22, x, Y + h + 4.2, z, gold));
      flagList.push({ pos: [x, Y + h + 4.2, z], h: 2.4, yaw: -0.7 + (x > 0 ? 0.25 : 0) });
      for (const yy of [3.2, 6.2, 9.0]) for (const a of [Math.PI / 2, x < 0 ? 0 : Math.PI]) G.push(blockG(0.28, 0.9, 0.06, x + Math.cos(a) * (r + 0.02), Y + yy, z + Math.sin(a) * (r + 0.02), 0x7ab4ff, { r: 0, seg: 0, ry: a + Math.PI / 2 }));
    } else {
      for (let i = 0; i < 8; i += 2) { const a = (i / 8) * TAU; P.push(blockG(0.55, 0.6, 0.45, x + Math.cos(a) * r, Y + h, z + Math.sin(a) * r, stone, { r: 0.04, seg: 1, ry: -a })); }
      flagList.push({ pos: [x, Y + h, z], h: 2.6, yaw: -0.7, scale: 0.8 });
    }
  }
  for (const z of [-6, 0, 6]) for (const s of [-1, 1]) flagList.push({ pos: [s * (O - 0.5), Y + 3.6, z], h: 2.2, yaw: s < 0 ? -0.4 : -1.2, scale: 0.6 });
  // Lager der Feuer-Werfer: Fässer, Kisten, Feuerschale-Ersatz (Holzstapel), Waffengestell mit Feuerkugeln
  const barrel = (x, z, s = 1) => {
    P.push(cylG(0.38 * s, 0.34 * s, 0.9 * s, x, Y, z, 0x9a6a3a, 12));
    for (const yy of [0.15, 0.72]) P.push(cylG(0.4 * s, 0.4 * s, 0.07, x, Y + yy * s, z, 0x4a4a58, 12));
  };
  barrel(-9.6, -9.4); barrel(-8.7, -9.7, 0.9); barrel(-9.3, -8.5, 0.8); barrel(9.5, 8.6); barrel(9.7, 7.6, 0.85);
  for (const [x, z, s] of [[9.3, -9.4, 1], [8.3, -9.6, 0.8], [9.4, -8.4, 0.7]]) {
    P.push(blockG(s, s, s, x, Y, z, 0xb88050, { r: 0.04, seg: 1, top: 0xd0985e }));
    P.push(blockG(s + 0.02, 0.08, s + 0.02, x, Y + s * 0.5, z, 0x6a4424, { r: 0, seg: 0 }));
  }
  for (const [x, z] of [[-9.5, 8.5]]) {
    for (let i = 0; i < 3; i++) P.push(cylG(0.12, 0.12, 1.6, x + (i - 1) * 0.3, Y + 0.12 + (i % 2) * 0.2, z, 0x7a5030, 6, { rz: Math.PI / 2, center: true }));
    for (let i = 0; i < 3; i++) G.push(sphereG(0.2, x - 0.3 + i * 0.3, Y + 0.6, z + 0.05, 0xff8a2a, { ws: 8, hs: 6 }));
  }
  bake(level, P);
  bake(level, N, { castShadow: false });
  if (G.length) bake(level, G, { material: 'glow', castShadow: false });
  const flagTex = emblemTexture('flag', { base: '#1c46b8', edge: '#ffc21a' });
  const flags = new WavingFlags(level, flagList, { w: 2.0, h: 1.35, staticPoles: true, tex: flagTex, emissive: 0x020614 });
  return { glowMat, circle, flags, banners };
}

/** 4-B: Wappen pulsiert, Glutfunken steigen auf; Werfer werfen den Sonnenschatten nur mit dem Körper. */
export function fortressFxB(level, fx, o = {}) {
  if (!level.view || !fx.glowMat) return;
  particles(level, { center: [0, (o.y ?? 2) - 16, 0], r0: 15, r1: 26, n: 70, h: 30, dot: 0.3, speed: [1.6, 3.2], name: 'glutfunken', colors: [0xffd070, 0xff8a2a, 0x8ab4ff] });
  level.view.onFrame((dt, t) => {
    const info = level.archetype?.info?.() ?? {};
    fx.glowMat.opacity = 0.7 + 0.2 * Math.sin(t * 2.4) + (info.cleared ? 0.1 : 0);
  });
}
