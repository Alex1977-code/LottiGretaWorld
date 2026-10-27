// Dorf- und Hexenturm-Kulisse der Halloween-Welt „Kürbisinsel“ (H-2 Süßes-oder-Saures-Dorf, H-4 Hexenturm, Karte).
// Eigene Gestaltung: schief, gemütlich, warm beleuchtete Fenster. Maßstab Meter, Ursprung = Mitte der Unterseite
// (Ausnahmen genannt), Vorderseite +X; state darf ein String sein. Ohne Kollision. Kulisse: schlichte Materialien (kein
// Spielzeug-Look), vertexgefärbt und backbar (bakeModel); Fenster und Kürbisgesichter unbeleuchtet (Glüh-Material).
//
// hexenturm       Hexenturm aus lila-grauen Bruchsteinen, schief und leicht bauchig, Bogentür, Fenster mit Licht,
//                 Fensterläden und Blumenkästen, spitzes, krummes Schindeldach mit eingerollter Spitze und Goldstern.
//                 opts { part: 'ganz' (Turm + Dach + Fenster + Tür) | 'turm' (nur Turmstück mit Fenstern, ohne Dach) |
//                        'dach' (nur Dach, Ursprung = Mitte der Traufe unten) | 'fenster' (einzelnes Fenster mit Licht,
//                        Läden und Blumenkasten, Ursprung = Mitte der Fensterbank, Fläche nach +X),
//                        height (Turmhöhe ohne Dach: ganz 5, turm 3), radius (1,3), lean (Neigung oben in m, 0,35),
//                        windows (Zahl der Fenster, ganz 3 / turm 1) }
//                 state { lit (bool, Standard true: Fenster leuchten) }
// dorfhaus_nacht  schiefes, gemütliches Fachwerkhaus bei Nacht: Putz in Farbe, dunkle Balken, steiles Schindeldach mit
//                 krummem Schornstein, leuchtende Sprossenfenster mit Läden und Blumenkästen, Rundfenster im Giebel,
//                 Bogentür mit Stufen und zwei leuchtenden Kürbissen auf der Treppe. Tür vorn (+X).
//                 opts { width (Breite z, 3), depth (Tiefe x, 2,6), height (Wandhöhe, 2,4), color: 'lila' | 'gruen' | 'orange' |
//                        'blau', door: true, lean (Schiefe, 0,12) }   state { lit (bool, Standard true) }

import { THREE, TAU, Build, cached, mesh, joint, makeModel, Clock, damp, clamp, mix, smoothstep, glowSprite, puffyStarGeo } from '../lib/kit.js';
import { HW, PK_COLORS, pumpkinGeo, addFace, pkSurf, glow, kulMat, kulisse, ownMat, noToy, hash1, noise3, memo, taperTube } from '../lib/hwGeos.js';
import { kuerbisGeos } from './props_kuerbis_hw.js';

const lit01 = (v) => (v === undefined ? 1 : v === true ? 1 : v === false ? 0 : clamp(Number(v) || 0, 0, 1));
const WOODV = { v: (x, y, z, nx, ny) => mix(0x3a2018, 0x7a4a2a, smoothstep(nx * 0.3 + ny * 0.3 + 0.35 + noise3(x * 6, y * 6, z * 6) * 0.3)) };
const pushT = (b, g, m) => { const c = g.clone(); c.applyMatrix4(m); b.parts.push(c); };
const M = (p, r = [0, 0, 0], s = 1) => new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...(typeof s === 'number' ? [s, s, s] : s)));
const glowWin = { v: (x, y) => mix(0xff9a2a, 0xfff0a0, smoothstep(0.5 + Math.sin(y * 3.1) * 0.3)) };

// =============================================================================================
// Fenster (auch Teil von Turm und Haus)
// =============================================================================================
/** Bogenfenster (Fläche nach +X, Ursprung = Mitte der Fensterbank): { body, glow }. shutter: Farbe der Läden. */
function windowGeos(w = 0.7, h = 0.9, shutter = 0x3a8a5a, box = true) {
  return memo(`hw:win:${w}:${h}:${shutter}:${box}`, () => {
    const b = new Build(), gl = new Build();
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h - w / 2); s.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); s.lineTo(-w / 2, 0);
    const pane = new THREE.ShapeGeometry(s, 10); pane.rotateY(Math.PI / 2);
    gl.add(pane, { v: (x, y) => mix(0xff9a2a, 0xfff2b0, smoothstep(y / h * 0.8 + 0.1)) }, { p: [0.0, 0.02, 0] });
    // Rahmen (Holz) als Röhrchen entlang der Kontur, Sprossenkreuz
    const pts = s.getSpacedPoints(20).map((p) => [0.02, p.y + 0.02, -p.x]);
    b.tube(pts, 0.04, WOODV, null, 32, 5);
    b.box(0.04, h - 0.05, 0.035, 0x2a1810, { p: [0.03, h / 2, 0] }, 0.01, 1);
    b.box(0.04, 0.035, w, 0x2a1810, { p: [0.03, h * 0.45, 0] }, 0.01, 1);
    // Fensterbank und Läden (aufgeklappt, mit Herz-Ausschnitt als dunkle Einlage)
    b.box(0.16, 0.06, w + 0.2, WOODV, { p: [0.06, 0.0, 0] }, 0.02, 1);
    for (const sg of [1, -1]) {
      b.box(0.04, h * 0.85, w * 0.48, { v: (x, y, z, nx) => (Math.floor(y * 9) % 2 ? shutter : mix(shutter, 0xffffff, 0.15)) }, { p: [0.02, h * 0.45, sg * (w / 2 + w * 0.26)], r: [0, sg * 0.25, 0] }, 0.015, 1);
      b.sphere(1, 0x1a0e18, { p: [0.05, h * 0.62, sg * (w / 2 + w * 0.24)], s: [0.01, 0.05, 0.04] }, 8, 6);
    }
    if (box) {
      // Blumenkasten mit Mini-Kürbissen und Blättern
      b.box(0.18, 0.14, w + 0.1, 0x8a4a2a, { p: [0.14, -0.08, 0] }, 0.03, 1);
      for (const z of [-w * 0.3, w * 0.05, w * 0.32]) { b.sphere(1, z > 0 ? 0xff8a1a : 0xffc23a, { p: [0.15, 0.04, z], s: [0.07, 0.055, 0.07] }, 10, 6); b.cyl(0.01, 0.012, 0.04, HW.stemLow, { p: [0.15, 0.1, z] }, 4); }
      for (let i = 0; i < 5; i++) b.sphere(1, i % 2 ? HW.leaf : HW.leafLow, { p: [0.16, 0.02, -w * 0.45 + i * w * 0.22], s: [0.05, 0.03, 0.06] }, 6, 4);
    }
    return { body: b.geometry(), glow: gl.geometry() };
  });
}

// =============================================================================================
// Hexenturm
// =============================================================================================
const stoneCol = (u, v, seed = 0) => {
  const row = Math.floor(v / 0.34);
  const uu = u / 0.55 + (row % 2 ? 0.5 : 0);
  const fu = uu - Math.floor(uu), fv = v / 0.34 - row;
  if (fu < 0.06 || fv < 0.08) return 0x3a3050;
  const h = hash1(Math.floor(uu) * 7.1 + row * 13.3 + seed);
  return mix(0x8a82ac, h > 0.5 ? 0xb8b0d8 : 0x6a6290, Math.abs(h - 0.5) * 1.2);
};
/** Turmkörper (Ursprung Mitte unten), schief (lean) und bauchig; leanAt(y) → x-Versatz. */
function towerBody(H, R, lean, nWin, door) {
  return memo(`hw:tower:${H}:${R}:${lean}:${nWin}:${door}`, () => {
    const b = new Build(), gl = new Build();
    const leanAt = (y) => lean * Math.pow(Math.max(0, y / H), 1.6);   // y kann am Fuß −ε sein (Rundung) → sonst NaN
    const rAt = (y) => R * (1 + 0.06 * Math.sin((y / H) * Math.PI) - 0.08 * (y / H));
    const g = new THREE.CylinderGeometry(1, 1, H, 32, Math.max(6, Math.round(H * 3)), false);
    g.translate(0, H / 2, 0);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      const r = Math.hypot(x, z) > 0.01 ? rAt(y) : 0;
      const n = 1 + (noise3(x * 3, y * 2, z * 3) - 0.5) * 0.04;
      P.setXYZ(i, (r ? x * r * n : 0) + leanAt(y), y, r ? z * r * n : 0);
    }
    g.computeVertexNormals();
    b.add(g, (x, y, z, nx, ny) => (ny > 0.7 ? 0x6a6290 : mix(stoneCol(Math.atan2(z, x - leanAt(y)) * R + 10, y), 0x2a2440, smoothstep(-nx * 0.5 - 0.1) * 0.2)));
    // Steinring als Fuß und unter dem Dach
    b.torus(rAt(0.1) + 0.03, 0.12, { v: (x, y, z, nx, ny) => mix(0x5a5280, 0x9a92bc, smoothstep(ny * 0.5 + 0.5)) }, { p: [leanAt(0.1), 0.12, 0], r: [Math.PI / 2, 0, 0] }, 8, 40);
    b.torus(rAt(H) + 0.05, 0.1, { v: (x, y, z, nx, ny) => mix(0x5a5280, 0x9a92bc, smoothstep(ny * 0.5 + 0.5)) }, { p: [leanAt(H), H - 0.05, 0], r: [Math.PI / 2, 0, 0] }, 8, 40);
    // Fenster rundum (vorn beginnend), Tür vorn unten
    const W = windowGeos(0.62, 0.85, 0x3a8a5a, true);
    const angs = door ? [0.85, -0.55, 0.2, -1.5, 1.7, 2.8] : [0, 0.95, -0.95, 1.9, -1.9, 3.1];
    for (let i = 0; i < nWin; i++) {
      const y = door ? 1.6 + i * ((H - 2.6) / Math.max(1, nWin - 1)) : H * 0.3 + i * Math.min(1.1, (H - 1.6) / Math.max(1, nWin - 1));
      const a = angs[i];
      const yy = Math.min(H - 1.1, y);
      const r = rAt(yy) * 0.99;
      const m = M([Math.cos(a) * r + leanAt(yy), yy, -Math.sin(a) * r], [0, a, 0]);
      pushT(b, W.body, m); pushT(gl, W.glow, m);
    }
    if (door) {
      const ds = new THREE.Shape(); ds.moveTo(-0.45, 0); ds.lineTo(0.45, 0); ds.lineTo(0.45, 0.95); ds.absarc(0, 0.95, 0.45, 0, Math.PI, false); ds.lineTo(-0.45, 0);
      const dg = new THREE.ExtrudeGeometry(ds, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1, curveSegments: 12 });
      dg.translate(0, 0, -0.06); dg.rotateY(Math.PI / 2);
      b.add(dg, (x, y, z) => (Math.floor((z + 3) * 6) % 2 ? 0x7a48c8 : 0x5a2aa8), { p: [rAt(0.5) - 0.02, 0.05, 0] });
      b.sphere(0.05, 0xffc21a, { p: [rAt(0.5) + 0.12, 0.7, -0.25] }, 10, 8);
      b.box(0.4, 0.14, 1.2, { v: (x, y, z, nx, ny) => mix(0x5a5280, 0x9a92bc, smoothstep(ny * 0.5 + 0.5)) }, { p: [rAt(0) + 0.15, 0.07, 0] }, 0.04, 1);
    }
    return { body: b.geometry(), glow: gl.geometry(), top: [leanAt(H), H], rTop: rAt(H) };
  });
}
/** Dach (Ursprung = Mitte der Traufe unten): krummer Kegel mit Schindeln, eingerollte Spitze, Goldstern. */
function roofGeo(R) {
  return cached(`hw:roof:${R}`, () => {
    const b = new Build();
    const Hr = R * 2.3;
    const g = new THREE.ConeGeometry(R * 1.35, Hr, 32, 30, true);
    g.translate(0, Hr / 2, 0);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const y = P.getY(i), t = y / Hr, a = Math.atan2(P.getZ(i), P.getX(i));
      const scal = t < 0.02 ? 1 + Math.max(0, Math.sin(a * 16)) * 0.04 : 1;   // Wellenkante unten
      P.setXYZ(i, P.getX(i) * scal - t * t * R * 0.55, y - (t < 0.02 ? Math.max(0, Math.sin(a * 16)) * 0.06 : 0) - t * t * t * R * 0.25, P.getZ(i) * scal);
    }
    g.computeVertexNormals();
    b.add(g, { v: (x, y, z, nx, ny) => { const row = Math.floor(y / 0.3); const f = y / 0.3 - row; return mix(mix(row % 2 ? 0x4a2a7a : 0x5e3696, 0x24143e, smoothstep((0.3 - f) / 0.3) * 0.85), 0x8a5ac8, smoothstep(nx * 0.4 + ny * 0.3) * 0.4); } });
    // Unterseite (Traufe) dunkel, damit der offene Kegel von unten geschlossen wirkt
    const cap = new THREE.CircleGeometry(R * 1.32, 32); cap.rotateX(Math.PI / 2);
    b.add(cap, 0x1a1028, { p: [0, 0.02, 0] });
    // eingerollte Spitze mit Stern
    const tx = -R * 0.55, ty = Hr - R * 0.25;
    b.add(taperTube([[tx, ty - 0.05, 0], [tx - 0.15, ty + 0.15, 0], [tx - 0.35, ty + 0.12, 0], [tx - 0.4, ty - 0.02, 0], [tx - 0.3, ty - 0.08, 0]], (t) => 0.08 * (1 - t * 0.8), 14, 8), { v: (x, y, z, nx, ny) => mix(0x2e1a52, 0x8a5ac8, smoothstep(ny * 0.5 + 0.5)) });
    b.add(puffyStarGeo(0.22, 0.1, 0.06, 0.04), 0xffd23a, { p: [tx - 0.3, ty + 0.05, 0], r: [0, Math.PI / 2, 0.3] });
    // kleine Gaube mit Licht wird als Teil des Fensters gesetzt (nicht hier)
    return b.geometry();
  });
}
function buildHexenturm(opts = {}) {
  const part = ['ganz', 'turm', 'dach', 'fenster'].includes(opts.part) ? opts.part : 'ganz';
  const R = clamp(Number(opts.radius ?? 1.3), 0.5, 4);
  const root = new THREE.Group();
  const own = [];
  const gm = noToy(ownMat(glow()));
  own.push(gm);
  const halos = [];
  if (part === 'fenster') {
    const W = windowGeos(0.7, 0.95, 0x3a8a5a, true);
    root.add(mesh(W.body, kulMat(0.6), {}, true), mesh(W.glow, gm));
    const h = glowSprite(0xffb050, 1.2, 0.4); h.position.set(0.2, 0.5, 0); halos.push(h); root.add(h);
  } else if (part === 'dach') {
    root.add(mesh(roofGeo(R), kulMat(0.6), {}, true));
  } else {
    const H = clamp(Number(opts.height ?? (part === 'turm' ? 3 : 5)), 1.5, 20);
    const lean = Number(opts.lean ?? 0.35) * (part === 'turm' ? 0.5 : 1);
    const nWin = clamp(Math.round(opts.windows ?? (part === 'turm' ? 1 : 3)), 0, 6);
    const T = towerBody(Math.round(H * 10) / 10, R, lean, nWin, part === 'ganz');
    root.add(mesh(T.body, kulMat(0.75), {}, true), mesh(T.glow, gm));
    if (part === 'ganz') {
      const roof = mesh(roofGeo(R), kulMat(0.6), { p: [T.top[0], T.top[1] - 0.05, 0], r: [0, 0, 0.06] }, true);
      root.add(roof);
    }
  }
  const clk = new Clock();
  let k = 1;
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    k = damp(k, lit01(st.lit), 8, dt);
    gm.color.setScalar(0.12 + k * (0.88 + Math.sin(clk.t * 6) * 0.03));
    for (const h of halos) { h.visible = k > 0.05; h.scale.setScalar(1.2 * k); }
  };
  return makeModel('hexenturm', kulisse(root), update, own);
}

// =============================================================================================
// Dorfhaus bei Nacht
// =============================================================================================
const HOUSE_COLORS = {
  lila: [0xc8b0f0, 0x9a82c8], gruen: [0xb8e0a8, 0x88b878], orange: [0xffd0a0, 0xe0a070], blau: [0xa8c8f0, 0x7898c8],
};
function houseGeos(Wz, Dx, H, color, door, lean) {
  return memo(`hw:house:${Wz}:${Dx}:${H}:${color}:${door}:${lean}`, () => {
    const [pl, plLow] = HOUSE_COLORS[color] ?? HOUSE_COLORS.lila;
    const b = new Build(), gl = new Build();
    const beam = 0x3a2018;
    // Wände (Putz) mit Sockel
    b.box(Dx, H, Wz, { v: (x, y, z, nx, ny) => (y < 0.3 ? 0x6a6290 : mix(plLow, pl, smoothstep(ny * 0.3 + nx * 0.3 + 0.4 + (noise3(x * 2, y * 2, z * 2) - 0.5) * 0.4))) }, { p: [0, H / 2, 0] }, 0.08, 2);
    // Fachwerk vorn (+X): Rahmen, Ständer, Streben
    const fx = Dx / 2 + 0.02;
    for (const y of [0.32, H - 0.08]) b.box(0.06, 0.12, Wz + 0.02, WOODV, { p: [fx, y, 0] }, 0.02, 1);
    for (const z of [-Wz / 2 + 0.06, Wz / 2 - 0.06, -Wz * 0.2, Wz * 0.2]) b.box(0.06, H - 0.3, 0.1, WOODV, { p: [fx, H / 2 + 0.12, z] }, 0.02, 1);
    for (const s of [1, -1]) b.box(0.05, 0.1, Math.hypot(Wz * 0.28, H * 0.4), WOODV, { p: [fx, H * 0.72, s * Wz * 0.36], r: [s * Math.atan2(H * 0.4, Wz * 0.28), 0, 0] }, 0.02, 1);
    // seitliche Ständer (Ecken)
    for (const sx of [1, -1]) for (const sz of [1, -1]) b.box(0.12, H, 0.12, WOODV, { p: [sx * (Dx / 2 - 0.02), H / 2, sz * (Wz / 2 - 0.02)] }, 0.02, 1);
    // Giebelwände (Dreiecke) an den Schmalseiten ±Z, Dach (zwei Schrägen), First, Schornstein
    const rh = Dx * 0.75;   // Dachhöhe
    const tri = new THREE.Shape(); tri.moveTo(-Dx / 2, 0); tri.lineTo(Dx / 2, 0); tri.lineTo(0, rh); tri.closePath();
    for (const s of [1, -1]) {
      const tg = new THREE.ExtrudeGeometry(tri, { depth: 0.1, bevelEnabled: false });
      tg.translate(0, 0, -0.05);
      b.add(tg, (x, y) => mix(plLow, pl, 0.6), { p: [0, H, s * (Wz / 2 - 0.05)] });
    }
    const slope = Math.atan2(rh, Dx / 2), len = Math.hypot(rh, Dx / 2) + 0.35;
    // Schindeln: Reihen entlang der Dachschräge (lokal x der Dachplatte), je Reihe versetzt, leicht wechselnde Töne
    const nxS = Math.round(len / 0.24), nzS = Math.round((Wz + 0.5) / 0.32);
    const shingle = (x, y, z, nx, ny) => { if (ny < 0) return 0x1a1028; const row = Math.floor((x + len / 2) / (len / nxS)); const k = hash1(row * 2.3 + Math.floor((z + (Wz + 0.5) / 2) / ((Wz + 0.5) / nzS)) * 1.7); return mix(row % 2 ? 0x4a3478 : 0x5a4290, k > 0.5 ? 0x8a6ac0 : 0x2e2048, Math.abs(k - 0.5) * 0.6); };
    for (const s of [1, -1]) b.add(new THREE.BoxGeometry(len, 0.12, Wz + 0.5, nxS, 1, nzS), shingle, { p: [s * (Dx / 4 + 0.08), H + rh / 2 - 0.02, 0], r: [0, 0, -s * slope] });
    b.cyl(0.09, 0.09, Wz + 0.55, { v: (x, y, z, nx, ny) => mix(0x24183a, 0x7a5aa8, smoothstep(ny * 0.5 + 0.5)) }, { p: [0, H + rh + 0.04, 0], r: [Math.PI / 2, 0, 0] }, 10);
    b.add(taperTube([[-Dx * 0.2, H + rh * 0.45, Wz * 0.28], [-Dx * 0.22, H + rh + 0.3, Wz * 0.3], [-Dx * 0.15, H + rh + 0.8, Wz * 0.31]], 0.17, 6, 4), (x, y, z) => (Math.floor(y * 6) % 2 ? 0x8a4a3a : 0xa85a42));
    b.cyl(0.24, 0.22, 0.12, 0x5a3a3a, { p: [-Dx * 0.15, H + rh + 0.86, Wz * 0.31] }, 8);
    // Fenster vorn (zwei unten, Rundfenster im Giebel ±Z ist innen beleuchtet)
    const Wn = windowGeos(0.62, 0.8, color === 'gruen' ? 0x8a4ae0 : 0x3a8a5a, true);
    for (const z of door ? [-Wz * 0.33, Wz * 0.33] : [-Wz * 0.22, Wz * 0.22]) { const m = M([fx + 0.01, H * 0.38, z]); pushT(b, Wn.body, m); pushT(gl, Wn.glow, m); }
    for (const s of [1, -1]) {
      b.torus(0.24, 0.05, WOODV, { p: [0, H + rh * 0.38, s * (Wz / 2 + 0.01)] }, 6, 20);
      gl.add(new THREE.CircleGeometry(0.22, 18).rotateY(s > 0 ? 0 : Math.PI), glowWin, { p: [0, H + rh * 0.38, s * (Wz / 2 + 0.005)] });
      b.box(0.04, 0.44, 0.03, 0x2a1810, { p: [0, H + rh * 0.38, s * (Wz / 2 + 0.03)] }, 0.01, 1);
    }
    // Tür mit Stufen und zwei leuchtenden Kürbissen
    if (door) {
      const ds = new THREE.Shape(); ds.moveTo(-0.42, 0); ds.lineTo(0.42, 0); ds.lineTo(0.42, 1.25); ds.absarc(0, 1.25, 0.42, 0, Math.PI, false); ds.lineTo(-0.42, 0);
      const dg = new THREE.ExtrudeGeometry(ds, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1, curveSegments: 12 });
      dg.translate(0, 0, -0.04); dg.rotateY(Math.PI / 2);
      b.add(dg, (x, y, z) => (Math.floor((z + 3) * 7) % 2 ? 0x8a4a2a : 0x7a3e22), { p: [fx + 0.02, 0.32, 0] });
      b.sphere(0.045, 0xffc21a, { p: [fx + 0.1, 0.95, -0.25] }, 10, 8);
      gl.add(new THREE.CircleGeometry(0.12, 14).rotateY(Math.PI / 2), glowWin, { p: [fx + 0.1, 1.45, 0] });
      for (let i = 0; i < 2; i++) b.box(0.36, 0.16, 1.2 - i * 0.15, { v: (x, y, z, nx, ny) => mix(0x5a5280, 0x9a92bc, smoothstep(ny * 0.5 + 0.5)) }, { p: [fx + 0.2 + (1 - i) * 0.3, 0.08 + i * 0.16, 0] }, 0.03, 1);
      const L = kuerbisGeos('rund', 'orange', 'lachen', true, false, true, 0), L2 = kuerbisGeos('flach', 'gelb', 'grinsen', true, false, true, 1);
      for (const [g, p, sc, yaw] of [[L, [fx + 0.55, 0.16, 0.45], 0.32, 0.2], [L2, [fx + 0.25, 0.32, -0.42], 0.26, -0.3]]) { const m = M(p, [0, yaw, 0], sc); pushT(b, g.body, m); pushT(gl, g.glow, m); }
    }
    // Schiefe (Scherung: oben versetzt) und leichtes Verdrehen
    const shear = new THREE.Matrix4().makeShear(0, 0, lean / (H + rh), lean * 0.4 / (H + rh), 0, 0);
    const body = b.geometry(), glowG = gl.geometry();
    body.applyMatrix4(shear); glowG.applyMatrix4(shear);
    return { body, glow: glowG };
  });
}
function buildDorfhaus(opts = {}) {
  const Wz = clamp(Number(opts.width ?? 3), 1.6, 8), Dx = clamp(Number(opts.depth ?? 2.6), 1.6, 8), H = clamp(Number(opts.height ?? 2.4), 1.8, 6);
  const color = HOUSE_COLORS[opts.color] ? opts.color : 'lila';
  const G = houseGeos(Math.round(Wz * 10) / 10, Math.round(Dx * 10) / 10, Math.round(H * 10) / 10, color, opts.door !== false, Math.round(clamp(Number(opts.lean ?? 0.12), -0.5, 0.5) * 100) / 100);
  const root = new THREE.Group();
  const own = [];
  const gm = noToy(ownMat(glow()));
  own.push(gm);
  const body = mesh(G.body, kulMat(0.7), {}, true);
  body.receiveShadow = true;
  root.add(body, mesh(G.glow, gm));
  const clk = new Clock();
  let k = 1;
  const update = (dt, st) => { clk.tick(dt, 'idle'); k = damp(k, lit01(st.lit), 8, dt); gm.color.setScalar(0.12 + k * (0.88 + Math.sin(clk.t * 5) * 0.03)); };
  return makeModel('dorfhaus_nacht', kulisse(root), update, own);
}

export const MODELS = {
  hexenturm: buildHexenturm,
  dorfhaus_nacht: buildDorfhaus,
};
