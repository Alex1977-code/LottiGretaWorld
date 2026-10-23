// Gelände, Ränder, Streudeko und Requisiten der Welt-3-Insel „Schnee und Eis“ (eigene Gestaltung, Spielzeug-Look wie
// Welt 1/2): dicke Schneedecken mit runder Kante und Schneewülsten, gefrorene Erde in Blaugrau, Eisfelsen mit Eiszapfen,
// verschneite Hügel, Tannenwald, zugefrorener See (rutschiges Eis), Schneestrand, Pastell-Garten, Herbstwald,
// gepflasterter Bahnsteig; Ränder aus Schneewällen bzw. Holzzäunen mit Schneehauben. Dazu Requisiten: Laternen, Hütten,
// Schlitten, Ski, Schneeballhaufen, Eiskristalle, Eisblöcke, kahle Spukbäume, Herbstbäume, Laubhaufen, Gleise,
// Rettungsring, Wegweiser, Lagerfeuer, Wimpelketten, Schneehauben für Dächer, Eisschollen.
// Thema 'map_snow' (kaltes, klares Licht, schneebedeckte Berge am Horizont) meldet sich hier in THEMES an.
//
// Alle Geometrien in Weltkoordinaten bzw. mit Fußpunkt im Ursprung (Vorderseite +Z, zur Kamera) und Vertexfarben
// (position/normal/color) für view.addStatic (Karten-Kacheln, MapBatcher). Massenware (Tannen im Wald) nutzt die
// sparsame Tannen-Geometrie des Modells 'tanne_schnee' (lib/schnee_w3.js, gleiche Optik wie in den Leveln).

import * as THREE from 'three';
import { mix, TAU } from '../models/lib/kit.js';
import { roundedBox, SIDE, colorize, lin, mixc, smooth, merge, Rnd } from '../../three/world/geometry.js';
import { alignedGrid, islandParts } from '../blocks/kit.js';
import { THEMES } from '../view/themes.js';
import { hillRing } from '../view/backdrop_w2.js';
import { tanneGeo, eiszapfenGeo } from '../models/lib/schnee_w3.js';
import { LowBuild as Build, place } from './desert.js';
import { buildBridge } from '../blocks/types/bridge.js';

export const SNOW_STYLES = new Set(['snow', 'snowhill', 'forest', 'cliff', 'ice', 'lakebed', 'snowbeach', 'pastel', 'autumn', 'peak', 'paving', 'spook', 'asphalt']);

// ------------------------------------------------------------------ Thema der Schneeinsel

if (!THEMES.map_snow) {
  THEMES.map_snow = {
    ...THEMES.grass,
    label: 'Weltkarte Schnee',
    sky: [[1, 0x2f6fc4], [0.45, 0x5a9be0], [0.15, 0x9cccf2], [0.04, 0xdcecf8], [0, 0xeef5fb], [-0.1, 0xd6e4f0], [-1, 0xb2c6da]],
    background: 0xe2eef8,
    fog: { color: 0xdde9f5, near: 85, far: 310 },
    hemi: { sky: 0xdcecff, ground: 0x8aa0bc, intensity: 1.25 },
    sun: { color: 0xfff2dc, intensity: 2.35, dir: [-0.45, 1, 0.5] },
    ground: null,
    clouds: false,
    backdrop: 'snowpeaks',
    grassTop: 0xeef4fa, grassTop2: 0xe4ecf6, grassRim: 0xffffff, grassSide: 0xc8d8ec,
    dirt: 0x8a94aa, dirtDeep: 0x5e6880, rock: 0x7d8ba4, rockDeep: 0x56627c,
    stone: 0xe6ecf4, stoneDark: 0xb4c0d2,
    wood: 0xf4f0ea, woodDark: 0xc4bcb0,
    water: 0x58c8ec, waterDeep: 0x1e6ab8,
    // ferne schneebedeckte Berge ringsum (ein Mesh)
    buildBackdrop(sky, bounds, rnd, yBase) {
      hillRing(sky, bounds, rnd, yBase, { near: [0xf2f6fb, 0x9fb2cc], far: [0xeef3f9, 0xadc0d8], peaks: [0x8ea6c8, 0xffffff] });
    },
  };
}

// ------------------------------------------------------------------ Farben

export const SNOW = { top: 0xf0f5fa, top2: 0xdfe8f3, rim: 0xffffff, side: 0xcbd9ec, shade: 0xb6c8e0, drift: 0xcfdcee };
// Spukhügel: Schnee im violetten Dämmerlicht
const SPOOK = { top: 0xe2dcef, top2: 0xcfc6e2, rim: 0xf2eefa, side: 0xb4a8cc, shade: 0x9a8cb8, drift: 0xbcb0d6 };
const EARTH = [0x8c97ae, 0x7a849d, 0x98a3b9, 0x6f7891];          // gefrorene Erde (Schichten)
const CLIFF = [0x7a8ba6, 0x67779a, 0x8d9eb8, 0x5b6a88, 0x9db0c8];   // Eisfels (Blaugrau mit hellen Bändern)
const ICE = { top: 0xb6e2f6, top2: 0x9fd6f2, crack: 0xeef9ff, side: 0x4c9ad0, side2: 0x8ccdee };
const PASTEL = { grassTop: 0xffc6e2, grassTop2: 0xffb6da, grassRim: 0xffe2f0, grassSide: 0xe88cbe, dirt: 0xf0dcc2, dirtDeep: 0xcfb08e, checker: false };
const AUTUMN = { grassTop: 0xe9a446, grassTop2: 0xdc923a, grassRim: 0xf8cc7a, grassSide: 0xbe6e2c, dirt: 0x9a6a46, dirtDeep: 0x6a4630, checker: false };
export const MINT_HEDGE = [0x2f9a6c, 0x5cc994, 0xa6efc8];
export const AUTUMN_HEDGE = [0xa8461c, 0xe0702a, 0xffb24e];

const ICICLE = (h) => ({ v: (x, y) => mix(0x6cc4ee, 0xeafaff, (y + h / 2) / h) });

// ------------------------------------------------------------------ Geländestile

/**
 * Gelände-Block der Schneeinsel (Box x0..x1 × z0..z1 von base bis top). style:
 *   'snow'      Schneedecke mit runder Kante und Schneewülsten vorn, gefrorene Erde darunter (begehbar: 2-m-Raster)
 *   'snowhill'  wie 'snow', obenauf ein weicher Schneehügel (nur Optik)         'forest'  Tannenwald (Streudeko)
 *   'cliff'     Eisfels: blaugraue Schichten, Schneekappe mit Brocken, Eiszapfen an der Vorderkante
 *   'peak'      Schneeberg (hoher Hügel mit Felsnasen)                          'ice'     zugefrorener See (rutschig)
 *   'lakebed'   Seegrund unter dem Meeresspiegel (das Meer darüber ist der See)  'snowbeach' Kiesstrand mit Schnee
 *   'pastel'    rosa Pastell-Garten   'autumn'  Herbstwiese   'paving'  Pflaster mit Schneerand (Bahnsteig)
 * b.drips = false unterdrückt die Schneewülste vorn, b.icicles = false die Eiszapfen. Liefert Teil-Geometrien
 * ({ g, material? }-frei: reine Geometrien; Eisflächen mit .userData.material = 'stone').
 */
export function snowGround(b, base, theme, rnd) {
  const [x0, z0, x1, z1] = b.rect;
  const top = b.top;
  const style = b.style ?? 'snow';
  const parts = [];
  if (style === 'pastel' || style === 'autumn') {
    const ps = islandParts(x0, base, z0, x1, top, z1, { ...theme, ...(style === 'pastel' ? PASTEL : AUTUMN) }, { under: 0, rnd, top: 'grass', cell: 2 });
    flat(ps[ps.length - 1]);   // Raster obenauf: kein Schattenwurf
    return ps;
  }
  if (style === 'lakebed') {
    strata(parts, x0, base, z0, x1, top, z1, [0x3c5a7a, 0x34506e, 0x44648a], rnd, 0.9, 0.05);
    return parts;
  }
  if (style === 'snowbeach') {
    strata(parts, x0, base, z0, x1, top - 0.2, z1, EARTH, rnd, 0.9, 0.06);
    const cap = roundedBox(x1 - x0 + 0.1, 0.2, z1 - z0 + 0.1, 0.08, SIDE.ALL & ~SIDE.NY, 0, 1);
    colorize(cap, (p, n, o) => mixc(lin(0xa8a49a), lin(0xd2ccc0), smooth(0, 0.9, n.y), o));
    cap.translate((x0 + x1) / 2, top - 0.1, (z0 + z1) / 2);
    parts.push(cap);
    const a = lin(0xc8c2b4), c = lin(0xb4ae9e), s = lin(0xf2f6fb);
    parts.push(flat(alignedGrid(x0 + 0.05, z0 + 0.05, x1 - 0.05, z1 - 0.05, top + 0.004, 1, () => (rnd.frac() < 0.32 ? s.slice() : mixc(a, c, rnd.frac(), [0, 0, 0])))));
    return parts;
  }
  if (style === 'ice') {
    // Eisplatte: dunkles Wassereis unten, glänzende hellblaue Fläche mit Rissen und Kufen-Spuren (Material 'stone')
    strata(parts, x0, base, z0, x1, top - 0.3, z1, [0x2e5f8e, 0x346a9c, 0x2a5684], rnd, 1.2, 0.02);
    const slab = roundedBox(x1 - x0, 0.3, z1 - z0, 0.08, SIDE.ALL & ~SIDE.NY, 0, 1);
    colorize(slab, (p, n, o) => mixc(lin(ICE.side), lin(ICE.side2), smooth(-0.8, 0.9, n.y), o));
    slab.translate((x0 + x1) / 2, top - 0.15, (z0 + z1) / 2);
    slab.userData.material = 'stone';
    parts.push(slab);
    const t1 = lin(ICE.top), t2 = lin(ICE.top2), dk = lin(0x7cc2ea);
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const surf = smoothTop(x0 + 0.1, z0 + 0.1, x1 - 0.1, z1 - 0.1, top + 0.004, 2, (x, z) => {
      const n = 0.5 + 0.3 * Math.sin(x * 0.35 + z * 0.22) + 0.2 * Math.sin(z * 0.5 - x * 0.3);
      const o = mixc(t2, t1, Math.min(1, Math.max(0, n)), [0, 0, 0]);
      if (n < 0.25) mixc(o, dk, 0.4, o);
      return o;
    });
    surf.userData.material = 'stone';
    parts.push(surf);
    // Kufen-Spuren (weiße Bögen) und Schneehäufchen am Rand
    const tr = new Build();
    const rx = (x1 - x0) * 0.32, rz = (z1 - z0) * 0.28;
    for (const [k, a0, a1] of [[1, 0.2, 2.6], [0.66, 3.4, 5.9], [0.85, 4.2, 6.0], [0.45, 0.6, 3.0]]) {
      const pts = [];
      for (let i = 0; i <= 14; i++) { const a = a0 + (a1 - a0) * (i / 14); pts.push([cx + Math.cos(a) * rx * k, top + 0.02, cz + Math.sin(a) * rz * k]); }
      tr.tube(pts, 0.035, 0xf4fbff, null, 20, 3);
    }
    const tg = tr.geometry();
    tg.userData.material = 'stone';
    parts.push(tg);
    return parts;
  }
  if (style === 'asphalt') {
    strata(parts, x0, base, z0, x1, top - 0.3, z1, EARTH, rnd, 1.3, 0.06);
    const cap = roundedBox(x1 - x0 + 0.1, 0.3, z1 - z0 + 0.1, 0.1, SIDE.ALL & ~SIDE.NY, 0, 1);
    colorize(cap, (p, n, o) => mixc(lin(0x3a3e4a), lin(0x6a6e7a), smooth(0, 0.9, n.y), o));
    cap.translate((x0 + x1) / 2, top - 0.15, (z0 + z1) / 2);
    parts.push(cap);
    const a = lin(0x575d6c), c = lin(0x646a79), sn = lin(0xe8eef6);
    parts.push(smoothTop(x0 + 0.06, z0 + 0.06, x1 - 0.06, z1 - 0.06, top + 0.004, 2, (x, z) => {
      const e = Math.min(x - x0, x1 - x, z - z0, z1 - z);
      if (e < 1.2 && hash2(Math.round(x), Math.round(z)) > 0.35) return sn.slice();
      return mixc(a, c, 0.5 + 0.5 * Math.sin(x * 0.7 + z * 0.4), [0, 0, 0]);
    }));
    // Startraster: weiße Startfelder in zwei Reihen
    const g = new Build();
    for (const [sx, sz] of b.grid ?? []) {
      g.box(1.8, 0.03, 0.12, 0xf6f6f0, { p: [sx, top + 0.02, sz] }, 0, 1);
      for (const s2 of [-1, 1]) g.box(0.12, 0.03, 1.2, 0xf6f6f0, { p: [sx + s2 * 0.9, top + 0.02, sz - 0.6] }, 0, 1);
    }
    // Startlinie: Schachbrettband (zwei Reihen) quer über die Fahrbahn
    if (b.startLine) {
      const [lx0, lx1, lz] = b.startLine, q = 0.5, nq = Math.round((lx1 - lx0) / q);
      for (let i = 0; i < nq; i++) {
        for (let r = 0; r < 2; r++) g.box(q, 0.03, q, (i + r) % 2 ? 0x22242c : 0xf6f6f0, { p: [lx0 + (i + 0.5) * q, top + 0.02, lz + (r - 0.5) * q] }, 0, 1);
      }
    }
    if (g.parts.length) parts.push(flat(g.geometry()));
    return parts;
  }
  if (style === 'paving') {
    strata(parts, x0, base, z0, x1, top - 0.3, z1, EARTH, rnd, 0.9, 0.06);
    const cap = roundedBox(x1 - x0 + 0.1, 0.3, z1 - z0 + 0.1, 0.1, SIDE.ALL & ~SIDE.NY, 0, 1);
    colorize(cap, (p, n, o) => mixc(lin(0x8e96a8), lin(0xc4cad6), smooth(0, 0.9, n.y), o));
    cap.translate((x0 + x1) / 2, top - 0.15, (z0 + z1) / 2);
    parts.push(cap);
    const a = lin(0xb8c0ce), c = lin(0xa4adbe), s = lin(0xeef3f9);
    parts.push(flat(alignedGrid(x0 + 0.06, z0 + 0.06, x1 - 0.06, z1 - 0.06, top + 0.004, 1, (i, j, ax, az) => {
      const edge = ax < x0 + 0.6 || ax > x1 - 1.6 || az < z0 + 0.6 || az > z1 - 1.6;
      if (edge && rnd.frac() < 0.55) return s.slice();
      return ((Math.floor(ax + 100) + Math.floor(az + 100)) & 1) ? a.slice() : c.slice();
    })));
    return parts;
  }
  // Fels/Erde unter der Schneedecke (Spukhügel: violetter Schnee)
  const capH = style === 'cliff' ? 0.45 : 0.5;
  strata(parts, x0, base, z0, x1, top - capH, z1, style === 'cliff' || style === 'peak' ? CLIFF : EARTH, rnd, style === 'cliff' ? 1.15 : 1.3, style === 'cliff' ? 0.2 : 0.07);
  snowCap(parts, x0, top - capH, z0, x1, top, z1, rnd, b);
  if (style === 'snowhill') parts.push(snowMound(x0, top, z0, x1, z1, b.mound ?? Math.min(3.2, Math.min(x1 - x0, z1 - z0) * 0.22), rnd));
  if (style === 'peak') parts.push(...peakParts(x0, top, z0, x1, z1, b.mound ?? Math.min(14, Math.min(x1 - x0, z1 - z0) * 0.55), rnd));
  if (style === 'cliff') {
    // Brocken auf der Kappe
    const n = Math.max(1, Math.round(((x1 - x0) * (z1 - z0)) / 90));
    for (let i = 0; i < n; i++) parts.push(place(snowRockGeo(rnd.real(0.7, 1.4), rnd.int(1, 999), 2), rnd.real(x0 + 1.2, x1 - 1.2), top, rnd.real(z0 + 1.2, z1 - 1.2), rnd.real(0, 6)));
  }
  // Eiszapfen unter der Schneekante vorn (zur Kamera) – an Felsen und hohen Blöcken
  if (b.icicles !== false && (style === 'cliff' || (b.icicles && top - base > 2))) {
    const row = icicleRow(x0, x1, z1 + 0.12, top - capH + 0.02, rnd, b.icicleLen ?? 1);
    if (row) parts.push(row);
  }
  return parts;
}

/** Versetzte Schichten (Quader je Schicht, abwechselnde Farben, leicht ein-/ausgerückt). */
function strata(parts, x0, y0, z0, x1, y1, z1, colors, rnd, layer, jitter) {
  const h = y1 - y0;
  if (h <= 0.02) return;
  const n = Math.max(1, Math.round(h / layer));
  const lh = h / n;
  for (let i = 0; i < n; i++) {
    const inset = (i % 2 ? jitter : 0) + rnd.real(0, jitter * 0.5);
    const c = lin(colors[(i * 2 + Math.floor(rnd.frac() * 2)) % colors.length]);
    const dark = mixc(c, [0, 0, 0], 0.2, [0, 0, 0]);
    const w = Math.max(0.2, x1 - x0 - inset * 2), d = Math.max(0.2, z1 - z0 - inset * 2);
    const g = colorize(new THREE.BoxGeometry(w, lh, d), (p, nn, o) => {
      if (nn.y < -0.5) { o[0] = dark[0] * 0.8; o[1] = dark[1] * 0.8; o[2] = dark[2] * 0.8; return; }
      const k = Math.abs(nn.x) > 0.5 ? 0.9 : 1;
      o[0] = c[0] * k; o[1] = c[1] * k; o[2] = c[2] * k;
    });
    g.translate((x0 + x1) / 2, y0 + lh * (i + 0.5), (z0 + z1) / 2);
    parts.push(g);
  }
}

/** Dicke Schneedecke (Kissen mit runder Oberkante und Überhang), 2-m-Raster obenauf, Schneewülste vorn. */
function snowCap(parts, x0, y0, z0, x1, y1, z1, rnd, b) {
  const capH = y1 - y0, w = x1 - x0, d = z1 - z0, lip = 0.14;
  const pal = b.style === 'spook' ? SPOOK : SNOW;
  const side = lin(pal.side), rim = lin(pal.rim), shade = lin(pal.shade);
  const r = Math.min(0.24, capH * 0.48);
  const g = roundedBox(w + lip * 2, capH, d + lip * 2, r, SIDE.ALL & ~SIDE.NY, 0, b.walk ? 2 : 1);
  colorize(g, (p, n, o) => {
    mixc(side, rim, smooth(0.05, 0.9, n.y), o);
    if (n.y < 0.2 && p.y < -capH * 0.2) mixc(o, shade, 0.35, o);
  });
  g.translate((x0 + x1) / 2, y0 + capH / 2, (z0 + z1) / 2);
  parts.push(g);
  const ins = r + lip * 0.5;
  const gx0 = x0 - lip + ins, gx1 = x1 + lip - ins, gz0 = z0 - lip + ins, gz1 = z1 + lip - ins;
  if (gx1 > gx0 && gz1 > gz0) parts.push(smoothTop(gx0, gz0, gx1, gz1, y1 + 0.004, b.walk ? 2 : 4, snowColor(pal)));
  // Schneewülste an der Vorderkante (+Z) und – bei hohen Blöcken – an den Seiten
  if (b.drips !== false && w >= 2) {
    const bb = new Build();
    const n = Math.max(1, Math.round(w / 2.2));
    for (let i = 0; i < n; i++) {
      const x = x0 + (i + 0.5) * (w / n) + rnd.real(-0.3, 0.3);
      const s = rnd.real(0.3, 0.46);
      bb.sphere(s, { v: (px, py, pz, nx, ny) => mix(pal.side, pal.rim, ny * 0.5 + 0.5) }, { p: [x, y0 + capH * 0.25, z1 + lip * 0.55], s: [1.4, 1.0 + rnd.real(0, 0.5), 0.7] }, 6, 3);
    }
    parts.push(flat(bb.geometry()));
  }
}

/** Schneedecke als Raster mit weichen Farbverläufen je Ecke (keine Kacheln): sanfte Wellen, bläuliche Mulden, Glitzer. */
function smoothTop(x0, z0, x1, z1, y, cell, colorAt) {
  const xs = [x0]; for (let x = Math.floor(x0 / cell + 1) * cell; x < x1 - 1e-4; x += cell) xs.push(x); xs.push(x1);
  const zs = [z0]; for (let z = Math.floor(z0 / cell + 1) * cell; z < z1 - 1e-4; z += cell) zs.push(z); zs.push(z1);
  const pos = [], nor = [], col = [];
  const cache = new Map();
  const C = (x, z) => { const k = `${x.toFixed(2)},${z.toFixed(2)}`; let c = cache.get(k); if (!c) { c = colorAt(x, z); cache.set(k, c); } return c; };
  for (let j = 0; j < zs.length - 1; j++) {
    for (let i = 0; i < xs.length - 1; i++) {
      const ax = xs[i], bx = xs[i + 1], az = zs[j], bz = zs[j + 1];
      for (const [x, z] of [[ax, az], [ax, bz], [bx, bz], [ax, az], [bx, bz], [bx, az]]) {
        pos.push(x, y, z); nor.push(0, 1, 0);
        const c = C(x, z); col.push(c[0], c[1], c[2]);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return flat(g);
}
/** Flache Deckschicht: wirft keinen Sonnenschatten (spart Dreiecke im Schattenpass), MapBuilder liest userData. */
function flat(g) { if (g) g.userData.noShadow = true; return g; }
const hash2 = (x, z) => { const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return h - Math.floor(h); };
/** Farbe der Schneedecke an (x, z): zwei überlagerte Wellen, selten ein Glitzerpunkt. */
function snowColor(pal) {
  const a = lin(pal.top), b = lin(pal.top2), sp = lin(0xffffff), dip = lin(pal.drift);
  return (x, z) => {
    const n = 0.5 + 0.28 * Math.sin(x * 0.31 + z * 0.17) + 0.22 * Math.sin(z * 0.43 - x * 0.21 + 1.3);
    const o = mixc(b, a, Math.min(1, Math.max(0, n)), [0, 0, 0]);
    if (n < 0.22) mixc(o, dip, 0.5, o);
    if (hash2(Math.round(x * 2), Math.round(z * 2)) > 0.94) mixc(o, sp, 0.7, o);
    return o;
  };
}

/** Weicher Schneehügel (Halbellipsoid) mit bläulichen Schatten-Mulden. */
function snowMound(x0, y, z0, x1, z1, h, rnd) {
  const w = x1 - x0, d = z1 - z0;
  const g = new THREE.SphereGeometry(1, 16, 6, 0, TAU, 0, Math.PI / 2);
  g.scale(w * 0.47, h, d * 0.47);
  const ph = rnd.real(0, 6);
  const lo = lin(0xc4d4ea), hi = lin(0xf6f9fd), rip = lin(0xd6e2f2);
  const out = colorize(g, (p, n, o) => {
    mixc(lo, hi, smooth(-0.1, 0.85, n.y), o);
    if (Math.sin(p.x * 0.9 + p.z * 0.5 + ph) > 0.9 && n.y < 0.95) mixc(o, rip, 0.5, o);
  });
  out.translate((x0 + x1) / 2, y - 0.05, (z0 + z1) / 2);
  return out;
}

/** Schneeberg: hoher Hügel, oben weiß, an den steilen Flanken Fels; Felsnasen mit Schneekappen. */
function peakParts(x0, y, z0, x1, z1, h, rnd) {
  const out = [];
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const g = new THREE.SphereGeometry(1, 20, 10, 0, TAU, 0, Math.PI / 2);
  // Gipfel leicht spitz zulaufend
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const yy = P.getY(i), k = 1 - Math.pow(yy, 1.6) * 0.45;
    P.setX(i, P.getX(i) * k); P.setZ(i, P.getZ(i) * k);
  }
  g.computeVertexNormals();
  g.scale(w * 0.48, h, d * 0.48);
  const rock = lin(0x7486a2), rock2 = lin(0x9aaac2), snow = lin(0xf4f8fc), shade = lin(0xc8d6ea);
  out.push(colorize(g, (p, n, o) => {
    const hh = p.y / h;
    if (n.y > 0.55 || hh > 0.62) mixc(shade, snow, smooth(0.4, 0.95, n.y), o);
    else mixc(rock, rock2, 0.5 + 0.5 * Math.sin(p.y * 1.3 + p.x * 0.2), o);
  }));
  out[0].translate(cx, y - 0.1, cz);
  for (let i = 0; i < 6; i++) {
    const a = rnd.real(0, TAU), k = rnd.real(0.55, 0.85);
    const px = cx + Math.cos(a) * w * 0.4 * k, pz = cz + Math.sin(a) * d * 0.4 * k;
    const ph = h * Math.sqrt(Math.max(0, 1 - k * k * 0.75)) * 0.75;
    out.push(place(snowRockGeo(rnd.real(1.2, 2.2), rnd.int(1, 999)), px, y + ph * 0.6, pz, rnd.real(0, 6)));
  }
  return out;
}

/** Reihe Eiszapfen (entlang x0..x1 an z, Aufhängung bei y). */
function icicleRow(x0, x1, z, y, rnd, len = 1) {
  const b = new Build();
  for (let x = x0 + rnd.real(0.3, 0.9); x < x1 - 0.3; x += rnd.real(0.6, 1.5)) {
    const h = len * rnd.real(0.35, 1.15), r = 0.07 + h * 0.06;
    b.add(new THREE.ConeGeometry(r, h, 5), ICICLE(h), { p: [x, y - h / 2, z], r: [Math.PI, 0, 0] });
  }
  return b.parts.length ? b.geometry() : null;
}

// ------------------------------------------------------------------ Ränder (statt Hecke/Zaun)

/** Schneewall entlang +X (Länge len, Mitte im Ursprung) – sichtbare Grenze zu gleich hohem Gelände. */
export function snowBankGeo(len, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  b.add(roundedBox(len, 0.62, 0.95, 0.26, SIDE.ALL, SIDE.NY, 1), { v: (x, y, z, nx, ny) => mix(SNOW.shade, SNOW.rim, ny * 0.45 + 0.5 + y * 0.4) }, { p: [0, 0.31, 0] });
  const n = Math.max(1, Math.round(len / 3.3));
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i + 0.5) * (len / n) + rnd.real(-0.3, 0.3);
    b.sphere(0.5 + rnd.real(0, 0.1), { v: (px, py, pz, nx, ny) => mix(SNOW.side, SNOW.rim, Math.max(0, ny) * 0.8 + 0.2) }, { p: [x, 0.55, rnd.real(-0.06, 0.06)], s: [2.0, 0.6, 1.0] }, 6, 3);
  }
  return b.geometry();
}

/** Holzzaun mit Schneehauben entlang +X – Rand an einem Abbruch. */
export function snowFenceGeo(len) {
  const b = new Build();
  const n = Math.max(2, Math.round(len / 2.1) + 1);
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i / (n - 1)) * len;
    b.box(0.14, 0.82, 0.14, 0x8a5a36, { p: [x, 0.41, 0] }, 0, 1);
    b.sphere(0.12, 0xffffff, { p: [x, 0.86, 0], s: [1.2, 0.7, 1.2] }, 5, 2);
  }
  for (const y of [0.32, 0.64]) {
    b.box(len, 0.1, 0.07, 0xa06a40, { p: [0, y, -0.08] }, 0, 1);
    b.box(len, 0.05, 0.1, 0xf6f9fd, { p: [0, y + 0.07, -0.08] }, 0, 1);
  }
  return b.geometry();
}

/** Leichte Hecke (Pastell-Garten, Herbstwald): Kasten mit flachen Buckeln und Schneehäubchen, ≈ 25 Dreiecke je Meter. */
export function lightHedgeGeo(len, palette, seed = 1) {
  const [dark, mid, light] = palette;
  const b = new Build();
  const rnd = new Rnd(seed);
  b.add(roundedBox(len, 0.84, 0.9, 0.2, SIDE.ALL, SIDE.NY, 1), { v: (x, y) => mix(dark, mid, (y + 0.42) / 0.84) }, { p: [0, 0.42, 0] });
  const n = Math.max(1, Math.round(len / 1.4));
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i + 0.5) * (len / n) + rnd.real(-0.15, 0.15);
    b.sphere(0.42 + rnd.real(0, 0.08), { v: (px, py, pz, nx, ny) => mix(mid, light, Math.max(0, ny)) }, { p: [x, 0.84, rnd.real(-0.06, 0.06)], s: [1.7, 0.75, 1.05] }, 7, 3);
    if (i % 2 === 0) b.sphere(0.3, { v: (px, py, pz, nx, ny) => mix(SNOW.side, SNOW.rim, Math.max(0, ny)) }, { p: [x + rnd.real(-0.2, 0.2), 1.1, 0], s: [1.5, 0.42, 1.2] }, 6, 2);
  }
  return b.geometry();
}

/** Randdeko nach Art (borderDeco in MapBuilder): hedge 'snow'|'mint'|'autumn', fence 'snowfence'. null = unbekannt. */
export function snowEdgeGeo(kind, len, seed) {
  switch (kind) {
    case 'snow': return snowBankGeo(len + 0.2, seed);
    case 'mint': return lightHedgeGeo(len + 0.2, MINT_HEDGE, seed);
    case 'autumn': return lightHedgeGeo(len + 0.2, AUTUMN_HEDGE, seed);
    case 'snowfence': return snowFenceGeo(len);
    default: return null;
  }
}

// ------------------------------------------------------------------ Pflanzen

/** Verschneite Tanne in Kartenqualität (Geometrie des Modells 'tanne_schnee', sparsam), Höhe h. */
export function firGeo(h = 3.5) {
  const g = tanneGeo(true).clone();
  const k = h / 3.5;
  g.scale(k, k, k);
  return g;
}

/** Sehr sparsame verschneite Tanne für den Wald (drei Nadelstufen mit Schneehauben, ≈ 140 Dreiecke), Höhe h. */
export function firLiteGeo(h = 4, seed = 1) {
  const b = new Build();
  const k = h / 3.5;
  const dark = seed % 3 === 0 ? 0x1a5e3c : 0x14583a, light = seed % 3 === 0 ? 0x3a9a52 : 0x2f8a4a;
  b.cyl(0.15 * k, 0.2 * k, 0.7 * k, 0x7a4a26, { p: [0, 0.35 * k, 0] }, 5, true);
  for (const [r, hh, y] of [[1.3, 1.45, 0.55], [0.98, 1.25, 1.35], [0.62, 1.05, 2.15]]) {
    b.cone(r * k, hh * k, { v: (x, yy, z, nx, ny) => mix(dark, light, (yy / (hh * k)) + 0.5) }, { p: [0, (y + hh / 2) * k, 0] }, 7);
    b.cone(r * 0.8 * k, hh * 0.6 * k, { v: (x, yy, z, nx, ny) => mix(0xdfeafa, 0xffffff, Math.max(0, ny)) }, { p: [0, (y + hh * 0.72) * k, 0] }, 7);
  }
  return b.geometry();
}

/** Große Dorftanne (volle Modell-Geometrie, Höhe h); Kugeln und Stern leuchten separat (bigFirGlowGeo). */
export function bigFirGeo(h = 7) {
  const g = tanneGeo(false).clone();
  const k = h / 3.5;
  g.scale(k, k, k);
  return g;
}
export function bigFirGlowGeo(h = 7, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const k = h / 3.5;
  const tiers = [[1.3, 0.55], [1.05, 1.25], [0.8, 1.9], [0.52, 2.5]];
  const cols = [0xff3a4a, 0xffd23a, 0x3ab0ff, 0xff8ad8, 0xffffff];
  tiers.forEach(([r, y], i) => {
    const n = 7 - i;
    for (let j = 0; j < n; j++) {
      const a = (j / n) * TAU + i * 0.7 + rnd.real(-0.2, 0.2);
      b.sphere(0.09 * k * 0.55, cols[(i + j) % cols.length], { p: [Math.cos(a) * r * 0.86 * k, (y + 0.15) * k, Math.sin(a) * r * 0.86 * k] }, 6, 4);
    }
  });
  b.extrude(starShapeLocal(0.42 * k * 0.5, 0.18 * k * 0.5), 0.1, 0xffe14a, { p: [0, 3.62 * k, 0] }, 0, 1);
  return b.geometry();
}
function starShapeLocal(R, r) {
  const sh = new THREE.Shape();
  for (let i = 0; i <= 10; i++) { const a = Math.PI / 2 + (i / 10) * TAU, q = i % 2 ? r : R; if (!i) sh.moveTo(Math.cos(a) * q, Math.sin(a) * q); else sh.lineTo(Math.cos(a) * q, Math.sin(a) * q); }
  return sh;
}

/** Lagerfeuer-Flammen (Material 'glow', statisch). */
export function campfireGlowGeo() {
  const b = new Build();
  b.cone(0.34, 0.9, 0xff8a1a, { p: [0, 0.6, 0] }, 7);
  b.cone(0.22, 0.7, 0xffd23a, { p: [0.08, 0.55, 0.05] }, 6);
  b.cone(0.16, 0.5, 0xfff4b0, { p: [-0.05, 0.45, -0.04] }, 6);
  return b.geometry();
}

/** Tannengruppe (n Bäume im Kreis r) – Kulisse. */
export function firGroupGeo(n = 4, r = 2.5, h = 4, seed = 1) {
  const rnd = new Rnd(seed);
  const parts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rnd.real(-0.4, 0.4), d = i === 0 ? 0 : rnd.real(r * 0.5, r);
    parts.push(place(firGeo(h * rnd.real(0.7, 1.15)), Math.cos(a) * d, 0, Math.sin(a) * d, rnd.real(0, 6)));
  }
  return merge(parts);
}

/** Verschneiter Fels (Brocken mit Schneekappe). */
export function snowRockGeo(r = 0.8, seed = 1, maxN = 3) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const n = rnd.int(1, maxN);
  for (let i = 0; i < n; i++) {
    const rr = r * rnd.real(0.55, 1);
    const x = rnd.real(-r, r) * 0.5, z = rnd.real(-r, r) * 0.45;
    b.add(new THREE.DodecahedronGeometry(rr, 0), { v: (px, py, pz, nx, ny) => mix(0x6a7892, 0xa4b2c8, Math.max(0, ny) * 0.8 + 0.1) },
      { p: [x, rr * 0.5, z], r: [rnd.real(0, 3), rnd.real(0, 3), rnd.real(0, 3)], s: [1, 0.75, 1] });
    b.sphere(rr * 0.78, { v: (px, py, pz, nx, ny) => mix(SNOW.side, SNOW.rim, Math.max(0, ny)) }, { p: [x, rr * 0.92, z], s: [1.05, 0.38, 1.05] }, 7, 3);
  }
  return b.geometry();
}

/** Verschneiter Busch (grüne Kugeln mit weißen Hauben). */
export function snowBushGeo(r = 0.7, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  for (let i = 0; i < 3; i++) {
    const a = rnd.real(0, TAU), d = rnd.real(0, r * 0.55), rr = r * rnd.real(0.55, 0.75);
    b.sphere(rr, { v: (x, y, z, nx, ny) => mix(0x1f6a42, 0x3c9a5a, Math.max(0, ny)) }, { p: [Math.cos(a) * d, rr * 0.8, Math.sin(a) * d] }, 7, 5);
    b.sphere(rr * 0.8, { v: (x, y, z, nx, ny) => mix(SNOW.side, SNOW.rim, Math.max(0, ny)) }, { p: [Math.cos(a) * d, rr * 1.32, Math.sin(a) * d], s: [1.05, 0.5, 1.05] }, 7, 4);
  }
  return b.geometry();
}

/** Herbstbaum (runde Krone in Orange/Rot/Gold). */
const AUTUMN_CROWNS = [[0xffcf6a, 0xf0902a, 0xb8501c], [0xff9a6a, 0xe0482a, 0x9a2a1a], [0xfff08a, 0xf2c23a, 0xb88a1a], [0xffb070, 0xe8702a, 0xa84a1a]];
export function autumnTreeGeo(h = 4.5, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const th = h * 0.45;
  b.cyl(0.14, 0.22, th, { v: (x, y) => mix(0x4a2e1e, 0x7a4e30, y / th + 0.5) }, { p: [0, th / 2, 0] }, 6, true);
  const R = h * 0.27;
  for (const [dx, dy, dz, k] of [[0, 1.0, 0, 1.12], [-0.75, 0.55, 0.25, 0.8], [0.72, 0.65, -0.2, 0.85], [0.1, 1.55, -0.1, 0.68]]) {
    const [hi, mid, lo] = AUTUMN_CROWNS[Math.floor(rnd.frac() * AUTUMN_CROWNS.length)];
    b.sphere(R * k, { v: (x, y, z, nx, ny) => (ny >= 0 ? mix(mid, hi, Math.min(1, ny / 0.9)) : mix(mid, lo, Math.min(1, -ny / 0.9))) }, { p: [dx * R, th + dy * R, dz * R] }, 8, 5);
  }
  return b.geometry();
}

/** Pastellbaum (Kugelkrone in Rosa/Mint/Flieder, weißer Stamm). */
const PASTEL_CROWNS = [[0xffe2f0, 0xffb2d6], [0xe2fff0, 0x9ae8c4], [0xf0e6ff, 0xc8b2f2], [0xfff6d8, 0xffe08a]];
export function pastelTreeGeo(h = 4, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const th = h * 0.42;
  b.cyl(0.12, 0.18, th, 0xf4ece0, { p: [0, th / 2, 0] }, 6, true);
  const R = h * 0.28;
  for (const [dx, dy, dz, k] of [[0, 1.0, 0, 1.1], [-0.7, 0.6, 0.2, 0.75], [0.7, 0.7, -0.2, 0.8]]) {
    const [hi, lo] = PASTEL_CROWNS[Math.floor(rnd.frac() * PASTEL_CROWNS.length)];
    b.sphere(R * k, { v: (x, y, z, nx, ny) => mix(lo, hi, Math.max(0, ny) * 0.9 + 0.1) }, { p: [dx * R, th + dy * R, dz * R] }, 9, 6);
  }
  return b.geometry();
}

/** Kahler Spukbaum: dunkler, krummer Stamm mit gewundenen Ästen, etwas Schnee. */
export function bareTreeGeo(h = 4.5, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const trunk = [[0, 0, 0], [rnd.real(-0.3, 0.3), h * 0.4, rnd.real(-0.2, 0.2)], [rnd.real(-0.5, 0.5), h * 0.75, 0], [rnd.real(-0.4, 0.4), h, rnd.real(-0.2, 0.2)]];
  b.tube(trunk, 0.2, 0x3a3044, null, 8, 6);
  for (let i = 0; i < 5; i++) {
    const y = h * rnd.real(0.45, 0.92), a = rnd.real(0, TAU), L = h * rnd.real(0.25, 0.42);
    const p0 = [0, y, 0], p1 = [Math.cos(a) * L * 0.5, y + L * 0.35, Math.sin(a) * L * 0.5], p2 = [Math.cos(a + 0.5) * L, y + L * 0.3 + rnd.real(-0.3, 0.4), Math.sin(a + 0.5) * L];
    b.tube([p0, p1, p2], 0.07, 0x4a3e56, null, 6, 4);
    b.sphere(0.12, 0xffffff, { p: [p1[0], p1[1] + 0.08, p1[2]], s: [1.6, 0.5, 1.2] }, 6, 3);
  }
  return b.geometry();
}

// ------------------------------------------------------------------ Requisiten

/** Straßenlaterne (dunkelgrüner Mast, Schneehaube); Leuchtkörper separat (lampGlowGeo, Material 'glow'). */
export function lampGeo(h = 3) {
  const b = new Build();
  b.cyl(0.22, 0.28, 0.3, 0x2a3a4a, { p: [0, 0.15, 0] }, 8);
  b.cyl(0.07, 0.09, h, 0x2a3a4a, { p: [0, h / 2, 0] }, 7);
  b.box(0.5, 0.08, 0.5, 0x2a3a4a, { p: [0, h + 0.05, 0] }, 0);
  b.cone(0.4, 0.34, 0x2a3a4a, { p: [0, h + 0.62, 0], r: [0, Math.PI / 4, 0] }, 4);
  b.sphere(0.3, 0xffffff, { p: [0, h + 0.78, 0], s: [1.3, 0.45, 1.3] }, 7, 4);
  for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) b.box(0.05, 0.42, 0.05, 0x2a3a4a, { p: [x, h + 0.3, z] }, 0);
  return b.geometry();
}
export function lampGlowGeo(h = 3) {
  const b = new Build();
  b.box(0.34, 0.38, 0.34, 0xffd27a, { p: [0, h + 0.3, 0] }, 0);
  return b.geometry();
}

/** Blockhütte mit Schneedach, Schornstein, Fenster (Glühen separat: cabinGlowGeo). Vorderseite +Z. */
export function cabinGeo(w = 4, d = 3.2) {
  const b = new Build();
  const H = 2.3;
  for (let i = 0; i < 6; i++) {
    const y = 0.2 + i * 0.385;
    b.cyl(0.2, 0.2, w + 0.4, i % 2 ? 0x8a5634 : 0x9c6640, { p: [0, y, d / 2], r: [0, 0, Math.PI / 2] }, 5);
    b.cyl(0.2, 0.2, w + 0.4, i % 2 ? 0x8a5634 : 0x9c6640, { p: [0, y, -d / 2], r: [0, 0, Math.PI / 2] }, 5);
    b.cyl(0.2, 0.2, d + 0.4, i % 2 ? 0x9c6640 : 0x8a5634, { p: [w / 2, y + 0.19, 0], r: [Math.PI / 2, 0, 0] }, 5);
    b.cyl(0.2, 0.2, d + 0.4, i % 2 ? 0x9c6640 : 0x8a5634, { p: [-w / 2, y + 0.19, 0], r: [Math.PI / 2, 0, 0] }, 5);
  }
  b.box(w - 0.1, H, d - 0.1, 0x7a4a2c, { p: [0, H / 2, 0] }, 0);
  // Dach mit dicker Schneedecke
  const roof = new THREE.Shape();
  roof.moveTo(-w / 2 - 0.6, 0); roof.lineTo(0, 1.6); roof.lineTo(w / 2 + 0.6, 0); roof.lineTo(-w / 2 - 0.6, 0);
  b.extrude(roof, d + 0.8, 0x6a3a26, { p: [0, H, 0] }, 0, 1);
  for (const s of [-1, 1]) {
    const len = Math.hypot(w / 2 + 0.6, 1.6);
    b.box(len + 0.1, 0.3, d + 1.0, { v: (x, y, z, nx, ny) => mix(SNOW.side, SNOW.rim, ny * 0.5 + 0.5) }, { p: [s * (w / 4 + 0.3), H + 0.95, 0], r: [0, 0, -s * Math.atan2(1.6, w / 2 + 0.6)] }, 0.12, 1);
  }
  // Schornstein mit Schneehaube
  b.box(0.6, 1.4, 0.6, 0x8a7a72, { p: [w * 0.25, H + 1.5, -0.4] }, 0.04);
  b.sphere(0.36, 0xffffff, { p: [w * 0.25, H + 2.25, -0.4], s: [1.2, 0.45, 1.2] }, 6, 4);
  // Tür
  b.box(0.9, 1.6, 0.12, 0x5a321e, { p: [-w * 0.18, 0.8, d / 2 + 0.16] }, 0.03);
  b.sphere(0.06, 0xffc21a, { p: [-w * 0.18 + 0.28, 0.82, d / 2 + 0.24] }, 6, 4);
  // Fensterrahmen mit Fensterkreuz
  b.box(0.95, 0.85, 0.08, 0xf4ecdc, { p: [w * 0.22, 1.3, d / 2 + 0.17] }, 0.02);
  // Schneehaufen an der Tür
  b.sphere(0.5, 0xffffff, { p: [w * 0.5 + 0.2, 0.05, d / 2 + 0.2], s: [1.4, 0.6, 1] }, 7, 4);
  return b.geometry();
}
export function cabinGlowGeo(w = 4, d = 3.2) {
  const b = new Build();
  b.box(0.36, 0.3, 0.04, 0xffcf6a, { p: [w * 0.22 - 0.2, 1.48, d / 2 + 0.22] }, 0);
  b.box(0.36, 0.3, 0.04, 0xffcf6a, { p: [w * 0.22 + 0.2, 1.48, d / 2 + 0.22] }, 0);
  b.box(0.36, 0.3, 0.04, 0xffb24a, { p: [w * 0.22 - 0.2, 1.12, d / 2 + 0.22] }, 0);
  b.box(0.36, 0.3, 0.04, 0xffb24a, { p: [w * 0.22 + 0.2, 1.12, d / 2 + 0.22] }, 0);
  return b.geometry();
}

/** Schneemann in Kartenqualität (drei Kugeln, Möhrennase, Kohleaugen, Schal, Bommelmütze), Blick +Z. */
export function snowmanGeo(seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const snowV = { v: (x, y, z, nx, ny) => mix(0xb8cce6, 0xffffff, ny * 0.45 + 0.55) };
  b.sphere(0.5, snowV, { p: [0, 0.45, 0], s: [1, 0.92, 1] }, 9, 5);
  b.sphere(0.37, snowV, { p: [0, 1.08, 0] }, 8, 5);
  b.sphere(0.27, snowV, { p: [0, 1.6, 0] }, 8, 5);
  for (const s of [-1, 1]) b.sphere(0.04, 0x22222c, { p: [s * 0.1, 1.67, 0.24] }, 4, 2);
  b.cone(0.05, 0.28, 0xff8a1a, { p: [0, 1.6, 0.36], r: [Math.PI / 2, 0, 0] }, 5);
  for (let i = 0; i < 3; i++) b.sphere(0.045, 0x22222c, { p: [0, 1.24 - i * 0.15, 0.35 - i * 0.012] }, 4, 2);
  const sc = rnd.pick([[0xe8283a, 0xffffff], [0x2a8ae8, 0xffffff], [0x3ab84a, 0xffe14a]]);
  b.torus(0.25, 0.07, sc[0], { p: [0, 1.38, 0], r: [Math.PI / 2, 0, 0] }, 4, 10);
  b.box(0.13, 0.36, 0.05, sc[1], { p: [0.17, 1.2, 0.2], r: [0.1, -0.5, 0.2] }, 0, 1);
  b.cyl(0.2, 0.27, 0.3, sc[0], { p: [0, 1.88, 0] }, 8);
  b.torus(0.25, 0.05, sc[1], { p: [0, 1.75, 0], r: [Math.PI / 2, 0, 0] }, 3, 10);
  b.sphere(0.08, 0xffffff, { p: [0, 2.08, 0] }, 5, 3);
  for (const s of [-1, 1]) b.cyl(0.025, 0.03, 0.75, 0x6e4226, { p: [s * 0.55, 1.22, 0], r: [0, 0, s * 1.0] }, 4);
  return b.geometry();
}

/** Iglu in Kartenqualität: Kuppel aus Schneeziegeln (Fugen über die Farbe), Tunnel nach +Z mit dunkler Öffnung. */
export function iglooGeo(D = 3.4) {
  const b = new Build();
  const R = D / 2;
  const WS = 18, HS = 7;
  b.add(new THREE.SphereGeometry(R, WS, HS, 0, TAU, 0, Math.PI / 2), (x, y, z) => {
    const row = Math.floor((Math.asin(Math.min(1, y / R)) / (Math.PI / 2)) * HS);
    const col = Math.floor(((Math.atan2(z, x) / TAU) + 1) * WS + (row % 2) * 0.5);
    return (row + col) % 2 ? 0xf4f8fd : 0xdde8f6;
  }, { s: [1, 1.05, 1] });
  const tR = R * 0.45;
  b.add(new THREE.CylinderGeometry(tR, tR, R * 0.75, 10, 1, true, -Math.PI / 2, Math.PI), (x, y, z, nx, ny) => (ny > 0.8 ? 0xffffff : 0xe8f0fa), { p: [0, 0, R * 0.92], r: [Math.PI / 2, 0, 0] });
  b.add(new THREE.CircleGeometry(tR * 0.84, 10, 0, Math.PI), 0x1a2a44, { p: [0, 0.01, R * 0.92 + R * 0.38] });
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + 0.3; if (Math.sin(a) > 0.6) continue; b.sphere(0.26, 0xffffff, { p: [Math.cos(a) * R, 0.05, Math.sin(a) * R], s: [1.4, 0.55, 1.4] }, 6, 3); }
  return b.geometry();
}

/** Einfacher Personenwagen (königsblau, Cremestreifen, gelbe Fenster), Fahrtrichtung ±Z, Schienen-Oberkante y = 0. */
export function wagonGeo(len = 9) {
  const b = new Build();
  b.box(2.8, 2.4, len, { v: (x, y, z, nx, ny) => (Math.abs(y - 0.2) < 0.18 ? 0xf2e6c8 : mix(0x1e3c9a, 0x3a5ad0, ny * 0.3 + 0.5)) }, { p: [0, 2.0, 0] }, 0.12, 1);
  b.cyl(1.5, 1.5, len + 0.1, 0x8a92a4, { p: [0, 3.15, 0], r: [Math.PI / 2, 0, 0], s: [1, 1, 0.38] }, 12);
  b.box(3.0, 0.3, len + 0.3, { v: (x, y, z, nx, ny) => mix(SNOW.side, SNOW.rim, ny * 0.5 + 0.5) }, { p: [0, 3.78, 0] }, 0.1, 1);
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) b.box(0.06, 0.8, 1.2, 0xffd27a, { p: [s * 1.42, 2.3, -len / 2 + 1.4 + i * ((len - 2.8) / 3)] }, 0, 1);
  b.box(2.2, 0.5, len - 0.6, 0x2a2a34, { p: [0, 0.6, 0] }, 0, 1);
  for (const zz of [-len / 2 + 1.5, len / 2 - 1.5]) for (const s of [-1, 1]) for (const d of [-0.55, 0.55]) b.cyl(0.42, 0.42, 0.18, 0xc81e2e, { p: [s * 1.2, 0.42, zz + d], r: [0, 0, Math.PI / 2] }, 10);
  return b.geometry();
}

/** Pastellblumen-Büschel (sparsam): Stiele und Blütenkugeln in Rosa, Flieder, Pfirsich. */
export function flowerClumpGeo(n = 5, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const cols = [0xffb8da, 0xd4c4ff, 0xffd0a8, 0xfff0a0, 0xffffff];
  for (let i = 0; i < n; i++) {
    const a = rnd.real(0, TAU), d = rnd.real(0, 0.45), h = rnd.real(0.45, 0.8);
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    b.cyl(0.02, 0.025, h, 0x3fae5a, { p: [x, h / 2, z] }, 3, true);
    b.sphere(0.13, { v: (px, py, pz, nx, ny) => (ny > 0.75 ? 0xffd23a : cols[i % cols.length]) }, { p: [x, h + 0.04, z], s: [1, 0.55, 1] }, 6, 2);
  }
  b.sphere(0.3, 0x5ac878, { p: [0, 0.1, 0], s: [1.6, 0.5, 1.4] }, 7, 3);
  return b.geometry();
}

/**
 * Schneestufen (sparsam, Weltdaten segments: { type: 'snowstairs', pos, dir, steps, rise, run, width }):
 * je Stufe ein Steinquader mit Schneekante; Kollision wie der Baustein 'stairs' (Quader vom Fuß bis zur Stufenhöhe).
 */
export function buildSnowStairs(level, spec) {
  const DIRS = { '-z': [0, -1], '+z': [0, 1], '-x': [-1, 0], '+x': [1, 0] };
  const [ux, uz] = DIRS[spec.dir ?? '-z'] ?? DIRS['-z'];
  const [px, py, pz] = spec.pos;
  const n = spec.steps ?? 4, rise = spec.rise ?? 1, run = spec.run ?? 1, w = spec.width ?? 4;
  const b = new Build();
  for (let i = 0; i < n; i++) {
    const a = i * run, c = (i + 1) * run, h = rise * (i + 1);
    const cx = px + ux * (a + c) / 2, cz = pz + uz * (a + c) / 2;
    const sx = ux ? run : w, sz = uz ? run : w;
    level.world.add({ type: 'box', min: [cx - sx / 2, py, cz - sz / 2], max: [cx + sx / 2, py + h, cz + sz / 2], tag: 'stairs' });
    b.box(sx, h, sz, (x, y, z, nx, ny) => (ny > 0.5 ? 0xe9eef6 : Math.abs(nx) > 0.5 ? 0x9aa6ba : 0xb6c0d0), { p: [cx, py + h / 2, cz] }, 0, 1);
    b.box(ux ? 0.18 : w + 0.12, 0.12, uz ? 0.18 : w + 0.12, 0xffffff, { p: [cx - ux * (run / 2 - 0.09), py + h + 0.04, cz - uz * (run / 2 - 0.09)] }, 0, 1);
  }
  level.view?.addStatic(b.geometry(), { castShadow: true });
}

/** Weihnachtsmarkt-Bude (Holz, gestreifte Markise mit Schneedach, Theke mit Waren); Lichter separat. Front +Z. */
export function stallGeo(seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const awn = rnd.pick([[0xe8283a, 0xfff6ee], [0x2a8a4a, 0xfff6ee], [0x2a6ae8, 0xfff6ee]]);
  b.box(2.6, 2.0, 1.8, (x, y, z, nx, ny) => (Math.abs(ny) > 0.5 ? 0x8a5634 : Math.floor((x + 1.3) / 0.32) % 2 ? 0x9c6640 : 0x8a5634), { p: [0, 1.0, -0.2] }, 0, 1);
  b.box(2.7, 0.14, 0.7, 0xb07a44, { p: [0, 0.95, 0.85] }, 0, 1);
  b.box(2.6, 0.9, 0.1, 0x6a3a22, { p: [0, 0.45, 1.15] }, 0, 1);
  for (const sx of [-1.25, 1.25]) b.box(0.12, 2.6, 0.12, 0x6a3a22, { p: [sx, 1.3, 1.15] }, 0, 1);
  b.add(new THREE.BoxGeometry(3.0, 0.08, 1.0, 10, 1, 1), (x) => (Math.floor((x + 1.5) / 0.3) % 2 ? awn[0] : awn[1]), { p: [0, 2.45, 0.95], r: [0.5, 0, 0] });
  const roof = new THREE.Shape(); roof.moveTo(-1.6, 0); roof.lineTo(0, 0.9); roof.lineTo(1.6, 0); roof.lineTo(-1.6, 0);
  b.extrude(roof, 2.2, 0x7a3a26, { p: [0, 2.0, -0.2] }, 0, 1);
  for (const s2 of [-1, 1]) b.box(1.9, 0.18, 2.5, { v: (x, y, z, nx, ny) => mix(SNOW.side, SNOW.rim, ny * 0.5 + 0.5) }, { p: [s2 * 0.8, 2.5, -0.2], r: [0, 0, -s2 * 0.51] }, 0.08, 1);
  const goods = [0xe8283a, 0xffc21a, 0x3ab84a, 0xff8ad8, 0x8a5634];
  for (let i = 0; i < 6; i++) b.sphere(0.12, goods[(i + seed) % goods.length], { p: [-1.0 + i * 0.4, 1.1, 0.8 + (i % 2) * 0.12] }, 6, 4);
  b.cyl(0.14, 0.12, 0.3, 0xc8683a, { p: [0.9, 1.17, 0.95] }, 7);
  return b.geometry();
}
export function stallGlowGeo() {
  const b = new Build();
  for (let i = 0; i < 7; i++) b.sphere(0.07, i % 2 ? 0xfff2a0 : 0xffb24a, { p: [-1.35 + i * 0.45, 2.42 - Math.sin((i / 6) * Math.PI) * 0.12, 1.5] }, 5, 3);
  return b.geometry();
}

/** Gefrorener Brunnen: Steinbecken mit Eisfläche, Säule mit Eisfontäne (Zapfen) und Stern obenauf. */
export function fountainGeo() {
  const b = new Build();
  b.cyl(2.0, 2.15, 0.7, (x, y, z) => (Math.floor(((Math.atan2(z, x) / TAU) + 1) * 14) % 2 ? 0xa8b2c4 : 0x96a0b4), { p: [0, 0.35, 0] }, 20);
  b.torus(2.0, 0.16, 0xf4f8fd, { p: [0, 0.72, 0], r: [Math.PI / 2, 0, 0] }, 5, 24);
  b.cyl(1.85, 1.85, 0.06, 0xa8dcf4, { p: [0, 0.62, 0] }, 20);
  b.cyl(0.32, 0.4, 1.6, 0xb4bed0, { p: [0, 1.4, 0] }, 10);
  b.cyl(0.9, 0.6, 0.3, 0xa8b2c4, { p: [0, 2.3, 0] }, 14);
  b.torus(0.9, 0.08, 0xf4f8fd, { p: [0, 2.45, 0], r: [Math.PI / 2, 0, 0] }, 4, 16);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU, h = 0.5 + (i % 3) * 0.2;
    b.add(new THREE.ConeGeometry(0.07, h, 5), ICICLE(h), { p: [Math.cos(a) * 0.86, 2.15 - h / 2, Math.sin(a) * 0.86], r: [Math.PI, 0, 0] });
  }
  b.add(new THREE.CylinderGeometry(0.05, 0.28, 1.1, 7), ICICLE(1.1), { p: [0, 3.0, 0] });
  for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; b.add(new THREE.ConeGeometry(0.06, 0.6, 5), ICICLE(0.6), { p: [Math.cos(a) * 0.3, 3.2, Math.sin(a) * 0.3], r: [Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7] }); }
  b.extrude(starShapeLocal(0.32, 0.14), 0.1, 0xffd23a, { p: [0, 3.8, 0] }, 0.02, 1);
  return b.geometry();
}

/** Schiefer Spuk-Grabstein (kindgerecht: Mond und Stern statt Inschrift), mit Schneekappe. */
export function tombGeo(seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const s = new THREE.Shape();
  s.moveTo(-0.45, 0); s.lineTo(-0.45, 0.8); s.absarc(0, 0.8, 0.45, Math.PI, 0, true); s.lineTo(0.45, 0); s.lineTo(-0.45, 0);
  const tilt = rnd.real(-0.25, 0.25);
  b.extrude(s, 0.22, { v: (x, y) => mix(0x5a5470, 0x8a84a0, y / 1.25) }, { p: [0, 0, 0], r: [rnd.real(-0.15, 0.1), 0, tilt] }, 0.03, 6);
  b.sphere(0.36, 0xeeeaf6, { p: [Math.sin(-tilt) * 1.1, 1.22, 0], s: [1.2, 0.35, 0.6] }, 7, 3);
  b.extrude(rnd.chance(0.5) ? starShapeLocal(0.16, 0.07) : moonShape(0.17), 0.04, 0xd8ff8a, { p: [Math.sin(-tilt) * 0.75, 0.75, 0.13], r: [0, 0, tilt] }, 0, 6);
  b.sphere(0.35, 0xe2dcef, { p: [0, 0.02, 0.2], s: [1.6, 0.35, 1.2] }, 7, 3);
  return b.geometry();
}
function moonShape(r) {
  const s = new THREE.Shape();
  s.absarc(0, 0, r, Math.PI * 0.35, Math.PI * 1.65, false);
  s.absarc(r * 0.45, 0, r * 0.82, Math.PI * 1.55, Math.PI * 0.45, true);
  return s;
}

/** Schiefer Eisenzaun (Spukhügel) entlang +X mit Spitzen. */
export function spookFenceGeo(len = 6, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const n = Math.max(2, Math.round(len / 0.45));
  for (let i = 0; i <= n; i++) {
    const x = -len / 2 + (i / n) * len, h = 1.1 + rnd.real(-0.12, 0.12), t = rnd.real(-0.08, 0.08);
    b.box(0.06, h, 0.06, 0x2a2438, { p: [x, h / 2, 0], r: [0, 0, t] }, 0, 1);
    b.cone(0.07, 0.18, 0x2a2438, { p: [x + Math.sin(-t) * h, h + 0.08, 0] }, 4);
  }
  for (const y of [0.3, 0.85]) b.box(len, 0.06, 0.06, 0x2a2438, { p: [0, y, 0], r: [0, 0, rnd.real(-0.02, 0.02)] }, 0, 1);
  for (let i = 0; i < 4; i++) b.sphere(0.12, 0xeeeaf6, { p: [rnd.real(-len / 2, len / 2), 0.93, 0], s: [1.6, 0.5, 1] }, 5, 3);
  return b.geometry();
}

/** Hecken-Hase in Kartenqualität (Formschnitt aus Minzhecke mit rosa Blüten auf weißem Sockel), Blick +Z. */
export function topiaryBunnyGeo(s = 1) {
  const b = new Build();
  const S = (v) => v * s;
  const hedge = { v: (x, y, z, nx, ny) => mix(0x2f9a6c, 0x6fdca8, Math.max(0, ny) * 0.7 + 0.3) };
  b.box(S(1.4), S(0.5), S(1.1), { v: (x, y, z, nx, ny) => (ny > 0.5 ? 0xffffff : 0xe8e2d6) }, { p: [0, S(0.25), 0] }, 0.06, 1);
  b.sphere(S(0.55), hedge, { p: [0, S(1.05), S(-0.05)], s: [1, 1.05, 0.95] }, 10, 7);
  b.sphere(S(0.38), hedge, { p: [0, S(1.72), S(0.12)] }, 9, 6);
  for (const sx of [-1, 1]) b.sphere(S(0.12), hedge, { p: [sx * S(0.13), S(2.3), S(0.05)], s: [1, 3.2, 0.8], r: [0, 0, sx * -0.12] }, 7, 5);
  for (const sx of [-1, 1]) b.sphere(S(0.16), hedge, { p: [sx * S(0.25), S(0.62), S(0.42)], s: [1, 0.7, 1.4] }, 7, 4);
  b.sphere(S(0.16), 0xffffff, { p: [0, S(0.9), S(-0.6)] }, 6, 4);
  for (const [x, y, z] of [[0.3, 1.2, 0.4], [-0.35, 0.95, 0.38], [0.2, 1.9, 0.35], [-0.42, 1.25, -0.2], [0.45, 0.85, -0.25]]) b.sphere(S(0.06), 0xff8ac0, { p: [S(x), S(y), S(z)] }, 5, 3);
  for (const sx of [-1, 1]) b.sphere(S(0.035), 0x1a1a2a, { p: [sx * S(0.14), S(1.8), S(0.46)] }, 5, 3);
  return b.geometry();
}

/** Schneeengel (Abdruck im Schnee: Kopf, ausgebreitete Flügel, Rock), flach am Boden, Kopf nach −Z. */
export function snowAngelGeo() {
  const b = new Build();
  const c = 0xc6d4ea;
  b.cyl(0.2, 0.2, 0.02, c, { p: [0, 0.012, -0.75] }, 10);
  for (const s of [-1, 1]) b.sphere(0.5, c, { p: [s * 0.42, 0.012, -0.32], s: [1.1, 0.02, 0.42], r: [0, s * 0.5, 0] }, 10, 3);
  const skirt = new THREE.Shape(); skirt.moveTo(-0.18, 0); skirt.lineTo(0.18, 0); skirt.lineTo(0.5, 0.9); skirt.lineTo(-0.5, 0.9); skirt.lineTo(-0.18, 0);
  b.extrude(skirt, 0.02, c, { p: [0, 0.012, -0.5], r: [Math.PI / 2, 0, 0] }, 0, 1);
  return b.geometry();
}

/** Fußspuren im Schnee entlang +Z (n Schritte, abwechselnd links/rechts), flach. */
export function footprintsGeo(n = 10, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  let x = 0, a = 0;
  for (let i = 0; i < n; i++) {
    a += rnd.real(-0.25, 0.25);
    x += Math.sin(a) * 0.55;
    const z = i * 0.55, s = i % 2 ? 1 : -1;
    b.sphere(0.1, 0xbccbe2, { p: [x + s * 0.12, 0.012, z], s: [0.9, 0.04, 1.5], r: [0, a, 0] }, 7, 2);
  }
  return b.geometry();
}

/** Kleines Ruderboot (rot, Holzbank, Ruder), Bug nach +Z. */
export function rowboatGeo() {
  const b = new Build();
  b.lathe([[0, 0], [0.5, 0.05], [0.62, 0.3], [0.6, 0.42], [0, 0.42]], { v: (px, py, pz, nx, ny) => (ny > 0.6 ? 0x6a3a22 : mix(0xe8283a, 0xff5a4a, py * 2)) }, { s: [1, 1, 2.4] }, 12);
  b.box(1.0, 0.06, 0.24, 0xb07a44, { p: [0, 0.36, 0.2] }, 0, 1);
  b.cyl(0.03, 0.03, 1.6, 0xc89a5a, { p: [0.45, 0.4, -0.1], r: [0.2, 0, 1.25] }, 4);
  b.sphere(0.4, 0xffffff, { p: [0, 0.4, -0.6], s: [1.2, 0.3, 1.4] }, 7, 3);
  return b.geometry();
}

/** Bunter Pastell-Stein (Mosaik-Würfel, Kante s). */
export function pastelBlockGeo(s = 1) {
  const b = new Build();
  const cols = [0xa8ecd0, 0xd4c4ff, 0xffd0a8, 0xa8d8ff, 0xfff0a0, 0xffb8da];
  b.add(new THREE.BoxGeometry(s, s, s, 2, 2, 2), (x, y, z) => cols[(Math.floor((x + s) * 2 / s) * 3 + Math.floor((y + s) * 2 / s) * 5 + Math.floor((z + s) * 2 / s) * 7) % cols.length], { p: [0, s / 2, 0] });
  return b.geometry();
}

/** Kart-Bande entlang +X (rot-weiße Polster, grauer Sockel), Länge len. */
export function barrierGeo(len = 6) {
  const b = new Build();
  b.box(len, 0.3, 0.6, 0x8a8e9a, { p: [0, 0.15, 0] }, 0, 1);
  const n = Math.max(1, Math.round(len / 1));
  for (let i = 0; i < n; i++) b.box(len / n - 0.04, 0.5, 0.5, i % 2 ? 0xe8283a : 0xf6f6f0, { p: [-len / 2 + (i + 0.5) * (len / n), 0.55, 0] }, 0, 1);
  b.cyl(0.12, 0.12, len, 0xf6f6f0, { p: [0, 0.86, 0], r: [0, 0, Math.PI / 2] }, 6);
  return b.geometry();
}

/** Orange Rohrschiene entlang +X (Länge len) auf Stützen (Höhe h, Schienen-Oberkante bei y = h). */
export function railGeo(len = 20, h = 1.6) {
  const b = new Build();
  b.cyl(0.11, 0.11, len, { v: (x, y, z, nx, ny) => mix(0xd8641a, 0xffa040, ny * 0.5 + 0.5) }, { p: [0, h - 0.11, 0], r: [0, 0, Math.PI / 2] }, 8);
  const n = Math.max(1, Math.round(len / 4));
  for (let i = 0; i <= n; i++) {
    const x = -len / 2 + (i / n) * len;
    b.cyl(0.07, 0.09, h - 0.12, 0x5a5e6a, { p: [x, (h - 0.12) / 2, 0] }, 6);
    b.box(0.34, 0.12, 0.34, 0xffc21a, { p: [x, h - 0.2, 0] }, 0, 1);
    b.cyl(0.22, 0.26, 0.12, 0x5a5e6a, { p: [x, 0.06, 0] }, 8);
  }
  for (const s of [-1, 1]) b.sphere(0.16, 0xffc21a, { p: [s * len / 2, h - 0.11, 0] }, 7, 5);
  return b.geometry();
}

/** Holzschlitten mit roten Kufen. */
export function sledGeo() {
  const b = new Build();
  for (const s of [-1, 1]) {
    b.box(1.5, 0.08, 0.08, 0xd8283a, { p: [0, 0.06, s * 0.32] }, 0, 1);
    b.torus(0.18, 0.04, 0xd8283a, { p: [0.75, 0.24, s * 0.32], r: [0, 0, 0] }, 4, 10, Math.PI);
    for (const x of [-0.45, 0.35]) b.box(0.07, 0.3, 0.07, 0xd8283a, { p: [x, 0.2, s * 0.32] }, 0, 1);
  }
  for (let i = 0; i < 5; i++) b.box(0.22, 0.06, 0.8, i % 2 ? 0xb0763e : 0xc4884a, { p: [-0.5 + i * 0.25, 0.37, 0] }, 0, 1);
  b.cyl(0.02, 0.02, 1.2, 0xe8d8b0, { p: [1.2, 0.3, 0], r: [0, 0, Math.PI / 2.4] }, 4);
  return b.geometry();
}

/** Zwei Ski und Stöcke, im Schnee steckend (gekreuzt). */
export function skisGeo() {
  const b = new Build();
  b.box(0.12, 1.9, 0.04, 0x2a6ae8, { p: [-0.12, 0.85, 0], r: [0, 0, 0.18] }, 0, 1);
  b.box(0.12, 1.9, 0.04, 0xe8283a, { p: [0.12, 0.85, 0.05], r: [0, 0, -0.18] }, 0, 1);
  b.cyl(0.02, 0.02, 1.3, 0x9aa0b0, { p: [0.45, 0.6, 0.1], r: [0, 0, -0.12] }, 4);
  b.cyl(0.02, 0.02, 1.3, 0x9aa0b0, { p: [-0.45, 0.6, 0.1], r: [0, 0, 0.12] }, 4);
  b.torus(0.08, 0.015, 0x2a2a34, { p: [0.4, 0.12, 0.1], r: [Math.PI / 2, 0, 0] }, 3, 8);
  b.torus(0.08, 0.015, 0x2a2a34, { p: [-0.4, 0.12, 0.1], r: [Math.PI / 2, 0, 0] }, 3, 8);
  b.sphere(0.45, 0xffffff, { p: [0, 0.02, 0], s: [1.5, 0.35, 1.0] }, 8, 4);
  return b.geometry();
}

/** Ein Paar Schlittschuhe (weiße Stiefel, rote Schnürung, silberne Kufen), nebeneinander abgestellt. */
export function skatesGeo() {
  const b = new Build();
  for (const s of [-1, 1]) {
    const x = s * 0.17, yaw = s * 0.18;
    b.box(0.13, 0.28, 0.2, 0xffffff, { p: [x, 0.2, -0.04], r: [0, yaw, 0] }, 0.04, 1);
    b.box(0.13, 0.12, 0.34, 0xf4f6fa, { p: [x, 0.12, 0.03], r: [0, yaw, 0] }, 0.04, 1);
    b.box(0.135, 0.03, 0.12, 0xe8283a, { p: [x, 0.3, 0.02], r: [0.5, yaw, 0] }, 0, 1);
    b.box(0.025, 0.05, 0.44, 0xc8d0dc, { p: [x, 0.035, 0.03], r: [0, yaw, 0] }, 0, 1);
  }
  return b.geometry();
}

/** Eisstöcke (Curling-Steine) am Rand der Eisbahn: graue Steine mit farbigem Griff. */
export function curlingGeo(n = 3, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 0.62 + rnd.real(-0.1, 0.1), z = rnd.real(-0.25, 0.25);
    b.cyl(0.24, 0.26, 0.2, { v: (px, py, pz, nx, ny) => (ny > 0.5 ? 0xb8c0cc : 0x7a8290) }, { p: [x, 0.1, z] }, 10);
    const c = i % 2 ? 0xe8283a : 0xffc21a;
    b.box(0.08, 0.1, 0.08, c, { p: [x, 0.25, z] }, 0, 1);
    b.box(0.08, 0.07, 0.26, c, { p: [x, 0.32, z + 0.09] }, 0, 1);
  }
  return b.geometry();
}

/** Schneeballhaufen (Pyramide aus Schneebällen). */
export function snowballsGeo(n = 6, r = 0.32) {
  const b = new Build();
  const spots = [[0, 0, 0], [0.64, 0, 0.05], [-0.62, 0, 0.1], [0.3, 0, 0.58], [-0.3, 0, 0.55], [0.0, 0.52, 0.2], [0.33, 0.52, 0.18], [-0.32, 0.5, 0.25], [0, 0.98, 0.25]];
  for (let i = 0; i < Math.min(n, spots.length); i++) {
    const [x, y, z] = spots[i];
    b.sphere(r, { v: (px, py, pz, nx, ny) => mix(SNOW.shade, SNOW.rim, ny * 0.5 + 0.55) }, { p: [x * r * 1.6, r + y * r * 1.6, z * r * 1.6] }, 8, 6);
  }
  return b.geometry();
}

/** Eiskristall-Gruppe (spitze Prismen, hellblau) – Glanz über Material 'stone'. */
export function crystalGeo(h = 1.6, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  for (let i = 0; i < 5; i++) {
    const hh = h * (i === 0 ? 1 : rnd.real(0.4, 0.75)), r = 0.16 + hh * 0.08;
    const a = (i / 5) * TAU, lean = i === 0 ? 0 : 0.4;
    b.add(new THREE.CylinderGeometry(0, r, hh, 6, 1), { v: (x, y) => mix(0x5ab8ee, 0xeafaff, (y + hh / 2) / hh) },
      { p: [Math.cos(a) * (i ? 0.25 : 0), hh / 2 * 0.95, Math.sin(a) * (i ? 0.25 : 0)], r: [Math.sin(a) * lean, 0, -Math.cos(a) * lean] });
  }
  return b.geometry();
}

/** Eisblock-Stapel (Kulisse; hellblaue Quader mit weißer Frostkante). */
export function iceBlocksGeo(n = 3, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const spots = [[0, 0, 0], [1.02, 0, 0.1], [0.5, 1.0, 0.05], [-1.0, 0, -0.2], [-0.5, 1, -0.1], [0, 2, 0]];
  for (let i = 0; i < Math.min(n, spots.length); i++) {
    const [x, y, z] = spots[i];
    b.box(0.96, 0.96, 0.96, { v: (px, py, pz, nx, ny) => (ny > 0.5 ? 0xf2fbff : mix(0x6ac0ee, 0xbfe8fa, py + 0.5)) }, { p: [x, y + 0.48, z], r: [0, rnd.real(-0.12, 0.12), 0] }, 0.06, 1);
  }
  return b.geometry();
}

/** Laubhaufen (Herbstwald). */
export function leafPileGeo(r = 0.8, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  for (let i = 0; i < 4; i++) {
    const c = rnd.pick([0xe8702a, 0xf2a43a, 0xc8401c, 0xffcf5a]);
    b.sphere(r * rnd.real(0.45, 0.7), c, { p: [rnd.real(-r, r) * 0.5, 0.05, rnd.real(-r, r) * 0.5], s: [1.2, 0.45, 1.2] }, 7, 4);
  }
  return b.geometry();
}

/** Gleis entlang +X (Länge len): Schwellen und zwei Schienen; Mitte im Ursprung, Oberkante bei y = 0,3. */
export function trackGeo(len = 10) {
  const b = new Build();
  const n = Math.max(2, Math.round(len / 0.9));
  b.box(len, 0.16, 2.6, { v: (x, y, z, nx, ny) => mix(0x8a8478, 0xb4ad9e, ny * 0.5 + 0.5) }, { p: [0, 0.08, 0] }, 0, 1);
  for (let i = 0; i < n; i++) b.box(0.32, 0.12, 2.3, 0x6a4a32, { p: [-len / 2 + (i + 0.5) * (len / n), 0.2, 0] }, 0, 1);
  for (const s of [-1, 1]) b.box(len, 0.1, 0.1, 0x9aa2b4, { p: [0, 0.31, s * 0.72] }, 0, 1);
  return b.geometry();
}

/** Rettungsring (rot-weiß) auf einem Pfosten. */
export function buoyGeo() {
  const b = new Build();
  b.box(0.14, 1.5, 0.14, 0x8a5a36, { p: [0, 0.75, 0] }, 0, 1);
  b.torus(0.36, 0.11, (x, y) => (Math.floor((Math.atan2(y, x) / TAU + 1) * 8) % 2 ? 0xe8283a : 0xffffff), { p: [0, 1.05, 0.12] }, 6, 16);
  b.sphere(0.13, 0xffffff, { p: [0, 1.55, 0], s: [1.3, 0.6, 1.3] }, 6, 4);
  return b.geometry();
}

/** Wegweiser mit drei Pfeilen (Farbe je Pfeil) und Schneehaube. */
export function signpostGeo() {
  const b = new Build();
  b.cyl(0.08, 0.1, 2.4, 0x8a5a36, { p: [0, 1.2, 0] }, 6);
  b.sphere(0.16, 0xffffff, { p: [0, 2.44, 0], s: [1.2, 0.6, 1.2] }, 6, 4);
  const arrow = (y, yaw, c) => {
    const s = new THREE.Shape();
    s.moveTo(0, -0.14); s.lineTo(0.8, -0.14); s.lineTo(1.0, 0); s.lineTo(0.8, 0.14); s.lineTo(0, 0.14); s.lineTo(0, -0.14);
    b.extrude(s, 0.06, c, { p: [0, y, 0], r: [0, yaw, 0] }, 0, 1);
    b.box(0.85, 0.05, 0.1, 0xffffff, { p: [Math.cos(yaw) * 0.45, y + 0.17, -Math.sin(yaw) * 0.45], r: [0, yaw, 0] }, 0, 1);
  };
  arrow(2.0, 0.4, 0x4fc24a); arrow(1.62, 2.6, 0x3a8aff); arrow(1.24, -0.9, 0xe8283a);
  return b.geometry();
}

/** Lagerfeuer: Steinring und Holzscheite (die Flamme ist ein eigenes Objekt). */
export function campfireGeo() {
  const b = new Build();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU;
    b.add(new THREE.DodecahedronGeometry(0.18, 0), { v: (x, y, z, nx, ny) => mix(0x5a6070, 0x9aa2b4, Math.max(0, ny)) }, { p: [Math.cos(a) * 0.62, 0.1, Math.sin(a) * 0.62], r: [i, i * 2, 0], s: [1, 0.7, 1] });
  }
  for (let i = 0; i < 4; i++) b.cyl(0.07, 0.08, 0.9, 0x6a4024, { p: [0, 0.18, 0], r: [0.5, (i / 4) * TAU, 0.9], order: 'YXZ' }, 6);
  b.cyl(0.1, 0.1, 1.2, 0x7a4a2c, { p: [1.3, 0.12, 0.3], r: [0, 0.4, Math.PI / 2] }, 7);
  return b.geometry();
}

/** Wimpelkette zwischen zwei Punkten (lokal: von (−len/2, 0) bis (len/2, 0), Durchhang sag). */
export function buntingGeo(len = 6, sag = 0.6, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const cols = [0xe8283a, 0xffc21a, 0x2a6ae8, 0x3ab84a, 0xffffff];
  const pts = [];
  for (let i = 0; i <= 8; i++) { const u = i / 8; pts.push([-len / 2 + u * len, -Math.sin(u * Math.PI) * sag, 0]); }
  b.tube(pts, 0.025, 0xf6f0e6, null, 16, 3);
  const n = Math.max(3, Math.round(len / 0.55));
  for (let i = 1; i < n; i++) {
    const u = i / n, x = -len / 2 + u * len, y = -Math.sin(u * Math.PI) * sag;
    b.cone(0.16, 0.34, cols[(i + Math.floor(rnd.frac() * 2)) % cols.length], { p: [x, y - 0.18, 0], r: [Math.PI, 0, 0], s: [1, 1, 0.15] }, 3);
  }
  return b.geometry();
}

/** Schneehaube für ein Dach (Kuppel mit Wülsten), r = Radius, Mitte im Ursprung. */
export function snowCapGeo(r = 2, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  b.dome(r, { v: (x, y, z, nx, ny) => mix(SNOW.side, SNOW.rim, Math.max(0, ny)) }, { s: [1, 0.42, 1] }, Math.PI / 2, 16, 4);
  const n = Math.max(5, Math.round(r * 5));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rnd.real(-0.1, 0.1);
    b.sphere(0.2 + rnd.real(0, 0.1), 0xf4f8fc, { p: [Math.cos(a) * r * 0.98, -0.08, Math.sin(a) * r * 0.98], s: [1, 1.5, 1] }, 6, 4);
  }
  return b.geometry();
}

/** Eisscholle (flache, unregelmäßige Platte) – treibt im Meer bzw. See. */
export function iceFloeGeo(r = 2, seed = 1) {
  const rnd = new Rnd(seed);
  const s = new THREE.Shape();
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU, rr = r * rnd.real(0.7, 1.1);
    if (i === 0) s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else if (i < n) s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  s.closePath();
  const b = new Build();
  b.extrude(s, 0.28, { v: (x, y, z, nx, ny, nz) => (Math.abs(nz) > 0.7 ? 0xf2f8fe : 0x9ad2f0) }, { r: [-Math.PI / 2, 0, 0], p: [0, 0.06, 0] }, 0.06, 2, 1);
  return b.geometry();
}

/** Schneehaufen (weicher Hügel, Kulisse). */
export function snowDriftGeo(r = 1.2, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  for (let i = 0; i < 3; i++) b.sphere(r * rnd.real(0.6, 1), { v: (x, y, z, nx, ny) => mix(SNOW.shade, SNOW.rim, ny * 0.5 + 0.5) }, { p: [rnd.real(-r, r) * 0.6, 0, rnd.real(-r, r) * 0.4], s: [1.3, 0.55, 1] }, 9, 5);
  return b.geometry();
}

/** Bank aus Holz mit Schneehaube. */
export function benchGeo() {
  const b = new Build();
  for (const x of [-0.7, 0.7]) b.box(0.1, 0.45, 0.45, 0x2a3a4a, { p: [x, 0.22, 0] }, 0, 1);
  for (let i = 0; i < 3; i++) b.box(1.7, 0.07, 0.14, 0xb0763e, { p: [0, 0.48, -0.15 + i * 0.16] }, 0, 1);
  b.box(1.7, 0.36, 0.06, 0xa06a3a, { p: [0, 0.78, -0.24] }, 0, 1);
  b.box(1.6, 0.06, 0.4, 0xffffff, { p: [0, 0.54, 0] }, 0, 1);
  return b.geometry();
}

/**
 * Requisite nach Art (map.props, Welt 3): Geometrie mit Fußpunkt im Ursprung, oder null.
 * Glühende Teile liefert snowPropGlow (Material 'glow').
 */
export function snowPropGeo(it, seed) {
  switch (it.kind) {
    case 'firs': return firGroupGeo(it.n ?? 4, it.r ?? 2.5, it.size ?? 4, seed);
    case 'fir_lo': return firGeo(it.size ?? 3.5);
    case 'snowrock': return snowRockGeo(it.size ?? 0.8, seed);
    case 'snowbush': return snowBushGeo(it.size ?? 0.7, seed);
    case 'autumntree': return autumnTreeGeo(it.size ?? 4.5, seed);
    case 'pasteltree': return pastelTreeGeo(it.size ?? 4, seed);
    case 'baretree': return bareTreeGeo(it.size ?? 4.5, seed);
    case 'lamp': return lampGeo(it.size ?? 3);
    case 'cabin': return cabinGeo(it.size?.[0] ?? 4, it.size?.[1] ?? 3.2);
    case 'sled': return sledGeo();
    case 'skis': return skisGeo();
    case 'skates': return skatesGeo();
    case 'curling': return curlingGeo(it.n ?? 3, seed);
    case 'snowballs': return snowballsGeo(it.n ?? 6, it.size ?? 0.32);
    case 'crystal': return crystalGeo(it.size ?? 1.6, seed);
    case 'iceblocks': return iceBlocksGeo(it.n ?? 3, seed);
    case 'leaves': return leafPileGeo(it.size ?? 0.8, seed);
    case 'track': return trackGeo(it.size ?? 10);
    case 'buoy': return buoyGeo();
    case 'signpost': return signpostGeo();
    case 'campfire': return campfireGeo();
    case 'bunting': return buntingGeo(it.size ?? 6, it.sag ?? 0.6, seed);
    case 'snowcap': return snowCapGeo(it.size ?? 2, seed);
    case 'drift': return snowDriftGeo(it.size ?? 1.2, seed);
    case 'bench': return benchGeo();
    case 'icicles_lo': return eiszapfenGeo(it.n ?? 3, it.size ?? 1, true).clone();
    case 'bigfir': return bigFirGeo(it.size ?? 7);
    case 'snowman_lo': return snowmanGeo(seed);
    case 'stall': return stallGeo(it.n ?? seed);
    case 'snowangel': return snowAngelGeo();
    case 'footprints': return footprintsGeo(it.n ?? 10, seed);
    case 'rowboat': return rowboatGeo();
    case 'fountain': return fountainGeo();
    case 'tomb': return tombGeo(seed);
    case 'spookfence': return spookFenceGeo(it.size ?? 6, seed);
    case 'igloo_lo': return iglooGeo(it.size ?? 3.4);
    case 'flowers_lo': return flowerClumpGeo(it.n ?? 5, seed);
    case 'pastelblock': return pastelBlockGeo(it.size ?? 1);
    case 'barrier_lo': return barrierGeo(it.size ?? 6);
    default: return null;
  }
}

/** Leuchtende Teile einer Requisite (Material 'glow'), sonst null. */
export function snowPropGlow(it) {
  switch (it.kind) {
    case 'lamp': return lampGlowGeo(it.size ?? 3);
    case 'cabin': return cabinGlowGeo(it.size?.[0] ?? 4, it.size?.[1] ?? 3.2);
    case 'bigfir': return bigFirGlowGeo(it.size ?? 7);
    case 'campfire': return campfireGlowGeo();
    case 'stall': return stallGlowGeo();
    default: return null;
  }
}

/** Kollision einer Welt-3-Requisite (begehbares Gelände): Zylinder/Quader oder null. */
export function snowPropShape(it) {
  const [x, y, z] = it.pos;
  const cyl = (r, h) => ({ type: 'cyl', x, z, r, y0: y - 0.2, y1: y + h, tag: `deko:${it.kind}` });
  switch (it.kind) {
    case 'firs': return cyl((it.r ?? 2.5) * 0.7, 3);
    case 'fir_lo': case 'fir': return cyl(0.45, 2.5);
    case 'bigfir': return cyl(0.5 + (it.size ?? 7) * 0.12, it.size ?? 7);
    case 'snowrock': return cyl((it.size ?? 0.8) * 0.9, (it.size ?? 0.8) * 1.2);
    case 'autumntree': case 'pasteltree': case 'baretree': return cyl(0.3, 3);
    case 'lamp': return cyl(0.25, (it.size ?? 3) + 0.8);
    case 'cabin': {
      const w = it.size?.[0] ?? 4, d = it.size?.[1] ?? 3.2;
      const c = Math.abs(Math.cos(it.yaw ?? 0)) > 0.7;
      const hx = (c ? w : d) / 2 + 0.3, hz = (c ? d : w) / 2 + 0.3;
      return { type: 'box', min: [x - hx, y - 0.2, z - hz], max: [x + hx, y + 3.5, z + hz], tag: 'deko:huette' };
    }
    case 'snowman': case 'snowman_lo': return cyl(0.5, 2.1);
    case 'pastelblock': { const k = (it.size ?? 1) / 2 + 0.05; return { type: 'box', min: [x - k, y - 0.2, z - k], max: [x + k, y + (it.size ?? 1), z + k], tag: 'deko:stein' }; }
    case 'igloo': case 'igloo_lo': return cyl((it.size ?? 3.4) / 2 + 0.1, 1.8);
    case 'iceblocks': return cyl(1.0, (it.n ?? 3) > 2 ? 2 : 1);
    case 'crystal': return cyl(0.5, it.size ?? 1.6);
    case 'signpost': return cyl(0.2, 2.4);
    case 'campfire': return cyl(0.75, 0.5);
    case 'bench': return { type: 'box', min: [x - 0.85, y - 0.2, z - 0.3], max: [x + 0.85, y + 0.6, z + 0.3], tag: 'deko:bank' };
    case 'stall': return { type: 'box', min: [x - 1.5, y - 0.2, z - 1.2], max: [x + 1.5, y + 2.6, z + 1.3], tag: 'deko:bude' };
    case 'fountain': return cyl(2.15, 1.0);
    case 'tomb': return cyl(0.45, 1.2);
    case 'spookfence': { const L = (it.size ?? 6) / 2; return { type: 'box', min: [x - L, y - 0.2, z - 0.15], max: [x + L, y + 1.2, z + 0.15], tag: 'deko:zaun' }; }
    case 'snowballs': return cyl(0.7, 0.9);
    case 'sled': return cyl(0.8, 0.45);
    case 'hedgebunny': return cyl(0.9, 2);
    case 'buoy': return cyl(0.2, 1.5);
    default: return null;
  }
}

// ------------------------------------------------------------------ Streudeko

/**
 * Winter-Streudeko auf nicht begehbaren Blöcken (deterministisch): Tannen (Wald dicht), verschneite Büsche und Felsen;
 * Herbstwiese mit Herbstbäumen und Laub, Pastell-Garten mit Pastellbäumen. Eis, See, Strand, Pflaster und noDeco
 * bleiben frei; auf Schneehügeln nur am Fuß, auf Bergen rundum am Fuß.
 */
export function scatterSnow(level, map, grid) {
  const parts = [];
  map.ground.forEach((b, i) => {
    const style = b.style ?? 'snow';
    if (b.walk || b.noDeco || ['ice', 'lakebed', 'snowbeach', 'paving'].includes(style)) return;
    const [x0, z0, x1, z1] = b.rect;
    const w = x1 - x0, d = z1 - z0;
    if (w < 2.5 || d < 2.5) return;
    const [cx, cz] = [(x0 + x1) / 2, (z0 + z1) / 2];
    if (grid.isWalk(cx, cz)) return;
    const rnd = new Rnd(0x5e0f + i * 131);
    const pts = [];
    const tooClose = (x, z, r) => pts.some((p) => Math.hypot(p[0] - x, p[1] - z) < r);
    const area = w * d;
    const foot = style === 'snowhill' ? 0.6 : style === 'peak' ? 0.8 : 0;
    const inner = (x, z) => !foot || Math.abs(x - cx) / (w / 2) > foot || Math.abs(z - cz) / (d / 2) > foot;
    const y = b.top;
    const put = (n, minD, make) => {
      for (let k = 0, tries = 0; k < n && tries < n * 14; tries++) {
        const x = rnd.real(x0 + 1.1, x1 - 1.1), z = rnd.real(z0 + 1.1, z1 - 1.1);
        if (tooClose(x, z, minD) || !inner(x, z)) continue;
        pts.push([x, z]);
        const g = make(rnd);
        if (g) parts.push(place(g, x, y, z, rnd.real(0, Math.PI * 2)));
        k++;
      }
    };
    const dens = b.trees ?? 1;
    if (style === 'autumn') {
      put(Math.max(1, Math.floor((area / 30) * dens)), 2.6, (r) => autumnTreeGeo(r.real(3.6, 5.4), r.int(1, 999)));
      put(Math.floor(area / 40), 1.4, (r) => leafPileGeo(r.real(0.5, 0.9), r.int(1, 999)));
      return;
    }
    if (style === 'pastel') {
      put(Math.max(1, Math.floor((area / 40) * dens)), 3, (r) => pastelTreeGeo(r.real(3.2, 4.6), r.int(1, 999)));
      return;
    }
    if (style === 'forest') {
      put(Math.max(2, Math.floor((area / 23) * dens)), 2.4, (r) => firLiteGeo(r.real(3.4, 5.8), r.int(1, 99)));
      put(Math.floor(area / 120), 1.4, (r) => snowRockGeo(r.real(0.5, 0.9), r.int(1, 999), 2));
      return;
    }
    const k = style === 'cliff' ? 0.3 : style === 'peak' ? 0.6 : 1;
    put(Math.max(1, Math.floor((area / 60) * k * dens)), 2.4, (r) => firLiteGeo(r.real(3.0, 5.0), r.int(1, 99)));
    put(Math.floor((area / 160) * k), 1.6, (r) => (r.frac() < 0.5 ? snowBushGeo(r.real(0.5, 0.8), r.int(1, 999)) : snowRockGeo(r.real(0.5, 0.9), r.int(1, 999), 2)));
  });
  for (const g of parts) level.view?.addStatic(g, { castShadow: true });
}

// ------------------------------------------------------------------ Nachbarwelt am Horizont

/** Schneeinsel als ferne Nachbarwelt (Ziel der Glasröhre aus Welt 2): Schneeblöcke, Tannen, Schneeberg. */
export function snowNeighborParts(nb, rnd) {
  const [x, z] = nb.pos;
  const [w, d] = nb.size ?? [60, 40];
  const parts = [];
  const blocks = [[-0.5, -0.5, 0.5, 0.5, 2.5], [-0.38, -0.42, 0.12, 0.08, 5.5], [0.05, -0.32, 0.4, 0.18, 4]];
  const fake = { top: 0 };
  for (const [a, c, e, f, top] of blocks) {
    const b = { ...fake, rect: [x + a * w, z + c * d, x + e * w, z + f * d], top, style: 'snow', drips: false };
    parts.push(...snowGround(b, -3, THEMES.map_snow, rnd));
  }
  parts.push(...peakParts(x - 0.2 * w, 5.5, z - 0.4 * d, x + 0.1 * w, z - 0.02 * d, 16, rnd));
  for (let i = 0; i < 9; i++) parts.push(place(firGeo(rnd.real(4.5, 7)), x + rnd.real(-0.45, 0.45) * w, 2.5, z + rnd.real(0.2, 0.45) * d, rnd.real(0, 6)));
  for (const p of parts) for (const k of Object.keys(p.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') p.deleteAttribute(k);
  return parts;
}

// ------------------------------------------------------------------ Lagune: Korallen und Wrack (Kartenqualität)

/** Koralle: 'ast' (verzweigte Stäbe mit Knubbeln) oder 'faecher' (flacher Fächer), ≈ 100–200 Dreiecke. */
export function coralGeo(kind = 'ast', seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  if (kind === 'faecher') {
    b.cyl(0.07, 0.11, 0.5, 0x8a4ac0, { p: [0, 0.25, 0] }, 5);
    b.sphere(0.75, { v: (x, y, z, nx, ny) => mix(0x8a4ac0, 0xe0b4ff, y / 0.75 * 0.5 + 0.5) }, { p: [0, 0.95, 0], s: [1, 0.85, 0.16] }, 8, 4);
    for (let i = 0; i < 5; i++) {
      const a = 0.35 + (i / 4) * (Math.PI - 0.7);
      b.sphere(0.08, 0xffd0ff, { p: [Math.cos(a) * 0.66, 0.95 + Math.sin(a) * 0.56, 0.1] }, 4, 2);
    }
    return b.geometry();
  }
  const c0 = 0xff6a5a, c1 = 0xffb49a;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + rnd.real(-0.3, 0.3), t = i === 0 ? 0 : rnd.real(0.35, 0.7), h = rnd.real(0.8, 1.35);
    const tip = [Math.cos(a) * Math.sin(t) * h, Math.cos(t) * h, Math.sin(a) * Math.sin(t) * h];
    const mid = [tip[0] * 0.45, tip[1] * 0.55, tip[2] * 0.45];
    b.tube([[0, 0, 0], mid, tip], 0.08, c0, null, 2, 5);
    b.sphere(0.12, c1, { p: tip }, 5, 3);
  }
  return b.geometry();
}

/** Kleines Wrack (halb im Wasser): Rumpf mit Bug, Deck mit Schnee, gebrochener Mast mit Segelfetzen, ≈ 150 Dreiecke. */
export function wreckGeo() {
  const b = new Build();
  const wood = { v: (x, y, z, nx, ny) => mix(0x4a2e1c, 0x8a5a34, ny * 0.3 + 0.5) };
  b.box(3.4, 1.3, 1.7, wood, { p: [0, 0.4, 0] }, 0.08, 1);
  b.cone(0.95, 1.4, wood, { p: [2.35, 0.4, 0], r: [0, 0, -Math.PI / 2], s: [1, 1, 0.9] }, 4);
  b.box(3.3, 0.12, 1.5, 0x4a2e1c, { p: [0, 1.08, 0] }, 0, 1);
  b.box(2.5, 0.14, 1.2, 0xf6f9fd, { p: [-0.25, 1.17, 0] }, 0, 1);
  b.cyl(0.09, 0.11, 2.6, 0x6a4428, { p: [0.2, 2.4, 0], r: [0, 0, 0.18] }, 6);
  b.box(1.4, 0.08, 0.08, 0x6a4428, { p: [0.0, 3.1, 0], r: [0, 0, 0.18] }, 0, 1);
  b.box(0.05, 1.05, 1.15, 0xe8e0cc, { p: [-0.05, 2.5, 0.1], r: [0.12, 0, 0.18] }, 0, 1);
  for (const bx of [-1, 0, 1]) b.cyl(0.13, 0.13, 0.04, 0x1a2a3a, { p: [bx, 0.55, 0.86], r: [Math.PI / 2, 0, 0] }, 6);
  const g = b.geometry();
  g.rotateX(0.12);
  g.rotateZ(-0.1);
  return g;
}

// ------------------------------------------------------------------ Schneebrücke (Weltdaten segments: { type: 'snowbridge', … })

/**
 * Holzbrücke mit Schnee in Kartenqualität: Kollision wie der Standard-Baustein `bridge` (from, to, width), Optik
 * sparsam (schlichte Planken, Seitenbalken, Pfosten mit Schneehauben, Geländer mit Schneeleiste; ≈ 15 % der Dreiecke).
 */
export function buildSnowBridge(level, spec) {
  buildBridge({ world: level.world, view: null }, { ...spec, rails: false });
  if (!level.view) return;
  const a = spec.from, c = spec.to;
  const dx = c[0] - a[0], dz = c[2] - a[2], L = Math.hypot(dx, dz);
  if (L < 0.01) return;
  const w = spec.width ?? 2, slope = (c[1] - a[1]) / L, pitch = Math.atan(slope);
  const yaw = Math.atan2(-dz / L, dx / L);
  const plank = spec.color ?? 0xb07a44, plankTop = 0xc8955a, dark = 0x6a4428;
  const rnd = new Rnd(Math.round(L * 31 + a[0] * 7));
  const b = new Build();
  const np = Math.max(1, Math.floor(L / 0.5));
  for (let i = 0; i < np; i++) {
    const t = (i + 0.5) / np, snowy = rnd.frac() < 0.3;
    b.box(0.44, 0.14, w, { v: (x, y, z, nx, ny) => (ny > 0.5 ? (snowy ? 0xeef3f9 : plankTop) : plank) }, { p: [t * L, slope * t * L - 0.07, 0], r: [0, 0, pitch] }, 0, 1);
  }
  for (const s of [-1, 1]) {
    b.box(L + 0.2, 0.24, 0.16, dark, { p: [L / 2, slope * L / 2 - 0.2, s * (w / 2 - 0.08)], r: [0, 0, pitch] }, 0, 1);
    const nPost = Math.max(2, Math.round(L / 2) + 1);
    for (let i = 0; i < nPost; i++) {
      const t = i / (nPost - 1);
      b.box(0.14, 0.78, 0.14, plank, { p: [t * L, slope * t * L + 0.39, s * (w / 2 - 0.06)] }, 0, 1);
      b.sphere(0.12, 0xffffff, { p: [t * L, slope * t * L + 0.8, s * (w / 2 - 0.06)], s: [1.2, 0.6, 1.2] }, 5, 2);
    }
    b.box(L, 0.1, 0.12, plank, { p: [L / 2, slope * L / 2 + 0.7, s * (w / 2 - 0.06)], r: [0, 0, pitch] }, 0, 1);
    b.box(L, 0.05, 0.15, 0xf6f9fd, { p: [L / 2, slope * L / 2 + 0.77, s * (w / 2 - 0.06)], r: [0, 0, pitch] }, 0, 1);
  }
  const g = b.geometry();
  g.rotateY(yaw);
  g.translate(a[0], a[1], a[2]);
  level.view.addStatic(g, { castShadow: true });
}
