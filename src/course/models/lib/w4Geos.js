// Gemeinsame Geometrien, Farben und Hilfen der Welt-4-Modelle (src/course/models/kinds/*_w4.js) und ihrer
// Instanz-Varianten (lib/instanced_w4.js). Ergänzt kit.js / kit_w3.js, ändert nichts daran.
//
//  - Paletten: CANYON (Gesteinsschichten), LAVA (Basalt, Glut), ANT (Ameisen), PIEP (Piep-Blöcke), RUIN (Ruinen).
//  - Rauschen: hash1(i), noise3(x, y, z) (Wert-Rauschen 0..1), displace(g, amp, freq, seed) (Klumpen entlang der Normalen).
//  - strataColor(y, x, z, opts) – Canyon-Schichtfarbe je Höhe (wellige Bänder), lavaV() – Basalt mit Glutverlauf.
//  - Ameisen: antBodyGeo(kind), antHeadGeo(kind), antLegGeo(), antAntennaGeo(), antInstGeo(kind) (alles in einer
//    Geometrie, Augen eingebacken – für Instanzen), ANT_HIPS + antLegPose(...) (Dreifuß-Gang, je Bein eine Matrix).
//  - Piep-Block: piepSolidGeo(color, lo), piepOutlineGeo(), piepFillGeo(), piepMats(color) (geteilt), PIEP_COLORS.
//  - Ruinen-Säule: ruinSaeuleGeo(height, broken, lo), Felsnadel: felsnadelGeo(height, lo), Stachelwalze: walzeGeo(lo).
//  Alle Geometrien liegen im Cache (kit.cached) und werden nie entsorgt.

import {
  THREE, TAU, Build, cached, vcol, basic, std, col, mix, clamp, smoothstep, roundedBox, SIDE, capGeo, placed,
  smoothNormals, starShape,
} from './kit.js';

// ------------------------------------------------------------------ Farben
export const CANYON = {
  bands: [0xc9542c, 0xe58440, 0xf2b066, 0xd8693a, 0xf6d49c, 0xb94428, 0xeb9a52],
  grass: 0x6cc84a, grassDark: 0x47a23a, sand: 0xf3d08a, shadow: 0x8a3a24,
};
export const LAVA = {
  rock: 0x3a2e36, rockHi: 0x5c4448, rockLow: 0x241c24, ash: 0x6a5a5c, cool: 0x7a3a2a,
  hot: 0xff7a1a, hotter: 0xffb52e, white: 0xfff0b0, deep: 0xd8340e,
};
export const ANT = {
  body: 0x4f46d6, bodyHi: 0x7b74ff, bodyLow: 0x2c2788, band: 0x9f9aff, face: 0x6e66ee,
  helmet: 0xffc21a, helmetHi: 0xffe07a, helmetBand: 0xe8283a, star: 0xffffff,
  hornHelmet: 0xe2283c, hornHelmetHi: 0xff6a72, horn: 0xf4f2ff, hornRing: 0xffc21a,
  jaw: 0xfff0d0, boot: 0x1d1b4a, ink: 0x15102a, tip: 0xffd21f,
};
export const PIEP_COLORS = {
  rot: { base: 0xff2e72, hi: 0xff8ab4, low: 0xb81050, glow: 0xff5a94 },
  blau: { base: 0x2a6cff, hi: 0x8ab8ff, low: 0x1236b0, glow: 0x5a9aff },
};
export const RUIN = { stone: 0xf0dcb0, stoneHi: 0xfff2d4, stoneLow: 0xc8a878, moss: 0x7ab84a, mossDark: 0x4e8a34, inlay: 0x2ab0b8, gold: 0xffc21a };

// ------------------------------------------------------------------ Lage-Hilfe
const _Y = new THREE.Vector3(0, 1, 0);
/** Matrix: Grundkörper mit Achse +Y (mittig) an Mitte c, Achse entlang d, Skalierung s. */
export function axisY(c, d, s = 1) {
  const dd = new THREE.Vector3(...d).normalize();
  const sc = typeof s === 'number' ? new THREE.Vector3(s, s, s) : new THREE.Vector3(...s);
  return new THREE.Matrix4().compose(new THREE.Vector3(...c), new THREE.Quaternion().setFromUnitVectors(_Y, dd), sc);
}

// ------------------------------------------------------------------ Rauschen
export const hash1 = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function hash3(x, y, z) { const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return h - Math.floor(h); }
/** Wert-Rauschen 0..1 (trilinear, weich). */
export function noise3(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const L = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash3(ix + dx, iy + dy, iz + dz);
  return L(L(L(c(0, 0, 0), c(1, 0, 0), u), L(c(0, 1, 0), c(1, 1, 0), u), v), L(L(c(0, 0, 1), c(1, 0, 1), u), L(c(0, 1, 1), c(1, 1, 1), u), v), w);
}
/** Klumpen: verschiebt jede Ecke entlang ihrer Normalen um amp·(Rauschen − 0,5)·2; liefert weich schattierte Kopie. */
export function displace(g0, amp = 0.05, freq = 3, seed = 0, smooth = true) {
  const g = g0.index ? g0.toNonIndexed() : g0.clone();
  g0.dispose();
  if (!g.attributes.normal) g.computeVertexNormals();
  const P = g.attributes.position, N = g.attributes.normal;
  // gleiche Position → gleiche Verschiebung (Richtung aus der Position gemittelt, damit Nähte zu bleiben)
  const dir = new Map();
  for (let i = 0; i < P.count; i++) {
    const k = `${P.getX(i).toFixed(4)},${P.getY(i).toFixed(4)},${P.getZ(i).toFixed(4)}`;
    const d = dir.get(k) ?? [0, 0, 0];
    d[0] += N.getX(i); d[1] += N.getY(i); d[2] += N.getZ(i);
    dir.set(k, d);
  }
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    const d = dir.get(`${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`);
    const l = Math.hypot(d[0], d[1], d[2]) || 1;
    const n = (noise3(x * freq + seed, y * freq + seed * 0.7, z * freq - seed) - 0.5) * 2 * amp;
    P.setXYZ(i, x + (d[0] / l) * n, y + (d[1] / l) * n, z + (d[2] / l) * n);
  }
  if (smooth) return smoothNormals(g);
  g.deleteAttribute('normal');
  g.computeVertexNormals();
  return g;
}

/** Klumpiges Ellipsoid (Halbachsen rad, Mitte im Ursprung), weich schattiert. Passend dazu: lumpyPoint(). */
export function lumpyEllipsoid(rad, amp, freq, seed, ws = 28, hs = 20) {
  const g = new THREE.SphereGeometry(1, ws, hs);
  g.scale(rad[0], rad[1], rad[2]);
  return displace(g, amp, freq, seed, true);
}
/**
 * Punkt und Normale auf lumpyEllipsoid(rad, amp, freq, seed) in Richtung (az um Y ab +X, el Höhe), lift = Abstand
 * über der Oberfläche. c = Mitte (Verschiebung).
 */
export function lumpyPoint(rad, amp, freq, seed, az, el, lift = 0, c = [0, 0, 0]) {
  const d = [Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)];
  const bx = d[0] * rad[0], by = d[1] * rad[1], bz = d[2] * rad[2];
  const n = new THREE.Vector3(d[0] / rad[0], d[1] / rad[1], d[2] / rad[2]).normalize();
  const disp = (noise3(bx * freq + seed, by * freq + seed * 0.7, bz * freq - seed) - 0.5) * 2 * amp;
  const p = new THREE.Vector3(bx, by, bz).addScaledVector(n, disp + lift).add(new THREE.Vector3(...c));
  return { p, n };
}
/**
 * Glut-Risse als dünne Röhren auf einem lumpyEllipsoid: list = [{ az, el, steps, seed }]; jeder Riss läuft in
 * zufälligen Knicken über die Oberfläche. color: Farbe oder { v } (z. B. hell → dunkel).
 */
export function addCracks(b, body, list, r, color) {
  const { rad, amp, freq, seed, c } = body;
  for (const k of list) {
    let az = k.az, el = k.el;
    const dAz = Math.cos(k.seed * 3.1) * 0.2, dEl = Math.sin(k.seed * 5.3) * 0.2 - 0.06;
    const pts = [];
    const steps = k.steps ?? 5;
    for (let i = 0; i <= steps; i++) {
      pts.push(lumpyPoint(rad, amp, freq, seed, az, el, r * 0.6, c).p.toArray());
      az += dAz + (hash1(k.seed * 13 + i) - 0.5) * 0.35;
      el += dEl + (hash1(k.seed * 7 + i * 3) - 0.5) * 0.35;
    }
    b.tube(pts, r, color, null, steps * 4, 5);
    // Abzweig in der Mitte
    if (k.branch) {
      const m = Math.floor(steps / 2);
      let a2 = k.az + dAz * m, e2 = k.el + dEl * m;
      const bp = [];
      for (let i = 0; i < 3; i++) { bp.push(lumpyPoint(rad, amp, freq, seed, a2, e2, r * 0.6, c).p.toArray()); a2 += dEl * 1.3; e2 -= dAz * 1.3; }
      b.tube(bp, r * 0.75, color, null, 8, 5);
    }
  }
  return b;
}

/** Canyon-Schichtfarbe: wellige waagerechte Bänder (Dicke band m), oben (ny > top) Gras/Sand. */
export function strataColor(y, x = 0, z = 0, o = {}) {
  const band = o.band ?? 0.55, seed = o.seed ?? 0;
  const wob = Math.sin(x * 1.3 + z * 0.9 + seed) * 0.12 + (noise3(x * 0.8, y * 0.3, z * 0.8 + seed) - 0.5) * 0.25;
  const bands = o.bands ?? CANYON.bands;
  const i = Math.floor((y + wob) / band + seed * 3);
  return bands[((i % bands.length) + bands.length) % bands.length];
}
/** Basalt-Verlauf mit warmem Unterton (Ecken-Farbfunktion). */
export const lavaV = (lo = LAVA.rockLow, hi = LAVA.rockHi) => ({ v: (x, y, z, nx, ny) => mix(lo, hi, smoothstep(ny * 0.55 + 0.5)) });

// ------------------------------------------------------------------ Augen zum Einbacken (Instanzen)
/** Augen als Vertexfarben-Teile in einen Build (Weiß, Iris, Pupille, Glanzpunkt). list: [{ p, r, sy, dir }]. */
export function bakedEyes(b, list, o = {}) {
  for (const e of list) {
    const p = new THREE.Vector3(...e.p);
    const d = new THREE.Vector3(...(e.dir ?? [1, 0, 0])).normalize();
    const r = e.r, sy = e.sy ?? 1.2, dep = 0.55;
    const up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3().crossVectors(up, d).normalize();
    const front = p.clone().addScaledVector(d, r * dep);
    b.add(capGeo(Math.PI * 0.62, 10, 5), 0xffffff, placed(p, d, new THREE.Vector3(r, r * sy, r * dep)));
    const pr = r * (o.pupil ?? 0.55);
    if (o.iris) b.add(capGeo(Math.PI / 2, 10, 3), o.iris, placed(front.clone().addScaledVector(d, -pr * 0.5), d, new THREE.Vector3(pr * 1.45, pr * 1.45 * sy, pr * 0.62)));
    b.add(capGeo(Math.PI / 2, 8, 3), o.pupilColor ?? 0x15101c, placed(front.clone().addScaledVector(d, -pr * 0.36), d, new THREE.Vector3(pr, pr * sy * 1.05, pr * 0.6)));
    const h1 = front.clone().addScaledVector(d, pr * 0.2).addScaledVector(up, pr * sy * 0.42).addScaledVector(side, pr * 0.42);
    b.add(capGeo(Math.PI / 2, 6, 2), 0xffffff, placed(h1, d, new THREE.Vector3(r * 0.22, r * 0.26, r * 0.12)));
  }
  return b;
}

// =============================================================================================
// Ameisensoldat (normal / Horn) – Teile
// =============================================================================================
// Lage (Ursprung = Boden unter der Körpermitte, Blick +X): Hinterleib hinten, Brust mittig, Kopf vorn.
export const ANT_GEO = {
  gaster: { c: [-0.33, 0.37, 0], r: [0.31, 0.25, 0.26] },
  thorax: { c: [0.04, 0.33, 0], r: [0.15, 0.12, 0.125] },
  head: { c: [0.31, 0.43, 0], r: 0.215 },
};
const AG = ANT_GEO;

/** Brust und Hinterleib (Streifen, Glanz). */
export function antBodyGeo(lo = false) {
  return cached(`w4:ant:body:${lo}`, () => {
    const b = new Build();
    const q = lo ? 0.6 : 1, n = (k) => Math.max(6, Math.round(k * q));
    const g = AG.gaster;
    // Hinterleib: Kobalt mit zwei hellen Ringen, Glanz oben
    b.sphere(1, { v: (x, y, z, nx, ny) => {
      const ring = Math.abs(x + 0.12) < 0.09 || Math.abs(x - 0.32) < 0.08;
      const base = mix(ANT.bodyLow, ANT.bodyHi, smoothstep(ny * 0.6 + 0.45));
      return ring ? mix(base, ANT.band, 0.55) : base;
    } }, { p: g.c, s: g.r }, n(26), n(18));
    // Stachel-Spitzchen hinten (rund, harmlos)
    b.sphere(0.06, ANT.bodyLow, { p: [g.c[0] - g.r[0] * 0.98, g.c[1] - 0.02, 0], s: [1.3, 0.9, 0.9] }, n(10), n(8));
    // Taille und Brust
    b.sphere(0.075, ANT.bodyLow, { p: [-0.07, 0.31, 0] }, n(12), n(8));
    b.sphere(1, { v: (x, y, z, nx, ny) => mix(ANT.bodyLow, ANT.bodyHi, smoothstep(ny * 0.6 + 0.45)) }, { p: AG.thorax.c, s: AG.thorax.r }, n(20), n(14));
    // Uniform-Kragen (rot mit Goldknöpfen) zwischen Brust und Kopf
    b.add(new THREE.TorusGeometry(0.105, 0.034, n(8), n(20)), ANT.helmetBand, placed(new THREE.Vector3(0.16, 0.37, 0), new THREE.Vector3(0.94, 0.35, 0), new THREE.Vector3(1, 1, 1)));
    for (const s of [1, -1]) b.sphere(0.022, ANT.helmet, { p: [0.17, 0.33, s * 0.075] }, 8, 6);
    return b.geometry();
  });
}
/** Kopf mit Helm, Gesicht (Kieferzangen, Wangen); horn: Stachelhorn-Helm. */
export function antHeadGeo(horn = false, lo = false) {
  return cached(`w4:ant:head:${horn}:${lo}`, () => {
    const b = new Build();
    const q = lo ? 0.6 : 1, n = (k) => Math.max(6, Math.round(k * q));
    const R = AG.head.r;
    // Kopf (Ursprung = Kopfmitte)
    b.sphere(R, { v: (x, y, z, nx, ny) => mix(ANT.bodyLow, ANT.face, smoothstep(ny * 0.5 + 0.6)) }, { s: [1.02, 0.96, 1] }, n(24), n(18));
    // Schnauze/Kieferzangen (creme, gebogen)
    for (const s of [1, -1]) {
      // kurze, nach innen gebogene Zangen: Kegel nach vorn, Spitzen zueinander
      b.sphere(0.03, ANT.jaw, { p: [R * 0.84, -R * 0.56, s * 0.06] }, n(8), n(6));
      b.add(new THREE.ConeGeometry(0.024, 0.1, n(8)), ANT.jaw, axisY([R * 0.84 + 0.05, -R * 0.6, s * 0.045], [1, -0.15, -s * 0.45]));
    }
    b.sphere(0.05, ANT.bodyLow, { p: [R * 0.92, -R * 0.38, 0], s: [0.8, 0.6, 1.1] }, n(10), n(6));
    // Wangen
    for (const s of [1, -1]) b.sphere(0.035, 0xff8fc0, { p: [R * 0.72, -R * 0.3, s * R * 0.62], s: [0.6, 0.5, 0.9] }, n(8), n(6));
    // Helm: Kuppel mit Krempe, Band, Stern (normal) bzw. Stachelhorn (horn)
    const hc = horn ? ANT.hornHelmet : ANT.helmet, hh = horn ? ANT.hornHelmetHi : ANT.helmetHi;
    const tilt = { p: [-0.02, 0.035, 0], r: [0, 0, 0.32] };
    const hm = new THREE.Matrix4().compose(new THREE.Vector3(...tilt.p), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, tilt.r[2])), new THREE.Vector3(1, 1, 1));
    const hb = new Build();
    hb.dome(R * 1.13, { v: (x, y, z, nx, ny) => mix(hc, hh, smoothstep(ny * 0.8)) }, { s: [1.04, 0.92, 1.04] }, Math.PI * 0.5, n(26), n(8));
    hb.torus(R * 1.16, 0.03, hc, { r: [Math.PI / 2, 0, 0], s: [1.03, 1.03, 1] }, n(6), n(28));
    hb.torus(R * 1.12, 0.018, horn ? 0xffffff : ANT.helmetBand, { p: [0, 0.05, 0], r: [Math.PI / 2, 0, 0], s: [1.0, 1.0, 1] }, n(5), n(28));
    if (horn) {
      // großes Stachelhorn, leicht nach vorn, Goldring am Fuß, zwei kleine Seitendornen
      hb.cyl(0.075, 0.09, 0.05, ANT.hornRing, { p: [0.03, R * 1.0, 0] }, n(14));
      hb.add(new THREE.ConeGeometry(0.075, 0.34, n(14), 3), { v: (x, y) => mix(0xb8b4d8, ANT.horn, smoothstep(y / 0.34 + 0.5)) }, { p: [0.07, R * 1.0 + 0.19, 0], r: [0, 0, -0.28] });
      for (const s of [1, -1]) hb.add(new THREE.ConeGeometry(0.032, 0.12, n(8)), ANT.horn, { p: [-0.02, R * 0.92, s * 0.15], r: [s * 0.9, 0, 0.2] });
    } else {
      // weißer Stern vorn auf dem Helm, kleiner Knauf oben
      const st = new THREE.ExtrudeGeometry(starShape(0.07, 0.032), { depth: 0.02, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 1 });
      st.translate(0, 0, -0.01);
      hb.add(st, ANT.star, placed(new THREE.Vector3(R * 1.0, R * 0.55, 0), new THREE.Vector3(1, 0.62, 0), new THREE.Vector3(1, 1, 1)));
      hb.sphere(0.045, hh, { p: [0, R * 1.03, 0] }, n(10), n(8));
    }
    const hg = hb.geometry(); hg.applyMatrix4(hm); b.parts.push(hg);
    return b.geometry();
  });
}
/** Ein Bein (+Z-Seite) ab Hüfte im Ursprung: Oberschenkel hoch nach außen, Unterschenkel hinab, Stiefel. */
export function antLegGeo(lo = false) {
  return cached(`w4:ant:leg:${lo}`, () => {
    const b = new Build();
    const rs = lo ? 5 : 7;
    const hip = new THREE.Vector3(0, 0, 0.02), knee = new THREE.Vector3(0, 0.09, 0.2), foot = new THREE.Vector3(0, -0.29, 0.34);
    const seg = (a, c, r) => {
      const d = c.clone().sub(a), L = d.length();
      const m = new THREE.Matrix4().compose(a.clone().add(c).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), new THREE.Vector3(1, 1, 1));
      b.add(new THREE.CapsuleGeometry(r, L, 2, rs), ANT.bodyLow, m);
    };
    seg(hip, knee, 0.036);
    seg(knee, foot, 0.031);
    b.sphere(0.047, ANT.body, { p: knee.toArray() }, rs + 1, rs);
    // Stiefel (dunkel, vorn rund)
    b.sphere(1, ANT.boot, { p: [0.025, -0.27, 0.35], s: [0.075, 0.045, 0.052] }, rs + 3, rs);
    return b.geometry();
  });
}
/** Fühler (beide) mit gelben Kugelspitzen; Ursprung = Ansatz am Kopf. */
export function antAntennaGeo(lo = false) {
  return cached(`w4:ant:antenna:${lo}`, () => {
    const b = new Build();
    for (const s of [1, -1]) {
      // durch Löcher im Helm nach oben-außen, Spitzen weit neben dem Kopf
      b.tube([[0, -0.04, s * 0.085], [0.025, 0.1, s * 0.13], [0.08, 0.2, s * 0.19], [0.15, 0.23, s * 0.25]], 0.017, ANT.bodyLow, null, lo ? 8 : 12, lo ? 4 : 6);
      b.cyl(0.03, 0.034, 0.03, ANT.bodyLow, { p: [0.005, 0.03, s * 0.1], r: [s * -0.5, 0, -0.2] }, lo ? 6 : 8);
      b.sphere(0.043, ANT.tip, { p: [0.16, 0.23, s * 0.26] }, lo ? 8 : 12, lo ? 6 : 8);
    }
    return b.geometry();
  });
}
/** Ansatz der Fühler relativ zur Kopfmitte. */
export const ANT_ANTENNA_AT = [0.0, 0.17, 0];
export const ANT_EYES = [
  { p: [0.17, 0.035, 0.085], r: 0.07, sy: 1.3, dir: [1, 0.1, 0.45] },
  { p: [0.17, 0.035, -0.085], r: 0.07, sy: 1.3, dir: [1, 0.1, -0.45] },
];
export const ANT_EYE_OPTS = { iris: 0x2a2a6a, pupil: 0.56 };
/** Ganze Ameise in EINER Geometrie (Rumpf, Kopf, Helm, Augen, Fühler) für Instanzen; Beine extra. */
export function antInstGeo(horn = false) {
  return cached(`w4:ant:inst:${horn}`, () => {
    const b = new Build();
    b.parts.push(antBodyGeo(true).clone());
    const head = antHeadGeo(horn, true).clone();
    const eb = new Build();
    bakedEyes(eb, ANT_EYES, ANT_EYE_OPTS);
    const eg = eb.geometry();
    const ant = antAntennaGeo(true).clone(); ant.translate(...ANT_ANTENNA_AT);
    const hm = new THREE.Matrix4().makeTranslation(...AG.head.c);
    for (const g of [head, eg, ant]) { g.applyMatrix4(hm); b.parts.push(g); }
    return b.geometry();
  });
}

// Hüften (Brust): x, Seite s (+1 = +Z), Grundwinkel (vorn/hinten gespreizt), Gruppe (Dreifuß A/B)
export const ANT_HIPS = [
  { x: 0.13, s: 1, yaw: 0.62, g: 0 }, { x: 0.04, s: 1, yaw: 0.0, g: 1 }, { x: -0.06, s: 1, yaw: -0.62, g: 0 },
  { x: 0.13, s: -1, yaw: 0.62, g: 1 }, { x: 0.04, s: -1, yaw: 0.0, g: 0 }, { x: -0.06, s: -1, yaw: -0.62, g: 1 },
];
const _lq = new THREE.Quaternion(), _le = new THREE.Euler(), _lp = new THREE.Vector3(), _ls = new THREE.Vector3();
/**
 * Bein-Matrix k (0..5) für Gangphase phase: amp = Schwung (rad), lift = Anheben (rad), splay = Spreizen (rad,
 * squashed), hipY = Hüfthöhe, scale = Maßstab; out = Matrix4.
 */
export function antLegPose(k, phase, amp, lift, splay, hipY, scale, out) {
  const h = ANT_HIPS[k];
  const ph = phase + (h.g ? Math.PI : 0);
  const sw = Math.sin(ph) * amp, up = Math.max(0, Math.cos(ph)) * lift;
  const yaw = h.s > 0 ? h.yaw + sw : Math.PI - (h.yaw + sw);
  _le.set(-(up + splay), yaw, 0, 'YXZ');
  _lq.setFromEuler(_le);
  return out.compose(_lp.set(h.x * scale, hipY * scale, h.s * 0.07 * scale), _lq, _ls.setScalar(scale));
}

// =============================================================================================
// Piep-Block (1 m, Ursprung = Mitte der Unterseite)
// =============================================================================================
function waveIconParts(b, color, face) {
  // „Schallwellen“-Zeichen: Punkt + drei Bögen, auf Fläche face (Normale)
  const n = new THREE.Vector3(...face);
  const c = n.clone().multiplyScalar(0.5).add(new THREE.Vector3(0, 0.5, 0));
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
  const put = (g, dx, dy) => {
    g.applyQuaternion(q);
    const off = new THREE.Vector3(dx, dy, 0).applyQuaternion(q);
    g.translate(c.x + off.x, c.y + off.y, c.z + off.z);
    b.add(g, color);
  };
  const dot = new THREE.CylinderGeometry(0.07, 0.07, 0.04, 14); dot.rotateX(Math.PI / 2);
  put(dot, -0.2, 0);
  for (let i = 0; i < 3; i++) {
    const r = 0.13 + i * 0.1;
    const arc = new THREE.TorusGeometry(r, 0.032, 5, 12, Math.PI * 0.55);
    arc.rotateZ(-Math.PI * 0.275);
    arc.scale(1, 1, 0.6);
    put(arc, -0.2, 0);
  }
}
export function piepSolidGeo(color = 'rot', lo = false) {
  return cached(`w4:piep:solid:${color}:${lo}`, () => {
    const C = PIEP_COLORS[color] ?? PIEP_COLORS.rot;
    const b = new Build();
    // Körper: runde Kanten, oben heller (Glanzverlauf), Kanten-Rahmen dunkler
    b.add(roundedBox(1, 1, 1, 0.1, SIDE.ALL, 0, lo ? 1 : 2), { v: (x, y, z, nx, ny) => {
      const edge = Math.max(Math.abs(x) > 0.42 ? 1 : 0, Math.abs(y) > 0.42 ? 1 : 0, Math.abs(z) > 0.42 ? 1 : 0)
        + (Math.abs(x) > 0.42 && Math.abs(z) > 0.42 ? 1 : 0) + (Math.abs(y) > 0.42 && (Math.abs(x) > 0.42 || Math.abs(z) > 0.42) ? 1 : 0);
      const base = mix(C.low, C.base, smoothstep(ny * 0.5 + 0.6));
      return edge >= 2 ? mix(base, C.hi, 0.35) : base;
    } }, { p: [0, 0.5, 0] });
    // Oberseite: eingelassenes helleres Feld
    b.box(0.72, 0.03, 0.72, C.hi, { p: [0, 1.0, 0] }, 0.04, 1);
    for (const f of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]]) waveIconParts(b, 0xffffff, f);
    return b.geometry();
  });
}
/** Gestrichelter Umriss (12 Kanten aus je 3 Strichen) – für den „aus“-Zustand. */
export function piepOutlineGeo() {
  return cached('w4:piep:outline', () => {
    const b = new Build();
    const h = 0.5, t = 0.05;
    const dash = (p, axis) => {
      for (let k = -1; k <= 1; k++) {
        const pp = [...p]; pp[axis] += k * 0.34;
        const s = [t, t, t]; s[axis] = 0.2;
        b.box(s[0], s[1], s[2], 0xffffff, { p: [pp[0], pp[1] + 0.5, pp[2]] }, 0.015, 1);
      }
    };
    for (const a of [-h, h]) for (const c of [-h, h]) {
      dash([0, a, c], 0); dash([a, 0, c], 1); dash([a, c, 0], 2);
    }
    // Eck-Kugeln
    for (const x of [-h, h]) for (const y of [-h, h]) for (const z of [-h, h]) b.sphere(0.045, 0xffffff, { p: [x, y + 0.5, z] }, 8, 6);
    return b.geometry();
  });
}
export function piepFillGeo() {
  return cached('w4:piep:fill', () => { const g = roundedBox(0.96, 0.96, 0.96, 0.08, SIDE.ALL, 0, 1); g.translate(0, 0.5, 0); return g; });
}
/** Geteilte Materialien je Farbe: solid (vcol), outline (unbeleuchtet), fill (durchscheinend). */
export function piepMats(color = 'rot') {
  const C = PIEP_COLORS[color] ?? PIEP_COLORS.rot;
  return {
    solid: vcol(0.28, { emissive: C.low, emissiveIntensity: 0.18 }, `w4piep:${color}`),
    outline: basic(`w4piepOutline:${color}`, { color: C.glow, transparent: true, opacity: 0.95, depthWrite: false }),
    fill: basic(`w4piepFill:${color}`, { color: C.base, transparent: true, opacity: 0.12, depthWrite: false }),
  };
}

// =============================================================================================
// Ruinen-Säule (Ursprung = Mitte der Unterseite)
// =============================================================================================
export function ruinSaeuleGeo(height = 3, broken = false, lo = false, moss = true) {
  return cached(`w4:saeule:${height}:${broken}:${lo}:${moss}`, () => {
    const b = new Build();
    const H = Math.max(1, height), rs = lo ? 12 : 20;
    const stoneV = { v: (x, y, z, nx, ny) => mix(RUIN.stoneLow, RUIN.stoneHi, smoothstep(ny * 0.4 + 0.5 + (noise3(x * 3, y * 2, z * 3) - 0.5) * 0.5)) };
    // Sockel: zwei Platten
    b.box(1.15, 0.22, 1.15, RUIN.stoneLow, { p: [0, 0.11, 0] }, 0.04, 1);
    b.box(0.98, 0.18, 0.98, RUIN.stone, { p: [0, 0.31, 0] }, 0.04, 1);
    b.torus(0.4, 0.06, RUIN.stoneHi, { p: [0, 0.43, 0], r: [Math.PI / 2, 0, 0] }, 6, rs);
    // Schaft: kanneliert (Rillen als Farbmuster + leichte Wellung)
    const top = broken ? H * 0.82 : H - 0.42;
    const shaftH = top - 0.45;
    const shaft = new THREE.CylinderGeometry(0.36, 0.4, shaftH, lo ? 16 : 24, lo ? 2 : 4, true);
    const P = shaft.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const a = Math.atan2(P.getZ(i), P.getX(i));
      const k = 1 + Math.cos(a * 12) * 0.035;
      P.setX(i, P.getX(i) * k); P.setZ(i, P.getZ(i) * k);
      if (broken && P.getY(i) > shaftH / 2 - 0.01) P.setY(i, P.getY(i) + Math.sin(a * 3) * 0.12 + Math.cos(a * 5) * 0.06);
    }
    shaft.translate(0, 0.45 + shaftH / 2, 0);
    shaft.computeVertexNormals();
    b.add(shaft, { v: (x, y, z, nx, ny) => {
      const groove = Math.cos(Math.atan2(z, x) * 12) < -0.6;
      const moss = y < 0.9 + noise3(x * 4, 0, z * 4) * 0.5;
      const base = groove ? RUIN.stoneLow : RUIN.stone;
      return moss ? mix(base, RUIN.moss, 0.65) : base;
    } });
    // türkises Zierband
    b.torus(0.405, 0.045, RUIN.inlay, { p: [0, 0.45 + shaftH * 0.62, 0], r: [Math.PI / 2, 0, 0] }, 6, rs);
    if (broken) {
      // Bruchfläche (dunkler, rau) und Schutt am Fuß
      const cap = new THREE.CircleGeometry(0.385, lo ? 16 : 24, 0, TAU).rotateX(-Math.PI / 2);
      const C = cap.attributes.position;
      for (let i = 0; i < C.count; i++) {
        const x = C.getX(i), z = C.getZ(i), r = Math.hypot(x, z) / 0.385, a = Math.atan2(z, x);
        C.setY(i, (Math.sin(a * 3) * 0.12 + Math.cos(a * 5) * 0.06) * r + (1 - r) * 0.05 + (noise3(x * 9, 0, z * 9) - 0.5) * 0.05);
      }
      const capN = cap.toNonIndexed(); cap.dispose(); capN.computeVertexNormals();
      b.add(capN, RUIN.stoneLow, { p: [0, top, 0] });
      for (let i = 0; i < (lo ? 2 : 4); i++) {
        const a = i * 2.1 + 0.4;
        b.add(displace(new THREE.IcosahedronGeometry(0.17 + (i % 2) * 0.06, 0), 0.04, 5, i, false), stoneV, { p: [Math.cos(a) * 0.75, 0.12, Math.sin(a) * 0.75], r: [i, i * 2, 0] });
      }
    } else {
      // Kapitell: Wulst + Deckplatte mit Schnecken
      b.cyl(0.5, 0.38, 0.22, RUIN.stoneHi, { p: [0, top + 0.11, 0] }, rs);
      b.box(1.1, 0.2, 1.1, RUIN.stone, { p: [0, top + 0.32, 0] }, 0.04, 1);
      for (const s of [1, -1]) for (const z of [1, -1]) b.sphere(0.1, RUIN.stoneHi, { p: [s * 0.45, top + 0.16, z * 0.45], s: [1, 1, 1] }, 10, 8);
      // Moosbüschel oben
      if (moss) b.add(displace(new THREE.SphereGeometry(0.28, 10, 6, 0, TAU, 0, Math.PI / 2), 0.06, 5, 2, false), RUIN.moss, { p: [-0.22, top + 0.42, 0.18], s: [1.4, 0.5, 1] });
    }
    return b.geometry();
  });
}

// =============================================================================================
// Felsnadel (Canyon, geschichtet; Ursprung = Mitte der Unterseite)
// =============================================================================================
export function felsnadelGeo(height = 5, lo = false) {
  return cached(`w4:felsnadel:${height}:${lo}`, () => {
    const b = new Build();
    const H = Math.max(1.5, height);
    // Profil: breiter Fuß, schlanke Taille, Kappenstein oben (wie Erdpyramiden / Hoodoos)
    const pts = [[0, 0], [1.05, 0], [0.95, H * 0.12], [0.78, H * 0.3], [0.62, H * 0.52], [0.55, H * 0.7], [0.5, H * 0.8], [0.7, H * 0.84], [0.82, H * 0.9], [0.74, H * 0.97], [0, H]];
    const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), lo ? 9 : 14);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      // Stufen-Kanten je Schicht (Ausbuchtungen) und Unregelmäßigkeit
      const k = 1 + (noise3(x * 1.2, y * 0.6, z * 1.2) - 0.5) * 0.35 + (Math.floor(y / 0.6) % 2 ? 0.05 : -0.02);
      P.setX(i, x * k); P.setZ(i, z * k);
    }
    const ng = g.toNonIndexed(); g.dispose();
    ng.computeVertexNormals();
    b.add(ng, (x, y, z, nx, ny) => (ny > 0.75 && y > H * 0.9 ? CANYON.grass : y > H * 0.82 ? CANYON.bands[5] : strataColor(y, x, z, { band: 0.6, seed: H })));
    // Grasbüschel auf dem Kappenstein
    if (!lo) for (let i = 0; i < 3; i++) b.sphere(0.18, CANYON.grassDark, { p: [Math.cos(i * 2.1) * 0.35, H + 0.02, Math.sin(i * 2.1) * 0.35], s: [1, 0.5, 1] }, 8, 5);
    return b.geometry();
  });
}
export const canyonMat = () => vcol(0.85, {}, 'w4canyon');

// =============================================================================================
// Stachelwalze (Achse Z, Mitte im Ursprung; Ø ≈ 1 m mit Stacheln)
// =============================================================================================
export const WALZE = { body: 0x4a4e66, bodyHi: 0x7a80a0, band: 0xff8a1a, bandDark: 0xc85a10, spike: 0xfff6e0, spikeLow: 0xc8bca0 };
export function walzeGeo(lo = false) {
  return cached(`w4:walze:${lo}`, () => {
    const b = new Build();
    const R = 0.34, L = 0.78;
    // fassförmiger Körper (Profil um Y, danach Achse → Z)
    const prof = [[0, -L / 2], [0.22, -L / 2], [0.3, -L / 2 + 0.03], [R, -L / 2 + 0.1], [R + 0.02, 0], [R, L / 2 - 0.1], [0.3, L / 2 - 0.03], [0.22, L / 2], [0, L / 2]];
    const bod = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), lo ? 14 : 22);
    bod.rotateX(Math.PI / 2);
    b.add(bod, { v: (x, y, z, nx, ny) => mix(WALZE.body, WALZE.bodyHi, smoothstep(ny * 0.5 + 0.5)) });
    // orange Mittelband und Endkappen-Nieten
    b.torus(R + 0.02, 0.05, WALZE.band, {}, lo ? 5 : 7, lo ? 14 : 22);
    for (const s of [1, -1]) {
      b.cyl(0.13, 0.15, 0.06, WALZE.bandDark, { p: [0, 0, s * (L / 2 + 0.01)], r: [Math.PI / 2, 0, 0] }, lo ? 8 : 12);
      b.sphere(0.07, WALZE.band, { p: [0, 0, s * (L / 2 + 0.05)] }, lo ? 8 : 10, lo ? 5 : 7);
    }
    // Stacheln: 4 Ringe × 7, versetzt
    const rings = [-0.27, -0.1, 0.1, 0.27];
    rings.forEach((z, ri) => {
      const k = 7;
      for (let i = 0; i < k; i++) {
        const a = ((i + (ri % 2) * 0.5) / k) * TAU;
        const d = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
        const p = d.clone().multiplyScalar(R * 0.92); p.z = z;
        const m = new THREE.Matrix4().compose(p.addScaledVector(d, 0.09), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d), new THREE.Vector3(1, 1, 1));
        b.add(new THREE.ConeGeometry(0.065, 0.2, lo ? 6 : 8), { v: (x, y) => mix(WALZE.spikeLow, WALZE.spike, smoothstep(y / 0.2 + 0.5)) }, m);
      }
    });
    return b.geometry();
  });
}
export const walzeMat = () => vcol(0.35, {}, 'w4walze');

export { std, basic, vcol, col, clamp };
