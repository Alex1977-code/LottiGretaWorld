// Gelände, Ränder, Brücken, Requisiten, Streudeko und lebendige Kulisse der Karte der Bonuswelt Blume „Blumen-Remix“ (Welt 11;
// eigene Gestaltung, Spielzeug-Look wie Welt 1–10): ein riesiger Blumengarten über einem Seerosenteich – die Inseln sind die
// Blütenblätter riesiger Blumen (je ein Blatt auf grünem Kelch und Stängel), verbunden durch Gießkannen-Brücken (Zinkrinne mit
// Brause, aus der Tropfen in den Teich regnen) und Stängel-Brücken (liegender Blumenstängel mit Blättern). Jedes Blütenblatt
// trägt eine verkleinerte, „geremixte“ Erinnerung an das Basislevel (Kulissen: decor_blume.js); Schmetterlinge flattern im
// Takt der Kartenmusik, Blütenblätter segeln herab, im Teich treiben Seerosenblätter, ringsum stehen Riesenblumen.
//
// Geländestile (map.ground[].style), alle als Blütenblatt (flache Decke mit Adern und hellem Herz, gewellter Rand, der sich
// leicht aufwölbt, grüner Kelch und Stängel bis in den Teich): 'petal_rose' (Standard, Ankunft), 'petal_red' (B-1),
// 'petal_blue' (B-2), 'petal_yellow' (B-5), 'petal_violet' (Nacht, B-3), 'petal_orange' (B-4), 'petal_gray' (Schwarz-Weiß,
// B-6), 'petal_teal' (B-7), 'petal_pink' (B-8), 'petal_sand' (Strand, B-9), 'petal_honey' (B-10), 'petal_night' (B-11),
// 'petal_star' (Nachthimmel mit Sternen, B-12), 'petal_white' (Weiß-Gold, Röhre zur Welt Krone). Block-Feld tip: 'N'|'S'|'E'|'W'
// (Blattspitze ragt über den Rand hinaus).
// Ränder: 'blumenhedge' (Blütenhecke), 'blumenrail' (weißer Gartenzaun); an Rändern zum Teich setzt blumeRims einen Kranz
// kleiner Tulpen und Gänseblümchen (Blütenmitten im Puls-Material). Brücken (segments, Kollision wie `bridge`): 'canbridge',
// 'stembridge11'. Requisiten (map.props): 'tulip11', 'daisy11', 'flowers11', 'bush11', 'lamp11' (Glockenblumen-Laterne),
// 'can11' (Gießkanne), 'gnome11' (Gartenzwerg), 'bench11', 'tree11' (Registry 'kirschbaum'), 'pastel11' (Registry
// 'pastell_blume'), 'sunflower11'. Riesenblumen im Teich: map.blooms [{ pos: [x, z], top, r, color }] (nur Optik).
// Lebendige Kulisse (BlumeLife): Blütenmitten und Laternen im Puls-Material 'bglow' (je Zählzeit der Kartenmusik heller,
// Ersatzuhr im Tempo von course_worldblume_map), Schmetterlinge (zwei Instanz-Flächen: Flügel links/rechts; je Zählzeit ein
// kräftiger Flügelschlag, eine von drei Gruppen hebt ab), segelnde Blütenblätter um den Blickpunkt, Wassertropfen aus den Brausen.
// Thema 'map_blume': heller Morgenhimmel Blau → Pfirsich, warme Sonne, ferne Blumenhügel und Riesenblumen am Horizont.

import * as THREE from 'three';
import { THEMES } from '../view/themes.js';
import { alignedGrid } from '../blocks/kit.js';
import { buildBridge } from '../blocks/types/bridge.js';
import { Rnd } from '../../three/world/geometry.js';
import {
  registerKit, Build, place, mix, TAU, cached, lin, mixc, smooth, colorize, PI, FRONT, hash2, tone, flat,
  beatClock, bonusGlow, profileParts, ringPts, ringStrip, stemGeo, edgeRuns, spanOf, placeAlong, worldAlong, alongAt, modelKit,
  setInst, mergeParts,
} from './bonuskit.js';

export const BLUME_MUSIC = 'course_worldblume_map';
export const BEAT11 = beatClock(BLUME_MUSIC);
export const MK11 = modelKit('w11');
export const GLOW_TILE11 = MK11.glowTile;

// ------------------------------------------------------------------ Thema

if (!THEMES.map_blume) {
  THEMES.map_blume = {
    ...THEMES.grass,
    label: 'Weltkarte Blumen-Remix',
    sky: [[1, 0x3a8ae8], [0.5, 0x64b4f8], [0.2, 0xa8dcff], [0.06, 0xffe0e8], [0, 0xffd8c0], [-0.1, 0xd8c8e0], [-1, 0x9ab8d8]],
    background: 0xf0dce8,
    fog: { color: 0xf4e0ea, near: 110, far: 430 },
    hemi: { sky: 0xe8f4ff, ground: 0x8ab868, intensity: 1.4 },
    sun: { color: 0xfff0d8, intensity: 2.6, dir: [-0.45, 1, 0.5] },
    ground: null,
    clouds: false,
    sunDisc: true,
    backdrop: 'blume11',
    grassTop: 0x7ad85a, grassTop2: 0x6ccc50, grassRim: 0xb0f088, grassSide: 0x4aa040,
    dirt: 0x9a7a5a, dirtDeep: 0x6a5240, rock: 0x9a8aa8, rockDeep: 0x6a5a7a,
    stone: 0xf6f0f4, stoneDark: 0xc8bcc8,
    wood: 0xf6f4ef, woodDark: 0xc9ccd6,
    water: 0x6ad8c8, waterDeep: 0x2a8aa8,
    buildBackdrop(sky, bounds, rnd) { blumeBackdrop(sky, bounds, rnd); },
  };
}

/** Ferne Blumenhügel und Riesenblumen am Horizont (unbeleuchtet, im Dunst). */
function blumeBackdrop(sky, bounds, rnd) {
  const parts = [];
  const x0 = bounds.min.x, x1 = bounds.max.x, z0 = bounds.min.z, z1 = bounds.max.z;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const R0 = Math.max(x1 - x0, z1 - z0) / 2 + 170;
  const heads = [0xff7ab4, 0xffd23a, 0xb07af0, 0xff8a5a, 0x7ac8ff, 0xffffff];
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * TAU + rnd.real(-0.06, 0.06);
    const r = R0 + rnd.real(-10, 60);
    const bx = cx + Math.cos(a) * r, bz = cz + Math.sin(a) * r;
    // Hügel
    const hill = new THREE.SphereGeometry(rnd.real(30, 46), 12, 6, 0, TAU, 0, PI / 2);
    hill.scale(1, rnd.real(0.35, 0.6), 1);
    hill.translate(bx, -4, bz);
    parts.push(colorize(hill, (p, n, o) => mixc(lin(0x6ab878), lin(0xb0e0a0), smooth(-0.2, 0.9, n.y), o)));
    if (i % 2 === 0) {
      const h = rnd.real(26, 52), hr = rnd.real(8, 15);
      const st = new THREE.CylinderGeometry(0.9, 1.4, h, 6, 1, true);
      st.translate(bx, h / 2 - 4, bz);
      parts.push(colorize(st, (p, n, o) => mixc(lin(0x4a9a5a), lin(0x8ad07a), 0.5, o)));
      const c0 = lin(heads[(i / 2) % heads.length]);
      for (let k = 0; k < 6; k++) {
        const pa = (k / 6) * TAU;
        const pg = new THREE.SphereGeometry(hr * 0.55, 8, 5);
        pg.scale(1, 0.3, 0.55);
        pg.rotateY(-pa);
        pg.translate(bx + Math.cos(pa) * hr * 0.6, h - 4, bz + Math.sin(pa) * hr * 0.6);
        parts.push(colorize(pg, (p, n, o) => mixc(mixc(c0, [1, 1, 1], 0.25, [0, 0, 0]), c0, 0.5, o)));
      }
      const cg = new THREE.SphereGeometry(hr * 0.35, 8, 5);
      cg.scale(1, 0.5, 1);
      cg.translate(bx, h - 3.6, bz);
      parts.push(colorize(cg, (p, n, o) => mixc(lin(0xffb020), lin(0xffe07a), 0.5, o)));
    }
  }
  const g = mergeParts(parts);
  if (g) {
    const mesh = new THREE.Mesh(sky.track(g), sky.track(new THREE.MeshBasicMaterial({ vertexColors: true, fog: true })));
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    mesh.name = 'w11:hintergrund';
    sky.group.add(mesh);
  }
}

// ------------------------------------------------------------------ Farben der Blütenblätter

// top: Blatt (Herz hell, Spitze kräftig), vein: Adern, rim: Randwulst, under: Unterseite, sepal: Kelch, stem: Stängel,
// gray: Schwarz-Weiß (Kelch/Stängel grau), stars: Sternenmuster (B-12), sand: Sand statt Adern (Strand), hex: Waben
export const PETALS11 = {
  petal_rose: { top: [0xffc4de, 0xff8ac0], vein: 0xf47ab0, rim: 0xff8ac0, under: 0xf8d0e0 },
  petal_red: { top: [0xffb4aa, 0xff5050], vein: 0xe03a44, rim: 0xf04a50, under: 0xf8c8c4 },
  petal_blue: { top: [0xc0dcff, 0x6aa8ff], vein: 0x5a94e8, rim: 0x6aa8f8, under: 0xd0e0f8 },
  petal_yellow: { top: [0xfff0a0, 0xffc82a], vein: 0xf0b020, rim: 0xffc82a, under: 0xfff0c0 },
  petal_violet: { top: [0x8a6ad8, 0x4a3a9a], vein: 0x3a2a7a, rim: 0x5a48b0, under: 0x8a7ac0 },
  petal_orange: { top: [0xffcfa4, 0xff8a3a], vein: 0xf07a2a, rim: 0xff8a3a, under: 0xf8d8c0 },
  petal_gray: { top: [0xf0f0f0, 0x9a9a9a], vein: 0x6a6a6a, rim: 0x8a8a8a, under: 0xc8c8c8, gray: true },
  petal_teal: { top: [0xbaf2e2, 0x4ad0b8], vein: 0x2ab89a, rim: 0x3ac8a8, under: 0xc8f0e4 },
  petal_pink: { top: [0xffbeea, 0xff60c8], vein: 0xe04ab0, rim: 0xf05ac0, under: 0xf8c8e8 },
  petal_sand: { top: [0xfff2d0, 0xf4d898], vein: 0xe8c47a, rim: 0xf0cc88, under: 0xf8e8c8, sand: true },
  petal_honey: { top: [0xfff4c0, 0xffb82a], vein: 0xe89a18, rim: 0xffaa28, under: 0xfff0b8, hex: true },
  petal_night: { top: [0x5a4aa8, 0x2a2a6a], vein: 0x1e1e52, rim: 0x3a3488, under: 0x6a62a8 },
  petal_star: { top: [0x3a3a9a, 0x1a1a4a], vein: 0x12123a, rim: 0x2a2a78, under: 0x5a5aa8, stars: true },
  petal_white: { top: [0xffffff, 0xfff0c0], vein: 0xf0d080, rim: 0xffe8a0, under: 0xf8f0d8, gold: true },
};
const GREEN = { sepal: [0x3e9a4a, 0x7ad06a], stem: [0x3a8a44, 0x6ac05a] };
const GRAYG = { sepal: [0x6a6a6a, 0xb0b0b0], stem: [0x5a5a5a, 0x9a9a9a] };

// ------------------------------------------------------------------ Blütenblatt-Insel

const MARGIN = 1.2;
const TIP_A = { E: 0, S: PI / 2, W: PI, N: -PI / 2 };

/**
 * Gelände-Block der Welt Blume als Blütenblatt: flache Decke (Herz hell → Spitze kräftig, Adern), gewellter Rand mit leichter
 * Aufwölbung, Unterseite, grüner Kelch (fünf Kelchblätter) und Stängel bis in den Teich.
 */
export function blumeGround(b, base, theme, rnd, map) {
  const st = b.style ?? 'petal_rose';
  const P = PETALS11[st] ?? PETALS11.petal_rose;
  const G = P.gray ? GRAYG : GREEN;
  const [x0, z0, x1, z1] = b.rect;
  const top = b.top, hw = (x1 - x0) / 2, hd = (z1 - z0) / 2, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const m = b.margin ?? MARGIN, R = Math.min(6, 0.5 * Math.min(hw, hd) + m);
  const tipA = b.tip ? TIP_A[b.tip] : null;
  const tipLen = b.tipLen ?? 0.32 * Math.min(hw, hd);
  // Wellen am Rand und Blattspitze
  const wob = (a) => Math.sin(a * 7 + cx) * 0.25 + (tipA === null ? 0 : tipLen * Math.pow(Math.max(0, Math.cos(a - tipA)), 8));
  const tA = lin(P.top[0]), tB = lin(P.top[1]), vein = lin(P.vein), rimC = lin(P.rim), under = lin(P.under);
  const maxR = Math.hypot(hw + m, hd + m);
  const topCol = (p) => {
    const d = Math.min(1, Math.hypot(p[0] - cx, p[2] - cz) / maxR);
    return mixc(tA, tB, smooth(0.15, 1, d), [0, 0, 0]);
  };
  const prof = profileParts(b, [
    { o: 0, R: 0, dy: 0, col: topCol },
    { o: m, R, dy: 0, col: topCol, wob },
    { o: m + 0.45, R: R + 0.45, dy: 0.22, col: (p) => mixc(topCol(p), rimC, 0.5, [0, 0, 0]), wob },
    { o: m + 0.75, R: R + 0.75, dy: 0.05, col: rimC, wob, up: 0.4 },
    { o: m + 0.82, R: R + 0.82, dy: -0.3, col: mixc(rimC, under, 0.5, [0, 0, 0]), wob, up: -0.3 },
    { o: m + 0.55, R: R + 0.55, dy: -0.62, col: under, wob, up: -1.2 },
  ], 80);
  const out = [flat(prof.parts[0])];
  for (const g of prof.parts.slice(1)) out.push(g);
  // Unterseite: von der Unterkante zur Kelchmitte
  const lip = prof.rings[prof.rings.length - 1];
  const rs = b.stemR ?? Math.max(1.1, 0.16 * Math.min(hw, hd));
  const inner = ringPts(cx, cz, 0, 0, rs * 2.2, rs * 2.2, top - 1.0, 80);
  out.push(flat(ringStrip(lip, inner, under, mixc(under, lin(G.sepal[0]), 0.5, [0, 0, 0]), () => [0, -1, 0])));
  // Decke im Block: Herz hell, Adern (Streifen entlang der langen Achse) bzw. Sand/Waben/Sterne
  const along = hw >= hd ? 'x' : 'z';
  out.push(flat(alignedGrid(x0, z0, x1, z1, top, P.sand ? 2 : 1, (i, j, ax, az) => {
    const px = ax + 0.5, pz = az + 0.5;
    const o = topCol([px, top, pz]);
    if (P.sand) return mixc(o, lin(0xffffff), hash2(ax * 1.3, az * 0.9) * 0.12, o);
    const q = along === 'x' ? pz - cz : px - cx;
    const lane = Math.abs(((q / 2.2) % 1 + 1) % 1 - 0.5);
    if (lane < 0.06 && !P.hex) mixc(o, vein, 0.35, o);
    return mixc(o, [1, 1, 1], hash2(ax, az) * 0.05, o);
  })));
  if (P.stars) {
    const sb = new Build();
    for (let i = 0; i < Math.round((hw * hd) / 6); i++) {
      const px = rnd.real(x0 + 0.5, x1 - 0.5), pz = rnd.real(z0 + 0.5, z1 - 0.5), s = rnd.real(0.08, 0.22);
      sb.add(new THREE.CircleGeometry(s, 5).rotateX(-PI / 2), i % 4 ? 0xfff4c0 : 0xa8e0ff, { p: [px, top + 0.012, pz] });
    }
    out.push(flat(sb.geometry(), 'bglow', GLOW_TILE11));
  }
  if (P.gold) {
    const gb = new Build();
    for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; gb.add(new THREE.RingGeometry(0.3, 0.42, 10).rotateX(-PI / 2), 0xffd23a, { p: [cx + Math.cos(a) * hw * 0.8, top + 0.012, cz + Math.sin(a) * hd * 0.8] }); }
    out.push(flat(gb.geometry()));
  }
  // Kelch (fünf Kelchblätter) und Stängel bis in den Teich
  if (b.stem !== false) {
    const sea = map?.sea ?? 0;
    const kb = new Build();
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * TAU + cx * 0.1;
      kb.sphere(rs * 1.8, { v: (px, py, pz, nx, ny) => mix(G.sepal[0], G.sepal[1], ny * 0.5 + 0.5) }, { p: [cx + Math.cos(a) * rs * 1.3, top - 2.5, cz + Math.sin(a) * rs * 1.3], s: [1, 0.26, 0.5], r: [0, -a, 0.3] }, 8, 5);
    }
    out.push(kb.geometry());
    const s0 = lin(G.stem[0]), s1 = lin(G.stem[1]);
    const yTop = top - 1.2, yBot = sea - 1.2, H = yTop - yBot;
    out.push(stemGeo(cx, cz, rs, yBot, yTop, { v: (px, py, pz, nx) => mixc(s0, s1, Math.abs(nx) * 0.4 + smooth(0, H, py) * 0.3, [0, 0, 0]) }, { seg: 12, bulge: 0.08, flare: 0.15 }));
    // ein Blatt am Stängel und ein Schaumring im Teich
    const lb = new Build();
    const la = hash2(cx, cz) * TAU;
    lb.sphere(rs * 3.2, { v: (px, py, pz, nx, ny) => mix(G.sepal[0], G.sepal[1], ny * 0.5 + 0.5) }, { p: [cx + Math.cos(la) * rs * 3, yBot + H * 0.45, cz + Math.sin(la) * rs * 3], s: [1, 0.12, 0.42], r: [0, -la, 0.4] }, 8, 4);
    out.push(lb.geometry());
    const foam = new Build();
    foam.add(new THREE.RingGeometry(rs * 1.25, rs * 1.8, 16, 1).rotateX(-PI / 2), 0xf0fff8, { p: [cx, sea + 0.04, cz] });
    out.push(flat(foam.geometry(), 'glow', GLOW_TILE11));
  }
  void base; void theme;
  return out;
}

// ------------------------------------------------------------------ kleine Blumen, Ränder

/** Tulpe (Fußpunkt im Ursprung), Blüte im Licht; gecacht. */
export function tulipGeo(h = 0.6, color = 0xff5a6a, lo = true) {
  return cached(`w11m:tulip:${h}:${color}:${lo ? 1 : 0}`, () => {
    const b = new Build();
    b.cyl(0.025, 0.03, h, 0x3e9a4a, { p: [0, h / 2, 0] }, lo ? 4 : 6, true);
    b.sphere(0.06, 0x5ab84a, { p: [0.08, h * 0.35, 0], s: [1.6, 0.4, 0.8], r: [0, 0, 0.6] }, 5, 3);
    b.cyl(0.13, 0.07, 0.22, { v: (px, py) => mix(mix(color, 0x000000, 0.2), color, py * 3 + 0.5) }, { p: [0, h + 0.08, 0] }, lo ? 5 : 7);
    for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU; b.cone(0.06, 0.12, color, { p: [Math.cos(a) * 0.08, h + 0.22, Math.sin(a) * 0.08] }, 4); }
    return b.geometry();
  });
}
/** Gänseblümchen: Stiel, weiße Blätter (Licht), gelbe Mitte (getrennt: Puls-Material). */
export function daisyGeo(h = 0.4, petal = 0xffffff) {
  return cached(`w11m:daisy:${h}:${petal}`, () => {
    const b = new Build();
    b.cyl(0.02, 0.025, h, 0x3e9a4a, { p: [0, h / 2, 0] }, 4, true);
    for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; b.add(new THREE.PlaneGeometry(0.16, 0.08).rotateX(-PI / 2 + 0.25), petal, { p: [Math.cos(a) * 0.1, h + 0.02, Math.sin(a) * 0.1], r: [0, -a, 0] }); }
    return b.geometry();
  });
}
export function daisyCenterGeo(h = 0.4) {
  return cached(`w11m:daisyc:${h}`, () => { const b = new Build(); b.sphere(0.055, 0xffc81a, { p: [0, h + 0.04, 0], s: [1, 0.6, 1] }, 5, 3); return b.geometry(); });
}
const FLOWER_COLORS = { rot: 0xff4a5a, rosa: 0xff8ac8, gelb: 0xffd23a, lila: 0xb07af0, blau: 0x6aa8ff, orange: 0xff8a3a, weiss: 0xffffff };

/** Blütenhecke (entlang +X): runde grüne Hecke mit bunten Blüten. */
function blumeHedgeGeo(len, seed = 1) {
  const b = new Build();
  b.box(len, 0.55, 0.75, { v: (x, y, z, nx, ny) => (ny > 0.5 ? 0x6ac05a : 0x3e8a44) }, { p: [0, 0.27, 0] }, 0.2);
  const n = Math.max(1, Math.round(len / 0.6));
  const cols = [0xff5a6a, 0xffd23a, 0xff8ac8, 0xb07af0];
  for (let i = 0; i < n; i++) b.sphere(0.12, cols[(i + seed) % 4], { p: [-len / 2 + (i + 0.5) * (len / n), 0.58, ((i * 5 + seed) % 3 - 1) * 0.2], s: [1, 0.6, 1] }, 5, 3);
  return b.geometry();
}
/** Weißer Gartenzaun (entlang +X) mit runden Latten. */
function blumeRailGeo(len) {
  const b = new Build();
  const n = Math.max(2, Math.round(len / 0.45));
  for (let i = 0; i <= n; i++) { const x = -len / 2 + i * (len / n); b.box(0.12, 0.7, 0.05, 0xfdfaf4, { p: [x, 0.35, 0] }, 0.03); b.sphere(0.065, 0xfdfaf4, { p: [x, 0.72, 0] }, 5, 3); }
  for (const y of [0.22, 0.52]) b.box(len, 0.06, 0.04, 0xf0ece0, { p: [0, y, -0.04] }, 0);
  return b.geometry();
}
export function blumeEdgeGeo(kind, len, seed) {
  if (kind === 'blumenhedge') return blumeHedgeGeo(len + 0.1, seed);
  if (kind === 'blumenrail') return blumeRailGeo(len);
  return null;
}

/** Blumenkranz an allen Blatt-Rändern zum Teich: Tulpen und Gänseblümchen knapp innen an der Kante. */
export function blumeRims(level, map, grid) {
  if (!level.view) return 0;
  let n = 0;
  const blockAt = (x, z) => (map.ground ?? []).find((b) => b.walk && x >= b.rect[0] - 0.3 && x <= b.rect[2] + 0.3 && z >= b.rect[1] - 0.3 && z <= b.rect[3] + 0.3);
  for (const r of edgeRuns(level, map, grid)) {
    const L = r.b - r.a;
    if (L < 1) continue;
    const mid = (r.a + r.b) / 2;
    const bl = blockAt(...(r.w.axis === 'x' ? [r.w.x - r.w.side * 0.3, mid] : [mid, r.w.z - r.w.side * 0.3]));
    const P = PETALS11[bl?.style ?? 'petal_rose'] ?? PETALS11.petal_rose;
    const b = new Build(), gl = new Build();
    const k = Math.max(1, Math.round(L / 1.1));
    const cols = P.gray ? [0xdcdcdc, 0x9a9a9a, 0xffffff] : [0xff4a5a, 0xffd23a, 0xb07af0, 0xff8ac8];
    for (let i = 0; i < k; i++) {
      const u = r.a + (i + 0.5) * (L / k) + (hash2(i * 3.1, mid) - 0.5) * 0.3;
      const inset = 0.25 + hash2(u, i) * 0.15;
      const [x, z] = r.w.axis === 'x' ? [r.w.x - r.w.side * inset, u] : [u, r.w.z - r.w.side * inset];
      const h = +(0.32 + hash2(x * 2.1, z) * 0.22).toFixed(2);
      if (i % 2) {
        const g = tulipGeo(h, cols[i % cols.length]).clone(); g.translate(x, r.y, z); b.parts.push(g);
      } else {
        const g = daisyGeo(h, P.gray ? 0xf0f0f0 : 0xffffff).clone(); g.translate(x, r.y, z); b.parts.push(g);
        const c = daisyCenterGeo(h).clone(); c.translate(x, r.y, z); gl.parts.push(c);
      }
      n++;
    }
    if (b.parts.length) level.view.addStatic(b.geometry(), { castShadow: false });
    if (gl.parts.length) level.view.addStatic(gl.geometry(), { material: P.gray ? 'glow' : 'bglow', castShadow: false, tile: GLOW_TILE11 });
  }
  return n;
}

// ------------------------------------------------------------------ Brücken

/**
 * Gießkannen-Brücke: Zinkrinne mit Nietenreihen und Rand (Deck), am unteren Ende steht eine riesige Gießkanne im Teich, deren
 * Tülle die Brücke ist; am oberen Ende sitzt die Brause (aus ihr regnen Tropfen in den Teich – BlumeLife, map.segments).
 */
function buildCanBridge(level, spec) {
  buildBridge({ world: level.world, view: null }, { ...spec, rails: false });
  if (!level.view) return;
  const { a, c, L, dy, pitch, Ld, w } = spanOf(spec);
  const low = a[1] <= c[1] ? 0 : 1;   // Kanne am unteren Ende
  const b = new Build(), deck = new Build();
  const zinc = { v: (px, py, pz, nx, ny) => mix(0x8aa0b4, 0xd8e4ee, ny * 0.45 + 0.5 + Math.abs(nx) * 0.1) };
  deck.box(Ld + 0.2, 0.1, w - 0.3, { v: (px, py, pz, nx, ny) => (ny > 0.5 ? mix(0xb8c8d8, 0xd8e4ee, Math.abs(Math.sin(pz * 3)) * 0.6) : 0x7a8a9a) }, { p: [Ld / 2, -0.05, 0] }, 0);
  for (const s of [-1, 1]) {
    b.box(Ld + 0.3, 0.42, 0.18, zinc, { p: [Ld / 2, 0.1, s * (w / 2 - 0.05)] }, 0.05);
    b.cyl(0.1, 0.1, Ld + 0.3, 0xe8f0f6, { p: [Ld / 2, 0.33, s * (w / 2 - 0.05)], r: [0, 0, PI / 2] }, 6);
    const n = Math.max(2, Math.round(Ld / 0.8));
    for (let i = 0; i < n; i++) b.sphere(0.05, 0x6a7a8a, { p: [((i + 0.5) / n) * Ld, 0.1, s * (w / 2 + 0.05)] }, 4, 3);
  }
  // Unterseite: halbrunde Rinne
  b.cyl(w * 0.46, w * 0.46, Ld + 0.2, zinc, { p: [Ld / 2, -0.12, 0], r: [0, 0, PI / 2], s: [1, 1, 0.45] }, 12, true);
  const rot = (g) => { g.rotateZ(pitch); return g; };
  level.view.addStatic(placeAlong(rot(b.geometry()), a, c), { castShadow: true });
  level.view.addStatic(placeAlong(rot(deck.geometry()), a, c), { castShadow: false });
  // Gießkanne im Teich (unteres Ende) und Brause (oberes Ende), Weltlage
  const sea = 0;
  const end = low ? c : a, other = low ? a : c;
  const dx = end[0] - other[0], dz = end[2] - other[2], l = Math.hypot(dx, dz) || 1;
  const ux = dx / l, uz = dz / l;
  const kx = end[0] + ux * 3.4 - uz * 2.6, kz = end[2] + uz * 3.4 + ux * 2.6;
  const H = Math.max(2.5, end[1] - 0.6 - sea + 1);
  const can = new Build();
  can.cyl(2.2, 2.4, H, { v: (px, py, pz, nx) => mix(0x6aa0c8, 0x9ad0f0, Math.abs(nx) * 0.4 + 0.3) }, { p: [kx, sea - 1 + H / 2, kz] }, 16);
  can.torus(2.2, 0.12, 0xd8e4ee, { p: [kx, sea - 1 + H, kz], r: [PI / 2, 0, 0] }, 5, 18);
  can.torus(1.5, 0.22, 0x5a8ab0, { p: [kx - ux * 2.2, sea - 1 + H * 0.75, kz - uz * 2.2], r: [0, Math.atan2(-uz, ux) + PI / 2, 0] }, 6, 16, PI);
  for (let i = 0; i < 5; i++) { const pa = (i / 5) * TAU; can.sphere(0.35, [0xff7ab4, 0xffd23a, 0xffffff][i % 3], { p: [kx + Math.cos(pa) * 1.6, sea - 1 + H * 0.55, kz + Math.sin(pa) * 1.6 + 0.0], s: [1, 1, 0.3], r: [0, -pa, 0] }, 6, 4); }
  level.view.addStatic(can.geometry(), { castShadow: true });
  const top = low ? a : c, under = low ? c : a;
  const tx = top[0] - (under[0] - top[0]) / L * 0.2, tz = top[2] - (under[2] - top[2]) / L * 0.2;
  const rose = new Build();
  rose.cyl(1.0, 0.6, 0.5, 0xb8c8d8, { p: [0, 0, 0], r: [0, 0, PI / 2] }, 14);
  for (let i = 0; i < 9; i++) { const ra = (i / 9) * TAU; rose.sphere(0.07, 0x4a5a6a, { p: [-0.26, Math.cos(ra) * 0.6, Math.sin(ra) * 0.6] }, 4, 3); }
  const rg = rose.geometry();
  rg.rotateY(Math.atan2(-(under[2] - top[2]), under[0] - top[0]) + PI);
  rg.translate(tx - (under[0] - top[0]) / L * 0.4, top[1] - 0.7, tz - (under[2] - top[2]) / L * 0.4);
  level.view.addStatic(rg, { castShadow: true });
  void dy; void worldAlong; void alongAt;
}

/** Stängel-Brücke: liegender Blumenstängel (Grasdeck oben), Blätter an den Seiten, eine Knospe am Ende. */
function buildStemBridge11(level, spec) {
  buildBridge({ world: level.world, view: null }, { ...spec, rails: false });
  if (!level.view) return;
  const { a, c, pitch, Ld, w } = spanOf(spec);
  const b = new Build(), deck = new Build();
  const rl = w * 0.44;
  b.cyl(rl, rl, Ld + 0.4, { v: (px, py, pz, nx, ny) => mix(0x3a8a44, 0x7ad06a, ny * 0.4 + 0.5 + Math.sin(px * 4) * 0.06) }, { p: [Ld / 2, -rl + 0.02, 0], r: [0, 0, PI / 2] }, 12, true);
  deck.box(Ld + 0.3, 0.1, w, { v: (px, py, pz, nx, ny) => (ny > 0.5 ? mix(0x8ad86a, 0xa8e880, Math.abs(Math.sin(px * 2 + pz))) : 0x3e8a44) }, { p: [Ld / 2, -0.05, 0] }, 0);
  const n = Math.max(2, Math.round(Ld / 2.4));
  for (let i = 0; i < n; i++) {
    const u = ((i + 0.5) / n) * Ld, s = i % 2 ? 1 : -1;
    b.sphere(1.2, { v: (px, py, pz, nx, ny) => mix(0x3e9a4a, 0x8ad86a, ny * 0.5 + 0.5) }, { p: [u, -rl * 0.4, s * (rl + 0.9)], s: [1, 0.1, 0.5], r: [0, 0.5 * s, 0.3 * s] }, 8, 4);
  }
  for (const s of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 8; i++) { const u = (i / 8) * Ld; pts.push([u, 0.5 + Math.sin(i * 1.9) * 0.06, s * (w / 2 - 0.08)]); }
    b.tube(pts, 0.05, 0x5ab84a, null, 16, 4);
    for (let i = 0; i <= 4; i++) {
      const u = (i / 4) * Ld;
      b.cyl(0.035, 0.035, 0.5, 0x5ab84a, { p: [u, 0.25, s * (w / 2 - 0.08)] }, 4, true);
      b.sphere(0.12, [0xff5a6a, 0xffd23a, 0xff8ac8][(i + (s > 0 ? 1 : 0)) % 3], { p: [u, 0.56, s * (w / 2 - 0.08)] }, 5, 4);
    }
  }
  const rot = (g) => { g.rotateZ(pitch); return g; };
  level.view.addStatic(placeAlong(rot(b.geometry()), a, c), { castShadow: true });
  level.view.addStatic(placeAlong(rot(deck.geometry()), a, c), { castShadow: false });
}

export function buildBlumeSegment(level, seg) {
  switch (seg.type) {
    case 'canbridge': buildCanBridge(level, seg); return true;
    case 'stembridge11': buildStemBridge11(level, seg); return true;
    default: return false;
  }
}

// ------------------------------------------------------------------ Requisiten

function bushGeo11(s = 1) {
  return cached(`w11m:bush:${s}`, () => {
    const b = new Build();
    for (const [x, y, z, r] of [[0, 0.6, 0, 0.75], [-0.6, 0.45, 0.15, 0.55], [0.6, 0.48, -0.1, 0.55]]) b.sphere(r * s, { v: (px, py, pz, nx, ny) => mix(0x3e8a44, 0x8ad86a, ny * 0.5 + 0.5) }, { p: [x * s, y * s, z * s] }, 8, 5);
    const cols = [0xff5a6a, 0xffd23a, 0xff8ac8, 0xffffff];
    for (let i = 0; i < 7; i++) { const a = i * 2.1; b.sphere(0.1 * s, cols[i % 4], { p: [Math.cos(a) * 0.6 * s, (0.55 + (i % 3) * 0.2) * s, Math.sin(a) * 0.55 * s + 0.15 * s] }, 5, 3); }
    return b.geometry();
  });
}
function lampGeo11() {
  return cached('w11m:lamp', () => {
    const b = new Build();
    const pts = []; for (let i = 0; i <= 6; i++) pts.push([Math.sin(i * 0.5) * 0.25 * (i / 6), (i / 6) * 2.6, 0]);
    b.tube(pts, 0.06, 0x3e9a4a, null, 10, 5);
    b.sphere(0.25, 0x5ab84a, { p: [0.12, 0.8, 0], s: [1.6, 0.25, 0.7], r: [0, 0, 0.5] }, 6, 3);
    return b.geometry();
  });
}
function lampGlowGeo11() {
  return cached('w11m:lampglow', () => {
    const b = new Build();
    b.lathe([[0.04, 0.0], [0.3, -0.1], [0.38, -0.45], [0.46, -0.6], [0.0, -0.5]], 0xa8c8ff, { p: [0.25, 2.75, 0] }, 10);
    return b.geometry();
  });
}
function canGeo11(s = 1) {
  return cached(`w11m:can:${s}`, () => {
    const b = new Build();
    b.cyl(0.32 * s, 0.36 * s, 0.6 * s, { v: (px, py, pz, nx) => mix(0x6aa0c8, 0x9ad0f0, Math.abs(nx) * 0.4 + 0.3) }, { p: [0, 0.3 * s, 0] }, 10);
    b.torus(0.22 * s, 0.04 * s, 0x5a8ab0, { p: [-0.3 * s, 0.5 * s, 0], r: [0, PI / 2, 0] }, 4, 10, PI);
    b.cyl(0.04 * s, 0.06 * s, 0.6 * s, 0x6aa0c8, { p: [0.45 * s, 0.5 * s, 0], r: [0, 0, -0.9] }, 6);
    b.cyl(0.1 * s, 0.06 * s, 0.08 * s, 0xb8c8d8, { p: [0.7 * s, 0.7 * s, 0], r: [0, 0, -0.9] }, 8);
    return b.geometry();
  });
}
function gnomeGeo11() {
  return cached('w11m:gnome', () => {
    const b = new Build();
    b.cyl(0.2, 0.26, 0.42, 0x3a6ad8, { p: [0, 0.21, 0] }, 8);
    b.sphere(0.16, 0xffd8b8, { p: [0, 0.55, 0] }, 8, 6);
    b.sphere(0.15, 0xffffff, { p: [0, 0.46, 0.06], s: [1, 1, 0.6] }, 7, 5);
    b.cone(0.17, 0.42, 0xe8302a, { p: [0, 0.82, 0], r: [-0.15, 0, 0] }, 8);
    b.sphere(0.04, 0xff9a8a, { p: [0, 0.55, 0.15] }, 5, 3);
    return b.geometry();
  });
}
function benchGeo11() {
  return cached('w11m:bench', () => {
    const b = new Build();
    for (let i = 0; i < 3; i++) b.box(1.8, 0.06, 0.16, 0xfdfaf4, { p: [0, 0.45, -0.18 + i * 0.18] }, 0.02);
    for (let i = 0; i < 2; i++) b.box(1.8, 0.14, 0.05, 0xfdfaf4, { p: [0, 0.75 + i * 0.2, -0.3] }, 0.02);
    for (const s of [-1, 1]) b.box(0.08, 0.9, 0.5, 0x3a6a44, { p: [s * 0.8, 0.45, -0.05] }, 0.02);
    return b.geometry();
  });
}
function sunflowerGeo11(h = 3) {
  return cached(`w11m:sunflower:${h}`, () => {
    const b = new Build();
    b.cyl(0.07, 0.1, h, 0x3e9a4a, { p: [0, h / 2, 0] }, 6);
    for (const s of [-1, 1]) b.sphere(0.35, 0x4aa84a, { p: [s * 0.3, h * 0.45, 0], s: [1.6, 0.2, 0.7], r: [0, 0, -s * 0.4] }, 6, 3);
    for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; b.sphere(0.22, 0xffc81a, { p: [Math.cos(a) * 0.5, h + Math.sin(a) * 0.5, 0.1], s: [1.4, 0.55, 0.2], r: [0, 0, a] }, 5, 3); }
    b.cyl(0.36, 0.36, 0.12, 0x6a3a1a, { p: [0, h, 0.16], r: [PI / 2, 0, 0] }, 12);
    return b.geometry();
  });
}

export function blumePropGeo(it, seed) {
  const s = it.size;
  switch (it.kind) {
    case 'tulip11': return tulipGeo(+(0.6 * (s ?? 1)).toFixed(2), FLOWER_COLORS[it.color] ?? 0xff4a5a, false).clone();
    case 'daisy11': return daisyGeo(+(0.45 * (s ?? 1)).toFixed(2)).clone();
    case 'flowers11': {
      const b = new Build();
      const cols = [FLOWER_COLORS[it.color] ?? 0xff4a5a, 0xffd23a, 0xb07af0, 0xff8ac8];
      for (let i = 0; i < 7; i++) { const a = i * 2.39 + (seed % 5), k = 0.15 + (i % 3) * 0.3; const g = tulipGeo(+(0.45 + (i % 3) * 0.12).toFixed(2), cols[i % 4]).clone(); g.translate(Math.cos(a) * k * (s ?? 1), 0, Math.sin(a) * k * (s ?? 1)); b.parts.push(g); }
      b.add(new THREE.CircleGeometry(0.9 * (s ?? 1), 12).rotateX(-PI / 2), 0x7a5a3a, { p: [0, 0.015, 0] });
      return b.geometry();
    }
    case 'bush11': return bushGeo11(s ?? 1).clone();
    case 'lamp11': return lampGeo11().clone();
    case 'can11': return canGeo11(s ?? 1).clone();
    case 'gnome11': return gnomeGeo11().clone();
    case 'bench11': return benchGeo11().clone();
    case 'sunflower11': return sunflowerGeo11(s ?? 3).clone();
    case 'tree11': case 'pastel11': return bushGeo11((s ?? 1) * 1.4).clone();   // Rückfall ohne Registry-Modell
    default: return null;
  }
}
export function blumePropGlow(it) {
  switch (it.kind) {
    case 'lamp11': return lampGlowGeo11().clone();
    case 'daisy11': return daisyCenterGeo(+(0.45 * (it.size ?? 1)).toFixed(2)).clone();
    default: return null;
  }
}
export function blumePropShape(it) {
  const [x, y, z] = it.pos, s = it.size ?? 1;
  switch (it.kind) {
    case 'bush11': return { type: 'cyl', x, z, r: 0.95 * s, y0: y, y1: y + 1.2 * s, tag: 'busch' };
    case 'lamp11': return { type: 'cyl', x, z, r: 0.25, y0: y, y1: y + 2.8, tag: 'laterne' };
    case 'can11': return { type: 'cyl', x, z, r: 0.4 * s, y0: y, y1: y + 0.7 * s, tag: 'giesskanne' };
    case 'gnome11': return { type: 'cyl', x, z, r: 0.28, y0: y, y1: y + 1.0, tag: 'zwerg' };
    case 'bench11': return { type: 'box', min: [x - 0.9, y, z - 0.35], max: [x + 0.9, y + 1.0, z + 0.25], tag: 'bank' };
    case 'sunflower11': return { type: 'cyl', x, z, r: 0.25, y0: y, y1: y + (s ?? 3), tag: 'sonnenblume' };
    case 'tree11': return { type: 'cyl', x, z, r: 0.45, y0: y, y1: y + 4, tag: 'baum' };
    case 'pastel11': return null;
    default: return null;
  }
}
export function blumePropModel(it) {
  const spec = {
    tree11: ['kirschbaum', { ...(it.size ? { size: it.size } : {}) }, FRONT, 1, 3000],
    pastel11: ['pastell_blume', {}, FRONT, it.size ?? 1, 3000],
  }[it.kind];
  if (!spec) return null;
  const [name, opts, yawFix, scale, max] = spec;
  if (!MK11.has(name, opts, max)) return null;
  MK11.used.add(name);
  return [name, opts, yawFix, scale];
}

// ------------------------------------------------------------------ Streudeko, Riesenblumen im Teich

export function scatterBlume(level, map, grid) {
  const view = level.view;
  if (view) {
    for (const [i, bl] of (map.blooms ?? []).entries()) {
      const [x, z] = bl.pos;
      const top = bl.top ?? 12, r = bl.r ?? 6;
      const col = FLOWER_COLORS[bl.color] ?? [0xff7ab4, 0xffd23a, 0xb07af0, 0xff8a5a][i % 4];
      const b = new Build(), gl = new Build();
      b.lathe([[0.7, 0], [0.55, top * 0.5], [0.6, top]], { v: (px, py) => mix(0x3a8a44, 0x6ac05a, py / top) }, { p: [0, -1, 0] }, 8);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU + i;
        b.sphere(r * 0.55, { v: (px, py, pz, nx, ny) => mix(mix(col, 0x000000, 0.18), mix(col, 0xffffff, 0.35), ny * 0.5 + 0.5) }, { p: [Math.cos(a) * r * 0.58, top, Math.sin(a) * r * 0.58], s: [1, 0.16, 0.55], r: [0, -a, 0.18] }, 10, 5);
      }
      gl.sphere(r * 0.3, { v: (px, py, pz, nx, ny) => mix(0xffb020, 0xffe07a, ny * 0.5 + 0.5) }, { p: [0, top + 0.25, 0], s: [1, 0.45, 1] }, 10, 6);
      b.sphere(r * 0.5, 0x4aa84a, { p: [r * 0.4, top * 0.45, 0], s: [1, 0.08, 0.4], r: [0, i, 0.4] }, 8, 3);
      const g = b.geometry(); g.translate(x, 0, z);
      view.addStatic(g, { castShadow: false, tile: 'w11:riesenblumen' });
      const gg = gl.geometry(); gg.translate(x, 0, z);
      view.addStatic(gg, { material: 'bglow', castShadow: false, tile: GLOW_TILE11 });
    }
  }
  blumeRims(level, map, grid);
}

// ------------------------------------------------------------------ Inselchen, Nachbarwelten

/** Seerosenblatt im Teich mit einer Seerose (bzw. Knospe). */
export function blumeIsletParts(x, z, w, d, top, rnd) {
  const parts = [];
  const r = Math.min(w, d) * 0.42;
  const pad = new Build();
  pad.add(new THREE.CircleGeometry(r, 18, 0.35, TAU - 0.7).rotateX(-PI / 2), { v: (px, py, pz) => mix(0x2e8a44, 0x6ac05a, Math.hypot(px, pz) / r) }, { p: [x, 0.06, z], r: [0, rnd.real(0, TAU), 0] });
  parts.push(pad.geometry());
  const fl = new Build();
  const col = [0xffffff, 0xff9ac8, 0xffd23a][rnd.int(0, 2)];
  for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; fl.sphere(r * 0.22, col, { p: [x + Math.cos(a) * r * 0.22, 0.3, z + Math.sin(a) * r * 0.22], s: [1, 0.35, 0.5], r: [0, -a, 0.5] }, 6, 3); }
  fl.sphere(r * 0.1, 0xffc81a, { p: [x, 0.38, z] }, 5, 3);
  parts.push(fl.geometry());
  void top;
  return parts;
}

/**
 * Nachbarwelten am Horizont der Welt Blume: 'blumenfern' (der Blumengarten, von Welt Pilz bzw. Welt Krone aus gesehen:
 * Riesenblumen auf einem grünen Hügel) und 'pilzfern' (aus pilz10.js). Ein Mesh je Nachbarwelt.
 */
export function blumeNeighborParts(nb, rnd) {
  if (nb.style !== 'blumenfern') return [];
  const [x, z] = nb.pos;
  const [w, d] = nb.size ?? [90, 60];
  const y = nb.y ?? 0;
  const B = new Build();
  B.sphere(w * 0.5, { v: (qx, qy, qz, nx, ny) => mix(0x4a9a5a, 0x9ad888, ny * 0.5 + 0.5) }, { p: [x, y - 6, z], s: [1, 0.22, d / w] }, 16, 6);
  const cols = [0xff7ab4, 0xffd23a, 0xb07af0, 0xff8a5a, 0xffffff];
  for (let i = 0; i < 9; i++) {
    const px = x + rnd.real(-0.4, 0.4) * w, pz = z + rnd.real(-0.35, 0.35) * d;
    const h = rnd.real(12, 26), r = rnd.real(5, 10);
    B.cyl(0.6, 0.9, h, 0x4a9a5a, { p: [px, y + h / 2, pz] }, 6, true);
    for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; B.sphere(r * 0.5, cols[i % cols.length], { p: [px + Math.cos(a) * r * 0.55, y + h, pz + Math.sin(a) * r * 0.55], s: [1, 0.25, 0.55], r: [0, -a, 0] }, 7, 4); }
    B.sphere(r * 0.3, 0xffc81a, { p: [px, y + h + 0.3, pz], s: [1, 0.5, 1] }, 7, 4);
  }
  return [B.geometry()];
}

// ------------------------------------------------------------------ Lebendige Kulisse

const _c = new THREE.Color();
const WING = [0xff7ab4, 0xffd23a, 0x7ab8ff, 0xb07af0, 0xff8a5a, 0x5ad8a8];

/** Schmetterlingsflügel (rechts, +Z), Gelenk am Körper im Ursprung. */
function wingGeo() {
  return cached('w11m:wing', () => {
    const b = new Build();
    b.add(new THREE.CircleGeometry(0.26, 10), 0xffffff, { p: [0.06, 0, 0.22], r: [-PI / 2, 0, 0], s: [1, 1.2, 1] });
    b.add(new THREE.CircleGeometry(0.18, 8), 0xf0f0f0, { p: [-0.16, 0, 0.16], r: [-PI / 2, 0, 0] });
    return b.geometry();
  });
}
function bodyGeo() {
  return cached('w11m:bfbody', () => { const b = new Build(); b.sphere(0.05, 0x3a2a3a, { s: [4, 1, 1] }, 6, 4); b.sphere(0.05, 0x3a2a3a, { p: [0.22, 0.02, 0] }, 5, 4); return b.geometry(); });
}
function petalFlakeGeo() {
  return cached('w11m:flake', () => { const b = new Build(); b.add(new THREE.CircleGeometry(0.12, 6), 0xffffff, { s: [1, 0.6, 1] }); return b.geometry(); });
}

/**
 * Bewegte Kulisse der Welt Blume (MapBuilder: out.life; state().decor über liveInfo):
 *   Puls-Material 'bglow'  Blütenmitten, Laternen, Sterne – je Zählzeit der Kartenmusik heller Aufschein (beatPulse)
 *   Schmetterlinge         map.butterflies { perIsland, seed } – Körper + zwei Flügel-Instanzflächen; flattern in Schleifen,
 *                          je Zählzeit ein kräftiger Flügelschlag; eine von drei Gruppen steigt am Schlag auf
 *   Blütenblätter          segeln in einem Kasten um den Blickpunkt herab (eine Instanz-Fläche)
 *   Brausen-Tropfen        an jeder Gießkannen-Brücke regnen Tropfen in den Teich (eine Instanz-Fläche)
 */
export class BlumeLife {
  constructor(level, map) {
    this.view = level.view;
    this.map = map;
    this.own = [];
    this.mat = bonusGlow(this.view);
    this.buildButterflies(map.butterflies ?? {});
    this.buildPetals(map.petals ?? {});
    this.buildDrops(map);
    this.shown = null;
    this.update(0, 0);
  }

  inst(geo, n, mat, name) {
    const m = new THREE.InstancedMesh(geo, mat, Math.max(1, n));
    m.frustumCulled = false;
    m.name = name;
    m.count = n;
    this.view.add(m);
    this.own.push(m);
    return m;
  }

  buildButterflies(spec) {
    const rnd = new Rnd(0xbf11 + (spec.seed ?? 0));
    this.flies = [];
    for (const b of this.map.ground ?? []) {
      if (!b.walk) continue;
      const [x0, z0, x1, z1] = b.rect;
      const n = spec.perIsland ?? 3;
      for (let i = 0; i < n; i++) this.flies.push({ x: rnd.real(x0 + 2, x1 - 2), y: b.top + rnd.real(1.4, 3.2), z: rnd.real(z0 + 2, z1 - 2), r: rnd.real(1.2, 3), sp: rnd.real(0.25, 0.5) * (i & 1 ? 1 : -1), ph: rnd.real(0, TAU), c: WING[(i + this.flies.length) % WING.length] });
    }
    const n = this.flies.length;
    const wmat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, vertexColors: true, emissive: 0x2a2a2a });
    const bmat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.own.push(wmat, bmat);
    this.wingR = this.inst(wingGeo(), n, wmat, 'w11:schmetterling-r');
    this.wingL = this.inst(wingGeo().clone().scale(1, 1, -1), n, wmat, 'w11:schmetterling-l');
    this.own.push(this.wingL.geometry);
    this.body = this.inst(bodyGeo(), n, bmat, 'w11:schmetterling-k');
    this.flies.forEach((f, i) => { this.wingR.setColorAt(i, _c.set(f.c)); this.wingL.setColorAt(i, _c.set(f.c)); });
  }

  buildPetals(spec) {
    const rnd = new Rnd(0xfe7a);
    const n = spec.n ?? 46;
    this.flakes = [];
    for (let i = 0; i < n; i++) this.flakes.push({ x: rnd.real(0, 34), y: rnd.real(0, 16), z: rnd.real(0, 34), v: rnd.real(0.4, 0.9), ph: rnd.real(0, TAU), c: [0xffb0d8, 0xffffff, 0xffe08a, 0xd8b8ff][i % 4] });
    const mat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, color: 0xffffff, emissive: 0x4a3a40 });
    this.own.push(mat);
    this.flake = this.inst(petalFlakeGeo(), n, mat, 'w11:bluetenblaetter');
    this.flakes.forEach((f, i) => this.flake.setColorAt(i, _c.set(f.c)));
  }

  buildDrops(map) {
    this.roses = [];
    for (const s of map.segments ?? []) {
      if (s.type !== 'canbridge') continue;
      const top = s.from[1] >= s.to[1] ? s.from : s.to, under = top === s.from ? s.to : s.from;
      const L = Math.hypot(under[0] - top[0], under[2] - top[2]) || 1;
      this.roses.push({ x: top[0] - (under[0] - top[0]) / L * 0.9, y: top[1] - 0.7, z: top[2] - (under[2] - top[2]) / L * 0.9, ux: -(under[0] - top[0]) / L, uz: -(under[2] - top[2]) / L });
    }
    const per = 10;
    this.dropN = this.roses.length * per;
    const mat = new THREE.MeshBasicMaterial({ color: 0xb8e8ff, transparent: true, opacity: 0.85, fog: true });
    this.own.push(mat);
    this.drops = this.inst(cached('w11m:drop', () => new THREE.SphereGeometry(0.08, 5, 3)), this.dropN, mat, 'w11:tropfen');
  }

  bloomState(t = this.view.time) {
    const b = BEAT11.at(t);
    return { beat: +b.beat.toFixed(3), step: ((b.whole % 3) + 3) % 3, k: +b.k.toFixed(4), frac: +b.frac.toFixed(3), source: b.source, theme: b.theme, bpm: b.bpm };
  }

  /** Flügelöffnung eines Schmetterlings zur Zeit t (0 = zu, 1 = offen): Grundflattern, am Schlag kräftiger Schlag. */
  wingAt(t, i, bs) {
    const base = 0.55 + 0.35 * Math.sin(t * 14 + i * 1.7);
    const kick = Math.exp(-5 * bs.frac) * Math.cos(bs.frac * 18);
    return Math.max(0, Math.min(1, base * (1 - Math.exp(-5 * bs.frac) * 0.8) + 0.5 * kick + 0.2));
  }

  update(dt, t) {
    const bs = this.bloomState(t);
    this.info = bs;
    if (this.mat) this.mat.color.setScalar(0.5 + 0.65 * bs.k);
    const cam = this.view.camera?.position, tg = this.view.rig?.target;
    const far = !!(cam && tg && cam.distanceTo(tg) > 45);
    for (const m of [this.wingR, this.wingL, this.body, this.flake, this.drops]) m.visible = !far;
    if (far) { this.shown = { step: bs.step, k: bs.k }; return; }
    let open = 0;
    this.flies.forEach((f, i) => {
      const a = f.ph + t * f.sp;
      const lift = i % 3 === bs.step ? Math.sin(Math.min(1, bs.frac / 0.6) * PI) * 0.6 : 0;
      const x = f.x + Math.cos(a) * f.r, y = f.y + Math.sin(t * 1.6 + f.ph) * 0.3 + lift, z = f.z + Math.sin(a) * f.r * 0.7;
      const yaw = Math.atan2(-Math.cos(a) * 0.7 * Math.sign(f.sp), -Math.sin(a) * Math.sign(f.sp));
      const w = this.wingAt(t, i, bs);
      if (i === 0) open = w;
      const ang = (1 - w) * 1.25;
      setInst(this.body, i, x, y, z, yaw, 1);
      setInst(this.wingR, i, x, y, z, yaw, 1, ang, 0);
      setInst(this.wingL, i, x, y, z, yaw, 1, -ang, 0);
    });
    this.wingOpen = open;
    for (const m of [this.wingR, this.wingL, this.body]) m.instanceMatrix.needsUpdate = true;
    // segelnde Blütenblätter um den Blickpunkt
    const cx = tg?.x ?? 0, cy = (tg?.y ?? 0) - 2, cz = tg?.z ?? 0;
    const wrap = (v, c, s) => c + ((((v - c) % s) + s * 1.5) % s) - s / 2;
    this.flakes.forEach((f, i) => {
      const yy = (((f.y - t * f.v) % 16) + 16) % 16;
      setInst(this.flake, i, wrap(f.x + Math.sin(t * 0.8 + f.ph) * 1.2 + t * 0.3, cx, 34), cy + yy, wrap(f.z + Math.cos(t * 0.6 + f.ph) * 0.8, cz, 34), t * 1.5 + f.ph, 1, t * 2.1 + f.ph, t * 1.3);
    });
    this.flake.instanceMatrix.needsUpdate = true;
    // Tropfen aus den Brausen
    let k = 0;
    for (const r of this.roses) {
      for (let j = 0; j < 10; j++) {
        const u = ((t * 0.9 + j / 10) % 1);
        const spread = (j % 5 - 2) * 0.35;
        setInst(this.drops, k++, r.x + r.ux * (0.3 + u * 1.6) - r.uz * spread, r.y - u * u * (r.y + 0.2), r.z + r.uz * (0.3 + u * 1.6) + r.ux * spread, 0, 1);
      }
    }
    this.drops.instanceMatrix.needsUpdate = true;
    this.shown = { step: bs.step, k: bs.k, scalar: +(0.5 + 0.65 * bs.k).toFixed(4) };
  }

  liveInfo() {
    return {
      bloom: { ...this.bloomState(), shown: this.shown, material: !!this.mat },
      butterflies: { n: this.flies.length, open: +(this.wingOpen ?? 0).toFixed(3), visible: this.body.visible },
      petals: { n: this.flakes.length },
      drops: { roses: this.roses.length, n: this.dropN },
      ...MK11.info(),
    };
  }

  dispose() {
    for (const o of this.own) { if (o.isObject3D) o.parent?.remove(o); o.dispose?.(); }
    this.own.length = 0;
  }
}

// ------------------------------------------------------------------ Anmeldung

registerKit('blume', {
  name: 'blume', tag: 'w11', glowTile: GLOW_TILE11, sea: 'meer', foam: false,
  ground: blumeGround, segment: buildBlumeSegment, scatter: scatterBlume, edgeGeo: blumeEdgeGeo,
  propGeo: blumePropGeo, propGlow: blumePropGlow, propShape: blumePropShape, propModel: blumePropModel,
  Life: BlumeLife, isletParts: blumeIsletParts, neighborParts: blumeNeighborParts, mats: bonusGlow,
});
void tone; void place; void worldAlong;
