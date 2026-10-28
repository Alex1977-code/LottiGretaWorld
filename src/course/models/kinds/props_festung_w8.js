// Kulisse Welt 8, Teil 2: Regenfestung (8-1), Keks-Fabrik (8-3), Unterwasser-Festung (8-5), Spukhaus-Spiegel (8-6), Dünen (8-2)
// und das Autowrack des Rennwagens (8-Burg). Eigene Gestaltung, Kartenqualität, ohne Spielzeug-Look (`toy: false`), backbar
// (undurchsichtig vertexgefärbt + unbeleuchtete Glut). Maßstab Meter, Vorderseite +X, Ursprung = Fußpunkt; state darf ein String sein.
// Wiederverwendet: Baron-Statuen 'baron_sandstatue' (Gegner-Datei, zerstörbar), Fackel 'fackel' und Brummbär-Fahne
// 'brummbaer_fahne' (Welt 7), Seetang 'seetang' und Koralle 'koralle' (Welt 3), Kronleuchter/Kerzen (Welt 3) im Spukhaus.
//
// regenfestung  nasse Außenfestung im Regen.  opts { kind, length, height, size, seed }
//               kind 'mauer' (Standard): Mauerstück length (8) × height (4), nasse dunkle Steine mit Glanz, Moos, Zinnen,
//                    Tropfnasen, Pfütze am Fuß (Mauer entlang Z, Vorderseite +X);
//                    'turm': runder Wachturm (Ø 4, height 9) mit Schieferkegel, Fenster, Regenrinne, Brummbär-Wimpel;
//                    'pfuetze': Pfütze Ø size (2) – state { rain (0..1): Regentropfen-Ringe };
//                    'fahne': Fahnenmast (6 m) mit großer roter Brummbär-Fahne – state { wind (0..1) }.
// keksfabrik    Keks-Fabrik.  opts { kind, length }
//               kind 'band' (Standard): Fließband length (8) × 2 m auf Beinen, Bandoberkante y = 1,2, Kekse fahren nach +X –
//                    state { speed (m/s, Standard 1) };
//                    'keksturm': Turm aus Riesenkeksen (≈6,5 m) mit Zuckerguss-Nasen und Kirsche obenauf;
//                    'zuckerguss': Zuckerguss-Maschine: gestreifter Tank mit Pegel, Rohr, Spritztülle, rosa Gussfluss in eine
//                    Gusspfütze – state { flow (0..1, Standard 1) }.
// wasserfestung Unterwasser-Festung.  opts { kind, height, seed }
//               kind 'algen' (Standard): Algenbüschel (≈ height 3) auf Steinen mit Muscheln – state { sway (0..1) };
//                    'gitter': Fallgitter-Wand (4 × 4 m) im Steinrahmen mit Moos und Seepocken (Vorderseite +X);
//                    'saeule': halb versunkene, gebrochene Säule mit Seepocken, Seestern und Korallen.
// spukspiegel   großer Spukhaus-Spiegel (≈4,2 × 2,6 m) auf Löwenfüßen: violett-goldener Schnörkelrahmen mit Geisterkopf-Krone
//               und Kerzen, spiegelnde Fläche (Vorderseite +X).  state { star (bool: im Spiegel funkelt das Spiegelbild
//               eines Sterns – der Spiegelbild-Stern aus 8-6), glow (0..1 Kerzen, Standard 1) }
// duene         Sanddüne ≈ 12 × 3 × 7 m (· size) mit Wind-Rippeln, Kieseln und trockenen Grasbüscheln.  opts { size (1), seed (1) }
// autowrack     Wrack von Baron Brummbärs rotem Rennwagen (das Welt-1-Auto): schief, eingedrückte Haube, abgesprungenes Rad,
//               Stoßstange und Radkappe daneben, Rußflecken, Qualm.  state { smoke (bool, Standard true) }

import {
  THREE, TAU, Build, cached, vcol, mesh, joint, makeModel, Clock, damp, clamp, col, mix, smoothstep, lerp, instMesh, setInst,
  placed, metal, glowSprite,
} from '../lib/kit.js';
import {
  W8, num, kulMat8, kulMat8D, kulMetal8, glow8, gradV, hash1, noise3, taperTube, bearEmblem, lumpyEllipsoid, displace, harvest,
  recolor, puffyGeo, memo, fxPuffs, starShape, puffyStarGeo,
} from '../lib/w8Geos.js';
import { MODELS as B1 } from './bosses_w1.js';

const _v = new THREE.Vector3();
const KUL = (r = 0.75) => kulMat8(r);
const wetMat = () => vcol(0.3, { toy: false }, 'w8kul');

// =============================================================================================
// Regenfestung
// =============================================================================================
const RF = { stone: 0x5a6680, stoneHi: 0x9aa8c8, stoneLow: 0x2a3044, joint: 0x1e2232, moss: 0x4a8a4a, mossHi: 0x8ac870, water: 0x2a4a7a, waterHi: 0x8ab8ff, slate: 0x3a2e5a, slateHi: 0x6a5a9a };
const wetStoneV = (seed = 0) => ({ v: (x, y, z, nx, ny) => {
  const row = Math.floor(y / 0.5), u = (z + x) / 0.9 + (row % 2) * 0.5;
  const jnt = (((y / 0.5) % 1) + 1) % 1 < 0.08 || (((u % 1) + 1) % 1) < 0.06;
  let c = mix(RF.stoneLow, mix(RF.stone, RF.stoneHi, (noise3(x * 0.8 + seed, y * 0.8, z * 0.8) - 0.3) * 0.9), smoothstep(ny * 0.4 + nx * 0.2 + 0.5));
  if (noise3(x * 0.6 + 7, y * 0.9, z * 0.6) > 0.68 && y < 2.5) c = mix(c, RF.moss, 0.7);
  return jnt ? mix(c, RF.joint, 0.7) : c;
} });
function mauerGeo(L, H) {
  return cached(`w8:rf:mauer:${L}:${H}`, () => {
    const b = new Build();
    const T = 1.4;
    const g = new THREE.BoxGeometry(T, H, L, 2, Math.max(2, Math.round(H * 2)), Math.max(2, Math.round(L * 2)));
    g.translate(0, H / 2, 0);
    b.add(g, wetStoneV(1));
    // Zinnen
    const n = Math.max(2, Math.round(L / 1.6));
    for (let i = 0; i < n; i++) b.box(T + 0.1, 0.9, L / n * 0.55, wetStoneV(2), { p: [0, H + 0.45, -L / 2 + (i + 0.5) * L / n] }, 0.06, 1);
    b.box(T + 0.3, 0.25, L + 0.2, gradV(RF.stoneLow, RF.stoneHi, 0.5, 0.5), { p: [0, H, 0] }, 0.05, 1);
    // Moospolster, Tropfnasen, Pfütze am Fuß
    for (let i = 0; i < 5; i++) { const z = -L / 2 + (hash1(i) * 0.8 + 0.1) * L; b.sphere(1, { v: (x, y, zz, nx, ny) => mix(RF.moss, RF.mossHi, smoothstep(ny * 0.6 + 0.3)) }, { p: [T / 2, H - 0.15, z], s: [0.25, 0.22, 0.6 + hash1(i + 3) * 0.6] }, 10, 6); }
    for (let i = 0; i < 9; i++) { const z = -L / 2 + (i + 0.5) * L / 9; b.cone(0.07, 0.25 + hash1(i) * 0.2, RF.waterHi, { p: [T / 2 + 0.08, H - 0.32, z], r: [Math.PI, 0, 0] }, 6); }
    b.cyl(1, 1, 0.04, { v: (x, y, z) => mix(RF.water, RF.waterHi, smoothstep(0.4 - Math.hypot(x, z) * 0.1)) }, { p: [T / 2 + 1.0, 0.02, L * 0.15], s: [1.0, 1, 2.2] }, 24);
    return b.geometry();
  });
}
function turmRegenGeo(H) {
  return memo(`w8:rf:turm:${H}`, () => {
    const b = new Build(), gl = new Build();
    const R = 2;
    const g = new THREE.CylinderGeometry(R, R * 1.08, H, 24, Math.round(H * 2), true); g.translate(0, H / 2, 0);
    b.add(g, wetStoneV(3));
    b.cyl(R + 0.2, R + 0.2, 0.3, gradV(RF.stoneLow, RF.stoneHi), { p: [0, H, 0] }, 24);
    const roof = new THREE.ConeGeometry(R + 0.6, 3.4, 24, 4); roof.translate(0, H + 1.85, 0);
    b.add(roof, { v: (x, y, z, nx, ny) => mix(RF.slate, RF.slateHi, smoothstep(ny * 0.4 + 0.3 + Math.sin(y * 9) * 0.15)) });
    b.sphere(0.25, W8.gold, { p: [0, H + 3.6, 0] }, 10, 8);
    b.cyl(0.05, 0.05, 1.4, W8.gold, { p: [0, H + 4.3, 0] }, 6);
    b.add(puffyGeo((() => { const s = new THREE.Shape(); s.moveTo(0, 0.4); s.lineTo(1.3, 0.1); s.lineTo(0, -0.25); s.lineTo(0, 0.4); return s; })(), 0.04, 0.01, 2, 1), W8.red, { p: [0.05, H + 4.65, 0] });
    for (let i = 0; i < 3; i++) {
      const a = i * 2.2 + 0.3, y = 2.5 + i * 2.2;
      const n = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const M = placed(n.clone().multiplyScalar(R * 1.04 - 0.02).setY(y), n, new THREE.Vector3(1, 1, 1));
      gl.add(new THREE.PlaneGeometry(0.6, 0.9), { v: (x, yy) => mix(0xffb84a, 0xfff0a0, smoothstep(yy + 0.3)) }, M);
      b.add(new THREE.BoxGeometry(0.8, 0.12, 0.3), RF.stoneHi, M.clone().multiply(new THREE.Matrix4().makeTranslation(0, -0.5, 0.1)));
    }
    // Regenrinne mit Wasserstrahl
    b.cyl(0.12, 0.12, H, 0x4a5068, { p: [R * 0.75, H / 2, R * 0.75] }, 8);
    b.cyl(0.18, 0.12, 0.3, 0x4a5068, { p: [R * 0.75 + 0.15, 0.4, R * 0.75 + 0.15], r: [0, 0, 0.8] }, 8);
    b.cyl(0.9, 0.9, 0.03, RF.water, { p: [R + 0.9, 0.02, R * 0.9] }, 18);
    return { body: b.geometry(), glow: gl.geometry() };
  });
}
const rippleGeo = () => cached('w8:rf:ripple', () => new Build().torus(1, 0.03, 0xd8ecff, { r: [Math.PI / 2, 0, 0], s: [1, 1, 0.4] }, 4, 24).geometry());
function flagClothGeo() {
  return cached('w8:rf:flag', () => {
    const b = new Build();
    const g = new THREE.PlaneGeometry(2.4, 1.6, 12, 8); g.translate(1.2, 0, 0);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i); P.setZ(i, Math.sin(x * 2.5) * 0.12 * (x / 2.4)); P.setY(i, P.getY(i) - (x / 2.4) ** 2 * 0.35); }
    g.computeVertexNormals();
    b.add(g, (x, y) => (Math.abs(y + (x / 2.4) ** 2 * 0.35) > 0.7 || x > 2.25 ? col(W8.gold) : mix(W8.redLow, W8.red, smoothstep(0.5 + y * 0.4))));
    bearEmblem(b, { p: [1.2, -0.12, 0.08] }, 0.45);
    bearEmblem(b, { p: [1.2, -0.12, -0.08], r: [0, Math.PI, 0] }, 0.45);
    return b.geometry();
  });
}
function buildRegenfestung(opts = {}) {
  const kind = ['turm', 'pfuetze', 'fahne'].includes(opts.kind) ? opts.kind : 'mauer';
  const root = new THREE.Group();
  const own = [];
  let update = () => {};
  if (kind === 'mauer') {
    root.add(mesh(mauerGeo(clamp(Math.round(num(opts.length, 8)), 2, 40), clamp(Math.round(num(opts.height, 4) * 2) / 2, 1, 20)), wetMat(), {}, true));
    root.children[0].receiveShadow = true;
  } else if (kind === 'turm') {
    const G = turmRegenGeo(clamp(Math.round(num(opts.height, 9)), 3, 40));
    root.add(mesh(G.body, wetMat(), {}, true), mesh(G.glow, glow8()));
  } else if (kind === 'pfuetze') {
    const S = clamp(num(opts.size, 2), 0.3, 20) / 2;
    root.add(mesh(cached('w8:rf:pf', () => {
      const s = new THREE.Shape(); for (let i = 0; i <= 32; i++) { const a = (i / 32) * TAU, r = 1 + Math.sin(a * 3) * 0.08 + Math.sin(a * 5 + 1) * 0.05; if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r); else s.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      const g = new THREE.ShapeGeometry(s, 3); g.rotateX(-Math.PI / 2);
      return new Build().add(g, (x, y, z) => mix(RF.waterHi, RF.water, smoothstep(Math.hypot(x - 0.3, z + 0.2) * 0.9))).geometry();
    }), wetMat(), { p: [0, 0.015, 0], s: [S, 1, S] }));
    const NR = 6;
    const rings = instMesh(rippleGeo(), KUL(0.3), NR, S * 2, 0);
    root.add(rings);
    own.push(rings);
    const RR = Array.from({ length: NR }, (_, i) => ({ x: (hash1(i) - 0.5) * 1.2 * S, z: (hash1(i + 3) - 0.5) * 1.2 * S, ph: hash1(i + 6) }));
    const clk = new Clock();
    update = (dt, st) => {
      clk.tick(dt, 'idle');
      const rain = clamp(num(st.rain, 0.6), 0, 1);
      RR.forEach((r, i) => { const p = (clk.t * 1.3 + r.ph) % 1; const on = rain > (i / NR) * 0.9; setInst(rings, i, r.x, 0.03, r.z, 0, 0, 0, on ? 0.05 + p * 0.45 * S : 0.0001); });
      rings.instanceMatrix.needsUpdate = true;
    };
  } else {
    root.add(mesh(cached('w8:rf:mast', () => new Build().cyl(0.09, 0.12, 6, gradV(0x5a5a6a, 0xc8c8d8), { p: [0, 3, 0] }, 10).sphere(0.18, W8.gold, { p: [0, 6.1, 0] }, 10, 8).box(0.6, 0.3, 0.6, RF.stone, { p: [0, 0.15, 0] }, 0.05, 1).geometry()), KUL(0.5), {}, true));
    const flagJ = joint([0.1, 5.1, 0]);
    flagJ.add(mesh(flagClothGeo(), kulMat8D(), {}, true));
    root.add(flagJ);
    const clk = new Clock();
    update = (dt, st) => { clk.tick(dt, 'idle'); const w = clamp(num(st.wind, 0.5), 0, 1); flagJ.rotation.set(Math.sin(clk.t * 2.2) * 0.05 * w, Math.sin(clk.t * (1.5 + w * 3)) * (0.08 + w * 0.3), -0.05); };
  }
  return makeModel('regenfestung', root, (dt, st) => update(dt, st), own, { initial: 'idle' });
}

// =============================================================================================
// Keks-Fabrik
// =============================================================================================
const cookieSmallGeo = () => cached('w8:kf:cookie', () => {
  const b = new Build();
  b.cyl(0.4, 0.4, 0.14, { v: (x, y, z, nx, ny) => mix(W8.doughLow, W8.doughHi, smoothstep(ny * 0.6 + 0.4)) }, { p: [0, 0.07, 0] }, 18);
  b.torus(0.4, 0.05, W8.dough, { p: [0, 0.07, 0], r: [Math.PI / 2, 0, 0] }, 5, 18);
  b.sphere(1, W8.icingPink, { p: [0, 0.15, 0], s: [0.28, 0.04, 0.28] }, 14, 6);
  for (let i = 0; i < 5; i++) b.sphere(0.035, [0xffffff, 0xffe04a, 0x4ad8ff][i % 3], { p: [Math.cos(i * 1.3) * 0.18, 0.18, Math.sin(i * 1.3) * 0.18] }, 6, 4);
  return b.geometry();
});
function bandGeo(L) {
  return cached(`w8:kf:band:${L}`, () => {
    const b = new Build();
    const W = 2, Y = 1.2;
    const metalV = gradV(0x5a6078, 0xd8dcec, 0.5, 0.5);
    b.box(L, 0.08, W, (x, y, z) => (Math.floor((x + 50) * 1.5) % 2 ? col(0x3a3a4a) : col(0x4a4a5c)), { p: [0, Y - 0.04, 0] }, 0, 1);
    for (const s of [1, -1]) {
      b.box(L + 0.4, 0.3, 0.14, gradV(W8.redLow, W8.red), { p: [0, Y - 0.05, s * (W / 2 + 0.07)] }, 0.04, 1);
      for (let x = -L / 2 + 0.4; x <= L / 2 - 0.3; x += 2) b.box(0.16, Y - 0.15, 0.16, metalV, { p: [x, (Y - 0.15) / 2, s * (W / 2 - 0.1)] }, 0.03, 1);
    }
    for (const x of [-L / 2, L / 2]) b.cyl(0.25, 0.25, W + 0.1, gradV(W8.goldLow, W8.goldHi), { p: [x, Y - 0.2, 0], r: [Math.PI / 2, 0, 0] }, 14);
    // Zuckerguss-Kleckse auf der Seitenleiste
    for (let x = -L / 2 + 0.6; x < L / 2; x += 1.1) b.sphere(1, W8.icing, { p: [x, Y + 0.1, W / 2 + 0.07], s: [0.18, 0.08, 0.1] }, 8, 5);
    return b.geometry();
  });
}
function keksturmGeo() {
  return cached('w8:kf:turm', () => {
    const b = new Build();
    let y = 0;
    const sizes = [2.6, 2.2, 2.4, 1.9, 1.6, 1.2];
    sizes.forEach((R, i) => {
      const t = 0.7 + hash1(i) * 0.3;
      const choco = i % 2 === 1;
      const dough = choco ? [0x4a220e, 0x7a3e1e, 0xa8643a] : [W8.doughLow, W8.dough, W8.doughHi];
      const g = new THREE.CylinderGeometry(R, R * 1.02, t, 32, 2);
      const P = g.attributes.position;
      for (let k = 0; k < P.count; k++) { const a = Math.atan2(P.getZ(k), P.getX(k)), r = Math.hypot(P.getX(k), P.getZ(k)); if (r > R * 0.9) { const f = 1 + Math.sin(a * 14) * 0.03; P.setX(k, P.getX(k) * f); P.setZ(k, P.getZ(k) * f); } }
      g.computeVertexNormals();
      b.add(g, { v: (x, yy, z, nx, ny) => mix(dough[0], mix(dough[1], dough[2], noise3(x * 3, yy * 3, z * 3)), smoothstep(Math.abs(ny) * 0.7 + 0.3)) }, { p: [hash1(i + 5) * 0.2, y + t / 2, hash1(i + 7) * 0.2], r: [0, i, 0] });
      // Zuckerguss-Decke mit Nasen
      const ic = choco ? W8.icing : [W8.icingPink, W8.icingMint, W8.icingBlue][i % 3];
      b.cyl(R * 0.92, R * 0.92, 0.1, ic, { p: [hash1(i + 5) * 0.2, y + t + 0.03, hash1(i + 7) * 0.2] }, 28);
      for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU + i; b.capsule(0.1, 0.25 + hash1(i * 7 + k) * 0.35, ic, { p: [Math.cos(a) * R * 0.92 + hash1(i + 5) * 0.2, y + t - 0.12, Math.sin(a) * R * 0.92 + hash1(i + 7) * 0.2] }, 2, 6); }
      y += t + 0.08;
    });
    b.sphere(0.4, { v: (x, yy, z, nx, ny) => mix(0xa8101e, 0xff5a5a, smoothstep(ny * 0.5 + nx * 0.3 + 0.3)) }, { p: [0, y + 0.35, 0] }, 16, 12);
    b.tube([[0, y + 0.7, 0], [0.1, y + 1.1, 0.05], [0.3, y + 1.3, 0.1]], 0.04, 0x3a8a2a, null, 8, 4);
    return b.geometry();
  });
}
function zuckergussGeo() {
  return memo('w8:kf:guss', () => {
    const b = new Build(), flow = new Build();
    const tankV = (x, y, z) => (Math.floor(((Math.atan2(z, x) / TAU) + 1) * 16) % 2 ? col(W8.pink) : col(W8.white));
    b.cyl(1.3, 1.3, 2.6, tankV, { p: [-1.2, 2.3, 0] }, 32);
    b.sphere(1, W8.pinkHi, { p: [-1.2, 3.6, 0], s: [1.3, 0.6, 1.3] }, 24, 10);
    b.cyl(1.35, 1.35, 0.15, W8.gold, { p: [-1.2, 1.0, 0] }, 32);
    for (const [x, z] of [[-0.4, 0.8], [-0.4, -0.8], [-2.0, 0.8], [-2.0, -0.8]]) b.cyl(0.12, 0.12, 1.0, 0x8a90a8, { p: [x, 0.5, z] }, 8);
    // Pegel-Fenster, Rohr zur Tülle
    b.box(0.08, 1.4, 0.4, 0xfff4fa, { p: [0.08, 2.3, 0] }, 0.03, 1);
    b.box(0.09, 0.9, 0.3, W8.icingPink, { p: [0.09, 2.05, 0] }, 0.02, 1);
    b.tube([[-1.2, 4.0, 0], [-0.4, 4.6, 0], [0.6, 4.4, 0], [1.2, 3.6, 0]], 0.18, gradV(0x5a6078, 0xd8dcec), null, 20, 8);
    b.cone(0.35, 0.6, W8.gold, { p: [1.25, 3.25, 0], r: [Math.PI, 0, 0] }, 12);
    // Gussfluss und Pfütze (rosa, glänzend)
    flow.tube([[1.25, 2.95, 0], [1.26, 2.0, 0], [1.28, 1.0, 0.02], [1.3, 0.15, 0]], 0.13, { v: (x, y) => mix(W8.icingPink, 0xffd0ec, smoothstep(Math.sin(y * 6) * 0.5 + 0.5)) }, null, 16, 8);
    flow.sphere(1, { v: (x, y, z, nx, ny) => mix(W8.icingPink, 0xffe0f2, smoothstep(ny * 0.5 + 0.3)) }, { p: [1.3, 0.05, 0], s: [1.4, 0.18, 1.2] }, 20, 8);
    for (let i = 0; i < 4; i++) flow.sphere(0.15 + hash1(i) * 0.1, W8.icingPink, { p: [1.3 + Math.cos(i * 1.6) * 1.2, 0.04, Math.sin(i * 1.6) * 1.0], s: [1, 0.4, 1] }, 10, 6);
    return { body: b.geometry(), flow: flow.geometry() };
  });
}
function buildKeksfabrik(opts = {}) {
  const kind = ['keksturm', 'zuckerguss'].includes(opts.kind) ? opts.kind : 'band';
  const root = new THREE.Group();
  const own = [];
  let update = () => {};
  if (kind === 'band') {
    const L = clamp(Math.round(num(opts.length, 8)), 2, 40);
    root.add(mesh(bandGeo(L), KUL(0.5), {}, true));
    const n = Math.max(2, Math.round(L / 1.4));
    const cookies = instMesh(cookieSmallGeo(), KUL(0.6), n, L, 1.3);
    cookies.castShadow = true;
    root.add(cookies);
    own.push(cookies);
    let s = 0;
    update = (dt, st) => {
      s += dt * num(st.speed, 1);
      for (let i = 0; i < n; i++) { const x = ((((i / n) * L + s) % L) + L) % L - L / 2; setInst(cookies, i, x, 1.2, (hash1(i) - 0.5) * 0.6, 0, i * 1.3, 0); }
      cookies.instanceMatrix.needsUpdate = true;
    };
  } else if (kind === 'keksturm') {
    root.add(mesh(keksturmGeo(), KUL(0.6), {}, true));
  } else {
    const G = zuckergussGeo();
    root.add(mesh(G.body, KUL(0.45), {}, true));
    const flow = mesh(G.flow, KUL(0.25), {}, true);
    root.add(flow);
    const clk = new Clock();
    update = (dt, st) => { clk.tick(dt, 'idle'); const f = clamp(num(st.flow, 1), 0, 1); flow.scale.set(1 + Math.sin(clk.t * 4) * 0.01, 1, 1); flow.visible = f > 0.02; };
  }
  return makeModel('keksfabrik', root, (dt, st) => update(dt, st), own, { initial: 'idle' });
}

// =============================================================================================
// Unterwasser-Festung
// =============================================================================================
const UW = { stone: 0x5a7a8a, stoneHi: 0xa8c8d0, stoneLow: 0x2a3e4a, kelp: 0x2a8a4a, kelpHi: 0x8ae070, kelpLow: 0x14502a, barnacle: 0xe8e0d0, star: 0xff7a3a, coral: 0xff6aa8, iron: 0x3a4250, ironHi: 0x7a8aa0 };
const uwStoneV = { v: (x, y, z, nx, ny) => { let c = mix(UW.stoneLow, mix(UW.stone, UW.stoneHi, noise3(x, y, z) * 0.6), smoothstep(ny * 0.4 + 0.5)); if (ny > 0.5 && noise3(x * 2, 0, z * 2) > 0.5) c = mix(c, UW.kelp, 0.6); return c; } };
function kelpGeo(H, seed) {
  return cached(`w8:uw:kelp:${H}:${seed}`, () => {
    const b = new Build();
    for (let i = 0; i < 4; i++) b.add(lumpyEllipsoid([0.5 + hash1(seed + i) * 0.4, 0.3, 0.5], 0.05, 3, seed + i, 12, 8), uwStoneV, { p: [Math.cos(i * 1.7) * 0.6, 0.1, Math.sin(i * 1.7) * 0.6] });
    for (let k = 0; k < 3; k++) b.sphere(1, { v: (x, y, z, nx, ny) => mix(0xd89a8a, 0xfff0e8, smoothstep(ny)) }, { p: [Math.cos(k * 2.3 + 1) * 0.9, 0.08, Math.sin(k * 2.3 + 1) * 0.9], s: [0.18, 0.08, 0.14] }, 10, 6);
    return b.geometry();
  });
}
function kelpBladeGeo(H, seed) {
  return cached(`w8:uw:blade:${H}:${seed}`, () => {
    const b = new Build();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + hash1(seed + i), r = 0.2 + hash1(seed + i * 2) * 0.4, h = H * (0.6 + hash1(seed + i * 3) * 0.5);
      const pts = [0, 1, 2, 3, 4].map((k) => [Math.cos(a) * r + Math.sin(k * 1.4 + i) * 0.18, (k / 4) * h, Math.sin(a) * r + Math.cos(k * 1.2 + i) * 0.18]);
      b.add(taperTube(pts, (t) => 0.09 * (1 - t * 0.6) + 0.01, 16, 5), { v: (x, y) => mix(UW.kelpLow, mix(UW.kelp, UW.kelpHi, smoothstep(y / h)), smoothstep(y / 0.5)) });
      for (let k = 1; k < 4; k++) b.sphere(1, UW.kelpHi, { p: [pts[k][0] + 0.1, pts[k][1], pts[k][2]], s: [0.14, 0.05, 0.08], r: [0, a, 0.5] }, 8, 5);
    }
    return b.geometry();
  });
}
function gitterGeo() {
  return cached('w8:uw:gitter', () => {
    const b = new Build();
    const W = 4, H = 4;
    for (const s of [1, -1]) b.box(1, H + 0.6, 0.9, uwStoneV, { p: [0, (H + 0.6) / 2, s * (W / 2 + 0.45)] }, 0.08, 2);
    b.box(1.1, 0.9, W + 1.8, uwStoneV, { p: [0, H + 0.6, 0] }, 0.08, 2);
    const ironV = gradV(UW.iron, UW.ironHi, 0.5, 0.5);
    for (let i = 0; i < 7; i++) { const z = -W / 2 + (i + 0.5) * W / 7; b.box(0.12, H, 0.12, ironV, { p: [0, H / 2, z] }, 0.03, 1); b.cone(0.1, 0.25, ironV, { p: [0, -0.05, z], r: [Math.PI, 0, 0] }, 6); }
    for (let k = 0; k < 5; k++) b.box(0.1, 0.1, W, ironV, { p: [0.04, 0.5 + k * 0.85, 0] }, 0.02, 1);
    for (let i = 0; i < 12; i++) b.cone(0.07, 0.08, UW.barnacle, { p: [0.5, 0.4 + hash1(i) * H, (hash1(i + 3) - 0.5) * (W + 1.6)], r: [0, 0, -Math.PI / 2] }, 6);
    for (let i = 0; i < 6; i++) b.sphere(1, UW.kelp, { p: [0.35, H + 1.05, -W / 2 - 0.6 + i * 1.0], s: [0.4, 0.2, 0.5] }, 8, 6);
    return b.geometry();
  });
}
function saeuleGeo() {
  return cached('w8:uw:saeule', () => {
    const b = new Build();
    const g = new THREE.CylinderGeometry(0.75, 0.85, 4, 16, 6); g.translate(0, 2, 0);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) { const y = P.getY(i); if (y > 3.9) P.setY(i, 3.4 + Math.sin(P.getX(i) * 4) * 0.4 + hash1(Math.round(P.getZ(i) * 10)) * 0.2); const a = Math.atan2(P.getZ(i), P.getX(i)); const f = 1 + (Math.cos(a * 8) > 0.6 ? -0.05 : 0); P.setX(i, P.getX(i) * f); P.setZ(i, P.getZ(i) * f); }
    g.computeVertexNormals();
    b.add(g, uwStoneV, { r: [0.12, 0, 0.08] });
    b.box(2.0, 0.5, 2.0, uwStoneV, { p: [0, 0.25, 0] }, 0.08, 1);
    b.add(lumpyEllipsoid([0.6, 0.45, 0.5], 0.06, 3, 4, 12, 8), uwStoneV, { p: [1.4, 0.3, 0.6], r: [0.3, 0.5, 1.2] });
    for (let i = 0; i < 14; i++) { const a = hash1(i) * TAU, y = 0.6 + hash1(i + 4) * 2.4; b.cone(0.06, 0.07, UW.barnacle, { p: [Math.cos(a) * 0.83, y, Math.sin(a) * 0.83], r: [0, -a, -Math.PI / 2] }, 5); }
    // Seestern
    b.add(puffyGeo(starShape(0.3, 0.12, 5), 0.06, 0.04, 2, 2), UW.star, { p: [0.86, 1.6, 0.1], r: [0, Math.PI / 2, 0.3] });
    // Korallen-Büschel am Fuß
    for (let i = 0; i < 5; i++) b.tube([[-1.0 + i * 0.12, 0.5, -0.8], [-1.05 + i * 0.15, 0.9, -0.85 - i * 0.05], [-1.0 + i * 0.22, 1.2 + hash1(i) * 0.3, -0.9]], 0.05, UW.coral, null, 8, 5);
    return b.geometry();
  });
}
function buildWasserfestung(opts = {}) {
  const kind = ['gitter', 'saeule'].includes(opts.kind) ? opts.kind : 'algen';
  const root = new THREE.Group();
  let update = () => {};
  if (kind === 'algen') {
    const H = clamp(num(opts.height, 3), 0.5, 15), seed = Math.round(num(opts.seed, 1));
    root.add(mesh(kelpGeo(H, seed), KUL(0.7), {}, true));
    const blades = joint();
    blades.add(mesh(kelpBladeGeo(H, seed), kulMat8D(), {}, true));
    root.add(blades);
    const clk = new Clock();
    update = (dt, st) => { clk.tick(dt, 'idle'); const s = clamp(num(st.sway, 0.4), 0, 1); blades.rotation.set(Math.sin(clk.t * 1.1) * 0.08 * (0.3 + s), 0, Math.sin(clk.t * 0.8 + 1) * 0.1 * (0.3 + s)); };
  } else root.add(mesh(kind === 'gitter' ? gitterGeo() : saeuleGeo(), KUL(0.7), {}, true));
  return makeModel('wasserfestung', root, (dt, st) => update(dt, st), [], { initial: 'idle' });
}

// =============================================================================================
// Spukhaus-Spiegel
// =============================================================================================
function frameGeo() {
  return memo('w8:spiegel', () => {
    const b = new Build(), gl = new Build();
    const W = 2.2, H = 3.2, y0 = 0.9;
    const goldV = gradV(W8.goldLow, W8.goldHi, 0.5, 0.5), vio = gradV(0x2a0e4a, 0x7a3ab8, 0.5, 0.5);
    // Rahmen: violettes Brett, goldene Schnörkelleiste, ovale Oberkante
    const outer = new THREE.Shape(); outer.moveTo(-W / 2 - 0.3, 0); outer.lineTo(W / 2 + 0.3, 0); outer.lineTo(W / 2 + 0.3, H - W / 2); outer.absarc(0, H - W / 2, W / 2 + 0.3, 0, Math.PI, false); outer.lineTo(-W / 2 - 0.3, 0);
    const hole = new THREE.Path(); hole.moveTo(-W / 2, 0.15); hole.lineTo(W / 2, 0.15); hole.lineTo(W / 2, H - W / 2); hole.absarc(0, H - W / 2, W / 2, 0, Math.PI, false); hole.lineTo(-W / 2, 0.15);
    outer.holes.push(hole);
    b.add(puffyGeo(outer, 0.18, 0.06, 16, 2), vio, { p: [0, y0, 0], r: [0, Math.PI / 2, 0] });
    const rim = []; for (let i = 0; i <= 40; i++) { const u = i / 40; let p; if (u < 0.25) p = [W / 2 + 0.15, lerp(0.1, H - W / 2, u / 0.25)]; else if (u < 0.75) { const a = ((u - 0.25) / 0.5) * Math.PI; p = [Math.cos(a) * (W / 2 + 0.15), H - W / 2 + Math.sin(a) * (W / 2 + 0.15)]; } else p = [-(W / 2 + 0.15), lerp(H - W / 2, 0.1, (u - 0.75) / 0.25)]; rim.push([0.14, y0 + p[1], -p[0]]); }
    b.add(taperTube(rim, 0.07, 80, 6), goldV);
    // Schnörkel (Spiralen) seitlich und unten
    for (const s of [1, -1]) for (const yy of [0.6, 1.8]) {
      const pts = []; for (let i = 0; i <= 14; i++) { const a = i * 0.5, r = 0.32 * (1 - i / 16); pts.push([0.16, y0 + yy + Math.sin(a) * r, s * (W / 2 + 0.3 + Math.cos(a) * r)]); }
      b.add(taperTube(pts, (t) => 0.05 * (1 - t * 0.6), 28, 5), goldV);
    }
    // Geisterkopf-Krone (freundlich), Kerzen
    b.sphere(1, { v: (x, y, z, nx, ny) => mix(0xd8d0f0, 0xffffff, smoothstep(ny * 0.5 + 0.4)) }, { p: [0.15, y0 + H + 0.55, 0], s: [0.4, 0.45, 0.42] }, 18, 12);
    for (const s of [1, -1]) b.sphere(1, 0x1a1030, { p: [0.5, y0 + H + 0.62, s * 0.13], s: [0.05, 0.1, 0.07] }, 8, 6);
    b.sphere(1, 0xff8ab0, { p: [0.5, y0 + H + 0.42, 0], s: [0.04, 0.06, 0.08] }, 8, 6);
    for (const s of [1, -1]) {
      b.cyl(0.13, 0.15, 0.1, W8.gold, { p: [0.2, y0 + H - 0.5, s * (W / 2 + 0.55)] }, 10);
      b.cyl(0.08, 0.08, 0.45, 0xfff4e0, { p: [0.2, y0 + H - 0.22, s * (W / 2 + 0.55)] }, 10);
      gl.add(puffyStarGeo(0.09, 0.05, 0.04, 0.02, 6), { v: (x, y) => mix(0xff8a1a, 0xfff2a0, smoothstep(y * 8 + 0.5)) }, { p: [0.2, y0 + H + 0.1, s * (W / 2 + 0.55)], s: [0.8, 1.5, 0.8] });
    }
    // Löwenfüße und Sockel
    b.box(0.6, 0.3, W + 0.8, vio, { p: [0, y0 - 0.1, 0] }, 0.08, 1);
    for (const s of [1, -1]) {
      b.cyl(0.12, 0.08, y0 - 0.2, goldV, { p: [0, (y0 - 0.2) / 2 + 0.1, s * (W / 2)] }, 8);
      b.sphere(1, goldV, { p: [0.1, 0.1, s * (W / 2)], s: [0.28, 0.12, 0.2] }, 10, 6);
      for (const z of [-0.08, 0, 0.08]) b.sphere(0.06, W8.goldHi, { p: [0.33, 0.07, s * (W / 2) + z] }, 6, 4);
    }
    // Spiegelfläche
    const glass = new THREE.Shape(); glass.moveTo(-W / 2, 0.15); glass.lineTo(W / 2, 0.15); glass.lineTo(W / 2, H - W / 2); glass.absarc(0, H - W / 2, W / 2, 0, Math.PI, false); glass.lineTo(-W / 2, 0.15);
    const gg = new THREE.ShapeGeometry(glass, 16); gg.rotateY(Math.PI / 2); gg.translate(0.02, y0, 0);
    return { body: b.geometry(), glow: gl.geometry(), glass: new Build().add(gg, { v: (x, y, z) => mix(0x8a9ac8, 0xe8f0ff, smoothstep((y - y0) / H * 0.8 + z * 0.1)) }).geometry() };
  });
}
function buildSpukspiegel() {
  const G = frameGeo();
  const root = new THREE.Group();
  const own = [];
  const glassMat = metal('w8mirror', { toy: false, vertexColors: true, metalness: 0.85, roughness: 0.06, color: 0xffffff }, 1.3);
  const starMat = new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.9, toneMapped: false, depthWrite: false });
  own.push(starMat);
  const star = mesh(cached('w8:spiegel:star', () => new Build().add(puffyStarGeo(0.35, 0.16, 0.06, 0.03), 0xffffff, { r: [0, Math.PI / 2, 0] }).geometry()), starMat, { p: [0.06, 2.4, 0] });
  const halo = glowSprite(0xfff2a0, 1.6, 0.0); halo.material = halo.material.clone(); own.push(halo.material); halo.position.set(0.1, 2.4, 0);
  const candles = mesh(G.glow, glow8());
  root.add(mesh(G.body, KUL(0.45), {}, true), mesh(G.glass, glassMat, {}), candles, star, halo);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const on = !!st.star, t = clk.t;
    star.visible = on;
    star.rotation.x = Math.sin(t * 1.5) * 0.3;
    star.scale.setScalar(1 + Math.sin(t * 4) * 0.08);
    halo.material.opacity = on ? 0.55 + Math.sin(t * 4) * 0.15 : 0;
    const g = clamp(num(st.glow, 1), 0, 1);
    candles.visible = g > 0.05;
    candles.scale.set(1, 1 + Math.sin(t * 13) * 0.02, 1);
  };
  return makeModel('spukspiegel', root, update, own, { initial: 'idle' });
}

// =============================================================================================
// Düne
// =============================================================================================
function duneGeo(S, seed) {
  return cached(`w8:duene:${S}:${seed}`, () => {
    const b = new Build();
    const g = new THREE.SphereGeometry(1, 56, 22, 0, TAU, 0, Math.PI / 2);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      // asymmetrisch: Luv flach (−X), Lee steil (+X), Kamm geschwungen
      const k = x > 0 ? 1 - x * 0.25 : 1;
      P.setXYZ(i, x * 6 * S, y * 3 * S * k * (1 + Math.sin(z * 3 + seed) * 0.08), z * 3.5 * S * (1 + Math.sin(x * 2 + seed) * 0.1));
    }
    g.computeVertexNormals();
    b.add(g, { v: (x, y, z, nx, ny) => { const rip = Math.sin((x * 0.9 + Math.sin(z * 0.6 + seed) * 0.8) * 4) > 0.5 ? 0.35 : 0; return mix(W8.sandLow, mix(W8.sand, W8.sandHi, smoothstep(ny * 0.5 + nx * 0.2 + 0.1) - rip), smoothstep(ny * 0.6 + 0.4)); } });
    for (let i = 0; i < 8; i++) {
      const a = hash1(seed * 7 + i) * TAU, r = 0.6 + hash1(seed + i * 3) * 0.35;
      const px = Math.cos(a) * r * 6 * S, pz = Math.sin(a) * r * 3.5 * S;
      if (i % 2) b.add(lumpyEllipsoid([0.25, 0.15, 0.2], 0.03, 3, i, 8, 6), gradV(0x9a8a7a, 0xd8c8b0), { p: [px, 0.08, pz] });
      else for (let k = 0; k < 5; k++) b.cone(0.03, 0.4 + hash1(i + k) * 0.3, 0xc8a85a, { p: [px + (k - 2) * 0.05, 0.2, pz], r: [0, 0, (k - 2) * 0.25] }, 4);
    }
    return b.geometry();
  });
}
function buildDuene(opts = {}) {
  const S = clamp(Math.round(num(opts.size, 1) * 10) / 10, 0.2, 8), seed = Math.round(num(opts.seed, 1));
  const root = new THREE.Group();
  root.add(mesh(duneGeo(S, seed), KUL(0.95), {}, true));
  root.children[0].receiveShadow = true;
  return makeModel('duene', root, () => {}, [], { initial: 'idle' });
}

// =============================================================================================
// Autowrack
// =============================================================================================
const wreckGeo = () => memo('w8:wrack', () => {
  const h = harvest('baron_w1_car', () => B1.baron_brummbaer({ withCar: true }), (m) => {
    m.update(0, { anim: 'defeated', speed: 0 });
    const car = m.root.children[0];
    car.children[3].visible = false;   // Bär
    car.children[2].visible = false;   // Qualm
    const wheels = car.children[1];
    wheels.setMatrixAt(0, new THREE.Matrix4().makeScale(0, 0, 0));   // Rad vorn rechts ist abgesprungen
  });
  // verrußen und verbeulen: Front gestaucht und nach unten geknickt, rechte Vorderecke abgesackt, Dellen
  const g = recolor(h.lit, (c) => c.clone().multiplyScalar(0.8));
  const P = g.attributes.position, C = g.attributes.color;
  for (let i = 0; i < P.count; i++) {
    let x = P.getX(i), y = P.getY(i);
    const z = P.getZ(i);
    if (x > 0.9) { const d = x - 0.9; x = 0.9 + d * 0.55; y -= d * 0.3 * smoothstep((y - 0.3) / 0.8); }
    if (x > 0.5 && z > 0.3) y -= (x - 0.5) * 0.18 * (z - 0.3);
    const n = (noise3(x * 2.5, y * 2.5, z * 2.5) - 0.5) * 0.12;
    P.setXYZ(i, x + n, y + n * 0.6, z + n * 0.4);
    const soot = noise3(x * 1.3 + 4, y * 1.3, z * 1.3) > 0.58 ? 0.35 : 1;
    C.setXYZ(i, C.getX(i) * soot, C.getY(i) * soot, C.getZ(i) * soot);
  }
  g.computeVertexNormals();
  const b = new Build();
  b.parts.push(g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(0, -0.12, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.16, 0.25, -0.12)), new THREE.Vector3(1, 1, 1))));
  // hochgeklappte Motorhaube (verbogen), Riss-Linien
  const hood = new THREE.BoxGeometry(1.4, 0.06, 1.3, 6, 1, 4);
  const HP = hood.attributes.position;
  for (let i = 0; i < HP.count; i++) { const x = HP.getX(i); HP.setY(i, HP.getY(i) + Math.sin((x + 0.7) * 2.2) * 0.12); }
  hood.computeVertexNormals();
  b.add(hood, { v: (x, y, z, nx, ny) => mix(0x8a1018, 0xd8202a, smoothstep(ny * 0.5 + 0.5)) }, { p: [1.25, 1.55, 0.05], r: [0.15, 0.25, 0.75] });
  b.tube([[0.2, 1.05, 0.96], [0.4, 0.9, 0.98], [0.35, 0.72, 0.99], [0.55, 0.6, 0.98]], 0.025, 0x1a0e0e, null, 10, 4);
  // abgesprungenes Rad, Stoßstange, Radkappe, Schrauben
  b.cyl(0.46, 0.46, 0.34, 0x1e1e24, { p: [2.7, 0.17, 1.9], r: [Math.PI / 2, 0.4, 0] }, 20);
  b.cyl(0.33, 0.33, 0.36, 0xf4f4f0, { p: [2.7, 0.17, 1.9], r: [Math.PI / 2, 0.4, 0] }, 20);
  b.cyl(0.22, 0.22, 0.38, 0xffd23a, { p: [2.7, 0.17, 1.9], r: [Math.PI / 2, 0.4, 0] }, 14);
  b.box(0.16, 0.14, 2.0, 0xc8ccd8, { p: [3.0, 0.08, -0.7], r: [0, 0.7, 0.1] }, 0.05, 1);
  b.cyl(0.22, 0.22, 0.04, 0xffd23a, { p: [-2.4, 0.03, -1.6] }, 14);
  for (let i = 0; i < 6; i++) b.box(0.08, 0.08, 0.12, 0x8a8a9a, { p: [1.8 + hash1(i) * 2, 0.04, -1 + hash1(i + 4) * 3], r: [0, i, 0] }, 0, 1);
  return b.geometry();
});
function buildAutowrack() {
  const root = new THREE.Group();
  const own = [];
  root.add(mesh(wreckGeo(), KUL(0.4), {}, true));
  const smoke = fxPuffs(14, 0x6a6470, { opacity: 0.6, radius: 8, cy: 2.5 });
  smoke.mat.userData.toy = false;
  own.push(smoke);
  root.add(smoke.mesh);
  const clk = new Clock();
  let emit = 0;
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    emit -= dt;
    if (st.smoke !== false && dt > 0 && emit <= 0) { smoke.burst([1.4, 1.3, 0.1], { count: 1, speed: 0.3, up: 1.4, size: 0.35, life: 1.6, spread: 0.2 }); emit = 0.25; }
    smoke.step(dt);
  };
  return makeModel('autowrack', root, update, own, { initial: 'idle' });
}

export const MODELS = {
  regenfestung: buildRegenfestung,
  keksfabrik: buildKeksfabrik,
  wasserfestung: buildWasserfestung,
  spukspiegel: buildSpukspiegel,
  duene: buildDuene,
  autowrack: buildAutowrack,
};
