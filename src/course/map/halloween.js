// Gelände, Ränder, Streudeko, Requisiten, Stege und lebendige Kulisse der Halloween-Karte „Kürbisinsel“ (Welt 31,
// eigene Gestaltung, Spielzeug-Look wie Welt 1–5, kindgerecht-gruselig: niedlich, lustig, nie erschreckend):
// Abendrot und Mondnacht – lila Himmel, großer Mond mit freundlichem Gesicht, Sterne, türkis-violettes Meer mit
// Nebelschwaden; dunkelgrüne Wiesen auf violetten Erdbändern, Kürbisfelder in Furchen, Kopfsteinpflaster im Gruseldorf,
// moosiger Friedhofsrasen, lila Heidekraut im Hexenmoor, dunkle Burgplatten. Ränder: Trockenmäuerchen ('hwstone'),
// schiefe Lattenzäune ('hwpicket'), schmiedeeiserne Zäune ('hwiron'), Formschnitthecken ('hwhedge'). Stege: dunkle
// Holzbrücken mit Laternen ('hwbridge'). Thema 'map_halloween' meldet sich hier in THEMES an.
//
// Licht im Takt: Kürbisgesichter, Laternen und Kerzen teilen das unbeleuchtete Material view.mats.hwglow (in den
// Karten-Kacheln verschmolzen). Seine Helligkeit flackert im Takt der Kartenmusik (music.beat(): je Zählzeit ein
// heller Aufschein, dann Kerzenflackern); ohne laufende Musik zählt eine Ersatzuhr im Tempo von course_halloween_map
// (fehlt das Thema noch: im Tempo der Rückfall-Musik). hwGlow(view) richtet Material und Taktuhr einmal je Ansicht ein
// (auch in Welt 1 für die geschmückte Röhre) und liefert { info() } für Tests (state().decor.lanterns).
// Lebendig (HwLife, nur Welt 31): Fledermaus-Schwärme kreisen (map.bats, Flügelschlag über die Instanz-Skalierung),
// Nebelschwaden treiben übers Wasser an den Ufern (map.fog).
//
// Registry-Modelle der Halloween-Welt (models/kinds/*_hw.js, parallel gebaut) werden benutzt, sobald es sie gibt –
// je mit Dreiecks-Obergrenze (modelTris aus beach5.js); sonst eigene sparsame Geometrie aus dieser Datei.
// Alle Geometrien in Weltkoordinaten bzw. mit Fußpunkt im Ursprung (Vorderseite +Z, zur Kamera) und Vertexfarben.

import * as THREE from 'three';
import { mix, TAU, cached } from '../models/lib/kit.js';
import { roundedBox, SIDE, colorize, lin, mixc, smooth, Rnd } from '../../three/world/geometry.js';
import { alignedGrid } from '../blocks/kit.js';
import { THEMES } from '../view/themes.js';
import { getModel, hasModel } from '../models/index.js';
import { starField, hillRing } from '../view/backdrop_w2.js';
import { canvasTexture } from '../../three/lib/itemMaterials.js';
import { music } from '../../audio/index.js';
import { buildBridge } from '../blocks/types/bridge.js';
import { LowBuild as Build, place } from './desert.js';
import { modelTris } from './beach5.js';
import { bakeModel } from './bake.js';

export const HW_MUSIC = 'course_halloween_map';
export const HW_STYLES = new Set(['hwgrass', 'field', 'cobble', 'maze', 'graveyard', 'moor', 'castle', 'hwrock', 'forest', 'village', 'hwbeach']);

// ------------------------------------------------------------------ Thema der Kürbisinsel

if (!THEMES.map_halloween) {
  THEMES.map_halloween = {
    ...THEMES.grass,
    label: 'Weltkarte Kürbisinsel',
    // Abendrot am Horizont, darüber Lila bis tiefes Nachtblau
    sky: [[1, 0x150b33], [0.55, 0x2c1858], [0.25, 0x562c86], [0.1, 0x9c4a90], [0.035, 0xee7a6c], [0, 0xffa65a], [-0.08, 0x6a3e7a], [-1, 0x2a1a4a]],
    background: 0x3e2860,
    fog: { color: 0x5c4686, near: 80, far: 300 },
    // Mondlicht als lila Himmelslicht, Abendrot als warmes, tief stehendes Hauptlicht von Westen
    hemi: { sky: 0xa898ff, ground: 0x403050, intensity: 0.95 },
    sun: { color: 0xffc898, intensity: 1.75, dir: [-0.55, 0.85, 0.45] },
    toy: { rim: 1.3 },
    ground: null,
    clouds: false,
    sunDisc: false,
    backdrop: 'halloween',
    grassTop: 0x5f9a6a, grassTop2: 0x568f62, grassRim: 0x9ac88a, grassSide: 0x47785a,
    dirt: 0x5a3e6a, dirtDeep: 0x3a2648, rock: 0x6a5a7e, rockDeep: 0x463a5a,
    stone: 0xd8cce8, stoneDark: 0x8a7a9e,
    wood: 0x8a6a5a, woodDark: 0x4a3428,
    water: 0x4a6ab0, waterDeep: 0x2a3a7a,
    buildBackdrop(sky, bounds, rnd, yBase) {
      starField(sky, rnd, 650, { size: 2, tints: [0xffffff, 0xfff0c8, 0xd8d0ff, 0xffd8f0] });
      if (!modelMoon(sky, [0.16, 0.12, -1], 24)) faceMoon(sky, [0.16, 0.12, -1], 24);
      hillRing(sky, bounds, rnd, yBase, { near: [0x5a3c82, 0x2e1c4a], far: [0x7a5aa6, 0x40306a] });
    },
    updateBackdrop(sky, dt) { sky.hwMoon?.update?.(dt, {}); },
  };
}

/**
 * Mond aus der Registry ('mond_gesicht', Halloween-Modelle: leuchtende Kugel mit Kratern, Lächeln, Bäckchen, Schein) in
 * der Kuppel (folgt der Kamera), Gesicht zur Kamera; false, wenn es das Modell nicht gibt (dann faceMoon).
 */
function modelMoon(sky, dir, r) {
  if (!hasModel('mond_gesicht') || modelTris('mond_gesicht', { size: r, fog: false }) > 6000) return false;
  const m = getModel('mond_gesicht', { size: r, fog: false });
  const d = new THREE.Vector3(...dir).normalize().multiplyScalar(290);
  m.root.position.copy(d);
  m.root.rotation.y = Math.atan2(d.z, -d.x);   // Gesicht (+X) zur Kuppelmitte
  m.root.traverse((o) => { o.renderOrder = -9; });
  m.root.name = 'hw:mond';
  sky.domeGroup.add(m.root);
  sky.track(m);
  sky.hwMoon = m;
  return true;
}

/** Großer Mond mit freundlichem Gesicht (Kuppel, folgt der Kamera) und weichem Schein. */
function faceMoon(sky, dir, r) {
  const d = new THREE.Vector3(...dir).normalize().multiplyScalar(300);
  const tex = sky.track(moonTexture());
  const disc = new THREE.Mesh(sky.track(new THREE.CircleGeometry(r, 40)), sky.track(new THREE.MeshBasicMaterial({ map: tex, fog: false, depthWrite: false, transparent: true })));
  disc.position.copy(d);
  disc.lookAt(0, 0, 0);
  disc.renderOrder = -9;
  disc.name = 'hw:mond';
  const glowC = document.createElement('canvas');
  glowC.width = glowC.height = 128;
  const c = glowC.getContext('2d');
  const g = c.createRadialGradient(64, 64, 8, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,244,200,0.55)'); g.addColorStop(0.45, 'rgba(255,190,220,0.18)'); g.addColorStop(1, 'rgba(180,140,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  const gt = sky.track(new THREE.CanvasTexture(glowC));
  gt.colorSpace = THREE.SRGBColorSpace;
  const glow = new THREE.Sprite(sky.track(new THREE.SpriteMaterial({ map: gt, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
  glow.scale.set(r * 5.5, r * 5.5, 1);
  glow.position.copy(d).multiplyScalar(0.98);
  glow.renderOrder = -8;
  sky.domeGroup.add(disc, glow);
  return disc;
}

/** Mondgesicht: blassgelbe Scheibe mit Kratern, geschlossenen lachenden Augen, roten Bäckchen und Lächeln. */
function moonTexture() {
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(S * 0.42, S * 0.38, S * 0.05, S / 2, S / 2, S * 0.48);
  g.addColorStop(0, '#fffbe6'); g.addColorStop(0.7, '#fff0b8'); g.addColorStop(1, '#f6d88a');
  c.fillStyle = g;
  c.beginPath(); c.arc(S / 2, S / 2, S * 0.47, 0, TAU); c.fill();
  c.fillStyle = 'rgba(214,190,128,0.45)';
  for (const [x, y, rr] of [[0.3, 0.3, 0.06], [0.72, 0.28, 0.05], [0.78, 0.62, 0.07], [0.24, 0.66, 0.045], [0.55, 0.18, 0.035]]) { c.beginPath(); c.arc(x * S, y * S, rr * S, 0, TAU); c.fill(); }
  // Augen: fröhliche Bögen
  c.strokeStyle = '#6a4a3a'; c.lineWidth = S * 0.028; c.lineCap = 'round';
  for (const x of [0.38, 0.62]) { c.beginPath(); c.arc(x * S, 0.46 * S, S * 0.055, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
  // Bäckchen
  c.fillStyle = 'rgba(255,140,150,0.55)';
  for (const x of [0.3, 0.7]) { c.beginPath(); c.ellipse(x * S, 0.56 * S, S * 0.055, S * 0.035, 0, 0, TAU); c.fill(); }
  // Lächeln
  c.beginPath(); c.arc(0.5 * S, 0.55 * S, S * 0.1, Math.PI * 0.15, Math.PI * 0.85); c.stroke();
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ------------------------------------------------------------------ Farben und Helfer

const SOIL = [0x5a3e6a, 0x4a3260, 0x6a4a78, 0x3e2a52, 0x56406a];
const ROCK = [0x6a5a7e, 0x5a4a6e, 0x7a6a8e, 0x4e4064, 0x665878];
const EARTH = [0x6a4630, 0x5a3a28, 0x7a5236, 0x4e3222];
const STONE = [0x6a6080, 0x5a5070, 0x786e8e, 0x524866];
const ORANGE = 0xff8a1a, ORANGE_D = 0xd8580e, ORANGE_L = 0xffb04a;
const GLOW = 0xffb83a, GLOW_CORE = 0xfff0a0;
const hash2 = (x, z) => { const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return h - Math.floor(h); };
const tone = (a, c, k, out = [0, 0, 0]) => mixc(lin(a), lin(c), k, out);
const checker = (ax, az, cell = 2) => (Math.floor((ax + cell * 0.505) / cell) + Math.floor((az + cell * 0.505) / cell)) & 1;
function flat(g, material) { if (g) { g.userData.noShadow = true; if (material) g.userData.material = material; } return g; }
/** Geometrie als Licht (Material hwglow, ohne Schattenwurf) markieren. */
export function glowing(g) { if (g) { g.userData.material = 'hwglow'; g.userData.noShadow = true; } return g; }

// ------------------------------------------------------------------ Geländestile

const PALETTES = {
  hwgrass: {
    bands: SOIL, side: 0x3e8a5a, rim: 0xa2e092,
    tile: (rnd) => (i, j, ax, az) => {
      const o = tone(checker(ax, az) ? 0x56be76 : 0x4fb46e, 0x62c680, rnd.frac() * 0.3);
      if (hash2(Math.floor(ax / 2) + 3, Math.floor(az / 2) - 5) < 0.06) mixc(o, lin(0x3e9a62), 0.3, o);   // dunkleres Moos
      return o;
    },
  },
  forest: {
    bands: SOIL, side: 0x3a7a52, rim: 0x86c88a, layer: 1.1, jitter: 0.2, cellOff: 4,
    tile: (rnd) => (i, j, ax, az) => {
      const o = tone(0x4aa064, 0x40925a, rnd.frac());
      if (hash2(Math.floor(ax / 4), Math.floor(az / 4)) > 0.72) mixc(o, lin(0xd0702a), 0.3, o);
      return o;
    },
  },
  village: {
    bands: STONE, side: 0x3e8a5a, rim: 0xa2e092, cellOff: 2,
    tile: (rnd) => (i, j, ax, az) => tone(0x58b46e, 0x64c278, rnd.frac() * 0.6 + (checker(ax, az) ? 0.25 : 0)),
  },
  maze: {
    bands: SOIL, side: 0x3a8456, rim: 0x96d48e,
    tile: (rnd) => (i, j, ax, az) => tone(checker(ax, az) ? 0x5ab872 : 0x52ac68, 0x68c47c, rnd.frac() * 0.3),
  },
  field: {
    bands: EARTH, side: 0x6a4a34, rim: 0x9a7a5a, capH: 0.3, cellOff: 1,
    tile: (rnd) => (i, j, ax, az) => {
      const row = Math.floor(az + 100) % 2 === 0;
      const o = tone(row ? 0x6e4a30 : 0x5a3a26, 0x7a5638, rnd.frac() * 0.25);
      if (!row && hash2(Math.floor(ax), Math.floor(az)) > 0.55) mixc(o, lin(0x4e7a3a), 0.6, o);   // Kürbisranken
      return o;
    },
  },
  cobble: {
    bands: STONE, side: 0x8a7a8a, rim: 0xd8c8c8, cell: 1, cellOff: 2,
    tile: (rnd) => (i, j, ax, az) => {
      const k = hash2(Math.floor(ax * 1.01) + 11, Math.floor(az * 1.01) - 7);
      const o = tone([0xc4b0a2, 0xb49e92, 0xd2c0b0, 0xa8948c][Math.floor(k * 4)], 0xe0d0c0, rnd.frac() * 0.25);
      if (k > 0.96) mixc(o, lin(0x6aa86a), 0.4, o);
      return o;
    },
  },
  graveyard: {
    bands: ROCK, side: 0x46806a, rim: 0x96c8a4,
    tile: (rnd) => (i, j, ax, az) => {
      const o = tone(checker(ax, az) ? 0x5aa478 : 0x529a6e, 0x6ab486, rnd.frac() * 0.3);
      if (hash2(Math.floor(ax / 2) - 9, Math.floor(az / 2) + 1) > 0.94) mixc(o, lin(0xa89ab8), 0.3, o);
      return o;
    },
  },
  moor: {
    bands: SOIL, side: 0x7a52a0, rim: 0xc49ae0,
    tile: (rnd) => (i, j, ax, az) => {
      const o = tone(checker(ax, az) ? 0x6aae7e : 0x64a678, 0x78b88a, rnd.frac() * 0.3);
      if (hash2(Math.floor(ax / 2) + 2, Math.floor(az / 2) + 8) > 0.86) mixc(o, lin(0x9a7ac0), 0.18, o);   // Hauch Heidekraut
      return o;
    },
  },
  castle: {
    bands: ROCK, side: 0x6a6286, rim: 0xb0a8c8,
    tile: (rnd) => (i, j, ax, az) => tone(checker(ax, az) ? 0x9a90b4 : 0x8c82a8, 0xa89ec2, rnd.frac() * 0.3),
  },
  hwrock: {
    bands: ROCK, side: 0x7a6a8e, rim: 0xb0a0c4, layer: 1.25, jitter: 0.28, cellOff: 4,
    tile: (rnd) => (i, j, ax, az) => (hash2(Math.floor(ax / 4), Math.floor(az / 4)) > 0.6 ? tone(0x4e7a5a, 0x5a8a64, rnd.frac()) : tone(0x8a7a9e, 0x7a6a8e, rnd.frac() * 0.8)),
  },
  hwbeach: {
    bands: [0x9a8898, 0x8a7888, 0xa898a8], side: 0xb8a8b4, rim: 0xd8c8d0, capH: 0.16, layer: 0.5, jitter: 0.05, cellOff: 3,
    tile: (rnd) => () => tone(0xc6b6be, 0xb8a8b2, rnd.frac()),
  },
};

/**
 * Gelände-Block der Kürbisinsel (Box x0..x1 × z0..z1 von base bis top). style (siehe PALETTES): 'hwgrass' (Standard),
 * 'forest', 'village', 'maze', 'field' (Kürbisfeld in Furchen), 'cobble' (Dorfpflaster), 'graveyard', 'moor'
 * (Hexenmoor mit Heidekraut), 'castle' (Burgplatten), 'hwrock' (Klippe), 'hwbeach'. Liefert Teil-Geometrien (flache
 * Deckschichten mit userData.noShadow).
 */
export function hwGround(b, base, theme, rnd) {
  const [x0, z0, x1, z1] = b.rect;
  const top = b.top;
  const P = PALETTES[b.style] ?? PALETTES.hwgrass;
  const parts = [];
  const capH = P.capH ?? 0.32;
  strata(parts, x0, base, z0, x1, top - capH, z1, P.bands, rnd, P.layer ?? 0.9, P.jitter ?? 0.12);
  const lip = 0.08;
  const r = Math.min(0.16, capH * 0.45);
  const cap = roundedBox(x1 - x0 + lip * 2, capH, z1 - z0 + lip * 2, r, SIDE.ALL & ~SIDE.NY, SIDE.NY, 1);
  const side = lin(P.side), rim = lin(P.rim);
  colorize(cap, (p, n, o) => mixc(side, rim, smooth(0.15, 0.85, n.y), o));
  cap.translate((x0 + x1) / 2, top - capH / 2, (z0 + z1) / 2);
  parts.push(cap);
  const ins = r + lip * 0.5;
  const gx0 = x0 - lip + ins, gx1 = x1 + lip - ins, gz0 = z0 - lip + ins, gz1 = z1 + lip - ins;
  if (gx1 > gx0 && gz1 > gz0) parts.push(flat(alignedGrid(gx0, gz0, gx1, gz1, top + 0.004, b.walk ? (P.cell ?? 2) : (P.cellOff ?? 4), P.tile(rnd, b))));
  if (b.style === 'cobble' && b.walk) parts.push(flat(cobbleJoints(x0, z0, x1, z1, top + 0.008)));
  return parts;
}

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
      const k = Math.abs(nn.x) > 0.5 ? 0.88 : 1;
      o[0] = c[0] * k; o[1] = c[1] * k; o[2] = c[2] * k;
    });
    g.translate((x0 + x1) / 2, y0 + lh * (i + 0.5), (z0 + z1) / 2);
    parts.push(g);
  }
}

/** Dunkle Fugen im Kopfsteinpflaster (schmale Streifen alle 1 m, versetzt). */
function cobbleJoints(x0, z0, x1, z1, y) {
  const b = new Build();
  for (let z = Math.ceil(z0 + 0.5); z < z1 - 0.3; z += 1) b.box(x1 - x0 - 0.6, 0.01, 0.06, 0x4a4260, { p: [(x0 + x1) / 2, y, z] }, 0);
  return b.geometry();
}

// ------------------------------------------------------------------ Ränder

/** Niedriges Trockenmäuerchen aus grau-violetten Steinen entlang +X, ab und zu ein Mini-Kürbis obenauf. */
function stoneWallGeo(len, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  b.box(len, 0.42, 0.62, { v: (x, y, z, nx, ny) => mix(0x5a5070, 0x8a80a2, ny * 0.5 + 0.5) }, { p: [0, 0.21, 0] }, 0);
  const n = Math.max(1, Math.round(len / 0.75));
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i + 0.5) * (len / n);
    b.sphere(rnd.real(0.3, 0.4), STONE[i % STONE.length], { p: [x + rnd.real(-0.1, 0.1), 0.5, rnd.real(-0.08, 0.08)], s: [1.1, 0.62, 0.95] }, 6, 4);
    if (rnd.frac() < 0.09) {
      b.sphere(0.16, ORANGE, { p: [x, 0.78, 0], s: [1.2, 0.85, 1.2] }, 7, 5);
      b.cyl(0.02, 0.03, 0.1, 0x4a6a2a, { p: [x, 0.92, 0] }, 4);
    }
  }
  return b.geometry();
}

/** Schiefer Lattenzaun (dunkles Holz, spitze Latten, zwei Querbretter) entlang +X. */
function picketFenceGeo(len, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const n = Math.max(2, Math.round(len / 0.42));
  for (let i = 0; i <= n; i++) {
    const x = -len / 2 + (i / n) * len, h = 0.95 + rnd.real(-0.12, 0.1), t = rnd.real(-0.12, 0.12);
    b.box(0.16, h, 0.06, (px, py) => (py > h * 0.35 ? 0x7a6656 : 0x5e4a3e), { p: [x, h / 2, 0], r: [0, 0, t] }, 0, 1);
    b.cone(0.11, 0.18, 0x7a6656, { p: [x - Math.sin(t) * h, h + 0.08, 0], r: [0, Math.PI / 4, -t], s: [1, 1, 0.45] }, 4);
  }
  for (const y of [0.28, 0.68]) b.box(len, 0.08, 0.05, 0x4e3c30, { p: [0, y, -0.05], r: [0, 0, rnd.real(-0.03, 0.03)] }, 0, 1);
  return b.geometry();
}

/** Schmiedeeiserner Zaun (Friedhof): schwarze Stäbe mit Speerspitzen, Querstangen, Kugeln auf den Pfosten. */
function ironFenceGeo(len, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const n = Math.max(2, Math.round(len / 0.3));
  for (let i = 0; i <= n; i++) {
    const x = -len / 2 + (i / n) * len, post = i % 6 === 0, h = post ? 1.3 : 1.05;
    b.box(post ? 0.1 : 0.045, h, post ? 0.1 : 0.045, 0x2a2436, { p: [x, h / 2, 0], r: [0, 0, rnd.real(-0.03, 0.03)] }, 0, 1);
    if (post) b.sphere(0.09, 0xff9a3a, { p: [x, h + 0.06, 0] }, 6, 4);
    else b.cone(0.05, 0.14, 0x2a2436, { p: [x, h + 0.06, 0] }, 4);
  }
  for (const y of [0.2, 0.86]) b.box(len, 0.05, 0.05, 0x2a2436, { p: [0, y, 0] }, 0, 1);
  return b.geometry();
}

/** Formschnitthecke (Labyrinth): dunkelgrüner Quader mit runden Kanten, Blattbüschel. */
export function hwHedgeGeo(len, h = 1.2, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  b.box(len, h, 0.8, { v: (x, y, z, nx, ny) => mix(0x2e5a3e, 0x4e8a5a, (y + h / 2) / h * 0.7 + ny * 0.2) }, { p: [0, h / 2, 0] }, 0.18, 1);
  const n = Math.max(1, Math.round(len / 1.1));
  for (let i = 0; i < n; i++) b.sphere(rnd.real(0.26, 0.34), 0x4e8a5a, { p: [-len / 2 + (i + 0.5) * (len / n), h - 0.04, rnd.real(-0.15, 0.15)], s: [1.3, 0.6, 1] }, 6, 4);
  return b.geometry();
}

/** Randdeko der Kürbisinsel (MapBuilder.borderDeco): Art → Geometrie entlang +X oder null. */
export function hwEdgeGeo(kind, len, seed) {
  switch (kind) {
    case 'hwstone': return stoneWallGeo(len + 0.1, seed);
    case 'hwpicket': return picketFenceGeo(len, seed);
    case 'hwiron': return ironFenceGeo(len, seed);
    case 'hwhedge': return hwHedgeGeo(len + 0.1, 1.1, seed);
    default: return null;
  }
}

// ------------------------------------------------------------------ Kürbisse

/** Kürbiskörper mit Rippen (Kugel, gedrückt, Furchen dunkler), Stiel und Blatt; Fußpunkt im Ursprung. */
export function pumpkinGeo(s = 1, seed = 1, lo = false) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const R = 0.5 * s, lobes = lo ? 5 : 7, squash = 0.74 + rnd.real(-0.06, 0.06);
  const g = new THREE.SphereGeometry(R, lo ? 10 : 16, lo ? 6 : 9);
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    const k = 1 + 0.09 * Math.cos(Math.atan2(z, x) * lobes);
    P.setXYZ(i, x * k, y * squash, z * k);
  }
  g.computeVertexNormals();
  const tint = rnd.frac();
  const light = tint < 0.15 ? 0xffc04a : ORANGE_L, base = tint < 0.15 ? 0xf0a024 : ORANGE;
  b.add(g, { v: (x, y, z) => {
    const rib = 0.5 + 0.5 * Math.cos(Math.atan2(z, x) * lobes);
    return mix(mix(ORANGE_D, base, 0.25 + 0.75 * rib), light, Math.max(0, y / R) * 0.45);
  } }, { p: [0, R * squash, 0] });
  const sh = R * squash * 2;
  b.cyl(0.05 * s, 0.08 * s, 0.24 * s, 0x5a6a2a, { p: [0.02 * s, sh + 0.08 * s, 0], r: [0, 0, rnd.real(-0.4, 0.4)] }, lo ? 4 : 6);
  if (!lo) b.sphere(0.13 * s, 0x5a9a3a, { p: [0.14 * s, sh - 0.02 * s, 0.05 * s], s: [1.4, 0.3, 0.9], r: [0, rnd.real(0, 3), 0.3] }, 6, 3);
  return b.geometry();
}

/** Leuchtendes Kürbisgesicht (Dreieck-Augen, Nase, Zickzack-Mund) vor der Vorderseite (+Z) eines Kürbis der Größe s. */
export function pumpkinFaceGeo(s = 1, variant = 0) {
  return cached(`hw:pface:${s.toFixed(2)}:${variant}`, () => {
    const b = new Build();
    const R = 0.5 * s, cy = R * 0.76, zf = R * 1.02;
    const tri = (w, h, up = true) => { const sh = new THREE.Shape(); if (up) { sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(0, h); } else { sh.moveTo(-w / 2, h); sh.lineTo(w / 2, h); sh.lineTo(0, 0); } sh.closePath(); return sh; };
    const eye = variant === 1 ? 0.15 : 0.18;
    for (const sx of [-1, 1]) {
      if (variant === 2) b.sphere(R * 0.11, GLOW, { p: [sx * R * 0.34, cy + R * 0.2, zf - 0.02 * s], s: [1, 1.2, 0.3] }, 7, 5);
      else b.extrude(tri(R * eye * 1.6, R * eye * 1.4), 0.03 * s, GLOW, { p: [sx * R * 0.34, cy + R * 0.12, zf - 0.04 * s], r: [0, sx * 0.3, 0] }, 0, 1);
    }
    b.extrude(tri(R * 0.14, R * 0.12), 0.03 * s, GLOW_CORE, { p: [0, cy - R * 0.02, zf], r: [0, 0, 0] }, 0, 1);
    // Mund: Zickzack-Grinsen aus kleinen Dreiecken auf einem Streifen
    const mw = R * (variant === 1 ? 0.62 : 0.78);
    const mouth = new THREE.Shape();
    const n = 5;
    mouth.moveTo(-mw / 2, 0);
    for (let i = 0; i <= n; i++) mouth.lineTo(-mw / 2 + (i / n) * mw, i % 2 ? -R * 0.12 : -R * 0.05);
    mouth.lineTo(mw / 2, -R * 0.1);
    for (let i = n; i >= 0; i--) mouth.lineTo(-mw / 2 + (i / n) * mw, -R * 0.22 + (i % 2 ? 0 : -R * 0.05) + Math.sin((i / n) * Math.PI) * -R * 0.06);
    mouth.closePath();
    b.extrude(mouth, 0.03 * s, GLOW, { p: [0, cy - R * 0.12, zf - 0.05 * s] }, 0, 1);
    return b.geometry();
  });
}

// ------------------------------------------------------------------ Requisiten (Kartenqualität)

/** Laternenmast: dunkler Mast mit Bogen, hängende Laterne (Rahmen); Licht separat (lanternPostGlowGeo). */
export function lanternPostGeo(h = 2.6) {
  const b = new Build();
  b.cyl(0.2, 0.26, 0.28, 0x3a3048, { p: [0, 0.14, 0] }, 6);
  b.cyl(0.075, 0.09, h, 0x3a3048, { p: [0, h / 2, 0] }, 6);
  b.sphere(0.1, 0xffc21a, { p: [0, h + 0.02, 0] }, 6, 4);
  b.tube([[0, h - 0.15, 0], [0.22, h + 0.1, 0], [0.5, h + 0.08, 0]], 0.05, 0x3a3048, null, 6, 4);
  b.box(0.44, 0.07, 0.44, 0x2e2640, { p: [0.5, h - 0.16, 0] }, 0);
  b.cone(0.34, 0.26, 0x2e2640, { p: [0.5, h + 0.04, 0], r: [0, Math.PI / 4, 0] }, 4);
  for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) b.box(0.05, 0.46, 0.05, 0x2e2640, { p: [0.5 + x, h - 0.42, z] }, 0);
  b.box(0.42, 0.06, 0.42, 0x2e2640, { p: [0.5, h - 0.66, 0] }, 0);
  return b.geometry();
}
export function lanternPostGlowGeo(h = 2.6) {
  const b = new Build();
  b.box(0.32, 0.42, 0.32, GLOW, { p: [0.5, h - 0.42, 0] }, 0);
  b.sphere(0.1, GLOW_CORE, { p: [0.5, h - 0.44, 0.13] }, 5, 3);
  return b.geometry();
}

/** Kahler Spukbaum: dunkler, gedrehter Stamm mit Ringelästen, ein paar orange Blätter. */
export function spookTreeGeo(h = 4.2, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const lean = rnd.real(-0.4, 0.4);
  const trunk = [[0, 0, 0], [lean * 0.3, h * 0.35, 0.1], [lean, h * 0.7, -0.1], [lean * 0.6 + rnd.real(-0.3, 0.3), h, 0]];
  b.tube(trunk, 0.22 * (h / 4.2), 0x3e2e44, null, 6, 5);
  b.cone(0.5 * (h / 4.2), 0.6, 0x3e2e44, { p: [0, 0.25, 0] }, 6);
  const leaf = [0xe8702a, 0xffa23a, 0xc8401a];
  for (let i = 0; i < 5; i++) {
    const y = h * rnd.real(0.45, 0.92), a = rnd.real(0, TAU), L = h * rnd.real(0.22, 0.38);
    const bx = lean * (y / h);
    const p0 = [bx, y, 0], p1 = [bx + Math.cos(a) * L * 0.6, y + L * 0.3, Math.sin(a) * L * 0.6], p2 = [bx + Math.cos(a + 0.7) * L, y + L * 0.5, Math.sin(a + 0.7) * L];
    b.tube([p0, p1, p2], 0.065, 0x4a3a52, null, 4, 3);
    // Ringelspitze
    b.torus(0.12, 0.03, 0x4a3a52, { p: [p2[0], p2[1] + 0.1, p2[2]], r: [Math.PI / 2, 0, a] }, 3, 6, Math.PI * 1.5);
    if (rnd.frac() < 0.6) b.sphere(0.13, leaf[i % 3], { p: [p1[0], p1[1] + 0.05, p1[2]], s: [1.2, 0.4, 0.8] }, 5, 3);
  }
  return b.geometry();
}

/** Niedlicher Grabstein mit Lachgesicht (Kreuz-, Rund- oder Spitzform), Moos am Fuß. Vorderseite +Z. */
export function graveGeo(seed = 1, s = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const kind = seed % 3;
  const tilt = rnd.real(-0.16, 0.16);
  const stone = { v: (x, y) => mix(0x6e6888, 0xa49ec0, Math.min(1, y / 1.1)) };
  const sh = new THREE.Shape();
  const w = 0.42 * s, hh = 0.75 * s;
  if (kind === 0) { sh.moveTo(-w, 0); sh.lineTo(-w, hh); sh.absarc(0, hh, w, Math.PI, 0, true); sh.lineTo(w, 0); sh.closePath(); }
  else if (kind === 1) { sh.moveTo(-w, 0); sh.lineTo(-w, hh); sh.lineTo(0, hh + w * 0.9); sh.lineTo(w, hh); sh.lineTo(w, 0); sh.closePath(); }
  else { sh.moveTo(-w * 0.35, 0); sh.lineTo(-w * 0.35, hh * 0.85); sh.lineTo(-w, hh * 0.85); sh.lineTo(-w, hh * 1.2); sh.lineTo(-w * 0.35, hh * 1.2); sh.lineTo(-w * 0.35, hh * 1.55); sh.lineTo(w * 0.35, hh * 1.55); sh.lineTo(w * 0.35, hh * 1.2); sh.lineTo(w, hh * 1.2); sh.lineTo(w, hh * 0.85); sh.lineTo(w * 0.35, hh * 0.85); sh.lineTo(w * 0.35, 0); sh.closePath(); }
  b.extrude(sh, 0.2 * s, stone, { p: [0, 0, 0], r: [rnd.real(-0.1, 0.06), 0, tilt] }, 0.03, 5, 1);
  // Gesicht: Punktaugen und Lächeln
  const fy = (kind === 2 ? hh * 1.02 : hh * 0.78), fz = 0.13 * s;
  const ox = Math.sin(-tilt) * fy;
  for (const sx of [-1, 1]) b.sphere(0.045 * s, 0x2a2238, { p: [ox + sx * 0.12 * s, fy + 0.04 * s, fz], s: [1, 1.3, 0.5] }, 5, 3);
  b.torus(0.08 * s, 0.022 * s, 0x2a2238, { p: [ox, fy - 0.04 * s, fz], r: [0, 0, Math.PI + tilt] }, 3, 7, Math.PI);
  b.sphere(0.32 * s, 0x4e7a52, { p: [0, 0.02, 0.12 * s], s: [1.5, 0.3, 1.0] }, 6, 3);
  return b.geometry();
}

/** Strohballen (gerundeter Quader mit zwei Schnüren). */
function hayGeo(s = 1) {
  const b = new Build();
  b.box(1.1 * s, 0.6 * s, 0.7 * s, { v: (x, y, z, nx, ny) => mix(0xc8962a, 0xf0c85a, ny * 0.5 + 0.5) }, { p: [0, 0.3 * s, 0] }, 0.12 * s, 1);
  for (const x of [-0.3, 0.3]) b.box(0.05 * s, 0.62 * s, 0.72 * s, 0x8a5a2a, { p: [x * s, 0.3 * s, 0] }, 0);
  return b.geometry();
}

/** Lila Fliegenpilze mit weißen Tupfen (Gruppe aus drei). */
export function toadstoolGeo(s = 1, seed = 1) {
  const b = new Build();
  for (let i = 0; i < 3; i++) {
    const k = [1, 0.7, 0.5][i] * s, x = [0, 0.32, -0.28][i] * s, z = [0, 0.12, 0.2][i] * s;
    b.cyl(0.07 * k, 0.09 * k, 0.4 * k, 0xf0e8f0, { p: [x, 0.2 * k, z] }, 5);
    b.dome(0.26 * k, (px, py, pz) => (hash2(Math.round(px * 40) + seed, Math.round(pz * 40)) > 0.78 ? 0xffffff : 0xa04ad8), { p: [x, 0.38 * k, z], s: [1, 0.7, 1] }, Math.PI / 2, 8, 3);
  }
  return b.geometry();
}

/** Lutscher und Bonbons (Süßigkeiten-Haufen). */
function candyGeo(s = 1, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const cols = [0xff5a9a, 0x6ad8ff, 0xffd23a, 0x8aff6a, 0xb47aff];
  b.cyl(0.03 * s, 0.03 * s, 0.9 * s, 0xffffff, { p: [0, 0.45 * s, 0] }, 4);
  b.cyl(0.28 * s, 0.28 * s, 0.08 * s, (px, py, pz) => (Math.floor((Math.atan2(pz, px) / TAU + 0.5) * 8 + Math.hypot(px, pz) * 30) % 2 ? 0xff5a9a : 0xffffff), { p: [0, 1.0 * s, 0], r: [Math.PI / 2, 0, 0] }, 12);
  for (let i = 0; i < 4; i++) {
    const c = cols[(i + seed) % cols.length], x = rnd.real(-0.4, 0.4) * s, z = rnd.real(0.05, 0.4) * s;
    b.sphere(0.09 * s, c, { p: [x, 0.08 * s, z], s: [1.3, 1, 1] }, 6, 4);
    for (const sx of [-1, 1]) b.cone(0.07 * s, 0.1 * s, c, { p: [x + sx * 0.15 * s, 0.08 * s, z], r: [0, 0, sx * Math.PI / 2] }, 4);
  }
  return b.geometry();
}

/** Spinnennetz (flach, zwischen zwei Pfosten bzw. an einer Ecke), Vorderseite +Z. */
export function cobwebGeo(r = 0.8) {
  return cached(`hw:web:${r}`, () => {
    const b = new Build();
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI - Math.PI;
      b.box(r, 0.02, 0.02, 0xf2eef8, { p: [Math.cos(a) * r / 2, Math.sin(a) * r / 2, 0], r: [0, 0, a] }, 0);
    }
    for (const k of [0.35, 0.65, 0.95]) {
      for (let i = 0; i < n - 1; i++) {
        const a0 = (i / n) * Math.PI - Math.PI, a1 = ((i + 1) / n) * Math.PI - Math.PI;
        const p0 = [Math.cos(a0) * r * k, Math.sin(a0) * r * k], p1 = [Math.cos(a1) * r * k, Math.sin(a1) * r * k];
        const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
        b.box(L, 0.016, 0.016, 0xf2eef8, { p: [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2 + 0.02, 0], r: [0, 0, Math.atan2(p1[1] - p0[1], p1[0] - p0[0])] }, 0);
      }
    }
    return b.geometry();
  });
}

/** Eule auf einem Baumstumpf (große Augen, Federohren). */
function owlGeo(s = 1) {
  const b = new Build();
  b.cyl(0.32 * s, 0.4 * s, 0.7 * s, { v: (x, y) => mix(0x4a3428, 0x6a4a36, y + 0.5) }, { p: [0, 0.35 * s, 0] }, 8);
  b.cyl(0.3 * s, 0.3 * s, 0.02 * s, 0xc8a070, { p: [0, 0.71 * s, 0] }, 8);
  b.sphere(0.26 * s, { v: (x, y, z) => mix(0x6a4e3a, 0xb08a64, z > 0.1 ? 0.8 : 0.2) }, { p: [0, 1.0 * s, 0], s: [1, 1.15, 0.9] }, 9, 7);
  for (const sx of [-1, 1]) {
    b.sphere(0.085 * s, 0xfff4d0, { p: [sx * 0.1 * s, 1.08 * s, 0.19 * s], s: [1, 1, 0.5] }, 7, 5);
    b.sphere(0.045 * s, 0x2a1a10, { p: [sx * 0.1 * s, 1.08 * s, 0.235 * s], s: [1, 1, 0.5] }, 5, 3);
    b.cone(0.06 * s, 0.14 * s, 0x5a3e2e, { p: [sx * 0.15 * s, 1.27 * s, 0], r: [0, 0, -sx * 0.4] }, 4);
  }
  b.cone(0.04 * s, 0.08 * s, 0xffb43a, { p: [0, 1.0 * s, 0.24 * s], r: [Math.PI / 2 + 0.3, 0, 0] }, 4);
  return b.geometry();
}

/** Krummes Hexenhaus/Dorfhaus: schiefe Wände, steiles Dach mit Kamin, Tür, Fensterrahmen (Licht separat). */
export function spookHouseGeo(w = 3.4, d = 3, seed = 1, wall = 0x8a6a9a, roof = 0x3e2e5a) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const H = 2.4 + rnd.real(-0.2, 0.4), lean = rnd.real(-0.06, 0.06);
  const boards = (px, py, pz, nx, ny) => (Math.abs(ny) > 0.5 ? mix(wall, 0x000000, 0.4) : Math.floor((px + pz) * 2.4 + 50) % 2 ? wall : mix(wall, 0x000000, 0.12));
  b.box(w, H, d, boards, { p: [0, H / 2, 0], r: [0, 0, lean] }, 0.06, 1);
  b.box(w + 0.2, 0.24, d + 0.2, 0x4a4060, { p: [0, 0.12, 0] }, 0.04, 1);
  const rs = new THREE.Shape(); rs.moveTo(-w / 2 - 0.35, 0); rs.lineTo(rnd.real(-0.2, 0.2), w * 0.62 + 0.4); rs.lineTo(w / 2 + 0.35, 0); rs.closePath();
  b.extrude(rs, d + 0.5, { v: (px, py) => mix(mix(roof, 0x000000, 0.25), roof, py / 2.2) }, { p: [Math.sin(-lean) * H, H - 0.05, 0], r: [0, 0, lean * 1.5] }, 0.05, 1);
  b.box(0.42, 1.0, 0.42, 0x5a4a5a, { p: [w * 0.26, H + w * 0.45, -d * 0.2] }, 0.03, 1);
  b.box(0.52, 0.12, 0.52, 0x3a3044, { p: [w * 0.26, H + w * 0.45 + 0.5, -d * 0.2] }, 0, 1);
  // Tür mit Rundbogen
  const ds = new THREE.Shape(); ds.moveTo(-0.38, 0); ds.lineTo(-0.38, 0.9); ds.absarc(0, 0.9, 0.38, Math.PI, 0, true); ds.lineTo(0.38, 0); ds.closePath();
  b.extrude(ds, 0.08, 0x4a2a1e, { p: [-w * 0.18, 0.24, d / 2 + 0.02] }, 0, 6);
  b.sphere(0.05, 0xffc21a, { p: [-w * 0.18 + 0.2, 0.75, d / 2 + 0.08] }, 5, 3);
  // Fensterrahmen (unten in der Wand, oben im Giebel – dessen Vorderseite liegt 0,25 m weiter vorn)
  for (const [fx, fy, fz] of houseWindows(w, d, H)) b.box(0.7, 0.7, 0.06, 0x3a2a2a, { p: [fx, fy, fz] }, 0, 1);
  return b.geometry();
}
/** Leuchtende Fenster des Hauses (gleiches Maß wie spookHouseGeo). */
export function spookHouseGlowGeo(w = 3.4, d = 3, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const H = 2.4 + rnd.real(-0.2, 0.4);
  for (const [fx, fy, fz] of houseWindows(w, d, H)) {
    b.box(0.26, 0.26, 0.03, 0xffc85a, { p: [fx - 0.15, fy + 0.15, fz + 0.04] }, 0);
    b.box(0.26, 0.26, 0.03, 0xffb03a, { p: [fx + 0.15, fy + 0.15, fz + 0.04] }, 0);
    b.box(0.26, 0.26, 0.03, 0xffb03a, { p: [fx - 0.15, fy - 0.15, fz + 0.04] }, 0);
    b.box(0.26, 0.26, 0.03, 0xffd87a, { p: [fx + 0.15, fy - 0.15, fz + 0.04] }, 0);
  }
  return b.geometry();
}
function houseWindows(w, d, H) { return [[w * 0.24, 1.45, d / 2 + 0.02], [0, H + 0.62, d / 2 + 0.27]]; }

/** Felsbrocken (grau-violett, moosig). */
function hwRockGeo(r = 1, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  for (let i = 0; i < 2; i++) b.sphere(r * [1, 0.6][i], { v: (x, y, z, nx, ny) => (ny > 0.55 ? 0x5a8a64 : mix(0x5a4a6e, 0x8a7a9e, ny * 0.5 + 0.5)) }, { p: [i * r * 0.7, r * [0.55, 0.35][i], i * r * 0.2], s: [1.2, 0.8, 1], r: [0, rnd.real(0, 3), 0] }, 7, 5);
  return b.geometry();
}

/** Ruderboot mit Laterne am Bug (auf dem Wasser). */
function rowboatGeo() {
  const b = new Build();
  b.lathe([[0, -0.3], [0.45, -0.28], [0.62, -0.05], [0.66, 0.14], [0.6, 0.18]], { v: (x, y) => mix(0x4a3428, 0x8a6a5a, y + 0.4) }, { p: [0, 0.3, 0], s: [2.2, 1, 1] }, 10);
  b.box(0.12, 0.06, 1.0, 0x6a4e3e, { p: [0.2, 0.36, 0] }, 0);
  b.cyl(0.03, 0.03, 0.9, 0x2e283c, { p: [1.15, 0.65, 0], r: [0, 0, -0.3] }, 4);
  b.box(0.2, 0.26, 0.2, 0x2a2436, { p: [1.32, 1.02, 0] }, 0);
  return b.geometry();
}
function rowboatGlowGeo() {
  const b = new Build();
  b.box(0.14, 0.18, 0.14, GLOW, { p: [1.32, 1.0, 0] }, 0);
  return b.geometry();
}

/** Laubhaufen (orange, rot, gelb – flach, zum Draufschauen). */
function leavesGeo(s = 1, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  const cols = [0xe8702a, 0xffa23a, 0xc8401a, 0xf0c040, 0xb8501a];
  b.sphere(0.5 * s, { v: (x, y, z, nx, ny) => mix(0xb8501a, 0xe8802a, ny * 0.5 + 0.5) }, { p: [0, 0.05, 0], s: [1.2, 0.32, 1] }, 8, 4);
  for (let i = 0; i < 9; i++) {
    const a = rnd.real(0, TAU), r = rnd.real(0.25, 1.0) * s;
    b.box(0.2, 0.02, 0.12, cols[i % cols.length], { p: [Math.cos(a) * r, 0.03 + (r < 0.5 * s ? 0.12 : 0), Math.sin(a) * r], r: [rnd.real(-0.3, 0.3), rnd.real(0, TAU), 0] }, 0);
  }
  return b.geometry();
}
/** Heidekraut-Büschel (lila Rispen auf grünem Fuß), auch auf begehbarem Moor (ohne Kollision). */
function heatherClumpGeo(s = 1, seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  b.sphere(0.32 * s, 0x5a9a5e, { p: [0, 0.12 * s, 0], s: [1.4, 0.5, 1.2] }, 7, 4);
  for (let i = 0; i < 5; i++) b.sphere(rnd.real(0.16, 0.24) * s, i % 2 ? 0xb47ae0 : 0x9a5ac8, { p: [rnd.real(-0.3, 0.3) * s, rnd.real(0.24, 0.36) * s, rnd.real(-0.25, 0.25) * s], s: [0.9, 1.3, 0.9] }, 6, 4);
  return b.geometry();
}
/** Süßigkeiten-Wagen: Holzkarren mit gestreiftem Dach, Bonbongläsern und Lutschern. Vorderseite +Z. */
function candyCartGeo() {
  const b = new Build();
  b.box(2.0, 0.9, 1.0, { v: (px, py, pz, nx, ny, nz) => (nz > 0.5 ? 0xb46ad0 : 0x8a4aa8) }, { p: [0, 0.75, 0] }, 0.06, 1);
  b.box(2.1, 0.08, 1.1, 0xffe6b0, { p: [0, 1.22, 0] }, 0.03, 1);
  for (const sx of [-1, 1]) {
    b.torus(0.32, 0.07, 0x5a3a2a, { p: [sx * 0.7, 0.32, 0.52] }, 4, 12);
    b.cyl(0.04, 0.04, 1.4, 0xffffff, { p: [sx * 0.95, 1.9, -0.35] }, 5);
  }
  for (let i = 0; i < 6; i++) b.box(0.36, 0.06, 1.3, i % 2 ? 0xffffff : 0xff6a2a, { p: [-0.9 + i * 0.36, 2.62, 0.05], r: [0.22, 0, 0] }, 0.02, 1);
  for (let i = 0; i < 6; i++) b.cone(0.18, 0.22, i % 2 ? 0xffffff : 0xff6a2a, { p: [-0.9 + i * 0.36, 2.38, 0.72], r: [Math.PI, 0, 0] }, 3);
  const jar = [0xff5a9a, 0x6ad8ff, 0xffd23a];
  for (let i = 0; i < 3; i++) {
    b.cyl(0.18, 0.18, 0.36, mix(jar[i], 0xffffff, 0.35), { p: [-0.6 + i * 0.6, 1.44, 0.05] }, 8);
    b.cyl(0.19, 0.19, 0.06, 0x6a4a34, { p: [-0.6 + i * 0.6, 1.65, 0.05] }, 8);
    b.sphere(0.12, jar[i], { p: [-0.6 + i * 0.6, 1.42, 0.08] }, 6, 4);
  }
  for (const sx of [-0.85, 0.85]) {
    b.cyl(0.02, 0.02, 0.5, 0xffffff, { p: [sx, 1.5, 0.42] }, 4);
    b.cyl(0.16, 0.16, 0.05, (px, py, pz) => (Math.floor((Math.atan2(pz, px) / TAU + 0.5) * 8) % 2 ? 0xff5a9a : 0xffffff), { p: [sx, 1.82, 0.42], r: [Math.PI / 2, 0, 0] }, 10);
  }
  return b.geometry();
}

/** Kerzengruppe (drei Kerzen mit Wachstropfen; Flammen separat). */
function candlesGeo(seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  for (let i = 0; i < 3; i++) {
    const h = rnd.real(0.18, 0.36), x = [-0.12, 0.1, 0][i], z = [0, 0.06, 0.14][i];
    b.cyl(0.05, 0.055, h, 0xfff4e0, { p: [x, h / 2, z] }, 6);
  }
  return b.geometry();
}
function candlesGlowGeo(seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  for (let i = 0; i < 3; i++) {
    const h = rnd.real(0.18, 0.36), x = [-0.12, 0.1, 0][i], z = [0, 0.06, 0.14][i];
    b.cone(0.035, 0.11, GLOW_CORE, { p: [x, h + 0.06, z] }, 5);
  }
  return b.geometry();
}

/** Hexenhut (für Stümpfe, Zaunpfähle). */
function witchHatGeo(s = 1) {
  const b = new Build();
  b.cyl(0.42 * s, 0.42 * s, 0.04 * s, 0x2e2240, { p: [0, 0.02 * s, 0] }, 12);
  b.tube([[0, 0, 0], [0, 0.4 * s, 0], [0.08 * s, 0.65 * s, 0], [0.22 * s, 0.78 * s, 0.02 * s]], 0.2 * s, 0x2e2240, null, 8, 8);
  b.cone(0.24 * s, 0.4 * s, 0x2e2240, { p: [0, 0.2 * s, 0] }, 10);
  b.cyl(0.25 * s, 0.25 * s, 0.07 * s, 0xa04ad8, { p: [0, 0.07 * s, 0] }, 10);
  b.box(0.1 * s, 0.08 * s, 0.03 * s, 0xffc21a, { p: [0, 0.07 * s, 0.24 * s] }, 0);
  return b.geometry();
}

/**
 * Requisite nach Art (map.props, Halloween): Geometrie mit Fußpunkt im Ursprung (Vorderseite +Z), oder null.
 *   pumpkin { size, face (0/1/2 oder false), lo }   pumpkins { size }   hwlantern { size = Masthöhe }   hwtree { size }
 *   grave { size }   hay   toadstool { size }   candy { size }   cobweb { size }   owl { size }   hwhouse { size: [w, d], color, roof }
 *   hwrock { size }   rowboat   candles   witchhat { size }   ironfence { len }   picket { len }   hwhedge { len, h }
 */
export function hwPropGeo(it, seed) {
  const s = it.size;
  switch (it.kind) {
    case 'pumpkin': return pumpkinGeo(s ?? 1, seed, !!it.lo);
    case 'pumpkins': {
      const b = new Build();
      const k = s ?? 1;
      b.parts.push(pumpkinGeo(k, seed), place(pumpkinGeo(k * 0.6, seed + 1), 0.62 * k, 0, 0.3 * k, 0.4), place(pumpkinGeo(k * 0.45, seed + 2, true), -0.55 * k, 0, 0.35 * k, -0.6));
      return b.geometry();
    }
    case 'hwlantern': return lanternPostGeo(s ?? 2.6);
    case 'hwtree': return spookTreeGeo(s ?? 4.2, seed);
    case 'grave': return graveGeo(seed, s ?? 1);
    case 'hay': return hayGeo(s ?? 1);
    case 'toadstool': return toadstoolGeo(s ?? 1, seed);
    case 'candy': return candyGeo(s ?? 1, seed);
    case 'cobweb': return cobwebGeo(s ?? 0.8).clone();
    case 'owl': return owlGeo(s ?? 1);
    case 'hwhouse': { const [w, d] = Array.isArray(s) ? s : [3.4, 3]; return spookHouseGeo(w, d, seed, it.color ?? 0x8a6a9a, it.roof ?? 0x3e2e5a); }
    case 'hwrock': return hwRockGeo(s ?? 1, seed);
    case 'rowboat': return rowboatGeo();
    case 'candles': return candlesGeo(seed);
    case 'witchhat': return witchHatGeo(s ?? 1);
    case 'leaves': return leavesGeo(s ?? 1, seed);
    case 'heather': return heatherClumpGeo(s ?? 1, seed);
    case 'candycart': return candyCartGeo();
    case 'ironfence': return ironFenceGeo(it.len ?? 4, seed);
    case 'picket': return picketFenceGeo(it.len ?? 4, seed);
    case 'hwhedge': return hwHedgeGeo(it.len ?? 3, it.h ?? 1.2, seed);
    default: return null;
  }
}

/** Leuchtende Teile einer Halloween-Requisite (Material hwglow), sonst null. */
export function hwPropGlow(it, seed) {
  switch (it.kind) {
    case 'pumpkin': return it.face === false || it.face === undefined ? null : pumpkinFaceGeo(it.size ?? 1, it.face === true ? 0 : it.face).clone();
    case 'pumpkins': return it.face === false ? null : pumpkinFaceGeo(it.size ?? 1, 0).clone();
    case 'hwlantern': return lanternPostGlowGeo(it.size ?? 2.6);
    case 'hwhouse': { const [w, d] = Array.isArray(it.size) ? it.size : [3.4, 3]; return spookHouseGlowGeo(w, d, seed); }
    case 'rowboat': return rowboatGlowGeo();
    case 'candles': return candlesGlowGeo(seed);
    default: return null;
  }
}

/** Kollision einer Halloween-Requisite (auf begehbarem Gelände): Zylinder/Quader oder null. */
export function hwPropShape(it) {
  const [x, y, z] = it.pos;
  const s = typeof it.size === 'number' ? it.size : 1;
  const cyl = (r, h) => ({ type: 'cyl', x, z, r, y0: y - 0.2, y1: y + h, tag: `deko:${it.kind}` });
  switch (it.kind) {
    case 'pumpkin': return cyl(0.45 * s, 0.75 * s);
    case 'pumpkins': return cyl(0.75 * s, 0.75 * s);
    case 'hwlantern': return cyl(0.16, it.size ?? 2.6);
    case 'hwtree': return cyl(0.3, 3);
    case 'grave': return cyl(0.4 * s, 1.0 * s);
    case 'hay': return cyl(0.55 * s, 0.6 * s);
    case 'candy': return cyl(0.3 * s, 1.1 * s);
    case 'owl': return cyl(0.4 * s, 1.3 * s);
    case 'hwrock': return cyl(0.9 * s, 1.0 * s);
    case 'candycart': {
      const yaw = it.yaw ?? 0, c = Math.abs(Math.cos(yaw)), sn = Math.abs(Math.sin(yaw));
      return { type: 'box', min: [x - (1.05 * c + 0.6 * sn), y - 0.2, z - (1.05 * sn + 0.6 * c)], max: [x + (1.05 * c + 0.6 * sn), y + 2.6, z + (1.05 * sn + 0.6 * c)], tag: 'deko:wagen' };
    }
    case 'hwhouse': {
      const [w, d] = Array.isArray(it.size) ? it.size : [3.4, 3];
      const yaw = it.yaw ?? 0, c = Math.abs(Math.cos(yaw)), sn = Math.abs(Math.sin(yaw));
      const hx = (w * c + d * sn) / 2 + 0.1, hz = (w * sn + d * c) / 2 + 0.1;
      return { type: 'box', min: [x - hx, y - 0.2, z - hz], max: [x + hx, y + 4, z + hz], tag: 'deko:haus' };
    }
    default: return null;
  }
}

// ------------------------------------------------------------------ Registry-Modelle der Halloween-Welt

// Kandidaten je Requisite: [Name, Optionen, Dreiecks-Obergrenze] – Modelle der Halloween-Welt (models/kinds/*_hw.js).
// Die Obergrenzen halten die Karte im Budget: Grabsteine (≈ 1,3–1,7 k), Halloween-Bäume ohne Laternen (≈ 2,7 k),
// Strohballen (≈ 0,9 k) und Süßigkeiten-Haufen (≈ 5,8 k, nur als einzelne Requisite) werden benutzt; Kürbisse (≈ 2,6 k,
// mit Gesicht ≈ 6,2 k) und Kürbislaternen (≈ 4,8 k) säumen die Wege zu zahlreich – dort bleibt die eigene Geometrie.
// Werden die Modelle leichter, greifen sie ohne Codeänderung.
const HW_PROP_MODELS = {
  pumpkin: (it) => (it.face ? [['kuerbis', { size: it.size ?? 1, face: 'grinsen' }, 1600]] : [['kuerbis', { size: it.size ?? 1 }, 1600]]),
  grave: (it) => [['grabstein', { kind: ['rund', 'kreuz', 'spitz'][(it.variant ?? Math.round(Math.abs(it.pos[0] * 7 + it.pos[2]))) % 3], size: (it.size ?? 1) * 1.1 }, 2000]],
  hwtree: (it) => (it.model ? [['halloween_baum', { height: (it.size ?? 4.2) * 1.05, lanterns: it.lanterns ?? 0, seed: Math.round(Math.abs(it.pos[0] + it.pos[2])) % 4 }, it.lanterns ? 8000 : 3000]] : []),
  hay: () => [['strohballen', { kind: 'eckig' }, 1500]],
  candy: (it) => (it.heap ? [['suessigkeiten_haufen', { size: it.size ?? 1 }, 6000]] : []),
};

/** Requisite → Registry-Modell [name, opts, yaw-Korrektur, scale] (vorhanden und leicht genug) oder null. */
export function hwPropModel(it) {
  const f = HW_PROP_MODELS[it.kind];
  if (!f) return null;
  for (const [name, opts, max] of f(it)) if (hasModel(name) && modelTris(name, opts) <= max) return [name, opts, -Math.PI / 2, 1];
  return null;
}

/**
 * Requisite aus map.props auf der Kürbisinsel bauen (MapBuilder.buildProps, kit 'halloween'): Registry-Modell bzw.
 * eigene Geometrie, Licht im Material hwglow, Kollision auf begehbarem Gelände (oder solid: true).
 */
export function buildHwProp(level, map, grid, it, i) {
  const view = level.view;
  if (view) {
    const add = (g, o) => view.addStatic(g, o);
    const seed = 0x7a11 + i * 37;
    const pm = it.model !== false ? hwPropModel(it) : null;
    // Registry-Modelle je 16-m-Feld in einer eigenen Kachel (zählen nur in Ansichten, die sie sehen)
    const tile = `hw:prop:${Math.floor(it.pos[0] / 16)}:${Math.floor(it.pos[2] / 16)}`;
    const baked = pm ? bakeModel((g, o) => view.addStatic(g, { ...o, tile }), pm[0], pm[1], it.pos, (it.yaw ?? 0) + pm[2], pm[3]) : null;
    if (!baked) {
      const g = hwPropGeo(it, seed);
      if (g) view.addStatic(place(g, it.pos[0], it.pos[1], it.pos[2], it.yaw ?? 0), { castShadow: it.shadow !== false });
    }
    const gl = baked && it.kind === 'pumpkin' ? null : hwPropGlow(it, seed);
    if (gl) { hwGlow(view); view.addStatic(place(gl, it.pos[0], it.pos[1], it.pos[2], it.yaw ?? 0), { material: 'hwglow', castShadow: false }); }
    const L = it.light === false ? null : propLight(it);
    if (L) hwGlow(view).spot(L.p[0], L.p[1], L.p[2], L.s, L.pool, L.g);
  }
  if (it.solid === false) return;
  if (it.solid || grid.isWalk(it.pos[0], it.pos[2])) {
    const sh = hwPropShape(it);
    if (sh) level.world.add(sh);
  }
}

// ------------------------------------------------------------------ Streudeko

/**
 * Streudeko auf nicht begehbaren Blöcken (deterministisch): Kürbisreihen mit Ranken und Strohballen im Kürbisfeld,
 * Spukbäume, Fliegenpilze, kleine Kürbisse und Felsen im Wald und auf Klippen, Grabsteine auf dem Friedhofsrasen,
 * Heidekraut und Pilze im Hexenmoor, Treibholz am Strand. Ein Teil der Kürbisse leuchtet (hwglow, im Takt).
 */
export function scatterHalloween(level, map, grid) {
  const parts = [], glow = [], flatParts = [], spots = [];
  map.ground.forEach((b, i) => {
    const style = b.style ?? 'hwgrass';
    if (b.walk || b.noDeco || ['cobble', 'castle'].includes(style)) return;
    const [x0, z0, x1, z1] = b.rect;
    const w = x1 - x0, d = z1 - z0;
    if (w < 2.5 || d < 2.5) return;
    if (grid.isWalk((x0 + x1) / 2, (z0 + z1) / 2)) return;
    const rnd = new Rnd(0x4a11 + i * 131);
    const pts = [];
    const tooClose = (x, z, r) => pts.some((p) => Math.hypot(p[0] - x, p[1] - z) < r);
    const area = w * d, y = b.top, dens = b.trees ?? 1;
    const put = (n, minD, make, list = parts, edge = 1.1) => {
      for (let k = 0, tries = 0; k < n && tries < n * 14; tries++) {
        const x = rnd.real(x0 + edge, x1 - edge), z = rnd.real(z0 + edge, z1 - edge);
        if (tooClose(x, z, minD)) continue;
        pts.push([x, z]);
        const g = make(rnd, x, z);
        if (g) list.push(place(g, x, y, z, rnd.real(-0.6, 0.6)));
        k++;
      }
    };
    switch (style) {
      case 'field': {
        // Reihen entlang x, Kürbisse mit Lücken, jeder fünfte mit Gesicht (zur Kamera)
        for (let z = z0 + 1.2; z < z1 - 0.8; z += 2.0) {
          for (let x = x0 + 1.0 + rnd.real(0, 0.8); x < x1 - 0.8; x += rnd.real(1.5, 2.4)) {
            if (rnd.frac() < 0.2) continue;
            const s = rnd.real(0.55, 1.05), face = rnd.frac() < 0.22;
            const yaw = face ? rnd.real(-0.35, 0.35) : rnd.real(0, TAU);
            const dz = rnd.real(-0.3, 0.3);
            parts.push(place(pumpkinGeo(s, rnd.int(1, 999), true), x, y, z + dz, yaw));
            if (face) { glow.push(place(pumpkinFaceGeo(s, rnd.int(0, 2)).clone(), x, y, z + dz, yaw)); spots.push([x, y + 0.4 * s, z + dz + 0.5 * s, 1.2 * s]); }
            else if (rnd.frac() < 0.5) flatParts.push(place(leafGeo(rnd.int(1, 99)), x + 0.6, y, z, rnd.real(0, TAU)));
          }
        }
        put(Math.floor(area / 160), 2, () => hayGeo(rnd.real(0.8, 1.1)));
        return;
      }
      case 'graveyard':
        put(Math.max(1, Math.floor(area / 18)), 1.6, (r) => graveGeo(r.int(1, 999), r.real(0.8, 1.1)));
        put(Math.max(1, Math.floor((area / 90) * dens)), 3.4, (r) => spookTreeGeo(r.real(3.6, 4.8), r.int(1, 999)));
        return;
      case 'moor':
        put(Math.floor(area / 25), 1.4, (r) => heatherGeo(r.int(1, 999)));
        put(Math.floor(area / 70), 1.8, (r) => toadstoolGeo(r.real(0.7, 1.1), r.int(1, 999)));
        put(Math.max(1, Math.floor((area / 120) * dens)), 3.4, (r) => spookTreeGeo(r.real(3.6, 4.6), r.int(1, 999)));
        return;
      case 'hwbeach':
        put(Math.floor(area / 90), 2.4, (r) => (r.frac() < 0.5 ? hwRockGeo(r.real(0.4, 0.7), r.int(1, 99)) : driftwoodGeo(r.int(1, 99))));
        return;
      case 'hwrock':
        put(Math.floor((area / 120) * dens), 3.6, (r) => spookTreeGeo(r.real(3.4, 4.6), r.int(1, 999)));
        put(Math.floor(area / 110), 2.2, (r) => hwRockGeo(r.real(0.5, 0.9), r.int(1, 99)));
        return;
      case 'village':
        put(Math.floor(area / 30), 1.6, (r, x, z) => { const s = r.real(0.5, 0.8); glow.push(place(pumpkinFaceGeo(s, r.int(0, 2)).clone(), x, y, z, 0)); spots.push([x, y + 0.4 * s, z + 0.5 * s, 1.2 * s]); return pumpkinGeo(s, r.int(1, 999), true); }, parts, 0.8);
        return;
      default: {   // hwgrass, forest, maze
        put(Math.max(1, Math.floor((area / (style === 'forest' ? 50 : 80)) * dens)), 3.2, (r) => spookTreeGeo(r.real(3.6, 5.2), r.int(1, 999)));
        put(Math.floor(area / 70), 1.8, (r) => toadstoolGeo(r.real(0.7, 1.1), r.int(1, 999)));
        put(Math.floor(area / 90), 1.6, (r, x, z) => {
          const s = r.real(0.5, 0.8);
          if (r.frac() < 0.5) { glow.push(place(pumpkinFaceGeo(s, r.int(0, 2)).clone(), x, y, z, 0)); spots.push([x, y + 0.4 * s, z + 0.5 * s, 1.2 * s]); }
          return pumpkinGeo(s, r.int(1, 999), true);
        });
      }
    }
  });
  const view = level.view;
  if (!view) return;
  for (const g of parts) view.addStatic(g, { castShadow: true });
  for (const g of flatParts) view.addStatic(g, { castShadow: false });
  if (glow.length) { const L = hwGlow(view); for (const g of glow) view.addStatic(g, { material: 'hwglow', castShadow: false }); for (const [x, y, z, s] of spots) L.spot(x, y, z, s); }
}

/** Kürbisblätter am Boden (flach). */
function leafGeo(seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  for (let i = 0; i < 3; i++) b.sphere(0.24, mix(0x3e7a3a, 0x5a9a4a, rnd.frac()), { p: [rnd.real(-0.3, 0.3), 0.04, rnd.real(-0.3, 0.3)], s: [1.3, 0.18, 1] }, 6, 3);
  return b.geometry();
}
/** Heidekraut-Büschel (lila Kugeln auf grünem Fuß). */
function heatherGeo(seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  for (let i = 0; i < 3; i++) b.sphere(rnd.real(0.22, 0.34), i ? 0xa46ad0 : 0x8a52b8, { p: [rnd.real(-0.3, 0.3), 0.2, rnd.real(-0.3, 0.3)], s: [1.2, 0.75, 1.2] }, 6, 4);
  return b.geometry();
}
/** Treibholz am Strand. */
function driftwoodGeo(seed = 1) {
  const b = new Build();
  const rnd = new Rnd(seed);
  b.cyl(0.08, 0.1, rnd.real(1.2, 1.8), 0x8a7a72, { p: [0, 0.08, 0], r: [0, rnd.real(0, 3), Math.PI / 2] }, 5);
  return b.geometry();
}

// ------------------------------------------------------------------ Stege

/**
 * Dunkler Holzsteg (segments: { type: 'hwbridge', from, to, width }): Kollision wie der Standard-Baustein `bridge`,
 * Optik: dunkle Planken mit hellen Fugen, Pfähle bis ins Wasser, durchhängende Seile, je Ende ein Laternenpfosten
 * (Licht im Takt, hwglow), in der Mitte ein Spinnennetz am Seil.
 */
export function buildHwBridge(level, spec) {
  buildBridge({ world: level.world, view: null }, { ...spec, rails: false });
  const view = level.view;
  if (!view) return;
  const a = spec.from, c = spec.to;
  const dx = c[0] - a[0], dz = c[2] - a[2], L = Math.hypot(dx, dz);
  if (L < 0.01) return;
  const w = spec.width ?? 4, dy = c[1] - a[1], pitch = Math.atan(dy / L);
  const yaw = Math.atan2(-dz / L, dx / L);
  const rnd = new Rnd(Math.round(L * 31 + a[0] * 7 + a[2]));
  const b = new Build(), gb = new Build();
  const lamps = [];
  const Ld = Math.hypot(L, dy);
  b.box(Ld + 0.1, 0.16, w, 0x3a2a24, { p: [L / 2, dy / 2 - 0.09, 0], r: [0, 0, pitch] }, 0);
  const np = Math.max(1, Math.floor(Ld / 0.55));
  for (let i = 0; i < np; i++) {
    const u = ((i + 0.5) / np) * Ld;
    const c0 = mix(0x7a5a4a, 0x5e463a, rnd.frac());
    b.box(0.48, 0.05, w - 0.1 + rnd.real(-0.1, 0.1), c0, { p: [Math.cos(pitch) * u, Math.sin(pitch) * u + 0.01, rnd.real(-0.05, 0.05)], r: [0, rnd.real(-0.03, 0.03), pitch] }, 0);
  }
  const sea = -a[1];
  const nPost = Math.max(2, Math.round(L / 4) + 1);
  const H = 0.95;
  for (const s of [-1, 1]) {
    const tops = [];
    for (let k = 0; k < nPost; k++) {
      const t = k / (nPost - 1), px = t * L, py = t * dy;
      const low = sea - 0.6, hgt = py + H - low;
      b.cyl(0.11, 0.14, hgt, { v: (x, y) => (y < -hgt / 2 + (py - low) ? 0x3a2a24 : 0x5a463c) }, { p: [px, low + hgt / 2, s * (w / 2 + 0.05)] }, 5, true);
      tops.push([px, py + H, s * (w / 2 + 0.05)]);
    }
    const rope = [];
    for (let k = 0; k < tops.length - 1; k++) {
      const [ax, ay, az] = tops[k], [bx, by] = tops[k + 1];
      for (let m = 0; m < 3; m++) { const t = m / 3; rope.push([ax + (bx - ax) * t, ay + (by - ay) * t - Math.sin(t * Math.PI) * 0.2, az]); }
    }
    rope.push(tops[tops.length - 1]);
    b.tube(rope, 0.035, 0xb89a6a, null, Math.max(6, rope.length), 3);
    // Laternenpfosten an beiden Enden (außen), Licht im Takt
    for (const t of [0, 1]) {
      const px = t * L + (t ? -0.3 : 0.3), py = t * dy;
      b.parts.push(place(lanternPostGeo(2.1), px, py, s * (w / 2 + 0.35), s > 0 ? Math.PI : 0));
      gb.parts.push(place(lanternPostGlowGeo(2.1), px, py, s * (w / 2 + 0.35), s > 0 ? Math.PI : 0));
      lamps.push([px + (s > 0 ? -0.5 : 0.5), py, s * (w / 2 + 0.35)]);
    }
  }
  if (L > 8) b.parts.push(place(cobwebGeo(0.7).clone(), L * 0.5, dy * 0.5 + H - 0.05, w / 2 + 0.06, 0));
  const g = b.geometry(); g.rotateY(yaw); g.translate(a[0], a[1], a[2]);
  view.addStatic(g, { castShadow: true });
  const gg = gb.geometry(); gg.rotateY(yaw); gg.translate(a[0], a[1], a[2]);
  const lights = hwGlow(view);
  view.addStatic(gg, { material: 'hwglow', castShadow: false });
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  for (const [lx, ly, lz] of lamps) {
    const wx = a[0] + lx * cy + lz * sy, wz = a[2] - lx * sy + lz * cy;
    lights.spot(wx, a[1] + ly + 2.1 - 0.42, wz, 1.5, 2.0, [wx, a[1] + ly, wz]);
  }
}

// ------------------------------------------------------------------ Nachbarwelt und Inselchen

/** Kürbisinsel als ferne Nachbarwelt (Ziel der Halloween-Röhre in Welt 1): dunkle Insel, Riesenkürbisse, Burg, Turm. */
export function hwNeighborParts(nb, rnd) {
  const [x, z] = nb.pos;
  const [w, d] = nb.size ?? [64, 44];
  const parts = [];
  const theme = THEMES.map_halloween;
  const blocks = [[-0.5, 0.15, 0.5, 0.5, 0.6, 'hwbeach'], [-0.45, -0.35, 0.4, 0.2, 2.4, 'hwgrass'], [-0.35, -0.5, 0.05, -0.1, 7, 'hwrock'], [0.1, -0.45, 0.42, -0.05, 4.5, 'field']];
  for (const [a, c, e, f, top, style] of blocks) parts.push(...hwGround({ rect: [x + a * w, z + c * d, x + e * w, z + f * d], top, style }, -3, theme, rnd));
  // Burg auf dem Felsen
  const b = new Build();
  const cx = x - 0.15 * w, cz = z - 0.32 * d;
  b.box(9, 7, 6, 0x4a4060, { p: [cx, 7 + 3.5, cz] }, 0, 1);
  for (const sx of [-1, 1]) {
    b.cyl(1.8, 2, 11, 0x524868, { p: [cx + sx * 5, 7 + 5.5, cz] }, 8);
    b.cone(2.4, 4.5, 0x6a2a8a, { p: [cx + sx * 5, 7 + 13.2, cz] }, 8);
  }
  b.cone(3.2, 5, 0x6a2a8a, { p: [cx, 7 + 9.5, cz] }, 4);
  // schiefer Hexenturm und Riesenkürbisse
  b.cyl(1.4, 1.8, 9, 0x6a5a8a, { p: [x + 0.28 * w, 4.5 + 4.5, z - 0.25 * d], r: [0, 0, 0.12] }, 8);
  b.cone(2.4, 4, 0x2e2240, { p: [x + 0.28 * w - 1.2, 4.5 + 10.8, z - 0.25 * d], r: [0, 0, 0.25] }, 8);
  for (let i = 0; i < 5; i++) b.parts.push(place(pumpkinGeo(rnd.real(2.2, 3.4), i + 3, true), x + rnd.real(-0.4, 0.35) * w, 2.4, z + rnd.real(-0.05, 0.15) * d, rnd.real(-0.4, 0.4)));
  for (let i = 0; i < 4; i++) b.parts.push(place(spookTreeGeo(rnd.real(5, 7), i + 11), x + rnd.real(-0.42, 0.42) * w, 2.4, z + rnd.real(-0.3, -0.05) * d, 0));
  parts.push(b.geometry());
  for (const p of parts) for (const k of Object.keys(p.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') p.deleteAttribute(k);
  return parts;
}

/** Kleines Inselchen im Meer (Kulisse): dunkler Strand mit Spukbaum, Riesenkürbis oder Grabstein. */
export function hwIsletParts(x, z, w, d, top, rnd) {
  const theme = THEMES.map_halloween;
  const t = Math.min(top, 1.1);
  const parts = hwGround({ rect: [x - w / 2, z - d / 2, x + w / 2, z + d / 2], top: t, style: 'hwbeach' }, -2, theme, rnd);
  const k = rnd.frac();
  if (k < 0.45) parts.push(place(spookTreeGeo(rnd.real(3.4, 4.6), rnd.int(1, 999)), x + rnd.real(-1, 1), t, z + rnd.real(-0.8, 0.8), 0));
  else if (k < 0.8) parts.push(place(pumpkinGeo(rnd.real(1.4, 2.2), rnd.int(1, 999), true), x + rnd.real(-1, 1), t, z + rnd.real(-0.8, 0.8), rnd.real(-0.4, 0.4)));
  else parts.push(place(graveGeo(rnd.int(1, 99), 1.2), x + rnd.real(-1, 1), t, z + rnd.real(-0.8, 0.8), rnd.real(-0.3, 0.3)));
  return parts;
}

// ------------------------------------------------------------------ Licht im Takt (Material hwglow)

let hwBpm = 0;
/** Tempo der Halloween-Kartenmusik (Ersatzuhr), fehlt das Thema noch: Tempo der Rückfall-Musik. */
export function hwMapBpm() {
  if (hwBpm) return hwBpm;
  hwBpm = music.themeInfo?.(HW_MUSIC)?.bpm ?? music.themeInfo?.('course_map')?.bpm ?? 116;
  return hwBpm;
}
/** Taktuhr: Zählzeit aus music.beat() (Kartenmusik), sonst aus der Bildzeit im Tempo der Kartenmusik (Ersatzuhr). */
export function hwBeatNow(t) {
  const mb = music.beat();
  const useMusic = mb.bpm > 0 && mb.playing;
  return { beat: useMusic ? mb.beat : (t * hwMapBpm()) / 60, source: useMusic ? mb.source : 'zeit', theme: mb.theme ?? null, bpm: useMusic ? mb.bpm : hwMapBpm() };
}
/** Helligkeit der Laternen zur Zählzeit beat: heller Aufschein am Schlag, dann ruhiges Kerzenflackern. */
export function lanternLevel(beat, t) {
  const frac = beat - Math.floor(beat);
  const pulse = Math.exp(-frac * 3.4);
  const flicker = 0.045 * Math.sin(t * 23.0) * Math.sin(t * 7.1 + 1.3);
  return { pulse, k: 0.58 + 0.42 * pulse + flicker };
}

/**
 * Material hwglow und Taktuhr einer Ansicht einrichten (einmal; auch in Welt 1 für die geschmückte Röhre).
 * Liefert { mat, info() } – info: { beat, step, pulse, k, source, theme, bpm, shown } (shown = zuletzt gezeichnet).
 */
export function hwGlow(view) {
  if (!view) return null;
  if (view.hwLights) return view.hwLights;
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true });
  view.mats.hwglow = mat;
  const spots = [];
  let halos = null, pools = null, haloMat = null, poolMat = null;
  const api = {
    mat,
    shown: null,
    spots,
    info(t = view.time) {
      const bt = hwBeatNow(t);
      const { pulse, k } = lanternLevel(bt.beat, t);
      return { beat: +bt.beat.toFixed(3), step: Math.floor(bt.beat), pulse: +pulse.toFixed(3), k: +k.toFixed(3), source: bt.source, theme: bt.theme, bpm: bt.bpm };
    },
    /**
     * Lichtschein an einer Leuchte: weicher, additiver Schein (Billboard, s m groß) und – mit pool > 0 – ein warmer
     * Lichtfleck am Boden (Radius pool m, bei ground = [x, y, z]). Alle Scheine/Flecken einer Ansicht sind je eine
     * Instanz-Fläche (zwei Zeichenaufrufe), sie pulsieren mit den Laternen im Takt.
     */
    spot(x, y, z, s = 1, pool = 0, ground = null, color = null) { spots.push({ x, y, z, s, pool, g: ground, c: color }); },
    info2() { return { halos: spots.length, pools: spots.filter((p) => p.pool > 0).length }; },
  };
  const _mm = new THREE.Matrix4(), _qq = new THREE.Quaternion(), _pp = new THREE.Vector3(), _ss = new THREE.Vector3(), _cc = new THREE.Color();
  const buildHalos = () => {
    haloMat = new THREE.MeshBasicMaterial({ map: glowTex(), color: 0xffffff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, fog: true });
    halos = new THREE.InstancedMesh(cached('hw:haloquad', () => new THREE.PlaneGeometry(1, 1)), haloMat, spots.length);
    halos.frustumCulled = false; halos.renderOrder = 6; halos.name = 'hw:lichtschein';
    const lit = spots.filter((p) => p.pool > 0);
    poolMat = new THREE.MeshBasicMaterial({ map: glowTex(), color: 0xffffff, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, fog: true, polygonOffset: true, polygonOffsetFactor: -2 });
    if (lit.length) {
      pools = new THREE.InstancedMesh(cached('hw:poolquad', () => new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2)), poolMat, lit.length);
      pools.frustumCulled = false; pools.renderOrder = 2; pools.name = 'hw:lichtflecken';
      lit.forEach((p, i) => {
        const [gx, gy, gz] = p.g ?? [p.x, 0, p.z];
        _mm.compose(_pp.set(gx, gy + 0.035, gz), _qq.identity(), _ss.set(p.pool, 1, p.pool));
        pools.setMatrixAt(i, _mm);
        pools.setColorAt(i, _cc.setHex(p.c ?? 0xffa040));
      });
      pools.instanceMatrix.needsUpdate = true;
      if (pools.instanceColor) pools.instanceColor.needsUpdate = true;
      view.add(pools);
    }
    spots.forEach((p, i) => halos.setColorAt(i, _cc.setHex(p.c ?? 0xffb04a)));
    if (halos.instanceColor) halos.instanceColor.needsUpdate = true;
    view.add(halos);
  };
  /** Scheine und Flecken freigeben (Aufräumen der Karte; mehrfach aufrufbar). */
  api.dispose = () => {
    for (const o of [halos, pools]) { o?.parent?.remove(o); o?.dispose(); }
    haloMat?.dispose(); poolMat?.dispose();
    halos = pools = haloMat = poolMat = null;
    spots.length = 0;
  };
  const update = (dt, t) => {
    const st = api.info(t);
    mat.color.setScalar(st.k);
    api.shown = { step: st.step, k: st.k };
    if (!halos && spots.length && view.frame > 0) buildHalos();
    if (halos) {
      haloMat.opacity = 0.5 + 0.45 * st.pulse;
      poolMat.opacity = 0.34 + 0.36 * st.pulse;
      const q = view.camera.quaternion;
      const k = 0.85 + 0.25 * st.pulse;
      spots.forEach((p, i) => { _mm.compose(_pp.set(p.x, p.y, p.z), q, _ss.setScalar(p.s * k)); halos.setMatrixAt(i, _mm); });
      halos.instanceMatrix.needsUpdate = true;
    }
  };
  update(0, 0);
  view.onFrame(update);
  view.hwLights = api;
  return api;
}

/** Nebelfleck: flache Fläche (liegt waagrecht), weicher Rand – als Instanz-Vorlage für Nebelschwaden. */
export function mistGeo() { return cached('hw:mist', () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)); }
let mistTexCache = null;
/** Weiche, unregelmäßige Nebeltextur (mehrere überlagerte Kreise, Rand transparent). */
export function mistTexture() {
  if (mistTexCache) return mistTexCache;
  mistTexCache = canvasTexture('hw:mist', 128, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    for (const [x, y, r, a] of [[0.5, 0.5, 0.42, 0.55], [0.36, 0.44, 0.26, 0.4], [0.64, 0.56, 0.28, 0.4], [0.5, 0.36, 0.22, 0.3], [0.44, 0.64, 0.24, 0.3]]) {
      const g = c.createRadialGradient(x * w, y * h, 0, x * w, y * h, r * w);
      g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    }
  }, { srgb: false });
  return mistTexCache;
}

let glowTexCache = null;
/** Weicher, runder Schein (warm, für additive Lichter). */
function glowTex() {
  if (glowTexCache) return glowTexCache;
  glowTexCache = canvasTexture('hw:glow', 64, 64, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.5)'); g.addColorStop(0.65, 'rgba(255,255,255,0.14)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  }, { srgb: false });
  return glowTexCache;
}

/** Lichtpunkt einer Requisite (Weltlage): Laterne, Kürbisgesicht, Kerzen, Bootslaterne – für hwGlow(view).spot. */
export function propLight(it) {
  const [x, y, z] = it.pos, yaw = it.yaw ?? 0, c = Math.cos(yaw), sn = Math.sin(yaw);
  const at = (lx, ly, lz) => [x + lx * c + lz * sn, y + ly, z - lx * sn + lz * c];
  const s = typeof it.size === 'number' ? it.size : 1;
  switch (it.kind) {
    case 'hwlantern': { const h = it.size ?? 2.6; const p = at(0.5, h - 0.42, 0); return { p, s: 1.7, pool: 2.4, g: [p[0], y, p[2]] }; }
    case 'pumpkin': return it.face === false || it.face === undefined ? null : { p: at(0, 0.4 * s, 0.5 * s), s: 1.3 * s, pool: 1.0 * s + 0.4, g: [x, y, z] };
    case 'pumpkins': return it.face === false ? null : { p: at(0, 0.4 * s, 0.5 * s), s: 1.3 * s, pool: 1.4 * s, g: [x, y, z] };
    case 'candles': return { p: at(0, 0.45, 0.05), s: 0.8, pool: 0.9, g: [x, y, z] };
    case 'rowboat': return { p: at(1.32, 1.0, 0), s: 1.2, pool: 1.6, g: at(1.32, 0, 0) };
    case 'hwhouse': { const [w, d] = Array.isArray(it.size) ? it.size : [3.4, 3]; return { p: at(w * 0.24, 1.45, d / 2 + 0.3), s: 1.6, pool: 0 }; }
    default: return null;
  }
}

// ------------------------------------------------------------------ Lebendige Kulisse: Fledermäuse, Nebel

/** Fledermaus-Körper (Blick +X): runder Leib, Öhrchen, leuchtende Äuglein. */
function batBodyGeo() {
  return cached('hw:batbody', () => {
    const b = new Build();
    b.sphere(0.2, 0x2e2440, { s: [1.25, 1, 1] }, 8, 6);
    b.sphere(0.14, 0x3a2e50, { p: [0.18, 0.08, 0] }, 7, 5);
    for (const s of [-1, 1]) {
      b.cone(0.06, 0.16, 0x2e2440, { p: [0.18, 0.24, s * 0.07], r: [s * 0.25, 0, 0] }, 4);
      b.sphere(0.035, 0xffe07a, { p: [0.3, 0.11, s * 0.05] }, 5, 3);
    }
    return b.geometry();
  });
}
/** Fledermausflügel (beide, V-förmig nach oben; Flügelschlag über negative y-Skalierung). */
function batWingGeo() {
  return cached('hw:batwing', () => {
    const b = new Build();
    for (const s of [-1, 1]) {
      const sh = new THREE.Shape();
      sh.moveTo(0, 0); sh.lineTo(0.18, 0.62); sh.lineTo(0.02, 0.5); sh.lineTo(-0.06, 0.62); sh.lineTo(-0.12, 0.42); sh.lineTo(-0.22, 0.46); sh.closePath();
      b.extrude(sh, 0.02, 0x4a3a66, { p: [0, 0.02, s * 0.08], r: [s * 1.2, 0, 0] }, 0, 1);
    }
    return b.geometry();
  });
}

/**
 * Lebendige Kulisse der Halloween-Karte (Welt 31): Fledermaus-Schwärme (map.bats: [{ c: [x, y, z], r, n }], kreisen,
 * schlagen mit den Flügeln), Nebelschwaden über dem Wasser an den Ufern (map.fog: { n } – treiben langsam). Je ein
 * Instanz-Objekt (wenige Zeichenaufrufe, kein Schattenwurf). update(dt, t) je Bild, info() für Tests.
 */
export class HwLife {
  constructor(level, map) {
    this.view = level.view;
    this.own = [];
    this.batData = [];
    for (const { c, r, n = 3, speed = 0.7 } of map.bats ?? []) {
      for (let i = 0; i < n; i++) this.batData.push({ c, r: r * (1 - (i % 3) * 0.16), ph: (i / n) * TAU, sp: speed * (1 + (i % 2) * 0.22) * (i % 4 === 3 ? -1 : 1), bob: i * 1.7 });
    }
    if (this.batData.length) {
      const body = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x1a1030 });
      const wing = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, emissive: 0x1a1030 });
      this.own.push(body, wing);
      this.bodies = new THREE.InstancedMesh(batBodyGeo(), body, this.batData.length);
      this.wings = new THREE.InstancedMesh(batWingGeo(), wing, this.batData.length);
      for (const m of [this.bodies, this.wings]) { m.frustumCulled = false; m.castShadow = false; m.name = 'hw:fledermaeuse'; this.view.add(m); this.own.push(m); }
    }
    this.fogData = [];
    if (map.fog !== false) this.buildFog(map, map.fog ?? {});
    this.place(0);
  }

  /** Nebelschwaden: flache, halbdurchsichtige Wölkchen 1–9 m vor den Ufern (deterministisch verteilt). */
  buildFog(map, o) {
    const rects = (map.ground ?? []).filter((b) => b.top > (map.sea ?? 0) - 0.2).map((b) => b.rect);
    const dist = (x, z) => { let d = Infinity; for (const r of rects) d = Math.min(d, Math.hypot(Math.max(r[0] - x, 0, x - r[2]), Math.max(r[1] - z, 0, z - r[3]))); return d; };
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const r of rects) { x0 = Math.min(x0, r[0]); z0 = Math.min(z0, r[1]); x1 = Math.max(x1, r[2]); z1 = Math.max(z1, r[3]); }
    const rnd = new Rnd(0xf06);
    const N = o.n ?? 46;
    for (let i = 0; i < N * 12 && this.fogData.length < N; i++) {
      const x = rnd.real(x0 - 14, x1 + 14), z = rnd.real(z0 - 14, z1 + 14), dd = dist(x, z);
      if (dd < 1.2 || dd > 9) continue;
      this.fogData.push({ x, z, y: (map.sea ?? 0) + rnd.real(0.25, 0.6), s: rnd.real(1.6, 3.2), ph: rnd.real(0, TAU), v: rnd.real(0.15, 0.35) });
    }
    if (!this.fogData.length) return;
    const mat = new THREE.MeshBasicMaterial({ map: mistTexture(), color: 0xe4d8ff, transparent: true, opacity: 0.5, depthWrite: false, fog: true });
    const geo = mistGeo();
    this.own.push(mat);
    this.fog = new THREE.InstancedMesh(geo, mat, this.fogData.length);
    this.fog.frustumCulled = false;
    this.fog.renderOrder = 2;
    this.fog.name = 'hw:nebel';
    this.view.add(this.fog);
    this.own.push(this.fog);
  }

  place(t) {
    const m = _m4, q = _q, e = _e, p = _p, s = _s;
    if (this.bodies) {
      this.batData.forEach((d, i) => {
        const a = d.ph + t * d.sp;
        p.set(d.c[0] + Math.cos(a) * d.r, d.c[1] + Math.sin(t * 1.3 + d.bob) * 0.7, d.c[2] + Math.sin(a) * d.r * 0.8);
        const dir = d.sp > 0 ? 1 : -1;
        e.set(0, Math.atan2(-Math.cos(a) * dir, -Math.sin(a) * dir), 0.25 * dir, 'YXZ');
        q.setFromEuler(e);
        s.set(1, 1, 1);
        m.compose(p, q, s);
        this.bodies.setMatrixAt(i, m);
        s.set(1, Math.cos(t * 13 + d.bob * 3), 1);
        m.compose(p, q, s);
        this.wings.setMatrixAt(i, m);
      });
      this.bodies.instanceMatrix.needsUpdate = true;
      this.wings.instanceMatrix.needsUpdate = true;
    }
    if (this.fog) {
      this.fogData.forEach((f, i) => {
        p.set(f.x + Math.sin(t * f.v + f.ph) * 1.6, f.y + Math.sin(t * 0.7 + f.ph) * 0.08, f.z + Math.cos(t * f.v * 0.7 + f.ph) * 0.9);
        e.set(0, f.ph + t * 0.03, 0); q.setFromEuler(e);
        const k = f.s * (1 + 0.12 * Math.sin(t * 0.5 + f.ph));
        s.set(k * 2.6, 1, k * 1.8);
        m.compose(p, q, s);
        this.fog.setMatrixAt(i, m);
      });
      this.fog.instanceMatrix.needsUpdate = true;
    }
  }

  update(dt, t) { this.place(t); }

  info() { return { bats: this.batData.length, fog: this.fogData.length }; }

  dispose() {
    for (const o of this.own) { o.parent?.remove(o); o.dispose?.(); }
    this.own.length = 0;
    this.view?.hwLights?.dispose();
  }
}
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
