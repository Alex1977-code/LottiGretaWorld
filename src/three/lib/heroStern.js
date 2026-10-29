// Sternenglanz-Kostüm der Heldinnen und Pflaumes Sternenhalsband (Bonuswelt Stern, Belohnung für den Abschluss von S-2; Vertrag
// docs/KURS-ARCHITEKTUR.md „Präzisierung (Figuren Bonuswelten): Sternenglanz-Kostüm“). Verkleidung 'stern' über three/lib/outfit.js
// (Wunsch-Kostüm aus dem Spielstand, Halloween-Welt hat Vorrang). Eigene Gestaltung, kindgerecht und märchenhaft:
//  - Lotti: tiefblaues Sternenkleid (zum Saum hin nachtviolett) mit goldenen Pausback-Sternen und Goldstaub, goldene Saumborte,
//    sternweiße Puffärmel, hellgoldener Kragen; Sternen-Haarspange (goldener Stern) auf dem Knoten ihrer roten Schleife.
//  - Greta: pastell-lila Sternenkleid mit rosa Schürze, silberne Sterne und Silberstaub, Silberborte; Sternen-Diadem (silberne
//    Zacken, rosa Perlen, großer Silberstern in der Mitte) auf ihrem rosa Haarreif.
//  - Funkeln: kleine vierstrahlige Glitzersterne (unbeleuchtet weiß) blitzen auf den aufgedruckten Sternen auf – beim Laufen und
//    Springen öfter, im Stand selten; Sternenschweif beim Weitsprung (gepolsterte Sternchen, gold bzw. silber/rosa).
//  - Pflaume: goldene Sternchen rund um das Halstuch und eine Sternbrosche auf dem Knoten (im Fell-Mesh des Kopfes).
// Figurenstil: glatte Flächen aus Parametern (gridGeo), Vertexfarben, alle Geometrien mit position/normal/uv/color – so bündelt
// die Kurs-Ansicht sie mit den Teilen gleichen Materials (Stoff, Haar, Glanz, Glanzpunkte; view/ShadowProxy.js): das Kostüm
// kostet keinen zusätzlichen Zeichenaufruf. three/ importiert nichts aus course/.
//
//   STERN_C                      Farben (je Heldin, Pflaume)
//   sternStyle(st)               Stil der Heldin im Sternenkleid (Kleid, Ärmel, Kragen, Schürze; st.stern = 'lotti' | 'greta')
//   starR(th, inner, round)      Umriss eines fünfzackigen Sterns: Anteil des Außenradius je Winkel (Spitze oben bei th = π/2)
//   STAR_PRINTS                  Lage der aufgedruckten Sterne je Heldin: { bodice: [[s, t, R]], skirt: [[s, t, R]] } (Flächen-
//                                koordinaten der Kleid-Flächen: s = Bogenlänge quer, vorn 0, +s → +Z; t = Höhe; R = Radius)
//   starPrintGeos(at, list, o)   aufgedruckte Sterne (gepolstert, Glanz oben, Rand dunkler) und Sternenstaub auf einer Fläche:
//                                at(s0, t0) → map(ds, dt, lift, out) bildet Versätze um die Sternmitte (Einheiten, quer/hoch)
//                                auf die Fläche ab (so bleiben Sterne auch auf schrägen Drehkörpern unverzerrt); o = { colors,
//                                lift, puff, dust: [[s, t, R]] }; list-Einträge [s, t, R, lift?]
//   dustSpots(o)                 deterministisch verstreuter Sternenstaub (Flächenkoordinaten) um die Rock-Fläche
//   puffyStarGeo(o)              gepolsterter Stern (Kissen, beide Seiten; stern-lokal: Fläche XY, Spitze +Y, Dicke ±Z)
//   starClipGeos(c, n, T, B, o)  Sternen-Haarspange: Stern um c (n nach außen, T quer, B hoch) mit Glanzperle
//   tiaraGeos(band, o)           Sternen-Diadem auf einem Reif: band(ph) → { p (Oberkante des Reifs), n (außen), t (entlang) }
//   glintGeo(R)                  Glitzer: vierstrahliger Funkelstern aus drei gekreuzten Flächen (beidseitig), weiß
//   trailStarGeo(kind)           Stern des Sternenschweifs ('gold' | 'silber' | 'rosa')
//   collarGeos(o)                Pflaumes Sternenhalsband (kopf-lokal) zum Halstuch-Ring o = { center, axis, R, tube, knot }
//   SPARKLE                      Takt und Lebensdauer von Funkeln und Schweif

import * as THREE from 'three';
import { TAU, lerp, smoothstep, gridGeo } from './figures.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const C = (c) => new THREE.Color(c);

/** Farben: Gold (Lotti, Pflaume), Silber (Greta). */
export const STERN_C = {
  lotti: {
    dress: '#2738ae', dressLow: '#3a2c9c', sleeve: '#e2e8ff', collar: '#ffe28a',
    star: '#ffc928', starHi: '#fff6bc', starLow: '#d98a12', dust: '#ffe7a0', trim: '#ffc21a', trimHi: '#fff1a6', trimLow: '#cf8410',
  },
  greta: {
    dress: '#c3a2f2', dressLow: '#d7a4ea', apron: '#ffc9e6',
    star: '#eef1fb', starHi: '#ffffff', starLow: '#9aa3c4', dust: '#ffffff', trim: '#eef2fb', trimHi: '#ffffff', trimLow: '#a8b0cc',
    gem: '#ff6fb8', gemHi: '#ffd6ec',
  },
  gold: '#ffc928', goldHi: '#fff6bc', goldLow: '#d98a12',
  silver: '#eef1fb', silverHi: '#ffffff', silverLow: '#9aa3c4',
  pink: '#ff8cc8', pinkHi: '#ffe0f0', pinkLow: '#e0559c',
};

/** Stil der Heldin im Sternenkleid (Lotti hat Zöpfe, Greta offenes Haar und Schürze). */
export function sternStyle(st) {
  if (st.braids) {
    const c = STERN_C.lotti;
    return { ...st, dress: c.dress, sleeve: c.sleeve, collar: c.collar, stern: 'lotti', sc: c };
  }
  const c = STERN_C.greta;
  return { ...st, dress: c.dress, sleeve: c.dress, apronC: c.apron, stern: 'greta', sc: c };
}

/** Umriss eines fünfzackigen Sterns (Pausback: runde Spitzen), Anteil des Außenradius; Spitze oben (th = π/2). */
export function starR(th, inner = 0.48, round = 1.3) {
  const k = 0.5 + 0.5 * Math.cos(5 * (th - Math.PI / 2));
  return inner + (1 - inner) * Math.pow(k, round);
}
/** Winkelversatz, damit ein Umlauf aus nu Punkten (nu Vielfaches von 10) genau die fünf Spitzen und Kerben trifft. */
const starPhase = (nu) => { const step = TAU / nu; return Math.PI / 2 - Math.round(Math.PI / 2 / step) * step; };

/**
 * Aufgedruckte Sterne (Flächenkoordinaten s/t in Einheiten; R = Außenradius). Mieder: Lotti einer vorn auf dem Blusen-Einsatz-Rand,
 * je einer an den Seiten, zwei auf dem Rücken; Greta einer auf dem Schürzenlatz, Seiten und Rücken. Rock: zwei versetzte Reihen
 * rundum (Greta vorn ausgespart: Schürze, dort zwei kleine Sterne auf der Schürze).
 */
export const STAR_PRINTS = {
  lotti: {
    bodice: [[0.0, 0.245, 0.042], [0.16, 0.2, 0.03], [-0.16, 0.2, 0.03], [0.34, 0.27, 0.036], [-0.34, 0.27, 0.036], [0.47, 0.16, 0.03]],
    skirt: [
      [0.0, -0.052, 0.054], [0.27, -0.06, 0.05], [-0.27, -0.06, 0.05], [0.55, -0.052, 0.054], [-0.55, -0.052, 0.054], [0.83, -0.06, 0.05], [-0.83, -0.06, 0.05],
      [0.14, 0.062, 0.036], [-0.14, 0.062, 0.036], [0.41, 0.058, 0.038], [-0.41, 0.058, 0.038], [0.66, 0.064, 0.036], [-0.66, 0.064, 0.036],
    ],
  },
  greta: {
    bodice: [[0.0, 0.245, 0.034], [0.2, 0.2, 0.03], [-0.2, 0.2, 0.03], [0.36, 0.27, 0.036], [-0.36, 0.27, 0.036], [0.47, 0.16, 0.03]],
    skirt: [
      [0.31, -0.06, 0.05], [-0.31, -0.06, 0.05], [0.57, -0.052, 0.054], [-0.57, -0.052, 0.054], [0.84, -0.06, 0.05], [-0.84, -0.06, 0.05],
      [0.31, 0.065, 0.034], [-0.31, 0.065, 0.034], [0.5, 0.058, 0.038], [-0.5, 0.058, 0.038], [0.7, 0.064, 0.036], [-0.7, 0.064, 0.036],
      [0.075, 0.01, 0.032], [-0.085, -0.065, 0.026],
    ],
  },
};

/** Sternenstaub: kleine vierstrahlige Glitzerpunkte, deterministisch verstreut (Flächenkoordinaten). */
export function dustSpots({ n = 26, s0 = -0.95, s1 = 0.95, t0 = -0.1, t1 = 0.12, avoid = [], R = 0.009, seed = 7 } = {}) {
  let x = seed;
  const rnd = () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; };
  const out = [];
  for (let i = 0; i < n * 3 && out.length < n; i++) {
    const s = lerp(s0, s1, (out.length + rnd()) / n), t = lerp(t0, t1, rnd());
    if (avoid.some(([as, at, ar]) => Math.hypot(s - as, t - at) < ar + 0.03)) continue;
    out.push([s, t, R * (0.75 + 0.5 * rnd())]);
  }
  return out;
}

/**
 * Aufgedruckte Sterne und Staub auf einer Fläche (at(s0, t0) → map(ds, dt, lift, out); Umlaufsinn wie die Schürze: flip).
 * colors = { star, starHi, starLow, dust }: Stern gepolstert (Mitte etwas höher), heller Glanz oben, Rand dunkler.
 */
export function starPrintGeos(at, list, { colors, lift = 0.004, puff = 0.007, dust = [], segs = 20, rings = 2, inner = 0.46, round = 1.25 } = {}) {
  const hi = C(colors.starHi), mid = C(colors.star), low = C(colors.starLow), dc = C(colors.dust ?? colors.starHi);
  const out = [];
  const decal = (s0, t0, R, shape, lf, color, nv, nu, ph = 0) => {
    const map = at(s0, t0);
    return gridGeo({
      nu, nv, wrapU: true, flip: true,
      point: (u, v, o) => { const [ds, dt] = shape(v, u * TAU + ph); return map(ds * R, dt * R, lf(v), o); },
      color: (u, v) => color(v, u * TAU + ph),
    });
  };
  for (const [s0, t0, R, l0] of list) {
    const shape = (v, th) => { const r = starR(th, inner, round) * v; return [r * Math.cos(th), r * Math.sin(th)]; };
    const base = l0 ?? lift;
    out.push(decal(s0, t0, R, shape, (v) => base + puff * (R / 0.04) * (1 - v * v), (v, th) => {
      // Glanz zur oberen „Licht“-Seite (−s ist von außen gesehen rechts – gespiegelt unkritisch), Rand dunkler
      const g = mid.clone().lerp(hi, 0.75 * (1 - smoothstep(v / 0.55)) * (0.55 + 0.45 * Math.sin(th)));
      return g.lerp(low, 0.7 * smoothstep((v - 0.72) / 0.28));
    }, rings, segs, starPhase(segs)));
  }
  // Staub: vierstrahlig, flach, hell
  for (const [s0, t0, R] of dust) {
    const shape = (v, th) => { const r = (0.42 + 0.58 * Math.pow(Math.abs(Math.cos(2 * th)), 4)) * v; return [r * Math.cos(th), r * Math.sin(th)]; };
    out.push(decal(s0, t0, R, shape, () => lift * 0.8, () => dc, 1, 8));
  }
  return out;
}

/**
 * Gepolsterter Stern (beide Seiten): Fläche XY, Spitze nach +Y, Dicke depth·R entlang ±Z (Kissen: Mitte am dicksten, Rand 0).
 * color(p, v, side) → Farbe (v = 0 Mitte … 1 Rand, side ±1); Standard: Gold mit Glanz oben und dunklerem Rand.
 */
export function puffyStarGeo({ R = 0.05, inner = 0.46, round = 1.25, depth = 0.4, nu = 20, nv = 2, colors = null, color = null } = {}) {
  const k = colors ?? { star: STERN_C.gold, starHi: STERN_C.goldHi, starLow: STERN_C.goldLow };
  const hi = C(k.starHi), mid = C(k.star), low = C(k.starLow);
  const col = color ?? ((p, v) => mid.clone().lerp(hi, 0.8 * (1 - smoothstep(v / 0.6)) * smoothstep(0.5 + p.y / R)).lerp(low, 0.65 * smoothstep((v - 0.7) / 0.3)));
  const ph = starPhase(nu);
  const face = (side) => gridGeo({
    nu, nv, wrapU: true, flip: side < 0,
    point: (u, v, o) => {
      const th = u * TAU + ph, r = R * starR(th, inner, round) * v;
      return o.set(r * Math.cos(th), r * Math.sin(th), side * depth * R * Math.sqrt(Math.max(0, 1 - v * v)));
    },
    color: (u, v, p) => col(p, v, side),
  });
  return mergeAll([face(1), face(-1)]);
}

/** Sternen-Haarspange: gepolsterter Goldstern um c (Fläche ⟂ n, Spitze entlang B, leicht gedreht), kleine Glanzperle in der Mitte. */
export function starClipGeos(c, n, T, B, { R = 0.058, roll = 0.18, colors = null } = {}) {
  const g = puffyStarGeo({ R, depth: 0.42, nu: 30, nv: 2, colors });
  const x = T.clone().applyAxisAngle(n, roll), y = B.clone().applyAxisAngle(n, roll);
  g.applyMatrix4(new THREE.Matrix4().makeBasis(x, y, n).setPosition(c));
  const pearl = sphereGeo(c.clone().addScaledVector(n, 0.42 * R + 0.004), 0.014, (p) => C('#fffbe8').lerp(C('#ffd76a'), smoothstep((c.y - p.y) / 0.02 + 0.5)), 8, 5);
  return [g, pearl];
}

/**
 * Sternen-Diadem auf einem Reif: band(ph) → { p: Punkt auf der Oberkante, n: nach außen, t: entlang des Reifs } für ph ∈ [−1, 1]
 * (Mitte 0). Silberne Zacken (Mitte am höchsten) auf einem schmalen Silberbogen, rosa Perlen dazwischen, großer gepolsterter
 * Silberstern über der Mitte, zwei kleine Sterne seitlich.
 */
export function tiaraGeos(band, { span = 0.62, colors = null } = {}) {
  const k = colors ?? STERN_C.greta;
  const sil = C(k.star), silHi = C(k.starHi), silLow = C(k.starLow), gem = C(k.gem ?? STERN_C.pink), gemHi = C(k.gemHi ?? STERN_C.pinkHi);
  const gs = [];
  // Bogen: schmales Silberband entlang der Reif-Oberkante
  const pts = [];
  for (let i = 0; i <= 20; i++) { const ph = lerp(-span, span, i / 20), b = band(ph); pts.push(b.p.clone().addScaledVector(b.n, 0.004)); }
  const arc = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.011, 4, false);
  gs.push(paint(arc, () => silLow.clone().lerp(silHi, 0.6).lerp(sil, 0.3)));
  // Zacken: gerundete Spitzen nach außen, zur Mitte höher
  for (const [ph, h] of [[-0.82, 0.036], [-0.55, 0.05], [-0.27, 0.062], [0.27, 0.062], [0.55, 0.05], [0.82, 0.036]]) {
    const b = band(ph * span);
    const base = b.p.clone().addScaledVector(b.n, 0.006);
    const side = new THREE.Vector3().crossVectors(b.n, b.t).normalize();
    gs.push(ellipsoidGeo(base.clone().addScaledVector(b.n, h * 0.5), b.t.clone().multiplyScalar(0.013), b.n.clone().multiplyScalar(h * 0.55), side.multiplyScalar(0.008),
      (p) => silLow.clone().lerp(silHi, smoothstep(p.clone().sub(base).dot(b.n) / h)), 6, 5));
    // kleine Kugel auf der Zackenspitze
    gs.push(sphereGeo(base.clone().addScaledVector(b.n, h + 0.005), 0.011, () => silHi));
  }
  // rosa Perlen zwischen den Zacken (auf dem Bogen)
  for (const ph of [-0.68, -0.41, 0.41, 0.68]) {
    const b = band(ph * span);
    const c = b.p.clone().addScaledVector(b.n, 0.014);
    gs.push(sphereGeo(c, 0.012, (p) => gem.clone().lerp(gemHi, 0.7 * smoothstep(p.clone().sub(c).dot(b.n) / 0.012 + 0.2))));
  }
  // Mittelstern (Fläche ⟂ Blickrichtung: aufgespannt von Reif-Richtung und Außennormale) und zwei kleine seitlich
  const star = (ph, R, lift) => {
    const b = band(ph * span);
    const g = puffyStarGeo({ R, depth: 0.38, nu: R > 0.05 ? 30 : 20, nv: 2, colors: { star: k.star, starHi: k.starHi, starLow: k.starLow } });
    const x = b.t.clone(), y = b.n.clone(), z = new THREE.Vector3().crossVectors(x, y).normalize();
    g.applyMatrix4(new THREE.Matrix4().makeBasis(x, y, z).setPosition(b.p.clone().addScaledVector(b.n, lift + 0.86 * R)));
    gs.push(g);
    return b.p.clone().addScaledVector(b.n, lift + 0.86 * R);
  };
  const mc = star(0, 0.092, 0.022);
  star(-0.97, 0.036, 0.0); star(0.97, 0.036, 0.0);
  // rosa Herz-Perle im Mittelstern (beidseitig sichtbar)
  { const b = band(0); const z = new THREE.Vector3().crossVectors(b.t, b.n).normalize(); for (const s of [1, -1]) gs.push(sphereGeo(mc.clone().addScaledVector(z, s * 0.026), 0.014, () => gem)); }
  return gs;
}

/** Glitzer: vierstrahliger Funkelstern aus drei gekreuzten Flächen (beidseitig; unbeleuchtet weiß gedacht), Außenradius R. */
export function glintGeo(R = 1) {
  const gs = [];
  const ray = (th) => 0.14 + 0.86 * Math.pow(Math.abs(Math.cos(2 * th)), 7);
  const planes = [[V(1, 0, 0), V(0, 1, 0)], [V(0, 0, 1), V(0, 1, 0)], [V(1, 0, 0), V(0, 0, 1)]];
  for (const [a, b] of planes) {
    for (const side of [1, -1]) {
      gs.push(gridGeo({
        nu: 8, nv: 1, wrapU: true, flip: side < 0,
        point: (u, v, o) => { const th = u * TAU, r = R * ray(th) * v; return o.copy(a).multiplyScalar(r * Math.cos(th)).addScaledVector(b, r * Math.sin(th)); },
        color: () => 0xffffff,
      }));
    }
  }
  return mergeAll(gs);
}

/** Stern des Sternenschweifs (Außenradius 1 – Größe über den Maßstab): Gold, Silber oder Rosa. */
export function trailStarGeo(kind = 'gold') {
  const k = kind === 'silber' ? { star: STERN_C.silver, starHi: STERN_C.silverHi, starLow: STERN_C.silverLow }
    : kind === 'rosa' ? { star: STERN_C.pink, starHi: STERN_C.pinkHi, starLow: STERN_C.pinkLow }
      : { star: STERN_C.gold, starHi: STERN_C.goldHi, starLow: STERN_C.goldLow };
  return puffyStarGeo({ R: 1, inner: 0.44, round: 1.1, depth: 0.42, nu: 10, nv: 2, colors: k });
}

/**
 * Pflaumes Sternenhalsband (kopf-lokal) zum Halstuch-Ring: center, axis (Halsachse), R (Ringradius), tube (Wulstradius), knot
 * (Knoten vorn). Goldene Sternchen rundum auf dem Wulst (vorn am Knoten ausgespart), große Sternbrosche auf dem Knoten.
 */
export function collarGeos({ center, axis, R, tube, knot, n = 9 }) {
  const gs = [];
  // auf dem matten Fell-Material etwas heller und wärmer als das Gold der Kleider (liest sich sonst oliv)
  const colors = { star: '#ffd84a', starHi: '#fffbd8', starLow: '#f29a18' };
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), axis.clone().normalize());
  const ax = axis.clone().normalize();
  const fwd = knot.clone().sub(center).normalize();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const out = V(Math.cos(a), Math.sin(a), 0).applyQuaternion(q);
    if (out.dot(fwd) > 0.72) continue;   // vorn sitzen Knoten und Zipfel
    const p = center.clone().addScaledVector(out, R + tube * 0.92);
    const g = puffyStarGeo({ R: 0.046, depth: 0.45, nu: 10, nv: 2, colors });
    const y = ax.clone().addScaledVector(out, -ax.dot(out)).normalize(), x = new THREE.Vector3().crossVectors(y, out).normalize();
    g.applyMatrix4(new THREE.Matrix4().makeBasis(x, y, out).setPosition(p));
    gs.push(g);
  }
  // Brosche auf dem Knoten (blickt nach vorn-unten), mit Glanzperle
  const bn = fwd.clone().add(V(0, -0.25, 0)).normalize();
  const by = ax.clone().addScaledVector(bn, -ax.dot(bn)).normalize(), bx = new THREE.Vector3().crossVectors(by, bn).normalize();
  const bc = knot.clone().addScaledVector(bn, 0.06);
  const g = puffyStarGeo({ R: 0.092, depth: 0.42, nu: 20, nv: 2, colors });
  g.applyMatrix4(new THREE.Matrix4().makeBasis(bx, by, bn).setPosition(bc));
  gs.push(g);
  gs.push(sphereGeo(bc.clone().addScaledVector(bn, 0.04), 0.016, () => C('#fffbe8'), 8, 5));
  return gs;
}

/** Takt und Lebensdauer: Funkeln (Stand selten, Lauf je nach Tempo, Sprung-Stoß) und Sternenschweif (Weitsprung). */
export const SPARKLE = {
  life: 0.3,            // s: ein Glitzer blitzt auf und vergeht
  size: 0.07,           // Einheiten: Außenradius eines Glitzers
  idleGap: [1.4, 2.6],  // s: Abstand im Stand (zufällig im Bereich)
  runGap: 0.11,         // s: Abstand beim Laufen mit vollem Tempo (langsamer: länger)
  jumpBurst: 2,         // Glitzer beim Absprung
  trailGap: 0.034,      // s: Sternenschweif – Abstand der Sternchen
  trailLife: 0.7,       // s
  trailSize: 0.17,      // Einheiten
  trailN: 16,           // Teile (Sternchen und Glitzer im Wechsel)
};

// ------------------------------------------------------------------ Hilfen
/** Ellipsoid (Einheitskugel → Achsen ax, ay, az um c) mit Vertexfarbe; mit uv. */
function ellipsoidGeo(c, ax, ay, az, color, ws = 12, hs = 8) {
  const g = new THREE.SphereGeometry(1, ws, hs);
  g.applyMatrix4(new THREE.Matrix4().makeBasis(ax, ay, az).setPosition(c));
  return paint(g, color);
}
function sphereGeo(c, r, color, ws = 6, hs = 4) { return ellipsoidGeo(c, V(r, 0, 0), V(0, r, 0), V(0, 0, r), color, ws, hs); }
/** Geometrie einfarbig bzw. per Funktion (Position) färben. */
function paint(g, color) {
  const P = g.attributes.position, arr = new Float32Array(P.count * 3), cc = new THREE.Color(), p = V();
  for (let i = 0; i < P.count; i++) {
    p.fromBufferAttribute(P, i);
    const c = typeof color === 'function' ? color(p, i) : color;
    if (c && c.isColor) cc.copy(c); else cc.set(c);
    arr.set([cc.r, cc.g, cc.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

/** Geometrien (alle mit position/normal/uv/color) verschmelzen. */
export function mergeAll(gs) {
  let nv = 0, ni = 0;
  for (const g of gs) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), col = new Float32Array(nv * 3);
  const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  let vo = 0, io = 0;
  for (const g of gs) {
    const P = g.attributes.position, N = g.attributes.normal, Uv = g.attributes.uv, K = g.attributes.color, n = P.count;
    for (let i = 0; i < n; i++) {
      pos.set([P.getX(i), P.getY(i), P.getZ(i)], (vo + i) * 3);
      nor.set([N.getX(i), N.getY(i), N.getZ(i)], (vo + i) * 3);
      uv.set(Uv ? [Uv.getX(i), Uv.getY(i)] : [0, 0], (vo + i) * 2);
      col.set(K ? [K.getX(i), K.getY(i), K.getZ(i)] : [1, 1, 1], (vo + i) * 3);
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

