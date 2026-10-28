// Gelände, Ränder, Streudeko, Requisiten, Brücken, Wolkenmeer und lebendige Kulisse der Welt-6-Karte „Wolkeninseln“
// (eigene Gestaltung, Spielzeug-Look wie Welt 1–5): schwebende Inseln mit bunten Erdschichten und felsiger Unterseite
// (hängende Steinzapfen, Ranken, leuchtende Kristalle) über einem Wolkenmeer; Wolkenkragen rund um die Inselränder.
// Zonen: Wiese, Steinkreis, Bucht (Wasserbecken), Fernost-Platten, Dschungel mit lila Giftsee, Festungsplatten,
// Schnee mit Gipfeln, Fabrik-Stahlplatten, Minen-Bohlen, Wolkenstraße, Zirkusplatz.
// Ränder: Wolkenhecke ('cloudhedge'), weißes Geländer mit Goldkugeln ('skyrail'), Kaimauer mit Pollern ('quay'),
// Bambuszaun ('bamboo'), Felsbrocken ('rocks'), Schneewall ('snowbank').
// Verbindungen (segments, nur Karte, Kollision wie `bridge`): begehbare Glasröhre ('glasstube'), Wolkenbrücke
// ('cloudbridge'), rote Bogenbrücke ('redbridge'), Regenbogenbrücke ('rainbowbridge').
// Wolkenmeer (CloudSea, statt Meer/Schaum/Glitzern): Fläche + treibende Wolkenkuppen (eine Instanz-Fläche).
// Lebendige Kulisse (SkyLife): Windräder drehen je Zählzeit der Kartenmusik eine Achtelrunde weiter (music.beat(),
// ohne laufende Musik Ersatzuhr im Tempo von course_world6_map bzw. course_map), Luftschiffchen kreisen,
// Wasserfälle stürzen ins Wolkenmeer (eine Fläche, eine wandernde Textur), Regenbögen (statisch, durchscheinend).
// Thema 'map_sky' (strahlender Himmel, lavendelweißer Dunst, Wolkentürme am Horizont) meldet sich hier in THEMES an.
//
// Alle Geometrien in Weltkoordinaten bzw. mit Fußpunkt im Ursprung (Vorderseite +Z, zur Kamera) und Vertexfarben
// (position/normal/color) für view.addStatic (Karten-Kacheln, MapBatcher). Flache Deckschichten tragen
// userData.noShadow, leuchtende userData.material 'glow', glänzendes Wasser 'stone'. Materialien der Karte:
// view.mats.w6glass (Glas der Röhren, durchscheinend) und view.mats.w6rainbow (Regenbögen) – skyMats(view).

import * as THREE from 'three';
import { mix, TAU, cached } from '../models/lib/kit.js';
import { roundedBox, SIDE, colorize, lin, mixc, smooth, Rnd, merge } from '../../three/world/geometry.js';
import { alignedGrid } from '../blocks/kit.js';
import { THEMES } from '../view/themes.js';
import { getModel, hasModel } from '../models/index.js';
import { music } from '../../audio/index.js';
import { canvasTexture } from '../../three/lib/itemMaterials.js';
import { LowBuild as Build, place } from './desert.js';
import { buildBridge } from '../blocks/types/bridge.js';
import { modelTris, jungleTreeGeo, balloonsGeo, drumGeo, lilaGround } from './beach5.js';

export const SKY_STYLES = new Set(['meadow', 'hill', 'stone', 'rock', 'bay', 'pool', 'poison', 'fareast', 'jungle', 'fort', 'snow', 'snowpeak',
  'metal', 'mine', 'cloud', 'circus']);

// ------------------------------------------------------------------ Thema der Wolkeninseln

if (!THEMES.map_sky) {
  THEMES.map_sky = {
    ...THEMES.grass,
    label: 'Weltkarte Wolkeninseln',
    sky: [[1, 0x2674e6], [0.45, 0x48a4fa], [0.15, 0x98d6ff], [0.04, 0xe2f0ff], [0, 0xfbf4ff], [-0.1, 0xf0eafc], [-1, 0xdcd6f4]],
    background: 0xeef2ff,
    fog: { color: 0xeef0fe, near: 95, far: 330 },
    hemi: { sky: 0xeaf2ff, ground: 0xc4b8e8, intensity: 1.36 },
    sun: { color: 0xfff4e0, intensity: 2.7, dir: [-0.45, 1, 0.5] },
    ground: null,
    clouds: false,
    sunDisc: true,
    backdrop: 'sky6',
    grassTop: 0x86dc5e, grassTop2: 0x78d052, grassRim: 0xb4f08e, grassSide: 0x56b84a,
    dirt: 0xd8a070, dirtDeep: 0xa8705a, rock: 0x9a8ab4, rockDeep: 0x6a5a8a,
    stone: 0xf6f2ff, stoneDark: 0xc8c0e0,
    wood: 0xfaf4ea, woodDark: 0xb8946a,
    water: 0x4ad0f4, waterDeep: 0x2a8ae0,
    buildBackdrop(sky, bounds, rnd) { skyBackdrop(sky, bounds, rnd); },
  };
}

/** Materialien der Wolkeninseln (vor dem ersten addStatic): Glas der Röhren, Regenbogen. */
export function skyMats(view) {
  if (!view) return;
  view.mats.w6glass ??= new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.34, roughness: 0.06, metalness: 0.1,
    side: THREE.DoubleSide, depthWrite: false, emissive: 0x1a5470, emissiveIntensity: 0.6 });
  view.mats.w6glass.opacity = 0.4;
  view.mats.w6rainbow ??= new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.72, side: THREE.DoubleSide, depthWrite: false, fog: true });
}

// ------------------------------------------------------------------ Hilfen

const hash2 = (x, z) => { const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return h - Math.floor(h); };
const tone = (a, c, k, out = [0, 0, 0]) => mixc(lin(a), lin(c), k, out);
const checker = (ax, az, cell = 2) => (Math.floor((ax + cell * 0.505) / cell) + Math.floor((az + cell * 0.505) / cell)) & 1;
// Leuchtendes und Wasser der ganzen Karte je in einer benannten Kachel (wenig Geometrie, sonst je Kachel ein Zeichenaufruf)
const MAT_TILE = { glow: 'w6:leuchten', stone: 'w6:wasser' };
function flat(g, material) { if (g) { g.userData.noShadow = true; if (material) { g.userData.material = material; g.userData.tile = MAT_TILE[material]; } } return g; }
const clampv = (v, a, b) => Math.max(a, Math.min(b, v));
const touch = (a, b) => a[0] <= b[2] + 1e-6 && b[0] <= a[2] + 1e-6 && a[1] <= b[3] + 1e-6 && b[1] <= a[3] + 1e-6;

// ------------------------------------------------------------------ Farben

const BANDS = {
  meadow: [0xf2cc92, 0xdca06c, 0xf8deac, 0xc88862, 0xeab482, 0xd49478],
  stone: [0xc8c0d8, 0xb0a6c4, 0xd8d2e6, 0xa49ab8],
  rock: [0xa898c4, 0x8c7cae, 0xbcaed4, 0x7a6aa0],
  fareast: [0xf0c8a0, 0xe0a888, 0xf8dcbc, 0xd49478],
  jungle: [0x8a5a3a, 0x6a8a3a, 0x9a6a42, 0x5a7a34, 0x7a4e30],
  fort: [0xa8a2b8, 0x948ea6, 0xbab4c8, 0x86809a],
  snow: [0xf4f8ff, 0xc8dcf4, 0xe6f0ff, 0xa8c4e8],
  metal: [0x8a96aa, 0x6e7a90, 0x9eaabc, 0x5e6a80],
  mine: [0xb88a5a, 0x9a6e46, 0xcc9e6a, 0x8a5e3e],
  circus: [0xffc8d8, 0xe8b0f0, 0xfff0c0, 0xc8a8f4, 0xffb0c0, 0xb8e0ff],
  hill: [0x6cc456, 0x5ab84c, 0x7ccc5e, 0xc8b8dc, 0x62bc50],
  basin: [0x7a6aa0, 0x6a5a8a],
};
// Unterseite: Erde oben, Fels in der Mitte, dunkle Spitze
const UNDER = {
  meadow: [0xc88a5a, 0x9a84bc, 0x6a5890], stone: [0xa49ab8, 0x8a80a8, 0x5e5480], rock: [0x9a8ab4, 0x7a6aa0, 0x504270],
  fareast: [0xd49478, 0x9a84bc, 0x6a5890], jungle: [0x6a4a2e, 0x5a6a48, 0x3e3a3a], fort: [0x948ea6, 0x7a7490, 0x4e4866],
  snow: [0xb8d0ee, 0x8aa4cc, 0x5a6c98], metal: [0x7a8498, 0x8a7cae, 0x50446e], mine: [0x9a6e46, 0x7e6a8e, 0x4a3e5e],
  circus: [0xe0a8c8, 0xa890cc, 0x6a5890], hill: [0xc88a5a, 0x9a84bc, 0x6a5890], snowpeak: [0xb8d0ee, 0x8aa4cc, 0x5a6c98],
};
const CRYSTAL = [0x7ae8ff, 0xff9ae8, 0xb4a0ff, 0x9affc8];

// ------------------------------------------------------------------ Geländestile

const BASINS = new Set(['bay', 'pool', 'poison']);
const bandOf = (style) => (BASINS.has(style) ? 1.2 : style === 'cloud' ? 1.0 : 2.8);

/**
 * Unterkante der Seitenschichten eines Blocks: top − Schichtdicke, aber mindestens so tief wie die der Nachbarblöcke
 * (sonst klaffte zwischen einem höheren Block und seinem tieferen Nachbarn ein Spalt über der gemeinsamen Unterseite).
 */
function sideBottom(b, map) {
  let y = b.top - bandOf(b.style ?? 'meadow');
  if (b.sideTo !== undefined) return Math.min(y, b.sideTo);
  for (const o of map?.ground ?? []) {
    if (o === b || !touch(o.rect, b.rect)) continue;
    y = Math.min(y, o.top - bandOf(o.style ?? 'meadow'));
  }
  return y;
}

/**
 * Gelände-Block der Wolkeninseln (Box x0..x1 × z0..z1 von base bis top; sichtbar sind nur die Schichten bis sideBottom
 * und die felsige Unterseite). style: 'meadow' (Standard, Wiese), 'hill' (Hügel, nicht begehbar, b.mound), 'stone'
 * (Steinplatten im Gras), 'rock' (Felsrand), 'bay'/'pool' (Wasserbecken), 'poison' (lila Giftsee), 'fareast'
 * (helle Platten mit roter Kante), 'jungle' (Moosboden), 'fort' (Festungsplatten), 'snow', 'snowpeak' (Schneegipfel,
 * b.mound), 'metal' (Stahlplatten mit Warnstreifen), 'mine' (Bohlen und Schotter), 'cloud' (Wolkenstraße),
 * 'circus' (Zirkusplatz). b.under: false | { rect, depth } – Unterseite (Standard: unter dem Block).
 */
export function skyGround(b, base, theme, rnd, map) {
  const [x0, z0, x1, z1] = b.rect;
  const top = b.top;
  const style = b.style ?? 'meadow';
  const parts = [];
  const yb = sideBottom(b, map);
  if (style === 'cloud') return cloudSlab(b, yb, rnd);
  if (BASINS.has(style)) return basinParts(b, yb, rnd);
  const P = PALETTES[style] ?? PALETTES.meadow;
  const capH = P.capH ?? 0.34;
  strata(parts, x0, yb, z0, x1, top - capH, z1, BANDS[P.bands ?? style] ?? BANDS.meadow, rnd, P.layer ?? 0.8, P.jitter ?? 0.1);
  // Decke mit runder Oberkante
  const lip = 0.08, r = Math.min(0.16, capH * 0.45);
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
  if (style === 'metal' && b.walk) parts.push(flat(stripeBorder(x0, z0, x1, z1, top + 0.01, 0.5, [0xffd23a, 0x2a2a34])));
  if (style === 'fareast' && b.walk) parts.push(flat(stripeBorder(x0, z0, x1, z1, top + 0.01, 0.45, [0xe8402a, 0xe8402a])));
  if (style === 'circus' && b.walk) parts.push(flat(stripeBorder(x0, z0, x1, z1, top + 0.01, 0.4, [0xffc21a, 0xffe07a])));
  if ((style === 'hill' || style === 'snowpeak') && b.mound) parts.push(mound(b, top, rnd, style));
  // Unterseite
  if (b.under !== false) {
    const u = typeof b.under === 'object' ? b.under : {};
    const [ux0, uz0, ux1, uz1] = u.rect ?? b.rect;
    const depth = u.depth ?? Math.min(16, 0.4 * Math.min(ux1 - ux0, uz1 - uz0) + 5);
    parts.push(...underside(ux0, uz0, ux1, uz1, yb, depth, UNDER[style] ?? UNDER.meadow, rnd, style, !!u.lite));
  }
  return parts;
}

const PALETTES = {
  meadow: {
    side: 0x5cba4c, rim: 0xb0ee8c,
    tile: (rnd) => (i, j, ax, az) => {
      const o = tone(checker(ax, az) ? 0x8ade62 : 0x7cd254, 0x98e470, rnd.frac() * 0.3);
      const h = hash2(Math.floor(ax / 2) - 7, Math.floor(az / 2) + 3);
      if (h > 0.95) mixc(o, lin(0xfff07a), 0.35, o);         // Butterblumen
      else if (h < 0.04) mixc(o, lin(0xffb4e0), 0.35, o);    // rosa Klee
      return o;
    },
  },
  hill: {
    side: 0x56b04a, rim: 0x9ae27a, bands: 'hill', layer: 1.1, jitter: 0.22, cellOff: 4,
    tile: (rnd) => (i, j, ax, az) => (hash2(Math.floor(ax / 4), Math.floor(az / 4)) > 0.8 ? tone(0xc8b8dc, 0xb4a4cc, rnd.frac()) : tone(0x7cd254, 0x6cc44c, rnd.frac())),
  },
  stone: {
    side: 0x7ab868, rim: 0xc0e8a8, cell: 2,
    tile: (rnd) => (i, j, ax, az) => (hash2(Math.floor(ax / 2) + 1, Math.floor(az / 2) - 4) > 0.55 ? tone(0xd4d0dc, 0xbcb6c8, rnd.frac() * 0.6) : tone(0x84cc5e, 0x76c052, rnd.frac())),
  },
  rock: {
    side: 0xa898c4, rim: 0xd8cce8, capH: 0.3,
    tile: (rnd) => (i, j, ax, az) => (hash2(Math.floor(ax / 4), Math.floor(az / 4)) > 0.65 ? tone(0x8ad060, 0x7ac456, rnd.frac()) : tone(0xc4b8d8, 0xb0a4c8, rnd.frac() * 0.8)),
  },
  fareast: {
    side: 0xe8d8c0, rim: 0xfff4e4, cell: 2,
    tile: (rnd) => (i, j, ax, az) => tone(checker(ax, az) ? 0xf6ecdc : 0xece0cc, 0xfaf2e6, rnd.frac() * 0.3),
  },
  jungle: {
    side: 0x3e8a3a, rim: 0x7ac85a, cell: 2,
    tile: (rnd) => (i, j, ax, az) => {
      const o = tone(checker(ax, az) ? 0x4caa46 : 0x429e3e, 0x5cb850, rnd.frac() * 0.35);
      if (hash2(Math.floor(ax / 2) + 3, Math.floor(az / 2) + 8) > 0.9) mixc(o, lin(0x8a6a3a), 0.3, o);   // Erdflecken
      return o;
    },
  },
  fort: {
    side: 0x9a94ae, rim: 0xd2cce0, cell: 2,
    tile: (rnd) => (i, j, ax, az) => tone(checker(ax, az) ? 0xbab4c8 : 0xaca6bc, 0xc6c0d4, rnd.frac() * 0.35),
  },
  snow: {
    side: 0xd8e8fa, rim: 0xffffff, cell: 2,
    tile: (rnd) => (i, j, ax, az) => {
      const o = tone(checker(ax, az) ? 0xffffff : 0xf2f6ff, 0xeaf2ff, rnd.frac() * 0.5);
      const h = hash2(Math.floor(ax / 2) + 2, Math.floor(az / 2) - 5);
      if (h > 0.93) mixc(o, lin(0xc8e4ff), 0.5, o);          // Eisglitzer
      else if (h < 0.05) mixc(o, lin(0xdcd0f4), 0.35, o);    // lila Schneeschatten
      return o;
    },
  },
  snowpeak: {
    side: 0xe0ecfa, rim: 0xffffff, bands: 'snow', cellOff: 4,
    tile: (rnd) => () => tone(0xffffff, 0xeaf2ff, rnd.frac()),
  },
  metal: {
    side: 0x7a869a, rim: 0xbcc6d6, cell: 2,
    tile: (rnd) => (i, j, ax, az) => tone(checker(ax, az) ? 0xa8b2c4 : 0x9aa4b8, 0xb4bece, rnd.frac() * 0.3),
  },
  mine: {
    side: 0xb08a62, rim: 0xe0c49a, cell: 1,
    tile: (rnd) => (i, j, ax, az) => {
      const plank = (Math.floor(ax) & 3) !== 0;
      const o = plank ? tone(0xc8a070, 0xb88e60, rnd.frac() * 0.5) : tone(0xa8a0a8, 0x989098, rnd.frac());
      if (hash2(Math.floor(ax / 2) + 5, Math.floor(az / 2) + 2) > 0.94) mixc(o, lin(0xb88ad8), 0.3, o);   // Kristallstaub
      return o;
    },
  },
  circus: {
    side: 0xf4b0c8, rim: 0xffe4ee, cell: 2,
    tile: (rnd) => (i, j, ax, az) => tone(checker(ax, az) ? 0xfff2e4 : 0xffb8c4, 0xfff6ee, rnd.frac() * 0.12),
  },
};

/** Versetzte Erd-/Gesteinsbänder (Quader je Schicht, abwechselnde Farben, leicht ein-/ausgerückt). */
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

/** Kante (Rahmen) aus Streifen um eine Fläche: abwechselnd zwei Farben je seg m (Warnstreifen, Goldkante …). */
function stripeBorder(x0, z0, x1, z1, y, w, cols, seg = 1) {
  const pos = [], col = [];
  const c0 = lin(cols[0]), c1 = lin(cols[1]);
  const quad = (ax, az, bx, bz, c) => {
    pos.push(ax, y, az, ax, y, bz, bx, y, bz, ax, y, az, bx, y, bz, bx, y, az);
    for (let k = 0; k < 6; k++) col.push(c[0], c[1], c[2]);
  };
  const run = (len, f) => { const n = Math.max(1, Math.round(len / seg)); for (let i = 0; i < n; i++) f(i / n, (i + 1) / n, i & 1 ? c1 : c0); };
  run(x1 - x0, (a, b, c) => { quad(x0 + (x1 - x0) * a, z0, x0 + (x1 - x0) * b, z0 + w, c); quad(x0 + (x1 - x0) * a, z1 - w, x0 + (x1 - x0) * b, z1, c); });
  run(z1 - z0 - 2 * w, (a, b, c) => { const za = z0 + w + (z1 - z0 - 2 * w) * a, zb = z0 + w + (z1 - z0 - 2 * w) * b; quad(x0, za, x0 + w, zb, c); quad(x1 - w, za, x1, zb, c); });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

/** Runde Kuppe auf einem Hügel-/Gipfelblock (b.mound = Höhe). */
function mound(b, top, rnd, style) {
  const [x0, z0, x1, z1] = b.rect;
  const w = x1 - x0, d = z1 - z0, h = b.mound;
  const g = new THREE.SphereGeometry(1, 18, 8, 0, TAU, 0, Math.PI / 2);
  g.scale(w * 0.47, h, d * 0.47);
  g.translate((x0 + x1) / 2, top - 0.05, (z0 + z1) / 2);
  const snow = style === 'snowpeak';
  const a = lin(snow ? 0xffffff : 0x9ae474), c = lin(snow ? 0xd8e6fa : 0x5cb84a), rk = lin(snow ? 0xb8c8e4 : 0xb4a4cc);
  return colorize(g.toNonIndexed(), (p, n, o) => {
    mixc(c, a, smooth(0.2, 0.95, n.y), o);
    if (hash2(Math.floor(p.x / 2.5), Math.floor(p.z / 2.5)) > 0.82 && n.y < 0.85) mixc(o, rk, 0.6, o);
  });
}

/**
 * Felsige Unterseite einer schwebenden Insel: Ringe eines abgerundeten Rechtecks werden nach unten kleiner und
 * laufen in eine (versetzte) Spitze aus; flach schattierte Felsflächen (Erde oben, Fels, dunkle Spitze), dazu
 * hängende Steinzapfen, Ranken und ein paar leuchtende Kristalle (Material 'glow').
 */
function underside(x0, z0, x1, z1, y, depth, pal, rnd, style, lite = false) {
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, hw = (x1 - x0) / 2, hd = (z1 - z0) / 2;
  const N = clampv(Math.round((2 * (x1 - x0 + z1 - z0)) / 4.4), 12, 32);
  const K = 5;
  const ox = rnd.real(-0.18, 0.18) * hw, oz = rnd.real(-0.18, 0.18) * hd;
  const rings = [];
  for (let k = 0; k < K; k++) {
    const t = k / K;
    const s = k === 0 ? 0.985 : Math.pow(1 - t, 0.8);
    const yy = y - depth * Math.pow(t, 1.15);
    const ring = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU;
      const c = Math.cos(a), sn = Math.sin(a);
      const px = Math.sign(c) * Math.pow(Math.abs(c), 0.35) * hw, pz = Math.sign(sn) * Math.pow(Math.abs(sn), 0.35) * hd;
      const j = k === 0 ? 1 : 1 + rnd.real(-0.14, 0.12);
      ring.push([cx + ox * t + px * s * j, yy + (k ? rnd.real(-0.45, 0.45) * (depth / K) : 0), cz + oz * t + pz * s * j]);
    }
    rings.push(ring);
  }
  const tip = [cx + ox, y - depth, cz + oz];
  const pos = [];
  const tri = (a, b, c) => {
    // nach außen zeigen lassen (Normale weg von der Mittelachse)
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const mx = (a[0] + b[0] + c[0]) / 3 - cx, mz = (a[2] + b[2] + c[2]) / 3 - cz;
    if (nx * mx + nz * mz + ny * -0.3 < 0) pos.push(...a, ...c, ...b); else pos.push(...a, ...b, ...c);
  };
  for (let k = 0; k < K - 1; k++) {
    for (let i = 0; i < N; i++) {
      const a = rings[k][i], b = rings[k][(i + 1) % N], c = rings[k + 1][(i + 1) % N], d = rings[k + 1][i];
      tri(a, b, c); tri(a, c, d);
    }
  }
  for (let i = 0; i < N; i++) tri(rings[K - 1][i], rings[K - 1][(i + 1) % N], tip);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  const soil = lin(pal[0]), rock = lin(pal[1]), deep = lin(pal[2]);
  // ohne Schattenwurf: den Inselschatten aufs Wolkenmeer werfen Decke und Erdschichten (spart den Schattenpass)
  const out = [flat(colorize(g, (p, n, o) => {
    const t = clampv((y - p.y) / depth, 0, 1);
    if (t < 0.14) mixc(soil, rock, t / 0.14 * 0.4, o);
    else mixc(rock, deep, smooth(0.35, 1, t), o);
    const band = Math.floor((y - p.y) / 1.3) & 1;
    if (band && t > 0.14) mixc(o, [1, 1, 1], 0.06, o);
    mixc(o, [0, 0, 0], hash2(Math.round(p.x * 2), Math.round(p.z * 2 + p.y)) * 0.12, o);
  }))];
  // hängende Steinzapfen, Ranken, Kristalle
  const b = new Build(), glow = new Build();
  const nZ = clampv(Math.round((hw + hd) / 4), 2, 7);
  for (let i = 0; i < nZ; i++) {
    const k = rnd.int(2, 4), p = rings[k][rnd.int(0, N - 1)];
    const L = rnd.real(1.4, 3.4) * (depth / 14 + 0.4);
    b.cone(rnd.real(0.35, 0.8), L, { v: (px, py) => mix(pal[1], pal[2], 0.5 - py / L) }, { p: [p[0] * 0.85 + (cx + ox) * 0.15, p[1] - L / 2 + 0.2, p[2] * 0.85 + (cz + oz) * 0.15], r: [Math.PI, 0, 0] }, 5);
  }
  if (!lite && style !== 'snow' && style !== 'snowpeak' && style !== 'metal' && style !== 'fort') {
    const nV = clampv(Math.round((x1 - x0) / 5), 2, 7);
    const leaf = style === 'jungle' ? [0x2e8a3a, 0x6ad050] : [0x3e9a3e, 0x8ad86a];
    for (let i = 0; i < nV; i++) {
      // vorne (Kamera-Seite) und an den Flanken
      const side = rnd.frac();
      const vx = side < 0.7 ? rnd.real(x0 + 0.6, x1 - 0.6) : side < 0.85 ? x0 + 0.05 : x1 - 0.05;
      const vz = side < 0.7 ? z1 + 0.05 : rnd.real(z0 + 0.6, z1 - 0.6);
      const L = rnd.real(1.2, 3.6);
      b.cyl(0.05, 0.04, L, leaf[0], { p: [vx, y - L / 2 + 0.1, vz] }, 4, true);
      for (let q = 0; q < 2; q++) b.sphere(rnd.real(0.16, 0.26), { v: (px, py, pz, nx, ny) => mix(leaf[0], leaf[1], ny * 0.5 + 0.5) }, { p: [vx + rnd.real(-0.12, 0.12), y - L * (0.3 + q * 0.4), vz + 0.08] }, 5, 3);
    }
  }
  const nC = clampv(Math.round((hw + hd) / 7), 1, 4);
  for (let i = 0; i < nC; i++) {
    const k = rnd.int(1, 3), p = rings[k][rnd.int(0, N - 1)], col = CRYSTAL[rnd.int(0, CRYSTAL.length - 1)];
    for (let q = 0; q < 3; q++) {
      const h = rnd.real(0.5, 1.1);
      glow.cone(0.16, h, { v: (px, py) => mix(col, 0xffffff, py / h + 0.3) }, { p: [p[0] + rnd.real(-0.3, 0.3), p[1] - h * 0.3, p[2] + rnd.real(-0.3, 0.3)], r: [Math.PI + rnd.real(-0.4, 0.4), 0, rnd.real(-0.4, 0.4)] }, 4);
    }
  }
  if (b.parts.length) out.push(flat(b.geometry()));
  if (glow.parts.length) out.push(flat(glow.geometry(), 'glow'));
  return out;
}

/** Wolkenstraße: weiße Platte mit Wolkenkissen an den Rändern und darunter (keine Felsen). */
function cloudSlab(b, yb, rnd) {
  const [x0, z0, x1, z1] = b.rect;
  const top = b.top;
  const parts = [];
  const slab = roundedBox(x1 - x0, top - yb, z1 - z0, 0.3, SIDE.ALL, 0, 1);
  const wh = lin(0xffffff), sh = lin(0xd8e2f8);
  colorize(slab, (p, n, o) => mixc(sh, wh, smooth(-0.4, 0.9, n.y), o));
  slab.translate((x0 + x1) / 2, (top + yb) / 2, (z0 + z1) / 2);
  parts.push(slab);
  parts.push(flat(alignedGrid(x0 + 0.3, z0 + 0.3, x1 - 0.3, z1 - 0.3, top + 0.004, 2, (i, j, ax, az) => tone(checker(ax, az) ? 0xffffff : 0xf0f4ff, 0xe8eefc, rnd.frac() * 0.3))));
  const c = new Build();
  const col = { v: (x, y, z, nx, ny) => mix(0xdde4f8, 0xffffff, ny * 0.6 + 0.55) };
  const edge = (ax, az, bx, bz, nx, nz) => {
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(2, Math.round(len / 2.3));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, r = rnd.real(1.0, 1.6);
      c.sphere(r, col, { p: [ax + (bx - ax) * t + nx * r * 0.45, top - 0.55 + rnd.real(-0.2, 0.2), az + (bz - az) * t + nz * r * 0.45], s: [1, 0.78, 1] }, 10, 6);
    }
  };
  edge(x0, z1, x1, z1, 0, 1); edge(x0, z0, x1, z0, 0, -1); edge(x0, z0, x0, z1, -1, 0); edge(x1, z0, x1, z1, 1, 0);
  // Wolkenbauch
  const nb = Math.max(3, Math.round((x1 - x0) * (z1 - z0) / 60));
  for (let i = 0; i < nb; i++) {
    const r = rnd.real(2, 3.6);
    c.sphere(r, { v: (x, y, z, nx, ny) => mix(0xb4c4e8, 0xf4f8ff, ny * 0.5 + 0.5) }, { p: [rnd.real(x0 + 2, x1 - 2), yb - r * 0.2, rnd.real(z0 + 2, z1 - 2)], s: [1.2, 0.6, 1] }, 8, 5);
  }
  parts.push(flat(c.geometry()));
  return parts;
}

/** Wasserbecken (Bucht, Teich) bzw. lila Giftsee: Beckenwand, Wasserfläche (glänzend) mit hellem Rand. */
function basinParts(b, yb, rnd) {
  const [x0, z0, x1, z1] = b.rect;
  const top = b.top;
  const style = b.style;
  const parts = [];
  strata(parts, x0, yb, z0, x1, top - 0.05, z1, BANDS.basin, rnd, 0.8, 0);
  const W = style === 'poison' ? [0xd070f0, 0x9a3ad0, 0x6a1ea8] : [0x7ae8f4, 0x38b8ec, 0x1a78d0];
  const sh = lin(W[0]), mi = lin(W[1]), dp = lin(W[2]);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, hw = (x1 - x0) / 2, hd = (z1 - z0) / 2;
  const w = x1 - x0, d = z1 - z0;
  const g = new THREE.PlaneGeometry(w, d, Math.max(2, Math.round(w / 2)), Math.max(2, Math.round(d / 2)));
  g.rotateX(-Math.PI / 2);
  g.translate(cx, top, cz);
  const water = colorize(g, (p, n, o) => {
    const e = Math.min((hw - Math.abs(p.x - cx)) , (hd - Math.abs(p.z - cz)));
    if (e < 2) mixc(sh, mi, smooth(0, 2, e), o); else mixc(mi, dp, smooth(2, 7, e), o);
    if (style === 'poison' && hash2(Math.round(p.x), Math.round(p.z)) > 0.9) mixc(o, lin(0xf0b0ff), 0.4, o);
  });
  flat(water, 'stone');
  parts.push(water);
  // heller Saum am Beckenrand
  parts.push(flat(stripeBorder(x0, z0, x1, z1, top + 0.012, 0.35, style === 'poison' ? [0xf0c0ff, 0xe0a0f8] : [0xffffff, 0xe8fbff], 1.4)));
  return parts;
}

// ------------------------------------------------------------------ Wolkenkragen an den Inselrändern

/**
 * Wolkenkissen rund um die Außenkanten aller schwebenden Blöcke (Raster 1 m über die Vereinigung der Rechtecke):
 * hängen knapp unter der Grasdecke etwas nach außen – die Inseln „liegen“ auf Wolken. Ohne Schattenwurf.
 */
function cloudRims(level, map) {
  const blocks = (map.ground ?? []).filter((b) => b.top > (map.sea ?? 0) + 2 && b.style !== 'cloud' && !BASINS.has(b.style));
  const cells = new Map();
  for (const b of blocks) {
    const [x0, z0, x1, z1] = b.rect;
    for (let x = Math.floor(x0); x < Math.ceil(x1); x++) for (let z = Math.floor(z0); z < Math.ceil(z1); z++) {
      const k = `${x},${z}`;
      const yb = sideBottom(b, map);
      if (!cells.has(k) || cells.get(k).top < b.top) cells.set(k, { top: b.top, yb });
    }
  }
  // auch Becken und Wolkenstraße zählen als „Land“ (kein Kragen an der Grenze zu ihnen)
  for (const b of map.ground ?? []) {
    if (!(BASINS.has(b.style) || b.style === 'cloud')) continue;
    const [x0, z0, x1, z1] = b.rect;
    for (let x = Math.floor(x0); x < Math.ceil(x1); x++) for (let z = Math.floor(z0); z < Math.ceil(z1); z++) if (!cells.has(`${x},${z}`)) cells.set(`${x},${z}`, { top: b.top, yb: b.top - 1, skip: true });
  }
  const bridges = (map.walk ?? []);
  const onBridge = (x, z) => bridges.some((r) => x > r[0] - 1.6 && x < r[2] + 1.6 && z > r[1] - 1.6 && z < r[3] + 1.6);
  // je 16-m-Feld eine Geometrie: sie fällt in die Zone (Insel) bzw. freie Kachel ihres Feldes (keine eigenen
  // Zeichenaufrufe)
  const sectors = new Map();
  const sector = (x, z) => { const k = `${Math.floor(x / 16)}:${Math.floor(z / 16)}`; if (!sectors.has(k)) sectors.set(k, new Build()); return sectors.get(k); };
  const col = { v: (x, y, z, nx, ny) => mix(0xe2e8fa, 0xffffff, ny * 0.5 + 0.62) };
  let n = 0;
  for (const [k, c] of cells) {
    if (c.skip) continue;
    const [x, z] = k.split(',').map(Number);
    for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      if (cells.has(`${x + dx},${z + dz}`)) continue;
      const h = hash2(x * 3 + dx * 7, z * 5 + dz * 11);
      if (h > (dz < 0 ? 0.06 : dz > 0 ? 0.21 : 0.14)) continue;   // etwa jede fünfte Kante (Nordkanten selten: von der Kamera abgewandt)
      const px = x + 0.5 + dx * 0.5, pz = z + 0.5 + dz * 0.5;
      if (onBridge(px, pz)) continue;
      const r = 0.9 + h * 3.6;
      const yy = c.top - 0.9 - h * 2.6;
      sector(px, pz).sphere(r, col, { p: [px + dx * r * 0.55, yy, pz + dz * r * 0.55], s: [1.25, 0.72, 1.25] }, 10, 6);
      n++;
    }
  }
  if (!n || !level.view) return 0;
  for (const b of sectors.values()) level.view.addStatic(b.geometry(), { castShadow: false });
  return n;
}

// ------------------------------------------------------------------ Ränder (Kartenrand-Deko)

/** Wolkenhecke: weiße Wolkenkissen entlang +X. */
function cloudHedgeGeo(len, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const col = { v: (x, y, z, nx, ny) => mix(0xc8d6f2, 0xffffff, ny * 0.6 + 0.45) };
  const n = Math.max(1, Math.round(len / 0.8));
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i + 0.5) * (len / n), r = rnd.real(0.38, 0.55);
    b.sphere(r, col, { p: [x, 0.42 + rnd.real(0, 0.12), rnd.real(-0.08, 0.08)], s: [1.2, 0.95, 1] }, 9, 6);
  }
  return b.geometry();
}
/** Geländer: weiße Pfosten mit goldenen Kugeln, dazwischen ein hellblauer Handlauf. */
function skyRailGeo(len) {
  const b = new Build();
  const n = Math.max(2, Math.round(len / 1.6) + 1);
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i / (n - 1)) * len;
    b.cyl(0.07, 0.09, 0.85, 0xfaf6ff, { p: [x, 0.42, 0] }, 6);
    b.sphere(0.12, 0xffc83a, { p: [x, 0.9, 0] }, 6, 4);
  }
  b.box(len, 0.08, 0.1, 0x9ad8ff, { p: [0, 0.74, 0] }, 0);
  b.box(len, 0.05, 0.06, 0xfaf6ff, { p: [0, 0.4, 0] }, 0);
  return b.geometry();
}
/** Kaimauer: niedrige Steinkante mit dunklen Pollern und Tau. */
function quayGeo(len, seed = 1) {
  const b = new Build();
  b.box(len, 0.32, 0.5, { v: (x, y, z, nx, ny) => mix(0xa49ab8, 0xd8d0e6, ny * 0.5 + 0.5) }, { p: [0, 0.16, 0] }, 0);
  const n = Math.max(1, Math.round(len / 3));
  const pts = [];
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i + 0.5) * (len / n);
    b.cyl(0.14, 0.16, 0.55, 0x3a3448, { p: [x, 0.5, 0] }, 7);
    b.cyl(0.2, 0.2, 0.08, 0x4a4458, { p: [x, 0.78, 0] }, 7);
    pts.push([x, 0.68, 0]);
  }
  if (pts.length > 1) {
    const rope = [];
    for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < 4; k++) { const t = k / 4; rope.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, 0.68 - Math.sin(t * Math.PI) * 0.22, 0]); }
    rope.push(pts[pts.length - 1]);
    b.tube(rope, 0.035, 0xe8cc8a, null, Math.max(8, rope.length * 2), 3);
  }
  void seed;
  return b.geometry();
}
/** Bambuszaun: grüne Rohre mit Knoten, zwei Querstangen. */
function bambooFenceGeo(len, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const n = Math.max(2, Math.round(len / 0.7));
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i + 0.5) * (len / n), h = rnd.real(0.8, 1.05);
    b.cyl(0.06, 0.07, h, { v: (px, py) => (Math.abs(((py + h / 2) % 0.3) - 0.15) < 0.02 ? 0x3a7a2a : mix(0x6ab84a, 0xa8dc6a, py / h + 0.5)) }, { p: [x, h / 2, 0] }, 5);
  }
  for (const yy of [0.35, 0.7]) b.cyl(0.04, 0.04, len, 0x8ac85a, { p: [0, yy, 0.07], r: [0, 0, Math.PI / 2] }, 4);
  return b.geometry();
}
/** Felsbrocken-Mäuerchen (grau-lila). */
function rocksGeo(len, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const n = Math.max(1, Math.round(len / 0.9));
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i + 0.5) * (len / n), r = rnd.real(0.36, 0.55);
    b.add(new THREE.DodecahedronGeometry(r, 0), { v: (px, py, pz, nx, ny) => mix(0x8a7cae, 0xd8cce8, Math.max(0, ny) * 0.75 + 0.1) },
      { p: [x + rnd.real(-0.12, 0.12), r * 0.6, rnd.real(-0.1, 0.1)], r: [rnd.real(0, 3), rnd.real(0, 3), 0], s: [1.15, 0.85, 0.95] });
  }
  return b.geometry();
}
/** Schneewall: weiche Schneehügel. */
function snowBankGeo(len, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const n = Math.max(1, Math.round(len / 1.1));
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i + 0.5) * (len / n), r = rnd.real(0.5, 0.7);
    b.sphere(r, { v: (px, py, pz, nx, ny) => mix(0xc8dcf4, 0xffffff, ny * 0.6 + 0.4) }, { p: [x, 0.15, 0], s: [1.3, 0.8, 1] }, 7, 4);
  }
  return b.geometry();
}

/** Rand-Optik der Wolkeninseln nach Art, sonst null. */
export function skyEdgeGeo(kind, len, seed) {
  switch (kind) {
    case 'cloudhedge': return cloudHedgeGeo(len + 0.1, seed);
    case 'skyrail': return skyRailGeo(len);
    case 'quay': return quayGeo(len, seed);
    case 'bamboo': return bambooFenceGeo(len, seed);
    case 'rocks': return rocksGeo(len + 0.1, seed);
    case 'snowbank': return snowBankGeo(len + 0.1, seed);
    default: return null;
  }
}

// ------------------------------------------------------------------ Pflanzen und Requisiten (Kartenqualität)

const CROWN = [[0x7ad85a, 0x3e9a3a], [0xffb4d8, 0xe26aa8], [0xffc85a, 0xe8843a], [0xb4a0ff, 0x7a5ad8]];
/** Runder Spielzeugbaum (tone 0 grün, 1 rosa, 2 orange, 3 lila). */
export function skyTreeGeo(h = 4.4, toneI = 0, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const tH = h * 0.42;
  b.cyl(0.13 * h * 0.5, 0.2 * h * 0.5, tH, { v: (x, y) => mix(0x6a4228, 0x9a6a42, y / tH + 0.5) }, { p: [0, tH / 2, 0] }, 6, true);
  const [lc, dc] = CROWN[toneI % CROWN.length];
  const R = h * 0.26;
  for (const [dx, dy, dz, r] of [[0, 1.05, 0, 1.12], [-0.72, 0.62, 0.22, 0.8], [0.7, 0.7, -0.2, 0.86], [0.1, 0.55, 0.62, 0.7]]) {
    b.sphere(R * r, { v: (x, y, z, nx, ny) => mix(dc, lc, ny * 0.55 + 0.5) }, { p: [dx * R, tH + dy * R, dz * R] }, 8, 5);
  }
  if (toneI === 0) for (let i = 0; i < 4; i++) { const a = rnd.real(0, TAU); b.sphere(0.13, i % 2 ? 0xff5a6a : 0xffe04a, { p: [Math.cos(a) * R * 0.95, tH + R * rnd.real(0.7, 1.4), Math.sin(a) * R * 0.95] }, 5, 4); }
  return b.geometry();
}
/** Blumenbeet: bunte Blüten auf grünen Stielen in einer Fläche (area [w, d]). */
export function flowerBedGeo(area = [4, 1.4], seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const n = Math.max(4, Math.round(area[0] * area[1] * 1.6));
  const cols = [0xff5a8a, 0xffd23a, 0xffffff, 0xb46aff, 0x4ac8ff, 0xff8a3a];
  for (let i = 0; i < n; i++) {
    const x = rnd.real(-area[0] / 2, area[0] / 2), z = rnd.real(-area[1] / 2, area[1] / 2), h = rnd.real(0.18, 0.36);
    b.cyl(0.02, 0.02, h, 0x3e9a3a, { p: [x, h / 2, z] }, 3);
    b.sphere(rnd.real(0.09, 0.14), cols[i % cols.length], { p: [x, h, z] }, 5, 2);
  }
  return b.geometry();
}
/** Spielzeug-Pilz (tone 0 rot mit weißen Punkten, 1 blau, 2 lila). */
export function mushroomGeo(s = 1, toneI = 0) {
  const b = new Build();
  const cap = [0xff4a4a, 0x4a9aff, 0xb45aff][toneI % 3];
  b.cyl(0.22 * s, 0.28 * s, 0.6 * s, 0xfff2e0, { p: [0, 0.3 * s, 0] }, 8);
  b.dome(0.62 * s, (x, y, z) => (hash2(Math.round(x * 6), Math.round(z * 6 + y * 4)) > 0.78 ? 0xffffff : cap), { p: [0, 0.55 * s, 0], s: [1, 0.75, 1] }, Math.PI / 2, 12, 5);
  return b.geometry();
}
/** Laterne: weißer Mast mit goldener Haube (Licht separat: skyPropGlow). */
function skyLampGeo() {
  const b = new Build();
  b.cyl(0.08, 0.12, 2.6, 0xfaf6ff, { p: [0, 1.3, 0] }, 6);
  b.cyl(0.26, 0.2, 0.1, 0xffc83a, { p: [0, 2.62, 0] }, 8);
  b.cone(0.3, 0.32, 0xffc83a, { p: [0, 3.18, 0] }, 8);
  b.sphere(0.07, 0xffe07a, { p: [0, 3.38, 0] }, 5, 3);
  return b.geometry();
}
function skyLampGlowGeo() {
  const b = new Build();
  b.cyl(0.2, 0.22, 0.42, 0xfff4b0, { p: [0, 2.88, 0] }, 8);
  return b.geometry();
}
/** Runder Busch mit Blüten. */
function bushGeo(r = 0.8, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  for (const [dx, dy, dz, k] of [[0, 0.55, 0, 1], [-0.65, 0.4, 0.2, 0.75], [0.62, 0.42, -0.15, 0.72]]) b.sphere(r * k, { v: (x, y, z, nx, ny) => mix(0x3e9a3e, 0x8ae06a, ny * 0.5 + 0.5) }, { p: [dx * r, dy * r, dz * r] }, 7, 5);
  for (let i = 0; i < 5; i++) { const a = rnd.real(0, TAU); b.sphere(0.1, i % 2 ? 0xff7ab4 : 0xffffff, { p: [Math.cos(a) * r * 0.9, r * rnd.real(0.6, 1.2), Math.sin(a) * r * 0.9] }, 5, 3); }
  return b.geometry();
}
/** Fässer (zwei stehend, eins liegend). */
function barrelsGeo() {
  const b = new Build();
  const barrel = (x, z, lying) => {
    const o = lying ? { p: [x, 0.42, z], r: [0, 0, Math.PI / 2] } : { p: [x, 0.5, z] };
    b.cyl(0.4, 0.4, 1.0, { v: (px, py) => (Math.abs(py) > 0.36 || Math.abs(py) < 0.05 ? 0x5a5a6a : 0xb07a4a) }, o, 10);
  };
  barrel(0, 0, false); barrel(0.85, 0.2, false); barrel(0.3, 0.95, true);
  return b.geometry();
}
/** Kirschblütenbaum (Fernost): dunkler, geschwungener Stamm, rosa Wolkenkrone. */
function blossomGeo(h = 4.2, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const pts = [[0, 0, 0], [0.2, h * 0.25, 0.05], [-0.15, h * 0.48, 0.1], [0.25, h * 0.62, -0.05]];
  b.tube(pts, 0.2, 0x5a3a3a, null, 10, 6);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + rnd.real(-0.3, 0.3), r = h * rnd.real(0.16, 0.24);
    b.sphere(r, { v: (x, y, z, nx, ny) => mix(0xe87ab4, 0xffd4ea, ny * 0.5 + 0.5) }, { p: [Math.cos(a) * h * 0.22, h * rnd.real(0.62, 0.82), Math.sin(a) * h * 0.18] }, 7, 5);
  }
  b.sphere(h * 0.26, { v: (x, y, z, nx, ny) => mix(0xf08ac0, 0xffe0f0, ny * 0.5 + 0.5) }, { p: [0, h * 0.86, 0] }, 8, 6);
  return b.geometry();
}
/** Steinlaterne (Fernost): Sockel, Schaft, Lichthaus (Licht: skyPropGlow), geschwungenes Dach. */
function stoneLanternGeo() {
  const b = new Build();
  const st = { v: (x, y, z, nx, ny) => mix(0x9a94a8, 0xd6d0e0, ny * 0.5 + 0.5) };
  b.box(0.8, 0.2, 0.8, st, { p: [0, 0.1, 0] }, 0.04);
  b.cyl(0.16, 0.2, 0.8, st, { p: [0, 0.6, 0] }, 6);
  b.box(0.7, 0.12, 0.7, st, { p: [0, 1.05, 0] }, 0.03);
  for (const [dx, dz] of [[-0.24, -0.24], [0.24, -0.24], [-0.24, 0.24], [0.24, 0.24]]) b.box(0.1, 0.5, 0.1, st, { p: [dx, 1.36, dz] }, 0);
  b.cone(0.62, 0.42, st, { p: [0, 1.82, 0] }, 4);
  b.sphere(0.1, 0xd6d0e0, { p: [0, 2.06, 0] }, 5, 3);
  return b.geometry();
}
function stoneLanternGlowGeo() { return new Build().box(0.36, 0.4, 0.36, 0xffd27a, { p: [0, 1.36, 0] }, 0).geometry(); }
/** Bambus-Gruppe. */
function bambooGeo(s = 1, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  for (let i = 0; i < 7; i++) {
    const x = rnd.real(-0.7, 0.7) * s, z = rnd.real(-0.5, 0.5) * s, h = rnd.real(3, 4.6) * s;
    b.cyl(0.07, 0.08, h, { v: (px, py) => (Math.abs(((py + h / 2) % 0.6) - 0.3) < 0.03 ? 0x3a7a2a : mix(0x5aa83a, 0x9ad85a, py / h + 0.5)) }, { p: [x, h / 2, z], r: [rnd.real(-0.06, 0.06), 0, rnd.real(-0.06, 0.06)] }, 5);
    for (let q = 0; q < 2; q++) b.cone(0.1, 0.7, 0x6ac84a, { p: [x + 0.25, h * rnd.real(0.6, 0.95), z], r: [0, rnd.real(0, 3), -1.1] }, 3);
  }
  return b.geometry();
}
/** Farn. */
function fernGeo(seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + rnd.real(-0.2, 0.2);
    b.cone(0.18, 1.3, { v: (x, y) => mix(0x2a7a2a, 0x7ad05a, y + 0.5) }, { p: [Math.cos(a) * 0.4, 0.35, Math.sin(a) * 0.4], r: [Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1], s: [1, 1, 0.35] }, 4);
  }
  return b.geometry();
}
/** Schneetanne (eigene, falls das Modell fehlt). */
function firGeo(h = 3.4) {
  const b = new Build();
  b.cyl(0.12, 0.16, h * 0.25, 0x6a4228, { p: [0, h * 0.12, 0] }, 5);
  for (let i = 0; i < 3; i++) {
    const y = h * (0.25 + i * 0.22), r = h * (0.36 - i * 0.08);
    b.cone(r, h * 0.36, { v: (x, yy, z, nx, ny) => (ny > 0.55 ? 0xffffff : mix(0x2a7a4a, 0x4aa86a, ny + 0.4)) }, { p: [0, y + h * 0.18, 0] }, 8);
  }
  return b.geometry();
}
/** Eiskristall-Gruppe (hellblau). */
function iceCrystalGeo(s = 1, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  for (let i = 0; i < 5; i++) {
    const h = rnd.real(0.8, 1.6) * s;
    b.cyl(0.0, 0.18 * s, h, { v: (x, y) => mix(0x8ad0ff, 0xf4fcff, y / h + 0.5) }, { p: [rnd.real(-0.3, 0.3) * s, h / 2, rnd.real(-0.3, 0.3) * s], r: [rnd.real(-0.4, 0.4), 0, rnd.real(-0.4, 0.4)] }, 5);
  }
  return b.geometry();
}
/** Schneewehe: flache weiße Hügelchen (nur Optik, ohne Kollision). */
function snowDriftGeo(s = 1, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  for (let i = 0; i < 3; i++) b.sphere(s * rnd.real(0.6, 1), { v: (x, y, z, nx, ny) => mix(0xd4e4fa, 0xffffff, ny * 0.6 + 0.4) }, { p: [rnd.real(-0.6, 0.6) * s, 0, rnd.real(-0.4, 0.4) * s], s: [1.4, 0.32, 1] }, 10, 5);
  return b.geometry();
}
/** Kistenstapel (Fabrik/Mine). */
function crates6Geo() {
  const b = new Build();
  const crate = (x, y, z, s, c) => {
    b.box(s, s, s, c, { p: [x, y + s / 2, z] }, 0.04);
    b.box(s * 1.02, s * 0.12, s * 1.02, 0x7a5a3a, { p: [x, y + s * 0.5, z] }, 0);
  };
  crate(0, 0, 0, 1, 0xd8a46a); crate(1.05, 0, 0.1, 0.9, 0xc89058); crate(0.45, 1, 0.05, 0.85, 0xe0b07a);
  return b.geometry();
}
/** Zahnrad (liegend oder stehend) als Geometrie: Kranz mit Zähnen, Speichen, Nabe. */
export function gearGeo(R = 1, w = 0.3, color = 0xc8a040, teeth = 12) {
  const b = new Build();
  b.torus(R * 0.82, R * 0.12, color, null, 5, Math.max(12, teeth * 2));
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * TAU;
    b.box(R * 0.24, R * 0.26, w, color, { p: [Math.cos(a) * R * 0.98, Math.sin(a) * R * 0.98, 0], r: [0, 0, a] }, 0);
  }
  for (let i = 0; i < 4; i++) b.box(R * 1.5, R * 0.1, w * 0.7, color, { r: [0, 0, (i / 4) * Math.PI] }, 0);
  b.cyl(R * 0.2, R * 0.2, w * 1.4, 0x5a5a6a, { r: [Math.PI / 2, 0, 0] }, 10);
  return b.geometry();
}
/** Haufen liegender Zahnräder. */
function gearPileGeo() {
  const b = new Build();
  const g1 = gearGeo(1, 0.3, 0xc8a040, 10); g1.rotateX(-Math.PI / 2); g1.translate(0, 0.18, 0); b.parts.push(g1);
  const g2 = gearGeo(0.7, 0.25, 0x9aa6b8, 9); g2.rotateX(-Math.PI / 2 + 0.3); g2.translate(1.3, 0.5, 0.3); b.parts.push(g2);
  const g3 = gearGeo(0.55, 0.22, 0xd86a4a, 8); g3.rotateX(-Math.PI / 2); g3.translate(-0.4, 0.42, 0.6); b.parts.push(g3);
  return b.geometry();
}

/** Geometrie einer Welt-6-Requisite (map.props), sonst null. */
export function skyPropGeo(it, seed) {
  switch (it.kind) {
    case 'skytree': return skyTreeGeo(it.size ?? 4.4, it.tone ?? 0, seed);
    case 'flowerbed': return flowerBedGeo(it.area ?? [4, 1.4], seed);
    case 'mushroom': return mushroomGeo(it.size ?? 1, it.tone ?? 0);
    case 'skylamp': return skyLampGeo();
    case 'bush6': return bushGeo(it.size ?? 0.8, seed);
    case 'barrels': return barrelsGeo();
    case 'blossom': return blossomGeo(it.size ?? 4.2, seed);
    case 'stonelantern': return stoneLanternGeo();
    case 'bamboo': return bambooGeo(it.size ?? 1, seed);
    case 'jungletree6': return jungleTreeGeo(it.size ?? 5, seed);
    case 'fern': return fernGeo(seed);
    case 'fir': return firGeo(it.size ?? 3.4);
    case 'snowman': return snowmanGeo();
    case 'icecrystal': return iceCrystalGeo(it.size ?? 1, seed);
    case 'snowdrift': return snowDriftGeo(it.size ?? 1, seed);
    case 'crates6': return crates6Geo();
    case 'gearpile': return gearPileGeo();
    case 'balloons6': return balloonsGeo(seed);
    case 'drum6': return drumGeo(it.size ?? 1, it.tone ? 0x3a7ae8 : 0xe8283a);
    default: return null;
  }
}
function snowmanGeo() {
  const b = new Build();
  b.sphere(0.6, 0xffffff, { p: [0, 0.55, 0] }, 10, 7);
  b.sphere(0.42, 0xffffff, { p: [0, 1.32, 0] }, 10, 7);
  b.sphere(0.3, 0xffffff, { p: [0, 1.88, 0] }, 9, 6);
  b.cone(0.06, 0.32, 0xff8a1a, { p: [0, 1.88, 0.42], r: [Math.PI / 2, 0, 0] }, 5);
  b.cyl(0.24, 0.26, 0.3, 0x3a3a4a, { p: [0, 2.24, 0] }, 8);
  b.torus(0.3, 0.07, 0xff4a6a, { p: [0, 1.6, 0], r: [Math.PI / 2, 0, 0] }, 4, 12);
  return b.geometry();
}

/** Leuchtende Teile einer Welt-6-Requisite (Material 'glow'), sonst null. */
export function skyPropGlow(it) {
  switch (it.kind) {
    case 'skylamp': return skyLampGlowGeo();
    case 'stonelantern': return stoneLanternGlowGeo();
    default: return null;
  }
}

/** Kollision einer Welt-6-Requisite (begehbares Gelände): Zylinder/Quader oder null. */
export function skyPropShape(it) {
  const [x, y, z] = it.pos;
  const s = it.size ?? 1;
  const cyl = (r, h) => ({ type: 'cyl', x, z, r, y0: y - 0.2, y1: y + h, tag: `deko:${it.kind}` });
  switch (it.kind) {
    case 'skytree': case 'blossom': case 'jungletree6': return cyl(0.35, 3);
    case 'mushroom': return cyl(0.6 * s, 0.9 * s);
    case 'skylamp': case 'stonelantern': return cyl(0.3, 2.6);
    case 'bush6': return cyl(0.85 * s, 1.1 * s);
    case 'barrels': return { type: 'box', min: [x - 0.5, y - 0.2, z - 0.5], max: [x + 1.35, y + 1, z + 1.45], tag: 'deko:faesser' };
    case 'bamboo': return cyl(0.75 * s, 3);
    case 'fir': return cyl(0.5, 3);
    case 'snowman': return cyl(0.6, 2);
    case 'icecrystal': return cyl(0.45 * s, 1.2);
    case 'crates6': return { type: 'box', min: [x - 0.55, y - 0.2, z - 0.55], max: [x + 1.55, y + 1.85, z + 0.6], tag: 'deko:kisten' };
    case 'gearpile': return cyl(1.4, 0.8);
    case 'drum6': return cyl(0.9 * s, 0.9 * s);
    default: return null;
  }
}

// Kandidaten je Requisite: [Name, Optionen, Dreiecks-Obergrenze] – Welt-6-Kulissen der Registry (models/kinds/*_w6.js,
// sobald es sie gibt), sonst eigene Geometrie (skyPropGeo).
const W6_PROP_MODELS = {
  skytree: (it) => [['deco_w6_baum', { height: it.size ?? 4.4, tone: it.tone ?? 0 }, 2500], ['wolkenbaum', { height: it.size ?? 4.4 }, 2500]],
  mushroom: (it) => [['deco_w6_pilz', { size: it.size ?? 1 }, 1500]],
  blossom: (it) => [['deco_w6_kirschbaum', { height: it.size ?? 4.2 }, 3000], ['kirschbaum', { height: it.size ?? 4.2 }, 3000]],
  stonelantern: () => [['deco_w6_steinlaterne', {}, 1500], ['steinlaterne', {}, 1500]],
  bamboo: (it) => [['deco_w6_bambus', { size: it.size ?? 1 }, 2000], ['bambus', { height: 4 * (it.size ?? 1) }, 2000]],
};

/** Requisite (map.props, Welt 6) → Registry-Kulisse [name, opts, yaw-Korrektur, scale], sonst null. */
export function skyPropModel(it, cap = Infinity) {
  const f = W6_PROP_MODELS[it.kind];
  if (!f) return null;
  for (const [name, opts, max] of f(it)) if (hasModel(name) && modelTris(name, opts) <= Math.min(cap, max)) return [name, opts, -Math.PI / 2, 1];
  return null;
}

// ------------------------------------------------------------------ Streudeko

/**
 * Streudeko auf nicht begehbaren Blöcken (deterministisch): Bäume, Büsche und Blumen auf Hügeln, Fels-Grasbüschel,
 * Tannen und Eiskristalle auf Schneegipfeln. Dazu die Wolkenkragen um alle Inselränder.
 */
export function scatterSky(level, map, grid) {
  const parts = [], flatParts = [];
  map.ground.forEach((b, i) => {
    const style = b.style ?? 'meadow';
    if (b.walk || b.noDeco || BASINS.has(style) || style === 'cloud') return;
    const [x0, z0, x1, z1] = b.rect;
    const w = x1 - x0, d = z1 - z0;
    if (w < 2.5 || d < 2.5) return;
    const [cx, cz] = [(x0 + x1) / 2, (z0 + z1) / 2];
    if (grid.isWalk(cx, cz)) return;
    const rnd = new Rnd(0x51a6 + i * 131);
    const pts = [];
    const tooClose = (x, z, r) => pts.some((p) => Math.hypot(p[0] - x, p[1] - z) < r);
    const area = w * d;
    // Höhe auf der Kuppe (b.mound): Ellipsoid
    const yAt = (x, z) => {
      if (!b.mound) return b.top;
      const u = (x - cx) / (w * 0.47), v = (z - cz) / (d * 0.47), q = 1 - u * u - v * v;
      return b.top - 0.05 + (q > 0 ? Math.sqrt(q) * b.mound : 0);
    };
    const put = (n, minD, make, list = parts) => {
      for (let k = 0, tries = 0; k < n && tries < n * 14; tries++) {
        const x = rnd.real(x0 + 1.1, x1 - 1.1), z = rnd.real(z0 + 1.1, z1 - 1.1);
        if (tooClose(x, z, minD)) continue;
        pts.push([x, z]);
        const g = make(rnd);
        if (g) list.push(place(g, x, yAt(x, z) - 0.1, z, rnd.real(0, TAU)));
        k++;
      }
    };
    switch (style) {
      case 'hill':
        put(Math.max(2, Math.floor(area / 70)), 3.2, (r) => skyTreeGeo(r.real(3.6, 5), r.int(0, 3), r.int(1, 999)));
        put(Math.floor(area / 70), 1.8, (r) => bushGeo(r.real(0.6, 0.9), r.int(1, 999)));
        put(Math.floor(area / 70), 1.6, (r) => flowerBedGeo([1.6, 1.2], r.int(1, 999)), flatParts);
        return;
      case 'snowpeak':
        put(Math.max(2, Math.floor(area / 50)), 3, (r) => firGeo(r.real(2.8, 4)));
        put(Math.floor(area / 90), 2, (r) => iceCrystalGeo(r.real(0.7, 1.1), r.int(1, 999)));
        return;
      case 'rock':
        put(Math.floor(area / 40), 2, (r) => (r.frac() < 0.5 ? bushGeo(r.real(0.5, 0.7), r.int(1, 999)) : rocksGeo(1.2, r.int(1, 999))));
        return;
      default:
        put(Math.floor(area / 80), 3, (r) => skyTreeGeo(r.real(3.4, 4.6), r.int(0, 3), r.int(1, 999)));
    }
  });
  for (const g of parts) level.view?.addStatic(g, { castShadow: true });
  for (const g of flatParts) level.view?.addStatic(g, { castShadow: false });
  cloudRims(level, map);
}

// ------------------------------------------------------------------ Brücken (Weltdaten segments)

/** Brücke in lokalen Koordinaten (x entlang, y oben, z quer) bauen und an from/to setzen. */
function placeAlong(g, a, c) {
  const dx = c[0] - a[0], dz = c[2] - a[2], L = Math.hypot(dx, dz);
  g.rotateY(Math.atan2(-dz / L, dx / L));
  g.translate(a[0], a[1], a[2]);
  return g;
}

/**
 * Glas-Bogenschale um einen Steg: Kreis (Radius R, Mitte h über dem Boden) ohne das Stück unter dem Boden; in lokalen
 * Koordinaten entlang +X der Länge Ld, Steigung über pitch. Liefert Geometrie mit Vertexfarben.
 */
function glassShell(Ld, R, h, pitch, segL, color) {
  const gap = Math.acos(Math.min(0.999, h / R));      // halber Öffnungswinkel unten (vom Lot aus)
  const M = 22;
  const pos = [];
  const pt = (u, k) => {
    const phi = -Math.PI / 2 + gap + (k / M) * (TAU - 2 * gap);   // ab unten rechts über oben nach unten links
    const yy = h + Math.sin(phi) * R, zz = Math.cos(phi) * R;
    return [u * Math.cos(pitch) - yy * Math.sin(pitch), u * Math.sin(pitch) + yy * Math.cos(pitch), zz];
  };
  const S = Math.max(1, Math.round(Ld / segL));
  for (let s = 0; s < S; s++) {
    const u0 = (s / S) * Ld, u1 = ((s + 1) / S) * Ld;
    for (let k = 0; k < M; k++) {
      const a = pt(u0, k), b = pt(u1, k), c = pt(u1, k + 1), d = pt(u0, k + 1);
      pos.push(...a, ...b, ...c, ...a, ...c, ...d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  const c0 = lin(color), c1 = lin(0xffffff);
  return colorize(g, (p, n, o) => mixc(c0, c1, smooth(h + R * 0.4, h + R, p.y - p.x * Math.sin(pitch)) * 0.5, o));
}

/** Begehbare Glasröhre zwischen zwei Inseln: heller Glasboden mit Leuchtkanten, Glasschale, weiße Ringe, Goldkragen. */
function buildGlassTube(level, spec) {
  buildBridge({ world: level.world, view: null }, { ...spec, rails: false });
  if (!level.view) return;
  const a = spec.from, c = spec.to;
  const L = Math.hypot(c[0] - a[0], c[2] - a[2]), dy = c[1] - a[1], pitch = Math.atan2(dy, L), Ld = Math.hypot(L, dy);
  const w = spec.width ?? 4, R = w / 2 + 0.75, h = Math.sqrt(R * R - (w / 2) * (w / 2));
  const b = new Build();
  // Boden: weiße Platte, hellblaue Glasfelder, goldene Kanten
  b.box(Ld + 0.1, 0.22, w, 0xe8f2ff, { p: [L / 2, dy / 2 - 0.11, 0], r: [0, 0, pitch] }, 0);
  const np = Math.max(1, Math.round(Ld / 1.2));
  for (let i = 0; i < np; i++) {
    const u = ((i + 0.5) / np) * Ld;
    b.box(Ld / np - 0.12, 0.02, w - 0.7, i & 1 ? 0xbfe8ff : 0xd8f2ff, { p: [u * Math.cos(pitch), u * Math.sin(pitch) + 0.012, 0], r: [0, 0, pitch] }, 0);
  }
  for (const s of [-1, 1]) b.box(Ld + 0.1, 0.12, 0.18, 0xffc83a, { p: [L / 2, dy / 2 + 0.02, s * (w / 2 - 0.09)], r: [0, 0, pitch] }, 0);
  // Ringe (weiß) und Kragen an den Enden (gold): Torus-Bogen ohne das Stück unter dem Boden
  const gap = Math.acos(Math.min(0.999, h / R));
  const ring = (u, col, t) => {
    const g = new THREE.TorusGeometry(R + 0.02, t, 4, 26, TAU - 2 * gap);
    g.rotateZ(-Math.PI / 2 + gap);
    g.translate(0, h, 0);
    g.rotateY(Math.PI / 2);
    g.translate(u * Math.cos(pitch), u * Math.sin(pitch), 0);
    b.add(g, col);
  };
  const nR = Math.max(1, Math.round(Ld / 3.2));
  for (let i = 1; i < nR; i++) ring((i / nR) * Ld, 0xffffff, 0.08);
  ring(0.15, 0xffc83a, 0.18); ring(Ld - 0.15, 0xffc83a, 0.18);
  const g = b.geometry();
  level.view.addStatic(placeAlong(g, a, c), { castShadow: true });
  // Leuchtkanten am Boden
  const gl = new Build();
  for (const s of [-1, 1]) gl.box(Ld, 0.03, 0.08, 0x8af0ff, { p: [L / 2, dy / 2 + 0.09, s * (w / 2 - 0.26)], r: [0, 0, pitch] }, 0);
  level.view.addStatic(placeAlong(gl.geometry(), a, c), { material: 'glow', castShadow: false, tile: 'w6:leuchten' });
  // Glasschale (durchscheinend, view.mats.w6glass)
  level.view.addStatic(placeAlong(glassShell(Ld, R, h, pitch, 4, 0xa8e4ff), a, c), { material: 'w6glass', castShadow: false, tile: 'w6:glas' });
}

/** Wolkenbrücke: weißer Steg aus Wolkenkissen, seitlich Wolkenpolster als Geländer. */
function buildCloudBridge(level, spec) {
  buildBridge({ world: level.world, view: null }, { ...spec, rails: false });
  if (!level.view) return;
  const a = spec.from, c = spec.to;
  const L = Math.hypot(c[0] - a[0], c[2] - a[2]), dy = c[1] - a[1], pitch = Math.atan2(dy, L), Ld = Math.hypot(L, dy);
  const w = spec.width ?? 4;
  const rnd = new Rnd(Math.round(L * 31 + a[0] * 7 + a[2] * 3));
  const b = new Build();
  b.box(Ld + 0.4, 0.5, w + 0.2, { v: (x, y, z, nx, ny) => mix(0xd4def6, 0xffffff, ny * 0.6 + 0.5) }, { p: [L / 2, dy / 2 - 0.25, 0], r: [0, 0, pitch] }, 0.2, 1);
  const col = { v: (x, y, z, nx, ny) => mix(0xdce4f8, 0xffffff, ny * 0.6 + 0.55) };
  const n = Math.max(3, Math.round(Ld / 1.5));
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * Ld;
    for (const s of [-1, 1]) b.sphere(rnd.real(0.48, 0.66), col, { p: [u * Math.cos(pitch), u * Math.sin(pitch) + 0.3, s * (w / 2 + 0.05)], s: [1.2, 0.85, 1] }, 11, 7);
    if (i % 2 === 0) b.sphere(rnd.real(1.1, 1.5), col, { p: [u * Math.cos(pitch), u * Math.sin(pitch) - 0.8, rnd.real(-1, 1)], s: [1.3, 0.7, 1.2] }, 7, 4);
  }
  level.view.addStatic(placeAlong(b.geometry(), a, c), { castShadow: true });
}

/** Rote Bogenbrücke (Fernost): rote Planken, Geländer mit goldenen Knäufen, Querbalken darunter. */
function buildRedBridge(level, spec) {
  buildBridge({ world: level.world, view: null }, { ...spec, rails: false });
  if (!level.view) return;
  const a = spec.from, c = spec.to;
  const L = Math.hypot(c[0] - a[0], c[2] - a[2]), dy = c[1] - a[1], pitch = Math.atan2(dy, L), Ld = Math.hypot(L, dy);
  const w = spec.width ?? 4;
  const b = new Build();
  const np = Math.max(2, Math.round(Ld / 0.5));
  for (let i = 0; i < np; i++) {
    const u = ((i + 0.5) / np) * Ld;
    b.box(Ld / np - 0.05, 0.16, w, i & 1 ? 0xd8402a : 0xe8543a, { p: [u * Math.cos(pitch), u * Math.sin(pitch) - 0.08, 0], r: [0, 0, pitch] }, 0);
  }
  for (const s of [-1, 1]) {
    b.box(Ld + 0.2, 0.3, 0.2, 0x8a2a1e, { p: [L / 2, dy / 2 - 0.25, s * (w / 2 - 0.1)], r: [0, 0, pitch] }, 0);
    const nP = Math.max(2, Math.round(Ld / 1.8) + 1);
    for (let i = 0; i < nP; i++) {
      const u = (i / (nP - 1)) * Ld;
      b.box(0.16, 1.0, 0.16, 0xe03a2a, { p: [u * Math.cos(pitch), u * Math.sin(pitch) + 0.5, s * (w / 2 - 0.1)] }, 0.03);
      b.sphere(0.12, 0xffc83a, { p: [u * Math.cos(pitch), u * Math.sin(pitch) + 1.08, s * (w / 2 - 0.1)] }, 6, 4);
    }
    b.box(Ld, 0.1, 0.12, 0xe8543a, { p: [L / 2, dy / 2 + 0.9, s * (w / 2 - 0.1)], r: [0, 0, pitch] }, 0);
  }
  for (let i = 0; i <= 3; i++) { const u = (i / 3) * Ld; b.box(0.3, 0.3, w + 0.6, 0x6a2018, { p: [u * Math.cos(pitch), u * Math.sin(pitch) - 0.4, 0] }, 0); }
  level.view.addStatic(placeAlong(b.geometry(), a, c), { castShadow: true });
}

const RAINBOW = [0xff4a4a, 0xff9a2a, 0xffe04a, 0x5ad85a, 0x4ab4ff, 0x5a6aff, 0xb05aff];
/** Regenbogenbrücke: Planken in sieben Farbstreifen (quer), weiße Wolken an beiden Enden, Glitzer-Geländer. */
function buildRainbowBridge(level, spec) {
  buildBridge({ world: level.world, view: null }, { ...spec, rails: false });
  if (!level.view) return;
  const a = spec.from, c = spec.to;
  const L = Math.hypot(c[0] - a[0], c[2] - a[2]), dy = c[1] - a[1], pitch = Math.atan2(dy, L), Ld = Math.hypot(L, dy);
  const w = spec.width ?? 4;
  const b = new Build();
  b.box(Ld + 0.1, 0.24, w, 0xffffff, { p: [L / 2, dy / 2 - 0.13, 0], r: [0, 0, pitch] }, 0);
  const sw = w / RAINBOW.length;
  RAINBOW.forEach((col, i) => b.box(Ld + 0.1, 0.03, sw, col, { p: [L / 2, dy / 2 + 0.005, -w / 2 + sw * (i + 0.5)], r: [0, 0, pitch] }, 0));
  const col = { v: (x, y, z, nx, ny) => mix(0xc4d2f0, 0xffffff, ny * 0.6 + 0.45) };
  const rnd = new Rnd(7);
  for (const u of [0.4, Ld - 0.4]) for (let k = 0; k < 5; k++) b.sphere(rnd.real(0.7, 1.1), col, { p: [u * Math.cos(pitch) + rnd.real(-0.6, 0.6), u * Math.sin(pitch) - 0.5, (k - 2) * 1.1], s: [1.2, 0.7, 1] }, 10, 7);
  for (const s of [-1, 1]) {
    const nP = Math.max(2, Math.round(Ld / 2) + 1);
    for (let i = 0; i < nP; i++) {
      const u = (i / (nP - 1)) * Ld;
      b.cyl(0.06, 0.08, 0.8, 0xffffff, { p: [u * Math.cos(pitch), u * Math.sin(pitch) + 0.4, s * (w / 2 + 0.05)] }, 5);
      b.sphere(0.13, RAINBOW[i % RAINBOW.length], { p: [u * Math.cos(pitch), u * Math.sin(pitch) + 0.86, s * (w / 2 + 0.05)] }, 6, 4);
    }
  }
  level.view.addStatic(placeAlong(b.geometry(), a, c), { castShadow: true });
}

/** Welt-6-Brücke bauen (segments); false = unbekannte Art. */
export function buildSkySegment(level, seg) {
  switch (seg.type) {
    case 'glasstube': buildGlassTube(level, seg); return true;
    case 'cloudbridge': buildCloudBridge(level, seg); return true;
    case 'redbridge': buildRedBridge(level, seg); return true;
    case 'rainbowbridge': buildRainbowBridge(level, seg); return true;
    default: return false;
  }
}

// ------------------------------------------------------------------ Wolkenmeer (statt Meer, Schaum, Glitzern)

const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _pp = new THREE.Vector3();

/**
 * Wolkenmeer tief unter den Inseln: helle Fläche (weiß nah an den Inseln, lavendelblau draußen, empfängt die Schatten
 * der Inseln), dazu treibende Wolkenkuppen als eine Instanz-Fläche (beleuchtet, ohne Schattenwurf).
 */
export class CloudSea {
  constructor(view, map, bounds, scenery) {
    this.view = view;
    this.group = new THREE.Group();
    this.group.name = 'karte:wolkenmeer';
    this.own = [];
    const sea = map.sea ?? 0;
    const [c0, c1, c2] = map.seaColors ?? [0xffffff, 0xf0f0ff, 0xd6dcf8];
    const cx = (bounds.min.x + bounds.max.x) / 2, cz = (bounds.min.z + bounds.max.z) / 2;
    const w = bounds.max.x - bounds.min.x + 160, d = bounds.max.z - bounds.min.z + 160;
    const g0 = new THREE.PlaneGeometry(w, d, Math.ceil(w / 8), Math.ceil(d / 8));
    g0.rotateX(-Math.PI / 2);
    g0.translate(cx, sea, cz);
    const a = lin(c0), b = lin(c1), c = lin(c2);
    const g = colorize(g0, (p, n, o) => { const dd = scenery.distToLand(p.x, p.z); if (dd < 14) mixc(a, b, smooth(0, 14, dd), o); else mixc(b, c, smooth(14, 70, dd), o); });
    g0.dispose();
    const mat = this.track(new THREE.MeshLambertMaterial({ vertexColors: true }));
    const inner = new THREE.Mesh(this.track(g), mat);
    inner.receiveShadow = true;
    inner.name = 'wolkenmeer';
    const og = new THREE.PlaneGeometry(2400, 2400, 1, 1);
    og.rotateX(-Math.PI / 2);
    og.translate(cx, sea - 0.05, cz);
    const outer = new THREE.Mesh(this.track(og), this.track(new THREE.MeshBasicMaterial({ color: c2, fog: true })));
    outer.name = 'wolkenmeer:fern';
    for (const m of [inner, outer]) { m.matrixAutoUpdate = false; m.updateMatrix(); this.group.add(m); }
    // Wolkenkuppen
    const rnd = new Rnd(0xc10d6);
    const data = [];
    const x0 = bounds.min.x - 90, x1 = bounds.max.x + 90, z0 = bounds.min.z - 90, z1 = bounds.max.z + 70;
    for (let i = 0; i < 600 && data.length < 90; i++) {
      const x = rnd.real(x0, x1), z = rnd.real(z0, z1);
      const near = scenery.distToLand(x, z);
      if (near < 2 && rnd.frac() < 0.6) continue;
      const s = rnd.real(6, 16);
      data.push({ x, z, y: sea + rnd.real(-0.6, 0.4), sx: s * rnd.real(1, 1.5), sy: s * rnd.real(0.22, 0.38), sz: s, v: rnd.real(0.25, 0.55), ph: rnd.real(0, TAU), xa: x0, xb: x1 });
    }
    const top = lin(0xffffff), bot = lin(0xe0e4f8);
    const dome = colorize(new THREE.SphereGeometry(1, 11, 4, 0, TAU, 0, Math.PI / 2), (p, n, o) => mixc(bot, top, smooth(0, 0.8, n.y), o));
    this.puffs = new THREE.InstancedMesh(this.track(dome), this.track(new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x8a8eaa, emissiveIntensity: 0.32 })), data.length);
    this.puffs.receiveShadow = true;
    this.puffs.castShadow = false;
    this.puffs.frustumCulled = false;
    this.puffs.name = 'wolkenmeer:kuppen';
    this.data = data;
    this.place(0);
    this.group.add(this.puffs);
    scenery.group.add(this.group);
  }

  track(x) { this.own.push(x); return x; }

  place(t) {
    _q.identity();
    this.data.forEach((c, i) => {
      let x = c.x + c.v * t;
      const span = c.xb - c.xa;
      x = c.xa + ((((x - c.xa) % span) + span) % span);
      _p.set(x, c.y + Math.sin(t * 0.4 + c.ph) * 0.15, c.z);
      _s.set(c.sx, c.sy * (1 + 0.05 * Math.sin(t * 0.6 + c.ph)), c.sz);
      _m4.compose(_p, _q, _s);
      this.puffs.setMatrixAt(i, _m4);
    });
    this.puffs.instanceMatrix.needsUpdate = true;
  }

  update(t) { this.place(t); }

  dispose() {
    this.group.parent?.remove(this.group);
    this.puffs?.dispose();
    for (const x of this.own) x.dispose?.();
    this.own.length = 0;
  }
}

/** Kleine schwebende Insel (Kulisse über dem Wolkenmeer): Grasdecke, felsige Unterseite, Baum oder Blumen. */
export function skyIsletParts(x, z, w, d, top, rnd) {
  const y = rnd.real(5, 15);
  const b = { rect: [x - w / 2, z - d / 2, x + w / 2, z + d / 2], top: y, style: rnd.frac() < 0.75 ? 'meadow' : 'stone', under: { depth: rnd.real(3, 6), lite: true } };
  const parts = skyGround(b, -3, THEMES.map_sky, rnd, null);
  const k = rnd.frac();
  if (k < 0.55) parts.push(place(skyTreeGeo(rnd.real(2.8, 3.8), rnd.int(0, 3), rnd.int(1, 999)), x + rnd.real(-0.6, 0.6), y, z + rnd.real(-0.5, 0.5), rnd.real(0, 6)));
  else if (k < 0.8) parts.push(place(mushroomGeo(rnd.real(0.8, 1.2), rnd.int(0, 2)), x, y, z, 0));
  else parts.push(place(flowerBedGeo([w * 0.6, d * 0.5], rnd.int(1, 99)), x, y, z, 0));
  void top;
  return parts;
}

/**
 * Ferne Nachbarwelten im Wolkenmeer: 'sky' (Wolkeninseln – Ausblick aus Welt 5) und 'lavafort' (dunkle Vulkaninsel
 * mit Festung und Lavaschein – Ziel der Röhre nach Welt 7).
 */
export function skyNeighborParts(nb, rnd) {
  const [x, z] = nb.pos;
  const [w, d] = nb.size ?? [80, 54];
  const parts = [];
  if (nb.style === 'sky') {
    for (const [a, c, e, f, top] of [[-0.45, -0.2, 0.05, 0.3, 26], [0.1, -0.45, 0.45, -0.05, 34], [-0.2, 0.25, 0.25, 0.5, 18]]) {
      parts.push(...skyGround({ rect: [x + a * w, z + c * d, x + e * w, z + f * d], top, under: { depth: 14 } }, -3, THEMES.map_sky, rnd, null));
    }
    parts.push(place(skyTreeGeo(6, 1, 3), x - 0.2 * w, 26, z + 0.05 * d), place(skyTreeGeo(5, 0, 4), x + 0.3 * w, 34, z - 0.25 * d));
  } else if (nb.style === 'lavafort') {
    const B = new Build();
    B.cone(w * 0.42, 30, { v: (px, py) => mix(0x2a2230, 0x5a4a5a, py / 30 + 0.5) }, { p: [x, 13, z] }, 14);
    B.cone(w * 0.6, 10, 0x3a2e3a, { p: [x, 3, z] }, 14);
    B.box(16, 12, 12, 0x4a3e4e, { p: [x - 6, 30, z + 4] }, 0);
    for (const s of [-1, 1]) { B.cyl(3, 3.4, 18, 0x4a3e4e, { p: [x - 6 + s * 9, 33, z + 4] }, 8); B.cone(4, 5, 0xc4304e, { p: [x - 6 + s * 9, 44.5, z + 4] }, 8); }
    B.cone(5.6, 8, 0xc4304e, { p: [x - 6, 40, z + 4] }, 4);
    // Lavaströme (leuchtend rot-orange, unbeleuchtet wirken sie im Dunst wie Glut)
    for (let i = 0; i < 4; i++) { const a = -1.2 + i * 0.7; B.box(1.6, 20, 0.6, 0xff6a1a, { p: [x + Math.cos(a) * w * 0.2, 10, z + Math.sin(a) * d * 0.2 + w * 0.12], r: [0.5, a, 0] }, 0); }
    parts.push(B.geometry());
  }
  for (const p of parts) for (const k of Object.keys(p.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') p.deleteAttribute(k);
  return parts;
}

/** Wolkentürme und ferne Schwebeinseln am Horizont (unbeleuchtet, ein Mesh) – Kulisse des Themas map_sky. */
export function skyBackdrop(sky, bounds, rnd) {
  const parts = [];
  const x0 = bounds.min.x, x1 = bounds.max.x, z0 = bounds.min.z, z1 = bounds.max.z;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const R = Math.max(x1 - x0, z1 - z0) / 2 + 150;
  const top = lin(0xffffff), mid = lin(0xeae6fa), bot = lin(0xc8c6ec);
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * TAU + rnd.real(-0.08, 0.08);
    const r = R + rnd.real(-20, 40);
    const bx = cx + Math.cos(a) * r, bz = cz + Math.sin(a) * r;
    const h = rnd.real(30, 70), n = rnd.int(3, 4);
    for (let k = 0; k < n; k++) {
      const rr = rnd.real(15, 28) * (1 - k * 0.12);
      const g = new THREE.SphereGeometry(1, 9, 6);
      g.scale(rr, rr * 0.85, rr * 0.8);
      g.translate(bx + rnd.real(-12, 12), -12 + (h * (k + 0.5)) / n, bz + rnd.real(-8, 8));
      parts.push(colorize(g, (p, nn, o) => { mixc(bot, mid, smooth(-0.6, 0.2, nn.y), o); mixc(o, top, smooth(0.2, 0.9, nn.y), o); }));
    }
  }
  // ferne Schwebeinseln (Silhouetten: grüne Decke, lila Unterseite)
  const gr = lin(0xa4dc8a), ud = lin(0xa898cc);
  for (let i = 0; i < 9; i++) {
    const a = rnd.real(0, TAU), r = R - rnd.real(30, 70);
    const bx = cx + Math.cos(a) * r, bz = cz + Math.sin(a) * r, s = rnd.real(8, 16), y = rnd.real(20, 50);
    const g = new THREE.ConeGeometry(s, s * 1.4, 8, 1);
    g.rotateX(Math.PI);
    g.translate(bx, y - s * 0.7, bz);
    parts.push(colorize(g, (p, nn, o) => mixc(ud, gr, smooth(y - 1.2, y, p.y), o)));
    const t = new THREE.CylinderGeometry(s * 1.02, s, 1.4, 8);
    t.translate(bx, y + 0.4, bz);
    parts.push(colorize(t, (p, nn, o) => { o[0] = gr[0]; o[1] = gr[1]; o[2] = gr[2]; }));
  }
  const g = merge(parts);
  if (!g) return;
  const mesh = new THREE.Mesh(sky.track(g), sky.track(new THREE.MeshBasicMaterial({ vertexColors: true, fog: true })));
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  sky.group.add(mesh);
}

// ------------------------------------------------------------------ Lebendige Kulisse: Windräder, Luftschiffchen, Wasserfälle, Regenbögen

/** Tempo der Kartenmusik (Ersatzuhr, falls keine Musik läuft). */
let mapBpm = 0;
export const MAP_BPM6 = () => mapBpm || (mapBpm = music.themeInfo?.('course_world6_map')?.bpm ?? music.themeInfo?.('course_map')?.bpm ?? 120);
/** Taktuhr: Zählzeit aus music.beat() (Kartenmusik), sonst aus der Bildzeit im Tempo der Kartenmusik. */
export function beatNow6(t) {
  const mb = music.beat();
  const useMusic = mb.bpm > 0 && mb.playing;
  return { beat: useMusic ? mb.beat : (t * MAP_BPM6()) / 60, source: useMusic ? mb.source : 'zeit', theme: mb.theme ?? null, bpm: useMusic ? mb.bpm : MAP_BPM6() };
}
export const WIND_STEPS = 8;   // Flügelstellungen je Umdrehung (eine je Zählzeit)

/** Windrad-Turm (weiß, rotes Dach, Tür, Fenster) mit Fußpunkt im Ursprung, Nabe bei (0, h, 0.55). */
function windTowerGeo(h) {
  const b = new Build();
  b.cyl(0.62, 1.0, h, { v: (x, y) => mix(0xe8e4f4, 0xffffff, y / h + 0.5) }, { p: [0, h / 2, 0] }, 10);
  b.cone(1.0, 1.1, 0xe84a5a, { p: [0, h + 0.5, 0] }, 10);
  b.box(0.5, 0.9, 0.12, 0x9a6a42, { p: [0, 0.45, 0.88] }, 0.03);
  b.sphere(0.18, 0x8ad8ff, { p: [0, h * 0.62, 0.72], s: [1, 1, 0.4] }, 6, 4);
  b.cyl(0.18, 0.18, 0.5, 0x8a8aa0, { p: [0, h, 0.6], r: [Math.PI / 2, 0, 0] }, 6);
  return b.geometry();
}
/** Windrad-Flügel (vier Segel in Pastellfarben, Nabe), drehen um +Z. */
function windRotorGeo(h) {
  const b = new Build();
  const L = h * 0.48;
  const cols = [0xff6a8a, 0xffffff, 0x6ac8ff, 0xffffff];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU;
    b.box(0.1, L, 0.06, 0x8a6a4a, { p: [Math.cos(a + Math.PI / 2) * L / 2, Math.sin(a + Math.PI / 2) * L / 2, 0], r: [0, 0, a] }, 0);
    b.box(0.5, L * 0.8, 0.04, cols[i], { p: [Math.cos(a + Math.PI / 2) * L * 0.55 + Math.cos(a) * 0.3, Math.sin(a + Math.PI / 2) * L * 0.55 + Math.sin(a) * 0.3, 0.03], r: [0, 0, a] }, 0);
  }
  b.sphere(0.22, 0xffc83a, { p: [0, 0, 0.1] }, 8, 6);
  return b.geometry();
}
/** Luftschiffchen (Blick +X): gestreifte Hülle, Leitwerk, Gondel mit Fenstern. */
function airshipGeo(color) {
  const b = new Build();
  b.sphere(1, (x, y, z) => (Math.floor((Math.atan2(z, y) + 4) * 1.6) % 2 ? color : 0xfff8ff), { s: [2.6, 1, 1] }, 14, 9);
  for (const [ry, rx] of [[0, 0], [0, Math.PI / 2], [0, Math.PI], [0, -Math.PI / 2]]) b.box(0.7, 0.06, 1.0, color, { p: [-2.3, 0, 0], r: [rx, ry, 0] }, 0);
  b.box(1.3, 0.45, 0.55, 0xffe6a8, { p: [0.1, -1.15, 0] }, 0.08);
  for (const s of [-1, 1]) b.box(0.9, 0.16, 0.04, 0x6ac8ff, { p: [0.1, -1.12, s * 0.28] }, 0);
  for (const s of [-1, 1]) b.cyl(0.02, 0.02, 0.5, 0x6a6a7a, { p: [s * 0.45, -0.82, 0] }, 3);
  b.cone(0.16, 0.3, 0xffc83a, { p: [-2.62, 0, 0], r: [0, 0, Math.PI / 2] }, 6);
  return b.geometry();
}
function propellerGeo() {
  const b = new Build();
  for (let i = 0; i < 3; i++) b.box(0.05, 0.9, 0.14, 0xfaf6ff, { p: [0, Math.cos((i / 3) * TAU) * 0.4, Math.sin((i / 3) * TAU) * 0.4], r: [(i / 3) * TAU, 0, 0] }, 0);
  return b.geometry();
}

let fallTex = null;
function fallTexture() {
  if (fallTex) return fallTex;
  fallTex = canvasTexture('w6:wasserfall', 64, 256, (ctx, cw, ch) => {
    const gr = ctx.createLinearGradient(0, 0, cw, 0);
    gr.addColorStop(0, '#9ae8ff'); gr.addColorStop(0.5, '#cdf6ff'); gr.addColorStop(1, '#9ae8ff');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, cw, ch);
    for (let i = 0; i < 30; i++) {
      const xx = (i * 37) % cw, yy = (i * 71) % ch, len = 30 + (i * 13) % 70;
      ctx.fillStyle = i % 3 ? 'rgba(255,255,255,0.85)' : 'rgba(120,200,255,0.7)';
      ctx.fillRect(xx, yy, 2 + (i % 3), len);
      ctx.fillRect(xx, yy - ch, 2 + (i % 3), len);
    }
  }, { repeat: true });
  return fallTex;
}

/**
 * Bewegte Kulisse der Wolkeninseln (MapBuilder: out.life, je Bild update; CourseMapScene.state().decor über liveInfo):
 *   map.windmills  [[x, y, z, h, yaw], …]   Türme statisch, Flügel als Instanz-Fläche im Takt der Kartenmusik
 *   map.airships   [{ c, r, speed, color }] Luftschiffchen auf Kreisbahnen (Hülle + Propeller je eine Instanz-Fläche)
 *   map.waterfalls [{ at, w, top, face }]   Wasserfälle ins Wolkenmeer (eine Fläche, wandernde Textur) + Gischtwolken
 *   map.rainbows   [{ c, r, yaw }]          Regenbögen (statisch, durchscheinend, Wolken an den Füßen)
 */
export class SkyLife {
  constructor(level, map) {
    this.view = level.view;
    this.level = level;
    this.own = [];
    this.sea = map.sea ?? 0;
    this.buildWindmills(map.windmills ?? []);
    this.buildAirships(map.airships ?? []);
    this.buildWaterfalls(map.waterfalls ?? []);
    this.buildRainbows(map.rainbows ?? []);
    this.buildFloaters(map);
    this.wind = { beat: 0, step: 0, angle: 0, source: 'zeit', theme: null, bpm: MAP_BPM6(), moving: false };
    this.shown = null;
    this.update(0, 0);
  }

  add(obj) { this.view.add(obj); this.own.push(obj); return obj; }

  buildWindmills(list) {
    this.mills = list.map(([x, y, z, h = 6, yaw = 0]) => ({ x, y, z, h, yaw }));
    if (!this.mills.length) return;
    for (const m of this.mills) {
      this.view.addStatic(place(windTowerGeo(m.h), m.x, m.y, m.z, m.yaw), { castShadow: true });
      this.level.world.add({ type: 'cyl', x: m.x, z: m.z, r: 1.0, y0: m.y - 0.2, y1: m.y + m.h, tag: 'deko:windrad' });
    }
    const hs = [...new Set(this.mills.map((m) => m.h))];
    // eine Flügel-Geometrie (Größe 6 m), je Windrad skaliert
    const geo = windRotorGeo(6);
    this.rotors = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }), this.mills.length);
    this.own.push(geo, this.rotors.material);
    this.rotors.castShadow = true;
    this.rotors.frustumCulled = false;
    this.rotors.name = 'w6:windradfluegel';
    this.view.add(this.rotors);
    this.own.push(this.rotors);
    void hs;
  }

  buildAirships(list) {
    this.ships = list.map((s, i) => ({ ...s, ph: (i * TAU) / Math.max(1, list.length) }));
    if (!this.ships.length) return;
    // alle Hüllen in einer Instanz-Fläche (helle Grundform, Farbe je Luftschiff über instanceColor); Propeller zusammen
    const g = airshipGeo(0xd8d8e0);
    const m = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }), this.ships.length);
    this.own.push(g, m.material);
    m.castShadow = false; m.frustumCulled = false; m.name = 'w6:luftschiff';
    const tint = new THREE.Color();
    this.ships.forEach((s, i) => m.setColorAt(i, tint.set(s.color ?? 0xb48ae8).lerp(new THREE.Color(0xffffff), 0.15)));
    this.add(m);
    this.hulls = [{ m, ships: this.ships }];
    const pg = propellerGeo();
    this.props = new THREE.InstancedMesh(pg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }), this.ships.length);
    this.own.push(pg, this.props.material);
    this.props.frustumCulled = false; this.props.name = 'w6:propeller';
    this.add(this.props);
  }

  buildWaterfalls(list) {
    this.falls = list;
    if (!list.length) return;
    const pos = [], uv = [], gb = new Build();
    for (const f of list) {
      const [cx, cz] = f.at, w = f.w ?? 2.6, y1 = f.top, y0 = this.sea + 0.6, h = y1 - y0;
      // Ebene vor der Inselflanke (face: S → +Z, E → +X, W → −X), oben leicht nach außen gebogen
      const dir = f.face === 'E' ? [1, 0] : f.face === 'W' ? [-1, 0] : [0, 1];
      const across = [dir[1], -dir[0]];
      const rows = 6;
      for (let r = 0; r < rows; r++) {
        const ta = r / rows, tb = (r + 1) / rows;
        const ya = y1 - ta * h, yb = y1 - tb * h;
        const oa = 0.35 + Math.sqrt(ta) * 1.6, ob = 0.35 + Math.sqrt(tb) * 1.6;   // Bogen nach außen
        const wa = w * (1 + ta * 0.35), wb = w * (1 + tb * 0.35);
        const P = (o, yy, ww, s) => [cx + dir[0] * o + across[0] * ww * s / 2, yy, cz + dir[1] * o + across[1] * ww * s / 2];
        const A = P(oa, ya, wa, -1), B = P(oa, ya, wa, 1), C = P(ob, yb, wb, 1), D = P(ob, yb, wb, -1);
        pos.push(...A, ...B, ...C, ...A, ...C, ...D);
        const va = (ta * h) / 4, vb = (tb * h) / 4, ur = w / 2.2;
        uv.push(0, va, ur, va, ur, vb, 0, va, ur, vb, 0, vb);
      }
      // Quelle: dunkle Felsspalte mit weißer Gischt
      gb.box(w + 0.4, 0.5, 0.5, 0x5a4e78, { p: [cx + dir[0] * 0.1, y1 + 0.05, cz + dir[1] * 0.1], r: [0, dir[0] ? Math.PI / 2 : 0, 0] }, 0.1);
      gb.sphere(0.45, 0xffffff, { p: [cx + dir[0] * 0.45, y1 - 0.05, cz + dir[1] * 0.45], s: [w * 0.8, 0.6, 0.8] }, 8, 4);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    const tex = fallTexture().clone();
    tex.needsUpdate = true;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    this.fallTex = tex;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, fog: true });
    this.own.push(g, tex, mat);
    const m = new THREE.Mesh(g, mat);
    m.name = 'w6:wasserfaelle';
    m.renderOrder = 2;
    this.add(m);
    this.view.addStatic(gb.geometry(), { castShadow: false });
    // Gischtwolken am Fuß (pulsieren)
    const pg = new THREE.IcosahedronGeometry(1, 1);
    const pm = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x8a9ac0, emissiveIntensity: 0.3 });
    this.mist = new THREE.InstancedMesh(pg, pm, list.length * 3);
    this.own.push(pg, pm);
    this.mist.frustumCulled = false; this.mist.name = 'w6:gischt';
    this.add(this.mist);
  }

  buildRainbows(list) {
    if (!list.length) return;
    const parts = [], puffs = new Build();
    for (const rb of list) {
      const [x, y, z] = rb.c, r = rb.r ?? 14, bw = r * 0.045;
      RAINBOW.forEach((col, i) => {
        const r1 = r - i * bw, r0 = r1 - bw;
        const c = lin(col);
        const g = colorize(new THREE.RingGeometry(r0, r1, 40, 1, 0, Math.PI), (p, n, o) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; });
        g.rotateY(rb.yaw ?? 0);
        g.translate(x, y, z);
        for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') g.deleteAttribute(k);
        parts.push(g);
      });
      const rnd = new Rnd(Math.round(x * 3 + z));
      for (const s of [-1, 1]) {
        const fx = x + Math.cos(rb.yaw ?? 0) * s * (r - 3.5 * bw), fz = z - Math.sin(rb.yaw ?? 0) * s * (r - 3.5 * bw);
        for (let k = 0; k < 4; k++) puffs.sphere(rnd.real(1.2, 2), { v: (px, py, pz, nx, ny) => mix(0xdde4f8, 0xffffff, ny * 0.6 + 0.55) }, { p: [fx + rnd.real(-1.2, 1.2), y + rnd.real(-0.4, 0.8), fz + rnd.real(-1, 1)], s: [1.2, 0.75, 1] }, 11, 7);
      }
    }
    this.view.addStatic(merge(parts), { material: 'w6rainbow', castShadow: false, tile: 'w6:regenbogen' });
    this.view.addStatic(puffs.geometry(), { castShadow: false });
  }

  /**
   * Schwebesteine: kleine Felsbrocken mit Grasmütze schweben neben den Inseln knapp unter der Kante und wippen langsam
   * (deterministisch verteilt, nicht auf Brücken; eine Instanz-Fläche ohne Schattenwurf). map.floaters = Anzahl.
   */
  buildFloaters(map) {
    const blocks = (map.ground ?? []).filter((b) => b.top > (map.sea ?? 0) + 2);
    if (!blocks.length || map.floaters === 0) return;
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const b of blocks) { x0 = Math.min(x0, b.rect[0]); z0 = Math.min(z0, b.rect[1]); x1 = Math.max(x1, b.rect[2]); z1 = Math.max(z1, b.rect[3]); }
    const rnd = new Rnd(0xf10a7);
    const list = [];
    const N = map.floaters ?? 28;
    for (let i = 0; i < 800 && list.length < N; i++) {
      const x = rnd.real(x0 - 12, x1 + 12), z = rnd.real(z0 - 12, z1 + 12);
      let best = null, bd = Infinity;
      for (const b of blocks) {
        const [a0, c0, a1, c1] = b.rect;
        const d = Math.hypot(Math.max(a0 - x, 0, x - a1), Math.max(c0 - z, 0, z - c1));
        if (d < bd) { bd = d; best = b; }
      }
      if (bd < 2.6 || bd > 10) continue;
      if ((map.walk ?? []).some((r) => x > r[0] - 3 && x < r[2] + 3 && z > r[1] - 3 && z < r[3] + 3)) continue;
      if (list.some((f) => Math.hypot(f.x - x, f.z - z) < 6)) continue;
      list.push({ x, z, y: best.top - rnd.real(1.6, 6.5), s: rnd.real(0.55, 1.35), ph: rnd.real(0, TAU), sp: rnd.real(0.35, 0.7), rot: rnd.real(0, TAU) });
    }
    if (!list.length) return;
    const b = new Build();
    b.add(new THREE.DodecahedronGeometry(1, 0), { v: (px, py, pz, nx, ny) => mix(0x7a6aa0, 0xc4b8dc, ny * 0.5 + 0.5) }, { s: [1, 0.75, 1] });
    b.sphere(0.95, { v: (px, py, pz, nx, ny) => mix(0x5cba4c, 0x9ae878, ny) }, { p: [0, 0.42, 0], s: [1, 0.28, 1] }, 9, 4);
    b.cone(0.3, 0.9, { v: (px, py) => mix(0x7a6aa0, 0x5a4e78, 0.5 - py) }, { p: [0.1, -0.95, 0.05], r: [Math.PI, 0, 0] }, 5);
    b.sphere(0.12, 0xff7ab4, { p: [0.35, 0.62, 0.2] }, 5, 3);
    b.sphere(0.1, 0xffe04a, { p: [-0.3, 0.6, -0.15] }, 5, 3);
    const g = b.geometry();
    this.floatData = list;
    this.floaters = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }), list.length);
    this.own.push(g, this.floaters.material);
    this.floaters.castShadow = false;
    this.floaters.frustumCulled = false;
    this.floaters.name = 'w6:schwebesteine';
    this.add(this.floaters);
  }

  /** Windrad-Stellung aus der Taktuhr: Schritt je Zählzeit (eine Achtelrunde, weich in den ersten 40 %). */
  windInfo(t = this.view.time) {
    const bt = beatNow6(t);
    const whole = Math.floor(bt.beat), frac = bt.beat - whole;
    const e = Math.min(1, frac / 0.4), k = e * e * (3 - 2 * e);
    const angle = ((whole + k) / WIND_STEPS) * TAU;
    return { beat: +bt.beat.toFixed(3), step: ((whole % WIND_STEPS) + WIND_STEPS) % WIND_STEPS, moving: frac < 0.4, angle: +(angle % TAU).toFixed(4), source: bt.source, theme: bt.theme, bpm: bt.bpm };
  }

  update(dt, t) {
    if (this.rotors) {
      const w = this.windInfo(t);
      this.wind = w;
      this.mills.forEach((m, i) => {
        _e.set(0, m.yaw, -w.angle - i * 0.35, 'YXZ');
        _q.setFromEuler(_e);
        const s = m.h / 6;
        _p.set(m.x + Math.sin(m.yaw) * 0.55 * s, m.y + m.h, m.z + Math.cos(m.yaw) * 0.55 * s);
        _s.setScalar(s);
        _m4.compose(_p, _q, _s);
        this.rotors.setMatrixAt(i, _m4);
      });
      this.rotors.instanceMatrix.needsUpdate = true;
      this.shown = { step: w.step, angle: w.angle };
    }
    if (this.hulls) {
      let pi = 0;
      for (const { m, ships } of this.hulls) {
        ships.forEach((s, i) => {
          const a = s.ph + t * (s.speed ?? 0.06);
          const dir = (s.speed ?? 0.06) >= 0 ? 1 : -1;
          const [cx, cy, cz] = s.c;
          _p.set(cx + Math.cos(a) * s.r, cy + Math.sin(t * 0.5 + s.ph) * 0.6, cz + Math.sin(a) * s.r * 0.8);
          // Blick (+X des Modells) entlang der Bahn
          const tx = -Math.sin(a) * dir, tz = Math.cos(a) * 0.8 * dir;
          const yaw = Math.atan2(-tz, tx);
          _e.set(0, yaw, Math.sin(t * 0.8 + s.ph) * 0.04, 'YXZ');
          _q.setFromEuler(_e);
          _s.setScalar(1.4);
          _m4.compose(_p, _q, _s);
          m.setMatrixAt(i, _m4);
          // Propeller am Heck: lokal (−3, 0, 0) · 1,4, dreht um die Längsachse
          const hx = Math.cos(yaw), hz = -Math.sin(yaw);
          _pp.set(_p.x - 3.0 * 1.4 * hx, _p.y, _p.z - 3.0 * 1.4 * hz);
          _e.set(t * 14 + i, yaw, 0, 'YXZ');
          _q.setFromEuler(_e);
          _m4.compose(_pp, _q, _s);
          this.props.setMatrixAt(pi++, _m4);
        });
        m.instanceMatrix.needsUpdate = true;
      }
      this.props.instanceMatrix.needsUpdate = true;
    }
    if (this.floaters) {
      this.floatData.forEach((f, i) => {
        _e.set(Math.sin(t * 0.4 + f.ph) * 0.06, f.rot + t * 0.05 * (i % 2 ? 1 : -1), Math.cos(t * 0.35 + f.ph) * 0.06, 'YXZ');
        _q.setFromEuler(_e);
        _p.set(f.x, f.y + Math.sin(t * f.sp + f.ph) * 0.35, f.z);
        _s.setScalar(f.s);
        _m4.compose(_p, _q, _s);
        this.floaters.setMatrixAt(i, _m4);
      });
      this.floaters.instanceMatrix.needsUpdate = true;
    }
    if (this.fallTex) this.fallTex.offset.y = (t * 0.9) % 1;
    if (this.mist) {
      let i = 0;
      _q.identity();
      for (const f of this.falls) {
        const dir = f.face === 'E' ? [1, 0] : f.face === 'W' ? [-1, 0] : [0, 1];
        for (let k = 0; k < 3; k++) {
          const s = (f.w ?? 2.6) * (0.55 + k * 0.12) * (1 + 0.15 * Math.sin(t * 3 + k * 2 + f.at[0]));
          _p.set(f.at[0] + dir[0] * 2 + (k - 1) * (dir[1] ? 1.2 : 0), this.sea + 0.8 + k * 0.3, f.at[1] + dir[1] * 2 + (k - 1) * (dir[0] ? 1.2 : 0));
          _s.set(s, s * 0.55, s);
          _m4.compose(_p, _q, _s);
          this.mist.setMatrixAt(i++, _m4);
        }
      }
      this.mist.instanceMatrix.needsUpdate = true;
    }
  }

  liveInfo() {
    return {
      windmills: { ...this.windInfo(), n: this.mills?.length ?? 0, shown: this.shown },
      airships: { n: this.ships?.length ?? 0 },
      waterfalls: { n: this.falls?.length ?? 0 },
      floaters: { n: this.floatData?.length ?? 0 },
    };
  }

  info() { return this.liveInfo(); }

  dispose() {
    for (const o of this.own) { if (o.isObject3D) o.parent?.remove(o); o.dispose?.(); }
    this.own.length = 0;
  }
}

void cached; void getModel; void lilaGround;
