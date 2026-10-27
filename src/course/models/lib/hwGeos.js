// Gemeinsame Teile der Halloween-Modelle „Kürbisinsel“ (src/course/models/kinds/*_hw.js, lib/instanced_hw.js).
// Ergänzt kit.js, ändert nichts daran. Figuren und Gimmicks nutzen die geteilten kit-Materialien (std, vcol, metal) und
// bekommen so den Spielzeug-Look; Kulisse nutzt kulMat()/kulGlow() (Spielzeug-Look aus: `toy: false`) bzw. kulisse(root)
// (ersetzt Spielzeug-Materialien durch schlichte Zwillinge, userData.toy = false) – kit.js bleibt unberührt.
// Kulissen-Modelle sind „backbar“ (blocks/w2kit.js bakeModel): undurchsichtige, vertexgefärbte Meshes → Welt-Material,
// unbeleuchtete (MeshBasic) → Glüh-Material; durchsichtige Teile (Schein, Nebel) bleiben dabei außen vor.
//
//  - HW                Paletten (Kürbis, Lila, Knochen, Hexengrün, Süßigkeiten, Mondlicht …)
//  - kulMat/kulGlow    Kulissen-Materialien (schlicht), glow()/glowNF() unbeleuchtet (NF = ohne Nebel), add() additiv
//  - subdivide/conform Aufkleber, die sich exakt an eine gewölbte Fläche schmiegen (geschnitzte Gesichter)
//  - Kürbis            PK (Formen), pkPoint (Punkt + Normale auf der Rippenfläche), pumpkinGeo, stemGeo, leafGeo,
//                      addFace (geschnitztes Gesicht: Schnittkante beleuchtet, Licht unbeleuchtet)
//  - candyGeo          Bonbon, Lolli, Schokoriegel, Zuckermais (Sammel-Item, Haufen, Konfetti)
//  - batWingShape      Fledermausflügel (Flatterfledi, Schwarm, Graf)
//  - graveGeo          Grabstein mit Lachgesicht (rund | kreuz | spitz)
//  - witchHatGeo       Hexenhut (Hexenhut-Hüpfer, Vogelscheuche, Kulisse)
//  - fogTexture        weiche Nebel-Karte (Canvas)

import {
  THREE, TAU, Build, cached, vcol, basic, std, col, mix, clamp, smoothstep, smoothNormals, placed, canvasTexture,
} from './kit.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { puffyGeo, roundRectShape, gradV, heightV, mixV } from './w5Geos.js';
import { noise3, hash1 } from './w4Geos.js';
import { plainTree } from '../../../three/lib/toyLook.js';

export { noise3, hash1, puffyGeo, roundRectShape, gradV, heightV, mixV };

// ------------------------------------------------------------------ Paletten
export const HW = {
  // Kürbis
  pk: 0xff8a1a, pkHi: 0xffb84a, pkLow: 0xd85c0c, pkGroove: 0xb8480a, pkFlesh: 0xffd27a,
  stem: 0x7a8a34, stemHi: 0xa8b85a, stemLow: 0x4a5a1e, leaf: 0x34b030, leafHi: 0x6ad84a, leafLow: 0x1e7a24, vein: 0xa8ec7a,
  // Licht (geschnitzte Gesichter, Laternen, Kerzen)
  glowCore: 0xfff2a0, glow: 0xffc830, glowEdge: 0xff7a0a, candle: 0xfff4dc,
  // Lila Nacht
  lila: 0x8a4ae0, lilaHi: 0xc59aff, lilaLow: 0x56289e, lilaDeep: 0x2e1a5a, night: 0x1c1238, ink: 0x1e1428,
  // Knochen
  bone: 0xfff7ea, boneHi: 0xffffff, boneLow: 0xd8c8b0, boneShade: 0xb8a690, socket: 0x2a1838,
  // Hexe
  witch: 0x6a3ac8, witchHi: 0xa47aff, witchLow: 0x3a1a7a, band: 0xff8a1a, buckle: 0xffd23a, potion: 0x7aff4a, potionHi: 0xd8ffb0, potionLow: 0x2ab82a,
  // Stein, Eisen, Holz, Stroh
  stone: 0xa8a0c8, stoneHi: 0xd8d2f0, stoneLow: 0x6a6290, moss: 0x6aa84a, iron: 0x2a2438, ironHi: 0x6a6088,
  wood: 0x9a6038, woodHi: 0xc88a52, woodLow: 0x5e3420, straw: 0xf2c85a, strawHi: 0xfff0a0, strawLow: 0xc8902e,
  // Süßigkeiten
  candy: [0xff5aa8, 0x4ad8ff, 0xffd23a, 0x7aff7a, 0xb07aff, 0xff7a3a],
  candyCorn: [0xfff8ee, 0xff9a1a, 0xffd23a],
  choc: 0x7a3e1e, chocHi: 0xb06a3a, chocLow: 0x4a2010,
  // Gesichter
  mouth: 0x4a1030, tongue: 0xff7a9a, cheek: 0xff8aa8, white: 0xffffff,
  moon: 0xfff0b0, moonHi: 0xfffbe0, moonLow: 0xf0c870,
};

/** Kürbis-Farbsätze: base, hi, low, groove (Rinne). */
export const PK_COLORS = {
  orange: [0xff8a1a, 0xffb84a, 0xd85c0c, 0xb8480a],
  gelb: [0xffc23a, 0xffe48a, 0xe0901a, 0xc87a10],
  weiss: [0xf4ecdc, 0xffffff, 0xcabca6, 0xb0a28a],
  gruen: [0x6aa83a, 0xa8d86a, 0x3e7a22, 0x2e5e18],
  rot: [0xf05a1e, 0xff9a5a, 0xb83a10, 0x9a2e0a],
};

// ------------------------------------------------------------------ Materialien
/** Kulissen-Material (vertexgefärbt, ohne Spielzeug-Look). */
export const kulMat = (r = 0.6) => vcol(r, { toy: false }, 'hwkul');
/** Unbeleuchtetes, vertexgefärbtes Material (Glut, Licht in Kürbissen, Fenster). */
export const glow = () => basic('vcol:hwglow', { vertexColors: true, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
/** Wie glow(), aber ohne Nebel (Mond am Himmel). */
export const glowNF = () => basic('vcol:hwglowNF', { vertexColors: true, fog: false, toneMapped: false });
/** Additiver Schein (Ringe, Lichtkegel). */
export const add = (key, color, opacity = 0.7) => basic(`hwadd:${key}`, { color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
/** Eigenes Material ohne Spielzeug-Look markieren. */
export const noToy = (m) => { m.userData.toy = false; return m; };
/** Kulisse: alle (geteilten) Spielzeug-Materialien eines Baums durch schlichte Zwillinge ersetzen. */
export const kulisse = (root) => plainTree(root);
/** Eigene Kopie eines geteilten Materials (behält Shader-Erweiterungen wie den Spielzeug-Look). */
export function ownMat(base, props = {}) {
  const m = base.clone();
  m.userData = { ...base.userData };
  m.name = base.name;
  for (const [k, v] of Object.entries(props)) { if (m[k] && m[k].isColor) m[k].set(v); else m[k] = v; }
  return m;
}

// ------------------------------------------------------------------ Cache für Geometrie-Sätze
const MEMO = new Map();
/** Wie kit.cached, aber für beliebige Objekte (z. B. { body, glow } – Geometrie-Sätze, einmal gebaut, geteilt). */
export function memo(key, make) {
  let v = MEMO.get(key);
  if (v === undefined) { v = make(); MEMO.set(key, v); }
  return v;
}

// ------------------------------------------------------------------ Aufkleber auf gewölbten Flächen
/** Dreiecke einer nicht-indizierten Geometrie n-mal vierteln (für conform). */
export function subdivide(g0, levels = 2) {
  let g = g0.index ? g0.toNonIndexed() : g0;
  for (let l = 0; l < levels; l++) {
    const P = g.attributes.position, n = P.count, out = new Float32Array(n * 4 * 3);
    let o = 0;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), ab = new THREE.Vector3(), bc = new THREE.Vector3(), ca = new THREE.Vector3();
    const push = (...vs) => { for (const v of vs) { out[o++] = v.x; out[o++] = v.y; out[o++] = v.z; } };
    for (let i = 0; i < n; i += 3) {
      a.fromBufferAttribute(P, i); b.fromBufferAttribute(P, i + 1); c.fromBufferAttribute(P, i + 2);
      ab.addVectors(a, b).multiplyScalar(0.5); bc.addVectors(b, c).multiplyScalar(0.5); ca.addVectors(c, a).multiplyScalar(0.5);
      push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
    }
    const ng = new THREE.BufferGeometry();
    ng.setAttribute('position', new THREE.BufferAttribute(out, 3));
    if (g !== g0) g.dispose();
    g = ng;
  }
  if (g === g0) g = g0.clone();
  return g;
}
/**
 * Geometrie (Fläche in XY, Dicke +Z) auf eine Fläche legen: surf(u, v) → { p, n } (Vector3); jede Ecke (x, y, z) landet
 * bei surf(x, y).p + n·(z + lift). Ergebnis nicht indiziert, Normalen neu (flach) bzw. weich (smooth).
 */
export function conform(g0, surf, lift = 0.004, smooth = false) {
  const g = g0.index ? g0.toNonIndexed() : g0.clone();
  g0.dispose();
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    const s = surf(x, y);
    P.setXYZ(i, s.p.x + s.n.x * (z + lift), s.p.y + s.n.y * (z + lift), s.p.z + s.n.z * (z + lift));
  }
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  if (smooth) return smoothNormals(g);
  g.computeVertexNormals();
  return g;
}
/** Polygon (Liste [u, v]) → THREE.Shape, um c um den Faktor k vergrößert. */
export function polyShape(pts, c = [0, 0], k = 1) {
  const s = new THREE.Shape();
  pts.forEach(([u, v], i) => { const x = c[0] + (u - c[0]) * k, y = c[1] + (v - c[1]) * k; if (i) s.lineTo(x, y); else s.moveTo(x, y); });
  s.closePath();
  return s;
}
/** Gerundetes Polygon: Ecken über quadratische Kurven abgerundet (r = Anteil der Kante), abgetastet. */
export function roundPoly(corners, r = 0.28, steps = 5) {
  const out = [];
  const n = corners.length;
  for (let i = 0; i < n; i++) {
    const p0 = corners[(i - 1 + n) % n], p1 = corners[i], p2 = corners[(i + 1) % n];
    const a = [p1[0] + (p0[0] - p1[0]) * r, p1[1] + (p0[1] - p1[1]) * r], b = [p1[0] + (p2[0] - p1[0]) * r, p1[1] + (p2[1] - p1[1]) * r];
    for (let k = 0; k <= steps; k++) {
      const t = k / steps, u = 1 - t;
      out.push([u * u * a[0] + 2 * u * t * p1[0] + t * t * b[0], u * u * a[1] + 2 * u * t * p1[1] + t * t * b[1]]);
    }
  }
  return out;
}
const ellPts = (cx, cy, rx, ry, n = 24, a0 = 0, a1 = TAU) => Array.from({ length: n }, (_, i) => { const a = a0 + (a1 - a0) * (i / n); return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });

// ------------------------------------------------------------------ Kürbis
/**
 * Kürbis-Formen: R (Radius quer), Hh (halbe Höhe), ribs (Rippen), depth (Rinnentiefe), dimple (Mulde oben/unten),
 * bottom (Unterseite flacher), squash (Breite in z). Mitte im Ursprung (Unterkante ≈ −Hh·bottom).
 */
export const PK = {
  rund: { R: 0.5, Hh: 0.4, ribs: 8, depth: 0.13, dimple: 0.22, bottom: 0.88 },
  flach: { R: 0.55, Hh: 0.3, ribs: 10, depth: 0.12, dimple: 0.28, bottom: 0.85 },
  hoch: { R: 0.42, Hh: 0.5, ribs: 8, depth: 0.11, dimple: 0.16, bottom: 0.9 },
  dick: { R: 0.52, Hh: 0.46, ribs: 9, depth: 0.14, dimple: 0.22, bottom: 0.86 },
};
const _d = new THREE.Vector3();
/** Verformung eines Punkts der Einheitskugel (x, y, z) zur Kürbisfläche. */
function pkDeform(x, y, z, P, out) {
  const rho = Math.min(1, Math.hypot(x, z));
  const phi = Math.atan2(z, x);
  const lobe = Math.pow(Math.abs(Math.cos(P.ribs * phi / 2)), 0.55);
  const k = 1 - P.depth * (1 - lobe) * Math.pow(rho, 1.3);
  let yy = y * P.Hh - Math.sign(y) * P.dimple * P.Hh * Math.pow(1 - rho, 2.2);
  if (y < 0) yy *= P.bottom ?? 0.9;
  return out.set(x * P.R * k, yy, z * P.R * k * (P.squash ?? 1));
}
/** Punkt und Normale auf der Kürbisfläche in Richtung (az: 0 = +X, + → +Z; el: Höhe). */
export function pkPoint(P, az, el) {
  const f = (a, e, o) => pkDeform(Math.cos(e) * Math.cos(a), Math.sin(e), Math.cos(e) * Math.sin(a), P, o);
  const p = f(az, el, new THREE.Vector3());
  const h = 0.002;
  const pa = f(az + h, el, new THREE.Vector3()).sub(p), pe = f(az, el + h, new THREE.Vector3()).sub(p);
  const n = new THREE.Vector3().crossVectors(pa, pe).normalize();
  if (n.dot(_d.copy(p)) < 0) n.negate();
  return { p, n };
}
/** Kürbiskörper (Mitte im Ursprung) mit Vertexfarben: Rippen, Rinnen dunkler, oben Glanz. lo: false | 'mid' | true. */
export function pumpkinGeo(P, colors = PK_COLORS.orange, lo = false) {
  const [base, hi, low, groove] = colors;
  const g = new THREE.SphereGeometry(1, lo === 'mid' ? 40 : lo ? 28 : 52, lo === 'mid' ? 20 : lo ? 14 : 26);
  const Pp = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < Pp.count; i++) { pkDeform(Pp.getX(i), Pp.getY(i), Pp.getZ(i), P, v); Pp.setXYZ(i, v.x, v.y, v.z); }
  const sm = smoothNormals(g);
  const b = new Build();
  b.add(sm, { v: (x, y, z, nx, ny) => {
    const phi = Math.atan2(z / (P.squash ?? 1), x);
    const lobe = Math.pow(Math.abs(Math.cos(P.ribs * phi / 2)), 0.55);
    const rho = clamp(Math.hypot(x, z) / P.R, 0, 1);
    let c = mix(low, base, smoothstep(ny * 0.55 + 0.62));
    c = mix(c, hi, smoothstep((ny - 0.2) / 0.6) * 0.6 * lobe * lobe);
    return mix(c, groove, (1 - smoothstep(lobe / 0.7)) * 0.9 * rho);
  } });
  return b.geometry();
}
/** Stiel: gebogener, kantiger Stumpf (Fuß im Ursprung, Höhe h), oben heller Schnitt. */
export function stemGeo(h = 0.18, r = 0.05, lo = false, curl = 0.5) {
  return cached(`hw:stem:${h}:${r}:${lo}:${curl}`, () => {
    const g = new THREE.CylinderGeometry(r * 0.72, r, h, lo ? 6 : 7, lo ? 3 : 6, false);
    g.translate(0, h / 2, 0);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) { const y = P.getY(i) / h; P.setX(i, P.getX(i) - curl * h * y * y * 0.8); }
    const b = new Build();
    b.add(g, { v: (x, y, z, nx, ny) => (ny > 0.6 ? HW.stemHi : mix(HW.stemLow, HW.stem, smoothstep(y / h + nx * 0.2))) });
    // Wulst am Fuß
    b.sphere(r * 1.25, HW.stemLow, { p: [0, r * 0.15, 0], s: [1, 0.45, 1] }, lo ? 8 : 12, lo ? 4 : 6);
    return b.geometry();
  });
}
/** Kürbisblatt (fünflappig, gepolstert) in XZ (Blattfläche nach +Y), Stielansatz im Ursprung, Spitze nach +X, Länge len. */
export function leafGeo(len = 0.4, lo = false, curl = 0.35) {
  return cached(`hw:leaf2:${len}:${lo}:${curl}`, () => {
    // Umriss: fünf spitze Lappen um die Blattmitte C, tiefe Buchten dazwischen, Stielbucht am Ursprung
    const C = [0.46, 0], deg = Math.PI / 180;
    const ring = [[180, 0.46], [205, 0.3], [235, 0.44], [268, 0.2], [300, 0.52], [330, 0.24], [360, 0.56], [30, 0.24], [60, 0.52], [92, 0.2], [125, 0.44], [155, 0.3]];
    const pts = ring.map(([a, r]) => [C[0] + Math.cos(a * deg) * r, C[1] + Math.sin(a * deg) * r]);
    const s = polyShape(roundPoly(pts, 0.32, lo ? 3 : 5));
    // zwei Lagen (oben/unten) aus der fein unterteilten Fläche – wölbt sich weich, ohne dicke Kanten-Dreiecke
    const top = subdivide(new THREE.ShapeGeometry(s, 1), lo ? 1 : 2);
    top.rotateX(-Math.PI / 2);
    top.scale(len, len, len);
    const bot = top.clone();
    const BA = bot.attributes.position.array;
    for (let i = 0; i < BA.length; i += 9) for (let k = 0; k < 3; k++) { const t = BA[i + 3 + k]; BA[i + 3 + k] = BA[i + 6 + k]; BA[i + 6 + k] = t; }
    bot.translate(0, -0.012 * len / 0.4, 0);
    const g = mergeGeometries([top, bot], false);
    top.dispose(); bot.dispose();
    // Rand hängt nach unten, Mittelrippe leicht gewölbt
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), z = P.getZ(i);
      const d = Math.hypot(x - len * C[0], z) / (len * 0.5);
      P.setY(i, P.getY(i) - curl * len * 0.32 * d * d + Math.sin(clamp(x / len, 0, 1) * Math.PI) * len * 0.06);
    }
    const sm = smoothNormals(g);
    const tips = [235, 300, 360, 60, 125].map((a) => [C[0] + Math.cos(a * deg) * 0.5, C[1] + Math.sin(a * deg) * 0.5]);
    const b = new Build();
    b.add(sm, { v: (x, y, z, nx, ny) => {
      const sx = x / len, sy = -z / len;
      let vd = 9;
      for (const [tx, ty] of tips) {
        const ex = tx - C[0], ey = ty - C[1], l2 = ex * ex + ey * ey;
        const t = clamp(((sx - C[0]) * ex + (sy - C[1]) * ey) / l2, 0, 1);
        vd = Math.min(vd, Math.hypot(sx - C[0] - ex * t, sy - C[1] - ey * t) + t * 0.02);
      }
      vd = Math.min(vd, sy * sy < 0.0004 && sx < C[0] ? 0 : 9);
      if (ny > 0 && vd < 0.028) return HW.vein;
      return ny > 0 ? mix(HW.leaf, HW.leafHi, smoothstep(0.5 - Math.hypot(sx - C[0], sy) * 1.2)) : HW.leafLow;
    } });
    return b.geometry();
  });
}
/** Ranke (Spirale) als Röhre, Fuß im Ursprung. */
export function tendrilGeo(r = 0.12, turns = 1.6, th = 0.012, lo = false) {
  return cached(`hw:tendril:${r}:${turns}:${th}:${lo}`, () => {
    const pts = [];
    const n = lo ? 14 : 28;
    for (let i = 0; i <= n; i++) {
      const t = i / n, a = t * turns * TAU, rr = r * (1 - t * 0.75);
      pts.push([Math.cos(a) * rr - r, t * r * 0.9, Math.sin(a) * rr]);
    }
    const b = new Build();
    b.tube(pts, th, HW.leafLow, null, lo ? 20 : 40, lo ? 4 : 6);
    return b.geometry();
  });
}

// ------------------------------------------------------------------ Geschnitzte Gesichter
/**
 * Gesichtsteile in Gesichts-Einheiten (u rechts = +Z der Figur … hier: u wächst mit az, v nach oben, je ≈ −1..1).
 * kind: 'lachen' (Dreiecksaugen, Grinsen mit Zähnchen) | 'grinsen' (Halbmond-Augen ^ ^, breites Zackengrinsen) |
 * 'staunen' (runde Augen, O-Mund) | 'frech' (ein Auge zwinkert, schiefes Grinsen) | 'mund' (nur das Grinsen).
 */
export function faceParts(kind = 'lachen') {
  const parts = [];
  const tri = (cx, cy, s, flip = 1) => ({ pts: roundPoly([[cx, cy + 0.55 * s * flip], [cx + 0.55 * s, cy - 0.38 * s * flip], [cx - 0.55 * s, cy - 0.38 * s * flip]], 0.3, 4), c: [cx, cy] });
  const arc = (cx, cy, s) => {
    // Halbmond ^ (oben gewölbt)
    const pts = [];
    for (let i = 0; i <= 14; i++) { const a = Math.PI * (i / 14); pts.push([cx - Math.cos(a) * 0.5 * s, cy + Math.sin(a) * 0.42 * s]); }
    for (let i = 14; i >= 0; i--) { const a = Math.PI * (i / 14); pts.push([cx - Math.cos(a) * 0.32 * s, cy + Math.sin(a) * 0.2 * s + 0.02 * s]); }
    return { pts, c: [cx, cy + 0.2 * s] };
  };
  const grin = (w = 0.78, top = -0.22, sag = 0.2, depth = 0.6, teeth = [[-0.32, -0.12, 1], [0.14, 0.32, 1], [-0.06, 0.1, -1]], skew = 0) => {
    const pts = [];
    const n = 30;
    const tooth = (u, sgn) => { for (const [a, b, s] of teeth) if (s === sgn && u > a && u < b) return 0.15; return 0; };
    for (let i = 0; i <= n; i++) { const u = -w + (2 * w * i) / n, q = u / w; pts.push([u, top - sag * (1 - q * q) + skew * q - tooth(u, 1)]); }
    for (let i = n; i >= 0; i--) { const u = -w + (2 * w * i) / n, q = u / w; pts.push([u, top - depth * Math.pow(1 - q * q, 0.65) + skew * q + tooth(u, -1)]); }
    return { pts, c: [0, top - depth * 0.45] };
  };
  if (kind === 'grinsen') {
    parts.push(arc(-0.44, 0.22, 0.75), arc(0.44, 0.22, 0.75));
    parts.push(grin(0.82, -0.2, 0.12, 0.55, [[-0.6, -0.42, 1], [-0.2, -0.02, 1], [0.2, 0.38, 1], [-0.42, -0.22, -1], [0.0, 0.2, -1], [0.38, 0.58, -1]]));
  } else if (kind === 'staunen') {
    parts.push({ pts: ellPts(-0.42, 0.28, 0.2, 0.25, 22), c: [-0.42, 0.28] }, { pts: ellPts(0.42, 0.28, 0.2, 0.25, 22), c: [0.42, 0.28] });
    parts.push({ pts: ellPts(0, -0.42, 0.22, 0.28, 24), c: [0, -0.42] });
  } else if (kind === 'frech') {
    parts.push(tri(-0.44, 0.26, 0.62), arc(0.44, 0.18, 0.7));
    parts.push(grin(0.72, -0.2, 0.16, 0.5, [[-0.18, 0.02, 1], [0.12, 0.3, -1]], 0.1));
  } else if (kind === 'mund') {
    parts.push(grin());
  } else {
    parts.push(tri(-0.44, 0.26, 0.62), tri(0.44, 0.26, 0.62), tri(0, -0.02, 0.24, 1));
    parts.push(grin());
  }
  return parts;
}
/**
 * Geschnitztes Gesicht auf eine Fläche: Schnittkante (helles Fruchtfleisch, beleuchtet) in body, Licht in glowB.
 * surf(az, el) → { p, n }; o: { az (Mitte, 0 = +X), el (Mitte), w (Breite in rad je Einheit), h (Höhe in rad je Einheit),
 * kind, lit (true: Licht gelb leuchtend; false: dunkle Höhle), sub (Unterteilung 2), flesh, rim (Randbreite 1,14) }.
 */
export function addFace(body, glowB, surf, o = {}) {
  const az0 = o.az ?? 0, el0 = o.el ?? 0, w = o.w ?? 0.5, h = o.h ?? 0.45, sub = o.sub ?? 2;
  // u wächst zur rechten Seite der Figur (−Z bei Blick nach +X): so bleibt die Dreiecksfolge außen (Vorderseite sichtbar)
  const map = (u, v) => surf(az0 - u * w, el0 + v * h);
  const lit = o.lit !== false;
  for (const part of faceParts(o.kind)) {
    const rim = new THREE.ShapeGeometry(polyShape(part.pts, part.c, o.rim ?? 1.12), 1);
    body.add(conform(subdivide(rim, sub), map, 0.0035), o.flesh ?? HW.pkFlesh);

    const inner = new THREE.ShapeGeometry(polyShape(part.pts, part.c, 1), 1);
    const cy = part.c[1];
    const gcol = lit
      ? { v: (x, y, z) => mix(HW.glowEdge, HW.glowCore, smoothstep(0.35 + (y - map(0, cy).p.y) * 3)) }
      : { v: (x, y) => mix(0x2a0e06, 0x5a2408, smoothstep(0.5 + (y - map(0, cy).p.y) * 4)) };
    (lit ? glowB : body).add(conform(subdivide(inner, sub), map, 0.006), gcol);
  }
}

// ------------------------------------------------------------------ Süßigkeiten
/**
 * Süßigkeit (Mitte im Ursprung, ≈0,4 m groß, flach liegend in XY, Vorderseite +Z): kind 'bonbon' (Wickelbonbon mit
 * Spiralstreifen), 'lolli' (Spirallolli mit Stiel nach −Y und Schleife), 'riegel' (Schokoriegel halb ausgepackt),
 * 'mais' (Zuckermais: Dreieck weiß/orange/gelb). color = Index in HW.candy.
 */
export const CANDY_KINDS = ['bonbon', 'lolli', 'riegel', 'mais'];
export function candyGeo(kind = 'bonbon', color = 0, lo = false) {
  return cached(`hw:candy:${kind}:${color}:${lo}`, () => {
    const b = new Build();
    const c1 = HW.candy[color % HW.candy.length], c2 = HW.candy[(color + 2) % HW.candy.length];
    const q = lo ? 0.6 : 1, S = (n) => Math.max(4, Math.round(n * q));
    if (kind === 'lolli') {
      // Spirale auf einer dicken Scheibe
      b.cyl(0.17, 0.17, 0.07, (x, y, z, nx, ny, nz) => {
        const r = Math.hypot(x, z), a = Math.atan2(z, x);
        const s = Math.sin(a * 1 + r * 38);
        return Math.abs(ny) < 0.5 ? mix(c1, 0xffffff, 0.2) : s > 0.15 ? 0xffffff : s > -0.4 ? c1 : c2;
      }, { r: [Math.PI / 2, 0, 0], p: [0, 0.06, 0] }, S(28));
      b.torus(0.17, 0.035, c1, { p: [0, 0.06, 0] }, S(8), S(28));
      b.capsule(0.022, 0.26, 0xffffff, { p: [0, -0.17, 0] }, 2, S(8));
      // Schleife
      for (const s of [1, -1]) b.sphere(1, 0xffe04a, { p: [s * 0.055, -0.11, 0.02], s: [0.06, 0.032, 0.02], r: [0, 0, s * 0.3] }, S(10), S(6));
      b.sphere(0.022, 0xffc21a, { p: [0, -0.11, 0.025] }, S(8), S(6));
    } else if (kind === 'riegel') {
      b.box(0.36, 0.16, 0.07, { v: (x, y, z, nx, ny, nz) => {
        if (nz > 0.6 && x > -0.02) { const fx = ((x + 0.18) / 0.09) % 1, fy = ((y + 0.08) / 0.08) % 1; return fx < 0.12 || fy < 0.12 ? HW.chocLow : HW.chocHi; }
        return mix(HW.chocLow, HW.choc, smoothstep(ny * 0.5 + 0.6));
      } }, { p: [0.02, 0, 0] }, 0.025, 2);
      // Hülle (linke Hälfte), mit Zackenrand und Etikett-Streifen
      b.box(0.21, 0.185, 0.095, { v: (x, y, z, nx, ny, nz) => (Math.abs(y) < 0.03 && nz > 0.5 ? 0xffffff : mix(c1, mix(c1, 0xffffff, 0.35), smoothstep(ny * 0.5 + 0.5))) }, { p: [-0.085, 0, 0] }, 0.03, 2);
      for (let i = 0; i < 5; i++) b.cone(0.022, 0.04, c1, { p: [0.03, -0.075 + i * 0.0375, 0], r: [0, 0, -Math.PI / 2] }, 4);
    } else if (kind === 'mais') {
      const s = new THREE.Shape();
      s.moveTo(0, 0.2); s.quadraticCurveTo(0.03, 0.2, 0.16, -0.1); s.quadraticCurveTo(0.17, -0.15, 0.12, -0.15);
      s.lineTo(-0.12, -0.15); s.quadraticCurveTo(-0.17, -0.15, -0.16, -0.1); s.quadraticCurveTo(-0.03, 0.2, 0, 0.2);
      b.add(puffyGeo(s, 0.06, 0.04, S(8), lo ? 2 : 3), { v: (x, y) => (y > 0.08 ? HW.candyCorn[0] : y > -0.05 ? HW.candyCorn[1] : HW.candyCorn[2]) });
    } else {
      // Wickelbonbon: Kugel mit Spiralstreifen, zwei gerüschte Enden, Wickelknoten
      b.sphere(1, (x, y, z) => (Math.sin(Math.atan2(z, y) * 3 + x * 9) > 0 ? c1 : 0xffffff), { s: [0.13, 0.1, 0.1] }, S(20), S(12));
      for (const s of [1, -1]) {
        const pts = [[0, 0], [0.025, 0.004], [0.05, 0.03], [0.08, 0.075], [0.095, 0.1], [0.07, 0.11], [0, 0.105]];
        const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), S(14));
        const P = g.attributes.position;
        for (let i = 0; i < P.count; i++) { const a = Math.atan2(P.getZ(i), P.getX(i)); const k = P.getY(i) / 0.1; P.setY(i, P.getY(i) + Math.sin(a * 7) * 0.012 * k * k); }
        g.computeVertexNormals();
        b.add(g, mix(c1, 0xffffff, 0.25), { p: [s * 0.12, 0, 0], r: [0, 0, -s * Math.PI / 2] });
        b.torus(0.026, 0.012, c2, { p: [s * 0.125, 0, 0], r: [0, Math.PI / 2, 0] }, S(6), S(12));
      }
    }
    return b.geometry();
  });
}

// ------------------------------------------------------------------ Fledermaus
/** Fledermausflügel (rechter Flügel, Ansatz im Ursprung, Spannweite 1 nach +X, Bogen-Saum unten), Fläche in XY. */
export function batWingShape() {
  const s = new THREE.Shape();
  s.moveTo(0, 0.12);
  s.quadraticCurveTo(0.3, 0.32, 0.62, 0.3);
  s.quadraticCurveTo(0.86, 0.3, 1.0, 0.16);
  // Saum: drei Bögen zwischen den Fingerspitzen
  s.quadraticCurveTo(0.9, -0.02, 0.86, -0.14);
  s.quadraticCurveTo(0.72, -0.02, 0.58, -0.16);
  s.quadraticCurveTo(0.44, -0.02, 0.3, -0.12);
  s.quadraticCurveTo(0.16, -0.02, 0, -0.08);
  s.closePath();
  return s;
}
/** Flügel-Geometrie mit Fingerknochen (span m), gepolstert; color/finger. */
export function batWingGeo(span = 0.45, color = HW.lila, finger = HW.lilaDeep, lo = false, key = 'w') {
  return cached(`hw:batwing:${span}:${color}:${finger}:${lo}:${key}`, () => {
    const b = new Build();
    const g = lo ? new THREE.ShapeGeometry(batWingShape(), 4) : puffyGeo(batWingShape(), 0.02, 0.025, 12, 2);
    g.scale(span, span, span);
    b.add(g, { v: (x, y) => mix(mix(color, 0xffffff, 0.15), color, smoothstep(x / span)) });
    for (const [x, y] of [[0.86, -0.14], [0.58, -0.16], [0.3, -0.12], [1.0, 0.16]]) {
      if (lo) { b.tube([[0.02 * span, 0.14 * span, 0.004], [x * span, y * span, 0.004]], 0.014 * span / 0.45, finger, null, 1, 3); continue; }
      b.tube([[0.02 * span, 0.14 * span, 0], [x * 0.55 * span, (0.25 + y * 0.3) * span, 0.004], [x * span, y * span, 0]], 0.012 * span / 0.45, finger, null, 8, 5);
    }
    b.sphere(0.022 * span / 0.45, finger, { p: [0.62 * span, 0.3 * span, 0] }, 6, 4);
    return b.geometry();
  });
}

// ------------------------------------------------------------------ Grabstein
/**
 * Grabstein mit Lachgesicht (Ursprung = Mitte der Unterseite, Vorderseite +X): kind 'rund' (Bogen oben), 'kreuz',
 * 'spitz' (Spitzbogen); h Höhe (≈1). Gesicht: geschlossene Lachaugen ^^ und offener Lachmund (vertexgefärbt eingelegt),
 * Moos und kleiner Sockel. lo = sparsam (Instanzen).
 */
export function graveGeo(kind = 'rund', h = 1, lo = false, face = true) {
  return cached(`hw:grave:${kind}:${h}:${lo}:${face}`, () => {
    const b = new Build();
    const w = h * 0.68, d = h * 0.2;
    const stoneV = { v: (x, y, z, nx, ny) => {
      const n = noise3(x * 6, y * 6, z * 6);
      let c = mix(HW.stoneLow, HW.stone, smoothstep(ny * 0.4 + 0.55 + (n - 0.5) * 0.5));
      if (ny > 0.55) c = mix(c, HW.stoneHi, 0.45);
      if (y < h * 0.16 && n > 0.55) c = mix(c, HW.moss, 0.7);
      return c;
    } };
    // Platte: Umriss in XY (Breite z → hier x der Form), extrudiert
    const s = new THREE.Shape();
    if (kind === 'kreuz') {
      const a = w * 0.2, t = h * 0.62;
      s.moveTo(-a, 0); s.lineTo(a, 0); s.lineTo(a, t - a); s.lineTo(w / 2, t - a); s.lineTo(w / 2, t + a); s.lineTo(a, t + a);
      s.lineTo(a, h); s.lineTo(-a, h); s.lineTo(-a, t + a); s.lineTo(-w / 2, t + a); s.lineTo(-w / 2, t - a); s.lineTo(-a, t - a); s.closePath();
    } else if (kind === 'spitz') {
      s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h * 0.6); s.quadraticCurveTo(w / 2, h * 0.86, 0, h); s.quadraticCurveTo(-w / 2, h * 0.86, -w / 2, h * 0.6); s.closePath();
    } else {
      s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h - w / 2); s.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); s.closePath();
    }
    const slab = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: d * 0.3, bevelSize: d * 0.28, bevelSegments: lo ? 1 : 3, curveSegments: lo ? 8 : 18 });
    slab.translate(0, 0, -d / 2);
    slab.rotateY(Math.PI / 2); // Fläche → +X
    b.add(lo ? slab : smoothNormals(slab), stoneV, { p: [0, h * 0.06, 0] });
    // Sockel
    b.box(d * 2.6, h * 0.1, w * 1.12, gradV(HW.stoneLow, HW.stone), { p: [0, h * 0.05, 0] }, 0.03, lo ? 1 : 2);
    if (face) {
      const fx = d / 2 + d * 0.3 + 0.002;
      const fy = kind === 'kreuz' ? h * 0.68 : h * 0.6;
      const fw = kind === 'kreuz' ? w * 0.18 : w * 0.3;
      // Lachaugen ^ ^ (Bögen) und offener Lachmund mit Zunge
      for (const sz of [1, -1]) b.torus(fw * 0.32, fw * 0.075, HW.ink, { p: [fx, fy + fw * 0.02, sz * fw * 0.62], r: [0, Math.PI / 2, 0] }, lo ? 4 : 6, lo ? 8 : 14, Math.PI);
      const m = new THREE.Shape();
      m.moveTo(-fw * 0.7, 0); m.quadraticCurveTo(0, fw * 0.12, fw * 0.7, 0); m.quadraticCurveTo(fw * 0.6, -fw * 0.85, 0, -fw * 0.85); m.quadraticCurveTo(-fw * 0.6, -fw * 0.85, -fw * 0.7, 0);
      const mg = new THREE.ExtrudeGeometry(m, { depth: 0.01, bevelEnabled: false, curveSegments: lo ? 4 : 8 });
      mg.rotateY(Math.PI / 2);
      b.add(mg, { v: (x, y) => (y < fy - fw * 0.5 ? HW.tongue : HW.mouth) }, { p: [fx - 0.004, fy - fw * 0.36, 0] });
      for (const sz of [1, -1]) b.sphere(fw * 0.2, HW.cheek, { p: [fx - 0.012, fy - fw * 0.32, sz * fw * 1.05], s: [0.25, 0.6, 1] }, lo ? 6 : 10, lo ? 4 : 6);
    }
    return b.geometry();
  });
}

// ------------------------------------------------------------------ Hexenhut
/**
 * Hexenhut (Ursprung = Mitte der Krempe unten): breite, leicht gewellte Krempe, Kegel mit nach hinten (−X) geknickter
 * Spitze, orange Band mit Goldschnalle, aufgenähter Stern. hatH Höhe ab Krempe, brim Krempenradius.
 */
export function witchHatGeo(hatH = 0.7, brim = 0.46, lo = false, colors = [HW.witch, HW.witchHi, HW.witchLow]) {
  return cached(`hw:hat:${hatH}:${brim}:${lo}:${colors.join(',')}`, () => {
    const [base, hi, low] = colors;
    const b = new Build();
    const q = lo ? 0.55 : 1, S = (n) => Math.max(5, Math.round(n * q));
    // Krempe: flache, nach außen leicht aufgebogene Scheibe (Drehkörper), Rand gewellt
    const bp = [[0, 0.02], [brim * 0.6, 0.012], [brim * 0.92, 0.03], [brim, 0.06], [brim * 0.98, 0.075], [brim * 0.9, 0.05], [brim * 0.6, 0.04], [0, 0.05]];
    const br = new THREE.LatheGeometry(bp.map(([r, y]) => new THREE.Vector2(r, y)), S(48));
    const P = br.attributes.position;
    for (let i = 0; i < P.count; i++) { const a = Math.atan2(P.getZ(i), P.getX(i)); const r = Math.hypot(P.getX(i), P.getZ(i)) / brim; P.setY(i, P.getY(i) + Math.sin(a * 3 + 0.5) * 0.02 * r * r); }
    b.add(smoothNormals(br), { v: (x, y, z, nx, ny) => mix(low, base, smoothstep(ny * 0.6 + 0.4)) });
    // Kegel mit Knick: Drehkörper, dessen obere Hälfte nach −X gebogen wird
    const cp = [[brim * 0.52, 0.04], [brim * 0.5, hatH * 0.12], [brim * 0.42, hatH * 0.3], [brim * 0.3, hatH * 0.5], [brim * 0.2, hatH * 0.68], [brim * 0.11, hatH * 0.84], [brim * 0.04, hatH * 0.97], [0, hatH]];
    const cone = new THREE.LatheGeometry(cp.map(([r, y]) => new THREE.Vector2(r, y)), S(32));
    const C = cone.attributes.position;
    for (let i = 0; i < C.count; i++) {
      const y = C.getY(i), t = clamp((y - hatH * 0.45) / (hatH * 0.55), 0, 1);
      const bend = t * t * hatH * 0.42;
      C.setX(i, C.getX(i) - bend);
      C.setY(i, y - t * t * t * hatH * 0.16);
    }
    b.add(smoothNormals(cone), { v: (x, y, z, nx, ny) => mix(low, mix(base, hi, smoothstep(nx * 0.5 + ny * 0.3 + 0.1) * 0.6), smoothstep(y / (hatH * 0.4) + 0.2)) });
    // Band + Schnalle + Stern
    b.cyl(brim * 0.515, brim * 0.525, hatH * 0.13, HW.band, { p: [0, hatH * 0.1, 0] }, S(32));
    b.box(0.04, hatH * 0.16, brim * 0.3, HW.buckle, { p: [brim * 0.5, hatH * 0.1, 0] }, 0.012, 1);
    b.box(0.045, hatH * 0.09, brim * 0.17, HW.band, { p: [brim * 0.505, hatH * 0.1, 0] }, 0.01, 1);
    return b.geometry();
  });
}

// ------------------------------------------------------------------ Texturen
/** Weiche, wolkige Nebel-Karte (Alpha), 128 px. */
export function fogTexture() {
  return canvasTexture('hw:fog', 128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const blobs = [[0.5, 0.55, 0.42], [0.3, 0.6, 0.28], [0.7, 0.58, 0.3], [0.45, 0.42, 0.25], [0.62, 0.45, 0.22]];
    for (const [x, y, r] of blobs) {
      const g = ctx.createRadialGradient(x * w, y * h, 0, x * w, y * h, r * w);
      g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(0.6, 'rgba(255,255,255,0.18)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
  });
}

/**
 * Röhre mit veränderlichem Radius (Äste, Stängel): pts = [[x,y,z], …] (Catmull-Rom), r(t) Radius je Anteil t (0..1).
 * Liefert eine nicht farbige Geometrie (für Build.add). Enden zu (Spitze r → 0 schließt von selbst).
 */
export function taperTube(pts, r, seg = 16, rs = 8) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
  const frames = curve.computeFrenetFrames(seg, false);
  const pos = [], idx = [];
  const P = new THREE.Vector3(), N = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    curve.getPointAt(t, P);
    const rr = typeof r === 'function' ? r(t) : r;
    for (let j = 0; j <= rs; j++) {
      const a = (j / rs) * TAU;
      N.copy(frames.normals[i]).multiplyScalar(-Math.cos(a)).addScaledVector(frames.binormals[i], Math.sin(a));
      pos.push(P.x + N.x * rr, P.y + N.y * rr, P.z + N.z * rr);
    }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < rs; j++) {
    const a = i * (rs + 1) + j, b = (i + 1) * (rs + 1) + j;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Punktrichtung → Ellipsoid-Fläche (für eigene Gesichter auf runden Körpern). */
export function ellSurf(c, r) {
  return (az, el) => {
    const d = [Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)];
    return { p: new THREE.Vector3(c[0] + d[0] * r[0], c[1] + d[1] * r[1], c[2] + d[2] * r[2]), n: new THREE.Vector3(d[0] / r[0], d[1] / r[1], d[2] / r[2]).normalize() };
  };
}
/** Kürbisfläche als surf()-Funktion, verschoben um c. */
export const pkSurf = (P, c = [0, 0, 0]) => (az, el) => { const s = pkPoint(P, az, el); s.p.x += c[0]; s.p.y += c[1]; s.p.z += c[2]; return s; };

export { THREE, TAU, Build, cached, vcol, basic, std, col, mix, clamp, smoothstep, placed };
