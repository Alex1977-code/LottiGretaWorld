// Friedhofs- und Nacht-Kulisse der Halloween-Welt „Kürbisinsel“ (H-3 Nebelfriedhof, H-Burg, Karte). Eigene Gestaltung,
// kindgerecht: Lachgesichter, runde Formen, warmes Licht. Maßstab Meter, Ursprung = Mitte der Unterseite (Ausnahmen
// genannt), Vorderseite +X; state darf ein String sein. Ohne Kollision. Kulisse: schlichte Materialien (kein
// Spielzeug-Look), vertexgefärbt und backbar (bakeModel); Leuchtendes unbeleuchtet, Schein/Nebel durchsichtig (wird beim
// Backen ausgelassen).
//
// halloween_baum   krummer, kahler Halloween-Baum (lila-schwarze Rinde, eingerollte Astspitzen), Astloch mit zwei
//                  leuchtenden Äuglein, an den Ästen hängen kleine Kürbislaternen.
//                  opts { height (4), lanterns (0–5, Standard 3), seed (0–3) }  state { sway (0..1 Wiegen), lit (bool) }
// grabstein        Grabstein mit Lachgesicht (geschlossene Lachaugen, offener Mund, Wangen), Sockel, Moos, Grasbüschel.
//                  opts { kind: 'rund' | 'kreuz' | 'spitz', size (Höhe, 1), tilt (rad, schief), pumpkin: false (Mini-Kürbis
//                  davor) }  state –   Viele → createInstanced('grabstein', n, { kind }).
// eisenzaun        schmiedeeiserner Zaun entlang X (Mitte im Ursprung): Pfosten mit Kürbis-Knäufen, Stäbe mit Speerspitzen,
//                  Kringel zwischen den Querstangen.  opts { length (4), height (1,2) }  state –
// gruft            kleine Gruft (≈3,2 × 3 × 3,6 m): Stufen, Säulen, Giebel mit Fledermaus-Rosette, Kuppeldach mit Kürbis,
//                  lila Tür mit zwei leuchtenden Bullaugen (Gesicht) und Laternen.  opts { size (Faktor, 1) }
//                  state { lit (bool, Standard true) }
// spinnennetz      Spinnennetz mit kleiner Spinne.  opts { kind: 'ecke' (Eck-Netz in der YZ-Ebene, **Ursprung = Ecke oben**,
//                  spannt nach −Y und +Z) | 'rund' (rundes Netz, **Ursprung = Netzmitte**, Fläche nach +X, mit Haltefäden),
//                  size (Spannweite bzw. Radius, 1,2 / 0,8) }  state { sway (0..1) }
// kerzenleuchter   Standleuchter ≈1,5 m: Dreifuß mit Kringelfüßen, Schaft mit Knäufen, Arme mit tropfenden Kerzen.
//                  opts { arms: 3 | 5, height (1,5) }  state { lit (bool, Standard true) }
// nebelschwaden    weiche Nebelkarten über dem Boden (durchsichtig, ziehen langsam).  **Ursprung = Mitte am Boden.**
//                  opts { size: [w, d] ([8, 4]), count (8), color (0xd8d0ff), opacity (0,45), height (0,8) }  state –
// mond_gesicht     großer Mond mit Gesicht (Hintergrund): leuchtende Kugel mit Kratern, lächelnd, rosa Wangen, Schein.
//                  **Ursprung = Mondmitte**, Gesicht nach +X.  opts { size (Radius, 6), fog: false (Nebel wirkt nicht) }
//                  state –

import { THREE, TAU, Build, cached, mesh, joint, makeModel, Clock, damp, clamp, mix, smoothstep, glowSprite, glowTexture, instMesh, placed } from '../lib/kit.js';
import {
  HW, PK_COLORS, pkSurf, pumpkinGeo, addFace, glow, glowNF, kulMat, kulisse, ownMat, noToy, graveGeo, hash1, noise3,
  gradV, puffyGeo, memo, taperTube, ellSurf, fogTexture,
} from '../lib/hwGeos.js';
import { bricksV } from '../lib/w5Geos.js';
import { kuerbisGeos } from './props_kuerbis_hw.js';

const BARK = { v: (x, y, z, nx, ny) => mix(0x1e1428, 0x5a3a72, smoothstep(ny * 0.4 + nx * 0.3 + 0.25 + noise3(x * 3, y * 3, z * 3) * 0.35)) };
const IRONV = { v: (x, y, z, nx, ny) => mix(0x1c1626, 0x5a4e78, smoothstep(ny * 0.5 + nx * 0.25 + 0.3)) };
const STONEV = { v: (x, y, z, nx, ny) => mix(HW.stoneLow, HW.stoneHi, smoothstep(ny * 0.35 + nx * 0.2 + 0.4 + (noise3(x * 4, y * 4, z * 4) - 0.5) * 0.4)) };
const lit01 = (v) => (v === undefined ? 1 : v === true ? 1 : v === false ? 0 : clamp(Number(v) || 0, 0, 1));
/** Geometrie-Klon mit Matrix in einen Build schieben. */
const pushT = (b, g, m) => { const c = g.clone(); c.applyMatrix4(m); b.parts.push(c); };
const M = (p, r = [0, 0, 0], s = 1) => new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...(typeof s === 'number' ? [s, s, s] : s)));

// =============================================================================================
// Halloween-Baum
// =============================================================================================
function treeGeos(H, nL, seed) {
  return memo(`hw:tree:${H}:${nL}:${seed}`, () => {
    const b = new Build(), gl = new Build();
    const r0 = 0.3 * (H / 4);
    // Stamm: verdreht und leicht schief, Wurzeln
    const top = [0.35 * (H / 4), H * 0.58, 0.1];
    b.add(taperTube([[0, -0.05, 0], [0.05, H * 0.2, -0.05], [-0.08, H * 0.38, 0.06], top], (t) => r0 * (1.15 - t * 0.55) + (t < 0.08 ? (0.08 - t) * 3 * r0 : 0), 14, 10), BARK);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + 0.4 + hash1(seed + i) * 0.4;
      b.add(taperTube([[Math.cos(a) * r0 * 0.6, 0.25, Math.sin(a) * r0 * 0.6], [Math.cos(a) * r0 * 1.6, 0.06, Math.sin(a) * r0 * 1.6], [Math.cos(a) * r0 * 2.4, 0.0, Math.sin(a) * r0 * 2.4]], (t) => r0 * 0.45 * (1 - t * 0.8), 6, 6), BARK);
    }
    // Äste mit eingerollten Spitzen; Laternen an einigen Spitzen
    const tips = [];
    const nb = 5;
    for (let i = 0; i < nb; i++) {
      const a = (i / nb) * TAU + hash1(seed * 5 + i) * 0.7;
      const len = H * (0.32 + hash1(seed + i * 3.3) * 0.14);
      const up = 0.35 + hash1(seed + i * 7.1) * 0.45;
      const bx = Math.cos(a), bz = Math.sin(a);
      const s0 = [top[0] - bx * 0.05, top[1] - 0.15 - (i % 2) * H * 0.08, top[2] - bz * 0.05];
      const p1 = [s0[0] + bx * len * 0.45, s0[1] + len * up * 0.6, s0[2] + bz * len * 0.45];
      const p2 = [s0[0] + bx * len * 0.85, s0[1] + len * up * 0.9, s0[2] + bz * len * 0.85];
      // eingerollte Spitze (kleine Spirale)
      const curl = [];
      for (let k = 1; k <= 6; k++) { const q = k / 6, ang = q * Math.PI * 1.4, rr = len * 0.14 * (1 - q * 0.6); curl.push([p2[0] + bx * (Math.sin(ang) * rr), p2[1] + (1 - Math.cos(ang)) * rr * (k < 4 ? 1 : 0.8) - (k > 3 ? q * rr * 0.6 : 0), p2[2] + bz * (Math.sin(ang) * rr)]); }
      b.add(taperTube([s0, p1, p2, ...curl], (t) => r0 * 0.5 * (1 - t * 0.85) + 0.012, 18, 6), BARK);
      // Zweig
      const tw0 = [p1[0], p1[1], p1[2]], tw = [p1[0] + Math.cos(a + 1) * len * 0.3, p1[1] + len * 0.25, p1[2] + Math.sin(a + 1) * len * 0.3];
      b.add(taperTube([tw0, [(tw0[0] + tw[0]) / 2, (tw0[1] + tw[1]) / 2 + 0.05, (tw0[2] + tw[2]) / 2], tw], (t) => r0 * 0.2 * (1 - t * 0.8) + 0.008, 6, 5), BARK);
      tips.push({ p: [s0[0] + bx * len * 0.62, s0[1] + len * up * 0.75, s0[2] + bz * len * 0.62] });
    }
    // Astloch mit leuchtenden Äuglein (vorn, +X)
    const kh = [r0 * 0.98, H * 0.3, 0.02];
    b.sphere(1, 0x0c0612, { p: kh, s: [0.04, r0 * 0.75, r0 * 0.55] }, 14, 10);
    b.torus(r0 * 0.55, r0 * 0.12, BARK, { p: [kh[0] - 0.01, kh[1], kh[2]], r: [0, Math.PI / 2, 0], s: [1, 1.35, 1] }, 6, 18);
    for (const s of [1, -1]) gl.sphere(1, 0xffe060, { p: [kh[0] + 0.03, kh[1] + r0 * 0.12, kh[2] + s * r0 * 0.2], s: [0.02, r0 * 0.16, r0 * 0.12] }, 10, 8);
    // Laternen (kleine Grinse-Kürbisse am Faden)
    const L = kuerbisGeos('rund', 'orange', 'lachen', true, false, true, 2);
    const ls = 0.36 * (H / 4);
    for (let i = 0; i < Math.min(nL, tips.length); i++) {
      const t0 = tips[(i * 2) % tips.length].p;
      const hangL = 0.3 + hash1(seed + i) * 0.25;
      b.cyl(0.006, 0.006, hangL, 0x2a2038, { p: [t0[0], t0[1] - hangL / 2, t0[2]] }, 4);
      const m = M([t0[0], t0[1] - hangL - L.h * ls, t0[2]], [0, -Math.atan2(t0[2], t0[0]) * 0 + 0.3 * i, 0], ls);
      pushT(b, L.body, m); pushT(gl, L.glow, m);
    }
    return { body: b.geometry(), glow: gl.geometry(), tips };
  });
}
function buildHalloweenBaum(opts = {}) {
  const H = clamp(Number(opts.height ?? 4), 1.5, 12);
  const nL = clamp(Math.round(opts.lanterns ?? 3), 0, 5);
  const G = treeGeos(Math.round(H * 10) / 10, nL, (opts.seed ?? 0) % 4);
  const root = new THREE.Group();
  const own = [];
  const gm = noToy(ownMat(glow()));
  own.push(gm);
  const sway = joint();
  sway.add(mesh(G.body, kulMat(0.7), {}, true), mesh(G.glow, gm));
  root.add(sway);
  const clk = new Clock();
  let k = 1;
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const t = clk.t, s = st.sway ?? 0.3;
    k = damp(k, lit01(st.lit), 8, dt);
    sway.rotation.set(Math.sin(t * 0.7) * 0.012 * s, 0, Math.sin(t * 0.9) * 0.015 * s);
    gm.color.setScalar(0.1 + k * (0.85 + Math.sin(t * 9) * 0.05 + Math.sin(t * 13.3) * 0.05));
  };
  return makeModel('halloween_baum', kulisse(root), update, own);
}

// =============================================================================================
// Grabstein
// =============================================================================================
const tuftGeo = () => cached('hw:tuft', () => {
  const b = new Build();
  for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU; b.cone(0.025, 0.16 + hash1(i) * 0.08, mix(0x3a6a2a, 0x8ab84a, hash1(i * 3)), { p: [Math.cos(a) * 0.05, 0.07, Math.sin(a) * 0.05], r: [Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4] }, 4); }
  return b.geometry();
});
function graveDecoGeo(kind, pumpkin) {
  return memo(`hw:gravedeco:${kind}:${pumpkin}`, () => {
    const b = new Build();
    pushT(b, graveGeo(kind, 1, false, true), M([0, 0, 0]));
    pushT(b, tuftGeo(), M([0.18, 0, 0.36]));
    pushT(b, tuftGeo(), M([0.1, 0, -0.4], [0, 1, 0], 0.8));
    if (pumpkin) pushT(b, kuerbisGeos('rund', 'orange', false, false, false, true, 3).body, M([0.42, 0, 0.18], [0, 0.6, 0], 0.32));
    return b.geometry();
  });
}
function buildGrabstein(opts = {}) {
  const kind = ['rund', 'kreuz', 'spitz'].includes(opts.kind) ? opts.kind : 'rund';
  const root = new THREE.Group();
  const m = mesh(graveDecoGeo(kind, !!opts.pumpkin), kulMat(0.7), {}, true);
  m.receiveShadow = true;
  m.scale.setScalar(clamp(Number(opts.size ?? 1), 0.3, 4));
  m.rotation.z = clamp(Number(opts.tilt ?? 0), -0.6, 0.6);
  root.add(m);
  return makeModel('grabstein', kulisse(root), () => {}, []);
}

// =============================================================================================
// Eisenzaun
// =============================================================================================
function fenceGeo(L, H) {
  return cached(`hw:fence:${L}:${H}`, () => {
    const b = new Build();
    const posts = Math.max(2, Math.round(L / 2) + 1);
    for (let i = 0; i < posts; i++) {
      const x = -L / 2 + (i / (posts - 1)) * L;
      b.box(0.1, H + 0.15, 0.1, IRONV, { p: [x, (H + 0.15) / 2, 0] }, 0.025, 1);
      b.parts.push(pumpkinGeo({ R: 0.1, Hh: 0.08, ribs: 8, depth: 0.12, dimple: 0.2, bottom: 0.9 }, PK_COLORS.orange, true).translate(x, H + 0.22, 0));
      b.cyl(0.02, 0.02, 0.05, HW.stemLow, { p: [x, H + 0.31, 0] }, 5);
    }
    for (const y of [0.18, H - 0.12]) b.box(L, 0.05, 0.05, IRONV, { p: [0, y, 0] }, 0.015, 1);
    const n = Math.round(L / 0.2);
    for (let i = 0; i < n; i++) {
      const x = -L / 2 + (i + 0.5) * (L / n);
      const h = H - 0.05 + (i % 2 ? 0 : 0.08);
      b.cyl(0.018, 0.018, h, IRONV, { p: [x, h / 2, 0] }, 6);
      b.cone(0.04, 0.12, IRONV, { p: [x, h + 0.05, 0] }, 4);
      if (i % 2 === 0 && i < n - 1) b.torus(0.06, 0.012, IRONV, { p: [x + L / n / 2, H * 0.5, 0] }, 4, 14);
    }
    return b.geometry();
  });
}
function buildEisenzaun(opts = {}) {
  const L = Math.max(1, Math.round(clamp(Number(opts.length ?? 4), 1, 20) * 2) / 2), H = clamp(Number(opts.height ?? 1.2), 0.5, 3);
  const root = new THREE.Group();
  root.add(mesh(fenceGeo(L, H), kulMat(0.4), {}, true));
  return makeModel('eisenzaun', kulisse(root), () => {}, []);
}

// =============================================================================================
// Gruft
// =============================================================================================
function gruftGeos() {
  return memo('hw:gruft', () => {
    const b = new Build(), gl = new Build();
    // Sockel und Stufen nach vorn (+X)
    b.box(3.2, 0.3, 3.0, STONEV, { p: [0, 0.15, 0] }, 0.06, 2);
    for (let i = 0; i < 2; i++) b.box(0.4, 0.15 * (2 - i), 2.0, STONEV, { p: [1.8 + i * 0.35, 0.075 * (2 - i), 0] }, 0.04, 1);
    // Gemäuer (Quader)
    b.box(2.6, 2.2, 2.6, bricksV(0x9a92bc, 0x4a426a, 0.55, 0.32, { hi: HW.stoneHi, lo: HW.stoneLow, vary: 0.25 }), { p: [0, 1.4, 0] }, 0.08, 2);
    // Säulen und Giebel vorn
    for (const s of [1, -1]) {
      b.cyl(0.17, 0.2, 2.1, STONEV, { p: [1.42, 1.35, s * 0.95] }, 16);
      b.box(0.5, 0.15, 0.5, STONEV, { p: [1.42, 2.45, s * 0.95] }, 0.04, 1);
      b.box(0.5, 0.12, 0.5, STONEV, { p: [1.42, 0.36, s * 0.95] }, 0.04, 1);
    }
    b.box(0.6, 0.2, 2.6, STONEV, { p: [1.3, 2.6, 0] }, 0.05, 1);
    const ped = new THREE.Shape(); ped.moveTo(-1.35, 0); ped.lineTo(1.35, 0); ped.lineTo(0, 0.75); ped.closePath();
    const pg = new THREE.ExtrudeGeometry(ped, { depth: 0.4, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 1 });
    pg.translate(0, 0, -0.2); pg.rotateY(Math.PI / 2);
    b.add(pg, STONEV, { p: [1.3, 2.7, 0] });
    // Fledermaus-Rosette im Giebel
    b.cyl(0.24, 0.24, 0.06, 0x6a5a8e, { p: [1.53, 3.0, 0], r: [0, 0, Math.PI / 2] }, 20);
    const bat = new THREE.Shape();
    bat.moveTo(0, 0.25); bat.quadraticCurveTo(0.35, 0.55, 1, 0.35); bat.quadraticCurveTo(0.8, 0.1, 0.75, -0.1); bat.quadraticCurveTo(0.6, 0.05, 0.45, -0.15); bat.quadraticCurveTo(0.3, 0.0, 0, -0.25);
    bat.quadraticCurveTo(-0.3, 0.0, -0.45, -0.15); bat.quadraticCurveTo(-0.6, 0.05, -0.75, -0.1); bat.quadraticCurveTo(-0.8, 0.1, -1, 0.35); bat.quadraticCurveTo(-0.35, 0.55, 0, 0.25);
    b.add(puffyGeo(bat, 0.15, 0.08, 6, 2), 0x2a2038, { p: [1.57, 3.0, 0], r: [0, Math.PI / 2, 0], s: 0.18 });
    // Kuppeldach mit Kürbis obendrauf
    b.dome(1.55, { v: (x, y, z, nx, ny) => mix(0x3a2e58, 0x8a7ab8, smoothstep(ny * 0.6 + nx * 0.2) * (0.7 + (Math.floor(Math.atan2(z, x) / TAU * 16 + 16) % 2) * 0.3)) }, { p: [-0.1, 2.5, 0], s: [1, 0.6, 1] }, 32, 10);
    b.torus(1.5, 0.08, STONEV, { p: [-0.1, 2.52, 0], r: [Math.PI / 2, 0, 0] }, 6, 40);
    b.parts.push(pumpkinGeo({ R: 0.28, Hh: 0.22, ribs: 8, depth: 0.12, dimple: 0.2, bottom: 0.9 }, PK_COLORS.orange, true).translate(-0.1, 3.62, 0));
    b.cyl(0.04, 0.05, 0.14, HW.stemLow, { p: [-0.1, 3.86, 0] }, 6);
    // Tür (lila Bohlen, Eisenbänder) mit zwei Bullaugen-Fenstern (leuchten) und einem Lächeln aus Eisen
    const door = new THREE.Shape(); door.moveTo(-0.55, 0); door.lineTo(0.55, 0); door.lineTo(0.55, 1.15); door.absarc(0, 1.15, 0.55, 0, Math.PI, false); door.lineTo(-0.55, 0);
    const dg = new THREE.ExtrudeGeometry(door, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1, curveSegments: 14 });
    dg.translate(0, 0, -0.05); dg.rotateY(Math.PI / 2);
    b.add(dg, (x, y, z) => (Math.floor((z + 2) * 6.5) % 2 ? 0x7a48c8 : 0x6a3ab0), { p: [1.33, 0.3, 0] });
    for (const y of [0.55, 1.15]) b.box(0.03, 0.06, 1.12, IRONV, { p: [1.44, 0.3 + y, 0] }, 0.012, 1);
    b.torus(0.18, 0.035, IRONV, { p: [1.44, 0.75, 0], r: [0, Math.PI / 2, Math.PI] }, 6, 16, Math.PI);
    for (const s of [1, -1]) {
      b.torus(0.15, 0.035, 0xffc21a, { p: [1.45, 1.35, s * 0.24], r: [0, Math.PI / 2, 0] }, 6, 18);
      gl.add(new THREE.CircleGeometry(0.13, 18).rotateY(Math.PI / 2), { v: (x, y) => mix(0xff9a2a, 0xfff2b0, smoothstep((y - 1.35) * 4 + 0.5)) }, { p: [1.45, 1.35, s * 0.24] });
      // Laternen neben der Tür
      b.box(0.16, 0.06, 0.16, IRONV, { p: [1.62, 2.0, s * 1.3] }, 0.02, 1);
      b.box(0.16, 0.05, 0.16, IRONV, { p: [1.62, 1.65, s * 1.3] }, 0.02, 1);
      gl.add(new THREE.CylinderGeometry(0.06, 0.06, 0.28, 8), { v: (x, y) => mix(0xffa040, 0xfff0a0, smoothstep((y - 1.82) * 6 + 0.5)) }, { p: [1.62, 1.82, s * 1.3] });
      b.cyl(0.015, 0.015, 0.4, IRONV, { p: [1.5, 1.9, s * 1.3], r: [0, 0, Math.PI / 2] }, 4);
    }
    // Moos
    for (const [x, z] of [[1.2, 1.3], [-1.3, 1.1], [1.0, -1.35], [-0.8, -1.3]]) b.sphere(0.22, HW.moss, { p: [x, 0.32, z], s: [1, 0.35, 1] }, 10, 6);
    return { body: b.geometry(), glow: gl.geometry() };
  });
}
function buildGruft(opts = {}) {
  const G = gruftGeos();
  const root = new THREE.Group();
  const own = [];
  const gm = noToy(ownMat(glow()));
  own.push(gm);
  const sj = joint(); sj.scale.setScalar(clamp(Number(opts.size ?? 1), 0.3, 4));
  const body = mesh(G.body, kulMat(0.7), {}, true);
  body.receiveShadow = true;
  const halos = [1, -1].map((s) => { const h = glowSprite(0xffb060, 1.0, 0.5); h.position.set(1.62, 1.82, s * 1.3); return h; });
  sj.add(body, mesh(G.glow, gm), ...halos);
  root.add(sj);
  const clk = new Clock();
  let k = 1;
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    k = damp(k, lit01(st.lit), 8, dt);
    gm.color.setScalar(0.12 + k * (0.85 + Math.sin(clk.t * 8) * 0.05));
    for (const h of halos) { h.visible = k > 0.05; h.scale.setScalar(k * (0.95 + Math.sin(clk.t * 7) * 0.05)); }
  };
  return makeModel('gruft', kulisse(root), update, own);
}

// =============================================================================================
// Spinnennetz
// =============================================================================================
const THREAD = 0xf0ecff;
function webGeo(kind, S) {
  return cached(`hw:web:${kind}:${S}`, () => {
    const b = new Build();
    const th = 0.009 * Math.max(1, S);
    if (kind === 'ecke') {
      // Eck-Netz in der YZ-Ebene (x = 0): Ecke im Ursprung, spannt nach −Y und +Z
      const n = 6;
      const rad = (k) => (Math.PI / 2) * (k / (n - 1));
      for (let k = 0; k < n; k++) { const a = rad(k); b.tube([[0, 0, 0], [0, -Math.cos(a) * S * 0.5, Math.sin(a) * S * 0.5], [0, -Math.cos(a) * S, Math.sin(a) * S]], th, THREAD, null, 4, 4); }
      for (let r = 1; r <= 5; r++) {
        const rr = S * r / 5.3;
        for (let k = 0; k < n - 1; k++) {
          const a0 = rad(k), a1 = rad(k + 1), am = (a0 + a1) / 2, sag = rr * 0.86;
          b.tube([[0, -Math.cos(a0) * rr, Math.sin(a0) * rr], [0, -Math.cos(am) * sag, Math.sin(am) * sag], [0, -Math.cos(a1) * rr, Math.sin(a1) * rr]], th * 0.85, THREAD, null, 5, 4);
        }
      }
      return b.geometry();
    }
    // rundes Netz in der YZ-Ebene um den Ursprung, mit vier Haltefäden
    const n = 12;
    for (let k = 0; k < n; k++) { const a = (k / n) * TAU; b.tube([[0, 0, 0], [0, Math.sin(a) * S * 0.5, Math.cos(a) * S * 0.5], [0, Math.sin(a) * S, Math.cos(a) * S]], th, THREAD, null, 4, 4); }
    for (let r = 1; r <= 6; r++) {
      const rr = S * r / 6.3;
      for (let k = 0; k < n; k++) {
        const a0 = (k / n) * TAU, a1 = ((k + 1) / n) * TAU, am = (a0 + a1) / 2, sag = rr * 0.9;
        b.tube([[0, Math.sin(a0) * rr, Math.cos(a0) * rr], [0, Math.sin(am) * sag, Math.cos(am) * sag], [0, Math.sin(a1) * rr, Math.cos(a1) * rr]], th * 0.85, THREAD, null, 4, 4);
      }
    }
    for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + Math.PI / 4; b.tube([[0, Math.sin(a) * S, Math.cos(a) * S], [0, Math.sin(a) * S * 1.6, Math.cos(a) * S * 1.6]], th, THREAD, null, 2, 4); }
    // Tautropfen
    for (let i = 0; i < 6; i++) { const a = hash1(i) * TAU, r = S * (0.3 + hash1(i * 3) * 0.6); b.sphere(th * 2.2, 0xd8f4ff, { p: [0.005, Math.sin(a) * r, Math.cos(a) * r] }, 6, 4); }
    return b.geometry();
  });
}
const smallSpiderGeo = () => cached('hw:web:spider', () => {
  const b = new Build();
  b.sphere(1, { v: (x, y, z, nx, ny) => mix(0x3a1a7a, 0xa47aff, smoothstep(ny * 0.6 + 0.4)) }, { p: [0, -0.05, 0], s: [0.06, 0.07, 0.06] }, 14, 10);
  b.sphere(0.045, { v: (x, y, z, nx, ny) => mix(0x3a1a7a, 0xa47aff, smoothstep(ny * 0.6 + 0.4)) }, { p: [0, 0.03, 0] }, 12, 8);
  for (const s of [1, -1]) {
    b.sphere(0.016, 0xffffff, { p: [0.035, 0.04, s * 0.017] }, 8, 6);
    b.sphere(0.009, 0x14101c, { p: [0.047, 0.042, s * 0.017] }, 6, 4);
    for (let i = 0; i < 4; i++) b.tube([[0, -0.02, s * 0.03], [(i - 1.5) * 0.03, 0.03, s * 0.08], [(i - 1.5) * 0.045, -0.06, s * 0.1]], 0.007, 0x3a1a7a, null, 6, 3);
  }
  b.sphere(1, 0xff8a1a, { p: [-0.01, 0.07, 0], s: [0.02, 0.015, 0.035] }, 8, 6);
  b.cyl(0.003, 0.003, 0.4, THREAD, { p: [0, 0.27, 0] }, 3);
  return b.geometry();
});
function buildSpinnennetz(opts = {}) {
  const kind = opts.kind === 'rund' ? 'rund' : 'ecke';
  const S = clamp(Number(opts.size ?? (kind === 'ecke' ? 1.2 : 0.8)), 0.2, 6);
  const root = new THREE.Group();
  const web = joint();
  web.add(mesh(webGeo(kind, Math.round(S * 20) / 20), kulMat(0.4)));
  const spider = mesh(smallSpiderGeo(), kulMat(0.4), kind === 'ecke' ? { p: [0.03, -S * 0.75, S * 0.42], s: Math.max(0.6, S * 0.7) } : { p: [0.04, -S * 0.25, S * 0.15], s: Math.max(0.6, S * 0.9) });
  root.add(web, spider);
  const clk = new Clock();
  const y0 = spider.position.y;
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const t = clk.t, s = st.sway ?? 0.4;
    web.rotation.y = Math.sin(t * 0.8) * 0.05 * s;
    spider.position.y = y0 + Math.sin(t * 1.1) * 0.04;
    spider.rotation.y = Math.sin(t * 0.7) * 0.4;
  };
  return makeModel('spinnennetz', kulisse(root), update, []);
}

// =============================================================================================
// Kerzenleuchter
// =============================================================================================
function candelabraGeos(arms, H) {
  return memo(`hw:cand:${arms}:${H}`, () => {
    const b = new Build(), gl = new Build();
    // Dreifuß mit Kringelfüßen
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU;
      b.add(taperTube([[0, 0.3, 0], [Math.cos(a) * 0.2, 0.12, Math.sin(a) * 0.2], [Math.cos(a) * 0.32, 0.03, Math.sin(a) * 0.32], [Math.cos(a) * 0.36, 0.09, Math.sin(a) * 0.36], [Math.cos(a) * 0.3, 0.1, Math.sin(a) * 0.3]], 0.025, 12, 6), IRONV);
    }
    b.add(taperTube([[0, 0.25, 0], [0, H * 0.5, 0], [0, H * 0.82, 0]], (t) => 0.035 - t * 0.008, 8, 8), IRONV);
    for (const y of [0.32, H * 0.45, H * 0.8]) b.sphere(0.06, 0xd8a838, { p: [0, y, 0], s: [1, 0.7, 1] }, 12, 8);
    const top = H * 0.82;
    const list = arms >= 5 ? [-2, -1, 0, 1, 2] : [-1, 0, 1];
    for (const k of list) {
      const z = k * 0.22, x = 0;
      const cy = k === 0 ? H * 0.98 : H * 0.88 - Math.abs(k) * 0.04;
      if (k !== 0) b.add(taperTube([[0, top, 0], [0, top - 0.08, z * 0.6], [x, cy - 0.12, z * 0.95], [x, cy - 0.06, z]], 0.018, 12, 6), IRONV);
      b.cyl(0.07, 0.04, 0.05, 0xd8a838, { p: [x, cy - 0.04, z] }, 12);
      // Kerze mit Wachstropfen
      const ch = 0.16 + Math.abs(k) * 0.02;
      b.cyl(0.032, 0.035, ch, 0xfff4dc, { p: [x, cy + ch / 2 - 0.02, z] }, 10);
      for (let d = 0; d < 3; d++) { const a = d * 2.1 + k; b.capsule(0.009, 0.03 + hash1(d + k) * 0.03, 0xfffaf0, { p: [x + Math.cos(a) * 0.033, cy + ch - 0.06, z + Math.sin(a) * 0.033] }, 2, 5); }
      gl.lathe([[0, 0], [0.022, 0.012], [0.026, 0.04], [0.012, 0.075], [0, 0.09]], { v: (xx, y) => mix(0xffa020, 0xfff6c0, smoothstep(y / 0.07)) }, { p: [x, cy + ch - 0.015, z] }, 10);
    }
    return { body: b.geometry(), glow: gl.geometry(), flames: list.map((k) => [0, (k === 0 ? H * 0.98 : H * 0.88 - Math.abs(k) * 0.04) + 0.2, k * 0.22]) };
  });
}
function buildKerzenleuchter(opts = {}) {
  const arms = opts.arms === 5 ? 5 : 3;
  const H = clamp(Number(opts.height ?? 1.5), 0.6, 4);
  const G = candelabraGeos(arms, Math.round(H * 10) / 10);
  const root = new THREE.Group();
  const own = [];
  const gm = noToy(ownMat(glow()));
  own.push(gm);
  const flames = mesh(G.glow, gm);
  const halos = G.flames.map(([x, y, z]) => { const h = glowSprite(0xffb050, 0.5, 0.55); h.position.set(x, y, z); return h; });
  root.add(mesh(G.body, kulMat(0.35), {}, true), flames, ...halos);
  const clk = new Clock();
  let k = 1;
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const t = clk.t;
    k = damp(k, lit01(st.lit), 10, dt);
    flames.visible = k > 0.05;
    flames.scale.set(1, 0.92 + Math.sin(t * 13) * 0.06, 1);
    gm.color.setScalar(0.85 + Math.sin(t * 17) * 0.1);
    halos.forEach((h, i) => { h.visible = k > 0.05; h.scale.setScalar(k * (0.45 + Math.sin(t * 11 + i) * 0.05)); });
  };
  return makeModel('kerzenleuchter', kulisse(root), update, own);
}

// =============================================================================================
// Nebelschwaden
// =============================================================================================
const fogCardGeo = () => cached('hw:fogcard', () => { const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); return g; });
function buildNebelschwaden(opts = {}) {
  const sz = Array.isArray(opts.size) ? opts.size : [8, 4];
  const W = Math.max(1, sz[0] ?? 8), D = Math.max(1, sz[1] ?? 4);
  const n = clamp(Math.round(opts.count ?? 8), 1, 40);
  const Hh = clamp(Number(opts.height ?? 0.8), 0.1, 5);
  const root = new THREE.Group();
  const mat = noToy(new THREE.MeshBasicMaterial({ map: fogTexture(), color: opts.color ?? 0xd8d0ff, transparent: true, opacity: clamp(Number(opts.opacity ?? 0.45), 0, 1), depthWrite: false, side: THREE.DoubleSide }));
  const cards = instMesh(fogCardGeo(), mat, n, Math.max(W, D) + 2, Hh / 2);
  cards.renderOrder = 4;
  root.add(cards);
  const it = Array.from({ length: n }, (_, i) => ({ x: (hash1(i * 1.3) - 0.5) * W * 0.8, z: (hash1(i * 2.7) - 0.5) * D * 0.8, y: 0.08 + (i / n) * Hh, s: Math.min(W, D) * (0.55 + hash1(i * 4.1) * 0.5), sp: (hash1(i * 5.9) - 0.5) * 0.25, tilt: hash1(i * 7.7) > 0.6 ? 0.9 : 0.15, ph: hash1(i) * TAU }));
  const clk = new Clock();
  const update = (dt) => {
    clk.tick(dt, 'idle');
    const t = clk.t;
    for (let i = 0; i < n; i++) {
      const c = it[i];
      let x = c.x + t * c.sp;
      x = ((x + W / 2) % W + W) % W - W / 2;
      const edge = 1 - smoothstep((Math.abs(x) - W * 0.35) / (W * 0.15));
      _m.compose(_v.set(x, c.y + Math.sin(t * 0.4 + c.ph) * 0.05, c.z), _q.setFromEuler(_e.set(c.tilt, c.ph + t * 0.03, 0, 'YXZ')), _s.set(c.s * 1.6 * edge, 1, c.s * edge));
      cards.setMatrixAt(i, _m);
    }
    cards.instanceMatrix.needsUpdate = true;
  };
  return makeModel('nebelschwaden', kulisse(root), update, [mat, cards]);
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();

// =============================================================================================
// Mond mit Gesicht
// =============================================================================================
function moonGeo() {
  return cached('hw:moon', () => {
    const b = new Build();
    const craters = [[0.9, 0.7, 0.18], [-0.4, 1.2, 0.14], [2.3, -0.2, 0.22], [-2.2, 0.5, 0.2], [0.5, -1.1, 0.12], [-0.9, -0.9, 0.15], [2.9, 0.9, 0.16], [1.6, 1.25, 0.1]];
    b.sphere(1, { v: (x, y, z) => {
      let c = mix(HW.moonLow, HW.moonHi, smoothstep(x * 0.45 + y * 0.3 + 0.55));
      for (const [az, el, r] of craters) { const dx = Math.cos(el) * Math.cos(az), dy = Math.sin(el), dz = Math.cos(el) * Math.sin(az); const d = Math.hypot(x - dx, y - dy, z - dz); if (d < r) c = mix(c, 0xe8b860, 0.45 * (1 - d / r)); }
      return c;
    } }, null, 48, 32);
    const surf = ellSurf([0, 0, 0], [1, 1, 1]);
    // Gesicht: geschlossene, lachende Augen, Lächeln, rosa Wangen, kleine Nase
    for (const s of [1, -1]) {
      const h = surf(s * 0.3, 0.18);
      b.torus(0.11, 0.025, 0x8a5a2a, placed(h.p.clone().addScaledVector(h.n, -0.01), h.n, new THREE.Vector3(1, 1, 1)), 6, 16, Math.PI);
      const c = surf(s * 0.52, -0.08);
      b.add(new THREE.SphereGeometry(1, 12, 8), 0xffa0a0, placed(c.p.clone().addScaledVector(c.n, -0.02), c.n, new THREE.Vector3(0.12, 0.08, 0.04)));
    }
    const m = surf(0, -0.22);
    b.torus(0.17, 0.03, 0x8a5a2a, placed(m.p.clone().addScaledVector(m.n, -0.012), m.n, new THREE.Vector3(1, 0.8, 1)).multiply(new THREE.Matrix4().makeRotationZ(Math.PI)), 6, 18, Math.PI);
    const nz = surf(0, -0.02);
    b.add(new THREE.SphereGeometry(1, 12, 8), 0xf0c060, placed(nz.p.clone().addScaledVector(nz.n, -0.02), nz.n, new THREE.Vector3(0.06, 0.05, 0.06)));
    return b.geometry();
  });
}
function buildMondGesicht(opts = {}) {
  const R = clamp(Number(opts.size ?? 6), 0.3, 60);
  const fog = !!opts.fog;
  const root = new THREE.Group();
  const own = [];
  const mat = fog ? glow() : glowNF();
  const moon = mesh(moonGeo(), mat, { s: R });
  const haloMat = noToy(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xfff0b0, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog }));
  own.push(haloMat);
  const halo = new THREE.Sprite(haloMat); halo.scale.setScalar(R * 3.6);
  halo.renderOrder = -1;
  root.add(halo, moon);
  const clk = new Clock();
  const update = (dt) => { clk.tick(dt, 'idle'); halo.scale.setScalar(R * (3.5 + Math.sin(clk.t * 0.8) * 0.1)); moon.rotation.z = Math.sin(clk.t * 0.3) * 0.03; };
  return makeModel('mond_gesicht', kulisse(root), update, own);
}
export const MODELS = {
  halloween_baum: buildHalloweenBaum,
  grabstein: buildGrabstein,
  eisenzaun: buildEisenzaun,
  gruft: buildGruft,
  spinnennetz: buildSpinnennetz,
  kerzenleuchter: buildKerzenleuchter,
  nebelschwaden: buildNebelschwaden,
  mond_gesicht: buildMondGesicht,
};
