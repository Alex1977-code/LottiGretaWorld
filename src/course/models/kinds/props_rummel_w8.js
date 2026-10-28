// Kulisse Welt 8, Teil 1: der Brummbär-Rummelplatz um den großen Turm (8-Burg, Weltkarte). Eigene Gestaltung, Kartenqualität,
// ohne Spielzeug-Look (Kulissen-Materialien `toy: false`), backbar (undurchsichtig vertexgefärbt + unbeleuchtete Glühbirnen).
// Maßstab Meter, Vorderseite +X, Ursprung = Fußpunkt (Ausnahmen genannt); state darf ein String sein.
// Wiederverwendet: Brummbär-Fahne 'brummbaer_fahne' (Welt 7), Seilbahn-Gondel 'seilbahn_gondel', Zirkuszelt 'zirkuszelt'.
//
// baron_turm        Baron-Turm: runder Ziegelturm (violettgrau) mit rot-goldenen Bändern, leuchtenden Fenstern auf einer Spirale,
//                   Zinnenkranz und einer riesigen Stein-Büste des Barons (Bärenkopf mit Zylinder und Monokel) als Turmkrone.
//                   opts { part: 'ganz' (Standard) | 'spitze', height (ganz: Gesamthöhe ≈ height, 40) }
//                   ganz: Ursprung = Fußpunkt; spitze: Gipfelplattform Ø 26 m mit Zinnen, Fahnenmasten, Laternen und dem
//                   oberen Schaftstück (10 m) – **Ursprung = Mitte der Plattform-Oberseite** (y = 0, reicht nach unten).
//                   state –
// karussell         Karussell Ø 8 m, ≈6,5 m: Drehscheibe mit rot-weißer Schürze, gestreiftes Zeltdach mit Zackenrand, Glühbirnen,
//                   sechs Pferdchen auf Goldstangen (wippen auf und ab).  state { angle (rad) | speed (rad/s, Standard 0,6) }
// riesenrad_kulisse großes Riesenrad (Ø ≈ 2·radius, Standard radius 11) mit Kabinen, Glühbirnen und Stahlgestell.
//                   opts { radius (11), count (Kabinen, 12) }  state { angle | speed (rad/s, Standard 0,12) }
// achterbahn        Achterbahn-Stücke: Doppelschiene (rot) mit Schwellen auf Stahlstützen.
//                   opts { kind: 'gerade' (Standard: Hügel-Strecke entlang X, length 16, height 5) | 'kurve' (Halbkreis, radius 6) |
//                          'looping' (Looping radius 5 mit Ein- und Ausfahrt) | 'wagen' (Wagen mit Bärengesicht, 2,4 m),
//                          length, height, radius }
//                   gerade/kurve/looping: Ursprung = Fußpunkt; Schienenhöhe ≈ height.  state –
// rummel_bude       Rummel-Bude ≈4 × 3,6 m: Holzstand mit gestreiftem Zackendach, Theke mit Preisen (Teddys, Ballons),
//                   Dosenwurf-Pyramide, Schild mit Stern, Wimpeln und Glühbirnen am Dachrand.
//                   opts { color: 'rot' (Standard) | 'gruen' | 'blau' | 'gelb', seed (1) }
// wimpelkette       Wimpelkette (hängt durch): **Ursprung = linker Aufhängepunkt**, reicht bis x = length.
//                   opts { length (6), sag (Durchhang, 0,6) }  state { wind (0..1, Flattern) }
// gluehbirnenkette  Glühbirnenkette (hängt durch): **Ursprung = linker Aufhängepunkt**, reicht bis x = length.
//                   opts { length (6), sag (0,5) }  state { on (true; aus = matte Birnen), chase (Lauflicht, Standard true) }
// brummbaer_ballon  Luftballon(s) in Form von Baron Brummbärs Kopf (Ohren, Zylinder, Schnurrbart) an Schnüren, an einem Gewicht
//                   festgebunden; Ballons in ≈3 m Höhe.  opts { color: 'rot' (Standard) | 'gelb' | 'blau' | 'lila', count (1..3) }
//                   state { wind (0..1) }  Viele schwebende: createInstanced('brummbaer_ballon', n) (lib/instanced_w8.js).

import {
  THREE, TAU, Build, cached, mesh, joint, makeModel, Clock, damp, clamp, col, mix, smoothstep, lerp, instMesh, setInst, placed,
} from '../lib/kit.js';
import {
  W8, num, kulMat8, kulMat8D, kulMetal8, glow8, gradV, hash1, noise3, taperTube, bearEmblem, pennantShape, bulbGeo, puffyGeo, memo,
} from '../lib/w8Geos.js';

const _v = new THREE.Vector3();

// =============================================================================================
// Baron-Turm
// =============================================================================================
const TW = { brick: 0x6a5a7e, brickHi: 0x9a8ab0, brickLow: 0x3a2e4a, mortar: 0x2a2236, band: W8.red, bandLow: W8.redLow, gold: W8.gold, goldHi: W8.goldHi, win: 0xffd86a, winHi: 0xfff4c0, roof: 0x3a1a5a };
const brickV = (H) => ({ v: (x, y, z, nx, ny) => {
  const a = Math.atan2(z, x), row = Math.floor(y / 0.9);
  const u = (a / TAU) * 40 + (row % 2) * 0.5;
  const joint = (y % 0.9) / 0.9 < 0.08 || (u % 1 + 1) % 1 < 0.05;
  const base = mix(TW.brickLow, mix(TW.brick, TW.brickHi, (noise3(x * 0.4, y * 0.4, z * 0.4) - 0.3) * 0.8), smoothstep(nx * 0.3 + 0.6));
  return joint ? mix(base, TW.mortar, 0.6) : base;
} });
/** Schaft r0 → r1 von y0 bis y1, mit Bändern und Fenstern (glow in gl). */
function shaft(b, gl, y0, y1, r0, r1, seg = 28) {
  const g = new THREE.CylinderGeometry(r1, r0, y1 - y0, seg, Math.max(2, Math.round((y1 - y0) / 0.9)), true);
  g.translate(0, (y0 + y1) / 2, 0);
  b.add(g, brickV(y1));
  const goldV = gradV(W8.goldLow, TW.goldHi, 0.5, 0.5);
  for (let y = y0 + 4; y < y1 - 1; y += 6) {
    const r = lerp(r0, r1, (y - y0) / (y1 - y0));
    b.torus(r + 0.05, 0.22, (x, yy, z, nx, ny) => (ny > 0.3 ? col(TW.band) : col(TW.bandLow)), { p: [0, y, 0], r: [Math.PI / 2, 0, 0] }, 5, seg);
    b.torus(r + 0.12, 0.07, goldV, { p: [0, y + 0.25, 0], r: [Math.PI / 2, 0, 0] }, 4, seg);
  }
  // Fenster auf einer Spirale (Bogenfenster, leuchtend)
  for (let k = 0, y = y0 + 3; y < y1 - 2; k++, y += 2.4) {
    const a = k * 1.1;
    const r = lerp(r0, r1, (y - y0) / (y1 - y0));
    const n = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const M = placed(n.clone().multiplyScalar(r + 0.02).setY(y), n, new THREE.Vector3(1, 1, 1));
    const win = new THREE.Shape(); win.moveTo(-0.45, -0.7); win.lineTo(0.45, -0.7); win.lineTo(0.45, 0.25); win.absarc(0, 0.25, 0.45, 0, Math.PI, false); win.lineTo(-0.45, -0.7);
    const wg = new THREE.ShapeGeometry(win, 6);
    gl.add(wg, { v: (x, yy) => mix(TW.win, TW.winHi, smoothstep(yy + 0.3)) }, M);
    b.add(new THREE.TorusGeometry(0.52, 0.09, 4, 10, Math.PI), TW.gold, M.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.25, 0.02)));
    b.box(1.1, 0.14, 0.25, TW.brickLow, {}, 0, 1);
    b.parts[b.parts.length - 1].applyMatrix4(M.clone().multiply(new THREE.Matrix4().makeTranslation(0, -0.78, 0.08)));
  }
}
function crenels(b, y, r, n = 16, h = 1.4) {
  b.cyl(r + 0.4, r + 0.2, 0.6, brickV(y).v ? brickV(y) : TW.brick, { p: [0, y, 0] }, 32);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    b.box(1.4, h, 0.9, gradV(TW.brickLow, TW.brickHi, 0.5, 0.5), { p: [Math.cos(a) * (r + 0.2), y + 0.3 + h / 2, Math.sin(a) * (r + 0.2)], r: [0, -a + Math.PI / 2, 0] }, 0.08, 1);
  }
}
/** Riesige Stein-Büste des Barons (Turmkrone), Mitte der Unterseite im Ursprung, Höhe ≈ 11·s. */
function bust(b, gl, s = 1) {
  const stone = { v: (x, y, z, nx, ny) => mix(0x8a7aa0, 0xd8cce8, smoothstep(ny * 0.5 + nx * 0.25 + 0.2)) };
  const furS = { v: (x, y, z, nx, ny) => mix(0x7a5a4a, 0xb8907a, smoothstep(ny * 0.5 + nx * 0.25 + 0.2)) };
  b.sphere(1, furS, { p: [0, 4.2 * s, 0], s: [3.6 * s, 3.4 * s, 3.8 * s] }, 28, 20);
  b.sphere(1, { v: (x, y, z, nx, ny) => mix(0xc89a7a, 0xf0d0b0, smoothstep(ny * 0.5 + 0.4)) }, { p: [2.9 * s, 3.4 * s, 0], s: [1.6 * s, 1.35 * s, 2 * s] }, 20, 14);
  b.sphere(1, 0x2a1a1a, { p: [4.4 * s, 4.0 * s, 0], s: [0.7 * s, 0.55 * s, 0.85 * s] }, 14, 10);
  for (const z of [1, -1]) {
    b.sphere(1, furS, { p: [-0.2 * s, 7.0 * s, z * 2.8 * s], s: [1.1 * s, 1.2 * s, 1.0 * s] }, 14, 10);
    // Augen (Stein mit dunklen Pupillen), Brauen, Schnurrbart
    b.sphere(1, 0xfff6ee, { p: [3.2 * s, 5.2 * s, z * 1.3 * s], s: [0.5 * s, 0.75 * s, 0.6 * s] }, 14, 10);
    b.sphere(1, 0x1a1020, { p: [3.62 * s, 5.1 * s, z * 1.25 * s], s: [0.18 * s, 0.38 * s, 0.32 * s] }, 10, 8);
    b.box(0.5 * s, 0.45 * s, 1.9 * s, 0x2a1a1a, { p: [3.3 * s, 6.1 * s, z * 1.3 * s], r: [-z * 0.4, -z * 0.3, 0], order: 'YXZ' }, 0.15 * s, 1);
    b.tube([[4.6 * s, 3.3 * s, z * 0.2 * s], [4.7 * s, 3.0 * s, z * 1.3 * s], [4.3 * s, 3.1 * s, z * 2.4 * s], [4.0 * s, 3.8 * s, z * 2.8 * s], [4.2 * s, 4.3 * s, z * 2.5 * s]], 0.32 * s, 0x2a1a10, null, 16, 6);
  }
  // Monokel (Gold) am rechten Auge mit leuchtendem Glas
  b.torus(0.95 * s, 0.14 * s, TW.gold, { p: [3.55 * s, 5.2 * s, 1.3 * s], r: [0, Math.PI / 2 - 0.4, 0] }, 6, 24);
  gl.add(new THREE.CircleGeometry(0.85 * s, 20), 0xbfe8ff, { p: [3.58 * s, 5.2 * s, 1.3 * s], r: [0, Math.PI / 2 - 0.4, 0] });
  // Zylinder
  b.cyl(4.4 * s, 4.4 * s, 0.35 * s, 0x1e1a26, { p: [0, 7.5 * s, 0] }, 32);
  b.cyl(2.8 * s, 2.6 * s, 4.8 * s, { v: (x, y, z, nx) => mix(0x1e1a26, 0x4a4458, smoothstep(nx * 0.5 + 0.3)) }, { p: [0, 10.0 * s, 0] }, 28);
  b.cyl(2.85 * s, 2.85 * s, 0.9 * s, TW.band, { p: [0, 8.2 * s, 0] }, 28);
  b.sphere(0.5 * s, TW.gold, { p: [2.85 * s, 8.2 * s, 0] }, 10, 8);
  void stone;
}
function turmGeo(H) {
  return memo(`w8:turm:ganz:${H}`, () => {
    const b = new Build(), gl = new Build();
    const base = 5, top = H - 13;
    // Sockel mit Tor
    b.cyl(9, 9.5, 3, gradV(TW.brickLow, TW.brickHi, 0.4, 0.5), { p: [0, 1.5, 0] }, 12);
    b.cyl(9.2, 9.2, 0.4, TW.gold, { p: [0, 3.1, 0] }, 12);
    gl.add(new THREE.ShapeGeometry((() => { const s = new THREE.Shape(); s.moveTo(-1.6, 0); s.lineTo(1.6, 0); s.lineTo(1.6, 2.6); s.absarc(0, 2.6, 1.6, 0, Math.PI, false); s.lineTo(-1.6, 0); return s; })(), 8), { v: (x, y) => mix(0xff9a3a, 0xffe08a, smoothstep(y / 4)) }, { p: [9.3, 0.05, 0], r: [0, Math.PI / 2, 0] });
    shaft(b, gl, 3, base + top * 0.55, 7, 6);
    b.cyl(6.5, 6.2, 1.2, gradV(TW.brickLow, TW.brickHi), { p: [0, base + top * 0.55, 0] }, 28);
    shaft(b, gl, base + top * 0.55, base + top, 6, 5);
    crenels(b, base + top, 5.2, 18, 1.4);
    const bb = new Build(), bg = new Build();
    bust(bb, bg, 0.9);
    const bgeo = bb.geometry(); bgeo.translate(0, base + top + 0.6, 0); b.parts.push(bgeo);
    const ggeo = bg.geometry(); ggeo.translate(0, base + top + 0.6, 0); gl.parts.push(ggeo);
    // Fahnenmast auf dem Zylinder
    b.cyl(0.12, 0.12, 4, TW.gold, { p: [0, base + top + 0.6 + 12.5 * 0.9 + 2, 0] }, 8);
    b.add(puffyGeo(pennantFlag(), 0.05, 0.02, 2, 1), { v: (x, y) => mix(W8.redLow, W8.red, smoothstep(y)) }, { p: [0.1, base + top + 0.6 + 12.5 * 0.9 + 3.2, 0], r: [0, 0, 0] });
    return { body: b.geometry(), glow: gl.geometry() };
  });
}
function pennantFlag() { const s = new THREE.Shape(); s.moveTo(0, 0.6); s.lineTo(2.2, 0.15); s.lineTo(0, -0.4); s.lineTo(0, 0.6); return s; }
function spitzeGeo() {
  return memo('w8:turm:spitze', () => {
    const b = new Build(), gl = new Build();
    const R = 13;
    // Plattform (Oberseite y = 0) mit Fliesen-Ringen, Rand und Zinnen, Schaft darunter
    b.cyl(R, R, 0.6, (x, y, z, nx, ny) => (ny > 0.5 ? (Math.floor(Math.hypot(x, z) / 1.6) % 2 ? col(0xb8aac8) : col(0x9a8cb0)) : col(TW.brickLow)), { p: [0, -0.3, 0] }, 48);
    b.cyl(R + 0.6, R - 0.5, 1.6, gradV(TW.brickLow, TW.brick, 0.5, 0.5), { p: [0, -1.4, 0] }, 48);
    b.torus(R + 0.4, 0.25, TW.band, { p: [0, -0.8, 0], r: [Math.PI / 2, 0, 0] }, 5, 48);
    for (let i = 0; i < 28; i++) { const a = (i / 28) * TAU; b.box(1.5, 1.1, 0.7, gradV(TW.brickLow, TW.brickHi, 0.5, 0.5), { p: [Math.cos(a) * (R + 0.1), 0.55, Math.sin(a) * (R + 0.1)], r: [0, -a + Math.PI / 2, 0] }, 0.08, 1); }
    const g = new THREE.CylinderGeometry(R - 1, R - 2, 10, 32, 10, true); g.translate(0, -7.2, 0);
    b.add(g, brickV(0));
    // Fahnenmasten und Laternen an vier Ecken, Wappen am Rand
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + Math.PI / 4, x = Math.cos(a) * (R - 1.2), z = Math.sin(a) * (R - 1.2);
      b.cyl(0.15, 0.2, 7, TW.gold, { p: [x, 3.5, z] }, 8);
      b.add(puffyGeo(pennantFlag(), 0.05, 0.02, 2, 1), { v: (px, y) => mix(W8.redLow, W8.red, smoothstep(y)) }, { p: [x + 0.1, 6.2, z], r: [0, -a, 0] });
      b.cyl(0.4, 0.5, 0.3, 0x2a2236, { p: [x, 7.1, z] }, 8);
      gl.sphere(0.35, TW.winHi, { p: [x, 7.5, z] }, 10, 8);
      bearEmblem(b, { p: [Math.cos(a + Math.PI / 4) * (R + 0.65), -1.4, Math.sin(a + Math.PI / 4) * (R + 0.65)], r: [0, Math.PI / 2 - (a + Math.PI / 4), 0] }, 0.9);
    }
    return { body: b.geometry(), glow: gl.geometry() };
  });
}
function buildTurm(opts = {}) {
  const root = new THREE.Group();
  const spitze = opts.part === 'spitze';
  const G = spitze ? spitzeGeo() : turmGeo(clamp(Math.round(num(opts.height, 40)), 25, 120));
  root.add(mesh(G.body, kulMat8(0.8), {}, true), mesh(G.glow, glow8()));
  root.children[0].receiveShadow = true;
  return makeModel('baron_turm', root, () => {}, [], { initial: 'idle' });
}

// =============================================================================================
// Karussell
// =============================================================================================
function karussellGeo() {
  return cached('w8:karussell', () => {
    const b = new Build();
    const R = 4;
    // Drehscheibe mit Schürze (rot-weiß), Boden aus Holzdielen
    b.cyl(R, R, 0.5, (x, y, z, nx, ny) => (ny > 0.5 ? (Math.floor(Math.hypot(x, z) * 2) % 2 ? col(W8.woodHi) : col(W8.wood)) : (Math.floor(((Math.atan2(z, x) / TAU) + 1) * 24) % 2 ? col(W8.red) : col(W8.white))), { p: [0, 0.45, 0] }, 36);
    b.torus(R, 0.08, W8.gold, { p: [0, 0.7, 0], r: [Math.PI / 2, 0, 0] }, 5, 36);
    // Mittelsäule (Spiegel-Zylinder mit Gold)
    b.cyl(0.9, 0.9, 4.6, { v: (x, y, z, nx) => mix(W8.purple, W8.purpleHi, smoothstep(nx * 0.5 + 0.4)) }, { p: [0, 3.0, 0] }, 18);
    for (const y of [0.8, 2.9, 5.2]) b.torus(0.92, 0.09, W8.gold, { p: [0, y, 0], r: [Math.PI / 2, 0, 0] }, 5, 18);
    // Dach: gestreifter Kegel, Zackenrand, Kugel mit Wimpel
    const roof = new THREE.ConeGeometry(R + 0.6, 1.8, 24, 1, true); roof.translate(0, 6.2, 0);
    b.add(roof, (x, y, z) => (Math.floor(((Math.atan2(z, x) / TAU) + 1) * 12) % 2 ? col(W8.red) : col(W8.yellow)));
    const n = 24;
    for (let i = 0; i < n; i++) { const a = ((i + 0.5) / n) * TAU; b.add(new THREE.SphereGeometry(0.55, 6, 3, 0, TAU, Math.PI / 2, Math.PI / 2), i % 2 ? W8.red : W8.yellow, { p: [Math.cos(a) * (R + 0.45), 5.3, Math.sin(a) * (R + 0.45)], s: [1, 0.9, 0.6], r: [0, -a + Math.PI / 2, 0] }); }
    b.cyl(R + 0.6, R + 0.6, 0.3, W8.gold, { p: [0, 5.3, 0] }, 24, true);
    b.sphere(0.45, W8.gold, { p: [0, 7.25, 0] }, 12, 8);
    b.cyl(0.05, 0.05, 1.2, W8.gold, { p: [0, 7.9, 0] }, 6);
    b.add(puffyGeo(pennantFlag(), 0.04, 0.01, 2, 1), W8.purple, { p: [0, 8.1, 0], s: 0.5 });
    // Stangen (Gold) zu den Pferdchen
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; b.cyl(0.07, 0.07, 4.6, { v: (x, y) => (Math.floor(y * 4) % 2 ? col(W8.gold) : col(W8.goldHi)) }, { p: [Math.cos(a) * 2.8, 3.0, Math.sin(a) * 2.8] }, 8); }
    return b.geometry();
  });
}
const horseGeo = () => cached('w8:pferd2', () => {
  const b = new Build();
  const body = { v: (x, y, z, nx, ny) => mix(0xd8d8ec, 0xffffff, smoothstep(ny * 0.5 + 0.45)) };
  const mane = { v: (x, y, z, nx, ny) => mix(0xd84a8a, 0xff9ac8, smoothstep(ny * 0.5 + 0.5)) };
  b.sphere(1, body, { s: [0.55, 0.27, 0.24] }, 10, 7);
  b.sphere(1, body, { p: [0.33, 0.06, 0], s: [0.26, 0.25, 0.22] }, 8, 6);
  b.capsule(0.13, 0.28, body, { p: [0.5, 0.34, 0], r: [0, 0, -0.55] }, 1, 7);
  b.sphere(1, body, { p: [0.72, 0.56, 0], s: [0.25, 0.15, 0.14], r: [0, 0, -0.55] }, 9, 6);
  b.sphere(1, 0xffd8e8, { p: [0.88, 0.45, 0], s: [0.11, 0.1, 0.11] }, 8, 6);
  for (const z of [1, -1]) {
    b.cone(0.045, 0.14, body, { p: [0.62, 0.76, z * 0.07], r: [z * 0.2, 0, 0.3] }, 6);
    b.sphere(1, 0x1a1020, { p: [0.8, 0.62, z * 0.105], s: [0.03, 0.04, 0.02] }, 6, 4);
  }
  for (let i = 0; i < 5; i++) b.sphere(0.075 - i * 0.004, mane, { p: [0.36 + i * 0.07, 0.42 + i * 0.075, 0], s: [0.8, 1, 0.7] }, 6, 4);
  b.tube([[-0.5, 0.1, 0], [-0.68, 0.02, 0], [-0.78, -0.2, 0], [-0.72, -0.4, 0]], 0.07, mane, null, 8, 5);
  b.box(0.4, 0.06, 0.5, 0xe8283a, { p: [0.0, 0.27, 0] }, 0.03, 1);
  b.box(0.42, 0.03, 0.52, W8.gold, { p: [0.0, 0.24, 0] }, 0.01, 1);
  b.tube([[0.86, 0.5, 0.12], [0.72, 0.5, 0.15], [0.58, 0.38, 0.14]], 0.015, W8.gold, null, 6, 3);
  // Galopp: Vorderbeine angewinkelt nach vorn, Hinterbeine nach hinten
  for (const z of [1, -1]) {
    b.capsule(0.055, 0.22, body, { p: [0.42, -0.2, z * 0.11], r: [0, 0, 1.0] }, 1, 5);
    b.capsule(0.05, 0.18, body, { p: [0.58, -0.3, z * 0.11], r: [0, 0, -0.4] }, 1, 5);
    b.sphere(0.06, W8.gold, { p: [0.63, -0.42, z * 0.11] }, 6, 4);
    b.capsule(0.06, 0.32, body, { p: [-0.42, -0.3, z * 0.11], r: [0, 0, -0.5] }, 1, 5);
    b.sphere(0.065, W8.gold, { p: [-0.52, -0.5, z * 0.11] }, 6, 4);
  }
  return b.geometry();
});
const HORSE_TINTS = [0xffffff, 0xffd8ec, 0xd8f4ff, 0xe8dcff, 0xdcffe8, 0xfff0c8];
function buildKarussell() {
  const root = new THREE.Group();
  const rot = joint();
  rot.add(mesh(karussellGeo(), kulMat8(0.55), {}, true));
  const horses = instMesh(horseGeo(), kulMat8(0.55), 6, 5, 2);
  horses.castShadow = true;
  for (let i = 0; i < 6; i++) horses.setColorAt(i, new THREE.Color(HORSE_TINTS[i]));
  const NB = 16;
  const bulbs = instMesh(bulbGeo(0.1, true), glow8(), NB, 5.5, 5);
  for (let i = 0; i < NB; i++) { const a = (i / NB) * TAU; setInst(bulbs, i, Math.cos(a) * 4.62, 5.12, Math.sin(a) * 4.62); }
  bulbs.instanceMatrix.needsUpdate = true;
  rot.add(horses, bulbs);
  root.add(rot);
  let ang = 0;
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    if (st.angle !== undefined) ang = num(st.angle, 0); else ang += dt * num(st.speed, 0.6);
    rot.rotation.y = ang;
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; setInst(horses, i, Math.cos(a) * 2.8, 2.2 + Math.sin(ang * 3 + i * 2) * 0.35, Math.sin(a) * 2.8, 0, -a - Math.PI / 2, 0); }
    horses.instanceMatrix.needsUpdate = true;
  };
  return makeModel('karussell', root, update, [horses, bulbs], { initial: 'idle' });
}

// =============================================================================================
// Riesenrad (Kulisse)
// =============================================================================================
function bigWheelGeo(R, n) {
  return cached(`w8:bigwheel:${R}:${n}`, () => {
    const b = new Build();
    const D = 2.2;
    for (const z of [D / 2, -D / 2]) {
      b.torus(R, 0.22, gradV(W8.redLow, W8.redHi, 0.5, 0.5), { p: [0, 0, z] }, 6, 64);
      b.torus(R * 0.62, 0.14, W8.white, { p: [0, 0, z] }, 5, 48);
      for (let i = 0; i < n * 2; i++) {
        const a = (i / (n * 2)) * TAU;
        const g = new THREE.CylinderGeometry(0.07, 0.1, R, 5, 1); g.translate(0, R / 2, 0);
        b.add(g, i % 2 ? W8.white : W8.gold, { p: [0, 0, z], r: [0, 0, a - Math.PI / 2] });
      }
    }
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU; b.cyl(0.12, 0.12, D + 0.4, W8.gold, { p: [Math.cos(a) * R, Math.sin(a) * R, 0], r: [Math.PI / 2, 0, 0] }, 6); }
    b.cyl(1.1, 1.1, D + 0.6, gradV(W8.goldLow, W8.goldHi), { r: [Math.PI / 2, 0, 0] }, 20);
    for (const s of [1, -1]) bearEmblem(b, { p: [0, 0, s * (D / 2 + 0.32)], r: [0, s > 0 ? 0 : Math.PI, 0] }, 1.0);
    return b.geometry();
  });
}
const CABIN_COLORS = [W8.red, W8.teal, W8.yellow, W8.purple, W8.pink, W8.blue];
const cabinGeo = () => cached('w8:cabin', () => {
  const b = new Build();
  b.cyl(0.05, 0.05, 1.0, W8.gold, { p: [0, -0.5, 0] }, 6);
  b.add(new THREE.SphereGeometry(0.85, 10, 5, 0, TAU, 0, Math.PI / 2), W8.white, { p: [0, -1.05, 0], s: [1, 0.55, 1] });
  b.cyl(0.85, 0.75, 1.1, { v: (x, y, z, nx) => (Math.abs(nx) > 0.6 && y > -1.85 + 1.3 ? col(0x2a3a5a) : col(0xffffff)) }, { p: [0, -1.6, 0] }, 10);
  b.add(new THREE.SphereGeometry(0.75, 10, 4, 0, TAU, Math.PI / 2, Math.PI / 2), 0xffffff, { p: [0, -2.15, 0], s: [1, 0.4, 1] });
  return b.geometry();
});
function standBigGeo(R) {
  return cached(`w8:bigstand:${R}`, () => {
    const b = new Build();
    const H = R + 2.5;
    for (const z of [1.9, -1.9]) {
      for (const sx of [1, -1]) {
        const top = new THREE.Vector3(0, H, z), foot = new THREE.Vector3(sx * R * 0.55, 0, z * 1.4);
        const g = new THREE.CylinderGeometry(0.25, 0.4, top.distanceTo(foot), 6, 1);
        b.add(g, gradV(0x5a6078, 0xc8cce0), new THREE.Matrix4().compose(top.clone().add(foot).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), foot.clone().sub(top).normalize()), new THREE.Vector3(1, 1, 1)));
      }
      b.cyl(0.15, 0.15, R * 0.7, W8.gold, { p: [0, H * 0.4, z * 1.25], r: [0, 0, Math.PI / 2] }, 6);
    }
    b.cyl(0.4, 0.4, 4.4, 0x8a90a8, { p: [0, H, 0], r: [Math.PI / 2, 0, 0] }, 10);
    // Kassenhäuschen am Fuß
    b.box(2.2, 2.2, 1.8, (x, y, z) => (y > 1.9 ? col(W8.red) : col(W8.cream)), { p: [R * 0.3, 1.1, 3.4] }, 0.1, 1);
    b.cone(1.6, 0.9, W8.red, { p: [R * 0.3, 2.6, 3.4] }, 4);
    return b.geometry();
  });
}
function buildRiesenradKulisse(opts = {}) {
  const R = clamp(num(opts.radius, 11), 5, 30), n = clamp(Math.round(num(opts.count, 12)), 6, 24);
  const H = R + 2.5;
  const root = new THREE.Group();
  const wheelJ = joint([0, H, 0]);
  wheelJ.add(mesh(bigWheelGeo(R, n), kulMat8(0.45), {}, true));
  const nb = n * 2;
  const bulbs = instMesh(bulbGeo(0.18, true), glow8(), nb, R + 1, 0);
  for (let i = 0; i < nb; i++) { const a = (i / nb) * TAU; setInst(bulbs, i, Math.cos(a) * R, Math.sin(a) * R, i % 2 ? 1.35 : -1.35); }
  bulbs.instanceMatrix.needsUpdate = true;
  wheelJ.add(bulbs);
  const cabMat = kulMat8(0.45);
  const cabins = instMesh(cabinGeo(), cabMat, n, R + 3, H);
  for (let i = 0; i < n; i++) cabins.setColorAt(i, new THREE.Color(CABIN_COLORS[i % CABIN_COLORS.length]));
  cabins.castShadow = true;
  root.add(wheelJ, cabins, mesh(standBigGeo(R), kulMat8(0.5), {}, true));
  let ang = 0;
  const update = (dt, st) => {
    if (st.angle !== undefined) ang = num(st.angle, 0); else ang += dt * num(st.speed, 0.12);
    wheelJ.rotation.z = ang;
    for (let i = 0; i < n; i++) { const a = ang + (i / n) * TAU; setInst(cabins, i, Math.cos(a) * R, H + Math.sin(a) * R, 0); }
    cabins.instanceMatrix.needsUpdate = true;
  };
  return makeModel('riesenrad_kulisse', root, update, [bulbs, cabins], { initial: 'idle' });
}

// =============================================================================================
// Achterbahn
// =============================================================================================
/** Schiene entlang Punkten pts ([x,y,z], Richtung ~ Kurve), Querschwellen, Stützen bis zum Boden. */
function trackGeo(key, pts, loop = false) {
  return cached(`w8:track:${key}`, () => {
    const b = new Build();
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), loop);
    const N = Math.max(24, Math.round(curve.getLength() * 1.6));
    // Seitenvektor per Paralleltransport (stetig auch durch den Looping)
    const P = [], T = [], SV = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, tng = curve.getTangentAt(u);
      let sv;
      if (i === 0) { sv = new THREE.Vector3().crossVectors(tng, new THREE.Vector3(0, 1, 0)); if (sv.lengthSq() < 0.01) sv.set(0, 0, 1); }
      else sv = SV[i - 1].clone().addScaledVector(tng, -SV[i - 1].dot(tng));
      sv.normalize();
      P.push(curve.getPointAt(u)); T.push(tng); SV.push(sv);
    }
    const railV = gradV(W8.redLow, W8.redHi, 0.5, 0.5);
    for (const side of [0.55, -0.55]) b.add(taperTube(P.map((p, i) => p.clone().addScaledVector(SV[i], side).toArray()), 0.09, N * 2, 6), railV);
    for (let i = 0; i <= N; i++) {
      const p = P[i], tng = T[i], sideV = SV[i];
      const up = new THREE.Vector3().crossVectors(sideV, tng).normalize();
      if (up.y < -0.2 && i === 0) up.negate();
      const M = new THREE.Matrix4().makeBasis(tng, up, sideV).setPosition(p.clone().addScaledVector(up, -0.08));
      b.add(new THREE.BoxGeometry(0.2, 0.1, 1.4), i % 2 ? W8.woodHi : W8.wood, M);
      // Stützen unter flachen Stücken; am Looping zwei Pfeiler an den Seiten
      if ((i % 3 === 0 && up.y > 0.6 && p.y > 0.5) || (Math.abs(up.y) < 0.15 && i % 4 === 0 && p.y > 1.5)) {
        const h = p.y - 0.1;
        b.cyl(0.11, 0.16, h, gradV(0x5a6078, 0xc8cce0), { p: [p.x, h / 2, p.z + (Math.abs(up.y) < 0.15 ? Math.sign(sideV.z || 1) * 0.9 : 0)] }, 6);
        b.cyl(0.35, 0.4, 0.2, 0x5a6078, { p: [p.x, 0.1, p.z] }, 8);
      }
    }
    return b.geometry();
  });
}
function wagenGeo() {
  return cached('w8:coaster:wagen', () => {
    const b = new Build();
    const red = gradV(W8.redLow, W8.redHi, 0.5, 0.5);
    b.box(2.2, 0.7, 1.4, red, { p: [0, 0.65, 0] }, 0.25, 2);
    b.box(0.9, 0.5, 1.2, 0x5a1a2a, { p: [-0.35, 0.95, 0] }, 0.1, 1);
    b.box(2.3, 0.1, 1.5, W8.gold, { p: [0, 0.35, 0] }, 0.04, 1);
    // Bärengesicht vorn: Ohren, Augen, Schnauze, Schnurrbart
    b.sphere(1, red, { p: [1.15, 0.8, 0], s: [0.25, 0.42, 0.62] }, 16, 10);
    for (const z of [1, -1]) {
      b.sphere(0.2, red, { p: [0.95, 1.25, z * 0.45] }, 10, 8);
      b.sphere(1, 0xffffff, { p: [1.33, 0.95, z * 0.22], s: [0.06, 0.12, 0.1] }, 10, 8);
      b.sphere(1, 0x1a1020, { p: [1.37, 0.93, z * 0.22], s: [0.03, 0.07, 0.06] }, 8, 6);
      b.tube([[1.4, 0.68, z * 0.05], [1.42, 0.62, z * 0.22], [1.36, 0.68, z * 0.36]], 0.04, 0x2a1a10, null, 8, 5);
    }
    b.sphere(1, 0x2a1a1a, { p: [1.42, 0.76, 0], s: [0.06, 0.06, 0.09] }, 8, 6);
    for (const [x, z] of [[0.7, 0.55], [0.7, -0.55], [-0.7, 0.55], [-0.7, -0.55]]) b.cyl(0.18, 0.18, 0.12, 0x2a2a34, { p: [x, 0.2, z], r: [Math.PI / 2, 0, 0] }, 12);
    // Haltebügel
    b.tube([[-0.1, 0.95, 0.6], [0.1, 1.35, 0.4], [0.1, 1.35, -0.4], [-0.1, 0.95, -0.6]], 0.05, W8.gold, null, 12, 5);
    return b.geometry();
  });
}
function buildAchterbahn(opts = {}) {
  const kind = ['kurve', 'looping', 'wagen'].includes(opts.kind) ? opts.kind : 'gerade';
  const root = new THREE.Group();
  let g;
  if (kind === 'wagen') g = wagenGeo();
  else if (kind === 'kurve') {
    const R = clamp(num(opts.radius, 6), 2, 30), h = clamp(num(opts.height, 4), 1, 30);
    const pts = []; for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI - Math.PI / 2; pts.push([Math.cos(a) * R, h + Math.sin(i / 12 * Math.PI) * 0.8, Math.sin(a) * R]); }
    g = trackGeo(`kurve:${R}:${h}`, pts);
  } else if (kind === 'looping') {
    const R = clamp(num(opts.radius, 5), 2, 20), h = clamp(num(opts.height, 1.5), 0.5, 20);
    const pts = [[-R * 2.2, h, 0.6], [-R, h, 0.5]];
    for (let i = 0; i <= 16; i++) { const a = -Math.PI / 2 + (i / 16) * TAU; pts.push([Math.cos(a) * R * 0.95, h + R + Math.sin(a) * R, 0.5 - (i / 16) * 1.0]); }
    pts.push([R, h, -0.5], [R * 2.2, h, -0.6]);
    g = trackGeo(`looping:${R}:${h}`, pts);
  } else {
    const Lg = clamp(num(opts.length, 16), 4, 60), h = clamp(num(opts.height, 5), 1, 30);
    const pts = []; for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push([(u - 0.5) * Lg, h * (0.45 + 0.55 * Math.sin(u * Math.PI)), 0]); }
    g = trackGeo(`gerade:${Lg}:${h}`, pts);
  }
  root.add(mesh(g, kulMat8(0.45), {}, true));
  return makeModel('achterbahn', root, () => {}, [], { initial: 'idle' });
}

// =============================================================================================
// Rummel-Bude
// =============================================================================================
const BUDE_COLORS = { rot: [W8.red, W8.white], gruen: [W8.green, W8.white], blau: [W8.blue, W8.yellow], gelb: [W8.yellow, W8.red] };
function budeGeo(color, seed) {
  return memo(`w8:bude:${color}:${seed}`, () => {
    const [c1, c2] = BUDE_COLORS[color] ?? BUDE_COLORS.rot;
    const b = new Build(), gl = new Build();
    const W = 4, D = 2.4, H = 2.6;
    const woodV = { v: (x, y, z, nx, ny) => mix(W8.woodLow, W8.woodHi, smoothstep(ny * 0.3 + 0.5 + Math.sin(y * 18) * 0.1)) };
    // Rückwand, Seiten, Theke
    b.box(0.15, H, W, woodV, { p: [-D / 2, H / 2, 0] }, 0.03, 1);
    for (const s of [1, -1]) b.box(D, H, 0.15, woodV, { p: [0, H / 2, s * W / 2] }, 0.03, 1);
    b.box(0.5, 1.1, W, (x, y, z) => (Math.floor((z + 10) * 2.5) % 2 ? col(c1) : col(c2)), { p: [D / 2 - 0.25, 0.55, 0] }, 0.04, 1);
    b.box(0.7, 0.1, W + 0.2, W8.woodHi, { p: [D / 2 - 0.2, 1.15, 0] }, 0.03, 1);
    // gestreiftes Dach (schräg nach vorn) mit Zackenrand
    const roof = new THREE.BoxGeometry(D + 1.0, 0.12, W + 0.5, 8, 1, 16);
    b.add(roof, (x, y, z) => (Math.floor((z + 10) * 2) % 2 ? col(c1) : col(c2)), { p: [0.3, H + 0.35, 0], r: [0, 0, -0.25] });
    for (let i = 0; i < 10; i++) { const z = -W / 2 - 0.15 + (i + 0.5) * (W + 0.3) / 10; b.add(new THREE.SphereGeometry(0.22, 8, 6, 0, TAU, Math.PI / 2, Math.PI / 2), i % 2 ? c1 : c2, { p: [D / 2 + 0.75, H + 0.18, z], s: [0.5, 1, 1] }); }
    // Schild mit Stern
    b.box(0.12, 0.9, 2.4, W8.purple, { p: [-D / 2 + 0.1, H + 1.0, 0] }, 0.05, 1);
    b.box(0.13, 1.0, 2.5, W8.gold, { p: [-D / 2 + 0.08, H + 1.0, 0] }, 0.05, 1);
    gl.extrude((() => { const s = new THREE.Shape(); for (let i = 0; i <= 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.16 : 0.36; if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r); else s.lineTo(Math.cos(a) * r, Math.sin(a) * r); } return s; })(), 0.04, W8.yellow, { p: [-D / 2 + 0.2, H + 1.0, 0], r: [0, Math.PI / 2, 0] }, 0, 1);
    // Preise: Teddys auf der Theke/im Regal, Dosen-Pyramide
    for (let i = 0; i < 3; i++) {
      const z = -1.2 + i * 1.2 + (hash1(seed + i) - 0.5) * 0.2, tc = [0xc8884a, 0xff8ac8, 0x8ac8ff][(i + seed) % 3];
      b.sphere(0.24, tc, { p: [-D / 2 + 0.4, 1.9, z] }, 10, 8);
      b.sphere(0.18, tc, { p: [-D / 2 + 0.45, 2.27, z] }, 10, 8);
      for (const s of [1, -1]) b.sphere(0.07, tc, { p: [-D / 2 + 0.45, 2.42, z + s * 0.13] }, 6, 4);
      b.sphere(0.04, 0x1a1020, { p: [-D / 2 + 0.62, 2.3, z] }, 6, 4);
    }
    b.box(0.6, 0.08, W - 0.4, woodV, { p: [-D / 2 + 0.35, 1.62, 0] }, 0.02, 1);
    for (let r = 0; r < 3; r++) for (let k = 0; k <= 2 - r; k++) b.cyl(0.11, 0.11, 0.26, k % 2 ? 0xc8ccd8 : W8.red, { p: [D / 2 - 0.25, 1.33 + r * 0.27, (k - (2 - r) / 2) * 0.24 + 1.0] }, 10);
    // Wimpel über der Theke
    for (let i = 0; i < 7; i++) b.extrude(pennantShape(0.35, 0.45), 0.02, [W8.yellow, W8.teal, W8.pink, W8.purple][i % 4], { p: [D / 2 + 0.6, H + 0.06, -W / 2 + 0.3 + i * (W - 0.6) / 6], r: [0, Math.PI / 2, 0] }, 0, 1);
    // Glühbirnen am Dachrand
    for (let i = 0; i < 9; i++) gl.sphere(0.07, W8.bulb, { p: [D / 2 + 0.85, H + 0.02, -W / 2 + (i + 0.5) * W / 9] }, 8, 6);
    return { body: b.geometry(), glow: gl.geometry() };
  });
}
function buildBude(opts = {}) {
  const color = BUDE_COLORS[opts.color] ? opts.color : 'rot';
  const seed = Math.round(num(opts.seed, 1));
  const G = budeGeo(color, seed);
  const root = new THREE.Group();
  root.add(mesh(G.body, kulMat8(0.6), {}, true), mesh(G.glow, glow8()));
  return makeModel('rummel_bude', root, () => {}, [], { initial: 'idle' });
}

// =============================================================================================
// Wimpelkette, Glühbirnenkette
// =============================================================================================
const sagY = (x, L, sag) => -sag * 4 * (x / L) * (1 - x / L);
const stringGeo = (L, sag, color = 0x3a2a2a) => cached(`w8:string:${L}:${sag}:${color}`, () => {
  const pts = []; for (let i = 0; i <= 16; i++) { const x = (i / 16) * L; pts.push([x, sagY(x, L, sag), 0]); }
  return new Build().add(taperTube(pts, 0.025, 32, 4), color).geometry();
});
const PEN_COLORS = [W8.red, W8.yellow, W8.teal, W8.purple, W8.pink, W8.blue];
const pennantGeo = () => cached('w8:pennant', () => new Build().add(new THREE.ShapeGeometry(pennantShape(0.36, 0.5), 2), 0xffffff).geometry());
function buildWimpelkette(opts = {}) {
  const L = clamp(num(opts.length, 6), 1, 40), sag = clamp(num(opts.sag, 0.6), 0, 5);
  const n = Math.max(2, Math.round(L / 0.5));
  const root = new THREE.Group();
  root.add(mesh(stringGeo(L, sag), kulMat8(0.7), {}));
  const pen = instMesh(pennantGeo(), kulMat8D(), n, L, 0);
  for (let i = 0; i < n; i++) pen.setColorAt(i, new THREE.Color(PEN_COLORS[i % PEN_COLORS.length]));
  root.add(pen);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const w = clamp(num(st.wind, 0.3), 0, 1);
    for (let i = 0; i < n; i++) { const x = (i + 0.5) * L / n; setInst(pen, i, x, sagY(x, L, sag), 0, Math.sin(clk.t * (3 + w * 6) + i * 0.9) * (0.1 + w * 0.6), 0, 0); }
    pen.instanceMatrix.needsUpdate = true;
  };
  return makeModel('wimpelkette', root, update, [pen], { initial: 'idle' });
}
function buildLichterkette(opts = {}) {
  const L = clamp(num(opts.length, 6), 1, 40), sag = clamp(num(opts.sag, 0.5), 0, 5);
  const n = Math.max(2, Math.round(L / 0.45));
  const root = new THREE.Group();
  root.add(mesh(stringGeo(L, sag, 0x1e2a1e), kulMat8(0.7), {}));
  const sockets = instMesh(cached('w8:socket', () => new Build().cyl(0.045, 0.05, 0.1, 0x2a3a2a, {}, 8).geometry()), kulMat8(0.7), n, L, 0);
  const onMat = glow8();
  const offMat = kulMat8(0.3);
  const bulbs = instMesh(bulbGeo(0.08), onMat, n, L, 0);
  const COLS = [0xffd84a, 0xff6a6a, 0x6ad8ff, 0x8aff6a, 0xff9af0];
  root.add(sockets, bulbs);
  for (let i = 0; i < n; i++) { const x = (i + 0.5) * L / n, y = sagY(x, L, sag); setInst(sockets, i, x, y - 0.05, 0); setInst(bulbs, i, x, y - 0.15, 0); }
  sockets.instanceMatrix.needsUpdate = true; bulbs.instanceMatrix.needsUpdate = true;
  const clk = new Clock(), c = new THREE.Color();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const on = st.on !== false, chase = st.chase !== false;
    bulbs.material = on ? onMat : offMat;
    for (let i = 0; i < n; i++) {
      c.setHex(COLS[i % COLS.length]);
      if (!on) c.multiplyScalar(0.5); else if (chase) c.multiplyScalar(0.55 + 0.45 * Math.max(0, Math.sin(clk.t * 4 - i * 0.8)));
      bulbs.setColorAt(i, c);
    }
    bulbs.instanceColor.needsUpdate = true;
  };
  return makeModel('gluehbirnenkette', root, update, [sockets, bulbs], { initial: 'idle' });
}

// =============================================================================================
// Brummbär-Ballon
// =============================================================================================
export const BALLOON_COLORS = { rot: [0xe8283a, 0xff8a8a], gelb: [0xffc81a, 0xfff0a0], blau: [0x3a7aff, 0xb0d0ff], lila: [0x8a3ae8, 0xd0a8ff] };
/** Ballon-Kopf (Mitte des Kopfes im Ursprung, Knoten unten bei y ≈ −0,75). */
export function balloonGeo(color = 'rot', lo = false) {
  return cached(`w8:balloon:${color}:${lo}`, () => {
    const [c, hi] = BALLOON_COLORS[color] ?? BALLOON_COLORS.rot;
    const b = new Build();
    const shiny = { v: (x, y, z, nx, ny) => mix(c, hi, smoothstep((nx * 0.5 + ny * 0.6 - 0.35) / 0.4) * 0.8) };
    const q = lo ? 0.6 : 1;
    b.sphere(1, shiny, { s: [0.62, 0.66, 0.66] }, Math.round(22 * q), Math.round(16 * q));
    for (const z of [1, -1]) b.sphere(0.2, shiny, { p: [-0.05, 0.55, z * 0.46] }, Math.round(10 * q), Math.round(8 * q));
    b.sphere(1, hi, { p: [0.5, -0.1, 0], s: [0.2, 0.17, 0.25] }, 10, 8);
    b.sphere(1, 0x1a1020, { p: [0.68, -0.04, 0], s: [0.06, 0.05, 0.08] }, 8, 6);
    for (const z of [1, -1]) {
      b.sphere(1, 0xffffff, { p: [0.52, 0.18, z * 0.2], s: [0.07, 0.11, 0.09] }, 8, 6);
      b.sphere(1, 0x1a1020, { p: [0.58, 0.17, z * 0.2], s: [0.03, 0.07, 0.05] }, 6, 4);
      b.tube([[0.68, -0.16, z * 0.02], [0.7, -0.19, z * 0.14], [0.64, -0.14, z * 0.26], [0.62, -0.08, z * 0.28]], 0.03, 0x2a1a10, null, 8, 4);
    }
    // kleiner Zylinder obenauf, Knoten unten
    b.cyl(0.32, 0.32, 0.03, 0x1e1a26, { p: [-0.02, 0.62, 0] }, 16);
    b.cyl(0.2, 0.19, 0.36, 0x1e1a26, { p: [-0.02, 0.82, 0] }, 14);
    b.cyl(0.205, 0.205, 0.07, W8.red, { p: [-0.02, 0.68, 0] }, 14);
    b.cone(0.07, 0.12, c, { p: [0, -0.7, 0], r: [Math.PI, 0, 0] }, 8);
    return b.geometry();
  });
}
function buildBallon(opts = {}) {
  const color = BALLOON_COLORS[opts.color] ? opts.color : 'rot';
  const n = clamp(Math.round(num(opts.count, 1)), 1, 3);
  const root = new THREE.Group();
  const weight = mesh(cached('w8:balloon:weight', () => new Build().cyl(0.22, 0.28, 0.3, 0x4a4a5e, { p: [0, 0.15, 0] }, 12).sphere(0.08, W8.gold, { p: [0, 0.33, 0] }, 8, 6).geometry()), kulMetal8(), {}, true);
  root.add(weight);
  const heads = [];
  const strings = [];
  const colors = Object.keys(BALLOON_COLORS);
  for (let i = 0; i < n; i++) {
    const c = i === 0 ? color : colors[(colors.indexOf(color) + i) % colors.length];
    const j = joint([0, 0.33, 0]);
    const off = n === 1 ? [0, 0] : [Math.cos(i * 2.1) * 0.55, Math.sin(i * 2.1) * 0.55];
    const h = 2.8 + (i % 2) * 0.35;
    const str = mesh(cached(`w8:balloon:str:${h}:${off.join(',')}`, () => new Build().add(taperTube([[0, 0, 0], [off[0] * 0.3, h * 0.4, off[1] * 0.3], [off[0] * 0.8, h * 0.8, off[1] * 0.8], [off[0], h, off[1]]], 0.012, 16, 3), 0xf0f0f0).geometry()), kulMat8(0.7), {});
    const head = mesh(balloonGeo(c), kulMat8(0.25), { p: [off[0], h + 0.72, off[1]] }, true);
    j.add(str, head);
    root.add(j);
    heads.push(j); strings.push(str);
  }
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const w = clamp(num(st.wind, 0.3), 0, 1);
    heads.forEach((j, i) => { j.rotation.set(Math.sin(clk.t * 0.9 + i) * (0.04 + w * 0.1), Math.sin(clk.t * 0.4 + i * 2) * 0.3, Math.sin(clk.t * 1.1 + i * 1.7) * (0.04 + w * 0.12)); });
  };
  return makeModel('brummbaer_ballon', root, update, [], { initial: 'idle' });
}

export const MODELS = {
  baron_turm: buildTurm,
  karussell: buildKarussell,
  riesenrad_kulisse: buildRiesenradKulisse,
  achterbahn: buildAchterbahn,
  rummel_bude: buildBude,
  wimpelkette: buildWimpelkette,
  gluehbirnenkette: buildLichterkette,
  brummbaer_ballon: buildBallon,
};
