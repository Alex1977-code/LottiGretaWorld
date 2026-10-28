// Gemeinsame Teile der Welt-7-Modelle „Lava-Festung“ (src/course/models/kinds/*_w7.js, lib/instanced_w7.js).
// Ergänzt kit.js, ändert nichts daran. Figuren und Gimmicks nutzen die geteilten kit-Materialien (std, vcol, metal) und
// bekommen so den Spielzeug-Look; Kulisse nutzt kulMat7()/kulMetal7() (`toy: false`) und eigene Materialien mit
// userData.toy = false.
//
//  - W7, LAVA7, lavaKey   Paletten (Basalt, Knochen, Eisen, Gold, Brummbär-Rot) und Lavafarben 'rot' | 'blau'
//  - kulMat7 … glow7      Materialien (Kulisse ohne Spielzeug-Look, unbeleuchtet vertexgefärbt, additiv)
//  - prog, num            Zustands-Hilfen (Fortschritt 0..1, Zahl mit Standard)
//  - boneTo(b, …)         Knochen (Schaft + Doppelknauf) zwischen zwei Punkten
//  - fireballSet(color)   Feuerkugel-Teile (Kern, Hülle, Flammenkranz) rot/blau – Einzelmodell, Feuerstab, Kampfwagen
//  - sichelShape/sichelGeo/blossomGeo  Wurfsichel (Halbmond-Bumerang mit Blüte) – Item, Geschoss, Kostüm, Werfer
//  - crestTexture()       Brummbär-Wappen (Bärenkopf mit Zylinder und Monokel) als Leinwand-Textur
//  - hexColumnGeo         Basaltsäule (sechseckig, schräge Oberseite) – Einzelmodell und Instanzen
//  - grateGeo             Gitterboden-Kachel (Einzelmodell und Instanzen)
//  - crateGeo             zerbrechliche Kiste (Einzelmodell und Instanzen)
//  - spikeCone            gerundeter Stachel (Fuß bei z = 0, Spitze +Z)
// Alle Geometrien liegen im Cache (kit.cached) und werden nie entsorgt.

import {
  THREE, TAU, Build, cached, vcol, basic, std, col, mix, clamp, smoothstep, placed, canvasTexture, puffyStarGeo, spriteMat,
  glowTexture,
} from './kit.js';
import { puffyGeo, gradV, heightV, ownMat, flameGeo, FLAME, mouthShape, roundRectShape } from './w5Geos.js';
import { LAVA, noise3, hash1, displace, lumpyEllipsoid, lumpyPoint, axisY } from './w4Geos.js';
import { taperTube, ellSurf, memo } from './hwGeos.js';
import { stick, Puffs, alongY } from './kit_w3.js';
import { fibDirs, spikeBallGeo, spikeMat } from './w6Geos.js';

export {
  puffyGeo, gradV, heightV, ownMat, flameGeo, FLAME, mouthShape, roundRectShape, LAVA, noise3, hash1, displace, lumpyEllipsoid,
  lumpyPoint, axisY, taperTube, ellSurf, memo, stick, Puffs, alongY, fibDirs, spikeBallGeo, spikeMat,
};

// ------------------------------------------------------------------ Paletten
export const W7 = {
  rock: 0x3a3040, rockHi: 0x62546e, rockLow: 0x1c1622, rockTop: 0x7a6a84, ash: 0x8a7c90,
  bone: 0xfff2d8, boneHi: 0xffffff, boneLow: 0xe2cca4, boneDark: 0xb89c78, socket: 0x3a1a40, socketHi: 0x6a3a72,
  iron: 0x3c3c4e, ironHi: 0x74748e, ironLow: 0x1c1c28, steel: 0xb8c4d6, steelHi: 0xeef4ff, steelLow: 0x5e6a80,
  gold: 0xffc21a, goldHi: 0xfff0a0, goldLow: 0xc88a10,
  red: 0xe8202a, redHi: 0xff6a5a, redLow: 0x8a0e18, wine: 0x6a0e1e,
  wood: 0xc8884a, woodHi: 0xe8b070, woodLow: 0x7a4a22, woodDark: 0x4a2a14,
  ink: 0x1e1428, mouth: 0x5a1430, tongue: 0xff7a8a, cheek: 0xff8aa8, white: 0xffffff, tooth: 0xffffff,
  mint: 0x2ad8b8, mintHi: 0x9af8e0, mintLow: 0x0e8a7a, pink: 0xff5aa8, pinkHi: 0xffb8dc, petal: 0xfff6fa,
  poison: 0x9a4ae0, poisonHi: 0xd8a8ff, poisonLow: 0x4a1a8a, poisonGreen: 0x8af04a,
};
/** Lavafarben je Sorte: deep (dunkel) → hot → hotter → white (Kern), glow (Schein), crust (erkaltete Kruste). */
export const LAVA7 = {
  rot: { deep: 0xc8280a, hot: 0xff6a10, hotter: 0xffb02a, white: 0xfff2b0, glow: 0xff6a1a, crust: 0x4a1a16, crustHi: 0x7a2a1e },
  blau: { deep: 0x1a2ad0, hot: 0x2a7aff, hotter: 0x6ad0ff, white: 0xe8ffff, glow: 0x3a8aff, crust: 0x181a48, crustHi: 0x2a3878 },
};
export const lavaKey = (c) => (c === 'blau' ? 'blau' : 'rot');

// ------------------------------------------------------------------ Materialien
/** Kulissen-Material (vertexgefärbt, ohne Spielzeug-Look). */
export const kulMat7 = (r = 0.75) => vcol(r, { toy: false }, 'w7kul');
/** Kulissen-Metall (ohne Spielzeug-Look). */
export const kulMetal7 = () => vcol(0.38, { toy: false, metalness: 0.45 }, 'w7kulmetal');
/** Unbeleuchtetes, vertexgefärbtes Material (Glut, Lava, Flammen). */
export const glow7 = () => basic('vcol:w7glow', { vertexColors: true, toneMapped: false });
/** Unbeleuchtet, vertexgefärbt, durchscheinend (Flammenhüllen, Lavaspritzer). */
export const glow7T = (opacity = 0.85) => basic(`vcol:w7glowT:${opacity}`, { vertexColors: true, toneMapped: false, transparent: true, opacity, depthWrite: false });
/** Additiver Schein (Farbe fest). */
export const add7 = (key, color, opacity = 0.7) => basic(`w7add:${key}`, { color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
/** Eigenes Material für Kulissen-Zubehör (Spielzeug-Look aus). */
export function plain(m) { m.userData.toy = false; return m; }

// ------------------------------------------------------------------ Zustands-Hilfen
export const prog = (st, clk, dur, loop = false) => (st.progress !== undefined ? clamp(Number(st.progress) || 0, 0, 1) : loop ? (clk.age % dur) / dur : clamp(clk.age / dur, 0, 1));
export const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
export const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

// ------------------------------------------------------------------ Knochen
const _a = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3(), _n = new THREE.Vector3();
/**
 * Knochen von a nach c (Weltpunkte [x,y,z]): Schaft (Radius r) und an beiden Enden ein Doppelknauf (Kugeln r·k quer zum
 * Schaft, Richtung side). color: Farbe oder { v }. q = Segmente (Qualität).
 */
export function boneTo(b, a, c, r, color, side = [0, 1, 0], k = 1.45, q = 10) {
  _a.set(...a); _c.set(...c);
  _d.subVectors(_c, _a);
  const len = _d.length();
  _d.normalize();
  _n.set(...side); _n.addScaledVector(_d, -_n.dot(_d));
  if (_n.lengthSq() < 1e-6) _n.set(0, 0, 1).addScaledVector(_d, -_d.z);
  _n.normalize();
  b.add(new THREE.CylinderGeometry(r * 0.82, r * 0.82, Math.max(0.01, len - r * 1.6), q, 1, true), color, alongY(_a.clone().addScaledVector(_d, r * 0.8).toArray(), _d.toArray(), Math.max(0.01, len - r * 1.6)));
  for (const end of [_a, _c]) {
    for (const s of [1, -1]) {
      const p = end.clone().addScaledVector(_n, s * r * 0.62);
      b.sphere(r * k * 0.72, color, { p: p.toArray() }, q, Math.max(6, q - 2));
    }
  }
  return b;
}

// ------------------------------------------------------------------ Feuerkugel (rot/blau)
export const FIRE7 = {
  rot: { core: 0xfff0a0, mid: 0xff8a1a, outer: 0xe02a12, glow: 0xff6a20 },
  blau: { core: 0xeaffff, mid: 0x4ab8ff, outer: 0x2a3aff, glow: 0x3a8aff },
};
/** Flammenkranz um eine Feuerkugel (Radius ≈0,29, Mitte im Ursprung). */
export function fireFlamesGeo(color = 'rot', n = 7, lo = false) {
  const C = FIRE7[lavaKey(color)];
  return cached(`w7:fire:flames:${color}:${n}:${lo}`, () => {
    const b = new Build();
    for (let i = 0; i < n; i++) {
      const d = new THREE.Vector3(Math.cos(i * 2.4) * 0.8, Math.sin(i * 1.7), Math.sin(i * 2.4) * 0.8).normalize();
      const g = new THREE.ConeGeometry(0.07, 0.17, lo ? 5 : 6); g.rotateX(Math.PI / 2); g.translate(0, 0, 0.12);
      const m = new THREE.Matrix4().compose(new THREE.Vector3(), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d), new THREE.Vector3(1, 1, 1));
      b.add(g, { v: (x, y, z) => mix(C.mid, C.outer, smoothstep(z / 0.2)) }, m);
    }
    return b.geometry();
  });
}
/** Kern + Hülle als eine Geometrie (Kern hell, Hülle Farbverlauf) – für Instanzen (Feuerstab). Ø ≈0,36. */
export function fireballLoGeo(color = 'rot') {
  const C = FIRE7[lavaKey(color)];
  return cached(`w7:fire:lo:${color}`, () => {
    const b = new Build();
    b.add(new THREE.IcosahedronGeometry(0.17, 2), { v: (x, y, z) => mix(C.core, C.mid, smoothstep(Math.hypot(x, y, z) * 3 - 0.2 + y * 1.5)) });
    return b.geometry();
  });
}
/**
 * Feuerkugel als Gruppe (Kern, Hülle, Flammenkranz, Schein; Ø ≈0,36 · scale, Mitte im Ursprung). group.userData.anim(t)
 * lässt sie flackern. 4 Meshes/Sprites, alle Materialien geteilt.
 */
export function fireballSet(color = 'rot', scale = 1) {
  const key = lavaKey(color), C = FIRE7[key];
  const g = new THREE.Group();
  const core = new THREE.Mesh(cached('w7:fk:core', () => new THREE.IcosahedronGeometry(0.12, 1)), basic(`w7:fkCore:${key}`, { color: C.core }));
  const mid = new THREE.Mesh(cached('w7:fk:mid', () => new THREE.IcosahedronGeometry(0.16, 1)), basic(`w7:fkMid:${key}`, { color: C.mid, transparent: true, opacity: 0.85, depthWrite: false }));
  const flames = new THREE.Mesh(fireFlamesGeo(key), basic('w7:fkFlames', { color: 0xffffff, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false }));
  const sp = new THREE.Sprite(basicSprite(C.glow));
  sp.scale.setScalar(0.95);
  g.add(core, mid, flames, sp);
  g.scale.setScalar(scale);
  g.userData.anim = (t) => {
    const fl = 1 + Math.sin(t * 29) * 0.1;
    core.scale.setScalar(fl);
    mid.scale.setScalar(1 + Math.sin(t * 23 + 1) * 0.08);
    flames.rotation.set(t * 4, t * 6.5, t * 3);
    flames.scale.setScalar(0.95 + Math.sin(t * 17) * 0.1);
    sp.scale.setScalar(0.95 * fl);
  };
  return g;
}
function basicSprite(color) { return spriteMat(`glow:${color}:0.8`, { map: glowTexture(), color, blending: THREE.AdditiveBlending, opacity: 0.8 }); }

// ------------------------------------------------------------------ Wurfsichel
/**
 * Halbmond-Sichel (Bumerang) in XY, Mitte des Außenkreises im Ursprung, Öffnung nach +X, Spitzen oben und unten rechts.
 * R = Außenradius; inner = Innenradius-Anteil; off = Versatz des Innenkreises (Anteil von R).
 */
export function sichelShape(R = 0.5, inner = 0.8, off = 0.42, n = 28) {
  const r2 = R * inner, d = R * off;
  const x = (R * R - r2 * r2 + d * d) / (2 * d), y = Math.sqrt(Math.max(0, R * R - x * x));
  const th1 = Math.atan2(y, x), ph1 = Math.atan2(y, x - d);
  const s = new THREE.Shape();
  for (let k = 0; k <= n; k++) {
    const a = th1 + (k / n) * (TAU - 2 * th1);
    const px = Math.cos(a) * R, py = Math.sin(a) * R;
    if (k === 0) s.moveTo(px, py); else s.lineTo(px, py);
  }
  for (let k = 1; k < n; k++) {
    const a = (TAU - ph1) - (k / n) * (TAU - 2 * ph1);
    s.lineTo(d + Math.cos(a) * r2, Math.sin(a) * r2);
  }
  s.closePath();
  return s;
}
export const SICHEL = { gold: 0xffc21a, goldHi: 0xfff2a8, goldLow: 0xd8840a, band: 0x2ad8b8, bandHi: 0x9af8e0, rim: 0xff4a7a };
/**
 * Wurfsichel (Ø ≈ 2·R, flach in XY, Dicke ≈0,3·R, Mitte im Ursprung, Öffnung +X): goldener Halbmond mit türkisem Innenband,
 * roten Spitzenkappen und Blüten-Nabe (fünf Blütenblätter, gelbe Mitte, Sternchen). lo: sparsam.
 */
export function sichelGeo(R = 0.35, lo = false) {
  return cached(`w7:sichel:${R}:${lo}`, () => {
    const b = new Build();
    const sh = sichelShape(R, 0.8, 0.42, lo ? 16 : 30);
    b.add(puffyGeo(sh, R * 0.14, R * 0.09, lo ? 3 : 6, lo ? 2 : 4), { v: (x, y, z) => {
      const rr = Math.hypot(x, y) / R;
      if (rr > 0.94) return mix(SICHEL.gold, SICHEL.goldHi, 0.6);
      const band = 1 - smoothstep(Math.abs(rr - 0.74) / 0.07);
      const base = mix(SICHEL.goldLow, SICHEL.goldHi, smoothstep(y / R * 0.5 + 0.5 + z / R));
      return mix(base, SICHEL.band, band * 0.9);
    } });
    // Spitzenkappen (rot) an den beiden Hörnern
    const r2 = R * 0.8, d = R * 0.42;
    const tx = (R * R - r2 * r2 + d * d) / (2 * d), ty = Math.sqrt(Math.max(0, R * R - tx * tx));
    for (const s of [1, -1]) b.sphere(R * 0.085, SICHEL.rim, { p: [tx - R * 0.02, s * (ty - R * 0.03), 0], s: [1, 1, 0.9] }, lo ? 8 : 12, lo ? 6 : 8);
    // Blüten-Nabe auf der dicksten Stelle (−X), beidseitig auf der Fläche
    const hub = [-R * 0.69, 0];
    for (const zs of [1, -1]) {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU + Math.PI / 2;
        b.sphere(1, { v: (x, y, z, nx, ny, nz) => mix(SICHEL.rim, W7.petal, smoothstep(Math.abs(nz) * 1.2 - 0.1)) }, { p: [hub[0] + Math.cos(a) * R * 0.12, hub[1] + Math.sin(a) * R * 0.12, zs * R * 0.16], s: [R * 0.1, R * 0.1, R * 0.05] }, lo ? 8 : 12, lo ? 5 : 8);
      }
      b.sphere(1, { v: (x, y, z, nx, ny) => mix(0xffa01a, 0xfff07a, smoothstep(ny * 0.5 + 0.6)) }, { p: [hub[0], hub[1], zs * R * 0.19], s: [R * 0.075, R * 0.075, R * 0.05] }, lo ? 8 : 12, lo ? 5 : 8);
    }
    return b.geometry();
  });
}

/** Goldenes Wurfsichel-Material (geteilt, Spielzeug-Look). */
export const sichelMat = () => vcol(0.26, { metalness: 0.25, emissive: 0x2a1600 }, 'w7sichel');
/**
 * Wurfsichel auf den Rücken eines Werfers (Modell der feuer_werfer-Familie) hängen: schräg über der Schulter, schwingt und
 * staucht mit dem Körper (Kind des Posen-Gelenks). Liefert das Mesh (visible = false, wenn sie fallen gelassen wurde).
 */
export function attachSichel(model) {
  const pose = model.root.children[0];
  const m = new THREE.Mesh(sichelGeo(0.2, true), sichelMat());
  m.position.set(-0.27, 0.66, 0.04);
  m.rotation.set(0, Math.PI / 2 - 0.25, 0.55, 'YXZ');
  m.castShadow = true;
  m.name = 'wurfsichel';
  pose.add(m);
  return m;
}

// ------------------------------------------------------------------ Brummbär-Wappen
/** Brummbär-Wappen: goldener Bärenkopf mit Zylinder und Monokel auf schwarzem Schild, rotes Tuch mit Goldsaum. */
export function crestTexture() {
  return canvasTexture('w7:crest', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#c8142e'; ctx.fillRect(0, 0, w, h);
    // Stoff-Schattierung
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.18)'); g.addColorStop(0.5, 'rgba(255,255,255,0.06)'); g.addColorStop(1, 'rgba(0,0,0,0.18)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ffc21a'; ctx.lineWidth = 14; ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.strokeStyle = '#fff0a0'; ctx.lineWidth = 3; ctx.strokeRect(22, 22, w - 44, h - 44);
    // Schild
    const cx = w / 2;
    ctx.beginPath();
    ctx.moveTo(cx - 74, 48); ctx.lineTo(cx + 74, 48); ctx.lineTo(cx + 74, 140); ctx.quadraticCurveTo(cx + 70, 200, cx, 222); ctx.quadraticCurveTo(cx - 70, 200, cx - 74, 140); ctx.closePath();
    ctx.fillStyle = '#1a1418'; ctx.fill();
    ctx.strokeStyle = '#ffc21a'; ctx.lineWidth = 7; ctx.stroke();
    const gold = '#ffc21a', dark = '#1a1418';
    // Ohren
    ctx.fillStyle = gold;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + s * 40, 112, 16, 0, TAU); ctx.fill(); }
    // Kopf
    ctx.beginPath(); ctx.ellipse(cx, 142, 46, 42, 0, 0, TAU); ctx.fill();
    // Zylinder
    ctx.fillRect(cx - 30, 62, 60, 44); ctx.fillRect(cx - 46, 100, 92, 10);
    ctx.fillStyle = '#c8142e'; ctx.fillRect(cx - 30, 92, 60, 8);
    // Gesicht (dunkel ausgespart)
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.ellipse(cx, 160, 20, 14, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = gold;
    ctx.beginPath(); ctx.ellipse(cx, 156, 9, 6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = dark;
    // grimmige Brauen + Augen
    ctx.lineWidth = 6; ctx.strokeStyle = dark; ctx.lineCap = 'round';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * 30, 122); ctx.lineTo(cx + s * 10, 130); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(cx - 18, 138, 5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 18, 138, 5, 0, TAU); ctx.fill();
    // Monokel
    ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx + 18, 138, 11, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 26, 146); ctx.quadraticCurveTo(cx + 38, 170, cx + 30, 186); ctx.stroke();
    // Schnurrbart
    ctx.lineWidth = 5;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx, 168); ctx.quadraticCurveTo(cx + s * 22, 176, cx + s * 30, 162); ctx.stroke(); }
  });
}

// ------------------------------------------------------------------ Stachel
/** Gerundeter Stachel (Fuß bei z = 0, Spitze bei z = len). */
export function spikeCone(w, len, rs = 8) {
  const pts = [[0, 0], [w, 0], [w * 0.88, len * 0.25], [w * 0.6, len * 0.58], [w * 0.28, len * 0.86], [w * 0.08, len * 0.98], [0, len]];
  const g = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), rs);
  g.rotateX(Math.PI / 2);
  return g;
}
/** Stachel-Farbverlauf (elfenbein → weiß an der Spitze). */
export const spikeV = (len, lo = 0xe8dcc0, hi = 0xffffff) => ({ v: (x, y, z) => mix(lo, hi, smoothstep(z / len)) });

// ------------------------------------------------------------------ Basaltsäule
/**
 * Sechseckige Basaltsäule (Radius r, Höhe h, Fuß bei y = 0, Mitte x = z = 0), Oberseite leicht schräg (tilt rad), heller
 * Deckel und Kanten. lo: ohne Zwischenringe.
 */
export function hexColumnGeo(r = 0.4, h = 3, tilt = 0.12, seed = 1, lo = false) {
  return cached(`w7:hex:${r}:${h}:${tilt}:${seed}:${lo}`, () => {
    const b = new Build();
    const g = new THREE.CylinderGeometry(r, r * 1.04, h, 6, lo ? 1 : 3);
    g.translate(0, h / 2, 0);
    const P = g.attributes.position;
    const ta = hash1(seed * 3.1) * TAU;
    for (let i = 0; i < P.count; i++) {
      const y = P.getY(i);
      if (y > h - 1e-3) P.setY(i, y + (P.getX(i) * Math.cos(ta) + P.getZ(i) * Math.sin(ta)) * Math.tan(tilt));
    }
    g.computeVertexNormals();
    b.add(g, (x, y, z, nx, ny) => {
      if (ny > 0.7) return mix(W7.rockTop, W7.ash, hash1(seed + 0.3) * 0.5);
      const band = Math.floor((y + hash1(seed) * 0.5) / 0.6);
      return mix(mix(W7.rockLow, W7.rockHi, smoothstep(y / h * 0.6 + 0.2)), W7.rock, (band % 2) * 0.25);
    });
    return b.geometry();
  });
}

// ------------------------------------------------------------------ Gitterboden
export const GRATE = { iron: 0x4a4a5e, ironHi: 0x8a8aa8, ironLow: 0x24242e, rivet: 0xffc21a, rust: 0x8a4a2a };
/**
 * Gitterboden-Kachel w × d (Mitte der Unterseite im Ursprung, Oberseite y = t): Rahmen, Längs- und Querstäbe (Fläche nach
 * oben), Goldnieten in den Ecken. lo: weniger Stäbe/Nieten (Instanzen).
 */
export function grateGeo(w = 1, d = 1, t = 0.15, lo = false) {
  return cached(`w7:grate:${w}:${d}:${t}:${lo}`, () => {
    const b = new Build();
    const iron = { v: (x, y, z, nx, ny) => mix(GRATE.ironLow, GRATE.ironHi, smoothstep(ny * 0.55 + 0.35)) };
    const fw = 0.08;
    b.box(w, t, fw, iron, { p: [0, t / 2, d / 2 - fw / 2] }, lo ? 0 : 0.02, 1);
    b.box(w, t, fw, iron, { p: [0, t / 2, -d / 2 + fw / 2] }, lo ? 0 : 0.02, 1);
    b.box(fw, t, d - fw * 2, iron, { p: [w / 2 - fw / 2, t / 2, 0] }, lo ? 0 : 0.02, 1);
    b.box(fw, t, d - fw * 2, iron, { p: [-w / 2 + fw / 2, t / 2, 0] }, lo ? 0 : 0.02, 1);
    const sp = lo ? 0.2 : 0.125;
    const nx = Math.max(1, Math.round((w - fw * 2) / sp) - 1), nz = Math.max(1, Math.round((d - fw * 2) / sp) - 1);
    for (let i = 1; i <= nx; i++) { const x = -w / 2 + fw + i * (w - fw * 2) / (nx + 1); b.box(0.035, t * 0.7, d - fw * 2, iron, { p: [x, t * 0.62, 0] }, 0, 1); }
    for (let j = 1; j <= nz; j++) { const z = -d / 2 + fw + j * (d - fw * 2) / (nz + 1); b.box(w - fw * 2, t * 0.45, 0.03, iron, { p: [0, t * 0.5, z] }, 0, 1); }
    for (const sx of [1, -1]) for (const sz of [1, -1]) b.sphere(0.025, GRATE.rivet, { p: [sx * (w / 2 - fw / 2), t, sz * (d / 2 - fw / 2)], s: [1, 0.6, 1] }, lo ? 6 : 8, 4);
    return b.geometry();
  });
}

// ------------------------------------------------------------------ Zerbrechliche Kiste
export const CRATE = { wood: 0xd89a52, woodHi: 0xf4c890, woodLow: 0x9a6230, frame: 0x6a3a1a, frameHi: 0x9a5a2a, crack: 0x2a140a, iron: 0x4a4a5e, ironHi: 0x9a9ab0, mark: 0xff4a3a };
/** Brettfläche (Seite einer Kiste, Kante s, Fläche nach +Z, Mitte im Ursprung) mit Fugen und Rissen. */
function cratePanel(b, s, o, lo, seed = 0) {
  const crack = (x, y) => {
    // Risse: zwei gezackte Linien
    const c1 = Math.abs(y - (x * 0.8 + Math.sin(x * 9 + seed) * 0.06 + 0.05 * s)) < 0.018 * s && x > -0.1 * s;
    const c2 = Math.abs(x - (-y * 0.6 + Math.sin(y * 11 + seed) * 0.05 - 0.15 * s)) < 0.016 * s && y < 0.1 * s;
    return c1 || c2;
  };
  b.box(s * 0.98, s * 0.98, s * 0.06, (x, y, z, nx, ny, nz) => {
    if (Math.abs(nz) < 0.5) return CRATE.woodLow;
    const lx = x - o.p[0], ly = y - o.p[1];
    const plank = Math.floor((ly / s + 0.5) * 4);
    if (!lo && crack(lx, ly)) return CRATE.crack;
    const fv = ((ly / s + 0.5) * 4) % 1;
    if (fv < 0.05 || fv > 0.95) return CRATE.woodLow;
    return mix(CRATE.wood, plank % 2 ? CRATE.woodHi : CRATE.wood, 0.5 + hash1(plank + seed) * 0.3);
  }, o, 0, 1);
}
/**
 * Zerbrechliche Kiste (Kante s, Ursprung = Mitte der Unterseite): helle Bretter mit Rissen, dunkler Rahmen, Eisenecken, rotes
 * Bruch-Zeichen (Blitz) vorn und hinten. lo: sparsam.
 */
export function crateGeo(s = 1, lo = false) {
  return cached(`w7:crate:${s}:${lo}`, () => {
    const b = new Build();
    const h = s / 2;
    // Kern
    b.box(s * 0.94, s * 0.94, s * 0.94, CRATE.woodLow, { p: [0, h, 0] }, 0, 1);
    // Bretterflächen
    const faces = [[[0, h, h], [0, 0, 0]], [[0, h, -h], [0, Math.PI, 0]], [[h, h, 0], [0, Math.PI / 2, 0]], [[-h, h, 0], [0, -Math.PI / 2, 0]], [[0, s, 0], [-Math.PI / 2, 0, 0]]];
    faces.forEach(([p, r], i) => {
      const g = new Build();
      cratePanel(g, s, { p: [0, 0, 0] }, lo, i * 1.7);
      const geo = g.geometry();
      geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(1, 1, 1)));
      b.parts.push(geo);
    });
    // Rahmenleisten (12 Kanten)
    const fr = { v: (x, y, z, nx, ny) => mix(CRATE.frame, CRATE.frameHi, smoothstep(ny * 0.5 + 0.5)) };
    const e = s * 0.09;
    for (const a of [-1, 1]) for (const c of [-1, 1]) {
      b.box(s + 0.01, e, e, fr, { p: [0, h + a * (h - e / 2), c * (h - e / 2)] }, lo ? 0 : 0.015, 1);
      b.box(e, s + 0.01, e, fr, { p: [a * (h - e / 2), h, c * (h - e / 2)] }, lo ? 0 : 0.015, 1);
      b.box(e, e, s + 0.01, fr, { p: [a * (h - e / 2), h + c * (h - e / 2), 0] }, lo ? 0 : 0.015, 1);
    }
    // Eisenecken mit Niete
    if (!lo) {
      for (const x of [-1, 1]) for (const y of [0, 1]) for (const z of [-1, 1]) {
        b.box(e * 1.5, e * 1.5, e * 1.5, { v: (px, py, pz, nx, ny) => mix(CRATE.iron, CRATE.ironHi, smoothstep(ny * 0.5 + 0.5)) }, { p: [x * (h - e * 0.6), y ? s - e * 0.6 : e * 0.6, z * (h - e * 0.6)] }, 0.02, 1);
      }
    }
    // Bruch-Zeichen (roter Blitz) vorn (+X) und hinten
    const bolt = new THREE.Shape([[0.12, 0.3], [-0.06, 0.02], [0.04, 0.02], [-0.1, -0.3], [0.1, -0.02], [0, -0.02]].map(([x, y]) => new THREE.Vector2(x * s, y * s)));
    for (const sx of [1, -1]) b.add(puffyGeo(bolt, 0.02 * s, 0.012 * s, 2, 1), CRATE.mark, { p: [sx * (h + 0.03 * s), h, 0], r: [0, sx * Math.PI / 2, 0] });
    return b.geometry();
  });
}
/** Ein Brett-Panel (Bruchstück der Kiste), Kante s, Mitte im Ursprung, Fläche nach +Z. */
export function cratePanelGeo(s = 1) {
  return cached(`w7:crate:panel:${s}`, () => {
    const b = new Build();
    cratePanel(b, s, { p: [0, 0, 0] }, true, 0.5);
    const fr = CRATE.frame;
    b.box(s, s * 0.09, s * 0.08, fr, { p: [0, s * 0.45, 0.02] }, 0, 1);
    b.box(s, s * 0.09, s * 0.08, fr, { p: [0, -s * 0.45, 0.02] }, 0, 1);
    return b.geometry();
  });
}

// ------------------------------------------------------------------ Lava-Oberfläche (Ring, Blasen)
/** Flacher Glutring (Torus liegend, Radius 1) – Wellenring an der Lava-Oberfläche. */
export function lavaRingGeo(color = 'rot') {
  const C = LAVA7[lavaKey(color)];
  return cached(`w7:lavaring:${color}`, () => new Build().torus(1, 0.09, { v: (x, y) => mix(C.hot, C.white, smoothstep(y / 0.09 * 0.5 + 0.5)) }, { r: [Math.PI / 2, 0, 0], s: [1, 1, 0.45] }, 6, 32).geometry());
}
/** Kleine Lavatröpfchen-Kugel (Radius 1, unbeleuchtet: hell oben, dunkler unten). */
export function dropletGeo(color = 'rot') {
  const C = LAVA7[lavaKey(color)];
  return cached(`w7:droplet:${color}`, () => new Build().sphere(1, { v: (x, y) => mix(C.hot, C.white, smoothstep(y * 0.6 + 0.5)) }, {}, 8, 6).geometry());
}
