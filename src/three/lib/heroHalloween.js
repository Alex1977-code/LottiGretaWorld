// Halloween-Verkleidung der Figuren (Bausteine; Vertrag „Präzisierung (Figuren Halloween): Verkleidung“). Kindgerecht-
// gruselig: niedlich, spielzeughaft, kräftige saubere Farben im Figurenstil (glatte Flächen aus Parametern, Vertexfarben).
// Alle starren Geometrien haben position/normal/uv/color – so bündelt die Kurs-Ansicht sie mit den Teilen gleichen Materials
// (view/ShadowProxy.js: Figur-Bündel und Schatten-Stellvertreter) bzw. sie verschmelzen mit einem vorhandenen Mesh.
// Auflösung sparsam (Dreiecke je Figur höchstens +20 %).
//
//   witchHatGeo(accent)        Lottis Hexenhut (hut-lokal: Mitte der Hutunterseite im Ursprung, Krone nach +Y, vorn +X):
//                              lila Krone mit weichen Knautschfalten, nach hinten umgeknickte Spitze, orangefarbenes Band
//                              mit ihrer Schleife (Farbe accent), gelbe Pausback-Sternchen, gewellte Krempe
//   catEarGeo()                Katzenohr (ohr-lokal: Ansatz im Ursprung, Spitze +Y, Innenseite +X): schwarz, innen rosa,
//                              leicht gemuldet
//   catTailGeo()               Katzenschwanz entlang +Y (Ansatz im Ursprung) mit Knochen-Gewichten (skinIndex/skinWeight) für
//                              CAT_TAIL.bones (halbe Kettenglieder), runde Spitze, rosa Schleife am Ansatz (Seite +X)
//   whiskerGeos(head, o)       drei aufgemalte Schnurrhaare je Wange und ein Katzen-Näschen (Aufkleber auf der Kopfform)
//   stripedBandanaGeo()        Pflaumes Halstuch in Streifen (Vertexfarben weiß/fast schwarz; die helle Farbe gibt das
//                              Material: orange bzw. Kraftfarbe)
//   batWingGeo(side)           Fledermausflügelchen (flügel-lokal: Ansatz im Ursprung, Spannweite entlang side·Z, Vorderkante
//                              nach +X, Oberseite +Y): Armknochen vorn, zwei Finger, gezackter Hinterrand, Krällchen
//   capeGeo()                  Krümels Mini-Vampirumhang (Ursprung = Halsansatz CAPE.pivot; Blick +X): Stehkragen, außen
//                              nachtlila, innen rot, Saum mit Spitzen

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TAU, clamp, lerp, smoothstep, gridGeo, smoothProfile2, mergeColored, decalGeo, stripGeo } from './figures.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const C = (c) => new THREE.Color(c);

/** Farben der Verkleidung. */
export const HW_COLORS = {
  hat: '#7f52dc', hatDark: '#4a2a8c', hatTip: '#9c74f0', band: '#ff8a1e', bandDark: '#d9630c', star: '#ffd23f', starHi: '#fff4b0',
  cat: '#2c2433', catHi: '#4d4458', catPink: '#ff9ac4', tailBow: '#ff6fae',
  whisker: '#3b2632', catNose: '#6a3346',
  bandanaOrange: '#ff8a1e', bandanaDark: 0.09,
  wing: '#3f2b5c', wingIn: '#7a52a6', wingBone: '#251a33', wingClaw: '#f3e6ff',
  cape: '#2a2038', capeHi: '#4a3a66', capeIn: '#d8283c', capeInDark: '#a3172a',
};

/** Ellipsoid (Einheitskugel → Achsen ax, ay, az um c) mit Vertexfarbe (Farbe oder Funktion der Position). */
function ellipsoid(c, ax, ay, az, color, ws = 12, hs = 8) {
  const g = new THREE.SphereGeometry(1, ws, hs);
  g.applyMatrix4(new THREE.Matrix4().makeBasis(ax, ay, az).setPosition(c));
  const P = g.attributes.position, arr = new Float32Array(P.count * 3), cc = new THREE.Color(), p = V();
  for (let i = 0; i < P.count; i++) { p.fromBufferAttribute(P, i); cc.set(typeof color === 'function' ? color(p) : color); arr.set([cc.r, cc.g, cc.b], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

/** Zwei bauschige Schlaufen, Knoten und (optional) zwei Bänder (Schleife) um c: n nach außen, T quer, B hoch; s = Größe. */
function bowGeos(c, n, T, B, color, s = 1, tails = true) {
  const acc = C(color), fold = acc.clone().multiplyScalar(0.62);
  const shadeAt = (p) => acc.clone().lerp(fold, Math.exp(-p.distanceToSquared(c) / (0.0016 * s * s)));
  const out = [];
  for (const k of [1, -1]) {
    const q = new THREE.Quaternion().setFromAxisAngle(n, k * 0.32);
    const ax = T.clone().applyQuaternion(q), ay = B.clone().applyQuaternion(q);
    out.push(ellipsoid(c.clone().addScaledVector(ax, k * 0.09 * s).addScaledVector(n, -0.004 * s), ax.clone().multiplyScalar(0.1 * s), ay.clone().multiplyScalar(0.066 * s), n.clone().multiplyScalar(0.046 * s), shadeAt, 12, 8));
    if (!tails) continue;
    const tc = c.clone().addScaledVector(B, -0.072 * s).addScaledVector(T, k * 0.03 * s);
    out.push(ellipsoid(tc, T.clone().multiplyScalar(0.025 * s).applyAxisAngle(n, k * 0.35), B.clone().multiplyScalar(0.056 * s).applyAxisAngle(n, k * 0.35), n.clone().multiplyScalar(0.017 * s), acc, 8, 5));
  }
  out.push(ellipsoid(c.clone().addScaledVector(n, 0.012 * s), T.clone().multiplyScalar(0.04 * s), B.clone().multiplyScalar(0.044 * s), n.clone().multiplyScalar(0.034 * s), acc.clone().multiplyScalar(0.92), 10, 6));
  return out;
}

/** Pausback-Stern (lokal: Fläche in XY, Wölbung nach +Z, eine Spitze nach +Y), Radius r. */
function puffyStarGeo(r, color = HW_COLORS.star, hi = HW_COLORS.starHi) {
  const base = C(color), light = C(hi);
  const R = (th) => r * (0.5 + 0.5 * Math.pow(0.5 + 0.5 * Math.cos(5 * (th - Math.PI / 2)), 1.6));
  return gridGeo({
    nu: 30, nv: 3,
    point: (u, v, out) => {
      const th = u * TAU, rr = R(th) * v;
      return out.set(rr * Math.cos(th), rr * Math.sin(th), 0.42 * r * Math.sqrt(Math.max(0, 1 - v * v)) - 0.12 * r);
    },
    color: (u, v) => base.clone().lerp(light, 0.55 * (1 - smoothstep(v / 0.7))),
  });
}

// ================================================================== Lotti: Hexenhut
/** Maße des Huts (Einheiten, hut-lokal). */
export const HAT = {
  R0: 0.24,           // Kronen-Radius unten
  brimIn: 0.17, brimOut: 0.41,
  spine: [V(0, -0.012, 0), V(0.012, 0.19, 0), V(-0.015, 0.33, 0), V(-0.15, 0.4, 0.035)],
  band: [0.025, 0.16],   // Band (Anteil der Kronenlänge)
};
const hatSpine = new THREE.CubicBezierCurve3(...HAT.spine);

/** Kronen-Radius bei t (0 unten … 1 Spitze): verjüngt, Band etwas erhaben, weiche Knautschfalten, runde Spitze. */
function crownR(t, phi = 0) {
  const [b0, b1] = HAT.band;
  let r = HAT.R0 * Math.pow(1 - t, 0.9);
  const band = smoothstep((t - b0) / 0.02) * smoothstep((b1 - t) / 0.02);
  r += 0.013 * band;
  r *= 1 + 0.05 * Math.sin(TAU * 2.2 * t + 0.6 + 0.35 * Math.cos(phi)) * smoothstep((t - b1 - 0.03) / 0.12);
  const cap = t > 0.9 ? Math.sqrt(Math.max(0, 1 - ((t - 0.9) / 0.1) ** 2)) : 1;
  return Math.max(0, r * cap + 0.012 * cap);
}
/** Rahmen der Krone bei t: Punkt P, Tangente T, vorn N (+X am Fuß), seitlich B (+Z). */
function crownFrame(t) {
  const P = hatSpine.getPoint(t), T = hatSpine.getTangent(t).normalize();
  const N = new THREE.Vector3().crossVectors(T, V(0, 0, 1)).normalize();
  const B = new THREE.Vector3().crossVectors(N, T).normalize();
  return { P, T, N, B };
}
/** Punkt auf der Kronen-Oberfläche (t, phi) mit Abstand lift; phi = 0 vorn (+X), π/2 seitlich (+Z). */
function crownPoint(t, phi, lift = 0) {
  const f = crownFrame(t), r = crownR(t, phi) + lift;
  return { p: f.P.clone().addScaledVector(f.N, r * Math.cos(phi)).addScaledVector(f.B, r * Math.sin(phi)), n: f.N.clone().multiplyScalar(Math.cos(phi)).addScaledVector(f.B, Math.sin(phi)).normalize(), f };
}

export function witchHatGeo(accent = '#e83a30') {
  const hat = C(HW_COLORS.hat), dark = C(HW_COLORS.hatDark), tip = C(HW_COLORS.hatTip), band = C(HW_COLORS.band), bandDark = C(HW_COLORS.bandDark);
  const gs = [];
  // Krone: Fläche entlang der gebogenen Mittellinie (Zeilen dichter am Band)
  const tOf = (v) => (v < 0.3 ? (v / 0.3) * 0.2 : 0.2 + ((v - 0.3) / 0.7) * 0.8);
  gs.push(gridGeo({
    nu: 22, nv: 20,
    point: (u, v, out) => out.copy(crownPoint(tOf(v), u * TAU).p),
    color: (u, v) => {
      const t = tOf(v), [b0, b1] = HAT.band;
      const inBand = smoothstep((t - b0 + 0.004) / 0.012) * smoothstep((b1 - t + 0.004) / 0.012);
      const fold = 0.5 + 0.5 * Math.sin(TAU * 2.2 * t + 0.6 + 0.35 * Math.cos(u * TAU));
      const c = hat.clone().lerp(dark, 0.32 * (1 - fold) * smoothstep((t - b1) / 0.1)).lerp(tip, 0.4 * smoothstep((t - 0.55) / 0.4));
      return c.lerp(band.clone().lerp(bandDark, 0.35 * Math.abs(2 * (t - b0) / (b1 - b0) - 1) ** 3), inBand);
    },
  }));
  // Krempe: flacher Ring mit gerolltem Rand, leicht gewellt (Unterseite dunkler)
  const prof = smoothProfile2([[HAT.brimIn, -0.01], [0.3, -0.006], [HAT.brimOut - 0.004, 0.018], [HAT.brimOut + 0.008, 0.033], [HAT.brimOut - 0.002, 0.047], [0.3, 0.028], [HAT.brimIn, 0.016]], 13);
  const nP = prof.length - 1;
  const wave = (phi) => 0.022 * Math.cos(2 * phi + 0.3) + 0.01 * Math.cos(3 * phi + 1.1);
  gs.push(gridGeo({
    nu: 36, nv: nP,
    point: (u, v, out) => {
      const phi = u * TAU, [r, y] = prof[Math.round(v * nP)];
      const w = wave(phi) * smoothstep((r - 0.24) / 0.16);
      return out.set(Math.cos(phi) * r, y + w, Math.sin(phi) * r);
    },
    color: (u, v) => {
      const k = Math.round(v * nP), under = k < nP * 0.42;
      return under ? dark.clone().lerp(hat, 0.15) : hat.clone().lerp(tip, 0.18 * smoothstep((prof[k][0] - 0.3) / 0.1));
    },
  }));
  // Sternchen (vorn, seitlich, hinten – aus der Kurs-Kamera hinter der Figur sichtbar)
  for (const [t, phi, r, roll] of [[0.36, 0.55, 0.05, 0.2], [0.27, 2.75, 0.046, -0.3], [0.55, -2.0, 0.036, 0.5], [0.3, -0.9, 0.04, -0.1]]) {
    const { p, n, f } = crownPoint(t, phi, -0.004);
    const up = f.T.clone().addScaledVector(n, -f.T.dot(n)).normalize().applyAxisAngle(n, roll);
    const x = new THREE.Vector3().crossVectors(up, n);
    const g = puffyStarGeo(r);
    g.applyMatrix4(new THREE.Matrix4().makeBasis(x, up, n).setPosition(p));
    gs.push(g);
  }
  // Lottis rote Schleife am Band (hinten zur nahen Seite)
  {
    const tb = (HAT.band[0] + HAT.band[1]) / 2, phi = 2.2;
    const { p, n, f } = crownPoint(tb, phi, 0.012);
    const T = f.N.clone().multiplyScalar(-Math.sin(phi)).addScaledVector(f.B, Math.cos(phi)).normalize();
    const B = new THREE.Vector3().crossVectors(T, n).normalize();
    gs.push(...bowGeos(p, n, T, B, accent, 0.82));
  }
  const m = mergeColored(gs.map((g) => [g, null, null]));
  for (const g of gs) g.dispose();
  m.computeBoundingSphere();
  return m;
}

// ================================================================== Greta: Katzenohren, Schwanz, Schnurrhaare
/** Katzenohr: abgerundetes Dreieck, gemuldet (Innenseite +X rosa), Ansatz im Ursprung, Spitze +Y. */
export function catEarGeo() {
  const H = 0.19, W = 0.088, T = 0.022, cup = 0.03;
  const blk = C(HW_COLORS.cat), hi = C(HW_COLORS.catHi), pink = C(HW_COLORS.catPink);
  const width = (v) => W * Math.pow(1 - 0.92 * v, 0.85) * (v > 0.82 ? Math.sqrt(Math.max(0, 1 - ((v - 0.82) / 0.18) ** 2)) : 1) * Math.sqrt(Math.sin((Math.PI / 2) * Math.min(1, v / 0.05)));
  return gridGeo({
    nu: 14, nv: 8, flip: true,
    point: (u, v, out) => {
      const th = u * TAU, w = width(v), s = Math.sin(th), c = Math.cos(th);
      const th2 = T * (1 - 0.55 * v) * Math.min(1, w / (0.25 * W) + 0.2);
      return out.set(th2 * s - cup * (1 - v) * (1 - c * c) - 0.02 * v * v, H * v, w * c);
    },
    color: (u, v) => {
      const th = u * TAU, s = Math.sin(th), c = Math.cos(th);
      const inner = smoothstep((s - 0.25) / 0.3) * (1 - smoothstep((Math.abs(c) - 0.62) / 0.2)) * smoothstep((v - 0.04) / 0.08) * (1 - smoothstep((v - 0.68) / 0.12));
      return blk.clone().lerp(hi, 0.35 * smoothstep((Math.abs(c) - 0.7) / 0.3) * (1 - v)).lerp(pink, inner);
    },
  });
}

/** Katzenschwanz: Länge der Kettenglieder (Einheiten), Radien am Ansatz/vor der Spitze, Spitze; Knochen = halbe Glieder. */
export const CAT_TAIL = { links: [0.13, 0.12, 0.115, 0.105], r0: 0.042, r1: 0.029, tip: 0.035 };
CAT_TAIL.len = CAT_TAIL.links.reduce((a, b) => a + b, 0);
CAT_TAIL.bones = CAT_TAIL.links.flatMap((L, i) => { const y0 = CAT_TAIL.links.slice(0, i).reduce((a, b) => a + b, 0); return [y0, y0 + L / 2]; });

/** Gewichte entlang +Y: zwischen zwei Knochen-Drehpunkten weich überblendet (wie heroWorld3.skinChain). */
function skinAlong(g, ys, fixed = null) {
  const pos = g.attributes.position, n = pos.count, last = ys.length - 1;
  const idx = new Uint16Array(n * 4), w = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    if (fixed !== null && i >= fixed[0]) { idx[i * 4] = fixed[1]; w[i * 4] = 1; continue; }
    const y = pos.getY(i);
    let k = 0;
    while (k < last && y > ys[k + 1]) k++;
    if (k >= last) { idx[i * 4] = last; w[i * 4] = 1; continue; }
    const f = smoothstep((y - ys[k]) / (ys[k + 1] - ys[k]));
    idx[i * 4] = k; idx[i * 4 + 1] = k + 1;
    w[i * 4] = 1 - f; w[i * 4 + 1] = f;
  }
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(w, 4));
  return g;
}

export function catTailGeo() {
  const { len: L, r0, r1, tip } = CAT_TAIL;
  const blk = C(HW_COLORS.cat), hi = C(HW_COLORS.catHi);
  // Profil [r, y]: runder Ansatz (steckt im Rock), gleichmäßige Ringe entlang des Schafts (biegt sich weich mit den
  // Knochen), Spitze leicht bauschig und rund
  const pts = [];
  for (const a of [-90, -60, -30]) { const t = (a * Math.PI) / 180; pts.push([r0 * Math.cos(t), 0.9 * r0 * Math.sin(t)]); }
  const yc = L * 0.9;
  for (let i = 0; i <= 16; i++) {
    const y = (yc * i) / 16;
    pts.push([lerp(r0, r1, Math.pow(y / yc, 1.2)) + (tip - r1) * smoothstep((y - 0.78 * L) / (0.12 * L)), y]);
  }
  for (const a of [25, 50, 70, 90]) { const t = (a * Math.PI) / 180; pts.push([tip * Math.cos(t), yc + 1.1 * tip * Math.sin(t)]); }
  const nP = pts.length - 1;
  const g = gridGeo({
    nu: 10, nv: nP,
    point: (u, v, out) => { const phi = u * TAU, [r, y] = pts[Math.round(v * nP)]; return out.set(Math.cos(phi) * r, y, Math.sin(phi) * r); },
    color: (u) => blk.clone().lerp(hi, 0.3 * smoothstep(Math.cos(u * TAU - 0.6))),
  });
  // rosa Schleife am Ansatz (Seite +X: zeigt in der Ruhelage nach oben-hinten), fest am ersten Knochen
  const c = V(r0 + 0.004, 0.05, 0), n = V(1, 0, 0), T = V(0, 0, 1), B = V(0, 1, 0);
  const bow = bowGeos(c, n, T, B, HW_COLORS.tailBow, 0.55, false);
  const nBody = g.attributes.position.count;
  const m = mergeColored([[g, null, null], ...bow.map((x) => [x, null, null])]);
  g.dispose(); for (const x of bow) x.dispose();
  skinAlong(m, CAT_TAIL.bones, [nBody, 0]);
  m.computeBoundingSphere();
  return m;
}

/**
 * Aufgemalte Schnurrhaare (je Wange drei, leicht gefächert) und ein dunkles Katzen-Näschen auf der Nasenkuppe.
 * head: HeadShape, o: { az (Wange), el, noseEl } – Aufkleber-Geometrien für den Kopf (kopf-lokal).
 */
export function whiskerGeos(head, o) {
  const col = C(HW_COLORS.whisker), nose = C(HW_COLORS.catNose);
  const out = [];
  for (const s of [1, -1]) {
    const f = head.frame(s * o.az, o.el);
    for (const k of [-1, 0, 1]) {
      out.push(stripGeo(head, f, {
        n: 8, across: 2,
        curve: (t) => [s * lerp(-0.012, 0.085, t), k * 0.019 + k * 0.024 * t - 0.004 * t * t + 0.004 * (1 - Math.abs(k))],
        width: (t) => 0.0034 * (1 - 0.65 * t) * Math.min(1, t / 0.1 + 0.4), lift: () => 0.0022, color: () => col,
      }));
    }
  }
  // Näschen: kleines abgerundetes Dreieck (Spitze unten) auf der Nasenkuppe
  const nr = (x, y) => Math.hypot(x / 0.02, y / 0.016);
  out.push(decalGeo(head, head.frame(0, o.noseEl + 0.015), {
    rings: 3, segs: 16,
    shape: (r, th) => { const tri = 1 - 0.28 * Math.max(0, -Math.sin(th)) ** 2; return [0.02 * r * Math.cos(th) * (Math.sin(th) < 0 ? tri * (1 + 0.35 * Math.sin(th)) : 1), 0.015 * r * Math.sin(th)]; },
    lift: (x, y) => 0.0145 * Math.sqrt(Math.max(0, 1 - nr(x, y) ** 2)) + 0.0006, color: () => nose,
  }));
  return out;
}

// ================================================================== Pflaume: Halstuch in Streifen, Fledermausflügelchen
/** Halstuch wie rabbitBandanaGeo (Band um den Hals, Zipfel, Knoten), Streifen als Vertexfarben (weiß = Materialfarbe). */
export function stripedBandanaGeo() {
  const k = HW_COLORS.bandanaDark, dark = new THREE.Color(k, k, k), white = new THREE.Color(1, 1, 1);
  // je Dreieck gefärbt (nicht indiziert) → scharfe Streifenkanten bei weichen Normalen der Grundkörper
  const paintTri = (g0, pick) => {
    const g = g0.toNonIndexed(); g0.dispose();
    const P = g.attributes.position, arr = new Float32Array(P.count * 3), c = V();
    for (let i = 0; i < P.count; i += 3) {
      c.set(0, 0, 0);
      for (let j = 0; j < 3; j++) c.add(V(P.getX(i + j), P.getY(i + j), P.getZ(i + j)).multiplyScalar(1 / 3));
      const col = pick(c) ? dark : white;
      for (let j = 0; j < 3; j++) arr.set([col.r, col.g, col.b], (i + j) * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    g.deleteAttribute('uv');
    return g;
  };
  const neckAxis = V(0.45, 0.89, 0).normalize();
  // Band: 12 Streifen um den Hals
  const band = paintTri(new THREE.TorusGeometry(0.225, 0.05, 8, 48), (c) => Math.floor(((Math.atan2(c.y, c.x) + Math.PI) / TAU) * 12) % 2 === 1);
  band.applyMatrix4(new THREE.Matrix4().compose(V(0.03, 0, 0), new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), neckAxis), V(1, 1, 1)));
  // Zipfel (vierseitige Spitze) mit Querstreifen
  const tip = paintTri(new THREE.ConeGeometry(0.13, 0.26, 4, 5), (c) => Math.floor((c.y + 0.13) / 0.052) % 2 === 0);
  tip.applyMatrix4(new THREE.Matrix4().compose(V(0.23, -0.17, 0.04), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, Math.PI / 4, 0)), V(1, 1, 0.42)));
  // Knoten: oben dunkel, unten hell
  const knot = paintTri(new THREE.SphereGeometry(0.058, 12, 8), (c) => c.y > 0.01);
  knot.translate(0.24, -0.03, 0.07);
  const m = mergeGeometries([band, tip, knot], false);
  band.dispose(); tip.dispose(); knot.dispose();
  m.computeBoundingSphere();
  return m;
}

/** Fledermausflügel: Spannweite, Tiefe am Ansatz; Fingerspitzen am Hinterrand. */
export const BAT_WING = { span: 0.42, chord: 0.2, fingers: [0.4, 0.72] };
export function batWingGeo(side = 1) {
  const { span, chord, fingers } = BAT_WING;
  const top = C(HW_COLORS.wing), under = C(HW_COLORS.wingIn), bone = C(HW_COLORS.wingBone);
  const knots = [0, fingers[0], fingers[1], 1];
  const scallop = (s) => {
    for (let i = 0; i < 3; i++) if (s <= knots[i + 1] + 1e-6) { const a = (s - knots[i]) / (knots[i + 1] - knots[i]); return Math.sin(Math.PI * clamp(a, 0, 1)) * (i === 0 ? 0.6 : 1); }
    return 0;
  };
  const env = (s) => chord * (1 + 0.25 * Math.sin(Math.PI * s * 0.9)) * Math.pow(Math.max(0, 1 - s * s * s), 0.7);
  const cAt = (s) => Math.max(0.004, env(s) - 0.055 * scallop(s) * Math.min(1, env(s) / 0.08));
  const le = (s) => 0.025 * Math.sin(Math.PI * s);                     // Vorderkante leicht nach vorn gewölbt
  const lift = (s) => 0.07 * s * s;                                      // Spitzen etwas hoch
  // Knochen (Finger) vom Handgelenk an der Vorderkante zu den Fingerspitzen am Hinterrand (Ebene s / x)
  const wrist = 0.3;
  const fingerLines = fingers.map((f) => [[wrist * span, le(wrist)], [f * span, le(f) - cAt(f)]]);
  const distSeg = (s, x, [[s0, x0], [s1, x1]]) => {
    const ds = s1 - s0, dx = x1 - x0, k = clamp(((s - s0) * ds + (x - x0) * dx) / (ds * ds + dx * dx), 0, 1);
    return Math.hypot(s - (s0 + k * ds), x - (x0 + k * dx));
  };
  // Spannweiten-Stationen dichter an den Fingerspitzen (gezackter Hinterrand)
  const sOf = (v) => v;
  const g = gridGeo({
    nu: 12, nv: 15, flip: side > 0,
    point: (u, v, out) => {
      const th = u * TAU, s = sOf(v), q = (1 - Math.cos(th)) / 2;   // q 0 vorn … 1 hinten
      const x = le(s) - q * cAt(s);
      const thick = (0.006 + 0.016 * Math.exp(-((q / 0.14) ** 2))) * (1 - 0.6 * s) * Math.sqrt(Math.sin((Math.PI / 2) * Math.min(1, (1 - s) / 0.06)));
      return out.set(x, lift(s) + thick * Math.sin(th), side * s * span);
    },
    color: (u, v) => {
      const th = u * TAU, s = sOf(v), q = (1 - Math.cos(th)) / 2, x = le(s) - q * cAt(s);
      const upper = Math.sin(th) >= 0;
      const c = (upper ? top : under).clone();
      const db = Math.min(...fingerLines.map((L) => distSeg(s * span, x, L)));
      const lead = Math.exp(-((q / 0.1) ** 2));
      c.lerp(bone, Math.max(1 - smoothstep((db - 0.006) / 0.01), 0.85 * lead));
      if (!upper) c.lerp(top, 0.25 * lead);
      return c;
    },
  });
  // Krällchen am Handgelenk (hell)
  const claw = new THREE.ConeGeometry(0.014, 0.05, 5);
  claw.applyMatrix4(new THREE.Matrix4().compose(V(le(wrist) + 0.012, lift(wrist) + 0.02, side * wrist * span), new THREE.Quaternion().setFromEuler(new THREE.Euler(side * -0.5, 0, -0.5)), V(1, 1, 1)));
  {
    const P = claw.attributes.position, arr = new Float32Array(P.count * 3), cc = C(HW_COLORS.wingClaw);
    for (let i = 0; i < P.count; i++) arr.set([cc.r, cc.g, cc.b], i * 3);
    claw.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  }
  const m = mergeColored([[g, null, null], [claw, null, null]]);
  g.dispose(); claw.dispose();
  m.computeBoundingSphere();
  return m;
}

// ================================================================== Krümel: Mini-Vampirumhang
/** Umhang (Ursprung = Halsansatz des Hasenmodells bei CAPE.pivot; Blick +X). */
export const CAPE = { pivot: [-0.03, 0.3, 0], phi: 1.95, neckR: 0.118, hemR: 0.215, hemY: -0.235, collarH: 0.13 };
export function capeGeo() {
  const { phi: PHI, neckR, hemR, hemY, collarH } = CAPE;
  const out = C(HW_COLORS.cape), outHi = C(HW_COLORS.capeHi), lin = C(HW_COLORS.capeIn), linDark = C(HW_COLORS.capeInDark);
  const VC = 0.3;   // Anteil des Stehkragens an v
  const peaks = (a) => Math.pow(0.5 + 0.5 * Math.cos(7 * a), 6);
  // v 0 = Kragenoberkante … VC = Halslinie … 1 = Saum; a = Winkel um den Rücken (0 = hinten, −X)
  const at = (u, v, inner, outp) => {
    const a = lerp(-PHI, PHI, u), back = Math.cos(a);
    let r, y;
    if (v < VC) {
      const k = v / VC;                                            // 0 oben … 1 Hals
      const h = collarH * (0.35 + 0.65 * Math.max(0, back));       // hinten hoch, vorn niedrig
      y = h * (1 - k);
      r = neckR + 0.05 * (1 - k) * (1 - k) * (0.6 + 0.4 * Math.max(0, back));   // nach oben ausgestellt
    } else {
      const k = (v - VC) / (1 - VC);                               // 0 Hals … 1 Saum
      y = lerp(0, hemY - 0.045 * peaks(a) + 0.02, k);
      r = lerp(neckR, hemR, Math.pow(k, 0.75)) * (1 + 0.05 * Math.sin(Math.PI * k));
    }
    if (inner) r -= 0.006;
    return outp.set(-Math.cos(a) * r, y, Math.sin(a) * r);
  };
  const shell = (inner) => gridGeo({
    nu: 20, nv: 12, wrapU: false, flip: inner,
    point: (u, v, o) => at(u, v, inner, o),
    color: (u, v) => {
      const a = lerp(-PHI, PHI, u);
      if (inner) return lin.clone().lerp(linDark, 0.35 * smoothstep((v - 0.6) / 0.4) + 0.2 * Math.abs(a) / PHI);
      return out.clone().lerp(outHi, 0.45 * Math.pow(0.5 + 0.5 * Math.cos(7 * a), 3) * smoothstep((v - VC) / 0.3));
    },
  });
  const gs = [shell(false), shell(true)];
  const m = mergeColored(gs.map((g) => [g, null, null]));
  for (const g of gs) g.dispose();
  m.computeBoundingSphere();
  return m;
}
