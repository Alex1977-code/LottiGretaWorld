// Gelände, Ränder, Brücken, Requisiten, Streudeko und lebendige Kulisse der Karte der Bonuswelt Pilz „Pilz-Remix“ (Welt 10;
// eigene Gestaltung, Spielzeug-Look wie Welt 1–9): ein Pilzwald-Archipel in Abendstimmung – große Pilzhüte stehen auf dicken
// Stielen im violett-blauen Abendmeer und tragen je eine verkleinerte, „geremixte“ Erinnerung an das Basislevel (Kulissen:
// decor_pilz.js). Zwischen den Hüten führen Stiel-Brücken (umgestürzte Pilzstiele mit Plankendeck) und Rankenbrücken
// (Plankensteg an dicken Ranken, Leuchtpilz-Laternen); ringsum stehen Riesenpilze im Meer, auf kleinen Felsen sprießen Pilze.
//
// Geländestile (map.ground[].style), alle als Pilzhut (flache Decke über dem begehbaren Block, gewölbter Rand mit Lamellen,
// Stiel bis ins Meer, Schaumring): 'redcap' (Standard, roter Hut mit weißen Tupfen), 'nightcap' (Nachtblau mit leuchtenden
// Sterntupfen – P-1), 'sunsetcap' (Abendorange – P-2), 'darkcap' (dunkles Dschungelgrün, leuchtendes Moos – P-3), 'alleycap'
// (Kopfsteinpflaster auf braunem Hut – P-4), 'housecap' (Violett mit Goldtupfen – P-Haus), 'daycap' (Sonnengelb – P-5),
// 'wreckcap' (Graublau mit Seepocken – P-6), 'lavacap' (Schwarzblau mit blau glühenden Tupfen – P-7), 'flowercap' (Rosa mit
// Blütentupfen – Röhre zur Welt Blume). Block-Felder: spots (Anzahl der Tupfen, Standard nach Fläche), stem (false = kein
// Stiel), margin (Hutrand außerhalb des Blocks, 1,3 m).
// Ränder: 'pilzhedge' (Pilzhecke), 'pilzrail' (Pilzgeländer); an Rändern zum Meer setzt pilzRims einen Ring kleiner Pilze
// (Hexenring, einige leuchten im Takt). Brücken (segments, Kollision wie `bridge`): 'stembridge', 'vinebridge'.
// Requisiten (map.props): 'shroom10' (size, color 'rot'|'gelb'|'blau'|'lila'|'weiss'), 'shrooms10' (Grüppchen), 'glowshroom10'
// (Leuchtpilze), 'lamp10' (Pilzlaterne), 'log10' (Moosstamm), 'stump10', 'fern10', 'tuft10', 'rock10', 'house10' (Pilzhäuschen),
// 'giant10' (Registry 'riesenpflanze' { kind: 'pilz' }, sonst eigener Riesenpilz), 'bigshroom10' (eigener großer Pilz).
// Riesenpilze im Meer: map.giants [{ pos: [x, z], top, r, color }] (nur Optik).
// Lebendige Kulisse (PilzLife): Leuchtpilze, Laternen und leuchtende Tupfen teilen das Puls-Material 'bglow' – je Zählzeit
// der Kartenmusik (music.beat()) heller Aufschein, dann Abklingen; ohne laufende Musik Ersatzuhr im Tempo von
// course_worldpilz_map. Glühwürmchen (eine Instanz-Fläche) schweben um die Hüte, je Zählzeit leuchtet eine von drei Gruppen.
// Thema 'map_pilz': Abendhimmel Violett → Rosa → Orange, tief stehende Sonne, erste Sterne, ferne Riesenpilze am Horizont.

import * as THREE from 'three';
import { THEMES } from '../view/themes.js';
import { alignedGrid } from '../blocks/kit.js';
import { buildBridge } from '../blocks/types/bridge.js';
import { starField } from '../view/backdrop_w2.js';
import { Rnd } from '../../three/world/geometry.js';
import {
  registerKit, Build, place, mix, TAU, cached, vcol, lin, mixc, smooth, colorize, PI, FRONT, hash2, tone, flat, mark,
  beatClock, bonusGlow, profileParts, ringPts, ringStrip, stemGeo, edgeRuns, spanOf, placeAlong, alongAt, worldAlong, modelKit,
  setInst, mergeParts, inView,
} from './bonuskit.js';

export const PILZ_MUSIC = 'course_worldpilz_map';
export const BEAT10 = beatClock(PILZ_MUSIC);
export const MK10 = modelKit('w10');
export const GLOW_TILE10 = MK10.glowTile;

// ------------------------------------------------------------------ Thema

if (!THEMES.map_pilz) {
  THEMES.map_pilz = {
    ...THEMES.grass,
    label: 'Weltkarte Pilz-Remix',
    // Abendhimmel: oben tiefes Violett, zum Horizont Rosa und Orange
    sky: [[1, 0x1c1650], [0.55, 0x34287a], [0.3, 0x6e3c96], [0.14, 0xc8608e], [0.05, 0xff9070], [0, 0xffb878], [-0.1, 0xb07494], [-1, 0x3a2652]],
    background: 0xd08aa0,
    fog: { color: 0xc488aa, near: 110, far: 440 },
    hemi: { sky: 0xffdcec, ground: 0x6a4a7a, intensity: 1.42 },
    sun: { color: 0xffc69a, intensity: 2.55, dir: [-0.6, 0.82, 0.45] },
    ground: null,
    clouds: false,
    sunDisc: true,
    backdrop: 'pilz10',
    grassTop: 0x6ab86a, grassTop2: 0x5eac60, grassRim: 0xa0d890, grassSide: 0x6a4a6a,
    dirt: 0x8a5a5a, dirtDeep: 0x5a3a4a, rock: 0x7a6a86, rockDeep: 0x4a3e5a,
    stone: 0xf2e6dc, stoneDark: 0xb8a8a8,
    wood: 0xc89a6a, woodDark: 0x7a5236,
    water: 0x5a6ad0, waterDeep: 0x2a2a7a,
    buildBackdrop(sky, bounds, rnd) { pilzBackdrop(sky, bounds, rnd); },
  };
}

/** Ferne Riesenpilze am Horizont (unbeleuchtet, im Dunst) und erste Sterne am Abendhimmel. */
function pilzBackdrop(sky, bounds, rnd) {
  const parts = [];
  const x0 = bounds.min.x, x1 = bounds.max.x, z0 = bounds.min.z, z1 = bounds.max.z;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const R0 = Math.max(x1 - x0, z1 - z0) / 2 + 170;
  const caps = [0x8a3a6a, 0x6a3a8a, 0xa04a5a, 0x5a4a9a, 0x8a5a3a];
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * TAU + rnd.real(-0.08, 0.08);
    const r = R0 + rnd.real(-20, 50);
    const bx = cx + Math.cos(a) * r, bz = cz + Math.sin(a) * r;
    const h = rnd.real(26, 58), cr = rnd.real(16, 30);
    const st = new THREE.CylinderGeometry(cr * 0.22, cr * 0.3, h, 8, 1, true);
    st.translate(bx, h / 2 - 4, bz);
    parts.push(colorize(st, (p, n, o) => mixc(lin(0x6a4a7a), lin(0xb88aa8), smooth(-4, h, p.y), o)));
    const cap = new THREE.SphereGeometry(cr, 12, 6, 0, TAU, 0, PI / 2);
    cap.scale(1, 0.5, 1);
    cap.translate(bx, h - 5, bz);
    const c0 = lin(caps[i % caps.length]);
    parts.push(colorize(cap, (p, n, o) => mixc(mixc(c0, [0, 0, 0], 0.35, [0, 0, 0]), c0, smooth(-0.2, 0.9, n.y), o)));
  }
  for (const p of parts) for (const k of Object.keys(p.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') p.deleteAttribute(k);
  const g = mergeParts(parts);
  if (g) {
    const mesh = new THREE.Mesh(sky.track(g), sky.track(new THREE.MeshBasicMaterial({ vertexColors: true, fog: true })));
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    mesh.name = 'w10:hintergrund';
    sky.group.add(mesh);
  }
  const stars = starField(sky, rnd, 420, { size: 1.8, tints: [0xffffff, 0xffe6f0, 0xfff0c8] });
  if (stars) stars.name = 'w10:abendsterne';
}

// ------------------------------------------------------------------ Farben der Pilzhüte

// top: Hut (zwei Töne), spot: Tupfen, rim: Hutrand, lip: Kante unten, under: Lamellen (hell, dunkel), stem: Stiel (unten, oben),
// glow: Tupfen leuchten im Takt (Puls-Material), cobble: Kopfsteinpflaster statt glatter Decke, flower: Blütentupfen
export const CAPS10 = {
  redcap: { top: [0xe8443c, 0xd83830], spot: 0xfff6ea, rim: 0xc42c2c, lip: 0xf6e0c8, under: [0xf6e6cc, 0xdcc4a2], stem: [0xe8d8bc, 0xfaf2e2] },
  nightcap: { top: [0x3c3ea0, 0x32348e], spot: 0xc8f0ff, rim: 0x282a78, lip: 0xb0b8e8, under: [0xc8ccec, 0x9a9ec8], stem: [0xb8bce0, 0xe4e8fa], glow: true },
  sunsetcap: { top: [0xff8e3c, 0xf47c30], spot: 0xffe6b8, rim: 0xd8602a, lip: 0xffd8a8, under: [0xffe4c0, 0xe8c294], stem: [0xf0d8b4, 0xfff0d8] },
  darkcap: { top: [0x2e6c5c, 0x285e50], spot: 0xa8f0a0, rim: 0x1e4a40, lip: 0x9ac8a8, under: [0xc8dcc0, 0x9ab894], stem: [0xb8c8a8, 0xdce8cc], glow: true },
  alleycap: { top: [0x9a6c4c, 0x8a5e42], spot: 0xe8caa2, rim: 0x6e4630, lip: 0xe0c098, under: [0xeedcc0, 0xcab08a], stem: [0xdcc8a8, 0xf0e2c8], cobble: true },
  housecap: { top: [0x8c4cc8, 0x7c40b6], spot: 0xffe07a, rim: 0x6230a0, lip: 0xe8d0f8, under: [0xeedcf4, 0xcab4dc], stem: [0xe0d4ec, 0xf6eefc] },
  daycap: { top: [0xffd84c, 0xf6c83c], spot: 0xfff4d6, rim: 0xe0a82a, lip: 0xfff0c0, under: [0xfff2d0, 0xe8d4a0], stem: [0xf2e4c4, 0xfffaea] },
  wreckcap: { top: [0x5c7c9c, 0x507090], spot: 0xdcecf4, rim: 0x3e5a78, lip: 0xc8dce8, under: [0xdce6ec, 0xb4c4d0], stem: [0xc8d4dc, 0xe8eef2] },
  lavacap: { top: [0x2c2c4e, 0x242442], spot: 0x5ad8ff, rim: 0x1c1c36, lip: 0x7a8ab8, under: [0xaab4d8, 0x7a84ac], stem: [0x8a94b8, 0xc0c8e4], glow: true },
  flowercap: { top: [0xff8cc8, 0xf47cbc], spot: 0xffffff, rim: 0xd8589c, lip: 0xffe0f0, under: [0xfff0f6, 0xecccdc], stem: [0xb8e0a0, 0xe0f4c8], flower: true },
};
export const PILZ_STYLES = new Set(Object.keys(CAPS10));

// ------------------------------------------------------------------ Pilzhut-Insel

const MARGIN = 1.3, RCORNER = 5;

/**
 * Gelände-Block der Welt Pilz als Pilzhut: flache Decke (Block + Rand), gewölbter Hutrand, Lamellen darunter, Stiel bis ins
 * Meer mit Manschette und Schaumring; Tupfen als flache Scheiben (leuchtend bei glow). Liefert Teil-Geometrien.
 */
export function pilzGround(b, base, theme, rnd, map) {
  const st = b.style ?? 'redcap';
  const P = CAPS10[st] ?? CAPS10.redcap;
  const [x0, z0, x1, z1] = b.rect;
  const top = b.top, hw = (x1 - x0) / 2, hd = (z1 - z0) / 2, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const m = b.margin ?? MARGIN, R = Math.min(RCORNER, 0.45 * Math.min(hw, hd) + m);
  const out = [];
  const tA = lin(P.top[0]), tB = lin(P.top[1]);
  const topCol = (p) => mixc(tA, tB, hash2(Math.round(p[0] * 0.5), Math.round(p[2] * 0.5)) * 0.6, [0, 0, 0]);
  const rimC = lin(P.rim), lipC = lin(P.lip);
  // Decke und Rand (Profil nach außen, dann Kante nach innen/unten)
  const prof = profileParts(b, [
    { o: 0, R: 0, dy: 0, col: topCol },
    { o: m, R, dy: 0, col: topCol },
    { o: m + 0.55, R: R + 0.55, dy: -0.2, col: (p) => mixc(topCol(p), rimC, 0.3, [0, 0, 0]) },
    { o: m + 0.95, R: R + 0.95, dy: -0.66, col: rimC },
    { o: m + 1.1, R: R + 1.1, dy: -1.15, col: mixc(rimC, [0, 0, 0], 0.12, [0, 0, 0]), up: -0.2 },
    { o: m + 0.9, R: R + 0.9, dy: -1.5, col: lipC, up: -1.2 },
  ], 72);
  out.push(flat(prof.parts[0]));                 // Decke am Rand (flach, ohne Schattenwurf)
  for (const g of prof.parts.slice(1)) out.push(g);
  // Lamellen: von der Kante nach innen hinauf zum Stiel (Streifen je Winkel)
  const rs = b.stemR ?? Math.max(1.6, 0.3 * Math.min(hw, hd));
  const sx = clampRatio(hw / hd), sz = 1 / sx;
  const lip = prof.rings[prof.rings.length - 1];
  const inner = ringPts(cx, cz, 0, 0, rs * 1.25, rs * 1.25, top - 2.1, 72).map(([x, y, z]) => [cx + (x - cx) * sx, y, cz + (z - cz) * sz]);
  const uA = lin(P.under[0]), uB = lin(P.under[1]);
  const gill = (p) => (Math.floor(((Math.atan2(p[2] - cz, p[0] - cx) / TAU) + 1) * 90) & 1 ? uA : uB);
  out.push(flat(ringStrip(lip, inner, gill, gill, () => [0, -1, 0])));
  // Deckenfläche im Block (2-m-Raster, leicht gefleckt bzw. Kopfsteinpflaster)
  if (P.cobble) out.push(flat(cobbleGrid(x0, z0, x1, z1, top, rnd, P)));
  else {
    // Hut-Wölbung: zur Mitte heller (wie eine Kuppel im Abendlicht)
    const hi = mixc(lin(P.top[0]), [1, 1, 1], 0.22, [0, 0, 0]);
    out.push(flat(alignedGrid(x0, z0, x1, z1, top, 2, (i, j, ax, az) => {
      const o = tone(P.top[0], P.top[1], hash2(ax * 0.5 + 1, az * 0.5) * 0.6);
      const d = Math.max(Math.abs(ax + 1 - cx) / hw, Math.abs(az + 1 - cz) / hd);
      return mixc(o, hi, (1 - Math.min(1, d)) * 0.5, o);
    })));
  }
  // Tupfen (flache Scheiben): meist auf dem Hutrand außerhalb des Wegs, wenige auf der Decke; leuchtende kleiner
  const area = (x1 - x0) * (z1 - z0);
  const nSpots = b.spots ?? Math.max(5, Math.round(area / (P.glow ? 55 : 80)));
  const sp = new Build(), spG = new Build();
  const placed = [];
  for (let i = 0, tries = 0; i < nSpots && tries < nSpots * 20; tries++) {
    const a = rnd.real(0, TAU), k = i % 3 ? rnd.real(0.86, 1.03) : rnd.real(0.15, 0.8);
    const rr = P.glow ? rnd.real(0.25, 0.55) : P.flower ? rnd.real(0.7, 1.1) : rnd.real(0.45, 1.05);
    const px = cx + Math.cos(a) * (hw + m - rr) * k, pz = cz + Math.sin(a) * (hd + m - rr) * k;
    if (placed.some(([qx, qz, qr]) => Math.hypot(qx - px, qz - pz) < qr + rr + 0.6)) continue;
    placed.push([px, pz, rr]);
    const disc = new THREE.CircleGeometry(rr, 14).rotateX(-PI / 2);
    const col = P.flower ? (i % 2 ? 0xffffff : 0xfff2a0) : P.spot;
    if (P.flower) {
      // Blütentupfen: fünf Blütenblätter um eine gelbe Mitte
      for (let q = 0; q < 5; q++) {
        const qa = (q / 5) * TAU;
        sp.add(new THREE.CircleGeometry(rr * 0.42, 10).rotateX(-PI / 2), col, { p: [px + Math.cos(qa) * rr * 0.5, top + 0.012, pz + Math.sin(qa) * rr * 0.5] });
      }
      sp.add(new THREE.CircleGeometry(rr * 0.3, 10).rotateX(-PI / 2), 0xffd23a, { p: [px, top + 0.016, pz] });
      disc.dispose();
    } else (P.glow ? spG : sp).add(disc, col, { p: [px, top + 0.012, pz] });
  }
  if (sp.parts.length) out.push(flat(sp.geometry()));
  if (spG.parts.length) out.push(flat(spG.geometry(), 'bglow', GLOW_TILE10));
  // Stiel mit Manschette und Schaumring
  if (b.stem !== false) {
    const sea = map?.sea ?? 0;
    const s0 = lin(P.stem[0]), s1 = lin(P.stem[1]);
    const yTop = top - 1.9, yBot = sea - 1.2, H = yTop - yBot;
    out.push(stemGeo(cx, cz, rs, yBot, yTop, { v: (px, py, pz, nx) => mixc(s0, s1, smooth(0, H, py) * 0.7 + Math.abs(nx) * 0.15, [0, 0, 0]) }, { sx, sz, seg: 16, bulge: 0.12, flare: 0.3 }));
    const ring = new Build();
    const yR = yBot + H * 0.62;
    ring.lathe([[rs * 1.02, 0.25], [rs * 1.3, -0.15], [rs * 1.45, -0.55], [rs * 1.38, -0.62], [rs * 1.0, -0.2]], { v: (px, py) => mix(P.stem[0], P.lip, py + 0.6) }, { p: [0, 0, 0] }, 16);
    const rg = ring.geometry(); rg.scale(sx, 1, sz); rg.translate(cx, yR, cz);
    out.push(rg);
    const foam = new Build();
    foam.add(new THREE.RingGeometry(rs * 1.3, rs * 1.75, 18, 1).rotateX(-PI / 2), 0xe8eeff, { p: [0, 0, 0] });
    const fg = foam.geometry(); fg.scale(sx, 1, sz); fg.translate(cx, sea + 0.04, cz);
    out.push(flat(fg, 'glow', GLOW_TILE10));
  }
  void base; void theme;
  return out;
}
const clampRatio = (r) => Math.max(0.75, Math.min(1.33, r));

/** Kopfsteinpflaster (1-m-Steine mit dunklen Fugen) für die Schattenspiel-Gasse. */
function cobbleGrid(x0, z0, x1, z1, top, rnd, P) {
  const b = new Build();
  b.add(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-PI / 2), mix(P.rim, 0x3a2a20, 0.4), { p: [(x0 + x1) / 2, top, (z0 + z1) / 2] });
  for (let x = Math.ceil(x0); x < x1 - 0.2; x += 1) {
    for (let z = Math.ceil(z0); z < z1 - 0.2; z += 1) {
      const off = (Math.floor(z) & 1) * 0.5;
      const xx = x + off;
      if (xx + 0.92 > x1) continue;
      const c = mix(0xb89a80, 0xd8c0a4, hash2(xx * 1.3, z * 0.7));
      b.box(0.86, 0.03, 0.86, c, { p: [xx + 0.46, top + 0.015, z + 0.46] }, 0);
    }
  }
  void rnd;
  return b.geometry();
}

// ------------------------------------------------------------------ Ränder

/** Kleiner Pilz (Fußpunkt im Ursprung): Stiel h, Hut r; Tupfen optional. Geometrie gecacht. */
export function smallShroomGeo(h = 0.5, r = 0.3, cap = 0xe8443c, spot = 0xffffff, stem = 0xf6ead4, lo = false) {
  return cached(`w10m:shroom:${h}:${r}:${cap}:${spot}:${lo ? 1 : 0}`, () => {
    const b = new Build();
    b.cyl(r * 0.28, r * 0.36, h, stem, { p: [0, h / 2, 0] }, lo ? 5 : 7, true);
    b.dome(r, { v: (x, y, z, nx, ny) => mix(mix(cap, 0x000000, 0.25), cap, ny * 0.8 + 0.2) }, { p: [0, h * 0.92, 0], s: [1, 0.62, 1] }, PI / 2, lo ? 7 : 9, lo ? 3 : 4);
    if (spot !== null) for (let i = 0; i < (lo ? 2 : 3); i++) { const a = i * 2.3 + 0.4; b.sphere(r * 0.18, spot, { p: [Math.cos(a) * r * 0.55, h * 0.92 + r * 0.42, Math.sin(a) * r * 0.55], s: [1, 0.5, 1] }, 5, 3); }
    return b.geometry();
  });
}
const SHROOM_COLORS = { rot: 0xe8443c, gelb: 0xffc83a, blau: 0x4a7ae8, lila: 0x9a5ae0, weiss: 0xf4ece0, orange: 0xff8a3a, rosa: 0xff8ac8, gruen: 0x4ac06a };

/** Pilzhecke (entlang +X): dichte Reihe kleiner Pilze auf Moos. */
function pilzHedgeGeo(len, seed = 1) {
  const b = new Build();
  b.box(len, 0.35, 0.7, { v: (x, y, z, nx, ny) => (ny > 0.5 ? 0x5aa85a : 0x3e7a44) }, { p: [0, 0.17, 0] }, 0.12);
  const n = Math.max(1, Math.round(len / 0.7));
  const cols = [0xe8443c, 0xffc83a, 0xf4ece0];
  for (let i = 0; i < n; i++) {
    const g = smallShroomGeo(0.42, 0.26, cols[(i + seed) % 3], 0xffffff, 0xf6ead4, true).clone();
    g.translate(-len / 2 + (i + 0.5) * (len / n), 0.3, ((i * 7 + seed) % 3 - 1) * 0.12);
    b.parts.push(g);
  }
  return b.geometry();
}
/** Pilzgeländer an Abbrüchen: Pfosten mit Pilzköpfen, Ranke als Handlauf. */
function pilzRailGeo(len) {
  const b = new Build();
  const n = Math.max(1, Math.round(len / 2));
  for (let i = 0; i <= n; i++) {
    const x = -len / 2 + i * (len / n);
    b.cyl(0.07, 0.09, 0.78, 0xf2e6d0, { p: [x, 0.39, 0] }, 6);
    b.dome(0.2, 0xe8443c, { p: [x, 0.78, 0], s: [1, 0.6, 1] }, PI / 2, 8, 3);
  }
  b.box(len, 0.06, 0.06, 0x4e9a4a, { p: [0, 0.62, 0] }, 0);
  return b.geometry();
}
/** Basalt-Bordstein um das blaue Lavabecken (P-7), entlang +X. */
function lavaRimGeo(len, seed = 1) {
  const b = new Build();
  const n = Math.max(1, Math.round(len / 1.1));
  for (let i = 0; i < n; i++) {
    const h = 0.38 + hash2(i * 1.7 + seed, len) * 0.22;
    b.box(len / n + 0.04, h, 0.7, { v: (px, py, pz, nx, ny) => mix(0x24243e, 0x5a5a7e, ny * 0.5 + 0.5) }, { p: [-len / 2 + (i + 0.5) * (len / n), h / 2, 0], r: [0, (hash2(i, seed) - 0.5) * 0.08, 0] }, 0.08);
  }
  return b.geometry();
}
export function pilzEdgeGeo(kind, len, seed) {
  if (kind === 'pilzhedge') return pilzHedgeGeo(len + 0.1, seed);
  if (kind === 'pilzrail') return pilzRailGeo(len);
  if (kind === 'lavarim10') return lavaRimGeo(len + 0.6, seed);
  return null;
}

/**
 * Hexenring an allen Hut-Rändern zum Meer (die unsichtbare Kartenwand bleibt): kleine Pilze knapp innen an der Kante, die
 * Farbe passt zum Hut; jeder dritte Hut-Tupfen leuchtet im Takt (Puls-Material). Brücken bleiben frei.
 */
export function pilzRims(level, map, grid) {
  if (!level.view) return 0;
  let n = 0;
  const blockAt = (x, z) => (map.ground ?? []).find((b) => b.walk && x >= b.rect[0] - 0.3 && x <= b.rect[2] + 0.3 && z >= b.rect[1] - 0.3 && z <= b.rect[3] + 0.3);
  for (const r of edgeRuns(level, map, grid)) {
    const L = r.b - r.a;
    if (L < 1) continue;
    const b = new Build(), gl = new Build();
    const k = Math.max(1, Math.round(L / 1.35));
    const mid = (r.a + r.b) / 2;
    const bl = blockAt(...(r.w.axis === 'x' ? [r.w.x - r.w.side * 0.3, mid] : [mid, r.w.z - r.w.side * 0.3]));
    const P = CAPS10[bl?.style ?? 'redcap'] ?? CAPS10.redcap;
    const capCols = P.glow ? [P.spot, mix(P.spot, 0xffffff, 0.4)] : [0xf4ece0, P.spot === 0xfff6ea ? 0xffc83a : P.spot, 0xe8443c];
    for (let i = 0; i < k; i++) {
      const u = r.a + (i + 0.5) * (L / k) + (hash2(i * 3.1, mid) - 0.5) * 0.4;
      const inset = 0.28 + hash2(u, i) * 0.18;
      const [x, , z] = r.w.axis === 'x' ? [r.w.x - r.w.side * inset, 0, u] : [u, 0, r.w.z - r.w.side * inset];
      const h = 0.32 + hash2(x * 2.1, z) * 0.26, rr = 0.2 + hash2(z * 1.7, x) * 0.14;
      const lit = P.glow && i % 3 === 0;
      const g = smallShroomGeo(+h.toFixed(2), +rr.toFixed(2), capCols[i % capCols.length], lit ? null : 0xffffff, 0xf6ead4, true).clone();
      g.translate(x, r.y, z);
      (lit ? gl : b).parts.push(g);
      n++;
    }
    if (b.parts.length) level.view.addStatic(b.geometry(), { castShadow: false });
    if (gl.parts.length) level.view.addStatic(gl.geometry(), { material: 'bglow', castShadow: false, tile: GLOW_TILE10 });
  }
  return n;
}

// ------------------------------------------------------------------ Brücken

/** Stiel-Brücke: umgestürzter Riesenpilz-Stiel, oben ein Plankendeck, kleine Pilze und Moos an den Flanken, Schnittflächen. */
function buildStemBridge(level, spec) {
  buildBridge({ world: level.world, view: null }, { ...spec, rails: false });
  if (!level.view) return;
  const { a, c, dy, pitch, Ld, w } = spanOf(spec);
  const b = new Build(), deck = new Build(), gl = new Build();
  const rl = w * 0.42;
  b.cyl(rl, rl, Ld + 0.4, { v: (px, py, pz, nx, ny) => mix(0xd8c4a0, 0xf6ead4, ny * 0.5 + 0.5 + Math.sin(px * 9) * 0.05) }, { p: [Ld / 2, -rl + 0.02, 0], r: [0, 0, PI / 2] }, 14, true);
  for (const e of [0, 1]) b.cyl(rl * 1.08, rl * 1.08, 0.18, { v: (px, py, pz) => mix(0xc8a478, 0xf6ead4, (Math.hypot(py, pz) / rl) % 0.5 * 2) }, { p: [e ? Ld + 0.25 : -0.25, -rl + 0.02, 0], r: [0, 0, PI / 2] }, 14);
  deck.box(Ld + 0.3, 0.1, w, { v: (px, py, pz, nx, ny) => (ny > 0.5 ? mix(0xc89a6a, 0xdcae7c, Math.abs(Math.sin(pz * 5))) : 0x8a5e3e) }, { p: [Ld / 2, -0.05, 0] }, 0);
  const n = Math.max(2, Math.round(Ld / 0.6));
  for (let i = 0; i < n; i++) deck.box(0.06, 0.012, w - 0.1, 0x7a5236, { p: [((i + 0.5) / n) * Ld, 0.004, 0] }, 0);
  // kleine Pilze und Moos an den Flanken
  const ns = Math.max(2, Math.round(Ld / 2.2));
  for (let i = 0; i < ns; i++) {
    const u = ((i + 0.5) / ns) * Ld;
    const s = i % 2 ? 1 : -1;
    const g = smallShroomGeo(0.34, 0.28, i % 3 ? 0xe8443c : 0xffc83a, 0xffffff, 0xf6ead4, true).clone();
    g.rotateX(s * 0.9);
    g.translate(u, -rl * 0.55, s * rl * 0.86);
    b.parts.push(g);
    b.sphere(0.38, { v: (px, py, pz, nx, ny) => mix(0x3e7a44, 0x6ab85a, ny * 0.5 + 0.5) }, { p: [u + 0.9, -rl * 0.95, -s * rl * 0.75], s: [1.4, 0.5, 1] }, 6, 4);
    if (i % 2 === 0) gl.sphere(0.12, 0xc8f0a0, { p: [u + 0.4, -rl * 1.1, s * rl * 0.6] }, 5, 3);
  }
  // Kanten-Ranken als niedriger Handlauf
  for (const s of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 8; i++) { const u = (i / 8) * Ld; pts.push([u, 0.55 + Math.sin(i * 1.7) * 0.08, s * (w / 2 - 0.08)]); }
    b.tube(pts, 0.06, 0x4e9a4a, null, 16, 4);
    for (const e of [0.2, Ld - 0.2]) b.cyl(0.07, 0.09, 0.62, 0x4e9a4a, { p: [e, 0.3, s * (w / 2 - 0.08)] }, 5);
  }
  const rot = (g) => { g.rotateZ(pitch); return g; };
  level.view.addStatic(placeAlong(rot(b.geometry()), a, c), { castShadow: true });
  level.view.addStatic(placeAlong(rot(deck.geometry()), a, c), { castShadow: false });
  if (gl.parts.length) level.view.addStatic(placeAlong(rot(gl.geometry()), a, c), { material: 'bglow', castShadow: false, tile: GLOW_TILE10 });
  void dy;
}

/** Rankenbrücke: Plankensteg an dicken Ranken mit Blättern, an beiden Enden Pilzlaternen (leuchten im Takt). */
function buildVineBridge(level, spec) {
  buildBridge({ world: level.world, view: null }, { ...spec, rails: false });
  if (!level.view) return;
  const { a, c, L, dy, pitch, Ld, w } = spanOf(spec);
  const b = new Build(), deck = new Build(), gl = new Build();
  b.box(Ld + 0.2, 0.18, w, 0x5e3e2a, { p: [Ld / 2, -0.12, 0] }, 0);
  const n = Math.max(2, Math.floor(Ld / 0.55));
  for (let i = 0; i < n; i++) {
    const u = ((i + 0.5) / n) * Ld;
    deck.box(0.48, 0.05, w - 0.12, mix(0xb07a4a, 0x8a5a36, hash2(i * 1.3, Ld)), { p: [u, 0.0, (hash2(i, 2) - 0.5) * 0.1], r: [0, (hash2(i, 5) - 0.5) * 0.05, 0] }, 0);
  }
  for (const s of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 10; i++) { const u = (i / 10) * Ld; pts.push([u, 0.95 - Math.sin((i / 10) * PI) * 0.28, s * (w / 2 + 0.05)]); }
    b.tube(pts, 0.1, { v: (px, py, pz, nx, ny) => mix(0x2e7a3a, 0x5ab84a, ny * 0.5 + 0.5) }, null, 20, 5);
    for (let i = 1; i < 10; i += 2) {
      const [px, py, pz] = pts[i];
      b.sphere(0.24, { v: (x, y, z, nx, ny) => mix(0x3e9a44, 0x8ad86a, ny * 0.5 + 0.5) }, { p: [px, py + 0.05, pz + s * 0.08], s: [1.6, 0.35, 0.9], r: [0, i * 0.7, 0.3] }, 6, 3);
    }
    for (const e of [0.25, Ld - 0.25]) {
      b.cyl(0.09, 0.12, 1.5, 0xf2e6d0, { p: [e, 0.75, s * (w / 2 + 0.05)] }, 6);
      gl.dome(0.32, s > 0 ? 0xffd88a : 0xa8f0ff, { p: [e, 1.55, s * (w / 2 + 0.05)], s: [1, 0.7, 1] }, PI / 2, 9, 3);
    }
    // senkrechte Ranken zum Deck
    for (let i = 1; i < 4; i++) { const u = (i / 4) * Ld; b.cyl(0.035, 0.035, 0.75, 0x2e7a3a, { p: [u, 0.38, s * (w / 2 + 0.05)] }, 4, true); }
  }
  const rot = (g) => { g.rotateZ(pitch); return g; };
  level.view.addStatic(placeAlong(rot(b.geometry()), a, c), { castShadow: true });
  level.view.addStatic(placeAlong(rot(deck.geometry()), a, c), { castShadow: false });
  level.view.addStatic(placeAlong(rot(gl.geometry()), a, c), { material: 'bglow', castShadow: false, tile: GLOW_TILE10 });
  void L; void dy; void alongAt; void worldAlong;
}

export function buildPilzSegment(level, seg) {
  switch (seg.type) {
    case 'stembridge': buildStemBridge(level, seg); return true;
    case 'vinebridge': buildVineBridge(level, seg); return true;
    default: return false;
  }
}

// ------------------------------------------------------------------ Requisiten

function bigShroomGeo(h = 4, r = 2.2, cap = 0xe8443c, seed = 1) {
  return cached(`w10m:big:${h}:${r}:${cap}:${seed}`, () => {
    const b = new Build();
    b.lathe([[r * 0.3, 0], [r * 0.24, h * 0.2], [r * 0.22, h * 0.6], [r * 0.26, h * 0.92]], { v: (x, y) => mix(0xe2d2b4, 0xfaf2e2, y / h) }, null, 10);
    b.dome(r, { v: (x, y, z, nx, ny) => mix(mix(cap, 0x000000, 0.3), cap, ny * 0.9 + 0.1) }, { p: [0, h * 0.86, 0], s: [1, 0.55, 1] }, PI / 2, 14, 5);
    b.cyl(r * 0.98, r * 0.3, 0.12, 0xf0e0c4, { p: [0, h * 0.85, 0] }, 14);
    for (let i = 0; i < 6; i++) { const a = i * 1.07 + seed; const k = 0.35 + (i % 3) * 0.2; b.sphere(r * 0.13, 0xffffff, { p: [Math.cos(a) * r * k, h * 0.86 + r * 0.55 * Math.sqrt(1 - k * k) - 0.02, Math.sin(a) * r * k], s: [1, 0.4, 1] }, 6, 3); }
    return b.geometry();
  });
}
function lampGeo10() {
  return cached('w10m:lamp', () => {
    const b = new Build();
    b.cyl(0.22, 0.3, 0.24, 0x6a4a3a, { p: [0, 0.12, 0] }, 7);
    const pts = [];
    for (let i = 0; i <= 6; i++) pts.push([Math.sin(i * 0.9) * 0.12, (i / 6) * 2.5, 0]);
    b.tube(pts, 0.07, 0xf2e6d0, null, 10, 5);
    return b.geometry();
  });
}
function lampGlowGeo10() {
  return cached('w10m:lampglow', () => {
    const b = new Build();
    b.dome(0.46, 0xffd88a, { p: [0, 2.5, 0], s: [1, 0.75, 1] }, PI / 2, 10, 4);
    b.sphere(0.16, 0xfff4c0, { p: [0, 2.32, 0] }, 6, 4);
    return b.geometry();
  });
}
function glowShroomGeo(s = 1) {
  return cached(`w10m:glowstem:${s}`, () => {
    const b = new Build();
    for (const [x, z, h] of [[0, 0, 0.9], [0.4, 0.25, 0.6], [-0.35, 0.3, 0.5], [0.15, -0.38, 0.45]]) b.cyl(0.05 * s, 0.07 * s, h * s, 0xe8f0e0, { p: [x * s, (h * s) / 2, z * s] }, 5, true);
    return b.geometry();
  });
}
function glowShroomCaps(s = 1, tone = 0) {
  return cached(`w10m:glowcap:${s}:${tone}`, () => {
    const b = new Build();
    const c = [0x9affc8, 0xa8d8ff, 0xffb8f0][tone % 3];
    for (const [x, z, h, r] of [[0, 0, 0.9, 0.3], [0.4, 0.25, 0.6, 0.22], [-0.35, 0.3, 0.5, 0.2], [0.15, -0.38, 0.45, 0.18]]) b.dome(r * s, c, { p: [x * s, h * s, z * s], s: [1, 0.6, 1] }, PI / 2, 8, 3);
    return b.geometry();
  });
}
function logGeo10(len = 3) {
  return cached(`w10m:log:${len}`, () => {
    const b = new Build();
    b.cyl(0.42, 0.46, len, { v: (x, y, z, nx, ny) => mix(0x6a4a32, 0x9a6a44, ny * 0.5 + 0.5) }, { p: [0, 0.42, 0], r: [0, 0, PI / 2] }, 9, true);
    for (const e of [-1, 1]) b.cyl(0.44, 0.44, 0.04, 0xd8b088, { p: [e * len / 2, 0.42, 0], r: [0, 0, PI / 2] }, 9);
    b.sphere(0.5, { v: (x, y, z, nx, ny) => mix(0x3e7a44, 0x6ab85a, ny * 0.5 + 0.5) }, { p: [len * 0.15, 0.78, 0], s: [1.6, 0.32, 0.9] }, 7, 3);
    for (let i = 0; i < 3; i++) { const g = smallShroomGeo(0.28, 0.2, 0xffc83a, 0xffffff, 0xf6ead4, true).clone(); g.translate(-len * 0.3 + i * 0.45, 0.8, 0.12); b.parts.push(g); }
    return b.geometry();
  });
}
function stumpGeo10(s = 1) {
  return cached(`w10m:stump:${s}`, () => {
    const b = new Build();
    b.cyl(0.62 * s, 0.78 * s, 0.9 * s, { v: (x, y, z, nx, ny) => (ny > 0.6 ? 0xd8b088 : mix(0x5a3e2a, 0x8a5e3e, y + 0.5)) }, { p: [0, 0.45 * s, 0] }, 9);
    const g = smallShroomGeo(0.3, 0.24, 0xe8443c, 0xffffff, 0xf6ead4, true).clone(); g.scale(s, s, s); g.translate(0.2 * s, 0.9 * s, 0.1 * s); b.parts.push(g);
    return b.geometry();
  });
}
function fernGeo10() {
  return cached('w10m:fern', () => {
    const b = new Build();
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; b.cone(0.18, 1.1, { v: (x, y) => mix(0x2e7a3a, 0x7ad06a, y + 0.5) }, { p: [Math.cos(a) * 0.32, 0.45, Math.sin(a) * 0.32], r: [Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7], s: [1, 1, 0.3] }, 4); }
    return b.geometry();
  });
}
function tuftGeo10() {
  return cached('w10m:tuft', () => {
    const b = new Build();
    for (let i = 0; i < 5; i++) { const a = i * 1.3; b.cone(0.06, 0.5, { v: (x, y) => mix(0x3e8a44, 0x9ae07a, y + 0.5) }, { p: [Math.cos(a) * 0.12, 0.24, Math.sin(a) * 0.12], r: [Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3] }, 3); }
    return b.geometry();
  });
}
function rockGeo10(s = 1) {
  return cached(`w10m:rock:${s}`, () => {
    const g = new THREE.IcosahedronGeometry(0.8 * s, 0);
    const pa = g.attributes.position;
    for (let i = 0; i < pa.count; i++) pa.setY(i, pa.getY(i) * 0.6);
    g.computeVertexNormals();
    const b = new Build();
    b.add(g, { v: (x, y, z, nx, ny) => mix(0x5a4a6a, 0x9a8ab0, ny * 0.5 + 0.5) }, { p: [0, 0.3 * s, 0] });
    return b.geometry();
  });
}
/** Pilzhäuschen: dicker Stiel mit Tür und Fenster, Hut als Dach, Schornstein. */
function houseGeo10(s = 1, cap = 0xe8443c) {
  return cached(`w10m:house:${s}:${cap}`, () => {
    const b = new Build();
    b.lathe([[1.0 * s, 0], [0.95 * s, 0.9 * s], [0.85 * s, 1.7 * s], [0.9 * s, 2.0 * s]], { v: (x, y) => mix(0xe8d8bc, 0xfaf2e2, y / (2 * s)) }, null, 14);
    b.dome(1.75 * s, { v: (x, y, z, nx, ny) => mix(mix(cap, 0x000000, 0.25), cap, ny * 0.9 + 0.1) }, { p: [0, 1.85 * s, 0], s: [1, 0.62, 1] }, PI / 2, 16, 5);
    for (let i = 0; i < 7; i++) { const a = i * 0.9; const k = 0.3 + (i % 3) * 0.22; b.sphere(0.2 * s, 0xffffff, { p: [Math.cos(a) * 1.75 * s * k, 1.85 * s + 1.08 * s * Math.sqrt(1 - k * k), Math.sin(a) * 1.75 * s * k], s: [1, 0.4, 1] }, 6, 3); }
    const door = new THREE.Shape(); door.moveTo(-0.32, 0); door.lineTo(-0.32, 0.65); door.absarc(0, 0.65, 0.32, PI, 0, true); door.lineTo(0.32, 0); door.lineTo(-0.32, 0);
    b.extrude(door, 0.1, 0x8a5a36, { p: [0, 0, 0.98 * s], s: [s, s, 1] }, 0.02, 8);
    b.sphere(0.04 * s, 0xffd23a, { p: [0.18 * s, 0.55 * s, 1.05 * s] }, 5, 3);
    b.cyl(0.13 * s, 0.13 * s, 0.8 * s, 0x8a6a5a, { p: [0.9 * s, 2.7 * s, -0.3 * s] }, 6);
    return b.geometry();
  });
}
function houseGlowGeo10(s = 1) {
  return cached(`w10m:houseglow:${s}`, () => {
    const b = new Build();
    b.add(new THREE.CircleGeometry(0.24 * s, 12), 0xffe08a, { p: [-0.5 * s, 1.15 * s, 0.86 * s], r: [0, -0.45, 0] });
    return b.geometry();
  });
}

export function pilzPropGeo(it, seed) {
  const s = it.size;
  switch (it.kind) {
    case 'shroom10': { const sz = s ?? 1; return smallShroomGeo(+(0.7 * sz).toFixed(2), +(0.45 * sz).toFixed(2), SHROOM_COLORS[it.color] ?? 0xe8443c, it.spots === false ? null : 0xffffff).clone(); }
    case 'shrooms10': {
      const b = new Build();
      const cols = [SHROOM_COLORS[it.color] ?? 0xe8443c, 0xffc83a, 0xf4ece0];
      for (let i = 0; i < 4; i++) { const a = i * 1.7 + (seed % 7); const k = i ? 0.45 : 0; const g = smallShroomGeo(0.5 - i * 0.07, 0.34 - i * 0.04, cols[i % 3], 0xffffff).clone(); g.scale(s ?? 1, s ?? 1, s ?? 1); g.translate(Math.cos(a) * k * (s ?? 1), 0, Math.sin(a) * k * (s ?? 1)); b.parts.push(g); }
      return b.geometry();
    }
    case 'glowshroom10': return glowShroomGeo(s ?? 1).clone();
    case 'lamp10': return lampGeo10().clone();
    case 'log10': return logGeo10(s ?? 3).clone();
    case 'stump10': return stumpGeo10(s ?? 1).clone();
    case 'fern10': return fernGeo10().clone();
    case 'tuft10': return tuftGeo10().clone();
    case 'rock10': return rockGeo10(s ?? 1).clone();
    case 'house10': return houseGeo10(s ?? 1, SHROOM_COLORS[it.color] ?? 0xe8443c).clone();
    case 'giant10': case 'bigshroom10': return bigShroomGeo(s ?? 5, (s ?? 5) * 0.5, SHROOM_COLORS[it.color] ?? 0xe8443c, seed % 5).clone();
    default: return null;
  }
}
export function pilzPropGlow(it) {
  switch (it.kind) {
    case 'glowshroom10': return glowShroomCaps(it.size ?? 1, it.tone ?? 0).clone();
    case 'lamp10': return lampGlowGeo10().clone();
    case 'house10': return houseGlowGeo10(it.size ?? 1).clone();
    default: return null;
  }
}
export function pilzPropShape(it) {
  const [x, y, z] = it.pos, s = it.size ?? 1;
  switch (it.kind) {
    case 'shroom10': return { type: 'cyl', x, z, r: 0.35 * s, y0: y, y1: y + 0.9 * s, tag: 'pilz' };
    case 'shrooms10': return { type: 'cyl', x, z, r: 0.6 * s, y0: y, y1: y + 0.7 * s, tag: 'pilze' };
    case 'lamp10': return { type: 'cyl', x, z, r: 0.3, y0: y, y1: y + 2.9, tag: 'laterne' };
    case 'log10': return { type: 'box', min: [x - (s ?? 3) / 2, y, z - 0.45], max: [x + (s ?? 3) / 2, y + 0.9, z + 0.45], tag: 'stamm' };
    case 'stump10': return { type: 'cyl', x, z, r: 0.75 * s, y0: y, y1: y + 0.9 * s, tag: 'stumpf' };
    case 'rock10': return { type: 'cyl', x, z, r: 0.7 * s, y0: y, y1: y + 0.7 * s, tag: 'stein' };
    case 'house10': return { type: 'cyl', x, z, r: 1.05 * s, y0: y, y1: y + 3 * s, tag: 'pilzhaus' };
    case 'giant10': case 'bigshroom10': return { type: 'cyl', x, z, r: 0.32 * (s ?? 5) * 0.5, y0: y, y1: y + (s ?? 5), tag: 'riesenpilz' };
    default: return null;
  }
}
/** Registry-Kulisse für Requisiten der Welt Pilz: [Name, Optionen, yaw-Korrektur, Maßstab] oder null. */
export function pilzPropModel(it) {
  const spec = {
    giant10: ['riesenpflanze', { kind: 'pilz', ...(it.size ? { size: it.size } : {}) }, FRONT, 1, 4800],
  }[it.kind];
  if (!spec) return null;
  const [name, opts, yawFix, scale, max] = spec;
  if (!MK10.has(name, opts, max)) return null;
  MK10.used.add(name);
  return [name, opts, yawFix, scale];
}

// ------------------------------------------------------------------ Streudeko, Riesenpilze im Meer

export function scatterPilz(level, map, grid) {
  const view = level.view;
  if (view) {
    for (const [i, gi] of (map.giants ?? []).entries()) {
      const [x, z] = gi.pos;
      const top = gi.top ?? 14, r = gi.r ?? 6;
      const cap = SHROOM_COLORS[gi.color] ?? [0xe8443c, 0x9a5ae0, 0xff8a3a, 0x4a7ae8][i % 4];
      const b = new Build();
      b.lathe([[r * 0.34, 0], [r * 0.28, (top + 1) * 0.3], [r * 0.26, (top + 1) * 0.7], [r * 0.3, top + 1]], { v: (px, py) => mix(0xd8c8ac, 0xfaf2e2, py / (top + 1)) }, { p: [0, -1, 0] }, 12);
      b.dome(r, { v: (px, py, pz, nx, ny) => mix(mix(cap, 0x000000, 0.3), cap, ny * 0.9 + 0.1) }, { p: [0, top - 0.4, 0], s: [1, 0.52, 1] }, PI / 2, 18, 6);
      b.cyl(r * 0.97, r * 0.32, 0.2, 0xf0e0c4, { p: [0, top - 0.42, 0] }, 16);
      const spots = gi.spots ?? 7;
      for (let k = 0; k < spots; k++) { const a = k * 2.39 + i; const kk = 0.25 + (k % 3) * 0.25; b.sphere(r * 0.12, 0xffffff, { p: [Math.cos(a) * r * kk, top - 0.4 + r * 0.52 * Math.sqrt(1 - kk * kk), Math.sin(a) * r * kk], s: [1, 0.35, 1] }, 6, 3); }
      const g = b.geometry();
      g.translate(x, 0, z);
      view.addStatic(g, { castShadow: false, tile: 'w10:riesenpilze' });
      const f = new Build();
      f.add(new THREE.RingGeometry(r * 0.36, r * 0.52, 14, 1).rotateX(-PI / 2), 0xe8eeff, { p: [x, (map.sea ?? 0) + 0.04, z] });
      view.addStatic(f.geometry(), { material: 'glow', castShadow: false, tile: GLOW_TILE10 });
    }
  }
  pilzRims(level, map, grid);
}

// ------------------------------------------------------------------ Inselchen, Nachbarwelten

/** Kleiner Fels im Abendmeer mit einem Pilzgrüppchen. */
export function pilzIsletParts(x, z, w, d, top, rnd) {
  const parts = [];
  const r = Math.min(w, d) * 0.4;
  const g = new THREE.IcosahedronGeometry(r, 1);
  const pa = g.attributes.position;
  for (let i = 0; i < pa.count; i++) { const k = 0.8 + hash2(pa.getX(i) * 3 + x, pa.getZ(i) * 3 + z) * 0.3; pa.setXYZ(i, pa.getX(i) * k, pa.getY(i) * k * 0.45, pa.getZ(i) * k); }
  g.computeVertexNormals();
  const rock = colorize(g.index ? g.toNonIndexed() : g, (p, n, o) => mixc(lin(0x3e3258), lin(0x8a7aa8), smooth(-0.5, 0.9, n.y), o));
  rock.translate(x, 0.2, z);
  parts.push(rock);
  const cols = [0xe8443c, 0xffc83a, 0x9a5ae0, 0xf4ece0];
  const n = 1 + rnd.int(0, 2);
  for (let i = 0; i < n; i++) {
    const h = rnd.real(0.8, 1.8);
    const sg = smallShroomGeo(+h.toFixed(1), +(h * 0.55).toFixed(1), cols[rnd.int(0, 3)], 0xffffff).clone();
    sg.translate(x + rnd.real(-r * 0.4, r * 0.4), 0.2 + r * 0.3, z + rnd.real(-r * 0.4, r * 0.4));
    parts.push(sg);
  }
  void top;
  return parts;
}

/**
 * Nachbarwelten am Horizont der Welt Pilz: 'sternfern' (Welt Stern hoch am Abendhimmel: schwebende Sterneninseln mit Regenbogen,
 * Ringplanet) und 'pilzfern' (der Pilzwald-Archipel, von der Welt Blume aus gesehen). Ein Mesh je Nachbarwelt.
 */
export function pilzNeighborParts(nb, rnd) {
  const [x, z] = nb.pos;
  const [w, d] = nb.size ?? [70, 50];
  const B = new Build();
  if (nb.style === 'sternfern') {
    const y = nb.y ?? 60;
    for (const [dx, dz, s, c] of [[0, 0, 1, 0x7a68d0], [-0.38, 0.22, 0.6, 0xffb4d0], [0.34, -0.18, 0.7, 0x6a5ac8]]) {
      const px = x + dx * w, pz = z + dz * d, py = y + dz * 20;
      B.box(w * 0.32 * s, 4 * s, d * 0.34 * s, { v: (qx, qy, qz, nx, ny) => (ny > 0.5 ? c : mix(c, 0x2a2060, 0.4)) }, { p: [px, py, pz] }, 0.5);
      B.cone(w * 0.16 * s, 14 * s, { v: (qx, qy) => mix(0x2a2060, 0x6a5ab8, qy / (14 * s) + 0.5) }, { p: [px, py - 9 * s, pz], r: [PI, 0, 0] }, 7);
    }
    const RAIN = [0xff4a5e, 0xff9a2e, 0xffe03a, 0x5ad84a, 0x3ac8ff, 0xb05aff];
    RAIN.forEach((c, k) => B.torus(w * 0.42 - k * 1.2, 0.55, c, { p: [x, y + 4, z] }, 4, 24, PI));
    B.sphere(9, { v: (qx, qy) => mix(0xffb0d8, 0xfff6c8, qy / 18 + 0.5) }, { p: [x + w * 0.55, y + 26, z - d * 0.3] }, 14, 10);
    B.torus(15, 1.0, 0xfff0c8, { p: [x + w * 0.55, y + 26, z - d * 0.3], r: [PI / 2 - 0.4, 0, 0.3] }, 4, 28);
  } else if (nb.style === 'pilzfern') {
    const caps = [0xe8443c, 0x9a5ae0, 0xff8a3a, 0x3c3ea0];
    for (let i = 0; i < 7; i++) {
      const px = x + rnd.real(-0.45, 0.45) * w, pz = z + rnd.real(-0.4, 0.4) * d;
      const h = rnd.real(10, 24), r = rnd.real(6, 12);
      B.cyl(r * 0.28, r * 0.34, h, { v: (qx, qy) => mix(0xd8c8ac, 0xfaf2e2, qy / h + 0.5) }, { p: [px, h / 2 - 1, pz] }, 9, true);
      B.dome(r, caps[i % caps.length], { p: [px, h - 1.5, pz], s: [1, 0.5, 1] }, PI / 2, 12, 4);
    }
  } else return [];
  return [B.geometry()];
}

// ------------------------------------------------------------------ Lebendige Kulisse

const _c = new THREE.Color();
const FIREFLY = [0xd8ff8a, 0xfff0a0, 0xa8f0ff];

/**
 * Bewegte Kulisse der Welt Pilz (MapBuilder: out.life, je Bild update; state().decor über liveInfo):
 *   Puls-Material 'bglow'  Leuchtpilze, Laternen, Tupfen – je Zählzeit der Kartenmusik heller Aufschein (beatPulse)
 *   Glühwürmchen           map.fireflies { perIsland, seed } – eine Instanz-Fläche, schweben in Schleifen um die Hüte; je
 *                          Zählzeit leuchtet eine von drei Gruppen hell auf
 */
export class PilzLife {
  constructor(level, map) {
    this.view = level.view;
    this.map = map;
    this.own = [];
    this.mat = bonusGlow(this.view);
    this.buildFireflies(map.fireflies ?? {});
    this.shown = null;
    this.update(0, 0);
  }

  buildFireflies(spec) {
    const rnd = new Rnd(0xf1ef + (spec.seed ?? 0));
    this.flies = [];
    for (const b of this.map.ground ?? []) {
      if (!b.walk) continue;
      const [x0, z0, x1, z1] = b.rect;
      const n = spec.perIsland ?? 10;
      for (let i = 0; i < n; i++) {
        const x = rnd.real(x0 - 2, x1 + 2), z = rnd.real(z0 - 2, z1 + 2);
        this.flies.push({ x, y: b.top + rnd.real(0.8, 3.6), z, r: rnd.real(0.6, 1.8), sp: rnd.real(0.3, 0.8) * (i & 1 ? 1 : -1), ph: rnd.real(0, TAU), c: FIREFLY[i % 3] });
      }
    }
    const g = cached('w10m:firefly', () => new THREE.IcosahedronGeometry(0.09, 0));
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: true, toneMapped: false });
    this.own.push(mat);
    this.fly = new THREE.InstancedMesh(g, mat, Math.max(1, this.flies.length));
    this.fly.frustumCulled = false;
    this.fly.name = 'w10:gluehwuermchen';
    this.flies.forEach((f, i) => this.fly.setColorAt(i, _c.set(f.c)));
    this.fly.count = this.flies.length;
    this.view.add(this.fly);
    this.own.push(this.fly);
  }

  /** Stellung der Taktuhr: Gruppe (0..2) je Zählzeit, Puls k am Taktschlag. */
  glowState(t = this.view.time) {
    const b = BEAT10.at(t);
    return { beat: +b.beat.toFixed(3), step: ((b.whole % 3) + 3) % 3, k: +b.k.toFixed(4), source: b.source, theme: b.theme, bpm: b.bpm };
  }

  update(dt, t) {
    const gs = this.glowState(t);
    this.info = gs;
    if (this.mat) this.mat.color.setScalar(0.45 + 0.7 * gs.k);
    const cam = this.view.camera?.position, tg = this.view.rig?.target;
    const far = !!(cam && tg && cam.distanceTo(tg) > 45);
    this.fly.visible = !far;
    if (!far) {
      this.flies.forEach((f, i) => {
        const lit = i % 3 === gs.step;
        const a = f.ph + t * f.sp;
        setInst(this.fly, i, f.x + Math.cos(a) * f.r, f.y + Math.sin(t * 1.3 + f.ph) * 0.35, f.z + Math.sin(a * 1.3) * f.r, 0, lit ? 0.9 + gs.k * 1.1 : 0.7);
        _c.set(f.c).multiplyScalar(lit ? 0.8 + gs.k * 0.6 : 0.55);
        this.fly.setColorAt(i, _c);
      });
      this.fly.instanceMatrix.needsUpdate = true;
      if (this.fly.instanceColor) this.fly.instanceColor.needsUpdate = true;
    }
    this.shown = { step: gs.step, k: gs.k, scalar: +(0.45 + 0.7 * gs.k).toFixed(4) };
  }

  liveInfo() {
    return {
      glow: { ...this.glowState(), shown: this.shown, material: !!this.mat },
      fireflies: { n: this.flies.length, visible: this.fly.visible },
      ...MK10.info(),
    };
  }

  dispose() {
    for (const o of this.own) { if (o.isObject3D) o.parent?.remove(o); o.dispose?.(); }
    this.own.length = 0;
  }
}

// ------------------------------------------------------------------ Anmeldung

registerKit('pilz', {
  name: 'pilz', tag: 'w10', glowTile: GLOW_TILE10, sea: 'meer', foam: false,
  ground: pilzGround, segment: buildPilzSegment, scatter: scatterPilz, edgeGeo: pilzEdgeGeo,
  propGeo: pilzPropGeo, propGlow: pilzPropGlow, propShape: pilzPropShape, propModel: pilzPropModel,
  Life: PilzLife, isletParts: pilzIsletParts, neighborParts: pilzNeighborParts, mats: bonusGlow,
});
void mark; void inView; void vcol;
