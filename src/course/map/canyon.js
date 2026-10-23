// Gelände, Ränder, Streudeko, Requisiten und Verbindungen der Welt-4-Inselkette „Canyon“ (eigene Gestaltung,
// Spielzeug-Look wie Welt 1–3): rote Sandstein-Inseln mit gestapelten Gesteinsbändern (Rot, Orange, Creme), sandige
// Deckschicht, hohe Tafelberge, Felsnadeln im Meer, Giftwald mit violettem Sumpf, grüne Bergwiese auf rotem Fels,
// Ruinen-Pflaster, Metallplatten am Lautsprecherturm, dunkle Basalt-Fliesen mit glühenden Fugen an der Lava-Burg,
// blaugraue Festungsplatten. Ränder: niedrige Mäuerchen aus roten Felsbrocken bzw. Seilzäune. Verbindungen zwischen den
// Inseln: Hängebrücken (Planken, durchhängende Seile, Pfosten) und Felsbögen (begehbarer Sandsteinbogen über dem Meer).
// Thema 'map_canyon' (warmes Nachmittagslicht, ockerfarbener Dunst, rote Tafelberge am Horizont) meldet sich hier in
// THEMES an.
//
// Alle Geometrien in Weltkoordinaten bzw. mit Fußpunkt im Ursprung (Vorderseite +Z, zur Kamera) und Vertexfarben
// (position/normal/color) für view.addStatic (Karten-Kacheln, MapBatcher). Flache Deckschichten tragen
// userData.noShadow (kein Schattenwurf), glänzende/leuchtende userData.material ('stone' | 'glow').

import * as THREE from 'three';
import { mix, TAU } from '../models/lib/kit.js';
import { roundedBox, SIDE, colorize, lin, mixc, smooth, Rnd } from '../../three/world/geometry.js';
import { alignedGrid, islandParts } from '../blocks/kit.js';
import { THEMES } from '../view/themes.js';
import { hillRing } from '../view/backdrop_w2.js';
import { LowBuild as Build, place, desertGround, cactusGeo, barrelCactusGeo, shrubGeo, desertRockGeo, ruinArchGeo, columnGeo } from './desert.js';
import { buildBridge } from '../blocks/types/bridge.js';

export const CANYON_STYLES = new Set(['canyon', 'canyonlow', 'mesa', 'beach', 'meadow', 'poison', 'marsh', 'swamp', 'tech', 'ruins', 'castle', 'fortress']);

// ------------------------------------------------------------------ Thema der Canyon-Inseln

if (!THEMES.map_canyon) {
  THEMES.map_canyon = {
    ...THEMES.grass,
    label: 'Weltkarte Canyon',
    sky: [[1, 0x2c74d2], [0.45, 0x5aa6ee], [0.15, 0xa6d2f0], [0.04, 0xf4dcbc], [0, 0xffd6a8], [-0.1, 0xeab384], [-1, 0xbc7e54]],
    background: 0xf3dcc2,
    fog: { color: 0xf1dcc6, near: 85, far: 310 },
    hemi: { sky: 0xffeedc, ground: 0xb8704a, intensity: 1.3 },
    sun: { color: 0xffe6c4, intensity: 2.7, dir: [-0.5, 1, 0.45] },
    ground: null,
    clouds: false,
    backdrop: 'canyon',
    grassTop: 0x8ad04e, grassTop2: 0x7cc446, grassRim: 0xb4ec7a, grassSide: 0x5aa83a,
    dirt: 0xc0623a, dirtDeep: 0x8a3e24, rock: 0xb4583a, rockDeep: 0x7a3a26,
    stone: 0xe8d2b0, stoneDark: 0xc4a47c,
    wood: 0xc8925a, woodDark: 0x7a4a2a,
    water: 0x4ec8e4, waterDeep: 0x1c64b4,
    // ferne rote Tafelberge und Hügel ringsum (ein Mesh)
    buildBackdrop(sky, bounds, rnd, yBase) {
      hillRing(sky, bounds, rnd, yBase, { near: [0xe0a070, 0xa8603c], far: [0xeab88c, 0xbc7c58], mesas: 12,
        mesaColors: [0xc85a32, 0xb04a2a, 0xe08850, 0x9a3e24], mesaCap: 0xf0b884 });
    },
  };
}

// ------------------------------------------------------------------ Farben

const RED = [0xc4552e, 0xd8743e, 0xa8432a, 0xe89656, 0xb84e2c, 0xf2b676, 0xcc6236];   // Sandstein-Bänder
const MESA = [0xb84a2a, 0xd06a38, 0x9c3c24, 0xe8925a, 0xc45a30, 0xf4c088, 0xa84630];
const BASALT = [0x3a2e34, 0x4a3a40, 0x2e2428, 0x54424a];
const VIOLET = [0x5a3a5a, 0x4a3050, 0x6a4466, 0x553858];
const SLATE = [0x5a6478, 0x4a5468, 0x6a7488, 0x56607a];
export const SANDTOP = { top: 0xe9ab6e, top2: 0xdc9a5e, rim: 0xf6cc96, side: 0xcc7a48, dust: 0xf2c690 };

const hash2 = (x, z) => { const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return h - Math.floor(h); };
function flat(g, material) { if (g) { g.userData.noShadow = true; if (material) g.userData.material = material; } return g; }

// ------------------------------------------------------------------ Geländestile

/**
 * Gelände-Block der Canyon-Inseln (Box x0..x1 × z0..z1 von base bis top). style:
 *   'canyon'    begehbarer roter Sandstein: Bänder, sandige Decke mit runder Kante, 2-m-Raster obenauf
 *   'canyonlow' wie 'canyon', grobe Decke (nicht begehbare Ränder, Streudeko: Kakteen, Büsche, Felsen)
 *   'mesa'      Tafelberg: dicke, versetzte Bänder, flache helle Kappe (Streudeko: Büsche, Felsnadeln)
 *   'beach'     Sandstrand            'meadow'  grüne Bergwiese auf rotem Fels
 *   'poison'    Giftwald-Boden (violette Erde, Moos)   'marsh'  Giftmarsch mit Pfützen   'swamp'  Giftsumpf (glänzt)
 *   'tech'      Metallplatten mit Warnstreifen (Turm-Insel)   'ruins'  helles Ruinen-Pflaster mit Rissen
 *   'castle'    Basalt-Fliesen mit glühenden Fugen (Lava-Burg)  'fortress'  blaugraue Festungsplatten
 *   'lavarock' / 'basin' (Welt 2, desert.js)
 * Liefert Teil-Geometrien.
 */
export function canyonGround(b, base, theme, rnd) {
  const [x0, z0, x1, z1] = b.rect;
  const top = b.top;
  const style = b.style ?? 'canyon';
  const parts = [];
  if (style === 'lavarock' || style === 'basin') return desertGround(b, base, theme, rnd);
  if (style === 'beach') return islandParts(x0, base, z0, x1, top, z1, { ...theme, dirt: 0xd4955e, dirtDeep: 0xa8643a }, { under: 0, rnd, top: 'sand', cell: 2 });
  if (style === 'meadow') {
    const ps = islandParts(x0, base, z0, x1, top, z1, theme, { under: 0, rnd, top: 'grass', cell: 2 });
    return ps;
  }
  if (style === 'swamp') {
    strata(parts, x0, base, z0, x1, top - 0.25, z1, VIOLET, rnd, 0.8, 0.08);
    // Giftsumpf: glänzende violett-grüne Fläche mit Schlieren (Material 'stone' glänzt)
    const a = lin(0x6a2a8a), c = lin(0x9a4ac0), gr = lin(0x5aa83a), dk = lin(0x3a1a52);
    const surf = smoothGrid(x0 + 0.05, z0 + 0.05, x1 - 0.05, z1 - 0.05, top - 0.12, 2, (x, z) => {
      const n = 0.5 + 0.3 * Math.sin(x * 0.45 + z * 0.3) + 0.2 * Math.sin(z * 0.7 - x * 0.35);
      const o = mixc(a, c, Math.min(1, Math.max(0, n)), [0, 0, 0]);
      if (n > 0.86) mixc(o, gr, 0.45, o);
      if (n < 0.22) mixc(o, dk, 0.4, o);
      return o;
    });
    parts.push(flat(surf, 'stone'));
    // schlammiger Rand
    const rim = roundedBox(x1 - x0 + 0.1, 0.3, z1 - z0 + 0.1, 0.1, SIDE.ALL & ~SIDE.NY & ~SIDE.PY, 0, 1);
    colorize(rim, (p, n, o) => mixc(lin(0x3e2a3e), lin(0x5a4256), smooth(0, 1, n.y), o));
    rim.translate((x0 + x1) / 2, top - 0.2, (z0 + z1) / 2);
    parts.push(rim);
    return parts;
  }
  const P = PALETTES[style] ?? PALETTES.canyon;
  const capH = P.capH ?? 0.32;
  strata(parts, x0, base, z0, x1, top - capH, z1, P.bands, rnd, P.layer ?? 0.9, P.jitter ?? 0.12);
  // Decke mit runder Oberkante
  const lip = P.lip ?? 0.08;
  const r = Math.min(0.16, capH * 0.45);
  const cap = roundedBox(x1 - x0 + lip * 2, capH, z1 - z0 + lip * 2, r, SIDE.ALL & ~SIDE.NY, 0, 1);
  const side = lin(P.side), rim = lin(P.rim);
  colorize(cap, (p, n, o) => mixc(side, rim, smooth(0.15, 0.85, n.y), o));
  cap.translate((x0 + x1) / 2, top - capH / 2, (z0 + z1) / 2);
  parts.push(cap);
  const ins = r + lip * 0.5;
  const gx0 = x0 - lip + ins, gx1 = x1 + lip - ins, gz0 = z0 - lip + ins, gz1 = z1 + lip - ins;
  if (gx1 > gx0 && gz1 > gz0) {
    const cell = b.walk ? (P.cell ?? 2) : (P.cellOff ?? 4);
    parts.push(flat(alignedGrid(gx0, gz0, gx1, gz1, top + 0.004, cell, P.tile(rnd, b))));
  }
  // Lava-Burg: glühende Fugen zwischen den Basaltfliesen (Material 'glow', ohne Schatten)
  if (style === 'castle' && b.walk) parts.push(flat(castleCracks(x0, z0, x1, z1, top + 0.012, rnd), 'glow'));
  // Turm-Insel: gelb-schwarze Warnstreifen am Rand
  if (style === 'tech' && b.walk) parts.push(flat(hazardBorder(x0, z0, x1, z1, top + 0.01)));
  return parts;
}

const tone = (a, c, k, out = [0, 0, 0]) => mixc(lin(a), lin(c), k, out);

const PALETTES = {
  canyon: {
    bands: RED, side: SANDTOP.side, rim: SANDTOP.rim,
    tile: (rnd) => (i, j, ax, az) => {
      const blk = (Math.floor((ax + 1.01) / 2) + Math.floor((az + 1.01) / 2)) & 1;
      const o = tone(blk ? SANDTOP.top : SANDTOP.top2, SANDTOP.dust, rnd.frac() * 0.25);
      const h = hash2(Math.floor(ax / 2) - 11, Math.floor(az / 2) + 5);
      if (h > 0.9) mixc(o, lin(0xc8704a), 0.45, o);          // rötliche Sandsteinplatte
      else if (h < 0.06) mixc(o, lin(0xf6dcae), 0.5, o);     // ausgebleichte Platte
      return o;
    },
  },
  canyonlow: {
    bands: RED, side: SANDTOP.side, rim: SANDTOP.rim, cellOff: 4,
    tile: (rnd) => () => tone(0xdc9a5e, 0xc8844c, rnd.frac() * 0.6),
  },
  mesa: {
    bands: MESA, side: 0xd88a52, rim: 0xf6c896, layer: 1.25, jitter: 0.28, capH: 0.3, cellOff: 4,
    tile: (rnd) => () => tone(0xe2a872, 0xcf8f58, rnd.frac() * 0.7),
  },
  poison: {
    bands: VIOLET, side: 0x4a6a3a, rim: 0x7aa04e, cell: 2,
    tile: (rnd) => (i, j, ax, az) => {
      // Moos in zwei Grüntönen, selten ein violett schimmernder Giftfleck
      const h = hash2(Math.floor(ax / 2) + 7, Math.floor(az / 2) - 3);
      const o = tone(0x6c9c48, 0x5c8c40, rnd.frac() * 0.6 + (((Math.floor(ax / 2) + Math.floor(az / 2)) & 1) ? 0.25 : 0));
      if (h > 0.93) mixc(o, lin(0x8a6aa0), 0.45, o);
      return o;
    },
  },
  marsh: {
    bands: VIOLET, side: 0x4a6a3a, rim: 0x6a8a46, cellOff: 2,
    tile: (rnd) => (i, j, ax, az) => (hash2(Math.floor(ax / 2), Math.floor(az / 2)) > 0.7 ? tone(0x6a4a7a, 0x7a5a8a, rnd.frac()) : tone(0x587a3c, 0x4a6a34, rnd.frac())),
  },
  tech: {
    bands: RED, side: 0x7a8494, rim: 0xb8c0cc, cell: 2,
    tile: (rnd) => (i, j, ax, az) => {
      const blk = (Math.floor((ax + 1.01) / 2) + Math.floor((az + 1.01) / 2)) & 1;
      return tone(blk ? 0xaab2be : 0x9aa2b0, 0x8890a0, rnd.frac() * 0.3);
    },
  },
  ruins: {
    bands: RED, side: 0xc8a882, rim: 0xf0dcbc, cell: 1,
    tile: (rnd) => (i, j, ax, az) => {
      const h = hash2(ax, az);
      if (h > 0.93) return tone(0xb08a64, 0xa07a56, rnd.frac());          // fehlende Platte
      return tone(0xead6b2, 0xd8c098, rnd.frac() * 0.8 + (((Math.floor(ax) + Math.floor(az)) & 1) ? 0.15 : 0));
    },
  },
  castle: {
    bands: BASALT, side: 0x4a3c44, rim: 0x6a5a62, cell: 2, cellOff: 4,
    tile: (rnd) => () => tone(0x4e4248, 0x5e5058, rnd.frac()),
  },
  fortress: {
    bands: SLATE, side: 0x6a7488, rim: 0x9aa6bc, cell: 2,
    tile: (rnd) => (i, j, ax, az) => {
      const blk = (Math.floor((ax + 1.01) / 2) + Math.floor((az + 1.01) / 2)) & 1;
      return tone(blk ? 0x8a96ae : 0x7a86a0, 0x6a7690, rnd.frac() * 0.3);
    },
  },
};

/** Versetzte Gesteinsbänder (Quader je Schicht, abwechselnde Farben, leicht ein-/ausgerückt). */
function strata(parts, x0, y0, z0, x1, y1, z1, colors, rnd, layer, jitter) {
  const h = y1 - y0;
  if (h <= 0.02) return;
  const n = Math.max(1, Math.round(h / layer));
  const lh = h / n;
  for (let i = 0; i < n; i++) {
    const inset = (i % 2 ? jitter : 0) + rnd.real(0, jitter * 0.5);
    const c = lin(colors[(i * 3 + Math.floor(rnd.frac() * 2)) % colors.length]);
    const dark = mixc(c, [0, 0, 0], 0.22, [0, 0, 0]);
    const w = Math.max(0.2, x1 - x0 - inset * 2), d = Math.max(0.2, z1 - z0 - inset * 2);
    const g = colorize(new THREE.BoxGeometry(w, lh, d), (p, nn, o) => {
      if (nn.y < -0.5) { o[0] = dark[0] * 0.8; o[1] = dark[1] * 0.8; o[2] = dark[2] * 0.8; return; }
      const k = Math.abs(nn.x) > 0.5 ? 0.9 : 1;    // Seiten nach ±X etwas dunkler (Kanten lesbar)
      o[0] = c[0] * k; o[1] = c[1] * k; o[2] = c[2] * k;
    });
    g.translate((x0 + x1) / 2, y0 + lh * (i + 0.5), (z0 + z1) / 2);
    parts.push(g);
  }
}

/** Raster mit weichen Farbverläufen je Ecke (keine Kacheln). */
function smoothGrid(x0, z0, x1, z1, y, cell, colorAt) {
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
  return g;
}

/** Glühende Fugen: schmale Leisten entlang einiger Fliesengrenzen (2-m-Raster), zufällig unterbrochen. */
function castleCracks(x0, z0, x1, z1, y, rnd) {
  const b = new Build();
  for (let x = Math.ceil(x0 / 2) * 2; x < x1; x += 2) {
    for (let z = Math.ceil(z0 / 2) * 2; z < z1 - 2; z += 2) if (rnd.frac() < 0.35) b.box(0.1, 0.02, 2, 0xff7a1a, { p: [x, y, z + 1] }, 0);
  }
  for (let z = Math.ceil(z0 / 2) * 2; z < z1; z += 2) {
    for (let x = Math.ceil(x0 / 2) * 2; x < x1 - 2; x += 2) if (rnd.frac() < 0.3) b.box(2, 0.02, 0.1, 0xffa03a, { p: [x + 1, y, z] }, 0);
  }
  return b.parts.length ? b.geometry() : null;
}

/** Gelb-schwarze Warnstreifen als Rahmen (0,4 m) um eine Fläche. */
function hazardBorder(x0, z0, x1, z1, y) {
  const b = new Build();
  const W = 0.4;
  const strip = (ax, az, bx, bz) => {
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 0.6));
    const ux = (bx - ax) / len, uz = (bz - az) / len;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      b.box(Math.abs(ux) > 0.5 ? len / n : W, 0.02, Math.abs(uz) > 0.5 ? len / n : W, i % 2 ? 0x22222a : 0xffc21a, { p: [ax + (bx - ax) * t, y, az + (bz - az) * t] }, 0);
    }
  };
  strip(x0 + 0.5, z0 + 0.5, x1 - 0.5, z0 + 0.5); strip(x0 + 0.5, z1 - 0.5, x1 - 0.5, z1 - 0.5);
  strip(x0 + 0.5, z0 + 0.5, x0 + 0.5, z1 - 0.5); strip(x1 - 0.5, z0 + 0.5, x1 - 0.5, z1 - 0.5);
  return b.geometry();
}

// ------------------------------------------------------------------ Ränder

/** Niedriges Mäuerchen aus roten Felsbrocken entlang +X (Länge len) – sichtbare Grenze zu gleich hohem Gelände. */
export function redRockWallGeo(len, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  b.box(len, 0.42, 0.7, { v: (x, y, z, nx, ny) => mix(0xa8482a, 0xd8743e, ny * 0.5 + 0.5) }, { p: [0, 0.21, 0] }, 0);
  const n = Math.max(1, Math.round(len / 0.9));
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i + 0.5) * (len / n), r = rnd.real(0.36, 0.5);
    b.add(new THREE.DodecahedronGeometry(r, 0), { v: (px, py, pz, nx, ny) => mix(0xb04e2c, 0xf0a868, Math.max(0, ny) * 0.75 + 0.1) },
      { p: [x + rnd.real(-0.12, 0.12), 0.42 + r * 0.45, rnd.real(-0.08, 0.08)], r: [rnd.real(0, 3), rnd.real(0, 3), 0], s: [1.15, 0.8, 0.95] });
  }
  return b.geometry();
}

/** Rand-Optik der Canyon-Welt nach Art ('redrock'), sonst null. */
export function canyonEdgeGeo(kind, len, seed) {
  if (kind === 'redrock') return redRockWallGeo(len + 0.1, seed);
  return null;
}

// ------------------------------------------------------------------ Pflanzen und Felsen (Kartenqualität)

/** Felsnadel: gestapelte, sich verjüngende Bänder, oben ein breiter Deckstein (Hoodoo). color 'dark' = Basalt. */
export function needleGeo(h = 8, seed = 1, dark = false) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const bands = dark ? BASALT : MESA;
  const n = Math.max(3, Math.round(h / 1.4));
  const r0 = 0.45 + h * 0.11;
  let y = 0;
  for (let i = 0; i < n; i++) {
    const lh = h / n, k = 1 - (i / n) * 0.55;
    const r = r0 * k * rnd.real(0.9, 1.05);
    b.cyl(r * 0.94, r, lh + 0.02, bands[(i * 3 + seed) % bands.length], { p: [rnd.real(-0.06, 0.06) * h * 0.1, y + lh / 2, 0], r: [0, rnd.real(0, 3), 0] }, 7);
    y += lh;
  }
  // Deckstein
  const cr = r0 * 0.75;
  b.cyl(cr, cr * 0.8, h * 0.08 + 0.3, dark ? 0x2a2026 : 0x8a3a22, { p: [0, h + h * 0.04 + 0.12, 0], r: [0.05, 0, -0.04] }, 7);
  b.cyl(cr * 0.9, cr, 0.12, dark ? 0x5a4650 : 0xf2c088, { p: [0, h + h * 0.08 + 0.33, 0] }, 7);
  return b.geometry();
}

/** Felsbogen im Meer (Kulisse): zwei Beine und ein Bogen aus Sandstein-Bändern, ≈ 9 m breit. */
export function seaArchGeo(s = 1) {
  const b = new Build();
  const W = 9 * s, H = 8 * s, T = 2.2 * s;
  const sh = new THREE.Shape();
  sh.moveTo(-W / 2, -1); sh.lineTo(-W / 2, H); sh.lineTo(W / 2, H); sh.lineTo(W / 2, -1); sh.lineTo(W / 2 - 2.2 * s, -1);
  sh.absellipse(0, -1, W / 2 - 2.2 * s, H - 2.4 * s, 0, Math.PI, false);
  sh.lineTo(-W / 2, -1);
  b.extrude(sh, T, (x, y) => MESA[Math.abs(Math.floor((y + 1) / (1.1 * s))) % MESA.length], {}, 0, 10);
  b.box(W + 0.4, 0.3 * s, T + 0.4, 0xf2c088, { p: [0, H + 0.1, 0] }, 0);
  return b.geometry();
}

/** Großer Felsbrocken (zwei, drei runde Brocken in Rot-Ocker). */
export function boulderGeo(r = 1, seed = 1) { return desertRockGeo(r, seed); }

/** Kleiner Ameisenhügel: Kegel aus Erde mit Löchern und Krümeln. */
export function anthillSmallGeo(s = 1) {
  const b = new Build();
  b.cone(1.1 * s, 1.2 * s, { v: (x, y, z, nx, ny) => mix(0x9a5a34, 0xc8844c, y / (1.2 * s) + 0.5) }, { p: [0, 0.6 * s, 0] }, 9);
  b.sphere(0.32 * s, 0xb87444, { p: [0, 1.18 * s, 0], s: [1, 0.55, 1] }, 7, 4);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + 0.6;
    b.cyl(0.11 * s, 0.11 * s, 0.05, 0x2a160e, { p: [Math.cos(a) * 0.55 * s, 0.55 * s, Math.sin(a) * 0.55 * s], r: [Math.cos(a) * 0.9, 0, -Math.sin(a) * 0.9] }, 6);
  }
  return b.geometry();
}

/** Giftbaum: krummer dunkler Stamm, knubbelige violett-grüne Krone mit Giftbeeren. */
export function poisonTreeGeo(h = 4, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const bend = rnd.real(-0.4, 0.4);
  const pts = [[0, 0, 0], [bend * 0.4, h * 0.25, 0.1], [-bend * 0.3, h * 0.45, -0.1], [bend * 0.6, h * 0.62, 0]];
  b.tube(pts, 0.16 + h * 0.02, { v: (x, y) => mix(0x2a1e2e, 0x4a3646, y / h) }, null, 8, 6);
  const top = pts[3];
  const pal = rnd.frac() < 0.5 ? [0x5a2a7a, 0x9a5ac8] : [0x2e6a3a, 0x7ac25a];
  for (const [dx, dy, dz, r] of [[0, 0.45, 0, 1], [-0.75, 0.15, 0.2, 0.75], [0.75, 0.2, -0.15, 0.8], [0.1, 0.95, -0.1, 0.62]]) {
    b.sphere(h * 0.2 * r, { v: (x, y, z, nx, ny) => mix(pal[0], pal[1], ny * 0.5 + 0.5) }, { p: [top[0] + dx * h * 0.2, top[1] + dy * h * 0.2, top[2] + dz * h * 0.2] }, 8, 5);
  }
  for (let i = 0; i < 4; i++) {
    const a = rnd.real(0, TAU);
    b.sphere(0.1, 0xd23aff, { p: [top[0] + Math.cos(a) * h * 0.18, top[1] + rnd.real(-0.1, 0.4) * h * 0.2, top[2] + Math.sin(a) * h * 0.18] }, 5, 3);
  }
  return b.geometry();
}

/** Fliegenpilze (Giftwald): drei rote Hüte mit weißen Punkten. */
export function toadstoolsGeo(seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  for (let i = 0; i < 3; i++) {
    const s = rnd.real(0.6, 1.1), x = rnd.real(-0.6, 0.6), z = rnd.real(-0.5, 0.5);
    b.cyl(0.08 * s, 0.1 * s, 0.4 * s, 0xf6ecd8, { p: [x, 0.2 * s, z] }, 6);
    b.dome(0.28 * s, (px, py) => (hash2(px * 9, py * 9) > 0.8 ? 0xffffff : 0xe8283a), { p: [x, 0.38 * s, z], s: [1, 0.75, 1] }, Math.PI / 2, 8, 3);
  }
  return b.geometry();
}

/** Rankenschnapper-Ranke an einem Pfahl (Kulisse): grüne, gewundene Ranke mit Schnappkopf oben. */
export function vineGeo(h = 2.2, seed = 1) {
  const b = new Build();
  const pts = [];
  for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push([Math.sin(t * 7 + seed) * 0.25, t * h, Math.cos(t * 7 + seed) * 0.25]); }
  b.tube(pts, 0.09, { v: (x, y) => mix(0x2e7a2a, 0x6ac83a, y / h) }, null, 16, 5);
  for (let i = 1; i < 7; i += 2) b.sphere(0.16, 0x58b83a, { p: [pts[i][0] * 1.6, pts[i][1], pts[i][2] * 1.6], s: [1.4, 0.4, 0.8] }, 6, 3);
  const top = pts[8];
  b.sphere(0.36, { v: (x, y, z, nx, ny) => (ny > 0.1 ? mix(0x6a2a9a, 0xb45ae0, ny) : 0xffffff) }, { p: [top[0], top[1] + 0.25, top[2] + 0.1], s: [1, 0.85, 1.1] }, 9, 6);
  b.sphere(0.07, 0xffffff, { p: [top[0] + 0.12, top[1] + 0.38, top[2] + 0.4] }, 5, 3);
  return b.geometry();
}

/** Runder Laubbaum für die Bergwiese. */
export function meadowTreeGeo(h = 4.2, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  b.cyl(0.16, 0.24, h * 0.45, { v: (x, y) => mix(0x5c3a22, 0x8a5a36, y / h + 0.5) }, { p: [0, h * 0.22, 0] }, 6, true);
  const pal = rnd.frac() < 0.5 ? [0x3d8f32, 0x8ad04e] : [0x4a9a3a, 0xb4e06a];
  for (const [dx, dy, dz, r] of [[0, 0.68, 0, 1.0], [-0.55, 0.52, 0.2, 0.72], [0.55, 0.56, -0.15, 0.76]]) {
    b.sphere(h * 0.24 * r, { v: (x, y, z, nx, ny) => mix(pal[0], pal[1], ny * 0.5 + 0.5) }, { p: [dx * h * 0.24, dy * h, dz * h * 0.24] }, 9, 6);
  }
  return b.geometry();
}

/** Planwagen (Wildwest-Kulisse an der Ankunftsbucht). Vorderseite +Z. */
export function wagonGeo() {
  const b = new Build();
  b.box(1.6, 0.5, 3.0, (x, y, z, nx, ny) => (Math.abs(ny) > 0.5 ? 0xb07a44 : 0x8a5a30), { p: [0, 0.75, 0] }, 0);
  for (let i = 0; i < 4; i++) b.torus(0.78, 0.06, 0xf4ecdc, { p: [0, 1.0, -1.2 + i * 0.8], r: [0, Math.PI / 2, 0] }, 4, 12, Math.PI);
  b.cyl(0.79, 0.79, 3.0, { v: (x, y) => mix(0xe8dcc4, 0xfff8ea, y) }, { p: [0, 1.0, 0], r: [Math.PI / 2, 0, 0] }, 12, true);
  for (const [x, z, r] of [[-0.85, -1.0, 0.5], [0.85, -1.0, 0.5], [-0.85, 1.0, 0.42], [0.85, 1.0, 0.42]]) {
    b.torus(r, 0.06, 0x5a3a20, { p: [x, r, z], r: [0, Math.PI / 2, 0] }, 4, 14);
    b.cyl(0.08, 0.08, 0.12, 0x5a3a20, { p: [x, r, z], r: [0, 0, Math.PI / 2] }, 6);
  }
  b.box(0.08, 0.08, 1.6, 0x6a4424, { p: [-0.3, 0.55, 2.2], r: [0.2, 0, 0] }, 0);
  b.box(0.08, 0.08, 1.6, 0x6a4424, { p: [0.3, 0.55, 2.2], r: [0.2, 0, 0] }, 0);
  return b.geometry();
}

/** Kabeltrommel (Turm-Insel). */
export function spoolGeo() {
  const b = new Build();
  for (const s of [-1, 1]) b.cyl(0.75, 0.75, 0.12, 0xb07a44, { p: [s * 0.45, 0.75, 0], r: [0, 0, Math.PI / 2] }, 12);
  b.cyl(0.45, 0.45, 0.8, 0x2a2a34, { p: [0, 0.75, 0], r: [0, 0, Math.PI / 2] }, 10);
  b.cyl(0.1, 0.1, 0.4, 0xffc21a, { p: [0, 0.75, 0.5], r: [Math.PI / 2, 0, 0] }, 6);
  return b.geometry();
}

/** Lampenmast mit Strahler (Turm-Insel); das Licht liefert lightPoleGlowGeo. */
export function lightPoleGeo() {
  const b = new Build();
  b.cyl(0.25, 0.3, 0.3, 0x4a5262, { p: [0, 0.15, 0] }, 8);
  b.cyl(0.07, 0.09, 4.2, 0x6a7484, { p: [0, 2.2, 0] }, 6);
  b.box(1.4, 0.1, 0.1, 0x6a7484, { p: [0, 4.2, 0] }, 0);
  for (const s of [-1, 1]) b.box(0.36, 0.3, 0.3, 0x3a4252, { p: [s * 0.6, 4.0, 0.06] }, 0);
  return b.geometry();
}
export function lightPoleGlowGeo() {
  const b = new Build();
  for (const s of [-1, 1]) b.box(0.28, 0.22, 0.04, 0xfff2b0, { p: [s * 0.6, 3.97, 0.22] }, 0);
  return b.geometry();
}

/** Mauerrest der Ruinenstadt: zerbrochene Sandsteinmauer mit Bogenfenster, Länge len. */
export function ruinWallGeo(len = 5, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const n = Math.max(2, Math.round(len / 0.9));
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i + 0.5) * (len / n);
    const h = 1.2 + Math.abs(Math.sin(i * 1.7 + seed)) * 2.2 * (i === 1 || i === n - 2 ? 1 : 0.6);
    for (let y = 0, k = 0; y < h; y += 0.6, k++) b.box(len / n - 0.06, Math.min(0.58, h - y), 0.8, (k + i) % 2 ? 0xead6b2 : 0xd8c098, { p: [x + (k % 2 ? 0.05 : -0.05), y + Math.min(0.58, h - y) / 2, 0] }, 0);
  }
  b.box(0.5, 0.5, 0.5, 0xd8c098, { p: [len / 2 + 0.6, 0.25, 0.6], r: [0.2, 0.5, 0.1] }, 0);
  b.box(0.4, 0.4, 0.4, 0xead6b2, { p: [-len / 2 - 0.4, 0.2, 0.7], r: [0.1, 1.1, 0.2] }, 0);
  void rnd;
  return b.geometry();
}

/** Fackel mit Flammenkegel (Glühen über das Material 'glow'). */
export function torchFlameGeo() {
  const b = new Build();
  b.cone(0.2, 0.55, 0xffa03a, { p: [0, 2.08, 0] }, 7);
  b.cone(0.11, 0.36, 0xfff0a0, { p: [0, 2.0, 0] }, 6);
  return b.geometry();
}

/**
 * Requisite nach Art (map.props, Welt 4): Geometrie mit Fußpunkt im Ursprung, oder null.
 */
export function canyonPropGeo(it, seed) {
  switch (it.kind) {
    case 'needle': return needleGeo(it.size ?? 8, seed, it.color === 'dark');
    case 'seaarch': return seaArchGeo(it.size ?? 1);
    case 'boulder': return boulderGeo(it.size ?? 1, seed);
    case 'cactus_lo': return cactusGeo(it.size ?? 2.2, seed);
    case 'barrel_lo': return barrelCactusGeo(it.size ?? 0.45);
    case 'shrub_lo': return shrubGeo(it.size ?? 0.5, seed);
    case 'anthill_lo': return anthillSmallGeo(it.size ?? 1);
    case 'poisontree': return poisonTreeGeo(it.size ?? 4, seed);
    case 'toadstools': return toadstoolsGeo(seed);
    case 'vinepost': return vineGeo(it.size ?? 2.2, seed);
    case 'meadowtree': return meadowTreeGeo(it.size ?? 4.2, seed);
    case 'wagon': return wagonGeo();
    case 'spool': return spoolGeo();
    case 'crates_lo': return cratesLoGeo(seed);
    case 'lightpole': return lightPoleGeo();
    case 'ruinwall': return ruinWallGeo(it.size ?? 5, seed);
    case 'ruinarch': return ruinArchGeo(it.width ?? 3.4, it.size ?? 4);
    case 'ruincolumn': return columnGeo(it.size ?? 3, !!it.broken, seed);
    case 'tafelberg': return mesaPropGeo(it.radius ?? 4, it.size ?? 6, seed);
    default: return null;
  }
}

/** Kleiner Tafelberg (Ersatz für das Modell 'tafelberg'): gestapelte Bänder, flache Kuppe. */
function mesaPropGeo(r = 4, h = 6, seed = 1) {
  const b = new Build();
  const n = Math.max(2, Math.round(h / 1.2));
  for (let i = 0; i < n; i++) b.cyl(r * (1 - (i + 1) * 0.03), r * (1 - i * 0.03), h / n, MESA[(i * 3 + seed) % MESA.length], { p: [0, (h / n) * (i + 0.5), 0] }, 9);
  b.cyl(r * 0.92, r * 0.94, 0.2, 0xf2c088, { p: [0, h + 0.1, 0] }, 9);
  return b.geometry();
}

function cratesLoGeo(seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  for (const [x, y, z, s] of [[0, 0, 0, 1], [1.05, 0, 0.1, 0.9], [0.5, 1, 0.05, 0.85]]) {
    b.box(s, s, s, (px, py, pz, nx, ny) => (Math.abs(ny) > 0.5 ? 0x9aa2b0 : 0x6a7484), { p: [x, y + s / 2, z], r: [0, rnd.real(-0.15, 0.15), 0] }, 0);
    b.box(s * 1.02, 0.1, s * 1.02, 0xffc21a, { p: [x, y + s * 0.5, z] }, 0);
  }
  return b.geometry();
}

/** Leuchtende Teile einer Welt-4-Requisite (Material 'glow'), sonst null. */
export function canyonPropGlow(it) {
  switch (it.kind) {
    case 'lightpole': return lightPoleGlowGeo();
    case 'torch': return torchFlameGeo();
    default: return null;
  }
}

/** Kollision einer Welt-4-Requisite (begehbares Gelände): Zylinder/Quader oder null. */
export function canyonPropShape(it) {
  const [x, y, z] = it.pos;
  const cyl = (r, h) => ({ type: 'cyl', x, z, r, y0: y - 0.2, y1: y + h, tag: `deko:${it.kind}` });
  switch (it.kind) {
    case 'needle': return cyl(0.45 + (it.size ?? 8) * 0.1, it.size ?? 8);
    case 'ruincolumn': return cyl(0.5, it.size ?? 3);
    case 'tafelberg': return cyl((it.radius ?? 4) * 0.9, it.size ?? 6);
    case 'boulder': return cyl((it.size ?? 1) * 0.9, (it.size ?? 1) * 1.1);
    case 'cactus_lo': return cyl(0.35, it.size ?? 2.2);
    case 'barrel_lo': return cyl(0.4, 0.8);
    case 'anthill_lo': return cyl(0.9 * (it.size ?? 1), 1.1 * (it.size ?? 1));
    case 'poisontree': case 'meadowtree': return cyl(0.3, 3);
    case 'wagon': {
      const c = Math.abs(Math.cos(it.yaw ?? 0)) > 0.7;
      const hx = c ? 0.9 : 1.6, hz = c ? 1.6 : 0.9;
      return { type: 'box', min: [x - hx, y - 0.2, z - hz], max: [x + hx, y + 1.9, z + hz], tag: 'deko:wagen' };
    }
    case 'spool': return cyl(0.8, 1.5);
    case 'crates_lo': return cyl(1.1, 2);
    case 'lightpole': return cyl(0.3, 4.4);
    case 'ruinwall': {
      const L = (it.size ?? 5) / 2, c = Math.abs(Math.cos(it.yaw ?? 0)) > 0.7;
      return { type: 'box', min: [x - (c ? L : 0.45), y - 0.2, z - (c ? 0.45 : L)], max: [x + (c ? L : 0.45), y + 2.4, z + (c ? 0.45 : L)], tag: 'deko:mauer' };
    }
    default: return null;
  }
}

// ------------------------------------------------------------------ Streudeko

/**
 * Canyon-Streudeko auf nicht begehbaren Blöcken (deterministisch): Kakteen, Kugelkakteen, Trockenbüsche, Felsen auf
 * niedrigem Fels; Büsche, Felsbrocken und kleine Felsnadeln auf Tafelbergen; Giftbäume und Fliegenpilze im Giftwald,
 * Laubbäume auf der Bergwiese. Strand, Sumpf, Lavafels, Burg, Festung und noDeco bleiben frei.
 */
export function scatterCanyon(level, map, grid) {
  const parts = [];
  map.ground.forEach((b, i) => {
    const style = b.style ?? 'canyon';
    if (b.walk || b.noDeco || ['beach', 'swamp', 'lavarock', 'basin', 'castle', 'fortress', 'tech', 'ruins'].includes(style)) return;
    const [x0, z0, x1, z1] = b.rect;
    const w = x1 - x0, d = z1 - z0;
    if (w < 2.5 || d < 2.5) return;
    const [cx, cz] = [(x0 + x1) / 2, (z0 + z1) / 2];
    if (grid.isWalk(cx, cz)) return;
    const rnd = new Rnd(0xca7e + i * 131);
    const pts = [];
    const tooClose = (x, z, r) => pts.some((p) => Math.hypot(p[0] - x, p[1] - z) < r);
    const area = w * d;
    const y = b.top;
    const put = (n, minD, make) => {
      for (let k = 0, tries = 0; k < n && tries < n * 14; tries++) {
        const x = rnd.real(x0 + 1.1, x1 - 1.1), z = rnd.real(z0 + 1.1, z1 - 1.1);
        if (tooClose(x, z, minD)) continue;
        pts.push([x, z]);
        const g = make(rnd);
        if (g) parts.push(place(g, x, y, z, rnd.real(0, Math.PI * 2)));
        k++;
      }
    };
    const dens = b.trees ?? 1;
    if (style === 'poison' || style === 'marsh') {
      put(Math.max(1, Math.floor((area / 36) * dens)), 2.6, (r) => poisonTreeGeo(r.real(3.2, 4.8), r.int(1, 999)));
      put(Math.floor(area / 50), 1.4, (r) => toadstoolsGeo(r.int(1, 999)));
      return;
    }
    if (style === 'meadow') {
      put(Math.max(1, Math.floor((area / 40) * dens)), 3, (r) => meadowTreeGeo(r.real(3.6, 5), r.int(1, 999)));
      return;
    }
    if (style === 'mesa') {
      put(Math.floor((area / 70) * dens), 2.2, (r) => shrubGeo(r.real(0.45, 0.7), r.int(1, 999)));
      put(Math.floor(area / 140), 2.4, (r) => desertRockGeo(r.real(0.6, 1.1), r.int(1, 999)));
      put(area > 200 ? 1 : 0, 4, (r) => needleGeo(r.real(3, 4.5), r.int(1, 99)));
      return;
    }
    // canyon / canyonlow
    put(Math.max(1, Math.floor((area / 70) * dens)), 2.4, (r) => cactusGeo(r.real(1.5, 2.6), r.int(1, 999)));
    put(Math.floor(area / 120), 1.6, () => barrelCactusGeo(0.4));
    put(Math.floor(area / 70), 1.6, (r) => (r.frac() < 0.5 ? shrubGeo(r.real(0.4, 0.6), r.int(1, 999)) : desertRockGeo(r.real(0.5, 0.9), r.int(1, 999))));
  });
  for (const g of parts) level.view?.addStatic(g, { castShadow: true });
}

// ------------------------------------------------------------------ Hängebrücke und Felsbogen (Weltdaten segments)

/**
 * Hängebrücke (segments: { type: 'ropebridge', from, to, width }): Kollision wie der Standard-Baustein `bridge`, Optik:
 * Planken mit Lücken, dicke Pfosten an beiden Enden, durchhängende Seile als Handlauf mit Hängern zu den Planken.
 */
export function buildRopeBridge(level, spec) {
  buildBridge({ world: level.world, view: null }, { ...spec, rails: false });
  if (!level.view) return;
  const a = spec.from, c = spec.to;
  const dx = c[0] - a[0], dz = c[2] - a[2], L = Math.hypot(dx, dz);
  if (L < 0.01) return;
  const w = spec.width ?? 3, dy = c[1] - a[1], slope = dy / L, pitch = Math.atan(slope);
  const yaw = Math.atan2(-dz / L, dx / L);
  const rnd = new Rnd(Math.round(L * 31 + a[0] * 7 + a[2]));
  const b = new Build();
  const np = Math.max(1, Math.floor(L / 0.42));
  for (let i = 0; i < np; i++) {
    const t = (i + 0.5) / np, tint = rnd.frac();
    b.box(0.34, 0.12, w * rnd.real(0.94, 1), (x, y, z, nx, ny) => (ny > 0.5 ? mix(0xd8a26a, 0xc08a52, tint) : 0x8a5a32), { p: [t * L, slope * t * L - 0.06, rnd.real(-0.06, 0.06)], r: [0, rnd.real(-0.05, 0.05), pitch] }, 0);
  }
  // Längsbalken unter den Planken
  for (const s of [-1, 1]) b.box(L + 0.3, 0.14, 0.14, 0x6a4424, { p: [L / 2, slope * L / 2 - 0.18, s * (w / 2 - 0.25)], r: [0, 0, pitch] }, 0);
  // Pfosten (je Ende zwei) und Seile mit Durchhang
  const H = 1.25, sag = Math.min(0.6, L * 0.05);
  for (const s of [-1, 1]) {
    for (const t of [0, 1]) {
      b.cyl(0.13, 0.16, H + 0.5, 0x7a4a2a, { p: [t * L, t * dy + H / 2 - 0.2, s * (w / 2 + 0.05)] }, 6);
      b.sphere(0.15, 0x5a3418, { p: [t * L, t * dy + H + 0.08, s * (w / 2 + 0.05)] }, 6, 3);
    }
    const pts = [];
    const n = 8;
    for (let i = 0; i <= n; i++) { const t = i / n; pts.push([t * L, t * dy + H - Math.sin(t * Math.PI) * sag, s * (w / 2 + 0.05)]); }
    b.tube(pts, 0.045, 0xe8cc8a, null, 16, 4);
    const low = pts.map(([px, py, pz]) => [px, py - 0.55 + Math.sin((px / L) * Math.PI) * sag * 0.6, pz]);
    b.tube(low, 0.035, 0xd8b878, null, 16, 4);
    for (let i = 1; i < n; i++) {
      const [px, py, pz] = pts[i];
      const deck = (px / L) * dy;
      b.cyl(0.02, 0.02, py - deck, 0xd8b878, { p: [px, (py + deck) / 2, pz] }, 3);
    }
  }
  const g = b.geometry();
  g.rotateY(yaw);
  g.translate(a[0], a[1], a[2]);
  level.view.addStatic(g, { castShadow: true });
}

/**
 * Felsbogen (segments: { type: 'rockarch', from, to, width }): begehbarer Sandsteinbogen über Meer/Lava. Kollision wie
 * `bridge` (Rampe bei Höhenunterschied), Optik: extrudierter Bogen (Bänder in Rot/Orange/Creme) mit Bogenöffnung bis
 * unter den Meeresspiegel, sandiger Laufweg obenauf.
 */
export function buildRockArch(level, spec) {
  buildBridge({ world: level.world, view: null }, { ...spec, rails: false });
  if (!level.view) return;
  const a = spec.from, c = spec.to;
  const dx = c[0] - a[0], dz = c[2] - a[2], L = Math.hypot(dx, dz);
  if (L < 0.01) return;
  const w = spec.width ?? 4, dy = c[1] - a[1];
  const yaw = Math.atan2(-dz / L, dx / L);
  const bottom = -1.2 - a[1];                     // unter dem Meeresspiegel (lokal)
  const legs = Math.min(2.4, L * 0.2);
  const sh = new THREE.Shape();
  sh.moveTo(-0.6, bottom); sh.lineTo(-0.6, -0.3); sh.lineTo(L + 0.6, dy - 0.3); sh.lineTo(L + 0.6, bottom);
  sh.lineTo(L - legs, bottom);
  const archTop = Math.min(-0.9, Math.min(0, dy) - 0.9);
  const rx = (L - legs * 2) / 2, ry = archTop - bottom;
  sh.absellipse(L / 2, bottom, rx, ry, 0, Math.PI, false);
  sh.lineTo(-0.6, bottom);
  const b = new Build();
  b.extrude(sh, w + 0.2, (x, y) => MESA[Math.abs(Math.floor((y - bottom) / 0.9)) % MESA.length], {}, 0, 12);
  // sandiger Laufweg (schräg) mit Randsteinen
  const pitch = Math.atan2(dy, L), len = Math.hypot(L, dy) + 1.2;
  b.box(len, 0.32, w + 0.3, (x, y, z, nx, ny) => (ny > 0.5 ? 0xe6aa70 : 0xcc7a48), { p: [L / 2, dy / 2 - 0.14, 0], r: [0, 0, pitch] }, 0);
  const rnd = new Rnd(Math.round(L * 13 + a[2]));
  for (const s of [-1, 1]) {
    for (let t = 0.6; t < L; t += rnd.real(1.4, 2.4)) {
      const r = rnd.real(0.22, 0.34);
      b.add(new THREE.DodecahedronGeometry(r, 0), 0xb85a32, { p: [t, (t / L) * dy + r * 0.4, s * (w / 2 + 0.05)], r: [t, t * 2, 0], s: [1.2, 0.8, 1] });
    }
  }
  const g = b.geometry();
  g.rotateY(yaw);
  g.translate(a[0], a[1], a[2]);
  level.view.addStatic(g, { castShadow: true });
}

// ------------------------------------------------------------------ Nachbarwelt und Inselchen

/** Canyon-Inseln als ferne Nachbarwelt (Ziel der Glasröhre aus Welt 3): rote Blöcke, Tafelberge, Felsnadeln. */
export function canyonNeighborParts(nb, rnd) {
  const [x, z] = nb.pos;
  const [w, d] = nb.size ?? [80, 54];
  const parts = [];
  const theme = THEMES.map_canyon;
  const blocks = [[-0.5, -0.1, -0.12, 0.5, 2.2], [-0.05, -0.5, 0.5, 0.2, 3.5], [-0.42, -0.48, -0.1, -0.16, 9], [0.1, -0.38, 0.38, -0.1, 13], [0.18, 0.24, 0.48, 0.48, 1.6]];
  for (const [a, c, e, f, top] of blocks) {
    const b = { rect: [x + a * w, z + c * d, x + e * w, z + f * d], top, style: top > 6 ? 'mesa' : 'canyonlow' };
    parts.push(...canyonGround(b, -3, theme, rnd));
  }
  for (let i = 0; i < 6; i++) parts.push(place(needleGeo(rnd.real(7, 13), i + 1), x + rnd.real(-0.55, 0.55) * w, 0, z + rnd.real(-0.6, 0.6) * d, rnd.real(0, 6)));
  parts.push(place(seaArchGeo(1.3), x + 0.55 * w, 0, z + 0.1 * d, 0.6));
  for (const p of parts) for (const k of Object.keys(p.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') p.deleteAttribute(k);
  return parts;
}

/** Kleines Canyon-Inselchen im Meer (Kulisse): niedriger roter Block, oft mit Felsnadel oder Kaktus. */
export function canyonIsletParts(x, z, w, d, top, rnd) {
  const theme = THEMES.map_canyon;
  const parts = canyonGround({ rect: [x - w / 2, z - d / 2, x + w / 2, z + d / 2], top, style: 'canyonlow' }, -2, theme, rnd);
  const k = rnd.frac();
  if (k < 0.55) parts.push(place(needleGeo(rnd.real(4, 9), rnd.int(1, 99)), x + rnd.real(-1, 1), top, z + rnd.real(-0.8, 0.8), rnd.real(0, 6)));
  else parts.push(place(cactusGeo(rnd.real(1.6, 2.4), rnd.int(1, 999)), x + rnd.real(-1, 1), top, z + rnd.real(-0.8, 0.8), rnd.real(0, 6)));
  return parts;
}
