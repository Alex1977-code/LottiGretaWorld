// Gemeinsame Teile der Welt-6-Modelle „Wolkeninseln“ (src/course/models/kinds/*_w6.js, lib/instanced_w6.js).
// Ergänzt kit.js, ändert nichts daran. Figuren und Gimmicks nutzen die geteilten kit-Materialien (std, vcol, metal) und
// bekommen so den Spielzeug-Look; Kulisse nutzt kulMat()/kulGlow() (Spielzeug-Look aus: `toy: false`) und bleibt „backbar“
// (blocks/w2kit.js bakeModel: undurchsichtige, vertexgefärbte Meshes → Welt-Material, unbeleuchtete → Glüh-Material).
//
//  - W6                Paletten (Wolken, Schubser-Lila, Gelee, Holz, Lack, Papier, Messing, Dschungel …)
//  - kulMat/kulGlow    Kulissen-Materialien; glowV() unbeleuchtet vertexgefärbt; addMat() additiv
//  - fibDirs(n)        gleichmäßig verteilte Richtungen auf der Kugel
//  - spikeBallGeo      Stachelkugel (Kugel + gerundete Kegel-Stacheln), auch für den Stachelwerfer
//  - cloudGeo          Wolke aus Kugel-Puffs (weiß oben, lavendel unten), flache Oberseite möglich
//  - superCube         gerundeter „Superellipsoid“-Würfel (Gelee-Würfel, Quetschblock-Kanten)
//  - JELLY/jellyColors Gelee-Farben; jellyGeo (Gelee-Würfel mit Glanz), jellyMat (Gelee bzw. Metall für silber/gold)
//  - schubser*         Körper der Schubser-Familie (Schubser und Schubser-Prinz teilen die Bauweise)
//  - bowlerGeo         Melone (Hut der Würfelblase)
//  - beltTexture       Förderband-Textur (Pfeile, wiederholbar)
//  - gitterGeo         Klettergitter-Kachel (Bambus-Rahmen, geflochtene Ranken)
//  - wuschelLoGeo      sparsamer Wuschel für die Horde (≈ 260 Dreiecke)
//  - kieferGeo         Bergkiefer (Einzelmodell und Instanzen)
//  - hullGeo/hullShape Schiffsrumpf (Geisterschiff, Wrack)
//  - brockenGeo        Gelee-Brocken mit Knopfaugen (Einzelmodell, Gelee-Riese, Instanzen)
//  - beltFrameGeo, beltRollerGeo, beltTopGeo  Förderband-Teile (Einzelmodell und Instanzen)

import {
  THREE, TAU, Build, cached, vcol, basic, std, metal, col, mix, clamp, smoothstep, smoothNormals, placed, canvasTexture,
  onEllipsoid,
} from './kit.js';
import { puffyGeo, roundRectShape, gradV, heightV, mixV, mouthShape, ownMat, glowVcol, additive } from './w5Geos.js';
import { noise3, hash1, displace, lumpyEllipsoid } from './w4Geos.js';
import { taperTube, ellSurf } from './hwGeos.js';
import { stick, Puffs } from './kit_w3.js';

export { puffyGeo, roundRectShape, gradV, heightV, mixV, mouthShape, ownMat, glowVcol, additive, noise3, hash1, displace,
  lumpyEllipsoid, taperTube, ellSurf, stick, Puffs };

// ------------------------------------------------------------------ Paletten
export const W6 = {
  cloud: 0xffffff, cloudMid: 0xeef0ff, cloudLow: 0xc4c8f4, cloudShade: 0xa4a8e4,
  plum: 0x5c2e8e, plumHi: 0x9a6ad8, plumLow: 0x2c1250, plumDeep: 0x1c0a34,
  horn: 0xfff2d0, hornTip: 0xffb83a, hoof: 0xff9a3a, hoofHi: 0xffc878, hoofLow: 0xc0601a,
  muzzle: 0xffc8b4, muzzleHi: 0xffe8dc, nostril: 0x5a1a3a,
  gold: 0xffc21a, goldHi: 0xfff0a0, goldLow: 0xc88a10, ruby: 0xff2a5a, rubyHi: 0xff9ab8,
  red: 0xe8283a, redHi: 0xff6a6a, redLow: 0x9a1022, ermine: 0xfffaf0, erminePt: 0x2a1a2a,
  ink: 0x1e1428, mouth: 0x5a1430, tongue: 0xff7a8a, cheek: 0xff8aa8, white: 0xffffff, tooth: 0xffffff,
  wood: 0xc07a3e, woodHi: 0xe8a868, woodLow: 0x7a4620, woodDark: 0x4a2a14,
  ghost: 0x6a8a8e, ghostHi: 0x9ab8b4, ghostLow: 0x34484e, ghostDark: 0x1e2a30, ghostGlow: 0x7affd8, moss: 0x5a9a6a,
  lacquer: 0xd8302a, lacquerHi: 0xff6a4a, lacquerLow: 0x8a1418, paper: 0xfff6e2, paperShade: 0xf0dcb8, ink2: 0x2a1a14,
  bronze: 0xd8902a, bronzeHi: 0xffd27a, bronzeLow: 0x8a4a14,
  steel: 0xb8c4d6, steelHi: 0xeef4ff, steelLow: 0x5e6a80, iron: 0x3a4052, ironHi: 0x6a7490, hazard: 0xffc21a,
  brass: 0xe8b040, brassHi: 0xfff0a8, brassLow: 0x9a6a18, copper: 0xd8784a,
  leaf: 0x34b84a, leafHi: 0x8ae86a, leafLow: 0x14702e, vein: 0xc8f8a0, gift: 0x9a3ae0, giftHi: 0xe08aff, giftLow: 0x4e1290,
  bamboo: 0xd8c86a, bambooHi: 0xf4ec9a, bambooLow: 0x8a8a2a, vine: 0x4a9a3a, vineHi: 0x8ad05a,
  pine: 0x2a7a4a, pineHi: 0x5ab86a, pineLow: 0x144a30, bark: 0x8a4a2a, barkHi: 0xb8703a, barkLow: 0x4a2414,
  rock: 0xa89ab8, rockHi: 0xd8d0e4, rockLow: 0x6a5e80, grass: 0x6ac850, grassHi: 0xa8ec6a,
  blossom: 0xffb0d0, blossomHi: 0xffe4f0, blossomLow: 0xe878a8,
  snow: 0xffffff, snowLow: 0xc4d8f0, ice: 0x8ad8ff, iceHi: 0xd8f6ff,
};

// ------------------------------------------------------------------ Materialien
/** Kulissen-Material (vertexgefärbt, ohne Spielzeug-Look). */
export const kulMat = (r = 0.7) => vcol(r, { toy: false }, 'w6kul');
/** Kulissen-Material beidseitig (Blätter, Segel). */
export const kulMat2 = () => vcol(0.7, { toy: false, side: THREE.DoubleSide }, 'w6kul2');
/** Unbeleuchtetes, vertexgefärbtes Material (Laternenlicht, Glut, Geisterlicht). */
export const glowV = () => basic('vcol:w6glow', { vertexColors: true, toneMapped: false });
/** Additiver Schein. */
export const addMat = (key, color, opacity = 0.7) => basic(`w6add:${key}`, { color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
/** Glasröhren-Material – gleiche Werte wie props.js 'glass_pipe_segment' (geteilter Cache-Schlüssel). */
export const glassMat = () => std('glassPipe', { color: 0xbfeaff, transparent: true, opacity: 0.34, roughness: 0.04, side: THREE.DoubleSide, depthWrite: false, emissive: 0x0a2a3a });

// ------------------------------------------------------------------ Kugel-Richtungen
/** n gleichmäßig verteilte Einheitsvektoren (Fibonacci-Kugel). */
export function fibDirs(n, seed = 0) {
  const out = [], ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - ((i + 0.5) / n) * 2, r = Math.sqrt(Math.max(0, 1 - y * y)), a = i * ga + seed;
    out.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
  }
  return out;
}

// ------------------------------------------------------------------ Stachelkugel
/** Gerundeter Stachel (Achse +Z, Fuß bei z = 0, Spitze bei z = len). */
function spikeGeo(w, len, rs = 8) {
  const pts = [[0, 0], [w, 0], [w * 0.9, len * 0.22], [w * 0.62, len * 0.55], [w * 0.3, len * 0.84], [w * 0.1, len * 0.97], [0, len]];
  const g = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), rs);
  g.rotateX(Math.PI / 2);
  return g;
}
/** Sparsamer Stachel (Kegel, 6 Seiten, Achse +Z, Fuß bei z = 0). */
function loSpike(w, len) { const g = new THREE.ConeGeometry(w, len, 6, 1, true); g.rotateX(Math.PI / 2); g.translate(0, 0, len / 2); return g; }
export const SPIKE_COLORS = {
  eisen: { ball: 0x3c3a5a, ballHi: 0x8a86b8, band: 0xffc21a, spike: 0xfff2d8, tip: 0xffffff },
  lila: { ball: 0x5c2e8e, ballHi: 0xb08ae8, band: 0xff8a3a, spike: 0xfff2d8, tip: 0xffffff },
  rot: { ball: 0x8a1a2a, ballHi: 0xff6a6a, band: 0xffc21a, spike: 0xfff6e0, tip: 0xffffff },
};
/** Stachelkugel Ø 1 (Mitte im Ursprung): Kugel mit Goldband und n Stacheln. lo: sparsam (Instanzen, Geschosse). */
export function spikeBallGeo(color = 'eisen', lo = false) {
  const C = SPIKE_COLORS[color] ?? SPIKE_COLORS.eisen;
  return cached(`w6:spikeball:${color}:${lo}`, () => {
    const b = new Build();
    const R = 0.3;
    b.sphere(R, { v: (x, y, z, nx, ny) => mix(C.ball, C.ballHi, smoothstep(ny * 0.55 + nx * 0.2 + 0.35)) }, {}, lo ? 16 : 30, lo ? 10 : 20);
    b.torus(R * 0.995, 0.028, C.band, { r: [Math.PI / 2, 0, 0] }, 6, lo ? 24 : 40);
    const dirs = fibDirs(lo ? 18 : 26, 0.4);
    for (const d of dirs) {
      if (Math.abs(d.y) < 0.12) continue; // Band frei
      b.add(lo ? loSpike(0.075, 0.24) : spikeGeo(0.08, 0.24, 9), { v: (x, y, z) => mix(C.spike, C.tip, smoothstep(z / 0.24)) }, placed(d.clone().multiplyScalar(R * 0.86), d, new THREE.Vector3(1, 1, 1)));
    }
    // Stacheln rund um das Band (schräg, damit es lesbar bleibt)
    for (let i = 0; i < (lo ? 6 : 8); i++) {
      const a = (i / (lo ? 6 : 8)) * TAU + 0.2;
      for (const s of [1, -1]) {
        const d = new THREE.Vector3(Math.cos(a), s * 0.28, Math.sin(a)).normalize();
        if (lo && s < 0) continue;
        b.add(lo ? loSpike(0.07, 0.22) : spikeGeo(0.075, 0.22, 9), { v: (x, y, z) => mix(C.spike, C.tip, smoothstep(z / 0.22)) }, placed(d.clone().multiplyScalar(R * 0.86), d, new THREE.Vector3(1, 1, 1)));
      }
    }
    return b.geometry();
  });
}
export const spikeMat = () => vcol(0.3, {}, 'w6spike');

// ------------------------------------------------------------------ Wolken
/**
 * Wolke aus Kugel-Puffs: puffs = [[x, y, z, r], …] (Meter). Farbe je Ecke nach Weltlage y: unten lo, oben hi.
 * flatTop: Oberseite bei dieser Höhe abflachen (begehbare Wolken). ws/hs Segmente.
 */
export function cloudGeo(key, puffs, o = {}) {
  return cached(`w6:cloud:${key}`, () => {
    const b = new Build();
    let y0 = Infinity, y1 = -Infinity;
    for (const [, y, , r] of puffs) { y0 = Math.min(y0, y - r); y1 = Math.max(y1, y + r); }
    const lo = o.lo ?? W6.cloudShade, mid = o.mid ?? W6.cloudLow, hi = o.hi ?? W6.cloud;
    const top = o.flatTop;
    for (const [px, py, pz, r] of puffs) {
      const g = new THREE.SphereGeometry(r, o.ws ?? 18, o.hs ?? 12);
      if (top !== undefined) {
        const P = g.attributes.position;
        for (let i = 0; i < P.count; i++) {
          const wy = P.getY(i) + py;
          if (wy > top) P.setY(i, top - py + (wy - top) * 0.08);
        }
        g.computeVertexNormals();
      }
      b.add(g, { v: (x, y, z, nx, ny) => {
        const k = smoothstep(((y + py) - y0) / Math.max(0.01, y1 - y0));
        const c = k < 0.5 ? mix(lo, mid, k * 2) : mix(mid, hi, (k - 0.5) * 2);
        return mix(c, hi, smoothstep(ny * 0.8 + 0.1) * 0.55);
      } }, { p: [px, py, pz] });
    }
    return b.geometry();
  });
}
/** Zufällige, aber feste Puff-Anordnung für eine Wolke w × h × d (Mitte unten im Ursprung). */
export function cloudPuffs(w, h, d, seed = 1, n = 9) {
  const out = [];
  const rr = Math.min(h * 0.75, Math.min(w, d) * 0.42);
  // Kern-Reihe
  const nx = Math.max(2, Math.round(w / (rr * 1.15)));
  for (let i = 0; i < nx; i++) {
    const t = nx > 1 ? i / (nx - 1) : 0.5;
    const x = (t - 0.5) * (w - rr * 1.3);
    const r = rr * (0.82 + hash1(seed * 17 + i) * 0.3) * (1 - Math.abs(t - 0.5) * 0.35);
    out.push([x, h * 0.55, (hash1(seed * 5 + i) - 0.5) * d * 0.25, r]);
  }
  // Ränder vorn/hinten und kleine Kuppen oben
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + hash1(seed + i) * 0.5;
    const r = rr * (0.55 + hash1(seed * 3 + i) * 0.3);
    out.push([Math.cos(a) * (w / 2 - r * 0.8), h * (0.35 + hash1(seed * 7 + i) * 0.3), Math.sin(a) * (d / 2 - r * 0.8), r]);
  }
  return out;
}

// ------------------------------------------------------------------ Superellipsoid-Würfel
/** Gerundeter Würfel (Kante 1, Mitte im Ursprung) aus einer Kugel: p = d / ‖d‖ₙ (n = 4 weich, 8 kantig). */
export function superCube(n = 4, ws = 32, hs = 24) {
  const g = new THREE.SphereGeometry(1, ws, hs);
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    const l = Math.pow(Math.abs(x) ** n + Math.abs(y) ** n + Math.abs(z) ** n, 1 / n) || 1;
    P.setXYZ(i, (x / l) * 0.5, (y / l) * 0.5, (z / l) * 0.5);
  }
  g.computeVertexNormals();
  return g;
}

// ------------------------------------------------------------------ Gelee
export const JELLY = {
  rot: [0xff3a5a, 0xff9ab0, 0xb8143a],
  blau: [0x3a8aff, 0x9ad0ff, 0x1a3ab8],
  gruen: [0x3ad86a, 0xaaf8b8, 0x14904a],
  gelb: [0xffd23a, 0xfff2a0, 0xd8901a],
  lila: [0xa45aff, 0xdab0ff, 0x5a24b8],
  orange: [0xff8a2a, 0xffc890, 0xc8500a],
  rosa: [0xff6ac8, 0xffc0e8, 0xc02a8a],
  silber: [0xd0d8ec, 0xffffff, 0x8a92b0],
  gold: [0xffc21a, 0xfff0a0, 0xb8780a],
};
export const JELLY_NAMES = Object.keys(JELLY);
export const jellyColor = (c) => (JELLY[c] ? c : 'rot');
export const isMetalJelly = (c) => c === 'silber' || c === 'gold';
/** Gelee-Material: glänzend (Farbe aus den Ecken); silber/gold als Metall mit Spiegelung. */
export function jellyMat(color) {
  if (color === 'silber') return metal('w6:jellySilber', { vertexColors: true, metalness: 0.62, roughness: 0.2 }, 1.0);
  if (color === 'gold') return metal('w6:jellyGold', { vertexColors: true, metalness: 0.78, roughness: 0.2, emissive: 0x2a1a00 }, 1.15);
  return vcol(0.12, {}, 'w6jelly');
}
/**
 * Gelee-Würfel (Kante 1, Ursprung = Mitte der Unterseite, y 0..1): weicher Superellipsoid, Farbverlauf (oben hell, unten
 * satt), heller Innenschimmer, zwei Glanzflecken oben vorn. lo: sparsam (Instanzen).
 */
export function jellyGeo(color = 'rot', lo = false) {
  const C = JELLY[jellyColor(color)];
  return cached(`w6:jelly:${color}:${lo}`, () => {
    const b = new Build();
    b.add(superCube(lo ? 3.2 : 3.6, lo ? 13 : 30, lo ? 10 : 22), { v: (x, y, z, nx, ny) => {
      const base = mix(C[2], C[0], smoothstep(ny * 0.6 + 0.45 + y * 0.6));
      return mix(base, C[1], smoothstep((ny - 0.55) / 0.45) * 0.6);
    } }, { p: [0, 0.5, 0], s: [1, 0.96, 1] });
    // Glanzflecken (oben links vorn)
    const g1 = new THREE.SphereGeometry(1, lo ? 8 : 12, lo ? 4 : 6, 0, TAU, 0, Math.PI / 2);
    b.add(g1, 0xffffff, { p: [0.18, 0.955, -0.22], s: [0.13, 0.012, 0.07], r: [0, 0.5, 0] });
    if (!lo) b.add(new THREE.SphereGeometry(1, 10, 5, 0, TAU, 0, Math.PI / 2), 0xffffff, { p: [0.33, 0.93, -0.06], s: [0.05, 0.01, 0.04] });
    return b.geometry();
  });
}

// ------------------------------------------------------------------ Schubser-Familie
/** Körper-Maße des Schubsers (Maßstab 1): Mitte, Halbachsen. */
export const SB = { c: [0, 0.5, 0], r: [0.43, 0.41, 0.43] };
export const SB_EYES = [1, -1].map((s) => {
  const h = onEllipsoid(SB.c, SB.r, s * 0.34, 0.3);
  return { p: h.p.toArray(), r: 0.115, sy: 1.22, dir: h.n.clone().lerp(new THREE.Vector3(1, 0.05, 0), 0.25).toArray() };
});
/** Hörnchen-Kurve (Weltpunkte) an der Seite s: aus dem Kopf schräg nach außen-oben, Spitze nach vorn gebogen. */
function hornPts(s, k = 1) {
  const base = onEllipsoid(SB.c, SB.r, s * 0.78, 0.62).p;
  const out = new THREE.Vector3(0.05, 0.55, s * 0.85).normalize();
  const p0 = base.clone().addScaledVector(out, -0.04);
  const p1 = base.clone().addScaledVector(out, 0.1 * k);
  const p2 = p1.clone().add(new THREE.Vector3(0.05, 0.09, s * 0.05).multiplyScalar(k));
  const p3 = p2.clone().add(new THREE.Vector3(0.1, 0.05, -s * 0.0).multiplyScalar(k));
  return [p0, p1, p2, p3].map((v) => v.toArray());
}
/**
 * Schubser-Körper (Maßstab 1, Ursprung Fußpunkt; ohne Augen, Brauen, Füße): glänzende Lila-Kugel mit hellem Bauch,
 * cremiger Schnauze mit Nüstern, grimmigem Mund mit zwei Hauern, Hörnchen, Schwanzquaste.
 * P = Palette { body, hi, low, belly, horn, hornTip }.
 */
export function schubserBodyGeo(key, P, o = {}) {
  return cached(`w6:sb:body:${key}`, () => {
    const b = new Build();
    b.sphere(1, { v: (x, y, z, nx, ny) => {
      const base = mix(P.low, P.body, smoothstep(ny * 0.7 + 0.55));
      const top = mix(base, P.hi, smoothstep((ny - 0.35) / 0.6) * 0.65);
      // heller Bauchfleck vorn unten
      const belly = smoothstep((nx - 0.25) / 0.35) * smoothstep((-ny + 0.15) / 0.4);
      return mix(top, P.belly, belly * 0.8);
    } }, { p: SB.c, s: SB.r }, o.ws ?? 36, o.hs ?? 26);
    // Schnauze
    const mz = onEllipsoid(SB.c, SB.r, 0, -0.08);
    const mc = mz.p.clone().addScaledVector(mz.n, -0.02);
    b.sphere(1, { v: (x, y, z, nx, ny) => mix(W6.muzzle, W6.muzzleHi, smoothstep(ny * 0.6 + nx * 0.3 + 0.2)) }, { p: mc.toArray(), s: [0.12, 0.13, 0.22] }, 24, 16);
    for (const s of [1, -1]) b.sphere(1, W6.nostril, { p: [mc.x + 0.105, mc.y + 0.015, s * 0.075], s: [0.025, 0.04, 0.03] }, 10, 8);
    // Mund: grimmiger Bogen unter der Schnauze, zwei Hauer
    const mo = onEllipsoid(SB.c, SB.r, 0, -0.42);
    b.add(puffyGeo(mouthShape('grim'), 0.03, 0.012, 14, 2), W6.mouth, placed(mo.p.clone().addScaledVector(mo.n, -0.012), mo.n, new THREE.Vector3(0.14, 0.06, 1)));
    for (const s of [1, -1]) {
      const t = onEllipsoid(SB.c, SB.r, s * 0.2, -0.38);
      b.add(new THREE.ConeGeometry(0.026, 0.07, 8), W6.tooth, { p: t.p.clone().addScaledVector(t.n, 0.01).add(new THREE.Vector3(0, 0.035, 0)).toArray(), r: [s * 0.15, 0, -0.15] });
    }
    // Hörnchen (cremig → goldene Spitze)
    for (const s of [1, -1]) {
      const pts = hornPts(s, o.horn ?? 1);
      const base = new THREE.Vector3(...pts[0]);
      let len = 0; for (let i = 1; i < pts.length; i++) len += new THREE.Vector3(...pts[i]).distanceTo(new THREE.Vector3(...pts[i - 1]));
      const r0 = 0.07 * (o.horn ?? 1);
      b.add(taperTube(pts, (t) => r0 * (1 - t * 0.78), 16, 12), { v: (x, y, z) => mix(P.horn, P.hornTip, smoothstep(new THREE.Vector3(x, y, z).distanceTo(base) / len * 1.2 - 0.25)) }, null);
      b.sphere(r0 * 0.22, P.hornTip, { p: pts[3] }, 8, 6);
      // Hornring
      const rb = new THREE.Vector3(...pts[1]);
      const dir = new THREE.Vector3(...pts[1]).sub(base).normalize();
      b.add(new THREE.TorusGeometry(r0 * 0.88, r0 * 0.18, 6, 16), P.hornTip, placed(rb.clone().addScaledVector(dir, -0.03), dir, new THREE.Vector3(1, 1, 1)));
    }
    // Schwanzquaste hinten
    const tl = onEllipsoid(SB.c, SB.r, Math.PI, 0.05);
    b.add(taperTube([tl.p.toArray(), tl.p.clone().add(new THREE.Vector3(-0.08, 0.02, 0)).toArray(), tl.p.clone().add(new THREE.Vector3(-0.13, 0.08, 0)).toArray()], (t) => 0.025 * (1 - t * 0.4), 8, 6), P.low, null);
    b.sphere(0.055, P.hornTip, { p: tl.p.clone().add(new THREE.Vector3(-0.15, 0.11, 0)).toArray(), s: [1, 1.2, 1] }, 10, 8);
    // Wangen
    for (const s of [1, -1]) stick(b, onEllipsoid(SB.c, SB.r, s * 0.62, 0.02), P.cheek ?? W6.cheek, [0.065, 0.04, 0.02], 0.3);
    if (o.extra) o.extra(b);
    return b.geometry();
  });
}
/** Huf/Fuß des Schubsers (Ursprung Fußsohle, Mitte; nach +X länger). */
export const schubserFootGeo = (P) => cached(`w6:sb:foot:${P.hoof}`, () => {
  const b = new Build();
  b.sphere(1, gradV(P.hoofLow, P.hoofHi), { p: [0.03, 0.075, 0], s: [0.15, 0.085, 0.11] }, 18, 12);
  b.cyl(0.1, 0.105, 0.03, P.hoofLow, { p: [0.03, 0.016, 0], s: [1.45, 1, 1.05] }, 18);
  return b.geometry();
});
/** Braue (Kapsel quer, Ursprung Mitte). */
export const browGeo = (color = W6.plumDeep, r = 0.026, len = 0.11) => cached(`w6:brow:${color}:${r}:${len}`, () => new Build().capsule(r, len, color, { r: [Math.PI / 2, 0, 0] }, 3, 10).geometry());
/** Brauen-Lagen über den Schubser-Augen (Maßstab 1). */
export const SB_BROWS = [1, -1].map((s) => { const h = onEllipsoid(SB.c, SB.r, s * 0.3, 0.74); return { p: h.p.clone().addScaledVector(h.n, 0.012), s }; });

// ------------------------------------------------------------------ Hut der Würfelblase
/** Melone (Ursprung = Mitte der Krempe unten): lila Filz, Goldband, Feder. */
export function bowlerGeo(lo = false) {
  return cached(`w6:bowler:${lo}`, () => {
    const b = new Build();
    const felt = { v: (x, y, z, nx, ny) => mix(0x3a1a6a, 0x8a5ad8, smoothstep(ny * 0.5 + nx * 0.25 + 0.3)) };
    b.lathe([[0, 0.0], [0.34, 0.0], [0.4, 0.025], [0.41, 0.045], [0.37, 0.05], [0.22, 0.05], [0.235, 0.12], [0.235, 0.2], [0.21, 0.28], [0.15, 0.33], [0.06, 0.355], [0, 0.36]], felt, null, lo ? 18 : 32, lo ? 0 : 2);
    b.torus(0.236, 0.035, gradV(W6.goldLow, W6.goldHi), { p: [0, 0.095, 0], r: [Math.PI / 2, 0, 0], s: [1, 1, 1.1] }, 6, lo ? 18 : 32);
    // Feder (pink, gebogen) an der linken Seite
    b.add(taperTube([[0.02, 0.1, 0.24], [-0.08, 0.2, 0.27], [-0.2, 0.33, 0.25], [-0.3, 0.4, 0.2]], (t) => 0.045 * Math.sin(Math.PI * (0.15 + t * 0.85)) + 0.004, 12, 8), { v: (x, y) => mix(0xff4aa8, 0xffc0e4, smoothstep((y - 0.1) / 0.3)) }, { s: [1, 1, 0.6] });
    b.sphere(0.04, W6.ruby, { p: [0.0, 0.1, 0.255] }, 10, 8);
    return b.geometry();
  });
}

// ------------------------------------------------------------------ Förderband-Textur
/** Förderband: dunkles Gummi mit gelben Pfeilen (zeigen nach +U), Querrillen. Eine Kachel = 1 m. */
export function beltTexture() {
  return canvasTexture('w6:belt', 128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#2a2e40'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#353a50';
    for (let i = 0; i < 8; i++) ctx.fillRect((i * w) / 8, 0, w / 16, h);
    ctx.fillStyle = '#ffc21a';
    ctx.beginPath();
    ctx.moveTo(w * 0.78, h * 0.5); ctx.lineTo(w * 0.42, h * 0.16); ctx.lineTo(w * 0.42, h * 0.34); ctx.lineTo(w * 0.18, h * 0.34);
    ctx.lineTo(w * 0.18, h * 0.66); ctx.lineTo(w * 0.42, h * 0.66); ctx.lineTo(w * 0.42, h * 0.84); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(w * 0.42, h * 0.17); ctx.lineTo(w * 0.77, h * 0.5); ctx.stroke();
  }, { repeat: true });
}

// ------------------------------------------------------------------ Klettergitter
/**
 * Klettergitter-Kachel w × h (Fläche in Y-Z, Vorderseite +X; Ursprung = Mitte der Unterkante): Bambus-Rahmen,
 * diagonal geflochtene Ranken mit Knoten und Blättchen. frame: Rahmen zeichnen. lo: sparsam (Instanzen).
 */
export function gitterGeo(w = 2, h = 2, frame = true, lo = false) {
  return cached(`w6:gitter:${w}:${h}:${frame}:${lo}`, () => {
    const b = new Build();
    const rs = lo ? 5 : 8;
    const vine = { v: (x, y, z, nx, ny) => mix(W6.vine, W6.vineHi, smoothstep(nx * 0.5 + ny * 0.3 + 0.4)) };
    // diagonale Ranken (Maschenweite 0,5 m)
    const m = 0.5;
    const rod = (a, c, r) => {
      const A = new THREE.Vector3(...a), C = new THREE.Vector3(...c);
      const len = A.distanceTo(C);
      if (len < 0.05) return;
      const g = new THREE.CylinderGeometry(r, r, len, rs, 1, true);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), C.clone().sub(A).normalize());
      b.add(g, vine, new THREE.Matrix4().compose(A.clone().add(C).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
    };
    // Linien z ± y = const innerhalb des Rechtecks [-w/2, w/2] × [0, h]
    const clipLine = (sgn, c) => {
      // Punkte (z, y) mit y = sgn * (z - c) … parametrisiert über z
      const pts = [];
      const z0 = -w / 2, z1 = w / 2;
      const yAt = (z) => sgn * (z - c);
      const zAt = (y) => c + y / sgn;
      for (const z of [z0, z1]) { const y = yAt(z); if (y >= 0 && y <= h) pts.push([z, y]); }
      for (const y of [0, h]) { const z = zAt(y); if (z > z0 && z < z1) pts.push([z, y]); }
      return pts.length >= 2 ? [pts[0], pts[1]] : null;
    };
    const off = 0.02;
    for (const sgn of [1, -1]) {
      for (let c = -w / 2 - h; c <= w / 2 + h; c += m) {
        const seg = clipLine(sgn, c + m / 2);
        if (!seg) continue;
        rod([sgn > 0 ? off : -off, seg[0][1], seg[0][0]], [sgn > 0 ? off : -off, seg[1][1], seg[1][0]], 0.03);
      }
    }
    // Knoten an den Kreuzungen
    if (!lo) {
      for (let z = -w / 2 + m / 2; z < w / 2; z += m / 2) for (let y = m / 2; y < h; y += m / 2) {
        if ((Math.round((z + w / 2) / (m / 2)) + Math.round(y / (m / 2))) % 2) continue;
        b.sphere(0.042, W6.vineHi, { p: [0, y, z], s: [0.8, 1, 1] }, 8, 6);
      }
      // Blättchen
      for (let i = 0; i < Math.round(w * h * 1.5); i++) {
        const z = (hash1(i * 3.1 + w) - 0.5) * w * 0.9, y = hash1(i * 7.7 + h) * h * 0.9 + 0.05;
        const leaf = new THREE.SphereGeometry(1, 8, 5);
        b.add(leaf, { v: (x, yy) => mix(W6.leafLow, W6.leafHi, smoothstep(yy * 0.5 + 0.5)) }, { p: [0.04, y, z], s: [0.02, 0.09, 0.05], r: [hash1(i) * 2, 0, 0] });
      }
    }
    if (frame) {
      const bam = { v: (x, y, z, nx) => mix(W6.bambooLow, W6.bambooHi, smoothstep(nx * 0.6 + 0.5)) };
      for (const s of [1, -1]) {
        b.cyl(0.07, 0.07, h + 0.1, bam, { p: [0, h / 2, s * w / 2] }, lo ? 6 : 10);
        for (let y = 0.4; y < h; y += 0.6) b.torus(0.072, 0.014, W6.bambooLow, { p: [0, y, s * w / 2], r: [Math.PI / 2, 0, 0] }, 4, lo ? 6 : 10);
        b.sphere(0.075, W6.bambooHi, { p: [0, h + 0.05, s * w / 2] }, lo ? 6 : 10, 6);
      }
      for (const y of [0.04, h]) b.cyl(0.055, 0.055, w, bam, { p: [0, y, 0], r: [Math.PI / 2, 0, 0] }, lo ? 6 : 10);
    }
    return b.geometry();
  });
}

// ------------------------------------------------------------------ Wuschel (sparsam)
/** Wuschel für die Horde (Ursprung Fußpunkt, Mitte y = 0,45, Ø ≈0,8): Kern, 14 Stachelbüschel, Augen und Grinsen gebacken. */
export function wuschelLoGeo() {
  return cached('w6:wuschelLo', () => {
    const b = new Build();
    const cy = 0.45;
    b.sphere(0.27, 0x4a2276, { p: [0, cy, 0] }, 10, 7);
    for (const d of fibDirs(16, 0.7)) {
      if (d.x > 0.6 && Math.abs(d.y) < 0.55) continue; // Gesicht frei
      const c = new THREE.ConeGeometry(0.11, 0.3, 5); c.rotateX(Math.PI / 2); c.translate(0, 0, 0.15);
      b.add(c, { v: (x, y, z) => mix(0x5c2a96, 0xff74d4, Math.pow(Math.max(0, z / 0.3), 1.3)) }, placed(new THREE.Vector3(d.x * 0.2, cy + d.y * 0.2, d.z * 0.2), d, new THREE.Vector3(1, 1, 1)));
    }
    for (const s of [1, -1]) {
      b.sphere(1, 0xffffff, { p: [0.21, cy + 0.07, s * 0.1], s: [0.06, 0.1, 0.085] }, 8, 6);
      b.sphere(1, 0x1a0820, { p: [0.265, cy + 0.07, s * 0.095], s: [0.02, 0.055, 0.045] }, 6, 5);
    }
    b.sphere(1, 0x2a0e3a, { p: [0.24, cy - 0.1, 0], s: [0.035, 0.04, 0.12], r: [0, 0, -0.35] }, 8, 5);
    b.cone(0.022, 0.05, 0xffffff, { p: [0.265, cy - 0.075, 0.05], r: [0, 0, Math.PI] }, 5);
    b.cone(0.022, 0.05, 0xffffff, { p: [0.265, cy - 0.075, -0.05], r: [0, 0, Math.PI] }, 5);
    return b.geometry();
  });
}

// ------------------------------------------------------------------ Bergkiefer
/** Bergkiefer (Ursprung Stammfuß, Höhe ≈ h): krummer Stamm, drei flache Schirm-Nadelpolster. lo: sparsam (Instanzen). */
export function kieferGeo(h = 5, lo = false, seed = 1) {
  return cached(`w6:kiefer:${h}:${lo}:${seed}`, () => {
    const b = new Build();
    const bark = { v: (x, y, z, nx) => mix(W6.barkLow, W6.barkHi, smoothstep(nx * 0.5 + 0.45 + noise3(x * 6, y * 3, z * 6) * 0.3 - 0.15)) };
    const lean = (hash1(seed) - 0.5) * 0.25 * h;
    const trunk = [[0, 0, 0], [lean * 0.15, h * 0.3, 0], [lean * 0.5, h * 0.55, h * 0.03], [lean, h * 0.78, 0]];
    b.add(taperTube(trunk, (t) => h * 0.055 * (1 - t * 0.6), lo ? 6 : 12, lo ? 5 : 8), bark, null);
    b.cone(h * 0.09, h * 0.05, W6.barkLow, { p: [0, h * 0.02, 0] }, lo ? 5 : 8);
    // Äste zu den Polstern
    const pads = [[lean * 1.0, h * 0.82, 0, h * 0.34], [lean * 0.4 + h * 0.18, h * 0.62, h * 0.08, h * 0.26], [lean * 0.55 - h * 0.17, h * 0.5, -h * 0.1, h * 0.22]];
    if (!lo) pads.push([lean * 0.8 + h * 0.05, h * 0.7, -h * 0.17, h * 0.18]);
    pads.forEach(([x, y, z, r], i) => {
      if (i > 0) b.add(taperTube([[lean * (y / h) * 0.8, y - h * 0.08, 0], [x * 0.6, y - h * 0.02, z * 0.6], [x, y, z]], (t) => h * 0.022 * (1 - t * 0.5), lo ? 4 : 8, lo ? 4 : 6), bark, null);
      const g = lo ? new THREE.SphereGeometry(1, 10, 6) : lumpyEllipsoid([1, 1, 1], 0.12, 2.2, seed * 3 + i, 18, 10);
      b.add(g, { v: (xx, yy, zz, nx, ny) => mix(W6.pineLow, W6.pineHi, smoothstep(ny * 0.6 + 0.35 + noise3(xx * 5, yy * 5, zz * 5) * 0.25 - 0.1)) }, { p: [x, y, z], s: [r, r * 0.38, r * 0.9] });
    });
    return b.geometry();
  });
}

// ------------------------------------------------------------------ Schiffsrumpf
/**
 * Schiffsrumpf (Bug +X, Deck bei y = 0, Kiel bei y = −H): Planken in Längsreihen, Fugen, dunkler Wasserpass, Deck aus
 * Dielen. L Länge, W Breite, H Tiefe. Liefert eine nicht gefärbte Geometrie + Farbfunktion über ghost-Palette.
 * broken: Heck fehlt (Wrack, abgebrochene Kante bei x = −L·0,1).
 */
/** Rumpfform: Breite, Tiefe und Deckssprung je Anteil t (0 = Heck, 1 = Bug); at(x, a) → Punkt auf der Außenhaut (a: 0 = oben
 *  Steuerbord +Z … π/2 = Kiel … π = oben Backbord). */
export function hullShape(L, W, H) {
  const width = (t) => { const u = (t - 0.5) * 2; return W / 2 * (u > 0 ? Math.sqrt(Math.max(0, 1 - Math.pow(u, 2.4))) : 1 - Math.pow(-u, 4) * 0.25); };
  const depth = (t) => H * (0.82 + 0.18 * Math.sin(t * Math.PI)) * (t > 0.9 ? 1 - (t - 0.9) * 2 : 1);
  const sheer = (t) => 0.35 * Math.pow(Math.abs(t - 0.45) * 2, 2) * H * 0.4; // Deckslinie steigt zu Bug und Heck
  const at = (x, a) => {
    const t = (x + L / 2) / L, wd = Math.max(0.02, width(t)), dp = depth(t), sh = sheer(t);
    const yb = -Math.sin(a) * dp * (0.85 + 0.15 * Math.abs(Math.cos(a)));
    return new THREE.Vector3(x, yb + sh * (1 - Math.sin(a) * 0.3), Math.cos(a) * wd);
  };
  return { width, depth, sheer, at };
}
export function hullGeo(L = 12, W = 5, H = 3, broken = false, lo = false) {
  return cached(`w6:hull:${L}:${W}:${H}:${broken}:${lo}`, () => {
    const b = new Build();
    const NS = lo ? 14 : 26, NP = lo ? 9 : 14;
    const x0 = broken ? -L * 0.1 : -L / 2, x1 = L / 2;
    const { width, depth, sheer } = hullShape(L, W, H);
    const tA = (x0 + L / 2) / L;
    const pos = [], idx = [];
    for (let i = 0; i <= NS; i++) {
      const t = tA + (1 - tA) * (i / NS);
      const x = -L / 2 + t * L;
      const wd = Math.max(0.02, width(t)), dp = depth(t), sh = sheer(t);
      for (let j = 0; j <= NP; j++) {
        const a = (j / NP) * Math.PI; // 0 = Steuerbord oben, π = Backbord oben
        const z = Math.cos(a) * wd;
        const yy = -Math.sin(a) * dp;
        // U-Form: flacher Boden
        const yb = yy * (0.85 + 0.15 * Math.abs(Math.cos(a)));
        pos.push(x, yb + sh * (1 - Math.sin(a) * 0.3), z);
      }
    }
    for (let i = 0; i < NS; i++) for (let j = 0; j < NP; j++) {
      const a = i * (NP + 1) + j, c = (i + 1) * (NP + 1) + j;
      idx.push(a, a + 1, c, c, a + 1, c + 1);
    }
    // Heckspiegel (bzw. Bruchkante beim Wrack): Fächer über den ersten Querschnitt
    const c0 = pos.length / 3;
    pos.push(pos[0], pos[1] - (broken ? 0.2 : 0.05), 0);
    for (let j = 0; j < NP; j++) idx.push(c0, j + 1, j);
    const hull = new THREE.BufferGeometry();
    hull.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    hull.setIndex(idx);
    hull.computeVertexNormals();
    const plank = (x, y, z, nx, ny) => {
      const row = Math.floor((y + H) / 0.32);
      const fy = ((y + H) / 0.32) - row;
      if (fy < 0.08) return col(W6.ghostDark);
      const n = hash1(row * 13.1 + Math.floor((x + L) / 2.1) * 3.7);
      let c = mix(W6.ghostLow, W6.ghostHi, n * 0.6 + 0.2);
      if (y < -H * 0.72) c = mix(c, W6.moss, 0.55);
      return c;
    };
    b.add(hull, plank, null);
    // Deck (Dielen quer zur Länge sichtbar als Längsfugen)
    const deck = new THREE.BufferGeometry();
    const dp2 = [], di = [];
    for (let i = 0; i <= NS; i++) {
      const t = tA + (1 - tA) * (i / NS);
      const x = -L / 2 + t * L, wd = Math.max(0.02, width(t)) * 0.97, sh = sheer(t);
      dp2.push(x, sh - 0.02, -wd, x, sh - 0.02, wd);
    }
    for (let i = 0; i < NS; i++) { const a = i * 2; di.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    deck.setAttribute('position', new THREE.Float32BufferAttribute(dp2, 3));
    deck.setIndex(di); deck.computeVertexNormals();
    b.add(deck, (x, y, z) => {
      const k = Math.floor((z + W) / 0.42);
      const f = (z + W) / 0.42 - k;
      if (f < 0.07) return col(W6.ghostDark);
      return mix(0x8a7a68, 0xb8a888, hash1(k * 7.3 + Math.floor((x + L) / 1.7)) * 0.7);
    }, null);
    // Reling-Wulst
    const rail = [];
    for (let i = 0; i <= NS; i++) { const t = tA + (1 - tA) * (i / NS); rail.push([-L / 2 + t * L, sheer(t) + 0.06, width(t) + 0.02]); }
    const railB = rail.map(([x, y, z]) => [x, y, -z]).reverse();
    b.add(taperTube(rail, 0.09, lo ? 16 : 32, lo ? 5 : 8), W6.ghostDark, null);
    b.add(taperTube(railB, 0.09, lo ? 16 : 32, lo ? 5 : 8), W6.ghostDark, null);
    return b.geometry();
  });
}

// ------------------------------------------------------------------ Gelee-Brocken (Einzelmodell, Riese, Instanzen)
/** Gelee-Brocken mit Knopfaugen (Kante 1, Ursprung Mitte unten). */
export function brockenGeo(color = 'silber', lo = false) {
  const c = jellyColor(color);
  return cached(`w6:brocken:${c}:${lo}`, () => {
    const b = new Build();
    b.parts.push(jellyGeo(c, lo).clone());
    for (const s of [1, -1]) {
      b.sphere(1, 0x1a0a20, { p: [0.47, 0.58, s * 0.16], s: [0.06, 0.12, 0.075] }, lo ? 7 : 12, lo ? 5 : 8);
      b.sphere(1, 0xffffff, { p: [0.52, 0.63, s * 0.16 - 0.02], s: [0.015, 0.035, 0.03] }, lo ? 4 : 6, lo ? 3 : 4);
    }
    b.add(new THREE.TorusGeometry(0.07, 0.018, lo ? 4 : 5, lo ? 6 : 10, Math.PI), W6.mouth, { p: [0.505, 0.4, 0], r: [0, Math.PI / 2, Math.PI] });
    return b.geometry();
  });
}

// ------------------------------------------------------------------ Förderband (Einzelmodell und Instanzen)
export function beltFrameGeo(L, W, T, lo = false) {
  return cached(`w6:belt:frame:${L}:${W}:${T}:${lo}`, () => {
    const b = new Build();
    const steel = gradV(W6.steelLow, W6.steelHi, 0.5, 0.45);
    for (const s of [1, -1]) {
      b.box(L, T, 0.14, steel, { p: [0, T / 2, s * (W / 2 + 0.07)] }, 0.04, lo ? 1 : 2);
      b.box(L - 0.1, 0.06, 0.15, (x) => (Math.floor((x + L) / 0.3) % 2 ? col(W6.hazard) : col(0x1e1e28)), { p: [0, T - 0.03, s * (W / 2 + 0.075)] }, 0.01, 1);
      if (!lo) for (let x = -L / 2 + 0.3; x < L / 2; x += 0.6) b.sphere(0.03, W6.steelHi, { p: [x, T * 0.4, s * (W / 2 + 0.145)] }, 6, 4);
    }
    b.box(L, T * 0.6, W, 0x2a2e3c, { p: [0, T * 0.3, 0] }, 0.02, 1);
    return b.geometry();
  });
}
export const beltRollerGeo = (W, T) => cached(`w6:belt:roller:${W}:${T}`, () => {
  const b = new Build();
  b.cyl(T * 0.42, T * 0.42, W, (x, y, z) => (Math.floor((Math.atan2(y, x) + 4) * 2.5) % 2 ? col(0x3a3e50) : col(0x5a6078)), { r: [Math.PI / 2, 0, 0] }, 14);
  for (const s of [1, -1]) b.cyl(T * 0.2, T * 0.2, 0.05, W6.hazard, { p: [0, 0, s * (W / 2 + 0.01)], r: [Math.PI / 2, 0, 0] }, 10);
  return b.geometry();
});
export const beltTopGeo = (L, W, T) => cached(`w6:belt:top:${L}:${W}:${T}`, () => { const g = new THREE.PlaneGeometry(L, W); g.rotateX(-Math.PI / 2); g.translate(0, T + 0.002, 0); return g; });
