// Gelände, Ränder, Streudeko, Requisiten, Brücken und lebendige Kulisse der Welt-8-Karte „Brummbär-Rummelplatz“ (eigene
// Gestaltung, Spielzeug-Look wie Welt 1–7, kindgerecht: das dunkle Baron-Land als warmer Abend-Vergnügungspark – keine
// Gruselbilder). In der Mitte der Insel steht der riesige Baron-Turm (Ziel 8-Burg), drumherum Riesenrad, Karussell,
// Achterbahn, Buden mit Wimpeln, Glühbirnenketten und Brummbär-Ballons; die Level-Zonen liegen als Inseln im Abendmeer.
// Geländestile (map.ground[].style): 'plaza' (Standard, Rummel-Pflaster), 'parkgrass' (Parkrasen mit Blüten), 'rainrock'
// (nasser Schieferfels mit Pfützen, 8-1), 'sand' (Dünensand, 8-2), 'cookie' (Keksboden mit Zuckerguss, 8-3), 'station'
// (Bahnsteig mit Sicherheitslinie, 8-Zug), 'rails' (Gleisbett mit Schienen), 'nightstone' (Nachtstein mit blau glimmenden
// Fugen, 8-4), 'shore' (Kiesufer, 8-5), 'lake' (See: Grund, Felsrand, Wasser), 'spook' (Spukgarten-Platten mit Moos, 8-6),
// 'house' (Holzdielen, 8-Haus), 'inferno' (Basalt mit Glutrissen, 8-7), 'circus' (Sägemehl-Manege, 8-A/8-B), 'tower'
// (Baron-Fliesen, 8-Burg), 'towerbase' (Felssockel des Turms); dazu die Lava-Stile aus lava7.js ('basin', 'rock', 'cliff' …).
// Ränder (map.edges): 'parkwall' (Mäuerchen mit roten/cremefarbenen Feldern und Goldkugeln), 'parkrail' (rot-weiß geringeltes
// Geländer mit Goldhandlauf an Abbrüchen), dazu 'battlement'/'basaltwall' aus lava7.js.
// Verbindungen (segments, Kollision wie `bridge`): 'rummelbridge' (Holzsteg mit rot-weißem Geländer und Laternen), dazu die
// Welt-7-Brücken ('basaltbridge', 'chainbridge', 'drawbridge') und Glasröhren ('glasstube', sky6.js).
// Lebendige Kulisse (RummelLife, je Bild): Glühbirnenketten blinken im Takt der Kartenmusik (music.beat(); ohne laufende Musik
// Ersatzuhr im Tempo von course_world8_map), Brummbär-Fahnen und Turm-Banner wehen (nach dem Spielende bunte Herz-/Stern-
// Fahnen), Riesenrad und Karussell drehen sich, Achterbahn-Wägelchen fahren, Brummbär-Ballons steigen auf, nach dem Spielende
// Feuerwerk; Lava, Rauch, Knochenflieger und Fackeln aus LavaLife (lava7.js). Thema 'map_rummel' (Abendhimmel lila → orange,
// ferne violette Hügel mit Lichtern, Mond) meldet sich in THEMES an; Nachbarwelt-Stil 'vulkan' (Welt 7 am Horizont).
//
// Alle statischen Geometrien in Weltkoordinaten bzw. mit Fußpunkt im Ursprung (Vorderseite +Z, zur Kamera) und Vertexfarben
// (position/normal/color) für view.addStatic (Karten-Kacheln, MapBatcher). Flache Deckschichten tragen userData.noShadow,
// leuchtende userData.material 'glow', glänzendes Wasser 'stone'.

import * as THREE from 'three';
import { mix, TAU, cached, vcol } from '../models/lib/kit.js';
import { roundedBox, SIDE, colorize, lin, mixc, smooth, Rnd } from '../../three/world/geometry.js';
import { alignedGrid } from '../blocks/kit.js';
import { THEMES } from '../view/themes.js';
import { music } from '../../audio/index.js';
import { canvasTexture } from '../../three/lib/itemMaterials.js';
import { LowBuild as Build, place } from './desert.js';
import { buildBridge } from '../blocks/types/bridge.js';
import { baronFlagTexture } from './props.js';
import { getModel, hasModel } from '../models/index.js';
import { courseSave } from '../level/CourseSave.js';
import { modelTris } from './beach5.js';
import { lavaGround, lavaEdgeGeo, lavaPropGeo, lavaPropGlow, lavaPropShape, LAVA_STYLES, LavaLife, basaltGroupGeo } from './lava7.js';
import { recolor } from '../models/lib/w8Geos.js';
import { balloonGeo } from '../models/kinds/props_rummel_w8.js';

/** Benutzte Registry-Modelle der Welt-8-Karte (state().decor.w8models) und vorhandene, aber zu schwere (w8heavy: Name → Dreiecke). */
export const W8_USED = new Set();
export const W8_HEAVY = new Map();

/** Spielende erreicht (Schnittstelle des Motors: courseSave.data.finished === true, nach dem Abspann). */
export const gameFinished = () => courseSave?.data?.finished === true;

// ------------------------------------------------------------------ Thema des Rummelplatzes

if (!THEMES.map_rummel) {
  THEMES.map_rummel = {
    ...THEMES.grass,
    label: 'Weltkarte Brummbär-Rummelplatz',
    sky: [[1, 0x2a2468], [0.55, 0x45388c], [0.28, 0x8a4e9e], [0.12, 0xe07c8a], [0.04, 0xffa07a], [0, 0xffbc88], [-0.1, 0xc87a7a], [-1, 0x4a2a4c]],
    background: 0xe8a094,
    fog: { color: 0xdc9ca8, near: 120, far: 470 },
    hemi: { sky: 0xffe2ee, ground: 0x6a4a74, intensity: 1.36 },
    sun: { color: 0xffd2aa, intensity: 2.6, dir: [-0.5, 1, 0.42] },
    ground: null,
    clouds: false,
    sunDisc: true,
    backdrop: 'rummel8',
    grassTop: 0x6aa878, grassTop2: 0x5e9c6e, grassRim: 0x9acc96, grassSide: 0x4a3e5a,
    dirt: 0x6a4e62, dirtDeep: 0x3e2c40, rock: 0x5a4a66, rockDeep: 0x3a2c44,
    stone: 0xd2c0d0, stoneDark: 0x6a5a72,
    wood: 0x8a5a3a, woodDark: 0x4a2c1c,
    water: 0x4a8ad8, waterDeep: 0x2a3e9a,
    lava: 0xff6a1a,
    buildBackdrop(sky, bounds, rnd) { rummelBackdrop(sky, bounds, rnd); },
  };
}

// ------------------------------------------------------------------ Hilfen

const hash2 = (x, z) => { const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return h - Math.floor(h); };
const tone = (a, c, k, out = [0, 0, 0]) => mixc(lin(a), lin(c), k, out);
const MAT_TILE = { glow: 'w8:leuchten', stone: 'w8:wasser' };
function flat(g, material) { if (g) { g.userData.noShadow = true; if (material) { g.userData.material = material; g.userData.tile = MAT_TILE[material]; } } return g; }
const inRect = (r, x, z) => x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3];
function blockAt(map, x, z, skip = null) {
  let best = null;
  for (const o of map?.ground ?? []) if (o !== skip && inRect(o.rect, x, z) && (!best || o.top > best.top)) best = o;
  return best;
}
const checker2 = (ax, az) => (Math.floor((ax + 1.01) / 2) + Math.floor((az + 1.01) / 2)) & 1;
const tooHeavy = (name, opts, max) => { const n = modelTris(name, opts); if (n > max) { W8_HEAVY.set(name, Number.isFinite(n) ? Math.round(n) : -1); return true; } return false; };

// ------------------------------------------------------------------ Farben

const PLUM = [0x4a3a5c, 0x5a4870, 0x3e3050, 0x665478];
const SANDB = [0xc8925a, 0xd8a468, 0xb88050, 0xe0b478];
const COOKIEB = [0xb8783e, 0xc88a4a, 0xa86c36, 0xd89a58];
const NAVY = [0x2a3050, 0x343c60, 0x262a46, 0x3e4670];
const SLATEB = [0x4a5470, 0x56607c, 0x404a64, 0x606a86];
const SPOOKB = [0x3a2e48, 0x46385a, 0x322840, 0x52446a];
const INLAY = [0xe8505a, 0xf0b840, 0x4ac8c0, 0xb070e0];

const PALETTES = {
  // Rummel-Pflaster: warme Flieder-Pflastersteine, selten bunte Einlegesteine (gut lesbar auf dunklem Grund)
  plaza: {
    bands: PLUM, side: 0x6a5878, rim: 0xd2bcd0, cell: 1, cellOff: 4,
    tile: (rnd) => (i, j, ax, az) => {
      const o = tone(0xb2a0b6, 0xc2b0c4, rnd.frac() * 0.7);
      const h = hash2(ax + 3, az - 7);
      if (h > 0.985) mixc(o, lin(INLAY[Math.floor(h * 10000) % 4]), 0.26, o);
      else if (h < 0.08) mixc(o, lin(0x8a7a92), 0.35, o);
      return o;
    },
  },
  parkgrass: {
    bands: PLUM, side: 0x4e5a5a, rim: 0x86b896, cell: 2, cellOff: 2, capH: 0.3,
    tile: (rnd) => (i, j, ax, az) => {
      const o = tone(0x4a9478, 0x428a70, rnd.frac());
      const h = hash2(ax * 0.7 + 1, az * 0.7 - 2);
      if (h > 0.975) mixc(o, lin(h > 0.99 ? 0xffd2e8 : 0xf0e8a0), 0.22, o);   // Blütentupfer
      return o;
    },
  },
  rainrock: {
    bands: SLATEB, side: 0x56607c, rim: 0x9aa8c4, cellOff: 3, jitter: 0.18, layer: 1.1,
    tile: (rnd) => () => tone(0x6a7896, 0x5e6c8a, rnd.frac() * 0.8),
  },
  sand: {
    bands: SANDB, side: 0xc8925a, rim: 0xf0c890, cell: 1, cellOff: 2,
    tile: (rnd) => (i, j, ax, az) => {
      const o = tone(0xd8a066, 0xd09860, rnd.frac());
      if (Math.sin(ax * 1.3 + az * 0.5) > 0.8) mixc(o, lin(0xe2b072), 0.3, o);   // Wind-Rippel
      return o;
    },
  },
  cookie: {
    bands: COOKIEB, side: 0xb8783e, rim: 0xf2c88a, cell: 2,
    tile: (rnd) => (i, j, ax, az) => {
      const o = tone(checker2(ax, az) ? 0xc88c50 : 0xc2864c, 0xcc9456, rnd.frac() * 0.5);
      const h = hash2(Math.floor(ax / 2) - 5, Math.floor(az / 2) + 2);
      if (h > 0.92) mixc(o, lin(0xffb8d8), 0.4, o);        // rosa Zuckerguss
      else if (h < 0.07) mixc(o, lin(0x7a4428), 0.45, o);  // Schokostück
      return o;
    },
  },
  station: {
    bands: PLUM, side: 0x6a5a6e, rim: 0xc8bcb4, cell: 2,
    tile: (rnd) => (i, j, ax, az) => tone(checker2(ax, az) ? 0xc8bcb0 : 0xbeb2a8, 0xd2c6ba, rnd.frac() * 0.3),
  },
  rails: {
    bands: PLUM, side: 0x4a4250, rim: 0x8a8090, cell: 2, cellOff: 2,
    tile: (rnd) => () => tone(0x6e6872, 0x625c68, rnd.frac()),
  },
  nightstone: {
    bands: NAVY, side: 0x3a4266, rim: 0x8a9ac8, cell: 2, cracks: 0.6,
    tile: (rnd) => (i, j, ax, az) => tone(checker2(ax, az) ? 0x56608a : 0x4e5882, 0x5e6894, rnd.frac() * 0.3),
  },
  shore: {
    bands: SLATEB, side: 0x56607c, rim: 0xc8c4c0, cell: 1, cellOff: 2,
    tile: (rnd) => (i, j, ax, az) => {
      const o = tone(0xb8b0aa, 0xaaa4a2, rnd.frac());
      if (hash2(ax * 0.9 + 4, az * 0.9) > 0.9) mixc(o, lin(0xe8ecf4), 0.5, o);
      return o;
    },
  },
  spook: {
    bands: SPOOKB, side: 0x4a3c5c, rim: 0xa898bc, cell: 2,
    tile: (rnd) => (i, j, ax, az) => {
      const o = tone(checker2(ax, az) ? 0x7a6a8e : 0x725f86, 0x84749a, rnd.frac() * 0.3);
      if (hash2(Math.floor(ax / 2) + 1, Math.floor(az / 2) + 9) > 0.86) mixc(o, lin(0x5a8a5a), 0.45, o);   // Moos
      return o;
    },
  },
  house: {
    bands: PLUM, side: 0x6a4a3a, rim: 0xb88a62, cell: 1,
    tile: (rnd) => (i, j, ax, az) => tone(((Math.floor(ax) % 2) + 2) % 2 ? 0x9a6a46 : 0x8e603e, 0xa4744c, rnd.frac() * 0.4),
  },
  circus: {
    bands: PLUM, side: 0x8a3a4a, rim: 0xf0d0a0, cell: 2,
    tile: (rnd) => () => tone(0xeccc94, 0xe2c088, rnd.frac()),
  },
  tower: {
    bands: PLUM, side: 0x5a3a4e, rim: 0xd8b070, cell: 2,
    tile: (rnd) => (i, j, ax, az) => {
      const o = tone(checker2(ax, az) ? 0xa88a9e : 0x9e8094, 0xb092a6, rnd.frac() * 0.4);
      if (((Math.floor(ax / 2) + Math.floor(az / 2)) % 4 + 4) % 4 === 0 && checker2(ax, az)) mixc(o, lin(0xb84a5a), 0.45, o);   // rote Baron-Fliese
      return o;
    },
  },
  // Sternen-Röhre: dunkelblaue Platten mit goldenen Sternen-Tupfen
  starplaza: {
    bands: NAVY, side: 0x3a4266, rim: 0xb8a8e8, cell: 1,
    tile: (rnd) => (i, j, ax, az) => {
      // dunkelblaue Platten, goldene Tupfen in einem ruhigen schrägen Raster (Sternenhimmel unter den Füßen)
      const o = tone(checker2(ax, az) ? 0x4a4a86 : 0x45457f, 0x4e4e8a, rnd.frac() * 0.5);
      const fx = Math.floor(ax), fz = Math.floor(az);
      if ((((fx * 2 + fz * 3) % 7) + 7) % 7 === 0) mixc(o, lin(0xffd86a), 0.5, o);
      return o;
    },
  },
  towerbase: {
    bands: PLUM, side: 0x4a3a5a, rim: 0x8a7a9a, cellOff: 3, jitter: 0.16, layer: 1.2,
    tile: (rnd) => () => tone(0x6a5a7a, 0x5e4e70, rnd.frac() * 0.8),
  },
};
export const RUMMEL_STYLES = new Set([...Object.keys(PALETTES), 'lake', 'inferno']);

// ------------------------------------------------------------------ Geländestile

/**
 * Gelände-Block des Rummelplatzes (Box x0..x1 × z0..z1 von base bis top). Liefert Teil-Geometrien (Weltkoordinaten).
 * Lava-Stile ('basin', 'rock', 'cliff' …) und 'inferno' (Basalt mit Glutrissen) baut lava7.js.
 */
export function rummelGround(b, base, theme, rnd, map) {
  const style = b.style ?? 'plaza';
  if (style === 'inferno') return lavaGround({ ...b, style: 'crater' }, base, theme, rnd, map);
  if (style === 'lake') return lakeParts(b, base, rnd, map);
  if (!PALETTES[style] && LAVA_STYLES.has(style)) return lavaGround(b, base, theme, rnd, map);
  const [x0, z0, x1, z1] = b.rect;
  const top = b.top;
  const parts = [];
  const P = PALETTES[style] ?? PALETTES.plaza;
  const capH = P.capH ?? 0.32;
  strata(parts, x0, base, z0, x1, top - capH, z1, P.bands, rnd, P.layer ?? 0.9, P.jitter ?? 0.12);
  const lip = 0.08, r = Math.min(0.16, capH * 0.45);
  const cap = roundedBox(x1 - x0 + lip * 2, capH, z1 - z0 + lip * 2, r, SIDE.ALL & ~SIDE.NY, SIDE.NY, 1);
  const side = lin(P.side), rim = lin(P.rim);
  colorize(cap, (p, n, o) => mixc(side, rim, smooth(0.15, 0.85, n.y), o));
  cap.translate((x0 + x1) / 2, top - capH / 2, (z0 + z1) / 2);
  parts.push(cap);
  const ins = r + lip * 0.5;
  const gx0 = x0 - lip + ins, gx1 = x1 + lip - ins, gz0 = z0 - lip + ins, gz1 = z1 + lip - ins;
  if (gx1 > gx0 && gz1 > gz0) parts.push(flat(alignedGrid(gx0, gz0, gx1, gz1, top + 0.004, b.walk ? (P.cell ?? 2) : (P.cellOff ?? 4), P.tile(rnd, b))));
  if (P.cracks && b.walk) { const c = seamGeo(x0, z0, x1, z1, top + 0.012, rnd, P.cracks); if (c) parts.push(flat(c, 'glow')); }
  if (style === 'rainrock') { const p = puddleGeo(x0, z0, x1, z1, top + 0.01, rnd); if (p) parts.push(flat(p, 'stone')); }
  if (style === 'rails') parts.push(railsGeo(x0, z0, x1, z1, top));
  if (style === 'station' && b.walk) parts.push(flat(platformLine(x0, z0, x1, z1, top + 0.01, b.lineAt ?? 'N')));
  if (style === 'circus' && b.walk) parts.push(flat(circusRing(x0, z0, x1, z1, top + 0.01)));
  if (style === 'tower' && b.walk) parts.push(flat(towerBorder(x0, z0, x1, z1, top + 0.01)));
  return parts;
}

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

/** Blau glimmende Fugen (Nacht-Festung 8-4): gerade Streifen im 2-m-Raster, nur einige leuchten. */
function seamGeo(x0, z0, x1, z1, y, rnd, k = 0.6) {
  const b = new Build();
  for (let x = Math.ceil(x0 / 2) * 2; x < x1 - 0.5; x += 2) {
    for (let z = Math.ceil(z0 / 2) * 2; z < z1 - 0.5; z += 2) {
      if (rnd.frac() > k * 0.35) continue;
      const horiz = rnd.frac() < 0.5;
      b.box(horiz ? 2 : 0.09, 0.02, horiz ? 0.09 : 2, rnd.frac() < 0.5 ? 0x5ac8ff : 0x9ae8ff, { p: [x + (horiz ? 1 : 0), y, z + (horiz ? 0 : 1)] }, 0);
    }
  }
  return b.parts.length ? b.geometry() : null;
}
/** Glänzende Pfützen auf nassem Fels (Material 'stone'). */
function puddleGeo(x0, z0, x1, z1, y, rnd) {
  const b = new Build();
  const n = Math.max(1, Math.round(((x1 - x0) * (z1 - z0)) / 40));
  for (let i = 0; i < n; i++) {
    const x = rnd.real(x0 + 1.4, x1 - 1.4), z = rnd.real(z0 + 1.4, z1 - 1.4), r = rnd.real(0.6, 1.3);
    b.add(new THREE.CircleGeometry(r, 10).rotateX(-Math.PI / 2), { v: (px, py, pz) => mix(0x8ab0e8, 0x4a6aa8, Math.min(1, Math.hypot(px, pz) / r)) }, { p: [x, y, z], s: [1, 1, rnd.real(0.6, 1)] });
  }
  return b.geometry();
}
/** Gleisbett: Schwellen und zwei Schienenpaare entlang X. */
function railsGeo(x0, z0, x1, z1, top) {
  const b = new Build();
  const cz = (z0 + z1) / 2;
  for (let x = x0 + 0.4; x < x1; x += 0.9) b.box(0.32, 0.12, 2.6, 0x6a4a32, { p: [x, top + 0.06, cz] }, 0);
  for (const s of [-0.72, 0.72]) b.box(x1 - x0, 0.12, 0.12, { v: (px, py, pz, nx, ny) => (ny > 0.5 ? 0xd8d8e4 : 0x5a5a66) }, { p: [(x0 + x1) / 2, top + 0.18, cz + s] }, 0);
  return b.geometry();
}
/** Bahnsteig: gelbe Sicherheitslinie an der Kante (Standard Nordkante). */
function platformLine(x0, z0, x1, z1, y, at) {
  const b = new Build();
  const zz = at === 'S' ? z1 - 0.7 : z0 + 0.7;
  b.box(x1 - x0 - 0.6, 0.02, 0.3, 0xffd23a, { p: [(x0 + x1) / 2, y, zz] }, 0);
  for (let x = x0 + 0.8; x < x1 - 0.5; x += 1.2) b.box(0.5, 0.025, 0.14, 0xf4f4f8, { p: [x, y + 0.004, zz + (at === 'S' ? -0.36 : 0.36)] }, 0);
  return b.geometry();
}
/** Manege: rot-weißer Ring um die Fläche. */
function circusRing(x0, z0, x1, z1, y) {
  const b = new Build();
  const kerb = (ax, az, bx, bz) => {
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 0.9));
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; b.box(Math.abs(bx - ax) > 0.1 ? len / n : 0.5, 0.03, Math.abs(bz - az) > 0.1 ? len / n : 0.5, i % 2 ? 0xffffff : 0xd8303e, { p: [ax + (bx - ax) * t, y, az + (bz - az) * t] }, 0); }
  };
  kerb(x0 + 0.5, z1 - 0.5, x1 - 0.5, z1 - 0.5); kerb(x0 + 0.5, z0 + 0.5, x1 - 0.5, z0 + 0.5); kerb(x0 + 0.5, z0 + 0.5, x0 + 0.5, z1 - 0.5); kerb(x1 - 0.5, z0 + 0.5, x1 - 0.5, z1 - 0.5);
  return b.geometry();
}
/** Turmplatz: goldene Zierkante mit roten Rauten. */
function towerBorder(x0, z0, x1, z1, y) {
  const b = new Build();
  const strip = (ax, az, bx, bz) => {
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 1.4));
    b.box(Math.abs(bx - ax) > 0.1 ? len : 0.4, 0.02, Math.abs(bz - az) > 0.1 ? len : 0.4, 0xe8c060, { p: [(ax + bx) / 2, y, (az + bz) / 2] }, 0);
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; b.box(0.26, 0.03, 0.26, 0xc8303e, { p: [ax + (bx - ax) * t, y + 0.005, az + (bz - az) * t], r: [0, Math.PI / 4, 0] }, 0); }
  };
  strip(x0 + 0.7, z1 - 0.7, x1 - 0.7, z1 - 0.7); strip(x0 + 0.7, z0 + 0.7, x0 + 0.7, z1 - 0.7); strip(x1 - 0.7, z0 + 0.7, x1 - 0.7, z1 - 0.7);
  return b.geometry();
}
/** See (8-5): Grund, Felsrand an freien Seiten, Wasser (Material 'stone') bei top + 0,55. */
function lakeParts(b, base, rnd, map) {
  const [x0, z0, x1, z1] = b.rect;
  const top = b.top;
  const parts = [];
  const floor = colorize(new THREE.BoxGeometry(x1 - x0, top - base, z1 - z0), (p, n, o) => mixc(lin(0x3a3e58), lin(0x6a7a8a), n.y > 0.5 ? 1 : 0.2, o));
  floor.translate((x0 + x1) / 2, (base + top) / 2, (z0 + z1) / 2);
  parts.push(floor);
  const lo = lin(0x3a3a54), hi = lin(0x6a6a88);
  const free = (x, z) => !blockAt(map, x, z, b);
  for (const [ax, az, bx, bz, nx, nz] of [[x0, z0, x1, z0, 0, -1], [x0, z1, x1, z1, 0, 1], [x0, z0, x0, z1, -1, 0], [x1, z0, x1, z1, 1, 0]]) {
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 1.6));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, px = ax + (bx - ax) * t, pz = az + (bz - az) * t;
      if (!free(px + nx * 0.4, pz + nz * 0.4)) continue;
      const h = top + 1.0 + rnd.real(-0.12, 0.25);
      const g = new THREE.BoxGeometry(nx ? 0.9 : len / n + 0.25, h + 0.6, nz ? 0.9 : len / n + 0.25);
      const k = rnd.frac() * 0.12;
      colorize(g, (p, nn, o) => mixc(lo, hi, smooth(-0.2, 0.9, nn.y) * 0.8 + k, o));
      g.translate(px - nx * 0.25, h / 2 - 0.3, pz - nz * 0.25);
      parts.push(g);
    }
  }
  const shallow = lin(0x4ac8d8), deep = lin(0x1e5ab0), foam = lin(0xd8f4ff);
  const surf = alignedGrid(x0, z0, x1, z1, top + 0.55, 2, (i, j, ax, az) => {
    const cx = ax + 1, cz = az + 1;
    const d = Math.min(cx - x0, x1 - cx, cz - z0, z1 - cz);
    const o = mixc(shallow, deep, smooth(0.5, 9, d), [0, 0, 0]);
    if (d < 1.2) mixc(o, foam, 0.4, o);
    return o;
  });
  parts.push(flat(surf, 'stone'));
  return parts;
}

// ------------------------------------------------------------------ Ränder

/** Mäuerchen mit roten und cremefarbenen Feldern, Goldkugeln auf Pfeilern (entlang +X, Länge len). */
function parkWallGeo(len, seed = 1) {
  const b = new Build();
  b.box(len, 0.55, 0.5, { v: (x, y, z, nx, ny) => (ny > 0.6 ? 0xd8c0d0 : mix(0x5a4870, 0x7a6890, y / 0.55 + 0.4)) }, { p: [0, 0.275, 0] }, 0);
  const n = Math.max(1, Math.round(len / 2));
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i + 0.5) * (len / n);
    b.box(Math.min(1.4, len / n - 0.3), 0.3, 0.52, (i + seed) % 2 ? 0xd8434e : 0xf4e2c8, { p: [x, 0.3, 0] }, 0);
  }
  for (let i = 0; i <= n; i++) {
    const x = -len / 2 + i * (len / n);
    b.box(0.32, 0.8, 0.56, 0x6a5880, { p: [x, 0.4, 0] }, 0);
    b.sphere(0.13, 0xffc83a, { p: [x, 0.9, 0] }, 6, 4);
  }
  return b.geometry();
}
/** Geländer an Abbrüchen: rot-weiß geringelte Pfosten, goldener Handlauf (entlang +X). */
function parkRailGeo(len) {
  const b = new Build();
  const n = Math.max(1, Math.round(len / 2));
  for (let i = 0; i <= n; i++) {
    const x = -len / 2 + i * (len / n);
    b.cyl(0.07, 0.08, 0.95, { v: (px, py) => (Math.floor((py + 0.5) * 6) % 2 ? 0xe8303e : 0xffffff) }, { p: [x, 0.47, 0] }, 6);
    b.sphere(0.1, 0xffc83a, { p: [x, 1.0, 0] }, 6, 4);
  }
  b.box(len, 0.08, 0.08, 0xffc83a, { p: [0, 0.92, 0] }, 0);
  b.box(len, 0.05, 0.05, 0xe8303e, { p: [0, 0.5, 0] }, 0);
  return b.geometry();
}
/** Rand-Optik des Rummelplatzes nach Art, sonst die Lava-Festung-Arten, sonst null. */
export function rummelEdgeGeo(kind, len, seed) {
  if (kind === 'parkwall') return parkWallGeo(len + 0.1, seed);
  if (kind === 'parkrail') return parkRailGeo(len);
  return lavaEdgeGeo(kind, len, seed);
}

// ------------------------------------------------------------------ Requisiten

/** Rundgeschnittener Zierbusch (Topiary) in Petrol/Lila mit Goldtupfen, Fußpunkt im Ursprung. */
export function topiaryGeo(s = 1, toneI = 0) {
  return cached(`w8m:topiary:${s}:${toneI}`, () => {
    const b = new Build();
    const [L, D] = [[0x5ab88a, 0x2a6a5a], [0xa07ad0, 0x5a3a8a], [0x6ac0b0, 0x2a6a72]][toneI % 3];
    b.cyl(0.42 * s, 0.5 * s, 0.5 * s, 0xb8603e, { p: [0, 0.25 * s, 0] }, 8);
    b.sphere(0.75 * s, { v: (px, py, pz, nx, ny) => mix(D, L, ny * 0.5 + 0.5) }, { p: [0, 1.15 * s, 0] }, 10, 7);
    b.sphere(0.45 * s, { v: (px, py, pz, nx, ny) => mix(D, L, ny * 0.5 + 0.5) }, { p: [0, 2.0 * s, 0] }, 8, 6);
    for (let i = 0; i < 5; i++) { const a = i * 1.3; b.sphere(0.07 * s, 0xffd23a, { p: [Math.cos(a) * 0.68 * s, (1.0 + (i % 2) * 0.35) * s, Math.sin(a) * 0.68 * s] }, 4, 3); }
    return b.geometry();
  });
}
/** Laternenmast (Kopf leuchtet: lampGlowGeo). */
function lampPostGeo(h = 3.4) {
  return cached(`w8m:lamp:${h}`, () => {
    const b = new Build();
    b.cyl(0.24, 0.3, 0.3, 0x3a3046, { p: [0, 0.15, 0] }, 8);
    b.cyl(0.07, 0.09, h, { v: (px, py) => mix(0x2e2836, 0x4a4058, py / h + 0.5) }, { p: [0, h / 2, 0] }, 6);
    b.cone(0.34, 0.3, 0x2e2836, { p: [0, h + 0.62, 0] }, 6);
    b.sphere(0.08, 0xffc83a, { p: [0, h + 0.85, 0] }, 5, 3);
    return b.geometry();
  });
}
function lampGlowGeo(h = 3.4) {
  return cached(`w8m:lampglow:${h}`, () => new Build().box(0.32, 0.4, 0.32, 0xffd88a, { p: [0, h + 0.27, 0] }, 0.04).geometry());
}
/** Leuchtender Kristallbüschel (Inferno 8-7): Glut-Kristalle (Glow) auf dunklem Fels-Fuß (Geo). */
function crystalBaseGeo(s = 1) {
  return cached(`w8m:crystalbase:${s}`, () => {
    const b = new Build();
    b.add(new THREE.DodecahedronGeometry(0.7 * s, 0), (qx, qy, qz, nx, ny) => mix(0x2e2438, 0x5a4a6a, ny * 0.5 + 0.5), { p: [0, 0.3 * s, 0], s: [1.3, 0.6, 1] });
    return b.geometry();
  });
}
function crystalGlowGeo(s = 1, colorI = 0) {
  return cached(`w8m:crystal:${s}:${colorI}`, () => {
    const b = new Build();
    const [c1, c2] = [[0x5af0e8, 0xc8fff8], [0xc88aff, 0xf0d8ff], [0xff9a4a, 0xffe08a]][colorI % 3];
    for (const [px, pz, h, rx, rz] of [[0, 0, 1.6, 0, 0], [0.35, 0.15, 1.1, 0.3, -0.4], [-0.32, 0.12, 1.0, -0.3, 0.3], [0.05, -0.35, 0.9, 0.35, 0.2]]) {
      b.add(new THREE.ConeGeometry(0.2 * s, h * s, 5), { v: (x, y) => mix(c1, c2, y / (h * s) + 0.5) }, { p: [px * s, (0.4 + h / 2) * s, pz * s], r: [rx, 0, rz] });
    }
    return b.geometry();
  });
}
/** Einfacher Brummbär-Ballonstand (Ersatz, falls das Modell fehlt): Pfosten mit drei Ballons. */
function balloonStandGeo() {
  return cached('w8m:balloonstand', () => {
    const b = new Build();
    b.cyl(0.3, 0.36, 0.3, 0x5a4870, { p: [0, 0.15, 0] }, 8);
    for (const [x, y, z, c] of [[0, 3.2, 0, 0xe8283a], [0.6, 2.8, 0.2, 0xffc81a], [-0.5, 2.9, -0.2, 0x8a3ae8]]) {
      b.sphere(0.45, c, { p: [x, y, z], s: [0.95, 1, 1] }, 10, 7);
      b.cyl(0.01, 0.01, y - 0.3, 0xf0f0f0, { p: [x / 2, y / 2, z / 2], r: [z * 0.3, 0, -x * 0.3] }, 3);
    }
    return b.geometry();
  });
}
/** Brummbär-Rummel-Tor (über einem Weg, Breite w): zwei geringelte Säulen, Bogen mit Wappen-Scheibe; Glühbirnen extra. */
function archGeo(w = 6) {
  return cached(`w8m:arch:${w}`, () => {
    const b = new Build();
    for (const s of [-1, 1]) {
      b.cyl(0.38, 0.45, 5.2, { v: (px, py) => (Math.floor((py + 2.6) * 1.4) % 2 ? 0xe8303e : 0xf8f0e0) }, { p: [s * (w / 2 + 0.3), 2.6, 0] }, 10);
      b.sphere(0.5, 0xffc83a, { p: [s * (w / 2 + 0.3), 5.25, 0] }, 10, 7);
      b.cyl(0.6, 0.7, 0.4, 0x5a4870, { p: [s * (w / 2 + 0.3), 0.2, 0] }, 10);
    }
    b.torus(w / 2 + 0.3, 0.26, { v: (px, py, pz, nx, ny) => mix(0x8a2a6a, 0xd85aa0, ny * 0.5 + 0.5) }, { p: [0, 5.0, 0] }, 6, 24, Math.PI);
    b.box(w * 0.7, 1.0, 0.3, 0x3a2a52, { p: [0, 5.0 + w / 2 * 0.7, 0] }, 0.1);
    b.cyl(0.85, 0.85, 0.36, 0xffc83a, { p: [0, 5.2 + w / 2 + 0.8, 0], r: [Math.PI / 2, 0, 0] }, 16);
    b.cyl(0.6, 0.6, 0.4, 0x8a5a34, { p: [0, 5.2 + w / 2 + 0.8, 0.02], r: [Math.PI / 2, 0, 0] }, 12);
    for (const s of [-1, 1]) b.sphere(0.24, 0x8a5a34, { p: [s * 0.5, 5.2 + w / 2 + 1.35, 0.05] }, 6, 4);
    b.box(0.9, 0.5, 0.42, 0x1e1a26, { p: [0, 5.2 + w / 2 + 1.7, 0.02] }, 0.03);
    return b.geometry();
  });
}
/** Glühbirnen am Torbogen (Glow). */
function archGlowGeo(w = 6) {
  return cached(`w8m:archglow:${w}`, () => {
    const b = new Build();
    const n = 13;
    for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI; b.sphere(0.12, i % 2 ? 0xfff0b0 : 0xffb0d0, { p: [Math.cos(a) * (w / 2 + 0.3), 5.0 + Math.sin(a) * (w / 2 + 0.3), 0.3] }, 5, 3); }
    b.box(w * 0.6, 0.5, 0.06, 0xffd86a, { p: [0, 5.0 + w / 2 * 0.7, 0.17] }, 0);
    return b.geometry();
  });
}

/** Requisite des Rummelplatzes (map.props: kind …8), sonst Requisiten der Lava-Festung (…7), sonst null. Fußpunkt im Ursprung. */
export function rummelPropGeo(it, seed) {
  const s = it.size;
  switch (it.kind) {
    case 'bush8': return topiaryGeo(s ?? 1, it.tone ?? 0).clone();
    case 'lamp8': return lampPostGeo(it.h ?? 3.4).clone();
    case 'crystal8': return crystalBaseGeo(s ?? 1).clone();
    case 'balloons8': return balloonStandGeo().clone();
    case 'arch8': return archGeo(it.w ?? 6).clone();
    case 'booth8': return boothFallbackGeo(it.color ?? 'rot').clone();
    default: return lavaPropGeo(it, seed);
  }
}
/** Leuchtende Teile einer Requisite (Material 'glow'), sonst null. */
export function rummelPropGlow(it) {
  switch (it.kind) {
    case 'lamp8': return lampGlowGeo(it.h ?? 3.4).clone();
    case 'crystal8': return crystalGlowGeo(it.size ?? 1, it.tone ?? 0).clone();
    case 'arch8': return archGlowGeo(it.w ?? 6).clone();
    default: return lavaPropGlow(it);
  }
}
/** Kollisionsform einer Requisite (Weltkoordinaten), sonst null. */
export function rummelPropShape(it) {
  const [x, y, z] = it.pos, s = it.size ?? 1;
  switch (it.kind) {
    case 'bush8': return { type: 'cyl', x, z, r: 0.75 * s, y0: y, y1: y + 2.3 * s, tag: 'busch' };
    case 'lamp8': return { type: 'cyl', x, z, r: 0.28, y0: y, y1: y + (it.h ?? 3.4) + 0.8, tag: 'laterne' };
    case 'crystal8': return { type: 'cyl', x, z, r: 0.8 * s, y0: y, y1: y + 2 * s, tag: 'kristall' };
    case 'balloons8': return { type: 'cyl', x, z, r: 0.4, y0: y, y1: y + 1.5, tag: 'ballons' };
    case 'booth8': { const yw = it.yaw ?? 0, c = Math.abs(Math.cos(yw)), sn = Math.abs(Math.sin(yw)); const hx = 2.1 * c + 1.3 * sn, hz = 1.3 * c + 2.1 * sn; return { type: 'box', min: [x - hx, y, z - hz], max: [x + hx, y + 3.4, z + hz], tag: 'bude' }; }
    case 'dune8': return null;
    case 'statue8': return { type: 'cyl', x, z, r: 1.4 * s, y0: y, y1: y + 4 * s, tag: 'statue' };
    case 'pilzstatue8': return { type: 'cyl', x, z, r: 1.0 * s, y0: y, y1: y + 2.5 * s, tag: 'statue' };
    case 'cookietower8': return { type: 'cyl', x, z, r: 2.2, y0: y, y1: y + 6.5, tag: 'keksturm' };
    case 'pillar8': return { type: 'cyl', x, z, r: 1.1, y0: y, y1: y + 3.6, tag: 'saeule' };
    case 'wreck8': return { type: 'box', min: [x - 2.2, y, z - 1.6], max: [x + 2.2, y + 1.8, z + 1.6], tag: 'wrack' };
    case 'tent8': return { type: 'cyl', x, z, r: (it.radius ?? 6) * 0.85, y0: y, y1: y + (it.height ?? 7), tag: 'zelt' };
    case 'arch8': return null;   // Säulen setzt rummelPropExtraShapes
    default: return lavaPropShape(it);
  }
}
/** Zusätzliche Kollisionsformen (Torbogen: zwei Säulen). */
export function rummelPropExtraShapes(it) {
  if (it.kind !== 'arch8') return [];
  const [x, y, z] = it.pos, w = it.w ?? 6, yw = it.yaw ?? 0;
  return [-1, 1].map((s) => {
    const ox = Math.cos(yw) * s * (w / 2 + 0.3), oz = -Math.sin(yw) * s * (w / 2 + 0.3);
    return { type: 'cyl', x: x + ox, z: z + oz, r: 0.5, y0: y, y1: y + 5.6, tag: 'torsaeule' };
  });
}
/**
 * Registry-Kulisse für Requisiten des Rummelplatzes (Welt-8-Modelle, models/kinds/props_*_w8.js, und vorhandene):
 * [Name, Optionen, yaw-Korrektur, Maßstab] oder null – mit Dreiecks-Obergrenze; fehlt das Modell oder ist es zu schwer,
 * zeichnet rummelPropGeo eigene Geometrie (bzw. nichts für reine Modell-Requisiten).
 */
export function rummelPropModel(it) {
  const FRONT = -Math.PI / 2;
  const s = it.size;
  const spec = {
    booth8: ['rummel_bude', { color: it.color ?? 'rot', seed: it.seed ?? 1 }, FRONT, 1, 6000],
    dune8: ['duene', { size: s ?? 1, seed: it.seed ?? 1 }, FRONT, 1, 3500],
    statue8: ['baron_sandstatue', {}, FRONT, s ?? 1, 12500],
    pilzstatue8: ['sandskulptur_pilzling', {}, FRONT, s ?? 1, 6000],
    cookietower8: ['keksfabrik', { kind: 'keksturm' }, FRONT, s ?? 1, 5200],
    icing8: ['keksfabrik', { kind: 'zuckerguss' }, FRONT, s ?? 1, 2600],
    algae8: ['wasserfestung', { kind: 'algen', height: it.h ?? 3, seed: it.seed ?? 1 }, FRONT, s ?? 1, 3400],
    pillar8: ['wasserfestung', { kind: 'saeule', seed: it.seed ?? 1 }, FRONT, s ?? 1, 1400],
    grate8: ['wasserfestung', { kind: 'gitter' }, FRONT, s ?? 1, 3200],
    wreck8: ['autowrack', {}, FRONT, s ?? 1, 9000],
    track8: ['achterbahn', { kind: 'gerade', length: it.length ?? 16, height: it.h ?? 5 }, 0, 1, 3000],
    curve8: ['achterbahn', { kind: 'kurve', radius: it.radius ?? 6, height: it.h ?? 4 }, 0, 1, 3000],
    looping8: ['achterbahn', { kind: 'looping', radius: it.radius ?? 5, height: it.h ?? 1.5 }, 0, 1, 6500],
    tent8: ['zirkuszelt', { radius: it.radius ?? 6, height: it.height ?? 7 }, FRONT, 1, 4200],
    balloons8: ['brummbaer_ballon', { color: it.color ?? 'rot', count: it.n ?? 3 }, FRONT, s ?? 1, 6000],
    rainwall8: ['regenfestung', { kind: 'mauer', length: it.length ?? 8, height: it.h ?? 4 }, 0, 1, 2400],
    raintower8: ['regenfestung', { kind: 'turm', height: it.h ?? 9 }, FRONT, 1, 1800],
    puddle8: ['regenfestung', { kind: 'pfuetze', size: s ?? 2 }, 0, 1, 1400],
  }[it.kind];
  if (!spec) return null;
  const [name, opts, yawFix, scale, max] = spec;
  if (!hasModel(name) || tooHeavy(name, opts, max)) return null;
  W8_USED.add(name);
  return [name, opts, yawFix, scale];
}
/** Ersatz-Bude (fehlt 'rummel_bude'): Holzstand mit gestreiftem Dach (Vorderseite +Z). */
function boothFallbackGeo(color = 'rot') {
  return cached(`w8m:booth:${color}`, () => {
    const b = new Build();
    const c1 = { rot: 0xe8303e, gruen: 0x3ab85a, blau: 0x3a7ae8, gelb: 0xffc83a }[color] ?? 0xe8303e;
    b.box(4, 2.6, 2.4, 0x8a5a3a, { p: [0, 1.3, -0.2] }, 0.04);
    b.box(4.1, 1.1, 0.5, 0xf4ecd8, { p: [0, 0.55, 1.0] }, 0.03);
    for (let i = 0; i < 8; i++) b.box(0.52, 0.12, 3.2, i % 2 ? c1 : 0xffffff, { p: [-1.82 + i * 0.52, 3.0, 0.2], r: [-0.25, 0, 0] }, 0);
    return b.geometry();
  });
}

/**
 * Streudeko auf nicht begehbaren Blöcken (deterministisch): Zierbüsche auf dem Parkrasen, Kristalle auf Inferno-Fels,
 * Grasbüschel auf Sand; Wasser, Lava, Gleise und noDeco bleiben frei.
 */
export function scatterRummel(level, map, grid) {
  const parts = [], glow = [];
  map.ground.forEach((b, i) => {
    const style = b.style ?? 'plaza';
    if (b.walk || b.noDeco || !['parkgrass', 'rock', 'cliff', 'towerbase', 'rainrock', 'sand'].includes(style)) return;
    const [x0, z0, x1, z1] = b.rect;
    const w = x1 - x0, d = z1 - z0;
    if (w < 2.5 || d < 2.5) return;
    const rnd = new Rnd(0x8a7a + i * 131);
    const pts = [...(b.keep ?? [])].map(([x, z, r]) => [x, z, r]);
    const tooClose = (x, z, r) => pts.some((p) => Math.hypot(p[0] - x, p[1] - z) < Math.max(r, p[2] ?? 0));
    const area = w * d, y = b.top;
    const put = (n, minD, make) => {
      for (let k = 0, tries = 0; k < n && tries < n * 12; tries++) {
        const x = rnd.real(x0 + 1.1, x1 - 1.1), z = rnd.real(z0 + 1.1, z1 - 1.1);
        if (tooClose(x, z, minD) || grid.isWalk(x, z)) continue;
        pts.push([x, z]);
        make(x, z, rnd);
        k++;
      }
    };
    if (style === 'parkgrass') {
      put(Math.floor(area / (b.sparse ? 160 : 70)), 2.6, (x, z, r) => parts.push(place(topiaryGeo(+r.real(0.8, 1.2).toFixed(1), r.int(0, 2)).clone(), x, y, z, r.real(0, 6))));
      return;
    }
    if (style === 'sand') {
      put(Math.floor(area / 60), 1.8, (x, z, r) => parts.push(place(lavaPropGeo({ kind: 'vrock7', size: +r.real(0.4, 0.7).toFixed(1), seed: r.int(1, 5) }, 3), x, y, z, r.real(0, 6))));
      return;
    }
    put(Math.max(1, Math.floor(area / 60)), 2.6, (x, z, r) => {
      parts.push(place(crystalBaseGeo(+r.real(0.7, 1.1).toFixed(1)).clone(), x, y, z, r.real(0, 6)));
      glow.push(place(crystalGlowGeo(+r.real(0.7, 1.1).toFixed(1), r.int(0, 2)).clone(), x, y, z, r.real(0, 6)));
    });
    put(Math.floor(area / 90), 2.4, (x, z, r) => parts.push(place(basaltGroupGeo(+r.real(1.2, 2.2).toFixed(1), r.int(1, 6)).clone(), x, y, z, r.real(0, 6))));
  });
  for (const g of parts) level.view?.addStatic(g, { castShadow: true });
  for (const g of glow) level.view?.addStatic(g, { material: 'glow', castShadow: false, tile: 'w8:leuchten' });
}

// ------------------------------------------------------------------ Brücken (Weltdaten segments)

function placeAlong(g, a, c) {
  const dx = c[0] - a[0], dz = c[2] - a[2], L = Math.hypot(dx, dz);
  g.rotateY(Math.atan2(-dz / L, dx / L));
  g.translate(a[0], a[1], a[2]);
  return g;
}
function spanOf(spec) {
  const a = spec.from, c = spec.to;
  const L = Math.hypot(c[0] - a[0], c[2] - a[2]), dy = c[1] - a[1];
  return { a, c, L, dy, pitch: Math.atan2(dy, L), Ld: Math.hypot(L, dy), w: spec.width ?? 4 };
}
const at = (u, pitch) => [u * Math.cos(pitch), u * Math.sin(pitch)];

/** Rummelsteg: Holzbohlen mit Goldkante, rot-weiß geringelte Geländerpfosten, Handlauf, Laternen an den Enden. */
function buildRummelBridge(level, spec) {
  buildBridge({ world: level.world, view: null }, { ...spec, rails: false });
  if (!level.view) return;
  const { a, c, L, dy, pitch, Ld, w } = spanOf(spec);
  const b = new Build();
  const np = Math.max(2, Math.round(Ld / 0.55));
  for (let i = 0; i < np; i++) {
    const u = ((i + 0.5) / np) * Ld, [px, py] = at(u, pitch);
    b.box(Ld / np - 0.05, 0.2, w, i % 2 ? 0x9a6a42 : 0xaa7a4a, { p: [px, py - 0.1, 0], r: [0, 0, pitch] }, 0);
  }
  for (const s of [-1, 1]) b.box(Ld + 0.1, 0.12, 0.16, 0xffc23a, { p: [L / 2, dy / 2 - 0.02, s * (w / 2 - 0.08)], r: [0, 0, pitch] }, 0);
  const nP = Math.max(2, Math.round(Ld / 2.2) + 1);
  for (const s of [-1, 1]) {
    for (let i = 0; i < nP; i++) {
      const u = (i / (nP - 1)) * Ld, [px, py] = at(u, pitch);
      b.cyl(0.07, 0.08, 1.0, { v: (qx, qy) => (Math.floor((qy + 0.5) * 6) % 2 ? 0xe8303e : 0xffffff) }, { p: [px, py + 0.5, s * (w / 2 + 0.02)] }, 6);
      b.sphere(0.1, 0xffc83a, { p: [px, py + 1.04, s * (w / 2 + 0.02)] }, 5, 3);
    }
    b.box(Ld + 0.1, 0.07, 0.07, 0xffc83a, { p: [L / 2, dy / 2 + 0.95, s * (w / 2 + 0.02)], r: [0, 0, pitch] }, 0);
  }
  // Stützen unten
  const nS = Math.max(1, Math.round(Ld / 6));
  for (let i = 1; i <= nS; i++) {
    const u = (i / (nS + 1)) * Ld, [px, py] = at(u, pitch);
    b.box(0.5, py + a[1] + 0.4, 0.5, 0x5a4870, { p: [px, (py - a[1] - 0.4) / 2 - 0.2, -w / 2 + 0.4] }, 0);
    b.box(0.5, py + a[1] + 0.4, 0.5, 0x5a4870, { p: [px, (py - a[1] - 0.4) / 2 - 0.2, w / 2 - 0.4] }, 0);
  }
  level.view.addStatic(placeAlong(b.geometry(), a, c), { castShadow: true });
  const lp = new Build(), lg = new Build();
  for (const u of [0.3, Ld - 0.3]) for (const s of [-1, 1]) {
    const [px, py] = at(u, pitch);
    lp.cyl(0.06, 0.08, 1.6, 0x2e2836, { p: [px, py + 0.8 + 0.4, s * (w / 2 + 0.25)] }, 5);
    lp.cone(0.24, 0.22, 0x2e2836, { p: [px, py + 2.32, s * (w / 2 + 0.25)] }, 6);
    lg.box(0.24, 0.28, 0.24, 0xffd88a, { p: [px, py + 2.06, s * (w / 2 + 0.25)] }, 0);
  }
  level.view.addStatic(placeAlong(lp.geometry(), a, c), { castShadow: true });
  level.view.addStatic(placeAlong(lg.geometry(), a, c), { material: 'glow', castShadow: false, tile: 'w8:leuchten' });
}

/** Welt-8-Brücke bauen (segments); false = unbekannte Art. */
export function buildRummelSegment(level, seg) {
  switch (seg.type) {
    case 'rummelbridge': buildRummelBridge(level, seg); return true;
    default: return false;
  }
}

// ------------------------------------------------------------------ Inselchen, Nachbarwelt, Hintergrund

/** Kleine Insel im Abendmeer: dunkler Fels mit Zierbusch, Laterne oder einem bunten Mini-Zelt. */
export function rummelIsletParts(x, z, w, d, top, rnd) {
  const parts = [];
  const g = roundedBox(w, top + 2, d, 0.5, SIDE.ALL, SIDE.NY, 1);
  colorize(g, (p, n, o) => mixc(lin(0x3a2e4a), lin(0x7a6a8a), smooth(-0.3, 0.9, n.y), o));
  g.translate(x, (top - 2) / 2, z);
  parts.push(g);
  const k = rnd.frac();
  if (k < 0.5) parts.push(place(topiaryGeo(1, rnd.int(0, 2)).clone(), x, top, z, rnd.real(0, 6)));
  else {
    const b = new Build();
    const c = [0xe8303e, 0x3a7ae8, 0xffc83a][rnd.int(0, 2)];
    b.cyl(0.05, Math.min(w, d) * 0.3, 2.2, { v: (px, py, pz) => (Math.floor(((Math.atan2(pz - z, px - x) / TAU) + 1) * 8) % 2 ? c : 0xffffff) }, { p: [x, top + 1.1, z] }, 8);
    b.cyl(0.03, 0.03, 0.8, 0xffc83a, { p: [x, top + 2.5, z] }, 3);
    parts.push(b.geometry());
  }
  return parts;
}

/** Ferne Nachbarwelt 'vulkan' (Welt 7: Lava-Insel mit rauchendem Vulkan und Burg), ein Mesh. */
export function rummelNeighborParts(nb, rnd) {
  if (nb.style !== 'vulkan') return [];
  const [x, z] = nb.pos;
  const [w, d] = nb.size ?? [90, 60];
  const B = new Build();
  B.box(w, 6, d, { v: (px, py, pz, nx, ny) => mix(0x3a2830, 0x6a4a4a, ny * 0.5 + 0.5) }, { p: [x, 0, z] }, 0);
  B.cone(Math.min(w, d) * 0.42, 38, { v: (px, py) => mix(0x3a2830, 0x8a5a54, py / 38 + 0.5) }, { p: [x - w * 0.1, 20, z - d * 0.1] }, 14);
  B.cyl(4, 4, 0.5, 0xff8a2a, { p: [x - w * 0.1, 38.6, z - d * 0.1] }, 10);
  for (let k = 0; k < 4; k++) B.sphere(5 + k * 1.6, { v: (px, py, pz, nx, ny) => mix(0x7a6a7e, 0xd0c0c4, ny * 0.5 + 0.5) }, { p: [x - w * 0.1 + k * 3, 44 + k * 7, z - d * 0.1 + k] }, 8, 6);
  B.box(10, 8, 7, 0x4a3e46, { p: [x + w * 0.25, 7, z + d * 0.1] }, 0);
  B.cone(5, 6, 0xc4304e, { p: [x + w * 0.25, 14, z + d * 0.1] }, 4);
  void rnd;
  return [B.geometry()];
}

/**
 * Hintergrund des Themas map_rummel (unbeleuchtet, ein Mesh): ferne violette Hügelketten mit kleinen leuchtenden
 * Fenstern und Türmchen, ein blasser Abendmond im Nordwesten.
 */
export function rummelBackdrop(sky, bounds, rnd) {
  const parts = [];
  const x0 = bounds.min.x, x1 = bounds.max.x, z0 = bounds.min.z, z1 = bounds.max.z;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const Rr = Math.max(x1 - x0, z1 - z0) / 2 + 160;
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * TAU + rnd.real(-0.06, 0.06);
    const r = Rr + rnd.real(-20, 40);
    const bx = cx + Math.cos(a) * r, bz = cz + Math.sin(a) * r;
    const h = rnd.real(22, 46), rad = rnd.real(26, 44);
    const g = new THREE.ConeGeometry(rad, h, 9, 1);
    g.translate(bx, h / 2 - 6, bz);
    parts.push(colorize(g, (p, n, o) => mixc(lin(0x4a3a6a), lin(0x8a6a9a), smooth(-6, h, p.y) * 0.8, o)));
    if (i % 3 === 0) {
      // Türmchen mit Spitze und Lichtpunkt
      const t = new THREE.CylinderGeometry(2.2, 2.6, 14, 6);
      t.translate(bx + rnd.real(-6, 6), h - 6 + 4, bz);
      parts.push(colorize(t, (p, n, o) => mixc(lin(0x3a2a52), lin(0x5a4a72), 0.5, o)));
      const c = new THREE.ConeGeometry(3, 6, 6);
      c.translate(t.boundingBox ? 0 : 0, 0, 0);
      c.translate(bx, h - 6 + 14, bz);
      parts.push(colorize(c, (p, n, o) => mixc(lin(0x8a2a4a), lin(0xc4304e), 0.5, o)));
      const l = new THREE.BoxGeometry(1.6, 2, 1.6);
      l.translate(bx, h - 6 + 8, bz);
      parts.push(colorize(l, (p, n, o) => mixc(lin(0xffd86a), lin(0xffe8a0), 0.5, o)));
    }
  }
  // Mond
  const moon = new THREE.CircleGeometry(14, 24);
  const mx = cx - Rr * 0.55, mz = z0 - Rr * 0.75;
  moon.lookAt(new THREE.Vector3(0, -0.5, 1));
  moon.translate(mx, 120, mz);
  parts.push(colorize(moon, (p, n, o) => mixc(lin(0xfff0d8), lin(0xffe0b8), 0.4, o)));
  for (const p of parts) for (const k of Object.keys(p.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') p.deleteAttribute(k);
  const g = mergeAll(parts);
  if (!g) return;
  const mesh = new THREE.Mesh(sky.track(g), sky.track(new THREE.MeshBasicMaterial({ vertexColors: true, fog: true })));
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  mesh.name = 'w8:hintergrund';
  sky.group.add(mesh);
}
function mergeAll(parts) {
  const list = parts.map((p) => (p.index ? p.toNonIndexed() : p));
  const b = new Build();
  for (const g of list) b.parts.push(g);
  return b.parts.length ? b.geometry() : null;
}

// ------------------------------------------------------------------ Taktuhr

let mapBpm = 0;
/** Tempo der Kartenmusik (Ersatzuhr, falls keine Musik läuft). */
export const MAP_BPM8 = () => mapBpm || (mapBpm = music.themeInfo?.('course_world8_map')?.bpm ?? music.themeInfo?.('course_map')?.bpm ?? 120);
/** Taktuhr: Zählzeit aus music.beat() (Kartenmusik), sonst aus der Bildzeit im Tempo der Kartenmusik. */
export function beatNow8(t) {
  const mb = music.beat();
  const useMusic = mb.bpm > 0 && mb.playing;
  return { beat: useMusic ? mb.beat : (t * MAP_BPM8()) / 60, source: useMusic ? mb.source : 'zeit', theme: mb.theme ?? null, bpm: useMusic ? mb.bpm : MAP_BPM8() };
}
/** Puls je Zählzeit: hell am Taktschlag, klingt danach ab (0,4 … 1). */
export const beatPulse = (frac) => 0.4 + 0.6 * Math.exp(-3.2 * frac);

// ------------------------------------------------------------------ Fahnen-Texturen

/** Bunte Freuden-Fahne nach dem Spielende: Regenbogen-Streifen, großes Herz, Sterne. */
export function heartFlagTexture() {
  return canvasTexture('map:w8:herzfahne', 256, 160, (ctx, w, h) => {
    const cols = ['#ff5a7a', '#ffa03a', '#ffe04a', '#6ad86a', '#4ab8ff', '#a87aff'];
    cols.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, (i * h) / cols.length, w, h / cols.length + 1); });
    const heart = (cx, cy, s, fill) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy + s * 0.9);
      ctx.bezierCurveTo(cx - s * 1.6, cy - s * 0.1, cx - s * 0.7, cy - s * 1.2, cx, cy - s * 0.45);
      ctx.bezierCurveTo(cx + s * 0.7, cy - s * 1.2, cx + s * 1.6, cy - s * 0.1, cx, cy + s * 0.9);
      ctx.fillStyle = fill; ctx.fill();
    };
    heart(w * 0.52, h * 0.55, 46, '#ffffff');
    heart(w * 0.52, h * 0.55, 36, '#ff3a6a');
    const star = (cx, cy, r) => {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * TAU, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
      ctx.closePath(); ctx.fillStyle = '#fff6b0'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#ffb81a'; ctx.stroke();
    };
    star(w * 0.16, h * 0.28, 18); star(w * 0.86, h * 0.3, 16); star(w * 0.2, h * 0.78, 12); star(w * 0.84, h * 0.8, 14);
  });
}
/** Hängendes Turm-Banner (hoch): Brummbär-Wappen auf Dunkelrot bzw. nach dem Spielende Herz und Sterne auf Bunt. */
export function bannerTexture(happy) {
  return canvasTexture(`map:w8:banner:${happy ? 'herz' : 'baron'}`, 128, 256, (ctx, w, h) => {
    if (happy) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#ff7ab0'); g.addColorStop(0.5, '#ffd86a'); g.addColorStop(1, '#6ad0ff');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    } else { ctx.fillStyle = '#7a1630'; ctx.fillRect(0, 0, w, h); }
    ctx.fillStyle = '#ffc21a'; ctx.fillRect(0, 0, w, 12); ctx.fillRect(0, 0, 8, h); ctx.fillRect(w - 8, 0, 8, h);
    // Zackenrand unten
    ctx.fillStyle = '#ffc21a';
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(i * w / 4, h - 26); ctx.lineTo((i + 0.5) * w / 4, h); ctx.lineTo((i + 1) * w / 4, h - 26); ctx.fill(); }
    const cx = w / 2, cy = h * 0.42;
    if (happy) {
      ctx.beginPath(); ctx.moveTo(cx, cy + 40);
      ctx.bezierCurveTo(cx - 70, cy - 4, cx - 30, cy - 54, cx, cy - 20);
      ctx.bezierCurveTo(cx + 30, cy - 54, cx + 70, cy - 4, cx, cy + 40);
      ctx.fillStyle = '#ff3a6a'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      for (const [sx, sy] of [[cx - 34, cy + 70], [cx + 34, cy + 80], [cx, cy + 110]]) {
        ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * TAU, rr = i % 2 ? 6 : 14; ctx.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); }
        ctx.closePath(); ctx.fillStyle = '#ffffff'; ctx.fill();
      }
      return;
    }
    // Wappen-Schild mit Bärenkopf, Zylinder, Monokel
    ctx.fillStyle = '#ffc21a';
    ctx.beginPath(); ctx.moveTo(cx - 44, cy - 50); ctx.lineTo(cx + 44, cy - 50); ctx.lineTo(cx + 44, cy + 20); ctx.quadraticCurveTo(cx, cy + 80, cx - 44, cy + 20); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3a1428';
    ctx.beginPath(); ctx.moveTo(cx - 36, cy - 42); ctx.lineTo(cx + 36, cy - 42); ctx.lineTo(cx + 36, cy + 16); ctx.quadraticCurveTo(cx, cy + 68, cx - 36, cy + 16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8a5a34';
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + sx * 20, cy - 8, 9, 0, TAU); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(cx, cy + 10, 25, 22, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e2b585'; ctx.beginPath(); ctx.ellipse(cx, cy + 19, 12, 9, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a1a14'; ctx.beginPath(); ctx.arc(cx - 9, cy + 6, 3, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(cx + 9, cy + 6, 3, 0, TAU); ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffc21a'; ctx.beginPath(); ctx.arc(cx + 9, cy + 6, 6, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#16121c'; ctx.fillRect(cx - 22, cy - 14, 44, 5); ctx.fillRect(cx - 13, cy - 38, 26, 25);
    ctx.fillStyle = '#c4304e'; ctx.fillRect(cx - 13, cy - 20, 26, 5);
  });
}

// ------------------------------------------------------------------ Lebendige Kulisse

const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _mb = new THREE.Matrix4();
const _fr = new THREE.Frustum(), _fm = new THREE.Matrix4(), _fs = new THREE.Sphere();
function setI(m, i, x, y, z, ry = 0, s = 1, rx = 0, rz = 0) {
  _e.set(rx, ry, rz, 'YXZ');
  _q.setFromEuler(_e);
  if (Array.isArray(s)) _s.set(s[0], s[1], s[2]); else _s.setScalar(s);
  _m4.compose(_p.set(x, y, z), _q, _s);
  m.setMatrixAt(i, _m4);
}
const BULB_COLS = [0xfff0b0, 0xffb0c8, 0xb0f0ff, 0xffd070];
const FW_COLS = [0xff5a7a, 0xffd23a, 0x5ae8ff, 0x9aff6a, 0xc88aff, 0xffffff];

/**
 * Bewegte Kulisse des Rummelplatzes (MapBuilder: out.life, je Bild update; CourseMapScene.state().decor über liveInfo):
 *   map.lights     [{ a: [x, y, z], b: [x, y, z], h?, sag?, posts? }] Glühbirnenketten zwischen zwei Masten (Füße a, b; Höhe
 *                  h) – Birnen als eine Instanz-Fläche, blinken im Takt der Kartenmusik (je Zählzeit leuchtet eine von drei
 *                  Gruppen hell auf, Lauflicht)
 *   map.flags      [[x, y, z, h]] Fahnen (Mast statisch, Tuch weht; Brummbär-Fahne, nach dem Spielende bunte Herz-Fahne)
 *   map.banners    [{ pos: [x, y, z] (Oberkante Mitte), yaw, w, h }] Turm-Banner (Wappen, nach dem Spielende Herz)
 *   map.wheel      { pos, yaw?, radius?, speed? } großes Riesenrad (Registry 'riesenrad_kulisse', dreht sich)
 *   map.carousel   { pos, speed? } Karussell (Registry 'karussell', dreht sich, Pferdchen wippen)
 *   map.coaster    { pts: [[x, y, z], …] (geschlossen), cars?, speed? } Achterbahn: Schienen eingebacken, Wägelchen fahren
 *   map.balloons   [{ at: [x, y, z], n, h? }] Brummbär-Ballons steigen von einem Stand auf (eine Instanz-Fläche)
 *   map.fireworks  [[x, y, z], …] Feuerwerk über dem Rummel – nur nach dem Spielende (courseSave.data.finished)
 *   Lava, Lavafälle, Fontänen, Rauch, Knochenflieger, Fackeln, Platschfische: LavaLife (lava7.js) aus denselben Weltdaten.
 */
export class RummelLife {
  constructor(level, map) {
    this.view = level.view;
    this.level = level;
    this.map = map;
    this.own = [];
    this.finished = gameFinished();
    // Lava, Rauch, Knochenflieger, Fackeln (Fahnen baut RummelLife selbst – umschaltbar nach dem Spielende)
    this.lava = new LavaLife(level, { ...map, flags: [] });
    this.cullLavaEffects();
    this.buildLights(map.lights ?? []);
    this.buildFlags(map.flags ?? [], map.banners ?? []);
    this.buildWheel(map.wheel);
    this.buildCarousel(map.carousel);
    this.buildCoaster(map.coaster);
    this.buildBalloons(map.balloons ?? []);
    this.buildFireworks(this.finished ? (map.fireworks ?? []) : []);
    this.bulbInfo = { beat: 0, step: 0, k: 0, source: 'zeit', theme: null, bpm: MAP_BPM8() };
    this.shown = null;
    this.far = false;
    this.update(0, 0);
  }

  add(obj) { this.view.add(obj); this.own.push(obj); return obj; }

  /**
   * Die Lava-Effekte (Bausteine aus Welt 7) zeichnen ihre Instanz-Flächen ohne Frustum-Culling – auf der großen
   * Rummel-Karte bekommt jede eine feste Hüllkugel aus ihren Ankerpunkten (+ Spielraum für die Bewegung), damit sie nur
   * im Bild Zeichenaufrufe kosten.
   */
  cullLavaEffects() {
    const L = this.lava;
    const P = (p) => (Array.isArray(p) ? p : [p.x, p.y ?? 0, p.z]);
    const fit = (mesh, pts, margin) => {
      if (!mesh?.isInstancedMesh || !pts.length) return;
      const box = new THREE.Box3();
      for (const p of pts) box.expandByPoint(new THREE.Vector3(...P(p)));
      const sph = box.getBoundingSphere(new THREE.Sphere());
      sph.radius += margin;
      mesh.boundingSphere = sph;
      mesh.frustumCulled = true;
    };
    fit(L.fCol, L.fountains ?? [], 7);
    fit(L.drops, L.fountains ?? [], 10);
    fit(L.bub, (L.bubbles ?? []).map((b) => b.p), 2.5);
    fit(L.smoke, L.smokeSrc ?? [], 14);
    fit(L.flames, L.torches ?? [], 3);
    fit(L.fishMesh, L.fish ?? [], 3 + Math.max(0, ...(L.fish ?? []).map((f) => f.dist ?? 4)) + 4);
  }

  /** Glühbirnenketten: Masten und Kabel statisch (Kacheln), Birnen als eine Instanz-Fläche (unbeleuchtet, Farbe je Birne). */
  buildLights(list) {
    this.bulbs = [];
    if (!list.length) return;
    for (const L of list) {
      // je Kette eigene Teile: Sie landen in der Zonen-Kachel ihrer Insel (eine Fläche über die ganze Karte hielte die
      // Zonen-Kachel, in die ihre Mitte fällt, überall im Bild)
      const posts = new Build(), wires = new Build();
      const h = L.h ?? 4.2, sag = L.sag ?? 0.9;
      const A = [L.a[0], L.a[1] + h, L.a[2]], B = [L.b[0], L.b[1] + (L.hb ?? h), L.b[2]];
      for (const [P, show] of [[L.a, L.posts !== false && L.postA !== false], [L.b, L.posts !== false && L.postB !== false]]) {
        if (!show) continue;
        posts.cyl(0.08, 0.1, h, { v: (px, py) => mix(0x2e2836, 0x5a4a6a, (py - P[1]) / h) }, { p: [P[0], P[1] + h / 2, P[2]] }, 6);
        posts.cyl(0.22, 0.28, 0.24, 0x3a3046, { p: [P[0], P[1] + 0.12, P[2]] }, 8);
        posts.sphere(0.13, 0xffc83a, { p: [P[0], P[1] + h + 0.08, P[2]] }, 6, 4);
        if (L.solid !== false) this.level.world.add({ type: 'cyl', x: P[0], z: P[2], r: 0.18, y0: P[1], y1: P[1] + h, tag: 'mast' });
      }
      const len = Math.hypot(B[0] - A[0], B[2] - A[2]);
      const n = Math.max(3, Math.round(len / 0.9));
      const pts = [];
      for (let i = 0; i <= 12; i++) { const u = i / 12; pts.push([A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u - Math.sin(u * Math.PI) * sag, A[2] + (B[2] - A[2]) * u]); }
      wires.tube(pts, 0.025, 0x2a2232, null, 16, 3);
      for (let i = 1; i < n; i++) {
        const u = i / n;
        this.bulbs.push({ x: A[0] + (B[0] - A[0]) * u, y: A[1] + (B[1] - A[1]) * u - Math.sin(u * Math.PI) * sag - 0.16, z: A[2] + (B[2] - A[2]) * u, c: BULB_COLS[(i + this.bulbs.length) % BULB_COLS.length] });
      }
      if (posts.parts?.length !== 0) this.view.addStatic(posts.geometry(), { castShadow: true });
      this.view.addStatic(wires.geometry(), { castShadow: false });
    }
    const g = new THREE.IcosahedronGeometry(0.16, 0);
    const mat = new THREE.MeshBasicMaterial({ fog: true, toneMapped: false });
    this.bulbMesh = new THREE.InstancedMesh(g, mat, this.bulbs.length);
    this.bulbMesh.frustumCulled = false;
    this.bulbMesh.castShadow = false;
    this.bulbMesh.name = 'w8:gluehbirnen';
    this.own.push(g, mat);
    this.bulbs.forEach((bb, i) => { setI(this.bulbMesh, i, bb.x, bb.y, bb.z, 0, 1); this.bulbMesh.setColorAt(i, _c.set(bb.c)); });
    this.bulbMesh.instanceMatrix.needsUpdate = true;
    this.add(this.bulbMesh);
  }

  /** Stellung der Glühbirnen aus der Taktuhr: Gruppe (0..2) je Zählzeit, Puls k am Taktschlag. */
  bulbState(t = this.view.time) {
    const bt = beatNow8(t);
    const whole = Math.floor(bt.beat), frac = bt.beat - whole;
    return { beat: +bt.beat.toFixed(3), step: ((whole % 3) + 3) % 3, k: +beatPulse(frac).toFixed(4), source: bt.source, theme: bt.theme, bpm: bt.bpm };
  }

  /** Fahnen (Mast statisch, Tuch in einer gemeinsamen Fläche) und Turm-Banner; Textur je nach Spielende. */
  buildFlags(list, banners) {
    this.flagList = list;
    this.bannerList = banners;
    const pos = [], uv = [], idx = [];
    this.flagBase = [];
    const fw = 1.6, fh = 1.0, sx = 8, sy = 4;
    list.forEach(([x, y, z, h = 4], fi) => {
      const pole = new Build();
      pole.cyl(0.06, 0.08, h, 0x3a3046, { p: [x, y + h / 2, z] }, 6);
      pole.sphere(0.13, 0xffc83a, { p: [x, y + h + 0.08, z] }, 6, 4);
      pole.cyl(0.24, 0.3, 0.2, 0x3a3046, { p: [x, y + 0.1, z] }, 8);
      this.view.addStatic(pole.geometry(), { castShadow: true });
      const v0 = pos.length / 3;
      for (let j = 0; j <= sy; j++) for (let i = 0; i <= sx; i++) {
        const u = i / sx, v = j / sy;
        const lx = u * fw, ly = (v - 0.5) * fh;
        pos.push(x + 0.06 + lx, y + h - 0.55 + ly, z);
        uv.push(u, v);
        this.flagBase.push({ x: x + 0.06, y: y + h - 0.55, z, lx, ly, f: u, fi });
      }
      for (let j = 0; j < sy; j++) for (let i = 0; i < sx; i++) { const a = v0 + j * (sx + 1) + i, b2 = a + 1, c = a + sx + 1, d = c + 1; idx.push(a, b2, d, a, d, c); }
    });
    if (list.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      const mat = new THREE.MeshStandardMaterial({ map: this.finished ? heartFlagTexture() : baronFlagTexture(), side: THREE.DoubleSide, roughness: 0.75 });
      this.own.push(g, mat);
      this.flagMesh = new THREE.Mesh(g, mat);
      this.flagMesh.frustumCulled = false;
      this.flagMesh.name = 'w8:fahnen';
      this.add(this.flagMesh);
    }
    // Turm-Banner: senkrechte Tücher (Oberkante an pos), wehen leicht
    if (banners.length) {
      const bp = [], bu = [], bi = [];
      this.bannerBase = [];
      const nx = 3, ny = 6;
      banners.forEach((bn, k) => {
        const [x, y, z] = bn.pos, w = bn.w ?? 2.4, h = bn.h ?? 6, yaw = bn.yaw ?? 0;
        const cx = Math.cos(yaw), cz = -Math.sin(yaw);
        const v0 = bp.length / 3;
        for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
          const u = i / nx, v = j / ny;
          const lx = (u - 0.5) * w, ly = -v * h;
          bp.push(x + cx * lx, y + ly, z + cz * lx);
          bu.push(u, 1 - v);
          this.bannerBase.push({ x: x + cx * lx, y: y + ly, z: z + cz * lx, nxv: -cz, nzv: cx, v, k });
        }
        for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const a = v0 + j * (nx + 1) + i, b2 = a + 1, c = a + nx + 1, d = c + 1; bi.push(a, c, d, a, d, b2); }
        const rod = new Build();
        rod.cyl(0.08, 0.08, w + 0.5, 0xffc83a, { p: [x, y + 0.05, z], r: [0, yaw, Math.PI / 2] }, 6);
        this.view.addStatic(rod.geometry(), { castShadow: false });
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(bu, 2));
      g.setIndex(bi);
      g.computeVertexNormals();
      const mat = new THREE.MeshStandardMaterial({ map: bannerTexture(this.finished), side: THREE.DoubleSide, roughness: 0.8 });
      this.own.push(g, mat);
      this.bannerMesh = new THREE.Mesh(g, mat);
      this.bannerMesh.frustumCulled = false;
      this.bannerMesh.name = 'w8:turmbanner';
      this.add(this.bannerMesh);
    }
  }

  /** Großes Riesenrad (Registry 'riesenrad_kulisse', sonst eigenes Rad mit Kabinen). */
  buildWheel(spec) {
    if (!spec) return;
    const [x, y, z] = spec.pos;
    this.wheelSpec = { speed: spec.speed ?? 0.1, angle: 0 };
    const R = spec.radius ?? 11;
    if (hasModel('riesenrad_kulisse') && !tooHeavy('riesenrad_kulisse', { radius: R }, 12500)) {
      const m = getModel('riesenrad_kulisse', { radius: R });
      if (!m.placeholder) {
        m.root.position.set(x, y, z);
        m.root.rotation.y = spec.yaw ?? 0;
        m.root.traverse((o) => { if (o.isMesh) o.castShadow = !o.isInstancedMesh && o.castShadow; });
        this.view.add(m.root);
        this.own.push(m);
        this.wheel = m;
        W8_USED.add('riesenrad_kulisse');
      }
    }
    if (!this.wheel) {
      // Ersatz: Radkranz und Speichen drehen, Kabinen hängen waagrecht (Instanzen)
      const H = R + 3.5;
      const grp = new THREE.Group();
      grp.position.set(x, y, z);
      grp.rotation.y = spec.yaw ?? 0;
      const stand = new Build();
      for (const s of [-1, 1]) for (const d of [-1, 1]) stand.box(0.5, H * 1.08, 0.5, 0x6a6a7e, { p: [s * R * 0.42, H / 2, d * 1.4], r: [d * 0.12, 0, s * 0.33] }, 0);
      grp.add(new THREE.Mesh(stand.geometry(), vcol(0.5, {}, 'w8decor')));
      const wb = new Build();
      for (const d of [-1.0, 1.0]) wb.torus(R, 0.2, 0xd83a5a, { p: [0, 0, d] }, 4, 40);
      for (let i = 0; i < 12; i++) wb.box(R * 2, 0.12, 0.12, 0xf0d0e0, { r: [0, 0, (i / 12) * Math.PI] }, 0);
      wb.cyl(0.8, 0.8, 2.4, 0xffc83a, { r: [Math.PI / 2, 0, 0] }, 12);
      const wheel = new THREE.Mesh(wb.geometry(), vcol(0.5, {}, 'w8decor'));
      wheel.position.y = H;
      grp.add(wheel);
      const cab = new Build();
      cab.box(1.4, 1.2, 1.2, 0xffffff, { p: [0, -0.9, 0] }, 0.1);
      cab.cone(0.9, 0.5, 0xffffff, { p: [0, -0.05, 0] }, 6);
      const cabins = new THREE.InstancedMesh(cab.geometry(), vcol(0.5, {}, 'w8decor'), 12);
      cabins.frustumCulled = false;
      for (let i = 0; i < 12; i++) cabins.setColorAt(i, _c.set([0xffc83a, 0x5ad8ff, 0x8aff7a, 0xff7ab4][i % 4]));
      grp.add(cabins);
      this.view.add(grp);
      this.own.push({ dispose: () => { grp.parent?.remove(grp); grp.traverse((o) => o.geometry?.dispose()); } });
      this.wheelOwn = { wheel, cabins, R, H };
    }
  }

  buildCarousel(spec) {
    if (!spec) return;
    const [x, y, z] = spec.pos;
    this.carSpec = { speed: spec.speed ?? 0.55 };
    if (hasModel('karussell') && !tooHeavy('karussell', {}, 12500)) {
      const m = getModel('karussell', {});
      if (!m.placeholder) {
        m.root.position.set(x, y, z);
        m.root.traverse((o) => { if (o.isMesh) o.castShadow = !o.isInstancedMesh && o.castShadow; });
        this.view.add(m.root);
        this.own.push(m);
        this.carousel = m;
        W8_USED.add('karussell');
      }
    }
    if (!this.carousel) {
      const b = new Build();
      b.cyl(4, 4, 0.5, 0xe8303e, { p: [0, 0.45, 0] }, 24);
      b.cyl(0.9, 0.9, 4.6, 0x8a3ae8, { p: [0, 3, 0] }, 12);
      b.cone(4.6, 1.8, 0xffc83a, { p: [0, 6.2, 0] }, 16);
      const top = new THREE.Mesh(b.geometry(), vcol(0.5, {}, 'w8decor'));
      top.position.set(x, y, z);
      top.castShadow = true;
      this.view.add(top);
      this.own.push({ dispose: () => { top.parent?.remove(top); top.geometry.dispose(); } });
      this.carouselOwn = top;
    }
    this.level.world.add({ type: 'cyl', x, z, r: spec.r ?? 4.3, y0: y, y1: y + 6.5, tag: 'karussell' });
  }

  /** Achterbahn: Schienen (eigene, entlang der geschlossenen Bahn) eingebacken, Wägelchen als Instanzen. */
  buildCoaster(spec) {
    if (!spec?.pts?.length) return;
    const curve = new THREE.CatmullRomCurve3(spec.pts.map((p) => new THREE.Vector3(...p)), true, 'centripetal');
    this.coasterCurve = curve;
    this.coasterLen = curve.getLength();
    const N = Math.max(60, Math.round(this.coasterLen * 1.2));
    const b = new Build(), sup = new Build();
    const P = new THREE.Vector3(), T = new THREE.Vector3();
    const railPts = [[], []];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      curve.getPointAt(u % 1, P); curve.getTangentAt(u % 1, T);
      const side = new THREE.Vector3(-T.z, 0, T.x).normalize();
      for (const [k, s] of [[0, 0.55], [1, -0.55]]) railPts[k].push([P.x + side.x * s, P.y, P.z + side.z * s]);
      if (i < N) {
        const yaw = Math.atan2(-T.z, T.x);
        b.box(0.2, 0.08, 1.4, i % 2 ? 0x8a5a3a : 0x9a6a42, { p: [P.x, P.y - 0.08, P.z], r: [0, yaw, 0] }, 0);
        if (i % 4 === 0 && P.y > spec.base + 0.6) {
          const h = P.y - spec.base - 0.1;
          sup.cyl(0.1, 0.15, h, 0x8a90a8, { p: [P.x, spec.base + h / 2, P.z] }, 5);
        }
      }
    }
    for (const rp of railPts) {
      const c2 = new THREE.CatmullRomCurve3(rp.map((p) => new THREE.Vector3(...p)), false);
      b.add(new THREE.TubeGeometry(c2, N * 2, 0.08, 4, false), 0xd8303e);
    }
    this.view.addStatic(b.geometry(), { castShadow: true, tile: 'w8:achterbahn' });
    this.view.addStatic(sup.geometry(), { castShadow: true, tile: 'w8:achterbahn' });
    // Wägelchen: Registry 'achterbahn' (wagen, Bärengesicht) als Instanz-Vorlage, sonst eigene
    let geo = null;
    if (hasModel('achterbahn') && !tooHeavy('achterbahn', { kind: 'wagen' }, 2600)) {
      const m = getModel('achterbahn', { kind: 'wagen' });
      m.root.traverse((o) => { if (!geo && o.isMesh) geo = o.geometry; });
      if (geo) { this.coasterReg = true; W8_USED.add('achterbahn'); }
    }
    if (!geo) {
      const cb = new Build();
      cb.box(2.2, 0.7, 1.4, 0xd8303e, { p: [0, 0.65, 0] }, 0.2);
      cb.sphere(0.4, 0xd8303e, { p: [1.1, 0.85, 0] }, 8, 6);
      geo = cb.geometry();
    }
    this.cars = spec.cars ?? 3;
    this.coasterSpeed = spec.speed ?? 7;
    this.carMesh = new THREE.InstancedMesh(geo, vcol(0.45, {}, 'w8car'), this.cars);
    this.carMesh.frustumCulled = false;
    this.carMesh.castShadow = false;
    this.carMesh.name = 'w8:achterbahn-wagen';
    this.add(this.carMesh);
    this.coasterU = 0;
  }

  /** Aufsteigende Brummbär-Ballons (eine Instanz-Fläche; Registry-Form, umgefärbt, Farbe je Ballon). */
  buildBalloons(list) {
    this.balloons = [];
    if (!list.length) return;
    for (const src of list) for (let i = 0; i < (src.n ?? 5); i++) this.balloons.push({ at: src.at, h: src.h ?? 26, ph: i / (src.n ?? 5), per: 11 + (i % 3) * 2.5, dx: Math.sin(i * 2.3) * 2.2, dz: Math.cos(i * 1.7) * 1.6, c: [0xe8283a, 0xffc81a, 0x3a7aff, 0x8a3ae8][i % 4] });
    let geo;
    try {
      geo = recolor(balloonGeo('rot', true).clone(), (c, h) => (h.s > 0.25 && (h.h * 360 < 30 || h.h * 360 > 330) ? new THREE.Color(1, 1, 1).multiplyScalar(0.6 + h.l * 0.5) : null));
      W8_USED.add('brummbaer_ballon');
    } catch {
      geo = new Build().sphere(0.6, 0xffffff, null, 10, 8).geometry();
    }
    this.balloonMesh = new THREE.InstancedMesh(geo, vcol(0.35, {}, 'w8ballon'), this.balloons.length);
    this.balloonMesh.frustumCulled = false;
    this.balloonMesh.castShadow = false;
    this.balloonMesh.name = 'w8:ballons';
    this.balloons.forEach((bl, i) => this.balloonMesh.setColorAt(i, _c.set(bl.c)));
    this.own.push(geo);
    this.add(this.balloonMesh);
  }

  /** Feuerwerk (nur nach dem Spielende): Raketen steigen, platzen in bunte Funkenkugeln (eine Instanz-Fläche). */
  buildFireworks(list) {
    this.bursts = list.map((c, i) => ({ c, ph: i * 0.37, per: 2.6 + (i % 3) * 0.4, col: FW_COLS[i % FW_COLS.length] }));
    if (!this.bursts.length) return;
    this.sparkN = 22;
    const g = new THREE.IcosahedronGeometry(0.22, 0);
    const mat = new THREE.MeshBasicMaterial({ fog: false, toneMapped: false });
    this.fw = new THREE.InstancedMesh(g, mat, this.bursts.length * (this.sparkN + 1));
    this.fw.frustumCulled = false;
    this.fw.castShadow = false;
    this.fw.name = 'w8:feuerwerk';
    this.own.push(g, mat);
    this.bursts.forEach((bu, k) => { for (let i = 0; i <= this.sparkN; i++) this.fw.setColorAt(k * (this.sparkN + 1) + i, _c.set(i === this.sparkN ? 0xfff6c0 : FW_COLS[(k + (i % 2)) % FW_COLS.length])); });
    this.add(this.fw);
    // feste Funken-Richtungen (Fibonacci-Kugel)
    this.dirs = [];
    for (let i = 0; i < this.sparkN; i++) { const y = 1 - (2 * (i + 0.5)) / this.sparkN, r = Math.sqrt(1 - y * y), a = i * 2.39996; this.dirs.push([Math.cos(a) * r, y, Math.sin(a) * r]); }
  }
  fireworkInfo(t = this.view.time) {
    if (!this.bursts?.length) return null;
    let open = 0;
    for (const bu of this.bursts) { const u = ((t + bu.ph) % bu.per) / bu.per; if (u > 0.3 && u < 0.92) open++; }
    return { n: this.bursts.length, sparks: this.sparkN, open };
  }

  update(dt, t) {
    // Blick über die ganze Insel (Anflug, Ankunft): kleine Effekte ausblenden (spart Zeichenaufrufe)
    const cam = this.view.camera?.position, tg = this.view.rig?.target;
    const far = !!(cam && tg && cam.distanceTo(tg) > 45);
    if (far !== this.far) {
      this.far = far;
      for (const o of [this.flagMesh, this.carMesh, this.balloonMesh]) if (o) o.visible = !far;
    }
    this.lava?.update(dt, t);
    if (this.bulbMesh) {
      const bs = this.bulbState(t);
      this.bulbInfo = bs;
      this.bulbs.forEach((bb, i) => {
        const lit = i % 3 === bs.step;
        const k = lit ? 0.75 + bs.k * 0.75 : 0.55;
        _c.set(bb.c).multiplyScalar(k);
        this.bulbMesh.setColorAt(i, _c);
        if (lit !== bb.lit) { bb.lit = lit; setI(this.bulbMesh, i, bb.x, bb.y, bb.z, 0, lit ? 1.25 : 0.9); }
      });
      this.bulbMesh.instanceMatrix.needsUpdate = true;
      if (this.bulbMesh.instanceColor) this.bulbMesh.instanceColor.needsUpdate = true;
      this.shown = { step: bs.step, k: bs.k };
    }
    if (this.flagMesh) {
      const pos = this.flagMesh.geometry.attributes.position, a = pos.array;
      this.flagBase.forEach((v, i) => {
        const ph = v.fi * 1.3;
        a[i * 3] = v.x + v.lx * (1 - 0.06 * v.f);
        a[i * 3 + 1] = v.y + v.ly - Math.sin(v.f * 4 - t * 4 + ph) * 0.04 * v.f;
        a[i * 3 + 2] = v.z + Math.sin(v.f * 5 - t * 5 + ph) * 0.16 * v.f;
      });
      pos.needsUpdate = true;
      this.flagMesh.geometry.computeVertexNormals();
    }
    if (this.bannerMesh) {
      const pos = this.bannerMesh.geometry.attributes.position, a = pos.array;
      this.bannerBase.forEach((v, i) => {
        const s = Math.sin(t * 1.6 + v.k * 1.1 + v.v * 2.4) * 0.22 * v.v;
        a[i * 3] = v.x + v.nxv * s; a[i * 3 + 1] = v.y; a[i * 3 + 2] = v.z + v.nzv * s;
      });
      pos.needsUpdate = true;
      this.bannerMesh.geometry.computeVertexNormals();
    }
    if (this.wheel || this.wheelOwn) {
      this.wheelSpec.angle = t * this.wheelSpec.speed;
      if (this.wheel) this.wheel.update(dt, { angle: this.wheelSpec.angle });
      else {
        const { wheel, cabins, R, H } = this.wheelOwn;
        wheel.rotation.z = this.wheelSpec.angle;
        for (let i = 0; i < 12; i++) { const a2 = this.wheelSpec.angle + (i / 12) * TAU; setI(cabins, i, Math.cos(a2) * R, H + Math.sin(a2) * R, 0); }
        cabins.instanceMatrix.needsUpdate = true;
      }
    }
    if (this.carousel || this.carouselOwn) {
      const ang = t * this.carSpec.speed;
      this.carouselAngle = ang;
      if (this.carousel) this.carousel.update(dt, { angle: ang });
      else this.carouselOwn.rotation.y = ang;
    }
    if (this.carMesh) {
      const L = this.coasterLen;
      // Tempo: bergab schneller, bergauf langsamer (Höhe der Bahn)
      const frac = (v) => (Number.isFinite(v) ? ((v % 1) + 1) % 1 : 0);   // auch bei negativer Zeit (Szenenwechsel) in [0, 1)
      this.coasterU = frac((t * this.coasterSpeed) / L);
      for (let i = 0; i < this.cars; i++) {
        const u = frac(this.coasterU - (i * 2.5) / L);
        this.coasterCurve.getPointAt(u, _v1);
        this.coasterCurve.getTangentAt(u, _v2);
        const yaw = Math.atan2(-_v2.z, Math.hypot(_v2.x, 0) * Math.sign(_v2.x || 1));
        const pitch = Math.asin(Math.max(-1, Math.min(1, _v2.y)));
        _e.set(0, Math.atan2(-_v2.z, _v2.x), pitch, 'YZX');
        _q.setFromEuler(_e);
        _m4.compose(_p.set(_v1.x, _v1.y - 0.05, _v1.z), _q, _s.setScalar(1));
        this.carMesh.setMatrixAt(i, _m4);
        void yaw;
      }
      this.carMesh.instanceMatrix.needsUpdate = true;
    }
    if (this.balloonMesh) {
      // nur Ballons im Bild zeichnen (vorn in der Instanz-Liste, count = Anzahl): die Ballon-Figur ist fein, Ballons
      // über fernen Inseln kosten sonst Dreiecke
      const camO = this.view.camera;
      if (camO) { camO.updateMatrixWorld(); _fr.setFromProjectionMatrix(_fm.multiplyMatrices(camO.projectionMatrix, camO.matrixWorldInverse)); }
      let k = 0;
      this.balloons.forEach((bl, i) => {
        const u = ((t / bl.per) + bl.ph) % 1;
        const y = bl.at[1] + 1.5 + u * bl.h;
        const sway = Math.sin(t * 0.9 + i) * 0.5 * u;
        const sc = u > 0.85 ? Math.max(0.001, 1 - (u - 0.85) / 0.15) : Math.min(1, u * 8);
        const x = bl.at[0] + bl.dx * u + sway, z = bl.at[2] + bl.dz * u;
        if (camO && !_fr.intersectsSphere(_fs.set(_v3.set(x, y + 0.6, z), 3))) return;
        setI(this.balloonMesh, k, x, y, z, -Math.PI / 2 + Math.sin(t * 0.7 + i) * 0.3, sc * 1.1, 0, Math.sin(t * 1.1 + i) * 0.08);
        this.balloonMesh.setColorAt(k, _c.set(bl.c));
        k++;
      });
      this.balloonMesh.count = k;
      this.balloonsShown = k;
      this.balloonMesh.instanceMatrix.needsUpdate = true;
      if (this.balloonMesh.instanceColor) this.balloonMesh.instanceColor.needsUpdate = true;
    }
    if (this.fw) {
      const S = this.sparkN + 1;
      this.bursts.forEach((bu, k) => {
        const u = ((t + bu.ph) % bu.per) / bu.per;
        const [cx, cy, cz] = bu.c;
        if (u < 0.3) {
          // Rakete steigt
          const e = u / 0.3;
          setI(this.fw, k * S + this.sparkN, cx, cy - 18 + e * 18, cz, 0, [0.6, 2.2, 0.6]);
          for (let i = 0; i < this.sparkN; i++) setI(this.fw, k * S + i, cx, cy, cz, 0, 0.001);
        } else {
          const e = Math.min(1, (u - 0.3) / 0.62);
          const r = 7 * (1 - (1 - e) * (1 - e));
          const sc = e < 0.85 ? 1.2 - e * 0.5 : Math.max(0.001, (1 - e) * 4);
          for (let i = 0; i < this.sparkN; i++) { const d = this.dirs[i]; setI(this.fw, k * S + i, cx + d[0] * r, cy + d[1] * r - e * e * 3, cz + d[2] * r, 0, sc); }
          setI(this.fw, k * S + this.sparkN, cx, cy, cz, 0, e < 0.15 ? 3 * (1 - e / 0.15) + 0.001 : 0.001);
        }
      });
      this.fw.instanceMatrix.needsUpdate = true;
    }
  }

  liveInfo() {
    return {
      ...(this.lava?.liveInfo() ?? {}),
      bulbs: { ...this.bulbState(), n: this.bulbs?.length ?? 0, shown: this.shown },
      flags: { n: this.flagList?.length ?? 0, banners: this.bannerList?.length ?? 0, style: this.finished ? 'herz' : 'baron' },
      wheel: { registry: !!this.wheel, angle: +(this.wheelSpec?.angle ?? 0).toFixed(3) },
      carousel: { registry: !!this.carousel, angle: +(this.carouselAngle ?? 0).toFixed(3) },
      coaster: { cars: this.cars ?? 0, u: +(this.coasterU ?? 0).toFixed(4), length: +(this.coasterLen ?? 0).toFixed(1), registry: !!this.coasterReg },
      balloons: { n: this.balloons?.length ?? 0, shown: this.balloonsShown ?? 0 },
      fireworks: this.fireworkInfo(),
      finished: this.finished,
      w8models: [...W8_USED].sort(),
      w8heavy: Object.fromEntries(W8_HEAVY),
    };
  }

  info() { return this.liveInfo(); }

  dispose() {
    this.lava?.dispose();
    for (const o of this.own) { if (o.isObject3D) o.parent?.remove(o); o.dispose?.(); }
    this.own.length = 0;
  }
}
