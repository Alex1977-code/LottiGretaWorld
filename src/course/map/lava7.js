// Gelände, Ränder, Streudeko, Requisiten, Brücken, Lava und lebendige Kulisse der Welt-7-Karte „Lava-Festung“ (eigene
// Gestaltung, Spielzeug-Look wie Welt 1–6, kindgerecht: warmes Abendlicht statt Finsternis, leuchtende Lava, freundliche
// Festungen): eine dunkle Vulkaninsel aus Basalt-Schichten mit warmer Tuff-Decke und glühenden Rissen.
// Geländestile (map.ground[].style): 'ash' (Standard, Tuff-Platten), 'arena' (helle Felsfläche 7-A), 'temple' (Terrakotta-
// Pflaster 7-2), 'track' (Asphalt mit Startlinie 7-3), 'bluerock' (blaugrauer Basalt mit blauen Rissen 7-4), 'fort'
// (Festungsplatten), 'crater' (rote Schlacke 7-7), 'castle' (Basaltfliesen mit Glutfugen 7-Burg), 'blacksand' (schwarzer
// Sand), 'rock' (Basaltfels), 'cliff' (Felswand mit Basaltsäulen), 'basin'/'bluebasin' (Lavabecken: Boden und Krustenrand;
// die Lava selbst zeichnet LavaLife), 'lagoon' (Lagune: Grund, Felsrand, Wasser).
// Ränder (map.edges): 'basaltwall' (niedrige Mauer aus Basaltblöcken mit Säulenstümpfen), 'battlement' (Festungsmauer mit
// Zinnen an Abbrüchen – auch an den Lavaufern).
// Verbindungen (segments, nur Karte, Kollision wie `bridge`): 'basaltbridge' (Basaltbrücke mit Zinnen-Brüstung und Laternen),
// 'chainbridge' (Kettensteg aus Bohlen mit Eisenbändern), 'causeway' (Damm aus Basaltsäulen über die Lagune), 'drawbridge'
// (Zugbrücke mit Ketten und Torhäuschen); Glasröhren ('glasstube') kommen aus sky6.js.
// Lebendige Kulisse (LavaLife, je Bild): Lavaflüsse und -seen (eine Fläche je Lava-Farbe, fließende Textur), Lavafälle,
// Lava-Fontänen im Takt der Kartenmusik (music.beat(); ohne laufende Musik Ersatzuhr im Tempo von course_world7_map bzw.
// course_map), Lavablasen, Rauchfahnen und Dampf, kreisende Knochenflieger, wehende Brummbär-Fahnen, Fackeln, springende
// Platschfische. Thema 'map_lava' (Abendhimmel, warmer Dunst, großer Vulkan mit Lavaströmen und Rauchsäule am Horizont)
// meldet sich hier in THEMES an; Nachbarwelt-Stil 'erzpark' (dunkles Land mit Turm und Riesenrad – Ziel der Röhre W8).
//
// Alle statischen Geometrien in Weltkoordinaten bzw. mit Fußpunkt im Ursprung (Vorderseite +Z, zur Kamera) und Vertexfarben
// (position/normal/color) für view.addStatic (Karten-Kacheln, MapBatcher). Flache Deckschichten tragen userData.noShadow,
// leuchtende userData.material 'glow', glänzendes Wasser 'stone'.

import * as THREE from 'three';
import { mix, TAU, cached, vcol } from '../models/lib/kit.js';
import { roundedBox, SIDE, colorize, lin, mixc, smooth, Rnd, merge } from '../../three/world/geometry.js';
import { alignedGrid } from '../blocks/kit.js';
import { THEMES } from '../view/themes.js';
import { music } from '../../audio/index.js';
import { canvasTexture } from '../../three/lib/itemMaterials.js';
import { LowBuild as Build, place } from './desert.js';
import { buildBridge } from '../blocks/types/bridge.js';
import { baronFlagTexture } from './props.js';
import { gearGeo } from './sky6.js';
import { hasModel } from '../models/index.js';

/** Benutzte Registry-Modelle der Welt-7-Karte (state().decor.w7models) und vorhandene, aber zu schwere (w7heavy: Name → Dreiecke). */
export const W7_USED = new Set();
export const W7_HEAVY = new Map();

export const LAVA_STYLES = new Set(['ash', 'arena', 'temple', 'track', 'bluerock', 'fort', 'crater', 'castle', 'blacksand', 'rock', 'cliff',
  'basin', 'bluebasin', 'lagoon']);

// ------------------------------------------------------------------ Thema der Lava-Festung

if (!THEMES.map_lava) {
  THEMES.map_lava = {
    ...THEMES.grass,
    label: 'Weltkarte Lava-Festung',
    sky: [[1, 0x36326e], [0.5, 0x5c4a96], [0.24, 0xb0709c], [0.1, 0xf0987a], [0.03, 0xffb684], [0, 0xffc690], [-0.1, 0xd88a64], [-1, 0x7a3e34]],
    background: 0xf2b48c,
    fog: { color: 0xeeae8c, near: 110, far: 460 },
    hemi: { sky: 0xffdcc4, ground: 0x8a4a40, intensity: 1.34 },
    sun: { color: 0xffd4aa, intensity: 2.7, dir: [-0.5, 1, 0.42] },
    ground: null,
    clouds: false,
    sunDisc: true,
    backdrop: 'lava7',
    grassTop: 0x8a7468, grassTop2: 0x7e6a60, grassRim: 0xa88a7a, grassSide: 0x5a4a4c,
    dirt: 0x6a4a44, dirtDeep: 0x3e2a2a, rock: 0x5a464a, rockDeep: 0x3a2c30,
    stone: 0xd2bcae, stoneDark: 0x6a5a5a,
    wood: 0x8a5a3a, woodDark: 0x4a2c1c,
    water: 0x3ab8c8, waterDeep: 0x1c6a9a,
    lava: 0xff6a1a,
    buildBackdrop(sky, bounds, rnd) { lavaBackdrop(sky, bounds, rnd); },
  };
}

// ------------------------------------------------------------------ Hilfen

const hash2 = (x, z) => { const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return h - Math.floor(h); };
const tone = (a, c, k, out = [0, 0, 0]) => mixc(lin(a), lin(c), k, out);
const MAT_TILE = { glow: 'w7:leuchten', stone: 'w7:wasser' };
function flat(g, material) { if (g) { g.userData.noShadow = true; if (material) { g.userData.material = material; g.userData.tile = MAT_TILE[material]; } } return g; }
const inRect = (r, x, z) => x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3];
/** Gelände-Block, der den Punkt enthält (höchster), sonst null. */
function blockAt(map, x, z, skip = null) {
  let best = null;
  for (const o of map?.ground ?? []) if (o !== skip && inRect(o.rect, x, z) && (!best || o.top > best.top)) best = o;
  return best;
}
export const LAVA_GLOW = { rot: [0xff7a1a, 0xffb43a], blau: [0x3ab4ff, 0x9ae8ff] };

// ------------------------------------------------------------------ Farben

const BASALT = [0x4a3c42, 0x584850, 0x3e3238, 0x625058];
const BLUEB = [0x3a4258, 0x464e68, 0x323a50, 0x4e5872];
const TERRA = [0xa05a44, 0xb86c4e, 0x8e4c3a, 0xc47e5a];
const SCORIA = [0x6a3a30, 0x7e4838, 0x5a3028, 0x8a5240];
const SLATE7 = [0x4e4656, 0x5a5262, 0x443c4c, 0x625a6c];
const checker2 = (ax, az) => (Math.floor((ax + 1.01) / 2) + Math.floor((az + 1.01) / 2)) & 1;

const PALETTES = {
  // warmer, heller Tuff mit leichter Plattenstruktur (gut lesbar, kein Schachbrett), selten Asche- und Basaltplatten
  ash: {
    bands: BASALT, side: 0x6a5652, rim: 0xb49886, cell: 2, cellOff: 4, cracks: 0.45,
    tile: (rnd) => (i, j, ax, az) => {
      const o = tone(checker2(ax, az) ? 0xa89282 : 0xa08a7a, 0xb29c88, rnd.frac() * 0.35);
      const h = hash2(Math.floor(ax / 2) + 3, Math.floor(az / 2) - 7);
      if (h > 0.9) mixc(o, lin(0xc8a47a), 0.45, o);          // Ascheplatte, ockerfarben
      else if (h < 0.07) mixc(o, lin(0x76625e), 0.45, o);    // dunkle Basaltplatte
      return o;
    },
  },
  arena: {
    bands: BASALT, side: 0x8a6a5e, rim: 0xd8b49a, cell: 2, cracks: 0.9,
    tile: (rnd) => (i, j, ax, az) => tone(checker2(ax, az) ? 0xc6a48c : 0xbe9c84, 0xd0ae94, rnd.frac() * 0.35),
  },
  temple: {
    bands: TERRA, side: 0x9a5a44, rim: 0xe0a47a, cell: 2,
    tile: (rnd) => (i, j, ax, az) => {
      const o = tone(checker2(ax, az) ? 0xd29468 : 0xc88c62, 0xdca476, rnd.frac() * 0.3);
      if (hash2(Math.floor(ax / 2) - 5, Math.floor(az / 2) + 2) > 0.92) mixc(o, lin(0x9a5a3e), 0.4, o);
      return o;
    },
  },
  track: {
    bands: BASALT, side: 0x4a4a54, rim: 0x8a8a96, cell: 2,
    tile: (rnd) => () => tone(0x62626e, 0x5a5a66, rnd.frac()),
  },
  bluerock: {
    bands: BLUEB, side: 0x56607a, rim: 0x9aa8c4, cell: 2, cracks: 0.6, crackColor: 'blau',
    tile: (rnd) => (i, j, ax, az) => tone(checker2(ax, az) ? 0x8a94ac : 0x848ea6, 0x96a0b8, rnd.frac() * 0.35),
  },
  fort: {
    bands: SLATE7, side: 0x625a6c, rim: 0xb4a8bc, cell: 2,
    tile: (rnd) => (i, j, ax, az) => tone(checker2(ax, az) ? 0xa298ac : 0x9a90a6, 0xaaa0b4, rnd.frac() * 0.3),
  },
  crater: {
    bands: SCORIA, side: 0x7a4436, rim: 0xc89070, cell: 2, cellOff: 4, cracks: 0.8,
    tile: (rnd) => (i, j, ax, az) => {
      const o = tone(checker2(ax, az) ? 0xb4806a : 0xac7862, 0xbc8a72, rnd.frac() * 0.35);
      if (hash2(Math.floor(ax / 2) + 9, Math.floor(az / 2)) > 0.9) mixc(o, lin(0x6a4a42), 0.4, o);
      return o;
    },
  },
  castle: {
    bands: BASALT, side: 0x4e4248, rim: 0x9a8a92, cell: 2, cracks: 0.6,
    tile: (rnd) => (i, j, ax, az) => tone(checker2(ax, az) ? 0x8e7e88 : 0x887882, 0x988892, rnd.frac() * 0.3),
  },
  blacksand: {
    bands: BASALT, side: 0x4a4244, rim: 0x7a7072, cell: 2, cellOff: 2, capH: 0.26,
    tile: (rnd) => (i, j, ax, az) => {
      const o = tone(0x6e6668, 0x7a7072, rnd.frac());
      if (hash2(ax * 0.7 + 1, az * 0.7 - 2) > 0.94) mixc(o, lin(0xd8c0a8), 0.35, o);   // helle Muschelsplitter
      return o;
    },
  },
  rock: {
    bands: BASALT, side: 0x4e4044, rim: 0x7e6a6a, cellOff: 4, jitter: 0.22, layer: 1.1,
    tile: (rnd) => () => tone(0x76625e, 0x6a5856, rnd.frac() * 0.8),
  },
  cliff: {
    bands: BASALT, side: 0x4e4044, rim: 0x7a6466, cellOff: 3, jitter: 0.1, layer: 1.4,
    tile: (rnd) => () => tone(0x5e4c50, 0x6e5a5c, rnd.frac() * 0.8),
  },
};

// ------------------------------------------------------------------ Geländestile

/**
 * Gelände-Block der Lava-Festung (Box x0..x1 × z0..z1 von base bis top). Liefert Teil-Geometrien (Weltkoordinaten).
 * map (optional): Weltdaten, damit Becken-Ränder nur dort entstehen, wo kein anderer Block anschließt.
 */
export function lavaGround(b, base, theme, rnd, map) {
  const [x0, z0, x1, z1] = b.rect;
  const top = b.top;
  const style = b.style ?? 'ash';
  if (style === 'basin' || style === 'bluebasin') return basinParts(b, base, rnd, map, style === 'bluebasin');
  if (style === 'lagoon') return lagoonParts(b, base, rnd, map);
  const parts = [];
  const P = PALETTES[style] ?? PALETTES.ash;
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
  if (style === 'cliff') parts.push(cliffColumns(b, base, rnd));
  if (P.cracks && (b.walk || style === 'crater') && !b.noCracks) {
    const c = crackGeo(x0, z0, x1, z1, top + 0.012, rnd, P.cracks, P.crackColor ?? 'rot');
    if (c) parts.push(flat(c, 'glow'));
  }
  if (style === 'track' && b.walk) parts.push(flat(trackMarks(x0, z0, x1, z1, top + 0.01)));
  if (style === 'temple' && b.walk) parts.push(flat(templeBorder(x0, z0, x1, z1, top + 0.01)));
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

/** Glühende Zickzack-Risse (2–4 Glieder, manchmal verzweigt), Dichte k je 12 m². */
function crackGeo(x0, z0, x1, z1, y, rnd, k = 0.5, color = 'rot') {
  const b = new Build();
  const [ca, cb] = LAVA_GLOW[color] ?? LAVA_GLOW.rot;
  const n = Math.round((((x1 - x0) * (z1 - z0)) / 12) * k * 0.6);
  // flache Streifen (2 Dreiecke je Glied) – nur die Oberseite ist zu sehen
  const seg = (ax, az, bx, bz, w, c) => {
    const len = Math.hypot(bx - ax, bz - az);
    b.add(new THREE.PlaneGeometry(len + w, w).rotateX(-Math.PI / 2), c, { p: [(ax + bx) / 2, y, (az + bz) / 2], r: [0, -Math.atan2(bz - az, bx - ax), 0] });
  };
  const walk = (x, z, dir, steps, w) => {
    for (let i = 0; i < steps; i++) {
      const l = 0.6 + rnd.frac() * 0.8;
      dir += (rnd.frac() - 0.5) * 1.4;
      const nx = Math.min(x1 - 0.5, Math.max(x0 + 0.5, x + Math.cos(dir) * l)), nz = Math.min(z1 - 0.5, Math.max(z0 + 0.5, z + Math.sin(dir) * l));
      seg(x, z, nx, nz, w, i % 2 ? cb : ca);
      if (i === 1 && rnd.frac() < 0.35) walk(nx, nz, dir + (rnd.frac() < 0.5 ? 1 : -1) * 1.1, 2, w * 0.7);
      x = nx; z = nz;
    }
  };
  for (let i = 0; i < n; i++) walk(x0 + 0.8 + rnd.frac() * (x1 - x0 - 1.6), z0 + 0.8 + rnd.frac() * (z1 - z0 - 1.6), rnd.frac() * TAU, 2 + Math.floor(rnd.frac() * 3), 0.1);
  return b.parts.length ? b.geometry() : null;
}

/** Rennbahn-Startplatz: Fahrspur-Linien, Schachbrett-Startlinie, rot-weiße Randsteine. */
function trackMarks(x0, z0, x1, z1, y) {
  const b = new Build();
  const cx = (x0 + x1) / 2;
  for (let i = 0; i < 12; i++) for (let j = 0; j < 2; j++) b.box(0.5, 0.02, 0.5, (i + j) % 2 ? 0x1a1a22 : 0xf4f4f8, { p: [x0 + 1.25 + i * 0.5 * ((x1 - x0 - 2.5) / 6), y, z0 + 2.2 + j * 0.5] }, 0);
  for (const s of [-1, 1]) for (let z = z0 + 3.5; z < z1 - 0.5; z += 2) b.box(0.18, 0.02, 1.1, 0xf4f4f8, { p: [cx + s * 3, y, z] }, 0);
  const kerb = (ax, az, bx, bz) => {
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 0.8));
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; b.box(Math.abs(bx - ax) > 0.1 ? len / n : 0.42, 0.03, Math.abs(bz - az) > 0.1 ? len / n : 0.42, i % 2 ? 0xffffff : 0xe8303a, { p: [ax + (bx - ax) * t, y, az + (bz - az) * t] }, 0); }
  };
  kerb(x0 + 0.4, z1 - 0.4, x1 - 0.4, z1 - 0.4); kerb(x0 + 0.4, z0 + 0.4, x0 + 0.4, z1 - 0.4); kerb(x1 - 0.4, z0 + 0.4, x1 - 0.4, z1 - 0.4);
  return b.geometry();
}

/** Tempelplatz: dunkle Zierkante mit goldenen Rauten am Rand. */
function templeBorder(x0, z0, x1, z1, y) {
  const b = new Build();
  const strip = (ax, az, bx, bz) => {
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 1.4));
    b.box(Math.abs(bx - ax) > 0.1 ? len : 0.36, 0.02, Math.abs(bz - az) > 0.1 ? len : 0.36, 0x7a3a2a, { p: [(ax + bx) / 2, y, (az + bz) / 2] }, 0);
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; b.box(0.26, 0.03, 0.26, 0xf0c050, { p: [ax + (bx - ax) * t, y + 0.005, az + (bz - az) * t], r: [0, Math.PI / 4, 0] }, 0); }
  };
  strip(x0 + 0.7, z1 - 0.7, x1 - 0.7, z1 - 0.7); strip(x0 + 0.7, z0 + 0.7, x0 + 0.7, z1 - 0.7); strip(x1 - 0.7, z0 + 0.7, x1 - 0.7, z1 - 0.7);
  return b.geometry();
}

/** Sechseckige Basaltsäule (Fußpunkt im Ursprung), dunkle Flanken, hellere Deckfläche. */
function hexColumn(b, x, y, z, r, h, rot = 0, lo = 0x3e3238, hi = 0x6a5658, topc = 0x8a7472, bottom = true) {
  const col = { v: (px, py, pz, nx, ny) => (ny > 0.6 ? topc : mix(lo, hi, (py + h / 2) / h * 0.7 + Math.max(0, nx * 0.2))) };
  if (bottom) { b.cyl(r, r * 1.02, h, col, { p: [x, y + h / 2, z], r: [0, rot, 0] }, 6); return; }
  // ohne Bodenfläche (steht im Wasser/Fels): Mantel offen + Deckel
  b.cyl(r, r * 1.02, h, col, { p: [x, y + h / 2, z], r: [0, rot, 0] }, 6, true);
  b.add(new THREE.CircleGeometry(r, 6).rotateX(-Math.PI / 2), topc, { p: [x, y + h, z], r: [0, rot + Math.PI / 6, 0] });
}

/** Felswand mit Basaltsäulen: Säulen vor der Südseite (zur Kamera) und Säulenköpfe auf der Kante. */
function cliffColumns(b0, base, rnd) {
  const [x0, z0, x1, z1] = b0.rect;
  const top = b0.top;
  const b = new Build();
  for (let x = x0 + 0.55; x < x1 - 0.4; x += 0.95) {
    const h = top - 1.2 - rnd.real(0, 2.4);
    hexColumn(b, x, Math.max(base, 0) - 0.2, z1 + 0.18, 0.52, h + 0.2, rnd.real(0, 1));
    if (rnd.frac() < 0.5) hexColumn(b, x + 0.45, top - 0.6, z1 - 0.35 - rnd.real(0, 0.6), 0.48, rnd.real(0.5, 1.4), rnd.real(0, 1));
  }
  for (const zz of [z0 + 0.6, z1 - 1.4]) for (let x = x0 + 0.8; x < x1 - 0.6; x += 2.6) if (rnd.frac() < 0.6) hexColumn(b, x + rnd.real(-0.4, 0.4), top - 0.4, zz + rnd.real(-0.3, 0.3), 0.5, rnd.real(0.6, 1.8), rnd.real(0, 1));
  return b.geometry();
}

/**
 * Lavabecken: Boden aus dunkler Kruste (bis top) und ein Krustenrand nur dort, wo kein anderer Block anschließt (Meer);
 * die leuchtende Lava (bei top + 0,3) zeichnet LavaLife als eine Fläche je Farbe.
 */
function basinParts(b, base, rnd, map, blue) {
  const [x0, z0, x1, z1] = b.rect;
  const top = b.top;
  const parts = [];
  const crust = blue ? [0x1c2240, 0x2a3458] : [0x3a1e1a, 0x5a2e22];
  const floor = colorize(new THREE.BoxGeometry(x1 - x0, top - base, z1 - z0), (p, n, o) => mixc(lin(crust[0]), lin(crust[1]), n.y > 0.5 ? 1 : 0.3, o));
  floor.translate((x0 + x1) / 2, (base + top) / 2, (z0 + z1) / 2);
  parts.push(floor);
  parts.push(...rimParts(b, map, rnd, blue ? [0x2a3048, 0x56607a] : [0x3a2a2e, 0x6a5254], 0.95));
  return parts;
}

/** Felsrand eines Beckens an den freien Seiten (kein Nachbarblock): Klötze mit unregelmäßiger Oberkante. */
function rimParts(b, map, rnd, cols, height) {
  const [x0, z0, x1, z1] = b.rect;
  const parts = [];
  const lo = lin(cols[0]), hi = lin(cols[1]);
  const free = (x, z) => !blockAt(map, x, z, b);
  const sides = [[x0, z0, x1, z0, 0, -1], [x0, z1, x1, z1, 0, 1], [x0, z0, x0, z1, -1, 0], [x1, z0, x1, z1, 1, 0]];
  for (const [ax, az, bx, bz, nx, nz] of sides) {
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 1.6));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, px = ax + (bx - ax) * t, pz = az + (bz - az) * t;
      if (!free(px + nx * 0.4, pz + nz * 0.4)) continue;
      const h = height + rnd.real(-0.12, 0.25);
      const g = new THREE.BoxGeometry(nx ? 0.9 : len / n + 0.25, h + 0.6, nz ? 0.9 : len / n + 0.25);
      const k = rnd.frac() * 0.12;
      colorize(g, (p, nn, o) => mixc(lo, hi, smooth(-0.2, 0.9, nn.y) * 0.8 + k, o));
      g.translate(px - nx * 0.25, h / 2 - 0.3 + 0.0, pz - nz * 0.25);
      parts.push(g);
    }
  }
  return parts;
}

/** Lagune: sandiger Grund, Felsrand, glänzendes Wasser (Material 'stone') bei top + 0,55. */
function lagoonParts(b, base, rnd, map) {
  const [x0, z0, x1, z1] = b.rect;
  const top = b.top;
  const parts = [];
  const floor = colorize(new THREE.BoxGeometry(x1 - x0, top - base, z1 - z0), (p, n, o) => mixc(lin(0x4a4446), lin(0x8a7a6a), n.y > 0.5 ? 1 : 0.2, o));
  floor.translate((x0 + x1) / 2, (base + top) / 2, (z0 + z1) / 2);
  parts.push(floor);
  parts.push(...rimParts(b, map, rnd, [0x3e3438, 0x6a5a5a], top + 1.0));
  const shallow = lin(0x5ad8d0), deep = lin(0x1f8aa8), foam = lin(0xd8fff8);
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

/** Niedrige Mauer aus Basaltblöcken mit Säulenstümpfen (entlang +X, Länge len). */
function basaltWallGeo(len, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  b.box(len, 0.5, 0.62, { v: (x, y, z, nx, ny) => mix(0x3e3238, 0x6a5658, ny * 0.5 + 0.5) }, { p: [0, 0.25, 0] }, 0);
  const n = Math.max(1, Math.round(len / 2.2));
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i + 0.5) * (len / n);
    hexColumn(b, x + rnd.real(-0.3, 0.3), 0, rnd.real(-0.08, 0.08), 0.34, rnd.real(0.75, 1.05), rnd.real(0, 1), 0x3e3238, 0x6a5658, 0x947c76);
  }
  return b.geometry();
}

/** Festungsmauer mit Zinnen (entlang +X): Mauer, Deckleiste, Zinnen im 1-m-Raster. */
function battlementGeo(len) {
  const b = new Build();
  const stone = { v: (x, y, z, nx, ny) => (ny > 0.6 ? 0x9a8a94 : mix(0x4e4452, 0x6e6272, (y + 0.1) / 0.8)) };
  b.box(len, 0.62, 0.42, stone, { p: [0, 0.31, 0] }, 0);
  b.box(len + 0.04, 0.08, 0.5, 0x8a7a86, { p: [0, 0.64, 0] }, 0);
  const n = Math.max(1, Math.round(len / 1.0));
  for (let i = 0; i < n; i++) if (i % 2 === 0 || n < 3) b.box(Math.min(0.5, len / n * 0.55), 0.36, 0.42, stone, { p: [-len / 2 + (i + 0.5) * (len / n), 0.86, 0] }, 0);
  return b.geometry();
}

/** Rand-Optik der Lava-Festung nach Art ('basaltwall', 'battlement'), sonst null. */
export function lavaEdgeGeo(kind, len, seed) {
  if (kind === 'basaltwall') return basaltWallGeo(len + 0.1, seed);
  if (kind === 'battlement') return battlementGeo(len);
  return null;
}

// ------------------------------------------------------------------ Requisiten

/** Gruppe sechseckiger Basaltsäulen (Fußpunkt im Ursprung), höchste Säule h. */
export function basaltGroupGeo(h = 2.6, seed = 1) {
  return cached(`w7m:basalt:${h.toFixed(2)}:${seed}`, () => {
    const b = new Build();
    const rnd = new Rnd(seed * 131 + 7);
    hexColumn(b, 0, 0, 0, 0.42, h, rnd.real(0, 1));
    const n = 4;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rnd.real(-0.3, 0.3), rr = rnd.real(0.62, 0.86);
      hexColumn(b, Math.cos(a) * rr, 0, Math.sin(a) * rr, rnd.real(0.3, 0.4), h * rnd.real(0.35, 0.8), rnd.real(0, 1));
    }
    return b.geometry();
  });
}
/** Glühende Fugen am Fuß einer Basaltgruppe. */
function basaltGlowGeo(color = 'rot') {
  return cached(`w7m:basaltglow:${color}`, () => {
    const b = new Build();
    const [ca, cb] = LAVA_GLOW[color] ?? LAVA_GLOW.rot;
    for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + 0.4; b.box(0.5, 0.03, 0.07, i % 2 ? ca : cb, { p: [Math.cos(a) * 1.05, 0.02, Math.sin(a) * 1.05], r: [0, -a + 0.6, 0] }, 0); }
    return b.geometry();
  });
}
/** Vulkanbrocken (klumpig, Glutadern in den Fugen), Ø ≈ 2·s. */
function volcRockGeo(s = 1, seed = 1) {
  return cached(`w7m:vrock:${s}:${seed}`, () => {
    const b = new Build();
    const rnd = new Rnd(seed * 17 + 3);
    for (const [px, py, pz, r] of [[0, 0.5, 0, 0.7], [0.62, 0.36, 0.22, 0.5], [-0.5, 0.32, -0.2, 0.46], [0.15, 0.9, 0.1, 0.42]]) {
      b.add(new THREE.DodecahedronGeometry(r * s, 0), (qx, qy, qz, nx, ny) => (ny < -0.2 && Math.abs(nx) > 0.5 ? 0xff8a2a : mix(0x3e3036, 0x7a666a, ny * 0.5 + 0.5)), { p: [px * s, py * s, pz * s], r: [rnd.real(0, 3), rnd.real(0, 3), 0], s: [1.1, 0.85, 1] });
    }
    return b.geometry();
  });
}
/** Zackige Basaltnadel (aufgestapelte, schmaler werdende Sechskantsäulen), Höhe h. */
function spireGeo(h = 6, seed = 1) {
  return cached(`w7m:spire:${h}:${seed}`, () => {
    const b = new Build();
    const rnd = new Rnd(seed * 29 + 5);
    let y = 0, r = h * 0.16;
    const n = 4;
    for (let i = 0; i < n; i++) {
      const hh = (h / n) * rnd.real(0.85, 1.15);
      hexColumn(b, rnd.real(-0.1, 0.1) * r, y, rnd.real(-0.1, 0.1) * r, r, hh, rnd.real(0, 1), 0x3a2e34, 0x5e4c52, 0x7a6664);
      if (i < 2) hexColumn(b, r * 0.9, y, r * 0.3, r * 0.5, hh * 0.8, rnd.real(0, 1), 0x3a2e34, 0x5e4c52, 0x7a6664);
      y += hh * 0.92; r *= 0.74;
    }
    return b.geometry();
  });
}
/** Feuerlilien-Beet: dunkle Blätter, rot-orange-gelbe Blüten (area [w, d]). */
function lavaFlowerGeo(area = [4, 1.4], seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed * 7 + 11);
  const [w, d] = area;
  const n = Math.max(4, Math.round(w * d * 2.2));
  const cols = [0xff4a2a, 0xff8a1a, 0xffc82a, 0xff5a7a];
  for (let i = 0; i < n; i++) {
    const x = rnd.real(-w / 2, w / 2), z = rnd.real(-d / 2, d / 2), h = rnd.real(0.25, 0.45);
    b.cone(0.07, h, 0x3a6a3a, { p: [x, h / 2, z] }, 4);
    b.cone(0.16, 0.22, cols[i % cols.length], { p: [x, h + 0.05, z], r: [Math.PI, 0, 0] }, 5);
  }
  return b.geometry();
}
/** Glutbeerenbusch: dunkelgrüner, runder Busch (Beeren liefert emberBerryGeo). */
function emberBushGeo(s = 0.8, toneI = 0) {
  return cached(`w7m:emberbush:${s}:${toneI}`, () => {
    const b = new Build();
    const [L, D] = toneI ? [0x5a8a5a, 0x2a4a3a] : [0x6a9a4a, 0x2e4e2e];
    for (const [x, y, z, r] of [[0, 0.55, 0, 1], [-0.7, 0.4, 0.2, 0.75], [0.65, 0.42, -0.15, 0.7]]) b.sphere(r * s, { v: (px, py, pz, nx, ny) => mix(D, L, ny * 0.5 + 0.5) }, { p: [x * s, y * s, z * s] }, 8, 6);
    return b.geometry();
  });
}
function emberBerryGeo(s = 0.8) {
  return cached(`w7m:emberberry:${s}`, () => {
    const b = new Build();
    for (let i = 0; i < 9; i++) { const a = i * 2.39; b.sphere(0.07 * s / 0.8, i % 3 ? 0xff7a2a : 0xffc23a, { p: [Math.cos(a) * 0.72 * s, (0.5 + (i % 3) * 0.18) * s, Math.sin(a) * 0.6 * s + 0.25 * s] }, 5, 3); }
    return b.geometry();
  });
}
function cratesGeo() {
  return cached('w7m:crates', () => {
    const b = new Build();
    const wood = { v: (x, y, z, nx, ny) => mix(0x7a4a2a, 0xa8703e, ny * 0.4 + 0.5) };
    for (const [x, y, z, s, r] of [[0, 0, 0, 1, 0.1], [1.05, 0, 0.15, 0.85, -0.2], [0.4, 1, 0.05, 0.8, 0.3]]) {
      b.box(s, s, s, wood, { p: [x, y + s / 2, z], r: [0, r, 0] }, 0.04);
      b.box(s + 0.04, 0.1, s + 0.04, 0x4a4450, { p: [x, y + s * 0.8, z], r: [0, r, 0] }, 0);
      b.box(s * 0.36, s * 0.36, 0.02, 0xc8303a, { p: [x + Math.sin(r) * (s / 2 + 0.01), y + s * 0.45, z + Math.cos(r) * (s / 2 + 0.01)], r: [0, r, Math.PI / 4] }, 0);
    }
    return b.geometry();
  });
}
function barrelsGeo() {
  return cached('w7m:barrels', () => {
    const b = new Build();
    for (const [x, z] of [[0, 0], [0.82, 0.32], [-0.4, 0.75]]) {
      b.cyl(0.38, 0.38, 0.95, { v: (px, py, pz, nx, ny) => (ny > 0.6 ? 0x6a4428 : mix(0x5a3420, 0x8a5a34, 0.5 + nx * 0.3)) }, { p: [x, 0.47, z] }, 10);
      for (const y of [0.18, 0.78]) b.torus(0.39, 0.03, 0x3a3a44, { p: [x, y, z], r: [Math.PI / 2, 0, 0] }, 3, 12);
    }
    b.sphere(0.12, 0xffc23a, { p: [0, 1.0, 0] }, 6, 4);
    return b.geometry();
  });
}
function cannonGeo() {
  return cached('w7m:cannon', () => {
    const b = new Build();
    b.box(1.2, 0.36, 0.8, 0x9a2a2a, { p: [0, 0.36, 0] }, 0.05);
    for (const s of [-1, 1]) { b.cyl(0.32, 0.32, 0.1, 0x3a2a24, { p: [-0.2, 0.32, s * 0.45], r: [Math.PI / 2, 0, 0] }, 10); b.cyl(0.1, 0.1, 0.12, 0xffc23a, { p: [-0.2, 0.32, s * 0.5], r: [Math.PI / 2, 0, 0] }, 6); }
    b.cyl(0.2, 0.26, 1.5, { v: (px, py, pz, nx, ny) => mix(0x1e1e26, 0x4a4a56, ny * 0.5 + 0.5) }, { p: [0.25, 0.72, 0], r: [0, 0, -Math.PI / 2 + 0.22] }, 10);
    b.torus(0.22, 0.05, 0xffc23a, { p: [0.95, 0.88, 0], r: [0, Math.PI / 2, 0.22] }, 3, 10);
    return b.geometry();
  });
}
function tiresGeo() {
  return cached('w7m:tires', () => {
    const b = new Build();
    for (let i = 0; i < 3; i++) b.torus(0.42, 0.17, i % 2 ? 0xe8303a : 0xf4f4f8, { p: [0, 0.17 + i * 0.32, 0], r: [Math.PI / 2, 0, i * 0.4] }, 5, 12);
    return b.geometry();
  });
}
function gearsGeo() {
  return cached('w7m:gears', () => {
    const b = new Build();
    b.parts.push(place(gearGeo(0.9, 0.24, 0xc8903a, 10).rotateX(-Math.PI / 2 + 0.1), 0, 0.15, 0));
    b.parts.push(place(gearGeo(0.6, 0.2, 0x9a9aaa, 8).rotateX(-Math.PI / 2 - 0.15), 0.9, 0.35, 0.4));
    b.parts.push(place(gearGeo(0.5, 0.2, 0xd8a040, 8).rotateZ(0.3), -0.6, 0.55, 0.5));
    return b.geometry();
  });
}
function shellsGeo(seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed * 3 + 1);
  for (let i = 0; i < 6; i++) {
    const x = rnd.real(-1, 1), z = rnd.real(-0.6, 0.6);
    if (i % 3 === 0) for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; b.cone(0.07, 0.22, 0xff8a5a, { p: [x + Math.cos(a) * 0.1, 0.03, z + Math.sin(a) * 0.1], r: [Math.PI / 2, 0, -a + Math.PI / 2] }, 4); }
    else b.sphere(0.12, i % 2 ? 0xf4c8d8 : 0xf8e8d0, { p: [x, 0.04, z], s: [1, 0.45, 1.2] }, 6, 4);
  }
  return b.geometry();
}

/** Requisite der Lava-Festung (map.props: kind …7), sonst null. Fußpunkt im Ursprung. */
export function lavaPropGeo(it, seed) {
  const s = it.size;
  switch (it.kind) {
    case 'basalt7': return basaltGroupGeo(s ?? 2.6, it.seed ?? 1).clone();
    case 'vrock7': return volcRockGeo(s ?? 1, it.seed ?? 1).clone();
    case 'spire7': return spireGeo(s ?? 6, it.seed ?? Math.round(seed % 97)).clone();
    case 'lavaflower7': return lavaFlowerGeo(it.area ?? [4, 1.4], seed);
    case 'emberbush7': return emberBushGeo(s ?? 0.8, it.tone ?? 0).clone();
    case 'crates7': return cratesGeo().clone();
    case 'barrels7': return barrelsGeo().clone();
    case 'cannon7': return cannonGeo().clone();
    case 'tires7': return tiresGeo().clone();
    case 'gears7': return gearsGeo().clone();
    case 'shells7': return shellsGeo(seed);
    default: return null;
  }
}
/** Leuchtende Teile einer Requisite (Material 'glow'), sonst null. */
export function lavaPropGlow(it) {
  switch (it.kind) {
    case 'emberbush7': return emberBerryGeo(it.size ?? 0.8).clone();
    case 'basalt7': return basaltGlowGeo(it.glow ?? 'rot').clone();
    default: return null;
  }
}
/** Kollisionsform einer Requisite (Weltkoordinaten), sonst null. */
export function lavaPropShape(it) {
  const [x, y, z] = it.pos, s = it.size ?? 1;
  switch (it.kind) {
    case 'basalt7': return { type: 'cyl', x, z, r: 0.95, y0: y - 0.2, y1: y + (s ?? 2.6), tag: 'basalt' };
    case 'vrock7': return { type: 'cyl', x, z, r: 0.9 * s, y0: y - 0.2, y1: y + 1.2 * s, tag: 'fels' };
    case 'emberbush7': return { type: 'cyl', x, z, r: 0.9 * s, y0: y, y1: y + 1.1 * s, tag: 'busch' };
    case 'crates7': return { type: 'box', min: [x - 0.6, y, z - 0.6], max: [x + 1.6, y + 1.8, z + 0.8], tag: 'kisten' };
    case 'barrels7': return { type: 'cyl', x: x + 0.15, z: z + 0.35, r: 1.0, y0: y, y1: y + 1.1, tag: 'faesser' };
    case 'cannon7': return { type: 'cyl', x, z, r: 0.85, y0: y, y1: y + 1.1, tag: 'kanone' };
    case 'tires7': return { type: 'cyl', x, z, r: 0.6, y0: y, y1: y + 1.0, tag: 'reifen' };
    case 'gears7': return { type: 'cyl', x: x + 0.2, z: z + 0.2, r: 1.2, y0: y, y1: y + 1.0, tag: 'zahnraeder' };
    case 'spire7': return { type: 'cyl', x, z, r: (it.size ?? 6) * 0.16, y0: y - 1, y1: y + (it.size ?? 6), tag: 'felsnadel' };
    default: return null;
  }
}
/**
 * Registry-Kulisse für Requisiten der Lava-Festung (Welt-7-Modelle, models/kinds/props_festung_w7.js):
 * [Name, Optionen, yaw-Korrektur, Maßstab] oder null – fehlt das Modell, zeichnet lavaPropGeo eigene Geometrie.
 */
export function lavaPropModel(it) {
  const pm = it.kind === 'basalt7' ? ['basaltsaeule', { height: it.size ?? 2.6, radius: 0.9, count: 5, seed: it.seed ?? 1, glow: false }, 0, 1]   // Glutfugen (320 Dreiecke) spart die Karte
    : it.kind === 'vrock7' ? ['vulkanfels', { kind: 'brocken', size: 2 * (it.size ?? 1), seed: it.seed ?? 1 }, 0, 1] : null;
  if (pm && hasModel(pm[0])) W7_USED.add(pm[0]);
  return pm;
}

/**
 * Streudeko auf nicht begehbaren Blöcken (deterministisch): Basaltsäulen-Gruppen, Vulkanbrocken, Glutbeerenbüsche und
 * Feuerlilien auf Fels und Kraterboden; Becken, Lagune, Wand und noDeco bleiben frei.
 */
export function scatterLava(level, map, grid) {
  const parts = [], glow = [];
  map.ground.forEach((b, i) => {
    const style = b.style ?? 'ash';
    if (b.walk || b.noDeco || ['basin', 'bluebasin', 'lagoon', 'cliff', 'blacksand'].includes(style)) return;
    const [x0, z0, x1, z1] = b.rect;
    const w = x1 - x0, d = z1 - z0;
    if (w < 2.5 || d < 2.5) return;
    if (grid.isWalk((x0 + x1) / 2, (z0 + z1) / 2)) return;
    const rnd = new Rnd(0x1a7a + i * 131);
    const pts = [];
    const tooClose = (x, z, r) => pts.some((p) => Math.hypot(p[0] - x, p[1] - z) < r);
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
    put(Math.max(1, Math.floor(area / 40)), 2.6, (x, z, r) => {
      const h = r.real(1.4, 2.8);
      parts.push(place(basaltGroupGeo(+h.toFixed(1), r.int(1, 6)).clone(), x, y, z, r.real(0, 6)));
      if (r.frac() < 0.5) glow.push(place(basaltGlowGeo().clone(), x, y, z, r.real(0, 6)));
    });
    put(Math.floor(area / 70), 2, (x, z, r) => parts.push(place(volcRockGeo(+r.real(0.5, 0.9).toFixed(1), r.int(1, 5)).clone(), x, y, z, r.real(0, 6))));
    put(Math.floor(area / 60), 1.6, (x, z, r) => {
      const s = +r.real(0.6, 0.9).toFixed(1);
      parts.push(place(emberBushGeo(s, r.int(0, 1)).clone(), x, y, z, r.real(0, 6)));
      glow.push(place(emberBerryGeo(s).clone(), x, y, z, r.real(0, 6)));
    });
    if (style === 'crater' || style === 'rock') put(Math.floor(area / 90), 1.4, (x, z, r) => parts.push(place(lavaFlowerGeo([1.4, 1], r.int(1, 99)), x, y, z, 0)));
  });
  for (const g of parts) level.view?.addStatic(g, { castShadow: true });
  for (const g of glow) level.view?.addStatic(g, { material: 'glow', castShadow: false, tile: 'w7:leuchten' });
}

// ------------------------------------------------------------------ Brücken (Weltdaten segments)

/** Brücke in lokalen Koordinaten (x entlang, y oben, z quer) bauen und an from/to setzen. */
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

/** Basaltbrücke: Deck aus Sechseckplatten, Brüstung mit Zinnen, Stützpfeiler in der Lava, Laternen an den Enden. */
function buildBasaltBridge(level, spec) {
  buildBridge({ world: level.world, view: null }, { ...spec, rails: false });
  if (!level.view) return;
  const { a, c, L, dy, pitch, Ld, w } = spanOf(spec);
  const b = new Build();
  b.box(Ld + 0.2, 0.45, w + 0.4, { v: (x, y, z, nx, ny) => (ny > 0.6 ? 0x8a7468 : mix(0x3e3238, 0x5e4c52, ny * 0.5 + 0.5)) }, { p: [L / 2, dy / 2 - 0.24, 0], r: [0, 0, pitch] }, 0);
  const n = Math.max(2, Math.round(Ld / 1.1));
  for (let i = 0; i < n; i++) {
    const u = ((i + 0.5) / n) * Ld, [px, py] = at(u, pitch);
    for (const s of [-1, 0, 1]) b.cyl(0.62, 0.62, 0.05, i % 2 ? 0x9a8274 : 0x8a7266, { p: [px, py + 0.01, s * 1.1 + (i % 2 ? 0.55 : 0)], r: [0, 0.5, 0] }, 6);
  }
  for (const s of [-1, 1]) {
    b.box(Ld + 0.2, 0.55, 0.34, { v: (x, y, z, nx, ny) => (ny > 0.6 ? 0x9a8a94 : mix(0x4e4452, 0x6e6272, 0.6)) }, { p: [L / 2, dy / 2 + 0.27, s * (w / 2 + 0.05)], r: [0, 0, pitch] }, 0);
    const m = Math.max(2, Math.round(Ld / 1.2));
    for (let i = 0; i < m; i += 2) { const u = ((i + 0.5) / m) * Ld, [px, py] = at(u, pitch); b.box(0.42, 0.34, 0.36, 0x6e6272, { p: [px, py + 0.72, s * (w / 2 + 0.05)], r: [0, 0, pitch] }, 0); }
  }
  // Stützpfeiler (unten in der Lava/im Meer)
  const np = Math.max(1, Math.round(Ld / 7));
  for (let i = 1; i <= np; i++) {
    const u = (i / (np + 1)) * Ld, [px, py] = at(u, pitch);
    b.box(1.4, py + a[1] + 0.6, w * 0.8, { v: (x, y, z, nx, ny) => mix(0x3a2e34, 0x5a484e, (y + 3) / 6) }, { p: [px, (py - a[1] - 0.6) / 2 - 0.25, 0] }, 0);
  }
  level.view.addStatic(placeAlong(b.geometry(), a, c), { castShadow: true });
  // Laternen an den Enden (Pfosten + leuchtende Kappe)
  const lp = new Build(), lg = new Build();
  for (const u of [0.3, Ld - 0.3]) for (const s of [-1, 1]) {
    const [px, py] = at(u, pitch);
    lp.cyl(0.08, 0.1, 1.4, 0x2e2a34, { p: [px, py + 0.7 + 0.55, s * (w / 2 + 0.05)] }, 5);
    lp.cone(0.26, 0.24, 0x2e2a34, { p: [px, py + 2.32, s * (w / 2 + 0.05)] }, 6);
    lg.box(0.26, 0.3, 0.26, 0xffb44a, { p: [px, py + 2.05, s * (w / 2 + 0.05)] }, 0);
  }
  level.view.addStatic(placeAlong(lp.geometry(), a, c), { castShadow: true });
  level.view.addStatic(placeAlong(lg.geometry(), a, c), { material: 'glow', castShadow: false, tile: 'w7:leuchten' });
}

/** Kettensteg: Bohlen mit Eisenbändern, Eisenpfosten mit Goldkappen, durchhängende Ketten als Geländer. */
function buildChainBridge(level, spec) {
  buildBridge({ world: level.world, view: null }, { ...spec, rails: false });
  if (!level.view) return;
  const { a, c, L, dy, pitch, Ld, w } = spanOf(spec);
  const b = new Build();
  const np = Math.max(2, Math.round(Ld / 0.55));
  for (let i = 0; i < np; i++) {
    const u = ((i + 0.5) / np) * Ld, [px, py] = at(u, pitch);
    b.box(Ld / np - 0.06, 0.16, w, i % 2 ? 0x8a5a36 : 0x9a6a40, { p: [px, py - 0.08, 0], r: [0, 0, pitch] }, 0);
  }
  for (const s of [-1, 1]) b.box(Ld + 0.1, 0.1, 0.16, 0x3a3a46, { p: [L / 2, dy / 2 - 0.02, s * (w / 2 - 0.2)], r: [0, 0, pitch] }, 0);
  const nP = Math.max(2, Math.round(Ld / 2.6) + 1);
  for (const s of [-1, 1]) {
    for (let i = 0; i < nP; i++) {
      const u = (i / (nP - 1)) * Ld, [px, py] = at(u, pitch);
      b.box(0.16, 1.2, 0.16, 0x3a3a46, { p: [px, py + 0.6, s * (w / 2 + 0.02)] }, 0);
      b.sphere(0.12, 0xffc23a, { p: [px, py + 1.26, s * (w / 2 + 0.02)] }, 5, 3);
      if (i < nP - 1) {
        // durchhängende Kette zum nächsten Pfosten (vier gerade Glieder je Feld)
        const u2 = ((i + 1) / (nP - 1)) * Ld, [qx, qy] = at(u2, pitch), k = 4;
        const cp = (t) => [px + (qx - px) * t, py + (qy - py) * t + 1.05 - Math.sin(t * Math.PI) * 0.3];
        for (let j = 0; j < k; j++) {
          const [ax2, ay2] = cp(j / k), [bx2, by2] = cp((j + 1) / k);
          b.box(Math.hypot(bx2 - ax2, by2 - ay2), 0.07, 0.07, 0x5a5a66, { p: [(ax2 + bx2) / 2, (ay2 + by2) / 2, s * (w / 2 + 0.02)], r: [0, 0, Math.atan2(by2 - ay2, bx2 - ax2)] }, 0);
        }
      }
    }
  }
  level.view.addStatic(placeAlong(b.geometry(), a, c), { castShadow: true });
}

/** Basaltdamm: Sechskant-Säulenköpfe als Weg, Säulen fallen zu beiden Seiten ins Wasser ab. */
function buildCauseway(level, spec) {
  buildBridge({ world: level.world, view: null }, { ...spec, rails: false });
  if (!level.view) return;
  const { a, c, L, dy, pitch, Ld, w } = spanOf(spec);
  const rnd = new Rnd(Math.round(L * 13 + a[2]));
  const b = new Build();
  b.box(Ld + 0.2, 0.3, w, 0x6a5a5c, { p: [L / 2, dy / 2 - 0.16, 0], r: [0, 0, pitch] }, 0);
  // Säulen nur so tief wie nötig (unter dem Wasser unsichtbar), ohne Bodenfläche
  for (let u = 0.6; u < Ld; u += 1.2) {
    const [px, py] = at(u, pitch);
    const row = Math.round(u / 1.2);
    for (let k = -2; k <= 1; k++) {
      const z = (k + 0.5) * 1.05 + (row % 2 ? 0.26 : -0.26);
      const inside = Math.abs(z) < w / 2 - 0.3;
      const h = inside ? 0.05 : rnd.real(-1.2, -0.3);
      const bottom = 0.8 - a[1];   // Weltunterkante 0,8 m: unter dem Wasser bzw. im Fels
      const H = py + h - bottom;
      hexColumn(b, px, bottom, z, 0.6, H, rnd.real(0, 1), 0x3a2e34, 0x5e4c52, inside ? (row % 2 ? 0x9a8478 : 0x8a7468) : 0x6e5c5e, false);
    }
  }
  level.view.addStatic(placeAlong(b.geometry(), a, c), { castShadow: true });
}

/** Zugbrücke: Bohlen mit Eisenbändern, zwei Ketten zu einem Torhäuschen am Ende (to), Goldkanten. */
function buildDrawbridge(level, spec) {
  buildBridge({ world: level.world, view: null }, { ...spec, rails: false });
  if (!level.view) return;
  const { a, c, L, dy, pitch, Ld, w } = spanOf(spec);
  const b = new Build();
  const np = Math.max(2, Math.round(Ld / 0.5));
  for (let i = 0; i < np; i++) {
    const u = ((i + 0.5) / np) * Ld, [px, py] = at(u, pitch);
    b.box(Ld / np - 0.05, 0.22, w, i % 2 ? 0x7a4a2a : 0x8a5630, { p: [px, py - 0.11, 0], r: [0, 0, pitch] }, 0);
  }
  for (const f of [0.2, 0.5, 0.8]) { const [px, py] = at(f * Ld, pitch); b.box(0.2, 0.05, w + 0.1, 0x3a3a46, { p: [px, py + 0.02, 0] }, 0); }
  for (const s of [-1, 1]) b.box(Ld + 0.1, 0.12, 0.14, 0xffc23a, { p: [L / 2, dy / 2 + 0.02, s * (w / 2 + 0.02)], r: [0, 0, pitch] }, 0);
  // Torhäuschen (zwei Türmchen mit roten Dächern) am Ende, Ketten vom Deck zu den Türmen
  for (const s of [-1, 1]) {
    b.cyl(0.9, 1.0, 4.6, { v: (x, y, z, nx, ny) => mix(0x4a3e46, 0x6e5e66, (y + 2.3) / 4.6) }, { p: [L + 0.6, dy + 2.3, s * (w / 2 + 1.0)] }, 10);
    b.cone(1.15, 1.6, 0xc4304e, { p: [L + 0.6, dy + 5.4, s * (w / 2 + 1.0)] }, 10);
    const [px, py] = at(Ld * 0.35, pitch);
    const p0 = [px, py + 0.1, s * (w / 2 - 0.1)], p1 = [L + 0.3, dy + 3.8, s * (w / 2 + 0.5)];
    for (let j = 0; j <= 10; j++) { const t = j / 10; b.torus(0.08, 0.025, 0x5a5a66, { p: [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t - Math.sin(t * Math.PI) * 0.25, p0[2] + (p1[2] - p0[2]) * t], r: [0, j % 2 ? 0 : Math.PI / 2, 0.6] }, 3, 6); }
  }
  b.box(0.6, 0.8, w + 2.8, { v: (x, y, z, nx, ny) => mix(0x4a3e46, 0x6e5e66, 0.6) }, { p: [L + 0.6, dy + 4.6, 0] }, 0);
  level.view.addStatic(placeAlong(b.geometry(), a, c), { castShadow: true });
  for (const s of [-1, 1]) {
    const tx = c[0] + (c[0] - a[0]) / Math.max(1e-6, L) * 0.6, tz = c[2] + (c[2] - a[2]) / Math.max(1e-6, L) * 0.6;
    const nx = -(c[2] - a[2]) / Math.max(1e-6, L), nz = (c[0] - a[0]) / Math.max(1e-6, L);
    level.world.add({ type: 'cyl', x: tx + nx * s * (w / 2 + 1.0), z: tz + nz * s * (w / 2 + 1.0), r: 1.0, y0: c[1] - 0.5, y1: c[1] + 5, tag: 'torhaus' });
  }
}

/** Welt-7-Brücke bauen (segments); false = unbekannte Art. */
export function buildLavaSegment(level, seg) {
  switch (seg.type) {
    case 'basaltbridge': buildBasaltBridge(level, seg); return true;
    case 'chainbridge': buildChainBridge(level, seg); return true;
    case 'causeway': buildCauseway(level, seg); return true;
    case 'drawbridge': buildDrawbridge(level, seg); return true;
    default: return false;
  }
}

// ------------------------------------------------------------------ Inselchen, Nachbarwelt, Hintergrund

/** Kleine Vulkaninsel im Meer: schwarzer Fels, Basaltsäulen oder ein rauchender Mini-Kegel mit Glut. */
export function lavaIsletParts(x, z, w, d, top, rnd) {
  const parts = [];
  const g = roundedBox(w, top + 2, d, 0.5, SIDE.ALL, SIDE.NY, 1);
  colorize(g, (p, n, o) => mixc(lin(0x2e2428), lin(0x5e4c50), smooth(-0.3, 0.9, n.y), o));
  g.translate(x, (top - 2) / 2, z);
  parts.push(g);
  const k = rnd.frac();
  if (k < 0.5) parts.push(place(basaltGroupGeo(+rnd.real(1.6, 3).toFixed(1), rnd.int(1, 6)).clone(), x, top, z, rnd.real(0, 6)));
  else {
    const b = new Build();
    b.cone(Math.min(w, d) * 0.38, 2.4, { v: (px, py) => mix(0x3a2e32, 0x6a5458, py / 2.4 + 0.5) }, { p: [x, top + 1.2, z] }, 9);
    b.cyl(0.5, 0.5, 0.06, 0xff8a2a, { p: [x, top + 2.42, z] }, 8);
    parts.push(b.geometry());
  }
  return parts;
}

/** Ferne Nachbarwelt 'erzpark' (Welt 8: dunkles Land mit hohem Turm, Riesenrad und bunten Lichtern), ein Mesh. */
export function lavaNeighborParts(nb, rnd) {
  const [x, z] = nb.pos;
  const [w, d] = nb.size ?? [90, 60];
  if (nb.style !== 'erzpark') return [];
  const B = new Build();
  B.box(w, 8, d, { v: (px, py, pz, nx, ny) => mix(0x2a2236, 0x4a3a56, ny * 0.5 + 0.5) }, { p: [x, 0, z] }, 0);
  B.box(w * 0.5, 6, d * 0.5, 0x3a2e48, { p: [x - w * 0.1, 6, z - d * 0.1] }, 0);
  // hoher Turm mit Spitze
  B.cyl(4, 5.5, 34, { v: (px, py) => mix(0x3a2a40, 0x5a4460, py / 34 + 0.5) }, { p: [x - w * 0.12, 26, z - d * 0.15] }, 10);
  B.cone(6, 12, 0x8a1a3a, { p: [x - w * 0.12, 49, z - d * 0.15] }, 10);
  for (let i = 0; i < 5; i++) B.box(1.2, 1.6, 0.4, 0xffc23a, { p: [x - w * 0.12 + Math.cos(i) * 4.4, 16 + i * 5, z - d * 0.15 + 4.6] }, 0);
  // Riesenrad
  const rx = x + w * 0.22, ry = 22, rz = z;
  B.torus(12, 0.6, 0xd84a6a, { p: [rx, ry, rz] }, 4, 24);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; B.box(0.4, 24, 0.4, 0xf0d0e0, { p: [rx, ry, rz], r: [0, 0, a] }, 0); B.box(1.6, 1.4, 1.2, [0xffc23a, 0x5ad8ff, 0x8aff7a, 0xff7ab4][i % 4], { p: [rx + Math.cos(a) * 12, ry + Math.sin(a) * 12 - 1, rz] }, 0); }
  for (const s of [-1, 1]) B.box(0.8, 26, 0.8, 0x4a3a56, { p: [rx + s * 6, 9, rz], r: [0, 0, s * 0.25] }, 0);
  // Achterbahn-Bogen
  for (let i = 0; i < 9; i++) { const t = i / 8; B.box(5, 0.6, 1, 0xff9a2a, { p: [x - w * 0.35 + t * 20, 8 + Math.sin(t * Math.PI) * 10, z + d * 0.25], r: [0, 0, Math.cos(t * Math.PI) * 0.7] }, 0); }
  const g = B.geometry();
  void rnd;
  return [g];
}

/**
 * Hintergrund des Themas map_lava (unbeleuchtet, ein Mesh): großer Vulkan hinter der Insel mit glühendem Krater,
 * Lavaströmen und Rauchsäule, ringsum ferne violette Bergketten und kleine Vulkane.
 */
export function lavaBackdrop(sky, bounds, rnd) {
  const parts = [];
  const x0 = bounds.min.x, x1 = bounds.max.x, z0 = bounds.min.z, z1 = bounds.max.z;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  // großer Vulkan (Profil mit hohlen Flanken), Krater-Glut
  const VX = cx - 30, VZ = z0 - 66, R = 74, H = 62, rTop = 13;
  const prof = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10; prof.push(new THREE.Vector2(rTop + (R - rTop) * Math.pow(t, 1.5), -4 + H * (1 - t))); }
  prof.reverse();
  const cone = new THREE.LatheGeometry(prof, 28);
  cone.translate(VX, 0, VZ);
  const lo = lin(0x3a2834), mid = lin(0x5e3e48), hiC = lin(0x8a5a5a), glow = lin(0xff8a3a);
  parts.push(colorize(cone, (p, n, o) => {
    const h = (p.y + 4) / H;
    mixc(lo, mid, smooth(0, 0.7, h), o);
    mixc(o, hiC, Math.max(0, n.x * -0.4 + n.z * 0.3) * 0.6, o);
    if (h > 0.94) mixc(o, glow, smooth(0.94, 1, h) * 0.8, o);
  }));
  const crater = new THREE.CylinderGeometry(rTop * 0.9, rTop * 0.9, 0.5, 20);
  crater.translate(VX, H - 4.6, VZ);
  parts.push(colorize(crater, (p, n, o) => mixc(lin(0xffd24a), lin(0xff6a1a), 0.4, o)));
  // Lavaströme an der Vorderseite (helle Bänder vom Kraterrand hinab)
  for (let k = 0; k < 5; k++) {
    const a0 = Math.PI / 2 + (k - 2) * 0.32 + rnd.real(-0.08, 0.08);
    const pos = [];
    const N = 14;
    const ptAt = (t, side) => {
      const r = rTop + (R - rTop) * Math.pow(t, 1.5) + 0.8;
      const y = -4 + H * (1 - t) + 0.4;
      const a = a0 + Math.sin(t * 5 + k) * 0.08 + side * (0.012 + t * 0.02);
      return [VX + Math.cos(a) * r, y, VZ + Math.sin(a) * r];
    };
    for (let i = 0; i < N; i++) {
      const ta = i / N, tb = (i + 1) / N;
      const A = ptAt(ta, -1), B2 = ptAt(ta, 1), C = ptAt(tb, 1), D = ptAt(tb, -1);
      pos.push(...A, ...C, ...B2, ...A, ...D, ...C);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    parts.push(colorize(g, (p, n, o) => mixc(lin(0xffe060), lin(0xff5a1a), smooth(H, 0, p.y), o)));
  }
  // Rauchsäule über dem Krater
  for (let k = 0; k < 7; k++) {
    const s = new THREE.SphereGeometry(1, 10, 7);
    const r = 9 + k * 3.2;
    s.scale(r, r * 0.8, r);
    s.translate(VX + k * 5 + rnd.real(-2, 2), H + 4 + k * 9, VZ + k * 2);
    parts.push(colorize(s, (p, n, o) => mixc(lin(0x6a5a6e), lin(0xc8b0b4), smooth(-0.7, 0.8, n.y), o)));
  }
  // ferne Bergketten ringsum (violett) und kleine Vulkane mit Glutspitze
  const Rr = Math.max(x1 - x0, z1 - z0) / 2 + 170;
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * TAU + rnd.real(-0.06, 0.06);
    const r = Rr + rnd.real(-20, 40);
    const bx = cx + Math.cos(a) * r, bz = cz + Math.sin(a) * r;
    const h = rnd.real(24, 52), rad = rnd.real(28, 46);
    const g = new THREE.ConeGeometry(rad, h, 9, 1);
    g.translate(bx, h / 2 - 6, bz);
    const volc = i % 5 === 2;
    parts.push(colorize(g, (p, n, o) => { mixc(lin(0x5a4068), lin(0x8a6a8a), smooth(-6, h, p.y) * 0.8, o); if (volc && p.y > h - 8) mixc(o, lin(0xff8a4a), 0.7, o); }));
  }
  for (const p of parts) for (const k of Object.keys(p.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') p.deleteAttribute(k);
  const g = merge(parts);
  if (!g) return;
  const mesh = new THREE.Mesh(sky.track(g), sky.track(new THREE.MeshBasicMaterial({ vertexColors: true, fog: true })));
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  mesh.name = 'w7:vulkan';
  sky.group.add(mesh);
}

// ------------------------------------------------------------------ Taktuhr

/** Tempo der Kartenmusik (Ersatzuhr, falls keine Musik läuft). */
let mapBpm = 0;
export const MAP_BPM7 = () => mapBpm || (mapBpm = music.themeInfo?.('course_world7_map')?.bpm ?? music.themeInfo?.('course_map')?.bpm ?? 120);
/** Taktuhr: Zählzeit aus music.beat() (Kartenmusik), sonst aus der Bildzeit im Tempo der Kartenmusik. */
export function beatNow7(t) {
  const mb = music.beat();
  const useMusic = mb.bpm > 0 && mb.playing;
  return { beat: useMusic ? mb.beat : (t * MAP_BPM7()) / 60, source: useMusic ? mb.source : 'zeit', theme: mb.theme ?? null, bpm: useMusic ? mb.bpm : MAP_BPM7() };
}
/** Fontänen-Hüllkurve je Zählzeit: schießt in den ersten 14 % hoch, fällt bis 75 % zurück. */
export function fountainEnvelope(frac) {
  if (frac < 0.14) { const e = frac / 0.14; return e * e * (3 - 2 * e); }
  const f = Math.max(0, 1 - (frac - 0.14) / 0.61);
  return f * f;
}

// ------------------------------------------------------------------ Lebendige Kulisse

const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
const COL = { rot: new THREE.Color(0xff8a2a), blau: new THREE.Color(0x5ac8ff) };
function setI(m, i, x, y, z, ry = 0, s = 1, rx = 0, rz = 0) {
  _e.set(rx, ry, rz, 'YXZ');
  _q.setFromEuler(_e);
  if (Array.isArray(s)) _s.set(s[0], s[1], s[2]); else _s.setScalar(s);
  _m4.compose(_p.set(x, y, z), _q, _s);
  m.setMatrixAt(i, _m4);
}

/** Lava-Textur (Kacheln 128 px): helle Grundglut, gelb-weiße Fließadern, wenige dünne Krustenschollen mit Glutrand. */
function lavaTexture(kind) {
  const blue = kind === 'blau';
  return canvasTexture(`w7:lava:${kind}`, 128, 128, (ctx, w, h) => {
    const C = blue
      ? { base: '#3a94ff', mid: '#6ac8ff', hot: '#d8fbff', vein: 'rgba(224,252,255,0.5)', crust: '#2a62d8', crust2: '#3472e4' }
      : { base: '#ff6a18', mid: '#ff9a2a', hot: '#fff0a0', vein: 'rgba(255,230,130,0.5)', crust: '#b8401a', crust2: '#cc5420' };
    ctx.fillStyle = C.base; ctx.fillRect(0, 0, w, h);
    const R = new Rnd(blue ? 77 : 33);
    const wrap = (fn) => { for (const [dx, dy] of [[0, 0], [-w, 0], [w, 0], [0, -h], [0, h]]) fn(dx, dy); };
    // weiche helle Flecken
    for (let i = 0; i < 16; i++) {
      const x = R.real(0, w), y = R.real(0, h), r = R.real(10, 26);
      wrap((dx, dy) => {
        const g = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
        g.addColorStop(0, i % 3 ? C.mid : C.hot); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
      });
    }
    // Fließadern (geschwungene helle Linien entlang v)
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const x0 = R.real(0, w), amp = R.real(5, 16), ph = R.real(0, 6), lw = R.real(1.2, 2.4), fq = 1 + (i % 2);
      wrap((dx) => {
        ctx.beginPath();
        for (let y = -4; y <= h + 4; y += 4) { const x = x0 + Math.sin(y / h * TAU * fq + ph) * amp + Math.sin(y / h * TAU * 3 + i) * 2; if (y === -4) ctx.moveTo(x + dx, y); else ctx.lineTo(x + dx, y); }
        ctx.strokeStyle = C.vein; ctx.lineWidth = lw; ctx.stroke();
      });
    }
    // wenige Krustenschollen (dünn, mit hellem Glutrand)
    for (let i = 0; i < 6; i++) {
      const x = R.real(0, w), y = R.real(0, h), r = R.real(5, 10), n = 7;
      const pts = [];
      for (let k = 0; k < n; k++) { const a = (k / n) * TAU + R.real(-0.3, 0.3); pts.push([Math.cos(a) * r * R.real(0.6, 1.1), Math.sin(a) * r * R.real(0.6, 1.1)]); }
      wrap((dx, dy) => {
        ctx.beginPath();
        pts.forEach(([px, py], k) => (k ? ctx.lineTo(x + dx + px, y + dy + py) : ctx.moveTo(x + dx + px, y + dy + py)));
        ctx.closePath();
        ctx.fillStyle = i % 2 ? C.crust : C.crust2; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = C.hot; ctx.stroke();
      });
    }
  }, { repeat: true });
}
function fallTexture(kind) {
  const blue = kind === 'blau';
  return canvasTexture(`w7:lavafall:${kind}`, 64, 256, (ctx, cw, ch) => {
    ctx.fillStyle = blue ? '#3a8aff' : '#ff6a1a'; ctx.fillRect(0, 0, cw, ch);
    for (let i = 0; i < 26; i++) {
      const xx = (i * 37) % cw, yy = (i * 71) % ch, len = 30 + (i * 13) % 60;
      ctx.fillStyle = i % 3 ? (blue ? 'rgba(200,245,255,0.85)' : 'rgba(255,224,96,0.85)') : (blue ? 'rgba(20,40,140,0.7)' : 'rgba(170,36,10,0.75)');
      ctx.fillRect(xx, yy, 4 + (i % 3), len);
      ctx.fillRect(xx, yy - ch, 4 + (i % 3), len);
    }
  }, { repeat: true });
}

/** Knochenflieger in Kartenqualität (Blick +X): runder Schädel mit Kamm, Schnabel, Rippen-Rumpf, Fächerschwanz. */
function boneBodyGeo() {
  return cached('w7m:bonebody', () => {
    const b = new Build();
    const bone = { v: (x, y, z, nx, ny) => mix(0xd8ccb4, 0xfff6e4, ny * 0.5 + 0.5) };
    b.sphere(0.3, bone, { p: [0.36, 0.08, 0], s: [1.1, 1, 1] }, 9, 7);
    b.cone(0.11, 0.48, 0xf0e2c4, { p: [0.84, 0.02, 0], r: [0, 0, -Math.PI / 2 - 0.15] }, 6);
    for (const s of [-1, 1]) { b.sphere(0.09, 0x3a2440, { p: [0.55, 0.14, s * 0.17], s: [0.8, 1, 0.6] }, 6, 4); b.sphere(0.035, 0xffd24a, { p: [0.6, 0.15, s * 0.21] }, 4, 3); }
    b.cone(0.1, 0.3, 0xf0e2c4, { p: [0.28, 0.4, 0], r: [0, 0, 0.5] }, 4);
    for (let i = 0; i < 4; i++) b.torus(0.17 - i * 0.02, 0.035, 0xf4e8d0, { p: [0.05 - i * 0.16, -0.02, 0], r: [0, Math.PI / 2, 0] }, 3, 10);
    b.cyl(0.04, 0.04, 0.75, 0xe8dcc0, { p: [-0.12, 0.02, 0], r: [0, 0, Math.PI / 2] }, 4);
    for (let i = 0; i < 3; i++) b.box(0.32, 0.03, 0.1, 0xf0e2c4, { p: [-0.62, 0.02, (i - 1) * 0.1], r: [0, (i - 1) * 0.4, 0] }, 0);
    return b.geometry();
  });
}
/** Ein Knochenflügel (vier Fingerknochen mit dünner violetter Haut), ragt nach +Z. */
function boneWingGeo() {
  return cached('w7m:bonewing', () => {
    const b = new Build();
    b.cyl(0.035, 0.035, 0.42, 0xf0e2c4, { p: [0.02, 0, 0.21], r: [Math.PI / 2, 0, 0] }, 4);
    for (let i = 0; i < 4; i++) {
      const a = -0.5 + i * 0.32;
      b.cyl(0.025, 0.02, 0.62, 0xf0e2c4, { p: [Math.sin(a) * 0.3 - 0.05, 0, 0.42 + Math.cos(a) * 0.28], r: [Math.PI / 2, 0, a], order: 'ZXY' }, 4);
    }
    b.box(0.62, 0.015, 0.5, 0x8a5aa8, { p: [-0.12, -0.01, 0.62] }, 0);
    return b.geometry();
  });
}
/** Platschfisch in Kartenqualität (Blick +X): glühender Körper, Basaltschollen, Flammenkamm. */
function fishGeo() {
  return cached('w7m:fish', () => {
    const b = new Build();
    b.sphere(0.32, { v: (x, y, z, nx, ny) => mix(0xffe07a, 0xff6a1a, ny * 0.5 + 0.5) }, { s: [1.4, 1, 0.9] }, 10, 7);
    b.cone(0.22, 0.4, 0xff8a2a, { p: [-0.55, 0, 0], r: [0, 0, Math.PI / 2], s: [1, 1, 0.3] }, 4);
    for (const s of [-1, 1]) { b.sphere(0.08, 0xffffff, { p: [0.28, 0.1, s * 0.2] }, 6, 4); b.sphere(0.04, 0x2a1a1a, { p: [0.33, 0.11, s * 0.24] }, 4, 3); }
    for (let i = 0; i < 3; i++) b.cone(0.07, 0.28, 0xffd24a, { p: [0.05 - i * 0.18, 0.36, 0], r: [0, 0, 0.3] }, 4);
    b.box(0.3, 0.1, 0.3, 0x4a3a40, { p: [0.0, 0.26, 0], r: [0, 0.5, 0] }, 0);
    return b.geometry();
  });
}

/**
 * Bewegte Kulisse der Lava-Festung (MapBuilder: out.life, je Bild update; CourseMapScene.state().decor über liveInfo):
 *   Lavaflächen         aus den Becken-Blöcken (style 'basin'/'bluebasin', flow: [dx, dz]) – eine Fläche je Farbe, fließende Textur
 *   map.lavafalls       [{ at, w, top, bottom, face, color }] Lavafälle (eine Fläche je Farbe) mit Glut-Gischt
 *   map.fountains       [[x, y, z, h, color]] Lava-Fontänen im Takt der Kartenmusik (gerade/ungerade abwechselnd)
 *   map.smoke           [[x, y, z, Stärke]] Rauchfahnen; dazu Dampf, wo Lava das Meer berührt
 *   map.boneflyers      [{ c, r, n, speed }] kreisende Knochenflieger (Rumpf und Flügel je eine Instanz-Fläche)
 *   map.flags           [[x, y, z, h]] Brummbär-Fahnen (Mast statisch, Tuch in einer gemeinsamen Fläche, weht)
 *   map.torches         [[x, y, z, color]] Fackelständer (statisch) mit flackernden Flammen (eine Instanz-Fläche)
 *   map.fishjumps       [[x, y, z, Weite, yaw]] Platschfische springen im Bogen aus der Lava
 *   Lavablasen          auf den Lavaflächen (eine Instanz-Fläche, rot/blau über Instanzfarben)
 */
export class LavaLife {
  constructor(level, map) {
    this.view = level.view;
    this.level = level;
    this.map = map;
    this.own = [];
    this.sea = map.sea ?? 0;
    this.lavaRects = { rot: [], blau: [] };
    for (const b of map.ground ?? []) {
      if (b.style === 'basin') this.lavaRects.rot.push(b);
      else if (b.style === 'bluebasin') this.lavaRects.blau.push(b);
    }
    this.buildLava();
    this.buildFalls(map.lavafalls ?? []);
    this.buildFountains(map.fountains ?? []);
    this.buildBubbles();
    this.buildSmoke(map.smoke ?? []);
    this.buildBoneflyers(map.boneflyers ?? []);
    this.buildFlags(map.flags ?? []);
    this.buildTorches(map.torches ?? []);
    this.buildFish(map.fishjumps ?? []);
    this.foun = { beat: 0, step: 0, k: 0, source: 'zeit', theme: null, bpm: MAP_BPM7(), erupting: false };
    this.shown = null;
    this.far = false;
    this.update(0, 0);
  }

  add(obj) { this.view.add(obj); this.own.push(obj); return obj; }

  /** Lavaflächen: je Farbe eine Fläche aus Rechtecken (UV entlang der Fließrichtung), Textur wandert. */
  buildLava() {
    this.lavaTex = {};
    this.lavaMats = {};
    for (const kind of ['rot', 'blau']) {
      const rects = this.lavaRects[kind];
      if (!rects.length) continue;
      const pos = [], uv = [];
      for (const b of rects) {
        const [x0, z0, x1, z1] = b.rect;
        const y = b.top + 0.3;
        const f = b.flow ?? [0, 1], fl = Math.hypot(f[0], f[1]) || 1, fx = f[0] / fl, fz = f[1] / fl;
        const S = 7;
        const UV = (x, z) => [(x * -fz + z * fx) / S, (x * fx + z * fz) / S];
        // Raster 6 m (Glanz/Nebel gleichmäßig, kein riesiges Dreieck)
        const nx = Math.max(1, Math.round((x1 - x0) / 6)), nz = Math.max(1, Math.round((z1 - z0) / 6));
        for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
          const ax = x0 + ((x1 - x0) * i) / nx, bx = x0 + ((x1 - x0) * (i + 1)) / nx, az = z0 + ((z1 - z0) * j) / nz, bz = z0 + ((z1 - z0) * (j + 1)) / nz;
          for (const [x, z] of [[ax, az], [ax, bz], [bx, bz], [ax, az], [bx, bz], [bx, az]]) { pos.push(x, y, z); uv.push(...UV(x, z)); }
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.computeVertexNormals();
      g.computeBoundingSphere();
      const tex = lavaTexture(kind).clone();
      tex.needsUpdate = true;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      const mat = new THREE.MeshBasicMaterial({ map: tex, fog: true });
      this.own.push(g, tex, mat);
      const m = new THREE.Mesh(g, mat);
      m.name = `w7:lava:${kind}`;
      m.receiveShadow = false;
      this.add(m);
      this.lavaTex[kind] = tex;
      this.lavaMats[kind] = mat;
    }
  }

  /** Zufälliger Punkt auf einer Lavafläche (nicht unter einem höheren Block). */
  lavaPoint(kind, rnd) {
    const rects = this.lavaRects[kind];
    if (!rects.length) return null;
    for (let tries = 0; tries < 20; tries++) {
      const b = rects[Math.floor(rnd() * rects.length)];
      const [x0, z0, x1, z1] = b.rect;
      const x = x0 + 1.2 + rnd() * (x1 - x0 - 2.4), z = z0 + 1.2 + rnd() * (z1 - z0 - 2.4);
      const over = blockAt(this.map, x, z);
      if (over && over !== b && over.top > b.top + 0.05) continue;
      return [x, b.top + 0.3, z];
    }
    return null;
  }

  buildFalls(list) {
    this.falls = list;
    if (!list.length) return;
    this.fallTex = {};
    const byKind = { rot: [], blau: [] };
    for (const f of list) byKind[f.color === 'blau' ? 'blau' : 'rot'].push(f);
    const lip = new Build();
    for (const [kind, fl] of Object.entries(byKind)) {
      if (!fl.length) continue;
      const pos = [], uv = [];
      for (const f of fl) {
        const [cx, cz] = f.at, w = f.w ?? 2.4, y1 = f.top, y0 = f.bottom ?? 0.7, h = y1 - y0;
        const dir = f.face === 'E' ? [1, 0] : f.face === 'W' ? [-1, 0] : f.face === 'N' ? [0, -1] : [0, 1];
        const across = [dir[1], -dir[0]];
        const rows = 5;
        for (let r = 0; r < rows; r++) {
          const ta = r / rows, tb = (r + 1) / rows;
          const ya = y1 - ta * h, yb = y1 - tb * h;
          const oa = 0.25 + Math.sqrt(ta) * 0.9, ob = 0.25 + Math.sqrt(tb) * 0.9;
          const wa = w * (1 + ta * 0.25), wb = w * (1 + tb * 0.25);
          const P = (o, yy, ww, s) => [cx + dir[0] * o + across[0] * ww * s / 2, yy, cz + dir[1] * o + across[1] * ww * s / 2];
          const A = P(oa, ya, wa, -1), B2 = P(oa, ya, wa, 1), C = P(ob, yb, wb, 1), D = P(ob, yb, wb, -1);
          pos.push(...A, ...B2, ...C, ...A, ...C, ...D);
          const va = (ta * h) / 4, vb = (tb * h) / 4, ur = w / 2.2;
          uv.push(0, va, ur, va, ur, vb, 0, va, ur, vb, 0, vb);
        }
        this.view.addStatic(new Build().box(w + 0.5, 0.5, 0.6, kind === 'blau' ? 0x2a3450 : 0x3a2a2e, { p: [cx + dir[0] * 0.15, y1 + 0.1, cz + dir[1] * 0.15], r: [0, dir[0] ? Math.PI / 2 : 0, 0] }, 0).geometry(), { castShadow: false });
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.computeVertexNormals();
      const tex = fallTexture(kind).clone();
      tex.needsUpdate = true;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, fog: true });
      this.own.push(g, tex, mat);
      const m = new THREE.Mesh(g, mat);
      m.name = `w7:lavafaelle:${kind}`;
      this.add(m);
      this.fallTex[kind] = tex;
    }
    void lip;
  }

  /** Lava-Fontänen: Kraterring (statisch), Säule und Spritzer als Instanzen (Farbe je Fontäne). */
  buildFountains(list) {
    this.fountains = list.map(([x, y, z, h = 4, color = 'rot'], i) => ({ x, y, z, h, color, i }));
    if (!this.fountains.length) return;
    const ringGlow = new Build();
    for (const f of this.fountains) {
      // Kraterring je Fontäne (landet in der Kachel seiner Insel), Glutscheibe in der gemeinsamen Leucht-Kachel
      const ring = new Build();
      for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU + f.i; ring.add(new THREE.IcosahedronGeometry(0.46, 0), (qx, qy, qz, nx, ny) => mix(0x2e2428, 0x5e4c50, ny * 0.5 + 0.5), { p: [f.x + Math.cos(a) * 0.95, f.y + 0.05, f.z + Math.sin(a) * 0.95], s: [1, 0.7, 1] }); }
      this.view.addStatic(ring.geometry(), { castShadow: false });
      ringGlow.cyl(0.7, 0.7, 0.04, f.color === 'blau' ? 0x9ae8ff : 0xffd24a, { p: [f.x, f.y + 0.08, f.z] }, 8);
    }
    this.view.addStatic(ringGlow.geometry(), { material: 'glow', castShadow: false, tile: 'w7:leuchten' });
    const col = new Build();
    col.cyl(0.18, 0.42, 1, { v: (x, y) => mix(0xffffff, 0xd8d8d8, y + 0.5) }, { p: [0, 0.5, 0] }, 9);
    col.sphere(0.5, 0xffffff, { p: [0, 1.0, 0], s: [1, 0.55, 1] }, 9, 5);
    const cg = col.geometry();
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true });
    this.fCol = new THREE.InstancedMesh(cg, mat, this.fountains.length);
    this.fCol.frustumCulled = false;
    this.fCol.name = 'w7:fontaenen';
    this.own.push(cg, mat);
    this.fountains.forEach((f, i) => this.fCol.setColorAt(i, f.color === 'blau' ? _c.set(0x7ad8ff) : _c.set(0xffa03a)));
    this.add(this.fCol);
    const dg = new THREE.IcosahedronGeometry(0.22, 0);
    const dm = new THREE.MeshBasicMaterial({ fog: true });
    this.drops = new THREE.InstancedMesh(dg, dm, this.fountains.length * 4);
    this.drops.frustumCulled = false;
    this.drops.name = 'w7:fontaenen-spritzer';
    this.own.push(dg, dm);
    for (let i = 0; i < this.drops.count; i++) this.drops.setColorAt(i, this.fountains[Math.floor(i / 4)].color === 'blau' ? _c.set(0xb4f0ff) : _c.set(0xffd24a));
    this.add(this.drops);
  }

  /** Fontänen-Stellung aus der Taktuhr: Gruppe (gerade/ungerade) je Zählzeit, Höhe nach der Hüllkurve. */
  fountainInfo(t = this.view.time) {
    const bt = beatNow7(t);
    const whole = Math.floor(bt.beat), frac = bt.beat - whole;
    const k = fountainEnvelope(frac);
    return { beat: +bt.beat.toFixed(3), step: ((whole % 2) + 2) % 2, k: +k.toFixed(4), erupting: frac < 0.75, source: bt.source, theme: bt.theme, bpm: bt.bpm };
  }

  buildBubbles() {
    const N = 44;
    const rnd = new Rnd(0xb0b1);
    const r = () => rnd.frac();
    this.bubbles = [];
    for (let i = 0; i < N; i++) {
      const kind = this.lavaRects.blau.length && i % 4 === 0 ? 'blau' : 'rot';
      const p = this.lavaPoint(kind, r) ?? this.lavaPoint('rot', r);
      if (!p) continue;
      this.bubbles.push({ p, kind, ph: r() * 3, per: 1.6 + r() * 1.8, s: 0.3 + r() * 0.35, seed: i });
    }
    if (!this.bubbles.length) return;
    const g = new THREE.SphereGeometry(1, 10, 5, 0, TAU, 0, Math.PI / 2);
    const m = new THREE.MeshBasicMaterial({ fog: true });
    this.bub = new THREE.InstancedMesh(g, m, this.bubbles.length);
    this.bub.frustumCulled = false;
    this.bub.name = 'w7:lavablasen';
    this.own.push(g, m);
    this.bubbles.forEach((b, i) => this.bub.setColorAt(i, b.kind === 'blau' ? _c.set(0x8ae0ff) : _c.set(0xffb43a)));
    this.add(this.bub);
    this.bubRnd = rnd;
  }

  buildSmoke(list) {
    const src = list.map(([x, y, z, s = 1]) => ({ x, y, z, s, steam: false }));
    // Dampf, wo Lava das Meer berührt: freie Seiten der Lavabecken (wenige Stellen)
    const rnd = new Rnd(0x57ea);
    for (const b of [...this.lavaRects.rot, ...this.lavaRects.blau]) {
      const [x0, z0, x1, z1] = b.rect;
      const cand = [[x0 - 0.6, (z0 + z1) / 2], [x1 + 0.6, (z0 + z1) / 2], [(x0 + x1) / 2, z0 - 0.6], [(x0 + x1) / 2, z1 + 0.6]];
      for (const [x, z] of cand) if (!blockAt(this.map, x, z) && rnd.frac() < 0.7) src.push({ x, y: 0.3, z, s: 0.8, steam: true });
    }
    this.smokeSrc = src.slice(0, 18);
    if (!this.smokeSrc.length) return;
    const per = 5;
    const g = new THREE.IcosahedronGeometry(1, 1);
    const m = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x3a2a30, emissiveIntensity: 0.4 });
    this.smoke = new THREE.InstancedMesh(g, m, this.smokeSrc.length * per);
    this.smoke.frustumCulled = false;
    this.smoke.castShadow = false;
    this.smoke.name = 'w7:rauch';
    this.own.push(g, m);
    this.smokePer = per;
    this.smokeSrc.forEach((s, i) => { for (let k = 0; k < per; k++) this.smoke.setColorAt(i * per + k, s.steam ? _c.set(0xf4f0f4) : _c.set(k % 2 ? 0x8a7a86 : 0x9a8a92)); });
    this.add(this.smoke);
  }

  buildBoneflyers(list) {
    this.birds = [];
    for (const { c, r, n = 2, speed = 0.3 } of list) for (let i = 0; i < n; i++) this.birds.push({ c, r: r * (1 - i * 0.12), ph: (i / n) * TAU, sp: speed * (1 + i * 0.08), fl: i * 1.3 });
    if (!this.birds.length) return;
    const bg = boneBodyGeo(), wg = boneWingGeo();
    const bm = vcol(0.6, {}, 'w7bone'), wm = vcol(0.7, { side: THREE.DoubleSide }, 'w7bonewing');
    this.bBody = new THREE.InstancedMesh(bg, bm, this.birds.length);
    this.bWing = new THREE.InstancedMesh(wg, wm, this.birds.length * 2);
    for (const m of [this.bBody, this.bWing]) { m.frustumCulled = false; m.castShadow = false; this.add(m); }
    this.bBody.name = 'w7:knochenflieger';
    this.bWing.name = 'w7:knochenflieger-fluegel';
  }

  buildFlags(list) {
    this.flagList = list;
    if (!list.length) return;
    const poles = new Build();
    const fw = 1.5, fh = 0.95, sx = 8, sy = 4;
    const pos = [], uv = [], idx = [];
    this.flagBase = [];
    list.forEach(([x, y, z, h = 3.6], fi) => {
      const pole = new Build();
      pole.cyl(0.06, 0.08, h, 0x3a3a46, { p: [x, y + h / 2, z] }, 6);
      pole.sphere(0.12, 0xffc23a, { p: [x, y + h + 0.08, z] }, 6, 4);
      pole.cyl(0.24, 0.3, 0.2, 0x3a3a46, { p: [x, y + 0.1, z] }, 8);
      this.view.addStatic(pole.geometry(), { castShadow: true });
      const v0 = pos.length / 3;
      for (let j = 0; j <= sy; j++) for (let i = 0; i <= sx; i++) {
        const u = i / sx, v = j / sy;
        const lx = u * fw, ly = (v - 0.5) * fh;
        pos.push(x + 0.06 + lx, y + h - 0.55 + ly, z);
        uv.push(u, v);
        this.flagBase.push({ x: x + 0.06, y: y + h - 0.55, z, lx, ly, f: u, fi });
      }
      for (let j = 0; j < sy; j++) for (let i = 0; i < sx; i++) {
        const a = v0 + j * (sx + 1) + i, b2 = a + 1, c = a + sx + 1, d = c + 1;
        idx.push(a, b2, d, a, d, c);
      }
    });
    void poles;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ map: baronFlagTexture(), side: THREE.DoubleSide, roughness: 0.75 });
    this.own.push(g, mat);
    this.flagMesh = new THREE.Mesh(g, mat);
    this.flagMesh.frustumCulled = false;
    this.flagMesh.name = 'w7:fahnen';
    this.add(this.flagMesh);
  }

  buildTorches(list) {
    this.torches = list.map(([x, y, z, color = 'rot']) => ({ x, y, z, color }));
    if (!this.torches.length) return;
    const gl = new Build();
    for (const t of this.torches) {
      const st = new Build();
      for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU; st.cyl(0.03, 0.04, 1.3, 0x2e2a34, { p: [t.x + Math.cos(a) * 0.16, t.y + 0.62, t.z + Math.sin(a) * 0.16], r: [Math.sin(a) * 0.14, 0, -Math.cos(a) * 0.14] }, 4); }
      st.cyl(0.3, 0.16, 0.24, 0x3a3440, { p: [t.x, t.y + 1.32, t.z] }, 8);
      this.view.addStatic(st.geometry(), { castShadow: true });
      gl.cyl(0.24, 0.24, 0.03, t.color === 'blau' ? 0x9ae8ff : 0xffd24a, { p: [t.x, t.y + 1.45, t.z] }, 8);
      this.level.world.add({ type: 'cyl', x: t.x, z: t.z, r: 0.3, y0: t.y, y1: t.y + 1.6, tag: 'fackel' });
    }
    this.view.addStatic(gl.geometry(), { material: 'glow', castShadow: false, tile: 'w7:leuchten' });
    const b = new Build();
    b.cone(0.2, 0.62, { v: (px, py) => mix(0xff5a1a, 0xffd23a, py + 0.5) }, { p: [0, 0.31, 0] }, 7);
    b.cone(0.12, 0.4, 0xfff6c0, { p: [0, 0.22, 0.05] }, 6);
    const g = b.geometry();
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true });
    this.flames = new THREE.InstancedMesh(g, mat, this.torches.length);
    this.flames.frustumCulled = false;
    this.flames.name = 'w7:fackelflammen';
    this.own.push(g, mat);
    this.torches.forEach((t, i) => this.flames.setColorAt(i, t.color === 'blau' ? _c.set(0x8ad8ff) : _c.set(0xffffff)));
    this.add(this.flames);
  }

  buildFish(list) {
    this.fish = list.map(([x, y, z, dist = 4, yaw = 0], i) => ({ x, y, z, dist, yaw, ph: i * 1.7, per: 3.2 + (i % 3) * 0.7 }));
    if (!this.fish.length) return;
    const g = fishGeo();
    const m = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true });
    this.fishMesh = new THREE.InstancedMesh(g, m, this.fish.length);
    this.fishMesh.frustumCulled = false;
    this.fishMesh.name = 'w7:platschfische';
    this.own.push(m);
    this.add(this.fishMesh);
  }

  update(dt, t) {
    // Blick über die ganze Insel (Anflug, Ankunft durch die Glasröhre): kleine Effekte ausblenden (spart Zeichenaufrufe)
    const cam = this.view.camera?.position, tg = this.view.rig?.target;
    const far = !!(cam && tg && cam.distanceTo(tg) > 45);
    if (far !== this.far) {
      this.far = far;
      for (const o of [this.drops, this.bub, this.fishMesh, this.flames, this.flagMesh, this.bBody, this.bWing]) if (o) o.visible = !far;
    }
    // Lava fließt (Textur wandert entlang der Fließrichtung), glüht leicht pulsierend
    for (const [kind, tex] of Object.entries(this.lavaTex ?? {})) {
      tex.offset.y = -((t * (kind === 'blau' ? 0.05 : 0.04)) % 1);
      tex.offset.x = Math.sin(t * 0.13) * 0.04;
      const k = 0.92 + Math.sin(t * 1.7 + (kind === 'blau' ? 1 : 0)) * 0.08;
      this.lavaMats[kind].color.setScalar(k);
    }
    for (const tex of Object.values(this.fallTex ?? {})) tex.offset.y = (t * 0.55) % 1;
    if (this.fCol) {
      const fi = this.fountainInfo(t);
      this.foun = fi;
      this.fountains.forEach((f, i) => {
        const active = (i % 2) === fi.step;
        const k = active ? fi.k : 0;
        const hh = Math.max(0.05, f.h * k);
        setI(this.fCol, i, f.x, f.y, f.z, t * 0.6 + i, k > 0.02 ? [1, hh, 1] : [0.001, 0.001, 0.001]);
        for (let d = 0; d < 4; d++) {
          const a = (d / 4) * TAU + i, frac = fi.beat - Math.floor(fi.beat);
          const u = active ? Math.min(1, frac / 0.7) : 1;
          const r = 0.4 + u * 1.6, yy = f.y + f.h * 0.9 * (1 - (2 * u - 1) * (2 * u - 1)) * (active ? 1 : 0);
          const vis = active && u < 0.98 && frac > 0.05;
          setI(this.drops, i * 4 + d, f.x + Math.cos(a) * r, yy + 0.2, f.z + Math.sin(a) * r, 0, vis ? 1 - u * 0.4 : 0.001);
        }
      });
      this.fCol.instanceMatrix.needsUpdate = true;
      this.drops.instanceMatrix.needsUpdate = true;
      this.shown = { step: fi.step, k: fi.k };
    }
    if (this.bub) {
      const r = () => this.bubRnd.frac();
      this.bubbles.forEach((b, i) => {
        const age = (t + b.ph) % b.per, u = age / b.per;
        if (age < (dt || 0) && dt > 0) { const p = this.lavaPoint(b.kind, r); if (p) b.p = p; }
        const s = u < 0.8 ? b.s * (0.3 + u) : b.s * 1.1 * Math.max(0, 1 - (u - 0.8) / 0.2) * 1.3;
        setI(this.bub, i, b.p[0], b.p[1] - 0.04, b.p[2], 0, s > 0.01 ? s : 0.001);
      });
      this.bub.instanceMatrix.needsUpdate = true;
    }
    if (this.smoke) {
      const per = this.smokePer;
      this.smokeSrc.forEach((s, i) => {
        for (let k = 0; k < per; k++) {
          const u = ((t * (s.steam ? 0.22 : 0.16) + k / per + i * 0.13) % 1);
          const rise = s.steam ? 4 : 9 * s.s;
          const sc = (s.steam ? 0.6 : 0.9) * s.s * (0.5 + u * 1.5) * (u > 0.82 ? Math.max(0, 1 - (u - 0.82) / 0.18) : 1);
          setI(this.smoke, i * per + k, s.x + Math.sin(u * 3 + i) * 0.6 + u * 1.5, s.y + u * rise, s.z + Math.cos(u * 2 + k) * 0.4, u, sc > 0.01 ? sc : 0.001);
        }
      });
      this.smoke.instanceMatrix.needsUpdate = true;
    }
    if (this.bBody) {
      this.birds.forEach((d, i) => {
        const a = d.ph + t * d.sp;
        const dir = d.sp >= 0 ? 1 : -1;
        const px = d.c[0] + Math.cos(a) * d.r, py = d.c[1] + Math.sin(t * 0.8 + i) * 0.7, pz = d.c[2] + Math.sin(a) * d.r;
        const tx = -Math.sin(a) * dir, tz = Math.cos(a) * dir;
        const yaw = Math.atan2(-tz, tx);
        setI(this.bBody, i, px, py, pz, yaw, 1.15, 0, -0.1 * dir);
        const flap = Math.sin(t * 9 + d.fl) * 0.7;
        // Flügel: Gelenk an der Schulter, Schlag um die Längsachse (rechter Flügel gespiegelt)
        for (const s of [1, -1]) {
          _e.set(s * flap, yaw, -0.1 * dir, 'YXZ');
          _q.setFromEuler(_e);
          _s.set(1.15, 1.15, 1.15 * s);
          _p.set(px + Math.sin(yaw) * 0.0, py + 0.05, pz);
          _m4.compose(_p, _q, _s);
          this.bWing.setMatrixAt(i * 2 + (s > 0 ? 0 : 1), _m4);
        }
      });
      this.bBody.instanceMatrix.needsUpdate = true;
      this.bWing.instanceMatrix.needsUpdate = true;
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
    if (this.flames) {
      this.torches.forEach((f, i) => {
        const k = 1 + Math.sin(t * 13 + i * 1.7) * 0.1 + Math.sin(t * 7.3 + i) * 0.07;
        setI(this.flames, i, f.x, f.y + 1.42, f.z, t * 0.5 + i, [2 - k, k, 2 - k]);
      });
      this.flames.instanceMatrix.needsUpdate = true;
    }
    if (this.fishMesh) {
      this.fish.forEach((f, i) => {
        const age = (t + f.ph) % f.per, u = age / 1.1;
        if (u > 1) { setI(this.fishMesh, i, f.x, f.y - 2, f.z, 0, 0.001); return; }
        const along = (u - 0.5) * f.dist, hgt = f.dist * 0.55 * (1 - (2 * u - 1) * (2 * u - 1));
        const pitch = Math.atan2(-(2 * u - 1) * f.dist * 1.1, f.dist);
        setI(this.fishMesh, i, f.x + Math.cos(f.yaw) * along, f.y + hgt, f.z - Math.sin(f.yaw) * along, f.yaw, 1.1, 0, pitch);
      });
      this.fishMesh.instanceMatrix.needsUpdate = true;
    }
  }

  liveInfo() {
    return {
      fountains: { ...this.fountainInfo(), n: this.fountains?.length ?? 0, shown: this.shown },
      lava: { rot: this.lavaRects.rot.length, blau: this.lavaRects.blau.length },
      lavafalls: { n: this.falls?.length ?? 0 },
      bubbles: { n: this.bubbles?.length ?? 0 },
      smoke: { n: this.smokeSrc?.length ?? 0 },
      boneflyers: { n: this.birds?.length ?? 0 },
      flags: { n: this.flagList?.length ?? 0 },
      torches: { n: this.torches?.length ?? 0 },
      fish: { n: this.fish?.length ?? 0 },
    };
  }

  info() { return this.liveInfo(); }

  dispose() {
    for (const o of this.own) { if (o.isObject3D) o.parent?.remove(o); o.dispose?.(); }
    this.own.length = 0;
  }
}

void merge;
