// Panzerzug und Baron-Requisiten Welt 2 (Kurs-Modus, 2-Panzer, 2-3). Eigene Gestaltung. Maßstab Meter,
// Ursprung = Mitte der Unterseite, Vorderseite/Fahrtrichtung +X; state darf ein String sein.
//
// panzer_fahrzeug  Panzerwagen-Plattform des Barons: karminroter Aufbau mit Goldkante, Nieten und Tatzen-Wappen,
//                  cremefarbenes Deck aus Stahlplatten (begehbar, Oberseite genau bei y = deck), Ketten mit
//                  umlaufenden Gliedern, Lauf- und Antriebsräder, Auspuff mit Rauch hinten (−X).
//                  opts  { length (10), width (4,4), deck (2,0), color: 'rot'|'oliv' }
//                  state { speed (m/s; positiv = fährt nach +X: Ketten laufen unten nach hinten, Räder drehen,
//                          Rauch; 0 = steht) }
// holzwand_boss    große Holzwand mit aufgemaltem Relief-Gesicht von Baron Brummbär (Zylinder, Monokel, Bart).
//                  Vorderseite +X, Breite entlang Z.  opts { width (6), height (5), thick (0,4) }
//                  state { anim: 'idle'|'hit'|'break', damage (0..1: ab 0,34 / 0,67 Risse) }
//                  hit: wackelt und blitzt 0,4 s; break: Bretter fliegen nach hinten weg (1,4 s), danach leer.
// metalltor        Stahltor mit Pfeilern und Sturz (Tatzen-Wappen); Torblatt fährt beim Öffnen in den Boden.
//                  Durchgang entlang ±X, Breite entlang Z.  opts { width (4), height (4) }
//                  state { open (0..1), anim?: 'shake' }
// holz_silhouette  Sperrholz-Aufsteller mit dunkler Silhouette von Baron Brummbär (≈2,9 m, mit Zylinder),
//                  auf Fußbrettern (bleiben stehen); kippt um deren hintere Kante (x = −0,45) nach hinten (−X) um.
//                  state { anim: 'idle'|'wobble', fall (0..1; 1 = liegt flach) }

import {
  THREE, TAU, Build, cached, vcol, basic, mesh, joint, makeModel, Clock, damp, clamp, col, mix, smoothstep, lerp,
  instMesh, setInst, glowSprite,
} from '../lib/kit.js';

const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// =============================================================================================
// Panzerwagen
// =============================================================================================
const TANK = {
  rot: { hull: 0xb01e2e, dark: 0x7a1220, hi: 0xd8384a, trim: 0xffc21a, deck: 0xe8dcc0, deck2: 0xd6c8a6, line: 0xa89878 },
  oliv: { hull: 0x6a7a3a, dark: 0x4a5a28, hi: 0x8a9c4a, trim: 0xffc21a, deck: 0xdcd8c0, deck2: 0xc8c4a8, line: 0x989478 },
};
const TR = { link: 0x2a2a30, cleat: 0x4a4a56, wheel: 0x3a3e4a, rim: 0x6a7080, hub: 0xffc21a };
const T_RR = 0.5, T_YC = 0.56, T_TW = 0.72;

function tankHullGeo(L, W, D, key) {
  return cached(`w2:tank:hull:${L}:${W}:${D}:${key}`, () => {
    const C = TANK[key];
    const b = new Build();
    const yb = 1.08, h = D - yb - 0.02;
    // Aufbau über die ganze Breite (überdeckt die Ketten oben)
    b.box(L, h, W, { v: (x, y, z, nx, ny) => (ny > 0.9 ? col(C.deck) : mix(C.dark, C.hi, smoothstep((y / h) + 0.5) * 0.9)) }, { p: [0, yb + h / 2, 0] }, 0.14, 2);
    // Mittelwanne zwischen den Ketten
    b.box(L - 0.8, yb - 0.3, W - 2 * T_TW - 0.1, C.dark, { p: [0, 0.3 + (yb - 0.3) / 2, 0] }, 0.08, 1);
    // Bugplatte schräg, Scheinwerfer
    b.box(0.5, 0.95, W - 0.2, { v: (x, y, z, nx, ny) => mix(C.dark, C.hull, smoothstep(nx)) }, { p: [L / 2 - 0.05, 0.85, 0], r: [0, 0, -0.55] }, 0.08, 1);
    for (const s of [1, -1]) {
      b.cyl(0.14, 0.12, 0.1, 0xe6eaf2, { p: [L / 2 + 0.06, 1.25, s * (W / 2 - 0.7)], r: [0, 0, Math.PI / 2] }, 14);
      b.cyl(0.11, 0.11, 0.02, 0xfff6c8, { p: [L / 2 + 0.12, 1.25, s * (W / 2 - 0.7)], r: [0, 0, Math.PI / 2] }, 14);
    }
    // Goldkante am Deckrand mit Nieten
    for (const s of [1, -1]) {
      b.box(L - 0.1, 0.08, 0.06, C.trim, { p: [0, D - 0.12, s * (W / 2 + 0.005)] }, 0.02, 1);
      for (let x = -L / 2 + 0.4; x <= L / 2 - 0.3; x += 0.8) b.sphere(0.045, C.trim, { p: [x, yb + 0.25, s * (W / 2 + 0.01)] }, 6, 4);
    }
    for (const s of [1, -1]) b.box(0.06, 0.08, W - 0.1, C.trim, { p: [s * (L / 2 + 0.005), D - 0.12, 0] }, 0.02, 1);
    // Tatzen-Wappen auf beiden Seiten
    for (const s of [1, -1]) {
      const cy = yb + h * 0.5;
      for (const [u, v, ru, rv] of [[0, -0.1, 0.22, 0.17], [-0.22, 0.1, 0.08, 0.11], [-0.08, 0.22, 0.08, 0.12], [0.08, 0.22, 0.08, 0.12], [0.22, 0.1, 0.08, 0.11]]) {
        b.sphere(1, C.trim, { p: [u, cy + v * 1.0, s * (W / 2 + 0.02)], s: [ru, rv, 0.04] }, 12, 6);
      }
    }
    // Deckplatten (begehbar bei y = D)
    const nx = Math.max(2, Math.round(L / 1.1)), nz = Math.max(2, Math.round(W / 1.1));
    const tx = (L - 0.3) / nx, tz = (W - 0.3) / nz;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      b.box(tx - 0.07, 0.03, tz - 0.07, (i + j) % 2 ? C.deck : C.deck2, { p: [-L / 2 + 0.15 + (i + 0.5) * tx, D - 0.015, -W / 2 + 0.15 + (j + 0.5) * tz] }, 0, 1);
    }
    // Auspuff hinten
    for (const s of [1, -1]) {
      b.cyl(0.12, 0.12, 0.7, 0x3a3e4a, { p: [-L / 2 - 0.05, D - 0.45, s * 0.7], r: [0, 0, 0.5] }, 12);
      b.cyl(0.14, 0.14, 0.08, C.trim, { p: [-L / 2 - 0.22, D - 0.15, s * 0.7], r: [0, 0, 0.5] }, 12);
    }
    return b.geometry();
  });
}
const tankLinkGeo = () => cached('w2:tank:link', () => {
  const b = new Build();
  b.box(0.3, 0.1, T_TW, TR.link, null, 0, 1);
  b.box(0.09, 0.06, T_TW * 0.9, TR.cleat, { p: [0, -0.06, 0] }, 0, 1);
  return b.geometry();
});
const tankWheelGeo = () => cached('w2:tank:wheel', () => {
  const b = new Build();
  b.cyl(1, 1, 0.55, { v: (x, y, z, nx, ny) => (Math.abs(ny) > 0.9 ? col(TR.rim) : col(TR.wheel)) }, { r: [Math.PI / 2, 0, 0] }, 14);
  for (const s of [1, -1]) {
    b.cyl(0.55, 0.55, 0.04, TR.hub, { p: [0, 0, s * 0.29], r: [Math.PI / 2, 0, 0] }, 12);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.4; b.box(0.14, 0.14, 0.04, 0x2a2e3a, { p: [Math.cos(a) * 0.32, Math.sin(a) * 0.32, s * 0.31], r: [0, 0, a] }, 0, 1); }
  }
  return b.geometry();
});
function buildPanzer(opts = {}) {
  const L = Math.max(4, Number(opts.length ?? 10)), W = Math.max(2.5, Number(opts.width ?? 4.4)), D = Math.max(1.6, Number(opts.deck ?? 2.0));
  const key = TANK[opts.color] ? opts.color : 'rot';
  const root = new THREE.Group();
  const hull = mesh(tankHullGeo(L, W, D, key), vcol(0.45), {}, true);
  hull.receiveShadow = true;
  const a = L / 2 - 0.55;                      // Radmitten vorn/hinten
  const P = 4 * a + TAU * T_RR;                // Kettenumfang
  const perSide = Math.floor(P / 0.36);
  const links = instMesh(tankLinkGeo(), vcol(0.6), perSide * 2, L / 2 + 1, 0.6);
  links.castShadow = true;
  const nRoad = Math.max(2, Math.round((2 * a) / 0.95) + 1);
  const wheels = instMesh(tankWheelGeo(), vcol(0.45), (nRoad + 2) * 2, L / 2 + 1, 0.6);
  wheels.castShadow = true;
  const smoke = mesh(cached('w2:tank:smoke', () => {
    const b = new Build();
    for (let i = 0; i < 4; i++) b.sphere(0.18 + i * 0.07, i % 2 ? 0x9a9aa4 : 0xc8c8d0, { p: [-i * 0.22, i * 0.3, Math.sin(i * 2.3) * 0.12] }, 10, 8);
    return b.geometry();
  }), basic('w2:tankSmoke', { color: 0xffffff, vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false }));
  root.add(hull, links, wheels, smoke);
  const zs = [W / 2 - T_TW / 2 - 0.02, -(W / 2 - T_TW / 2 - 0.02)];
  const roadX = Array.from({ length: nRoad }, (_, i) => -a + (2 * a) * (i / (nRoad - 1)));
  const yb = T_YC - T_RR;
  const linkAt = (s, out) => {
    s = ((s % P) + P) % P;
    if (s < 2 * a) { out.x = a - s; out.y = yb; out.r = 0; return; }
    s -= 2 * a;
    if (s < Math.PI * T_RR) { const f = s / T_RR; out.x = -a - T_RR * Math.sin(f); out.y = T_YC - T_RR * Math.cos(f); out.r = -f; return; }
    s -= Math.PI * T_RR;
    if (s < 2 * a) { out.x = -a + s; out.y = T_YC + T_RR; out.r = -Math.PI; return; }
    s -= 2 * a;
    const f = s / T_RR; out.x = a + T_RR * Math.sin(f); out.y = T_YC + T_RR * Math.cos(f); out.r = Math.PI - f;
  };
  const tmp = { x: 0, y: 0, r: 0 };
  const clk = new Clock();
  let off = 0;
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const v = st.speed ?? 0;
    off += v * dt;
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < perSide; i++) {
        linkAt(i * (P / perSide) + off, tmp);
        setInst(links, side * perSide + i, tmp.x, tmp.y + 0.05 * Math.cos(tmp.r) * 0, zs[side], 0, 0, tmp.r);
      }
      const spin = -off / 0.36, spinS = -off / (T_RR - 0.06);
      roadX.forEach((x, i) => setInst(wheels, side * (nRoad + 2) + i, x, yb + 0.06 + 0.36, zs[side], 0, 0, spin, [0.36, 0.36, T_TW / 0.55 * 0.9]));
      setInst(wheels, side * (nRoad + 2) + nRoad, a, T_YC, zs[side], 0, 0, spinS, [T_RR - 0.08, T_RR - 0.08, T_TW / 0.55 * 0.9]);
      setInst(wheels, side * (nRoad + 2) + nRoad + 1, -a, T_YC, zs[side], 0, 0, spinS, [T_RR - 0.08, T_RR - 0.08, T_TW / 0.55 * 0.9]);
    }
    links.instanceMatrix.needsUpdate = true;
    wheels.instanceMatrix.needsUpdate = true;
    smoke.visible = Math.abs(v) > 0.1;
    if (smoke.visible) { const k = (clk.t * 1.4) % 1; smoke.position.set(-L / 2 - 0.4 - k * 0.6, D + k * 0.6, 0.7 * (Math.floor(clk.t * 1.4) % 2 ? 1 : -1)); smoke.scale.setScalar(0.6 + k * 0.9); }
    hull.position.y = Math.abs(v) > 0.1 ? Math.sin(clk.t * 17) * 0.008 : 0;
  };
  return makeModel('panzer_fahrzeug', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Holzwand mit Baron-Gesicht
// =============================================================================================
const HW = { wood: 0xd8a060, wood2: 0xc48a4a, wood3: 0xe6b478, batten: 0x8a5426, nail: 0x4a3a2a, fur: 0x7a4a2a, muzzle: 0xe2ba8c, nose: 0x1a1210, hat: 0x1e1a26, band: 0xe0262a, gold: 0xffc21a, white: 0xffffff, ink: 0x1a0e08, stache: 0x2e1a0e, crack: 0x2a1408 };
function wallGeo(W, H, T) {
  return cached(`w2:hwall:${W}:${H}:${T}`, () => {
    const b = new Build();
    const n = Math.max(2, Math.round(W / 0.5)), bw = W / n;
    for (let i = 0; i < n; i++) {
      const hh = H + (hash(i) - 0.5) * 0.2;
      const c = [HW.wood, HW.wood2, HW.wood3][i % 3];
      b.box(T, hh, bw - 0.03, c, { p: [0, hh / 2, -W / 2 + (i + 0.5) * bw] }, 0.03, 1);
      for (const y of [0.6, H - 0.6]) b.sphere(0.035, HW.nail, { p: [T / 2 + 0.01, y, -W / 2 + (i + 0.5) * bw] }, 6, 4);
    }
    for (const y of [0.6, H - 0.6]) b.box(0.12, 0.3, W + 0.1, HW.batten, { p: [-T / 2 - 0.06, y, 0] }, 0.03, 1);
    for (const s of [1, -1]) b.box(0.12, H, 0.3, HW.batten, { p: [-T / 2 - 0.06, H / 2, s * (W / 2 - 0.3)] }, 0.03, 1);
    return b.geometry();
  });
}
function baronFaceGeo(H, T) {
  return cached(`w2:hwall:face:${H}:${T}`, () => {
    const b = new Build();
    const x0 = T / 2;
    const k = H / 5;                                   // Maßstab: Gesicht auf 5 m Wand ausgelegt
    const R = (yz, r, c, d = 0.06) => b.sphere(1, c, { p: [x0 + d * 0.5, yz[0] * k, yz[1] * k], s: [d, r[0] * k, r[1] * k] }, 18, 10);
    R([3.35, 1.1], [0.42, 0.42], HW.fur, 0.07); R([3.35, -1.1], [0.42, 0.42], HW.fur, 0.07);
    R([3.35, 1.1], [0.24, 0.24], HW.muzzle, 0.1); R([3.35, -1.1], [0.24, 0.24], HW.muzzle, 0.1);
    R([2.35, 0], [1.3, 1.35], HW.fur, 0.08);
    R([1.85, 0], [0.62, 0.78], HW.muzzle, 0.14);
    R([2.15, 0], [0.2, 0.3], HW.nose, 0.2);
    for (const s of [1, -1]) {
      R([2.75, s * 0.45], [0.27, 0.22], HW.white, 0.14);
      R([2.72, s * 0.45], [0.12, 0.11], HW.ink, 0.19);
      b.box(0.08, 0.14 * k, 0.55 * k, HW.ink, { p: [x0 + 0.12, 3.1 * k, s * 0.48 * k], r: [s * 0.4, 0, 0] }, 0.04, 1);
      // Schnurrbart (gezwirbelt)
      b.tube([[x0 + 0.17, 1.9 * k, s * 0.05 * k], [x0 + 0.17, 1.82 * k, s * 0.4 * k], [x0 + 0.15, 1.95 * k, s * 0.75 * k], [x0 + 0.13, 2.15 * k, s * 0.8 * k]], 0.09 * k, HW.stache, null, 16, 8);
    }
    // Monokel um das rechte Auge, Kette
    b.torus(0.32 * k, 0.04 * k, HW.gold, { p: [x0 + 0.2, 2.75 * k, 0.45 * k], r: [0, Math.PI / 2, 0] }, 6, 24);
    b.tube([[x0 + 0.2, 2.45 * k, 0.6 * k], [x0 + 0.15, 1.6 * k, 0.95 * k], [x0 + 0.12, 1.2 * k, 1.0 * k]], 0.025 * k, HW.gold, null, 10, 4);
    // grimmiger Mund
    b.torus(0.28 * k, 0.04 * k, HW.ink, { p: [x0 + 0.16, 1.5 * k, 0], r: [0, Math.PI / 2, Math.PI], s: [1, 0.5, 1] }, 6, 16, Math.PI);
    // Zylinder: Krempe, Hut, rotes Band
    b.box(0.12, 0.18 * k, 2.3 * k, HW.hat, { p: [x0 + 0.06, 3.55 * k, 0] }, 0.04, 1);
    b.box(0.1, 1.15 * k, 1.45 * k, HW.hat, { p: [x0 + 0.05, 4.2 * k, 0] }, 0.04, 1);
    b.box(0.12, 0.22 * k, 1.47 * k, HW.band, { p: [x0 + 0.06, 3.76 * k, 0] }, 0.03, 1);
    return b.geometry();
  });
}
function crackGeo(W, H, T, n) {
  return cached(`w2:hwall:crack:${W}:${H}:${n}`, () => {
    const b = new Build();
    const x = T / 2 + 0.03;
    const lines = n === 1
      ? [[[x, H * 0.15, -W * 0.3], [x, H * 0.3, -W * 0.25], [x, H * 0.42, -W * 0.33], [x, H * 0.55, -W * 0.28]]]
      : [[[x, H * 0.7, W * 0.32], [x, H * 0.58, W * 0.25], [x, H * 0.5, W * 0.34], [x, H * 0.35, W * 0.27]], [[x, H * 0.1, W * 0.05], [x, H * 0.22, -W * 0.05], [x, H * 0.3, W * 0.02]]];
    for (const l of lines) b.tube(l, 0.04, HW.crack, null, 14, 4);
    return b.geometry();
  });
}
function buildHolzwand(opts = {}) {
  const W = Number(opts.width ?? 6), H = Number(opts.height ?? 5), T = Number(opts.thick ?? 0.4);
  const root = new THREE.Group();
  const flash = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, emissive: 0x000000 });
  const wall = joint();
  const planks = mesh(wallGeo(W, H, T), flash, {}, true);
  planks.receiveShadow = true;
  const face = mesh(baronFaceGeo(H, T), vcol(0.6), {}, true);
  const c1 = mesh(crackGeo(W, H, T, 1), vcol(0.9)), c2 = mesh(crackGeo(W, H, T, 2), vcol(0.9));
  wall.add(planks, face, c1, c2);
  const n = Math.max(2, Math.round(W / 0.5)), bw = W / n;
  const pieceGeo = cached(`w2:hwall:piece:${bw}:${H}:${T}`, () => new Build().box(T, H / 2, bw - 0.03, { v: (x, y) => mix(HW.wood2, HW.wood3, smoothstep(y / H + 0.5)) }, null, 0.03, 1).geometry());
  const pieces = instMesh(pieceGeo, vcol(0.75), n * 2, W + H, H / 2);
  pieces.castShadow = true;
  pieces.visible = false;
  root.add(wall, pieces);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    const dmg = clamp(st.damage ?? 0, 0, 1);
    c1.visible = dmg >= 0.34; c2.visible = dmg >= 0.67;
    const hitK = anim === 'hit' ? Math.max(0, 1 - age / 0.4) : 0;
    wall.rotation.z = Math.sin(t * 40) * 0.02 * hitK;
    wall.position.x = -Math.sin(Math.min(1, age / 0.15) * Math.PI) * 0.08 * (anim === 'hit' ? 1 : 0);
    const f = hitK * (Math.sin(age * 40) > 0 ? 0.7 : 0.15);
    flash.emissive.setRGB(f, f * 0.8, f * 0.6);
    const broken = anim === 'break';
    wall.visible = !broken;
    pieces.visible = broken && age < 1.4;
    if (pieces.visible) {
      for (let i = 0; i < n * 2; i++) {
        const z = -W / 2 + ((i % n) + 0.5) * bw, y0 = (Math.floor(i / n) + 0.5) * H / 2;
        const vx = -(2 + hash(i) * 3), vy = 2 + hash(i + 7) * 4, vz = (hash(i + 3) - 0.5) * 3;
        const s = Math.max(0.001, 1 - Math.max(0, age - 1.0) / 0.4);
        setInst(pieces, i, vx * age, Math.max(0.2, y0 + vy * age - 9 * age * age), z + vz * age, hash(i + 1) * 6 * age, hash(i + 2) * 4 * age, -3 * age * (0.5 + hash(i)), s);
      }
      pieces.instanceMatrix.needsUpdate = true;
    }
  };
  return makeModel('holzwand_boss', root, update, [flash], { initial: 'idle' });
}

// =============================================================================================
// Metalltor
// =============================================================================================
const MT = { steel: 0x5a6478, steelHi: 0x8a96ac, dark: 0x2a303e, gold: 0xffc21a, red: 0xb01e2e };
function buildMetalltor(opts = {}) {
  const W = Number(opts.width ?? 4), H = Number(opts.height ?? 4);
  const root = new THREE.Group();
  root.add(mesh(cached(`w2:tor:frame:${W}:${H}`, () => {
    const b = new Build();
    const st = { v: (x, y, z, nx, ny) => mix(MT.dark, MT.steelHi, smoothstep(ny * 0.4 + nx * 0.3 + 0.4)) };
    for (const s of [1, -1]) {
      b.box(0.7, H + 0.7, 0.6, st, { p: [0, (H + 0.7) / 2, s * (W / 2 + 0.3)] }, 0.08, 1);
      for (let y = 0.4; y < H; y += 0.7) b.sphere(0.05, MT.gold, { p: [0.36, y, s * (W / 2 + 0.3)] }, 6, 4);
    }
    b.box(0.8, 0.8, W + 1.4, { v: (x, y, z, nx, ny) => mix(MT.red, 0xd8384a, smoothstep(ny * 0.5 + 0.5)) }, { p: [0, H + 0.4, 0] }, 0.08, 1);
    b.box(0.06, 0.1, W + 1.42, MT.gold, { p: [0.41, H + 0.12, 0] }, 0.02, 1);
    b.box(0.06, 0.1, W + 1.42, MT.gold, { p: [0.41, H + 0.68, 0] }, 0.02, 1);
    for (const [u, v, ru, rv] of [[0, -0.07, 0.17, 0.13], [-0.17, 0.08, 0.06, 0.08], [-0.06, 0.17, 0.06, 0.09], [0.06, 0.17, 0.06, 0.09], [0.17, 0.08, 0.06, 0.08]]) {
      b.sphere(1, MT.gold, { p: [0.42, H + 0.4 + v, u], s: [0.04, rv, ru] }, 12, 6);
    }
    return b.geometry();
  }), vcol(0.4), {}, true));
  const panel = joint();
  panel.add(mesh(cached(`w2:tor:panel:${W}:${H}`, () => {
    const b = new Build();
    b.box(0.2, H, W, { v: (x, y, z, nx, ny) => mix(MT.steel, MT.steelHi, smoothstep(y / H + 0.3) * 0.6) }, { p: [0, H / 2, 0] }, 0.04, 1);
    const nb = Math.max(3, Math.round(W / 0.6));
    for (let i = 0; i < nb; i++) for (const s of [1, -1]) b.box(0.08, H - 0.2, 0.14, MT.dark, { p: [s * 0.12, H / 2, -W / 2 + (i + 0.5) * W / nb] }, 0.03, 1);
    for (const y of [H * 0.3, H * 0.7]) for (const s of [1, -1]) {
      b.box(0.1, 0.22, W - 0.05, MT.steelHi, { p: [s * 0.15, y, 0] }, 0.04, 1);
      for (let z = -W / 2 + 0.3; z < W / 2; z += 0.6) b.sphere(0.045, MT.gold, { p: [s * 0.21, y, z] }, 6, 4);
    }
    // Warnstreifen unten
    for (let i = 0; i < Math.round(W / 0.4); i++) for (const s of [1, -1]) b.box(0.03, 0.3, 0.18, i % 2 ? MT.gold : MT.dark, { p: [s * 0.115, 0.2, -W / 2 + (i + 0.5) * 0.4], r: [0.5, 0, 0] }, 0, 1);
    return b.geometry();
  }), vcol(0.35, {}, 'metalish'), {}, true));
  root.add(panel);
  const clk = new Clock();
  let o = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    o = damp(o, clamp(st.open ?? 0, 0, 1), 10, dt);
    panel.position.y = -o * H;
    panel.position.z = anim === 'shake' ? Math.sin(clk.t * 40) * 0.03 : 0;
    panel.visible = o < 0.99;
  };
  return makeModel('metalltor', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Holz-Silhouette des Barons
// =============================================================================================
function baronOutline() {
  const s = new THREE.Shape();
  s.moveTo(-0.78, 0);
  s.lineTo(-0.82, 0.95);
  s.quadraticCurveTo(-0.8, 1.3, -0.46, 1.36);
  s.quadraticCurveTo(-0.6, 1.42, -0.62, 1.5);                 // Schnurrbart links
  s.quadraticCurveTo(-0.8, 1.45, -0.86, 1.6);
  s.quadraticCurveTo(-0.7, 1.58, -0.56, 1.62);
  s.quadraticCurveTo(-0.62, 1.8, -0.58, 1.9);
  s.lineTo(-0.56, 1.98);
  s.absarc(-0.47, 2.07, 0.16, 3.9, -0.15, true);              // Ohr links
  s.lineTo(-0.36, 2.1);
  s.lineTo(-0.6, 2.13); s.lineTo(-0.6, 2.22); s.lineTo(-0.34, 2.24);   // Krempe links
  s.lineTo(-0.34, 2.82); s.lineTo(0.34, 2.82); s.lineTo(0.34, 2.24);   // Zylinder
  s.lineTo(0.6, 2.22); s.lineTo(0.6, 2.13); s.lineTo(0.36, 2.1);
  s.absarc(0.47, 2.07, 0.16, Math.PI + 0.15, Math.PI - 3.9, true);   // Ohr rechts
  s.lineTo(0.56, 1.98);
  s.quadraticCurveTo(0.62, 1.8, 0.56, 1.62);
  s.quadraticCurveTo(0.7, 1.58, 0.86, 1.6);
  s.quadraticCurveTo(0.8, 1.45, 0.62, 1.5);
  s.quadraticCurveTo(0.6, 1.42, 0.46, 1.36);
  s.quadraticCurveTo(0.8, 1.3, 0.82, 0.95);
  s.lineTo(0.78, 0);
  s.lineTo(-0.78, 0);
  return s;
}
function buildSilhouette() {
  const root = new THREE.Group();
  const tip = joint([-0.45, 0, 0]);                // Kippkante hinten unten (Ende der Fußbretter)
  const board = mesh(cached('w2:silh', () => {
    const b = new Build();
    const g = new THREE.ExtrudeGeometry(baronOutline(), { depth: 0.08, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1, curveSegments: 8 });
    g.translate(0, 0, -0.04);
    g.rotateY(Math.PI / 2);                      // Fläche → Ebene YZ, Dicke entlang X
    b.add(g, (x, y, z, nx) => (nx > 0.8 ? 0x2a1a14 : 0xd8a868), { p: [0, 0.08, 0] });
    // Monokel-Glanz (Goldring) und Hutband als Farbtupfer auf der Silhouette
    b.torus(0.11, 0.022, 0xffc21a, { p: [0.065, 1.88, -0.18], r: [0, Math.PI / 2, 0] }, 6, 18);
    b.box(0.02, 0.1, 0.68, 0x8a1a1a, { p: [0.062, 2.36, 0] }, 0, 1);
    return b.geometry();
  }), vcol(0.7), {}, true);
  tip.add(board);
  board.position.x = 0.45;
  // Fußbretter bleiben stehen (Kippkante = ihr hinteres Ende)
  const feet = mesh(cached('w2:silh:feet', () => {
    const b = new Build();
    for (const s of [1, -1]) b.box(0.9, 0.08, 0.16, 0xc48a4a, { p: [0, 0.04, s * 0.55] }, 0.02, 1);
    b.box(0.12, 0.1, 1.26, 0xa8703a, { p: [-0.4, 0.05, 0] }, 0.02, 1);
    return b.geometry();
  }), vcol(0.7), {}, true);
  root.add(tip, feet);
  const clk = new Clock();
  let f = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    f = damp(f, clamp(st.fall ?? 0, 0, 1), 9, dt);
    const wob = anim === 'wobble' ? Math.sin(clk.t * 14) * 0.06 * Math.max(0, 1 - clk.age / 1.2) : 0;
    tip.rotation.z = smoothstep(f) * Math.PI / 2 + Math.max(0, wob);
    tip.rotation.x = anim === 'wobble' ? Math.sin(clk.t * 9) * 0.03 : 0;
  };
  return makeModel('holz_silhouette', root, update, [], { initial: 'idle' });
}

export const MODELS = {
  panzer_fahrzeug: buildPanzer,
  holzwand_boss: buildHolzwand,
  metalltor: buildMetalltor,
  holz_silhouette: buildSilhouette,
};
