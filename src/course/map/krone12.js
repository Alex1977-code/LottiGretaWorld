// Gelände, Ränder, Treppen, Requisiten, Streudeko und lebendige Kulisse der Karte der Bonuswelt Krone „Kronen-Gipfel“ (Welt 12;
// eigene Gestaltung, Spielzeug-Look wie Welt 1–11): ein goldener Gipfel über den Wolken. Marmor- und Goldstein-Terrassen ragen
// aus einem Wolkenmeer (CloudSea wie Welt 6), Felswände mit Gold- und Sandsteinbändern fallen in die Wolken; goldene Treppen mit
// rotem Teppich führen von der Ankunfts-Terrasse zu den beiden Seiten-Terrassen und hinauf zum Siegerplatz. Ringsum stehen
// ferne Gipfel mit goldenen Spitzen. Ein festlicher Abschluss-Ort: Fahnen und Wimpel wehen, aus Konfetti-Kanonen fliegt im Takt
// der Kartenmusik Konfetti, Goldlaternen und Funkeln pulsieren (Kulissen der Eingänge: decor_krone.js).
//
// Geländestile (map.ground[].style), alle als Terrasse (flache Decke, Goldkante, Felswand in Bändern bis in die Wolken):
// 'marble' (Standard, weiße Marmorplatten mit Goldfugen – Ankunft), 'goldstone' (warmer Sandstein mit Goldadern – Seiten-
// Terrassen), 'summit' (Siegerplatz: Goldplatten, roter Teppich-Streifen in der Mitte), 'peakrock' (nicht begehbarer Fels).
// Ränder: 'kronehedge' (niedrige Marmormauer mit Goldkante), 'kronerail' (Balustrade); an Abbrüchen zu den Wolken setzt
// kroneRims eine weiße Balustrade mit goldenem Handlauf und Goldkugeln (Brücken ausgenommen). Treppen (segments, Kollision wie
// `bridge`): 'goldstairs' (Goldstufen mit rotem Teppich, Geländer mit Goldkugeln).
// Requisiten (map.props): 'pillar12' (Marmorsäule mit Goldkapitell), 'urn12' (Goldvase mit Blumen), 'lamp12' (Goldlaterne,
// leuchtet im Takt), 'banner12' (Wimpelmast), 'cloud12' (Wolkenpuff), 'flowers12' (Blumenkübel).
// Ferne Gipfel: map.peaks [{ pos: [x, z], h, r, snow }] (nur Optik). Wimpelketten: map.bunting [[x0, y0, z0, x1, y1, z1]]. Fahnen: map.flags [[x, y, z, Masthöhe, Farbe]] (wehen, eine
// Instanz-Fläche je Teil). Konfetti-Kanonen: map.confetti [{ pos: [x, y, z], dir: [dx, dz] }].
// Lebendige Kulisse (KroneLife): Goldlaternen, Kronen-Funkeln und Sterne im Puls-Material 'bglow' (je Zählzeit der Kartenmusik
// heller Aufschein; Ersatzuhr im Tempo von course_worldkrone_map); Konfetti – je Zählzeit schießt eine der Kanonen einen Schwall
// bunter Schnipsel, die flatternd zu Boden segeln (eine Instanz-Fläche); Fahnen wehen.
// Thema 'map_krone': über den Wolken – oben tiefes Himmelblau, zum Horizont Gold und Pfirsich, warme Sonne.

import * as THREE from 'three';
import { THEMES } from '../view/themes.js';
import { alignedGrid } from '../blocks/kit.js';
import { buildBridge } from '../blocks/types/bridge.js';
import { Rnd } from '../../three/world/geometry.js';
import {
  registerKit, Build, place, mix, TAU, cached, lin, mixc, smooth, colorize, PI, FRONT, hash2, tone, flat,
  beatClock, bonusGlow, profileParts, edgeRuns, spanOf, placeAlong, modelKit, setInst, mergeParts,
} from './bonuskit.js';

export const KRONE_MUSIC = 'course_worldkrone_map';
export const BEAT12 = beatClock(KRONE_MUSIC);
export const MK12 = modelKit('w12');
export const GLOW_TILE12 = MK12.glowTile;

// ------------------------------------------------------------------ Thema

if (!THEMES.map_krone) {
  THEMES.map_krone = {
    ...THEMES.grass,
    label: 'Weltkarte Kronen-Gipfel',
    sky: [[1, 0x1e5ad8], [0.5, 0x3a8af0], [0.2, 0x8ac4ff], [0.07, 0xffe8b8], [0, 0xffd090], [-0.1, 0xf8e8e0], [-1, 0xe0e8f8]],
    background: 0xf8e4c8,
    fog: { color: 0xf8e8d8, near: 120, far: 460 },
    hemi: { sky: 0xf0f4ff, ground: 0xd8b88a, intensity: 1.45 },
    sun: { color: 0xfff0d0, intensity: 2.7, dir: [-0.5, 0.95, 0.45] },
    ground: null,
    clouds: false,
    sunDisc: true,
    backdrop: 'krone12',
    grassTop: 0x8ad86a, grassTop2: 0x7ccc5e, grassRim: 0xb8f090, grassSide: 0xc8a070,
    dirt: 0xd8a868, dirtDeep: 0xa87a48, rock: 0xd8c0a0, rockDeep: 0xa89070,
    stone: 0xfaf6f0, stoneDark: 0xd8ccc0,
    wood: 0xfff4e8, woodDark: 0xc8a070,
    water: 0x6ac8f0, waterDeep: 0x3a8ad8,
    buildBackdrop(sky, bounds, rnd) { kroneBackdrop(sky, bounds, rnd); },
  };
}

/** Ferne Gipfel mit goldenen Spitzen, die aus den Wolken ragen (unbeleuchtet, im Dunst). */
function kroneBackdrop(sky, bounds, rnd) {
  const parts = [];
  const x0 = bounds.min.x, x1 = bounds.max.x, z0 = bounds.min.z, z1 = bounds.max.z;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const R0 = Math.max(x1 - x0, z1 - z0) / 2 + 170;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU + rnd.real(-0.08, 0.08);
    const r = R0 + rnd.real(-20, 60);
    const bx = cx + Math.cos(a) * r, bz = cz + Math.sin(a) * r;
    const h = rnd.real(30, 70), rad = rnd.real(18, 34);
    const g = new THREE.ConeGeometry(rad, h, 7, 1);
    g.translate(bx, h / 2 - 6, bz);
    parts.push(colorize(g, (p, n, o) => (p.y > h * 0.62 - 6 ? mixc(lin(0xffe8a0), lin(0xfff8e0), 0.5, o) : mixc(lin(0xb89a8a), lin(0xe8d0c0), smooth(-6, h, p.y), o))));
  }
  const g = mergeParts(parts);
  if (!g) return;
  const mesh = new THREE.Mesh(sky.track(g), sky.track(new THREE.MeshBasicMaterial({ vertexColors: true, fog: true })));
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  mesh.name = 'w12:hintergrund';
  sky.group.add(mesh);
}

// ------------------------------------------------------------------ Terrassen

// top: Platten (zwei Töne), joint: Fugen, edge: Goldkante, bands: Felswand-Bänder
const TERR = {
  marble: { top: [0xfaf6f0, 0xeee6dc], joint: 0xe0b84a, edge: 0xf0c040, bands: [0xe8d4b8, 0xd8c0a0, 0xf0e0c8, 0xc8ac88] },
  goldstone: { top: [0xf0d8a8, 0xe4c890], joint: 0xc8983a, edge: 0xe8b830, bands: [0xd8b080, 0xc89c68, 0xe8c090, 0xb88a58] },
  summit: { top: [0xffe8a8, 0xf8d890], joint: 0xd8a02a, edge: 0xffc830, bands: [0xe0c098, 0xd0ac80, 0xf0d4b0, 0xc09868], carpet: true },
  peakrock: { top: [0xe8d8c0, 0xd8c8b0], joint: 0xc8b898, edge: 0xd8c8b0, bands: [0xd0b8a0, 0xc0a890, 0xe0c8b0, 0xb09880] },
};
export const KRONE_STYLES = new Set(Object.keys(TERR));

/**
 * Terrasse des Kronen-Gipfels: Decke im 2-m-Raster (Fugen golden, beim Siegerplatz ein roter Teppich-Streifen), Goldkante,
 * Felswand in versetzten Bändern bis in die Wolken (gerundetes Rechteck, nach unten breiter), Goldadern, Unterkante im Wolkenmeer.
 */
export function kroneGround(b, base, theme, rnd, map) {
  const st = b.style ?? 'marble';
  const P = TERR[st] ?? TERR.marble;
  const [x0, z0, x1, z1] = b.rect;
  const top = b.top, hw = (x1 - x0) / 2, hd = (z1 - z0) / 2, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const sea = map?.sea ?? 0;
  const m = 0.6, R = Math.min(4, 0.3 * Math.min(hw, hd) + m);
  const out = [];
  const edgeC = lin(P.edge);
  // Goldkante oben, dann Felswand in Bändern, die nach unten breiter werden (bis 3 m unter die Wolkendecke)
  const H = top - (sea - 3);
  const nb = Math.max(3, Math.round(H / 2.2));
  const rings = [{ o: 0, R: 0, dy: 0, col: lin(P.top[0]) }, { o: m, R, dy: 0, col: edgeC }, { o: m + 0.15, R: R + 0.15, dy: -0.35, col: edgeC }];
  for (let k = 1; k <= nb; k++) {
    const t = k / nb;
    const c = lin(P.bands[k % P.bands.length]);
    const grow = m + 0.15 + t * Math.min(6, 0.25 * Math.min(hw, hd)) + Math.sin(k * 2.3 + cx) * 0.25;
    rings.push({ o: grow, R: R + grow - m, dy: -0.35 - t * (H - 0.35), col: (p) => mixc(c, [0, 0, 0], hash2(Math.round(p[0]), Math.round(p[2] + p[1])) * 0.12, [0, 0, 0]), wob: (a) => Math.sin(a * 9 + k) * 0.18, up: 0.05 });
  }
  const prof = profileParts(b, rings, 64);
  out.push(flat(prof.parts[0]));
  out.push(flat(prof.parts[1], 'glow', GLOW_TILE12));   // goldene Kante leuchtet sacht (wie poliert)
  for (const g of prof.parts.slice(2)) out.push(g);
  // Decke: Platten mit Goldfugen
  const jC = lin(P.joint);
  out.push(flat(alignedGrid(x0, z0, x1, z1, top, 2, (i, j, ax, az) => {
    const o = tone(P.top[0], P.top[1], hash2(ax * 0.5 + 3, az * 0.5) * 0.7);
    if (P.carpet && Math.abs(ax + 1 - cx) < 1.6) return mixc(lin(0xc8283a), lin(0xe0404a), hash2(ax, az) * 0.3, o);
    return o;
  })));
  const fb = new Build();
  const y = top + 0.012;
  for (let x = Math.ceil(x0 / 2) * 2; x < x1 - 0.3; x += 2) if (x > x0 + 0.3) fb.box(0.07, 0.02, z1 - z0 - 0.4, P.joint, { p: [x, y, cz] }, 0);
  for (let z = Math.ceil(z0 / 2) * 2; z < z1 - 0.3; z += 2) if (z > z0 + 0.3) fb.box(x1 - x0 - 0.4, 0.02, 0.07, P.joint, { p: [cx, y, z] }, 0);
  if (fb.parts.length) out.push(flat(fb.geometry()));
  // Goldadern an der Felswand (vorn, zur Kamera) – sacht leuchtend
  const vb = new Build();
  const nV = Math.max(2, Math.round(hw / 4));
  for (let i = 0; i < nV; i++) {
    const vx = x0 + (i + 0.5) * ((x1 - x0) / nV) + (hash2(i, cz) - 0.5) * 2;
    const pts = [];
    for (let k = 0; k <= 5; k++) pts.push([vx + Math.sin(k * 1.7 + i) * 0.6, top - 1 - k * Math.min(2.2, (H - 2) / 5), z1 + m + 0.35 + k * 0.32]);
    vb.tube(pts, 0.09, 0xffd040, null, 10, 3);
  }
  out.push(flat(vb.geometry(), 'glow', GLOW_TILE12));
  void base; void theme; void jC; void rnd;
  return out;
}

// ------------------------------------------------------------------ Ränder

function kroneHedgeGeo(len) {
  const b = new Build();
  b.box(len, 0.6, 0.6, { v: (x, y, z, nx, ny) => (ny > 0.5 ? 0xf8f0e4 : 0xe0d4c4) }, { p: [0, 0.3, 0] }, 0.05);
  b.box(len, 0.08, 0.66, 0xf0c040, { p: [0, 0.62, 0] }, 0);
  return b.geometry();
}
/** Balustrade (entlang +X): weiße Baluster, goldener Handlauf, Goldkugeln auf den Pfosten. */
function balustradeGeo(len, posts = true) {
  const b = new Build();
  const n = Math.max(2, Math.round(len / 0.5));
  for (let i = 0; i <= n; i++) {
    const x = -len / 2 + i * (len / n);
    if (i % 6 === 0 && posts) { b.box(0.22, 0.9, 0.22, 0xf8f2ea, { p: [x, 0.45, 0] }, 0.03); b.sphere(0.13, 0xffc830, { p: [x, 1.0, 0] }, 6, 4); }
    else b.lathe([[0.06, 0], [0.09, 0.15], [0.05, 0.4], [0.09, 0.62], [0.06, 0.75]], 0xf4ece0, { p: [x, 0, 0] }, 5);
  }
  b.box(len, 0.08, 0.14, 0xffc830, { p: [0, 0.8, 0] }, 0.02);
  b.box(len, 0.06, 0.18, 0xe8dccc, { p: [0, 0.03, 0] }, 0);
  return b.geometry();
}
export function kroneEdgeGeo(kind, len, seed) {
  if (kind === 'kronehedge') return kroneHedgeGeo(len + 0.1);
  if (kind === 'kronerail') return balustradeGeo(len);
  void seed;
  return null;
}
/** Balustrade an allen Terrassen-Rändern zu den Wolken (Treppen ausgenommen). */
export function kroneRims(level, map, grid) {
  if (!level.view) return 0;
  let n = 0;
  for (const r of edgeRuns(level, map, grid)) {
    const L = r.b - r.a;
    if (L < 0.8) continue;
    const g = balustradeGeo(L, true);
    const off = -r.w.side * 0.2, mid = (r.a + r.b) / 2;
    if (r.w.axis === 'x') { g.rotateY(PI / 2); g.translate(r.w.x + off, r.y, mid); } else g.translate(mid, r.y, r.w.z + off);
    level.view.addStatic(g, { castShadow: false });
    n++;
  }
  return n;
}

// ------------------------------------------------------------------ Treppen

/** Goldene Treppe: Stufen mit rotem Teppich in der Mitte, weiße Wangen, Balustraden mit Goldkugeln. */
function buildGoldStairs(level, spec) {
  buildBridge({ world: level.world, view: null }, { ...spec, rails: false });
  if (!level.view) return;
  const { a, c, L, dy, Ld, w } = spanOf(spec);
  const b = new Build(), deck = new Build();
  const nS = Math.max(3, Math.round(L / 0.55));
  for (let i = 0; i < nS; i++) {
    const u0 = (i / nS) * L, u1 = ((i + 1) / nS) * L;
    const yy = ((i + 0.5) / nS) * dy;
    deck.box(u1 - u0 + 0.02, 0.18, w - 0.5, { v: (px, py, pz, nx, ny) => (Math.abs(pz) < w * 0.22 ? (ny > 0.5 ? 0xd8303e : 0xa82030) : ny > 0.5 ? 0xffd860 : 0xd8a83a) }, { p: [(u0 + u1) / 2, yy - 0.09, 0] }, 0);
  }
  for (const s of [-1, 1]) {
    b.box(Ld + 0.2, 0.7, 0.25, { v: (px, py, pz, nx, ny) => (ny > 0.5 ? 0xffc830 : 0xf4ece0) }, { p: [L / 2, dy / 2 - 0.15, s * (w / 2 - 0.12)], r: [0, 0, Math.atan2(dy, L)] }, 0.04);
    const g = balustradeGeo(Ld, true);
    g.rotateZ(Math.atan2(dy, L));
    g.translate(L / 2, dy / 2 + 0.2, s * (w / 2 - 0.12));
    b.parts.push(g);
  }
  // Unterbau: Bogen aus Marmor unter der Treppe
  b.box(Ld, 0.5, w - 0.3, 0xe8dccc, { p: [L / 2, dy / 2 - 0.5, 0], r: [0, 0, Math.atan2(dy, L)] }, 0.05);
  level.view.addStatic(placeAlong(b.geometry(), a, c), { castShadow: true });
  level.view.addStatic(placeAlong(deck.geometry(), a, c), { castShadow: false });
}

export function buildKroneSegment(level, seg) {
  if (seg.type === 'goldstairs') { buildGoldStairs(level, seg); return true; }
  return false;
}

// ------------------------------------------------------------------ Requisiten

function pillarGeo12(h = 4) {
  return cached(`w12m:pillar:${h}`, () => {
    const b = new Build();
    b.box(1.1, 0.35, 1.1, 0xf4ece0, { p: [0, 0.17, 0] }, 0.04);
    b.cyl(0.38, 0.42, h - 0.9, { v: (px, py, pz) => mix(0xf8f2ea, 0xe8dccc, Math.abs(Math.sin(Math.atan2(pz, px) * 8)) * 0.6) }, { p: [0, 0.35 + (h - 0.9) / 2, 0] }, 16);
    b.cyl(0.6, 0.42, 0.3, 0xffc830, { p: [0, h - 0.4, 0] }, 12);
    b.box(1.2, 0.2, 1.2, 0xffd860, { p: [0, h - 0.15, 0] }, 0.03);
    return b.geometry();
  });
}
function urnGeo12() {
  return cached('w12m:urn', () => {
    const b = new Build();
    b.lathe([[0.2, 0], [0.3, 0.1], [0.18, 0.3], [0.38, 0.6], [0.42, 0.85], [0.3, 1.0], [0.36, 1.08]], { v: (px, py) => mix(0xd8a02a, 0xffe07a, py) }, null, 12);
    const cols = [0xff4a5a, 0xffffff, 0xff8ac8, 0xffd23a];
    for (let i = 0; i < 7; i++) { const a = i * 2.39; b.sphere(0.13, cols[i % 4], { p: [Math.cos(a) * 0.22, 1.18 + (i % 3) * 0.08, Math.sin(a) * 0.22] }, 6, 4); }
    b.sphere(0.32, 0x3e9a4a, { p: [0, 1.1, 0], s: [1, 0.5, 1] }, 8, 4);
    return b.geometry();
  });
}
function lampGeo12() {
  return cached('w12m:lamp', () => {
    const b = new Build();
    b.cyl(0.24, 0.3, 0.3, 0xd8a02a, { p: [0, 0.15, 0] }, 8);
    b.cyl(0.07, 0.09, 2.8, 0xffc830, { p: [0, 1.7, 0] }, 7);
    b.cone(0.38, 0.36, 0xd8a02a, { p: [0, 3.65, 0] }, 8);
    b.sphere(0.08, 0xffe07a, { p: [0, 3.9, 0] }, 6, 4);
    return b.geometry();
  });
}
function lampGlowGeo12() {
  return cached('w12m:lampglow', () => { const b = new Build(); b.box(0.42, 0.5, 0.42, 0xfff0b0, { p: [0, 3.22, 0] }, 0.05); return b.geometry(); });
}
function bannerGeo12(h = 5) {
  return cached(`w12m:banner:${h}`, () => {
    const b = new Build();
    b.cyl(0.07, 0.09, h, 0xffc830, { p: [0, h / 2, 0] }, 7);
    b.sphere(0.14, 0xffe07a, { p: [0, h + 0.1, 0] }, 7, 5);
    const cols = [0xd8283a, 0x3a6ae8, 0xffc830, 0x2ec85a, 0xb05aff];
    for (let i = 0; i < 5; i++) b.cone(0.18, 0.4, cols[i], { p: [0.26, h - 0.4 - i * 0.48, 0], r: [0, 0, -PI / 2] }, 3);
    return b.geometry();
  });
}
function cloudGeo12(s = 1) {
  return cached(`w12m:cloud:${s}`, () => {
    const b = new Build();
    for (const [x, y, z, r] of [[0, 0, 0, 1.2], [-1.1, -0.2, 0.2, 0.9], [1.1, -0.15, -0.1, 0.95], [0.2, 0.45, -0.2, 0.8]]) b.sphere(r * s, { v: (px, py, pz, nx, ny) => mix(0xe0e6f8, 0xffffff, ny * 0.5 + 0.5) }, { p: [x * s, y * s, z * s], s: [1.2, 0.75, 1] }, 9, 6);
    return b.geometry();
  });
}
function flowersGeo12() {
  return cached('w12m:flowers', () => {
    const b = new Build();
    b.box(1.4, 0.6, 0.7, { v: (x, y, z, nx, ny) => (ny > 0.5 ? 0x7a5a3a : 0xf4ece0) }, { p: [0, 0.3, 0] }, 0.05);
    b.box(1.46, 0.08, 0.76, 0xffc830, { p: [0, 0.6, 0] }, 0.02);
    const cols = [0xff4a5a, 0xffffff, 0xff8ac8, 0xffd23a, 0xb07af0];
    for (let i = 0; i < 9; i++) b.sphere(0.14, cols[i % 5], { p: [-0.55 + (i % 5) * 0.28, 0.75 + (i % 2) * 0.08, (Math.floor(i / 5) - 0.5) * 0.3] }, 6, 4);
    return b.geometry();
  });
}

export function kronePropGeo(it) {
  switch (it.kind) {
    case 'pillar12': return pillarGeo12(it.size ?? 4).clone();
    case 'urn12': return urnGeo12().clone();
    case 'lamp12': return lampGeo12().clone();
    case 'banner12': return bannerGeo12(it.size ?? 5).clone();
    case 'cloud12': return cloudGeo12(it.size ?? 1).clone();
    case 'flowers12': return flowersGeo12().clone();
    default: return null;
  }
}
export function kronePropGlow(it) {
  if (it.kind === 'lamp12') return lampGlowGeo12().clone();
  return null;
}
export function kronePropShape(it) {
  const [x, y, z] = it.pos, s = it.size ?? 1;
  switch (it.kind) {
    case 'pillar12': return { type: 'cyl', x, z, r: 0.6, y0: y, y1: y + (it.size ?? 4), tag: 'saeule' };
    case 'urn12': return { type: 'cyl', x, z, r: 0.45, y0: y, y1: y + 1.3, tag: 'vase' };
    case 'lamp12': return { type: 'cyl', x, z, r: 0.3, y0: y, y1: y + 3.9, tag: 'laterne' };
    case 'banner12': return { type: 'cyl', x, z, r: 0.2, y0: y, y1: y + (it.size ?? 5), tag: 'mast' };
    case 'flowers12': return { type: 'box', min: [x - 0.75, y, z - 0.4], max: [x + 0.75, y + 0.9, z + 0.4], tag: 'kuebel' };
    default: void s; return null;
  }
}
export function kronePropModel() { return null; }

// ------------------------------------------------------------------ Streudeko, ferne Gipfel

export function scatterKrone(level, map, grid) {
  const view = level.view;
  if (view) {
    for (const [i, pk] of (map.peaks ?? []).entries()) {
      const [x, z] = pk.pos;
      const h = pk.h ?? 30, r = pk.r ?? 10;
      const b = new Build(), gl = new Build();
      const g = new THREE.ConeGeometry(r, h, 9, 4);
      const pa = g.attributes.position;
      for (let k = 0; k < pa.count; k++) { const yy = pa.getY(k); const f = 1 + (hash2(pa.getX(k) * 0.7 + i, pa.getZ(k) * 0.7) - 0.5) * 0.3 * (0.5 - yy / h); pa.setX(k, pa.getX(k) * f); pa.setZ(k, pa.getZ(k) * f); }
      g.computeVertexNormals();
      b.add(g, { v: (px, py, pz, nx, ny) => (py > h * (pk.snow ?? 0.18) ? mix(0xfff8e8, 0xffffff, ny * 0.5 + 0.5) : mix(0xb89a7a, 0xe8d0b0, ny * 0.5 + 0.5 + Math.sin(py * 0.9) * 0.08)) }, { p: [0, h / 2 - 3, 0] });
      gl.cone(r * 0.12, h * 0.12, 0xffd040, { p: [0, h - 3 + h * 0.04, 0] }, 6);
      const gg = b.geometry(); gg.translate(x, 0, z);
      view.addStatic(gg, { castShadow: false, tile: 'w12:gipfel' });
      const gs = gl.geometry(); gs.translate(x, 0, z);
      view.addStatic(gs, { material: 'bglow', castShadow: false, tile: GLOW_TILE12 });
    }
  }
  if (view && map.bunting?.length) view.addStatic(buntingGeo(map.bunting), { castShadow: false, tile: 'w12:wimpel' });
  kroneRims(level, map, grid);
}

/** Wimpelketten: map.bunting [[x0, y0, z0, x1, y1, z1], …] – eine durchhängende Schnur mit bunten Dreieckswimpeln, ein Mesh. */
function buntingGeo(list) {
  const b = new Build();
  let n = 0;
  for (const [x0, y0, z0, x1, y1, z1] of list) {
    const len = Math.hypot(x1 - x0, z1 - z0), cnt = Math.max(3, Math.round(len / 0.9)), sag = Math.min(1.4, len * 0.08);
    const yaw = Math.atan2(z1 - z0, x1 - x0);
    const at = (u) => [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u - sag * 4 * u * (1 - u), z0 + (z1 - z0) * u];
    for (let i = 0; i < cnt; i++) {
      const u = (i + 0.5) / cnt, [px, py, pz] = at(u);
      const [ax, ay, az] = at(i / cnt), [bx, by, bz] = at((i + 1) / cnt);
      b.box(Math.hypot(bx - ax, bz - az) + 0.02, 0.03, 0.03, 0xfff0c8, { p: [(ax + bx) / 2, (ay + by) / 2, (az + bz) / 2], r: [0, -yaw, Math.atan2(by - ay, Math.hypot(bx - ax, bz - az))] }, 0);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([-0.28, 0, 0, 0, -0.55, 0, 0.28, 0, 0, -0.28, 0, 0, 0.28, 0, 0, 0, -0.55, 0], 3));
      g.computeVertexNormals();
      b.add(g, CONF[(n++) % CONF.length], { p: [px, py - 0.02, pz], r: [0, -yaw, 0] });
    }
  }
  return b.geometry();
}

// ------------------------------------------------------------------ Inselchen, Nachbarwelten

/** Kleiner goldener Felsen, der aus den Wolken ragt, mit Wimpel. */
export function kroneIsletParts(x, z, w, d, top, rnd) {
  const parts = [];
  const r = Math.min(w, d) * 0.35, h = rnd.real(3, 7);
  const g = new THREE.ConeGeometry(r, h, 7);
  g.translate(x, h / 2 - 1, z);
  parts.push(colorize(g.index ? g.toNonIndexed() : g, (p, n, o) => mixc(lin(0xc8a880), lin(0xffe0a0), smooth(0, h, p.y), o)));
  const b = new Build();
  b.cyl(0.06, 0.06, 2, 0xffc830, { p: [x, h - 1 + 0.6, z] }, 5);
  b.cone(0.3, 0.6, [0xd8283a, 0x3a6ae8, 0x2ec85a][rnd.int(0, 2)], { p: [x + 0.25, h - 1 + 1.3, z], r: [0, 0, -PI / 2] }, 3);
  parts.push(b.geometry());
  void top;
  return parts;
}

/** Nachbarwelt 'kronefern' (von der Welt Blume aus gesehen): goldener Gipfel über einer Wolkenbank, ein Mesh. */
export function kroneNeighborParts(nb, rnd) {
  if (nb.style !== 'kronefern') return [];
  const [x, z] = nb.pos;
  const [w, d] = nb.size ?? [90, 70];
  const y = nb.y ?? 0;
  const B = new Build();
  for (let i = 0; i < 9; i++) B.sphere(rnd.real(10, 18), { v: (qx, qy, qz, nx, ny) => mix(0xe8ecf8, 0xffffff, ny * 0.5 + 0.5) }, { p: [x + rnd.real(-0.5, 0.5) * w, y + rnd.real(-2, 3), z + rnd.real(-0.4, 0.4) * d], s: [1.4, 0.45, 1] }, 10, 6);
  B.cone(w * 0.32, 60, { v: (qx, qy) => (qy > 12 ? 0xffe07a : mix(0xc8a880, 0xe8d0a8, qy / 60 + 0.5)) }, { p: [x, y + 28, z] }, 9);
  for (const [dx, h] of [[-0.3, 38], [0.32, 44]]) B.cone(w * 0.18, h, { v: (qx, qy) => (qy > h * 0.2 ? 0xffd860 : 0xd8b890) }, { p: [x + dx * w, y + h / 2, z + 6] }, 7);
  // Krone auf der Spitze
  B.cyl(7, 6.5, 4, 0xffc830, { p: [x, y + 60, z] }, 10, true);
  for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; B.cone(1.4, 4, 0xffd860, { p: [x + Math.cos(a) * 6.6, y + 64, z + Math.sin(a) * 6.6] }, 5); }
  return [B.geometry()];
}

// ------------------------------------------------------------------ Lebendige Kulisse

const _c = new THREE.Color();
const CONF = [0xff4a5a, 0xffd23a, 0x3ac8ff, 0x5ad84a, 0xff8ac8, 0xb07af0, 0xffffff, 0xff9a2e];
const FLAGC = { rot: 0xd8283a, blau: 0x3a6ae8, gold: 0xffc830, gruen: 0x2ec85a, lila: 0xb05aff, rosa: 0xff8ac8 };

function confettiGeo() { return cached('w12m:confetti', () => { const b = new Build(); b.add(new THREE.PlaneGeometry(0.26, 0.16), 0xffffff, {}); return b.geometry(); }); }
function flagClothGeo() {
  return cached('w12m:flagcloth', () => {
    const g = new THREE.PlaneGeometry(1.4, 0.9, 6, 2);
    g.translate(0.7, 0, 0);
    const pa = g.attributes.position;
    for (let i = 0; i < pa.count; i++) { const x = pa.getX(i); pa.setZ(i, Math.sin(x * 3.2) * 0.12 * x); }
    g.computeVertexNormals();
    const b = new Build();
    b.add(g, { v: (x, y) => (Math.abs(y) < 0.12 ? 0xffffff : 0xdddddd) }, {});
    return b.geometry();
  });
}
function poleGeo() { return cached('w12m:flagpole', () => { const b = new Build(); b.cyl(0.05, 0.07, 1, 0xffc830, { p: [0, 0.5, 0] }, 6); b.sphere(0.1, 0xffe07a, { p: [0, 1.04, 0] }, 6, 4); return b.geometry(); }); }

/**
 * Bewegte Kulisse des Kronen-Gipfels (MapBuilder: out.life; state().decor über liveInfo):
 *   Puls-Material 'bglow'  Goldlaternen, Kronen-Funkeln, Gipfelspitzen – je Zählzeit heller Aufschein (beatPulse)
 *   Konfetti               map.confetti [{ pos, dir }] Konfetti-Kanonen: je Zählzeit schießt die nächste einen Schwall Schnipsel
 *                          (eine Instanz-Fläche, je Kanone 56 Schnipsel), die flatternd herabsegeln
 *   Fahnen                 map.flags [[x, y, z, Masthöhe, Farbe]] – Mast und Tuch als Instanzen, das Tuch weht im Wind und
 *                          schlägt je Zählzeit kräftiger aus
 */
export class KroneLife {
  constructor(level, map) {
    this.view = level.view;
    this.map = map;
    this.own = [];
    this.mat = bonusGlow(this.view);
    this.buildConfetti(map.confetti ?? []);
    this.buildFlags(map.flags ?? []);
    this.bursts = 0;
    this.lastBeat = null;
    this.shown = null;
    this.update(0, 0);
  }

  inst(geo, n, mat, name) {
    const m = new THREE.InstancedMesh(geo, mat, Math.max(1, n));
    m.frustumCulled = false;
    m.name = name;
    m.count = n;
    this.view.add(m);
    this.own.push(m);
    return m;
  }

  buildConfetti(list) {
    this.cannons = list.map((c) => ({ pos: c.pos, dir: c.dir ?? [0, -1] }));
    this.per = 56;
    const n = this.cannons.length * this.per;
    const rnd = new Rnd(0xc0f7);
    this.bits = [];
    for (let i = 0; i < n; i++) this.bits.push({ c: CONF[i % CONF.length], sp: rnd.real(0.7, 1.3), a: rnd.real(-0.6, 0.6), up: rnd.real(7, 12), ph: rnd.real(0, TAU), spin: rnd.real(4, 9) });
    const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, color: 0xffffff, fog: true });
    this.own.push(mat);
    this.conf = this.inst(confettiGeo(), n, mat, 'w12:konfetti');
    this.bits.forEach((b, i) => this.conf.setColorAt(i, _c.set(b.c)));
  }

  buildFlags(list) {
    this.flags = list.map(([x, y, z, h, color], i) => ({ x, y, z, h: h ?? 4, c: FLAGC[color] ?? CONF[i % CONF.length], ph: i * 0.9 }));
    const mat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, vertexColors: true });
    const pmat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.own.push(mat, pmat);
    this.poles = this.inst(poleGeo(), this.flags.length, pmat, 'w12:fahnenmasten');
    this.cloth = this.inst(flagClothGeo(), this.flags.length, mat, 'w12:fahnen');
    this.flags.forEach((f, i) => { setInst(this.poles, i, f.x, f.y, f.z, 0, [1, f.h, 1]); this.cloth.setColorAt(i, _c.set(f.c)); });
    this.poles.instanceMatrix.needsUpdate = true;
  }

  festState(t = this.view.time) {
    const b = BEAT12.at(t);
    const cannon = this.cannons.length ? ((b.whole % this.cannons.length) + this.cannons.length) % this.cannons.length : -1;
    return { beat: +b.beat.toFixed(3), step: ((b.whole % 3) + 3) % 3, k: +b.k.toFixed(4), frac: +b.frac.toFixed(3), whole: b.whole, cannon, source: b.source, theme: b.theme, bpm: b.bpm };
  }

  update(dt, t) {
    const fs = this.festState(t);
    this.info = fs;
    if (this.mat) this.mat.color.setScalar(0.5 + 0.65 * fs.k);
    if (fs.whole !== this.lastBeat) { if (this.lastBeat !== null) this.bursts++; this.lastBeat = fs.whole; }
    const cam = this.view.camera?.position, tg = this.view.rig?.target;
    const far = !!(cam && tg && cam.distanceTo(tg) > 45);
    this.conf.visible = this.cloth.visible = this.poles.visible = !far;
    if (!far) {
      // Konfetti: jede Kanone hält ihren letzten Schwall in der Luft (bis die Reihe wieder an ihr ist)
      const N = this.cannons.length;
      this.cannons.forEach((c, ci) => {
        const age = N ? (((fs.whole - ci) % N) + N) % N + fs.frac : 0;   // Zählzeiten seit dem letzten Schuss dieser Kanone
        const spb = 60 / (fs.bpm || 120);
        const tt = age * spb;
        for (let j = 0; j < this.per; j++) {
          const i = ci * this.per + j, b = this.bits[i];
          const yaw = Math.atan2(c.dir[1], c.dir[0]) + b.a;
          const vx = Math.cos(yaw) * 4.2 * b.sp, vz = Math.sin(yaw) * 4.2 * b.sp;
          const fall = Math.max(0, tt - 0.6);
          const y = c.pos[1] + 1.2 + b.up * Math.min(tt, 0.6) - 4.9 * Math.min(tt, 0.6) ** 2 * 2 - fall * 1.1;
          const drift = Math.min(tt, 1.2);
          setInst(this.conf, i, c.pos[0] + vx * drift + Math.sin(t * 2 + b.ph) * 0.3 * fall, Math.max(c.pos[1] + 0.05, y), c.pos[2] + vz * drift, t * b.spin, 1, t * b.spin * 0.7 + b.ph, b.ph);
        }
      });
      this.conf.instanceMatrix.needsUpdate = true;
      this.flags.forEach((f, i) => {
        const gust = 0.35 + 0.65 * fs.k;
        setInst(this.cloth, i, f.x + 0.05, f.y + f.h - 0.5, f.z, Math.sin(t * 2.3 + f.ph) * 0.35 * gust - 0.3, [1, 1, 1], Math.sin(t * 6 + f.ph) * 0.12 * gust, 0);
      });
      this.cloth.instanceMatrix.needsUpdate = true;
    }
    this.shown = { step: fs.step, k: fs.k, cannon: fs.cannon, scalar: +(0.5 + 0.65 * fs.k).toFixed(4) };
  }

  liveInfo() {
    return {
      fest: { ...this.festState(), shown: this.shown, material: !!this.mat },
      confetti: { cannons: this.cannons.length, n: this.bits.length, bursts: this.bursts, visible: this.conf.visible },
      flags: { n: this.flags.length },
      ...MK12.info(),
    };
  }

  dispose() {
    for (const o of this.own) { if (o.isObject3D) o.parent?.remove(o); o.dispose?.(); }
    this.own.length = 0;
  }
}

// ------------------------------------------------------------------ Anmeldung

registerKit('krone', {
  name: 'krone', tag: 'w12', glowTile: GLOW_TILE12, sea: 'wolken', foam: false,
  ground: kroneGround, segment: buildKroneSegment, scatter: scatterKrone, edgeGeo: kroneEdgeGeo,
  propGeo: kronePropGeo, propGlow: kronePropGlow, propShape: kronePropShape, propModel: kronePropModel,
  Life: KroneLife, isletParts: kroneIsletParts, neighborParts: kroneNeighborParts, mats: bonusGlow,
});
void place; void FRONT; void colorize;
