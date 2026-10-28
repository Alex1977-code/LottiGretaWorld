// Kulisse Welt 6 „Wolkeninseln“, Teil 1: Himmel/Bergland, Geisterschiff-Wracks, Fernost-Fantasie. Eigene Gestaltung,
// Kartenqualität, ohne Spielzeug-Look (Kulissen-Materialien `toy: false`), backbar (vertexgefärbte, undurchsichtige Meshes).
// Maßstab Meter, Ursprung = Fußpunkt (Ausnahmen genannt), Vorderseite +X; state darf ein String sein.
// Wiederverwendet (nicht neu gebaut): verschneite Tannen 'tanne_schnee', Eiszapfen 'eiszapfen' (Welt 3), Nebel 'nebelschwaden'
// (Halloween; opts.color für grünlich-trüben Schiffsnebel, z. B. 0xb8e8d8).
//
// wolkenberg          Wolkenberg: hoch aufgetürmte Kumuluswolke (unten lavendel, oben weiß), Hintergrund.
//                     opts { size (Breite, 10), height (6), seed (1) }  state –
// bergkiefer          Bergkiefer: krummer, rötlicher Stamm mit flachen, schirmförmigen Nadelpolstern.
//                     opts { height (5), seed (1) }  state { sway (0..1 Wind) }.  Viele → createInstanced('bergkiefer').
// wolkenfels          Felsen über den Wolken: lila-grauer Felszahn mit Grasschopf und kleiner Kiefer, Wolkenkragen am Fuß.
//                     opts { size (Grundbreite, 4), height (1,3·size), seed (1) }  state –
// geisterschiff_wrack Geisterschiff-Wrack: opts { kind: 'bug' (abgebrochener, schräg aus dem Boden ragender Bug mit Mast-
//                     stumpf und Segelfetzen, ≈7 m) | 'mast' (geknickter Mast mit Krähennest und Fahnenfetzen, ≈6 m), size (1) }
//                     Ursprung = Boden-/Wasserlinie.  state –
// papierlaterne       Papierlaterne (Fernost): runde, gerippte Papierlaterne mit schwarzen Kappen und Goldquaste.
//                     opts { color: 'rot'|'weiss'|'gelb', mount: 'pfahl' (Holzpfahl mit Arm, ≈2,3 m) | 'haengend' (**Ursprung =
//                     Aufhängung oben**, hängt ≈1 m) }  state { lit (Standard true: Papier leuchtet), sway (0..1) }
// holzbruecke         geschwungene Holzbrücke mit rotem Lackgeländer und Goldkappen. **Ursprung = Mitte am Boden**, spannt
//                     x = −length/2 … length/2; Lauffläche y(x) = arch·(1 − (2x/length)²) + 0,15.
//                     opts { length (8), width (2,4), arch (1,1) }  state –
// kirschbaum          Kirschbaum: knorriger Stamm, rosa Blütenwolken, Blütenblätter am Boden.  opts { height (4,5), seed (1) }
//                     state { sway (0..1) }
// fernost_dach        geschwungenes Dach (Walmdach mit hochgezogenen Ecken): Ziegelreihen, rot-goldene Traufkante, Firstzier.
//                     **Ursprung = Mitte auf Traufhöhe.**  opts { width (6), depth (4), height (2), color: 'blau'|'gruen'|'rot' }

import {
  THREE, TAU, Build, cached, mesh, joint, makeModel, Clock, damp, clamp, mix, col, smoothstep, lerp, glowSprite, placed,
} from '../lib/kit.js';
import { W6, kulMat, kulMat2, glowV, kieferGeo, cloudGeo, hullGeo, gradV, taperTube, hash1, noise3, lumpyEllipsoid, displace } from '../lib/w6Geos.js';

const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
const noToy = (m) => { m.userData.toy = false; return m; };

// =============================================================================================
// Wolkenberg
// =============================================================================================
function wolkenbergPuffs(w, h, seed) {
  const out = [];
  const rows = [[0.0, 6, 0.24], [0.3, 5, 0.2], [0.55, 4, 0.16], [0.76, 3, 0.12], [0.93, 2, 0.09]];
  rows.forEach(([fy, n, fr], ri) => {
    for (let i = 0; i < n; i++) {
      const t = n > 1 ? i / (n - 1) - 0.5 : 0;
      const r = w * fr * (0.85 + hash1(seed * 7 + ri * 13 + i) * 0.3);
      const x = t * w * (1 - fy * 0.75) + (hash1(seed + ri * 3 + i) - 0.5) * w * 0.06;
      out.push([x * 0.15, fy * h * 0.82 + r * 0.55, x, r]);
      if (ri < 2) out.push([-w * 0.12 - hash1(i + seed) * w * 0.05, fy * h * 0.82 + r * 0.45, x * 0.9, r * 0.9]);
    }
  });
  return out;
}
function buildWolkenberg(opts = {}) {
  const w = Math.max(2, num(opts.size, 10)), h = Math.max(1, num(opts.height, 6)), seed = num(opts.seed, 1);
  const root = new THREE.Group();
  root.add(mesh(cloudGeo(`berg:${w}:${h}:${seed}`, wolkenbergPuffs(w, h, seed), { ws: 16, hs: 10, lo: 0xa8a4e0, mid: 0xdcdcfa, hi: 0xffffff }), kulMat(0.8), {}, false));
  return makeModel('wolkenberg', root, () => {});
}

// =============================================================================================
// Bergkiefer
// =============================================================================================
function buildBergkiefer(opts = {}) {
  const h = Math.max(1, num(opts.height, 5)), seed = Math.round(num(opts.seed, 1));
  const root = new THREE.Group();
  const tree = joint();
  tree.add(mesh(kieferGeo(h, false, seed), kulMat(0.75), {}, true));
  root.add(tree);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const sw = clamp(num(st.sway, 0), 0, 1);
    tree.rotation.z = Math.sin(clk.t * 1.1) * 0.025 * sw;
    tree.rotation.x = Math.sin(clk.t * 0.8 + 1) * 0.015 * sw;
  };
  return makeModel('bergkiefer', root, update);
}

// =============================================================================================
// Felsen über den Wolken
// =============================================================================================
function wolkenfelsGeo(S, H, seed) {
  return cached(`w6:fels:${S}:${H}:${seed}`, () => {
    const b = new Build();
    // Felszahn: Drehkörper (oben schmaler, schräge Kuppe), verbeult
    const prof = [[0, 0], [S * 0.5, 0], [S * 0.48, H * 0.2], [S * 0.4, H * 0.5], [S * 0.3, H * 0.78], [S * 0.22, H * 0.92], [S * 0.1, H * 1.0], [0, H * 1.02]];
    let g = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 18);
    g = displace(g, S * 0.07, 1.6 / S * 2, seed, true);
    b.add(g, { v: (x, y, z, nx, ny) => {
      const band = Math.sin(y / H * 18 + noise3(x, y, z) * 3) * 0.5 + 0.5;
      const c = mix(W6.rockLow, W6.rockHi, smoothstep(ny * 0.4 + nx * 0.25 + 0.4) * 0.8 + band * 0.15);
      return ny > 0.55 && y > H * 0.7 ? mix(c, W6.grass, smoothstep((ny - 0.55) / 0.25)) : c;
    } }, null);
    // Grasschopf
    b.add(lumpyEllipsoid([S * 0.24, S * 0.08, S * 0.22], S * 0.03, 3 / S, seed + 3, 16, 8), { v: (x, y, z, nx, ny) => mix(W6.leafLow, W6.grassHi, smoothstep(ny * 0.6 + 0.4)) }, { p: [0, H * 0.98, 0] });
    // kleine Kiefer obenauf
    const k = kieferGeo(S * 0.45, true, seed + 2).clone();
    k.translate(S * 0.05, H * 0.98, -S * 0.04);
    b.parts.push(k);
    // Wolkenkragen am Fuß
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU + hash1(seed + i) * 0.4, r = S * (0.52 + hash1(i * 3 + seed) * 0.12), rr = S * (0.16 + hash1(i * 5) * 0.08);
      b.add(new THREE.SphereGeometry(rr, 12, 8), { v: (x, y, z, nx, ny) => mix(0xc4c8f4, 0xffffff, smoothstep(ny * 0.6 + 0.45)) }, { p: [Math.cos(a) * r, rr * 0.5 + hash1(i) * S * 0.08, Math.sin(a) * r] });
    }
    return b.geometry();
  });
}
function buildWolkenfels(opts = {}) {
  const S = Math.max(0.8, num(opts.size, 4)), H = Math.max(0.8, num(opts.height, S * 1.3)), seed = num(opts.seed, 1);
  const root = new THREE.Group();
  root.add(mesh(wolkenfelsGeo(S, H, seed), kulMat(0.8), {}, true));
  return makeModel('wolkenfels', root, () => {});
}

// =============================================================================================
// Geisterschiff-Wrack
// =============================================================================================
const wreckV = { v: (x, y, z, nx, ny) => mix(W6.ghostDark, W6.ghostHi, smoothstep(ny * 0.4 + nx * 0.3 + 0.4 + noise3(x * 2, y * 2, z * 2) * 0.3 - 0.15)) };
function wrackGeo(kind) {
  return cached(`w6:wrack:${kind}`, () => {
    const b = new Build();
    const mastPart = (p, len, tilt, broken = true) => {
      const d = new THREE.Vector3(Math.sin(tilt), Math.cos(tilt), 0.12).normalize();
      const end = new THREE.Vector3(...p).addScaledVector(d, len);
      b.add(taperTube([p, new THREE.Vector3(...p).addScaledVector(d, len * 0.5).toArray(), end.toArray()], (t) => 0.2 - t * 0.06, 8, 8), wreckV, null);
      if (broken) for (let i = 0; i < 5; i++) b.cone(0.05, 0.3 + hash1(i) * 0.2, W6.ghostLow, { p: end.clone().add(new THREE.Vector3((hash1(i * 3) - 0.5) * 0.2, 0.1, (hash1(i * 7) - 0.5) * 0.2)).toArray(), r: [(hash1(i * 2) - 0.5) * 0.6, 0, tilt + (hash1(i * 5) - 0.5) * 0.6] }, 4);
      return { d, end };
    };
    if (kind === 'mast') {
      const { d } = mastPart([0, -0.3, 0], 4.2, 0.18, false);
      const top = new THREE.Vector3(0, -0.3, 0).addScaledVector(d, 4.2);
      // Knick: oberes Stück hängt schräg
      const d2 = new THREE.Vector3(0.75, 0.55, 0.1).normalize();
      b.add(taperTube([top.toArray(), top.clone().addScaledVector(d2, 1.0).toArray(), top.clone().addScaledVector(d2, 2.0).toArray()], (t) => 0.15 - t * 0.04, 6, 7), wreckV, null);
      b.cyl(0.5, 0.42, 0.4, (x, y, z) => (Math.floor((Math.atan2(z, x) + 4) * 4) % 2 ? col(0x4a5a5a) : col(0x6a7a72)), { p: top.clone().addScaledVector(d, -0.6).toArray(), r: [0, 0, 0.18] }, 12, true);
      b.cyl(0.11, 0.11, 2.6, wreckV, { p: top.clone().addScaledVector(d, -1.5).toArray(), r: [Math.PI / 2 + 0.2, 0, 0.18] }, 7);
      const fs = new THREE.Shape(); fs.moveTo(0, 0); fs.lineTo(0.8, -0.1); fs.lineTo(0.55, -0.25); fs.lineTo(0.75, -0.42); fs.lineTo(0, -0.5); fs.closePath();
      const flag = new THREE.ShapeGeometry(fs); flag.rotateY(Math.PI / 2);
      b.add(flag, 0x2a2a34, { p: top.clone().addScaledVector(d2, 1.6).toArray() });
      // Trümmer am Fuß
      for (let i = 0; i < 4; i++) b.box(1.2 + hash1(i) * 0.8, 0.12, 0.3, wreckV, { p: [(hash1(i * 3) - 0.5) * 2.4, 0.05, (hash1(i * 5) - 0.5) * 2.4], r: [0, hash1(i * 7) * 3, (hash1(i) - 0.5) * 0.3] }, 0.03, 1);
      return b.geometry();
    }
    // Bug: gebrochener Rumpf, schräg nach oben, halb versunken
    const hull = hullGeo(8, 3.6, 2.6, true, true).clone();
    // Vertexfarben des Rumpfs durch Wrack-Farben ersetzen (dunkler, moosig)
    const C = hull.attributes.color;
    for (let i = 0; i < C.count; i++) { C.setXYZ(i, C.getX(i) * 0.8, C.getY(i) * 0.9, C.getZ(i) * 0.85); }
    hull.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(-0.8, 0.9, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.12, 0, 0.38)), new THREE.Vector3(1, 1, 1)));
    b.parts.push(hull);
    mastPart([0.6, 1.3, 0], 2.6, -0.35);
    // Segelfetzen am Maststumpf
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(1.2, 0); s.lineTo(1.0, -0.8); s.lineTo(0.7, -0.5); s.lineTo(0.4, -1.1); s.lineTo(0.1, -0.6); s.closePath();
    const sail = new THREE.ShapeGeometry(s); sail.rotateY(Math.PI / 2);
    b.add(sail, { v: (x, y) => mix(0x7a847a, 0xc8ccb8, smoothstep(y + 0.9)) }, { p: [0.15, 3.3, -0.6] });
    // Wasser-/Bodenkranz, Algen
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; b.sphere(0.35 + hash1(i) * 0.2, { v: (x, y, z, nx, ny) => mix(W6.moss, 0x9ad8b8, smoothstep(ny * 0.5 + 0.5)) }, { p: [Math.cos(a) * 2.2 + 0.4, 0.05, Math.sin(a) * 1.4], s: [1.3, 0.35, 1] }, 10, 6); }
    return b.geometry();
  });
}
function buildWrack(opts = {}) {
  const kind = opts.kind === 'mast' ? 'mast' : 'bug';
  const root = new THREE.Group();
  const m = mesh(wrackGeo(kind), kulMat2(), {}, true);
  m.scale.setScalar(Math.max(0.2, num(opts.size, 1)));
  root.add(m);
  return makeModel('geisterschiff_wrack', root, () => {});
}

// =============================================================================================
// Papierlaterne
// =============================================================================================
const LANT = { rot: [0xd8202a, 0xff8a4a], weiss: [0xf0e4d0, 0xfffaf0], gelb: [0xf0b020, 0xfff0a0] };
function lanternPaperGeo(color) {
  const C = LANT[color];
  return cached(`w6:plant:paper:${color}`, () => {
    const b = new Build();
    const prof = [[0.15, -0.34], [0.25, -0.3], [0.32, -0.19], [0.35, 0], [0.32, 0.19], [0.25, 0.3], [0.15, 0.34]];
    b.lathe(prof, { v: (x, y) => mix(C[0], C[1], smoothstep(0.62 - Math.abs(y) * 1.9)) }, null, 32, 3);
    return b.geometry();
  });
}
function lanternFrameGeo(mount) {
  return cached(`w6:plant:frame:${mount}`, () => {
    const b = new Build();
    const black = gradV(0x141018, 0x4a4050);
    // Kappen, Quaste (Laterne hängt mit Mitte bei y = −0,55 unter der Aufhängung)
    const cy = -0.62;
    b.cyl(0.17, 0.19, 0.07, black, { p: [0, cy + 0.36, 0] }, 16);
    b.cyl(0.19, 0.17, 0.07, black, { p: [0, cy - 0.36, 0] }, 16);
    b.cyl(0.012, 0.012, 0.22, 0x2a1a10, { p: [0, cy + 0.5, 0] }, 5);
    // Bambusringe (Rippen) rund um das Papier
    const prof = [[0.15, -0.34], [0.25, -0.3], [0.32, -0.19], [0.35, 0], [0.32, 0.19], [0.25, 0.3], [0.15, 0.34]];
    const rAt = (y) => { for (let i = 0; i < prof.length - 1; i++) { const [r0, y0] = prof[i], [r1, y1] = prof[i + 1]; if (y >= y0 && y <= y1) return r0 + (r1 - r0) * (y - y0) / (y1 - y0); } return 0.15; };
    for (const y of [-0.24, -0.12, 0, 0.12, 0.24]) b.torus(rAt(y) + 0.004, 0.008, 0x5a1a10, { p: [0, cy + y, 0], r: [Math.PI / 2, 0, 0] }, 4, 32);
    b.sphere(0.04, W6.gold, { p: [0, cy - 0.42, 0] }, 8, 6);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; b.cyl(0.009, 0.004, 0.26, W6.gold, { p: [Math.cos(a) * 0.028, cy - 0.56, Math.sin(a) * 0.028] }, 4); }
    return b.geometry();
  });
}
const postGeo = () => cached('w6:plant:post', () => {
  const b = new Build();
  const wood = { v: (x, y, z, nx) => mix(0x5a3018, 0x9a6a3a, smoothstep(nx * 0.5 + 0.5)) };
  b.box(0.16, 2.3, 0.16, wood, { p: [0, 1.15, 0] }, 0.03, 1);
  b.box(0.7, 0.12, 0.12, wood, { p: [0.3, 2.2, 0] }, 0.03, 1);
  b.box(0.08, 0.3, 0.08, wood, { p: [0.12, 2.05, 0], r: [0, 0, -0.75] }, 0.02, 1);
  b.box(0.36, 0.12, 0.36, 0x5a5a68, { p: [0, 0.06, 0] }, 0.03, 1);
  b.cone(0.08, 0.12, 0x2a1a10, { p: [0, 2.36, 0] }, 4);
  return b.geometry();
});
function buildPapierlaterne(opts = {}) {
  const color = LANT[opts.color] ? opts.color : 'rot';
  const hang = opts.mount === 'haengend';
  const root = new THREE.Group();
  const own = [];
  if (!hang) root.add(mesh(postGeo(), kulMat(0.7), {}, true));
  const swing = joint(hang ? [0, 0, 0] : [0.58, 2.2, 0]);
  const paperLit = glowV();
  const paperOff = kulMat(0.6);
  const paper = mesh(lanternPaperGeo(color), paperLit, { p: [0, -0.62, 0] }, true);
  swing.add(paper, mesh(lanternFrameGeo('x'), kulMat(0.5), {}, true));
  const glow = glowSprite(color === 'weiss' ? 0xfff0c0 : color === 'gelb' ? 0xffd060 : 0xff7a3a, 1.3, 0.55);
  glow.position.y = -0.62;
  swing.add(glow);
  root.add(swing);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const t = clk.t;
    const lit = st.lit !== false;
    paper.material = lit ? paperLit : paperOff;
    glow.visible = lit;
    glow.scale.setScalar(1.25 + Math.sin(t * 3) * 0.05);
    const sw = clamp(num(st.sway, 0.3), 0, 1);
    swing.rotation.z = Math.sin(t * 1.3) * 0.08 * sw;
    swing.rotation.x = Math.sin(t * 0.9 + 1) * 0.05 * sw;
  };
  return makeModel('papierlaterne', root, update, own);
}

// =============================================================================================
// Holzbrücke
// =============================================================================================
function bridgeGeo(L, W, A) {
  return cached(`w6:bruecke:${L}:${W}:${A}`, () => {
    const b = new Build();
    const yAt = (x) => A * (1 - (2 * x / L) ** 2) + 0.15;
    const n = Math.max(6, Math.round(L / 0.3));
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) / n * L - L / 2, slope = -8 * A * x / (L * L);
      b.box(L / n - 0.03, 0.12, W, mix(0xa86a3a, 0xd8a068, hash1(i * 3.3) * 0.6), { p: [x, yAt(x) - 0.06, 0], r: [0, 0, Math.atan(slope)] }, 0.02, 1);
    }
    // Tragbalken unten (gebogen)
    for (const s of [1, -1]) {
      const pts = []; for (let i = 0; i <= 12; i++) { const x = (i / 12 - 0.5) * L; pts.push([x, yAt(x) - 0.22, s * (W / 2 - 0.12)]); }
      b.add(taperTube(pts, 0.11, 24, 6), 0x6a3a1a, null);
    }
    // Geländer: Pfosten mit Goldkappen, zwei Handläufe
    const lac = { v: (x, y, z, nx, ny) => mix(W6.lacquerLow, W6.lacquer, smoothstep(nx * 0.3 + ny * 0.4 + 0.5)) };
    const np = Math.max(3, Math.round(L / 1.4));
    for (const s of [1, -1]) {
      for (let i = 0; i <= np; i++) {
        const x = (i / np - 0.5) * (L - 0.3);
        b.box(0.12, 0.95, 0.12, lac, { p: [x, yAt(x) + 0.47, s * (W / 2 - 0.08)] }, 0.02, 1);
        b.sphere(0.075, W6.gold, { p: [x, yAt(x) + 0.98, s * (W / 2 - 0.08)] }, 8, 6);
      }
      for (const hh of [0.85, 0.45]) {
        const pts = []; for (let i = 0; i <= 12; i++) { const x = (i / 12 - 0.5) * (L - 0.3); pts.push([x, yAt(x) + hh, s * (W / 2 - 0.08)]); }
        b.add(taperTube(pts, hh > 0.6 ? 0.05 : 0.035, 24, 6), lac, null);
      }
    }
    // Fundamente
    for (const sx of [1, -1]) b.box(0.6, 0.3, W + 0.3, gradV(0x6a6878, 0xa8a4b8), { p: [sx * (L / 2 - 0.2), 0.15, 0] }, 0.05, 1);
    return b.geometry();
  });
}
function buildHolzbruecke(opts = {}) {
  const L = Math.max(2, num(opts.length, 8)), W = Math.max(1, num(opts.width, 2.4)), A = Math.max(0, num(opts.arch, 1.1));
  const root = new THREE.Group();
  const m = mesh(bridgeGeo(L, W, A), kulMat(0.6), {}, true);
  m.receiveShadow = true;
  root.add(m);
  root.userData.deckY = (x) => A * (1 - (2 * x / L) ** 2) + 0.15;
  return makeModel('holzbruecke', root, () => {});
}

// =============================================================================================
// Kirschbaum
// =============================================================================================
function kirschGeo(h, seed) {
  return cached(`w6:kirsch:${h}:${seed}`, () => {
    const b = new Build();
    const bark = { v: (x, y, z, nx) => mix(0x3a2018, 0x8a5a48, smoothstep(nx * 0.5 + 0.45 + noise3(x * 5, y * 3, z * 5) * 0.3 - 0.15)) };
    const trunk = [[0, 0, 0], [0.15 * h * 0.1, h * 0.25, 0], [-0.05 * h, h * 0.45, 0.04 * h], [0.04 * h, h * 0.6, 0]];
    b.add(taperTube(trunk, (t) => h * 0.06 * (1 - t * 0.55), 10, 9), bark, null);
    b.cone(h * 0.1, h * 0.06, 0x3a2018, { p: [0, h * 0.02, 0] }, 9);
    const crowns = [[0.04 * h, h * 0.78, 0, 0.3], [0.25 * h, h * 0.68, 0.12 * h, 0.22], [-0.24 * h, h * 0.66, -0.08 * h, 0.22], [-0.05 * h, h * 0.7, 0.24 * h, 0.2], [0.12 * h, h * 0.7, -0.22 * h, 0.2]];
    crowns.forEach(([x, y, z, r], i) => {
      if (i > 0) b.add(taperTube([[trunk[3][0] * 0.7, h * 0.56, 0], [x * 0.6, y - h * 0.08, z * 0.6], [x * 0.9, y - h * 0.04, z * 0.9]], (t) => h * 0.025 * (1 - t * 0.5), 6, 6), bark, null);
      b.add(lumpyEllipsoid([r * h, r * h * 0.75, r * h], r * h * 0.14, 2.6 / (r * h), seed * 5 + i, 18, 12), { v: (xx, yy, zz, nx, ny) => {
        const k = noise3(xx * 6 + i, yy * 6, zz * 6);
        return mix(mix(W6.blossomLow, W6.blossom, smoothstep(ny * 0.6 + 0.45)), W6.blossomHi, k > 0.68 ? 0.8 : 0);
      } }, { p: [x, y, z] });
    });
    // Blütenblätter am Boden
    for (let i = 0; i < 14; i++) {
      const a = hash1(i * 3.1 + seed) * TAU, r = h * (0.15 + hash1(i * 7.3) * 0.3);
      b.add(new THREE.CircleGeometry(0.07, 5), i % 3 ? W6.blossom : W6.blossomHi, { p: [Math.cos(a) * r, 0.01, Math.sin(a) * r], r: [-Math.PI / 2, 0, a] });
    }
    return b.geometry();
  });
}
function buildKirschbaum(opts = {}) {
  const h = Math.max(1, num(opts.height, 4.5)), seed = Math.round(num(opts.seed, 1));
  const root = new THREE.Group();
  const tree = joint();
  tree.add(mesh(kirschGeo(h, seed), kulMat2(), {}, true));
  root.add(tree);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const sw = clamp(num(st.sway, 0), 0, 1);
    tree.rotation.z = Math.sin(clk.t * 1.2) * 0.02 * sw;
  };
  return makeModel('kirschbaum', root, update);
}

// =============================================================================================
// Fernost-Dach
// =============================================================================================
const ROOF = { blau: [0x1e3a6a, 0x4a7ac8], gruen: [0x1e5a4a, 0x4aa88a], rot: [0x8a1a1a, 0xd84a3a] };
function roofGeo(w, d, h, color) {
  const C = ROOF[color];
  return cached(`w6:dach:${w}:${d}:${h}:${color}`, () => {
    const b = new Build();
    // Walmdach aus einem Drehkörper: Kreis → Quadrat (Superellipse), konkaves Profil, Ecken hochgezogen
    const prof = [];
    const N = 12;
    for (let i = 0; i <= N; i++) { const t = i / N; prof.push([1 - t, h * (1 - Math.pow(1 - t, 0.55)) * 0.98 + 0.02]); }
    const g = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(Math.max(0.001, x), y)), 48);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      const r = Math.hypot(x, z);
      if (r < 1e-4) continue;
      const a = Math.atan2(z, x), c = Math.cos(a), s = Math.sin(a);
      const sq = 1 / Math.max(Math.abs(c), Math.abs(s));       // Kreis → Quadrat
      const corner = (sq - 1) / (Math.SQRT2 - 1);              // 0 Mitte der Kante, 1 Ecke
      const edge = smoothstep((r - 0.7) / 0.3);
      P.setXYZ(i, c * r * sq * (w / 2 + 0.6), y + edge * edge * corner * corner * h * 0.38 + edge * h * 0.05, s * r * sq * (d / 2 + 0.6));
    }
    g.computeVertexNormals();
    b.add(g, { v: (x, y, z, nx, ny) => {
      const a = Math.atan2(z / (d / 2 + 0.6), x / (w / 2 + 0.6));
      const ridge = Math.abs(Math.sin(a * 22)) > 0.8;
      return mix(ridge ? mix(C[0], 0x000000, 0.25) : col(C[0]), C[1], smoothstep(ny * 0.6 + 0.2));
    } }, null);
    // Traufkante: rot-goldenes Band rundherum (dünne Röhre entlang des Randes)
    const rim = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * TAU, c = Math.cos(a), s = Math.sin(a), sq = 1 / Math.max(Math.abs(c), Math.abs(s));
      const corner = (sq - 1) / (Math.SQRT2 - 1);
      rim.push([c * sq * (w / 2 + 0.6), 0.02 + corner * corner * h * 0.38 + h * 0.05, s * sq * (d / 2 + 0.6)]);
    }
    b.add(taperTube(rim, 0.07, 128, 6), W6.lacquer, null);
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) b.sphere(0.13, W6.gold, { p: [sx * (w / 2 + 0.6), 0.02 + h * 0.43, sz * (d / 2 + 0.6)] }, 10, 8);
    // Firstzier
    b.cyl(0.1, 0.18, 0.4, W6.gold, { p: [0, h + 0.2, 0] }, 12);
    b.sphere(0.16, W6.gold, { p: [0, h + 0.5, 0] }, 12, 8);
    b.cone(0.07, 0.35, W6.gold, { p: [0, h + 0.8, 0] }, 8);
    // Unterseite (dunkle Holzschalung) und Balkenköpfe
    b.add(new THREE.PlaneGeometry(w + 1.2, d + 1.2).rotateX(Math.PI / 2), 0x3a2014, { p: [0, 0.02, 0] });
    for (let i = 0; i < Math.round(w / 0.5); i++) for (const s of [1, -1]) b.box(0.12, 0.12, 0.4, 0xe8d0a0, { p: [-w / 2 + 0.25 + i * 0.5, -0.04, s * (d / 2 + 0.3)] }, 0.02, 1);
    return b.geometry();
  });
}
function buildFernostDach(opts = {}) {
  const w = Math.max(1, num(opts.width, 6)), d = Math.max(1, num(opts.depth, 4)), h = Math.max(0.5, num(opts.height, 2));
  const color = ROOF[opts.color] ? opts.color : 'blau';
  const root = new THREE.Group();
  root.add(mesh(roofGeo(w, d, h, color), kulMat(0.55), {}, true));
  return makeModel('fernost_dach', root, () => {});
}

export const MODELS = {
  wolkenberg: buildWolkenberg,
  bergkiefer: buildBergkiefer,
  wolkenfels: buildWolkenfels,
  geisterschiff_wrack: buildWrack,
  papierlaterne: buildPapierlaterne,
  holzbruecke: buildHolzbruecke,
  kirschbaum: buildKirschbaum,
  fernost_dach: buildFernostDach,
};
