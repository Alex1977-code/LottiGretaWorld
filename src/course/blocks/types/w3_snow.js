// Welt-3-Bausteine Schnee und Eis (Bauplan 3-1 Schneefeld, Eisbahn): Eisfläche, Iglu, Block-Reihen.
// Interaktive Einzelteile (Schnee-/Eisblock, Eiszapfen, Schneehaufen, Tanne) sind Entitäten (entities/kinds/w3_snow.js,
// auch als segments-type über w3_misc.js); die Kulisse (Tannen, Schneemänner, Felsen …) liefert deco_w3.
//
// eisflaeche – Eisfläche auf einem Sockel: oben die Motor-Eisbahn (blocks/types/w3engine.js `eisbahn`: Kollision mit
//   Flag `ice`, Modell eisflaeche bis 48 m², sonst glatte Platte), darunter ein Körper (Schnee mit Eiskante bzw. Fels,
//   feste Form ohne ice) bis pos.y und optional Schneewulst-Kanten. Oberseite pos.y + h.
//   { type: 'eisflaeche', pos: [x, y, z] (Mitte der Unterseite), size: [w, h, d] ([8, 1, 8]; h ≥ 0,2),
//     body: 'snow' (Standard) | 'rock' | 'none' (dann eine reine eisbahn der Höhe h), edge: true (Schneewulst-Kanten
//     ringsum, nur Optik; false = ohne, 'fein' = Registry-Modell 'eiskante' wie bisher, ≈ 440 Dreiecke/m), under: 0
//     (verjüngter Unterbau, m), model / snow (an die eisbahn weitergereicht) }
//   Präzisierung „Motor-Feinschliff nach Welt 6“: die Kante ist jetzt eine sparsame Nachbildung des Modells (Eis-Lippe,
//     Schneewulst als gewellter Schlauch mit Buckeln im Takt des Modells, ≈ 110 statt ≈ 440 Dreiecke je Meter; ein
//     16 × 40-m-See ≈ 12 k statt ≈ 50 k, mit Schattenpass ≈ 25 k statt ≈ 110 k) und standardmäßig an.
//   Beispiel: { type: 'eisflaeche', pos: [0, 0, -40], size: [10, 1, 16], edge: true }
//   Ohne Sockel und Kanten genügt der Motor-Baustein `eisbahn`.
//
// iglu – Iglu aus Schneeziegeln (Ø size, 1,8 m hoch bei 3,4), Eingang nach +X lokal (yaw). Kuppel begehbar.
//   { type: 'iglu', pos (Fußpunkt Mitte), size: 3.4, yaw: 0, solid: true }
//
// schneebloecke – Reihe/Feld aus Schnee- oder Eisblöcken (Entitäten schneeblock/eisblock, Instanzen).
//   { type: 'schneebloecke', kind: 'schneeblock'|'eisblock', pos: [x, y, z] (Mitte der Unterseite des Feldes),
//     grid: [nx, ny, nz] ([3, 1, 1]), blocks: [[x, y, z], …] (statt grid), content: 'none' (für alle),
//     contents: { 'i,j,k': Inhalt }, hits, id }   level.named.get(id) = { blocks, left() }

import * as THREE from 'three';
import { v3, sz3, islandParts, themeOf, addStatic, hex, lin, mixc, smooth, merge } from '../kit.js';
import { bakeModel } from '../w3kit.js';
import { TYPES as ENGINE } from './w3engine.js';

export function buildEisflaeche(level, spec) {
  const p = v3(spec.pos), s = sz3(spec.size, [8, 1, 8]);
  const h = Math.max(0.2, s.y);
  const x0 = p.x - s.x / 2, x1 = p.x + s.x / 2, z0 = p.z - s.z / 2, z1 = p.z + s.z / 2;
  const plain = spec.body === 'none' || h <= 0.21;
  const plate = plain ? h : 0.2;
  // Eisbahn des Motors (Kollision ice, Optik); darunter fester Sockel ohne ice
  ENGINE.eisbahn(level, { pos: [p.x, p.y + h - plate, p.z], size: [s.x, plate, s.z], model: spec.model, snow: spec.snow });
  if (!plain) level.world.add({ type: 'box', min: [x0, p.y, z0], max: [x1, p.y + h - plate, z1], tag: 'eisflaeche:sockel' });
  if (!level.view) return;
  const th = themeOf(level);
  if (!plain) {
    const rock = spec.body === 'rock';
    const parts = islandParts(x0 + 0.04, p.y, z0 + 0.04, x1 - 0.04, p.y + h - 0.18, z1 - 0.04, th, {
      top: 'grass', under: spec.under ?? 0, rnd: level.rnd, capH: 0.3,
      bodyColor: rock ? th.rock : hex(th.iceBody ?? th.dirt), sideColor: rock ? th.rockDeep : th.grassSide,
    });
    for (const g of parts) addStatic(level, g);
  }
  const edge = spec.edge ?? true;
  if (edge) {
    const y = p.y + h - 0.02;
    const sides = [
      [x0, z1, 0, s.x], [x1, z0, Math.PI, s.x], [x0, z0, -Math.PI / 2, s.z], [x1, z1, Math.PI / 2, s.z],
    ];
    if (edge === 'fein') for (const [x, z, yaw, len] of sides) bakeModel(level, 'eiskante', { length: len }, x, y, z, yaw, 1);
    else {
      const parts = [];
      for (const [x, z, yaw, len] of sides) {
        const g = edgeGeo(len);
        g.rotateY(yaw);
        g.translate(x, y, z);
        parts.push(g);
      }
      addStatic(level, merge(parts));
    }
  }
}

// ------------------------------------------------------------------ sparsame Eiskante (Nachbildung des Modells 'eiskante')

const ICE_LO = lin(0x4aa0dc), ICE_HI = lin(0xbfeaff), SNOW_LO = lin(0xcfe0f4), SNOW_HI = lin(0xffffff), RIM = lin(0xeafaff);
const RING = 8;   // Punkte je Querschnitt des Schneewulsts

/**
 * Kante der Länge L entlang +X (x = 0 … L): Eis-Lippe auf der −Z-Seite (0,5 m breit, 0,22 m hoch), weißer Saum, Schneewulst
 * auf der +Z-Seite als Schlauch mit elliptischem Querschnitt, Buckel alle ≈ 0,38 m (Radien und Versatz wie im Modell).
 * Nicht indiziert, mit Normalen und Vertexfarben (verschmilzt mit dem Welt-Material).
 */
function edgeGeo(L) {
  const pos = [], nor = [], col = [];
  const tri = (a, b, c) => { for (const v of [a, b, c]) { pos.push(v.p[0], v.p[1], v.p[2]); nor.push(v.n[0], v.n[1], v.n[2]); col.push(v.c[0], v.c[1], v.c[2]); } };
  const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d); };
  const V = (p, n, c) => ({ p, n, c });
  // Eis-Lippe (Quader ohne Unterseite) und weißer Saum
  const slab = (x0, x1, y0, y1, z0, z1, top, side) => {
    const P = (x, y, z) => [x, y, z];
    quad(V(P(x0, y1, z1), [0, 1, 0], top), V(P(x1, y1, z1), [0, 1, 0], top), V(P(x1, y1, z0), [0, 1, 0], top), V(P(x0, y1, z0), [0, 1, 0], top));
    quad(V(P(x0, y0, z1), [0, 0, 1], side), V(P(x1, y0, z1), [0, 0, 1], side), V(P(x1, y1, z1), [0, 0, 1], top), V(P(x0, y1, z1), [0, 0, 1], top));
    quad(V(P(x1, y0, z0), [0, 0, -1], side), V(P(x0, y0, z0), [0, 0, -1], side), V(P(x0, y1, z0), [0, 0, -1], top), V(P(x1, y1, z0), [0, 0, -1], top));
    quad(V(P(x0, y0, z0), [-1, 0, 0], side), V(P(x0, y0, z1), [-1, 0, 0], side), V(P(x0, y1, z1), [-1, 0, 0], top), V(P(x0, y1, z0), [-1, 0, 0], top));
    quad(V(P(x1, y0, z1), [1, 0, 0], side), V(P(x1, y0, z0), [1, 0, 0], side), V(P(x1, y1, z0), [1, 0, 0], top), V(P(x1, y1, z1), [1, 0, 0], top));
  };
  const iceSide = [], iceTop = [];
  mixc(ICE_LO, ICE_HI, 0.5, iceSide); mixc(ICE_LO, ICE_HI, 1, iceTop);
  slab(0, L, 0, 0.22, -0.5, 0, iceTop, iceSide);
  slab(0, L, 0.13, 0.27, -0.04, 0, RIM, RIM);
  // Schneewulst: je Buckel (Kugel des Modells: Radius r, Versatz zc) drei Ringe – Tal links, Mitte, Tal rechts – mit den
  // Normalen der Kugel (Kante zwischen zwei Buckeln wie beim Modell); benachbarte Buckel über ihre Täler verbunden
  const k = Math.max(3, Math.round(L / 0.38));
  const step = L / k, hh = step / 2;
  const ringAt = (x, cx, r, zc) => {
    const d = x - cx, rho = Math.sqrt(Math.max(0.02, r * r - d * d));
    const ring = [];
    for (let a = 0; a < RING; a++) {
      const t = (a / RING) * Math.PI * 2;
      const cy = Math.sin(t), cz = Math.cos(t);
      const n = [d / r, (cy * rho) / (r * 0.85), (cz * rho) / r];
      const nl = Math.hypot(n[0], n[1], n[2]);
      n[0] /= nl; n[1] /= nl; n[2] /= nl;
      const c = [];
      mixc(SNOW_LO, SNOW_HI, smooth(0, 1, (n[1] + 0.55) / 1.1), c);
      ring.push(V([x, 0.2 + cy * rho * 0.85, zc + cz * rho], n, c));
    }
    return ring;
  };
  const strip = (A, B) => { for (let a = 0; a < RING; a++) { const b = (a + 1) % RING; quad(A[a], B[a], B[b], A[b]); } };
  const rings = [];
  let prev = null;
  for (let j = 0; j <= k; j++) {
    const cx = j * step, r = 0.28 + ((j * 7) % 3) * 0.04, zc = 0.1 + ((j * 5) % 3) * 0.04;
    const x0 = Math.max(0, cx - hh), x1 = Math.min(L, cx + hh);
    const A = ringAt(x0, cx, r, zc), M = ringAt(cx, cx, r, zc), B = ringAt(x1, cx, r, zc);
    if (prev) strip(prev, A);
    if (x0 < cx) strip(A, M);
    if (x1 > cx) strip(M, B);
    prev = x1 > cx ? B : M;
    if (j === 0) rings.push(x0 < cx ? A : M);
  }
  rings.push(prev);
  // Enden zu (Fächer)
  for (const [ring, sgn] of [[rings[0], -1], [rings[rings.length - 1], 1]]) {
    const cx = ring[0].p[0];
    let cy = 0, cz = 0;
    for (const v of ring) { cy += v.p[1] / RING; cz += v.p[2] / RING; }
    const mid = V([cx, cy, cz], [sgn, 0, 0], SNOW_HI);
    for (let a = 0; a < RING; a++) {
      const b = (a + 1) % RING;
      const va = V(ring[a].p, [sgn, 0, 0], ring[a].c), vb = V(ring[b].p, [sgn, 0, 0], ring[b].c);
      if (sgn > 0) tri(mid, vb, va); else tri(mid, va, vb);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

export function buildIglu(level, spec) {
  const p = v3(spec.pos);
  const D = spec.size ?? 3.4, k = D / 3.4, yaw = spec.yaw ?? 0;
  bakeModel(level, 'iglu', { size: D }, p.x, p.y, p.z, yaw, 1);
  if (spec.solid !== false) {
    for (const [y0, y1, r] of [[0, 0.6, 1.62], [0.6, 1.2, 1.4], [1.2, 1.78, 0.92]]) {
      level.world.add({ type: 'cyl', x: p.x, z: p.z, r: r * k, y0: p.y + y0 * k, y1: p.y + y1 * k, tag: 'iglu' });
    }
  }
}

export function buildSchneebloecke(level, spec) {
  const kind = spec.kind === 'eisblock' ? 'eisblock' : 'schneeblock';
  const p = v3(spec.pos);
  const out = [];
  const contents = spec.contents ?? {};
  const make = (x, y, z, keys) => {
    let c = spec.content;
    for (const k of keys) if (contents[k] !== undefined) { c = contents[k]; break; }
    const e = level.spawn(kind, { pos: [x, y, z], content: c, hits: spec.hits, hidden: spec.hidden });
    if (e) out.push(e);
  };
  if (spec.blocks) spec.blocks.forEach((b, i) => make(b[0], b[1], b[2], [String(i)]));
  else {
    const [nx, ny, nz] = [spec.grid?.[0] ?? 3, spec.grid?.[1] ?? 1, spec.grid?.[2] ?? 1];
    const g = spec.gap ?? 0;
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) {
      const keys = [`${i},${j},${k}`];
      if (k === 0) keys.push(`${i},${j}`);
      if (k === 0 && j === 0) keys.push(`${i}`);
      make(p.x + (i - (nx - 1) / 2) * (1 + g), p.y + j * (1 + g), p.z + (k - (nz - 1) / 2) * (1 + g), keys);
    }
  }
  const h = { blocks: out, left: () => out.filter((e) => !e.removed && !e.broken).length };
  if (spec.id) level.named.set(spec.id, h);
  return h;
}

export const TYPES = { eisflaeche: buildEisflaeche, iglu: buildIglu, schneebloecke: buildSchneebloecke };
