// Savannen-Kulisse Welt 5 (5-4): Akazie, Termitenhügel, Felsenberg, Steppengras und niedliche Savannentiere (Giraffe,
// Zebra, Elefantenkind – reine Deko ohne Kollision). Eigene Gestaltung. Maßstab Meter, Ursprung = Mitte der Unterseite,
// Vorderseite/Blick nach +X; state darf ein String sein.
//
// akazie          Schirmakazie ≈5 m: knorriger, gegabelter Stamm, breite, flache Krone aus weichen Laubpolstern.
//                 opts { height (5), radius (Kronenradius, 2,8) }  state { sway (0..1, Standard 0,3) }
// termitenhuegel  Termitenhügel ≈2,5 m: gebündelte, knubbelige Lehmtürme (rotorange, Schichten, Luftlöcher).
//                 opts { height (2,5) }  state –
// felsenberg      großer Savannen-Felsberg: bauchiger Fels in roten/ockerfarbenen Schichten mit Grasdecke oben und
//                 Findlingen am Fuß.  opts { radius (5), height (6), grass: true }  state –
//                 root.userData.top → Höhe der Grasdecke (≈ height).
// steppengras     goldgelbes Grasbüschel ≈0,7 m.  state { sway (0..1) }  (viele: createInstanced('steppengras', n))
// giraffe         Giraffe ≈3,6 m: Fleckenfell (Netzmuster), langer Hals, Hörnchen mit Kugeln, große Augen mit Wimpern.
// zebra           Zebra ≈1,6 m: Streifen, Bürstenmähne, große Augen, Puschelschwanz.
// elefantenkind   Elefantenkind ≈1,5 m: rundlich, flieder-grau, große rosa Ohren (flattern), Rüssel, Zehennägel.
//                 Tiere: state { anim: 'idle'|'walk', speed (m/s, walk Standard 1) }  idle: Kopfnicken, Ohren-/Schwanzwackeln,
//                 Blinzeln; walk: Passgang (der Motor bewegt root).

import {
  THREE, TAU, Build, cached, vcol, mesh, joint, eyes, makeModel, Clock, Blinker, damp, clamp, mix, smoothstep, instMesh,
  setInst, placed,
} from '../lib/kit.js';
import { stick } from '../lib/kit_w3.js';
import { gradV, steppengrasGeo, grassMat, noise3, hash1, mouthShape, puffyGeo } from '../lib/w5Geos.js';
import { displace } from '../lib/w4Geos.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
const Y = new THREE.Vector3(0, 1, 0);

// =============================================================================================
// Akazie
// =============================================================================================
const AK = { bark: 0x8a5a3a, barkHi: 0xc08a5a, barkLow: 0x5a3622, leaf: 0x7aa83a, leafHi: 0xc8e070, leafLow: 0x3e6a2a };
function akazieGeo(H, R) {
  return cached(`w5:akazie:${H}:${R}`, () => {
    const b = new Build();
    const barkV = gradV(AK.barkLow, AK.barkHi, 0.5, 0.5);
    const top = H * 0.78;
    // Stamm (leicht geschwungen) und drei Äste zur Krone
    b.tube([[0, 0, 0], [0.12, H * 0.25, 0.05], [-0.05, H * 0.45, 0], [0.05, H * 0.55, 0]], 0.2, barkV, null, 20, 12);
    b.sphere(1, barkV, { p: [0, 0.08, 0], s: [0.36, 0.16, 0.36] }, 16, 8);
    for (const [ax, az, len] of [[1, 0.3, 1], [-0.8, 0.7, 0.9], [-0.3, -1, 0.95], [0.6, -0.7, 0.8]]) {
      const ex = ax * R * 0.55 * len, ez = az * R * 0.5 * len;
      b.tube([[0.05, H * 0.53, 0], [ex * 0.35, H * 0.62, ez * 0.35], [ex * 0.8, top - 0.05, ez * 0.8]], 0.1, barkV, null, 14, 8);
    }
    // Krone: flache, weiche Laubpolster (oben hell, unten dunkel)
    const pads = [[0, 0, 1.0, 0.45], [R * 0.45, 0.15, 0.62, 0.38], [-R * 0.42, 0.05, 0.6, 0.36], [R * 0.05, 0.25, 0.55, 0.32], [-R * 0.1, -0.05, 0.55, 0.35]];
    pads.forEach(([px, py, s, h], i) => {
      const pz = i === 0 ? 0 : (i % 2 ? 0.35 : -0.4) * R;
      const g = displace(new THREE.SphereGeometry(1, 32, 14), 0.06, 2.4, 3 + i, true);
      b.add(g, { v: (x, y, z, nx, ny) => mix(AK.leafLow, mix(AK.leaf, AK.leafHi, smoothstep(ny * 0.8 - 0.1 + noise3(x * 3, y * 3, z * 3) * 0.3)), smoothstep(ny + 0.4)) },
        { p: [px, top + py + h * 0.5, pz], s: [R * s, h, R * s * 0.85] });
    });
    return b.geometry();
  });
}
function buildAkazie(opts = {}) {
  const H = Math.max(2, opts.height ?? 5), R = Math.max(1, opts.radius ?? 2.8);
  const root = new THREE.Group();
  const m = mesh(akazieGeo(H, R), vcol(0.7, {}, 'w5tree'), {}, true);
  m.receiveShadow = true;
  root.add(m);
  const clk = new Clock();
  const update = (dt, st) => { clk.tick(dt, 'idle'); const sw = clamp(st.sway ?? 0.3, 0, 1); m.rotation.z = Math.sin(clk.t * 0.8) * 0.012 * sw; m.rotation.x = Math.sin(clk.t * 0.6 + 1) * 0.01 * sw; };
  return makeModel('akazie', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Termitenhügel
// =============================================================================================
const TH = { clay: 0xd86a3a, hi: 0xf8a060, low: 0x9a3e22, hole: 0x3a1a10 };
function termitenGeo(H) {
  return cached(`w5:termiten:${H}`, () => {
    const b = new Build();
    const clayV = { v: (x, y, z, nx, ny) => {
      const band = Math.sin(y * 9 + noise3(x * 3, y * 3, z * 3) * 3) * 0.5 + 0.5;
      return mix(mix(TH.low, TH.hi, smoothstep(ny * 0.4 + 0.5 + nx * 0.15)), TH.clay, band * 0.35);
    } };
    const spires = [[0, 0, 1, 0.55], [0.38, 0.2, 0.7, 0.36], [-0.32, -0.25, 0.62, 0.34], [0.15, -0.42, 0.48, 0.28], [-0.4, 0.3, 0.42, 0.26]];
    for (const [x, z, hf, r] of spires) {
      const h = H * hf;
      const pts = [[0, 0], [r, 0], [r * 0.95, h * 0.2], [r * 0.7, h * 0.5], [r * 0.45, h * 0.78], [r * 0.25, h * 0.94], [0, h]];
      const g = new THREE.LatheGeometry(pts.map(([a, c]) => new THREE.Vector2(a, c)), 24, 0, TAU);
      b.add(displace(g, 0.05 + r * 0.06, 3.2, x * 7 + z * 3, true), clayV, { p: [x, 0, z] });
    }
    b.add(displace(new THREE.SphereGeometry(1, 28, 10, 0, TAU, 0, Math.PI / 2), 0.06, 2, 5, true), clayV, { s: [0.95, 0.4, 0.9] });
    for (let i = 0; i < 9; i++) {
      const a = i * 2.1, y = 0.25 + (i % 4) * H * 0.15, r = 0.5 - y / H * 0.35;
      b.sphere(0.05, TH.hole, { p: [Math.cos(a) * r, y, Math.sin(a) * r], s: [1, 1.3, 1] }, 8, 6);
    }
    return b.geometry();
  });
}
function buildTermitenhuegel(opts = {}) {
  const H = Math.max(0.8, opts.height ?? 2.5);
  const root = new THREE.Group();
  const m = mesh(termitenGeo(H), vcol(0.85, {}, 'w5clay'), {}, true);
  m.receiveShadow = true;
  root.add(m);
  return makeModel('termitenhuegel', root, () => {}, [], { initial: 'idle' });
}

// =============================================================================================
// Felsenberg
// =============================================================================================
const FB = { r1: 0xc8582e, r2: 0xe8884a, r3: 0xf0b070, r4: 0xb84a2a, grass: 0x9ac83a, grassHi: 0xd8f070, grassLow: 0x5a8a2a };
function felsGeo(R, H, grass) {
  return cached(`w5:fels:${R}:${H}:${grass}`, () => {
    const b = new Build();
    const bands = [FB.r1, FB.r2, FB.r3, FB.r2, FB.r4, FB.r3];
    const pts = [[0, 0], [R, 0], [R * 1.04, H * 0.12], [R * 0.96, H * 0.3], [R * 1.0, H * 0.48], [R * 0.9, H * 0.66], [R * 0.92, H * 0.82], [R * 0.82, H * 0.96], [R * 0.6, H], [0, H]];
    const g = new THREE.LatheGeometry(pts.map(([a, c]) => new THREE.Vector2(a, c)), 56);
    const rock = displace(g, R * 0.04, 0.9 / Math.max(1, R * 0.3), 11.3, true);
    b.add(rock, { v: (x, y, z, nx, ny) => {
      const k = (y / H) * bands.length + noise3(x * 0.5, y * 0.4, z * 0.5) * 1.2;
      const c = bands[((Math.floor(k) % bands.length) + bands.length) % bands.length];
      return mix(mix(c, 0x6a2a1a, 0.25), c, smoothstep(ny * 0.4 + 0.6 + nx * 0.15));
    } });
    if (grass) {
      const cap = new THREE.SphereGeometry(1, 48, 8, 0, TAU, 0, Math.PI * 0.5);
      const P = cap.attributes.position;
      for (let i = 0; i < P.count; i++) {
        const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
        const a = Math.atan2(z, x);
        const drip = y < 0.25 ? -(Math.max(0, Math.sin(a * 7 + 1)) ** 2) * 0.6 : 0;
        P.setXYZ(i, x, y + drip, z);
      }
      cap.computeVertexNormals();
      b.add(cap, gradV(FB.grassLow, FB.grassHi, 0.6, 0.3), { p: [0, H * 0.985, 0], s: [R * 0.84, 0.28, R * 0.84] });
    }
    // Findlinge am Fuß
    for (let i = 0; i < 5; i++) {
      const a = i * 1.37 + 0.4, rr = R * (1.02 + hash1(i) * 0.1), s = 0.35 + hash1(i * 3) * 0.4;
      b.add(displace(new THREE.SphereGeometry(1, 14, 10), 0.08, 2, i, true), gradV(FB.r4, FB.r3), { p: [Math.cos(a) * rr, s * 0.6, Math.sin(a) * rr], s: [s, s * 0.8, s] });
    }
    return b.geometry();
  });
}
function buildFelsenberg(opts = {}) {
  const R = Math.max(1.5, opts.radius ?? 5), H = Math.max(1, opts.height ?? 6);
  const root = new THREE.Group();
  const m = mesh(felsGeo(R, H, opts.grass !== false), vcol(0.85, {}, 'w5rock'), {}, true);
  m.receiveShadow = true;
  root.add(m);
  root.userData.top = H;
  return makeModel('felsenberg', root, () => {}, [], { initial: 'idle' });
}

// =============================================================================================
// Steppengras (Einzelmodell)
// =============================================================================================
function buildSteppengras() {
  const root = new THREE.Group();
  const m = mesh(steppengrasGeo(false), grassMat(), {}, true);
  root.add(m);
  const clk = new Clock();
  const update = (dt, st) => { clk.tick(dt, 'idle'); const sw = clamp(st.sway ?? 0.3, 0, 1); m.rotation.z = Math.sin(clk.t * 1.6) * 0.08 * sw; m.rotation.x = Math.sin(clk.t * 1.1 + 2) * 0.05 * sw; };
  return makeModel('steppengras', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Savannentiere (gemeinsamer Vierbeiner-Bau)
// =============================================================================================
/** Netzmuster (Giraffe): Abstand zur nächsten Zellgrenze (Voronoi). */
function cellEdge(x, y, z, s) {
  const X = x * s, Yy = y * s, Z = z * s;
  const ix = Math.floor(X), iy = Math.floor(Yy), iz = Math.floor(Z);
  let d1 = 9, d2 = 9;
  for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) for (let e = -1; e <= 1; e++) {
    const cx = ix + a, cy = iy + c, cz = iz + e;
    const h = hash1(cx * 17.1 + cy * 31.7 + cz * 7.3);
    const px = cx + h, py = cy + hash1(h * 91 + 3), pz = cz + hash1(h * 53 + 7);
    const d = Math.hypot(px - X, py - Yy, pz - Z);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return d2 - d1;
}
const SPECIES = {
  giraffe: {
    hipY: 1.38, legLen: 1.22, legR: 0.095, hoof: 0x5a3a2a, hips: [[0.4, 0.2], [0.4, -0.2], [-0.4, 0.2], [-0.4, -0.2]],
    torso: { c: [0, 1.66, 0], r: [0.74, 0.46, 0.4] }, neck: [[0.46, 1.78, 0], [0.66, 2.4, 0], [0.84, 3.0, 0]], neckR: [0.22, 0.14],
    head: [0.88, 3.12, 0], headScale: 1.25, tail: [-0.72, 1.8, 0], tailLen: 0.7,
    fur: 0xffe0a0, patch: 0xd8862a, belly: 0xfff2d0, muzzle: 0xfff0d8, nose: 0x8a5a3a,
  },
  zebra: {
    hipY: 0.82, legLen: 0.72, legR: 0.07, hoof: 0x2a2a3a, hips: [[0.36, 0.15], [0.36, -0.15], [-0.36, 0.15], [-0.36, -0.15]],
    torso: { c: [0, 1.03, 0], r: [0.55, 0.32, 0.27] }, neck: [[0.36, 1.12, 0], [0.5, 1.38, 0], [0.6, 1.55, 0]], neckR: [0.17, 0.12],
    head: [0.64, 1.62, 0], tail: [-0.53, 1.12, 0], tailLen: 0.5,
    fur: 0xffffff, patch: 0x23232e, belly: 0xffffff, muzzle: 0x3a3a48, nose: 0x1a1a22,
  },
  elefantenkind: {
    hipY: 0.5, legLen: 0.45, legR: 0.15, hoof: 0xfff4e8, hips: [[0.3, 0.24], [0.3, -0.24], [-0.32, 0.24], [-0.32, -0.24]],
    torso: { c: [0, 0.86, 0], r: [0.62, 0.46, 0.44] }, neck: null,
    head: [0.6, 1.06, 0], tail: [-0.6, 0.95, 0], tailLen: 0.35,
    fur: 0xb8b0d0, patch: 0x9a92b8, belly: 0xd8d2ea, muzzle: 0xc8c0dc, nose: 0x8a82a8,
  },
};
function animalBodyGeo(kind) {
  const S = SPECIES[kind];
  return cached(`w5:animal:body:${kind}`, () => {
    const b = new Build();
    const furV = (scale = 1) => ({ v: (x, y, z, nx, ny) => {
      const shade = smoothstep(ny * 0.45 + 0.6);
      if (kind === 'giraffe') {
        const e = cellEdge(x, y, z, 4.2 * scale);
        const base = e < 0.16 ? S.fur : S.patch;
        return mix(mix(base, S.belly, smoothstep((-ny - 0.3) / 0.3)), 0x000000, (1 - shade) * 0.18);
      }
      if (kind === 'zebra') {
        const st = Math.sin(x * 13 + Math.sin(y * 4 + z * 2) * 1.2 + y * 3);
        const base = st > 0.25 ? S.patch : S.fur;
        return mix(mix(base, S.belly, smoothstep((-ny - 0.45) / 0.3)), 0x000000, (1 - shade) * 0.15);
      }
      return mix(mix(S.patch, S.fur, shade), S.belly, smoothstep((-ny - 0.3) / 0.3));
    } });
    b.sphere(1, furV(), { p: S.torso.c, s: S.torso.r }, 36, 24);
    if (S.neck) {
      const curve = new THREE.CatmullRomCurve3(S.neck.map((p) => new THREE.Vector3(...p)));
      const tube = new THREE.TubeGeometry(curve, 24, 1, 18, false);
      const P = tube.attributes.position, pts = curve.getSpacedPoints(24);
      for (let i = 0; i < P.count; i++) {
        const seg = Math.floor(i / 19), t = seg / 24, c0 = pts[seg];
        const r = S.neckR[0] + (S.neckR[1] - S.neckR[0]) * t;
        P.setXYZ(i, c0.x + (P.getX(i) - c0.x) * r, c0.y + (P.getY(i) - c0.y) * r, c0.z + (P.getZ(i) - c0.z) * r);
      }
      tube.computeVertexNormals();
      b.add(tube, furV());
      if (kind === 'zebra') {
        // Bürstenmähne entlang des Halses
        for (let i = 0; i <= 8; i++) {
          const p = curve.getPoint(0.1 + i / 10);
          b.sphere(1, i % 2 ? S.patch : 0xffffff, { p: [p.x - 0.07, p.y + 0.11, 0], s: [0.06, 0.08, 0.035] }, 10, 6);
        }
      }
      if (kind === 'giraffe') for (let i = 0; i <= 9; i++) { const p = curve.getPoint(0.05 + i / 10); b.sphere(1, 0xa85a1a, { p: [p.x - 0.13, p.y + 0.05, 0], s: [0.045, 0.06, 0.03] }, 8, 6); }
    }
    return b.geometry();
  });
}
function animalHeadGeo(kind) {
  const S = SPECIES[kind];
  return cached(`w5:animal:head:${kind}`, () => {
    const b = new Build();
    if (kind === 'elefantenkind') {
      b.sphere(1, gradV(S.patch, S.fur, 0.5, 0.6), { s: [0.36, 0.34, 0.36] }, 32, 22);
      b.sphere(1, gradV(S.patch, S.fur), { p: [0.2, 0.18, 0], s: [0.16, 0.12, 0.2] }, 16, 10);
      for (const s of [1, -1]) stick(b, { p: new THREE.Vector3(0.24, -0.06, s * 0.2), n: new THREE.Vector3(0.6, -0.1, s * 0.8).normalize() }, 0xffa0c0, [0.07, 0.045, 0.02], 0.3);
      // kleine Stoßzahn-Knubbel
      for (const s of [1, -1]) b.add(new THREE.ConeGeometry(0.03, 0.09, 10), 0xfffaf0, { p: [0.3, -0.17, s * 0.1], r: [0, 0, -1.6] });
      return b.geometry();
    }
    const giraffe = kind === 'giraffe';
    // Kopf: längliches Ellipsoid nach +X mit Schnauze
    b.sphere(1, { v: (x, y, z, nx, ny) => mix(S.fur, S.belly, smoothstep((-ny - 0.2) / 0.4)) }, { p: [0.1, 0.02, 0], s: giraffe ? [0.25, 0.17, 0.16] : [0.22, 0.15, 0.14] }, 28, 18);
    b.sphere(1, S.muzzle, { p: [0.3, -0.04, 0], s: giraffe ? [0.13, 0.12, 0.13] : [0.12, 0.11, 0.12] }, 20, 14);
    for (const s of [1, -1]) b.sphere(0.022, S.nose, { p: [0.42, -0.02, s * 0.05] }, 8, 6);
    b.add(puffyGeo(mouthShape('smile'), 0.02, 0.008, 10, 2), S.nose, placed(new THREE.Vector3(0.4, -0.1, 0), new THREE.Vector3(1, -0.4, 0), new THREE.Vector3(0.04, 0.03, 1)));
    // Ohren
    for (const s of [1, -1]) b.sphere(1, giraffe ? S.fur : 0xffffff, { p: [-0.04, 0.12, s * 0.15], s: [0.05, 0.11, 0.035], r: [s * 0.6, 0, 0] }, 12, 8);
    if (giraffe) {
      for (const s of [1, -1]) { b.cyl(0.025, 0.03, 0.16, 0xd8862a, { p: [-0.02, 0.22, s * 0.06] }, 10); b.sphere(0.045, 0x8a4a1a, { p: [-0.02, 0.31, s * 0.06] }, 12, 8); }
    } else {
      // Zebra: Stirnschopf + Streifen am Kopf
      b.sphere(1, S.patch, { p: [0.0, 0.15, 0], s: [0.08, 0.06, 0.05] }, 10, 6);
    }
    for (const s of [1, -1]) stick(b, { p: new THREE.Vector3(0.22, 0.0, s * 0.12), n: new THREE.Vector3(0.4, -0.2, s).normalize() }, 0xff9ab8, [0.04, 0.025, 0.01], 0.3);
    return b.geometry();
  });
}
function animalLegGeo(kind) {
  const S = SPECIES[kind];
  return cached(`w5:animal:leg:${kind}`, () => {
    const b = new Build();
    const L = S.legLen, r = S.legR;
    const legV = kind === 'zebra'
      ? (x, y) => ((((Math.floor(y * 14) % 2) + 2) % 2) ? S.patch : S.fur)
      : kind === 'giraffe' ? { v: (x, y) => mix(0xffe8b8, S.fur, smoothstep((y + L) / L)) } : gradV(S.patch, S.fur);
    b.add(new THREE.CapsuleGeometry(r, L - r * 2, 4, 14), legV, { p: [0, -L / 2 + r, 0] });
    if (kind === 'elefantenkind') { for (let i = -1; i <= 1; i++) b.sphere(0.035, S.hoof, { p: [r * 0.85, -L + 0.06, i * r * 0.55], s: [0.6, 1, 1] }, 8, 6); b.cyl(r * 1.05, r * 1.1, 0.06, S.patch, { p: [0, -L + 0.03, 0] }, 16); }
    else b.cyl(r * 1.05, r * 1.2, 0.1, S.hoof, { p: [0, -L + 0.05, 0] }, 14);
    return b.geometry();
  });
}
function animalTailGeo(kind) {
  const S = SPECIES[kind];
  return cached(`w5:animal:tail:${kind}`, () => {
    const b = new Build();
    const L = S.tailLen;
    b.tube([[0, 0, 0], [-0.06, -L * 0.35, 0], [-0.08, -L * 0.75, 0]], kind === 'elefantenkind' ? 0.03 : 0.025, kind === 'zebra' ? S.fur : S.patch, null, 12, 6);
    b.sphere(1, kind === 'elefantenkind' ? S.nose : kind === 'giraffe' ? 0x5a2a10 : S.patch, { p: [-0.09, -L * 0.85, 0], s: [0.05, 0.1, 0.05] }, 12, 8);
    return b.geometry();
  });
}
const earGeo = () => cached('w5:animal:ear', () => {
  const b = new Build();
  b.sphere(1, { v: (x) => (x > 0.015 ? 0xffa8c8 : 0xa8a0c4) }, { s: [0.06, 0.32, 0.3] }, 24, 14);
  return b.geometry();
});
const trunkGeo = () => cached('w5:animal:trunk', () => {
  const b = new Build();
  const curve = new THREE.CatmullRomCurve3([[0, 0, 0], [0.1, -0.12, 0], [0.12, -0.3, 0], [0.2, -0.42, 0]].map((p) => new THREE.Vector3(...p)));
  const tube = new THREE.TubeGeometry(curve, 16, 1, 14, false);
  const P = tube.attributes.position, pts = curve.getSpacedPoints(16);
  for (let i = 0; i < P.count; i++) { const seg = Math.floor(i / 15), r = 0.1 - (seg / 16) * 0.045, c0 = pts[seg]; P.setXYZ(i, c0.x + (P.getX(i) - c0.x) * r, c0.y + (P.getY(i) - c0.y) * r, c0.z + (P.getZ(i) - c0.z) * r); }
  tube.computeVertexNormals();
  b.add(tube, (x, y) => ((((Math.floor(y * 30) % 2) + 2) % 2) ? 0xb8b0d0 : 0xa8a0c4));
  b.sphere(1, 0x9a92b8, { p: [0.2, -0.43, 0], s: [0.06, 0.05, 0.06] }, 12, 8);
  return b.geometry();
});
function buildAnimal(kind) {
  return () => {
    const S = SPECIES[kind];
    const root = new THREE.Group();
    const pose = joint();
    const body = mesh(animalBodyGeo(kind), vcol(0.45), {}, true);
    const head = joint(S.head);
    if (S.headScale) head.scale.setScalar(S.headScale);
    const headM = mesh(animalHeadGeo(kind), vcol(0.42), {}, true);
    const eyeList = kind === 'elefantenkind'
      ? [{ p: [0.27, 0.06, 0.15], r: 0.075, sy: 1.3, dir: [1, 0.1, 0.55] }, { p: [0.27, 0.06, -0.15], r: 0.075, sy: 1.3, dir: [1, 0.1, -0.55] }]
      : kind === 'giraffe'
        ? [{ p: [0.16, 0.08, 0.12], r: 0.07, sy: 1.3, dir: [0.7, 0.15, 0.75] }, { p: [0.16, 0.08, -0.12], r: 0.07, sy: 1.3, dir: [0.7, 0.15, -0.75] }]
        : [{ p: [0.15, 0.07, 0.11], r: 0.065, sy: 1.3, dir: [0.7, 0.15, 0.75] }, { p: [0.15, 0.07, -0.11], r: 0.065, sy: 1.3, dir: [0.7, 0.15, -0.75] }];
    const eye = eyes(eyeList, { key: `w5:animal:${kind}`, iris: kind === 'zebra' ? 0x5a3a2a : 0x6a3a1a, pupil: 0.62, depth: 0.55 });
    head.add(headM, eye);
    let ears = null, trunk = null;
    if (kind === 'elefantenkind') {
      ears = instMesh(earGeo(), vcol(0.45), 2, 1, 0);
      ears.castShadow = true;
      trunk = joint([0.34, -0.05, 0], mesh(trunkGeo(), vcol(0.45), {}, true));
      head.add(ears, trunk);
    }
    const tail = joint(S.tail, mesh(animalTailGeo(kind), vcol(0.5), {}, true));
    const legs = instMesh(animalLegGeo(kind), vcol(0.45), 4, 4, 1);
    legs.castShadow = true;
    pose.add(body, head, tail, legs);
    root.add(pose);
    const clk = new Clock(), blink = new Blinker();
    let phase = Math.random() * TAU, amp = 0;
    const update = (dt, st) => {
      const anim = st.anim ?? 'idle';
      clk.tick(dt, anim);
      const t = clk.t;
      const walking = anim === 'walk';
      const speed = walking ? (st.speed ?? 1) : 0;
      if (walking) phase += dt * (2 + speed * 2.4);
      amp = damp(amp, walking ? 0.4 : 0, 6, dt);
      pose.position.y = walking ? Math.abs(Math.sin(phase)) * 0.03 : Math.sin(t * 1.4) * 0.006;
      // Kopf: nicken/umschauen
      head.rotation.z = walking ? Math.sin(phase * 2) * 0.05 : Math.sin(t * 0.9) * 0.06;
      head.rotation.y = walking ? 0 : Math.sin(t * 0.37) * 0.3;
      tail.rotation.x = Math.sin(t * 2.6) * 0.35;
      tail.rotation.z = -0.2 + Math.sin(t * 1.7) * 0.1;
      S.hips.forEach(([x, z], i) => {
        const ph = phase + (i === 0 || i === 3 ? 0 : Math.PI);
        setInst(legs, i, x, S.hipY, z, 0, 0, Math.sin(ph) * amp, 1);
      });
      legs.instanceMatrix.needsUpdate = true;
      if (ears) {
        const flap = Math.sin(t * (walking ? 6 : 2.2)) * 0.25;
        for (let i = 0; i < 2; i++) {
          const s = i ? -1 : 1;
          _e.set(0, -s * (0.4 + flap), 0, 'YXZ');
          ears.setMatrixAt(i, _m.compose(_v.set(-0.06, 0.08, s * 0.32), _q.setFromEuler(_e), _s.setScalar(1)));
        }
        ears.instanceMatrix.needsUpdate = true;
        trunk.rotation.z = Math.sin(t * 1.5) * 0.25 + (walking ? Math.sin(phase * 2) * 0.1 : 0);
      }
      eye.userData.blink(blink.update(dt));
    };
    return makeModel(kind, root, update, [legs, ...(ears ? [ears] : [])], { initial: 'idle' });
  };
}

export const MODELS = {
  akazie: buildAkazie,
  termitenhuegel: buildTermitenhuegel,
  felsenberg: buildFelsenberg,
  steppengras: buildSteppengras,
  giraffe: buildAnimal('giraffe'),
  zebra: buildAnimal('zebra'),
  elefantenkind: buildAnimal('elefantenkind'),
};
