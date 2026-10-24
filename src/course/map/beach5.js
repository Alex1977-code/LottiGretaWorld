// Gelände, Ränder, Streudeko, Requisiten und Brücken der Welt-5-Karte „Lila Strand-Insel“ (eigene Gestaltung,
// Spielzeug-Look wie Welt 1–4): lila/violetter Sand und Felsen in gestapelten Bändern (Flieder, Violett, Pflaume),
// türkises Meer, Palmen, Strandkörbe, Sonnenschirme; dazu je Zone ein eigener Boden: Zirkusplatz (Flieder-Karo),
// Arena-Sand, schieferblauer Höhlenboden mit blau glühenden Rissen, goldene Savanne auf rotbraunem Lehm (mit
// Savannenberg-Kuppe), Spukwiese, Minen-Schotter, Torten-Insel (Biskuit- und Sahneschichten, rosa Zuckerguss mit
// Tropfen und Streuseln), dunkle Festungsplatten mit Glutfugen, Bahnhofspflaster, Tempel-Sandstein mit Moos.
// Ränder: niedrige Mäuerchen aus violetten Felsbrocken ('violetrock'), Treibholz-Zäunchen ('driftwood'), Tropenhecke
// ('tropic'), Sahnetupfen ('cream'), Steinmäuerchen ('stone'). Verbindungen: Holzstege ('boardwalk', weiß gestrichene
// Planken auf Pfählen mit Tauen). Thema 'map_lila' (strahlender Mittag, türkis-fliederfarbener Dunst, violette Hügel
// und Tafelberge am Horizont) meldet sich hier in THEMES an.
//
// Alle Geometrien in Weltkoordinaten bzw. mit Fußpunkt im Ursprung (Vorderseite +Z, zur Kamera) und Vertexfarben
// (position/normal/color) für view.addStatic (Karten-Kacheln, MapBatcher). Flache Deckschichten tragen
// userData.noShadow (kein Schattenwurf), leuchtende userData.material 'glow'.

import * as THREE from 'three';
import { mix, TAU } from '../models/lib/kit.js';
import { roundedBox, SIDE, colorize, lin, mixc, smooth, Rnd } from '../../three/world/geometry.js';
import { alignedGrid } from '../blocks/kit.js';
import { THEMES } from '../view/themes.js';
import { getModel, hasModel } from '../models/index.js';
import { hillRing } from '../view/backdrop_w2.js';
import { LowBuild as Build, place, desertGround, palmGeo, desertRockGeo, columnGeo, obeliskGeo } from './desert.js';
import { tombGeo, bareTreeGeo } from './snow.js';
import { buildBridge } from '../blocks/types/bridge.js';

export const LILA_STYLES = new Set(['lila', 'lilarock', 'lilabeach', 'palmgrove', 'circus', 'arena', 'cave', 'savanna', 'savannahill',
  'spook', 'gravel', 'cake', 'fort', 'paving', 'temple']);

// ------------------------------------------------------------------ Thema der Lila Strand-Insel

if (!THEMES.map_lila) {
  THEMES.map_lila = {
    ...THEMES.grass,
    label: 'Weltkarte Lila Strand-Insel',
    sky: [[1, 0x186ae0], [0.45, 0x389ef4], [0.15, 0x86d6fa], [0.04, 0xdcdcf8], [0, 0xf2e2fa], [-0.1, 0xb4e6ee], [-1, 0x58c0d8]],
    background: 0xe4ecfa,
    fog: { color: 0xe6e6f8, near: 85, far: 310 },
    hemi: { sky: 0xf2eaff, ground: 0xb48ad0, intensity: 1.32 },
    sun: { color: 0xfff2de, intensity: 2.75, dir: [-0.45, 1, 0.5] },
    ground: null,
    clouds: false,
    backdrop: 'lila',
    grassTop: 0x7ad070, grassTop2: 0x6cc466, grassRim: 0xb4ec9a, grassSide: 0x4aa850,
    dirt: 0x9a62c0, dirtDeep: 0x6a3a8a, rock: 0x8a56b6, rockDeep: 0x5a2e80,
    stone: 0xf6eaf6, stoneDark: 0xc8a8d0,
    wood: 0xf8efe2, woodDark: 0x9a6a4a,
    water: 0x3ae6e0, waterDeep: 0x1890c8,
    // ferne violette Hügel und Tafelberge ringsum (ein Mesh)
    buildBackdrop(sky, bounds, rnd, yBase) {
      hillRing(sky, bounds, rnd, yBase, { near: [0xc8a2e8, 0x8a5ab8], far: [0xdac4f2, 0xa682d0], mesas: 10,
        mesaColors: [0x9a62c0, 0x7a46a8, 0xb27ed2, 0x6a3a96], mesaCap: 0xead2f6 });
    },
  };
}

// ------------------------------------------------------------------ Farben

export const LILA = { top: 0xcf9fea, top2: 0xc292e2, rim: 0xe8ccf6, side: 0xb07ad2, dust: 0xd8b0ee, shell: 0xf6e4fa };
const VIOLET = [0x9a62c0, 0x7a46a8, 0xb27ed2, 0x6a3a96, 0x8c56b6, 0xc89ae2, 0x7e4aa8];
const LOAM = [0xc0683c, 0x9e5030, 0xd27e48, 0xac5c36, 0xdc9058];
const SLATE5 = [0x4a3e74, 0x3c3262, 0x584c88, 0x42386c];
const DUSK = [0x403652, 0x4c4062, 0x362e48, 0x544870];
const SANDST = [0xd8b07a, 0xc89a64, 0xe6c08a, 0xb88a56];
const CAKE_LAYERS = [0x8a4a2a, 0xfff4e8, 0xf4cf8a, 0xe8406a, 0xf4cf8a, 0xfff4e8];

const hash2 = (x, z) => { const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return h - Math.floor(h); };
const tone = (a, c, k, out = [0, 0, 0]) => mixc(lin(a), lin(c), k, out);
const checker = (ax, az, cell = 2) => (Math.floor((ax + cell * 0.505) / cell) + Math.floor((az + cell * 0.505) / cell)) & 1;
function flat(g, material) { if (g) { g.userData.noShadow = true; if (material) g.userData.material = material; } return g; }

// ------------------------------------------------------------------ Geländestile

/**
 * Gelände-Block der Lila Strand-Insel (Box x0..x1 × z0..z1 von base bis top). style:
 *   'lila'        begehbarer Flieder-Sand: violette Bänder, Sanddecke mit runder Kante, 2-m-Raster mit Muschel-Tupfen
 *   'lilarock'    violette Klippe/Tafelberg (nicht begehbar): dicke, versetzte Bänder, Lavendel-Wiese obenauf
 *   'lilabeach'   flacher Strand (hell-flieder) am Meer, Muscheln    'palmgrove'  grüner Palmenhain auf violettem Fels
 *   'circus'      Zirkusplatz (Flieder-Creme-Karo, goldene Kante)     'arena'  heller Arena-Sand
 *   'cave'        schieferblauer Höhlenboden mit blau glühenden Rissen
 *   'savanna'     goldgelbes Trockengras auf rotbraunem Lehm          'savannahill'  Terrassen mit Grashügel (b.hill)
 *   'spook'       dunkle Spukwiese                                    'gravel'  Minen-Schotter mit Kohle und Kristallen
 *   'cake'        Torten-Insel: Biskuit-/Sahne-/Marmeladen-Schichten, rosa Zuckerguss mit Tropfen und Streuseln
 *   'fort'        dunkle Festungsplatten mit Glutfugen                'paving'  Bahnhofspflaster
 *   'temple'      Tempel-Sandstein mit Moos
 *   'lavarock' / 'basin' (Welt 2, desert.js)
 * Liefert Teil-Geometrien (flache Deckschichten mit userData.noShadow, Leuchtendes mit userData.material 'glow').
 */
export function lilaGround(b, base, theme, rnd) {
  const [x0, z0, x1, z1] = b.rect;
  const top = b.top;
  const style = b.style ?? 'lila';
  const parts = [];
  if (style === 'lavarock' || style === 'basin') return desertGround(b, base, theme, rnd);
  const P = PALETTES[style] ?? PALETTES.lila;
  const capH = P.capH ?? 0.32;
  if (style === 'cake') cakeLayers(parts, x0, base, z0, x1, top - capH, z1);
  else strata(parts, x0, base, z0, x1, top - capH, z1, P.bands, rnd, P.layer ?? 0.9, P.jitter ?? 0.12);
  // Decke mit runder Oberkante
  const lip = P.lip ?? 0.08;
  const r = Math.min(0.16, capH * 0.45);
  const cap = roundedBox(x1 - x0 + lip * 2, capH, z1 - z0 + lip * 2, r, SIDE.ALL & ~SIDE.NY, SIDE.NY, 1);
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
  if (style === 'cake') { parts.push(cakeDrips(x0, z0, x1, z1, top, rnd)); if (b.walk) parts.push(flat(sprinkles(x0, z0, x1, z1, top + 0.012, rnd))); }
  if (style === 'cave' && b.walk) parts.push(flat(glowCracks(x0, z0, x1, z1, top + 0.012, rnd, [0x3a9ae8, 0x5ac8f4], 40, 0.07), 'glow'));
  if (style === 'fort' && b.walk) parts.push(flat(glowCracks(x0, z0, x1, z1, top + 0.012, rnd, [0xe8641a, 0xff9a3a], 55, 0.07), 'glow'));
  if (style === 'circus' && b.walk) parts.push(flat(goldBorder(x0, z0, x1, z1, top + 0.01)));
  if (style === 'savannahill' && b.hill) parts.push(hillMound(b, top, rnd));
  return parts;
}

const PALETTES = {
  lila: {
    bands: VIOLET, side: LILA.side, rim: LILA.rim,
    tile: (rnd) => (i, j, ax, az) => {
      const o = tone(checker(ax, az) ? LILA.top : LILA.top2, LILA.dust, rnd.frac() * 0.3);
      const h = hash2(Math.floor(ax / 2) - 7, Math.floor(az / 2) + 3);
      if (h > 0.93) mixc(o, lin(LILA.shell), 0.4, o);       // Muschelsand
      else if (h < 0.05) mixc(o, lin(0xa86ad0), 0.35, o);   // dunklerer Flieder
      return o;
    },
  },
  lilarock: {
    bands: VIOLET, side: 0xb488d8, rim: 0xe4c8f4, layer: 1.25, jitter: 0.28, capH: 0.3, cellOff: 4,
    tile: (rnd) => (i, j, ax, az) => (hash2(Math.floor(ax / 4), Math.floor(az / 4)) > 0.7 ? tone(0x8ac470, 0x7ab866, rnd.frac()) : tone(0xc8a0e4, 0xb890da, rnd.frac() * 0.8)),
  },
  lilabeach: {
    bands: [0xe0c0e8, 0xd4acdc, 0xead0ee], side: 0xf0d8f0, rim: 0xfff0fc, capH: 0.16, layer: 0.5, jitter: 0.05, cellOff: 3,
    tile: (rnd) => () => tone(0xf6e2f4, 0xeed4ee, rnd.frac()),
  },
  palmgrove: {
    bands: VIOLET, side: 0x5aa860, rim: 0x9ae08a, layer: 1.2, jitter: 0.24, cellOff: 4,
    tile: (rnd) => () => tone(0x5cc070, 0x4aa860, rnd.frac()),
  },
  circus: {
    bands: VIOLET, side: 0xe8c040, rim: 0xfff0a8, cell: 2,
    tile: (rnd) => (i, j, ax, az) => tone(checker(ax, az) ? 0xf4e2fc : 0xc89ae8, 0xe8d0f6, rnd.frac() * 0.12),
  },
  arena: {
    bands: VIOLET, side: 0xd8b48a, rim: 0xf6e2c2, cell: 2,
    tile: (rnd) => (i, j, ax, az) => tone(checker(ax, az) ? 0xf2dcb4 : 0xe8cea4, 0xf6e6c8, rnd.frac() * 0.25),
  },
  cave: {
    bands: SLATE5, side: 0x4e4480, rim: 0x6e60a8, cell: 2,
    tile: (rnd) => (i, j, ax, az) => tone(checker(ax, az) ? 0x5a4e88 : 0x4e447a, 0x625896, rnd.frac() * 0.3),
  },
  savanna: {
    bands: LOAM, side: 0xc8964a, rim: 0xf4d474, cell: 2,
    tile: (rnd) => (i, j, ax, az) => {
      const o = tone(0xeec65e, 0xe2b652, rnd.frac() * 0.6 + (checker(ax, az) ? 0.2 : 0));
      if (hash2(Math.floor(ax / 2) + 5, Math.floor(az / 2) - 9) > 0.92) mixc(o, lin(0xd49a50), 0.35, o);   // trockene Stelle
      return o;
    },
  },
  savannahill: {
    bands: LOAM, side: 0xd8a850, rim: 0xf6da7a, layer: 1.2, jitter: 0.26, cellOff: 4,
    tile: (rnd) => () => tone(0xeec660, 0xdcb052, rnd.frac()),
  },
  spook: {
    bands: DUSK, side: 0x4e4266, rim: 0x6c5e8c, cell: 2, cellOff: 4,
    tile: (rnd) => (i, j, ax, az) => {
      const o = tone(checker(ax, az) ? 0x5e4e80 : 0x544676, 0x665684, rnd.frac() * 0.3);
      if (hash2(Math.floor(ax / 2), Math.floor(az / 2) + 13) > 0.94) mixc(o, lin(0x5a7a62), 0.25, o);   // Moos
      return o;
    },
  },
  gravel: {
    bands: VIOLET, side: 0x8e7c86, rim: 0xbaaab4, cell: 2,
    tile: (rnd) => (i, j, ax, az) => {
      const h = hash2(Math.floor(ax / 2) + 3, Math.floor(az / 2) + 1);
      const o = tone(checker(ax, az) ? 0xae9c94 : 0xa4928a, 0xb8a8a0, rnd.frac() * 0.4);
      if (h > 0.95) mixc(o, lin(0xb88ad8), 0.3, o);       // Kristallstaub
      else if (h < 0.06) mixc(o, lin(0x6a5a5a), 0.3, o);  // Kohlenstaub
      return o;
    },
  },
  cake: {
    bands: CAKE_LAYERS, side: 0xff9ac8, rim: 0xffd8ea, capH: 0.36, lip: 0.14, cell: 2, cellOff: 4,
    tile: (rnd) => (i, j, ax, az) => tone(checker(ax, az) ? 0xffbedd : 0xffcce4, 0xffd8ea, rnd.frac() * 0.25),
  },
  fort: {
    bands: DUSK, side: 0x524c64, rim: 0x726c88, cell: 2,
    tile: (rnd) => (i, j, ax, az) => tone(checker(ax, az) ? 0x5e586e : 0x524c62, 0x666078, rnd.frac() * 0.3),
  },
  paving: {
    bands: VIOLET, side: 0xb8a8bc, rim: 0xe2d6e4, cell: 1,
    tile: (rnd) => (i, j, ax, az) => tone(((Math.floor(ax) + Math.floor(az)) & 1) ? 0xd6cad8 : 0xc6b8ca, 0xdcd0de, rnd.frac() * 0.4),
  },
  temple: {
    bands: SANDST, side: 0xc8a87a, rim: 0xf2dcb8, cell: 1,
    tile: (rnd) => (i, j, ax, az) => {
      const h = hash2(ax, az);
      if (h > 0.975) return tone(0xb8c88a, 0xa8bc7c, rnd.frac());         // Moos
      if (h < 0.02) return tone(0xc8a47c, 0xb89870, rnd.frac());          // fehlende Platte
      return tone(0xead6b2, 0xd8c098, rnd.frac() * 0.8 + (((Math.floor(ax) + Math.floor(az)) & 1) ? 0.15 : 0));
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
      const k = Math.abs(nn.x) > 0.5 ? 0.9 : 1;
      o[0] = c[0] * k; o[1] = c[1] * k; o[2] = c[2] * k;
    });
    g.translate((x0 + x1) / 2, y0 + lh * (i + 0.5), (z0 + z1) / 2);
    parts.push(g);
  }
}

/** Tortenboden: unten Schoko-Biskuit, darüber abwechselnd Sahne, Biskuit, Marmelade (gleichmäßige Schichten). */
function cakeLayers(parts, x0, y0, z0, x1, y1, z1) {
  // unter Wasser nur ein dunkler Sockel, die Schichten beginnen kurz unter dem Meeresspiegel
  const ys = Math.max(y0, -0.4);
  if (ys > y0) strata(parts, x0, y0, z0, x1, ys, z1, [0x6a3a22], new Rnd(1), 9, 0);
  const pattern = [[0x8a4a2a, 0.7], [0xfff4e8, 0.25], [0xf4cf8a, 0.55], [0xe8406a, 0.18], [0xf4cf8a, 0.55], [0xfff4e8, 0.25]];
  let y = ys, k = 0;
  while (y < y1 - 0.02) {
    const [c, h0] = pattern[k % pattern.length];
    const h = Math.min(h0, y1 - y);
    const col = lin(c);
    const g = colorize(new THREE.BoxGeometry(x1 - x0 + (k % 2 ? 0.06 : 0), h, z1 - z0 + (k % 2 ? 0.06 : 0)), (p, nn, o) => {
      const s = Math.abs(nn.x) > 0.5 ? 0.92 : nn.y < -0.5 ? 0.7 : 1;
      o[0] = col[0] * s; o[1] = col[1] * s; o[2] = col[2] * s;
    });
    g.translate((x0 + x1) / 2, y + h / 2, (z0 + z1) / 2);
    parts.push(g);
    y += h; k++;
  }
}

/** Zuckerguss-Tropfen an den Seiten der Torten-Insel (halbe Kapseln, zufällige Länge). */
function cakeDrips(x0, z0, x1, z1, top, rnd) {
  const b = new Build();
  const col = { v: (x, y, z, nx, ny) => mix(0xff8ac0, 0xffc6e0, ny * 0.5 + 0.5) };
  const side = (ax, az, bx, bz, ox, oz) => {
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(2, Math.round(len / 1.8));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.3 + rnd.frac() * 0.4) / n;
      const L = rnd.real(0.25, 0.9);
      const px = ax + (bx - ax) * t + ox * 0.12, pz = az + (bz - az) * t + oz * 0.12;
      b.cyl(0.14, 0.14, L, col, { p: [px, top - 0.3 - L / 2, pz] }, 5, true);
      b.sphere(0.14, col, { p: [px, top - 0.3 - L, pz] }, 5, 2);
    }
  };
  side(x0, z1, x1, z1, 0, 1); side(x0, z0, x1, z0, 0, -1); side(x0, z0, x0, z1, -1, 0); side(x1, z0, x1, z1, 1, 0);
  return b.geometry();
}

/** Bunte Streusel auf dem Zuckerguss (kleine flache Stäbchen). */
function sprinkles(x0, z0, x1, z1, y, rnd) {
  const b = new Build();
  const cols = [0xffffff, 0xffd23a, 0x4ac8ff, 0x7ae05a, 0xb46aff, 0xff5a5a];
  const n = Math.round(((x1 - x0) * (z1 - z0)) / 9);
  for (let i = 0; i < n; i++) {
    b.box(0.24, 0.03, 0.07, cols[i % cols.length], { p: [rnd.real(x0 + 0.5, x1 - 0.5), y, rnd.real(z0 + 0.5, z1 - 0.5)], r: [0, rnd.real(0, 3.14), 0] }, 0);
  }
  return b.geometry();
}

/** Glühende Risse: kurze, geknickte Leuchtlinien (2–4 Glieder, manchmal verzweigt). k = Fläche je Riss (m²). */
function glowCracks(x0, z0, x1, z1, y, rnd, cols, k = 16, w0 = 0.1) {
  const b = new Build();
  const n = Math.max(1, Math.round(((x1 - x0) * (z1 - z0)) / k));
  const seg = (ax, az, bx, bz, w, color) => {
    const len = Math.hypot(bx - ax, bz - az);
    b.box(len + w, 0.02, w, color, { p: [(ax + bx) / 2, y, (az + bz) / 2], r: [0, -Math.atan2(bz - az, bx - ax), 0] }, 0);
  };
  const walk = (x, z, dir, m, w) => {
    for (let i = 0; i < m; i++) {
      const l = 0.6 + rnd.frac() * 0.8;
      dir += (rnd.frac() - 0.5) * 1.4;
      const nx = Math.min(x1 - 0.4, Math.max(x0 + 0.4, x + Math.cos(dir) * l)), nz = Math.min(z1 - 0.4, Math.max(z0 + 0.4, z + Math.sin(dir) * l));
      seg(x, z, nx, nz, w, cols[i % cols.length]);
      if (i === 1 && rnd.frac() < 0.35) walk(nx, nz, dir + (rnd.frac() < 0.5 ? 1 : -1) * 1.1, 2, w * 0.7);
      x = nx; z = nz;
    }
  };
  for (let i = 0; i < n; i++) walk(x0 + 0.6 + rnd.frac() * (x1 - x0 - 1.2), z0 + 0.6 + rnd.frac() * (z1 - z0 - 1.2), rnd.frac() * TAU, 2 + Math.floor(rnd.frac() * 3), w0);
  return b.geometry();
}

/** Goldene Kante mit roten Rauten um den Zirkusplatz. */
function goldBorder(x0, z0, x1, z1, y) {
  const b = new Build();
  const strip = (ax, az, bx, bz) => {
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 1.0));
    const ux = (bx - ax) / len, uz = (bz - az) / len;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      b.box(Math.abs(ux) > 0.5 ? len / n - 0.04 : 0.5, 0.02, Math.abs(uz) > 0.5 ? len / n - 0.04 : 0.5, i % 2 ? 0xffc21a : 0xffe07a, { p: [ax + (bx - ax) * t, y, az + (bz - az) * t] }, 0);
      if (i % 2 === 0) b.box(0.26, 0.03, 0.26, 0xe8283a, { p: [ax + (bx - ax) * t, y + 0.005, az + (bz - az) * t], r: [0, Math.PI / 4, 0] }, 0);
    }
  };
  strip(x0 + 0.45, z0 + 0.45, x1 - 0.45, z0 + 0.45); strip(x0 + 0.45, z1 - 0.45, x1 - 0.45, z1 - 0.45);
  strip(x0 + 0.45, z0 + 0.95, x0 + 0.45, z1 - 0.95); strip(x1 - 0.45, z0 + 0.95, x1 - 0.45, z1 - 0.95);
  return b.geometry();
}

/** Grashügel auf einem Savannen-Block: b.hill = { h, at?: [x, z], r? } – weiche Kuppe, Terrassenrand, Pfad. */
function hillMound(b, top, rnd) {
  const [x0, z0, x1, z1] = b.rect;
  const [cx, cz] = b.hill.at ?? [(x0 + x1) / 2, (z0 + z1) / 2];
  const R = b.hill.r ?? Math.min(x1 - x0, z1 - z0) * 0.5;
  const H = b.hill.h ?? 5;
  const g = new Build();
  const pts = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push([R * (1 - t) + 0.01, H * (1 - (1 - t) ** 2) * (0.5 + 0.5 * t)]); }
  pts.push([0, H]);
  g.lathe(pts.reverse(), { v: (x, y) => mix(0xd4a248, 0xf2d070, Math.min(1, y / H * 1.2) + hash2(x * 3, y * 7) * 0.08) }, { p: [cx, top - 0.05, cz], s: [1, 1, (z1 - z0) / (x1 - x0) * 0.95 + 0.05] }, 16, 0);
  // Lehm-Terrassen (Ringe) am Hang
  for (const k of [0.32, 0.62]) {
    const rr = R * (1 - k) + 0.2, yy = H * (1 - k ** 2) * (0.5 + 0.5 * (1 - k)) * 0.98;
    g.torus(rr, 0.16, 0xb8703c, { p: [cx, top + yy * 0.62, cz], r: [Math.PI / 2, 0, 0], s: [1, (z1 - z0) / (x1 - x0) * 0.95 + 0.05, 1] }, 3, 18);
  }
  void rnd;
  return g.geometry();
}

// ------------------------------------------------------------------ Ränder

/** Niedriges Mäuerchen aus violetten Felsbrocken entlang +X (Länge len). */
export function violetRockWallGeo(len, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  b.box(len, 0.4, 0.7, { v: (x, y, z, nx, ny) => mix(0x7a46a8, 0xb27ed2, ny * 0.5 + 0.5) }, { p: [0, 0.2, 0] }, 0);
  const n = Math.max(1, Math.round(len / 0.9));
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i + 0.5) * (len / n), r = rnd.real(0.34, 0.5);
    b.add(new THREE.DodecahedronGeometry(r, 0), { v: (px, py, pz, nx, ny) => mix(0x8a52b8, 0xe0c0f4, Math.max(0, ny) * 0.75 + 0.1) },
      { p: [x + rnd.real(-0.12, 0.12), 0.4 + r * 0.45, rnd.real(-0.08, 0.08)], r: [rnd.real(0, 3), rnd.real(0, 3), 0], s: [1.15, 0.8, 0.95] });
  }
  return b.geometry();
}

/** Treibholz-Zäunchen: schiefe, gebleichte Pflöcke mit Tau. */
export function driftwoodFenceGeo(len, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const n = Math.max(2, Math.round(len / 1.1) + 1);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i / (n - 1)) * len, h = rnd.real(0.75, 1.05);
    b.cyl(0.08, 0.11, h, { v: (px, py) => mix(0xa8927a, 0xe8dccc, py / h + 0.5) }, { p: [x, h / 2, 0], r: [rnd.real(-0.1, 0.1), 0, rnd.real(-0.12, 0.12)] }, 5);
    pts.push([x, h - 0.18, 0]);
  }
  const rope = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    for (let k = 0; k < 3; k++) { const t = k / 3; rope.push([ax + (bx - ax) * t, ay + (by - ay) * t - Math.sin(t * Math.PI) * 0.12, 0.06]); }
  }
  rope.push([pts[pts.length - 1][0], pts[pts.length - 1][1], 0.06]);
  b.tube(rope, 0.03, 0xe8cc8a, null, Math.max(8, rope.length * 2), 3);
  return b.geometry();
}

/** Tropenhecke mit rosa und orangefarbenen Blüten. */
export function tropicHedgeGeo(len, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  b.box(len, 0.85, 0.8, { v: (x, y, z, nx, ny) => mix(0x2e8a4a, 0x5ccc6a, ny * 0.4 + (y + 0.42) * 0.5) }, { p: [0, 0.42, 0] }, 0.12, 1);
  const n = Math.max(1, Math.round(len / 0.8));
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i + 0.5) * (len / n);
    b.sphere(0.34, { v: (px, py, pz, nx, ny) => mix(0x3a9a52, 0x7ae07a, ny * 0.5 + 0.5) }, { p: [x + rnd.real(-0.1, 0.1), 0.86, rnd.real(-0.1, 0.1)] }, 7, 4);
    if (rnd.frac() < 0.6) b.sphere(0.11, rnd.frac() < 0.5 ? 0xff5aa8 : 0xffa03a, { p: [x + rnd.real(-0.2, 0.2), 0.95 + rnd.real(0, 0.15), rnd.real(0.2, 0.36)] }, 6, 3);
  }
  return b.geometry();
}

/** Sahnetupfen-Rand (Torten-Insel): weiße Tupfen mit Kirsche ab und zu. */
export function creamEdgeGeo(len, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const n = Math.max(1, Math.round(len / 0.75));
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i + 0.5) * (len / n);
    b.lathe([[0.36, 0], [0.34, 0.16], [0.22, 0.34], [0.08, 0.5], [0, 0.56]], { v: (px, py) => mix(0xf6e6ee, 0xffffff, py * 2) }, { p: [x, 0, 0], r: [0, i, 0] }, 7);
    if (rnd.frac() < 0.22) b.sphere(0.14, 0xe8203a, { p: [x, 0.62, 0] }, 7, 5);
  }
  return b.geometry();
}

/** Steinmäuerchen (Festung dunkel, Tempel Sandstein) mit Zinnen. */
export function stoneWallGeo(len, dark, seed = 1) {
  const b = new Build();
  const c = dark ? [0x4a4458, 0x625a76] : [0xc8a87a, 0xead6b2];
  b.box(len, 0.6, 0.6, { v: (x, y, z, nx, ny) => mix(c[0], c[1], ny * 0.5 + 0.5) }, { p: [0, 0.3, 0] }, 0);
  const n = Math.max(1, Math.round(len / 1.2));
  for (let i = 0; i < n; i++) b.box(len / n * 0.55, 0.32, 0.62, c[1], { p: [-len / 2 + (i + 0.5) * (len / n), 0.76, 0] }, 0);
  void seed;
  return b.geometry();
}

/** Rand-Optik der Lila-Welt nach Art, sonst null. */
export function lilaEdgeGeo(kind, len, seed) {
  switch (kind) {
    case 'violetrock': return violetRockWallGeo(len + 0.1, seed);
    case 'driftwood': return driftwoodFenceGeo(len, seed);
    case 'tropic': return tropicHedgeGeo(len + 0.1, seed);
    case 'cream': return creamEdgeGeo(len, seed);
    case 'fortwall': return stoneWallGeo(len + 0.1, true, seed);
    case 'templewall': return stoneWallGeo(len + 0.1, false, seed);
    default: return null;
  }
}

// ------------------------------------------------------------------ Pflanzen und Requisiten (Kartenqualität)

/** Lavendelbusch: runde violette Büsche mit Blütenrispen. */
export function lavenderGeo(r = 0.6, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  for (const [dx, dy, dz, k] of [[0, 0.55, 0, 1], [-0.7, 0.4, 0.2, 0.75], [0.65, 0.42, -0.15, 0.7]]) {
    b.sphere(r * k, { v: (x, y, z, nx, ny) => mix(0x5a8a52, 0x8ac470, ny * 0.5 + 0.5) }, { p: [dx * r, dy * r, dz * r] }, 7, 4);
  }
  for (let i = 0; i < 5; i++) {
    const a = rnd.real(0, TAU), d = rnd.real(0.1, r * 0.8);
    b.cyl(0.05, 0.08, 0.42, 0xa86ae0, { p: [Math.cos(a) * d, r * 1.05 + 0.15, Math.sin(a) * d] }, 4);
  }
  return b.geometry();
}

/** Tropenbusch mit Hibiskusblüten. */
export function hibiscusGeo(r = 0.7, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  for (const [dx, dy, dz, k] of [[0, 0.6, 0, 1], [-0.7, 0.42, 0.25, 0.78], [0.7, 0.45, -0.2, 0.74]]) {
    b.sphere(r * k, { v: (x, y, z, nx, ny) => mix(0x2a8a4a, 0x6ad86a, ny * 0.5 + 0.5) }, { p: [dx * r, dy * r, dz * r] }, 7, 5);
  }
  for (let i = 0; i < 4; i++) {
    const a = rnd.real(0, TAU);
    b.sphere(0.15, i % 2 ? 0xff4a9a : 0xff8a2a, { p: [Math.cos(a) * r * 0.8, r * rnd.real(0.7, 1.2), Math.sin(a) * r * 0.8], s: [1, 0.5, 1] }, 6, 3);
  }
  return b.geometry();
}

/** Akazie: schräger Stamm, flache Schirmkrone in zwei Lagen. */
export function acaciaGeo(h = 5, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const lean = rnd.real(-0.5, 0.5);
  b.tube([[0, 0, 0], [lean * 0.3, h * 0.45, 0.1], [lean, h * 0.8, 0]], 0.16, { v: (x, y) => mix(0x5a3a22, 0x8a5a36, y / h) }, null, 6, 5);
  b.tube([[lean * 0.3, h * 0.45, 0.1], [lean * 0.3 - 1.0, h * 0.78, -0.2]], 0.09, 0x6a4628, null, 4, 4);
  b.sphere(h * 0.42, { v: (x, y, z, nx, ny) => mix(0x4a8a2e, 0x8ac84a, ny * 0.5 + 0.5) }, { p: [lean * 0.7, h * 0.86, 0], s: [1, 0.22, 0.8] }, 10, 5);
  b.sphere(h * 0.26, { v: (x, y, z, nx, ny) => mix(0x5a9a34, 0x9ad85a, ny * 0.5 + 0.5) }, { p: [lean * 0.4 - 0.6, h * 0.97, -0.1], s: [1, 0.3, 0.85] }, 8, 4);
  return b.geometry();
}

/** Termitenhügel: gerippter Lehmturm. */
export function termiteGeo(s = 1) {
  const b = new Build();
  b.cone(0.75 * s, 2.0 * s, { v: (x, y) => mix(0xa85a34, 0xd48a50, y / (2 * s) + 0.5) }, { p: [0, s, 0] }, 7);
  b.cone(0.38 * s, 1.1 * s, 0xc07a44, { p: [0.4 * s, 0.55 * s, 0.2 * s] }, 6);
  b.cone(0.3 * s, 0.8 * s, 0xb8703c, { p: [-0.35 * s, 0.4 * s, -0.2 * s] }, 6);
  return b.geometry();
}

/** Grasbüschel (Savanne, gold). */
export function grassTuftGeo(s = 1, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + rnd.real(-0.3, 0.3);
    b.cone(0.06 * s, 0.7 * s * rnd.real(0.8, 1.2), { v: (x, y) => mix(0xc89a3a, 0xf6dc78, y + 0.5) }, { p: [Math.cos(a) * 0.12 * s, 0.33 * s, Math.sin(a) * 0.12 * s], r: [Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35] }, 3);
  }
  return b.geometry();
}

/** Violetter Felsbrocken (zwei, drei runde Brocken). */
export function violetRockGeo(r = 1, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const n = 2 + Math.floor(rnd.frac() * 2);
  for (let i = 0; i < n; i++) {
    const rr = r * (i ? rnd.real(0.45, 0.7) : 1);
    b.add(new THREE.DodecahedronGeometry(rr, 0), { v: (x, y, z, nx, ny) => mix(0x7a46a8, 0xd8b4f0, Math.max(0, ny) * 0.8 + 0.1) },
      { p: [i ? rnd.real(-r, r) : 0, rr * 0.7, i ? rnd.real(-r * 0.6, r * 0.6) : 0], r: [rnd.real(0, 3), rnd.real(0, 3), 0], s: [1.15, 0.85, 1] });
  }
  return b.geometry();
}

/** Muscheln und Seesterne (flach, ohne Schatten). */
export function shellsGeo(size = [6, 3], n = 7, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  for (let i = 0; i < n; i++) {
    const x = rnd.real(-size[0] / 2, size[0] / 2), z = rnd.real(-size[1] / 2, size[1] / 2);
    if (rnd.frac() < 0.4) {
      for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; b.box(0.2, 0.05, 0.07, 0xff7a5a, { p: [x + Math.cos(a) * 0.1, 0.03, z + Math.sin(a) * 0.1], r: [0, -a, 0] }, 0); }
    } else b.sphere(0.13, rnd.frac() < 0.5 ? 0xfff0f6 : 0xffc8dc, { p: [x, 0.03, z], s: [1.2, 0.4, 1] }, 6, 3);
  }
  return b.geometry();
}

/** Strandkorb (Spielzeug-Look): gestreiftes Haubendach, Korbgeflecht, Sitzpolster. Vorderseite +Z. */
export function beachChairGeo(color = 0x9a5ad8) {
  const b = new Build();
  const wick = { v: (x, y, z, nx, ny) => mix(0xd8b47a, 0xf4dcae, ny * 0.3 + 0.5 + Math.sin(y * 18) * 0.12) };
  b.box(1.5, 0.55, 0.95, wick, { p: [0, 0.32, 0] }, 0.06, 1);
  b.box(1.5, 1.35, 0.25, wick, { p: [0, 1.05, -0.38] }, 0.06, 1);
  for (const s of [-1, 1]) b.box(0.18, 0.95, 0.85, wick, { p: [s * 0.72, 0.95, -0.02] }, 0.05, 1);
  // Haube: halber Zylinder mit Streifen
  b.add(new THREE.CylinderGeometry(0.78, 0.78, 1.0, 10, 1, true, -Math.PI / 2, Math.PI), (x, y, z) => (Math.floor((Math.atan2(z, x) + 4) * 2.2) % 2 ? color : 0xffffff), { p: [0, 1.75, -0.05], r: [0, 0, Math.PI / 2], s: [1, 1, 0.75] });
  b.box(1.32, 0.12, 0.62, color, { p: [0, 0.62, 0.05] }, 0.04, 1);   // Polster
  b.box(1.35, 0.1, 0.1, 0x8a5a36, { p: [0, 0.06, 0.55] }, 0, 1);
  return b.geometry();
}

/** Sonnenschirm (Streifen) mit Stange; Farbe color. */
export function parasolGeo(color = 0x3ac8e8, h = 2.6) {
  const b = new Build();
  b.cyl(0.04, 0.05, h, 0xf6f2ea, { p: [0, h / 2, 0], r: [0, 0, 0.06] }, 5);
  b.add(new THREE.ConeGeometry(1.35, 0.55, 12, 1, true), (x, y, z) => (Math.floor((Math.atan2(z, x) + 4) / (TAU / 12)) % 2 ? color : 0xffffff), { p: [0.15, h + 0.12, 0] });
  b.sphere(0.07, 0xffffff, { p: [0.15, h + 0.42, 0] }, 6, 4);
  return b.geometry();
}

/** Badetuch (flach) mit Streifen. */
export function towelGeo(color = 0xff7ab4) {
  const b = new Build();
  for (let i = 0; i < 5; i++) b.box(0.24, 0.025, 1.6, i % 2 ? 0xffffff : color, { p: [-0.48 + i * 0.24, 0.015, 0] }, 0);
  return b.geometry();
}

/** Sandburg mit Türmchen und Fähnchen. */
export function sandcastleGeo(s = 1) {
  const b = new Build();
  const sand = { v: (x, y, z, nx, ny) => mix(0xe0c0d8, 0xf6e2f2, ny * 0.5 + 0.5) };
  b.box(1.6 * s, 0.6 * s, 1.2 * s, sand, { p: [0, 0.3 * s, 0] }, 0.05, 1);
  for (const [x, z, h] of [[-0.7, -0.5, 1.1], [0.7, -0.5, 1.1], [-0.7, 0.5, 0.9], [0.7, 0.5, 0.9], [0, -0.1, 1.6]]) {
    b.cyl(0.26 * s, 0.32 * s, h * s, sand, { p: [x * s, h * s / 2, z * s] }, 7);
    b.cone(0.3 * s, 0.32 * s, 0xead0e8, { p: [x * s, (h + 0.16) * s, z * s] }, 7);
  }
  b.cyl(0.015, 0.015, 0.6 * s, 0xf6f2ea, { p: [0, 2.0 * s, -0.1 * s] }, 3);
  b.box(0.32 * s, 0.2 * s, 0.02, 0xe8283a, { p: [0.17 * s, 2.2 * s, -0.1 * s] }, 0);
  return b.geometry();
}

/** Surfbrett, schräg im Sand. */
export function surfboardGeo(color = 0xff8a3a) {
  const b = new Build();
  b.sphere(1, { v: (x, y, z, nx) => (Math.abs(x) < 0.12 ? 0xffffff : color) }, { p: [0, 1.0, 0], s: [0.32, 1.15, 0.06], r: [0.12, 0, 0.1] }, 10, 6);
  return b.geometry();
}

/** Rettungsring an einem Pfosten. */
export function lifebuoyGeo() {
  const b = new Build();
  b.cyl(0.07, 0.08, 1.6, 0xf6f2ea, { p: [0, 0.8, 0] }, 5);
  b.torus(0.32, 0.1, (x, y) => (Math.floor((Math.atan2(y - 1.25, x) / TAU + 1) * 8) % 2 ? 0xe8283a : 0xffffff), { p: [0, 1.25, 0.12] }, 5, 14);
  return b.geometry();
}

/** Kleiner Leuchtturm auf einem Felsen (Kulisse im Meer): rot-weiß, Galerie, Laterne. */
export function lighthouseGeo(h = 8) {
  const b = new Build();
  b.add(new THREE.DodecahedronGeometry(2.4, 0), { v: (x, y, z, nx, ny) => mix(0x6a3a96, 0xc89ae2, Math.max(0, ny) * 0.8 + 0.1) }, { p: [0, 0.4, 0], s: [1.3, 0.7, 1.1] });
  const n = 5;
  for (let i = 0; i < n; i++) b.cyl(1.0 - (i + 1) * 0.08, 1.0 - i * 0.08, h / n, i % 2 ? 0xffffff : 0xe8283a, { p: [0, 1.6 + (h / n) * (i + 0.5), 0] }, 12);
  b.cyl(0.85, 0.85, 0.14, 0x3a3a48, { p: [0, 1.6 + h + 0.07, 0] }, 12);
  b.cyl(0.42, 0.42, 0.8, 0xfff2b0, { p: [0, 1.6 + h + 0.55, 0] }, 10);
  b.cone(0.62, 0.7, 0xe8283a, { p: [0, 1.6 + h + 1.3, 0] }, 10);
  return b.geometry();
}

/** Segelboot (Kulisse im Meer). */
export function sailboatGeo(color = 0xb46ae8) {
  const b = new Build();
  b.box(2.4, 0.5, 0.9, { v: (x, y, z, nx, ny) => (ny > 0.5 ? 0xd8a46a : 0xffffff) }, { p: [0, 0.2, 0] }, 0.2, 1);
  b.cyl(0.04, 0.05, 2.8, 0xf6f2ea, { p: [0.1, 1.8, 0] }, 5);
  const sail = new THREE.Shape(); sail.moveTo(0, 0); sail.lineTo(1.2, 0); sail.lineTo(0, 2.3); sail.lineTo(0, 0);
  b.extrude(sail, 0.03, (x, y) => (Math.floor(y * 2) % 2 ? color : 0xffffff), { p: [0.16, 0.55, 0] }, 0, 1);
  return b.geometry();
}

/** Zuckerstange. */
export function candyCaneGeo(h = 2.4) {
  const b = new Build();
  const pts = [[0, 0, 0], [0, h * 0.75, 0], [0.1, h * 0.92, 0], [0.4, h, 0], [0.7, h * 0.9, 0], [0.75, h * 0.75, 0]];
  b.tube(pts, 0.14, (x, y) => (Math.floor((y + x) * 3.2) % 2 ? 0xe8203a : 0xffffff), null, 16, 7);
  return b.geometry();
}

/** Riesen-Kirsche. */
export function cherryGeo(s = 0.8) {
  const b = new Build();
  b.sphere(0.5 * s, { v: (x, y, z, nx, ny) => mix(0xa8102a, 0xff3a5a, ny * 0.5 + 0.5) }, { p: [0, 0.5 * s, 0] }, 10, 7);
  b.tube([[0, 0.95 * s, 0], [0.1 * s, 1.4 * s, 0], [0.35 * s, 1.7 * s, 0]], 0.04 * s, 0x4a8a2a, null, 6, 4);
  return b.geometry();
}

/** Cupcake mit Sahnehaube. */
export function cupcakeGeo(s = 1, color = 0xff9ac8) {
  const b = new Build();
  b.cyl(0.62 * s, 0.48 * s, 0.6 * s, (x, y, z) => (Math.floor((Math.atan2(z, x) + 4) * 3) % 2 ? 0x6ab8ff : 0x9ad0ff), { p: [0, 0.3 * s, 0] }, 12);
  b.lathe([[0.68 * s, 0], [0.6 * s, 0.22 * s], [0.42 * s, 0.42 * s], [0.18 * s, 0.6 * s], [0, 0.7 * s]], { v: (x, y) => mix(color, 0xffffff, y * 0.8) }, { p: [0, 0.6 * s, 0] }, 12);
  b.sphere(0.13 * s, 0xe8203a, { p: [0, 1.36 * s, 0] }, 7, 5);
  return b.geometry();
}

/** Tropenbaum (Tempel-Dschungel): dicker Stamm, große runde Krone in Grüntönen. */
export function jungleTreeGeo(h = 5, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  b.cyl(0.2, 0.32, h * 0.55, { v: (x, y) => mix(0x5a3a22, 0x8a5a36, y / h + 0.5) }, { p: [0, h * 0.27, 0] }, 6, true);
  const pal = rnd.frac() < 0.5 ? [0x1e7a3a, 0x5ac25a] : [0x2a8a32, 0x8ad85a];
  for (const [dx, dy, dz, r] of [[0, 0.7, 0, 1], [-0.6, 0.55, 0.2, 0.78], [0.6, 0.6, -0.2, 0.8]]) {
    b.sphere(h * 0.24 * r, { v: (x, y, z, nx, ny) => mix(pal[0], pal[1], ny * 0.5 + 0.5) }, { p: [dx * h * 0.24, dy * h, dz * h * 0.24] }, 8, 5);
  }
  return b.geometry();
}

/** Steinkopf (Tempel-Kulisse): grimmiger Quaderkopf mit Moos. */
export function stoneHeadGeo(s = 1) {
  const b = new Build();
  b.box(1.6 * s, 2.0 * s, 1.4 * s, { v: (x, y, z, nx, ny) => mix(0x9a8a72, 0xd8c8a8, ny * 0.4 + 0.5) }, { p: [0, 1.0 * s, 0] }, 0.08, 1);
  b.box(1.2 * s, 0.22 * s, 0.2 * s, 0x6a5a48, { p: [0, 1.45 * s, 0.68 * s] }, 0, 1);
  b.box(0.3 * s, 0.6 * s, 0.3 * s, 0xb8a888, { p: [0, 1.05 * s, 0.75 * s] }, 0, 1);
  b.box(0.9 * s, 0.14 * s, 0.14 * s, 0x5a4a3a, { p: [0, 0.55 * s, 0.7 * s] }, 0, 1);
  b.sphere(0.5 * s, 0x6aa04a, { p: [-0.4 * s, 2.0 * s, 0], s: [1.2, 0.35, 1.2] }, 7, 3);
  return b.geometry();
}

/** Wolkeninsel in der Ferne (Ausblick auf Welt 6): weiße Kugelwolke mit grünem Inselchen obenauf. */
export function cloudGeo(s = 6, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  for (const [dx, dy, dz, r] of [[0, 0.3, 0, 1], [-0.9, 0.1, 0.2, 0.75], [0.95, 0.12, -0.1, 0.8], [0.3, 0.55, -0.3, 0.6], [-0.4, 0.5, 0.35, 0.55]]) {
    b.sphere(r * s * 0.5, { v: (x, y, z, nx, ny) => mix(0xd8e4f6, 0xffffff, ny * 0.5 + 0.5) }, { p: [dx * s * 0.5, dy * s * 0.5, dz * s * 0.5], s: [1, 0.62, 1] }, 9, 5);
  }
  b.cyl(s * 0.32, s * 0.36, s * 0.12, 0x6ac85a, { p: [rnd.real(-0.1, 0.1) * s, s * 0.46, 0] }, 9);
  return b.geometry();
}

/** Leuchtende Fackel (Tiki-Fackel: Bambus, Flamme im Material 'glow'). */
export function tikiGeo() {
  const b = new Build();
  b.cyl(0.06, 0.08, 2.0, { v: (x, y) => (Math.floor(y * 3) % 2 ? 0xc89a5a : 0xa87a44) }, { p: [0, 1.0, 0] }, 5);
  b.cyl(0.16, 0.11, 0.32, 0x6a4424, { p: [0, 2.12, 0] }, 6);
  return b.geometry();
}
export function tikiFlameGeo() {
  const b = new Build();
  b.cone(0.17, 0.5, 0xffa03a, { p: [0, 2.5, 0] }, 7);
  b.cone(0.1, 0.32, 0xfff0a0, { p: [0, 2.42, 0] }, 6);
  return b.geometry();
}

/**
 * Requisite nach Art (map.props, Welt 5): Geometrie mit Fußpunkt im Ursprung, oder null.
 */
export function lilaPropGeo(it, seed) {
  switch (it.kind) {
    case 'lavender': return lavenderGeo(it.size ?? 0.6, seed);
    case 'hibiscus': return hibiscusGeo(it.size ?? 0.7, seed);
    case 'acacia': return acaciaGeo(it.size ?? 5, seed);
    case 'termite': return termiteGeo(it.size ?? 1);
    case 'grasstuft': return grassTuftGeo(it.size ?? 1, seed);
    case 'violetrock': return violetRockGeo(it.size ?? 1, seed);
    case 'shells5': return shellsGeo(it.area ?? [6, 3], it.n ?? 7, seed);
    case 'beachchair': return beachChairGeo(it.color ?? 0x9a5ad8);
    case 'parasol': return parasolGeo(it.color ?? 0x3ac8e8, it.size ?? 2.6);
    case 'towel': return towelGeo(it.color ?? 0xff7ab4);
    case 'sandcastle': return sandcastleGeo(it.size ?? 1);
    case 'surfboard': return surfboardGeo(it.color ?? 0xff8a3a);
    case 'lifebuoy': return lifebuoyGeo();
    case 'lighthouse': return lighthouseGeo(it.size ?? 8);
    case 'sailboat': return sailboatGeo(it.color ?? 0xb46ae8);
    case 'candycane': return candyCaneGeo(it.size ?? 2.4);
    case 'cherry5': return cherryGeo(it.size ?? 0.8);
    case 'cupcake': return cupcakeGeo(it.size ?? 1, it.color ?? 0xff9ac8);
    case 'jungletree': return jungleTreeGeo(it.size ?? 5, seed);
    case 'stonehead': return stoneHeadGeo(it.size ?? 1);
    case 'templecolumn': return columnGeo(it.size ?? 3, !!it.broken, seed);
    case 'obelisk5': return obeliskGeo(it.size ?? 5);
    case 'tiki': return tikiGeo();
    case 'tomb5': return tombGeo(seed);
    case 'deadtree': return bareTreeGeo(it.size ?? 4.2, seed);
    case 'palm5': return palmGeo(it.size ?? 5, it.lean ?? 0.8, seed);
    case 'cloud5': return cloudGeo(it.size ?? 6, seed);
    default: return null;
  }
}

/** Leuchtende Teile einer Welt-5-Requisite (Material 'glow'), sonst null. */
export function lilaPropGlow(it) {
  switch (it.kind) {
    case 'tiki': return tikiFlameGeo();
    default: return null;
  }
}

/** Kollision einer Welt-5-Requisite (begehbares Gelände): Zylinder/Quader oder null. */
export function lilaPropShape(it) {
  const [x, y, z] = it.pos;
  const cyl = (r, h) => ({ type: 'cyl', x, z, r, y0: y - 0.2, y1: y + h, tag: `deko:${it.kind}` });
  switch (it.kind) {
    case 'acacia': case 'jungletree': case 'palm5': case 'deadtree': return cyl(0.3, 3);
    case 'termite': return cyl(0.7 * (it.size ?? 1), 2 * (it.size ?? 1));
    case 'violetrock': return cyl((it.size ?? 1) * 0.9, (it.size ?? 1) * 1.2);
    case 'beachchair': return { type: 'box', min: [x - 0.8, y - 0.2, z - 0.55], max: [x + 0.8, y + 2.3, z + 0.55], tag: 'deko:strandkorb' };
    case 'parasol': return cyl(0.15, it.size ?? 2.6);
    case 'sandcastle': return cyl(0.9 * (it.size ?? 1), 1.4 * (it.size ?? 1));
    case 'lifebuoy': case 'tiki': return cyl(0.15, 2);
    case 'candycane': return cyl(0.2, it.size ?? 2.4);
    case 'cupcake': return cyl(0.62 * (it.size ?? 1), 1.3 * (it.size ?? 1));
    case 'cherry5': return cyl(0.45 * (it.size ?? 0.8), 1);
    case 'stonehead': return { type: 'box', min: [x - 0.85 * (it.size ?? 1), y - 0.2, z - 0.75 * (it.size ?? 1)], max: [x + 0.85 * (it.size ?? 1), y + 2 * (it.size ?? 1), z + 0.75 * (it.size ?? 1)], tag: 'deko:steinkopf' };
    case 'templecolumn': return cyl(0.5, it.size ?? 3);
    case 'obelisk5': return cyl(0.6, it.size ?? 5);
    case 'tomb5': return cyl(0.45, 1.2);
    default: return null;
  }
}

// ------------------------------------------------------------------ Registry-Kulisse der Welt 5 (deco_w5_<kind>)

const TRIS = new Map();
/** Dreiecke eines Registry-Modells (einmal gezählt, gemerkt) – Schutz vor zu schweren Modellen auf der Karte. */
export function modelTris(name, opts = {}) {
  const key = `${name}|${JSON.stringify(opts)}`;
  if (TRIS.has(key)) return TRIS.get(key);
  let n = Infinity;
  try {
    const m = getModel(name, opts);
    if (m && !m.placeholder) {
      n = 0;
      m.root.traverse((o) => { if (o.isMesh && o.geometry) n += ((o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3) * (o.isInstancedMesh ? o.count : 1); });
    }
    m?.dispose?.();
  } catch { n = Infinity; }
  TRIS.set(key, n);
  return n;
}

const W5_PROP_MODELS = {
  parasol: (it) => ['deco_w5_sonnenschirm', { color: it.tone ?? 'lila', height: it.size ?? 2.6 }],
  sandcastle: (it) => ['deco_w5_sandburg', { size: 2 * (it.size ?? 1) }],
  acacia: (it) => ['deco_w5_akazie', { height: it.size ?? 5 }],
  termite: (it) => ['deco_w5_termitenhuegel', { size: 1.4 * (it.size ?? 1) }],
  candycane: (it) => ['deco_w5_zuckerstange', { height: it.size ?? 2.4 }],
  cherry5: (it) => ['deco_w5_kirsche', { size: 0.75 * (it.size ?? 0.8) }],
  stonehead: (it) => ['deco_w5_steinkopf', { size: 2.4 * (it.size ?? 1) }],
  templecolumn: (it) => ['deco_w5_tempelsaeule', { height: it.size ?? 3, broken: !!it.broken }],
  obelisk5: (it) => ['deco_w5_obelisk', { height: it.size ?? 5 }],
};

/**
 * Requisite (map.props, Welt 5) → Kulissen-Modell der Registry 'deco_w5_<kind>' als [name, opts, yaw-Korrektur, scale],
 * sobald es das Modell gibt und es höchstens cap Dreiecke hat; sonst null (eigene Geometrie aus lilaPropGeo).
 */
export function lilaPropModel(it, cap = 5000) {
  const f = W5_PROP_MODELS[it.kind];
  if (!f) return null;
  const [name, opts] = f(it);
  if (!hasModel(name) || modelTris(name, opts) > cap) return null;
  return [name, opts, -Math.PI / 2, 1];
}

// ------------------------------------------------------------------ Streudeko

/**
 * Streudeko auf nicht begehbaren Blöcken (deterministisch): Lavendel, Palmen und violette Felsen auf den Klippen,
 * dichter Palmenhain, Akazien/Grasbüschel/Termitenhügel in der Savanne, kahle Bäume und Grabsteine auf der Spukwiese,
 * Zuckerstangen und Kirschen auf der Torte, Dschungelbäume am Tempel, Muscheln am Strand.
 */
export function scatterLila(level, map, grid) {
  const parts = [], flatParts = [];
  map.ground.forEach((b, i) => {
    const style = b.style ?? 'lila';
    if (b.walk || b.noDeco || ['lavarock', 'basin', 'circus', 'arena', 'cave', 'fort', 'paving', 'gravel'].includes(style)) return;
    const [x0, z0, x1, z1] = b.rect;
    const w = x1 - x0, d = z1 - z0;
    if (w < 2.5 || d < 2.5) return;
    const [cx, cz] = [(x0 + x1) / 2, (z0 + z1) / 2];
    if (grid.isWalk(cx, cz)) return;
    const rnd = new Rnd(0x11a5 + i * 131);
    const pts = [];
    const tooClose = (x, z, r) => pts.some((p) => Math.hypot(p[0] - x, p[1] - z) < r);
    const area = w * d;
    const y = b.top;
    // Hügel (savannahill): Deko nur am Fuß
    const hill = b.hill ? { x: b.hill.at?.[0] ?? cx, z: b.hill.at?.[1] ?? cz, r: (b.hill.r ?? Math.min(w, d) * 0.5) * 0.92 } : null;
    const put = (n, minD, make, list = parts) => {
      for (let k = 0, tries = 0; k < n && tries < n * 14; tries++) {
        const x = rnd.real(x0 + 1.1, x1 - 1.1), z = rnd.real(z0 + 1.1, z1 - 1.1);
        if (tooClose(x, z, minD) || (hill && Math.hypot(x - hill.x, z - hill.z) < hill.r)) continue;
        pts.push([x, z]);
        const g = make(rnd);
        if (g) list.push(place(g, x, y, z, rnd.real(0, Math.PI * 2)));
        k++;
      }
    };
    const dens = b.trees ?? 1;
    switch (style) {
      case 'lilabeach':
        put(Math.floor(area / 70), 2, (r) => shellsGeo([3, 2], 4, r.int(1, 999)), flatParts);
        put(Math.floor((area / 260) * dens), 5, (r) => palmGeo(r.real(4, 5.4), r.real(0.5, 1.2), r.int(1, 999)));
        return;
      case 'palmgrove':
        put(Math.max(1, Math.floor((area / 45) * dens)), 3.2, (r) => palmGeo(r.real(4.2, 6), r.real(0.4, 1.3), r.int(1, 999)));
        put(Math.floor(area / 70), 1.8, (r) => hibiscusGeo(r.real(0.55, 0.8), r.int(1, 999)));
        return;
      case 'savanna': case 'savannahill':
        put(Math.max(1, Math.floor((area / 110) * dens)), 4.5, (r) => acaciaGeo(r.real(4, 5.6), r.int(1, 999)));
        put(Math.floor(area / 60), 1.4, (r) => grassTuftGeo(r.real(0.8, 1.2), r.int(1, 999)));
        put(Math.floor(area / 240), 3, (r) => termiteGeo(r.real(0.7, 1.1)));
        return;
      case 'spook':
        put(Math.max(1, Math.floor((area / 90) * dens)), 3.4, (r) => bareTreeGeo(r.real(3.4, 4.6), r.int(1, 999)));
        put(Math.floor(area / 110), 1.6, (r) => tombGeo(r.int(1, 999)));
        return;
      case 'cake':
        put(Math.max(1, Math.floor(area / 50)), 2.2, (r) => (r.frac() < 0.5 ? candyCaneGeo(r.real(1.8, 2.6)) : cupcakeGeo(r.real(0.8, 1.1), r.frac() < 0.5 ? 0xff9ac8 : 0xc8a0ff)));
        put(Math.floor(area / 70), 1.6, (r) => cherryGeo(r.real(0.6, 0.9)));
        return;
      case 'temple':
        put(Math.max(1, Math.floor((area / 80) * dens)), 3.4, (r) => jungleTreeGeo(r.real(4, 5.6), r.int(1, 999)));
        put(Math.floor(area / 160), 2, (r) => columnGeo(r.real(1.2, 2.6), true, r.int(1, 999)));
        return;
      default:   // lilarock, lila
        put(Math.floor((area / 85) * dens), 2.4, (r) => lavenderGeo(r.real(0.45, 0.7), r.int(1, 999)));
        put(Math.floor((area / 240) * dens), 4, (r) => palmGeo(r.real(3.8, 5.2), r.real(0.4, 1.2), r.int(1, 999)));
        put(Math.floor(area / 240), 2.4, (r) => violetRockGeo(r.real(0.5, 0.9), r.int(1, 999)));
    }
  });
  for (const g of parts) level.view?.addStatic(g, { castShadow: true });
  for (const g of flatParts) level.view?.addStatic(g, { castShadow: false });
}

// ------------------------------------------------------------------ Holzsteg (Weltdaten segments)

/**
 * Holzsteg (segments: { type: 'boardwalk', from, to, width }): Kollision wie der Standard-Baustein `bridge`, Optik:
 * weiß gestrichene Planken mit Fugen, Pfähle bis ins Wasser, Taue mit Durchhang an Pfosten mit Kugelköpfen,
 * ab und zu ein Rettungsring.
 */
export function buildBoardwalk(level, spec) {
  buildBridge({ world: level.world, view: null }, { ...spec, rails: false });
  if (!level.view) return;
  const a = spec.from, c = spec.to;
  const dx = c[0] - a[0], dz = c[2] - a[2], L = Math.hypot(dx, dz);
  if (L < 0.01) return;
  const w = spec.width ?? 4, dy = c[1] - a[1], slope = dy / L, pitch = Math.atan(slope);
  const yaw = Math.atan2(-dz / L, dx / L);
  const rnd = new Rnd(Math.round(L * 37 + a[0] * 5 + a[2]));
  const b = new Build();
  // Deck: ein Quader (Seiten), oben ein Planken-Raster (helle und etwas dunklere Planken mit Fugen)
  const Ld = Math.hypot(L, dy);
  b.box(Ld + 0.1, 0.16, w, 0xc8b8a8, { p: [L / 2, dy / 2 - 0.09, 0], r: [0, 0, pitch] }, 0);
  const np = Math.max(1, Math.floor(Ld / 0.5));
  const dpos = [], dcol = [];
  const c0 = new THREE.Color(), c1 = new THREE.Color(0xd8ccc0);
  for (let i = 0; i < np; i++) {
    const u0 = (i / np) * Ld - Ld / 2 + 0.03, u1 = ((i + 1) / np) * Ld - Ld / 2 - 0.03;
    c0.copy(mix(0xfaf4ea, 0xe8ddd0, rnd.frac()));
    for (const [u, v] of [[u0, -w / 2], [u0, w / 2], [u1, w / 2], [u0, -w / 2], [u1, w / 2], [u1, -w / 2]]) { dpos.push(u, 0, v); dcol.push(c0.r, c0.g, c0.b); }
    for (const [u, v] of [[u1, -w / 2], [u1, w / 2], [u1 + 0.06, w / 2], [u1, -w / 2], [u1 + 0.06, w / 2], [u1 + 0.06, -w / 2]]) { dpos.push(u, -0.005, v); dcol.push(c1.r, c1.g, c1.b); }
  }
  const deck = new THREE.BufferGeometry();
  deck.setAttribute('position', new THREE.Float32BufferAttribute(dpos, 3));
  deck.setAttribute('color', new THREE.Float32BufferAttribute(dcol, 3));
  deck.computeVertexNormals();
  deck.rotateZ(pitch);
  deck.translate(L / 2, dy / 2 + 0.002, 0);
  b.parts.push(deck);
  // Pfähle ins Wasser (lokal: Meeresspiegel bei −a[1]), Pfosten mit Kugelkopf, Taue
  const sea = -a[1];
  const nPost = Math.max(2, Math.round(L / 4.5) + 1);
  const H = 1.0;
  for (const s of [-1, 1]) {
    const tops = [];
    for (let k = 0; k < nPost; k++) {
      const t = k / (nPost - 1), px = t * L, py = t * dy;
      const low = sea - 0.6, hgt = py + H - low;
      b.cyl(0.12, 0.15, hgt, { v: (x, y) => (y < -hgt / 2 + (py - low) ? 0x8a6a4a : 0xb27ed2) }, { p: [px, low + hgt / 2, s * (w / 2 + 0.05)] }, 5, true);
      b.sphere(0.16, 0xffffff, { p: [px, py + H + 0.08, s * (w / 2 + 0.05)] }, 5, 3);
      tops.push([px, py + H, s * (w / 2 + 0.05)]);
    }
    const rope = [];
    for (let k = 0; k < tops.length - 1; k++) {
      const [ax, ay, az] = tops[k], [bx, by] = tops[k + 1];
      for (let m = 0; m < 3; m++) { const t = m / 3; rope.push([ax + (bx - ax) * t, ay + (by - ay) * t - Math.sin(t * Math.PI) * 0.18, az]); }
    }
    rope.push(tops[tops.length - 1]);
    b.tube(rope, 0.04, 0xe8cc8a, null, Math.max(6, rope.length), 3);
  }
  if (L > 7) {
    const t = 0.5;
    b.torus(0.3, 0.09, (x, y) => (Math.floor((Math.atan2(y, x) / TAU + 1) * 8) % 2 ? 0xe8283a : 0xffffff), { p: [t * L, t * dy + 0.62, (w / 2 + 0.2)] }, 5, 12);
  }
  const g = b.geometry();
  g.rotateY(yaw);
  g.translate(a[0], a[1], a[2]);
  level.view.addStatic(g, { castShadow: true });
}

// ------------------------------------------------------------------ Nachbarwelt und Inselchen

/** Lila Strand-Insel als ferne Nachbarwelt (Ziel der Glasröhre aus Welt 4): violette Klippen, Strand, Palmen, Leuchtturm. */
export function lilaNeighborParts(nb, rnd) {
  const [x, z] = nb.pos;
  const [w, d] = nb.size ?? [80, 54];
  const parts = [];
  const theme = THEMES.map_lila;
  const blocks = [[-0.5, 0.1, 0.5, 0.5, 0.5, 'lilabeach'], [-0.42, -0.4, 0.3, 0.12, 2.6, 'lila'], [-0.3, -0.5, 0.05, -0.15, 9, 'lilarock'], [0.12, -0.42, 0.4, -0.05, 12, 'lilarock'], [0.3, -0.05, 0.48, 0.2, 4, 'palmgrove']];
  for (const [a, c, e, f, top, style] of blocks) parts.push(...lilaGround({ rect: [x + a * w, z + c * d, x + e * w, z + f * d], top, style }, -3, theme, rnd));
  for (let i = 0; i < 6; i++) parts.push(place(palmGeo(rnd.real(4.5, 6), rnd.real(0.6, 1.2), i + 3), x + rnd.real(-0.42, 0.42) * w, 2.6, z + rnd.real(0.0, 0.1) * d, rnd.real(0, 6)));
  parts.push(place(lighthouseGeo(9), x + 0.38 * w, 0, z + 0.3 * d));
  for (const p of parts) for (const k of Object.keys(p.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') p.deleteAttribute(k);
  return parts;
}

/** Kleines Lila-Inselchen im Meer (Kulisse): flacher heller Sand, oft mit Palme, manchmal ein violetter Felsen. */
export function lilaIsletParts(x, z, w, d, top, rnd) {
  const theme = THEMES.map_lila;
  const parts = lilaGround({ rect: [x - w / 2, z - d / 2, x + w / 2, z + d / 2], top: Math.min(top, 1.2), style: 'lilabeach' }, -2, theme, rnd);
  const k = rnd.frac();
  if (k < 0.6) parts.push(place(palmGeo(rnd.real(3.8, 5), rnd.real(0.6, 1.4), rnd.int(1, 999)), x + rnd.real(-1, 1), Math.min(top, 1.2), z + rnd.real(-0.8, 0.8), rnd.real(0, 6)));
  else parts.push(place(violetRockGeo(rnd.real(1, 1.6), rnd.int(1, 99)), x + rnd.real(-1, 1), Math.min(top, 1.2), z + rnd.real(-0.8, 0.8), rnd.real(0, 6)));
  return parts;
}
