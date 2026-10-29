// Gelände, Ränder, Streudeko, Requisiten, Brücken, Sternenmeer und lebendige Kulisse der Karte der Bonuswelt Stern
// „Sternenzelt“ (Welt 9; eigene Gestaltung, Spielzeug-Look wie Welt 1–8, kindgerecht und zum Staunen): Inseln schweben im
// Weltraum über einem tiefen Sternenmeer, verbunden durch Regenbogenwege und Sternenbrücken; Planeten drehen sich zwischen
// den Inseln, Spielzeugraketen kreisen, Sternschnuppen sausen vorbei, rings um die Inseln funkeln Sterne im Takt der Musik.
//
// Geländestile (map.ground[].style), alle als schwebende Insel (Decke, farbige Gesteinsbänder, felsige Unterseite mit
// leuchtenden Kristallen): 'starplaza' (Standard, Sternenhafen: lavendelblaue Platten mit Goldsternchen), 'rainbow'
// (Regenbogeninsel, Pastell-Streifen), 'galaxy' (Planetoiden-Plattenfeld: rot-blaue Platten mit weißen Fugen und Sternen),
// 'diorama' (Türkis-Pfirsich-Fliesen), 'wood' (Holzbohlen), 'cloud' (Wolkeninsel: puffige Wolkenplatte ohne Fels), 'retro'
// (Retro-Blockland: Pixelgras auf Erdblöcken), 'honey' (Wabeninsel: Honigwaben mit lila Fugen), 'jungle' (Moos und
// Riesenblatt-Schatten), 'snowfog' (Schnee mit Steinplatten, Eiszapfen unten), 'tech' (Hightech-Platten mit Neonfugen und
// Warnstreifen), 'asteroid' (nicht begehbarer Fels mit Kristallen).
// Ränder (map.edges): 'starhedge' (Kristallmäuerchen mit Goldsternen), 'starrail' (goldenes Sternengeländer); an Inselrändern
// zum All setzt starRims ein niedriges Sternengeländer mit leuchtenden Sternchen (die unsichtbare Kartenwand bleibt).
// Verbindungen (segments, Kollision wie `bridge`): 'rainbowway' (Regenbogenweg: sieben Farbbahnen, weiße Wülste, Goldsterne),
// 'starbridge' (Sternenbrücke: Nachtblau-Steg mit goldenen Sternplatten und Sternenpfosten).
// Lebendige Kulisse (StarLife, je Bild): funkelnde Sterne rings um die Inseln – je Zählzeit der Kartenmusik (music.beat())
// leuchtet eine von drei Gruppen hell auf; ohne laufende Musik Ersatzuhr im Tempo von course_worldstar_map –, Planeten drehen
// sich (Registry 'planet' mit kind), Spielzeugraketen ('spielzeugrakete') kreisen mit Flamme, Sternschnuppen ('sternschnuppe')
// sausen in Abständen schräg durchs Bild. StarSea ersetzt Meer, Schaum und Glitzern: tiefe Sternenschichten unter den Inseln
// (Parallaxe) und farbige Nebel. Thema 'map_star' (Weltraumkuppel mit Sternen rundum, Nebeln und fernen Planeten).
//
// Alle statischen Geometrien in Weltkoordinaten bzw. mit Fußpunkt im Ursprung (Vorderseite +Z, zur Kamera) und Vertexfarben
// (position/normal/color) für view.addStatic (Karten-Kacheln, MapBatcher). Flache Deckschichten tragen userData.noShadow,
// leuchtende userData.material 'glow' (alle in einer Kachel 'w9:leuchten').

import * as THREE from 'three';
import { mix, TAU, cached, vcol, starShape, sparkShape } from '../models/lib/kit.js';
import { roundedBox, SIDE, colorize, lin, mixc, smooth, Rnd } from '../../three/world/geometry.js';
import { alignedGrid } from '../blocks/kit.js';
import { THEMES } from '../view/themes.js';
import { music } from '../../audio/index.js';
import { LowBuild as Build, place } from './desert.js';
import { buildBridge } from '../blocks/types/bridge.js';
import { getModel, hasModel } from '../models/index.js';
import { modelTris } from './beach5.js';
import { nebulae, farPlanets } from '../view/backdrop_w2.js';

/** Benutzte Registry-Modelle der Sternenzelt-Karte (state().decor.w9models) und vorhandene, aber zu schwere (w9heavy). */
export const W9_USED = new Set();
export const W9_HEAVY = new Map();
/** Registry-Modell schwerer als max Dreiecke? (merkt es in W9_HEAVY) */
export const tooHeavy9 = (name, opts, max) => { const n = modelTris(name, opts); if (n > max) { W9_HEAVY.set(name, Number.isFinite(n) ? Math.round(n) : -1); return true; } return false; };

const PI = Math.PI;
export const RAINBOW9 = [0xff4a5e, 0xff9a2e, 0xffe03a, 0x5ad84a, 0x3ac8ff, 0x4a6aff, 0xb05aff];
const CRYSTAL = [0x7ae8ff, 0xff9ae8, 0xffe07a, 0xb4a0ff, 0x9affc8];

// ------------------------------------------------------------------ Thema des Sternenzelts

if (!THEMES.map_star) {
  THEMES.map_star = {
    ...THEMES.grass,
    label: 'Weltkarte Sternenzelt',
    // Kuppel: oben tiefes Nachtblau, am Horizont Violett, unten wieder Nachtblau (die Inseln schweben im All)
    sky: [[1, 0x0c0a2e], [0.5, 0x1a1452], [0.18, 0x2e2072], [0.04, 0x4a2c8e], [0, 0x553296], [-0.12, 0x34226e], [-0.5, 0x1a1450], [-1, 0x0e0a32]],
    background: 0x16123e,
    fog: { color: 0x241c5c, near: 120, far: 440 },
    hemi: { sky: 0xe4e2ff, ground: 0x8a6ac8, intensity: 1.5 },
    sun: { color: 0xfff4e2, intensity: 2.75, dir: [-0.45, 1, 0.5] },
    ground: null,
    clouds: false,
    sunDisc: false,
    backdrop: 'star9',
    grassTop: 0x8ae06a, grassTop2: 0x7ad45e, grassRim: 0xc0f49a, grassSide: 0x6a58c8,
    dirt: 0x7a68c8, dirtDeep: 0x4a3a98, rock: 0x7a6ab8, rockDeep: 0x4a3a88,
    stone: 0xeee8ff, stoneDark: 0xb0a8d8,
    wood: 0xfff4e8, woodDark: 0xc8a070,
    water: 0x5ad8ff, waterDeep: 0x2a7ad8,
    buildBackdrop(sky, bounds, rnd) { starBackdrop(sky, bounds, rnd); },
    updateBackdrop(sky, dt) {
      if (!sky.starPoints9) return;
      sky._tw9 = (sky._tw9 ?? 0) + dt;
      sky.starPoints9.material.size = 2.2 + Math.sin(sky._tw9 * 1.7) * 0.3;
    },
  };
}

/** Sterne rundum (auch unter dem Horizont – die Kamera blickt schräg nach unten ins All), Nebel und ferne Planeten in der Kuppel. */
function starBackdrop(sky, bounds, rnd) {
  const n = 1500;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const tints = [0xffffff, 0xcfe0ff, 0xfff0c8, 0xe6d0ff, 0xc8fff0].map((c) => new THREE.Color(c));
  for (let i = 0; i < n; i++) {
    const u = rnd.real(-1, 1), a = rnd.real(0, TAU), r = Math.sqrt(1 - u * u);
    pos[i * 3] = Math.cos(a) * r * 300; pos[i * 3 + 1] = u * 300; pos[i * 3 + 2] = Math.sin(a) * r * 300;
    const c = tints[i % tints.length], k = rnd.real(0.45, 1);
    col[i * 3] = c.r * k; col[i * 3 + 1] = c.g * k; col[i * 3 + 2] = c.b * k;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = sky.track(new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false, transparent: true }));
  const pts = new THREE.Points(sky.track(g), mat);
  pts.frustumCulled = false;
  pts.renderOrder = -9;
  pts.name = 'w9:kuppelsterne';
  sky.domeGroup.add(pts);
  sky.starPoints9 = pts;
  nebulae(sky, [
    { dir: [-0.6, 0.3, -1], size: 240, color: 0x8a3ad8 },
    { dir: [0.7, 0.15, -1], size: 200, color: 0x2a8ad8, aspect: 0.5 },
    { dir: [0.2, -0.55, -1], size: 260, color: 0xd83aa0, aspect: 0.55 },
    { dir: [-0.5, -0.7, 0.2], size: 240, color: 0x3a6ae8, aspect: 0.6 },
    { dir: [0.6, -0.6, 0.6], size: 220, color: 0x7a3ad8, aspect: 0.5 },
  ]);
  farPlanets(sky, [
    { dir: [-0.6, 0.3, -1], r: 30, colors: [0xff9a6a, 0xffd0a0, 0xfff0d0], ring: true, tilt: 0.35 },
    { dir: [0.8, 0.12, -1], r: 16, colors: [0x5ad8a0, 0xb0f0c8, 0xf0fff0], ring: false, tilt: -0.2 },
    { dir: [0.35, -0.35, -1], r: 20, colors: [0x6a8aff, 0xb0c8ff, 0xe8f0ff], ring: true, tilt: 0.5 },
  ]);
  void bounds;
}

// ------------------------------------------------------------------ Hilfen

const hash2 = (x, z) => { const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return h - Math.floor(h); };
const tone = (a, c, k, out = [0, 0, 0]) => mixc(lin(a), lin(c), k, out);
const checker2 = (ax, az, cell = 2) => (Math.floor((ax + cell * 0.505) / cell) + Math.floor((az + cell * 0.505) / cell)) & 1;
const clampv = (v, a, b) => Math.max(a, Math.min(b, v));
const touch = (a, b) => a[0] <= b[2] + 1e-6 && b[0] <= a[2] + 1e-6 && a[1] <= b[3] + 1e-6 && b[1] <= a[3] + 1e-6;
// Leuchtendes der ganzen Karte in einer benannten Kachel (wenig Geometrie, sonst je Kachel ein Zeichenaufruf)
export const GLOW_TILE9 = 'w9:leuchten';
function flat(g, material) { if (g) { g.userData.noShadow = true; if (material) { g.userData.material = material; if (material === 'glow') g.userData.tile = GLOW_TILE9; } } return g; }
/** Kleiner Leuchtstern (Weltkoordinaten), der zur Kamera blickt (nach Süden, etwas nach oben gekippt). */
function camStar(B, x, y, z, R, color) {
  B.add(new THREE.ShapeGeometry(starShape(R, R * 0.45), 1), color, { p: [x, y, z], r: [-0.55, 0, 0] });
}

// ------------------------------------------------------------------ Farben

const BANDS = {
  starplaza: [0x7a68d0, 0x6656bc, 0x8c7ae0, 0x5a4aa8],
  rainbow: [0xffb4d0, 0xffd89a, 0xfff2a0, 0xb8f0b0, 0xa8dcff, 0xc8b8ff],
  galaxy: [0x6a5ac8, 0x5848b0, 0x7c6cd8, 0x4c3e9c],
  diorama: [0x2ab8a8, 0x1e9c90, 0xe8b07a, 0xd89a64],
  wood: [0xc88a4a, 0xb07440, 0xd89a58, 0x9a6232],
  retro: [0xd8884a, 0xc87a3e, 0xe0965a, 0xb86e36],
  honey: [0x9a5ae8, 0x8448d0, 0xae72f0, 0x7038b8],
  jungle: [0x7a5a3a, 0x5a7a3a, 0x8a6442, 0x4e6a34],
  snowfog: [0xe8eeff, 0xc8d4f4, 0xdce4fc, 0xb0bce4],
  tech: [0xb8c4dc, 0x9aa8c8, 0xccd6ea, 0x8a96b8],
  asteroid: [0x8a7ab8, 0x7262a4, 0x9a8ac8, 0x625294],
};
// Unterseite: Gestein oben, Fels in der Mitte, dunkle Spitze
const UNDER = {
  starplaza: [0x7a6ac8, 0x5a4aa0, 0x2e2464], rainbow: [0xc8a8e8, 0x8a74c8, 0x3a2e78], galaxy: [0x6a5ac0, 0x4e4096, 0x261e5a],
  diorama: [0x2a9c90, 0x4a5aa0, 0x262060], wood: [0x9a6a3e, 0x6a5a8a, 0x2e2658], retro: [0xb06a34, 0x8a5a4a, 0x3a2a4a],
  honey: [0x8448d0, 0x5a3aa0, 0x2a1e60], jungle: [0x6a4a2e, 0x4a5a5a, 0x262a48], snowfog: [0xb8c8ec, 0x7a86b8, 0x343c78],
  tech: [0x8a96b8, 0x5a6488, 0x262c4e], asteroid: [0x7262a4, 0x524488, 0x261e58],
};

const PALETTES = {
  // Sternenhafen: lavendelblaue Platten, goldene Sternchen in einem ruhigen Schrägraster
  starplaza: {
    side: 0x6a5ac8, rim: 0xd0c4ff, cell: 1, cellOff: 2,
    tile: (rnd) => (i, j, ax, az) => {
      const o = tone(checker2(ax, az) ? 0x7a74d8 : 0x726cce, 0x847ee0, rnd.frac() * 0.5);
      const fx = Math.floor(ax), fz = Math.floor(az);
      if ((((fx * 2 + fz * 3) % 9) + 9) % 9 === 0) mixc(o, lin(0xffd86a), 0.55, o);
      return o;
    },
  },
  // Regenbogeninsel: schräge Pastell-Streifen
  rainbow: {
    side: 0xffb8e0, rim: 0xffffff, cell: 1, cellOff: 2,
    tile: (rnd) => (i, j, ax, az) => {
      const s = (((Math.floor((ax + az) / 1.6)) % 7) + 7) % 7;
      const o = mixc(lin(RAINBOW9[s]), lin(0xffffff), 0.5 + rnd.frac() * 0.06, [0, 0, 0]);
      return o;
    },
  },
  // Plattenfeld: rot-blaue Platten im 2-m-Schachbrett (weiße Fugen und Sterne kommen dazu)
  galaxy: {
    side: 0x5a4ab8, rim: 0xf0ecff, cell: 2, cellOff: 2,
    tile: (rnd) => (i, j, ax, az) => tone(checker2(ax, az) ? 0xe8485a : 0x3a6ae8, checker2(ax, az) ? 0xf05a68 : 0x4a78f0, rnd.frac() * 0.4),
  },
  // Diorama-Insel: Türkis-Pfirsich-Fliesen wie die Drehscheibe
  diorama: {
    side: 0x2a9c90, rim: 0xf4e0b0, cell: 1, cellOff: 2,
    tile: (rnd) => (i, j, ax, az) => tone(checker2(ax, az, 1) ? 0x3ac8b0 : 0xf0c090, checker2(ax, az, 1) ? 0x46d0b8 : 0xf6cc9e, rnd.frac() * 0.4),
  },
  // Holz-Walzen-Insel: Bohlen entlang X, je Reihe etwas anders
  wood: {
    side: 0xa06a38, rim: 0xf6d098, cell: 1, cellOff: 2,
    tile: (rnd) => (i, j, ax, az) => {
      const row = Math.floor(az);
      const o = tone(row & 1 ? 0xe0a868 : 0xd09858, 0xe8b478, rnd.frac() * 0.35);
      if (hash2(Math.floor(ax / 3) + row * 7, row) > 0.86) mixc(o, lin(0xb07a44), 0.4, o);   // dunklere Bohle
      return o;
    },
  },
  // Retro-Blockland: Pixelgras (2-m-Blöcke), selten Blümchen
  retro: {
    side: 0x3ec43a, rim: 0x9af06a, cell: 2, cellOff: 2,
    tile: (rnd) => (i, j, ax, az) => {
      const o = tone(checker2(ax, az) ? 0x6ad84a : 0x62cc44, 0x72e052, rnd.frac() * 0.3);
      if (hash2(ax * 0.7 + 3, az * 0.7) > 0.95) mixc(o, lin(0xfff0a0), 0.3, o);
      return o;
    },
  },
  // Wabeninsel: lila Fugengrund (die Waben selbst setzt hexFloor als echte Sechsecke darauf)
  honey: {
    side: 0x8448d0, rim: 0xffd870, cell: 2, cellOff: 2,
    tile: (rnd) => () => tone(0x6a38b8, 0x7444c4, rnd.frac() * 0.5),
  },
  jungle: {
    side: 0x4e8a3a, rim: 0xa8e878, cell: 1, cellOff: 2,
    tile: (rnd) => (i, j, ax, az) => {
      const o = tone(checker2(ax, az) ? 0x5ab84a : 0x50aa42, 0x66c454, rnd.frac() * 0.35);
      const h = hash2(Math.floor(ax / 4) + 2, Math.floor(az / 4) - 5);
      if (h > 0.62) mixc(o, lin(0x2a7034), 0.4, o);   // Riesenblatt-Schatten
      else if (h < 0.12) mixc(o, lin(0x8ad070), 0.35, o);   // Sonnenfleck
      return o;
    },
  },
  snowfog: {
    side: 0xb8c4ec, rim: 0xffffff, cell: 1, cellOff: 2,
    tile: (rnd) => (i, j, ax, az) => {
      const o = tone(0xf2f4ff, 0xe2e8fc, rnd.frac());
      const h = hash2(Math.floor(ax / 3) + 4, Math.floor(az / 3) + 1);
      if (h > 0.86) mixc(o, lin(0xb0acd4), 0.5, o);          // Steinplatte
      else if (h < 0.22) mixc(o, lin(0xc4d4f4), 0.45, o);    // bläulicher Schneeschatten
      return o;
    },
  },
  tech: {
    side: 0x8a96b8, rim: 0xf4f8ff, cell: 2, cellOff: 2,
    tile: (rnd) => (i, j, ax, az) => tone(checker2(ax, az) ? 0xe2e8f4 : 0xd6dcec, 0xeef2fa, rnd.frac() * 0.3),
  },
  asteroid: {
    side: 0x7262a4, rim: 0xb8a8e8, cell: 2, cellOff: 2,
    tile: (rnd) => () => tone(0x9a8ac8, 0x8a7ab8, rnd.frac()),
  },
};
export const STAR_STYLES = new Set([...Object.keys(PALETTES), 'cloud']);

/**
 * Wabenboden: spitze Sechsecke (Umkreis R, Mittenabstand √3·R) als flache Platten auf dem lila Fugengrund, nur ganz innerhalb
 * der Fläche; Honig in zwei Tönen mit hellem Rand, selten eine helle Sternwabe.
 */
const HEX_R = 1.15;
function hexFloor(x0, z0, x1, z1, y, rnd) {
  const pos = [], col = [];
  const D = Math.sqrt(3) * HEX_R, Rin = HEX_R * 0.88;
  const push = (a, b, c, cc) => { pos.push(...a, ...b, ...c); for (let k = 0; k < 3; k++) col.push(cc[0], cc[1], cc[2]); };
  for (let r = Math.floor(z0 / (1.5 * HEX_R)) - 1; r <= Math.ceil(z1 / (1.5 * HEX_R)) + 1; r++) {
    const cz = r * 1.5 * HEX_R;
    for (let q = Math.floor(x0 / D) - 2; q <= Math.ceil(x1 / D) + 2; q++) {
      const cx = (q + (r & 1) * 0.5) * D;
      if (cx - HEX_R < x0 + 0.25 || cx + HEX_R > x1 - 0.25 || cz - HEX_R < z0 + 0.25 || cz + HEX_R > z1 - 0.25) continue;
      const h = hash2(q * 3.1, r * 1.7);
      const inner = lin(h > 0.93 ? 0xfff0a0 : h > 0.5 ? 0xffc23a : 0xffb020), rim = lin(0xffe08a);
      const c0 = mixc(inner, [1, 1, 1], rnd.frac() * 0.05, [0, 0, 0]);
      for (let i = 0; i < 6; i++) {
        const a0 = PI / 6 + (i / 6) * TAU, a1 = PI / 6 + ((i + 1) / 6) * TAU;
        const o0 = [cx + Math.cos(a0) * Rin, y, cz + Math.sin(a0) * Rin], o1 = [cx + Math.cos(a1) * Rin, y, cz + Math.sin(a1) * Rin];
        const i0 = [cx + Math.cos(a0) * Rin * 0.78, y + 0.004, cz + Math.sin(a0) * Rin * 0.78], i1 = [cx + Math.cos(a1) * Rin * 0.78, y + 0.004, cz + Math.sin(a1) * Rin * 0.78];
        push([cx, y + 0.004, cz], i1, i0, c0);   // Innenfläche (Normale nach oben: Reihenfolge gegen den Uhrzeigersinn von oben)
        push(o0, i0, i1, rim); push(o0, i1, o1, rim);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

// ------------------------------------------------------------------ Geländestile

const bandOf = (style) => (style === 'cloud' ? 1.0 : 2.6);
/** Unterkante der Seitenschichten (mindestens so tief wie die berührender Nachbarblöcke – sonst klaffte ein Spalt). */
function sideBottom(b, map) {
  let y = b.top - bandOf(b.style ?? 'starplaza');
  for (const o of map?.ground ?? []) {
    if (o === b || !touch(o.rect, b.rect)) continue;
    y = Math.min(y, o.top - bandOf(o.style ?? 'starplaza'));
  }
  return y;
}

/**
 * Gelände-Block des Sternenzelts (Box x0..x1 × z0..z1 von base bis top; sichtbar: Decke, Bänder bis sideBottom, Unterseite).
 * b.under: false | { depth } – Unterseite (Standard unter dem ganzen Block).
 */
export function starGround(b, base, theme, rnd, map) {
  const [x0, z0, x1, z1] = b.rect;
  const top = b.top;
  const style = b.style ?? 'starplaza';
  const yb = sideBottom(b, map);
  if (style === 'cloud') return cloudIsle(b, yb, rnd);
  const parts = [];
  const P = PALETTES[style] ?? PALETTES.starplaza;
  const capH = 0.34;
  strata(parts, x0, yb, z0, x1, top - capH, z1, BANDS[style] ?? BANDS.starplaza, rnd, 0.85, 0.1);
  const lip = 0.08, r = 0.15;
  const cap = roundedBox(x1 - x0 + lip * 2, capH, z1 - z0 + lip * 2, r, SIDE.ALL & ~SIDE.NY, SIDE.NY, 1);
  const side = lin(P.side), rim = lin(P.rim);
  colorize(cap, (p, n, o) => mixc(side, rim, smooth(0.15, 0.85, n.y), o));
  cap.translate((x0 + x1) / 2, top - capH / 2, (z0 + z1) / 2);
  parts.push(cap);
  const ins = r + lip * 0.5;
  const gx0 = x0 - lip + ins, gx1 = x1 + lip - ins, gz0 = z0 - lip + ins, gz1 = z1 + lip - ins;
  if (gx1 > gx0 && gz1 > gz0) parts.push(flat(alignedGrid(gx0, gz0, gx1, gz1, top + 0.004, b.walk ? P.cell : P.cellOff, P.tile(rnd, b))));
  if (b.walk && style === 'galaxy') parts.push(...galaxyLines(x0, z0, x1, z1, top, rnd));
  if (b.walk && style === 'tech') parts.push(...techLines(x0, z0, x1, z1, top));
  if (b.walk && style === 'retro') parts.push(flat(retroGrid(x0, z0, x1, z1, top, yb)));
  if (style === 'honey') parts.push(flat(hexFloor(x0, z0, x1, z1, top + 0.012, rnd)));
  if (b.under !== false) {
    const u = typeof b.under === 'object' ? b.under : {};
    const depth = u.depth ?? Math.min(15, 0.38 * Math.min(x1 - x0, z1 - z0) + 4.5);
    parts.push(...underside(x0, z0, x1, z1, yb, depth, UNDER[style] ?? UNDER.starplaza, rnd, style));
  }
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

/** Plattenfeld: weiße Fugen im 2-m-Raster und erhabene Sterne auf jeder dritten Platte (hell, ohne Schatten). */
function galaxyLines(x0, z0, x1, z1, top, rnd) {
  const b = new Build(), st = new Build();
  const y = top + 0.012;
  for (let x = Math.ceil((x0 + 0.4) / 2) * 2; x < x1 - 0.3; x += 2) b.box(0.09, 0.02, z1 - z0 - 0.5, 0xf8f6ff, { p: [x, y, (z0 + z1) / 2] }, 0);
  for (let z = Math.ceil((z0 + 0.4) / 2) * 2; z < z1 - 0.3; z += 2) b.box(x1 - x0 - 0.5, 0.02, 0.09, 0xf8f6ff, { p: [(x0 + x1) / 2, y, z] }, 0);
  const sg = new THREE.ShapeGeometry(starShape(0.5, 0.22), 1).rotateX(-PI / 2);
  for (let x = Math.ceil(x0 / 2) * 2 + 1; x < x1 - 0.5; x += 2) {
    for (let z = Math.ceil(z0 / 2) * 2 + 1; z < z1 - 0.5; z += 2) {
      if (hash2(x * 0.37, z * 0.53) > 0.36) continue;
      const red = checker2(x - 1, z - 1);
      st.add(sg.clone(), red ? 0xff9aa6 : 0x9ac4ff, { p: [x, y + 0.004, z], r: [0, rnd.real(-0.4, 0.4), 0] });
    }
  }
  sg.dispose();
  const out = [flat(b.geometry())];
  if (st.parts.length) out.push(flat(st.geometry()));
  return out;
}
/** Kanonen-Station: leuchtende Neonfugen (Glow) im 4-m-Raster und Warnstreifen am Rand. */
function techLines(x0, z0, x1, z1, top) {
  const b = new Build(), w = new Build();
  const y = top + 0.012;
  for (let x = Math.ceil((x0 + 1) / 4) * 4; x < x1 - 1; x += 4) b.box(0.08, 0.02, z1 - z0 - 1.6, 0x5af0ff, { p: [x, y, (z0 + z1) / 2] }, 0);
  for (let z = Math.ceil((z0 + 1) / 4) * 4; z < z1 - 1; z += 4) b.box(x1 - x0 - 1.6, 0.02, 0.08, 0xff7ae0, { p: [(x0 + x1) / 2, y, z] }, 0);
  const stripe = (ax, az, bx, bz) => {
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 0.8));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      w.box(Math.abs(bx - ax) > 0.1 ? len / n : 0.42, 0.02, Math.abs(bz - az) > 0.1 ? len / n : 0.42, i & 1 ? 0x2a2a3a : 0xffd23a, { p: [ax + (bx - ax) * t, y, az + (bz - az) * t] }, 0);
    }
  };
  stripe(x0 + 0.5, z1 - 0.5, x1 - 0.5, z1 - 0.5); stripe(x0 + 0.5, z0 + 0.5, x1 - 0.5, z0 + 0.5);
  stripe(x0 + 0.5, z0 + 0.9, x0 + 0.5, z1 - 0.9); stripe(x1 - 0.5, z0 + 0.9, x1 - 0.5, z1 - 0.9);
  return [flat(b.geometry(), 'glow'), flat(w.geometry())];
}
/** Retro-Blockland: dunkle Blockfugen auf der Erdseite (vorn, Kamera-Seite) – die Insel wirkt aus Riesenblöcken gebaut. */
function retroGrid(x0, z0, x1, z1, top, yb) {
  const b = new Build();
  const h = top - 0.34 - yb;
  for (let x = Math.ceil(x0 / 2) * 2; x <= x1; x += 2) b.box(0.08, h, 0.04, 0x8a4a22, { p: [x, yb + h / 2, z1 + 0.005] }, 0);
  for (let y = yb + 2; y < top - 0.4; y += 2) b.box(x1 - x0, 0.08, 0.04, 0x8a4a22, { p: [(x0 + x1) / 2, y, z1 + 0.005] }, 0);
  // Pixel-Grasrand (Tropfkante) vorn
  for (let x = x0 + 0.25; x < x1; x += 0.5) {
    const d = 0.18 + (hash2(x * 3, 1) > 0.5 ? 0.22 : 0);
    b.box(0.5, d, 0.06, 0x3ec43a, { p: [x, top - 0.34 - d / 2, z1 + 0.03] }, 0);
  }
  return b.geometry();
}

/**
 * Felsige Unterseite einer schwebenden Insel: Ringe eines abgerundeten Rechtecks werden nach unten kleiner und laufen in eine
 * (versetzte) Spitze aus; flach schattierte Felsflächen (Gestein oben, Fels, dunkle Spitze), hängende Steinzapfen bzw.
 * Eiszapfen/Wurzeln/Neonringe je Stil und leuchtende Kristalle (Material 'glow'). Ohne Schattenwurf.
 */
function underside(x0, z0, x1, z1, y, depth, pal, rnd, style) {
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, hw = (x1 - x0) / 2, hd = (z1 - z0) / 2;
  const N = clampv(Math.round((2 * (x1 - x0 + z1 - z0)) / 4.4), 12, 30);
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
  const out = [flat(colorize(g, (p, n, o) => {
    const t = clampv((y - p.y) / depth, 0, 1);
    if (t < 0.14) mixc(soil, rock, (t / 0.14) * 0.4, o);
    else mixc(rock, deep, smooth(0.35, 1, t), o);
    if ((Math.floor((y - p.y) / 1.3) & 1) && t > 0.14) mixc(o, [1, 1, 1], 0.06, o);
    mixc(o, [0, 0, 0], hash2(Math.round(p.x * 2), Math.round(p.z * 2 + p.y)) * 0.12, o);
  }))];
  const b = new Build(), glow = new Build();
  const nZ = clampv(Math.round((hw + hd) / 4), 2, 7);
  for (let i = 0; i < nZ; i++) {
    const k = rnd.int(2, 4), p = rings[k][rnd.int(0, N - 1)];
    const L = rnd.real(1.4, 3.4) * (depth / 14 + 0.4);
    const ice = style === 'snowfog';
    b.cone(rnd.real(0.35, 0.8), L, { v: (px, py) => (ice ? mix(0xe8f4ff, 0x9ac8f0, 0.5 - py / L) : mix(pal[1], pal[2], 0.5 - py / L)) },
      { p: [p[0] * 0.85 + (cx + ox) * 0.15, p[1] - L / 2 + 0.2, p[2] * 0.85 + (cz + oz) * 0.15], r: [PI, 0, 0] }, 5);
  }
  if (style === 'jungle') {
    // Wurzeln und Ranken hängen vorn und an den Flanken herab
    const nV = clampv(Math.round((x1 - x0) / 4), 3, 8);
    for (let i = 0; i < nV; i++) {
      const vx = rnd.real(x0 + 0.6, x1 - 0.6), vz = z1 + 0.05, L = rnd.real(1.6, 4.2);
      b.cyl(0.06, 0.04, L, 0x3e8a3a, { p: [vx, y - L / 2 + 0.1, vz] }, 4, true);
      for (let q = 0; q < 2; q++) b.sphere(rnd.real(0.18, 0.3), { v: (px, py, pz, nx, ny) => mix(0x2e8a3a, 0x8ad86a, ny * 0.5 + 0.5) }, { p: [vx + rnd.real(-0.12, 0.12), y - L * (0.3 + q * 0.4), vz + 0.08] }, 5, 3);
    }
  }
  if (style === 'tech') {
    // Triebwerksringe unter der Station (leuchten)
    for (const [fx, fz] of [[-0.5, -0.4], [0.5, -0.4], [0, 0.45]]) glow.torus(1.2, 0.16, 0x5af0ff, { p: [cx + fx * hw * 0.7, y - depth * 0.45, cz + fz * hd * 0.7], r: [PI / 2, 0, 0] }, 4, 16);
  }
  const nC = clampv(Math.round((hw + hd) / 6), 2, 5);
  for (let i = 0; i < nC; i++) {
    const k = rnd.int(1, 3), p = rings[k][rnd.int(0, N - 1)], c = CRYSTAL[rnd.int(0, CRYSTAL.length - 1)];
    for (let q = 0; q < 3; q++) {
      const h = rnd.real(0.6, 1.3);
      glow.cone(0.18, h, { v: (px, py) => mix(c, 0xffffff, py / h + 0.3) }, { p: [p[0] + rnd.real(-0.3, 0.3), p[1] - h * 0.3, p[2] + rnd.real(-0.3, 0.3)], r: [PI + rnd.real(-0.4, 0.4), 0, rnd.real(-0.4, 0.4)] }, 4);
    }
  }
  if (b.parts.length) out.push(flat(b.geometry()));
  if (glow.parts.length) out.push(flat(glow.geometry(), 'glow'));
  return out;
}

/** Wolkeninsel: weiße Platte mit Wolkenkissen an den Rändern und einem puffigen Wolkenbauch (kein Fels). */
function cloudIsle(b, yb, rnd) {
  const [x0, z0, x1, z1] = b.rect;
  const top = b.top;
  const parts = [];
  const slab = roundedBox(x1 - x0, top - yb, z1 - z0, 0.3, SIDE.ALL, 0, 1);
  const wh = lin(0xeef0ff), sh = lin(0xb8bcec);
  colorize(slab, (p, n, o) => mixc(sh, wh, smooth(-0.4, 0.9, n.y), o));
  slab.translate((x0 + x1) / 2, (top + yb) / 2, (z0 + z1) / 2);
  parts.push(slab);
  // Wolkendecke in Pastell (hellblau/flieder im Schachbrett, sonst wäre sie im Kartenlicht nur grellweiß)
  parts.push(flat(alignedGrid(x0 + 0.3, z0 + 0.3, x1 - 0.3, z1 - 0.3, top + 0.004, 2, (i, j, ax, az) => tone(checker2(ax, az) ? 0xc8dcff : 0xdcd0ff, checker2(ax, az) ? 0xd4e4ff : 0xe4dcff, rnd.frac() * 0.4))));
  const c = new Build();
  const colr = { v: (x, y, z, nx, ny) => mix(0xb8bcec, 0xf4f4ff, ny * 0.6 + 0.5) };
  const edge = (ax, az, bx, bz, nx, nz) => {
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(2, Math.round(len / 2.3));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, r = rnd.real(1.0, 1.6);
      c.sphere(r, colr, { p: [ax + (bx - ax) * t + nx * r * 0.45, top - 0.55 + rnd.real(-0.2, 0.2), az + (bz - az) * t + nz * r * 0.45], s: [1, 0.78, 1] }, 9, 6);
    }
  };
  edge(x0, z1, x1, z1, 0, 1); edge(x0, z0, x1, z0, 0, -1); edge(x0, z0, x0, z1, -1, 0); edge(x1, z0, x1, z1, 1, 0);
  const nb = Math.max(4, Math.round(((x1 - x0) * (z1 - z0)) / 50));
  for (let i = 0; i < nb; i++) {
    const r = rnd.real(2.2, 3.8);
    c.sphere(r, { v: (x, y, z, nx, ny) => mix(0xb8bce8, 0xf4f6ff, ny * 0.5 + 0.5) }, { p: [rnd.real(x0 + 2, x1 - 2), yb - r * 0.25, rnd.real(z0 + 2, z1 - 2)], s: [1.2, 0.62, 1] }, 8, 5);
  }
  parts.push(flat(c.geometry()));
  return parts;
}

// ------------------------------------------------------------------ Ränder

/** Kristallmäuerchen: lila Steinkörper mit Goldsternen (entlang +X, Länge len). */
function starHedgeGeo(len, seed = 1) {
  const b = new Build();
  b.box(len, 0.6, 0.55, { v: (x, y, z, nx, ny) => (ny > 0.6 ? 0xd8ccff : mix(0x5a4aa8, 0x8a7ad8, y / 0.6 + 0.4)) }, { p: [0, 0.3, 0] }, 0.06);
  const n = Math.max(1, Math.round(len / 1.6));
  const sg = new THREE.ShapeGeometry(starShape(0.18, 0.08), 1);
  for (let i = 0; i < n; i++) b.add(sg.clone(), (i + seed) % 3 ? 0xffd23a : 0xfff2b0, { p: [-len / 2 + (i + 0.5) * (len / n), 0.34, 0.285] });
  sg.dispose();
  return b.geometry();
}
/** Goldenes Sternengeländer an Abbrüchen (entlang +X). */
function starRailGeo(len) {
  const b = new Build();
  const n = Math.max(1, Math.round(len / 2));
  const sg = new THREE.ShapeGeometry(starShape(0.16, 0.07), 1);
  for (let i = 0; i <= n; i++) {
    const x = -len / 2 + i * (len / n);
    b.cyl(0.06, 0.07, 0.8, 0xe8b830, { p: [x, 0.4, 0] }, 6);
    b.add(sg.clone(), 0xffe27a, { p: [x, 0.92, 0.02] });
  }
  sg.dispose();
  b.box(len, 0.07, 0.07, 0xffc83a, { p: [0, 0.74, 0] }, 0);
  b.box(len, 0.05, 0.05, 0xb8a8ff, { p: [0, 0.38, 0] }, 0);
  return b.geometry();
}
/** Rand-Optik des Sternenzelts nach Art, sonst null. */
export function starEdgeGeo(kind, len, seed) {
  if (kind === 'starhedge') return starHedgeGeo(len + 0.1, seed);
  if (kind === 'starrail') return starRailGeo(len);
  return null;
}

/**
 * Sternengeländer an allen Inselrändern zum All (die unsichtbare Kartenwand bleibt): niedrige goldene Pfosten mit leuchtenden
 * Sternchen, Handlauf. Ränder von Brücken (map.walk) bleiben frei – Regenbogenwege und Sternenbrücken haben eigene Ränder.
 */
export function starRims(level, map, grid) {
  if (!level.view) return 0;
  const ground = (x, z) => level.world.raycastDown(x, 80, z, 120)?.y ?? null;
  const onBridge = (x, z) => (map.walk ?? []).some(([a, b, c, d]) => x >= a - 0.05 && x <= c + 0.05 && z >= b - 0.05 && z <= d + 0.05);
  const runs = [];
  for (const w of grid.walls()) {
    const len = w.axis === 'x' ? w.z1 - w.z0 : w.x1 - w.x0;
    const n = Math.max(1, Math.round(len));
    const step = len / n;
    let cur = null;
    for (let i = 0; i < n; i++) {
      const u = (w.axis === 'x' ? w.z0 : w.x0) + (i + 0.5) * step;
      const [ix, iz, ox, oz] = w.axis === 'x' ? [w.x - w.side * 0.25, u, w.x + w.side * 0.75, u] : [u, w.z - w.side * 0.25, u, w.z + w.side * 0.75];
      const hin = ground(ix, iz), hout = ground(ox, oz);
      const ok = hin !== null && !onBridge(ix, iz) && (hout === null || hout < hin - 3.6);
      if (ok && cur && Math.abs(cur.y - hin) < 0.05) { cur.b = u + step / 2; continue; }
      if (cur) { runs.push(cur); cur = null; }
      if (ok) cur = { w, a: u - step / 2, b: u + step / 2, y: hin };
    }
    if (cur) runs.push(cur);
  }
  let posts = 0;
  for (const r of runs) {
    const L = r.b - r.a;
    if (L < 0.6) continue;
    const b = new Build(), gl = new Build();
    const n = Math.max(1, Math.round(L / 2.4));
    const off = r.w.side * -0.18;   // knapp innen an der Kante
    const mid = (r.a + r.b) / 2;
    for (let i = 0; i <= n; i++) {
      const x = -L / 2 + i * (L / n);
      b.cyl(0.055, 0.07, 0.62, 0xe8b830, { p: [x, 0.31, 0] }, 5);
      // Leuchtstern auf dem Pfosten in Weltlage, zur Kamera gedreht
      const [wx, wz] = r.w.axis === 'x' ? [r.w.x + off, mid + x] : [mid + x, r.w.z + off];
      camStar(gl, wx, r.y + 0.8, wz, 0.17, i % 3 ? 0xffe27a : 0xfff6c8);
      posts++;
    }
    b.box(L, 0.06, 0.06, 0xffc83a, { p: [0, 0.6, 0] }, 0);
    const g = b.geometry();
    if (r.w.axis === 'x') { g.rotateY(PI / 2); g.translate(r.w.x + off, r.y, mid); } else g.translate(mid, r.y, r.w.z + off);
    level.view.addStatic(g, { castShadow: false });
    level.view.addStatic(gl.geometry(), { material: 'glow', castShadow: false, tile: GLOW_TILE9 });
  }
  return posts;
}

// ------------------------------------------------------------------ Requisiten

/** Sternenlaterne: Pfosten mit Goldring, darin ein leuchtender Stern (lampGlow). */
function lampGeo() {
  return cached('w9m:lamp', () => {
    const b = new Build();
    b.cyl(0.26, 0.32, 0.3, 0x3a3478, { p: [0, 0.15, 0] }, 8);
    b.cyl(0.07, 0.09, 2.9, { v: (px, py) => mix(0x3a3478, 0x6a5ac8, py / 2.9 + 0.5) }, { p: [0, 1.6, 0] }, 6);
    b.torus(0.42, 0.06, 0xffc83a, { p: [0, 3.5, 0] }, 5, 14);
    b.sphere(0.09, 0xffc83a, { p: [0, 4.0, 0] }, 6, 4);
    return b.geometry();
  });
}
function lampGlowGeo() {
  return cached('w9m:lampglow', () => {
    const b = new Build();
    b.extrude(starShape(0.34, 0.15), 0.12, 0xfff0a0, { p: [0, 3.5, 0] }, 0, 1);
    return b.geometry();
  });
}
/** Leuchtender Kristallbüschel: Fels-Fuß (Geo) und Kristalle (Glow). */
function crystalBaseGeo(s = 1) {
  return cached(`w9m:crystalbase:${s}`, () => {
    const b = new Build();
    b.add(new THREE.DodecahedronGeometry(0.7 * s, 0), { v: (qx, qy, qz, nx, ny) => mix(0x4a3a88, 0x8a7ac8, ny * 0.5 + 0.5) }, { p: [0, 0.3 * s, 0], s: [1.3, 0.6, 1] });
    return b.geometry();
  });
}
function crystalGlowGeo(s = 1, colorI = 0) {
  return cached(`w9m:crystal:${s}:${colorI}`, () => {
    const b = new Build();
    const [c1, c2] = [[0x5af0e8, 0xc8fff8], [0xff8ae0, 0xffd8f4], [0xffd23a, 0xfff2b0]][colorI % 3];
    for (const [px, pz, h, rx, rz] of [[0, 0, 1.6, 0, 0], [0.35, 0.15, 1.1, 0.3, -0.4], [-0.32, 0.12, 1.0, -0.3, 0.3], [0.05, -0.35, 0.9, 0.35, 0.2]]) {
      b.add(new THREE.ConeGeometry(0.2 * s, h * s, 5), { v: (x, y) => mix(c1, c2, y / (h * s) + 0.5) }, { p: [px * s, (0.4 + h / 2) * s, pz * s], r: [rx, 0, rz] });
    }
    return b.geometry();
  });
}
/** Sternstatue: puffiger Goldstern auf einem lila Sockel (Vorderseite +Z). */
function starStatueGeo(s = 1) {
  return cached(`w9m:starstatue:${s}`, () => {
    const b = new Build();
    b.cyl(0.9 * s, 1.05 * s, 0.6 * s, { v: (px, py) => mix(0x4a3a98, 0x8a7ad8, py / (0.6 * s) + 0.5) }, { p: [0, 0.3 * s, 0] }, 12);
    b.cyl(0.12 * s, 0.12 * s, 0.6 * s, 0xffc83a, { p: [0, 0.9 * s, 0] }, 6);
    b.extrude(starShape(1.25 * s, 0.56 * s), 0.42 * s, { v: (px, py, pz, nx, ny, nz) => (Math.abs(nz) > 0.6 ? mix(0xffc21a, 0xfff2a0, py / (1.25 * s) * 0.5 + 0.5) : 0xe89a10) }, { p: [0, 2.35 * s, 0] }, 0.08 * s, 1, 1);
    return b.geometry();
  });
}
/** Holzkisten-Stapel (Holz-Walzen-Insel). */
function cratesGeo() {
  return cached('w9m:crates', () => {
    const b = new Build();
    const crate = (x, y, z, s, r) => {
      b.box(s, s, s, { v: (px, py, pz, nx, ny) => (ny > 0.6 ? 0xf0c080 : 0xd89a58) }, { p: [x, y + s / 2, z], r: [0, r, 0] }, 0.04);
      b.box(s * 1.02, 0.1, s * 1.02, 0xa0662e, { p: [x, y + s * 0.5, z], r: [0, r, 0] }, 0);
    };
    crate(0, 0, 0, 1.1, 0.1); crate(1.2, 0, 0.2, 0.9, -0.2); crate(0.5, 1.1, 0.1, 0.8, 0.35);
    return b.geometry();
  });
}
/** Farn (Dschungel): Fächer aus weich gebogenen Wedeln (flache Ellipsoide). */
function fernGeo() {
  return cached('w9m:fern', () => {
    const b = new Build();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + 0.2;
      b.sphere(1, { v: (x, y, z, nx, ny) => mix(0x2e8a3a, 0xa0f070, ny * 0.5 + 0.5) }, { p: [Math.cos(a) * 1.0, 0.75, Math.sin(a) * 1.0], r: [0, -a, 0.55], s: [1.25, 0.1, 0.34] }, 8, 5);
    }
    b.sphere(0.35, 0x3e9a3e, { p: [0, 0.3, 0] }, 7, 5);
    return b.geometry();
  });
}
/** Sternwarte: Fernrohr auf einem Dreibein mit Goldringen (Sternenhafen). */
function scopeGeo() {
  return cached('w9m:scope', () => {
    const b = new Build();
    for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; b.cyl(0.05, 0.06, 1.7, 0x6a5a3a, { p: [Math.cos(a) * 0.38, 0.8, Math.sin(a) * 0.38], r: [Math.sin(a) * 0.24, 0, -Math.cos(a) * 0.24] }, 5); }
    b.sphere(0.14, 0xffc83a, { p: [0, 1.62, 0] }, 6, 4);
    b.cyl(0.13, 0.2, 1.9, { v: (px, py) => mix(0x3a3a9a, 0x6a6ad8, py / 1.9 + 0.5) }, { p: [0.1, 1.95, 0], r: [0, 0, -1.05] }, 10);
    for (const u of [-0.6, 0.15, 0.82]) b.torus(0.2 - u * 0.03, 0.035, 0xffc83a, { p: [0.1 + u * 0.87, 1.95 + u * 0.5, 0], r: [0, PI / 2, 1.05] }, 4, 12);
    return b.geometry();
  });
}
/** Raketen-Startplatz: flache Scheibe mit Goldring und Zielkreuz (ohne Schatten). */
function padGeo() {
  return cached('w9m:pad', () => {
    const b = new Build();
    b.cyl(2.4, 2.4, 0.06, 0x3a3478, { p: [0, 0.03, 0] }, 24);
    b.torus(2.1, 0.08, 0xffc83a, { p: [0, 0.07, 0], r: [PI / 2, 0, 0] }, 4, 28);
    for (const r of [0, PI / 2]) b.box(3.4, 0.02, 0.14, 0xfff0a0, { p: [0, 0.07, 0], r: [0, r, 0] }, 0);
    return b.geometry();
  });
}
/** Verschneite Tanne (Nebelfriedhof). */
function firGeo(h = 4) {
  return cached(`w9m:fir:${h}`, () => {
    const b = new Build();
    b.cyl(0.16, 0.22, h * 0.25, 0x6a4a3a, { p: [0, h * 0.12, 0] }, 6);
    for (let k = 0; k < 3; k++) {
      const r = h * (0.32 - k * 0.08), y = h * (0.25 + k * 0.22);
      b.cone(r, h * 0.36, { v: (px, py, pz, nx, ny) => (ny > 0.45 ? 0xf4f6ff : mix(0x2a6a5a, 0x3e8a6a, py / (h * 0.36) + 0.5)) }, { p: [0, y + h * 0.18, 0] }, 7);
    }
    return b.geometry();
  });
}
/** Neonlampe (Kanonen-Station): Metallmast; Leuchtring separat (Glow). */
function neonGeo() {
  return cached('w9m:neon', () => new Build().cyl(0.12, 0.18, 3.6, { v: (px, py) => mix(0x8a96b8, 0xeef2fa, py / 3.6 + 0.5) }, { p: [0, 1.8, 0] }, 8).cyl(0.36, 0.42, 0.2, 0x5a6488, { p: [0, 0.1, 0] }, 8).geometry());
}
function neonGlowGeo() {
  return cached('w9m:neonglow', () => new Build().torus(0.38, 0.07, 0x5af0ff, { p: [0, 3.7, 0], r: [PI / 2, 0, 0] }, 4, 16).sphere(0.16, 0xff7ae0, { p: [0, 3.75, 0] }, 6, 4).geometry());
}
/** Ersatz: einfache Spielzeugrakete (fehlt 'spielzeugrakete'). */
function rocketFallbackGeo(color = 'rot', h = 4) {
  return cached(`w9m:rocket:${color}:${h}`, () => {
    const c = { rot: 0xe8384a, blau: 0x3a6ae8, gruen: 0x2ec85a, lila: 0x9a4ae8 }[color] ?? 0xe8384a;
    const b = new Build();
    b.lathe([[0, 0.4 * h], [0.18 * h, 0.45 * h], [0.2 * h, 0.7 * h], [0.12 * h, 0.9 * h], [0, h]], { v: (px, py) => (py > 0.88 * h ? c : 0xf4f4fa) }, null, 12);
    for (let i = 0; i < 3; i++) b.box(0.05 * h, 0.3 * h, 0.16 * h, c, { p: [Math.cos(i * 2.09) * 0.2 * h, 0.15 * h, Math.sin(i * 2.09) * 0.2 * h], r: [0, -i * 2.09, 0] }, 0.02);
    return b.geometry();
  });
}
/** Ersatz: kleiner Planet (Kugel mit Bändern), Mitte bei y = s/2. */
function planetFallbackGeo(kind = 'ring', s = 6) {
  return cached(`w9m:planet:${kind}:${s}`, () => {
    const [c0, c1] = { ring: [0xff9a6a, 0xffd8b0], pilz: [0x5ac84a, 0xa8f070], blume: [0x7ad85a, 0xffb0d8], eis: [0x8ad8ff, 0xf0faff] }[kind] ?? [0xff9a6a, 0xffd8b0];
    const b = new Build();
    b.sphere(s / 2, { v: (px, py) => mix(c0, c1, Math.sin((py / s) * 14) * 0.5 + 0.5) }, { p: [0, s / 2, 0] }, 16, 12);
    if (kind === 'ring') b.torus(s * 0.8, s * 0.06, 0xfff0c8, { p: [0, s / 2, 0], r: [PI / 2 - 0.4, 0, 0.2] }, 4, 32);
    return b.geometry();
  });
}

/** Requisite des Sternenzelts (map.props: kind …9), sonst null. Fußpunkt im Ursprung. */
export function starPropGeo(it, seed) {
  const s = it.size;
  switch (it.kind) {
    case 'lamp9': return lampGeo().clone();
    case 'crystal9': return crystalBaseGeo(s ?? 1).clone();
    case 'star9': return starStatueGeo(s ?? 1).clone();
    case 'crates9': return cratesGeo().clone();
    case 'fern9': return fernGeo().clone();
    case 'fir9': return firGeo(s ?? 4).clone();
    case 'neon9': return neonGeo().clone();
    case 'scope9': return scopeGeo().clone();
    case 'pad9': return padGeo().clone();
    case 'rocket9': return rocketFallbackGeo(it.color, s ?? 4).clone();
    case 'planet9': return planetFallbackGeo(it.planet, s ?? 6).clone();
    case 'rock9': return crystalBaseGeo((s ?? 1) * 1.6).clone();
    default: return null;
  }
}
/** Leuchtende Teile einer Requisite (Material 'glow'), sonst null. */
export function starPropGlow(it) {
  switch (it.kind) {
    case 'lamp9': return lampGlowGeo().clone();
    case 'crystal9': return crystalGlowGeo(it.size ?? 1, it.tone ?? 0).clone();
    case 'neon9': return neonGlowGeo().clone();
    default: return null;
  }
}
/** Kollisionsform einer Requisite (Weltkoordinaten), sonst null. */
export function starPropShape(it) {
  const [x, y, z] = it.pos, s = it.size ?? 1;
  switch (it.kind) {
    case 'lamp9': return { type: 'cyl', x, z, r: 0.3, y0: y, y1: y + 4.1, tag: 'laterne' };
    case 'crystal9': return { type: 'cyl', x, z, r: 0.8 * s, y0: y, y1: y + 2 * s, tag: 'kristall' };
    case 'star9': return { type: 'cyl', x, z, r: 1.0 * s, y0: y, y1: y + 3.6 * s, tag: 'sternstatue' };
    case 'crates9': return { type: 'box', min: [x - 0.7, y, z - 0.7], max: [x + 1.8, y + 1.9, z + 0.8], tag: 'kisten' };
    case 'rocket9': return { type: 'cyl', x, z, r: 0.28 * (s ?? 4), y0: y, y1: y + (s ?? 4), tag: 'rakete' };
    case 'fir9': return { type: 'cyl', x, z, r: 0.5, y0: y, y1: y + (s ?? 4), tag: 'tanne' };
    case 'neon9': return { type: 'cyl', x, z, r: 0.3, y0: y, y1: y + 3.8, tag: 'neon' };
    case 'scope9': return { type: 'cyl', x, z, r: 0.5, y0: y, y1: y + 2.4, tag: 'fernrohr' };
    case 'pad9': return null;
    case 'antenna9': return { type: 'cyl', x, z, r: 1.0, y0: y, y1: y + 7.5, tag: 'antenne' };
    case 'boost9': return null;
    case 'donut9': return { type: 'box', min: [x - 0.5, y, z - 0.5], max: [x + 0.5, y + 1, z + 0.5], tag: 'donut' };
    case 'rbush9': return null;
    case 'rblock9': { const h = it.blockSize ?? 2; return { type: 'box', min: [x - h / 2, y, z - h / 2], max: [x + h / 2, y + h, z + h / 2], tag: 'retroblock' }; }
    case 'hexpillar9': return { type: 'cyl', x, z, r: 1.1, y0: y, y1: y + (it.h ?? 5), tag: 'wabensaeule' };
    case 'plant9': return it.plant === 'blatt' ? null : { type: 'cyl', x, z, r: it.plant === 'pilz' ? 0.6 * (s / 4) : 0.4, y0: y, y1: y + (s ?? 6) * 0.6, tag: 'pflanze' };
    case 'fern9': return null;
    case 'grave9': return { type: 'box', min: [x - 0.5, y, z - 0.3], max: [x + 0.5, y + 1.2, z + 0.3], tag: 'grab' };
    case 'planet9': return null;
    default: return null;
  }
}
/**
 * Registry-Kulisse für Requisiten des Sternenzelts: [Name, Optionen, yaw-Korrektur, Maßstab] oder null – mit Dreiecks-Obergrenze;
 * fehlt das Modell oder ist es zu schwer, zeichnet starPropGeo eigene Geometrie (bzw. nichts für reine Modell-Requisiten).
 */
export function starPropModel(it) {
  const FRONT = -PI / 2;
  const s = it.size;
  const spec = {
    rocket9: ['spielzeugrakete', { color: it.color ?? 'rot', size: s ?? 4.6 }, FRONT, 1, 5600],
    boost9: ['boost_arrow', {}, 0, 1, 700],
    donut9: ['donut_block', {}, FRONT, 1, 5000],
    rbush9: ['retro_busch', { size: s ?? 3, seed: it.seed ?? 0 }, FRONT, 1, 2600],
    rblock9: ['retro_block', { kind: it.block ?? 'gras', size: it.blockSize ?? 2 }, FRONT, 1, 1200],
    hexpillar9: ['wabensaeule', { height: it.h ?? 5, kind: it.hex ?? 'normal' }, 0, 1, 3400],
    plant9: ['riesenpflanze', { kind: it.plant ?? 'blume', ...(s ? { size: s } : {}) }, FRONT, 1, 4800],
    grave9: ['schneegrab', { kind: it.grave ?? 'rund', tilt: it.tilt ?? 0 }, FRONT, 1, 2600],
    antenna9: ['weltraum_antenne', {}, FRONT, 1, 2800],
    planet9: ['planet', { kind: it.planet ?? 'ring', size: s ?? 6 }, 0, 1, 11500],
  }[it.kind];
  if (!spec) return null;
  const [name, opts, yawFix, scale, max] = spec;
  if (!hasModel(name) || tooHeavy9(name, opts, max)) return null;
  W9_USED.add(name);
  return [name, opts, yawFix, scale];
}

/**
 * Streudeko auf nicht begehbaren Blöcken (deterministisch): Kristalle und Felsbrocken auf Asteroiden-Fels, Farne im Dschungel,
 * Tannen im Schnee; dazu die Sternengeländer an den Inselrändern (starRims).
 */
export function scatterStar(level, map, grid) {
  const parts = [], glow = [];
  map.ground.forEach((b, i) => {
    const style = b.style ?? 'starplaza';
    if (b.walk || b.noDeco || !['asteroid', 'jungle', 'snowfog'].includes(style)) return;
    const [x0, z0, x1, z1] = b.rect;
    const w = x1 - x0, d = z1 - z0;
    if (w < 2.5 || d < 2.5) return;
    const rnd = new Rnd(0x9a7a + i * 131);
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
    if (style === 'jungle') { put(Math.floor(area / 30), 2.4, (x, z, r) => parts.push(place(fernGeo().clone(), x, y, z, r.real(0, 6)))); return; }
    if (style === 'snowfog') { put(Math.floor(area / 40), 2.6, (x, z, r) => parts.push(place(firGeo(+r.real(3, 5).toFixed(1)).clone(), x, y, z, r.real(0, 6)))); return; }
    put(Math.max(1, Math.floor(area / 50)), 2.6, (x, z, r) => {
      const s = +r.real(0.7, 1.1).toFixed(1);
      parts.push(place(crystalBaseGeo(s).clone(), x, y, z, r.real(0, 6)));
      glow.push(place(crystalGlowGeo(s, r.int(0, 2)).clone(), x, y, z, r.real(0, 6)));
    });
  });
  for (const g of parts) level.view?.addStatic(g, { castShadow: true });
  for (const g of glow) level.view?.addStatic(g, { material: 'glow', castShadow: false, tile: GLOW_TILE9 });
  starRims(level, map, grid);
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
/** Lokaler Punkt (lx längs, ly hoch, lz quer) einer Brücke von a nach c → Weltkoordinaten (wie placeAlong). */
function worldAlong(a, c, lx, ly, lz) {
  const dx = c[0] - a[0], dz = c[2] - a[2], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
  return [a[0] + lx * ux - lz * uz, a[1] + ly, a[2] + lx * uz + lz * ux];
}

/** Regenbogenweg: sieben Farbbahnen auf einem lila Unterbau, weiße Randwülste, Goldsterne (leuchtend) entlang der Wülste. */
function buildRainbowWay(level, spec) {
  buildBridge({ world: level.world, view: null }, { ...spec, rails: false });
  if (!level.view) return;
  const { a, c, L, dy, pitch, Ld, w } = spanOf(spec);
  const b = new Build(), gl = new Build(), deck = new Build();
  b.box(Ld + 0.3, 0.42, w + 0.3, { v: (px, py, pz, nx, ny) => (ny < -0.5 ? 0x4a3a98 : mix(0x7a5ac8, 0xb8a0f0, py + 0.5)) }, { p: [L / 2, dy / 2 - 0.27, 0], r: [0, 0, pitch] }, 0.08);
  for (let k = 0; k < 7; k++) {
    const z = -w / 2 + (k + 0.5) * (w / 7);
    deck.box(Ld + 0.1, 0.06, w / 7 + 0.004, RAINBOW9[k], { p: [L / 2, dy / 2 - 0.03, z], r: [0, 0, pitch] }, 0);
  }
  for (const s of [-1, 1]) b.cyl(0.14, 0.14, Ld + 0.2, 0xffffff, { p: [L / 2, dy / 2 + 0.04, s * (w / 2 + 0.04)], r: [0, 0, pitch - PI / 2] }, 6);
  // Goldsterne auf den Wülsten und ein paar unter dem Weg (Weltlage, zur Kamera gedreht)
  const n = Math.max(2, Math.round(Ld / 1.5));
  for (let i = 0; i < n; i++) {
    const [px, py] = at(((i + 0.5) / n) * Ld, pitch);
    for (const s of [-1, 1]) camStar(gl, ...worldAlong(a, c, px, py + 0.32, s * (w / 2 + 0.04)), 0.2, i % 2 ? 0xfff2a0 : 0xffc83a);
  }
  const nu = Math.max(1, Math.round(Ld / 3));
  for (let i = 0; i < nu; i++) {
    const [px, py] = at(((i + 0.5) / nu) * Ld, pitch);
    camStar(gl, ...worldAlong(a, c, px, py - 0.9, (i % 2 ? 1 : -1) * w * 0.3), 0.26, 0xfff6c8);
  }
  level.view.addStatic(placeAlong(b.geometry(), a, c), { castShadow: true });
  level.view.addStatic(placeAlong(deck.geometry(), a, c), { castShadow: false });
  level.view.addStatic(gl.geometry(), { material: 'glow', castShadow: false, tile: GLOW_TILE9 });
}

/** Sternenbrücke: nachtblauer Steg mit Goldkante, goldenen Sternplatten, Pfosten mit leuchtenden Sternen und Goldkordel. */
function buildStarBridge(level, spec) {
  buildBridge({ world: level.world, view: null }, { ...spec, rails: false });
  if (!level.view) return;
  const { a, c, L, dy, pitch, Ld, w } = spanOf(spec);
  const b = new Build(), gl = new Build(), deck = new Build();
  b.box(Ld + 0.2, 0.36, w, { v: (px, py, pz, nx, ny) => (ny < -0.5 ? 0x22205a : mix(0x2e2c78, 0x4a48a8, py + 0.5)) }, { p: [L / 2, dy / 2 - 0.2, 0], r: [0, 0, pitch] }, 0.06);
  for (const s of [-1, 1]) b.box(Ld + 0.2, 0.1, 0.18, 0xffc23a, { p: [L / 2, dy / 2 - 0.01, s * (w / 2 - 0.09)], r: [0, 0, pitch] }, 0);
  const n = Math.max(2, Math.round(Ld / 1.25));
  const sg = new THREE.ShapeGeometry(starShape(0.52, 0.23), 1).rotateX(-PI / 2);
  for (let i = 0; i < n; i++) {
    const [px, py] = at(((i + 0.5) / n) * Ld, pitch);
    for (const s of [-0.5, 0.5]) deck.add(sg.clone(), (i + (s > 0 ? 1 : 0)) % 2 ? 0xffd23a : 0xfff0a8, { p: [px, py + 0.012, s * (w / 2 - 0.4)], r: [0, 0, pitch] });
  }
  sg.dispose();
  const nP = Math.max(2, Math.round(Ld / 2.6) + 1);
  for (const s of [-1, 1]) {
    for (let i = 0; i < nP; i++) {
      const [px, py] = at((i / (nP - 1)) * Ld, pitch);
      b.cyl(0.06, 0.08, 0.95, 0xe8b830, { p: [px, py + 0.47, s * (w / 2 - 0.05)] }, 6);
      camStar(gl, ...worldAlong(a, c, px, py + 1.14, s * (w / 2 - 0.05)), 0.24, i % 2 ? 0xfff2a0 : 0xffd23a);
    }
    // Goldkordel: leicht durchhängend zwischen den Pfosten
    const pts = [];
    for (let i = 0; i <= (nP - 1) * 4; i++) {
      const u = i / ((nP - 1) * 4), [px, py] = at(u * Ld, pitch);
      pts.push([px, py + 0.9 - Math.abs(Math.sin(u * (nP - 1) * PI)) * 0.18, s * (w / 2 - 0.05)]);
    }
    b.tube(pts, 0.035, 0xffc83a, null, (nP - 1) * 6, 4);
  }
  // leuchtende Kristalle hängen unter dem Steg
  const nS = Math.max(1, Math.round(Ld / 6));
  for (let i = 1; i <= nS; i++) {
    const [px, py] = at((i / (nS + 1)) * Ld, pitch);
    gl.add(new THREE.OctahedronGeometry(0.26, 0), 0xb8f0ff, { p: worldAlong(a, c, px, py - 0.9, 0), s: [1, 1.6, 1] });
  }
  level.view.addStatic(placeAlong(b.geometry(), a, c), { castShadow: true });
  level.view.addStatic(placeAlong(deck.geometry(), a, c), { castShadow: false });
  level.view.addStatic(gl.geometry(), { material: 'glow', castShadow: false, tile: GLOW_TILE9 });
}

/** Brücke des Sternenzelts bauen (segments); false = unbekannte Art. */
export function buildStarSegment(level, seg) {
  switch (seg.type) {
    case 'rainbowway': buildRainbowWay(level, seg); return true;
    case 'starbridge': buildStarBridge(level, seg); return true;
    default: return false;
  }
}

// ------------------------------------------------------------------ Inselchen, Nachbarwelt

/** Kleiner schwebender Asteroid (6–22 m hoch) mit Kristallen, Mini-Planet oder Spielzeugrakete. */
export function starIsletParts(x, z, w, d, top, rnd) {
  const parts = [];
  const y = 6 + rnd.frac() * 16;
  const r = Math.min(w, d) * 0.42;
  const g = new THREE.IcosahedronGeometry(r, 1);
  const pa = g.attributes.position;
  for (let i = 0; i < pa.count; i++) {
    const k = 0.82 + hash2(pa.getX(i) * 3 + x, pa.getZ(i) * 3 + z) * 0.3;
    pa.setXYZ(i, pa.getX(i) * k * (w / d > 1 ? 1.25 : 1), pa.getY(i) * k * 0.62, pa.getZ(i) * k);
  }
  g.computeVertexNormals();
  const rock = colorize(g.index ? g.toNonIndexed() : g, (p, n, o) => mixc(lin(0x3e3278), lin(0x9a8ad0), smooth(-0.6, 0.9, n.y), o));
  rock.translate(x, y, z);
  parts.push(rock);
  const k = rnd.frac();
  if (k < 0.55) {
    const cg = crystalGlowGeo(+(r * 0.45).toFixed(1), rnd.int(0, 2)).clone();
    cg.translate(x, y + r * 0.5, z);
    cg.userData.material = 'glow';
    parts.push(cg);
  } else {
    const pg = place(rocketFallbackGeo(['rot', 'blau', 'lila'][rnd.int(0, 2)], +(r * 1.4).toFixed(1)).clone(), x, y + r * 0.45, z, rnd.real(0, 6));
    parts.push(pg);
  }
  void top;
  return parts;
}

/** Ferne Nachbarwelt 'rummelfern' (Welt 8 tief unten: dunkle Insel mit Turm, Riesenrad-Ring und Zelt), ein Mesh. */
export function starNeighborParts(nb, rnd) {
  if (nb.style !== 'rummelfern') return [];
  const [x, z] = nb.pos;
  const [w, d] = nb.size ?? [80, 56];
  const y = nb.y ?? -20;
  const B = new Build();
  B.box(w, 8, d, { v: (px, py, pz, nx, ny) => mix(0x3a2a5a, 0x7a5a9a, ny * 0.5 + 0.5) }, { p: [x, y - 4, z] }, 0);
  B.cone(w * 0.5, 22, { v: (px, py) => mix(0x2a1e44, 0x4a3a6a, py / 22 + 0.5) }, { p: [x, y - 19, z], r: [PI, 0, 0] }, 10);
  B.cyl(4, 5, 34, { v: (px, py) => mix(0x4a3a5a, 0x8a6a7a, py / 34 + 0.5) }, { p: [x + w * 0.1, y + 17, z - d * 0.1] }, 10);
  B.cone(6, 8, 0xc4304e, { p: [x + w * 0.1, y + 38, z - d * 0.1] }, 8);
  B.torus(11, 0.8, 0xe8506a, { p: [x - w * 0.25, y + 13, z + d * 0.1] }, 4, 24);
  B.cone(7, 7, 0xff7ab4, { p: [x + w * 0.3, y + 3.5, z + d * 0.2] }, 10);
  void rnd;
  return [B.geometry()];
}

// ------------------------------------------------------------------ Sternenmeer (statt Meer)

/**
 * Sternenmeer unter den schwebenden Inseln (statt Meer, Schaum und Glitzern): zwei Schichten Sterne tief unten (Parallaxe beim
 * Laufen, ein Punkte-Objekt je Schicht) und weiche farbige Nebel (additive Scheiben, ein Mesh). Unbeleuchtet, ohne Schatten.
 */
export class StarSea {
  constructor(view, map, b, host) {
    this.view = view;
    this.group = host.group;
    this.own = [];
    const rnd = new Rnd(0x57a9);
    const x0 = b.min.x - 140, x1 = b.max.x + 140, z0 = b.min.z - 140, z1 = b.max.z + 140;
    const layer = (n, y0, y1, size, name) => {
      const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
      const tints = [0xffffff, 0xd8e4ff, 0xfff0c0, 0xffd0f0, 0xc0fff0].map((c) => new THREE.Color(c));
      for (let i = 0; i < n; i++) {
        pos[i * 3] = rnd.real(x0, x1); pos[i * 3 + 1] = rnd.real(y0, y1); pos[i * 3 + 2] = rnd.real(z0, z1);
        const c = tints[i % tints.length], k = rnd.real(0.55, 1);
        col[i * 3] = c.r * k; col[i * 3 + 1] = c.g * k; col[i * 3 + 2] = c.b * k;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const mat = new THREE.PointsMaterial({ size, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false, transparent: true });
      const pts = new THREE.Points(g, mat);
      pts.frustumCulled = false;
      pts.renderOrder = -2;
      pts.name = name;
      this.own.push(g, mat);
      this.group.add(pts);
      return pts;
    };
    this.deep = layer(1800, -95, -30, 2.2, 'w9:sterne-tief');
    this.near = layer(320, -28, -6, 3.6, 'w9:sterne-nah');
    // weiche Nebel tief unten (horizontale Scheiben mit radialem Verlauf, additiv)
    const tex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const g2 = c.getContext('2d');
      const gr = g2.createRadialGradient(64, 64, 2, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,255,255,0.8)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.3)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g2.fillStyle = gr; g2.fillRect(0, 0, 128, 128);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    this.own.push(tex);
    const neb = [];
    const cols = [0x7a3ad8, 0x2a7ad8, 0xd83aa0, 0x3ad8b0, 0x5a4ae8];
    for (let i = 0; i < 9; i++) {
      const s = rnd.real(70, 130);
      const g = new THREE.PlaneGeometry(s, s * rnd.real(0.5, 0.9)).rotateX(-PI / 2).rotateY(rnd.real(0, PI));
      g.translate(rnd.real(b.min.x - 40, b.max.x + 40), rnd.real(-70, -50), rnd.real(b.min.z - 40, b.max.z + 40));
      const c = lin(cols[i % cols.length]);
      const n = g.attributes.position.count, col = new Float32Array(n * 3);
      for (let k = 0; k < n; k++) { col[k * 3] = c[0] * 0.5; col[k * 3 + 1] = c[1] * 0.5; col[k * 3 + 2] = c[2] * 0.5; }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      neb.push(g.toNonIndexed());
    }
    const B = new Build();
    for (const g of neb) B.parts.push(g);
    const ng = B.geometry();
    const nm = new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
    // Build.geometry löscht keine uv – fehlt sie, gibt es keine Textur: uv nachtragen
    if (!ng.attributes.uv) {
      const uv = new Float32Array(ng.attributes.position.count * 2);
      for (let i = 0; i < ng.attributes.position.count; i += 6) {
        const q = [[0, 1], [0, 0], [1, 1], [0, 0], [1, 0], [1, 1]];
        for (let k = 0; k < 6; k++) { uv[(i + k) * 2] = q[k][0]; uv[(i + k) * 2 + 1] = q[k][1]; }
      }
      ng.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    }
    this.nebula = new THREE.Mesh(ng, nm);
    this.nebula.frustumCulled = false;
    this.nebula.renderOrder = -3;
    this.nebula.name = 'w9:nebel-tief';
    this.own.push(ng, nm);
    this.group.add(this.nebula);
    void map;
  }

  update(t) {
    this.near.material.size = 3.4 + Math.sin(t * 1.9) * 0.6;
    this.deep.material.size = 2.1 + Math.sin(t * 1.3 + 1) * 0.25;
  }

  dispose() { for (const o of this.own) o.dispose?.(); this.own.length = 0; }
}

// ------------------------------------------------------------------ Taktuhr

let mapBpm = 0;
/** Tempo der Kartenmusik (Ersatzuhr, falls keine Musik läuft). */
export const MAP_BPM9 = () => mapBpm || (mapBpm = music.themeInfo?.('course_worldstar_map')?.bpm ?? music.themeInfo?.('course_map')?.bpm ?? 120);
/** Taktuhr: Zählzeit aus music.beat() (Kartenmusik), sonst aus der Bildzeit im Tempo der Kartenmusik. */
export function beatNow9(t) {
  const mb = music.beat();
  const useMusic = mb.bpm > 0 && mb.playing;
  return { beat: useMusic ? mb.beat : (t * MAP_BPM9()) / 60, source: useMusic ? mb.source : 'zeit', theme: mb.theme ?? null, bpm: useMusic ? mb.bpm : MAP_BPM9() };
}
/** Puls je Zählzeit: hell am Taktschlag, klingt danach ab (0,4 … 1). */
export const beatPulse9 = (frac) => 0.4 + 0.6 * Math.exp(-3.2 * frac);

// ------------------------------------------------------------------ Lebendige Kulisse

const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
const _fr = new THREE.Frustum(), _fm = new THREE.Matrix4(), _fs = new THREE.Sphere();
function setI(m, i, x, y, z, ry = 0, s = 1, rx = 0, rz = 0) {
  _e.set(rx, ry, rz, 'YXZ');
  _q.setFromEuler(_e);
  if (Array.isArray(s)) _s.set(s[0], s[1], s[2]); else _s.setScalar(s);
  _m4.compose(_p.set(x, y, z), _q, _s);
  m.setMatrixAt(i, _m4);
}
const TWINKLE_COLS = [0xfff2a0, 0xffffff, 0xffb8e8, 0xa8f0ff, 0xffd23a];

/** Funkel-Stern: drei gekreuzte Vier-Zack-Funkel (XY, ZY, XZ), Radius 1 – unbeleuchtet, beidseitig. */
function twinkleGeo() {
  return cached('w9m:twinkle', () => {
    const s = new THREE.ShapeGeometry(sparkShape(1, 0.2), 3);
    const parts = [s.clone(), s.clone().rotateY(PI / 2), s.clone().rotateX(PI / 2)];
    s.dispose();
    const B = new Build();
    for (const g of parts) B.add(g, 0xffffff);
    return B.geometry();
  });
}

/**
 * Bewegte Kulisse des Sternenzelts (MapBuilder: out.life, je Bild update; CourseMapScene.state().decor über liveInfo):
 *   funkelnde Sterne   rings um alle begehbaren Inseln (map.twinkle { perIsland, seed }) – eine Instanz-Fläche; je Zählzeit der
 *                      Kartenmusik leuchtet eine von drei Gruppen hell auf (Puls am Taktschlag), die anderen glimmen
 *   map.planets        [{ kind, pos (Mitte), size, speed }] Planeten (Registry 'planet' mit kind) drehen sich (sonst eigene Kugel)
 *   map.rockets        [{ c, r, h, speed, color }] Spielzeugraketen ('spielzeugrakete', Flamme an) kreisen um c
 *   map.shooting       { n, period } Sternschnuppen ('sternschnuppe') sausen in Abständen schräg durchs Bild (Blickpunkt der Kamera)
 */
export class StarLife {
  constructor(level, map) {
    this.view = level.view;
    this.level = level;
    this.map = map;
    this.own = [];
    this.far = false;
    this.buildTwinkles(map);
    this.buildPlanets(map.planets ?? []);
    this.buildRockets(map.rockets ?? []);
    this.buildShooting(map.shooting ?? null);
    this.shown = null;
    this.update(0, 0);
  }

  add(obj) { this.view.add(obj); this.own.push(obj); return obj; }

  /** Funkel-Sterne um die Inseln: außen am Rand, etwas unter bis knapp über der Decke. */
  buildTwinkles(map) {
    const spec = map.twinkle ?? {};
    const rnd = new Rnd(0x7ee1 + (spec.seed ?? 0));
    this.stars = [];
    for (const b of map.ground ?? []) {
      if (!b.walk) continue;
      const [x0, z0, x1, z1] = b.rect;
      const n = spec.perIsland ?? 12;
      for (let i = 0; i < n; i++) {
        const side = rnd.int(0, 3), u = rnd.frac(), off = rnd.real(1.4, 5);
        const x = side === 0 ? x0 - off : side === 1 ? x1 + off : x0 + (x1 - x0) * u;
        const z = side === 2 ? z0 - off : side === 3 ? z1 + off : z0 + (z1 - z0) * u;
        this.stars.push({ x, y: b.top + rnd.real(-6.5, 2.2), z, s: rnd.real(0.22, 0.5), c: TWINKLE_COLS[i % TWINKLE_COLS.length], spin: rnd.real(0, 6) });
      }
    }
    const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, fog: true, toneMapped: false });
    this.twMesh = new THREE.InstancedMesh(twinkleGeo(), mat, Math.max(1, this.stars.length));
    this.twMesh.frustumCulled = false;
    this.twMesh.castShadow = false;
    this.twMesh.receiveShadow = false;
    this.twMesh.name = 'w9:funkelsterne';
    this.own.push(mat);
    this.stars.forEach((st, i) => { setI(this.twMesh, i, st.x, st.y, st.z, st.spin, st.s); this.twMesh.setColorAt(i, _c.set(st.c)); });
    this.twMesh.count = this.stars.length;
    this.twMesh.instanceMatrix.needsUpdate = true;
    this.add(this.twMesh);
  }

  /** Stellung der Funkel-Sterne aus der Taktuhr: Gruppe (0..2) je Zählzeit, Puls k am Taktschlag. */
  twinkleState(t = this.view.time) {
    const bt = beatNow9(t);
    const whole = Math.floor(bt.beat), frac = bt.beat - whole;
    return { beat: +bt.beat.toFixed(3), step: ((whole % 3) + 3) % 3, k: +beatPulse9(frac).toFixed(4), source: bt.source, theme: bt.theme, bpm: bt.bpm };
  }

  /** Planeten (Registry 'planet' mit kind; drehen sich), sonst eigene Kugel mit Bändern. */
  buildPlanets(list) {
    this.planets = [];
    for (const p of list) {
      const size = p.size ?? 8;
      let m = null;
      if (hasModel('planet') && !tooHeavy9('planet', { kind: p.kind, size }, 11500)) {
        m = getModel('planet', { kind: p.kind, size });
        if (m.placeholder) { m.dispose?.(); m = null; }
      }
      let root;
      if (m) { root = m.root; W9_USED.add('planet'); this.own.push(m); } else {
        root = new THREE.Mesh(planetFallbackGeo(p.kind, size), vcol(0.6, {}, 'w9planet'));
      }
      // Ursprung des Modells: Mitte bei y = size/2 → Mitte an p.pos
      root.position.set(p.pos[0], p.pos[1] - size / 2, p.pos[2]);
      root.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
      this.view.add(root);
      if (!m) this.own.push(root);
      this.planets.push({ spec: p, model: m, root, angle: 0, size });
    }
  }

  /** Spielzeugraketen kreisen mit Flamme (Registry 'spielzeugrakete', sonst eigene Rakete). */
  buildRockets(list) {
    this.rockets = [];
    for (const r of list) {
      const pivot = new THREE.Group();
      let m = null;
      if (hasModel('spielzeugrakete') && !tooHeavy9('spielzeugrakete', { color: r.color ?? 'rot', size: 3.2 }, 5600)) {
        m = getModel('spielzeugrakete', { color: r.color ?? 'rot', size: 3.2 });
        if (m.placeholder) { m.dispose?.(); m = null; }
      }
      const body = m ? m.root : new THREE.Mesh(rocketFallbackGeo(r.color, 3.2), vcol(0.5, {}, 'w9rocket'));
      // Rakete liegt mit der Spitze (+Y) in Flugrichtung: Schwerpunkt in die Mitte (Höhe ≈ 1,6 m)
      body.position.y = -1.6;
      pivot.add(body);
      body.traverse((o) => { if (o.isMesh) o.castShadow = false; });
      pivot.name = 'w9:rakete';
      this.view.add(pivot);
      this.own.push(m ?? { dispose: () => body.geometry?.dispose?.() }, pivot);
      if (m) W9_USED.add('spielzeugrakete');
      this.rockets.push({ spec: r, model: m, pivot, a: 0 });
      this.placeRocket(this.rockets[this.rockets.length - 1], 0);
    }
  }

  placeRocket(rk, t) {
    const r = rk.spec;
    const a = t * (r.speed ?? 0.4);
    const dir = Math.sign(r.speed ?? 0.4) || 1;
    rk.a = a;
    const x = r.c[0] + Math.cos(a) * r.r, z = r.c[2] + Math.sin(a) * r.r, y = r.c[1] + Math.sin(t * 0.9) * (r.h ?? 3);
    rk.pivot.position.set(x, y, z);
    // Flugrichtung (Tangente), leicht steigend/sinkend
    _v1.set(-Math.sin(a) * dir, Math.cos(t * 0.9) * (r.h ?? 3) * 0.9 / Math.max(1, Math.abs(r.speed ?? 0.4) * r.r), Math.cos(a) * dir).normalize();
    _q.setFromUnitVectors(_up, _v1);
    rk.pivot.quaternion.copy(_q);
  }

  /** Sternschnuppen (Registry 'sternschnuppe', sonst eigener Goldstern mit Schweif) in einer gemeinsamen Gruppe. */
  buildShooting(spec) {
    this.shooting = [];
    if (!spec?.n) return;
    this.shootGroup = new THREE.Group();
    this.shootGroup.name = 'w9:sternschnuppen';
    this.shootPeriod = spec.period ?? 7.5;
    for (let i = 0; i < spec.n; i++) {
      let m = null;
      if (hasModel('sternschnuppe') && !tooHeavy9('sternschnuppe', { length: 7, size: 1.6 }, 4200)) {
        m = getModel('sternschnuppe', { length: 7, size: 1.6 });
        if (m.placeholder) { m.dispose?.(); m = null; }
      }
      let root;
      if (m) { root = m.root; W9_USED.add('sternschnuppe'); this.own.push(m); } else {
        const b = new Build();
        b.extrude(starShape(0.8, 0.36), 0.3, 0xffd23a, null, 0, 1);
        b.cone(0.5, 6, { v: (px, py) => mix(0xffffff, 0xff9ae8, py / 6 + 0.5) }, { p: [-3.2, 0, 0], r: [0, 0, PI / 2] }, 6);
        root = new THREE.Mesh(b.geometry(), new THREE.MeshBasicMaterial({ vertexColors: true, fog: true }));
        this.own.push(root.geometry, root.material);
      }
      root.traverse((o) => { if (o.isMesh) o.castShadow = false; });
      // Startlagen weit auseinander: die Gruppe bleibt groß (Fern-Ausblendung lod.js lässt sie in Ruhe)
      root.position.set(i ? 120 : -120, 30, i ? -120 : 60);
      this.shootGroup.add(root);
      this.shooting.push({ root, model: m, cycle: -1, from: new THREE.Vector3(), to: new THREE.Vector3(), active: false, u: 0 });
    }
    this.add(this.shootGroup);
  }

  /** Stellung einer Sternschnuppe zur Zeit t: in jedem Zyklus fliegt sie 2,4 s schräg durchs Bild. */
  stepShooting(t) {
    const P = this.shootPeriod;
    const tg = this.view.rig?.target;
    this.shooting.forEach((s, i) => {
      const tt = t + (i * P) / this.shooting.length;
      const cyc = Math.floor(tt / P), u = (tt - cyc * P) / 2.4;
      if (cyc !== s.cycle && tg) {
        s.cycle = cyc;
        const side = ((cyc + i) & 1) ? 1 : -1, h = hash2(cyc * 1.7, i * 3.1);
        s.from.set(tg.x - side * 24, tg.y + 9 + h * 6, tg.z - 10 - h * 8);
        s.to.set(tg.x + side * 22, tg.y + 1 + h * 3, tg.z - 2 + h * 4);
      }
      s.active = u < 1 && !this.far;
      s.u = Math.min(1, u);
      s.root.visible = s.active;
      if (!s.active) return;
      s.root.position.lerpVectors(s.from, s.to, s.u);
      _v2.subVectors(s.to, s.from);
      s.root.rotation.set(0, Math.atan2(-_v2.z, _v2.x), Math.atan2(_v2.y, Math.hypot(_v2.x, _v2.z)), 'YZX');
      s.root.scale.setScalar(s.u < 0.12 ? s.u / 0.12 : s.u > 0.85 ? Math.max(0.001, (1 - s.u) / 0.15) : 1);
    });
  }

  update(dt, t) {
    // Blick über die ganze Insel (Anflug, Ankunft): bewegte Kleinteile ausblenden (spart Zeichenaufrufe)
    const cam = this.view.camera?.position, tg = this.view.rig?.target;
    const far = !!(cam && tg && cam.distanceTo(tg) > 45);
    this.far = far;
    if (this.twMesh) {
      const ts = this.twinkleState(t);
      this.twInfo = ts;
      this.stars.forEach((st, i) => {
        const lit = i % 3 === ts.step;
        const k = lit ? 0.7 + ts.k * 0.9 : 0.5;
        _c.set(st.c).multiplyScalar(k);
        this.twMesh.setColorAt(i, _c);
        setI(this.twMesh, i, st.x, st.y, st.z, st.spin + t * 0.4, st.s * (lit ? 0.9 + ts.k * 0.7 : 0.75));
      });
      this.twMesh.instanceMatrix.needsUpdate = true;
      if (this.twMesh.instanceColor) this.twMesh.instanceColor.needsUpdate = true;
      this.shown = { step: ts.step, k: ts.k };
    }
    // Planeten drehen sich (nur im Bild und nah genug zeichnen)
    const camO = this.view.camera;
    if (camO) { camO.updateMatrixWorld(); _fr.setFromProjectionMatrix(_fm.multiplyMatrices(camO.projectionMatrix, camO.matrixWorldInverse)); }
    for (const p of this.planets) {
      p.angle = t * (p.spec.speed ?? 0.06);
      if (p.model) p.model.update(dt, { speed: p.spec.speed ?? 0.06 });
      else p.root.rotation.y = p.angle;
      if (camO) p.root.visible = !this.far ? _fr.intersectsSphere(_fs.set(_v1.set(...p.spec.pos), p.size)) && camO.position.distanceTo(_v1) < 170 : true;
    }
    for (const rk of this.rockets) {
      this.placeRocket(rk, t);
      rk.pivot.visible = !this.far && (!camO || _fr.intersectsSphere(_fs.set(rk.pivot.position, 3)));
      if (rk.pivot.visible && rk.model) rk.model.update(dt, { flame: 1 });
    }
    if (this.shooting.length) {
      this.stepShooting(t);
      for (const s of this.shooting) if (s.active && s.model) s.model.update(dt, {});
    }
  }

  liveInfo() {
    return {
      twinkle: { ...this.twinkleState(), n: this.stars?.length ?? 0, shown: this.shown },
      planets: { n: this.planets.length, registry: this.planets.filter((p) => p.model).length, kinds: this.planets.map((p) => p.spec.kind), angle: +(this.planets[0]?.angle ?? 0).toFixed(3) },
      rockets: { n: this.rockets.length, registry: this.rockets.filter((r) => r.model).length, a: +(this.rockets[0]?.a ?? 0).toFixed(3) },
      shooting: { n: this.shooting.length, registry: this.shooting.filter((s) => s.model).length, active: this.shooting.filter((s) => s.active).length },
      w9models: [...W9_USED].sort(),
      w9heavy: Object.fromEntries(W9_HEAVY),
    };
  }

  info() { return this.liveInfo(); }

  dispose() {
    for (const p of this.planets ?? []) p.root.parent?.remove(p.root);
    for (const o of this.own) { if (o.isObject3D) o.parent?.remove(o); o.dispose?.(); }
    this.own.length = 0;
  }
}
