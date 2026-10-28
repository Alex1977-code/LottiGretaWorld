// Wurfsichel-Kostüm der Heldinnen (Bausteine; Vertrag docs/KURS-ARCHITEKTUR.md „Präzisierung (Figuren Welt 7): Wurfsichel-
// Kostüm und Wurf-Pose“). Gestaltung nach der Vorlage `wurfsichel_kostuem` (course/models/kinds/items_w7.js, Farben wie dort;
// three/ importiert nichts aus course/): türkise Schirmmütze mit Goldband, rosa Bommel hinten und goldener Mondsichel als Kamm,
// kurzer türkiser Umhang (innen rosa, Goldsaum, Saum wie eine Mondsichel geschwungen, goldene Mondsichel mit Sternchen auf dem
// Rücken), goldene Kordel mit Sichel-Schließe; dazu die Wurfsichel für die Hand (goldener Halbmond mit türkisem Band, roten
// Spitzen und Blüten-Nabe wie Item und Geschoss). Figurenstil: glatte Flächen aus Parametern (gridGeo), Vertexfarben, alle
// Geometrien mit position/normal/uv/color – so bündelt die Kurs-Ansicht sie mit den Teilen gleichen Materials (Stoff bzw.
// Glanz; view/ShadowProxy.js), das Kostüm kostet keinen zusätzlichen Zeichenaufruf. Auflösung sparsam.
//
//   sichelBladeGeo(R, o)       Wurfsichel (sichel-lokal: Mitte des Außenkreises im Ursprung, flach in XY, Öffnung nach +X,
//                              Spitzen oben/unten, Dicke entlang Z; Griff = dickste Stelle bei SICHEL_GRIP·R auf −X)
//   sichelCapGeo(head, o)      Mütze (kopf-lokal, folgt der Kopfform `head` (HeadShape) mit Abstand für das Haar): Kappe aus
//                              sechs Bahnen, Goldband, Schirm vorn (+X), Bommel hinten oben; o.bow (Lotti: Schleife am Band,
//                              Farbe), o.halloween ('kuerbis' = Kürbis-Bommel, 'katze' = Katzenohren statt Bommel)
//   CAP                        Lage der Mütze (Randhöhe je Azimut, Abstand zur Kopfform, Kamm)
//   sichelCapeGeo(o)           Umhang (umhang-lokal: Ursprung = Drehpunkt CAPE.pivot im Rumpf-System, hängt nach −Y hinter
//                              der Figur, −X): außen türkis mit weichen Falten, innen rosa (o.halloween: orange), Goldpaspel
//                              rundum, Applikation auf dem Rücken
//   CAPE                       Maße des Umhangs (Rumpf-System der Heldin, Einheiten)
//   sichelCordGeos()           Kordel um den Hals und Sichel-Schließe vorn (rumpf-lokal; verschmilzt mit dem Oberkörper)
//   SICHEL_C                   Farben

import * as THREE from 'three';
import { TAU, clamp, lerp, smoothstep, gridGeo, dirAE } from './figures.js';
import { catEarGeo } from './heroHalloween.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const C = (c) => new THREE.Color(c);

/** Farben (wie Vorlage wurfsichel_kostuem / Wurfsichel: KO und SICHEL in course/models). */
export const SICHEL_C = {
  cap: '#1ec8b0', capHi: '#8af4e0', capLow: '#0a7a76', band: '#ffc21a', bandHi: '#fff0a0', bandLow: '#d8900a',
  bobble: '#ff6ab4', bobbleHi: '#ffc8e4', lining: '#ff8ac0', liningHi: '#ffd0e8',
  gold: '#ffc21a', goldHi: '#fff2a8', goldLow: '#d8840a', blade: '#2ad8b8', rim: '#ff4a7a', petal: '#fff6fb', petalRim: '#ff8ac0',
  pumpkin: '#ff8a1e', pumpkinDark: '#d9630c', stem: '#4f9f31', hwLining: '#ff9a3a', hwLiningHi: '#ffd08a',
};

/** Ellipsoid (Einheitskugel → Achsen ax, ay, az um c) mit Vertexfarbe (Farbe oder Funktion der Position); mit uv. */
function ellipsoid(c, ax, ay, az, color, ws = 12, hs = 8) {
  const g = new THREE.SphereGeometry(1, ws, hs);
  g.applyMatrix4(new THREE.Matrix4().makeBasis(ax, ay, az).setPosition(c));
  const P = g.attributes.position, arr = new Float32Array(P.count * 3), cc = new THREE.Color(), p = V();
  for (let i = 0; i < P.count; i++) { p.fromBufferAttribute(P, i); cc.set(typeof color === 'function' ? color(p) : color); arr.set([cc.r, cc.g, cc.b], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}
/** Geometrie einfarbig bzw. per Funktion (Position) färben. */
function paint(g, color) {
  const P = g.attributes.position, arr = new Float32Array(P.count * 3), cc = new THREE.Color(), p = V();
  for (let i = 0; i < P.count; i++) { p.fromBufferAttribute(P, i); cc.set(typeof color === 'function' ? color(p) : color); arr.set([cc.r, cc.g, cc.b], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

// ================================================================== Wurfsichel
/** Lage des Griffs (dickste Stelle) auf −X, Anteil von R. */
export const SICHEL_GRIP = 0.69;
/** Halbmond: Außenkreis R um den Ursprung, Innenkreis inner·R um (off·R, 0); t ∈ [0, 1] von der oberen Spitze über −X zur unteren. */
function crescent(R, inner = 0.8, off = 0.42) {
  const r2 = R * inner, d = R * off;
  const x = (R * R - r2 * r2 + d * d) / (2 * d), y = Math.sqrt(Math.max(0, R * R - x * x));
  const th1 = Math.atan2(y, x), ph1 = Math.atan2(y, x - d);
  const o = V(), i = V(), c = V(), n = V();
  const at = (t) => {
    const a = th1 + t * (TAU - 2 * th1), b = ph1 + t * (TAU - 2 * ph1);
    o.set(Math.cos(a) * R, Math.sin(a) * R, 0);
    i.set(d + Math.cos(b) * r2, Math.sin(b) * r2, 0);
    c.addVectors(o, i).multiplyScalar(0.5);
    n.subVectors(o, i);
    const hw = n.length() / 2;
    if (hw > 1e-9) n.multiplyScalar(0.5 / hw); else n.set(Math.cos(a), Math.sin(a), 0);
    return { c, n, hw, a };
  };
  at.tip = V(x, y, 0);
  return at;
}

/**
 * Wurfsichel als pausbackiger Halbmond (Querschnitt Ellipse: Breite = Abstand Innen-/Außenkante, Dicke depth·Breite), Spitzen
 * mit roten Kappen, türkises Band auf beiden Flächen, Blüten-Nabe am Griff (hub). Farben golden mit Glanzkante.
 */
export function sichelBladeGeo(R = 0.2, { depth = 0.42, hub = true, nu = 12, nv = 30 } = {}) {
  const cur = crescent(R);
  const gold = C(SICHEL_C.gold), hi = C(SICHEL_C.goldHi), low = C(SICHEL_C.goldLow), band = C(SICHEL_C.blade), rim = C(SICHEL_C.rim);
  const gs = [];
  gs.push(gridGeo({
    nu, nv,
    point: (u, v, out) => {
      const { c, n, hw } = cur(v), th = u * TAU;
      // Spitzen rund (Breite fällt zum Ende weicher ab), Dicke mit der Breite
      const w = hw, hd = depth * hw + 0.02 * R * Math.sin(Math.PI * v);
      return out.set(c.x + n.x * w * Math.cos(th), c.y + n.y * w * Math.cos(th), hd * Math.sin(th));
    },
    color: (u, v, p) => {
      const th = u * TAU, cs = Math.cos(th);
      const g = low.clone().lerp(hi, smoothstep(0.35 + 0.45 * (p.y / R) + 0.6 * (p.z / R)));
      g.lerp(gold, 0.35);
      if (cs > 0.82) g.lerp(hi, 0.55);                                                  // helle Schneide außen
      const face = 1 - smoothstep((Math.abs(cs) - 0.18) / 0.22);                        // Mitte der Flächen
      const ends = smoothstep((v - 0.1) / 0.08) * smoothstep((0.9 - v) / 0.08);
      g.lerp(band, 0.88 * face * ends);
      return g.lerp(rim, smoothstep((0.075 - Math.min(v, 1 - v)) / 0.05));
    },
  }));
  // rote Spitzenkappen
  const tip = cur.tip;
  for (const s of [1, -1]) gs.push(ellipsoid(V(tip.x - 0.035 * R, s * (tip.y - 0.04 * R), 0), V(0.085 * R, 0, 0), V(0, 0.085 * R, 0), V(0, 0, 0.07 * R), SICHEL_C.rim, 10, 6));
  if (hub) {
    // Blüten-Nabe am Griff, beidseitig: fünf Blütenblätter (weiß, rosa Rand), gelbe Mitte
    const hc = V(-SICHEL_GRIP * R, 0, 0), hd = depth * cur(0.5).hw;
    const petal = C(SICHEL_C.petal), prim = C(SICHEL_C.petalRim);
    for (const zs of [1, -1]) {
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * TAU + Math.PI / 2, pc = V(hc.x + Math.cos(a) * 0.12 * R, Math.sin(a) * 0.12 * R, zs * (hd + 0.012 * R));
        gs.push(ellipsoid(pc, V(Math.cos(a), Math.sin(a), 0).multiplyScalar(0.105 * R), V(-Math.sin(a), Math.cos(a), 0).multiplyScalar(0.08 * R), V(0, 0, 0.04 * R),
          (p) => petal.clone().lerp(prim, smoothstep((p.distanceTo(V(hc.x, 0, p.z)) / R - 0.15) / 0.08)), 10, 6));
      }
      gs.push(ellipsoid(V(hc.x, 0, zs * (hd + 0.035 * R)), V(0.075 * R, 0, 0), V(0, 0.075 * R, 0), V(0, 0, 0.04 * R), (p) => C('#ffa01a').lerp(C('#fff07a'), smoothstep(0.6 + p.y / (0.15 * R))), 10, 6));
    }
  }
  const m = mergeAll(gs);
  return m;
}

/** Geometrien (alle mit position/normal/uv/color) verschmelzen. */
function mergeAll(gs) {
  let nv = 0, ni = 0;
  for (const g of gs) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), col = new Float32Array(nv * 3);
  const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  let vo = 0, io = 0;
  for (const g of gs) {
    const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, K = g.attributes.color, n = P.count;
    for (let i = 0; i < n; i++) {
      pos.set([P.getX(i), P.getY(i), P.getZ(i)], (vo + i) * 3);
      nor.set([N.getX(i), N.getY(i), N.getZ(i)], (vo + i) * 3);
      uv.set(U ? [U.getX(i), U.getY(i)] : [0, 0], (vo + i) * 2);
      col.set([K.getX(i), K.getY(i), K.getZ(i)], (vo + i) * 3);
    }
    if (g.index) { const I = g.index; for (let i = 0; i < I.count; i++) idx[io + i] = I.getX(i) + vo; io += I.count; }
    else { for (let i = 0; i < n; i++) idx[io + i] = vo + i; io += n; }
    vo += n;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

// ================================================================== Mütze
/**
 * Lage der Mütze (kopf-lokal): Rand (Goldband) als Elevation je Azimut – vorn über den Brauen, seitlich über den Ohren
 * (Zopfansätze bleiben frei), hinten über dem Nacken (Gretas Schopf kommt darunter hervor); Abstand zur Kopfform lift (deckt
 * das Haar samt Wulst, hinten etwas mehr); Kamm (Mondsichel) vorn oben.
 */
export const CAP = {
  rimEl: (az) => 0.31 + 0.21 * Math.cos(az) + 0.035 * Math.cos(2 * az),
  lift: (az, el) => 0.07 + 0.012 * (0.5 - 0.5 * Math.cos(az)) * (1 - smoothstep((el - 0.6) / 0.9)) + 0.018 * Math.sin(Math.PI * clamp((el - 0.2) / 1.37, 0, 1)),
  crest: { az: 0, el: 1.0, R: 0.1, tilt: 0.42 },
  bobble: { az: Math.PI, el: 1.08 },
};

export function sichelCapGeo(head, { bow = null, halloween = null } = {}) {
  const cap = C(SICHEL_C.cap), hi = C(SICHEL_C.capHi), low = C(SICHEL_C.capLow);
  const gold = C(SICHEL_C.band), goldHi = C(SICHEL_C.bandHi), goldLow = C(SICHEL_C.bandLow);
  const at = (az, el, extra = 0) => head.point(dirAE(az, el), CAP.lift(az, el) + extra);
  const gs = [];
  // Kappe: sechs Bahnen (Nähte etwas dunkler, Bahnen leicht gewölbt), oben voller
  gs.push(gridGeo({
    nu: 48, nv: 12,
    point: (u, v, out) => {
      const az = u * TAU, e0 = CAP.rimEl(az), el = lerp(e0, Math.PI / 2, v);
      const seam = Math.abs(Math.sin(3 * az));
      return out.copy(at(az, el, 0.006 * Math.pow(seam, 0.5) * smoothstep(v / 0.2) * (1 - smoothstep((v - 0.6) / 0.4))));
    },
    color: (u, v, p) => {
      const az = u * TAU, seam = Math.abs(Math.sin(3 * az));
      const d = p.clone().sub(head.c).normalize();
      const c = low.clone().lerp(hi, smoothstep(0.25 + 0.55 * d.y + 0.25 * d.x));
      c.lerp(cap, 0.45);
      return c.lerp(low, 0.4 * (1 - smoothstep(seam / 0.12)) * smoothstep(v / 0.15));
    },
  }));
  // Goldband am Rand
  const ring = [];
  for (let i = 0; i < 64; i++) { const az = (i / 64) * TAU; ring.push(at(az, CAP.rimEl(az), -0.002)); }
  const bandG = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ring, true), 72, 0.026, 7, true);
  gs.push(paint(bandG, (p) => goldLow.clone().lerp(goldHi, smoothstep(0.45 + (p.y - head.c.y - 0.1) / 0.14)).lerp(gold, 0.3)));
  // Schirm vorn: flache Linse, außen spitz zulaufend, leicht hängend; oben türkis, unten dunkler, Kante hell
  const A = 1.05, Lmax = 0.15, T = 0.016;
  gs.push(gridGeo({
    nu: 12, nv: 16, flip: true,
    point: (u, v, out) => {
      const az = lerp(-A, A, v), k = Math.cos((Math.PI / 2) * (az / A));
      const L = Lmax * Math.pow(Math.max(0, k), 0.6), th = u * TAU;
      const base = at(az, CAP.rimEl(az), -0.004);
      const outw = V(Math.cos(az), 0, Math.sin(az));
      const droop = 0.3;   // rad: Schirm neigt sich nach vorn-unten
      const dirL = outw.clone().multiplyScalar(Math.cos(droop)).add(V(0, -Math.sin(droop), 0));
      const nrm = outw.clone().multiplyScalar(Math.sin(droop)).add(V(0, Math.cos(droop), 0));
      const w = 0.5 * L * (1 + Math.cos(th)), h = T * Math.sin(th) * Math.min(1, L / 0.03 + 0.15);
      // leicht nach oben gewölbt (Mitte höher als die Spitze)
      const bow = 0.012 * Math.sin(Math.PI * (w / Math.max(L, 1e-6)));
      return out.copy(base).addScaledVector(dirL, w - 0.01).addScaledVector(nrm, h + bow - 0.006);
    },
    color: (u, v) => {
      const s = Math.sin(u * TAU), cs = Math.cos(u * TAU);
      const c = s > 0 ? cap.clone().lerp(hi, 0.25) : low.clone().lerp(cap, 0.25);
      return cs > 0.86 ? c.lerp(C('#e9fffb'), 0.5) : c;
    },
  }));
  // Bommel hinten oben (rosa Puschel) bzw. Kürbis (Halloween Lotti); Katzenohren (Halloween Greta) statt Bommel
  const bc = at(CAP.bobble.az, CAP.bobble.el, 0.05), bn = dirAE(CAP.bobble.az, CAP.bobble.el);
  if (halloween === 'kuerbis') {
    const or = C(SICHEL_C.pumpkin), dk = C(SICHEL_C.pumpkinDark);
    const pc = bc.clone().addScaledVector(bn, 0.012);
    const pg = new THREE.SphereGeometry(1, 16, 10);
    const P = pg.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i), a = Math.atan2(z, x), rib = 1 + 0.08 * Math.cos(8 * a) * Math.sqrt(Math.max(0, 1 - y * y));
      P.setXYZ(i, x * 0.085 * rib, y * 0.066, z * 0.085 * rib);
    }
    pg.computeVertexNormals();
    pg.applyMatrix4(new THREE.Matrix4().makeRotationZ(-0.25).setPosition(pc));
    gs.push(paint(pg, (p) => { const q = p.clone().sub(pc); const a = Math.atan2(q.z, q.x); return or.clone().lerp(dk, 0.45 * Math.pow(0.5 + 0.5 * Math.cos(8 * a), 6) + 0.25 * smoothstep(-q.y / 0.06)); }));
    const sc = pc.clone().add(V(-0.012, 0.07, 0));
    const stem = new THREE.CylinderGeometry(0.012, 0.018, 0.05, 6);
    stem.applyMatrix4(new THREE.Matrix4().makeRotationZ(0.35).setPosition(sc));
    gs.push(paint(stem, SICHEL_C.stem));
    gs.push(ellipsoid(sc.clone().add(V(0.03, -0.004, 0.022)), V(0.036, 0.004, 0.0), V(0, 0.008, 0), V(-0.008, 0, 0.024), SICHEL_C.stem, 8, 5));
  } else if (halloween === 'katze') {
    const ear = catEarGeo();
    for (const s of [1, -1]) {
      const az = s * 1.0, el = 1.02;
      const base = at(az, el, -0.012);
      const up = dirAE(az, el).add(V(0.05, 0.35, s * 0.05)).normalize();
      const fwd = V(1, 0, s * 0.45);
      const x = fwd.addScaledVector(up, -fwd.dot(up)).normalize();
      const z = new THREE.Vector3().crossVectors(x, up);
      const e = ear.clone();
      e.applyMatrix4(new THREE.Matrix4().makeBasis(x, up, z).multiply(new THREE.Matrix4().makeScale(0.92, 0.92, 0.92)).setPosition(base));
      gs.push(e);
    }
    ear.dispose();
  } else {
    const pink = C(SICHEL_C.bobble), phi = C(SICHEL_C.bobbleHi);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU;
      const T1 = V(0, 0, 1), T2 = new THREE.Vector3().crossVectors(bn, T1).normalize();
      const c = bc.clone().addScaledVector(T1, Math.cos(a) * 0.055).addScaledVector(T2, Math.sin(a) * 0.055).addScaledVector(bn, 0.01 * Math.sin(3 * a));
      gs.push(ellipsoid(c, V(0.048, 0, 0), V(0, 0.048, 0), V(0, 0, 0.048), (p) => pink.clone().lerp(phi, smoothstep(0.5 + (p.y - bc.y) / 0.08) * 0.6), 10, 7));
    }
    gs.push(ellipsoid(bc.clone().addScaledVector(bn, 0.03), V(0.072, 0, 0), V(0, 0.072, 0), V(0, 0, 0.072), (p) => pink.clone().lerp(phi, smoothstep(0.45 + (p.y - bc.y) / 0.09) * 0.75), 14, 10));
  }
  // Lotti: ihre Schleife seitlich am Band (nahe Seite, hinten)
  if (bow) {
    const az = 2.05, el = CAP.rimEl(az) + 0.07;
    const c = at(az, el, 0.022), n = head.normal(dirAE(az, el));
    const T = new THREE.Vector3().crossVectors(n, V(0, 1, 0)).normalize(), B = new THREE.Vector3().crossVectors(T, n).normalize();
    gs.push(...bowGeos(c, n, T, B, bow, 0.9));
  }
  return mergeAll(gs);
}

/** Schleife (zwei bauschige Schlaufen, Knoten, zwei Bänder) um c: n nach außen, T quer, B hoch; s = Größe. */
function bowGeos(c, n, T, B, color, s = 1) {
  const acc = C(color), fold = acc.clone().multiplyScalar(0.62);
  const shadeAt = (p) => acc.clone().lerp(fold, Math.exp(-p.distanceToSquared(c) / (0.0016 * s * s)));
  const out = [];
  for (const k of [1, -1]) {
    const q = new THREE.Quaternion().setFromAxisAngle(n, k * 0.32);
    const ax = T.clone().applyQuaternion(q), ay = B.clone().applyQuaternion(q);
    out.push(ellipsoid(c.clone().addScaledVector(ax, k * 0.09 * s).addScaledVector(n, -0.004 * s), ax.clone().multiplyScalar(0.1 * s), ay.clone().multiplyScalar(0.066 * s), n.clone().multiplyScalar(0.046 * s), shadeAt, 12, 8));
    const tc = c.clone().addScaledVector(B, -0.072 * s).addScaledVector(T, k * 0.03 * s);
    out.push(ellipsoid(tc, T.clone().multiplyScalar(0.025 * s).applyAxisAngle(n, k * 0.35), B.clone().multiplyScalar(0.056 * s).applyAxisAngle(n, k * 0.35), n.clone().multiplyScalar(0.017 * s), acc, 8, 5));
  }
  out.push(ellipsoid(c.clone().addScaledVector(n, 0.012 * s), T.clone().multiplyScalar(0.04 * s), B.clone().multiplyScalar(0.044 * s), n.clone().multiplyScalar(0.034 * s), acc.clone().multiplyScalar(0.92), 10, 6));
  return out;
}

// ================================================================== Umhang
/**
 * Umhang im Rumpf-System der Heldin (Einheiten; Becken-Ursprung, Blick +X): hängt vom Nacken (unter dem Hinterkopf) über den
 * Rücken bis knapp über die Taille, als Bogen um die Körperachse (nur hinten – die Arme schwingen frei daran vorbei), unten
 * weiter (über dem Rock). Saum als Mondsichel: die Ecken hängen tiefer.
 */
export const CAPE = {
  y0: 0.44, L: 0.29,           // Oberkante, Länge in der Mitte (Ecken + corner)
  corner: 0.06,
  r0: 0.128, r1: 0.25,         // Radius um die Körperachse oben/unten
  a0: 0.95, a1: 0.86,          // halber Öffnungswinkel oben/unten (rad, um −X)
  thick: 0.012,
  pivot: null,                 // Drehpunkt (oben Mitte) – unten gesetzt
};
CAPE.pivot = V(-CAPE.r0, CAPE.y0, 0);
const capeR = (v) => CAPE.r0 + (CAPE.r1 - CAPE.r0) * Math.pow(v, 0.85);
const capeA = (v) => lerp(CAPE.a0, CAPE.a1, v);
const capeLen = (s) => CAPE.L + CAPE.corner * s * s * s * s;
/** Punkt der Umhang-Mittelfläche: s ∈ [−1, 1] quer (+Z), v ∈ [0, 1] von oben nach unten; off entlang der Normalen (außen +). */
function capePoint(s, v, off = 0, out = V()) {
  const r = capeR(v) + 0.007 * Math.cos(5 * Math.PI * s) * smoothstep((v - 0.15) / 0.6), ph = s * capeA(v);
  const y = CAPE.y0 - capeLen(s) * v;
  const rr = r + off;
  return out.set(-rr * Math.cos(ph) - CAPE.pivot.x, y - CAPE.pivot.y, rr * Math.sin(ph));
}

export function sichelCapeGeo({ halloween = false } = {}) {
  const cap = C(SICHEL_C.cap), hi = C(SICHEL_C.capHi), low = C(SICHEL_C.capLow);
  const lin = C(halloween ? SICHEL_C.hwLining : SICHEL_C.lining), linHi = C(halloween ? SICHEL_C.hwLiningHi : SICHEL_C.liningHi);
  const gold = C(SICHEL_C.band), goldHi = C(SICHEL_C.bandHi), goldLow = C(SICHEL_C.bandLow);
  const h = CAPE.thick / 2, nu = 20, nv = 9;
  const gs = [];
  // außen (Normalen nach außen): Falten heller/dunkler, oben heller
  gs.push(gridGeo({
    nu, nv, wrapU: false,
    point: (u, v, out) => capePoint(2 * u - 1, v, h, out),
    color: (u, v) => {
      const s = 2 * u - 1;
      return low.clone().lerp(hi, 0.25 + 0.4 * (1 - v)).lerp(cap, 0.5).multiplyScalar(0.93 + 0.07 * Math.cos(5 * Math.PI * s));
    },
  }));
  // innen (Futter)
  gs.push(gridGeo({
    nu, nv, wrapU: false, flip: true,
    point: (u, v, out) => capePoint(2 * u - 1, v, -h, out),
    color: (u, v) => lin.clone().lerp(linHi, 0.2 + 0.35 * v),
  }));
  // Goldpaspel rundum (schließt die Kante zwischen außen und innen)
  const edge = [];
  for (let i = 0; i <= 10; i++) edge.push(capePoint(-1, i / 10, 0));
  for (let i = 1; i < 24; i++) edge.push(capePoint(-1 + (2 * i) / 24, 1, 0));
  for (let i = 10; i >= 0; i--) edge.push(capePoint(1, i / 10, 0));
  for (let i = 23; i >= 1; i--) edge.push(capePoint(-1 + (2 * i) / 24, 0, 0));
  const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge, true, 'centripetal'), 96, h + 0.006, 5, true);
  gs.push(paint(tube, (p) => goldLow.clone().lerp(goldHi, smoothstep(0.5 + (p.y + 0.15) / 0.35)).lerp(gold, 0.35)));
  // Applikation auf dem Rücken: goldene Mondsichel (Öffnung zur nahen Seite, leicht schräg) und ein Sternchen
  gs.push(...capeMoonGeos(h));
  return mergeAll(gs);
}

/** Mondsichel und Sternchen auf der Außenseite des Umhangs (auf die Fläche gelegt, leicht gepolstert). */
function capeMoonGeos(h) {
  const gold = C(SICHEL_C.gold), hi = C(SICHEL_C.goldHi), low = C(SICHEL_C.goldLow);
  const out = [];
  // Flächen-Koordinaten (Bogenlänge quer x, nach unten y) → Punkt auf der Außenseite
  const onCape = (x, y, lift, o = V()) => {
    const v = clamp(y / CAPE.L, 0, 1), r = capeR(v), s = clamp(x / (r * capeA(v)), -1, 1);
    return capePoint(s, v, h + lift, o);
  };
  const R = 0.07, cur = crescent(R, 0.78, 0.45), cx = 0.0, cy = 0.13, rot = 0.5;
  out.push(gridGeo({
    nu: 10, nv: 22,
    point: (u, v, o) => {
      const { c, n, hw } = cur(v), th = u * TAU;
      // halber Ring: außen gepolstert (Querschnitt halbe Ellipse über der Fläche)
      const q = c.clone().addScaledVector(n, hw * Math.cos(th));
      const x = q.x * Math.cos(rot) - q.y * Math.sin(rot), y = q.x * Math.sin(rot) + q.y * Math.cos(rot);
      return onCape(cx + x, cy - y, 0.002 + 0.35 * hw * Math.max(0, Math.sin(th)), o);
    },
    color: (u, v) => low.clone().lerp(hi, 0.3 + 0.5 * Math.max(0, Math.sin(u * TAU))).lerp(gold, 0.3),
  }));
  // Sternchen (fünf Zacken) in der Öffnung der Sichel
  const sx = cx + 0.045, sy = cy - 0.05, sr = 0.026;
  out.push(gridGeo({
    nu: 30, nv: 3,
    point: (u, v, o) => {
      const th = u * TAU, rr = sr * (0.5 + 0.5 * Math.pow(0.5 + 0.5 * Math.cos(5 * (th - Math.PI / 2)), 1.6)) * v;
      return onCape(sx + rr * Math.cos(th), sy - rr * Math.sin(th), 0.003 + 0.012 * Math.sqrt(Math.max(0, 1 - v * v)), o);
    },
    color: (u, v) => gold.clone().lerp(hi, 0.6 * (1 - smoothstep(v / 0.7))),
  }));
  return out;
}

// ================================================================== Kordel und Schließe
/** Goldene Kordel um den Hals (von den oberen Umhang-Ecken über den Kragen nach vorn) und Sichel-Schließe vorn (rumpf-lokal). */
export function sichelCordGeos() {
  const gold = C(SICHEL_C.band), goldHi = C(SICHEL_C.bandHi), goldLow = C(SICHEL_C.bandLow);
  const gs = [];
  const r0 = CAPE.r0, a0 = CAPE.a0;
  for (const s of [1, -1]) {
    const pts = [
      V(-r0 * Math.cos(a0), CAPE.y0 - 0.004, s * r0 * Math.sin(a0)),
      V(-0.02, CAPE.y0 - 0.008, s * 0.118),
      V(0.06, 0.424, s * 0.106),
      V(0.108, 0.398, s * 0.055),
      V(0.128, 0.382, s * 0.0),
    ];
    const t = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, 0.011, 5, false);
    gs.push(paint(t, (p) => goldLow.clone().lerp(goldHi, smoothstep(0.5 + (p.y - 0.41) / 0.05)).lerp(gold, 0.4)));
  }
  // Schließe: kleine Sichel, Öffnung nach oben, Fläche nach vorn
  const cl = sichelBladeGeo(0.05, { depth: 0.5, hub: false, nu: 8, nv: 16 });
  cl.applyMatrix4(new THREE.Matrix4().makeBasis(V(0, 1, 0), V(0, 0, 1), V(1, 0, 0)).setPosition(0.132, 0.352, 0));
  gs.push(cl);
  return gs;
}
