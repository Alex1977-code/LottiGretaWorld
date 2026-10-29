// Gemeinsame Teile der Bonuswelt-Modelle (Welt Stern „Sternenzelt“, Welt Krone; src/course/models/kinds/*_star.js,
// *_bonus.js, lib/instanced_star.js). Ergänzt kit.js, ändert nichts daran. Gimmicks nutzen die geteilten kit-Materialien
// (vcol, std, metal) und bekommen so den Spielzeug-Look; Kulisse nutzt kulS()/kulSMetal()/kulSD() (`toy: false`) und bleibt
// „backbar“ (blocks/w2kit.js bakeModel: undurchsichtige, vertexgefärbte Meshes → Welt-Material, unbeleuchtete → Glüh-Material).
//
//  - ST                    Paletten (Sternenzelt-Platten, Regenbogen, Holz-Athletik, Metall, Retro-Blockland, Waben, Schnee,
//                          Krone)
//  - PANEL / panelColor    benannte Plattenfarben ('blau', 'rot', 'gelb', 'gruen', 'lila', 'weiss', 'gold') oder Hex
//  - kulS … glowS          Materialien (Kulisse ohne Spielzeug-Look, Glühen, additiv)
//  - hexShape, hexPrismGeo Waben-Grundform (Umkreisradius r, Ecke nach +X)
//  - flatStarGeo           puffiger Stern, der flach auf einer Oberseite liegt (Spitze nach +X)
//  - stepShape             Treppen-Umriss aus Pixel-Zellen (Retro-Wolken/-Büsche)
//  - woodV, rainbowAt      Farbverläufe
//  - dirTo                 Grundkörper zwischen zwei Punkten ausrichten (Matrix)
// Alle Geometrien liegen im Cache (kit.cached / memo) und werden nie entsorgt.

import {
  THREE, TAU, Build, cached, vcol, basic, std, metal, col, mix, clamp, smoothstep, lerp, placed, puffyStarGeo, starShape,
  sparkShape, roundedBox, SIDE, gold,
} from './kit.js';
import {
  num, prog, ZERO, ownMat, puffyGeo, gradV, heightV, roundRectShape, noise3, hash1, displace, lumpyEllipsoid, taperTube, memo,
  fxPuffs, spikeCone, spikeV, W8, harvest, recolor, cutSphere, glow8, add8, superCube,
} from './w8Geos.js';

export {
  num, prog, ZERO, ownMat, puffyGeo, gradV, heightV, roundRectShape, noise3, hash1, displace, lumpyEllipsoid, taperTube, memo,
  fxPuffs, spikeCone, spikeV, W8, harvest, recolor, cutSphere, glow8, add8, superCube,
};

// ------------------------------------------------------------------ Paletten
export const ST = {
  // Weltraum / Sternenzelt
  space: 0x1a1446, spaceHi: 0x3a2a8a, night: 0x0e0a2a,
  star: 0xffd23a, starHi: 0xfff4b0, starLow: 0xe8900e,
  white: 0xfff8f2, cream: 0xfff1dc, silver: 0xd0d6e6, silverHi: 0xffffff, silverLow: 0x7a84a2, ink: 0x1a1430,
  // Regenbogen (von außen links nach rechts)
  rainbow: [0xff4a5e, 0xff9a2e, 0xffe03a, 0x5ad84a, 0x3ac8ff, 0x4a6aff, 0xb05aff],
  // Holz-Athletik
  wood: 0xdca066, woodHi: 0xf6d098, woodLow: 0xa0662e, woodDark: 0x6e3c18, woodRing: 0xf8dcaa, woodRed: 0xe8433a, woodRedHi: 0xff8a7a,
  // Metall
  iron: 0x3c4058, ironHi: 0x7e86a8, ironLow: 0x1c1e2c, brass: 0xe0a83a, brassHi: 0xfff0a8, brassLow: 0x94600e,
  copper: 0xd8784a, copperHi: 0xffc09a, teal: 0x2ac8c0, tealHi: 0x9af6ea, tealLow: 0x0a7480,
  // Zukunft / Kanonen-Sternwerk
  hull: 0xeef2fa, hullLow: 0x9aa6c8, hullHi: 0xffffff, neon: 0x3af0ff, neonHi: 0xd8ffff, neonPink: 0xff5ad0, warnY: 0xffd23a, warnK: 0x2a2a3a,
  // Retro-Blockland
  rGrass: 0x5ad83a, rGrassHi: 0xb4f478, rGrassLow: 0x2a9a2a, rEarth: 0xd8884a, rEarthHi: 0xf4b478, rEarthLow: 0x9a5426,
  rBrick: 0xe0642e, rBrickHi: 0xff9a5a, rBrickLow: 0x9a3414, rMortar: 0xf8d8a8, rHard: 0xc87a3a, rHardHi: 0xf4b070, rHardLow: 0x7a3e1a,
  rCloud: 0xffffff, rCloudLow: 0xb8dcff, rBush: 0x3ec43a, rBushHi: 0x9af06a, rBushLow: 0x1e7a2a,
  // Waben
  honey: 0xffb81a, honeyHi: 0xffe680, honeyLow: 0xc8700a, comb: 0x9a5ae8, combHi: 0xd8b0ff, combLow: 0x4a2a9a,
  lava: 0xff5a14, lavaHi: 0xffd04a, lavaWhite: 0xfff6c8, crust: 0x3a2228, crustHi: 0x6a4248,
  ice: 0x8ad8ff, iceHi: 0xe8fbff, iceLow: 0x3a8ad8, frost: 0xffffff,
  // Schnee / Nebel / Spuk
  snow: 0xf6f9ff, snowLow: 0xb8c8ec, snowShade: 0x8a9ad0, fog: 0xe0dcff, grave: 0x9a96b8, graveHi: 0xd8d6ee, graveLow: 0x5a5678,
  // Pflanzen
  leaf: 0x3ec44a, leafHi: 0xa8f070, leafLow: 0x1a7a3a, stem: 0x5ab83a, stemHi: 0xb0e878, petal: 0xff6aa8, petalHi: 0xffd0e8,
  capRed: 0xe8323e, capRedHi: 0xff8a8a, capRedLow: 0x8a1022, gill: 0xfff0dc, stalk: 0xfff6e8, stalkLow: 0xd8c8b0,
  // Krone
  gold: 0xffc21a, goldHi: 0xfff0a0, goldLow: 0xb87a0a, velvet: 0xc8203a, velvetHi: 0xff6a7a, velvetLow: 0x6a0a1e,
  ruby: 0xff2a4a, sapphire: 0x2a6aff, emerald: 0x1ad87a, pearl: 0xfff6ff, marble: 0xf4f0f8, marbleLow: 0xb8b0c8,
};

/** Benannte Plattenfarben: [Grund, hell, dunkel]. */
export const PANEL = {
  blau: [0x2a6ae8, 0x8ac4ff, 0x123a9a],
  rot: [0xe8384a, 0xff9aa0, 0x8a1426],
  gelb: [0xffc81a, 0xfff2a0, 0xc87a0a],
  gruen: [0x2ec85a, 0xa8f4a0, 0x0e7a3a],
  lila: [0x9a4ae8, 0xdcb0ff, 0x4a1a9a],
  weiss: [0xf4f6fc, 0xffffff, 0xa8b0c8],
  gold: [0xffc21a, 0xfff0a0, 0xb87a0a],
  tuerkis: [0x1ac8c8, 0xa0fff0, 0x0a6a7a],
};
/** Plattenfarbe aus Name oder Hex → [Grund, hell, dunkel]. */
export function panelColor(c, d = 'blau') {
  if (PANEL[c]) return PANEL[c];
  if (typeof c === 'number' || (typeof c === 'string' && c.startsWith('#'))) {
    const b = col(c);
    return [b.getHex(), b.clone().lerp(new THREE.Color(1, 1, 1), 0.55).getHex(), b.clone().multiplyScalar(0.45).getHex()];
  }
  return PANEL[d];
}

// ------------------------------------------------------------------ Materialien
/** Kulissen-Material (vertexgefärbt, ohne Spielzeug-Look, backbar). */
export const kulS = (r = 0.7) => vcol(r, { toy: false }, 'starkul');
/** Kulissen-Material doppelseitig (Fahnen, Blätter). */
export const kulSD = () => vcol(0.7, { toy: false, side: THREE.DoubleSide }, 'starkulD');
/** Kulissen-Metall (Gold, Chrom; ohne Spielzeug-Look). */
export const kulSMetal = (r = 0.3) => vcol(r, { toy: false, metalness: 0.5 }, 'starkulmetal');
/** Kulissen-Gold/-Chrom mit Umgebungsspiegelung (vertexgefärbt, ohne Spielzeug-Look; beim Backen bleiben die Farben). */
export const kulGold = () => metal('starkulgold', { toy: false, vertexColors: true, color: 0xffffff, metalness: 0.55, roughness: 0.28 }, 0.85);
/** Kulisse, leicht selbstleuchtend (Sterne, Schnuppen): vertexgefärbt, warmer Eigenschein. */
export const kulSGlow = () => vcol(0.3, { toy: false, emissive: 0x4a3200 }, 'starkulE');
/** Unbeleuchtet, vertexgefärbt (Lichter, Glut, Neon). */
export const glowS = () => basic('vcol:starglow', { vertexColors: true, toneMapped: false });
/** Additiver Schein (Farbe fest). */
export const addS = (key, color, opacity = 0.7) => basic(`staradd:${key}`, { color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
/** Spielzeug-Material für Gimmicks (vertexgefärbt, geteilt). */
export const toyS = (r = 0.38, key = 'star', extra = {}) => vcol(r, extra, `star:${key}`);
export { gold };

// ------------------------------------------------------------------ Formen
/** Sechseck (Umkreisradius r, Ecke bei Winkel 0 = +X; in XY). round > 0: Ecken gerundet. */
export function hexShape(r, round = 0) {
  const s = new THREE.Shape();
  const pts = Array.from({ length: 6 }, (_, i) => [Math.cos((i / 6) * TAU) * r, Math.sin((i / 6) * TAU) * r]);
  if (round <= 0) { pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath(); return s; }
  const k = Math.min(round, r * 0.45) / r;
  for (let i = 0; i < 6; i++) {
    const p = pts[i], a = pts[(i + 5) % 6], b = pts[(i + 1) % 6];
    const p0 = [lerp(p[0], a[0], k), lerp(p[1], a[1], k)], p1 = [lerp(p[0], b[0], k), lerp(p[1], b[1], k)];
    if (i === 0) s.moveTo(p0[0], p0[1]); else s.lineTo(p0[0], p0[1]);
    s.quadraticCurveTo(p[0], p[1], p1[0], p1[1]);
  }
  s.closePath();
  return s;
}
/**
 * Sechseck-Prisma (Umkreisradius r, Höhe h, Ecke nach +X), Ursprung = Mitte der Unterseite, Oberseite y = h. bevel: runde
 * Kante. Nicht gefärbt (für Build.add).
 */
export function hexPrismGeo(r, h, bevel = 0.06, seg = 3) {
  const bv = Math.min(bevel, h * 0.45, r * 0.3);
  const g = new THREE.ExtrudeGeometry(hexShape(r - bv, r * 0.06), { depth: Math.max(0.001, h - 2 * bv), bevelEnabled: bv > 0, bevelThickness: bv, bevelSize: bv, bevelSegments: seg, curveSegments: 3 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, bv, 0);
  return g;
}
/** Puffiger Stern, flach liegend (Fläche nach +Y, Spitze nach +X), Mitte im Ursprung. */
export function flatStarGeo(R, depth = 0.06, bevel = 0.03, n = 5, inner = 0.46) {
  const g = puffyStarGeo(R, R * inner, depth, bevel, n);
  g.rotateZ(-Math.PI / 2);   // Spitze von +Y nach +X
  g.rotateX(-Math.PI / 2);   // Fläche von +Z nach +Y
  return g;
}
/**
 * Treppen-Umriss aus Pixel-Zellen (Retro): cols = Höhe je Spalte (in Zellen), cell = Zellgröße; Umriss in XY, unten bei
 * y = 0, mittig in X. round: Rundung der Außenecken.
 */
export function stepShape(cols, cell = 0.5, round = 0.12) {
  const n = cols.length, w = n * cell;
  const pts = [[-w / 2, 0], [w / 2, 0]];
  for (let i = n - 1; i >= 0; i--) {
    const x1 = -w / 2 + (i + 1) * cell, x0 = x1 - cell, y = cols[i] * cell;
    pts.push([x1, y], [x0, y]);
  }
  // doppelte Punkte (gleiche Höhe nebeneinander) entfernen
  const clean = [];
  for (const p of pts) { const q = clean[clean.length - 1]; if (!q || Math.abs(q[0] - p[0]) > 1e-6 || Math.abs(q[1] - p[1]) > 1e-6) clean.push(p); }
  const out = [];
  for (let i = 0; i < clean.length; i++) {
    const a = clean[(i + clean.length - 1) % clean.length], b = clean[i], c = clean[(i + 1) % clean.length];
    const col3 = (Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(b[0] - c[0]) < 1e-6) || (Math.abs(a[1] - b[1]) < 1e-6 && Math.abs(b[1] - c[1]) < 1e-6);
    if (!col3) out.push(b);
  }
  const s = new THREE.Shape();
  const r = round;
  for (let i = 0; i < out.length; i++) {
    const a = out[(i + out.length - 1) % out.length], p = out[i], b = out[(i + 1) % out.length];
    const da = Math.hypot(a[0] - p[0], a[1] - p[1]), db = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const rr = Math.min(r, da * 0.45, db * 0.45);
    const p0 = [p[0] + (a[0] - p[0]) / da * rr, p[1] + (a[1] - p[1]) / da * rr];
    const p1 = [p[0] + (b[0] - p[0]) / db * rr, p[1] + (b[1] - p[1]) / db * rr];
    if (i === 0) s.moveTo(p0[0], p0[1]); else s.lineTo(p0[0], p0[1]);
    s.quadraticCurveTo(p[0], p[1], p1[0], p1[1]);
  }
  s.closePath();
  return s;
}

// ------------------------------------------------------------------ Farbverläufe
/** Holz: Längsmaserung entlang der Achse ax ('x'|'y'|'z'), hell oben. */
export const woodV = (lo = ST.woodLow, mid = ST.wood, hi = ST.woodHi, ax = 'y', f = 6) => ({ v: (x, y, z, nx, ny) => {
  const a = ax === 'x' ? x : ax === 'z' ? z : y;
  const b = ax === 'x' ? z : ax === 'z' ? x : z;
  const grain = Math.sin(a * f * 0.35 + Math.sin(b * f) * 1.6 + noise3(x * 2, y * 2, z * 2) * 3) * 0.5 + 0.5;
  return mix(lo, mix(mid, hi, grain * 0.55 + smoothstep(ny * 0.5 + 0.2) * 0.45), smoothstep(ny * 0.45 + 0.62));
} });
/** Regenbogenfarbe für u ∈ 0..1 (quer über die Breite). */
export const rainbowAt = (u) => ST.rainbow[clamp(Math.floor(u * 7), 0, 6)];

// ------------------------------------------------------------------ Hilfen
/** Maß [x, z] aus Zahl oder Liste (mit Standard). */
export const sz2 = (v, d) => (Array.isArray(v) ? [num(v[0], d[0]), num(v[1], d[1])] : v !== undefined ? [num(v, d[0]), num(v, d[1])] : d);
/** Maß [x, y, z] aus Zahl (Würfel) oder Liste (mit Standard). */
export const sz3 = (v, d) => (Array.isArray(v) ? [num(v[0], d[0]), num(v[1], d[1]), num(v[2], d[2])] : v !== undefined ? [num(v, d[0]), num(v, d[0]), num(v, d[0])] : d);
/** Ganzzahl-Schlüssel für Cache-Namen (Maße auf cm gerundet). */
export const k2 = (v) => Math.round(v * 100) / 100;
/** Matrix: Einheits-Grundkörper entlang +Y von a nach c (Länge per scaleY = |c − a|, falls scaleLen). */
export function dirTo(a, c, sx = 1, sz = 1, scaleLen = false) {
  const A = new THREE.Vector3(...a), C = new THREE.Vector3(...c), d = C.clone().sub(A);
  const len = d.length();
  return new THREE.Matrix4().compose(A.clone().add(C).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), new THREE.Vector3(sx, scaleLen ? len : 1, sz));
}
/** Zylinder zwischen zwei Punkten (Radius r0 → r1) in einen Build. */
export function rod(b, a, c, r0, r1, color, rs = 8) {
  const len = new THREE.Vector3(...a).distanceTo(new THREE.Vector3(...c));
  b.add(new THREE.CylinderGeometry(r1, r0, len, rs, 1), color, dirTo(a, c));
  return b;
}
/** Zahnkranz-Umriss (Außenradius R, n Zähne, Zahntiefe depth) mit Loch (Radius hole, 0 = keines). */
export function gearShape(R, teeth, depth, hole = 0) {
  const s = new THREE.Shape();
  const n = teeth * 4;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU, ph = i % 4;
    const r = ph === 0 || ph === 3 ? R - depth : R;
    const off = (ph === 1 ? 0.14 : ph === 2 ? -0.14 : 0) * (TAU / teeth) * 0.25;
    const x = Math.cos(a + off) * r, y = Math.sin(a + off) * r;
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  if (hole > 0) { const h = new THREE.Path(); h.absarc(0, 0, hole, 0, TAU, true); s.holes.push(h); }
  return s;
}
/** Ring-Kranz (z. B. Sterne um einen Planeten): n kleine Sterne auf einem Kreis (Radius R) in der XZ-Ebene. */
export function starRing(b, R, n, size, colorFn, y = 0, tiltX = 0) {
  const M = new THREE.Matrix4().makeRotationX(tiltX);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const g = puffyStarGeo(size, size * 0.46, size * 0.4, size * 0.16);
    const m = new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a) * R, y, Math.sin(a) * R), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a + Math.PI / 2, i * 0.7)), new THREE.Vector3(1, 1, 1));
    b.add(g, colorFn(i), M.clone().multiply(m));
  }
  return b;
}

export { THREE, TAU, Build, cached, vcol, basic, std, metal, col, mix, clamp, smoothstep, lerp, placed, puffyStarGeo, starShape, sparkShape, roundedBox, SIDE };
